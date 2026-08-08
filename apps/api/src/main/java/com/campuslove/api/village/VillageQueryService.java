package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.PostCategoryEntity;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.entity.PostViewHistory;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostCategoryRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostViewHistoryRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 村口帖子查询组件（Task 4.2.2 拆分）。
 *
 * <p>职责：所有只读查询路径，包括：</p>
 * <ul>
 *   <li>帖子列表（discover / city / following / campus / 分类）</li>
 *   <li>帖子详情、评论列表、分类列表、热门帖子</li>
 *   <li>同校动态流聚合（帖子 + 活动 + 话题）</li>
 *   <li>相似作者推荐</li>
 *   <li>视图转换与辅助方法（toPostSummaryView / toPostDetailView / toCommentItemView 等）</li>
 * </ul>
 *
 * <p>不写入任何数据；写操作由 {@link VillagePostService}（发布）与
 * {@link VillageInteractionService}（点赞/评论/转发）负责。</p>
 */
@Profile("real")
@Component
public class VillageQueryService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    /**
     * 2026-08-08 论坛互动真实化：评论点赞 Repository（评论区点赞数与已点赞批量查询）。
     */
    private final CommentLikeRepository commentLikeRepository;
    private final PostCategoryRepository postCategoryRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final ObjectMapper objectMapper;
    private final ActivityRepository activityRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final VillageViewMapper viewMapper;
    /**
     * 2026-08-08 论坛互动真实化：帖子浏览历史 Repository（浏览记录分页查询）。
     */
    private final PostViewHistoryRepository postViewHistoryRepository;

    /** 相似作者候选池大小（FIN-00024 修复：原 50 过小，扩大至与推荐算法对齐的 200） */
    private static final int SIMILAR_AUTHOR_CANDIDATE_LIMIT = 200;

    /**
     * JPA 实体管理器（FIN-00021/00022 修复）。
     *
     * <p>用于同校用户 ID 集合查询与 JOIN FETCH 预加载等 Repository 未覆盖的查询，
     * 仅在只读事务内使用。为兼容既有单元测试（直接 new 构造器），此字段可为 null：
     * null 时对应方法回退到原查询路径（仅测试场景触发；Spring 注入路径恒非 null）。</p>
     */
    private final EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    public VillageQueryService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostLikeRepository postLikeRepository,
            CommentLikeRepository commentLikeRepository,
            PostCategoryRepository postCategoryRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserFollowRepository userFollowRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ObjectMapper objectMapper,
            ActivityRepository activityRepository,
            CircleTopicRepository circleTopicRepository,
            VillageViewMapper viewMapper,
            PostViewHistoryRepository postViewHistoryRepository,
            EntityManager entityManager) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postLikeRepository = postLikeRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.postCategoryRepository = postCategoryRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userFollowRepository = userFollowRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.objectMapper = objectMapper;
        this.activityRepository = activityRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.viewMapper = viewMapper;
        this.postViewHistoryRepository = postViewHistoryRepository;
        this.entityManager = entityManager;
    }

    /**
     * 兼容旧测试的构造器（entityManager 为 null，相关查询回退原路径）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 EntityManager 的构造器。
     */
    @Deprecated
    public VillageQueryService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostLikeRepository postLikeRepository,
            PostCategoryRepository postCategoryRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserFollowRepository userFollowRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ObjectMapper objectMapper,
            ActivityRepository activityRepository,
            CircleTopicRepository circleTopicRepository,
            VillageViewMapper viewMapper) {
        this(postRepository, commentRepository, postLikeRepository, null, postCategoryRepository,
                userRepository, userCampusProfileRepository, userFollowRepository,
                userBasicProfileRepository, objectMapper, activityRepository,
                circleTopicRepository, viewMapper, null, null);
    }

    // ---- 帖子列表 ----

    /**
     * 解析帖子分类枚举，非法值转 400。
     *
     * 2026-08-07 修复：following 为前端「关注」Tab 的分类，不属于帖子分类枚举，
     * 由 {@link #getPosts} 单独处理，不应走到枚举解析。
     */
    private PostCategory parseCategory(String category) {
        try {
            return PostCategory.valueOf(category);
        } catch (IllegalArgumentException | NullPointerException e) {
            // infra R2-00213: 非法分类值转 400（原实现直接 500）
            throw new IllegalArgumentException("不支持的帖子分类: " + category
                    + ", 仅支持: " + java.util.Arrays.toString(PostCategory.values()));
        }
    }

    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
        // FIN-00023 修复：sortBy 参数现在真正生效（原实现忽略 sortBy，恒按 createdAt 倒序）。
        // latest=最新发布（createdAt DESC），hottest=最热（likesCount DESC）。
        // 说明：Pageable 携带的 Sort 优先级高于派生方法名中的 OrderBy 子句（Spring Data 约定）。
        String effectiveSort = sortBy != null ? sortBy : "latest";
        Sort sort = "hottest".equals(effectiveSort)
                ? Sort.by(Sort.Direction.DESC, "likesCount")
                // 2026-08-09 置顶排序：最新流置顶帖优先（isPinned DESC → createdAt DESC）
                : Sort.by(Sort.Direction.DESC, "isPinned")
                        .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable pageable = PageRequest.of(page - 1, pageSize, sort);
        if ("campus".equals(category)) {
            return getCampusCategoryPosts(userId, pageable);
        }
        // 2026-08-07 修复：关注 Tab（category=following）——展示我关注的作者发布的帖子；
        // 未登录或未关注任何人时返回空列表（此前 parseCategory 对 following 抛 400 导致圈子页不可用）。
        if ("following".equals(category)) {
            if (userId == null) {
                return new PostListResponse(List.of(), 0, page, pageSize);
            }
            Set<Long> followedUserIds = loadFollowedUserIds(userId);
            if (followedUserIds.isEmpty()) {
                return new PostListResponse(List.of(), 0, page, pageSize);
            }
            Page<Post> followedPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                    new ArrayList<>(followedUserIds), PostStatus.active, pageable);
            List<PostSummaryView> followedItems = toPostSummaryViews(
                    followedPage.getContent(), "", followedUserIds);
            return new PostListResponse(followedItems, (int) followedPage.getTotalElements(), page, pageSize);
        }
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = parseCategory(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }
        // Phase Feedback3 P2.5：主列表透传关注集合，isFollowed 随帖下发（关注 Tab 打通）
        List<PostSummaryView> items = toPostSummaryViews(postPage.getContent(), "", loadFollowedUserIds(userId));
        return new PostListResponse(items, (int) postPage.getTotalElements(), page, pageSize);
    }

    /**
     * 2026-08-07 扩展：同城 / 发现分类（圈子页三 Tab）。
     *
     * <p>samecity：按作者校区城市过滤（Post 表无城市字段，需经作者 campus profile 关联）；
     * discover：R4-00339 起二级子标签 all/alumni/hometown/buddy 在服务端实现过滤
     * （此前被忽略恒返回全量 active 帖子）：
     * <ul>
     *   <li>all：全量 active 帖子（isAlumni 按当前用户校区正确计算）</li>
     *   <li>alumni：作者与当前用户同校（按 campus profile 过滤，与校园 Tab 同源）</li>
     *   <li>hometown：内容/标签含「老乡/同乡」（与前端老乡语义一致）</li>
     *   <li>buddy：内容/标签含「搭子」（前端另含作者兴趣聚合的本地过滤，服务端
     *       按搭子关键词收窄，交集语义不变）</li>
     * </ul>
     * </p>
     */
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize,
                                     Long userId, String city, String discoverSub) {
        String effectiveSort = sortBy != null ? sortBy : "latest";
        Sort sort = "hottest".equals(effectiveSort)
                ? Sort.by(Sort.Direction.DESC, "likesCount")
                // 2026-08-09 置顶排序：最新流置顶帖优先（isPinned DESC → createdAt DESC）
                : Sort.by(Sort.Direction.DESC, "isPinned")
                        .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable pageable = PageRequest.of(page - 1, pageSize, sort);

        // 同城：按作者校区城市过滤
        if ("samecity".equals(category) && city != null && !city.isBlank()) {
            List<Long> cityUserIds = userCampusProfileRepository.findByCityName(city).stream()
                    .map(UserCampusProfile::getUserId)
                    .toList();
            if (cityUserIds.isEmpty()) {
                return new PostListResponse(List.of(), 0, page, pageSize);
            }
            Page<Post> cityPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                    new ArrayList<>(cityUserIds), PostStatus.active, pageable);
            return new PostListResponse(toPostSummaryViews(cityPage.getContent(), "", loadFollowedUserIds(userId)),
                    (int) cityPage.getTotalElements(), page, pageSize);
        }

        // 发现：R4-00339 按 discoverSub 子标签服务端过滤（此前恒返回全量 active 帖子）
        if ("discover".equals(category)) {
            String sub = discoverSub != null ? discoverSub : "all";
            // 当前用户校区：alumni 子标签过滤与 isAlumni 字段计算共用
            String myCampusName = userId != null
                    ? userCampusProfileRepository.findByUserId(userId)
                            .map(UserCampusProfile::getCampusName).orElse("")
                    : "";
            switch (sub) {
                case "alumni" -> {
                    if (myCampusName.isEmpty()) {
                        return new PostListResponse(List.of(), 0, page, pageSize);
                    }
                    List<Long> campusUserIds = findCampusUserIds(myCampusName);
                    if (campusUserIds.isEmpty()) {
                        return new PostListResponse(List.of(), 0, page, pageSize);
                    }
                    Page<Post> alumniPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                            new ArrayList<>(campusUserIds), PostStatus.active, pageable);
                    return new PostListResponse(
                            toPostSummaryViews(alumniPage.getContent(), myCampusName, loadFollowedUserIds(userId)),
                            (int) alumniPage.getTotalElements(), page, pageSize);
                }
                case "hometown" -> {
                    // 老乡：内容/标签含「老乡」或「同乡」（与前端老乡 Tab 语义一致）
                    Page<Post> hometownPage = postRepository.findByStatusAndKeyword(
                            PostStatus.active, "老乡", "同乡", pageable);
                    return new PostListResponse(
                            toPostSummaryViews(hometownPage.getContent(), myCampusName, loadFollowedUserIds(userId)),
                            (int) hometownPage.getTotalElements(), page, pageSize);
                }
                case "buddy" -> {
                    // 搭子：内容/标签含「搭子」（前端另含作者兴趣聚合的本地过滤，
                    // 服务端按搭子关键词收窄，前后端交集语义不变）
                    Page<Post> buddyPage = postRepository.findByStatusAndKeyword(
                            PostStatus.active, "搭子", null, pageable);
                    return new PostListResponse(
                            toPostSummaryViews(buddyPage.getContent(), myCampusName, loadFollowedUserIds(userId)),
                            (int) buddyPage.getTotalElements(), page, pageSize);
                }
                default -> {
                    // all / 未知子标签：全量 active 帖子
                    Page<Post> discoverPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
                    return new PostListResponse(
                            toPostSummaryViews(discoverPage.getContent(), myCampusName, loadFollowedUserIds(userId)),
                            (int) discoverPage.getTotalElements(), page, pageSize);
                }
            }
        }

        // 其余分类委托原逻辑
        return getPosts(category, tag, sortBy, page, pageSize, userId);
    }

    /**
     * 按作者分页查询帖子（"我的动态"场景）。
     *
     * <p>走查补齐：前端个人主页 {@code stores/profile.ts#loadMyPosts()} 调用
     * {@code GET /api/posts?authorId=x} 拉取当前用户发布的帖子，原实现缺少按作者
     * 过滤能力导致该请求被忽略（返回全量帖子）。本方法按作者 + active 状态查询，
     * 按创建时间倒序分页，与 {@link #getPosts} 视图映射保持一致。</p>
     *
     * @param authorId 作者用户 ID
     * @param page     页码（从 1 开始）
     * @param pageSize 每页大小
     * @return 该作者的帖子分页列表
     */
    @Transactional(readOnly = true)
    public PostListResponse getPostsByAuthor(Long authorId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> postPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                List.of(authorId), PostStatus.active, pageable);
        List<PostSummaryView> items = toPostSummaryViews(postPage.getContent(), "");
        return new PostListResponse(items, (int) postPage.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public PostListResponse getPosts(String tab, String category, Long userId, Pageable pageable) {
        String effectiveTab = tab != null ? tab : "discover";
        return switch (effectiveTab) {
            case "city" -> getCityPosts(category, userId, pageable);
            case "following" -> getFollowingPosts(category, userId, pageable);
            default -> getDiscoverPosts(category, pageable);
        };
    }

    @Transactional(readOnly = true)
    public PostDetailView getPost(Long postId) {
        Post post = findPostOrThrow(postId);
        // 已下架（hidden）/已删除的帖子详情不可见：与列表过滤语义一致返回 404，
        // 避免已下架内容通过直链详情仍然可访问（举报处理 → 审核下架后的合规闭环）
        if (post.getStatus() != Post.PostStatus.active) {
            throw new com.campuslove.api.common.ResourceNotFoundException("Post not found: " + postId);
        }
        Long currentUserId = null;
        try {
            currentUserId = SecurityUtils.getCurrentUserId();
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized ignored) {
            // Task 10（FIN-00157）复核：此处 catch HttpClientErrorException.Unauthorized 为
            // HTTP 鉴权异常（SecurityUtils 从 SecurityContext 读取未认证抛出），非 DB 异常；
            // 触发时 findPostOrThrow（DB 读）已完成且无写操作，不存在"事务部分提交"风险；
            // 按设计意图允许未认证用户匿名查看帖子（isLiked/isAuthor 均为 false），
            // 按 spec SubTask 10.6 提示"若是只读查询则评估是否真的需要事务"——本方法为只读查询，
            // 无需 setRollbackOnly 或重新抛出。
        }
        // 2026-08-08 论坛互动真实化：本地 +1 保证本次响应 viewCount 即时。
        // 数据库侧原子 +1 与浏览历史写入由调用方（RealVillageService.getPostDetail）
        // 在 recordPostView（REQUIRES_NEW 独立事务）中完成；本实体在只读事务内，
        // 本地修改不会 flush，无脏写风险。
        post.setViewCount(post.getViewCount() + 1);
        return toPostDetailView(post, currentUserId);
    }

    /**
     * 分页查询当前用户的帖子浏览历史（2026-08-08 论坛互动真实化）。
     *
     * <p>按 viewed_at 倒序，过滤已删除/下架帖；帖子摘要复用批量转换
     *（收藏数/已收藏/浏览量一致），保证浏览记录页与列表页观感一致。</p>
     *
     * @param userId   当前用户 ID（调用方已保证登录）
     * @param page     页码（从 1 开始）
     * @param pageSize 每页条数
     * @return 浏览历史分页响应
     */
    @Transactional(readOnly = true)
    public PostHistoryResponse getPostHistory(Long userId, int page, int pageSize) {
        Page<PostViewHistory> pageData = postViewHistoryRepository.findRecentByUserId(
                userId, PostStatus.active, PageRequest.of(page - 1, pageSize));
        List<PostViewHistory> histories = pageData.getContent();
        if (histories.isEmpty()) {
            return new PostHistoryResponse(List.of(), (int) pageData.getTotalElements(), page, pageSize);
        }
        // 批量取帖子并按 id 建 Map（保持历史倒序展示，而非按帖子 id 排序）
        List<Long> postIds = histories.stream().map(PostViewHistory::getPostId).toList();
        Map<Long, Post> postMap = postRepository.findAllById(postIds).stream()
                .collect(Collectors.toMap(Post::getId, p -> p));
        List<Post> posts = histories.stream()
                .map(h -> postMap.get(h.getPostId()))
                .filter(java.util.Objects::nonNull)
                .toList();
        // 复用批量摘要转换（作者/校区/收藏数/浏览量批量预加载，无 N+1）
        List<Long> authorIds = posts.stream().map(Post::getAuthorId).distinct().toList();
        Map<Long, User> authorMap = authorIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, UserCampusProfile> campusMap = authorIds.isEmpty()
                ? Collections.emptyMap()
                : userCampusProfileRepository.findByUserIdIn(authorIds).stream()
                        .collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p));
        // 2026-08-09 浏览历史同样带活动摘要 + 最新评论预览（批量预加载，无 N+1）
        List<PostSummaryView> summaries = viewMapper.toPostSummaryViews(
                posts, "", authorMap, campusMap, Collections.emptySet(),
                loadActivityMap(posts), loadRecentCommentsByPost(postIds));
        Map<Long, PostSummaryView> summaryMap = summaries.stream()
                .collect(Collectors.toMap(PostSummaryView::id, s -> s));
        List<PostHistoryItemView> items = histories.stream()
                .map(h -> new PostHistoryItemView(
                        summaryMap.get(h.getPostId()), h.getViewedAt().toString()))
                .filter(i -> i.post() != null)
                .toList();
        return new PostHistoryResponse(items, (int) pageData.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long postId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        // P1-02 / A-12 楼中楼：分页查询根评论（parent_id IS NULL），再批量加载各根评论的楼中楼回复，
        // 组装为树形结构（根评论数组，每条含 replies 子数组）
        Page<Comment> rootPage = commentRepository.findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(postId, pageable);
        List<Comment> roots = rootPage.getContent();
        List<Long> rootIds = roots.stream().map(Comment::getId).toList();

        // 楼中楼回复（时间正序，符合楼中楼阅读习惯）
        List<Comment> children = rootIds.isEmpty()
                ? Collections.emptyList()
                : commentRepository.findByPostIdAndParentIdInOrderByCreatedAtAsc(postId, rootIds);

        // 批量预加载作者（根评论 + 回复），避免 N+1
        List<Long> authorIds = java.util.stream.Stream.concat(
                        roots.stream().map(Comment::getAuthorId),
                        children.stream().map(Comment::getAuthorId))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> authorMap = authorIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        // 批量预加载回复的父评论（用于 replyTo 昵称）
        List<Long> parentIds = children.stream()
                .map(Comment::getParentId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, Comment> parentCommentMap = parentIds.isEmpty()
                ? Collections.emptyMap()
                : commentRepository.findAllById(parentIds).stream()
                        .collect(Collectors.toMap(Comment::getId, c -> c));

        // 2026-08-08 论坛互动真实化：批量预加载评论点赞数 + 当前用户已点赞集合（防 N+1）
        List<Long> allCommentIds = java.util.stream.Stream.concat(
                        roots.stream().map(Comment::getId),
                        children.stream().map(Comment::getId))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, Integer> commentLikeCountMap = allCommentIds.isEmpty() ? Collections.emptyMap()
                : commentLikeRepository.countByCommentIds(allCommentIds).stream()
                        .collect(Collectors.toMap(r -> (Long) r[0], r -> ((Number) r[1]).intValue()));
        // 匿名查看评论区：isLiked 全部 false（点赞数仍正常返回）
        final Long currentUserId = currentUserIdOrNull();
        Set<Long> likedCommentIds = currentUserId == null || allCommentIds.isEmpty()
                ? Collections.emptySet()
                : Set.copyOf(commentLikeRepository.findCommentIdsByUserIdAndCommentIdIn(currentUserId, allCommentIds));

        // 子评论按父评论 ID 分组（replyTo = 父评论作者昵称）
        Map<Long, List<CommentItemView>> repliesByParent = children.stream()
                .collect(Collectors.groupingBy(
                        Comment::getParentId,
                        Collectors.mapping(child -> {
                            Comment parent = parentCommentMap.get(child.getParentId());
                            String replyTo = null;
                            if (parent != null && parent.getAuthorId() != null) {
                                User parentAuthor = authorMap.get(parent.getAuthorId());
                                if (parentAuthor != null && parentAuthor.getNickname() != null) {
                                    replyTo = parentAuthor.getNickname();
                                }
                            }
                            return toCommentItemView(child, authorMap, replyTo, Collections.emptyList(),
                                    currentUserId, commentLikeCountMap, likedCommentIds);
                        }, Collectors.toList())));

        // 根评论视图（携带 replies 子数组）
        List<CommentItemView> items = roots.stream()
                .map(root -> toCommentItemView(root, authorMap, null,
                        repliesByParent.getOrDefault(root.getId(), Collections.emptyList()),
                        currentUserId, commentLikeCountMap, likedCommentIds))
                .toList();
        return new CommentListResponse(items, (int) rootPage.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public List<PostCategoryView> getCategories() {
        List<PostCategoryEntity> categories = postCategoryRepository.findByIsActiveTrueOrderBySortOrderAsc();
        return categories.stream()
                .map(cat -> new PostCategoryView(cat.getId(), cat.getName(), cat.getCode(),
                        cat.getIcon(), cat.getSortOrder()))
                .toList();
    }

    @Cacheable(cacheNames = CacheNames.VILLAGE_HOT_POSTS, key = "'hot'")
    @Transactional(readOnly = true)
    public List<PostSummaryView> listHotPosts() {
        Page<Post> postPage = postRepository.findByStatusOrderByLikesCountDesc(
                PostStatus.active, PageRequest.of(0, 20));
        return toPostSummaryViews(postPage.getContent(), "");
    }

    // ---- 同校动态流 ----

    @Transactional(readOnly = true)
    public CampusFeedView getCampusFeed(Long userId, int page, int size) {
        if (userId == null) throw new IllegalArgumentException("userId 不能为空");
        String campusName = userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName).orElse("");
        // FIN-00022 修复：page/size 参数对帖子列表分页生效（原实现忽略参数，固定取前 10 条）。
        // 活动（最多 5 条）与话题（最多 5 条）作为聚合流次要区块保持原有数量上限。
        List<PostSummaryView> posts = getCampusPosts(campusName, page, size);
        List<CampusActivityView> activities = getCampusActivities(campusName);
        List<CampusTopicView> topics = getCampusTopics();
        return new CampusFeedView(campusName, posts, activities, topics);
    }

    /**
     * FIN-00021 修复：同校分类帖子列表。
     *
     * <p>原实现「全量分页后在内存过滤同校」导致两个缺陷：
     * <ol>
     *   <li>totalElements 返回全站帖子总数而非同校帖子总数（语义错误）；</li>
     *   <li>当一页内同校帖子不足 pageSize 时发生跨页漏帖（分页偏移错误）。</li>
     * </ol>
     * 现改为两步 SQL：先查询同校用户 ID 集合，再以 {@code authorId IN (...) }
     * 直接在数据库侧分页过滤，totalElements 与分页偏移均正确。</p>
     */
    private PostListResponse getCampusCategoryPosts(Long userId, Pageable pageable) {
        if (userId == null) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        String myCampusName = userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName).orElse("");
        if (myCampusName.isEmpty()) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        List<Long> campusUserIds = findCampusUserIds(myCampusName);
        if (campusUserIds.isEmpty()) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        Page<Post> postPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                campusUserIds, PostStatus.active, pageable);
        List<PostSummaryView> items = toPostSummaryViews(postPage.getContent(), myCampusName);
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    /** 查询指定校区下的全部用户 ID（用于同校过滤下推到 SQL）。 */
    private List<Long> findCampusUserIds(String campusName) {
        if (campusName == null || campusName.isEmpty()) {
            return List.of();
        }
        if (entityManager == null) {
            // 兼容旧测试构造器（entityManager 为 null）：回退全量加载 + 内存过滤
            return userCampusProfileRepository.findAll().stream()
                    .filter(p -> campusName.equals(p.getCampusName()))
                    .map(UserCampusProfile::getUserId)
                    .toList();
        }
        return entityManager.createQuery(
                        "SELECT u.userId FROM UserCampusProfile u WHERE u.campusName = :campusName", Long.class)
                .setParameter("campusName", campusName)
                .getResultList();
    }

    /**
     * 获取同校最新帖子（SQL 过滤 + 分页，FIN-00022 修复）。
     *
     * @param campusName 当前用户校区，为空时返回空列表
     * @param page       页码（0-based，与 Controller 参数对齐）
     * @param size       每页大小
     */
    private List<PostSummaryView> getCampusPosts(String campusName, int page, int size) {
        if (campusName.isEmpty()) return List.of();
        List<Long> campusUserIds = findCampusUserIds(campusName);
        if (campusUserIds.isEmpty()) return List.of();
        Page<Post> postPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                campusUserIds, PostStatus.active, PageRequest.of(Math.max(0, page), Math.max(1, size)));
        return toPostSummaryViews(postPage.getContent(), campusName);
    }

    private List<CampusActivityView> getCampusActivities(String campusName) {
        if (campusName.isEmpty()) return List.of();
        Page<Activity> activityPage = activityRepository
                .findByCampusNameAndStatusOrderByActivityDateAsc(
                        campusName, ActivityStatus.upcoming, PageRequest.of(0, 5));
        return activityPage.getContent().stream()
                .map(activity -> new CampusActivityView(activity.getId(), activity.getTitle(),
                        activity.getScheduleText(), activity.getLocation(),
                        activity.getEnrollmentCount(), activity.getStatus().name()))
                .toList();
    }

    /**
     * FIN-00020 修复：同校动态流话题区块。
     *
     * <p>原实现逐条 {@code userRepository.findById} 查作者（N+1），且访问
     * {@code topic.getCircle()}（LAZY）也会逐条触发 circle 查询。
     * 现通过单条 {@code JOIN FETCH} 查询预加载 circle，并批量预加载作者，
     * 将 N+1 压缩为 2 次查询。</p>
     */
    private List<CampusTopicView> getCampusTopics() {
        final List<CircleTopic> topics;
        if (entityManager == null) {
            // 兼容旧测试构造器（entityManager 为 null）：回退 Repository 分页查询
            topics = circleTopicRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5)).getContent();
        } else {
            // FIN-00020 修复：单条 JOIN FETCH 查询预加载 circle，避免逐条触发 LAZY 加载
            topics = entityManager.createQuery(
                            "SELECT t FROM CircleTopic t JOIN FETCH t.circle ORDER BY t.createdAt DESC",
                            CircleTopic.class)
                    .setMaxResults(5)
                    .getResultList();
        }
        List<Long> authorIds = topics.stream().map(CircleTopic::getAuthorId).distinct().toList();
        Map<Long, User> authorMap = authorIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        return topics.stream()
                .map(topic -> {
                    User author = authorMap.get(topic.getAuthorId());
                    String authorName = author != null && author.getNickname() != null
                            && !author.getNickname().isBlank()
                            ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
                    return new CampusTopicView(topic.getId(), topic.getCircle().getId(),
                            topic.getCircle().getName(), topic.getTitle(), authorName,
                            topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                            topic.getCreatedAt().toString());
                }).toList();
    }

    private PostListResponse getDiscoverPosts(String category, Pageable pageable) {
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = parseCategory(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }
        List<PostSummaryView> items = toPostSummaryViews(postPage.getContent(), "");
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    private PostListResponse getCityPosts(String category, Long userId, Pageable pageable) {
        final String myCampusName;
        if (userId != null) {
            myCampusName = userCampusProfileRepository.findByUserId(userId)
                    .map(UserCampusProfile::getCampusName).orElse("");
        } else {
            myCampusName = "";
        }
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = parseCategory(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }
        List<Post> allPosts = new ArrayList<>(postPage.getContent());
        if (!myCampusName.isEmpty()) {
            // infra R2-00214: 批量预加载作者校区 Map，避免排序比较器内逐帖调用 isSameCampus 查库（N+1）
            Map<Long, String> authorCampusMap = loadAuthorCampusMap(allPosts);
            allPosts.sort((a, b) -> {
                boolean aSame = myCampusName.equals(authorCampusMap.get(a.getAuthorId()));
                boolean bSame = myCampusName.equals(authorCampusMap.get(b.getAuthorId()));
                if (aSame && !bSame) return -1;
                if (!aSame && bSame) return 1;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
        }
        List<PostSummaryView> items = toPostSummaryViews(allPosts, myCampusName);
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    private PostListResponse getFollowingPosts(String category, Long userId, Pageable pageable) {
        if (userId == null) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        List<UserFollow> followingRelations = userFollowRepository.findByFollowerId(userId);
        List<Long> followingUserIds = followingRelations.stream().map(UserFollow::getFollowingId).toList();
        if (followingUserIds.isEmpty()) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = parseCategory(category);
            postPage = postRepository.findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc(
                    followingUserIds, postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                    followingUserIds, PostStatus.active, pageable);
        }
        // Phase Feedback3 P2.5：关注流所有帖子作者均在关注集合内，isFollowed 恒 true
        List<PostSummaryView> items = toPostSummaryViews(postPage.getContent(), "",
                Set.copyOf(followingUserIds));
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    /**
     * 批量加载帖子作者校区 Map（userId → campusName）。
     *
     * @param posts 帖子列表
     * @return 作者校区映射（无资料作者不在 Map 中）
     */
    private Map<Long, String> loadAuthorCampusMap(List<Post> posts) {
        List<Long> authorIds = posts.stream().map(Post::getAuthorId).distinct().toList();
        if (authorIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userCampusProfileRepository.findByUserIdIn(authorIds).stream()
                .collect(Collectors.toMap(UserCampusProfile::getUserId,
                        UserCampusProfile::getCampusName, (a, b) -> a));
    }

    // ---- 相似作者推荐 ----

    @Transactional(readOnly = true)
    public SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId) {
        if (postId == null || userId == null) {
            throw new IllegalArgumentException("postId and userId are required");
        }
        Post post = findPostOrThrow(postId);
        Long postAuthorId = post.getAuthorId();

        UserCampusProfile authorCampusProfile = userCampusProfileRepository.findByUserId(postAuthorId).orElse(null);
        String authorCampus = authorCampusProfile != null ? authorCampusProfile.getCampusName() : "";
        List<String> authorInterests = userBasicProfileRepository.findByUserId(postAuthorId)
                .map(UserBasicProfile::getInterestTags).map(this::parseJsonToList).orElse(List.of());

        Set<Long> followedUserIds = userFollowRepository.findByFollowerId(userId).stream()
                .map(UserFollow::getFollowingId).collect(Collectors.toSet());

        // FIN-00024 修复：原实现仅取前 50 个用户作为相似作者候选池，用户量增长后
        // 高分候选可能被截断在池外。候选池扩大为 200（与推荐算法 candidate-page-size 对齐），
        // 仍通过 SQL 分页限制内存占用。
        List<User> pagedUsers = userRepository.findAll(PageRequest.of(0, SIMILAR_AUTHOR_CANDIDATE_LIMIT)).getContent();
        List<Long> candidateIds = pagedUsers.stream().map(User::getId)
                .filter(id -> !id.equals(postAuthorId) && !id.equals(userId) && !followedUserIds.contains(id))
                .toList();
        Map<Long, UserCampusProfile> campusProfileMap = userCampusProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p));
        Map<Long, UserBasicProfile> basicProfileMap = userBasicProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p));
        Map<Long, User> userMap = pagedUsers.stream().collect(Collectors.toMap(User::getId, u -> u));

        record CandidateScore(Long candidateId, int score) {}
        List<CandidateScore> candidates = new ArrayList<>();
        for (Long candidateId : candidateIds) {
            int score = 0;
            UserCampusProfile cp = campusProfileMap.get(candidateId);
            if (cp != null && !authorCampus.isEmpty() && authorCampus.equals(cp.getCampusName())) score += 1;
            UserBasicProfile bp = basicProfileMap.get(candidateId);
            if (bp != null) {
                List<String> candidateInterests = parseJsonToList(bp.getInterestTags());
                long commonCount = candidateInterests.stream().filter(authorInterests::contains).count();
                score += (int) commonCount;
            }
            if (score > 0) candidates.add(new CandidateScore(candidateId, score));
        }

        List<SimilarAuthorView> similarAuthors = candidates.stream()
                .sorted((a, b) -> Integer.compare(b.score(), a.score()))
                .limit(2)
                .map(cs -> viewMapper.buildSimilarAuthorView(cs.candidateId(), userMap.get(cs.candidateId()),
                        campusProfileMap.get(cs.candidateId()), basicProfileMap.get(cs.candidateId()),
                        authorCampus, authorInterests, followedUserIds.contains(cs.candidateId())))
                .toList();
        return new SimilarAuthorsResponse(similarAuthors);
    }

    // ---- 视图转换与辅助方法（委托至 VillageViewMapper，保留包级可见以兼容现有调用方） ----

    /**
     * 批量转换帖子摘要视图（FIN-00019 N+1 修复）。
     *
     * <p>一次性预加载当前页所有作者的 User 与 UserCampusProfile，
     * 再批量转换，避免 {@link VillageViewMapper#toPostSummaryView(Post, String)}
     * 每帖 2 次查询的 N+1 问题。</p>
     *
     * @param posts        帖子列表
     * @param myCampusName 当前用户校区（可为空字符串）
     * @return 帖子摘要视图列表
     */
    List<PostSummaryView> toPostSummaryViews(List<Post> posts, String myCampusName) {
        return toPostSummaryViews(posts, myCampusName, Collections.emptySet());
    }

    /**
     * 批量转换帖子摘要视图（带关注上下文，Phase Feedback3 P2.5）。
     *
     * <p>2026-08-09 扩展：页内 postIds 一次批量预加载最新评论预览（每帖最新 2 条根评论
     * + 楼中楼回复数 + 评论作者）与关联活动摘要，传入 viewMapper 组装，防 N+1。</p>
     *
     * @param posts           帖子列表
     * @param myCampusName    当前用户校区（可为空字符串）
     * @param followedUserIds 当前用户关注的作者 ID 集合（可为空，isFollowed 置 false）
     */
    List<PostSummaryView> toPostSummaryViews(List<Post> posts, String myCampusName,
                                             Set<Long> followedUserIds) {
        if (posts == null || posts.isEmpty()) {
            return List.of();
        }
        List<Long> authorIds = posts.stream().map(Post::getAuthorId).distinct().toList();
        Map<Long, User> authorMap = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, UserCampusProfile> campusMap = userCampusProfileRepository.findByUserIdIn(authorIds).stream()
                .collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p));
        List<Long> postIds = posts.stream().map(Post::getId).filter(java.util.Objects::nonNull).toList();
        return viewMapper.toPostSummaryViews(posts, myCampusName, authorMap, campusMap,
                followedUserIds, loadActivityMap(posts), loadRecentCommentsByPost(postIds));
    }

    /**
     * 2026-08-09 列表评论预览：批量预加载每帖最新 2 条根评论预览（防 N+1）。
     *
     * <p>一次查询整页帖子的根评论（按创建时间倒序），内存按 postId 分组取前 2 条；
     * 楼中楼回复数按根评论 ID 批量统计；评论作者批量预加载。无评论的帖子不在 Map 中。</p>
     *
     * @param postIds 帖子 ID 集合
     * @return postId -> 最新根评论预览列表（每帖最多 2 条）
     */
    private Map<Long, List<CommentPreviewView>> loadRecentCommentsByPost(Collection<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Comment> roots = commentRepository.findByPostIdInAndParentIdIsNull(postIds);
        if (roots.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> rootIds = roots.stream().map(Comment::getId).toList();
        Map<Long, Integer> replyCountMap = commentRepository.countByParentIdIn(rootIds).stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> ((Number) r[1]).intValue()));
        List<Long> authorIds = roots.stream().map(Comment::getAuthorId)
                .filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, User> authorMap = authorIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        // 根评论按 createdAt 降序排好后按 postId 分组，每帖取前 2 条（最新评论预览）
        return roots.stream()
                .sorted(Comparator.comparing(Comment::getCreatedAt).reversed())
                .collect(Collectors.groupingBy(c -> c.getPost().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> list.stream().limit(2)
                                        .map(c -> {
                                            User author = authorMap.get(c.getAuthorId());
                                            String nickname = author != null && author.getNickname() != null
                                                    ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
                                            return new CommentPreviewView(c.getId(),
                                                    new CommentAuthorView(c.getAuthorId(), nickname,
                                                            author != null ? author.getAvatarUrl() : null),
                                                    c.getContent(),
                                                    c.getCreatedAt().toString(),
                                                    replyCountMap.getOrDefault(c.getId(), 0));
                                        })
                                        .toList())));
    }

    /**
     * 2026-08-09 帖子关联活动：批量预加载活动摘要 Map（防 N+1）。
     *
     * @param posts 帖子列表（直接取 activityId，不额外查库）
     * @return activityId -> ActivitySummaryView（无关联或活动不存在的不在 Map 中）
     */
    private Map<Long, ActivitySummaryView> loadActivityMap(List<Post> posts) {
        if (posts == null || posts.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> activityIds = posts.stream()
                .map(Post::getActivityId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        return loadActivityMapByIds(activityIds);
    }

    /**
     * 2026-08-09 帖子关联活动：按活动 ID 集合批量加载活动摘要 Map。
     */
    private Map<Long, ActivitySummaryView> loadActivityMapByIds(List<Long> activityIds) {
        if (activityIds == null || activityIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return activityRepository.findAllById(activityIds).stream()
                .collect(Collectors.toMap(Activity::getId, viewMapper::toActivitySummaryView));
    }

    /** 加载当前用户关注的作者 ID 集合（无用户上下文返回空集合）。 */
    private Set<Long> loadFollowedUserIds(Long userId) {
        if (userId == null) {
            return Collections.emptySet();
        }
        return userFollowRepository.findByFollowerId(userId).stream()
                .map(UserFollow::getFollowingId)
                .collect(Collectors.toSet());
    }

    Post findPostOrThrow(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found: " + postId));
    }

    /**
     * 当前用户 ID（匿名时返回 null）。
     * 供评论区 isLiked 等场景使用（匿名不抛异常，仅置 null）。
     */
    private static Long currentUserIdOrNull() {
        try {
            return SecurityUtils.getCurrentUserId();
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized ignored) {
            return null;
        }
    }

    boolean isSameCampus(Long authorId, String myCampusName) {
        return viewMapper.isSameCampus(authorId, myCampusName);
    }

    PostSummaryView toPostSummaryView(Post post) {
        return viewMapper.toPostSummaryView(post);
    }

    PostSummaryView toPostSummaryView(Post post, String myCampusName) {
        return viewMapper.toPostSummaryView(post, myCampusName);
    }

    PostDetailView toPostDetailView(Post post, Long currentUserId) {
        return viewMapper.toPostDetailView(post, currentUserId);
    }

    PostDetailView toPostDetailView(Post post) {
        return viewMapper.toPostDetailView(post);
    }

    CommentItemView toCommentItemView(Comment comment) {
        return viewMapper.toCommentItemView(comment);
    }

    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap) {
        return viewMapper.toCommentItemView(comment, authorMap);
    }

    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap,
                                      String replyTo, java.util.List<CommentItemView> replies) {
        return viewMapper.toCommentItemView(comment, authorMap, replyTo, replies);
    }

    /**
     * 批量预加载版评论项视图（2026-08-08 评论区点赞数真实化，委托 viewMapper）。
     */
    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap,
                                      String replyTo, java.util.List<CommentItemView> replies,
                                      Long currentUserId, Map<Long, Integer> likeCountMap,
                                      Set<Long> likedCommentIds) {
        return viewMapper.toCommentItemView(comment, authorMap, replyTo, replies,
                currentUserId, likeCountMap, likedCommentIds);
    }

    PostAuthorView getPostAuthorView(Long authorId) {
        return viewMapper.getPostAuthorView(authorId);
    }

    List<String> parseJsonToList(String json) {
        return viewMapper.parseJsonToList(json);
    }

    String toJsonString(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    static String truncate(String text, int maxLen) {
        return VillageViewMapper.truncate(text, maxLen);
    }
}
