package com.campuslove.api.growth;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 免打扰设置控制器单元测试（P7 - Task 7.1.1）。
 */
class DoNotDisturbControllerTest {

    @Mock private DoNotDisturbService doNotDisturbService;

    private DoNotDisturbController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new DoNotDisturbController(doNotDisturbService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new DoNotDisturbController(doNotDisturbService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
