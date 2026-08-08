package com.campuslove.api.repository;

import com.campuslove.api.entity.OutboxEvent;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 消息 outbox 事件仓库（R4-00373）。
 *
 * <p>供 {@link com.campuslove.api.mq.MessageProducer} 落库 MQ 不可用事件，
 * 定时补偿任务扫描 PENDING 事件重投。</p>
 */
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * 查询待补偿重投的事件（按创建时间升序，先落库先重投）。
     *
     * @param status    事件状态（PENDING）
     * @param createdBefore 创建时间早于该时间（避免刚落库的事件立即被重复投递）
     * @param pageSize  单批扫描上限
     * @return 待重投事件列表
     */
    List<OutboxEvent> findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
            OutboxEvent.OutboxStatus status, LocalDateTime createdBefore);
}
