/**
 * 防抖（debounce）与节流（throttle）工具集
 *
 * 用途：
 * - 按钮防抖：避免用户快速连续点击触发重复提交（如登录、支付、发帖）
 * - 搜索输入防抖：避免每个字符都触发请求（如寻觅页搜索 300ms 防抖）
 * - 滚动事件节流：限制高频滚动事件的回调频率
 *
 * mp-weixin 兼容性：
 * - 不使用 optional catch binding（catch 必须带参数）
 * - 不使用 import.meta.env
 * - 纯 TS 实现，无平台 API 依赖
 */

/**
 * 防抖函数：在最后一次调用后延迟 delay 毫秒再执行 func。
 *
 * 在延迟窗口内再次调用会重置定时器，确保只执行最后一次。
 * 适用于「等待用户停止操作后再执行」的场景（如搜索框输入、按钮防抖）。
 *
 * @param func - 要防抖的函数
 * @param delay - 延迟毫秒数（默认 300ms）
 * @returns 防抖后的函数（携带 cancel 方法用于取消挂起的调用）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 通用函数泛型约束需 any 兼容任意签名业务函数，Parameters<T> 仅能从可调用类型推导
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay = 300,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    // 清除上一次挂起的调用
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    // 重新设定定时器，延迟 delay 毫秒后执行
    timeoutId = setTimeout(() => {
      timeoutId = null;
      try {
        func(...args);
      } catch (_e) {
        // 静默吞掉回调异常，避免定时器回调抛错影响后续调用
        // 业务方应在 func 内部自行处理错误（toast / 上报）
      }
    }, delay);
  };

  /** 取消挂起的调用（清空定时器） */
  debounced.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * 节流函数：在 delay 毫秒内最多执行一次 func。
 *
 * 与防抖不同，节流保证在持续触发时按固定频率执行，
 * 适用于「限制高频事件回调频率」的场景（如滚动、resize）。
 *
 * @param func - 要节流的函数
 * @param delay - 节流间隔毫秒数（默认 300ms）
 * @returns 节流后的函数（携带 cancel 方法用于取消挂起的调用）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 通用函数泛型约束需 any 兼容任意签名业务函数，Parameters<T> 仅能从可调用类型推导
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay = 300,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let lastExecuted = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>): void => {
    const now = Date.now();
    const remaining = delay - (now - lastExecuted);

    if (remaining <= 0) {
      // 已过冷却期，立即执行
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastExecuted = now;
      try {
        func(...args);
      } catch (_e) {
        // 静默吞掉回调异常
      }
    } else if (timeoutId === null) {
      // 在冷却期内且无挂起调用，安排一次尾调用确保最后一次触发能执行
      timeoutId = setTimeout(() => {
        lastExecuted = Date.now();
        timeoutId = null;
        try {
          func(...args);
        } catch (_e) {
          // 静默吞掉回调异常
        }
      }, remaining);
    }
  };

  /** 取消挂起的尾调用 */
  throttled.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastExecuted = 0;
  };

  return throttled;
}

/**
 * 创建按钮防抖包装器：在 leading 触发后，于 delay 毫秒内忽略后续调用。
 *
 * 与普通 debounce 不同，按钮防抖需要「立即响应首次点击，再忽略短时间内的重复点击」，
 * 这样既能保证用户反馈即时，又能防止双击/误触导致的重复提交。
 *
 * 用法：
 * ```ts
 * const debouncedSubmit = createButtonGuard(submit, 800);
 * // 模板：@tap="debouncedSubmit"
 * ```
 *
 * @param func - 要保护的业务函数（同步或异步均可）
 * @param delay - 防抖窗口毫秒数（默认 800ms，覆盖常见双击间隔）
 * @returns 包装后的函数，与原函数签名一致
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 通用函数泛型约束需 any 兼容任意签名业务函数，Parameters<T> 仅能从可调用类型推导
export function createButtonGuard<T extends (...args: any[]) => any>(
  func: T,
  delay = 800,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let locked = false;

  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    if (locked) {
      // 防抖窗口内，忽略重复点击
      return undefined;
    }
    locked = true;
    // 延迟释放锁，确保整个动画/网络请求周期内不重复触发
    setTimeout(() => {
      locked = false;
    }, delay);
    try {
      return func(...args);
    } catch (e) {
      // 出错时立即释放锁，避免锁死后续合法调用
      locked = false;
      throw e;
    }
  };
}
