import { defineStore } from "pinia";
import { ref } from "vue";
import { appEnv } from "../services/env";
import { request } from "../services/http";

/**
 * VIP 优惠码 Store
 *
 * 提供 VIP 优惠码的校验与兑换功能：
 * - validate：校验优惠码是否可用（不消耗），返回优惠金额预览
 * - redeem：实际兑换优惠码，应用折扣到当前订单
 *
 * 错误处理：API 调用失败时抛出 EnhancedApiError，由页面层捕获并提示。
 *
 * mp-weixin 兼容：使用 uni.request 封装，不依赖 import.meta。
 */

/** 优惠码折扣类型：AMOUNT 满减 / PERCENT 折扣百分比 */
export type DiscountType = "AMOUNT" | "PERCENT";

/** 优惠码校验结果视图（后端对应） */
export interface PromoCodeValidateView {
  code: string;
  discountType: DiscountType;
  /** 折扣值：AMOUNT 时为分，PERCENT 时为百分比（0~100） */
  discountValue: number;
  /** 优惠码描述（如"立减 10 元"） */
  description?: string | null;
  /** 优惠后应付金额（分），由后端基于传入的订单金额计算 */
  payableAmount?: number;
  /** 优惠金额（分） */
  discountAmount?: number;
  /** 是否仍然可用（已用尽 / 已过期时为 false） */
  available: boolean;
  /** 不可用原因（available=false 时填充） */
  reason?: string | null;
}

/** 优惠码兑换结果视图 */
export interface PromoCodeRedeemView {
  code: string;
  success: boolean;
  /** 实际优惠金额（分） */
  discountAmount: number;
  /** 兑换后的应付金额（分） */
  payableAmount: number;
  /** 兑换失败原因 */
  reason?: string | null;
}

/** 校验请求体 */
export interface ValidatePayload {
  /** 优惠码字符串 */
  code: string;
  /** 订单金额（分），用于计算优惠后金额 */
  orderAmount: number;
}

/** 兑换请求体 */
export interface RedeemPayload {
  /** 优惠码字符串 */
  code: string;
  /** 订单金额（分） */
  orderAmount: number;
  /** 关联订单 ID（可选，用于追溯） */
  orderId?: string;
}

/**
 * 判断是否使用 mock 模式
 */
function useMock(): boolean {
  return appEnv.apiMode === "mock";
}

export const usePromoCodeStore = defineStore("promo-code", () => {
  /** 最近一次校验结果 */
  const lastValidation = ref<PromoCodeValidateView | null>(null);

  /** 最近一次兑换结果 */
  const lastRedeemResult = ref<PromoCodeRedeemView | null>(null);

  /** 校验中标志 */
  const validating = ref(false);

  /** 兑换中标志 */
  const redeeming = ref(false);

  /**
   * 校验优惠码
   *
   * @param payload 校验请求体
   * @returns 校验结果视图
   */
  async function validateCode(payload: ValidatePayload): Promise<PromoCodeValidateView> {
    if (!payload.code || payload.code.trim().length === 0) {
      throw new Error("优惠码不能为空");
    }
    if (payload.orderAmount < 0) {
      throw new Error("订单金额不能为负数");
    }

    if (useMock()) {
      // mock 模式：根据优惠码字符特征返回不同结果，便于联调
      const code = payload.code.trim().toUpperCase();
      if (code === "INVALID" || code === "EXPIRED") {
        const mock: PromoCodeValidateView = {
          code,
          discountType: "AMOUNT",
          discountValue: 0,
          description: null,
          available: false,
          reason: "优惠码已过期或不可用",
        };
        lastValidation.value = mock;
        return mock;
      }
      // 默认按 AMOUNT 优惠 1000 分（10 元）
      const discountAmount = Math.min(1000, payload.orderAmount);
      const mock: PromoCodeValidateView = {
        code,
        discountType: "AMOUNT",
        discountValue: 1000,
        description: "立减 10 元",
        discountAmount,
        payableAmount: payload.orderAmount - discountAmount,
        available: true,
      };
      lastValidation.value = mock;
      return mock;
    }

    validating.value = true;
    try {
      const result = await request<PromoCodeValidateView, ValidatePayload>({
        url: "/vip/promo-codes/validate",
        method: "POST",
        data: payload,
      });
      lastValidation.value = result;
      return result;
    } finally {
      validating.value = false;
    }
  }

  /**
   * 兑换优惠码
   *
   * @param payload 兑换请求体
   * @returns 兑换结果视图
   */
  async function redeemCode(payload: RedeemPayload): Promise<PromoCodeRedeemView> {
    if (!payload.code || payload.code.trim().length === 0) {
      throw new Error("优惠码不能为空");
    }
    if (payload.orderAmount < 0) {
      throw new Error("订单金额不能为负数");
    }

    if (useMock()) {
      const code = payload.code.trim().toUpperCase();
      const discountAmount = Math.min(1000, payload.orderAmount);
      const mock: PromoCodeRedeemView = {
        code,
        success: true,
        discountAmount,
        payableAmount: payload.orderAmount - discountAmount,
      };
      lastRedeemResult.value = mock;
      return mock;
    }

    redeeming.value = true;
    try {
      const result = await request<PromoCodeRedeemView, RedeemPayload>({
        url: "/vip/promo-codes/redeem",
        method: "POST",
        data: payload,
      });
      lastRedeemResult.value = result;
      return result;
    } finally {
      redeeming.value = false;
    }
  }

  /** 重置状态 */
  function reset() {
    lastValidation.value = null;
    lastRedeemResult.value = null;
    validating.value = false;
    redeeming.value = false;
  }

  return {
    lastValidation,
    lastRedeemResult,
    validating,
    redeeming,
    validateCode,
    redeemCode,
    reset,
  };
});
