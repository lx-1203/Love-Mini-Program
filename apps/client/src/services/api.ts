import type { components } from "./generated/api-types";
import type {
  AuthSessionResult,
  DoNotDisturbRequest,
  DoNotDisturbView,
  MakeUpCheckInResultView,
  ProfileStats,
  RecommendationFilter,
  RecommendedPerson,
  SubmissionDetailView,
  UpdateBasicProfileRequest,
} from "./generated/api-types-supplement";
import { mockFixtures } from "./mocks/fixtures";
import { appEnv, isDev, isMockMode } from "./env";
import { getToken, request, setToken, setRefreshToken, clearTokens, withTimeout, normalizeApiPath } from "./http";
// Task 33：路由路径常量化，避免硬编码字符串
import { ROUTES } from "../constants/routes";
// B3 恋爱小纸条：悄悄话解锁视图类型（后端 WhisperUnlockView 镜像）
import type { WhisperUnlockView } from "../stores/discover/types";

type Schemas = components["schemas"];
type SubmissionType = Schemas["SubmissionType"];

/** Task 31：文件上传默认超时时间（30s，文件上传耗时较长） */
const UPLOAD_TIMEOUT_MS = 30000;

function useMock() {
  return isMockMode();
}

/**
 * 生成本地日期字符串（yyyy-MM-dd），用于签到/补签的幂等键。
 *
 * 说明：不使用 toISOString()（UTC 时区在凌晨会得到错误的日期），
 * 且不引入时间库，直接按本地时区格式化。
 *
 * @param d 目标日期
 * @returns yyyy-MM-dd（本地时区）
 */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * uni-app 上传文件所需的类 File 对象（mp-weixin 端无标准 File 类型）。
 *
 * 与 Web File 接口的差异：
 * - 必须包含 `path` 字段（uni.chooseImage 返回的 tempFilePaths 包装后挂载），
 *   uni.uploadFile 通过 path 读取本地临时文件；
 * - H5 端 File 没有 path 字段，回退到 name。
 *
 * 此处通过单独 interface 定义而非 `File & { path?: string }` 交叉类型断言，
 * 避免在 H5 标准 File 上强加 path 字段导致类型不一致。
 *
 * 导出供 stores/profile.ts、pages/profile/*、subpackages/support/feedback 等调用方
 * 共享同一类型，消除 `as unknown as File` 交叉类型断言。
 */
export interface UniUploadFileLike {
  /** 文件名（H5 端 File.name 回退使用） */
  name: string;
  /** mp-weixin 端临时文件路径（H5 端可缺失） */
  path?: string;
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
  // 2026-08-08：年龄筛选接线（后端 V2026.08.08.0015 新增 ageMin/ageMax 参数）
  if (filter.ageMin !== undefined) {
    parts.push(`ageMin=${encodeURIComponent(String(filter.ageMin))}`);
  }
  if (filter.ageMax !== undefined) {
    parts.push(`ageMax=${encodeURIComponent(String(filter.ageMax))}`);
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
 * Task 31：使用 withTimeout 包装，默认 30s 超时（文件上传耗时较长）。
 * 超时后请求被 abort，调用方收到 EnhancedApiError（category=network）。
 *
 * @param file - 文件对象（H5 标准 File 或 uni-app 扩展的带 path 字段对象）
 * @param endpoint - 上传端点路径（不含 apiBaseUrl 前缀）
 * @param extraFields - 附带到 FormData 的额外字段（如 index）
 * @returns 解析后的服务端响应体
 */
function uploadFileViaUni<TResponse>(
  file: UniUploadFileLike,
  endpoint: string,
  extraFields?: Record<string, string>
): Promise<TResponse> {
  // 兼容 mp-weixin：uni.chooseImage 返回 tempFilePaths，调用方包装为 UniUploadFileLike
  // 对象时需挂 path 字段；H5 端 File 没有 path，回退到 name。
  // 参数类型已收敛为 UniUploadFileLike，无需 `as unknown as UniUploadFileLike` 断言。
  const filePath = file.path ?? file.name;

  // Task 31：使用 AbortController 实现超时控制
  const controller = new AbortController();
  // 修复（P1 BUG）：保存 uni.uploadFile 返回的 UploadTask 引用，
  // 超时/取消时通过 abort() 终止底层上传任务。
  // 注：uni.uploadFile 的 abort 能力受平台限制——mp-weixin 支持
  // task.abort()，H5 端部分实现可能仅忽略后续进度回调，属平台差异，
  // 此处尽力而为，无法中止时至少保证 Promise 按时 reject。
  let uploadTask: UniApp.UploadTask | undefined;
  const uploadPromise = new Promise<TResponse>((resolve, reject) => {
    uploadTask = uni.uploadFile({
      // P3 联调：上传端点同样补齐 /v1 前缀（原未带前缀，real 模式 404）
      url: `${appEnv.apiBaseUrl}${normalizeApiPath(endpoint)}`,
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
            // JSON.parse 返回 unknown，使用 unknown 中转再断言为 TResponse，
            // 明确两步收敛（parse -> unknown -> TResponse）替代单步 `as TResponse`。
            const parsed: unknown = JSON.parse(res.data);
            resolve(parsed as TResponse);
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

    // 修复（P1 BUG）：abort 接入——controller 超时/外部取消时同步中止上传任务
    controller.signal.addEventListener(
      "abort",
      () => {
        try {
          uploadTask?.abort();
        } catch (_e) {
          // abort 失败静默处理（任务可能已完成）
        }
      },
      { once: true }
    );
  });

  // Task 31：30s 超时控制，超时后调用方收到 EnhancedApiError（category=network, error=timeout）
  return withTimeout(uploadPromise, UPLOAD_TIMEOUT_MS, controller.signal);
}

export const clientApi = {
  /**
   * 获取客户端配置聚合（B6：后台配置即时生效，前后端联动）。
   *
   * <p>对应后端 GET /api/v1/app-config（permitAll），返回
   * {@code {switches: {...}, rules: {...}, siteTitle: "..."}} 扁平结构：
   * <ul>
   *   <li>switches：功能开关（maintenance_mode / register_open / login_open /
   *       match_open / recommend_open / post_publish_open / feedback_open），
   *       缺失开关默认视为开启；</li>
   *   <li>rules：业务规则（daily_recommend_limit / heart_signal_expire_hours）；</li>
   *   <li>siteTitle：站点标题。</li>
   * </ul>
   * 数据源为 app_switch / app_rule / app_config 表，不缓存——管理后台更新后
   * 客户端按 30s TTL 拉取即可生效。
   * Mock 模式返回全部开关开启的默认值（维护模式关闭），保证 mock 端功能不收敛。</p>
   */
  async getAppConfig(): Promise<ClientAppConfig> {
    if (useMock()) {
      return {
        switches: {
          maintenance_mode: false,
          register_open: true,
          login_open: true,
          match_open: true,
          recommend_open: true,
          post_publish_open: true,
          feedback_open: true,
        },
        rules: {
          daily_recommend_limit: 10,
          heart_signal_expire_hours: 48,
        },
        siteTitle: "校园恋爱",
      };
    }
    return request<ClientAppConfig>({ url: "/app-config", method: "GET" });
  },
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
    // 登录成功后，将 token 保存到本地存储。
    // 后端 UserSession 中可能包含 token / refreshToken 字段（按约定保存），
    // 但 OpenAPI 生成类型 Schemas["UserSession"] 暂未声明这两个字段。
    // 通过 api-types-supplement 的 AuthSessionResult 具名补充类型收敛，
    // 替代散落的 `as Record<string, unknown>` 反复断言。
    // infra R2-00120: 登录响应断言收敛为具名补充类型 AuthSessionResult
    const resultRecord = result as unknown as AuthSessionResult;
    if (typeof resultRecord.token === "string" && resultRecord.token.length > 0) {
      setToken(resultRecord.token);
    }
    if (typeof resultRecord.refreshToken === "string" && resultRecord.refreshToken.length > 0) {
      setRefreshToken(resultRecord.refreshToken);
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
   *
   * 修复（P0-06）：后端不存在按对方用户 ID 的破冰端点
   * （原 GET /api/match/icebreakers/profile/{peerUserId} 为死端点，404），
   * 现有唯一端点为 GET /api/matches/{matchId}/icebreakers（按心动信号 matchId，
   * 见 MatchController.getIcebreakers，响应为 IcebreakerView 数组）。
   * 私信会话调用方仅持有会话对端用户 ID（chat-session 的 resolvePeerUserId），
   * 无法推导 matchId，Real 模式返回空列表避免请求不存在的端点；
   * 匹配场景的话题获取走 chat store 的 loadIcebreakers(matchId)（同文件端点）。
   * @param peerUserId - 对方的用户 ID
   */
  async getIcebreakers(peerUserId: number) {
    if (useMock()) {
      return mockFixtures.getIcebreakers(peerUserId);
    }
    // Real 模式：无对端可用端点，返回空列表（话题功能由匹配维度端点承载）
    return { items: [] as Array<{ id: number; content: string; category: string; source: string }> };
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
      return mockFixtures.createSubmission("FEEDBACK", payload);
    }
    return request<Schemas["SubmissionRecord"], Schemas["SubmissionRequest"]>({
      url: "/feedback/issues",
      method: "POST",
      data: payload,
    });
  },
  async createSuggestion(payload: Schemas["SubmissionRequest"]) {
    if (useMock()) {
      return mockFixtures.createSubmission("SUGGESTION", payload);
    }
    return request<Schemas["SubmissionRecord"], Schemas["SubmissionRequest"]>({
      url: "/feedback/suggestions",
      method: "POST",
      data: payload,
    });
  },
  async createActivityProposal(payload: Schemas["SubmissionRequest"]) {
    if (useMock()) {
      return mockFixtures.createSubmission("ACTIVITY_PROPOSAL", payload);
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
    // 后端 @Idempotent 校验（IdempotentInterceptor，Redis key 按 {key}:{userId} 隔离）：
    // 以日期为幂等键，同一天内的重复/重试签到返回同一结果，杜绝重复扣权益。
    return request<CheckInResultResponse>({
      url: "/check-in",
      method: "POST",
      headers: { "Idempotency-Key": `checkin-${localDateKey(new Date())}` },
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
   * 登出：通知后端使 token 失效，再清除本地 Token 并跳转登录页。
   *
   * 修复（P1 BUG）：原实现先 clearTokens() 再异步发后端请求，导致登出请求
   * 不带 Authorization 头，后端无法撤销 token。现改为：
   * 1. 先发后端 logout 请求（携带 Authorization，请求拦截器在构造时附加 token），
   *    带 5s 短超时与 noRetry，避免接口 hang 阻塞退出；
   * 2. 无论成败，finally 中清本地 token + 跳转登录页（用户无感退出）。
   *
   * 安全权衡：后端 logout 失败时旧 token 在过期时间前仍有效，但本地已无 token，
   * 用户侧已退出；refresh_token 同时被清除，无法续期。
   */
  /**
   * 退出登录（2026-08-12 卡顿修复）。
   *
   * 语义调整：**立即**清本地 token + 跳转登录页，后端登出通知改为后台 fire-and-forget。
   * 原实现 await 后端 /auth/logout（5s 超时）成功后才跳转——弱网/Redis 慢时点击退出
   * 后界面卡住数秒无反馈，用户感知「点不动/卡顿」并反复点击。
   *
   * 安全权衡：后端登出失败时旧 token 在过期时间前仍有效，但本地已无 token，
   * 用户侧已退出；refresh_token 同时被清除，无法续期。
   */
  logout() {
    // 0. 先捕获旧 token（clearTokens 后 request 内部 getToken() 取不到，
    //    后端撤销请求需显式携带 Authorization 头）
    const token = getToken();
    // 1. 立即清理本地 token + 跳转登录页（用户无感、零等待）
    clearTokens();
    uni.reLaunch({ url: ROUTES.LOGIN });
    // 2. 后台通知后端撤销 token（fire-and-forget：不 await、不阻塞跳转；
    //    5s 短超时 + noRetry，失败仅记录日志）
    if (token) {
      void request<void>({
        url: "/auth/logout",
        method: "POST",
        noRetry: true,
        timeout: 5000,
        headers: { Authorization: `Bearer ${token}` },
      }).catch((error) => {
        // 后端登出失败仅记录日志，不阻塞本地退出
        // 诊断日志仅在开发环境输出（R4-00661）
        if (isDev) {
          console.warn("[api.logout] 后端登出接口调用失败:", error);
        }
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
  async uploadProfileBackground(file: UniUploadFileLike): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfileBackground(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/profile/background");
  },

  /**
   * 上传头像（2026-08-07 新增接线）。
   *
   * 对应后端 POST /api/profile/avatar 端点，使用 multipart/form-data。
   * 头像存于 users.avatar_url，由推荐卡片与个人主页共用。
   *
   * @param file - 头像图片文件（jpg/png/webp，≤10MB）
   * @returns 更新后的基本资料视图（含 avatarUrl）
   */
  async uploadAvatar(file: UniUploadFileLike): Promise<{ avatarUrl?: string; url?: string }> {
    if (useMock()) {
      // R4-00153：独立 mock 头像实现（不再复用背景图语义的 uploadProfileBackground）
      return mockFixtures.uploadAvatar(file);
    }
    return uploadFileViaUni<{ avatarUrl?: string }>(file, "/profile/avatar");
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
    file: UniUploadFileLike,
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
   * 上传半身照。
   *
   * 对应后端 POST /api/profile/half-body 端点，使用 multipart/form-data。
   *
   * @param file - 图片文件
   * @returns 服务端返回的图片 URL
   */
  async uploadProfileHalfBody(file: UniUploadFileLike): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfileHalfBody(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/profile/half-body");
  },

  /**
   * P2.6：上传 60s 语音状态（Phase Feedback5）。
   *
   * 对应后端 POST /api/v1/media/upload?type=audio&durationMs={ms} 端点，
   * 使用 multipart/form-data（type / durationMs 以 formData 字段传递）。
   * 音频校验：aac/mp3/m4a/wav，≤8MB。
   *
   * @param file - 录音临时文件（RecorderManager onStop 的 tempFilePath 包装）
   * @param durationMs - 录音时长（毫秒）
   * @returns 服务端返回的语音 URL
   */
  async uploadProfileVoice(file: UniUploadFileLike, durationMs: number): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadProfileVoice(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/media/upload", {
      type: "audio",
      durationMs: String(Math.round(durationMs)),
    });
  },

  /**
   * 上传帖子图片（P1-01）。
   *
   * 对应后端 POST /api/v1/media/upload?type=image 端点，使用 multipart/form-data。
   * 图片校验：jpg/jpeg/png/webp，≤10MB（LocalMediaStorageService）。
   * 兼容信封与扁平两种响应形态：后端返回 ApiResponse 信封 {data:{url,...}}，
   * 个别环境可能扁平返回 {url}，此处统一取 url。
   *
   * Mock 模式下直接返回本地路径（与现有图片链路一致，保持 mock 行为不破坏）。
   *
   * @param file - 图片文件（uni.chooseImage 的 tempFilePaths 包装）
   * @returns 服务端返回的图片 URL
   */
  async uploadPostImage(file: UniUploadFileLike): Promise<{ url: string }> {
    if (useMock()) {
      return { url: file.path ?? file.name };
    }
    const raw = await uploadFileViaUni<{ url?: string; data?: { url?: string } }>(file, "/media/upload", {
      type: "image",
    });
    // 兼容信封（{data:{url}}）与扁平（{url}）两种响应形态
    const url = raw?.url ?? raw?.data?.url;
    if (!url) {
      throw new Error("上传响应缺少图片 URL");
    }
    return { url };
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

  /**
   * 查询今日推荐配额使用情况（P0-31 修复）。
   *
   * <p>后端 {@code GET /api/v1/recommendations/quota} 返回
   * {@code {dailyLimit, used, remaining}}；remaining=-1 表示无限制（mock/服务未注入）。</p>
   *
   * @returns 配额视图（dailyLimit/used/remaining）
   */
  async getRecommendationQuota(): Promise<{
    dailyLimit: number;
    used: number;
    remaining: number;
  }> {
    if (useMock()) {
      return { dailyLimit: -1, used: 0, remaining: -1 };
    }
    return request({
      url: "/recommendations/quota",
      method: "GET",
    });
  },

  /**
   * 查询悄悄话内容（B3 恋爱小纸条，付费解锁后可见）。
   *
   * 对应后端 GET /api/v1/recommendations/{userId}/whisper（R4-00314）：
   * 已解锁（wallet_transaction_log 存在 MESSAGE_UNLOCK / WHISPER_UNLOCK 流水）时
   * 返回完整文案，未解锁返回 {unlocked:false, whisper:null}，不泄露付费内容。
   * 非幂等扣费端点，仅查询；mock 模式下文案随推荐卡片 fixtures 下发，此处返回空。
   *
   * @param userId - 目标用户 ID
   * @returns 悄悄话视图（unlocked / whisper / balanceCents）
   */
  async getWhisper(userId: string): Promise<WhisperUnlockView> {
    if (useMock()) {
      return { unlocked: true, whisper: null, balanceCents: null };
    }
    return request<WhisperUnlockView>({
      url: `/recommendations/${userId}/whisper`,
      method: "GET",
    });
  },

  /**
   * 付费解锁悄悄话并返回内容（B3 恋爱小纸条）。
   *
   * 对应后端 POST /api/v1/recommendations/{userId}/whisper/unlock：
   * 按服务端定价（app.unlock-price.whisper，默认 200 分=2 元）扣减钱包并写入
   * WHISPER_UNLOCK 流水，order_id 唯一索引保证同一目标只扣一次费（重复解锁幂等返回）。
   * 余额不足时后端抛 409（InsufficientBalanceException）。
   * mock 模式下扣费由 coinsStore.spend 承载，此处返回空结果。
   *
   * @param userId - 目标用户 ID
   * @returns 悄悄话视图（解锁成功后 unlocked=true 且含完整文案）
   */
  async unlockWhisper(userId: string): Promise<WhisperUnlockView> {
    if (useMock()) {
      return { unlocked: true, whisper: null, balanceCents: null };
    }
    return request<WhisperUnlockView>({
      url: `/recommendations/${userId}/whisper/unlock`,
      method: "POST",
    });
  },

  /**
   * 获取通知免打扰设置（功能6）。
   *
   * 对应后端 GET /api/dnd 端点。
   * Mock 模式下返回默认配置（关闭状态）。
   *
   * @returns 当前用户的免打扰设置视图
   */
  async getDndSetting(): Promise<DoNotDisturbView> {
    if (useMock()) {
      return mockFixtures.getDndSetting();
    }
    return request<DoNotDisturbView>({ url: "/dnd", method: "GET" });
  },

  /**
   * 更新通知免打扰设置（功能6）。
   *
   * 对应后端 PUT /api/dnd 端点。
   * 所有字段必填，校验由后端 @Valid 完成。
   *
   * @param payload - 免打扰设置请求体
   * @returns 更新后的免打扰设置视图
   */
  async updateDndSetting(payload: DoNotDisturbRequest): Promise<DoNotDisturbView> {
    if (useMock()) {
      return mockFixtures.updateDndSetting(payload);
    }
    return request<DoNotDisturbView, DoNotDisturbRequest>({
      url: "/dnd",
      method: "PUT",
      data: payload,
    });
  },

  /**
   * 签到补签（功能7）。
   *
   * 对应后端 POST /api/check-in/make-up 端点。
   * 用于补签昨日及之前 7 天内的某一天。
   *
   * @param date - 补签日期（yyyy-MM-dd）
   * @returns 补签结果视图（含连续天数/已用次数/消耗积分）
   */
  async makeUpCheckIn(date: string): Promise<MakeUpCheckInResultView> {
    if (useMock()) {
      return mockFixtures.makeUpCheckIn(date);
    }
    // 与签到一致：以补签日期为幂等键，同一日期重复补签返回同一结果
    return request<MakeUpCheckInResultView, { date: string }>({
      url: "/check-in/make-up",
      method: "POST",
      data: { date },
      headers: { "Idempotency-Key": `makeup-${date}` },
    });
  },

  /**
   * 上传反馈图片（功能9）。
   *
   * 对应后端 POST /api/feedback/images 端点，使用 multipart/form-data。
   * 限制：jpg/png/webp，单张 ≤5MB。
   *
   * @param file - 图片文件
   * @returns 服务端返回的图片 URL
   */
  async uploadFeedbackImage(file: UniUploadFileLike): Promise<{ url: string }> {
    if (useMock()) {
      return mockFixtures.uploadFeedbackImage(file);
    }
    return uploadFileViaUni<{ url: string }>(file, "/feedback/images");
  },

  /**
   * 获取反馈提交详情（功能10）。
   *
   * 对应后端 GET /api/feedback/my-submissions/{id} 端点。
   * 用于反馈历史详情页展示完整内容、附件和最新回复。
   *
   * @param id - 反馈记录 ID
   * @returns 反馈详情视图（含 content/attachments/latestReplyContent）
   */
  async getSubmissionDetail(id: number): Promise<SubmissionDetailView> {
    if (useMock()) {
      return mockFixtures.getSubmissionDetail(id);
    }
    return request<SubmissionDetailView>({
      url: `/feedback/my-submissions/${id}`,
      method: "GET",
    });
  },
};

/** 签到状态响应（GET /api/check-in/status）。
 * R4-00151：字段名对齐后端契约（checkedInToday），原 checkedIn 与契约不符，
 * 消费方会静默丢字段。 */
export interface CheckInStatusResponse {
  checkedInToday: boolean;
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

/**
 * 客户端配置聚合（B6：后台配置即时生效，前后端联动）。
 *
 * 对应后端 GET /api/v1/app-config 扁平响应，数据源为
 * app_switch / app_rule / app_config 三张表（不缓存，管理后台更新后按 TTL 拉取生效）。
 */
export interface ClientAppConfig {
  /** 功能开关（key → 是否开启；缺失开关默认视为开启） */
  switches: Record<string, boolean>;
  /** 业务规则（key → 数值） */
  rules: Record<string, number>;
  /** 站点标题 */
  siteTitle: string;
}
