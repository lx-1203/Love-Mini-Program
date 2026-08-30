import { defineStore } from "pinia";
import type { MakeUpCheckInResultView } from "../services/generated/api-types-supplement";
import { request, withTimeout as withHttpTimeout, EnhancedApiError } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
// 2026-08-10 切换提速：签到状态 30s TTL 缓存（home/discover 双入口去重）
import { isCacheFresh, setCachedValue } from "../utils/cache-ttl";

/** 签到状态新鲜度窗口 */
const CHECKIN_TTL_MS = 30_000;
// 幂等键日期工具：与 services/api.ts 的 localDateKey 保持同一实现
import { clientApi, localDateKey } from "../services/api";
// 统一常量：异步超时、签到成功动画收起延迟、补签上限、签到权益各项默认值
import {
  ASYNC_TIMEOUT_MS,
  SUCCESS_ANIMATION_AUTO_DISMISS_MS,
  DEFAULT_MAKEUP_LIMIT,
  CHECKIN_EXTRA_RECOMMENDATIONS,
  CHECKIN_EXTRA_QUOTA,
  CHECKIN_HOT_TOPIC_COUNT,
  CHECKIN_NEW_USER_COUNT,
  CHECKIN_POINTS_EARNED,
  MOCK_POINTS_BALANCE,
} from "../constants/growth";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

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
  /** 本次签到获得积分（后端可选，缺失时回退常量 CHECKIN_POINTS_EARNED） */
  points?: number;
}

/**
 * 后端 CheckInStatusView 原始类型
 */
interface BackendCheckInStatusView {
  checkedInToday: boolean;
  consecutiveDays: number;
  extraQuota: number;
  /** 积分余额（可选字段，后端未提供时保留前端本地值） */
  points?: number;
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
  /** 本次签到获得积分（可选字段，后端未提供时回退常量） */
  points?: number;
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
  /** 我的积分余额（Task D · 签到积分体系） */
  pointsBalance: number;
  /** 本次签到获得积分（Task D · 签到成功时设置） */
  pointsEarned: number;
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

/** mock 模式积分余额（模块级单例，与 mockCheckInStatus 生命周期一致） */
let mockPointsBalance = MOCK_POINTS_BALANCE;

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
// R4-00155：withTimeout 收敛到 services/http.ts 单一实现（不再本地重复实现超时语义）。
// 本地签名多一个 AbortController 参数（超时后 abort，供 IIFE 通过 signal.aborted
// 跳过后续状态修改），通过委托 http.ts 的 withTimeout 保持该行为与超时语义一致。
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
  controller?: AbortController
): Promise<T> {
  try {
    return await withHttpTimeout(promise, timeoutMs, controller?.signal);
  } catch (error) {
    // 超时（EnhancedApiError.error === "timeout"）或已取消（network_error 且 controller 已 abort）：
    // abort controller 供调用方 IIFE 跳过后续状态修改，并按调用点约定转业务文案；
    // 其余错误（业务/网络）原样透传，与旧实现语义一致
    const isTimeoutOrCancel =
      error instanceof EnhancedApiError &&
      (error.error === "timeout" ||
        (error.error === "network_error" && controller?.signal.aborted === true));
    if (isTimeoutOrCancel) {
      if (controller && !controller.signal.aborted) {
        try {
          controller.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
      }
      throw new Error(errorMessage);
    }
    throw error;
  }
}

let fetchStatusToken = 0;

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
    // Task D：积分体系初始状态
    pointsBalance: MOCK_POINTS_BALANCE,
    pointsEarned: 0,
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
      return t("checkin.consecutiveDaysText", { n: state.consecutiveDays }); // infra R2-00043: 签到权益文本 i18n 化
    },

    /** 额外推荐次数展示文本 */
    extraRecommendationsText: (state): string => {
      if (state.extraRecommendations <= 0) return "";
      return t("checkin.extraRecommendationsText", { n: state.extraRecommendations }); // infra R2-00043
    },

    /** 签到权益-推荐配额展示文本 */
    extraQuotaText: (state): string => {
      if (state.extraRecommendQuota <= 0) return "";
      return t("checkin.extraQuotaText", { n: state.extraRecommendQuota }); // infra R2-00043
    },

    /** 热门话题入口展示文本 */
    hotTopicsText: (state): string => {
      if (!state.hotTopicsUnlocked || state.hotTopicCount <= 0) return "";
      return t("checkin.hotTopicsText", { n: state.hotTopicCount }); // infra R2-00043
    },

    /** 新入圈用户入口展示文本 */
    newUsersText: (state): string => {
      if (!state.newUsersUnlocked || state.newUserCount <= 0) return "";
      return t("checkin.newUsersText", { n: state.newUserCount }); // infra R2-00043
    },
  },

  actions: {
    /**
     * 查询签到状态（GET /api/check-in/status）
     *
     * 修复（P1 BUG）：新增竞态 token——连续进入页面/下拉刷新时，旧请求返回后
     * 不再覆盖新请求结果（原实现仅靠 AbortController 防超时，不防并发覆盖）。
     */
    async fetchStatus() {
      // 2026-08-10 切换提速：30s 内已加载且有数据时直接跳过（home/discover 双入口不再重复请求）
      if (!useMock() && (this.checkedIn !== null || this.consecutiveDays > 0) && isCacheFresh('checkin:status', CHECKIN_TTL_MS)) {
        return;
      }
      // 竞态 token：递增计数，仅最新 token 的请求允许更新状态
      const token = ++fetchStatusToken;
      this.loading = true;
      this.errorMessage = null;

      // 修复（P1 BUG）：新增 AbortController，超时后通过 signal.aborted
      // 阻止 IIFE 内部的状态修改，避免超时后状态被错误覆盖
      const controller = new AbortController();

      try {
        await withTimeout(
          (async () => {
            // 修复：旧请求（被新请求取代）返回时不再修改状态
            if (token !== fetchStatusToken) return;
            if (useMock()) {
              // 修复：超时后不再修改状态，避免覆盖
              if (controller.signal.aborted) return;
              // mock 模式：先设置状态字段，再由外层 finally 重置 loading
              // 顺序很重要：确保 loading = false 之前状态已就绪，避免页面短暂空白
              this.checkedIn = mockCheckInStatus.checkedIn;
              this.consecutiveDays = mockCheckInStatus.consecutiveDays;
              this.extraRecommendations = mockCheckInStatus.extraRecommendations;
              // Task D：同步 mock 积分余额
              this.pointsBalance = mockPointsBalance;
              return;
            }

            // 调用后端 API: GET /api/check-in/status（P2-13：userId 由后端 JWT 获取，不再携带 query）
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            // D2 修复：未登录时无 userId，直接返回，避免无效请求（401/网络噪音）
            if (!userId) {
              if (token !== fetchStatusToken) return;
              this.checkedIn = false;
              this.consecutiveDays = 0;
              this.extraRecommendations = 0;
              return;
            }
            const data = await request<BackendCheckInStatusView>({
              url: "/check-in/status",
              method: "GET",
            });

            // 修复：旧请求（被新请求取代）或超时后不再修改状态
            if (token !== fetchStatusToken || controller.signal.aborted) return;

            // 映射后端字段到前端字段
            this.checkedIn = data.checkedInToday;
            this.consecutiveDays = data.consecutiveDays;
            this.extraRecommendations = data.extraQuota;
            // Task D：后端提供积分余额时同步，否则保留本地值
            this.pointsBalance = data.points ?? this.pointsBalance;
            // 2026-08-10 切换提速：拉取成功后刷新缓存时间戳
            setCachedValue("checkin:status", true);
          })(),
          ASYNC_TIMEOUT_MS,
          t("storeErrors.checkin.timeoutFetchStatus"), // infra R2-00045: 超时文案 i18n 化
          controller
        );
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== fetchStatusToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.checkin.loadStatusFailed");
      } finally {
        // 修复：仅最新 token 的请求才允许清 loading
        if (token === fetchStatusToken) {
          this.loading = false;
        }
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
                throw new Error(t("storeErrors.checkin.timeout"));
              }
              // mock 模式下模拟签到成功
              mockCheckInStatus = {
                checkedIn: true,
                consecutiveDays: mockCheckInStatus.checkedIn
                  ? mockCheckInStatus.consecutiveDays
                  : mockCheckInStatus.consecutiveDays + 1,
                extraRecommendations: CHECKIN_EXTRA_RECOMMENDATIONS,
              };
              // Task D：mock 积分余额累加
              mockPointsBalance += CHECKIN_POINTS_EARNED;

              return {
                // 修复（R4-00176）：改用 localDateKey 生成本地时区日期——toISOString()
                // 为 UTC 日期，北京时间 00:00-08:00 签到会显示为前一天（与 api.ts
                // localDateKey 注释「toISOString 凌晨得到错误日期」同源）。
                checkInDate: localDateKey(new Date()),
                extraRecommendations: CHECKIN_EXTRA_RECOMMENDATIONS,
                consecutiveDays: mockCheckInStatus.consecutiveDays,
                extraRecommendQuota: CHECKIN_EXTRA_QUOTA,
                hotTopicsUnlocked: true, // infra R2-00046: mock 演示数据，real 分支由后端下发
                newUsersUnlocked: true, // infra R2-00046
                hotTopicCount: CHECKIN_HOT_TOPIC_COUNT,
                newUserCount: CHECKIN_NEW_USER_COUNT,
                points: CHECKIN_POINTS_EARNED,
              };
            }

            // 调用后端 API: POST /api/check-in（P2-13：userId 由后端 JWT 获取，不再携带 query）
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            // D2 修复：未登录时无 userId，直接抛出业务错误，避免无效请求
            if (!userId) {
              throw new Error(t("storeErrors.checkin.needLogin"));
            }
            // 后端 @Idempotent 校验：以日期为幂等键（Redis key 按 {key}:{userId} 隔离），
            // 同一天内的重复/重试签到返回同一结果，杜绝重复扣权益。
            const data = await request<BackendCheckInResultView>({
              url: "/check-in",
              method: "POST",
              headers: { "Idempotency-Key": `checkin-${localDateKey(new Date())}` },
            });

            // 修复：API 返回后若已超时，不再继续处理
            if (controller.signal.aborted) {
              throw new Error(t("storeErrors.checkin.timeout"));
            }

            // 映射后端字段到前端字段（含签到权益）
            return {
              // 修复（R4-00176）：本地时区日期（与幂等键 localDateKey 同源，避免 UTC 凌晨错日期）
              checkInDate: localDateKey(new Date()),
              consecutiveDays: data.consecutiveDays,
              extraRecommendations: data.extraQuota,
              extraRecommendQuota: data.extraRecommendQuota,
              hotTopicsUnlocked: data.hotTopicsUnlocked,
              newUsersUnlocked: data.newUsersUnlocked,
              hotTopicCount: data.hotTopicCount,
              newUserCount: data.newUserCount,
              points: data.points ?? CHECKIN_POINTS_EARNED,
            };
          })(),
          ASYNC_TIMEOUT_MS,
          t("storeErrors.checkin.timeout"),
          controller
        );

        // 修复：超时后不再更新签到结果状态
        if (controller.signal.aborted) {
          throw new Error(t("storeErrors.checkin.timeout"));
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
        // Task D：签到成功累加积分（后端字段缺失时回退常量 5）
        this.pointsEarned = result.points ?? CHECKIN_POINTS_EARNED;
        // 注（防双计说明）：pointsEarned 是“本次签到获得”的积分，后端余额接口
        // 返回的是累计余额，两者口径不同。此处本地累加仅用于 mock 模式与后端
        // 未在 fetchStatus 返回 points 的场景；若后端 balance 已由 fetchStatus
        // 同步（data.points ?? this.pointsBalance），则不会重复累加——
        // 若未来后端在 check-in 响应中直接返回最新余额，应改为直接赋值
        // this.pointsBalance = result.balance 而非累加，避免双计。
        this.pointsBalance += this.pointsEarned;

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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.checkin.checkinFailed");
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.checkin.makeupFailed");
        // infra R2-00044: 补签失败重新抛出，调用方可区分“无权限/积分不足”与“网络失败”并差异化提示
        throw error;
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
     *
     * TODO(dispose-接线)：引用页面为 pages/home/index.vue、pages/daily-question/index.vue、
     * pages/discover/index.vue、pages/shop/index.vue。本子任务受目录权限限制无法修改
     * pages/ 目录，需在后续任务中于上述页面 onUnload 中调用 checkInStore.dispose()。
     */
    dispose() {
      if (successAnimationTimer) {
        clearTimeout(successAnimationTimer);
        successAnimationTimer = null;
      }
    },
  },
});