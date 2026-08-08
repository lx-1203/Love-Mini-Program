<script setup lang="ts">
/**
 * 个人主页访客记录页（功能3）
 *
 * 展示当前用户主页的访客历史记录，按访问时间倒序排列。
 * 数据来源（P1-13）：复用 likes store 的访客数据（GET /api/matches/visitors），
 * 与「喜欢与访客」页保持一致；不再单独调用 GET /api/profile/visitors。
 *
 * 页面功能：
 * - 加载访客列表（首次进入自动加载，下拉刷新）
 * - 按时间段分组展示（今日/昨日/更早）
 * - 点击访客项跳转到对方主页
 * - 空状态友好提示
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（mp-weixin 不支持）
 * - 不使用 import.meta.env.DEV（mp-weixin 运行时会报错）
 * - 不使用 backdrop-filter（仅 H5 条件编译）
 * - 不使用 optional catch binding（catch {}），mp-weixin 不兼容
 */
import { ref, computed, onMounted } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useLikesStore } from "../../stores/likes";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import { errorHaptic, lightHaptic } from "../../utils/haptic";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";

/** 前端展示用的访客记录（时间分组由 getGroup 推导，R4-00114：不再预置死字段） */
interface VisitorItem {
  visitorId: number;
  nickname: string;
  avatarUrl: string;
  campusName: string;
  visitedAt: string;
}

const { t } = useI18n();
const likesStore = useLikesStore();

/** 是否正在加载 */
const loading = ref<boolean>(false);
/** 错误信息（用于错误状态展示） */
const errorMessage = ref<string | null>(null);

/** likes store 访客列表（P1-13 数据源） */
const { visitors: likesVisitors } = storeToRefs(likesStore);

/**
 * 访客列表（原始数据，P1-13：由 likes store 的 /matches/visitors 派生）。
 * likes store 的 VisitorRecord（userId/name/avatar/headline/visitedAt）
 * 映射为本页展示结构，headline 即访客学校信息。
 */
const visitors = computed<VisitorItem[]>(() =>
  likesVisitors.value.map((v) => ({
    visitorId: Number(v.userId),
    nickname: v.name,
    avatarUrl: v.avatar,
    campusName: v.headline,
    visitedAt: v.visitedAt,
  })),
);

/**
 * 将 ISO 时间字符串解析为 Date 对象
 * 兼容后端返回的 "yyyy-MM-dd HH:mm:ss" 与 ISO 8601 两种格式
 *
 * @param dateStr - 时间字符串
 * @returns Date 对象
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  // 后端返回 "yyyy-MM-dd HH:mm:ss"，部分浏览器无法直接 new Date() 解析，需替换为 ISO 格式
  const isoStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? new Date(0) : date;
}

/**
 * 计算访客记录所属的时间分组
 * - today：今日访问
 * - yesterday：昨日访问
 * - earlier：更早
 *
 * @param dateStr - 访问时间字符串
 * @returns 分组标识
 */
function getGroup(dateStr: string): "today" | "yesterday" | "earlier" {
  const date = parseDate(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  if (date >= todayStart) return "today";
  if (date >= yesterdayStart) return "yesterday";
  return "earlier";
}

/**
 * 按时间分组后的访客列表（用于模板渲染）
 * 顺序：今日 → 昨日 → 更早
 */
const groupedVisitors = computed<{ group: "today" | "yesterday" | "earlier"; items: VisitorItem[] }[]>(() => {
  const groups: Record<"today" | "yesterday" | "earlier", VisitorItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const v of visitors.value) {
    const group = getGroup(v.visitedAt);
    // R4-00114：group 为派生字段（getGroup 推导），不再冗余存储到 item 上
    groups[group].push({ ...v });
  }
  const result: { group: "today" | "yesterday" | "earlier"; items: VisitorItem[] }[] = [
    { group: "today", items: groups.today },
    { group: "yesterday", items: groups.yesterday },
    { group: "earlier", items: groups.earlier },
  ];
  return result.filter((g) => g.items.length > 0);
});

/**
 * 格式化时间显示
 * - 今日：显示"HH:mm"
 * - 昨日：显示"昨日 HH:mm"
 * - 更早：显示"MM-DD HH:mm"
 *
 * @param dateStr - 时间字符串
 * @param group - 时间分组
 * @returns 格式化后的时间文本
 */
function formatTime(dateStr: string, group: "today" | "yesterday" | "earlier"): string {
  const date = parseDate(dateStr);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (group === "today") return `${hh}:${mm}`;
  if (group === "yesterday") return `${t("profile.visitorYesterday")} ${hh}:${mm}`;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day} ${hh}:${mm}`;
}

/**
 * 分组标题
 */
function groupTitle(group: "today" | "yesterday" | "earlier"): string {
  if (group === "today") return t("profile.visitorToday");
  if (group === "yesterday") return t("profile.visitorYesterday");
  return t("profile.visitorEarlier");
}

/**
 * 加载访客列表（功能3核心）
 *
 * P1-13：数据源统一为 likes store 的 /matches/visitors（与「喜欢与访客」页一致），
 * mock/real 分发由 store 内部处理。
 *
 * 错误处理：
 * - 网络错误：设置 errorMessage，展示错误状态
 * - 401：由 http 拦截器统一处理
 */
async function loadVisitors(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  try {
    await likesStore.fetchVisitors();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("common.networkError");
  } finally {
    loading.value = false;
  }
}

/**
 * 点击访客项：跳转到对方主页
 * @param visitorId - 访客用户 ID
 */
function handleItemClick(visitorId: number): void {
  if (!visitorId) return;
  lightHaptic();
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(String(visitorId))}`);
}

/**
 * 重试加载（错误状态下点击重试按钮）
 */
function handleRetry(): void {
  errorHaptic();
  void loadVisitors();
}

onMounted(() => {
  void loadVisitors();
});

/**
 * 下拉刷新：重新加载访客列表
 */
onPullDownRefresh(async () => {
  try {
    await loadVisitors();
  } finally {
    uni.stopPullDownRefresh();
  }
});
</script>

<template>
  <view class="visitors-page page-fade-in">
    <!-- 页面标题 -->
    <view class="visitors-header">
      <text class="visitors-header__title">{{ t("profile.visitorsTitle") }}</text>
      <text class="visitors-header__count" v-if="visitors.length > 0">
        {{ t("profile.visitors") }} · {{ visitors.length }}
      </text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && visitors.length === 0" class="visitors-loading">
      <view class="visitors-loading__spinner" />
      <text class="visitors-loading__text">{{ t("common.loading") }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage" class="visitors-error card-base" role="alert">
      <text class="visitors-error__title">{{ errorMessage }}</text>
      <view class="visitors-error__retry press-feedback" @tap="handleRetry">
        <text class="visitors-error__retry-text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="visitors.length === 0" class="visitors-empty card-base">
      <SafeImage
        :src="IMAGE_PATHS.ICONS_SOCIAL.VISITOR"
        custom-class="visitors-empty__icon"
        mode="aspectFit"
      />
      <text class="visitors-empty__title">{{ t("profile.visitorsEmpty") }}</text>
      <text class="visitors-empty__subtitle">{{ t("profile.visitorsEmptyDesc") }}</text>
    </view>

    <!-- 访客列表（按时间分组） -->
    <view v-else class="visitors-list" role="list">
      <view
        v-for="group in groupedVisitors"
        :key="group.group"
        class="visitors-group"
      >
        <text class="visitors-group__title">{{ groupTitle(group.group) }}</text>
        <view class="visitors-group__items">
          <view
            v-for="(item, idx) in group.items"
            :key="`${item.visitorId}-${idx}`"
            class="visitors-card press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleItemClick(item.visitorId)"
          >
            <view class="visitors-card__avatar-wrap">
              <image
                v-if="item.avatarUrl"
                class="visitors-card__avatar"
                :src="resolveMediaUrl(item.avatarUrl)"
                mode="aspectFill"
                lazy-load alt=""
              />
              <view v-else class="visitors-card__avatar-placeholder">
                <text class="visitors-card__avatar-initial">
                  {{ (item.nickname || "?").charAt(0) }}
                </text>
              </view>
            </view>
            <view class="visitors-card__info">
              <text class="visitors-card__name">{{ item.nickname || t("common.noData") }}</text>
              <text class="visitors-card__campus" v-if="item.campusName">{{ item.campusName }}</text>
            </view>
            <text class="visitors-card__time">{{ formatTime(item.visitedAt, group.group) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.visitors-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: var(--c-gradient-page);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  box-sizing: border-box;
}

.visitors-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
}

.visitors-header__title {
  font-size: var(--fs-5xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.visitors-header__count {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* ========== 加载状态 ========== */
.visitors-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: var(--sp-10) 0;
}

.visitors-loading__spinner {
  width: var(--sp-10);
  height: var(--sp-10);
  border: var(--sp-1) solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: var(--r-full);
  animation: visitors-spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes visitors-spin {
  to { transform: rotate(360deg); }
}

.visitors-loading__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 错误状态 ========== */
.visitors-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-10);
  margin-top: var(--sp-5);
}

.visitors-error__title {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  text-align: center;
}

.visitors-error__retry {
  padding: var(--sp-3) var(--sp-6);
  background: var(--c-brand);
  border-radius: var(--r-full);
}

.visitors-error__retry-text {
  /* 反色文字：使用 token 替代硬编码 #ffffff */
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 空状态 ========== */
.visitors-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-10);
  margin-top: var(--sp-5);
}

.visitors-empty__icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.5;
}

.visitors-empty__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.visitors-empty__subtitle {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
}

/* ========== 访客列表 ========== */
.visitors-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}

.visitors-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.visitors-group__title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-tertiary);
  padding-left: var(--sp-2);
}

.visitors-group__items {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.visitors-card {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-5) var(--sp-6);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.visitors-card__avatar-wrap {
  flex-shrink: 0;
}

.visitors-card__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  border: var(--sp-1) solid var(--c-bg-brand);
}

.visitors-card__avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--sp-1) solid var(--c-bg-brand);
}

.visitors-card__avatar-initial {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-brand);
}

.visitors-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.visitors-card__name {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visitors-card__campus {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visitors-card__time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}
</style>
