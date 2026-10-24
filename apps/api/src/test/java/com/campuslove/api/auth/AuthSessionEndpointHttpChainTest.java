package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.testdata.MockAllRepositoriesConfig;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

/**
 * P0-2 媒体令牌降权：{@code GET /api/v1/auth/me} 与 {@code POST /api/v1/auth/refresh} 两条
 * <b>HTTP 链</b>上的会话契约。
 *
 * <p>为什么要有这个类：{@code /api/v1/auth/**} 在安全链里是 permitAll（登录入口必须匿名可达），
 * 所以媒体令牌走到这两条路由时<b>安全链不会拦它</b>，唯一的闸门是
 * {@link RealAuthService} 自己解析令牌的那两处（{@code getCurrentSession} 的媒体分支
 * 与 {@code refreshToken} 的媒体分支）。此前只有「直接调服务/直接调控制器」的用例覆盖它们，
 * HTTP 层（Bearer 头绑定 → MVC 派发 → {@code GlobalExceptionHandler} 状态码映射 →
 * JSON 序列化）一直是空白：只要有人把控制器的取令牌入口改成从 SecurityContext 取、
 * 或把异常口径改掉，服务层用例照旧绿。本类补的就是这一段。</p>
 *
 * <p><b>契约取自现有实现，不新造状态码</b>（见 {@link RealAuthService#getCurrentSession} 与
 * {@link com.campuslove.api.config.GlobalExceptionHandler#handleInvalidToken}）：</p>
 * <ul>
 *   <li>{@code /auth/me}：媒体令牌 → HTTP 200 + {@code loggedIn=false} 的未登录视图
 *       （与「禁用用户」「登出后的令牌」同一口径，不抛 401，前端据此跳登录页），
 *       不回显 userId / displayName / token；</li>
 *   <li>{@code /auth/refresh}：媒体令牌 → HTTP 401 + {@code code=UNAUTHORIZED}，
 *       响应体不含任何 JWT。</li>
 * </ul>
 *
 * <p><b>profile 说明</b>：默认 mock 档的 {@code AuthService} 是
 * {@link MockAuthService}（demo 语义：无视令牌、直接返演示会话），用它测不出生产闸门，
 * 故本类用嵌套 {@link TestConfiguration} 以 {@link RealAuthService}（真实令牌解析 +
 * P0-2 媒体分支）顶上 {@code @Primary AuthService}，其余协作者按最小依赖给 mock；
 * 安全链、MVC 绑定、异常处理与 JSON 序列化全部走容器里那份真实装配。</p>
 */
@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-auth-session-http-chain-32-chars-min")
@AutoConfigureMockMvc
@Import(MockAllRepositoriesConfig.class)
@DisplayName("P0-2: /auth/me 与 /auth/refresh 的 HTTP 链上媒体令牌不得换会话")
class AuthSessionEndpointHttpChainTest {

    // MockAllRepositoriesConfig 未覆盖的三个仓库（与 MediaTokenAuthorizationRulesTest 同一处理）：
    // 缺一个就会在 ApplicationContext 加载期报 NoSuchBeanDefinitionException
    @MockBean private com.campuslove.api.repository.OfficialChatMessageRepository officialChatMessageRepository;
    @MockBean private com.campuslove.api.repository.OfficialAccountRepository officialAccountRepository;
    @MockBean private com.campuslove.api.repository.WhisperMessageRepository whisperMessageRepository;

    /** 令牌属主（也是 mock 数据库里唯一存在的有效用户） */
    private static final Long USER_ID = 100L;
    /** 属主昵称：出现在响应体即等于账号信息泄露 */
    private static final String OWNER_NICKNAME = "会话泄露探针用户";
    /** JWT 的 Base64Url 头部前缀：响应体里出现即等于回显了令牌 */
    private static final String JWT_ECHO_MARKER = "eyJ";

    @Autowired private MockMvc mockMvc;
    /** 真源令牌签发器：签真 JWT，不用伪造角色 */
    @Autowired private JwtTokenProvider jwtTokenProvider;
    /** MockAllRepositoriesConfig 提供的 @MockBean：本类只用来播种属主账号 */
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void seedOwner() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(activeUser()));
    }

    private User activeUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setNickname(OWNER_NICKNAME);
        user.setRole("USER");
        user.setStatus("active");
        return user;
    }

    /** 真实签发的媒体访问令牌（scope=media，5 分钟、只读媒体） */
    private String mediaJwt() {
        return jwtTokenProvider.generateMediaToken(String.valueOf(USER_ID));
    }

    /** 真实签发的完整用户会话令牌（无 scope） */
    private String fullJwt() {
        return jwtTokenProvider.generateToken(String.valueOf(USER_ID));
    }

    // ========================================================================
    // 一、GET /api/v1/auth/me
    // ========================================================================

    @Test
    @DisplayName("GET /auth/me + 真媒体 JWT → 200 未登录视图，不回显 userId/昵称/令牌")
    void me_withRealMediaJwt_returnsLoggedOutViewWithoutSessionFields() throws Exception {
        String mediaJwt = mediaJwt();
        assertTrue(jwtTokenProvider.isMediaToken(mediaJwt), "前置：构造的确实是 scope=media 令牌");

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loggedIn").value(false))
                .andExpect(jsonPath("$.userId").doesNotExist())
                .andExpect(jsonPath("$.displayName").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(Matchers.not(Matchers.containsString(OWNER_NICKNAME))))
                .andExpect(content().string(Matchers.not(Matchers.containsString(JWT_ECHO_MARKER))));
    }

    @Test
    @DisplayName("GET /auth/me + 真媒体 JWT 的响应与匿名请求同形（降权凭据不配拥有任何会话面）")
    void me_withRealMediaJwt_matchesAnonymousContract() throws Exception {
        String withMediaToken = mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String anonymous = mockMvc.perform(get("/api/v1/auth/me"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertTrue(withMediaToken.contains("\"loggedIn\":false"),
                "媒体令牌应按未登录返回，实际: " + withMediaToken);
        assertTrue(anonymous.contains("\"loggedIn\":false"),
                "前置：匿名请求同样是未登录视图，实际: " + anonymous);
        // 字段集合一致：媒体令牌不得比匿名多出任何账号字段
        assertTrue(withMediaToken.replace(" ", "").equals(anonymous.replace(" ", "")),
                "媒体令牌的 /auth/me 响应应与匿名一致（多出来的字段就是泄露面）：媒体="
                        + withMediaToken + " / 匿名=" + anonymous);
    }

    @Test
    @DisplayName("正控：GET /auth/me + 完整会话 JWT → 200 loggedIn=true 且回显本人会话")
    void me_withRealFullJwt_returnsOwnSession() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + fullJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loggedIn").value(true))
                .andExpect(jsonPath("$.userId").value(String.valueOf(USER_ID)))
                .andExpect(jsonPath("$.displayName").value(OWNER_NICKNAME));
    }

    // ========================================================================
    // 二、POST /api/v1/auth/refresh
    // ========================================================================

    @Test
    @DisplayName("POST /auth/refresh + 真媒体 JWT → 401 + code=UNAUTHORIZED，响应体不含令牌")
    void refresh_withRealMediaJwt_returns401WithoutAnyToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(Matchers.not(Matchers.containsString(JWT_ECHO_MARKER))));
    }

    @Test
    @DisplayName("正控：POST /auth/refresh + 完整会话 JWT → 200 且换发出非媒体的完整会话令牌")
    void refresh_withRealFullJwt_issuesNonMediaSessionToken() throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + fullJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loggedIn").value(true))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        String newToken = com.jayway.jsonpath.JsonPath.parse(body).read("$.token", String.class);
        assertNotNull(newToken, "完整会话刷新应换发新令牌，响应体: " + body);
        assertFalse(jwtTokenProvider.isMediaToken(newToken),
                "换发出来的令牌必须是完整会话令牌，不得带 media scope");
    }

    // ========================================================================
    // 三、把生产实现顶进 HTTP 链
    // ========================================================================

    /**
     * 用真实 {@link RealAuthService} 顶掉 mock 档的 {@link MockAuthService}。
     *
     * <p>mock 档默认实现是「忽略令牌、直接返回演示会话」，用它测不出 P0-2 的两道生产闸门；
     * 本配置只替换 {@code AuthService} 这一个 bean，安全链（{@code MockSecurityConfig} 的
     * permitAll/authenticated 规则与 {@code ?token=} 凭据识别）、MVC 绑定与
     * {@code GlobalExceptionHandler} 都是容器里那份真实装配。</p>
     *
     * <p>依赖取最小集：仓库用容器里的 {@code @MockBean}（属主账号由用例播种），
     * real 档专属、且与本用例无关的协作者（微信客户端 / 黑名单 / 在线用户 / AES / 短信）
     * 用 Mockito 桩顶上——桩全部走默认返回值（不撤销、不在线），不影响断言。</p>
     */
    @TestConfiguration
    static class RealAuthServiceWiring {

        @Bean
        @Primary
        AuthService realAuthServiceForHttpChain(JwtTokenProvider jwtTokenProvider,
                                                UserRepository userRepository,
                                                UserBasicProfileRepository userBasicProfileRepository,
                                                UserCampusProfileRepository userCampusProfileRepository,
                                                UserScheduleProfileRepository userScheduleProfileRepository,
                                                PasswordEncoder passwordEncoder) {
            return new RealAuthService(
                    mock(WeChatClient.class),
                    jwtTokenProvider,
                    userRepository,
                    userBasicProfileRepository,
                    userCampusProfileRepository,
                    userScheduleProfileRepository,
                    passwordEncoder,
                    mock(AesEncryptor.class),
                    mock(TokenBlacklistService.class),
                    mock(OnlineUserService.class),
                    mock(SchoolRepository.class),
                    false,
                    "13900000000",
                    mock(SmsCodeService.class));
        }
    }
}
