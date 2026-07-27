/**
 * Chat Store 破冰话题 Actions
 *
 * 集中维护破冰话题的加载、发送、拉取行为。
 *
 * 拆分目的：原 chat/index.ts 单文件 555 行，违反单一职责原则。
 * 拆分后破冰话题相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: ChatStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { clientApi } from "../../../services/api";
import { request } from "../../../services/http";
import type { IcebreakerView } from "../../../services/generated/api-types-supplement";
import { toChatSessionView } from "../../../view-models/chat";
import {
  withErrorHandling,
} from "../higher-order";
import { useMock } from "../utils";
import { mockSession1, mockSessionMap } from "../mock-data";
import type { TempChatSession } from "../types";
import type { ChatStoreThis } from "../store-type";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t as translate } from "@/i18n";

/**
 * 加载破冰话题
 *
 * 根据匹配 ID 获取推荐破冰话题列表，用于引导用户开始对话。
 * Mock 模式提供本地测试数据，
 * Real 模式调用 GET /api/matches/{matchId}/icebreakers。
 *
 * @param matchId - 匹配 ID
 */
export async function loadIcebreakers(
  this: ChatStoreThis,
  matchId: number
): Promise<void> {
  // 使用 withErrorHandling 统一处理 loading 状态和错误消息
  // loadIcebreakers 不涉及 activeSession 和概览刷新，无需 withMockMode
  await withErrorHandling(
    this,
    { loadingKey: "loadingIcebreakers", errorPrefix: "加载破冰话题" },
    async () => {
      if (useMock()) {
        // Mock 模式：根据 matchId 返回预设的破冰话题
        const mockIcebreakers: Record<number, string[]> = {
          1: [
            "你们都喜欢看电影，最近有什么好片推荐吗？",
            "看到你也喜欢咖啡，你最喜欢哪种咖啡？",
            "你们有共同的朋友圈，要不要聊聊校园生活？",
          ],
          2: [
            "你们都选了美食话题，有没有推荐的校园美食？",
            "看到你也喜欢摄影，平时用什么相机？",
            "你们都在同一个城市，周末有什么好去处？",
          ],
        };
        this.icebreakerTopics = mockIcebreakers[matchId] ?? [
          "嗨，很高兴认识你！",
          "你们有共同的兴趣，聊聊看？",
          "最近有什么有趣的事想分享吗？",
        ];
        return;
      }

      // Real 模式：调用后端 API: GET /api/matches/{matchId}/icebreakers
      const data = await request<IcebreakerView>({
        url: `/matches/${matchId}/icebreakers`,
        method: "GET",
      });
      // IcebreakerView.topics 为 { id; title }[]，提取 title 作为话题文案
      this.icebreakerTopics = (data.topics ?? []).map((t) => t.title);
    }
  );
}

/**
 * 发送破冰话题到对话
 *
 * 将选中的破冰话题作为消息发送到当前活跃会话中。
 * Mock 模式直接追加消息，
 * Real 模式调用 POST /api/matches/{matchId}/icebreakers/send。
 *
 * 修复（P1 BUG）：新增回滚保护。Real 模式下若 icebreakers/send 成功但
 * sendText 失败，破冰话题已发送到后端但消息未追加到会话，此时：
 * 1. 不回滚后端 icebreakers/send（无法撤回）
 * 2. 设置明确的 errorMessage 提示用户「破冰话题已发送，但消息追加失败」
 * 3. 不向上抛出错误（操作部分成功，不应让调用方重试整个流程导致重复发送）
 *
 * @param matchId - 匹配 ID
 * @param topic - 选中的破冰话题内容
 */
export async function sendIcebreaker(
  this: ChatStoreThis,
  matchId: number,
  topic: string
): Promise<void> {
  // 使用 withErrorHandling 统一处理错误消息，rethrow: true 保留原有向上抛出错误的行为
  // sendIcebreaker 的 Mock/Real 分支逻辑差异较大（Real 分支调用 sendText），不适合 withMockMode
  await withErrorHandling(
    this,
    { errorPrefix: "发送破冰话题", rethrow: true },
    async () => {
      // 参数校验
      if (!topic || topic.trim().length === 0) {
        this.errorMessage = translate("storeErrors.chat.icebreakerContentEmpty");
        throw new Error(translate("storeErrors.chat.icebreakerContentEmpty"));
      }

      if (!this.activeSession) {
        this.errorMessage = translate("storeErrors.chat.noActiveSession");
        throw new Error(translate("storeErrors.chat.noActiveSession"));
      }

      if (useMock()) {
        // Mock 模式：在本地会话中追加破冰消息
        const sessionId = this.activeSession.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const updatedSession: TempChatSession = {
          ...currentSession,
          phase: "active",
          messages: [
            ...currentSession.messages,
            {
              id: `m-ice-${Date.now()}`,
              sender: "self" as const,
              kind: "text" as const,
              body: topic,
              sentAt: new Date().toISOString(),
              durationSeconds: null,
              recalled: false,
              deliveryStatus: "sent" as const,
            },
          ],
        };
        mockSessionMap[sessionId] = updatedSession;
        this.activeSession = toChatSessionView(updatedSession);
        await this.loadOverview();
        return;
      }

      // Real 模式：调用后端 API: POST /api/matches/{matchId}/icebreakers/send
      await request<void, { topic: string }>({
        url: `/matches/${matchId}/icebreakers/send`,
        method: "POST",
        data: { topic },
      });

      // 修复（P1 BUG）：sendText 失败时的回滚保护
      // icebreakers/send 已成功，若 sendText 失败，不向上抛出错误避免重复发送，
      // 而是设置明确的 errorMessage 提示用户消息追加失败。
      try {
        // 发送成功后，将话题作为普通消息追加到当前会话
        await this.sendText(topic);
      } catch (sendTextError) {
        // sendText 内部已设置 errorMessage，此处补充提示破冰话题已发送
        this.errorMessage = `破冰话题已发送，但消息追加失败：${
          sendTextError instanceof Error ? sendTextError.message : "未知错误"
        }`;
        // 不向上抛出，避免调用方重试导致 icebreakers/send 重复调用
      }
    }
  );
}

/**
 * 拉取破冰话题项（基于对方用户 ID）
 *
 * 通过 clientApi.getIcebreakers 获取完整的话题项列表（含 id、content、category、source），
 * 同时填充 icebreakerItems（完整结构）与 icebreakerTopics（前 3 条文案）。
 *
 * @param peerUserId - 对方用户 ID
 */
export async function fetchIcebreakers(
  this: ChatStoreThis,
  peerUserId: number
): Promise<void> {
  this.loadingIcebreakers = true;
  this.errorMessage = null;
  try {
    const data = await clientApi.getIcebreakers(peerUserId);
    this.icebreakerItems = data.items ?? [];
    this.icebreakerTopics = (data.items ?? []).slice(0, 3).map((item) => item.content);
  } catch (error) {
    this.errorMessage =
      error instanceof Error ? error.message : "加载破冰话题失败";
  } finally {
    this.loadingIcebreakers = false;
  }
}
