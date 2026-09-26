/* tour-r6 的「同页状态帧去重」纯函数自检（A-2 块，[R2-DEDUPE-BEGIN..END] 之间的文本）。
   为什么单独立一个：本轮 T5 重拍后我在盘上实测到 3 组"同页不同状态却字节全等"的帧，
   而巡检自报 `state-not-applied 0 条` —— 因为旧实现只比**上一张落盘帧**：
   publish 的顺序是 `默认 → 交互后 → 弹层态`，"弹层态==默认"永远看不见。
   一个只在相邻两帧恰好相同时才响的去重器，等于给非相邻的假状态帧开了免检通道。
   用法：node scripts/qa/test-frame-dedupe.cjs
*/
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const REPO = path.resolve(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(REPO, "scripts", "qa", "tour-r6.mjs"), "utf8");
const m = SRC.match(/\/\/ \[R2-DEDUPE-BEGIN\]([\s\S]*?)\/\/ \[R2-DEDUPE-END\]/);
if (!m) { console.log("FD_SUMMARY checks=1 fail=1\nFD_TEST=FAIL 取不到 R2-DEDUPE 块（标记被改动，本自检失去被测物）"); process.exit(1); }

const decideFrameFiling = new Function("createHash", m[1] + "\nreturn decideFrameFiling;")(createHash);
const frameHash = (s) => createHash("sha256").update(Buffer.from(s)).digest("hex").slice(0, 16);
const buf = (s) => Buffer.from(s);
const fr = (state, s) => ({ state, hash: frameHash(s) });

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail ? " :: " + detail : "")); }
  else console.log("ok   " + name);
}

/* 1) 本轮真实形状：默认 → 交互后 → 弹层态(与默认同字节)。旧实现在这里判 save。 */
{
  const pool = [fr("默认", "A"), fr("交互后", "B")];
  const d = decideFrameFiling(pool, buf("A"), "弹层态");
  /* 反向对照：把旧规则（只比上一张落盘帧）原样重算一遍，证明上面这条断言不是恒真 ——
     旧规则在这个输入上必然判 save，也就是说 T5 语料里那 3 组同字节对确实是从这里漏出去的。 */
  const oldRuleSays = pool[pool.length - 1].hash === frameHash("A") ? "state-not-applied" : "save";
  t("对照：旧规则在同一输入上判 save（漏报被复现，不是恒真断言）", oldRuleSays === "save", oldRuleSays);
  t("非相邻同字节必须被判重复（旧实现的漏报形状）", d.action === "state-not-applied", JSON.stringify(d));
  t("点名它和哪一帧同图", d.dupOf === "默认", JSON.stringify(d));
  t("reason 里给得出同图帧清单", Array.isArray(d.dupOfAll) && d.dupOfAll.includes("默认"), JSON.stringify(d.dupOfAll));
}
/* 2) 相邻同字节（旧实现唯一能抓到的情形）不得退化 */
{
  const pool = [fr("默认", "A")];
  const d = decideFrameFiling(pool, buf("A"), "交互后");
  t("相邻同字节仍判重复", d.action === "state-not-applied" && d.dupOf === "默认", JSON.stringify(d));
}
/* 3) 真状态帧（字节不同）必须放行 —— 否则就是"改成无条件判红" */
{
  const pool = [fr("默认", "A"), fr("交互后", "B")];
  const d = decideFrameFiling(pool, buf("C"), "弹层态");
  t("内容真的不同 ⇒ save", d.action === "save", JSON.stringify(d));
}
/* 4) 空缓冲走另一支路，不混进"重复" */
{
  const d = decideFrameFiling([fr("默认", "A")], Buffer.alloc(0), "弹层态");
  t("空缓冲 = drop-empty", d.action === "drop-empty", JSON.stringify(d));
}
/* 5) 兼容旧调用：第二帧参数传单个对象（不是数组）也要能判 */
{
  const d = decideFrameFiling(fr("默认", "A"), buf("A"), "交互后");
  t("单帧对象入参仍生效（兼容旧调用与既有自检文本）", d.action === "state-not-applied", JSON.stringify(d));
}
/* 6) 多帧同图时 dupOfAll 要把它们都列出来（nearby 的 默认/交互后 同图，滚动帧不同） */
{
  const pool = [fr("默认", "A"), fr("交互后", "A"), fr("滚动-中部", "B")];
  const d = decideFrameFiling(pool, buf("A"), "滚动-底部");
  t("同图帧清单含全部命中", d.action === "state-not-applied" && d.dupOfAll.length === 2, JSON.stringify(d.dupOfAll));
}
/* 7) 空池（本页第一帧）不得凭空判重复 */
{
  const d = decideFrameFiling([], buf("A"), "默认");
  t("本页首帧 ⇒ save（池为空不许误判）", d.action === "save", JSON.stringify(d));
}

console.log(`\nFD_SUMMARY checks=${checks} fail=${fails}`);
console.log(`FD_TEST=${fails ? "FAIL" : "PASS"}`);
process.exit(fails ? 1 : 0);
