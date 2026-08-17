<script setup lang="ts">
import { computed } from "vue";
import type { MatchCardUser } from "../../types/match";

const props = defineProps<{
  user: MatchCardUser;
}>();

const genderSymbol = computed(() => {
  if (props.user.gender === "female") return "♀";
  if (props.user.gender === "male") return "♂";
  return "";
});

const metaText = computed(() => {
  const parts = [props.user.school, props.user.gradeLabel || props.user.occupation].filter(Boolean);
  return parts.join(" · ");
});

function activeLabel(status?: string): string {
  if (!status || status === "offline") return "";
  if (status === "online" || status === "just_now") return "在线";
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

/** 标签配色：半透明白色胶囊 + 白字（参考图） */
const TAG_STYLES = [
  { bg: "rgba(255,255,255,0.22)", color: "#ffffff" },
  { bg: "rgba(255,255,255,0.22)", color: "#ffffff" },
  { bg: "rgba(255,255,255,0.22)", color: "#ffffff" },
  { bg: "rgba(255,255,255,0.22)", color: "#ffffff" },
] as const;

function tagStyle(index: number) {
  return TAG_STYLES[index % TAG_STYLES.length] ?? TAG_STYLES[0];
}
</script>

<template>
  <view class="match-info">
    <slot name="basic">
      <view class="match-info__name-row">
        <text class="match-info__name">{{ user.name }}</text>
        <text v-if="user.age" class="match-info__age">{{ user.age }}</text>
        <text v-if="genderSymbol" class="match-info__gender">{{ genderSymbol }}</text>
        <text v-if="verified" class="match-info__verified">✓</text>
      </view>
      <text v-if="metaText" class="match-info__meta">{{ metaText }}</text>
      <text v-if="distanceLine" class="match-info__distance">{{ distanceLine }}</text>
    </slot>

    <slot name="tags">
      <view v-if="visibleTags.length > 0" class="match-info__tags">
        <text
          v-for="(tag, index) in visibleTags"
          :key="tag"
          class="match-info__tag"
          :style="{ background: tagStyle(index).bg, color: tagStyle(index).color }"
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
  font-size: 52rpx;
  font-weight: 900;
  line-height: 1.1;
  color: #ffffff;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.35);
}

.match-info__age {
  font-size: 34rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.match-info__gender {
  font-size: 30rpx;
  font-weight: 800;
  color: #FF6B81;
}

.match-info__verified {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #36C99A;
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 800;
}

.match-info__meta,
.match-info__distance {
  font-size: 24rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.match-info__distance {
  color: rgba(255, 255, 255, 0.7);
}

.match-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 4rpx;
}

.match-info__tag {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.match-info__intro {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 16rpx 22rpx;
  border-radius: 18rpx;
  background: rgba(0, 0, 0, 0.32);
  margin-top: 4rpx;
}

.match-info__intro-quote {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1;
}

.match-info__intro-text {
  flex: 1;
  font-size: 23rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.96);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
