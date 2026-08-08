/**
 * 振动反馈工具
 * - H5 端：静默失败（uni.vibrateShort 在 H5 不支持，但不会抛错）
 * - mp-weixin 端：触发短振动（type 参数）
 * - App 端：触发短振动
 *
 * 用法：
 *   import { lightHaptic, mediumHaptic, successHaptic } from '@/utils/haptic';
 *   lightHaptic();        // 轻量振动（按钮点击）
 *   mediumHaptic();       // 中等振动（卡片切换）
 *   heavyHaptic();        // 重振动（飞出动画）
 *   successHaptic();      // 成功振动（签到成功、匹配成功）
 */

// 统一常量：振动反馈间隔
import { HAPTIC_INTERVAL_MS } from "../constants/ui";

/** 振动强度枚举（与 mp-weixin / App 平台 type 参数对齐） */
type VibrateIntensity = "light" | "medium" | "heavy";

/**
 * 待执行的振动反馈定时器集合。
 *
 * 修复（Task 18.6）：原 successHaptic / errorHaptic 内的 setTimeout 未保存 timer 引用，
 * 在页面 onUnload 或组件卸载时无法 clearTimeout，导致：
 * 1. 离开页面后仍触发振动，造成用户体验割裂
 * 2. 组件卸载后回调执行可能访问已释放上下文
 * 现保存到模块级 Set，在回调触发时自动从集合中移除，
 * 并提供 clearAllHapticTimers 供页面 onUnload 主动清理。
 */
const pendingHapticTimers: Set<ReturnType<typeof setTimeout>> = new Set();

/**
 * 清理所有待执行的振动反馈定时器。
 *
 * 使用场景：页面 onUnload 或组件 unmount 时调用，避免离开页面后仍触发振动。
 * 多次调用安全：集合为空时为空操作。
 */
export function clearAllHapticTimers(): void {
  pendingHapticTimers.forEach((timer) => clearTimeout(timer));
  pendingHapticTimers.clear();
}

/**
 * 注册一个延迟执行的振动回调，并将 timer 加入待清理集合。
 *
 * @param callback - 延迟后执行的振动回调
 * @returns setTimeout 返回的 timer 引用（已加入 pendingHapticTimers）
 */
function scheduleHaptic(callback: () => void): ReturnType<typeof setTimeout> {
  const timer = setTimeout(() => {
    pendingHapticTimers.delete(timer);
    try {
      callback();
    } catch (_e) {
      // 静默处理：振动失败不应影响业务流程
    }
  }, HAPTIC_INTERVAL_MS);
  pendingHapticTimers.add(timer);
  return timer;
}

/**
 * 触发一次短振动（带类型强度）。
 *
 * 2026-08-08 产品要求：全站禁用震动。保留函数签名（40+ 文件 import），
 * 实现直接返回 no-op，避免点赞/收藏/评论等互动操作触发震动。
 * 若后续需要恢复，删除下方 return 即可（H5 端本身静默失败）。
 *
 * @param intensity - 振动强度：light / medium / heavy（已禁用，不生效）
 */
function vibrateWithType(_intensity: VibrateIntensity): void {
  // 2026-08-08 产品要求禁用震动：直接返回，不触发 uni.vibrateShort
  return;
}

/**
 * 轻量振动：按钮点击、Tab 切换。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function lightHaptic(): void {
  vibrateWithType("light");
}

/**
 * 中等振动：卡片切换、滑动操作。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function mediumHaptic(): void {
  vibrateWithType("medium");
}

/**
 * 重振动：飞出动画触发。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function heavyHaptic(): void {
  vibrateWithType("heavy");
}

/**
 * 成功振动：签到成功、匹配成功（连续两次轻振动）。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function successHaptic(): void {
  lightHaptic();
  // 修复（Task 18.6）：使用 scheduleHaptic 保存 timer 引用，
  // 支持页面 onUnload 时通过 clearAllHapticTimers 主动清理
  scheduleHaptic(() => lightHaptic());
}

/**
 * 错误振动：操作失败、网络异常（中等振动 + 轻振动）。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function errorHaptic(): void {
  // Task 35：平台判断收敛到 vibrateWithType 内部的 supportsHapticFeedback() 检查
  vibrateWithType("medium");
  // 修复（Task 18.6）：使用 scheduleHaptic 保存 timer 引用，
  // 支持页面 onUnload 时通过 clearAllHapticTimers 主动清理
  scheduleHaptic(() => vibrateWithType("light"));
}
