package com.campuslove.api.growth;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

/**
 * SocialProgressController 单元测试。
 *
 * <p>覆盖 {@link SocialProgressController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：GET /social-progress → 从 SecurityContext 取 userId 并委托 SocialProgressService</li>
 * </ul>
 */
class SocialProgressControllerTest {

    @Mock private SocialProgressService socialProgressService;

    private SocialProgressController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new SocialProgressController(socialProgressService);
    }

    @Test
    void getSocialProgress_shouldDelegateWithUserIdFromSecurityContext() {
        // Arrange
        Long userId = 100L;
        SocialProgressView view = new SocialProgressView(
                "L3_MATCH", 3, 1, 1, 0, 0, 0, "恭喜匹配成功！快去和对方打个招呼吧");

        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(socialProgressService.getProgress(userId)).thenReturn(view);

            // Act
            SocialProgressView result = controller.getSocialProgress();

            // Assert
            assertSame(view, result, "应原样返回 service 结果");
            verify(socialProgressService).getProgress(userId);
        }
    }
}
