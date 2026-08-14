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
     * 获取帖子列表（支持分类、标签、排序、分页，含 userId 用于校园筛选）。
     *
     * @param userId 当前用户 ID，仅当 category=campus 时需要
     */
    PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId);

    /**
     * 获取帖子列表（2026-08-07 扩展：同城 / 发现分类）。
     *
     * @param userId       当前用户 ID（校园/关注分类需要）
     * @param city         同城分类的城市名（category=samecity 时生效）
     * @param discoverSub  发现分类的二级子标签（all/alumni/hometown/buddy）
     */
    PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize,
                              Long userId, String city, String discoverSub);

    /**
     * 按作者分页查询帖子（"我的动态"场景，走查补齐）。
     *
     * @param authorId 作者用户 ID
     * @param page     页码（从 1 开始）
     * @param pageSize 每页大小
     * @return 该作者的帖子分页列表（按创建时间倒序）
     */
    PostListResponse getPostsByAuthor(Long authorId, int page, int pageSize);

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
     * 创建新帖子（Phase 1 兼容签名，title 为 null 时由服务层校验拒绝）。
     *
     * @param userId  作者用户 ID
     * @param title   帖子标题（2026-08-08 走查 P1：必填 5-30 字）
     * @param content 帖子内容
     * @param images  图片 URL 列表
     * @param tags    标签列表
     * @param category 分类
     * @param activityId 关联活动 ID（2026-08-09 可选；无效值由服务层宽松置 null）
     * @return 帖子详情视图
     */
    PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags, String category, Long activityId);

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
     * 点赞/取消点赞评论（M-14，幂等切换）。
     *
     * <p>默认实现：返回静态成功响应（likeCount=1），供未升级的 mock 实现
     * （MockVillageService）编译兼容并保持演示可用；real 实现（RealVillageService）
     * 覆写为真实点赞记录 + 计数。</p>
     *
     * @param userId    当前用户 ID
     * @param commentId 评论 ID
     * @return 点赞响应（liked：当前是否已点赞；likeCount：最新点赞数）
     */
    default PostLikeResponse likeComment(Long userId, Long commentId) {
        return new PostLikeResponse(true, true, 1);
    }

    /**
     * 评论帖子（P1-02 / A-12 楼中楼：支持 parentId 楼中楼回复）。
     *
     * <p>默认实现：忽略 parentId 委托 {@link #commentPost(Long, Long, String)}，
     * 供未升级的 mock 实现（MockVillageService）编译兼容；real 实现
     * （RealVillageService）覆写为完整楼中楼逻辑。</p>
     *
     * @param userId   评论者用户 ID
     * @param postId   帖子 ID
     * @param content  评论内容
     * @param parentId 父评论 ID（楼中楼回复；null 为根评论）
     * @return 评论项视图
     */
    default CommentItemView commentPost(Long userId, Long postId, String content, Long parentId) {
        return commentPost(userId, postId, content);
    }

    /**
     * 转发帖子。
     *
     * @param userId  转发者用户 ID
     * @param postId  帖子 ID
     * @param comment 转发评论
     * @return 转发视图
     */
    ShareView sharePost(Long userId, Long postId, String comment);

    // ---- 2026-08-08 论坛互动真实化：收藏 / 浏览记录 ----

    /**
     * 切换帖子收藏状态（幂等 toggle）。
     *
     * <p>默认实现：返回未收藏静态响应，供未升级的 mock 实现编译兼容；
     * real 实现（RealVillageService）覆写为真实收藏记录 + 实时计数。</p>
     *
     * @param userId 当前用户 ID
     * @param postId 帖子 ID
     * @return 收藏响应（favorited：当前是否已收藏；favoriteCount：最新收藏数）
     */
    default FavoriteResponse toggleFavorite(Long userId, Long postId) {
        return new FavoriteResponse(true, false, 0);
    }

    /**
     * 分页查询当前用户的帖子浏览历史。
     *
     * <p>默认实现：返回空列表，供未升级的 mock 实现编译兼容；
     * real 实现（RealVillageService）覆写为真实浏览记录分页。</p>
     *
     * @param userId   当前用户 ID
     * @param page     页码（从 1 开始）
     * @param pageSize 每页条数
     * @return 浏览历史分页响应
     */
    default PostHistoryResponse getPostHistory(Long userId, int page, int pageSize) {
        return new PostHistoryResponse(List.of(), 0, page, pageSize);
    }

    /**
     * 清空当前用户的帖子浏览历史。
     *
     * @param userId 当前用户 ID
     */
    default void clearPostHistory(Long userId) {
        // 默认空操作，供未升级的 mock 实现编译兼容；real 实现覆写为真实删除
    }

    // ---- Phase 2 新增：帖子分类 ----

    /**
     * 获取帖子分类列表（仅返回已启用的分类）。
     *
     * @return 分类视图列表
     */
    List<PostCategoryView> getCategories();

    // ---- 同校动态流 ----

    /**
     * 聚合同校动态流。
     * 获取用户所在学校，聚合同校用户最新帖子、即将开始的活动、
     * 兴趣圈最新话题，按时间倒序混合排列。
     *
     * @param userId 当前用户 ID
     * @param page   页码（从 0 开始）
     * @param size   每页大小
     * @return 同校动态流视图
     */
    CampusFeedView getCampusFeed(Long userId, int page, int size);

    // ---- 相似作者推荐 ----

    /**
     * 获取与帖子作者相似的推荐用户。
     * 基于兴趣标签重叠度和同校关系推荐 1-2 位最相似的用户，
     * 排除已关注的用户和当前用户自身。
     *
     * @param postId 帖子 ID（用于获取帖子作者信息作为匹配基准）
     * @param userId 当前用户 ID（用于排除已关注和自身）
     * @return 相似作者推荐响应
     */
    SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId);

    // ---- 2026-08-11 热度榜 / 帖子推荐流 ----

    /**
     * 热度榜分页查询（按热度分降序）。
     *
     * <p>默认实现：委托 getPosts(hottest) 排序，供未升级的 mock 实现编译兼容；
     * real 实现（RealVillageService）覆写为按 hot_score 的专用榜单查询。</p>
     *
     * @param page     页码（从 1 开始）
     * @param pageSize 每页条数
     * @return 热度榜分页响应
     */
    default PostListResponse getHotBoard(int page, int pageSize) {
        return getPosts(null, null, "hottest", page, pageSize);
    }

    /**
     * 帖子推荐流（贴吧式推流：关注新帖 + 同校热帖 + 兴趣帖混合）。
     *
     * <p>默认实现：委托 getPosts(latest) 排序，供未升级的 mock 实现编译兼容；
     * real 实现（RealVillageService）覆写为混合推荐流。</p>
     *
     * @param page     页码（从 1 开始）
     * @param pageSize 每页条数
     * @return 推荐流分页响应
     */
    default PostListResponse getPostRecommend(int page, int pageSize) {
        return getPosts(null, null, "latest", page, pageSize);
    }
}
