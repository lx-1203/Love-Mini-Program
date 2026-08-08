package com.campuslove.api.campus;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 模拟校园认证端点（演示专用，R4-00358）。
 *
 * <p>原实现挂在 {@link CampusController}（real profile）下，导致生产 API 面
 * 存在演示残留端点（real 下恒 501）。现拆分为独立控制器，仅当配置
 * {@code app.campus.certification-simulate-enabled=true} 时才注册映射：
 * <ul>
 *   <li>mock（本地演示）profile：application-mock.yml 默认开启，
 *       由 MockCampusCertificationService 直接写 APPROVED 并联动 mock 校区</li>
 *   <li>生产（real profile）：默认关闭（application-real.yml），
 *       生产 API 面不再暴露该演示端点；本地 real 联调可通过
 *       {@code APP_CAMPUS_CERT_SIMULATE_ENABLED=true} 临时开启</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/campus")
@ConditionalOnProperty(
        name = "app.campus.certification-simulate-enabled",
        havingValue = "true",
        matchIfMissing = false)
public class DemoCertificationSimulateController {

    private final CampusCertificationService certService;

    public DemoCertificationSimulateController(CampusCertificationService certService) {
        this.certService = certService;
    }

    /**
     * 模拟校园认证直接通过（P3 演示接口，2026-08-09）。
     *
     * <p>与 submitCertification 同为登录后写操作（用户 ID 取自 JWT 上下文）。
     * 仅演示/联调环境注册（见类注释），生产环境不暴露。</p>
     */
    @PostMapping("/certification/simulate")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<CampusCertificationView>> simulateCertification() {
        Long userId = SecurityUtils.getCurrentUserId();
        CampusCertificationView cert = certService.simulateApprove(userId);
        return ResponseEntity.ok(ApiResponse.ok(cert));
    }
}
