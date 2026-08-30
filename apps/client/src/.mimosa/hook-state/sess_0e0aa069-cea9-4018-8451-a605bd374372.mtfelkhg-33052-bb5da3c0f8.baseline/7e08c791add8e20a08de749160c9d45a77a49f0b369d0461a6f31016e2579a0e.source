/**
 * VIP 套餐配置（提取为常量，避免在页面中硬编码价格）。
 *
 * 修复：原 pages/vip/index.vue 中套餐价格、周期、原价等字段全部硬编码在页面内，
 * 后续调整价格需要修改视图代码。现统一抽到 config，便于运营/后端联动维护。
 *
 * 价格说明（infra R2-00134）：
 * - 当前价格 18/48/158 为前端静态配置，必须与后端支付/订单价格保持一致，
 *   调整价格需前端发版（原审计项：价格策略僵化、双源易漂移）；
 * - 后端提供套餐配置接口后，应优先消费后端下发价格，移除本文件静态价格字段。
 */

/** 套餐 ID */
export type VipPlanId = "monthly" | "quarterly" | "yearly";

/** 套餐接口 */
export interface VipPlan {
  id: VipPlanId;
  /** 套餐名（中文兜底，展示层优先用 nameKey 经 t() 渲染） */
  name: string;
  /** 套餐名的 i18n key（config.vipPlans.{id}.name，zh/en 同步） */
  nameKey?: string;
  /**
   * 套餐价格（元）。
   * infra R2-00134: 前端静态价格，需与后端订单价格一致；后端下发配置后应移除。
   */
  price: number;
  originalPrice?: number;
  /** 周期文案（中文兜底，展示层优先用 periodKey） */
  period: string;
  /** 周期的 i18n key（config.vipPlans.{id}.period） */
  periodKey?: string;
  /** 日均价文案（中文兜底，展示层优先用 perDayKey） */
  perDay?: string;
  /** 日均价的 i18n key（config.vipPlans.{id}.perDay） */
  perDayKey?: string;
  /** 徽章文案（中文兜底，展示层优先用 badgeKey） */
  badge?: string;
  /** 徽章的 i18n key（config.vipPlans.{id}.badge） */
  badgeKey?: string;
  popular?: boolean;
}

/** VIP 权益项 */
export interface VipBenefit {
  icon: string;
  title: string;
  desc: string;
}

/** 套餐列表（价格、原价、周期等集中维护） */
// 展示文案 i18n 化（i18n-data-review #11）：name/period/perDay/badge 已抽为 i18n key（config.vipPlans.*，zh/en 同步）。
// 说明（#50）：套餐折扣（6.4/5.7/4.7 折）由 price/originalPrice 计算，属数据层面问题，此处不改动数值。
export const VIP_PLANS: VipPlan[] = [
  {
    id: "monthly",
    name: "月卡",
    nameKey: "config.vipPlans.monthly.name",
    price: 18,
    originalPrice: 28,
    period: "30 天",
    periodKey: "config.vipPlans.monthly.period",
    perDay: "0.6 元/天",
    perDayKey: "config.vipPlans.monthly.perDay",
  },
  {
    id: "quarterly",
    name: "季卡",
    nameKey: "config.vipPlans.quarterly.name",
    price: 48,
    originalPrice: 84,
    period: "90 天",
    periodKey: "config.vipPlans.quarterly.period",
    perDay: "0.53 元/天",
    perDayKey: "config.vipPlans.quarterly.perDay",
    badge: "超值",
    badgeKey: "config.vipPlans.quarterly.badge",
    popular: true,
  },
  {
    id: "yearly",
    name: "年卡",
    nameKey: "config.vipPlans.yearly.name",
    price: 158,
    originalPrice: 336,
    period: "365 天",
    periodKey: "config.vipPlans.yearly.period",
    perDay: "0.43 元/天",
    perDayKey: "config.vipPlans.yearly.perDay",
    badge: "最划算",
    badgeKey: "config.vipPlans.yearly.badge",
  },
];
