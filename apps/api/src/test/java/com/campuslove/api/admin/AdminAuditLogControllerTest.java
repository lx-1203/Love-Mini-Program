package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.testdata.ControllerTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 管理后台 - 审计日志控制器单元测试（eladmin「异常日志」筛选对齐，P2-B）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>{@code ?exception=true} → 透传 exceptionOnly=true 给 service（仅查异常日志）</li>
 *   <li>{@code ?exception=false} / 缺省 → 归一化为 null（不参与过滤）</li>
 * </ul>
 */
class AdminAuditLogControllerTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;

    @Mock private AdminAuditLogService auditLogService;
    private AdminAuditLogController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AdminAuditLogController(auditLogService);
        // 默认空分页结果，避免 controller 内部 NPE：
        // - exceptionOnly=true（仅异常日志）与 exceptionOnly=null（不过滤）分别打桩
        when(auditLogService.search(isNull(), isNull(), isNull(), isNull(),
                eq(Boolean.TRUE), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(Page.empty());
        when(auditLogService.search(isNull(), isNull(), isNull(), isNull(),
                isNull(), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(Page.empty());
    }

    @Test
    @DisplayName("exception=true → service.search 收到 exceptionOnly=true")
    void list_withExceptionTrue_shouldPassExceptionOnly() {
        withUserId(ADMIN_ID, () -> {
            controller.list(0, 20, null, null, null, null, Boolean.TRUE);
        });
        verify(auditLogService).search(
                isNull(), isNull(), isNull(), isNull(),
                eq(Boolean.TRUE), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("exception=false → 归一化为 null（不参与过滤）")
    void list_withExceptionFalse_shouldPassNull() {
        withUserId(ADMIN_ID, () -> {
            controller.list(0, 20, null, null, null, null, Boolean.FALSE);
        });
        verify(auditLogService).search(
                isNull(), isNull(), isNull(), isNull(),
                isNull(), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("exception 缺省（null）→ 归一化为 null（不参与过滤）")
    void list_withoutException_shouldPassNull() {
        withUserId(ADMIN_ID, () -> {
            controller.list(0, 20, null, null, null, null, null);
        });
        verify(auditLogService).search(
                isNull(), isNull(), isNull(), isNull(),
                isNull(), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("未认证（无当前用户）→ 401")
    void list_withoutAuthentication_shouldThrow401() {
        withoutUserId(() -> {
            org.junit.jupiter.api.Assertions.assertThrows(
                    org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                    () -> controller.list(0, 20, null, null, null, null, null));
        });
    }

    @Test
    @DisplayName("正常返回分页视图（响应体不为 null）")
    void list_shouldReturnPageView() {
        // Page.empty() → totalPages=0，controller 内部正常构建分页视图
        withUserId(ADMIN_ID, () -> {
            assertNotNull(controller.list(0, 20, null, null, null, null, null).getBody());
        });
    }
}
