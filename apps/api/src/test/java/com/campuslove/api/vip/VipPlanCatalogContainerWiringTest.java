package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.repository.VipOrderRepository;
import com.campuslove.api.wallet.WalletService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.BeanCreationException;
import org.springframework.beans.factory.UnsatisfiedDependencyException;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * P0-3 C：{@link VipPlanCatalog} 必须是<b>容器里的同一颗 bean</b>，而不是静态回退实例。
 *
 * <p>P0-3 首版把目录做成 {@code @Autowired(required = false)} 字段 +
 * {@code = VipPlanCatalog.defaultCatalog()} 静态回退，并把
 * 「两条链路共用同一目录」写成 {@code assertSame(defaultCatalog(), field)} ——
 * 该断言只证明了<b>非 Spring 场景下的回退实例</b>，从未证明容器真正注入了
 * 唯一目录 bean；而生产容器里真正生效的是另一颗实例（静态回退与容器 bean 并存，
 * 「唯一真相源」名不副实）。本类以真实容器装配取代该断言：</p>
 * <ul>
 *   <li>real profile 下三处资金链路（钱包购买、微信下单、自动续费）注入的
 *       目录都是容器里的同一颗 bean；</li>
 *   <li>目录 bean 缺失时容器<b>快速失败</b>（fail-fast），
 *       不允许静默回退到进程内静态实例；</li>
 *   <li>经容器装配的购买链路按目录价扣款（证明断言的不是回退常量）。</li>
 * </ul>
 *
 * <p>RED 证据（对 required=false + 静态回退的实现执行）：
 * 「目录 bean 缺失时快速失败」用例不抛异常、上下文照常刷新成功——即回退路径真实存在。</p>
 */
@DisplayName("P0-3 C: VIP 定价目录容器装配唯一性")
class VipPlanCatalogContainerWiringTest {

    private static final long USER_ID = 100L;

    /** 以 real profile 启动一个只装 VIP 资金链路的最小容器。 */
    private AnnotationConfigApplicationContext realVipContext(boolean includeCatalog) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        buildRealVipContext(context, includeCatalog);
        context.refresh();
        return context;
    }

    /** 装配容器（不 refresh）：便于用例分别断言「启动成功」与「启动快速失败」。 */
    private void buildRealVipContext(AnnotationConfigApplicationContext context, boolean includeCatalog) {
        context.getEnvironment().setActiveProfiles("real");
        var beanFactory = context.getBeanFactory();
        beanFactory.registerSingleton("vipBillRepository", mock(VipBillRepository.class));
        beanFactory.registerSingleton("paymentCallbackLogRepository", mock(PaymentCallbackLogRepository.class));
        beanFactory.registerSingleton("vipOrderRepository", mock(VipOrderRepository.class));
        beanFactory.registerSingleton("userRepository", mock(UserRepository.class));
        beanFactory.registerSingleton("vipBillingLogRepository", mock(VipBillingLogRepository.class));
        beanFactory.registerSingleton("promoCodeRepository", mock(PromoCodeRepository.class));
        beanFactory.registerSingleton("promoCodeUsageRepository", mock(PromoCodeUsageRepository.class));
        beanFactory.registerSingleton("adminAppSwitchRepository", mock(AdminAppSwitchRepository.class));
        beanFactory.registerSingleton("redissonClient", mock(RedissonClient.class));
        beanFactory.registerSingleton("walletService", mock(WalletService.class));
        // VipOrderService 依赖事务管理器做编程式事务边界（下单/退款/关单）。
        // 本类只验「目录 bean 唯一」这条装配判点，不跑真实事务，故用不启事务的桩管理器。
        org.springframework.transaction.PlatformTransactionManager txManager =
                mock(org.springframework.transaction.PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        beanFactory.registerSingleton("transactionManager", txManager);
        if (includeCatalog) {
            context.register(VipPlanCatalog.class);
        }
        context.register(BillingService.class, VipOrderService.class, PromoCodeService.class,
                AutoRenewService.class);
    }

    private static Object catalogField(Object bean) {
        return ReflectionTestUtils.getField(bean, "planCatalog");
    }

    @Test
    @DisplayName("real 容器只有一颗目录 bean，且被注入到全部三条资金链路")
    void containerSuppliesOneSharedCatalogToAllMoneyPaths() {
        try (AnnotationConfigApplicationContext context = realVipContext(true)) {
            VipPlanCatalog containerCatalog = context.getBean(VipPlanCatalog.class);
            assertEquals(1, java.util.stream.Stream.of(context.getBeanNamesForType(VipPlanCatalog.class)).count(),
                    "容器内目录 bean 必须唯一");

            assertSame(containerCatalog, catalogField(context.getBean(BillingService.class)),
                    "钱包购买链路的目录必须是容器里那颗 bean");
            assertSame(containerCatalog, catalogField(context.getBean(VipOrderService.class)),
                    "微信下单链路的目录必须是容器里那颗 bean");
            assertSame(containerCatalog, catalogField(context.getBean(AutoRenewService.class)),
                    "自动续费链路的目录必须是容器里那颗 bean");
        }
    }

    @Test
    @DisplayName("容器目录 bean 给出的就是权威价目（月 1800/30、季 4800/90、年 15800/365）")
    void containerCatalogCarriesAuthoritativePricesAndDurations() {
        try (AnnotationConfigApplicationContext context = realVipContext(true)) {
            VipPlanCatalog catalog = context.getBean(VipPlanCatalog.class);

            assertEquals(1800, catalog.requirePurchasable("monthly").priceCents());
            assertEquals(30, catalog.requirePurchasable("monthly").days());
            assertEquals(4800, catalog.requirePurchasable("quarterly").priceCents());
            assertEquals(90, catalog.requirePurchasable("quarterly").days());
            assertEquals(15800, catalog.requirePurchasable("yearly").priceCents());
            assertEquals(365, catalog.requirePurchasable("yearly").days());
        }
    }

    @Test
    @DisplayName("目录 bean 缺失时容器快速失败：不得静默使用进程内静态回退目录")
    void contextFailsFastWhenCatalogBeanIsMissing() {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        try {
            buildRealVipContext(context, false);
            assertThrows(BeanCreationException.class, context::refresh,
                    "缺少目录 bean 必须让资金链路容器启动失败（fail-fast），而不是回退到静态目录");
        } finally {
            context.close();
        }
    }

    @Test
    @DisplayName("经容器装配的购买链路按目录价扣款（断言对象是容器 bean，不是常量）")
    void purchaseThroughContainerWiredServiceChargesContainerCatalogPrice() {
        try (AnnotationConfigApplicationContext context = realVipContext(true)) {
            VipBillRepository vipBillRepository = context.getBean(VipBillRepository.class);
            WalletService walletService = context.getBean(WalletService.class);
            when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
            when(vipBillRepository.save(any(VipBill.class))).thenAnswer(inv -> {
                VipBill bill = inv.getArgument(0);
                bill.setId(1L);
                return bill;
            });
            when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                    .thenReturn(1L);

            context.getBean(BillingService.class).purchaseVip(USER_ID, "quarterly", null);

            ArgumentCaptor<Long> cents = ArgumentCaptor.forClass(Long.class);
            verify(walletService).deduct(anyLong(), cents.capture(), anyString(), anyString(), anyString());
            assertEquals(4800L, cents.getValue(), "扣款额必须来自容器目录");
            assertNotNull(catalogField(context.getBean(BillingService.class)));
        }
    }
}
