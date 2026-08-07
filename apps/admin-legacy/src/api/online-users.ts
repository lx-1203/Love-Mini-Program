/**
 * 管理后台 - 在线用户管理 API 封装（eladmin「在线用户」对齐）。
 *
 * 对应后端：com.campuslove.api.admin.OnlineUserAdminController
 * 接口前缀：/api/v1/admin/online-users
 */

import { get, post, unwrapApiData } from "./http";

/** 在线用户视图（对应后端 OnlineUserView） */
export interface OnlineUserView {
  /** 用户 ID */
  userId: number;
  /** 用户昵称（用户已删除时为 null） */
  nickname: string | null;
  /** 登录方式：wechat / phone / admin */
  loginMethod: string;
  /** 登录时间（ISO 格式） */
  loginAt: string;
}

/** 踢下线操作响应 */
export interface KickOnlineUserResponse {
  userId: number;
  success: boolean;
}

/**
 * 在线用户列表。
 * GET /api/v1/admin/online-users
 * 后端返回 ApiResponse 包装，此处解包 data。
 */
export async function listOnlineUsers(): Promise<OnlineUserView[]> {
  const body = await get<unknown>("/v1/admin/online-users");
  return unwrapApiData<OnlineUserView[]>(body) ?? [];
}

/**
 * 强制下线指定用户。
 * POST /api/v1/admin/online-users/{userId}/kick
 * 后端返回 ApiResponse 包装，此处解包 data。
 */
export async function kickOnlineUser(userId: number): Promise<KickOnlineUserResponse> {
  const body = await post<unknown>(`/v1/admin/online-users/${userId}/kick`);
  return unwrapApiData<KickOnlineUserResponse>(body) ?? { userId, success: true };
}
