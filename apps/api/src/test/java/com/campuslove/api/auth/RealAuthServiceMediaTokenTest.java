package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtConfig;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * P0-2 媒体令牌降权：{@link RealAuthService} 两处「自己解析令牌」的入口。
 *
 * <p>这两处都不走 SecurityContext，直接拿裸令牌换会话，所以过滤器的降权管不到它们，
 * 必须在服务层各自设闸：</p>
 * <ol>
 *   <li>{@code POST /api/v1/auth/refresh}：媒体令牌（{@code scope=media}，TTL 5 分钟）
 *       原本只验签名/黑名单/用户状态、不看 scope，于是泄露在访问日志/浏览器历史里的
 *       媒体令牌可以直接换到一份新的 2 小时完整会话——降权形同虚设。
 *       收敛后拒绝换发（401 认证失败约定），且<b>不</b>签发新令牌、<b>不</b>撤销原 jti
 *       （撤销只会让正在加载的图片 404，对已泄露令牌也无额外收益）。</li>
 *   <li>{@code GET /api/v1/auth/me}：{@code /api/v1/auth/**} 属 permitAll，
 *       过滤器不参与，本方法自己解析令牌并返回会话视图。媒体令牌若被放行，
 *       就能源源不断读到属主的昵称/校园/手机号绑定状态/功能开关等账号信息。
 *       收敛后按「未登录」返回（与禁用用户同一口径，不破坏前端会话状态机）。</li>
 * </ol>
 *
 * <p>测试策略：{@link JwtTokenProvider} 用真实实现（spy），签的是真 JWT，
 * 断言的是「真媒体令牌被拒且没有换发出任何新令牌」，而不是某个 scope 桩方法的返回值；
 * 每条拒绝断言都配一条完整会话正控。</p>
 */
class RealAuthServiceMediaTokenTest {

    private static final String SECRET = "test-jwt-secret-for-media-token-auth-service-32-chars-min";
    private static final Long USER_ID = 100L;

    @Mock private WeChatClient weChatClient;
    @Mock private UserRepository userRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private SchoolRepository schoolRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private AesEncryptor aesEncryptor;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private OnlineUserService onlineUserService;
    @Mock private SmsCodeService smsCodeService;

    private JwtTokenProvider jwtTokenProvider;
    private RealAuthService authService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        // spy 真实 provider：既能签真 JWT，又能 verify「未换发新令牌」
        JwtConfig config = new JwtConfig();
        config.setSecret(SECRET);
        config.setExpirationMs(7_200_000L);
        config.setKeyVersion(1);
        jwtTokenProvider = spy(new JwtTokenProvider(config));

        PasswordEncoder passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        authService = new RealAuthService(
                weChatClient,
                jwtTokenProvider,
                userRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                passwordEncoder,
                aesEncryptor,
                tokenBlacklistService,
                onlineUserService,
                schoolRepository,
                false,
                "13900000000",
                smsCodeService
        );

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(activeUser()));
        when(userCampusProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
        when(userScheduleProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
    }

    private User activeUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setNickname("测试用户");
        user.setRole("USER");
        user.setStatus("active");
        return user;
    }

    // ========================================================================
    // 一、refresh：媒体令牌不得换发完整会话
    // ========================================================================

    @Test
    @DisplayName("媒体令牌刷新：拒绝换发完整会话，且不签发任何新令牌")
    void refreshToken_withMediaScopedToken_isRejectedAndIssuesNoToken() {
        String mediaToken = jwtTokenProvider.generateMediaToken(String.valueOf(USER_ID));
        assertTrue(jwtTokenProvider.isMediaToken(mediaToken), "前置：构造的确实是 scope=media 令牌");

        InvalidTokenException ex = assertThrows(InvalidTokenException.class,
                () -> authService.refreshToken(mediaToken));

        assertNotNull(ex.getMessage(), "拒绝原因应有说明（响应体由全局处理器脱敏包装）");
        // 关键断言：没有换发新令牌（降权凭据不能升级成会话）
        verify(jwtTokenProvider, never()).generateToken(anyString());
        // 且不去动黑名单：原媒体令牌无需被撤销（任务要求「不撤销原 jti」）
        verify(tokenBlacklistService, never()).revoke(anyString(), anyLong());
    }

    @Test
    @DisplayName("正控：完整用户会话刷新仍正常换发新令牌")
    void refreshToken_withFullSessionToken_stillIssuesNewToken() {
        String fullToken = jwtTokenProvider.generateToken(String.valueOf(USER_ID));
        assertTrue(!jwtTokenProvider.isMediaToken(fullToken), "前置：完整令牌无 media scope");

        UserSessionView session = authService.refreshToken(fullToken);

        assertNotNull(session, "完整会话刷新应返回新会话");
        assertNotNull(session.token(), "应换发出新令牌");
        assertNotEquals(fullToken, session.token(), "新令牌应与旧令牌不同");
        assertTrue(!jwtTokenProvider.isMediaToken(session.token()),
                "换发出来的必须是完整会话令牌（无 media scope）");
    }

    // ========================================================================
    // 二、/auth/me：媒体令牌不得读出账号会话信息
    // ========================================================================

    @Test
    @DisplayName("媒体令牌查询 /auth/me：按未登录返回，不泄露账号状态")
    void getCurrentSession_withMediaScopedToken_returnsLoggedOutView() {
        String mediaToken = jwtTokenProvider.generateMediaToken(String.valueOf(USER_ID));

        UserSessionView view = authService.getCurrentSession(mediaToken);

        assertNotNull(view);
        assertTrue(!view.loggedIn(), "媒体令牌不得被当作登录会话（loggedIn=" + view.loggedIn() + "）");
        assertNotEquals("测试用户", view.displayName(), "不得返回属主昵称等账号信息");
    }

    @Test
    @DisplayName("正控：完整会话令牌查询 /auth/me 仍返回 loggedIn=true")
    void getCurrentSession_withFullSessionToken_returnsLoggedInView() {
        String fullToken = jwtTokenProvider.generateToken(String.valueOf(USER_ID));

        UserSessionView view = authService.getCurrentSession(fullToken);

        assertNotNull(view);
        assertTrue(view.loggedIn(), "完整会话的 /auth/me 行为不应被本次改动破坏");
    }
}
