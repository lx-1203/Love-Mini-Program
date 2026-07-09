import { isDev } from "../services/env";

export interface SessionAccessSnapshot {
  isLoggedIn: boolean;
  /**
   * 资料完善硬门槛（仅判定 profileCompleted）。
   *
   * 修复（P0 BUG）：与 profile-guard 的 `sessionStore.isProfileComplete` 判定保持一致，
   * 二者都仅检查 `profileCompleted`，避免出现 profile-guard 锁定但 session-guard 放行（或反之）的不一致。
   * campus/schedule 硬门槛由 `campusCompleted` / `scheduleCompleted` 字段独立控制。
   */
  profileCompleted: boolean;
  campusCompleted: boolean;
  scheduleCompleted: boolean;
  featureFlags: Record<string, boolean>;
}

export interface PageRequirements {
  requiresAuth: boolean;
  requiresProfile: boolean;
  requiresCampus: boolean;
  requiresSchedule: boolean;
  featureFlag?: string;
}

export interface AccessDecision {
  allowed: boolean;
  redirectTo?: string;
}

export function resolveSessionAccess(
  snapshot: SessionAccessSnapshot,
  requirements: PageRequirements
): AccessDecision {
  if (requirements.requiresAuth && !snapshot.isLoggedIn) {
    if (isDev) {
      console.debug("[session-guard] 拦截：未登录", { requirements });
    }
    return { allowed: false, redirectTo: "/pages/login/index" };
  }

  if (requirements.requiresProfile && !snapshot.profileCompleted) {
    if (isDev) {
      console.debug("[session-guard] 拦截：资料未完善", {
        requirements,
        profileCompleted: snapshot.profileCompleted,
      });
    }
    return {
      allowed: false,
      redirectTo: "/subpackages/setup/profile/index",
    };
  }

  if (requirements.requiresCampus && !snapshot.campusCompleted) {
    if (isDev) {
      console.debug("[session-guard] 拦截：校园未认证", {
        requirements,
        campusCompleted: snapshot.campusCompleted,
      });
    }
    return {
      allowed: false,
      redirectTo: "/subpackages/setup/campus/index",
    };
  }

  if (requirements.requiresSchedule && !snapshot.scheduleCompleted) {
    if (isDev) {
      console.debug("[session-guard] 拦截：课表未设置", {
        requirements,
        scheduleCompleted: snapshot.scheduleCompleted,
      });
    }
    return {
      allowed: false,
      redirectTo: "/subpackages/setup/schedule/index",
    };
  }

  if (requirements.featureFlag && !snapshot.featureFlags[requirements.featureFlag]) {
    if (isDev) {
      console.debug("[session-guard] 拦截：功能开关未开启", {
        requirements,
        featureFlag: requirements.featureFlag,
      });
    }
    return {
      allowed: false,
      redirectTo: "/pages/discover/index",
    };
  }

  if (isDev) {
    console.debug("[session-guard] 放行", { requirements, snapshot });
  }
  return { allowed: true };
}
