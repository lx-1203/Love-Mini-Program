package com.campuslove.api.auth;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 账号安全控制器（3-B 修改密码 / 3-C 更换手机号 / 3-D 设备管理 / 3-E 注销账号）。
 *
 * <p>所有端点需登录（@PreAuthorize("hasRole('USER')")）。URL 层面
 * /api/v1/auth/** 为 permitAll（登录入口前缀），认证由方法级注解 + JWT 过滤器保障：
 * real profile 由 JwtAuthenticationFilter 注入认证上下文，mock profile 由
 * MockSecurityConfig 的 SECURED_AUTH_PATTERNS 对命中路径注入 ROLE_USER。</p>
 */
@Tag(name = "AccountSecurity", description = "账号安全：修改密码、更换手机号、设备管理、注销账号")
@RestController
@RequestMapping("/api/v1/auth")
public class AccountSecurityController {

    private final AccountSecurityService accountSecurityService;
    private final DeviceSessionService deviceSessionService;

    public AccountSecurityController(
            AccountSecurityService accountSecurityService,
            DeviceSessionService deviceSessionService) {
        this.accountSecurityService = accountSecurityService;
        this.deviceSessionService = deviceSessionService;
    }

    /**
     * 修改密码（3-B）。
     *
     * <p>验旧密码 → 更新 BCrypt 密码 → 吊销该用户全部 token（强制重新登录）。
     * 无密码账号（纯 wechat/apple 注册）返回明确业务错误（PASSWORD_NOT_SET 语义）。</p>
     *
     * @param authHeader Authorization 请求头（吊销当前会话用）
     * @param request    修改密码请求体（oldPassword + newPassword）
     * @return 统一成功响应
     */
    @PostMapping("/change-password")
    @Operation(summary = "修改密码", description = "校验旧密码后更新密码，并吊销该用户全部 token 强制重新登录")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> changePassword(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        accountSecurityService.changePassword(
                userId, request.oldPassword(), request.newPassword(), extractBearerToken(authHeader));
        return ApiResponse.empty();
    }

    /**
     * 更换手机号（3-C）。
     *
     * <p>本期实现「验旧密码」路径（password 必填）；请求体预留 verificationCode 字段
     * （后端当前无短信基础设施，字段可选，后续接入 SMS 服务无需改契约）。
     * 新手机号被占用返回业务错误码（409 RESOURCE_CONFLICT）。</p>
     *
     * @param request 更换手机号请求体（password + newPhone + verificationCode?）
     * @return 统一成功响应
     */
    @PostMapping("/change-phone")
    @Operation(summary = "更换手机号", description = "验旧密码后更换手机号；新手机号被占用返回业务冲突错误。verificationCode 字段预留（后续短信验证）")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> changePhone(@Valid @RequestBody ChangePhoneRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        accountSecurityService.changePhone(userId, request.password(), request.newPhone());
        return ApiResponse.empty();
    }

    /**
     * 查询当前用户的设备列表（3-D）。
     *
     * @return 设备列表（含已吊销，按最近活跃时间倒序）
     */
    @GetMapping("/devices")
    @Operation(summary = "设备列表", description = "返回当前用户的登录设备列表（含已吊销，前端置灰展示）")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<UserDeviceSessionView>> listDevices() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(deviceSessionService.listDevices(userId));
    }

    /**
     * 吊销指定设备（3-D）。
     *
     * <p>校验设备属主（非本人设备 403），置 revoked=true 并将该设备 token 加入黑名单。
     * 已吊销设备重复吊销为幂等成功。</p>
     *
     * @param deviceId 设备记录 ID
     * @return 统一成功响应
     */
    @PostMapping("/devices/{id}/revoke")
    @Operation(summary = "吊销设备", description = "吊销指定设备：校验属主、标记 revoked 并使该设备 token 立即失效")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> revokeDevice(@PathVariable("id") Long deviceId) {
        Long userId = SecurityUtils.getCurrentUserId();
        deviceSessionService.revokeDevice(userId, deviceId);
        return ApiResponse.empty();
    }

    /**
     * 注销账号（3-E，幂等）。
     *
     * <p>验旧密码（无密码账号以 confirmationText 替代）→ status=deactivated +
     * 个人数据匿名化（昵称/头像/手机号脱敏）→ 吊销该用户全部 token。
     * 已注销账号重复注销幂等返回成功。</p>
     *
     * @param authHeader Authorization 请求头（吊销当前会话用）
     * @param request    注销请求体（password? + confirmationText?）
     * @return 统一成功响应
     */
    @PostMapping("/deactivate")
    @Operation(summary = "注销账号", description = "校验凭据后注销账号并匿名化个人数据；幂等，已注销账号重复调用直接成功")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> deactivate(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @Valid @RequestBody DeactivateRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        accountSecurityService.deactivateAccount(
                userId, request.password(), request.confirmationText(), extractBearerToken(authHeader));
        return ApiResponse.empty();
    }

    /**
     * 从 Authorization 请求头中提取 Bearer token。
     */
    private String extractBearerToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}

/**
 * 修改密码请求体（3-B）。
 *
 * @param oldPassword 旧密码（不可为空）
 * @param newPassword 新密码（6-64 位）
 */
record ChangePasswordRequest(
        @NotBlank(message = ErrorMessages.OLD_PASSWORD_REQUIRED) @Size(max = 128, message = ErrorMessages.OLD_PASSWORD_MAX_LENGTH) String oldPassword,
        @NotBlank(message = ErrorMessages.NEW_PASSWORD_REQUIRED) @Size(min = 6, max = 64, message = ErrorMessages.NEW_PASSWORD_LENGTH_INVALID) String newPassword
) {
}

/**
 * 更换手机号请求体（3-C）。
 *
 * @param password         旧密码（本期「验旧密码」路径必填；无密码账号被拒绝）
 * @param verificationCode 短信验证码（预留字段：后端当前无短信基础设施，可选；
 *                         后续接入 SMS 服务无需改契约）
 * @param newPhone         新手机号（1[3-9] 开头 11 位）
 */
record ChangePhoneRequest(
        @NotBlank(message = ErrorMessages.PASSWORD_REQUIRED) @Size(max = 64, message = ErrorMessages.PASSWORD_LENGTH_ILLEGAL) String password,
        String verificationCode,
        @NotBlank(message = ErrorMessages.PHONE_REQUIRED) @Pattern(regexp = "^1[3-9]\\d{9}$", message = ErrorMessages.PHONE_FORMAT_INVALID) String newPhone
) {
}

/**
 * 注销账号请求体（3-E）。
 *
 * @param password         旧密码（有密码账号必填，由服务端校验）
 * @param confirmationText 注销确认文本（无密码账号——纯 wechat/apple 注册——必填，替代密码校验）
 */
record DeactivateRequest(
        @Size(max = 128, message = ErrorMessages.PASSWORD_MAX_LENGTH) String password,
        @Size(max = 64, message = ErrorMessages.NICKNAME_LENGTH_INVALID) String confirmationText
) {
}
