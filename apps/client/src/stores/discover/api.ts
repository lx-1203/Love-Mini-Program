/**
 * Discover Store API 调用函数
 *
 * 集中封装寻觅页相关的所有后端 API 调用。
 * 每个 API 函数均为纯调用，不依赖 store 状态，返回值由 store action 处理。
 *
 * 端点说明：
 * - POST /api/matches/pass            - 左滑（不感兴趣）
 * - POST /api/matches/like            - 右滑（喜欢）
 * - POST /api/matches/super-like      - 超级喜欢
 * - POST /api/matches/rewind          - 反悔上一张卡片
 * - GET  /api/recommendations/history - 获取推荐历史
 * - GET  /api/online-status           - 批量查询在线状态
 *
 * 注意：推荐列表（getRecommendations）通过 clientApi 统一分发，
 * 由 clientApi 内部根据 appEnv.apiMode 自动选择 mock/real，
 * 因此本文件不直接封装推荐列表请求。
 */

import { request } from "../../services/http";
import { clientApi } from "../../services/api";
import type { OnlineStatusView, RecommendationFilter, RecommendedPerson } from "../../services/generated/api-types-supplement";
import type { RecommendedPersonView } from "./types";

/**
 * 右滑（喜欢/超级喜欢）API 响应数据
 */
export interface LikeApiResponse {
  /** 是否匹配成功 */
  matched: boolean;
  /** 匹配 ID（匹配成功时返回） */
  matchId?: string;
  /** 对方昵称（匹配成功时返回） */
  partnerName?: string;
}

/**
 * 反悔操作 API 响应数据
 */
export interface RewindApiResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 提示消息 */
  message: string;
}

/**
 * 获取推荐人物列表
 *
 * Phase C 重构：统一通过 clientApi.getRecommendations 调度，
 * clientApi 内部根据 appEnv.apiMode 自动分发 mock / real 模式：
 * - mock 模式：走 mockFixtures.getRecommendations
 * - real 模式：走 /recommendations?xxx query string
 *
 * @param filter - 推荐筛选条件对象
 * @returns 后端返回的推荐人物列表
 */
export async function fetchRecommendationsApi(
  filter: RecommendationFilter
): Promise<RecommendedPerson[]> {
  return clientApi.getRecommendations(filter);
}

/**
 * 左滑（不感兴趣）
 *
 * @param currentUserId - 当前用户 ID
 * @param passedUserId - 被左滑的用户 ID
 * @returns Promise<void>
 */
export async function passUserApi(
  currentUserId: string,
  passedUserId: string
): Promise<void> {
  return request<void>({
    url: "/matches/pass",
    method: "POST",
    data: {
      userId: currentUserId,
      passedUserId,
    },
  });
}

/**
 * 右滑（喜欢/超级喜欢）
 *
 * @param currentUserId - 当前用户 ID
 * @param targetUserId - 目标用户 ID
 * @param isSuperLike - 是否为超级喜欢
 * @returns 匹配结果
 */
export async function likeUserApi(
  currentUserId: string,
  targetUserId: string,
  isSuperLike: boolean
): Promise<LikeApiResponse> {
  return request<LikeApiResponse>({
    url: isSuperLike ? "/matches/super-like" : "/matches/like",
    method: "POST",
    data: {
      userId: currentUserId,
      targetUserId,
      isSuperLike,
    },
  });
}

/**
 * 反悔上一张卡片
 *
 * @param currentUserId - 当前用户 ID
 * @returns 后端处理结果
 */
export async function rewindCardApi(
  currentUserId: string
): Promise<RewindApiResponse> {
  return request<RewindApiResponse>({
    url: "/matches/rewind",
    method: "POST",
    data: { userId: currentUserId },
  });
}

/**
 * 获取推荐历史
 *
 * @param userId - 当前用户 ID
 * @returns 后端 RecommendedPersonView 列表
 */
export async function fetchRecommendationHistoryApi(
  userId: string
): Promise<RecommendedPersonView[]> {
  return request<RecommendedPersonView[]>({
    url: `/recommendations/history?userId=${userId}`,
    method: "GET",
  });
}

/**
 * 批量查询用户在线状态
 *
 * @param userIds - 用户 ID 列表（最多 N 个，由后端限制）
 * @returns 在线状态视图列表
 */
export async function fetchOnlineStatusApi(
  userIds: string[]
): Promise<OnlineStatusView[]> {
  return request<OnlineStatusView[]>({
    url: `/online-status?userIds=${userIds.join(",")}`,
    method: "GET",
  });
}
