/**
 * 举报管理 API 封装。
 * 对应后端 com.campuslove.api.admin.AdminReportController。
 *
 * 接口：
 *   - GET  /api/admin/reports           分页查询举报列表
 *   - POST /api/admin/reports/{id}/handle 处理举报
 */
import { AdminPageView, get, post } from "./http";

/** 举报列表项视图（与后端 AdminReportView record 对齐） */
export interface AdminReportView {
  id: number;
  /** 举报目标类型：POST / COMMENT / USER / TOPIC */
  targetType: "POST" | "COMMENT" | "USER" | "TOPIC";
  /** 目标对象 ID */
  targetId: number;
  /** 举报人用户 ID */
  reporterId: number;
  /** 举报人昵称（批量预加载） */
  reporterNickname: string | null;
  /** 举报原因（简短分类） */
  reason: string;
  /** 详细描述 */
  description: string | null;
  /** 处理状态：PENDING / HANDLED / REJECTED */
  status: "PENDING" | "HANDLED" | "REJECTED";
  /** 处理人管理员 ID（未处理时为 null） */
  handlerId: number | null;
  /** 处理备注 */
  handleRemark: string | null;
  /** 举报时间（ISO 格式字符串） */
  createdAt: string;
  /** 处理时间（未处理时为 null） */
  handledAt: string | null;
}

/** 举报处理请求体（与后端 AdminReportHandleRequest record 对齐） */
export interface AdminReportHandleRequest {
  /** 处理结果：HANDLE 已处理 / REJECT 驳回 */
  result: "HANDLE" | "REJECT";
  /** 处理备注 */
  remark?: string;
}

/** 举报处理响应 */
export interface AdminReportHandleResponse {
  id: number;
  result: "HANDLE" | "REJECT";
  status: "HANDLED" | "REJECTED";
  remark: string | null;
  handlerId: number;
  handledAt: string;
  success: boolean;
}

/** 举报列表查询参数 */
export interface AdminReportListQuery {
  status?: "PENDING" | "HANDLED" | "REJECTED";
  targetType?: "POST" | "COMMENT" | "USER" | "TOPIC";
  page?: number;
  pageSize?: number;
}

/** 举报目标类型选项（用于前端筛选下拉） */
export const REPORT_TARGET_TYPES: { value: string; label: string }[] = [
  { value: "POST", label: "帖子" },
  { value: "COMMENT", label: "评论" },
  { value: "USER", label: "用户" },
  { value: "TOPIC", label: "话题" },
];

/** 举报状态选项（用于前端筛选下拉） */
export const REPORT_STATUSES: { value: string; label: string }[] = [
  { value: "PENDING", label: "待处理" },
  { value: "HANDLED", label: "已处理" },
  { value: "REJECTED", label: "已驳回" },
];

/**
 * 分页查询举报列表。
 * GET /api/admin/reports
 */
export function listReports(
  query: AdminReportListQuery = {}
): Promise<AdminPageView<AdminReportView>> {
  return get<AdminPageView<AdminReportView>>("/admin/reports", {
    status: query.status,
    targetType: query.targetType,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  });
}

/**
 * 处理举报。
 * POST /api/admin/reports/{id}/handle
 */
export function handleReport(
  id: number,
  req: AdminReportHandleRequest
): Promise<AdminReportHandleResponse> {
  return post<AdminReportHandleResponse>(`/admin/reports/${id}/handle`, req);
}
