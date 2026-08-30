/**
 * Admin v2 RBAC 三级圈层管理 API 封装。
 */
import { get, post, put, del, unwrapApiData } from "./http";

export type CircleLevel = 1 | 2 | 3;

export interface CircleLayer {
  id: number;
  name: string;
  level: CircleLevel;
  parentId: number | null;
  circlePath: string;
  status: "active" | "disabled";
  color: string;
  sort: number;
  createdAt?: string;
  updatedAt?: string;
  children?: CircleLayer[];
}

export interface AdminLayerBinding {
  id: number;
  adminId: number;
  circleLayerId: number;
  roleCode: "SUPER_ADMIN" | "ADMIN" | "AUDITOR" | "CS";
  createdAt?: string;
}

export interface EvidenceItem {
  id: number;
  content?: string;
  ownerCirclePath: string;
}

export interface EvidencePage {
  items: EvidenceItem[];
  total: number;
  page: number;
}

export interface CircleUser {
  id: number;
  openid: string;
  nickname?: string;
  role?: string;
  campusName?: string;
  circlePath?: string;
}

async function fetchList<T>(path: string): Promise<T[]> {
  const r = await get<unknown>(path);
  return (unwrapApiData<T[]>(r) || []) as T[];
}

export async function listAllLayers(): Promise<CircleLayer[]> {
  return fetchList<CircleLayer>("/v1/admin/circle-layers");
}

export async function listLayersByLevel(level: CircleLevel): Promise<CircleLayer[]> {
  return fetchList<CircleLayer>(`/v1/admin/circle-layers/by-level/${level}`);
}

export async function getLayerDescendants(id: number): Promise<CircleLayer[]> {
  return fetchList<CircleLayer>(`/v1/admin/circle-layers/${id}/descendants`);
}

export async function createLayer(layer: Partial<CircleLayer>): Promise<CircleLayer | null> {
  const r = await post<unknown>("/v1/admin/circle-layers", layer);
  return unwrapApiData<CircleLayer>(r);
}

export async function updateLayer(id: number, layer: Partial<CircleLayer>): Promise<CircleLayer | null> {
  const r = await put<unknown>(`/v1/admin/circle-layers/${id}`, layer);
  return unwrapApiData<CircleLayer>(r);
}

export async function deleteLayer(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/circle-layers/${id}`);
}

export async function getAdminBindings(adminId: number): Promise<AdminLayerBinding[]> {
  return fetchList<AdminLayerBinding>(`/v1/admin/admin-layers/admin/${adminId}`);
}

export async function getLayerBindings(layerId: number): Promise<AdminLayerBinding[]> {
  return fetchList<AdminLayerBinding>(`/v1/admin/admin-layers/layer/${layerId}`);
}

export async function bindAdminLayer(binding: Partial<AdminLayerBinding>): Promise<AdminLayerBinding | null> {
  const r = await post<unknown>("/v1/admin/admin-layers", binding);
  return unwrapApiData<AdminLayerBinding>(r);
}

export async function unbindAdminLayer(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/admin-layers/${id}`);
}

export async function replaceAdminBindings(
  adminId: number,
  bindings: Partial<AdminLayerBinding>[]
): Promise<AdminLayerBinding[]> {
  const r = await put<unknown>(`/v1/admin/admin-layers/admin/${adminId}`, bindings);
  return (unwrapApiData<AdminLayerBinding[]>(r) || []) as AdminLayerBinding[];
}

export async function getEvidence(params: {
  type?: "post" | "chat" | "image" | "tempChat";
  userId?: number;
  page?: number;
  size?: number;
}): Promise<EvidencePage> {
  const r = await get<unknown>("/v1/admin/evidence", {
    type: params.type ?? "post",
    userId: params.userId,
    page: params.page ?? 1,
    size: params.size ?? 20,
  });
  return (unwrapApiData<EvidencePage>(r) || { items: [], total: 0, page: 1 }) as EvidencePage;
}

export async function getUsersInCircle(layerId: number): Promise<CircleUser[]> {
  return fetchList<CircleUser>(`/v1/admin/evidence/circle/${layerId}/users`);
}

export function buildLayerTree(layers: CircleLayer[]): CircleLayer[] {
  const map = new Map<number, CircleLayer & { children: CircleLayer[] }>();
  layers.forEach((l) => map.set(l.id, { ...l, children: [] }));
  const roots: CircleLayer[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}