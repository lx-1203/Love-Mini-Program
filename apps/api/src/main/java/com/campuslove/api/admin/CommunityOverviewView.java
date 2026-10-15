package com.campuslove.api.admin;

import java.util.List;
import java.util.Map;

/**
 * 社区运营总览视图（管理后台首页「待办清单」+ 数字卡 + 图表，2026-10-06）。
 * 用于 {@code GET /api/v1/admin/stats/community-overview} 接口的<b>单次</b>聚合返回。
 *
 * <p>设计约束：一次请求返回首页所需全部计数，后端以 GROUP BY / CASE 聚合实现，
 * 不做「循环调用 count」的 N+1。任一数据源查询失败时该项降级为 0（不影响其他字段），
 * 前端据此隐藏对应待办行。</p>
 *
 * <p>校区口径：除 {@link #disabledOfficialAccountCount} 外，其余计数均按当前管理员
 * 管辖校区过滤（校区管理员只见本校区，全局管理员见全平台）；官方号为平台级全局资源
 * （official_accounts 表无校区列），恒为全平台计数。</p>
 *
 * @param pendingPostCount              待审核帖子数（posts.audit_status = pending）
 * @param pinnedPostCount               置顶帖子数（posts.is_pinned = true）
 * @param totalPostCount                帖子总数（含各状态，与后台帖子列表口径一致）
 * @param postsByCategory               帖子按分类分布（key 为 {@code PostCategory} 枚举名）
 * @param postsLast7Days                近 7 天（含今日）每日发帖数，缺失日期补 0，恒为 7 项
 * @param userCountsByRole              用户按角色分布（key 为 users.role 原值）
 * @param unassignedCirclePostCount     尚未归属圈子（owner_circle_path 为空）的帖子数
 * @param disabledOfficialAccountCount  已停用官方号数（official_accounts.enabled = 0，平台级）
 * @param pendingMediaCount             待审核媒体资产数（media_assets.audit_status = pending）
 * @param openReportCount               待处理举报数（reports.status = PENDING）
 */
public record CommunityOverviewView(
        long pendingPostCount,
        long pinnedPostCount,
        long totalPostCount,
        Map<String, Long> postsByCategory,
        List<DailyCount> postsLast7Days,
        Map<String, Long> userCountsByRole,
        long unassignedCirclePostCount,
        long disabledOfficialAccountCount,
        long pendingMediaCount,
        long openReportCount
) {

    /**
     * 每日计数项。
     *
     * @param date  日期字符串（yyyy-MM-dd）
     * @param count 当日发帖数
     */
    public record DailyCount(String date, long count) {
    }
}
