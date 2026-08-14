package com.campuslove.api.verification;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 实名认证控制器（B1-2）。
 *
 * <p>提供：</p>
 * <ul>
 *   <li>GET /api/v1/real-name-certification —— 查询当前用户实名认证申请与状态</li>
 *   <li>POST /api/v1/real-name-certification —— 提交/更新实名认证申请</li>
 * </ul>
 *
 * <p>用户 ID 从 JWT 认证上下文获取（{@link SecurityUtils#getCurrentUserId()}），
 * 需登录（/api/v1/** authenticated 规则 + @PreAuthorize 双重保障）。</p>
 *
 * <p>安全说明：身份证号在服务层经 AES-GCM 加密落库；响应视图仅返回脱敏号码。</p>
 */
@Tag(name = "RealNameCertification", description = "实名认证：申请提交与状态查询")
@RestController
@RequestMapping("/api/v1/real-name-certification")
public class RealNameCertificationController {

    private final RealNameCertificationService realNameCertificationService;

    public RealNameCertificationController(RealNameCertificationService realNameCertificationService) {
        this.realNameCertificationService = realNameCertificationService;
    }

    /**
     * 查询当前用户的实名认证申请与状态。
     *
     * @return 申请视图；未提交过申请时 status 为 null（前端映射为 unverified）
     */
    @GetMapping
    @Operation(summary = "查询实名认证状态", description = "返回当前用户的实名认证申请与状态（PENDING/APPROVED/REJECTED），未提交时 status 为 null")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<RealNameCertificationView> getStatus() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(realNameCertificationService.getStatus(userId));
    }

    /**
     * 提交/更新实名认证申请。
     *
     * <p>速率限制：桶容量 5，每 60 秒补充 1 个令牌，按客户端 IP 限流，
     * 防止认证申请滥用（与校园认证 submitCertification 同口径）。</p>
     *
     * @param request 申请请求体（userName/idCardNo/idCardFrontUrl/idCardBackUrl）
     * @return 申请视图（PENDING）
     */
    @PostMapping
    @Operation(summary = "提交实名认证申请", description = "提交姓名、身份证号与正反面照片；未满 18 周岁或已认证（APPROVED）时返回业务错误")
    @RateLimit(capacity = 5, refillTokens = 0.05, key = "#request.remoteAddr")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<RealNameCertificationView> submit(@Valid @RequestBody RealNameCertificationRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        RealNameCertificationView view = realNameCertificationService.submit(
                userId,
                request.userName(),
                request.idCardNo(),
                request.idCardFrontUrl(),
                request.idCardBackUrl());
        return ApiResponse.ok(view);
    }
}

/**
 * 实名认证提交请求体。
 *
 * @param userName        真实姓名（1-64 字）
 * @param idCardNo        身份证号（15 位或 18 位，末位可为 X/x）
 * @param idCardFrontUrl  身份证人像面（正面）照片 URL（1-2048 字）
 * @param idCardBackUrl   身份证国徽面（背面）照片 URL（1-2048 字）
 */
record RealNameCertificationRequest(
        @NotBlank @Size(min = 1, max = 64) String userName,
        @NotBlank @Pattern(regexp = "^\\d{15}$|^\\d{17}[\\dXx]$",
                message = ErrorMessages.ID_CARD_FORMAT_INVALID) String idCardNo,
        @NotBlank @Size(max = 2048) String idCardFrontUrl,
        @NotBlank @Size(max = 2048) String idCardBackUrl
) {
}
