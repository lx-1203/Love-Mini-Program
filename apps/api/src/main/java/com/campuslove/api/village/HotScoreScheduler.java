package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.repository.PostRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TransactionRequiredException;
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

    /**
     * 热度分全量重算的分页大小（S3-4b 语义基准：持久化上下文每页释放一次，
     * 处理页数必须等于 {@code ceil(总数 / 本值)}，故暴露给单测引用）。
     */
    static final int RECALC_PAGE_SIZE = 500;

    private final PostRepository postRepository;
    private final HotScoreCalculator calculator;
    private final RedissonClient redissonClient;
    private final CacheManager cacheManager;

    /**
     * S3-4b（2026-10-30）：全量重算的持久化上下文清理入口。
     *
     * <p>{@link #recalcAllScores()} 在一个事务里分页扫全表，每页读出的 {@link Post}
     * 都会被 Hibernate 托管到「事务级」持久化上下文，直到事务提交才释放：
     * 帖子总量越大，驻留内存的实体越多，提交时还要一次性 flush 全量脏数据
     * （大事务 + 巨量 UPDATE）。分页本身没问题，问题是上下文不清理，
     * 因此每页处理完显式 {@code flush()} 写库 + {@code clear()} 脱管，
     * 把持久化上下文稳定压在「一页」的量级。</p>
     *
     * <p>用字段注入而非构造器参数：既有构造器调用点（含其他模块/测试）保持不变。
     * 为 {@code null}（单测未注入）或当前线程无事务时，{@link #flushAndClearPage()}
     * 直接跳过。注意后者并非降级损失：无事务时（{@code @Scheduled} 自调用绕过
     * {@code @Transactional} 代理）每次 Repository 调用都用自己独立的会话并在调用
     * 结束关闭，本就不会跨页累积实体。</p>
     */
    @PersistenceContext
    private EntityManager entityManager;

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
     * <p>返回数、缓存失效（{@link #evictHotCache()}）、非 active 帖热度归 0
     * （{@code scores.getOrDefault(id, 0.0)}）与单事务原子性均保持不变；
     * S3-4b 只在每页末尾追加一次持久化上下文 flush+clear。</p>
     *
     * @return 更新的帖子数
     */
    @Transactional
    public int recalcAllScores() {
        // 分页全扫（含非 active 帖：隐藏/删除帖热度置 0，保证操纵语义完整）
        int total = 0;
        int page = 0;
        int size = RECALC_PAGE_SIZE;
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
            // S3-4b：本页脏数据落库后释放持久化上下文，避免整表实体驻留到提交
            flushAndClearPage();
            if (!batch.hasNext()) {
                break;
            }
            page++;
        }
        evictHotCache();
        return total;
    }

    /**
     * 每页末尾释放持久化上下文（S3-4b）。
     *
     * <p>{@code flush()} 必须早于 {@code clear()}：clear 会丢弃未提交的托管变更，
     * 先 flush 才能保证本页 {@code hot_score} 真的写进数据库。</p>
     *
     * <p>无事务上下文时 {@code SharedEntityManagerCreator} 对 {@code flush()} 抛
     * {@link TransactionRequiredException}（该路径本就不跨会话累积实体，见字段注释），
     * 静默跳过即可，不能让定时任务因此报错。</p>
     */
    private void flushAndClearPage() {
        if (entityManager == null) {
            return;
        }
        try {
            entityManager.flush();
        } catch (TransactionRequiredException | IllegalStateException e) {
            log.debug("热度分重算：当前线程无事务上下文，跳过持久化上下文清理：{}", e.getMessage());
            return;
        }
        entityManager.clear();
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
