/**
 * @deprecated 首页 Store 已废弃。
 * 迁移路径：
 *   - home → discover（寻觅页）作为新的主入口
 *   - AI 计划 → 已移除，由规则引擎推荐（discover）替代
 *   - 课表编辑器 → profile 资料字段（可显示但不可编辑）
 *   - 匹配 → likes（喜欢） + discover（寻觅）
 * 本文件保留仅用于回滚参考。
 */
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
