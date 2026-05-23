package com.campuslove.api.match;

import jakarta.validation.Valid;
import java.util.List;

/**
 * 匹配服务接口。
 * 提供匹配表单配置获取、创建匹配、快速匹配、查询匹配结果等功能。
 * Phase 2 新增：喜欢/心动信号/访客等社交功能。
 */
public interface MatchService {

    /**
     * 获取匹配表单配置。
     *
     * @return 匹配表单配置视图
     */
    MatchFormConfigView getFormConfig();

    /**
     * 创建匹配。
     *
     * @param request 匹配请求
     * @return 匹配结果视图
     */
    MatchResultView createMatch(MatchRequest request);

    /**
     * 快速匹配。
     *
     * @param request 快速匹配请求
     * @return 匹配结果视图
     */
    MatchResultView createQuickMatch(QuickMatchRequest request);

    /**
     * 获取匹配详情。
     *
     * @param id 匹配 ID
     * @return 匹配结果视图
     */
    MatchResultView getMatch(String id);

    /**
     * 设置下一次匹配的强制排队状态。
     *
     * @param forceQueued 是否强制排队
     */
    void setForceQueued(boolean forceQueued);

    /**
     * 设置下一次匹配的排队状态。
     *
     * @param queueStatus 排队状态值（queued/connected/expired）
     */
    void setNextQueueStatus(String queueStatus);

    // ---- Phase 2 新增：社交功能 ----

    /**
     * 喜欢用户。如果双方互相喜欢，则创建心动信号。
     *
     * @param userId       当前用户 ID
     * @param targetUserId 目标用户 ID
     * @return 心动信号视图（如果互相喜欢），否则返回 null
     */
    HeartSignalView likeUser(Long userId, Long targetUserId);

    /**
     * 取消喜欢。
     *
     * @param userId       当前用户 ID
     * @param targetUserId 目标用户 ID
     */
    void cancelLike(Long userId, Long targetUserId);

    /**
     * 获取喜欢我的用户列表。
     *
     * @param userId 当前用户 ID
     * @return 喜欢我的用户视图列表
     */
    List<LikedUserView> getLikedMe(Long userId);

    /**
     * 获取访客列表。
     *
     * @param userId 当前用户 ID
     * @return 访客视图列表
     */
    List<VisitorView> getVisitors(Long userId);

    /**
     * 记录访客（同一访客对同一用户每天只记录一次）。
     *
     * @param visitorId     访客用户 ID
     * @param visitedUserId 被访用户 ID
     */
    void recordVisit(Long visitorId, Long visitedUserId);

    /**
     * 获取待处理的心动信号列表。
     *
     * @param userId 当前用户 ID
     * @return 心动信号视图列表
     */
    List<HeartSignalView> getHeartSignals(Long userId);

    /**
     * 接受心动信号。
     *
     * @param signalId 心动信号 ID
     * @param userId   当前用户 ID（用于验证）
     */
    void acceptHeartSignal(Long signalId, Long userId);

    /**
     * 拒绝心动信号。
     *
     * @param signalId 心动信号 ID
     * @param userId   当前用户 ID（用于验证）
     */
    void declineHeartSignal(Long signalId, Long userId);
}
