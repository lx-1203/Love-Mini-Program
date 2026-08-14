package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.testdata.ControllerTestBase;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 账号安全控制器单元测试（3-B/3-C/3-D/3-E）。
 * 覆盖 Controller → Service 的委托契约（userId 取自 SecurityContext，token 取自请求头）。
 */
class AccountSecurityControllerTest extends ControllerTestBase {

    @Mock private AccountSecurityService accountSecurityService;
    @Mock private DeviceSessionService deviceSessionService;

    private AccountSecurityController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AccountSecurityController(accountSecurityService, deviceSessionService);
    }

    @Test
    void changePassword_delegatesWithUserIdAndToken() {
        withUserId(100L, () -> {
            ApiResponse<Void> response = controller.changePassword(
                    "Bearer current-token",
                    new ChangePasswordRequest("OldPass@2026", "NewPass@2026"));

            assertEquals(0, response.code());
        });
        verify(accountSecurityService).changePassword(100L, "OldPass@2026", "NewPass@2026", "current-token");
    }

    @Test
    void changePhone_delegatesWithUserId() {
        withUserId(100L, () -> {
            ApiResponse<Void> response = controller.changePhone(
                    new ChangePhoneRequest("OldPass@2026", null, "13800001111"));

            assertEquals(0, response.code());
        });
        verify(accountSecurityService).changePhone(100L, "OldPass@2026", "13800001111");
    }

    @Test
    void listDevices_delegatesAndWrapsData() {
        when(deviceSessionService.listDevices(100L)).thenReturn(List.of(
                new UserDeviceSessionView(1L, "device-a", "wechat",
                        LocalDateTime.now(), false, LocalDateTime.now())));

        withUserId(100L, () -> {
            ApiResponse<List<UserDeviceSessionView>> response = controller.listDevices();

            assertEquals(0, response.code());
            assertEquals(1, response.data().size());
            assertEquals("device-a", response.data().get(0).deviceId());
        });
        verify(deviceSessionService).listDevices(100L);
    }

    @Test
    void revokeDevice_delegatesWithUserIdAndDeviceId() {
        withUserId(100L, () -> {
            ApiResponse<Void> response = controller.revokeDevice(7L);

            assertEquals(0, response.code());
        });
        verify(deviceSessionService).revokeDevice(100L, 7L);
    }

    @Test
    void deactivate_delegatesWithUserIdAndToken() {
        withUserId(100L, () -> {
            ApiResponse<Void> response = controller.deactivate(
                    "Bearer current-token", new DeactivateRequest(null, "确认注销"));

            assertEquals(0, response.code());
        });
        verify(accountSecurityService).deactivateAccount(
                eq(100L), isNull(), eq("确认注销"), eq("current-token"));
    }

    @Test
    void deactivate_noAuthHeader_passesNullToken() {
        withUserId(100L, () -> controller.deactivate(null, new DeactivateRequest("pwd", null)));

        verify(accountSecurityService).deactivateAccount(eq(100L), eq("pwd"), isNull(), isNull());
    }
}
