/**
 * 管理后台 - 实名认证审核 API。
 * 对应后端 com.campuslove.api.admin.AdminRealNameController
 * （GET /api/v1/admin/real-name-certifications、POST /api/v1/admin/real-name-certifications/{id}/review）。
 */
import { get, post } from "./http";

/** 实名认证视图（对应后端 RealNameCertificationView） */
export interface RealNameCertificationView {
  id: number;
  userId: number;
  /** 认证状态：PENDING 待审核 / APPROVED 已通过 / REJECTED 已驳回 */
  status: "PENDING" | "APPROVED" | "REJECTED";
  /** 真实姓名 */
  userName: string | null;
  /** 脱敏身份证号（前 6 后 4，中间掩码） */
  idCardNo: string | null;
  /** 身份证人像面（正面）照片 URL */
  idCardFrontUrl: string | null;
  /** 身份证国徽面（背面）照片 URL */
  idCardBackUrl: string | null;
  reviewComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** 审核认证请求体（对应后端 ReviewRealNameRequest） */
export interface ReviewRealNameRequest {
  status: "APPROVED" | "REJECTED";
  comment?: string;
}

/**
 * 获取实名认证列表（支持按状态筛选 + 分页）。
 * GET /api/v1/admin/real-name-certifications?status=PENDING|ALL|APPROVED|REJECTED&page=0&size=20
 */
export function listRealNameCertifications(
  status: string,
  page = 0,
  size = 20
): Promise<RealNameCertificationView[]> {
  return get<RealNameCertificationView[]>("/v1/admin/real-name-certifications", { status, page, size });
}

/**
 * 审核实名认证申请（通过或拒绝）。
 * POST /api/v1/admin/real-name-certifications/{id}/review
 */
export function reviewRealNameCertification(
  id: number,
  body: ReviewRealNameRequest
): Promise<RealNameCertificationView> {
  return post<RealNameCertificationView>(`/v1/admin/real-name-certifications/${id}/review`, body);
}
