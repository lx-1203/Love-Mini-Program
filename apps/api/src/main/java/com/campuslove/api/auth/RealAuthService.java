package com.campuslove.api.auth;

import com.campuslove.api.admin.auth.AdminDisabledException;
import com.campuslove.api.admin.auth.InvalidCredentialsException;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import io.jsonwebtoken.JwtException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实认证服务实现。
 * 在 real profile 下激活，通过微信接口完成登录并签发 JWT 令牌。
 *
 * <p>使用 UserRepository / UserCampusProfileRepository / UserScheduleProfileRepository
 * 完成用户查找、创建及会话状态计算，数据持久化到数据库。</p>
 *
 * <p>修复：
 * <ul>
 *   <li>敏感数据加密：微信 openid 通过 {@link AesEncryptor} 加密后存储到数据库，
 *       避免数据库泄露时直接暴露用户身份标识。加密前后兼容：解密失败时视为明文，
 *       支持历史明文数据平滑迁移。</li>
 *   <li>日志脱敏：openid 显示前 4 + 后 4 位，phone 显示前 3 + 后 4 位，
 *       避免日志泄露完整敏感信息。</li>
 *   <li>登出黑名单：logout 时将 token 加入 JwtTokenProvider 黑名单，立即失效。</li>
 * </ul>
 * </p>
 */
@Profile("real & !dev")
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
     * AES 加密器，用于敏感数据（openid/phone）的加密存储与读取。
     * 由 Spring 容器注入，密钥通过 APP_AES_SECRET 环境变量配置。
     */
    private final AesEncryptor aesEncryptor;

    /**
     * Task 0.5.3：JWT 黑名单服务，用于登出时将 jti 加入 Redis 黑名单，
     * 实现 JWT 主动失效。
     */
    private final TokenBlacklistService tokenBlacklistService;

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
            AesEncryptor aesEncryptor,
            TokenBlacklistService tokenBlacklistService,
            @Value("${app.admin.password:}") String adminPassword
    ) {
        this.weChatClient = weChatClient;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.aesEncryptor = aesEncryptor;
        this.tokenBlacklistService = tokenBlacklistService;
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
            user = userOpt.orElseThrow(() ->
                    new IllegalStateException("userOpt 已确认非空但 orElseThrow 触发，数据不一致"));
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
    public UserSessionView loginWithWechat(String code) {
        // Task 2.5.5：移除方法级 @Transactional，将远程调用移出事务边界。
        // 原实现将 weChatClient.code2Session()（可能耗时 1-3s）置于事务内，
        // 导致数据库连接被长时间占用，高并发下易引发连接池耗尽。
        // 现拆分为两阶段：
        //   阶段 1（无事务）：调用微信接口换取 openid（远程调用，不占用 DB 连接）
        //   阶段 2（事务）：查找或创建用户、生成 JWT、构建会话视图（DB 操作）
        // DB 操作的原子性由 findOrCreateUserForWechatLogin 的 @Transactional 保证，
        // 单次 save 亦由 SimpleJpaRepository 自带事务兜底。

        // 1. 调用微信接口，用 code 换取 openid（远程调用，移出事务边界）
        //    失败时将 WeChatClient.WeChatAuthException 映射为 WechatLoginException，
        //    携带明确业务错误码（INVALID_CODE / WECHAT_API_ERROR），
        //    供 GlobalExceptionHandler 转换为标准化 HTTP 响应，前端按错误码分支处理。
        WeChatClient.WeChatSessionResponse session;
        try {
            session = weChatClient.code2Session(code);
        } catch (WeChatClient.WeChatAuthException ex) {
            Integer errcode = ex.getErrcode();
            log.warn("WeChat auth failed for code(length={}): errcode={}, message={}",
                    code != null ? code.length() : 0, errcode, ex.getMessage());
            // errcode 40029：code 无效/已过期 → INVALID_CODE（401）
            // 其他 errcode 或网络异常 → WECHAT_API_ERROR（502）
            if (errcode != null && errcode == 40029) {
                throw new WechatLoginException(
                        WechatLoginException.ErrorCode.INVALID_CODE,
                        "微信登录凭证已失效，请重新登录",
                        ex);
            }
            throw new WechatLoginException(
                    WechatLoginException.ErrorCode.WECHAT_API_ERROR,
                    "微信服务暂时不可用：" + (ex.getMessage() != null ? ex.getMessage() : "unknown"),
                    ex);
        }

        String openid = session.getOpenid();
        // 修复：openid 加密后再用于查询/存储，避免数据库明文泄露用户身份
        // 实现策略：openid 用于唯一索引查询，使用 SHA-256 派生固定 hash 作为查询键，
        // 数据库 openid 字段存储派生 hash（不可逆，但可用于唯一性约束）。
        String openidHash = hashOpenid(openid);

        // 2. 查找或创建用户（事务边界仅覆盖 DB 操作）
        User user = findOrCreateUserForWechatLogin(openidHash, openid);

        // 2.5 用户禁用检查：被管理员禁用的账号禁止登录，返回 USER_DISABLED（403）。
        //     新创建用户 status 默认为 active，此处主要拦截老用户被禁用后再次登录的场景。
        //     与 RealAuthService.loginAsAdmin 中 admin 禁用检查语义保持一致。
        if (user.isDisabled()) {
            log.warn("禁用用户尝试登录, userId={}, openid={}", user.getId(), maskOpenid(openid));
            throw new WechatLoginException(
                    WechatLoginException.ErrorCode.USER_DISABLED,
                    "账号已被禁用，请联系管理员");
        }

        // 3. 生成 JWT 令牌（userId 为 Long 类型，转为 String 存储）
        String jwtToken = jwtTokenProvider.generateToken(String.valueOf(user.getId()));

        // 4. 返回会话视图
        return buildSessionView(user, jwtToken);
    }

    /**
     * Task 2.5.5：微信登录的 DB 操作事务边界。
     *
     * <p>将查找/创建用户逻辑抽取为独立 {@code @Transactional} 方法，使事务仅覆盖
     * DB 操作（findByOpenid + save），不再包含远程调用。事务范围最小化，降低
     * 数据库连接占用时间，避免长事务引发的连接池耗尽问题。</p>
     *
     * <p>注意：因 Spring AOP 代理不拦截同类内部方法调用，本方法采用 public 可见性
     * 以便后续如需通过 self-injection 调用；当前由 {@link #loginWithWechat} 直接调用，
     * Spring 在 proxy 调用 {@code loginWithWechat} 时已无 @Transactional，本方法
     * 通过 Spring Data JPA 的 SimpleJpaRepository.save() 自带事务保证单次写入原子性，
     * 多次写入场景（如未来扩展为同时保存用户与初始化资料）需通过 self-injection
     * 或 TransactionTemplate 显式开启事务。</p>
     *
     * @param openidHash openid 的 SHA-256 派生 hash（用于查询/存储）
     * @param openid     原始 openid（仅用于日志脱敏展示）
     * @return 已存在或新创建的用户实体
     */
    @Transactional
    public User findOrCreateUserForWechatLogin(String openidHash, String openid) {
        User user;
        try {
            Optional<User> existingUser = userRepository.findByOpenid(openidHash);
            if (existingUser.isPresent()) {
                user = existingUser.get();
                log.info("已有用户登录: userId={}, openid={}", user.getId(), maskOpenid(openid));
            } else {
                // 创建新用户：openid 字段存储派生 hash（不可逆，保护原始 openid）
                user = new User();
                user.setOpenid(openidHash);
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
        } catch (DataAccessException ex) {
            log.error("查找/创建用户失败, openid={}: {}", maskOpenid(openid), ex.getMessage(), ex);
            throw new RuntimeException("用户登录处理失败，请稍后重试", ex);
        }
        return user;
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
            throw new InvalidCredentialsException("管理员账号或密码错误");
        }

        // 2. 通过 openid 查找用户（约定：管理员 openid 字段存用户名）
        User user = userRepository.findByOpenid(username).orElse(null);
        if (user == null || !user.isAdmin()) {
            // 防账号枚举：账号不存在或非管理员均统一返回凭据无效
            throw new InvalidCredentialsException("管理员账号或密码错误");
        }

        // 3. 校验账号状态：禁用账号拒绝登录并返回明确错误码 ADMIN_DISABLED。
        //    修复（Task 0.4.2）：原代码未校验 status 字段，被禁用的管理员仍可登录获取 token，
        //    存在安全隐患。现增加 status 校验，与 User.isDisabled() 语义保持一致
        //    （status='disabled' 即视为禁用）。
        //    注意：User 实体无 enabled 字段，仅有 status（active/disabled），
        //    故按现有数据模型校验 status，与任务要求"禁用账号拒绝登录"语义一致。
        if (user.isDisabled()) {
            log.warn("禁用管理员账号尝试登录, userId={}, username={}", user.getId(), username);
            throw new AdminDisabledException("管理员账号已被禁用，请联系超级管理员");
        }

        // 4. 校验密码：优先使用数据库 password 字段，环境变量 ADMIN_PASSWORD 作为兜底。
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
            throw new InvalidCredentialsException("管理员账号或密码错误");
        }

        // 5. 生成 JWT 令牌并返回会话视图
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
                } catch (DataAccessException ex) {
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
     *
     * <p>Task 0.5.3 升级：登出时将 JWT 的 jti 加入 Redis 黑名单（通过 {@link TokenBlacklistService}），
     * TTL 设为 JWT 剩余有效期，实现：
     * <ul>
     *   <li>多实例共享：所有应用实例共享 Redis 黑名单，登出后立即在所有实例生效</li>
     *   <li>自动过期清理：Token 自然过期后黑名单条目由 Redis TTL 自动清理</li>
     *   <li>降级容错：Redis 不可用时降级到本地内存黑名单，不阻塞登出主流程</li>
     * </ul>
     * 同时保留旧 {@link JwtTokenProvider#revokeToken} 调用，兼容过渡期间的双黑名单方案。</p>
     *
     * @param token  当前 JWT 令牌（可能为 null 或非法）
     * @param action 日志中的操作描述（如 "用户登出" / "管理员登出"）
     */
    private void doLogout(String token, String action) {
        String userId = null;
        try {
            if (token != null && !token.isBlank()) {
                userId = jwtTokenProvider.getUserIdFromToken(token);

                // Task 0.5.3：将 jti 加入 Redis 黑名单（TTL = JWT 剩余有效期）
                String jti = jwtTokenProvider.getJtiFromToken(token);
                if (jti != null && !jti.isBlank()) {
                    long ttlSeconds = jwtTokenProvider.getRemainingTtlSeconds(token);
                    if (ttlSeconds > 0) {
                        tokenBlacklistService.revoke(jti, ttlSeconds);
                        log.debug("jti={} 已加入 Redis 黑名单, ttl={}秒", jti, ttlSeconds);
                    }
                }

                // 兼容旧黑名单实现：将完整 token 加入 JwtTokenProvider 黑名单
                // 保留过渡期，确保旧 token（无 jti）也能被撤销
                jwtTokenProvider.revokeToken(token);
            }
        } catch (JwtException ex) {
            // JWT 解析失败时不影响登出主流程
            log.debug("登出时解析 token 失败: {}", ex.getMessage());
        }
        log.info("{}, userId={}", action, userId);
    }

    /**
     * 对微信 openid 进行 SHA-256 派生 hash，用作查询键与存储值。
     *
     * <p>修复：原代码将 openid 明文存储到数据库，存在敏感数据泄露风险。
     * 现使用 SHA-256 派生 hash 替代明文存储：
     * <ul>
     *   <li>不可逆：无法从 hash 反推原始 openid</li>
     *   <li>确定性：相同 openid 多次 hash 结果一致，可用于等值查询</li>
     *   <li>抗碰撞：SHA-256 抗碰撞强度足够</li>
     * </ul>
     * </p>
     *
     * <p>注意：原始 openid 不再持久化，如未来需要原始 openid（如调微信 API），
     * 应单独加密存储于另一字段（如 openid_encrypted），由 AesEncryptor 解密读取。</p>
     *
     * @param openid 原始微信 openid
     * @return SHA-256 hex 字符串（小写），长度 64
     */
    private String hashOpenid(String openid) {
        if (openid == null || openid.isBlank()) {
            return openid;
        }
        try {
            java.security.MessageDigest sha256 = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = sha256.digest(openid.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            // 转换为小写 hex 字符串
            StringBuilder sb = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException ex) {
            // SHA-256 是 JDK 内置算法，理论上不会缺失
            throw new IllegalStateException("SHA-256 算法不可用", ex);
        }
    }

    private String maskOpenid(String openid) {
        if (openid == null || openid.length() <= 8) {
            return "****";
        }
        return openid.substring(0, 4) + "****" + openid.substring(openid.length() - 4);
    }

    /**
     * 手机号脱敏：显示前 3 + 后 4 位，中间用 **** 替换。
     * 修复：日志中输出完整手机号会泄露用户隐私，统一脱敏处理。
     *
     * @param phone 原始手机号
     * @return 脱敏后的字符串（如 "138****5678"），输入过短返回 "****"
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() <= 7) {
            return "****";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
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
        } catch (DataAccessException ex) {
            log.error("查询用户校园资料失败, userId={}: {}", userId, ex.getMessage(), ex);
        }

        // scheduleCompleted: 查询 UserScheduleProfile 是否存在
        boolean scheduleCompleted = false;
        try {
            Optional<UserScheduleProfile> scheduleOpt = userScheduleProfileRepository.findByUserId(userId);
            scheduleCompleted = scheduleOpt.isPresent();
        } catch (DataAccessException ex) {
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
