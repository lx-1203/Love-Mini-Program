package com.campuslove.api.location;

import com.campuslove.api.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 城市归属 Controller（Phase Feedback3 P2.5）。
 *
 * <p>提供 GET /api/v1/location/ip-city：根据请求方 IP 反查城市，
 * 供「同城 Tab」自动标注当前城市。IP 来源优先取 {@code X-Real-IP}
 * （Nginx 透传），其次 {@code X-Forwarded-For}，最后 {@code remoteAddr}。</p>
 */
@RestController
@RequestMapping("/api/v1/location")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    /**
     * 获取当前 IP 所属城市。
     *
     * @param request HTTP 请求（用于读取 IP 头）
     * @return 城市归属视图
     */
    @GetMapping("/ip-city")
    public ApiResponse<LocationCityView> getIpCity(HttpServletRequest request) {
        String ip = resolveClientIp(request);
        return ApiResponse.ok(new LocationCityView(locationService.resolveCity(ip)));
    }

    /** 从请求头解析客户端 IP（X-Real-IP 优先，其次 X-Forwarded-For 首个 IP）。 */
    private String resolveClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For: client, proxy1, proxy2 -> 取首个
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
