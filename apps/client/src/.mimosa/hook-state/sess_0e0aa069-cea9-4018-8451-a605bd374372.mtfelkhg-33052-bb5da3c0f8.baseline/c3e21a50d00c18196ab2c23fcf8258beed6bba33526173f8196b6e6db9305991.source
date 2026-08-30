/**
 * Chat Store 入口（re-export）
 *
 * 实际实现已拆分到 ./chat/ 目录，遵循单一职责原则：
 * - ./chat/types.ts         类型定义（MessageDeliveryStatus / ChatStoreLike / TempChatSession 等）
 * - ./chat/constants.ts     常量（MESSAGE_STATUS_STORAGE_KEY / MAX_SEND_RETRIES 等）
 * - ./chat/mock-data.ts     Mock 数据（mockSession1 / mockSession2 / mockChatOverview 等）
 * - ./chat/utils.ts         工具函数（useMock / loadMessageStatus / withSendRetry）
 * - ./chat/higher-order.ts  高阶函数与传输层实例（chatTransport / withErrorHandling / withMockMode）
 * - ./chat/index.ts         Store 主体定义（state / actions）
 *
 * 通过 re-export 保持外部 import 路径完全兼容：
 *   import { useChatStore } from "@/stores/chat";
 *
 * 拆分目的：原 chat.ts 单文件 944 行，违反单一职责原则。
 * 拆分后各文件聚焦单一关注点，便于维护与测试。
 */
export * from "./chat/index";
