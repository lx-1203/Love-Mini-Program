/* 交互态取景的四象限判决（纯函数，无副作用 —— 单独成模块是为了能被自检直接驱动，
 * 而不是"跑一次取景器看看像不像"：tour-cli-states.mjs 的模块体在缺参数时会 process.exit，
 * 拿它当被 import 的库测就等于测不到东西）。
 *
 * 输入都是**已测得的事实**：
 *   preProbe / postProbe —— 期望节点在动作前/后的存在性，三态字符串 "1" / "0" / "ERR:…"
 *   preHash / postHash   —— 动作前后两帧的 sha256 前 16 位（任一为 null 表示没拿到可信帧）
 *   tapMismatch          —— 按标签找靶没找到（取景器点错控件）
 *   tapRes               —— tap 调用的结果，"ok" 或 "TAP_ERR …"
 *   tooSmall             —— 任一帧 <3000B
 *
 * 判决顺序是**刻意的**：取景器的错（HARNESS_MISS / PROBE_ERR）必须排在产品结论之前，
 * 否则"探针坏了"会被折叠成"节点没出现"，再被读成一条产品缺陷 —— 本仓为这类假缺陷返工过多次。
 */
export function classifyStateVerdict({ preProbe, postProbe, preHash, postHash, tapMismatch, tapRes, tooSmall }) {
  const p = String(preProbe ?? ""), q = String(postProbe ?? "");
  if (tapMismatch) return "HARNESS_MISS";
  if (tooSmall) return "PROBE_ERR";
  // 空串/缺失也按"没测到"处理：探针没给答案不等于答案是"不存在"（fail-closed）
  if (!p || !q || p.startsWith("ERR") || q.startsWith("ERR")) return "PROBE_ERR";
  if (String(tapRes ?? "ok") !== "ok") return "PROBE_ERR";
  if (!preHash || !postHash) return "PROBE_ERR";   // 没有可信前帧，就无从谈"变了没变"
  const samePixels = preHash === postHash;
  if (p === "1") return "WAS_THERE";               // 默认态里弹层就已经在 ⇒ 判据本身有问题
  if (q === "1") return samePixels ? "APPEARED_NOPIXEL" : "APPEARED";
  return samePixels ? "NOCHANGE" : "CHANGED_BUT_NO_NODE";
}
export const VERDICT_IS_PRODUCT_SIGNAL = (v) => ["APPEARED", "APPEARED_NOPIXEL", "NOCHANGE", "CHANGED_BUT_NO_NODE", "WAS_THERE"].includes(v);
