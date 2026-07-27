package com.campuslove.api.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 异步任务配置（Task 2.6.2）。
 *
 * <p>使用 {@link ThreadPoolTaskExecutor} 替代默认的 {@code SimpleAsyncTaskExecutor}，
 * 配置化线程池参数（核心线程数、最大线程数、队列容量、拒绝策略），避免线程无限增长
 * 导致 OOM 或资源耗尽。</p>
 *
 * <p>配置项（{@code application.yml}）：</p>
 * <pre>
 * app:
 *   async:
 *     core-pool-size: 8        # 核心线程数（CPU 密集型建议 CPU 核数，IO 密集型可适当增大）
 *     max-pool-size: 32        # 最大线程数
 *     queue-capacity: 200      # 队列容量（超出后触发拒绝策略）
 *     thread-name-prefix: async-  # 线程名前缀，便于线程池监控与排查
 *     keep-alive-seconds: 60   # 非核心线程空闲存活时间（秒）
 * </pre>
 *
 * <p>使用方式：在 Service 方法标注 {@code @Async("taskExecutor")} 或 {@code @Async}
 * （默认使用名为 {@code taskExecutor} 的 Bean）。</p>
 *
 * <p>拒绝策略：{@link ThreadPoolExecutor.CallerRunsPolicy} —— 由提交任务的线程
 * 直接执行任务，提供背压机制，避免任务丢失；同时通过慢执行反向触发上游限流。</p>
 *
 * <p>注意：异步方法中的异常不会抛回调用方，需在方法内部 try-catch 或通过
 * {@link org.springframework.scheduling.annotation.AsyncUncaughtExceptionHandler} 处理。</p>
 *
 * @since P2 / Task 2.6.2
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    /** 默认核心线程数：8（IO 密集型业务的常用起点） */
    public static final int DEFAULT_CORE_POOL_SIZE = 8;

    /** 默认最大线程数：32 */
    public static final int DEFAULT_MAX_POOL_SIZE = 32;

    /** 默认队列容量：200 */
    public static final int DEFAULT_QUEUE_CAPACITY = 200;

    /** 默认线程名前缀 */
    public static final String DEFAULT_THREAD_NAME_PREFIX = "async-";

    /** 默认非核心线程空闲存活时间：60 秒 */
    public static final int DEFAULT_KEEP_ALIVE_SECONDS = 60;

    @Value("${app.async.core-pool-size:8}")
    private int corePoolSize;

    @Value("${app.async.max-pool-size:32}")
    private int maxPoolSize;

    @Value("${app.async.queue-capacity:200}")
    private int queueCapacity;

    @Value("${app.async.thread-name-prefix:async-}")
    private String threadNamePrefix;

    @Value("${app.async.keep-alive-seconds:60}")
    private int keepAliveSeconds;

    /**
     * 定义默认的任务执行器 Bean（名称为 {@code taskExecutor}）。
     *
     * <p>Spring {@code @Async} 默认查找名为 {@code taskExecutor} 的 Bean；
     * 若未找到则回退到 {@code SimpleAsyncTaskExecutor}（每次新建线程，不推荐生产使用）。
     * 本配置显式定义 {@code taskExecutor}，保证所有 {@code @Async} 方法使用受管线程池。</p>
     *
     * @return 配置好的 ThreadPoolTaskExecutor
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix(threadNamePrefix);
        executor.setKeepAliveSeconds(keepAliveSeconds);
        // 拒绝策略：CallerRunsPolicy —— 由提交线程执行任务，提供背压
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // 优雅停机：等待已提交任务执行完毕再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        // 应用初始化时校验参数
        executor.initialize();
        log.info("异步任务线程池已初始化: corePoolSize={}, maxPoolSize={}, queueCapacity={}, "
                        + "threadNamePrefix={}, keepAliveSeconds={}",
                corePoolSize, maxPoolSize, queueCapacity, threadNamePrefix, keepAliveSeconds);
        return executor;
    }

    // 审计日志执行器 auditLogExecutor 已迁移至 AuditAsyncConfig（admin.audit 包），
    // 避免与 AuditAsyncConfig 中的同名 Bean 冲突（BeanDefinitionOverrideException）。
    // AuditAsyncConfig 使用 CallerRunsPolicy 保证审计日志不丢失，优于本类的 DiscardPolicy。
}
