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
 */

import { CAMPUS_IMAGES, HOME_POSTER } from "../config/assets-index";
import { request } from "./http";

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
 * 调用后端代理生成视频。
 *
 * @param params - 视频生成参数（prompt 必填，其余有默认值）
 * @returns 视频生成任务视图（含任务 ID 与状态）
 */
export async function callVideoGenerate(
  params: VideoGenerateParams
): Promise<VideoGenerateResponse> {
  return request<VideoGenerateResponse, {
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
  });
}

/**
 * 调用后端代理生成图片。
 *
 * @param params - 图片生成参数（prompt 必填，其余有默认值）
 * @returns 图片生成结果（包含图片 URL）
 */
export async function callImageGenerate(
  params: ImageGenerateParams
): Promise<ImageGenerateResponse> {
  return request<ImageGenerateResponse, {
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
  });
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
 * @returns 健康检查响应（含状态字段）
 */
export async function checkApiHealth(): Promise<ApiHealthResponse> {
  return request<ApiHealthResponse>({
    url: BACKEND_AI_HEALTH,
    method: "GET",
  });
}
