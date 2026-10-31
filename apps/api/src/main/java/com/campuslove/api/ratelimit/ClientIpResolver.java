package com.campuslove.api.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 客户端真实 IP 解析器（限流拓扑缺陷 P0 修复，2026-10-31 限流轨）。
 *
 * <h2>为什么需要这个类</h2>
 * <p>限流键绝大多数按客户端 IP 分桶。本仓库的 shipped 拓扑是
 * {@code 浏览器 → Nginx（docker/client-nginx.conf）→ api（compose 只绑 127.0.0.1，
 * docker-compose.yml:384-385）}。在这种拓扑下 {@code request.getRemoteAddr()}
 * 对 <b>100% 的流量</b>都返回同一个地址（Nginx 容器 IP / 127.0.0.1）。
 * 若直接用 remoteAddr 分桶，全站所有 IP 维度限流退化成 <b>一个共享桶</b>：
 * 例如 {@code VillageController#likePost} 的 60/2/s 变成整站每分钟 2 次点赞、
 * {@code AuthController#register} 的 10 次之后整站每 10 秒 1 个注册——
 * 用户 B 被用户 A 的正常流量挤死（拒绝服务），且看起来像"限流生效了"。</p>
 *
 * <h2>为什么不能简单地"信 X-Forwarded-For"</h2>
 * <p>最直观的修法（无条件取 XFF 首地址）会把 51 个 IP 限流变成
 * <b>零个</b>：攻击者只要自带 {@code X-Forwarded-For: 1.2.3.4}（换一个数就换一个
 * 新桶），每个限制都可以用一条 header 绕过——比不做限流更危险，因为它给了
 * "已防护"的错觉。因此本类的安全前提是：
 * <b>只有当"直连来源"本身在可信代理名单内时才读 XFF</b>；直连来源不可信时
 * XFF 被完全忽略（伪造 header 换不到桶）。</p>
 *
 * <h2>解析规则</h2>
 * <ol>
 *   <li>取直连地址 {@code getRemoteAddr()}。</li>
 *   <li>若可信代理名单为空（默认，配置项
 *       {@code app.security.trusted-proxies}）→ 直接返回直连地址，<b>忽略 XFF</b>。
 *       首次解析到一个"内网/回环直连地址"时，{@link #WARN_SHARED_BUCKET}
 *       会打出一次性 ERROR，点名症状："all IP limits share one bucket"。</li>
 *   <li>若直连地址命中可信代理 → 解析 XFF 链：从<b>右</b>往左跳过所有可信代理，
 *       返回第一个不可信条目（这是唯一不因"攻击者预置了链首"而被绕过的算法）。
 *       链长度为 1 时等价于"取最左条目"，与本仓库 Nginx 覆盖式配置兼容。
 *       全链都可信（或链为空）时退回直连地址。</li>
 * </ol>
 *
 * <h2>⚠️ 应用侧无法修复的部分（必须改 Nginx，属另一条工作轨）</h2>
 * <p>本仓库 Nginx 配置当前是<b>追加</b>式的：
 * {@code proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for}
 * （{@code apps/admin/docker/nginx.conf:93}、{@code docker/client-nginx.conf:41}）。
 * 追加语义意味着客户端自己塞的 {@code X-Forwarded-For: 1.2.3.4} 会留在链首，
 * 真实客户端 IP 在链尾。<b>任何"取最左条目"的实现在这种代理下都会把攻击者
 * 自选的 1.2.3.4 当作客户端 IP</b>——这就是上面的算法从右往左走的原因，
 * 但"从右往左"也只在代理至少是可信的第一跳时才成立。</p>
 * <p>因此代理侧必须做到（本轨无权限改这两个文件，在此写明要求）：</p>
 * <ul>
 *   <li>{@code proxy_set_header X-Forwarded-For $remote_addr;}（<b>覆盖</b>，
 *       不是 {@code $proxy_add_x_forwarded_for} 追加），或
 *       先 {@code proxy_unset_request_hdr} / {@code real_ip_recursive on} 等价清理；</li>
 *   <li>{@code X-Real-IP} 同样由代理设置而非透传客户端值；</li>
 *   <li>与此同时把 Nginx 容器地址（compose 网络里的服务 IP/网段）配进
 *       {@code APP_TRUSTED_PROXIES}——两侧必须成对落地：只改 Nginx 不改配置，
 *       应用仍把代理地址当客户端（共享桶）；只改配置不改 Nginx，
 *       链首仍是攻击者可控值（本类的从右往左算法能兜住单跳，但链语义已经不对）。</li>
 * </ul>
 *
 * <h2>诚实边界（本类无法自证的部分）</h2>
 * <p>本类的正确性由 {@code ClientIpResolverTest} 的三个用例证明
 * （不可信直连+恶意 XFF ⇒ 忽略；可信代理+XFF ⇒ 用真实客户端；无代理 ⇒ remoteAddr）。
 * "线上确实只有 Nginx 一跳""compose 网络实际网段"这类事实需要 Redis/多副本/真实 Nginx
 * 环境验证，未在本轮验证。</p>
 */
public final class ClientIpResolver {

    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);

    /** 无法解析客户端 IP 时使用的占位串（保持桶键非空，避免整个限流被跳过）。 */
    public static final String UNKNOWN = "unknown-ip";

    /** 拓扑告警只打一次（每 JVM），避免高 QPS 下 ERROR 刷屏。 */
    private static final AtomicBoolean WARN_SHARED_BUCKET = new AtomicBoolean(false);

    /** 可信代理精确 IP 集合（大小写/端口无关的字符串匹配）。 */
    private final Set<String> trustedProxyIps;

    /** 可信代理 CIDR 列表（IPv4，位运算匹配）。 */
    private final List<Cidr> trustedProxyCidrs;

    /** 是否配置了任何可信代理。 */
    private final boolean hasTrustedProxies;

    /** 配置原文（诊断日志用）。 */
    private final String rawConfig;

    /**
     * 构造解析器。
     *
     * @param trustedProxies 逗号分隔的可信代理清单，支持精确 IP 与 IPv4 CIDR
     *                       （如 {@code 127.0.0.1, 172.18.0.2, 172.18.0.0/16}）；
     *                       {@code null}/空白表示不信任任何代理
     */
    public ClientIpResolver(String trustedProxies) {
        this.rawConfig = trustedProxies == null ? "" : trustedProxies.trim();
        Set<String> ips = new LinkedHashSet<>();
        List<Cidr> cidrs = new ArrayList<>();
        if (!this.rawConfig.isEmpty()) {
            for (String part : this.rawConfig.split(",")) {
                String entry = part.trim();
                if (entry.isEmpty()) {
                    continue;
                }
                int slash = entry.indexOf('/');
                if (slash > 0) {
                    Cidr cidr = Cidr.tryParse(entry.substring(0, slash), entry.substring(slash + 1));
                    if (cidr == null) {
                        // 配置写错必须可见：静默忽略等于"以为配了但其实没配"
                        log.error("可信代理 CIDR 配置非法，已忽略（该项不会生效，请修正）: {}", entry);
                    } else {
                        cidrs.add(cidr);
                    }
                } else {
                    ips.add(entry);
                }
            }
        }
        this.trustedProxyIps = Collections.unmodifiableSet(ips);
        this.trustedProxyCidrs = Collections.unmodifiableList(cidrs);
        this.hasTrustedProxies = !ips.isEmpty() || !cidrs.isEmpty();
    }

    /**
     * 解析客户端真实 IP（限流分桶用）。
     *
     * @param request 当前请求，可为 null（非 Web 上下文，如异步线程/定时任务）
     * @return 客户端 IP 字符串；无法确定时为 {@link #UNKNOWN}
     */
    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return UNKNOWN;
        }
        String direct = trimToNull(request.getRemoteAddr());
        if (direct == null) {
            return UNKNOWN;
        }
        if (!hasTrustedProxies) {
            // 默认路径：直连地址即客户端。XFF 一律不看（防伪造换桶）。
            warnOnceIfBehindUnconfiguredProxy(direct);
            return direct;
        }
        if (!isTrustedProxy(direct)) {
            // 直连来源不在名单内 → 它是（或被伪造成）客户端本身，XFF 不可信。
            return direct;
        }
        String xff = trimToNull(request.getHeader("X-Forwarded-For"));
        if (xff == null) {
            return direct;
        }
        String[] chain = xff.split(",");
        // 从右往左：跳过可信代理，第一个不可信条目即真实客户端。
        // 攻击者即便在链首预置了自选 IP，也无法越过可信代理之后的位置。
        for (int i = chain.length - 1; i >= 0; i--) {
            String candidate = trimToNull(chain[i]);
            if (candidate == null) {
                continue;
            }
            if (!isTrustedProxy(candidate)) {
                return candidate;
            }
        }
        // 整条链都是可信代理（例如健康检查/内部互调）→ 退回直连地址。
        return direct;
    }

    /**
     * 判断给定地址是否命中可信代理名单。
     *
     * @param address IP 字符串
     * @return true 表示可信代理
     */
    public boolean isTrustedProxy(String address) {
        if (address == null || address.isBlank()) {
            return false;
        }
        String addr = address.trim();
        if (trustedProxyIps.contains(addr)) {
            return true;
        }
        for (Cidr cidr : trustedProxyCidrs) {
            if (cidr.contains(addr)) {
                return true;
            }
        }
        return false;
    }

    /** 是否配置了至少一个可信代理（启动自检用）。 */
    public boolean hasTrustedProxies() {
        return hasTrustedProxies;
    }

    /** 配置原文（诊断/启动自检日志用）。 */
    public String rawConfig() {
        return rawConfig;
    }

    /**
     * 一次性拓扑告警：可信代理名单为空、而直连地址却是回环/内网地址时，
     * 说明本进程正处在"前面有一层未登记的代理"的拓扑里——此时所有 IP 维度
     * 限流共享同一个桶。这里必须报 ERROR（不是 WARN），因为它是静默误伤。
     *
     * <p>包内可见：{@link RateLimitTopologyGuard} 的启动自检与此处共用一条症状描述，
     * 单测也需要重置一次性标记。</p>
     */
    void warnOnceIfBehindUnconfiguredProxy(String direct) {
        if (hasTrustedProxies || !isPrivateOrLoopback(direct)) {
            return;
        }
        if (!WARN_SHARED_BUCKET.compareAndSet(false, true)) {
            return;
        }
        log.error("""
                限流拓扑告警：app.security.trusted-proxies 为空，而直连来源 {} 是回环/内网地址\
                 —— 本进程位于反向代理（Nginx/网关）之后。
                症状：所有按 IP 分桶的 @RateLimit 退化为【一个全站共享桶】\
                （all IP limits share one bucket），正常用户会互相挤成 HTTP 429，\
                例如 VillageController#likePost 的 60/2/s 变成整站 2/s。
                处置：把代理地址写入 APP_TRUSTED_PROXIES，并且【代理必须覆盖而非追加】\
                X-Forwarded-For（$remote_addr，不是 $proxy_add_x_forwarded_for）；\
                只做前一半 = 攻击者可用伪造的 XFF 首条目绕过全部 IP 限流。""", direct);
    }

    /** 测试专用：重置"一次性告警"标记。 */
    static void resetSharedBucketWarningForTests() {
        WARN_SHARED_BUCKET.set(false);
    }

    /** 回环 / RFC1918 / 链路本地 / IPv6 回环判定（拓扑告警用，不承担安全决策）。 */
    static boolean isPrivateOrLoopback(String ip) {
        String addr = trimToNull(ip);
        if (addr == null) {
            return false;
        }
        if (addr.startsWith("127.") || addr.startsWith("::1") || addr.equals("localhost")) {
            return true;
        }
        if (addr.startsWith("10.") || addr.startsWith("192.168.") || addr.startsWith("169.254.")) {
            return true;
        }
        if (addr.startsWith("172.")) {
            // 172.16.0.0 – 172.31.255.255
            int secondDot = addr.indexOf('.', 4);
            if (secondDot > 4) {
                try {
                    int second = Integer.parseInt(addr.substring(4, secondDot));
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException e) {
                    return false;
                }
            }
        }
        if (addr.startsWith("::ffff:")) {
            // IPv4 映射的 IPv6 写法
            return isPrivateOrLoopback(addr.substring(7));
        }
        return false;
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * IPv4 CIDR 条目（位运算匹配，替代旧的"字符串前缀相等"实现——
     * 前缀相等会把 {@code 10.0.0.0/8} 匹配到 {@code 10.0.0.X} 之外写错的
     * 形态（如 {@code 10.0.0.300}）也算进可信名单，且不支持非整字节段）。
     */
    record Cidr(int network, int maskBits) {

        static Cidr tryParse(String prefix, String bitsStr) {
            try {
                int bits = Integer.parseInt(bitsStr.trim());
                if (bits < 0 || bits > 32) {
                    return null;
                }
                int ip = ipv4ToInt(prefix.trim());
                if (ip < 0) {
                    return null;
                }
                int mask = bits == 0 ? 0 : (0xFFFFFFFF << (32 - bits));
                return new Cidr(ip & mask, bits);
            } catch (RuntimeException e) {
                return null;
            }
        }

        boolean contains(String address) {
            int ip = ipv4ToInt(address);
            if (ip < 0) {
                return false;
            }
            if (maskBits == 0) {
                return true;
            }
            int mask = 0xFFFFFFFF << (32 - maskBits);
            return (ip & mask) == (network & mask);
        }
    }

    /** 点分十进制 IPv4 → int；非法返回 -1。 */
    private static int ipv4ToInt(String text) {
        if (text == null || text.isEmpty()) {
            return -1;
        }
        String[] parts = text.split("\\.", -1);
        if (parts.length != 4) {
            return -1;
        }
        int result = 0;
        for (String part : parts) {
            if (part.isEmpty() || part.length() > 3) {
                return -1;
            }
            for (int i = 0; i < part.length(); i++) {
                if (part.charAt(i) < '0' || part.charAt(i) > '9') {
                    return -1;
                }
            }
            int octet;
            try {
                octet = Integer.parseInt(part);
            } catch (NumberFormatException e) {
                return -1;
            }
            if (octet > 255) {
                return -1;
            }
            result = (result << 8) | octet;
        }
        return result;
    }
}
