package com.campuslove.api.repository;

import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 临时聊天会话 Repository。
 * 提供基于用户、会话 UID、推荐人等维度的查询方法。
 */
public interface TempChatSessionRepository extends JpaRepository<TempChatSession, Long> {

    /**
     * 根据会话 UID 查询会话。
     *
     * @param sessionUid 会话唯一标识
     * @return 匹配的会话（可能为空）
     */
    Optional<TempChatSession> findBySessionUid(String sessionUid);

    /**
     * 查询指定用户参与的会话列表，按置顶和最后消息时间排序。
     *
     * @param userId 用户 ID
     * @return 会话列表
     */
    @Query("SELECT s FROM TempChatSession s WHERE s.userAId = :userId OR s.userBId = :userId " +
           "ORDER BY s.isPinned DESC, s.lastMessageAt DESC NULLS LAST, s.createdAt DESC")
    List<TempChatSession> findByUserIdOrderByPinnedAndLastMessage(@Param("userId") Long userId);

    /**
     * 查询指定用户与推荐人之间的活跃会话（未关闭且未过期）。
     *
     * @param userId              当前用户 ID
     * @param recommendedPersonId 推荐人 ID
     * @param closedPhase         已关闭阶段
     * @param expiredPhase        已过期阶段
     * @return 匹配的会话（可能为空）
     */
    @Query("SELECT s FROM TempChatSession s WHERE " +
           "((s.userAId = :userId AND s.recommendedPersonId = :recommendedPersonId) OR " +
           "(s.userBId = :userId AND s.recommendedPersonId = :recommendedPersonId)) " +
           "AND s.phase NOT IN :excludedPhases")
    Optional<TempChatSession> findActiveByUserIdAndRecommendedPersonId(
            @Param("userId") Long userId,
            @Param("recommendedPersonId") String recommendedPersonId,
            @Param("excludedPhases") List<SessionPhase> excludedPhases);

    /**
     * 查询指定用户与推荐人之间的活跃会话（简化版）。
     *
     * @param userAId             用户 A ID
     * @param userBId             用户 B ID
     * @param excludedPhases      排除的阶段列表
     * @return 匹配的会话（可能为空）
     */
    @Query("SELECT s FROM TempChatSession s WHERE " +
           "((s.userAId = :userAId AND s.userBId = :userBId) OR " +
           "(s.userAId = :userBId AND s.userBId = :userAId)) " +
           "AND s.phase NOT IN :excludedPhases")
    Optional<TempChatSession> findActiveByUserPair(
            @Param("userAId") Long userAId,
            @Param("userBId") Long userBId,
            @Param("excludedPhases") List<SessionPhase> excludedPhases);

    /**
     * 根据 matchId 查询活跃会话。
     *
     * @param matchId        匹配 ID
     * @param excludedPhases 排除的阶段列表
     * @return 匹配的会话（可能为空）
     */
    @Query("SELECT s FROM TempChatSession s WHERE s.matchId = :matchId " +
           "AND s.phase NOT IN :excludedPhases")
    Optional<TempChatSession> findActiveByMatchId(
            @Param("matchId") String matchId,
            @Param("excludedPhases") List<SessionPhase> excludedPhases);

    /**
     * 查询指定阶段且已超过关闭时间的会话（用于定时清理过期会话）。
     *
     * <p>SubTask 5.3.1：用于 {@code TempChatCleanupService.cleanupExpiredSessions()}
     * 定时任务，每小时一次扫描所有 {@code active}/@{code matching} 阶段且
     * {@code closesAt < now()} 的会话，将其标记为 {@code expired}。</p>
     *
     * @param phase     目标阶段（active / matching）
     * @param cutoff    关闭时间阈值（通常为 {@code LocalDateTime.now()}）
     * @return 已过期但尚未标记的会话列表
     */
    List<TempChatSession> findByPhaseAndClosesAtBefore(SessionPhase phase, LocalDateTime cutoff);
}
