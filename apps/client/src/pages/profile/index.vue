<script setup lang="ts">
/**
 * 个人中心 - 我的
 * 展示用户头像、昵称、学校、签名、VIP 状态、我的动态、数据统计、资料完善度、社交升温进度、功能菜单入口
 * 资料未完善时展示 LockScreen 锁定页面
 */
import { computed, ref } from "vue";
import { onShow, onUnload, onShareAppMessage } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { useProfileStore } from "../../stores/profile";
import { useLikesStore } from "../../stores/likes";
import { useCoinsStore } from "../../stores/coins";
import { useSocialProgressStore } from "../../stores/social-progress";
import { useDiscoverStore } from "../../stores/discover";
// review #62：动态预览点击跳转帖子详情前校验存在性
import { useVillageStore } from "../../stores/village";
import { isDev } from "../../services/env";
// Showcase 展示版入口
import { isShowcaseMode } from "../../config/showcase";
import { openAppPath, switchTabWithQuery, consumePendingTabQuery } from "../../utils/navigation";
// P2.6：帮助与客服 / 安全中心独立页路由
import { ROUTES } from "../../constants/routes";
import { useTabBar } from "../../composables/useTabBar";
import { toProfileView } from "../../view-models/profile";
import LockScreen from "../../components/common/LockScreen.vue";
import SocialProgressIndicator from "../../components/social/SocialProgressIndicator.vue";
import SafeImage from "../../components/common/SafeImage.vue";
// 2026-08-08：QQ 头像框机制（注册表驱动，按身份佩戴不同主题）
import AvatarFrame from "../../components/common/AvatarFrame.vue";
import { useAvatarFrame } from "../../composables/useAvatarFrame";
import MatchCountChip from "../../components/common/MatchCountChip.vue";
import VerificationBadge from "../../components/common/VerificationBadge.vue";
// Task F：全局发帖悬浮按钮组件
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
import { IMAGE_PATHS } from "../../config/images";
// Phase Feedback6：会员功能开关（false 时隐藏所有 VIP 入口）
import { featureFlags } from "../../config/feature-flags";
import { lightHaptic, successHaptic } from "../../utils/haptic";
import { designTokens } from "../../theme/tokens";
// P2.6：语音播放 URL 解析（mock:// 演示态 / /api/v1/media/ 鉴权代理真实 URL）
import { resolveMediaUrl } from "../../utils/media";
// 2026-08-08：pexels 外链本地化兜底（mp 端无法加载外链图，见 utils/image-local.ts）
import { toLocalImage } from "../../utils/image-local";
// 导入 UniUploadFileLike 类型，消除 buildFileLike 中 `as unknown as File` 交叉类型断言
import type { UniUploadFileLike } from "../../services/api";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";

/**
 * 当前页面对象（最小契约）。
 *
 * 兼容 mp-weixin（参数挂在 options）与 H5（参数挂在 $page.options）双端，
 * 此处仅声明实际消费的 options / $page 字段。
 */
interface PageWithOptions {
  options?: Record<string, string>;
  $page?: { options?: Record<string, string> };
}

/**
 * 从 uni.chooseImage / chooseVideo 返回值构造类 File 对象。
 *
 * 兼容 H5（File 标准）与 mp-weixin（tempFilePaths + path 字段）双端：
 * - H5：uni.chooseImage 返回 tempFiles，每项是标准 File，可直接传给 uploadFile
 * - mp-weixin：tempFiles 仅含 path/size，无 name 字段，包装为 File-like
 *
 * 返回 UniUploadFileLike 而非 File，避免 `as unknown as File` 交叉类型断言：
 * mp-weixin 端无 File 类型，强行断言会引入运行时风险；
 * UniUploadFileLike 仅约束上传所需的最小契约（name + 可选 path），双端兼容。
 *
 * @param filePath - 文件路径（tempFilePath）
 * @returns 类 File 对象（含 name/path 字段，满足 clientApi 上传签名）
 */
function buildFileLike(filePath: string): UniUploadFileLike {
  // 从路径中提取文件名（H5 与 mp-weixin 均适用）
  const name = filePath.split("/").pop() || "upload";
  // 构造 UniUploadFileLike 对象，无需断言；
  // H5 端 filePath 实际是 blob: URL，由 uploadFileViaUni 通过 path 字段处理；
  // mp-weixin 端 filePath 是 tempFilePath，同样通过 path 字段处理。
  return { name, path: filePath };
}

/**
 * 认证徽章级别类型（与 VerificationBadge 组件 props 对齐）
 */
type VerificationBadgeLevel = "none" | "school" | "email" | "idcard";

const { t } = useI18n();
const sessionStore = useSessionStore();

// 同步自定义 TabBar 选中状态（我的 = 索引 4）
useTabBar(4);
const profileStore = useProfileStore();
const likesStore = useLikesStore();
const coinsStore = useCoinsStore();
const socialProgressStore = useSocialProgressStore();
const discoverStore = useDiscoverStore();
const villageStore = useVillageStore();

/** 2026-08-08：当前用户佩戴的头像框主题（QQ 头像框机制，按身份自动判定） */
const { frameId: myFrameId } = useAvatarFrame();

/**
 * 个人主页顶部背景图 URL（Phase D4 / Phase E1 上传支持）
 * 从 session store 获取，空字符串时使用品牌色渐变 fallback
 * 上传成功后由 profileStore.uploadBackground 同步更新此字段
 *
 * 修复（E1.1）：字段名从 profileBgUrl 改为 profileBackgroundUrl，
 * 与后端 schema / fixtures / api-types-supplement 对齐。
 */
const { profileBackgroundUrl } = storeToRefs(sessionStore);

/**
 * 照片墙状态（Phase E2 / E3）
 * 从 profile store 获取，上传/删除后响应式更新
 * （设计需求：个人页无视频，仅语音介绍 60s——2026-08-07 已移除视频区块）
 */
const { photoGallery } = storeToRefs(profileStore);

/**
 * 上传状态（Phase E1 / E2 / E3 共用）
 * - isUploading: 是否正在上传中（控制 loading 蒙层显示）
 * - uploadProgress: 上传进度文案（如 "上传中..." / "删除中..."）
 * - uploadKind: 当前上传类型，用于在 UI 中精确控制蒙层位置
 * （设计需求：无视频上传，故 UploadKind 不含 "video"）
 */
type UploadKind = "background" | "photo" | "avatar" | null;
const isUploading = ref<boolean>(false);
const uploadProgress = ref<string>("");
const uploadKind = ref<UploadKind>(null);

/**
 * 照片墙最大数量（与后端契约一致，6 张）
 */
const PHOTO_GALLERY_MAX = 6;

/**
 * 照片墙格子列表（始终渲染 6 格，已上传的格子显示图片，空格子显示"+"占位）
 */
const photoCells = computed<Array<{ index: number; url: string; filled: boolean }>>(() => {
  const cells: Array<{ index: number; url: string; filled: boolean }> = [];
  for (let i = 0; i < PHOTO_GALLERY_MAX; i++) {
    const url = photoGallery.value[i] ?? "";
    cells.push({ index: i, url, filled: url.length > 0 });
  }
  return cells;
});

/** 照片墙是否已上传至少一张（用于切换 CTA 文案） */
// 修复（严格模式 noUnusedLocals）：hasPhotos 计算属性未被模板/脚本引用，已移除。

/**
 * 剩余匹配次数（Phase C1 · 共享 discover store）
 * 用于顶部 MatchCountChip 展示
 */
const { remainingCount: matchCount } = storeToRefs(discoverStore);

/**
 * Task F1 / M-08：通过 getCurrentPages() 获取页面 query 参数 userId
 * - 自己的 profile（无 userId 参数）：显示"编辑资料"按钮
 * - 对方 profile（有 userId 参数）：显示"打个招呼"按钮
 *
 * 使用 getCurrentPages() 而非 onLoad 是因为：
 * 1. 兼容 mp-weixin 与 H5 双端
 * 2. 避免引入额外的 onLoad lifecycle 复杂度
 */
const targetUserId = ref<string>("");

function loadPageUserIdParam(): void {
  // P1-04：优先消费 pending-tab-query 桥接（openAppPath 跳转本 Tab 页携带的 query）。
  // 本页是 Tab 页，switchTab 无法携带 query string，openAppPath 将 query 写入
  // storage（匹配 /pages/profile/index），这里 onShow 时读取即清，避免残留。
  const bridged = consumePendingTabQuery("/pages/profile/index");
  const bridgedUserId = bridged.userId;
  if (typeof bridgedUserId === "string" && bridgedUserId.length > 0) {
    targetUserId.value = bridgedUserId;
    return;
  }
  // 兜底：getCurrentPages 直读页面 options（直开链接 / H5 冷启动场景）
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1] as PageWithOptions | undefined;
    // mp-weixin 端：参数挂在 options；H5 端：可通过 $page.options 获取
    const options = currentPage?.options || currentPage?.$page?.options || {};
    const userId = options.userId;
    if (typeof userId === "string" && userId.length > 0) {
      targetUserId.value = userId;
    } else {
      targetUserId.value = "";
    }
  } catch (_e) {
    // 获取页面参数失败，按自己的 profile 处理
    targetUserId.value = "";
  }
}

/** 当前登录用户 ID */
const currentUserId = computed(() => sessionStore.userSession?.userId ?? "");

/** 是否为自己查看自己的 profile（无 userId 参数，或 userId 与当前用户一致） */
const isOwnProfile = computed(() => {
  if (!targetUserId.value) return true;
  if (!currentUserId.value) return true;
  return String(targetUserId.value) === String(currentUserId.value);
});

/**
 * 页面是否解锁（2026-08-07 链路调整）。
 *
 * 原实现：isProfileComplete 完成才解锁，「我的」整页被 LockScreen 锁死，
 * 未完善资料的用户（如体验账号）无法进入任何设置/退出。
 *
 * 现放宽为：登录即可进入「我的」；未完善资料时页面顶部显示
 * 完善引导横幅（见模板 profile-complete-banner），不再锁死整页。
 * 未登录时仍显示 LockScreen（引导登录）。
 */
const isUnlocked = computed(() => sessionStore.isLoggedIn);

/** 完善度百分比（0-100），用于未完善时的引导横幅 */
const completionPercent = computed(() => sessionStore.profileCompletion);

/**
 * 认证徽章级别（Phase D3 · 集成 VerificationBadge 到 profile 头部）
 *
 * 数据来源：profileStore.campusProfile.verificationStatus
 * - "verified" → "school"（校园认证通过，渲染绿色"已认证"徽章）
 * - "pending" / "draft" / undefined → "none"（渲染"去认证"CTA 按钮）
 *
 * 设计权衡：
 * - 仅 own profile 时显示 CTA（鼓励用户主动认证）
 * - 查看对方 profile 时（isOwnProfile=false），不显示 CTA，避免误导
 *   （showCtaWhenNone 由 computed 控制）
 */
const verificationBadgeLevel = computed<VerificationBadgeLevel>(() => {
  const status = profileStore.campusProfile?.verificationStatus;
  if (status === "verified") return "school";
  return "none";
});

/**
 * 是否在徽章为 none 时显示"去认证"CTA
 * - 自己的 profile：显示 CTA，鼓励认证
 * - 对方的 profile：不显示 CTA（避免在他人主页显示引导按钮）
 */
const showVerificationCta = computed(() => isOwnProfile.value);

/**
 * 点击"去认证"CTA 处理：
 * - 触发轻振动反馈
 * - 跳转到校园认证页（/pages/campus/certification）
 */
function handleVerificationClick() {
  lightHaptic();
  openAppPath("/pages/campus/certification");
}

/**
 * 个人主页视图模型（统一聚合 session / profile 数据）
 * 修复：原 isVip 写死为 false、学校信息缺失，现统一从 profileStore.vipStatus / campusProfile 获取
 */
const profileView = computed(() =>
  toProfileView({
    session: sessionStore.userSession,
    basicProfile: profileStore.basicProfile,
    campusProfile: profileStore.campusProfile,
    vipStatus: profileStore.vipStatus,
    myPosts: profileStore.myPosts,
    postsTotal: profileStore.profileStats?.posts ?? 0,
    avatarUrl: profileStore.avatarUrl,
  })
);

/* ========== 2026-08-08 QQ 主页重构：APP 专属标签行（复用现有字段，不新增 i18n） ========== */

/** 性别代词 · 年级标签（如「她/她 · 大三」，来自 basicProfile） */
const genderGradeLabel = computed(() => {
  const b = profileStore.basicProfile;
  const parts: string[] = [];
  if (b?.pronouns?.trim()) parts.push(b.pronouns.trim());
  if (b?.grade?.trim()) parts.push(b.grade.trim());
  return parts.join(" · ");
});

/** 位置行文案（家乡城市 → 未来城市，回退校区城市；QQ 主页风格） */
const locationLabel = computed(() => {
  const b = profileStore.basicProfile;
  const home = [b?.hometownProvince, b?.hometownCity]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("");
  const future = b?.futureCity?.trim();
  const prefix = t("discover.futureCityPrefix");
  if (future) {
    return home ? `${home} · ${prefix}${future}` : `${prefix}${future}`;
  }
  return home || profileStore.campusProfile?.city || "";
});

/** 学历标签（educationLevel 映射，复用 discover 命名空间文案） */
const educationTag = computed(() => {
  const level = profileStore.basicProfile?.educationLevel;
  if (!level) return "";
  const map: Record<string, string> = {
    high_school: t("discover.educationHighSchool"),
    bachelor: t("discover.educationBachelor"),
    master: t("discover.educationMaster"),
    phd: t("discover.educationPhd"),
  };
  return map[level] ?? "";
});

/** 感情状态标签（relationshipStatus 映射） */
const relationshipTag = computed(() => {
  const status = profileStore.basicProfile?.relationshipStatus;
  if (!status) return "";
  const map: Record<string, string> = {
    never: t("discover.relationshipNever"),
    married_before: t("discover.relationshipMarriedBefore"),
    divorced: t("discover.relationshipDivorced"),
    widowed: t("discover.relationshipWidowed"),
  };
  return map[status] ?? "";
});

/** QQ 风格：APP 专属标签胶囊行（学历 / 感情状态 / 未来规划标签，最多 4 个） */
const profileTagChips = computed<string[]>(() => {
  const chips: string[] = [];
  const edu = educationTag.value;
  if (edu) chips.push(edu);
  const rel = relationshipTag.value;
  if (rel) chips.push(rel);
  const plans = profileStore.basicProfile?.futurePlanTags ?? [];
  for (const p of plans) {
    if (chips.length >= 4) break;
    const s = p?.trim();
    if (s) chips.push(s);
  }
  return chips;
});

/** 是否展示 APP 专属标签行 */
const showProfileTags = computed(() => profileTagChips.value.length > 0);

/* ========== 2026-08-08 QQ 主页重构：成就卡片（整合社交升温 + 匹配 + 喜欢） ========== */

/** 成就卡 3 格数据：匹配次数 / 喜欢次数 / 社交升温进度 */
interface AchievementStat {
  icon: string;
  value: string;
  label: string;
  hint: string;
  path?: string;
}

const achievementStats = computed<AchievementStat[]>(() => {
  const progress = socialProgressStore.progress;
  const matchCount = progress?.matchCount ?? 0;
  const likeCount = progress?.likeCount ?? 0;
  const pct = socialProgressStore.progressPercentage;
  const tierLabel = progress?.tierLabel ?? t("profile.achievementWarmHint");
  return [
    {
      icon: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
      value: String(matchCount),
      label: t("profile.achievementMatch"),
      hint: t("profile.achievementMatchHint"),
    },
    {
      icon: IMAGE_PATHS.ICONS_EMOJI.HEART,
      value: String(likeCount),
      label: t("profile.achievementLike"),
      hint: t("profile.achievementLikeHint"),
    },
    {
      icon: IMAGE_PATHS.ICONS_EMOJI.FIRE,
      value: `${pct}%`,
      label: tierLabel,
      hint: t("profile.achievementWarmHint"),
    },
  ];
});

/** 是否为VIP（从 profileStore.vipStatus 获取，避免写死） */
const isVip = computed(() => profileView.value.isVip);

/** VIP 等级名称 */
const vipPlanName = computed(() => profileView.value.vipPlanName);

/** 头像首字符 */
const avatarInitial = computed(() => profileView.value.avatarInitial);

/** 个人简介 */
const bio = computed(() => profileView.value.bio);

/** 学校名称 */
const school = computed(() => profileView.value.school);

/** 我的动态预览列表（最多 3 条） */
const myPostsPreview = computed(() => profileView.value.myPostsPreview);

/** 我的动态总数 */
const myPostsTotal = computed(() => profileView.value.myPostsTotal);

/**
 * 数据统计项（从 profileStats 获取真实数据）
 */
interface StatItem {
  label: string;
  value: number | string;
  /** 付费解锁项（右上角小锁标识） */
  locked?: boolean;
  /** 点击跳转目标 */
  path?: string;
}

/**
 * 核心数据统计栏（QQ 主页改造方案）：
 * 我喜欢的 / 喜欢我的（🔒）/ 最近来访（🔒）/ 获赞
 */
const stats = computed<StatItem[]>(() => {
  const s = profileStore.profileStats;
  return [
    { label: t("profile.myLikes"), value: likesStore.likes.length, path: "/pages/likes/index" },
    { label: t("profile.likedMe"), value: likesStore.likedBy.length, locked: true, path: "/pages/likes-visitors/index" },
    { label: t("profile.recentVisitors"), value: likesStore.visitors.length, locked: true, path: "/pages/likes-visitors/index" },
    { label: t("profile.likes"), value: s?.likesCount ?? 0, path: "/pages/likes/index" },
  ];
});

/**
 * 统计栏点击（QQ 主页改造方案）：
 * 喜欢我的/最近来访 → 喜欢与访客页（页内解锁）；我喜欢的/获赞 → 列表页。
 */
function handleStatTap(index: number) {
  lightHaptic();
  const item = stats.value[index];
  if (item?.path) {
    openAppPath(item.path);
  } else {
    uni.showToast({ title: t("profile.statComingSoon"), icon: "none" });
  }
}

/** 点击头像放大查看（QQ 主页交互：头像仅预览，修改走编辑资料） */
function handleAvatarPreview() {
  const url = profileView.value.avatarUrl;
  if (!url) return;
  try {
    uni.previewImage({ urls: [url], current: url });
  } catch (_e) {
    // 预览失败静默
  }
}

/**
 * 功能菜单项配置
 * 使用 IMAGE_PATHS 图标 + 同色系浅色背景
 */
interface MenuItem {
  icon: string;
  bgColor: string;
  label: string;
  path?: string;
  /** 右侧标注（如「领交友币」「得奖励」、余额） */
  hint?: string;
  /** TabBar 页面传参（switchTab 不支持 query，走 storage 桥接） */
  tabQuery?: Record<string, string>;
  action?: () => void;
}

/**
 * 核心功能列表区（QQ 主页改造方案）：
 * 任务中心（领交友币）→ 交友币（余额）→ 我的圈子 → 恋爱咨询与测试 →
 * 推荐给好友（得奖励）→ 帮助与客服；其余功能入口排在后面。
 */
const menuItems = computed<MenuItem[]>(() => [
  /* Showcase 展示版：全功能入口（仅展示构建包可见） */
  ...(isShowcaseMode
    ? [
        {
          icon: IMAGE_PATHS.ICONS_PROFILE.MATCHES,
          bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
          label: t("profile.showcaseEntry"),
          path: "/pages/showcase/index",
        } as MenuItem,
      ]
    : []),
  /* 1. 任务中心（每日任务、交友币奖励） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.MATCHES,
    bgColor: "var(--c-tint-cream-50, #FFF8E7)",
    label: t("profile.taskCenter"),
    hint: t("profile.earnCoins"),
    path: "/pages/profile/tasks",
  },
  /* 2. 交友币（当前余额） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.PHOTO_WALL,
    bgColor: "var(--c-tint-cream-50, #FFF8E7)",
    label: t("profile.coinBalance"),
    hint: `${coinsStore.balanceYuan} 币`,
    path: "/pages/wallet/index",
  },
  /* 3. 我的圈子（加入的圈子 + 发布的圈子帖子） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.MATCHES,
    bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
    label: t("profile.myCircles"),
    path: ROUTES.CIRCLES.INDEX,
  },
  /* 4. 恋爱咨询与测试（恋爱咨询/课程/社交/MBTI 聚合） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "var(--c-tint-pink-50, #F3E8FF)",
    label: t("profile.loveLab"),
    path: ROUTES.LOVE_CENTER.INDEX,
  },
  /* 5. 推荐给好友（得奖励） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.SHARE,
    bgColor: "var(--c-lavender-100, #EDE9FE)",
    label: t("profile.shareFriend"),
    hint: t("profile.earnReward"),
    action: () => {
      uni.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"],
      });
    },
  },
  /* 6. 帮助与客服（常见问题、联系人工客服） */
  {
    icon: IMAGE_PATHS.ICONS_EMOJI.CHAT,
    bgColor: "var(--c-sky-50, #E0F2FE)",
    label: t("profile.helpSupport"),
    path: ROUTES.HELP,
  },
  /* ===== 其余功能入口 ===== */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
    bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
    label: t("profile.myPosts"),
    path: "/pages/village/index",
    tabQuery: { tab: "mine" } as Record<string, string> | undefined,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.VISITORS,
    bgColor: "var(--c-bg-brand, #E8F8F0)",
    label: t("profile.visitors"),
    path: "/pages/profile/visitors",
  },
  /* 2026-08-08 论坛互动真实化：帖子浏览记录入口 */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
    bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
    label: t("profile.browseHistory"),
    path: "/pages/village/history",
  },
  /* 功能4：相册入口 */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.PHOTO_WALL,
    bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
    label: t("profile.albumTitle"),
    path: "/pages/profile/album",
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.VERIFICATION,
    bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
    label: t("profile.verification"),
    path: "/pages/verification/index",
  },
  /* 2026-08-07 链路调整：时间安排/课表为可选项 */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "var(--c-tint-cream-50, #FFF8E7)",
    label: t("profile.scheduleSetting"),
    path: "/subpackages/setup/schedule/index",
  },
  /* 2026-08-07 消息页重构：系统通知由「产品助手号」官方会话承载 */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.MATCHES,
    bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
    label: t("profile.notifications"),
    path: "/pages/official-chat/index?accountId=official-assistant",
  },
]);

/**
 * 系统与隐私设置区（QQ 主页改造方案）：
 * 隐私权限设置（同校推荐开关，核心突出）→ 安全中心 → 通用设置
 */
const settingsMenuItems = computed<MenuItem[]>(() => [
  /* 1. 隐私权限设置（核心隐私项单独突出） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "var(--c-lavender-100, #EDE9FE)",
    label: t("profile.privacyPermission"),
    path: "/pages/profile/privacy",
  },
  /* 2. 安全中心（账号安全、举报记录、黑名单） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "var(--c-tint-pink-50, #F3E8FF)",
    label: t("profile.safetyCenter"),
    path: ROUTES.SECURITY,
  },
  /* 3. 通用设置（通知管理、缓存清理、账号与安全、关于我们） */
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "var(--c-bg-page, #F4F6FA)",
    label: t("profile.settings"),
    path: "/pages/settings/index",
  },
]);

const bottomMenuItems = computed<MenuItem[]>(() => [
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.INFO,
    bgColor: "var(--c-bg-page, #F4F6FA)",
    label: t("profile.aboutUs"),
    action: () => {
      lightHaptic();
      uni.showModal({
        title: t("profile.aboutTitle"),
        content: t("profile.aboutContent"),
        showCancel: false,
        confirmText: t("profile.gotIt"),
      });
    },
  },
]);

/**
 * 点击菜单项处理
 * @param item - 菜单项
 */
function handleMenuTap(item: MenuItem) {
  lightHaptic(); // 菜单点击轻振动反馈
  if (item.path) {
    if (item.tabQuery && Object.keys(item.tabQuery).length > 0) {
      // TabBar 页面传参（switchTab 不支持 query，走 storage 桥接）
      switchTabWithQuery(item.path, item.tabQuery);
    } else {
      openAppPath(item.path);
    }
  } else if (item.action) {
    item.action();
  }
}

/**
 * 跳转到资料编辑页
 */
function goToProfileSetup() {
  lightHaptic();
  openAppPath("/subpackages/setup/profile/index");
}

/**
 * 未完善资料引导横幅点击：跳转资料完善流程（2026-08-07 链路调整）。
 * 与 goToProfileSetup 共用入口，语义上引导用户完成资料。
 */
function goCompleteProfile() {
  goToProfileSetup();
}

/**
 * Task F1 / M-08：对对方 profile 发起"打个招呼"
 * - 触发成功振动反馈
 * - 跳转到与该用户的私聊会话页（带 targetUserId 参数）
 */
function handleSayHi() {
  successHaptic();
  const userId = targetUserId.value;
  if (!userId) return;
  // 收尾轮修复：chat-session 端消费 query.userId（原传 targetUserId 参数被忽略）
  openAppPath(`/pages/chat-session/index?userId=${encodeURIComponent(userId)}`);
}

/**
 * VIP开通点击 - 跳转到 VIP 开通页
 */
function handleVipClick() {
  lightHaptic();
  openAppPath("/pages/vip/index");
}

/* ========== Phase Feedback5：60s 语音状态（P2.6 真实化） ========== */

/** 语音状态 URL（来自 profile store） */
const voiceStatusUrl = computed(() => profileStore.voiceStatusUrl);
/** 语音时长（秒） */
const voiceStatusDuration = computed(() => profileStore.voiceStatusDuration);
/** 是否正在播放（真实 InnerAudioContext / 演示态计时） */
const isVoicePlaying = ref(false);
/** P2.6：是否正在录音（真实 RecorderManager） */
const isRecordingVoice = ref(false);
/** P2.6：录音已用秒数（驱动录音态文案） */
const recordingSeconds = ref(0);

/** P2.6：语音最长 60 秒（RecorderManager duration 上限与后端收敛一致） */
const VOICE_MAX_DURATION_MS = 60000;
/** 录音最短有效时长（毫秒）：过短视为误触，不产生语音 */
const VOICE_MIN_DURATION_MS = 1000;
/** 演示态自动停止时长（毫秒）——mock:// URL 无真实音频，模拟播放动效 */
const VOICE_DEMO_PLAY_MS = 3000;

/** 演示态自动停止计时器（连点播放/暂停时先清理，避免状态错乱） */
let voicePlayTimer: ReturnType<typeof setTimeout> | null = null;
/** P2.6：录音进度刷新定时器 */
let recordingTickTimer: ReturnType<typeof setInterval> | null = null;
/** 录音开始时间戳（毫秒，用于 onStop 无 duration 时兜底计算） */
let recordingStartedAt = 0;
/** 录音管理器（懒初始化，页面加载不创建） */
let recorderManager: UniApp.RecorderManager | null = null;
/** 音频播放器（懒初始化，播放时创建） */
let voiceAudio: UniApp.InnerAudioContext | null = null;

/** 语音时长标签（如 0:42 / 0:05） */
const voiceDurationLabel = computed(() => {
  const seconds = voiceStatusDuration.value || 0;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
});

/** 录音中标签（如 录音中 12″） */
const recordingLabel = computed(() => {
  const ss = Math.min(recordingSeconds.value, 60);
  return `${ss}″`;
});

/**
 * 懒初始化录音管理器并注册回调（P2.6 真实录制）。
 *
 * 平台限制：mp-weixin 支持 uni.getRecorderManager；H5 端部分环境不支持，
 * 获取失败时返回 null，由调用方降级提示。
 */
function getRecorder(): UniApp.RecorderManager | null {
  if (recorderManager) {
    return recorderManager;
  }
  try {
    recorderManager = uni.getRecorderManager();
  } catch (_e) {
    return null;
  }
  recorderManager.onStop((res) => {
    stopRecordingTicker();
    isRecordingVoice.value = false;
    const filePath = res?.tempFilePath ?? "";
    if (!filePath) {
      uni.showToast({ title: t("messages.voiceRecordFailed"), icon: "none" });
      return;
    }
    // res.duration 为毫秒；缺失时按开始时间兜底计算
    const durationMs = res?.duration && res.duration > 0
      ? res.duration
      : Date.now() - recordingStartedAt;
    void finishRecording(filePath, durationMs);
  });
  recorderManager.onError(() => {
    stopRecordingTicker();
    isRecordingVoice.value = false;
    uni.showToast({ title: t("messages.voiceRecordFailed"), icon: "none" });
  });
  return recorderManager;
}

/** 启动录音进度刷新（每秒 +1s，60s 上限由 RecorderManager duration 强制停止） */
function startRecordingTicker(): void {
  stopRecordingTicker();
  recordingTickTimer = setInterval(() => {
    recordingSeconds.value += 1;
    if (recordingSeconds.value >= 60) {
      // 到达 60s 上限由 RecorderManager 自动 onStop，此处仅停止刷新
      stopRecordingTicker();
    }
  }, 1000);
}

function stopRecordingTicker(): void {
  if (recordingTickTimer) {
    clearInterval(recordingTickTimer);
    recordingTickTimer = null;
  }
}

/**
 * 停止录音后的上传流程（P2.6 真实链路）：
 * 1. 时长过短（<1s）视为误触，丢弃不产生语音
 * 2. 包装 tempFilePath 为 UniUploadFileLike
 * 3. profileStore.uploadVoice 上传（mock 生成 mock URL / real 走 /api/v1/media/upload?type=audio）
 * 4. 成功后展示语音卡片；失败 toast 提示
 */
async function finishRecording(filePath: string, durationMs: number): Promise<void> {
  const safeMs = Math.min(Math.max(0, durationMs || 0), VOICE_MAX_DURATION_MS);
  if (safeMs < VOICE_MIN_DURATION_MS) {
    uni.showToast({ title: t("profile.voiceTooShort"), icon: "none" });
    return;
  }
  const file = buildFileLike(filePath);
  try {
    await profileStore.uploadVoice(file, safeMs);
    successHaptic();
    uni.showToast({ title: t("profile.voiceUploaded"), icon: "success" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("profile.uploadFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * 录制语音状态（P2.6 真实录制，最长 60s）：
 * - 未录制：点击开始录音（再次点击或录满 60s 自动停止）
 * - 录音中：点击立即停止并上传
 * - 环境不支持录音（如 H5）时降级提示
 */
function handleRecordVoice() {
  lightHaptic();
  // 录音中：点击即停止
  if (isRecordingVoice.value) {
    const mgr = getRecorder();
    if (mgr) {
      mgr.stop();
    } else {
      isRecordingVoice.value = false;
      stopRecordingTicker();
    }
    return;
  }
  const mgr = getRecorder();
  if (!mgr) {
    uni.showToast({ title: t("profile.voiceNotSupported"), icon: "none" });
    return;
  }
  // 播放中先停止，避免录音与播放并发
  stopVoicePlayback();
  try {
    recordingStartedAt = Date.now();
    recordingSeconds.value = 0;
    isRecordingVoice.value = true;
    startRecordingTicker();
    mgr.start({
      format: "aac",
      duration: VOICE_MAX_DURATION_MS,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
    });
    uni.showToast({ title: t("profile.voiceRecording"), icon: "none" });
  } catch (_e) {
    isRecordingVoice.value = false;
    stopRecordingTicker();
    uni.showToast({ title: t("messages.voiceRecordFailed"), icon: "none" });
  }
}

/** 停止语音播放（真实音频 stop + 演示态计时清理） */
function stopVoicePlayback(): void {
  if (voicePlayTimer) {
    clearTimeout(voicePlayTimer);
    voicePlayTimer = null;
  }
  try {
    voiceAudio?.stop();
  } catch (_e) {
    // 停止失败静默处理（音频可能已结束）
  }
  isVoicePlaying.value = false;
}

/**
 * 播放/暂停语音状态（P2.6 真实播放）：
 * - mock:// 演示态 URL：模拟 3 秒播放动效（无真实音频源）
 * - 真实 URL（/api/v1/media/... 鉴权代理）：createInnerAudioContext 播放，
 *   结束/错误自动复位播放态
 */
function handlePlayVoice() {
  lightHaptic();
  if (isVoicePlaying.value) {
    stopVoicePlayback();
    return;
  }
  const rawUrl = voiceStatusUrl.value;
  if (!rawUrl) return;
  // 演示态（mock URL 无真实音频，保留原计时器模拟动效）
  if (rawUrl.startsWith("mock://")) {
    isVoicePlaying.value = true;
    if (voicePlayTimer) {
      clearTimeout(voicePlayTimer);
    }
    voicePlayTimer = setTimeout(() => {
      isVoicePlaying.value = false;
      voicePlayTimer = null;
    }, VOICE_DEMO_PLAY_MS);
    return;
  }
  // 真实播放：解析鉴权代理 URL（附带 token 查询参数）
  const src = resolveMediaUrl(rawUrl);
  if (!src) {
    uni.showToast({ title: t("profile.uploadFailed"), icon: "none" });
    return;
  }
  try {
    if (!voiceAudio) {
      voiceAudio = uni.createInnerAudioContext();
      voiceAudio.onEnded(() => {
        isVoicePlaying.value = false;
      });
      voiceAudio.onStop(() => {
        isVoicePlaying.value = false;
      });
      voiceAudio.onError(() => {
        isVoicePlaying.value = false;
        uni.showToast({ title: t("messages.voiceRecordFailed"), icon: "none" });
      });
    }
    voiceAudio.src = src;
    voiceAudio.play();
    isVoicePlaying.value = true;
  } catch (_e) {
    uni.showToast({ title: t("profile.voiceNotSupported"), icon: "none" });
  }
}

/** 删除语音状态（先停止播放/录音，避免残留音频上下文） */
function handleRemoveVoice() {
  stopVoicePlayback();
  if (isRecordingVoice.value) {
    isRecordingVoice.value = false;
    stopRecordingTicker();
    try {
      getRecorder()?.stop();
    } catch (_e) {
      // 停止失败静默处理
    }
  }
  uni.showModal({
    title: t("profile.titleTip"),
    content: t("profile.voiceDeleteConfirm"),
    confirmText: t("common.delete"),
    cancelText: t("common.cancel"),
    confirmColor: designTokens.color.error,
    success: (res) => {
      if (!res.confirm) return;
      profileStore.clearVoiceStatus();
      uni.showToast({ title: t("profile.voiceDeleted"), icon: "success" });
    },
  });
}

/**
 * 查看我的动态全部（跳转到村口「我的」分区）
 */
function goToMyPosts() {
  lightHaptic();
  switchTabWithQuery("/pages/village/index", { tab: "mine" });
}

/**
 * 点击单条动态预览项（review #62：优先跳转帖子详情，不再一律跳"我的"分区）
 * @param postId - 帖子 ID；为空或帖子不存在时回退"我的"分区
 */
async function handlePostTap(postId: string) {
  lightHaptic();
  if (!postId) {
    switchTabWithQuery("/pages/village/index", { tab: "mine" });
    return;
  }
  await villageStore.setCurrentPost(postId);
  if (villageStore.currentPost) {
    openAppPath(`/pages/village/detail?id=${encodeURIComponent(postId)}`);
    return;
  }
  // 帖子不存在（可能已被删除）：回退"我的"分区
  switchTabWithQuery("/pages/village/index", { tab: "mine" });
}

/** Task F：全局发帖 FAB publish 事件 → 发帖编辑页 */
function goToPublishTopic() {
  openAppPath("/pages/circles/post-topic");
}

/** 退出登录 */
function handleLogout() {
  lightHaptic();
  uni.showModal({
    title: t("profile.titleTip"),
    content: t("profile.logoutConfirm"),
    success: (res) => {
      if (!res.confirm) return;
      // 修复（P1 BUG）：原直接置空 userSession，未通知后端、未清理本地状态。
      // 改为调用 sessionStore.logout() 统一处理：
      // 1. 调用 clientApi.logout() 清除本地 token + 异步通知后端 + 跳转登录页
      // 2. 清空 store 状态（userSession / profileBackgroundUrl 等）
      void sessionStore.logout().catch((error) => {
        console.warn("[profile] logout 调用异常:", error);
      });
    },
  });
}

/**
 * Task E1 / H-10：点击"编辑背景图"按钮触发图片选择 + 上传。
 *
 * 流程：
 * 1. uni.chooseImage 选择单张压缩图
 * 2. 构造类 File 对象（兼容 mp-weixin path 字段）
 * 3. 调用 profileStore.uploadBackground 上传 + 更新本地状态
 * 4. 上传中显示 loading + 进度文案，上传完成 toast 提示
 * 5. 失败时 toast 提示错误信息
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 */
async function handleEditBackground() {
  if (isUploading.value) return;
  lightHaptic();
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: t('profile.privacyRequiredImage'),
      icon: "none",
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      if (!tempPath) {
        uni.showToast({ title: t("profile.noPhotoSelected"), icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath);
      void uploadBackground(file);
    },
    fail: (err) => {
      // 用户取消选择时不报错（errMsg 含 cancel）
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: t("profile.choosePhotoFailed"), icon: "none" });
      }
    },
  });
}

/**
 * 实际执行背景图上传（与 chooseImage 解耦，便于测试）
 *
 * @param file - 类 File 对象（UniUploadFileLike，兼容 H5 / mp-weixin 双端）
 */
async function uploadBackground(file: UniUploadFileLike) {
  isUploading.value = true;
  uploadKind.value = "background";
  uploadProgress.value = t("profile.uploading");
  try {
    await profileStore.uploadBackground(file);
    successHaptic();
    uni.showToast({ title: t("profile.bgUpdated"), icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("profile.uploadFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isUploading.value = false;
    uploadKind.value = null;
    uploadProgress.value = "";
  }
}

/**
 * Task E3 / H-08：点击照片墙空格子触发图片选择 + 上传到指定索引。
 * @param index - 目标索引（0-5），应为当前 photoGallery.length
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 */
async function handleUploadPhoto(index: number) {
  if (isUploading.value) return;
  if (index < 0 || index >= PHOTO_GALLERY_MAX) return;
  lightHaptic();
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: t('profile.privacyRequiredImage'),
      icon: "none",
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      if (!tempPath) {
        uni.showToast({ title: t("profile.noPhotoSelected"), icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath);
      void uploadPhoto(file, index);
    },
    fail: (err) => {
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: t("profile.choosePhotoFailed"), icon: "none" });
      }
    },
  });
}

/**
 * 实际执行照片墙上传
 *
 * @param file - 类 File 对象（UniUploadFileLike，兼容 H5 / mp-weixin 双端）
 * @param index - 照片墙目标索引（0-5）
 */
async function uploadPhoto(file: UniUploadFileLike, index: number) {
  isUploading.value = true;
  uploadKind.value = "photo";
  uploadProgress.value = t("profile.uploading");
  try {
    await profileStore.uploadPhotoAtIndex(file, index);
    successHaptic();
    uni.showToast({ title: t("profile.photoAdded"), icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("profile.uploadFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isUploading.value = false;
    uploadKind.value = null;
    uploadProgress.value = "";
  }
}

/**
 * Task E3 / H-08：长按照片墙格子触发删除（仅对已上传格子生效）。
 * @param index - 目标索引（0 到 photoGallery.length-1）
 */
function handleRemovePhoto(index: number) {
  if (isUploading.value) return;
  if (index < 0 || index >= photoGallery.value.length) return;
  lightHaptic();
  uni.showModal({
    title: t("profile.deletePhoto"),
    content: t("profile.deletePhotoConfirm"),
    confirmText: t("profile.delete"),
    confirmColor: designTokens.color.error,
    success: async (res) => {
      if (!res.confirm) return;
      isUploading.value = true;
      uploadKind.value = "photo";
      uploadProgress.value = t("profile.deleting");
      try {
        await profileStore.removePhotoAtIndex(index);
        successHaptic();
        uni.showToast({ title: t("profile.photoDeleted"), icon: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : t("profile.deleteFailed");
        uni.showToast({ title: message, icon: "none" });
      } finally {
        isUploading.value = false;
        uploadKind.value = null;
        uploadProgress.value = "";
      }
    },
  });
}

/**
 * 应用版本号（运行时判断，mp-weixin 安全）
 * 修复：原使用条件编译块（ifdef H5 / ifndef H5）声明同名变量，
 * vue-tsc 不识别条件编译注释，会同时处理两个分支导致重复声明错误。
 * 现改为运行时判断（typeof window），H5 下读 Vite 注入，mp-weixin 下使用默认值。
 */
const appVersion: string = (() => {
  if (typeof window === "undefined") return "v1.0.0";
  try {
    const v = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_VERSION;
    return typeof v === "string" && v.length > 0 ? v : "v1.0.0";
  } catch (_e) {
    return "v1.0.0";
  }
})();

/**
 * 空间分享（2026-08-08 QQ 主页重构）：右上角分享按钮 + 微信右上角菜单分享。
 * 分享目标：自己的主页（无 userId）/ 对方主页（带 userId，被分享者点开即浏览对方主页）。
 */
onShareAppMessage(() => {
  const name = profileView.value.displayName;
  const path = isOwnProfile.value
    ? "/pages/profile/index"
    : `/pages/profile/index?userId=${encodeURIComponent(targetUserId.value)}`;
  return {
    title: t("profile.shareProfileTitle", { name }),
    path,
  };
});

/** 是否为开发环境（从 env.ts 导入，mp-weixin 安全） */
// isDev 已从 services/env 导入

/**
 * 页面显示时拉取个人主页数据（review #36：仅首次 onShow 请求，消除 onMounted+onShow 双请求）
 * onShow 在 onMounted 之前触发，首次 onShow 即覆盖首屏数据加载。
 */
let profileRequestedOnce = false;
onShow(() => {
  loadPageUserIdParam();
  if (profileRequestedOnce) return;
  profileRequestedOnce = true;
  profileStore.fetchProfile().catch((error) => {
    console.warn("[ProfilePage] fetchProfile 失败:", error);
  });
  socialProgressStore.fetchProgress().catch((error) => {
    console.warn("[ProfilePage] fetchProgress 失败:", error);
  });
});

/**
 * 页面卸载时清理语音资源（Phase Feedback5 / P2.6）：
 * 演示定时器、录音进度定时器、录音/播放音频上下文，避免卸载后触发状态更新
 */
onUnload(() => {
  if (voicePlayTimer) {
    clearTimeout(voicePlayTimer);
    voicePlayTimer = null;
  }
  stopRecordingTicker();
  isRecordingVoice.value = false;
  try {
    recorderManager?.stop();
  } catch (_e) {
    // 停止失败静默处理
  }
  try {
    voiceAudio?.destroy();
  } catch (_e) {
    // 销毁失败静默处理
  }
  voiceAudio = null;
});
</script>

<template>
  <view class="profile-page page-bottom-safe page-fade-in">
    <!-- ==================== 未完善资料：锁定页面 ==================== -->
    <LockScreen
      v-if="!isUnlocked"
      :page-name="t('profile.pageName')"
      :completion-percent="completionPercent"
    />

    <!-- ==================== 已完善资料：完整个人中心 ==================== -->
    <template v-else>
      <!-- 顶部浪漫渐变背景 -->
      <view class="profile-header-bg">
        <view class="header-bg__deco header-bg__deco--1" />
        <view class="header-bg__deco header-bg__deco--2" />
        <view class="header-bg__deco header-bg__deco--3" />
      </view>

      <!-- 页面顶部安全区占位 -->
      <view class="safe-top" />

      <!-- 未完善资料：顶部完善引导横幅（2026-08-07 链路调整，替代整页锁定） -->
      <view
        v-if="!sessionStore.isProfileComplete"
        class="profile-complete-banner press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('profile.completeBannerAria', { n: completionPercent })"
        @tap="goCompleteProfile"
      >
        <text class="profile-complete-banner__text">
          {{ t('profile.completeBanner', { n: completionPercent }) }}
        </text>
        <text class="profile-complete-banner__action">{{ t('profile.completeBannerAction') }}</text>
        <text class="profile-complete-banner__arrow">&rsaquo;</text>
      </view>

      <!-- 顶部右上角：空间分享 + 退出登录 + 匹配次数 chip（Phase C1 · 跨页面复用） -->
      <view class="profile-top-bar">
        <view class="profile-top-actions">
          <!-- 空间分享（2026-08-08 QQ 主页重构：右上角分享入口，mp-weixin 原生分享按钮） -->
          <button
            class="profile-share"
            open-type="share"
            hover-class="profile-share--hover"
            :aria-label="t('profile.shareProfileAria')"
          >
            <image class="profile-share__icon" :src="IMAGE_PATHS.ICONS_PROFILE.SHARE" mode="aspectFit" alt="" />
          </button>
          <view
            class="profile-logout press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('profile.logoutAria')"
            @tap="handleLogout"
          >
            <image class="profile-logout__icon" :src="IMAGE_PATHS.ICONS_COMMON.LOG_OUT_SVG" mode="aspectFit" alt="" />
          </view>
        </view>
        <MatchCountChip :count="matchCount" />
      </view>

      <!-- 个人信息区 -->
      <view class="profile-info">
        <!-- 顶部背景图（Phase D4 · 可配置，默认品牌色渐变；Phase E1 · 支持上传）
             2026-08-08 QQ 主页风格：widthFix 完整展示背景图（下拉可看全图），pexels 外链本地化 -->
        <view class="profile-bg">
          <image
            v-if="profileBackgroundUrl"
            class="profile-bg__img"
            :src="toLocalImage(profileBackgroundUrl)"
            mode="widthFix" lazy-load alt=""
          />
          <view class="profile-bg__overlay" />
          <!-- Phase E1 / H-10：编辑背景图按钮（仅自己主页显示，右下角相机图标） -->
          <view
            v-if="isOwnProfile"
            class="profile-bg__edit press-feedback"
            hover-class="profile-bg__edit--hover"
            hover-stay-time="120"
            role="button"
            :aria-label="t('profile.editBgAria')"
            @tap="handleEditBackground"
          >
            <image
              v-if="!isUploading || uploadKind !== 'background'"
              class="profile-bg__edit-icon"
              :src="IMAGE_PATHS.ICONS_COMMON.CAMERA"
              mode="aspectFit" alt=""
            />
            <view v-else class="profile-bg__edit-spinner" />
            <text class="profile-bg__edit-text">
              {{ isUploading && uploadKind === 'background' ? uploadProgress : t('profile.editBackground') }}
            </text>
          </view>
          <!-- Phase E1 / H-10：上传中蒙层 -->
          <view
            v-if="isUploading && uploadKind === 'background'"
            class="profile-bg__loading"
          >
            <text class="profile-bg__loading-text">{{ uploadProgress }}</text>
          </view>
        </view>

        <!-- QQ 名片卡（2026-08-08 重构）：白色资料卡骑封面下缘，头像 + 昵称/标签/签名 + 整宽按钮 -->
        <view class="profile-head-card">
          <!-- 头像 + 信息区 -->
          <view class="profile-info__main">
            <!-- 头像区域（QQ 主页方案：点击头像放大查看；修改头像走编辑资料页）
                 2026-08-08：QQ 头像框机制，按身份佩戴不同主题框 -->
            <view
              class="avatar-wrap"
              role="button"
              :aria-label="t('profile.avatarPreviewAria')"
              @tap="handleAvatarPreview"
            >
              <AvatarFrame :frame-id="myFrameId">
                <view class="avatar">
                  <SafeImage
                    v-if="profileView.avatarUrl"
                    :src="profileView.avatarUrl"
                    custom-class="avatar__img"
                    mode="aspectFill"
                    :lazy-load="true"
                    fallback="/static/generated/images/avatars/default-girl.jpg"
                  />
                  <text v-else class="avatar__text">{{ avatarInitial }}</text>
                  <!-- 自己主页：右上角相机小标 -->
                  <view v-if="isOwnProfile" class="avatar-camera press-feedback">
                    <image
                      v-if="!(isUploading && uploadKind === 'avatar')"
                      class="avatar-camera__icon"
                      :src="IMAGE_PATHS.ICONS_COMMON.CAMERA"
                      mode="aspectFit" alt=""
                    />
                    <view v-else class="avatar-camera__spinner" />
                  </view>
                </view>
              </AvatarFrame>
            </view>

            <view class="profile-info__right">
              <!-- 用户信息 -->
              <view class="user-info">
                <view class="user-info__name-row">
                  <text class="user-info__name">{{ profileView.displayName }}</text>
                  <!-- QQ 风格：性别代词 · 年级 标签（APP 专属条件） -->
                  <text v-if="genderGradeLabel" class="user-info__chip">{{ genderGradeLabel }}</text>
                  <!-- 认证徽章：已认证显示对应徽章，未认证显示"去认证"CTA（仅自己主页） -->
                  <VerificationBadge
                    v-if="verificationBadgeLevel !== 'none' || showVerificationCta"
                    :level="verificationBadgeLevel"
                    size="md"
                    :show-cta-when-none="showVerificationCta"
                    @tap="handleVerificationClick"
                  />
                  <!-- VIP 徽章：仅会员功能开启时展示（Phase Feedback6：默认隐藏） -->
                  <view v-if="featureFlags.membershipEnabled && isVip" class="user-info__vip-badge">
                    <image class="user-info__vip-badge-icon" :src="IMAGE_PATHS.ICONS_COMMON.VIP" mode="aspectFit" alt="" />
                    <text class="user-info__vip-badge-text">VIP{{ vipPlanName ? " · " + vipPlanName : "" }}</text>
                  </view>
                </view>
                <!-- 学校信息（APP 专属条件） -->
                <view class="user-info__school-row">
                  <image class="user-info__school-icon" :src="IMAGE_PATHS.ICONS_COMMON.GRADUATION_SVG" mode="aspectFit" alt="" />
                  <text class="user-info__school">{{ school }}</text>
                </view>
                <!-- 位置行（QQ 风格：家乡城市 → 未来城市） -->
                <view v-if="locationLabel" class="user-info__location-row">
                  <image class="user-info__location-icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
                  <text class="user-info__school">{{ locationLabel }}</text>
                </view>
                <!-- APP 专属标签胶囊行（学历 / 感情状态 / 未来规划，QQ 风格） -->
                <view v-if="showProfileTags" class="user-info__tags">
                  <text
                    v-for="(chip, idx) in profileTagChips" :key="idx"
                    class="user-info__chip"
                  >{{ chip }}</text>
                </view>
                <text class="user-info__bio">{{ bio }}</text>
              </view>
            </view>
          </view>

          <!-- Task F1 / M-08：按钮根据 isOwnProfile 切换（QQ 风格：资料卡底部整宽按钮） -->
          <!-- 自己的 profile：显示"编辑资料"按钮 -->
          <view v-if="isOwnProfile" class="edit-btn press-feedback" role="button" :aria-label="t('profile.editProfileAria')" @tap="goToProfileSetup" hover-class="edit-btn--hover" hover-stay-time="120">
            <image class="edit-btn__icon" :src="IMAGE_PATHS.ICONS_COMMON.EDIT" mode="aspectFit" alt="" />
            <text class="edit-btn__text">{{ t('profile.editProfile') }}</text>
          </view>
          <!-- 对方 profile：显示"打个招呼"按钮 -->
          <view v-else class="greet-btn press-feedback" role="button" :aria-label="t('profile.sayHiAria')" @tap="handleSayHi" hover-class="greet-btn--hover" hover-stay-time="120">
            <image class="greet-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.MESSAGE" mode="aspectFit" alt="" />
            <text class="greet-btn__text">{{ t('profile.sayHi') }}</text>
          </view>
        </view>

        <!-- 核心数据统计栏（QQ 主页改造方案：我喜欢的/喜欢我的🔒/最近来访🔒/获赞，点击进对应页） -->
        <view class="stats-bar">
          <view
            v-for="(stat, index) in stats"
            :key="index"
            class="stats-bar__item list-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="stat.label"
            @tap="handleStatTap(index)"
          >
            <view class="stats-bar__value-wrap">
              <text class="stats-bar__value">{{ stat.value }}</text>
              <!-- 付费解锁项：右上角小锁标识（QQ 主页方案） -->
              <view v-if="stat.locked" class="stats-bar__lock">
                <image class="stats-bar__lock-text" :src="IMAGE_PATHS.ICONS_EMOJI.LOCK" mode="aspectFit" alt="" />
              </view>
            </view>
            <text class="stats-bar__label">{{ stat.label }}</text>
          </view>
        </view>

        <!-- 成就卡片（2026-08-08 QQ 主页重构：匹配次数 / 喜欢次数 / 社交升温） -->
        <view class="achievement-card">
          <view class="section-header">
            <view class="section-header__left">
              <text class="section-header__title">{{ t('profile.achievementTitle') }}</text>
            </view>
          </view>
          <view class="achievement-card__grid">
            <view
              v-for="(item, index) in achievementStats" :key="index"
              class="achievement-card__item"
            >
              <image class="achievement-card__icon" :src="item.icon" mode="aspectFit" alt="" />
              <text class="achievement-card__value">{{ item.value }}</text>
              <text class="achievement-card__label">{{ item.label }}</text>
              <text class="achievement-card__hint">{{ item.hint }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== Phase Feedback5：语音介绍区块（最长 60s，替代个人视频；设计需求：仅语音，无视频） ==================== -->
      <view v-if="isOwnProfile" class="media-section">
        <view class="section-header">
          <view class="section-header__left">
            <text class="section-header__title">{{ t('profile.voiceStatus') }}</text>
            <view class="voice-only-tag">
              <text class="voice-only-tag__text">{{ t('profile.voiceOnlyTag') }}</text>
            </view>
            <text class="section-header__count">{{ t('profile.voiceStatusHint') }}</text>
          </view>
        </view>

        <!-- 未录制：CTA 引导录制（录音中切换为"录音中，点击停止"） -->
        <view
          v-if="!voiceStatusUrl"
          class="video-cta press-feedback"
          hover-class="video-cta--hover"
          hover-stay-time="120"
          role="button"
          :aria-label="t('profile.recordVoiceAria')"
          @tap="handleRecordVoice"
        >
          <view class="video-cta__icon-wrap" :class="{ 'video-cta__icon-wrap--recording': isRecordingVoice }">
            <image class="video-cta__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MICROPHONE" mode="aspectFit" alt="" />
          </view>
          <text class="video-cta__text">
            {{ isRecordingVoice ? t('profile.voiceRecording') : t('profile.voiceRecord') }}
          </text>
          <text class="video-cta__hint">
            {{ isRecordingVoice ? recordingLabel : t('profile.voiceStatusHint') }}
          </text>
        </view>

        <!-- 已录制：语音卡片 + 播放/删除 -->
        <view v-else class="voice-preview">
          <view class="voice-preview__card">
            <view
              class="voice-preview__play press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('profile.playVoiceAria')"
              @tap="handlePlayVoice"
            >
              <image class="voice-preview__play-icon" :src="isVoicePlaying ? IMAGE_PATHS.ICONS_COMMON.PAUSE_SVG : IMAGE_PATHS.ICONS_COMMON.PLAY_SVG" mode="aspectFit" alt="" />
            </view>
            <view class="voice-preview__info">
              <view class="voice-preview__wave">
                <view
                  v-for="(_, idx) in 12"
                  :key="idx"
                  class="voice-preview__bar"
                  :class="{ 'voice-preview__bar--active': isVoicePlaying }"
                  :style="{ height: (10 + ((idx * 7) % 18)) + 'rpx' }"
                />
              </view>
              <text class="voice-preview__duration">{{ voiceDurationLabel }}</text>
            </view>
            <view
              class="voice-preview__delete press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('profile.deleteVoiceAria')"
              @tap="handleRemoveVoice"
            >
              <text class="voice-preview__delete-text">{{ t('profile.delete') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== Task E3 / H-08：照片墙区块 ==================== -->
      <view v-if="isOwnProfile" class="media-section">
        <view class="section-header">
          <view class="section-header__left">
            <text class="section-header__title">{{ t('profile.photoWall') }}</text>
            <text class="section-header__count">{{ photoGallery.length }} / {{ PHOTO_GALLERY_MAX }}</text>
          </view>
        </view>

        <view class="photo-grid">
          <view
            v-for="cell in photoCells"
            :key="cell.index"
            class="photo-grid__cell"
          >
            <!-- 已上传：显示图片 + 长按删除（2026-08-08：pexels 外链本地化兜底） -->
            <view
              v-if="cell.filled"
              class="photo-grid__img-wrap"
              @longpress="handleRemovePhoto(cell.index)"
            >
              <image
                class="photo-grid__img"
                :src="toLocalImage(cell.url)"
                mode="aspectFill"
                lazy-load alt=""
              />
            </view>
            <!-- 空格子：显示"+"占位，点击上传 -->
            <view
              v-else
              class="photo-grid__add press-feedback"
              hover-class="photo-grid__add--hover"
              hover-stay-time="100"
              role="button"
              :aria-label="t('profile.uploadPhotoAria')"
              @tap="handleUploadPhoto(cell.index)"
            >
              <text class="photo-grid__add-icon">+</text>
              <text class="photo-grid__add-text">{{ t('profile.add') }}</text>
            </view>
          </view>
        </view>
      </view>

        <!-- VIP 卡片：仅会员功能开启时展示（Phase Feedback6：默认隐藏） -->
      <view v-if="featureFlags.membershipEnabled && !isVip" class="vip-card press-feedback card-base" role="button" :aria-label="t('profile.openVipAria')" @tap="handleVipClick" hover-class="vip-card--pressed" hover-stay-time="120">
        <view class="vip-card__left">
          <image class="vip-card__icon" :src="IMAGE_PATHS.ICONS_COMMON.VIP" mode="aspectFit" alt="" />
          <view class="vip-card__text-wrap">
            <text class="vip-card__title">{{ t('profile.openVip') }}</text>
            <text class="vip-card__desc">{{ t('profile.openVipDesc') }}</text>
          </view>
        </view>
        <view class="vip-card__btn">
          <text class="vip-card__btn-text">{{ t('profile.subscribeNow') }}</text>
        </view>
      </view>

      <!-- 社交升温进度 -->
      <view class="social-section">
        <SocialProgressIndicator />
      </view>

      <!-- 我的动态预览列表 -->
      <view class="my-posts-section">
        <view class="section-header">
          <view class="section-header__left">
            <text class="section-header__title">{{ t('profile.myPosts') }}</text>
            <text v-if="myPostsTotal > 0" class="section-header__count">{{ t('profile.postsCount', { n: myPostsTotal }) }}</text>
          </view>
          <view
            v-if="myPostsPreview.length > 0"
            class="section-header__more press-feedback"
            role="button"
            :aria-label="t('profile.viewAllPostsAria')"
            @tap="goToMyPosts"
            hover-class="section-header__more--hover"
            hover-stay-time="100"
          >
            <text class="section-header__more-text">{{ t('common.viewAll') }}</text>
            <text class="section-header__more-arrow">›</text>
          </view>
        </view>

        <!-- 动态列表（有数据时，QQ 空间说说卡片样式：时间→正文3行→配图横排→点赞评论） -->
        <view v-if="myPostsPreview.length > 0" class="my-posts-list" role="list">
          <view
            v-for="(post, index) in myPostsPreview"
            :key="post.id"
            class="my-post-item press-feedback"
            :class="{ 'my-post-item--no-border': index === myPostsPreview.length - 1 }"
            role="button"
            :aria-label="post.summary"
            @tap="handlePostTap(post.id)"
            hover-class="my-post-item--hover"
            hover-stay-time="100"
          >
            <!-- 说说头部：发布时间 + 更多 -->
            <view class="my-post-item__head">
              <text class="my-post-item__time">{{ post.timeLabel }}</text>
              <text class="my-post-item__more">⋯</text>
            </view>
            <!-- 说说正文（最多 3 行） -->
            <text class="my-post-item__summary">{{ post.summary }}</text>
            <!-- 配图缩略图（最多 3 张横排，有图才展示） -->
            <view v-if="post.images && post.images.length > 0" class="my-post-item__images">
              <image
                v-for="(img, imgIdx) in post.images.slice(0, 3)" :key="imgIdx"
                class="my-post-item__img"
                :src="img"
                mode="aspectFill"
                lazy-load
                alt=""
              />
            </view>
            <!-- 说说底部：点赞 / 评论 -->
            <view class="my-post-item__stats">
              <view class="my-post-item__stat">
                <image class="my-post-item__stat-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE" mode="aspectFit" lazy-load="true" alt="" />
                <text class="my-post-item__stat-text">{{ post.likes }}</text>
              </view>
              <view class="my-post-item__stat">
                <image class="my-post-item__stat-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.MESSAGE" mode="aspectFit" lazy-load="true" alt="" />
                <text class="my-post-item__stat-text">{{ post.comments }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view
          v-else
          class="my-posts-empty press-feedback"
          role="button"
          :aria-label="t('profile.publishFirstAria')"
          @tap="goToMyPosts"
          hover-class="my-posts-empty--hover"
          hover-stay-time="100"
        >
          <image class="my-posts-empty__icon" :src="IMAGE_PATHS.ICONS_COMMON.EDIT" mode="aspectFit" alt="" />
          <text class="my-posts-empty__text">{{ t('profile.noPosts') }}</text>
          <text class="my-posts-empty__action">{{ t('profile.publishFirst') }}</text>
        </view>
      </view>

      <!-- 核心功能列表区（QQ 主页改造方案） -->
      <view class="menu-group">
        <view
          v-for="(item, index) in menuItems"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === menuItems.length - 1 }"
          role="button"
          :aria-label="t('profile.menuItemAria', { label: item.label })"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <SafeImage
                :src="item.icon"
                custom-class="menu-item__icon-img"
                mode="aspectFit"
              />
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <!-- 右侧标注（领交友币/余额/得奖励） -->
          <text v-if="item.hint" class="menu-item__hint">{{ item.hint }}</text>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- 系统与隐私设置区（QQ 主页改造方案：核心隐私项单独突出） -->
      <view class="menu-group menu-group--settings">
        <view
          v-for="(item, index) in settingsMenuItems"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === settingsMenuItems.length - 1 }"
          role="button"
          :aria-label="t('profile.menuItemAria', { label: item.label })"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <SafeImage
                :src="item.icon"
                custom-class="menu-item__icon-img"
                mode="aspectFit"
              />
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- 底部菜单（关于） -->
      <view class="menu-group">
        <view
          v-for="(item, index) in bottomMenuItems"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === bottomMenuItems.length - 1 }"
          role="button"
          :aria-label="t('profile.menuItemAria', { label: item.label })"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <SafeImage
                :src="item.icon"
                custom-class="menu-item__icon-img"
                mode="aspectFit"
              />
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-btn press-feedback" role="button" :aria-label="t('profile.logoutAria')" @tap="handleLogout" hover-class="logout-btn--hover" hover-stay-time="100">
        <text class="logout-btn__text">{{ t('profile.logout') }}</text>
      </view>

      <!-- 底部版本信息 -->
      <view class="footer-version">
        <text class="footer-version__text">{{ appVersion }}</text>
      </view>

      <!-- [DEV-MODE] 开发者模式入口按钮 -->
      <view v-if="isDev" class="dev-entry press-feedback" role="button" :aria-label="t('profile.devEntryAria')" @tap="openAppPath('/pages/dev/index')" hover-class="dev-entry--hover" hover-stay-time="100">
        <text class="dev-entry__text">DEV</text>
      </view>

      <!-- Task F：全局发帖悬浮按钮（publish → 发帖编辑页） -->
      <GlobalPublishFab @publish="goToPublishTopic" />

      <!-- 底部安全区占位 -->
      <view class="safe-bottom" />
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.profile-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-gradient-page);
  box-sizing: border-box;
  position: relative;
}

/* ==================== 顶部浪漫渐变背景 ==================== */
.profile-header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 520rpx;
  background: var(--c-gradient-brand);
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.header-bg__deco {
  position: absolute;
  border-radius: var(--r-full);
  opacity: 0.15;
  background: var(--c-neutral-0);

  &--1 {
    width: 300rpx;
    height: 300rpx;
    top: -100rpx;
    right: -80rpx;
  }

  &--2 {
    width: 200rpx;
    height: 200rpx;
    top: 60rpx;
    left: -60rpx;
  }

  &--3 {
    width: 120rpx;
    height: 120rpx;
    top: 180rpx;
    right: 60rpx;
  }
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(constant(safe-area-inset-top) + var(--sp-5));
  height: calc(env(safe-area-inset-top) + var(--sp-5));
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.safe-bottom {
  height: calc(constant(safe-area-inset-bottom) + var(--sp-6));
  height: calc(env(safe-area-inset-bottom) + var(--sp-6));
  flex-shrink: 0;
}

/* ==================== 个人信息区 ==================== */
.profile-info {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
}

/* QQ 名片卡（2026-08-08）：白色资料卡骑封面下缘，头像/信息/整宽按钮均位于卡内 */
.profile-head-card {
  position: relative;
  z-index: 2;
  margin: calc(var(--profile-avatar-size) * -0.5) var(--sp-7) 0;
  padding: var(--sp-7) var(--sp-8) var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

/* 头像 + 信息 横排布局（左圆形头像，右昵称/标签/签名） */
.profile-info__main {
  display: flex;
  align-items: center;
  gap: 28rpx;
  width: 100%;
  padding: 0;
}

.profile-info__right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-3);
}

/* 头像容器（QQ 名片卡：位于资料卡内，不再负 margin 骑封面） */
.avatar-wrap {
  position: relative;
  z-index: 2;
  margin: 0;
  flex-shrink: 0;
}

/* 语音介绍「仅语音 · 无视频」标注（设计需求） */
.voice-only-tag {
  padding: 4rpx 14rpx;
  border-radius: var(--r-full);
  background: var(--c-brand-50, #f0fdf9);
  border: 1rpx solid var(--c-brand-200, #99f6e0);
}

.voice-only-tag__text {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-brand-600, #0d9488);
}

/* 顶部背景图（Phase D4 · 可配置，默认品牌色渐变）
   2026-08-08 QQ 主页风格：widthFix 完整展示背景（下拉可看全图），
   min-height 兜底保证无背景图/加载中也有品牌渐变底色 */
.profile-bg {
  position: relative;
  width: 100%;
  min-height: var(--profile-bg-height);
  background: var(--c-gradient-brand);
  overflow: hidden;
  flex-shrink: 0;
}

.profile-bg__img {
  width: 100%;
  display: block;
}

/* 2026-08-08：改为半透明渐变（QQ 封面风格），背景图完整透出，底部轻微压暗保证可读性 */
.profile-bg__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 45%, rgba(15, 23, 42, 0.32) 100%);
  pointer-events: none;
}

/* Phase E1 / H-10：编辑背景图按钮（右下角相机图标，半透明白底胶囊） */
.profile-bg__edit {
  position: absolute;
  right: var(--sp-5);
  bottom: var(--sp-4);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-3);
  background: var(--c-overlay-mid);
  border-radius: var(--r-full);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);

  &--hover {
    transform: scale(0.96);
    background: var(--c-overlay-strong);
  }
}

.profile-bg__edit-icon {
  width: 28rpx;
  height: 28rpx;
}

.profile-bg__edit-text {
  font-size: var(--fs-xs);
  color: var(--c-neutral-0);
  font-weight: 500;
  line-height: 1;
}

.profile-bg__edit-spinner {
  width: 28rpx;
  height: 28rpx;
  border-radius: var(--r-full);
  border: 3rpx solid var(--c-overlay-white-bg-stronger);
  border-top-color: var(--c-neutral-0);
  animation: profile-bg-spin var(--d-spinner, 800ms) linear infinite;
}

@keyframes profile-bg-spin {
  to { transform: rotate(360deg); }
}

.profile-bg__loading {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-overlay-mid-strong);
}

.profile-bg__loading-text {
  font-size: var(--fs-md);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* 未完善资料：完善引导横幅（2026-08-07 链路调整） */
.profile-complete-banner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: calc(env(safe-area-inset-top) + var(--sp-5)) var(--sp-5) 0;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-brand-50);
  border: 1rpx solid var(--c-brand-200);
}

.profile-complete-banner__text {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}

.profile-complete-banner__action {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-brand-700);
}

.profile-complete-banner__arrow {
  font-size: var(--fs-xl);
  color: var(--c-brand-600);
  line-height: 1;
}

/* 顶部右上角 chip 容器（Phase C1） */
.profile-top-bar {
  position: absolute;
  top: calc(constant(safe-area-inset-top) + var(--sp-5));
  top: calc(env(safe-area-inset-top) + var(--sp-5));
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-4);
  padding: 0 var(--sp-7);
  width: 100%;
  box-sizing: border-box;
}

/* 顶部右上角退出登录按钮（64rpx 点击热区，置于 chip 左侧） */
.profile-logout {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 12;
  transition: transform var(--d-fast, 120ms) ease;
}

.profile-logout__icon {
  width: 36rpx;
  height: 36rpx;
}

/* 顶部右上角操作按钮组（分享 + 退出） */
.profile-top-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

/* 空间分享按钮（2026-08-08 QQ 主页重构：mp-weixin button 原生分享，重置默认样式） */
.profile-share {
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-light);
  border: none;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 12;
  transition: transform var(--d-fast, 120ms) ease;
  overflow: hidden;

  &::after {
    border: none;
  }

  &--hover {
    transform: scale(0.92);
    background: var(--c-overlay-bg-light-strong);
  }
}

.profile-share__icon {
  width: 36rpx;
  height: 36rpx;
  display: block;
}

/* 2026-08-07：头像右上角相机小标（自己主页可编辑） */
.avatar-camera {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--c-brand-500);
  border: 4rpx solid var(--c-neutral-0);
  box-shadow: var(--s-sm);
}

.avatar-camera__icon {
  width: 28rpx;
  height: 28rpx;
}

.avatar-camera__spinner {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  border: 4rpx solid var(--c-overlay-border-stronger, rgba(255, 255, 255, 0.4));
  border-top-color: var(--c-neutral-0, #ffffff);
  animation: avatar-camera-spin 800ms linear infinite;
}

@keyframes avatar-camera-spin {
  to {
    transform: rotate(360deg);
  }
}

/* P3 修复：复用 _components.scss 的 .base-avatar 设计令牌，避免与 Avatar.vue 重复定义
   共享样式位置：src/styles/_components.scss
   2026-08-08：头像框由 AvatarFrame 组件承载（白框/渐变环/角标），此处仅保留圆形头像本体 */
.avatar {
  width: var(--profile-avatar-size);
  height: var(--profile-avatar-size);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  z-index: 2;
}

.avatar__img {
  width: 100%;
  height: 100%;
}

.avatar__text {
  font-size: var(--fs-6xl);
  font-weight: 700;
  color: var(--c-neutral-0);
  line-height: 1;
}

/* 用户信息（设计需求：位于头像右侧，左对齐） */
.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: var(--sp-2);
}

/* 昵称行（昵称 + 标签 + 认证 + VIP 徽章；允许换行避免溢出） */
.user-info__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2) var(--sp-3);
  margin-bottom: var(--sp-2);
}

.user-info__name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-shadow: none;
}

/* QQ 风格标签胶囊（性别·年级 / 学历 / 感情状态 / 未来规划） */
.user-info__chip {
  padding: 4rpx 16rpx;
  border-radius: var(--r-full);
  background: var(--c-brand-50, #f0fdf9);
  border: 1rpx solid var(--c-brand-200, #99f6e0);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-brand-600, #0d9488);
  line-height: 1.4;
  flex-shrink: 0;
}

/* 标签胶囊行 */
.user-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
}

/* 位置行（QQ 风格：家乡 → 未来城市） */
.user-info__location-row {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-bottom: var(--sp-2);
}

.user-info__location-icon {
  width: 28rpx;
  height: 28rpx;
}

/* VIP 徽章 */
.user-info__vip-badge {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-3);
  background: var(--c-gradient-vip);
  border-radius: var(--r-full);
  box-shadow: var(--s-vip);
}

.user-info__vip-badge-icon {
  width: 24rpx;
  height: 24rpx;
  line-height: 1;
}

.user-info__vip-badge-text {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-vip);
  line-height: 1;
}

/* 学校信息行（白卡上浅灰胶囊 + 深色字） */
.user-info__school-row {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-bottom: var(--sp-2);
  padding: var(--sp-1) var(--sp-4);
  background: var(--c-neutral-50);
  border-radius: var(--r-full);
}

.user-info__school-icon {
  /* 修复：png 图标未设宽高会按原图尺寸渲染，导致顶部出现超大图标；
     改用 SVG 变体并固定 28rpx 尺寸 */
  width: 28rpx;
  height: 28rpx;
  line-height: 1;
}

.user-info__school {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info__bio {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  max-width: 460rpx;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 编辑资料按钮（QQ 名片卡底部整宽） */
.edit-btn {
  position: relative;
  /* 修复：z-index 提升到 3，避免被上层元素（头像区域等）遮挡导致无法点击 */
  z-index: 3;
  width: 100%;
  margin-top: var(--sp-7);
  padding: var(--sp-4) var(--sp-11);
  min-height: 88rpx;
  background: var(--c-brand-50);
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-brand-500);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  box-sizing: border-box;

  &--hover {
    transform: scale(0.96);
    background: var(--c-brand-100);
  }
}

/* 打个招呼按钮（对方 profile，QQ 名片卡底部整宽，品牌色填充） */
.greet-btn {
  position: relative;
  z-index: 3;
  width: 100%;
  margin-top: var(--sp-7);
  padding: var(--sp-4) var(--sp-11);
  min-height: 88rpx;
  background: var(--c-gradient-brand);
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  box-sizing: border-box;

  &--hover {
    transform: scale(0.96);
    filter: brightness(0.95);
  }
}

.greet-btn__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.greet-btn__text {
  font-size: var(--fs-md);
  /* 品牌渐变底上文字保持白色（品牌色深色下不变） */
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

.edit-btn__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.edit-btn__text {
  font-size: var(--fs-md);
  color: var(--c-brand-500);
  font-weight: 600;
}

/* 数据统计栏 */
.stats-bar {
  display: flex;
  width: 100%;
  max-width: 500rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-4);
  margin: var(--sp-5) var(--sp-7) 0;
  box-sizing: border-box;
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

/* ==================== 成就卡片（2026-08-08 QQ 主页重构） ==================== */
.achievement-card {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: var(--sp-5) var(--sp-7) 0;
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  overflow: hidden;
  box-sizing: border-box;
}

.achievement-card__grid {
  display: flex;
  padding: 0 var(--sp-4) var(--sp-6);
}

.achievement-card__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: var(--sp-2) 0;
}

.achievement-card__icon {
  width: 56rpx;
  height: 56rpx;
}

.achievement-card__value {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.2;
}

.achievement-card__label {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
  font-weight: 500;
}

.achievement-card__hint {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.stats-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

/* 数字 + 小锁（QQ 主页方案：付费解锁项右上角锁标识） */
.stats-bar__value-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.stats-bar__value {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1;
}

.stats-bar__lock {
  position: absolute;
  top: -14rpx;
  right: -26rpx;
  width: 30rpx;
  height: 30rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-neutral-200);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-bar__lock-text {
  width: 20rpx;
  height: 20rpx;
}

.stats-bar__label {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

/* ==================== Phase E2 / E3：媒体区块（个人视频 + 照片墙） ==================== */
.media-section {
  position: relative;
  z-index: 1;
  margin: 0 var(--sp-7) var(--sp-6);
  padding: var(--sp-6) var(--sp-8) var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

/* 个人视频 CTA（未上传态） */
.video-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-9) var(--sp-6);
  border-radius: var(--r-lg);
  border: 2rpx dashed var(--c-brand-200);
  background: var(--c-bg-brand);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);

  &--hover {
    transform: scale(0.98);
    background: var(--c-bg-secondary);
  }
}

.video-cta__icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-sm);
}

/* P2.6：录音中红色呼吸灯提示（真实 RecorderManager 录制态） */
.video-cta__icon-wrap--recording {
  animation: video-cta-pulse 1s ease-in-out infinite;
}

@keyframes video-cta-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35); }
  50% { box-shadow: 0 0 0 12rpx rgba(244, 63, 94, 0); }
}

.video-cta__icon {
  width: 48rpx;
  height: 48rpx;
}

.video-cta__spinner {
  width: 48rpx;
  height: 48rpx;
  border-radius: var(--r-full);
  border: 4rpx solid var(--c-brand-100);
  border-top-color: var(--c-brand-500);
  animation: video-cta-spin var(--d-spinner, 800ms) linear infinite;
}

@keyframes video-cta-spin {
  to { transform: rotate(360deg); }
}

.video-cta__text {
  font-size: var(--fs-md);
  color: var(--c-brand-700);
  font-weight: 600;
}

.video-cta__hint {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* 个人视频预览（已上传态） */
.video-preview {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.video-preview__thumb {
  position: relative;
  width: 100%;
  height: 360rpx;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--c-neutral-900);
}

.video-preview__thumb-img {
  width: 100%;
  height: 100%;
  display: block;
}

.video-preview__play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-mid);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-preview__play-triangle {
  width: 0;
  height: 0;
  border-left: 28rpx solid var(--c-neutral-0);
  border-top: 18rpx solid transparent;
  border-bottom: 18rpx solid transparent;
  margin-left: 8rpx;
}

.video-preview__actions {
  display: flex;
  gap: var(--sp-3);
}

.video-preview__action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-3) 0;
  border-radius: var(--r-lg);
  border: 2rpx solid var(--c-border-default);
  background: var(--c-neutral-0);

  &--hover {
    transform: scale(0.98);
    background: var(--c-neutral-50);
  }

  &--delete {
    border-color: var(--s-action-error);
  }
}

.video-preview__action-text {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  font-weight: 500;

  &--danger {
    color: var(--c-error);
  }
}

/* Phase Feedback5：语音状态卡片样式 */
.voice-preview__card {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl);
  background: var(--c-brand-bg-tint, #e6f9f0);
  border: 1rpx solid var(--c-brand-border-tint, #b7ecd8);
}

.voice-preview__play {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-gradient-brand, linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.voice-preview__play-icon {
  width: 32rpx;
  height: 32rpx;
}

.voice-preview__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.voice-preview__wave {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 32rpx;
}

.voice-preview__bar {
  width: 6rpx;
  border-radius: var(--r-sm, 8rpx);
  background: var(--c-brand-300, #9be8c8);
  transition: height var(--d-normal, 200ms) ease;
}

.voice-preview__bar--active {
  background: var(--c-brand-500, #3fcf8e);
}

.voice-preview__duration {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-brand-600, #2db97a);
  font-weight: 600;
}

.voice-preview__delete {
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-bg-container, #ffffff);
}

.voice-preview__delete-text {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-error, #e5454d);
  font-weight: 600;
}

/* 照片墙 3x2 网格 - mp-weixin 不支持 display:grid，改用 Flexbox + 子元素 width: calc */
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.photo-grid__cell {
  position: relative;
  /* 3 列布局：每行 3 张，gap var(--sp-2) 共 2 个间隙 → width = calc((100% - 2*sp-2) / 3) */
  width: calc((100% - 2 * var(--sp-2)) / 3);
  /* mp-weixin 不支持 aspect-ratio，改用 padding-bottom 百分比（1:1 → 100%） */
  padding-bottom: calc((100% - 2 * var(--sp-2)) / 3);
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--c-neutral-50);
  box-sizing: border-box;
}

.photo-grid__img-wrap {
  position: absolute;
  inset: 0;
}

.photo-grid__img {
  width: 100%;
  height: 100%;
  display: block;
}

.photo-grid__add {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  border: 2rpx dashed var(--c-border-default);
  border-radius: var(--r-md);
  background: var(--c-neutral-50);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);

  &--hover {
    transform: scale(0.96);
    background: var(--c-neutral-100);
    border-color: var(--c-brand-200);
  }
}

.photo-grid__add-icon {
  font-size: var(--fs-4xl);
  color: var(--c-text-quaternary);
  font-weight: 300;
  line-height: 1;
}

.photo-grid__add-text {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ==================== VIP卡片 ==================== */
/* 暖金渐变 + 白字 + 立即续费白描边按钮 */
.vip-card {
  position: relative;
  z-index: 1;
  margin: 0 var(--sp-7) var(--sp-6);
  padding: var(--sp-7) var(--sp-8);
  background: var(--c-gradient-vip);
  border-radius: var(--r-xl);
  box-shadow: var(--s-vip);
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  border: var(--c-border-card);

  &--pressed {
    transform: scale(0.98);
    box-shadow: var(--s-sm);
  }
}

.vip-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
}

.vip-card__icon {
  /* 修复：png 图标未设宽高会按原图尺寸渲染为超大图标，固定 56rpx 尺寸 */
  width: 56rpx;
  height: 56rpx;
  filter: drop-shadow(0 var(--sp-1) var(--sp-2) var(--c-black-shadow-lg));
}

.vip-card__text-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.vip-card__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  /* 白字 —— 在暖金渐变底上保证对比度 */
  color: var(--c-text-inverse);
}

.vip-card__desc {
  font-size: var(--fs-sm);
  /* 半透明白字 */
  color: var(--c-overlay-text-secondary);
}

.vip-card__btn {
  padding: var(--sp-3) var(--sp-7);
  /* 白描边按钮：透明底 + 2rpx 白边 */
  background: transparent;
  border: 2rpx solid var(--c-text-inverse);
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.vip-card__btn-text {
  font-size: var(--fs-base);
  /* 白字 */
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ==================== 社交升温进度 ==================== */
.social-section {
  position: relative;
  z-index: 1;
  margin: 0 var(--sp-7) var(--sp-6);
}

/* ==================== 我的动态预览列表 ==================== */
.my-posts-section {
  position: relative;
  z-index: 1;
  margin: 0 var(--sp-7) var(--sp-6);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  overflow: hidden;
  border: var(--c-border-card);
}

/* 区块标题行 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-6) var(--sp-8) var(--sp-4);
}

.section-header__left {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}

.section-header__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.section-header__count {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.section-header__more {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-full);

  &--hover {
    background: var(--c-neutral-50);
    transform: scale(0.96);
  }
}

.section-header__more-text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

.section-header__more-arrow {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  line-height: 1;
}

/* 动态列表 */
.my-posts-list {
  padding: 0 var(--sp-8);
}

.my-post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) 0;
  border-bottom: 1rpx solid var(--c-neutral-50);

  &--no-border {
    border-bottom: none;
    padding-bottom: var(--sp-6);
  }

  &--hover {
    transform: scale(0.98);
    background: var(--c-neutral-50);
  }
}

.my-post-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
  margin-right: var(--sp-4);
}

.my-post-item__summary {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  /* QQ 说说卡片：正文最多展示 3 行 */
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-all;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 4.5em;
  /* #endif */
}

/* QQ 说说卡片：头部（发布时间 + 更多） */
.my-post-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.my-post-item__time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.my-post-item__more {
  font-size: var(--fs-2xl);
  color: var(--c-neutral-300);
  line-height: 1;
  padding: 0 var(--sp-2);
}

/* QQ 说说卡片：配图缩略图（最多 3 张横排） */
.my-post-item__images {
  display: flex;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
}

.my-post-item__img {
  width: 200rpx;
  height: 200rpx;
  border-radius: var(--r-md);
  background: var(--c-bg-page);
}

.my-post-item__stats {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  margin-top: var(--sp-1);
}

.my-post-item__stat {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.my-post-item__stat-icon {
  width: 28rpx;
  height: 28rpx;
}

.my-post-item__arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-300);
  font-weight: 300;
  line-height: 1;
  flex-shrink: 0;
}

/* 空状态 */
.my-posts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-10) var(--sp-8);

  &--hover {
    transform: scale(0.98);
    background: var(--c-neutral-50);
  }
}

.my-posts-empty__icon {
  /* 修复：原 font-size 对 image 元素无效，png 会按原图尺寸渲染为超大图标；
     固定 56rpx 尺寸 */
  width: 56rpx;
  height: 56rpx;
}

.my-posts-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
}

.my-posts-empty__action {
  font-size: var(--fs-base);
  color: var(--c-brand);
  font-weight: 500;
}

/* ==================== 功能菜单分组 ==================== */
.menu-group {
  position: relative;
  z-index: 1;
  margin: 0 var(--sp-7) var(--sp-6);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  overflow: hidden;
  border: var(--c-border-card);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-7) var(--sp-8);
  border-bottom: 1rpx solid var(--c-neutral-50);

  &--no-border {
    border-bottom: none;
  }

  &--hover {
    transform: scale(0.98);
    background: var(--c-neutral-50);
  }
}

.menu-item__left {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
}

.menu-item__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-item__icon-img {
  width: 44rpx;
  height: 44rpx;
}

.menu-item__label {
  font-size: var(--fs-xl);
  color: var(--c-text-primary);
  font-weight: 500;
}

/* 右侧标注（领交友币/余额/得奖励） */
.menu-item__hint {
  font-size: var(--fs-sm);
  color: var(--c-brand-600, #0d9488);
  background: var(--c-brand-50, #f0fdf9);
  padding: 4rpx 14rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.menu-item__arrow {
  font-size: var(--fs-5xl);
  color: var(--c-neutral-300);
  font-weight: 300;
  line-height: 1;
  flex-shrink: 0;
}

/* ==================== 退出登录 ==================== */
.logout-btn {
  position: relative;
  z-index: 1;
  margin: 0 var(--sp-7) var(--sp-6);
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--c-border-card);

  &--hover {
    transform: scale(0.98);
    background: var(--c-neutral-50);
  }
}

.logout-btn__text {
  font-size: var(--fs-xl);
  color: var(--c-error);
  font-weight: 500;
}

/* ==================== 底部版本信息 ==================== */
.footer-version {
  display: flex;
  justify-content: center;
  padding: var(--sp-4) 0 var(--sp-8);
  position: relative;
  z-index: 1;
}

.footer-version__text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ==================== [DEV-MODE] 开发者入口 ==================== */
.dev-entry {
  display: flex;
  justify-content: center;
  padding: var(--sp-6) 0;
  position: relative;
  z-index: 1;
}

.dev-entry--hover {
  opacity: 0.6;
}

.dev-entry__text {
  font-size: var(--fs-base);
  font-weight: 800;
  color: var(--c-neutral-0);
  background: var(--c-error);
  padding: var(--sp-2) var(--sp-8);
  border-radius: var(--r-md);
  letter-spacing: var(--sp-1);
}
</style>
