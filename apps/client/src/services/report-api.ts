/**
 * 举报 API 封装。
 * 对应后端 com.campuslove.api.report.ReportController（POST /api/reports）。
 *
 * 举报目标类型：
 *   - POST：村口帖子
 *   - COMMENT：评论
 *   - USER：用户
 *   - TOPIC：圈子话题
 */
import { request } from "./http";

/** 举报目标类型 */
export type ReportTargetType = "POST" | "COMMENT" | "USER" | "TOPIC";

/** 举报请求体 */
export interface ReportRequest {
  /** 举报目标类型 */
  targetType: ReportTargetType;
  /** 目标对象 ID */
  targetId: string | number;
  /** 举报原因（简短分类） */
  reason: string;
  /** 详细描述（可选） */
  description?: string;
}

/** 举报响应体 */
export interface ReportResponse {
  /** 举报记录 ID */
  id: number;
  /** 举报目标类型 */
  targetType: ReportTargetType;
  /** 目标对象 ID */
  targetId: number;
  /** 举报人用户 ID */
  reporterId: number;
  /** 举报原因 */
  reason: string;
  /** 详细描述 */
  description?: string;
  /** 处理状态：PENDING / HANDLED / REJECTED */
  status: "PENDING" | "HANDLED" | "REJECTED";
  /** 创建时间 */
  createdAt: string;
}

/**
 * 举报目标对象。
 * 调用方负责传入正确的目标类型与目标 ID，由后端进行持久化。
 *
 * @param type        举报目标类型
 * @param id          目标对象 ID
 * @param reason      举报原因（如"垃圾广告"）
 * @param description 详细描述（可选）
 * @returns 举报记录视图
 */
export function reportTarget(
  type: ReportTargetType,
  id: string | number,
  reason: string,
  description?: string
): Promise<ReportResponse> {
  const payload: ReportRequest = {
    targetType: type,
    targetId: id,
    reason,
    description,
  };
  return request<ReportResponse, ReportRequest>({
    url: "/reports",
    method: "POST",
    data: payload,
  });
}
