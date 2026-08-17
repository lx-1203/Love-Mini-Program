<script setup lang="ts">
/**
 * 寻觅助手会话页（消息 V3）。
 * 单账号官方号消息流，v1 只读。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";
import LockScreen from "../../components/common/LockScreen.vue";
import ChatBubble from "../../components/chat/ChatBubble.vue";
import ActivityCard, { type ActivityCardData } from "../../components/chat/ActivityCard.vue";
import { request } from "../../services/http";
import { useMock } from "../../stores/helpers/use-mock";
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import type {
  OfficialAccountView,
  OfficialMessageView,
} from "../../services/generated/api-types-supplement";

usePageAccess(chatPageRequirements);

const { t } = useI18n();
const sessionStore = useSessionStore();
const isUnlocked = computed(() => sessionStore.isLoggedIn);
const completionPercent = computed(() => sessionStore.profileCompletion);

const accountId = ref("official-assistant");
const assistantAvatar = IMAGE_PATHS.MESSAGE_ICONS.ASSISTANT_AVATAR;
const accountName = ref("寻觅助手");
const accountDesc = ref("你的恋爱小管家");
const loading = ref(false);
const errorMessage = ref("");
const messages = ref<OfficialMessageView[]>([]);



async function loadOfficialChat(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    if (useMock()) {
      messages.value = [
        {
          id: 101, messageType: "text",
          content: "你好，我是寻觅助手 🌱 今天也会帮你抓住真正重要的关系。",
          cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
          publishedAt: new Date(Date.now() - 4 * 86400000).toISOString(), cardActivity: null,
        },
        {
          id: 102, messageType: "text",
          content: "有人喜欢你：进入消息页今日心动，看看谁想认识你。",
          cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
          publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(), cardActivity: null,
        },
        {
          id: 103, messageType: "card",
          content: "周末附近有一场适合你的露营活动，名额不多啦。",
          cardTitle: "城市露营计划",
          cardDesc: "周六 14:00 · 距离 2.3km",
          cardTag: "周末活动",
          cardTargetUrl: "/subpackages/discover/activities/index",
          publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          cardActivity: {
            activityId: 2001,
            title: "城市露营计划",
            imageUrl: IMAGE_PATHS.ACTIVITIES.ACTIVITY_SPORTS,
            timeText: "周六 14:00",
            locationText: "2.3km",
            enrollmentCount: 12,
            recommendReason: "你和小林都喜欢咖啡与户外",
          },
        },
        {
          id: 104, messageType: "text",
          content: "建议回复小林：你们已经连续聊天 3 天啦。",
          cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
          publishedAt: new Date(Date.now() - 86400000).toISOString(), cardActivity: null,
        },
      ];
      return;
    }

    const accounts = await request<OfficialAccountView[]>({
      url: "/official-accounts",
      method: "GET",
    });
    const meta = accounts.find((a) => a.code === accountId.value) ?? accounts[0];
    if (meta) {
      accountName.value = meta.name;
      accountDesc.value = meta.description;
    }
    messages.value = await request<OfficialMessageView[]>({
      url: `/official-accounts/${encodeURIComponent(accountId.value)}/messages`,
      method: "GET",
    });
  } catch (_error) {
    errorMessage.value = t("messages.officialChatLoadFailed");
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

function toActivityCard(msg: OfficialMessageView): ActivityCardData {
  const activity = msg.cardActivity;
  return {
    title: activity?.title ?? msg.cardTitle ?? "活动",
    desc: msg.cardDesc ?? msg.content,
    tag: msg.cardTag ?? "活动",
    targetUrl: msg.cardTargetUrl ?? "/subpackages/discover/activities/index",
    image: activity?.imageUrl ?? null,
    time: activity?.timeText ?? null,
    distance: activity?.locationText ?? null,
    count: activity?.enrollmentCount ?? null,
    recommendReason: activity?.recommendReason ?? null,
  };
}

function handleActivityTap(targetUrl: string) {
  openAppPath(targetUrl);
}

function goBack() {
  uni.navigateBack();
}

onLoad((query) => {
  if (!isUnlocked.value) return;
  const raw = query?.accountId;
  if (typeof raw === "string" && raw) accountId.value = raw;
  void loadOfficialChat();
});
</script>

<template>
  <view class="assistant-chat">
    <LockScreen v-if="!isUnlocked" :completion-percent="completionPercent" />
    <template v-else>
      <view class="assistant-chat__nav">
        <view class="assistant-chat__back" @tap="goBack"><text class="assistant-chat__back-text">‹</text></view>
        <view class="assistant-chat__title-wrap">
          <text class="assistant-chat__title">🌱 {{ accountName }}</text>
          <text class="assistant-chat__desc">{{ accountDesc }}</text>
        </view>
        <view class="assistant-chat__more"><text>···</text></view>
      </view>

      <view v-if="loading" class="assistant-chat__state"><text>{{ t('common.loading') }}</text></view>
      <view v-else-if="errorMessage" class="assistant-chat__state">
        <text class="assistant-chat__error">{{ errorMessage }}</text>
        <view class="assistant-chat__retry" @tap="loadOfficialChat"><text>重试</text></view>
      </view>
      <scroll-view v-else class="assistant-chat__scroll" scroll-y>
        <view class="assistant-chat__list">
          <view class="assistant-chat__intro">
            <image class="assistant-chat__intro-avatar" :src="assistantAvatar" mode="aspectFit" />
            <text class="assistant-chat__intro-title">Hi~ 我是寻觅助手 🌱</text>
            <text class="assistant-chat__intro-desc">我会帮你发现有趣的人和活动</text>
          </view>
          <view v-for="msg in messages" :key="msg.id" class="assistant-chat__row">
            <ChatBubble v-if="msg.messageType === 'text'" sender="peer" :peer-avatar="assistantAvatar" kind="text" :body="msg.content" :sent-at="msg.publishedAt" />
            <ActivityCard v-else :card="toActivityCard(msg)" @tap-card="handleActivityTap" />
          </view>
        </view>
      </scroll-view>
      <view class="assistant-chat__composer">
        <view class="assistant-chat__composer-btn"><text>😊</text></view>
        <view class="assistant-chat__composer-input"><text>对我说点什么吧～</text></view>
        <view class="assistant-chat__composer-btn"><text>+</text></view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.assistant-chat {
  min-height: 100vh;
  background: #F4FBF8;
}
.assistant-chat__nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 24rpx 20rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: #FFFFFF;
  border-bottom: 1rpx solid #ECEFF2;
}
.assistant-chat__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.assistant-chat__back-text {
  font-size: 56rpx;
  color: #36C99A;
}
.assistant-chat__title-wrap {
  flex: 1;
}
.assistant-chat__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222222;
}
.assistant-chat__desc {
  display: block;
  font-size: 22rpx;
  color: #999999;
}
.assistant-chat__more {
  font-size: 40rpx;
  color: #666666;
}
.assistant-chat__state {
  padding: 60rpx 32rpx;
  text-align: center;
  color: #999999;
}
.assistant-chat__error {
  display: block;
  margin-bottom: 20rpx;
  color: #E94D87;
}
.assistant-chat__retry {
  display: inline-flex;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #E8F8F1;
  color: #36C99A;
  font-weight: 600;
}
.assistant-chat__scroll {
  height: calc(100vh - 200rpx - env(safe-area-inset-top));
}
.assistant-chat__list {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.assistant-chat__row {
  display: flex;
}
.assistant-chat__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 32rpx;
}
.assistant-chat__intro-avatar {
  width: 160rpx;
  height: 160rpx;
}
.assistant-chat__intro-title {
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #222222;
}
.assistant-chat__intro-desc {
  font-size: 26rpx;
  color: #62716A;
}
.assistant-chat__composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #F4F6F5;
}
.assistant-chat__composer-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #222222;
}
.assistant-chat__composer-input {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 18rpx;
  background: #F4F5F5;
  font-size: 26rpx;
  color: #999999;
}
</style>




