<script setup lang="ts">
/**
 * 他人主页详情页（2026-08-09 喜欢/访客/通知闭环专用）。
 *
 * 来源入口：喜欢与访客页 / 访客页 / 心动信号页 点击对方进入，
 * 数据源：GET /api/recommendations/{userId}/profile（复用推荐卡片公开视图组装）。
 *
 * 页面功能：
 * 1. 展示对方完整公开资料（头像/昵称/年龄/学校/简介/标签/MBTI/期待画像/动态预览）
 * 2. 进入自动记录访客（POST /api/matches/visit，后端每日去重）
 * 3. 底部操作栏：跳过 / 喜欢（互相喜欢→匹配成功→去聊天）/ 悄悄话（创建会话去聊天）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类
 * - 不使用 import.meta.env.DEV
 * - 不使用 backdrop-filter（仅 H5 条件编译）
 * - 不使用 optional catch binding（catch {}）
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { request } from "../../services/http";
import { useLikesStore } from "../../stores/likes";
// mock 演示：mock 模式从喜欢/访客 mock 数据构造他人主页视图
import { useMock } from "../../stores/helpers/use-mock";
import { mockLikedBy, mockVisitors } from "../../stores/likes/mock-data";
import type { RecommendedPersonView } from "../../stores/discover/types";
import type { HeartSignalView } from "../../stores/discover/api";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";
// 2026-08-08：pexels 外链本地化兜底（mp 端无法加载外链图）
import { toLocalImage } from "../../utils/image-local";
import { useSessionStore } from "../../stores/session";
import SafeImage from "../../components/common/SafeImage.vue";
import VerificationBadge from "../../components/common/VerificationBadge.vue";
import { lightHaptic, successHaptic, errorHaptic } from "../../utils/haptic";

/** 学历档位文案映射（后端枚举 → 中文展示） */
const EDUCATION_LABELS: Record<string, string> = {
  high_school: "高中",
  bachelor: "本科",
  master: "硕士",
  phd: "博士",
};

/** 婚况文案映射 */
const RELATIONSHIP_LABELS: Record<string, string> = {
  never: "未婚",
  married_before: "离异",
  divorced: "离异",
  widowed: "丧偶",
};

const { t } = useI18n();
const likesStore = useLikesStore();
const sessionStore = useSessionStore();

/** 目标用户 ID */
const targetUserId = ref("");
/** 对方主页资料（RecommendedPersonView 完整公开视图） */
const profile = ref<RecommendedPersonView | null>(null);
/** 是否加载中 */
const loading = ref(false);
/** 加载错误文案 */
const errorMessage = ref("");
/** 喜欢请求进行中（防重复提交） */
const liking = ref(false);
/** 跳过请求进行中 */
const passing = ref(false);

/** 是否查看自己的主页（防御：他人主页不应展示自己） */
const isSelf = computed(
  () =>
    !!targetUserId.value &&
    !!sessionStore.userSession?.userId &&
    String(sessionStore.userSession.userId) === targetUserId.value,
);

/** 是否已经喜欢过对方（加载时同步 likes store 判断） */
const alreadyLiked = computed(() =>
  likesStore.likes.some((item) => item.userId === targetUserId.value),
);

/** 头部大图：半身照 → 照片墙首图 → 头像 */
const heroImage = computed(() => {
  const p = profile.value;
  if (!p) return "";
  return p.halfBodyPhotoUrl || p.photoGallery?.[0] || p.avatarUrl || "";
});

/** 基础资料胶囊项（身高/学历/职业/收入），无值时过滤 */
const basicItems = computed(() => {
  const p = profile.value;
  if (!p) return [];
  const items: string[] = [];
  if (p.height) items.push(`${p.height}cm`);
  if (p.educationLevel) items.push(EDUCATION_LABELS[p.educationLevel] ?? p.educationLevel);
  if (p.occupation) items.push(p.occupation);
  if (p.incomeRange) items.push(`月收入${p.incomeRange}`);
  if (p.relationshipStatus) items.push(RELATIONSHIP_LABELS[p.relationshipStatus] ?? p.relationshipStatus);
  return items;
});

/** 学历/职业明细行（同校标识 + 距离 + 活跃状态） */
const metaLabels = computed(() => {
  const p = profile.value;
  if (!p) return [];
  const labels: string[] = [];
  if (p.isSameSchool) labels.push("同校");
  else if (p.campusName) labels.push(p.campusName);
  if (p.distanceText) labels.push(p.distanceText);
  if (p.activeStatusText) labels.push(p.activeStatusText);
  return labels;
});

/** 返回上一页（自定义导航栏） */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: ROUTES.TAB.HOME });
  }
}

/** 加载对方主页资料 */
async function loadProfile(): Promise<void> {
  if (!targetUserId.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    if (useMock()) {
      // mock 演示：从喜欢/访客 mock 数据查找目标用户并构造公开视图
      const target = [...mockLikedBy, ...mockVisitors].find(
        (u) => u.userId === targetUserId.value,
      );
      if (!target) {
        errorMessage.value = t("common.noData");
        loading.value = false;
        return;
      }
      profile.value = buildMockProfile(target);
    } else {
      const data = await request<RecommendedPersonView>({
        url: `/recommendations/${encodeURIComponent(targetUserId.value)}/profile`,
        method: "GET",
      });
      profile.value = data;
    }
    // 同步喜欢关系（判断是否已喜欢 / 是否互相喜欢）
    if (likesStore.likes.length === 0 && likesStore.likedBy.length === 0) {
      void likesStore.fetchLikes().catch(() => {});
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("common.networkError");
  } finally {
    loading.value = false;
  }
}

/**
 * mock 模式：将 LikeRecord/VisitorRecord 映射为 RecommendedPersonView。
 * 仅 mock 分支调用（useMock），real 模式数据来自后端接口。
 */
function buildMockProfile(u: {
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  verificationBadgeLevel?: string;
}): RecommendedPersonView {
  const parts = (u.headline || "").split(" · ").map((s) => s.trim()).filter(Boolean);
  return {
    id: Number(u.userId.replace(/\D/g, "")) || 0,
    name: u.name,
    initials: (u.name || "?").charAt(0),
    headline: u.headline,
    commonGround: "",
    availability: "",
    campusName: parts[0] || "",
    avatarUrl: u.avatar,
    tags: parts.slice(2),
    bio: u.headline,
    images: u.avatar ? [u.avatar] : [],
    isSameSchool: false,
    isSameMajor: false,
    commonCircleCount: 0,
    halfBodyPhotoUrl: u.avatar,
    photoGallery: u.avatar ? [u.avatar] : [],
    verificationBadgeLevel: u.verificationBadgeLevel || "none",
    displayId: u.userId,
    age: 22,
    educationLevel: "bachelor",
    occupation: "学生",
    personality: ["开朗", "真诚"],
    mbti: "ESTJ",
    expectedPartner: "希望遇见一个真诚、热爱生活、能一起成长的你。",
    activeStatusText: "今日活跃",
    recentPosts: [],
  };
}

/** 记录访客（fire-and-forget，后端每日去重；失败不阻塞页面） */
function recordVisit(): void {
  if (!targetUserId.value || useMock()) return;
  request<void>({
    url: "/matches/visit",
    method: "POST",
    data: { visitedUserId: Number(targetUserId.value) },
  }).catch(() => {
    // 访客记录失败不影响浏览
  });
}

/** 点击「喜欢」：互相喜欢 → 匹配成功 → 去聊天；单向喜欢 → 提示等待 */
async function handleLike(): Promise<void> {
  if (liking.value || !targetUserId.value) return;
  lightHaptic();
  liking.value = true;
  try {
    if (useMock()) {
      // mock：复用 likes store 的 mock 喜欢逻辑；
      // 目标在「喜欢我」mock 列表中 → 视为互相喜欢（匹配成功）
      await likesStore.likeUser(targetUserId.value);
      const mutualInMock = mockLikedBy.some((u) => u.userId === targetUserId.value);
      if (mutualInMock) {
        successHaptic();
        uni.showModal({
          title: "匹配成功",
          content: "你们互相喜欢了，快去打个招呼吧",
          confirmText: "去聊天",
          cancelText: "再看看",
          success: (res) => {
            if (res.confirm) {
              openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetUserId.value)}`);
            }
          },
        });
      } else {
        uni.showToast({ title: "已喜欢，等待回应", icon: "success" });
      }
      return;
    }
    const signal = await request<HeartSignalView | null>({
      url: "/matches/like",
      method: "POST",
      data: { targetUserId: targetUserId.value },
    });
    void likesStore.fetchLikes().catch(() => {});
    if (signal && signal.id) {
      // 互相喜欢 → 匹配成功
      successHaptic();
      uni.showModal({
        title: "匹配成功",
        content: "你们互相喜欢了，快去打个招呼吧",
        confirmText: "去聊天",
        cancelText: "再看看",
        success: (res) => {
          if (res.confirm) {
            openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetUserId.value)}`);
          }
        },
      });
      return;
    }
    uni.showToast({ title: "已喜欢，等待回应", icon: "success" });
  } catch (error) {
    errorHaptic();
    uni.showToast({
      title: error instanceof Error ? error.message : t("common.operationFailed"),
      icon: "none",
    });
  } finally {
    liking.value = false;
  }
}

/** 点击「跳过」：标记 pass，提示后返回 */
async function handlePass(): Promise<void> {
  if (passing.value || !targetUserId.value) return;
  lightHaptic();
  passing.value = true;
  try {
    if (!useMock()) {
      await request<void>({
        url: `/matches/pass?passedUserId=${encodeURIComponent(targetUserId.value)}`,
        method: "POST",
      });
    }
    uni.showToast({ title: "已跳过", icon: "none" });
    setTimeout(goBack, 300);
  } catch (error) {
    errorHaptic();
    uni.showToast({
      title: error instanceof Error ? error.message : t("common.operationFailed"),
      icon: "none",
    });
  } finally {
    passing.value = false;
  }
}

/** 点击「悄悄话」：创建/复用私信会话进入聊天（打招呼主入口） */
function handleWhisper(): void {
  if (!targetUserId.value) return;
  lightHaptic();
  openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetUserId.value)}`);
}

/** 点击单条动态 → 跳转动态详情页 */
function openPost(postId: string): void {
  if (!postId) return;
  openAppPath(`/pages/village/detail?id=${encodeURIComponent(postId)}`);
}

onLoad((query) => {
  const qUserId = query?.userId;
  if (typeof qUserId === "string" && qUserId.length > 0) {
    targetUserId.value = qUserId;
    recordVisit();
    void loadProfile();
  } else {
    errorMessage.value = t("common.noData");
  }
});
</script>

<template>
  <view class="other-page page-fade-in">
    <!-- 自定义导航栏 -->
    <view class="other-header">
      <view
        class="other-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <image class="other-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <text class="other-header__title">TA 的主页</text>
      <view class="other-header__placeholder" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && !profile" class="other-state">
      <view class="other-state__spinner" />
      <text class="other-state__text">{{ t("common.loading") }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage && !profile" class="other-state" role="alert">
      <text class="other-state__error">{{ errorMessage }}</text>
      <view class="other-state__retry press-feedback" role="button" @tap="loadProfile">
        <text class="other-state__retry-text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <!-- 主页内容 -->
    <template v-else-if="profile">
      <!-- 头部：大图背景 + 头像 + 昵称 + 标签 -->
      <view class="other-hero">
        <image
          v-if="heroImage"
          class="other-hero__bg"
          :src="resolveMediaUrl(toLocalImage(heroImage))"
          mode="aspectFill"
          alt=""
        />
        <view class="other-hero__overlay" />
        <view class="other-hero__content">
          <view class="other-hero__avatar-wrap">
            <SafeImage
              v-if="profile.avatarUrl"
              :src="resolveMediaUrl(toLocalImage(profile.avatarUrl))"
              custom-class="other-hero__avatar"
              mode="aspectFill"
            />
            <view v-else class="other-hero__avatar other-hero__avatar--placeholder">
              <text class="other-hero__avatar-initial">{{ (profile.name || "?").charAt(0) }}</text>
            </view>
            <view v-if="profile.verificationBadgeLevel && profile.verificationBadgeLevel !== 'none'" class="other-hero__badge">
              <VerificationBadge :level="(profile.verificationBadgeLevel as 'school' | 'email' | 'idcard')" size="sm" :show-cta-when-none="false" />
            </view>
          </view>
          <view class="other-hero__info">
            <view class="other-hero__name-row">
              <text class="other-hero__name">{{ profile.name || t("common.noData") }}</text>
              <text v-if="profile.age" class="other-hero__age">{{ profile.age }}岁</text>
            </view>
            <view class="other-hero__meta-row">
              <text v-for="label in metaLabels" :key="label" class="other-hero__meta">{{ label }}</text>
            </view>
            <text v-if="profile.displayId" class="other-hero__id">ID: {{ profile.displayId }}</text>
          </view>
        </view>
      </view>

      <!-- 资料卡 -->
      <view class="other-body">
        <!-- 基础资料胶囊 -->
        <view v-if="basicItems.length > 0" class="other-section">
          <view class="other-basics">
            <text v-for="item in basicItems" :key="item" class="other-basics__item">{{ item }}</text>
          </view>
        </view>

        <!-- 个人简介 -->
        <view v-if="profile.bio" class="other-section">
          <text class="other-section__label">个人简介</text>
          <text class="other-section__bio">{{ profile.bio }}</text>
        </view>

        <!-- 兴趣标签 -->
        <view v-if="profile.tags && profile.tags.length > 0" class="other-section">
          <text class="other-section__label">兴趣标签</text>
          <view class="other-tags">
            <text v-for="tag in profile.tags" :key="tag" class="other-tags__item">{{ tag }}</text>
          </view>
        </view>

        <!-- MBTI + 性格标签 -->
        <view v-if="profile.mbti || (profile.personality && profile.personality.length > 0)" class="other-section">
          <text class="other-section__label">性格画像</text>
          <view class="other-personality">
            <text v-if="profile.mbti" class="other-personality__mbti">{{ profile.mbti }}</text>
            <text v-for="p in profile.personality" :key="p" class="other-personality__tag">{{ p }}</text>
          </view>
        </view>

        <!-- 期待画像 -->
        <view v-if="profile.expectedPartner" class="other-section">
          <text class="other-section__label">我期待遇见的你</text>
          <view class="other-expect">
            <text class="other-expect__text">{{ profile.expectedPartner }}</text>
          </view>
        </view>

        <!-- 动态预览 -->
        <view v-if="profile.recentPosts && profile.recentPosts.length > 0" class="other-section">
          <text class="other-section__label">TA 的动态</text>
          <view
            v-for="post in profile.recentPosts"
            :key="post.id"
            class="other-post press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="post.content"
            @tap="openPost(post.id)"
          >
            <text class="other-post__content">{{ post.content }}</text>
            <view class="other-post__footer">
              <text class="other-post__stat">👍 {{ post.likes || 0 }}</text>
              <text class="other-post__stat">💬 {{ post.comments || 0 }}</text>
            </view>
          </view>
        </view>

        <!-- 底部操作栏占位（避免内容被固定栏遮挡） -->
        <view class="other-body__spacer" />
      </view>

      <!-- 底部操作栏：跳过 / 喜欢 / 悄悄话（查看自己主页时不展示，isSelf 防御兜底） -->
      <view v-if="!isSelf" class="other-action-bar">
        <view
          class="other-action other-action--pass press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          :class="{ 'other-action--disabled': passing }"
          role="button"
          :aria-label="t('common.cancel')"
          @tap="handlePass"
        >
          <image class="other-action__icon" :src="IMAGE_PATHS.ICONS_COMMON.CLOSE" mode="aspectFit" alt="" />
        </view>
        <view
          class="other-action other-action--like press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          :class="{ 'other-action--disabled': liking || alreadyLiked }"
          role="button"
          :aria-label="alreadyLiked ? '已喜欢' : '喜欢'"
          @tap="handleLike"
        >
          <image class="other-action__icon" :src="IMAGE_PATHS.ICONS_COMMON.HEART" mode="aspectFit" alt="" />
          <text class="other-action__text">{{ alreadyLiked ? "已喜欢" : "喜欢" }}</text>
        </view>
        <view
          class="other-action other-action--whisper press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'悄悄话'"
          @tap="handleWhisper"
        >
          <image class="other-action__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.MESSAGE" mode="aspectFit" alt="" />
          <text class="other-action__text">悄悄话</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.other-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-gradient-page);
  padding: 0;
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
  position: relative;
}

/* ========== 导航栏 ========== */
.other-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-6);
  position: relative;
  z-index: 2;
}

.other-header__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.other-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.other-header__title {
  font-size: var(--fs-4xl);
  font-weight: 800;
  color: var(--c-text-primary);
}

.other-header__placeholder {
  width: 64rpx;
}

/* ========== 加载 / 错误状态 ========== */
.other-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: var(--sp-10) 0;
}

.other-state__spinner {
  width: var(--sp-10);
  height: var(--sp-10);
  border: var(--sp-1) solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: var(--r-full);
  animation: other-spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes other-spin {
  to { transform: rotate(360deg); }
}

.other-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

.other-state__error {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  text-align: center;
  padding: 0 var(--sp-10);
}

.other-state__retry {
  padding: var(--sp-3) var(--sp-8);
  background: var(--c-brand);
  border-radius: var(--r-full);
}

.other-state__retry-text {
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 头部 ========== */
.other-hero {
  position: relative;
  height: 460rpx;
  overflow: hidden;
  margin: 0 var(--sp-6);
  border-radius: var(--r-xxl);
}

.other-hero__bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.other-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    var(--c-black-overlay-strong, rgba(15, 23, 42, 0.85)) 0%,
    var(--c-black-shadow-xl, rgba(15, 23, 42, 0.35)) 55%,
    var(--c-black-shadow-xs, rgba(15, 23, 42, 0.05)) 100%
  );
}

.other-hero__content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--sp-6) var(--sp-7);
  display: flex;
  align-items: center;
  gap: var(--sp-6);
}

.other-hero__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.other-hero__avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: var(--r-full);
  border: var(--sp-1) solid var(--c-bg-container);
  box-sizing: border-box;
  background: var(--c-bg-page);
}

.other-hero__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
}

.other-hero__avatar-initial {
  font-size: var(--fs-5xl);
  font-weight: 800;
  color: var(--c-brand);
}

.other-hero__badge {
  position: absolute;
  right: 0;
  bottom: 0;
}

.other-hero__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.other-hero__name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.other-hero__name {
  font-size: var(--fs-4xl);
  font-weight: 800;
  color: var(--c-text-inverse);
}

.other-hero__age {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-inverse);
  background: var(--c-brand);
  padding: 2rpx 14rpx;
  border-radius: var(--r-full);
}

.other-hero__meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.other-hero__meta {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.18);
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
}

.other-hero__id {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  opacity: 0.75;
}

/* ========== 资料卡 ========== */
.other-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  padding: var(--sp-6) var(--sp-8);
}

.other-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
  padding: var(--sp-6);
}

.other-section__label {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
}

.other-section__bio {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.6;
}

.other-basics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.other-basics__item {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
  background: var(--c-neutral-50);
  border: 1rpx solid var(--c-border-default);
  padding: 6rpx 16rpx;
  border-radius: var(--r-full);
}

.other-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.other-tags__item {
  font-size: var(--fs-sm);
  color: var(--c-brand-700);
  background: var(--c-bg-brand);
  padding: 6rpx 18rpx;
  border-radius: var(--r-full);
}

.other-personality {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.other-personality__mbti {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-inverse);
  background: var(--c-brand);
  padding: 6rpx 16rpx;
  border-radius: var(--r-full);
}

.other-personality__tag {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
  background: var(--c-neutral-50);
  border: 1rpx solid var(--c-border-default);
  padding: 6rpx 16rpx;
  border-radius: var(--r-full);
}

.other-expect {
  background: var(--c-romance-50);
  border-radius: var(--r-lg);
  padding: var(--sp-4) var(--sp-5);
}

.other-expect__text {
  font-size: var(--fs-md);
  color: var(--c-romance-700);
  line-height: 1.6;
}

.other-post {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  background: var(--c-neutral-50);
  border-radius: var(--r-lg);
  padding: var(--sp-4) var(--sp-5);
}

.other-post__content {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.other-post__footer {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
}

.other-post__stat {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.other-body__spacer {
  height: 200rpx;
}

/* ========== 底部操作栏 ========== */
.other-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 16rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding: var(--sp-4) 0;
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light);
  box-shadow: 0 -4rpx 24rpx var(--c-black-shadow-sm, rgba(0, 0, 0, 0.06));
  z-index: 30;
}

.other-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border-radius: var(--r-full);
  transition: transform var(--d-fast, 120ms) ease;
}

.other-action--pass {
  width: 88rpx;
  height: 88rpx;
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-border-default);
  box-shadow: var(--s-card-soft);
}

.other-action--like {
  width: 108rpx;
  height: 108rpx;
  background: linear-gradient(135deg, var(--c-brand), var(--c-brand-700));
  box-shadow: var(--s-brand);
}

.other-action--whisper {
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-romance-500));
  box-shadow: var(--s-romance);
}

.other-action--disabled {
  opacity: 0.55;
}

.other-action__icon {
  width: 40rpx;
  height: 40rpx;
}

.other-action__text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.other-action--like .other-action__text,
.other-action--whisper .other-action__text {
  color: var(--c-text-inverse);
}
</style>
