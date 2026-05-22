import { useSessionStore } from "../stores/session";

/**
 * 需要资料完善才能访问的页面路径列表
 */
export const LOCKED_PAGES = [
  "/pages/likes/index",
  "/pages/village/index",
  "/pages/messages/index",
  "/pages/profile/index",
];

/**
 * 检查指定页面是否需要资料完善硬门槛
 * @param pagePath - 页面路径
 * @returns 是否需要锁定
 */
export function isPageLocked(pagePath: string): boolean {
  const normalized = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return LOCKED_PAGES.some((path) => normalized === path);
}

/**
 * 获取锁定页面的重定向目标
 * @returns 资料完善页路径
 */
export function getProfileSetupPath(): string {
  return "/subpackages/setup/profile/index";
}

/**
 * 检查当前用户是否满足资料完善硬门槛
 * @returns 是否已完善
 */
export function checkProfileGuard(): boolean {
  const sessionStore = useSessionStore();
  return sessionStore.isProfileComplete;
}

/**
 * 页面访问决策
 */
export interface ProfileGuardDecision {
  allowed: boolean;
  redirectTo?: string;
  /** 当前完善度百分比 */
  completionPercent: number;
}

/**
 * 解析页面访问权限（资料完善硬门槛）
 * @param pagePath - 目标页面路径
 * @returns 访问决策
 */
export function resolveProfileGuard(pagePath: string): ProfileGuardDecision {
  const sessionStore = useSessionStore();
  const completionPercent = sessionStore.profileCompletion;

  // 如果资料已完善，直接放行
  if (sessionStore.isProfileComplete) {
    return { allowed: true, completionPercent };
  }

  // 如果页面不在锁定列表中，放行
  if (!isPageLocked(pagePath)) {
    return { allowed: true, completionPercent };
  }

  // 拦截并重定向到资料完善页
  return {
    allowed: false,
    redirectTo: getProfileSetupPath(),
    completionPercent,
  };
}
