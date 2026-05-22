import type { components } from "./generated/api-types";
import { mockFixtures } from "./mocks/fixtures";
import { appEnv } from "./env";
import { request } from "./http";

type Schemas = components["schemas"];
type SubmissionType = Schemas["SubmissionType"];

function useMock() {
  return appEnv.apiMode === "mock";
}

export const clientApi = {
  async getLoginHero() {
    if (useMock()) {
      return mockFixtures.getLoginHero();
    }
    return request<Schemas["LoginHeroConfig"]>({ url: "/app-config/login-hero" });
  },
  async getSession() {
    if (useMock()) {
      return mockFixtures.getSession();
    }
    return request<Schemas["UserSession"]>({ url: "/auth/me" });
  },
  async loginWithWechat(code: string) {
    if (useMock()) {
      return mockFixtures.loginWithWechat();
    }
    return request<Schemas["UserSession"], Schemas["WechatLoginRequest"]>({
      url: "/auth/wechat-login",
      method: "POST",
      data: { code },
    });
  },
  async getBasicProfile() {
    if (useMock()) {
      return mockFixtures.getBasicProfile();
    }
    return request<Schemas["BasicProfile"]>({ url: "/profile/basic" });
  },
  async saveBasicProfile(payload: Schemas["BasicProfileRequest"]) {
    if (useMock()) {
      return mockFixtures.saveBasicProfile(payload);
    }
    return request<Schemas["BasicProfile"], Schemas["BasicProfileRequest"]>({
      url: "/profile/basic",
      method: "PUT",
      data: payload,
    });
  },
  async getCampusProfile() {
    if (useMock()) {
      return mockFixtures.getCampusProfile();
    }
    return request<Schemas["CampusProfile"]>({ url: "/profile/campus" });
  },
  async saveCampusProfile(payload: Schemas["CampusProfileRequest"]) {
    if (useMock()) {
      return mockFixtures.saveCampusProfile(payload);
    }
    return request<Schemas["CampusProfile"], Schemas["CampusProfileRequest"]>({
      url: "/profile/campus",
      method: "PUT",
      data: payload,
    });
  },
  async getScheduleProfile() {
    if (useMock()) {
      return mockFixtures.getScheduleProfile();
    }
    return request<Schemas["ScheduleProfile"]>({ url: "/profile/schedule" });
  },
  async saveScheduleProfile(payload: Schemas["ScheduleProfileRequest"]) {
    if (useMock()) {
      return mockFixtures.saveScheduleProfile(payload);
    }
    return request<Schemas["ScheduleProfile"], Schemas["ScheduleProfileRequest"]>({
      url: "/profile/schedule",
      method: "PUT",
      data: payload,
    });
  },
  async getHomeDashboard() {
    if (useMock()) {
      return mockFixtures.getHomeDashboard();
    }
    return request<Schemas["HomeDashboard"]>({ url: "/home/dashboard" });
  },
  async getChatOverview() {
    if (useMock()) {
      return mockFixtures.getChatOverview();
    }
    return request<Schemas["ChatOverview"]>({ url: "/chat/overview" });
  },
  async pinTempChatSession(id: string) {
    if (useMock()) {
      return mockFixtures.pinTempChatSession(id);
    }
    return request<Schemas["ChatSessionSummary"]>({
      url: `/temp-chat/sessions/${id}/pin`,
      method: "POST",
    });
  },
  async unpinTempChatSession(id: string) {
    if (useMock()) {
      return mockFixtures.unpinTempChatSession(id);
    }
    return request<Schemas["ChatSessionSummary"]>({
      url: `/temp-chat/sessions/${id}/unpin`,
      method: "POST",
    });
  },
  async markTempChatSessionRead(id: string) {
    if (useMock()) {
      return mockFixtures.markTempChatSessionRead(id);
    }
    return request<Schemas["ChatSessionSummary"]>({
      url: `/temp-chat/sessions/${id}/read`,
      method: "POST",
    });
  },
  async getDiscussionRecommendations() {
    if (useMock()) {
      return mockFixtures.getDiscussionRecommendations();
    }
    return request<Schemas["DiscussionRecommendation"][]>({
      url: "/recommendations/discussions",
    });
  },
  async getActivityRecommendations() {
    if (useMock()) {
      return mockFixtures.getActivityRecommendations();
    }
    return request<Schemas["ActivityRecommendation"][]>({
      url: "/recommendations/activities",
    });
  },
  async getMatchFormConfig() {
    if (useMock()) {
      return mockFixtures.getMatchFormConfig();
    }
    return request<Schemas["MatchFormConfig"]>({ url: "/matches/form-config" });
  },
  async createMatch(payload: Schemas["MatchRequest"]) {
    if (useMock()) {
      return mockFixtures.createMatch(payload);
    }
    return request<Schemas["MatchResult"], Schemas["MatchRequest"]>({
      url: "/matches",
      method: "POST",
      data: payload,
    });
  },
  async createQuickMatch(payload: Schemas["QuickMatchRequest"]) {
    if (useMock()) {
      return mockFixtures.createQuickMatch(payload);
    }
    return request<Schemas["MatchResult"], Schemas["QuickMatchRequest"]>({
      url: "/matches/quick",
      method: "POST",
      data: payload,
    });
  },
  async getMatchResult(id: string) {
    if (useMock()) {
      return mockFixtures.getMatchResult(id);
    }
    return request<Schemas["MatchResult"]>({ url: `/matches/${id}` });
  },
  async createTempChatSession(payload: Schemas["CreateTempChatSessionRequest"]) {
    if (useMock()) {
      return mockFixtures.createTempChatSession(payload);
    }
    return request<
      Schemas["TempChatSession"],
      Schemas["CreateTempChatSessionRequest"]
    >({
      url: "/temp-chat/sessions",
      method: "POST",
      data: payload,
    });
  },
  async getTempChatSession(id: string) {
    if (useMock()) {
      return mockFixtures.getTempChatSession(id);
    }
    return request<Schemas["TempChatSession"]>({ url: `/temp-chat/sessions/${id}` });
  },
  async sendTempChatMessage(id: string, payload: Schemas["ChatMessageRequest"]) {
    if (useMock()) {
      return mockFixtures.sendTempChatMessage(id, payload);
    }
    return request<Schemas["TempChatSession"], Schemas["ChatMessageRequest"]>({
      url: `/temp-chat/sessions/${id}/messages`,
      method: "POST",
      data: payload,
    });
  },
  async respondToContactExchange(
    id: string,
    payload: Schemas["ContactExchangeDecisionRequest"]
  ) {
    if (useMock()) {
      return mockFixtures.respondToContactExchange(id, payload.actor, payload.decision);
    }
    return request<
      Schemas["TempChatSession"],
      Schemas["ContactExchangeDecisionRequest"]
    >({
      url: `/temp-chat/sessions/${id}/contact-exchange/respond`,
      method: "POST",
      data: payload,
    });
  },
  async endTempChatSession(id: string) {
    if (useMock()) {
      return mockFixtures.endTempChatSession(id);
    }
    return request<Schemas["TempChatSession"]>({
      url: `/temp-chat/sessions/${id}/end`,
      method: "POST",
    });
  },
  async simulateError(status: 400 | 404 | 500) {
    if (useMock()) {
      return mockFixtures.simulateError(status);
    }
    return request<never>({
      url: `/_debug/errors/${status}`,
      method: "POST",
    });
  },
  async listSubmissions(type?: SubmissionType) {
    if (useMock()) {
      return mockFixtures.listSubmissions(type);
    }
    const suffix = type ? `?type=${type}` : "";
    return request<Schemas["SubmissionRecord"][]>({
      url: `/feedback/my-submissions${suffix}`,
    });
  },
  async createFeedbackIssue(payload: Schemas["SubmissionRequest"]) {
    if (useMock()) {
      return mockFixtures.createSubmission("feedback", payload);
    }
    return request<Schemas["SubmissionRecord"], Schemas["SubmissionRequest"]>({
      url: "/feedback/issues",
      method: "POST",
      data: payload,
    });
  },
  async createSuggestion(payload: Schemas["SubmissionRequest"]) {
    if (useMock()) {
      return mockFixtures.createSubmission("suggestion", payload);
    }
    return request<Schemas["SubmissionRecord"], Schemas["SubmissionRequest"]>({
      url: "/feedback/suggestions",
      method: "POST",
      data: payload,
    });
  },
  async createActivityProposal(payload: Schemas["SubmissionRequest"]) {
    if (useMock()) {
      return mockFixtures.createSubmission("activity_proposal", payload);
    }
    return request<Schemas["SubmissionRecord"], Schemas["SubmissionRequest"]>({
      url: "/feedback/activity-proposals",
      method: "POST",
      data: payload,
    });
  },
};
