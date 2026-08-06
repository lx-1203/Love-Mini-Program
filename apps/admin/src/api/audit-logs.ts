/**
 * 审计日志 API 封装（Task 13 真实数据接入）。
 *
 * 对应后端 com.campuslove.api.admin.AdminAuditLogController
 * （@RequestMapping("/api/v1/admin/audit-logs")）。
 *
 * Task 13 改造点：
 * - 修正路径前缀：旧代码 "/admin/audit-logs" 实际命中 /api/admin/audit-logs（404），
 *   改为 "/v1/admin/audit-logs" 与后端 @RequestMapping 对齐
 * - 移除所有 Mock 引用（本文件本无 Mock）
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
  /** 仅查异常日志（errorMessage 非空），true 时生效 */
  exception?: boolean;
}

/** 操作类型枚举（与后端 AuditOperation 对齐，用于前端筛选下拉） */
export const AUDIT_OPERATIONS: { value: string; labelKey: string }[] = [
  { value: "AUDIT_POST", labelKey: "auditLogs.opAuditPost" },
  { value: "DELETE_POST", labelKey: "auditLogs.opDeletePost" },
  { value: "DELETE_COMMENT", labelKey: "auditLogs.opDeleteComment" },
  { value: "DISABLE_USER", labelKey: "auditLogs.opDisableUser" },
  { value: "ENABLE_USER", labelKey: "auditLogs.opEnableUser" },
  { value: "EDIT_USER", labelKey: "auditLogs.opEditUser" },
  { value: "HANDLE_REPORT", labelKey: "auditLogs.opHandleReport" },
  { value: "REVIEW_CERTIFICATION", labelKey: "auditLogs.opReviewCertification" },
  { value: "UPDATE_CONFIG", labelKey: "auditLogs.opUpdateConfig" },
  { value: "UPDATE_RULE", labelKey: "auditLogs.opUpdateRule" },
  { value: "UPDATE_SWITCH", labelKey: "auditLogs.opUpdateSwitch" },
  { value: "UPDATE_MATCH_CONFIG", labelKey: "auditLogs.opUpdateMatchConfig" },
  { value: "UPDATE_RECOMMEND_STRATEGY", labelKey: "auditLogs.opUpdateRecommendStrategy" },
  { value: "UPDATE_NOTIFY_CONFIG", labelKey: "auditLogs.opUpdateNotifyConfig" },
  { value: "ADD_SENSITIVE_WORD", labelKey: "auditLogs.opAddSensitiveWord" },
  { value: "DELETE_SENSITIVE_WORD", labelKey: "auditLogs.opDeleteSensitiveWord" },
  { value: "CHANGE_PASSWORD", labelKey: "auditLogs.opChangePassword" },
  { value: "CREATE_USER", labelKey: "auditLogs.opCreateUser" },
  { value: "KICK_ONLINE_USER", labelKey: "auditLogs.opKickOnlineUser" },
];

/** 分页查询审计日志 */
export function listAuditLogs(query: AuditLogQuery = {}) {
  return get<AuditLogPageView>("/v1/admin/audit-logs", {
    page: query.page ?? 0,
    size: query.size ?? 20,
    operator: query.operator,
    operation: query.operation,
    startDate: query.startDate,
    endDate: query.endDate,
    exception: query.exception,
  });
}
