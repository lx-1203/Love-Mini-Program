import type { components } from "../services/generated/api-types";
import type { VipStatus, MyPostSummary } from "../stores/profile";

type Schemas = components["schemas"];

/**
 * 资料完善度步骤项（用于 LockScreen / 完善度进度展示）
 */
export function toProfileCompletion(session: Schemas["UserSession"]) {
  return [
    {
      id: "profile",
      title: "基础资料",
      done: session.profileCompleted,
    },
    {
      id: "campus",
      title: "学校信息",
      done: session.campusVerified,
    },
    {
      id: "schedule",
      title: "时间安排",
      done: session.scheduleCompleted,
    },
  ];
}

/**
 * 个人主页视图模型
 * 整合 sessionStore / profileStore 数据，统一供页面消费
 */
export interface ProfileView {
  /** 显示昵称 */
  displayName: string;
  /** 头像首字符（无头像 URL 时占位用） */
  avatarInitial: string;
  /** 学校名称（取 campusProfile.campusName，回退到 session.campusName） */
  school: string;
  /** 个人签名（取 basicProfile.bio，回退到默认文案） */
  bio: string;
  /** 是否为 VIP */
  isVip: boolean;
  /** VIP 等级名称（开通时展示） */
  vipPlanName: string;
  /** 我的动态预览列表（最多 3 条） */
  myPostsPreview: MyPostView[];
  /** 我的动态总数（来自 profileStats.posts） */
  myPostsTotal: number;
}

/**
 * 我的动态视图项
 */
export interface MyPostView {
  id: string;
  /** 摘要（截断到指定长度） */
  summary: string;
  /** 点赞数 */
  likes: number;
  /** 评论数 */
  comments: number;
  /** 相对时间文案（如「2 小时前」） */
  timeLabel: string;
}

/** 简介默认文案 */
const DEFAULT_BIO = "这个人很懒，什么都没写";
/** 摘要最大长度 */
const SUMMARY_MAX_LENGTH = 40;

/**
 * 格式化相对时间（与 village store 保持一致风格）
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = Date.parse(dateStr);
  if (Number.isNaN(then)) return "";
  const diff = now - then;
  if (diff < 0) return "刚刚";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return `${Math.floor(diff / day)} 天前`;
}

/**
 * 截断摘要，避免列表项过长
 */
function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * 将 profileStore 数据转换为个人主页视图模型
 *
 * @param params.session - 用户会话（提供 displayName / campusName 兜底）
 * @param params.basicProfile - 基础资料（提供 bio）
 * @param params.campusProfile - 校区资料（提供 campusName）
 * @param params.vipStatus - VIP 状态
 * @param params.myPosts - 我的动态列表
 * @param params.postsTotal - 我的动态总数（来自 profileStats.posts）
 */
export function toProfileView(params: {
  session: Schemas["UserSession"] | null;
  basicProfile: Schemas["BasicProfile"] | null;
  campusProfile: Schemas["CampusProfile"] | null;
  vipStatus: VipStatus | null;
  myPosts: MyPostSummary[];
  postsTotal: number;
}): ProfileView {
  const { session, basicProfile, campusProfile, vipStatus, myPosts, postsTotal } = params;

  const displayName =
    basicProfile?.nickname?.trim() ||
    session?.displayName?.trim() ||
    "未设置昵称";

  const avatarInitial = displayName.charAt(0).toUpperCase() || "?";

  // 学校优先取 campusProfile.campusName，回退到 session.campusName
  const school =
    campusProfile?.campusName?.trim() ||
    session?.campusName?.trim() ||
    "未设置学校";

  // 简介优先取 basicProfile.bio
  const rawBio = basicProfile?.bio?.trim() ?? "";
  const bio = rawBio.length > 0 ? rawBio : DEFAULT_BIO;

  const isVip = Boolean(vipStatus?.isVip);
  const vipPlanName = vipStatus?.planName?.trim() ?? "";

  const myPostsPreview: MyPostView[] = (myPosts ?? []).slice(0, 3).map((p) => ({
    id: p.id,
    summary: truncate(p.summary, SUMMARY_MAX_LENGTH),
    likes: p.likes,
    comments: p.comments,
    timeLabel: formatRelativeTime(p.createdAt),
  }));

  return {
    displayName,
    avatarInitial,
    school,
    bio,
    isVip,
    vipPlanName,
    myPostsPreview,
    myPostsTotal: postsTotal ?? 0,
  };
}
