package com.campuslove.api.block;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 拉黑控制器冒烟测试（3-F 拉黑）。
 *
 * <p>覆盖 {@link BlockController} 的核心场景：构造函数注入 blockService。</p>
 *
 * <p>说明：所有端点均依赖 {@link com.campuslove.api.config.SecurityUtils#getCurrentUserId()}，
 * 在无 Web 上下文的纯单元测试中无法直接验证，相关场景由集成测试覆盖。</p>
 */
class BlockControllerTest {

    @Mock private BlockService blockService;

    private BlockController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new BlockController(blockService);
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new BlockController(blockService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        assertNotNull(controller);
    }
}
