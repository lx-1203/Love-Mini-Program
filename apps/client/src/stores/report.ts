/**
 * 举报 Store
 *
 * 用于修正依赖方向（P3 代码风格问题）：
 * 原 PostReportDialog 组件直接 import services/report-api，违反
 * "组件 → store → service" 的依赖方向。现由本 store 包装举报 API，
 * 组件通过 store 间接调用，便于后续扩展（如本地状态、批量举报、
 * 埋点等）。
 *
 * 当前仅做最薄的包装：直接转发到 services/report-api.reportTarget，
 * 不引入额外状态机，避免过度设计。
 */
import { defineStore } from "pinia";
import {
  reportTarget as reportTargetApi,
  type ReportTargetType,
  type ReportResponse,
} from "../services/report-api";

/**
 * 举报 Store
 *
 * 提供 reportTarget action，封装 services/report-api 的举报调用。
 */
export const useReportStore = defineStore("report", {
  state: () => ({
    /** 最近一次举报提交是否进行中 */
    submitting: false,
    /** 最近一次错误信息（null 表示无错误） */
    errorMessage: null as string | null,
  }),
  actions: {
    /**
     * 提交举报。
     *
     * @param type        - 举报目标类型
     * @param id          - 目标对象 ID
     * @param reason      - 举报原因
     * @param description - 详细描述（可选）
     * @returns 举报记录视图
     */
    async reportTarget(
      type: ReportTargetType,
      id: string | number,
      reason: string,
      description?: string
    ): Promise<ReportResponse> {
      this.submitting = true;
      this.errorMessage = null;
      try {
        return await reportTargetApi(type, id, reason, description);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "提交举报失败";
        throw error;
      } finally {
        this.submitting = false;
      }
    },

    /** 清除错误状态 */
    clearError() {
      this.errorMessage = null;
    },
  },
});
