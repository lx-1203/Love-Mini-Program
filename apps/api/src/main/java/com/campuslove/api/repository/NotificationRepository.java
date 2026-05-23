package com.campuslove.api.repository;

import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.ReferenceType;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
     * 将指定用户的所有未读通知标记为已读。
     *
     * @param userId 用户 ID
     * @return 更新的记录数
     */
    int updateIsReadByUserIdAndIsReadFalse(Long userId);
}
