<script setup lang="ts">
/**
 * 个人中心 - 我的
 * 展示用户头像、昵称、学校、签名、VIP 状态、我的动态、数据统计、资料完善度、社交升温进度、功能菜单入口
 * 资料未完善时展示 LockScreen 锁定页面
 */
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useSessionStore } from "../../stores/session";
import { useProfileStore } from "../../stores/profile";
import { useSocialProgressStore } from "../../stores/social-progress";
import { useDiscoverStore } from "../../stores/discover";
import { isDev } from "../../services/env";
import { openAppPath } from "../../utils/navigation";
import { toProfileView } from "../../view-models/profile";
import LockScreen from "../../components/common/LockScreen.vue";
import SocialProgressIndicator from "../../components/social/SocialProgressIndicator.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import MatchCountChip from "../../components/common/MatchCountChip.vue";
import VerificationBadge from "../../components/common/VerificationBadge.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic, successHaptic } from "../../utils/haptic";

/**
 * 从 uni.chooseImage / chooseVideo 返回值构造类 File 对象。
 *
 * 兼容 H5（File 标准）与 mp-weixin（tempFilePaths + path 字段）双端：
 * - H5：uni.chooseImage 返回 tempFiles，每项是标准 File，可直接传给 uploadFile
 * - mp-weixin：tempFiles 仅含 path/size，无 name 字段，包装为 File-like
 *
 * @param filePath - 文件路径（tempFilePath）
 * @param size - 文件大小（字节）
 * @returns 类 File 对象（含 name/path/size 字段，满足 clientApi 上传签名）
 */
function buildFileLike(filePath: string, size: number): File {
  // H5 端可直接构造 File 对象
  if (typeof File !== "undefined") {
    try {
      // 从路径中提取文件名
      const name = filePath.split("/").pop() || "upload";
      // H5 端 filePath 实际是 blob: URL，无法直接 fetch 转换为 File；
      // 这里构造一个类 File 对象，由 uploadFileViaUni 通过 path 字段处理
      const fileLike = { name, size, type: "application/octet-stream", path: filePath } as unknown as File;
      return fileLike;
    } catch (_e) {
      // 忽略，走兜底
    }
  }
  // mp-weixin：构造类 File 对象，挂 path 字段
  const name = filePath.split("/").pop() || "upload";
  return { name, size, type: "application/octet-stream", path: filePath } as unknown as File;
}

/**
 * 认证徽章级别类型（与 VerificationBadge 组件 props 对齐）
 */
type VerificationBadgeLevel = "none" | "school" | "email" | "idcard";

const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const socialProgressStore = useSocialProgressStore();
const discoverStore = useDiscoverStore();

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
 * 照片墙 + 个人视频状态（Phase E2 / E3）
 * 从 profile store 获取，上传/删除后响应式更新
 */
const { photoGallery, personalVideoUrl } = storeToRefs(profileStore);

/**
 * 上传状态（Phase E1 / E2 / E3 共用）
 * - isUploading: 是否正在上传中（控制 loading 蒙层显示）
 * - uploadProgress: 上传进度文案（如 "上传中..." / "删除中..."）
 * - uploadKind: 当前上传类型，用于在 UI 中精确控制蒙层位置
 */
type UploadKind = "background" | "video" | "photo" | null;
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
const hasPhotos = computed(() => photoGallery.value.length > 0);

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
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    // mp-weixin 端：参数挂在 options；H5 端：可通过 $page.options 获取
    const options = (currentPage as any)?.options || (currentPage as any)?.$page?.options || {};
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

/** 资料是否已完善（三个硬门槛全部完成） */
const isUnlocked = computed(() => sessionStore.isProfileComplete);

/** 完善度百分比（0-100） */
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
  })
);

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
}

const stats = computed<StatItem[]>(() => {
  const s = profileStore.profileStats;
  return [
    { label: "关注", value: s?.followingCount ?? 0 },
    { label: "粉丝", value: s?.followersCount ?? 0 },
    { label: "获赞", value: s?.likesCount ?? 0 },
  ];
});

/**
 * 功能菜单项配置
 * 使用 IMAGE_PATHS 图标 + 同色系浅色背景（emoji 作为 fallback）
 */
interface MenuItem {
  emoji: string;
  icon?: string;
  bgColor: string;
  label: string;
  path?: string;
  action?: () => void;
}

const menuItems = computed<MenuItem[]>(() => [
  {
    emoji: "💝",
    icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
    bgColor: "#FFF0F5",
    label: "我的动态",
    path: "/pages/village/index?tab=mine",
  },
  {
    emoji: "⭐",
    icon: IMAGE_PATHS.ICONS_PROFILE.FAVORITES,
    bgColor: "#FFF8E7",
    label: "我的喜欢",
    path: "/pages/likes/index?tab=likedBy",
  },
  {
    emoji: "💕",
    icon: IMAGE_PATHS.ICONS_PROFILE.MATCHES,
    bgColor: "#FFE8EC",
    label: "我的匹配",
    path: "/pages/likes/index",
  },
  {
    emoji: "👀",
    icon: IMAGE_PATHS.ICONS_PROFILE.VISITORS,
    bgColor: "#E8F8F0",
    label: "访客记录",
    path: "/pages/likes/index?tab=visitors",
  },
  {
    emoji: "✅",
    icon: IMAGE_PATHS.ICONS_PROFILE.VERIFICATION,
    bgColor: "#E8F4FF",
    label: "恋爱认证",
    path: "/pages/verification/index",
  },
  {
    emoji: "🔬",
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "#F3E8FF",
    label: "情感实验室",
    path: "/pages/circles/index",
  },
  {
    emoji: "",
    icon: IMAGE_PATHS.ICONS_EMOJI.CHAT,
    bgColor: "#E0F2FE",
    label: "意见反馈",
    path: "/subpackages/support/feedback/index",
  },
  {
    emoji: "📤",
    icon: IMAGE_PATHS.ICONS_PROFILE.SHARE,
    bgColor: "#EDE9FE",
    label: "推荐给好友",
    action: () => {
      uni.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"],
      });
    },
  },
]);

const bottomMenuItems = computed<MenuItem[]>(() => [
  {
    emoji: "⚙️",
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "#F4F6FA",
    label: "设置",
    path: "/pages/settings/index",
  },
  {
    emoji: "ℹ️",
    icon: IMAGE_PATHS.ICONS_PROFILE.INFO,
    bgColor: "#F4F6FA",
    label: "关于我们",
    action: () => {
      lightHaptic();
      uni.showModal({
        title: "关于校园恋爱",
        content:
          "校园恋爱 · 遇见你的那个TA\n\n在这里，遇见同频的人，开启一段双向奔赴的校园故事。",
        showCancel: false,
        confirmText: "知道了",
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
    openAppPath(item.path);
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
 * Task F1 / M-08：对对方 profile 发起"打个招呼"
 * - 触发成功振动反馈
 * - 跳转到与该用户的私聊会话页（带 targetUserId 参数）
 */
function handleSayHi() {
  successHaptic();
  const userId = targetUserId.value;
  if (!userId) return;
  openAppPath(`/pages/chat-session/index?targetUserId=${encodeURIComponent(userId)}`);
}

/**
 * VIP开通点击 - 跳转到 VIP 开通页
 */
function handleVipClick() {
  lightHaptic();
  openAppPath("/pages/vip/index");
}

/**
 * 查看我的动态全部（跳转到村口「我的」分区）
 */
function goToMyPosts() {
  lightHaptic();
  openAppPath("/pages/village/index?tab=mine");
}

/**
 * 点击单条动态预览项（跳转到村口「我的」分区，简化处理）
 * @param postId - 帖子 ID（保留参数，便于后续接入详情页）
 */
function handlePostTap(_postId: string) {
  lightHaptic();
  openAppPath("/pages/village/index?tab=mine");
}

/** 退出登录 */
function handleLogout() {
  lightHaptic();
  uni.showModal({
    title: "提示",
    content: "确定要退出登录吗？",
    success: (res) => {
      if (res.confirm) {
        sessionStore.userSession = null;
        uni.reLaunch({ url: "/pages/login/index" });
      }
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
 */
function handleEditBackground() {
  if (isUploading.value) return;
  lightHaptic();
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      const tempFile = res.tempFiles?.[0];
      const size = (tempFile as { size?: number })?.size ?? 0;
      if (!tempPath) {
        uni.showToast({ title: "未选择图片", icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath, size);
      void uploadBackground(file);
    },
    fail: (err) => {
      // 用户取消选择时不报错（errMsg 含 cancel）
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: "选择图片失败", icon: "none" });
      }
    },
  });
}

/**
 * 实际执行背景图上传（与 chooseImage 解耦，便于测试）
 */
async function uploadBackground(file: File) {
  isUploading.value = true;
  uploadKind.value = "background";
  uploadProgress.value = "上传中...";
  try {
    await profileStore.uploadBackground(file);
    successHaptic();
    uni.showToast({ title: "背景已更新", icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isUploading.value = false;
    uploadKind.value = null;
    uploadProgress.value = "";
  }
}

/**
 * Task E2 / M-11：点击"上传个人视频"CTA 触发视频选择 + 上传。
 *
 * 流程：
 * 1. uni.chooseVideo 选择相册中的视频（maxDuration 60s，camera: back）
 * 2. 构造类 File 对象
 * 3. 调用 profileStore.uploadVideo 上传 + 更新本地状态
 */
function handleUploadVideo() {
  if (isUploading.value) return;
  lightHaptic();
  uni.chooseVideo({
    maxDuration: 60,
    sourceType: ["album"],
    camera: "back",
    success: (res) => {
      const tempPath = res.tempFilePath ?? "";
      const size = res.size ?? 0;
      if (!tempPath) {
        uni.showToast({ title: "未选择视频", icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath, size);
      void uploadVideo(file);
    },
    fail: (err) => {
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: "选择视频失败", icon: "none" });
      }
    },
  });
}

/**
 * 实际执行个人视频上传
 */
async function uploadVideo(file: File) {
  isUploading.value = true;
  uploadKind.value = "video";
  uploadProgress.value = "上传中...";
  try {
    await profileStore.uploadVideo(file);
    successHaptic();
    uni.showToast({ title: "视频已上传", icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isUploading.value = false;
    uploadKind.value = null;
    uploadProgress.value = "";
  }
}

/**
 * Task E2 / M-11：点击个人视频播放图标跳转全屏播放页。
 */
function handlePlayVideo() {
  if (!personalVideoUrl.value) return;
  lightHaptic();
  const url = `/pages/discover/video-player?videoUrl=${encodeURIComponent(personalVideoUrl.value)}`;
  openAppPath(url);
}

/**
 * Task E2 / M-11：点击个人视频删除按钮。
 * 二次确认后调用 profileStore.removeVideo 清空本地状态。
 */
function handleRemoveVideo() {
  if (isUploading.value) return;
  lightHaptic();
  uni.showModal({
    title: "删除个人视频",
    content: "确定删除当前个人视频吗？",
    confirmText: "删除",
    confirmColor: "#E5454D",
    success: async (res) => {
      if (!res.confirm) return;
      isUploading.value = true;
      uploadKind.value = "video";
      uploadProgress.value = "删除中...";
      try {
        await profileStore.removeVideo();
        successHaptic();
        uni.showToast({ title: "已删除", icon: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "删除失败";
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
 * Task E3 / H-08：点击照片墙空格子触发图片选择 + 上传到指定索引。
 * @param index - 目标索引（0-5），应为当前 photoGallery.length
 */
function handleUploadPhoto(index: number) {
  if (isUploading.value) return;
  if (index < 0 || index >= PHOTO_GALLERY_MAX) return;
  lightHaptic();
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      const tempFile = res.tempFiles?.[0];
      const size = (tempFile as { size?: number })?.size ?? 0;
      if (!tempPath) {
        uni.showToast({ title: "未选择图片", icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath, size);
      void uploadPhoto(file, index);
    },
    fail: (err) => {
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: "选择图片失败", icon: "none" });
      }
    },
  });
}

/**
 * 实际执行照片墙上传
 */
async function uploadPhoto(file: File, index: number) {
  isUploading.value = true;
  uploadKind.value = "photo";
  uploadProgress.value = "上传中...";
  try {
    await profileStore.uploadPhotoAtIndex(file, index);
    successHaptic();
    uni.showToast({ title: "照片已添加", icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
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
    title: "删除照片",
    content: "确定删除这张照片吗？",
    confirmText: "删除",
    confirmColor: "#E5454D",
    success: async (res) => {
      if (!res.confirm) return;
      isUploading.value = true;
      uploadKind.value = "photo";
      uploadProgress.value = "删除中...";
      try {
        await profileStore.removePhotoAtIndex(index);
        successHaptic();
        uni.showToast({ title: "已删除", icon: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "删除失败";
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
    const v = (import.meta as any).env?.VITE_APP_VERSION;
    return typeof v === "string" && v.length > 0 ? v : "v1.0.0";
  } catch (_e) {
    return "v1.0.0";
  }
})();

/** 是否为开发环境（从 env.ts 导入，mp-weixin 安全） */
// isDev 已从 services/env 导入

/**
 * 页面显示时拉取个人主页数据
 * 修复：原仅 onMounted 调用 loadStats，切换 Tab 返回不刷新；
 * 现通过 onShow 调用 fetchProfile（包含 basic/campus/schedule/stats/vip/posts），
 * 确保每次进入个人主页都拿到最新数据。社交升温进度同步刷新。
 *
 * Task F1 / M-08：同时刷新页面 userId 参数，支持查看对方 profile
 */
onShow(() => {
  loadPageUserIdParam();
  profileStore.fetchProfile().catch((error) => {
    console.warn("[ProfilePage] fetchProfile 失败:", error);
  });
  socialProgressStore.fetchProgress().catch((error) => {
    console.warn("[ProfilePage] fetchProgress 失败:", error);
  });
});

/** 页面首次加载时获取统计数据（与 onShow 配合，确保首屏有数据） */
onMounted(() => {
  loadPageUserIdParam();
  profileStore.fetchProfile().catch(() => {
    // onShow 会重试，这里静默处理
  });
  socialProgressStore.fetchProgress();
});
</script>

<template>
  <view class="profile-page page-bottom-safe page-fade-in">
    <!-- ==================== 未完善资料：锁定页面 ==================== -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="我的"
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

      <!-- 顶部右上角：匹配次数 chip（Phase C1 · 跨页面复用） -->
      <view class="profile-top-bar">
        <MatchCountChip :count="matchCount" />
      </view>

      <!-- 个人信息区 -->
      <view class="profile-info">
        <!-- 顶部背景图（Phase D4 · 可配置，默认品牌色渐变；Phase E1 · 支持上传） -->
        <view class="profile-bg">
          <image
            v-if="profileBackgroundUrl"
            class="profile-bg__img"
            :src="profileBackgroundUrl"
            mode="aspectFill"
          />
          <view class="profile-bg__overlay" />
          <!-- Phase E1 / H-10：编辑背景图按钮（仅自己主页显示，右下角相机图标） -->
          <view
            v-if="isOwnProfile"
            class="profile-bg__edit press-feedback"
            hover-class="profile-bg__edit--hover"
            hover-stay-time="120"
            @tap="handleEditBackground"
          >
            <image
              v-if="!isUploading || uploadKind !== 'background'"
              class="profile-bg__edit-icon"
              :src="IMAGE_PATHS.ICONS_COMMON.CAMERA"
              mode="aspectFit"
            />
            <view v-else class="profile-bg__edit-spinner" />
            <text class="profile-bg__edit-text">
              {{ isUploading && uploadKind === 'background' ? uploadProgress : '编辑背景图' }}
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

        <!-- 头像区域 -->
        <view class="avatar-wrap">
          <view class="avatar-ring" :class="{ 'avatar-ring--vip': isVip }">
            <view class="avatar-ring__inner">
              <view class="avatar">
                <text class="avatar__text">{{ avatarInitial }}</text>
              </view>
            </view>
          </view>
          <view v-if="isVip" class="vip-crown">
            <image class="vip-crown__icon" :src="IMAGE_PATHS.ICONS_COMMON.VIP" mode="aspectFit" />
          </view>
        </view>

        <!-- 用户信息 -->
        <view class="user-info">
          <view class="user-info__name-row">
            <text class="user-info__name">{{ profileView.displayName }}</text>
            <!-- 认证徽章：已认证显示对应徽章，未认证显示"去认证"CTA（仅自己主页） -->
            <VerificationBadge
              v-if="verificationBadgeLevel !== 'none' || showVerificationCta"
              :level="verificationBadgeLevel"
              size="md"
              :show-cta-when-none="showVerificationCta"
              @tap="handleVerificationClick"
            />
            <!-- VIP 徽章：已开通时展示 -->
            <view v-if="isVip" class="user-info__vip-badge">
              <image class="user-info__vip-badge-icon" :src="IMAGE_PATHS.ICONS_COMMON.VIP" mode="aspectFit" />
              <text class="user-info__vip-badge-text">VIP{{ vipPlanName ? " · " + vipPlanName : "" }}</text>
            </view>
          </view>
          <!-- 学校信息 -->
          <view class="user-info__school-row">
            <image class="user-info__school-icon" :src="IMAGE_PATHS.ICONS_COMMON.GRADUATION" mode="aspectFit" />
            <text class="user-info__school">{{ school }}</text>
          </view>
          <text class="user-info__bio">{{ bio }}</text>
        </view>

        <!-- Task F1 / M-08：按钮根据 isOwnProfile 切换 -->
        <!-- 自己的 profile：显示"编辑资料"按钮 -->
        <view v-if="isOwnProfile" class="edit-btn press-feedback" @tap="goToProfileSetup" hover-class="edit-btn--hover" hover-stay-time="120">
          <image class="edit-btn__icon" :src="IMAGE_PATHS.ICONS_COMMON.EDIT" mode="aspectFit" />
          <text class="edit-btn__text">编辑资料</text>
        </view>
        <!-- 对方 profile：显示"打个招呼"按钮 -->
        <view v-else class="greet-btn press-feedback" @tap="handleSayHi" hover-class="greet-btn--hover" hover-stay-time="120">
          <image class="greet-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" />
          <text class="greet-btn__text">打个招呼</text>
        </view>

        <!-- 数据统计栏 -->
        <view class="stats-bar">
          <view
            v-for="(stat, index) in stats"
            :key="index"
            class="stats-bar__item list-item"
          >
            <text class="stats-bar__value">{{ stat.value }}</text>
            <text class="stats-bar__label">{{ stat.label }}</text>
          </view>
        </view>
      </view>

      <!-- ==================== Task E2 / M-11：个人视频区块 ==================== -->
      <view v-if="isOwnProfile" class="media-section">
        <view class="section-header">
          <view class="section-header__left">
            <text class="section-header__title">个人视频</text>
            <text class="section-header__count">≤60s，展示真实的你</text>
          </view>
        </view>

        <!-- 未上传：CTA 引导上传 -->
        <view
          v-if="!personalVideoUrl"
          class="video-cta press-feedback"
          hover-class="video-cta--hover"
          hover-stay-time="120"
          @tap="handleUploadVideo"
        >
          <view class="video-cta__icon-wrap">
            <image
              v-if="!isUploading || uploadKind !== 'video'"
              class="video-cta__icon"
              :src="IMAGE_PATHS.ICONS_COMMON.CAMERA"
              mode="aspectFit"
            />
            <view v-else class="video-cta__spinner" />
          </view>
          <text class="video-cta__text">
            {{ isUploading && uploadKind === 'video' ? uploadProgress : '上传个人视频' }}
          </text>
          <text class="video-cta__hint">从相册选择，mp4 / mov，≤60s</text>
        </view>

        <!-- 已上传：视频缩略图 + 播放图标 + 删除按钮 -->
        <view v-else class="video-preview">
          <view class="video-preview__thumb" @tap="handlePlayVideo">
            <image
              class="video-preview__thumb-img"
              :src="personalVideoUrl"
              mode="aspectFill"
            />
            <view class="video-preview__play">
              <view class="video-preview__play-triangle" />
            </view>
          </view>
          <view class="video-preview__actions">
            <view
              class="video-preview__action video-preview__action--play press-feedback"
              hover-class="video-preview__action--hover"
              hover-stay-time="100"
              @tap="handlePlayVideo"
            >
              <text class="video-preview__action-text">播放</text>
            </view>
            <view
              class="video-preview__action video-preview__action--delete press-feedback"
              hover-class="video-preview__action--hover"
              hover-stay-time="100"
              @tap="handleRemoveVideo"
            >
              <text class="video-preview__action-text video-preview__action-text--danger">删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== Task E3 / H-08：照片墙区块 ==================== -->
      <view v-if="isOwnProfile" class="media-section">
        <view class="section-header">
          <view class="section-header__left">
            <text class="section-header__title">照片墙</text>
            <text class="section-header__count">{{ photoGallery.length }} / {{ PHOTO_GALLERY_MAX }}</text>
          </view>
        </view>

        <view class="photo-grid">
          <view
            v-for="cell in photoCells"
            :key="cell.index"
            class="photo-grid__cell"
          >
            <!-- 已上传：显示图片 + 长按删除 -->
            <view
              v-if="cell.filled"
              class="photo-grid__img-wrap"
              @longpress="handleRemovePhoto(cell.index)"
            >
              <image
                class="photo-grid__img"
                :src="cell.url"
                mode="aspectFill"
              />
            </view>
            <!-- 空格子：显示"+"占位，点击上传 -->
            <view
              v-else
              class="photo-grid__add press-feedback"
              hover-class="photo-grid__add--hover"
              hover-stay-time="100"
              @tap="handleUploadPhoto(cell.index)"
            >
              <text class="photo-grid__add-icon">+</text>
              <text class="photo-grid__add-text">添加</text>
            </view>
          </view>
        </view>
      </view>

      <!-- VIP卡片 -->
      <view v-if="!isVip" class="vip-card press-feedback card-base" @tap="handleVipClick" hover-class="vip-card--pressed" hover-stay-time="120">
        <view class="vip-card__left">
          <image class="vip-card__icon" :src="IMAGE_PATHS.ICONS_COMMON.VIP" mode="aspectFit" />
          <view class="vip-card__text-wrap">
            <text class="vip-card__title">开通VIP会员</text>
            <text class="vip-card__desc">解锁查看谁喜欢我 · 无限喜欢 · 专属标识</text>
          </view>
        </view>
        <view class="vip-card__btn">
          <text class="vip-card__btn-text">立即开通</text>
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
            <text class="section-header__title">我的动态</text>
            <text v-if="myPostsTotal > 0" class="section-header__count">共 {{ myPostsTotal }} 条</text>
          </view>
          <view
            v-if="myPostsPreview.length > 0"
            class="section-header__more press-feedback"
            @tap="goToMyPosts"
            hover-class="section-header__more--hover"
            hover-stay-time="100"
          >
            <text class="section-header__more-text">查看全部</text>
            <text class="section-header__more-arrow">›</text>
          </view>
        </view>

        <!-- 动态列表（有数据时） -->
        <view v-if="myPostsPreview.length > 0" class="my-posts-list">
          <view
            v-for="(post, index) in myPostsPreview"
            :key="post.id"
            class="my-post-item press-feedback"
            :class="{ 'my-post-item--no-border': index === myPostsPreview.length - 1 }"
            @tap="handlePostTap(post.id)"
            hover-class="my-post-item--hover"
            hover-stay-time="100"
          >
            <view class="my-post-item__content">
              <text class="my-post-item__summary">{{ post.summary }}</text>
              <view class="my-post-item__meta">
                <text class="my-post-item__time">{{ post.timeLabel }}</text>
                <view class="my-post-item__stats">
                  <view class="my-post-item__stat">
                    <image class="my-post-item__stat-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART" mode="aspectFit" />
                    <text class="my-post-item__stat-text">{{ post.likes }}</text>
                  </view>
                  <view class="my-post-item__stat">
                    <image class="my-post-item__stat-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" />
                    <text class="my-post-item__stat-text">{{ post.comments }}</text>
                  </view>
                </view>
              </view>
            </view>
            <text class="my-post-item__arrow">›</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view
          v-else
          class="my-posts-empty press-feedback"
          @tap="goToMyPosts"
          hover-class="my-posts-empty--hover"
          hover-stay-time="100"
        >
          <image class="my-posts-empty__icon" :src="IMAGE_PATHS.ICONS_COMMON.EDIT" mode="aspectFit" />
          <text class="my-posts-empty__text">还没有发布过动态</text>
          <text class="my-posts-empty__action">去村口发第一条 ›</text>
        </view>
      </view>

      <!-- 功能菜单列表 -->
      <view class="menu-group">
        <view
          v-for="(item, index) in menuItems"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === menuItems.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <SafeImage
                v-if="item.icon"
                :src="item.icon"
                custom-class="menu-item__icon-img"
                mode="aspectFit"
              />
              <text v-else class="menu-item__emoji">{{ item.emoji }}</text>
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- 底部菜单（设置、关于） -->
      <view class="menu-group">
        <view
          v-for="(item, index) in bottomMenuItems"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === bottomMenuItems.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <SafeImage
                v-if="item.icon"
                :src="item.icon"
                custom-class="menu-item__icon-img"
                mode="aspectFit"
              />
              <text v-else class="menu-item__emoji">{{ item.emoji }}</text>
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-btn press-feedback" @tap="handleLogout" hover-class="logout-btn--hover" hover-stay-time="100">
        <text class="logout-btn__text">退出登录</text>
      </view>

      <!-- 底部版本信息 -->
      <view class="footer-version">
        <text class="footer-version__text">{{ appVersion }}</text>
      </view>

      <!-- [DEV-MODE] 开发者模式入口按钮 -->
      <view v-if="isDev" class="dev-entry press-feedback" @tap="openAppPath('/pages/dev/index')" hover-class="dev-entry--hover" hover-stay-time="100">
        <text class="dev-entry__text">DEV</text>
      </view>

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

/* 顶部背景图（Phase D4 · 可配置，默认品牌色渐变） */
.profile-bg {
  position: relative;
  width: 100%;
  height: var(--profile-bg-height);
  background: var(--c-gradient-brand);
  overflow: hidden;
  flex-shrink: 0;
}

.profile-bg__img {
  width: 100%;
  height: 100%;
  display: block;
}

.profile-bg__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(63, 207, 142, 0.3) 0%, rgba(124, 217, 166, 0.5) 50%, var(--c-brand-400) 100%);
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
  background: rgba(15, 23, 42, 0.55);
  border-radius: var(--r-full);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

  &--hover {
    transform: scale(0.96);
    background: rgba(15, 23, 42, 0.7);
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
  border: 3rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: var(--c-neutral-0);
  animation: profile-bg-spin 0.8s linear infinite;
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
  background: rgba(15, 23, 42, 0.35);
}

.profile-bg__loading-text {
  font-size: var(--fs-md);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* 顶部右上角 chip 容器（Phase C1） */
.profile-top-bar {
  position: absolute;
  top: calc(constant(safe-area-inset-top) + var(--sp-5));
  top: calc(env(safe-area-inset-top) + var(--sp-5));
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--sp-7);
  width: 100%;
  box-sizing: border-box;
}

/* 头像容器（Phase D4 · 半遮挡背景） */
.avatar-wrap {
  position: relative;
  z-index: 2;
  margin-top: calc(var(--profile-avatar-size) * -0.5);
  margin-bottom: var(--sp-5);
}

/* 光环效果 */
.avatar-ring {
  width: 152rpx;
  height: 152rpx;
  border-radius: var(--r-full);
  padding: var(--sp-1);
  background: var(--c-gradient-brand);
  animation: ring-rotate 8s linear infinite;

  &--vip {
    background: var(--c-gradient-vip);
    box-shadow: 0 0 var(--sp-8) rgba(201, 163, 106, 0.5);
  }
}

.avatar-ring__inner {
  width: 100%;
  height: 100%;
  border-radius: var(--r-full);
  padding: 6rpx;
  background: var(--c-neutral-0);
  box-shadow: var(--s-sm);
}

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
  box-shadow: 0 0 0 6rpx var(--c-bg-container), 0 0 0 12rpx var(--c-brand-100);
}

.avatar__text {
  font-size: var(--fs-6xl);
  font-weight: 700;
  color: var(--c-neutral-0);
  line-height: 1;
}

.vip-crown {
  position: absolute;
  bottom: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 36rpx;
  height: 36rpx;
  filter: drop-shadow(0 var(--sp-1) var(--sp-2) rgba(0,0,0,0.2));
}

.vip-crown__icon {
  width: 100%;
  height: 100%;
}

@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 用户信息 */
.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--sp-6);
}

/* 昵称行（昵称 + VIP 徽章） */
.user-info__name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-2);
}

.user-info__name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-neutral-0);
  text-shadow: 0 var(--sp-1) var(--sp-4) rgba(0,0,0,0.1);
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

/* 学校信息行 */
.user-info__school-row {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-bottom: var(--sp-2);
  padding: var(--sp-1) var(--sp-4);
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--r-full);
}

.user-info__school-icon {
  font-size: var(--fs-xs);
  line-height: 1;
}

.user-info__school {
  font-size: var(--fs-sm);
  color: var(--c-neutral-0);
  font-weight: 500;
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info__bio {
  font-size: var(--fs-sm);
  color: rgba(255, 255, 255, 0.8);
  max-width: 480rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 编辑资料按钮 */
.edit-btn {
  position: relative;
  z-index: 2;
  padding: var(--sp-3) var(--sp-6);
  background: var(--c-brand-50);
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-brand-500);
  margin-bottom: var(--sp-7);

  &--hover {
    transform: scale(0.96);
    background: var(--c-brand-100);
  }
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
  margin: 0 var(--sp-7);
  box-sizing: border-box;
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.stats-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stats-bar__value {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1;
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
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

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
  animation: video-cta-spin 0.8s linear infinite;
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
  background: rgba(15, 23, 42, 0.55);
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
    border-color: rgba(229, 69, 77, 0.3);
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

/* 照片墙 3x2 网格 */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: var(--sp-2);
}

.photo-grid__cell {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--c-neutral-50);
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
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

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
  font-size: var(--fs-6xl);
  filter: drop-shadow(0 var(--sp-1) var(--sp-2) rgba(0,0,0,0.15));
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
  color: rgba(255, 255, 255, 0.85);
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
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.my-post-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

.my-post-item__time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.my-post-item__stats {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.my-post-item__stat {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
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
  font-size: 56rpx;
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

.menu-item__emoji {
  font-size: var(--fs-4xl);
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

.menu-item__arrow {
  font-size: var(--fs-5xl);
  color: var(--c-neutral-300);
  font-weight: 300;
  line-height: 1;
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
