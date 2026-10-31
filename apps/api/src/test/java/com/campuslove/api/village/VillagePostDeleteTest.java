package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.Post;
import com.campuslove.api.repository.PostRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 作者自助删除帖子的服务层契约（2026-10-31 补齐用户内容生命周期）。
 *
 * <p>钉死四件事：</p>
 * <ol>
 *   <li><b>只能删自己的</b>：非作者 → 403（{@link OperationForbiddenException}），
 *       且一次写入都没有（{@code verify(..., never())}）——「先校验后写」不是注释里的
 *       承诺，而是可证伪的判点；</li>
 *   <li><b>不存在 → 404</b>（{@link ResourceNotFoundException}），文案复用
 *       {@link ErrorMessages#POST_NOT_FOUND_OR_DELETED}，不自造新文案；</li>
 *   <li><b>软删用既有状态词汇</b>：{@code status = deleted}（与
 *       {@code AdminPostController#deletePost} 同口径），不做硬删，内容行留给审计；</li>
 *   <li><b>重复删除幂等成功且零写入</b>：墓碑不再改 updatedAt，客户端重试不会看到报错。</li>
 * </ol>
 *
 * <p>构造沿用 {@link VillagePostServiceTest} 的三参测试构造器（无 Spring 代理、
 * 声明式事务不生效），本方法只依赖 {@code postRepository}，其余协作为 null 不影响。</p>
 */
class VillagePostDeleteTest {

    @Mock private PostRepository postRepository;
    @Mock private SensitiveWordFilter sensitiveWordFilter;
    @Mock private VillageQueryService queryService;

    private VillagePostService postService;

    private static final Long AUTHOR_ID = 7L;
    private static final Long OTHER_USER_ID = 8L;
    private static final long POST_ID = 100L;
    /** 早于任何合理系统时钟的固定时间戳：用来区分「原值」与「删除刷新后的值」。 */
    private static final LocalDateTime FIXED_TIME = LocalDateTime.of(2020, 1, 1, 0, 0);

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        postService = new VillagePostService(postRepository, sensitiveWordFilter, queryService);
    }

    /** 造一条可读的帖子（默认 active / 已审核通过，时间戳固定便于观测墓碑是否刷新）。 */
    private Post stubPost(Post.PostStatus status, Long authorId) {
        Post post = new Post();
        post.setId(POST_ID);
        post.setAuthorId(authorId);
        post.setTitle("可删的测试标题");
        post.setContent("正文");
        post.setStatus(status);
        post.setAuditStatus(Post.AuditStatus.approved);
        post.setCreatedAt(FIXED_TIME);
        post.setUpdatedAt(FIXED_TIME);
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(post));
        return post;
    }

    // ------------------------------------------------------------------
    // 1. 作者删除
    // ------------------------------------------------------------------

    @Test
    void deletePost_author_softDeletesWithExistingStatusVocabulary() {
        Post post = stubPost(Post.PostStatus.active, AUTHOR_ID);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.deletePost(AUTHOR_ID, POST_ID);

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        Post saved = captor.getValue();
        // 软删：只改状态词汇里的 deleted，状态机与后台删除一致
        assertEquals(Post.PostStatus.deleted, saved.getStatus());
        assertNotNull(saved.getUpdatedAt(), "删除应刷新 updatedAt（墓碑时间可审计）");
        assertTrue(saved.getUpdatedAt().isAfter(FIXED_TIME), "updatedAt 应被刷新为删除时刻");
        // 内容不得被就地抹掉或换状态：墓碑只靠 status 隐藏，审计与找回都靠它
        assertEquals("正文", saved.getContent());
        assertEquals(AUTHOR_ID, saved.getAuthorId());
    }

    @Test
    void deletePost_author_neverHardDeletes() {
        stubPost(Post.PostStatus.active, AUTHOR_ID);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.deletePost(AUTHOR_ID, POST_ID);

        // 硬删会连带打断评论/点赞外键，且抹掉审核留痕——这里必须一条都不发
        verify(postRepository, never()).delete(any(Post.class));
        verify(postRepository, never()).deleteById(any());
        verify(postRepository, never()).deleteAll();
        verify(postRepository, never()).deleteAllById(any(Iterable.class));
    }

    @Test
    void deletePost_hiddenPost_stillTombstonedByAuthor() {
        stubPost(Post.PostStatus.hidden, AUTHOR_ID);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.deletePost(AUTHOR_ID, POST_ID);

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        // 被下架（hidden）的帖子作者同样有权彻底删除，状态一律收敛到 deleted
        assertEquals(Post.PostStatus.deleted, captor.getValue().getStatus());
    }

    // ------------------------------------------------------------------
    // 2. 非作者：403 + 零写入（本轮最重要的判点）
    // ------------------------------------------------------------------

    @Test
    void deletePost_nonAuthor_forbiddenAndWritesNothing() {
        stubPost(Post.PostStatus.active, AUTHOR_ID);

        OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                () -> postService.deletePost(OTHER_USER_ID, POST_ID));
        assertEquals("无权删除该帖子", ex.getMessage());

        // 作者校验必须先于任何写：非作者不仅拿 403，而且数据一行没动
        verify(postRepository, never()).save(any(Post.class));
        verify(postRepository, never()).saveAndFlush(any(Post.class));
        verify(postRepository, never()).delete(any(Post.class));
        verify(postRepository, never()).deleteById(any());
    }

    @Test
    void deletePost_nonAuthor_doesNotMutateLoadedEntity() {
        Post post = stubPost(Post.PostStatus.active, AUTHOR_ID);

        assertThrows(OperationForbiddenException.class,
                () -> postService.deletePost(OTHER_USER_ID, POST_ID));

        // 拒绝路径不得先把实体改成 deleted 再抛错（托管实体一旦改动，
        // 外层事务的脏检查会把它 flush 下去，等于绕过 403 写了库）
        assertEquals(Post.PostStatus.active, post.getStatus());
    }

    @Test
    void deletePost_anonymousCaller_throwsIllegalArgumentWithoutReading() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> postService.deletePost(null, POST_ID));
        assertEquals("userId is required", ex.getMessage());
        verify(postRepository, never()).findById(any());
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void deletePost_nullPostId_throwsIllegalArgument() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> postService.deletePost(AUTHOR_ID, null));
        assertEquals(ErrorMessages.POST_ID_INVALID, ex.getMessage());
        verify(postRepository, never()).save(any(Post.class));
    }

    // ------------------------------------------------------------------
    // 3. 帖子不存在：404
    // ------------------------------------------------------------------

    @Test
    void deletePost_missingPost_returnsNotFoundAndWritesNothing() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> postService.deletePost(AUTHOR_ID, POST_ID));
        // 复用既有文案常量，不自造新错误文本
        assertEquals(ErrorMessages.POST_NOT_FOUND_OR_DELETED, ex.getMessage());

        verify(postRepository, never()).save(any(Post.class));
        verify(postRepository, never()).delete(any(Post.class));
    }

    // ------------------------------------------------------------------
    // 4. 重复删除：幂等成功 + 零写入
    // ------------------------------------------------------------------

    @Test
    void deletePost_alreadyDeleted_isIdempotentSuccessWithZeroWrites() {
        Post post = stubPost(Post.PostStatus.deleted, AUTHOR_ID);
        var beforeUpdatedAt = post.getUpdatedAt();

        // 不抛错：客户端重试删除必须拿到成功，否则 UI 只能报「删除失败」而帖子其实早没了
        postService.deletePost(AUTHOR_ID, POST_ID);

        verify(postRepository, never()).save(any(Post.class));
        verify(postRepository, never()).saveAndFlush(any(Post.class));
        // updatedAt 不漂移：墓碑时间戳保持第一次删除的值，审计链干净
        assertEquals(Post.PostStatus.deleted, post.getStatus());
        assertEquals(beforeUpdatedAt, post.getUpdatedAt());
    }

    @Test
    void deletePost_alreadyDeletedByNonAuthor_stillForbidden() {
        // 顺序判点：403 的判定先于幂等判定，非作者不会因为帖子已是墓碑而拿到 200
        stubPost(Post.PostStatus.deleted, AUTHOR_ID);

        assertThrows(OperationForbiddenException.class,
                () -> postService.deletePost(OTHER_USER_ID, POST_ID));
        verify(postRepository, never()).save(any(Post.class));
    }

    /**
     * 门面契约：{@link RealVillageService} 必须委托到本组件，而不是各自实现一套删除口径
     * （否则 real 与 mock 档位行为分叉，客户端拿到的「消失」不可信）。
     */
    @Test
    void realVillageService_delegatesDeleteToPostService() {
        VillageQueryService queries = mock(VillageQueryService.class);
        VillagePostService posts = mock(VillagePostService.class);
        RealVillageService facade =
                new RealVillageService(queries, posts, mock(VillageInteractionService.class));

        facade.deletePost(AUTHOR_ID, POST_ID);

        verify(posts).deletePost(AUTHOR_ID, POST_ID);
    }

    /**
     * 级联判点：作者删帖后，帖子自己的评论不得经 {@code GET /posts/{id}/comments}
     * 单独可读——查询服务按 postId 直查 comments 表、不看帖子状态，所以这道 404 闸
     * 必须落在 real 门面上（口径同详情 {@code getPost} 的 status != active → 404）。
     */
    @Test
    void realVillageService_commentsOfDeletedPost_returnsNotFoundWithoutListing() {
        VillageQueryService queries = mock(VillageQueryService.class);
        VillagePostService posts = mock(VillagePostService.class);
        RealVillageService facade =
                new RealVillageService(queries, posts, mock(VillageInteractionService.class));
        Post tombstone = new Post();
        tombstone.setId(POST_ID);
        tombstone.setAuthorId(AUTHOR_ID);
        tombstone.setStatus(Post.PostStatus.deleted);
        when(queries.findPostOrThrow(POST_ID)).thenReturn(tombstone);

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> facade.getComments(POST_ID, 1, 20));
        assertEquals(ErrorMessages.POST_NOT_FOUND_OR_DELETED, ex.getMessage());
        verify(queries, never()).getComments(POST_ID, 1, 20);
    }

    /** 正控：active 帖子的评论列表不受本闸影响（不得把正常读路径一起挡掉）。 */
    @Test
    void realVillageService_commentsOfActivePost_stillDelegatedToQueryService() {
        VillageQueryService queries = mock(VillageQueryService.class);
        VillagePostService posts = mock(VillagePostService.class);
        RealVillageService facade =
                new RealVillageService(queries, posts, mock(VillageInteractionService.class));
        Post live = new Post();
        live.setId(POST_ID);
        live.setAuthorId(AUTHOR_ID);
        live.setStatus(Post.PostStatus.active);
        CommentListResponse page = new CommentListResponse(List.of(), 0, 1, 20);
        when(queries.findPostOrThrow(POST_ID)).thenReturn(live);
        when(queries.getComments(POST_ID, 1, 20)).thenReturn(page);

        assertEquals(page, facade.getComments(POST_ID, 1, 20));
        verify(queries).getComments(POST_ID, 1, 20);
    }

    /**
     * 接口默认实现不得「假装成功」：mock 档位没有落库，删除必须显式失败，
     * 否则帖子仍在 feed 里却返回 200（本轮要修的正是这类静默缺陷）。
     */
    @Test
    void villageServiceDefaultDelete_failsLoudlyInsteadOfSilentSuccess() {
        VillageService mockOnlyService = new MockOnlyVillageService();

        assertThrows(com.campuslove.api.common.InvalidOperationException.class,
                () -> mockOnlyService.deletePost(AUTHOR_ID, POST_ID));
    }

    /** 只实现抽象方法、保留 deletePost 默认实现的最小 {@link VillageService}。 */
    private static final class MockOnlyVillageService implements VillageService {
        @Override
        public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize) {
            return null;
        }

        @Override
        public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
            return null;
        }

        @Override
        public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize,
                                         Long userId, String city, String discoverSub) {
            return null;
        }

        @Override
        public PostListResponse getPostsByAuthor(Long authorId, int page, int pageSize) {
            return null;
        }

        @Override
        public PostDetailView getPostDetail(Long id) {
            return null;
        }

        @Override
        public PostDetailView createPost(Long userId, CreatePostRequest request) {
            return null;
        }

        @Override
        public PostLikeResponse likePost(Long id) {
            return null;
        }

        @Override
        public CommentListResponse getComments(Long postId, int page, int pageSize) {
            return null;
        }

        @Override
        public CommentItemView createComment(Long userId, Long postId, CreateCommentRequest request) {
            return null;
        }

        @Override
        public ShareView sharePost(Long userId, Long postId, SharePostRequest request) {
            return null;
        }

        @Override
        public PostListResponse getPosts(String tab, String category, Long userId,
                                         org.springframework.data.domain.Pageable pageable) {
            return null;
        }

        @Override
        public PostDetailView getPost(Long postId) {
            return null;
        }

        @Override
        public PostDetailView createPost(Long userId, String title, String content, List<String> images,
                                         List<String> tags, String category, Long activityId) {
            return null;
        }

        @Override
        public PostLikeResponse likePost(Long userId, Long postId) {
            return null;
        }

        @Override
        public CommentItemView commentPost(Long userId, Long postId, String content) {
            return null;
        }

        @Override
        public ShareView sharePost(Long userId, Long postId, String comment) {
            return null;
        }

        @Override
        public List<PostCategoryView> getCategories() {
            return List.of();
        }

        @Override
        public CampusFeedView getCampusFeed(Long userId, int page, int size) {
            return null;
        }

        @Override
        public SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId) {
            return null;
        }
    }
}
