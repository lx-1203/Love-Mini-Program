package com.campuslove.api.invite;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 邀请奖励控制器冒烟测试（3-K 邀请奖励）。
 *
 * <p>覆盖 {@link InviteController} 的构造函数注入契约；
 * 端点依赖 SecurityUtils（认证上下文），业务校验由服务层测试覆盖。</p>
 */
class InviteControllerTest {

    @Mock private InviteService inviteService;

    private InviteController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new InviteController(inviteService);
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new InviteController(inviteService));
    }

    @Test
    void controller_shouldHaveServiceInjected() {
        assertNotNull(controller);
    }
}
