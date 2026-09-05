package com.campuslove.api.location;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 位置 Controller（IP 归属 + LBS Phase 2 GPS 坐标上报/附近查询）。
 */
@RestController
@RequestMapping("/api/v1/location")
public class LocationController {

    private final LocationService locationService;
    private final GeoService geoService;

    public LocationController(LocationService locationService, GeoService geoService) {
        this.locationService = locationService;
        this.geoService = geoService;
    }

    @GetMapping("/ip-city")
    public ApiResponse<LocationCityView> getIpCity(HttpServletRequest request) {
        String ip = resolveClientIp(request);
        return ApiResponse.ok(new LocationCityView(locationService.resolveCity(ip)));
    }

    /**
     * LBS Phase 2：上报用户坐标（gcj02，精度 6 位）。
     * 节流：5 分钟内重复上报忽略。
     */
    @PostMapping("/report")
    @RateLimit(capacity = 10, refillTokens = 0.2, key = "#request.remoteAddr")
    public ApiResponse<Void> reportLocation(@RequestBody LocationReportRequest body,
                                            HttpServletRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (body.latitude() == null || body.longitude() == null) {
            return ApiResponse.error(400, "经纬度不能为空");
        }
        // 精度校验：6 位小数，范围合理
        if (body.latitude().doubleValue() < -90 || body.latitude().doubleValue() > 90) {
            return ApiResponse.error(400, "纬度范围 -90 ~ 90");
        }
        if (body.longitude().doubleValue() < -180 || body.longitude().doubleValue() > 180) {
            return ApiResponse.error(400, "经度范围 -180 ~ 180");
        }
        geoService.reportLocation(userId, body.latitude(), body.longitude());
        return ApiResponse.ok(null);
    }

    /**
     * LBS Phase 2：查询附近的人。
     *
     * @param lat      当前纬度
     * @param lng      当前经度
     * @param radiusKm 搜索半径（km，1-20，默认 5）
     */
    @GetMapping("/nearby")
    @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
    public ApiResponse<List<GeoService.NearbyPerson>> getNearby(
            @RequestParam BigDecimal lat,
            @RequestParam BigDecimal lng,
            @RequestParam(defaultValue = "5") int radiusKm,
            HttpServletRequest request) {
        List<GeoService.NearbyPerson> people = geoService.findNearby(lat, lng, radiusKm, 50);
        return ApiResponse.ok(people);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /** 坐标上报请求体 */
    public record LocationReportRequest(BigDecimal latitude, BigDecimal longitude) {}
}
