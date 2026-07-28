<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import VoicePill from "./VoicePill.vue";
import { resolveMediaUrl } from "../../utils/media";

const props = withDefaults(
  defineProps<{
    sender: "self" | "peer" | "system";
    kind: "text" | "voice" | "emoji" | "system";
    body: string;
    sentAt: string;
    durationSeconds?: number | null;
    recalled?: boolean;
    deliveryStatus?: "sent" | "delivered" | "read";
    /** 对方消息是否已被当前用户阅读 */
    isRead?: boolean;
    quoteRef?: string | null;
    quoteBody?: string | null;
    quoteSender?: string | null;
    /** 是否允许长按操作（仅自己的消息且未撤回时） */
    canInteract?: boolean;
    /** 对方头像（默认使用配置中的 AVATAR_1） */
    peerAvatar?: string;
    /** 自己头像（默认使用配置中的 AVATAR_2） */
    selfAvatar?: string;
  }>(),
  {
    peerAvatar: IMAGE_PATHS.AVATARS.AVATAR_1,
    selfAvatar: IMAGE_PATHS.AVATARS.AVATAR_2,
  }
);

const emit = defineEmits<{
  longpress: [messageId: string];
  tapQuote: [quoteRef: string];
  avatarTap: [];
}>();

const { t } = useI18n();

/** 撤回消息文案 */
const recalledText = computed(() =>
  props.sender === "self" ? t("chat.recalledBySelf") : t("chat.recalledByPeer")
);

/** 是否为自己发送的消息（提取为计算属性以避免 vue-tsc 模板类型收窄问题） */
const isSelfSender = computed(() => props.sender === "self");

/** 是否为对方发送的消息 */
const isPeerSender = computed(() => props.sender === "peer");

/** 引用消息发送者文案 */
const quoteSenderLabel = computed(() => {
  if (props.quoteSender === "self") return t("chat.quoteMe");
  return props.quoteSender || t("chat.quotePeer");
});

/** 气泡 ARIA 标签（按发送者 + 类型组合） */
const bubbleAriaLabel = computed(() => {
  if (props.recalled) return recalledText.value;
  const isSelf = props.sender === "self";
  if (props.kind === "voice") {
    return isSelf ? t("chat.selfVoiceMessage") : t("chat.peerVoiceMessage");
  }
  if (props.sender === "system") return t("chat.systemMessage");
  return isSelf ? t("chat.selfTextMessage") : t("chat.peerTextMessage");
});

/** 长按事件处理 */
function handleLongpress() {
  if (props.canInteract && !props.recalled) {
    emit("longpress", props.quoteRef || "");
  }
}

/** 点击引用消息 */
function handleTapQuote() {
  if (props.quoteRef) {
    emit("tapQuote", props.quoteRef);
  }
}

/** 点击对方头像 */
function handlePeerAvatarTap() {
  emit("avatarTap");
}

// 修复（严格模式 noUnusedLocals）：bubbleAriaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用，
// 同时暴露无障碍标签供父组件/测试访问。
defineExpose({ bubbleAriaLabel });

/** 格式化时间显示 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return isToday ? `${hours}:${minutes}` : `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
  } catch (_e) {
    return isoString;
  }
}
</script>

<template>
  <view
    class="bubble-wrap"
    :class="[`bubble-wrap--${sender}`]"
    @longpress="handleLongpress"
    role="article"
    :aria-label="bubbleAriaLabel"
  >
    <!-- 已撤回状态 -->
    <view v-if="recalled" class="bubble bubble--recalled">
      <text class="bubble__body bubble__body--recalled">
        {{ recalledText }}
      </text>
    </view>

    <!-- 正常消息 -->
    <view v-else class="bubble-row" :class="[`bubble-row--${sender}`]">
      <!-- 对方头像（左侧） -->
      <view
        v-if="isPeerSender"
        class="bubble-avatar-wrap bubble-avatar-wrap--peer"
        @tap.stop="handlePeerAvatarTap"
        role="button"
        :aria-label="t('chat.viewProfile')"
      >
        <image
          class="bubble-avatar bubble-avatar--peer"
          :src="resolveMediaUrl(peerAvatar)"
          mode="aspectFill"
          role="img"
          :aria-label="t('chat.quotePeer')"
        />
      </view>
      <!-- 自己头像（右侧） -->
      <image
        v-else-if="isSelfSender"
        class="bubble-avatar bubble-avatar--self"
        :src="resolveMediaUrl(selfAvatar)"
        mode="aspectFill"
        role="img"
        :aria-label="t('chat.quoteMe')"
      />

      <view class="bubble" :class="[`bubble--${sender}`]">
        <!-- 引用消息区域 -->
        <view
          v-if="quoteRef && quoteBody"
          class="bubble__quote"
          @tap.stop="handleTapQuote"
          role="button"
          :aria-label="t('chat.quoteAria')"
        >
          <view class="bubble__quote-bar" />
          <view class="bubble__quote-content">
            <text class="bubble__quote-sender">{{ quoteSenderLabel }}</text>
            <text class="bubble__quote-body">{{ quoteBody }}</text>
          </view>
        </view>

        <!-- 消息正文 -->
        <template v-if="kind === 'voice'">
          <VoicePill :duration-seconds="durationSeconds || 0" />
        </template>
        <template v-else>
          <text class="bubble__body">{{ body }}</text>
        </template>

        <!-- 底部元信息：时间 + 已读/未读 + 送达状态 -->
        <view class="bubble__footer">
          <text class="bubble__meta">{{ formatTime(sentAt) }}</text>
          <!-- 对方消息未读指示器（蓝色小点） -->
          <view v-if="isPeerSender && isRead === false" class="bubble__unread-dot" />
          <!-- 送达状态图标（仅自己发送的消息显示） -->
          <view v-if="isSelfSender && !recalled" class="bubble__status">
            <text v-if="deliveryStatus === 'sent'" class="bubble__status-icon">✓</text>
            <text v-else-if="deliveryStatus === 'delivered'" class="bubble__status-icon">✓✓</text>
            <text v-else-if="deliveryStatus === 'read'" class="bubble__status-icon bubble__status-icon--read">✓✓</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 84%;
}
.bubble-wrap--self {
  align-self: flex-end;
}
.bubble-wrap--peer {
  align-self: flex-start;
}
.bubble-wrap--system {
  align-self: center;
}

/* 头像 + 气泡行布局 */
.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-2);
}
.bubble-row--self {
  flex-direction: row-reverse;
}
.bubble-row--peer {
  flex-direction: row;
}

/* 头像容器：包裹层用于承载点击事件（uni-app image 原生组件 @tap 不可靠） */
.bubble-avatar-wrap {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
}

/* 头像：圆形 + 白边（参考微信风格，64rpx 直径） */
.bubble-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-bg-container);
  flex-shrink: 0;
  background: var(--c-neutral-100);
}

/* mp-weixin 不支持 display:grid，单列纵向堆叠改用 flex-direction: column */
.bubble {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  box-shadow: var(--s-sm);
  min-width: 0;
}

.bubble--self {
  background: var(--c-brand);
  color: var(--c-text-inverse);
  border-radius: var(--r-lg) var(--r-xs) var(--r-lg) var(--r-lg);
}

.bubble--peer {
  background: var(--c-bubble-other);
  color: var(--c-text-primary);
  border-radius: var(--r-xs) var(--r-lg) var(--r-lg) var(--r-lg);
  box-shadow: var(--s-sm);
}

.bubble--system {
  background: transparent;
  color: var(--c-text-secondary);
  box-shadow: none;
}

.bubble--recalled {
  background: transparent;
  box-shadow: none;
  justify-content: center;
}

.bubble__body {
  line-height: 1.6;
  font-size: var(--fs-lg);
}

.bubble__body--recalled {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  font-style: italic;
  text-align: center;
}

/* 引用消息区域 */
.bubble__quote {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  margin-bottom: var(--sp-1);
  opacity: 0.85;
}
.bubble--self .bubble__quote {
  background: var(--c-overlay-bg-light, var(--c-overlay-bg-light, var(--c-overlay-bg-light, rgba(255, 255, 255, 0.2))));
}
.bubble--peer .bubble__quote {
  background: var(--c-black-shadow-xs, var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04))));
}
.bubble__quote-bar {
  width: var(--sp-1);
  border-radius: var(--r-xs);
  flex-shrink: 0;
}
.bubble--self .bubble__quote-bar {
  background: var(--c-overlay-bg-strong, var(--c-overlay-bg-mid, var(--c-overlay-bg-mid, rgba(255, 255, 255, 0.5))));
}
.bubble--peer .bubble__quote-bar {
  background: var(--c-brand);
}
.bubble__quote-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
  overflow: hidden;
}
.bubble__quote-sender {
  font-size: var(--fs-xs);
  font-weight: 600;
  opacity: 0.8;
}
.bubble__quote-body {
  font-size: var(--fs-sm);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部元信息 */
.bubble__footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  justify-content: flex-end;
}
.bubble__meta {
  font-size: var(--fs-xs);
  opacity: 0.72;
}
.bubble__status {
  display: flex;
  align-items: center;
}
.bubble__status-icon {
  font-size: var(--fs-xs);
  opacity: 0.6;
}
.bubble__status-icon--read {
  color: var(--c-bg-container);
  opacity: 0.9;
}

/* 对方消息未读指示器（蓝色小圆点） */
.bubble__unread-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--c-brand, #1A8CFF);
  flex-shrink: 0;
  animation: unread-pulse 2s ease-in-out infinite;
}

@keyframes unread-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
