package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PostShare;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostShareRepository;
import java.lang.reflect.Method;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.AnnotationCacheOperationSource;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;

/**
 * P2 缓存正确性修复——互动热路径不再用 {@code allEntries = true} 清空整个热度榜缓存。
 *
 * <p>{@link CacheNames#VILLAGE_HOT_POSTS} 线上只有 {@code 'hot'} 一个键在被写
 * （{@code VillageQueryService#listHotPosts}）；原先 6 个互动写入口每条都挂
 * {@code allEntries=true}，其语义是「清空整个缓存名」，一旦
 * {@code HotScoreScheduler#findHotBoard} 的 {@code 'board:' + page} 上线，
 * 一次点赞就会连坐清掉全部分页、并把所有并发请求一起推进回源（惊群）。</p>
 *
 * <p><b>两个方向的断言，缺一不可</b>：</p>
 * <ul>
 *   <li>失效仍然存在（删掉 {@code @CacheEvict} 就红）：点赞后 {@code 'hot'} 键必须被清掉——
 *       榜单上的点赞数照旧在下一次读时刷新，本次修复<b>没有</b>让点赞停止刷新榜单；</li>
 *   <li>失效变得精确（改回 {@code allEntries=true} 就红）：同一缓存里的
 *       {@code 'board:1'} / {@code 'board:2'} 必须存活。</li>
 * </ul>
 *
 * <p>行为断言用真实的 {@link CacheInterceptor} + {@link CaffeineCacheManager}
 * 代理（非 real profile 的缓存实现），不依赖 Redis。</p>
 */
class VillageHotPostsEvictPrecisionTest {

    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private PostShareRepository postShareRepository;
    @Mock private InteractionEventService interactionEventService;
    @Mock private VillageQueryService queryService;

    private CacheManager cacheManager;
    private VillageInteractionService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        cacheManager = new CaffeineCacheManager();
        CacheInterceptor interceptor = new CacheInterceptor();
        interceptor.setCacheManager(cacheManager);
        interceptor.setCacheOperationSources(new AnnotationCacheOperationSource());
        // 手工代理必须自己触发初始化：CacheAspectSupport#execute 在 initialized=false
        // 时会跳过全部缓存逻辑（容器里由 afterSingletonsInstantiated 完成）
        interceptor.afterSingletonsInstantiated();

        // 兼容旧测试的构造器：entityManager / 敏感词过滤器为 null，
        // likePost / commentPost / sharePost 均走「无 bulk UPDATE」的纯 Repository 路径
        VillageInteractionService target = new VillageInteractionService(
                postRepository, commentRepository, postLikeRepository,
                postShareRepository, interactionEventService, queryService);
        ProxyFactory proxyFactory = new ProxyFactory(target);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(interceptor);
        service = (VillageInteractionService) proxyFactory.getProxy();
    }

    /** 预热缓存：1 个真实键 + 2 个「将来分页上线后」才存在的键。 */
    private Cache hotCache() {
        Cache cache = cacheManager.getCache(CacheNames.VILLAGE_HOT_POSTS);
        assertNotNull(cache, "village_hot_posts 缓存应已创建");
        cache.put("hot", List.of("旧榜单-热"));
        cache.put("board:1", List.of("旧榜单-第1页"));
        cache.put("board:2", List.of("旧榜单-第2页"));
        return cache;
    }

    @Test
    @DisplayName("likePost 只失效 'hot'：榜单刷新保留，分页键不被连坐清空")
    void likePost_evictsHotKeyOnly() {
        Cache cache = hotCache();
        when(queryService.findPostOrThrow(100L)).thenReturn(createPost(100L, 5));
        when(postLikeRepository.existsByUserIdAndPostId(1L, 100L)).thenReturn(false);

        PostLikeResponse response = service.likePost(1L, 100L);

        assertTrue(response.liked(), "点赞应成功");
        assertEquals(6, response.likeCount());
        assertNull(cache.get("hot"), "点赞必须失效 'hot' 键（否则榜单计数不再刷新）");
        assertNotNull(cache.get("board:1"), "点赞不应连坐清空分页键（allEntries=true 的老问题）");
        assertNotNull(cache.get("board:2"), "点赞不应连坐清空分页键（allEntries=true 的老问题）");
    }

    @Test
    @DisplayName("commentPost（5 参真身）只失效 'hot'")
    void commentPost_evictsHotKeyOnly() {
        Cache cache = hotCache();
        when(queryService.findPostOrThrow(100L)).thenReturn(createPost(100L, 5));
        when(commentRepository.saveAndFlush(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        service.commentPost(1L, 100L, "你好", null, List.of());

        assertNull(cache.get("hot"), "评论必须失效 'hot' 键");
        assertNotNull(cache.get("board:1"), "评论不应连坐清空分页键");
    }

    @Test
    @DisplayName("sharePost 只失效 'hot'")
    void sharePost_evictsHotKeyOnly() {
        Cache cache = hotCache();
        when(queryService.findPostOrThrow(100L)).thenReturn(createPost(100L, 5));
        when(postShareRepository.saveAndFlush(any(PostShare.class))).thenAnswer(inv -> inv.getArgument(0));

        ShareView view = service.sharePost(1L, 100L, "转发语");

        assertNotNull(view);
        assertNull(cache.get("hot"), "转发必须失效 'hot' 键");
        assertNotNull(cache.get("board:1"), "转发不应连坐清空分页键");
    }

    @Test
    @DisplayName("listHotPosts 仍是 'hot' 键的读侧，且开了 sync 防惊群")
    void listHotPosts_usesHotKeyWithSync() throws Exception {
        Method m = VillageQueryService.class.getMethod("listHotPosts");
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "listHotPosts 应保留 @Cacheable");
        assertEquals(CacheNames.VILLAGE_HOT_POSTS, cacheable.cacheNames()[0]);
        assertEquals("'hot'", cacheable.key(),
                "读侧键必须与写侧 @CacheEvict 的键一致，否则失效打空");
        assertTrue(cacheable.sync(),
                "热度榜是全服单键 + 昂贵回源，必须 sync=true 防击穿"
                        + "（配套 null 策略见 RedisConfig#SYNC_LOADED_CACHES）");
    }

    @Test
    @DisplayName("6 个互动写入口的 @CacheEvict 均为精确键 'hot'")
    void allInteractionMutations_usePreciseHotKey() throws Exception {
        List<Method> methods = List.of(
                VillageInteractionService.class.getMethod("likePost", Long.class, Long.class),
                VillageInteractionService.class.getMethod("toggleFavorite", Long.class, Long.class),
                VillageInteractionService.class.getMethod("commentPost",
                        Long.class, Long.class, String.class),
                VillageInteractionService.class.getMethod("commentPost",
                        Long.class, Long.class, String.class, Long.class),
                VillageInteractionService.class.getMethod("commentPost",
                        Long.class, Long.class, String.class, Long.class, List.class),
                VillageInteractionService.class.getMethod("sharePost",
                        Long.class, Long.class, String.class));

        for (Method method : methods) {
            CacheEvict evict = method.getAnnotation(CacheEvict.class);
            assertNotNull(evict,
                    method.getName() + " 应保留 @CacheEvict（不能让点赞/评论停止刷新榜单）");
            assertEquals(CacheNames.VILLAGE_HOT_POSTS, evict.cacheNames()[0], method.getName());
            assertEquals("'hot'", evict.key(), method.getName() + " 应精确失效 'hot'");
            assertFalse(evict.allEntries(),
                    method.getName() + " 不应再用 allEntries=true（互动热路径全局击穿）");
        }
    }

    private static Post createPost(Long id, int likes) {
        Post post = new Post();
        post.setId(id);
        post.setAuthorId(2L);
        post.setLikesCount(likes);
        post.setCommentsCount(0);
        post.setShareCount(0);
        return post;
    }
}
