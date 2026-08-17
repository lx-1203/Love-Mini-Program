<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** 表情：default/happy/love/thinking/waving/sad */
    mood?: "default" | "happy" | "love" | "thinking" | "waving" | "sad";
    /** 尺寸：sm=40px / md=80px / lg=120px / xl=200px（设计基准 px，自动转 rpx） */
    size?: "sm" | "md" | "lg" | "xl";
    /** 是否播放呼吸动效 */
    animated?: boolean;
  }>(),
  { mood: "default", size: "lg", animated: false }
);

const SIZE_RPX = { sm: 80, md: 160, lg: 240, xl: 400 };

const imgSrc = computed(() => `/static/assets/images/mascot/${props.mood}.png`);
const sizeRpx = computed(() => SIZE_RPX[props.size]);
</script>

<template>
  <view
    class="xunmi-mascot"
    :class="{ 'xunmi-mascot--animated': animated }"
    :style="{ width: `${sizeRpx}rpx`, height: `${sizeRpx}rpx` }"
  >
    <image class="xunmi-mascot__img" :src="imgSrc" mode="aspectFit" alt="寻觅芽" />
  </view>
</template>

<style scoped lang="scss">
.xunmi-mascot {
  position: relative;
}

.xunmi-mascot__img {
  width: 100%;
  height: 100%;
}

.xunmi-mascot--animated {
  animation: xunmi-breathe 2.4s ease-in-out infinite;
}

@keyframes xunmi-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
