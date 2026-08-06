package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PostLike;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostShareRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * VillageInteractionService 单元测试（Task 4.2.2）。
 */
class VillageInteractionServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private PostShareRepository postShareRepository;
    @Mock private InteractionEventService interactionEventService;
    @Mock private VillageQueryService queryService;

    private VillageInteractionService interactionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        interactionService = new VillageInteractionService(
                postRepository, commentRepository, postLikeRepository,
                postShareRepository, interactionEventService, queryService);
    }

    /**
     * 场景：未点赞的用户 likePost 应创建 PostLike、likesCount+1、触发互动事件。
     */
    @Test
    void likePost_notLikedYet_createsLikeAndIncrementsCount() {
        Long userId = 1L;
        Long postId = 100L;
        Post post = createPost(postId, 5);

        when(queryService.findPostOrThrow(postId)).thenReturn(post);
        when(postLikeRepository.existsByUserIdAndPostId(userId, postId)).thenReturn(false);

        var result = interactionService.likePost(userId, postId);

        assertTrue(result.liked());
        assertEquals(6, post.getLikesCount(), "likesCount 应 +1");
        verify(postLikeRepository).save(any(PostLike.class));
        verify(interactionEventService).recordEvent(
                eq(post.getAuthorId()), eq(userId), eq("POST_LIKED"), eq(postId), eq("POST"), anyString());
    }

    /**
     * 场景：已点赞的用户再次 likePost 应取消点赞、likesCount-1。
     */
    @Test
    void likePost_alreadyLiked_removesLikeAndDecrementsCount() {
        Long userId = 1L;
        Long postId = 100L;
        Post post = createPost(postId, 5);

        when(queryService.findPostOrThrow(postId)).thenReturn(post);
        when(postLikeRepository.existsByUserIdAndPostId(userId, postId)).thenReturn(true);

        var result = interactionService.likePost(userId, postId);

        assertFalse(result.liked());
        assertEquals(4, post.getLikesCount(), "likesCount 应 -1");
        verify(postLikeRepository).deleteByUserIdAndPostId(userId, postId);
        verify(interactionEventService, never()).recordEvent(anyLong(), anyLong(),
                anyString(), anyLong(), anyString(), anyString());
    }

    /**
     * 场景：Spring 注入路径（entityManager 非 null）取消点赞时，
     * 应使用 JPQL bulk DELETE 删除 PostLike，而非派生删除
     * deleteByUserIdAndPostId（派生删除的 pending-removal 实体会被
     * 后续 entityManager.clear() 清出上下文，导致 DELETE 不落库、
     * post_likes 行残留，点赞 toggle 卡死）。
     */
    @Test
    void likePost_alreadyLiked_usesBulkDeleteWhenEntityManagerPresent() {
        Long userId = 1L;
        Long postId = 100L;
        Post post = createPost(postId, 5);

        EntityManager em = mock(EntityManager.class);
        Query query = mock(Query.class);
        when(em.createQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.executeUpdate()).thenReturn(1);

        VillageInteractionService serviceWithEm = new VillageInteractionService(
                postRepository, commentRepository, postLikeRepository,
                postShareRepository, interactionEventService, queryService, em);

        when(queryService.findPostOrThrow(postId)).thenReturn(post);
        when(postLikeRepository.existsByUserIdAndPostId(userId, postId)).thenReturn(true);

        var result = serviceWithEm.likePost(userId, postId);

        assertFalse(result.liked());
        assertEquals(4, post.getLikesCount(), "likesCount 应 -1");
        // 派生删除不得再被调用，删除必须走 JPQL bulk DELETE
        verify(postLikeRepository, never()).deleteByUserIdAndPostId(anyLong(), anyLong());
        verify(em).createQuery(contains("DELETE FROM PostLike"));
        verify(em).clear();
        verify(interactionEventService, never()).recordEvent(anyLong(), anyLong(),
                anyString(), anyLong(), anyString(), anyString());
    }

    /**
     * 场景：commentPost 应创建 Comment 并 commentsCount+1。
     */
    @Test
    void commentPost_createsCommentAndIncrementsCount() {
        Long userId = 1L;
        Long postId = 100L;
        Post post = createPost(postId, 3);
        when(queryService.findPostOrThrow(postId)).thenReturn(post);
        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        when(commentRepository.saveAndFlush(captor.capture())).thenAnswer(inv -> inv.getArgument(0));
        when(queryService.toCommentItemView(any(Comment.class)))
                .thenAnswer(inv -> new CommentItemView(
                        null, postId, userId,
                        new CommentAuthorView(userId, "昵称", null),
                        "评论内容", 0,
                        java.time.LocalDateTime.now().toString(),
                        false, null));

        interactionService.commentPost(userId, postId, "评论内容");

        Comment saved = captor.getValue();
        assertEquals(userId, saved.getAuthorId());
        assertEquals(postId, saved.getPost().getId());
        assertEquals("评论内容", saved.getContent());
        assertEquals(1, post.getCommentsCount(), "commentsCount 应 +1（初始 0 + 1）");
    }

    /**
     * 场景：sharePost 应创建 PostShare 并 shareCount+1。
     */
    @Test
    void sharePost_createsShareAndIncrementsCount() {
        Long userId = 1L;
        Long postId = 100L;
        Post post = createPost(postId, 2);
        when(queryService.findPostOrThrow(postId)).thenReturn(post);
        ArgumentCaptor<com.campuslove.api.entity.PostShare> captor =
                ArgumentCaptor.forClass(com.campuslove.api.entity.PostShare.class);
        when(postShareRepository.saveAndFlush(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        var result = interactionService.sharePost(userId, postId, "分享评论");

        assertEquals(1, post.getShareCount(), "shareCount 应 +1（初始 0 + 1）");
    }

    private Post createPost(Long id, int likesCount) {
        Post post = new Post();
        post.setId(id);
        post.setAuthorId(2L); // 不同于 userId 触发通知
        post.setLikesCount(likesCount);
        post.setCommentsCount(0);
        post.setShareCount(0);
        return post;
    }
}
