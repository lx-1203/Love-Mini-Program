/**
 * 审计日志 API 封装。
 * 对应后端 com.campuslove.api.admin.AdminAuditLogController。
 */
import { get } from "./http";

/** 审计日志视图（与后端 AuditLogView record 对齐） */
export interface AuditLogView {
  id: number;
  operatorId: number;
  operatorUsername: string;
  operatorRole: string;
  operation: string;
  targetType?: string;
  targetId?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestBody?: string;
  responseStatus?: number;
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  durationMs?: number;
  createdAt: string;
}

/** 审计日志分页视图（与后端 AuditLogPageView record 对齐） */
export interface AuditLogPageView {
  content: AuditLogView[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** 查询参数 */
export interface AuditLogQuery {
  page?: number;
  size?: number;
  operator?: string;
  operation?: string;
  startDate?: string;
  endDate?: string;
}

/** 操作类型枚举（与后端 AuditOperation 对齐，用于前端筛选下拉） */
export const AUDIT_OPERATIONS: { value: string; label: string }[] = [
  { value: "AUDIT_POST", label: "审核帖子" },
  { value: "DELETE_POST", label: "删除帖子" },
  { value: "DELETE_COMMENT", label: "删除评论" },
  { value: "DISABLE_USER", label: "禁用用户" },
  { value: "ENABLE_USER", label: "启用用户" },
  { value: "EDIT_USER", label: "编辑用户" },
  { value: "HANDLE_REPORT", label: "处理举报" },
  { value: "REVIEW_CERTIFICATION", label: "审核认证" },
  { value: "UPDATE_CONFIG", label: "更新配置" },
  { value: "UPDATE_RULE", label: "更新规则" },
  { value: "UPDATE_SWITCH", label: "更新开关" },
  { value: "UPDATE_MATCH_CONFIG", label: "更新匹配配置" },
  { value: "UPDATE_RECOMMEND_STRATEGY", label: "更新推荐策略" },
  { value: "UPDATE_NOTIFY_CONFIG", label: "更新通知配置" },
  { value: "ADD_SENSITIVE_WORD", label: "新增敏感词" },
  { value: "DELETE_SENSITIVE_WORD", label: "删除敏感词" },
];

/** 分页查询审计日志 */
export function listAuditLogs(query: AuditLogQuery = {}) {
  return get<AuditLogPageView>("/admin/audit-logs", {
    page: query.page ?? 0,
    size: query.size ?? 20,
    operator: query.operator,
    operation: query.operation,
    startDate: query.startDate,
    endDate: query.endDate,
  });
}
