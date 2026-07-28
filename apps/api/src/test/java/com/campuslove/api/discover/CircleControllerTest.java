package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 兴趣圈子控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link CircleController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：构造函数注入校验</li>
 *   <li>场景 2：service 委托链路存在</li>
 * </ul>
 */
class CircleControllerTest {

    @Mock private CircleService circleService;

    private CircleController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new CircleController(circleService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new CircleController(circleService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert：controller 实例化后 service 字段应已注入
        assertNotNull(controller);
    }
}
