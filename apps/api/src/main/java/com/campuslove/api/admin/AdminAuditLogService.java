package com.campuslove.api.admin;

import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.repository.AuditLogRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 审计日志服务。
 * <p>提供两个核心能力：</p>
 * <ul>
 *   <li>{@link #saveAsync(AuditLog)} 异步写入审计日志（由 AOP 切面调用），使用 auditLogExecutor 线程池</li>
 *   <li>{@link #search} 分页查询审计日志（由 AdminAuditLogController 调用）</li>
 * </ul>
 *
 * <p>写入使用 REQUIRES_NEW 传播级别，确保即使主业务事务回滚，审计日志仍能记录。</p>
 *
 * <p>Phase 3 修复：仅 real profile 加载，避免 mock profile 下因 AuditLogRepository bean 缺失导致启动失败。</p>
 */
@Service
@Profile("real")
public class AdminAuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public AdminAuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * 异步写入审计日志。
     * <p>由 {@link com.campuslove.api.admin.audit.AuditLogAspect} 在管理操作执行后调用。
     * 通过 @Async("auditLogExecutor") 在独立线程池执行，不影响主请求耗时。</p>
     *
     * @param auditLog 待写入的审计日志（createdAt 在此处填充）
     */
    @Async("auditLogExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAsync(AuditLog auditLog) {
        if (auditLog == null) {
            return;
        }
        if (auditLog.getCreatedAt() == null) {
            auditLog.setCreatedAt(LocalDateTime.now());
        }
        try {
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // 审计日志写入失败不应影响主流程，仅记录警告
            log.warn("Failed to save audit log: operation={}, operatorId={}, error={}",
                    auditLog.getOperation(), auditLog.getOperatorId(), e.getMessage());
        }
    }

    /**
     * 分页查询审计日志。
     *
     * @param operatorId 操作者ID（可空）
     * @param operation  操作类型（可空）
     * @param startTime  起始时间（可空，包含）
     * @param endTime    结束时间（可空，包含）
     * @param pageable   分页
     * @return 分页审计日志
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> search(Long operatorId, String operation,
                                 LocalDateTime startTime, LocalDateTime endTime,
                                 Pageable pageable) {
        return auditLogRepository.search(operatorId, operation, startTime, endTime, pageable);
    }
}
