/**
 * Chat Store 常量定义
 *
 * 集中维护聊天 store 用到的常量，便于统一调整与测试覆盖。
 *
 * 拆分目的：原 chat.ts 单文件 944 行，违反单一职责原则。
 * 拆分后常量独立成文件，被 utils / index 复用。
 *
 * 重构说明：常量已迁移到 src/constants/chat.ts 统一管理。
 * 本文件改为 re-export，保持现有 import 路径兼容（chat/utils.ts、chat/index.ts 等）。
 */

export {
  MESSAGE_STATUS_STORAGE_KEY,
  MAX_SEND_RETRIES,
  SEND_RETRY_DELAY_MS,
} from "../../constants/chat";
