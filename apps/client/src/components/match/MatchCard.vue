<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import SwipeContainer from "../common/swipe/SwipeContainer.vue";
import SafeImage from "../common/SafeImage.vue";
import MatchInfo from "./MatchInfo.vue";
import { IMAGE_PATHS } from "../../config/images";
import type { MatchCardUser } from "../../types/match";

const props = withDefaults(
  defineProps<{
    user: MatchCardUser;
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{
  /* MP-R1-PAGES-DISCOVER-INDEX-005：对外点击事件由 "tap" 更名 "card-tap"，
     与原生 tap 冒泡脱钩，防止 mp-weixin 端单次点击双通道重复触发 */
  (e: "card-tap"): void;
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
}>();

const { t } = useI18n();

/* 2026-09-12：无照片用户的卡片兜底从默认头像升级为匹配卡主视觉
   （match-card-hero，含底部文字预留层；有照片用户不受影响） */
const photo = computed(() => props.user.photo || props.user.avatar || IMAGE_PATHS.MATCH_CARD.HERO);

const onlineText = computed(() => {
  if (props.user.onlineStatus === "online" || props.user.activeStatusText === "online" || props.user.activeStatusText === "just_now") return t("matchV1.online");
  return "";
});

const distanceText = computed(() => {
  const raw = props.user.distanceText;
  if (raw && raw.trim().length > 0) {
    const value = raw.trim();
    // 纯数字（如 "1.2"）：自动补 km 单位 → "1.2km"
    if (/^\d+(\.\d+)?$/.test(value)) return `${value}km`;
    // 已带单位（"km" / "米"）或 "同校" 等非数值文案：原样保留
    return value;
  }
  if (props.user.isSameSchool) return t("matchV1.sameSchool");
  return "";
});

const isOnline = computed(() => props.user.onlineStatus === "online" || props.user.activeStatusText === "online" || props.user.activeStatusText === "just_now");

</script>

<template>
  <SwipeContainer
    class="match-card-swipe"
    :disabled="disabled"
    @card-tap="emit('card-tap')"
    @swipe-left="emit('swipe-left')"
    @swipe-right="emit('swipe-right')"
  >
    <view class="match-card">
      <slot name="photo">
        <SafeImage
          class="match-card__photo"
          :src="photo"
          :fallback="IMAGE_PATHS.MATCH_CARD.HERO"
          mode="aspectFill"
          root-class="match-card__photo-root"
          custom-class="match-card__photo-img"
          :lazy-load="false"
          alt=""
        />
      </slot>

      <view class="match-card__overlay" />

      <!-- 距离标签：左上角粉色胶囊 + 白字 -->
      <view v-if="distanceText" class="match-card__distance">
        <text class="match-card__distance-text">{{ distanceText }}</text>
      </view>

      <!-- 在线状态：右上角绿色胶囊 + 白字 -->
      <slot name="online-badge">
        <view v-if="onlineText" class="match-card__online">
          <text class="match-card__online-dot" :class="{ 'match-card__online-dot--away': !isOnline }" />
          <text class="match-card__online-text">{{ onlineText }}</text>
        </view>
      </slot>

      <!-- 匹配度徽章：右下角实心粉圆（R21：mp-weixin 对内联 conic-gradient 支持不稳，
           曾致样式串被当文本渲染；理想图本就是实心圆环徽章，percent+label 全部收进圆内） -->
      <slot name="match-score">
        <view class="match-card__score">
          <view class="match-card__score-ring">
            <view class="match-card__score-ring-inner">
              <text class="match-card__score-value">{{ user.matchScore }}%</text>
              <text class="match-card__score-label">{{ t('matchV1.matchScore') }}</text>
            </view>
          </view>
        </view>
      </slot>

      <slot name="info">
        <view class="match-card__info">
          <MatchInfo :user="user" />
        </view>
      </slot>

      <slot name="extra" />
    </view>
  </SwipeContainer>
</template>

<style scoped lang="scss">
.match-card-swipe {
  width: 100%;
  height: 100%;
}

.match-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 48rpx;
  overflow: hidden;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：图未就位时的卡底占位色，取最接近的页面底 token
     --c-bg-page=#EEF7F2（原裸写 #eef3f1，G 通道相差 4） */
  background: var(--c-bg-page, #EEF7F2);
  box-shadow: 0 16rpx 40rpx rgba(26, 55, 48, 0.16);
}

.match-card__photo-root {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.match-card__photo-img {
  width: 100%;
  height: 100%;
  display: block;
}

.match-card__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 62%;
  background: linear-gradient(
    180deg,
    rgba(13, 19, 19, 0) 0%,
    rgba(13, 19, 19, 0.25) 42%,
    rgba(10, 14, 14, 0.7) 100%
  );
  pointer-events: none;
}

.match-card__distance {
  position: absolute;
  top: 28rpx;
  left: 28rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  /* 对齐理想图《寻觅匹配卡片页面》：距离胶囊为浅白底 + 粉字（原为粉底白字，配色反转）
     MP-R1-PAGES-DISCOVER-INDEX-011：白底/阴影走等值 token（--c-overlay-bg-solid=rgba(255,255,255,.9)
     与原 .92 同档，--c-black-shadow-lg=rgba(0,0,0,.12) 等值） */
  background: var(--c-overlay-bg-solid, rgba(255, 255, 255, 0.9));
  box-shadow: 0 6rpx 16rpx var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12));
  /* 距离文字不换行、不截断，保证胶囊完整展示 */
  white-space: nowrap;
}

.match-card__distance-text {
  font-size: 22rpx;
  font-weight: 700;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：喜欢=粉底色统一走 --c-love（等值 #FF6B81），
     原工作树把 var(--c-neutral-0) 改成裸 #FF6B81 属新增裸写，此处收口 */
  color: var(--c-love, #FF6B81);
}

.match-card__online {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  /* 对齐理想图：在线胶囊为白底 + 绿点 + 绿字（原为绿底白字，配色反转）
     MP-R1-PAGES-DISCOVER-INDEX-011：与距离胶囊同源走等值 token */
  background: var(--c-overlay-bg-solid, rgba(255, 255, 255, 0.9));
  box-shadow: 0 6rpx 16rpx var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12));
}

.match-card__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--c-brand, #36C99A);
}

.match-card__online-dot--away {
  /* MP-R1-PAGES-DISCOVER-INDEX-011：离开态淡绿点原为 rgba(54,201,154,.55)（落在白胶囊上合成
     ≈#90E1C8），等档 token 为 --c-brand-200=#A3EBCF */
  background: var(--c-brand-200, #A3EBCF);
}

.match-card__online-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--c-brand, #36C99A);
}

/* 匹配度徽章：右下角实心粉圆（R21：conic-gradient 在 mp-weixin 内联样式不稳，弃用） */
.match-card__score {
  position: absolute;
  right: 28rpx;
  bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.match-card__score-ring {
  position: relative;
  /* R3：128→160rpx，label 18→22rpx —— 原尺寸下「匹配度」糊化不可读（judged 截图证据） */
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：等值渐变 token --c-gradient-romance
     （design-variables.scss:167 即 #FF6B81→#FF8DA1，与 Common Button.vue:244 同写法） */
  background: var(--c-gradient-romance, linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%));
  /* 豁免（011 口径「确无对应 token 者以注释声明」）：rgba(255,90,145,.3) 与 --s-romance/-md
     （rgba(255,107,129,.25/.30)、模糊 32rpx）几何与色相均不等值，换用会改变徽章投影；
     新增等值 token 需改 theme/design-variables.scss（非本泳道写集）→ 需他人配合 */
  box-shadow: 0 8rpx 20rpx rgba(255, 90, 145, 0.3);
}

.match-card__score-ring-inner {
  position: absolute;
  /* R3：内圈 104→132rpx（文字实际容器），value/label 同步放大后「匹配度」不再糊化 */
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：等值 scrim token --c-black-shadow-lg=rgba(0,0,0,.12) */
  background: var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.match-card__score-value {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-neutral-0, #ffffff);
  line-height: 1.1;
}

.match-card__score-label {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
}

.match-card__info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40rpx 32rpx 170rpx;
}

.match-card :deep(.match-info) {
  width: 100%;
}
</style>





