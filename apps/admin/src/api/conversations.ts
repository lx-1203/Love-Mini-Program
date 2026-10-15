/**
 * Admin - 私信会话只读管理 API（阶段 4b，隐私敏感读接口）。
 *
 * 对应后端 com.campuslove.api.admin.AdminConversationController：
 * - GET /api/v1/admin/conversations              （分页会话列表，含参与者摘要）
 * - GET /api/v1/admin/conversations/{id}         （会话详情）
 * - GET /api/v1/admin/conversations/{id}/messages（会话消息分页）
 *
 * 脱敏约定：正文类字段（lastMessagePreview / content / quoteContext）在**服务端**按角色脱敏，
 * 非 SUPER_ADMIN 返回 null；每条记录附带 redacted 标记供前端展示「已隐藏正文」徽标。
 * 前端不得自行拼接或还原正文。
 */
import { AdminPageView, get } from "./http";

/** 会话列表项（对应后端 AdminConversationView）。 */
export interface AdminConversationItem {
  id: number;
  conversationUid: string;
  userAId: number;
  userANickname: string | null;
  userAAvatarUrl: string | null;
  userBId: number;
  userBNickname: string | null;
  userBAvatarUrl: string | null;
  /** 最后消息预览；非超管恒为 null（服务端脱敏） */
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  pinned: boolean;
  /** 消息总数（元数据，恒可见） */
  messageCount: number;
  /** 正文是否被脱敏（true 表示当前角色看不到正文） */
  redacted: boolean;
}

/** 会话详情（对应后端 AdminConversationDetailView）。 */
export interface AdminConversationDetail {
  id: number;
  conversationUid: string;
  userAId: number;
  userANickname: string | null;
  userAAvatarUrl: string | null;
  userBId: number;
  userBNickname: string | null;
  userBAvatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  pinned: boolean;
  userAMuted: boolean;
  userBMuted: boolean;
  messageCount: number;
  redacted: boolean;
}

/** 会话消息项（对应后端 AdminMessageView）。 */
export interface AdminMessageItem {
  id: number;
  conversationId: number | null;
  senderId: number;
  senderNickname: string | null;
  /** 消息正文；非超管恒为 null（服务端脱敏） */
  content: string | null;
  messageKind: string;
  durationSeconds: number | null;
  /** 引用上下文；非超管恒为 null（服务端脱敏） */
  quoteContext: string | null;
  isRead: boolean;
  recalled: boolean;
  deliveryStatus: string;
  createdAt: string | null;
  redacted: boolean;
}

/** 会话列表查询参数（page 1-based，pageSize 后端上限 100）。 */
export interface ConversationListQuery {
  page?: number;
  pageSize?: number;
}

/** 分页查询私信会话列表。GET /v1/admin/conversations */
export function listConversations(
  query: ConversationListQuery = {},
): Promise<AdminPageView<AdminConversationItem>> {
  return get<AdminPageView<AdminConversationItem>>(
    "/v1/admin/conversations",
    query as Record<string, unknown>,
  );
}

/** 查询单个会话详情。GET /v1/admin/conversations/{id} */
export function getConversation(id: number): Promise<AdminConversationDetail> {
  return get<AdminConversationDetail>(`/v1/admin/conversations/${id}`);
}

/** 分页查询会话消息。GET /v1/admin/conversations/{id}/messages */
export function listConversationMessages(
  id: number,
  query: ConversationListQuery = {},
): Promise<AdminPageView<AdminMessageItem>> {
  return get<AdminPageView<AdminMessageItem>>(
    `/v1/admin/conversations/${id}/messages`,
    query as Record<string, unknown>,
  );
}
