package com.campuslove.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/**
 * mock profile 生产隔离守卫（P1-9，2026-11-03）。
 *
 * <p><b>风险</b>：{@code MockSecurityConfig} 在 mock profile 下放行绝大部分端点、
 * 内置 mock 过滤器按路径注入角色——它是本地开发的便利设施，一旦被误带入生产部署
 * （例如 compose 的 {@code SPRING_PROFILES_ACTIVE} 被改成 mock、或有人在生产机器上
 * 用 {@code npm run api:dev} 的默认参数起服务），整个鉴权体系就被旁路，
 * 且没有任何报错提示。审查报告将其列为 P1：静默弱化比显式故障危险得多。</p>
 *
 * <p><b>守卫语义（启动期 fail-fast）</b>：环境同时满足
 * 「mock profile 激活」+「{@code app.production=true}（env {@code APP_PRODUCTION}）」
 * 时，本配置类构造器直接抛异常，应用拒绝启动。生产部署侧的标记由
 * docker-compose 的 api 服务强制注入 {@code APP_PRODUCTION}（缺参即 compose 报错），
 * 本地开发不设置该变量，mock 开发流不受影响。</p>
 *
 * <p>为什么不在镜像构建期断言：mock 类与 application-mock.yml 编译在同一个 jar 里，
 * 构建期「不含 mock」需要拆分产物，代价大且仍有运行时切换的绕过面；
 * 运行时 fail-fast 覆盖所有启动路径（jar 直接跑 / compose / 手工 java -jar），
 * 是更窄且无法绕过的闸。</p>
 */
@Configuration
public class MockProfileProductionGuard {

    public MockProfileProductionGuard(
            Environment environment,
            @Value("${app.production:${APP_PRODUCTION:false}}") boolean production) {
        boolean mockActive = environment.acceptsProfiles(Profiles.of("mock"));
        if (mockActive && production) {
            throw new IllegalStateException(
                    "拒绝启动：mock profile 与生产标记 APP_PRODUCTION=true 同时生效。"
                            + "mock 档会放行绝大部分端点（MockSecurityConfig），不能用于生产部署。"
                            + "请将 SPRING_PROFILES_ACTIVE 改回 real，或去掉 APP_PRODUCTION（仅限本地开发）。"
                            + "（P1-9 mock 隔离守卫，2026-11-03）");
        }
    }
}
