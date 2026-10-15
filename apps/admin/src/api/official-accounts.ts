/**
 * 官方号 API 封装（2026-08-07 官方号体系）。
 * 对应后端 com.campuslove.api.admin.AdminOfficialAccountController。
 *
 * 读接口对 ADMIN / SUPER_ADMIN / AUDITOR 开放；
 * 写接口（发布/下架全站广播公告）后端为 @PreAuthorize("hasRole('SUPER_ADMIN')")，
 * 校区管理员调用会得到 403，仅超级管理员可广播。
 */
import { del, get, post } from "./http";

/** 官方账号视图（与后端 OfficialAccountView record 对齐） */
export interface OfficialAccountView {
  id: number;
  code: string;
  name: string;
  description: string;
  iconUrl: string;
}

export interface OfficialActivityCardView {
  activityId: number;
  title: string;
  imageUrl: string | null;
  timeText: string | null;
  locationText: string | null;
  enrollmentCount: number;
  recommendReason: string | null;
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
  cardActivity?: OfficialActivityCardView | null;
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

// ============================================================
// 全站广播公告（写接口，后端仅 SUPER_ADMIN）
// ============================================================

/**
 * 唯一可广播的官方号 code。
 * official-promoter 处于停用状态，后端对它的写入一律 400，
 * 因此前端固定使用该 code。
 */
export const BROADCAST_ACCOUNT_CODE = "official-assistant";

/** 公告消息类型（与后端 OfficialMessage.MessageType 对齐） */
export type OfficialMessageType = "text" | "card";

/** 发布广播公告请求体（与后端 AdminOfficialAnnouncementPublishRequest record 对齐） */
export interface PublishAnnouncementRequest {
  /** 消息类型：text 文本 / card 活动卡片；缺省后端按 text 处理 */
  messageType?: OfficialMessageType;
  /** 公告正文（card 类型为卡片上方文案），必填，≤ 500 字 */
  content: string;
  /** 卡片标题（card 可选，留空后端回退活动标题） */
  cardTitle?: string | null;
  /** 卡片描述（card 可选，留空后端回退活动时间描述） */
  cardDesc?: string | null;
  /** 卡片角标，如「七夕限定」（card 可选，≤ 32 字） */
  cardTag?: string | null;
  /** 卡片 CTA 跳转地址（card 可选，≤ 512 字） */
  cardTargetUrl?: string | null;
  /** 关联活动 ID：card 类型必填，且必须是真实存在的活动 */
  cardActivityId?: number | null;
}

/** 写接口响应体（后端直出 Map，含 audience / success 提示字段） */
export interface AnnouncementOpResponse {
  id: number;
  accountId: number;
  accountCode: string;
  messageType: OfficialMessageType;
  content: string;
  cardTitle: string | null;
  cardDesc: string | null;
  cardTag: string | null;
  cardTargetUrl: string | null;
  cardActivityId: number | null;
  sortOrder: number;
  publishedAt: string;
  /** 广播范围：后端固定返回 ALL_CAMPUS_ALL_USERS（official_messages 无校区维度） */
  audience?: string;
  success: boolean;
  /** 仅下架接口返回 */
  deleted?: boolean;
}

/**
 * 发布一条全站广播公告：写入 official_messages，小程序官方号会话即时可见。
 * POST /api/v1/admin/official-accounts/{code}/messages
 */
export function publishAnnouncement(
  code: string,
  body: PublishAnnouncementRequest,
): Promise<AnnouncementOpResponse> {
  return post<AnnouncementOpResponse>(
    `/v1/admin/official-accounts/${encodeURIComponent(code)}/messages`,
    body,
  );
}

/**
 * 下架（硬删除）一条广播公告。
 * DELETE /api/v1/admin/official-accounts/{code}/messages/{id}
 */
export function deleteAnnouncement(
  code: string,
  id: number,
): Promise<AnnouncementOpResponse> {
  return del<AnnouncementOpResponse>(
    `/v1/admin/official-accounts/${encodeURIComponent(code)}/messages/${id}`,
  );
}

