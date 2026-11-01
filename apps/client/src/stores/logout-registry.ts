/**
 * 登出时的「账号态 store」登记表（第五轮 B 道 FINDING 15）。
 *
 * 为什么需要这一份：`stores/session.ts` 的 `logout()` 一直把**本地存储**清得很干净
 * （按 `constants/storage-keys.ts` 的派生清单，新增 key 默认被清 ⇒ 漏清方向天然安全），
 * 但 Pinia 的**内存态**一行都没清：全仓既没有 `$reset()` 调用，四个 store 自带的
 * `reset()` 也没有任何登出调用点。mp-weixin / H5 的 `reLaunch` 不重置 JS 运行时，
 * 于是同一次 app 生命周期内换账号时，B 会继承 A 的内存态——可推导出的用户可见后果包括
 * 「B 没签到就能看到每日一问的题目与回答框」（`checkin.checkedIn` 绕过业务闸门）、
 * 「B 屏幕上继续显示 A 拉到的回答卡片」、以及先闪出 A 的钱包余额。
 *
 * 设计照 `storage-keys.ts` 那条「默认即安全」的口径：
 * 每个 store 要么登记在 `ACCOUNT_SCOPED_STORES`（登出必复位），要么登记在
 * `NON_ACCOUNT_STORES` 并写明为什么不跟账号走。两者之外的 store 由
 * `src/tests/stores/logout-registry.spec.ts` 的静态对账判红——新增 store 不登记就红，
 * 不依赖人记得来改这个文件。
 */
import { useActivityStore } from "./activity";
import { useCampusStore } from "./campus";
import { useCampusWallStore } from "./campus-wall";
import { useChatStore } from "./chat";
import { useCheckInStore } from "./checkin";
import { useCircleStore } from "./circle";
import { useCoinsStore } from "./coins";
import { useDailyQuestionStore } from "./daily-question";
import { useDiscoverStore } from "./discover";
import { useFeedbackStore } from "./feedback";
import { useHomeStore } from "./home";
import { useLikesStore } from "./likes";
import { useMatchStore } from "./match";
import { useMessagesStore } from "./messages";
import { useProfileStore } from "./profile";
import { usePromoCodeStore } from "./promo-code";
import { useReportStore } from "./report";
import { useScheduleStore } from "./schedule";
import { useSearchStore } from "./search";
import { useSocialProgressStore } from "./social-progress";
import { useUnlockGuideStore } from "./unlock-guide";
import { useVillageStore } from "./village";
import { useVipStore } from "./vip";
import { useAutoRenewStore } from "./vip-auto-renew";
import { useVipBillingStore } from "./vip-billing";

/** 被登记 store 的最小契约：登出时可调用的复位入口。 */
export interface ResettableStore {
  resetForLogout?: () => void;
}

export interface AccountScopedStoreEntry {
  /** 与 `defineStore` 第一参数逐字一致——静态对账门按这一位认人，不按文件名。 */
  readonly id: string;
  /**
   * 惰性取 store。
   *
   * 不能在模块顶层调 `useXxxStore()`：那要求 pinia 已激活（登出发生在任何组件之外，
   * 但本模块可能在 App 初始化之前被 import），而部分 store 内部又会用到 session store，
   * 顶层求值会把这条链变成初始化期的循环依赖。
   */
  readonly load: () => ResettableStore;
}

/** 登出必须复位的账号态 store。 */
export const ACCOUNT_SCOPED_STORES: readonly AccountScopedStoreEntry[] = [
  { id: "activity", load: useActivityStore },
  { id: "campus", load: useCampusStore },
  { id: "campus-wall", load: useCampusWallStore },
  { id: "chat", load: useChatStore },
  { id: "checkin", load: useCheckInStore },
  { id: "circle", load: useCircleStore },
  { id: "coins", load: useCoinsStore },
  { id: "daily-question", load: useDailyQuestionStore },
  { id: "discover", load: useDiscoverStore },
  { id: "feedback", load: useFeedbackStore },
  { id: "home", load: useHomeStore },
  { id: "likes", load: useLikesStore },
  { id: "match", load: useMatchStore },
  { id: "messages", load: useMessagesStore },
  { id: "profile", load: useProfileStore },
  { id: "promo-code", load: usePromoCodeStore },
  { id: "report", load: useReportStore },
  { id: "schedule", load: useScheduleStore },
  { id: "search", load: useSearchStore },
  { id: "socialProgress", load: useSocialProgressStore },
  { id: "unlock-guide", load: useUnlockGuideStore },
  { id: "village", load: useVillageStore },
  { id: "vip", load: useVipStore },
  { id: "vip-auto-renew", load: useAutoRenewStore },
  { id: "vip-billing", load: useVipBillingStore },
];

/**
 * 不跟账号走的 store（登出**不许**复位它们）。
 *
 * 每一条都要有能被反驳的理由；门会检查这里列的 id 在盘上仍然存在。
 */
export const NON_ACCOUNT_STORES: readonly { id: string; reason: string }[] = [
  {
    id: "session",
    reason: "登出的执行者本身：logout() 内联清 userSession/loginHero/isOffline/profileBackgroundUrl",
  },
  {
    id: "app-config",
    reason: "服务端下发的应用配置与功能开关，与登录主体无关；清掉只会让下一次请求前多一次空窗",
  },
  {
    id: "theme",
    reason: "设备级显示偏好（本仓设备级存储键同样不参与用户级清扫），换账号应当保留",
  },
];

/** 单个 store 的登出复位结果（判点用它区分「复位了」「没实现」「炸了」三种形态）。 */
export type StoreResetStatus = "reset" | "no-method" | "error";

export interface StoreResetOutcome {
  readonly id: string;
  readonly status: StoreResetStatus;
}

/**
 * 复位所有账号态 store，逐项返回结果。
 *
 * 单个 store 复位抛错不影响其余 store：登出的本地清理必须是「尽力把能清的清完」，
 * 而不是「第一个炸了后面全不执行」——那正是本文件要消灭的形态的另一种复发。
 * `no-method` 表示登记了却没实现 `resetForLogout()`，由 logout-registry.spec.ts 判红。
 */
export function resetAccountScopedStores(): StoreResetOutcome[] {
  const outcomes: StoreResetOutcome[] = [];
  for (const entry of ACCOUNT_SCOPED_STORES) {
    try {
      const store = entry.load();
      if (typeof store.resetForLogout !== "function") {
        console.warn(`[logout-registry] ${entry.id} 没有 resetForLogout()，登出未复位`);
        outcomes.push({ id: entry.id, status: "no-method" });
        continue;
      }
      store.resetForLogout();
      outcomes.push({ id: entry.id, status: "reset" });
    } catch (error) {
      console.warn(`[logout-registry] ${entry.id} 复位异常:`, error);
      outcomes.push({ id: entry.id, status: "error" });
    }
  }
  return outcomes;
}
