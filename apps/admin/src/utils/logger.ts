// ============================================================
// Admin v2 统一日志工具（复制自旧后台 apps/admin）
// ------------------------------------------------------------
// 设计目标：
//   1. 替代散落在视图/store 中的 console.* 直接调用，统一日志入口；
//   2. 生产环境自动静默 debug 日志，避免污染控制台；
//   3. error/warn 始终输出，便于线上问题定位；
//   4. 携带 [LEVEL] 前缀，方便 console 过滤与日志采集工具解析。
//
// 使用方式：
//   import { logger } from "@/utils/logger";
//   logger.debug("fetchUsers", query); // 仅 dev 输出
//   logger.error("login failed", err); // 始终输出
// ============================================================

/** 当前是否为开发环境（import.meta.env.MODE 由 Vite 注入） */
const isDev: boolean = import.meta.env.MODE === "development";

/**
 * 统一 logger 对象。
 *
 * - debug：仅 dev 输出，prod 自动静默（避免泄露调试信息）
 * - info / warn / error：始终输出，便于线上问题定位
 *
 * 所有方法均接收可变参数，转发给对应 console 方法，
 * 并在首参数前附加 [LEVEL] 前缀，便于控制台过滤。
 */
export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug("[DEBUG]", ...args);
    }
  },
  info: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.info("[INFO]", ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]): void => {
    console.error("[ERROR]", ...args);
  },
};

export default logger;
