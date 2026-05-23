package com.campuslove.api.profile;

import com.campuslove.api.user.FollowUserView;
import com.campuslove.api.user.FollowView;
import java.util.List;

/**
 * 个人资料服务接口。
 * 提供基本资料、校园资料、课表资料的获取与保存功能，以及关注关系管理。
 */
public interface ProfileService {

    /**
     * 获取基本资料。
     *
     * @return 基本资料视图
     */
    BasicProfileView getBasicProfile();

    /**
     * 保存基本资料。
     *
     * @param request 基本资料请求
     * @return 基本资料视图
     */
    BasicProfileView saveBasicProfile(BasicProfileRequest request);

    /**
     * 获取校园资料。
     *
     * @return 校园资料视图
     */
    CampusProfileView getCampusProfile();

    /**
     * 保存校园资料。
     *
     * @param request 校园资料请求
     * @return 校园资料视图
     */
    CampusProfileView saveCampusProfile(CampusProfileRequest request);

    /**
     * 获取课表资料。
     *
     * @return 课表资料视图
     */
    ScheduleProfileView getScheduleProfile();

    /**
     * 保存课表资料。
     *
     * @param request 课表资料请求
     * @return 课表资料视图
     */
    ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request);

    /**
     * 获取用户统计数据（关注数、粉丝数、获赞数）。
     *
     * @return 用户统计数据视图
     */
    ProfileStatsView getProfileStats();

    // ---- 关注关系管理 ----

    /**
     * 关注用户。
     * 创建关注关系，更新双方的 followingCount/followersCount，并触发通知。
     *
     * @param userId       当前用户 ID（关注者）
     * @param targetUserId 目标用户 ID（被关注者）
     * @return 关注操作结果视图
     * @throws IllegalArgumentException 如果参数无效或重复关注
     */
    FollowView followUser(Long userId, Long targetUserId);

    /**
     * 取消关注用户。
     * 删除关注关系，更新双方的 followingCount/followersCount。
     *
     * @param userId       当前用户 ID（关注者）
     * @param targetUserId 目标用户 ID（被关注者）
     * @return 取关操作结果视图
     * @throws IllegalArgumentException 如果参数无效或未关注
     */
    FollowView unfollowUser(Long userId, Long targetUserId);

    /**
     * 获取指定用户的粉丝列表。
     *
     * @param userId 用户 ID
     * @return 粉丝用户视图列表
     */
    List<FollowUserView> getFollowers(Long userId);

    /**
     * 获取指定用户的关注列表。
     *
     * @param userId 用户 ID
     * @return 关注用户视图列表
     */
    List<FollowUserView> getFollowing(Long userId);

    /**
     * 查询当前用户是否关注了目标用户。
     *
     * @param userId       当前用户 ID
     * @param targetUserId 目标用户 ID
     * @return 是否已关注
     */
    boolean isFollowing(Long userId, Long targetUserId);
}
