package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * RecommendationRanker 单元测试（Task 4.1）。
 */
class RecommendationRankerTest {

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

    private RecommendationRanker ranker;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ranker = new RecommendationRanker(
                recommendationConfig, userCampusProfileRepository,
                userBasicProfileRepository, userScheduleProfileRepository,
                circleMembershipRepository, heartSignalRepository, likeRepository,
                userRepository, campusCertificationService, preferenceCalculator);
    }

    /**
     * 场景：extractInitials 应返回姓名首字符。
     */
    @Test
    void extractInitials_normalName_returnsFirstChar() {
        assertEquals("张", ranker.extractInitials("张三"));
        assertEquals("李", ranker.extractInitials("李四"));
    }

    /**
     * 场景：extractInitials null/空白应返回空字符串。
     */
    @Test
    void extractInitials_blankOrNull_returnsEmpty() {
        assertEquals("", ranker.extractInitials(null));
        assertEquals("", ranker.extractInitials(""));
        assertEquals("", ranker.extractInitials("   "));
    }

    /**
     * 场景：truncateContent null 应返回空字符串。
     */
    @Test
    void truncateContent_null_returnsEmpty() {
        assertEquals("", ranker.truncateContent(null, 10));
    }

    /**
     * 场景：truncateContent 短内容应原样返回。
     */
    @Test
    void truncateContent_shortContent_returnsAsIs() {
        assertEquals("hello", ranker.truncateContent("hello", 10));
    }

    /**
     * 场景：truncateContent 长内容应截断并加省略号。
     */
    @Test
    void truncateContent_longContent_truncatesWithEllipsis() {
        String result = ranker.truncateContent("abcdefghijklmnopqrstuvwxyz", 5);
        assertEquals("abcde...", result);
    }

    /**
     * 场景：buildHeatLabel 总数 >= 100 应返回 "X 人参与"。
     */
    @Test
    void buildHeatLabel_totalAbove100_returnsParticipantsCount() {
        assertEquals("120 人参与", ranker.buildHeatLabel(20, 100));
        assertEquals("100 人参与", ranker.buildHeatLabel(50, 50));
    }

    /**
     * 场景：buildHeatLabel 总数 >= 20 但 < 100 应返回 "热度上升"。
     */
    @Test
    void buildHeatLabel_totalAbove20_returnsHeatRising() {
        assertEquals("热度上升", ranker.buildHeatLabel(10, 30));
        assertEquals("热度上升", ranker.buildHeatLabel(20, 0));
    }

    /**
     * 场景：buildHeatLabel 总数 1-19 应返回 "X 人参与"。
     */
    @Test
    void buildHeatLabel_totalOneToNineteen_returnsParticipantsCount() {
        assertEquals("5 人参与", ranker.buildHeatLabel(2, 3));
        assertEquals("1 人参与", ranker.buildHeatLabel(0, 1));
    }

    /**
     * 场景：buildHeatLabel 总数为 0 应返回 "新发布"。
     */
    @Test
    void buildHeatLabel_zeroTotal_returnsNewPost() {
        assertEquals("新发布", ranker.buildHeatLabel(0, 0));
        assertEquals("新发布", ranker.buildHeatLabel(null, 0));
    }

    /**
     * 场景：getDiscussionLimit 应委托给 RecommendationConfig。
     */
    @Test
    void getDiscussionLimit_delegatesToConfig() {
        when(recommendationConfig.getDiscussionLimit()).thenReturn(8);
        assertEquals(8, ranker.getDiscussionLimit());
    }
}
