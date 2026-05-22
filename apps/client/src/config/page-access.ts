import type { PageRequirements } from "../guards/session-guard";

export const discoverPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const likesPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const villagePageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const messagesPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const profilePageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

/** @deprecated 旧首页配置，待移除 */
export const homePageRequirements: PageRequirements = discoverPageRequirements;

/** @deprecated 旧聊天页配置，待移除 */
export const chatPageRequirements: PageRequirements = messagesPageRequirements;
