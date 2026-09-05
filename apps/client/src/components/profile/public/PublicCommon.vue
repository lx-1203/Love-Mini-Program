<script setup lang="ts">
import { computed, ref } from "vue";
import { IMAGE_PATHS } from "../../../config/images";

const props = withDefaults(defineProps<{ commonInterests: string[] }>(), {
  commonInterests: () => [],
});

/**
 * 2026-08-31 修复「我们有 N 个共同点」中间图标缺失渲染空圆：
 * 部分主题图标（如 cat.svg）素材缺失时，image 加载失败会留下空圆。
 * 这里记录加载失败的 key，失败时降级为品牌心形图标，避免空白圆。
 */
const failedIcons = ref<Set<string>>(new Set());
function onIconError(key: string) {
  if (!key || failedIcons.value.has(key)) return;
  failedIcons.value = new Set(failedIcons.value).add(key);
}
function resolveIconSrc(item: { key: string; iconSrc: string }): string {
  return failedIcons.value.has(item.key) ? IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE : item.iconSrc;
}

/* 2026-09-05 R18：配色对齐理想图——绿心 / 灰心 / 粉星 / 蓝心 */
const COLORS = [
  { bg: "#E8FBF3", fg: "#36C99A", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE },
  { bg: "#F2F5F3", fg: "#9AA39F", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE },
  { bg: "#FFF0F6", fg: "#FF6B81", iconSrc: IMAGE_PATHS.ICONS_EMOJI.STAR },
  { bg: "#EEF3FF", fg: "#4D8DFF", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED },
];

/** 共同点图标按主题映射（理想图：旅行→飞机 / 音乐→音符 / 猫猫→猫咪） */
const ICON_BY_TITLE: Array<{ keys: string[]; iconSrc: string }> = [
  { keys: ["旅行"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.PLANE },
  { keys: ["音乐"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.MUSIC },
  { keys: ["猫", "宠物"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAT },
  { keys: ["电影"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.CLAPPER },
  { keys: ["摄影"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAMERA },
  { keys: ["阅读", "书"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.BOOK },
  { keys: ["吃货", "美食"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.FOOD },
  { keys: ["运动"], iconSrc: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT },
];

const items = computed(() =>
  props.commonInterests.slice(0, 4).map((raw, index) => {
    const parts = raw.split("/").map((s) => s.trim()).filter(Boolean);
    const title = parts[0] || raw;
    const color = (COLORS[index % COLORS.length] ?? COLORS[0])!;
    const iconSrc =
      ICON_BY_TITLE.find((m) => m.keys.some((k) => title.includes(k)))?.iconSrc ?? color.iconSrc;
    return {
      key: `${index}-${raw}`,
      title,
      subtitle: parts[1] || "",
      ...color,
      iconSrc,
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
          <image class="public-common__icon-img" :src="resolveIconSrc(item)" mode="aspectFit" alt="" @error="onIconError(item.key)" />
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

.public-common__icon-img {
  width: 32rpx;
  height: 32rpx;
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
