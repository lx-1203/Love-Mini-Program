package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.ratelimit.RateLimit;
import com.campuslove.api.ratelimit.RateLimitAspect;
import com.campuslove.api.ratelimit.RateLimitBucketRegistry;
import com.campuslove.api.ratelimit.RateLimitExceededException;
import java.lang.reflect.Method;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * P0-4 收口：{@code POST /api/v1/auth/guest-login} 写放大限流守卫。
 *
 * <p>缺陷：访客身份隔离后（P0-4），每次体验登录都会新建一个独立访客并落库
 * （users + 三份 profile + GuestDemoDataProvisioner 的私信/喜欢/访客/通知/悄悄话等，
 * 合计约 70 行），而 {@code guestLogin} 是公开 POST——兄弟公开认证写入口
 * （register / phone-login / wechat-login / admin-login）均已挂
 * {@code @RateLimit(capacity = 10, refillTokens = 0.1, key = "#clientIp")}，
 * 唯独 guest-login 漏挂 ⇒ 无防护的公开写端点可被刷量把数据库撑爆。</p>
 *
 * <p>本测试以「真实注解 + 真实切面 + 真实令牌桶」驱动，既验注解（结构），
 * 又验限流端到端拒绝行为（fail-closed 429），并保留 register/phone-login
 * 仍被限流的负向对照，防止修复时把兄弟端点的限流「顺手摘掉」而不自知。</p>
 */
class AuthControllerGuestLoginRateLimitTest {

    /** 与兄弟公开认证写入口一致的保守 IP 桶口径（防爆破/防刷量）。 */
    private static final long EXPECTED_CAPACITY = 10L;
    private static final double EXPECTED_REFILL_PER_SECOND = 0.1;
    private static final String EXPECTED_KEY = "#clientIp";

    @AfterEach
    void clearRequestContext() {
        RequestContextHolder.resetRequestAttributes();
    }

    /** 反射取 AuthController 目标方法。 */
    private static Method controllerMethod(String name, Class<?>... paramTypes) {
        try {
            return AuthController.class.getDeclaredMethod(name, paramTypes);
        } catch (NoSuchMethodException ex) {
            throw new AssertionError("守卫失效告警：AuthController 找不到方法 " + name, ex);
        }
    }

    @Test
    @DisplayName("guest-login 必须挂保守 IP 桶限流注解（与兄弟写入口同口径）")
    void guestLogin_shouldCarryConservativeIpRateLimit() {
        RateLimit rateLimit = controllerMethod("guestLogin", String.class).getAnnotation(RateLimit.class);

        assertNotNull(rateLimit,
                "P0-4 回归：/auth/guest-login 公开写入口未挂 @RateLimit——"
                        + "访客隔离后每次调用落库约 70 行，缺限流即无界写放大");
        assertEquals(EXPECTED_CAPACITY, rateLimit.capacity(),
                "guest-login 限流桶容量应与兄弟认证写入口一致（保守，支持冷启动突发但拦刷量）");
        assertEquals(EXPECTED_REFILL_PER_SECOND, rateLimit.refillTokens(), 0.0001,
                "guest-login 补充速率应与兄弟认证写入口一致（0.1/s = 每 10 秒 1 个令牌）");
        assertEquals(EXPECTED_KEY, rateLimit.key(),
                "guest-login 应按客户端 IP 限流（#clientIp，由 ClientIpResolver 解析），不是全局桶也不是 deviceId");
    }

    @Test
    @DisplayName("guest-login 限流按 IP 生效：同 IP 超容量拒绝，不同 IP 独立")
    void guestLogin_rateLimit_shouldRejectSameIpBeyondCapacityAndKeepIpsIndependent() throws Throwable {
        RateLimit rateLimit = controllerMethod("guestLogin", String.class).getAnnotation(RateLimit.class);
        assertNotNull(rateLimit, "前置：guest-login 必须挂 @RateLimit（见上一条用例）");

        RateLimitBucketRegistry registry = new RateLimitBucketRegistry();
        // 空可信代理列表：直连 remoteAddr 即限流键（R4-00378 fail-closed，伪造 XFF 无法换桶）
        RateLimitAspect aspect = new RateLimitAspect(registry, "");
        Method method = controllerMethod("guestLogin", String.class);

        // 正锚：同一 IP 前 capacity 次放行
        MockHttpServletRequest ipA = new MockHttpServletRequest();
        ipA.setRemoteAddr("203.0.113.10");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(ipA));
        for (int i = 0; i < rateLimit.capacity(); i++) {
            aspect.aroundMethod(proceedingJoinPointFor(method), rateLimit);
        }
        // 第 capacity+1 次同 IP 应抛 RateLimitExceededException（→ GlobalExceptionHandler 429）
        RateLimitExceededException rejected = assertThrows(RateLimitExceededException.class,
                () -> aspect.aroundMethod(proceedingJoinPointFor(method), rateLimit),
                "guest-login 同 IP 超过桶容量应 fail-closed 拒绝（HTTP 429），而非无界写库");
        assertTrue(rejected.getMessage().contains("limit=" + rateLimit.capacity()),
                "拒绝信息应携带限流参数，口径与兄弟端点一致");

        // 负向对照：不同 IP 拥有独立桶，不被上一个 IP 连坐
        MockHttpServletRequest ipB = new MockHttpServletRequest();
        ipB.setRemoteAddr("203.0.113.11");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(ipB));
        Object ok = aspect.aroundMethod(proceedingJoinPointFor(method), rateLimit);
        assertNotNull(ok, "另一 IP 首请求应放行——限流按 IP 分桶，不是全局限流");
    }

    @Test
    @DisplayName("负向对照：register / phone-login 仍挂限流（防止摘除兄弟端点防护）")
    void siblingAuthWrites_shouldRemainRateLimited() {
        assertNotNull(controllerMethod("register", RegisterRequest.class).getAnnotation(RateLimit.class),
                "register 必须保持 @RateLimit——修复 guest-login 不得削弱兄弟写入口防护");
        assertNotNull(controllerMethod("phoneLogin", PhoneLoginRequest.class).getAnnotation(RateLimit.class),
                "phone-login 必须保持 @RateLimit——修复 guest-login 不得削弱兄弟写入口防护");

        RateLimit registerLimit = controllerMethod("register", RegisterRequest.class).getAnnotation(RateLimit.class);
        RateLimit phoneLimit = controllerMethod("phoneLogin", PhoneLoginRequest.class).getAnnotation(RateLimit.class);
        // 三条公开认证写入口共享同一保守 IP 桶口径（guest-login 与它们对齐）
        for (RateLimit limit : new RateLimit[] { registerLimit, phoneLimit }) {
            assertEquals(EXPECTED_KEY, limit.key(), "兄弟写入口按 IP 限流");
            assertFalse(limit.capacity() <= 0, "桶容量应为正数（保守而非无界/为零）");
        }
    }

    /** 构造一个直通返回会话视图的 mock 切点，绑定真实 guestLogin 方法签名。 */
    private static ProceedingJoinPoint proceedingJoinPointFor(Method method) throws Throwable {
        ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(signature.getMethod()).thenReturn(method);
        when(pjp.getSignature()).thenReturn(signature);
        when(pjp.getArgs()).thenReturn(new Object[] { (Object) null });
        when(pjp.proceed(any())).thenReturn(null);
        when(pjp.proceed()).thenReturn(UserSessionView.withoutToken(
                null, false, null, null, false, false, false, false, null,
                java.util.Map.of("chat_ai_enabled", false)));
        return pjp;
    }
}
