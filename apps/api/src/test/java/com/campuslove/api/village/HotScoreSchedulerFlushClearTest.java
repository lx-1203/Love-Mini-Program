package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.repository.PostRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TransactionRequiredException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.redisson.api.RedissonClient;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * {@link HotScoreScheduler#recalcAllScores()} 按页释放持久化上下文的测试（S3-4b）。
 *
 * <p>背景：全量重算在一个事务里分页扫 posts 全表，每页读出的实体都会一直被托管在
 * 事务级持久化上下文里，直到提交才释放——于是上下文随「帖子总量」增长（常驻内存 +
 * 提交时一次性 flush 全表脏数据）。修复是每页末尾 {@code flush(); clear();}。</p>
 *
 * <p>本测试用桩 EntityManager 计数，钉住：</p>
 * <ol>
 *   <li>flush / clear 各发生「每页一次」，且同一页内 flush 严格早于 clear
 *       （顺序反了 = clear 丢掉未落库的 hot_score）；</li>
 *   <li>处理页数 = {@code ceil(总数 / RECALC_PAGE_SIZE)}，分页语义未被改动；</li>
 *   <li>返回计数、每页 saveAll、非 active 帖热度归 0、evictHotCache 等原语义不变。</li>
 * </ol>
 *
 * <p>删掉实现里的 flush/clear，本测试必然失败（times(N) 与 InOrder 断言）。</p>
 */
@DisplayName("HotScoreScheduler - 热度分全量重算按页释放持久化上下文（S3-4b）")
class HotScoreSchedulerFlushClearTest {

    private static final int PAGE_SIZE = HotScoreScheduler.RECALC_PAGE_SIZE;

    private final PostRepository postRepository = mock(PostRepository.class);
    private final HotScoreCalculator calculator = mock(HotScoreCalculator.class);
    private final RedissonClient redissonClient = mock(RedissonClient.class);
    private final CacheManager cacheManager = mock(CacheManager.class);
    private final EntityManager entityManager = mock(EntityManager.class);

    private final HotScoreScheduler scheduler =
            new HotScoreScheduler(postRepository, calculator, redissonClient, cacheManager);

    @BeforeEach
    void setUp() {
        // @PersistenceContext 是字段注入，单测无 Spring 上下文：手工塞入桩 EntityManager
        ReflectionTestUtils.setField(scheduler, "entityManager", entityManager);
        when(cacheManager.getCache(CacheNames.VILLAGE_HOT_POSTS)).thenReturn(null);
    }

    // ---- 夹具 ----

    private static Post post(long id, PostStatus status) {
        Post p = new Post();
        p.setId(id);
        p.setStatus(status);
        return p;
    }

    /**
     * 伪造 total 条数据的分页结果（每页 PAGE_SIZE 条，末页余数），记录被请求过的页号。
     * PageImpl 的 hasNext() 由 total 推导，与实现里的循环退出条件一致。
     */
    private List<Integer> stubPagedPosts(int total) {
        List<Integer> requestedPages = new ArrayList<>();
        when(postRepository.findAll(any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(0);
            requestedPages.add(pageable.getPageNumber());
            int from = pageable.getPageNumber() * pageable.getPageSize();
            int to = Math.min(from + pageable.getPageSize(), total);
            List<Post> content = new ArrayList<>();
            for (long id = from; id < to; id++) {
                content.add(post(id, PostStatus.active));
            }
            return new PageImpl<>(content, pageable, total);
        });
        return requestedPages;
    }

    /** 为每条帖返回 id → 1.0 的分数（让「计数」与「写回」都可被断言）。 */
    private void stubScores() {
        when(calculator.calculateScores(anyList())).thenAnswer(invocation -> {
            List<Post> posts = invocation.getArgument(0);
            Map<Long, Double> scores = new HashMap<>();
            for (Post p : posts) {
                scores.put(p.getId(), 1.0);
            }
            return scores;
        });
    }

    @Test
    @DisplayName("1200 帖 = 3 页：flush/clear 各 3 次，每页顺序为 findAll→saveAll→flush→clear")
    void recalcAllScores_multiPage_shouldFlushAndClearOncePerPage() {
        int total = 1200;
        List<Integer> pages = stubPagedPosts(total);
        stubScores();

        int updated = scheduler.recalcAllScores();

        int expectedPages = (total + PAGE_SIZE - 1) / PAGE_SIZE;
        assertEquals(3, expectedPages, "夹具自检：1200/500 向上取整必须是 3 页");
        assertEquals(List.of(0, 1, 2), pages, "分页请求必须逐页推进");
        assertEquals(total, updated, "返回计数必须仍是处理过的帖子总数");

        verify(entityManager, times(expectedPages)).flush();
        verify(entityManager, times(expectedPages)).clear();

        InOrder inOrder = inOrder(postRepository, entityManager);
        for (int page = 0; page < expectedPages; page++) {
            inOrder.verify(postRepository).findAll(PageRequest.of(page, PAGE_SIZE));
            inOrder.verify(postRepository).saveAll(anyList());
            inOrder.verify(entityManager).flush();
            inOrder.verify(entityManager).clear();
        }
        inOrder.verifyNoMoreInteractions();
        verify(cacheManager).getCache(CacheNames.VILLAGE_HOT_POSTS);
    }

    @Test
    @DisplayName("页数 = ceil(total/500)：1001 帖走 3 页；恰好 500 帖只走 1 页")
    void recalcAllScores_pageCountShouldMatchCeilDivision() {
        stubScores();

        List<Integer> pages1001 = stubPagedPosts(1001);
        assertEquals(1001, scheduler.recalcAllScores());
        assertEquals(List.of(0, 1, 2), pages1001);
        verify(entityManager, times(3)).flush();
        verify(entityManager, times(3)).clear();

        reset(entityManager, postRepository);
        List<Integer> pages500 = stubPagedPosts(500);
        assertEquals(500, scheduler.recalcAllScores());
        assertEquals(List.of(0), pages500, "整页数据不能再多请求一页");
        verify(entityManager, times(1)).flush();
        verify(entityManager, times(1)).clear();
    }

    @Test
    @DisplayName("空表：一次都不碰 EntityManager，仍清缓存并返回 0")
    void recalcAllScores_emptyTable_shouldNotTouchEntityManager() {
        when(postRepository.findAll(any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(), PageRequest.of(0, PAGE_SIZE), 0));

        assertEquals(0, scheduler.recalcAllScores());

        verifyNoInteractions(entityManager);
        verify(postRepository, never()).saveAll(anyList());
        verify(cacheManager).getCache(CacheNames.VILLAGE_HOT_POSTS);
    }

    @Test
    @DisplayName("未注入 EntityManager（无 JPA 的单测场景）：重算照常完成，不抛异常")
    void recalcAllScores_withoutEntityManager_shouldDegradeGracefully() {
        ReflectionTestUtils.setField(scheduler, "entityManager", null);
        stubPagedPosts(2);
        when(calculator.calculateScores(anyList())).thenReturn(Map.of());

        assertEquals(2, scheduler.recalcAllScores());
        verify(postRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("无事务上下文（flush 抛 TransactionRequiredException）：跳过清理，clear 不被误调")
    void recalcAllScores_withoutTransaction_shouldSkipCleanup() {
        stubPagedPosts(10);
        when(calculator.calculateScores(anyList())).thenReturn(Map.of());
        org.mockito.Mockito.doThrow(new TransactionRequiredException("no tx"))
                .when(entityManager).flush();

        assertEquals(10, scheduler.recalcAllScores(), "定时任务自调用无事务时不得因此报错");

        verify(entityManager, times(1)).flush();
        verify(entityManager, never()).clear();
        verify(postRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("非 active 帖热度归 0 语义未变：calculator 未给分的 hidden/deleted 帖写回 0.0")
    void recalcAllScores_shouldZeroOutPostsWithoutScore() {
        List<Post> posts = new ArrayList<>(List.of(
                post(1L, PostStatus.active),
                post(2L, PostStatus.hidden),
                post(3L, PostStatus.deleted)));
        when(postRepository.findAll(any(Pageable.class))).thenReturn(
                new PageImpl<>(posts, PageRequest.of(0, PAGE_SIZE), posts.size()));
        when(calculator.calculateScores(anyList())).thenReturn(Map.of(1L, 9.25));

        assertEquals(3, scheduler.recalcAllScores());

        assertEquals(Double.valueOf(9.25), posts.get(0).getHotScore());
        assertEquals(Double.valueOf(0.0), posts.get(1).getHotScore(), "隐藏帖必须归 0，否则操纵语义丢失");
        assertEquals(Double.valueOf(0.0), posts.get(2).getHotScore(), "删除帖必须归 0");
        verify(postRepository).saveAll(posts);
        verify(entityManager).flush();
        verify(entityManager).clear();
    }
}
