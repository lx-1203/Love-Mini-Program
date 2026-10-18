<script setup lang="ts">
withDefaults(defineProps<{ bio: string }>(), { bio: "" });
</script>

<template>
  <view class="public-bio">
    <text class="public-bio__quote">❝</text>
    <text class="public-bio__text" :class="{ 'public-bio__text--empty': !bio }">{{ bio || "TA 还没有填写简介" }}</text>
  </view>
</template>

<style scoped lang="scss">
.public-bio {
  margin: 24rpx 24rpx 0;
  padding: 24rpx 28rpx;
  border-radius: 32rpx;
  /* R2b-L06-D15：理想图（他人显示主页.png 简介块）是「白卡 + 淡投影」浮在浅灰绿页面底之上，
     明暗关系为「卡片亮、页面暗」。原实现反了：页面底 #ffffff（PublicProfile.vue:103）、
     本卡填灰绿 #F2F7F5 ⇒ 简介卡读起来像禁用态。底色改白 + 与身份卡同档投影，
     页面底改 --c-bg-page 浅灰绿（那一半落在 PublicProfile.vue，同属本域）。
     白卡用字面量：本页其余卡片（身份卡/兴趣卡/相册卡）当前均为硬编码白，保持一致。 */
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.public-bio__quote {
  font-size: 40rpx;
  color: var(--c-text-quaternary, #9AA39F);
  line-height: 1;
}

.public-bio__text {
  flex: 1;
  font-size: var(--fs-md, 26rpx);
  line-height: 1.6;
  color: var(--c-text-secondary, #4A524E);
}

/* R2b-L06-D18：无简介时保留卡片与占位文案，不让整块塌陷（页面需要真实滚动高度） */
.public-bio__text--empty {
  color: var(--c-text-quaternary, #9AA39F);
}
</style>
