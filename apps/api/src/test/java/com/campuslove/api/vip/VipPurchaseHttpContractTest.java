package com.campuslove.api.vip;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campuslove.api.config.CommerceGuardAspect;
import com.campuslove.api.config.FeatureSwitchKeys;
import com.campuslove.api.config.FeatureSwitchService;
import com.campuslove.api.config.GlobalExceptionHandler;
import com.campuslove.api.entity.AdminAppSwitch;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.wallet.WalletService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * P0-3 C：{@code POST /api/v1/vip/bills/purchase} 的 <b>真实 HTTP 契约</b>。
 *
 * <p>此前该端点只有服务层单测（直接调 {@code purchaseVip}），HTTP 层一直是空白：
 * 请求体绑定（Jackson 忽略旧字段）、Bean Validation 是否真的产出 400、
 * {@code GlobalExceptionHandler} 的状态码口径、商业化开关切面是否在链上、
 * 响应序列化——全部未测。任何一处漂移（例如把 {@code @Valid} 去掉、
 * 把 {@code @FeatureSwitch} 从方法上摘掉）服务层单测照旧绿。</p>
 *
 * <p>装配口径（不自造协议、不为测试改生产代码）：</p>
 * <ul>
 *   <li>控制器与 {@link BillingService}、{@link VipPlanCatalog}、{@link CommerceGuardAspect}、
 *       {@link FeatureSwitchService}、{@link GlobalExceptionHandler} 都是生产类，
 *       协作者（仓库/钱包）用 Mockito 桩；</li>
 *   <li>JSON 绑定与序列化使用<b>容器里的生产 {@link ObjectMapper}</b>
 *       （{@code @SpringBootTest} 装配的那一颗 bean），因此
 *       {@code FAIL_ON_UNKNOWN_PROPERTIES} 等真实配置与本用例一致；</li>
 *   <li>商业化开关只在本用例内按测试需要解封（经真实切面 + 真实
 *       {@link FeatureSwitchService} 读取 mock 的 {@code app_switch} 行），
 *       不改任何全局配置、不全局解封生产商业化。</li>
 * </ul>
 *
 * <p>说明：{@code @Profile("real")} 的控制器不存在于 mock 档容器，故用
 * {@code standaloneSetup} 组装真实 MVC 派发链（映射解析 → 参数绑定 → 校验 →
 * 切面 → 异常处理 → 视图序列化）；{@code @PreAuthorize} 属安全链职责，
 * 由 {@code SecurityConfigTest} / {@code MediaTokenAuthorizationRulesTest} 覆盖，
 * 本用例聚焦资金契约。</p>
 */
@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-vip-purchase-http-contract-32-chars")
@Import(com.campuslove.api.testdata.MockAllRepositoriesConfig.class)
@DisplayName("P0-3 C: /api/v1/vip/bills/purchase 真实 MVC 资金契约")
class VipPurchaseHttpContractTest {

    // 与 AuthSessionEndpointHttpChainTest 同一容器装配口径：这三个仓库不在
    // MockAllRepositoriesConfig 覆盖范围内，缺一个会在上下文加载期报 NoSuchBeanDefinitionException
    @org.springframework.boot.test.mock.mockito.MockBean
    private com.campuslove.api.repository.OfficialChatMessageRepository officialChatMessageRepository;
    @org.springframework.boot.test.mock.mockito.MockBean
    private com.campuslove.api.repository.OfficialAccountRepository officialAccountRepository;
    @org.springframework.boot.test.mock.mockito.MockBean
    private com.campuslove.api.repository.WhisperMessageRepository whisperMessageRepository;

    private static final long USER_ID = 100L;
    private static final String PURCHASE_URL = "/api/v1/vip/bills/purchase";

    /** 容器里的生产 ObjectMapper（与本用例断言的绑定/忽略行为同源） */
    @Autowired
    private ObjectMapper productionObjectMapper;

    private VipBillRepository vipBillRepository;
    private WalletService walletService;
    private PromoCodeService promoCodeService;

    @BeforeEach
    void setUp() {
        vipBillRepository = mock(VipBillRepository.class);
        walletService = mock(WalletService.class);
        promoCodeService = mock(PromoCodeService.class);

        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
        when(vipBillRepository.save(any(VipBill.class))).thenAnswer(inv -> {
            VipBill bill = inv.getArgument(0);
            bill.setId(9001L);
            return bill;
        });
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(5000L);

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                String.valueOf(USER_ID), "n/a", List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    /* ==================== 组装真实 HTTP 链 ==================== */

    private BillingService billingService(VipPlanCatalog catalog) {
        BillingService service = new BillingService(vipBillRepository,
                mock(PaymentCallbackLogRepository.class), catalog);
        ReflectionTestUtils.setField(service, "walletService", walletService);
        ReflectionTestUtils.setField(service, "promoCodeService", promoCodeService);
        return service;
    }

    /** 生产目录（无参构造 = 容器装配口径）。 */
    private static VipPlanCatalog productionCatalog() {
        return new VipPlanCatalog();
    }

    /**
     * 真实切面 + 真实开关服务的守卫代理。
     *
     * @param commerceVipEnabled 仅本用例内是否解封（非全局配置）
     */
    private FeatureSwitchService featureSwitchService(boolean commerceVipEnabled) {
        AdminAppSwitchRepository switchRepository = mock(AdminAppSwitchRepository.class);
        when(switchRepository.findBySwitchKey(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            boolean on = commerceVipEnabled
                    && (FeatureSwitchKeys.COMMERCE_ENABLED.equals(key) || FeatureSwitchKeys.COMMERCE_VIP.equals(key));
            if (!on) {
                return Optional.empty();
            }
            AdminAppSwitch row = new AdminAppSwitch();
            row.setSwitchKey(key);
            row.setEnabled(Boolean.TRUE);
            return Optional.of(row);
        });
        @SuppressWarnings("unchecked")
        ObjectProvider<AdminAppSwitchRepository> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(switchRepository);
        return new FeatureSwitchService(provider);
    }

    private MockMvc purchaseApi(VipPlanCatalog catalog, boolean commerceVipEnabled) {
        BillingController controller = new BillingController(
                billingService(catalog),
                mock(VipOrderService.class),
                mock(com.campuslove.api.wxpay.WxPayProperties.class),
                mock(com.campuslove.api.wxpay.WxPayCallbackVerifier.class),
                mock(com.campuslove.api.wxpay.WxPayCallbackGuard.class),
                productionObjectMapper,
                mock(com.campuslove.api.monitor.PaymentMetrics.class));

        AspectJProxyFactory proxyFactory = new AspectJProxyFactory(controller);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAspect(new CommerceGuardAspect(featureSwitchService(commerceVipEnabled)));
        Object guardedController = proxyFactory.getProxy();

        GlobalExceptionHandler advice = new GlobalExceptionHandler();
        // 非生产档：GlobalExceptionHandler 原样回显业务消息（real 档脱敏为固定文案，状态码不变）
        ReflectionTestUtils.setField(advice, "activeProfile", "mock");

        return MockMvcBuilders.standaloneSetup(guardedController)
                .setControllerAdvice(advice)
                .setMessageConverters(new MappingJackson2HttpMessageConverter(productionObjectMapper),
                        new StringHttpMessageConverter(StandardCharsets.UTF_8))
                .build();
    }

    private long deductedCents() {
        ArgumentCaptor<Long> captor = ArgumentCaptor.forClass(Long.class);
        verify(walletService).deduct(anyLong(), captor.capture(), anyString(), anyString(), anyString());
        return captor.getValue();
    }

    private VipBill savedBill() {
        ArgumentCaptor<VipBill> captor = ArgumentCaptor.forClass(VipBill.class);
        verify(vipBillRepository).save(captor.capture());
        return captor.getValue();
    }

    /* ==================== 1. 旧契约字段：真实 Jackson 忽略，不参与定价 ==================== */

    @Test
    @DisplayName("旧请求体的 planName/baseAmount 被生产 ObjectMapper 忽略，仍按目录价 1800 扣款")
    void legacyBodyFieldsAreIgnoredThroughRealHttpStack() throws Exception {
        String legacyBody = "{\"planId\":\"monthly\",\"planName\":\"免费年卡\",\"baseAmount\":1,\"promoCode\":null}";

        purchaseApi(productionCatalog(), true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(legacyBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseAmount").value(1800))
                .andExpect(jsonPath("$.finalAmount").value(1800))
                .andExpect(jsonPath("$.discountAmount").value(0));

        verify(walletService).deduct(eq(USER_ID), eq(1800L), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("契约字段集合只剩 planId/promoCode：不存在读取客户端金额的编译期路径")
    void purchaseRequestCarriesNoClientMoneyFields() {
        List<String> components = java.util.Arrays.stream(VipPurchaseRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName)
                .toList();

        org.junit.jupiter.api.Assertions.assertEquals(List.of("planId", "promoCode"), components,
                "请求体不得再有 baseAmount/planName 等可参与定价的字段");
        org.junit.jupiter.api.Assertions.assertFalse(
                java.util.Arrays.stream(BillingController.class.getDeclaredMethods())
                        .anyMatch(m -> m.getName().equals("purchase")
                                && java.util.Arrays.stream(m.getParameterTypes())
                                .anyMatch(t -> t == Integer.class || t == int.class)),
                "控制器购买方法不得再把金额类参数透传给服务");
    }

    /* ==================== 2. 合法 planId：目录价 + 目录时长 ==================== */

    @Test
    @DisplayName("planId=yearly 经 HTTP 成交：按目录价 15800 扣款、授予 365 天")
    void validPlanIdChargesCatalogAmountAndGrantsCatalogDays() throws Exception {
        purchaseApi(productionCatalog(), true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"yearly\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseAmount").value(15800))
                .andExpect(jsonPath("$.finalAmount").value(15800));

        verify(walletService).deduct(eq(USER_ID), eq(15800L), anyString(), anyString(), anyString());
        VipBill bill = savedBill();
        org.junit.jupiter.api.Assertions.assertEquals("年卡", bill.getPlanName());
        org.junit.jupiter.api.Assertions.assertEquals(365,
                ChronoUnit.DAYS.between(bill.getPeriodStart(), bill.getPeriodEnd()));
    }

    /* ==================== 3. 缺参与非法套餐：实际状态码 ==================== */

    @Test
    @DisplayName("缺失 planId：真实校验链产出 400，且不触碰钱包与账单")
    void missingPlanIdReturnsActual400() throws Exception {
        purchaseApi(productionCatalog(), true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"promoCode\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("planId")));

        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("空白 planId：400（@NotBlank 与目录校验同口径），零资金副作用")
    void blankPlanIdReturns400WithoutTouchingWallet() throws Exception {
        purchaseApi(productionCatalog(), true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"   \"}"))
                .andExpect(status().isBadRequest());

        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("目录外 planId：实际响应 400 + 业务消息，零资金副作用")
    void unknownPlanIdReturnsActualResponseWithoutCharging() throws Exception {
        purchaseApi(productionCatalog(), true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"lifetime\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("非法套餐: lifetime"));

        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("已下架 planId：400 + 「套餐已下架」，零资金副作用")
    void inactivePlanIdIsRejectedAtHttpLayer() throws Exception {
        VipPlanCatalog offline = new VipPlanCatalog(Map.of(
                "monthly", new VipPlanCatalog.VipPlanDef("monthly", "月卡", 1800, 30, false)));

        purchaseApi(offline, true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"monthly\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("套餐已下架: monthly"));

        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("planId 超出契约长度（33 字符）：在请求契约层即拒绝（plan_id 列宽 32）")
    void oversizedPlanIdIsRejectedByRequestContract() throws Exception {
        purchaseApi(productionCatalog(), true)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"" + "m".repeat(33) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("planId:")));

        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
    }

    /* ==================== 4. 商业化开关确在链上 ==================== */

    @Test
    @DisplayName("COMMERCE_VIP 封存：真实切面拦截为 403 COMMERCE_DISABLED，购买逻辑完全不执行")
    void sealedCommerceSwitchBlocksPurchaseAtHttpLayer() throws Exception {
        purchaseApi(productionCatalog(), false)
                .perform(post(PURCHASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"monthly\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("COMMERCE_DISABLED"));

        verifyNoInteractionsWithMoney();
    }

    private void verifyNoInteractionsWithMoney() {
        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
        verify(vipBillRepository, never()).save(any(VipBill.class));
        verify(promoCodeService, never()).redeem(anyString(), anyLong(), any(Integer.class));
    }
}
