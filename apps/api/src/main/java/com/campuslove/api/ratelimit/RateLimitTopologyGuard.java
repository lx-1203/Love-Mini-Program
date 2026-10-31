package com.campuslove.api.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 限流拓扑启动自检（P0 缺陷 2 的"配置必须说话"部分）。
 *
 * <h2>它检查什么</h2>
 * <p>本仓库 shipped 部署把 api 绑到 {@code 127.0.0.1}（docker-compose.yml:384-385），
 * 对外流量全部经 Nginx 反代。此时若 {@code app.security.trusted-proxies}
 * （环境变量 {@code APP_TRUSTED_PROXIES}）为空——仓库与 {@code .env.example} 都没设——
 * {@link ClientIpResolver} 会（安全正确地）忽略 X-Forwarded-For 并使用直连地址，
 * 而直连地址对 100% 的流量都是同一个（Nginx 容器 IP）。后果不是"绕过限流"，
 * 而是<b>所有按 IP 分桶的 @RateLimit 塌成一个全站共享桶</b>：main 源码里 47 个
 * IP 维度站点（如 {@code VillageController#likePost} 60/2/s、
 * {@code AuthController#register} 10 次后每 10 秒 1 次）等价于整站配额，
 * 正常用户互相把对方挤成 HTTP 429。这类故障在监控上长得和"限流生效"一模一样，
 * 所以必须在启动时点名。</p>
 *
 * <h2>为什么不是 fail-fast 退出</h2>
 * <p>启动时无法证明"前面真的有代理"——本机跑 real profile 直连也是合法部署，
 * 直接 {@code throw} 会让所有无代理部署无法启动。因此这里做<b>带精确症状描述的
 * ERROR 级启动告警</b>（非本地 profile + 可信代理为空即打），加上
 * {@link ClientIpResolver#warnOnceIfBehindUnconfiguredProxy} 的运行时确认
 * （真的收到一个回环/内网直连来源时再打一次，点名 "all IP limits share one bucket"）。
 * 通过 {@code app.security.rate-limit.require-trusted-proxies=true}
 * 可以把这条自检升级为启动失败——供"确定跑在反代后"的部署使用。</p>
 */
@Component
public class RateLimitTopologyGuard {

    private static final Logger log = LoggerFactory.getLogger(RateLimitTopologyGuard.class);

    /** 视为"本地/演示"的 profile：这些环境没有反代，可信代理为空是正确配置。 */
    private static final java.util.Set<String> LOCAL_PROFILES =
            java.util.Set.of("mock", "test", "local", "default");

    private final Environment environment;
    private final ClientIpResolver clientIpResolver;
    private final boolean requireTrustedProxies;

    /**
     * 构造启动自检。
     *
     * @param environment          Spring 环境（读取激活 profile）
     * @param trustedProxies       可信代理配置原文（{@code app.security.trusted-proxies}）
     * @param requireTrustedProxies 为 true 时，非本地 profile 且可信代理为空 ⇒ 拒绝启动
     */
    public RateLimitTopologyGuard(
            Environment environment,
            @Value("${app.security.trusted-proxies:}") String trustedProxies,
            @Value("${app.security.rate-limit.require-trusted-proxies:false}")
            boolean requireTrustedProxies) {
        this.environment = environment;
        this.clientIpResolver = new ClientIpResolver(trustedProxies);
        this.requireTrustedProxies = requireTrustedProxies;
    }

    /**
     * 应用就绪后执行拓扑自检。
     *
     * <p>异常语义：{@code require-trusted-proxies=true} 且检查不通过时抛
     * {@link IllegalStateException} 阻断启动（fail-fast，由部署方显式选择）；
     * 默认仅打 ERROR（不让本机/无代理部署起不来）。</p>
     */
    @EventListener(ApplicationReadyEvent.class)
    public void checkTopology() {
        if (clientIpResolver.hasTrustedProxies()) {
            log.info("限流拓扑自检：可信代理已配置（{} 项可信 IP/CIDR 来源），"
                    + "按 IP 限流使用 X-Forwarded-For 中第一个不可信条目；"
                    + "请确认代理是【覆盖】而非【追加】XFF（$remote_addr，"
                    + "不是 $proxy_add_x_forwarded_for），否则链首仍由客户端控制",
                    clientIpResolver.rawConfig());
            return;
        }
        if (isLocalProfile()) {
            log.debug("限流拓扑自检：本地/演示 profile，可信代理为空属预期配置（直连即客户端）");
            return;
        }
        String message = """
                限流拓扑自检【失败】：当前 profile 非本地/演示（active={}），\
                而 app.security.trusted-proxies / APP_TRUSTED_PROXIES 为空。\
                本仓库 shipped 部署把 api 绑在 127.0.0.1、由 Nginx 反代对外\
                （docker-compose.yml:384-385），因此直连 remoteAddr 对所有请求都是代理地址 ——\
                结果是【所有 IP 维度 @RateLimit 共享同一个全站桶】\
                （all IP limits share one bucket，47 个按 IP 分桶的站点全部退化），\
                正常用户会互相刷出 HTTP 429（点赞、注册、私信、搜索首当其冲）。\
                修复必须成对：① APP_TRUSTED_PROXIES 填入代理容器地址/网段；\
                ② Nginx 用 proxy_set_header X-Forwarded-For $remote_addr（覆盖，不是\
                $proxy_add_x_forwarded_for 追加）。只做 ① 会让攻击者用伪造的 XFF 首条目\
                绕过全部 IP 限流，比不限流更危险。""";
        if (requireTrustedProxies) {
            log.error(message, java.util.Arrays.toString(environment.getActiveProfiles()));
            throw new IllegalStateException(
                    "app.security.rate-limit.require-trusted-proxies=true 但"
                            + " app.security.trusted-proxies 为空：见上一条 ERROR 的处置说明");
        }
        log.error(message, java.util.Arrays.toString(environment.getActiveProfiles()));
    }

    private boolean isLocalProfile() {
        String[] active = environment.getActiveProfiles();
        if (active.length == 0) {
            return true;
        }
        for (String p : active) {
            if (LOCAL_PROFILES.contains(p)) {
                return true;
            }
        }
        return false;
    }
}
