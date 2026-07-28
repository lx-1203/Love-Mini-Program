package com.campuslove.api.monitor;

import com.campuslove.api.repository.PostRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * 村口（帖子/评论）业务监控指标。
 *
 * <p>指标说明：</p>
 * <ul>
 *   <li>{@code village.post.created}：帖子创建计数</li>
 *   <li>{@code village.post.liked}：帖子点赞计数（标签 postId 标识被点赞的帖子）</li>
 *   <li>{@code village.comment.created}：评论创建计数</li>
 *   <li>{@code village.post.total}：当前帖子总数（Gauge，通过 {@link PostRepository#count()} 获取）</li>
 * </ul>
 *
 * <p>容错策略：所有指标记录方法均使用 try-catch 包裹，失败时只记录日志不抛出异常。</p>
 *
 * <p>依赖说明：通过 {@link ObjectProvider} 注入 {@link PostRepository}，
 * 在 mock profile（无 JPA）下也能正常创建实例，仅跳过帖子总数 Gauge 注册。</p>
 */
@Component
public class VillageMetrics {

    private static final Logger log = LoggerFactory.getLogger(VillageMetrics.class);

    /** 帖子创建计数器指标名 */
    private static final String METRIC_POST_CREATED = "village.post.created";
    /** 帖子点赞计数器指标名 */
    private static final String METRIC_POST_LIKED = "village.post.liked";
    /** 评论创建计数器指标名 */
    private static final String METRIC_COMMENT_CREATED = "village.comment.created";
    /** 帖子总数 Gauge 指标名 */
    private static final String METRIC_POST_TOTAL = "village.post.total";

    /** 帖子 ID 标签 key */
    private static final String TAG_POST_ID = "postId";

    private final MeterRegistry meterRegistry;
    /**
     * 通过 ObjectProvider 包装 PostRepository，在 mock profile（JPA 被排除）下也能正常注入。
     * 当 PostRepository 不存在时，{@code getIfAvailable()} 返回 null，
     * 此时跳过 village.post.total Gauge 注册，不影响其他计数器使用。
     */
    private final ObjectProvider<PostRepository> postRepositoryProvider;

    /** 帖子创建计数器 */
    private final Counter postCreatedCounter;
    /** 评论创建计数器 */
    private final Counter commentCreatedCounter;

    public VillageMetrics(MeterRegistry meterRegistry, ObjectProvider<PostRepository> postRepositoryProvider) {
        this.meterRegistry = meterRegistry;
        this.postRepositoryProvider = postRepositoryProvider;

        // 帖子创建计数器（无标签，单例）
        this.postCreatedCounter = Counter.builder(METRIC_POST_CREATED)
                .description("村口帖子创建总数")
                .register(meterRegistry);
        // 评论创建计数器
        this.commentCreatedCounter = Counter.builder(METRIC_COMMENT_CREATED)
                .description("村口评论创建总数")
                .register(meterRegistry);

        // 注册帖子总数 Gauge：仅在 PostRepository 可用时注册，避免 mock profile 启动失败
        PostRepository postRepository = postRepositoryProvider.getIfAvailable();
        if (postRepository != null) {
            try {
                Gauge.builder(METRIC_POST_TOTAL, postRepository, repo -> {
                    try {
                        return repo.count();
                    } catch (RuntimeException e) {
                        // Gauge 抓取失败时返回 -1 表示无效值，避免抛出异常影响 Prometheus 抓取
                        log.debug("获取 village.post.total 失败: {}", e.getMessage());
                        return -1.0;
                    }
                })
                        .description("当前村口帖子总数")
                        .register(meterRegistry);
            } catch (RuntimeException e) {
                log.warn("注册 village.post.total Gauge 失败: {}", e.getMessage());
            }
        } else {
            log.debug("PostRepository 不可用（mock profile），跳过 village.post.total Gauge 注册");
        }
    }

    /**
     * 记录一次帖子创建。
     */
    public void recordPostCreated() {
        try {
            postCreatedCounter.increment();
        } catch (RuntimeException e) {
            // Counter.increment 失败不影响业务主流程
            log.warn("记录 village.post.created 指标失败: {}", e.getMessage());
        }
    }

    /**
     * 记录一次帖子点赞。
     *
     * @param postId 被点赞的帖子 ID（作为标签，便于按帖子聚合）
     */
    public void recordPostLiked(Long postId) {
        try {
            // postId 作为标签：高基数标签可能导致指标膨胀，仅在小规模场景使用；
            // 如需在生产环境使用，可考虑去掉 postId 标签或采样记录
            Counter.builder(METRIC_POST_LIKED)
                    .tag(TAG_POST_ID, postId == null ? "unknown" : String.valueOf(postId))
                    .description("村口帖子点赞总数（按帖子区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 village.post.liked 指标失败, postId={}: {}", postId, e.getMessage());
        }
    }

    /**
     * 记录一次评论创建。
     */
    public void recordCommentCreated() {
        try {
            commentCreatedCounter.increment();
        } catch (RuntimeException e) {
            // Counter.increment 失败不影响业务主流程
            log.warn("记录 village.comment.created 指标失败: {}", e.getMessage());
        }
    }
}
