<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";

const props = defineProps<{ profile: UserProfileDTO; online?: boolean }>();
const emit = defineEmits<{ (e: "like"): void; (e: "message"): void }>();

/** 基本信息行：年龄 / 城市 / 学校（location 形如 "北京 · 北京大学"） */
const basicInfo = computed(() => {
  const parts: string[] = [];
  if (props.profile.basic.age) parts.push(`${props.profile.basic.age}岁`);
  const loc = props.profile.basic.location || "";
  const [city, school] = loc.split("·").map((s) => s.trim());
  if (city) parts.push(city);
  if (school) parts.push(school);
  return parts;
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
          <view v-if="genderSymbol" class="public-identity__gender" :class="`public-identity__gender--${profile.basic.gender}`">
            <text class="public-identity__gender-symbol">{{ genderSymbol }}</text>
          </view>
          <view v-if="online" class="public-identity__online">
            <text class="public-identity__online-dot"></text>
            <text class="public-identity__online-text">在线</text>
          </view>
        </view>
        <text v-if="profile.relation.matchScore" class="public-identity__match">
          匹配度 {{ profile.relation.matchScore }}%
        </text>
      </view>
      <view class="public-identity__actions">
        <view class="public-identity__btn public-identity__btn--like" hover-class="public-identity__btn--pressed" @tap="emit('like')">
          <image class="public-identity__btn-icon" :src="IMAGE_PATHS.ICONS_V2.HEART_WHITE" mode="aspectFit" alt="" />
        </view>
        <view class="public-identity__btn public-identity__btn--hello" hover-class="public-identity__btn--pressed" @tap="emit('message')">
          <image class="public-identity__btn-icon" :src="IMAGE_PATHS.ICONS_V2.CHAT_GREEN" mode="aspectFit" alt="" />
        </view>
      </view>
    </view>
    <view v-if="basicInfo.length" class="public-identity__meta-row">
      <template v-for="(part, index) in basicInfo" :key="part">
        <text v-if="index > 0" class="public-identity__meta-sep">·</text>
        <text class="public-identity__meta-item">{{ part }}</text>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-identity {
  margin: -72rpx 40rpx 0;
  padding: 112rpx 32rpx 28rpx;
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
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.public-identity__name {
  font-size: 44rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.2;
}

/* 性别徽章：20×20px 圆形底色 + 白色符号（男蓝 #54A0FF / 女粉 #FF6B81） */
.public-identity__gender {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-identity__gender--male {
  background: #54A0FF;
}

.public-identity__gender--female {
  background: #FF6B81;
}

.public-identity__gender-symbol {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
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

/* 右侧按钮组：40px 喜欢（粉圆白心）+ 40px 打招呼（白圆绿气泡） */
.public-identity__actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.public-identity__btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-identity__btn--pressed {
  transform: scale(0.92);
}

.public-identity__btn--like {
  background: #FF6B81;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 129, 0.3);
}

.public-identity__btn--hello {
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.public-identity__btn-icon {
  width: 40rpx;
  height: 40rpx;
}

/* 基本信息行：13px 图标+文字，· 分隔 */
.public-identity__meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 20rpx;
}

.public-identity__meta-item {
  font-size: 26rpx;
  color: #6B7571;
}

.public-identity__meta-sep {
  font-size: 26rpx;
  color: #DDE3E0;
}
</style>
