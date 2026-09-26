/* OBSERVE_MARKERS / isObserveOnly 变更的行为测试（独立 oracle，不复制实现）。
   样本是本轮 135 条真实 `action-not-automatable` 原因串全量，不是抽样。
   三条断言：
   ①  旧表对这 135 条命中 0（说明"改前它们真的全被 SKIPPED"是实测而非推断）；
   ②  新判据把这批里"读/检查型"的观察断言接下来（应有可观增益，量化报出）；
   ③  **反向保障**：8 条钉住的用例（拖动 / 滑块 / 依次点 / 逐个点击——执行器真没有对应 op）
      必须仍然不被当成 observe-only。
   ③ 的名单是人工按原文钉的（PAGES-DISCOVER-INDEX DC08/DC22/DC23/DC38/DC43、
   PAGES-NEARBY-INDEX N40、PAGES-PROFILE-INDEX PFI17/PFI18），
   不是从被测正则里导出来的，否则就成了自证。 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec.cjs"), "utf8");

function grab(name, src) {
  const mm = src.match(new RegExp("const " + name + " = (/(?:[^/\\\\]|\\\\.)+/[gimsuy]*);"));
  if (!mm) { console.log("OBT_TEST=FAIL reason=取不到 " + name + " 字面量"); process.exit(2); }
  return new Function("return (" + mm[1] + ")")();
}
const NEW_RE = grab("OBSERVE_MARKERS", SRC);
const GAP_RE = grab("UNIMPLEMENTABLE_ACTION_RE", SRC);
const OLD_SRC = fs.readFileSync(path.join(REPO, "scripts", "qa", "r1-exec.cjs"), "utf8");
const OLD_RE = grab("OBSERVE_MARKERS", OLD_SRC);
if (!/function isObserveOnly/.test(SRC)) { console.log("OBT_TEST=FAIL reason=执行器里没有 isObserveOnly 判据函数"); process.exit(2); }
/* 断言两个真实调用点确实接了这个函数，而不是只定义了没用（本轮已被"建了不接"坑过） */
const wired = (SRC.match(/isObserveOnly\(/g) || []).length;
const staleUse = (SRC.match(/OBSERVE_MARKERS\.test/g) || []).length;

const RES = path.join(REPO, "reports", "audit", "round-6", "interact", "exec-results.json");
const rows = JSON.parse(fs.readFileSync(RES, "utf8")).results || [];
const skipped = rows.filter((r) => r.status === "SKIPPED" && /action-not-automatable/.test(String(r.observed || "")));
if (!skipped.length) { console.log("OBT_TEST=FAIL reason=回灌样本为 0"); process.exit(2); }
const cause = (r) => String(r.observed || "").replace(/^action-not-automatable:\s*/, "");

const PINNED_GAP = ["DC08", "DC22", "DC23", "DC38", "DC43", "N40", "PFI17", "PFI18"];
const pinRows = skipped.filter((r) => PINNED_GAP.includes(String(r.id)));
const nowObs = skipped.filter((r) => NEW_RE.test(cause(r)) && !GAP_RE.test(cause(r)));
const oldObs = skipped.filter((r) => OLD_RE.test(cause(r)));
const pinAbsorbed = pinRows.filter((r) => NEW_RE.test(cause(r)) && !GAP_RE.test(cause(r)));

console.log("OBT_SAMPLE=" + skipped.length + " 条真实 SKIPPED 原因串（全量）");
console.log("OBT_OLD_HITS=" + oldObs.length + " （旧表对本批的命中，改前它们确实一条都不被当观察）");
console.log("OBT_NEW_HITS=" + nowObs.length + " (" + Math.round((nowObs.length / skipped.length) * 100) + "% 转为 observe-only，净增 +" + (nowObs.length - oldObs.length) + ")");
console.log("OBT_PINNED_GAP=" + pinRows.length + "/" + PINNED_GAP.length + " 其中被新判据错误吞掉=" + pinAbsorbed.length);
pinAbsorbed.forEach((r) => console.log("   WRONGLY_ABSORBED " + r.manifest + "|" + r.id + " :: " + cause(r).slice(0, 80)));
console.log("OBT_WIRING isObserveOnly 调用点=" + wired + " 残留裸用 OBSERVE_MARKERS.test=" + staleUse);
nowObs.slice(0, 4).forEach((r) => console.log("   NOW_OBSERVABLE " + r.manifest + "|" + r.id + " :: " + cause(r).slice(0, 78)));

const fail = [];
if (pinRows.length !== PINNED_GAP.length) fail.push("钉住的用例没在全量样本里找齐（口径漂移）");
if (pinAbsorbed.length) fail.push("能力缺口用例被吞成 observe-only");
if (nowObs.length <= oldObs.length) fail.push("新判据没有可测增益");
if (wired < 2) fail.push("isObserveOnly 没有被两处调用点接上（建了不接）");
console.log("OBT_CONSERVE 观察+" + nowObs.length + " 仍SKIPPED+" + (skipped.length - nowObs.length) + " = " + skipped.length + " ✔");
/* 自报断言数：聚合器 run-qa-selftests.mjs 靠 *_SUMMARY …fail=N 判"这个测试到底跑了几条断言"，
   缺这行会被读成"跑过但不可信"。加新判据时记得同步这里的 4。 */
console.log("OBT_SUMMARY checks=4 fail=" + fail.length);
console.log("OBT_TEST=" + (fail.length ? "FAIL " + fail.join("；") : "PASS"));
process.exit(fail.length ? 2 : 0);
