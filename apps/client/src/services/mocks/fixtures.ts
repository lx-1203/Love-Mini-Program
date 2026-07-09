import type { components } from "../generated/api-types";
import type {
  ProfileStats,
  RecommendationFilter,
  RecommendedPerson,
  UpdateBasicProfileRequest,
} from "../generated/api-types-supplement";
import { homeRecommendedPeople } from "../../config/home-recommended-people";
import { createMockApiError } from "../api-error";

type Schemas = components["schemas"];
type LoginHeroConfig = Schemas["LoginHeroConfig"];
type UserSession = Schemas["UserSession"];
type BasicProfile = Schemas["BasicProfile"];
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
  extraRecommendQuota: number;
  hotTopicsUnlocked: boolean;
  newUsersUnlocked: boolean;
  hotTopicCount: number;
  newUserCount: number;
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

/**
 * 推荐人物 mock 内部数据类型。
 *
 * 在 RecommendedPerson（视图层）基础上扩展 relationshipStatus/hometownProvince/
 * hometownCity/futureCity 等过滤字段，用于 mock 模式下应用筛选条件。
 * 这些过滤字段不暴露到视图层，仅在 mock 数据内部使用。
 */
interface MockRecommendedPersonInternal extends RecommendedPerson {
  relationshipStatus?: string;
  hometownProvince?: string;
  hometownCity?: string;
  futureCity?: string;
}

/**
 * 推荐人物 mock 数据（含 Phase A/B 扩展字段）。
 *
 * 数据源镜像 discover store 中原 mockCards 的 7 条记录，但采用 RecommendedPerson
 * 视图结构（number id + 扩展字段）。用于 mockFixtures.getRecommendations
 * 在 mock 模式下返回带新字段的推荐结果。
 */
const recommendedPersonsMock: MockRecommendedPersonInternal[] = [
  {
    id: 4001,
    name: "夏言",
    initials: "夏",
    headline: "北京大学 · 大三 · 心理学",
    commonGround: "你们都选了电影话题",
    availability: "今晚 19:00-21:00",
    campusName: "北京大学",
    avatarUrl: "/static/assets/images/avatars/avatar-1.jpg",
    tags: ["咖啡", "电影", "夜跑", "心理学", "猫奴"],
    bio: "喜欢听人讲故事，也擅长保守秘密。想认识有趣的人，一起喝咖啡、看电影、夜跑。周末通常比较空闲，欢迎约我出去逛逛。",
    images: [
      "/static/assets/images/posts/campus-library.jpg",
      "/static/assets/images/activities/activity-1.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 165,
    educationLevel: "bachelor",
    photoGallery: [
      "/static/assets/images/posts/campus-library.jpg",
      "/static/assets/images/activities/activity-1.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-1.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "school",
    relationshipStatus: "never",
    hometownProvince: "北京",
    hometownCity: "北京",
    futureCity: "北京",
  },
  {
    id: 4002,
    name: "顾北",
    initials: "顾",
    headline: "清华大学 · 研一 · 建筑学",
    commonGround: "你们都选了美食话题",
    availability: "周末下午",
    campusName: "清华大学",
    avatarUrl: "/static/assets/images/avatars/avatar-2.jpg",
    tags: ["美食", "音乐", "探店", "建筑", "胶片"],
    bio: "画图狗一只，偶尔弹吉他。对城市里的老建筑特别感兴趣，想找个人一起探店、扫街。",
    images: [
      "/static/assets/images/activities/activity-2.jpg",
      "/static/assets/images/products/food-1.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 178,
    educationLevel: "master",
    photoGallery: [
      "/static/assets/images/activities/activity-2.jpg",
      "/static/assets/images/products/food-1.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-2.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "school",
    relationshipStatus: "never",
    hometownProvince: "江苏",
    hometownCity: "南京",
    futureCity: "北京",
  },
  {
    id: 4003,
    name: "林溪",
    initials: "林",
    headline: "复旦大学 · 大二 · 日语系",
    commonGround: "你们都选了摄影话题",
    availability: "周三、周五晚上",
    campusName: "复旦大学",
    avatarUrl: "/static/assets/images/avatars/avatar-3.jpg",
    tags: ["语言", "看展", "摄影", "日系", "手账"],
    bio: "最近在学日语，想找个语伴一起练习。平时也喜欢看展、拍照，记录生活中的小美好。",
    images: [
      "/static/assets/images/activities/activity-study.jpg",
      "/static/assets/images/products/merch-1.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 162,
    educationLevel: "bachelor",
    photoGallery: [
      "/static/assets/images/activities/activity-study.jpg",
      "/static/assets/images/products/merch-1.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-3.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "email",
    relationshipStatus: "never",
    hometownProvince: "上海",
    hometownCity: "上海",
    futureCity: "上海",
  },
  {
    id: 4004,
    name: "周屿",
    initials: "周",
    headline: "浙江大学 · 大四 · 计算机",
    commonGround: "你们都选了运动话题",
    availability: "每天傍晚",
    campusName: "浙江大学",
    avatarUrl: "/static/assets/images/avatars/avatar-4.jpg",
    tags: ["游戏", "篮球", "旅行", "编程", "火锅"],
    bio: "即将毕业，想在校园里留下一些美好回忆。喜欢打篮球、玩游戏，也热爱旅行，计划毕业前去一趟西藏。",
    images: [
      "/static/assets/images/activities/activity-sports.jpg",
      "/static/assets/images/products/food-2.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 180,
    educationLevel: "bachelor",
    photoGallery: [
      "/static/assets/images/activities/activity-sports.jpg",
      "/static/assets/images/products/food-2.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-4.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "school",
    relationshipStatus: "never",
    hometownProvince: "浙江",
    hometownCity: "杭州",
    futureCity: "杭州",
  },
  {
    id: 4005,
    name: "沈念",
    initials: "沈",
    headline: "中国人民大学 · 大一 · 新闻传播",
    commonGround: "你们都选了咖啡话题",
    availability: "下午没课的时候",
    campusName: "中国人民大学",
    avatarUrl: "/static/assets/images/avatars/avatar-5.jpg",
    tags: ["阅读", "写作", "咖啡", "新闻", "民谣"],
    bio: "刚来学校不久，想多认识一些朋友。喜欢阅读和写作，梦想是成为一名记者。平时会去咖啡馆写稿，欢迎来找我聊天。",
    images: [
      "/static/assets/images/activities/activity-1.jpg",
      "/static/assets/images/products/merch-2.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 168,
    educationLevel: "bachelor",
    photoGallery: [
      "/static/assets/images/activities/activity-1.jpg",
      "/static/assets/images/products/merch-2.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-5.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "none",
    relationshipStatus: "never",
    hometownProvince: "北京",
    hometownCity: "北京",
    futureCity: "北京",
  },
  {
    id: 4006,
    name: "苏晚",
    initials: "苏",
    headline: "南京大学 · 大三 · 法学",
    commonGround: "你们都选了阅读话题",
    availability: "周二、周四晚上",
    campusName: "南京大学",
    avatarUrl: "/static/assets/images/avatars/avatar-6.jpg",
    tags: ["辩论", "古典音乐", "阅读", "法学", "博物馆"],
    bio: "理性与感性并存。喜欢辩论，也热爱古典音乐。希望找到一个能聊得来的人，一起去看交响乐演出。",
    images: [
      "/static/assets/images/activities/activity-3.jpg",
      "/static/assets/images/products/ticket-1.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 170,
    educationLevel: "bachelor",
    photoGallery: [
      "/static/assets/images/activities/activity-3.jpg",
      "/static/assets/images/products/ticket-1.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-6.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "school",
    relationshipStatus: "divorced",
    hometownProvince: "江苏",
    hometownCity: "南京",
    futureCity: "南京",
  },
  {
    id: 4007,
    name: "陆辰",
    initials: "陆",
    headline: "武汉大学 · 研二 · 医学",
    commonGround: "你们都选了户外话题",
    availability: "周末全天",
    campusName: "武汉大学",
    avatarUrl: "/static/assets/images/avatars/avatar-7.jpg",
    tags: ["户外", "露营", "爬山", "医学", "纪录片"],
    bio: "医学生，平时比较忙，但周末一定会给自己放风。喜欢爬山和露营，觉得大自然最能治愈人心。",
    images: [
      "/static/assets/images/posts/campus-library.jpg",
      "/static/assets/images/products/ticket-2.jpg",
    ],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    height: 175,
    educationLevel: "master",
    photoGallery: [
      "/static/assets/images/posts/campus-library.jpg",
      "/static/assets/images/products/ticket-2.jpg",
    ],
    halfBodyPhotoUrl: "/static/assets/images/avatars/avatar-7.jpg",
    personalVideoUrl: "",
    profileBackgroundUrl: "",
    verificationBadgeLevel: "idcard",
    relationshipStatus: "never",
    hometownProvince: "湖北",
    hometownCity: "武汉",
    futureCity: "武汉",
  },
];

const mockLoggedInSession: UserSession = {
  userId: "user-1001",
  loggedIn: true,
  loginMethod: "wechat",
  displayName: "测试用户",
  phoneBound: false,
  profileCompleted: true,
  campusVerified: true,
  scheduleCompleted: true,
  campusName: "北京大学",
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

/**
 * 扩展基本资料 mock 状态（Phase A 新增字段）。
 *
 * 这些字段不在 Schemas["BasicProfile"] 中（OpenAPI spec 未更新），
 * 但后端 UserBasicProfile 实体已扩展，PUT /api/profile/basic 接受这些字段。
 * 通过单独的 mock 状态维护，避免污染原 BasicProfile 类型。
 */
let extendedBasicProfile: UpdateBasicProfileRequest = {
  height: 165,
  educationLevel: "bachelor",
  relationshipStatus: "never",
  hometownProvince: "广东",
  hometownCity: "广州",
  futureCity: "广州",
  futurePlanTags: ["事业", "旅行"],
};

/**
 * 照片墙 mock 状态（最多 6 张）。
 */
let photoGallery: string[] = [
  "/static/assets/images/avatars/avatar-1.jpg",
  "/static/assets/images/avatars/avatar-2.jpg",
];

/**
 * 个人视频 URL mock 状态。
 */
let personalVideoUrl: string | null = null;

/**
 * 半身照 URL mock 状态。
 */
let halfBodyPhotoUrl: string | null = null;

/**
 * 主页背景图 URL mock 状态。
 */
let profileBackgroundUrl: string | null = null;

let profileStats: ProfileStats = {
  followers: 16,
  following: 28,
  likes: 104,
  visitors: 50,
  posts: 12,
  followingCount: 28,
  followersCount: 16,
  likesCount: 104,
  visitorsCount: 50,
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
    session = clone(mockLoggedInSession);
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
    // 同时将 peer 发送的消息 deliveryStatus 更新为 "read"
    if (session.messages) {
      session.messages = session.messages.map((m: any) =>
        m.sender === "peer" && m.deliveryStatus === "delivered"
          ? { ...m, deliveryStatus: "read" }
          : m
      );
    }
    return clone(toChatSessionSummary(session));
  },
  recallTempChatMessage(sessionId: string, messageId: string): Schemas["TempChatSession"] {
    const session = ensureSession(sessionId);
    if (session.messages) {
      session.messages = session.messages.map((m: any) =>
        m.id === messageId
          ? { ...m, recalled: true, body: "[已撤回]" }
          : m
      );
    }
    return clone(session);
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
          recalled: false,
          deliveryStatus: "sent" as const,
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
      extraRecommendations: 5,
      extraRecommendQuota: 5,
      hotTopicsUnlocked: true,
      newUsersUnlocked: true,
      hotTopicCount: 3,
      newUserCount: 2,
    };
  },

  /** 破冰话题 Mock 数据 */
  getIcebreakers(peerUserId: number): {
    items: Array<{ id: number; content: string; category: string; source: string }>;
  } {
    const icebreakerPool: Record<number, Array<{ id: number; content: string; category: string; source: string }>> = {
      1: [
        { id: 101, content: "看到你也喜欢看电影，最近有什么好片推荐吗？", category: "兴趣爱好", source: "profile_interests" },
        { id: 102, content: "听说你也爱喝咖啡，学校附近哪家咖啡馆最值得去？", category: "校园生活", source: "profile_interests" },
        { id: 103, content: "你的专业听起来很有趣，平时课程压力大吗？", category: "学业交流", source: "profile_department" },
        { id: 104, content: "看到你的课表里有设计课，觉得很厉害！", category: "学业交流", source: "profile_schedule" },
        { id: 105, content: "周末有计划吗？要不要一起去图书馆？", category: "邀约", source: "common_ground" },
      ],
      2: [
        { id: 201, content: "你也选了美食话题，校园食堂哪个窗口最好吃？", category: "校园生活", source: "profile_interests" },
        { id: 202, content: "看到你喜欢摄影，平时用什么设备拍照呀？", category: "兴趣爱好", source: "profile_interests" },
        { id: 203, content: "你们都在同一个城市，周末有什么好去处推荐吗？", category: "邀约", source: "common_ground" },
        { id: 204, content: "你最喜欢什么类型的音乐？最近有在听什么歌吗？", category: "兴趣爱好", source: "profile_interests" },
        { id: 205, content: "如果用一个词形容你的大学生活，会是什么？", category: "校园生活", source: "general" },
      ],
      3: [
        { id: 301, content: "你也喜欢运动！平时跑步还是打球多？", category: "兴趣爱好", source: "profile_interests" },
        { id: 302, content: "你们学校的操场晚上开放吗？想约跑步", category: "邀约", source: "common_ground" },
        { id: 303, content: "日语系听起来好棒，学日语多久了？", category: "学业交流", source: "profile_department" },
        { id: 304, content: "周三傍晚有空吗？想找个自习搭子", category: "邀约", source: "profile_schedule" },
        { id: 305, content: "你日常喜欢追剧还是看电影多一点？", category: "兴趣爱好", source: "general" },
      ],
    };
    const defaultIcebreakers = [
      { id: 901, content: "嗨，很高兴认识你！最近过得怎么样？", category: "破冰", source: "general" },
      { id: 902, content: "看到你也在这个校园，好巧！平时喜欢去哪里逛？", category: "校园生活", source: "common_ground" },
      { id: 903, content: "你平时喜欢做什么？有什么特别的兴趣爱好吗？", category: "兴趣爱好", source: "general" },
      { id: 904, content: "如果用一个词形容你的大学生活，会是什么？", category: "校园生活", source: "general" },
      { id: 905, content: "最近有什么有意思的事情想分享吗？", category: "日常", source: "general" },
    ];
    const items = icebreakerPool[peerUserId] ?? defaultIcebreakers;
    return clone({ items });
  },

  /** 社交升温进度 Mock 数据 */
  getSocialProgress(): {
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
  } {
    return clone({
      currentTier: 'L2_ATTENTION',
      tierLabel: '表达喜欢',
      exposureCount: 15,
      likeCount: 4,
      matchCount: 0,
      chatCount: 0,
      circleCount: 0,
      activityCount: 0,
      nextAction: '继续浏览推荐，发现更多心动',
      progressPercentage: 33,
    });
  },

  /**
   * 更新基本资料（含 Phase A 扩展字段）。
   *
   * Mock 模式下合并 payload 到 extendedBasicProfile 状态，并同步 basicProfile
   * 中受影响字段（nickname/bio/grade/pronouns）以保持向后兼容。
   *
   * @param data - 更新请求体（所有字段可选）
   */
  updateBasicProfile(data: UpdateBasicProfileRequest): void {
    if (data.nickname !== undefined) basicProfile.nickname = data.nickname;
    if (data.bio !== undefined) basicProfile.bio = data.bio;
    if (data.grade !== undefined) basicProfile.grade = data.grade;
    if (data.pronouns !== undefined) basicProfile.pronouns = data.pronouns;
    extendedBasicProfile = { ...extendedBasicProfile, ...data };
    session = {
      ...session,
      displayName: extendedBasicProfile.nickname ?? basicProfile.nickname,
      profileCompleted: true,
    };
  },

  /**
   * 上传个人主页背景图。
   *
   * Mock 模式下不实际上传文件，仅生成 mock URL 并更新 profileBackgroundUrl 状态。
   */
  uploadProfileBackground(file: File): { url: string } {
    const url = `mock://profile/background/${encodeURIComponent(file.name)}`;
    profileBackgroundUrl = url;
    return { url };
  },

  /**
   * 上传照片墙指定索引（0-5）。
   *
   * Mock 模式下不实际上传文件，仅生成 mock URL 并追加到 photoGallery。
   * 超过 6 张时抛出错误（与后端一致）。
   *
   * @param file - 上传的文件
   * @param index - 照片墙索引（0-5）
   */
  uploadProfilePhoto(file: File, index: number): { url: string } {
    if (index < 0 || index > 5) {
      throw createMockApiError(400);
    }
    const url = `mock://profile/photo/${index}/${encodeURIComponent(file.name)}`;
    if (index >= photoGallery.length) {
      photoGallery = [...photoGallery, url];
    } else {
      photoGallery = [
        ...photoGallery.slice(0, index),
        url,
        ...photoGallery.slice(index + 1),
      ];
    }
    return { url };
  },

  /**
   * 删除照片墙指定索引。
   *
   * Mock 模式下从 photoGallery 数组中移除指定索引的元素。
   *
   * @param index - 照片墙索引（0-5）
   */
  deleteProfilePhoto(index: number): void {
    if (index < 0 || index >= photoGallery.length) {
      throw createMockApiError(404);
    }
    photoGallery = [
      ...photoGallery.slice(0, index),
      ...photoGallery.slice(index + 1),
    ];
  },

  /**
   * 上传个人视频。
   *
   * Mock 模式下不实际上传文件，仅生成 mock URL 并更新 personalVideoUrl 状态。
   */
  uploadProfileVideo(file: File): { url: string } {
    const url = `mock://profile/video/${encodeURIComponent(file.name)}`;
    personalVideoUrl = url;
    return { url };
  },

  /**
   * 上传半身照。
   *
   * Mock 模式下不实际上传文件，仅生成 mock URL 并更新 halfBodyPhotoUrl 状态。
   */
  uploadProfileHalfBody(file: File): { url: string } {
    const url = `mock://profile/half-body/${encodeURIComponent(file.name)}`;
    halfBodyPhotoUrl = url;
    return { url };
  },

  /**
   * 获取推荐列表（含 Phase B 扩展筛选字段）。
   *
   * Mock 模式下从 recommendedPersonsMock 中按筛选条件过滤，
   * 返回 RecommendedPerson[]。MockRecommendedPersonInternal 在 RecommendedPerson
   * 基础上扩展了过滤字段（relationshipStatus/hometownProvince/...），由于 TypeScript
   * 数组协变，可直接作为 RecommendedPerson[] 返回，调用方仅访问视图层字段。
   *
   * @param filter - 筛选条件（所有字段可选）
   */
  getRecommendations(filter: RecommendationFilter): RecommendedPerson[] {
    const filtered = recommendedPersonsMock.filter((person) => {
      // 身高范围筛选
      if (filter.heightMin !== undefined) {
        if (person.height === undefined || person.height < filter.heightMin) {
          return false;
        }
      }
      if (filter.heightMax !== undefined) {
        if (person.height === undefined || person.height > filter.heightMax) {
          return false;
        }
      }
      // 学历多选筛选
      if (filter.educationLevel && filter.educationLevel.length > 0) {
        if (
          !person.educationLevel ||
          !filter.educationLevel.includes(person.educationLevel)
        ) {
          return false;
        }
      }
      // 感情状态多选筛选
      if (filter.relationshipStatus && filter.relationshipStatus.length > 0) {
        if (
          !person.relationshipStatus ||
          !filter.relationshipStatus.includes(person.relationshipStatus)
        ) {
          return false;
        }
      }
      // 籍贯省份筛选
      if (filter.hometownProvince) {
        if (person.hometownProvince !== filter.hometownProvince) {
          return false;
        }
      }
      // 籍贯城市筛选
      if (filter.hometownCity) {
        if (person.hometownCity !== filter.hometownCity) {
          return false;
        }
      }
      // 未来城市筛选
      if (filter.futureCity) {
        if (person.futureCity !== filter.futureCity) {
          return false;
        }
      }
      // 关键词模糊匹配（nickname/bio/tags）
      if (filter.keyword && filter.keyword.trim().length > 0) {
        const kw = filter.keyword.trim().toLowerCase();
        const matchesName = person.name.toLowerCase().includes(kw);
        const matchesBio = person.bio.toLowerCase().includes(kw);
        const matchesTags = person.tags.some((t) =>
          t.toLowerCase().includes(kw)
        );
        if (!matchesName && !matchesBio && !matchesTags) {
          return false;
        }
      }
      return true;
    });

    return clone(filtered);
  },
};
