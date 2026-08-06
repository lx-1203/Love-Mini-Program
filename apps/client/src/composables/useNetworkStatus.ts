/**
 * useNetworkStatus — 全局网络状态监听与提示
 *
 * 功能：
 * - 在应用启动时注册 uni.onNetworkStatusChange 监听器
 * - 网络断开时 toast 提示「网络已断开」
 * - 网络恢复时 toast 提示「网络已恢复」
 * - 提供 isOnline 响应式状态供页面消费（如禁用提交按钮、展示离线提示条）
 *
 * mp-weixin 兼容性：
 * - uni.onNetworkStatusChange 在 H5 / mp-weixin / APP 端均可用
 * - 不使用 import.meta.env
 * - 不使用 optional catch binding
 *
 * 用法：
 * ```ts
 * // App.vue
 * useNetworkStatus();
 * ```
 */
import { ref, onUnmounted } from "vue";
import { onLaunch } from "@dcloudio/uni-app";
// infra R2-00139: 网络恢复/断开 toast 经防抖收敛，避免弱网抖动重复弹提示
import { debounce } from "../utils/debounce";

/** 全局在线状态（响应式），跨页面共享 */
const isOnline = ref<boolean>(true);
/** 当前网络类型（wifi / 2g / 3g / 4g / 5g / unknown / none） */
const networkType = ref<string>("unknown");

/** 网络状态变化提示防抖间隔（毫秒） */
// infra R2-00139: 网络抖动（短时间内多次断连/恢复）时，toast 提示经防抖收敛，
// 避免重复弹出“网络已断开/已恢复”打断用户；isOnline 状态更新保持即时。
const NETWORK_TOAST_DEBOUNCE_MS = 500;

/**
 * 网络状态变化 toast 提示（防抖包装，infra R2-00139）。
 */
const notifyNetworkToast = debounce((isConnected: boolean): void => {
  if (isConnected) {
    // 恢复：正向反馈，鼓励用户继续操作
    uni.showToast({
      title: "网络已恢复",
      icon: "success",
      duration: 1500,
    });
  } else {
    // 断网：友好提示，不阻塞用户操作
    uni.showToast({
      title: "网络已断开，请检查网络设置",
      icon: "none",
      duration: 2000,
    });
  }
}, NETWORK_TOAST_DEBOUNCE_MS);

/** 监听器是否已注册（避免重复注册） */
let listenerRegistered = false;
/** 已注册的监听器回调句柄（用于卸载） */
let registeredCallback: ((res: { isConnected: boolean; networkType: string }) => void) | null = null;

/**
 * 网络状态变化回调：更新全局状态并 toast 提示用户。
 *
 * 提示策略：
 * - 断网 → 「网络已断开」（2s，无图标，避免突兀）
 * - 恢复 → 「网络已恢复」（1.5s，success 图标，强化正向反馈）
 * - 仅在状态变化时提示，避免重复 toast
 *
 * @param res - uni 网络状态变化事件参数
 */
function handleNetworkStatusChange(res: { isConnected: boolean; networkType: string }): void {
  const wasOnline = isOnline.value;
  isOnline.value = res.isConnected;
  networkType.value = res.networkType;

  // 仅在状态真正变化时提示，避免重复 toast
  if (wasOnline === res.isConnected) return;

  // infra R2-00139: 提示经防抖收敛（状态更新已即时完成）
  notifyNetworkToast(res.isConnected);
}

/**
 * 主动获取当前网络状态，初始化 isOnline / networkType。
 *
 * 在监听器注册前调用一次，确保初始状态准确（避免默认 true 与实际不符）。
 */
function initNetworkStatus(): void {
  try {
    uni.getNetworkType({
      success: (res) => {
        networkType.value = res.networkType;
        // networkType 为 'none' 时表示无网络
        isOnline.value = res.networkType !== "none";
      },
      fail: () => {
        // 获取失败时保持默认值（online），避免误判
      },
    });
  } catch (_e) {
    // uni.getNetworkType 不存在时静默忽略
  }
}

/**
 * 注册全局网络状态监听器。
 *
 * 在 onLaunch 中调用，确保应用启动后立即开始监听。
 * 使用标志位避免重复注册（uni.onNetworkStatusChange 每次调用都会追加监听器）。
 */
function registerNetworkStatusListener(): void {
  if (listenerRegistered) return;

  // 兼容性检查：uni.onNetworkStatusChange 在极少数环境可能不存在
  if (typeof uni === "undefined" || typeof uni.onNetworkStatusChange !== "function") {
    return;
  }

  try {
    uni.onNetworkStatusChange(handleNetworkStatusChange);
    registeredCallback = handleNetworkStatusChange;
    listenerRegistered = true;
  } catch (_e) {
    // 注册失败时静默忽略，不影响应用启动
  }
}

/**
 * 卸载全局网络状态监听器。
 *
 * 通常在应用销毁时调用，但 uni-app 应用生命周期内一般不需要卸载。
 * 提供此函数主要用于测试与 HMR 场景。
 */
function unregisterNetworkStatusListener(): void {
  if (!listenerRegistered) return;
  if (registeredCallback && typeof uni !== "undefined" && typeof uni.offNetworkStatusChange === "function") {
    try {
      uni.offNetworkStatusChange(registeredCallback);
    } catch (_e) {
      // 卸载失败时静默忽略
    }
  }
  listenerRegistered = false;
  registeredCallback = null;
}

/**
 * 网络状态监听组合式函数。
 *
 * 在 App.vue 的 <script setup> 顶部调用一次即可：
 * - onLaunch 阶段：初始化网络状态 + 注册监听器
 * - 组件卸载时：可选卸载监听器（一般应用生命周期内不需要）
 * - 返回 isOnline / networkType 响应式引用，供页面消费
 *
 * @returns { isOnline, networkType } 响应式状态
 */
export function useNetworkStatus(): {
  isOnline: typeof isOnline;
  networkType: typeof networkType;
} {
  // onLaunch 在应用启动时触发，注册监听器
  onLaunch(() => {
    initNetworkStatus();
    registerNetworkStatusListener();
  });

  // 组件卸载时不主动 unregister，因为网络监听是全局的，应贯穿应用整个生命周期
  // 仅在 HMR 测试场景下才需要手动卸载（通过 unregisterNetworkStatusListener 导出）
  onUnmounted(() => {
    // 此处不卸载监听器，保持全局监听
  });

  return { isOnline, networkType };
}

export { unregisterNetworkStatusListener, registerNetworkStatusListener };
