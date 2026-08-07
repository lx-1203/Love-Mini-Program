<script setup lang="ts">
/**
 * 通用分页组件（Task 3.7.2）。
 *
 * 抽取自 Users / Posts / Reports / AuditLogs 等 4 个视图的重复分页 UI 与逻辑，
 * 统一对外暴露 v-model:page 与 change 事件。
 *
 * <p><b>设计目标</b>：</p>
 * <ul>
 *   <li>替代各视图自定义的 {@code <view class="pagination">} 模板与 handlePrev/Next 函数；</li>
 *   <li>支持两种页码模型：
 *     <ul>
 *       <li>1-based（Users/Posts/Reports 默认）：page 从 1 开始，禁用条件 page <= 1</li>
 *       <li>0-based（AuditLogs Spring Data 风格）：page 从 0 开始，禁用条件 page === 0</li>
 *     </ul>
 *     通过 {@code pageBase} prop 区分，默认 1-based。
 *   </li>
 *   <li>不内置 fetch 逻辑：仅触发 change 事件，由父组件决定是否触发请求；</li>
 *   <li>样式复用 admin-common.css 的 .pagination / .page-button / .page-info 类。</li>
 * </ul>
 *
 * <p><b>使用示例</b>：</p>
 * <pre>
 * &lt;Pagination
 *   v-model:page="page"
 *   :total-pages="totalPages"
 *   :total="total"
 *   @change="fetchUsers"
 * /&gt;
 * </pre>
 *
 * <p><b>i18n 接入</b>：通过 useI18n 读取 common.page / common.total 文案，
 * 与 Admin 全局 i18n 配置保持一致。</p>
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 当前页码（v-model:page） */
    page: number;
    /** 总页数 */
    totalPages: number;
    /** 总记录数（展示「共 N 条」用） */
    total?: number;
    /**
     * 页码基数：
     * - 1（默认）：page 从 1 开始，禁用条件 page <= 1
     * - 0：page 从 0 开始，禁用条件 page === 0
     */
    pageBase?: 0 | 1;
    /** 是否禁用（如加载中） */
    disabled?: boolean;
    /** 上一页按钮文案（未传时回退到 common.prevPage） */
    prevText?: string;
    /** 下一页按钮文案（未传时回退到 common.nextPage） */
    nextText?: string;
  }>(),
  {
    total: 0,
    pageBase: 1,
    disabled: false,
    prevText: "",
    nextText: "",
  },
);

const emit = defineEmits<{
  (e: "update:page", page: number): void;
  (e: "change", page: number): void;
}>();

/** 是否为第一页（禁用「上一页」） */
const isFirst = computed(() =>
  props.pageBase === 1 ? props.page <= 1 : props.page === 0,
);

/** 是否为最后一页（禁用「下一页」） */
const isLast = computed(() => {
  if (props.totalPages <= 0) return true;
  return props.pageBase === 1
    ? props.page >= props.totalPages
    : props.page >= props.totalPages - 1;
});

// infra R2-00463：页码跳转输入状态（原仅有上/下一页，大数据量翻页痛苦）
const jumpInput = ref("");

/** 可跳转的最大页码（1-based 展示） */
const maxPage = computed(() => Math.max(props.totalPages, 1));

/** 跳转输入框按键处理：Enter 触发跳转 */
function handleJumpKeydown(e: KeyboardEvent): void {
  if (e.key === "Enter") {
    doJump();
  }
}

/**
 * 执行页码跳转（infra R2-00464：钳制 page 范围，越界输入回退到边界页）。
 * 原实现无页码跳转且不钳制 page，后端返回越界 page 时按钮状态错误。
 */
function doJump(): void {
  if (props.disabled) return;
  const raw = parseInt(jumpInput.value, 10);
  if (Number.isNaN(raw) || raw <= 0) {
    jumpInput.value = "";
    return;
  }
  const clamped = Math.min(raw, maxPage.value);
  jumpInput.value = "";
  if (clamped === (props.pageBase === 1 ? props.page : props.page + 1)) return;
  const target = props.pageBase === 1 ? clamped : clamped - 1;
  emit("update:page", target);
  emit("change", target);
}

/** 上一页：触发 update:page 与 change 事件 */
function handlePrev(): void {
  if (isFirst.value || props.disabled) return;
  const next = props.page - 1;
  emit("update:page", next);
  emit("change", next);
}

/** 下一页：触发 update:page 与 change 事件 */
function handleNext(): void {
  if (isLast.value || props.disabled) return;
  const next = props.page + 1;
  emit("update:page", next);
  emit("change", next);
}

/** 分页信息文案（按 pageBase 自适应） */
const pageInfo = computed(() => {
  const displayPage = props.pageBase === 1 ? props.page : props.page + 1;
  const safeTotal = Math.max(props.totalPages, 1);
  return t("common.page", { page: displayPage, totalPages: safeTotal })
    // infra R2-00465：括号文案纳入 i18n（原硬编码全角括号，en-US 下显示中文括号）
    + (props.total > 0 ? t("common.totalParenthesized", { n: props.total }) : "");
});

/** 实际显示上一页文案：优先 props.prevText，缺省回退到 i18n */
const displayPrevText = computed(() => props.prevText || t("common.prevPage"));

/** 实际显示下一页文案：优先 props.nextText，缺省回退到 i18n */
const displayNextText = computed(() => props.nextText || t("common.nextPage"));
</script>

<template>
  <view class="pagination">
    <button
      class="page-button"
      :disabled="isFirst || disabled"
      @click="handlePrev"
    >{{ displayPrevText }}</button>
    <text class="page-info">{{ pageInfo }}</text>
    <button
      class="page-button"
      :disabled="isLast || disabled"
      @click="handleNext"
    >{{ displayNextText }}</button>
    <!-- infra R2-00463：页码跳转输入（大数据量翻页） -->
    <view class="page-jump">
      <input
        v-model="jumpInput"
        class="jump-input"
        type="number"
        min="1"
        :max="maxPage"
        :placeholder="t('common.jumpPagePlaceholder')"
        :disabled="disabled"
        @keydown.enter="handleJumpKeydown"
      />
      <button class="page-button jump-button" :disabled="disabled || !jumpInput" @click="doJump">
        {{ t("common.jumpTo") }}
      </button>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

/* infra R2-00463：页码跳转输入样式 */
.page-jump {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xs);
}

.jump-input {
  width: 56px;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  text-align: center;
  background: var(--admin-color-bg-container);
  color: var(--admin-color-text-primary);
}

.jump-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
}

.jump-button {
  font-size: var(--admin-font-sm);
  padding: var(--admin-space-xs) var(--admin-space-md);
}
</style>
