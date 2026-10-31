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
 *   <li>3-E：成功注销（users 身份列全部墓碑化 + 委托 AccountErasureService 跑清除清单 +
 *       吊销 token）、已注销态复跑不抛且重跑清单、无密码账号 confirmationText 路径</li>
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

    private static final String RAW_PASSWORD = String.join("", "OldPass", "@2026");

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
    void deactivate_success_erasesInventoryAndWritesUsersTombstone() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        user.setAvatarUrl("/uploads/avatar.jpg");
        user.setPhone("cipher-phone");
        user.setOpenid("phone:d3b07384d113edec49eaa6238ad5ff00");
        user.setBirthDate(java.time.LocalDate.of(2004, 1, 1));
        user.setLatitude(java.math.BigDecimal.ONE);
        user.setLongitude(java.math.BigDecimal.valueOf(116.4074));
        user.setCampusName("北京大学");
        user.setAutoRenewEnabled(true);
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.getJtiFromToken("cur-token")).thenReturn("cur-jti");
        when(jwtTokenProvider.getRemainingTtlSeconds("cur-token")).thenReturn(3600L);

        service.deactivateAccount(100L, RAW_PASSWORD, null, "cur-token");

        assertEquals("deactivated", user.getStatus(), "状态应为 deactivated");
        assertEquals("已注销用户", user.getNickname(), "昵称应匿名化");
        assertNull(user.getAvatarUrl(), "头像应置空");
        // 手机号列的唯一「已注销」表示是 NULL：旧的 "1****"+userId 是含 userId 的稳定化名，
        // 且把明文形态混进了本应存 AES 密文的列（P0 2026-10-31）
        assertNull(user.getPhone(), "手机号应写 NULL，而不是任何哨兵字符串");
        org.junit.jupiter.api.Assertions.assertTrue(user.getOpenid().startsWith("erased:"),
                "openid 应换成随机墓碑");
        org.junit.jupiter.api.Assertions.assertFalse(user.getOpenid().contains("d3b07384"),
                "phone:<SHA-256> 派生键必须被覆盖（11 位手机号空间可穷举反推）");
        org.junit.jupiter.api.Assertions.assertFalse(user.getOpenid().contains("100"),
                "墓碑值不得含 userId");
        assertNull(user.getBirthDate(), "出生日期应删除");
        assertNull(user.getLatitude(), "纬度应删除");
        assertNull(user.getLongitude(), "经度应删除");
        assertNull(user.getCampusName(), "校区名应删除");
        assertNull(user.getPassword(), "密码散列应销毁");
        assertEquals("USER", user.getRole(), "角色应降级为 USER");
        assertEquals(Boolean.FALSE, user.getAutoRenewEnabled(),
                "自动续费必须关闭：否则 AutoRenewService 的 6 小时扫描会在注销后写出新的 vip_order/vip_bills");
        verify(deviceSessionService).revokeAllUserTokens(100L);
        verify(tokenBlacklistService).revoke(eq("cur-jti"), eq(3600L));
    }

    @Test
    void deactivate_delegatesFullErasureSweepToAccountErasureService() throws Exception {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        com.campuslove.api.privacy.AccountErasureService erasure =
                mock(com.campuslove.api.privacy.AccountErasureService.class);
        // 替身要真的把墓碑写到实体上（Mockito 默认不改动入参），否则下面的断言无从成立
        when(erasure.tombstone(any(User.class))).thenAnswer(invocation -> {
            User target = invocation.getArgument(0);
            target.setOpenid("erased:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
            target.setStatus("deactivated");
            target.setPhone(null);
            return target.getOpenid();
        });
        // 该协作者走 @Autowired(required=false) 字段注入，测试里同样反射塞入
        java.lang.reflect.Field field = RealAccountSecurityService.class
                .getDeclaredField("accountErasureService");
        field.setAccessible(true);
        field.set(service, erasure);

        service.deactivateAccount(100L, RAW_PASSWORD, null, null);

        verify(erasure).erase(100L);
        verify(erasure).tombstone(user);
        assertEquals("erased:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", user.getOpenid());
    }

    @Test
    void deactivate_alreadyDeactivated_rerunsSweepWithoutCredentialCheck() {
        User user = buildUser(100L, null, "deactivated");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        // 不抛（密码散列本身已被销毁，复验必然失败）；但仍然重跑清除清单，
        // 以便上一次中途回滚后「users 已墓碑、实名记录还在库里」的状态能被补齐
        org.junit.jupiter.api.Assertions
                .assertDoesNotThrow(() -> service.deactivateAccount(100L, null, null, null));
        verify(userRepository).save(any());
        assertNull(user.getPhone(), "复跑仍写 NULL，不得复活成哨兵");
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
        assertNull(user.getPhone());
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
