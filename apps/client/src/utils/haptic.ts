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

/**
 * 带类型强度的短振动参数。
 *
 * uni-app 官方类型 `VibrateShortOptions` 未声明 `type` 字段，
 * 但 mp-weixin / App 平台实际支持 `type: 'light' | 'medium' | 'heavy'`，
 * 此处通过接口扩展补齐字段，避免使用 `as any` 绕过类型检查。
 */
interface TypedVibrateShortOptions extends UniApp.VibrateShortOptions {
  type?: "light" | "medium" | "heavy";
}

/** 振动强度枚举（与 mp-weixin / App 平台 type 参数对齐） */
type VibrateIntensity = "light" | "medium" | "heavy";

/**
 * 触发一次短振动（带类型强度）。
 *
 * H5 端 `uni.vibrateShort` 不支持 `type` 参数或不存在，调用会静默失败；
 * mp-weixin / App 端按 type 触发对应强度的短振动。
 *
 * @param intensity - 振动强度：light / medium / heavy
 */
function vibrateWithType(intensity: VibrateIntensity): void {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  try {
    uni.vibrateShort({ type: intensity } as TypedVibrateShortOptions);
  } catch (_e) {
    // 静默失败：H5 端不支持 type 参数或 uni.vibrateShort 不存在
  }
  // #endif
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
  setTimeout(() => lightHaptic(), 100);
}

/**
 * 错误振动：操作失败、网络异常（中等振动 + 轻振动）。
 *
 * @returns 无返回值；调用失败时静默忽略。
 */
export function errorHaptic(): void {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  try {
    vibrateWithType("medium");
    setTimeout(() => vibrateWithType("light"), 100);
  } catch (_e) {
    // 静默失败：H5 端不支持 type 参数或 uni.vibrateShort 不存在
  }
  // #endif
}
