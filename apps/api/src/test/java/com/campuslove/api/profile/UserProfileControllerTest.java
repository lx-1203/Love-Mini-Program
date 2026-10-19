package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.campuslove.api.auth.OnlineUserService;
import com.campuslove.api.auth.UserDeviceSession;
import com.campuslove.api.discover.UserPreferenceCalculator;
import com.campuslove.api.entity.InterestTag;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.location.GeoService;
import com.campuslove.api.repository.InterestTagRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserDeviceSessionRepository;
import com.campuslove.api.repository.UserOnlineStatusRepository;
import com.campuslove.api.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * R6/L07（2026-10-19）：他人主页三个新契约字段的推导规则单测。
 *
 * <p>钉住「保真纪律」：有真实来源才给值，来源缺失必须是 null（而非 false / 写死文案），
 * 否则前端会把假数据当真数据渲染。</p>
 */
class UserProfileControllerTest {

    private static final Long VIEWER_ID = 100L;
    private static final Long TARGET_ID = 200L;

    @Mock private UserRepository userRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private ProfileVisitorRepository profileVisitorRepository;
    @Mock private PostRepository postRepository;
    @Mock private UserPreferenceCalculator preferenceCalculator;
    @Mock private InterestTagRepository interestTagRepository;
    @Mock private UserOnlineStatusRepository userOnlineStatusRepository;
    @Mock private UserDeviceSessionRepository userDeviceSessionRepository;
    @Mock private OnlineUserService onlineUserService;

    /** 用真实实现（纯数学 + 既有 ADR-16 模糊化），避免把距离口径测成一套、线上另一套 */
    private GeoService geoService;

    private AutoCloseable mocks;
    private UserProfileController controller;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        geoService = new GeoService(userRepository);
        controller = new UserProfileController(
                userRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                likeRepository,
                profileVisitorRepository,
                postRepository,
                preferenceCalculator,
                interestTagRepository,
                userOnlineStatusRepository,
                userDeviceSessionRepository,
                onlineUserService,
                geoService);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(VIEWER_ID, null, List.of()));
    }

    @AfterEach
    void tearDown() throws Exception {
        SecurityContextHolder.clearContext();
        mocks.close();
    }

    // ---- 夹具 ----

    private User user(Long id, Double lat, Double lng) {
        User user = new User();
        user.setId(id);
        user.setNickname("用户" + id);
        user.setStatus("active");
        user.setProfileCompletion(80);
        if (lat != null) {
            user.setLatitude(BigDecimal.valueOf(lat));
        }
        if (lng != null) {
            user.setLongitude(BigDecimal.valueOf(lng));
        }
        return user;
    }

    private UserCampusProfile campus(String campusName, String cityName) {
        UserCampusProfile campus = new UserCampusProfile();
        campus.setCampusName(campusName);
        campus.setCityName(cityName);
        campus.setVerificationStatus("verified");
        return campus;
    }

    private UserBasicProfile basic(Integer birthYear) {
        UserBasicProfile basic = new UserBasicProfile();
        basic.setBirthYear(birthYear);
        return basic;
    }

    private void stubTarget(User target, UserBasicProfile targetBasic, UserCampusProfile targetCampus) {
        when(userRepository.findById(TARGET_ID)).thenReturn(Optional.of(target));
        when(userBasicProfileRepository.findByUserId(TARGET_ID)).thenReturn(Optional.of(targetBasic));
        when(userCampusProfileRepository.findByUserId(TARGET_ID)).thenReturn(Optional.of(targetCampus));
    }

    private void stubViewer(User viewer, UserBasicProfile viewerBasic, UserCampusProfile viewerCampus) {
        when(userRepository.findById(VIEWER_ID)).thenReturn(Optional.of(viewer));
        when(userBasicProfileRepository.findByUserId(VIEWER_ID)).thenReturn(Optional.of(viewerBasic));
        when(userCampusProfileRepository.findByUserId(VIEWER_ID)).thenReturn(Optional.of(viewerCampus));
    }

    // ---- online ----

    /** 三处来源（Redis 会话 / 心跳表 / 设备会话）都查无此用户 → null（未知，不是离线） */
    @Test
    void getPublicProfile_noPresenceEvidence_onlineIsNull() {
        stubViewer(user(VIEWER_ID, null, null), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, null, null), basic(null), campus("清华大学", "北京市"));
        when(onlineUserService.getSession(TARGET_ID)).thenReturn(Optional.empty());
        when(userOnlineStatusRepository.findByUserId(TARGET_ID)).thenReturn(Optional.empty());
        when(userDeviceSessionRepository.findByUserIdAndRevokedFalse(TARGET_ID)).thenReturn(List.of());

        assertNull(controller.getPublicProfile(TARGET_ID).online());
    }

    /** 存在未过期未登出的会话（与管理后台「在线用户」同源）→ true */
    @Test
    void getPublicProfile_liveSession_onlineIsTrue() {
        stubViewer(user(VIEWER_ID, null, null), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, null, null), basic(null), campus("清华大学", "北京市"));
        long now = System.currentTimeMillis();
        when(onlineUserService.getSession(TARGET_ID)).thenReturn(Optional.of(
                new OnlineUserService.OnlineSessionRecord("jti-1", "wechat", now, now + 60_000L)));

        assertEquals(Boolean.TRUE, controller.getPublicProfile(TARGET_ID).online());
    }

    /** 登录过（user_device_session 有未吊销记录）但当前无有效会话/心跳 → false（确定离线） */
    @Test
    void getPublicProfile_deviceSessionOnly_onlineIsFalse() {
        stubViewer(user(VIEWER_ID, null, null), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, null, null), basic(null), campus("清华大学", "北京市"));
        UserDeviceSession session = new UserDeviceSession();
        session.setUserId(TARGET_ID);
        session.setRevoked(false);
        session.setLastActiveAt(LocalDateTime.now().minusHours(6));
        when(onlineUserService.getSession(TARGET_ID)).thenReturn(Optional.empty());
        when(userOnlineStatusRepository.findByUserId(TARGET_ID)).thenReturn(Optional.empty());
        when(userDeviceSessionRepository.findByUserIdAndRevokedFalse(TARGET_ID)).thenReturn(List.of(session));

        assertEquals(Boolean.FALSE, controller.getPublicProfile(TARGET_ID).online());
    }

    // ---- distanceText ----

    /** 任一侧缺经纬度 → null（不退化成「同城」之类的猜测文案） */
    @Test
    void getPublicProfile_viewerWithoutCoords_distanceIsNull() {
        stubViewer(user(VIEWER_ID, null, null), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, 39.93, 116.40), basic(null), campus("清华大学", "北京市"));

        assertNull(controller.getPublicProfile(TARGET_ID).distanceText());
    }

    /** 两侧都有 gcj02 坐标 → 按 haversine + ADR-16 模糊化输出（39.90→39.93 约 3.3km → "3km"） */
    @Test
    void getPublicProfile_bothCoordsPresent_distanceIsFormatted() {
        stubViewer(user(VIEWER_ID, 39.90, 116.40), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, 39.93, 116.40), basic(null), campus("清华大学", "北京市"));

        assertEquals("3km", controller.getPublicProfile(TARGET_ID).distanceText());
    }

    /** 同校压制距离（与 RecommendationRanker.deriveDistanceText 同口径，避免同校显示 "<1km"） */
    @Test
    void getPublicProfile_sameCampus_distanceIsSuppressed() {
        stubViewer(user(VIEWER_ID, 39.90, 116.40), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, 39.93, 116.40), basic(null), campus("北京大学", "北京市"));

        assertNull(controller.getPublicProfile(TARGET_ID).distanceText());
    }

    // ---- commonPoints ----

    /**
     * 兴趣共同点：title 取真实标签；subtitle/icon 只透传 interest_tag 字典的 category/icon
     * ——字典没值就给 null，有值即自动转真值（本用例同时覆盖两种情形）。
     */
    @Test
    void getPublicProfile_commonInterestPoints_passThroughDictionaryOnlyWhenPresent() {
        when(preferenceCalculator.parseInterestTags(anyString())).thenReturn(new LinkedHashSet<>());
        when(preferenceCalculator.parseInterestTags("[\"摄影\",\"音乐\"]"))
                .thenReturn(new LinkedHashSet<>(List.of("摄影", "音乐")));
        when(preferenceCalculator.parseInterestTags("[\"音乐\",\"篮球\"]"))
                .thenReturn(new LinkedHashSet<>(List.of("音乐", "篮球")));

        InterestTag barePhoto = new InterestTag();
        barePhoto.setName("摄影");
        InterestTag music = new InterestTag();
        music.setName("音乐");
        music.setCategory("校园活动");
        music.setIcon("i-music");
        when(interestTagRepository.findByEnabledTrueOrderByIdAsc()).thenReturn(List.of(barePhoto, music));

        UserBasicProfile viewerBasic = new UserBasicProfile();
        viewerBasic.setInterestTags("[\"摄影\",\"音乐\"]");
        UserBasicProfile targetBasic = new UserBasicProfile();
        targetBasic.setInterestTags("[\"音乐\",\"篮球\"]");
        stubViewer(user(VIEWER_ID, 39.90, 116.40), viewerBasic, campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, 39.99, 116.40), targetBasic, campus("清华大学", "上海市"));

        UserProfileDTO view = controller.getPublicProfile(TARGET_ID);
        List<CommonPointDTO> points = view.relation().commonPoints();
        assertEquals(1, points.size());
        assertEquals("音乐", points.get(0).title());
        assertEquals("校园活动", points.get(0).subtitle());
        assertEquals("i-music", points.get(0).icon());
        // 旧字段保留且与新字段一一对应
        assertEquals(List.of("音乐"), view.relation().commonInterests());
    }

    /** 字典 category/icon 实测全空（0/8）时，兴趣条目副标题与图标必须是 null，不查表编造 */
    @Test
    void getPublicProfile_interestWithoutDictionaryEntry_hasNullSubtitleAndIcon() {
        InterestTag photo = new InterestTag();
        photo.setName("摄影");
        photo.setGroupKey("lifestyle"); // 内部分组键，不得当作副标题
        when(interestTagRepository.findByEnabledTrueOrderByIdAsc()).thenReturn(List.of(photo));

        UserBasicProfile viewerBasic = new UserBasicProfile();
        viewerBasic.setInterestTags("[\"摄影\"]");
        UserBasicProfile targetBasic = new UserBasicProfile();
        targetBasic.setInterestTags("[\"摄影\"]");
        stubViewer(user(VIEWER_ID, null, null), viewerBasic, campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, null, null), targetBasic, campus("清华大学", "上海市"));
        when(preferenceCalculator.parseInterestTags("[\"摄影\"]")).thenReturn(new LinkedHashSet<>(List.of("摄影")));

        List<CommonPointDTO> points = controller.getPublicProfile(TARGET_ID).relation().commonPoints();
        assertEquals(1, points.size());
        assertEquals("摄影", points.get(0).title());
        assertNull(points.get(0).subtitle());
        assertNull(points.get(0).icon());
    }

    /** 关系型共同点的副标题全部来自真实列：同校=campus_name(+campus_branch)，同城=city_name，同龄=birth_year 推导 */
    @Test
    void getPublicProfile_relationPoints_usePersistedColumnsAsSubtitle() {
        int currentYear = java.time.Year.now().getValue();
        UserBasicProfile viewerBasic = basic(currentYear - 22);
        UserBasicProfile targetBasic = basic(currentYear - 24);
        UserCampusProfile viewerCampus = campus("北京大学", "北京市");
        UserCampusProfile targetCampus = campus("北京大学", "北京市");
        targetCampus.setCampusBranch("燕园校区");
        stubViewer(user(VIEWER_ID, null, null), viewerBasic, viewerCampus);
        stubTarget(user(TARGET_ID, null, null), targetBasic, targetCampus);
        when(preferenceCalculator.parseInterestTags(any())).thenReturn(new LinkedHashSet<>());

        UserProfileDTO view = controller.getPublicProfile(TARGET_ID);
        List<CommonPointDTO> points = view.relation().commonPoints();
        assertEquals(
                List.of(
                        new CommonPointDTO("同校", "北京大学 · 燕园校区", null),
                        new CommonPointDTO("同城", "北京市", null),
                        new CommonPointDTO("同龄", "24岁", null)),
                points);
        assertEquals(List.of("同校", "同城", "同龄"), view.relation().commonInterests());
        assertTrue(view.relation().matchScore() > 0);
    }

    /** 自己视角无查看者语义：共同点与距离一律为空 */
    @Test
    void getMyProfile_doesNotExposeRelationPointsOrDistance() {
        when(userRepository.findById(VIEWER_ID)).thenReturn(Optional.of(user(VIEWER_ID, 39.90, 116.40)));
        when(userBasicProfileRepository.findByUserId(VIEWER_ID)).thenReturn(Optional.of(basic(2002)));
        when(userCampusProfileRepository.findByUserId(VIEWER_ID)).thenReturn(Optional.of(campus("北京大学", "北京市")));

        UserProfileDTO view = controller.getMyProfile();
        assertEquals(List.of(), view.relation().commonPoints());
        assertEquals(List.of(), view.relation().commonInterests());
        assertNull(view.distanceText());
    }

    /** 兜底：所有仓库都返回 null/空时不得抛异常（any() 兜住未显式打桩的调用） */
    @Test
    void getPublicProfile_withSparseFixtures_stillReturnsContract() {
        stubViewer(user(VIEWER_ID, null, null), basic(null), campus("北京大学", "北京市"));
        stubTarget(user(TARGET_ID, null, null), basic(null), campus("清华大学", "上海市"));
        when(preferenceCalculator.parseInterestTags(any())).thenReturn(new LinkedHashSet<>());
        when(preferenceCalculator.parseStringList(any())).thenReturn(List.of());
        when(onlineUserService.getSession(any())).thenReturn(Optional.empty());
        when(userOnlineStatusRepository.findByUserId(any())).thenReturn(Optional.empty());
        when(userDeviceSessionRepository.findByUserIdAndRevokedFalse(any())).thenReturn(List.of());
        when(interestTagRepository.findByEnabledTrueOrderByIdAsc()).thenReturn(List.of());

        UserProfileDTO view = controller.getPublicProfile(TARGET_ID);
        assertEquals(List.of(), view.relation().commonPoints());
        assertNull(view.distanceText());
        assertNull(view.online());
    }
}
