package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.entity.AdminAppRule;
import com.campuslove.api.entity.AdminAppSwitch;
import com.campuslove.api.profile.ProfileConfigView;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.campuslove.api.repository.AdminAppRuleRepository;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.AnnotationCacheOperationSource;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * P2 缓存正确性修复——后台规则/开关写路径必须失效它们喂的那个缓存键
 * （{@code system_config} 的 {@code 'all'} / {@code 'rules'} / {@code 'switches'}）。
 *
 * <p><b>为什么「把 evict 删掉本类就红」</b>：不断言注解元数据（那样太容易和实现一起被改错），
 * 而是用 {@link CacheInterceptor} + {@link CaffeineCacheManager} 把
 * {@link RealAdminConfigService} 包成真实的 Spring Cache 代理，
 * 拿「Repository 回源次数」当探针：先读一次灌满缓存（findAll 恰好 1 次），
 * 再执行写操作，然后再读一次——
 * 失效存在 ⇒ 第二次读回源（findAll 变 2 次）；失效被删掉 ⇒ 第二次读命中旧缓存
 * （findAll 仍是 1 次，且视图里的表达式/开关状态还是旧值），断言立即失败。</p>
 *
 * <p><b>反向断言精确性</b>：改规则不应连坐清掉 {@code 'all'}/{@code 'switches'}，
 * 否则等于回到修复前的 {@code allEntries=true}（三个写方法各自只回源一次即可验证）。</p>
 */
class AdminConfigCacheEvictionTest {

    @Mock private AdminAppConfigRepository configRepository;
    @Mock private AdminAppRuleRepository ruleRepository;
    @Mock private AdminAppSwitchRepository switchRepository;
    /** 事件发布器用 mock：本类只关心缓存失效，SubTask 5.3.3 的事件链路无订阅方 */
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private CacheManager cacheManager;
    /** 提为字段：控制器侧的写要挂到【同一个】CacheInterceptor 上，才复现容器里的真实失效路径 */
    private CacheInterceptor interceptor;
    private AdminConfigService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        cacheManager = new CaffeineCacheManager();
        interceptor = new CacheInterceptor();
        interceptor.setCacheManager(cacheManager);
        interceptor.setCacheOperationSources(new AnnotationCacheOperationSource());
        // Spring 6.1 的 CacheAspectSupport#execute 在 initialized=false 时直接跳过缓存
        // （容器里这一步由 afterSingletonsInstantiated 触发）；手工组装代理必须自己补齐，
        // 否则测试会得到「什么都没缓存」的假象。
        interceptor.afterSingletonsInstantiated();

        RealAdminConfigService target = new RealAdminConfigService(
                configRepository, ruleRepository, switchRepository, eventPublisher);
        ProxyFactory proxyFactory = new ProxyFactory(target);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(interceptor);
        service = (AdminConfigService) proxyFactory.getProxy();
    }

    // ------------------------------------------------------------------
    // 场景 1：updateRule / updateSwitch 必须失效各自的键
    // ------------------------------------------------------------------

    @Test
    @DisplayName("updateRule 后再次 listRules 必须回源并看到新表达式")
    void updateRule_evictsRulesKey_soNextReadRequeries() {
        stubRuleFind();

        service.listRules();
        service.listRules();
        verify(ruleRepository, times(1)).findAll();

        service.updateRule(1L, "score > 80", Boolean.TRUE, null, 99L);

        List<AdminRuleView> after = service.listRules();
        verify(ruleRepository, times(2)).findAll();
        assertFalse(after.isEmpty(), "规则列表不应为空");
        assertEquals("score > 80", after.get(0).expression(),
                "运营必须立刻看到刚写入的规则表达式（失效被删掉时这里是旧值）");
    }

    @Test
    @DisplayName("updateSwitch 后再次 listSwitches 必须回源并看到新开关状态")
    void updateSwitch_evictsSwitchesKey_soNextReadRequeries() {
        stubSwitchFind();

        service.listSwitches();
        service.listSwitches();
        verify(switchRepository, times(1)).findAll();

        service.updateSwitch("maintenance_mode", Boolean.FALSE, 99L);

        List<AdminSwitchView> after = service.listSwitches();
        verify(switchRepository, times(2)).findAll();
        assertFalse(after.isEmpty());
        assertFalse(after.get(0).enabled(),
                "运营必须立刻看到刚关闭的开关（失效被删掉时这里仍是 true）");
    }

    // ------------------------------------------------------------------
    // 场景 2：精确性——不能连坐清掉别的键
    // ------------------------------------------------------------------

    @Test
    @DisplayName("三个写方法各自只失效自己的键（改回 allEntries=true 本用例即失败）")
    void mutations_evictOnlyTheirOwnKey() {
        stubRuleFind();
        stubSwitchFind();
        stubConfigFind();

        service.listConfigs();
        service.listRules();
        service.listSwitches();
        verify(configRepository, times(1)).findAll();
        verify(ruleRepository, times(1)).findAll();
        verify(switchRepository, times(1)).findAll();

        service.updateRule(1L, "expr", Boolean.TRUE, null, 99L);
        service.updateSwitch("maintenance_mode", Boolean.TRUE, 99L);
        service.updateConfig("match.radius", "30", null, 99L);

        // 三个键各自被自己的写操作失效过一次 ⇒ 再读时各回源一次，不多不少
        service.listConfigs();
        service.listRules();
        service.listSwitches();
        verify(configRepository, times(2)).findAll();
        verify(ruleRepository, times(2)).findAll();
        verify(switchRepository, times(2)).findAll();
    }

    @Test
    @DisplayName("缓存键名与 @Cacheable 一致；updateRule 只清 'rules'")
    void cacheKeys_matchCacheableAnnotations() {
        stubRuleFind();
        stubSwitchFind();
        stubConfigFind();

        service.listConfigs();
        service.listRules();
        service.listSwitches();

        Cache cache = cacheManager.getCache(CacheNames.SYSTEM_CONFIG);
        assertNotNull(cache, "system_config 缓存应已创建");
        assertNotNull(cache.get("all"), "listConfigs 应写入 'all' 键");
        assertNotNull(cache.get("rules"), "listRules 应写入 'rules' 键");
        assertNotNull(cache.get("switches"), "listSwitches 应写入 'switches' 键");

        service.updateRule(1L, "expr", Boolean.TRUE, null, 99L);

        assertNull(cache.get("rules"), "updateRule 必须清掉 'rules' 键");
        assertNotNull(cache.get("all"), "updateRule 不应连坐清掉 'all' 键");
        assertNotNull(cache.get("switches"), "updateRule 不应连坐清掉 'switches' 键");
    }

    // ------------------------------------------------------------------
    // 场景 3：注解元数据兜底
    // ------------------------------------------------------------------

    @Test
    @DisplayName("updateRule/updateSwitch/updateConfig 均带精确键 @CacheEvict")
    void annotations_carryPreciseEvicts() throws Exception {
        assertEvict(RealAdminConfigService.class.getMethod("updateRule",
                Long.class, String.class, Boolean.class, String.class, Long.class), "'rules'");
        assertEvict(RealAdminConfigService.class.getMethod("updateSwitch",
                String.class, Boolean.class, Long.class), "'switches'");
        assertEvict(RealAdminConfigService.class.getMethod("updateConfig",
                String.class, String.class, String.class, Long.class), "'all'");
    }

    private void assertEvict(Method method, String expectedKey) {
        CacheEvict evict = method.getAnnotation(CacheEvict.class);
        assertNotNull(evict,
                method.getName() + " 应带 @CacheEvict（P2：写路径必须失效自己喂的那个缓存键）");
        assertEquals(CacheNames.SYSTEM_CONFIG, evict.cacheNames()[0],
                method.getName() + " 应失效 system_config");
        assertEquals(expectedKey, evict.key(), method.getName() + " 应精确失效 " + expectedKey);
        assertFalse(evict.allEntries(), method.getName() + " 不应再用 allEntries 连坐");
    }

    // ------------------------------------------------------------------
    // Repository 桩
    // ------------------------------------------------------------------

    private void stubRuleFind() {
        AdminAppRule rule = new AdminAppRule();
        rule.setId(1L);
        rule.setRuleName("match-radius");
        rule.setRuleExpression("score > 60");
        rule.setEnabled(Boolean.TRUE);
        when(ruleRepository.findAll()).thenReturn(List.of(rule));
        when(ruleRepository.findById(1L)).thenReturn(Optional.of(rule));
        when(ruleRepository.save(any(AdminAppRule.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubSwitchFind() {
        AdminAppSwitch sw = new AdminAppSwitch();
        sw.setId(2L);
        sw.setSwitchKey("maintenance_mode");
        sw.setEnabled(Boolean.TRUE);
        when(switchRepository.findAll()).thenReturn(List.of(sw));
        when(switchRepository.findBySwitchKey(anyString())).thenReturn(Optional.of(sw));
        when(switchRepository.save(any(AdminAppSwitch.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubConfigFind() {
        AdminAppConfig config = new AdminAppConfig();
        config.setId(3L);
        config.setConfigKey("match.radius");
        config.setConfigValue("20");
        when(configRepository.findAll()).thenReturn(List.of(config));
        when(configRepository.findByConfigKey(anyString())).thenReturn(Optional.of(config));
        when(configRepository.save(any(AdminAppConfig.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    /**
     * 场景 3（2026-10-31）：写入者不止 service 一个 bean。
     *
     * <p>{@code AdminProfileConfigController#save} 直接 {@code configRepository.save} 改
     * 同一张 {@code app_config}，绕开了 service，所以它必须自己挂
     * {@code @CacheEvict(cacheNames = SYSTEM_CONFIG, key = "'all'")}。
     * 本用例把控制器挂在【同一个】CacheInterceptor/CacheManager 上，
     * 因此删掉那行注解就会红：'all' 键留着旧列表，列表页最长 30 分钟（TTL）显示旧配置。</p>
     */
    @Test
    @DisplayName("跨 bean：AdminProfileConfigController.save 必须失效 service 侧共享的 'all' 键")
    void profileConfigSave_evictsSharedAllKey() {
        stubRuleFind();
        stubSwitchFind();
        stubConfigFind();

        service.listConfigs();
        service.listRules();
        service.listSwitches();

        Cache cache = cacheManager.getCache(CacheNames.SYSTEM_CONFIG);
        assertNotNull(cache, "system_config 缓存应已创建");
        assertNotNull(cache.get("all"), "写之前 'all' 应已被 listConfigs 填上");

        AdminProfileConfigController controllerTarget =
                new AdminProfileConfigController(configRepository, new ObjectMapper());
        ProxyFactory controllerFactory = new ProxyFactory(controllerTarget);
        // 控制器没有接口 ⇒ 只能类代理（CGLIB），与 service 那侧同源
        controllerFactory.setProxyTargetClass(true);
        controllerFactory.addAdvice(interceptor);
        AdminProfileConfigController controller =
                (AdminProfileConfigController) controllerFactory.getProxy();

        // save() 里要取操作者 ID（SecurityUtils.getCurrentUserId 未认证会抛），
        // 所以给一个已认证主体；用完立刻清掉，避免污染同 JVM 的其它测试。
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(99L, "n/a", "ROLE_ADMIN"));
        try {
            controller.save(new ProfileConfigView(false, false, false, 7, 60));
        } finally {
            SecurityContextHolder.clearContext();
        }

        assertNull(cache.get("all"), "控制器的写必须清掉 'all'（注解被删时这里仍是旧列表 ⇒ 本用例即红）");
        assertNotNull(cache.get("rules"), "不应连坐清掉 'rules'");
        assertNotNull(cache.get("switches"), "不应连坐清掉 'switches'");

        service.listConfigs();
        verify(configRepository, times(2)).findAll();
    }
}
