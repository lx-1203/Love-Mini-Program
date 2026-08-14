package com.campuslove.api.invite;

import java.util.List;

/**
 * 邀请奖励服务接口（3-K 邀请奖励）。
 *
 * <p>奖励发放语义：accept（绑定邀请关系）时即发放奖励给邀请人（最简单可靠）；
 * 可改为「被邀请人完成注册后发」——届时在 accept 后增加注册完成事件触发发放
 * （invite_reward.status 已预留 PENDING/GRANTED/FAILED）。</p>
 *
 * <p>积分即「交友币钱包余额」：奖励通过 walletService.recharge 入账
 * （1 积分 = 1 分），流水 relatedType = INVITE_REWARD。</p>
 */
public interface InviteService {

    /** 邀请奖励积分（邀请一个好友并绑定） */
    int INVITE_REWARD_POINTS = 100;

    /**
     * 生成/返回我的邀请码（幂等：已存在则直接返回）。
     *
     * @param userId 当前用户 ID
     * @return 邀请码视图
     */
    InviteCodeView getOrCreateInviteCode(Long userId);

    /**
     * 查询我的邀请码（不生成；未创建返回 code=null）。
     *
     * @param userId 当前用户 ID
     * @return 邀请码视图
     */
    InviteCodeView getMyInviteCode(Long userId);

    /**
     * 绑定邀请关系并发放奖励（幂等）。
     *
     * <p>校验：邀请码存在 → 不能邀请自己 → 一个用户只能被绑定一次。
     * 通过后创建 invite_reward 记录并发放奖励入邀请人钱包
     * （orderId=INVITE-{inviteeUserId}，被邀请人唯一约束天然幂等）。</p>
     *
     * @param userId 当前用户 ID（被邀请人）
     * @param code   邀请码
     * @return 绑定结果视图（含邀请人信息与奖励）
     * @throws IllegalArgumentException 邀请码不存在 / 邀请自己 / 已绑定过时抛出
     */
    AcceptResultView acceptInvite(Long userId, String code);

    /**
     * 我的奖励记录列表（作为邀请人，按发放时间倒序，含被邀请人昵称）。
     *
     * @param userId 当前用户 ID
     * @return 奖励记录视图列表
     */
    List<RewardView> listMyRewards(Long userId);

    /**
     * 邀请码视图。
     *
     * @param code 邀请码（未创建时为 null）
     * @param inviteUrl 邀请链接（占位：前端可按 code 自行拼接分享文案）
     */
    record InviteCodeView(String code, String inviteUrl) {
    }

    /**
     * 绑定结果视图。
     *
     * @param inviterUserId 邀请人用户 ID
     * @param inviterName   邀请人昵称
     * @param rewardPoints  发放给邀请人的奖励积分
     * @param balanceAfter  邀请人钱包余额（邀请人侧；当前用户可忽略）
     * @param alreadyBound  本次是否已绑定过（幂等命中标记）
     */
    record AcceptResultView(Long inviterUserId, String inviterName, int rewardPoints,
                            long balanceAfter, boolean alreadyBound) {
    }

    /**
     * 奖励记录视图。
     *
     * @param id             记录 ID
     * @param inviteeUserId  被邀请人用户 ID
     * @param inviteeName    被邀请人昵称
     * @param rewardPoints   奖励积分
     * @param status         状态（GRANTED 已发放）
     * @param createdAt      发放时间（ISO 字符串）
     */
    record RewardView(Long id, Long inviteeUserId, String inviteeName, int rewardPoints,
                      String status, String createdAt) {
    }
}
