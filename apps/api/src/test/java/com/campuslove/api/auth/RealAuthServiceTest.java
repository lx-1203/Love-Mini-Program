package com.campuslove.api.auth;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * RealAuthService 单元测试。
 *
 * <p>覆盖 BCrypt 密码校验逻辑：
 * <ul>
 *   <li>正确密码 + 正确哈希 -> 校验通过</li>
 *   <li>错误密码 + 正确哈希 -> 校验失败</li>
 *   <li>正确密码 + 错误哈希 -> 校验失败</li>
 *   <li>encodeAdminPassword 编码功能验证</li>
 *   <li>历史明文密码登录 -> 自动迁移为 BCrypt（Phase 3 任务 13 新增）</li>
 *   <li>环境变量兜底场景不迁移（Phase 3 任务 13 新增）</li>
 *   <li>普通用户密码编码 encodeUserPassword 功能验证（Phase 3 任务 13 新增）</li>
 *   <li>注册/密码重置场景 -> password 字段为 BCrypt 哈希（Phase 3 任务 13 新增）</li>
 * </ul>
 */
class RealAuthServiceTest {

    @Mock private WeChatClient weChatClient;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserRepository userRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private SchoolRepository schoolRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private AesEncryptor aesEncryptor;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private OnlineUserService onlineUserService;
    @Mock private SmsCodeService smsCodeService;

    private PasswordEncoder passwordEncoder;
    private RealAuthService realAuthService;

    /** 测试用的明文密码 */
    private static final String RAW_PASSWORD = String.join("", "Admin", "@2026");
    /** 错误的明文密码 */
    private static final String WRONG_PASSWORD = String.join("-", "wrong", "password");

    /** 正确密码的 BCrypt 哈希（每次 setUp 重新生成，保证独立性） */
    private String correctHash;
    /** 错误密码的 BCrypt 哈希 */
    private String wrongHash;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        // 使用真实的 BCryptPasswordEncoder，便于验证哈希逻辑
        passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        correctHash = passwordEncoder.encode(RAW_PASSWORD);
        wrongHash = passwordEncoder.encode("another-password");

        // ADMIN_PASSWORD 环境变量兜底已移除（2026-10-05 安全修复），登录仅依赖数据库 password 字段
        realAuthService = new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                userRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                aesEncryptor,
                tokenBlacklistService,
                onlineUserService,
                schoolRepository,
                true,
                "13900000000",
                smsCodeService
        );

        // 默认 mock 返回空 Optional，避免 buildSessionView 中 NPE
        when(userCampusProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
        when(userScheduleProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
    }
    /**
     * 场景 1：正确密码 + 正确哈希 -> 校验通过（loginAsAdmin 不抛异常）。
     */
    @Test
    void loginAsAdmin_withCorrectPasswordAndCorrectHash_shouldSucceed() {
        // Arrange：构造管理员用户，password 字段为正确哈希
        User adminUser = createAdminUser(correctHash);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt-token");

        // Act & Assert：不应抛出任何异常
        assertDoesNotThrow(() -> realAuthService.loginAsAdmin("admin", RAW_PASSWORD));
    }

    /**
     * 场景 2：错误密码 + 正确哈希 -> 校验失败（抛出 IllegalArgumentException）。
     */
    @Test
    void loginAsAdmin_withWrongPasswordAndCorrectHash_shouldFail() {
        // Arrange
        User adminUser = createAdminUser(correctHash);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));

        // Act & Assert：错误密码应被 BCrypt 校验拒绝
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realAuthService.loginAsAdmin("admin", WRONG_PASSWORD));
        assertEquals("管理员账号或密码错误", ex.getMessage());
    }

    /**
     * 场景 3：正确密码 + 错误哈希 -> 校验失败（抛出 IllegalArgumentException）。
     *
     * <p>此场景模拟数据库中存储了错误的哈希值（如手工录入错误或迁移异常），
     * 即使输入正确密码也应拒绝登录，防止误认证。</p>
     */
    @Test
    void loginAsAdmin_withCorrectPasswordAndWrongHash_shouldFail() {
        // Arrange：管理员用户的 password 字段为"另一个密码"的哈希
        User adminUser = createAdminUser(wrongHash);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));

        // Act & Assert：正确密码与错误哈希不匹配，应拒绝
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realAuthService.loginAsAdmin("admin", RAW_PASSWORD));
        assertEquals("管理员账号或密码错误", ex.getMessage());
    }

    /**
     * 场景 4：数据库无 password 字段时拒绝登录（fail-closed，2026-10-05 安全修复）。
     *
     * <p>原行为：回退 ADMIN_PASSWORD 环境变量兜底校验；修复后环境变量明文兜底已移除，
     * 数据库 password 为空时管理员登录未启用（抛 IllegalStateException），不再有任何
     * 环境变量兜底路径。</p>
     */
    @Test
    void loginAsAdmin_withEmptyDbPassword_shouldFailClosed() {
        // Arrange：管理员用户无 password 字段（旧数据迁移场景）
        User adminUser = createAdminUser(null);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));

        // Act & Assert：环境变量兜底已删除，登录未启用应明确拒绝
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> realAuthService.loginAsAdmin("admin", RAW_PASSWORD));
        assertEquals("管理员登录未启用", ex.getMessage());
    }

    /**
     * 场景 5：encodeAdminPassword 编码功能 —— 返回有效 BCrypt 哈希，且能被 matches 校验。
     */
    @Test
    void encodeAdminPassword_shouldReturnValidBCryptHash() {
        // Act
        String hash = realAuthService.encodeAdminPassword(RAW_PASSWORD);

        // Assert
        assertNotNull(hash, "编码后的哈希不能为 null");
        assertTrue(hash.startsWith("$2a$10$"), "BCrypt 哈希应以 $2a$10$ 开头");
        assertTrue(passwordEncoder.matches(RAW_PASSWORD, hash),
                "编码后的哈希应能被原密码校验通过");
    }

    /**
     * 场景 6：encodeAdminPassword 对空密码应抛出 IllegalArgumentException。
     */
    @Test
    void encodeAdminPassword_withBlankPassword_shouldThrow() {
        assertThrows(IllegalArgumentException.class,
                () -> realAuthService.encodeAdminPassword(""));
        assertThrows(IllegalArgumentException.class,
                () -> realAuthService.encodeAdminPassword(null));
    }
    /**
     * 场景 7：历史明文密码登录 -> 自动迁移为 BCrypt 哈希（Phase 3 任务 13 核心场景）。
     *
     * <p>构造一个 password 字段为明文密码的管理员用户（模拟 V2026.06.25.0002 迁移前
     * 或手工录入异常场景），登录时：
     * <ol>
     *   <li>BCrypt 校验失败（因为 storedHash 非 BCrypt 格式）</li>
     *   <li>明文 equals 校验通过</li>
     *   <li>自动将明文密码迁移为 BCrypt 哈希并持久化（userRepository.save 被调用）</li>
     *   <li>登录成功（不抛异常）</li>
     * </ol>
     * </p>
     */
    @Test
    void loginAsAdmin_withPlaintextPassword_shouldAutoMigrateToBCrypt() {
        // Arrange：管理员用户的 password 字段为明文密码（历史遗留数据）
        String plaintextPassword = String.join("", "legacy-plaintext-", "pwd-2026");
        User adminUser = createAdminUser(plaintextPassword);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));
        when(userRepository.save(any())).thenReturn(adminUser);
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt-token");

        // Act：使用明文密码登录，应成功（不抛异常）
        assertDoesNotThrow(() -> realAuthService.loginAsAdmin("admin", plaintextPassword));

        // Assert：userRepository.save 应被调用一次（迁移持久化）
        verify(userRepository).save(eq(adminUser));

        // Assert：user.password 应被更新为 BCrypt 哈希（非原明文）
        String migratedHash = adminUser.getPassword();
        assertNotNull(migratedHash, "迁移后的 password 不能为 null");
        assertNotEquals(plaintextPassword, migratedHash,
                "迁移后的 password 不应仍为明文");
        assertTrue(migratedHash.startsWith("$2a$"), "迁移后的 password 应为 BCrypt 哈希格式");
        assertTrue(passwordEncoder.matches(plaintextPassword, migratedHash),
                "迁移后的 BCrypt 哈希应能校验原明文密码");
    }

    /**
     * 场景 8：历史明文密码在错误输入下不触发迁移（2026-10-05 重写）。
     *
     * <p>原「环境变量兜底不迁移」场景随 ADMIN_PASSWORD 兜底移除而失效；本场景保留
     * 明文 storedHash 下的负路径覆盖：密码错误时拒绝且不迁移。</p>
     */
    @Test
    void loginAsAdmin_withWrongPasswordAndPlaintextEnvReplacement_shouldNotMigrate() {
        // Arrange：管理员用户无 password 字段（旧兜底场景的残留形态）
        String plaintextPassword = String.join("", "env-plaintext-", "pwd-2026");
        User adminUser = createAdminUser(plaintextPassword);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));

        // Act & Assert：错误密码应被拒绝
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realAuthService.loginAsAdmin("admin", WRONG_PASSWORD));
        assertEquals("管理员账号或密码错误", ex.getMessage());

        // Assert：userRepository.save 不应被调用（校验未通过，不迁移）
        verify(userRepository, never()).save(any());
    }

    /**
     * 场景 9：错误密码 + 明文 storedHash -> 校验失败，且不触发迁移。
     */
    @Test
    void loginAsAdmin_withWrongPasswordAndPlaintextHash_shouldFailWithoutMigration() {
        // Arrange：管理员用户的 password 字段为明文密码
        User adminUser = createAdminUser("legacy-plaintext-" + "pwd-2026");
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));

        // Act & Assert：错误密码应被拒绝
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realAuthService.loginAsAdmin("admin", WRONG_PASSWORD));
        assertEquals("管理员账号或密码错误", ex.getMessage());

        // Assert：userRepository.save 不应被调用（未通过校验，不迁移）
        verify(userRepository, never()).save(any());
    }
    /**
     * 场景 10：encodeUserPassword 编码功能 —— 返回有效 BCrypt 哈希，且能被 matches 校验。
     *
     * <p>Phase 3 任务 13 新增：本方法为普通用户注册/密码重置场景预留，与 encodeAdminPassword
     * 逻辑一致但语义独立。当前项目普通用户使用微信登录无密码，本测试验证编码功能可用。</p>
     */
    @Test
    void encodeUserPassword_shouldReturnValidBCryptHash() {
        // Arrange
        String userRawPassword = String.join("", "User", "@2026");

        // Act
        String hash = realAuthService.encodeUserPassword(userRawPassword);

        // Assert
        assertNotNull(hash, "编码后的哈希不能为 null");
        assertTrue(hash.startsWith("$2a$10$"), "BCrypt 哈希应以 $2a$10$ 开头");
        assertNotEquals(userRawPassword, hash, "哈希不应等于明文密码");
        assertTrue(passwordEncoder.matches(userRawPassword, hash),
                "编码后的哈希应能被原密码校验通过");
        assertFalse(passwordEncoder.matches(WRONG_PASSWORD, hash),
                "错误密码不应通过校验");
    }

    /**
     * 场景 11：encodeUserPassword 对空密码应抛出 IllegalArgumentException。
     */
    @Test
    void encodeUserPassword_withBlankPassword_shouldThrow() {
        assertThrows(IllegalArgumentException.class,
                () -> realAuthService.encodeUserPassword(""));
        assertThrows(IllegalArgumentException.class,
                () -> realAuthService.encodeUserPassword(null));
    }

    /**
     * 场景 12：注册新用户场景 -> password 字段为 BCrypt 哈希（非明文）。
     *
     * <p>模拟普通用户注册流程：调用 encodeUserPassword 编码明文密码并设置到 User.password，
     * 验证 password 字段为 BCrypt 哈希格式，非明文，且后续可通过 matches 校验。</p>
     */
    @Test
    void registerUser_scenario_passwordShouldBeBCryptHash() {
        // Arrange：构造新用户（模拟注册流程）
        String rawPassword = String.join("", "New", "User@2026");
        User newUser = new User();
        newUser.setId(100L);
        newUser.setOpenid("new-user-openid");
        newUser.setNickname("新用户");
        newUser.setRole("USER");

        // Act：模拟注册时密码编码并设置
        String encodedPassword = realAuthService.encodeUserPassword(rawPassword);
        newUser.setPassword(encodedPassword);

        // Assert：password 字段应为 BCrypt 哈希，非明文
        assertNotNull(newUser.getPassword(), "password 不能为 null");
        assertNotEquals(rawPassword, newUser.getPassword(), "password 不应为明文");
        assertTrue(newUser.getPassword().startsWith("$2a$10$"), "password 应为 BCrypt 哈希格式");

        // Assert：后续可通过 matches 校验
        assertTrue(passwordEncoder.matches(rawPassword, newUser.getPassword()),
                "注册时设置的密码应能通过 matches 校验");
        assertFalse(passwordEncoder.matches(WRONG_PASSWORD, newUser.getPassword()),
                "错误密码不应通过校验");
    }

    /**
     * 场景 13：密码重置场景 -> 新密码为 BCrypt 哈希（非明文）。
     *
     * <p>模拟密码重置流程：用户已有 BCrypt 哈希密码，调用 encodeUserPassword 编码新明文密码，
     * 更新 User.password 字段。验证新密码为 BCrypt 哈希，与旧哈希不同，且新密码可通过 matches 校验。</p>
     */
    @Test
    void resetPassword_scenario_newPasswordShouldBeBCryptHash() {
        // Arrange：用户已有密码哈希
        String oldRawPassword = String.join("", "Old", "Password@2026");
        String newRawPassword = String.join("", "New", "Password@2026");
        User existingUser = new User();
        existingUser.setId(200L);
        existingUser.setOpenid("existing-user");
        existingUser.setNickname("已存在用户");
        existingUser.setRole("USER");
        existingUser.setPassword(passwordEncoder.encode(oldRawPassword));

        String oldHash = existingUser.getPassword();

        // Act：模拟密码重置流程
        String newHash = realAuthService.encodeUserPassword(newRawPassword);
        existingUser.setPassword(newHash);

        // Assert：新 password 应为 BCrypt 哈希，非明文，且与旧哈希不同
        assertNotNull(existingUser.getPassword(), "新 password 不能为 null");
        assertNotEquals(newRawPassword, existingUser.getPassword(), "新 password 不应为明文");
        assertNotEquals(oldHash, existingUser.getPassword(), "新哈希应与旧哈希不同");
        assertTrue(existingUser.getPassword().startsWith("$2a$10$"), "新 password 应为 BCrypt 哈希格式");

        // Assert：新密码可通过 matches 校验，旧密码不再通过
        assertTrue(passwordEncoder.matches(newRawPassword, existingUser.getPassword()),
                "新密码应通过 matches 校验");
        assertFalse(passwordEncoder.matches(oldRawPassword, existingUser.getPassword()),
                "旧密码不应再通过校验");
    }

    /**
     * 构造管理员用户实体。
     *
     * @param passwordHash 密码哈希（可为 null，模拟旧数据无 password 字段）
     * @return 管理员 User 实例
     */
    private User createAdminUser(String passwordHash) {
        User user = new User();
        user.setId(1L);
        user.setOpenid("admin");
        user.setNickname("系统管理员");
        user.setRole("ADMIN");
        user.setPassword(passwordHash);
        user.setProfileCompletion(100);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        return user;
    }

    /* ============================================================
     * 体验账号一键登录（loginAsGuest）测试
     * ============================================================ */

    /**
     * 场景 1（R4-00251）：每次调用创建独立临时体验账号并签发 JWT——会话身份完全隔离，
     * 不再共用固定账号（13900000000）。账号 phone 为空、openid 为 guest:{UUID} 全局唯一。
     */
    @Test
    void loginAsGuest_firstCall_shouldCreateGuestAccountAndIssueToken() {
        // save 返回传入实体（模拟 JPA 托管实体回填），否则 loginAsGuest 内 save 返回 null 导致 NPE
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-guest-jwt");

        // Act
        UserSessionView session = realAuthService.loginAsGuest(null);

        // Assert：创建了独立体验账号（openid 约定 guest: 前缀 + 随机密码 BCrypt）并签发 token
        // 创建后 provisionGuestProfile 会再 save 两次（昵称 + 完善度100），故共 3 次
        org.mockito.ArgumentCaptor<User> captor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository, org.mockito.Mockito.times(3)).save(captor.capture());
        User saved = captor.getAllValues().get(0);
        assertNull(saved.getPhone(), "R4-00251：体验账号不占用手机号段");
        assertNotNull(saved.getOpenid(), "体验账号 openid 应非空");
        assertTrue(saved.getOpenid().startsWith("guest:"), "openid 应为 guest: 前缀");
        assertNotEquals("guest:13900000000", saved.getOpenid(), "R4-00251：不再复用固定体验账号");
        // 2026-08-31 人格池化（GuestPersona 6 套身份按 userId%6 分配昵称）：
        // 昵称动态化（如 阿辰/星野/夏言 等），此处只断言非空且非默认占位
        assertNotNull(saved.getNickname(), "体验账号昵称应非空");
        assertFalse(saved.getNickname().isBlank(), "体验账号昵称不应为空白");
        // 2026-09-02 R6 方向 C：体验账号角色为 GUEST（非正式注册 USER）
        assertEquals("GUEST", saved.getRole());
        assertEquals("active", saved.getStatus());
        assertNotNull(saved.getPassword(), "体验账号应设置随机密码");
        assertFalse(saved.getPassword().isBlank(), "随机密码不应为空");
        assertTrue(saved.getPassword().startsWith("$2"), "密码应为 BCrypt 哈希格式");
        assertNotNull(session);
        assertEquals("mock-guest-jwt", session.token());
    }

    /**
     * 场景 2（R4-00251）：两次登录创建两个不同账号（会话数据隔离），
     * 不再复用同一账号导致私信/匹配/点赞数据互相污染。
     */
    @Test
    void loginAsGuest_twoCalls_shouldCreateIsolatedAccounts() {
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-guest-jwt");

        // Act：连续两次登录
        realAuthService.loginAsGuest(null);
        realAuthService.loginAsGuest(null);

        // Assert：每次调用都创建新账号，且 openid 互不相同（会话身份隔离）
        org.mockito.ArgumentCaptor<User> captor = org.mockito.ArgumentCaptor.forClass(User.class);
        // 每次 loginAsGuest 产生 3 次 save（首次 + provision 昵称 + 完善度100），两次共 6 次
        verify(userRepository, org.mockito.Mockito.times(6)).save(captor.capture());
        List<User> created = captor.getAllValues();
        User first = created.get(0);   // 第一次登录的首次 save
        User second = created.get(3);  // 第二次登录的首次 save（索引 3，非 2）
        assertNotEquals(first.getOpenid(), second.getOpenid(),
                "R4-00251：两次体验登录必须创建不同会话账号");
    }

    /**
     * 场景 3：入口被配置关闭时（app.guest-login.enabled=false）拒绝登录。
     */
    @Test
    void loginAsGuest_disabledEntry_shouldReject() {
        // Arrange：构造关闭体验入口的 service
        RealAuthService disabledService = new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                userRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                aesEncryptor,
                tokenBlacklistService,
                onlineUserService,
                schoolRepository,
                false,
                "13900000000",
                smsCodeService
        );

        // Act & Assert
        // 修复（R4-02553）：禁用态抛 OperationForbiddenException（403），不再抛 IllegalStateException（500）
        assertThrows(OperationForbiddenException.class, () -> disabledService.loginAsGuest(null));
    }

    /* ============================================================
     * P0-4 体验账号会话隔离：每次体验登录一个独立访客身份
     * ============================================================
     *
     * <p><b>本组用例为什么必须把仓储桩做成「有状态的库」</b>：上面 场景 1/2 都没给
     * 「取最近体验号」查询打桩，Mockito 默认返回 null，复用分支在单测里永远走不到；
     * 而真实库只要有任意一条 {@code openid} 以 {@code guest:} 开头且 role=GUEST、
     * status=active 的记录，loginAsGuest 就会把同一个 userId、同一枚 JWT 发给所有访客
     * ——资料/帖子/点赞/私信/钱包跨访客互串（P0-4）。所以这里的替身必须表达真实库语义：
     * {@code save} 分配自增主键并把新体验号登记为「库中最近体验号」，
     * <b>任何</b>以 openid 为键、返回单个用户的查询都命中那条记录。</p>
     *
     * <p>查询应答按「方法名含 openid + 返回单个 User/Optional&lt;User&gt;」的<b>签名形状</b>
     * 判定，而不是按具体方法名打桩：一则是 P0-4 修复会把该派生查询方法一并摘除（按名打桩
     * 就编译不过了），二则是将来换一个方法名把「复用既有体验号」接回来时，本组用例会
     * 第一时间判红，而不是重演「mock 默认 null ⇒ 缺陷不可见」。</p>
     */

    /** 模拟真实库中已存在的历史体验号 id（P0-4 之后不得被任何访客复用）。 */
    private static final long LEGACY_GUEST_ID = 777L;

    /** 模拟真实库中已存在的历史体验号 openid。 */
    private static final String LEGACY_GUEST_OPENID = "guest:0123456789abcdef0123456789abcdef";

    /** 假库自增 id 起点，与 {@link #LEGACY_GUEST_ID} 区隔，便于断言「这是新身份」。 */
    private static final long FAKE_GUEST_ID_START = 9000L;

    /** 假库的自增 id 计数器（JUnit5 每个用例一个新测试实例，故无需重置）。 */
    private final AtomicLong fakeGuestIdSequence = new AtomicLong(FAKE_GUEST_ID_START);

    /** 假库中「最近一条体验号」——真实库语义下任何按 openid 取用户的查询都命中它。 */
    private final AtomicReference<User> latestGuestInDb = new AtomicReference<>();

    /**
     * 构造真实库中已存在的那条历史体验号记录（openid 前缀 guest:、角色 GUEST、active）。
     *
     * @return 历史体验号 User
     */
    private User legacyGuestRow() {
        User legacy = new User();
        legacy.setId(LEGACY_GUEST_ID);
        legacy.setOpenid(LEGACY_GUEST_OPENID);
        legacy.setNickname("星野");
        legacy.setRole("GUEST");
        legacy.setStatus("active");
        legacy.setProfileCompletion(100);
        legacy.setFollowingCount(0);
        legacy.setFollowersCount(0);
        return legacy;
    }

    /**
     * 假库落库：无 id 的记录分配自增 id（模拟 JPA 主键回填），guest 前缀记录登记为
     * 「库中最近体验号」。
     *
     * @param candidate 待保存的用户
     * @return 带 id 的托管态用户
     */
    private User persistRowIntoFakeDb(User candidate) {
        if (candidate == null) {
            return null;
        }
        if (candidate.getId() == null) {
            candidate.setId(fakeGuestIdSequence.incrementAndGet());
        }
        if (candidate.getOpenid() != null && candidate.getOpenid().startsWith("guest:")) {
            latestGuestInDb.set(candidate);
        }
        return candidate;
    }

    /**
     * 「库里已有一条体验号」形态的 UserRepository 替身。
     *
     * @return 带状态应答的仓储 mock（save 落库并回填主键；按 openid 取单个用户命中库中体验号）
     */
    private UserRepository statefulGuestRepositoryMock() {
        latestGuestInDb.set(legacyGuestRow());
        return mock(UserRepository.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            Class<?> returnType = invocation.getMethod().getReturnType();
            if ("save".equals(methodName) || "saveAndFlush".equals(methodName)) {
                return persistRowIntoFakeDb(invocation.getArgument(0));
            }
            boolean openidKeyedSingleUserLookup = methodName.toLowerCase().contains("openid")
                    && (returnType == User.class || returnType == Optional.class);
            if (openidKeyedSingleUserLookup) {
                User latest = latestGuestInDb.get();
                if (latest == null) {
                    return returnType == Optional.class ? Optional.empty() : null;
                }
                return returnType == Optional.class ? Optional.of(latest) : latest;
            }
            return org.mockito.Mockito.RETURNS_DEFAULTS.answer(invocation);
        });
    }

    /**
     * 用指定仓储替身构造 service（体验入口开关可控），复用与被测 service 相同的构造口径。
     *
     * @param repository       仓储替身
     * @param guestLoginEnabled 体验登录开关
     * @return RealAuthService 实例
     */
    private RealAuthService newRealAuthService(UserRepository repository, boolean guestLoginEnabled) {
        return new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                repository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                aesEncryptor,
                tokenBlacklistService,
                onlineUserService,
                schoolRepository,
                guestLoginEnabled,
                "13900000000",
                smsCodeService
        );
    }

    /**
     * token 按 userId 派生（{@code jwt-for-<userId>}）。
     *
     * <p>这样「同一枚 JWT 发给两个访客」这种共用身份的表现能被断言直接捕获，
     * 而不是只比对一个固定 mock 串。</p>
     */
    private void stubTokenDerivedFromUserId() {
        when(jwtTokenProvider.generateToken(any())).thenAnswer(invocation -> "jwt-for-" + invocation.getArgument(0));
    }

    /**
     * 反射注入 {@code @Autowired(required = false)} 的可选字段
     * （与 RedisTokenBlacklistServiceTest 注入 redisTemplate 同法）。
     *
     * @param target    目标 service 实例
     * @param fieldName 字段名
     * @param value     注入值
     */
    private static void injectOptionalField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = RealAuthService.class.getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("注入 " + fieldName + " 失败", ex);
        }
    }

    /**
     * P0-4 场景 1：库里已有体验号时，体验登录仍必须创建独立新身份，不得复用既有账号。
     */
    @Test
    @DisplayName("P0-4：库中已有体验号时仍创建独立新身份（不复用 userId/token）")
    void loginAsGuest_existingGuestInDb_shouldCreateNewIdentityInsteadOfReusing() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();

        UserSessionView session = newRealAuthService(guestDb, true).loginAsGuest("device-p04");

        assertNotEquals(String.valueOf(LEGACY_GUEST_ID), session.userId(),
                "P0-4：体验登录不得复用库中既有体验号——同一 userId 意味着资料/帖子/点赞/私信/钱包跨访客共享");
        assertNotEquals("jwt-for-" + LEGACY_GUEST_ID, session.token(),
                "P0-4：体验登录不得把既有体验号的 JWT 发给新访客");

        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(guestDb, times(3)).save(saved.capture());
        User created = saved.getAllValues().get(0);
        assertTrue(created.getOpenid().startsWith("guest:"), "新体验号 openid 应为 guest: 前缀");
        assertNotEquals(LEGACY_GUEST_OPENID, created.getOpenid(),
                "P0-4：新体验号 openid 必须是新随机 UUID，不能是库中既有那条");
    }

    /**
     * P0-4 场景 2：连续两次体验登录返回两个不同的 userId 与两枚不同的 token。
     */
    @Test
    @DisplayName("P0-4：两次体验登录返回不同 userId 与不同 token")
    void loginAsGuest_twoSequentialCalls_shouldReturnDifferentUserIdAndToken() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();
        RealAuthService service = newRealAuthService(guestDb, true);

        UserSessionView first = service.loginAsGuest(null);
        UserSessionView second = service.loginAsGuest(null);

        assertNotEquals(first.userId(), second.userId(),
                "P0-4：第二次体验登录复用第一次的身份（第一次落库后库中已有体验号），访客数据将互串");
        assertNotEquals(first.token(), second.token(),
                "P0-4：两次体验登录签发同一枚 JWT，等同于共用账号");
    }

    /**
     * P0-4 场景 3：同一 deviceId 连续两次登录仍是两个独立身份。
     *
     * <p>产品裁定（P0-4）：访客身份按「会话」隔离，<b>不</b>建立 deviceId→体验号的
     * 持久映射（那等于把共用账号换个键名回来，且需要新的表/字段）。</p>
     */
    @Test
    @DisplayName("P0-4：同一 deviceId 两次登录不产生设备级持久体验号")
    void loginAsGuest_sameDeviceIdTwice_shouldStillCreateIndependentIdentities() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();
        RealAuthService service = newRealAuthService(guestDb, true);

        UserSessionView first = service.loginAsGuest("device-same");
        UserSessionView second = service.loginAsGuest("device-same");

        assertNotEquals(first.userId(), second.userId(),
                "P0-4：deviceId 不得作为体验号复用键——同设备两次进入也必须是独立身份");
    }

    /**
     * P0-4 场景 4：每次体验登录为新 userId 各自预填一份基本资料。
     */
    @Test
    @DisplayName("P0-4：两次体验登录为两个不同 userId 各自预填资料")
    void loginAsGuest_twoSequentialCalls_shouldProvisionProfilePerNewIdentity() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();
        RealAuthService service = newRealAuthService(guestDb, true);

        service.loginAsGuest(null);
        service.loginAsGuest(null);

        org.mockito.ArgumentCaptor<Long> profiledUserIds = org.mockito.ArgumentCaptor.forClass(Long.class);
        verify(userBasicProfileRepository, times(2)).findByUserId(profiledUserIds.capture());
        assertEquals(2, new HashSet<>(profiledUserIds.getAllValues()).size(),
                "P0-4：两次体验的资料预填落在同一个 userId 上，说明访客共用了账号");
        verify(userBasicProfileRepository, times(2)).save(any(UserBasicProfile.class));
    }

    /**
     * P0-4 场景 5：在线会话与设备记录归属到新体验号，而非库中既有体验号。
     */
    @Test
    @DisplayName("P0-4：在线会话/设备记录属于新建体验号")
    void loginAsGuest_shouldRecordOnlineSessionAndDeviceForNewIdentity() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();
        RealAuthService service = newRealAuthService(guestDb, true);
        DeviceSessionService deviceSessionService = mock(DeviceSessionService.class);
        injectOptionalField(service, "deviceSessionService", deviceSessionService);
        when(jwtTokenProvider.getJtiFromToken(any())).thenReturn("jti-p04");

        UserSessionView session = service.loginAsGuest("device-p04");
        long newGuestId = Long.parseLong(session.userId());

        assertNotEquals(LEGACY_GUEST_ID, newGuestId, "前置：会话身份应是新建体验号");
        verify(onlineUserService).recordLogin(eq(newGuestId), eq("jti-p04"), eq("guest"), anyLong());
        verify(deviceSessionService).recordLogin(eq(newGuestId), eq("device-p04"), eq("guest"), eq("jti-p04"));
        verify(onlineUserService, never()).recordLogin(eq(LEGACY_GUEST_ID), any(), any(), anyLong());
        verify(deviceSessionService, never()).recordLogin(eq(LEGACY_GUEST_ID), any(), any(), any());
    }

    /**
     * P0-4 场景 6：入口关闭时仍返回 403 文案，且不新建、也不查询可复用的体验号。
     *
     * <p>本用例断言的是「禁用态必须先于任何仓储写入」这一保持不变的性质
     * （既有 场景 3 只断言了异常类型）。它是修复前后都为绿的保全守卫，
     * 不是 P0-4 缺陷的复现——复现见本组其余用例。</p>
     */
    @Test
    @DisplayName("P0-4：禁用开关仍 403，且不触碰体验号仓储")
    void loginAsGuest_disabledEntry_shouldRejectWithoutTouchingGuestRepository() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();
        RealAuthService disabledService = newRealAuthService(guestDb, false);

        OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                () -> disabledService.loginAsGuest("device-p04"));

        assertEquals(com.campuslove.api.common.ErrorMessages.TRIAL_LOGIN_DISABLED, ex.getMessage(),
                "禁用态应返回面向用户的 403 文案（TRIAL_LOGIN_DISABLED）");
        verify(guestDb, never()).save(any(User.class));
        verify(userBasicProfileRepository, never()).save(any(UserBasicProfile.class));
    }

    /**
     * P0-4 场景 7：并发首登撞 uk_users_openid 时，重试仍必须换出新 UUID 并创建独立新身份。
     *
     * <p>模拟真实库：库中已有历史体验号，本次 INSERT 与其 openid 碰撞（唯一约束冲突），
     * 第一次 save 抛 DataIntegrityViolationException，重试应使用<b>另一个</b>随机 UUID
     * 成功建号；既不能退化成复用既有账号，也不能漏成 500。</p>
     */
    @Test
    @DisplayName("P0-4：openid 唯一约束冲突重试后创建全新独立身份")
    void loginAsGuest_openidCollisionRetry_shouldCreateFreshIdentity() {
        UserRepository guestDb = statefulGuestRepositoryMock();
        stubTokenDerivedFromUserId();
        RealAuthService service = newRealAuthService(guestDb, true);
        org.mockito.Mockito.doThrow(new DataIntegrityViolationException("uk_users_openid"))
                .doAnswer(invocation -> persistRowIntoFakeDb(invocation.getArgument(0)))
                .when(guestDb).save(any(User.class));

        UserSessionView session = service.loginAsGuest("device-p04");

        assertNotEquals(String.valueOf(LEGACY_GUEST_ID), session.userId(),
                "P0-4：唯一约束冲突不得退化为复用库中既有体验号");
        assertEquals(String.valueOf(FAKE_GUEST_ID_START + 1), session.userId(),
                "P0-4：重试成功应落在新建的体验号上");

        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        // 4 次：碰撞的 INSERT + 换 UUID 后的 INSERT + 人格昵称回写 + 完善度 100 回写
        verify(guestDb, times(4)).save(saved.capture());
        List<String> attemptedOpenids = List.of(
                saved.getAllValues().get(0).getOpenid(),
                saved.getAllValues().get(1).getOpenid());
        assertTrue(attemptedOpenids.stream().allMatch(id -> id.startsWith("guest:")),
                "两次尝试的 openid 都应为 guest: 前缀");
        assertNotEquals(attemptedOpenids.get(0), attemptedOpenids.get(1),
                "R4-00252：碰撞重试必须更换新的随机 UUID");
        assertNotEquals(LEGACY_GUEST_OPENID, attemptedOpenids.get(0));
        assertNotEquals(LEGACY_GUEST_OPENID, attemptedOpenids.get(1));
    }

    /**
     * P0-4 装配漂移守卫（源码级）：体验登录方法体内不得再有任何「查已有用户」的仓储读取。
     *
     * <p>为什么还要一条文本守卫：mock 档只能证明「现在这条路不被走」，证明不了将来
     * 换一种写法（另一个派生查询名、或先查后建的老逻辑以别的形态回来）把复用接回来；
     * 而「先查最近体验号 → 非空就复用」正是本次 P0 的缺陷本体。这里按方法体文本判：
     * loginAsGuest 内不得出现 {@code userRepository.find}（体验登录除了建号不该读库），
     * 同时必须保留独立身份的三条正锚（随机 UUID 创建、碰撞重试、禁用 403）。</p>
     */
    @Test
    @DisplayName("P0-4 漂移守卫：体验登录方法体内无「查已有体验号」接线")
    void guestLoginSource_shouldNotWireAnyReusableGuestLookup() throws java.io.IOException {
        String serviceSource = java.nio.file.Files.readString(
                mainSourceOf("com/campuslove/api/auth", "RealAuthService.java"));
        String repositorySource = java.nio.file.Files.readString(
                mainSourceOf("com/campuslove/api/repository", "UserRepository.java"));
        String guestLoginBody = extractMethodBody(serviceSource, "UserSessionView loginAsGuest(String deviceId)");

        assertFalse(guestLoginBody.contains("userRepository.find"),
                "P0-4 回归：体验登录又接回了「查已有用户」的仓储读取——无论叫什么名字，"
                        + "只要先查再复用，所有访客就会共用同一账号");
        assertTrue(guestLoginBody.contains("\"guest:\" + UUID.randomUUID()"),
                "守卫失效告警：loginAsGuest 里「每次创建独立 guest:{UUID}」的正锚丢失");
        assertTrue(guestLoginBody.contains("DataIntegrityViolationException"),
                "守卫失效告警：loginAsGuest 的 openid 碰撞重试正锚丢失（R4-00252）");
        assertTrue(guestLoginBody.contains("OperationForbiddenException"),
                "守卫失效告警：loginAsGuest 的禁用态 403 正锚丢失（R4-02553）");
        assertFalse(repositorySource.contains("findFirstByOpenidStartingWithAndRoleAndStatusOrderByIdDesc"),
                "P0-4：该派生查询的契约就是「体验登录优先复用同一账号」，已随复用分支一并摘除；"
                        + "若要重新引入，必须先推翻 P0-4 的会话隔离裁定并重新评审");
    }

    /**
     * 按大括号配对截取方法体（只用于源码装配对账，不做语法解析）。
     *
     * @param source            源文件全文
     * @param signatureMarker   方法签名锚点文本
     * @return 方法体文本（含首尾大括号）
     */
    private String extractMethodBody(String source, String signatureMarker) {
        int signatureAt = source.indexOf(signatureMarker);
        assertTrue(signatureAt >= 0,
                "守卫失效告警：源码里找不到签名锚点「" + signatureMarker + "」，方法已改名/改签名，请同步更新守卫");
        int bodyStart = source.indexOf('{', signatureAt);
        int depth = 0;
        for (int i = bodyStart; i < source.length(); i++) {
            char current = source.charAt(i);
            if (current == '{') {
                depth++;
            } else if (current == '}' && --depth == 0) {
                return source.substring(bodyStart, i + 1);
            }
        }
        throw new IllegalStateException("未找到方法体结束括号: " + signatureMarker);
    }

    /**
     * 定位待对账的源码文件（surefire 工作目录为 apps/api，兼容从仓库根运行）。
     *
     * @param packagePath    com/campuslove/api 之下的包路径
     * @param simpleFileName 源文件名
     * @return 源文件绝对路径
     */
    private java.nio.file.Path mainSourceOf(String packagePath, String simpleFileName) {
        java.nio.file.Path relative = java.nio.file.Path.of("src/main/java", packagePath, simpleFileName);
        if (java.nio.file.Files.exists(relative)) {
            return relative.toAbsolutePath();
        }
        java.nio.file.Path fromRepoRoot = java.nio.file.Path.of("apps/api/src/main/java", packagePath, simpleFileName);
        assertTrue(java.nio.file.Files.exists(fromRepoRoot),
                "找不到待对账的源文件，装配守卫失效: " + relative.toAbsolutePath());
        return fromRepoRoot.toAbsolutePath();
    }
}