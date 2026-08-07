package com.campuslove.api.village;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PostLike;
import com.campuslove.api.entity.PostShare;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostShareRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 村口帖子互动组件（Task 4.2.2 拆分）。
 *
 * <p>职责：处理帖子的点赞、评论、转发等互动行为，包含计数维护、互动事件通知等。
 * 不负责帖子发布（由 {@link VillagePostService} 负责）和查询（由 {@link VillageQueryService} 负责）。</p>
 *
 * <p>提取自原 RealVillageService.likePost / commentPost / sharePost 方法。
 * 三个方法均通过 @CacheEvict 主动失效 VILLAGE_HOT_POSTS 缓存。</p>
 */
@Profile("real")
@Component
public class VillageInteractionService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostShareRepository postShareRepository;
    /**
     * M-14：评论点赞 Repository（评论点赞记录持久化 + 计数）。
     */
    private final CommentLikeRepository commentLikeRepository;
    private final InteractionEventService interactionEventService;
    private final VillageQueryService queryService;

    /**
     * JPA 实体管理器（FIN-00018 修复）。
     *
     * <p>用于执行数据库侧原子计数更新（单条 UPDATE 语句），
     * 替代原「读-改-写」非原子计数维护。为兼容既有单元测试
     * （直接 new 构造器），此字段可为 null：null 时回退到实体级
     * 读-改-写（与原行为一致，仅测试场景触发；Spring 注入路径恒非 null）。</p>
     */
    private final EntityManager entityManager;

    /**
     * 敏感词过滤器（M-14）：评论/楼中楼回复创建时过滤，与发帖（VillagePostService）口径一致。
     * 仅测试构造器注入为 null，此时跳过过滤（与旧行为一致）。
     */
    private final SensitiveWordFilter sensitiveWordFilter;

    @org.springframework.beans.factory.annotation.Autowired
    public VillageInteractionService(PostRepository postRepository,
                                     CommentRepository commentRepository,
                                     PostLikeRepository postLikeRepository,
                                     PostShareRepository postShareRepository,
                                     CommentLikeRepository commentLikeRepository,
                                     InteractionEventService interactionEventService,
                                     VillageQueryService queryService,
                                     EntityManager entityManager,
                                     SensitiveWordFilter sensitiveWordFilter) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postLikeRepository = postLikeRepository;
        this.postShareRepository = postShareRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.interactionEventService = interactionEventService;
        this.queryService = queryService;
        this.entityManager = entityManager;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    /**
     * 兼容旧测试的构造器（entityManager 为 null，走实体级读-改-写回退；
     * sensitiveWordFilter / commentLikeRepository 为 null，跳过敏感词过滤与评论点赞）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 EntityManager 的构造器。
     */
    @Deprecated
    public VillageInteractionService(PostRepository postRepository,
                                     CommentRepository commentRepository,
                                     PostLikeRepository postLikeRepository,
                                     PostShareRepository postShareRepository,
                                     InteractionEventService interactionEventService,
                                     VillageQueryService queryService) {
        this(postRepository, commentRepository, postLikeRepository, postShareRepository,
                null, interactionEventService, queryService, null, null);
    }

    /**
     * 切换帖子点赞状态。
     *
     * <p>已点赞 -> 取消点赞（删除 PostLike，likesCount-1）；
     * 未点赞 -> 新增点赞（创建 PostLike，likesCount+1，记录 POST_LIKED 互动事件）。</p>
     *
     * <p>FIN-00018 修复：likesCount 的增减改为数据库侧单条 UPDATE 原子执行
     * （JPQL bulk update），消除原「读-改-写」在并发点赞/取消下的丢失更新。
     * 最终计数通过重新查询实体获取，保证返回值与持久化状态一致。</p>
     *
     * <p>缺陷修复（走查）：取消点赞原使用派生删除
     * {@code deleteByUserIdAndPostId}（先 SELECT 再逐个 em.remove，实体进入
     * pending-removal 状态），随后 {@code entityManager.clear()} 会将 pending-removal
     * 实体一并清出持久化上下文，导致事务提交时 DELETE 语句不再发出 —— post_likes
     * 行永远残留在数据库（响应 liked=false 但行未删），再次点赞时 exists 命中
     * 旧行永远返回 liked=false，点赞 toggle 卡死。修复：Spring 注入路径（entityManager
     * 非 null）改用 JPQL bulk DELETE 直接落库，与 bulk UPDATE + clear 互不干扰；
     * 仅测试构造器（entityManager 为 null）保留派生删除回退。</p>
     *
     * @param userId 当前用户 ID
     * @param postId 帖子 ID
     * @return 点赞响应（success=true，liked 表示当前状态，likeCount 为最新计数）
     * @throws IllegalArgumentException 当 userId 为空时
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public PostLikeResponse likePost(Long userId, Long postId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        Post post = queryService.findPostOrThrow(postId);

        boolean alreadyLiked = postLikeRepository.existsByUserIdAndPostId(userId, postId);
        LocalDateTime now = LocalDateTime.now();
        if (alreadyLiked) {
            if (entityManager != null) {
                // 缺陷修复：bulk DELETE 替代派生删除，避免 pending-removal 实体
                // 被后续 entityManager.clear() 清出上下文导致 DELETE 不落库
                entityManager.createQuery(
                                "DELETE FROM PostLike pl WHERE pl.userId = :userId AND pl.postId = :postId")
                        .setParameter("userId", userId)
                        .setParameter("postId", postId)
                        .executeUpdate();
            } else {
                // 仅测试构造器回退：entityManager 为 null 时无 clear 干扰，派生删除安全
                postLikeRepository.deleteByUserIdAndPostId(userId, postId);
            }
            // 原子递减（下限 0）；entityManager 为 null（仅测试构造器）时回退实体读-改-写
            // infra R2-00015 修复：bulk UPDATE 后 clear 持久化上下文，否则 managed 实体
            // post 在事务提交 flush 时用本地旧值覆盖 bulk 原子结果（脏写回归）
            int newCount = Math.max(0, post.getLikesCount() - 1);
            if (entityManager != null) {
                entityManager.createQuery(
                                "UPDATE Post p SET p.likesCount = CASE WHEN p.likesCount > 0 THEN p.likesCount - 1 ELSE 0 END, "
                                        + "p.updatedAt = :now WHERE p.id = :postId")
                        .setParameter("now", now)
                        .setParameter("postId", postId)
                        .executeUpdate();
                entityManager.clear();
            }
            // bulk update 后同步本地视图值，仅用于本次响应（实体已 detached）
            post.setLikesCount(newCount);
            post.setUpdatedAt(now);
        } else {
            postLikeRepository.save(new PostLike(userId, postId));
            // 原子递增
            // infra R2-00015 修复：同上，bulk UPDATE 后 clear 防脏写
            if (entityManager != null) {
                entityManager.createQuery(
                                "UPDATE Post p SET p.likesCount = p.likesCount + 1, p.updatedAt = :now WHERE p.id = :postId")
                        .setParameter("now", now)
                        .setParameter("postId", postId)
                        .executeUpdate();
                entityManager.clear();
            }
            post.setLikesCount(post.getLikesCount() + 1);
            post.setUpdatedAt(now);
            if (!userId.equals(post.getAuthorId())) {
                interactionEventService.recordEvent(
                        post.getAuthorId(), userId, "POST_LIKED", postId, "POST",
                        "有人赞了你的帖子"
                );
            }
        }

        return new PostLikeResponse(true, !alreadyLiked, post.getLikesCount());
    }

    /**
     * 切换评论点赞状态（M-14，幂等）。
     *
     * <p>复用帖子点赞 {@link #likePost} 模式：已点赞 → 取消点赞（删除 CommentLike 记录）；
     * 未点赞 → 新增点赞（CommentLike 唯一约束兜底防重）。点赞数由 comment_likes
     * 实时统计（comments 表无冗余计数列），返回最新点赞数供前端刷新。</p>
     *
     * @param userId    当前用户 ID
     * @param commentId 评论 ID
     * @return 点赞响应（success=true，liked 表示当前状态，likeCount 为最新计数）
     * @throws IllegalArgumentException 当 userId 为空或评论不存在时
     */
    @Transactional
    public PostLikeResponse likeComment(Long userId, Long commentId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (commentId == null) {
            throw new IllegalArgumentException("commentId is required");
        }
        // 评论存在性校验（不存在抛 400）
        commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("评论不存在: " + commentId));

        boolean alreadyLiked = commentLikeRepository.existsByUserIdAndCommentId(userId, commentId);
        if (alreadyLiked) {
            // 取消点赞
            commentLikeRepository.deleteByUserIdAndCommentId(userId, commentId);
        } else {
            // 新增点赞（唯一约束兜底并发重复点赞）
            commentLikeRepository.save(new CommentLike(userId, commentId));
        }
        long likeCount = commentLikeRepository.countByCommentId(commentId);
        return new PostLikeResponse(true, !alreadyLiked, (int) likeCount);
    }

    /**
     * 评论帖子（根评论，兼容旧调用）。
     *
     * @see #commentPost(Long, Long, String, Long)
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public CommentItemView commentPost(Long userId, Long postId, String content) {
        return commentPost(userId, postId, content, null);
    }

    /**
     * 评论帖子（P1-02 / A-12 楼中楼：支持 parentId 楼中楼回复）。
     *
     * <p>创建 Comment 记录（parentId 非空时为楼中楼回复），递增 commentsCount，
     * 记录 POST_COMMENTED 互动事件。M-14：评论内容经 {@link SensitiveWordFilter} 过滤
     * （与发帖口径一致，场景标记 POST_COMMENT）。</p>
     *
     * @param userId   评论者用户 ID
     * @param postId   帖子 ID
     * @param content  评论内容
     * @param parentId 父评论 ID（楼中楼回复；null 为根评论）
     * @return 评论项视图
     * @throws IllegalArgumentException 当 userId/content 为空，或 parentId 对应父评论不存在
     *                                  /不属于该帖子时抛出
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public CommentItemView commentPost(Long userId, Long postId, String content, Long parentId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        Post post = queryService.findPostOrThrow(postId);

        // 楼中楼回复：校验父评论存在且属于同一帖子，防止跨帖回复
        if (parentId != null) {
            Comment parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("父评论不存在: " + parentId));
            if (parent.getPost() == null || !postId.equals(parent.getPost().getId())) {
                throw new IllegalArgumentException("父评论不属于该帖子，无法回复");
            }
        }

        // M-14：评论/回复内容敏感词过滤（与发帖 VillagePostService 一致）
        String filteredContent = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(content, userId, "POST_COMMENT")
                : content;

        LocalDateTime now = LocalDateTime.now();
        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthorId(userId);
        comment.setContent(filteredContent);
        comment.setParentId(parentId);
        comment.setCreatedAt(now);

        // 缺陷修复：saveAndFlush 立即回填 IDENTITY 主键，保证 toCommentItemView 中评论 id 非空
        // （实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        comment = commentRepository.saveAndFlush(comment);

        // FIN-00018 修复：commentsCount 改为数据库侧原子递增，避免并发评论丢失计数；
        // entityManager 为 null（仅测试构造器）时回退实体读-改-写
        if (entityManager != null) {
            entityManager.createQuery(
                            "UPDATE Post p SET p.commentsCount = p.commentsCount + 1, p.updatedAt = :now WHERE p.id = :postId")
                    .setParameter("now", now)
                    .setParameter("postId", postId)
                    .executeUpdate();
        }
        // bulk update 后同步实体，保证同事务后续读取一致
        post.setCommentsCount(post.getCommentsCount() + 1);
        post.setUpdatedAt(now);

        if (!userId.equals(post.getAuthorId())) {
            interactionEventService.recordEvent(
                    post.getAuthorId(), userId, "POST_COMMENTED", postId, "POST",
                    "有人评论了你的帖子"
            );
        }

        return queryService.toCommentItemView(comment);
    }

    /**
     * 转发帖子。
     *
     * <p>创建 PostShare 记录，递增 shareCount。</p>
     *
     * @param userId  转发者用户 ID
     * @param postId  帖子 ID
     * @param comment 转发评论（可为 null）
     * @return 转发视图
     * @throws IllegalArgumentException 当 userId 为空时
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public ShareView sharePost(Long userId, Long postId, String comment) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        Post post = queryService.findPostOrThrow(postId);

        LocalDateTime now = LocalDateTime.now();
        PostShare share = new PostShare();
        share.setPost(post);
        share.setUserId(userId);
        share.setComment(comment);
        share.setCreatedAt(now);

        // 缺陷修复：saveAndFlush 立即回填 IDENTITY 主键，保证 ShareView 中分享记录 id 非空
        // （实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        share = postShareRepository.saveAndFlush(share);

        // FIN-00018 修复：shareCount 改为数据库侧原子递增，避免并发转发丢失计数；
        // entityManager 为 null（仅测试构造器）时回退实体读-改-写
        if (entityManager != null) {
            entityManager.createQuery(
                            "UPDATE Post p SET p.shareCount = p.shareCount + 1, p.updatedAt = :now WHERE p.id = :postId")
                    .setParameter("now", now)
                    .setParameter("postId", postId)
                    .executeUpdate();
        }
        // bulk update 后同步实体，保证同事务后续读取一致
        post.setShareCount(post.getShareCount() + 1);
        post.setUpdatedAt(now);

        return new ShareView(share.getId(), postId, post.getShareCount());
    }
}
