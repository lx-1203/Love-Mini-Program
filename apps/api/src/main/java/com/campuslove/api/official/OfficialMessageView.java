package com.campuslove.api.official;

import java.time.LocalDateTime;

/**
 * 官方号消息视图。
 * text 类型仅 content 有效；card 类型附带卡片字段（标题/描述/角标/CTA）与活动卡快照。
 * R16（2026-09-07）新增 direction：仅双向会话消息携带（user / assistant），广播流为 null。
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
        OfficialActivityCardView cardActivity,
        String direction) {

    /** 兼容旧调用（无活动卡快照、无方向）的构造器 */
    public OfficialMessageView(
            Long id,
            String messageType,
            String content,
            String cardTitle,
            String cardDesc,
            String cardTag,
            String cardTargetUrl,
            LocalDateTime publishedAt) {
        this(id, messageType, content, cardTitle, cardDesc, cardTag, cardTargetUrl, publishedAt, null, null);
    }

    /** 兼容旧调用（有活动卡快照、无方向）的构造器 */
    public OfficialMessageView(
            Long id,
            String messageType,
            String content,
            String cardTitle,
            String cardDesc,
            String cardTag,
            String cardTargetUrl,
            LocalDateTime publishedAt,
            OfficialActivityCardView cardActivity) {
        this(id, messageType, content, cardTitle, cardDesc, cardTag, cardTargetUrl, publishedAt, cardActivity, null);
    }
}
