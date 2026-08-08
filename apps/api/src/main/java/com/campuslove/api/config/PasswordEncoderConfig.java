package com.campuslove.api.config;

import com.campuslove.api.common.ErrorMessages;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 密码加密配置。
 *
 * <p>提供全局 {@link PasswordEncoder} Bean，基于 BCrypt 算法对管理员密码进行加密存储与校验。</p>
 *
 * <p>修复说明：原 {@code RealAuthService#loginAsAdmin} 使用 {@code String.equals} 明文比较密码，
 * 存在严重安全风险（明文密码泄露、时序攻击等）。此处引入 BCryptPasswordEncoder 替代明文比较，
 * 密码以 BCrypt 哈希形式存储（cost=10），校验时通过 {@link PasswordEncoder#matches} 完成。</p>
 *
 * <p>管理员密码的 BCrypt 哈希通过环境变量 {@code ADMIN_PASSWORD} 配置（注意：值必须为 BCrypt 哈希，
 * 而非明文）。如需生成哈希，可调用 {@link #encodePassword(String)} 工具方法。</p>
 *
 * <p>Task 11.3 安全审计复核结论：
 * <ul>
 *   <li><b>算法</b>：BCrypt（{@link BCryptPasswordEncoder}），自适应哈希，对 GPU/ASIC 暴力破解
 *       具备较强抗性，OWASP 推荐的密码哈希算法之一</li>
 *   <li><b>强度</b>：cost factor = {@value #BCRYPT_STRENGTH}，对应 2^10=1024 轮迭代，
 *       在主流 CPU 上单次哈希耗时约 100ms，兼顾安全与登录吞吐</li>
 *   <li><b>盐值</b>：每次哈希自动生成随机 salt 并内嵌于哈希结果（{@code $2a$10$...}），
 *       相同明文每次生成不同哈希，无需单独存储 salt</li>
 *   <li><b>抗暴力破解</b>：cost factor 可随硬件升级平滑提升，未来若需要更强的抗破解能力，
 *       只需调高 {@code BCRYPT_STRENGTH} 常量并重新生成哈希即可（旧哈希在 matches 时
 *       仍可识别其内嵌 cost，平滑兼容）</li>
 *   <li><b>对比 PBKDF2/scrypt/argon2</b>：BCrypt 在 JDK 生态与 Spring Security 中
 *       开箱即用、无外部依赖，对于本项目当前规模与运维成本是合理选择；
 *       若未来对 GPU 并行破解有更高敏感度，可评估迁移至 argon2</li>
 * </ul>
 * </p>
 */
@Configuration
public class PasswordEncoderConfig {

    /**
     * BCrypt 加密强度（cost factor）。
     *
     * <p>Task 11.3：取值 10 满足 OWASP 2023 推荐下限（>= 10），
     * 单次哈希耗时约 100ms，对单次登录场景可接受；若部署到高算力环境，
     * 可调高至 12（耗时约 400ms）以提升抗暴力破解能力，但需同步评估登录吞吐影响。</p>
     *
     * <p><b>不可低于 10</b>：低于该值将被视为弱配置（详见 AdminPasswordValidator 强密码策略
     * 与 SecurityConfig 安全审计）。</p>
     */
    private static final int BCRYPT_STRENGTH = 10;

    /**
     * 全局 {@link PasswordEncoder} Bean，基于 BCrypt 算法。
     *
     * <p>所有需要密码加密/校验的服务（如 {@code RealAuthService}）均通过依赖注入获取此实例，
     * 避免在业务代码中直接 new BCryptPasswordEncoder，便于统一调整加密参数。</p>
     *
     * @return 基于 BCrypt 的 PasswordEncoder 实例
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

    /**
     * 工具方法：将明文密码编码为 BCrypt 哈希。
     *
     * <p>供管理员账号创建/重置密码场景调用，确保密码以哈希形式存储到数据库或配置中。
     * 每次调用生成随机 salt，因此相同明文每次生成的哈希不同，但都能通过 {@link PasswordEncoder#matches} 校验。</p>
     *
     * <p>使用示例（生成 ADMIN_PASSWORD 环境变量值）：
     * <pre>{@code
     * String hash = PasswordEncoderConfig.encodePassword("Admin@2026");
     * // 将 hash 设置到环境变量 ADMIN_PASSWORD
     * }</pre>
     *
     * @param rawPassword 明文密码，不能为 null
     * @return BCrypt 哈希字符串，格式为 {@code $2a$10$...}
     */
    public static String encodePassword(String rawPassword) {
        if (rawPassword == null) {
            throw new IllegalArgumentException(ErrorMessages.RAW_PASSWORD_NOT_NULL);
        }
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH).encode(rawPassword);
    }
}
