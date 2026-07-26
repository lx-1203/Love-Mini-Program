import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { clientApi } from "../services/api";
import type { MakeUpCheckInResultView } from "../services/generated/api-types-supplement";
import { request } from "../services/http";
import { useSessionStore } from "./session";
// 统一常量：异步超时、签到成功动画收起延迟、补签上限、签到权益各项默认值
import {
  ASYNC_TIMEOUT_MS,
  SUCCESS_ANIMATION_AUTO_DISMISS_MS,
  DEFAULT_MAKEUP_LIMIT,
  CHECKIN_EXTRA_RECOMMENDATIONS,
  CHECKIN_EXTRA_QUOTA,
  CHECKIN_HOT_TOPIC_COUNT,
  CHECKIN_NEW_USER_COUNT,
} from "../constants/growth";

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
 * 后端字段: success, consecutiveDays, extraQuota, extraRecommendQuota,
 *          hotTopicsUnlocked, newUsersUnlocked, hotTopicCount, newUserCount
 */
export interface CheckInResult {
  /** 签到日期 */
  checkInDate: string;
  /** 连续签到天数 */
  consecutiveDays: number;
  /** 签到获取的额外推荐次数（后端字段名: extraQuota） */
  extraRecommendations: number;
  /** 今日额外推荐配额（签到权益 +5） */
  extraRecommendQuota: number;
  /** 热门话题是否已解锁 */
  hotTopicsUnlocked: boolean;
  /** 新入圈用户是否已解锁 */
  newUsersUnlocked: boolean;
  /** 热门话题数量 */
  hotTopicCount: number;
  /** 新入圈用户数量 */
  newUserCount: number;
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
  extraRecommendQuota: number;
  hotTopicsUnlocked: boolean;
  newUsersUnlocked: boolean;
  hotTopicCount: number;
  newUserCount: number;
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
  /** 今日额外推荐配额（签到权益 +5） */
  extraRecommendQuota: number;
  /** 热门话题是否已解锁 */
  hotTopicsUnlocked: boolean;
  /** 新入圈用户是否已解锁 */
  newUsersUnlocked: boolean;
  /** 热门话题数量 */
  hotTopicCount: number;
  /** 新入圈用户数量 */
  newUserCount: number;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在签到中 */
  checkingIn: boolean;
  /** 签到成功标记（用于触发动画） */
  showSuccessAnimation: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /** 功能7：本月已用补签次数（由 makeUpCheckIn 返回时同步更新） */
  makeUpUsedCount: number;
  /** 功能7：本月补签次数上限（默认 3，由 makeUpCheckIn 返回时同步更新） */
  makeUpLimit: number;
  /** 功能7：是否正在补签中（防重复触发） */
  makingUp: boolean;
}

/* ========== Mock 数据 ========== */

/** mock 签到状态（默认为未签到） */
let mockCheckInStatus: CheckInStatus = {
  checkedIn: false,
  consecutiveDays: 0,
  extraRecommendations: 0,
};

// 注：ASYNC_TIMEOUT_MS / SUCCESS_ANIMATION_AUTO_DISMISS_MS
// 由 constants/growth.ts 统一提供

/**
 * 签到成功动画定时器（模块级单例）。
 *
 * 修复（P1 BUG）：原实现直接在 checkIn action 内调用 setTimeout 修改 showSuccessAnimation，
 * 但未保存定时器句柄，存在两个问题：
 * 1. 用户连续触发签到时，旧定时器仍会触发，覆盖新状态
 * 2. 组件卸载后定时器仍会触发，修改已卸载状态
 * 现保存定时器句柄，新签到前清理旧定时器，dispose 时统一清理。
 */
let successAnimationTimer: ReturnType<typeof setTimeout> | null = null;

function useMock() {
  return appEnv.apiMode === "mock";
}

/**
 * 带超时的 Promise 包装器
 *
 * 修复（P1 BUG）：原实现超时后底层 Promise 仍会继续执行，
 * 后续的 .then 回调仍会修改状态（如 this.checkedIn = ...），
 * 导致超时后状态被错误覆盖。
 * 现新增可选的 AbortController 参数，超时时调用 controller.abort()，
 * 调用方可通过 signal.aborted 在 IIFE 内部判断是否已超时，跳过后续状态修改。
 *
 * @param promise - 要包装的 Promise
 * @param timeoutMs - 超时时间（毫秒）
 * @param errorMessage - 超时错误信息
 * @param controller - 可选的 AbortController，超时后会被 abort，调用方可据此取消后续逻辑
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
  controller?: AbortController
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // 修复：若已取消，立即拒绝，避免无谓的定时器与 Promise 执行
    if (controller?.signal.aborted) {
      reject(new Error(errorMessage));
      return;
    }

    const timer = setTimeout(() => {
      // 修复：超时后通过 AbortController 取消后续逻辑
      // IIFE 内部可通过 signal.aborted 判断跳过状态修改
      if (controller) {
        try {
          controller.abort();
        } catch (_e) {
          // abort 失败时忽略，避免阻塞 reject
        }
      }
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        // 修复：超时后不再 resolve，避免与超时 reject 冲突
        if (controller?.signal.aborted) {
          return;
        }
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        if (controller?.signal.aborted) {
          return;
        }
        reject(error);
      });
  });
}

/**
 * 签到 Store
 *
 * 管理每日签到功能，包括签到状态查询、执行签到。
 * 签到成功后提供额外推荐次数、连续签到天数、热门话题、新入圈用户等权益展示。
 */
export const useCheckInStore = defineStore("checkin", {
  state: (): CheckInState => ({
    checkedIn: false,
    consecutiveDays: 0,
    extraRecommendations: 0,
    extraRecommendQuota: 0,
    hotTopicsUnlocked: false,
    newUsersUnlocked: false,
    hotTopicCount: 0,
    newUserCount: 0,
    loading: false,
    checkingIn: false,
    showSuccessAnimation: false,
    errorMessage: null,
    // 功能7：补签相关状态默认值
    makeUpUsedCount: 0,
    makeUpLimit: DEFAULT_MAKEUP_LIMIT,
    makingUp: false,
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

    /** 签到权益-推荐配额展示文本 */
    extraQuotaText: (state): string => {
      if (state.extraRecommendQuota <= 0) return "";
      return `今日额外推荐配额 +${state.extraRecommendQuota}`;
    },

    /** 热门话题入口展示文本 */
    hotTopicsText: (state): string => {
      if (!state.hotTopicsUnlocked || state.hotTopicCount <= 0) return "";
      return `今日热门话题 (${state.hotTopicCount})`;
    },

    /** 新入圈用户入口展示文本 */
    newUsersText: (state): string => {
      if (!state.newUsersUnlocked || state.newUserCount <= 0) return "";
      return `新入圈用户 (${state.newUserCount})`;
    },
  },

  actions: {
    /**
     * 查询签到状态（GET /api/check-in/status）
     */
    async fetchStatus() {
      this.loading = true;
      this.errorMessage = null;

      // 修复（P1 BUG）：新增 AbortController，超时后通过 signal.aborted
      // 阻止 IIFE 内部的状态修改，避免超时后状态被错误覆盖
      const controller = new AbortController();

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              // 修复：超时后不再修改状态，避免覆盖
              if (controller.signal.aborted) return;
              // mock 模式：先设置状态字段，再由外层 finally 重置 loading
              // 顺序很重要：确保 loading = false 之前状态已就绪，避免页面短暂空白
              this.checkedIn = mockCheckInStatus.checkedIn;
              this.consecutiveDays = mockCheckInStatus.consecutiveDays;
              this.extraRecommendations = mockCheckInStatus.extraRecommendations;
              return;
            }

            // 调用后端 API: GET /api/check-in/status?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<BackendCheckInStatusView>({
              url: `/check-in/status?userId=${userId}`,
              method: "GET",
            });

            // 修复：API 返回后若已超时，不再修改状态
            if (controller.signal.aborted) return;

            // 映射后端字段到前端字段
            this.checkedIn = data.checkedInToday;
            this.consecutiveDays = data.consecutiveDays;
            this.extraRecommendations = data.extraQuota;
          })(),
          ASYNC_TIMEOUT_MS,
          "获取签到状态超时",
          controller
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "获取签到状态失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 执行签到（POST /api/check-in）
     *
     * 修复（P0 BUG）：新增 isCheckingIn 幂等守卫。
     * 原实现无并发守卫，用户连续点击签到按钮会触发多次签到请求，
     * 后端可能扣款/扣配额多次。现以 checkingIn 状态作为锁，
     * 若已在签到中直接返回，避免重复触发。
     */
    async checkIn() {
      // 修复（P0 BUG）：幂等守卫，防止重复签到扣款
      if (this.checkingIn) {
        return;
      }

      this.checkingIn = true;
      this.errorMessage = null;
      this.showSuccessAnimation = false;

      // 修复（P1 BUG）：清理上一次签到成功动画的定时器，
      // 避免旧定时器触发后覆盖新签到的动画状态
      if (successAnimationTimer) {
        clearTimeout(successAnimationTimer);
        successAnimationTimer = null;
      }

      // 修复（P1 BUG）：新增 AbortController，超时后取消后续状态修改
      const controller = new AbortController();

      try {
        const result = await withTimeout(
          (async (): Promise<CheckInResult> => {
            if (useMock()) {
              // 修复：超时后不再修改 mock 状态
              if (controller.signal.aborted) {
                throw new Error("签到请求超时，请稍后重试");
              }
              // mock 模式下模拟签到成功
              mockCheckInStatus = {
                checkedIn: true,
                consecutiveDays: mockCheckInStatus.checkedIn
                  ? mockCheckInStatus.consecutiveDays
                  : mockCheckInStatus.consecutiveDays + 1,
                extraRecommendations: CHECKIN_EXTRA_RECOMMENDATIONS,
              };

              return {
                // 修复（严格模式 noUncheckedIndexedAccess）：split("T")[0] 索引访问返回 string | undefined，
                // 此处兜底取整串，确保 checkInDate 始终为 string。
                checkInDate: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
                extraRecommendations: CHECKIN_EXTRA_RECOMMENDATIONS,
                consecutiveDays: mockCheckInStatus.consecutiveDays,
                extraRecommendQuota: CHECKIN_EXTRA_QUOTA,
                hotTopicsUnlocked: true,
                newUsersUnlocked: true,
                hotTopicCount: CHECKIN_HOT_TOPIC_COUNT,
                newUserCount: CHECKIN_NEW_USER_COUNT,
              };
            }

            // 调用后端 API: POST /api/check-in?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<BackendCheckInResultView>({
              url: `/check-in?userId=${userId}`,
              method: "POST",
            });

            // 修复：API 返回后若已超时，不再继续处理
            if (controller.signal.aborted) {
              throw new Error("签到请求超时，请稍后重试");
            }

            // 映射后端字段到前端字段（含签到权益）
            return {
              // 修复（严格模式 noUncheckedIndexedAccess）：split("T")[0] 索引访问返回 string | undefined，
              // 此处兜底取整串，确保 checkInDate 始终为 string。
              checkInDate: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
              consecutiveDays: data.consecutiveDays,
              extraRecommendations: data.extraQuota,
              extraRecommendQuota: data.extraRecommendQuota,
              hotTopicsUnlocked: data.hotTopicsUnlocked,
              newUsersUnlocked: data.newUsersUnlocked,
              hotTopicCount: data.hotTopicCount,
              newUserCount: data.newUserCount,
            };
          })(),
          ASYNC_TIMEOUT_MS,
          "签到请求超时，请稍后重试",
          controller
        );

        // 修复：超时后不再更新签到结果状态
        if (controller.signal.aborted) {
          throw new Error("签到请求超时，请稍后重试");
        }

        // 签到成功（后端 CheckInView 返回即表示成功）
        this.checkedIn = true;
        this.consecutiveDays = result.consecutiveDays;
        this.extraRecommendations = result.extraRecommendations;
        this.extraRecommendQuota = result.extraRecommendQuota;
        this.hotTopicsUnlocked = result.hotTopicsUnlocked;
        this.newUsersUnlocked = result.newUsersUnlocked;
        this.hotTopicCount = result.hotTopicCount;
        this.newUserCount = result.newUserCount;

        // 触发签到成功动画
        this.showSuccessAnimation = true;
        // 修复（P1 BUG）：保存定时器句柄，触发前检查是否已被清理，
        // 避免组件卸载或新签到后旧定时器仍修改状态
        successAnimationTimer = setTimeout(() => {
          // 二次检查：若已被清理（新签到/dispose），不再修改状态
          if (successAnimationTimer !== null) {
            this.showSuccessAnimation = false;
            successAnimationTimer = null;
          }
        }, SUCCESS_ANIMATION_AUTO_DISMISS_MS);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "签到失败，请稍后重试";
        throw error;
      } finally {
        this.checkingIn = false;
      }
    },

    /**
     * 功能7：执行签到补签（POST /api/check-in/make-up）。
     *
     * 业务规则：
     * - 仅可补签昨日及之前 7 天内的日期
     * - 不能补签已签到过的日期
     * - 每月补签次数上限默认 3 次（由后端 MakeUpQuota.limitCount 控制）
     * - 首次补签免费，其后每次消耗 50 积分
     *
     * 防重复触发：以 makingUp 状态作为锁，若已在补签中直接返回 null。
     *
     * @param date 补签日期（yyyy-MM-dd）
     * @returns 补签结果视图（含连续天数/已用次数/消耗积分），失败返回 null
     */
    async makeUpCheckIn(date: string): Promise<MakeUpCheckInResultView | null> {
      // 防重复触发：补签中直接返回
      if (this.makingUp) {
        return null;
      }
      this.makingUp = true;
      this.errorMessage = null;
      try {
        const result = await clientApi.makeUpCheckIn(date);
        // 同步更新签到状态：补签成功后连续天数 +N（由后端返回）
        if (result.success) {
          this.consecutiveDays = result.consecutiveDays;
          this.makeUpUsedCount = result.usedMakeUpCount;
          this.makeUpLimit = result.makeUpLimit;
        }
        return result;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "补签失败，请稍后重试";
        console.error("[checkinStore.makeUpCheckIn]", error);
        return null;
      } finally {
        this.makingUp = false;
      }
    },

    /**
     * 清理 store 持有的定时器资源。
     *
     * 修复（P1 BUG）：组件 onUnmounted 时应调用此方法，
     * 避免定时器在组件卸载后仍修改状态。
     * 也用于 HMR 热更新时清理模块级定时器。
     */
    dispose() {
      if (successAnimationTimer) {
        clearTimeout(successAnimationTimer);
        successAnimationTimer = null;
      }
    },
  },
});