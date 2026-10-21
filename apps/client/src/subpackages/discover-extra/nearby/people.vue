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
// R8-L06-D13：在线绿点改纯 CSS 圆点后本页不再引 IMAGE_PATHS（noUnusedLocals 门禁）
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

/**
 * R10-L06-D14（文案 P2）：meta 行复用 segment.vue:119-125 metaText 口径——
 * 本页排序正是按 distanceText（load() 内 :91-96），此前模板只拼 campusName，
 * distanceText 从不露出（实帧 6 行全只剩校名）。距离真值存在显示「学校 · 230km」，
 * 缺失回落既有 i18n 档 home.segmentNearby（「附近」，中英双档齐全），不编造具体公里数。
 */
function metaText(item: DiscoverCard): string {
  const campus = (item.campusName || "").trim();
  const distance = formatDistance(item.distanceText);
  if (campus && distance) return `${campus} · ${distance}`;
  if (campus) return `${campus} · ${t("home.segmentNearby")}`;
  return distance;
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
            <!-- R8-L06-D13（素材缺失 P1）：与 R8-L06-D09 同一枚绿点、同一双成因——
                 mp-weixin 的 <text> 只接受字符串/text 子节点，嵌进来的 <image> 整块不渲染
                 （帧上「在线」二字 x185~203 有墨迹、其左 x168~184 恒白 #FFFFFF，8 行全如此），
                 且 status-online.svg 无 width/height 取不到固有尺寸。
                 本页与 segment 一并改纯 CSS 圆点（不动 4 个消费点共用的 static 素材）。 -->
            <view v-if="isOnline(item.activeStatusText)" class="people-row__online-wrap">
              <view class="people-row__online-dot" />
              <text class="people-row__online">{{ t('cardDetail.onlineLabel') }}</text>
            </view>
          </view>
          <!-- R10-L06-D14：三段条件拼接改走 metaText（口径同 segment.vue:186 meta 行） -->
          <text class="people-row__meta">{{ metaText(item) }}</text>
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
  /* R10-L06-D13（可达性 P1）：原框高实测 65rpx（18rpx*2 padding + 26rpx 文本），低于
     88rpx 热区口径，且本页 tab 是「同城的人」唯一切换入口 ⇒ 补 min-height:88rpx，
     既有 flex 居中保持文字基线不动。 */
  min-height: 88rpx;
  /* R8-L06-D14（圆角 P3）：18rpx 是阶梯外私有值（本页 .people-row:373 用 20rpx，
     segment.vue 同抄一枚）⇒ 收敛到 --r-lg(20rpx)。 */
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line, #EEF2F0);
}

.people-tab--active {
  /* R10-L06-D12（颜色token P1）：选中态原描边 --c-brand-500 #36C99A 压 #E8FAF3 仅 1.94:1、
     文字 --c-brand-600 #2AAE83 仅 2.59:1，选中/未选中两档信号全不达（正文 4.5 / 非文本 3:1）
     ⇒ 描边与文字同收 --c-brand-800 #156B51（§2 核算档，压 #E8FAF3 约 6:1）。 */
  border-color: var(--c-brand-800, #156B51);
  background: var(--c-brand-50, #E8FAF3);
}

.people-tab__text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #666666);
}

.people-tab--active .people-tab__text {
  /* R10-L06-D12：同 active 框，文字取 --c-brand-800（见上） */
  color: var(--c-brand-800, #156B51);
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
  /* R8-L06-D13：纯 CSS 圆点（见模板注释），色档取 --c-brand-700(#1F8D6A)，
     压白卡实测 4.14:1，过非文本图形 3:1 门槛（原 SVG 内写死的 #36C99A 只有 2.10:1）。 */
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--c-brand-700, #1F8D6A);
  flex-shrink: 0;
}

.people-row__online {
  /* 与 segment.vue:288 同一元素同批收口（R8-L06-D11 口径）：20rpx=10px 汉字笔画粘连
     ⇒ --fs-base(24rpx=12px)；原 --c-brand-600 压白 2.81:1 不达 4.5:1 ⇒ 同族 --c-brand-800 6.45:1。 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand-800, #156B51);
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
  /* R8-L06-D16（字号 P2）：20rpx=10px 字面（实测墨迹 12px 高、字面 ≈10px）低于 §1.3
     标签档 12px，而标签是本页信息密度最高的一行 ⇒ 提到 --fs-base(24rpx)，
     padding 纵向 6→8rpx 保住 36rpx 行高不塌。
     同档重算颜色：原 --c-tag-green-text(#279B70) 压 --c-tag-green-bg(#EAF8F2) 实测 3.20:1，
     12px 正文不享 WCAG 大字号豁免 ⇒ 换同族深档 --c-brand-800(#156B51)，5.90:1。 */
  padding: 8rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-tag-green-bg, #EAF8F2);
  color: var(--c-brand-800, #156B51);
  font-size: var(--fs-base, 24rpx);
}

.people-row__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

.people-list__footer {
  height: 48rpx;
}
</style>



