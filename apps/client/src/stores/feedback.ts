import { defineStore } from "pinia";
import { clientApi } from "../services/api";

export const useFeedbackStore = defineStore("feedback", {
  state: () => ({
    submissions: [] as Awaited<ReturnType<typeof clientApi.listSubmissions>>,
  }),
  actions: {
    async load(type?: Parameters<typeof clientApi.listSubmissions>[0]) {
      this.submissions = await clientApi.listSubmissions(type);
    },
    async submitIssue(payload: Parameters<typeof clientApi.createFeedbackIssue>[0]) {
      await clientApi.createFeedbackIssue(payload);
      await this.load();
    },
    async submitSuggestion(payload: Parameters<typeof clientApi.createSuggestion>[0]) {
      await clientApi.createSuggestion(payload);
      await this.load();
    },
    async submitActivityProposal(payload: Parameters<typeof clientApi.createActivityProposal>[0]) {
      await clientApi.createActivityProposal(payload);
      await this.load();
    },
  },
});
