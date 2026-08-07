package com.campuslove.api.repository;

import com.campuslove.api.entity.VipRedPacket;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * VIP 红包 Repository。
 * <p>提供红包记录的持久化与查询能力，支持按发送者、聊天会话查询。</p>
 *
 * <p>Task 12.3（REAUDIT-REPORT-100+ 编号 40）：并发安全基础设施。</p>
 * <ul>
 *   <li>{@link #findByIdForUpdate(Long)}：悲观锁查询，领取红包时使用 SELECT ... FOR UPDATE
 *       防止并发读取到过期状态</li>
 *   <li>{@link #decrementRemaining(Long, int, int)}：原子扣减剩余金额与份数，
 *       通过 WHERE remaining_amount >= :amount AND remaining_count > 0 保证不超发</li>
 * </ul>
 */
public interface VipRedPacketRepository extends JpaRepository<VipRedPacket, Long> {

    /**
     * 按发送者用户 ID 查询红包列表，按创建时间倒序。
     *
     * @param senderId 发送者用户 ID
     * @return 红包列表
     */
    List<VipRedPacket> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    /**
     * 按聊天会话 ID 查询红包列表，按创建时间倒序。
     * <p>用于"聊天红包"场景，按会话展示历史红包。</p>
     *
     * @param chatId 聊天会话 ID
     * @return 红包列表
     */
    List<VipRedPacket> findByChatIdOrderByCreatedAtDesc(String chatId);

    /**
     * 悲观锁查询红包（SELECT ... FOR UPDATE）。
     *
     * <p>Task 12.3：领取红包时调用本方法，确保读取到的红包状态、剩余金额等字段
     * 在事务内被加锁，其他并发事务必须等待当前事务提交后才能读取。</p>
     *
     * <p>使用场景：领取红包流程的第一步，先锁住红包行再校验状态、计算金额、原子扣减。</p>
     *
     * @param id 红包 ID
     * @return 红包实体（可选，已加 X 锁）
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM VipRedPacket p WHERE p.id = :id")
    Optional<VipRedPacket> findByIdForUpdate(@Param("id") Long id);

    /**
     * 原子扣减红包剩余金额与份数。
     *
     * <p>Task 12.3：通过单条 UPDATE 语句原子完成"剩余校验 + 扣减"，避免并发场景下
     * 多个事务同时读到 remaining_amount >= amount 然后都扣减成功导致超发。</p>
     *
     * <p>SQL 语义：</p>
     * <pre>
     * UPDATE vip_red_packets
     * SET remaining_amount = remaining_amount - :amount,
     *     remaining_count  = remaining_count - 1,
     *     claimed_amount   = claimed_amount + :amount,
     *     claimed_count    = claimed_count + 1,
     *     updated_at       = CURRENT_TIMESTAMP
     * WHERE id = :id
     *   AND remaining_amount >= :amount
     *   AND remaining_count > 0
     * </pre>
     *
     * <p>影响行数语义：</p>
     * <ul>
     *   <li>1：扣减成功，红包仍有剩余</li>
     *   <li>0：扣减失败（红包不存在 / 剩余金额不足 / 剩余份数为 0）</li>
     * </ul>
     *
     * @param id     红包 ID
     * @param amount 本次领取金额（分）
     * @return 影响行数（0 表示扣减失败，1 表示成功）
     */
    @Modifying
    @Query("UPDATE VipRedPacket p SET p.remainingAmount = p.remainingAmount - :amount, "
            + "p.remainingCount = p.remainingCount - 1, "
            + "p.claimedAmount = p.claimedAmount + :amount, "
            + "p.claimedCount = p.claimedCount + 1, "
            + "p.updatedAt = CURRENT_TIMESTAMP "
            + "WHERE p.id = :id "
            + "AND p.remainingAmount >= :amount "
            + "AND p.remainingCount > 0")
    int decrementRemaining(@Param("id") Long id, @Param("amount") int amount);

    /**
     * 将红包状态置为已领完（DEPLETED）。
     *
     * <p>Task 12.3：原子扣减后，若剩余份数为 0，调用本方法更新状态。
     * 通过 WHERE remaining_count = 0 避免误更新仍有剩余的红包。</p>
     *
     * @param id 红包 ID
     * @return 影响行数（0 表示仍有剩余，无需更新状态）
     */
    @Modifying
    @Query("UPDATE VipRedPacket p SET p.status = 'DEPLETED', p.updatedAt = CURRENT_TIMESTAMP "
            + "WHERE p.id = :id AND p.remainingCount = 0 AND p.status <> 'DEPLETED'")
    int markDepletedIfEmpty(@Param("id") Long id);

    /**
     * 管理后台分页查询红包（多条件筛选 + 校区数据隔离）。
     *
     * <p>红包按发送者（senderId）归属校区隔离：campusName 非空时通过 EXISTS 子查询
     * 联 {@code UserCampusProfile.campusName} 过滤，校区管理员仅可见本校区用户发送的红包。</p>
     *
     * @param status        红包状态 PENDING/EXPIRED/DEPLETED（可空）
     * @param createdAtFrom 创建起始时间（可空）
     * @param createdAtTo   创建结束时间（可空）
     * @param campusName    管辖校区名（可空，null/空表示不过滤）
     * @param pageable      分页参数
     * @return 分页红包列表（按创建时间倒序）
     */
    @Query("""
            SELECT p FROM VipRedPacket p
            WHERE (:status IS NULL OR :status = '' OR p.status = :status)
              AND (:createdAtFrom IS NULL OR p.createdAt >= :createdAtFrom)
              AND (:createdAtTo IS NULL OR p.createdAt <= :createdAtTo)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile cp
                    WHERE cp.userId = p.senderId AND cp.campusName = :campusName))
            ORDER BY p.createdAt DESC
            """)
    Page<VipRedPacket> searchForAdmin(
            @Param("status") String status,
            @Param("createdAtFrom") LocalDateTime createdAtFrom,
            @Param("createdAtTo") LocalDateTime createdAtTo,
            @Param("campusName") String campusName,
            Pageable pageable);
}
