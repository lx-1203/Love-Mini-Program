package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.repository.PostRepository;
import java.util.List;
import java.util.Map;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 热度分定时重算 + 热度榜查询（2026-08-11）。
 *
 * <p>每 15 分钟全量重算 posts 热度分（校园规模可全扫），Redisson 锁防多实例并发；
 * 重算完成后主动清空 {@link CacheNames#VILLAGE_HOT_POSTS} 缓存，
 * 保证榜单/首页热门读取到最新热度。</p>
 */
@Profile("real")
@Component
public class HotScoreScheduler {

    private static final Logger log = LoggerFactory.getLogger(HotScoreScheduler.class);

    /** 分布式锁 key（多实例互斥） */
    private static final String LOCK_KEY = "hot-score:recalc";
    private static final long LOCK_WAIT_SECONDS = 3;
    private static final long LOCK_TIMEOUT_SECONDS = 120;

    private final PostRepository postRepository;
    private final HotScoreCalculator calculator;
    private final RedissonClient redissonClient;
    private final CacheManager cacheManager;

    public HotScoreScheduler(PostRepository postRepository,
                             HotScoreCalculator calculator,
                             RedissonClient redissonClient,
                             CacheManager cacheManager) {
        this.postRepository = postRepository;
        this.calculator = calculator;
        this.redissonClient = redissonClient;
        this.cacheManager = cacheManager;
    }

    /**
     * 定时重算全部帖子热度分（每 15 分钟）。
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void scheduledHotScoreRecalc() {
        RLock lock = redissonClient.getLock(LOCK_KEY);
        boolean locked = false;
        try {
            locked = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
            if (!locked) {
                log.info("热度分重算获取锁失败，已有任务在执行，跳过本次");
                return;
            }
            int updated = recalcAllScores();
            log.info("热度分重算完成：updated={}", updated);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("热度分重算等待锁被中断：{}", e.getMessage());
        } catch (RuntimeException e) {
            log.error("热度分重算异常：{}", e.getMessage(), e);
        } finally {
            if (locked && lock.isHeldByCurrentThread()) {
                try {
                    lock.unlock();
                } catch (IllegalMonitorStateException ignored) {
                    // 锁已自动释放（持锁超时），忽略
                }
            }
        }
    }

    /**
     * 全量重算热度分（供定时任务与管理端「全部重算」复用）。
     *
     * @return 更新的帖子数
     */
    @Transactional
    public int recalcAllScores() {
        // 分页全扫（含非 active 帖：隐藏/删除帖热度置 0，保证操纵语义完整）
        int total = 0;
        int page = 0;
        int size = 500;
        while (true) {
            Page<Post> batch = postRepository.findAll(PageRequest.of(page, size));
            if (batch.isEmpty()) {
                break;
            }
            List<Post> posts = batch.getContent();
            Map<Long, Double> scores = calculator.calculateScores(posts);
            for (Post post : posts) {
                double score = scores.getOrDefault(post.getId(), 0.0);
                post.setHotScore(score);
                total++;
            }
            postRepository.saveAll(posts);
            if (!batch.hasNext()) {
                break;
            }
            page++;
        }
        evictHotCache();
        return total;
    }

    /**
     * 单帖立即重算（管理端操纵 hot_boost/hot_banned 后调用，含收藏数实时统计）。
     *
     * @return 新的热度分
     */
    @Transactional
    public double recalcPostScore(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found: " + postId));
        double score = calculator.calculateScore(post, null);
        post.setHotScore(score);
        postRepository.save(post);
        evictHotCache();
        return score;
    }

    /**
     * 热度榜分页查询（按 hot_score 降序，过滤 banned/非 active）。
     *
     * <p>缓存：{@link CacheNames#VILLAGE_HOT_POSTS} 15 分钟；
     * 重算/管理端操纵后经 {@link #evictHotCache()} 主动失效。</p>
     */
    @org.springframework.cache.annotation.Cacheable(cacheNames = CacheNames.VILLAGE_HOT_POSTS, key = "'board:' + #page")
    public Page<Post> findHotBoard(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));
        Page<Post> result = postRepository.findHotBoard(PostStatus.active,
                PageRequest.of(safePage, safeSize));
        return new PageImpl<>(result.getContent(), result.getPageable(), result.getTotalElements());
    }

    /** 首页热门帖（复用热度分排序，替换旧纯点赞排序）。 */
    @org.springframework.cache.annotation.Cacheable(cacheNames = CacheNames.VILLAGE_HOT_POSTS, key = "'hot'")
    public List<Post> findHotPosts(int limit) {
        Page<Post> result = postRepository.findHotBoard(PostStatus.active,
                PageRequest.of(0, Math.max(1, Math.min(100, limit))));
        return result.getContent();
    }

    /** 清空热度相关缓存（重算完成 / 管理端操纵后调用）。 */
    public void evictHotCache() {
        try {
            Cache cache = cacheManager.getCache(CacheNames.VILLAGE_HOT_POSTS);
            if (cache != null) {
                cache.clear();
            }
        } catch (RuntimeException e) {
            log.warn("清空热度缓存失败（可忽略，TTL 自然失效）：{}", e.getMessage());
        }
    }

    /** 当前登录用户 ID（供 Controller 复用）。 */
    public static Long currentUserIdOrNull() {
        try {
            return SecurityUtils.getCurrentUserId();
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}
