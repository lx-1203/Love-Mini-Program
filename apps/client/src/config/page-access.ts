import type { PageRequirements } from "../guards/session-guard";

/**
 * 页面访问策略（2026-08-24 调整，commit 19e8f97 重新应用）：
 * - 寻觅（discover）：免登录可逛，登录后可互动；
 * - 圈子（village）：免登录可浏览社区与活动；
 * - 我的（profile）：可进入查看，编辑类功能登录后可用；
 * - 喜欢 / 消息 / 聊天：需要登录即可访问（不再强制要求资料完善）。
 *   资料完善硬门槛由 guards/profile-guard 的 LOCKED_PAGES + UnlockGuideModal 承接。
 * - 帮助/FAQ（help）：免登录可看（纯静态文案），登录门槛下移到两个 CTA 的目标页。
 */
export const discoverPageRequirements: PageRequirements = {
  requiresAuth: false,
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
  requiresAuth: false,
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
  requiresAuth: false,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

export const chatPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

/**
 * 帮助与客服页（subpackages/tools/help）· R7 裁定「页面放开、点击时再拦」。
 *
 * 为什么必须是一枚**独立**的要求而不是复用 chatPageRequirements：
 * 复用正是本次缺陷的根因 —— 帮助页内容全是静态 i18n FAQ（6 组问答）+ 常量客服邮箱，
 * 零用户数据，却因为它借了聊天页那枚 `requiresAuth: true` 而被当成受保护页取景，
 * R6 实测两帧 landingMismatch（已登录身份进帮助页，落点仍是 pages/login/index）。
 *
 * 门槛没有消失，只是挪到了它该在的位置（两个 CTA 的目标页各自把关）：
 * - 在线客服 → subpackages/chat/official-chat：本页声明 `officialChatRequirements`
 *   （requiresAuth:true）+ 页内 `LockScreen v-if="!isUnlocked"`，未登录点进去先看锁屏引导；
 * - 意见反馈 → subpackages/profile-extra/feedback/history：该页**没有** usePageAccess，
 *   门槛在数据层 —— onShow 即拉取个人反馈记录，401 由 services/http 的 redirectToLogin()
 *   弹「请先登录」并 reLaunch 登录页（在册口径 family=guide-401，
 *   见 scripts/qa/guest-landing-policy.json 该页那一行）。
 */
export const helpPageRequirements: PageRequirements = {
  requiresAuth: false,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};
