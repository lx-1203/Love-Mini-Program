package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.AuditLog;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 审计日志控制器。
 * <p>提供审计日志分页查询接口，支持按操作者、操作类型、时间范围筛选。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>GET /api/admin/audit-logs?page=0&size=20&operator=&operation=&startDate=&endDate=</li>
 * </ul>
 *
 * <p>Phase 3 修复：仅 real profile 加载，与 AdminAuditLogService 保持一致，避免 mock profile 启动失败。</p>
 */
@RestController
@RequestMapping("/api/admin/audit-logs")
@Profile("real")
public class AdminAuditLogController {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final AdminAuditLogService auditLogService;

    public AdminAuditLogController(AdminAuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /**
     * 分页查询审计日志。
     *
     * @param page      页码（从 0 开始，默认 0）
     * @param size      每页大小（默认 20，最大 100）
     * @param operator  操作者用户ID（数字字符串，可空）
     * @param operation 操作类型枚举名（可空）
     * @param startDate 起始时间（ISO 格式，如 2026-06-01T00:00:00，可空）
     * @param endDate   结束时间（ISO 格式，可空）
     * @return 分页审计日志
     */
    @GetMapping
    public ResponseEntity<AuditLogPageView> list(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "operator", required = false) String operator,
            @RequestParam(name = "operation", required = false) String operation,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate) {
        SecurityUtils.getCurrentUserId();

        // 参数归一化
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Long operatorId = parseLong(operator);
        String op = (operation != null && !operation.isBlank()) ? operation.toUpperCase() : null;
        LocalDateTime startTime = parseDateTime(startDate);
        LocalDateTime endTime = parseDateTime(endDate);

        Page<AuditLog> result = auditLogService.search(operatorId, op, startTime, endTime, pageable);

        List<AuditLogView> items = result.getContent().stream().map(this::toView).toList();
        AuditLogPageView view = new AuditLogPageView(
                items,
                result.getTotalElements(),
                result.getTotalPages(),
                safePage,
                safeSize
        );
        return ResponseEntity.ok(view);
    }

    private AuditLogView toView(AuditLog entity) {
        return new AuditLogView(
                entity.getId(),
                entity.getOperatorId(),
                entity.getOperatorUsername(),
                entity.getOperatorRole(),
                entity.getOperation(),
                entity.getTargetType(),
                entity.getTargetId(),
                entity.getRequestMethod(),
                entity.getRequestUrl(),
                entity.getRequestBody(),
                entity.getResponseStatus(),
                entity.getErrorMessage(),
                entity.getIp(),
                entity.getUserAgent(),
                entity.getDurationMs(),
                entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null
        );
    }

    private Long parseLong(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return null; }
    }

    private LocalDateTime parseDateTime(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            // 兼容纯日期格式 yyyy-MM-dd
            if (s.length() == 10) {
                return LocalDateTime.parse(s + "T00:00:00", DATE_TIME_FORMATTER);
            }
            return LocalDateTime.parse(s, DATE_TIME_FORMATTER);
        } catch (Exception e) {
            return null;
        }
    }
}

/** 审计日志视图 */
record AuditLogView(
        Long id,
        Long operatorId,
        String operatorUsername,
        String operatorRole,
        String operation,
        String targetType,
        String targetId,
        String requestMethod,
        String requestUrl,
        String requestBody,
        Integer responseStatus,
        String errorMessage,
        String ip,
        String userAgent,
        Long durationMs,
        String createdAt
) {}

/** 审计日志分页视图 */
record AuditLogPageView(
        List<AuditLogView> content,
        long totalElements,
        int totalPages,
        int page,
        int size
) {}
