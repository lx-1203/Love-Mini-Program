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
}
