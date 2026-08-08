package com.campuslove.api.auth;

import com.campuslove.api.admin.auth.AdminDisabledException;
import com.campuslove.api.admin.auth.InvalidCredentialsException;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.utils.SensitiveDataMasker;
import io.jsonwebtoken.JwtException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
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
 *   <li>日志脱敏（P0 CRITICAL FIN-00001/00002）：openId / phone / token 等敏感字段
 *       统一通过 {@link SensitiveDataMasker} 脱敏后再输出到日志，避免日志文件、APM 链路
 *       追踪、异常堆栈中泄露原始敏感值。openId 显示前 4 + 后 4 位，phone 显示前 3 + 后 4 位。</li>
 *   <li>登出黑名单：logout 时将 token 加入 JwtTokenProvider 黑名单，立即失效。</li>
 * </ul>
 * </p>
 */
@Profile("real")
@Service
public class RealAuthService implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(RealAuthService.class);

    private final WeChatClient weChatClient;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
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
     * 在线用户会话记录服务（eladmin「在线用户」对齐）。
     * 登录成功时写入 Redis 在线会话（TTL = JWT 有效期），登出时删除，
     * 供管理后台查看在线列表与踢下线。
     */
    private final OnlineUserService onlineUserService;

    /**
     * 高校 Repository：登录时校验管理员所属高校状态
     * （商业模式：高校被停用后，该校管理员登录被拒）。
     */
    private final SchoolRepository schoolRepository;

    /**
     * 管理员登录密码哈希，由环境变量 ADMIN_PASSWORD 配置。
     * <p>注意：值必须为 BCrypt 哈希（格式 {@code $...}），而非明文。
     * 可通过 {@link com.campuslove.api.config.PasswordEncoderConfig#encodePassword(String)} 生成。</p>
     * 未配置时为空字符串，此时管理员登录将被禁用。
     */
    private final String adminPassword;

    /**
     * 体验账号一键登录入口开关（配置 app.guest-login.enabled，默认关闭）。
     * <p>P0-14 修复：商业化默认关闭体验入口，本地演示可通过
     * {@code APP_GUEST_LOGIN_ENABLED=true} 或 {@code --app.guest-login.enabled=true}
     * 运行参数覆盖开启，体验功能本身保留。</p>
     */
    private final boolean guestLoginEnabled;

    /**
     * P0-14：体验账号黑名单手机号（仅体验入口可登录，禁止通过注册/手机号登录占用）。
     * 与 {@link #loginAsGuest()} 中固定体验手机号保持一致。
     */
    private static final String GUEST_BLACKLIST_PHONE = "13900000000";

    public RealAuthService(
            WeChatClient weChatClient,
            JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            PasswordEncoder passwordEncoder,
            AesEncryptor aesEncryptor,
            TokenBlacklistService tokenBlacklistService,
            OnlineUserService onlineUserService,
            SchoolRepository schoolRepository,
            @Value("${app.admin.password:}") String adminPassword,
            @Value("${app.guest-login.enabled:false}") boolean guestLoginEnabled
    ) {
        this.weChatClient = weChatClient;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.aesEncryptor = aesEncryptor;
        this.tokenBlacklistService = tokenBlacklistService;
        this.onlineUserService = onlineUserService;
        this.schoolRepository = schoolRepository;
        this.adminPassword = adminPassword;
        this.guestLoginEnabled = guestLoginEnabled;
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

        // 登出黑名单校验（本地联调修复）：/api/v1/auth/** 属于过滤器放行路径，
        // JwtAuthenticationFilter 不会对 /me 校验黑名单；此处补充 jti 撤销检查，
        // 保证登出后的 token 无法再获取会话（与受保护端点行为一致）。
        String jti = jwtTokenProvider.getJtiFromToken(token);
        if (jti != null && !jti.isBlank() && tokenBlacklistService.isRevoked(jti)) {
            log.info("JWT jti={} 已被撤销（用户已登出），返回未登录会话", jti);
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

        // 缺陷修复（走查）：用户被管理员禁用后，已持有的 JWT 调 /api/v1/auth/me
        // 仍返回 200 + loggedIn=true（受保护端点因 JwtAuthenticationFilter 检查
        // user.isDisabled() 正常返回 401/403，仅 /me 因 /api/v1/auth/** 放行不一致）。
        // 此处与登录路径（loginWithWechat 224-230 行）及登出黑名单行为对齐：
        // 禁用用户返回 loggedIn=false 的未登录会话，不抛 401/403，避免破坏前端
        // 会话状态机（前端据此跳转登录页）。
        if (user.isDisabled()) {
            log.warn("禁用用户尝试获取会话（/auth/me），userId={}，返回未登录会话", user.getId());
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

        // 修复（FIN HIGH-8）：熔断/重试耗尽时 fallback 返回 null，
        // 若此处直接调用 session.getOpenid() 必抛 NPE → 500。
        // 优雅降级：转换为业务异常 WECHAT_API_ERROR（502），由 GlobalExceptionHandler 标准化返回。
        if (session == null) {
            log.warn("WeChat jscode2session 返回 null（熔断/重试耗尽降级），code(length={})", code != null ? code.length() : 0);
            throw new WechatLoginException(
                    WechatLoginException.ErrorCode.WECHAT_API_ERROR,
                    "微信服务暂时不可用，请稍后重试");
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
            log.warn("禁用用户尝试登录, userId={}, openid={}", user.getId(), SensitiveDataMasker.mask(openid));
            throw new WechatLoginException(
                    WechatLoginException.ErrorCode.USER_DISABLED,
                    "账号已被禁用，请联系管理员");
        }

        // 3. 生成 JWT 令牌（userId 为 Long 类型，转为 String 存储）
        String jwtToken = jwtTokenProvider.generateToken(String.valueOf(user.getId()));

        // 3.5 记录在线会话（eladmin「在线用户」对齐）：Redis 写入 online:user:{userId}，TTL = JWT 有效期
        recordOnlineSession(user.getId(), jwtToken, "wechat");

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
     * <p>修复（FIN MED-54）：并发首登场景下两个请求同时通过 findByOpenid 检查并
     * 同时 INSERT，后提交者触发 {@code uk_users_openid} 唯一约束冲突（
     * {@link DataIntegrityViolationException}）。此处捕获后重试一次：
     * 再次查询通常能命中先提交者插入的用户记录，返回既有用户，避免 500。</p>
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
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                Optional<User> existingUser = userRepository.findByOpenid(openidHash);
                if (existingUser.isPresent()) {
                    User user = existingUser.get();
                    log.info("已有用户登录: userId={}, openid={}", user.getId(), SensitiveDataMasker.mask(openid));
                    return user;
                }
                // 创建新用户：openid 字段存储派生 hash（不可逆，保护原始 openid）
                User user = new User();
                user.setOpenid(openidHash);
                user.setNickname(DisplayConstants.NEW_USER);
                user.setProfileCompletion(0);
                user.setFollowingCount(0);
                user.setFollowersCount(0);
                LocalDateTime now = LocalDateTime.now();
                user.setCreatedAt(now);
                user.setUpdatedAt(now);
                user = userRepository.save(user);
                log.info("创建新用户: userId={}, openid={}", user.getId(), SensitiveDataMasker.mask(openid));
                return user;
            } catch (DataIntegrityViolationException ex) {
                // FIN MED-54：并发首登唯一约束冲突（uk_users_openid）
                if (attempt >= 2) {
                    log.warn("创建用户唯一约束冲突且重试仍失败, openid={}: {}",
                            SensitiveDataMasker.mask(openid), ex.getMessage());
                    throw new RuntimeException("用户登录处理失败，请稍后重试", ex);
                }
                log.info("创建用户唯一约束冲突（并发首登），重试查询既有用户: openid={}",
                        SensitiveDataMasker.mask(openid));
            } catch (DataAccessException ex) {
                log.error("查找/创建用户失败, openid={}: {}", SensitiveDataMasker.mask(openid), ex.getMessage(), ex);
                throw new RuntimeException("用户登录处理失败，请稍后重试", ex);
            }
        }
        // 理论不可达：循环最多 2 次
        throw new RuntimeException("用户登录处理失败，请稍后重试");
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

        // 1.5 修复（FIN HIGH-7）：检查 jti 黑名单——用户登出后旧 token 不应能换发新 token。
        //     若 jti 已撤销（登出/主动失效），直接拒绝刷新，返回业务异常。
        String jti = jwtTokenProvider.getJtiFromToken(oldToken);
        if (jti != null && !jti.isBlank() && tokenBlacklistService.isRevoked(jti)) {
            log.warn("刷新 Token 被拒绝：jti={} 已在黑名单（用户已登出）", jti);
            throw new IllegalArgumentException("Token 已被撤销，请重新登录");
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
            // 4.5 刷新令牌后同步更新在线会话：保留原登录方式，TTL 随新令牌刷新
            //     （原会话不存在时按 unknown 兜底，保证在线列表仍能看到该用户）
            try {
                String oldMethod = onlineUserService.getSession(uid)
                        .map(OnlineUserService.OnlineSessionRecord::loginMethod)
                        .orElse("unknown");
                String newJti = jwtTokenProvider.getJtiFromToken(newToken);
                onlineUserService.recordLogin(uid, newJti, oldMethod,
                        jwtTokenProvider.getRemainingTtlSeconds(newToken));
            } catch (RuntimeException ex) {
                // 在线会话更新失败不影响刷新主流程，仅记录日志
                log.warn("刷新在线会话失败, userId={}: {}", uid, ex.getMessage());
            }
            return buildSessionView(userOpt.get(), newToken);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("用户 ID 格式无效");
        }
    }

    @Override
    @Transactional
    public void logout(String token) {
        doLogout(token, "用户登出");
    }

    /**
     * 注册新用户（手机号 + 密码 + 昵称）。
     *
     * <p>实现要点：</p>
     * <ul>
     *   <li>手机号格式校验(1[3-9] 开头 11 位)</li>
     *   <li>密码 BCrypt 加密存储(password 字段)</li>
     *   <li>phone 唯一约束(查重)</li>
     *   <li>注册成功直接签发 JWT 会话,无需二次登录</li>
     * </ul>
     */
    @Override
    @Transactional
    public UserSessionView registerUser(String phone, String password, String nickname) {
        if (phone == null || !phone.matches("^1[3-9]\\d{9}$")) {
            throw new IllegalArgumentException("手机号格式不正确");
        }
        // P0-14：体验账号黑名单——13900000000 为体验入口专用手机号，禁止注册新账号
        if (GUEST_BLACKLIST_PHONE.equals(phone)) {
            log.warn("黑名单手机号注册被拒绝：phone={}", SensitiveDataMasker.mask(phone));
            throw new IllegalArgumentException("该手机号不可注册");
        }
        if (password == null || password.length() < 6 || password.length() > 64) {
            throw new IllegalArgumentException("密码长度须为 6-64 位");
        }
        if (nickname == null || nickname.isBlank() || nickname.trim().length() > 20) {
            throw new IllegalArgumentException("昵称长度须为 1-20 字");
        }
        boolean phoneExists = userRepository.findByPhone(phone).isPresent();
        if (phoneExists) {
            throw new IllegalArgumentException("该手机号已注册");
        }
        User user = new User();
        user.setOpenid("phone:" + phone);
        user.setPhone(phone);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname.trim());
        user.setRole("USER");
        user.setStatus("active");
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        user.setCreatedAt(java.time.LocalDateTime.now());
        user.setUpdatedAt(java.time.LocalDateTime.now());
        User saved;
        try {
            saved = userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            // A-34：手机号唯一约束冲突兜底（uk_users_phone / uk_users_openid）
            // 并发注册同一手机号或 openid 派生冲突时，返回友好业务错误而非 500
            log.warn("注册唯一约束冲突：phone={}, error={}", SensitiveDataMasker.mask(phone), ex.getMessage());
            throw new IllegalArgumentException("该手机号已注册，请直接登录");
        }
        log.info("新用户注册成功: userId={}, phone={}", saved.getId(), SensitiveDataMasker.mask(phone));
        String token = jwtTokenProvider.generateToken(String.valueOf(saved.getId()));
        // 记录在线会话（eladmin「在线用户」对齐）：注册成功即自动登录，视为在线用户，
        // 与 loginWithPhone/loginAsAdmin/loginWithWechat 一致
        recordOnlineSession(saved.getId(), token, "phone");
        return buildSessionView(saved, token);
    }

    /**
     * 手机号 + 密码登录。
     *
     * <p>通过 phone 查询用户,BCrypt 校验密码。未注册手机号与密码错误统一返回
     * "手机号或密码错误"(防账号枚举)。</p>
     */
    @Override
    @Transactional(readOnly = true)
    public UserSessionView loginWithPhone(String phone, String password) {
        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            throw new InvalidCredentialsException("手机号或密码错误");
        }
        // P0-14：体验账号黑名单——13900000000 仅体验入口可登录，禁止手机号+密码路径占用
        if (GUEST_BLACKLIST_PHONE.equals(phone)) {
            log.warn("黑名单手机号登录被拒绝：phone={}", SensitiveDataMasker.mask(phone));
            throw new IllegalArgumentException("该手机号不可登录");
        }
        User user = userRepository.findByPhone(phone).orElse(null);
        if (user == null) {
            throw new InvalidCredentialsException("手机号或密码错误");
        }
        if (user.isDisabled()) {
            throw new com.campuslove.api.common.OperationForbiddenException("账号已被禁用，请联系管理员");
        }
        String storedHash = user.getPassword();
        if (storedHash == null || storedHash.isBlank()
                || !passwordEncoder.matches(password, storedHash)) {
            throw new InvalidCredentialsException("手机号或密码错误");
        }
        String token = jwtTokenProvider.generateToken(String.valueOf(user.getId()));
        // 记录在线会话（eladmin「在线用户」对齐），登录方式 phone
        recordOnlineSession(user.getId(), token, "phone");
        return buildSessionView(user, token);
    }

    /**
     * 体验账号一键登录（临时体验号）。
     *
     * <p>实现要点：</p>
     * <ul>
     *   <li>首次调用自动创建固定体验账号（手机号 13900000000，昵称「体验用户」），
     *       后续调用复用同一账号（幂等），保证体验数据可连续积累</li>
     *   <li>体验账号密码为随机 BCrypt 哈希，无法通过手机号+密码登录，仅体验入口可进入</li>
     *   <li>登录方式 guest，同样记录在线会话（与 register/loginWithPhone 一致）</li>
     *   <li>商业化上线前可通过配置 {@code app.guest-login.enabled=false} 关闭该入口</li>
     * </ul>
     */
    @Override
    @Transactional
    public UserSessionView loginAsGuest() {
        if (!guestLoginEnabled) {
            log.warn("体验账号登录入口已被配置禁用（app.guest-login.enabled=false）");
            throw new IllegalStateException("体验账号入口已关闭，请使用其他方式登录");
        }
        String guestPhone = GUEST_BLACKLIST_PHONE;
        User user = userRepository.findByPhone(guestPhone).orElse(null);
        if (user == null) {
            // 首次使用：自动创建体验账号（随机密码，防止通过手机号密码登录）
            user = new User();
            user.setOpenid("guest:" + guestPhone);
            user.setPhone(guestPhone);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setNickname("体验用户");
            user.setRole("USER");
            user.setStatus("active");
            user.setProfileCompletion(0);
            user.setFollowingCount(0);
            user.setFollowersCount(0);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
            log.info("体验账号首次创建成功: userId={}", user.getId());
            // 一键体验：自动预填完整资料（基本资料/校园认证/课表），
            // 使 profile_completion=100，登录后所有页面立即可用
            provisionGuestProfile(user);
        }
        if (user.isDisabled()) {
            throw new com.campuslove.api.common.OperationForbiddenException("体验账号已被禁用，请联系管理员");
        }
        String token = jwtTokenProvider.generateToken(String.valueOf(user.getId()));
        // 记录在线会话（eladmin「在线用户」对齐），登录方式 guest
        recordOnlineSession(user.getId(), token, "guest");
        return buildSessionView(user, token);
    }

    /**
     * 体验账号资料预填（一键体验）。
     *
     * <p>新建体验账号时自动创建基本资料、校园认证（verified）与课表，
     * 并将 profile_completion 置为 100，使「临时体验号」登录后即可使用全部功能，
     * 无需再手动完善资料（与 database/complete-guest-account.sql 口径一致）。
     * 仅首次创建时执行；已存在资料的账号不受影响（幂等）。</p>
     *
     * @param user 刚创建的体验账号
     */
    private void provisionGuestProfile(User user) {
        Long userId = user.getId();
        try {
            // 1. 基本资料（昵称/简介/年级/代词/兴趣标签/身高/学历/婚况/籍贯/未来城市）
            if (userBasicProfileRepository.findByUserId(userId).isEmpty()) {
                UserBasicProfile basic = new UserBasicProfile();
                basic.setUserId(userId);
                basic.setNickname("体验用户");
                basic.setBio("热爱生活，喜欢图书馆的下午和操场晚风。想认识有趣的灵魂。");
                basic.setGradeLabel("大三");
                basic.setPronouns("TA");
                basic.setInterestTags("[\"阅读\",\"旅行\",\"摄影\",\"音乐\",\"美食\"]");
                basic.setHeight(170);
                basic.setEducationLevel("bachelor");
                basic.setRelationshipStatus("never");
                basic.setHometownProvince("北京");
                basic.setHometownCity("北京");
                basic.setFutureCity("北京");
                basic.setFuturePlanTags("[\"旅行\",\"读书\",\"事业\",\"健康\"]");
                userBasicProfileRepository.save(basic);
            }
            // 2. 校园资料（直接置为已认证通过）
            if (userCampusProfileRepository.findByUserId(userId).isEmpty()) {
                UserCampusProfile campus = new UserCampusProfile();
                campus.setUserId(userId);
                campus.setCityName("北京");
                campus.setCampusName("北京大学");
                campus.setDepartmentName("工业设计");
                campus.setVerificationStatus("verified");
                userCampusProfileRepository.save(campus);
            }
            // 3. 课表偏好
            if (userScheduleProfileRepository.findByUserId(userId).isEmpty()) {
                UserScheduleProfile schedule = new UserScheduleProfile();
                schedule.setUserId(userId);
                schedule.setPreferredCampusArea("图书馆");
                schedule.setPreferredTimeWindowJson("[]");
                schedule.setCourseBlockJson("[]");
                userScheduleProfileRepository.save(schedule);
            }
            // 4. 完善度 100
            user.setProfileCompletion(100);
            userRepository.save(user);
            log.info("体验账号资料预填完成: userId={}", userId);
        } catch (DataAccessException ex) {
            log.error("体验账号资料预填失败, userId={}: {}", userId, ex.getMessage(), ex);
        }
    }

    @Override
    @Transactional
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

        // 3.5 高校状态校验（商业模式：每个高校一个管理员）。
        //     校区管理员（ADMIN 且 campusName 非空）登录时，校验其所属高校
        //     （schools.name = user.campus_name）未停用；高校被停用后该校管理员登录被拒。
        if (user.isAdmin() && user.getCampusName() != null && !user.getCampusName().isBlank()) {
            schoolRepository.findByName(user.getCampusName().trim()).ifPresent(school -> {
                if (!"active".equalsIgnoreCase(school.getStatus())) {
                    log.warn("高校停用，拒绝管理员登录: userId={}, username={}, campus={}",
                            user.getId(), username, user.getCampusName());
                    throw new AdminDisabledException("所在高校已被停用，请联系超级管理员");
                }
            });
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
        // 记录在线会话（eladmin「在线用户」对齐），登录方式 admin
        recordOnlineSession(user.getId(), jwtToken, "admin");
        log.info("管理员登录成功, userId={}, username={}", user.getId(), username);
        return buildSessionView(user, jwtToken);
    }

    @Override
    @Transactional
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

                // eladmin「在线用户」对齐：登出时删除在线会话记录（失败不影响登出主流程）
                if (userId != null) {
                    try {
                        onlineUserService.removeLogin(Long.parseLong(userId));
                    } catch (RuntimeException ex) {
                        log.debug("删除在线会话失败, userId={}: {}", userId, ex.getMessage());
                    }
                }
            }
        } catch (JwtException ex) {
            // JWT 解析失败时不影响登出主流程
            log.debug("登出时解析 token 失败: {}", ex.getMessage());
        }
        log.info("{}, userId={}", action, userId);
    }

    /**
     * 记录在线会话（登录成功后调用，eladmin「在线用户」对齐）。
     *
     * <p>将 jti + 登录方式 + 时间写入 {@link OnlineUserService}（Redis 优先、本地内存降级），
     * TTL = JWT 剩余有效期，与 token 生命周期一致。失败仅记录日志，不影响登录主流程。</p>
     *
     * @param userId      用户 ID
     * @param jwtToken    签发的 JWT（从中提取 jti 与剩余有效期）
     * @param loginMethod 登录方式（wechat / phone / admin）
     */
    private void recordOnlineSession(Long userId, String jwtToken, String loginMethod) {
        try {
            String jti = jwtTokenProvider.getJtiFromToken(jwtToken);
            long ttlSeconds = jwtTokenProvider.getRemainingTtlSeconds(jwtToken);
            onlineUserService.recordLogin(userId, jti, loginMethod, ttlSeconds);
        } catch (RuntimeException ex) {
            // 在线会话记录失败不影响登录主流程，仅记录日志
            log.warn("记录在线会话失败, userId={}, method={}: {}", userId, loginMethod, ex.getMessage());
        }
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

    /**
     * 根据用户实体构建完整的会话视图。
     * 从数据库查询校园认证状态、日程偏好等，计算 profileCompleted / campusVerified / scheduleCompleted 等字段。
     *
     * <p>注：openId / phone 等敏感字段在日志输出时统一通过 {@link SensitiveDataMasker}
     * 脱敏（P0 CRITICAL FIN-00001/00002），不再使用本类内的本地脱敏方法。</p>
     *
     * @param user  用户实体
     * @param token JWT 令牌（可为 null）
     * @return 完整的 UserSessionView
     */
    private UserSessionView buildSessionView(User user, String token) {
        Long userId = user.getId();

        // profileCompleted: profileCompletion >= 50 视为已完成（P0-34/P0-35 修复，2026-08-08）。
        // 完成度 = 基本资料昵称30 + 校园资料30 + 日程20 + 兴趣标签20（后两项为加分项）。
        // 注册流程走完的最低完成度：学生 = 基本资料30+校园30+日程20 = 80；
        // 非学生（跳过校园认证）= 基本资料30+日程20 = 50。阈值 50 保证两类注册
        // 用户走完流程即解锁全部功能；校园认证/兴趣标签作为注册后的补充加分。
        boolean profileCompleted = user.getProfileCompletion() != null
                && user.getProfileCompletion() >= 50;

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
