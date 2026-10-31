/**
 * 短信验证码控制器。
 *
 * 接口：
 *   POST /api/v1/sms/send-code  发送验证码
 *
 * 安全契约（验证码去假 fail-closed）：
 * <ul>
 *   <li>mock profile（本地演示）：返回 mockCode 供联调回填（模拟短信默认成功）。</li>
 *   <li>非 mock profile：绝不返回验证码本体——真实短信网关未配置时返回 503 明确错误；
 *       网关就绪时验证码经网关下发，响应仅含 success/expiresIn。</li>
 *   <li><b>限流两个维度（缺一不可）</b>：
 *     <ol>
 *       <li>手机号维度：{@link RateLimit} 注解（capacity=1，refill=1/60s）
 *           ＝单号 1 次/分钟 ≈ 1440 次/天；</li>
 *       <li>客户端 IP 维度：本类 {@link #enforceIpDimension()} 手工桶
 *           （capacity=10，refill=1/60s）＝单 IP 约 1440 次/天。</li>
 *     </ol>
 *     <b>2026-10-31 限流轨 P1（缺陷 4）</b>：修复前只有第 ① 维，
 *     「同一个 IP 使用无限个不同手机号」完全不受限——每号 1 次/分钟 × 任意号码数
 *     ＝一个脚本即可把短信费用刷到任意额度（真实 provider 接入后即真金白银；
 *     {@code SmsCodeService} 目前无 provider，故本轮是<b>潜在</b>成本而非当前损失）。
 *     补上第 ② 维后单 IP 的日发送量被封顶。</li>
 * </ul>
 *
 * <p>为什么第 ② 维不是第二个 {@code @RateLimit} 注解：{@link RateLimit} 不是
 * {@code @Repeatable}，而 {@link com.campuslove.api.ratelimit.RateLimitAspect} 的切点是
 * {@code @annotation(rateLimit)} 单注解绑定；同方法挂两条注解需要引入容器注解并改切点，
 * 而 Spring AOP 对重复注解的绑定语义并不确定。这里显式复用同一个
 * {@link RateLimitBucketRegistry}，桶键前缀 {@value #IP_BUCKET_PREFIX}
 * 保持与切面一致的 {@code 类名#方法名:值} 格式（监控/排障口径统一），
 * 客户端 IP 走同一个 {@link ClientIpResolver} 单例——两套可信代理判定漂移
 * 就等于有一个维度可以被绕过。</p>
 */
package com.campuslove.api.auth;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.ratelimit.ClientIpResolver;
import com.campuslove.api.ratelimit.RateLimit;
import com.campuslove.api.ratelimit.RateLimitBucketRegistry;
import com.campuslove.api.ratelimit.RateLimitExceededException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1/sms")
public class SmsCodeController {

    private static final Logger log = LoggerFactory.getLogger(SmsCodeController.class);

    /** 手机号维度（{@link RateLimit} 注解）之外的第二维度：客户端 IP 桶键前缀。 */
    static final String IP_BUCKET_PREFIX = "SmsCodeController#sendCodeByIp:";

    /** IP 维度突发上限：同一客户端 IP 瞬时最多 10 次发送请求。 */
    static final long IP_CAPACITY = 10L;

    /** IP 维度补充速率：1 令牌 / 60 秒 ≈ 单 IP 1440 次/天（与手机号维度同量级）。 */
    static final double IP_REFILL_TOKENS_PER_SECOND = 1.0 / 60.0;

    private final SmsCodeService smsCodeService;

    /** 令牌桶注册表：IP 维度第二限流用（缺陷 4）。 */
    private final RateLimitBucketRegistry rateLimitRegistry;

    /** 客户端 IP 解析器（与限流切面同一单例，可信代理判定的唯一来源）。 */
    private final ClientIpResolver clientIpResolver;

    public SmsCodeController(SmsCodeService smsCodeService,
                             RateLimitBucketRegistry rateLimitRegistry,
                             ClientIpResolver clientIpResolver) {
        this.smsCodeService = smsCodeService;
        this.rateLimitRegistry = rateLimitRegistry;
        this.clientIpResolver = clientIpResolver;
    }

    /**
     * 发送短信验证码。
     *
     * <p>mock profile 返回 mockCode（联调用）；真实环境不返回验证码本体
     * （网关未配置时 503）。限流按手机号（注解，1 次/分钟）+ 客户端 IP
     * （本方法内手工桶，10 次突发后每分钟 1 次）两个维度。</p>
     *
     * @param request 手机号
     * @return 发送结果（mock profile 附带 mockCode；真实环境不含验证码字段）
     */
    @PostMapping("/send-code")
    @RateLimit(capacity = 1, refillTokens = 1.0 / 60, key = "#payload.phone")
    public ApiResponse<Map<String, Object>> sendCode(
            @Valid @RequestBody SendCodeRequest payload) {
        // 缺陷 4：注解只封住"同一个手机号"，同一 IP 换号码仍然无限。
        // 必须在真正调用短信服务【之前】过 IP 桶——顺序错了费用已经发生。
        enforceIpDimension();
        log.info("验证码发送请求: phone={}", maskPhone(payload.phone()));
        // mock profile：模拟发送并回传 mockCode（本地演示契约保持不变）
        if (smsCodeService.isMockProfile()) {
            String code = smsCodeService.sendCode(payload.phone());
            return ApiResponse.ok(Map.of(
                    "success", true,
                    "mockCode", code,
                    "expiresIn", "300秒",
                    "message", "验证码已发送（模拟短信：无真实短信网关，默认发送成功）"
            ));
        }
        // 真实环境：网关未配置时抛 503；网关就绪时下发且响应不含验证码本体
        smsCodeService.sendCode(payload.phone());
        return ApiResponse.ok(Map.of(
                "success", true,
                "expiresIn", "300秒",
                "message", "验证码已发送，请查收短信"
        ));
    }

    /**
     * IP 维度限流（缺陷 4 修复）。
     *
     * <p>桶键 {@code SmsCodeController#sendCodeByIp:<clientIp>}，容量
     * {@value #IP_CAPACITY}、补充 {@value #IP_REFILL_TOKENS_PER_SECOND} 令牌/秒。
     * 耗尽时抛 {@link RateLimitExceededException}，由
     * {@link com.campuslove.api.config.GlobalExceptionHandler} 转 HTTP 429，
     * 与注解维度口径完全一致。</p>
     *
     * <p>非 Web 上下文（拿不到请求）时跳过本维度：注解的手机号维度仍然生效，
     * 且这种情况只出现在单测/内部调用，不存在可被利用的公网入口。</p>
     */
    private void enforceIpDimension() {
        HttpServletRequest httpRequest = currentHttpRequest();
        if (httpRequest == null) {
            return;
        }
        String clientIp = clientIpResolver.resolve(httpRequest);
        boolean allowed = rateLimitRegistry.tryConsume(
                IP_BUCKET_PREFIX + clientIp, IP_CAPACITY, IP_REFILL_TOKENS_PER_SECOND);
        if (!allowed) {
            log.warn("短信发送被 IP 维度限流拒绝: ip={}, capacity={}, refill={}/s",
                    clientIp, IP_CAPACITY, IP_REFILL_TOKENS_PER_SECOND);
            throw new RateLimitExceededException(
                    "该网络地址请求过于频繁，请稍后再试（每 IP 突发 " + IP_CAPACITY
                            + " 次，之后每分钟恢复 1 次）");
        }
    }

    private static HttpServletRequest currentHttpRequest() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs == null ? null : attrs.getRequest();
    }

    /** 发送验证码请求体 */
    public record SendCodeRequest(
            @NotBlank(message = "手机号不能为空")
            @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
            String phone
    ) {
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
