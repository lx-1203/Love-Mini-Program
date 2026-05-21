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
    async loginWithWechat(code = "mock-code") {
      this.userSession = await clientApi.loginWithWechat(code);
      return this.userSession;
    },
  },
});
