package com.campuslove.api.match;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.Visitor;
import com.campuslove.api.mq.MessageProducer;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VisitorRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * MatchRecorder 单元测试（Task 4.2.1）。
 *
 * <p>覆盖 Like/Pass/Visitor/HeartSignal 记录管理与通知。</p>
 */
class MatchRecorderTest {

    @Mock private MatchConfig matchConfig;
    @Mock private LikeRepository likeRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private VisitorRepository visitorRepository;
    @Mock private PassRecordRepository passRecordRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private InteractionEventService interactionEventService;
    @Mock private MessageProducer messageProducer;

    private MatchRecorder matchRecorder;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        matchRecorder = new MatchRecorder(
                matchConfig, likeRepository, heartSignalRepository, visitorRepository,
                passRecordRepository, userRepository, userCampusProfileRepository,
                messagingTemplate, interactionEventService, messageProducer);
        when(matchConfig.getHeartSignalExpireHours()).thenReturn(24);
    }

    /**
     * 场景：findExistingLike 应委托给 likeRepository。
     */
    @Test
    void findExistingLike_delegatesToRepository() {
        Like like = new Like();
        like.setUserId(1L);
        like.setTargetUserId(2L);
        when(likeRepository.findByUserIdAndTargetUserId(1L, 2L)).thenReturn(Optional.of(like));

        Optional<Like> result = matchRecorder.findExistingLike(1L, 2L);

        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getUserId());
    }

    /**
     * 场景：createLike 应创建 active 状态的 Like 记录。
     */
    @Test
    void createLike_setsActiveStatus() {
        ArgumentCaptor<Like> captor = ArgumentCaptor.forClass(Like.class);
        when(likeRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        Like result = matchRecorder.createLike(1L, 2L, LocalDateTime.now());

        assertEquals(LikeStatus.active, result.getStatus());
        assertEquals(1L, result.getUserId());
        assertEquals(2L, result.getTargetUserId());
        Like saved = captor.getValue();
        assertEquals(LikeStatus.active, saved.getStatus());
    }

    /**
     * 场景：cancelLike 应将状态置为 cancelled。
     */
    @Test
    void cancelLike_setsCancelledStatus() {
        Like like = new Like();
        like.setUserId(1L);
        like.setTargetUserId(2L);
        like.setStatus(LikeStatus.active);
        when(likeRepository.findByUserIdAndTargetUserId(1L, 2L)).thenReturn(Optional.of(like));

        matchRecorder.cancelLike(1L, 2L);

        assertEquals(LikeStatus.cancelled, like.getStatus());
        verify(likeRepository).save(like);
    }

    /**
     * 场景：cancelLike 不存在记录时不执行任何操作。
     */
    @Test
    void cancelLike_notExists_doesNothing() {
        when(likeRepository.findByUserIdAndTargetUserId(1L, 2L)).thenReturn(Optional.empty());

        matchRecorder.cancelLike(1L, 2L);

        verify(likeRepository, never()).save(any());
    }

    /**
     * 场景：createMutualSignal 应创建 pending 状态的 mutual_like 信号。
     */
    @Test
    void createMutualSignal_setsPendingAndMutualLikeType() {
        ArgumentCaptor<HeartSignal> captor = ArgumentCaptor.forClass(HeartSignal.class);
        when(heartSignalRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime now = LocalDateTime.now();
        HeartSignal result = matchRecorder.createMutualSignal(1L, 2L, now);

        assertEquals(SignalStatus.pending, result.getStatus());
        assertEquals("mutual_like", result.getMatchType());
        assertEquals(1L, result.getUserAId());
        assertEquals(2L, result.getUserBId());
        assertEquals(now.plusHours(24), result.getExpiresAt());
    }

    /**
     * 场景：recordPass 已存在记录时不重复创建。
     */
    @Test
    void recordPass_alreadyExists_doesNotSave() {
        when(passRecordRepository.existsByUserIdAndPassedUserId(1L, 2L)).thenReturn(true);

        matchRecorder.recordPass(1L, 2L);

        verify(passRecordRepository, never()).save(any());
    }

    /**
     * 场景：recordPass 首次 pass 应创建 PassRecord。
     */
    @Test
    void recordPass_firstTime_savesRecord() {
        when(passRecordRepository.existsByUserIdAndPassedUserId(1L, 2L)).thenReturn(false);
        ArgumentCaptor<PassRecord> captor = ArgumentCaptor.forClass(PassRecord.class);
        when(passRecordRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        matchRecorder.recordPass(1L, 2L);

        PassRecord saved = captor.getValue();
        assertEquals(1L, saved.getUserId());
        assertEquals(2L, saved.getPassedUserId());
    }

    /**
     * 场景：recordVisit 当天已访问过不重复记录。
     * 缺陷修复：exists 派生查询参数为 LocalDateTime 时刻区间
     * （today.atStartOfDay() ~ 明日 atStartOfDay()）。
     */
    @Test
    void recordVisit_alreadyVisitedToday_doesNotSave() {
        when(visitorRepository.existsByVisitorIdAndVisitedUserIdAndCreatedAtBetween(
                anyLong(), anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(true);

        matchRecorder.recordVisit(1L, 2L);

        verify(visitorRepository, never()).save(any());
        verify(interactionEventService, never()).recordEvent(anyLong(), anyLong(),
                anyString(), any(), anyString(), anyString());
    }

    /**
     * 场景：recordVisit 首次访问应保存 Visitor 并记录事件。
     */
    @Test
    void recordVisit_firstVisit_savesAndNotifies() {
        when(visitorRepository.existsByVisitorIdAndVisitedUserIdAndCreatedAtBetween(
                anyLong(), anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(false);

        matchRecorder.recordVisit(1L, 2L);

        verify(visitorRepository, times(1)).save(any(Visitor.class));
        verify(interactionEventService, times(1)).recordEvent(
                eq(2L), eq(1L), eq("NEW_VISITOR"), any(), eq("USER"), anyString());
    }

    // ---- 辅助方法 ----

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
