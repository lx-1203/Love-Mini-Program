import { defineStore } from "pinia";
import { clientApi } from "../services/api";

/**
 * 反馈 Store
 *
 * 修复：原代码所有 action 无 try/catch，错误会冒泡到调用方且 UI 无反馈。
 * 现在统一包裹 try/catch，并维护 loading/errorMessage 状态供 UI 使用。
 */
export const useFeedbackStore = defineStore("feedback", {
  state: () => ({
    submissions: [] as Awaited<ReturnType<typeof clientApi.listSubmissions>>,
    /** 加载中标志 */
    loading: false,
    /** 最近一次错误信息（null 表示无错误） */
    errorMessage: null as string | null,
  }),
  actions: {
    /**
     * 加载反馈列表
     * @param type - 可选，反馈类型筛选
     */
    async load(type?: Parameters<typeof clientApi.listSubmissions>[0]) {
      this.loading = true;
      this.errorMessage = null;
      try {
        this.submissions = await clientApi.listSubmissions(type);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载反馈列表失败";
        console.error("[feedbackStore.load]", error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 提交问题反馈
     * @returns 成功返回 true，失败返回 false
     */
    async submitIssue(payload: Parameters<typeof clientApi.createFeedbackIssue>[0]): Promise<boolean> {
      this.loading = true;
      this.errorMessage = null;
      try {
        await clientApi.createFeedbackIssue(payload);
        await this.load();
        return true;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "提交问题反馈失败";
        console.error("[feedbackStore.submitIssue]", error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 提交建议
     * @returns 成功返回 true，失败返回 false
     */
    async submitSuggestion(payload: Parameters<typeof clientApi.createSuggestion>[0]): Promise<boolean> {
      this.loading = true;
      this.errorMessage = null;
      try {
        await clientApi.createSuggestion(payload);
        await this.load();
        return true;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "提交建议失败";
        console.error("[feedbackStore.submitSuggestion]", error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 提交活动提案
     * @returns 成功返回 true，失败返回 false
     */
    async submitActivityProposal(payload: Parameters<typeof clientApi.createActivityProposal>[0]): Promise<boolean> {
      this.loading = true;
      this.errorMessage = null;
      try {
        await clientApi.createActivityProposal(payload);
        await this.load();
        return true;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "提交活动提案失败";
        console.error("[feedbackStore.submitActivityProposal]", error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    /** 清除错误状态 */
    clearError() {
      this.errorMessage = null;
    },
  },
});
