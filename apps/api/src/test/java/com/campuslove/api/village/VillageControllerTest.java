package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.campuslove.api.growth.AppConfigService;
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
    // B6：发帖开关强制点依赖的应用配置服务
    @Mock private AppConfigService appConfigService;

    private VillageController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // infra R2-00308:废弃 GET /posts/dto 端点与 4 参构造器已移除
        controller = new VillageController(villageService, villageMetrics, appConfigService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new VillageController(villageService, villageMetrics, appConfigService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
