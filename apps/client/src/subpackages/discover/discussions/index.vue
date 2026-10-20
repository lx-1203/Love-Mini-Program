<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import StatusState from "../../../components/common/StatusState.vue";
import EmptyState from "../../../components/common/EmptyState.vue";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { discoverPageRequirements } from "../../../config/page-access";
import { usePageAccess } from "../../../composables/usePageAccess";
import { clientApi } from "../../../services/api";
import { openAppPath } from "../../../utils/navigation";
import { lightHaptic } from "../../../utils/haptic";
// R4-batch2: 页面文案 i18n 化
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const discussions = ref<Awaited<ReturnType<typeof clientApi.getDiscussionRecommendations>>>([]);
const loading = ref(false);
/** 加载失败时的错误状态，供 UI 展示重试入口 */
const error = ref<string | null>(null);

usePageAccess(discoverPageRequirements);

onShow(() => {
  void loadDiscussions();
});

async function loadDiscussions() {
  loading.value = true;
  error.value = null;
  try {
    discussions.value = await clientApi.getDiscussionRecommendations();
  } catch (e) {
    // 失败时设置 error 状态，UI 可据此展示重试入口（R4-00052：文案走 i18n）
    error.value = e instanceof Error ? e.message : t("discussions.loadFailed");
    uni.showToast({ title: error.value, icon: "none" });
  } finally {
    loading.value = false;
  }
}

function openPath(url: string) {
  openAppPath(url);
}

/**
 * R8-L13-D05（P2 文案）：feed-row「标题 + 摘要」两级结构在帧上退化成同一句印两遍
 * （top 帧 y=523..554 粗体标题 / y=564..594 正文，逐字相同，只差句尾「…」与「。」）。
 * R6-L16-D04 的守卫是 `summary.trim() !== title.trim()`，标题被模板/契约截断成
 * 带省略号的形态时两串永不全等 ⇒ 守卫恒不触发。本函数按缺陷行的口径重做：
 * ① 去掉所有空白与句末标点（。．!！?？~～…·、，,;；:：）后判相等；
 * ② 一方以另一方为前缀（标题是摘要的截断形态）同样判同文。
 * 命中即不渲染摘要行；任一侧为空串时不判同文，保持原有渲染，避免把有信息的摘要吃掉。
 */
const TRAILING_PUNCT = /[。．.!！?？~～…·、，,;；:：]+$/u;
function normalizeForDedup(text: string): string {
  return text.replace(/[\s\u3000]/g, "").replace(TRAILING_PUNCT, "");
}
function isDuplicateSummary(title?: string, summary?: string): boolean {
  const a = normalizeForDedup(title || "");
  const b = normalizeForDedup(summary || "");
  if (!a || !b) return false;
  return a === b || b.startsWith(a) || a.startsWith(b);
}

/**
 * R4-00053：讨论推荐条目点击消费路径。
 * 推荐条目无独立详情页（契约仅 id/title/summary/heatLabel），
 * 点击后展示详情弹窗，确认后进入寻觅页继续体验真实内容。
 */
function openDiscussion(item: Awaited<ReturnType<typeof clientApi.getDiscussionRecommendations>>[number]) {
  lightHaptic();
  uni.showModal({
    title: item.title,
    content: `${item.summary}\n\n${item.heatLabel}`,
    confirmText: t("discussions.goExplore"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (res.confirm) {
        openPath("/pages/discover/index");
      }
    },
  });
}
</script>

<template>
  <!-- R8-L13-D06 / R8-L13-D07（P1/P2 层级遮挡·可达性）：补 fixed。
         未传时 AppShell.vue:323 `.is-fixed .shell__header{position:sticky}` 整条规则不生效，
         top 帧列表文字直接印进系统状态栏「1:14」，bottom 帧页头（含 :75 的 show-back 返回入口）
         随内容整条滚出视口 ⇒ 滚动后画面零墨迹、无任何出口。同仓 MP-R1-APPSHELL-101 已落定的
         口径（feedback/index.vue:427、LegalTextPage.vue:203）就是给 AppShell 传 fixed，本页同修。 -->
  <AppShell
    :title="t('discussions.title')"
    :subtitle="t('discussions.subtitle')"
    current-tab="likes"
    show-back
    fixed
  >
    <!-- R10-P3-018：与页头 subtitle 近同句，删除分组副标题只留一句 -->
    <SectionCard :title="t('discussions.hotSectionTitle')">
      <view v-if="loading" class="empty-state">
        <SkeletonBlock variant="list" :rows="3" :label="t('discussions.loadingContent')" />
      </view>
      <view v-else-if="error" class="empty-state">
        {{ error }}
        <text class="retry-link" @tap="loadDiscussions">{{ t('discussions.retry') }}</text>
      </view>
      <EmptyState
        v-else-if="!discussions.length"
        :title="t('discussions.empty')"
        type="no-data"
      />
      <view v-else class="section-stack">
        <view
          v-for="item in discussions" :key="item.id"
          class="feed-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="`${item.title}：${item.summary}`"
          @tap="openDiscussion(item)"
        >
          <!-- R8-L13-D04（P2 素材缺失）：热度药丸此前吃 tone="warning"，而 StatusState.vue:25
               把 warning 硬映射到 ICONS_COMMON.CLOSE（蓝灰 ✕）⇒ 10 枚「热度上升 / N 人参与」
               全部画成「关闭」，语义相反。R6-L16-D01 已在本组件建好 `heat` 档
               （StatusState.vue:26 → ICONS_COMMON.FIRE，包内 assets/icons/common/fire.png），
               本页是它的消费点，改吃 heat 档即换出火苗图标（配色沿用 warning 档不变）。 -->
          <StatusState tone="heat" :label="item.heatLabel" />
          <text class="row-title">{{ item.title }}</text>
          <!-- R6-L16-D04（P2 文案）：帧上实测本帧 6 行里 3 行、top 帧 7/10 行的标题与摘要逐字相同
               （如「大提琴独奏练习中，想找人一起合奏」两行一模一样）——SectionCard/feed-row 的
               「标题+摘要」两级结构退化成同一句印两遍，零信息增量。
               渲染侧加去重守卫：摘要与标题同文（trim 后逐字相等）时不渲染摘要行。
               数据侧（契约 summary 未取真正正文摘要）另登记 NEEDS-DATA，由 F10 车道清。
               R8-L13-D05（P2 文案，本条改守卫本身）：R6 那版只做 `trim()` 全等，帧上
               y=523..554（粗体标题）与 y=564..594（正文）同一句仍逐字印了两遍——标题被
               省略号截断/句末标点与摘要不同形（「…都没了…」vs「…都没了。」）时 trim 全等
               永不成立 ⇒ 守卫形同虚设。改为归一化后判「相等或互为前缀」，见 isDuplicateSummary()。 -->
          <text
            v-if="item.summary && !isDuplicateSummary(item.title, item.summary)"
            class="row-subtitle"
          >{{ item.summary }}</text>
        </view>
      </view>
    </SectionCard>

    <SectionCard :title="t('discussions.nextTitle')" :subtitle="t('discussions.nextSubtitle')">
      <BottomActionBar
        :primary-label="t('discussions.goExplore')"
        :secondary-label="t('discussions.feedbackSuggestion')"
        @primary="openPath('/pages/discover/index')"
        @secondary="openPath('/subpackages/support/feedback/index')"
      />
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.section-stack {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.feed-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--c-border-light);
}

.feed-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.row-title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.row-subtitle,
.empty-state {
  font-size: var(--fs-base, 24rpx);
  line-height: 1.6;
  color: var(--c-text-secondary);
}

.retry-link {
  margin-left: 12rpx;
  color: var(--c-brand-500, #36C99A);
  font-weight: 600;
}
</style>
