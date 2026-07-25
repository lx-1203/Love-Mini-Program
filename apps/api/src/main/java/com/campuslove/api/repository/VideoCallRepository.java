package com.campuslove.api.repository;

import com.campuslove.api.entity.VideoCall;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 视频通话 Repository。
 * <p>提供视频通话记录的持久化与查询能力。</p>
 *
 * <p>查询场景：</p>
 * <ul>
 *   <li>按 roomId 查询：用于通话结束、状态更新时定位记录</li>
 *   <li>按 callerId 查询最近通话：用于用户通话历史展示</li>
 * </ul>
 */
@Repository
public interface VideoCallRepository extends JpaRepository<VideoCall, Long> {

    /**
     * 按 roomId 查询通话记录。
     * <p>roomId 全局唯一，用于在通话结束、状态更新等场景快速定位记录。</p>
     *
     * @param roomId 通话房间 ID
     * @return 通话记录（可能为空）
     */
    Optional<VideoCall> findByRoomId(String roomId);
}
