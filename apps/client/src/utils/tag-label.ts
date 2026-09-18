/**
 * tag-label.ts — 兴趣/性格/生活标签 value → 展示文案 统一映射
 *
 * 背景（R10-P3-016）：标签按设计以英文 key 落库（config/profile-tags.ts：
 * "value 保持英文 key…展示层通过 labelKey 经 t() 渲染"），但种子用户的标签
 * 直接存了中文文案。列表/卡片此前直接渲染原始值 → 同屏混排
 * 「running/movies」与「韩剧/写作」。
 *
 * 本工具提供唯一出口：
 *   - 命中 profileTagGroups → 走 labelKey 的 t()（当前语言文案）
 *   - 未命中（中文种子标签/自定义标签）→ 原样返回
 */
import { profileTagGroups } from "../config/profile-tags";

/** value → { label, labelKey } 扁平索引（模块级构建一次） */
const TAG_INDEX = new Map<string, { label: string; labelKey?: string }>();
for (const group of profileTagGroups) {
  for (const option of group.options) {
    TAG_INDEX.set(option.value, { label: option.label, labelKey: option.labelKey });
  }
}

/**
 * 存量/自由输入英文标签别名（R10-P3-016）：注册向导历史版本与种子数据存在
 * 不在 profileTagGroups 中的英文值（复数形、同义词），展示时归一到中文。
 * 命中优先级：TAG_INDEX > ALIAS > 原样透传（中文标签直接透传）。
 */
const TAG_ALIAS: Record<string, string> = {
  running: "跑步",
  jogging: "跑步",
  movies: "电影",
  food: "美食",
  foods: "美食",
  singing: "唱歌",
  reading: "阅读",
  photography: "摄影",
  gaming: "游戏",
  painting: "绘画",
  travel: "旅行",
  music: "音乐",
  dance: "舞蹈",
  sports: "运动",
};

/**
 * 标签展示文案：英文 key → 当前语言文案；未登记的原始标签原样透传。
 */
export function tagLabelFor(raw: string, t: (key: string) => string): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const hit = TAG_INDEX.get(value);
  if (!hit) return TAG_ALIAS[value.toLowerCase()] ?? value;
  return hit.labelKey ? t(hit.labelKey) : hit.label;
}

/** 批量映射（过滤空值） */
export function tagLabelsFor(raws: readonly string[] | undefined, t: (key: string) => string): string[] {
  if (!raws?.length) return [];
  return raws.map((raw) => tagLabelFor(raw, t)).filter(Boolean);
}
