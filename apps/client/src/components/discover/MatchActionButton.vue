<script setup lang="ts">
/**
 * MatchActionButton — 品牌级核心关系动作按钮（v3 冻结）
 * 三态：LIKE（♥ 粉）/ WHISPER（☆ 白底+橙色图标）/ PASS（× 灰）
 * 统一 64×64（rpx 128），彩色圆形底 + 白色图标 + 投影 + 细白描边；
 * 悄悄话为白底 + 橙色 ☆（非粉色主按钮，避免与「喜欢」抢视觉）。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";

const props = withDefaults(
  defineProps<{
    kind: "like" | "whisper" | "pass";
    /** 尺寸（rpx），默认 128rpx = 64px */
    size?: number;
    disabled?: boolean;
  }>(),
  { size: 128, disabled: false }
);

const emit = defineEmits<{ (e: "tap"): void }>();

const { t } = useI18n();

const config = computed(() => {
  switch (props.kind) {
    case "like":
      return {
        icon: IMAGE_PATHS.ICONS_V2.HEART_WHITE,
        glyph: "",
        glyphColor: "#FFFFFF",
        bg: "linear-gradient(135deg, #FF8DB7 0%, #FF6B81 100%)",
        border: "2rpx solid rgba(255, 255, 255, 0.9)",
        shadow: "rgba(255, 90, 145, 0.35)",
        label: t("discover.like"),
      };
    case "whisper":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.STAR,
        glyph: "",
        glyphColor: "#FF8A3D",
        bg: "#FFFFFF",
        border: "2rpx solid #FF8A3D",
        shadow: "rgba(255, 138, 61, 0.30)",
        label: t("discover.whisperLabel"),
      };
    case "pass":
      return {
        icon: IMAGE_PATHS.ICONS_V2.X_WHITE,
        glyph: "",
        glyphColor: "#FFFFFF",
        bg: "linear-gradient(135deg, #A6B1AF 0%, #666666 100%)",
        border: "2rpx solid rgba(255, 255, 255, 0.9)",
        shadow: "rgba(138, 150, 148, 0.35)",
        label: t("discover.skip"),
      };
    default:
      return {
        icon: IMAGE_PATHS.ICONS_V2.HEART_WHITE,
        glyph: "",
        glyphColor: "#FFFFFF",
        bg: "linear-gradient(135deg, #FF8DB7 0%, #FF6B81 100%)",
        border: "2rpx solid rgba(255, 255, 255, 0.9)",
        shadow: "rgba(255, 90, 145, 0.35)",
        label: t("discover.like"),
      };
  }
});

const styleObj = computed(() => ({
  width: `${props.size}rpx`,
  height: `${props.size}rpx`,
  background: config.value.bg,
  border: config.value.border,
  boxShadow: `0 10rpx 24rpx ${config.value.shadow}`,
  opacity: props.disabled ? 0.5 : 1,
}));
</script>

<template>
  <view
    class="match-action"
    :class="{ 'match-action--disabled': disabled }"
    :style="styleObj"
    hover-class="match-action--pressed"
    hover-stay-time="120"
    role="button"
    :aria-label="config.label"
    :aria-disabled="disabled ? 'true' : 'false'"
    @tap="disabled ? undefined : emit('tap')"
  >
    <image v-if="config.icon" class="match-action__icon" :src="config.icon" mode="aspectFit" alt="" />
    <text v-else class="match-action__glyph" :style="{ color: config.glyphColor }">{{ config.glyph }}</text>
  </view>
</template>

<style scoped lang="scss">
.match-action {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  /* 细白描边（悄悄话为橙色描边） */
  box-sizing: border-box;
  transition: transform 120ms ease;
}

.match-action--pressed {
  transform: scale(0.92);
}

.match-action--disabled {
  pointer-events: none;
}

.match-action__icon {
  width: 44%;
  height: 44%;
}

.match-action__glyph {
  font-size: 56rpx;
  font-weight: 800;
  line-height: 1;
}
</style>
