/**
 * 社交升温引导工具函数
 *
 * 提取自 SocialOnboardingOverlay.vue，解决 Uni-app SFC 编译丢失命名导出的问题。
 */
import { STORAGE_KEYS } from '../../config/app';

/**
 * 检查用户是否已看过引导
 */
export function hasSeenOnboarding(): boolean {
  try {
    const stored = uni.getStorageSync(STORAGE_KEYS.SOCIAL_ONBOARDING_SEEN);
    return stored === 'true' || stored === true;
  } catch (_e) {
    return false;
  }
}

/**
 * 标记用户已看过引导
 */
export function markOnboardingSeen(): void {
  try {
    uni.setStorageSync(STORAGE_KEYS.SOCIAL_ONBOARDING_SEEN, 'true');
  } catch (_e) {
    // 静默处理存储失败
  }
}
