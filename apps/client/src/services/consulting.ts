import { request } from "./http";

/** 后端 ConsultingService.CourseView（内容版）。 */
export interface ConsultingCourseView {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  lecturer?: string | null;
  price?: number | null;
  coverUrl?: string | null;
  category?: string | null;
  sortOrder?: number;
  priceVisible?: boolean;
  signupEnabled?: boolean;
  isSignedUp?: boolean;
}

/** 课程列表（GET /api/v1/consulting/courses）。 */
export async function listConsultingCourses(): Promise<ConsultingCourseView[]> {
  return request<ConsultingCourseView[]>({
    url: "/consulting/courses",
    method: "GET",
  });
}

/** 课程详情（GET /api/v1/consulting/courses/{id}）。 */
export async function getConsultingCourse(id: string | number): Promise<ConsultingCourseView> {
  return request<ConsultingCourseView>({
    url: `/consulting/courses/${encodeURIComponent(String(id))}`,
    method: "GET",
  });
}
