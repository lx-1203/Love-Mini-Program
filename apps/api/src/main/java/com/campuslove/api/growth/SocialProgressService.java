package com.campuslove.api.growth;

/**
 * 社交升温漏斗服务接口。
 * 提供查询社交进度和记录各类社交行为的功能。
 */
public interface SocialProgressService {

    /**
     * 查询用户的社交升温进度。
     *
     * @param userId 用户 ID
     * @return 社交进度视图
     */
    SocialProgressView getProgress(Long userId);

    /**
     * 记录一次曝光事件（被推荐展示给他人）。
     *
     * @param userId 用户 ID
     */
    void recordExposure(Long userId);

    /**
     * 记录一次喜欢/点赞事件。
     *
     * @param userId 用户 ID
     */
    void recordLike(Long userId);

    /**
     * 记录一次匹配事件。
     *
     * @param userId 用户 ID
     */
    void recordMatch(Long userId);

    /**
     * 记录一次聊天事件。
     *
     * @param userId 用户 ID
     */
    void recordChat(Long userId);

    /**
     * 记录一次社区互动事件（发帖/评论/加入圈子等）。
     *
     * @param userId 用户 ID
     */
    void recordCircleActivity(Long userId);

    /**
     * 记录一次活动参与事件。
     *
     * @param userId 用户 ID
     */
    void recordActivityParticipation(Long userId);
}