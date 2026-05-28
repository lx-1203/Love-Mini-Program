package com.campuslove.api.growth;

import com.campuslove.api.entity.PushSummary;

/**
 * 推送摘要服务接口。
 * 提供社交动态摘要生成、推荐刷新通知生成和摘要发送状态标记功能。
 */
public interface PushSummaryService {

    /**
     * 为指定用户生成社交动态摘要。
     * <p>
     * 汇总最近 24 小时内的访客记录、喜欢记录和帖子互动（点赞/评论），
     * 生成一段简洁的社交动态摘要文案，存储到 push_summaries 表。
     * 同一用户在同一自然日内只会生成一条 social_digest 摘要，避免重复。
     *
     * @param userId 用户 ID
     * @return 生成的推送摘要
     */
    PushSummary generateSocialDigest(Long userId);

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