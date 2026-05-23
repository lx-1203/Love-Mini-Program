package com.campuslove.api.repository;

import com.campuslove.api.entity.InteractionEvent;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
