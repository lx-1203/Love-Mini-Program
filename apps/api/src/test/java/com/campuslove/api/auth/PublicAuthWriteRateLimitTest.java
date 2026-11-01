package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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
import java.util.ArrayList;
import java.util.List;
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
 * 2) 短信限流必须按手机号分桶（不能被 SpEL 注入的 request 变量遮蔽成全站单桶），
 *    且分桶用的必须是手机号摘要而非原值——桶名会进 Redis 键名，本仓 Redis 开 AOF 会落盘。
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

    /**
     * 短信限流的不变量（2026-11-01 从"钉死表达式原文"改写为"钉死行为"）。
     *
     * <p>历史判点是 {@code assertEquals("#payload.phone", limit.key())}，它把【键里嵌手机号原值】
     * 这件事本身当成了正确性——而裸手机号进 Redis/Redisson 键名正是第五轮审查判红的 F-05
     * （本仓 Redis 开了 AOF：{@code docker-compose.yml --appendonly yes}，键名会落盘并随备份
     * 长期留存，value 的 TTL 管不到它）。表达式改成 {@code #pii.ref(#payload.phone)} 后，
     * 那条字面断言必然红，但它红的不是缺陷。</p>
     *
     * <p>现在判的是四条真正的产品不变量，前三条靠【运行切面】取证而非读注解字符串：</p>
     * <ol>
     *   <li>同一手机号仍进同一个桶（第二次被拒）——这同时证明摘要值稳定可重放：
     *       若 {@code PiiKeyReference.of} 每次都产出不同值，第二次调用会落进新桶而被放行，
     *       本条立刻变红 ⇒ 摘要不稳定 = 限流形同虚设，这里是能证伪的；</li>
     *   <li>不同手机号进不同桶（不能退化成全站单桶，含不能退化成按 IP 的降级桶）；</li>
     *   <li>落进键名的【不是】手机号原值（探针注册号实测不出现在任何一次桶键里）；</li>
     *   <li>表达式按 DTO 参数取值、不受切面注入变量遮蔽（原 P0 缺陷 1 的防线），
     *       且必须走 PII 安全包装器。</li>
     * </ol>
     */
    @Test
    @DisplayName("短信验证码按手机号分桶：同号第二次拒绝、异号独立桶，且键名不含手机号原值")
    void smsCode_shouldRateLimitPerPhoneNotGlobalBucket() throws Throwable {
        Method method = SmsCodeController.class.getDeclaredMethod(
                "sendCode", SmsCodeController.SendCodeRequest.class);
        RateLimit limit = method.getAnnotation(RateLimit.class);
        assertNotNull(limit, "短信发送必须挂 @RateLimit");
        assertTrue(
                java.util.Arrays.stream(method.getParameterAnnotations()[0])
                        .anyMatch(annotation -> annotation instanceof jakarta.validation.Valid),
                "短信请求体必须启用 @Valid，否则手机号格式约束不会生效");

        String expression = limit.key();
        // 判点 4a：取值必须来自 DTO 参数本体。切面刻意不注入 #request（会被方法参数遮蔽，
        // 出过付费路径全站共用一个桶的 P0），这条把旧防线保住。
        assertTrue(expression.contains("#payload.phone"),
                "限流键必须引用 DTO 参数 #payload.phone（不能是被切面遮蔽的 #request.phone）："
                        + expression);
        assertFalse(expression.contains("#request"),
                "限流键不得引用被保留掉的变量名 #request：" + expression);
        // 判点 4b：命中手机号的表达式必须先过 PII 包装器。
        // 只判行为（判点 3）不够——键名里的原值还会经日志/监控出进程；
        // 这条要求"取值形态"与"取值维度"同时成立，缺一条就红。
        assertTrue(expression.contains("#pii.ref("),
                "限流键引用了手机号，却把原值直接写进键名（AOF 会落盘）。请走 #pii.ref(...)："
                        + expression);

        RecordingBucketRegistry registry = new RecordingBucketRegistry();
        RateLimitAspect aspect = new RateLimitAspect(registry, "");
        MockHttpServletRequest http = new MockHttpServletRequest();
        http.setRemoteAddr("203.0.113.50");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(http));

        String phoneA = "13800000001";
        String phoneB = "13800000002";
        SmsCodeController.SendCodeRequest requestA =
                new SmsCodeController.SendCodeRequest(phoneA);
        SmsCodeController.SendCodeRequest requestB =
                new SmsCodeController.SendCodeRequest(phoneB);

        // capacity=1：同号首次放行
        aspect.aroundMethod(joinPointFor(method, requestA), limit);
        // 判点 1：同一手机号第二次必须被拒 ⇒ 两次落在同一个桶 ⇒ 摘要键稳定
        assertThrows(RateLimitExceededException.class,
                () -> aspect.aroundMethod(joinPointFor(method, requestA), limit),
                "同一手机号第二次发送应被限流拒绝（拒绝失效说明摘要值每次不同，限流形同虚设）");
        // 判点 2：另一手机号必须拥有独立桶；若键退化为全局单桶，这里会被误伤
        Object allowed = aspect.aroundMethod(joinPointFor(method, requestB), limit);
        assertNotNull(allowed, "不同手机号应拥有独立限流桶");

        assertEquals(3, registry.bucketKeys.size(), "三次调用应当落三次桶键取值");
        String firstA = registry.bucketKeys.get(0);
        String secondA = registry.bucketKeys.get(1);
        String keyB = registry.bucketKeys.get(2);
        assertEquals(firstA, secondA,
                "同一手机号的桶键每次调用必须一致（摘要不稳定 ⇒ 限流形同虚设）");
        assertNotEquals(firstA, keyB,
                "不同手机号必须进不同桶（撞桶 ⇒ 一个号码能把另一个号码的短信限死）");
        for (String bucketKey : registry.bucketKeys) {
            // 判点 3：PII 不进键名（用真实形态的探针号码，摘要若含原值这里必红）
            assertFalse(bucketKey.contains(phoneA) || bucketKey.contains(phoneB),
                    "桶键里出现了手机号原值（会进 Redis 键名并落 AOF）：" + bucketKey);
            // 判点 2 补充：降级桶（按 IP）也算退化——分桶维度不再是手机号
            assertFalse(bucketKey.contains(":spel-failure:")
                            || bucketKey.contains(":null-value:")
                            || bucketKey.contains(":fallback"),
                    "短信限流键落进了降级桶（分桶维度不再是手机号，等于按 IP/全局单桶）："
                            + bucketKey);
        }
    }

    /**
     * 记录每次 {@code tryConsume} 实际拿到的桶键，其余行为完全委托生产实现。
     *
     * <p>为什么要它：切面把 SpEL 解析后的桶键直接喂给注册表，测试若只看注解原文，
     * 就等于"宣称键干净"而从未真的求值过。继承（而非 Mockito 打桩）保证令牌桶
     * 语义仍是生产那套，判点 1 的"同号第二次被拒"才不是被 mock 出来的。</p>
     */
    private static final class RecordingBucketRegistry extends RateLimitBucketRegistry {
        private final List<String> bucketKeys = new ArrayList<>();

        @Override
        public boolean tryConsume(String key, long capacity, double refillTokens) {
            bucketKeys.add(key);
            return super.tryConsume(key, capacity, refillTokens);
        }
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
