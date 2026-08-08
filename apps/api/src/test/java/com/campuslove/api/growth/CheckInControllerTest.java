package com.campuslove.api.growth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

/**
 * 签到控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link CheckInController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：签到成功 → 委托 checkInService.checkIn(userId)</li>
 *   <li>场景 2：查询签到状态 → 委托 getCheckInStatus(userId)</li>
 *   <li>场景 3：补签成功 → 委托 makeUp(userId, date)</li>
 *   <li>场景 4：未认证 → SecurityUtils 抛出 401</li>
 * </ul>
 */
class CheckInControllerTest {

    @Mock private CheckInService checkInService;

    private CheckInController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new CheckInController(checkInService);
    }

    @Test
    void checkIn_shouldDelegateWithUserIdFromSecurityContext() {
        // Arrange
        Long userId = 100L;
        CheckInResultView view = new CheckInResultView(
                true, 5, 100, 0, false, false, 0, 0, 50);

        // 使用 mockStatic 模拟 SecurityUtils 静态方法
        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(checkInService.checkIn(userId)).thenReturn(view);

            // Act
            ApiResponse<CheckInResultView> result = controller.checkIn();

            // Assert
            assertNotNull(result);
            assertSame(view, result.data(), "应原样返回 service 结果");
            verify(checkInService).checkIn(userId);
        }
    }

    @Test
    void getStatus_shouldDelegateToService() {
        // Arrange
        Long userId = 200L;
        CheckInStatusView view = new CheckInStatusView(true, 3, 0, 100L);

        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(checkInService.getCheckInStatus(userId)).thenReturn(view);

            // Act
            ApiResponse<CheckInStatusView> result = controller.getStatus();

            // Assert
            assertSame(view, result.data());
            verify(checkInService).getCheckInStatus(userId);
        }
    }

    @Test
    void makeUp_shouldDelegateWithDate() {
        // Arrange
        Long userId = 300L;
        String date = "2026-07-25";
        MakeUpCheckInRequest req = new MakeUpCheckInRequest(date);
        MakeUpCheckInResultView view = new MakeUpCheckInResultView(
                true, date, 6, 1, 50, 0);

        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(checkInService.makeUp(eq(userId), eq(date))).thenReturn(view);

            // Act
            ApiResponse<MakeUpCheckInResultView> result = controller.makeUp(req);

            // Assert
            assertSame(view, result.data());
            verify(checkInService).makeUp(eq(userId), eq(date));
        }
    }

    @Test
    void checkIn_whenUnauthenticated_shouldPropagateUnauthorized() {
        // Arrange & Act & Assert
        // SecurityUtils 在无认证上下文时直接抛 Unauthorized
        // controller 应让异常向上传播，由 GlobalExceptionHandler 转 401
        // 显式清空 SecurityContextHolder，避免上游测试 mockStatic(SecurityUtils.class)
        // 残留或同线程其他测试设置认证上下文导致本用例未抛 401
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        org.springframework.web.client.HttpClientErrorException.Unauthorized ex =
                assertThrows(org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                        () -> controller.checkIn());
        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert：构造函数注入校验
        assertNotNull(new CheckInController(checkInService));
    }
}
