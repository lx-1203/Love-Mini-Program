package com.campuslove.api.repository;

import com.campuslove.api.entity.Notification;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 互动通知 Repository。
 * 提供基于用户和已读状态的查询方法。
 */
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * 根据用户 ID 和已读状态查询通知，按创建时间倒序。
     *
     * @param userId 用户 ID
     * @param isRead 是否已读
     * @return 通知列表
     */
    List<Notification> findByUserIdAndIsReadOrderByCreatedAtDesc(Long userId, boolean isRead);

    /**
     * 统计指定用户未读通知数量。
     *
     * @param userId 用户 ID
     * @param isRead 是否已读
     * @return 未读通知数量
     */
    long countByUserIdAndIsRead(Long userId, boolean isRead);

    /**
     * 根据用户 ID 查询所有通知，按创建时间倒序分页。
     *
     * @param userId   用户 ID
     * @param pageable 分页参数
     * @return 分页通知列表
     */
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * 根据用户 ID 和已读状态查询通知，按创建时间倒序分页。
     *
     * @param userId   用户 ID
     * @param isRead   是否已读
     * @param pageable 分页参数
     * @return 分页通知列表
     */
    Page<Notification> findByUserIdAndIsReadOrderByCreatedAtDesc(Long userId, boolean isRead, Pageable pageable);

    /**
     * 按用户、通知类型集合查询，按创建时间倒序分页（signalType 筛选下推 SQL）。
     *
     * @param userId   用户 ID
     * @param types    通知类型集合
     * @param pageable 分页参数
     * @return 分页通知列表
     */
    Page<Notification> findByUserIdAndTypeInOrderByCreatedAtDesc(
            Long userId, Collection<Notification.NotificationType> types, Pageable pageable);

    /**
     * 按用户、已读状态、通知类型集合查询，按创建时间倒序分页（signalType 筛选下推 SQL）。
     *
     * @param userId   用户 ID
     * @param isRead   是否已读
     * @param types    通知类型集合
     * @param pageable 分页参数
     * @return 分页通知列表
     */
    Page<Notification> findByUserIdAndIsReadAndTypeInOrderByCreatedAtDesc(
            Long userId, boolean isRead, Collection<Notification.NotificationType> types, Pageable pageable);

    /**
     * 将指定用户的所有未读通知标记为已读。
     *
     * @param userId 用户 ID
     * @return 更新的记录数
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true "
            + "WHERE n.userId = :userId AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);
}
