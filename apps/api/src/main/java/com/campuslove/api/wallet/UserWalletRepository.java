package com.campuslove.api.wallet;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 用户钱包 Repository。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：钱包账户持久化与查询。</p>
 *
 * <p>关键方法：</p>
 * <ul>
 *   <li>{@link #findByUserIdForUpdate}：悲观锁查询，deduct / recharge 操作必须使用本方法
 *       锁住钱包行，防止并发更新导致余额错乱</li>
 *   <li>{@link #findByUserId}：普通查询，getBalance 等只读场景使用</li>
 * </ul>
 */
public interface UserWalletRepository extends JpaRepository<UserWallet, Long> {

    /**
     * 悲观锁查询钱包（SELECT ... FOR UPDATE）。
     *
     * <p>Task 2 / 15：deduct / recharge 操作必须使用本方法，
     * 确保同一用户同时只有一个事务能修改余额。</p>
     *
     * <p>使用场景：</p>
     * <ul>
     *   <li>WalletService.deduct：扣减余额前先锁住钱包行</li>
     *   <li>WalletService.recharge：充值前先锁住钱包行</li>
     * </ul>
     *
     * @param userId 用户 ID
     * @return 钱包实体（可选，已加 X 锁）
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM UserWallet w WHERE w.userId = :userId")
    Optional<UserWallet> findByUserIdForUpdate(@Param("userId") Long userId);

    /**
     * 普通查询钱包（无锁）。
     *
     * <p>用于只读场景，如 getBalance 查询余额。避免悲观锁的开销。</p>
     *
     * @param userId 用户 ID
     * @return 钱包实体（可选）
     */
    Optional<UserWallet> findByUserId(Long userId);
}
