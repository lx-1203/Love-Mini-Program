package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 账号（个人）设置控制器。
 *
 * <p>提供管理员修改自身密码等个人账号操作，对齐 eladmin「用户管理 - 修改密码」能力。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>POST /api/v1/admin/account/change-password —— 修改当前管理员密码
 *       （校验旧密码，BCrypt 加密新密码落库，@Auditable 记录审计）</li>
 * </ul>
 *
 * <p>权限说明：</p>
 * <ul>
 *   <li>URL 层：SecurityConfig 已配置 /api/v1/admin/** 仅 ADMIN 角色可访问（real 模式）</li>
 *   <li>方法层：{@code @PreAuthorize("hasRole('SUPER_ADMIN')")} —— 改密属账号安全操作，仅超级管理员可执行</li>
 *   <li>mock 模式：MockSecurityConfig 全部放行，本控制器仅 real profile 加载</li>
 * </ul>
 *
 * <p>安全说明：</p>
 * <ul>
 *   <li>旧密码必须匹配（{@link PasswordEncoder#matches} BCrypt 校验），防越权改密</li>
 *   <li>新密码长度 6-64 位，BCrypt 加密存储（与管理员登录校验一致的哈希格式）</li>
 *   <li>请求体中的 password 字段由 {@link com.campuslove.api.admin.audit.AuditLogAspect}
 *       在写入审计日志前统一脱敏（SENSITIVE_FIELDS 含 password/oldpassword/newpassword）</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/account")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminAccountController {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountController.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 修改当前管理员密码。
     *
     * <p>流程：</p>
     * <ol>
     *   <li>从 SecurityContext 获取当前管理员 userId</li>
     *   <li>校验新密码长度（6-64 位）——显式校验以提供稳定错误消息，同时保留 {@code @Size} 兜底</li>
     *   <li>加载管理员账号，BCrypt 校验旧密码（不匹配则 400，防止越权改密）</li>
     *   <li>BCrypt 加密新密码并更新（乐观锁 @Version 由 JPA 自动维护），@Auditable 异步记录审计</li>
     * </ol>
     *
     * @param req 改密请求体（oldPassword + newPassword）
     * @return 标准成功响应
     */
    @PostMapping("/change-password")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CHANGE_PASSWORD, targetType = "ACCOUNT",
            description = "管理员修改自身密码")
    public ApiResponse<Map<String, Object>> changePassword(
            @Valid @RequestBody ChangePasswordRequest req) {
        Long adminId = SecurityUtils.getCurrentUserId();

        // 显式校验新密码长度（6-64 位），与注册/登录链路密码规则保持一致；
        // @Valid 的 @Size 在 Spring MVC 层生效，此处显式校验保证单元测试与统一错误文案
        if (req.newPassword() == null || req.newPassword().length() < 6 || req.newPassword().length() > 64) {
            throw new IllegalArgumentException("新密码长度须为 6-64 位");
        }

        // 加载当前管理员账号；理论上必存在（JWT 由登录签发），缺失视为数据异常
        Optional<User> userOpt = userRepository.findById(adminId);
        if (userOpt.isEmpty()) {
            log.warn("修改密码失败：管理员账号不存在, adminId={}", adminId);
            throw new IllegalArgumentException("管理员账号不存在");
        }
        User admin = userOpt.get();

        // 校验旧密码：存储哈希缺失（如历史明文遗留）时同样拒绝，强制走改密流程重建哈希
        String storedHash = admin.getPassword();
        if (storedHash == null || storedHash.isBlank()
                || !passwordEncoder.matches(req.oldPassword(), storedHash)) {
            log.warn("修改密码失败：旧密码错误, adminId={}", adminId);
            throw new IllegalArgumentException("旧密码错误");
        }

        // BCrypt 加密新密码并更新（创建/更新路径使用 save 返回值保持一致）
        admin.setPassword(passwordEncoder.encode(req.newPassword()));
        admin.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(admin);
        log.info("管理员修改密码成功, adminId={}", saved.getId());

        return ApiResponse.ok(Map.of("success", true));
    }
}

/**
 * 修改密码请求体。
 *
 * @param oldPassword 旧密码（不可为空）
 * @param newPassword 新密码（6-64 位，不可为空）
 */
record ChangePasswordRequest(
        @NotBlank(message = "旧密码不能为空")
        @Size(max = 128, message = "oldPassword 长度不能超过 128") String oldPassword,
        @NotBlank(message = "新密码不能为空")
        @Size(min = 6, max = 64, message = "新密码长度须为 6-64 位") String newPassword) {
}
