package com.campuslove.api.auth;

import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;

    private PasswordEncoder passwordEncoder;
    private RealAuthService realAuthService;

    /** 测试用的明文密码 */
    private static final String RAW_PASSWORD = "Admin@2026";
    /** 错误的明文密码 */
    private static final String WRONG_PASSWORD = "wrong-password";

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

        // ADMIN_PASSWORD 环境变量留空，强制走数据库 password 字段校验路径
        realAuthService = new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                userRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                ""
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
     * 场景 4：环境变量兜底校验 —— 数据库无 password 字段时，回退到 ADMIN_PASSWORD 环境变量。
     */
    @Test
    void loginAsAdmin_withEmptyDbPassword_shouldFallbackToEnvVar() {
        // Arrange：管理员用户无 password 字段（旧数据迁移场景）
        User adminUser = createAdminUser(null);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt-token");

        // 重新构造 service，ADMIN_PASSWORD 环境变量配置为正确哈希
        RealAuthService serviceWithEnvHash = new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                userRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                correctHash
        );

        // Act & Assert：应通过环境变量哈希校验成功
        assertDoesNotThrow(() -> serviceWithEnvHash.loginAsAdmin("admin", RAW_PASSWORD));
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
        String plaintextPassword = "legacy-plaintext-pwd-2026";
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
     * 场景 8：环境变量兜底场景下，即使 storedHash 是明文也不应迁移（避免改写配置源）。
     */
    @Test
    void loginAsAdmin_withPlaintextEnvFallback_shouldNotMigrate() {
        // Arrange：管理员用户无 password 字段，环境变量为明文密码（异常配置）
        String plaintextEnvPassword = "env-plaintext-pwd-2026";
        User adminUser = createAdminUser(null);
        when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(adminUser));
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt-token");

        RealAuthService serviceWithPlaintextEnv = new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                userRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                plaintextEnvPassword
        );

        // Act：使用明文密码登录，应成功（环境变量兜底 + 明文比较）
        assertDoesNotThrow(() -> serviceWithPlaintextEnv.loginAsAdmin("admin", plaintextEnvPassword));

        // Assert：userRepository.save 不应被调用（环境变量兜底不迁移）
        verify(userRepository, never()).save(any());
    }

    /**
     * 场景 9：错误密码 + 明文 storedHash -> 校验失败，且不触发迁移。
     */
    @Test
    void loginAsAdmin_withWrongPasswordAndPlaintextHash_shouldFailWithoutMigration() {
        // Arrange：管理员用户的 password 字段为明文密码
        User adminUser = createAdminUser("legacy-plaintext-pwd-2026");
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
        String userRawPassword = "User@2026";

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
        String rawPassword = "NewUser@2026";
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
        String oldRawPassword = "OldPassword@2026";
        String newRawPassword = "NewPassword@2026";
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
}