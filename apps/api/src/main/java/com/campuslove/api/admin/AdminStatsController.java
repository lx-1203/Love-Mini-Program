package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 数据统计控制器（任务 9）。
 * 提供用户、活跃度、匹配三类统计接口，以及后台首页「待办清单」社区总览接口。
 *
 * <p>接口列表：
 * <ul>
 *     <li>GET /api/admin/stats/users   - 用户统计（总数/新增/活跃/性别比/学校分布）</li>
 *     <li>GET /api/admin/stats/active  - 活跃度统计（DAU/MAU/互动数）</li>
 *     <li>GET /api/admin/stats/matches - 匹配统计（匹配总数/成功率/每日趋势）</li>
 *     <li>GET /api/v1/admin/stats/community-overview - 社区总览（帖子/媒体/举报/官方号待办计数与分布）</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（@EnableMethodSecurity 已在 SecurityConfig 启用）。</p>
 *
 * <p>R4-00393：校区隔离——校区管理员（ADMIN + campusName 非空）的统计仅覆盖其
 * 管辖校区（用户/活跃度/匹配按校区过滤），平台级经营数据不再对校区管理员开放；
 * 全局管理员（SUPER_ADMIN 或无校区 ADMIN）查看全平台统计。
 * 社区总览同理：帖子按作者所属校区过滤、用户按 user_campus_profile 校区过滤、
 * 媒体/举报沿用各自 Repository 既有的校区隔离子查询；
 * 唯一例外是官方账号（official_accounts 无校区列，平台级全局资源）恒为全平台计数。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/stats")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
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

    /**
     * 社区运营总览：后台首页「待办清单」的唯一数据源（只读聚合，单次请求返回）。
     *
     * <p>返回帖子（待审核/置顶/总数/分类分布/近 7 天趋势）、用户角色分布、
     * 未归属圈子的帖子数、停用官方号数、待审核媒体数与待处理举报数。</p>
     */
    @GetMapping("/community-overview")
    public ResponseEntity<CommunityOverviewView> getCommunityOverview() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(statsService.getCommunityOverview());
    }
}
