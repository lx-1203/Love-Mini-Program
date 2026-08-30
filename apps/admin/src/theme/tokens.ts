// ============================================================
// Admin v2 设计 Token - 与客户端共享同一来源（Single Source of Truth）
// ------------------------------------------------------------
// 通过 re-export 客户端 `apps/client/src/theme/tokens.ts` 实现
// "设计 Token 三合一"，客户端与 Admin v2 共用一套 Token 数据，
// 避免双套维护导致的视觉漂移。
//
// Token 主色（对齐 design-tokens-admin.md，2026-08 后台视觉重构）：
//   - cobalt 主色：#0064e0 — 后台唯一主操作/激活态色（§2.1）
//   - 画布：#f1f4f7 托白卡 #ffffff，1px #dee3e9 边框分层
//   - 文字三级：#1c1e21 / #5d6c7b / #8595a4
//   - 语义色：成功 #31a24c · 警告 #f2a918（徽章字 #a96f00）· 危险 #e41e3f
//
// 使用方式：
//   import { designTokens, getThemeTokens, adminTokens } from "@/theme/tokens";
//   const primaryColor = designTokens.color.brand[400]; // #34C98A
//   const darkTokens = getThemeTokens("dark");
//   const adminPrimary = adminTokens.colors.primary; // #0064e0
//
// adminTokens 用于补齐 Admin v2 后台特有的语义化 token，
// 与 admin-common.css 中 :root 变量保持一致，便于主题切换/暗色模式落地。
// ============================================================

/**
 * Re-export 自客户端 Token 单一来源。
 *
 * 路径说明：使用相对路径 `../../../client/src/theme/tokens`，
 * 因 admin-v2 与 client 同属 monorepo apps/* workspace，
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

/**
 * Admin v2 后台语义化 Token。
 *
 * 用于补齐 admin-common.css 中 :root CSS 变量所需的语义化命名，
 * 颜色与像素尺寸的单一来源。任何视图层应通过 `var(--token-name)`
 * 引用，避免硬编码十六进制色值/像素。
 */
export const adminTokens = {
  colors: {
    // 主色 cobalt：仅主操作 / 激活态 / 链接 / 聚焦环（design-tokens-admin.md §2.1）
    primary: "#0064e0",
    primaryHover: "#0457cb",
    primarySoft: "#e9f1fd",
    primarySofter: "#d7e7fb",
    // 语义色：徽章 = 浅底 + 同色字（§2.2 / §5.6）
    success: "#31a24c",
    successSoft: "#e8f5ec",
    successSofter: "#d4eedd",
    warning: "#f2a918",
    warningText: "#a96f00",
    warningSoft: "#fbf1dc",
    warningSofter: "#f5e3c2",
    danger: "#e41e3f",
    dangerHover: "#c2132f",
    dangerSoft: "#fce8ec",
    dangerSofter: "#f8d3da",
    info: "#0064e0",
    infoSoft: "#e9f1fd",
    infoSofter: "#d7e7fb",
    accent: "#0064e0",
    accentSoft: "#e9f1fd",
    // 渐变辅助色（变量名保留兼容，取值收敛主色系）
    gradientSecondary: "#0457cb",
    skipLink: "#0064e0",
    skipLinkFg: "#ffffff",
    // Danger 加深色（ErrorState 标题/正文/hover）
    dangerBorder: "#f5b6c2",
    dangerTitle: "#b01230",
    dangerMessage: "#8f1027",
    dangerActive: "#c2132f",
    // Stat 数字配色（cobalt 单色系 + 语义色）
    statPrimary: "#0064e0",
    statPink: "#e41e3f",
    statBlue: "#5b99ef",
    statGreen: "#31a24c",
    // 文字三级层次（§2.3）：主 #1c1e21 → 次 #5d6c7b → 辅 #8595a4
    textPrimary: "#1c1e21",
    textSecondary: "#5d6c7b",
    textTertiary: "#8595a4",
    textQuaternary: "#8595a4",
    textPlaceholder: "#bcc0c4",
    border: "#ced0d4",
    borderLight: "#dee3e9",
    bgPage: "#f1f4f7",
    bgContainer: "#ffffff",
    bgSubtle: "#f1f4f7",
    bgHover: "#f1f4f7",
    overlay: "rgba(10, 19, 23, 0.45)",
    // 白色侧边栏（激活态三合一：浅蓝底 + 左竖条 + 主色字）
    sidebarBg: "#ffffff",
    sidebarBgHover: "#f1f4f7",
    sidebarBgActive: "#e9f1fd",
    sidebarText: "#5d6c7b",
    sidebarTextActive: "#0064e0",
    sidebarLogoBg: "#ffffff",
    headerBg: "#ffffff",
    tabsBg: "#f1f4f7",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    mdLg: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 8,
    xxl: 12,
  },
  fontSize: {
    xs: 12,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 16,
    xxxl: 24,
    display: 28,
  },
  shadow: {
    sm: "none",
    md: "0 4px 16px rgba(20, 22, 26, 0.12)",
    lg: "0 8px 32px rgba(20, 22, 26, 0.16)",
  },
} as const;

/** Admin Token 类型导出，便于在 TS 上下文中引用 */
export type AdminTokens = typeof adminTokens;
