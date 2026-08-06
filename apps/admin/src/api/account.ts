/**
 * 管理后台 - 账号（个人）设置 API 封装。
 *
 * 对应后端：com.campuslove.api.admin.AdminAccountController
 * 接口前缀：/api/v1/admin/account
 */

import { post, unwrapApiData } from "./http";

/** 修改密码请求体（对应后端 ChangePasswordRequest） */
export interface ChangePasswordRequest {
  /** 旧密码 */
  oldPassword: string;
  /** 新密码（6-64 位） */
  newPassword: string;
}

/** 修改密码响应 */
export interface ChangePasswordResponse {
  success: boolean;
}

/**
 * 修改当前管理员密码。
 * POST /api/v1/admin/account/change-password
 * 后端返回 ApiResponse 包装，此处解包 data。
 */
export async function changePassword(req: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const body = await post<unknown>("/v1/admin/account/change-password", req);
  return unwrapApiData<ChangePasswordResponse>(body) ?? { success: true };
}
