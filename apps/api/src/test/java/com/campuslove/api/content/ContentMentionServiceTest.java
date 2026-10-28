package com.campuslove.api.content;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.NotificationService;
import com.campuslove.api.entity.ContentMention;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.ContentMentionRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

/** ContentMentionService 单元测试（2026-10-28）。 */
class ContentMentionServiceTest {

    @Mock private ContentMentionRepository contentMentionRepository;
    @Mock private UserRepository userRepository;
    @Mock private CircleMembershipRepository circleMembershipRepository;
    @Mock private NotificationService notificationService;

    private ContentMentionService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new ContentMentionService(
                contentMentionRepository, userRepository, circleMembershipRepository);
        ReflectionTestUtils.setField(service, "notificationService", notificationService);
    }

    private User user(long id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    @Test
    void saveMentions_dedupesAndExcludesSelf() {
        when(userRepository.findAllById(any())).thenReturn(List.of(user(2L), user(3L)));
        when(circleMembershipRepository.findUserIdsByCircleId(9L)).thenReturn(List.of(1L, 2L, 3L));

        service.saveMentions(ContentMention.TARGET_TOPIC, 77L, 1L, 9L,
                java.util.Arrays.asList(1L, 2L, 2L, 3L, null));

        ArgumentCaptor<ContentMention> captor = ArgumentCaptor.forClass(ContentMention.class);
        verify(contentMentionRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertEquals(List.of(2L, 3L), captor.getAllValues().stream()
                .map(ContentMention::getMentionedUserId).toList());
        assertEquals(ContentMention.TARGET_TOPIC, captor.getAllValues().get(0).getTargetType());
    }

    @Test
    void saveMentions_rejectsOutsiderInCircle() {
        when(userRepository.findAllById(any())).thenReturn(List.of(user(2L)));
        when(circleMembershipRepository.findUserIdsByCircleId(9L)).thenReturn(List.of(1L));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.saveMentions(ContentMention.TARGET_TOPIC, 77L, 1L, 9L, List.of(2L)));
        assertEquals("只能 @ 同圈成员", ex.getMessage());
        verify(contentMentionRepository, never()).save(any());
    }

    @Test
    void notifyMentions_onlyNotifiesPendingAndMarksSent() {
        ContentMention pending = new ContentMention();
        pending.setTargetType(ContentMention.TARGET_TOPIC);
        pending.setTargetId(77L);
        pending.setMentionedUserId(2L);
        pending.setNotified(false);
        when(contentMentionRepository.findByTargetTypeAndTargetIdAndNotifiedFalse(
                ContentMention.TARGET_TOPIC, 77L)).thenReturn(List.of(pending));

        int sent = service.notifyMentions(
                ContentMention.TARGET_TOPIC, 77L, 1L, "topic", 77L);

        assertEquals(1, sent);
        verify(notificationService).createNotification(2L, "mention", 1L, 77L, "topic");
        verify(contentMentionRepository).save(pending);
        assertEquals(true, pending.getNotified());
    }

    @Test
    void notifyMentions_survivesNotificationFailure() {
        ContentMention pending = new ContentMention();
        pending.setTargetId(77L);
        pending.setMentionedUserId(2L);
        pending.setNotified(false);
        when(contentMentionRepository.findByTargetTypeAndTargetIdAndNotifiedFalse(
                eq(ContentMention.TARGET_REPLY), eq(88L))).thenReturn(List.of(pending));
        org.mockito.Mockito.doThrow(new IllegalStateException("ws down"))
                .when(notificationService).createNotification(anyLong(), eq("mention"), anyLong(), anyLong(), any());

        int sent = service.notifyMentions(
                ContentMention.TARGET_REPLY, 88L, 1L, "comment", 77L);

        assertEquals(0, sent);
        verify(contentMentionRepository, never()).save(any());
    }
}
