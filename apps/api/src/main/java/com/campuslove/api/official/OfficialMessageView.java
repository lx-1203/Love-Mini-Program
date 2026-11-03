package com.campuslove.api.official;

import java.time.LocalDateTime;

/**
 * 官方号消息视图。
 * text 类型仅 content 有效；card 类型附带卡片字段（标题/描述/角标/CTA）与活动卡快照。
 * R16（2026-09-07）新增 direction：仅双向会话消息携带（user / assistant），广播流为 null。
 * P1-2（2026-11-03）新增受众字段：audienceType（ALL/CAMPUS/CIRCLE）+ audienceValue——
 * 管理端展示用；用户端消息流已按当前用户归属过滤后下发，客户端无需再判。
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
        String direction,
        String audienceType,
        String audienceValue) {

    /** 兼容旧调用（无活动卡快照、无方向、无受众）的构造器 */
    public OfficialMessageView(
            Long id,
            String messageType,
            String content,
            String cardTitle,
            String cardDesc,
            String cardTag,
            String cardTargetUrl,
            LocalDateTime publishedAt) {
        this(id, messageType, content, cardTitle, cardDesc, cardTag, cardTargetUrl,
                publishedAt, null, null, null, null);
    }

    /** 兼容旧调用（有活动卡快照、无方向/受众）的构造器 */
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
        this(id, messageType, content, cardTitle, cardDesc, cardTag, cardTargetUrl,
                publishedAt, cardActivity, null, null, null);
    }

    /** 兼容旧调用（有活动卡快照与方向、无受众）的构造器 */
    public OfficialMessageView(
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
        this(id, messageType, content, cardTitle, cardDesc, cardTag, cardTargetUrl,
                publishedAt, cardActivity, direction, null, null);
    }
}
