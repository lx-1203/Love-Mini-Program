import { defineStore } from "pinia";
import { ref } from "vue";
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

/**
 * VIP 自动续费 Store
 *
 * 提供 VIP 自动续费开关的查询与设置功能：
 * - fetchStatus：查询当前自动续费状态（GET /api/vip/auto-renew/status）
 * - enableAutoRenew：开启自动续费（POST /api/vip/auto-renew）
 * - disableAutoRenew：关闭自动续费（DELETE /api/vip/auto-renew）
 *
 * 错误处理：API 调用失败时抛出 EnhancedApiError，由页面层捕获并提示。
 *
 * mp-weixin 兼容：使用 uni.request 封装，不依赖 import.meta。
 */

/** 自动续费状态视图（后端对应） */
export interface AutoRenewStatusView {
  /** 是否已开启自动续费 */
  enabled: boolean;
  /** 当前套餐 ID */
  planId?: string | null;
  /** 当前套餐名称 */
  planName?: string | null;
  /** 下次扣费时间（ISO 字符串，可空） */
  nextBillingAt?: string | null;
  /** 下次扣费金额（分） */
  nextBillingAmount?: number | null;
  /** 绑定的支付方式（如 WECHAT） */
  paymentMethod?: string | null;
}

/** 开启自动续费请求体 */
export interface EnableAutoRenewPayload {
  /** 套餐 ID（必填，后端用于扩展绑定支付渠道） */
  planId: string;
}

export const useAutoRenewStore = defineStore("vip-auto-renew", () => {
  /** 自动续费状态 */
  const status = ref<AutoRenewStatusView>({
    enabled: false,
    planId: null,
    planName: null,
    nextBillingAt: null,
    nextBillingAmount: null,
    paymentMethod: null,
  });

  /** 加载中标志 */
  const loading = ref(false);

  /** 更新中标志 */
  const updating = ref(false);

  /** 是否已加载 */
  const loaded = ref(false);

  /**
   * 查询当前自动续费状态
   * <p>对应后端 GET /api/vip/auto-renew/status</p>
   *
   * @param forceRefresh 是否强制刷新
   */
  async function fetchStatus(forceRefresh = false): Promise<AutoRenewStatusView> {
    if (loaded.value && !forceRefresh) {
      return status.value;
    }
    if (loading.value) {
      return status.value;
    }

    if (useMock()) {
      const mock: AutoRenewStatusView = {
        enabled: false,
        planId: "quarterly",
        planName: "季度会员",
        nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingAmount: 4800,
        paymentMethod: "WECHAT",
      };
      status.value = mock;
      loaded.value = true;
      return mock;
    }

    loading.value = true;
    try {
      const result = await request<AutoRenewStatusView, unknown>({
        url: "/vip/auto-renew/status",
        method: "GET",
      });
      status.value = result;
      loaded.value = true;
      return result;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 开启自动续费
   * <p>对应后端 POST /api/vip/auto-renew</p>
   *
   * @param payload 开启请求体（planId 必填）
   * @returns 更新后的状态视图
   */
  async function enableAutoRenew(payload: EnableAutoRenewPayload): Promise<AutoRenewStatusView> {
    if (!payload || !payload.planId) {
      throw new Error(t("storeErrors.vip.planRequired"));
    }

    if (useMock()) {
      const mock: AutoRenewStatusView = {
        enabled: true,
        planId: payload.planId,
        planName: status.value.planName ?? "季度会员",
        nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingAmount: 4800,
        paymentMethod: "WECHAT",
      };
      status.value = mock;
      return mock;
    }

    updating.value = true;
    try {
      const result = await request<AutoRenewStatusView, EnableAutoRenewPayload>({
        url: "/vip/auto-renew",
        method: "POST",
        data: payload,
      });
      status.value = result;
      return result;
    } finally {
      updating.value = false;
    }
  }

  /**
   * 关闭自动续费
   * <p>对应后端 DELETE /api/vip/auto-renew</p>
   *
   * @returns 更新后的状态视图
   */
  async function disableAutoRenew(): Promise<AutoRenewStatusView> {
    if (useMock()) {
      const mock: AutoRenewStatusView = {
        enabled: false,
        planId: status.value.planId,
        planName: status.value.planName,
        nextBillingAt: null,
        nextBillingAmount: null,
        paymentMethod: status.value.paymentMethod,
      };
      status.value = mock;
      return mock;
    }

    updating.value = true;
    try {
      const result = await request<AutoRenewStatusView, unknown>({
        url: "/vip/auto-renew",
        method: "DELETE",
      });
      status.value = result;
      return result;
    } finally {
      updating.value = false;
    }
  }

  /**
   * 兼容旧调用：根据 enabled 字段自动选择开启或关闭
   *
   * @param payload 请求体（enabled 与 planId）
   * @returns 更新后的状态视图
   * @deprecated 推荐使用 enableAutoRenew / disableAutoRenew
   */
  async function setEnabled(payload: { enabled: boolean; planId?: string }): Promise<AutoRenewStatusView> {
    if (payload.enabled) {
      // infra R2-00055: 不再隐式回退硬编码 "quarterly"——套餐未显式指定时抛错由调用方决定，
      // 防止自动续费套餐与用户当前选中套餐不一致
      if (!payload.planId || payload.planId.trim().length === 0) {
        throw new Error(t("storeErrors.vip.planRequired"));
      }
      return enableAutoRenew({ planId: payload.planId });
    }
    return disableAutoRenew();
  }

  /** 重置状态 */
  function reset() {
    status.value = {
      enabled: false,
      planId: null,
      planName: null,
      nextBillingAt: null,
      nextBillingAmount: null,
      paymentMethod: null,
    };
    loading.value = false;
    updating.value = false;
    loaded.value = false;
  }

  return {
    status,
    loading,
    updating,
    loaded,
    fetchStatus,
    enableAutoRenew,
    disableAutoRenew,
    setEnabled,
    reset,
  };
});
