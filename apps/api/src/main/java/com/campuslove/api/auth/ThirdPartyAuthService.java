package com.campuslove.api.auth;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.ThirdPartyAccount;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.ThirdPartyAccountRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 第三方账号服务（功能2：登录第三方账号）。
 *
 * <p>核心职责：</p>
 * <ul>
 *   <li>loginWithWechat：通过微信 openId 登录或注册新用户</li>
 *   <li>loginWithApple：通过 Apple Sub Identifier 登录或注册新用户</li>
 *   <li>bindThirdParty：为已登录用户绑定第三方账号</li>
 *   <li>unbindThirdParty：解绑已登录用户的第三方账号</li>
 *   <li>listBindings：查询已登录用户已绑定的第三方账号列表</li>
 * </ul>
 *
 * <p>安全说明：</p>
 * <ul>
 *   <li>openId 在数据库中通过 SHA-256 派生 hash 存储（与 WeChat 登录主流程保持一致），
 *       避免数据库泄露时直接暴露用户身份标识</li>
 *   <li>绑定/解绑操作要求当前用户已认证，userId 来自 SecurityUtils.getCurrentUserId()</li>
 *   <li>同一 (provider, openId) 仅允许绑定一个本系统用户（数据库唯一约束）</li>
 * </ul>
 */
/**
 * Profile 限定说明：仅在 real profile 下激活。
 * <p>原因：本服务直接注入 {@link ThirdPartyAccountRepository} 与 {@link UserRepository}
 * （Spring Data JPA），而 mock profile（{@code application-mock.yml}）排除了
 * HibernateJpaAutoConfiguration / DataSourceAutoConfiguration，JPA Repository Bean 不可用。
 * 与 {@link RealAuthService} / {@link RedisTokenBlacklistService} 等保持一致。</p>
 */
@Service
@Profile("real")
public class ThirdPartyAuthService {

    private static final Logger log = LoggerFactory.getLogger(ThirdPartyAuthService.class);

    /** 第三方平台标识：微信 */
    public static final String PROVIDER_WECHAT = "WECHAT";
    /** 第三方平台标识：Apple */
    public static final String PROVIDER_APPLE = "APPLE";

    private final ThirdPartyAccountRepository thirdPartyAccountRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final WeChatClient weChatClient;
    private final AppleIdentityTokenVerifier appleIdentityTokenVerifier;

    /**
     * 设备会话服务（3-D 设备管理）：第三方（wechat/apple）登录成功后记录设备。
     * 可选注入：单元测试（不加载 Spring）为 null 时跳过设备记录；
     * real 环境由容器注入 RealDeviceSessionService。
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private DeviceSessionService deviceSessionService;

    public ThirdPartyAuthService(
            ThirdPartyAccountRepository thirdPartyAccountRepository,
            UserRepository userRepository,
            JwtTokenProvider jwtTokenProvider,
            WeChatClient weChatClient,
            AppleIdentityTokenVerifier appleIdentityTokenVerifier
    ) {
        this.thirdPartyAccountRepository = thirdPartyAccountRepository;
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.weChatClient = weChatClient;
        this.appleIdentityTokenVerifier = appleIdentityTokenVerifier;
    }

    /**
     * 使用微信第三方账号登录。
     *
     * <p>流程（infra R2-00009 修复：不再信任客户端 openId）：</p>
     * <ol>
     *   <li>调用微信 jscode2session（code 换取 openId），服务端校验 code 有效性</li>
     *   <li>对 openId 做 SHA-256 派生 hash（与主登录流程一致），作为查询键</li>
     *   <li>按 (WECHAT, openIdHash) 查询绑定记录，命中则登录，未命中则创建用户</li>
     * </ol>
     *
     * @param code     微信 wx.login() 返回的临时 code（不可为空）
     * @param deviceId 客户端设备标识（3-D 设备管理：可空，缺失时 "unknown"）
     * @return 用户会话视图（包含 JWT 令牌）
     * @throws IllegalArgumentException code 为空或微信验签失败时抛出
     */
    @Transactional
    public UserSessionView loginWithWechat(String code, String deviceId) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.CODE_REQUIRED);
        }
        WeChatClient.WeChatSessionResponse session = weChatClient.code2Session(code);
        if (session == null || session.getOpenid() == null || session.getOpenid().isBlank()) {
            log.warn("微信第三方登录 code2session 返回空 openid");
            throw new IllegalArgumentException(ErrorMessages.WECHAT_CREDENTIAL_INVALID);
        }
        return doLogin(PROVIDER_WECHAT, session.getOpenid(), session.getUnionid(), deviceId);
    }

    /**
     * 使用 Apple 第三方账号登录。
     *
     * <p>流程（infra R2-00010 修复：不再信任客户端 appleIdentifier）：</p>
     * <ol>
     *   <li>验签 identityToken（RS256 签名 + iss/aud/exp + nonce），取出 sub</li>
     *   <li>对 sub 做 SHA-256 派生 hash 作为查询键</li>
     *   <li>按 (APPLE, subHash) 查询绑定记录，命中则登录，未命中则创建用户</li>
     * </ol>
     *
     * @param identityToken Sign in with Apple 返回的 identityToken JWT（不可为空）
     * @param deviceId      客户端设备标识（3-D 设备管理：可空，缺失时 "unknown"）
     * @return 用户会话视图（包含 JWT 令牌）
     * @throws IllegalArgumentException identityToken 为空或验签失败时抛出
     */
    @Transactional
    public UserSessionView loginWithApple(String identityToken, String deviceId) {
        String appleSub = appleIdentityTokenVerifier.verifyAndGetSubject(identityToken);
        return doLogin(PROVIDER_APPLE, appleSub, null, deviceId);
    }

    /**
     * 第三方登录内部实现：查找或创建用户，签发 JWT。
     *
     * @param provider 第三方平台标识
     * @param openId   第三方 openId（明文）
     * @param unionId  第三方 unionId（可空）
     * @param deviceId 客户端设备标识（3-D 设备管理：可空）
     * @return 用户会话视图
     */
    private UserSessionView doLogin(String provider, String openId, String unionId, String deviceId) {
        String openIdHash = hashIdentifier(openId);

        // 1. 查询绑定记录
        Optional<ThirdPartyAccount> existing = thirdPartyAccountRepository
                .findByProviderAndOpenId(provider, openIdHash);

        User user;
        if (existing.isPresent()) {
            // 已绑定：取出 userId 查询用户
            Long userId = existing.get().getUserId();
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                // 数据异常：绑定记录存在但用户不存在，删除绑定后重新创建
                log.warn("第三方账号绑定记录存在但用户不存在, provider={}, userId={}", provider, userId);
                thirdPartyAccountRepository.delete(existing.get());
                user = createNewUserAndBind(provider, openIdHash, unionId);
            } else {
                user = userOpt.get();
                log.info("第三方账号登录成功, provider={}, userId={}", provider, userId);
            }
        } else {
            // 未绑定：创建新用户并写入绑定
            user = createNewUserAndBind(provider, openIdHash, unionId);
        }

        // R4-00259：禁用用户校验——命中既有绑定记录路径此前未检查 user.isDisabled()，
        // 管理员封禁可被微信/Apple 第三方登录路径绕过签发 JWT。此处与
        // RealAuthService.loginWithPhone / loginWithWechat 的禁用拦截语义对齐。
        if (user.isDisabled()) {
            log.warn("禁用用户尝试第三方登录, provider={}, userId={}", provider, user.getId());
            throw new com.campuslove.api.common.OperationForbiddenException(ErrorMessages.ACCOUNT_DISABLED_CONTACT_ADMIN);
        }

        // 2. 签发 JWT
        String token = jwtTokenProvider.generateToken(String.valueOf(user.getId()));
        // 3. 3-D 设备管理：记录登录设备（失败不影响登录主流程）
        recordLoginDevice(user.getId(), deviceId, provider.toLowerCase(), token);
        return buildSessionView(user, token, provider.toLowerCase());
    }

    /**
     * 记录登录设备（3-D 设备管理）。
     * deviceSessionService 为 null（单元测试直接 new）时跳过；失败仅记录日志。
     */
    private void recordLoginDevice(Long userId, String deviceId, String platform, String jwtToken) {
        if (deviceSessionService == null) {
            return;
        }
        try {
            String jti = jwtTokenProvider.getJtiFromToken(jwtToken);
            deviceSessionService.recordLogin(userId, deviceId, platform, jti);
        } catch (RuntimeException ex) {
            log.warn("记录第三方登录设备失败, userId={}, platform={}: {}", userId, platform, ex.getMessage());
        }
    }

    /**
     * 创建新用户并写入第三方账号绑定记录。
     *
     * @param provider    第三方平台标识
     * @param openIdHash  openId 的 SHA-256 派生 hash（不可逆）
     * @param unionId     unionId（可空）
     * @return 新创建的用户实体
     */
    private User createNewUserAndBind(String provider, String openIdHash, String unionId) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        User user = new User();
        // 第三方登录的用户 openid 字段填入 provider:openIdHash 以避免与主微信登录冲突
        user.setOpenid(provider.toLowerCase() + ":" + openIdHash);
        user.setNickname(DisplayConstants.NEW_USER);
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user = userRepository.save(user);
        log.info("第三方账号登录创建新用户, provider={}, userId={}", provider, user.getId());

        ThirdPartyAccount account = new ThirdPartyAccount();
        account.setUserId(user.getId());
        account.setProvider(provider);
        account.setOpenId(openIdHash);
        // R4-00260：unionId 同为敏感身份标识，与 openId 一致经 SHA-256 派生 hash 后落库，
        // 避免数据库泄露直接暴露第三方平台关联标识。
        account.setUnionId(hashIdentifier(unionId));
        account.setCreatedAt(now);
        thirdPartyAccountRepository.save(account);
        return user;
    }

    /**
     * 为已登录用户绑定第三方账号。
     *
     * <p>约束：</p>
     * <ul>
     *   <li>同一 (provider, openId) 仅允许绑定一个本系统用户（数据库唯一约束）</li>
     *   <li>同一用户同一 provider 仅允许绑定一个 openId（业务约束）</li>
     * </ul>
     *
     * @param userId   当前用户 ID（来自 SecurityUtils.getCurrentUserId()）
     * @param provider 第三方平台标识
     * @param openId   第三方 openId（明文）
     * @param unionId  第三方 unionId（可空）
     * @return 绑定成功返回 true；用户已绑定该平台或 openId 已被其他用户绑定时返回 false
     * @throws IllegalArgumentException userId / provider / openId 为空时抛出
     */
    @Transactional
    public boolean bindThirdParty(Long userId, String provider, String openId, String unionId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        if (provider == null || provider.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PROVIDER_REQUIRED);
        }
        if (openId == null || openId.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.OPEN_ID_REQUIRED);
        }

        String openIdHash = hashIdentifier(openId);

        // 1. 检查 (provider, openId) 是否已被其他用户绑定
        Optional<ThirdPartyAccount> existing = thirdPartyAccountRepository
                .findByProviderAndOpenId(provider, openIdHash);
        if (existing.isPresent() && !existing.get().getUserId().equals(userId)) {
            log.warn("第三方账号已被其他用户绑定, provider={}, openIdHash={}, ownerId={}",
                    provider, openIdHash, existing.get().getUserId());
            // R4-00262：区分业务错误码，客户端可明确提示"该账号已被其他用户绑定"
            throw new ThirdPartyBindConflictException(
                    ThirdPartyBindConflictException.CODE_OPENID_TAKEN,
                    "该第三方账号已被其他用户绑定，请更换账号或联系客服");
        }

        // 2. 检查当前用户是否已绑定该平台
        Optional<ThirdPartyAccount> userBinding = thirdPartyAccountRepository
                .findByUserIdAndProvider(userId, provider);
        if (userBinding.isPresent()) {
            log.warn("用户已绑定该平台, userId={}, provider={}", userId, provider);
            // R4-00262：区分业务错误码，客户端可明确提示"已绑定该平台"
            throw new ThirdPartyBindConflictException(
                    ThirdPartyBindConflictException.CODE_ALREADY_BOUND,
                    "当前账号已绑定该平台，请先解绑后再操作");
        }

        // 3. 写入绑定记录
        ThirdPartyAccount account = new ThirdPartyAccount();
        account.setUserId(userId);
        account.setProvider(provider);
        account.setOpenId(openIdHash);
        // R4-00260：unionId 同为敏感身份标识，与 openId 一致经 SHA-256 派生 hash 后落库
        account.setUnionId(hashIdentifier(unionId));
        account.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        thirdPartyAccountRepository.save(account);
        log.info("第三方账号绑定成功, userId={}, provider={}", userId, provider);
        return true;
    }

    /**
     * 解绑当前用户的第三方账号。
     *
     * @param userId   当前用户 ID
     * @param provider 第三方平台标识
     * @return 解绑成功返回 true；未绑定该平台时返回 false
     * @throws IllegalArgumentException userId / provider 为空时抛出
     */
    @Transactional
    public boolean unbindThirdParty(Long userId, String provider) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        if (provider == null || provider.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PROVIDER_REQUIRED);
        }

        long deleted = thirdPartyAccountRepository.deleteByUserIdAndProvider(userId, provider);
        if (deleted > 0) {
            log.info("第三方账号解绑成功, userId={}, provider={}", userId, provider);
            return true;
        }
        log.warn("用户未绑定该平台, userId={}, provider={}", userId, provider);
        return false;
    }

    /**
     * 查询当前用户已绑定的第三方账号列表。
     *
     * @param userId 当前用户 ID
     * @return 绑定记录列表（按绑定时间倒序）
     * @throws IllegalArgumentException userId 为空时抛出
     */
    public List<ThirdPartyAccount> listBindings(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        return thirdPartyAccountRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * 对第三方标识（openId / Apple Identifier）做 SHA-256 派生 hash。
     *
     * <p>用途：作为数据库查询键，避免明文存储第三方身份标识，
     * 与主微信登录流程（RealAuthService#hashOpenid）保持一致的安全策略。</p>
     *
     * @param identifier 原始第三方标识
     * @return SHA-256 hex 字符串（小写），长度 64
     */
    private String hashIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return identifier;
        }
        try {
            java.security.MessageDigest sha256 = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = sha256.digest(identifier.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ErrorMessages.SHA256_UNAVAILABLE, ex);
        }
    }

    /**
     * 根据用户实体构建第三方登录会话视图。
     * 简化版会话视图，未携带校园/课表等扩展状态（第三方登录后引导走完整引导流程）。
     *
     * @param user     用户实体
     * @param token    JWT 令牌
     * @param loginMethod 登录方式（wechat / apple）
     * @return 用户会话视图
     */
    private UserSessionView buildSessionView(User user, String token, String loginMethod) {
        Long userId = user.getId();
        boolean profileCompleted = user.getProfileCompletion() != null
                && user.getProfileCompletion() >= 100;
        boolean phoneBound = user.getPhone() != null && !user.getPhone().isBlank();
        String displayName = user.getNickname() != null ? user.getNickname() : DisplayConstants.NEW_USER;

        return new UserSessionView(
                String.valueOf(userId),
                true,
                loginMethod,
                displayName,
                phoneBound,
                profileCompleted,
                false,
                false,
                null,
                java.util.Map.of("chat_ai_enabled", false),
                token
        );
    }
}
