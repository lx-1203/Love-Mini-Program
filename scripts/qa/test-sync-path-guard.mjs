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
console.log(`\nGUARD_SELFTEST=${pass === total ? "PASS" : "FAIL"} ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
