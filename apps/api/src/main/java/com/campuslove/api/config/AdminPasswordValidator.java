package com.campuslove.api.config;

import jakarta.annotation.PostConstruct;
import java.util.regex.Pattern;
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
 *
 * <p>Task 11.2 新增强密码策略校验：
 * <ul>
 *   <li>至少 12 位</li>
 *   <li>必须同时包含大写字母、小写字母、数字、特殊字符</li>
 *   <li>特殊字符集合：{@code !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?}</li>
 *   <li>校验失败抛 {@link IllegalArgumentException}（便于密码修改/重置场景复用）</li>
 * </ul>
 * 启动时若提供明文环境变量 {@code ADMIN_PASSWORD_PLAIN}（仅用于强密码策略校验，不参与登录），
 * 将立即执行强密码校验；不通过则拒绝启动。生产环境若不便提供明文，
 * 也可在创建/重置管理员密码时调用 {@link #validatePasswordStrength(String)} 进行校验。</p>
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
     * Task 11.2：强密码正则。
     *
     * <p>规则：
     * <ul>
     *   <li>{@code (?=.*[a-z])} —— 至少一个小写字母</li>
     *   <li>{@code (?=.*[A-Z])} —— 至少一个大写字母</li>
     *   <li>{@code (?=.*\d)}    —— 至少一个数字</li>
     *   <li>{@code (?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])} —— 至少一个特殊字符</li>
     *   <li>{@code .{12,}}      —— 长度至少 12 位</li>
     * </ul>
     * </p>
     *
     * <p>特殊字符集合涵盖键盘上常见的符号，与任务约定一致。</p>
     */
    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{12,}$");

    /**
     * Task 11.2：强密码策略校验失败时的标准错误消息。
     */
    private static final String STRONG_PASSWORD_ERROR_MESSAGE =
            "Admin password must be at least 12 characters with uppercase, lowercase, digit, and special character";

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
     * Task 11.2：可选的管理员明文密码环境变量，仅用于启动时强密码策略校验。
     *
     * <p>不参与登录鉴权（登录使用 BCrypt 哈希比对），仅供运维在部署阶段强制
     * 校验所配置的明文密码是否符合强密码策略。生产环境若不便提供，可留空，
     * 由创建/重置密码流程调用 {@link #validatePasswordStrength(String)} 兜底校验。</p>
     */
    @Value("${app.admin.password-plain:${ADMIN_PASSWORD_PLAIN:}}")
    private String adminPasswordPlain;

    /**
     * 启动后校验管理员密码哈希是否为已知的弱默认值。
     * 检测到弱密码时：
     * <ul>
     *   <li>strictPassword=true（默认）：抛出 IllegalStateException 拒绝启动</li>
     *   <li>strictPassword=false：仅打印警告日志，允许启动（仅开发环境）</li>
     * </ul>
     *
     * <p>Task 11.2：若提供明文环境变量 ADMIN_PASSWORD_PLAIN，则同步执行强密码策略校验，
     * 不通过则直接抛 IllegalArgumentException 拒绝启动（不受 strictPassword 影响，
     * 因为这是显式提供的明文密码，必须满足策略）。</p>
     */
    @PostConstruct
    public void validate() {
        // Task 11.2：明文密码强策略校验（优先于哈希校验）
        if (adminPasswordPlain != null && !adminPasswordPlain.isBlank()) {
            validatePasswordStrength(adminPasswordPlain);
            log.info("管理员明文密码强策略校验通过");
        }

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

    /**
     * Task 11.2：校验明文密码是否符合强密码策略。
     *
     * <p>校验规则：
     * <ul>
     *   <li>长度 ≥ 12 位</li>
     *   <li>至少包含一个大写字母、一个小写字母、一个数字、一个特殊字符</li>
     *   <li>特殊字符集合：{@code !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?}</li>
     * </ul>
     * </p>
     *
     * <p>适用场景：
     * <ul>
     *   <li>启动时校验环境变量 {@code ADMIN_PASSWORD_PLAIN} 提供的明文密码</li>
     *   <li>管理员创建/重置密码接口调用此方法做前置校验</li>
     *   <li>任何需要将明文密码转为 BCrypt 哈希前的入口校验</li>
     * </ul>
     * </p>
     *
     * @param plaintextPassword 待校验的明文密码，不能为 null
     * @throws IllegalArgumentException 密码为 null 或不符合强密码策略时抛出
     */
    public static void validatePasswordStrength(String plaintextPassword) {
        if (plaintextPassword == null) {
            throw new IllegalArgumentException(STRONG_PASSWORD_ERROR_MESSAGE);
        }
        if (!STRONG_PASSWORD_PATTERN.matcher(plaintextPassword).matches()) {
            throw new IllegalArgumentException(STRONG_PASSWORD_ERROR_MESSAGE);
        }
    }

    // === 测试用 setter ===
    void setAdminPasswordHash(String hash) {
        this.adminPasswordHash = hash;
    }

    void setStrictPassword(boolean strict) {
        this.strictPassword = strict;
    }

    /**
     * Task 11.2：测试用 setter，用于注入明文密码做单元测试。
     *
     * @param plain 明文密码
     */
    void setAdminPasswordPlain(String plain) {
        this.adminPasswordPlain = plain;
    }
}
