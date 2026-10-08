package com.campuslove.api.wxpay;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 微信回调 IP 白名单守卫（app.wechat-pay.callback-ip-whitelist）。
 *
 * <p>规则：</p>
 * <ul>
 *   <li>白名单为空（默认）→ 放行所有 IP（仅依赖验签兜底），但输出告警日志提醒
 *       运维补齐（每实例仅告警一次，避免刷屏）；</li>
 *   <li>白名单非空 → 支持「精确 IP」与「IPv4 CIDR」（a.b.c.d/n）两种写法，
 *       不匹配的来源 IP 直接拒绝（404 语义，不暴露端点存在性）。</li>
 * </ul>
 *
 * <p>说明：微信支付回调可能经反向代理转发，取 IP 时优先 X-Forwarded-For 首跳
 * （由调用方解析后传入，本类不做请求解析以便单测）。</p>
 */
@Component
@Profile("real")
public class WxPayCallbackGuard {

    private static final Logger log = LoggerFactory.getLogger(WxPayCallbackGuard.class);

    private final WxPayProperties properties;
    /** 空白名单告警只发一次（防刷屏） */
    private volatile boolean emptyWhitelistWarned = false;

    public WxPayCallbackGuard(WxPayProperties properties) {
        this.properties = properties;
    }

    /**
     * 判断来源 IP 是否允许访问回调端点。
     *
     * @param remoteIp 来源 IP（X-Forwarded-For 首跳或 remoteAddr）
     * @return true=允许（含白名单未配置场景）；false=拒绝
     */
    public boolean isIpAllowed(String remoteIp) {
        List<String> whitelist = properties.getCallbackIpWhitelist();
        if (whitelist == null || whitelist.isEmpty()) {
            if (!emptyWhitelistWarned) {
                emptyWhitelistWarned = true;
                log.warn("微信回调 IP 白名单未配置（callback-ip-whitelist 为空），当前不限制来源 IP，"
                        + "仅依赖验签防护；建议配置微信支付服务器出口 IP 段");
            }
            return true;
        }
        if (remoteIp == null || remoteIp.isBlank()) {
            return false;
        }
        String ip = normalizeIp(remoteIp);
        for (String entry : whitelist) {
            if (entry == null || entry.isBlank()) {
                continue;
            }
            String rule = entry.trim();
            if (rule.contains("/")) {
                if (matchesCidr(ip, rule)) {
                    return true;
                }
            } else if (rule.equals(ip)) {
                return true;
            }
        }
        log.warn("微信回调来源 IP 不在白名单内，拒绝处理：ip={}", ip);
        return false;
    }

    /** 去除 IPv6 映射前缀与端口（多级代理取首跳由调用方保证）。 */
    public static String normalizeIp(String raw) {
        String ip = raw.trim();
        if (ip.startsWith("::ffff:")) {
            ip = ip.substring(7);
        }
        return ip;
    }

    /**
     * IPv4 CIDR 匹配（如 162.62.0.0/16）。
     * 非 IPv4 输入一律不匹配（白名单场景以微信服务器 IPv4 为主）。
     */
    static boolean matchesCidr(String ip, String cidr) {
        String[] parts = cidr.split("/");
        if (parts.length != 2) {
            return false;
        }
        Integer prefix = parsePositiveInt(parts[1]);
        if (prefix == null || prefix < 0 || prefix > 32) {
            return false;
        }
        Long ipValue = ipv4ToLong(ip);
        Long netValue = ipv4ToLong(parts[0]);
        if (ipValue == null || netValue == null) {
            return false;
        }
        long mask = prefix == 0 ? 0L : (0xFFFFFFFFL << (32 - prefix)) & 0xFFFFFFFFL;
        return (ipValue & mask) == (netValue & mask);
    }

    /** IPv4 字符串 → 32 位无符号值（long 承载）；非法输入返回 null。 */
    static Long ipv4ToLong(String ip) {
        String[] seg = ip.split("\\.");
        if (seg.length != 4) {
            return null;
        }
        long value = 0;
        for (String s : seg) {
            Integer octet = parsePositiveInt(s);
            if (octet == null || octet > 255) {
                return null;
            }
            value = (value << 8) | octet;
        }
        return value;
    }

    private static Integer parsePositiveInt(String s) {
        try {
            int v = Integer.parseInt(s.trim());
            return v < 0 ? null : v;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
