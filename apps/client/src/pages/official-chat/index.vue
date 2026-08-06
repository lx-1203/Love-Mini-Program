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

const { t } = useI18n();

/** 官方号会话要求（复用聊天页访问要求） */
usePageAccess(chatPageRequirements);

/** 当前官方号 ID（official-assistant / official-promoter） */
const accountId = ref<string>("official-assistant");

/** 官方号元信息 */
const officialAccounts = [
  {
    id: "official-assistant",
    nameKey: "messages.officialAssistant",
    descKey: "messages.officialAssistantDesc",
    icon: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  },
  {
    id: "official-promoter",
    nameKey: "messages.officialPromoter",
    descKey: "messages.officialPromoterDesc",
    icon: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
  },
] as const;

const currentAccount = computed(() =>
  officialAccounts.find((a) => a.id === accountId.value)
);

/** 各官方号的消息内容（i18n 文案） */
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

/** 当前官方号消息（本地 mock 时间戳） */
const messages = computed(() => {
  const keys = officialMessageKeyMap[accountId.value] ?? [];
  return keys.map((key, idx) => ({
    id: `${accountId.value}-${idx}`,
    body: t(key),
    sentAt: new Date(Date.now() - (keys.length - idx) * 6 * 3600 * 1000).toISOString(),
  }));
});

/** 活动卡片（仅活动推送号展示） */
const activityCards = [
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
] as const;

/** 是否展示活动卡片（仅官方 promoter） */
const showActivities = computed(() => accountId.value === "official-promoter");

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
  if (typeof raw === "string" && officialAccounts.some((a) => a.id === raw)) {
    accountId.value = raw;
  }
});

/** 活动卡片点击 */
function handleActivityTap(target: string) {
  openAppPath(target);
}
</script>

<template>
  <AppShell
    :title="t(currentAccount?.nameKey ?? 'messages.officialChatTitle')"
    :subtitle="t('messages.officialBadge')"
    show-back
  >
    <!-- 官方号会话：消息流 -->
    <SectionCard :title="t('messages.officialChatTitle')" compact>
      <view v-if="messages.length === 0" class="official-empty">
        <EmptyState :title="t('messages.officialChatEmpty')" />
      </view>
      <view v-else class="official-list" role="list">
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="official-msg official-msg--left"
        >
          <view class="official-msg__avatar">
            <SafeImage :src="currentAccount?.icon ?? ''" custom-class="official-msg__avatar-img" mode="aspectFit" />
          </view>
          <view class="official-msg__content">
            <view class="official-msg__bubble">
              <text class="official-msg__text">{{ msg.body }}</text>
            </view>
            <text class="official-msg__time">{{ formatTime(msg.sentAt) }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 活动推送：近期活动卡片 -->
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
          <text class="activity-card__cta">{{ t('messages.officialActivityCta') }} ›</text>
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
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 600;
  align-self: flex-end;
}
</style>
