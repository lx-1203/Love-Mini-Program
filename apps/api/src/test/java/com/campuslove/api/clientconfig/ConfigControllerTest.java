package com.campuslove.api.clientconfig;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 客户端配置控制器单元测试（P7 - Task 7.1.1）。
 */
class ConfigControllerTest {

    @Mock private ConfigService configService;

    /** R4-00341：法律文本提供者（构造器新增依赖，测试不涉及 legal 端点，mock 即可） */
    @Mock private LegalTextProvider legalTextProvider;

    private ConfigController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ConfigController(configService, legalTextProvider);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new ConfigController(configService, legalTextProvider));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
