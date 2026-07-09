/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_MODE?: string;
  /** 开发环境默认管理员用户名（仅占位，实际值由开发者本地配置，生产环境不读取） */
  readonly VITE_DEV_DEFAULT_USERNAME?: string;
  /** 开发环境默认管理员密码（仅占位，实际值由开发者本地配置，生产环境不读取） */
  readonly VITE_DEV_DEFAULT_PASSWORD?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
