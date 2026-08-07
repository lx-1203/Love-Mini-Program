/**
 * 管理后台 - 反馈管理 API 封装（Task 13 真实数据接入）。
 *
 * 对应后端：
 *   - com.campuslove.api.feedback.FeedbackController#listAdminFeedback
 *     接口路径：GET /api/v1/admin/feedback
 *   - 回复/标记已处理：PUT /api/v1/admin/feedback/{id}/reply（已实现，
 *     见 FeedbackController#replyFeedback）
 *
 * Task 13 改造点：
 * - 修正路径前缀：旧代码 "/admin/feedback" 实际命中 /api/admin/feedback（404），
 *   改为 "/v1/admin/feedback" 与后端 @GetMapping("/api/v1/admin/feedback") 对齐
 * - 新增 replyFeedback(id, content)：调用 PUT /v1/admin/feedback/{id}/reply，
 *   用于替换 Feedback.vue 中纯前端状态更新的 Mock 行为
 * - 移除所有 Mock 引用（本文件本无 Mock）
 */

import { get, put } from "./http";

/** 反馈类型（对应后端 FeedbackTicketType 枚举） */
export type FeedbackTicketType = "FEEDBACK" | "SUGGESTION" | "ACTIVITY_PROPOSAL";

/** 反馈状态（对应后端 SubmissionStatus 枚举） */
export type SubmissionStatus =
  | "SUBMITTED"
  | "PROCESSING"
  | "REVIEWED"
  | "PLANNED"
  | "CONVERTED";

/** 反馈列表项视图（对应后端 SubmissionRecordView record） */
export interface FeedbackRecordView {
  id: number;
  type: FeedbackTicketType;
  title: string;
  status: SubmissionStatus;
  latestReplySummary: string | null;
  submittedAt: string;
  convertedActivityId: number | null;
}

/**
 * 拉取全部用户反馈（不含活动提案）。
 *
 * 后端会按 createdAt 降序返回，仅返回 FEEDBACK / SUGGESTION 类型。
 * 失败时由 http 层抛出 ApiError，调用方在 catch 中处理。
 */
export function listAdminFeedback(): Promise<FeedbackRecordView[]> {
  return get<FeedbackRecordView[]>("/v1/admin/feedback");
}

/**
 * 回复/标记反馈为已处理（Task 13 新增）。
 *
 * 调用 PUT /api/v1/admin/feedback/{id}/reply，将反馈状态推进至 REVIEWED，
 * 并记录回复摘要。
 *
 * @param id      反馈记录 ID
 * @param reply   回复内容（非空，由调用方保证）
 * @returns 更新后的反馈记录（状态为 REVIEWED，latestReplySummary 已刷新）
 */
export function replyFeedback(
  id: number,
  reply: string
): Promise<FeedbackRecordView> {
  // infra R2-00467：id 为 number，encodeURIComponent 无实际作用，简化调用
  return put<FeedbackRecordView>(
    `/v1/admin/feedback/${id}/reply`,
    { reply }
  );
}
