package com.campuslove.api.auth;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 第三方账号认证控制器（功能2：登录第三方账号）。
 *
 * <p>提供以下端点：</p>
 * <ul>
 *   <li>POST /api/auth/third-party/wechat —— 微信第三方账号登录</li>
 *   <li>POST /api/auth/third-party/apple  —— Apple 第三方账号登录</li>
 *   <li>GET  /api/auth/third-party/bindings —— 查询当前用户已绑定的第三方账号</li>
 *   <li>POST /api/auth/third-party/bind —— 为当前用户绑定第三方账号</li>
 *   <li>DELETE /api/auth/third-party/unbind —— 解绑当前用户的第三方账号</li>
 * </ul>
 *
 * <p>安全说明：</p>
 * <ul>
 *   <li>登录端点（wechat / apple）为公开端点，由 SecurityConfig 中 {@code /api/auth/**} 放行</li>
 *   <li>绑定 / 解绑 / 查询绑定列表端点需要登录认证，userId 通过 {@link SecurityUtils#getCurrentUserId()} 获取</li>
 *   <li>所有写操作请求体均通过 {@link Valid} 触发 Bean Validation 校验</li>
 * </ul>
 */
/**
 * Profile 限定说明：
 * <p>仅在 real profile 下激活。原因：本控制器依赖 {@link ThirdPartyAuthService}，
 * 后者通过 {@link com.campuslove.api.repository.ThirdPartyAccountRepository}
 * （Spring Data JPA）访问数据库，而 mock profile（{@code application-mock.yml}）
 * 排除了 HibernateJpaAutoConfiguration / DataSourceAutoConfiguration，
 * 故 JPA Repository Bean 在 mock profile 下不可用。
 * 与 {@link RealAuthService} / {@link com.campuslove.api.auth.WeChatClient}
 * 等其他依赖 JPA / 外部 API 的组件保持一致的 Profile 隔离策略。</p>
 */
@RestController
@RequestMapping("/api/v1/auth/third-party")
@Profile("real")
public class ThirdPartyAuthController {

    private final ThirdPartyAuthService thirdPartyAuthService;

    public ThirdPartyAuthController(ThirdPartyAuthService thirdPartyAuthService) {
        this.thirdPartyAuthService = thirdPartyAuthService;
    }

    /**
     * 微信第三方账号登录。
     *
     * <p>流程（infra R2-00009 修复：不再信任客户端 openId）：前端通过 wx.login 获取 code，
     * 后端调用微信 jscode2session 换取 openId/unionId，服务端校验 code 有效后才登录，
     * 防止任意用户伪造 openId 接管他人账号。</p>
     *
     * @param request 包含微信 code 的请求体
     * @return 用户会话视图（包含 JWT 令牌）
     */
    @PostMapping("/wechat")
    public UserSessionView loginWithWechat(@Valid @RequestBody WechatThirdPartyLoginRequest request) {
        return thirdPartyAuthService.loginWithWechat(request.code());
    }

    /**
     * Apple 第三方账号登录。
     *
     * <p>流程（infra R2-00010 修复：不再信任客户端 appleIdentifier）：前端通过 Sign in with
     * Apple 获取 identityToken，后端验签（RS256 + aud/iss/exp）后取 sub 作为账号标识，
     * 防止攻击者传任意 identifier 伪造登录。</p>
     *
     * @param request 包含 identityToken 的请求体
     * @return 用户会话视图（包含 JWT 令牌）
     */
    @PostMapping("/apple")
    public UserSessionView loginWithApple(@Valid @RequestBody AppleLoginRequest request) {
        return thirdPartyAuthService.loginWithApple(request.identityToken());
    }

    /**
     * 查询当前用户已绑定的第三方账号列表。
     *
     * @return 绑定记录列表（按绑定时间倒序）
     * @throws HttpClientErrorException.Unauthorized 未登录时抛出 401
     */
    @GetMapping("/bindings")
    public List<ThirdPartyBindingView> listBindings() {
        Long userId = SecurityUtils.getCurrentUserId();
        return thirdPartyAuthService.listBindings(userId).stream()
                .map(ThirdPartyBindingView::from)
                .toList();
    }

    /**
     * 为当前用户绑定第三方账号。
     *
     * @param request 包含 provider / openId / unionId 的请求体
     * @return 包含 success 标志的响应体
     * @throws HttpClientErrorException.Unauthorized 未登录时抛出 401
     * @throws HttpClientErrorException.BadRequest provider 取值非法或参数缺失时抛出 400
     */
    @PostMapping("/bind")
    @PreAuthorize("hasRole('USER')")
    public Map<String, Boolean> bindThirdParty(@Valid @RequestBody BindThirdPartyRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        String provider = normalizeProvider(request.provider());
        boolean ok = thirdPartyAuthService.bindThirdParty(
                userId, provider, request.openId(), request.unionId());
        return Map.of("success", ok);
    }

    /**
     * 解绑当前用户的第三方账号。
     *
     * @param request 包含 provider 的请求体
     * @return 包含 success 标志的响应体
     * @throws HttpClientErrorException.Unauthorized 未登录时抛出 401
     * @throws HttpClientErrorException.BadRequest provider 取值非法时抛出 400
     */
    @DeleteMapping("/unbind")
    @PreAuthorize("hasRole('USER')")
    public Map<String, Boolean> unbindThirdParty(@Valid @RequestBody UnbindThirdPartyRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        String provider = normalizeProvider(request.provider());
        boolean ok = thirdPartyAuthService.unbindThirdParty(userId, provider);
        return Map.of("success", ok);
    }

    /**
     * 规范化 provider 字段：仅允许 WECHAT / APPLE。
     *
     * @param provider 原始 provider 字符串
     * @return 规范化后的 provider（大写）
     * @throws HttpClientErrorException.BadRequest provider 非法时抛出 400
     */
    private String normalizeProvider(String provider) {
        if (provider == null) {
            throw HttpClientErrorException.create(
                    HttpStatus.BAD_REQUEST, "provider 不能为空", null, null, null);
        }
        String upper = provider.trim().toUpperCase();
        if (!ThirdPartyAuthService.PROVIDER_WECHAT.equals(upper)
                && !ThirdPartyAuthService.PROVIDER_APPLE.equals(upper)) {
            throw HttpClientErrorException.create(
                    HttpStatus.BAD_REQUEST,
                    "provider 取值非法，仅支持 WECHAT / APPLE",
                    null, null, null);
        }
        return upper;
    }
}

/**
 * 微信第三方账号登录请求体。
 *
 * @param code 微信 wx.login() 返回的临时 code（必填，后端换取 openId 并验签）
 */
record WechatThirdPartyLoginRequest(
        @NotBlank String code
) {
}

/**
 * Apple 第三方账号登录请求体。
 *
 * @param identityToken Sign in with Apple 返回的 identityToken JWT（必填，后端验签取 sub）
 */
record AppleLoginRequest(@NotBlank String identityToken) {
}

/**
 * 绑定第三方账号请求体。
 *
 * @param provider 第三方平台标识（WECHAT / APPLE，必填）
 * @param openId   第三方 openId（必填）
 * @param unionId  第三方 unionId（可空）
 */
record BindThirdPartyRequest(
        @NotBlank String provider,
        @NotBlank String openId,
        String unionId
) {
}

/**
 * 解绑第三方账号请求体。
 *
 * @param provider 第三方平台标识（WECHAT / APPLE，必填）
 */
record UnbindThirdPartyRequest(@NotBlank String provider) {
}
