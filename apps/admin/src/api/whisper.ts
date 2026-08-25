/**
 * Admin - 悄悄话管理 API（v3.1 审核红线）。
 * 对应后端 AdminWhisperController（/api/v1/admin/whispers）。
 */
import { AdminPageView, del, get } from "./http";

export interface AdminWhisperView {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  status: string;
  priceCents: number;
  createdAt: string;
  readAt: string | null;
}

/** 分页列表 */
export async function listWhispers(page = 1, size = 20): Promise<AdminPageView<AdminWhisperView>> {
  return get<AdminPageView<AdminWhisperView>>(`/v1/admin/whispers?page=${page}&size=${size}`);
}

/** 删除 */
export async function deleteWhisper(id: number): Promise<{ id: number; success: boolean }> {
  return del<{ id: number; success: boolean }>(`/v1/admin/whispers/${id}`);
}
