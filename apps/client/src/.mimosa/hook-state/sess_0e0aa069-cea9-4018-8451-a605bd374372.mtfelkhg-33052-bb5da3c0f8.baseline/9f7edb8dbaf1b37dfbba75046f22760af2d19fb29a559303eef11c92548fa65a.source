/**
 * useMenuButtonRect — 小程序右上角胶囊按钮安全距离
 *
 * 背景：全项目采用 navigationStyle: custom 自定义导航，页面右上角元素
 * （标题计数、筛选标签等）可能被微信小程序原生胶囊菜单遮挡。本 composable
 * 动态测量胶囊位置，通过 CSS 变量注入页面根节点，让业务样式按胶囊右缘预留
 * 安全距离；H5 / 其他平台无胶囊，变量恒为 0，样式自然回退设计原值。
 *
 * 用法：
 *   const { styleVars } = useMenuButtonRect();
 *   <view class="page" :style="styleVars">…</view>
 *
 *   /* CSS 兜底：JS 测量前/失败时仍有静态预留（96px），测量成功后被变量覆盖 * /
 *   .page-header { padding-right: calc(var(--capsule-right, 96px) + 24px); }
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { getMenuButtonRect, getWindowWidth } from "../compat";

/** 兜底胶囊间隙（标准小程序胶囊 87×32px，距右缘 7px；测量失败时使用） */
const FALLBACK_GAP = 7;

/**
 * 胶囊右缘到屏幕右缘的间隙（px）。
 *
 * mp-weixin：实测间隙；测量失败/无胶囊时返回兜底值（FALLBACK_GAP）。
 * 其他平台：恒为 0（无胶囊，由 CSS 变量归零处理）。
 */
function measureCapsuleGap(): number {
  const rect = getMenuButtonRect();
  if (!rect) return 0;
  const windowWidth = getWindowWidth();
  const gap = windowWidth - rect.right;
  if (gap > 0) return gap;
  // 异常数据（胶囊越界）时兜底标准间隙
  return FALLBACK_GAP;
}

export function useMenuButtonRect() {
  /** 胶囊右缘间隙（px） */
  const capsuleRightGap = ref(0);

  function measure(): void {
    capsuleRightGap.value = measureCapsuleGap();
  }

  /** 页面根节点 style 绑定：--capsule-right（px） */
  const styleVars = computed(() => ({
    "--capsule-right": `${capsuleRightGap.value}px`,
  }));

  onMounted(() => {
    measure();
    // 窗口尺寸变化（旋转/分屏）时重测；非 H5 端 window 不可用时静默跳过
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("resize", measure);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("resize", measure);
    }
  });

  return { capsuleRightGap, styleVars, measure };
}
