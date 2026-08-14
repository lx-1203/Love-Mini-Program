package com.campuslove.api.verification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.testdata.ControllerTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 恋爱认证控制器单元测试（3-A）。
 * 覆盖 GET/POST /api/v1/verification 与 {@link LoveVerificationService} 的委托契约。
 */
class LoveVerificationControllerTest extends ControllerTestBase {

    @Mock private LoveVerificationService verificationService;

    private LoveVerificationController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new LoveVerificationController(verificationService);
    }

    @Test
    void getStatus_delegatesToServiceWithCurrentUserId() {
        LoveVerificationView view = LoveVerificationView.from(buildEntity());
        when(verificationService.getStatus(100L)).thenReturn(view);

        withUserId(100L, () -> {
            ApiResponse<LoveVerificationView> response = controller.getStatus();

            assertEquals(0, response.code(), "成功响应 code 应为 0");
            assertEquals("pending", response.data().status());
        });
        verify(verificationService).getStatus(100L);
    }

    @Test
    void getStatus_noApplication_returnsNullStatus() {
        when(verificationService.getStatus(100L)).thenReturn(LoveVerificationView.empty());

        withUserId(100L, () -> {
            ApiResponse<LoveVerificationView> response = controller.getStatus();

            assertNull(response.data().status(), "未提交申请 status 应为 null");
        });
    }

    @Test
    void submit_delegatesToServiceWithCurrentUserId() {
        LoveVerificationView view = LoveVerificationView.from(buildEntity());
        when(verificationService.submit(anyLong(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(view);

        withUserId(100L, () -> {
            ApiResponse<LoveVerificationView> response = controller.submit(
                    new LoveVerificationRequest("张三", "20260001", "广州大学", "/uploads/mock/student-card.jpg"));

            assertEquals(0, response.code());
            assertNotNull(response.data().id());
        });
        verify(verificationService).submit(100L, "张三", "20260001", "广州大学", "/uploads/mock/student-card.jpg");
    }

    /** 构造测试用申请实体。 */
    private LoveVerificationApplication buildEntity() {
        LoveVerificationApplication app = new LoveVerificationApplication();
        app.setId(1L);
        app.setUserId(100L);
        app.setStudentName("张三");
        app.setStudentId("20260001");
        app.setSchoolName("广州大学");
        app.setStudentIdCardUrl("/uploads/mock/student-card.jpg");
        app.setStatus("pending");
        app.setSubmittedAt(java.time.LocalDateTime.now().minusDays(1));
        return app;
    }
}
