package com.campuslove.api.repository;

import com.campuslove.api.entity.InteractionEvent;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 互动事件 Repository。
 * 提供基于用户 ID、已读状态和事件类型的查询方法。
 */
public interface InteractionEventRepository extends JpaRepository<InteractionEvent, Long> {

    /**
     * 根据用户 ID 分页查询互动事件，按创建时间倒序。
     *
     * @param userId   用户 ID
     * @param pageable 分页参数
     * @return 互动事件分页列表
     */
    Page<InteractionEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * 根据用户 ID 和已读状态统计互动事件数量。
     *
     * @param userId 用户 ID
     * @param isRead 是否已读
     * @return 未读互动事件数量
     */
    long countByUserIdAndIsRead(Long userId, Boolean isRead);

    /**
     * 根据用户 ID 和事件 ID 查询互动事件（用于标记已读时的验证）。
     *
     * @param userId  用户 ID
     * @param eventId 事件 ID
     * @return 匹配的互动事件（可能为空）
     */
    List<InteractionEvent> findByUserIdAndId(Long userId, Long eventId);

    /**
     * 根据用户 ID 查询所有未读互动事件。
     *
     * @param userId 用户 ID
     * @param isRead 是否已读
     * @return 未读互动事件列表
     */
    List<InteractionEvent> findByUserIdAndIsRead(Long userId, Boolean isRead);

    /**
     * 批量将指定用户的全部未读互动事件标记为已读（单条 UPDATE，避免全量加载后逐条 save）。
     *
     * @param userId 用户 ID
     * @return 更新条数
     */
    @Modifying
    @Query("UPDATE InteractionEvent e SET e.isRead = true "
            + "WHERE e.userId = :userId AND e.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    /**
     * 统计指定时间之后发生的互动事件数（用于活跃度统计中的"互动数"指标）。
     *
     * @param since 起始时间
     * @return 互动事件数
     */
    long countByCreatedAtAfter(LocalDateTime since);

    /**
     * R4-00393：统计指定校区内指定时间之后发生的互动事件数（校区隔离互动数）。
     *
     * @param since      起始时间
     * @param campusName 校区名称
     * @return 该校区互动事件数
     */
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(e) FROM InteractionEvent e "
            + "WHERE e.createdAt >= :since AND EXISTS (SELECT 1 FROM UserCampusProfile p "
            + "WHERE p.userId = e.userId AND p.campusName = :campusName)")
    long countByCreatedAtAfterAndCampusName(
            @org.springframework.data.repository.query.Param("since") LocalDateTime since,
            @org.springframework.data.repository.query.Param("campusName") String campusName);

    /**
     * 统计指定时间范围内的互动事件数。
     *
     * @param from 起始时间
     * @param to   结束时间
     * @return 互动事件数
     */
    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
