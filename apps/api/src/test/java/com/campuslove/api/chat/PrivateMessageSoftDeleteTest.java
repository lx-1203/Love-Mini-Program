package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * 私信消息软删冒烟测试（3-G 删除消息）。
 *
 * <p>覆盖 {@link RealPrivateMessageService#softDeleteMessage} 的属主校验与幂等语义
 * （微信语义：仅删除者对自己隐藏，不删对方）。</p>
 */
class PrivateMessageSoftDeleteTest {

    @Mock private PrivateConversationRepository conversationRepository;
    @Mock private PrivateMessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private com.campuslove.api.config.SensitiveWordFilter sensitiveWordFilter;
    @Mock private UserBlockRepository blockRepository;

    private RealPrivateMessageService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new RealPrivateMessageService(conversationRepository, messageRepository,
                userRepository, messagingTemplate, sensitiveWordFilter, blockRepository);
    }

    private PrivateMessage message(Long id, Long senderId) {
        PrivateMessage m = new PrivateMessage();
        m.setId(id);
        m.setSenderId(senderId);
        m.setDeletedForSender(false);
        return m;
    }

    @Test
    void softDelete_shouldMarkDeletedForSender_onlyByOwner() {
        PrivateMessage msg = message(10L, 1L);
        when(messageRepository.findById(10L)).thenReturn(Optional.of(msg));

        service.softDeleteMessage(10L, 1L);

        assertTrue(msg.getDeletedForSender());
        verify(messageRepository).save(msg);
    }

    @Test
    void softDelete_shouldReturn404_whenMessageNotExists() {
        when(messageRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.softDeleteMessage(99L, 1L));
        verify(messageRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void softDelete_shouldReturn404_whenNotOwner() {
        PrivateMessage msg = message(10L, 1L);
        when(messageRepository.findById(10L)).thenReturn(Optional.of(msg));

        // 非发送者删除他人消息：按「不存在」处理（防 IDOR，不泄露消息归属）
        assertThrows(ResourceNotFoundException.class, () -> service.softDeleteMessage(10L, 2L));
        assertFalse(msg.getDeletedForSender());
        verify(messageRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void softDelete_shouldBeIdempotent_whenAlreadyDeleted() {
        PrivateMessage msg = message(10L, 1L);
        msg.setDeletedForSender(true);
        when(messageRepository.findById(10L)).thenReturn(Optional.of(msg));

        service.softDeleteMessage(10L, 1L);

        // 已软删：幂等成功，不重复保存
        verify(messageRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
