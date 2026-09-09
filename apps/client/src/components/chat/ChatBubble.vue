<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import VoicePill from "./VoicePill.vue";
import { resolveMediaUrl } from "../../utils/media";
import EmojiText from "../common/EmojiText.vue";
import { containsEmoji } from "../../config/emoji-map";

// R17（2026-09-08）：开启 virtualHost——mp-weixin 下组件宿主节点会破坏
// `.bubble-wrap--self { align-self: flex-end }` 的右对齐（宿主非 flex 容器，
// 气泡整体左置，自己发的消息不贴右边）。开启后组件根节点直接成为
// chat-list 的 flex 子项，左右对齐恢复微信行为。
defineOptions({
  options: {
    virtualHost: true,
  },
});

const props = withDefaults(
  defineProps<{
    sender: "self" | "peer" | "assistant" | "system";
    kind: "text" | "voice" | "emoji" | "image" | "system" | "activity";
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
    /** 对方用户 ID，点击对方头像时跳转到个人主页 */
    peerUserId?: string | number;
  }>(),
  {
    // 2026-08-26 P1-2：peer 默认头像由 AVATAR_1 改为 AVATAR_3——
    // AVATAR_1(person-01) 与 self 真实头像可能同图(person-01)，会话缺失 partnerAvatar 时易出现自他头像"同名错位"观感
    peerAvatar: IMAGE_PATHS.AVATARS.AVATAR_3,
    selfAvatar: IMAGE_PATHS.AVATARS.AVATAR_2,
  }
);

const emit = defineEmits<{
  longpress: [messageId: string];
    avatarTap: [];
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

/** 是否为寻觅助手发送的消息 */
const isAssistantSender = computed(() => props.sender === "assistant");

/** 助手头像 */
const assistantAvatar = IMAGE_PATHS.MESSAGE_ICONS.ASSISTANT_AVATAR;

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

/**
 * 2026-09-03 修复：点击对方头像只 emit 一次 avatarTap，导航职责统一交给宿主页
 * （此前组件内 navigateTo + 宿主页菜单同时触发，两动作叠加导致跳转被菜单遮罩干扰）。
 * chat-session 页 onBubbleAvatarTap 负责跳 /profile-extra/profile/other?userId=。
 */
function handlePeerAvatarTap() {
  emit("avatarTap");
}

/** 2026-08-10：点击图片消息全屏预览 */
function previewImage() {
  if (!props.body) return;
  uni.previewImage({ urls: [resolveMediaUrl(props.body)] });
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
 * 2026-09-03（统一气泡字号）：emoji 大号仅用于"消息体为纯 emoji 字形"场景。
 * 历史/演示消息存在 kind=emoji 但正文为普通文字（如「嗯嗯」），
 * 此前一律渲染 56rpx 大号导致与文本消息字号不一致；现改为命中 emoji 字形才用大号。
 */
const emojiDisplay = computed(() => props.kind === "emoji" && containsEmoji(props.body || ""));


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
    <!-- 头像布局：对方消息头像在左侧，自己消息头像在右侧（row-reverse），左右区分靠气泡颜色 + 对齐方向 -->
    <view v-else class="bubble-row" :class="[`bubble-row--${sender}`]">
      <!-- 对方头像（左侧） -->
      <image
        v-if="isPeerSender || isAssistantSender"
        class="bubble-avatar bubble-avatar--peer"
        :src="isAssistantSender ? assistantAvatar : resolveMediaUrl(peerAvatar)"
        mode="aspectFill"
        lazy-load
        role="img"
        :aria-label="t('chat.quotePeer')"
        @tap="handlePeerAvatarTap"
      />
      <!-- 自己头像（右侧） -->
      <image
        v-if="isSelfSender"
        class="bubble-avatar bubble-avatar--self"
        :src="resolveMediaUrl(selfAvatar)"
        mode="aspectFill"
        lazy-load
        role="img"
        aria-label="我"
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
          <!-- 2026-09-06 修复：语音气泡未传 audioUrl，历史语音永远无法播放；现透传 body 中的音频地址 -->
          <VoicePill :duration-seconds="durationSeconds || 0" :audio-url="body || undefined" />
        </template>
        <!-- 2026-08-10 功能补齐：图片消息渲染（微信风格，宽度自适应气泡内） -->
        <image
          v-else-if="kind === 'image' && body"
          class="bubble__image"
          :src="resolveMediaUrl(body)"
          mode="widthFix"
          lazy-load
          @tap="previewImage"
          role="img"
          :aria-label="t('chat.imageMessage')"
        />
        <template v-else>
          <!-- 2026-08-26 第三轮：emoji / 文本消息统一走 EmojiText，
               body 中命中 EMOJI_SVG_MAP 的 emoji 字符会自动替换为 SVG，
               兼容历史消息 / 后端字符串 / 跨端一致的 emoji 渲染 -->
          <EmojiText
            :text="body"
            :emoji-size="emojiDisplay ? 'var(--bubble-emoji-font-size)' : 'var(--bubble-font-size)'"
            text-class="bubble__body"
            :class="emojiDisplay ? 'bubble__body bubble__body--emoji' : 'bubble__body'"
          />
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
  /* 批次 C2：气泡最大宽度收敛到 --bubble-max-width token（84%） */
  max-width: var(--bubble-max-width);
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
  /* R20（2026-09-08）：flex-end→flex-start，头像与气泡顶边对齐（微信规范，
     也是理想图《消息》页的排布）；此前底对齐时短气泡与头像错位感明显 */
  align-items: flex-start;
  /* 2026-08-09 微信 1:1 重构：头像与气泡间距 8px = 16rpx（原 --sp-2 = 8rpx ≈ 4px） */
  gap: 16rpx;
}
/* 自己消息头像在右侧，使用 row-reverse 实现 */
.bubble-row--self {
  flex-direction: row-reverse;
}
.bubble-row--peer {
  flex-direction: row;
}

/* 头像：圆形 + 白边（2026-08-26 R3：尺寸收敛到 --bubble-avatar-* token） */
.bubble-avatar {
  width: var(--bubble-avatar-size);
  height: var(--bubble-avatar-size);
  border-radius: var(--r-full);
  border: var(--bubble-avatar-border);
  flex-shrink: 0;
  background: var(--c-neutral-100);
}
.bubble-avatar--self {
  cursor: pointer;
}

/* mp-weixin 不支持 display:grid，单列纵向堆叠改用 flex-direction: column
   2026-08-26 R3：padding / 阴影 / 主圆角收敛到 --bubble-* token（双方一致） */
.bubble {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--bubble-padding-y) var(--bubble-padding-x);
  border-radius: var(--bubble-radius-main);
  box-shadow: var(--bubble-shadow);
  min-width: 0;
}

/* 批次 C2：self/peer/assistant 圆角全部走 --bubble-radius-* token，
   尾巴方向按 PRD E4 验收：self 消息右上尾巴（头像在右）、peer 左上尾巴（头像在左），
   assistant 头像同在左侧 → 与 peer 一致左上尾巴；阴影统一 var(--bubble-shadow)（禁用）。 */
.bubble--self {
  background: var(--c-brand);
  color: var(--c-text-inverse);
  border-radius: var(--bubble-radius-main) var(--bubble-radius-tail) var(--bubble-radius-main) var(--bubble-radius-main);
  box-shadow: var(--bubble-shadow);
}

.bubble--assistant {
  background: #E8F8F1;
  color: #222222;
  border-radius: var(--bubble-radius-tail) var(--bubble-radius-main) var(--bubble-radius-main) var(--bubble-radius-main);
}

/* 对方气泡：白/浅灰底 + 深字、无阴影（微信白气泡无投影），左上小圆角贴近头像 */
.bubble--peer {
  background: var(--c-bubble-other);
  color: var(--c-text-primary);
  border-radius: var(--bubble-radius-tail) var(--bubble-radius-main) var(--bubble-radius-main) var(--bubble-radius-main);
  box-shadow: var(--bubble-shadow);
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
  line-height: var(--bubble-line-height);
  /* 2026-08-26 R3：正文 30rpx 收敛到 --bubble-font-size token */
  font-size: var(--bubble-font-size);
  /* P3：文本自动换行，长串/URL 不横向撑爆气泡（mp-weixin 支持 word-break/overflow-wrap） */
  word-break: break-word;
  overflow-wrap: break-word;
  /* R20（2026-09-08）：显式左对齐——短文本（如「111」）在窄气泡内不得呈现居中效果，
     全部气泡统一左对齐规范 */
  text-align: left;
}

.bubble__body--recalled {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  font-style: italic;
  text-align: center;
}

/* 2026-08-26 R3：emoji 消息 56rpx 收敛到 --bubble-emoji-font-size token */
.bubble__body--emoji {
  font-size: var(--bubble-emoji-font-size);
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
.bubble__image {
  display: block;
  max-width: 420rpx;
  border-radius: var(--r-lg, 16rpx);
  overflow: hidden;
}

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
  /* 2026-08-26 R3：送达状态图标 20rpx 收敛到 --bubble-status-icon-size token */
  width: var(--bubble-status-icon-size);
  height: var(--bubble-status-icon-size);
  opacity: 0.85;
}
</style>

