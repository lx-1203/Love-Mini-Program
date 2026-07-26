/**
 * Discover Store 历史与在线状态 Actions
 *
 * 集中维护寻觅页推荐历史加载、在线状态查询、签到额外配额设置等行为。
 *
 * 拆分目的：原 discover/index.ts 单文件 1021 行，违反单一职责原则。
 * 拆分后历史与在线状态相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: DiscoverStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { useSessionStore } from "../../session";
import {
  fetchOnlineStatusApi,
  fetchRecommendationHistoryApi,
} from "../api";
import { useMock } from "../utils";
import type { SwipeDirection } from "../types";
import type { DiscoverStoreThis } from "../store-type";

/**
 * 从后端获取推荐历史
 * Real 模式调用 GET /api/recommendations/history?userId={userId}
 */
export async function loadHistory(
  this: DiscoverStoreThis
): Promise<void> {
  this.errorMessage = null;

  try {
    if (useMock()) {
      // Mock 模式下使用本地记录
      this.syncHistoryCards();
      return;
    }

    // 调用后端 API: GET /api/recommendations/history?userId={userId}
    const sessionStore = useSessionStore();
    const userId = sessionStore.userSession?.userId ?? "";
    const rawData = await fetchRecommendationHistoryApi(userId);

    // 将后端数据映射为 ViewedCardRecord（方向统一为 right，表示历史记录）
    this.historyCards = rawData.map((item) => ({
      cardId: String(item.id),
      userId: String(item.id),
      direction: "right" as SwipeDirection,
      viewedAt: new Date().toISOString(),
    }));
  } catch (error) {
    this.errorMessage =
      error instanceof Error ? error.message : "加载推荐历史失败";
  }
}

/**
 * 查询在线状态
 * 根据推荐卡片中的用户 ID 列表，批量查询在线状态并更新到卡片数据中
 * Mock 模式提供本地测试数据，Real 模式调用 GET /api/online-status?userIds=xxx
 */
export async function fetchOnlineStatus(
  this: DiscoverStoreThis
): Promise<void> {
  this.errorMessage = null;

  try {
    // 收集当前卡片中所有用户 ID
    const userIds = this.cards.map((c) => c.userId);
    if (userIds.length === 0) return;

    if (useMock()) {
      // Mock 模式：从本地卡片数据中提取已有的 onlineStatus，构建映射表
      const statusMap: Record<string, "online" | "away" | "offline"> = {};
      for (const card of this.cards) {
        if (card.onlineStatus) {
          statusMap[card.userId] = card.onlineStatus;
        }
      }
      this.onlineStatusMap = statusMap;
      return;
    }

    // 调用后端 API: GET /api/online-status?userIds=xxx,xxx
    const data = await fetchOnlineStatusApi(userIds);

    // 构建在线状态映射表
    const statusMap: Record<string, "online" | "away" | "offline"> = {};
    for (const item of data) {
      statusMap[String(item.userId)] =
        (item.status as "online" | "away" | "offline") ?? "offline";
    }
    this.onlineStatusMap = statusMap;

    // 同步更新卡片中的 onlineStatus 字段
    for (const card of this.cards) {
      card.onlineStatus = statusMap[card.userId] ?? "offline";
    }
  } catch (error) {
    this.errorMessage =
      error instanceof Error ? error.message : "查询在线状态失败";
  }
}

/**
 * 设置签到额外配额
 * 由签到成功后调用，增加今日推荐次数
 *
 * @param quota - 额外配额数量
 */
export function setExtraQuota(this: DiscoverStoreThis, quota: number): void {
  this.extraQuota = quota;
}
