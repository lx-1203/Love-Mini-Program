/**
 * 管理后台 - 咨询课程内容 API。
 * 对应后端 AdminConsultingController（/api/v1/admin/consulting/courses）。
 */
import { get, post, put, unwrapApiData } from "./http";

export interface AdminConsultingCourse {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  price: number;
  coverUrl: string | null;
  category: string;
  lecturer: string | null;
  sortOrder: number;
  priceVisible: boolean;
  signupEnabled: boolean;
  status: number;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface ConsultingCourseForm {
  title: string;
  description?: string;
  content?: string;
  price: number;
  coverUrl?: string;
  category: string;
  lecturer?: string;
  sortOrder?: number;
  priceVisible?: boolean;
  signupEnabled?: boolean;
}

export async function listConsultingCourses(): Promise<AdminConsultingCourse[]> {
  const body = await get<unknown>("/v1/admin/consulting/courses");
  return unwrapApiData<AdminConsultingCourse[]>(body) ?? [];
}

export async function createConsultingCourse(
  data: ConsultingCourseForm,
): Promise<AdminConsultingCourse> {
  const body = await post<unknown>("/v1/admin/consulting/courses", data);
  const course = unwrapApiData<AdminConsultingCourse>(body);
  if (!course) throw new Error("新增课程失败：响应为空");
  return course;
}

export async function updateConsultingCourse(
  id: number,
  data: ConsultingCourseForm,
): Promise<AdminConsultingCourse> {
  const body = await put<unknown>(`/v1/admin/consulting/courses/${id}`, data);
  const course = unwrapApiData<AdminConsultingCourse>(body);
  if (!course) throw new Error("保存课程失败：响应为空");
  return course;
}

export async function publishConsultingCourse(id: number): Promise<AdminConsultingCourse> {
  const body = await post<unknown>(`/v1/admin/consulting/courses/${id}/publish`);
  const course = unwrapApiData<AdminConsultingCourse>(body);
  if (!course) throw new Error("发布课程失败：响应为空");
  return course;
}

export async function offlineConsultingCourse(id: number): Promise<AdminConsultingCourse> {
  const body = await post<unknown>(`/v1/admin/consulting/courses/${id}/offline`);
  const course = unwrapApiData<AdminConsultingCourse>(body);
  if (!course) throw new Error("下线课程失败：响应为空");
  return course;
}
