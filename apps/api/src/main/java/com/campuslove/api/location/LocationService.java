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
 *   <li>演示用城市网段表（{@link #DEMO_CITY_NETS}）覆盖少量公网网段，用于本地演示 IP 归属效果</li>
 *   <li>其余公网 IP 返回默认城市（生产环境可在此接入第三方 IP 归属库，如纯真库 / 高德 IP 定位）</li>
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

    public LocationService(@Value("${app.location.default-city:南京}") String defaultCity) {
        this.defaultCity = StringUtils.hasText(defaultCity) ? defaultCity : "南京";
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
        for (CityNet net : DEMO_CITY_NETS) {
            if (ip.startsWith(net.prefix())) {
                return net.city();
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

    private boolean isPrivate172(String ip) {
        String[] parts = ip.split("\\.");
        if (parts.length < 2) {
            return false;
        }
        try {
            int second = Integer.parseInt(parts[1]);
            return second >= 16 && second <= 31;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /** 演示用网段与城市映射（内部小类）。 */
    private record CityNet(String prefix, String city) {}
}
