package com.campuslove.api.verification;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 恋爱认证控制器（3-A）。
 *
 * <p>提供：</p>
 * <ul>
 *   <li>GET /api/v1/verification —— 查询当前用户恋爱认证申请与状态</li>
 *   <li>POST /api/v1/verification —— 提交/更新恋爱认证申请</li>
 * </ul>
 *
 * <p>用户 ID 从 JWT 认证上下文获取（{@link SecurityUtils#getCurrentUserId()}），
 * 需登录（real profile 由 {@code /api/v1/**} authenticated 规则 + @PreAuthorize 双重保障；
 * mock profile 由 MockSecurityConfig 自动注入 ROLE_USER）。</p>
 */
@Tag(name = "Verification", description = "恋爱认证：申请提交与状态查询")
@RestController
@RequestMapping("/api/v1/verification")
public class LoveVerificationController {

    private final LoveVerificationService verificationService;

    public LoveVerificationController(LoveVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    /**
     * 查询当前用户的恋爱认证申请与状态。
     *
     * @return 申请视图；未提交过申请时 status 为 null（前端映射为 unverified）
     */
    @GetMapping
    @Operation(summary = "查询恋爱认证状态", description = "返回当前用户的恋爱认证申请与状态（pending/approved/rejected），未提交时 status 为 null")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LoveVerificationView> getStatus() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(verificationService.getStatus(userId));
    }

    /**
     * 提交/更新恋爱认证申请。
     *
     * <p>速率限制：桶容量 5，每 60 秒补充 1 个令牌，按客户端 IP 限流，
     * 防止认证申请滥用（与校园认证 submitCertification 同口径）。</p>
     *
     * @param request 申请请求体（studentName/studentId/schoolName/studentIdCardUrl）
     * @return 申请视图（pending）
     */
    @PostMapping
    @Operation(summary = "提交恋爱认证申请", description = "提交学生证照片与身份信息；已认证（approved）时返回业务冲突错误")
    @RateLimit(capacity = 5, refillTokens = 0.05, key = "#request.remoteAddr")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LoveVerificationView> submit(@Valid @RequestBody LoveVerificationRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        LoveVerificationView view = verificationService.submit(
                userId,
                request.studentName(),
                request.studentId(),
                request.schoolName(),
                request.studentIdCardUrl());
        return ApiResponse.ok(view);
    }
}

/**
 * 恋爱认证提交请求体。
 *
 * @param studentName      学生姓名（1-64 字）
 * @param studentId        学号（1-64 字）
 * @param schoolName       学校名称（1-128 字）
 * @param studentIdCardUrl 学生证照片 URL（1-2048 字）
 */
record LoveVerificationRequest(
        @NotBlank @Size(min = 1, max = 64) String studentName,
        @NotBlank @Size(min = 1, max = 64) String studentId,
        @NotBlank @Size(min = 1, max = 128) String schoolName,
        @NotBlank @Size(max = 2048) String studentIdCardUrl
) {
}
