/**
 * 圈子/兴趣图标 emoji → SVG 路径解析工具（2026-08-26）
 *
 * <p>业务组件中圈子、兴趣等实体图标不允许直接渲染 emoji 字符（项目硬约束：
 * business components 必须用 SVG 替换 emoji 字符）。本模块统一解析：
 * <ul>
 *   <li>icon 字段已是 SVG 路径 → 原样返回（real 后端返回路径的场景）</li>
 *   <li>icon 字段是 emoji 字符 → 映射为对应 SVG 路径（兼容 mock / 历史数据）</li>
 * </ul>
 * </p>
 */
import { IMAGE_PATHS } from "./images";

/** emoji 字符（FE0F-stripped）→ 圈子图标 SVG 路径 */
const CIRCLE_EMOJI_MAP: Record<string, string> = {
  "📷": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAMERA,   // 摄影
  "🧳": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_TRAVEL,   // 旅行
  "✈️": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_TRAVEL,   // 旅行（变体）
  "✈": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_TRAVEL,    // 旅行（无 FE0F）
  "🎵": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_MUSIC,    // 音乐
  "🎧": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_MUSIC,    // 音乐
  "⚽": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT,    // 运动
  "🏀": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT,    // 篮球
  "🎾": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT,    // 网球
  "🏃": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT,    // 跑步
  "🍜": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_FOOD,     // 美食
  "🍔": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_FOOD,     // 美食
  "🍳": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_FOOD,     // 烹饪
  "🎮": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_GAME,     // 游戏
  "📚": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_BOOK,     // 阅读 / 考研
  "📖": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_BOOK,     // 阅读
  "🐾": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_PET,      // 宠物
  "🐱": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAT,      // 萌宠
  "🐶": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_PET,      // 萌宠
  "🪐": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_PLANET,   // 天文 / 星空
  "🔭": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_PLANET,   // 天文
  "🎲": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_DICE,     // 桌游
  "🎬": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_STAR,     // 电影
  "🎭": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_STAR,     // 表演
  "🔥": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_FIRE,     // 热门
  "⭐": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_STAR,     // 通用
  "💃": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_MUSIC,    // 舞蹈
  "🩰": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_MUSIC,    // 舞蹈
  "🎨": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_STAR,     // 绘画
  "📷︎": IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAMERA,  // 摄影（含变体）
};

/** 移除 U+FE0F 变体选择符 */
function stripVS(s: string): string {
  return s.replace(/\uFE0F/g, "");
}

/**
 * 解析图标字段为可渲染的 SVG 路径。
 * - 已是路径（以 / 或 http 开头）→ 原样
 * - emoji 字符 → 映射 SVG；无映射 → 返回空串（调用方可用名字首字兜底）
 */
export function resolveCircleIcon(icon: string | null | undefined): string {
  if (!icon) return "";
  const trimmed = icon.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("http")) return trimmed;
  const key = stripVS(trimmed);
  return CIRCLE_EMOJI_MAP[key] ?? "";
}

/** 判断图标字段是否已是路径（用于模板 v-if 分支） */
export function isCircleIconPath(icon: string | null | undefined): boolean {
  const trimmed = (icon || "").trim();
  return trimmed.startsWith("/") || trimmed.startsWith("http");
}