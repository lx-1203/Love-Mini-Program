#!/usr/bin/env node
/* fourgrid-axis / observe-only dom 提取口径的行为测试（独立 oracle，不复制实现）。
   测的是 round-7 终报 §4 第 5 项修的这条链：
     triage-exec-failures.mjs 的 domObserveConclusion（把 observe-only 的 `.x:absent` 算作
     "能恢复出查找目标的定位失败"）→ sidecar items[].token/domAbsent → fourgrid-axis.mjs 的空集分流。

   断言形状刻意按"能变红"设计（本项目在"负例永远不变红"上返工过：未 scoped 的 replace、
   fixture 没被真的用、断言写成 A and B in text 而 A B 不相邻）：
   · C1–C5 用**真跑的分诊台**对钉好的 fixture 语料出 sidecar，再逐字段断言（fixture 不经过实现=不会跑绿）；
   · C6 是负例：喂一份**真的不含任何定位信息**的 observed 集（`__CAND__` 哨兵、observed 空串），
     断言判据**仍然返回 red/FAIL**——提取口径若被改成"从说明文字里编 token"，四格被伪 token 填满、
     这条立刻变红（变异检验用这个方向）；
   · C7/C8 钉"不许泛化"与"永远不返回 PASS"：present-only 行不得进四格；claims=0 只准记 NOT_APPLICABLE；
   · C9/C10 接线检查：报告器与分诊台**真的调用**了这套判据（建了不接是本轮公开批评过 3 次的同类失败）。
   临时件只写 .zcode/tmp/lane-tooldebt/，不碰任何权威件。 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fourGridEmptySetVerdict, domAbsentClaims, legacyLocateBuckets } from "./fourgrid-axis.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const TMP = join(REPO, ".zcode", "tmp", "lane-tooldebt", "fourgrid-test");
mkdirSync(TMP, { recursive: true });

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };

/* 分诊台在 node<20.6 上会因 import.meta.filename 崩（实测），聚合器可能拿旧 node 跑自检，
   所以需要探测解释器，探不到就明说而不是静默跳。 */
function pickNode() {
  const v = Number(process.versions.node.split(".")[0]);
  if (v >= 20) return process.execPath;
  const alt = process.env.QA_FOURGRID_NODE22 || process.env.NODE22_EXE || "";
  if (existsSync(alt)) return alt;
  return null;
}
const NODE = pickNode();
if (!NODE) {
  console.log("FGD_SUMMARY checks=1 fail=1");
  console.log("FGD_TEST=FAIL reason=找不到能跑分诊台的 node（需 >=20；env QA_FOURGRID_NODE22 可指定）——测试不可信，不许静默跳过");
  process.exit(1);
}

const mkCorpus = (name, results) => {
  const p = join(TMP, name + ".exec-results.json");
  writeFileSync(p, JSON.stringify({ gitSha: "fourgrid-fixture", updatedAt: new Date().toISOString(), results }, null, 1));
  return p;
};
const runTriage = (corpusPath, outBase) => {
  const r = spawnSync(NODE, [join(HERE, "triage-exec-failures.mjs"), "--results", corpusPath, "--out", outBase],
    { cwd: REPO, encoding: "utf8", timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const stdout = String(r.stdout || "");
  let json = null;
  try { json = JSON.parse(readFileSync(outBase + ".json", "utf8")); } catch { /* 交给断言判红 */ }
  return { code: r.status, stdout, json, stderr: String(r.stderr || "") };
};

/* ---------------- fixture POS：round-7 observe-only 真形态（原文串取自
   reports/audit/round-7/interact/exec-results.json LG01 / exec-A-mock-final H17 的同款句式，
   落地页/选择器换成钉死的两对，防任何一条被环境差异救活或冤死） ---------------- */
const posRows = [
  { id: "FGD-LG1", suite: "fourgrid-fixture", manifest: "fixture", page: "pages/home/index", status: "FAILED",
    failureReason: "落在别的页（页内守卫或路由重定向），须人判",
    observed: "top=pages/discover/index ≠ pages/home/index | dom: .today-card__btn--love:absent .interest-card__join:absent | ws-route+ws-probe",
    route: "pages/discover/index" },
  { id: "FGD-SL1", suite: "fourgrid-fixture", manifest: "fixture", page: "pages/home/index", status: "SKIPPED",
    failureReason: "action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀",
    observed: "top=pages/home/index | dom: .today-card__rotate:absent | ws-route+ws-probe",
    route: "pages/home/index" },
  { id: "FGD-PRE1", suite: "fourgrid-fixture", manifest: "fixture", page: "pages/home/index", status: "SKIPPED",
    failureReason: "action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀",
    observed: "top=pages/home/index | dom: .interest-card__join:present(3) | ws-route+ws-probe",
    route: "pages/home/index" },
  { id: "FGD-NON1", suite: "fourgrid-fixture", manifest: "fixture", page: "pages/home/index", status: "FAILED",
    failureReason: "落在别的页（页内守卫或路由重定向），须人判",
    observed: "top=pages/discover/index ≠ pages/home/index | dom: (本条没点名类名) | ws-route+ws-probe",
    route: "pages/discover/index" },
];
const pos = runTriage(mkCorpus("pos", posRows), join(TMP, "triage-pos"));
ok(pos.json !== null, "C1: 分诊台对 POS fixture 没写出 sidecar（fixture 根本没被用上） exit=" + pos.code);
if (pos.json) {
  const byId = Object.fromEntries(pos.json.items.map((it) => [it.id, it]));
  const lg = byId["FGD-LG1"], sl = byId["FGD-SL1"], pre = byId["FGD-PRE1"], non = byId["FGD-NON1"];
  /* C2：absent 结论必须恢复出**精确**的第一只选择器（不是半截、不是括号注释、不是第二只） */
  ok(lg && lg.token === "today-card__btn--love" && lg.sel === ".today-card__btn--love" && lg.recoverable === true && lg.tokenKind === "selector" && lg.tokenFrom === "observe-only-dom",
    "C2: FAILED-landing-guard 的 dom absent 没恢复出精确查找目标：" + JSON.stringify(lg && { token: lg.token, sel: lg.sel, recoverable: lg.recoverable, tokenFrom: lg.tokenFrom }));
  ok(sl && sl.token === "today-card__rotate" && sl.tokenFrom === "observe-only-dom",
    "C2b: observe-only-slice 的 dom absent 没恢复出查找目标：" + JSON.stringify(sl && { token: sl.token, tokenFrom: sl.tokenFrom }));
  /* C3：恢复出的条目必须真的进了双载体检（有 verdict ⇒ 进取数） */
  const gridN = pos.json.items.filter((it) => it.recoverable && it.token && it.verdict).length;
  ok(gridN >= 2, "C3: observe-only 行没进 dist/src 四格双载体检（verdict 缺失），grid=" + gridN);
  /* C4：present-only 不是"查找失败"，不许被算进来；括号注释不许产 token */
  ok((!pre || !pre.token) && (!pre || pre.domAbsent !== true), "C4: present-only 行被误当定位失败进了取数：" + JSON.stringify(pre && { token: pre.token, domAbsent: pre.domAbsent }));
  ok((!non || !non.token) && (!non || non.domAbsent !== true), "C4b: 「(本条没点名类名)」被当成了选择器（未 scoped 的泛化）：" + JSON.stringify(non && { token: non.token, domAbsent: non.domAbsent }));
  /* C5：absent 声称旗标必须独立于 token 存在（提取失灵时它还得在，红才有来源） */
  ok(pos.json.items.filter((it) => it.domAbsent === true).length === 2,
    "C5: domAbsent 声称计数不是 2（LG1+SL1），实际=" + pos.json.items.filter((it) => it.domAbsent === true).length);
  ok(pos.stdout.includes("TRIAGE_DOM_OBSERVE_ONLY="), "C5b: 分诊台没有按仓库规矩把 dom 恢复口径自己数给读者看");
}

/* ---------------- fixture NEG：一份真的不含任何定位信息的 observed 集 ----------------
   行 1 = round-6 词表的定位失败（element not found）但执行器只留哨兵 `__CAND__`，observed 空串 ⇒
   桶进了 locate-label-token-lost、token 恢复为空；
   行 2 = round-7 形态的 landing-guard 行，dom 段只有说明文字带 `:absent` 后缀、没有任何类名形态的
   查找对象——严格口径不产 token；任何"从散文里抠词填四格"的宽松口径都会在这份语料上伪造出证据。
   判据**必须仍判红**（提取失灵的原始形态）。 */
const negRows = [
  { id: "FGD-NEG1", suite: "fourgrid-fixture", manifest: "fixture", page: "pages/home/index", status: "FAILED",
    failureReason: "action tap __CAND__ failed: element not found: __CAND__",
    observed: "", route: [] },
  { id: "FGD-NEG2", suite: "fourgrid-fixture", manifest: "fixture", page: "pages/home/index", status: "FAILED",
    failureReason: "落在别的页（页内守卫或路由重定向），须人判",
    observed: "top=pages/discover/index ≠ pages/home/index | dom: 类名没点名:absent (本条没点名类名) | ws-route+ws-probe",
    route: "pages/discover/index" },
];
const neg = runTriage(mkCorpus("neg", negRows), join(TMP, "triage-neg"));
ok(neg.json !== null, "C6: 分诊台对 NEG fixture 没写出 sidecar exit=" + neg.code);
if (neg.json) {
  const n2 = neg.json.items.find((it) => it.id === "FGD-NEG2");
  ok(n2 && !n2.token && n2.domAbsent !== true,
    "C6a: 纯说明文字（无类名形态）被当成了查找目标（未 scoped 的泛化）：" + JSON.stringify(n2 && { token: n2.token, domAbsent: n2.domAbsent }));
  const fourTotal = neg.json.items.filter((it) => it.verdict).length;
  const d = fourGridEmptySetVerdict({ fourCellTotal: fourTotal, buckets: neg.json.buckets, items: neg.json.items });
  /* 这条就是"负例必须能红"的载体：任何让无定位信息行凭空拿到 token 的提取口径改动，
     都会让 fourTotal>0、判红被绕过——C6a/C6b/C6c 三条会一起变红，测试不会沉默。 */
  ok(fourTotal === 0, "C6b: 无定位信息的 NEG 语料竟被恢复出 " + fourTotal + " 条查找目标（提取器在编造证据）");
  ok(d.red === true && /空集判红/.test(d.error || ""), "C6c: 四格为空且 locate 桶>0 时判据没有变红：" + JSON.stringify(d));
}

/* C7：round-7 词汇的判红通道存在（模拟"提取坏了但声称还在"）：无旧桶、仅 domAbsent ⇒ 仍 red */
const d7 = fourGridEmptySetVerdict({ fourCellTotal: 0, buckets: {}, items: [{ domAbsent: true }, { domAbsent: true }] });
ok(d7.red === true && d7.domAbsent === 2 && /空集判红/.test(d7.error || ""), "C7: round-7 observe-only 词汇下的提取失灵没有判红通道：" + JSON.stringify(d7));

/* C8：claims=0 时只准 NOT_APPLICABLE，且判据永远给不出 "PASS"（防"为了变绿放宽"的守护） */
const d8 = fourGridEmptySetVerdict({ fourCellTotal: 0, buckets: {}, items: [] });
ok(d8.red === false && d8.notApplicable === true, "C8: 真无可检被误判红：" + JSON.stringify(d8));
ok(legacyLocateBuckets({}) === 0 && domAbsentClaims([]) === 0, "C8b: 计数原语对空输入不归零");

/* C9/C10：接线检查——两个消费者不 import 调用，测试就会随"建了不接"一起红 */
const emitterSrc = readFileSync(join(HERE, "emit-round-report.mjs"), "utf8");
ok(/from "\.\/fourgrid-axis\.mjs"/.test(emitterSrc) && /fourGridEmptySetVerdict\(/.test(emitterSrc),
  "C9: 报告器没有 import 并调用 fourgrid-axis（判据成了孤儿）");
const triageSrc = readFileSync(join(HERE, "triage-exec-failures.mjs"), "utf8");
ok(/function domObserveConclusion/.test(triageSrc) && /domObserveConclusion\(obs\)/.test(triageSrc) && /tokenFrom: domRecovered \? "observe-only-dom"/.test(triageSrc),
  "C10: 分诊台定义了 dom 恢复却没接进 push（建了不接）");

console.log("FGD_POS_TRAGE exit=" + pos.code + " items=" + (pos.json ? pos.json.items.length : "无 sidecar"));
console.log("FGD_NEG_TRAGE exit=" + neg.code + " buckets=" + (neg.json ? JSON.stringify(neg.json.buckets) : "无 sidecar"));
for (const f of fails) console.log("  FGD_MISS " + f);
console.log(`FGD_SUMMARY checks=${checks} fail=${fails.length}`);
console.log(fails.length ? `FGD_TEST=FAIL ${fails.length} 条断言未过（详见 FGD_MISS 行）` : "FGD_TEST=PASS observe-only dom 结论已进四格取数、空集判红两套词汇都保得住");
process.exit(fails.length ? 1 : 0);
