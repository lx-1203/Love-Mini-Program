/**
 * Admin 运行时配置统一封装（Task 5：移除 import.meta.env 直接引用）。
 *
 * 设计目标：
 * - 将 Vite 环境变量（import.meta.env.*）集中封装为类型安全的 `env` 对象，
 *   避免业务代码散落 `import.meta.env.VITE_*` 字面量，便于静态分析与替换。
 * - `isDev` 通过 `import.meta.env.MODE === 'development'` 判定，
 *   Vite 构建时会替换为常量，生产构建可被压缩器 dead-code eliminate。
 * - `devAdminToken` 仅在开发环境通过 `.env.development` 的
 *   `VITE_DEV_ADMIN_TOKEN` 注入，生产构建该值为空字符串。
 *
 * 使用约束：
 * - 业务代码（stores/views/components）应仅引用 `env`，禁止直接访问 `import.meta.env`。
 * - 新增环境变量时，同步更新 `env.d.ts` 的 `ImportMetaEnv` 接口与本文件 `env` 对象。
 */

/** 运行时配置对象，业务代码统一通过此对象读取环境变量。 */
export const env = {
  /** 是否为开发环境（vite dev 模式）。生产构建时为 false。 */
  isDev: import.meta.env.MODE === "development",
  /** 后端 API 基础地址，默认 `/api`（由 vite proxy 转发到后端）。 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  /** 开发环境管理员 token，由 `.env.development` 的 `VITE_DEV_ADMIN_TOKEN` 注入。 */
  devAdminToken: import.meta.env.VITE_DEV_ADMIN_TOKEN || "",
  /** 开发环境默认管理员用户名（仅用于 Login 页面提示，实际值由开发者本地配置）。 */
  devDefaultUsername: import.meta.env.VITE_DEV_DEFAULT_USERNAME || "",
  /** 开发环境默认管理员密码（仅用于 Login 页面提示，实际值由开发者本地配置）。 */
  devDefaultPassword: import.meta.env.VITE_DEV_DEFAULT_PASSWORD || "",
} as const;

/** 运行时配置类型，便于在函数签名/注入时引用。 */
export type Env = typeof env;
