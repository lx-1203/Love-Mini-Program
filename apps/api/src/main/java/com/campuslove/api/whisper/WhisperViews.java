package com.campuslove.api.whisper;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 悄悄话契约视图（v3.1）。
 */
public final class WhisperViews {

    private WhisperViews() {
    }

    /** 发送请求（幂等：clientRequestId） */
    public record WhisperSendRequest(
        @NotNull Long receiverId,
        @NotBlank @Size(max = 60) String content,
        @NotBlank @Size(max = 64) String clientRequestId
    ) {
    }

    /** 悄悄话视图 */
    public record WhisperMessageView(
        Long id,
        Long senderId,
        Long receiverId,
        String content,
        String status,
        Long priceCents,
        String createdAt,
        String readAt
    ) {
    }
}
