import { defineStore } from "pinia";
import { ref } from "vue";
// 修复（严格模式 noUnusedLocals）：components 类型未在本文件引用，已移除；
// HomeDashboardWithDiscussion 已包含所需字段。
import type { HomeDashboardWithDiscussion } from "../services/generated/api-types-supplement";
import { clientApi } from "../services/api";

type HomeDashboard = HomeDashboardWithDiscussion;
// 修复（严格模式 noUnusedLocals）：FlexibleObject 类型未使用，已移除。

/**
 * 首页 Store。
 * 管理首页 Dashboard 数据（课表摘要、推荐的人、AI 计划、活动预览等）。
 */
export const useHomeStore = defineStore("home", () => {
  // ==================== State ====================
  const dashboard = ref<HomeDashboard | null>(null);
  const loading = ref(false);
  const errorMessage = ref<string | null>(null);

  // ==================== Getters ====================
  /** 课表摘要 */
  const scheduleSummary = ref<HomeDashboard["scheduleSummary"] | null>(null);

  /** 推荐的人 */
  const recommendedPeople = ref<HomeDashboard["recommendedPeople"]>([]);

  /** AI 计划 */
  const aiPlan = ref<HomeDashboard["aiPlan"] | null>(null);

  /** 活动预览（类型定义为 FlexibleObject，运行时可能为数组或对象，使用 unknown 收敛） */
  const activityPreview = ref<unknown[]>([]);

  /** 讨论热度（同上，类型定义宽松，运行时通过 Array.isArray 守卫） */
  const discussionHeat = ref<unknown[]>([]);

  // ==================== Actions ====================
  /**
   * 加载首页 Dashboard 数据。
   */
  async function fetchDashboard() {
    loading.value = true;
    errorMessage.value = null;

    try {
      // 后端实际返回含 discussionHeat 字段，但 OpenAPI 生成类型 Schemas["HomeDashboard"]
      // 未同步更新，此处通过类型断言收敛为 HomeDashboardWithDiscussion 以保留运行时字段访问。
      const data = (await clientApi.getHomeDashboard()) as unknown as HomeDashboard;
      dashboard.value = data;

      // 提取各模块数据（防御性处理：确保数组类型，避免 .slice 等数组方法调用失败）
      scheduleSummary.value = data.scheduleSummary ?? null;
      recommendedPeople.value = Array.isArray(data.recommendedPeople) ? data.recommendedPeople : [];
      aiPlan.value = data.aiPlan ?? null;
      // activityPreview / discussionHeat 在类型定义中为 FlexibleObject（对象），
      // 但历史代码使用 Array.isArray 做防御性检查，此处保持原行为：仅在确为数组时使用，否则空数组
      const activityPreviewRaw: unknown = data.activityPreview;
      const discussionHeatRaw: unknown = data.discussionHeat;
      activityPreview.value = Array.isArray(activityPreviewRaw) ? activityPreviewRaw : [];
      discussionHeat.value = Array.isArray(discussionHeatRaw) ? discussionHeatRaw : [];
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "加载首页数据失败";
      errorMessage.value = msg;
      console.error("[home-store] fetchDashboard error:", error);
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    dashboard,
    loading,
    errorMessage,
    // Getters
    scheduleSummary,
    recommendedPeople,
    aiPlan,
    activityPreview,
    discussionHeat,
    // Actions
    fetchDashboard,
  };
});
