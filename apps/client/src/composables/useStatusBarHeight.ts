/**
 * 状态栏高度（px，含全局 page-meta 样式串）。
 *
 * 背景：env(safe-area-inset-top) 只覆盖刘海安全区，无刘海机型/模拟器返回 0，
 * 而状态栏（时间/电量）始终占位——自定义导航若只按 safe-area 留白会与状态栏叠印
 * （2026-08-29 视觉验收 P0）。配合 <page-meta :page-style> 把高度注入为
 * CSS 变量 --statusbar，样式侧统一写 var(--statusbar, env(safe-area-inset-top))。
 */
import { ref } from "vue";

const sbh = ref(0);
try {
  const info = uni.getSystemInfoSync();
  sbh.value = Number(info.statusBarHeight ?? 0) || 0;
} catch (_e) {
  sbh.value = 0;
}

export function useStatusBarHeight() {
  return sbh;
}

/** 传给 <page-meta :page-style> 的全局样式串（可继续追加） */
export function usePageMetaStyle(extra = ""): string {
  const h = sbh.value;
  const base = `--statusbar: ${h}px;`;
  return extra ? base + extra : base;
}
