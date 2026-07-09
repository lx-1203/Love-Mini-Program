package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 匹配算法与推荐策略配置控制器（任务 10）。
 *
 * <p>接口列表：
 * <ul>
 *     <li>GET /api/admin/match-config       - 匹配算法配置查询</li>
 *     <li>PUT /api/admin/match-config       - 匹配算法配置更新</li>
 *     <li>GET /api/admin/recommend-strategy - 推荐策略查询</li>
 *     <li>PUT /api/admin/recommend-strategy - 推荐策略更新</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin")
public class AdminMatchConfigController {

    private final AdminMatchConfigService matchConfigService;

    public AdminMatchConfigController(AdminMatchConfigService matchConfigService) {
        this.matchConfigService = matchConfigService;
    }

    /**
     * 查询匹配算法配置。
     */
    @GetMapping("/match-config")
    public ResponseEntity<MatchConfigView> getMatchConfig() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(matchConfigService.getMatchConfig());
    }

    /**
     * 更新匹配算法配置。
     * 请求体为 {@code { "values": { "campusWeight": "60", ... } }}，
     * 仅更新 values 中包含的 key。
     */
    @PutMapping("/match-config")
    public ResponseEntity<MatchConfigView> updateMatchConfig(
            @Valid @RequestBody UpdateKeyValueRequest req) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(matchConfigService.updateMatchConfig(req.values(), operatorId));
    }

    /**
     * 查询推荐策略配置。
     */
    @GetMapping("/recommend-strategy")
    public ResponseEntity<RecommendStrategyView> getRecommendStrategy() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(matchConfigService.getRecommendStrategy());
    }

    /**
     * 更新推荐策略配置。
     */
    @PutMapping("/recommend-strategy")
    public ResponseEntity<RecommendStrategyView> updateRecommendStrategy(
            @Valid @RequestBody UpdateKeyValueRequest req) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(matchConfigService.updateRecommendStrategy(req.values(), operatorId));
    }
}

/**
 * 通用 key/value 更新请求体。
 * 用于匹配算法配置和推荐策略配置的更新接口。
 */
record UpdateKeyValueRequest(
        @NotNull Map<String, String> values
) {}
