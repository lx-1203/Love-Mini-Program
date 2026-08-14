package com.campuslove.api.search;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.SearchQuery;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.SearchQueryRepository;
import com.campuslove.api.village.PostSummaryView;
import com.campuslove.api.village.VillageQueryService;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实帖子搜索服务实现（real profile，2026-08-11）。
 *
 * <p>流程：SQL 中缀 LIKE 一次拉取命中帖（上限 200）→ 内存相关性评分
 * （标题命中 > 标签命中 > 内容命中；完全 > 前缀 > 中缀）→ 热度加权
 * （searchScore = matchScore * (0.7 + 0.3 * hotScore/100)）→ 降序分页。
 * 校园规模纯 SQL 搜索（与用户搜索同口径），不引入全文索引/ES。</p>
 *
 * <p>搜索词记录：登录用户每次搜索写入 search_queries（按人/词/日去重防刷），
 * 供热搜榜聚合。</p>
 */
@Profile("real")
@Service
public class RealPostSearchService implements PostSearchService {

    private static final PostStatus STATUS_ACTIVE = PostStatus.active;
    private static final AuditStatus AUDIT_APPROVED = AuditStatus.approved;

    /** 搜索候选上限（内存评分前的一次性拉取量，校园规模足够） */
    private static final int CANDIDATE_LIMIT = 200;

    // 相关性分阶梯（参考贴吧搜索：标题命中 > 标签命中 > 内容命中；完全 > 前缀 > 中缀）
    private static final int TITLE_EXACT = 100;
    private static final int TITLE_PREFIX = 80;
    private static final int TITLE_INFIX = 60;
    private static final int TAG_HIT = 70;
    private static final int CONTENT_EXACT = 55;
    private static final int CONTENT_PREFIX = 45;
    private static final int CONTENT_INFIX = 30;

    private final PostRepository postRepository;
    private final SearchQueryRepository searchQueryRepository;
    private final VillageQueryService queryService;

    public RealPostSearchService(PostRepository postRepository,
                                 SearchQueryRepository searchQueryRepository,
                                 VillageQueryService queryService) {
        this.postRepository = postRepository;
        this.searchQueryRepository = searchQueryRepository;
        this.queryService = queryService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostSearchView> searchPosts(Long currentUserId, String keyword, Pageable pageable) {
        String trimmed = keyword == null ? "" : keyword.trim();
        if (trimmed.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        if (currentUserId != null) {
            recordSearchQuery(currentUserId, trimmed);
        }

        // 一次拉取全部命中（校园规模），内存评分
        Page<Post> candidates = postRepository.searchByKeyword(trimmed, STATUS_ACTIVE, AUDIT_APPROVED,
                PageRequest.of(0, CANDIDATE_LIMIT));
        List<Post> posts = candidates.getContent();
        if (posts.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        // 批量转换摘要视图（与列表页同款卡片，含作者/收藏/活动预加载）
        Map<Long, PostSummaryView> summaryMap = new LinkedHashMap<>();
        List<PostSummaryView> summaries = queryService.toPostSummaryViewsPublic(posts, "");
        for (int i = 0; i < posts.size(); i++) {
            summaryMap.put(posts.get(i).getId(), summaries.get(i));
        }

        // 相关性评分 + 热度加权
        List<ScoredResult> scored = posts.stream()
                .map(post -> {
                    int matchScore = matchScore(post, trimmed);
                    double hotScore = post.getHotScore() != null ? post.getHotScore() : 0.0;
                    double heatFactor = 0.7 + 0.3 * Math.min(1.0, hotScore / 100.0);
                    return new ScoredResult(post, matchScore * heatFactor,
                            matchType(post, trimmed));
                })
                .sorted(Comparator.comparingDouble(ScoredResult::score).reversed())
                .toList();

        // 分页
        int total = scored.size();
        int from = Math.min(pageable.getPageNumber() * pageable.getPageSize(), total);
        int to = Math.min(from + pageable.getPageSize(), total);
        List<PostSearchView> pageItems = from < to
                ? scored.subList(from, to).stream()
                        .map(r -> new PostSearchView(summaryMap.get(r.post().getId()), r.score(), r.matchType()))
                        .toList()
                : List.of();
        return new PageImpl<>(pageItems, pageable, total);
    }

    /** 搜索词记录（防刷：同人同词同日仅一条，命中则累加计数）。 */
    private void recordSearchQuery(Long userId, String keyword) {
        try {
            LocalDate today = LocalDate.now();
            SearchQuery existing = searchQueryRepository
                    .findByUserIdAndKeywordAndSearchDate(userId, keyword, today).orElse(null);
            if (existing != null) {
                existing.setSearchCount(existing.getSearchCount() + 1);
                searchQueryRepository.save(existing);
                return;
            }
            SearchQuery sq = new SearchQuery();
            sq.setKeyword(keyword);
            sq.setSearchDate(today);
            sq.setUserId(userId);
            sq.setSearchCount(1);
            sq.setIsRemoved(false);
            searchQueryRepository.save(sq);
        } catch (RuntimeException e) {
            // 搜索词记录失败不影响主搜索流程（降级跳过）
        }
    }

    /** 相关性评分：各字段分别打分，取最高（标题 > 标签 > 内容）。 */
    private int matchScore(Post post, String keyword) {
        int score = 0;
        String title = post.getTitle() != null ? post.getTitle() : "";
        if (title.contains(keyword)) {
            score = Math.max(score, title.equals(keyword) ? TITLE_EXACT
                    : title.startsWith(keyword) ? TITLE_PREFIX : TITLE_INFIX);
        }
        String tags = post.getTags() != null ? post.getTags() : "";
        if (tags.contains(keyword)) {
            score = Math.max(score, TAG_HIT);
        }
        String content = post.getContent() != null ? post.getContent() : "";
        if (content.contains(keyword)) {
            score = Math.max(score, content.equals(keyword) ? CONTENT_EXACT
                    : content.startsWith(keyword) ? CONTENT_PREFIX : CONTENT_INFIX);
        }
        return Math.max(score, CONTENT_INFIX);
    }

    /** 命中位置（展示用：title / tag / content，标题优先）。 */
    private String matchType(Post post, String keyword) {
        String title = post.getTitle() != null ? post.getTitle() : "";
        if (title.contains(keyword)) {
            return "title";
        }
        String tags = post.getTags() != null ? post.getTags() : "";
        if (tags.contains(keyword)) {
            return "tag";
        }
        return "content";
    }

    private record ScoredResult(Post post, double score, String matchType) {
    }
}
