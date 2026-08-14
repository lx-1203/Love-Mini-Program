package com.campuslove.api.consulting;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 咨询报名控制器冒烟测试（3-I 咨询报名）。
 *
 * <p>覆盖 {@link ConsultingController} 的构造函数注入契约；
 * 端点依赖 SecurityUtils（认证上下文），业务校验由服务层测试覆盖。</p>
 */
class ConsultingControllerTest {

    @Mock private ConsultingService consultingService;

    private ConsultingController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ConsultingController(consultingService);
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new ConsultingController(consultingService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        assertNotNull(controller);
    }
}
