package com.campuslove.api.village;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Report;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.ReportRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 帖子举报控制器。
 * <p>提供针对帖子的举报接口，复用 {@link Report} 实体与 {@link ReportRepository} 持久化。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>POST /api/posts/{id}/report：举报指定帖子</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径在 SecurityConfig 中要求已认证，
 * 举报人 ID 从 JWT 认证上下文中获取，避免客户端伪造。</p>
 *
 * <p>事务处理：举报创建使用 @Transactional 保证原子性。</p>
 *
 * <p>错误处理：帖子不存在或参数非法抛出 IllegalArgumentException（400）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/posts")
public class PostReportController {

    private static final Logger log = LoggerFactory.getLogger(PostReportController.class);

    /** 举报目标类型：帖子 */
    private static final String TARGET_TYPE_POST = "POST";

    /** 举报初始状态：待处理 */
    private static final String STATUS_PENDING = "PENDING";

    private final ReportRepository reportRepository;
    private final PostRepository postRepository;

    public PostReportController(ReportRepository reportRepository,
                                PostRepository postRepository) {
        this.reportRepository = reportRepository;
        this.postRepository = postRepository;
    }

    /**
     * 举报帖子。
     * <p>校验帖子存在性后，创建举报记录并持久化。</p>
     *
     * @param postId  帖子 ID（URL 路径参数）
     * @param request 举报请求体（含原因与详细描述）
     * @return 举报视图
     * @throws IllegalArgumentException 帖子不存在或参数非法时抛出
     */
    @PostMapping("/{id}/report")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<PostReportView> reportPost(
            @PathVariable("id") @Positive Long postId,
            @Valid @RequestBody PostReportRequest request) {
        Long reporterId = SecurityUtils.getCurrentUserId();

        // 校验帖子存在性
        if (postId == null || postId <= 0) {
            throw new IllegalArgumentException(ErrorMessages.POST_ID_INVALID);
        }
        if (!postRepository.existsById(postId)) {
            throw new IllegalArgumentException(ErrorMessages.POST_NOT_FOUND_OR_DELETED);
        }

        try {
            Report report = new Report();
            report.setTargetType(TARGET_TYPE_POST);
            report.setTargetId(postId);
            report.setReporterId(reporterId);
            report.setReason(request.reason());
            report.setDescription(request.description());
            report.setStatus(STATUS_PENDING);
            report.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));

            Report saved = reportRepository.save(report);
            log.info("帖子举报创建：reportId={}, postId={}, reporterId={}, reason={}",
                    saved.getId(), postId, reporterId, request.reason());

            return ApiResponse.ok(new PostReportView(
                    saved.getId(),
                    saved.getTargetId(),
                    saved.getReporterId(),
                    saved.getReason(),
                    saved.getDescription(),
                    saved.getStatus(),
                    saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null
            ));
        } catch (DataAccessException e) {
            log.error("帖子举报创建失败：postId={}, reporterId={}", postId, reporterId, e);
            throw new RuntimeException(ErrorMessages.REPORT_SUBMIT_FAILED_RETRY, e);
        }
    }
}

/**
 * 帖子举报请求体。
 *
 * @param reason      举报原因（简短分类，最长 64 字符）
 * @param description 详细描述（可选，最长 500 字符）
 */
record PostReportRequest(
        @NotBlank
        @Size(max = 64) String reason,
        @Size(max = 500) String description
) {
}

/**
 * 帖子举报视图。
 *
 * @param id          举报 ID
 * @param postId      被举报帖子 ID
 * @param reporterId  举报人用户 ID
 * @param reason      举报原因
 * @param description 详细描述
 * @param status      处理状态：PENDING/HANDLED/REJECTED
 * @param createdAt   创建时间（ISO 字符串）
 */
record PostReportView(
        Long id,
        Long postId,
        Long reporterId,
        String reason,
        String description,
        String status,
        String createdAt
) {
}
