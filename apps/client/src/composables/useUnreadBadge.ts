/**
 * useUnreadBadge — 实时未读消息计数与 TabBar 红点同步
 *
 * SubTask 5.4.2：未读消息计数实时更新
 *
 * 实现策略：
 * - 监听 useMessagesStore 的 totalUnreadCount getter（聚合所有会话未读数）
 * - 当计数变化时通过 uni.setTabBarBadge / removeTabBarBadge 更新 TabBar 红点
 * - WebSocket 推送的消息由 store-dispatch.ts 写入 session.unreadCount，
 *   Pinia 自动触发 getter 重算，进而驱动 TabBar 红点更新
 *
 * mp-weixin 兼容性：
 * - uni.setTabBarBadge / removeTabBarBadge 在 mp-weixin / H5 / APP 端均可用
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

/**
 * TabBar 中"消息"tab 的索引。
 * R4-00212：从 appTabs（config/navigation.ts 单一真相源）按 id 推导，
 * tab 顺序调整时红点自动跟随，不再依赖人工同步。
 */
const CHAT_TAB_INDEX = Math.max(0, appTabs.findIndex((t) => t.id === "chat"));

/** 红点上限：超过 99 显示 "99+" */
const BADGE_MAX = 99;

/**
 * 设置 TabBar 红点数字。
 *
 * - count > 0：显示 count（超过 99 显示 "99+"）
 * - count <= 0：移除红点
 *
 * @param count - 未读消息数
 */
function setChatTabBadge(count: number): void {
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
