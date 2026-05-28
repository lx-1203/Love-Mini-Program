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
import org.springframework.context.annotation.Profile;
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

    public RealAuthService(
            WeChatClient weChatClient,
            JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository
    ) {
        this.weChatClient = weChatClient;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
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
