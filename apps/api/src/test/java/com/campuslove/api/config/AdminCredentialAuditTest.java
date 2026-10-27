package com.campuslove.api.config;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 管理员口令启动审计回归测试。
 *
 * <p>核心不变量：active 后台账号的 password 必须是 BCrypt 且不是已知泄露值；
 * disabled 账号不参与判定；warn/off 只降级不改变判定本身。</p>
 */
class AdminCredentialAuditTest {

    private static final List<String> ADMIN_ROLES = List.of("ADMIN", "SUPER_ADMIN", "AUDITOR");

    private final PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();

    private User admin(String openid, String password, String status) {
        User user = new User();
        user.setId(100L);
        user.setOpenid(openid);
        user.setRole("SUPER_ADMIN");
        user.setPassword(password);
        user.setStatus(status);
        return user;
    }

    private UserRepository repositoryWith(User... users) {
        UserRepository repository = mock(UserRepository.class);
        when(repository.findByRoleIn(ADMIN_ROLES)).thenReturn(List.of(users));
        return repository;
    }

    @Test
    void activeAdminWithNullPassword_failsStartup() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid", null, "active")), "fail");
        assertThrows(IllegalStateException.class, () -> audit.run(null));
    }

    @Test
    void activeAdminWithPlaintextPassword_failsStartup() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid", "47e0623afa20f48d5e8c396e87af741e5496f554e4334ec5b19fb929f24708cb", "active")),
                "fail");
        assertThrows(IllegalStateException.class, () -> audit.run(null));
    }

    @Test
    void activeAdminWithCompromisedPublicHash_failsStartup() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid",
                        "$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe",
                        "active")),
                "fail");
        assertThrows(IllegalStateException.class, () -> audit.run(null));
    }

    @Test
    void disabledAdminWithPlaintextPassword_isIgnored() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid", "plaintext", "disabled")), "fail");
        assertDoesNotThrow(() -> audit.run(null));
    }

    @Test
    void activeAdminWithStrongBcrypt_passes() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid",
                        encoder.encode("Strong@Password123"), "active")),
                "fail");
        assertDoesNotThrow(() -> audit.run(null));
    }

    @Test
    void warnModeLogsButDoesNotFailStartup() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid", "plaintext", "active")), "warn");
        assertDoesNotThrow(() -> audit.run(null));
    }

    @Test
    void offModeSkipsAudit() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("admin-openid", "plaintext", "active")), "off");
        assertDoesNotThrow(() -> audit.run(null));
    }

    @Test
    void failureMessageMasksOpenidAndDoesNotLeakPassword() {
        AdminCredentialAudit audit = new AdminCredentialAudit(
                repositoryWith(admin("local-dev-admin-openid-123456", "plaintext", "active")),
                "fail");
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> audit.run(null));
        assertFalse(ex.getMessage().contains("local-dev-admin-openid-123456"),
                "异常信息不得打印完整 openid");
        assertFalse(ex.getMessage().contains("plaintext"), "异常信息不得打印口令");
        assertTrue(ex.getMessage().contains("userId=100"), "异常信息应保留 userId 便于定位");
    }
}
