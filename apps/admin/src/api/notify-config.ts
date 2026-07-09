/**
 * 通知配置 API 封装。
 * 对应后端 com.campuslove.api.admin.AdminNotifyConfigController。
 */
import { get, put } from "./http";

/** 通知配置视图（与后端 NotifyConfigView record 对齐） */
export interface NotifyConfigView {
  id: number;
  type: string;
  enabled: boolean;
  template?: string;
  updatedAt?: string;
}

/** 单条更新请求（与后端 NotifyConfigUpdateRequest record 对齐） */
export interface NotifyConfigUpdateRequest {
  type: string;
  enabled?: boolean;
  template?: string;
}

/** 批量更新请求（与后端 NotifyConfigBatchUpdateRequest record 对齐） */
export interface NotifyConfigBatchUpdateRequest {
  configs: NotifyConfigUpdateRequest[];
}

/** 查询全部通知配置 */
export function listNotifyConfigs() {
  return get<NotifyConfigView[]>("/admin/notify-config");
}

/** 批量更新通知配置 */
export function updateNotifyConfigs(configs: NotifyConfigUpdateRequest[]) {
  return put<NotifyConfigView[]>("/admin/notify-config", { configs });
}
