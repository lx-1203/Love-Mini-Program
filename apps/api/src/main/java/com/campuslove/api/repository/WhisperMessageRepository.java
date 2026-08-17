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

    long countBySenderIdAndCreatedAtBetween(Long senderId, LocalDateTime start, LocalDateTime end);

    /** 同一对用户 A↔B 之间有效（未终结）悄悄话数量 */
    @Query("SELECT COUNT(w) FROM WhisperMessage w WHERE "
        + "((w.senderId = :a AND w.receiverId = :b) OR (w.senderId = :b AND w.receiverId = :a)) "
        + "AND w.status IN ('SENT', 'DELIVERED', 'READ')")
    long countActiveBetween(@Param("a") Long a, @Param("b") Long b);
}
