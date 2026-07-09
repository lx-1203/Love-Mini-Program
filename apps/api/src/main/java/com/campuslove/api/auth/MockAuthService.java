package com.campuslove.api.auth;

import com.campuslove.api.runtime.MockRuntimeState;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 认证服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟会话数据。
 */
@Profile("mock")
@Service
public class MockAuthService implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(MockAuthService.class);

    private final MockRuntimeState runtimeState;

    public MockAuthService(MockRuntimeState runtimeState) {
        this.runtimeState = runtimeState;
    }

    @Override
    public UserSessionView getCurrentSession(String token) {
        // mock 模式下忽略 token，直接返回模拟会话
        return toView(runtimeState.currentSession(), null);
    }

    @Override
    public UserSessionView loginWithWechat(String code) {
        // mock 模式下忽略 code，直接模拟登录
        return toView(runtimeState.loginWithWechat(), "mock-token");
    }

    @Override
    public UserSessionView refreshToken(String oldToken) {
        // mock 模式下验证 token 有效性后返回新的模拟会话
        if (oldToken == null || oldToken.isBlank()) {
            throw new IllegalArgumentException("Token 不能为空");
        }
        // mock 模式下简单验证 token 格式，然后返回新 token
        return toView(runtimeState.currentSession(), "mock-refreshed-token-" + System.currentTimeMillis());
    }

    @Override
    public void logout(String token) {
        // mock 模式下仅日志输出，无操作
        log.info("mock 用户登出, token={}", token != null ? "****" : "null");
    }

    @Override
    public UserSessionView loginAsAdmin(String username, String password) {
        // mock 模式下忽略凭据，直接返回 mock 会话
        log.info("mock 管理员登录, username={}", username);
        return toView(runtimeState.currentSession(), "mock-admin-token-" + System.currentTimeMillis());
    }

    @Override
    public void logoutAsAdmin(String token) {
        // mock 模式下语义同 logout
        logout(token);
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
