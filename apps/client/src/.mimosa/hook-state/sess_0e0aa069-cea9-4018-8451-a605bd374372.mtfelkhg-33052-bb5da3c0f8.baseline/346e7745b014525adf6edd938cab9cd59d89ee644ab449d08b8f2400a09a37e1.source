/**
 * Discover Store API 调用函数
 *
 * 集中封装寻觅页相关的所有后端 API 调用。
 * 每个 API 函数均为纯调用，不依赖 store 状态，返回值由 store action 处理。
 *
 * 端点说明：
 * - POST /api/matches/pass?passedUserId=xxx - 左滑（不感兴趣，passedUserId 走 query）
 * - POST /api/matches/like                  - 右滑（喜欢）
 * - POST /api/matches/super-like            - 超级喜欢
 * - POST /api/matches/rewind                - 反悔上一张卡片
 * - GET  /api/recommendations/history       - 获取推荐历史
 * - POST /api/users/online-status/batch     - 批量查询在线状态
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
 *
 * 修复（P0-11）：后端 POST /api/matches/like、/api/matches/super-like
 * 返回 ApiResponse<HeartSignalView>（信封已由 http 拦截器解包为 HeartSignalView 或 null）：
 * - 非空：互相喜欢已生成心动信号（匹配成功），status 为信号状态枚举名
 *   （pending/accepted/expired/declined，新生成信号为 pending）
 * - null：未生成信号（单向喜欢或重复喜欢），视为「已喜欢」而非失败
 */
export interface LikeApiResponse {
  /** 是否匹配成功（后端返回非空 HeartSignalView 即互相喜欢） */
  matched: boolean;
  /** 心动信号 ID（匹配成功时返回） */
  matchId?: string;
  /** 对方昵称（匹配成功时返回；HeartSignalView.fromUserName 为发起方昵称，
   *  非本端视角的对方，实际展示以调用方持有的卡片数据为准） */
  partnerName?: string;
}

/**
 * 后端 HeartSignalView 类型
 * 对应后端 record HeartSignalView(Long id, Long userAId, Long userBId, String status,
 * String expiresAt, String createdAt, String fromUserName, String fromUserAvatar)。
 * status 为信号状态枚举名：pending / accepted / expired / declined（新生成信号为 pending）。
 */
export interface HeartSignalView {
  id: number;
  userAId: number;
  userBId: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  /** 发起方用户名称（userA） */
  fromUserName: string;
  /** 发起方用户头像（userA） */
  fromUserAvatar: string;
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
 * 修复（P0-08）：后端 MatchController.passUser 从 JWT 取当前用户，
 * passedUserId 通过 query 参数传递（@RequestParam），请求体为空。
 *
 * @param _currentUserId - 当前用户 ID（后端已从 JWT 获取，保留签名兼容调用方）
 * @param passedUserId - 被左滑的用户 ID
 * @returns Promise<void>
 */
export async function passUserApi(
  _currentUserId: string,
  passedUserId: string
): Promise<void> {
  return request<void>({
    url: `/matches/pass?passedUserId=${encodeURIComponent(passedUserId)}`,
    method: "POST",
  });
}

/**
 * 右滑（喜欢/超级喜欢）
 *
 * 修复（P0-11）：响应按后端 HeartSignalView 形状解析——
 * 非空视为匹配成功，null（重复喜欢等）视为「已喜欢」，不再因形状不匹配崩溃。
 *
 * @param _currentUserId - 当前用户 ID（后端从 JWT 取，保留签名兼容调用方）
 * @param targetUserId - 目标用户 ID
 * @param isSuperLike - 是否为超级喜欢
 * @returns 匹配结果
 */
export async function likeUserApi(
  _currentUserId: string,
  targetUserId: string,
  isSuperLike: boolean
): Promise<LikeApiResponse> {
  const data = await request<HeartSignalView | null>({
    url: isSuperLike ? "/matches/super-like" : "/matches/like",
    method: "POST",
    data: {
      targetUserId,
    },
  });
  // 仅后端生成心动信号（互相喜欢）时返回非空；null → 视为「已喜欢」
  return {
    matched: data !== null && data !== undefined,
    matchId: data ? String(data.id) : undefined,
    partnerName: data ? data.fromUserName : undefined,
  };
}

/**
 * 反悔上一张卡片
 *
 * P2-13：userId 由后端 JWT 获取（MatchController.rewind 无请求体参数），删除 body 字段；
 * 同时补齐 @Idempotent 要求的 Idempotency-Key 头（按用户+时间生成，重试同键幂等）。
 *
 * @returns 后端处理结果
 */
export async function rewindCardApi(): Promise<RewindApiResponse> {
  return request<RewindApiResponse>({
    url: "/matches/rewind",
    method: "POST",
    headers: { "Idempotency-Key": `rewind-${Date.now()}` },
  });
}

/**
 * 获取推荐历史
 *
 * P2-13：userId 由后端 JWT 获取（RecommendationController.getHistory 无 userId 参数），
 * 不再携带 query。
 *
 * @returns 后端 RecommendedPersonView 列表
 */
export async function fetchRecommendationHistoryApi(): Promise<RecommendedPersonView[]> {
  return request<RecommendedPersonView[]>({
    url: "/recommendations/history",
    method: "GET",
  });
}

/**
 * 批量查询用户在线状态
 *
 * 修复（P0-05）：原 GET /api/online-status?userIds=... 无对应后端端点，
 * 改为 POST /api/users/online-status/batch（UserController.batchGetOnlineStatus），
 * 请求体 { userIds: [...] }；响应为 Map<Long, OnlineStatusView>（信封已由
 * http 拦截器解包），此处转换为客户端 OnlineStatusView[] 供调用方消费。
 *
 * @param userIds - 用户 ID 列表（最多 500 条，由后端限制）
 * @returns 在线状态视图列表
 */
export async function fetchOnlineStatusApi(
  userIds: string[]
): Promise<OnlineStatusView[]> {
  // 后端批量端点：POST /users/online-status/batch，body { userIds: Long[] }
  // 后端 OnlineStatusView 形状为 { userId, status, lastHeartbeat, deviceType }
  const data = await request<Record<string, BackendOnlineStatusView>>({
    url: "/users/online-status/batch",
    method: "POST",
    data: { userIds },
  });
  // 后端返回 Map<Long, OnlineStatusView>：key 为用户 ID 字符串，value 含 status/lastHeartbeat
  return Object.entries(data ?? {}).map(([userId, view]) => ({
    userId,
    online: view.status === "online",
    lastSeenAt: view.lastHeartbeat || "",
    status: view.status,
  }));
}

/** 后端 OnlineStatusView 形状（UserController.batchGetOnlineStatus 响应项） */
interface BackendOnlineStatusView {
  userId: number;
  /** 在线状态：online / away / offline */
  status: "online" | "away" | "offline";
  /** 最后心跳时间（ISO 格式字符串），无记录时为 null */
  lastHeartbeat: string | null;
  /** 设备类型，无记录时为 null */
  deviceType: string | null;
}
