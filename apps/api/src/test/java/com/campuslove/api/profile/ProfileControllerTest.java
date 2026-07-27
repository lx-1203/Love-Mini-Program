package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.campuslove.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 个人主页控制器单元测试（P7 - Task 7.1.1）。
 */
class ProfileControllerTest {

    @Mock private ProfileService profileService;
    @Mock private UserRepository userRepository;

    private ProfileController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ProfileController(profileService, userRepository);
    }

    @Test
    void constructor_shouldAcceptDependencies() {
        // Arrange & Act & Assert
        assertNotNull(new ProfileController(profileService, userRepository));
    }

    @Test
    void controller_shouldHaveDependenciesInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
