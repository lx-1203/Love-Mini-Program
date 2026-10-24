/* 守卫用例：复刻 2026-10-24 的泄漏形态与合法形态，判据必须两边都对。
   与 scripts/sync-app-assets.mjs 里的表达式逐字一致（改那边要改这里）。 */
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

let pass = 0;
for (const [rel, bucket, baseSegs, want, why] of cases) {
  const got = leakedOf(rel, bucket, baseSegs);
  const ok = got === want;
  pass += ok ? 1 : 0;
  console.log(`${ok ? "PASS" : "FAIL"}  判泄漏=${got} 期望=${want}  ${why}\n      rel=${rel}`);
}
console.log(`\nGUARD_SELFTEST=${pass === cases.length ? "PASS" : "FAIL"} ${pass}/${cases.length}`);
process.exit(pass === cases.length ? 0 : 1);
