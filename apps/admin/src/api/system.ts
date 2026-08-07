/**
 * Admin v2 系统管理域 API 封装（eladmin 风格「系统管理」域）。
 *
 * 覆盖接口前缀（对应后端 com.campuslove.api.admin 下各 Controller）：
 * - 高校管理：/api/v1/admin/schools
 * - 菜单管理：/api/v1/admin/menus
 * - 角色管理：/api/v1/admin/roles
 * - 数据字典：/api/v1/admin/dicts
 * - 审计日志：/api/v1/admin/audit-logs
 * - 管理员管理：/api/v1/admin/users/admins（沿用旧后台接口，见 AdminUserController）
 * - 在线用户：/api/v1/admin/online-users
 *
 * 响应约定：管理端点返回 ApiResponse 包装 {code,message,data} 或直出视图对象，
 * 本模块对写操作（create/update/delete）与单资源读取统一通过 unwrapApiData 解包；
 * 分页列表（AdminPageView）为直出形态，get 原样返回。
 */

import {
  AdminPageView,
  get,
  post,
  put,
  del,
  unwrapApiData,
} from "./http";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";

/* ============================================================
 * 高校管理（School）
 * ============================================================ */

/** 高校启用状态 */
export type SchoolStatus = "enabled" | "disabled";

/** 高校视图（对应后端 SchoolAdminView） */
export interface SchoolView {
  id: number;
  /** 高校名称 */
  name: string;
  /** 高校编码（唯一，如 nju） */
  code: string;
  /** 启用状态：enabled=启用 / disabled=停用（停用后该校管理员无法登录） */
  status: SchoolStatus;
  /** 排序号（越小越靠前） */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 高校列表查询参数 */
export interface SchoolListQuery {
  /** 关键词（匹配名称/编码） */
  keyword?: string;
  /** 状态筛选 */
  status?: SchoolStatus;
  page?: number;
  pageSize?: number;
}

/** 新增/编辑高校请求体 */
export interface SchoolUpsertRequest {
  name: string;
  code: string;
  sortOrder?: number;
}

/**
 * 分页查询高校列表。
 * GET /api/v1/admin/schools
 */
export function listSchools(query: SchoolListQuery = {}): Promise<AdminPageView<SchoolView>> {
  return get<AdminPageView<SchoolView>>("/v1/admin/schools", {
    keyword: query.keyword || undefined,
    status: query.status || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 查询启用中的高校列表（供「新增管理员」校区下拉使用，仅返回启用高校）。
 * GET /api/v1/admin/schools/options
 */
export async function listSchoolOptions(): Promise<SchoolView[]> {
  const body = await get<unknown>("/v1/admin/schools/options");
  return unwrapApiData<SchoolView[]>(body) ?? [];
}

/**
 * 新增高校。
 * POST /api/v1/admin/schools
 */
export async function createSchool(body: SchoolUpsertRequest): Promise<SchoolView> {
  const res = await post<unknown>("/v1/admin/schools", body);
  return unwrapApiData<SchoolView>(res) as SchoolView;
}

/**
 * 编辑高校。
 * PUT /api/v1/admin/schools/{id}
 */
export async function updateSchool(id: number, body: SchoolUpsertRequest): Promise<SchoolView> {
  const res = await put<unknown>(`/v1/admin/schools/${id}`, body);
  return unwrapApiData<SchoolView>(res) as SchoolView;
}

/**
 * 删除高校（存在关联管理员时后端返回 409）。
 * DELETE /api/v1/admin/schools/{id}
 */
export async function deleteSchool(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/schools/${id}`);
}

/**
 * 启用/停用高校（status 为目标状态）。
 * POST /api/v1/admin/schools/{id}/status
 */
export async function toggleSchoolStatus(id: number, status: SchoolStatus): Promise<SchoolView> {
  const res = await post<unknown>(`/v1/admin/schools/${id}/status`, { status });
  return unwrapApiData<SchoolView>(res) as SchoolView;
}

/* ============================================================
 * 菜单管理（Menu，eladmin 菜单模型）
 * ============================================================ */

/** 菜单类型：DIR=目录（分组）/ MENU=菜单（页面）/ BUTTON=按钮权限 */
export type MenuType = "DIR" | "MENU" | "BUTTON";

/** 菜单树节点（对应后端 MenuTreeNode） */
export interface MenuTreeNode {
  id: number;
  parentId: number | null;
  /** 菜单标题（侧边栏展示） */
  title: string;
  /** 路由 name（唯一） */
  name: string;
  /** 路由 path（根级以 / 开头） */
  path: string;
  /** 组件路径（如 views/system/Menus.vue；DIR/BUTTON 为空） */
  component: string | null;
  /** 图标标识 */
  icon: string | null;
  /** 排序号 */
  sort: number;
  /** 是否隐藏（不展示在侧边栏） */
  hidden: boolean;
  /** 按钮权限标识（如 system:menu:add） */
  permission: string | null;
  /** 菜单类型 */
  menuType: MenuType;
  children?: MenuTreeNode[];
}

/** 菜单详情（与列表节点同构，用于编辑回显） */
export type MenuDetail = MenuTreeNode;

/** 新增/编辑菜单请求体（前端仅操作 DIR/MENU 两级） */
export interface MenuUpsertRequest {
  parentId: number | null;
  title: string;
  name: string;
  path: string;
  component?: string | null;
  icon?: string | null;
  sort?: number;
  hidden?: boolean;
  permission?: string | null;
  menuType: "DIR" | "MENU";
}

/**
 * 全量菜单树（系统管理 → 菜单管理页面使用）。
 * GET /api/v1/admin/menus
 */
export async function listMenus(): Promise<MenuTreeNode[]> {
  const body = await get<unknown>("/v1/admin/menus");
  return unwrapApiData<MenuTreeNode[]>(body) ?? [];
}

/**
 * 当前管理员可见菜单树（Layout 侧边栏使用；与 stores/menu.ts 等价但独立封装）。
 * GET /api/v1/admin/menus/current
 */
export async function getCurrentMenus(): Promise<MenuTreeNode[]> {
  const body = await get<unknown>("/v1/admin/menus/current");
  return unwrapApiData<MenuTreeNode[]>(body) ?? [];
}

/**
 * 新增菜单。
 * POST /api/v1/admin/menus
 */
export async function createMenu(body: MenuUpsertRequest): Promise<MenuTreeNode> {
  const res = await post<unknown>("/v1/admin/menus", body);
  return unwrapApiData<MenuTreeNode>(res) as MenuTreeNode;
}

/**
 * 编辑菜单。
 * PUT /api/v1/admin/menus/{id}
 */
export async function updateMenu(id: number, body: MenuUpsertRequest): Promise<MenuTreeNode> {
  const res = await put<unknown>(`/v1/admin/menus/${id}`, body);
  return unwrapApiData<MenuTreeNode>(res) as MenuTreeNode;
}

/**
 * 删除菜单（存在子菜单时后端返回 409）。
 * DELETE /api/v1/admin/menus/{id}
 */
export async function deleteMenu(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/menus/${id}`);
}

/* ============================================================
 * 角色管理（Role）
 * ============================================================ */

/** 数据范围（eladmin 约定）：ALL=全部 / DEPT=本部门 / CUSTOM=自定义 */
export type RoleDataScope = "ALL" | "DEPT" | "CUSTOM";

/** 角色视图（对应后端 RoleView） */
export interface RoleView {
  id: number;
  name: string;
  code: string;
  /** 数据范围 */
  dataScope: string;
  description: string | null;
  /** 是否启用 */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 新增/编辑角色请求体 */
export interface RoleUpsertRequest {
  name: string;
  code: string;
  dataScope?: string;
  description?: string;
  enabled?: boolean;
}

/**
 * 角色列表。
 * GET /api/v1/admin/roles
 */
export async function listRoles(): Promise<RoleView[]> {
  const body = await get<unknown>("/v1/admin/roles");
  return unwrapApiData<RoleView[]>(body) ?? [];
}

/**
 * 新增角色。
 * POST /api/v1/admin/roles
 */
export async function createRole(body: RoleUpsertRequest): Promise<RoleView> {
  const res = await post<unknown>("/v1/admin/roles", body);
  return unwrapApiData<RoleView>(res) as RoleView;
}

/**
 * 编辑角色。
 * PUT /api/v1/admin/roles/{id}
 */
export async function updateRole(id: number, body: RoleUpsertRequest): Promise<RoleView> {
  const res = await put<unknown>(`/v1/admin/roles/${id}`, body);
  return unwrapApiData<RoleView>(res) as RoleView;
}

/**
 * 删除角色（内置角色 SUPER_ADMIN/ADMIN 等后端返回 409）。
 * DELETE /api/v1/admin/roles/{id}
 */
export async function deleteRole(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/roles/${id}`);
}

/**
 * 查询角色已分配菜单 id 列表（分配菜单弹窗回显）。
 * GET /api/v1/admin/roles/{id}/menus
 */
export async function getRoleMenuIds(id: number): Promise<number[]> {
  const body = await get<unknown>(`/v1/admin/roles/${id}/menus`);
  return unwrapApiData<number[]>(body) ?? [];
}

/**
 * 保存角色菜单分配。
 * PUT /api/v1/admin/roles/{id}/menus
 * @param menuIds 勾选（完全选中）的菜单节点 id 集合
 */
export async function assignRoleMenus(id: number, menuIds: number[]): Promise<void> {
  await put<unknown>(`/v1/admin/roles/${id}/menus`, { menuIds });
}

/* ============================================================
 * 数据字典（Dict + DictItem）
 * ============================================================ */

/** 字典视图（对应后端 DictView，itemCount=条目数） */
export interface DictView {
  id: number;
  name: string;
  code: string;
  description: string | null;
  itemCount: number;
}

/** 字典条目视图（对应后端 DictItemView） */
export interface DictItemView {
  id: number;
  /** 展示名称 */
  label: string;
  /** 存储值 */
  value: string;
  /** 排序号 */
  sort: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 新增/编辑字典请求体 */
export interface DictUpsertRequest {
  name: string;
  code: string;
  description?: string;
}

/** 新增/编辑字典条目请求体 */
export interface DictItemUpsertRequest {
  label: string;
  value: string;
  sort?: number;
  enabled?: boolean;
}

/**
 * 字典列表。
 * GET /api/v1/admin/dicts
 */
export async function listDicts(): Promise<DictView[]> {
  const body = await get<unknown>("/v1/admin/dicts");
  return unwrapApiData<DictView[]>(body) ?? [];
}

/**
 * 新增字典。
 * POST /api/v1/admin/dicts
 */
export async function createDict(body: DictUpsertRequest): Promise<DictView> {
  const res = await post<unknown>("/v1/admin/dicts", body);
  return unwrapApiData<DictView>(res) as DictView;
}

/**
 * 编辑字典。
 * PUT /api/v1/admin/dicts/{id}
 */
export async function updateDict(id: number, body: DictUpsertRequest): Promise<DictView> {
  const res = await put<unknown>(`/v1/admin/dicts/${id}`, body);
  return unwrapApiData<DictView>(res) as DictView;
}

/**
 * 删除字典（存在条目时后端可能返回 409）。
 * DELETE /api/v1/admin/dicts/{id}
 */
export async function deleteDict(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/dicts/${id}`);
}

/**
 * 按字典编码查询条目列表（条目管理回显）。
 * GET /api/v1/admin/dicts/{code}/items
 */
export async function listDictItemsByCode(code: string): Promise<DictItemView[]> {
  const body = await get<unknown>(`/v1/admin/dicts/${encodeURIComponent(code)}/items`);
  return unwrapApiData<DictItemView[]>(body) ?? [];
}

/**
 * 新增字典条目。
 * POST /api/v1/admin/dicts/{dictId}/items
 */
export async function createDictItem(dictId: number, body: DictItemUpsertRequest): Promise<DictItemView> {
  const res = await post<unknown>(`/v1/admin/dicts/${dictId}/items`, body);
  return unwrapApiData<DictItemView>(res) as DictItemView;
}

/**
 * 编辑字典条目。
 * PUT /api/v1/admin/dicts/items/{itemId}
 */
export async function updateDictItem(itemId: number, body: DictItemUpsertRequest): Promise<DictItemView> {
  const res = await put<unknown>(`/v1/admin/dicts/items/${itemId}`, body);
  return unwrapApiData<DictItemView>(res) as DictItemView;
}

/**
 * 删除字典条目。
 * DELETE /api/v1/admin/dicts/items/{itemId}
 */
export async function deleteDictItem(itemId: number): Promise<void> {
  await del<unknown>(`/v1/admin/dicts/items/${itemId}`);
}

/* ============================================================
 * 审计日志（AuditLog，与旧后台 audit-logs.ts 对齐）
 * ============================================================ */

/** 审计日志视图（对应后端 AuditLogView） */
export interface AuditLogView {
  id: number;
  operatorId: number;
  operatorUsername: string;
  operatorRole: string;
  operation: string;
  targetType?: string;
  targetId?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestBody?: string;
  responseStatus?: number;
  /** 异常信息（非空时表示该日志为异常日志，前端红色高亮） */
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  durationMs?: number;
  createdAt: string;
}

/** 审计日志分页视图（Spring Data Page 风格：page 从 0 开始） */
export interface AuditLogPageView {
  content: AuditLogView[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** 审计日志查询参数 */
export interface AuditLogQuery {
  /** 页码（0-based） */
  page?: number;
  /** 每页条数 */
  size?: number;
  /** 操作者 ID（数字） */
  operator?: string;
  /** 操作类型枚举 */
  operation?: string;
  /** 开始日期（yyyy-MM-dd） */
  startDate?: string;
  /** 结束日期（yyyy-MM-dd） */
  endDate?: string;
  /** 仅查异常日志（errorMessage 非空） */
  exceptionOnly?: boolean;
}

/** 常见操作类型枚举（与后端 AuditOperation 对齐，用于筛选下拉） */
export const AUDIT_OPERATIONS: { value: string; labelKey: string }[] = [
  { value: "AUDIT_POST", labelKey: "auditLogs.opAuditPost" },
  { value: "DELETE_POST", labelKey: "auditLogs.opDeletePost" },
  { value: "DELETE_COMMENT", labelKey: "auditLogs.opDeleteComment" },
  { value: "DISABLE_USER", labelKey: "auditLogs.opDisableUser" },
  { value: "ENABLE_USER", labelKey: "auditLogs.opEnableUser" },
  { value: "EDIT_USER", labelKey: "auditLogs.opEditUser" },
  { value: "HANDLE_REPORT", labelKey: "auditLogs.opHandleReport" },
  { value: "REVIEW_CERTIFICATION", labelKey: "auditLogs.opReviewCertification" },
  { value: "UPDATE_CONFIG", labelKey: "auditLogs.opUpdateConfig" },
  { value: "UPDATE_RULE", labelKey: "auditLogs.opUpdateRule" },
  { value: "UPDATE_SWITCH", labelKey: "auditLogs.opUpdateSwitch" },
  { value: "UPDATE_MATCH_CONFIG", labelKey: "auditLogs.opUpdateMatchConfig" },
  { value: "UPDATE_RECOMMEND_STRATEGY", labelKey: "auditLogs.opUpdateRecommendStrategy" },
  { value: "UPDATE_NOTIFY_CONFIG", labelKey: "auditLogs.opUpdateNotifyConfig" },
  { value: "ADD_SENSITIVE_WORD", labelKey: "auditLogs.opAddSensitiveWord" },
  { value: "DELETE_SENSITIVE_WORD", labelKey: "auditLogs.opDeleteSensitiveWord" },
  { value: "CHANGE_PASSWORD", labelKey: "auditLogs.opChangePassword" },
  { value: "CREATE_USER", labelKey: "auditLogs.opCreateUser" },
  { value: "KICK_ONLINE_USER", labelKey: "auditLogs.opKickOnlineUser" },
];

/**
 * 分页查询审计日志（page 从 0 开始，后端约定 page/size 参数）。
 * GET /api/v1/admin/audit-logs
 */
export function listAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogPageView> {
  return get<AuditLogPageView>("/v1/admin/audit-logs", {
    page: query.page ?? 0,
    size: query.size ?? DEFAULT_PAGE_SIZE,
    operator: query.operator || undefined,
    operation: query.operation || undefined,
    startDate: query.startDate || undefined,
    endDate: query.endDate || undefined,
    exception: query.exceptionOnly || undefined,
  });
}

/* ============================================================
 * 管理员管理（Admin，商业模式：每个高校一个管理员）
 * ============================================================ */

/** 管理员摘要视图（列表用，对应后端 AdminUserSummaryView） */
export interface AdminUserSummary {
  id: number;
  nickname: string;
  phone: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
  /** 账号状态：active=正常 / disabled=禁用 */
  status: "active" | "disabled";
  /** 管辖校区名（null=全局管理员） */
  campusName: string | null;
  createdAt: string;
}

/** 创建管理员请求体（对应后端 AdminCreateAdminRequest） */
export interface AdminCreateRequest {
  /** 手机号（11 位，1[3-9] 开头，唯一，登录账号） */
  phone: string;
  /** 初始密码（6-64 位） */
  password: string;
  /** 昵称（1-20 字） */
  nickname: string;
  /** 角色：ADMIN（校区管理员）/ SUPER_ADMIN（全局超级管理员） */
  role?: "ADMIN" | "SUPER_ADMIN";
  /** 管辖校区名：ADMIN 必填；SUPER_ADMIN 必须为空 */
  campusName?: string | null;
}

/** 管理员列表查询参数 */
export interface AdminListQuery {
  nickname?: string;
  campusName?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询管理员列表（含管辖校区）。
 * GET /api/v1/admin/users/admins
 * 仅超级管理员可调用。
 */
export function listAdmins(query: AdminListQuery = {}): Promise<AdminPageView<AdminUserSummary>> {
  return get<AdminPageView<AdminUserSummary>>("/v1/admin/users/admins", {
    nickname: query.nickname || undefined,
    campusName: query.campusName || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 创建管理员（商业模式：每个高校一个管理员）。
 * POST /api/v1/admin/users/admins
 * 仅超级管理员可调用；ADMIN 角色必须指定 campusName。
 */
export async function createAdmin(req: AdminCreateRequest): Promise<AdminUserSummary> {
  const body = await post<unknown>("/v1/admin/users/admins", req);
  return unwrapApiData<AdminUserSummary>(body) as AdminUserSummary;
}

/**
 * 禁用管理员。
 * POST /api/v1/admin/users/{id}/disable
 */
export async function disableAdmin(id: number): Promise<unknown> {
  return post<unknown>(`/v1/admin/users/${id}/disable`);
}

/**
 * 启用管理员。
 * POST /api/v1/admin/users/{id}/enable
 */
export async function enableAdmin(id: number): Promise<unknown> {
  return post<unknown>(`/v1/admin/users/${id}/enable`);
}

/* ============================================================
 * 在线用户（OnlineUser，eladmin「在线用户」对齐）
 * ============================================================ */

/** 在线用户视图（对应后端 OnlineUserView） */
export interface OnlineUserView {
  /** 用户 ID */
  userId: number;
  /** 用户昵称（用户已删除时为 null） */
  nickname: string | null;
  /** 登录方式：wechat / phone / admin */
  loginMethod: string;
  /** 登录时间（ISO 格式） */
  loginAt: string;
}

/** 踢下线操作响应 */
export interface KickOnlineUserResponse {
  userId: number;
  success: boolean;
}

/**
 * 在线用户列表。
 * GET /api/v1/admin/online-users
 */
export async function listOnlineUsers(): Promise<OnlineUserView[]> {
  const body = await get<unknown>("/v1/admin/online-users");
  return unwrapApiData<OnlineUserView[]>(body) ?? [];
}

/**
 * 强制下线指定用户（复用后端 jti 黑名单机制）。
 * POST /api/v1/admin/online-users/{userId}/kick
 */
export async function kickOnlineUser(userId: number): Promise<KickOnlineUserResponse> {
  const body = await post<unknown>(`/v1/admin/online-users/${userId}/kick`);
  return unwrapApiData<KickOnlineUserResponse>(body) ?? { userId, success: true };
}
