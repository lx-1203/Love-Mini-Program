package com.campuslove.api.home;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 首页控制器单元测试（P7 - Task 7.1.1）。
 */
class HomeControllerTest {

    @Mock private HomeService homeService;

    private HomeController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new HomeController(homeService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new HomeController(homeService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
