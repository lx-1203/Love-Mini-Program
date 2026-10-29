<script setup lang="ts">
/**
 * 右侧滑出抽屉（本地实现，替代 Element Plus 的 el-drawer）。
 *
 * 引入背景：apps/admin 原先在 main.ts 全量注册 element-plus 并引入其全量 CSS，
 * 而整个后台只用到一个 <el-drawer>（Users.vue 的用户详情）。全量注册让
 * vendor-misc chunk 背上了整个组件库。本组件只覆盖项目实际用到的能力：
 * v-model:visible、header/默认/footer 三个插槽、Esc 与遮罩点击关闭、
 * 关闭动画结束后再抛 closed（调用方在此清空详情数据，避免动画期间内容先空）。
 *
 * 使用示例：
 *   <DetailDrawer v-model:visible="detailVisible" :width="520" :title="t('users.detailTitle')"
 *                 @closed="detailUser = null">
 *     <template #header>…</template>
 *     …正文…
 *     <template #footer>…</template>
 *   </DetailDrawer>
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    /** 是否可见（v-model:visible） */
    visible: boolean;
    /** 面板宽度，单位 px（默认 520，与原 el-drawer size="520px" 对齐） */
    width?: number;
    /** 是否允许 Esc 关闭 */
    closeOnEsc?: boolean;
    /** 是否允许点击遮罩关闭 */
    closeOnModal?: boolean;
    /** aria-label 兜底文案（header 插槽里的标题对读屏不保证可达） */
    title?: string;
  }>(),
  {
    width: 520,
    closeOnEsc: true,
    closeOnModal: true,
    title: "",
  },
);

const emit = defineEmits<{
  (e: "update:visible", visible: boolean): void;
  (e: "closed"): void;
}>();

const panelRef = ref<HTMLElement | null>(null);
/** 打开前的焦点元素，关闭后交还，避免键盘用户丢失位置 */
let previouslyFocused: HTMLElement | null = null;
/** 打开前的 body overflow，关闭时原样恢复（不依赖额外全局 class） */
let previousBodyOverflow = "";
let bodyOverflowSaved = false;

const ariaLabel = computed(() => (props.title ? props.title : undefined));

function close(): void {
  if (!props.visible) return;
  emit("update:visible", false);
}

function handleMaskClick(): void {
  if (props.closeOnModal) close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.closeOnEsc) close();
}

function lockBodyScroll(): void {
  if (bodyOverflowSaved) return;
  previousBodyOverflow = document.body.style.overflow;
  bodyOverflowSaved = true;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll(): void {
  if (!bodyOverflowSaved) return;
  document.body.style.overflow = previousBodyOverflow;
  bodyOverflowSaved = false;
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      window.addEventListener("keydown", handleKeydown);
      lockBodyScroll();
      // tabindex="-1" 的面板可接收焦点，键盘操作从抽屉内部开始
      void nextTick(() => panelRef.value?.focus());
    } else {
      window.removeEventListener("keydown", handleKeydown);
      unlockBodyScroll();
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  unlockBodyScroll();
});
</script>

<template>
  <Transition name="admin-drawer" @after-leave="emit('closed')">
    <div
      v-if="visible"
      class="admin-drawer"
      @click.self="handleMaskClick"
    >
      <div
        ref="panelRef"
        class="admin-drawer__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel"
        tabindex="-1"
        :style="{ width: width + 'px' }"
      >
        <header class="admin-drawer__header">
          <slot name="header" />
        </header>
        <div class="admin-drawer__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="admin-drawer__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.admin-drawer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--admin-color-overlay);
}

.admin-drawer__panel {
  height: 100%;
  max-width: 100%;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  background: var(--admin-color-bg-container);
  box-shadow: var(--admin-shadow-lg);
  /* 面板自身可聚焦（Esc 焦点落点），但不显示焦点描边 */
  outline: none;
}

.admin-drawer__header {
  flex: 0 0 auto;
  padding: var(--admin-space-md);
  padding-bottom: var(--admin-space-md);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.admin-drawer__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--admin-space-md);
}

.admin-drawer__footer {
  flex: 0 0 auto;
  padding: var(--admin-space-md);
  border-top: 1px solid var(--admin-color-border-light);
}

/* 滑入滑出：面板从右侧移动，遮罩淡入淡出 */
.admin-drawer-enter-active,
.admin-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.admin-drawer-enter-active .admin-drawer__panel,
.admin-drawer-leave-active .admin-drawer__panel {
  transition: transform 0.24s ease;
}

.admin-drawer-enter-from,
.admin-drawer-leave-to {
  opacity: 0;
}

.admin-drawer-enter-from .admin-drawer__panel,
.admin-drawer-leave-to .admin-drawer__panel {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .admin-drawer-enter-active,
  .admin-drawer-leave-active,
  .admin-drawer-enter-active .admin-drawer__panel,
  .admin-drawer-leave-active .admin-drawer__panel {
    transition: none;
  }
}

/* 窄屏（含移动端后台访问）不超出视口 */
@media (max-width: 560px) {
  .admin-drawer__panel {
    width: 100% !important;
  }
}
</style>
