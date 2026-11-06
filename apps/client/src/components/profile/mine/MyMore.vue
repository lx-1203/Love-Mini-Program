<script setup lang="ts">
import { IMAGE_PATHS } from "../../../config/images";
// R2b-L03（2026-10-19 素材解析车道）：八个键的字形全部走 resolveMediaUrl 这一统一出口。
// ICONS_PROFILE.*_SVG 本来就是包内路径（透传，逐字不变）；ICONS_EMOJI.* 是基址派生常量，
// real 档求值是后端 app-assets 的 http URL，直接绑给 <image src> 会被基础库 3.16.2 拒载
// （模拟器宽容、真机空白）——经 resolveMediaUrl 落回 /static/<rel>，而那四枚 SVG 已随
// config/images.ts 的 IN_PACKAGE_ASSETS 双登记进包，于是两头都能出图。
import { resolveMediaUrl } from "../../../utils/media";

export interface MoreItem {
  key: string;
  label: string;
}

withDefaults(defineProps<{ items: MoreItem[] }>(), {
  items: () => [],
});
const emit = defineEmits<{ (e: "tap", key: string): void }>();

// MP-R2-PROFILE-010：/static 硬编码收敛到 IMAGE_PATHS（real 模式基址重写兼容）
// 2026-10-26 对齐理想图（已经填完资料的个人主页.png / 未登录个人主页.png，P5#6/P6#1）：
// 四枚图标换为深灰细线描边裸图标（星形/放大镜/照片/花形齿轮），撤彩色浅底圆——
// 原组合为「彩色图标+浅彩底圈」（书签/眼睛/相册/盾牌），与理想图整组不符；
// 其中「我的收藏」书签→星形、「谁看过我」眼睛→放大镜、「隐私设置」盾牌→花形齿轮。
// 字形源：common/star.svg / common/search.svg / svg-spec/03-icons/image.svg / common/settings-gear.svg
// （star/search/settings-gear 烘焙 stroke #94A3B8、image.svg 深色，均经 .my-more__icon-img
// 的 filter 压成统一深灰 #4A524E 档；mp <image> 不响应 CSS color，只能滤镜烘色）。
const ICONS: Record<string, { iconSrc?: string; image?: string; color: string; bare?: boolean }> = {
  favorites: { image: IMAGE_PATHS.ICONS_COMMON.STAR_SVG, color: "#4A524E", bare: true },
  visitors: { image: IMAGE_PATHS.ICONS_COMMON.SEARCH, color: "#4A524E", bare: true },
  album: { image: IMAGE_PATHS.ICONS_EMOJI.IMAGE, color: "#4A524E", bare: true },
  privacy: { image: IMAGE_PATHS.ICONS_EMOJI.SETTINGS, color: "#4A524E", bare: true },
  profile: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.USER, color: "#36C99A" },
  interest: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, color: "#FF6B81" },
  posts: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.FILE_TEXT, color: "#FF9F43" },
  checkin: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.CHECK, color: "#36C99A" },
};

/** 取该键的字形 URL（无该键时返回空串，模板的 v-else 文字点兜底不变）。 */
function iconUrl(key: string): string {
  const entry = ICONS[key];
  const raw = entry?.image || entry?.iconSrc || "";
  return raw ? resolveMediaUrl(raw) : "";
}

function iconTint(key: string): string {
  return ICONS[key]?.color || "#36C99A";
}

/** 该键是否有字形素材（决定画 <image> 还是画文字点兜底）。 */
function hasIcon(key: string): boolean {
  return iconUrl(key).length > 0;
}
</script>

<template>
  <view class="my-more">
    <text class="my-more__title">更多功能</text>
    <view class="my-more__grid">
      <view
        v-for="item in items"
        :key="item.key"
        class="my-more__cell"
        hover-class="my-more__cell--pressed"
        @tap="emit('tap', item.key)"
      >
        <!-- 2026-10-26：bare 档（前四项）为无底圈裸图标；其余保留浅底圆 -->
        <view class="my-more__icon" :class="{ 'my-more__icon--bare': ICONS[item.key]?.bare }" :style="ICONS[item.key]?.bare ? {} : { background: `${iconTint(item.key)}22` }">
          <image v-if="hasIcon(item.key)" class="my-more__icon-img" :class="{ 'my-more__icon-img--bare': ICONS[item.key]?.bare }" :src="iconUrl(item.key)" mode="aspectFit" alt="" />
          <text v-else class="my-more__icon-text" :style="{ color: iconTint(item.key) }">•</text>
        </view>
        <text class="my-more__label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-more {
  margin: var(--page-padding) var(--page-padding) 0;
}

.my-more__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.my-more__grid {
  display: flex;
  flex-wrap: wrap;
  border-radius: 32rpx;
  background: var(--c-bg-container);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  padding: 12rpx 0;
}

.my-more__cell {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* V-04（第五轮 QA）：菜单行高 24→28rpx，触控区更舒适 */
  gap: 10rpx;
  padding: 28rpx 0;
  box-sizing: border-box;
}

.my-more__cell--pressed {
  opacity: 0.75;
}

.my-more__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 2026-10-26 对齐理想图：前四项为无底圈裸图标 */
.my-more__icon--bare {
  background: transparent;
}

.my-more__icon-text {
  font-size: 30rpx;
  font-weight: 800;
}

.my-more__icon-img {
  width: 40rpx;
  height: 40rpx;
}

/* 2026-10-26：裸图标档统一烘成深灰细线（star/search/settings-gear 烘焙 #94A3B8、
   image.svg 深色，去饱和后压暗到 ≈#4A524E 档，与理想图深灰线性一致） */
.my-more__icon-img--bare {
  width: 44rpx;
  height: 44rpx;
  filter: saturate(0) brightness(0.55);
}

.my-more__label {
  font-size: 22rpx;
  color: #4A524E;
  font-weight: 500;
}
</style>
