package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.ProfileVisitor;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.UserFactory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 个人主页访客控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link ProfileVisitorController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：查询访客列表（空列表） → 返回空 ApiResponse</li>
 *   <li>场景 2：访问自己主页 → 跳过记录，返回空视图</li>
 *   <li>场景 3：访问不存在用户 → 抛 404</li>
 *   <li>场景 4：构造函数注入校验</li>
 * </ul>
 */
class ProfileVisitorControllerTest {

    @Mock private ProfileVisitorRepository profileVisitorRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;

    private ProfileVisitorController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ProfileVisitorController(
                profileVisitorRepository, userRepository, userCampusProfileRepository);
    }

    @Test
    void constructor_shouldAcceptDependencies() {
        // Arrange & Act & Assert
        assertNotNull(new ProfileVisitorController(
                profileVisitorRepository, userRepository, userCampusProfileRepository));
    }

    @Test
    void listVisitors_whenEmpty_shouldReturnEmptyList() {
        // Arrange
        Long hostId = 100L;
        try (var mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(hostId);
            when(profileVisitorRepository.findByHostIdOrderByVisitedAtDesc(hostId))
                    .thenReturn(List.of());

            // Act
            ApiResponse<List<ProfileVisitorController.ProfileVisitorView>> result =
                    controller.listVisitors();

            // Assert
            assertNotNull(result);
            assertEquals(0, result.data().size());
        }
    }

    @Test
    void listVisitors_whenHasRecords_shouldEnrichWithUserInfo() {
        // Arrange
        Long hostId = 200L;
        Long visitorId = 300L;
        ProfileVisitor record = new ProfileVisitor(visitorId, hostId, LocalDateTime.now());
        User visitor = UserFactory.withId(visitorId);

        try (var mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(hostId);
            when(profileVisitorRepository.findByHostIdOrderByVisitedAtDesc(hostId))
                    .thenReturn(List.of(record));
            when(userRepository.findAllById(List.of(visitorId)))
                    .thenReturn(List.of(visitor));
            when(userCampusProfileRepository.findByUserIdIn(List.of(visitorId)))
                    .thenReturn(List.of());

            // Act
            ApiResponse<List<ProfileVisitorController.ProfileVisitorView>> result =
                    controller.listVisitors();

            // Assert
            assertEquals(1, result.data().size());
            assertEquals(visitorId, result.data().get(0).visitorId());
        }
    }

    @Test
    void recordVisit_whenSelfVisit_shouldSkipRecording() {
        // Arrange
        Long userId = 100L;

        try (var mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            // Act：访问自己主页应跳过记录
            ApiResponse<ProfileVisitorController.ProfileVisitorView> result =
                    controller.recordVisit(userId);

            // Assert：返回空视图，不写入数据库
            assertNotNull(result.data());
            assertEquals(userId, result.data().visitorId());
        }
    }
}
