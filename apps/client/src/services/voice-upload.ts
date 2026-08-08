/**
 * 语音文件上传服务（录音链路修复）。
 *
 * 抽取自原 stores/chat/actions/messaging.ts 的 uploadVoiceFile，
 * 供两条语音发送链路复用：
 * - 临时匿名会话：chatStore.sendVoice → uploadVoiceFile → pushMessage
 * - 私信会话：messagesStore.sendVoiceMessage → uploadVoiceFile → POST 私信消息
 *
 * 修复内容（录音不可以用）：
 * 1. 原实现直接调用 uni.uploadFile 但未附加 Authorization 头，
 *    而 VoiceMessageController 标注 @PreAuthorize("hasRole('USER')")，
 *    real 模式下上传必然 401 失败。现与 services/api.ts 的
 *    uploadFileViaUni 保持一致，携带 Bearer token。
 * 2. 上传端点为 POST /api/v1/chat/voice（经 normalizeApiPath 补齐 /v1 前缀），
 *    后端校验格式/大小后返回 { url, duration, size }。
 *
 * 使用方式：
 * <pre>{@code
 *   const url = await uploadVoiceFile(tempFilePath, durationSeconds);
 * }</pre>
 */

import { t } from "@/i18n";
import { appEnv } from "./env";
import { getToken, normalizeApiPath, withTimeout } from "./http";

/** 语音上传默认超时时间（30s，语音文件较大） */
const VOICE_UPLOAD_TIMEOUT_MS = 30000;

/**
 * 上传语音文件到后端。
 *
 * 调用 `uni.uploadFile` 将 mp-weixin 录音器产生的临时文件上传至
 * `POST /api/v1/chat/voice`（由 `VoiceMessageController` 处理），
 * 后端校验大小/格式后存储并返回 `{ url, duration, size }`。
 *
 * 兼容性：
 * - mp-weixin：tempFilePath 为 wxfile:// 协议，uni.uploadFile 直接支持
 * - H5：tempFilePath 通常为空（H5 端 createRecorder 模拟录音），
 *   调用方应在上传前跳过（mock 模式同理，不发起真实网络请求）
 *
 * @param tempFilePath 录音文件临时路径
 * @param durationSeconds 语音时长（秒）
 * @returns 上传成功后的语音文件 URL；上传失败抛出 Error
 */
export async function uploadVoiceFile(
  tempFilePath: string,
  durationSeconds: number
): Promise<string> {
  if (!tempFilePath) {
    throw new Error(t("storeErrors.chat.voiceFilePathEmpty"));
  }

  // 超时控制：30s 后 abort 底层上传任务
  const controller = new AbortController();
  const uploadPromise = new Promise<string>((resolve, reject) => {
    uni.uploadFile({
      url: `${appEnv.apiBaseUrl}${normalizeApiPath("/chat/voice")}`,
      filePath: tempFilePath,
      name: "file",
      formData: {
        duration: String(durationSeconds),
      },
      // 录音修复：附加 JWT，否则上传接口 @PreAuthorize 401 拒绝
      header: {
        Authorization: `Bearer ${getToken()}`,
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

  // 超时后调用方收到 EnhancedApiError（category=network, error=timeout）
  return withTimeout(uploadPromise, VOICE_UPLOAD_TIMEOUT_MS, controller.signal);
}
