<script setup lang="ts">
/**
 * 附近的人 / 同城的人（v3 Nearby 冻结 · 单页双态）
 * ?scope=nearby|city
 * - nearby：距离 → 活跃度
 * - city：活跃度 → 推荐度
 * 整行点击进他人主页；页面不出现喜欢/悄悄话/匹配按钮，不使用滑动卡片。
 */
import { ref, computed } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard, NEARBY_MAX_DISTANCE_KM } from "../../../stores/discover/utils";
import type { DiscoverCard } from "../../../stores/discover/types";
import { openUserProfile } from "../../../utils/navigation";
import SafeImage from "../../../components/common/SafeImage.vue";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
// 2026-09-04 视觉验收：var(--statusbar, env(safe-area-inset-top)) 在模拟器/部分机型为 0，tabs 行上移进胶囊区被遮挡
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
import { IMAGE_PATHS } from "../../../config/images";
// R10-P3-016：标签 value → 展示文案统一映射（utils/tag-label 单一映射源）
import { tagLabelsFor } from "../../../utils/tag-label";

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const statusBarHeightPx = useStatusBarHeight();
const rootStyle = computed(() => ({
  ...menuStyleVars.value,
  paddingTop: `calc(${statusBarHeightPx.value}px + 20rpx)`,
}));

const scope = ref<"nearby" | "city">("nearby");
// R10-P3-016：标签 value → 展示文案
const rowTags = (item: { tags?: string[] }) => tagLabelsFor(item.tags ?? [], t);
const list = ref<DiscoverCard[]>([]);
const loading = ref(false);
const errorMessage = ref("");

/** 2026-08-26 R4：前端分页切片（后端 recommendations 不支持 page，首批 PAGE_SIZE + 触底增量） */
const PAGE_SIZE = 20;
const visibleCount = ref(0);
const visibleList = computed(() => list.value.slice(0, visibleCount.value));

/** 滚动触底：增量渲染下一批 */
function loadMoreVisible() {
  if (visibleCount.value < list.value.length) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, list.value.length);
  }
}

const title = computed(() =>
  scope.value === "city" ? t("nearby.peopleCity") : t("nearby.peopleNearby")
);

onLoad((query) => {
  scope.value = query?.scope === "city" ? "city" : "nearby";
  void load();
});

onPullDownRefresh(() => {
  void load().finally(() => uni.stopPullDownRefresh());
});

/** 2026-08-26 R4：竞态 token——快速切换 scope / 刷新时，旧响应不再覆盖新列表 */
let loadToken = 0;

async function load() {
  // 竞态 token：仅最新 token 的请求允许更新状态（参照 home.ts fetchDashboard 模式）
  const token = ++loadToken;
  loading.value = true;
  errorMessage.value = "";
  try {
    const people = await clientApi.getRecommendations(
      scope.value === "nearby" ? { distanceMax: NEARBY_MAX_DISTANCE_KM } : {}
    );
    // 丢弃被新请求取代的旧响应
    if (token !== loadToken) return;
    // 2026-09-02 R12（需求⑥）：列表去重兜底——后端已按名字+头像做视觉去重，
    // 这里按 userId（缺失时退化为 name）再挡一层，杜绝同一账号重复出现
    const seenKeys = new Set<string>();
    const cards: DiscoverCard[] = [];
    for (const p of people) {
      const card = mapToDiscoverCard(p);
      const key = card.userId ? String(card.userId) : `name:${card.name}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      cards.push(card);
    }
    // nearby：距离 → 活跃度；city：活跃度 → 推荐度
    if (scope.value === "nearby") {
      cards.sort((a, b) => {
        const active = rank(a.activeStatusText) - rank(b.activeStatusText);
        if (active !== 0) return active;
        return (parseFloat(a.distanceText || "99") || 99) - (parseFloat(b.distanceText || "99") || 99);
      });
    } else {
      cards.sort((a, b) => {
        const active = rank(a.activeStatusText) - rank(b.activeStatusText);
        if (active !== 0) return active;
        return (b.commonCircleCount ?? 0) - (a.commonCircleCount ?? 0);
      });
    }
    list.value = cards;
    // 首批只渲染 PAGE_SIZE 条，滚动触底再增量（避免全量渲染掉帧）
    visibleCount.value = Math.min(PAGE_SIZE, list.value.length);
  } catch (error) {
    if (token !== loadToken) return;
    errorMessage.value = error instanceof Error ? error.message : t("nearby.loadFailed");
  } finally {
    // 仅最新 token 的请求才允许清 loading
    if (token === loadToken) {
      loading.value = false;
    }
  }
}

/** 活跃度排序：just_now=0 / today=1 / 其余=2 */
function rank(status?: string): number {
  if (status === "just_now") return 0;
  if (status === "today") return 1;
  return 2;
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
function openProfile(userId: string) {
  openUserProfile(userId);
}

function goBack() {
  // MP-R2-LNEARBY-001：栈底兜底
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/discover/index" });
  }
}

/** 附近 / 同城 切换 */
function switchScope(next: "nearby" | "city") {
  if (next === scope.value) return;
  scope.value = next;
  void load();
}
</script>

<template>
  <view class="people-page" :style="rootStyle">
    <view class="people-header">
      <view class="people-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="people-header__back-text">‹</text>
      </view>
      <text class="people-header__title">{{ title }}</text>
      <view class="people-header__spacer" />
    </view>

    <!-- 附近 / 同城 切换 -->
    <view class="people-tabs" role="tablist" :aria-label="t('nearby.peopleTabsAria')">
      <view
        class="people-tab"
        :class="{ 'people-tab--active': scope === 'nearby' }"
        role="tab"
        :aria-selected="scope === 'nearby' ? 'true' : 'false'"
        @tap="switchScope('nearby')"
      >
        <text class="people-tab__text">{{ t('nearby.peopleNearby') }}</text>
      </view>
      <view
        class="people-tab"
        :class="{ 'people-tab--active': scope === 'city' }"
        role="tab"
        :aria-selected="scope === 'city' ? 'true' : 'false'"
        @tap="switchScope('city')"
      >
        <text class="people-tab__text">{{ t('nearby.peopleCity') }}</text>
      </view>
    </view>

    <!-- 状态区 -->
    <view v-if="loading" class="people-state">
      <SkeletonBlock variant="list" :rows="4" :label="t('nearby.loading')" />
    </view>
    <view v-else-if="errorMessage" class="people-state">
      <text class="people-state__text">{{ errorMessage }}</text>
      <view class="people-state__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.retry')" @tap="load">
        <text class="people-state__retry-text">{{ t('common.retry') }}</text>
      </view>
    </view>
    <view v-else-if="list.length === 0" class="people-state">
      <text class="people-state__text">{{ t('nearby.peopleEmpty') }}</text>
      <text class="people-state__hint">{{ t('nearby.peopleEmptyHint') }}</text>
    </view>

    <!-- 列表（纯列表，无操作按钮；2026-08-26 R4：分页切片渲染 + 触底增量 + 图片懒加载） -->
    <scroll-view v-else scroll-y class="people-list" :show-scrollbar="false" @scrolltolower="loadMoreVisible">
      <view
        v-for="item in visibleList"
        :key="item.id"
        class="people-row press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="item.name"
        @tap="openProfile(item.userId)"
      >
        <!-- 2026-09-02 R5：SafeImage 兜底（图片失败 fallback 默认头像）
             MP-R1-NP-001：尺寸类必须落在页面自有节点——custom-class 施加在 SafeImage
             内层 image 上，跨组件作用域（组件未开 styleIsolation）页面 wxss 命中不了
             → 96rpx 头像零尺寸塌陷，整列表头像不可见。外包确定尺寸 wrapper（对齐
             likes-visitors/index.vue:394-396 模式），SafeImage 靠根 100% 填满。 -->
        <view class="people-row__avatar-wrap">
          <SafeImage :src="item.avatar" custom-class="people-row__avatar" mode="aspectFill" :lazy-load="false" alt="" />
        </view>
        <view class="people-row__info">
          <view class="people-row__name-row">
            <text class="people-row__name">{{ item.name }}</text>
            <text v-if="item.age" class="people-row__age">{{ item.age }}</text>
            <text v-if="isOnline(item.activeStatusText)" class="people-row__online-wrap">
              <image class="people-row__online-dot" :src="IMAGE_PATHS.ICONS_EMOJI.STATUS_ONLINE" mode="aspectFit" alt="" />
              <text class="people-row__online">{{ t('cardDetail.onlineLabel') }}</text>
            </text>
          </view>
          <text class="people-row__meta">{{ item.campusName || '' }}{{ item.campusName && item.distanceText ? ' · ' : '' }}{{ formatDistance(item.distanceText) }}</text>
          <view v-if="item.tags && item.tags.length" class="people-row__tags">
            <text v-for="(tag, idx) in rowTags(item).slice(0, 3)" :key="idx" class="people-row__tag">{{ tag }}</text>
          </view>
        </view>
        <text class="people-row__arrow">›</text>
      </view>
      <view class="people-list__footer" />
    </scroll-view>
  </view>
</template>


<style scoped lang="scss">
.people-page {
  /* MP-R2-PEOPLE-001：定高使 scroll-view 内滚生效（原 min-height:100% 容器随内容
     增长，scrolltolower 永不触发，第 21 人起不可见）；对齐 love-center/nearby 100vh 惯例 */
  height: 100%;
  overflow: hidden;
  background: var(--c-bg-page, #EEF7F2);
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx) 32rpx 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.people-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.people-header__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.people-header__back-text {
  font-size: 40rpx;
  color: var(--c-text-primary, #222222);
  line-height: 1;
}

.people-header__title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.people-header__spacer {
  width: 64rpx;
}

.people-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.people-tab {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line, #EEF2F0);
}

.people-tab--active {
  border-color: var(--c-brand-500, #36C99A);
  background: var(--c-brand-50, #E8FAF3);
}

.people-tab__text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #666666);
}

.people-tab--active .people-tab__text {
  color: var(--c-brand-600, #36C99A);
}

.people-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 80rpx 40rpx;
}

.people-state__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #666666);
  text-align: center;
}

.people-state__hint {
  font-size: 22rpx;
  color: var(--c-text-quaternary, #C8CFCD);
  text-align: center;
}

.people-state__retry {
  margin-top: 8rpx;
  padding: 14rpx 48rpx;
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid var(--c-line-strong, #DCE5E2);
}

.people-state__retry-text {
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

.people-list {
  flex: 1;
  min-height: 0;
}

.people-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 20rpx;
  border: 1rpx solid var(--c-line, #EEF2F0);
}

/* MP-R1-NP-001：确定尺寸包裹层——头像 96rpx/圆形/底色由页面自有节点承载 */
.people-row__avatar-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-neutral-100, #F0F2F5);
  flex-shrink: 0;
}

.people-row__avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.people-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.people-row__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.people-row__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.people-row__age {
  font-size: 26rpx;
  color: var(--c-text-secondary, #666666);
}

.people-row__online-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.people-row__online-dot {
  width: 16rpx;
  height: 16rpx;
  flex-shrink: 0;
}

.people-row__online {
  font-size: 20rpx;
  color: var(--c-brand-600, #36C99A);
}

.people-row__meta {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.people-row__tags {
  display: flex;
  gap: 10rpx;
}

.people-row__tag {
  padding: 6rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-tag-green-bg, #EAF8F2);
  color: var(--c-tag-green-text, #279B70);
  font-size: 20rpx;
}

.people-row__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

.people-list__footer {
  height: 48rpx;
}
</style>



