<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import VoicePill from "./VoicePill.vue";
import { resolveMediaUrl } from "../../utils/media";

const props = withDefaults(
  defineProps<{
    sender: "self" | "peer" | "system";
    kind: "text" | "voice" | "emoji" | "system" | "activity";
    body: string;
    sentAt: string;
    durationSeconds?: number | null;
    recalled?: boolean;
    deliveryStatus?: "sent" | "delivered" | "read";
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

// 修复（严格模式 noUnusedLocals）：bubbleAriaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用，
// 同时暴露无障碍标签供父组件/测试访问。
// handleTapQuote 通过 catchtap 绑定到模板，vue-tsc 无法识别 catchtap 语法，需显式暴露。
defineExpose({ bubbleAriaLabel, handleTapQuote });

/**
 * 送达状态勾（SVG，白色——2026-08-08 微信化重构：时间移出气泡由时间条承载，
 * 送达状态保留并改为 SVG 图标；自己气泡为品牌绿底，白色勾与微信一致）。
 */
const checkWhiteSrc = IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG;
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
    <!-- 2026-08-08 微信化重构：自己消息不显示头像（微信惯例，仅对方显示），
         左右区分靠气泡颜色 + 对齐方向 -->
    <view v-else class="bubble-row" :class="[`bubble-row--${sender}`]">
      <!-- 对方头像（左侧） -->
      <image
        v-if="isPeerSender"
        class="bubble-avatar bubble-avatar--peer"
        :src="resolveMediaUrl(peerAvatar)"
        mode="aspectFill"
        lazy-load
        role="img"
        :aria-label="t('chat.quotePeer')"
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
          <!-- 2026-08-09 表情包机制：emoji 消息大号渲染（微信表情消息风格） -->
          <text class="bubble__body" :class="{ 'bubble__body--emoji': kind === 'emoji' }">{{ body }}</text>
        </template>

        <!-- 底部元信息：送达状态（时间已移出气泡，由父页面微信式时间条承载） -->
        <view class="bubble__footer">
          <!-- 送达状态图标（仅自己发送的消息显示；SVG 白色勾，微信风格） -->
          <view v-if="isSelfSender && !recalled" class="bubble__status">
            <image v-if="deliveryStatus === 'sent'" class="bubble__status-icon" :src="checkWhiteSrc" mode="aspectFit" alt="" />
            <template v-else-if="deliveryStatus === 'delivered' || deliveryStatus === 'read'">
              <image class="bubble__status-icon" :src="checkWhiteSrc" mode="aspectFit" alt="" />
              <image class="bubble__status-icon" :src="checkWhiteSrc" mode="aspectFit" alt="" />
            </template>
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
  /* 2026-08-09 微信 1:1 重构：头像与气泡间距 8px = 16rpx（原 --sp-2 = 8rpx ≈ 4px） */
  gap: 16rpx;
}
/* 2026-08-08 微信化重构：自己消息无头像，气泡直接靠右（不再 row-reverse 占位） */
.bubble-row--self {
  justify-content: flex-end;
}
.bubble-row--peer {
  flex-direction: row;
}

/* 头像：圆形 + 白边（参考微信风格，64rpx 直径；固定布局尺寸，无对应 token） */
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

/* 2026-08-09 微信 1:1 重构：圆角 12px = 24rpx（微信 4px/16px 风格；无对应 token 档位，局部字面量）；
   我方右上直角、对方左上直角（圆角序列：左上 右上 右下 左下） */
.bubble--self {
  background: var(--c-brand);
  color: var(--c-text-inverse);
  border-radius: 24rpx 0 24rpx 24rpx;
}

/* 对方气泡：纯白（--c-bubble-other 已改 #FFFFFF）、无阴影（微信白气泡无投影） */
.bubble--peer {
  background: var(--c-bubble-other);
  color: var(--c-text-primary);
  border-radius: 0 24rpx 24rpx 24rpx;
  box-shadow: none;
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
  /* 2026-08-09 微信 1:1 重构：正文 15px = 30rpx（原 --fs-lg = 28rpx ≈ 14px；
     无对应 token 档位，局部字面量） */
  font-size: 30rpx;
}

.bubble__body--recalled {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  font-style: italic;
  text-align: center;
}

/* 2026-08-09 表情包机制：emoji 消息 28px = 56rpx 大号渲染（无对应 token 档位，局部字面量） */
.bubble__body--emoji {
  font-size: 56rpx;
  line-height: 1.2;
  padding: 4rpx 0;
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

/* 底部元信息（仅送达状态，时间已由父页面时间条承载） */
.bubble__footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  justify-content: flex-end;
  /* 底部元信息行固定行高，无对应 token */
  height: 24rpx;
}
.bubble__status {
  display: flex;
  align-items: center;
  /* 2rpx 无对应 token 档位，保留 */
  gap: 2rpx;
}
.bubble__status-icon {
  /* 状态图标固定尺寸（20rpx），无对应 token */
  width: 20rpx;
  height: 20rpx;
  opacity: 0.85;
}
</style>
