package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.campus.CampusCertificationView;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.repository.CampusCertificationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 校园认证审核控制器。
 * 提供待审核列表、审核通过/拒绝等管理功能。
 * 当前实现：任何已认证用户可访问（简易版），生产环境应增加角色校验。
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin/certifications")
public class AdminCertificationController {

    private final CampusCertificationService certService;
    private final CampusCertificationRepository certRepository;

    public AdminCertificationController(
            CampusCertificationService certService,
            CampusCertificationRepository certRepository) {
        this.certService = certService;
        this.certRepository = certRepository;
    }

    /**
     * 获取认证列表（支持按状态筛选）。
     * 默认返回所有待审核的认证申请。
     */
    @GetMapping
    public ResponseEntity<List<CampusCertificationView>> listCertifications(
            @RequestParam(name = "status", defaultValue = "PENDING") String status) {
        // 验证当前用户已登录
        SecurityUtils.getCurrentUserId();

        List<CampusCertification> certifications;
        if ("ALL".equalsIgnoreCase(status)) {
            certifications = certRepository.findAllByOrderBySubmittedAtDesc();
        } else {
            certifications = certRepository.findByStatusOrderBySubmittedAtDesc(status);
        }

        List<CampusCertificationView> views = certifications.stream()
                .map(this::toView)
                .toList();

        return ResponseEntity.ok(views);
    }

    /**
     * 审核认证申请（通过或拒绝）。
     * <p>添加 @Auditable 注解作为示范：AOP 切面将自动记录审核操作到 audit_log 表，
     * 切面会从 @PathVariable 提取 certId 作为 targetId，从 @RequestBody 提取并脱敏请求体。</p>
     * <p>其他管理端 Controller（AdminUserController/AdminPostController 等）创建时，
     * 应在写操作方法上添加 @Auditable 注解，参见 AuditOperation 枚举与 AuditLogAspect 文档。</p>
     */
    @Auditable(value = AuditOperation.REVIEW_CERTIFICATION, targetType = "CERTIFICATION")
    @PostMapping("/{id}/review")
    public ResponseEntity<CampusCertificationView> reviewCertification(
            @PathVariable("id") Long certId,
            @Valid @RequestBody ReviewCertificationRequest req) {
        Long reviewerId = SecurityUtils.getCurrentUserId();

        try {
            CampusCertificationView result = certService.reviewCertification(
                    certId, req.status(), reviewerId, req.comment());
            return ResponseEntity.ok(result);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 将 Entity 转换为 View。
     */
    private CampusCertificationView toView(CampusCertification entity) {
        return new CampusCertificationView(
                entity.getId(),
                entity.getUserId(),
                entity.getSchoolName(),
                entity.getMajor(),
                entity.getStudentIdCardUrl(),
                entity.getStatus(),
                CampusCertificationView.toStatusLabel(entity.getStatus()),
                entity.getReviewerId(),
                entity.getReviewComment(),
                entity.getSubmittedAt(),
                entity.getReviewedAt()
        );
    }
}

/**
 * 审核认证请求体。
 */
record ReviewCertificationRequest(
    @NotBlank String status,
    String comment
) {}
