package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
 *   <li>F-07（第五轮审查）：清除服务【缺席】⇒ 注销必须 503 且不写任何墓碑；
 *       real 档启动期装配自检 ⇒ 缺席即启动失败。原先两个「在 bean 缺席下断言注销成功」的
 *       用例已改为注入真实清除服务（spy + 替身 JdbcTemplate），兜底路径不再被当正常路径钉绿。</li>
 * </ul>
 */
class RealAccountSecurityServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private DeviceSessionService deviceSessionService;
    private TokenBlacklistService tokenBlacklistService;
    private JwtTokenProvider jwtTokenProvider;
    private AesEncryptor aesEncryptor;
    private com.campuslove.api.privacy.AccountErasureService accountErasureService;
    private org.springframework.beans.factory.ObjectProvider<com.campuslove.api.privacy.AccountErasureService>
            erasureProvider;
    private RealAccountSecurityService service;

    private static final String RAW_PASSWORD = String.join("", "OldPass", "@2026");

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        deviceSessionService = mock(DeviceSessionService.class);
        tokenBlacklistService = mock(TokenBlacklistService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        aesEncryptor = mock(AesEncryptor.class);
        // 简化：mock 加密为透传（测试关注业务逻辑，不关注加密细节）
        when(aesEncryptor.encrypt(anyString())).thenAnswer(inv -> inv.getArgument(0));
        // F-07：注销必须有真实清除服务。这里用【真实 AccountErasureService】（spy 以便验证调用），
        // 它的 erase 走替身 JdbcTemplate（不连库），tombstone 走【生产列集】——
        // 于是「注销成功」的断言证明的是生产代码写的墓碑，而不是测试自己手搓的兜底。
        accountErasureService = org.mockito.Mockito.spy(
                new com.campuslove.api.privacy.AccountErasureService(
                        mock(org.springframework.jdbc.core.JdbcTemplate.class),
                        mock(org.springframework.beans.factory.ObjectProvider.class)));
        erasureProvider = mock(org.springframework.beans.factory.ObjectProvider.class);
        when(erasureProvider.getIfAvailable()).thenReturn(accountErasureService);
        service = new RealAccountSecurityService(
                userRepository, passwordEncoder, deviceSessionService, tokenBlacklistService,
                jwtTokenProvider, aesEncryptor, erasureProvider);
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
    void deactivate_delegatesFullErasureSweepToAccountErasureService() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        service.deactivateAccount(100L, RAW_PASSWORD, null, null);

        // 清单整表清除必须由【注入的】清除服务执行（构造器注入，不再靠反射塞字段）
        verify(accountErasureService).erase(100L);
        verify(accountErasureService).tombstone(user);
        // 墓碑由生产 tombstone 写：openid 换成 erased: 随机值，phone 为 NULL
        org.junit.jupiter.api.Assertions.assertTrue(user.getOpenid().startsWith("erased:"));
        assertNull(user.getPhone());
        assertEquals("deactivated", user.getStatus());
    }

    /**
     * F-10 第①步（调用序列侧）：清除清单中途炸 ⇒ users 墓碑<b>不写</b>、token 不吊销。
     *
     * <p>「任何一条失败整笔回滚、不留半注销态」这句承诺，在生产上靠
     * {@code @Transactional}（本方法 + {@code AccountErasureService#erase}）；
     * 本机没有真库，真回滚判不出（见交付报告「本机判不出」）。这条用例能证到的是
     * <b>代理边界与调用顺序</b>：{@code erase} 先于 {@code tombstone}/{@code save}，
     * 于是清单炸了以后根本走不到写墓碑那一步，异常也原样冒出去（不会被 catch 掉而让
     * 事务照常提交）。若有人把顺序倒过来（先写墓碑再跑清单），本用例立刻红。</p>
     */
    @Test
    void deactivate_abortsTombstoneSaveWhenErasureFailsMidway() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        user.setPhone("cipher-phone");
        user.setOpenid("phone:d3b07384d113edec49eaa6238ad5ff00");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataIntegrityViolationException("第 k 条清除语句失败"))
                .when(accountErasureService).erase(100L);

        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.deactivateAccount(100L, RAW_PASSWORD, null, "cur-token"),
                "清单炸了必须把异常冒出去（被 catch 掉就等于事务照常提交 = 半注销态）");

        verify(userRepository, never()).save(any());
        assertEquals("active", user.getStatus(), "不得把状态写成 deactivated（半注销态的外观）");
        assertEquals("cipher-phone", user.getPhone(), "不得清空 phone");
        assertEquals("phone:d3b07384d113edec49eaa6238ad5ff00", user.getOpenid(),
                "不得写随机墓碑 openid，也不得保留可反推的派生键之外的任何改动");
        // token 还没吊销 ⇒ 主体仍能调用接口重跑注销（幂等复跑的前提）
        verify(deviceSessionService, never()).revokeAllUserTokens(anyLong());
    }

    /**
     * F-07 第②③步：清除服务缺席 ⇒ 注销必须显式失败，绝不写墓碑冒充「已注销」。
     *
     * <p>旧行为（判红的现场）：{@code @Autowired(required=false)} 拿到 null 时只打一条 ERROR，
     * 继续 {@code manualTombstone(user)} + save + 返回 200，而两个单测正是在那个状态下
     * 断言「注销成功、phone 为 NULL」——把兜底路径钉成了正常路径。现在这条路径必须 503、
     * 且 users 行一个字段都不许改。</p>
     */
    @Test
    @SuppressWarnings("unchecked")
    void deactivate_missingErasureServiceFailsLoudlyInsteadOfFakeTombstone() {
        User user = buildUser(100L, passwordEncoder.encode(RAW_PASSWORD), "active");
        user.setNickname("张三");
        user.setPhone("cipher-phone");
        user.setOpenid("phone:d3b07384d113edec49eaa6238ad5ff00");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        // 装配缺席：provider 存在但取不到 bean（= @Autowired(required=false) 的 null 场景）
        org.springframework.beans.factory.ObjectProvider<com.campuslove.api.privacy.AccountErasureService>
                emptyProvider = mock(org.springframework.beans.factory.ObjectProvider.class);
        when(emptyProvider.getIfAvailable()).thenReturn(null);
        RealAccountSecurityService withoutErasure = new RealAccountSecurityService(
                userRepository, passwordEncoder, deviceSessionService, tokenBlacklistService,
                jwtTokenProvider, aesEncryptor, emptyProvider);

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> withoutErasure.deactivateAccount(100L, RAW_PASSWORD, null, "cur-token"),
                "清除服务缺席时注销必须抛 503，不能返回成功");
        assertEquals(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode(),
                "缺席必须是 503（运营侧要能在错误率上看到），实际: " + ex.getStatusCode());

        // 不写墓碑：实体一个身份列都没动，也没有 save，token 也没吊销
        assertEquals("张三", user.getNickname(), "缺席时不得匿名化昵称（那是「已注销」的外观）");
        assertEquals("cipher-phone", user.getPhone(), "缺席时不得改 phone");
        assertEquals("phone:d3b07384d113edec49eaa6238ad5ff00", user.getOpenid(), "缺席时不得改 openid");
        assertEquals("active", user.getStatus(), "缺席时不得把状态写成 deactivated");
        verify(userRepository, never()).save(any());
        verify(deviceSessionService, never()).revokeAllUserTokens(anyLong());
    }

    /**
     * F-07 第①步：real 档启动期 fail-fast——装配漂移要让「应用起不来」，
     * 而不是等到用户点注销时才静默半注销。
     */
    @Test
    @SuppressWarnings("unchecked")
    void constructionWithMissingErasureServiceMustFailFastAtStartup() {
        org.springframework.beans.factory.ObjectProvider<com.campuslove.api.privacy.AccountErasureService>
                emptyProvider = mock(org.springframework.beans.factory.ObjectProvider.class);
        when(emptyProvider.getIfAvailable()).thenReturn(null);
        RealAccountSecurityService notWired = new RealAccountSecurityService(
                userRepository, passwordEncoder, deviceSessionService, tokenBlacklistService,
                jwtTokenProvider, aesEncryptor, emptyProvider);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                notWired::failFastIfErasureServiceMissing,
                "real 档缺 AccountErasureService 必须启动失败（起不来 > 半注销）");
        assertTrue(ex.getMessage().contains("AccountErasureService"),
                "失败原因必须点名缺的是哪个 bean，实际: " + ex.getMessage());

        // 反向对照：正常装配（setUp 那个 provider）不得抛——否则这条判点只是在钉 mock
        assertDoesNotThrow(service::failFastIfErasureServiceMissing);
    }

    @Test
    void deactivate_alreadyDeactivated_rerunsSweepWithoutCredentialCheck() {
        User user = buildUser(100L, null, "deactivated");
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));

        // 不抛（密码散列本身已被销毁，复验必然失败）；但仍然重跑清除清单，
        // 以便上一次中途回滚后「users 已墓碑、实名记录还在库里」的状态能被补齐
        org.junit.jupiter.api.Assertions
                .assertDoesNotThrow(() -> service.deactivateAccount(100L, null, null, null));
        verify(accountErasureService).erase(100L);
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
