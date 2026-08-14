package com.campuslove.api.auth;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.mock.MockRuntimeState;
import com.campuslove.api.utils.SensitiveDataMasker;
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

    /**
     * 设备会话服务（3-D 设备管理，mock 实现为内存存储）。
     * 可选注入：单元测试直接 new 时可能为 null（跳过设备记录）。
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private DeviceSessionService deviceSessionService;

    public MockAuthService(MockRuntimeState runtimeState) {
        this.runtimeState = runtimeState;
    }

    @Override
    public UserSessionView getCurrentSession(String token) {
        // mock 模式下忽略 token，直接返回模拟会话
        return toView(runtimeState.currentSession(), null);
    }

    @Override
    public UserSessionView loginWithWechat(String code, String deviceId) {
        // mock 模式下忽略 code，直接模拟登录
        UserSessionView view = toView(runtimeState.loginWithWechat(), "mock-token");
        recordLoginDevice(parseUserId(view.userId()), deviceId, "wechat");
        return view;
    }

    @Override
    public UserSessionView refreshToken(String oldToken) {
        // mock 模式下验证 token 有效性后返回新的模拟会话
        if (oldToken == null || oldToken.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.TOKEN_REQUIRED);
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
    public UserSessionView registerUser(String phone, String password, String nickname, java.time.LocalDate birthDate, String deviceId) {
        // mock 模式下直接返回 mock 会话(忽略注册参数)
        log.info("mock 注册用户, phone={}", SensitiveDataMasker.mask(phone));
        UserSessionView view = toView(runtimeState.loginWithWechat(), "mock-token-" + System.currentTimeMillis());
        recordLoginDevice(parseUserId(view.userId()), deviceId, "phone");
        return view;
    }

    @Override
    public UserSessionView loginWithPhone(String phone, String password, String deviceId) {
        // mock 模式下忽略凭据,直接返回 mock 会话
        log.info("mock 手机号登录, phone={}", SensitiveDataMasker.mask(phone));
        UserSessionView view = toView(runtimeState.currentSession(), "mock-token-" + System.currentTimeMillis());
        recordLoginDevice(parseUserId(view.userId()), deviceId, "phone");
        return view;
    }

    @Override
    public UserSessionView loginAsGuest(String deviceId) {
        // mock 模式下直接返回 mock 会话(忽略体验账号逻辑)
        log.info("mock 体验账号一键登录");
        UserSessionView view = toView(runtimeState.loginWithWechat(), "mock-guest-token-" + System.currentTimeMillis());
        recordLoginDevice(parseUserId(view.userId()), deviceId, "guest");
        return view;
    }


    public UserSessionView loginAsAdmin(String username, String password) {
        // mock 模式下忽略凭据，直接返回 mock 会话
        // R4-00269：username（管理员 openid）脱敏后输出日志
        log.info("mock 管理员登录, username={}", SensitiveDataMasker.mask(username));
        return toView(runtimeState.currentSession(), "mock-admin-token-" + System.currentTimeMillis());
    }

    @Override
    public void logoutAsAdmin(String token) {
        // mock 模式下语义同 logout
        logout(token);
    }

    /**
     * 记录 mock 登录设备（3-D 设备管理）。
     * deviceSessionService 为 null（单测直接 new）时跳过；失败不影响登录主流程。
     */
    private void recordLoginDevice(Long userId, String deviceId, String platform) {
        if (deviceSessionService == null || userId == null) {
            return;
        }
        try {
            deviceSessionService.recordLogin(userId, deviceId, platform, "mock-jti-" + System.currentTimeMillis());
        } catch (RuntimeException ex) {
            log.warn("mock 记录登录设备失败, userId={}: {}", userId, ex.getMessage());
        }
    }

    /**
     * 将视图中的 userId 字符串安全转换为 Long（解析失败返回 null）。
     */
    private Long parseUserId(String userIdStr) {
        if (userIdStr == null || userIdStr.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            return null;
        }
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
