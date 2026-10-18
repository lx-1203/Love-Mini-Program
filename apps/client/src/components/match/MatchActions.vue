<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";

withDefaults(
  defineProps<{
    disabled?: boolean;
    busy?: boolean;
  }>(),
  { disabled: false, busy: false }
);

const emit = defineEmits<{
  (e: "pass"): void;
  (e: "like"): void;
  (e: "superLike"): void;
}>();

const { t } = useI18n();

const icons = {
  pass: IMAGE_PATHS.ICONS_V2.X_GRAY,
  like: IMAGE_PATHS.ICONS_V2.HEART_WHITE,
  superLike: IMAGE_PATHS.ICONS_V2.CHAT_PINK,
} as const;
</script>

<template>
  <view class="match-actions" :class="{ 'match-actions--disabled': disabled || busy }">
    <view
      class="match-actions__item"
      hover-class="match-actions__item--pressed"
      hover-stay-time="40"
      role="button"
      :aria-label="t('discover.skip')"
      @tap="!disabled && !busy && emit('pass')"
    >
      <view class="match-actions__btn match-actions__btn--pass">
        <image class="match-actions__icon" :src="icons.pass" mode="aspectFit" alt="" />
      </view>
      <text class="match-actions__label">{{ t('discover.skip') }}</text>
    </view>

    <view
      class="match-actions__item"
      hover-class="match-actions__item--pressed"
      hover-stay-time="40"
      role="button"
      :aria-label="t('discover.superLike')"
      @tap="!disabled && !busy && emit('superLike')"
    >
      <view class="match-actions__btn match-actions__btn--super">
        <image class="match-actions__icon" :src="icons.superLike" mode="aspectFit" alt="" />
      </view>
      <text class="match-actions__label">{{ t('discover.greet') }}</text>
    </view>

    <view
      class="match-actions__item match-actions__item--like"
      hover-class="match-actions__item--pressed"
      hover-stay-time="40"
      role="button"
      :aria-label="t('discover.like')"
      @tap="!disabled && !busy && emit('like')"
    >
      <view class="match-actions__btn match-actions__btn--like">
        <image class="match-actions__icon" :src="icons.like" mode="aspectFit" alt="" />
      </view>
      <text class="match-actions__label match-actions__label--like">{{ t('discover.like') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-evenly;
  /* V-01（第五轮 QA）：与卡片区距离 40→32rpx，按钮间加最小间隙防贴边 */
  gap: 16rpx;
  padding: 32rpx 32rpx 8rpx;
}

.match-actions--disabled {
  opacity: 0.55;
}

.match-actions__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.match-actions__item--pressed {
  transform: scale(0.92);
}

.match-actions__btn {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.10);
}

.match-actions__btn--pass {
  background: var(--c-neutral-0, #ffffff);
  /* R2b-L01-D07（颜色token P2）：描边去裸写 #EDF0F0，收口到既有浅线 token
     --c-border-light（design-variables.scss:402 = #EEF2F0，与原值仅差 2 通道单位，观感一致） */
  border: 1rpx solid var(--c-border-light, #EDF0F0);
}

.match-actions__btn--super {
  background: var(--c-neutral-0, #ffffff);
  /* R2b-L01-D07：同上，描边走 --c-border-light */
  border: 1rpx solid var(--c-border-light, #EDF0F0);
}

.match-actions__btn--like {
  /* R2b-L01-D07：主 CTA 底色去裸写 #FF6B81，走品牌粉 token --c-love（等值 #FF6B81），主题换色可跟随 */
  background: var(--c-love, #FF6B81);
  box-shadow: 0 12rpx 40rpx rgba(255, 107, 129, 0.35);
  /* R2b-L01-D06（尺寸比例 P1）：理想图「喜欢」圆钮明显大于其余两枚（≈1.2 倍），
     并上移 12rpx 形成主 CTA 层级差；其余两键维持 128rpx */
  width: 152rpx;
  height: 152rpx;
  margin-top: -12rpx;
}

.match-actions__icon {
  width: 56rpx;
  height: 56rpx;
}

.match-actions__label {
  /* R2b-L01-D08（字号 P2）：22rpx 细碎且无字重，理想图标签字高约为圆钮直径 1/8。
     卡建议写作 var(--fs-sm) 但本仓 --fs-sm 实为 22rpx（design-variables.scss:532，等于原值不生效），
     取 28rpx 档 --fs-lg（tokens.scss:110）达意；并统一 font-weight 500、色走 --c-text-secondary。 */
  font-size: var(--fs-lg, 28rpx);
  font-weight: 500;
  color: var(--c-text-secondary, #6B7571);
}

/* R3：主 CTA「喜欢」标签用品牌粉高亮，形成三键视觉层级（理想图同为粉色标识）
   R2b-L01-D07：标签色去裸写 #FF6B81，走 --c-love */
.match-actions__label--like {
  color: var(--c-love, #FF6B81);
  font-weight: 600;
}
</style>
