<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = withDefaults(defineProps<{
  type?: 'network' | 'server';
  /** 显式错误主文案（传入时优先于预设网络/服务端文案） */
  message?: string;
  /** 显式错误副文案 */
  description?: string;
}>(), {
  type: 'network',
  message: '',
  description: '',
});

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    network: IMAGE_PATHS.ICONS_COMMON.SEARCH,
    server: IMAGE_PATHS.ICONS_COMMON.CLOSE,
  };
  return map[props.type];
});

const msgKey = computed(() => (props.type === 'server' ? 'error.server' : 'error.network'));
const subKey = computed(() => (props.type === 'server' ? 'error.serverSub' : 'error.networkSub'));
const msgText = computed(() => props.message || t(msgKey.value));
const subText = computed(() => props.description || t(subKey.value));
</script>

<template>
  <view
    class="error"
    role="alert"
    aria-live="assertive"
    :aria-label="msgText"
  >
    <image class="error-icon" :src="iconSrc" mode="aspectFit" alt="" />
    <text class="error-msg">{{ msgText }}</text>
    <text class="error-sub">{{ subText }}</text>
    <!-- A11Y-R（2026-10-31 按压反馈轨）：原仅 .error-btn:active，mp-weixin :active 不可靠
         （App.vue:813 自证），真机上按「重试」无任何反馈。补 hover-class，口径同
         components/common/BaseTabs.vue:28+219（组件内局部 --pressed 类 + hover-class）。
         :active 保留：H5 鼠标/键盘按下行为逐字不变。 -->
    <view
      class="error-btn"
      hover-class="error-btn--pressed"
      :hover-stay-time="80"
      @tap="emit('retry')"
      role="button"
      :aria-label="t('error.retry')"
    >
      <text class="error-btn-text">{{ t('error.retry') }}</text>
    </view>
  </view>
</template>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 80rpx/40rpx 无对应 sp token（sp 阶梯为 4/8/12/16/20/24/32/48rpx），固定布局尺寸保留 */
  padding: 80rpx 40rpx;
}
.error-icon {
  /* 固定布局尺寸（图标 120rpx），无对应 token */
  width: 120rpx;
  height: 120rpx;
  margin-bottom: var(--sp-4);
}
.error-msg {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
.error-sub {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
  margin-top: var(--sp-2);
}
.error-btn {
  margin-top: var(--sp-7);
  padding: var(--sp-4) var(--sp-10);
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-400);
}
/* H5 走 :active、mp-weixin 走 hover-class（同名 --pressed 类），共用同一套按下值。
   编译产物为证：dist/build/mp-weixin/components/common/BaseTabs.wxss 的
   `.base-tab-item--pressed.data-v-3278c03a` 与节点 class 数组里的 data-v 同域 ⇒ 可命中。 */
.error-btn:active,
.error-btn--pressed { transform: scale(0.97); }
.error-btn-text {
  color: var(--c-text-inverse, #fff);
  font-size: var(--fs-md);
  font-weight: 600;
}
</style>
