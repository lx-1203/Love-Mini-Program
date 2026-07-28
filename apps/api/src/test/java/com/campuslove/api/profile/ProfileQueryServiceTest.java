package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.user.FollowUserView;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * ProfileQueryService 单元测试（Task 4.2.4）。
 *
 * <p>覆盖核心查询方法：资料完善度计算、关注关系查询、批量加载、JSON 解析等。</p>
 */
class ProfileQueryServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserFollowRepository userFollowRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private PostRepository postRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private CampusCertificationService campusCertificationService;

    private ProfileQueryService queryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        queryService = new ProfileQueryService(
                userRepository,
                userFollowRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                postRepository,
                postLikeRepository,
                new ObjectMapper(),
                campusCertificationService);
    }

    // ---- calculateProfileCompletion ----

    /**
     * 场景：四类资料均存在时，完善度应为 100%。
     */
    @Test
    void calculateProfileCompletion_allProfilesPresent_returns100() {
        Long userId = 1L;
        UserBasicProfile basic = new UserBasicProfile();
        basic.setNickname("若星");
        basic.setInterestTags("[\"摄影\"]");

        UserCampusProfile campus = new UserCampusProfile();
        campus.setCampusName("北大");

        UserScheduleProfile schedule = new UserScheduleProfile();
        schedule.setPreferredCampusArea("东校区");

        when(userBasicProfileRepository.findByUserId(userId)).thenReturn(Optional.of(basic));
        when(userCampusProfileRepository.findByUserId(userId)).thenReturn(Optional.of(campus));
        when(userScheduleProfileRepository.findByUserId(userId)).thenReturn(Optional.of(schedule));

        int completion = queryService.calculateProfileCompletion(userId);

        assertEquals(100, completion, "所有资料齐全时完善度应为 100");
    }

    /**
     * 场景：仅基本资料（nickname 非空）时，完善度应为 30%。
     */
    @Test
    void calculateProfileCompletion_onlyBasicNickname_returns30() {
        Long userId = 2L;
        UserBasicProfile basic = new UserBasicProfile();
        basic.setNickname("小张");
        basic.setInterestTags("[]");

        when(userBasicProfileRepository.findByUserId(userId)).thenReturn(Optional.of(basic));
        when(userCampusProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userScheduleProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

        int completion = queryService.calculateProfileCompletion(userId);

        assertEquals(30, completion, "仅有 nickname 时完善度应为 30");
    }

    /**
     * 场景：无任何资料时，完善度应为 0%。
     */
    @Test
    void calculateProfileCompletion_noProfiles_returns0() {
        Long userId = 3L;
        when(userBasicProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userCampusProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userScheduleProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

        int completion = queryService.calculateProfileCompletion(userId);

        assertEquals(0, completion, "无任何资料时完善度应为 0");
    }

    // ---- isFollowing ----

    /**
     * 场景：userFollowRepository 返回 true 时，isFollowing 应返回 true。
     */
    @Test
    void isFollowing_whenRepositoryReturnsTrue_returnsTrue() {
        when(userFollowRepository.existsByFollowerIdAndFollowingId(1L, 2L)).thenReturn(true);
        assertTrue(queryService.isFollowing(1L, 2L), "已关注应返回 true");
    }

    /**
     * 场景：任一参数为 null 时，isFollowing 应返回 false（短路逻辑）。
     */
    @Test
    void isFollowing_withNullParameters_returnsFalse() {
        assertFalse(queryService.isFollowing(null, 2L), "followerId 为 null 应返回 false");
        assertFalse(queryService.isFollowing(1L, null), "targetUserId 为 null 应返回 false");
    }

    // ---- batchLoadUsers ----

    /**
     * 场景：传入多个用户 ID 时，应一次性查询并组装为 Map。
     */
    @Test
    void batchLoadUsers_withMultipleIds_returnsUserMap() {
        User user1 = createUser(1L, "用户1");
        User user2 = createUser(2L, "用户2");
        when(userRepository.findAllById(List.of(1L, 2L)))
                .thenReturn(List.of(user1, user2));

        Map<Long, User> result = queryService.batchLoadUsers(List.of(1L, 2L));

        assertEquals(2, result.size());
        assertEquals("用户1", result.get(1L).getNickname());
        assertEquals("用户2", result.get(2L).getNickname());
    }

    /**
     * 场景：传入空列表时，应返回空 Map（不触发 DB 查询）。
     */
    @Test
    void batchLoadUsers_withEmptyList_returnsEmptyMap() {
        Map<Long, User> result = queryService.batchLoadUsers(List.of());
        assertTrue(result.isEmpty(), "空列表应返回空 Map");
    }

    // ---- parseStringList / serializeListToJson ----

    /**
     * 场景：合法 JSON 数组应被解析为 List<String>。
     */
    @Test
    void parseStringList_validJson_returnsList() {
        List<String> result = queryService.parseStringList("[\"摄影\",\"篮球\",\"阅读\"]");
        assertEquals(List.of("摄影", "篮球", "阅读"), result);
    }

    /**
     * 场景：非法 JSON 应返回空列表（不影响主流程）。
     */
    @Test
    void parseStringList_invalidJson_returnsEmptyList() {
        List<String> result = queryService.parseStringList("not a json");
        assertNotNull(result);
        assertTrue(result.isEmpty(), "非法 JSON 应返回空列表");
    }

    /**
     * 场景：List 序列化为 JSON 字符串。
     */
    @Test
    void serializeListToJson_validList_returnsJsonString() {
        String json = queryService.serializeListToJson(List.of("a", "b", "c"));
        assertEquals("[\"a\",\"b\",\"c\"]", json);
    }

    /**
     * 场景：空 List 序列化为 "[]"。
     */
    @Test
    void serializeListToJson_emptyList_returnsEmptyArray() {
        String json = queryService.serializeListToJson(List.of());
        assertEquals("[]", json);
    }

    // ---- calculateTotalLikesCount ----

    /**
     * 场景：用户多个帖子的总点赞数应正确累加。
     */
    @Test
    void calculateTotalLikesCount_multiplePosts_returnsSum() {
        Long userId = 1L;
        Post post1 = createPost(10L, userId);
        Post post2 = createPost(11L, userId);
        Post post3 = createPost(12L, userId);

        when(postRepository.findByAuthorId(userId)).thenReturn(List.of(post1, post2, post3));
        when(postLikeRepository.countByPostId(10L)).thenReturn(5L);
        when(postLikeRepository.countByPostId(11L)).thenReturn(10L);
        when(postLikeRepository.countByPostId(12L)).thenReturn(0L);

        int total = queryService.calculateTotalLikesCount(userId);

        assertEquals(15, total, "总点赞数应为 5+10+0=15");
    }

    /**
     * 场景：用户无帖子时，总点赞数应为 0。
     */
    @Test
    void calculateTotalLikesCount_noPosts_returnsZero() {
        Long userId = 2L;
        when(postRepository.findByAuthorId(userId)).thenReturn(List.of());

        int total = queryService.calculateTotalLikesCount(userId);

        assertEquals(0, total);
    }

    // ---- getFollowers ----

    /**
     * 场景：查询粉丝列表时，应批量预加载粉丝用户信息（避免 N+1）。
     */
    @Test
    void getFollowers_shouldBatchLoadUsers() {
        Long userId = 1L;
        UserFollow follow1 = new UserFollow(2L, userId);
        UserFollow follow2 = new UserFollow(3L, userId);

        when(userFollowRepository.findByFollowingId(userId))
                .thenReturn(List.of(follow1, follow2));
        when(userRepository.findAllById(List.of(2L, 3L)))
                .thenReturn(List.of(createUser(2L, "粉丝1"), createUser(3L, "粉丝2")));

        List<FollowUserView> followers = queryService.getFollowers(userId);

        assertEquals(2, followers.size());
        assertEquals("粉丝1", followers.get(0).nickname());
    }

    /**
     * 场景：userId 为 null 时应抛 IllegalArgumentException。
     */
    @Test
    void getFollowers_withNullUserId_throwsException() {
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> queryService.getFollowers(null));
    }

    // ---- 辅助方法 ----

    private User createUser(Long id, String nickname) {
        User user = new User();
        user.setId(id);
        user.setNickname(nickname);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        return user;
    }

    private Post createPost(Long id, Long authorId) {
        Post post = new Post();
        post.setId(id);
        post.setAuthorId(authorId);
        return post;
    }
}
