package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.repository.PostRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 村口帖子发布组件（Task 4.2.2 拆分）。
 *
 * <p>职责：处理帖子创建/更新/删除等写操作。不负责查询（由 {@link VillageQueryService}
 * 负责）和互动（点赞/评论/转发由 {@link VillageInteractionService} 负责）。</p>
 *
 * <p>提取自原 RealVillageService.createPost 方法。包含敏感词过滤、标签清洗、
 * 帖子初始化（计数清零、状态置为 active）等逻辑，并通过 @CacheEvict 主动失效热门列表缓存。</p>
 */
@Profile("real")
@Component
public class VillagePostService {

    private final PostRepository postRepository;
    private final SensitiveWordFilter sensitiveWordFilter;
    private final VillageQueryService queryService;

    public VillagePostService(PostRepository postRepository,
                              SensitiveWordFilter sensitiveWordFilter,
                              VillageQueryService queryService) {
        this.postRepository = postRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.queryService = queryService;
    }

    /**
     * 创建新帖子。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>校验 userId 与 content（必填）</li>
     *   <li>敏感词过滤：对 content 与 tags 调用 {@link SensitiveWordFilter#filterWithLog} 过滤并记录日志</li>
     *   <li>初始化帖子实体：likesCount/commentsCount/shareCount 均置为 0，status=active</li>
     *   <li>持久化并通过 {@link VillageQueryService#toPostDetailView} 转换为视图（isAuthor=true）</li>
     *   <li>失效 VILLAGE_HOT_POSTS 缓存（allEntries=true）</li>
     * </ol>
     *
     * @param userId   作者用户 ID
     * @param title    帖子标题（2026-08-08 走查 P1：必填 5-30 字）
     * @param content  帖子正文
     * @param images   图片 URL 列表（可为 null）
     * @param tags     标签列表（可为 null，将进行敏感词过滤）
     * @param category 分类（可为 null，默认 PostCategory.all）
     * @return 帖子详情视图（isAuthor=true）
     * @throws IllegalArgumentException 当 userId/content/title 为空或 title 长度不合法时
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags, String category) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (title == null || title.trim().length() < 5 || title.trim().length() > 30) {
            throw new IllegalArgumentException("帖子标题必填，长度需为 5-30 字");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        String filteredTitle = sensitiveWordFilter.filterWithLog(title.trim(), userId, "POST");
        String filteredContent = sensitiveWordFilter.filterWithLog(content, userId, "POST");
        List<String> filteredTags = filterTagList(tags, userId);

        LocalDateTime now = LocalDateTime.now();
        Post post = new Post();
        post.setAuthorId(userId);
        post.setTitle(filteredTitle);
        post.setContent(filteredContent);
        post.setImages(queryService.toJsonString(images));
        post.setTags(queryService.toJsonString(filteredTags));
        // infra R2-00216: 非法分类值转 400（原实现 valueOf 未捕获直接 500）
        PostCategory postCategory;
        try {
            postCategory = category != null ? PostCategory.valueOf(category) : PostCategory.all;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("不支持的帖子分类: " + category
                    + ", 仅支持: " + java.util.Arrays.toString(PostCategory.values()));
        }
        post.setCategory(postCategory);
        post.setLikesCount(0);
        post.setCommentsCount(0);
        post.setShareCount(0);
        post.setStatus(PostStatus.active);
        post.setCreatedAt(now);
        post.setUpdatedAt(now);

        // 缺陷修复：使用 saveAndFlush 立即回填 IDENTITY 主键，保证返回视图中的 id 非空
        // （原 save() 在事务提交时才生成主键，实体在构建视图时 getId() 仍为 null；
        //  实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        post = postRepository.saveAndFlush(post);
        return queryService.toPostDetailView(post, userId);
    }

    /**
     * 过滤标签列表中的敏感词。
     * 对每个标签进行敏感词过滤，移除空结果与空白字符串。
     *
     * @param tags   原始标签列表（可为 null）
     * @param userId 用户 ID（用于日志记录）
     * @return 过滤后的标签列表（不为 null）
     */
    private List<String> filterTagList(List<String> tags, Long userId) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        List<String> filtered = new ArrayList<>();
        for (String tag : tags) {
            String filteredTag = sensitiveWordFilter.filterWithLog(tag, userId, "POST_TAG");
            if (filteredTag != null && !filteredTag.isBlank()) {
                filtered.add(filteredTag);
            }
        }
        return filtered;
    }
}
