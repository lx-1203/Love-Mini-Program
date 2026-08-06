/**
 * Chat Store 消息发送 Actions
 *
 * 集中维护聊天消息发送（文本 / 语音）与消息投递状态管理行为。
 *
 * 拆分目的：原 chat/index.ts 单文件 555 行，违反单一职责原则。
 * 拆分后消息发送相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: ChatStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import {
  chatTransport,
  withMockMode,
} from "../higher-order";
import {
  saveMessageStatus,
  withSendRetry,
} from "../utils";
import { mockSession1, mockSessionMap } from "../mock-data";
import type {
  MessageDeliveryStatus,
  SendMessageRequest,
  TempChatSession,
} from "../types";
import type { ChatStoreThis } from "../store-type";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
// Task 31：网络请求超时控制
// P3 联调：normalizeApiPath 补齐 /v1 前缀（语音上传端点原缺 /v1，real 模式 404）
import { withTimeout, normalizeApiPath } from "@/services/http";
// infra R2-00022：语音上传 URL 拼接 apiBaseUrl（原硬编码 /api/chat/voice，
// apiBaseUrl 非根路径或不同域名时上传 404）
import { appEnv } from "@/services/env";

/** Task 31：语音上传默认超时时间（30s，语音文件较大） */
const VOICE_UPLOAD_TIMEOUT_MS = 30000;

/** infra R2-00085: 消息 sendId/mock 消息 id 递增计数器（同毫秒连发避免 Date.now() 碰撞） */
let messageIdSeq = 0;

/**
 * 上传语音文件到后端（Task 1.1.4）。
 *
 * 调用 `uni.uploadFile` 将 mp-weixin 录音器产生的临时文件上传至
 * `POST /api/chat/voice`（由 `VoiceMessageController` 处理），
 * 后端校验大小/格式后存储并返回 `{ url, duration, size }`。
 *
 * Mock 模式下不发起真实网络请求，返回本地占位 URL，
 * 保证 dev 环境流程可走通且不依赖录音文件实际存在。
 *
 * 兼容性：
 * - mp-weixin：tempFilePath 为 wxfile:// 协议，uni.uploadFile 直接支持
 * - H5：tempFilePath 通常为空（H5 端 createRecorder 模拟录音），
 *   调用方应在 H5 端跳过上传，仅以 durationSeconds 占位发送
 *
 * @param tempFilePath 录音文件临时路径
 * @param durationSeconds 语音时长（秒）
 * @returns 上传成功后的语音文件 URL；上传失败抛出 Error
 */
async function uploadVoiceFile(
  tempFilePath: string,
  durationSeconds: number
): Promise<string> {
  if (!tempFilePath) {
    throw new Error(t("storeErrors.chat.voiceFilePathEmpty"));
  }

  // Task 31：使用 AbortController 实现超时控制
  const controller = new AbortController();
  const uploadPromise = new Promise<string>((resolve, reject) => {
    uni.uploadFile({
      url: `${appEnv.apiBaseUrl}${normalizeApiPath("/chat/voice")}`,
      filePath: tempFilePath,
      name: "file",
      formData: {
        duration: String(durationSeconds),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed: unknown = JSON.parse(res.data);
            const payload = parsed as { url?: string; duration?: number; size?: number };
            if (typeof payload.url === "string" && payload.url.length > 0) {
              resolve(payload.url);
              return;
            }
            reject(new Error("语音上传响应缺少 url 字段"));
          } catch (e) {
            reject(
              new Error(
                `语音上传响应解析失败: ${e instanceof Error ? e.message : String(e)}`
              )
            );
          }
        } else {
          reject(new Error(`语音上传失败: HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || "语音上传请求失败"));
      },
    });
  });

  // Task 31：30s 超时控制，超时后调用方收到 EnhancedApiError（category=network, error=timeout）
  return withTimeout(uploadPromise, VOICE_UPLOAD_TIMEOUT_MS, controller.signal);
}

/**
 * 发送文本消息（带状态持久化与失败重试）。
 *
 * 修复（P1 BUG）：
 * 1. 新增消息投递状态持久化：通过 messageDeliveryStatus 映射表跟踪
 *    sending/sent/failed 状态，持久化到本地存储，确保刷新/切换会话后可恢复展示。
 * 2. 新增失败处理与重试：Real 模式下网络层错误自动重试 1 次，
 *    最终失败时设置 errorMessage 并标记消息为 failed。
 *
 * Task 1.1.5：使用 `SendMessageRequest` 接口替代内联对象 + 隐式断言，
 * 与后端 `Schemas["ChatMessageRequest"]` 契约对齐，消除 `as any` 类型漏洞。
 *
 * @param body - 消息正文
 */
export async function sendText(
  this: ChatStoreThis,
  body: string
): Promise<void> {
  if (!this.activeSession) {
    return;
  }

  // 修复（P1 BUG）：生成客户端 sendId 用于跟踪消息投递状态
  // infra R2-00085: 计数器+时间戳，避免同毫秒两连发产生重复 id
  const sendId = `send-${Date.now()}-${++messageIdSeq}`;
  this._setMessageStatus(sendId, "sending");

  try {
    // Task 1.1.5：构造强类型 SendMessageRequest，替代内联对象 + 隐式 any 推断
    const payload: SendMessageRequest = {
      sender: "self",
      kind: "text",
      body,
      durationSeconds: null,
    };

    // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
    // 修复（P1 BUG）：Real 模式新增 withSendRetry 重试机制
    await withMockMode(
      this,
      // Mock 模式：在本地会话中追加消息
      () => {
        const sessionId = this.activeSession!.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const updatedSession: TempChatSession = {
          ...currentSession,
          phase: "active",
          messages: [
            ...currentSession.messages,
            {
              id: `m-${Date.now()}-${++messageIdSeq}`, // infra R2-00085: 避免同毫秒碰撞
              sender: "self",
              kind: "text",
              body,
              sentAt: new Date().toISOString(),
              durationSeconds: null,
              recalled: false,
              deliveryStatus: "sent" as const,
            },
          ],
        };
        mockSessionMap[sessionId] = updatedSession;
        return updatedSession;
      },
      // Real 模式：调用后端 API 发送消息（带重试）
      // Task 1.1.5：payload 已是强类型 SendMessageRequest，与 ChatMessageRequest 结构对齐
      () =>
        withSendRetry(() =>
          chatTransport.pushMessage(this.activeSession!.id, payload)
        )
    );
    // 发送成功，更新状态为 sent
    this._setMessageStatus(sendId, "sent");
  } catch (error) {
    // 修复（P1 BUG）：发送失败，更新状态为 failed 并设置 errorMessage
    this._setMessageStatus(sendId, "failed");
    this.errorMessage =
      error instanceof Error ? error.message : "发送消息失败，请重试";
  }
}

/**
 * 发送语音消息（Task 1.1.4：集成 uni.getRecorderManager + uni.uploadFile）。
 *
 * 流程：
 * 1. mp-weixin：调用 `uni.uploadFile` 将录音临时文件上传至 `POST /api/chat/voice`
 *    后端 `VoiceMessageController` 返回音频 URL
 * 2. 通过 `chatTransport.pushMessage` 发送 kind="voice" 的消息，body 为音频 URL
 * 3. H5：tempFilePath 为空时降级为占位 body（保留会话流程，便于 UI 验证）
 *
 * @param durationSeconds - 语音时长（秒）
 * @param tempFilePath - 录音文件临时路径（mp-weixin 由 RecorderManager.onStop 提供）
 */
export async function sendVoice(
  this: ChatStoreThis,
  durationSeconds: number,
  tempFilePath?: string
): Promise<void> {
  if (!this.activeSession) {
    return;
  }

  // Task 1.1.4：Real 模式下先上传录音文件，拿到 URL 后再发送消息
  // Mock 模式或 H5 端（tempFilePath 为空）跳过上传，使用占位 body（infra R2-00086: 走 i18n）
  let voiceBody = t("chat.voicePlaceholder");
  if (tempFilePath && tempFilePath.length > 0) {
    try {
      voiceBody = await uploadVoiceFile(tempFilePath, durationSeconds);
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : "语音上传失败，请重试";
      throw error;
    }
  }

  // Task 1.1.5：构造强类型 SendMessageRequest
  const payload: SendMessageRequest = {
    sender: "self",
    kind: "voice",
    body: voiceBody,
    durationSeconds,
  };

  // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
  await withMockMode(
    this,
    // Mock 模式：在本地会话中追加语音消息
    () => {
      const sessionId = this.activeSession!.id;
      const currentSession = mockSessionMap[sessionId] ?? mockSession1;
      const updatedSession: TempChatSession = {
        ...currentSession,
        phase: "active",
        messages: [
          ...currentSession.messages,
          {
            id: `m-${Date.now()}`,
            sender: "self",
            kind: "voice",
            body: voiceBody,
            sentAt: new Date().toISOString(),
            durationSeconds,
            recalled: false,
            deliveryStatus: "sent" as const,
          },
        ],
      };
      mockSessionMap[sessionId] = updatedSession;
      return updatedSession;
    },
    // Real 模式：调用后端 API 发送语音消息（携带上传后的 URL）
    () => chatTransport.pushMessage(this.activeSession!.id, payload)
  );
}

/**
 * 更新消息投递状态（内部辅助方法）。
 *
 * 修复（P1 BUG）：原 sendText 无状态持久化，页面刷新或切换会话后，
 * 用户无法感知上一条消息是否发送成功。
 * 现将消息投递状态写入 state.messageDeliveryStatus 并同步到本地存储，
 * 确保跨会话/刷新后仍可恢复展示。
 *
 * @param sendId - 客户端生成的消息发送唯一 ID
 * @param status - 消息投递状态：sending / sent / failed
 */
export function _setMessageStatus(
  this: ChatStoreThis,
  sendId: string,
  status: MessageDeliveryStatus
): void {
  this.messageDeliveryStatus = {
    ...this.messageDeliveryStatus,
    [sendId]: status,
  };
  saveMessageStatus(this.messageDeliveryStatus);
}
