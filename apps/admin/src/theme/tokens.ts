// ============================================================
// Admin v2 设计 Token - 与客户端共享同一来源（Single Source of Truth）
// ------------------------------------------------------------
// 通过 re-export 客户端 `apps/client/src/theme/tokens.ts` 实现
// "设计 Token 三合一"，客户端与 Admin v2 共用一套 Token 数据，
// 避免双套维护导致的视觉漂移。
//
// Token 主色（参考 project_memory）：
//   - 薄荷绿主色：#3FCF8E（brand.400）— 客户端品牌主色（匹配/喜欢/心动等交互态）
//   - 粉色辅助：#EC4899（pink.400）/ #FF6B9D 浪漫色 — 客户端用于匹配/喜欢/心动
//   - 中性灰：#1F2329 / #5B6470 / #9AA1AB — 三级文本色
//   - Admin 后台主色：#667EEA（靛蓝）— adminTokens.colors.primary 为后台独立品牌色，
//     与客户端薄荷绿有意区分（后台视觉自成体系，见 admin-common.css :root 对齐）
//
// 使用方式：
//   import { designTokens, getThemeTokens, adminTokens } from "@/theme/tokens";
//   const primaryColor = designTokens.color.brand[400]; // #3FCF8E
//   const darkTokens = getThemeTokens("dark");
//   const adminPrimary = adminTokens.colors.primary; // #667eea
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
    primary: "#667eea",
    primaryHover: "#5568d3",
    primarySoft: "#e6f7ff",
    primarySofter: "#bae7ff",
    success: "#52c41a",
    successSoft: "#f6ffed",
    successSofter: "#d9f7be",
    warning: "#fa8c16",
    warningSoft: "#fff7e6",
    danger: "#f5222d",
    dangerHover: "#d4380d",
    dangerSoft: "#fff1f0",
    dangerSofter: "#ffccc7",
    info: "#1890ff",
    infoSoft: "#e6f7ff",
    infoSofter: "#bae7ff",
    accent: "#2f54eb",
    accentSoft: "#f0f5ff",
    // 渐变辅助色（Login/Forbidden 渐变背景）
    gradientSecondary: "#764ba2",
    skipLink: "#3FCF8E",
    skipLinkFg: "#ffffff",
    // Danger 加深色（ErrorState 标题/正文/hover）
    dangerBorder: "#ffa39e",
    dangerTitle: "#a8071a",
    dangerMessage: "#5c0011",
    dangerActive: "#cf1322",
    // Stat 卡片配色（Dashboard 统计卡片图标背景）
    statPrimary: "#667eea",
    statPink: "#f093fb",
    statBlue: "#4facfe",
    statGreen: "#43e97b",
    textPrimary: "#333",
    textSecondary: "#555",
    textTertiary: "#666",
    textQuaternary: "#999",
    textPlaceholder: "#ccc",
    border: "#e0e0e0",
    borderLight: "#f0f0f0",
    bgPage: "#f5f5f5",
    bgContainer: "#ffffff",
    bgSubtle: "#f9f9f9",
    bgHover: "#f5f5f5",
    overlay: "rgba(0, 0, 0, 0.4)",
    // eladmin 风格侧边栏专用色（Layout 深色侧边栏）
    sidebarBg: "#304156",
    sidebarBgActive: "#263445",
    sidebarText: "#bfcbd9",
    sidebarTextActive: "#ffffff",
    sidebarLogoBg: "#2b3a4d",
    headerBg: "#ffffff",
    tabsBg: "#f0f2f5",
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
    xl: 12,
    xxl: 16,
  },
  fontSize: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 18,
    xxxl: 24,
    display: 28,
  },
  shadow: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.05)",
    md: "0 8px 32px rgba(0, 0, 0, 0.16)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.1)",
  },
} as const;

/** Admin Token 类型导出，便于在 TS 上下文中引用 */
export type AdminTokens = typeof adminTokens;
