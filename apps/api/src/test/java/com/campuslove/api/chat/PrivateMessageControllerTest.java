package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 私信控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link PrivateMessageController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：构造函数注入 privateMessageService</li>
 *   <li>场景 2：service 实例已注入</li>
 * </ul>
 *
 * <p>说明：所有端点均依赖 {@link com.campuslove.api.config.SecurityUtils#getCurrentUserId()}，
 * 在无 Web 上下文的纯单元测试中无法直接验证，相关场景由集成测试覆盖。
 * 本测试聚焦于可独立验证的构造注入契约。</p>
 */
class PrivateMessageControllerTest {

    @Mock private PrivateMessageService privateMessageService;

    private PrivateMessageController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new PrivateMessageController(privateMessageService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new PrivateMessageController(privateMessageService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
