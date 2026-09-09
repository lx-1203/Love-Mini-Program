<script setup lang="ts">
import { computed } from "vue";
import type { MatchCardUser } from "../../types/match";
import { IMAGE_PATHS } from "../../config/images";

const props = defineProps<{
  user: MatchCardUser;
}>();

const genderIconSrc = computed(() => {
  if (props.user.gender === "female") return IMAGE_PATHS.ICONS_EMOJI.GENDER_FEMALE;
  if (props.user.gender === "male") return IMAGE_PATHS.ICONS_EMOJI.GENDER_MALE;
  return "";
});

const school = computed(() => props.user.school || "");
const secondary = computed(() => props.user.gradeLabel || props.user.occupation || "");

function activeLabel(status?: string): string {
  if (!status || status === "offline") return "";
  if (status === "online" || status === "just_now" || status === "在线") return "在线";
  if (status === "today") return "今天活跃";
  const m = /^hours_(\d+)$/.exec(status);
  if (m) return `${m[1]}小时前活跃`;
  const d = /^days_(\d+)$/.exec(status);
  if (d) return `${d[1]}天前活跃`;
  return "";
}

const distanceLine = computed(() => {
  const parts = [props.user.distanceText, activeLabel(props.user.activeStatusText)].filter(Boolean);
  return parts.join(" · ");
});

const intro = computed(() => props.user.headline || "");

const visibleTags = computed(() => props.user.tags.slice(0, 4));

const verified = computed(
  () =>
    !!props.user.verificationBadgeLevel &&
    props.user.verificationBadgeLevel !== "none"
);
</script>

<template>
  <view class="match-info">
    <slot name="basic">
      <view class="match-info__name-row">
        <text class="match-info__name">{{ user.name }}</text>
        <text v-if="user.age" class="match-info__age">{{ user.age }}</text>
        <view v-if="genderIconSrc" class="match-info__gender" :class="`match-info__gender--${user.gender}`">
          <image class="match-info__gender-symbol" :src="genderIconSrc" mode="aspectFit" alt="" />
        </view>
        <view v-if="verified" class="match-info__verified">
          <image class="match-info__verified-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK" mode="aspectFit" alt="" />
        </view>
      </view>
      <view v-if="school" class="match-info__school-row">
        <text class="match-info__school">{{ school }}</text>
        <!-- R21：补「·」分隔（对齐理想图 北京大学 · 设计学院） -->
        <text v-if="secondary" class="match-info__school-dot">·</text>
        <text v-if="secondary" class="match-info__college">{{ secondary }}</text>
      </view>
      <text v-if="distanceLine" class="match-info__distance">{{ distanceLine }}</text>
    </slot>

    <slot name="tags">
      <view v-if="visibleTags.length > 0" class="match-info__tags">
        <text
          v-for="tag in visibleTags"
          :key="tag"
          class="match-info__tag"
        >{{ tag }}</text>
      </view>
    </slot>

    <slot name="intro">
      <view v-if="intro" class="match-info__intro">
        <text class="match-info__intro-quote">❝</text>
        <text class="match-info__intro-text">{{ intro }}</text>
      </view>
    </slot>

    <slot name="extra" />
  </view>
</template>

<style scoped lang="scss">
.match-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.match-info__name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.match-info__name {
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.15;
  color: #ffffff;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.35);
}

.match-info__age {
  font-size: 40rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.95);
}

/* 性别徽章：20×20px 圆形底色 + 白色符号（男蓝 #54A0FF / 女粉 #FF6B81） */
.match-info__gender {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.match-info__gender--male {
  background: #54A0FF;
}

.match-info__gender--female {
  background: #FF6B81;
}

.match-info__gender-symbol {
  width: 26rpx;
  height: 26rpx;
  color: #ffffff;
}

.match-info__verified {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #36C99A;
  color: #ffffff;
}

.match-info__verified-icon {
  width: 20rpx;
  height: 20rpx;
  color: #ffffff;
}

/* 学校 16px Medium + 学院 14px 70% 白 */
.match-info__school-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  flex-wrap: wrap;
}

.match-info__school {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

.match-info__college {
  font-size: 28rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
}

.match-info__school-dot {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 距离+在线 14px 70% 白 */
.match-info__distance {
  font-size: 28rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
}

/* 兴趣标签：24px 高、半透明白底、1px 白边框、12px 白字 */
.match-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 4rpx;
}

.match-info__tag {
  height: 48rpx;
  line-height: 48rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  font-size: 24rpx;
  font-weight: 400;
  color: #ffffff;
}

/* 个性签名：引号 16px + 白色 14px，两行 */
.match-info__intro {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 4rpx;
}

.match-info__intro-quote {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;
}

.match-info__intro-text {
  flex: 1;
  font-size: 28rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

