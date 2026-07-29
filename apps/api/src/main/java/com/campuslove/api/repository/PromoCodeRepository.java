package com.campuslove.api.repository;

import com.campuslove.api.entity.PromoCode;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * VIP 优惠码 Repository。
 * <p>提供优惠码的持久化与查询能力，支持按优惠码字符串查询。</p>
 *
 * <p>Task 12.4（REAUDIT-REPORT-100+ 编号 41）：并发安全基础设施。</p>
 * <ul>
 *   <li>{@link #findByCodeForUpdate(String)}：悲观锁查询，兑换优惠码时使用 SELECT ... FOR UPDATE
 *       防止并发读取到过期状态</li>
 *   <li>{@link #decrementRemaining(String)}：原子扣减剩余使用次数，
 *       通过 WHERE remaining_uses > 0 保证不超发</li>
 *   <li>{@link #incrementUsedCount(Long)}：累加已使用次数（统计展示用），
 *       与 decrementRemaining 在同一事务内调用</li>
 * </ul>
 */
public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {

    /**
     * 按优惠码字符串查询（大小写敏感，调用前需统一转为大写）。
     *
     * @param code 优惠码字符串
     * @return 优惠码实体（可选）
     */
    Optional<PromoCode> findByCode(String code);

    /**
     * 悲观锁查询优惠码（SELECT ... FOR UPDATE）。
     *
     * <p>Task 12.4：兑换优惠码时调用本方法，确保读取到的优惠码状态、剩余次数等字段
     * 在事务内被加锁，其他并发事务必须等待当前事务提交后才能读取。</p>
     *
     * <p>使用场景：兑换优惠码流程的第一步，先锁住优惠码行再校验状态、计算折扣、原子扣减。</p>
     *
     * @param code 优惠码字符串（已规范化为大写）
     * @return 优惠码实体（可选，已加 X 锁）
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PromoCode p WHERE p.code = :code")
    Optional<PromoCode> findByCodeForUpdate(@Param("code") String code);

    /**
     * 原子扣减优惠码剩余使用次数。
     *
     * <p>Task 12.4：通过单条 UPDATE 语句原子完成"剩余校验 + 扣减"，避免并发场景下
     * 多个事务同时读到 remaining_uses > 0 然后都扣减成功导致超发。</p>
     *
     * <p>SQL 语义：</p>
     * <pre>
     * UPDATE promo_codes
     * SET remaining_uses = remaining_uses - 1,
     *     updated_at     = CURRENT_TIMESTAMP
     * WHERE code = :code
     *   AND remaining_uses > 0
     * </pre>
     *
     * <p>影响行数语义：</p>
     * <ul>
     *   <li>1：扣减成功，优惠码仍有剩余</li>
     *   <li>0：扣减失败（优惠码不存在 / 剩余次数为 0）</li>
     * </ul>
     *
     * <p>注意：max_uses = 0（不限次数）的优惠码在 Flyway 迁移时 remaining_uses 被设为 2147483647，
     * 因此 WHERE remaining_uses > 0 条件始终成立，不会阻断兑换。</p>
     *
     * @param code 优惠码字符串（已规范化为大写）
     * @return 影响行数（0 表示扣减失败，1 表示成功）
     */
    @Modifying
    @Query("UPDATE PromoCode p SET p.remainingUses = p.remainingUses - 1, "
            + "p.updatedAt = CURRENT_TIMESTAMP "
            + "WHERE p.code = :code "
            + "AND p.remainingUses > 0")
    int decrementRemaining(@Param("code") String code);

    /**
     * 累加优惠码已使用次数（统计展示用）。
     *
     * <p>Task 12.4：与 {@link #decrementRemaining(String)} 在同一事务内调用，
     * 用于维护 used_count 字段的统计准确性。remaining_uses 用于并发控制，
     * used_count 用于管理员查看优惠码使用情况。</p>
     *
     * @param id 优惠码 ID
     * @return 影响行数（0 表示优惠码不存在，1 表示成功）
     */
    @Modifying
    @Query("UPDATE PromoCode p SET p.usedCount = p.usedCount + 1, "
            + "p.updatedAt = CURRENT_TIMESTAMP WHERE p.id = :id")
    int incrementUsedCount(@Param("id") Long id);
}
