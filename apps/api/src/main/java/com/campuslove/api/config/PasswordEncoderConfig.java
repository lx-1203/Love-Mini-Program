package com.campuslove.api.config;

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
 */
@Configuration
public class PasswordEncoderConfig {

    /**
     * BCrypt 加密强度（cost factor），取值 10 为推荐值。
     * 取值越高抗暴力破解能力越强，但耗时也越长；10 大约对应 ~100ms/次。
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
            throw new IllegalArgumentException("rawPassword 不能为 null");
        }
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH).encode(rawPassword);
    }
}
