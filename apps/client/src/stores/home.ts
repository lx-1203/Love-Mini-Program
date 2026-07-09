import { defineStore } from "pinia";
import { ref } from "vue";
import type { components } from "../services/generated/api-types";
import type { HomeDashboardWithDiscussion } from "../services/generated/api-types-supplement";
import { clientApi } from "../services/api";

type HomeDashboard = HomeDashboardWithDiscussion;
type FlexibleObject = Record<string, unknown>;

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

  /** 活动预览 */
  const activityPreview = ref<any>([]);

  /** 讨论热度 */
  const discussionHeat = ref<any>([]);

  // ==================== Actions ====================
  /**
   * 加载首页 Dashboard 数据。
   */
  async function fetchDashboard() {
    loading.value = true;
    errorMessage.value = null;

    try {
      const data = await clientApi.getHomeDashboard() as any;
      dashboard.value = data;

      // 提取各模块数据（防御性处理：确保数组类型，避免 .slice 等数组方法调用失败）
      scheduleSummary.value = data.scheduleSummary ?? null;
      recommendedPeople.value = Array.isArray(data.recommendedPeople) ? data.recommendedPeople : [];
      aiPlan.value = data.aiPlan ?? null;
      activityPreview.value = Array.isArray(data.activityPreview) ? data.activityPreview : [];
      discussionHeat.value = Array.isArray(data.discussionHeat) ? data.discussionHeat : [];
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
