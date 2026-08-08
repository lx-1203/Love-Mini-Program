import type { components } from "../services/generated/api-types";
import type { VipStatus, MyPostSummary } from "../stores/profile";
// 修复（R4-00220）：占位文案 i18n 化 + 相对时间复用 utils/time.ts
import { t, i18n } from "@/i18n";
import { formatRelativeTime as formatRelativeTimeUtil } from "../utils/time";

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
  /** 头像 URL（收尾轮：有值时渲染图片头像） */
  avatarUrl: string;
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
  /** 配图缩略图（QQ 说说卡片样式，最多 3 张横排；后端有则展示） */
  images?: string[];
}

/**
 * 摘要最大长度
 */
const SUMMARY_MAX_LENGTH = 40;

/**
 * 格式化相对时间（修复 R4-00220：复用 utils/time.ts 的 formatRelativeTime，
 * 与全局 i18n locale 联动，不再硬编码中文「刚刚/N 分钟前/…」）。
 */
function formatRelativeTime(dateStr: string): string {
  const then = Date.parse(dateStr);
  if (Number.isNaN(then)) return "";
  // locale 直接取 vue-i18n 全局实例（utils/time.ts 的 getCurrentLocale 依赖
  // globalThis.__I18N__ 挂载，当前无人挂载，恒回退 zh-CN，不可用）
  return formatRelativeTimeUtil(then, i18n.global.locale.value);
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
  avatarUrl?: string;
}): ProfileView {
  const { session, basicProfile, campusProfile, vipStatus, myPosts, postsTotal, avatarUrl } = params;

  const displayName =
    basicProfile?.nickname?.trim() ||
    session?.displayName?.trim() ||
    t("profilePlaceholder.noNickname");

  const avatarInitial = displayName.charAt(0).toUpperCase() || "?";

  // 学校优先取 campusProfile.campusName，回退到 session.campusName
  // 修复（R4-00220）：占位文案 i18n 化
  const school =
    campusProfile?.campusName?.trim() ||
    session?.campusName?.trim() ||
    t("profilePlaceholder.noSchool");

  // 简介优先取 basicProfile.bio
  const rawBio = basicProfile?.bio?.trim() ?? "";
  const bio = rawBio.length > 0 ? rawBio : t("profilePlaceholder.defaultBio");

  const isVip = Boolean(vipStatus?.isVip);
  const vipPlanName = vipStatus?.planName?.trim() ?? "";

  const myPostsPreview: MyPostView[] = (myPosts ?? []).slice(0, 3).map((p) => ({
    id: p.id,
    summary: truncate(p.summary, SUMMARY_MAX_LENGTH),
    likes: p.likes,
    comments: p.comments,
    timeLabel: formatRelativeTime(p.createdAt),
    images: p.coverImage ? [p.coverImage] : undefined,
  }));

  return {
    displayName,
    avatarInitial,
    avatarUrl: avatarUrl ?? "",
    school,
    bio,
    isVip,
    vipPlanName,
    myPostsPreview,
    myPostsTotal: postsTotal ?? 0,
  };
}
