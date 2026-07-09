package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 数据统计控制器（任务 9）。
 * 提供用户、活跃度、匹配三类统计接口。
 *
 * <p>接口列表：
 * <ul>
 *     <li>GET /api/admin/stats/users   - 用户统计（总数/新增/活跃/性别比/学校分布）</li>
 *     <li>GET /api/admin/stats/active  - 活跃度统计（DAU/MAU/互动数）</li>
 *     <li>GET /api/admin/stats/matches - 匹配统计（匹配总数/成功率/每日趋势）</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin/stats")
public class AdminStatsController {

    private final AdminStatsService statsService;

    public AdminStatsController(AdminStatsService statsService) {
        this.statsService = statsService;
    }

    /**
     * 用户统计：总数/新增/活跃/性别比/学校分布。
     */
    @GetMapping("/users")
    public ResponseEntity<UserStatsView> getUserStats() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(statsService.getUserStats());
    }

    /**
     * 活跃度统计：DAU/MAU/互动数。
     */
    @GetMapping("/active")
    public ResponseEntity<ActiveStatsView> getActiveStats() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(statsService.getActiveStats());
    }

    /**
     * 匹配统计：匹配总数/成功率/每日趋势。
     */
    @GetMapping("/matches")
    public ResponseEntity<MatchStatsView> getMatchStats() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(statsService.getMatchStats());
    }
}
