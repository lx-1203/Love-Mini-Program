package com.campuslove.api.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 管理员密码启动校验器。
 *
 * <p>修复：原 application-db.yml 中 admin_password_hash 提供了默认值（对应明文 "password"），
 * 生产环境若忘记配置 ADMIN_PASSWORD_HASH 环境变量，将使用弱默认密码启动，
 * 存在严重安全风险。</p>
 *
 * <p>本校验器在 real profile 下启动时检查 ADMIN_PASSWORD_HASH 是否为已知的默认弱哈希，
 * 若是则抛出 IllegalStateException 拒绝启动；mock profile 不激活（无数据库依赖）。</p>
 *
 * <p>已知弱默认值清单：
 * <ul>
 *   <li>{@code .20cQQubK3.HZWzG3YB1tlRy.fqvM/BG} —— application-db.yml 中的占位哈希</li>
 *   <li>{@code admin123} —— 报告中提到的明文默认密码（兼容校验）</li>
 * </ul>
 * </p>
 */
@Component
@Profile("!mock")
public class AdminPasswordValidator {

    private static final Logger log = LoggerFactory.getLogger(AdminPasswordValidator.class);

    /**
     * 已知的不安全默认管理员密码哈希/明文清单。
     * 启动时检测到这些值将拒绝启动。
     */
    private static final java.util.Set<String> UNSAFE_DEFAULT_ADMIN_PASSWORDS = java.util.Set.of(
            // application-db.yml 中的占位哈希（对应明文 "password"）
            ".20cQQubK3.HZWzG3YB1tlRy.fqvM/BG",
            // 报告中提到的明文默认密码
            "admin123",
            "admin",
            "password"
    );

    /**
     * 管理员密码哈希，由环境变量 ADMIN_PASSWORD_HASH 注入。
     * 默认值为 application-db.yml 中的占位哈希。
     */
    @Value("${spring.flyway.placeholders.admin_password_hash:}")
    private String adminPasswordHash;

    /**
     * 修复：是否在检测到弱密码时强制拒绝启动。
     * 默认 true（严格模式），开发环境可通过 APP_ADMIN_STRICT_PASSWORD=false 关闭。
     */
    @Value("${app.admin.strict-password:true}")
    private boolean strictPassword;

    /**
     * 启动后校验管理员密码哈希是否为已知的弱默认值。
     * 检测到弱密码时：
     * <ul>
     *   <li>strictPassword=true（默认）：抛出 IllegalStateException 拒绝启动</li>
     *   <li>strictPassword=false：仅打印警告日志，允许启动（仅开发环境）</li>
     * </ul>
     */
    @PostConstruct
    public void validate() {
        if (adminPasswordHash == null || adminPasswordHash.isBlank()) {
            if (strictPassword) {
                throw new IllegalStateException(
                        "ADMIN_PASSWORD_HASH 环境变量未配置，应用启动失败。"
                        + "请通过环境变量 ADMIN_PASSWORD_HASH 配置管理员密码的 BCrypt 哈希，"
                        + "生成方法：调用 PasswordEncoderConfig.encodePassword(明文密码)。"
                        + "开发环境可通过 APP_ADMIN_STRICT_PASSWORD=false 临时关闭此校验。");
            }
            log.warn("ADMIN_PASSWORD_HASH 未配置，使用默认弱密码启动（仅开发环境）");
            return;
        }
        if (UNSAFE_DEFAULT_ADMIN_PASSWORDS.contains(adminPasswordHash)) {
            String msg = "ADMIN_PASSWORD_HASH 配置为已知的弱默认值（" + adminPasswordHash + "），"
                    + "存在严重安全风险。请通过环境变量 ADMIN_PASSWORD_HASH 设置一个安全的 BCrypt 哈希。"
                    + "生成方法：调用 PasswordEncoderConfig.encodePassword(明文密码)。";
            if (strictPassword) {
                throw new IllegalStateException(msg);
            }
            log.warn(msg);
            return;
        }
        log.info("管理员密码哈希校验通过");
    }

    // === 测试用 setter ===
    void setAdminPasswordHash(String hash) {
        this.adminPasswordHash = hash;
    }

    void setStrictPassword(boolean strict) {
        this.strictPassword = strict;
    }
}
