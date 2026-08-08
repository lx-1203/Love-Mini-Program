/**
 * 应用环境配置（兼容 shim）
 *
 * @deprecated 修复（R4-00148 / R4-00205）：环境配置已统一收敛至
 * `src/config/env.ts`（clientEnv / isDev / isMockMode / isRealMode /
 * isSentryEnabled / APP_VERSION / SENTRY_DSN），本文件不再持有任何实现，
 * 仅作为「纯 re-export 兼容层」保留给尚未迁移的既有调用方
 * （utils/media.ts、features/chat/transport.ts、guards/*、stores/* 已迁移；
 * 剩余 pages/* 与 components/* 目录因批次权限限制暂未迁移，见下方引用方）。
 *
 * 真相源说明：
 * - 本文件不再重复实现读取逻辑，全部符号经 re-export 指向 config/env.ts，
 *   从根源上消除「双实现行为漂移」（如 apiBaseUrl 后缀处理不一致）；
 * - `appEnv` 为历史命名，现等价于 `clientEnv`，新代码请直接使用 clientEnv。
 *
 * 待 pages/* 与 components/* 全部迁移后，删除本文件并全局替换 import。
 */
import { clientEnv } from "../config/env";

export {
  isDev,
  isMockMode,
  isRealMode,
  isSentryEnabled,
  APP_VERSION,
  SENTRY_DSN,
  clientEnv,
} from "../config/env";

/** 历史命名 appEnv → clientEnv（兼容既有调用方） */
export const appEnv = clientEnv;
