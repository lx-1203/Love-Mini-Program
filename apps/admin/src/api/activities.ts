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

import { AdminPageView, del, get, post, put, downloadFile } from "./http";

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
 * 复用 http.ts 的 downloadFile（统一鉴权/超时/401 跳转/错误映射，导出类慢操作使用长超时），
 * 失败时抛出 ApiError，由调用方提示。
 *
 * @param id 活动 ID
 * @throws ApiError 网络错误 / 非 2xx / 401 时抛出
 */
export async function exportEnrollments(id: number): Promise<void> {
  await downloadFile(
    `/v1/admin/activities/${id}/enrollments/export`,
    `activity_enrollments_${id}.csv`,
  );
}
