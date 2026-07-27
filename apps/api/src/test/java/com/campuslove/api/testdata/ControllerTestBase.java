package com.campuslove.api.testdata;

import com.campuslove.api.config.SecurityUtils;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * Controller 测试基类（P7 - Task 7.1.1）。
 *
 * <p>提供 Controller 测试通用辅助方法：</p>
 * <ul>
 *   <li>{@link #withUserId(Long, Runnable)}：模拟 SecurityContext 中的当前用户 ID，
 *       在测试运行期间注入 mock 的 SecurityUtils.getCurrentUserId() 返回值</li>
 *   <li>{@link #withoutUserId(Runnable)}：模拟未认证场景，
 *       SecurityUtils.getCurrentUserId() 抛出 401 Unauthorized</li>
 * </ul>
 *
 * <p>使用方式：</p>
 * <pre>{@code
 * class MyControllerTest extends ControllerTestBase {
 *     @Test
 *     void shouldDelegateToService() {
 *         withUserId(100L, () -> {
 *             // Arrange + Act + Assert
 *         });
 *     }
 * }
 * }</pre>
 */
public abstract class ControllerTestBase {

    /**
     * 在 SecurityContext 注入指定 userId 后执行测试逻辑。
     *
     * @param userId 当前用户 ID
     * @param testBody 测试逻辑
     */
    protected void withUserId(Long userId, Runnable testBody) {
        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            testBody.run();
        }
    }

    /**
     * 在未认证场景下执行测试逻辑（SecurityUtils.getCurrentUserId 抛 401）。
     *
     * @param testBody 测试逻辑
     */
    protected void withoutUserId(Runnable testBody) {
        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId)
                    .thenThrow(org.springframework.web.client.HttpClientErrorException
                            .Unauthorized.class);
            testBody.run();
        }
    }
}
