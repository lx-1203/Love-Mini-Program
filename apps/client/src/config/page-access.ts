import type { PageRequirements } from "../guards/session-guard";

/**
 * 页面访问策略（2026-08-24 调整，commit 19e8f97 重新应用）：
 * - 寻觅（discover）：免登录可逛，登录后可互动；
 * - 圈子（village）：免登录可浏览社区与活动；
 * - 我的（profile）：可进入查看，编辑类功能登录后可用；
 * - 喜欢 / 消息 / 聊天：需要登录即可访问（不再强制要求资料完善）。
 *   资料完善硬门槛由 guards/profile-guard 的 LOCKED_PAGES + UnlockGuideModal 承接。
 * - 帮助/FAQ（help）：免登录可看（纯静态文案），登录门槛下移到两个 CTA 的目标页。
 * - 账号安全中心（tools/security）/ 我的钱包（market/wallet）：**需要登录**，且游客档必须在
 *   页面入口被守卫先行处置（见 securityCenterPageRequirements / walletPageRequirements）。
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

/**
 * 「我的」Tab 页（pages/profile/index）的访问要求：**免登录可进入查看**。
 *
 * ⚠️ 这一枚描述的是 Tab 页本身，不是「账号安全中心」。
 * P2/P1 审计（2026-10-31）实测到的缺陷正是**复用**：subpackages/tools/security/index.vue
 * 借了这一枚 `requiresAuth: false`，于是账号安全中心在配置层被当成免登录页 ——
 * 设备列表 GET /auth/devices 照发、「更换手机号 / 注销账号」照渲染，游客一直停在页上
 * 直到 HTTP 401 兜底才把人弹走。与本页 helpPageRequirements 的判例同一回事：
 * **一码一页，不复用**。安全中心请用 securityCenterPageRequirements。
 */
export const profilePageRequirements: PageRequirements = {
  requiresAuth: false,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

/**
 * 账号安全中心（subpackages/tools/security/index）· P1 修复新增。
 *
 * 页内全部控件都是账号级动作（改绑手机号 / 改密码 / 设备下线 / 注销账号），
 * 数据侧 GET /auth/devices 必 401 ⇒ requiresAuth 必须为真。
 * 但**光是设成 true 拦不住游客**：composables/usePageAccess.ts:79 对「本地无 token 的游客」
 * 是故意放行的（引导由页内 LockScreen 承担，本页没有），所以游客档必须由页面入口的
 * guards/guest-access.ts#guideGuestToLogin() 在**发任何请求之前**处置（guard-then-fetch），
 * 判点见 src/tests/pages/wallet-security-guest-gate.spec.ts，在册落点见
 * scripts/qa/guest-landing-policy.json 里 family=guard-bounce 的两行。
 */
export const securityCenterPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};

/**
 * 我的钱包（subpackages/market/wallet/index）· P1 修复新增。
 *
 * 余额（GET /wallet/balance）与流水（GET /wallet/transactions）都是个人数据，
 * 本页此前**压根没有** usePageAccess，游客点进来就是两个必 401 的请求 + 一次 reLaunch。
 * 门槛口径与 securityCenterPageRequirements 同一套（requiresAuth:true + 入口守卫先行）。
 */
export const walletPageRequirements: PageRequirements = {
  requiresAuth: true,
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
