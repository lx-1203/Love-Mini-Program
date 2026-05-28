package com.campuslove.api.repository;

import com.campuslove.api.entity.PushSummary;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 推送摘要 Repository。
 * 提供基于用户、发送状态和生成时间的查询方法。
 */
public interface PushSummaryRepository extends JpaRepository<PushSummary, Long> {

    /**
     * 根据用户 ID 和发送状态查询推送摘要，按生成时间倒序排列。
     *
     * @param userId 用户 ID
     * @param isSent 是否已发送
     * @return 推送摘要列表
     */
    List<PushSummary> findByUserIdAndIsSentOrderByGeneratedAtDesc(Long userId, Boolean isSent);

    /**
     * 根据用户 ID 和生成时间（在指定时间之后）查询推送摘要。
     * 用于判断在特定时间之后是否已生成过摘要，避免重复生成。
     *
     * @param userId 用户 ID
     * @param generatedAt 生成时间下限
     * @return 推送摘要列表
     */
    List<PushSummary> findByUserIdAndGeneratedAtAfter(Long userId, LocalDateTime generatedAt);
}