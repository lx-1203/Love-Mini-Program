package com.campuslove.api.official;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.testdata.ControllerTestBase;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

/**
 * 官方号控制器单元测试（2026-08-07 官方号体系）。
 *
 * <p>覆盖 {@link OfficialAccountController} 的核心场景：</p>
 * <ul>
 *   <li>GET /api/v1/official-accounts → 官方号列表（按 sortOrder 升序）</li>
 *   <li>GET /api/v1/official-accounts/{code}/messages → 消息流（发布时间升序）</li>
 *   <li>未知 code → 返回空列表（不 404，语义与消息列表静态渲染一致）</li>
 * </ul>
 */
class OfficialAccountControllerTest extends ControllerTestBase {

    @Mock private OfficialAccountService officialAccountService;

    private OfficialAccountController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new OfficialAccountController(officialAccountService);
    }

    @Test
    void getAccounts_shouldReturnEnabledAccountsInOrder() {
        // Arrange
        OfficialAccountView assistant = new OfficialAccountView(
                1L, "official-assistant", "产品助手", "系统通知 · 功能答疑", "");
        OfficialAccountView promoter = new OfficialAccountView(
                2L, "official-promoter", "活动运营", "活动推送 · 福利通知", "");
        when(officialAccountService.getAccounts()).thenReturn(List.of(assistant, promoter));

        // Act
        List<OfficialAccountView> result = controller.getAccounts();

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size(), "应返回两个官方号");
        assertEquals("official-assistant", result.get(0).code(), "产品助手号应排第一");
        assertEquals("产品助手", result.get(0).name(), "账号名应为 产品助手");
        verify(officialAccountService).getAccounts();
    }

    @Test
    void getMessages_shouldReturnMessageStream() {
        // Arrange
        OfficialMessageView text = new OfficialMessageView(
                101L, "text", "你好，我是产品助手 🤖", null, null, null, null,
                LocalDateTime.now().minusDays(1));
        OfficialMessageView card = new OfficialMessageView(
                204L, "card", "在星空下认识心动的人",
                "七夕特别企划：星空告白夜", "描述", "七夕限定",
                "/pages/activities/detail?id=qixi-2026", LocalDateTime.now());
        when(officialAccountService.getMessages("official-promoter"))
                .thenReturn(List.of(text, card));

        // Act
        ResponseEntity<List<OfficialMessageView>> response =
                controller.getMessages("official-promoter");

        // Assert
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size(), "应返回两条消息");
        OfficialMessageView cardView = response.getBody().get(1);
        assertEquals("card", cardView.messageType(), "活动卡片消息类型应为 card");
        assertEquals("七夕限定", cardView.cardTag(), "卡片角标应为 七夕限定");
        assertEquals("/pages/activities/detail?id=qixi-2026", cardView.cardTargetUrl(),
                "卡片 CTA 应指向活动详情页");
        verify(officialAccountService).getMessages("official-promoter");
    }

    @Test
    void getMessages_withUnknownCode_shouldReturnEmptyList() {
        // Arrange
        when(officialAccountService.getMessages("unknown-account")).thenReturn(List.of());

        // Act
        ResponseEntity<List<OfficialMessageView>> response =
                controller.getMessages("unknown-account");

        // Assert
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty(), "未知账号应返回空列表");
        verify(officialAccountService).getMessages("unknown-account");
    }
}
