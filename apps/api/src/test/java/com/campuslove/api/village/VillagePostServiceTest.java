package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.Post;
import com.campuslove.api.repository.PostRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * VillagePostService 单元测试（Task 4.2.2）。
 */
class VillagePostServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private SensitiveWordFilter sensitiveWordFilter;
    @Mock private VillageQueryService queryService;

    private VillagePostService postService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        postService = new VillagePostService(postRepository, sensitiveWordFilter, queryService);
    }

    /**
     * 场景：userId 为 null 应抛 IllegalArgumentException。
     */
    @Test
    void createPost_nullUserId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> postService.createPost(null, "测试标题五字", "content", List.of(), List.of(), "all"));
        assertEquals("userId is required", ex.getMessage());
    }

    /**
     * 场景：content 为空应抛 IllegalArgumentException。
     */
    @Test
    void createPost_blankContent_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> postService.createPost(1L, "测试标题五字", "  ", List.of(), List.of(), "all"));
        assertEquals("content is required", ex.getMessage());
    }

    /**
     * 场景：合法 createPost 应调用敏感词过滤、设置计数 0、持久化。
     */
    @Test
    void createPost_validInput_savesPostWithZeroCounts() {
        Long userId = 1L;
        String content = "hello";
        when(sensitiveWordFilter.filterWithLog(content, userId, "POST")).thenReturn("hello");
        when(queryService.toJsonString(any())).thenReturn("[]");
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        // saveAndFlush 会先保存再 flush，用 thenAnswer 回传实体并回填主键（缺陷修复验证：返回视图 id 非空）
        when(postRepository.saveAndFlush(captor.capture())).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(100L);
            return p;
        });
        when(queryService.toPostDetailView(any(Post.class), eq(userId)))
                .thenAnswer(inv -> {
                    Post p = inv.getArgument(0);
                    return new PostDetailView(
                            p.getId(), null, p.getContent(),
                            new PostAuthorView(p.getAuthorId(), "昵称", null, ""),
                            Post.PostCategory.all.name(),
                            List.of("tag"), List.of(),
                            p.getLikesCount(), p.getCommentsCount(), p.getShareCount(),
                            p.getCreatedAt() != null ? p.getCreatedAt().toString() : null,
                            null, false, true, false);
                });

        PostDetailView view = postService.createPost(userId, "测试标题五字", content, List.of(), List.of("tag"), "all");

        Post saved = captor.getValue();
        assertEquals(userId, saved.getAuthorId());
        assertEquals("hello", saved.getContent());
        assertEquals(0, saved.getLikesCount());
        assertEquals(0, saved.getCommentsCount());
        assertEquals(0, saved.getShareCount());
        assertEquals(Post.PostStatus.active, saved.getStatus());
        // 缺陷修复：saveAndFlush 后返回视图的 id 必须非空（原 save() 返回 null）
        assertEquals(100L, saved.getId());
        assertEquals(100L, view.id());
        verify(queryService).toPostDetailView(saved, userId);
    }

    /**
     * 场景：tags 为 null 时应传递给 filterTagList 但不抛异常。
     */
    @Test
    void createPost_nullTags_handledGracefully() {
        Long userId = 1L;
        when(sensitiveWordFilter.filterWithLog(anyString(), eq(userId), anyString())).thenReturn("content");
        when(queryService.toJsonString(any())).thenReturn("[]");
        when(postRepository.saveAndFlush(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.createPost(userId, "测试标题五字", "content", null, null, null);

        verify(postRepository).saveAndFlush(any(Post.class));
    }
}
