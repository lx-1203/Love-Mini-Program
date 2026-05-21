export interface SessionAccessSnapshot {
  isLoggedIn: boolean;
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
    return { allowed: false, redirectTo: "/pages/login/index" };
  }

  if (requirements.requiresProfile && !snapshot.profileCompleted) {
    return {
      allowed: false,
      redirectTo: "/subpackages/setup/profile/index",
    };
  }

  if (requirements.requiresCampus && !snapshot.campusCompleted) {
    return {
      allowed: false,
      redirectTo: "/subpackages/setup/campus/index",
    };
  }

  if (requirements.requiresSchedule && !snapshot.scheduleCompleted) {
    return {
      allowed: false,
      redirectTo: "/subpackages/setup/schedule/index",
    };
  }

  if (requirements.featureFlag && !snapshot.featureFlags[requirements.featureFlag]) {
    return {
      allowed: false,
      redirectTo: "/pages/home/index",
    };
  }

  return { allowed: true };
}
