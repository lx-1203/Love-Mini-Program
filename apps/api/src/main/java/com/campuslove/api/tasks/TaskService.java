package com.campuslove.api.tasks;

import java.util.List;

/**
 * 任务与积分服务接口（3-J 任务与积分）。
 *
 * <p>任务定义（奖励积分与前端 pages/profile/tasks.vue 对齐）：</p>
 * <ul>
 *   <li>{@code daily-checkin} 每日签到（连续签到天数）——+5 积分，每日可领</li>
 *   <li>{@code complete-profile} 完善个人资料（资料完善度）——+50 积分，一次性</li>
 *   <li>{@code first-post} 发布首条动态（发布动态数）——+20 积分，一次性</li>
 *   <li>{@code campus-verify} 完成校园认证（认证状态）——+100 积分，一次性</li>
 * </ul>
 *
 * <p>积分体系说明：本项目无独立「积分」概念，积分即「交友币钱包余额」——
 * 奖励通过 {@code walletService.recharge} 入账（1 积分 = 1 分），
 * 与签到奖励（P0-23）同一账本，流水 relatedType = TASK_REWARD。</p>
 */
public interface TaskService {

    /** 任务编码：每日签到 */
    String TASK_DAILY_CHECKIN = "daily-checkin";
    /** 任务编码：完善个人资料 */
    String TASK_COMPLETE_PROFILE = "complete-profile";
    /** 任务编码：发布首条动态 */
    String TASK_FIRST_POST = "first-post";
    /** 任务编码：完成校园认证 */
    String TASK_CAMPUS_VERIFY = "campus-verify";

    /** 每日签到任务单日奖励（积分，对齐前端 +5） */
    int REWARD_DAILY_CHECKIN = 5;
    /** 完善资料任务奖励（积分，对齐前端 +50） */
    int REWARD_COMPLETE_PROFILE = 50;
    /** 首条动态任务奖励（积分，对齐前端 +20） */
    int REWARD_FIRST_POST = 20;
    /** 校园认证任务奖励（积分，对齐前端 +100） */
    int REWARD_CAMPUS_VERIFY = 100;

    /**
     * 任务列表（含当前用户进度与领取状态）。
     *
     * @param userId 当前用户 ID
     * @return 任务视图列表
     */
    List<TaskView> listTasks(Long userId);

    /**
     * 任务进度聚合（各任务完成度 + 已领取/总奖励积分）。
     *
     * @param userId 当前用户 ID
     * @return 任务进度聚合视图
     */
    TaskProgressView getProgress(Long userId);

    /**
     * 领取任务奖励。
     *
     * <p>校验：任务编码存在 → 完成度达标 → 未领取（每日任务按当日、一次性任务终身一次）
     * → 奖励入「交友币钱包」（orderId=TASK-{code}-{userId}[-{yyyyMMdd}] 幂等）。</p>
     *
     * @param userId   当前用户 ID
     * @param taskCode 任务编码
     * @return 领取结果视图（含奖励积分与钱包余额）
     * @throws IllegalArgumentException 任务编码未知 / 未达标 / 已领取时抛出
     */
    ClaimResultView claim(Long userId, String taskCode);

    /**
     * 任务视图。
     *
     * @param code            任务编码
     * @param name            任务名称
     * @param description     任务描述
     * @param rewardPoints    奖励积分
     * @param progressCurrent 当前进度
     * @param progressTarget  目标进度
     * @param claimed         是否已领取（每日任务=今日已领；一次性任务=终身已领）
     * @param claimable       是否可领取（完成度达标且未领取）
     */
    record TaskView(
            String code,
            String name,
            String description,
            int rewardPoints,
            int progressCurrent,
            int progressTarget,
            boolean claimed,
            boolean claimable
    ) {
    }

    /**
     * 任务进度聚合视图。
     *
     * @param tasks              各任务视图列表（含进度与领取状态）
     * @param completedCount     已完成任务数（完成度达标的任务数）
     * @param claimedCount       已领取任务数
     * @param totalCount         任务总数
     * @param claimedRewardPoints 已领取奖励积分合计
     * @param totalRewardPoints  全部任务奖励积分合计
     * @param progressPercent    已领取积分占总奖励的百分比（0-100）
     */
    record TaskProgressView(
            List<TaskView> tasks,
            int completedCount,
            int claimedCount,
            int totalCount,
            int claimedRewardPoints,
            int totalRewardPoints,
            int progressPercent
    ) {
    }

    /**
     * 领取结果视图。
     *
     * @param taskCode    任务编码
     * @param rewardPoints 本次发放奖励积分
     * @param balanceAfter 发放后钱包余额（积分）
     */
    record ClaimResultView(
            String taskCode,
            int rewardPoints,
            long balanceAfter
    ) {
    }
}
