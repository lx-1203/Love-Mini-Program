<script setup lang="ts">
/**
 * 细分发现页（v3.1 契约 01 发现 → 快捷入口）
 * ?type=online|sameSchool|sameInterest|nearby|newcomer|highMatch
 */
import { ref, computed } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard } from "../../../stores/discover/utils";
import type { DiscoverCard } from "../../../stores/discover/types";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { openAppPath } from "../../../utils/navigation";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";
import { showErrorToast } from "../../../utils/error-toast";
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();

const { t } = useI18n();

const segType = ref("online");
const list = ref<DiscoverCard[]>([]);
const loading = ref(false);
const errorMessage = ref("");

const TYPE_LABEL_KEY: Record<string, string> = {
  online: "home.segmentOnline",
  sameSchool: "home.segmentSameSchool",
  sameInterest: "home.segmentSameInterest",
  nearby: "home.segmentNearby",
  newcomer: "home.segmentNewcomer",
  highMatch: "home.segmentHighMatch",
};

const title = computed(() => `${t("home.segmentTitle")} · ${t(TYPE_LABEL_KEY[segType.value] ?? "home.segmentOnline")}`);

onLoad((query) => {
  const type = query?.type;
  if (type && typeof type === "string" && TYPE_LABEL_KEY[type]) {
    segType.value = type;
  }
  void load();
});

onPullDownRefresh(() => {
  void load().finally(() => uni.stopPullDownRefresh());
});

function goBack() {
  // R10：细分发现为二级页，补显式返回（此前仅靠手势返回）
  uni.navigateBack({
    delta: 1,
    fail: () => {
      uni.switchTab({ url: "/pages/home/index" });
    },
  });
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const people = await clientApi.getRecommendations(buildFilter());
    list.value = people.map((p) => mapToDiscoverCard(p));
    if (segType.value !== "online" && segType.value !== "nearby") {
      list.value = list.value.filter(predicate).slice(0, 50);
    }
  } catch (error) {
    showErrorToast(error, t("nearby.loadFailed"));
    errorMessage.value = error instanceof Error ? error.message : t("nearby.loadFailed");
  } finally {
    loading.value = false;
  }
}

function buildFilter() {
  if (segType.value === "online") return { onlineOnly: true };
  if (segType.value === "nearby") return { distanceMax: 5 };
  return {};
}

function predicate(card: DiscoverCard): boolean {
  switch (segType.value) {
    case "sameSchool":
      return card.isSameSchool === true;
    case "sameInterest":
      return (card.commonCircleCount ?? 0) > 0;
    case "newcomer":
      return true;
    case "highMatch":
      return (card.commonCircleCount ?? 0) >= 3;
    default:
      return true;
  }
}


/**
 * 距离文案：纯数值拼 km 单位，含单位/自定义文案直接展示。
 */
function formatDistance(raw?: string): string {
  if (!raw) return "";
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}km` : raw;
}

/** 在线识别：online / just_now 均视为在线 */
function isOnline(status?: string): boolean {
  return status === "online" || status === "just_now";
}
/**
 * R8-L06-D10（文案 P3）：meta 行句式同构。
 * 原模板把分隔符写成条件拼接（item.campusName && item.distanceText ? ' · ' : ''），
 * distanceText 为空时整段消失 ⇒ 首帧 8 行里只有「浙江大学 · 230km」一行带距离，
 * 其余 7 行只有校名，同一列表两种句式。缺失时回落到「附近」占位（既有 i18n 档
 * home.segmentNearby，中英双档齐全），距离真值存在时照常展示，不编造具体公里数。
 */
function metaText(item: DiscoverCard): string {
  const campus = (item.campusName || "").trim();
  const distance = formatDistance(item.distanceText);
  if (campus && distance) return `${campus} · ${distance}`;
  if (campus) return `${campus} · ${t("home.segmentNearby")}`;
  return distance;
}
function openProfile(userId: string) {
  openAppPath(`/subpackages/profile-extra/profile/other?userId=${encodeURIComponent(userId)}`);
}
</script>

<template>
  <view class="segment-page" :style="menuStyleVars">
    <view class="segment-header">
      <view class="segment-header__back press-feedback" hover-class="press-feedback--active" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="segment-header__back-icon">‹</text>
      </view>
      <text class="segment-header__title">{{ title }}</text>
    </view>

    <view v-if="loading" class="segment-state">
      <SkeletonBlock variant="list" :rows="4" :label="t('common.loading')" />
    </view>
    <view v-else-if="errorMessage" class="segment-state">
      <text class="segment-state__text">{{ errorMessage }}</text>
      <view class="segment-retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.retry')" @tap="load">
        <text class="segment-retry__text">{{ t('common.retry') }}</text>
      </view>
    </view>
    <view v-else-if="list.length === 0" class="segment-state">
      <text class="segment-state__text">{{ t('home.segmentEmpty') }}</text>
    </view>
    <view v-else class="segment-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="segment-row press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="item.name"
        @tap="openProfile(item.userId)"
      >
        <image class="segment-row__avatar" :src="resolveMediaUrl(item.avatar) || resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR)" mode="aspectFill" alt="" />
        <view class="segment-row__info">
          <view class="segment-row__name-row">
            <text class="segment-row__name">{{ item.name }}</text>
            <!-- R8-L06-D09（素材缺失 P1）：绿点整帧不出现，两个叠加成因都在本行——
                 ① 外层是 <text>：mp-weixin 的 text 组件只接受字符串/text 子节点，
                    嵌进去的 <image> 不渲染（同行「在线」二字正常，圆点位恒白 #FFFFFF）；
                 ② status-online.svg 只有 viewBox、无 width/height，<image> 取不到固有尺寸。
                 按缺陷卡给的第二条口径改纯 CSS 圆点（不引图、不动全站共用素材），
                 外层同步换成 <view>，色档取 --c-brand-700（#1F8D6A 压白 4.14:1，过非文本 3:1）。 -->
            <view v-if="isOnline(item.activeStatusText)" class="segment-row__online-wrap">
              <view class="segment-row__online-dot" />
              <text class="segment-row__online">{{ t('cardDetail.onlineLabel') }}</text>
            </view>
          </view>
          <text class="segment-row__meta">{{ metaText(item) }}</text>
        </view>
        <text class="segment-row__arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.segment-page {
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
  padding: 24rpx 32rpx 64rpx;
  box-sizing: border-box;
}

.segment-header {
  /* R10-P1-003：--statusbar 兜底（DevTools env 恒 0）；返回键与标题同行 */
  display: flex;
  align-items: center;
  gap: var(--sp-3, 24rpx);
  /* R8-L06-D12（层级遮挡 P2）：页头原随流滚动 —— 底帧页头整条消失，第一张卡被画布
     上沿裁到只剩 y0~21，第二张卡 y34~96 正压进系统胶囊带（x298~357 / y56~71），
     卡右侧 › 箭头（顶帧同位墨迹 x345~348）被胶囊盖掉。
     改 sticky top:0：负外边距吃掉 .segment-page 的 24rpx 上内衬与 32rpx 左右内衬，
     让不透明头部带从 y=0 铺满整幅（滚动内容不从两侧缝隙穿过页头），状态栏内衬
     由本行 padding-top 自证（statusbar + 40rpx = 原 24rpx 页内衬 + 16rpx 头内衬，
     顶帧标题位置逐像素不变）。列表容器无需 scroll-padding-top：本页无 scroll-into-view。 */
  position: sticky;
  top: 0;
  z-index: var(--z-header, 10);
  background: var(--c-bg-page, #EEF7F2);
  margin: -24rpx -32rpx 0;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 40rpx) 32rpx 16rpx;
  box-sizing: border-box;
}

.segment-header__back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
  flex-shrink: 0;
}

.segment-header__back-icon {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
  line-height: 1;
}

.segment-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.segment-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 120rpx 0;
}

.segment-state__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #666666);
}

.segment-retry {
  padding: 14rpx 40rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand, #36C99A);
}

.segment-retry__text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}

.segment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.segment-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--c-bg-container, #ffffff);
  /* R8-L06-D14（圆角 P3）：18rpx 不在规范圆角阶梯上（同页 people.vue:373 行为 20rpx）
     ⇒ 收敛到 --r-lg(20rpx)，两页同一档。 */
  border-radius: var(--r-lg, 20rpx);
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.segment-row__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
  flex-shrink: 0;
}

.segment-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.segment-row__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.segment-row__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.segment-row__online-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.segment-row__online-dot {
  /* R8-L06-D09：纯 CSS 圆点（见模板注释），16rpx=8px 直径由页面自有节点给尺寸 */
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--c-brand-700, #1F8D6A);
  flex-shrink: 0;
}

.segment-row__online {
  /* R8-L06-D11（字号 P2）：20rpx=10px 汉字在 378px 画布上笔画粘连，低于 §1.3 标签档 12px
     ⇒ 提到 --fs-base(24rpx=12px)。同色档随之重算：原 --c-brand-600(#2AAE83) 压白卡
     实测 2.81:1，12px 正文不享 WCAG 大字号豁免（需 ≥4.5:1）；--c-brand-700 只有 4.14:1
     仍不达标 ⇒ 取同族深档 --c-brand-800(#156B51)，压白实测 6.45:1。 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand-800, #156B51);
}

.segment-row__meta {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #666666);
}

.segment-row__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}
</style>



