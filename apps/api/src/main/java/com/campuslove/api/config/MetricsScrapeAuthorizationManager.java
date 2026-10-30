package com.campuslove.api.config;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.util.matcher.IpAddressMatcher;

/**
 * 指标抓取端点的来源地址白名单授权器。
 *
 * <p>背景（2026-10-29 第二轮排查）：{@code SecurityConfig} 把 {@code /actuator/**}
 * 整段限给 {@code ROLE_ADMIN}，而 {@code docker/prometheus/prometheus.yml} 的
 * {@code campuslove-api} job 不带任何凭据 —— 结果是 Prometheus 抓取恒被拒，
 * 5xx 率、P99、JVM、HikariCP、登录与支付回调等全部指标无数据，
 * {@code up == 0} 还会让 {@code ApiDown} 长期误报。监控看似配齐，实际上是断的。</p>
 *
 * <p>为什么用来源白名单而不是把端点 permitAll：prometheus 端点会暴露请求路径、
 * 状态分布与业务计数，公网可读等于给探测者一张地图；也不需要为此新增一个
 * "抓取专用管理员凭据"（那会把密钥管理摊到每条部署环境上）。抓取方是内网固定
 * 目标，用 CIDR 白名单最小且可审计。</p>
 *
 * <p><b>fail-closed</b>：白名单为空 ⇒ 一律拒绝（行为与修复前一致，不会因"忘了配"
 * 而意外放开）。配置了非法 CIDR ⇒ 构造期直接抛错，宁可启动失败也不留"以为配好了"。</p>
 *
 * <p>只信任 {@code request.getRemoteAddr()}：X-Forwarded-For 可被客户端伪造，
 * 若用它当判定依据，任意公网地址都能自称内网。</p>
 */
public final class MetricsScrapeAuthorizationManager
        implements AuthorizationManager<RequestAuthorizationContext> {

    private final List<IpAddressMatcher> allowlist;

    /**
     * @param rawCidrs 逗号或换行分隔的 CIDR / IP 列表，例如 {@code 172.16.0.0/12,10.0.0.0/8}；
     *                 空串表示不放行任何来源（等价于"只有 ADMIN 才能读指标"的旧行为）
     */
    public MetricsScrapeAuthorizationManager(String rawCidrs) {
        this.allowlist = (rawCidrs == null ? "" : rawCidrs)
                .lines()
                .map(String::trim)
                .filter(s -> !s.isEmpty() && !s.startsWith("#"))
                .flatMap(s -> Arrays.stream(s.split(",")))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(IpAddressMatcher::new)
                .toList();
    }

    /** 白名单是否为空（空=不额外放行任何来源）。供装配日志与测试使用。 */
    public boolean hasNoAllowlist() {
        return allowlist.isEmpty();
    }

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authentication,
                                       RequestAuthorizationContext context) {
        HttpServletRequest request = context.getRequest();
        if (hasNoAllowlist() || request.getRemoteAddr() == null) {
            return new AuthorizationDecision(false);
        }
        boolean allowed = allowlist.stream().anyMatch(matcher -> matcher.matches(request));
        return new AuthorizationDecision(allowed);
    }
}
