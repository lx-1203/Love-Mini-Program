<script setup lang="ts">
/**
 * RedPacketBubble — 聊天红包消息气泡组件
 *
 * 功能：
 * - 在聊天消息流中渲染红包卡片（含图标、祝福语、状态文案）
 * - 点击红包：未领取时进入领取流程，已领取/已领完时跳转详情页
 * - 区分发送方（self）/接收方（peer）样式，支持 ARIA 无障碍标签
 *
 * mp-weixin 兼容：
 * - 使用 @tap 而非 click，hover-class 而非 :hover
 * - 不使用 import.meta，状态由 props 驱动
 * - 金额单位：分 ↔ 元转换在前端完成，与后端约定一致
 *
 * 错误处理：
 * - redPacketId 缺失：toast 提示并阻止跳转
 * - 红包信息加载失败：toast 提示用户重试
 *
 * 使用方式：
 * <RedPacketBubble
 *   :red-packet-id="msg.redPacketId"
 *   :blessing="msg.blessing"
 *   :status="msg.redPacketStatus"
 *   :sender="'self' | 'peer'"
 *   :total-amount="1000"
 *   :total-count="10"
 *   :claimed-count="3"
 *   @claim="handleClaim"
 *   @view-detail="handleViewDetail"
 * />
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/** 红包状态：PENDING 待领取 / DEPLETED 已领完 / EXPIRED 已过期 / CLAIMED 已领取 */
type RedPacketBubbleStatus = "PENDING" | "DEPLETED" | "EXPIRED" | "CLAIMED";

const props = withDefaults(
  defineProps<{
    /** 红包 ID（用于跳转领取/详情） */
    redPacketId: number;
    /** 祝福语（可选，默认使用 i18n 默认文案） */
    blessing?: string;
    /** 红包状态 */
    status?: RedPacketBubbleStatus;
    /** 发送方：self / peer（影响样式与 ARIA） */
    sender?: "self" | "peer";
    /** 总金额（分），用于详情跳转参数 */
    totalAmount?: number;
    /** 总个数 */
    totalCount?: number;
    /** 已领取个数 */
    claimedCount?: number;
    /** 是否已被当前用户领取（仅 peer 红包有意义） */
    claimedByMe?: boolean;
  }>(),
  {
    status: "PENDING",
    sender: "peer",
    totalAmount: 0,
    totalCount: 1,
    claimedCount: 0,
    claimedByMe: false,
  }
);

const emit = defineEmits<{
  /** 点击红包：未领取时触发 claim，已领取时触发 view-detail */
  claim: [redPacketId: number];
  /** 查看领取详情 */
  viewDetail: [redPacketId: number];
}>();

const { t } = useI18n();

/**
 * 祝福语文案：优先使用 props.blessing，为空时回退到默认文案
 */
const blessingText = computed(() => {
  const raw = (props.blessing ?? "").trim();
  return raw.length > 0 ? raw : t("chatRedPacket.bubbleDefaultBlessing");
});

/**
 * 状态文案：根据状态返回对应的 i18n 文本
 */
const statusText = computed(() => {
  // 已被当前用户领取的对方红包，优先展示"已领取"
  if (props.sender === "peer" && props.claimedByMe) {
    return t("chatRedPacket.bubbleStatusClaimed");
  }
  switch (props.status) {
    case "DEPLETED":
      return t("chatRedPacket.bubbleStatusDepleted");
    case "EXPIRED":
      return t("chatRedPacket.bubbleStatusExpired");
    case "CLAIMED":
      return t("chatRedPacket.bubbleStatusClaimed");
    case "PENDING":
    default:
      return t("chatRedPacket.bubbleStatusPending");
  }
});

/**
 * 是否可点击（已过期的红包不可点击）
 */
const isClickable = computed(() => props.status !== "EXPIRED" && props.redPacketId > 0);

/**
 * 是否为待领取状态（peer 红包未领取时点击触发领取流程）
 */
const isClaimable = computed(() => {
  return (
    props.sender === "peer" &&
    !props.claimedByMe &&
    props.status === "PENDING"
  );
});

/**
 * ARIA 标签：根据发送方与状态生成无障碍描述
 */
const ariaLabel = computed(() => {
  const senderLabel =
    props.sender === "self"
      ? t("chatRedPacket.bubbleSelfSent")
      : t("chatRedPacket.bubblePeerSent");
  const hint = isClaimable.value
    ? t("chatRedPacket.bubbleTapToClaim")
    : t("chatRedPacket.bubbleViewDetail");
  return `${senderLabel}，${blessingText.value}，${statusText.value}，${hint}`;
});

/**
 * 处理点击事件：
 * - 已过期或无 ID：阻止跳转
 * - 对方红包且未领取：触发 claim
 * - 其他情况：触发 view-detail
 */
function handleClick() {
  if (!isClickable.value) {
    uni.showToast({
      title: t("chatRedPacket.bubbleStatusExpired"),
      icon: "none",
    });
    return;
  }

  if (isClaimable.value) {
    emit("claim", props.redPacketId);
    return;
  }

  emit("viewDetail", props.redPacketId);
}
</script>

<template>
  <view
    class="rp-bubble"
    :class="[
      `rp-bubble--${sender}`,
      {
        'rp-bubble--expired': status === 'EXPIRED',
        'rp-bubble--depleted': status === 'DEPLETED',
        'rp-bubble--claimed': sender === 'peer' && claimedByMe,
      },
    ]"
    hover-class="rp-bubble--hover"
    hover-stay-time="100"
    :aria-label="ariaLabel"
    @tap="handleClick"
  >
    <!-- 左侧红包图标 -->
    <view class="rp-bubble__icon">
      <text class="rp-bubble__icon-emoji">🧧</text>
    </view>

    <!-- 中间文本区 -->
    <view class="rp-bubble__content">
      <text class="rp-bubble__title">{{ t('chatRedPacket.bubbleTitle') }}</text>
      <text class="rp-bubble__blessing">{{ blessingText }}</text>
      <text class="rp-bubble__status">{{ statusText }}</text>
    </view>

    <!-- 右侧状态指示 -->
    <view class="rp-bubble__tail">
      <text v-if="status === 'EXPIRED'" class="rp-bubble__tail-text">·</text>
      <text v-else class="rp-bubble__tail-text">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 气泡容器 ==================== */
.rp-bubble {
  display: inline-flex;
  align-items: stretch;
  width: 480rpx;
  max-width: 84%;
  padding: 0;
  border-radius: var(--r-lg, 16rpx);
  overflow: hidden;
  background: linear-gradient(135deg, #FA5151 0%, #E0413E 100%);
  color: var(--c-text-inverse, #FFFFFF);
  box-shadow: var(--s-red-packet, 0 4rpx 12rpx rgba(236, 72, 72, 0.2));
  transition: transform 0.15s ease, opacity 0.2s ease;
}

/* self 发送：右侧圆角反向（与微信红包一致） */
.rp-bubble--self {
  border-radius: 4rpx 16rpx 16rpx 16rpx;
}

.rp-bubble--peer {
  border-radius: 16rpx 4rpx 16rpx 16rpx;
}

.rp-bubble--hover {
  transform: scale(0.97);
  opacity: 0.92;
}

.rp-bubble--expired {
  background: linear-gradient(135deg, #B5B5B5 0%, #8C8C8C 100%);
  opacity: 0.78;
}

.rp-bubble--depleted {
  background: linear-gradient(135deg, #E0A050 0%, #C97C3A 100%);
}

.rp-bubble--claimed {
  background: linear-gradient(135deg, #B5B5B5 0%, #8C8C8C 100%);
  opacity: 0.88;
}

/* ==================== 红包图标 ==================== */
.rp-bubble__icon {
  width: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.rp-bubble__icon-emoji {
  font-size: var(--fs-7xl, 56rpx);
  line-height: 1;
}

/* ==================== 文本区 ==================== */
.rp-bubble__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 18rpx 20rpx;
  min-width: 0;
}

.rp-bubble__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  line-height: 1.3;
}

.rp-bubble__blessing {
  font-size: var(--fs-base, 24rpx);
  opacity: 0.92;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  white-space: nowrap;
}

.rp-bubble__status {
  font-size: var(--fs-sm, 22rpx);
  opacity: 0.78;
  margin-top: 2rpx;
}

/* ==================== 右侧尾部 ==================== */
.rp-bubble__tail {
  width: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.08);
}

.rp-bubble__tail-text {
  font-size: var(--fs-2xl, 32rpx);
  color: rgba(255, 255, 255, 0.78);
  font-weight: 300;
  line-height: 1;
}
</style>
