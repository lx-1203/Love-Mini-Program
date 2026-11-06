<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { UserProfileSocialProof } from "../../../types/profile";
import { PROFILE_STATS } from "../../../config/profile-stats";

const props = defineProps<{ socialProof: UserProfileSocialProof }>();
const emit = defineEmits<{ (e: "tap", key: string): void }>();
const { t } = useI18n();

/* R16-2（2026-11-05 跨车道共享，原 TODO 划除）：四宫格常量收口到 config/profile-stats.ts
   单一真相源（与 NotLoggedProfile 未登录态同口径）；label 从裸中文改走词条——四条文案
   与原字面量逐字一致（我喜欢/喜欢我的/我赞/访客），裸中文基线随之 -4。 */
const items = computed(() =>
  PROFILE_STATS.map((s) => ({
    key: s.key,
    label: t(s.labelKey),
    iconSrc: s.iconSrc,
    color: s.color,
  }))
);

function statValue(key: string, socialProof: UserProfileSocialProof): number {
  if (key === "iLike") return socialProof.iLikeCount ?? 0;
  if (key === "likedMe") return socialProof.likedMeCount ?? 0;
  if (key === "praised") return socialProof.praisedCount ?? socialProof.likesCount ?? 0;
  return socialProof.visitorCount ?? 0;
}
</script>

<template>
  <view class="my-stats">
    <view
      v-for="item in items"
      :key="item.key"
      class="my-stats__col"
      hover-class="my-stats__col--pressed"
      @tap="emit('tap', item.key)"
    >
      <view class="my-stats__icon" :style="{ background: `${item.color}22` }">
        <image class="my-stats__icon-img" :src="item.iconSrc" mode="aspectFit" alt="" />
      </view>
      <text class="my-stats__value">
        {{ statValue(item.key, props.socialProof) }}
      </text>
      <text class="my-stats__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-stats {
  margin: var(--page-padding) var(--page-padding) 0;
  /* V-04（第五轮 QA）：4 列统计上下内边距 28→32rpx，数字与图标呼吸感 */
  padding: 32rpx 8rpx;
  border-radius: 32rpx;
  background: var(--c-bg-container);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  display: flex;
}

.my-stats__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* V-04：列内 icon/数字/标签间距 10→12rpx */
  gap: 12rpx;
  position: relative;
}

.my-stats__col:not(:first-child)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 1rpx;
  background: #EEF1F5;
}

.my-stats__col--pressed {
  opacity: 0.75;
}

.my-stats__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-stats__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.my-stats__value {
  font-size: 34rpx;
  font-weight: 800;
  color: #333A37;
}

.my-stats__label {
  font-size: 22rpx;
  color: #9AA39F;
}
</style>
