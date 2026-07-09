package com.campuslove.api.admin.audit;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 审计日志异步配置。
 * <p>启用 @Async，并为审计日志写入提供独立线程池，避免阻塞主请求线程。</p>
 *
 * <p>策略说明：</p>
 * <ul>
 *   <li>核心线程数 2，最大 8，队列容量 1000（应对突发管理操作）</li>
 *   <li>拒绝策略 CallerRunsPolicy：队列满时由调用线程同步写入，避免审计日志丢失</li>
 *   <li>线程名前缀 audit-log- 便于排查</li>
 * </ul>
 */
@Configuration
@EnableAsync
public class AuditAsyncConfig {

    /**
     * 审计日志写入专用线程池。
     */
    @Bean(name = "auditLogExecutor")
    public Executor auditLogExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("audit-log-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        executor.initialize();
        return executor;
    }
}
