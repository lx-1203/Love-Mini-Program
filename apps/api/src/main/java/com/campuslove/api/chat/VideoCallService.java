package com.campuslove.api.chat;

import com.campuslove.api.entity.VideoCall;
import com.campuslove.api.entity.VideoCallRecord;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VideoCallRecordRepository;
import com.campuslove.api.repository.VideoCallRepository;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 视频通话服务。
 * <p>提供视频通话的发起、结束与通话记录查询业务逻辑。</p>
 *
 * <p>双表设计：
 * <ul>
 *   <li>{@link VideoCall}：通话进行中的实时状态表（RINGING/ONGOING/ENDED/MISSED/REJECTED）</li>
 *   <li>{@link VideoCallRecord}：通话历史记录表（INITIATING/CONNECTED/MISSED/REJECTED/FAILED），
 *       用于前端"通话记录"列表展示</li>
 * </ul>
 * 通话发起时同时写入两张表；通话结束时同步更新两张表的状态与时长。
 * </p>
 *
 * <p>事务处理：发起、结束、记录查询操作均使用 @Transactional 保证原子性，
 * 防止并发更新导致状态不一致。</p>
 *
 * <p>错误处理：参数非法抛出 IllegalArgumentException，
 * 由 GlobalExceptionHandler 统一转换为 400 响应。
 * 所有写操作均包含 try-catch，异常时抛出 RuntimeException 由上层处理。</p>
 *
 * <p>说明：本服务仅负责元信息管理，实际音视频流由 WebRTC + 信令服务器处理。</p>
 */
@Profile("real")
@Service
public class VideoCallService {

    private static final Logger log = LoggerFactory.getLogger(VideoCallService.class);

    /** 通话未接听超时时间（秒）：60 秒 */
    private static final int RINGING_TIMEOUT_SEC = 60;

    /** 通话最大时长（秒）：60 分钟，超过自动结束 */
    private static final int MAX_CALL_DURATION_SEC = 60 * 60;

    private final VideoCallRepository videoCallRepository;
    private final VideoCallRecordRepository videoCallRecordRepository;
    private final UserRepository userRepository;

    public VideoCallService(VideoCallRepository videoCallRepository,
                            VideoCallRecordRepository videoCallRecordRepository,
                            UserRepository userRepository) {
        this.videoCallRepository = videoCallRepository;
        this.videoCallRecordRepository = videoCallRecordRepository;
        this.userRepository = userRepository;
    }

    /**
     * 发起视频通话。
     * <p>校验双方用户存在性、不能与自己通话后，生成唯一 roomId，
     * 同时创建 {@link VideoCall} 与 {@link VideoCallRecord} 记录。</p>
     *
     * @param callerId 发起方用户 ID
     * @param calleeId 接收方用户 ID
     * @return 通话视图（含 roomId 供前端建立 WebRTC 连接）
     * @throws IllegalArgumentException 参数非法、用户不存在或与自己通话时抛出
     */
    @Transactional
    public VideoCallView startCall(Long callerId, Long calleeId) {
        // 参数校验
        if (callerId == null) {
            throw new IllegalArgumentException("发起方用户 ID 不能为空");
        }
        if (calleeId == null) {
            throw new IllegalArgumentException("接收方用户 ID 不能为空");
        }
        if (callerId.equals(calleeId)) {
            throw new IllegalArgumentException("不能与自己进行视频通话");
        }
        // 校验双方用户存在
        if (!userRepository.existsById(callerId)) {
            throw new IllegalArgumentException("发起方用户不存在");
        }
        if (!userRepository.existsById(calleeId)) {
            throw new IllegalArgumentException("接收方用户不存在");
        }

        try {
            // 生成唯一 roomId（UUID v4，无连字符）
            String roomId = UUID.randomUUID().toString().replace("-", "");
            java.time.LocalDateTime now = java.time.LocalDateTime.now();

            // 写入实时状态表 VideoCall
            VideoCall call = new VideoCall();
            call.setRoomId(roomId);
            call.setCallerId(callerId);
            call.setCalleeId(calleeId);
            call.setStatus("RINGING");
            call.setCreatedAt(now);
            call.setUpdatedAt(now);
            VideoCall saved = videoCallRepository.save(call);

            // 同步写入通话历史记录表 VideoCallRecord
            VideoCallRecord record = new VideoCallRecord();
            record.setRoomId(roomId);
            record.setCallerId(callerId);
            record.setReceiverId(calleeId);
            record.setStartTime(now);
            record.setStatus("INITIATING");
            record.setCreatedAt(now);
            record.setUpdatedAt(now);
            videoCallRecordRepository.save(record);

            log.info("视频通话发起：id={}, roomId={}, callerId={}, calleeId={}",
                    saved.getId(), roomId, callerId, calleeId);
            return toView(saved);
        } catch (DataAccessException e) {
            // 数据库访问异常（save 失败、约束冲突等）
            log.error("视频通话发起失败：callerId={}, calleeId={}", callerId, calleeId, e);
            throw new RuntimeException("视频通话发起失败，请稍后重试", e);
        }
    }

    /**
     * 结束视频通话。
     * <p>校验 roomId 存在性、发起方身份合法性后，更新 VideoCall 与 VideoCallRecord 状态。</p>
     *
     * <p>状态流转：
     * <ul>
     *   <li>RINGING → ENDED：发起后未接听即挂断（VideoCallRecord 状态为 MISSED 或 REJECTED）</li>
     *   <li>ONGOING → ENDED：通话中正常挂断（VideoCallRecord 状态为 CONNECTED）</li>
     * </ul>
     * </p>
     *
     * @param roomId    通话房间 ID
     * @param userId    操作用户 ID（发起方或接收方）
     * @param endReason 结束原因：CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR
     * @return 通话视图（含最终状态与时长）
     * @throws IllegalArgumentException roomId 不存在或用户无权操作时抛出
     */
    @Transactional
    public VideoCallView endCall(String roomId, Long userId, String endReason) {
        if (roomId == null || roomId.isBlank()) {
            throw new IllegalArgumentException("通话房间 ID 不能为空");
        }
        if (userId == null) {
            throw new IllegalArgumentException("操作用户 ID 不能为空");
        }

        VideoCall call = videoCallRepository.findByRoomId(roomId)
                .orElseThrow(() -> new IllegalArgumentException("通话记录不存在"));

        // 权限校验：仅通话双方可结束
        if (!call.getCallerId().equals(userId) && !call.getCalleeId().equals(userId)) {
            throw new IllegalArgumentException("无权操作此通话");
        }

        // 已结束的通话不可再次结束
        if ("ENDED".equals(call.getStatus()) || "MISSED".equals(call.getStatus())
                || "REJECTED".equals(call.getStatus())) {
            throw new IllegalArgumentException("通话已结束，无需重复操作");
        }

        try {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            call.setEndedAt(now);
            call.setEndReason(endReason != null ? endReason : "CALLER_HANGUP");
            call.setStatus("ENDED");

            // 计算通话时长
            int durationSec = 0;
            if (call.getStartedAt() != null) {
                long ds = Duration.between(call.getStartedAt(), now).getSeconds();
                if (ds > MAX_CALL_DURATION_SEC) {
                    ds = MAX_CALL_DURATION_SEC;
                }
                durationSec = (int) ds;
            }
            call.setDurationSec(durationSec);
            call.setUpdatedAt(now);
            VideoCall saved = videoCallRepository.save(call);

            // 同步更新 VideoCallRecord（lambda 内引用的局部变量需为 final，
            // 因此把 durationSec 与 endReason 复制为 effectively final 变量）
            final int finalDurationSec = durationSec;
            final String finalEndReason = endReason != null ? endReason : "CALLER_HANGUP";
            try {
                videoCallRecordRepository.findByRoomId(roomId).ifPresent(record -> {
                    record.setEndTime(now);
                    record.setDuration(finalDurationSec);
                    // 根据结束原因映射 record 状态
                    record.setStatus(mapRecordStatus(finalEndReason, finalDurationSec));
                    record.setUpdatedAt(now);
                    videoCallRecordRepository.save(record);
                });
            } catch (DataAccessException rex) {
                // 历史记录更新失败不影响主流程，仅记录日志
                log.warn("更新通话历史记录失败：roomId={}", roomId, rex);
            }

            log.info("视频通话结束：roomId={}, userId={}, reason={}, duration={}s",
                    roomId, userId, call.getEndReason(), durationSec);
            return toView(saved);
        } catch (DataAccessException e) {
            // 数据库访问异常（save 失败等）
            log.error("视频通话结束失败：roomId={}, userId={}", roomId, userId, e);
            throw new RuntimeException("视频通话结束失败，请稍后重试", e);
        }
    }

    /**
     * 查询当前用户的通话记录列表。
     *
     * <p>返回用户作为发起方或接收方参与的所有通话记录，按开始时间倒序排列。</p>
     *
     * @param userId 当前用户 ID
     * @return 通话记录视图列表
     * @throws IllegalArgumentException userId 为空时抛出
     */
    @Transactional(readOnly = true)
    public List<VideoCallRecordView> getRecords(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        try {
            List<VideoCallRecord> records = videoCallRecordRepository
                    .findByCallerIdOrReceiverIdOrderByStartTimeDesc(userId, userId);
            List<VideoCallRecordView> views = new ArrayList<>(records.size());
            for (VideoCallRecord record : records) {
                views.add(toRecordView(record));
            }
            return views;
        } catch (DataAccessException e) {
            // 数据库访问异常
            log.error("查询通话记录失败：userId={}", userId, e);
            throw new RuntimeException("查询通话记录失败，请稍后重试", e);
        }
    }

    /**
     * 根据结束原因映射 VideoCallRecord 状态。
     *
     * @param endReason  结束原因
     * @param durationSec 通话时长（秒）
     * @return record 状态：CONNECTED / MISSED / REJECTED / FAILED
     */
    private String mapRecordStatus(String endReason, int durationSec) {
        if (durationSec > 0) {
            return "CONNECTED";
        }
        if (endReason == null) {
            return "MISSED";
        }
        switch (endReason) {
            case "REJECTED":
                return "REJECTED";
            case "NETWORK_ERROR":
                return "FAILED";
            case "TIMEOUT":
                return "MISSED";
            case "CALLER_HANGUP":
            case "CALLEE_HANGUP":
            default:
                return "MISSED";
        }
    }

    /**
     * VideoCall 实体转视图。
     */
    private VideoCallView toView(VideoCall call) {
        return new VideoCallView(
                call.getId(),
                call.getRoomId(),
                call.getCallerId(),
                call.getCalleeId(),
                call.getStatus(),
                call.getStartedAt() != null ? call.getStartedAt().toString() : null,
                call.getEndedAt() != null ? call.getEndedAt().toString() : null,
                call.getDurationSec(),
                call.getEndReason(),
                call.getCreatedAt() != null ? call.getCreatedAt().toString() : null
        );
    }

    /**
     * VideoCallRecord 实体转视图。
     */
    private VideoCallRecordView toRecordView(VideoCallRecord record) {
        return new VideoCallRecordView(
                record.getId(),
                record.getRoomId(),
                record.getCallerId(),
                record.getReceiverId(),
                record.getStartTime() != null ? record.getStartTime().toString() : null,
                record.getEndTime() != null ? record.getEndTime().toString() : null,
                record.getDuration(),
                record.getStatus(),
                record.getCreatedAt() != null ? record.getCreatedAt().toString() : null
        );
    }

    /**
     * 视频通话视图。
     *
     * @param id          通话记录 ID
     * @param roomId      通话房间 ID
     * @param callerId    发起方用户 ID
     * @param calleeId    接收方用户 ID
     * @param status      通话状态：RINGING/ONGOING/ENDED/MISSED/REJECTED
     * @param startedAt   通话开始时间（ISO 字符串，未开始为 null）
     * @param endedAt     通话结束时间（ISO 字符串，未结束为 null）
     * @param durationSec 通话时长（秒）
     * @param endReason   结束原因
     * @param createdAt   记录创建时间（ISO 字符串）
     */
    public record VideoCallView(
            Long id,
            String roomId,
            Long callerId,
            Long calleeId,
            String status,
            String startedAt,
            String endedAt,
            Integer durationSec,
            String endReason,
            String createdAt
    ) {
    }

    /**
     * 视频通话记录视图（用于历史列表展示）。
     *
     * @param id        通话记录 ID
     * @param roomId    通话房间 ID
     * @param callerId  发起方用户 ID
     * @param receiverId 接收方用户 ID
     * @param startTime 通话开始时间（ISO 字符串）
     * @param endTime   通话结束时间（ISO 字符串，未结束为 null）
     * @param duration  通话时长（秒，未接通为 0 或 null）
     * @param status    通话状态：INITIATING/CONNECTED/MISSED/REJECTED/FAILED
     * @param createdAt 记录创建时间（ISO 字符串）
     */
    public record VideoCallRecordView(
            Long id,
            String roomId,
            Long callerId,
            Long receiverId,
            String startTime,
            String endTime,
            Integer duration,
            String status,
            String createdAt
    ) {
    }
}
