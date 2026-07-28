<script setup lang="ts">
/**
 * 关注/粉丝列表页
 * 通过 query 参数 type 区分：following（关注）/ followers（粉丝）
 */
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../services/api";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic } from "../../utils/haptic";
import { resolveMediaUrl } from "../../utils/media";
import SafeImage from "../../components/common/SafeImage.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import ErrorState from "../../components/common/ErrorState.vue";

export interface FollowUser {
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  campusName?: string;
  isFollowed: boolean;
  followedAt?: string;
}

type FollowType = "following" | "followers";

const { t } = useI18n();

/** 列表类型：following（关注）/ followers（粉丝） */
const followType = ref<FollowType>("following");
/** 列表数据 */
const userList = ref<FollowUser[]>([]);
/** 加载状态 */
const loading = ref(true);
/** 错误消息 */
const errorMessage = ref<string | null>(null);

/** 页面标题 */
const pageTitle = computed(() =>
  followType.value === "following"
    ? t("profile.following")
    : t("profile.followers")
);

/**
 * 从页面参数获取列表类型
 */
function loadPageParams(): void {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1] as
      | { options?: Record<string, string>; $page?: { options?: Record<string, string> } }
      | undefined;
    const options = currentPage?.options || currentPage?.$page?.options || {};
    const type = options.type;
    if (type === "followers") {
      followType.value = "followers";
    } else {
      followType.value = "following";
    }
  } catch {
    followType.value = "following";
  }
}

/**
 * 加载列表数据
 */
async function fetchData(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  try {
    userList.value = await clientApi.getFollowList(followType.value);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

/**
 * 点击用户项跳转到对方主页
 */
function handleUserTap(userId: string): void {
  if (!userId) return;
  lightHaptic();
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(userId)}`);
}

/** 返回上一页 */
function goBack(): void {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

onMounted(() => {
  loadPageParams();
  void fetchData();
});

onShow(() => {
  // 页面重新显示时刷新列表
  if (!loading.value) {
    void fetchData();
  }
});
</script>

<template>
  <view class="follow-list-page page-fade-in">
    <!-- 页面头部 -->
    <view class="follow-list-header">
      <view
        class="follow-list-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="100"
        @tap="goBack"
      >
        <text class="follow-list-header__back-icon">‹</text>
      </view>
      <text class="follow-list-header__title">{{ pageTitle }}</text>
      <view class="follow-list-header__spacer" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="follow-list-loading">
      <Skeleton variant="list" :count="6" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage" class="follow-list-error">
      <ErrorState type="network" @retry="fetchData" />
    </view>

    <!-- 空状态 -->
    <view v-else-if="userList.length === 0" class="follow-list-empty">
      <view class="follow-list-empty__icon-wrap">
        <text class="follow-list-empty__icon">
          {{ followType === "following" ? "👥" : "👋" }}
        </text>
      </view>
      <text class="follow-list-empty__title">
        {{ followType === "following" ? t("profile.followingEmpty") : t("profile.followersEmpty") }}
      </text>
    </view>

    <!-- 用户列表 -->
    <view v-else class="follow-list-content">
      <view
        v-for="(item, idx) in userList"
        :key="item.userId"
        class="follow-list-card list-item animate-fade-in press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        :style="{ animationDelay: idx * 60 + 'ms' }"
        @tap="handleUserTap(item.userId)"
      >
        <view class="follow-list-card__avatar-wrap">
          <image
            v-if="item.avatar"
            class="follow-list-card__avatar"
            :src="resolveMediaUrl(item.avatar)"
            mode="aspectFill"
            lazy-load
            alt=""
          />
          <view v-else class="follow-list-card__avatar-placeholder">
            <text class="follow-list-card__avatar-initial">{{ item.name.charAt(0) }}</text>
          </view>
        </view>
        <view class="follow-list-card__info">
          <text class="follow-list-card__name">{{ item.name }}</text>
          <text class="follow-list-card__headline">{{ item.headline || item.campusName }}</text>
        </view>
        <view class="follow-list-card__arrow">
          <text class="follow-list-card__arrow-icon">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.follow-list-page {
  min-height: 100vh;
  background: var(--c-bg-page, #f5f7fa);
  padding-bottom: var(--sp-12, 2rem);
}

/* ========== 头部 ========== */
.follow-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4, 0.5rem) var(--sp-6, 0.75rem);
  padding-top: calc(var(--status-bar-height, 44px) + var(--sp-4, 0.5rem));
  background: var(--c-bg-container, #ffffff);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid rgba(15, 23, 42, 0.06);
}

.follow-list-header__back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.follow-list-header__back-icon {
  font-size: var(--fs-3xl, 1.5rem);
  color: var(--c-text-primary, #1f2329);
  line-height: 1;
}

.follow-list-header__title {
  font-size: var(--fs-xl, 1.125rem);
  font-weight: 600;
  color: var(--c-text-primary, #1f2329);
}

.follow-list-header__spacer {
  width: 72rpx;
}

/* ========== 加载态 ========== */
.follow-list-loading {
  padding: var(--sp-6, 0.75rem);
}

/* ========== 错误态 ========== */
.follow-list-error {
  padding: var(--sp-12, 2rem) var(--sp-6, 0.75rem);
}

/* ========== 空态 ========== */
.follow-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--sp-20, 3rem) var(--sp-6, 0.75rem);
  gap: var(--sp-4, 0.5rem);
}

.follow-list-empty__icon-wrap {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-subtle, #f0f2f5);
  border-radius: 50%;
}

.follow-list-empty__icon {
  font-size: var(--fs-4xl, 1.75rem);
}

.follow-list-empty__title {
  font-size: var(--fs-base, 0.875rem);
  color: var(--c-text-tertiary, #94a3b8);
}

/* ========== 列表 ========== */
.follow-list-content {
  padding: var(--sp-3, 0.375rem) var(--sp-6, 0.75rem);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2, 0.25rem);
}

/* ========== 用户卡片 ========== */
.follow-list-card {
  display: flex;
  align-items: center;
  gap: var(--sp-4, 0.5rem);
  padding: var(--sp-4, 0.5rem) var(--sp-5, 0.625rem);
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-lg, 0.75rem);
  border: 0.03125rem solid rgba(15, 23, 42, 0.06);
  transition: transform 0.15s ease;
}

.follow-list-card:active {
  transform: scale(0.98);
}

.follow-list-card__avatar-wrap {
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
}

.follow-list-card__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.follow-list-card__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-primary-light, #e0f7ef), var(--c-primary, #3fcf8e));
  border-radius: 50%;
}

.follow-list-card__avatar-initial {
  font-size: var(--fs-xl, 1.125rem);
  font-weight: 600;
  color: #ffffff;
}

.follow-list-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.follow-list-card__name {
  font-size: var(--fs-base-plus, 0.9375rem);
  font-weight: 600;
  color: var(--c-text-primary, #1f2329);
  line-height: 1.4;
}

.follow-list-card__headline {
  font-size: var(--fs-sm, 0.75rem);
  color: var(--c-text-tertiary, #94a3b8);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-list-card__arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.follow-list-card__arrow-icon {
  font-size: var(--fs-2xl, 1.25rem);
  color: var(--c-text-tertiary, #94a3b8);
  line-height: 1;
}
</style>
