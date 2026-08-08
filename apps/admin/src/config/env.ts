/**
 * Admin v2 运行时配置统一封装（复制自旧后台 apps/admin，保持契约不变）。
 *
 * 设计目标：
 * - 将 Vite 环境变量（import.meta.env.*）集中封装为类型安全的 `env` 对象，
 *   避免业务代码散落 `import.meta.env.VITE_*` 字面量，便于静态分析与替换。
 * - `isDev` 通过 `import.meta.env.MODE === 'development'` 判定，
 *   Vite 构建时会替换为常量，生产构建可被压缩器 dead-code eliminate。
 * - `devAdminToken` 等 dev 凭据仅在开发构建（MODE === "development"）下读取
 *   `VITE_DEV_*`；三元表达式在构建期求值——即使生产构建机残留 VITE_DEV_*
 *   环境变量，生产包中这些字段也恒为空字符串，dev 回退登录分支无法被触发
 *   （R4-00442 构建期强制校验无 VITE_DEV_* 残留）。
 *
 * 使用约束：
 * - 业务代码（stores/views/components）应仅引用 `env`，禁止直接访问 `import.meta.env`。
 * - 新增环境变量时，同步更新 `env.d.ts` 的 `ImportMetaEnv` 接口与本文件 `env` 对象。
 */

/** 是否为开发环境（vite dev 模式）。生产构建时为 false。 */
const isDev = import.meta.env.MODE === "development";

/** 运行时配置对象，业务代码统一通过此对象读取环境变量。 */
export const env = {
  /** 是否为开发环境（vite dev 模式）。生产构建时为 false。 */
  isDev,
  /** 后端 API 基础地址，默认 `/api`（由 vite proxy 转发到后端）。 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  /** 开发环境管理员 token，由 `.env.development` 的 `VITE_DEV_ADMIN_TOKEN` 注入；仅开发构建可读，生产恒为空。 */
  devAdminToken: isDev ? (import.meta.env.VITE_DEV_ADMIN_TOKEN || "") : "",
  /** 开发环境默认管理员用户名（仅用于 Login 页面提示，实际值由开发者本地配置）；仅开发构建可读，生产恒为空。 */
  devDefaultUsername: isDev ? (import.meta.env.VITE_DEV_DEFAULT_USERNAME || "") : "",
  /** 开发环境默认管理员密码（仅用于 Login 页面提示，实际值由开发者本地配置）；仅开发构建可读，生产恒为空。 */
  devDefaultPassword: isDev ? (import.meta.env.VITE_DEV_DEFAULT_PASSWORD || "") : "",
} as const;

/** 运行时配置类型，便于在函数签名/注入时引用。 */
export type Env = typeof env;
