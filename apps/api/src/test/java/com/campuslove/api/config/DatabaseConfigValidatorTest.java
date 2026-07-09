package com.campuslove.api.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * DatabaseConfigValidator 启动校验逻辑单元测试。
 *
 * <p>覆盖 {@link DatabaseConfigValidator#validate()} 的所有校验分支：
 * <ul>
 *   <li>DB_PASSWORD 未配置（null/空/空白）→ 启动失败抛 IllegalStateException</li>
 *   <li>DB_USERNAME 未配置 → 启动失败</li>
 *   <li>DB_URL 未配置 → 启动失败</li>
 *   <li>所有凭据已配置 → 校验通过</li>
 * </ul>
 *
 * <p>测试通过包级 setter 注入字段值，模拟 @Value 注入的不同场景。
 */
class DatabaseConfigValidatorTest {

    private static final String VALID_URL = "jdbc:mysql://127.0.0.1:3306/qihang_platform";
    private static final String VALID_USERNAME = "root";
    private static final String VALID_PASSWORD = "secure-database-password";

    @Test
    void validate_withNullPassword_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(VALID_URL);
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword(null);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withEmptyPassword_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(VALID_URL);
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword("");
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withBlankPassword_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(VALID_URL);
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword("   ");
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withNullUsername_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(VALID_URL);
        validator.setDbUsername(null);
        validator.setDbPassword(VALID_PASSWORD);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withBlankUsername_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(VALID_URL);
        validator.setDbUsername("");
        validator.setDbPassword(VALID_PASSWORD);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withNullUrl_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(null);
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword(VALID_PASSWORD);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withEmptyUrl_shouldThrowIllegalStateException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl("");
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword(VALID_PASSWORD);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void validate_withAllCredentialsConfigured_shouldPassWithoutException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        validator.setDbUrl(VALID_URL);
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword(VALID_PASSWORD);
        assertDoesNotThrow(validator::validate);
    }

    @Test
    void validate_withUrlContainingCredentials_shouldPassWithoutException() {
        DatabaseConfigValidator validator = new DatabaseConfigValidator();
        // URL 中含查询参数（无凭据），应正常通过
        validator.setDbUrl("jdbc:mysql://127.0.0.1:3306/qihang_platform?useUnicode=true&characterEncoding=UTF-8");
        validator.setDbUsername(VALID_USERNAME);
        validator.setDbPassword(VALID_PASSWORD);
        assertDoesNotThrow(validator::validate);
    }
}