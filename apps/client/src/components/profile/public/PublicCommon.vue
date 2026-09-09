<script setup lang="ts">
import { computed } from "vue";
import InterestTag from "../common/InterestTag.vue";

const props = withDefaults(defineProps<{ commonInterests: string[] }>(), {
  commonInterests: () => [],
});

/** 2026-09-06 标签化改版：共同点由「图标圆圈（爱心兜底）」改为与兴趣标签一致的胶囊标签流。
 * 原图标方案在素材缺失时退化为爱心图标，观感与信息标签体系割裂；现统一走 InterestTag。 */
const MAX_VISIBLE = 8;

const tags = computed(() =>
  props.commonInterests
    .map((raw) => raw.split("/").map((s) => s.trim()).filter(Boolean).join(" · "))
    .filter(Boolean)
    .slice(0, MAX_VISIBLE),
);
</script>

<template>
  <view v-if="commonInterests.length > 0" class="public-common">
    <view class="public-common__head">
      <text class="public-common__title">
        我们有 <text class="public-common__num">{{ commonInterests.length }}</text> 个共同点
      </text>
    </view>
    <scroll-view scroll-x class="public-common__scroll" :show-scrollbar="false">
      <view class="public-common__tags">
        <InterestTag v-for="tag in tags" :key="tag" :label="tag" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.public-common {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 32rpx;
  border-radius: 40rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.public-common__head {
  margin-bottom: 18rpx;
}

.public-common__title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333A37;
}

.public-common__num {
  color: #FF6B81;
}

.public-common__scroll {
  white-space: nowrap;
}

.public-common__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 4rpx;
}
</style>
