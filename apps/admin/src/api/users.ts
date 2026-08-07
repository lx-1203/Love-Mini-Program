/**
 * 管理后台 - 用户管理 API 封装。
 *
 * 对应后端：com.campuslove.api.admin.AdminUserController
 * 接口前缀：/api/v1/admin/users
 */

import { AdminPageView, get, post, put, unwrapApiData } from "./http";

/** 用户列表项视图（对应后端 AdminUserSummaryView） */
export interface AdminUserSummary {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  phone: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  status: "active" | "disabled";
  profileCompletion: number;
  followingCount: number;
  followersCount: number;
  /** 管理员管辖校区名（null=全局管理员，仅管理员账号有值） */
  campusName: string | null;
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
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
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
  /** 校区筛选（按用户所属校区匹配；校区管理员登录时后端强制按管辖校区过滤） */
  campusName?: string;
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

/** 新增用户请求体（对应后端 AdminCreateUserRequest） */
export interface AdminCreateUserRequest {
  /** 手机号（11 位，1[3-9] 开头，唯一） */
  phone: string;
  /** 初始密码（6-64 位） */
  password: string;
  /** 昵称（1-20 字） */
  nickname: string;
}

/**
 * 分页查询用户列表。
 * GET /api/v1/admin/users
 */
export function listUsers(
  query: AdminUserListQuery = {}
): Promise<AdminPageView<AdminUserSummary>> {
  return get<AdminPageView<AdminUserSummary>>("/v1/admin/users", query as Record<string, unknown>);
}

/**
 * 新增用户（后台「新增用户」）。
 * POST /api/v1/admin/users
 * 后端返回 ApiResponse 包装，此处解包 data。
 */
export async function createUser(req: AdminCreateUserRequest): Promise<AdminUserSummary> {
  const body = await post<unknown>("/v1/admin/users", req);
  return unwrapApiData<AdminUserSummary>(body) as AdminUserSummary;
}

/**
 * 创建管理员 / 分页查询管理员列表（含管辖校区）。
 * 统一实现见 api/system.ts（管理员管理域）——本文件曾存在双份实现，
 * 现改为从 system.ts 直接 re-export，避免同一端点两套封装漂移。
 */
export { createAdmin, listAdmins } from "./system";

/**
 * 查询用户详情。
 * GET /api/v1/admin/users/{id}
 */
export function getUserDetail(id: number): Promise<AdminUserDetail> {
  return get<AdminUserDetail>(`/v1/admin/users/${id}`);
}

/**
 * 编辑用户。
 * PUT /api/v1/admin/users/{id}
 */
export function updateUser(
  id: number,
  req: AdminUserUpdateRequest
): Promise<AdminUserDetail> {
  return put<AdminUserDetail>(`/v1/admin/users/${id}`, req);
}

/**
 * 禁用用户。
 * POST /api/v1/admin/users/{id}/disable
 */
export function disableUser(id: number): Promise<AdminUserToggleResponse> {
  return post<AdminUserToggleResponse>(`/v1/admin/users/${id}/disable`);
}

/**
 * 启用用户。
 * POST /api/v1/admin/users/{id}/enable
 */
export function enableUser(id: number): Promise<AdminUserToggleResponse> {
  return post<AdminUserToggleResponse>(`/v1/admin/users/${id}/enable`);
}
