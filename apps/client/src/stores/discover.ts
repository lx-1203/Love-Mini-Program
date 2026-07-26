/**
 * Discover Store 入口（re-export）
 *
 * 实际实现已拆分到 ./discover/ 目录，遵循单一职责原则：
 * - ./discover/types.ts        类型定义（DiscoverCard / DiscoverState / SwipeDirection 等）
 * - ./discover/constants.ts    常量（DAILY_LIMIT_TOTAL / SAVE_DEBOUNCE_MS 等）
 * - ./discover/utils.ts        工具函数（mapToDiscoverCard / withRetry / 本地存储）
 * - ./discover/api.ts          API 调用函数（passUserApi / likeUserApi 等）
 * - ./discover/index.ts        Store 主体定义（state / getters / actions）
 *
 * 通过 re-export 保持外部 import 路径完全兼容：
 *   import { useDiscoverStore, DiscoverCard, SwipeDirection } from "@/stores/discover";
 *
 * 拆分目的：原 discover.ts 单文件 1258 行，违反单一职责原则。
 * 拆分后各文件聚焦单一关注点，便于维护与测试。
 */
export * from "./discover/index";
