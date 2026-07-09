package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleTopicRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * 推荐服务单元测试（Phase B - Task B4）。
 *
 * <p>覆盖范围：
 * <ul>
 *   <li>{@link RecommendationFilter} record 的紧凑构造器规整逻辑与 {@code isEmpty()} 判定</li>
 *   <li>{@link RealRecommendationService#matchesFilter} 各筛选维度组合：
 *     <ul>
 *       <li>身高范围（heightMin / heightMax）</li>
 *       <li>学历多选（educationLevels）</li>
 *       <li>关键词模糊匹配（keyword 命中 name/bio/tags）</li>
 *       <li>感情状态多选（relationshipStatuses，DB 回查）</li>
 *       <li>籍贯省市（hometownProvince / hometownCity，DB 回查）</li>
 *       <li>未来定居城市（futureCity，DB 回查）</li>
 *       <li>多维度组合筛选</li>
 *       <li>DB 回查返回空时返回 false</li>
 *       <li>空筛选条件返回 true（向后兼容）</li>
 *     </ul>
 *   </li>
 * </ul>
 * </p>
 *
 * <p>测试策略：
 * <ul>
 *   <li>matchesFilter 为包级可见方法，可直接调用避免构造 17 个依赖的复杂 stub</li>
 *   <li>仅 mock matchesFilter 实际用到的 userBasicProfileRepository（DB 回查路径）</li>
 *   <li>其余 16 个依赖传入 mock 占位即可，构造函数不做非空校验</li>
 *   <li>每个测试用例构造独立的 RecommendedPersonView 与 RecommendationFilter</li>
 * </ul>
 * </p>
 */
class RecommendationServiceTest {

    private UserBasicProfileRepository userBasicProfileRepository;
    private RealRecommendationService realService;

    @BeforeEach
    void setUp() {
        // 仅 userBasicProfileRepository 在 matchesFilter 中被实际调用
        userBasicProfileRepository = mock(UserBasicProfileRepository.class);
        realService = new RealRecommendationService(
                mock(RecommendationConfig.class),
                mock(UserRepository.class),
                mock(LikeRepository.class),
                mock(UserCampusProfileRepository.class),
                mock(UserScheduleProfileRepository.class),
                mock(RecommendationPreferenceRepository.class),
                userBasicProfileRepository,
                mock(ActivityRepository.class),
                mock(ActivityEnrollmentRepository.class),
                mock(CircleTopicRepository.class),
                mock(PostRepository.class),
                mock(HeartSignalRepository.class),
                mock(PassRecordRepository.class),
                mock(CircleMembershipRepository.class),
                mock(DailyAnswerRepository.class),
                mock(ObjectMapper.class),
                mock(CampusCertificationService.class)
        );
    }

    // ============ RecommendationFilter record 行为 ============

    /**
     * TR-B2.4（向后兼容）：所有维度均为 null/空时，isEmpty() 应返回 true。
     */
    @Test
    void filter_isEmpty_allNull_returnsTrue() {
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, null);
        assertTrue(filter.isEmpty(), "全空筛选条件应判定为空");
    }

    /**
     * 空字符串与空白字符串应被规整为 null，使 isEmpty() 仍返回 true。
     */
    @Test
    void filter_isEmpty_blankStringsNormalized_returnsTrue() {
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, "  ", "", "   ", "  ");
        assertTrue(filter.isEmpty(), "空白字符串应被规整为 null，isEmpty 仍为 true");
    }

    /**
     * 任一维度被激活时，isEmpty() 应返回 false。
     */
    @Test
    void filter_isEmpty_anyDimensionActive_returnsFalse() {
        assertFalse(new RecommendationFilter(
                170, null, null, null, null, null, null, null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, 185, null, null, null, null, null, null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, null, Set.of("bachelor"), null, null, null, null, null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, null, null, Set.of("never"), null, null, null, null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, null, null, null, "广东省", null, null, null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, null, null, null, null, "广州市", null, null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, null, null, null, null, null, "深圳市", null).isEmpty());
        assertFalse(new RecommendationFilter(
                null, null, null, null, null, null, null, "摄影").isEmpty());
    }

    /**
     * null Set 应被规整为不可变空 Set（避免下游 NPE）。
     */
    @Test
    void filter_nullSetsNormalized_toEmptyImmutableSet() {
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, null);
        assertTrue(filter.educationLevels().isEmpty());
        assertTrue(filter.relationshipStatuses().isEmpty());
    }

    // ============ matchesFilter: 身高范围 ============

    /**
     * TR-B2.1：heightMin=170&heightMax=185 时，身高在范围内应通过。
     */
    @Test
    void matchesFilter_heightInRange_returnsTrue() {
        RecommendedPersonView view = buildView(180, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, null, null, null, null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 身高低于 heightMin 应返回 false。
     */
    @Test
    void matchesFilter_heightBelowMin_returnsFalse() {
        RecommendedPersonView view = buildView(165, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, null, null, null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 身高高于 heightMax 应返回 false。
     */
    @Test
    void matchesFilter_heightAboveMax_returnsFalse() {
        RecommendedPersonView view = buildView(190, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, null, null, null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 视图未填写身高（height=null）但筛选设置了身高范围时，应返回 false。
     */
    @Test
    void matchesFilter_heightNullWithRange_returnsFalse() {
        RecommendedPersonView view = buildView(null, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, null, null, null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 仅设置 heightMin（无 heightMax）时，仅校验下界。
     */
    @Test
    void matchesFilter_heightMinOnly_checksLowerBound() {
        RecommendedPersonView view = buildView(175, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                170, null, null, null, null, null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 身高恰好等于 heightMin（闭区间边界）应通过。
     */
    @Test
    void matchesFilter_heightEqualsMin_returnsTrue() {
        RecommendedPersonView view = buildView(170, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, null, null, null, null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    // ============ matchesFilter: 学历多选 ============

    /**
     * TR-B2.2：educationLevel=bachelor,master 时，学历在集合内应通过。
     */
    @Test
    void matchesFilter_educationInSet_returnsTrue() {
        RecommendedPersonView view = buildView(null, "bachelor", null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, Set.of("bachelor", "master"), null, null, null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 学历不在集合内应返回 false。
     */
    @Test
    void matchesFilter_educationNotInSet_returnsFalse() {
        RecommendedPersonView view = buildView(null, "phd", null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, Set.of("bachelor", "master"), null, null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 视图未填写学历（educationLevel=null）但筛选设置了学历集合时应返回 false。
     */
    @Test
    void matchesFilter_educationNullWithSet_returnsFalse() {
        RecommendedPersonView view = buildView(null, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, Set.of("bachelor"), null, null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    // ============ matchesFilter: 关键词模糊匹配 ============

    /**
     * TR-B2.3：keyword 命中 nickname 应通过。
     */
    @Test
    void matchesFilter_keywordMatchesName_returnsTrue() {
        RecommendedPersonView view = buildViewWithName("摄影少女", null, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, "摄影");

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * keyword 命中 bio 应通过。
     */
    @Test
    void matchesFilter_keywordMatchesBio_returnsTrue() {
        RecommendedPersonView view = buildViewWithName("用户A", "热爱摄影与阅读", null, null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, "摄影");

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * keyword 命中 tags 应通过。
     */
    @Test
    void matchesFilter_keywordMatchesTag_returnsTrue() {
        RecommendedPersonView view = buildViewWithName("用户B", null,
                List.of("摄影", "旅行"), null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, "摄影");

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * keyword 大小写不敏感应通过。
     */
    @Test
    void matchesFilter_keywordCaseInsensitive_returnsTrue() {
        RecommendedPersonView view = buildViewWithName("Photographer", null, null, null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, "PHOTO");

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * keyword 在 name/bio/tags 中均未命中应返回 false。
     */
    @Test
    void matchesFilter_keywordNoMatch_returnsFalse() {
        RecommendedPersonView view = buildViewWithName("用户C", "热爱阅读",
                List.of("阅读"), null);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, "摄影");

        assertFalse(realService.matchesFilter(view, filter));
    }

    // ============ matchesFilter: DB 回查路径 ============

    /**
     * 感情状态在集合内（DB 回查）应通过。
     */
    @Test
    void matchesFilter_relationshipStatusInSet_returnsTrue() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setRelationshipStatus("never");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, Set.of("never", "divorced"),
                null, null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 感情状态不在集合内（DB 回查）应返回 false。
     */
    @Test
    void matchesFilter_relationshipStatusNotInSet_returnsFalse() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setRelationshipStatus("married_before");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, Set.of("never", "divorced"),
                null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 籍贯省份匹配（DB 回查）应通过。
     */
    @Test
    void matchesFilter_hometownProvinceMatch_returnsTrue() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setHometownProvince("广东省");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, "广东省", null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 籍贯省份不匹配（DB 回查）应返回 false。
     */
    @Test
    void matchesFilter_hometownProvinceMismatch_returnsFalse() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setHometownProvince("江苏省");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, "广东省", null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 籍贯城市匹配（DB 回查）应通过。
     */
    @Test
    void matchesFilter_hometownCityMatch_returnsTrue() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setHometownCity("广州市");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, "广州市", null, null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 籍贯城市不匹配（DB 回查）应返回 false。
     */
    @Test
    void matchesFilter_hometownCityMismatch_returnsFalse() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setHometownCity("深圳市");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, "广州市", null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 未来定居城市匹配（DB 回查）应通过。
     */
    @Test
    void matchesFilter_futureCityMatch_returnsTrue() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setFutureCity("广州市");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, "广州市", null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 未来定居城市不匹配（DB 回查）应返回 false。
     */
    @Test
    void matchesFilter_futureCityMismatch_returnsFalse() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setFutureCity("深圳市");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, "广州市", null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * DB 回查返回空（用户无 BasicProfile 记录）时，应返回 false。
     */
    @Test
    void matchesFilter_dbLookupEmpty_returnsFalse() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.empty());

        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, Set.of("never"), null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    // ============ matchesFilter: 多维度组合 ============

    /**
     * 多维度组合：身高+学历+keyword 同时满足时返回 true。
     */
    @Test
    void matchesFilter_combinedDimensions_allMatch_returnsTrue() {
        RecommendedPersonView view = buildViewWithName("摄影少女", "大三", List.of("摄影"), 100L);
        view = withHeightAndEdu(view, 175, "bachelor");
        // 不需要 DB 回查（无 relationship/hometown/future 维度）
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, Set.of("bachelor", "master"), null, null, null, null, "摄影");

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 多维度组合：身高通过但 keyword 不命中时返回 false（短路）。
     */
    @Test
    void matchesFilter_combinedDimensions_keywordMiss_returnsFalse() {
        RecommendedPersonView view = buildViewWithName("阅读少女", "大三",
                List.of("阅读"), 100L);
        view = withHeightAndEdu(view, 175, "bachelor");
        RecommendationFilter filter = new RecommendationFilter(
                170, 185, Set.of("bachelor"), null, null, null, null, "摄影");

        assertFalse(realService.matchesFilter(view, filter));
    }

    /**
     * 多维度组合：身高+学历+感情状态全部通过时返回 true。
     */
    @Test
    void matchesFilter_combinedWithDbLookup_allMatch_returnsTrue() {
        RecommendedPersonView view = buildView(175, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setRelationshipStatus("never");
        bp.setHometownProvince("广东省");
        bp.setFutureCity("广州市");
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                170, 185, Set.of("bachelor"), Set.of("never"),
                "广东省", null, "广州市", null);

        assertTrue(realService.matchesFilter(view, filter));
    }

    /**
     * 多维度组合：视图层维度通过，但 DB 维度（感情状态）失败时返回 false。
     */
    @Test
    void matchesFilter_combinedWithDbLookup_relationshipMiss_returnsFalse() {
        RecommendedPersonView view = buildView(175, "bachelor", 100L);
        UserBasicProfile bp = new UserBasicProfile();
        bp.setRelationshipStatus("married_before"); // 不在 Set 中
        when(userBasicProfileRepository.findByUserId(100L)).thenReturn(Optional.of(bp));

        RecommendationFilter filter = new RecommendationFilter(
                170, 185, Set.of("bachelor"), Set.of("never"),
                null, null, null, null);

        assertFalse(realService.matchesFilter(view, filter));
    }

    // ============ 向后兼容 ============

    /**
     * 空筛选条件（isEmpty=true）时，matchesFilter 应直接返回 true，不触发任何 DB 查询。
     */
    @Test
    void matchesFilter_emptyFilter_returnsTrueWithoutDbLookup() {
        RecommendedPersonView view = buildView(180, "bachelor", 100L);
        RecommendationFilter filter = new RecommendationFilter(
                null, null, null, null, null, null, null, null);

        assertTrue(realService.matchesFilter(view, filter));
        // 验证未触发 DB 查询（isEmpty 时 needDbLookup 应为 false）
        org.mockito.Mockito.verifyNoInteractions(userBasicProfileRepository);
    }

    // ============ 工具方法 ============

    /**
     * 构造测试用 RecommendedPersonView，使用默认 name/bio/tags。
     */
    private RecommendedPersonView buildView(Integer height, String educationLevel, Long id) {
        return new RecommendedPersonView(
                id, "测试用户", "T", "headline", "commonGround", "available",
                "campus", "/avatar.jpg", List.of("tag1"), "bio", List.of(),
                false, false, 0,
                height, educationLevel, List.of(), null, null, "none"
        );
    }

    /**
     * 构造测试用 RecommendedPersonView，可指定 name/bio/tags。
     */
    private RecommendedPersonView buildViewWithName(String name, String bio,
                                                     List<String> tags, Long id) {
        return new RecommendedPersonView(
                id, name, "T", "headline", "commonGround", "available",
                "campus", "/avatar.jpg",
                tags == null ? List.of() : tags,
                bio, List.of(),
                false, false, 0,
                null, null, List.of(), null, null, "none"
        );
    }

    /**
     * 在已有视图基础上覆盖 height 与 educationLevel 字段。
     */
    private RecommendedPersonView withHeightAndEdu(RecommendedPersonView base,
                                                    Integer height, String educationLevel) {
        return new RecommendedPersonView(
                base.id(), base.name(), base.initials(), base.headline(),
                base.commonGround(), base.availability(), base.campusName(),
                base.avatarUrl(), base.tags(), base.bio(), base.images(),
                base.isSameSchool(), base.isSameMajor(), base.commonCircleCount(),
                height, educationLevel, base.photoGallery(),
                base.halfBodyPhotoUrl(), base.personalVideoUrl(), base.verificationBadgeLevel()
        );
    }
}
