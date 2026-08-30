/**
 * useUnreadBadge — 实时未读消息计数与 TabBar 红点同步
 *
 * SubTask 5.4.2：未读消息计数实时更新
 *
 * 实现策略：
 * - 监听 useMessagesStore 的 totalUnreadCount getter（聚合所有会话未读数）
 * - 当计数变化时更新 TabBar 红点：
 *   - mp-weixin 自定义 TabBar（A2）：未读数写入本地存储 TABBAR_CHAT_UNREAD +
 *     调用页面 getTabBar().setData({ chatBadge }) 即时刷新
 *     （custom-tab-bar/index.js 的 syncBadge 在 attached/show 时读取 storage 兜底）
 *   - 非 mp-weixin（H5 / APP）：通过 uni.setTabBarBadge / removeTabBarBadge 更新
 * - WebSocket 推送的消息由 store-dispatch.ts 写入 session.unreadCount，
 *   Pinia 自动触发 getter 重算，进而驱动 TabBar 红点更新
 *
 * mp-weixin 兼容性：
 * - uni.setTabBarBadge / removeTabBarBadge 在自定义 TabBar 模式下不生效
 *   （fail 回调被静默忽略），故 mp-weixin 走 storage + setData 路径
 * - 不使用 import.meta.env
 * - 不使用 optional catch binding
 *
 * 用法：
 * ```ts
 * // App.vue
 * useUnreadBadge();
 * ```
 */
import { watch } from "vue";
import { onLaunch } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useMessagesStore } from "../stores/messages";
// R4-00212：tab 索引由 config/navigation.ts（TabBar 唯一真相源）推导，不再硬编码
import { appTabs } from "../config/navigation";
// Task 35：平台判断与 TabBar 实例获取收敛到 compat/index.ts，避免散落 #ifdef
import { getTabBarInstance, isMpWeixin } from "../compat";
// A2：自定义 TabBar 角标存储键统一走 constants（custom-tab-bar/index.js 读取同一键）
import { STORAGE_KEYS } from "../constants";

/**
 * TabBar 中"消息"tab 的索引。
 * R4-00212：从 appTabs（config/navigation.ts 单一真相源）按 id 推导，
 * tab 顺序调整时红点自动跟随，不再依赖人工同步。
 */
const CHAT_TAB_INDEX = Math.max(0, appTabs.findIndex((t) => t.id === "chat"));

/** 红点上限：超过 99 显示 "99+" */
const BADGE_MAX = 99;

/**
 * A2：mp-weixin 自定义 TabBar 角标同步。
 *
 * 自定义 TabBar 模式下 uni.setTabBarBadge 不生效（fail 回调被静默忽略），
 * 改为双通道保证红点可见：
 * 1. 未读数写入本地存储 TABBAR_CHAT_UNREAD —— custom-tab-bar/index.js 的
 *    syncBadge() 在 attached / pageLifetimes.show 时读取渲染（兜底通道，
 *    覆盖 TabBar 未挂载 / setData 不可达的场景）
 * 2. 调用当前页面 getTabBar() 实例 setData({ chatBadge }) 即时刷新
 *    （主通道，无需等待页面切换）
 *
 * @param count - 未读消息数
 */
function syncCustomTabBarBadge(count: number): void {
  try {
    uni.setStorageSync(STORAGE_KEYS.TABBAR_CHAT_UNREAD, count);
  } catch (_e) {
    // 存储失败静默忽略，本次启动内仍可由 setData 通道刷新角标
  }
  const tabBar = getTabBarInstance();
  if (tabBar && typeof tabBar.setData === "function") {
    tabBar.setData({ chatBadge: count });
  }
}

/**
 * 设置 TabBar 红点数字。
 *
 * - count > 0：显示 count（超过 99 显示 "99+"）
 * - count <= 0：移除红点
 * - mp-weixin（自定义 TabBar）：走 syncCustomTabBarBadge（storage + setData）
 * - 非 mp-weixin（H5 / APP）：走 uni.setTabBarBadge / removeTabBarBadge
 *
 * @param count - 未读消息数
 */
function setChatTabBadge(count: number): void {
  // A2：mp-weixin 自定义 TabBar 红点由 custom-tab-bar/index.js 渲染，
  // 此处只做 storage 写入 + 实例 setData；setTabBarBadge 在该模式下不生效
  if (isMpWeixin()) {
    syncCustomTabBarBadge(count);
    return;
  }

  // 兼容性检查：uni.setTabBarBadge 在 H5 / 部分小程序端可能不存在
  if (typeof uni === "undefined" || typeof uni.setTabBarBadge !== "function") {
    return;
  }

  if (count > 0) {
    const display = count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
    try {
      uni.setTabBarBadge({
        index: CHAT_TAB_INDEX,
        text: display,
        fail: () => {
          // 自定义 TabBar 模式下 setTabBarBadge 可能失败，静默忽略
        },
      });
    } catch (_e) {
      // 静默忽略
    }
  } else {
    try {
      uni.removeTabBarBadge({
        index: CHAT_TAB_INDEX,
        fail: () => {
          // 静默忽略
        },
      });
    } catch (_e) {
      // 静默忽略
    }
  }
}

/**
 * 未读消息计数实时同步组合式函数。
 *
 * - onLaunch 阶段：初始化监听器
 * - watch totalUnreadCount：变化时调用 setChatTabBadge 更新红点
 *
 * 使用方式：在 App.vue 顶部调用一次即可，全局生效。
 */
export function useUnreadBadge(): void {
  onLaunch(() => {
    try {
      const messagesStore = useMessagesStore();
      const { totalUnreadCount } = storeToRefs(messagesStore);

      // 立即同步一次初始值
      setChatTabBadge(totalUnreadCount.value);

      // 监听变化（WebSocket 推送新消息 → store 更新 unreadCount → getter 重算 → 触发 watch）
      watch(
        totalUnreadCount,
        (newCount) => {
          setChatTabBadge(newCount);
        },
        { immediate: false }
      );
    } catch (_e) {
      // store 初始化失败时静默忽略，不影响应用启动
    }
  });
}

export { setChatTabBadge, CHAT_TAB_INDEX };
