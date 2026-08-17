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

    @GetMapping("/inbox")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<WhisperMessageView>> inbox() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.inbox(userId));
    }

    @GetMapping("/sent")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<WhisperMessageView>> sent() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.sent(userId));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<WhisperMessageView> markRead(@PathVariable("id") Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(whisperService.markRead(userId, id));
    }
}
