package com.campuslove.api.whisper;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.whisper.WhisperViews.WhisperMessageView;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 悄悄话（付费留言）控制器。
 * POST /api/v1/whispers/send · GET /inbox · GET /sent · POST /{id}/read
 */
@RestController
@RequestMapping("/api/v1/whispers")
public class WhisperController {

    private final WhisperService whisperService;

    public WhisperController(WhisperService whisperService) {
        this.whisperService = whisperService;
    }

    @PostMapping("/send")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<WhisperMessageView> send(@Valid @RequestBody WhisperSendRequest request) {
        Long senderId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.send(senderId, request));
    }

    /**
     * 收件箱（R8 2026-11-04）：可选 page/size 分页——size 缺省时全量返回（契约向后兼容），
     * size 有值时服务端 clamp 到 [1,100]；视图含发送者昵称/头像（资料缺失为 null，客户端兜底）。
     */
    @GetMapping("/inbox")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<WhisperMessageView>> inbox(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.inbox(userId, page, size));
    }

    /** 已发送（R8 2026-11-04 分页口径同 inbox） */
    @GetMapping("/sent")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<WhisperMessageView>> sent(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.sent(userId, page, size));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<WhisperMessageView> markRead(@PathVariable("id") Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.markRead(userId, id));
    }
}
