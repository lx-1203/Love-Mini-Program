package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * RealVillageService 单元测试（Task 4.2.2 验证）。
 *
 * <p>验证点：</p>
 * <ul>
 *   <li>RealVillageService 的 public 方法正确委托给 3 个组件</li>
 *   <li>createPost 应委托 VillagePostService.createPost</li>
 *   <li>likePost / commentPost / sharePost 应委托 VillageInteractionService</li>
 *   <li>getPosts / getCategories / getCampusFeed / getSimilarAuthors 应委托 VillageQueryService</li>
 *   <li>createPost(CreatePostRequest) 重载应解包并委托 VillagePostService</li>
 * </ul>
 */
class RealVillageServiceTest {

    @Mock private VillageQueryService queryService;
    @Mock private VillagePostService postService;
    @Mock private VillageInteractionService interactionService;

    private RealVillageService realService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        realService = new RealVillageService(queryService, postService, interactionService);
    }

    /**
     * 场景：createPost(Long, content, images, tags, category) 应委托 VillagePostService.createPost。
     */
    @Test
    void createPost_fullArgsVersion_delegatesToPostService() {
        Long userId = 100L;
        PostDetailView expected = buildPostDetailView(1L, userId);
        when(postService.createPost(userId, "content", List.of("img"), List.of("tag"), "all"))
                .thenReturn(expected);

        PostDetailView result = realService.createPost(userId, "content", List.of("img"), List.of("tag"), "all");

        assertSame(expected, result);
        verify(postService, times(1)).createPost(userId, "content", List.of("img"), List.of("tag"), "all");
    }

    /**
     * 场景：createPost(CreatePostRequest) 应解包并委托 VillagePostService。
     */
    @Test
    void createPost_requestVersion_unwrapsAndDelegates() {
        Long userId = 100L;
        // CreatePostRequest(title, content, category, tags, images)
        CreatePostRequest request = new CreatePostRequest(
                "标题", "hello", "all", List.of("tag"), List.of("img"));
        PostDetailView expected = buildPostDetailView(1L, userId);
        when(postService.createPost(userId, "hello", List.of("img"), List.of("tag"), "all"))
                .thenReturn(expected);

        PostDetailView result = realService.createPost(userId, request);

        assertSame(expected, result);
        verify(postService, times(1)).createPost(userId, "hello", List.of("img"), List.of("tag"), "all");
    }

    /**
     * 场景：likePost(userId, postId) 应委托 VillageInteractionService.likePost。
     */
    @Test
    void likePost_withUserId_delegatesToInteractionService() {
        PostLikeResponse expected = new PostLikeResponse(true, true, 5);
        when(interactionService.likePost(100L, 1L)).thenReturn(expected);

        PostLikeResponse result = realService.likePost(100L, 1L);

        assertSame(expected, result);
        verify(interactionService, times(1)).likePost(100L, 1L);
    }

    /**
     * 场景：commentPost 应委托 VillageInteractionService.commentPost。
     */
    @Test
    void commentPost_delegatesToInteractionService() {
        CommentItemView expected = buildCommentItemView(10L, 1L, 100L);
        when(interactionService.commentPost(100L, 1L, "评论内容")).thenReturn(expected);

        CommentItemView result = realService.commentPost(100L, 1L, "评论内容");

        assertSame(expected, result);
        verify(interactionService, times(1)).commentPost(100L, 1L, "评论内容");
    }

    /**
     * 场景：createComment(userId, postId, CreateCommentRequest) 应解包并委托 VillageInteractionService。
     */
    @Test
    void createComment_requestVersion_unwrapsAndDelegates() {
        // CreateCommentRequest(content, parentId)
        CreateCommentRequest request = new CreateCommentRequest("评论内容", null);
        CommentItemView expected = buildCommentItemView(10L, 1L, 100L);
        // P1-02 楼中楼：业务透传 4 参（content + parentId），测试 mock 需同步新签名
        when(interactionService.commentPost(100L, 1L, "评论内容", null)).thenReturn(expected);

        CommentItemView result = realService.createComment(100L, 1L, request);

        assertSame(expected, result);
        verify(interactionService, times(1)).commentPost(100L, 1L, "评论内容", null);
    }

    /**
     * 场景：sharePost(userId, postId, comment) 应委托 VillageInteractionService.sharePost。
     */
    @Test
    void sharePost_directVersion_delegatesToInteractionService() {
        ShareView expected = new ShareView(20L, 1L, 8);
        when(interactionService.sharePost(100L, 1L, "评论")).thenReturn(expected);

        ShareView result = realService.sharePost(100L, 1L, "评论");

        assertSame(expected, result);
        verify(interactionService, times(1)).sharePost(100L, 1L, "评论");
    }

    /**
     * 场景：sharePost(userId, postId, SharePostRequest) 应解包并委托 VillageInteractionService。
     */
    @Test
    void sharePost_requestVersion_unwrapsAndDelegates() {
        SharePostRequest request = new SharePostRequest("评论");
        ShareView expected = new ShareView(20L, 1L, 8);
        when(interactionService.sharePost(100L, 1L, "评论")).thenReturn(expected);

        ShareView result = realService.sharePost(100L, 1L, request);

        assertSame(expected, result);
        verify(interactionService, times(1)).sharePost(100L, 1L, "评论");
    }

    /**
     * 场景：getPosts(tab, category, userId, pageable) 应委托 VillageQueryService.getPosts。
     */
    @Test
    void getPosts_withPageable_delegatesToQueryService() {
        Pageable pageable = PageRequest.of(0, 10);
        PostListResponse expected = new PostListResponse(List.of(), 0, 0, 10);
        when(queryService.getPosts("hot", "all", 100L, pageable)).thenReturn(expected);

        PostListResponse result = realService.getPosts("hot", "all", 100L, pageable);

        assertSame(expected, result);
        verify(queryService, times(1)).getPosts("hot", "all", 100L, pageable);
    }

    /**
     * 场景：getCategories 应委托 VillageQueryService.getCategories。
     */
    @Test
    void getCategories_delegatesToQueryService() {
        List<PostCategoryView> expected = List.of(
                new PostCategoryView(1L, "全部", "all", null, 0));
        when(queryService.getCategories()).thenReturn(expected);

        List<PostCategoryView> result = realService.getCategories();

        assertSame(expected, result);
        verify(queryService, times(1)).getCategories();
    }

    /**
     * 场景：getCampusFeed 应委托 VillageQueryService.getCampusFeed。
     */
    @Test
    void getCampusFeed_delegatesToQueryService() {
        CampusFeedView expected = new CampusFeedView(
                "北大", List.of(), List.of(), List.of());
        when(queryService.getCampusFeed(100L, 0, 10)).thenReturn(expected);

        CampusFeedView result = realService.getCampusFeed(100L, 0, 10);

        assertSame(expected, result);
        verify(queryService, times(1)).getCampusFeed(100L, 0, 10);
    }

    /**
     * 场景：getSimilarAuthors 应委托 VillageQueryService.getSimilarAuthors。
     */
    @Test
    void getSimilarAuthors_delegatesToQueryService() {
        SimilarAuthorsResponse expected = new SimilarAuthorsResponse(List.of());
        when(queryService.getSimilarAuthors(1L, 100L)).thenReturn(expected);

        SimilarAuthorsResponse result = realService.getSimilarAuthors(1L, 100L);

        assertSame(expected, result);
        verify(queryService, times(1)).getSimilarAuthors(1L, 100L);
    }

    /**
     * 场景：getPosts 的 5 参数版本（无 userId）应委托 queryService.getPosts，userId=null。
     */
    @Test
    void getPosts_fiveArgsVersion_passesNullUserId() {
        PostListResponse expected = new PostListResponse(List.of(), 0, 0, 10);
        when(queryService.getPosts("all", null, "new", 0, 10, null)).thenReturn(expected);

        PostListResponse result = realService.getPosts("all", null, "new", 0, 10);

        assertSame(expected, result);
        verify(queryService, times(1)).getPosts("all", null, "new", 0, 10, null);
    }

    /**
     * 场景：getPosts 的 6 参数版本（带 userId）应委托 queryService.getPosts。
     */
    @Test
    void getPosts_sixArgsVersion_delegatesToQueryService() {
        PostListResponse expected = new PostListResponse(List.of(), 0, 0, 10);
        when(queryService.getPosts("all", null, "new", 0, 10, 100L)).thenReturn(expected);

        PostListResponse result = realService.getPosts("all", null, "new", 0, 10, 100L);

        assertSame(expected, result);
        verify(queryService, times(1)).getPosts("all", null, "new", 0, 10, 100L);
        verify(postService, times(0)).createPost(anyLong(), any(), any(), any(), any());
    }

    // ---- 工具方法 ----

    /** 构造测试用 PostDetailView（15 个字段全填，便于复用）。 */
    private PostDetailView buildPostDetailView(Long postId, Long userId) {
        return new PostDetailView(
                postId, "标题", "内容",
                new PostAuthorView(userId, "作者", "/avatar.jpg", "北大"),
                "all", List.of("tag"), List.of("img"),
                0, 0, 0,
                "2026-07-27T10:00:00", "2026-07-27T10:00:00",
                false, true, false);
    }

    /** 构造测试用 CommentItemView。 */
    private CommentItemView buildCommentItemView(Long commentId, Long postId, Long authorId) {
        return new CommentItemView(
                commentId, postId, null,
                new CommentAuthorView(authorId, "昵称", null),
                "评论内容", 0, "2026-07-27T10:00:00",
                true, null);
    }
}
