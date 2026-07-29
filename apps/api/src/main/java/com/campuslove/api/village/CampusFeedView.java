package com.campuslove.api.village;

import java.util.List;

/**
 * 同校动态流视图。
 *
 * @param campusName 校区名称
 * @param posts      同校最新帖子列表
 * @param activities 同校即将开始的活动列表
 * @param topics     同校兴趣圈最新话题列表
 */
public record CampusFeedView(
    String campusName,
    List<PostSummaryView> posts,
    List<CampusActivityView> activities,
    List<CampusTopicView> topics
) {}
