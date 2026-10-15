/**
 * 管理后台 - 反馈管理 API 封装。
 *
 * 后端有两组 admin 反馈端点，本文件同时覆盖：
 *
 * 一、「分页工单」组（首选，2026.10.14 新增，本文件已消费）
 *   com.campuslove.api.admin.AdminFeedbackController
 *   类级 @RequestMapping("/api/v1/admin/feedback/tickets")（:72），因此：
 *     - GET  /api/v1/admin/feedback/tickets                分页列表（AdminFeedbackController#listTickets，:97）
 *     - POST /api/v1/admin/feedback/tickets/{id}/handle    处理工单（#handleTicket，:163）
 *   响应形态：**直出（FLAT）**，无 {code,message,data} 信封。
 *     GET 直接返回 AdminPageView<AdminFeedbackView> record（:144），
 *     POST 返回 ResponseEntity.ok(AdminFeedbackView.of(...))（:186）；
 *     全局无 ResponseBodyAdvice（仅 GlobalExceptionHandler 一个 @RestControllerAdvice），
 *     而 http.ts 的 request() 原样 JSON.parse 返回、不解包（http.ts:404-413），
 *     所以调用点拿到的就是 {items,total,page,pageSize,totalPages} 本体。
 *   权限：类级 @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')")（:73）为深度防御，
 *     URL 层先按方法分级（SecurityConfig:189-197）——
 *     GET → ADMIN / SUPER_ADMIN / AUDITOR 均可读；
 *     POST/PUT/PATCH/DELETE → 仅 ADMIN / SUPER_ADMIN，AUDITOR 在 URL 层即 403。
 *     视图侧写控件统一用 sessionStore.canWrite 开关，不在组件内比较 role 字符串。
 *   幂等：两个方法**均未**标注 @Idempotent，IdempotentInterceptor 在无注解时直接放行
 *     （IdempotentInterceptor:130-132），故 POST 不要求 Idempotency-Key（缺失不会 422/400）；
 *     http.ts 仍对所有非 GET 写请求注入 Idempotency-Key（http.ts:363-366），两条路都不受影响。
 *   校区隔离：列表按提交人所属校区过滤（校区管理员/有校区的 AUDITOR 强制限定，
 *     SUPER_ADMIN 或无校区 ADMIN 可读全部并用 campusName 参数筛选）；处理时越权抛 403。
 *
 * 二、「裸列表」旧组（保留导出，兼容既有调用点，勿在新代码中使用）
 *   - GET /api/v1/admin/feedback
 *       com.campuslove.api.feedback.FeedbackController#listAdminFeedback（:110-113）
 *       ⚠ 返回不分页的全量数组，只含 FEEDBACK / SUGGESTION，不含 ACTIVITY_PROPOSAL，
 *         且不含校区数据隔离。同样是直出形态（List<SubmissionRecordView>）。
 *   - PUT /api/v1/admin/feedback/{id}/reply
 *       FeedbackController#replyFeedback（:125-131）：状态固定推进为 REVIEWED 并写回复摘要，
 *       方法层 @PreAuthorize("hasRole('ADMIN')")（比工单端点更严：SUPER_ADMIN 也会 403）。
 *       与工单 handle 的行为差异见下方 handleFeedbackTicket 注释。
 */

import { AdminPageView, get, post, put } from "./http";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";

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
 * 反馈工单视图（对应后端 AdminFeedbackController.AdminFeedbackView record）。
 *
 * 字段与旧 SubmissionRecordView 并**不完全同名**：
 * - 多出 userId（提交人，校区隔离口径即取它的所属校区）；
 * - 没有 convertedActivityId（活动提案转活动仍走旧 POST /v1/admin/activity-proposals/{id}/convert）；
 * - type / status 为枚举名字符串，submittedAt 是后端 LocalDateTime.toString() 的 ISO 形态字符串。
 */
export interface FeedbackTicketView {
  id: number;
  /** 提交人用户 ID */
  userId: number;
  type: FeedbackTicketType;
  title: string;
  status: SubmissionStatus;
  /** 最新回复摘要（未回复时后端返回 null） */
  latestReplySummary: string | null;
  /** 提交时间（后端 createdAt 的字符串形态） */
  submittedAt: string;
}

/**
 * 工单列表查询参数（与 listTickets 的 @RequestParam 一一对应）。
 * page 为 1-based；pageSize 后端收敛到 [1,100]，默认 20。
 */
export interface FeedbackTicketListQuery {
  /** 状态筛选；null/空白/非法值后端一律视为「不限制」（parseEnum 宽松解析） */
  status?: SubmissionStatus | "";
  /** 类型筛选；同上 */
  type?: FeedbackTicketType | "";
  /** 校区筛选（按提交人所属校区）；校区管理员/审核员会被强制限定，本参数被忽略 */
  campusName?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 工单处理请求体（对应 AdminFeedbackController.AdminFeedbackHandleRequest record）。
 * status 必填（后端 @NotNull），非法枚举值会在反序列化阶段 400。
 */
export interface FeedbackTicketHandleRequest {
  status: SubmissionStatus;
  /**
   * 回复摘要，可空；非空时写入 feedback_tickets.latest_reply_summary。
   * ⚠ 后端**不做截断**（列长度 512），传超长文本会得到 500；
   *   旧 PUT .../reply 走 FeedbackService 会截到 200+「…」并刷新 updatedAt，
   *   handle 端点不截断也不显式刷新 updatedAt —— 输入侧请用 REMARK_MAX_LENGTH(500) 约束。
   */
  replySummary?: string;
}

/** 状态筛选下拉选项（labelKey 复用 feedback.status* 文案） */
export const FEEDBACK_TICKET_STATUSES: { value: SubmissionStatus; labelKey: string }[] = [
  { value: "SUBMITTED", labelKey: "feedback.statusSubmitted" },
  { value: "PROCESSING", labelKey: "feedback.statusProcessing" },
  { value: "REVIEWED", labelKey: "feedback.statusReviewed" },
  { value: "PLANNED", labelKey: "feedback.statusPlanned" },
  { value: "CONVERTED", labelKey: "feedback.statusConverted" },
];

/** 类型筛选下拉选项（labelKey 复用 feedback.type* 文案） */
export const FEEDBACK_TICKET_TYPES: { value: FeedbackTicketType; labelKey: string }[] = [
  { value: "FEEDBACK", labelKey: "feedback.typeFeedback" },
  { value: "SUGGESTION", labelKey: "feedback.typeSuggestion" },
  { value: "ACTIVITY_PROPOSAL", labelKey: "feedback.typeActivityProposal" },
];

/**
 * 分页查询反馈工单（首选列表接口）。
 *
 * GET /api/v1/admin/feedback/tickets
 * 返回直出 AdminPageView（get 不解包），空结果时 items 为 []、total 为 0。
 * 失败由 http 层抛 ApiError，调用方在 catch 中处理。
 */
export function listFeedbackTickets(
  query: FeedbackTicketListQuery = {}
): Promise<AdminPageView<FeedbackTicketView>> {
  return get<AdminPageView<FeedbackTicketView>>("/v1/admin/feedback/tickets", {
    status: query.status,
    type: query.type,
    campusName: query.campusName,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 处理反馈工单（首选写接口，带 @Auditable(HANDLE_FEEDBACK) 审计）。
 *
 * POST /api/v1/admin/feedback/tickets/{id}/handle
 * 返回处理后的工单视图（直出 AdminFeedbackView）；工单不存在时后端 404（http 层抛 ApiError）。
 * 越权处理他人校区工单 → 403；AUDITOR 角色在 URL 层即被拦为 403。
 */
export function handleFeedbackTicket(
  id: number,
  req: FeedbackTicketHandleRequest
): Promise<FeedbackTicketView> {
  return post<FeedbackTicketView>(`/v1/admin/feedback/tickets/${id}/handle`, req);
}

/* ------------------------------------------------------------------ *
 * 以下为旧「裸列表」端点封装，仅为兼容既有调用点保留，新代码请用上面的 tickets 版本。
 * ------------------------------------------------------------------ */

/**
 * 拉取全部用户反馈（不含活动提案）。
 *
 * @deprecated 走 GET /api/v1/admin/feedback：不分页、无校区隔离。
 *   请改用 listFeedbackTickets()（分页 + 筛选 + 校区隔离）。
 * 后端按 createdAt 降序返回，仅返回 FEEDBACK / SUGGESTION 类型。
 */
export function listAdminFeedback(): Promise<FeedbackRecordView[]> {
  return get<FeedbackRecordView[]>("/v1/admin/feedback");
}

/**
 * 回复/标记反馈为已处理（旧写接口）。
 *
 * @deprecated 走 PUT /api/v1/admin/feedback/{id}/reply：状态固定 REVIEWED、无审计。
 *   请改用 handleFeedbackTicket()（@Auditable + 校区越权校验）。
 *
 * @param id    反馈记录 ID
 * @param reply 回复内容（非空，由调用方保证）
 * @returns 更新后的反馈记录（状态 REVIEWED，latestReplySummary 已刷新）
 */
export function replyFeedback(
  id: number,
  reply: string
): Promise<FeedbackRecordView> {
  return put<FeedbackRecordView>(
    `/v1/admin/feedback/${id}/reply`,
    { reply }
  );
}
