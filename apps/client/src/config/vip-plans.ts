/**
 * VIP 套餐配置（提取为常量，避免在页面中硬编码价格）。
 *
 * 修复：原 pages/vip/index.vue 中套餐价格、周期、原价等字段全部硬编码在页面内，
 * 后续调整价格需要修改视图代码。现统一抽到 config，便于运营/后端联动维护。
 */

/** 套餐 ID */
export type VipPlanId = "monthly" | "quarterly" | "yearly";

/** 套餐接口 */
export interface VipPlan {
  id: VipPlanId;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  perDay?: string;
  badge?: string;
  popular?: boolean;
}

/** VIP 权益项 */
export interface VipBenefit {
  icon: string;
  title: string;
  desc: string;
}

/** 套餐列表（价格、原价、周期等集中维护） */
export const VIP_PLANS: VipPlan[] = [
  {
    id: "monthly",
    name: "月卡",
    price: 18,
    originalPrice: 28,
    period: "30 天",
    perDay: "0.6 元/天",
  },
  {
    id: "quarterly",
    name: "季卡",
    price: 48,
    originalPrice: 84,
    period: "90 天",
    perDay: "0.53 元/天",
    badge: "超值",
    popular: true,
  },
  {
    id: "yearly",
    name: "年卡",
    price: 158,
    originalPrice: 336,
    period: "365 天",
    perDay: "0.43 元/天",
    badge: "最划算",
  },
];
