package com.campuslove.api.match;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.chat.PrivateMessageService;
import com.campuslove.api.common.DailyLimitExceededException;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.mq.MessageProducer;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.VisitorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * RealMatchService 单元测试。
 *
 * <p>Task 4.2.1 重构后：RealMatchService 委托 {@link MatchEngine}/{@link MatchPolicy}/{@link MatchRecorder}
 * 三个组件。本测试使用真实 MatchPolicy/MatchRecorder 实例（注入 mocked repositories），
 * 保留对 rewind 流程的端到端覆盖。</p>
 *
 * <p>测试场景：</p>
 * <ul>
 *   <li>rewind happy path：首次 rewind 删除最近一条 pass 记录，递增计数器</li>
 *   <li>rewind 超出每日上限：抛 {@link DailyLimitExceededException}</li>
 *   <li>rewind 无可撤销 pass 记录：返回失败结果，不消耗配额</li>
 *   <li>rewind userId=null：抛 IllegalArgumentException</li>
 *   <li>Redis 不可用时降级到本地内存计数</li>
 *   <li>Redis 异常不影响 rewind 主流程（graceful degradation）</li>
 * </ul>
 */
class RealMatchServiceTest {

    @Mock private MatchConfig matchConfig;
    @Mock private LikeRepository likeRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private VisitorRepository visitorRepository;
    @Mock private PassRecordRepository passRecordRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private ObjectMapper objectMapper;
    @Mock private InteractionEventService interactionEventService;
    @Mock private MessageProducer messageProducer;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ValueOperations<String, Object> valueOperations;
    @Mock private PrivateMessageService privateMessageService;

    private RealMatchService realMatchService;
    private MatchPolicy matchPolicy;
    private MatchRecorder matchRecorder;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        // 真实 MatchPolicy 实例：rewind 限额逻辑（RedisTemplate 通过 setter 注入）
        matchPolicy = new MatchPolicy();
        matchPolicy.setRedisTemplate(redisTemplate);

        // 真实 MatchRecorder 实例：rewind 持久化逻辑委托 passRecordRepository
        matchRecorder = new MatchRecorder(
                matchConfig,
                likeRepository,
                heartSignalRepository,
                visitorRepository,
                passRecordRepository,
                userRepository,
                userCampusProfileRepository,
                messagingTemplate,
                interactionEventService,
                messageProducer
        );

        realMatchService = new RealMatchService(
                matchConfig,
                likeRepository,
                heartSignalRepository,
                visitorRepository,
                passRecordRepository,
                userRepository,
                userCampusProfileRepository,
                userBasicProfileRepository,
                userScheduleProfileRepository,
                messagingTemplate,
                objectMapper,
                interactionEventService,
                messageProducer,
                new MatchEngine(
                        matchConfig,
                        likeRepository,
                        heartSignalRepository,
                        passRecordRepository,
                        userRepository,
                        userCampusProfileRepository,
                        userBasicProfileRepository,
                        userScheduleProfileRepository,
                        objectMapper
                ),
                matchPolicy,
                matchRecorder,
                null,
                privateMessageService
        );

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    // ==================================================================
    // rewind - happy path
    // ==================================================================

    @Test
    void rewind_firstTimeToday_shouldSucceedAndIncrementCounter() {
        Long userId = 100L;
        PassRecord latestPass = createPassRecord(10L, userId, 200L);

        when(valueOperations.get(eq("rewind:count:100:" + todayKey()))).thenReturn(0);
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(latestPass));
        when(valueOperations.increment(anyString())).thenReturn(1L);

        RewindResultView result = realMatchService.rewind(userId);

        assertTrue(result.success(), "首次 rewind 应成功");
        assertEquals("已撤销对用户的 pass 操作", result.message());

        verify(passRecordRepository, times(1)).delete(latestPass);
        verify(valueOperations, times(1)).increment(anyString());
        verify(redisTemplate, times(1)).expire(anyString(), eq(36L), eq(java.util.concurrent.TimeUnit.HOURS));
    }

    @Test
    void rewind_whenDailyLimitExceeded_shouldThrowDailyLimitExceededException() {
        Long userId = 100L;

        // infra R2-00224: 限额改为原子 INCR 判定（INCR 返回值 > 上限即拒绝），
        // 不再依赖先 GET 再递增的两步校验
        when(valueOperations.increment(anyString())).thenReturn(2L);

        DailyLimitExceededException ex = assertThrows(DailyLimitExceededException.class,
                () -> realMatchService.rewind(userId));

        assertEquals("反悔", ex.getOperationName());
        assertEquals(1, ex.getDailyLimit());
        assertTrue(ex.getMessage().contains("今日反悔次数已用完"));

        verify(passRecordRepository, never()).findByUserIdOrderByCreatedAtDesc(anyLong());
        verify(passRecordRepository, never()).delete(any());
        verify(valueOperations, times(1)).increment(anyString());
        verify(valueOperations, times(1)).decrement(anyString());
    }

    @Test
    void rewind_whenNoPassRecord_shouldReturnFailureWithoutConsumingQuota() {
        Long userId = 100L;

        // infra R2-00224: 先原子 INCR 占用额度，无记录时回滚（decrement）
        when(valueOperations.increment(anyString())).thenReturn(1L);
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of());

        RewindResultView result = realMatchService.rewind(userId);

        assertFalse(result.success(), "无 pass 记录时返回失败");
        assertEquals("没有可撤销的 pass 记录", result.message());

        verify(valueOperations, times(1)).increment(anyString());
        verify(valueOperations, times(1)).decrement(anyString());
        verify(passRecordRepository, never()).delete(any());
    }

    @Test
    void rewind_withNullUserId_shouldThrowIllegalArgumentException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realMatchService.rewind(null));
        assertEquals("userId is required", ex.getMessage());

        verify(passRecordRepository, never()).findByUserIdOrderByCreatedAtDesc(anyLong());
        verify(valueOperations, never()).get(anyString());
    }

    // ==================================================================
    // rewind - Redis 降级场景
    // ==================================================================

    @Test
    void rewind_whenRedisTemplateNull_shouldFallbackToLocalMemory() {
        Long userId = 100L;
        PassRecord latestPass = createPassRecord(10L, userId, 200L);

        matchPolicy.setRedisTemplate(null);

        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(latestPass));

        RewindResultView result = realMatchService.rewind(userId);

        assertTrue(result.success(), "Redis 不可用时仍应成功 rewind（本地降级）");
        verify(passRecordRepository, times(1)).delete(latestPass);

        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(latestPass));
        assertThrows(DailyLimitExceededException.class, () -> realMatchService.rewind(userId));
    }

    @Test
    void rewind_whenRedisGetThrowsException_shouldFallbackToLocalMemory() {
        Long userId = 100L;
        PassRecord latestPass = createPassRecord(10L, userId, 200L);

        when(valueOperations.get(anyString())).thenThrow(new RuntimeException("Redis connection refused"));
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(latestPass));
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("Redis connection refused"));

        RewindResultView result = realMatchService.rewind(userId);

        assertTrue(result.success(), "Redis 异常时仍应成功 rewind（降级到本地）");
        verify(passRecordRepository, times(1)).delete(latestPass);
    }

    @Test
    void rewind_whenRedisIncrementThrowsException_shouldNotFailRewind() {
        Long userId = 100L;
        PassRecord latestPass = createPassRecord(10L, userId, 200L);

        when(valueOperations.get(anyString())).thenReturn(0);
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("Redis write failed"));
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(latestPass));

        RewindResultView result = realMatchService.rewind(userId);

        assertTrue(result.success(), "Redis 写入异常时 rewind 仍应成功");
        verify(passRecordRepository, times(1)).delete(latestPass);
    }

    @Test
    void rewind_whenRedisValueIsNotNumber_shouldTreatAsZero() {
        Long userId = 100L;
        PassRecord latestPass = createPassRecord(10L, userId, 200L);

        when(valueOperations.get(anyString())).thenReturn("not-a-number");
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(latestPass));
        when(valueOperations.increment(anyString())).thenReturn(1L);

        RewindResultView result = realMatchService.rewind(userId);

        assertTrue(result.success(), "Redis 异常数据应按 0 处理，rewind 应成功");
        verify(passRecordRepository, times(1)).delete(latestPass);
    }

    @Test
    void rewind_afterFirstSuccess_shouldRejectSecondRewind() {
        Long userId = 100L;
        PassRecord pass1 = createPassRecord(11L, userId, 201L);

        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(pass1));
        // infra R2-00224: 第一次 INCR 返回 1（成功），第二次 INCR 返回 2（超限拒绝）
        when(valueOperations.increment(anyString())).thenReturn(1L, 2L);

        RewindResultView first = realMatchService.rewind(userId);
        assertTrue(first.success());

        assertThrows(DailyLimitExceededException.class, () -> realMatchService.rewind(userId));
    }

    // ==================================================================
    // 双向匹配自动建会话（2026-08-08 走查交付）
    // ==================================================================

    @Test
    void likeUser_whenMutual_shouldCreateFreeConversation() {
        Long userId = 100L;
        Long targetUserId = 200L;
        LocalDateTime now = LocalDateTime.now();

        // 普通喜欢配额：INCR 返回 1（未超限）
        when(valueOperations.increment(anyString())).thenReturn(1L);
        // 无既有 like → 走 createLike
        when(likeRepository.findByUserIdAndTargetUserId(userId, targetUserId))
                .thenReturn(Optional.empty());
        when(likeRepository.save(any(Like.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        // 反向 active like 存在 → 双向匹配
        Like reverseLike = new Like();
        reverseLike.setId(99L);
        reverseLike.setUserId(targetUserId);
        reverseLike.setTargetUserId(userId);
        reverseLike.setStatus(LikeStatus.active);
        reverseLike.setCreatedAt(now);
        when(likeRepository.findByUserIdAndTargetUserId(targetUserId, userId))
                .thenReturn(Optional.of(reverseLike));
        // 心动信号保存与视图转换
        HeartSignal signal = new HeartSignal();
        signal.setId(1L);
        signal.setUserAId(userId);
        signal.setUserBId(targetUserId);
        signal.setStatus(HeartSignal.SignalStatus.pending);
        signal.setExpiresAt(now.plusHours(1));
        signal.setCreatedAt(now);
        when(heartSignalRepository.save(any(HeartSignal.class))).thenReturn(signal);
        when(userRepository.findAllById(any())).thenReturn(List.of());

        HeartSignalView view = realMatchService.likeUser(userId, targetUserId);

        assertNotNull(view, "双向匹配应返回心动信号视图");
        verify(privateMessageService).createOrGetConversation(userId, targetUserId);
    }

    @Test
    void likeUser_whenOneSided_shouldNotCreateConversation() {
        Long userId = 100L;
        Long targetUserId = 200L;

        when(valueOperations.increment(anyString())).thenReturn(1L);
        when(likeRepository.findByUserIdAndTargetUserId(userId, targetUserId))
                .thenReturn(Optional.empty());
        when(likeRepository.save(any(Like.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        // 无反向 like → 单向喜欢
        when(likeRepository.findByUserIdAndTargetUserId(targetUserId, userId))
                .thenReturn(Optional.empty());

        HeartSignalView view = realMatchService.likeUser(userId, targetUserId);

        assertNull(view, "单向喜欢不返回信号");
        verify(privateMessageService, never()).createOrGetConversation(anyLong(), anyLong());
    }

    @Test
    void likeUser_whenConversationCreationFails_shouldStillReturnMatch() {
        Long userId = 100L;
        Long targetUserId = 200L;
        LocalDateTime now = LocalDateTime.now();

        when(valueOperations.increment(anyString())).thenReturn(1L);
        when(likeRepository.findByUserIdAndTargetUserId(userId, targetUserId))
                .thenReturn(Optional.empty());
        when(likeRepository.save(any(Like.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        Like reverseLike = new Like();
        reverseLike.setId(99L);
        reverseLike.setUserId(targetUserId);
        reverseLike.setTargetUserId(userId);
        reverseLike.setStatus(LikeStatus.active);
        reverseLike.setCreatedAt(now);
        when(likeRepository.findByUserIdAndTargetUserId(targetUserId, userId))
                .thenReturn(Optional.of(reverseLike));
        HeartSignal signal = new HeartSignal();
        signal.setId(1L);
        signal.setUserAId(userId);
        signal.setUserBId(targetUserId);
        signal.setStatus(HeartSignal.SignalStatus.pending);
        signal.setExpiresAt(now.plusHours(1));
        signal.setCreatedAt(now);
        when(heartSignalRepository.save(any(HeartSignal.class))).thenReturn(signal);
        when(userRepository.findAllById(any())).thenReturn(List.of());
        // 会话创建抛异常：不得影响匹配主流程
        when(privateMessageService.createOrGetConversation(userId, targetUserId))
                .thenThrow(new RuntimeException("conversation db down"));

        HeartSignalView view = realMatchService.likeUser(userId, targetUserId);

        assertNotNull(view, "会话创建失败不应影响匹配结果");
        verify(privateMessageService).createOrGetConversation(userId, targetUserId);
    }

    // ==================================================================
    // 辅助方法
    // ==================================================================

    private PassRecord createPassRecord(Long id, Long userId, Long passedUserId) {
        PassRecord record = new PassRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setPassedUserId(passedUserId);
        record.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        return record;
    }

    private static String todayKey() {
        return java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }
}
