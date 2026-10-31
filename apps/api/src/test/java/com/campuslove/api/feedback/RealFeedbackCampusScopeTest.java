package com.campuslove.api.feedback;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.admin.AdminDataScope;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Feedback;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.FeedbackRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;

/**
 * admin 反馈三端点的校区数据作用域单元测试（S2-2，2026-10-30）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code GET /api/v1/admin/feedback} 直连
 * {@code findByTypeNotOrderByCreatedAtDesc(...)}（全库、未分页、零 {@link AdminDataScope} 参与），
 * {@code PUT /api/v1/admin/feedback/{id}/reply} 与
 * {@code POST /api/v1/admin/activity-proposals/{id}/convert} 只有 {@code hasRole('ADMIN')}。
 * 结果：任一校区管理员——乃至只读的 AUDITOR——能枚举所有高校的工单标题与最新回复摘要，
 * 还能回复别校工单、把别校提案转成真实 activities 行。</p>
 *
 * <p>断言口径完全对齐 {@code AdminFeedbackController}（同一套 helper：
 * {@code getCurrentAdminCampusName} + 批量 {@code resolveUserCampusNames} 做读隔离、
 * {@code assertCampusAccess(resolveUserCampusName(提交人))} 做写拦截、
 * {@code resolveCampusForWrite} 决定落库校区；工单归属校区取<b>提交人所属校区</b>，
 * 而不是 {@code expected_campus} 愿望字段）。</p>
 *
 * <p>{@link AdminDataScope} 这里用<b>真实实现</b>（只 mock 它的两个仓储），
 * 因此断言的是真实的校区判定逻辑：删掉服务里的作用域调用即变红，
 * 而不是只验证「有没有调用某个 mock」。</p>
 */
@DisplayName("RealFeedbackService - admin 端点校区数据作用域")
class RealFeedbackCampusScopeTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final String BEIYANG = "北洋大学";
    private static final String NANKAI = "南开大学";

    /** 北洋管理员 */
    private static final long BEIYANG_AUTHOR = 11L;
    /** 南开管理员 */
    private static final long NANKAI_AUTHOR = 22L;
    /** 无校区资料的提交人 */
    private static final long UNKNOWN_CAMPUS_AUTHOR = 33L;

    @Mock private FeedbackRepository feedbackRepository;
    @Mock private MediaStorageService mediaStorageService;
    @Mock private ActivityRepository activityRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;

    private RealFeedbackService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new RealFeedbackService(feedbackRepository, new ObjectMapper(), mediaStorageService,
                activityRepository, new AdminDataScope(userRepository, userCampusProfileRepository));
    }

    // ---- 夹具 ----

    private static User adminAccount(String role, String campusName) {
        User u = new User();
        u.setId(ADMIN_ID);
        u.setRole(role);
        u.setCampusName(campusName);
        return u;
    }

    private static UserCampusProfile profile(long userId, String campusName) {
        UserCampusProfile p = new UserCampusProfile();
        p.setUserId(userId);
        p.setCampusName(campusName);
        return p;
    }

    private static Feedback ticket(long id, long authorId, FeedbackTicketType type, String expectedCampus) {
        Feedback f = new Feedback();
        f.setId(id);
        f.setUserId(authorId);
        f.setType(type);
        f.setTitle("工单 " + id);
        f.setContent("正文 " + id);
        f.setExpectedCampus(expectedCampus);
        f.setStatus(SubmissionStatus.SUBMITTED);
        return f;
    }

    /** 当前管理员是北洋校区管理员。 */
    private void givenBeiyangCampusAdmin() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminAccount("ADMIN", BEIYANG)));
    }

    /** 当前管理员是无管辖校区的 ADMIN（内部哨兵账号）。 */
    private void givenNoCampusAdmin() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminAccount("ADMIN", null)));
    }

    /** 当前管理员是 SUPER_ADMIN（即使误设校区也按全局处理）。 */
    private void givenSuperAdmin() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminAccount("SUPER_ADMIN", BEIYANG)));
    }

    /** 批量作者校区解析：33 号提交人故意没有校区资料。 */
    private void givenAuthorCampusesForBatch() {
        when(userCampusProfileRepository.findByUserIdIn(any()))
                .thenReturn(List.of(profile(BEIYANG_AUTHOR, BEIYANG), profile(NANKAI_AUTHOR, NANKAI)));
    }

    // ---- 列表 ----

    @Test
    @DisplayName("列表：校区管理员只看到本校区提交人的工单；他校与校区未知的工单被排除")
    void list_campusAdmin_returnsOnlyOwnCampus() {
        givenBeiyangCampusAdmin();
        givenAuthorCampusesForBatch();
        when(feedbackRepository.findByTypeNotOrderByCreatedAtDesc(FeedbackTicketType.ACTIVITY_PROPOSAL))
                .thenReturn(List.of(
                        ticket(1L, BEIYANG_AUTHOR, FeedbackTicketType.FEEDBACK, BEIYANG),
                        ticket(2L, NANKAI_AUTHOR, FeedbackTicketType.FEEDBACK, NANKAI),
                        ticket(3L, UNKNOWN_CAMPUS_AUTHOR, FeedbackTicketType.SUGGESTION, null)));

        withUserId(ADMIN_ID, () -> {
            List<SubmissionRecordView> views = service.listAdminFeedback();
            assertEquals(List.of(1L), views.stream().mapToLong(SubmissionRecordView::id).boxed().toList(),
                    "只有北洋提交人的 1 条工单可见（南开、校区未知均排除）");
        });
    }

    @Test
    @DisplayName("列表：无校区账号（内部哨兵）读不到任何数据，且不发起查询、不把哨兵当校区条件")
    void list_noCampusScope_returnsEmptyAndDoesNotQuery() {
        givenNoCampusAdmin();

        withUserId(ADMIN_ID, () -> assertTrue(service.listAdminFeedback().isEmpty(), "哨兵作用域必须为空集"));

        verify(feedbackRepository, never()).findByTypeNotOrderByCreatedAtDesc(any());
    }

    @Test
    @DisplayName("列表：SUPER_ADMIN 仍可读全量（含校区未知的工单），行为与改造前一致")
    void list_superAdmin_seesEverythingUnchanged() {
        givenSuperAdmin();
        when(feedbackRepository.findByTypeNotOrderByCreatedAtDesc(FeedbackTicketType.ACTIVITY_PROPOSAL))
                .thenReturn(List.of(
                        ticket(1L, BEIYANG_AUTHOR, FeedbackTicketType.FEEDBACK, BEIYANG),
                        ticket(2L, NANKAI_AUTHOR, FeedbackTicketType.FEEDBACK, NANKAI),
                        ticket(3L, UNKNOWN_CAMPUS_AUTHOR, FeedbackTicketType.SUGGESTION, null)));

        withUserId(ADMIN_ID, () -> {
            List<SubmissionRecordView> views = service.listAdminFeedback();
            assertEquals(List.of(1L, 2L, 3L),
                    views.stream().mapToLong(SubmissionRecordView::id).boxed().toList());
        });
        // 全局管理员不做任何校区解析（不引入额外查询）
        verify(userCampusProfileRepository, never()).findByUserIdIn(any());
    }

    // ---- 回复 ----

    @Test
    @DisplayName("回复：跨校区工单 → 403，且不写 feedback_tickets")
    void reply_crossCampus_forbiddenAndNoWrite() {
        givenBeiyangCampusAdmin();
        Feedback target = ticket(5L, NANKAI_AUTHOR, FeedbackTicketType.FEEDBACK, NANKAI);
        when(feedbackRepository.findById(5L)).thenReturn(Optional.of(target));
        when(userCampusProfileRepository.findByUserId(NANKAI_AUTHOR))
                .thenReturn(Optional.of(profile(NANKAI_AUTHOR, NANKAI)));

        withUserId(ADMIN_ID, () -> {
            OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                    () -> service.replyFeedback(5L, "已处理"));
            assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        });

        verify(feedbackRepository, never()).save(any());
        assertEquals(SubmissionStatus.SUBMITTED, target.getStatus(), "越权回复不得改变工单状态");
        assertNull(target.getLatestReplySummary(), "越权回复不得写入回复摘要");
    }

    @Test
    @DisplayName("回复：本校区工单 → 正常推进为 REVIEWED")
    void reply_ownCampus_proceeds() {
        givenBeiyangCampusAdmin();
        Feedback target = ticket(5L, BEIYANG_AUTHOR, FeedbackTicketType.FEEDBACK, BEIYANG);
        when(feedbackRepository.findById(5L)).thenReturn(Optional.of(target));
        when(userCampusProfileRepository.findByUserId(BEIYANG_AUTHOR))
                .thenReturn(Optional.of(profile(BEIYANG_AUTHOR, BEIYANG)));
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

        withUserId(ADMIN_ID, () -> {
            SubmissionRecordView view = service.replyFeedback(5L, "已处理，感谢反馈");
            assertEquals(SubmissionStatus.REVIEWED, view.status());
            assertEquals("已处理，感谢反馈", view.latestReplySummary());
        });
    }

    @Test
    @DisplayName("回复：无校区账号（内部哨兵）一律 403")
    void reply_noCampusScope_forbidden() {
        givenNoCampusAdmin();
        Feedback target = ticket(5L, BEIYANG_AUTHOR, FeedbackTicketType.FEEDBACK, BEIYANG);
        when(feedbackRepository.findById(5L)).thenReturn(Optional.of(target));
        when(userCampusProfileRepository.findByUserId(BEIYANG_AUTHOR))
                .thenReturn(Optional.of(profile(BEIYANG_AUTHOR, BEIYANG)));

        withUserId(ADMIN_ID, () -> assertThrows(OperationForbiddenException.class,
                () -> service.replyFeedback(5L, "已处理")));

        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("回复：SUPER_ADMIN 不受校区限制（行为与改造前一致）")
    void reply_superAdmin_unaffected() {
        givenSuperAdmin();
        Feedback target = ticket(5L, NANKAI_AUTHOR, FeedbackTicketType.FEEDBACK, NANKAI);
        when(feedbackRepository.findById(5L)).thenReturn(Optional.of(target));
        when(userCampusProfileRepository.findByUserId(NANKAI_AUTHOR))
                .thenReturn(Optional.of(profile(NANKAI_AUTHOR, NANKAI)));
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

        withUserId(ADMIN_ID, () -> service.replyFeedback(5L, "超管回复"));
        verify(feedbackRepository).save(target);
    }

    // ---- 提案转活动（真实创建 Activity 行）----

    @Test
    @DisplayName("转化：跨校区提案 → 403，不创建 Activity、不改工单状态")
    void convert_crossCampus_forbiddenAndNoActivityCreated() {
        givenBeiyangCampusAdmin();
        Feedback proposal = ticket(7L, NANKAI_AUTHOR, FeedbackTicketType.ACTIVITY_PROPOSAL, NANKAI);
        when(feedbackRepository.findById(7L)).thenReturn(Optional.of(proposal));
        when(userCampusProfileRepository.findByUserId(NANKAI_AUTHOR))
                .thenReturn(Optional.of(profile(NANKAI_AUTHOR, NANKAI)));

        withUserId(ADMIN_ID, () -> {
            OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                    () -> service.convertProposal(7L));
            assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        });

        verify(activityRepository, never()).save(any());
        verify(feedbackRepository, never()).save(any());
        assertEquals(SubmissionStatus.SUBMITTED, proposal.getStatus());
        assertNull(proposal.getConvertedActivityId());
    }

    @Test
    @DisplayName("转化：无校区账号（内部哨兵）一律 403，且哨兵绝不成为落库校区值")
    void convert_noCampusScope_forbidden() {
        givenNoCampusAdmin();
        Feedback proposal = ticket(7L, BEIYANG_AUTHOR, FeedbackTicketType.ACTIVITY_PROPOSAL, BEIYANG);
        when(feedbackRepository.findById(7L)).thenReturn(Optional.of(proposal));
        when(userCampusProfileRepository.findByUserId(BEIYANG_AUTHOR))
                .thenReturn(Optional.of(profile(BEIYANG_AUTHOR, BEIYANG)));

        withUserId(ADMIN_ID, () -> assertThrows(OperationForbiddenException.class,
                () -> service.convertProposal(7L)));

        verify(activityRepository, never()).save(any());
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("转化：校区管理员可转化本校区提案，新活动归属本人校区（哨兵/他校值一律不落库）")
    void convert_campusAdmin_activityOwnedByOwnCampus() {
        givenBeiyangCampusAdmin();
        // 提交人是北洋；expected_campus 只是用户的「期望」字段，不作为归属依据
        Feedback proposal = ticket(7L, BEIYANG_AUTHOR, FeedbackTicketType.ACTIVITY_PROPOSAL, NANKAI);
        when(feedbackRepository.findById(7L)).thenReturn(Optional.of(proposal));
        when(userCampusProfileRepository.findByUserId(BEIYANG_AUTHOR))
                .thenReturn(Optional.of(profile(BEIYANG_AUTHOR, BEIYANG)));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> {
            Activity a = inv.getArgument(0);
            a.setId(900L);
            return a;
        });
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

        withUserId(ADMIN_ID, () -> {
            SubmissionRecordView view = service.convertProposal(7L);
            assertEquals(SubmissionStatus.CONVERTED, view.status());
            assertEquals(Long.valueOf(900L), view.convertedActivityId(), "转换需回填真实创建的 Activity ID");
        });

        ArgumentCaptor<Activity> captor = ArgumentCaptor.forClass(Activity.class);
        verify(activityRepository).save(captor.capture());
        Activity created = captor.getValue();
        assertEquals(BEIYANG, created.getCampusName(), "校区管理员转化的活动必须归属本人管辖校区");
        assertNotEquals(AdminDataScope.NO_CAMPUS_SCOPE, created.getCampusName(), "内部哨兵不得作为校区落库");
        assertEquals(BEIYANG, created.getLocation());
    }

    @Test
    @DisplayName("转化：SUPER_ADMIN 仍按提案期望校区落库（行为与改造前一致）")
    void convert_superAdmin_keepsExpectedCampus() {
        givenSuperAdmin();
        Feedback proposal = ticket(7L, NANKAI_AUTHOR, FeedbackTicketType.ACTIVITY_PROPOSAL, NANKAI);
        when(feedbackRepository.findById(7L)).thenReturn(Optional.of(proposal));
        when(userCampusProfileRepository.findByUserId(NANKAI_AUTHOR))
                .thenReturn(Optional.of(profile(NANKAI_AUTHOR, NANKAI)));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> {
            Activity a = inv.getArgument(0);
            a.setId(900L);
            return a;
        });
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

        withUserId(ADMIN_ID, () -> service.convertProposal(7L));

        ArgumentCaptor<Activity> captor = ArgumentCaptor.forClass(Activity.class);
        verify(activityRepository).save(captor.capture());
        assertEquals(NANKAI, captor.getValue().getCampusName());
        assertEquals(NANKAI, captor.getValue().getLocation());
    }

    @Test
    @DisplayName("转化：期望校区被伪造成内部哨兵时按「未归属」处理，绝不写进 activities.campus_name")
    void convert_sentinelExpectedCampus_neverPersisted() {
        givenSuperAdmin();
        Feedback proposal = ticket(7L, NANKAI_AUTHOR, FeedbackTicketType.ACTIVITY_PROPOSAL,
                AdminDataScope.NO_CAMPUS_SCOPE);
        when(feedbackRepository.findById(7L)).thenReturn(Optional.of(proposal));
        when(userCampusProfileRepository.findByUserId(NANKAI_AUTHOR))
                .thenReturn(Optional.of(profile(NANKAI_AUTHOR, NANKAI)));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> {
            Activity a = inv.getArgument(0);
            a.setId(900L);
            return a;
        });
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

        withUserId(ADMIN_ID, () -> service.convertProposal(7L));

        ArgumentCaptor<Activity> captor = ArgumentCaptor.forClass(Activity.class);
        verify(activityRepository).save(captor.capture());
        assertNull(captor.getValue().getCampusName(), "哨兵值不得落库为校区");
        assertEquals("待定", captor.getValue().getLocation());
    }

    @Test
    @DisplayName("转化：提案不存在时保持原有「不存在」语义（不因新增作用域校验而放宽）")
    void convert_missingProposal_throws() {
        when(feedbackRepository.findById(404L)).thenReturn(Optional.empty());

        withUserId(ADMIN_ID, () -> assertThrows(java.util.NoSuchElementException.class,
                () -> service.convertProposal(404L)));
        verify(activityRepository, never()).save(any());
    }
}
