package com.campuslove.api.match;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * MatchEngine 单元测试（Task 4.2.1）。
 *
 * <p>覆盖候选用户筛选、匹配分数计算、Top-N 选择等核心算法逻辑。</p>
 */
class MatchEngineTest {

    @Mock private MatchConfig matchConfig;
    @Mock private LikeRepository likeRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private PassRecordRepository passRecordRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;

    private MatchEngine matchEngine;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        matchEngine = new MatchEngine(
                matchConfig,
                likeRepository,
                heartSignalRepository,
                passRecordRepository,
                userRepository,
                userCampusProfileRepository,
                userBasicProfileRepository,
                userScheduleProfileRepository,
                new ObjectMapper());

        when(matchConfig.getCandidatePageSize()).thenReturn(20);
        when(matchConfig.getCampusWeight()).thenReturn(10);
        when(matchConfig.getCityWeight()).thenReturn(5);
        when(matchConfig.getInterestWeight()).thenReturn(3);
        when(matchConfig.getScheduleWeight()).thenReturn(2);
    }

    /**
     * 场景：getExcludedUserIds 应包含自己、已喜欢、已有信号、已 pass 的用户。
     */
    @Test
    void getExcludedUserIds_includesSelfLikesSignalsAndPasses() {
        Long userId = 1L;

        Like like = new Like();
        like.setTargetUserId(2L);
        like.setStatus(LikeStatus.active);
        when(likeRepository.findByUserIdAndStatus(userId, LikeStatus.active))
                .thenReturn(List.of(like));

        HeartSignal signal = new HeartSignal();
        signal.setUserAId(userId);
        signal.setUserBId(3L);
        signal.setStatus(SignalStatus.pending);
        when(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.pending))
                .thenReturn(List.of(signal));
        when(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted))
                .thenReturn(Collections.emptyList());

        PassRecord passRecord = new PassRecord();
        passRecord.setPassedUserId(4L);
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(passRecord));

        Set<Long> excluded = matchEngine.getExcludedUserIds(userId);

        assertTrue(excluded.contains(1L), "应包含自己");
        assertTrue(excluded.contains(2L), "应包含已喜欢用户");
        assertTrue(excluded.contains(3L), "应包含信号对方");
        assertTrue(excluded.contains(4L), "应包含已 pass 用户");
    }

    /**
     * 场景：calculateMatchScore 同校区 + 同城市 + 兴趣匹配 + 日程重叠 应累加分数。
     */
    @Test
    void calculateMatchScore_allMatch_returnsSumOfWeights() {
        Long candidateId = 10L;
        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("北大");
        candidateCampus.setCityName("北京");

        UserBasicProfile candidateBasic = new UserBasicProfile();
        candidateBasic.setInterestTags("[\"摄影\",\"篮球\"]");

        UserScheduleProfile candidateSchedule = new UserScheduleProfile();
        candidateSchedule.setPreferredTimeWindowJson("{\"morning\":true}");

        when(userCampusProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(candidateCampus));
        when(userBasicProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(candidateBasic));
        when(userScheduleProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(candidateSchedule));

        int score = matchEngine.calculateMatchScore(
                candidateId, "北大", "北京", Set.of("摄影", "篮球"), "{\"morning\":true}");

        // 10 (campus) + 5 (city) + 3*2 (2 tags) + 2 (schedule) = 23
        assertEquals(23, score, "同校区+同城市+2兴趣+日程重叠应得 23 分");
    }

    /**
     * 场景：无任何匹配时分数应为 0。
     */
    @Test
    void calculateMatchScore_noMatch_returnsZero() {
        Long candidateId = 11L;
        when(userCampusProfileRepository.findByUserId(candidateId)).thenReturn(Optional.empty());
        when(userBasicProfileRepository.findByUserId(candidateId)).thenReturn(Optional.empty());
        when(userScheduleProfileRepository.findByUserId(candidateId)).thenReturn(Optional.empty());

        int score = matchEngine.calculateMatchScore(
                candidateId, "北大", "北京", Set.of("摄影"), "{\"morning\":true}");

        assertEquals(0, score);
    }

    /**
     * 场景：findAndScoreCandidates 应排除 excludedUserIds 中的用户。
     */
    @Test
    void findAndScoreCandidates_filtersExcludedUsers() {
        Long userId = 1L;
        User candidate1 = createUser(10L);
        User candidate2 = createUser(11L);  // will be excluded

        when(userCampusProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userScheduleProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userBasicProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userRepository.findAll(PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(candidate1, candidate2)));

        // 排除 11L
        Set<Long> excluded = Set.of(1L, 11L);

        List<MatchEngine.ScoredCandidate> result = matchEngine.findAndScoreCandidates(userId, excluded);

        assertEquals(1, result.size(), "应仅返回未排除的 1 个候选");
        assertEquals(10L, result.get(0).user().getId());
    }

    /**
     * 场景：selectFromTopCandidates 应在 Top-N 中随机选择。
     */
    @Test
    void selectFromTopCandidates_returnsOneOfTopN() {
        User u1 = createUser(1L);
        User u2 = createUser(2L);
        User u3 = createUser(3L);

        List<MatchEngine.ScoredCandidate> candidates = List.of(
                new MatchEngine.ScoredCandidate(u1, 100),
                new MatchEngine.ScoredCandidate(u2, 90),
                new MatchEngine.ScoredCandidate(u3, 80));

        User selected = matchEngine.selectFromTopCandidates(candidates);

        assertTrue(selected.getId() == 1L || selected.getId() == 2L || selected.getId() == 3L,
                "应从 Top-3 中选择一个");
    }

    /**
     * 场景：selectFromTopCandidates 候选不足 5 个时取全部。
     */
    @Test
    void selectFromTopCandidates_fewerThanFive_usesAll() {
        List<MatchEngine.ScoredCandidate> candidates = List.of(
                new MatchEngine.ScoredCandidate(createUser(1L), 100));

        User selected = matchEngine.selectFromTopCandidates(candidates);
        assertEquals(1L, selected.getId());
    }

    /**
     * 场景：hasScheduleOverlap 任一参数为空应返回 false。
     */
    @Test
    void hasScheduleOverlap_withBlankInput_returnsFalse() {
        assertFalse(matchEngine.hasScheduleOverlap(null, "{\"a\":1}"));
        assertFalse(matchEngine.hasScheduleOverlap("", "{\"a\":1}"));
        assertFalse(matchEngine.hasScheduleOverlap("{\"a\":1}", null));
        assertFalse(matchEngine.hasScheduleOverlap("{\"a\":1}", ""));
    }

    /**
     * 场景：hasScheduleOverlap 有公共 key 应返回 true。
     */
    @Test
    void hasScheduleOverlap_withCommonKey_returnsTrue() {
        assertTrue(matchEngine.hasScheduleOverlap("{\"morning\":true}", "{\"morning\":false}"));
    }

    /**
     * 场景：hasScheduleOverlap 无公共 key 应返回 false。
     */
    @Test
    void hasScheduleOverlap_withoutCommonKey_returnsFalse() {
        assertFalse(matchEngine.hasScheduleOverlap("{\"morning\":true}", "{\"evening\":true}"));
    }

    /**
     * 场景：parseInterestTags 合法 JSON 应返回 Set。
     */
    @Test
    void parseInterestTags_validJson_returnsSet() {
        Set<String> tags = matchEngine.parseInterestTags("[\"摄影\",\"篮球\"]");
        assertEquals(Set.of("摄影", "篮球"), tags);
    }

    /**
     * 场景：parseInterestTags 空字符串应返回空 Set。
     */
    @Test
    void parseInterestTags_emptyString_returnsEmptySet() {
        assertTrue(matchEngine.parseInterestTags("").isEmpty());
        assertTrue(matchEngine.parseInterestTags(null).isEmpty());
    }

    /**
     * 场景：parseInterestTags 非法 JSON 应返回空 Set。
     */
    @Test
    void parseInterestTags_invalidJson_returnsEmptySet() {
        assertTrue(matchEngine.parseInterestTags("not json").isEmpty());
    }

    private User createUser(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
