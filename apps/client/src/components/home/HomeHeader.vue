<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
import { useSessionStore } from "../../stores/session";
import { useMessagesStore } from "../../stores/messages";
import { useProfileStore } from "../../stores/profile";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";

const props = withDefaults(defineProps<{ subtitle?: string; school?: string; locationText?: string }>(), {
  subtitle: "发现今天值得遇见的人",
  school: "",
  locationText: "",
});
defineEmits<{ (e: "schoolTap"): void; (e: "searchTap"): void; (e: "notifyTap"): void }>();

const schoolText = () => props.locationText || props.school || "北京大学 · 3km";

// 2026-09-03 遗留差异清零：通知角标"6"静态演示值 → 真实未读通知数（无未读时隐藏角标）
const messagesStore = useMessagesStore();
const { unreadNotificationCount } = storeToRefs(messagesStore);
const notifyBadge = computed(() => unreadNotificationCount.value);

// 2026-09-02 R5/R9：「我的快速账号」入口——独立数据源（sessionStore），不被 homeFeed/mock 覆盖
const sessionStore = useSessionStore();
// 2026-09-03（统一角色展示）：本人头像单一数据源 = profile.avatarUrl（App 启动登录后已拉取），
// 缺失时回落 session 头像 → 本地默认头像
const profileStore = useProfileStore();
// R9：全员真人头像后不再特判 person-01（它是正常真人头像）——直接取本人真实头像
const myAvatar = computed<string>(() => {
  if (profileStore.avatarUrl) return profileStore.avatarUrl;
  const u = sessionStore.userSession;
  if (u?.avatarUrl) return u.avatarUrl;
  return IMAGE_PATHS.DEFAULT_AVATAR;
});
const myNickname = (): string => {
  const u = sessionStore.userSession;
  if (u?.nickname && u.nickname !== '星野') return u.nickname;
  return u?.username || '我的';
};
function goMyProfile() {
  openAppPath(ROUTES.PROFILE.INDEX);
}
</script>

<template>
  <view class="home-header">
    <view class="home-header__top">
      <view class="header-left">
        <text class="home-header__title">首页</text>
        <!-- 2026-09-03 修复：图标经 resolveMediaUrl 本地化（http app-assets 被 base lib 3.16.2 拒载） -->
        <image class="home-header__heart" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED)" mode="aspectFit" alt="" />
      </view>
      <view class="header-right">
        <!-- 2026-09-02 R5：「我的快速账号」头像入口（数据源 sessionStore，不被 homeFeed/mock 覆盖） -->
        <view class="header-me" role="button" :aria-label="myNickname()" @tap="goMyProfile">
          <image class="header-me__avatar" :src="resolveMediaUrl(myAvatar)" mode="aspectFill" />
        </view>
        <view class="header-location" role="button" aria-label="定位" @tap="$emit('schoolTap')">
          <image class="header-location__pin" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.LOCATION_PIN)" mode="aspectFit" />
          <text class="header-location__text">{{ schoolText() }}</text>
        </view>
        <view class="header-icon" role="button" aria-label="通知" @tap="$emit('notifyTap')">
          <image class="header-icon__bell" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.HEADER_BELL)" mode="aspectFit" />
          <!-- 真实未读通知数驱动（0 时隐藏，替代静态演示值 6） -->
          <view v-if="notifyBadge > 0" class="header-badge">
            <text class="header-badge__text">{{ notifyBadge > 99 ? "99+" : notifyBadge }}</text>
          </view>
        </view>
      </view>
    </view>
    <text class="home-header__subtitle">{{ subtitle }}</text>
  </view>
</template>

<style scoped lang="scss">
.home-header {
  /* 右侧避让微信胶囊：--capsule-right 仅是胶囊右缘到屏幕右缘的间隙（≈7px），
     预留量必须再加胶囊本体宽度（标准 87px），否则头像/定位/铃铛被胶囊叠压 */
  padding: calc(env(safe-area-inset-top) + 20rpx) calc(var(--capsule-right, 7px) + 104px) 16rpx 40rpx;
}

.home-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.home-header__title {
  font-size: 48rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.1;
  /* R20：标题恒单行（右侧元素挤压时不得竖排折行） */
  white-space: nowrap;
  flex-shrink: 0;
}

.home-header__heart {
  width: 36rpx;
  height: 36rpx;
  margin-left: 4rpx;
  color: #FF6B81;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.header-location {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.header-location__pin {
  width: 32rpx;
  height: 32rpx;
}

.header-location__text {
  font-size: 24rpx;
  color: #6B7571;
  font-weight: 500;
  /* R20：定位文案超长时省略，避免把标题区挤到折行 */
  max-width: 220rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header-icon {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 2026-09-02 R5：「我的快速账号」头像入口——独立 token（不被 homeFeed 覆盖） */
.header-me {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 2rpx solid #36C99A;
}

.header-me__avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.header-icon__bell {
  width: 36rpx;
  height: 36rpx;
}

.header-badge {
  position: absolute;
  top: -4rpx;
  right: -6rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background: #FF6B81;
  border: 2rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.header-badge__text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

.home-header__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #9AA39F;
}
</style>
