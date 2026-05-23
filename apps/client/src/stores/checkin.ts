import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { useSessionStore } from "./session";

/**
 * 签到状态 - 与后端 CheckInStatusView 对齐
 * 后端字段: checkedInToday, consecutiveDays, extraQuota
 */
export interface CheckInStatus {
  /** 今日是否已签到（后端字段名: checkedInToday） */
  checkedIn: boolean;
  /** 连续签到天数 */
  consecutiveDays: number;
  /** 签到获取的额外推荐配额（后端字段名: extraQuota） */
  extraRecommendations: number;
}

/**
 * 签到结果 - 与后端 CheckInResultView 对齐
 * 后端字段: success, consecutiveDays, extraQuota
 */
export interface CheckInResult {
  /** 签到日期 */
  checkInDate: string;
  /** 连续签到天数 */
  consecutiveDays: number;
  /** 签到获取的额外推荐次数（后端字段名: extraQuota） */
  extraRecommendations: number;
}

/**
 * 后端 CheckInStatusView 原始类型
 */
interface BackendCheckInStatusView {
  checkedInToday: boolean;
  consecutiveDays: number;
  extraQuota: number;
}

/**
 * 后端 CheckInResultView 原始类型
 */
interface BackendCheckInResultView {
  success: boolean;
  consecutiveDays: number;
  extraQuota: number;
}

/**
 * CheckInStore 状态
 */
export interface CheckInState {
  /** 今日是否已签到（与后端 CheckInStatusView.checkedIn 对齐） */
  checkedIn: boolean;
  /** 连续签到天数 */
  consecutiveDays: number;
  /** 签到获取的额外推荐次数 */
  extraRecommendations: number;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在签到中 */
  checkingIn: boolean;
  /** 签到成功标记（用于触发动画） */
  showSuccessAnimation: boolean;
  /** 错误信息 */
  errorMessage: string | null;
}

/* ========== Mock 数据 ========== */

/** mock 签到状态（默认为未签到） */
let mockCheckInStatus: CheckInStatus = {
  checkedIn: false,
  consecutiveDays: 0,
  extraRecommendations: 0,
};

/** 异步操作超时时间（毫秒） */
const ASYNC_TIMEOUT_MS = 15000;

function useMock() {
  return appEnv.apiMode === "mock";
}

/**
 * 带超时的 Promise 包装器
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 签到 Store
 *
 * 管理每日签到功能，包括签到状态查询、执行签到。
 * 签到成功后提供额外推荐次数和连续签到天数展示。
 */
export const useCheckInStore = defineStore("checkin", {
  state: (): CheckInState => ({
    checkedIn: false,
    consecutiveDays: 0,
    extraRecommendations: 0,
    loading: false,
    checkingIn: false,
    showSuccessAnimation: false,
    errorMessage: null,
  }),

  getters: {
    /** 是否已签到（可展示每日一问入口） */
    hasCheckedIn: (state): boolean => state.checkedIn,

    /** 连续签到天数展示文本 */
    consecutiveDaysText: (state): string => {
      if (state.consecutiveDays <= 0) return "";
      return `已连续签到 ${state.consecutiveDays} 天`;
    },

    /** 额外推荐次数展示文本 */
    extraRecommendationsText: (state): string => {
      if (state.extraRecommendations <= 0) return "";
      return `今日剩余次数+${state.extraRecommendations}`;
    },
  },

  actions: {
    /**
     * 查询签到状态（GET /api/check-in/status）
     */
    async fetchStatus() {
      this.loading = true;
      this.errorMessage = null;

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              this.checkedIn = mockCheckInStatus.checkedIn;
              this.consecutiveDays = mockCheckInStatus.consecutiveDays;
              return;
            }

            // 调用后端 API: GET /api/check-in/status?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<BackendCheckInStatusView>({
              url: `/check-in/status?userId=${userId}`,
              method: "GET",
            });

            // 映射后端字段到前端字段
            this.checkedIn = data.checkedInToday;
            this.consecutiveDays = data.consecutiveDays;
            this.extraRecommendations = data.extraQuota;
          })(),
          ASYNC_TIMEOUT_MS,
          "获取签到状态超时"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "获取签到状态失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 执行签到（POST /api/check-in）
     */
    async checkIn() {
      this.checkingIn = true;
      this.errorMessage = null;
      this.showSuccessAnimation = false;

      try {
        const result = await withTimeout(
          (async (): Promise<CheckInResult> => {
            if (useMock()) {
              // mock 模式下模拟签到成功
              mockCheckInStatus = {
                checkedIn: true,
                consecutiveDays: mockCheckInStatus.checkedIn
                  ? mockCheckInStatus.consecutiveDays
                  : mockCheckInStatus.consecutiveDays + 1,
                extraRecommendations: 3,
              };

              return {
                checkInDate: new Date().toISOString().split("T")[0],
                extraRecommendations: 3,
                consecutiveDays: mockCheckInStatus.consecutiveDays,
              };
            }

            // 调用后端 API: POST /api/check-in?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<BackendCheckInResultView>({
              url: `/check-in?userId=${userId}`,
              method: "POST",
            });

            // 映射后端字段到前端字段
            return {
              checkInDate: new Date().toISOString().split("T")[0],
              consecutiveDays: data.consecutiveDays,
              extraRecommendations: data.extraQuota,
            };
          })(),
          ASYNC_TIMEOUT_MS,
          "签到请求超时，请稍后重试"
        );

        // 签到成功（后端 CheckInView 返回即表示成功）
        this.checkedIn = true;
        this.consecutiveDays = result.consecutiveDays;
        this.extraRecommendations = result.extraRecommendations;

        // 触发签到成功动画
        this.showSuccessAnimation = true;
        // 3 秒后自动收起动画
        setTimeout(() => {
          this.showSuccessAnimation = false;
        }, 3000);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "签到失败，请稍后重试";
        throw error;
      } finally {
        this.checkingIn = false;
      }
    },
  },
});