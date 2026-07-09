package com.campuslove.api.auth;

import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实认证服务实现。
 * 在 real profile 下激活，通过微信接口完成登录并签发 JWT 令牌。
 *
 * <p>使用 UserRepository / UserCampusProfileRepository / UserScheduleProfileRepository
 * 完成用户查找、创建及会话状态计算，数据持久化到数据库。</p>
 */
@Profile("real")
@Service
public class RealAuthService implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(RealAuthService.class);

    private final WeChatClient weChatClient;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    /**
     * BCrypt 密码编码器，用于校验管理员密码哈希。
     * 由 Spring 容器注入（见 {@link com.campuslove.api.config.PasswordEncoderConfig}）。
     */
    private final PasswordEncoder passwordEncoder;

    /**
     * 管理员登录密码哈希，由环境变量 ADMIN_PASSWORD 配置。
     * <p>注意：值必须为 BCrypt 哈希（格式 {@code $...}），而非明文。
     * 可通过 {@link com.campuslove.api.config.PasswordEncoderConfig#encodePassword(String)} 生成。</p>
     * 未配置时为空字符串，此时管理员登录将被禁用。
     */
    private final String adminPassword;

    public RealAuthService(
            WeChatClient weChatClient,
            JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.password:}") String adminPassword
    ) {
        this.weChatClient = weChatClient;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminPassword = adminPassword;
    }

    @Override
    public UserSessionView getCurrentSession(String token) {
        if (token == null || token.isBlank()) {
            return UserSessionView.withoutToken(
                    null, false, null, null,
                    false, false, false, false,
                    null, Map.of("chat_ai_enabled", false)
            );
        }

        String userId = jwtTokenProvider.getUserIdFromToken(token);
        if (userId == null) {
            // 令牌无效或已过期
            log.warn("JWT token 解析失败，返回未登录会话");
            return UserSessionView.withoutToken(
                    null, false, null, null,
                    false, false, false, false,
                    null, Map.of("chat_ai_enabled", false)
            );
        }

        // 根据 JWT 中的 userId 查找用户
        User user;
        try {
            Long uid = Long.parseLong(userId);
            Optional<User> userOpt = userRepository.findById(uid);
            if (userOpt.isEmpty()) {
                log.warn("JWT 中的 userId={} 在数据库中不存在，返回未登录会话", userId);
                return UserSessionView.withoutToken(
                        null, false, null, null,
                        false, false, false, false,
                        null, Map.of("chat_ai_enabled", false)
                );
            }
            user = userOpt.get();
        } catch (NumberFormatException ex) {
            log.error("JWT 中的 userId={} 格式非法，无法转换为 Long", userId, ex);
            return UserSessionView.withoutToken(
                    null, false, null, null,
                    false, false, false, false,
                    null, Map.of("chat_ai_enabled", false)
            );
        }

        // 从数据库计算各项会话状态
        return buildSessionView(user, token);
    }

    @Override
    @Transactional
    public UserSessionView loginWithWechat(String code) {
        // 1. 调用微信接口，用 code 换取 openid
        WeChatClient.WeChatSessionResponse session;
        try {
            session = weChatClient.code2Session(code);
        } catch (WeChatClient.WeChatAuthException ex) {
            log.error("WeChat auth failed for code(length={}): {}", code != null ? code.length() : 0, ex.getMessage());
            throw ex;
        }

        String openid = session.getOpenid();

        // 2. 查找或创建用户
        User user;
        try {
            Optional<User> existingUser = userRepository.findByOpenid(openid);
            if (existingUser.isPresent()) {
                user = existingUser.get();
                log.info("已有用户登录: userId={}, openid={}", user.getId(), maskOpenid(openid));
            } else {
                // 创建新用户
                user = new User();
                user.setOpenid(openid);
                user.setNickname(DisplayConstants.NEW_USER);
                user.setProfileCompletion(0);
                user.setFollowingCount(0);
                user.setFollowersCount(0);
                LocalDateTime now = LocalDateTime.now();
                user.setCreatedAt(now);
                user.setUpdatedAt(now);
                user = userRepository.save(user);
                log.info("创建新用户: userId={}, openid={}", user.getId(), maskOpenid(openid));
            }
        } catch (Exception ex) {
            log.error("查找/创建用户失败, openid={}: {}", openid, ex.getMessage(), ex);
            throw new RuntimeException("用户登录处理失败，请稍后重试", ex);
        }

        // 3. 生成 JWT 令牌（userId 为 Long 类型，转为 String 存储）
        String jwtToken = jwtTokenProvider.generateToken(String.valueOf(user.getId()));

        // 4. 返回会话视图
        return buildSessionView(user, jwtToken);
    }

    @Override
    public UserSessionView refreshToken(String oldToken) {
        if (oldToken == null || oldToken.isBlank()) {
            throw new IllegalArgumentException("Token 不能为空");
        }

        // 1. 验证旧令牌有效性
        if (!jwtTokenProvider.isTokenValid(oldToken)) {
            throw new IllegalArgumentException("Token 无效或已过期");
        }

        // 2. 从旧令牌中提取用户 ID
        String userId = jwtTokenProvider.getUserIdFromToken(oldToken);
        if (userId == null) {
            throw new IllegalArgumentException("无法从 Token 中提取用户信息");
        }

        // 3. 生成新令牌
        String newToken = jwtTokenProvider.generateToken(userId);

        // 4. 获取用户信息并返回新会话
        try {
            Long uid = Long.parseLong(userId);
            Optional<User> userOpt = userRepository.findById(uid);
            if (userOpt.isEmpty()) {
                throw new IllegalArgumentException("用户不存在");
            }
            return buildSessionView(userOpt.get(), newToken);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("用户 ID 格式无效");
        }
    }

    @Override
    public void logout(String token) {
        doLogout(token, "用户登出");
    }

    @Override
    public UserSessionView loginAsAdmin(String username, String password) {
        // 1. 校验入参非空，避免空指针；统一返回相同错误信息以防账号枚举
        if (username == null || username.isBlank() || password == null) {
            throw new IllegalArgumentException("管理员账号或密码错误");
        }

        // 2. 通过 openid 查找用户（约定：管理员 openid 字段存用户名）
        User user = userRepository.findByOpenid(username).orElse(null);
        if (user == null || !user.isAdmin()) {
            throw new IllegalArgumentException("管理员账号或密码错误");
        }

        // 3. 校验密码：优先使用数据库 password 字段，环境变量 ADMIN_PASSWORD 作为兜底。
        //
        // Phase 3 任务 13 扩展：引入 matchesPasswordWithMigration 通用校验方法，支持：
        //   - BCrypt 哈希校验（标准路径，格式 $2a$10$...）
        //   - 历史明文密码兼容（仅在 storedHash 非 BCrypt 格式时尝试明文 equals）
        //   - 自动迁移：明文校验通过后，将 user.password 升级为 BCrypt 哈希并持久化（一次性升级）
        //     仅对数据库 user.password 字段迁移，环境变量兜底不迁移（env var 是配置源，不应自动改写）
        //
        // 修复历史：原代码使用 String.equals 明文比较，存在严重安全风险（明文泄露、时序攻击）。
        // Phase 1 已切换为 BCrypt，本任务扩展为支持历史明文兼容与自动迁移。
        String storedHash = user.getPassword();
        boolean allowMigration = true;
        if (storedHash == null || storedHash.isBlank()) {
            storedHash = adminPassword;
            allowMigration = false;
        }
        if (storedHash == null || storedHash.isBlank()) {
            // 数据库与环境变量均未配置密码哈希，管理员登录未启用
            throw new IllegalStateException("管理员登录未启用");
        }
        if (!matchesPasswordWithMigration(user, password, storedHash, allowMigration)) {
            throw new IllegalArgumentException("管理员账号或密码错误");
        }

        // 4. 生成 JWT 令牌并返回会话视图
        String jwtToken = jwtTokenProvider.generateToken(String.valueOf(user.getId()));
        log.info("管理员登录成功, userId={}, username={}", user.getId(), username);
        return buildSessionView(user, jwtToken);
    }

    @Override
    public void logoutAsAdmin(String token) {
        doLogout(token, "管理员登出");
    }

    /**
     * 将明文密码编码为 BCrypt 哈希，供管理员账号创建/重置密码场景使用。
     *
     * <p>使用场景：
     * <ul>
     *   <li>创建新管理员账号时，将明文密码编码后存储到 ADMIN_PASSWORD 环境变量或数据库 password 字段</li>
     *   <li>管理员重置密码时，生成新的 BCrypt 哈希用于更新存储</li>
     * </ul>
     *
     * <p>安全说明：明文密码仅在调用时存在内存中，不会被持久化。存储和传输的始终是 BCrypt 哈希。
     *
     * @param rawPassword 明文密码（不能为 null 或空）
     * @return BCrypt 哈希字符串，格式为 {@code $...}
     * @throws IllegalArgumentException 当 rawPassword 为 null 或空时
     */
    public String encodeAdminPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("rawPassword 不能为空");
        }
        return passwordEncoder.encode(rawPassword);
    }

    /**
     * 校验明文密码与存储的哈希是否匹配，支持历史明文密码自动迁移到 BCrypt。
     *
     * <p>Phase 3 任务 13 新增：本方法作为通用密码校验入口，供管理员登录及未来
     * 普通用户密码登录场景复用。校验顺序如下：
     * <ol>
     *   <li>优先使用 BCrypt matches 校验（标准路径，哈希格式 {@code $2a$10$...}）</li>
     *   <li>若 BCrypt 校验失败且 storedHash 不符合 BCrypt 格式（非 {@code $2} 开头），
     *       尝试明文 equals 比较（兼容历史明文密码，防止迁移期间登录失败）</li>
     *   <li>若明文比较通过且 allowMigration=true，自动将明文密码迁移为 BCrypt 哈希并
     *       持久化到 user.password（一次性升级），后续登录走 BCrypt 标准路径</li>
     * </ol>
     *
     * <p>安全考虑：
     * <ul>
     *   <li>明文比较仅在 storedHash 非 BCrypt 格式时触发，避免对有效 BCrypt 哈希做无意义明文比较</li>
     *   <li>迁移仅更新 user.password 字段，环境变量 ADMIN_PASSWORD 兜底场景不迁移
     *       （env var 是配置源，不应被运行时自动改写）</li>
     *   <li>迁移使用新随机 salt 生成 BCrypt 哈希，相同明文每次迁移结果不同</li>
     * </ul>
     *
     * @param user            用户实体（如触发迁移则更新其 password 字段并持久化）
     * @param rawPassword     用户输入的明文密码
     * @param storedHash      存储的密码哈希（user.password 或环境变量兜底）
     * @param allowMigration  是否允许在明文校验通过时自动迁移到 BCrypt
     * @return true 表示密码匹配（可能已触发迁移），false 表示不匹配
     */
    private boolean matchesPasswordWithMigration(User user, String rawPassword,
                                                 String storedHash, boolean allowMigration) {
        if (storedHash == null || storedHash.isBlank()) {
            return false;
        }

        // 1. 优先 BCrypt 校验（标准路径）
        if (passwordEncoder.matches(rawPassword, storedHash)) {
            return true;
        }

        // 2. 兼容历史明文：仅在 storedHash 不像 BCrypt 格式时尝试明文比较
        //    BCrypt 哈希格式：$2a$、$2b$、$2y$ 开头
        if (!isBCryptHash(storedHash) && rawPassword.equals(storedHash)) {
            // 3. 自动迁移：仅当 allowMigration=true（即 storedHash 来自 user.password）时迁移
            if (allowMigration) {
                try {
                    String newHash = passwordEncoder.encode(rawPassword);
                    user.setPassword(newHash);
                    user.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(user);
                    log.info("历史明文密码已自动迁移为 BCrypt 哈希, userId={}", user.getId());
                } catch (Exception ex) {
                    // 迁移失败不影响登录通过，仅记录日志
                    log.error("历史明文密码迁移 BCrypt 失败, userId={}: {}",
                            user.getId(), ex.getMessage(), ex);
                }
            }
            return true;
        }
        return false;
    }

    /**
     * 判断字符串是否符合 BCrypt 哈希格式。
     * BCrypt 哈希以 {@code $2a$}、{@code $2b$} 或 {@code $2y$} 开头。
     *
     * @param hash 待判断的字符串
     * @return true 表示符合 BCrypt 哈希格式
     */
    private boolean isBCryptHash(String hash) {
        return hash != null
                && hash.length() >= 4
                && hash.charAt(0) == '$'
                && hash.charAt(1) == '2'
                && (hash.charAt(2) == 'a' || hash.charAt(2) == 'b' || hash.charAt(2) == 'y')
                && hash.charAt(3) == '$';
    }

    /**
     * 将明文密码编码为 BCrypt 哈希，供普通用户注册/密码重置场景使用。
     *
     * <p>Phase 3 任务 13 新增：与 {@link #encodeAdminPassword} 逻辑一致，独立方法名以表达语义
     * （普通用户密码 vs 管理员密码），便于未来按角色差异化配置（如不同 cost factor）。</p>
     *
     * <p>当前项目普通用户使用微信登录无密码，本方法为未来开通密码登录场景预留。
     * 调用方应在注册/重置密码时调用本方法，将返回的哈希存入 {@link User#getPassword()}。</p>
     *
     * @param rawPassword 明文密码（不能为 null 或空）
     * @return BCrypt 哈希字符串，格式为 {@code $2a$10$...}
     * @throws IllegalArgumentException 当 rawPassword 为 null 或空时
     */
    public String encodeUserPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("rawPassword 不能为空");
        }
        return passwordEncoder.encode(rawPassword);
    }

    /**
     * 登出日志记录的内部实现。
     * 当前实现使用无状态 JWT，登出仅记录日志，不做实际 token 失效；
     * 生产环境如需 token 黑名单可在此扩展。
     *
     * @param token  当前 JWT 令牌（可能为 null 或非法）
     * @param action 日志中的操作描述（如 "用户登出" / "管理员登出"）
     */
    private void doLogout(String token, String action) {
        String userId = null;
        try {
            if (token != null && !token.isBlank()) {
                userId = jwtTokenProvider.getUserIdFromToken(token);
            }
        } catch (Exception ex) {
            // 防止日志失败影响流程
            log.debug("登出时解析 token 失败: {}", ex.getMessage());
        }
        log.info("{}, userId={}", action, userId);
    }

    private String maskOpenid(String openid) {
        if (openid == null || openid.length() <= 8) {
            return "****";
        }
        return openid.substring(0, 4) + "****" + openid.substring(openid.length() - 4);
    }

    /**
     * 根据用户实体构建完整的会话视图。
     * 从数据库查询校园认证状态、日程偏好等，计算 profileCompleted / campusVerified / scheduleCompleted 等字段。
     *
     * @param user  用户实体
     * @param token JWT 令牌（可为 null）
     * @return 完整的 UserSessionView
     */
    private UserSessionView buildSessionView(User user, String token) {
        Long userId = user.getId();

        // profileCompleted: profileCompletion >= 100 视为已完成
        boolean profileCompleted = user.getProfileCompletion() != null
                && user.getProfileCompletion() >= 100;

        // campusVerified: 查询 UserCampusProfile 是否存在且 verificationStatus == "verified"
        boolean campusVerified = false;
        String campusName = null;
        try {
            Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(userId);
            if (campusOpt.isPresent()) {
                UserCampusProfile campusProfile = campusOpt.get();
                campusName = campusProfile.getCampusName();
                campusVerified = "verified".equals(campusProfile.getVerificationStatus());
            }
        } catch (Exception ex) {
            log.error("查询用户校园资料失败, userId={}: {}", userId, ex.getMessage(), ex);
        }

        // scheduleCompleted: 查询 UserScheduleProfile 是否存在
        boolean scheduleCompleted = false;
        try {
            Optional<UserScheduleProfile> scheduleOpt = userScheduleProfileRepository.findByUserId(userId);
            scheduleCompleted = scheduleOpt.isPresent();
        } catch (Exception ex) {
            log.error("查询用户日程偏好失败, userId={}: {}", userId, ex.getMessage(), ex);
        }

        // phoneBound: 手机号非空且非空白
        boolean phoneBound = user.getPhone() != null && !user.getPhone().isBlank();

        // displayName: 使用用户昵称
        String displayName = user.getNickname() != null ? user.getNickname() : DisplayConstants.NEW_USER;

        return new UserSessionView(
                String.valueOf(userId),
                true,
                "wechat",
                displayName,
                phoneBound,
                profileCompleted,
                campusVerified,
                scheduleCompleted,
                campusName,
                Map.of("chat_ai_enabled", false),
                token
        );
    }
}
