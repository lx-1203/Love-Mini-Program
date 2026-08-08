<script setup lang="ts">
/**
 * 官方号会话页（Phase Feedback3 P2.4）
 *
 * 展示官方账号（恋爱助手 / 活动推送）的消息流与活动卡片。
 * - 恋爱助手：恋爱小贴士 / 功能解锁指引
 * - 活动推送：近期活动卡片（含 CTA）
 *
 * 展示版数据源为本地 mock（复用 messages store 的 mock 语义），
 * 正式接入后端官方号账号体系后替换为 HTTP 拉取。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../components/layout/AppShell.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";
import { appEnv } from "../../services/env";
import { request } from "../../services/http";
import type {
  OfficialAccountView,
  OfficialMessageView,
} from "../../services/generated/api-types-supplement";

const { t } = useI18n();

/** CTA 箭头图标（SVG，替换 › 字符） */
const chevronRightSrc = IMAGE_PATHS.ICONS_COMMON.CHEVRON_RIGHT_SVG;

/** 官方号会话要求（复用聊天页访问要求） */
usePageAccess(chatPageRequirements);

/** 当前官方号 ID（official-assistant / official-promoter） */
const accountId = ref<string>("official-assistant");

/** 加载中 */
const loading = ref(false);

/** 官方号消息条目（text / card 统一渲染） */
interface OfficialChatMessage {
  id: string;
  messageType: "text" | "card";
  body: string;
  cardTitle: string | null;
  cardDesc: string | null;
  cardTag: string | null;
  cardTargetUrl: string | null;
  sentAt: string;
}

/** 官方号元信息（mock 模式本地常量；real 模式由后端 /official-accounts 拉取） */
interface OfficialAccountMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** Mock 模式官方号元信息（与后端种子数据对齐：产品助手 / 活动运营） */
const mockAccounts: OfficialAccountMeta[] = [
  {
    id: "official-assistant",
    name: "产品助手",
    description: "系统通知 · 功能答疑",
    icon: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  },
  {
    id: "official-promoter",
    name: "活动运营",
    description: "活动推送 · 福利通知",
    icon: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
  },
];

/** 当前官方号元信息 */
const currentAccount = ref<OfficialAccountMeta | null>(
  mockAccounts.find((a) => a.id === "official-assistant") ?? null
);

/** 官方号名称（标题展示） */
const accountName = computed(() => currentAccount.value?.name ?? t("messages.officialChatTitle"));

/** Mock 模式消息内容（i18n 文案，与后端种子文案对齐） */
const officialMessageKeyMap: Record<string, string[]> = {
  "official-assistant": [
    "messages.officialAssistantMsg1",
    "messages.officialAssistantMsg2",
    "messages.officialAssistantMsg3",
    "messages.officialAssistantMsg4",
  ],
  "official-promoter": [
    "messages.officialPromoterMsg1",
    "messages.officialPromoterMsg2",
    "messages.officialPromoterMsg3",
  ],
};

/** 当前官方号消息 */
const messages = ref<OfficialChatMessage[]>([]);

/** 活动卡片（从 card 类型消息生成） */
interface ActivityCardView {
  id: string;
  title: string;
  desc: string;
  tag: string;
  target: string;
}

const activityCards = ref<ActivityCardView[]>([]);

/** 是否展示活动卡片（当前账号存在 card 类型消息时） */
const showActivities = computed(() => activityCards.value.length > 0);

/**
 * 加载官方号数据（账号元信息 + 消息流）。
 * - mock 模式：本地常量（复用 messages store 的 mock 语义）
 * - real 模式：GET /official-accounts + GET /official-accounts/{code}/messages
 */
async function loadOfficialChat(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式：本地数据（与后端种子文案对齐）
      currentAccount.value =
        mockAccounts.find((a) => a.id === accountId.value) ?? mockAccounts[0]!;
      const keys = officialMessageKeyMap[accountId.value] ?? [];
      messages.value = keys.map((key, idx) => ({
        id: `${accountId.value}-${idx}`,
        messageType: "text" as const,
        body: t(key),
        cardTitle: null,
        cardDesc: null,
        cardTag: null,
        cardTargetUrl: null,
        sentAt: new Date(Date.now() - (keys.length - idx) * 6 * 3600 * 1000).toISOString(),
      }));
      // Mock 活动卡片（仅活动运营号）
      if (accountId.value === "official-promoter") {
        activityCards.value = [
          {
            id: "qixi-special",
            title: "七夕特别企划：星空告白夜",
            desc: "在星空下认识心动的人，游戏与表白墙等你来解锁。",
            tag: "七夕限定",
            target: "/pages/activities/detail?id=qixi-2026",
          },
          {
            id: "star-confession",
            title: "校园操场「星空告白夜」",
            desc: "本周五晚 19:00 · 现场抽幸运观众上台告白",
            tag: "本周活动",
            target: "/pages/activities/detail?id=star-confession",
          },
        ];
      } else {
        activityCards.value = [];
      }
      return;
    }

    // Real 模式：拉取官方号账号元信息 + 消息流
    const accounts = await request<OfficialAccountView[]>({
      url: "/official-accounts",
      method: "GET",
    });
    const accountMeta = accounts.find((a) => a.code === accountId.value) ?? accounts[0];
    if (accountMeta) {
      currentAccount.value = {
        id: accountMeta.code,
        name: accountMeta.name,
        description: accountMeta.description,
        icon: accountMeta.iconUrl || "",
      };
    }
    const rawMessages = await request<OfficialMessageView[]>({
      url: `/official-accounts/${encodeURIComponent(accountId.value)}/messages`,
      method: "GET",
    });
    messages.value = rawMessages.map((msg) => ({
      id: String(msg.id),
      messageType: msg.messageType === "card" ? "card" : "text",
      body: msg.content,
      cardTitle: msg.cardTitle,
      cardDesc: msg.cardDesc,
      cardTag: msg.cardTag,
      cardTargetUrl: msg.cardTargetUrl,
      sentAt: msg.publishedAt,
    }));
    // 活动卡片从 card 类型消息生成
    activityCards.value = rawMessages
      .filter((msg) => msg.messageType === "card" && msg.cardTitle && msg.cardTargetUrl)
      .map((msg, idx) => ({
        id: String(msg.id) ?? `card-${idx}`,
        title: msg.cardTitle ?? "",
        desc: msg.cardDesc ?? msg.content,
        tag: msg.cardTag ?? "",
        target: msg.cardTargetUrl ?? "",
      }));
  } catch (_error) {
    // 加载失败回退 mock 文案（保证页面不空白）
    currentAccount.value =
      mockAccounts.find((a) => a.id === accountId.value) ?? mockAccounts[0]!;
    const keys = officialMessageKeyMap[accountId.value] ?? [];
    messages.value = keys.map((key, idx) => ({
      id: `${accountId.value}-${idx}`,
      messageType: "text" as const,
      body: t(key),
      cardTitle: null,
      cardDesc: null,
      cardTag: null,
      cardTargetUrl: null,
      sentAt: new Date(Date.now() - (keys.length - idx) * 6 * 3600 * 1000).toISOString(),
    }));
    activityCards.value = [];
  } finally {
    loading.value = false;
  }
}

/** 时间格式化 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

onLoad((query) => {
  const raw = query?.accountId;
  if (typeof raw === "string" && (raw === "official-assistant" || raw === "official-promoter")) {
    accountId.value = raw;
  }
  void loadOfficialChat();
});

/** 活动卡片点击 */
function handleActivityTap(target: string) {
  openAppPath(target);
}

/** 官方号头像图标（无 iconUrl 时的兜底） */
function officialIcon(id: string): string {
  return id === "official-promoter" ? IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE : IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED;
}
</script>

<template>
  <AppShell
    :title="accountName"
    :subtitle="t('messages.officialBadge')"
    show-back
  >
    <!-- 官方号会话：消息流 -->
    <SectionCard :title="t('messages.officialChatTitle')" compact>
      <view v-if="!loading && messages.length === 0" class="official-empty">
        <EmptyState :title="t('messages.officialChatEmpty')" />
      </view>
      <view v-else class="official-list" role="list">
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="official-msg official-msg--left"
        >
          <view class="official-msg__avatar">
            <!-- 有后端 iconUrl 用图；否则用 emoji 兜底图标 -->
            <SafeImage
              v-if="currentAccount?.icon"
              :src="currentAccount.icon"
              custom-class="official-msg__avatar-img official-msg__avatar-img--photo"
              mode="aspectFill"
            />
            <image
              v-else
              class="official-msg__avatar-img"
              :src="officialIcon(currentAccount?.id ?? 'official-assistant')"
              mode="aspectFit"
              alt=""
            />
          </view>
          <view class="official-msg__content">
            <!-- card 类型：活动卡片内联样式 -->
            <view v-if="msg.messageType === 'card' && msg.cardTitle" class="official-msg__card">
              <view class="official-msg__card-header">
                <text v-if="msg.cardTag" class="official-msg__card-tag">{{ msg.cardTag }}</text>
                <text class="official-msg__card-title">{{ msg.cardTitle }}</text>
              </view>
              <text class="official-msg__card-desc">{{ msg.cardDesc || msg.body }}</text>
              <view v-if="msg.cardTargetUrl" class="official-msg__card-cta" @tap.stop="handleActivityTap(msg.cardTargetUrl!)">
                <text>{{ t('messages.officialActivityCta') }}</text>
                <image class="official-msg__card-arrow" :src="chevronRightSrc" mode="aspectFit" alt="" />
              </view>
            </view>
            <!-- text 类型：普通气泡 -->
            <view v-else class="official-msg__bubble">
              <text class="official-msg__text">{{ msg.body }}</text>
            </view>
            <text class="official-msg__time">{{ formatTime(msg.sentAt) }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 活动推送：近期活动卡片（card 类型消息聚合） -->
    <SectionCard v-if="showActivities" :title="t('messages.officialActivityTitle')" compact>
      <view class="official-activities" role="list">
        <view
          v-for="card in activityCards"
          :key="card.id"
          class="activity-card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="handleActivityTap(card.target)"
        >
          <view class="activity-card__header">
            <text class="activity-card__tag">{{ card.tag }}</text>
            <text class="activity-card__title">{{ card.title }}</text>
          </view>
          <text class="activity-card__desc">{{ card.desc }}</text>
          <view class="activity-card__cta">
            <text>{{ t('messages.officialActivityCta') }}</text>
            <image class="activity-card__cta-arrow" :src="chevronRightSrc" mode="aspectFit" alt="" />
          </view>
        </view>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.official-empty {
  padding: var(--sp-8) 0;
}

.official-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.official-msg {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
}

.official-msg__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-romance-50));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1rpx solid var(--c-brand-200);
}

.official-msg__avatar-img {
  width: 40rpx;
  height: 40rpx;
  color: var(--c-brand-500);

  &--photo {
    width: 72rpx;
    height: 72rpx;
    border-radius: var(--r-full);
  }
}

/* card 类型消息（内联活动卡片） */
.official-msg__card {
  max-width: 100%;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-lg);
  border-top-left-radius: 4rpx;
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-romance-50));
  border: 1rpx solid var(--c-brand-shadow-tint);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.official-msg__card-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.official-msg__card-tag {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-romance-500));
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.official-msg__card-title {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.official-msg__card-desc {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.official-msg__card-cta {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 600;
  align-self: flex-end;
}

.official-msg__card-arrow {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}

.official-msg__content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
  flex: 1;
}

.official-msg__bubble {
  max-width: 100%;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-lg);
  border-top-left-radius: 4rpx;
  background: var(--c-neutral-50);
  border: 1rpx solid var(--c-border-light);
}

.official-msg__text {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  line-height: 1.6;
  word-break: break-all;
}

.official-msg__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  padding-left: var(--sp-1);
}

/* ========== 活动卡片 ========== */
.official-activities {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.activity-card {
  padding: var(--sp-5) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-romance-50));
  border: 1rpx solid var(--c-brand-shadow-tint);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.activity-card__header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.activity-card__tag {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-romance-500));
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.activity-card__title {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.activity-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 600;
  align-self: flex-end;
}

.activity-card__cta-arrow {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}
</style>
