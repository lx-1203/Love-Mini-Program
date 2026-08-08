/**
 * Agnes AI 视频和图片生成服务
 *
 * API 基础: https://api.agnes-ai.com/api/
 * 文档: https://agnes-ai.com/zh-Hans/docs/agnes-video-v20
 *
 * 已验证端点:
 *   GET  /health          → 200 OK
 *   POST /chat/completions → 401 (need valid key)
 *   POST /video/generate   → 401 (need valid key)
 *   POST /image/generate   → 401 (need valid key)
 *
 * 重构（P3 代码风格）：原实现直接调用 uni.request 重复书写
 * header/method/data 模板，且未走 services/http.ts 的统一拦截器链，
 * 缺少 JWT 自动附加、错误规范化、超时重试等能力。现统一改用 http.ts
 * 的 request()，URL 去掉 `/api` 前缀（http.ts 会自动拼接 apiBaseUrl，
 * 该地址在所有环境下均以 `/api` 结尾）。
 *
 * SubTask 1.4.5：AI 服务调用特殊性：
 * 1. 超时：视频/图片生成耗时较长，使用 AI_API_TIMEOUT_MS（30s），
 *    避免默认 10s 超时误判正常长耗时请求为失败。
 * 2. 401 处理：AI 上游 401（API Key 失效）与用户 JWT 401 不同——
 *    通过 skipAuthRefresh=true 跳过 http.ts 的 token 刷新与登录跳转，
 *    改为返回业务错误码 AI_API_UNAUTHORIZED_CODE，由调用方提示用户。
 * 3. 错误规范化：包装为统一的 AppApiError，便于上层基于 error code 分发提示。
 */

import { CAMPUS_IMAGES, HOME_POSTER } from "../config/assets-index";
import { request } from "./http";
import { AppApiError } from "./api-error";
import {
  AI_API_TIMEOUT_MS,
  AI_API_UNAUTHORIZED_CODE,
  AI_API_ERROR_CODE,
} from "../constants/api";
// R4-batch2: AI 错误提示文案 i18n 化
import { t } from "@/i18n";

// ===== 后端代理端点（去掉 /api 前缀，由 http.ts 拼接 apiBaseUrl） =====
const BACKEND_AI_VIDEO = "/ai/video/generate";
const BACKEND_AI_IMAGE = "/ai/image/generate";
const BACKEND_AI_HEALTH = "/ai/health";

// ===== 素材访问 =====
// 注：原 getHomeVideoUrl 已删除（缺失视频文件）。如需启用，请先在 assets-index.ts 中补充视频路径。

/**
 * 获取首页海报素材 URL。
 * @returns 海报图片 URL 字符串
 */
export function getHomePosterUrl(): string {
  return HOME_POSTER;
}

/**
 * 根据键名获取校园主题图片 URL。
 * @param key - CAMPUS_IMAGES 中的键名
 * @returns 图片 URL 字符串
 */
export function getCampusImage(key: keyof typeof CAMPUS_IMAGES): string {
  return CAMPUS_IMAGES[key];
}

/**
 * 获取所有校园主题图片 URL 列表。
 * @returns 图片 URL 字符串数组
 */
export function getAllCampusImages(): string[] {
  return Object.values(CAMPUS_IMAGES);
}

// ===== API 调用 =====
interface VideoGenerateParams {
  prompt: string;
  duration?: number;
  style?: string;
  resolution?: string;
}

interface ImageGenerateParams {
  prompt: string;
  n?: number;
  size?: string;
}

/** 视频生成响应体 */
interface VideoGenerateResponse {
  id: string;
  status: string;
  videoUrl?: string;
  posterUrl?: string;
  error?: string;
}

/** 图片生成响应体 */
interface ImageGenerateResponse {
  data?: { url: string }[];
  url?: string;
  image_url?: string;
}

/** 健康检查响应体 */
interface ApiHealthResponse {
  code: string;
  message: string;
  data: { status: string };
}

/**
 * SubTask 1.4.5：将底层 request 抛出的错误统一包装为 AppApiError。
 *
 * <p>处理三类错误：</p>
 * <ul>
 *   <li>AI_API_UNAUTHORIZED：上游 AI 服务 401（API Key 失效或未配置），
 *       提示"AI 服务未授权"，不触发登录跳转</li>
 *   <li>AI_API_ERROR：上游 AI 服务 5xx/网络异常，
 *       提示"AI 服务暂时不可用"</li>
 *   <li>其他错误：保留原始错误信息向上抛出</li>
 * </ul>
 *
 * @param error request() 抛出的原始错误
 * @param operation 操作名（"video"/"image"/"health"），用于日志上下文
 * @returns 统一的 AppApiError，调用方可通过 error code 分发提示
 */
function wrapAiError(error: unknown, operation: string): AppApiError {
  // 已经是 AppApiError/EnhancedApiError：根据 error code 重映射为用户友好提示
  if (error instanceof AppApiError) {
    const upstreamCode = error.error;
    // 后端 GlobalExceptionHandler 返回的业务错误码优先
    if (upstreamCode === AI_API_UNAUTHORIZED_CODE) {
      return new AppApiError({
        status: error.status,
        error: AI_API_UNAUTHORIZED_CODE,
        message: t("apiErrors.aiUnauthorized"),
        details: { operation, upstreamMessage: error.message },
      });
    }
    if (upstreamCode === AI_API_ERROR_CODE) {
      return new AppApiError({
        status: error.status,
        error: AI_API_ERROR_CODE,
        message: t("apiErrors.aiUnavailable"),
        details: { operation, upstreamMessage: error.message },
      });
    }
    // 兜底：HTTP 401 但未带 AI 业务错误码（理论上后端会带，防御性处理）
    if (error.status === 401) {
      return new AppApiError({
        status: 401,
        error: AI_API_UNAUTHORIZED_CODE,
        message: t("apiErrors.aiUnauthorized"),
        details: { operation, upstreamMessage: error.message },
      });
    }
    // 5xx 或网络层错误归为 AI_API_ERROR
    if (error.status === 0 || error.status >= 500) {
      return new AppApiError({
        status: error.status,
        error: AI_API_ERROR_CODE,
        message: t("apiErrors.aiUnavailable"),
        details: { operation, upstreamMessage: error.message },
      });
    }
    // 其他业务错误（如 400 参数错误）保留原状
    return error;
  }
  // 非 AppApiError（如原生 Error、网络异常）：统一归为 AI_API_ERROR
  const message = error instanceof Error ? error.message : "未知错误";
  return new AppApiError({
    status: 0,
    error: AI_API_ERROR_CODE,
    message: t("apiErrors.aiUnavailable"),
    details: { operation, rawError: message },
  });
}

/**
 * 调用后端代理生成视频。
 *
 * @param params - 视频生成参数（prompt 必填，其余有默认值）
 * @returns 视频生成任务视图（含任务 ID 与状态）
 *
 * @throws {AppApiError} error=AI_API_UNAUTHORIZED_CODE 表示 API Key 未配置/失效；
 *                      error=AI_API_ERROR_CODE 表示上游服务异常或网络错误。
 */
export async function callVideoGenerate(
  params: VideoGenerateParams
): Promise<VideoGenerateResponse> {
  try {
    return await request<VideoGenerateResponse, {
      prompt: string;
      duration: number;
      style: string;
      resolution: string;
    }>({
      url: BACKEND_AI_VIDEO,
      method: "POST",
      data: {
        prompt: params.prompt,
        duration: params.duration || 5,
        style: params.style || "campus",
        resolution: params.resolution || "720p",
      },
      // SubTask 1.4.5：AI 生成耗时较长，使用 30s 超时
      timeout: AI_API_TIMEOUT_MS,
      // SubTask 1.4.5：上游 AI 401 不应触发用户登录跳转
      skipAuthRefresh: true,
    });
  } catch (error) {
    throw wrapAiError(error, "video");
  }
}

/**
 * 调用后端代理生成图片。
 *
 * @param params - 图片生成参数（prompt 必填，其余有默认值）
 * @returns 图片生成结果（包含图片 URL）
 *
 * @throws {AppApiError} error=AI_API_UNAUTHORIZED_CODE 表示 API Key 未配置/失效；
 *                      error=AI_API_ERROR_CODE 表示上游服务异常或网络错误。
 */
export async function callImageGenerate(
  params: ImageGenerateParams
): Promise<ImageGenerateResponse> {
  try {
    return await request<ImageGenerateResponse, {
      prompt: string;
      n: number;
      size: string;
    }>({
      url: BACKEND_AI_IMAGE,
      method: "POST",
      data: {
        prompt: params.prompt,
        n: params.n || 1,
        size: params.size || "1024x1024",
      },
      // SubTask 1.4.5：AI 生成耗时较长，使用 30s 超时
      timeout: AI_API_TIMEOUT_MS,
      // SubTask 1.4.5：上游 AI 401 不应触发用户登录跳转
      skipAuthRefresh: true,
    });
  } catch (error) {
    throw wrapAiError(error, "image");
  }
}

// ===== 校园主题提示词 =====
export const CAMPUS_VIDEO_PROMPTS = {
  spring: "青春校园，春光明媚，樱花树下学生们漫步聊天，图书馆前草坪上读书，阳光洒在教学楼，温馨浪漫的大学时光",
  sunset: "傍晚的大学校园，夕阳余晖下情侣在湖边散步，路灯渐亮，梧桐叶飘落，温暖柔和的慢镜头画面",
  life: "大学生活场景：教室里认真听课，操场上跑步打球，食堂里一起用餐，社团活动欢声笑语，青春洋溢的校园日常",
  graduation: "毕业季场景：穿着学士服合影，抛学士帽，拥抱告别，青春的记忆，感人的校园时光",
} as const;

/**
 * 获取 API 状态（调试用，通过后端代理）。
 *
 * <p>SubTask 1.4.5：健康检查同样使用 AI 专用超时与 skipAuthRefresh，
 * 确保上游 AI Key 失效时不会误触发用户登录跳转。</p>
 *
 * @returns 健康检查响应（含状态字段）
 *
 * @throws {AppApiError} error=AI_API_UNAUTHORIZED_CODE 表示 API Key 未配置/失效；
 *                      error=AI_API_ERROR_CODE 表示上游服务异常或网络错误。
 */
export async function checkApiHealth(): Promise<ApiHealthResponse> {
  try {
    return await request<ApiHealthResponse>({
      url: BACKEND_AI_HEALTH,
      method: "GET",
      timeout: AI_API_TIMEOUT_MS,
      skipAuthRefresh: true,
    });
  } catch (error) {
    throw wrapAiError(error, "health");
  }
}
