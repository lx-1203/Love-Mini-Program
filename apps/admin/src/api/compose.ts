/**
 * Admin v2 - 内容创作（运营代发）API 封装。
 *
 * 对应后端控制器：AdminContentComposeController
 * - POST /api/v1/admin/posts        新建帖子（作者固定为配置的「官方小编」账号，后台不可指定作者）
 * - POST /api/v1/admin/media/upload 图片上传（与小程序端同一存储实现，返回 /api/v1/media/... 相对 URL）
 *
 * 约定：
 * - 后台不提供帖子编辑端点（产品决策：存量内容只能审核/置顶/删除，见 forum.ts）；
 * - 上传的图片 URL 是「用户媒体」鉴权路径，展示时必须经 media.ts 的 withMediaToken 拼 token，
 *   否则 <img> 裸 URL 会 401 裂图；
 * - 小编账号未配置时后端返回 503 + 中文指引，两个函数都会以 ApiError 抛出（status=503）。
 */

import { t } from "../i18n";
import {
  API_BASE_URL,
  ApiError,
  LONG_REQUEST_TIMEOUT_MS,
  getToken,
  post,
} from "./http";

// ============================================================
// 类型定义
// ============================================================

/** 帖子分类枚举（对应后端 Post.PostCategory，与小程序端发布页一致） */
export type PostCategory =
  | "all"
  | "interest"
  | "sincere"
  | "hometown"
  | "anonymous"
  | "latest"
  | "campus"
  | "activity";

/**
 * 发布目标类型（对应后端 VillagePostService 的 targetType 语义）：
 * - general：公开（visibility=public_）
 * - campus：仅同校可见（visibility=school，小编需已通过校园认证，否则 403）
 * - circle：仅圈层可见（visibility=interest，需 targetId 且小编为该圈成员，否则 403）
 * - friends：日常内容（visibility=friends，仅匹配/关注作者可见）
 */
export type ComposeTargetType = "general" | "campus" | "circle" | "friends";

/**
 * 新建帖子请求体（对应后端 AdminContentComposeController.ComposePostRequest）。
 * 注意：没有作者字段——作者由后端 app.admin.compose-author-user-id 决定。
 */
export interface ComposePostRequest {
  /** 标题，5-30 字（与小程序端 constants/village.ts 对齐） */
  title: string;
  /** 正文，最长 500 字 */
  content: string;
  /** 分类，缺省 all */
  category?: PostCategory;
  /** 标签，最多 5 个（单个 ≤20 字） */
  tags?: string[];
  /** 图片 URL 列表，最多 9 张（取 upload 返回的 url） */
  images?: string[];
  /** 发布目标类型，缺省 general */
  targetType?: ComposeTargetType;
  /** 目标 ID（targetType=circle 时为圈子 ID，必填） */
  targetId?: number;
}

/** 新建帖子响应（后端直出 Map，字段与 AdminContentComposeController#composePost 一致） */
export interface ComposedPost {
  id: number;
  title: string;
  category: PostCategory | null;
  tags: string[];
  images: string[];
  /** 帖子状态（代发内容固定 active） */
  status: string;
  /** 审核状态（代发内容固定 approved，免二次审核） */
  auditStatus: string;
  /** 可见范围：public_ / school / interest / friends */
  visibility: string;
  circleId: number | null;
  /** 官方小编用户 ID */
  authorId: number;
  authorNickname: string | null;
  /** 小编账号所属校区（校区管理员的管辖依据） */
  authorCampusName: string | null;
  /** 落库的冗余圈层路径（users.circle_path 为空或列未上线时为 null） */
  ownerCirclePath: string | null;
  createdAt: string | null;
}

/** 图片上传响应（字段名与小程序端 UploadResponse 对齐） */
export interface ComposeUploadResult {
  /** 相对 key：/api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}，展示需 withMediaToken */
  url: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  size: number | null;
  durationMs: number | null;
  /** 资产归属用户 ID（官方小编） */
  authorId: number;
}

/** 内容校验阈值（与后端 AdminContentComposeController / 小程序端 constants/village.ts 同源） */
export const COMPOSE_LIMITS = {
  titleMin: 5,
  titleMax: 30,
  contentMax: 500,
  imagesMax: 9,
  tagsMax: 5,
  tagMax: 20,
  /** 图片大小上限 10MB（后端 LocalMediaStorageService.MAX_IMAGE_BYTES） */
  imageMaxBytes: 10 * 1024 * 1024,
} as const;

// ============================================================
// API
// ============================================================

/**
 * 后台发布帖子（官方小编代发）。
 * POST /api/v1/admin/posts
 */
export function createAdminPost(req: ComposePostRequest): Promise<ComposedPost> {
  return post<ComposedPost>("/v1/admin/posts", req);
}

/**
 * 后台上传图片。
 * POST /api/v1/admin/media/upload（multipart：file + type=image）
 *
 * 说明：不走 http.ts 的 post()，因为该封装固定 Content-Type: application/json，
 * 会破坏 multipart 边界；这里复用同一套鉴权（Bearer token）/超时/错误映射，
 * 但不手动设置 Content-Type，交由浏览器生成 boundary。
 * 上传 10MB 图片耗时远超常规 15s 超时，故使用 LONG_REQUEST_TIMEOUT_MS。
 *
 * @param file 图片文件（jpg/jpeg/png/webp，≤10MB）
 * @throws ApiError 401 会话过期 / 400 格式不支持 / 413 超过 10MB / 503 小编账号未配置
 */
export async function uploadComposeImage(file: File): Promise<ComposeUploadResult> {
  const token = getToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // 写接口统一携带 Idempotency-Key（API-CONTRACT 约定）：FormData 无法参与签名，
  // 每次上传生成独立随机键，重复点击由按钮禁用态防抖
  headers.set(
    "Idempotency-Key",
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `admin-upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
  );

  const form = new FormData();
  form.append("file", file);
  form.append("type", "image");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LONG_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/v1/admin/media/upload`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, t("errors.network"));
    }
    throw new ApiError(0, t("errors.network"));
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new ApiError(401, t("errors.auth"));
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const raw =
      payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: unknown }).message
        : undefined;
    const message = raw == null || String(raw).trim() === "" ? t("errors.unknown") : String(raw);
    throw new ApiError(response.status, message, payload);
  }

  return payload as ComposeUploadResult;
}
