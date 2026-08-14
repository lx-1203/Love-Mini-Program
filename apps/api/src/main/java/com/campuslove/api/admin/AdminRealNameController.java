package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.verification.RealNameCertification;
import com.campuslove.api.verification.RealNameCertificationRepository;
import com.campuslove.api.verification.RealNameCertificationService;
import com.campuslove.api.verification.RealNameCertificationView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
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
 * 管理后台 - 实名认证审核控制器（B1-2）。
 * 提供待审核列表、审核通过/拒绝等管理功能。
 *
 * <p>实名认证面向全局运营（不涉及校区数据隔离，与校园认证
 * {@link AdminCertificationController} 的 AdminDataScope 逻辑不同——身份证
 * 核验无校区维度），列表按状态筛选 + 分页，审核时校验仅 PENDING 可操作。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/real-name-certifications")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRealNameController {

    private final RealNameCertificationService realNameCertificationService;
    private final RealNameCertificationRepository repository;
    /** AES 加密器：列表脱敏身份证号（密文 → 解密 → 掩码） */
    private final AesEncryptor aesEncryptor;

    public AdminRealNameController(
            RealNameCertificationService realNameCertificationService,
            RealNameCertificationRepository repository,
            AesEncryptor aesEncryptor) {
        this.realNameCertificationService = realNameCertificationService;
        this.repository = repository;
        this.aesEncryptor = aesEncryptor;
    }

    /**
     * 获取实名认证列表（支持按状态筛选 + 分页）。
     * 默认返回所有待审核的认证申请；status 取值 PENDING/APPROVED/REJECTED/ALL。
     *
     * @param status 认证状态筛选：PENDING / APPROVED / REJECTED / ALL，默认 PENDING
     * @param page   页码（从 0 开始，默认 0）
     * @param size   每页大小（默认 20，最大 200）
     * @return 认证记录列表（分页截断）
     */
    @GetMapping
    public ResponseEntity<List<RealNameCertificationView>> listCertifications(
            @RequestParam(name = "status", defaultValue = "PENDING") String status,
            @RequestParam(name = "page", required = false, defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(200) int size) {
        // 验证当前用户已登录（ADMIN 角色由类级 @PreAuthorize 保障）
        SecurityUtils.getCurrentUserId();

        String normalizedStatus = status == null ? "PENDING" : status.trim().toUpperCase();
        var certPage = repository.searchForAdminPage(
                normalizedStatus,
                PageRequest.of(page, size));

        List<RealNameCertificationView> views = certPage.getContent().stream()
                .map(entity -> RealNameCertificationView.from(
                        entity,
                        RealNameCertificationView.maskIdCardNo(decryptIdCardNo(entity))))
                .toList();

        return ResponseEntity.ok(views);
    }

    /**
     * 解密实体中的身份证号密文并返回明文。
     * 解密失败（密钥轮换/数据篡改等）时返回空串（视图层掩码兜底），不阻塞列表。
     *
     * @param entity 认证实体
     * @return 明文身份证号；解密失败返回空串
     */
    private String decryptIdCardNo(RealNameCertification entity) {
        if (entity.getIdCardNo() == null || entity.getIdCardNo().isEmpty()) {
            return "";
        }
        try {
            return aesEncryptor.decrypt(entity.getIdCardNo());
        } catch (RuntimeException e) {
            return "";
        }
    }

    /**
     * 审核实名认证申请（通过或拒绝）。
     * 审核为 APPROVED 时由服务层置位 {@code user_basic_profile.id_card_verified}。
     */
    @PostMapping("/{id}/review")
    public ResponseEntity<RealNameCertificationView> reviewCertification(
            @PathVariable("id") @Positive Long certId,
            @Valid @RequestBody ReviewRealNameRequest req) {
        Long reviewerId = SecurityUtils.getCurrentUserId();

        try {
            RealNameCertificationView result = realNameCertificationService.review(
                    certId, req.status(), reviewerId, req.comment());
            return ResponseEntity.ok(result);
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}

/**
 * 实名认证审核请求体。
 *
 * @param status  审核结果（APPROVED 或 REJECTED）
 * @param comment 审核意见（最多 500 字）
 */
record ReviewRealNameRequest(
    @NotBlank
    @Pattern(regexp = "APPROVED|REJECTED", message = ErrorMessages.CERT_STATUS_INVALID)
    String status,
    @Size(max = 500) String comment
) {}
