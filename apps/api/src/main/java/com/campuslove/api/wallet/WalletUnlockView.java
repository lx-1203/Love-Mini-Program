package com.campuslove.api.wallet;

/**
 * 商业化解锁结果视图（P0-17）。
 *
 * <p>契约：{@code {unlocked: true, balance: 余额}}——解锁成功后恒为 true；
 * 客户端依据该契约更新本地解锁状态（无需关心是否本次扣费还是已解锁放行）。</p>
 *
 * @param unlocked 是否已解锁（本次操作后恒为 true）
 * @param balance  当前钱包余额（分）
 */
public record WalletUnlockView(
        boolean unlocked,
        Long balance
) {
}
