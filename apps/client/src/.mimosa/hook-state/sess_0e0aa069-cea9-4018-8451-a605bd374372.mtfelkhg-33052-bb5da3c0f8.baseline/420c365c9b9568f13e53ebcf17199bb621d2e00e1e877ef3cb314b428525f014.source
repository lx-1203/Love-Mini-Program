/**
 * 振动反馈工具（2026-08-08 起全站禁用震动）
 *
 * 背景：产品要求全站禁用震动。保留函数签名（53 个文件 import 本模块），
 * 实现统一为 no-op（vibrateWithType 直接返回，不触发 uni.vibrateShort）。
 * 若后续需要恢复，恢复 vibrateWithType 内部实现即可（H5 端本身静默失败）。
 *
 * 用法：
 *   import { lightHaptic, mediumHaptic, successHaptic } from '@/utils/haptic';
 *   lightHaptic();        // 轻量振动（按钮点击）
 *   mediumHaptic();       // 中等振动（卡片切换）
 *   heavyHaptic();        // 重振动（飞出动画）
 *   successHaptic();      // 成功振动（签到成功、匹配成功）
 */

/** 振动强度枚举（与 mp-weixin / App 平台 type 参数对齐；禁用期不生效） */
type VibrateIntensity = "light" | "medium" | "heavy";

/**
 * 触发一次短振动（带类型强度）。
 *
 * R4-00224：2026-08-08 产品要求全站禁用震动——实现直接返回 no-op；
 * 同时移除原 successHaptic/errorHaptic 的延迟定时器调度（禁用期纯属浪费，
 * 且原注释声称收敛到 supportsHapticFeedback 检查实际并未调用）。
 */
function vibrateWithType(_intensity: VibrateIntensity): void {
  // 产品要求禁用震动：直接返回，不触发 uni.vibrateShort
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
 * 成功振动：签到成功、匹配成功。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function successHaptic(): void {
  lightHaptic();
}

/**
 * 错误振动：操作失败、网络异常。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function errorHaptic(): void {
  vibrateWithType("medium");
}
