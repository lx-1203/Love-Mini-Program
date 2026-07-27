package com.campuslove.api.village;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PostLike;
import com.campuslove.api.entity.PostShare;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostShareRepository;
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
    private final InteractionEventService interactionEventService;
    private final VillageQueryService queryService;

    public VillageInteractionService(PostRepository postRepository,
                                     CommentRepository commentRepository,
                                     PostLikeRepository postLikeRepository,
                                     PostShareRepository postShareRepository,
                                     InteractionEventService interactionEventService,
                                     VillageQueryService queryService) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postLikeRepository = postLikeRepository;
        this.postShareRepository = postShareRepository;
        this.interactionEventService = interactionEventService;
        this.queryService = queryService;
    }

    /**
     * 切换帖子点赞状态。
     *
     * <p>已点赞 -> 取消点赞（删除 PostLike，likesCount-1）；
     * 未点赞 -> 新增点赞（创建 PostLike，likesCount+1，记录 POST_LIKED 互动事件）。</p>
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
        if (alreadyLiked) {
            postLikeRepository.deleteByUserIdAndPostId(userId, postId);
            post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
        } else {
            postLikeRepository.save(new PostLike(userId, postId));
            post.setLikesCount(post.getLikesCount() + 1);
            if (!userId.equals(post.getAuthorId())) {
                interactionEventService.recordEvent(
                        post.getAuthorId(), userId, "POST_LIKED", postId, "POST",
                        "有人赞了你的帖子"
                );
            }
        }

        post.setUpdatedAt(LocalDateTime.now());
        postRepository.save(post);

        return new PostLikeResponse(true, !alreadyLiked, post.getLikesCount());
    }

    /**
     * 评论帖子。
     *
     * <p>创建 Comment 记录，递增 commentsCount，记录 POST_COMMENTED 互动事件。</p>
     *
     * @param userId  评论者用户 ID
     * @param postId  帖子 ID
     * @param content 评论内容
     * @return 评论项视图
     * @throws IllegalArgumentException 当 userId 或 content 为空时
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public CommentItemView commentPost(Long userId, Long postId, String content) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        Post post = queryService.findPostOrThrow(postId);

        LocalDateTime now = LocalDateTime.now();
        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthorId(userId);
        comment.setContent(content);
        comment.setCreatedAt(now);

        commentRepository.save(comment);

        post.setCommentsCount(post.getCommentsCount() + 1);
        post.setUpdatedAt(now);
        postRepository.save(post);

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

        postShareRepository.save(share);

        post.setShareCount(post.getShareCount() + 1);
        post.setUpdatedAt(now);
        postRepository.save(post);

        return new ShareView(share.getId(), postId, post.getShareCount());
    }
}
