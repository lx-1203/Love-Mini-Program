package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

/**
 * P1-9（2026-11-03）：mock profile 生产隔离守卫测试。
 *
 * <p>判定矩阵：mock+生产标记 → 拒绝启动；real+生产标记 / mock+无标记 → 正常。
 * 守卫必须在<b>bean 构造期</b>抛出（fail-fast），不能等第一个请求才暴露。</p>
 */
class MockProfileProductionGuardTest {

    private Environment envWithProfiles(String... profiles) {
        // MockEnvironment#setActiveProfiles 直接改内部状态（acceptsProfiles 读它），
        // 不要对 new 出来的真实对象用 when()（那是 Mockito 误用）
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return env;
    }

    @Test
    @DisplayName("mock profile + APP_PRODUCTION=true → 构造即抛（拒绝启动）")
    void mockProfileWithProductionFlag_failsFast() {
        Environment env = envWithProfiles("mock");
        assertThrows(IllegalStateException.class,
                () -> new MockProfileProductionGuard(env, true),
                "mock 档 + 生产标记必须 fail-fast（MockSecurityConfig 会旁路鉴权）");
    }

    @Test
    @DisplayName("real profile + APP_PRODUCTION=true → 正常（生产标准形态）")
    void realProfileWithProductionFlag_starts() {
        Environment env = envWithProfiles("real");
        assertDoesNotThrow(() -> new MockProfileProductionGuard(env, true));
    }

    @Test
    @DisplayName("mock profile + 无生产标记 → 正常（本地开发流不受影响）")
    void mockProfileWithoutFlag_starts() {
        Environment env = envWithProfiles("mock");
        assertDoesNotThrow(() -> new MockProfileProductionGuard(env, false));
        // 默认 profile（未显式指定）也不视为 real——只有显式 real 才放行生产标记
        assertDoesNotThrow(() -> new MockProfileProductionGuard(new MockEnvironment(), false));
    }
}
