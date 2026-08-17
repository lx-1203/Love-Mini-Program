<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";

const props = withDefaults(defineProps<{
  profile: UserProfileDTO;
  editLabel?: string;
}>(), {
  editLabel: "编辑资料",
});

const emit = defineEmits<{
  (e: "edit"): void;
  (e: "tapAvatar"): void;
}>();

function handleSettings() {
  uni.navigateTo({ url: "/pages/settings/index" });
}

function handleShare() {
  uni.showToast({ title: "分享功能即将上线", icon: "none" });
}

const metaLine = computed(() => {
  const parts: string[] = [];
  if (props.profile.basic.age) parts.push(`${props.profile.basic.age}岁`);
  if (props.profile.basic.location) parts.push(props.profile.basic.location);
  return parts.join(" · ");
});

const certLabel = computed(() => {
  if (!props.profile.identity.verified) return "";
  return props.profile.identity.student ? "学生认证" : "已认证";
});

const genderSymbol = computed(() => {
  if (props.profile.basic.gender === "female") return "♀";
  if (props.profile.basic.gender === "male") return "♂";
  return "";
});
</script>

<template>
  <view class="my-header">
    <view class="my-header__icons">
      <view class="my-header__icon" hover-class="my-header__icon--pressed" role="button" aria-label="分享" @tap="handleShare">
        <text class="my-header__icon-text">▦</text>
      </view>
      <view class="my-header__icon" hover-class="my-header__icon--pressed" role="button" aria-label="设置" @tap="handleSettings">
        <text class="my-header__icon-text">⚙</text>
      </view>
    </view>
    <view class="my-header__content">
      <view class="my-header__avatar" @tap="emit('tapAvatar')">
        <image
          v-if="props.profile.basic.avatar"
          class="my-header__avatar-img"
          :src="props.profile.basic.avatar"
          mode="aspectFill"
          alt=""
        />
        <text v-else class="my-header__avatar-initial">{{ (props.profile.basic.name || "?").charAt(0) }}</text>
        <view v-if="props.profile.identity.verified" class="my-header__cert-dot">
          <text class="my-header__cert-dot-icon">✓</text>
        </view>
      </view>

      <view class="my-header__info">
        <view class="my-header__name-row">
          <text class="my-header__name">{{ props.profile.basic.name }}</text>
          <text v-if="genderSymbol" class="my-header__gender">{{ genderSymbol }}</text>
          <text v-if="metaLine" class="my-header__meta">{{ metaLine }}</text>
        </view>
        <view v-if="certLabel" class="my-header__cert">
          <text class="my-header__cert-text">{{ certLabel }}</text>
        </view>
        <text v-if="props.profile.intro.bio" class="my-header__bio">{{ props.profile.intro.bio }}</text>
      </view>

      <view class="my-header__right">
        <view class="my-header__edit" hover-class="my-header__edit--pressed" @tap="emit('edit')">
          <text class="my-header__edit-text">{{ editLabel }}</text>
        </view>
      </view>
    </view>
    <slot name="bottom" />
  </view>
</template>

<style scoped lang="scss">
.my-header {
  position: relative;
  padding: 48rpx 32rpx 56rpx;
  background: linear-gradient(180deg, #36C99A 0%, #B8F0DE 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.my-header__icons {
  position: absolute;
  top: 28rpx;
  right: calc(var(--capsule-right, 96px) + 20rpx);
  display: flex;
  gap: 16rpx;
  z-index: 2;
}

.my-header__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-header__icon--pressed {
  opacity: 0.75;
}

.my-header__icon-text {
  font-size: 30rpx;
  color: #ffffff;
}

.my-header__content {
  display: flex;
  align-items: flex-start;
  gap: 28rpx;
}

.my-header__avatar {
  position: relative;
  flex-shrink: 0;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  border: 6rpx solid #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
  background: #E8FBF2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-header__avatar-img {
  width: 100%;
  height: 100%;
}

.my-header__avatar-initial {
  font-size: 64rpx;
  font-weight: 800;
  color: #36C99A;
}

.my-header__cert-dot {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #36C99A;
  border: 4rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-header__cert-dot-icon {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 800;
}

.my-header__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-top: 16rpx;
}

.my-header__name-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
}

.my-header__name {
  font-size: 52rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
}

.my-header__meta {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 500;
}

.my-header__gender {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.my-header__cert {
  align-self: flex-start;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
}

.my-header__cert-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #ffffff;
}

.my-header__bio {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.5;
}

.my-header__right {
  flex-shrink: 0;
  padding-top: 20rpx;
}

.my-header__edit {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.25);
  border: 1rpx solid rgba(255, 255, 255, 0.4);
}

.my-header__edit--pressed {
  opacity: 0.85;
}

.my-header__edit-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
