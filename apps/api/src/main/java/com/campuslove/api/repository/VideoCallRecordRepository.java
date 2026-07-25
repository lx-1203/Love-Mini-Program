package com.campuslove.api.repository;

import com.campuslove.api.entity.VideoCallRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 视频通话记录 Repository。
 *
 * <p>提供视频通话记录的持久化与查询能力，用于通话历史展示。</p>
 *
 * <p>查询场景：</p>
 * <ul>
 *   <li>按 roomId 查询：用于通话结束、状态更新时定位记录</li>
 *   <li>按 callerId 查询：用于查询用户主动发起的通话历史</li>
 *   <li>按 receiverId 查询：用于查询用户被叫的通话历史</li>
 *   <li>按 callerId 或 receiverId 查询：用于"我的通话记录"列表</li>
 * </ul>
 */
@Repository
public interface VideoCallRecordRepository extends JpaRepository<VideoCallRecord, Long> {

    /**
     * 按 roomId 查询通话记录。
     *
     * @param roomId 通话房间 ID
     * @return 通话记录（可能为空）
     */
    Optional<VideoCallRecord> findByRoomId(String roomId);

    /**
     * 按发起方用户 ID 查询通话记录（按开始时间倒序）。
     *
     * @param callerId 发起方用户 ID
     * @return 通话记录列表
     */
    List<VideoCallRecord> findByCallerIdOrderByStartTimeDesc(Long callerId);

    /**
     * 按接收方用户 ID 查询通话记录（按开始时间倒序）。
     *
     * @param receiverId 接收方用户 ID
     * @return 通话记录列表
     */
    List<VideoCallRecord> findByReceiverIdOrderByStartTimeDesc(Long receiverId);

    /**
     * 查询用户参与的所有通话记录（作为发起方或接收方），按开始时间倒序。
     *
     * <p>用于"我的通话记录"列表展示。</p>
     *
     * @param callerId   发起方用户 ID
     * @param receiverId 接收方用户 ID
     * @return 通话记录列表
     */
    List<VideoCallRecord> findByCallerIdOrReceiverIdOrderByStartTimeDesc(Long callerId, Long receiverId);
}
