package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
 * 公开认证写入入口的限流回归：
 * 1) 第三方微信/Apple 登录会建用户，必须与 sibling 公开登录一样挂 IP 桶；
 * 2) 短信限流键必须按手机号，不能被 SpEL 注入的 request 变量遮蔽成全站单桶。
 */
class PublicAuthWriteRateLimitTest {

    @AfterEach
    void clearRequestContext() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("第三方微信/Apple 登录公开写入口必须挂 IP 限流")
    void thirdPartyLoginEndpoints_shouldCarryIpRateLimit() throws Exception {
        assertIpLimit(ThirdPartyAuthController.class.getDeclaredMethod(
                "loginWithWechat", WechatThirdPartyLoginRequest.class));
        assertIpLimit(ThirdPartyAuthController.class.getDeclaredMethod(
                "loginWithApple", AppleLoginRequest.class));
    }

    @Test
    @DisplayName("短信验证码按手机号分桶：同号第二次拒绝，异号仍有独立令牌")
    void smsCode_shouldRateLimitPerPhoneNotGlobalBucket() throws Throwable {
        Method method = SmsCodeController.class.getDeclaredMethod(
                "sendCode", SmsCodeController.SendCodeRequest.class);
        RateLimit limit = method.getAnnotation(RateLimit.class);
        assertNotNull(limit, "短信发送必须挂 @RateLimit");
        assertEquals("#payload.phone", limit.key(),
                "限流键必须引用 DTO 参数（不能使用被切面 request 变量遮蔽的 #request.phone）");
        assertTrue(
                java.util.Arrays.stream(method.getParameterAnnotations()[0])
                        .anyMatch(annotation -> annotation instanceof jakarta.validation.Valid),
                "短信请求体必须启用 @Valid，否则手机号格式约束不会生效");

        RateLimitAspect aspect = new RateLimitAspect(new RateLimitBucketRegistry(), "");
        MockHttpServletRequest http = new MockHttpServletRequest();
        http.setRemoteAddr("203.0.113.50");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(http));

        SmsCodeController.SendCodeRequest phoneA =
                new SmsCodeController.SendCodeRequest("13800000001");
        SmsCodeController.SendCodeRequest phoneB =
                new SmsCodeController.SendCodeRequest("13800000002");

        // capacity=1：同号首次放行，第二次拒绝
        aspect.aroundMethod(joinPointFor(method, phoneA), limit);
        assertThrows(RateLimitExceededException.class,
                () -> aspect.aroundMethod(joinPointFor(method, phoneA), limit),
                "同一手机号第二次发送应被限流拒绝");

        // 另一手机号必须拥有独立桶；若键退化为全局单桶，这里会被误伤
        Object allowed = aspect.aroundMethod(joinPointFor(method, phoneB), limit);
        assertNotNull(allowed, "不同手机号应拥有独立限流桶");
    }

    private static void assertIpLimit(Method method) {
        RateLimit limit = method.getAnnotation(RateLimit.class);
        assertNotNull(limit, method.getName() + " 是公开写入口，必须挂 @RateLimit");
        assertEquals("#clientIp", limit.key(),
                method.getName() + " 应按客户端 IP 限流");
        assertEquals(10, limit.capacity(), method.getName() + " 的桶容量应与 sibling 登录一致");
        assertEquals(0.1, limit.refillTokens(), 0.0001,
                method.getName() + " 的补充速率应与 sibling 登录一致");
    }

    private static ProceedingJoinPoint joinPointFor(Method method, Object argument) throws Throwable {
        ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(signature.getMethod()).thenReturn(method);
        when(pjp.getSignature()).thenReturn(signature);
        when(pjp.getArgs()).thenReturn(new Object[] { argument });
        when(pjp.proceed()).thenReturn(new Object());
        when(pjp.proceed(any())).thenReturn(new Object());
        return pjp;
    }
}
