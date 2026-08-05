<script setup lang="ts">
/**
 * 附近的人（任务 E3）
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.nearbyUrl，
 * 非空则渲染 <web-view> 加载该 URL；为空则展示本地示例用户列表。
 * 右上角固定返回按钮（uni.navigateBack）。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { contentPageUrls } from "../../config/content-pages";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/** 返回按钮图标 */
const backIcon = IMAGE_PATHS.ICONS_COMMON.BACK;

onLoad(() => {
  webUrl.value = contentPageUrls.nearbyUrl ?? "";
});

/** 本地示例用户（mock 数据：昵称/学校为示例内容，真实数据由后端接口提供） */
interface NearbyUser {
  id: string;
  nickname: string;
  school: string;
  /** 距离（km，0 表示同校） */
  distance: number;
  avatar: string;
}

const nearbyUsers: NearbyUser[] = [
  { id: "u-1", nickname: "夏言", school: "北京大学", distance: 0, avatar: IMAGE_PATHS.AVATARS.AVATAR_1 },
  { id: "u-2", nickname: "顾北", school: "清华大学", distance: 2.4, avatar: IMAGE_PATHS.AVATARS.AVATAR_2 },
  { id: "u-3", nickname: "林溪", school: "北京大学", distance: 0.6, avatar: IMAGE_PATHS.AVATARS.AVATAR_3 },
  { id: "u-4", nickname: "周屿", school: "北京师范大学", distance: 3.1, avatar: IMAGE_PATHS.AVATARS.AVATAR_4 },
  { id: "u-5", nickname: "沈念", school: "中国人民大学", distance: 5.8, avatar: IMAGE_PATHS.AVATARS.AVATAR_5 },
  { id: "u-6", nickname: "苏晚", school: "北京理工大学", distance: 4.2, avatar: IMAGE_PATHS.AVATARS.AVATAR_6 },
  { id: "u-7", nickname: "陆辰", school: "北京大学", distance: 0, avatar: IMAGE_PATHS.AVATARS.AVATAR_7 },
];

/** 距离文案：同校显示"同校"，否则显示 {n}km */
function distanceLabel(user: NearbyUser): string {
  if (user.distance === 0) return t("contentPages.nearby.distanceSameCampus");
  return t("contentPages.nearby.distanceUnit", { n: user.distance });
}

/** 返回上一页（右上角固定按钮） */
function goBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="content-page page-fade-in">
    <!-- 后台配置 H5 URL：web-view 加载 -->
    <web-view v-if="webUrl" :src="webUrl" class="content-webview" />

    <!-- 本地示例内容 -->
    <template v-else>
      <view class="content-header">
        <text class="content-header__title">{{ t('contentPages.nearby.title') }}</text>
        <view class="content-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
          <image class="content-header__back-icon" :src="backIcon" mode="aspectFit" alt="" />
        </view>
      </view>

      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.nearby.subtitle') }}</text>
          <view class="user-list" role="list">
            <view
              v-for="user in nearbyUsers"
              :key="user.id"
              class="user-card"
              role="button"
              :aria-label="`${user.nickname}，${user.school}，${distanceLabel(user)}`"
            >
              <image class="user-card__avatar" :src="user.avatar" mode="aspectFill" lazy-load alt="" />
              <view class="user-card__info">
                <text class="user-card__name">{{ user.nickname }}</text>
                <text class="user-card__school">{{ user.school }}</text>
              </view>
              <view class="user-card__distance">
                <text class="user-card__distance-text">{{ distanceLabel(user) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="content-footer-space" />
      </scroll-view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page, #f4f6fa);
}

.content-webview {
  flex: 1;
}

/* ========== 顶部栏（标题 + 右上角固定返回按钮） ========== */
.content-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.content-header__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.content-header__back {
  position: absolute;
  top: calc(var(--sp-4) + env(safe-area-inset-top));
  right: var(--sp-4);
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.content-header__back-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-inverse, #ffffff);
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  margin: var(--sp-5) var(--sp-4);
}

.content-section__title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-4);
}

/* ========== 附近的人列表 ========== */
.user-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.user-card {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.user-card__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-romance-100, #ffe4ec);
  flex-shrink: 0;
}

.user-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.user-card__name {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.user-card__school {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #5b6470);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__distance {
  flex-shrink: 0;
  background: var(--c-bg-brand, #e8f8f0);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.user-card__distance-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-brand-700);
  font-weight: 600;
}

.content-footer-space {
  height: calc(120rpx + env(safe-area-inset-bottom));
}
</style>
