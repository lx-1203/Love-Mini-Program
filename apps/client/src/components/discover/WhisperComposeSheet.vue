<script setup lang="ts">
/**
 * WhisperComposeSheet — 悄悄话（付费留言）弹层（v3.1 契约 §9）
 *
 * ≤60 字 · 单价 2 交友币（= 服务端 200 分）· 幂等 clientRequestId · 文案「已送达，优先展示给 TA」
 *
 * 金额口径（P1 修复 2026-10-31）：屏上的「价格」与「余额」都用**元**展示，
 * 且都取自 stores/coins 的 formatCentsAsYuan / costCentsFor 同一换算处
 * —— 与钱包页余额卡同单位，不再出现「钱包 20、这里 2000」。
 */
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../services/api";
import { formatCentsAsYuan, useCoinsStore } from "../../stores/coins";
import { showErrorToast } from "../../utils/error-toast";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    userId: number | string;
    userName?: string;
  }>(),
  { userName: "" }
);

const emit = defineEmits<{ (e: "close"): void; (e: "sent"): void }>();

const { t } = useI18n();
const coinsStore = useCoinsStore();

const content = ref("");
/** 在途锁：既是按钮文案态，也是「一次付费动作只发一个请求」的唯一闸门（见 handleSend） */
const sending = ref(false);

/**
 * 本次「编辑会话」的幂等键（P1 修复 2026-10-31 双花缺陷）。
 *
 * 改前实况：clientRequestId 在 handleSend **内部**按 `whisper-${Date.now()}-${random}`
 * 逐次生成 ⇒ 两连击必然带两个不同键，服务端的 clientRequestId 去重永远合并不了；
 * 同时 sending 只改按钮文案、不拦派发 ⇒ 快速两下 = 给同一人发两条付费悄悄话、扣两次钱。
 *
 * 现在：键在弹层打开时生成一次，会话内不再重生成（在途期间的任何重复派发都是同一个键）；
 * 仅在**失败后**为下一次显式重试换键。
 *
 * 后端到底去重不去重（已核 apps/api，只读）：
 * - `RealWhisperService.send()` 先 `repository.findByClientRequestId(clientRequestId)`，
 *   命中即 `return toView(existing)` —— 不再扣费、不再落新单 ⇒ **确实按 clientRequestId 去重**；
 * - 幂等键还会被 `WHISPER-{clientRequestId}` 写进钱包流水 orderId，退款流水按同一键关联。
 * 若后端**不**去重（例如 mock 档 `mockFixtures.sendWhisper` 就是无脑 unshift，不查键），
 * 那么防双花就只剩本组件的 `sending` 在途锁这一道闸 ⇒ 这也是为什么把「在途不得派发」
 * 做成早退 + 按钮禁用态，而不是只改文案。
 *
 * 换键的代价与兜底：一次「服务端已扣但响应丢失」的超时后重试会带新键，理论上可能重复入账；
 * 服务端另有「同一对用户 A↔B 最多 1 条有效」+「每日 ≤5 条」两道业务闸（同方法内），
 * 所以重复付费请求会被拒。反过来说**不能**在失败后沿用旧键重试：扣费失败时服务端会把
 * status=PAY_FAILED 的记录按同一 clientRequestId 独立事务落库，旧键重试会命中
 * `findByClientRequestId` 直接返回那条失败记录 ⇒ 客户端会把「没送达」当成功 toast。
 */
const clientRequestId = ref("");

/** 会话键生成：时间戳 + 随机段，只在「打开弹层」与「失败后换键」两处调用 */
function buildClientRequestId(): string {
  return `whisper-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 余额展示（元；分→元只经 coins store 这一处换算） */
const balanceText = computed<string>(() => formatCentsAsYuan(coinsStore.balanceCents));

/** 单价展示（元；服务端实测回传价优先，回落定价镜像表 —— 与扣费同一个来源） */
const priceText = computed<string>(() =>
  formatCentsAsYuan(coinsStore.costCentsFor("WHISPER"))
);

watch(
  () => props.visible,
  (v) => {
    if (v) {
      content.value = "";
      sending.value = false;
      clientRequestId.value = buildClientRequestId();
      void coinsStore.fetchBalance(false).catch(() => {});
    }
  },
  // immediate：以 visible=true 直接挂载时也要在**首次点击之前**拿到会话键
  // （非 immediate 时 watcher 不触发，键只能靠 handleSend 里的兜底，语义上等价
  //  但「打开时生成」就不再成立，故这里显式即时执行）
  { immediate: true }
);

async function handleSend() {
  // P1 双花修复：在途期间不得再次派发付费动作（此前 sending 只 relabel 按钮，两连击照发两次）
  if (sending.value) return;
  const text = content.value.trim();
  if (!text) {
    uni.showToast({ title: t("whisper.required"), icon: "none" });
    return;
  }
  if (text.length > 60) {
    uni.showToast({ title: t("whisper.tooLong"), icon: "none" });
    return;
  }
  // 兜底：正常路径下打开弹层时已生成（watcher immediate）
  if (!clientRequestId.value) clientRequestId.value = buildClientRequestId();
  sending.value = true;
  try {
    await clientApi.sendWhisper({
      receiverId: Number(props.userId),
      content: text,
      clientRequestId: clientRequestId.value,
    });
    uni.showToast({ title: t("whisper.sent"), icon: "success" });
    emit("sent");
    emit("close");
  } catch (error) {
    // 失败 ⇒ 为下一次显式重试换键（理由见 clientRequestId 注释：旧键会命中 PAY_FAILED 记录造成假成功）
    clientRequestId.value = buildClientRequestId();
    showErrorToast(error, t("whisper.sendFailed"));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <view v-if="visible" class="whisper-mask" @tap="emit('close')">
    <view class="whisper-sheet" @tap.stop>
      <view class="whisper-sheet__head">
        <text class="whisper-sheet__title">{{ t('whisper.title') }}</text>
        <view class="whisper-sheet__close press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.closeAria')" @tap="emit('close')">
          <text class="whisper-sheet__close-text">×</text>
        </view>
      </view>

      <text class="whisper-sheet__sub">
        {{ t('whisper.toUser', { name: userName || t('whisper.defaultName') }) }}
      </text>

      <textarea
  cursor-spacing="20"
        class="whisper-sheet__input"
        :value="content"
        :maxlength="60"
        :placeholder="t('whisper.placeholder')"
        @input="content = ($event as any).detail.value"
      />

      <view class="whisper-sheet__meta">
        <text class="whisper-sheet__meta-text">{{ t('whisper.price', { n: priceText }) }}</text>
        <text class="whisper-sheet__meta-text">{{ t('whisper.balance', { n: balanceText }) }}</text>
      </view>

      <view
        class="whisper-sheet__send press-feedback"
        :class="{ 'whisper-sheet__send--pending': sending }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-disabled="sending ? 'true' : 'false'"
        :aria-label="t('whisper.send')"
        @tap="handleSend"
      >
        <text class="whisper-sheet__send-text">{{ sending ? t('common.loading') : t('whisper.send') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.whisper-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.whisper-sheet {
  width: 100%;
  background: var(--c-bg-container, #ffffff);
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.whisper-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.whisper-sheet__title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.whisper-sheet__close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.whisper-sheet__close-text {
  font-size: 36rpx;
  color: var(--c-text-secondary, #666666);
}

.whisper-sheet__sub {
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

.whisper-sheet__input {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--c-bg-page, #EEF7F2);
  border: 1rpx solid var(--c-line, #EEF2F0);
  font-size: 26rpx;
  color: var(--c-text-primary, #222222);
}

.whisper-sheet__meta {
  display: flex;
  justify-content: space-between;
}

.whisper-sheet__meta-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #666666);
}

.whisper-sheet__send {
  padding: 22rpx 0;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #6FA1FF 0%, #4D8DFF 100%);
  text-align: center;
}

.whisper-sheet__send-text {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
}

/* P1 双花修复：在途时按钮进入禁用态（H5 侧连点击都不落地，MP 侧由 handleSend 早退兜住） */
.whisper-sheet__send--pending {
  opacity: 0.6;
  pointer-events: none;
}
</style>

