package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * VIP 套餐目录（服务端定价与权益时长的唯一真相源，P0-3）。
 *
 * <p><b>存在理由</b>：历史上目录仅存在于 {@code VipOrderService} 私有的
 * {@code PLAN_CATALOG} 常量中，微信支付下单链路是唯一的消费方；钱包购买链路
 * （{@link BillingService#purchaseVip}）与自动续费链路
 * （{@code AutoRenewService#renewVip}）各自绕过目录——前者直接采用客户端上送的
 * {@code baseAmount}、后者硬编码 1990 分/30 天，造成「1 分买走 18 元月卡」与
 * 「按 19.9 元续费年卡订阅」的定价绕过漏洞。</p>
 *
 * <p>本类把该常量提升为三条资金链路共用的权威来源（不新建数据库表、不与
 * 客户端 {@code src/config/vip-plans.ts} 争夺定价权——后者仅为展示镜像，
 * 金额/时长一律以本目录为准）：</p>
 * <ul>
 *   <li>价格：分（{@code priceCents}），下单快照、钱包扣款与续费扣款同源；</li>
 *   <li>时长：天（{@code days}），monthly=30 / quarterly=90 / yearly=365，
 *       供 {@link BillingService#grantVipExpiry} 与续费顺延精确使用；</li>
 *   <li>可购买性：{@code active} 标志，下架套餐即使 ID 存在也拒绝成交。</li>
 * </ul>
 *
 * <p><b>装配口径（P0-3 收口）</b>：本类是 real profile 下唯一的 {@code @Component}
 * 目录 bean，三条资金链路一律<b>构造器注入</b>该 bean——不提供
 * 「静态默认实例 + required=false 回退」这类第二份目录：回退会让容器内 bean 与
 * 进程内常量并存，「唯一真相源」名不副实，且目录缺失时不再快速失败。</p>
 *
 * <p>目录为进程内常量（非数据库表），读取不产生任何远程 IO，
 * 因此可以安全地在 {@code @Transactional} 购买/续费事务内调用。</p>
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

    private final Map<String, VipPlanDef> plans;

    /** 生产装配入口：容器使用内置权威目录（Spring 以无参构造实例化本 bean）。 */
    public VipPlanCatalog() {
        this(DEFAULT_PLANS);
    }

    /**
     * 注入自定义目录（用例内模拟下架/缺套餐/目录价变更；生产容器走无参构造）。
     *
     * @param plans 套餐表（拷贝后使用，构造出的实例不受外部修改影响）
     */
    public VipPlanCatalog(Map<String, VipPlanDef> plans) {
        this.plans = Map.copyOf(plans);
    }

    /**
     * 取可购买套餐（定价/时长快照的唯一入口）。
     *
     * @param planId 客户端上送或订阅快照中的套餐 ID（仅 ID 可信，价格与名称一律取目录）
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
}
