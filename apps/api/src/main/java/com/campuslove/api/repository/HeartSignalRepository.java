package com.campuslove.api.repository;

import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 心动信号 Repository。
 * 提供基于用户和状态的查询方法。
 */
public interface HeartSignalRepository extends JpaRepository<HeartSignal, Long> {

    /**
     * 查询与指定用户相关的心动信号（作为 userA 或 userB），按指定状态过滤。
     *
     * @param userAId  用户 A ID
     * @param userBId  用户 B ID
     * @param status   信号状态
     * @return 匹配的心动信号列表
     */
    @Query("SELECT hs FROM HeartSignal hs WHERE (hs.userAId = :userAId OR hs.userBId = :userBId) AND hs.status = :status")
    List<HeartSignal> findByUserAIdOrUserBIdAndStatus(
            @Param("userAId") Long userAId,
            @Param("userBId") Long userBId,
            @Param("status") SignalStatus status
    );

    /**
     * P0-25：查询与指定用户相关的未过期 pending 心动信号（expiresAt &gt; now 过滤）。
     *
     * <p>与 {@link #findByUserAIdOrUserBIdAndStatus} 的区别：额外排除已过期但尚未被
     * 定时任务标记为 expired 的信号，避免用户列表中出现"已过期未处理"的待处理信号。</p>
     *
     * @param userAId 用户 A ID
     * @param userBId 用户 B ID
     * @param status  信号状态
     * @param now     当前时间（仅返回 expiresAt 晚于该时刻的信号）
     * @return 匹配的心动信号列表
     */
    @Query("SELECT hs FROM HeartSignal hs WHERE (hs.userAId = :userAId OR hs.userBId = :userBId) "
            + "AND hs.status = :status AND hs.expiresAt > :now")
    List<HeartSignal> findByUserAIdOrUserBIdAndStatusNotExpired(
            @Param("userAId") Long userAId,
            @Param("userBId") Long userBId,
            @Param("status") SignalStatus status,
            @Param("now") java.time.LocalDateTime now
    );

    /**
     * P0-25：查询指定状态且已过期的信号（供定时任务扫描置为 expired）。
     *
     * @param status 信号状态（通常为 pending）
     * @param now    当前时间（返回 expiresAt 早于该时刻的信号）
     * @return 已过期的信号列表
     */
    List<HeartSignal> findByStatusAndExpiresAtBefore(SignalStatus status, java.time.LocalDateTime now);

    /**
     * P0-25：批量将已过期的 pending 信号置为 expired（定时任务调用，单条 UPDATE 原子执行）。
     *
     * @param now 当前时间（仅更新 expiresAt 早于该时刻的 pending 信号）
     * @return 更新的记录数
     */
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE HeartSignal hs SET hs.status = :expired, hs.updatedAt = :now "
            + "WHERE hs.status = :pending AND hs.expiresAt < :now")
    int expirePendingSignalsBefore(
            @Param("pending") SignalStatus pending,
            @Param("expired") SignalStatus expired,
            @Param("now") java.time.LocalDateTime now
    );

    /**
     * 统计指定状态的心动信号总数。
     *
     * @param status 信号状态
     * @return 心动信号总数
     */
    long countByStatus(SignalStatus status);

    /**
     * 统计指定匹配类型的心动信号数（如 mutual_like 表示互相喜欢的双向匹配）。
     *
     * @param matchType 匹配类型
     * @return 匹配数
     */
    long countByMatchType(String matchType);

    /**
     * 统计指定状态且匹配类型为指定值的心动信号数（用于计算双向匹配成功率）。
     *
     * @param status    信号状态
     * @param matchType 匹配类型
     * @return 匹配数
     */
    long countByStatusAndMatchType(SignalStatus status, String matchType);

    /**
     * 按创建日期分组统计心动信号数（用于每日匹配趋势）。
     * 返回格式为 [date_string, count]，date_string 格式为 'yyyy-MM-dd'。
     *
     * @param from 起始时间
     * @param to   结束时间
     * @return 每日匹配数列表
     */
    @Query("SELECT FUNCTION('DATE', hs.createdAt) AS field, COUNT(hs) AS cnt " +
           "FROM HeartSignal hs " +
           "WHERE hs.createdAt BETWEEN :from AND :to " +
           "GROUP BY FUNCTION('DATE', hs.createdAt) " +
           "ORDER BY FUNCTION('DATE', hs.createdAt) ASC")
    List<com.campuslove.api.repository.FieldCountProjection> countDailyBetween(
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to
    );
}
