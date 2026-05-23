package com.campuslove.api.village;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Pageable;

/**
 * 村口帖子与转发服务接口。
 * 提供帖子列表、详情、发布、点赞、评论以及转发等功能。
 */
public interface VillageService {

    /**
     * 获取帖子列表（支持分类、标签、排序、分页）。
     */
    PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize);

    /**
     * 获取帖子详情。
     */
    PostDetailView getPostDetail(Long id);

    /**
     * 发布新帖子。
     *
     * @param userId  作者用户 ID（Phase 1 兼容，由 Controller 传入）
     * @param request 发布帖子请求体
     * @return 帖子详情视图
     */
    PostDetailView createPost(Long userId, @Valid CreatePostRequest request);

    /**
     * 点赞帖子（Phase 1 兼容，使用默认用户 ID）。
     * 推荐使用 {@link #likePost(Long, Long)} 传入实际 userId。
     *
     * @param id 帖子 ID
     * @return 点赞响应
     */
    PostLikeResponse likePost(Long id);

    /**
     * 获取帖子评论列表。
     */
    CommentListResponse getComments(Long postId, int page, int pageSize);

    /**
     * 发表评论。
     *
     * @param userId  评论者用户 ID（Phase 1 兼容，由 Controller 传入）
     * @param postId  帖子 ID
     * @param request 评论请求体
     * @return 评论项视图
     */
    CommentItemView createComment(Long userId, Long postId, @Valid CreateCommentRequest request);

    /**
     * 转发帖子。
     *
     * @param userId  转发者用户 ID（Phase 1 兼容，由 Controller 传入）
     * @param postId  帖子 ID
     * @param request 转发请求体
     * @return 转发视图
     */
    ShareView sharePost(Long userId, Long postId, @Valid SharePostRequest request);

    // ---- Phase 2 新增：支持 tab 和 userId 的帖子列表 ----

    /**
     * 获取帖子列表（支持 tab 切换、分类过滤、分页）。
     * tab 类型：
     * - discover: 所有帖子，按创建时间倒序
     * - city: 同城市帖子优先
     * - following: 关注用户的帖子
     *
     * @param tab      标签页类型 (discover/city/following)
     * @param category 分类过滤
     * @param userId   当前用户 ID（用于 city/following 过滤）
     * @param pageable 分页参数
     * @return 帖子列表响应
     */
    PostListResponse getPosts(String tab, String category, Long userId, Pageable pageable);

    /**
     * 获取帖子详情（带作者信息）。
     *
     * @param postId 帖子 ID
     * @return 帖子详情视图
     */
    PostDetailView getPost(Long postId);

    /**
     * 创建新帖子。
     *
     * @param userId  作者用户 ID
     * @param content 帖子内容
     * @param images  图片 URL 列表
     * @param tags    标签列表
     * @param category 分类
     * @return 帖子详情视图
     */
    PostDetailView createPost(Long userId, String content, List<String> images, List<String> tags, String category);

    /**
     * 点赞帖子（切换点赞状态）。
     *
     * @param userId 当前用户 ID
     * @param postId 帖子 ID
     * @return 点赞响应
     */
    PostLikeResponse likePost(Long userId, Long postId);

    /**
     * 评论帖子。
     *
     * @param userId  评论者用户 ID
     * @param postId  帖子 ID
     * @param content 评论内容
     * @return 评论项视图
     */
    CommentItemView commentPost(Long userId, Long postId, String content);

    /**
     * 转发帖子。
     *
     * @param userId  转发者用户 ID
     * @param postId  帖子 ID
     * @param comment 转发评论
     * @return 转发视图
     */
    ShareView sharePost(Long userId, Long postId, String comment);
}
