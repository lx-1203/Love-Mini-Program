/* 守卫用例：复刻 2026-10-24 的泄漏形态与合法形态，判据必须两边都对。
   下面这份谓词是从 scripts/sync-app-assets.mjs 抄来的，"改那边要改这里"是人肉约定、守不住
   ——所以最后一条不测逻辑、测源码：sync 文件里必须逐字存在同一表达式。
   没有这条锚，守卫被改写或删掉时本测试照样 6/6 绿。 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const leakedOf = (rel, bucket, baseSegs) => String(rel).split(/[\\/]+/).slice(baseSegs).includes(bucket);

const cases = [
  // [rel, bucket, baseSegs, 期望判泄漏, 说明]
  ["assets/images/covers/circle-food.png", "assets-images", 2, false, "规范路径（assets-images 桶 → assets/images）"],
  ["assets/images/assets-images/covers/circle-food.png", "assets-images", 2, true, "历史事故形态：基名之下又套一层桶名"],
  ["generated/images/activities/art-exhibition.jpg", "generated", 1, false, "合法：generated 桶的目标基名本身就是 generated（第一版在此误杀 18 个）"],
  ["generated/generated/x.png", "generated", 1, true, "generated 桶的重复嵌套也要拦住"],
  ["assets/images/products/ticket-2.jpg", "assets-images", 2, false, "规范路径"],
  ["assets/images/assets-images/products/ticket-2.jpg", "assets-images", 2, true, "本次清掉的 110 个就是这一形"],
];

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "sync-app-assets.mjs");
const PREDICATE = "String(e.rel).split(/[\\\\/]+/).slice(e.baseSegs).includes(e.bucket)";

const srcHas = (() => {
  try { return readFileSync(SRC, "utf8").includes(PREDICATE); } catch { return false; }
})();

let pass = 0;
for (const [rel, bucket, baseSegs, want, why] of cases) {
  const got = leakedOf(rel, bucket, baseSegs);
  const ok = got === want;
  pass += ok ? 1 : 0;
  console.log(`${ok ? "PASS"  : "FAIL"}  判泄漏=${got} 期望=${want}  ${why}\n      rel=${rel}`);
}
console.log(`${srcHas ? "PASS" : "FAIL"}  sync-app-assets.mjs 里逐字存在同一谓词（防止测试与守卫分家）`);
pass += srcHas ? 1 : 0;
const total = cases.length + 1;
/* 聚合器只认两类自报计数（run-qa-selftests.mjs 的 mNew / mOld 两条正则）：
   `SUMMARY: assertion failures = N` 或 `XXX_SUMMARY … fail=N`。本文件原先只印 `GUARD_SELFTEST=PASS 7/7` —— 它不是聚合器认的
   计数行（`_SELFTEST=` 里没有 `_TEST=` 这个子串），于是 exit=0 也被记成「无自报断言计数（不可信）」，
   一条本来 7/7 全绿的测试整发判红（2026-10-27 复现）。
   这里补一行聚合器认得的 SUMMARY，而不是去放宽聚合器的判据：聚合器「每个测试必须自报断言数」
   这条约束是它敢把 exit=0 当证据的前提，为单个测试松它，等于给所有不报数的测试开后门。
   失败数由 total-pass 现算而不是写死 0：判据一红，聚合器读到的就是同一笔账，不会出现
   「自报 0 失败但退出码 1」这种自相矛盾。 */
console.log(`SUMMARY: assertion failures = ${total - pass}`);
console.log(`\nGUARD_SELFTEST=${pass === total ? "PASS" : "FAIL"} ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
