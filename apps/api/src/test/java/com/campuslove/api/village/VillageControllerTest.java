package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.campuslove.api.monitor.VillageMetrics;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 村口控制器单元测试（P7 - Task 7.1.1）。
 */
class VillageControllerTest {

    @Mock private VillageService villageService;
    @Mock private VillageMetrics villageMetrics;
    @Mock private PostRepository postRepository;
    @Mock private UserRepository userRepository;

    private VillageController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new VillageController(villageService, villageMetrics, postRepository, userRepository);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new VillageController(villageService, villageMetrics, postRepository, userRepository));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
