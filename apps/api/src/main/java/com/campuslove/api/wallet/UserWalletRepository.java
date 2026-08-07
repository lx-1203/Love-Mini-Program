package com.campuslove.api.wallet;

import com.campuslove.api.entity.UserCampusProfile;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /**
     * 管理后台分页查询钱包（多条件筛选 + 校区数据隔离）。
     *
     * <p>钱包按用户归属校区隔离（商业模式：每个高校一个管理员）：
     * campusName 非空时通过 EXISTS 子查询联 {@code UserCampusProfile.campusName} 过滤，
     * 校区管理员仅可见本校区用户的钱包。</p>
     *
     * @param userId       用户 ID（可空）
     * @param balanceFrom  余额下限（分，可空）
     * @param balanceTo    余额上限（分，可空）
     * @param campusName   管辖校区名（可空，null/空表示不过滤）
     * @param pageable     分页参数
     * @return 分页钱包列表（按更新时间倒序）
     */
    @Query("""
            SELECT w FROM UserWallet w
            WHERE (:userId IS NULL OR w.userId = :userId)
              AND (:balanceFrom IS NULL OR w.balanceCents >= :balanceFrom)
              AND (:balanceTo IS NULL OR w.balanceCents <= :balanceTo)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = w.userId AND p.campusName = :campusName))
            ORDER BY w.updatedAt DESC
            """)
    Page<UserWallet> searchForAdmin(
            @Param("userId") Long userId,
            @Param("balanceFrom") Long balanceFrom,
            @Param("balanceTo") Long balanceTo,
            @Param("campusName") String campusName,
            Pageable pageable);
}
