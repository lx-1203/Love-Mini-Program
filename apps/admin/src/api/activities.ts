/**
 * Admin v2 - 活动运营 API 封装。
 *
 * 对应后端：com.campuslove.api.admin.AdminActivityController
 * - 列表/详情/新增/编辑/删除/上架/下架：/api/v1/admin/activities
 * - 报名分页：GET /api/v1/admin/activities/{id}/enrollments
 * - 报名 CSV 导出：GET /api/v1/admin/activities/{id}/enrollments/export
 *
 * 注意：活动状态 status 为 upcoming（即将开始）/ ongoing（进行中）/ ended（已结束）；
 * published 表示是否上架。校区管理员登录时后端按管辖校区强制过滤。
 */

import { API_BASE_URL, AdminPageView, ApiError, LONG_REQUEST_TIMEOUT_MS, del, get, post, put } from "./http";
import { t } from "../i18n";

// ============================================================
// 类型定义
// ============================================================

/** 活动状态枚举（对应后端 ActivityStatus） */
export type ActivityStatus = "upcoming" | "ongoing" | "ended";

/**
 * 活动列表摘要视图（对应后端 AdminActivitySummaryView）。
 */
export interface ActivitySummary {
  /** 活动 ID */
  id: number;
  /** 活动标题 */
  title: string;
  /** 活动地点 */
  location: string;
  /** 活动时间描述（如「每周五 19:00」） */
  scheduleText: string;
  /** 城市名称 */
  cityName: string | null;
  /** 校区名称 */
  campusName: string | null;
  /** 活动状态：upcoming 即将开始 / ongoing 进行中 / ended 已结束 */
  status: ActivityStatus | null;
  /** 是否上架 */
  published: boolean;
  /** 报名人数 */
  enrollmentCount: number;
  /** 活动日期（ISO yyyy-MM-dd） */
  activityDate: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 最近更新时间 */
  updatedAt: string;
}

/**
 * 活动详情视图（对应后端 AdminActivityDetailView，含完整描述）。
 */
export interface ActivityDetail {
  /** 活动 ID */
  id: number;
  /** 活动标题 */
  title: string;
  /** 活动地点 */
  location: string;
  /** 活动时间描述 */
  scheduleText: string;
  /** 活动完整描述 */
  description: string;
  /** 城市名称 */
  cityName: string | null;
  /** 校区名称 */
  campusName: string | null;
  /** 活动状态 */
  status: ActivityStatus | null;
  /** 是否上架 */
  published: boolean;
  /** 报名人数 */
  enrollmentCount: number;
  /** 活动日期（ISO yyyy-MM-dd） */
  activityDate: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 最近更新时间 */
  updatedAt: string;
}

/**
 * 新增/编辑活动请求体（对应后端 AdminActivityRequest）。
 * title/location/scheduleText/description 为必填；其余字段可空（编辑时 null 保持原值）。
 */
export interface ActivityForm {
  /** 活动标题（必填，1-128 字） */
  title: string;
  /** 活动地点（必填，1-256 字） */
  location: string;
  /** 活动时间描述（必填，1-128 字） */
  scheduleText: string;
  /** 活动描述（必填） */
  description: string;
  /** 城市名称（可选，≤64 字） */
  cityName?: string;
  /** 校区名称（可选，≤128 字；校区管理员创建时被后端强制覆盖为管辖校区） */
  campusName?: string;
  /** 活动日期（可选，ISO yyyy-MM-dd） */
  activityDate?: string;
  /** 活动状态（可选：upcoming / ongoing / ended，默认 upcoming） */
  status?: ActivityStatus;
  /** 是否上架（可选，默认 true） */
  published?: boolean;
}

/**
 * 活动报名记录视图（对应后端 AdminEnrollmentView）。
 * 报名记录无取消机制，status 恒为 joined（已报名）。
 */
export interface ActivityEnrollment {
  /** 报名记录 ID */
  id: number;
  /** 报名用户 ID */
  userId: number;
  /** 报名用户昵称 */
  nickname: string | null;
  /** 报名用户头像 URL */
  avatarUrl: string | null;
  /** 报名时间 */
  enrolledAt: string;
  /** 报名状态（恒为 joined） */
  status: string;
}

/** 活动列表查询参数 */
export interface ActivityListQuery {
  /** 标题模糊关键字 */
  keyword?: string;
  /** 活动状态筛选：upcoming / ongoing / ended */
  status?: ActivityStatus;
  /** 上架状态筛选：true / false */
  published?: boolean;
  /** 校区名称筛选（仅全局管理员生效） */
  campusName?: string;
  /** 页码，1-based */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/** 活动写操作通用响应体（{ id, success, ... } 形态） */
export interface ActivityOpResponse {
  id: number;
  success: boolean;
}

/** 上架/下架响应体（额外携带最新 published 状态） */
export interface PublishResponse extends ActivityOpResponse {
  published: boolean;
}

// ============================================================
// 活动 CRUD 与上架/下架
// ============================================================

/**
 * 分页查询活动列表（支持标题/状态/上架状态/校区筛选）。
 * GET /api/v1/admin/activities
 */
export function listActivities(
  query: ActivityListQuery = {}
): Promise<AdminPageView<ActivitySummary>> {
  return get<AdminPageView<ActivitySummary>>(
    "/v1/admin/activities",
    query as Record<string, unknown>
  );
}

/**
 * 查询活动详情。
 * GET /api/v1/admin/activities/{id}
 */
export function getActivity(id: number): Promise<ActivityDetail> {
  return get<ActivityDetail>(`/v1/admin/activities/${id}`);
}

/**
 * 新增活动。
 * POST /api/v1/admin/activities
 */
export function createActivity(form: ActivityForm): Promise<ActivityDetail> {
  return post<ActivityDetail>("/v1/admin/activities", form);
}

/**
 * 编辑活动（全量表单更新）。
 * PUT /api/v1/admin/activities/{id}
 */
export function updateActivity(id: number, form: ActivityForm): Promise<ActivityDetail> {
  return put<ActivityDetail>(`/v1/admin/activities/${id}`, form);
}

/**
 * 删除活动（硬删除，报名记录随活动一并清除，不可恢复）。
 * DELETE /api/v1/admin/activities/{id}
 */
export function deleteActivity(id: number): Promise<ActivityOpResponse> {
  return del<ActivityOpResponse>(`/v1/admin/activities/${id}`);
}

/**
 * 上架活动（published=true）。
 * POST /api/v1/admin/activities/{id}/publish
 */
export function publishActivity(id: number): Promise<PublishResponse> {
  return post<PublishResponse>(`/v1/admin/activities/${id}/publish`);
}

/**
 * 下架活动（published=false）。
 * POST /api/v1/admin/activities/{id}/unpublish
 */
export function unpublishActivity(id: number): Promise<PublishResponse> {
  return post<PublishResponse>(`/v1/admin/activities/${id}/unpublish`);
}

// ============================================================
// 报名管理
// ============================================================

/**
 * 分页查询活动报名列表（含用户昵称/头像/报名时间/状态）。
 * GET /api/v1/admin/activities/{id}/enrollments
 */
export function listEnrollments(
  id: number,
  query: { page?: number; pageSize?: number } = {}
): Promise<AdminPageView<ActivityEnrollment>> {
  return get<AdminPageView<ActivityEnrollment>>(
    `/v1/admin/activities/${id}/enrollments`,
    query as Record<string, unknown>
  );
}

/**
 * 导出活动报名记录 CSV（全部报名，不分页）。
 *
 * 后端响应为 text/csv 附件（带 UTF-8 BOM，Excel 打开中文不乱码）。
 * 实现：手动 fetch 拿 Blob（http.ts 的 request 假定 JSON 响应，不适用于文件流），
 * 校验通过后通过临时 <a> 标签触发浏览器下载；导出类慢操作使用长超时。
 *
 * @param id 活动 ID
 * @throws ApiError 网络错误 / 非 2xx 时抛出（401 会同步清理凭据并跳转登录页）
 */
export async function exportEnrollments(id: number): Promise<void> {
  const token = localStorage.getItem("admin_v2_token") || "";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LONG_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/v1/admin/activities/${id}/enrollments/export`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    // 区分超时中止与其他网络错误（文案与 http.ts 保持一致）
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, t("errors.network"));
    }
    throw new ApiError(0, t("errors.network"));
  } finally {
    clearTimeout(timeoutId);
  }

  // 401 未授权：清除本地凭据并跳转登录页（与 http.ts request 行为一致）
  if (response.status === 401) {
    localStorage.removeItem("admin_v2_token");
    localStorage.removeItem("admin_v2_user");
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw new ApiError(401, t("errors.auth"));
  }

  if (!response.ok) {
    let message = "";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (body.message != null && String(body.message).trim() !== "") {
        message = String(body.message);
      }
    } catch {
      // 非 JSON 错误响应，message 保持空串，走下方状态码映射
    }
    if (!message) {
      if (response.status >= 500) {
        message = t("errors.server");
      } else if (response.status === 403) {
        message = t("errors.permission");
      } else if (response.status === 404) {
        message = t("errors.notFound");
      } else {
        message = t("errors.unknown");
      }
    }
    throw new ApiError(response.status, message);
  }

  // 拿到 Blob 后通过临时 <a> 标签触发浏览器下载（a.download 指定文件名）
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity_enrollments_${id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
