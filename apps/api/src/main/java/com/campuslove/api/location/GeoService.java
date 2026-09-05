package com.campuslove.api.location;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * LBS Phase 2：地理坐标服务。
 *
 * <p>提供坐标上报存储与附近的人查询能力。</p>
 */
@Service
public class GeoService {

    private static final Logger log = LoggerFactory.getLogger(GeoService.class);

    /** 地球平均半径（km），用于 haversine 公式 */
    private static final double EARTH_RADIUS_KM = 6371.0;

    /** 坐标上报节流间隔（分钟） */
    private static final int REPORT_THROTTLE_MINUTES = 5;

    private final UserRepository userRepository;

    public GeoService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 上报用户坐标（节流：5 分钟内重复上报忽略）。
     *
     * @param userId    当前用户 ID
     * @param latitude  纬度（gcj02）
     * @param longitude 经度（gcj02）
     */
    @Transactional
    public void reportLocation(Long userId, BigDecimal latitude, BigDecimal longitude) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        // 节流：5 分钟内不重复更新
        LocalDateTime now = LocalDateTime.now();
        if (user.getGeoUpdatedAt() != null &&
                user.getGeoUpdatedAt().plusMinutes(REPORT_THROTTLE_MINUTES).isAfter(now)) {
            return;
        }
        user.setLatitude(latitude);
        user.setLongitude(longitude);
        user.setGeoUpdatedAt(now);
        userRepository.save(user);
        log.debug("用户坐标已更新: userId={}, lat={}, lng={}", userId, latitude, longitude);
    }

    /**
     * 查询附近的人（bounding box 预筛 + haversine 精算）。
     *
     * @param lat       请求者纬度
     * @param lng       请求者经度
     * @param radiusKm  搜索半径（km，1-20）
     * @param maxResults 最大返回数
     * @return 附近用户列表（含距离信息）
     */
    public List<NearbyPerson> findNearby(BigDecimal lat, BigDecimal lng, int radiusKm, int maxResults) {
        double latD = lat.doubleValue();
        double lngD = lng.doubleValue();
        double radius = Math.min(Math.max(radiusKm, 1), 20);

        // bounding box 预筛（±radius 纬度/经度，快速排除远距离用户）
        double latDelta = radius / 111.0; // 1 纬度 ≈ 111km
        double lngDelta = radius / (111.0 * Math.cos(Math.toRadians(latD)));

        BigDecimal minLat = BigDecimal.valueOf(latD - latDelta);
        BigDecimal maxLat = BigDecimal.valueOf(latD + latDelta);
        BigDecimal minLng = BigDecimal.valueOf(lngD - lngDelta);
        BigDecimal maxLng = BigDecimal.valueOf(lngD + lngDelta);

        // 从仓库查询 bounding box 内有坐标的用户
        List<User> candidates = userRepository.findByLatitudeBetweenAndLongitudeBetween(
                minLat, maxLat, minLng, maxLng);

        // haversine 精算 + 排序 + 截断
        return candidates.stream()
                .map(u -> {
                    double dist = haversineKm(latD, lngD,
                            u.getLatitude().doubleValue(), u.getLongitude().doubleValue());
                    if (dist > radius) return null;
                    return new NearbyPerson(u.getId(), u.getNickname(), u.getAvatarUrl(),
                            u.getCampusName(), formatDistance(dist));
                })
                .filter(p -> p != null)
                .sorted((a, b) -> Double.compare(parseDistanceKm(a.distanceText()), parseDistanceKm(b.distanceText())))
                .limit(maxResults)
                .toList();
    }

    /**
     * 计算两点间的 haversine 距离（km）。
     */
    public double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * 距离模糊化（ADR-16）：>1km 取整、<1km 显示 "<1km"。
     */
    public String formatDistance(double km) {
        if (km < 1.0) return "<1km";
        return Math.round(km) + "km";
    }

    /** 解析格式化距离为数值（用于排序）。 */
    private double parseDistanceKm(String text) {
        if (text == null) return Double.MAX_VALUE;
        if (text.startsWith("<")) return 0.5;
        try {
            return Double.parseDouble(text.replace("km", "").trim());
        } catch (NumberFormatException e) {
            return Double.MAX_VALUE;
        }
    }

    /**
     * 附近的人视图。
     */
    public record NearbyPerson(
            Long userId,
            String nickname,
            String avatarUrl,
            String campusName,
            String distanceText
    ) {}
}
