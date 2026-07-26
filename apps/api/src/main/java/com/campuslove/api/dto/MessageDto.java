package com.campuslove.api.dto;

import java.time.Instant;
import java.util.Map;

/**
 * 消息 DTO。
 *
 * <p>对应聊天会话中的单条消息，覆盖文本、图片、语音、视频、系统消息等类型，
 * 用于私聊、临时聊天等消息展示场景。</p>
 *
 * <p><strong>type 字段取值：</strong>
 * <ul>
 *   <li>{@code text}：纯文本消息</li>
 *   <li>{@code image}：图片消息（attachments 含图片 URL）</li>
 *   <li>{@code voice}：语音消息（attachments 含语音文件 URL 与时长）</li>
 *   <li>{@code video}：视频消息（attachments 含视频封面与 URL）</li>
 *   <li>{@code system}：系统消息（如匹配成功、解匹配通知等）</li>
 * </ul>
 * </p>
 *
 * <p><strong>status 字段取值（消息投递状态机）：</strong>
 * <ul>
 *   <li>{@code sending}：发送中（客户端已发送，服务端尚未确认）</li>
 *   <li>{@code sent}：已发送（服务端已落库）</li>
 *   <li>{@code delivered}：已送达（接收方设备已收到推送）</li>
 *   <li>{@code read}：已读（接收方已查看）</li>
 *   <li>{@code failed}：发送失败（网络异常或风控拦截）</li>
 * </ul>
 * </p>
 *
 * <p><strong>attachments 字段说明：</strong>
 * 不同 type 的消息携带不同的附加数据，使用 {@code Map<String, Object>} 灵活承载，
 * 例如图片消息的 {@code {url:"...", width:1080, height:1920}}。
 * 纯文本消息时该字段为 {@code null} 或空 Map。</p>
 *
 * <p><strong>注意：</strong>当前项目中尚不存在独立的 {@code Message} 实体，
 * 私聊消息以 {@link com.campuslove.api.entity.PrivateMessage} 形式存储。
 * 本 DTO 作为统一的消息传输对象先行定义，
 * 由 {@link DtoMapper#toMessageDto(PrivateMessage)} 完成映射。</p>
 *
 * @since 2026-07-26
 */
public class MessageDto extends BaseDto {

    /** 消息 ID */
    private Long id;

    /** 所属会话 ID */
    private Long sessionId;

    /** 发送者用户 ID */
    private Long senderId;

    /** 消息类型（text/image/voice/video/system） */
    private String type;

    /** 消息正文（文本内容或系统消息文本） */
    private String content;

    /** 附加数据（图片/语音/视频的 URL 与元信息），可空 */
    private Map<String, Object> attachments;

    /** 发送时间（UTC），由客户端发送时确定 */
    private Instant sentAt;

    /** 送达时间（UTC），接收方设备确认收到时填入，未送达为 null */
    private Instant deliveredAt;

    /** 已读时间（UTC），接收方查看时填入，未读为 null */
    private Instant readAt;

    /** 投递状态（sending/sent/delivered/read/failed） */
    private String status;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Map<String, Object> getAttachments() {
        return attachments;
    }

    public void setAttachments(Map<String, Object> attachments) {
        this.attachments = attachments;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(Instant deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public void setReadAt(Instant readAt) {
        this.readAt = readAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
