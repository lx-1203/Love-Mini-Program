/**
 * 管理后台 - 校园认证审核 API。
 * 对应后端 com.campuslove.api.admin.AdminCertificationController
 * （GET /api/v1/admin/certifications、POST /api/v1/admin/certifications/{id}/review）。
 */
import { get, post } from "./http";

/** 校园认证视图（对应后端 CampusCertificationView） */
export interface CertificationView {
  id: number;
  userId: number;
  schoolName: string | null;
  major: string | null;
  studentIdCardUrl: string | null;
  /** 认证状态：PENDING 待审核 / APPROVED 已通过 / REJECTED 已驳回 */
  status: "PENDING" | "APPROVED" | "REJECTED";
  statusLabel: string | null;
  reviewerId: number | null;
  reviewComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** 审核认证请求体（对应后端 ReviewCertificationRequest） */
export interface ReviewCertificationRequest {
  status: "APPROVED" | "REJECTED" | "PENDING";
  comment?: string;
}

/**
 * 获取认证列表（支持按状态筛选）。
 * GET /api/v1/admin/certifications?status=PENDING|ALL|APPROVED|REJECTED
 */
export function listCertifications(status: string): Promise<CertificationView[]> {
  return get<CertificationView[]>("/v1/admin/certifications", { status });
}

/**
 * 审核认证申请（通过或拒绝）。
 * POST /api/v1/admin/certifications/{id}/review
 */
export function reviewCertification(
  id: number,
  body: ReviewCertificationRequest
): Promise<CertificationView> {
  return post<CertificationView>(`/v1/admin/certifications/${id}/review`, body);
}
