package com.campuslove.api.campus;

import com.campuslove.api.village.PostSummaryView;
import com.campuslove.api.discover.ActivityView;
import java.util.List;

/**
 * 校园社交服务接口。
 * 提供校园话题、回复、同校帖子流和同校活动等功能。
 */
public interface CampusService {

    /**
     * 获取单个校园话题详情。
     *
     * @param topicId 话题 ID
     * @return 校园话题视图
     */
    CampusTopicView getCampusTopic(Long topicId);

    /**
     * 获取校园话题列表。
     * 按学校 ID 过滤，可按分类进一步筛选。
     *
     * @param schoolId 学校 ID
     * @param category 话题分类（可选，为 null 则不过滤）
     * @return 校园话题视图列表
     */
    List<CampusTopicView> getCampusTopics(Long schoolId, String category);

    /**
     * 创建新的校园话题。
     *
     * @param userId   发帖用户 ID
     * @param schoolId 学校 ID
     * @param category 话题分类
     * @param title    话题标题
     * @param content  话题内容
     * @return 创建的话题视图
     */
    CampusTopicView createCampusTopic(Long userId, Long schoolId, String category, String title, String content);

    /**
     * 回复校园话题。
     *
     * @param topicId 话题 ID
     * @param userId  回复者用户 ID
     * @param content 回复内容
     * @return 回复视图
     */
    CampusTopicReplyView replyCampusTopic(Long topicId, Long userId, String content);

    /**
     * 获取校园话题的回复列表。
     *
     * @param topicId 话题 ID
     * @return 回复视图列表
     */
    List<CampusTopicReplyView> getCampusTopicReplies(Long topicId);

    /**
     * 获取同校帖子流。
     *
     * @param schoolId 学校 ID
     * @param page     页码
     * @return 帖子摘要视图列表
     */
    List<PostSummaryView> getCampusPosts(Long schoolId, int page);

    /**
     * 获取同校活动列表。
     *
     * @param schoolId 学校 ID
     * @param page     页码
     * @return 活动视图列表
     */
    List<ActivityView> getCampusActivities(Long schoolId, int page);
}