/**
 * 官方助手待消费通知（本地 mock 存储）。
 *
 * P8-2.3：活动详情页报名成功后，将一条「活动报名成功」助手消息写入本地会话存储；
 * 寻觅助手会话页（official-chat）加载时读取并消费，展示为一条可点击回活动详情的消息。
 *
 * 使用 uni storage（JSON 数组），mock 模式专用契约（读失败/类型不符时静默清空兜底）。
 */
import type { OfficialMessageView } from "../services/generated/api-types-supplement";

/** 存储 key（本地 mock 会话存储） */
export const ASSISTANT_ACTIVITY_NOTIFY_KEY = "campus-love:assistant-activity-notify";

/** 读取当前待消费的助手消息列表（可空） */
function readNotifies(): OfficialMessageView[] {
  try {
    const raw = uni.getStorageSync(ASSISTANT_ACTIVITY_NOTIFY_KEY);
    if (Array.isArray(raw)) {
      return raw as OfficialMessageView[];
    }
  } catch (_e) {
    // 读取失败按空处理
  }
  return [];
}

/**
 * 追加一条待消费的助手消息（报名成功通知）。
 *
 * @param msg - 待消费的官方助手消息（text / card 均可）
 */
export function appendAssistantActivityNotify(msg: OfficialMessageView): void {
  try {
    const list = readNotifies();
    list.push(msg);
    uni.setStorageSync(ASSISTANT_ACTIVITY_NOTIFY_KEY, list);
  } catch (_e) {
    // 存储失败静默（仅丢失本次通知，不阻断报名主流程）
  }
}

/**
 * 读取并清除所有待消费的助手消息。
 *
 * 会议页在 loadOfficialChat 的 mock 分支调用一次：取走待消费列表后清空，
 * 避免下次进入重复展示同一批通知（即读即清）。
 *
 * @returns 待消费的助手消息列表
 */
export function consumeAssistantActivityNotifies(): OfficialMessageView[] {
  const list = readNotifies();
  if (list.length > 0) {
    try {
      uni.removeStorageSync(ASSISTANT_ACTIVITY_NOTIFY_KEY);
    } catch (_e) {
      // 清除失败静默，列表本轮仍返回（下一次消费可能重现，可接受）
    }
  }
  return list;
}