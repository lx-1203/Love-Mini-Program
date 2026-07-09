package com.campuslove.api.report;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Report;
import com.campuslove.api.repository.ReportRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户端 - 举报控制器。
 * <p>提供用户对帖子/评论/用户/话题的举报提交接口。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>POST /api/reports：创建举报，需要 JWT 认证</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径在 SecurityConfig 中要求已认证，
 * 举报人 ID 从 JWT 认证上下文中获取，避免客户端伪造。</p>
 *
 * <p>Profile 说明：仅 real profile 启用，避免影响 mock profile 测试。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    /** 举报初始状态：待处理 */
    private static final String STATUS_PENDING = "PENDING";

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    /**
     * 创建举报。
     * <p>从 JWT 认证上下文获取举报人 ID，与请求体中的目标信息一并持久化。</p>
     *
     * @param req 举报请求体
     * @return 举报记录视图
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportView createReport(@Valid @RequestBody ReportCreateRequest req) {
        Long reporterId = SecurityUtils.getCurrentUserId();

        Report report = new Report();
        report.setTargetType(req.targetType());
        report.setTargetId(req.targetId());
        report.setReporterId(reporterId);
        report.setReason(req.reason());
        report.setDescription(req.description());
        report.setStatus(STATUS_PENDING);
        report.setCreatedAt(LocalDateTime.now());

        Report saved = reportRepository.save(report);

        return new ReportView(
                saved.getId(),
                saved.getTargetType(),
                saved.getTargetId(),
                saved.getReporterId(),
                saved.getReason(),
                saved.getDescription(),
                saved.getStatus(),
                saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null
        );
    }
}

/**
 * 举报创建请求体。
 *
 * @param targetType   举报目标类型：POST / COMMENT / USER / TOPIC
 * @param targetId     目标对象 ID
 * @param reason       举报原因（简短分类）
 * @param description  详细描述（可选，最长 500 字符）
 */
record ReportCreateRequest(
        @NotBlank
        @Pattern(regexp = "POST|COMMENT|USER|TOPIC", message = "targetType 必须为 POST/COMMENT/USER/TOPIC")
        String targetType,
        @NotNull Long targetId,
        @NotBlank
        @Size(max = 64) String reason,
        @Size(max = 500) String description
) {
}

/**
 * 举报记录视图（用户端）。
 *
 * @param id          举报 ID
 * @param targetType  举报目标类型
 * @param targetId    目标对象 ID
 * @param reporterId  举报人用户 ID
 * @param reason      举报原因
 * @param description 详细描述
 * @param status      处理状态：PENDING / HANDLED / REJECTED
 * @param createdAt   创建时间（ISO 格式字符串）
 */
record ReportView(
        Long id,
        String targetType,
        Long targetId,
        Long reporterId,
        String reason,
        String description,
        String status,
        String createdAt
) {
}
