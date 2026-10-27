package com.campuslove.api.config;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.utils.SensitiveDataMasker;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 管理员口令启动审计（2026-10-25 P0 收口）。
 *
 * <p>背景：历史迁移曾把公开口令写入 active 的 SUPER_ADMIN。仅在登录处拒绝非 BCrypt
 * 还不够——如果库里还留着一条 active 的公开哈希，任何尚未修复的登录路径都可能再次接受它。
 * 本审计在 Flyway 之后、应用对外服务之前扫描所有 active 后台账号，要求：</p>
 * <ul>
 *   <li>password 非空；</li>
 *   <li>password 是合法 BCrypt 格式；</li>
 *   <li>password 不是已知泄露/默认弱口令哈希。</li>
 * </ul>
 *
 * <p>不合规时默认 fail-fast（{@code app.admin.db-password-audit=fail}）；
 * 本地开发可显式置 {@code warn} 或 {@code off}，但生产不得关闭。
 * disabled 账号不参与判定——它们已无法登录，重新启用时必须先写入新的 BCrypt 哈希。</p>
 */
@Component
@Profile("real")
public class AdminCredentialAudit implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminCredentialAudit.class);

    private static final List<String> ADMIN_ROLES = List.of("ADMIN", "SUPER_ADMIN", "AUDITOR");

    private final UserRepository userRepository;
    private final String mode;

    public AdminCredentialAudit(
            UserRepository userRepository,
            @Value("${app.admin.db-password-audit:fail}") String mode) {
        this.userRepository = userRepository;
        this.mode = mode;
    }

    @Override
    public void run(ApplicationArguments args) {
        if ("off".equalsIgnoreCase(mode)) {
            log.warn("管理员口令启动审计被显式关闭（app.admin.db-password-audit=off）");
            return;
        }

        List<User> admins = userRepository.findByRoleIn(ADMIN_ROLES);
        List<User> activeAdmins = admins == null
                ? List.of()
                : admins.stream().filter(user -> !user.isDisabled()).toList();
        List<String> offenders = activeAdmins.stream()
                .filter(this::hasUnsafePassword)
                .map(user -> "userId=" + user.getId()
                        + ",openid=" + SensitiveDataMasker.mask(user.getOpenid()))
                .collect(Collectors.toList());

        if (offenders.isEmpty()) {
            log.info("管理员口令启动审计通过：active 后台账号 {} 个，均为 BCrypt 且非已知泄露值",
                    activeAdmins.size());
            return;
        }

        String message = "管理员口令启动审计失败：检测到 " + offenders.size()
                + " 个 active 后台账号口令不合规（非 BCrypt、空或已知泄露值）["
                + String.join("; ", offenders)
                + "]。请通过受控重置写入新的 BCrypt 哈希；生产环境不得关闭本审计。";
        if ("warn".equalsIgnoreCase(mode)) {
            log.error(message);
            return;
        }
        throw new IllegalStateException(message);
    }

    private boolean hasUnsafePassword(User user) {
        String password = user.getPassword();
        return password == null
                || password.isBlank()
                || !AdminPasswordValidator.isBcryptHash(password)
                || AdminPasswordValidator.isCompromisedAdminPasswordHash(password);
    }
}
