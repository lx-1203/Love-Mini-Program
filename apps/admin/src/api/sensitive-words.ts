/**
 * 敏感词 API 封装。
 * 对应后端 com.campuslove.api.admin.AdminSensitiveWordController。
 */
import { del, get, post } from "./http";

/** 敏感词视图（与后端 SensitiveWordView record 对齐） */
export interface SensitiveWordView {
  id: number;
  word: string;
  category?: string;
  createdAt?: string;
}

/** 新增敏感词请求（与后端 SensitiveWordCreateRequest record 对齐） */
export interface SensitiveWordCreateRequest {
  word: string;
  category?: string;
}

/** 敏感词分类（与后端 SQL 注释保持一致） */
export const SENSITIVE_WORD_CATEGORIES: { value: string; label: string }[] = [
  { value: "POLITICS", label: "政治" },
  { value: "PORN", label: "色情" },
  { value: "ABUSE", label: "辱骂" },
  { value: "AD", label: "广告" },
  { value: "OTHER", label: "其他" },
];

/** 查询敏感词列表（可选 category 过滤） */
export function listSensitiveWords(category?: string) {
  return get<SensitiveWordView[]>("/admin/sensitive-words", { category });
}

/** 新增敏感词 */
export function createSensitiveWord(word: string, category?: string) {
  return post<SensitiveWordView>("/admin/sensitive-words", { word, category });
}

/** 删除敏感词 */
export function deleteSensitiveWord(id: number) {
  return del<void>(`/admin/sensitive-words/${id}`);
}
