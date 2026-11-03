package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.entity.Post;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostTagRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * P1-1（2026-11-03）：作者编辑自己帖子的判定测试。
 *
 * <p>判点（与 {@link VillagePostService#updatePost} 的方法注释逐条对应）：</p>
 * <ul>
 *   <li>读 → 404：帖子不存在 / 已软删（编辑墓碑帖按不存在处理）</li>
 *   <li>作者校验先于任何写：非作者 403 且 save 零调用</li>
 *   <li>编辑成功：editCount +1、editedAt 落值、auditStatus 重置 pending、
 *       上一轮审核元数据清空</li>
 * </ul>
 */
class VillagePostServiceUpdatePostTest {

    private static final Long AUTHOR = 7L;
    private static final Long OTHER = 8L;
    private static final Long POST_ID = 100L;

    private PostRepository postRepository;
    private PostTagRepository postTagRepository;
    private VillagePostService service;

    @BeforeEach
    void setUp() {
        postRepository = mock(PostRepository.class);
        postTagRepository = mock(PostTagRepository.class);
        VillageQueryService queryService = mock(VillageQueryService.class);
        when(queryService.toJsonString(any())).thenReturn("[]");
        when(queryService.toPostDetailView(any(Post.class), eq(AUTHOR)))
                .thenAnswer(inv -> new PostDetailView(
                        POST_ID, null, "内容", null, "all", List.of(), List.of(),
                        0, 0, 0, null, null, false, true, false,
                        0, false, 0, null, null,
                        inv.getArgument(0, Post.class).getEditCount(),
                        null));
        service = new VillagePostService(postRepository,
                new com.campuslove.api.config.SensitiveWordFilter(),
                queryService,
                mock(ActivityRepository.class), postTagRepository,
                mock(CircleMembershipRepository.class),
                mock(CampusCertificationRepository.class),
                noOpTxManager());
    }

    /** 与 VillagePostService#noOpTxManager 同款：单测不开真实事务（口径见其注释）。 */
    private static org.springframework.transaction.PlatformTransactionManager noOpTxManager() {
        return new org.springframework.transaction.PlatformTransactionManager() {
            @Override
            public org.springframework.transaction.TransactionStatus getTransaction(
                    org.springframework.transaction.TransactionDefinition definition) {
                return new org.springframework.transaction.support.SimpleTransactionStatus();
            }

            @Override
            public void commit(org.springframework.transaction.TransactionStatus status) {
            }

            @Override
            public void rollback(org.springframework.transaction.TransactionStatus status) {
            }
        };
    }

    private Post activePostOf(Long author) {
        Post post = new Post();
        post.setId(POST_ID);
        post.setAuthorId(author);
        post.setTitle("旧标题五个字");
        post.setContent("旧内容");
        post.setStatus(Post.PostStatus.active);
        post.setAuditStatus(Post.AuditStatus.approved);
        post.setAuditorId(999L);
        return post;
    }

    private String title() {
        return "新标题五个字";
    }

    @Test
    @DisplayName("编辑成功：editCount+1、editedAt 落值、审核重置 pending、审核元数据清空")
    void update_byAuthor_resetsAuditAndBumpsEditTrail() {
        Post post = activePostOf(AUTHOR);
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(post));
        when(postRepository.saveAndFlush(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        PostDetailView view = service.updatePost(AUTHOR, POST_ID, title(), "新内容", List.of(), List.of("tag"));

        assertEquals(Post.AuditStatus.pending, post.getAuditStatus(), "编辑后必须重回待审（不允许编辑绕审）");
        assertEquals(1, post.getEditCount(), "编辑留痕：editCount +1");
        assertNotNull(post.getEditedAt(), "编辑留痕：editedAt 落值");
        assertEquals(null, post.getAuditorId(), "上一轮审核元数据清空（本轮审核重新写）");
        assertEquals(1, view.editCount(), "视图回传编辑留痕");
        verify(postTagRepository).deleteByPostId(POST_ID);
    }

    @Test
    @DisplayName("非作者编辑 → 403，且 save 零调用（数据未改动）")
    void update_byNonAuthor_throws403WithoutWrite() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(activePostOf(AUTHOR)));

        assertThrows(OperationForbiddenException.class,
                () -> service.updatePost(OTHER, POST_ID, title(), "内容", List.of(), List.of()));
        verify(postRepository, never()).saveAndFlush(any());
        verify(postTagRepository, never()).deleteByPostId(anyLong());
    }

    @Test
    @DisplayName("帖子不存在 / 已软删 → 404（墓碑帖不可编辑）")
    void update_missingOrDeletedPost_throws404() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.updatePost(AUTHOR, POST_ID, title(), "内容", List.of(), List.of()));

        Post deleted = activePostOf(AUTHOR);
        deleted.setStatus(Post.PostStatus.deleted);
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(deleted));
        assertThrows(ResourceNotFoundException.class,
                () -> service.updatePost(AUTHOR, POST_ID, title(), "内容", List.of(), List.of()));
        verify(postRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("标题长度不合法 → 400（与发帖同一套阈值常量）")
    void update_illegalTitle_throws400() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(activePostOf(AUTHOR)));
        assertThrows(IllegalArgumentException.class,
                () -> service.updatePost(AUTHOR, POST_ID, "短", "内容", List.of(), List.of()));
        verify(postRepository, never()).saveAndFlush(any());
    }
}
