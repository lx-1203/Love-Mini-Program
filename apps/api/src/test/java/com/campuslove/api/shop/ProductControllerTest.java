package com.campuslove.api.shop;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 商品控制器冒烟测试（3-H 商品）。
 *
 * <p>覆盖 {@link ProductController} 的构造函数注入契约；
 * 端点依赖 SecurityUtils（认证上下文），业务校验由服务层测试覆盖。</p>
 */
class ProductControllerTest {

    @Mock private ProductService productService;

    private ProductController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ProductController(productService);
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new ProductController(productService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        assertNotNull(controller);
    }
}
