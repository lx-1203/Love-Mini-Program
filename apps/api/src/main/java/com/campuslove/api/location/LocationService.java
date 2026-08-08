package com.campuslove.api.location;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * IP 归属服务（Phase Feedback3 P2.5）。
 *
 * <p>根据请求方 IP（经 Nginx 透传的 {@code X-Real-IP} / {@code X-Forwarded-For}）反查城市，
 * 供「同城 Tab」自动标注当前城市。</p>
 *
 * <p>实现说明：</p>
 * <ul>
 *   <li>内网 / 环回 IP（本地开发、局域网）返回配置的默认城市（{@code app.location.default-city}，默认"南京"）</li>
 *   <li>R4-00340：演示用城市网段表（{@link #DEMO_CITY_NETS}）仅在本服务开关
 *       {@code app.location.demo-city-nets-enabled=true}（仅 mock/本地演示）时生效，
 *       生产环境（real）默认关闭——演示网段数据不得进入真实模式（同城标注失真）</li>
 *   <li>其余公网 IP 返回默认城市（TODO 生产：接入真实 IP 归属库，如纯真库 / 高德 IP
 *       定位 / ip2region 离线库，替换演示网段方案）</li>
 * </ul>
 */
@Service
public class LocationService {

    /** 演示用城市网段表：网段前缀 -> 城市（本地联调时构造 X-Real-IP 可验证 IP 归属） */
    private static final List<CityNet> DEMO_CITY_NETS = List.of(
            new CityNet("218.94.", "南京"),
            new CityNet("60.191.", "杭州"),
            new CityNet("101.36.", "上海"),
            new CityNet("118.112.", "成都"),
            new CityNet("113.98.", "广州")
    );

    private final String defaultCity;

    /** R4-00340：演示网段表开关（默认 false；mock/本地演示 profile 开启） */
    private final boolean demoCityNetsEnabled;

    public LocationService(@Value("${app.location.default-city:南京}") String defaultCity,
                           @Value("${app.location.demo-city-nets-enabled:false}") boolean demoCityNetsEnabled) {
        this.defaultCity = StringUtils.hasText(defaultCity) ? defaultCity : "南京";
        this.demoCityNetsEnabled = demoCityNetsEnabled;
    }

    /**
     * 解析 IP 归属城市。
     *
     * @param clientIp 客户端 IP（可为 null/空，视为未知 → 默认城市）
     * @return 城市名
     */
    public String resolveCity(String clientIp) {
        String ip = clientIp == null ? "" : clientIp.trim();
        if (ip.isEmpty() || isPrivateIp(ip)) {
            return defaultCity;
        }
        // R4-00340：演示网段表仅 mock/本地演示（demo-city-nets-enabled=true）时生效，
        // 生产环境不得使用演示数据冒充真实 IP 归属
        if (demoCityNetsEnabled) {
            for (CityNet net : DEMO_CITY_NETS) {
                if (ip.startsWith(net.prefix())) {
                    return net.city();
                }
            }
        }
        return defaultCity;
    }

    /** 是否为内网 / 环回 IP（127.x / 10.x / 192.168.x / 172.16-31.x）。 */
    private boolean isPrivateIp(String ip) {
        if (ip.startsWith("127.") || ip.startsWith("10.")
                || ip.startsWith("192.168.") || ip.startsWith("0.")
                || ip.startsWith("::1")) {
            return true;
        }
        return ip.startsWith("172.") && isPrivate172(ip);
    }

    /**
     * RFC 1918 私网段 172.16.0.0/12 的第二段范围（R4-01831 命名常量）。
     * 172.16.0.0 ~ 172.31.255.255 均属私网。
     */
    private static final int PRIVATE_172_MIN_SECOND_OCTET = 16;
    private static final int PRIVATE_172_MAX_SECOND_OCTET = 31;

    private boolean isPrivate172(String ip) {
        String[] parts = ip.split("\\.");
        if (parts.length < 2) {
            return false;
        }
        try {
            int second = Integer.parseInt(parts[1]);
            return second >= PRIVATE_172_MIN_SECOND_OCTET && second <= PRIVATE_172_MAX_SECOND_OCTET;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /** 演示用网段与城市映射（内部小类）。 */
    private record CityNet(String prefix, String city) {}
}
