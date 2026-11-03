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
        String readAt,
        /**
         * 发送者昵称/头像（R8 2026-11-04）：inbox/sent 组装时按发送者资料批量填充，
         * send/read 单条返回不填充（发送者视角已知内容、收件人视角走列表刷新）。
         * 可空：发送者注销/资料缺失时客户端兜底「神秘访客」文案。
         */
        String senderNickname,
        String senderAvatar
    ) {
    }
}
