import { useSessionStore } from "../stores/session";
import { isDev } from "../services/env";

/**
 * 需要资料完善才能访问的页面路径列表
 *
 * 修复（P0 BUG）：原列表包含 `/pages/profile/index`，与 page-access.ts 中
 * `profilePageRequirements.requiresProfile = false` 不一致，导致我的页面在资料完善后
 * 仍被 profile-guard 拦截。现移除 `/pages/profile/index`，让用户随时可查看自己的资料卡片。
 * likes/village/messages 仍受资料完善硬门槛保护。
 */
export const LOCKED_PAGES = [
  "/pages/likes/index",
  "/pages/village/index",
  "/pages/messages/index",
];

/**
 * 锁定页面路径 → 功能名称映射
 *
 * Phase 4 任务 20：用于解锁引导弹窗的文案展示，让用户知道被锁定的具体功能。
 */
const FEATURE_NAME_MAP: Record<string, string> = {
  "/pages/likes/index": "喜欢列表",
  "/pages/village/index": "村口/讨论圈",
  "/pages/messages/index": "消息",
};

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
 * 获取锁定页面对应的功能名称
 * @param pagePath - 页面路径
 * @returns 功能名称（未匹配时返回 undefined）
 */
export function getFeatureName(pagePath: string): string | undefined {
  const normalized = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return FEATURE_NAME_MAP[normalized];
}

/**
 * 获取锁定页面的重定向目标
 * @returns 资料完善页路径
 *
 * 注意：Phase 4 任务 20 起，resolveProfileGuard 不再返回 redirectTo，
 * 改为返回 shouldShowModal=true 让调用方弹出 UnlockGuideModal。
 * 此函数保留供 confirm() 跳转使用，避免破坏既有引用。
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
 *
 * Phase 4 任务 20：移除 redirectTo，改为 shouldShowModal + featureName
 * 让调用方通过 UnlockGuideModal 进行友好引导，而非静默重定向。
 */
export interface ProfileGuardDecision {
  allowed: boolean;
  /** 是否需要展示解锁引导弹窗（替代静默重定向） */
  shouldShowModal?: boolean;
  /** 当前完善度百分比 */
  completionPercent: number;
  /** 锁定功能名称（用于弹窗文案，未锁定页面返回 undefined） */
  featureName?: string;
}

/**
 * 解析页面访问权限（资料完善硬门槛）
 * @param pagePath - 目标页面路径
 * @returns 访问决策
 */
export function resolveProfileGuard(pagePath: string): ProfileGuardDecision {
  const sessionStore = useSessionStore();
  const completionPercent = sessionStore.profileCompletion;
  const isProfileComplete = sessionStore.isProfileComplete;
  const locked = isPageLocked(pagePath);
  const featureName = getFeatureName(pagePath);

  // 如果资料已完善，直接放行
  if (isProfileComplete) {
    if (isDev) {
      console.debug("[profile-guard] 放行（资料已完善）:", {
        pagePath,
        completionPercent,
      });
    }
    return { allowed: true, completionPercent };
  }

  // 如果页面不在锁定列表中，放行
  if (!locked) {
    if (isDev) {
      console.debug("[profile-guard] 放行（页面未锁定）:", {
        pagePath,
        completionPercent,
        isProfileComplete,
      });
    }
    return { allowed: true, completionPercent };
  }

  // 拦截并返回 shouldShowModal=true，由调用方弹出 UnlockGuideModal 引导
  // 不再静默重定向到 setup 页，避免用户体验突兀
  if (isDev) {
    console.debug("[profile-guard] 拦截并请求展示弹窗:", {
      pagePath,
      isProfileComplete,
      completionPercent,
      featureName,
    });
  }
  return {
    allowed: false,
    shouldShowModal: true,
    featureName,
    completionPercent,
  };
}