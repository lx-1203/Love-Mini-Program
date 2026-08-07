/**
 * 官方号 API 封装（2026-08-07 官方号体系）。
 * 对应后端 com.campuslove.api.admin.AdminOfficialAccountController（只读）。
 */
import { get } from "./http";

/** 官方账号视图（与后端 OfficialAccountView record 对齐） */
export interface OfficialAccountView {
  id: number;
  code: string;
  name: string;
  description: string;
  iconUrl: string;
}

/** 官方号消息视图（与后端 OfficialMessageView record 对齐） */
export interface OfficialMessageView {
  id: number;
  messageType: "text" | "card";
  content: string;
  cardTitle: string | null;
  cardDesc: string | null;
  cardTag: string | null;
  cardTargetUrl: string | null;
  publishedAt: string;
}

/** 查询全部启用官方账号 */
export function listOfficialAccounts() {
  return get<OfficialAccountView[]>("/v1/admin/official-accounts");
}

/** 查询某官方号的消息流 */
export function getOfficialAccountMessages(code: string) {
  return get<OfficialMessageView[]>(
    `/v1/admin/official-accounts/${encodeURIComponent(code)}/messages`,
  );
}
