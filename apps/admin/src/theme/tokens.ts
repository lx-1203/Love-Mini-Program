// ============================================================
// Admin 设计 Token - 与客户端共享同一来源（Single Source of Truth）
// ------------------------------------------------------------
// Task 3.1.2 - Admin 接入同一 Token 系统：通过 re-export 客户端
// `apps/client/src/theme/tokens.ts` 实现"设计 Token 三合一"，
// 客户端与 Admin 共用一套 Token 数据，避免双套维护导致的视觉漂移。
//
// Token 主色（参考 project_memory）：
//   - 薄荷绿主色：#3FCF8E（brand.400）— 用于交互态、品牌色按钮、链接
//   - 粉色辅助：#EC4899（pink.400）/ #FF6B9D 浪漫色 — 用于匹配/喜欢/心动
//   - 中性灰：#1F2329 / #5B6470 / #9AA1AB — 三级文本色
//
// 使用方式：
//   import { designTokens, getThemeTokens } from "@/theme/tokens";
//   const primaryColor = designTokens.color.brand[400]; // #3FCF8E
//   const darkTokens = getThemeTokens("dark");
//
// 注意：本文件仅 re-export，不维护任何 Token 定义。
// 所有 Token 数据来源：`apps/client/src/theme/tokens.ts`。
// ============================================================

/**
 * Re-export 自客户端 Token 单一来源。
 *
 * 路径说明：使用相对路径 `../../../client/src/theme/tokens`，
 * 因 admin 与 client 同属 monorepo apps/* workspace，
 * 通过相对路径确保 Token 数据仅存于 client 一处。
 *
 * tsconfig 中已通过 include 扩展包含此依赖文件，
 * typecheck 时可正确解析类型。
 */
export {
  designTokens,
  darkThemeTokens,
  warmThemeTokens,
  getThemeTokens,
  default,
} from "../../../client/src/theme/tokens";

export type { ThemeMode } from "../../../client/src/theme/tokens";
