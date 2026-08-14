package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 真实账号安全服务单元测试（3-B 修改密码 / 3-C 更换手机号 / 3-E 注销账号）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>3-B：成功修改（BCrypt 更新 + 吊销全部 token）、旧密码错误、无密码账号拒绝</li>
 *   <li>3-C：新手机号冲突（409）、格式非法、成功更换（加密存储 + 派生 openid 同步）</li>
 *   <li>3-E：成功注销（status=deactivated + 匿名化 + 吊销 token）、幂等、无密码账号 confirmationText 路径</li>
 * </ul>
 */
class RealAccountSecurityServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private DeviceSessionService deviceSessionService;
    private TokenBlacklistService tokenBlacklistService;
    private JwtTokenProvider jwtTokenProvider;
    private AesEncryptor aesEncryptor;
    private RealAccountSecurityService service;

    private static final String RAW_PASSWORD = "OldPass@2026";

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        deviceSessionService = mock(DeviceSessionService.class);
        tokenBlacklistService = mock(TokenBlacklistService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        aesEncryptor = mock(AesEncryptor.class);
        // 简化：mock 加密为透传（测试关注业务逻辑，不关注加密细节）
        when(aesEncryptor.encrypt(anyString())).thenAnswer(inv -> inv.getArgument(0));
        service = new RealAccountSecurityService(
                userRepository, passwordEncoder, deviceSessionService, tokenBlacklistService,
                jwtTokenProvider, aesEncryptor);
    }

    // ---- 3-B 修改密码 ----

    @Test
    void changePassword_success_updatesHashAndRevokesAllTokens() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.getJtiFromToken("current-token")).thenReturn("cur-jti");
        when(jwtTokenProvider.getRemainingTtlSeconds("current-token")).thenReturn(7200L);

        service.changePassword(100L, RAW_PASSWORD, "NewPass@2026", "current-token");

        assertEquals(true, passwordEncoder.matches("NewPass@2026", user.getPassword()),
                "新密码应已 BCrypt 更新");
        verify(deviceSessionService).revokeAllUserTokens(100L);
        verify(tokenBlacklistService).revoke(eq("cur-jti"), eq(7200L));
    }

    @Test
    void changePassword_wrongOldPassword_throws403() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        assertThrows(OperationForbiddenException.class,
                () -> service.changePassword(100L, "Wrong@Pass", "NewPass@2026", null),
                "旧密码错误应抛 403");
        verify(deviceSessionService, never()).revokeAllUserTokens(anyLong());
    }

    @Test
    void changePassword_noPasswordAccount_throwsPasswordNotSet() {
        // 纯 wechat/apple 注册：password 为 null
        User user = buildUser(100L, null, "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        com.campuslove.api.common.PasswordNotSetException ex =
                assertThrows(com.campuslove.api.common.PasswordNotSetException.class,
                        () -> service.changePassword(100L, null, "NewPass@2026", null),
                        "无密码账号应返回明确业务错误");
        assertEquals("PASSWORD_NOT_SET", ex.getErrorCode());
    }

    @Test
    void changePassword_shortNewPassword_throws400() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(100L, RAW_PASSWORD, "123", null),
                "新密码不足 6 位应拒绝");
    }

    // ---- 3-C 更换手机号 ----

    @Test
    void changePhone_newPhoneOccupied_throwsConflict() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        // 新手机号已存在（密文路径命中）
        when(userRepository.findByPhone("13800001111")).thenReturn(Optional.of(buildUser(200L, null, "active")));

        assertThrows(ResourceConflictException.class,
                () -> service.changePhone(100L, RAW_PASSWORD, "13800001111"),
                "新手机号被占用应返回业务冲突错误码");
    }

    @Test
    void changePhone_invalidFormat_throws400() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class,
                () -> service.changePhone(100L, RAW_PASSWORD, "12345"));
    }

    @Test
    void changePhone_success_updatesPhoneAndDerivedOpenid() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        user.setOpenid("phone:oldhash123");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(userRepository.findByPhone(anyString())).thenReturn(Optional.empty());

        service.changePhone(100L, RAW_PASSWORD, "13800002222");

        assertEquals("13800002222", user.getPhone(), "新手机号应写入（mock 加密为透传）");
        assertEquals(true, user.getOpenid().startsWith("phone:"), "派生 openid 应同步更新");
        assertEquals("phone:" + sha256Hex("13800002222"), user.getOpenid(), "派生 openid 应为新手机号的 SHA-256");
    }

    // ---- 3-E 注销账号 ----

    @Test
    void deactivate_success_anonymizesAndRevokesTokens() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        user.setAvatarUrl("/uploads/avatar.jpg");
        user.setPhone("cipher-phone");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.getJtiFromToken("cur-token")).thenReturn("cur-jti");
        when(jwtTokenProvider.getRemainingTtlSeconds("cur-token")).thenReturn(3600L);

        service.deactivateAccount(100L, RAW_PASSWORD, null, "cur-token");

        assertEquals("deactivated", user.getStatus(), "状态应为 deactivated");
        assertEquals("已注销用户", user.getNickname(), "昵称应匿名化");
        assertNull(user.getAvatarUrl(), "头像应置空");
        assertEquals("1****100", user.getPhone(), "手机号应脱敏（含用户 ID 保证唯一）");
        verify(deviceSessionService).revokeAllUserTokens(100L);
        verify(tokenBlacklistService).revoke(eq("cur-jti"), eq(3600L));
    }

    @Test
    void deactivate_alreadyDeactivated_isIdempotent() {
        User user = buildUser(100L, null, "deactivated");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        service.deactivateAccount(100L, null, null, null);

        // 幂等：不重新保存、不吊销
        verify(userRepository, never()).save(any());
        verify(deviceSessionService, never()).revokeAllUserTokens(anyLong());
    }

    @Test
    void deactivate_noPasswordAccount_requiresConfirmationText() {
        User user = buildUser(100L, null, "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        // 无 confirmationText → 拒绝
        assertThrows(OperationForbiddenException.class,
                () -> service.deactivateAccount(100L, null, null, null));

        // 有 confirmationText → 成功
        service.deactivateAccount(100L, null, "确认注销", null);
        assertEquals("deactivated", user.getStatus());
    }

    /** SHA-256 hex（与 RealAccountSecurityService 内部实现同口径，用于断言）。 */
    private static String sha256Hex(String input) {
        try {
            java.security.MessageDigest sha256 = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = sha256.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format(java.util.Locale.ROOT, "%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** 构造测试用用户实体。 */
    private User buildUser(Long id, String passwordHash, String status) {
        User user = new User();
        user.setId(id);
        user.setNickname("测试用户");
        user.setStatus(status);
        user.setPassword(passwordHash);
        return user;
    }
}
