package com.campuslove.api.wallet;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 钱包交易流水 Repository。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：流水持久化与查询。</p>
 *
 * <p>提供：</p>
 * <ul>
 *   <li>{@link #findByUserIdOrderByCreatedAtDesc}：按用户分页查询流水（倒序）</li>
 *   <li>{@link #findByOrderId}：按订单号查询流水，用于幂等校验</li>
 *   <li>{@link #findByRelatedTypeAndRelatedId}：按业务类型 + 业务实体反查流水</li>
 * </ul>
 */
public interface WalletTransactionLogRepository extends JpaRepository<WalletTransactionLog, Long> {

    /**
     * 按用户 ID 分页查询流水，按创建时间倒序。
     *
     * <p>用于"我的钱包"页面展示用户历史资金变动。</p>
     *
     * @param userId   用户 ID
     * @param pageable 分页参数
     * @return 流水分页
     */
    Page<WalletTransactionLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * 按订单号查询流水（幂等校验用）。
     *
     * <p>Task 2 / 15：deduct / recharge 调用前先查 orderId 是否已存在，
     * 若存在则直接返回已处理结果，避免重复扣减/充值。</p>
     *
     * <p>数据库层有 order_id 唯一索引兜底，即使并发场景下两个事务同时通过"未存在"校验，
     * 后插入的事务也会因唯一约束冲突回滚，保证幂等。</p>
     *
     * @param orderId 业务订单号
     * @return 流水记录（可选）
     */
    Optional<WalletTransactionLog> findByOrderId(String orderId);

    /**
     * 按关联业务类型 + 业务实体 ID 查询流水。
     *
     * <p>用于反查：例如红包过期退款时，查询原始 RED_PACKET_SEND 流水获取发送者 ID 与金额。</p>
     *
     * @param relatedType 关联业务类型
     * @param relatedId   关联业务实体 ID
     * @return 流水列表
     */
    List<WalletTransactionLog> findByRelatedTypeAndRelatedId(String relatedType, String relatedId);
}
