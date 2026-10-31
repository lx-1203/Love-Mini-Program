package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * {@link RealPrivateMessageService#markAsRead} 的会话参与者校验单元测试（S2-2，2026-10-30）。
 *
 * <p><b>缺陷基线（修复前）</b>：该方法只校验入参非空，随后直接执行
 * {@code messageRepository.markAsReadByConversationAndSenderNot(conversationId, userId)}。
 * 该 JPQL（{@code PrivateMessageRepository:122}）是
 * {@code UPDATE PrivateMessage m SET m.isRead = true WHERE m.conversation.id = :conversationId
 * AND m.senderId <> :currentUserId AND m.isRead = false}——
 * <b>完全不校验调用方是否是该会话的参与者</b>。任何登录用户枚举 conversationId 就能：
 * 清掉他人的未读角标、伪造对方可见的「已读」回执，并摧毁骚扰举报里的「对方未读」证据。
 * 同域的其余方法（{@code getMessages} / {@code markUnread} / {@code pinConversation} /
 * {@code setConversationMuted} / {@code deleteConversation}）都有参与者校验，唯独这条漏了。</p>
 *
 * <p>本测试把修复后的契约钉死，<b>移除参与者校验即变红</b>：</p>
 * <ul>
 *   <li>非参与者 → 与兄弟方法逐字相同的
 *       {@link IllegalArgumentException}「User is not a participant of this conversation」，
 *       且批量 UPDATE 与会话保存都不得触达</li>
 *   <li>会话不存在 → {@code IllegalArgumentException}「Conversation not found: 」（同兄弟方法的 400 语义）</li>
 *   <li>真实参与者（userA / userB）→ 正常标记已读，并只清自己一侧的「标为未读」标记</li>
 * </ul>
 */
@DisplayName("RealPrivateMessageService#markAsRead - 会话参与者校验")
class PrivateMessageMarkAsReadScopeTest {

    private static final Long CONVERSATION_ID = 7L;
    private static final Long USER_A = 100L;
    private static final Long USER_B = 200L;
    private static final Long OUTSIDER = 999L;

    @Mock private PrivateConversationRepository conversationRepository;
    @Mock private PrivateMessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private SensitiveWordFilter sensitiveWordFilter;
    @Mock private UserBlockRepository blockRepository;

    private RealPrivateMessageService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new RealPrivateMessageService(conversationRepository, messageRepository,
                userRepository, messagingTemplate, sensitiveWordFilter, blockRepository,
                // S2-1（2026-10-30）新增的事务管理器参数：markAsRead 走方法级 @Transactional，
                // 本用例不触达 sendMessage 的编程式事务边界，mock 即可。
                mock(PlatformTransactionManager.class));
    }

    /** 造一个 100 ↔ 200 的会话。 */
    private static PrivateConversation conversation(Long id, Long userAId, Long userBId) {
        PrivateConversation c = new PrivateConversation();
        c.setId(id);
        c.setUserAId(userAId);
        c.setUserBId(userBId);
        return c;
    }

    @Test
    @DisplayName("非参与者：抛与兄弟方法相同的异常，且批量已读 UPDATE 绝不执行")
    void markAsRead_outsider_throwsAndNeverTouchesBulkUpdate() {
        when(conversationRepository.findById(CONVERSATION_ID))
                .thenReturn(Optional.of(conversation(CONVERSATION_ID, USER_A, USER_B)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.markAsRead(CONVERSATION_ID, OUTSIDER));
        assertEquals("User is not a participant of this conversation", ex.getMessage());

        // 关键断言：越权调用不得对他人消息产生任何写入（修复前这里会被调用）
        verify(messageRepository, never()).markAsReadByConversationAndSenderNot(any(), any());
        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("会话不存在：抛「Conversation not found」（同兄弟方法的 400 语义），不执行 UPDATE")
    void markAsRead_missingConversation_throwsAndNeverTouchesBulkUpdate() {
        when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.markAsRead(CONVERSATION_ID, USER_A));
        assertEquals("Conversation not found: " + CONVERSATION_ID, ex.getMessage());

        verify(messageRepository, never()).markAsReadByConversationAndSenderNot(any(), any());
        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("参与者 userA：正常标记对方消息为已读")
    void markAsRead_participantA_marksRead() {
        when(conversationRepository.findById(CONVERSATION_ID))
                .thenReturn(Optional.of(conversation(CONVERSATION_ID, USER_A, USER_B)));

        service.markAsRead(CONVERSATION_ID, USER_A);

        verify(messageRepository).markAsReadByConversationAndSenderNot(CONVERSATION_ID, USER_A);
        // 未标未读 → 不额外写会话
        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("参与者 userB：正常标记已读，并只清自己一侧的「标为未读」标记")
    void markAsRead_participantB_marksReadAndClearsOwnUnreadFlag() {
        PrivateConversation conv = conversation(CONVERSATION_ID, USER_A, USER_B);
        conv.setUserBMarkedUnread(true);
        conv.setUserAMarkedUnread(true);
        when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conv));

        service.markAsRead(CONVERSATION_ID, USER_B);

        verify(messageRepository).markAsReadByConversationAndSenderNot(CONVERSATION_ID, USER_B);
        verify(conversationRepository).save(conv);
        assertFalse(conv.getUserBMarkedUnread(), "userB 自己的未读标记应被清掉");
        assertTrue(conv.getUserAMarkedUnread(), "不得越权清掉 userA 侧的未读标记");
    }

    @Test
    @DisplayName("入参为空：在触达任何仓储之前就被拒绝")
    void markAsRead_nullArguments_failBeforeRepositoryAccess() {
        assertThrows(IllegalArgumentException.class, () -> service.markAsRead(null, USER_A));
        assertThrows(IllegalArgumentException.class, () -> service.markAsRead(CONVERSATION_ID, null));

        verifyNoInteractions(conversationRepository);
        verifyNoInteractions(messageRepository);
    }
}
