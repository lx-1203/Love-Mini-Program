package com.campuslove.api.repository;

import com.campuslove.api.entity.SocialProgress;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 社交升温进度 Repository。
 * 提供基于用户 ID 的查询方法与各项计数的原子自增方法。
 *
 * <p>C2（2026-11 第六轮修复波 W1）：六层漏斗的各项计数原为「读实体字段 + 加 + 写回」
 * （RealSocialProgressService.recordXxx），并发下互相覆盖丢增量，且被 {@code @Version}
 * 乐观锁冲突抛出后又由调用方空 catch 静默吞掉。本仓其余域（如 {@code CircleTopicRepository}
 * 的 {@code incrementLikeCount}）早已原子化，本接口补齐同一口径：
 * 每个计数用一条 {@code UPDATE ... SET x = x + 1} 由数据库原子完成，
 * 并在同一语句内用 CASE 依据「各计数列（被自增列取新值、其余列取现值）」单调重算
 * {@code current_tier}（层级只升不降）。bulk UPDATE 绕过 JPA 一级缓存与 {@code @Version}，
 * 因此不再有该路径上的乐观锁丢更新。</p>
 */
public interface SocialProgressRepository extends JpaRepository<SocialProgress, Long> {

    /**
     * 根据用户 ID 查询社交升温进度记录。
     *
     * @param userId 用户 ID
     * @return 匹配的社交进度记录（可能为空）
     */
    Optional<SocialProgress> findByUserId(Long userId);

    /** L1 曝光计数原子 +1（曝光不参与层级判定，仅自增）。 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SocialProgress s SET s.exposureCount = s.exposureCount + 1, "
            + "s.updatedAt = :now WHERE s.userId = :userId")
    int incrementExposureCount(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** L2 喜欢计数原子 +1；层级重算：命中更高阶则维持，否则因本次喜欢至少升到 L2。 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SocialProgress s SET s.likeCount = s.likeCount + 1, s.updatedAt = :now, "
            + "s.currentTier = CASE "
            + "WHEN s.activityCount >= 1 THEN 'L6_SCENE' "
            + "WHEN s.circleCount >= 1 THEN 'L5_CIRCLE' "
            + "WHEN s.chatCount >= 1 THEN 'L4_COMMUNICATION' "
            + "WHEN s.matchCount >= 1 THEN 'L3_MATCH' "
            + "ELSE 'L2_ATTENTION' END "
            + "WHERE s.userId = :userId")
    int incrementLikeCount(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** L3 匹配计数原子 +1；层级至少升到 L3。 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SocialProgress s SET s.matchCount = s.matchCount + 1, s.updatedAt = :now, "
            + "s.currentTier = CASE "
            + "WHEN s.activityCount >= 1 THEN 'L6_SCENE' "
            + "WHEN s.circleCount >= 1 THEN 'L5_CIRCLE' "
            + "WHEN s.chatCount >= 1 THEN 'L4_COMMUNICATION' "
            + "ELSE 'L3_MATCH' END "
            + "WHERE s.userId = :userId")
    int incrementMatchCount(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** L4 聊天计数原子 +1；层级至少升到 L4。 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SocialProgress s SET s.chatCount = s.chatCount + 1, s.updatedAt = :now, "
            + "s.currentTier = CASE "
            + "WHEN s.activityCount >= 1 THEN 'L6_SCENE' "
            + "WHEN s.circleCount >= 1 THEN 'L5_CIRCLE' "
            + "ELSE 'L4_COMMUNICATION' END "
            + "WHERE s.userId = :userId")
    int incrementChatCount(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** L5 社区互动计数原子 +1；层级至少升到 L5。 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SocialProgress s SET s.circleCount = s.circleCount + 1, s.updatedAt = :now, "
            + "s.currentTier = CASE "
            + "WHEN s.activityCount >= 1 THEN 'L6_SCENE' "
            + "ELSE 'L5_CIRCLE' END "
            + "WHERE s.userId = :userId")
    int incrementCircleCount(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** L6 活动参与计数原子 +1；活动是最高阶，直接升到 L6。 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SocialProgress s SET s.activityCount = s.activityCount + 1, s.updatedAt = :now, "
            + "s.currentTier = 'L6_SCENE' WHERE s.userId = :userId")
    int incrementActivityCount(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}