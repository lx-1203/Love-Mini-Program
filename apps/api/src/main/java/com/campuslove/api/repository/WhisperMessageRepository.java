package com.campuslove.api.repository;

import com.campuslove.api.entity.WhisperMessage;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WhisperMessageRepository extends JpaRepository<WhisperMessage, Long> {

    Optional<WhisperMessage> findByClientRequestId(String clientRequestId);

    List<WhisperMessage> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);

    List<WhisperMessage> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    /** R8（2026-11-04）分页重载：收件箱/已发送规模化分页（queryBy 前缀避开与 findBy 同名派生冲突） */
    List<WhisperMessage> queryByReceiverIdOrderByCreatedAtDesc(Long receiverId, org.springframework.data.domain.Pageable pageable);

    List<WhisperMessage> queryBySenderIdOrderByCreatedAtDesc(Long senderId, org.springframework.data.domain.Pageable pageable);

    long countBySenderIdAndCreatedAtBetween(Long senderId, LocalDateTime start, LocalDateTime end);

    /** 同一对用户 A↔B 之间有效（未终结）悄悄话数量 */
    @Query("SELECT COUNT(w) FROM WhisperMessage w WHERE "
        + "((w.senderId = :a AND w.receiverId = :b) OR (w.senderId = :b AND w.receiverId = :a)) "
        + "AND w.status IN ('SENT', 'DELIVERED', 'READ')")
    long countActiveBetween(@Param("a") Long a, @Param("b") Long b);
}
