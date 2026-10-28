/**
 * 通知点击落点（2026-10-28 通知中心）。
 *
 * 只根据后端下发的 type/referenceType/referenceId 计算，不猜业务状态：
 * - topic / comment（当前 comment 仅用于圈子回复提及）→ 话题详情
 * - post → 帖子详情
 * - 喜欢/访客 → 喜欢与访客页
 * - 匹配 → 消息 tab
 * 其余通知只标记已读，不强制跳转。
 */
import { ROUTES } from "../constants/routes";

export interface NotificationTargetInput {
  type: string;
  referenceType?: string | null;
  referenceId?: string | null;
  /** 客户端 SystemNotification 的字段名（后端 referenceId 映射而来） */
  resourceId?: string | null;
}

export function resolveNotificationTarget(item: NotificationTargetInput): string | null {
  const rawId = item.referenceId ?? item.resourceId ?? "";
  const referenceId = rawId ? String(rawId) : "";
  if (referenceId && (item.referenceType === "topic" || item.referenceType === "comment")) {
    return `${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=${encodeURIComponent(referenceId)}`;
  }
  if (referenceId && item.referenceType === "post") {
    return `${ROUTES.VILLAGE.DETAIL}?id=${encodeURIComponent(referenceId)}`;
  }
  if (item.type === "visitor" || item.type === "interaction_like" || item.type === "like") {
    return ROUTES.LIKES.VISITORS_LIKES;
  }
  if (item.type === "match" || item.type === "interaction_match") {
    return ROUTES.TAB.CHAT;
  }
  return null;
}
