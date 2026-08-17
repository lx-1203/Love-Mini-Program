<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";

const props = defineProps<{ profile: UserProfileDTO }>();
const emit = defineEmits<{ (e: "like"): void; (e: "message"): void }>();

const metaLine = computed(() => {
  const parts: string[] = [];
  if (props.profile.basic.age) parts.push(`${props.profile.basic.age}岁`);
  if (props.profile.basic.location) parts.push(props.profile.basic.location);
  return parts.join(" · ");
});

const certText = computed(() => {
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
  <view class="public-identity">
    <view class="public-identity__main">
      <view class="public-identity__info">
        <view class="public-identity__name-row">
          <text class="public-identity__name">{{ profile.basic.name }}</text>
          <text v-if="genderSymbol" class="public-identity__gender">{{ genderSymbol }}</text>
          <view v-if="certText" class="public-identity__online">
            <text class="public-identity__online-dot"></text>
            <text class="public-identity__online-text">在线</text>
          </view>
          <text v-if="metaLine" class="public-identity__meta">{{ metaLine }}</text>
        </view>
        <text v-if="profile.relation.matchScore" class="public-identity__match">
          匹配度 {{ profile.relation.matchScore }}%
        </text>
      </view>
      <view class="public-identity__actions">
        <view class="public-identity__btn public-identity__btn--like" hover-class="public-identity__btn--pressed" @tap="emit('like')">
          <text class="public-identity__btn-text public-identity__btn-text--like">喜欢</text>
        </view>
        <view class="public-identity__btn public-identity__btn--hello" hover-class="public-identity__btn--pressed" @tap="emit('message')">
          <text class="public-identity__btn-text">打招呼</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-identity {
  margin: -72rpx 24rpx 0;
  padding: 100rpx 32rpx 32rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 4;
}

.public-identity__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.public-identity__info {
  flex: 1;
  min-width: 0;
}

.public-identity__name-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
}

.public-identity__name {
  font-size: 52rpx;
  font-weight: 800;
  color: #222222;
  line-height: 1.15;
}

.public-identity__meta {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}

.public-identity__gender {
  font-size: 30rpx;
  font-weight: 700;
  color: #FF6B81;
}

.public-identity__online {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #E8FAF3;
}

.public-identity__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #36C99A;
}

.public-identity__online-text {
  font-size: 20rpx;
  color: #36C99A;
  font-weight: 500;
}

.public-identity__match {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #FF6B81;
  font-weight: 500;
}

.public-identity__cert {
  align-self: flex-start;
  margin-top: 12rpx;
  display: inline-flex;
  align-items: center;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #E8FBF2;
}

.public-identity__cert-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #168B65;
}

.public-identity__actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  flex-shrink: 0;
}

.public-identity__btn {
  padding: 12rpx 30rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-identity__btn--pressed {
  opacity: 0.8;
}

.public-identity__btn--like {
  background: #ffffff;
  border: 2rpx solid #FF6B81;
}

.public-identity__btn--hello {
  background: #36C99A;
  box-shadow: 0 6rpx 16rpx rgba(61, 201, 148, 0.3);
}

.public-identity__btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.public-identity__btn-text--like {
  color: #FF6B81;
}
</style>
