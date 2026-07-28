/**
 * 匹配偏好选项配置
 *
 * Task 3.6.2：新增 loadMatchFormFields() 异步从后端 /api/v1/config/match-preferences 拉取，
 * 失败时回退到本地 matchFormFields 静态默认值。
 */
import { loadMatchPreferences } from "../services/config";

export interface MatchFormField {
  key: string;
  label: string;
  required: boolean;
  /** 选项所属分组（可选，Task 3.6.2 后端返回字段） */
  group?: string;
  /** 偏好可选项列表（可选，Task 3.6.2 后端返回字段） */
  options?: { value: string; label: string }[];
}

export const matchFormFields: MatchFormField[] = [
  { key: 'preference', label: '匹配偏好', required: true },
  { key: 'timeRange', label: '可聊时间', required: false },
];

/**
 * 从后端动态加载匹配偏好选项列表（Task 3.6.2）。
 *
 * 调用 GET /api/v1/config/match-preferences，返回匹配偏好选项视图列表。
 * 失败时回退到本地 matchFormFields 静态默认值。
 *
 * @returns 匹配偏好表单字段列表（后端数据或本地兜底）
 */
export async function loadMatchFormFields(): Promise<MatchFormField[]> {
  try {
    const preferences = await loadMatchPreferences();
    if (preferences.length === 0) {
      return matchFormFields;
    }
    return preferences.map((p) => ({
      key: p.key,
      label: p.label,
      required: p.required,
      group: p.group ?? undefined,
      options: p.options.map((o) => ({ value: o.value, label: o.label })),
    }));
  } catch (_e) {
    // 后端不可达或返回异常：回退到本地静态默认值
    return matchFormFields;
  }
}

