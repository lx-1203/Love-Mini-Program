/**
 * 管理后台 - 反馈管理 API 封装。
 *
 * 对应后端：com.campuslove.api.feedback.FeedbackController#listAdminFeedback
 * 接口路径：GET /api/admin/feedback
 *
 * SubTask 1.3.1：替代 Feedback.vue 中的 mockFeedback 假数据，
 * 统一通过此模块接入真实后端 API。
 */

import { get } from "./http";

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
  return get<FeedbackRecordView[]>("/admin/feedback");
}
