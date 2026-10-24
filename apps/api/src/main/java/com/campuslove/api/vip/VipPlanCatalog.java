package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * VIP 套餐目录（服务端定价与权益时长的唯一真相源，P0-3）。
 *
 * <p><b>存在理由</b>：历史上目录仅存在于 {@code VipOrderService} 私有的
 * {@code PLAN_CATALOG} 常量中，微信支付下单链路是唯一的消费方；钱包购买链路
 * （{@link BillingService#purchaseVip}）绕过目录直接采用客户端上送的
 * {@code baseAmount} 与固定 30 天，造成「1 分买走 18 元月卡」的定价绕过漏洞。</p>
 *
 * <p>本类把该常量提升为两条购买链路共用的权威来源（不新建数据库表、不与
 * 客户端 {@code src/config/vip-plans.ts} 争夺定价权——后者仅为展示镜像，
 * 金额/时长一律以本目录为准）：</p>
 * <ul>
 *   <li>价格：分（{@code priceCents}），下单快照与钱包扣款同源；</li>
 *   <li>时长：天（{@code days}），monthly=30 / quarterly=90 / yearly=365，
 *       供 {@link BillingService#grantVipExpiry} 精确顺延；</li>
 *   <li>可购买性：{@code active} 标志，下架套餐即使 ID 存在也拒绝成交。</li>
 * </ul>
 *
 * <p>目录为进程内常量（非数据库表），读取不产生任何远程 IO，
 * 因此可以安全地在 {@code @Transactional} 购买事务内调用。</p>
 */
@Profile("real")
@Component
public class VipPlanCatalog {

    /**
     * 服务端套餐定义。
     *
     * @param planId     套餐 ID（monthly/quarterly/yearly）
     * @param planName   套餐名称（写入账单快照，不接受客户端覆盖）
     * @param priceCents 原价（分，定价唯一来源）
     * @param days       授予时长（天）
     * @param active     是否可购买（false=已下架，成交必须拒绝）
     */
    public record VipPlanDef(String planId, String planName, int priceCents, int days, boolean active) {
    }

    /** 目录常量：monthly=1800 分/30 天，quarterly=4800 分/90 天，yearly=15800 分/365 天 */
    private static final Map<String, VipPlanDef> DEFAULT_PLANS = Map.of(
            "monthly", new VipPlanDef("monthly", "月卡", 1800, 30, true),
            "quarterly", new VipPlanDef("quarterly", "季卡", 4800, 90, true),
            "yearly", new VipPlanDef("yearly", "年卡", 15800, 365, true));

    /** 生产默认目录的单例持有者（两条购买链路共用同一实例）。 */
    private static final VipPlanCatalog PRODUCTION = new VipPlanCatalog(DEFAULT_PLANS);

    private final Map<String, VipPlanDef> plans;

    public VipPlanCatalog() {
        this(DEFAULT_PLANS);
    }

    /** 可注入自定义目录（测试用：模拟下架/缺套餐场景），生产走无参构造。 */
    public VipPlanCatalog(Map<String, VipPlanDef> plans) {
        this.plans = Map.copyOf(plans);
    }

    /** 生产默认目录实例（供非 Spring 上下文的字段初始化与单测回退使用）。 */
    public static VipPlanCatalog defaultCatalog() {
        return PRODUCTION;
    }

    /**
     * 按 ID 查找套餐定义（不校验可购买性，供展示/对账类只读场景使用）。
     */
    public Optional<VipPlanDef> find(String planId) {
        if (planId == null || planId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(plans.get(planId));
    }

    /**
     * 取可购买套餐（定价/时长快照的唯一入口）。
     *
     * @param planId 客户端上送的套餐 ID（仅 ID 可信，价格与名称一律取目录）
     * @return 目录中的在售套餐
     * @throws IllegalArgumentException ID 为空 / 目录不存在 / 已下架时抛出（HTTP 400）
     */
    public VipPlanDef requirePurchasable(String planId) {
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PLAN_ID_REQUIRED);
        }
        VipPlanDef plan = plans.get(planId);
        if (plan == null) {
            throw new IllegalArgumentException("非法套餐: " + planId);
        }
        if (!plan.active()) {
            throw new IllegalArgumentException("套餐已下架: " + planId);
        }
        return plan;
    }

    /** 在售套餐 ID 集合（错误提示与文档用）。 */
    public Set<String> purchasablePlanIds() {
        return plans.values().stream()
                .filter(VipPlanDef::active)
                .map(VipPlanDef::planId)
                .collect(Collectors.toUnmodifiableSet());
    }
}
