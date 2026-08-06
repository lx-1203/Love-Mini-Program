package com.campuslove.api.admin;

import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.repository.AuditLogRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

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
        } catch (DataAccessException e) {
            // Task 10（FIN-00022）：@Transactional 内 catch DB 异常必须显式回滚或重新抛出，
            // 否则 Spring 会认为方法正常返回而提交事务，可能导致部分提交/连接状态不一致。
            // 此处使用 REQUIRES_NEW 传播级别，本方法运行在独立事务中，
            // setRollbackOnly 仅标记当前审计日志事务为回滚，不影响主业务事务；
            // 同时 @Async 将异常上抛交由 auditLogExecutor 线程池统一记录，不阻断主请求。
            log.warn("Failed to save audit log: operation={}, operatorId={}, error={}",
                    auditLog.getOperation(), auditLog.getOperatorId(), e.getMessage());
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            throw new RuntimeException("Audit log persistence failed", e);
        }
    }

    /**
     * 分页查询审计日志。
     *
     * @param operatorId    操作者ID（可空）
     * @param operation     操作类型（可空）
     * @param startTime     起始时间（可空，包含）
     * @param endTime       结束时间（可空，包含）
     * @param exceptionOnly 仅查异常日志（errorMessage 非空），null/false 时不参与过滤
     * @param pageable      分页
     * @return 分页审计日志
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> search(Long operatorId, String operation,
                                 LocalDateTime startTime, LocalDateTime endTime,
                                 Boolean exceptionOnly,
                                 Pageable pageable) {
        return auditLogRepository.search(operatorId, operation, startTime, endTime, exceptionOnly, pageable);
    }
}
