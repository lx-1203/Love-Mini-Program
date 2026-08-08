package com.campuslove.api.discover;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * RecommendationRanker 完整画像字段填充测试（V2026.08.08.0015）。
 *
 * <p>验证 rankAndConvert 视图转换对寻觅页卡片/详情页新增字段的真实填充：</p>
 * <ul>
 *   <li>occupation / incomeRange / age / registeredAt —— 来自 user_basic_profile 与 user</li>
 *   <li>personality / mbti / expectedPartner / ipLocation —— 不再占位 null</li>
 *   <li>recentPosts —— 批量查询（避免 N+1）后每组取最新一条动态</li>
 * </ul>
 *
 * <p>纯单测（仿 RealMatchServiceTest）：真实 RecommendationRanker + Mockito mock 全部
 * repository，不启动 Spring 上下文。</p>
 */
class RecommendationRankerFieldsTest {

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

    private RecommendationRanker ranker;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(recommendationConfig.getDailyLimit()).thenReturn(10);
        // UserPreferenceCalculator 为 mock：JSON 解析逻辑由真实实现负责，此处直接返回期望值
        when(preferenceCalculator.parseStringList(anyString()))
                .thenReturn(java.util.Arrays.asList("阳光开朗", "共情力强"));
        ranker = new RecommendationRanker(
                recommendationConfig,
                userCampusProfileRepository,
                userBasicProfileRepository,
                userScheduleProfileRepository,
                circleMembershipRepository,
                heartSignalRepository,
                likeRepository,
                userRepository,
                campusCertificationService,
                preferenceCalculator,
                campusCertificationRepository,
                postRepository);
    }

    /** 构造带完整画像字段的候选用户。 */
    private User buildUser(Long id, String nickname) {
        User user = new User();
        user.setId(id);
        user.setNickname(nickname);
        user.setAvatarUrl("https://cdn.example.com/avatar-" + id + ".png");
        user.setBio("喜欢图书馆的下午和操场晚风");
        user.setCreatedAt(LocalDateTime.of(2026, 3, 12, 8, 0));
        return user;
    }

    /** 构造带新字段的 user_basic_profile。 */
    private UserBasicProfile buildBasicProfile(Long userId) {
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(userId);
        bp.setNickname("Alice");
        bp.setBio("喜欢图书馆的下午和操场晚风");
        bp.setHeight(165);
        bp.setEducationLevel("bachelor");
        bp.setRelationshipStatus("never");
        bp.setHometownProvince("江苏省");
        bp.setHometownCity("南京市");
        bp.setInterestTags("[\"摄影\",\"阅读\"]");
        // V2026.08.08.0015 新字段
        bp.setOccupation("产品经理");
        bp.setIncomeRange("15k-30k");
        bp.setPersonalityTags("[\"阳光开朗\",\"共情力强\"]");
        bp.setMbti("INFJ");
        bp.setExpectedPartner("真诚、边界感清晰，聊天节奏合拍。");
        bp.setBirthYear(2003);
        return bp;
    }

    private UserCampusProfile buildCampusProfile(Long userId) {
        UserCampusProfile cp = new UserCampusProfile();
        cp.setUserId(userId);
        cp.setCampusName("北京大学");
        cp.setDepartmentName("计算机");
        return cp;
    }

    private Post buildPost(Long id, Long authorId, String content, LocalDateTime createdAt) {
        Post post = new Post();
        post.setId(id);
        post.setAuthorId(authorId);
        post.setContent(content);
        post.setImages("[\"https://cdn.example.com/post-" + id + ".jpg\"]");
        post.setLikesCount(18);
        post.setCommentsCount(5);
        post.setStatus(PostStatus.active);
        post.setCreatedAt(createdAt);
        return post;
    }

    @Test
    void rankAndConvert_fillsAllNewProfileFields() {
        // Arrange
        User user = buildUser(100L, "Alice");
        UserBasicProfile bp = buildBasicProfile(100L);
        UserCampusProfile cp = buildCampusProfile(100L);

        // 动态预览：该作者有 2 条动态，应按时间倒序取最新 1 条
        Post newer = buildPost(21L, 100L, "最新的动态内容", LocalDateTime.of(2026, 8, 1, 12, 0));
        Post older = buildPost(20L, 100L, "较早的动态内容", LocalDateTime.of(2026, 7, 28, 9, 30));
        Page<Post> postPage = new PageImpl<>(List.of(newer, older));
        when(postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                anyList(), any(PostStatus.class), any(PageRequest.class)))
                .thenReturn(postPage);

        RecommendationStrategy.ScoredUser scored = new RecommendationStrategy.ScoredUser(user, 90);

        // Act（rankAndConvert 会原地 sort，需可变列表）
        List<RecommendedPersonView> views = ranker.rankAndConvert(
                new ArrayList<>(List.of(scored)), "北京大学", "计算机", Set.of(),
                Map.of(100L, cp), Map.of(100L, bp), Map.of(100L, List.<CircleMembership>of()));

        // Assert
        assertEquals(1, views.size(), "应返回 1 个候选人视图");
        RecommendedPersonView view = views.get(0);

        // 卡片完整字段（V2026.08.08.0015）
        assertEquals("产品经理", view.occupation(), "职业应来自 user_basic_profile");
        assertEquals("15k-30k", view.incomeRange(), "收入档位应来自 user_basic_profile");
        assertEquals(23, view.age(), "年龄应由出生年份推导（2026 - 2003 = 23）");
        assertNotNull(view.registeredAt(), "注册时间应为 ISO 字符串");
        assertTrue(view.registeredAt().startsWith("2026-03-12"), "注册时间应来自 user.createdAt");

        // 画像字段不再占位
        assertEquals(List.of("阳光开朗", "共情力强"), view.personality(), "性格标签应解析 personality_tags JSON");
        assertEquals("INFJ", view.mbti(), "MBTI 应来自 user_basic_profile");
        assertEquals("真诚、边界感清晰，聊天节奏合拍。", view.expectedPartner(), "期待画像应来自 user_basic_profile");
        assertEquals("江苏省 · 南京市", view.ipLocation(), "IP 属地应由籍贯省/市推导");

        // 动态预览：批量查询后每组取最新 1 条
        assertNotNull(view.recentPosts(), "动态预览不应为 null");
        assertEquals(1, view.recentPosts().size(), "每个候选人应只取最新 1 条动态");
        assertEquals("最新的动态内容", view.recentPosts().get(0).content(), "应取时间最新的一条");
        assertEquals(18L, view.recentPosts().get(0).likes(), "点赞数应来自 Post.likesCount");
        assertEquals(5L, view.recentPosts().get(0).comments(), "评论数应来自 Post.commentsCount");
    }

    @Test
    void rankAndConvert_basicProfileMissing_returnsNullSafeView() {
        // Arrange：无 basic profile（未填资料的用户），视图转换不应 NPE
        User user = buildUser(101L, "Bob");
        when(postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                anyList(), any(PostStatus.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        RecommendationStrategy.ScoredUser scored = new RecommendationStrategy.ScoredUser(user, 80);

        // Act（rankAndConvert 会原地 sort，需可变列表）
        List<RecommendedPersonView> views = ranker.rankAndConvert(
                new ArrayList<>(List.of(scored)), "", "", Set.of(),
                Map.of(), Map.of(), Map.of());

        // Assert
        assertEquals(1, views.size());
        RecommendedPersonView view = views.get(0);
        assertNull(view.occupation(), "无资料时职业应为 null");
        assertNull(view.incomeRange(), "无资料时收入应为 null");
        assertNull(view.age(), "无资料时年龄应为 null");
        assertNotNull(view.personality(), "无资料时性格标签应为空列表而非 null");
        assertTrue(view.personality().isEmpty());
        assertNotNull(view.recentPosts(), "无动态时应为空列表而非 null");
        assertTrue(view.recentPosts().isEmpty());
        assertNotNull(view.registeredAt(), "用户有 created_at 时注册时间应为 ISO 字符串");
    }
}
