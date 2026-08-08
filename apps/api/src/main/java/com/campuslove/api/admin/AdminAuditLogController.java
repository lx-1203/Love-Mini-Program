package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.AuditLog;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
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
@RequestMapping("/api/v1/admin/audit-logs")
@Profile("real")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminAuditLogController {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * R4-00394：审计视图层二次白名单——敏感字段名匹配模式。
     * 切面脱敏仅靠字段名单，新增敏感字段易漏；视图层按 key 名兜底脱敏。
     */
    private static final java.util.regex.Pattern SENSITIVE_KEY_PATTERN =
            java.util.regex.Pattern.compile(
                    "(?i)(password|passwd|secret|token|authorization|credential|"
                    + "idcard|id_card|idCard|phone|openid|open_id|unionid|session_key|jwt)");

    private final AdminAuditLogService auditLogService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper =
            new com.fasterxml.jackson.databind.ObjectMapper();

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
     * @param exception 仅查异常日志（errorMessage 非空），true 时生效，可空
     * @return 分页审计日志
     */
    @GetMapping
    public ResponseEntity<AuditLogPageView> list(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(name = "operator", required = false) String operator,
            @RequestParam(name = "operation", required = false) String operation,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @RequestParam(name = "exception", required = false) Boolean exception) {
        SecurityUtils.getCurrentUserId();

        // 参数归一化
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Long operatorId = parseLong(operator);
        String op = (operation != null && !operation.isBlank()) ? operation.toUpperCase() : null;
        LocalDateTime startTime = parseDateTime(startDate);
        LocalDateTime endTime = parseDateTime(endDate);
        // 异常日志筛选：exception=true 时仅返回 errorMessage 非空的记录
        Boolean exceptionOnly = Boolean.TRUE.equals(exception) ? Boolean.TRUE : null;

        Page<AuditLog> result = auditLogService.search(operatorId, op, startTime, endTime, exceptionOnly, pageable);

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
                // R4-00394：视图层二次白名单（切面脱敏的兜底，防新增敏感字段漏脱敏）
                sanitizeRequestBody(entity.getRequestBody()),
                entity.getResponseStatus(),
                entity.getErrorMessage(),
                entity.getIp(),
                entity.getUserAgent(),
                entity.getDurationMs(),
                entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null
        );
    }

    /**
     * R4-00394：审计视图层二次白名单——递归剔除 requestBody JSON 中的敏感字段。
     * 切面脱敏依赖字段名单，新增敏感字段易漏；此处按 key 名兜底（解析失败时
     * 原样返回，交由切面已做的脱敏兜底）。
     */
    private String sanitizeRequestBody(String body) {
        if (body == null || body.isBlank()) {
            return body;
        }
        try {
            com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(body);
            redactSensitiveKeys(node);
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            return body;
        }
    }

    private void redactSensitiveKeys(com.fasterxml.jackson.databind.JsonNode node) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            java.util.Iterator<java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> field = fields.next();
                if (SENSITIVE_KEY_PATTERN.matcher(field.getKey()).matches()) {
                    field.setValue(com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.textNode("***"));
                } else {
                    redactSensitiveKeys(field.getValue());
                }
            }
        } else if (node.isArray()) {
            node.forEach(this::redactSensitiveKeys);
        }
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
        } catch (DateTimeParseException e) {
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
