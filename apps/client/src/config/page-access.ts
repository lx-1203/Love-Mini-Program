```typescript
import type { PageRequirements } from "../guards/session-guard";

/**
 * 页面访问策略（2026-08-24 调整）：
 * - 寻觅（discover）：免登录可逛，登录后可互动；
 * - 圈子（village）：免登录可浏览社区与活动；
 * - 我的（profile）：可进入查看，编辑类功能登录后可用；
 * - 喜欢 / 消息 / 聊天：需要登录即可访问（不再强制要求资料完善）。
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
```
