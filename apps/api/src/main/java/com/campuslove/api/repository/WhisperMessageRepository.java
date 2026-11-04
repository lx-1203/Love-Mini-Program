package com.campuslove.api.repository;

import com.campuslove.api.entity.WhisperMessage;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WhisperMessageRepository extends JpaRepository<WhisperMessage, Long> {

    Optional<WhisperMessage> findByClientRequestId(String clientRequestId);

    /**
     * 收件箱视图（R5-1，2026-11-05）：只取送达态（SENT/DELIVERED/READ）。
     * PAY_FAILED/REFUNDED 是<b>发送侧审计行</b>（扣费失败/创建失败退款的事实落库，
     * 含未付费的留言内容）——绝不能进入收件人视角，否则付费墙被「余额不足」旁路。
     */
    List<WhisperMessage> findByReceiverIdAndStatusInOrderByCreatedAtDesc(
            Long receiverId, Collection<String> statuses);

    List<WhisperMessage> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    /** R8（2026-11-04）分页重载（queryBy 前缀避开与 findBy 同名派生冲突）；R5-1 起收件侧同样带状态过滤 */
    List<WhisperMessage> queryByReceiverIdAndStatusInOrderByCreatedAtDesc(
            Long receiverId, Collection<String> statuses, org.springframework.data.domain.Pageable pageable);

    List<WhisperMessage> queryBySenderIdOrderByCreatedAtDesc(Long senderId, org.springframework.data.domain.Pageable pageable);

    /**
     * R5-b（2026-11-05）：收件箱 SENT→DELIVERED 一次性批量置位（替代逐行 save 的 N+1 写）。
     * 语义与原循环等价：进入收件箱即视为送达（优先送达语义）。
     */
    @Modifying
    @Query("UPDATE WhisperMessage w SET w.status = 'DELIVERED' "
        + "WHERE w.receiverId = :receiverId AND w.status = 'SENT'")
    int markInboxDelivered(@Param("receiverId") Long receiverId);

    /** R9-b（2026-11-05）：收件人未读数（SENT/DELIVERED 均视为未读；与收件箱状态口径一致） */
    long countByReceiverIdAndStatusIn(Long receiverId, Collection<String> statuses);

    long countBySenderIdAndCreatedAtBetween(Long senderId, LocalDateTime start, LocalDateTime end);

    /** 同一对用户 A↔B 之间有效（未终结）悄悄话数量 */
    @Query("SELECT COUNT(w) FROM WhisperMessage w WHERE "
        + "((w.senderId = :a AND w.receiverId = :b) OR (w.senderId = :b AND w.receiverId = :a)) "
        + "AND w.status IN ('SENT', 'DELIVERED', 'READ')")
    long countActiveBetween(@Param("a") Long a, @Param("b") Long b);
}
