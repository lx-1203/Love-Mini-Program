package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.wallet.WalletService;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

/**
 * F-08（第五轮审查）财务侧：注销必须是终态，续费扫描不得给墓碑 user_id 追加流水。
 *
 * <p><b>缺陷基线</b>：{@code AutoRenewService#renewVip} 的「未开启自动续费」分支照旧
 * {@code writeBillingLog(userId, …, "FAILED")}。而扫描用的
 * {@code userRepository.findByAutoRenewEnabledTrue()} 是<b>注销前</b>取的快照：
 * 注销在快照之后提交（墓碑把 auto_renew_enabled 置 false），本轮循环仍会走到该分支，
 * 于是 {@code vip_billing_log} 里给一个 {@code status=deactivated} 的 user_id 新写一行
 * ——而清单把 {@code vip_billing_log} 定为 {@code RETAIN_STATUTORY}（保留、不清），
 * 这行新流水会永久留着对墓碑主体的引用，「注销 = 终态」在财务轴上不成立。</p>
 *
 * <p><b>判点</b>：</p>
 * <ol>
 *   <li>已注销主体 ⇒ 一条流水都不写，返回状态是 SKIPPED（不是 FAILED，运营看板上不会
 *       把注销当成续费失败刷成噪音）；</li>
 *   <li>正控：未注销但关闭了自动续费的用户 ⇒ 仍然写 FAILED 流水（既有契约，
 *       见 {@link AutoRenewServiceCatalogPricingTest}），防止「一律不记账」假修好；</li>
 *   <li>正控：已注销主体绝不允许走到扣款（钱包零调用）。</li>
 * </ol>
 *
 * <p><b>本机判不出</b>：真实扫描任务与注销的竞态时序（需要真库 + 真 Redis + 定时任务并发）
 * 未端到端验证；本类证的是「判定分支与写库调用」这段代码事实。</p>
 */
@DisplayName("F-08：续费扫描不得给已注销主体写 vip_billing_log 流水")
class ErasedSubjectBillingLedgerTest {

    private static final long ERASED_USER = 8101L;
    private static final long ACTIVE_USER = 8102L;

    private UserRepository userRepository;
    private VipBillingLogRepository vipBillingLogRepository;
    private VipBillRepository vipBillRepository;
    private WalletService walletService;
    private AutoRenewService service;

    @BeforeEach
    void setUp() throws InterruptedException {
        userRepository = mock(UserRepository.class);
        vipBillingLogRepository = mock(VipBillingLogRepository.class);
        vipBillRepository = mock(VipBillRepository.class);
        walletService = mock(WalletService.class);
        RedissonClient redissonClient = mock(RedissonClient.class);
        RLock lock = mock(RLock.class);
        when(redissonClient.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(lock.isHeldByCurrentThread()).thenReturn(true);
        when(vipBillingLogRepository.save(any(VipBillingLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(userRepository.findById(ERASED_USER))
                .thenReturn(Optional.of(user(ERASED_USER, "deactivated")));
        when(userRepository.findById(ACTIVE_USER))
                .thenReturn(Optional.of(user(ACTIVE_USER, "active")));

        service = new AutoRenewService(userRepository, vipBillingLogRepository, vipBillRepository,
                redissonClient, walletService, new VipPlanCatalog());
    }

    /**
     * 扫描快照里的用户：auto_renew_enabled 已在注销时被置 false，
     * 所以本轮进到这里的是「未开启 + 已注销」的组合。
     */
    private static User user(long id, String status) {
        User user = new User();
        user.setId(id);
        user.setStatus(status);
        user.setAutoRenewEnabled(false);
        return user;
    }

    @Test
    @DisplayName("已注销主体：不写流水、不扣款，返回 SKIPPED")
    void erasedSubjectGetsNoBillingLogAtAll() {
        AutoRenewService.RenewResultView result = service.renewVip(ERASED_USER);

        verify(vipBillingLogRepository, never()).save(any(VipBillingLog.class));
        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(),
                anyString());
        assertEquals("SKIPPED", result.status(),
                "已注销主体必须是「跳过」而不是「续费失败」：状态=" + result.status());
    }

    @Test
    @DisplayName("正控：未注销但关闭续费的用户仍写一条 FAILED 流水（既有契约不许顺手改掉）")
    void activeUserWithRenewDisabledStillWritesFailedLedger() {
        AutoRenewService.RenewResultView result = service.renewVip(ACTIVE_USER);

        verify(vipBillingLogRepository, times(1)).save(any(VipBillingLog.class));
        assertEquals("FAILED", result.status(),
                "未注销用户的「未开启自动续费」分支契约不变，实际: " + result.status());
    }
}
