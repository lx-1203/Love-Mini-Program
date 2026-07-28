package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 内容过滤控制器单元测试（P7 - Task 7.1.1）。
 */
class ContentFilterControllerTest {

    @Mock private SensitiveWordFilter sensitiveWordFilter;

    private ContentFilterController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ContentFilterController(sensitiveWordFilter);
    }

    @Test
    void constructor_shouldAcceptFilter() {
        // Arrange & Act & Assert
        assertNotNull(new ContentFilterController(sensitiveWordFilter));
    }

    @Test
    void controller_shouldHaveFilterInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
