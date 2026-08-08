package com.campuslove.api.chat;

import com.campuslove.api.chat.VideoCallService.VideoCallRecordView;
import com.campuslove.api.chat.VideoCallService.VideoCallView;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 视频通话控制器。
 * <p>提供视频通话的发起、结束与通话记录查询接口。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/chat/video-call/start：发起视频通话，返回 roomId</li>
 *   <li>POST /api/chat/video-call/end：结束视频通话，更新状态与时长</li>
 *   <li>GET /api/chat/video-call/records：查询当前用户的通话记录列表</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，操作用户 ID 从 JWT 上下文获取，
 * 避免客户端伪造身份。</p>
 *
 * <p>mp-weixin 兼容：前端通过 uni.request 调用此接口，
 * 拿到 roomId 后通过 WebSocket 信令协商 SDP/ICE 建立 WebRTC 连接。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/chat/video-call")
public class VideoCallController {

    private final VideoCallService videoCallService;

    public VideoCallController(VideoCallService videoCallService) {
        this.videoCallService = videoCallService;
    }

    /**
     * 发起视频通话。
     * <p>从 JWT 上下文获取发起方 ID，校验请求体后调用服务创建通话记录。</p>
     *
     * @param request 发起通话请求体（含接收方 ID）
     * @return 通话视图（含 roomId 供前端建立连接）
     */
    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    // infra R2-00256: 呼叫接口补限流（每 10 秒 1 次/突发 10 次按 IP），防止任意用户轰炸他人呼叫
    @RateLimit(capacity = 10, refillTokens = 0.2, key = "#request.remoteAddr")
    @PreAuthorize("hasRole('USER')")
    public VideoCallView startCall(@Valid @RequestBody StartCallRequest request) {
        Long callerId = SecurityUtils.getCurrentUserId();
        return videoCallService.startCall(callerId, request.calleeId());
    }

    /**
     * 接听视频通话（R4-00324）。
     * <p>仅被叫方可接听；RINGING → ONGOING 并记录 startedAt
     * （R4-00323：此前 startedAt 无赋值，通话时长恒 0、CONNECTED 不可达）。</p>
     *
     * @param request 接听请求体（含 roomId）
     * @return 通话视图（status=ONGOING，startedAt 已填充）
     */
    @PostMapping("/accept")
    @PreAuthorize("hasRole('USER')")
    public VideoCallView acceptCall(@Valid @RequestBody RoomIdRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return videoCallService.acceptCall(request.roomId(), userId);
    }

    /**
     * 拒绝视频通话（R4-00324）。
     * <p>仅被叫方可拒绝；RINGING → REJECTED，通话记录状态置为 REJECTED。</p>
     *
     * @param request 拒绝请求体（含 roomId）
     * @return 通话视图（status=REJECTED）
     */
    @PostMapping("/reject")
    @PreAuthorize("hasRole('USER')")
    public VideoCallView rejectCall(@Valid @RequestBody RoomIdRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return videoCallService.rejectCall(request.roomId(), userId);
    }

    /**
     * 结束视频通话。
     *
     * @param request 结束通话请求体（含 roomId 与结束原因）
     * @return 通话视图（含最终状态与时长）
     */
    @PostMapping("/end")
    @PreAuthorize("hasRole('USER')")
    public VideoCallView endCall(@Valid @RequestBody EndCallRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return videoCallService.endCall(request.roomId(), userId, request.endReason());
    }

    /**
     * 查询当前用户的通话记录列表。
     *
     * <p>返回当前用户作为发起方或接收方参与的所有通话记录，按开始时间倒序排列。
     * 用于前端"通话记录"页面展示。</p>
     *
     * @return 通话记录视图列表
     */
    @GetMapping("/records")
    public List<VideoCallRecordView> getRecords() {
        Long userId = SecurityUtils.getCurrentUserId();
        return videoCallService.getRecords(userId);
    }
}

/**
 * 发起视频通话请求体。
 *
 * @param calleeId 接收方用户 ID（必填）
 */
record StartCallRequest(
        @NotNull @Positive Long calleeId
) {
}

/**
 * 视频通话房间 ID 请求体（R4-00324：接听/拒绝共用）。
 *
 * @param roomId 通话房间 ID（必填，最长 64 字符）
 */
record RoomIdRequest(
        @NotNull
        @Size(max = 64)
        String roomId
) {
}

/**
 * 结束视频通话请求体。
 *
 * @param roomId    通话房间 ID（必填，最长 64 字符）
 * @param endReason 结束原因（可选，必须为 CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR）
 */
record EndCallRequest(
        @NotNull
        @Size(max = 64)
        String roomId,
        @Pattern(regexp = "CALLER_HANGUP|CALLEE_HANGUP|TIMEOUT|NETWORK_ERROR",
                message = "endReason 必须为 CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR")
        String endReason
) {
}
