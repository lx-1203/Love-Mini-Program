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

/** 轻量振动：按钮点击、Tab 切换 */
export function lightHaptic(): void {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  try {
    uni.vibrateShort({ type: 'light' } as any);
  } catch (_e) {
    // 静默失败：H5 端不支持 type 参数或 uni.vibrateShort 不存在
  }
  // #endif
}

/** 中等振动：卡片切换、滑动操作 */
export function mediumHaptic(): void {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  try {
    uni.vibrateShort({ type: 'medium' } as any);
  } catch (_e) {
    // 静默失败
  }
  // #endif
}

/** 重振动：飞出动画触发 */
export function heavyHaptic(): void {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  try {
    uni.vibrateShort({ type: 'heavy' } as any);
  } catch (_e) {
    // 静默失败
  }
  // #endif
}

/** 成功振动：签到成功、匹配成功（连续两次轻振动） */
export function successHaptic(): void {
  lightHaptic();
  setTimeout(() => lightHaptic(), 100);
}
