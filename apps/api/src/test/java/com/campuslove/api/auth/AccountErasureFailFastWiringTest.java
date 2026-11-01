package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.privacy.AccountErasureService;
import com.campuslove.api.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * F-07 / W1b-4：{@code RealAccountSecurityService#failFastIfErasureServiceMissing} 的
 * <b>启动期</b>判点——上一批 W1 只把方法体写了出来，第五轮 A 车道实测
 * {@code grep PostConstruct src/test} = 0、把 {@code @PostConstruct} 注解整行删掉全量仍然绿，
 * 说明「钩子会被容器调用」这件事没有任何东西在守。
 *
 * <p>本类补两层，缺一层就红：</p>
 * <ol>
 *   <li><b>注解在</b>：方法必须带 {@link PostConstruct}（删注解 ⇒ 红）；</li>
 *   <li><b>容器真会调</b>：起一个真实 {@link AnnotationConfigApplicationContext}
 *       （active profile = {@code real}，与生产同档），只装配六个协作者、
 *       <b>不装</b> {@link AccountErasureService}，断言 {@code refresh()} 直接失败，
 *       且失败根因点名 {@code AccountErasureService}（把注解摘掉 ⇒ refresh 成功 ⇒ 红）；</li>
 *   <li><b>反向对照</b>：同一套脚手架补上 {@link AccountErasureService} ⇒ refresh 成功。
 *       没有这一格，第 2 条可能只是在钉我自己的装配代码。</li>
 * </ol>
 *
 * <p>关于「清除服务缺席 ⇒ 503」那条运行期分支的裁定见交付报告本条正文：
 * {@code AccountErasureService} 与本类同为 {@code @Profile("real")} 且无其它条件，
 * 所以 real 档里它必然在场 ⇒ 503 分支线上不可达，保留的唯一理由是纵深防御，
 * 而它现在由本类的启动期判点守（不再有「没人守又走不到」的状态）。
 * 运行期那条分支自身的判点在既有 {@code RealAccountSecurityServiceTest
 * #deactivate_missingErasureServiceFailsLoudlyInsteadOfFakeTombstone}，口径不改。</p>
 */
@DisplayName("F-07/W1b-4 注销清除服务的启动期 fail-fast 判点")
class AccountErasureFailFastWiringTest {

    /** 六个协作者按类型注册为替身；AccountErasureService 由参数决定装还是不装。 */
    private AnnotationConfigApplicationContext context(boolean withErasureService) {
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
        ctx.getEnvironment().setActiveProfiles("real");
        ctx.registerBean("userRepository", UserRepository.class, () -> mock(UserRepository.class));
        ctx.registerBean("passwordEncoder", PasswordEncoder.class, () -> mock(PasswordEncoder.class));
        ctx.registerBean("deviceSessionService", DeviceSessionService.class,
                () -> mock(DeviceSessionService.class));
        ctx.registerBean("tokenBlacklistService", TokenBlacklistService.class,
                () -> mock(TokenBlacklistService.class));
        ctx.registerBean("jwtTokenProvider", JwtTokenProvider.class,
                () -> mock(JwtTokenProvider.class));
        ctx.registerBean("aesEncryptor", AesEncryptor.class, () -> mock(AesEncryptor.class));
        if (withErasureService) {
            ctx.registerBean("accountErasureService", AccountErasureService.class,
                    () -> mock(AccountErasureService.class));
        }
        ctx.register(RealAccountSecurityService.class);
        return ctx;
    }

    @Test
    @DisplayName("fail-fast 方法必须带 @PostConstruct（删掉注解即红）")
    void failFastHookIsBoundToTheContainerLifecycle() throws Exception {
        Method hook = RealAccountSecurityService.class
                .getDeclaredMethod("failFastIfErasureServiceMissing");
        assertNotNull(hook.getAnnotation(PostConstruct.class),
                "@PostConstruct 被摘掉后，real 档缺 AccountErasureService 就不再让启动失败，"
                        + "而是等到用户点注销时才静默半注销——这正是第五轮判 P0 的旧状态");
        assertTrue(hook.getParameterCount() == 0, "@PostConstruct 方法必须无参（JSR-250 要求）");
        assertTrue(java.lang.reflect.Modifier.isStatic(hook.getModifiers()) == false,
                "@PostConstruct 方法不得是 static（容器不会调用）");
        assertTrue(hook.isAnnotationPresent(Profile.class) == false,
                "钩子方法自身不应再挂 @Profile：类级 @Profile(\"real\") 已经限定了生效档位");
    }

    @Test
    @DisplayName("real 档容器：缺 AccountErasureService ⇒ refresh 直接失败")
    void containerFailsToStartWhenErasureServiceAbsent() {
        AnnotationConfigApplicationContext ctx = context(false);
        try {
            Exception ex = assertThrows(Exception.class, ctx::refresh,
                    "装配漂移必须变成「应用起不来」，而不是运行期静默降级");
            String chain = describeCauseChain(ex);
            assertTrue(chain.contains("AccountErasureService"),
                    "启动失败的原因必须点名缺的是哪个 bean，实际异常链: " + chain);
            String lower = chain.toLowerCase(java.util.Locale.ROOT);
            assertTrue(lower.contains("realaccountsecurityservice"),
                    "启动失败必须能追溯到本类的装配（容器给出的 bean 名/类名），实际: " + chain);
            assertTrue(chain.contains("启动失败优于静默半注销") || chain.contains("注销只能写 users 墓碑"),
                    "失败信息必须是本类启动自检那句（而不是别处的装配错误冒充），实际: " + chain);
        } finally {
            ctx.close();
        }
    }

    @Test
    @DisplayName("反向对照：同一脚手架装上 AccountErasureService ⇒ 容器正常起来")
    void containerStartsWhenErasureServicePresent() {
        AnnotationConfigApplicationContext ctx = context(true);
        try {
            assertDoesNotThrow(ctx::refresh, "上一条红必须归因于「清除服务缺席」，不能归因于装配脚手架本身");
            assertNotNull(ctx.getBean(RealAccountSecurityService.class));
        } finally {
            ctx.close();
        }
    }

    @Test
    @DisplayName("直接调用钩子：provider 取不到 bean ⇒ 必抛（与容器同一句判定，双保险）")
    void hookThrowsWhenProviderYieldsNoBean() {
        @SuppressWarnings("unchecked")
        ObjectProvider<AccountErasureService> empty = mock(ObjectProvider.class);
        AtomicReference<IllegalStateException> captured = new AtomicReference<>();
        RealAccountSecurityService svc = new RealAccountSecurityService(
                mock(UserRepository.class), mock(PasswordEncoder.class),
                mock(DeviceSessionService.class), mock(TokenBlacklistService.class),
                mock(JwtTokenProvider.class), mock(AesEncryptor.class), empty);
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                svc::failFastIfErasureServiceMissing);
        captured.set(ex);
        assertTrue(captured.get().getMessage().contains("AccountErasureService"));
    }

    private static String describeCauseChain(Throwable t) {
        StringBuilder sb = new StringBuilder();
        int depth = 0;
        for (Throwable c = t; c != null && depth < 12; c = c.getCause(), depth++) {
            sb.append(c.getClass().getName()).append(": ").append(c.getMessage()).append(" | ");
        }
        return sb.toString();
    }
}
