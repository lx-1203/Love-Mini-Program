package com.campuslove.api.official;

import java.time.LocalDateTime;

/**
 * 官方号消息视图。
 * text 类型仅 content 有效；card 类型附带卡片字段（标题/描述/角标/CTA）与活动卡快照。
 */
public record OfficialMessageView(
        Long id,
        String messageType,
        String content,
        String cardTitle,
        String cardDesc,
        String cardTag,
        String cardTargetUrl,
        LocalDateTime publishedAt,
        OfficialActivityCardView cardActivity) {

    /** 兼容旧调用（无活动卡快照）的构造器 */
    public OfficialMessageView(
            Long id,
            String messageType,
            String content,
            String cardTitle,
            String cardDesc,
            String cardTag,
            String cardTargetUrl,
            LocalDateTime publishedAt) {
        this(id, messageType, content, cardTitle, cardDesc, cardTag, cardTargetUrl, publishedAt, null);
    }
}
