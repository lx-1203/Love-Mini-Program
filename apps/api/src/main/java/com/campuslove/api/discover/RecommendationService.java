package com.campuslove.api.discover;

import java.util.List;

/**
 * 推荐服务接口。
 * 提供讨论推荐、活动推荐、活动报名、活动详情、推荐偏好等功能。
 * 同时提供人物推荐功能（Phase 2 新增）。
 */
public interface RecommendationService {

    /**
     * 获取讨论推荐列表。
     *
     * @return 讨论推荐视图列表
     */
    List<DiscussionRecommendationView> getDiscussions();

    /**
     * 获取活动推荐列表。
     *
     * @return 活动推荐视图列表
     */
    List<ActivityRecommendationView> getActivities();

    /**
     * 活动报名或取消报名。
     *
     * @param activityId 活动 ID
     * @param enrolled   是否报名
     * @param userId     当前用户 ID
     * @return 报名操作结果视图
     */
    ActivityEnrollmentView enrollActivity(String activityId, boolean enrolled, Long userId);

    /**
     * 获取单个活动详情。
     *
     * @param activityId 活动 ID
     * @param userId     当前用户 ID（可选，用于判断是否已报名）
     * @return 活动详情视图
     */
    ActivityDetailView getActivityDetail(String activityId, Long userId);

    /**
     * 获取推荐偏好设置。
     *
     * @return 推荐偏好视图
     */
    RecommendationPreferencesView getPreferences();

    /**
     * 更新推荐偏好设置。
     *
     * @param prefs 推荐偏好视图
     * @return 更新后的推荐偏好视图
     */
    RecommendationPreferencesView updatePreferences(RecommendationPreferencesView prefs);

    // ---- Phase 2 新增：人物推荐 ----

    /**
     * 获取推荐人物列表。
     * 根据用户偏好、校区、城市、兴趣标签等加权排序，排除已喜欢/已跳过的用户。
     *
     * @param userId 当前用户 ID
     * @return 推荐人物视图列表
     */
    List<RecommendedPersonView> getRecommendations(Long userId);

    /**
     * 获取指定用户的推荐偏好设置。
     *
     * @param userId 用户 ID
     * @return 推荐偏好视图
     */
    RecommendationPreferencesView getPreferences(Long userId);

    /**
     * 保存/更新指定用户的推荐偏好设置。
     *
     * @param userId           用户 ID
     * @param preferredTime    推荐时间偏好
     * @param scope            推荐范围
     * @return 更新后的推荐偏好视图
     */
    RecommendationPreferencesView savePreferences(Long userId, String preferredTime, String scope);

    /**
     * 获取今日已查看的推荐历史。
     *
     * @param userId 用户 ID
     * @return 已查看的推荐人物列表
     */
    List<RecommendedPersonView> getHistory(Long userId);
}
