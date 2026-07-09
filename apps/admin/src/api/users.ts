/**
 * 管理后台 - 用户管理 API 封装。
 *
 * 对应后端：com.campuslove.api.admin.AdminUserController
 * 接口前缀：/api/admin/users
 */

import { AdminPageView, get, post, put } from "./http";

/** 用户列表项视图（对应后端 AdminUserSummaryView） */
export interface AdminUserSummary {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  status: "active" | "disabled";
  profileCompletion: number;
  followingCount: number;
  followersCount: number;
  createdAt: string;
}

/** 用户详情视图（对应后端 AdminUserDetailView） */
export interface AdminUserDetail {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  gradeLabel: string | null;
  pronouns: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  status: "active" | "disabled";
  profileCompletion: number;
  followingCount: number;
  followersCount: number;
  campusName: string | null;
  verificationStatus: "draft" | "pending" | "verified" | "rejected" | null;
  createdAt: string;
  updatedAt: string;
}

/** 编辑用户请求体（对应后端 AdminUserUpdateRequest） */
export interface AdminUserUpdateRequest {
  nickname?: string;
  bio?: string;
  gradeLabel?: string;
  pronouns?: string;
  status?: "active" | "disabled";
}

/** 用户列表查询参数 */
export interface AdminUserListQuery {
  role?: "USER" | "ADMIN";
  status?: "active" | "disabled";
  nickname?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  page?: number;
  pageSize?: number;
}

/** 禁用/启用操作响应 */
export interface AdminUserToggleResponse {
  id: number;
  status: "active" | "disabled";
  operatorId: number;
  success: boolean;
}

/**
 * 分页查询用户列表。
 * GET /api/admin/users
 */
export function listUsers(
  query: AdminUserListQuery = {}
): Promise<AdminPageView<AdminUserSummary>> {
  return get<AdminPageView<AdminUserSummary>>("/admin/users", query as Record<string, unknown>);
}

/**
 * 查询用户详情。
 * GET /api/admin/users/{id}
 */
export function getUserDetail(id: number): Promise<AdminUserDetail> {
  return get<AdminUserDetail>(`/admin/users/${id}`);
}

/**
 * 编辑用户。
 * PUT /api/admin/users/{id}
 */
export function updateUser(
  id: number,
  req: AdminUserUpdateRequest
): Promise<AdminUserDetail> {
  return put<AdminUserDetail>(`/admin/users/${id}`, req);
}

/**
 * 禁用用户。
 * POST /api/admin/users/{id}/disable
 */
export function disableUser(id: number): Promise<AdminUserToggleResponse> {
  return post<AdminUserToggleResponse>(`/admin/users/${id}/disable`);
}

/**
 * 启用用户。
 * POST /api/admin/users/{id}/enable
 */
export function enableUser(id: number): Promise<AdminUserToggleResponse> {
  return post<AdminUserToggleResponse>(`/admin/users/${id}/enable`);
}
