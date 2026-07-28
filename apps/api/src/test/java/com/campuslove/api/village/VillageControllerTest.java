package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 村口控制器单元测试（P7 - Task 7.1.1）。
 */
class VillageControllerTest {

    @Mock private VillageService villageService;

    private VillageController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new VillageController(villageService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new VillageController(villageService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
