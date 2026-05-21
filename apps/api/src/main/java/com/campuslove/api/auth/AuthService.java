package com.campuslove.api.auth;

import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.runtime.MockRuntimeState;
import com.campuslove.api.service.WechatService;
import com.campuslove.api.service.WechatService.WechatApiException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 认证服务，支持 mock 和 db 两种模式：
 * - mock 模式（默认）：委托给 MockRuntimeState，不使用数据库
 * - db 模式：使用微信 code2Session + 数据库用户表
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** 简单的内存 token 存储：token -> userId */
    static final ConcurrentHashMap<String, Long> TOKEN_STORE = new ConcurrentHashMap<>();

    private final MockRuntimeState runtimeState;
    private final WechatService wechatService;

    /** UserRepository 仅在 db 模式下可用，mock 模式下为 null */
    @Autowired(required = false)
    private UserRepository userRepository;

    public AuthService(MockRuntimeState runtimeState, WechatService wechatService) {
        this.runtimeState = runtimeState;
        this.wechatService = wechatService;
    }

    public UserSessionView getCurrentSession() {
        return toView(runtimeState.currentSession(), null);
    }

    /**
     * 微信登录：优先使用真实微信 code2Session + 数据库；
     * 如果 UserRepository 不可用（mock 模式），回退到 MockRuntimeState。
     */
    public UserSessionView loginWithWechat(String code) {
        // db 模式：真实微信登录
        if (userRepository != null) {
            return realWechatLogin(code);
        }
        // mock 模式：回退到 MockRuntimeState
        return toView(runtimeState.loginWithWechat(), null);
    }

    /**
     * 真实微信登录流程。
     */
    private UserSessionView realWechatLogin(String code) {
        try {
            // 1. 调用微信 code2Session 获取 openid
            var session = wechatService.code2Session(code);

            // 2. 查找或创建用户
            var user = userRepository.findOrCreateByOpenid(
                    session.openid(), session.unionid(), session.sessionKey());

            // 3. 生成 token 并存储
            String token = UUID.randomUUID().toString().replace("-", "");
            TOKEN_STORE.put(token, user.getId());

            log.info("User login success: userId={}, openid={}", user.getId(), session.openid());

            // 4. 返回会话视图
            return toView(buildSessionSnapshot(user), token);

        } catch (WechatApiException e) {
            log.error("WeChat login failed: errcode={}, message={}", e.getErrcode(), e.getMessage());
            // 返回未登录状态
            return new UserSessionView(
                    null, false, "wechat", null, false, false,
                    false, false, null, Map.of("chat_ai_enabled", false), null);
        }
    }

    /**
     * 根据 token 查找 userId。
     * @return userId，如果 token 无效则返回 null
     */
    public Long resolveToken(String token) {
        return token != null ? TOKEN_STORE.get(token) : null;
    }

    private MockRuntimeState.SessionSnapshot buildSessionSnapshot(com.campuslove.api.model.User user) {
        return new MockRuntimeState.SessionSnapshot(
                String.valueOf(user.getId()),
                true,
                "wechat",
                null,       // displayName 尚未设置
                false,      // phoneBound
                false,      // profileCompleted
                false,      // campusVerified
                false,      // scheduleCompleted
                null        // campusName
        );
    }

    private UserSessionView toView(MockRuntimeState.SessionSnapshot snapshot, String token) {
        return new UserSessionView(
                snapshot.userId(),
                snapshot.loggedIn(),
                snapshot.loginMethod(),
                snapshot.displayName(),
                snapshot.phoneBound(),
                snapshot.profileCompleted(),
                snapshot.campusVerified(),
                snapshot.scheduleCompleted(),
                snapshot.campusName(),
                Map.of("chat_ai_enabled", false),
                token
        );
    }
}