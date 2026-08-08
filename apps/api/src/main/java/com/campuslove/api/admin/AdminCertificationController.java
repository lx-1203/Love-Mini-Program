package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.campus.CampusCertificationView;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.repository.CampusCertificationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
 *
 * <p>数据隔离（商业模式：每个高校一个管理员，委托 {@link AdminDataScope}）：</p>
 * <ul>
 *   <li>列表：campus_certifications 表无 campus_name 列，按<b>申请人所属校区</b>过滤
 *       （申请人校区取自 user_campus_profile.campus_name，与 AdminUserController 语义一致）；
 *       校区管理员强制按其管辖校区过滤（忽略调用方 campusName 参数），
 *       全局管理员（SUPER_ADMIN 或 ADMIN 无校区）可用 campusName 参数筛选</li>
 *   <li>审核：读取目标认证记录后按申请人校区调用
 *       {@link AdminDataScope#assertCampusAccess(String)} 校验越权，越权抛 403</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/certifications")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCertificationController {

    private final CampusCertificationService certService;
    private final CampusCertificationRepository certRepository;
    /** 管理端数据隔离（多管理员多校区） */
    private final AdminDataScope adminDataScope;

    public AdminCertificationController(
            CampusCertificationService certService,
            CampusCertificationRepository certRepository,
            AdminDataScope adminDataScope) {
        this.certService = certService;
        this.certRepository = certRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 获取认证列表（支持按状态/校区筛选）。
     * 默认返回所有待审核的认证申请。
     *
     * <p>R4-00386：新增分页参数 page/size（默认 size 1000，上限 5000）——
     * 认证申请量大时避免一次性全量返回拖慢后台；响应仍为列表结构
     * （兼容现有管理端契约），后续管理端可扩展完整分页交互。</p>
     *
     * @param status     认证状态筛选：PENDING / APPROVED / REJECTED / ALL，默认 PENDING
     * @param campusName 校区筛选（按申请人所属校区过滤），可选；
     *                   校区管理员强制按其管辖校区过滤，忽略本参数
     * @param page       页码（从 0 开始，默认 0）
     * @param size       每页大小（默认 1000，最大 5000）
     * @return 认证记录列表（分页截断）
     */
    @GetMapping
    public ResponseEntity<List<CampusCertificationView>> listCertifications(
            @RequestParam(name = "status", defaultValue = "PENDING") String status,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", required = false, defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(name = "size", required = false, defaultValue = "1000") @Min(1) @Max(5000) int size) {
        // 验证当前用户已登录
        SecurityUtils.getCurrentUserId();

        // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName，
        // 防止校区管理员越权查看其他校区的认证申请（与 AdminUserController.listUsers 一致）
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        String effectiveCampus = scopedCampus != null
                ? scopedCampus
                : normalize(campusName);

        String normalizedStatus = normalize(status);
        if (normalizedStatus == null) {
            normalizedStatus = "PENDING";
        } else {
            // 统一转大写：兼容原实现 "ALL".equalsIgnoreCase(status) 的大小写不敏感语义
            normalizedStatus = normalizedStatus.toUpperCase();
        }
        // R4-00386：分页查询（page 从 0 开始），响应保持列表结构兼容管理端
        var certPage = certRepository.searchForAdminPage(normalizedStatus, effectiveCampus,
                org.springframework.data.domain.PageRequest.of(page, size));

        List<CampusCertificationView> views = certPage.getContent().stream()
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
            @PathVariable("id") @Positive Long certId,
            @Valid @RequestBody ReviewCertificationRequest req) {
        Long reviewerId = SecurityUtils.getCurrentUserId();

        // 数据隔离：校区管理员仅能审核本校区用户的认证申请，越权抛 403
        Optional<CampusCertification> certOpt = certRepository.findById(certId);
        if (certOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        adminDataScope.assertCampusAccess(
                adminDataScope.resolveUserCampusName(certOpt.get().getUserId()));

        try {
            CampusCertificationView result = certService.reviewCertification(
                    certId, req.status(), reviewerId, req.comment());
            return ResponseEntity.ok(result);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 空串转 null 归一化。
     *
     * @param value 原始值
     * @return 去首尾空白后的值；null 或空白返回 null
     */
    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
    @NotBlank
    @Pattern(regexp = "APPROVED|REJECTED|PENDING", message = ErrorMessages.CERT_STATUS_INVALID)
    String status,
    @Size(max = 500) String comment
) {}
