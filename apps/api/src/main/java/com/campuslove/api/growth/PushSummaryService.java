package com.campuslove.api.growth;

import com.campuslove.api.entity.PushSummary;

/**
 * 推送摘要服务接口。
 * 提供推荐刷新通知生成和摘要发送状态标记功能。
 *
 * <p>S3-E（2026-10-31）：删除 {@code generateSocialDigest(Long)}。
 * 它在 main 与 test 中均无调用方（整个接口类型没有被任何 Controller/Service/
 * {@code @Scheduled} 注入，实测 grep 只命中声明与实现自身），而它是本仓最后一处
 * N+1 聚合：逐帖各发一次点赞 count 与【无界】评论列表加载，只为数 24 小时内的条数。
 * 优化死代码不如删掉死代码——实现侧的 N+1 与「不过滤软删除的 findByAuthorId 调用」
 * 随之消失。删除理由与复核命令见
 * {@link RealPushSummaryService} 类注释与 scripts/qa/data-layer-decisions-2026-10-31.md。</p>
 */
public interface PushSummaryService {

    /**
     * 为指定用户生成推荐刷新通知。
     * <p>
     * 基于用户的推荐偏好时间（从 recommendation_preferences 获取），
     * 在接近推荐刷新时间时生成通知，提示用户查看新的推荐人选。
     * 同一用户在同一自然日内只会生成一条 recommend_refresh 摘要，避免重复。
     *
     * @param userId 用户 ID
     * @return 生成的推送摘要
     */
    PushSummary generateRecommendRefresh(Long userId);

    /**
     * 标记指定摘要为已发送。
     *
     * @param summaryId 摘要 ID
     * @return 更新后的推送摘要
     */
    PushSummary markSent(Long summaryId);
}