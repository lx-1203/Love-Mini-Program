package com.campuslove.api.performance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.Visitor;
import com.campuslove.api.match.LikedUserView;
import com.campuslove.api.match.MatchEngine;
import com.campuslove.api.match.MatchPolicy;
import com.campuslove.api.match.MatchRecorder;
import com.campuslove.api.match.RealMatchService;
import com.campuslove.api.match.VisitorView;
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
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * Task 2.2 N+1 查询消除单元测试。
 *
 * <p>测试目标：验证 {@link RealMatchService} 中关键查询路径已使用批量加载
 * （委托 {@link MatchRecorder#batchLoadUsers} / {@link MatchRecorder#batchLoadCampusProfiles}）
 * 替代循环单条查询，避免 N+1 查询问题。</p>
 *
 * <p>测试方法：使用 Mockito mock MatchRecorder，构造 N 条数据，
 * 验证批量加载方法仅被调用 1 次（而非 N 次），证明 N+1 已消除。</p>
 */
class NPlusOneTest {

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
    @Mock private MatchEngine matchEngine;
    @Mock private MatchPolicy matchPolicy;
    @Mock private MatchRecorder matchRecorder;

    private RealMatchService realMatchService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
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
                matchEngine,
                matchPolicy,
                matchRecorder
        );
    }

    /**
     * 场景 1：getLikedMe() 处理 3 条 Like 记录时，
     * matchRecorder.batchLoadUsers 应只被调用 1 次（而非 3 次）。
     */
    @Test
    void getLikedMe_withMultipleLikes_shouldCallBatchLoadUsersOnce() {
        Long userId = 100L;
        Like like1 = createLike(10L, userId, 200L);
        Like like2 = createLike(11L, userId, 201L);
        Like like3 = createLike(12L, userId, 202L);
        when(likeRepository.findByTargetUserIdAndStatus(userId, LikeStatus.active))
                .thenReturn(List.of(like1, like2, like3));

        when(matchRecorder.batchLoadUsers(anyList())).thenReturn(Map.of(
                200L, createUser(200L, "用户A"),
                201L, createUser(201L, "用户B"),
                202L, createUser(202L, "用户C")));
        when(matchRecorder.batchLoadCampusProfiles(anyList())).thenReturn(Map.of(
                200L, createCampusProfile(200L, "北大"),
                201L, createCampusProfile(201L, "清华"),
                202L, createCampusProfile(202L, "复旦")));

        List<LikedUserView> result = realMatchService.getLikedMe(userId);

        assertEquals(3, result.size(), "应返回 3 条 likedMe 记录");
        // 核心断言：批量加载仅被调用 1 次（而非 N 次）
        verify(matchRecorder, times(1)).batchLoadUsers(anyList());
        verify(matchRecorder, times(1)).batchLoadCampusProfiles(anyList());
    }

    /**
     * 场景 2：getLikedMe() 处理空 Like 列表时，
     * 返回空结果，不产生有效批量加载。
     */
    @Test
    void getLikedMe_withEmptyLikes_shouldReturnEmptyResult() {
        Long userId = 100L;
        when(likeRepository.findByTargetUserIdAndStatus(userId, LikeStatus.active))
                .thenReturn(List.of());

        when(matchRecorder.batchLoadUsers(anyList())).thenReturn(Map.of());
        when(matchRecorder.batchLoadCampusProfiles(anyList())).thenReturn(Map.of());

        List<LikedUserView> result = realMatchService.getLikedMe(userId);

        assertEquals(0, result.size(), "空 Like 列表应返回空结果");
    }

    /**
     * 场景 3：getVisitors() 处理多条访客记录时，
     * matchRecorder.batchLoadUsers 应只被调用 1 次。
     */
    @Test
    void getVisitors_withMultipleVisitors_shouldCallBatchLoadUsersOnce() {
        Long userId = 100L;
        Visitor v1 = createVisitor(10L, 200L, userId);
        Visitor v2 = createVisitor(11L, 201L, userId);
        Visitor v3 = createVisitor(12L, 202L, userId);
        Visitor v4 = createVisitor(13L, 203L, userId);
        when(matchRecorder.findVisitors(userId))
                .thenReturn(List.of(v1, v2, v3, v4));

        when(matchRecorder.batchLoadUsers(anyList())).thenReturn(Map.of(
                200L, createUser(200L, "访客A"),
                201L, createUser(201L, "访客B"),
                202L, createUser(202L, "访客C"),
                203L, createUser(203L, "访客D")));
        when(matchRecorder.batchLoadCampusProfiles(anyList())).thenReturn(Map.of(
                200L, createCampusProfile(200L, "北大"),
                201L, createCampusProfile(201L, "清华"),
                202L, createCampusProfile(202L, "复旦"),
                203L, createCampusProfile(203L, "浙大")));

        List<VisitorView> result = realMatchService.getVisitors(userId);

        assertEquals(4, result.size(), "应返回 4 条访客记录");
        // 核心断言：4 条访客记录仅触发 1 次批量加载
        verify(matchRecorder, times(1)).batchLoadUsers(anyList());
        verify(matchRecorder, times(1)).batchLoadCampusProfiles(anyList());
    }

    /**
     * 场景 4：getLikedMe() 处理重复 likerId 时，
     * batchLoadUsers 内部 distinct 后批量加载，验证仍只调用 1 次。
     */
    @Test
    void getLikedMe_withDuplicateLikerIds_shouldDeduplicateAndCallOnce() {
        Long userId = 100L;
        // 3 条 Like 记录，但 likerId 有重复（200L 出现 2 次）
        Like like1 = createLike(10L, userId, 200L);
        Like like2 = createLike(11L, userId, 201L);
        Like like3 = createLike(12L, userId, 200L); // 重复 liker 200L
        when(likeRepository.findByTargetUserIdAndStatus(userId, LikeStatus.active))
                .thenReturn(List.of(like1, like2, like3));

        when(matchRecorder.batchLoadUsers(anyList())).thenReturn(Map.of(
                200L, createUser(200L, "用户A"),
                201L, createUser(201L, "用户B")));
        when(matchRecorder.batchLoadCampusProfiles(anyList())).thenReturn(Map.of(
                200L, createCampusProfile(200L, "北大"),
                201L, createCampusProfile(201L, "清华")));

        List<LikedUserView> result = realMatchService.getLikedMe(userId);

        // 返回 3 条记录（按 Like 数量，而非 liker 数量）
        assertEquals(3, result.size(), "应返回 3 条 likedMe 记录（包含重复 liker）");
        // 核心断言：批量加载仅调用 1 次，distinct 内部去重
        verify(matchRecorder, times(1)).batchLoadUsers(anyList());
        verify(matchRecorder, times(1)).batchLoadCampusProfiles(anyList());
        // 验证返回的 likerId 集合去重后正确（用户A 出现 2 次但仅查 1 次）
        long userACount = result.stream()
                .filter(v -> v.userId() != null && v.userId().equals(200L))
                .count();
        assertEquals(2, userACount, "likerId=200 应出现 2 次（按 Like 记录数）");
    }

    // ============ 测试数据工厂方法 ============

    private Like createLike(Long id, Long targetUserId, Long likerUserId) {
        Like like = new Like();
        like.setId(id);
        like.setUserId(likerUserId);
        like.setTargetUserId(targetUserId);
        like.setStatus(LikeStatus.active);
        like.setCreatedAt(LocalDateTime.now());
        return like;
    }

    private Visitor createVisitor(Long id, Long visitorId, Long visitedUserId) {
        Visitor visitor = new Visitor();
        visitor.setId(id);
        visitor.setVisitorId(visitorId);
        visitor.setVisitedUserId(visitedUserId);
        visitor.setCreatedAt(LocalDateTime.now());
        return visitor;
    }

    private User createUser(Long id, String nickname) {
        User user = new User();
        user.setId(id);
        user.setNickname(nickname);
        user.setAvatarUrl("/avatar/" + id + ".jpg");
        return user;
    }

    private UserCampusProfile createCampusProfile(Long userId, String campusName) {
        UserCampusProfile profile = new UserCampusProfile();
        profile.setUserId(userId);
        profile.setCampusName(campusName);
        return profile;
    }
}
