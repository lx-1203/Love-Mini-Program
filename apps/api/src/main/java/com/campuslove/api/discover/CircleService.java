package com.campuslove.api.discover;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 兴趣圈服务接口。
 * 提供圈子列表、加入/退出、话题浏览与发布、回复浏览与发布等功能。
 */
public interface CircleService {

    /**
     * 获取所有兴趣圈列表，包含当前用户加入状态。
     *
     * @param userId 当前用户 ID（用于判断加入状态），可为 null
     * @return 圈子视图列表
     */
    List<CircleView> getCircles(Long userId);

    /**
     * 加入圈子。
     *
     * @param userId   用户 ID
     * @param circleId 圈子 ID
     * @return 圈子成员关系视图
     */
    CircleMembershipView joinCircle(Long userId, Long circleId);

    /**
     * 退出圈子。
     *
     * @param userId   用户 ID
     * @param circleId 圈子 ID
     * @return 圈子成员关系视图
     */
    CircleMembershipView leaveCircle(Long userId, Long circleId);

    /**
     * 获取指定圈子的话题列表（分页）。
     *
     * @param circleId 圈子 ID
     * @param pageable 分页参数
     * @return 话题视图分页列表
     */
    Page<CircleTopicView> getTopics(Long circleId, Pageable pageable);

    /**
     * 在指定圈子发布新话题。
     *
     * @param circleId 圈子 ID
     * @param authorId 作者用户 ID
     * @param title    话题标题
     * @param content  话题内容
     * @param images   图片 URL 列表
     * @return 话题视图
     */
    CircleTopicView createTopic(Long circleId, Long authorId, String title, String content, List<String> images);

    /**
     * 获取话题详情（含作者信息）。
     *
     * @param topicId 话题 ID
     * @return 话题视图
     */
    CircleTopicView getTopicDetail(Long topicId);

    /**
     * 回复话题。
     *
     * @param topicId  话题 ID
     * @param authorId 回复者用户 ID
     * @param content  回复内容
     * @return 回复视图
     */
    CircleReplyView replyToTopic(Long topicId, Long authorId, String content);

    /**
     * 获取指定话题的回复列表（分页）。
     *
     * @param topicId  话题 ID
     * @param pageable 分页参数
     * @return 回复视图分页列表
     */
    Page<CircleReplyView> getReplies(Long topicId, Pageable pageable);

    /**
     * 获取所有圈子的精选话题（用于村口"兴趣"分类）。
     *
     * @param pageable 分页参数
     * @return 话题视图分页列表
     */
    Page<CircleTopicView> getFeaturedTopics(Pageable pageable);
}
