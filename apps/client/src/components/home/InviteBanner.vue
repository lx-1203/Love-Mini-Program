<script setup lang="ts">
/**
 * 邀请好友 Banner
 * 2026-08-25 P0：文案接入 i18n（home.inviteTitle / home.inviteSubtitle），与规格书 3.15 对齐
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

const { t } = useI18n();
defineEmits<{ (e: "invite"): void }>();
</script>

<template>
  <view class="invite-banner" @tap="$emit('invite')">
    <view class="invite-banner__icon">
      <image class="invite-banner__icon-text" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.GIFT)" mode="aspectFit" alt="" />
    </view>
    <view class="invite-banner__body">
      <text class="invite-banner__title">{{ t('home.inviteTitle') }}</text>
      <text class="invite-banner__desc">{{ t('home.inviteSubtitle') }}</text>
    </view>
    <!-- 2026-10-26 对齐理想图（首页.png 邀请横幅）：完整带翅膀爱心插画置于「去邀请」按钮左侧
         （原为右下角露出一角的 HeartFilled 装饰，素材取自理想图裁切，见 IN_PACKAGE_ASSETS 登记表） -->
    <image
      class="invite-banner__wing"
      :src="resolveMediaUrl(IMAGE_PATHS.INVITE_WINGED_HEART)"
      mode="aspectFit"
      alt=""
    />
    <view class="invite-banner__btn">
      <text class="invite-banner__btn-text">去邀请</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.invite-banner {
  position: relative;
  /* 2026-09-04 问题5修复：banner 下方由首页 .home-section-gap（tabBar 净空区）兜底，
     上方与 CommunityFeed 之间留 16rpx 间距即可，去掉原 16rpx 下 margin */
  margin: 16rpx var(--page-padding) 0;
  padding: 24rpx 28rpx;
  border-radius: 40rpx;
  /* R20（2026-09-08）：高饱和粉渐变（#FF6B81→#FF8DA1 满铺）与页面浅绿主色冲突突兀，
     对齐理想图改为浅粉云底 + 深粉点缀：背景降饱和，强调色只保留在图标/按钮上 */
  background: linear-gradient(135deg, #FFEDF0 0%, #FFE4E9 100%);
  border: 1rpx solid #FFD9DF;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 129, 0.12);
  display: flex;
  align-items: center;
  gap: 20rpx;
  overflow: hidden;
}

.invite-banner__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.invite-banner__icon-text {
  width: 34rpx;
  height: 34rpx;
  color: #ffffff;
  /* 使用说明 §1.6 第 6 条：装饰 image 不吃 tap（mp-weixin iOS WebView 原生 <image> 会吞所在容器 hit-area） */
  pointer-events: none;
}

.invite-banner__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.invite-banner__title {
  font-size: 30rpx;
  font-weight: 700;
  color: #47393C;
}

.invite-banner__desc {
  font-size: 22rpx;
  color: #A98F94;
}

/* 2026-10-26：装饰插画已改为文档流内元素，CTA 不再依赖 z-index 抗覆盖（保留层级以防重叠回归） */
.invite-banner__btn {
  position: relative;
  z-index: 1;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%);
  box-shadow: 0 6rpx 16rpx rgba(255, 107, 129, 0.3);
}

.invite-banner__btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

/* 2026-10-26：完整带翅膀爱心插画，文档流内置于按钮左侧（不再 absolute 露角） */
.invite-banner__wing {
  width: 88rpx;
  height: 56rpx;
  flex-shrink: 0;
  /* MP-R2VIS-PAGES-HOME-INDEX-002（使用说明 §1.6 第 6 条）：纯装饰 image 不得参与 hit-test，
     否则 mp-weixin iOS WebView 原生 <image> 吞掉「去邀请」CTA 热区。必须写 CSS 形式。 */
  pointer-events: none;
}
</style>
