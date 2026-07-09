package com.campuslove.api.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * JwtConfig 启动校验逻辑单元测试。
 *
 * <p>覆盖 {@link JwtConfig#validateSecret()} 的所有校验分支：
 * <ul>
 *   <li>JWT_SECRET 未配置（null/空/空白）→ 启动失败抛 IllegalStateException</li>
 *   <li>JWT_SECRET 长度 &lt; 32 字符 → 启动失败（HS256 安全要求）</li>
 *   <li>JWT_SECRET 为已知不安全默认值 → 启动失败</li>
 *   <li>JWT_SECRET 合法（>= 32 字符且非默认值）→ 正常初始化</li>
 * </ul>
 */
class JwtConfigTest {

    /** 合法密钥：>= 32 字符的随机串，非已知不安全默认值 */
    private static final String VALID_SECRET = "a-very-secure-jwt-secret-key-with-32+chars";

    @Test
    void validateSecret_withNullSecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret(null);
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withEmptySecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret("");
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withBlankSecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret("   ");
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withShortSecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        // 12 字符，远小于 32 字符的 HS256 安全要求
        config.setSecret("short-secret");
        IllegalStateException ex = assertThrows(IllegalStateException.class, config::validateSecret);
        // 错误信息应提示长度要求
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("32"));
    }

    @Test
    void validateSecret_withExact32CharsSecret_shouldPass() {
        JwtConfig config = new JwtConfig();
        // 恰好 32 字符（边界值）
        config.setSecret("01234567890123456789012345678901");
        assertDoesNotThrow(config::validateSecret);
    }

    @Test
    void validateSecret_withUnsafeDefaultChangeMe_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret("change-me");
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withUnsafeDefaultSecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret("secret");
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withUnsafeDefaultJwtSecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret("jwt-secret");
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withUnsafeDefaultCampusLoveSecret_shouldThrowIllegalStateException() {
        JwtConfig config = new JwtConfig();
        config.setSecret("campus-love-default-secret-key-change-in-production");
        assertThrows(IllegalStateException.class, config::validateSecret);
    }

    @Test
    void validateSecret_withValidSecret_shouldPassWithoutException() {
        JwtConfig config = new JwtConfig();
        config.setSecret(VALID_SECRET);
        assertDoesNotThrow(config::validateSecret);
    }

    @Test
    void validateSecret_withLongValidSecret_shouldPassWithoutException() {
        JwtConfig config = new JwtConfig();
        // 48 字符的 Base64 风格密钥
        config.setSecret("ZmYxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnh5emFiY2RlZmdo");
        assertDoesNotThrow(config::validateSecret);
    }
}