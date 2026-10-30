package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * S3-6（2026-10-30）：推荐候选循环去 N+1 的测试。
 *
 * <p><b>用例 (a) 是本任务的守门测试</b>：一页 N 个候选时，校区资料必须是
 * 「整页一次 IN 查询」，且逐条 {@code findByUserId} 只允许发生在「当前用户」身上一次。
 * 任何人把 {@code filterByScope} 的逐候选查询塞回来，这两条断言立刻变红。</p>
 *
 * <p><b>用例 (b)</b> 钉住修复不改变结果：固定夹具下每个候选的分数与顺序逐字节不变
 * （分数按文档里的加权公式手算，不靠快照）。</p>
 *
 * <p>修复前后的查询次数（candidatePageSize=N，scope=campus_first 且首轮即有候选）：
 * 校区资料 {@code N（filterByScope 逐条）+ 1（第 10 步批量）= N+1} → {@code 1}；
 * campus_first 放宽到 city 的空池场景：{@code 2N+1} → {@code 1}。</p>
 */
@DisplayName("RecommendationStrategy - 候选循环批量取数（S3-6）")
class RecommendationStrategyBatchQueryTest {

    private static final Long ME = 100L;

    @Mock private RecommendationConfig recommendationConfig;
    @Mock private UserRepository userRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private RecommendationPreferenceRepository recommendationPreferenceRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private PassRecordRepository passRecordRepository;
    @Mock private CircleMembershipRepository circleMembershipRepository;
    @Mock private DailyAnswerRepository dailyAnswerRepository;
    @Mock private PostRepository postRepository;
    @Mock private UserPreferenceCalculator preferenceCalculator;

    private RecommendationStrategy strategy;
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        strategy = new RecommendationStrategy(
                recommendationConfig, userRepository, likeRepository,
                userCampusProfileRepository, userScheduleProfileRepository,
                recommendationPreferenceRepository, userBasicProfileRepository,
                heartSignalRepository, passRecordRepository,
                circleMembershipRepository, dailyAnswerRepository,
                postRepository, new ObjectMapper(), preferenceCalculator);

        when(recommendationConfig.getCandidatePageSize()).thenReturn(200);
        when(recommendationConfig.getCampusWeight()).thenReturn(30);
        when(recommendationConfig.getCityWeight()).thenReturn(20);
        when(recommendationConfig.getSameMajorWeight()).thenReturn(15);
        when(recommendationConfig.getInterestWeight()).thenReturn(5);
        when(recommendationConfig.getCircleWeight()).thenReturn(10);
        when(recommendationConfig.getHeightWeight()).thenReturn(8);
        when(recommendationConfig.getAgeWeight()).thenReturn(6);
        when(recommendationConfig.getPartnerWeight()).thenReturn(4);
        when(recommendationConfig.getHeightDiffTolerance()).thenReturn(5);
        when(recommendationConfig.getAgeDiffTolerance()).thenReturn(3);
        when(recommendationConfig.isSameSchoolBoostEnabled()).thenReturn(true);
        when(recommendationConfig.getSameSchoolBoostPercent()).thenReturn(0.30);
        when(recommendationConfig.getActivityMaxPosts()).thenReturn(3);
        when(recommendationConfig.getActivityWeight()).thenReturn(2);

        // 当前用户：北京大学 / 北京 / 计算机，标签 摄影+阅读
        when(userCampusProfileRepository.findByUserId(ME))
                .thenReturn(Optional.of(campus(ME, "北京大学", "北京", "计算机")));
        when(userBasicProfileRepository.findByUserId(ME))
                .thenReturn(Optional.of(basic(ME, "[\"摄影\",\"阅读\"]", 175, 2002, "摄影 温柔")));
        when(circleMembershipRepository.findByUserId(ME))
                .thenReturn(List.of(membership(ME, 1L), membership(ME, 2L)));

        // preferenceCalculator 为 mock：这里用与真实实现同口径的最小解析（JSON 里拆词）
        when(preferenceCalculator.parseInterestTags(anyString())).thenAnswer(invocation -> {
            String raw = invocation.getArgument(0);
            Set<String> tags = new LinkedHashSet<>();
            for (String part : raw.split("[^\\p{L}\\p{N}]+")) {
                if (!part.isBlank()) {
                    tags.add(part.trim());
                }
            }
            return tags;
        });
    }

    // ---- 夹具 ----

    private static User user(long id) {
        User u = new User();
        u.setId(id);
        u.setNickname("同学" + id);
        return u;
    }

    private static UserCampusProfile campus(Long userId, String campusName, String cityName, String department) {
        UserCampusProfile p = new UserCampusProfile();
        p.setUserId(userId);
        p.setCampusName(campusName);
        p.setCityName(cityName);
        p.setDepartmentName(department);
        return p;
    }

    private static UserBasicProfile basic(Long userId, String interestTags, Integer height,
                                          Integer birthYear, String expectedPartner) {
        UserBasicProfile p = new UserBasicProfile();
        p.setUserId(userId);
        p.setInterestTags(interestTags);
        p.setHeight(height);
        p.setBirthYear(birthYear);
        p.setExpectedPartner(expectedPartner);
        return p;
    }

    private static CircleMembership membership(long userId, long circleId) {
        CircleMembership m = new CircleMembership();
        m.setUserId(userId);
        InterestCircle circle = new InterestCircle();
        circle.setId(circleId);
        m.setCircle(circle);
        return m;
    }

    /** 用给定候选用户填充「可推荐用户分页」；其余预加载按 id 规则生成。 */
    private void stubCandidatePool(List<User> pool) {
        when(userRepository.findRecommendableUsers(eq("active"), eq("USER"), anyInt(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(pool, PageRequest.of(0, Math.max(1, pool.size())), pool.size()));
    }

    /** 校区资料批量查询：按 stub 好的 id → profile 表返回（模拟真实 IN 语义）。 */
    private void stubCampusBatch(Map<Long, UserCampusProfile> byUserId) {
        when(userCampusProfileRepository.findByUserIdIn(anyList())).thenAnswer(invocation -> {
            List<Long> ids = invocation.getArgument(0);
            List<UserCampusProfile> out = new ArrayList<>();
            for (Long id : ids) {
                UserCampusProfile p = byUserId.get(id);
                if (p != null) {
                    out.add(p);
                }
            }
            return out;
        });
    }

    private void stubBasicBatch(Map<Long, UserBasicProfile> byUserId) {
        when(userBasicProfileRepository.findByUserIdIn(anyList())).thenAnswer(invocation -> {
            List<Long> ids = invocation.getArgument(0);
            List<UserBasicProfile> out = new ArrayList<>();
            for (Long id : ids) {
                UserBasicProfile p = byUserId.get(id);
                if (p != null) {
                    out.add(p);
                }
            }
            return out;
        });
    }

    private void stubScope(String scope) {
        RecommendationPreference pref = new RecommendationPreference();
        pref.setUserId(ME);
        pref.setScope(scope);
        pref.setCampusPriority(Boolean.TRUE);
        when(recommendationPreferenceRepository.findByUserId(ME)).thenReturn(Optional.of(pref));
    }

    // ---- 用例 (a)：查询次数与候选数无关 ----

    @Test
    @DisplayName("200 个候选：校区资料只发 1 次 IN 查询，逐条 findByUserId 只允许命中当前用户")
    void doRecommend_twoHundredCandidates_shouldIssueOneBatchCampusQuery() {
        stubScope("campus_first");
        List<User> pool = new ArrayList<>();
        Map<Long, UserCampusProfile> campusByUser = new java.util.LinkedHashMap<>();
        for (long id = 201; id <= 400; id++) {
            pool.add(user(id));
            // 一半同校、一半外校，保证 scope 过滤真的走过内存判定
            boolean sameSchool = id % 2 == 0;
            campusByUser.put(id, campus(id, sameSchool ? "北京大学" : "清华大学", "北京", "数学"));
        }
        stubCandidatePool(pool);
        stubCampusBatch(campusByUser);
        stubBasicBatch(Map.of());

        RecommendationStrategy.RecommendResult result = strategy.doRecommend(ME);

        // 守门断言：批量一次，且不得再有任何按候选 id 的单条查询
        verify(userCampusProfileRepository, times(1)).findByUserIdIn(anyList());
        verify(userCampusProfileRepository, times(1)).findByUserId(anyLong());
        verify(userCampusProfileRepository).findByUserId(ME);
        verify(userCampusProfileRepository, never()).findByUserId(201L);
        verify(userCampusProfileRepository, never()).findByUserId(399L);

        // 与修复前对照：filterByScope 逐候选 200 次 + 第 10 步批量 1 次 = 201 次
        assertEquals(100, result.scoredUsers().size(), "同校候选应为一半");
        assertEquals(100, result.campusProfileMap().size(), "交给 Ranker 的 Map 只含候选，不含整页");
    }

    @Test
    @DisplayName("campus_first 空池放宽到 city/全国：校区资料仍然只 1 次查询（修复前最坏 2N+1 次）")
    void doRecommend_campusFirstFallback_shouldStillQueryOnce() {
        stubScope("campus_first");
        List<User> pool = new ArrayList<>();
        Map<Long, UserCampusProfile> campusByUser = new java.util.LinkedHashMap<>();
        for (long id = 501; id <= 600; id++) {
            pool.add(user(id));
            // 全部外校且异城：同校 0 候选 → 放宽同城（同城也是 0）→ 放宽全国
            UserCampusProfile other = campus(id, "复旦大学", "上海", "数学");
            other.setCityName("上海");
            campusByUser.put(id, other);
        }
        stubCandidatePool(pool);
        stubCampusBatch(campusByUser);
        stubBasicBatch(Map.of());

        RecommendationStrategy.RecommendResult result = strategy.doRecommend(ME);

        verify(userCampusProfileRepository, times(1)).findByUserIdIn(anyList());
        verify(userCampusProfileRepository, times(1)).findByUserId(anyLong());
        assertEquals(100, result.scoredUsers().size(), "空池兜底后应回落到全国候选");
    }

    @Test
    @DisplayName("scope=unlimited：仍只 1 次批量查询（修复前该场景为 1 次批量 + 0 次逐条）")
    void doRecommend_unlimitedScope_shouldQueryCampusOnce() {
        stubScope("unlimited");
        List<User> pool = List.of(user(701L), user(702L), user(703L));
        stubCandidatePool(pool);
        stubCampusBatch(Map.of(
                701L, campus(701L, "北京大学", "北京", "计算机"),
                702L, campus(702L, "清华大学", "北京", "数学")));
        stubBasicBatch(Map.of());

        strategy.doRecommend(ME);

        verify(userCampusProfileRepository, times(1)).findByUserIdIn(anyList());
        verify(userCampusProfileRepository, times(1)).findByUserId(anyLong());
    }

    @Test
    @DisplayName("600 个候选按 500 分批，单条 IN 子句不得超长")
    void doRecommend_sixHundredCandidates_shouldChunkBatchQuery() {
        stubScope("unlimited");
        List<User> pool = new ArrayList<>();
        for (long id = 1001; id <= 1600; id++) {
            pool.add(user(id));
        }
        stubCandidatePool(pool);
        when(userCampusProfileRepository.findByUserIdIn(anyList())).thenReturn(List.of());
        stubBasicBatch(Map.of());

        strategy.doRecommend(ME);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(userCampusProfileRepository, times(2)).findByUserIdIn(captor.capture());
        List<Integer> batchSizes = captor.getAllValues().stream().map(List::size).toList();
        assertEquals(List.of(500, 100), batchSizes, "分批上限必须是 500（同 AdminDataScope 口径）");
    }

    @Test
    @DisplayName("候选池为空：不查校区资料（避免空 IN 列表），也不再逐条查库")
    void doRecommend_emptyPool_shouldNotQueryCampusAtAll() {
        stubScope("campus_first");
        stubCandidatePool(List.of());
        // 当前用户自己的校区/基础资料仍各查一次（步骤 1/3）
        when(userCampusProfileRepository.findByUserIdIn(anyList())).thenReturn(List.of());

        RecommendationStrategy.RecommendResult result = strategy.doRecommend(ME);

        assertTrue(result.scoredUsers().isEmpty());
        verify(userCampusProfileRepository, never()).findByUserIdIn(anyList());
        verify(userCampusProfileRepository, times(1)).findByUserId(anyLong());
    }

    @Test
    @DisplayName("重复 id 与 null id 先去重再查库，查库入参干净")
    void doRecommend_shouldDeduplicateIdsBeforeQuery() {
        stubScope("unlimited");
        User nullId = new User();
        nullId.setNickname("无 ID");
        stubCandidatePool(List.of(user(801L), user(801L), nullId));
        when(userCampusProfileRepository.findByUserIdIn(anyList()))
                .thenReturn(List.of(campus(801L, "北京大学", "北京", "计算机")));
        when(userBasicProfileRepository.findByUserIdIn(anyList())).thenReturn(List.of());

        strategy.doRecommend(ME);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(userCampusProfileRepository).findByUserIdIn(captor.capture());
        assertEquals(List.of(801L), captor.getValue(), "查库入参必须去重且不含 null");
    }

    // ---- 用例 (b)：固定夹具的分数与顺序不变 ----

    @Test
    @DisplayName("固定夹具分数逐字节不变：133 / 35 / 4，顺序保持候选池原序")
    void doRecommend_fixedFixture_scoresAndOrderingUnchanged() {
        stubScope("unlimited");
        stubCandidatePool(new ArrayList<>(List.of(user(101L), user(102L), user(103L), user(104L))));
        stubCampusBatch(Map.of(
                101L, campus(101L, "北京大学", "北京", "计算机"),
                102L, campus(102L, "清华大学", "北京", "数学"),
                104L, campus(104L, "北京大学", "北京", "计算机")));
        stubBasicBatch(Map.of(
                101L, basic(101L, "[\"摄影\"]", 172, 2003, null),
                102L, basic(102L, "[\"阅读\"]", null, null, null),
                103L, basic(103L, "[\"运动\"]", null, null, null),
                104L, basic(104L, "[\"摄影\"]", 175, 2002, null)));
        when(circleMembershipRepository.findWithCircleByUserIdIn(anyList())).thenAnswer(invocation -> {
            List<Long> ids = invocation.getArgument(0);
            List<CircleMembership> out = new ArrayList<>();
            if (ids.contains(101L)) {
                out.add(membership(101L, 1L));
            }
            if (ids.contains(102L)) {
                out.add(membership(102L, 2L));
            }
            return out;
        });
        // 活跃度：101 近 N 天 5 帖（封顶 3）、103 两帖、其余无
        when(postRepository.countRecentPostsByAuthorIds(anyList(), any(), any(LocalDateTime.class)))
                .thenReturn(List.of(new Object[]{101L, 5L}, new Object[]{103L, 2L}));
        // 104 是我喜欢过的人 → 进排除集合
        Like liked = new Like();
        liked.setUserId(ME);
        liked.setTargetUserId(104L);
        liked.setStatus(Like.LikeStatus.active);
        when(likeRepository.findByUserIdAndStatusIn(eq(ME), anyList())).thenReturn(List.of(liked));

        RecommendationStrategy.RecommendResult result = strategy.doRecommend(ME);

        List<String> actual = result.scoredUsers().stream()
                .map(su -> su.user().getId() + "=" + su.score())
                .toList();
        // 手算（权重见 setUp）：
        // 101：同校30 + 同城20 + 同专业15 + 标签1×5 + 共同圈1×10 + 身高差3→8 + 年龄差1→6 + 理想型命中1×4 = 98
        //      同校加成 (int)(98×1.3)=127，再 + 活跃度 min(5,3)×2=6 → 133
        // 102：同城20 + 标签1×5 + 共同圈1×10 = 35（不同校不加成）+ 活跃度 0 → 35
        // 103：无校区资料、标签/圈子/身高/年龄/理想型均不命中 = 0 + 活跃度 2×2=4 → 4
        // 104：已喜欢 → 排除集合内，不得出现
        assertEquals(List.of("101=133", "102=35", "103=4"), actual);

        // 预加载 Map 的口径也未变：103 无校区资料（不在 Map 中），104 被排除（同样不在 Map 中）
        assertEquals(Set.of(101L, 102L), result.campusProfileMap().keySet());
        assertFalse(result.campusProfileMap().containsKey(104L), "被排除的候选不应出现在预加载 Map 中");
    }

    @Test
    @DisplayName("matchesScope 为纯内存判定：不产生任何查询（与 filterByScope 同语义）")
    void matchesScope_shouldNotTouchDatabase() {
        UserCampusProfile sameSchool = campus(999L, "北京大学", "北京", "计算机");

        assertTrue(strategy.matchesScope(sameSchool, "campus_first", "北京大学", "北京"));
        assertFalse(strategy.matchesScope(sameSchool, "campus_first", "清华大学", "北京"));
        assertTrue(strategy.matchesScope(null, "campus_first", "北京大学", "北京"), "无校区资料应放行（非 city）");
        assertFalse(strategy.matchesScope(null, "city", "北京大学", "北京"), "city 模式无依据时排除");
        assertTrue(strategy.matchesScope(null, "unlimited", "北京大学", "北京"));
        assertTrue(strategy.matchesScope(campus(998L, "复旦大学", "上海", "数学"), "city", "北京大学", "上海"));

        // 纯内存：一次库都不碰（旧 filterByScope 每个入参都要发一条 findByUserId）
        verify(userCampusProfileRepository, never()).findByUserId(anyLong());
        verify(userCampusProfileRepository, never()).findByUserIdIn(anyList());
    }

    @Test
    @DisplayName("filterByScope（单条公开入口）语义未变：仍按 candidateUserId 查一次校区资料")
    void filterByScope_singleLookupKeptForLegacyCallers() {
        when(userCampusProfileRepository.findByUserId(321L))
                .thenReturn(Optional.of(campus(321L, "北京大学", "北京", "计算机")));

        assertTrue(strategy.filterByScope(321L, "campus_first", "北京大学", "北京"));
        // unlimited 早退，连这一次查询都不发
        assertTrue(strategy.filterByScope(321L, "unlimited", "北京大学", "北京"));

        verify(userCampusProfileRepository, times(1)).findByUserId(321L);
    }
}
