package com.campuslove.api.village;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 真实村口帖子服务实现（Task 4.2.2 重构）。
 *
 * <p>原 960 行 God Class 已拆分为 3 个组件：</p>
 * <ul>
 *   <li>{@link VillageQueryService}：所有只读查询（帖子列表、详情、评论、分类、热门、同校动态流、相似作者推荐）</li>
 *   <li>{@link VillagePostService}：帖子发布（含敏感词过滤）</li>
 *   <li>{@link VillageInteractionService}：帖子互动（点赞、评论、转发）</li>
 * </ul>
 *
 * <p>本类保留接口编排与 Phase 1 兼容方法（默认用户从 SecurityContext 获取），
 * 所有 public 方法签名保持向后兼容。</p>
 */
@Profile("real")
@Service
public class RealVillageService implements VillageService {

    private final VillageQueryService queryService;
    private final VillagePostService postService;
    private final VillageInteractionService interactionService;

    public RealVillageService(VillageQueryService queryService,
                              VillagePostService postService,
                              VillageInteractionService interactionService) {
        this.queryService = queryService;
        this.postService = postService;
        this.interactionService = interactionService;
    }

    // ---- Phase 1 兼容方法（默认用户从 SecurityContext 获取） ----

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize) {
        return queryService.getPosts(category, tag, sortBy, page, pageSize, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
        return queryService.getPosts(category, tag, sortBy, page, pageSize, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize,
                                     Long userId, String city, String discoverSub) {
        return queryService.getPosts(category, tag, sortBy, page, pageSize, userId, city, discoverSub);
    }

    @Override
    public PostListResponse getPostsByAuthor(Long authorId, int page, int pageSize) {
        return queryService.getPostsByAuthor(authorId, page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public PostDetailView getPostDetail(Long id) {
        // 2026-08-08 论坛互动真实化：浏览量原子 +1 + 登录用户写浏览历史。
        // recordPostView 为 REQUIRES_NEW 独立读写事务，不受本方法只读事务影响；
        // 匿名浏览（currentUserId=null）仅累加 view_count 不写历史。
        Long currentUserId = null;
        try {
            currentUserId = SecurityUtils.getCurrentUserId();
        } catch (HttpClientErrorException.Unauthorized ignored) {
            // 匿名详情浏览：不写浏览历史，仅计浏览量
        }
        interactionService.recordPostView(currentUserId, id);
        return queryService.getPost(id);
    }

    @Override
    @Transactional
    public PostDetailView createPost(Long userId, @Valid CreatePostRequest request) {
        return postService.createPost(userId, request.title(), request.content(), request.images(),
                request.tags(), request.category(), request.activityId());
    }

    @Override
    @Transactional
    public PostLikeResponse likePost(Long id) {
        return interactionService.likePost(SecurityUtils.getCurrentUserId(), id);
    }

    @Override
    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long postId, int page, int pageSize) {
        return queryService.getComments(postId, page, pageSize);
    }

    @Override
    @Transactional
    public CommentItemView createComment(Long userId, Long postId, @Valid CreateCommentRequest request) {
        // P1-02 / A-12 楼中楼：透传 parentId（null 为根评论）
        return interactionService.commentPost(userId, postId, request.content(), request.parentId());
    }

    @Override
    @Transactional
    public ShareView sharePost(Long userId, Long postId, @Valid SharePostRequest request) {
        return interactionService.sharePost(userId, postId, request.comment());
    }

    // ---- Phase 2 核心实现：委托给 3 个组件 ----

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String tab, String category, Long userId, Pageable pageable) {
        return queryService.getPosts(tab, category, userId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public PostDetailView getPost(Long postId) {
        // 兼容未认证用户：SecurityUtils 抛 401 时降级为 null
        Long currentUserId = null;
        try {
            currentUserId = SecurityUtils.getCurrentUserId();
        } catch (HttpClientErrorException.Unauthorized ignored) {
            // Task 10（FIN-00151）复核：此处 catch HttpClientErrorException.Unauthorized 为
            // HTTP 鉴权异常（SecurityUtils 从 SecurityContext 读取未认证抛出），非 DB 异常，
            // 触发时尚未执行 findPostOrThrow/toPostDetailView 等 DB 读操作，不存在"事务部分提交"风险；
            // 按设计意图允许未认证用户匿名查看帖子（isLiked/isAuthor 均为 false），
            // 无需 setRollbackOnly 或重新抛出（spec SubTask 10.5/10.6 适用于 DB 异常场景）。
        }
        // 2026-08-08 论坛互动真实化：浏览量原子 +1 + 登录用户写浏览历史（REQUIRES_NEW）
        interactionService.recordPostView(currentUserId, postId);
        Post post = queryService.findPostOrThrow(postId);
        // 已下架（hidden）/已删除的帖子详情不可见：返回 404，与列表过滤语义一致
        if (post.getStatus() != Post.PostStatus.active) {
            throw new com.campuslove.api.common.ResourceNotFoundException("Post not found: " + postId);
        }
        return queryService.toPostDetailView(post, currentUserId);
    }

    @Override
    @Transactional
    public PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags, String category, Long activityId) {
        return postService.createPost(userId, title, content, images, tags, category, activityId);
    }

    @Override
    @Transactional
    public PostLikeResponse likePost(Long userId, Long postId) {
        return interactionService.likePost(userId, postId);
    }

    @Override
    @Transactional
    public CommentItemView commentPost(Long userId, Long postId, String content) {
        return interactionService.commentPost(userId, postId, content);
    }

    @Override
    @Transactional
    public PostLikeResponse likeComment(Long userId, Long commentId) {
        return interactionService.likeComment(userId, commentId);
    }

    @Override
    @Transactional
    public CommentItemView commentPost(Long userId, Long postId, String content, Long parentId) {
        return interactionService.commentPost(userId, postId, content, parentId);
    }

    @Override
    @Transactional
    public ShareView sharePost(Long userId, Long postId, String comment) {
        return interactionService.sharePost(userId, postId, comment);
    }

    // ---- 2026-08-08 论坛互动真实化：收藏 / 浏览记录 ----

    @Override
    @Transactional
    public FavoriteResponse toggleFavorite(Long userId, Long postId) {
        return interactionService.toggleFavorite(userId, postId);
    }

    @Override
    @Transactional(readOnly = true)
    public PostHistoryResponse getPostHistory(Long userId, int page, int pageSize) {
        return queryService.getPostHistory(userId, page, pageSize);
    }

    @Override
    @Transactional
    public void clearPostHistory(Long userId) {
        interactionService.clearPostHistory(userId);
    }

    // ---- 帖子分类 ----

    @Override
    @Transactional(readOnly = true)
    public List<PostCategoryView> getCategories() {
        return queryService.getCategories();
    }

    // ---- 热门帖子 ----

    // R4-00357：移除外层 @Cacheable——缓存统一由 VillageQueryService.listHotPosts
    // 承担（同 cacheNames+key，双层叠加为死代码）；本方法保留为轻量委托入口。
    @Transactional(readOnly = true)
    public List<PostSummaryView> listHotPosts() {
        return queryService.listHotPosts();
    }

    // ---- 同校动态流 ----

    @Override
    @Transactional(readOnly = true)
    public CampusFeedView getCampusFeed(Long userId, int page, int size) {
        return queryService.getCampusFeed(userId, page, size);
    }

    // ---- 相似作者推荐 ----

    @Override
    @Transactional(readOnly = true)
    public SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId) {
        return queryService.getSimilarAuthors(postId, userId);
    }
}
