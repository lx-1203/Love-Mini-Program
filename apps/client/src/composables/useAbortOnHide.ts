/**
 * useAbortOnHide — 页面切后台时取消请求的组合式函数
 *
 * SubTask 5.4.4：onHide 中使用 AbortController 取消请求
 *
 * 实现策略：
 * - 在页面 setup 时创建 AbortController
 * - onShow 阶段：若 controller 已 aborted，重建一个新的（用于切回前台后重新发起请求）
 * - onHide 阶段：调用 controller.abort()，自动取消所有使用该 signal 的 HTTP 请求
 * - 通过 signal 属性暴露给页面，传入 request({ signal }) 即可
 *
 * mp-weixin 兼容性：
 * - AbortController 在 mp-weixin 基础库 2.10.4+ 与 H5 / APP 端均可用
 * - 不使用 import.meta.env
 * - 不使用 optional catch binding
 *
 * 用法：
 * ```ts
 * import { useAbortOnHide } from "@/composables/useAbortOnHide";
 * import { request } from "@/services/http";
 *
 * const { signal, reset } = useAbortOnHide();
 *
 * async function loadData() {
 *   // signal 会随 onShow/onHide 自动重建/取消
 *   const data = await request<DataType>({ url: "/data", signal });
 *   state.value = data;
 * }
 * ```
 */
import { ref, onUnmounted } from "vue";
import { onHide, onShow } from "@dcloudio/uni-app";

/**
 * AbortController 兼容性兜底：
 * 在极少数低版本 mp-weixin 基础库或 SSR 环境下，AbortController 可能未定义。
 * 此处提供一个最小实现，仅支持 abort() 与 signal.aborted 状态，不支持事件监听。
 */
class FallbackAbortController {
  readonly signal = {
    aborted: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    onabort: null as (() => void) | null,
  };

  abort(): void {
    (this.signal as { aborted: boolean }).aborted = true;
    if (this.signal.onabort) {
      try {
        this.signal.onabort();
      } catch (_e) {
        // 静默忽略
      }
    }
  }
}

/**
 * 创建 AbortController（优先使用原生，不存在时回退到 Fallback）
 */
function createController(): AbortController | FallbackAbortController {
  if (typeof AbortController !== "undefined") {
    return new AbortController();
  }
  return new FallbackAbortController();
}

/**
 * 页面切后台取消请求的组合式函数。
 *
 * - 返回 signal 引用，调用方传入 request({ signal }) 即可让请求在 onHide 时被取消
 * - onShow 时自动重建 controller，避免上一次 abort 后无法再次发请求
 *
 * @returns { signal, reset, abort }
 *   - signal: 当前 AbortController 的 signal（响应式，重建后会更新）
 *   - reset: 手动重建 controller（一般不需要手动调用）
 *   - abort: 手动触发 abort（一般不需要手动调用）
 */
export function useAbortOnHide(): {
  signal: import("vue").Ref<AbortSignal>;
  reset: () => void;
  abort: () => void;
} {
  // 当前 controller 引用（非响应式，避免不必要的渲染）
  let controller: AbortController | FallbackAbortController = createController();
  // signal 响应式引用，传入 request 时需要 .value 解引用
  const signal = ref<AbortSignal>(controller.signal as AbortSignal);

  /**
   * 重建 controller：
   * - 调用方手动调用 reset()
   * - onShow 时自动调用（若已被 abort）
   */
  function reset(): void {
    controller = createController();
    signal.value = controller.signal as AbortSignal;
  }

  /**
   * 手动触发 abort，取消所有使用当前 signal 的请求。
   */
  function abort(): void {
    try {
      controller.abort();
    } catch (_e) {
      // 静默忽略
    }
  }

  // 页面隐藏时取消所有挂起请求
  onHide(() => {
    abort();
  });

  // 页面恢复显示时重建 controller，允许后续请求继续使用 signal
  onShow(() => {
    // 仅在已被 abort 时重建，避免不必要的重建影响进行中的请求
    if (signal.value.aborted) {
      reset();
    }
  });

  // 组件卸载时也取消挂起请求，避免内存泄漏
  onUnmounted(() => {
    abort();
  });

  return { signal, reset, abort };
}
