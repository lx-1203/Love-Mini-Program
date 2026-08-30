<script setup lang="ts">
/**
 * 通用分页组件（design-tokens §5.5 / Frame 03 分页形态）。
 *
 * 统一对外暴露 v-model:page 与 change 事件。
 *
 * <p><b>设计目标</b>：</p>
 * <ul>
 *   <li>支持两种页码模型：
 *     <ul>
 *       <li>1-based（默认）：page 从 1 开始，禁用条件 page <= 1</li>
 *       <li>0-based（Spring Data 风格）：page 从 0 开始，禁用条件 page === 0</li>
 *     </ul>
 *     通过 {@code pageBase} prop 区分，默认 1-based。
 *   </li>
 *   <li>形态：左侧「共 N 条 · 每页 X」，右侧 ‹ 1 2 3 4 5 › 页码方块，
 *     激活页 = cobalt 底白字（Frame 03/06 分页）。</li>
 *   <li>不内置 fetch 逻辑：仅触发 change 事件，由父组件决定是否触发请求。</li>
 * </ul>
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 当前页码（v-model:page） */
    page: number;
    /** 总页数 */
    totalPages: number;
    /** 总记录数（展示「共 N 条」用） */
    total?: number;
    /** 每页条数（展示「每页 X」用） */
    pageSize?: number;
    /**
     * 页码基数：
     * - 1（默认）：page 从 1 开始，禁用条件 page <= 1
     * - 0：page 从 0 开始，禁用条件 page === 0
     */
    pageBase?: 0 | 1;
    /** 是否禁用（如加载中） */
    disabled?: boolean;
  }>(),
  {
    total: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    pageBase: 1,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "update:page", page: number): void;
  (e: "change", page: number): void;
}>();

/** 当前页（统一换算为 1-based 展示值） */
const displayPage = computed(() => (props.pageBase === 1 ? props.page : props.page + 1));

/** 是否为第一页（禁用「‹」） */
const isFirst = computed(() =>
  props.pageBase === 1 ? props.page <= 1 : props.page === 0,
);

/** 是否为最后一页（禁用「›」） */
const isLast = computed(() => {
  if (props.totalPages <= 0) return true;
  return props.pageBase === 1
    ? props.page >= props.totalPages
    : props.page >= props.totalPages - 1;
});

/**
 * 页码窗口：以当前页为中心最多 5 个页码（Frame 03 分页形态），
 * 靠近首/尾时窗口自动贴边。
 */
const pageWindow = computed<number[]>(() => {
  const max = Math.max(props.totalPages, 1);
  const size = Math.min(5, max);
  let start = displayPage.value - Math.floor(size / 2);
  start = Math.min(Math.max(start, 1), max - size + 1);
  const pages: number[] = [];
  for (let i = 0; i < size; i++) {
    pages.push(start + i);
  }
  return pages;
});

/** 跳转到指定页（钳制范围，重复页不触发） */
function goTo(page: number): void {
  if (props.disabled) return;
  const clamped = Math.min(Math.max(page, 1), Math.max(props.totalPages, 1));
  const target = props.pageBase === 1 ? clamped : clamped - 1;
  if (target === props.page) return;
  emit("update:page", target);
  emit("change", target);
}

function handlePrev(): void {
  if (isFirst.value || props.disabled) return;
  goTo(displayPage.value - 1);
}

function handleNext(): void {
  if (isLast.value || props.disabled) return;
  goTo(displayPage.value + 1);
}

/** 左侧统计文案：共 N 条 · 每页 X */
const summaryText = computed(() => {
  const parts: string[] = [];
  if (props.total > 0) {
    parts.push(t("common.total", { n: props.total.toLocaleString() }));
  }
  parts.push(t("common.pageSize", { n: props.pageSize }));
  return parts.join(" · ");
});
</script>

<template>
  <view class="pagination">
    <text class="page-info">{{ summaryText }}</text>
    <view class="pagination-pages">
      <button
        class="page-button page-arrow"
        :disabled="isFirst || disabled"
        :aria-label="t('common.prevPage')"
        @click="handlePrev"
      >‹</button>
      <button
        v-for="p in pageWindow"
        :key="p"
        class="page-button"
        :class="{ 'page-button--active': p === displayPage }"
        :disabled="disabled"
        @click="goTo(p)"
      >{{ p }}</button>
      <button
        class="page-button page-arrow"
        :disabled="isLast || disabled"
        :aria-label="t('common.nextPage')"
        @click="handleNext"
      >›</button>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

/* 右侧页码组（方块页码 + 细箭头，Frame 03 分页） */
.pagination-pages {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xs);
}

.page-button {
  border-color: transparent;
}

.page-arrow {
  color: var(--admin-color-text-secondary);
  font-size: 16px;
}
</style>
