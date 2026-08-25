<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";

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

const genderIconSrc = computed(() => {
  if (props.profile.basic.gender === "female") return IMAGE_PATHS.ICONS_EMOJI.GENDER_FEMALE;
  if (props.profile.basic.gender === "male") return IMAGE_PATHS.ICONS_EMOJI.GENDER_MALE;
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
        <image class="my-header__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.SETTINGS" mode="aspectFit" alt="" />
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
          <image class="my-header__cert-dot-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK" mode="aspectFit" alt="" />
        </view>
      </view>

      <view class="my-header__info">
        <view class="my-header__name-row">
          <text class="my-header__name">{{ props.profile.basic.name }}</text>
          <image v-if="genderIconSrc" class="my-header__gender" :src="genderIconSrc" mode="aspectFit" alt="" />
          <view class="my-header__online"><text class="my-header__online-text">在线</text></view>
        </view>
        <text v-if="metaLine" class="my-header__meta">{{ metaLine }}</text>
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
  background: linear-gradient(160deg, #E8F5E9 0%, #F0FFF0 100%);
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
  color: #333333;
}

.my-header__icon-img {
  width: 34rpx;
  height: 34rpx;
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
  border: 6rpx solid #FFFFFF;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
  background: #E8FBF3;
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
  width: 26rpx;
  height: 26rpx;
}

.my-header__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-top: 16rpx;
}

.my-header__online {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.my-header__online-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
  line-height: 1.6;
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
  color: #222222;
  line-height: 1.1;
}

.my-header__meta {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}

.my-header__gender {
  width: 34rpx;
  height: 34rpx;
  margin-left: 8rpx;
  color: #FF6B9D;
}

.my-header__cert {
  align-self: flex-start;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid rgba(54, 201, 154, 0.5);
}

.my-header__cert-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #36C99A;
}

.my-header__bio {
  font-size: 24rpx;
  color: #555555;
  line-height: 1.5;
}

.my-header__right {
  flex-shrink: 0;
  padding-top: 20rpx;
}

.my-header__edit {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.my-header__edit--pressed {
  opacity: 0.85;
}

.my-header__edit-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #222222;
}
</style>
