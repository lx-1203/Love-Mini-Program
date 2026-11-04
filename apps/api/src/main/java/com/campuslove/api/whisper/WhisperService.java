package com.campuslove.api.whisper;

import com.campuslove.api.whisper.WhisperViews.WhisperMessageView;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import java.util.List;

/**
 * 悄悄话领域服务（v3.1 统一 Whisper 模型）。
 */
public interface WhisperService {

    /** 发送付费悄悄话（幂等 clientRequestId；钱包扣费与创建同事务，失败自动退款） */
    WhisperMessageView send(Long senderId, WhisperSendRequest request);

    /** 收件箱（接收者视角；SENT → DELIVERED） */
    List<WhisperMessageView> inbox(Long receiverId);

    /** 已发送（发送者视角） */
    List<WhisperMessageView> sent(Long senderId);

    /** 标记已读 */
    WhisperMessageView markRead(Long receiverId, Long whisperId);

    /**
     * 收件箱（R8 2026-11-04 分页重载）：size 为 null 时全量（与 {@link #inbox(Long)} 同语义，
     * 契约向后兼容）；size 有值时按页返回（page 从 0 起，服务端 clamp 到 [1,100]）。
     * 默认委托全量（Mock/旧实现自动兼容），Real 覆写实现真分页。
     */
    default List<WhisperMessageView> inbox(Long receiverId, Integer page, Integer size) {
        return inbox(receiverId);
    }

    /** 已发送（R8 2026-11-04 分页重载，口径同上） */
    default List<WhisperMessageView> sent(Long senderId, Integer page, Integer size) {
        return sent(senderId);
    }

    /**
     * R9-b（2026-11-05）：收件人未读数（SENT/DELIVERED 计未读；
     * PAY_FAILED/REFUNDED 审计行不计——不在收件箱可见口径内，见 R5-1）。
     */
    default long unreadCount(Long receiverId) {
        return 0;
    }
}
