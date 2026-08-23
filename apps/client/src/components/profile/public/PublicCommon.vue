<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ commonInterests: string[] }>();

const COLORS = [
  { bg: "#E8FBF3", fg: "#36C99A", icon: "♡" },
  { bg: "#EEF3FF", fg: "#4D8DFF", icon: "♥" },
  { bg: "#FFF1E8", fg: "#FF9F43", icon: "★" },
  { bg: "#FFF0F6", fg: "#FF6B81", icon: "✿" },
];

const items = computed(() =>
  props.commonInterests.slice(0, 4).map((raw, index) => {
    const parts = raw.split("/").map((s) => s.trim()).filter(Boolean);
    const color = COLORS[index % COLORS.length] ?? COLORS[0];
    return {
      key: `${index}-${raw}`,
      title: parts[0] || raw,
      subtitle: parts[1] || "",
      ...color,
    };
  })
);
</script>

<template>
  <view v-if="commonInterests.length > 0" class="public-common">
    <view class="public-common__head">
      <text class="public-common__title">
        我们有 <text class="public-common__num">{{ commonInterests.length }}</text> 个共同点
      </text>
    </view>
    <view class="public-common__items">
      <view v-for="item in items" :key="item.key" class="public-common__item">
        <view class="public-common__icon" :style="{ background: item.bg }">
          <text class="public-common__icon-text" :style="{ color: item.fg }">{{ item.icon }}</text>
        </view>
        <text class="public-common__item-title">{{ item.title }}</text>
        <text v-if="item.subtitle" class="public-common__item-sub">{{ item.subtitle }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-common {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 28rpx 32rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.public-common__head {
  margin-bottom: 24rpx;
}

.public-common__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.public-common__num {
  color: #FF6B81;
}

.public-common__items {
  display: flex;
  gap: 16rpx;
}

.public-common__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  text-align: center;
  min-width: 0;
}

.public-common__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-common__icon-text {
  font-size: 30rpx;
  font-weight: 800;
}

.public-common__item-title {
  font-size: 22rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.3;
}

.public-common__item-sub {
  font-size: 20rpx;
  color: #9AA39F;
  line-height: 1.3;
}
</style>
