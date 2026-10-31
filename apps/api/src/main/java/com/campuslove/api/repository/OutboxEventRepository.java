package com.campuslove.api.repository;

import com.campuslove.api.entity.OutboxEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * 消息 outbox 事件仓库（R4-00373）。
 *
 * <p>供 {@link com.campuslove.api.mq.MessageProducer} 落库 MQ 不可用事件，
 * 定时补偿任务扫描 PENDING 事件重投。</p>
 *
 * <p><b>跨 JVM 重复投递的防线（2026-10-31 P0）</b>：补偿任务不再「读出来就发」，
 * 而是先用 {@link #claim} 做条件更新认领该行——只有影响行数 == 1 的实例才允许投递。
 * 本类的写方法都是<b>原子 SQL</b>（单条 UPDATE 带 status 前置条件，InnoDB 行锁保证
 * 并发下只有一个实例命中），并自带 {@code @Transactional}：调用方
 * （@Scheduled 方法）通常没有事务上下文，缺了注解 Spring Data 会直接抛
 * {@code InvalidDataAccessApiUsageException}。{@code clearAutomatically} 让
 * 批量更新后的一级缓存失效，避免同轮 sweep 里读到更新前的旧实体。</p>
 */
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * 查询待补偿重投的事件（按创建时间升序，先落库先重投）。
     *
     * <p>注意：本方法只是「候选」，<b>不是</b>授权投递。拿到候选后必须再经
     * {@link #claim} 认领成功才能 convertAndSend，否则两个 JVM 会各发一次。</p>
     *
     * @param status    事件状态（PENDING）
     * @param createdBefore 创建时间早于该时间（避免刚落库的事件立即被重复投递）
     * @return 待重投事件候选列表（单批上限 100）
     */
    List<OutboxEvent> findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
            OutboxEvent.OutboxStatus status, LocalDateTime createdBefore);

    /**
     * 幂等键是否已存在（生产者落库前的廉价预检）。
     *
     * <p>唯一索引 {@code uk_outbox_dedup_key} 才是真正的兜底；本方法只为让
     * 「同一业务事件重复落 outbox」在常规路径上不打异常栈。</p>
     *
     * @param dedupKey 业务事件幂等键
     * @return true 表示该事件已有 outbox 行
     */
    boolean existsByDedupKey(String dedupKey);

    /**
     * 按幂等键取行（发送失败重试时复用已有行，而不是插入重复行）。
     *
     * @param dedupKey 业务事件幂等键
     * @return 已存在的 outbox 行
     */
    Optional<OutboxEvent> findByDedupKey(String dedupKey);

    /**
     * 条件认领一行待投递事件（PENDING -&gt; IN_PROGRESS）。
     *
     * <p>这是跨 JVM 去重的<b>真正</b>机制：MySQL 的 {@code UPDATE … WHERE id=? AND
     * status='PENDING'} 对该行加排他锁，两个实例同时执行时后者匹配 0 行。
     * 调用方必须以「返回值 == 1」为投递的前置条件。</p>
     *
     * @param id         待认领行 ID
     * @param expected   期望的当前状态（PENDING）
     * @param claimed    认领后置入的状态（IN_PROGRESS）
     * @param now        认领时间（写入 claimed_at，供僵尸认领回收）
     * @return 影响行数：1 = 认领成功（本实例独占投递权）；0 = 已被他人认领/已投递
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE OutboxEvent e SET e.status = :claimed, e.claimedAt = :now "
            + "WHERE e.id = :id AND e.status = :expected")
    int claim(@Param("id") Long id,
              @Param("expected") OutboxEvent.OutboxStatus expected,
              @Param("claimed") OutboxEvent.OutboxStatus claimed,
              @Param("now") LocalDateTime now);

    /**
     * 投递成功后回写终态（IN_PROGRESS -&gt; SENT）。
     *
     * <p>仍带 {@code status = :claimed} 前置条件：若本行在投递期间被别的 sweep
     * 回收并重新认领，本次回写会命中 0 行，调用方据此记 WARN（消息确实发出去了，
     * 但可能重复——此时消费端幂等守卫是最后一道防线）。</p>
     *
     * @param id       行 ID
     * @param claimed  期望的当前状态（IN_PROGRESS）
     * @param sent     终态（SENT）
     * @param now      投递完成时间
     * @return 影响行数：1 = 回写成功；0 = 状态已被他人变更
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE OutboxEvent e SET e.status = :sent, e.sentAt = :now, "
            + "e.claimedAt = null, e.lastError = null "
            + "WHERE e.id = :id AND e.status = :claimed")
    int markSent(@Param("id") Long id,
                 @Param("claimed") OutboxEvent.OutboxStatus claimed,
                 @Param("sent") OutboxEvent.OutboxStatus sent,
                 @Param("now") LocalDateTime now);

    /**
     * 投递失败后回写：交回重投权（IN_PROGRESS -&gt; PENDING）或置 FAILED。
     *
     * <p>目标状态由调用方按重试次数决定（未超上限回 PENDING，超了置 FAILED），
     * 本方法只负责「带着 IN_PROGRESS 前置条件原子地写回去」。</p>
     *
     * @param id       行 ID
     * @param claimed  期望的当前状态（IN_PROGRESS）
     * @param target   回写状态（PENDING 或 FAILED）
     * @param retryCount 累计后的重试次数
     * @param lastError  最近一次错误信息（已截断）
     * @return 影响行数：1 = 回写成功；0 = 状态已被他人变更
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE OutboxEvent e SET e.status = :target, e.retryCount = :retryCount, "
            + "e.lastError = :lastError, e.claimedAt = null "
            + "WHERE e.id = :id AND e.status = :claimed")
    int releaseAfterFailedPublish(@Param("id") Long id,
                                  @Param("claimed") OutboxEvent.OutboxStatus claimed,
                                  @Param("target") OutboxEvent.OutboxStatus target,
                                  @Param("retryCount") int retryCount,
                                  @Param("lastError") String lastError);

    /**
     * 回收僵尸认领（IN_PROGRESS -&gt; PENDING）。
     *
     * <p>实例在「已认领、未回写」之间被杀（滚动重启 / OOM）会让行永久卡在
     * IN_PROGRESS——比改造前的重复投递更糟（事件再也不投了）。每轮 sweep 先跑本语句，
     * 把 {@code claimed_at} 早于 {@code staleBefore} 的行放回 PENDING。</p>
     *
     * <p>安全性：僵尸判定阈值（分钟级）远大于单条消息的投递耗时（毫秒级），
     * 正常在途行不会被误回收；真被误回收也只是「多投一次」，由消费端幂等守卫吸收。</p>
     *
     * @param claimed     被回收的当前状态（IN_PROGRESS）
     * @param pending     回收后置入的状态（PENDING）
     * @param staleBefore claimed_at 早于此时间才算僵尸
     * @return 影响行数（回收到的僵尸行数）
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE OutboxEvent e SET e.status = :pending, e.claimedAt = null "
            + "WHERE e.status = :claimed AND e.claimedAt IS NOT NULL "
            + "AND e.claimedAt < :staleBefore")
    int reclaimStaleClaims(@Param("claimed") OutboxEvent.OutboxStatus claimed,
                           @Param("pending") OutboxEvent.OutboxStatus pending,
                           @Param("staleBefore") LocalDateTime staleBefore);

    /**
     * 统计某状态的事件数量（运维/监控用，sweep 摘要日志）。
     *
     * @param status 事件状态
     * @return 行数
     */
    long countByStatus(OutboxEvent.OutboxStatus status);
}
