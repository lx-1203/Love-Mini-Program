import type { components } from "../generated/api-types";
import type {
  DoNotDisturbRequest,
  DoNotDisturbView,
  MakeUpCheckInResultView,
  ProfileStats,
  RecommendationFilter,
  RecommendedPerson,
  SubmissionDetailView,
  UpdateBasicProfileRequest,
} from "../generated/api-types-supplement";
// 导入 UniUploadFileLike 类型，统一 mock 上传方法签名，与 clientApi 对齐
import type { UniUploadFileLike } from "../api";
import { homeRecommendedPeople } from "../../config/home-recommended-people";
import { createMockApiError } from "../api-error";
// 统一图片资源路径常量，避免在 mock 数据中硬编码字符串
import { IMAGE_PATHS } from "@/config/images";
// i18n 翻译函数（SubTask 3.3.4：Mock 数据文案 i18n 化）
// 在非组件场景使用 i18n.global.t，与组件内 useI18n().t 行为一致。
import { t } from "@/i18n";

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

/**
 * 讨论推荐 mock 数据构建器（SubTask 3.3.4：i18n 化）。
 *
 * 使用 builder 函数在调用时解析 i18n key，确保 locale 切换后返回的 mock 数据
 * 能跟随当前语言。原模块级常量已替换为函数，调用方需通过 buildXxx() 获取数据。
 */
function buildDiscussionRecommendations(): DiscussionRecommendation[] {
  return [
    {
      id: "d-1",
      title: t("mockData.discussions.title1"),
      summary: t("mockData.discussions.summary1"),
      heatLabel: t("mockData.discussions.heatLabel1"),
    },
    {
      id: "d-2",
      title: t("mockData.discussions.title2"),
      summary: t("mockData.discussions.summary2"),
      heatLabel: t("mockData.discussions.heatLabel2"),
    },
  ];
}

/**
 * 活动推荐 mock 数据构建器（SubTask 3.3.4：i18n 化）。
 */
function buildActivityRecommendations(): ActivityRecommendation[] {
  return [
    {
      id: "a-1",
      title: t("mockData.activities.title1"),
      location: t("mockData.activities.location1"),
      scheduleText: t("mockData.activities.schedule1"),
    },
    {
      id: "a-2",
      title: t("mockData.activities.title2"),
      location: t("mockData.activities.location2"),
      scheduleText: t("mockData.activities.schedule2"),
    },
  ];
}

let session: UserSession = {
  userId: "user-1001",
  loggedIn: false,
  loginMethod: "wechat",
  displayName: t("mockData.session.defaultDisplayName"),
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
 * 推荐人物 mock 数据构建器（含 Phase A/B 扩展字段，SubTask 3.3.4：i18n 化）。
 *
 * 数据源镜像 discover store 中原 mockCards 的 7 条记录，但采用 RecommendedPerson
 * 视图结构（number id + 扩展字段）。用于 mockFixtures.getRecommendations
 * 在 mock 模式下返回带新字段的推荐结果。
 *
 * 使用 builder 函数在调用时解析 i18n key，确保 locale 切换后返回的 mock 数据
 * 能跟随当前语言。
 */
function buildRecommendedPersonsMock(): MockRecommendedPersonInternal[] {
  return [
    {
      id: 4001,
      name: t("mockData.recommendedPeople.name1"),
      initials: "夏",
      headline: t("mockData.recommendedPeople.headline1"),
      commonGround: t("mockData.recommendedPeople.commonGround1"),
      availability: t("mockData.recommendedPeople.availability1"),
      campusName: t("mockData.recommendedPeople.campusName1"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_1,
      tags: ["咖啡", "电影", "夜跑", "心理学", "猫奴"],
      bio: t("mockData.recommendedPeople.bio1"),
      images: [
        IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 165,
      educationLevel: "bachelor",
      photoGallery: [
        IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_1,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "school",
      relationshipStatus: "never",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince1"),
      hometownCity: t("mockData.recommendedPeople.hometownCity1"),
      futureCity: t("mockData.recommendedPeople.futureCity1"),
    },
    {
      id: 4002,
      name: t("mockData.recommendedPeople.name2"),
      initials: "顾",
      headline: t("mockData.recommendedPeople.headline2"),
      commonGround: t("mockData.recommendedPeople.commonGround2"),
      availability: t("mockData.recommendedPeople.availability2"),
      campusName: t("mockData.recommendedPeople.campusName2"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_2,
      tags: ["美食", "音乐", "探店", "建筑", "胶片"],
      bio: t("mockData.recommendedPeople.bio2"),
      images: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
        IMAGE_PATHS.PRODUCTS.FOOD_1,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 178,
      educationLevel: "master",
      photoGallery: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
        IMAGE_PATHS.PRODUCTS.FOOD_1,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_2,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "school",
      relationshipStatus: "never",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince2"),
      hometownCity: t("mockData.recommendedPeople.hometownCity2"),
      futureCity: t("mockData.recommendedPeople.futureCity2"),
    },
    {
      id: 4003,
      name: t("mockData.recommendedPeople.name3"),
      initials: "林",
      headline: t("mockData.recommendedPeople.headline3"),
      commonGround: t("mockData.recommendedPeople.commonGround3"),
      availability: t("mockData.recommendedPeople.availability3"),
      campusName: t("mockData.recommendedPeople.campusName3"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_3,
      tags: ["语言", "看展", "摄影", "日系", "手账"],
      bio: t("mockData.recommendedPeople.bio3"),
      images: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_STUDY,
        IMAGE_PATHS.PRODUCTS.MERCH_1,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 162,
      educationLevel: "bachelor",
      photoGallery: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_STUDY,
        IMAGE_PATHS.PRODUCTS.MERCH_1,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_3,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "email",
      relationshipStatus: "never",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince3"),
      hometownCity: t("mockData.recommendedPeople.hometownCity3"),
      futureCity: t("mockData.recommendedPeople.futureCity3"),
    },
    {
      id: 4004,
      name: t("mockData.recommendedPeople.name4"),
      initials: "周",
      headline: t("mockData.recommendedPeople.headline4"),
      commonGround: t("mockData.recommendedPeople.commonGround4"),
      availability: t("mockData.recommendedPeople.availability4"),
      campusName: t("mockData.recommendedPeople.campusName4"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_4,
      tags: ["游戏", "篮球", "旅行", "编程", "火锅"],
      bio: t("mockData.recommendedPeople.bio4"),
      images: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_SPORTS,
        IMAGE_PATHS.PRODUCTS.FOOD_2,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 180,
      educationLevel: "bachelor",
      photoGallery: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_SPORTS,
        IMAGE_PATHS.PRODUCTS.FOOD_2,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_4,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "school",
      relationshipStatus: "never",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince4"),
      hometownCity: t("mockData.recommendedPeople.hometownCity4"),
      futureCity: t("mockData.recommendedPeople.futureCity4"),
    },
    {
      id: 4005,
      name: t("mockData.recommendedPeople.name5"),
      initials: "沈",
      headline: t("mockData.recommendedPeople.headline5"),
      commonGround: t("mockData.recommendedPeople.commonGround5"),
      availability: t("mockData.recommendedPeople.availability5"),
      campusName: t("mockData.recommendedPeople.campusName5"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_5,
      tags: ["阅读", "写作", "咖啡", "新闻", "民谣"],
      bio: t("mockData.recommendedPeople.bio5"),
      images: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
        IMAGE_PATHS.PRODUCTS.MERCH_2,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 168,
      educationLevel: "bachelor",
      photoGallery: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
        IMAGE_PATHS.PRODUCTS.MERCH_2,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_5,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "none",
      relationshipStatus: "never",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince5"),
      hometownCity: t("mockData.recommendedPeople.hometownCity5"),
      futureCity: t("mockData.recommendedPeople.futureCity5"),
    },
    {
      id: 4006,
      name: t("mockData.recommendedPeople.name6"),
      initials: "苏",
      headline: t("mockData.recommendedPeople.headline6"),
      commonGround: t("mockData.recommendedPeople.commonGround6"),
      availability: t("mockData.recommendedPeople.availability6"),
      campusName: t("mockData.recommendedPeople.campusName6"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_6,
      tags: ["辩论", "古典音乐", "阅读", "法学", "博物馆"],
      bio: t("mockData.recommendedPeople.bio6"),
      images: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_3,
        IMAGE_PATHS.PRODUCTS.TICKET_1,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 170,
      educationLevel: "bachelor",
      photoGallery: [
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_3,
        IMAGE_PATHS.PRODUCTS.TICKET_1,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_6,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "school",
      relationshipStatus: "divorced",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince6"),
      hometownCity: t("mockData.recommendedPeople.hometownCity6"),
      futureCity: t("mockData.recommendedPeople.futureCity6"),
    },
    {
      id: 4007,
      name: t("mockData.recommendedPeople.name7"),
      initials: "陆",
      headline: t("mockData.recommendedPeople.headline7"),
      commonGround: t("mockData.recommendedPeople.commonGround7"),
      availability: t("mockData.recommendedPeople.availability7"),
      campusName: t("mockData.recommendedPeople.campusName7"),
      avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_7,
      tags: ["户外", "露营", "爬山", "医学", "纪录片"],
      bio: t("mockData.recommendedPeople.bio7"),
      images: [
        IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
        IMAGE_PATHS.PRODUCTS.TICKET_2,
      ],
      isSameSchool: false,
      isSameMajor: false,
      commonCircleCount: 0,
      height: 175,
      educationLevel: "master",
      photoGallery: [
        IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
        IMAGE_PATHS.PRODUCTS.TICKET_2,
      ],
      halfBodyPhotoUrl: IMAGE_PATHS.AVATARS.AVATAR_7,
      personalVideoUrl: "",
      profileBackgroundUrl: "",
      verificationBadgeLevel: "idcard",
      relationshipStatus: "never",
      hometownProvince: t("mockData.recommendedPeople.hometownProvince7"),
      hometownCity: t("mockData.recommendedPeople.hometownCity7"),
      futureCity: t("mockData.recommendedPeople.futureCity7"),
    },
  ];
}

const mockLoggedInSession: UserSession = {
  userId: "user-1001",
  loggedIn: true,
  loginMethod: "wechat",
  displayName: t("mockData.session.testDisplayName"),
  phoneBound: false,
  profileCompleted: true,
  campusVerified: true,
  scheduleCompleted: true,
  campusName: t("mockData.session.defaultCampus"),
  featureFlags: {
    chat_ai_enabled: false,
  },
};

// 修复 prefer-const：loginHero 未被重新赋值，改为 const
const loginHero: LoginHeroConfig = {
  heroMode: "video",
  heroVideoUrl: null,
  heroPosterUrl: null,
  heroAnimationTheme: "campus-night",
  heroTitle: t("mockData.session.heroTitle"),
  heroSubtitle: t("mockData.session.heroSubtitle"),
  videoFallbackToAnimation: true,
};

let basicProfile: BasicProfile = {
  nickname: t("mockData.session.basicProfileNickname"),
  bio: t("mockData.session.basicProfileBio"),
  grade: t("mockData.session.basicProfileGrade"),
  pronouns: t("mockData.session.basicProfilePronouns"),
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
  hometownProvince: t("mockData.session.extendedHometownProvince"),
  hometownCity: t("mockData.session.extendedHometownCity"),
  futureCity: t("mockData.session.extendedFutureCity"),
  futurePlanTags: [
    t("mockData.session.futurePlanTag1"),
    t("mockData.session.futurePlanTag2"),
  ],
};

/**
 * 照片墙 mock 状态（最多 6 张）。
 */
let photoGallery: string[] = [
  IMAGE_PATHS.AVATARS.AVATAR_1,
  IMAGE_PATHS.AVATARS.AVATAR_2,
];

// 修复（严格模式 noUnusedLocals）：personalVideoUrl / halfBodyPhotoUrl / profileBackgroundUrl
// 三个模块级变量仅被赋值从未被读取（mock 上传函数直接返回 URL，无需持久化状态），已移除。
// 下方 uploadProfileBackground / uploadProfileVideo / uploadProfileHalfBody 函数内对应的赋值语句也已同步移除。

/**
 * 通知免打扰设置 mock 状态（功能6）。
 *
 * 默认关闭，开始/结束时间 22:00-08:00，每天重复，允许紧急消息穿透。
 */
let dndSetting: DoNotDisturbView = {
  enabled: false,
  startTime: "22:00",
  endTime: "08:00",
  repeatMode: "EVERYDAY",
  customWeekdays: null,
  allowUrgent: true,
};

/**
 * 签到补签 mock 状态（功能7）。
 *
 * 维护本月已用补签次数，用于补签结果计算。
 * 每月补签上限 3 次，首次免费，后续每次消耗 50 积分。
 */
let makeUpUsedCount = 0;
const MAKE_UP_LIMIT = 3;
const MAKE_UP_COST_POINTS = 50;

/**
 * 反馈详情 mock 数据（功能10）。
 *
 * 由 createSubmission 时同步生成详情，存入 submissionDetails Map 中。
 * 详情包含完整 content/attachments/latestReplyContent，列表页不返回这些字段。
 */
const submissionDetails = new Map<number, SubmissionDetailView>();

// 修复 prefer-const：profileStats 未被重新赋值，改为 const
const profileStats: ProfileStats = {
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
  city: t("mockData.session.campusCity"),
  campusName: t("mockData.session.campusName"),
  department: t("mockData.session.campusDept"),
  verificationStatus: "draft",
};

let scheduleProfile: ScheduleProfile = {
  preferredCampusArea: t("mockData.session.scheduleArea"),
  preferredTimeWindows: [
    t("mockData.session.scheduleTimeWindow1"),
    t("mockData.session.scheduleTimeWindow2"),
  ],
  courseBlocks: [
    {
      id: "b-1",
      weekday: t("mockData.session.weekdayMon"),
      start: "09:00",
      end: "10:30",
      label: t("mockData.session.courseBlock1Label"),
    },
    {
      id: "b-2",
      weekday: t("mockData.session.weekdayWed"),
      start: "14:00",
      end: "15:30",
      label: t("mockData.session.courseBlock2Label"),
    },
  ],
};

const matchFormConfig: MatchFormConfig = {
  sections: [
    {
      id: "intent",
      title: t("mockData.common.matchTopicLabel"),
      fields: [
        {
          id: "matchIntent",
          kind: "single-select",
          label: t("mockData.common.matchTopicLabel"),
          options: [
            { id: "topic", label: t("mockData.topics.default") },
            { id: "coffee", label: t("mockData.topics.coffee") },
            { id: "study", label: t("mockData.topics.study") },
          ],
          min: null,
          max: null,
        },
      ],
    },
    {
      id: "filters",
      title: t("mockData.common.filterTitle"),
      fields: [
        {
          id: "topicIds",
          kind: "multi-select",
          label: t("mockData.common.filterTopicLabel"),
          options: [
            { id: "music", label: t("mockData.topics.music") },
            { id: "film", label: t("mockData.topics.film") },
            { id: "sports", label: t("mockData.topics.sports") },
            { id: "food", label: t("mockData.topics.food") },
          ],
          min: null,
          max: null,
        },
        {
          id: "timeWindow",
          kind: "single-select",
          label: t("mockData.common.filterTimeLabel"),
          options: [
            { id: "today-evening", label: t("mockData.common.timeTodayEvening") },
            { id: "tomorrow", label: t("mockData.common.timeTomorrow") },
            { id: "this-week", label: t("mockData.common.timeThisWeek") },
          ],
          min: null,
          max: null,
        },
        {
          id: "durationMinutes",
          kind: "stepper",
          label: t("mockData.common.filterDurationLabel"),
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
  topicLabel: t("mockData.common.matchResultTopicLabel"),
  partnerHeadline: t("mockData.tempChat.partnerHeadline"),
  countdownMinutes: 24,
  recommendedPrompt: t("mockData.tempChat.recommendedPrompt"),
  tempChatSessionId: "session-1",
};
let nextMatchQueueStatus: MatchResult["queueStatus"] | null = null;

let tempChatSessions: TempChatSession[] = [];
// 修复 prefer-const：tempChatSessionMetaById 未被重新赋值（仅修改属性），改为 const
const tempChatSessionMetaById: Record<
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
    type: "FEEDBACK",
    title: t("mockData.submissions.title1"),
    status: "processing",
    latestReplySummary: t("mockData.submissions.reply1"),
    submittedAt: "2026-05-18 09:18",
    convertedActivityId: null,
  },
  {
    id: 2,
    type: "SUGGESTION",
    title: t("mockData.submissions.title2"),
    status: "reviewed",
    latestReplySummary: t("mockData.submissions.reply2"),
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
    partnerHeadline: t("mockData.tempChat.partnerHeadline"),
    countdownMinutes: queueStatus === "expired" ? 0 : durationMinutes,
    recommendedPrompt: t("mockData.tempChat.recommendedPrompt"),
    tempChatSessionId: queueStatus === "connected" ? `session-${id}` : null,
  };
}

function buildHomeDashboard(): HomeDashboard {
  return {
    scheduleSummary: {
      id: "schedule-summary",
      title: t("mockData.common.scheduleSummaryTitle", { n: scheduleProfile.courseBlocks.length }),
      subtitle: t("mockData.common.scheduleSummarySubtitle"),
      meta: t("mockData.common.scheduleSummaryMeta", { area: scheduleProfile.preferredCampusArea }),
      actionLabel: t("mockData.common.scheduleSummaryAction"),
    },
    freeSlots: [
      {
        id: "free-1",
        title: t("mockData.common.freeSlot1Title"),
        subtitle: t("mockData.common.freeSlot1Subtitle"),
        meta: t("mockData.common.freeSlot1Meta"),
        actionLabel: t("mockData.common.freeSlot1Action"),
      },
      {
        id: "free-2",
        title: t("mockData.common.freeSlot2Title"),
        subtitle: t("mockData.common.freeSlot2Subtitle"),
        meta: t("mockData.common.freeSlot2Meta"),
        actionLabel: t("mockData.common.freeSlot2Action"),
      },
    ],
    aiPlan: {
      id: "ai-plan",
      title: t("mockData.common.aiPlanTitle"),
      subtitle: t("mockData.common.aiPlanSubtitle"),
      meta: t("mockData.common.aiPlanMeta"),
      actionLabel: null,
    },
    recommendedPeople: clone(recommendedPeople),
    peopleLead: t("mockData.common.peopleLead"),
    activityPreview: {
      title: t("mockData.common.activityPreviewTitle"),
      subtitle: t("mockData.common.activityPreviewSubtitle"),
      actionLabel: t("mockData.common.activityPreviewAction"),
      items: buildActivityRecommendations().map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.location,
        meta: item.scheduleText,
      })),
      pulseTitle: buildDiscussionRecommendations()[0]?.title ?? null,
      pulseMeta: buildDiscussionRecommendations()[0]?.heatLabel ?? null,
    },
  };
}

function toTopicLabel(topicId?: string) {
  if (topicId === "music") {
    return t("mockData.topics.music");
  }
  if (topicId === "film") {
    return t("mockData.topics.film");
  }
  if (topicId === "sports") {
    return t("mockData.topics.sports");
  }
  if (topicId === "food") {
    return t("mockData.topics.food");
  }
  return topicId || t("mockData.topics.default");
}

function resolveRecommendedPerson(payload: CreateTempChatSessionRequest): RecommendedPersonSummary {
  if (payload.recommendedPersonId) {
    // 修复（严格模式 noUncheckedIndexedAccess）：recommendedPeople[0] 索引访问返回 T | undefined，
    // 此处兜底抛错，使调用方在异常（数组为空）场景获得明确错误而非 undefined。
    const matched = recommendedPeople.find((person) => person.id === payload.recommendedPersonId);
    if (matched) return matched;
    const fallback = recommendedPeople[0];
    if (!fallback) {
      throw new Error("No recommended people configured");
    }
    return fallback;
  }

  if (!recommendedPeople.length) {
    throw new Error("No recommended people configured");
  }

  const index = Math.abs((payload.matchId || "fallback").length) % recommendedPeople.length;
  // 修复（严格模式 noUncheckedIndexedAccess）：recommendedPeople[index] 索引访问返回 T | undefined，
  // 由于前面已校验 length > 0，且 index 由 % length 计算，理论非空，此处兜底抛错以满足类型。
  const person = recommendedPeople[index];
  if (!person) {
    throw new Error("No recommended people configured");
  }
  return person;
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
      lastMessagePreview: t("mockData.tempChat.lastMessagePreview"),
      lastMessageSentAt: null,
    };
  }

  return {
    lastMessagePreview:
      lastMessage.kind === "voice"
        ? t("mockData.tempChat.voiceMessage")
        : lastMessage.kind === "emoji"
          ? t("mockData.tempChat.emojiMessage")
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
    emptyStateLead: t("mockData.tempChat.emptyState"),
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
  saveScheduleProfile(payload: Schemas["ScheduleProfileRequest"]): ScheduleProfile {
    // ScheduleProfileRequest 中 preferredTimeWindows/courseBlocks 为可选字段，
    // 而 ScheduleProfile（响应）中为必填。Mock 模式下用空数组兜底，保持响应契约。
    scheduleProfile = {
      preferredCampusArea: payload.preferredCampusArea,
      preferredTimeWindows: payload.preferredTimeWindows ?? [],
      courseBlocks: payload.courseBlocks ?? [],
    };
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
      session.messages = session.messages.map((m: Schemas["ChatMessage"]) =>
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
      session.messages = session.messages.map((m: Schemas["ChatMessage"]) =>
        m.id === messageId
          ? { ...m, recalled: true, body: t("mockData.tempChat.recalledMessage") }
          : m
      );
    }
    return clone(session);
  },
  getDiscussionRecommendations(): DiscussionRecommendation[] {
    return clone(buildDiscussionRecommendations());
  },
  getActivityRecommendations(): ActivityRecommendation[] {
    return clone(buildActivityRecommendations());
  },
  getMatchFormConfig(): MatchFormConfig {
    return clone(matchFormConfig);
  },
  createMatch(payload: Schemas["MatchRequest"]): MatchResult {
    matchResult = buildMatchResult(
      `match-${Date.now()}`,
      toTopicLabel(payload.topicIds?.[0]),
      payload.durationMinutes
    );
    return clone(matchResult);
  },
  createQuickMatch(payload: Schemas["QuickMatchRequest"]): MatchResult {
    matchResult = buildMatchResult(`match-${Date.now()}`, t("mockData.tempChat.quickMatchTopic"), payload.durationMinutes);
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
    decision: "accept" | "reject" | "revoke"
  ): TempChatSession {
    const current = ensureSession(id);

    if (current.phase === "closed") {
      return clone(current);
    }

    const currentStatus = current.contactExchange.status;
    const status =
      decision === "reject"
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
      latestReplySummary: t("mockData.submissions.queueReply"),
      submittedAt: t("mockData.submissions.submittedAt"),
      convertedActivityId: null,
    };
    submissions = [record, ...submissions];
    // 同步生成详情并存入 Map，供功能10 getSubmissionDetail 查询
    const detail: SubmissionDetailView = {
      id: record.id,
      type,
      title: payload.title,
      content: payload.content,
      attachments: Array.isArray(payload.attachments) ? [...payload.attachments] : [],
      status: "submitted",
      latestReplySummary: record.latestReplySummary,
      latestReplyContent: null,
      submittedAt: record.submittedAt,
      convertedActivityId: null,
    };
    submissionDetails.set(record.id, detail);
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
      // 修复（严格模式 noUncheckedIndexedAccess）：split("T")[0] 索引访问返回 string | undefined，
      // 此处兜底取整串，确保 checkInDate 始终为 string（split 结果至少包含一个元素，正常不会越界）。
      checkInDate: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
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
    // SubTask 3.3.4：破冰话题文案与分类标签均通过 i18n key 解析，
    // 确保 locale 切换后返回的 mock 数据能跟随当前语言。
    const catHobby = t("mockData.icebreakers.categoryHobby");
    const catCampus = t("mockData.icebreakers.categoryCampus");
    const catAcademic = t("mockData.icebreakers.categoryAcademic");
    const catInvite = t("mockData.icebreakers.categoryInvite");
    const catIcebreak = t("mockData.icebreakers.categoryIcebreak");
    const catDaily = t("mockData.icebreakers.categoryDaily");

    const icebreakerPool: Record<number, Array<{ id: number; content: string; category: string; source: string }>> = {
      1: [
        { id: 101, content: t("mockData.icebreakers.user1_1"), category: catHobby, source: "profile_interests" },
        { id: 102, content: t("mockData.icebreakers.user1_2"), category: catCampus, source: "profile_interests" },
        { id: 103, content: t("mockData.icebreakers.user1_3"), category: catAcademic, source: "profile_department" },
        { id: 104, content: t("mockData.icebreakers.user1_4"), category: catAcademic, source: "profile_schedule" },
        { id: 105, content: t("mockData.icebreakers.user1_5"), category: catInvite, source: "common_ground" },
      ],
      2: [
        { id: 201, content: t("mockData.icebreakers.user2_1"), category: catCampus, source: "profile_interests" },
        { id: 202, content: t("mockData.icebreakers.user2_2"), category: catHobby, source: "profile_interests" },
        { id: 203, content: t("mockData.icebreakers.user2_3"), category: catInvite, source: "common_ground" },
        { id: 204, content: t("mockData.icebreakers.user2_4"), category: catHobby, source: "profile_interests" },
        { id: 205, content: t("mockData.icebreakers.user2_5"), category: catCampus, source: "general" },
      ],
      3: [
        { id: 301, content: t("mockData.icebreakers.user3_1"), category: catHobby, source: "profile_interests" },
        { id: 302, content: t("mockData.icebreakers.user3_2"), category: catInvite, source: "common_ground" },
        { id: 303, content: t("mockData.icebreakers.user3_3"), category: catAcademic, source: "profile_department" },
        { id: 304, content: t("mockData.icebreakers.user3_4"), category: catInvite, source: "profile_schedule" },
        { id: 305, content: t("mockData.icebreakers.user3_5"), category: catHobby, source: "general" },
      ],
    };
    const defaultIcebreakers = [
      { id: 901, content: t("mockData.icebreakers.default1"), category: catIcebreak, source: "general" },
      { id: 902, content: t("mockData.icebreakers.default2"), category: catCampus, source: "common_ground" },
      { id: 903, content: t("mockData.icebreakers.default3"), category: catHobby, source: "general" },
      { id: 904, content: t("mockData.icebreakers.default4"), category: catCampus, source: "general" },
      { id: 905, content: t("mockData.icebreakers.default5"), category: catDaily, source: "general" },
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
      tierLabel: t('mockData.socialProgress.tierLabel'),
      exposureCount: 15,
      likeCount: 4,
      matchCount: 0,
      chatCount: 0,
      circleCount: 0,
      activityCount: 0,
      nextAction: t('mockData.socialProgress.nextAction'),
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
  uploadProfileBackground(file: UniUploadFileLike): { url: string } {
    const url = `mock://profile/background/${encodeURIComponent(file.name)}`;
    // 修复（严格模式 noUnusedLocals）：原 profileBackgroundUrl = url 赋值已移除（变量已删除）。
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
  uploadProfilePhoto(file: UniUploadFileLike, index: number): { url: string } {
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
  uploadProfileVideo(file: UniUploadFileLike): { url: string } {
    const url = `mock://profile/video/${encodeURIComponent(file.name)}`;
    // 修复（严格模式 noUnusedLocals）：原 personalVideoUrl = url 赋值已移除（变量已删除）。
    return { url };
  },

  /**
   * 上传半身照。
   *
   * Mock 模式下不实际上传文件，仅生成 mock URL 并更新 halfBodyPhotoUrl 状态。
   */
  uploadProfileHalfBody(file: UniUploadFileLike): { url: string } {
    const url = `mock://profile/half-body/${encodeURIComponent(file.name)}`;
    // 修复（严格模式 noUnusedLocals）：原 halfBodyPhotoUrl = url 赋值已移除（变量已删除）。
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
    const filtered = buildRecommendedPersonsMock().filter((person) => {
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

  /**
   * 获取通知免打扰设置（功能6）。
   */
  getDndSetting(): DoNotDisturbView {
    return clone(dndSetting);
  },

  /**
   * 更新通知免打扰设置（功能6）。
   *
   * Mock 模式下直接合并 payload 到 dndSetting 状态，并返回最新视图。
   */
  updateDndSetting(payload: DoNotDisturbRequest): DoNotDisturbView {
    dndSetting = {
      enabled: payload.enabled,
      startTime: payload.startTime,
      endTime: payload.endTime,
      repeatMode: payload.repeatMode,
      customWeekdays: payload.customWeekdays ?? null,
      allowUrgent: payload.allowUrgent,
    };
    return clone(dndSetting);
  },

  /**
   * 签到补签（功能7）。
   *
   * Mock 模式下：
   * - 校验日期范围（昨日及之前 7 天内）
   * - 检查本月补签次数上限
   * - 返回补签成功结果，连续天数 +1（基于现有 checkInStatus.consecutiveDays）
   *
   * @param date - 补签日期（yyyy-MM-dd）
   * @returns 补签结果视图
   * @throws createMockApiError 400 当日期无效或超出补签次数上限
   */
  makeUpCheckIn(date: string): MakeUpCheckInResultView {
    if (!date) {
      throw createMockApiError(400);
    }
    // 校验日期范围：昨日及之前 7 天内
    const target = new Date(date);
    if (isNaN(target.getTime())) {
      throw createMockApiError(400);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (target > yesterday || target < sevenDaysAgo) {
      throw createMockApiError(400);
    }
    // 检查本月补签次数上限
    if (makeUpUsedCount >= MAKE_UP_LIMIT) {
      throw createMockApiError(400);
    }
    makeUpUsedCount++;
    // 模拟连续签到天数 +1
    checkInStatus = {
      checkedIn: checkInStatus.checkedIn,
      consecutiveDays: checkInStatus.consecutiveDays + 1,
    };
    return {
      success: true,
      checkInDate: date,
      consecutiveDays: checkInStatus.consecutiveDays,
      usedMakeUpCount: makeUpUsedCount,
      makeUpLimit: MAKE_UP_LIMIT,
      costPoints: makeUpUsedCount === 1 ? 0 : MAKE_UP_COST_POINTS,
    };
  },

  /**
   * 上传反馈图片（功能9）。
   *
   * Mock 模式下不实际上传，仅返回 mock URL。
   * 限制：jpg/png/webp，单张 ≤5MB（前端已校验，此处不重复校验）。
   */
  uploadFeedbackImage(file: UniUploadFileLike): { url: string } {
    const url = `mock://feedback/image/${encodeURIComponent(file.name)}`;
    return { url };
  },

  /**
   * 获取反馈提交详情（功能10）。
   *
   * Mock 模式下从 submissionDetails Map 中查找，未找到则抛 404。
   */
  getSubmissionDetail(id: number): SubmissionDetailView {
    const detail = submissionDetails.get(id);
    if (!detail) {
      throw createMockApiError(404);
    }
    return clone(detail);
  },
};
