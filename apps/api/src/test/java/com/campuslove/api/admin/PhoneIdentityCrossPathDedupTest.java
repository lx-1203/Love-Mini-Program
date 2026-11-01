package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.auth.DeviceSessionService;
import com.campuslove.api.auth.OnlineUserService;
import com.campuslove.api.auth.PhoneBindingController;
import com.campuslove.api.auth.RealAccountSecurityService;
import com.campuslove.api.auth.RealAuthService;
import com.campuslove.api.auth.SmsCodeService;
import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.auth.WeChatClient;
import com.campuslove.api.common.RegisterValidationException;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.config.WeChatConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.privacy.AccountErasureService;
import com.campuslove.api.privacy.PhoneColumnCodec;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.hamcrest.Matchers;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.match.MockRestRequestMatchers;
import org.springframework.test.web.client.response.MockRestResponseCreators;
import org.springframework.web.client.RestClient;

/**
 * W1b-3：同一手机号在「已注册 / 后台建号 / 微信绑定 / 换号」四条写入路径上的查重一致性。
 *
 * <p><b>缺陷</b>：{@code PhoneBindingController#bindPhone} 造出了 {@code users.phone} 的
 * <b>第四种形状</b>——AES 密文 phone + 本行原有微信 openid + <b>零查重</b>。
 * 其余路径（{@code RealAuthService#registerUser}、{@code AdminUserController#createUser}、
 * {@code RealAccountSecurityService#changePhone}）都按「派生键 {@code phone:SHA-256} 优先 +
 * 明文历史兜底」查重；绑定路径两条判据都不问 ⇒ 同一号码既挂在 A 账号又挂在 B 账号，
 * 静默产生第二个主体。{@code uk_users_phone} 挡不住：AES-GCM 随机 IV 让同号码每次密文不同，
 * 唯一索引用密文等于没有约束。</p>
 *
 * <p><b>判点载体</b>：四条路径共用<b>同一个内存假仓库</b>（按真实列语义实现
 * {@code findByOpenid/findByPhone/save}），且 AES 替身刻意让<b>密文≠明文</b>——
 * 这样「拿明文/密文做等值查重必然查不到」是测出来的，不是注释里说的。
 * 「不得新建第二行」被量化成 {@code rows.size()} 断言。</p>
 */
@DisplayName("W1b-3 手机号四条写入路径查重一致性")
class PhoneIdentityCrossPathDedupTest {

    private static final String PHONE = "13800138000";
    private static final String OTHER_PHONE = "13900002222";
    private static final String PASSWORD = String.join("", "Pass", "@2026");

    /** 内存 users 表（key = id）。 */
    private final Map<Long, User> rows = new LinkedHashMap<>();
    private final AtomicLong idSeq = new AtomicLong(1000);

    private UserRepository userRepository;
    private AesEncryptor aesEncryptor;
    private PasswordEncoder passwordEncoder;
    private RealAuthService realAuthService;
    private AdminUserController adminUserController;
    private MockRestServiceServer wechatServer;
    private PhoneBindingController bindingController;

    @BeforeEach
    void setUp() {
        aesEncryptor = mock(AesEncryptor.class);
        // 关键两件事：密文不等于明文，且【每次加密都不同】（真实 AES-GCM 随机 IV 的等价语义）。
        // 这样「拿密文做等值查重」在线上必然恒不命中——旧 changePhone 的占用校验就是这个形态，
        // 而「用明文等值查密文列」也同样查不到；两条错路都被这个替身当场证伪。
        when(aesEncryptor.encrypt(anyString())).thenAnswer(inv ->
                "CIPHER::" + java.util.UUID.randomUUID());

        userRepository = mock(UserRepository.class);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(idSeq.incrementAndGet());
            }
            rows.put(u.getId(), u);
            return u;
        });
        when(userRepository.findById(any())).thenAnswer(inv ->
                Optional.ofNullable(rows.get((Long) inv.getArgument(0))));
        when(userRepository.findByOpenid(anyString())).thenAnswer(inv -> rows.values().stream()
                .filter(u -> Objects.equals(u.getOpenid(), inv.getArgument(0)))
                .findFirst());
        when(userRepository.findByPhone(anyString())).thenAnswer(inv -> rows.values().stream()
                .filter(u -> Objects.equals(u.getPhone(), inv.getArgument(0)))
                .findFirst());

        passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt");
        SmsCodeService smsCodeService = mock(SmsCodeService.class);
        when(smsCodeService.verify(any(), any())).thenReturn(true);
        realAuthService = new RealAuthService(
                mock(WeChatClient.class), jwtTokenProvider, userRepository,
                mock(UserBasicProfileRepository.class), mock(UserCampusProfileRepository.class),
                mock(UserScheduleProfileRepository.class), passwordEncoder, aesEncryptor,
                mock(TokenBlacklistService.class), mock(OnlineUserService.class),
                mock(SchoolRepository.class), true, "13900000000", smsCodeService);

        adminUserController = new AdminUserController(userRepository,
                mock(UserCampusProfileRepository.class), passwordEncoder,
                mock(AdminCampusScopeService.class), mock(AdminDataScope.class));
        ReflectionTestUtils.setField(adminUserController, "aesEncryptor", aesEncryptor);

        WeChatConfig weChatConfig = mock(WeChatConfig.class);
        when(weChatConfig.getAppId()).thenReturn("wx-appid");
        when(weChatConfig.getAppSecret()).thenReturn("wx-secret");
        RestClient.Builder builder = RestClient.builder();
        wechatServer = MockRestServiceServer.bindTo(builder).build();
        bindingController = new PhoneBindingController(weChatConfig, userRepository, aesEncryptor, builder);
    }

    /** 让微信两次外呼分别返回 access_token 与手机号。 */
    private void stubWeChatPhone(String phoneNumber) {
        wechatServer.expect(MockRestRequestMatchers.requestTo(
                        Matchers.containsString("cgi-bin/token")))
                .andRespond(MockRestResponseCreators.withSuccess(
                        "{\"access_token\":\"AT-123\",\"expires_in\":7200}", MediaType.APPLICATION_JSON));
        wechatServer.expect(MockRestRequestMatchers.requestTo(
                        Matchers.containsString("getuserphonenumber")))
                .andRespond(MockRestResponseCreators.withSuccess(
                        "{\"errcode\":0,\"phone_info\":{\"phoneNumber\":\"" + phoneNumber + "\"}}",
                        MediaType.APPLICATION_JSON));
    }

    private static void withUser(Long id, Runnable body) {
        try (org.mockito.MockedStatic<com.campuslove.api.config.SecurityUtils> mocked
                     = org.mockito.Mockito.mockStatic(com.campuslove.api.config.SecurityUtils.class)) {
            mocked.when(com.campuslove.api.config.SecurityUtils::getCurrentUserId).thenReturn(id);
            body.run();
        }
    }

    /** 造一行「微信身份」用户（openid 是微信侧 hash，不含手机号派生键）。 */
    private User seedWechatRow(Long id) {
        User u = new User();
        u.setId(id);
        u.setOpenid("wechat-openid-hash-" + id);
        u.setNickname("微信用户" + id);
        u.setStatus("active");
        u.setPassword(passwordEncoder.encode(PASSWORD));
        rows.put(id, u);
        return u;
    }

    private void seedRegisteredRow(String phone) {
        realAuthService.registerUser(phone, PASSWORD, "注册号",
                LocalDate.now().minusYears(20), null, "123456");
    }

    // ---------- 三条建号/绑定路径都必须命中已存在主体 ----------

    @Test
    @DisplayName("后台建号先落一行 ⇒ 注册同号码必须命中已有主体、不得新建第二行")
    void adminCreated_thenRegister_hitsExistingSubject() {
        withUser(500L, () -> adminUserController
                .createUser(new AdminCreateUserRequest(PHONE, PASSWORD, "后台建的号")));
        assertEquals(1, rows.size(), "后台建号应落下第一行");

        assertThrows(RegisterValidationException.class, () -> seedRegisteredRow(PHONE));
        assertEquals(1, rows.size(), "注册路径不得对同一手机号新建第二行");
    }

    @Test
    @DisplayName("注册先落一行 ⇒ 后台建同号码必须命中已有主体、不得新建第二行")
    void registered_thenAdminCreate_hitsExistingSubject() {
        seedRegisteredRow(PHONE);
        assertEquals(1, rows.size());

        assertThrows(IllegalArgumentException.class, () -> withUser(500L, () -> adminUserController
                .createUser(new AdminCreateUserRequest(PHONE, PASSWORD, "后台建的号"))));
        assertEquals(1, rows.size(), "后台建号路径不得对已注册手机号新建第二行");
    }

    @Test
    @DisplayName("注册先落一行 ⇒ 别的账号微信绑定同一号码必须 409，不得静默产生第二主体（核心判点）")
    void registered_thenWechatBind_samePhone_conflicts() {
        seedRegisteredRow(PHONE);
        User wxRow = seedWechatRow(77L);
        assertEquals(2, rows.size(), "一行注册号 + 一行微信号");

        stubWeChatPhone(PHONE);
        ResourceConflictException ex = assertThrows(ResourceConflictException.class,
                () -> withUser(77L, () -> bindingController.bindPhone(
                        new PhoneBindingController.PhoneBindRequest("code-1"))));
        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus(),
                "该号码已归属他人 ⇒ 绑定必须是 409，不能静默把同号写进第二个账号");

        assertTrue(PhoneColumnCodec.isErasedOrAbsent(wxRow.getPhone()),
                "绑定被拒后该行仍不应持有手机号，实际: " + wxRow.getPhone());
        assertEquals(2, rows.size(), "微信绑定路径不得对同一手机号新建第二行");
        wechatServer.verify();
    }

    @Test
    @DisplayName("后台建号先落一行 ⇒ 微信绑定同一号码同样 409（四条路径判据同源）")
    void adminCreated_thenWechatBind_samePhone_conflicts() {
        withUser(500L, () -> adminUserController
                .createUser(new AdminCreateUserRequest(PHONE, PASSWORD, "后台建的号")));
        seedWechatRow(78L);

        stubWeChatPhone(PHONE);
        assertThrows(ResourceConflictException.class,
                () -> withUser(78L, () -> bindingController.bindPhone(
                        new PhoneBindingController.PhoneBindRequest("code-2"))));
        assertEquals(2, rows.size(), "冲突时不得落新行");
    }

    // ---------- 绑定自身的行为 ----------

    @Test
    @DisplayName("绑定一个无人持有的号码 ⇒ 成功，phone 只存密文，绝不落明文，也不得毁掉微信身份")
    void bind_freshPhone_storesCipherOnly() {
        User wxRow = seedWechatRow(80L);
        stubWeChatPhone(OTHER_PHONE);

        withUser(80L, () -> bindingController.bindPhone(
                new PhoneBindingController.PhoneBindRequest("code-3")));

        assertTrue(wxRow.getPhone().startsWith("CIPHER::"),
                "phone 必须走 PhoneColumnCodec.store 的密文出口，实际: " + wxRow.getPhone());
        assertFalse(wxRow.getPhone().contains(OTHER_PHONE), "phone 列不得含明文号码");
        assertFalse(Objects.equals(wxRow.getOpenid(), PhoneColumnCodec.derivedOpenid(OTHER_PHONE)),
                "微信身份行不得被改写成手机号派生键（那会毁掉微信登录身份）");
        assertEquals(1, rows.size());
    }

    @Test
    @DisplayName("本人重复绑定同一号码 ⇒ 放行且派生键保持（owner 是自己不算冲突）")
    void bind_samePhoneOwnAccount_isIdempotent() {
        seedRegisteredRow(PHONE);
        User own = rows.values().iterator().next();

        stubWeChatPhone(PHONE);
        withUser(own.getId(), () -> bindingController.bindPhone(
                new PhoneBindingController.PhoneBindRequest("code-4")));

        assertEquals(PhoneColumnCodec.derivedOpenid(PHONE), own.getOpenid(),
                "手机号身份行的派生键必须跟着号码走（与注册侧同口径）");
        assertEquals(1, rows.size(), "本人重绑不得产生第二行");
    }

    @Test
    @DisplayName("手机号身份行改绑新号码 ⇒ 派生键迁移到新号码，旧派生键被释放（openid 写入口径与注册侧统一）")
    void bind_phoneIdentityRow_migratesDerivedKey() {
        seedRegisteredRow(PHONE);
        User own = rows.values().iterator().next();
        String oldKey = own.getOpenid();

        stubWeChatPhone(OTHER_PHONE);
        withUser(own.getId(), () -> bindingController.bindPhone(
                new PhoneBindingController.PhoneBindRequest("code-5")));

        assertEquals(PhoneColumnCodec.derivedOpenid(OTHER_PHONE), own.getOpenid(),
                "改绑后派生键必须等于新号码的派生键");
        assertFalse(oldKey.equals(own.getOpenid()), "旧号码的派生键必须被释放，否则旧号码被空占");
        assertEquals(Optional.empty(), userRepository.findByOpenid(oldKey),
                "旧派生键不得再指向任何行");
    }

    @Test
    @DisplayName("换号路径也按派生键查重：旧实现查「密文相等」，在线上恒不命中 ⇒ 同号双主体")
    void changePhone_usesDerivedKeyNotCipher() {
        seedRegisteredRow(PHONE);
        User mine = rows.values().iterator().next();
        // 第三方以「密文 phone + 派生键 openid」形态持有目标号码
        User third = new User();
        third.setId(900L);
        third.setOpenid(PhoneColumnCodec.derivedOpenid(OTHER_PHONE));
        third.setPhone("CIPHER::" + OTHER_PHONE);
        third.setStatus("active");
        rows.put(900L, third);

        @SuppressWarnings("unchecked")
        ObjectProvider<AccountErasureService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mock(AccountErasureService.class));
        RealAccountSecurityService svc = new RealAccountSecurityService(
                userRepository, passwordEncoder, mock(DeviceSessionService.class),
                mock(TokenBlacklistService.class), mock(JwtTokenProvider.class),
                aesEncryptor, provider);

        assertThrows(ResourceConflictException.class,
                () -> svc.changePhone(mine.getId(), PASSWORD, OTHER_PHONE),
                "第三方以密文形态持有该号码时，派生键必须能查到占用");
    }

    // ---------- 未闭合边界（证据型判点：这条形状今天封不死） ----------

    @Test
    @DisplayName("边界证据：微信身份行绑定后不留派生键 ⇒ 注册侧两条判据都查不到它（本条未闭合的一半）")
    void bindOnWechatIdentityRow_leavesNoDedupeTrace_knownGap() {
        seedWechatRow(81L);
        stubWeChatPhone(OTHER_PHONE);
        withUser(81L, () -> bindingController.bindPhone(
                new PhoneBindingController.PhoneBindRequest("code-6")));

        // 下面两条记录的是【现状缺口】，不是认可它：
        // users 只有一个身份列（openid NOT NULL UNIQUE），微信身份行的手机号派生键无处可写；
        // 补这一半要么加列（phone_hmac），要么改身份列语义 ⇒ 属 schema 决策，见交付报告交接项 F-W1b-3-H。
        assertEquals(Optional.empty(), userRepository.findByOpenid(PhoneColumnCodec.derivedOpenid(OTHER_PHONE)),
                "若将来给微信身份行也写派生键，这条必须跟着翻成 present（判点即门禁）");
        assertEquals(Optional.empty(), userRepository.findByPhone(OTHER_PHONE),
                "明文兜底判据对密文行永远无效");
        assertNotNull(rows.get(81L).getPhone(), "该行确实持有手机号（密文）");
    }
}
