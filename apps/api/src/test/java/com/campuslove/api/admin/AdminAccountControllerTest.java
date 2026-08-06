package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 管理后台 - 修改密码控制器单元测试（eladmin「修改密码」对齐，P1-A）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>改密成功：旧密码正确 → BCrypt 新哈希落库（可被 matches 校验）</li>
 *   <li>旧密码错误 → 400 业务异常（IllegalArgumentException）</li>
 *   <li>新密码过短（&lt;6 位）→ 400 业务异常</li>
 *   <li>未认证（SecurityUtils.getCurrentUserId 抛 401）→ 401</li>
 * </ul>
 */
class AdminAccountControllerTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final String OLD_PASSWORD = "Admin@2026";
    private static final String NEW_PASSWORD = "Admin@2027";

    @Mock private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AdminAccountController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // 使用真实 BCryptPasswordEncoder，便于验证哈希匹配逻辑
        passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        controller = new AdminAccountController(userRepository, passwordEncoder);
    }

    /** 构造带指定密码哈希的管理员用户 */
    private User adminWithPassword(String passwordHash) {
        User admin = new User();
        admin.setId(ADMIN_ID);
        admin.setOpenid("local-dev-admin-openid-123456");
        admin.setNickname("超级管理员");
        admin.setRole("SUPER_ADMIN");
        admin.setPassword(passwordHash);
        return admin;
    }

    @Test
    @DisplayName("改密成功：旧密码正确 → 新密码 BCrypt 哈希落库")
    void changePassword_withCorrectOldPassword_shouldPersistNewHash() {
        // Arrange
        User admin = adminWithPassword(passwordEncoder.encode(OLD_PASSWORD));
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(admin));
        // save 返回入参（模拟 JPA save 行为：实体回填后返回）
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        withUserId(ADMIN_ID, () -> {
            // Act
            controller.changePassword(new ChangePasswordRequest(OLD_PASSWORD, NEW_PASSWORD));

            // Assert：save 被调用，且新密码为可校验的 BCrypt 哈希（非明文、非旧哈希）
            verify(userRepository).save(admin);
            String storedHash = admin.getPassword();
            assertTrue(passwordEncoder.matches(NEW_PASSWORD, storedHash),
                    "新密码应以 BCrypt 哈希存储且可匹配");
            assertTrue(passwordEncoder.matches(OLD_PASSWORD, storedHash) == false,
                    "旧密码不应继续匹配新哈希");
        });
    }

    @Test
    @DisplayName("旧密码错误 → IllegalArgumentException（400）")
    void changePassword_withWrongOldPassword_shouldThrow() {
        // Arrange
        User admin = adminWithPassword(passwordEncoder.encode(OLD_PASSWORD));
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(admin));

        withUserId(ADMIN_ID, () -> {
            // Act & Assert
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.changePassword(new ChangePasswordRequest("wrong-old-password", NEW_PASSWORD)));
            assertEquals("旧密码错误", ex.getMessage());
        });
    }

    @Test
    @DisplayName("新密码过短（<6 位）→ IllegalArgumentException（400）")
    void changePassword_withShortNewPassword_shouldThrow() {
        // Arrange：即使旧密码正确，新密码长度非法也必须拒绝（不落库）
        User admin = adminWithPassword(passwordEncoder.encode(OLD_PASSWORD));
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(admin));

        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.changePassword(new ChangePasswordRequest(OLD_PASSWORD, "12345")));
            assertEquals("新密码长度须为 6-64 位", ex.getMessage());
        });
    }

    @Test
    @DisplayName("未认证（无当前用户）→ 401 Unauthorized")
    void changePassword_withoutAuthentication_shouldThrow401() {
        // SecurityUtils.getCurrentUserId 抛 401（ControllerTestBase.withoutUserId 模拟）
        withoutUserId(() -> {
            assertThrows(HttpClientErrorException.Unauthorized.class,
                    () -> controller.changePassword(new ChangePasswordRequest(OLD_PASSWORD, NEW_PASSWORD)));
        });
    }

    @Test
    @DisplayName("管理员账号不存在 → IllegalArgumentException（400）")
    void changePassword_withMissingAdmin_shouldThrow() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.empty());

        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.changePassword(new ChangePasswordRequest(OLD_PASSWORD, NEW_PASSWORD)));
            assertEquals("管理员账号不存在", ex.getMessage());
        });
    }

    @Test
    @DisplayName("存储哈希缺失（历史明文遗留）→ 拒绝修改")
    void changePassword_withNullStoredHash_shouldThrow() {
        // 历史数据无 password 字段时拒绝改密（强制走登录兜底/管理员重置流程）
        User admin = adminWithPassword(null);
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(admin));

        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.changePassword(new ChangePasswordRequest(OLD_PASSWORD, NEW_PASSWORD)));
            assertEquals("旧密码错误", ex.getMessage());
        });
    }
}
