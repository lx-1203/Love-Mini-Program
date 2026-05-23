import type { components } from "../generated/api-types";
import { homeRecommendedPeople } from "../../config/home-recommended-people";
import { createMockApiError } from "../api-error";

type Schemas = components["schemas"];
type LoginHeroConfig = Schemas["LoginHeroConfig"];
type UserSession = Schemas["UserSession"];
type BasicProfile = Schemas["BasicProfile"];
type ProfileStats = Schemas["ProfileStats"];
type CampusProfile = Schemas["CampusProfile"];
type ScheduleProfile = Schemas["ScheduleProfile"];
type HomeDashboard = Schemas["HomeDashboard"];
type ChatOverview = Schemas["ChatOverview"];
type MatchFormConfig = Schemas["MatchFormConfig"];
type MatchResult = Schemas["MatchResult"];
type CreateTempChatSessionRequest = Schemas["CreateTempChatSessionRequest"];
type ChatSessionSummary = Schemas["ChatSessionSummary"];
type TempChatSession = Schemas["TempChatSession"];
type SubmissionRecord = Schemas["SubmissionRecord"];
type SubmissionRequest = Schemas["SubmissionRequest"];
type SubmissionType = Schemas["SubmissionType"];
type DiscussionRecommendation = Schemas["DiscussionRecommendation"];
type ActivityRecommendation = Schemas["ActivityRecommendation"];
type RecommendedPersonSummary = Schemas["RecommendedPersonSummary"];
type CheckInStatus = {
  checkedIn: boolean;
  consecutiveDays: number;
};
type CheckInResult = {
  checkInDate: string;
  consecutiveDays: number;
  extraRecommendations: number;
};

const recommendedPeople: RecommendedPersonSummary[] = homeRecommendedPeople.map((person) => ({
  id: person.id,
  name: person.name,
  initials: person.initials,
  headline: person.headline,
  commonGround: person.commonGround,
  availability: person.availability,
}));

const discussionRecommendations: DiscussionRecommendation[] = [
  {
    id: "d-1",
    title: "大家怎么平衡恋爱和考试周？",
    summary: "一条很实用的讨论串，边界清楚，安排也容易落地。",
    heatLabel: "412 人收藏",
  },
  {
    id: "d-2",
    title: "第一次校园咖啡散步，怎样才会更自然？",
    summary: "大家在分享路线、时间点和不生硬的开场方式。",
    heatLabel: "热度上升",
  },
];

const activityRecommendations: ActivityRecommendation[] = [
  {
    id: "a-1",
    title: "图书馆南门咖啡散步",
    location: "南门咖啡馆",
    scheduleText: "周四 19:00-20:00",
  },
  {
    id: "a-2",
    title: "电影社轻松线下碰面",
    location: "影像楼 B 厅",
    scheduleText: "周六 15:00-17:00",
  },
];

let session: UserSession = {
  userId: "user-1001",
  loggedIn: false,
  loginMethod: "wechat",
  displayName: "星野",
  phoneBound: false,
  profileCompleted: false,
  campusVerified: false,
  scheduleCompleted: false,
  campusName: null,
  featureFlags: {
    chat_ai_enabled: false,
  },
};

let loginHero: LoginHeroConfig = {
  heroMode: "video",
  heroVideoUrl: null,
  heroPosterUrl: null,
  heroAnimationTheme: "campus-night",
  heroTitle: "校园恋爱",
  heroSubtitle: "先从推荐的人、讨论圈、活动和临时聊天开始认识彼此。",
  videoFallbackToAnimation: true,
};

let basicProfile: BasicProfile = {
  nickname: "星野",
  bio: "安静、好奇，更喜欢一对一慢慢聊。",
  grade: "大三",
  pronouns: "她/她",
};

let profileStats: ProfileStats = {
  followingCount: 28,
  followersCount: 16,
  likesCount: 104,
};

let campusProfile: CampusProfile = {
  city: "广州",
  campusName: "南校区",
  department: "工业设计",
  verificationStatus: "draft",
};

let scheduleProfile: ScheduleProfile = {
  preferredCampusArea: "图书馆和北草坪",
  preferredTimeWindows: ["今晚", "本周"],
  courseBlocks: [
    {
      id: "b-1",
      weekday: "周一",
      start: "09:00",
      end: "10:30",
      label: "设计课",
    },
    {
      id: "b-2",
      weekday: "周三",
      start: "14:00",
      end: "15:30",
      label: "专题讨论",
    },
  ],
};

const matchFormConfig: MatchFormConfig = {
  sections: [
    {
      id: "intent",
      title: "匹配目标",
      fields: [
        {
          id: "matchIntent",
          kind: "single-select",
          label: "从什么开始",
          options: [
            { id: "topic", label: "话题匹配" },
            { id: "coffee", label: "咖啡散步" },
            { id: "study", label: "自习搭子" },
          ],
          min: null,
          max: null,
        },
      ],
    },
    {
      id: "filters",
      title: "筛选条件",
      fields: [
        {
          id: "topicIds",
          kind: "multi-select",
          label: "话题",
          options: [
            { id: "music", label: "音乐" },
            { id: "film", label: "电影" },
            { id: "sports", label: "运动" },
            { id: "food", label: "美食" },
          ],
          min: null,
          max: null,
        },
        {
          id: "timeWindow",
          kind: "single-select",
          label: "时间",
          options: [
            { id: "today-evening", label: "今晚" },
            { id: "tomorrow", label: "明天" },
            { id: "this-week", label: "本周" },
          ],
          min: null,
          max: null,
        },
        {
          id: "durationMinutes",
          kind: "stepper",
          label: "聊天时长",
          options: [],
          min: 15,
          max: 60,
        },
      ],
    },
  ],
};

let matchResult: MatchResult = {
  id: "match-1",
  queueStatus: "connected",
  topicLabel: "音乐",
  partnerHeadline: "大二，喜欢低压力的第一次见面。",
  countdownMinutes: 24,
  recommendedPrompt: "可以先问问，对方心里最轻松的一次校园初见应该是什么样。",
  tempChatSessionId: "session-1",
};
let nextMatchQueueStatus: MatchResult["queueStatus"] | null = null;

let tempChatSessions: TempChatSession[] = [];
let tempChatSessionMetaById: Record<
  string,
  {
    pinned: boolean;
    unreadCount: number;
    updatedAt: string;
  }
> = {};

let submissionSeed = 1000;
let submissions: SubmissionRecord[] = [
  {
    id: 1,
    type: "feedback",
    title: "视频主视觉需要稳定兜底",
    status: "processing",
    latestReplySummary: "兜底逻辑已经纳入客户端壳层处理。",
    submittedAt: "2026-05-18 09:18",
    convertedActivityId: null,
  },
  {
    id: 2,
    type: "suggestion",
    title: "首页保留讨论和活动入口",
    status: "reviewed",
    latestReplySummary: "已接受，纳入第一版 IA 调整。",
    submittedAt: "2026-05-17 18:42",
    convertedActivityId: null,
  },
];

/** 签到 mock 状态（默认为未签到） */
let checkInStatus: CheckInStatus = {
  checkedIn: false,
  consecutiveDays: 3,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function consumeNextMatchQueueStatus(): MatchResult["queueStatus"] {
  const status = nextMatchQueueStatus ?? "connected";
  nextMatchQueueStatus = null;
  return status;
}

function buildMatchResult(
  id: string,
  topicLabel: string,
  durationMinutes: number
): MatchResult {
  const queueStatus = consumeNextMatchQueueStatus();

  return {
    id,
    queueStatus,
    topicLabel,
    partnerHeadline: "大二，喜欢低压力的第一次见面。",
    countdownMinutes: queueStatus === "expired" ? 0 : durationMinutes,
    recommendedPrompt: "可以先问问，对方心里最轻松的一次校园初见应该是什么样。",
    tempChatSessionId: queueStatus === "connected" ? `session-${id}` : null,
  };
}

function buildHomeDashboard(): HomeDashboard {
  return {
    scheduleSummary: {
      id: "schedule-summary",
      title: `已保存 ${scheduleProfile.courseBlocks.length} 个课表块`,
      subtitle: "你大部分的空闲时间会从 18:30 之后开始。",
      meta: `偏好区域：${scheduleProfile.preferredCampusArea}`,
      actionLabel: "更新课表",
    },
    freeSlots: [
      {
        id: "free-1",
        title: "今晚 19:00-20:30",
        subtitle: "北草坪和咖啡馆都可以安排。",
        meta: "适合轻松散步或喝杯咖啡",
        actionLabel: "用于推荐",
      },
      {
        id: "free-2",
        title: "周五 16:00-18:00",
        subtitle: "时间足够，适合更完整的一次聊天。",
        meta: "也有安静的室内兜底地点",
        actionLabel: "保留空档",
      },
    ],
    aiPlan: {
      id: "ai-plan",
      title: "人工编辑兜底计划",
      subtitle: "当前 AI 关闭，所以首页展示静态推荐块。",
      meta: "当前开关 chat_ai_enabled = false",
      actionLabel: null,
    },
    recommendedPeople: clone(recommendedPeople),
    peopleLead: "把推荐位作为进入聊天的主入口。",
    activityPreview: {
      title: "活动入口",
      subtitle: "先看近期小活动，再决定是否去匹配或提交新的活动提案。",
      actionLabel: "查看活动",
      items: activityRecommendations.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.location,
        meta: item.scheduleText,
      })),
      pulseTitle: discussionRecommendations[0]?.title ?? null,
      pulseMeta: discussionRecommendations[0]?.heatLabel ?? null,
    },
  };
}

function toTopicLabel(topicId?: string) {
  if (topicId === "music") {
    return "音乐";
  }
  if (topicId === "film") {
    return "电影";
  }
  if (topicId === "sports") {
    return "运动";
  }
  if (topicId === "food") {
    return "美食";
  }
  return topicId || "话题";
}

function resolveRecommendedPerson(payload: CreateTempChatSessionRequest) {
  if (payload.recommendedPersonId) {
    return recommendedPeople.find((person) => person.id === payload.recommendedPersonId) ?? recommendedPeople[0];
  }

  if (!recommendedPeople.length) {
    throw new Error("No recommended people configured");
  }

  const index = Math.abs((payload.matchId || "fallback").length) % recommendedPeople.length;
  return recommendedPeople[index];
}

function createSessionView(
  person: RecommendedPersonSummary,
  sessionId: string
): TempChatSession {
  return {
    id: sessionId,
    recommendedPersonId: person.id,
    partnerName: person.name,
    partnerHeadline: person.headline,
    availabilityHint: person.availability,
    phase: "matching",
    closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    closedReason: null,
    messages: [],
    contactExchange: {
      proposer: null,
      status: "idle",
    },
  };
}

function getSessionMeta(sessionId: string) {
  if (!tempChatSessionMetaById[sessionId]) {
    tempChatSessionMetaById[sessionId] = {
      pinned: false,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  return tempChatSessionMetaById[sessionId]!;
}

function setSessionMeta(
  sessionId: string,
  updates: Partial<{
    pinned: boolean;
    unreadCount: number;
    updatedAt: string;
  }>
) {
  tempChatSessionMetaById[sessionId] = {
    ...getSessionMeta(sessionId),
    ...updates,
  };

  return tempChatSessionMetaById[sessionId]!;
}

function getSessionById(id: string) {
  return tempChatSessions.find((item) => item.id === id) ?? null;
}

function ensureSession(id: string): TempChatSession {
  const existing = getSessionById(id);

  if (existing) {
    return existing;
  }

  const fallback = createSessionView(recommendedPeople[0]!, id);
  saveSession(fallback);
  return fallback;
}

function saveSession(nextSession: TempChatSession) {
  setSessionMeta(nextSession.id, { updatedAt: new Date().toISOString() });
  tempChatSessions = [
    nextSession,
    ...tempChatSessions.filter((item) => item.id !== nextSession.id),
  ];
}

function previewMessage(sessionView: TempChatSession) {
  const lastMessage = sessionView.messages[sessionView.messages.length - 1];

  if (!lastMessage) {
    return {
      lastMessagePreview: "刚建立临时会话，等你开场。",
      lastMessageSentAt: null,
    };
  }

  return {
    lastMessagePreview:
      lastMessage.kind === "voice"
        ? "语音消息"
        : lastMessage.kind === "emoji"
          ? "表情消息"
          : lastMessage.body,
    lastMessageSentAt: lastMessage.sentAt,
  };
}

function toChatSessionSummary(sessionView: TempChatSession): ChatSessionSummary {
  const preview = previewMessage(sessionView);
  const meta = getSessionMeta(sessionView.id);

  return {
    id: sessionView.id,
    recommendedPersonId: sessionView.recommendedPersonId,
    partnerName: sessionView.partnerName,
    partnerHeadline: sessionView.partnerHeadline,
    availabilityHint: sessionView.availabilityHint,
    phase: sessionView.phase,
    closesAt: sessionView.closesAt,
    closedReason: sessionView.closedReason,
    lastMessagePreview: preview.lastMessagePreview,
    lastMessageSentAt: preview.lastMessageSentAt,
    contactExchangeStatus: sessionView.contactExchange.status,
    pinned: meta.pinned,
    unreadCount: meta.unreadCount,
  };
}

function buildChatOverview(): ChatOverview {
  return {
    sessions: [...tempChatSessions]
      .sort((left, right) => {
        const leftMeta = getSessionMeta(left.id);
        const rightMeta = getSessionMeta(right.id);

        if (leftMeta.pinned !== rightMeta.pinned) {
          return leftMeta.pinned ? -1 : 1;
        }

        return Date.parse(rightMeta.updatedAt) - Date.parse(leftMeta.updatedAt);
      })
      .map((item) => toChatSessionSummary(item)),
    emptyStateLead: "还没有临时会话时，继续从推荐的人进入。",
    recommendedPeople: clone(recommendedPeople),
  };
}

export const mockFixtures = {
  getLoginHero(): LoginHeroConfig {
    return clone(loginHero);
  },
  getSession(): UserSession {
    return clone(session);
  },
  loginWithWechat(): UserSession {
    session = {
      ...session,
      loggedIn: true,
    };
    return clone(session);
  },
  getBasicProfile(): BasicProfile {
    return clone(basicProfile);
  },
  getProfileStats(): ProfileStats {
    return clone(profileStats);
  },
  saveBasicProfile(payload: BasicProfile): BasicProfile {
    basicProfile = clone(payload);
    session = {
      ...session,
      displayName: payload.nickname,
      profileCompleted: true,
    };
    return clone(basicProfile);
  },
  getCampusProfile(): CampusProfile {
    return clone(campusProfile);
  },
  saveCampusProfile(payload: Schemas["CampusProfileRequest"]): CampusProfile {
    campusProfile = {
      ...payload,
      verificationStatus: "pending",
    };
    session = {
      ...session,
      campusVerified: true,
      campusName: payload.campusName,
    };
    return clone(campusProfile);
  },
  getScheduleProfile(): ScheduleProfile {
    return clone(scheduleProfile);
  },
  saveScheduleProfile(payload: ScheduleProfile): ScheduleProfile {
    scheduleProfile = clone(payload);
    session = {
      ...session,
      scheduleCompleted: true,
    };
    return clone(scheduleProfile);
  },
  getHomeDashboard(): HomeDashboard {
    return clone(buildHomeDashboard());
  },
  getChatOverview(): ChatOverview {
    return clone(buildChatOverview());
  },
  pinTempChatSession(id: string): ChatSessionSummary {
    const session = ensureSession(id);
    setSessionMeta(id, { pinned: true });
    return clone(toChatSessionSummary(session));
  },
  unpinTempChatSession(id: string): ChatSessionSummary {
    const session = ensureSession(id);
    setSessionMeta(id, { pinned: false });
    return clone(toChatSessionSummary(session));
  },
  markTempChatSessionRead(id: string): ChatSessionSummary {
    const session = ensureSession(id);
    setSessionMeta(id, { unreadCount: 0 });
    return clone(toChatSessionSummary(session));
  },
  getDiscussionRecommendations(): DiscussionRecommendation[] {
    return clone(discussionRecommendations);
  },
  getActivityRecommendations(): ActivityRecommendation[] {
    return clone(activityRecommendations);
  },
  getMatchFormConfig(): MatchFormConfig {
    return clone(matchFormConfig);
  },
  createMatch(payload: Schemas["MatchRequest"]): MatchResult {
    matchResult = buildMatchResult(
      `match-${Date.now()}`,
      toTopicLabel(payload.topicIds[0]),
      payload.durationMinutes
    );
    return clone(matchResult);
  },
  createQuickMatch(payload: Schemas["QuickMatchRequest"]): MatchResult {
    matchResult = buildMatchResult(`match-${Date.now()}`, "快速匹配", payload.durationMinutes);
    return clone(matchResult);
  },
  getMatchResult(id: string): MatchResult {
    if (matchResult.id === id) {
      return clone(matchResult);
    }

    return clone({
      ...matchResult,
      id,
      queueStatus: "connected",
      countdownMinutes: 20,
      tempChatSessionId: `session-${id}`,
    });
  },
  setNextMatchQueueStatus(status: MatchResult["queueStatus"]) {
    nextMatchQueueStatus = status;
  },
  createTempChatSession(payload: CreateTempChatSessionRequest): TempChatSession {
    const person = resolveRecommendedPerson(payload);
    const existing = tempChatSessions.find(
      (item) => item.recommendedPersonId === person.id && item.phase !== "closed"
    );

    if (existing) {
      return clone(existing);
    }

    const sessionId = payload.matchId ? `session-${payload.matchId}` : `session-${Date.now()}`;
    const nextSession = createSessionView(person, sessionId);
    saveSession(nextSession);
    return clone(nextSession);
  },
  getTempChatSession(id: string): TempChatSession {
    return clone(ensureSession(id));
  },
  sendTempChatMessage(id: string, payload: Schemas["ChatMessageRequest"]): TempChatSession {
    const current = ensureSession(id);

    if (current.phase === "closed") {
      return clone(current);
    }

    const nextSession: TempChatSession = {
      ...current,
      phase: "active",
      messages: [
        ...current.messages,
        {
          id: `m-${Date.now()}`,
          sender: payload.sender,
          kind: payload.kind,
          body: payload.body,
          sentAt: new Date().toISOString(),
          durationSeconds: payload.durationSeconds ?? null,
        },
      ],
    };
    const currentUnreadCount = getSessionMeta(id).unreadCount;
    setSessionMeta(id, {
      unreadCount: payload.sender === "peer" ? currentUnreadCount + 1 : currentUnreadCount,
    });
    saveSession(nextSession);
    return clone(nextSession);
  },
  respondToContactExchange(
    id: string,
    actor: "self" | "peer",
    decision: "accepted" | "rejected"
  ): TempChatSession {
    const current = ensureSession(id);

    if (current.phase === "closed") {
      return clone(current);
    }

    const currentStatus = current.contactExchange.status;
    const status =
      decision === "rejected"
        ? "rejected"
        : actor === "self"
          ? currentStatus === "accepted-by-peer"
            ? "completed"
            : "accepted-by-self"
          : currentStatus === "accepted-by-self"
            ? "completed"
            : "accepted-by-peer";

    const nextSession: TempChatSession = {
      ...current,
      contactExchange: {
        proposer: current.contactExchange.proposer ?? actor,
        status,
      },
    };
    saveSession(nextSession);
    return clone(nextSession);
  },
  endTempChatSession(id: string): TempChatSession {
    const current = ensureSession(id);
    const nextSession: TempChatSession = {
      ...current,
      phase: "closed",
      closesAt: new Date().toISOString(),
      closedReason: "ended",
    };
    saveSession(nextSession);
    return clone(nextSession);
  },
  simulateError(status: 400 | 404 | 500): never {
    throw createMockApiError(status);
  },
  listSubmissions(type?: SubmissionType): SubmissionRecord[] {
    const items = type ? submissions.filter((item) => item.type === type) : submissions;
    return clone(items);
  },
  createSubmission(type: SubmissionType, payload: SubmissionRequest): SubmissionRecord {
    const record: SubmissionRecord = {
      id: ++submissionSeed,
      type,
      title: payload.title,
      status: "submitted",
      latestReplySummary: "你的提交已进入处理队列。",
      submittedAt: "刚刚",
      convertedActivityId: null,
    };
    submissions = [record, ...submissions];
    return clone(record);
  },
  getCheckInStatus(): CheckInStatus {
    return clone(checkInStatus);
  },
  checkIn(): CheckInResult {
    checkInStatus = {
      checkedIn: true,
      consecutiveDays: checkInStatus.consecutiveDays + 1,
    };
    return {
      checkInDate: new Date().toISOString().split("T")[0],
      consecutiveDays: checkInStatus.consecutiveDays,
      extraRecommendations: 3,
    };
  },
};
