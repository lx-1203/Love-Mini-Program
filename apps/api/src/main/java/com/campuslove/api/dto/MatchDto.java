package com.campuslove.api.dto;

import java.time.Instant;

/**
 * 匹配关系 DTO。
 *
 * <p>表示当前用户与某位匹配对象之间的匹配关系，附带最近一条消息预览
 * 与未读计数，用于匹配列表/会话列表的展示。</p>
 *
 * <p><strong>注意：</strong>当前项目中尚不存在独立的 {@code Match} 实体
 * （匹配关系暂以 {@code HeartSignal} 等形式存储）。
 * 本 DTO 作为匹配列表的对外传输对象先行定义，
 * 待 Match 实体引入后，由 {@link DtoMapper#toMatchDto} 完成映射。</p>
 *
 * @since 2026-07-26
 */
public class MatchDto {

    /** 匹配关系 ID */
    private Long id;

    /** 匹配对方用户简要信息 */
    private UserBriefDto partner;

    /** 匹配建立时间（UTC） */
    private Instant matchedAt;

    /** 最近一条消息的时间（UTC），无消息时为 null */
    private Instant lastMessageAt;

    /** 最近一条消息的预览文本（截断后的字符串） */
    private String lastMessagePreview;

    /** 当前用户在该匹配会话中的未读消息数 */
    private int unreadCount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserBriefDto getPartner() {
        return partner;
    }

    public void setPartner(UserBriefDto partner) {
        this.partner = partner;
    }

    public Instant getMatchedAt() {
        return matchedAt;
    }

    public void setMatchedAt(Instant matchedAt) {
        this.matchedAt = matchedAt;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(Instant lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }

    public String getLastMessagePreview() {
        return lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }
}
