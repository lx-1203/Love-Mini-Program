package com.campuslove.api.wallet;

import java.util.Collection;
import java.util.Set;

/**
 * 商业化解锁服务接口（P0-17 商业化解锁链路）。
 *
 * <p>提供"喜欢我列表 / 访客列表"等内容的付费解锁能力：</p>
 * <ul>
 *   <li>已解锁直接放行（不扣费）</li>
 *   <li>未解锁则调用 {@link WalletService#deduct} 扣费并记录解锁（幂等：orderId 唯一索引 +
 *       uk_user_target 唯一约束双保险）</li>
 *   <li>供匹配列表（liked-me / visitors）查询各条目的 unlocked 状态</li>
 * </ul>
 *
 * <p>双 profile 可用：real 走 {@link RealWalletUnlockService}（数据库持久化），
 * mock 走 {@link MockWalletUnlockService}（内存，本地演示）。</p>
 */
public interface WalletUnlockService {

    /**
     * 执行解锁：已解锁直接返回（不扣费）；未解锁扣费并记录。
     *
     * @param userId     当前用户 ID
     * @param targetType 解锁目标类型（LIKED_ME / VISITOR，白名单校验）
     * @param targetId   解锁目标 ID（对方用户 ID）
     * @return 解锁结果视图（unlocked=true 恒成立；balance 为扣费后余额）
     * @throws IllegalArgumentException targetType 不在白名单 / 参数非法时抛出
     * @throws com.campuslove.api.wallet.InsufficientBalanceException 余额不足时抛出
     */
    WalletUnlockView unlock(Long userId, String targetType, Long targetId);

    /**
     * 批量查询用户对指定目标类型下多个目标 ID 的解锁状态。
     *
     * @param userId     当前用户 ID
     * @param targetType 解锁目标类型（LIKED_ME / VISITOR）
     * @param targetIds  目标 ID 集合（对方用户 ID）
     * @return 已解锁的目标 ID 集合
     */
    Set<Long> findUnlockedTargetIds(Long userId, String targetType, Collection<Long> targetIds);
}
