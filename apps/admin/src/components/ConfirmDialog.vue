<script setup lang="ts">
/**
 * 通用确认弹窗组件（Task 3.7.3）。
 *
 * 替代各视图散落的 {@code confirm(...)} 原生弹窗与自定义 modal-mask 模板，
 * 统一对外暴露 v-model:visible 与 confirm/cancel 事件。
 *
 * <p><b>设计目标</b>：</p>
 * <ul>
 *   <li>替代原生 {@code confirm()} 弹窗（样式不一致、无法国际化的痛点）；</li>
 *   <li>替代各视图自定义的 {@code <view class="modal-mask">} 模板（重复代码）；</li>
 *   <li>支持自定义 title / message / confirmText / cancelText，缺省时回退到 i18n 文案；</li>
 *   <li>支持 danger 模式（删除/禁用等危险操作），主按钮变红色；</li>
 *   <li>支持异步 loading 状态（confirming=true 时禁用按钮，防止重复提交）；</li>
 *   <li>样式复用 admin-common.css 的 .modal-mask / .modal / .modal-title / .modal-actions 类。</li>
 * </ul>
 *
 * <p><b>使用示例</b>：</p>
 * <pre>
 * &lt;ConfirmDialog
 *   v-model:visible="confirmVisible"
 *   :title="t('users.banConfirm', { name: user.nickname })"
 *   :danger="true"
 *   :confirming="banning"
 *   @confirm="handleBan"
 *   @cancel="handleCancel"
 * /&gt;
 * </pre>
 *
 * <p><b>i18n 接入</b>：title / confirmText / cancelText 未传时回退到
 * common.confirmTitle / common.confirmOk / common.confirmCancel。</p>
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 是否可见（v-model:visible） */
    visible: boolean;
    /** 弹窗标题（未传时回退到 common.confirmTitle） */
    title?: string;
    /** 弹窗正文（支持多行） */
    message?: string;
    /** 确认按钮文案（未传时回退到 common.confirmOk） */
    confirmText?: string;
    /** 取消按钮文案（未传时回退到 common.confirmCancel） */
    cancelText?: string;
    /** 是否为危险操作（删除/禁用），主按钮变红色 */
    danger?: boolean;
    /** 是否处于确认中状态（异步操作时禁用按钮，防止重复提交） */
    confirming?: boolean;
    /** 弹窗宽度（默认 420px） */
    width?: number;
  }>(),
  {
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    danger: false,
    confirming: false,
    width: 420,
  },
);

const emit = defineEmits<{
  (e: "update:visible", visible: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

/** 实际显示标题：优先 props.title，缺省回退到 i18n */
const displayTitle = computed(() => props.title || t("common.confirmTitle"));

/** 实际显示确认按钮文案 */
const displayConfirmText = computed(
  () => props.confirmText || t("common.confirmOk"),
);

/** 实际显示取消按钮文案 */
const displayCancelText = computed(
  () => props.cancelText || t("common.confirmCancel"),
);

/** 确认按钮类：danger 时附加 danger 修饰类 */
const confirmButtonClass = computed(() =>
  props.danger ? "primary-button danger" : "primary-button",
);

/** 关闭弹窗（点击遮罩或取消按钮触发） */
function handleClose(): void {
  if (props.confirming) return; // 异步进行中禁止关闭
  emit("update:visible", false);
  emit("cancel");
}

/** 点击确认按钮 */
function handleConfirm(): void {
  if (props.confirming) return; // 防重复点击
  emit("confirm");
}

/** 阻止冒泡（点击 modal 内容区域时不关闭） */
function stopPropagation(e: Event): void {
  e.stopPropagation();
}
</script>

<template>
  <view
    v-if="visible"
    class="modal-mask"
    @click="handleClose"
  >
    <view
      class="modal confirm-dialog"
      :style="{ width: width + 'px' }"
      @click="stopPropagation"
    >
      <text class="modal-title">{{ displayTitle }}</text>
      <view v-if="message" class="confirm-message">
        <text>{{ message }}</text>
      </view>
      <view v-else class="confirm-message">
        <!-- 允许调用方传入富内容（如带变量的提示） -->
        <slot name="message" />
      </view>
      <view class="modal-actions">
        <button
          class="ghost-button"
          :disabled="confirming"
          @click="handleClose"
        >{{ displayCancelText }}</button>
        <button
          :class="confirmButtonClass"
          :disabled="confirming"
          @click="handleConfirm"
        >{{ confirming ? t("common.saving") : displayConfirmText }}</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

/* ConfirmDialog 特有样式（Task 21：按钮颜色/尺寸通过 token CSS variables 引用） */
.primary-button.danger {
  background: var(--admin-color-danger);
}

.primary-button.danger:hover {
  background: var(--admin-color-danger-hover);
}

.confirm-dialog {
  width: 420px;
}

.confirm-message {
  margin-bottom: var(--admin-space-xl);
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
