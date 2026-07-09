/**
 * 管理后台 - 系统配置 API（任务 8）。
 * 对应后端 AdminConfigController（/api/admin/configs、/rules、/switches）。
 */
import { get, put } from "./http";

/** 系统参数配置视图 */
export interface AdminConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedBy: number | null;
  updatedAt: string;
}

/** 业务规则视图 */
export interface AdminRule {
  id: number;
  name: string;
  expression: string;
  description: string;
  enabled: boolean;
  updatedBy: number | null;
  updatedAt: string;
}

/** 功能开关视图 */
export interface AdminSwitch {
  id: number;
  key: string;
  enabled: boolean;
  description: string;
  updatedBy: number | null;
  updatedAt: string;
}

/** 更新系统参数配置请求体 */
export interface UpdateConfigRequest {
  value: string;
  description?: string;
}

/** 更新业务规则请求体（所有字段可选） */
export interface UpdateRuleRequest {
  expression?: string;
  enabled?: boolean;
  description?: string;
}

/** 切换功能开关请求体 */
export interface UpdateSwitchRequest {
  enabled: boolean;
}

/**
 * 获取系统参数配置列表。
 * GET /api/admin/configs
 */
export function listConfigs(): Promise<AdminConfig[]> {
  return get<AdminConfig[]>("/admin/configs");
}

/**
 * 更新指定 key 的系统参数配置。
 * PUT /api/admin/configs/{key}
 */
export function updateConfig(
  key: string,
  body: UpdateConfigRequest
): Promise<AdminConfig> {
  return put<AdminConfig>(`/admin/configs/${encodeURIComponent(key)}`, body);
}

/**
 * 获取业务规则列表。
 * GET /api/admin/rules
 */
export function listRules(): Promise<AdminRule[]> {
  return get<AdminRule[]>("/admin/rules");
}

/**
 * 更新指定 id 的业务规则。
 * PUT /api/admin/rules/{id}
 */
export function updateRule(
  id: number,
  body: UpdateRuleRequest
): Promise<AdminRule> {
  return put<AdminRule>(`/admin/rules/${id}`, body);
}

/**
 * 获取功能开关列表。
 * GET /api/admin/switches
 */
export function listSwitches(): Promise<AdminSwitch[]> {
  return get<AdminSwitch[]>("/admin/switches");
}

/**
 * 切换指定 key 的功能开关状态。
 * PUT /api/admin/switches/{key}
 */
export function updateSwitch(
  key: string,
  body: UpdateSwitchRequest
): Promise<AdminSwitch> {
  return put<AdminSwitch>(`/admin/switches/${encodeURIComponent(key)}`, body);
}
