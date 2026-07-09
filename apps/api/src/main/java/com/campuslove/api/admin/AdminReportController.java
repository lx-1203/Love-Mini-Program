package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Report;
import com.campuslove.api.repository.ReportRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 举报管理控制器。
 * <p>提供举报列表分页查询与举报处理接口，数据持久化到 reports 表。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>GET /api/admin/reports：按状态/目标类型分页查询举报列表</li>
 *   <li>POST /api/admin/reports/{id}/handle：处理举报（HANDLE 已处理 / REJECT 驳回）</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    /** 举报处理结果：已处理（对应 status=HANDLED） */
    private static final String RESULT_HANDLE = "HANDLE";
    /** 举报处理结果：驳回（对应 status=REJECTED） */
    private static final String RESULT_REJECT = "REJECT";
    /** 举报状态：待处理 */
    private static final String STATUS_PENDING = "PENDING";
    /** 举报状态：已处理 */
    private static final String STATUS_HANDLED = "HANDLED";
    /** 举报状态：已驳回 */
    private static final String STATUS_REJECTED = "REJECTED";

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    public AdminReportController(ReportRepository reportRepository, UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
    }

    /**
     * 分页查询举报列表。
     *
     * @param status     举报状态筛选：PENDING / HANDLED / REJECTED，可选
     * @param targetType 举报目标类型筛选：POST / COMMENT / USER / TOPIC，可选
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页举报列表
     */
    @GetMapping
    public AdminPageView<AdminReportView> listReports(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "targetType", required = false) String targetType,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "20") int pageSize) {
        SecurityUtils.getCurrentUserId();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        // 归一化筛选参数：空白字符串视为 null（不限制）
        String normalizedStatus = normalizeFilter(status);
        String normalizedTargetType = normalizeFilter(targetType);

        Page<Report> result = reportRepository.findByStatusAndTargetType(
                normalizedStatus, normalizedTargetType, pageable);

        // 批量预加载举报人昵称，避免 N+1 查询
        Map<Long, String> reporterNicknameMap = loadReporterNicknames(result.getContent());

        List<AdminReportView> items = result.getContent().stream()
                .map(report -> toView(report, reporterNicknameMap))
                .toList();

        return new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
    }

    /**
     * 处理举报：更新状态、处理人、处理备注与处理时间，并持久化。
     * <p>result=HANDLE → status=HANDLED；result=REJECT → status=REJECTED。</p>
     *
     * @param id  举报 ID
     * @param req 处理请求体
     * @return 操作结果；举报不存在返回 404
     */
    @PostMapping("/{id}/handle")
    @Transactional
    @Auditable(value = AuditOperation.HANDLE_REPORT, targetType = "REPORT")
    public ResponseEntity<Map<String, Object>> handleReport(
            @PathVariable("id") Long id,
            @Valid @RequestBody AdminReportHandleRequest req) {
        Long handlerId = SecurityUtils.getCurrentUserId();

        Optional<Report> reportOpt = reportRepository.findById(id);
        if (reportOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Report report = reportOpt.get();

        // 根据处理结果映射到对应状态
        String newStatus = RESULT_HANDLE.equals(req.result()) ? STATUS_HANDLED : STATUS_REJECTED;
        report.setStatus(newStatus);
        report.setHandlerId(handlerId);
        report.setHandleRemark(req.remark());
        report.setHandledAt(LocalDateTime.now());

        reportRepository.save(report);

        Map<String, Object> body = new HashMap<>();
        body.put("id", report.getId());
        body.put("result", req.result());
        body.put("status", report.getStatus());
        body.put("remark", report.getHandleRemark());
        body.put("handlerId", report.getHandlerId());
        body.put("handledAt", report.getHandledAt());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 归一化筛选参数：null 或空白返回 null（不限制），否则去除首尾空白。
     *
     * @param value 原始参数
     * @return 归一化后的参数
     */
    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /**
     * 批量加载举报人昵称映射，避免 N+1 查询。
     *
     * @param reports 当前页举报列表
     * @return userId -> nickname 映射
     */
    private Map<Long, String> loadReporterNicknames(List<Report> reports) {
        List<Long> reporterIds = reports.stream()
                .map(Report::getReporterId)
                .distinct()
                .toList();
        if (reporterIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(reporterIds).stream()
                .collect(HashMap::new,
                        (map, user) -> map.put(user.getId(), user.getNickname()),
                        HashMap::putAll);
    }

    /**
     * Report 实体转 AdminReportView。
     *
     * @param report              举报实体
     * @param reporterNicknameMap 举报人 ID -> 昵称映射
     * @return 举报视图
     */
    private AdminReportView toView(Report report, Map<Long, String> reporterNicknameMap) {
        return new AdminReportView(
                report.getId(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReporterId(),
                reporterNicknameMap.get(report.getReporterId()),
                report.getReason(),
                report.getDescription(),
                report.getStatus(),
                report.getHandlerId(),
                report.getHandleRemark(),
                report.getCreatedAt(),
                report.getHandledAt()
        );
    }
}
