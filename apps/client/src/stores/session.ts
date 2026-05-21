import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { toLoginHeroView } from "../view-models/login";

export const useSessionStore = defineStore("session", {
  state: () => ({
    loading: false,
    userSession: null as Awaited<ReturnType<typeof clientApi.getSession>> | null,
    loginHero: null as ReturnType<typeof toLoginHeroView> | null,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.userSession?.loggedIn),
    featureFlags: (state) => state.userSession?.featureFlags ?? {},
    completionState: (state) => ({
      profileCompleted: Boolean(state.userSession?.profileCompleted),
      campusCompleted: Boolean(state.userSession?.campusVerified),
      scheduleCompleted: Boolean(state.userSession?.scheduleCompleted),
    }),
  },
  actions: {
    async refreshSession() {
      this.userSession = await clientApi.getSession();
      return this.userSession;
    },
    async bootstrap() {
      this.loading = true;
      try {
        const [hero, session] = await Promise.all([
          clientApi.getLoginHero(),
          clientApi.getSession(),
        ]);
        this.loginHero = toLoginHeroView(hero);
        this.userSession = session;
      } finally {
        this.loading = false;
      }
    },
    /**
     * 真实微信登录流程：
     * 1. 调用 uni.login 获取临时 code
     * 2. 将 code 传给后端换取 session
     * 3. 在开发工具/非微信环境使用 mock fallback
     * 4. 登录失败时显示错误 toast 并抛出异常供页面捕获
     */
    async loginWithWechat() {
      this.loading = true;
      try {
        let code = "mock-code";

        // 尝试调用真实 uni.login（在微信环境或开发工具中可用）
        try {
          const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
            uni.login({
              provider: "weixin",
              success: (res) => resolve(res),
              fail: (err) => reject(err),
            });
          });
          if (loginRes.code) {
            code = loginRes.code;
          }
        } catch (_loginErr) {
          // uni.login 不可用时回退到 mock code（H5 / 浏览器开发环境）
          console.warn("[session] uni.login failed, using mock code fallback");
        }

        const session = await clientApi.loginWithWechat(code);
        this.userSession = session;

        // 客户端缓存 token 以便后续请求鉴权
        if (session.userId) {
          try {
            uni.setStorageSync("auth_token", session.userId);
          } catch (_storageErr) {
            // 缓存写入失败不影响登录流程
          }
        }
        return session;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "微信登录失败，请稍后重试";
        uni.showToast({ title: message, icon: "none", duration: 2500 });
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
