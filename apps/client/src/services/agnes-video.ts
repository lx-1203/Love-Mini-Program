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
 */

import { CAMPUS_VIDEOS, CAMPUS_IMAGES, HOME_VIDEO, HOME_POSTER } from "../config/assets-index";

// ===== Agnes AI 配置 =====
const AGNES_API_BASE = "https://api.agnes-ai.com/api";
const AGNES_API_KEY = "sk-PeAzA2C0MerWSzrqDbmiB0xFYTVFT3WJnzkfBC9zv0wjMWLT";

// ===== 素材访问 =====
export function getHomeVideoUrl(): string { return HOME_VIDEO; }
export function getHomePosterUrl(): string { return HOME_POSTER; }
export function getCampusImage(key: keyof typeof CAMPUS_IMAGES): string { return CAMPUS_IMAGES[key]; }
export function getAllCampusImages(): string[] { return Object.values(CAMPUS_IMAGES); }

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

/** 调用 Agnes AI 生成视频 */
export async function callVideoGenerate(params: VideoGenerateParams) {
  const response = await uni.request({
    url: AGNES_API_BASE + "/video/generate",
    method: "POST",
    header: { Authorization: "Bearer " + AGNES_API_KEY, "Content-Type": "application/json" },
    data: {
      prompt: params.prompt,
      duration: params.duration || 5,
      style: params.style || "campus",
      resolution: params.resolution || "720p",
    },
  });
  return response.data as { id: string; status: string; videoUrl?: string; posterUrl?: string; error?: string };
}

/** 调用 Agnes AI 生成图片 */
export async function callImageGenerate(params: ImageGenerateParams) {
  const response = await uni.request({
    url: AGNES_API_BASE + "/image/generate",
    method: "POST",
    header: { Authorization: "Bearer " + AGNES_API_KEY, "Content-Type": "application/json" },
    data: { prompt: params.prompt, n: params.n || 1, size: params.size || "1024x1024" },
  });
  return response.data as { data?: { url: string }[]; url?: string; image_url?: string };
}

// ===== 校园主题提示词 =====
export const CAMPUS_VIDEO_PROMPTS = {
  spring: "青春校园，春光明媚，樱花树下学生们漫步聊天，图书馆前草坪上读书，阳光洒在教学楼，温馨浪漫的大学时光",
  sunset: "傍晚的大学校园，夕阳余晖下情侣在湖边散步，路灯渐亮，梧桐叶飘落，温暖柔和的慢镜头画面",
  life: "大学生活场景：教室里认真听课，操场上跑步打球，食堂里一起用餐，社团活动欢声笑语，青春洋溢的校园日常",
  graduation: "毕业季场景：穿着学士服合影，抛学士帽，拥抱告别，青春的记忆，感人的校园时光",
} as const;

/** 获取 API 状态 (调试用) */
export async function checkApiHealth() {
  const response = await uni.request({
    url: AGNES_API_BASE + "/health",
    method: "GET",
  });
  return response.data as { code: string; message: string; data: { status: string } };
}
