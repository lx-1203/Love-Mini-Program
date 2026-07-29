package com.campuslove.api.wallet;

/**
 * 钱包服务接口。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：提供用户钱包账户的真实扣减/充值能力。</p>
 *
 * <p>核心保障：</p>
 * <ul>
 *   <li>幂等：通过 orderId 唯一索引 + 服务层先查后写，保证同一业务请求不会被重复处理</li>
 *   <li>悲观锁：deduct / recharge 通过 {@code findByUserIdForUpdate} 锁住钱包行，
 *       防止并发更新导致余额错乱</li>
 *   <li>事务：所有写操作在 {@code @Transactional} 内，扣减/充值与流水写入原子提交</li>
 *   <li>审计：每次扣减/充值写入 wallet_transaction_log 流水，记录 balanceAfter 便于追溯</li>
 * </ul>
 *
 * <p>调用方约定：</p>
 * <ul>
 *   <li>VIP 自动续费（AutoRenewService.renewVip）：调用 {@link #deduct} 扣减月费，
 *       余额不足时由调用方捕获 {@link InsufficientBalanceException} 处理（写 FAILED 流水 + 推送通知）</li>
 *   <li>红包发送（VipRedPacketService.createRedPacket）：调用 {@link #deduct} 扣减发送方余额，
 *       余额不足时直接抛出异常，事务回滚，红包创建失败</li>
 *   <li>红包领取（VipRedPacketService.claimRedPacket）：调用 {@link #recharge} 充值到领取者钱包</li>
 * </ul>
 */
public interface WalletService {

    /**
     * 扣减用户钱包余额。
     *
     * <p>幂等：同一 orderId 重复调用直接返回已处理结果，不重复扣减。</p>
     *
     * <p>事务：扣减余额 + 写入 wallet_transaction_log 流水原子提交。</p>
     *
     * @param userId       用户 ID
     * @param amountCents  扣减金额（分，必须 > 0）
     * @param orderId      业务订单号（幂等键，全局唯一）
     * @param relatedType  关联业务类型（如 VIP_RENEW / RED_PACKET_SEND）
     * @param relatedId    关联业务实体 ID（如 renewalId / redPacketId，可空）
     * @return 扣减后余额（分）
     * @throws InsufficientBalanceException 余额不足时抛出
     * @throws IllegalArgumentException amountCents <= 0 或 userId 为空时抛出
     */
    Long deduct(Long userId, Long amountCents, String orderId, String relatedType, String relatedId);

    /**
     * 充值用户钱包余额。
     *
     * <p>幂等：同一 orderId 重复调用直接返回已处理结果，不重复充值。</p>
     *
     * <p>事务：充值余额 + 写入 wallet_transaction_log 流水原子提交。</p>
     *
     * @param userId       用户 ID
     * @param amountCents  充值金额（分，必须 > 0）
     * @param orderId      业务订单号（幂等键，全局唯一）
     * @param relatedType  关联业务类型（如 RED_PACKET_CLAIM / RED_PACKET_REFUND）
     * @param relatedId    关联业务实体 ID（如 redPacketId，可空）
     * @return 充值后余额（分）
     * @throws IllegalArgumentException amountCents <= 0 或 userId 为空时抛出
     */
    Long recharge(Long userId, Long amountCents, String orderId, String relatedType, String relatedId);

    /**
     * 查询用户钱包余额。
     *
     * <p>钱包不存在时返回 0（不自动创建，避免读操作产生副作用）。</p>
     *
     * @param userId 用户 ID
     * @return 余额（分），不存在则返回 0
     */
    Long getBalance(Long userId);
}
