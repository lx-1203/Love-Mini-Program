import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";
import { toHomePageView } from "../view-models/home";

export const useHomeStore = defineStore("home", {
  state: () => ({
    loading: false,
    errorMessage: null as string | null,
    dashboard: null as Awaited<ReturnType<typeof clientApi.getHomeDashboard>> | null,
    pageView: null as ReturnType<typeof toHomePageView> | null,
  }),
  actions: {
    async loadDashboard() {
      this.loading = true;
      this.errorMessage = null;
      try {
        const sessionStore = useSessionStore();

        this.dashboard = await clientApi.getHomeDashboard();
        this.pageView = toHomePageView(this.dashboard, sessionStore.completionState);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "首页加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
