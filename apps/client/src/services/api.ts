import type { components } from "./generated/api-types";
import type {
  ProfileStats,
  RecommendationFilter,
  RecommendedPerson,
  UpdateBasicProfileRequest,
} from "./generated/api-types-supplement";
import { mockFixtures } from "./mocks/fixtures";
import { appEnv } from "./env";
import { getToken, request, setToken, setRefreshToken, clearTokens } from "./http";

type Schemas = components["schemas"];
type SubmissionType = Schemas["SubmissionType"];

function useMock() {
  return appEnv.apiMode === "mock";
}

/**
 * 构建 recommendations 端点的 query string。
 *
 * 多值字段（educationLevel、relationshipStatus）以逗号拼接，
 * 与后端 GET /api/recommendations 契约一致。
 *
 * @param filter - 推荐筛选条件
 * @returns 拼接好的 query string（不含前导 ?），空 filter 返回空字符串
 */
function buildRecommendationsQuery(filter: RecommendationFilter): string {
  const parts: string[] = [];
  if (filter.heightMin !== undefined) {
    parts.push(`heightMin=${encodeURIComponent(String(filter.heightMin))}`);
  }
  if (filter.heightMax !== undefined) {
    parts.push(`heightMax=${encodeURIComponent(String(filter.heightMax))}`);
  }
  if (filter.educationLevel && filter.educationLevel.length > 0) {
    parts.push(
      `educationLevel=${encodeURIComponent(filter.educationLevel.join(","))}`
    );
  }
  if (filter.relationshipStatus && filter.relationshipStatus.length > 0) {
    parts.push(
      `relationshipStatus=${encodeURIComponent(filter.relationshipStatus.join(","))}`
    );
  }
  if (filter.hometownProvince) {
    parts.push(`hometownProvince=${encodeURIComponent(filter.hometownProvince)}`);
  }
  if (filter.hometownCity) {
    parts.push(`hometownCity=${encodeURIComponent(filter.hometownCity)}`);
  }
  if (filter.futureCity) {
    parts.push(`futureCity=${encodeURIComponent(filter.futureCity)}`);
  }
  if (filter.keyword && filter.keyword.trim().length > 0) {
    parts.push(`keyword=${encodeURIComponent(filter.keyword.trim())}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * 通过 uni.uploadFile 上传文件到指定端点。
 *
 * 兼容 H5 与 mp-weixin：
 * - H5 端 File 对象标准，可直接传给 uni.uploadFile（uni-app 内部转换）
 * - mp-weixin 端 File 类型不存在，调用方需传入带 path 字段的类 File 对象
 *   （uni.chooseImage 的返回值经包装后即可）
 *
 * @param file - 文件对象（H5 标准 File 或 uni-app 扩展的带 path 字段对象）
 * @param endpoint - 上传端点路径（不含 apiBaseUrl 前缀）
 * @param extraFields - 附带到 FormData 的额外字段（如 index）
 * @returns 解析后的服务端响应体
 */
function uploadFileViaUni<TResponse>(
  file: File,
  endpoint: string,
  extraFields?: Record<string, string>
): Promise<TResponse> {
  // 兼容 mp-weixin：uni.chooseImage 返回 tempFilePaths，调用方包装为 File-like
  // 对象时需挂 path 字段；H5 端 File 没有 path，回退到 name
  const fileWithExtra = file as File & { path?: string };
  const filePath = fileWithExtra.path ?? file.name;

  return new Promise<TResponse>((resolve, reject) => {
    uni.uploadFile({
      url: `${appEnv.apiBaseUrl}${endpoint}`,
      filePath,
      name: "file",
      // 附带额外字段（如照片墙 index）
      formData: extraFields,
      header: {
        Authorization: `Bearer ${getToken()}`,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(res.data) as TResponse;
            resolve(data);
          } catch (e) {
            reject(
              new Error(
                `上传响应解析失败: ${e instanceof Error ? e.message : String(e)}`
              )
            );
          }
        } else {
          reject(new Error(`上传失败: HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || "上传请求失败"));
      },
    });
  });
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
    return request<ProfileStats>({ url: "/profile/stats" });
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
   * 撤回临时聊天会话中的某条消息。
   * 仅发送者本人可在发送后 2 分钟内撤回。
   */
  async recallTempChatMessage(sessionId: string, messageId: string) {
    if (useMock()) {
      return mockFixtures.recallTempChatMessage(sessionId, messageId);
    }
    return request<Schemas["TempChatSession"]>({
      url: `/temp-chat/sessions/${sessionId}/messages/${messageId}/recall`,
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
      // 修复：移除前导 /api，避免与 apiBaseUrl 拼接后变成 /api/api/match/...
      url: `/match/icebreakers/profile/${peerUserId}`,
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
    }>({ url: "/growth/social-progress" });
  },

  /**
   * 登出：通知后端使 token 失效，并清除本地 Token，跳转登录页。
   *
   * 修复：原代码仅清除本地 token，未通知后端使 refresh token 失效，
   * 存在 token 被盗用风险（用户登出后旧 token 仍有效）。
   * 现在调用后端登出接口（即使失败也清除本地 token）。
   */
  async logout() {
    try {
      // 尝试通知后端使 token 失效（best effort，失败不阻塞前端清理）
      await request<void>({
        url: "/auth/logout",
        method: "POST",
      });
    } catch (error) {
      // 后端登出失败不阻塞前端清理，仅记录日志
      console.warn("[api.logout] 后端登出接口调用失败:", error);
    } finally {
      // 无论后端登出是否成功，都清除本地 token
      clearTokens();
      uni.reLaunch({
        url: "/pages/login/index",
      });
    }
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

  /**
   * 更新基本资料（含 Phase A 扩展字段）。
   *
   * 对应后端 PUT /api/profile/basic 端点，承载 UserBasicProfile 实体中
   * 在 Phase A 任务中新增的所有扩展字段。所有字段均为可选，调用方按需传入。
   * 后端会重新计算 profileCompletion 并更新会话状态。
   *
   * @param data - 更新请求体
   */
  async updateBasicProfile(data: UpdateBasicProfileRequest): Promise<void> {
    if (useMock()) {
      mockFixtures.updateBasicProfile(data);
      return;
    }
    await request<void, UpdateBasicProfileRequest>({
      url: "/profile/basic",
      method: "PUT",
      data,
    });
  },

  /**
   * 上传个人主页背景图。
   *
   * 对应后端 POST /api/profile/background 端点，使用 multipart/form-data。
   * 上传成功后服务端返回 {url: string}，并更新 UserBasicProfile.profileBackgroundUrl。
   *
   * @param file - 图片文件（jpg/png/webp，≤10MB）
   * @returns 服务端返回的图片 URL
   */
  async uploadProfileBackground(file: File): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfileBackground(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/profile/background");
  },

  /**
   * 上传照片墙指定索引（0-5）。
   *
   * 对应后端 POST /api/profile/photos 端点，使用 multipart/form-data，
   * 通过 FormData 字段 index 指定照片在照片墙中的位置。
   * 超过 6 张时后端返回 400。
   *
   * @param file - 图片文件
   * @param index - 照片墙索引（0-5）
   * @returns 服务端返回的图片 URL
   */
  async uploadProfilePhoto(
    file: File,
    index: number
  ): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfilePhoto(file, index);
    }
    return uploadFileViaUni<{ url: string }>(file, "/profile/photos", {
      index: String(index),
    });
  },

  /**
   * 删除照片墙指定索引。
   *
   * 对应后端 DELETE /api/profile/photos/{index} 端点。
   *
   * @param index - 照片墙索引（0-5）
   */
  async deleteProfilePhoto(index: number): Promise<void> {
    if (useMock()) {
      mockFixtures.deleteProfilePhoto(index);
      return;
    }
    await request<void>({
      url: `/profile/photos/${index}`,
      method: "DELETE",
    });
  },

  /**
   * 上传个人视频。
   *
   * 对应后端 POST /api/profile/video 端点，使用 multipart/form-data。
   * 视频校验：mp4/mov，≤50MB，≤60s。
   *
   * @param file - 视频文件
   * @returns 服务端返回的视频 URL
   */
  async uploadProfileVideo(file: File): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfileVideo(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/profile/video");
  },

  /**
   * 上传半身照。
   *
   * 对应后端 POST /api/profile/half-body 端点，使用 multipart/form-data。
   *
   * @param file - 图片文件
   * @returns 服务端返回的图片 URL
   */
  async uploadProfileHalfBody(file: File): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfileHalfBody(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/profile/half-body");
  },

  /**
   * 获取推荐列表（含 Phase B 扩展筛选字段）。
   *
   * 对应后端 GET /api/recommendations 端点，所有筛选参数均为可选 query string。
   * 多值字段（educationLevel、relationshipStatus）以逗号拼接。
   *
   * @param filter - 筛选条件（所有字段可选）
   * @returns 推荐人物列表，包含 Phase A/B 扩展字段
   */
  async getRecommendations(
    filter: RecommendationFilter
  ): Promise<RecommendedPerson[]> {
    if (useMock()) {
      return mockFixtures.getRecommendations(filter);
    }
    const query = buildRecommendationsQuery(filter);
    return request<RecommendedPerson[]>({
      url: `/recommendations${query}`,
      method: "GET",
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
