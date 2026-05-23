package com.campuslove.api.auth;

import com.campuslove.api.runtime.MockRuntimeState;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 认证服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟会话数据。
 */
@Profile("mock")
@Service
public class MockAuthService implements AuthService {

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
