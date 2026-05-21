import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { toMatchSummary } from "../view-models/match";

export const useMatchStore = defineStore("match", {
  state: () => ({
    loadingFormConfig: false,
    loadingMatchResult: false,
    errorMessage: null as string | null,
    formConfig: null as Awaited<ReturnType<typeof clientApi.getMatchFormConfig>> | null,
    activeMatch: null as ReturnType<typeof toMatchSummary> | null,
  }),
  actions: {
    setActiveMatch(result: Awaited<ReturnType<typeof clientApi.getMatchResult>>) {
      this.activeMatch = toMatchSummary(result);
      return this.activeMatch;
    },
    async loadFormConfig() {
      this.loadingFormConfig = true;
      this.errorMessage = null;

      try {
        this.formConfig = await clientApi.getMatchFormConfig();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "匹配配置加载失败";
      } finally {
        this.loadingFormConfig = false;
      }
    },
    async submitMatch(payload: Parameters<typeof clientApi.createMatch>[0]) {
      this.errorMessage = null;

      try {
        const result = await clientApi.createMatch(payload);
        return this.setActiveMatch(result);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "匹配发起失败";
        throw error;
      }
    },
    async quickMatch(durationMinutes: number) {
      this.errorMessage = null;

      try {
        const result = await clientApi.createQuickMatch({ durationMinutes });
        return this.setActiveMatch(result);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "快速匹配失败";
        throw error;
      }
    },
    async refreshActiveMatch() {
      if (!this.activeMatch) {
        return null;
      }

      this.loadingMatchResult = true;
      this.errorMessage = null;

      try {
        const result = await clientApi.getMatchResult(this.activeMatch.id);
        return this.setActiveMatch(result);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "匹配结果刷新失败";
        return null;
      } finally {
        this.loadingMatchResult = false;
      }
    },
  },
});
