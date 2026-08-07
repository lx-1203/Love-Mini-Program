package com.campuslove.api.campus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;

/**
 * 校园社交控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link CampusController} 的核心场景：</p>
 * <ul>
 *   <li>校园话题列表查询（含分页、未绑定学校场景）</li>
 *   <li>单个话题详情查询</li>
 *   <li>创建新话题</li>
 *   <li>话题回复列表查询</li>
 *   <li>提交校园认证申请</li>
 *   <li>查询校园认证状态</li>
 * </ul>
 */
class CampusControllerTest extends ControllerTestBase {

    @Mock private CampusService campusService;
    @Mock private CampusCertificationService certService;
    @Mock private UserCampusProfileRepository campusProfileRepository;
    @Mock private SchoolRepository schoolRepository;
    @Mock private com.campuslove.api.discover.ActivityService activityService;
    @Mock private com.campuslove.api.village.VillageService villageService;

    private CampusController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new CampusController(
                campusService, certService, campusProfileRepository, schoolRepository, activityService, villageService);
    }

    /** 创建测试用 CampusTopicView（13 字段 record）。 */
    private CampusTopicView buildTopicView(Long id, String title) {
        return new CampusTopicView(
                id, 1L, "学习", title, "内容", null,
                100L, "测试用户", "https://cdn.example.com/avatar.png",
                0, 0, false, "2026-07-26T10:00:00");
    }

    /** 创建测试用 CampusTopicReplyView（8 字段 record）。 */
    private CampusTopicReplyView buildReplyView(Long id, Long topicId) {
        return new CampusTopicReplyView(
                id, topicId, 100L, "测试用户",
                "https://cdn.example.com/avatar.png", "回复内容",
                false, "2026-07-26T10:00:00");
    }

    /** 创建测试用 CampusCertificationView（POJO）。 */
    private CampusCertificationView buildCertView(Long id, Long userId, String status) {
        return new CampusCertificationView(
                id, userId, "测试大学", "计算机", "https://cdn.example.com/id.jpg",
                status, CampusCertificationView.toStatusLabel(status),
                null, null, LocalDateTime.now(), null);
    }

    @Test
    void listTopics_shouldReturnEmptyPageWhenUserNotBoundToSchool() {
        // Arrange：用户未绑定学校
        withUserId(100L, () -> {
            when(campusProfileRepository.findByUserId(100L)).thenReturn(Optional.empty());

            // Act
            ResponseEntity<CampusTopicPageResponse> resp = controller.listTopics(
                    null, PageRequest.of(0, 10));

            // Assert
            assertNotNull(resp.getBody());
            assertEquals(0, resp.getBody().totalElements(), "未绑定学校应返回空页");
        });
    }

    @Test
    void listTopics_shouldReturnTopicsBySchoolIdWhenBound() {
        // Arrange
        withUserId(100L, () -> {
            UserCampusProfile profile = new UserCampusProfile();
            profile.setCampusName("测试大学");
            when(campusProfileRepository.findByUserId(100L)).thenReturn(Optional.of(profile));

            CampusTopicView topic = buildTopicView(1L, "图书馆开门时间");
            when(campusService.getCampusTopics(anyLong(), any())).thenReturn(List.of(topic));

            // Act
            ResponseEntity<CampusTopicPageResponse> resp = controller.listTopics(
                    "学习", PageRequest.of(0, 10));

            // Assert
            assertEquals(1, resp.getBody().content().size(), "应返回 1 条话题");
        });
    }

    @Test
    void getTopic_shouldDelegateToServiceAndWrapApiResponse() {
        // Arrange
        Long topicId = 42L;
        CampusTopicView view = buildTopicView(topicId, "测试话题");
        when(campusService.getCampusTopic(topicId)).thenReturn(view);

        // Act
        ApiResponse<CampusTopicView> result = controller.getTopic(topicId);

        // Assert
        assertNotNull(result);
        assertSame(view, result.data(), "应原样返回 service 结果");
        verify(campusService).getCampusTopic(topicId);
    }

    @Test
    void createTopic_shouldUseUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            UserCampusProfile profile = new UserCampusProfile();
            profile.setCampusName("测试大学");
            when(campusProfileRepository.findByUserId(100L)).thenReturn(Optional.of(profile));

            CampusTopicView created = buildTopicView(1L, "新话题");
            when(campusService.createCampusTopic(eq(100L), anyLong(), eq("学习"), eq("新话题"), eq("内容")))
                    .thenReturn(created);

            CreateCampusTopicRequest req = new CreateCampusTopicRequest("学习", "新话题", "内容");

            // Act
            ApiResponse<CampusTopicView> result = controller.createTopic(req);

            // Assert
            assertNotNull(result);
            assertSame(created, result.data());
            verify(campusService).createCampusTopic(eq(100L), anyLong(), eq("学习"), eq("新话题"), eq("内容"));
        });
    }

    @Test
    void getCertification_shouldDelegateWithUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            CampusCertificationView view = buildCertView(1L, 100L, "PENDING");
            when(certService.getCertificationStatus(100L)).thenReturn(view);

            // Act
            ApiResponse<CampusCertificationView> result = controller.getCertification();

            // Assert
            assertNotNull(result);
            assertSame(view, result.data());
            verify(certService).getCertificationStatus(100L);
        });
    }

    @Test
    void submitCertification_shouldDelegateWithUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            CampusCertificationView view = buildCertView(1L, 100L, "PENDING");
            when(certService.submitCertification(eq(100L), anyString(), anyString(), anyString()))
                    .thenReturn(view);

            CampusCertificationRequest req = new CampusCertificationRequest(
                    "测试大学", "计算机", "https://cdn.example.com/id.jpg");

            // Act
            ApiResponse<CampusCertificationView> result = controller.submitCertification(req);

            // Assert
            assertNotNull(result);
            assertSame(view, result.data());
            verify(certService).submitCertification(eq(100L), eq("测试大学"), eq("计算机"), eq("https://cdn.example.com/id.jpg"));
        });
    }

    @Test
    void createReply_shouldDelegateWithUserIdAndTopicId() {
        // Arrange
        withUserId(100L, () -> {
            Long topicId = 42L;
            CampusTopicReplyView reply = buildReplyView(1L, topicId);
            when(campusService.replyCampusTopic(eq(topicId), eq(100L), anyString()))
                    .thenReturn(reply);

            CreateCampusReplyRequest req = new CreateCampusReplyRequest("回复内容");

            // Act
            ApiResponse<CampusTopicReplyView> result = controller.createReply(topicId, req);

            // Assert
            assertNotNull(result);
            assertSame(reply, result.data());
            verify(campusService).replyCampusTopic(eq(topicId), eq(100L), eq("回复内容"));
        });
    }

    @Test
    void listReplies_shouldReturnPaginatedResult() {
        // Arrange
        Long topicId = 42L;
        CampusTopicReplyView reply = buildReplyView(1L, topicId);
        when(campusService.getCampusTopicReplies(topicId)).thenReturn(List.of(reply));

        // Act
        ResponseEntity<CampusReplyPageResponse> resp = controller.listReplies(
                topicId, PageRequest.of(0, 20));

        // Assert
        assertNotNull(resp.getBody());
        assertEquals(1, resp.getBody().content().size(), "应返回 1 条回复");
    }

    @Test
    void constructor_shouldAcceptAllDependencies() {
        // Arrange & Act & Assert
        assertNotNull(new CampusController(
                campusService, certService, campusProfileRepository, schoolRepository, activityService, villageService));
    }
}
