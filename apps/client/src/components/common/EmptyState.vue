<script setup lang="ts">
/**
 * EmptyState - 统一空状态组件
 *
 * 支持两种使用方式：
 * 1. 预设类型：通过 `type` 选择 'no-data' | 'no-match' | 'no-chat'，自动匹配图标与 i18n 文案
 * 2. 显式传入：通过 `image` / `title` / `description` / `actionText` props 自定义内容
 *
 * 显式传入优先级高于预设类型，便于业务侧灵活覆盖。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';
import { resolveMediaUrl } from '../../utils/media';
import XunmiMascot from './XunmiMascot.vue';

const props = withDefaults(defineProps<{
  /** 预设空状态类型 */
  type?: 'no-data' | 'no-match' | 'no-chat' | 'network';
  /** 兼容旧 prop：等价于 title */
  message?: string;
  /** 显式图标 URL（优先级最高） */
  image?: string;
  /** 显式主标题（优先级高于 type/message） */
  title?: string;
  /** R10-P2-008：隐藏副标题（空态只留一句） */
  hideSub?: boolean;
  /** 显式副标题/描述 */
  description?: string;
  /** 操作按钮文案（传入即渲染按钮，点击触发 action 事件） */
  actionText?: string;
  /** 吉祥物表情（传入则用寻觅芽替换图标） */
  /** 吉祥物表情名称，支持全部V2变体：mascot_default/mascot_happy/mascot_cry/mascot_sad 等 */
  mascot?: string;
}>(), {
  type: 'no-data',
  message: '',
  image: '',
  title: '',
  description: '',
  actionText: '',
});

const emit = defineEmits<{
  /** 点击操作按钮时触发 */
  action: [];
}>();

const { t } = useI18n();

/** 预设类型 → 图标映射 */
const presetIconMap: Record<string, string> = {
  'no-data': IMAGE_PATHS.ICONS_COMMON.SEARCH,
  'no-match': IMAGE_PATHS.ICONS_COMMON.CLOSE,
  'no-chat': IMAGE_PATHS.ICONS_COMMON.NOTIFICATION,
  'network': IMAGE_PATHS.ICONS_COMMON.CLOSE,
};

/** 预设类型 → 副标题 i18n key 映射 */
const presetSubMap: Record<string, string> = {
  'no-data': t('empty.noDataSub'),
  'no-match': t('empty.noMatchSub'),
  'no-chat': t('empty.noChatSub'),
  'network': t('empty.networkSub'),
};

// R16（2026-09-07）：iconSrc 统一过 resolveMediaUrl——此前原样渲染 IMAGE_PATHS，
// real 模式下 app-assets 托管地址/相对路径未重写会导致空态图标 404 加载异常
const iconSrc = computed(() =>
  resolveMediaUrl(props.image || presetIconMap[props.type] || IMAGE_PATHS.ICONS_COMMON.SEARCH),
);

const titleText = computed(() => {
  if (props.title) return props.title;
  if (props.message) return props.message;
  return t('empty.noData');
});

const descriptionText = computed(() => {
  // R10-P2-008：hideSub 允许「只留一句」——空态主标题与「这里空空如也」语义重复时使用
  if (props.hideSub) return '';
  return props.description || presetSubMap[props.type] || t('empty.noDataSub');
});

const hasAction = computed(() => !!props.actionText);

function handleAction() {
  emit('action');
}
</script>

<template>
  <view
    class="empty"
    role="status"
    aria-live="polite"
    :aria-label="titleText"
  >
    <XunmiMascot v-if="mascot" :mood="mascot" size="lg" animated />
    <image v-else class="empty-icon" :src="iconSrc" mode="aspectFit" alt="" />
    <text class="empty-msg">{{ titleText }}</text>
    <text v-if="descriptionText" class="empty-sub">{{ descriptionText }}</text>
    <view
      v-if="hasAction"
      class="empty-action press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="actionText"
      @tap="handleAction"
    >
      <text class="empty-action__text">{{ actionText }}</text>
    </view>
    <slot />
  </view>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 80rpx/40rpx 无对应 sp token（sp 阶梯为 4/8/12/16/20/24/32/48rpx），固定布局尺寸保留 */
  padding: 80rpx 40rpx;
  /* R6-L05-D02（位置 P2）：空态块贴顶不居中——实测图标顶 y=167、按钮底 y=311，
     其下留白 487px，视觉重心只占帧高 29%。原声明只有 padding，无任何高度约束。
     按缺陷卡给的口径补组件这一半：`flex:1` 让本组件在「flex 列 + 有高度」的父级里
     撑满可用区，配合上面的 justify-content:center 即垂直居中。
     ⚠️ 另一半在宿主：父级必须给可解析高度（circles/campus topic-detail 页里
     :810-842 那条 `.empty-state{flex:1;justify-content:center}` 是模板无对应节点的死样式，
     实际走本组件）⇒ 登记给页面车道，本车道不改 subpackages/**。
     刻意不自证 min-height:xxvh —— 本组件有 30+ 消费点（含卡片内的小面积空态），
     给一个全局视口高度会把小空态撑成大块，属用新缺陷换旧缺陷。 */
  flex: 1 0 auto;
  box-sizing: border-box;
}
.empty-icon {
  /* 固定布局尺寸（图标 120rpx），无对应 token */
  width: 120rpx;
  height: 120rpx;
  margin-bottom: var(--sp-4);
}
.empty-msg {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
.empty-sub {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
  margin-top: var(--sp-2);
  text-align: center;
}
.empty-action {
  margin-top: var(--sp-6);
  padding: var(--sp-4) 40rpx; /* 40rpx 无对应 sp token，固定布局尺寸保留 */
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand);
  /* R6-L05-D06（尺寸比例 P2）：空态唯一可点元素实测 62×35px = 123×69rpx，
     热区高 69rpx 比同页自述标准（topic-detail.vue:792「热区高度 ≥ 44px / min-height:88rpx」）
     少 19rpx；高度此前只由 padding 撑出，无 min-height。
     补 min-height:88rpx(44px) 并用 flex 居中保持文字视觉位置不变。 */
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.empty-action__text {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-inverse, #FFFFFF);
}
</style>
