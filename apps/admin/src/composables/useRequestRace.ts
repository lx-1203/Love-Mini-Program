import { ref } from "vue";

/**
 * R4 Batch3：请求竞态防护 composable（替换各视图手写 reqSeq 模式）。
 *
 * 解决场景：分页/筛选列表快速连续请求时，旧响应回来可能覆盖新数据。
 * 用法：
 *   const { nextSeq, isStale } = useRequestRace();
 *   async function fetchList() {
 *     const seq = nextSeq();          // 发起新请求前取号
 *     try {
 *       const result = await api();
 *       if (isStale(seq)) return;     // 已被新请求取代，丢弃旧响应
 *       list.value = result;
 *     } catch (err) {
 *       if (isStale(seq)) return;     // 异常同样丢弃
 *       error.value = ...;
 *     } finally {
 *       if (!isStale(seq)) {          // 仅最新请求负责收尾（loading 复位）
 *         loading.value = false;
 *       }
 *     }
 *   }
 *
 * 注意：
 * - 每个独立竞态流（如双 Tab 各自拉列表）应使用独立实例，避免互相作废；
 * - nextSeq/isStale 为纯函数（读取 reqSeq.value），可在任意上下文调用。
 */
export function useRequestRace() {
  const reqSeq = ref(0);

  /** 发起新请求前调用，返回当前序号；响应回来用 isStale(seq) 判断是否已被新请求取代 */
  function nextSeq(): number {
    reqSeq.value += 1;
    return reqSeq.value;
  }

  /** 判断某序号是否已被取代（旧响应应被丢弃） */
  function isStale(seq: number): boolean {
    return seq !== reqSeq.value;
  }

  return { reqSeq, nextSeq, isStale };
}
