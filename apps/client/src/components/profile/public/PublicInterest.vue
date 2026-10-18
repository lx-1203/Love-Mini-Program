<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import InterestTag from "../common/InterestTag.vue";
// R2b-L06-D16：标签 value → 中文展示文案的唯一映射源（utils/tag-label，
// 命中 profileTagGroups 走 i18n、未命中走英文别名表、再未命中原样透传）。
// discover 侧（CardSwiper / MatchInfo / nearby/people）早已用它，本页此前直接把
// 服务端英文原值（running / movies / reading / photography）透出 → 整页唯一一处非中文。
import { tagLabelsFor } from "../../../utils/tag-label";

const props = withDefaults(defineProps<{ tags: string[] }>(), {
  tags: () => [],
});

const { t } = useI18n();

/** 去重：映射后可能出现「跑步 / 夜跑」这类同义项撞名 */
const labels = computed(() => Array.from(new Set(tagLabelsFor(props.tags, t))));
</script>

<template>
  <view class="public-interest">
    <text class="public-interest__title">兴趣标签</text>
    <scroll-view v-if="labels.length > 0" scroll-x class="public-interest__scroll" :show-scrollbar="false">
      <view class="public-interest__tags">
        <InterestTag v-for="(label, index) in labels" :key="`${label}-${index}`" :label="label" />
      </view>
    </scroll-view>
    <!-- R2b-L06-D18：无标签时保留标题 + 空态文案，不让整节消失（他人主页需要真实页面高度） -->
    <text v-else class="public-interest__empty">TA 还没有填写兴趣标签</text>
  </view>
</template>

<style scoped lang="scss">
.public-interest {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 32rpx;
  border-radius: 40rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.public-interest__title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333A37;
}

.public-interest__scroll {
  white-space: nowrap;
}

.public-interest__tags {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 4rpx;
}

.public-interest__empty {
  font-size: 26rpx;
  color: var(--c-text-quaternary, #9AA39F);
}
</style>
