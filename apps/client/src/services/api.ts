import type { components } from "./generated/api-types";
import { mockFixtures } from "./mocks/fixtures";
import { appEnv } from "./env";
import { request, setToken, setRefreshToken, clearTokens } from "./http";

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
    const result = await request<Schemas["UserSession"], Schemas["WechatLoginRequest"]>({
      url: "/auth/wechat-login",
      method: "POST",
      data: { code },
    });
    // 登录成功后，将 token 保存到本地存储
    // 后端 UserSession 中可能包含 token 信息，按约定保存
    if ((result as Record<string, unknown>).token) {
      setToken((result as Record<string, unknown>).token as string);
    }
    if ((result as Record<string, unknown>).refreshToken) {
      setRefreshToken((result as Record<string, unknown>).refreshToken as string);
    }
    return result;
  },
  async getBasicProfile() {
    if (useMock()) {
      return mockFixtures.getBasicProfile();
    }
    return request<Schemas["BasicProfile"]>({ url: "/profile/basic" });
  },
  async getProfileStats() {
    if (useMock()) {
      return mockFixtures.getProfileStats();
    }
    return request<Schemas["ProfileStats"]>({ url: "/profile/stats" });
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
  /**
   * 获取基于对方资料的破冰话题列表（私信场景）。
   * 返回结构化的破冰话题，含 id、content、category、source 字段。
   * Mock 模式下返回本地硬编码数据。
   * @param peerUserId - 对方的用户 ID
   */
  async getIcebreakers(peerUserId: number) {
    if (useMock()) {
      return mockFixtures.getIcebreakers(peerUserId);
    }
    return request<{
      items: Array<{ id: number; content: string; category: string; source: string }>;
    }>({
      url: `/api/match/icebreakers/profile/${peerUserId}`,
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
  async getCheckInStatus() {
    if (useMock()) {
      return mockFixtures.getCheckInStatus();
    }
    return request<CheckInStatusResponse>({ url: "/check-in/status" });
  },
  async checkIn() {
    if (useMock()) {
      return mockFixtures.checkIn();
    }
    return request<CheckInResultResponse>({
      url: "/check-in",
      method: "POST",
    });
  },

  /**
   * 获取社交升温进度数据。
   * Mock 模式下返回本地硬编码数据。
   */
  async getSocialProgress() {
    if (useMock()) {
      return mockFixtures.getSocialProgress();
    }
    return request<{
      currentTier: string;
      tierLabel: string;
      exposureCount: number;
      likeCount: number;
      matchCount: number;
      chatCount: number;
      circleCount: number;
      activityCount: number;
      nextAction: string;
      progressPercentage: number;
    }>({ url: "/api/growth/social-progress" });
  },

  /**
   * 登出：清除本地 Token 并跳转登录页。
   */
  logout() {
    clearTokens();
    uni.reLaunch({
      url: "/pages/login/index",
    });
  },

  /**
   * 检查内容是否包含敏感词。
   * 在用户提交内容（发帖/评论/私信等）前调用，提示用户修改。
   * 服务端仍会对所有内容进行过滤（替换为 ***），此 API 仅用于前端实时提示。
   *
   * @param content 待检查的内容
   * @returns 包含敏感词提示的结果
   */
  async checkSensitiveWords(content: string) {
    if (useMock()) {
      // Mock 模式下返回无敏感词
      return { hasSensitiveWords: false, filteredWords: [] as string[] };
    }
    return request<{
      hasSensitiveWords: boolean;
      filteredWords: string[];
    }>({
      url: "/content-filter/check",
      method: "POST",
      data: { content },
    });
  },
};

/** 签到状态响应（GET /api/check-in/status） */
export interface CheckInStatusResponse {
  checkedIn: boolean;
  consecutiveDays: number;
}

/** 签到结果响应（POST /api/check-in） */
export interface CheckInResultResponse {
  checkInDate: string;
  consecutiveDays: number;
  extraRecommendations: number;
  extraRecommendQuota: number;
  hotTopicsUnlocked: boolean;
  newUsersUnlocked: boolean;
  hotTopicCount: number;
  newUserCount: number;
}
