/**
 * 管理后台 - 系统配置 API（任务 8）。
 * 对应后端 AdminConfigController（/api/v1/admin/configs、/rules、/switches）。
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
 * GET /api/v1/admin/configs
 *
 * infra R2-00469：listConfigs/updateConfig/listRules/updateRule/listSwitches/updateSwitch
 * 已封装但暂无页面消费（系统配置页缺失，属 HIGH 功能缺失项，由主代理处理）。
 * 此处保留封装，待系统配置页落地后直接消费。
 */
export function listConfigs(): Promise<AdminConfig[]> {
  return get<AdminConfig[]>("/v1/admin/configs");
}

/**
 * 更新指定 key 的系统参数配置。
 * PUT /api/v1/admin/configs/{key}
 */
export function updateConfig(
  key: string,
  body: UpdateConfigRequest
): Promise<AdminConfig> {
  return put<AdminConfig>(`/v1/admin/configs/${encodeURIComponent(key)}`, body);
}

/**
 * 获取业务规则列表。
 * GET /api/v1/admin/rules
 */
export function listRules(): Promise<AdminRule[]> {
  return get<AdminRule[]>("/v1/admin/rules");
}

/**
 * 更新指定 id 的业务规则。
 * PUT /api/v1/admin/rules/{id}
 */
export function updateRule(
  id: number,
  body: UpdateRuleRequest
): Promise<AdminRule> {
  return put<AdminRule>(`/v1/admin/rules/${id}`, body);
}

/**
 * 获取功能开关列表。
 * GET /api/v1/admin/switches
 */
export function listSwitches(): Promise<AdminSwitch[]> {
  return get<AdminSwitch[]>("/v1/admin/switches");
}

/**
 * 切换指定 key 的功能开关状态。
 * PUT /api/v1/admin/switches/{key}
 */
export function updateSwitch(
  key: string,
  body: UpdateSwitchRequest
): Promise<AdminSwitch> {
  return put<AdminSwitch>(`/v1/admin/switches/${encodeURIComponent(key)}`, body);
}
