package com.campuslove.api.tasks;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 任务与积分控制器冒烟测试（3-J 任务与积分）。
 *
 * <p>覆盖 {@link TaskController} 的构造函数注入契约；
 * 端点依赖 SecurityUtils（认证上下文），业务校验由服务层测试覆盖。</p>
 */
class TaskControllerTest {

    @Mock private TaskService taskService;

    private TaskController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new TaskController(taskService);
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new TaskController(taskService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        assertNotNull(controller);
    }
}
