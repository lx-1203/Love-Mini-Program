import { defineStore } from "pinia";
import type { components } from "../services/generated/api-types";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";

type Schemas = components["schemas"];

export const useProfileStore = defineStore("profile", {
  state: () => ({
    basicProfile: null as Awaited<ReturnType<typeof clientApi.getBasicProfile>> | null,
    campusProfile: null as Awaited<ReturnType<typeof clientApi.getCampusProfile>> | null,
    scheduleProfile: null as Awaited<ReturnType<typeof clientApi.getScheduleProfile>> | null,
  }),
  actions: {
    async load() {
      const [basic, campus, schedule] = await Promise.all([
        clientApi.getBasicProfile(),
        clientApi.getCampusProfile(),
        clientApi.getScheduleProfile(),
      ]);
      this.basicProfile = basic;
      this.campusProfile = campus;
      this.scheduleProfile = schedule;
    },
    async saveBasicProfile(payload: Schemas["BasicProfileRequest"]) {
      this.basicProfile = await clientApi.saveBasicProfile(payload);
      await useSessionStore().refreshSession();
    },
    async saveCampusProfile(payload: Parameters<typeof clientApi.saveCampusProfile>[0]) {
      this.campusProfile = await clientApi.saveCampusProfile(payload);
      await useSessionStore().refreshSession();
    },
    async saveScheduleProfile(payload: Schemas["ScheduleProfileRequest"]) {
      this.scheduleProfile = await clientApi.saveScheduleProfile(payload);
      await useSessionStore().refreshSession();
    },
  },
});
