import type { PageRequirements } from "../guards/session-guard";

/**
 * 页面访问策略（2026-08-07 链路调整）：
 * - 寻觅（discover）：免登录可逛，登录后可互动（推荐数据登录后更完整）；
 * - 圈子（village）：免登录可浏览社区与活动，仅校园认证类功能需要认证；
 * - 我的（profile）：可进入查看（页内引导完善资料），编辑类功能登录后可用；
 * - 喜欢 / 消息 / 聊天：需要登录且有资料后可用（涉及匹配与身份互动）。
 */
export const discoverPageRequirements: PageRequirements = {
  requiresAuth: false,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const likesPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: false,
  requiresSchedule: false,
};

export const villagePageRequirements: PageRequirements = {
  requiresAuth: false,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const messagesPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: false,
  requiresSchedule: false,
};

export const profilePageRequirements: PageRequirements = {
  requiresAuth: false,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const chatPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: false,
  requiresSchedule: false,
};
