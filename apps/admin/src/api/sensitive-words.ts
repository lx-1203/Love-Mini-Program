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

/** 敏感词分类（与后端 SQL 注释保持一致）
 *
 * SubTask 3.3.2：label 改为 i18n key（sensitiveWords.filterCategoryPolitics 等），
 * 由组件通过 useI18n().t() 渲染，避免硬编码中文。
 */
export const SENSITIVE_WORD_CATEGORIES: { value: string; labelKey: string }[] = [
  { value: "POLITICS", labelKey: "sensitiveWords.filterCategoryPolitics" },
  { value: "PORN", labelKey: "sensitiveWords.filterCategoryPorn" },
  { value: "ABUSE", labelKey: "sensitiveWords.filterCategoryAbuse" },
  { value: "AD", labelKey: "sensitiveWords.filterCategoryAd" },
  { value: "OTHER", labelKey: "sensitiveWords.filterCategoryOther" },
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
