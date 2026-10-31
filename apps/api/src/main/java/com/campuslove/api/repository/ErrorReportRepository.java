package com.campuslove.api.repository;

import com.campuslove.api.entity.ErrorReport;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * 前端错误上报 Repository。
 *
 * <p>append-only 存储，当前仅提供写入能力；后续需要管理后台查看时
 * 在此补充分页查询方法。</p>
 *
 * <p>S3-F（2026-10-31）：新增 {@link #deleteByCreatedAtBefore} 供
 * {@code ErrorReportRetentionService} 做留存清理。这是本 Repository 目前【唯一】
 * 的删除入口，且只允许被该定时任务调用——因为本表没有任何读路径
 * （见类注释「后续需要管理后台查看时再补分页」），删掉的行不可恢复也无法核对，
 * 所以保留期判定集中写在 ErrorReportRetentionService 与
 * {@code scripts/qa/data-layer-decisions-2026-10-31.md}，不允许在别处另起一套口径。</p>
 */
public interface ErrorReportRepository extends JpaRepository<ErrorReport, Long> {

    /**
     * 删除创建时间早于 cutoff 的全部上报。
     *
     * <p>用 JPQL 批量 DELETE 而非「先 find 再 deleteAll」：后者会把 721+ 行的
     * message/stack 文本全部加载进持久化上下文，纯浪费。</p>
     *
     * <p>走 {@code idx_error_reports_created_at}（实测该索引已存在，
     * 故无需为此新增索引）。</p>
     *
     * <p>{@code @Transactional}：本方法由定时任务直接调用，调用方【故意】不加
     * 方法级事务——那样删除会在释放分布式锁之前提交，避免
     * {@code TempChatCleanupService} 修过的那个「锁先于提交释放、第二个实例读到
     * 未提交状态再处理一遍」的问题。</p>
     *
     * <p>幂等：条件只有时间，重跑只会删更少或零行。</p>
     *
     * @param cutoff 保留期边界（早于此时间的记录被删除）
     * @return 删除的行数
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM ErrorReport e WHERE e.createdAt < :cutoff")
    int deleteByCreatedAtBefore(@Param("cutoff") LocalDateTime cutoff);
}
