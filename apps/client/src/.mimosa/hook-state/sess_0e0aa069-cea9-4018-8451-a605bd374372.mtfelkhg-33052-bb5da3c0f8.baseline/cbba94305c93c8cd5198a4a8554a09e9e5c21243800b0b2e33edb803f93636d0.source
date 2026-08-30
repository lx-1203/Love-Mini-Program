/// <reference types="vite/client" />
/// <reference types="@dcloudio/types" />

/**
 * Vite 环境变量类型声明。
 *
 * 显式声明后，业务代码可直接通过 `import.meta.env.XXX` 访问，
 * Vite 在构建时会把这些引用静态替换为 `.env` 文件中的字面量。
 */
interface ImportMetaEnv {
  /** API 模式：real | mock */
  readonly VITE_API_MODE?: string;
  /** API 基础地址 */
  readonly VITE_API_BASE_URL?: string;
  /** 应用版本号 */
  readonly VITE_APP_VERSION?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
