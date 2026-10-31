package com.campuslove.api.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.expression.MethodBasedEvaluationContext;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 速率限制 AOP 切面。
 *
 * <p>拦截所有标注 {@link RateLimit} 注解的方法，完成以下流程：</p>
 * <ol>
 *   <li>从注解中读取 {@code capacity}、{@code refillTokens}、{@code key} 配置</li>
 *   <li>解析 SpEL 表达式生成限流键，可引用以下变量：
 *     <ul>
 *       <li>{@code #clientIp}：{@link ClientIpResolver} 解析出的客户端 IP（默认键，
 *           绝大多数按 IP 限流的站点用这个，不再经过 HttpServletRequest 属性查找）</li>
 *       <li>{@code #httpRequest}：当前 {@link HttpServletRequest} 本体
 *           （如确需 header / requestURI 时使用）</li>
 *       <li>方法参数名（如 {@code #userId}、{@code #payload.phone}）——
 *           要求编译期保留参数名，spring-boot-starter-parent 默认开启 {@code -parameters}</li>
 *       <li>{@code T(com.campuslove.api.config.SecurityUtils).getCurrentUserId()} 静态调用</li>
 *     </ul>
 *   </li>
 *   <li>调用 {@link RateLimitBucketRegistry#tryConsume} 尝试获取令牌</li>
 *   <li>获取失败时抛出 {@link RateLimitExceededException}，
 *       由 {@link com.campuslove.api.config.GlobalExceptionHandler} 转换为 HTTP 429 响应</li>
 * </ol>
 *
 * <h2>变量命名不变量（P0 缺陷 1 的根因，勿回退）</h2>
 * <p>历史实现在 {@code MethodBasedEvaluationContext}（已按<b>方法参数名</b>注入变量）之上
 * 再 {@code setVariable("request", httpServletRequest)}，于是
 * {@code #request} 被<b>无条件覆盖</b>成 servlet 请求对象。{@code BillingController#purchase}
 * 的键 {@code ... + #request.planId()} 本意是取入参 DTO 的 planId，实际取到
 * {@code HttpServletRequest.planId()} → SpEL 抛异常 → 走降级 → 键变成
 * {@code BillingController#purchase:fallback}，<b>全站共用一个 1 次/60 秒的桶</b>：
 * 用户 A 买完 VIP 的 60 秒内，用户 B 的购买被 429 掉（付费路径误伤）。</p>
 *
 * <p>修复后的不变量：<b>切面注入的变量名不得与任何方法参数名同名</b>。
 * 因此 servlet 请求改名为 {@code #httpRequest}，并且不再保留 {@code #request}
 * 别名（别名会把同一类缺陷重新引入：只有"没有参数恰好叫 request"的方法才碰巧安全，
 * 而这不是可以证明的性质——它是随签名变化的）。
 * 该不变量由 {@code RateLimitKeyAuditTest} 逐注解守住：它枚举 main 源码里所有
 * {@code @RateLimit}，用与本类完全相同的解析路径求值，任何表达式抛异常或落到
 * 降级标记（{@link #MARKER_SPEL_FAILURE} / {@link #MARKER_NULL_VALUE} /
 * 历史遗留的 {@code :fallback}）即测试失败。</p>
 *
 * <h2>降级不再是"共享全局桶"</h2>
 * <p>SpEL 求值失败时，本类<b>不</b>回落到 {@code 类名#方法名} 这类所有用户共用的键，
 * 而是回落到 {@code 类名#方法名:spel-failure:<clientIp>} —— 每个客户端各自一个桶，
 * 一个坏表达式只影响它自己，不会让"用户 A 的流量把用户 B 挡在门外"；
 * 同时打 ERROR 级日志（含表达式原文与解析出的键）作为可被告警采集的信号，
 * 并把 {@code RateLimitKeyAuditTest} 作为 CI 侧的静态防线。</p>
 *
 * <p>限流键最终格式：{@code 类名#方法名:SpEL解析值}，确保不同接口即使使用相同 SpEL
 * 解析值（如同一个 IP）也会使用独立的桶。</p>
 *
 * <p>Bean 注册：由 {@link RateLimitConfig} 通过 {@code @Bean} 显式声明，
 * 因此本类不使用 {@code @Component} 注解，避免重复注册。</p>
 */
@Aspect
public class RateLimitAspect {

    private static final Logger log = LoggerFactory.getLogger(RateLimitAspect.class);

    /**
     * SpEL 求值失败时的降级键标记（后接客户端 IP，保证不产生全站共享桶）。
     * 单测 {@code RateLimitKeyAuditTest} 断言真实注解的键里不出现该标记。
     */
    static final String MARKER_SPEL_FAILURE = ":spel-failure:";

    /**
     * SpEL 求值成功但结果为 null 时的键标记（同样按客户端 IP 分桶）。
     * 例：匿名态下 {@code T(SecurityUtils).getCurrentUserId()} 返回 null，
     * 若直接拼成 {@code :null} 就是"所有匿名请求共用一桶"。
     */
    static final String MARKER_NULL_VALUE = ":null-value:";

    /** 历史遗留的降级标记（本实现不再产出；审计测试仍拦截，防回退）。 */
    static final String LEGACY_FALLBACK_MARKER = ":fallback";

    /** SpEL 表达式解析器（线程安全，可复用）。 */
    private final ExpressionParser parser = new SpelExpressionParser();

    /** 方法参数名发现器，用于 SpEL 中按参数名引用方法入参。 */
    private final ParameterNameDiscoverer paramNameDiscoverer =
            new DefaultParameterNameDiscoverer();

    /** 令牌桶注册表，由 Spring 注入。 */
    private final RateLimitBucketRegistry registry;

    /**
     * R4-00378 + 本轮 P0：客户端 IP 解析器（可信代理名单来自
     * {@code app.security.trusted-proxies}，空 = 不信任任何代理、忽略 XFF）。
     */
    private final ClientIpResolver clientIpResolver;

    /**
     * 构造函数注入注册表与可信代理配置（保留的兼容签名，单测直接 new 时用）。
     *
     * @param registry       令牌桶注册表 Bean
     * @param trustedProxies 可信代理 IP/CIDR 列表（逗号分隔，空表示不信任任何代理）
     */
    public RateLimitAspect(RateLimitBucketRegistry registry, String trustedProxies) {
        this(registry, new ClientIpResolver(trustedProxies));
    }

    /**
     * 构造函数注入注册表与共享的客户端 IP 解析器（Spring 装配走这条）。
     *
     * <p>解析器由 {@link RateLimitConfig} 以单例 Bean 提供，确保切面内 {@code #clientIp}
     * 与控制器里手工加的第二维度（如 {@code SmsCodeController} 的 IP 维度）
     * 使用<b>同一套</b>可信代理判定——两套实现漂移就等于"一个维度可被绕过"。</p>
     *
     * @param registry 令牌桶注册表 Bean
     * @param resolver 客户端 IP 解析器
     */
    public RateLimitAspect(RateLimitBucketRegistry registry, ClientIpResolver resolver) {
        this.registry = registry;
        this.clientIpResolver = resolver;
    }

    /**
     * 环绕通知：拦截方法级 {@link RateLimit} 注解。
     *
     * <p>注解虽支持类级，但当前所有业务场景均通过方法级
     * 注解使用，本切面仅匹配方法级。如后续需要类级继承能力，可扩展
     * {@code @within(rateLimit) && !@annotation(RateLimit)} 切点。</p>
     *
     * @param pjp       切点
     * @param rateLimit 方法上的注解实例（由 Spring AOP 自动绑定）
     * @return 原方法返回值
     * @throws Throwable 原方法抛出的异常或 {@link RateLimitExceededException}
     */
    @Around("@annotation(rateLimit)")
    public Object aroundMethod(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        return handleRateLimit(pjp, rateLimit);
    }

    /**
     * 实际执行限流逻辑的核心方法。
     *
     * @param pjp       切点
     * @param rateLimit 限流注解
     * @return 原方法返回值
     * @throws Throwable 原方法抛出的异常或 {@link RateLimitExceededException}
     */
    private Object handleRateLimit(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        MethodSignature signature = (MethodSignature) pjp.getSignature();
        Method method = signature.getMethod();

        // 解析限流键
        String bucketKey = resolveKey(rateLimit, method, pjp.getArgs());

        // 尝试消费令牌
        boolean allowed = registry.tryConsume(
                bucketKey,
                rateLimit.capacity(),
                rateLimit.refillTokens());

        if (!allowed) {
            log.warn("API 限流拒绝：method={}, key={}, capacity={}, refillTokens={}/s",
                    method.getName(), bucketKey, rateLimit.capacity(), rateLimit.refillTokens());
            // 抛出自定义异常，由 GlobalExceptionHandler 转换为 HTTP 429
            throw new RateLimitExceededException(
                    "请求过于频繁，请稍后再试（limit=" + rateLimit.capacity()
                            + ", refill=" + rateLimit.refillTokens() + "/s）");
        }

        return pjp.proceed();
    }

    /**
     * 解析 SpEL 表达式生成限流键（包内可见，供审计单测按生产同一路径求值）。
     *
     * <p>注入的变量：</p>
     * <ul>
     *   <li>{@code clientIp}：{@link ClientIpResolver} 解析出的客户端 IP 字符串</li>
     *   <li>{@code httpRequest}：当前 HttpServletRequest（<b>不叫 {@code request}</b>，
     *       见类注释的命名不变量）</li>
     *   <li>所有方法参数（按参数名访问，如 {@code #userId}）</li>
     * </ul>
     *
     * <p>返回的桶键为 {@code 类名#方法名:解析值}；解析失败/为 null 时返回带
     * {@link #MARKER_SPEL_FAILURE} / {@link #MARKER_NULL_VALUE} 且<b>仍按客户端 IP
     * 分桶</b>的降级键，绝不产出跨用户共享的桶。</p>
     *
     * @param rateLimit 限流注解
     * @param method    当前方法
     * @param args      方法参数值
     * @return 限流键字符串
     */
    String resolveKey(RateLimit rateLimit, Method method, Object[] args) {
        String expressionStr = rateLimit.key();
        String methodQualifier = method.getDeclaringClass().getSimpleName()
                + "#" + method.getName();

        if (expressionStr == null || expressionStr.isBlank()) {
            // 未指定 SpEL 时使用方法全限定名作为默认键（全局限流）
            return methodQualifier;
        }

        HttpServletRequest request = currentRequest();
        String clientIp = clientIpResolver.resolve(request);

        try {
            Expression expression = parser.parseExpression(expressionStr);
            // 使用 MethodBasedEvaluationContext 让 SpEL 可以按参数名引用方法入参
            MethodBasedEvaluationContext context = new MethodBasedEvaluationContext(
                    null, method, args, paramNameDiscoverer);

            // 注入当前 HttpServletRequest（变量名 httpRequest）与解析后的客户端 IP
            // （变量名 clientIp）。二者均不得与方法参数同名——由 RateLimitKeyAuditTest 保证。
            if (request != null) {
                context.setVariable("httpRequest", request);
            }
            context.setVariable("clientIp", clientIp);

            Object value = expression.getValue(context);
            if (value == null) {
                // 降级：按客户端 IP 分桶，不共享全局桶（见类注释）
                log.error("限流键 SpEL 解析结果为 null，降级为按客户端 IP 分桶：expression={},"
                        + " method={}, key={}{}{}（若持续出现说明 key 写错了，请修注解）",
                        expressionStr, method.getName(), methodQualifier,
                        MARKER_NULL_VALUE, clientIp);
                return methodQualifier + MARKER_NULL_VALUE + clientIp;
            }
            return methodQualifier + ":" + value;
        } catch (org.springframework.expression.ExpressionException e) {
            // 降级：绝不能再退化成"所有用户共用一个桶"（P0 缺陷 1 的根因）。
            // 这里按客户端 IP 各自成桶——坏表达式只影响该客户端，
            // 并以 ERROR 级日志 + 审计单测双重暴露，不允许静默降级。
            log.error("限流键 SpEL 解析失败，降级为按客户端 IP 分桶（非共享桶）：expression={},"
                    + " method={}, declaredKey={}{}{}, spelError={}",
                    expressionStr, method.getName(), methodQualifier,
                    MARKER_SPEL_FAILURE, clientIp, e.getMessage());
            return methodQualifier + MARKER_SPEL_FAILURE + clientIp;
        }
    }

    /**
     * 从 Spring {@link RequestContextHolder} 获取当前 HttpServletRequest。
     *
     * <p>在非 Web 上下文（如异步线程、定时任务）中可能返回 null，
     * 此时 {@link ClientIpResolver} 返回 {@link ClientIpResolver#UNKNOWN}，
     * 限流仍按"方法 + unknown-ip"分桶（不会误共享业务用户的桶，也不会静默放行）。</p>
     *
     * <p>注意：本方法返回的是<b>原始</b>请求对象。客户端 IP 一律经
     * {@link ClientIpResolver} 解析（只有直连来源在可信代理名单内时才读
     * {@code X-Forwarded-For}，否则忽略，伪造 XFF 换不到限流桶），
     * 不再用请求包装器改写 {@code getRemoteAddr()}——历史实现把包装后的
     * {@code remoteAddr} 直接暴露为 {@code #request}，与同名方法参数冲突，
     * 是 P0 缺陷 1 的放大器。详见 {@link ClientIpResolver} 的拓扑说明。</p>
     *
     * @return 当前 HttpServletRequest，无可用请求上下文时返回 null
     */
    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        return attrs.getRequest();
    }

    /** 测试/诊断用：暴露 IP 解析器，便于断言可信代理配置解析结果。 */
    ClientIpResolver clientIpResolver() {
        return clientIpResolver;
    }
}
