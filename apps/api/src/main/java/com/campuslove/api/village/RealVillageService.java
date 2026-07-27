package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
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
    public PostDetailView getPostDetail(Long id) {
        return queryService.getPost(id);
    }

    @Override
    @Transactional
    public PostDetailView createPost(Long userId, @Valid CreatePostRequest request) {
        return postService.createPost(userId, request.content(), request.images(), request.tags(), request.category());
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
        return interactionService.commentPost(userId, postId, request.content());
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
            // 未认证用户查看帖子，isLiked/isAuthor 均为 false
        }
        Post post = queryService.findPostOrThrow(postId);
        return queryService.toPostDetailView(post, currentUserId);
    }

    @Override
    @Transactional
    public PostDetailView createPost(Long userId, String content, List<String> images, List<String> tags, String category) {
        return postService.createPost(userId, content, images, tags, category);
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
    public ShareView sharePost(Long userId, Long postId, String comment) {
        return interactionService.sharePost(userId, postId, comment);
    }

    // ---- 帖子分类 ----

    @Override
    @Transactional(readOnly = true)
    public List<PostCategoryView> getCategories() {
        return queryService.getCategories();
    }

    // ---- 热门帖子 ----

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.VILLAGE_HOT_POSTS, key = "'hot'")
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
