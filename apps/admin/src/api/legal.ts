/**
 * 管理后台 - 法律文本（用户协议/隐私政策）API。
 * 对应后端 AdminLegalController（/api/v1/admin/legal-documents）。
 */
import { get, post, put, unwrapApiData } from "./http";

export interface AdminLegalDocument {
  id: number;
  docType: "user_agreement" | "privacy_policy" | string;
  title: string;
  content: string;
  version: string;
  status: "published" | "draft" | string;
  effectiveAt: string | null;
  updatedAt: string | null;
}

export interface UpdateLegalDocumentRequest {
  title: string;
  content: string;
  version: string;
}

export async function listLegalDocuments(): Promise<AdminLegalDocument[]> {
  const body = await get<unknown>("/v1/admin/legal-documents");
  return unwrapApiData<AdminLegalDocument[]>(body) ?? [];
}

export async function updateLegalDocument(
  id: number,
  data: UpdateLegalDocumentRequest,
): Promise<AdminLegalDocument> {
  const body = await put<unknown>(`/v1/admin/legal-documents/${id}`, data);
  const doc = unwrapApiData<AdminLegalDocument>(body);
  if (!doc) throw new Error("保存法律文本失败：响应为空");
  return doc;
}

export async function publishLegalDocument(id: number): Promise<AdminLegalDocument> {
  const body = await post<unknown>(`/v1/admin/legal-documents/${id}/publish`);
  const doc = unwrapApiData<AdminLegalDocument>(body);
  if (!doc) throw new Error("发布法律文本失败：响应为空");
  return doc;
}

export async function offlineLegalDocument(id: number): Promise<AdminLegalDocument> {
  const body = await post<unknown>(`/v1/admin/legal-documents/${id}/offline`);
  const doc = unwrapApiData<AdminLegalDocument>(body);
  if (!doc) throw new Error("下线法律文本失败：响应为空");
  return doc;
}
