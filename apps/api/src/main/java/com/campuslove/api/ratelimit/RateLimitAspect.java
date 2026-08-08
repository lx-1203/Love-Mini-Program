package com.campuslove.api.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
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
 * <p>拦截所有标注 {@link RateLimit} 注解的方法（含类级注解继承场景），完成以下流程：</p>
 * <ol>
 *   <li>从注解中读取 {@code capacity}、{@code refillTokens}、{@code key} 配置</li>
 *   <li>解析 SpEL 表达式生成限流键：
 *     <ul>
 *       <li>支持 {@code #request.remoteAddr}：自动注入当前 HttpServletRequest 作为 {@code request} 变量</li>
 *       <li>支持 {@code #userId} 等方法参数引用（要求编译时保留参数名，Spring 默认开启）</li>
 *       <li>支持 {@code T(com.campuslove.api.config.SecurityUtils).getCurrentUserId()} 静态方法调用</li>
 *     </ul>
 *   </li>
 *   <li>调用 {@link RateLimitBucketRegistry#tryConsume} 尝试获取令牌</li>
 *   <li>获取失败时抛出 {@link RateLimitExceededException}，
 *       由 {@link com.campuslove.api.config.GlobalExceptionHandler} 转换为 HTTP 429 响应</li>
 * </ol>
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

    /** SpEL 表达式解析器（线程安全，可复用）。 */
    private final ExpressionParser parser = new SpelExpressionParser();

    /** 方法参数名发现器，用于 SpEL 中按参数名引用方法入参。 */
    private final ParameterNameDiscoverer paramNameDiscoverer =
            new DefaultParameterNameDiscoverer();

    /** 令牌桶注册表，由 Spring 注入。 */
    private final RateLimitBucketRegistry registry;

    /**
     * R4-00378：可信代理 IP/CIDR 列表（配置 app.security.trusted-proxies，逗号分隔）。
     *
     * <p>空列表（默认）表示不信任任何代理——限流键直接使用直连 remoteAddr，
     * 客户端伪造 X-Forwarded-For 头无法更换限流桶。部署在 Nginx/网关后时，
     * 应将网关 IP 加入此列表（前提：网关负责清理/覆盖客户端传入的 XFF），
     * 此时才信任 XFF 首地址作为客户端真实 IP。</p>
     */
    private final java.util.Set<String> trustedProxyIps;

    /** R4-00378：可信代理 CIDR 条目（前缀 + 位数，如 10.0.0.0/8） */
    private final java.util.List<CidrEntry> trustedProxyCidrs;

    /** R4-00378：CIDR 条目（避免引入第三方元组依赖） */
    private record CidrEntry(String prefix, int bits) {
    }

    /**
     * 构造函数注入注册表与可信代理配置。
     *
     * @param registry       令牌桶注册表 Bean
     * @param trustedProxies 可信代理 IP/CIDR 列表（逗号分隔，空表示不信任任何代理）
     */
    public RateLimitAspect(RateLimitBucketRegistry registry, String trustedProxies) {
        this.registry = registry;
        java.util.Set<String> ips = new java.util.HashSet<>();
        java.util.List<CidrEntry> cidrs = new java.util.ArrayList<>();
        if (trustedProxies != null && !trustedProxies.isBlank()) {
            for (String part : trustedProxies.split(",")) {
                String entry = part.trim();
                if (entry.isEmpty()) {
                    continue;
                }
                int slash = entry.indexOf('/');
                if (slash > 0) {
                    try {
                        cidrs.add(new CidrEntry(entry.substring(0, slash),
                                Integer.parseInt(entry.substring(slash + 1))));
                    } catch (NumberFormatException e) {
                        log.warn("可信代理 CIDR 配置非法，忽略: {}", entry);
                    }
                } else {
                    ips.add(entry);
                }
            }
        }
        this.trustedProxyIps = java.util.Collections.unmodifiableSet(ips);
        this.trustedProxyCidrs = java.util.Collections.unmodifiableList(cidrs);
    }

    /**
     * R4-00378：判断直连来源 IP 是否为可信代理。
     *
     * <p>仅当直连 remoteAddr 命中配置的可信代理（精确 IP 或 CIDR 前缀）时，
     * 才允许信任 X-Forwarded-For 首地址；否则视为客户端直连，XFF 不可信。</p>
     *
     * @param remoteAddr 直连来源 IP
     * @return true 表示可信代理
     */
    private boolean isTrustedProxy(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return false;
        }
        if (trustedProxyIps.contains(remoteAddr)) {
            return true;
        }
        for (CidrEntry cidr : trustedProxyCidrs) {
            if (remoteAddr.startsWith(cidr.prefix() + ".")) {
                // 简化 CIDR 匹配：按 /8 /16 /24 前缀处理
                int dotCount = (cidr.bits() + 7) / 8;
                String[] remoteParts = remoteAddr.split("\\.");
                String[] prefixParts = cidr.prefix().split("\\.");
                if (remoteParts.length < dotCount || prefixParts.length < dotCount) {
                    continue;
                }
                boolean match = true;
                for (int i = 0; i < dotCount; i++) {
                    if (!remoteParts[i].equals(prefixParts[i])) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return true;
                }
            }
        }
        return false;
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
     * 解析 SpEL 表达式生成限流键。
     *
     * <p>当 {@link RateLimit#key()} 为空时，使用"类名#方法名"作为默认键。
     * 否则使用 SpEL 解析表达式，并自动注入以下变量：</p>
     * <ul>
     *   <li>{@code request}：当前 HttpServletRequest（支持 {@code #request.remoteAddr}）</li>
     *   <li>所有方法参数（按参数名访问，如 {@code #userId}）</li>
     * </ul>
     *
     * <p>最终返回的桶键为 {@code 类名#方法名:解析值}，确保不同接口使用独立桶。</p>
     *
     * @param rateLimit 限流注解
     * @param method    当前方法
     * @param args      方法参数值
     * @return 限流键字符串
     */
    private String resolveKey(RateLimit rateLimit, Method method, Object[] args) {
        String expressionStr = rateLimit.key();
        String methodQualifier = method.getDeclaringClass().getSimpleName()
                + "#" + method.getName();

        if (expressionStr == null || expressionStr.isBlank()) {
            // 未指定 SpEL 时使用方法全限定名作为默认键（全局限流）
            return methodQualifier;
        }

        try {
            Expression expression = parser.parseExpression(expressionStr);
            // 使用 MethodBasedEvaluationContext 让 SpEL 可以按参数名引用方法入参
            MethodBasedEvaluationContext context = new MethodBasedEvaluationContext(
                    null, method, args, paramNameDiscoverer);

            // 注入当前 HttpServletRequest 作为 "request" 变量，支持 #request.remoteAddr
            HttpServletRequest request = currentRequest();
            if (request != null) {
                context.setVariable("request", request);
            }

            Object value = expression.getValue(context);
            if (value == null) {
                return methodQualifier + ":null";
            }
            return methodQualifier + ":" + value;
        } catch (org.springframework.expression.ExpressionException e) {
            // SpEL 解析失败时降级为方法全限定名，避免限流失效或误伤
            log.warn("SpEL 解析限流键失败，降级为方法全限定名：expression={}, method={}, error={}",
                    expressionStr, method.getName(), e.getMessage());
            return methodQualifier + ":fallback";
        }
    }

    /**
     * 从 Spring {@link RequestContextHolder} 获取当前 HttpServletRequest。
     *
     * <p>在非 Web 上下文（如异步线程、定时任务）中可能返回 null。</p>
     *
     * <p>infra R2-00229 + R4-00378：反向代理（Nginx/网关）部署时所有请求的
     * {@code remoteAddr} 均为代理 IP，导致全站共享同一限流桶（误伤）。
     * 包装器使 {@code getRemoteAddr()} 在<b>直连来源为配置的可信代理</b>
     * （{@code app.security.trusted-proxies}）时优先返回 {@code X-Forwarded-For}
     * 首地址（客户端真实 IP）；直连来源不可信时忽略 XFF，直接返回直连地址——
     * 客户端伪造 XFF 头无法更换限流桶（R4-00378）。</p>
     *
     * @return 当前 HttpServletRequest，无可用请求上下文时返回 null
     */
    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        return new ForwardedHeaderAwareRequestWrapper(attrs.getRequest(), this);
    }

    /**
     * 使 {@code getRemoteAddr()} 在直连来源为可信代理时优先返回 X-Forwarded-For
     * 首地址的请求包装器（R4-00378）；直连来源不可信或未携带 X-Forwarded-For 时
     * 行为与原请求一致。
     */
    private static final class ForwardedHeaderAwareRequestWrapper extends HttpServletRequestWrapper {

        private final RateLimitAspect aspect;

        ForwardedHeaderAwareRequestWrapper(HttpServletRequest request, RateLimitAspect aspect) {
            super(request);
            this.aspect = aspect;
        }

        @Override
        public String getRemoteAddr() {
            HttpServletRequest original = (HttpServletRequest) getRequest();
            String directAddr = super.getRemoteAddr();
            // R4-00378：仅当直连来源为可信代理时才信任 XFF（网关已清理/覆盖
            // 客户端 XFF 的前提下），否则客户端伪造 XFF 头即可更换限流桶
            if (!aspect.isTrustedProxy(directAddr)) {
                return directAddr;
            }
            String xff = original.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                int comma = xff.indexOf(',');
                String first = (comma >= 0 ? xff.substring(0, comma) : xff).trim();
                if (!first.isEmpty()) {
                    return first;
                }
            }
            return directAddr;
        }
    }
}
