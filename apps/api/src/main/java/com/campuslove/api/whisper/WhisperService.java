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
}
