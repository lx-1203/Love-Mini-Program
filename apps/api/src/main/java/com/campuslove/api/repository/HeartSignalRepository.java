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
