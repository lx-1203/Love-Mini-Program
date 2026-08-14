package com.campuslove.api.verification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.mock.MockLoveVerificationService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * 恋爱认证服务单元测试（3-A）。
 *
 * <p>覆盖 {@link LoveVerificationService} 的状态流转：</p>
 * <ul>
 *   <li>Real 实现：首次提交 → pending；重复提交（pending/approved）→ 409 业务冲突；
 *       rejected 覆盖重提；未提交查询 → 空视图（status=null）</li>
 *   <li>Mock 实现：提交立即 pending（与前端 mock 分支一致）；simulateApprove → approved</li>
 * </ul>
 */
class LoveVerificationServiceTest {

    private LoveVerificationApplicationRepository repository;
    private RealLoveVerificationService realService;
    private MockLoveVerificationService mockService;

    @BeforeEach
    void setUp() {
        repository = mock(LoveVerificationApplicationRepository.class);
        // save 返回传入实体并回填 id（模拟 JPA 托管实体行为），否则 submit 内 save 返回 null 导致 NPE
        when(repository.save(any(LoveVerificationApplication.class))).thenAnswer(inv -> {
            LoveVerificationApplication app = inv.getArgument(0);
            if (app.getId() == null) {
                app.setId(1L);
            }
            return app;
        });
        realService = new RealLoveVerificationService(repository);
        mockService = new MockLoveVerificationService();
    }

    // ---- Real 实现：首次提交 ----

    @Test
    void real_submit_firstTime_createsPendingApplication() {
        when(repository.findByUserId(100L)).thenReturn(Optional.empty());

        LoveVerificationView view = realService.submit(
                100L, "张三", "20260001", "广州大学", "/uploads/mock/student-card.jpg");

        assertNotNull(view.id(), "首次提交应生成记录 ID");
        assertEquals("pending", view.status(), "首次提交状态应为 pending");
        assertEquals("张三", view.studentName());
        assertEquals("20260001", view.studentId());
        assertEquals("广州大学", view.schoolName());
        assertNotNull(view.submittedAt(), "提交时间不应为空");
        assertNull(view.reviewedAt(), "未审核不应有审核时间");
    }

    // ---- Real 实现：重复提交 ----

    @Test
    void real_submit_whenPending_throwsConflict() {
        LoveVerificationApplication pending = buildApplication(1L, 100L, "pending");
        when(repository.findByUserId(100L)).thenReturn(Optional.of(pending));

        assertThrows(ResourceConflictException.class,
                () -> realService.submit(100L, "张三", "20260001", "广州大学", "/uploads/x.jpg"),
                "审核中重复提交应抛 409 业务冲突");
    }

    @Test
    void real_submit_whenApproved_throwsConflict() {
        LoveVerificationApplication approved = buildApplication(1L, 100L, "approved");
        when(repository.findByUserId(100L)).thenReturn(Optional.of(approved));

        assertThrows(ResourceConflictException.class,
                () -> realService.submit(100L, "张三", "20260001", "广州大学", "/uploads/x.jpg"),
                "已认证后重复提交应抛 409 业务冲突");
    }

    // ---- Real 实现：驳回后重新提交 ----

    @Test
    void real_submit_whenRejected_overwritesToPending() {
        LoveVerificationApplication rejected = buildApplication(1L, 100L, "rejected");
        rejected.setRejectReason("照片不清晰，请重新上传");
        rejected.setReviewedAt(java.time.LocalDateTime.now());
        when(repository.findByUserId(100L)).thenReturn(Optional.of(rejected));

        LoveVerificationView view = realService.submit(
                100L, "李四", "20260002", "华南理工大学", "/uploads/new-card.jpg");

        assertEquals("pending", view.status(), "驳回后重提应重置为 pending");
        assertEquals("李四", view.studentName(), "覆盖后的学生姓名应更新");
        assertNull(view.rejectReason(), "重提后应清空驳回原因");
        assertNull(view.reviewedAt(), "重提后应清空审核时间");
    }

    // ---- Real 实现：状态查询 ----

    @Test
    void real_getStatus_noApplication_returnsEmptyView() {
        when(repository.findByUserId(999L)).thenReturn(Optional.empty());

        LoveVerificationView view = realService.getStatus(999L);

        assertNull(view.status(), "未提交申请 status 应为 null（前端映射 unverified）");
        assertNull(view.id(), "未提交申请 id 应为 null");
    }

    @Test
    void real_getStatus_withApplication_returnsView() {
        LoveVerificationApplication pending = buildApplication(5L, 200L, "pending");
        when(repository.findByUserId(200L)).thenReturn(Optional.of(pending));

        LoveVerificationView view = realService.getStatus(200L);

        assertEquals(5L, view.id());
        assertEquals("pending", view.status());
        assertEquals("张三", view.studentName());
    }

    // ---- Mock 实现（与前端 mock 分支行为一致） ----

    @Test
    void mock_submit_returnsPendingImmediately() {
        LoveVerificationView view = mockService.submit(
                1L, "张三", "20260001", "广州大学", "/uploads/mock/student-card.jpg");

        assertEquals("pending", view.status(), "mock 提交应立即返回 pending（前端分支一致）");
    }

    @Test
    void mock_simulateApprove_returnsApproved() {
        mockService.submit(1L, "张三", "20260001", "广州大学", "/uploads/mock/student-card.jpg");
        LoveVerificationView view = mockService.simulateApprove(1L);

        assertEquals("approved", view.status(), "模拟审核通过应返回 approved");
    }

    @Test
    void mock_getStatus_noApplication_returnsEmptyView() {
        LoveVerificationView view = mockService.getStatus(999L);
        assertNull(view.status());
    }

    /** 构造测试用申请实体。 */
    private LoveVerificationApplication buildApplication(Long id, Long userId, String status) {
        LoveVerificationApplication app = new LoveVerificationApplication();
        app.setId(id);
        app.setUserId(userId);
        app.setStudentName("张三");
        app.setStudentId("20260001");
        app.setSchoolName("广州大学");
        app.setStudentIdCardUrl("/uploads/mock/student-card.jpg");
        app.setStatus(status);
        app.setSubmittedAt(java.time.LocalDateTime.now().minusDays(1));
        return app;
    }
}
