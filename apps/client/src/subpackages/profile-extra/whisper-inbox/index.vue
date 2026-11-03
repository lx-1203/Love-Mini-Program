<script setup lang="ts">
/**
 * 悄悄话收件箱（2026-11-04，第三辑审查 F-10：付费悄悄话收件侧闭环）。
 *
 * 收件侧三端点（inbox/sent/read）此前零 UI 消费——发送者付费后收件人感知不到。
 * 本页「收到的/发出的」两 tab：进入收到的列表即由后端 SENT→DELIVERED（优先送达语义）；
 * tap 卡片调 readWhisper 标已读（失败 toast 不阻塞展示）；状态徽标直显后端账务事实
 * （SENT/DELIVERED/READ/PAY_FAILED/REFUNDED）；三态齐备+下拉刷新+登录墙。
 */
import { computed, ref, watch } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
import type { WhisperMessageView } from "../../../services/generated/api-types-supplement";
import { useSessionStore } from "../../../stores/session";
import { usePageAccess } from "../../../composables/usePageAccess";
import { messagesPageRequirements } from "../../../config/page-access";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { formatChatListTime, getCurrentLocale } from "../../../utils/time";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";
import EmptyState from "../../../components/common/EmptyState.vue";
import ErrorState from "../../../components/common/ErrorState.vue";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";

usePageAccess(messagesPageRequirements);

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const sessionStore = useSessionStore();
const { isLoggedIn } = storeToRefs(sessionStore);

const tabs = [
  { key: "received" },
  { key: "sent" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const activeTab = ref<TabKey>("received");
const receivedList = ref<WhisperMessageView[]>([]);
const sentList = ref<WhisperMessageView[]>([]);
const loading = ref(false);
const loadError = ref(false);
const markingRead = ref<Set<number>>(new Set());

const list = computed(() => (activeTab.value === "received" ? receivedList.value : sentList.value));
const receivedUnread = computed(() => receivedList.value.filter((w) => w.status !== "READ").length);

function timeText(createdAt: string | null): string {
  if (!createdAt) return "";
  const value = Date.parse(createdAt);
  return Number.isNaN(value) ? "" : formatChatListTime(value, getCurrentLocale());
}

/** R8（2026-11-04）：发送者头像（可空——缺失/注销兜底默认头像） */
function avatarOf(item: WhisperMessageView): string {
  return resolveMediaUrl(item.senderAvatar || IMAGE_PATHS.DEFAULT_AVATAR);
}

/** R8（2026-11-04）：发送者昵称（可空——兜底「神秘访客」文案） */
function senderNameOf(item: WhisperMessageView): string {
  return item.senderNickname || t("whisperInbox.anonymousSender");
}

/** 状态文案映射（静态键，i18n-orphan 门禁友好；未知状态兜底直显原始值） */
const STATUS_LABEL_KEYS: Record<string, string> = {
  sent: "whisperInbox.status.sent",
  delivered: "whisperInbox.status.delivered",
  read: "whisperInbox.status.read",
  pay_failed: "whisperInbox.status.pay_failed",
  refunded: "whisperInbox.status.refunded",
};

function statusLabel(status: string): string {
  const key = STATUS_LABEL_KEYS[String(status || "").toLowerCase()] ?? "";
  return key ? t(key) : String(status || "");
}

function statusClass(status: string): string {
  return `whisper-status--${String(status || "").toLowerCase()}`;
}

async function load(): Promise<void> {
  if (!isLoggedIn.value || loading.value) return;
  loading.value = true;
  loadError.value = false;
  try {
    const [received, sent] = await Promise.all([
      clientApi.getWhisperInbox(),
      clientApi.getWhisperSent(),
    ]);
    receivedList.value = received;
    sentList.value = sent;
  } catch (_e) {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function switchTab(tab: TabKey): void {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
}

async function onTap(item: WhisperMessageView): Promise<void> {
  if (activeTab.value !== "received") return;
  if (item.status === "READ") return;
  if (markingRead.value.has(item.id)) return;
  markingRead.value.add(item.id);
  try {
    const updated = await clientApi.readWhisper(item.id);
    const idx = receivedList.value.findIndex((w) => w.id === item.id);
    if (idx >= 0) receivedList.value[idx] = updated;
  } catch (_e) {
    uni.showToast({ title: t("whisperInbox.readFailed"), icon: "none" });
  } finally {
    markingRead.value.delete(item.id);
  }
}

function goBack(): void {
  uni.navigateBack({
    fail: () => {
      openAppPath(ROUTES.TAB.HOME);
    },
  });
}

watch(isLoggedIn, (loggedIn) => { if (loggedIn) void load(); }, { immediate: true });

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="whisper-page" :style="menuStyleVars">
    <view class="whisper-nav">
      <view class="whisper-nav__back" hover-class="whisper-nav__back--hover" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="whisper-nav__back-icon">‹</text>
      </view>
      <text class="whisper-nav__title">{{ t("whisperInbox.title") }}</text>
      <view class="whisper-nav__spacer" />
    </view>

    <view class="whisper-head">
      <view class="whisper-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="whisper-tab"
          :class="{ 'whisper-tab--active': activeTab === tab.key }"
          :aria-pressed="activeTab === tab.key"
          hover-class="whisper-tab--hover"
          role="button"
          @tap="switchTab(tab.key)"
        >
          <text class="whisper-tab__text">{{ tab.key === "received" ? t("whisperInbox.tabReceived") : t("whisperInbox.tabSent") }}</text>
        </view>
      </view>
      <view v-if="activeTab === 'received' && receivedUnread > 0" class="whisper-unread-count">
        <text class="whisper-unread-count__text">{{ t("whisperInbox.unreadCount", { n: receivedUnread }) }}</text>
      </view>
    </view>

    <SkeletonBlock v-if="loading && list.length === 0" variant="list" :rows="4" :label="t('common.loading')" />

    <ErrorState
      v-else-if="loadError && list.length === 0"
      :message="t('whisperInbox.loadFailed')"
      :description="t('whisperInbox.loadFailedSub')"
      @retry="load"
    />

    <EmptyState
      v-else-if="list.length === 0"
      type="no-data"
      :title="activeTab === 'received' ? t('whisperInbox.emptyReceived') : t('whisperInbox.emptySent')"
      :description="activeTab === 'received' ? t('whisperInbox.emptyReceivedSub') : t('whisperInbox.emptySentSub')"
    />

    <view v-else class="whisper-list">
      <!--
        received tab：tap=标已读（role=button 语义成立）；
        sent tab：卡片无 tap 动作，role/按压反馈一并移除（a11y：不可点的卡片不冒充按钮）
      -->
      <view
        v-for="item in list"
        :key="item.id"
        class="whisper-card"
        :class="{
          'whisper-card--unread': activeTab === 'received' && item.status !== 'READ',
          'whisper-card--static': activeTab === 'sent',
        }"
        :hover-class="activeTab === 'received' ? 'whisper-card--hover' : 'none'"
        :role="activeTab === 'received' ? 'button' : undefined"
        :aria-label="activeTab === 'received'
          ? `${senderNameOf(item)}：${item.content}`
          : item.content"
        @tap="onTap(item)"
      >
        <view class="whisper-avatar-wrap">
          <image class="whisper-avatar" :src="avatarOf(item)" mode="aspectFill" :aria-label="t('whisperInbox.senderAria')" />
          <view v-if="activeTab === 'received' && item.status !== 'READ'" class="whisper-unread-dot" />
        </view>
        <view class="whisper-body">
          <text class="whisper-sender">{{ activeTab === 'received' ? senderNameOf(item) : t('whisperInbox.toPeer') }}</text>
          <text class="whisper-content">{{ item.content }}</text>
          <view class="whisper-meta-row">
            <text class="whisper-time">{{ timeText(item.createdAt) }}</text>
            <text class="whisper-status" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.whisper-page {
  min-height: 100vh;
  padding: calc(var(--statusbar) + 108rpx) var(--sp-4) calc(var(--sp-8) + env(safe-area-inset-bottom));
  background: var(--c-bg-page);
}

.whisper-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  padding: calc(var(--statusbar) + 8rpx) var(--sp-4) 8rpx;
  background: var(--c-bg-page);
}

.whisper-nav__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--c-bg-container);
}

.whisper-nav__back--hover {
  opacity: 0.7;
}

.whisper-tab--hover {
  opacity: 0.85;
}

.whisper-card--hover {
  opacity: 0.85;
}

.whisper-nav__back-icon {
  font-size: 40rpx;
  line-height: 1;
  color: var(--c-text-primary);
  margin-top: -4rpx;
}

.whisper-nav__title {
  flex: 1;
  text-align: center;
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.whisper-nav__spacer {
  width: 64rpx;
  height: 64rpx;
}

.whisper-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.whisper-tabs {
  display: flex;
  gap: var(--sp-2);
  padding: 6rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
}

.whisper-tab {
  padding: 12rpx 28rpx;
  border-radius: var(--r-full);
}

.whisper-tab--active {
  background: var(--c-brand-600);
}

.whisper-tab__text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

.whisper-tab--active .whisper-tab__text {
  color: #ffffff;
  font-weight: 600;
}

.whisper-unread-count__text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.whisper-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.whisper-card {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
}

.whisper-card--unread {
  background: var(--c-brand-50);
}

.whisper-card--static {
  background: var(--c-bg-container);
}

.whisper-sender {
  display: block;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-secondary);
  margin-bottom: 4rpx;
}

.whisper-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.whisper-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-bg-page);
}

.whisper-unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--c-error);
  border: 2rpx solid var(--c-bg-container);
}

.whisper-body {
  flex: 1;
  min-width: 0;
}

.whisper-content {
  display: block;
  font-size: var(--fs-lg);
  line-height: 1.5;
  color: var(--c-text-primary);
  word-break: break-all;
}

.whisper-meta-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: 10rpx;
}

.whisper-time {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.whisper-status {
  font-size: var(--fs-sm);
  color: var(--c-brand-700);
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  padding: 4rpx 14rpx;
}

.whisper-status--read {
  color: var(--c-text-tertiary);
  background: var(--c-bg-container);
}

.whisper-status--sent {
  color: #c47f17;
  background: #fdf3e0;
}

.whisper-status--delivered {
  color: var(--c-brand-700);
  background: var(--c-brand-50);
}

.whisper-status--pay_failed,
.whisper-status--refunded {
  color: var(--c-error);
  background: var(--c-bg-container);
}
</style>
