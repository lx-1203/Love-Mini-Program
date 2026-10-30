package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.location.GeoService;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * S3-6（2026-10-30）：{@link RecommendationRanker} 距离文案取数的测试。
 *
 * <p>修复前 {@code rankAndConvert} 的 map 里每个候选都会：读一次
 * {@code SecurityUtils} 的 ThreadLocal、把当前用户的锚点重新解析一遍
 * （{@code findByUserId} + 可能的 {@code findById}）、再把候选自己的锚点查一遍
 * （同上）——合计每候选 2~4 次查询。修复后：</p>
 * <ul>
 *   <li>当前用户：ThreadLocal 读 1 次、校区资料查 1 次、User 实体查 1 次（整页常量）；</li>
 *   <li>候选：锚点由「Strategy 批量预加载的 campusProfileMap + 手上的 User 实体」推导，0 次查询。</li>
 * </ul>
 *
 * <p>用例同时钉住数值不变：每次 {@code haversineKm} 收到的四个坐标必须是
 * 「当前用户锚点 + 该候选锚点」，且 >300km（定位漂移）依旧不下发距离。</p>
 */
@DisplayName("RecommendationRanker - 距离文案按页取数（S3-6）")
class RecommendationRankerDistanceBatchTest {

    private static final Long VIEWER = 100L;

    /** CAMPUS_ANCHORS 里的真实锚点（见 RecommendationRanker.CAMPUS_ANCHORS） */
    private static final double[] TSINGHUA = {40.0030, 116.3264};
    private static final double[] PEKING = {39.9927, 116.3103};

    @Mock private RecommendationConfig recommendationConfig;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private CircleMembershipRepository circleMembershipRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private UserRepository userRepository;
    @Mock private CampusCertificationService campusCertificationService;
    @Mock private UserPreferenceCalculator preferenceCalculator;
    @Mock private CampusCertificationRepository campusCertificationRepository;
    @Mock private PostRepository postRepository;
    @Mock private GeoService geoService;

    private RecommendationRanker ranker;
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        when(recommendationConfig.getDailyLimit()).thenReturn(50);
        // 最新动态批量查询：本文件的判点是"一次排名只查一次库"，这里给空结果即可。
        // 不 stub 时 Mockito 返回 null，RecommendationRanker#loadRecentPostMap 会直接 NPE
        // （8 例全 error，判点根本没被执行到）。
        when(postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));
        when(campusCertificationService.getVerificationBadgeLevel(anyLong())).thenReturn("none");
        ranker = new RecommendationRanker(
                recommendationConfig, userCampusProfileRepository, userBasicProfileRepository,
                userScheduleProfileRepository, circleMembershipRepository, heartSignalRepository,
                likeRepository, userRepository, campusCertificationService, preferenceCalculator,
                campusCertificationRepository, postRepository);
        // geoService 是 @Autowired(required=false) 字段，单测里手工注入
        ReflectionTestUtils.setField(ranker, "geoService", geoService);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(VIEWER, null, List.of()));
    }

    @AfterEach
    void tearDown() throws Exception {
        SecurityContextHolder.clearContext();
        mocks.close();
    }

    // ---- 夹具 ----

    private static User user(long id, Double lat, Double lng) {
        User u = new User();
        u.setId(id);
        u.setNickname("同学" + id);
        u.setAvatarUrl("/static/assets/images/avatars/avatar-1.jpg");
        if (lat != null) {
            u.setLatitude(BigDecimal.valueOf(lat));
        }
        if (lng != null) {
            u.setLongitude(BigDecimal.valueOf(lng));
        }
        return u;
    }

    private static UserCampusProfile campus(long userId, String campusName) {
        UserCampusProfile p = new UserCampusProfile();
        p.setUserId(userId);
        p.setCampusName(campusName);
        return p;
    }

    /** 当前用户校区资料（决定 viewer 锚点）。 */
    private void stubViewerCampus(String campusName) {
        when(userCampusProfileRepository.findByUserId(VIEWER))
                .thenReturn(Optional.of(campus(VIEWER, campusName)));
    }

    private void stubViewerUser(Double lat, Double lng) {
        when(userRepository.findById(VIEWER)).thenReturn(Optional.of(user(VIEWER, lat, lng)));
    }

    private List<RecommendationStrategy.ScoredUser> scoredUsers(List<User> users, int baseScore) {
        List<RecommendationStrategy.ScoredUser> scored = new ArrayList<>();
        int score = baseScore;
        for (User u : users) {
            scored.add(new RecommendationStrategy.ScoredUser(u, score--));
        }
        return scored;
    }

    /** 把 haversine 结果原样映射成文案，方便断言「用的是哪一对坐标」。 */
    private void stubGeoIdentity() {
        when(geoService.formatDistance(anyDouble())).thenAnswer(invocation ->
                "km=" + invocation.getArgument(0));
    }

    // ---- 查询次数：与候选数无关 ----

    @Test
    @DisplayName("40 个候选：viewer 校区资料与 User 实体各查 1 次，候选侧一次查询都不发")
    void rankAndConvert_fortyCandidates_shouldResolveViewerAnchorOnce() {
        stubViewerCampus("清华大学");   // 锚点在 CAMPUS_ANCHORS 里
        stubViewerUser(39.0, 116.0);    // 即便锚点命中，页级也只查这一次 findById
        stubGeoIdentity();

        List<User> pool = new ArrayList<>();
        Map<Long, UserCampusProfile> campusMap = new HashMap<>();
        for (long id = 201; id <= 240; id++) {
            // 一半候选有批量预加载的校区资料，一半只能回退自身 GPS（覆盖两条分支）
            pool.add(user(id, 30.0 + id, 115.0 + id));
            if (id % 2 == 0) {
                campusMap.put(id, campus(id, "未收录大学"));
            }
        }

        List<RecommendedPersonView> views = ranker.rankAndConvert(
                scoredUsers(pool, 100), "北京大学", "计算机", Set.of(),
                campusMap, Map.of(), Map.of(), VIEWER);

        assertEquals(40, views.size());
        // 守门断言：候选侧 0 次查询，viewer 侧常量 1 次
        verify(userCampusProfileRepository, times(1)).findByUserId(anyLong());
        verify(userCampusProfileRepository, never()).findByUserId(201L);
        verify(userCampusProfileRepository, never()).findByUserId(240L);
        verify(userRepository, times(1)).findById(anyLong());
        verify(userRepository, never()).findById(201L);
    }

    @Test
    @DisplayName("候选数从 5 涨到 100：距离相关查询次数保持 2 次不变")
    void rankAndConvert_queryCountShouldStayConstantWhileCandidatesGrow() {
        // rankAndConvert 会按 dailyLimit 截断结果；断言不再假设"截断不会发生"，
        // 而是与实现读同一个值（早先这里 stub 200 再断言全量转换，桩未生效时就只剩
        // 50 条视图，夹具自检先把"查询次数恒定"这条真判点挡住了）。
        int effectiveLimit = recommendationConfig.getDailyLimit();
        stubViewerCampus("清华大学");
        stubViewerUser(39.0, 116.0);
        stubGeoIdentity();
        when(geoService.haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(5.0);

        for (int size : new int[]{5, 100}) {
            reset(userCampusProfileRepository, userRepository);
            when(userCampusProfileRepository.findByUserId(VIEWER))
                    .thenReturn(Optional.of(campus(VIEWER, "清华大学")));
            when(userRepository.findById(VIEWER)).thenReturn(Optional.of(user(VIEWER, 39.0, 116.0)));

            List<User> pool = new ArrayList<>();
            for (long id = 1; id <= size; id++) {
                pool.add(user(1000 + id, null, null));
            }
            List<RecommendedPersonView> views = ranker.rankAndConvert(
                    scoredUsers(pool, size), "北京大学", "计算机", Set.of(),
                    Map.of(), Map.of(), Map.of(), VIEWER);
            assertEquals(Math.min(size, effectiveLimit), views.size(),
                    "夹具自检：候选转视图受 dailyLimit 截断，条数必须等于 min(候选数, 上限)");

            verify(userCampusProfileRepository, times(1)).findByUserId(anyLong());
            verify(userRepository, times(1)).findById(anyLong());
        }
    }

    @Test
    @DisplayName("未注入 geoService（旧构造器 / LBS 关闭）：距离路径零查询，早退语义不变")
    void rankAndConvert_withoutGeoService_shouldNotQuery() {
        ReflectionTestUtils.setField(ranker, "geoService", null);
        List<User> pool = List.of(user(301L, 30.0, 120.0), user(302L, 31.0, 121.0));

        List<RecommendedPersonView> views = ranker.rankAndConvert(
                scoredUsers(pool, 10), "北京大学", "计算机", Set.of(),
                Map.of(), Map.of(), Map.of(), VIEWER);

        assertEquals(2, views.size());
        assertNull(views.get(0).distanceText());
        verifyNoInteractions(userCampusProfileRepository);
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("未认证（游客）：distanceText 为 null 且不查任何用户资料")
    void rankAndConvert_anonymousViewer_shouldSkipDistanceLookups() {
        SecurityContextHolder.clearContext();
        stubGeoIdentity();
        List<User> pool = List.of(user(301L, 30.0, 120.0), user(302L, 31.0, 121.0));

        List<RecommendedPersonView> views = ranker.rankAndConvert(
                scoredUsers(pool, 10), "", "", Set.of(),
                Map.of(), Map.of(), Map.of(), null);

        assertNull(views.get(0).distanceText());
        assertNull(views.get(1).distanceText());
        verifyNoInteractions(userCampusProfileRepository);
        verifyNoInteractions(userRepository);
    }

    // ---- 数值/坐标不变 ----

    @Test
    @DisplayName("坐标必须来自「viewer 锚点 + 该候选锚点」：校区锚点与 GPS 回退都对得上")
    void rankAndConvert_shouldPassExpectedAnchorsToGeoService() {
        // viewer：清华大学 → 校区锚点 TSINGHUA（不依赖其 GPS）
        stubViewerCampus("清华大学");
        stubViewerUser(99.0, 99.0);
        stubGeoIdentity();
        when(geoService.haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(12.5);

        // 候选 A：campusProfileMap 里是北京大学 → 锚点 PEKING
        User candidateA = user(501L, 10.0, 10.0);
        // 候选 B：无校区资料 + 有 GPS → 锚点取自身 GPS
        User candidateB = user(502L, 28.5, 115.8);

        ranker.rankAndConvert(
                scoredUsers(new ArrayList<>(List.of(candidateA, candidateB)), 9),
                "北京大学", "计算机", Set.of(),
                Map.of(501L, campus(501L, "北京大学")), Map.of(), Map.of(), VIEWER);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Double> lat1 = ArgumentCaptor.forClass(Double.class);
        ArgumentCaptor<Double> lng1 = ArgumentCaptor.forClass(Double.class);
        ArgumentCaptor<Double> lat2 = ArgumentCaptor.forClass(Double.class);
        ArgumentCaptor<Double> lng2 = ArgumentCaptor.forClass(Double.class);
        verify(geoService, times(2)).haversineKm(
                lat1.capture(), lng1.capture(), lat2.capture(), lng2.capture());

        List<Double> viewerLat = lat1.getAllValues();
        List<Double> viewerLng = lng1.getAllValues();
        List<Double> candLat = lat2.getAllValues();
        List<Double> candLng = lng2.getAllValues();

        // viewer 侧：两个候选都必须是同一份「页级」锚点（清华锚点，而不是各自重查）
        assertEquals(List.of(TSINGHUA[0], TSINGHUA[0]), viewerLat);
        assertEquals(List.of(TSINGHUA[1], TSINGHUA[1]), viewerLng);
        // 候选侧：A 用批量预加载的校区锚点，B 回退自身 GPS
        assertEquals(PEKING[0], candLat.get(0), 0.0001);
        assertEquals(PEKING[1], candLng.get(0), 0.0001);
        assertEquals(28.5, candLat.get(1), 0.0001);
        assertEquals(115.8, candLng.get(1), 0.0001);
    }

    @Test
    @DisplayName("viewer 校区未收录时回退 viewer GPS（页级取好的 User 实体，不再逐候选查）")
    void rankAndConvert_viewerWithoutCampusAnchor_shouldFallBackToViewerGps() {
        stubViewerCampus("未收录大学");
        stubViewerUser(31.23, 121.47);
        stubGeoIdentity();
        when(geoService.haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(20.0);

        List<RecommendedPersonView> views = ranker.rankAndConvert(
                scoredUsers(new ArrayList<>(List.of(user(601L, 30.0, 120.0))), 9),
                "北京大学", "计算机", Set.of(),
                Map.of(601L, campus(601L, "未收录大学2")), Map.of(), Map.of(), VIEWER);

        assertEquals("km=20.0", views.get(0).distanceText());
        ArgumentCaptor<Double> lat1 = ArgumentCaptor.forClass(Double.class);
        verify(geoService).haversineKm(lat1.capture(), anyDouble(), anyDouble(), anyDouble());
        assertEquals(31.23, lat1.getValue(), 0.0001, "viewer 锚点必须回退到其 GPS");
        verify(userRepository, times(1)).findById(VIEWER);
    }

    @Test
    @DisplayName("GPS 漂移 >300km 仍不下发距离（阈值语义未变）")
    void rankAndConvert_shouldSuppressDriftedDistance() {
        stubViewerCampus("清华大学");
        stubViewerUser(39.0, 116.0);
        stubGeoIdentity();
        when(geoService.haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(301.0);

        List<RecommendedPersonView> views = ranker.rankAndConvert(
                scoredUsers(new ArrayList<>(List.of(user(701L, 30.0, 120.0))), 9),
                "北京大学", "计算机", Set.of(),
                Map.of(701L, campus(701L, "北京大学")), Map.of(), Map.of(), VIEWER);

        assertNull(views.get(0).distanceText(), "超过 300km 视为定位漂移，不下发距离");
    }

    @Test
    @DisplayName("viewer 无校区资料且无 GPS：距离为 null（与修复前一致）")
    void rankAndConvert_viewerWithoutAnyAnchor_shouldReturnNullDistance() {
        when(userCampusProfileRepository.findByUserId(VIEWER)).thenReturn(Optional.empty());
        when(userRepository.findById(VIEWER)).thenReturn(Optional.empty());
        stubGeoIdentity();
        when(geoService.haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(3.0);

        List<RecommendedPersonView> views = ranker.rankAndConvert(
                scoredUsers(new ArrayList<>(List.of(user(801L, 30.0, 120.0))), 9),
                "北京大学", "计算机", Set.of(),
                Map.of(801L, campus(801L, "北京大学")), Map.of(), Map.of(), VIEWER);

        assertNull(views.get(0).distanceText());
        verify(geoService, never()).haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble());
    }
}
