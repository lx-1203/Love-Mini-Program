package com.campuslove.api.official;

import java.time.LocalDateTime;

/**
 * 官方号消息视图。
 * text 类型仅 content 有效；card 类型附带卡片字段（标题/描述/角标/CTA）。
 */
public record OfficialMessageView(
        Long id,
        String messageType,
        String content,
        String cardTitle,
        String cardDesc,
        String cardTag,
        String cardTargetUrl,
        LocalDateTime publishedAt) {
}
