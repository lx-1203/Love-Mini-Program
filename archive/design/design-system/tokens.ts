// ============================================================
// @deprecated 本文件已废弃（DEPRECATED）
// ------------------------------------------------------------
// Task 3.1.1 - 设计 Token 三合一：统一以 `apps/client/src/theme/tokens.ts`
// 为单一来源（Single Source of Truth），Admin 通过 `apps/admin/src/theme/tokens.ts`
// re-export 客户端 Token，与客户端共享同一套设计 Token。
//
// 迁移指引：
//   - 客户端：`import { designTokens } from '@/theme/tokens'`
//   - Admin：`import { designTokens } from '@/theme/tokens'`
//   - 旧代码若仍从此处导入，将自动 re-export 到新位置，无需修改业务代码。
//
// 本文件不再维护任何 Token 定义，仅作为向后兼容的 re-export 入口。
// 后续 P3 阶段完成全量迁移后，可安全删除本文件。
// ============================================================

/**
 * Re-export 自客户端单一来源 Token 文件。
 *
 * 注意：路径使用相对路径 `../apps/client/src/theme/tokens`，
 * 因 design-system 不属于 monorepo workspace 包，
 * 通过相对路径 re-export 确保 Token 数据仅存于客户端一处。
 */
export {
  designTokens,
  darkThemeTokens,
  warmThemeTokens,
  getThemeTokens,
  default,
} from "../apps/client/src/theme/tokens";

export type { ThemeMode } from "../apps/client/src/theme/tokens";
