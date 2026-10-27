#!/usr/bin/env node
/* 缺席断言载体的自检：7 条判据台 A 类行（H13/N10/CI22/MT21/CS26/PFI41/CH22）的
   「换成非帧载体」判点必须**既绿又会咬**。
 *
 * 为什么要专门写这个测试：这 7 条判据断言的是"某物不存在"。给这类命题写载体的时候，
 * 最省力的错法是写一条恒真的谓词（物件本来就不在，谓词当然永远成立），台账就能以
 * 「已修复（源码级判点）」的名义挂着一条永远不红的门——本轮为这类"can-never-fail checker"
 * 已经付过 3 次学费。所以这里每条判点都配命中注入：把那件不该存在的物件真塞进承载文本的
 * **内存副本**，同一条谓词、同一个取数管道重跑，必须判不成立；再摘掉阳性对照（bills 那条
 * 真配了 enablePullDownRefresh 的条目），对照判点也必须跟着红。
 * 三条硬账：
 *   1. 判据正文不许动 ⇒ 这里只读 reports/audit/round-6/ops/**（判据台本体，另一条车道在写），
 *      一个字节都不写；ops 行少了/换了形状 ⇒ 判红（载体指错了行也是被发现的一种）。
 *   2. 注入只在内存 ⇒ 测试结束时把全部承载文件的 sha256 与开测前逐一比对，
 *      不等就说明"负例"其实是把产品改了（那不再是判点，是伪造现场）。
 *   3. 退出码也要验 ⇒ 额外 spawn 一次真 CLI（--spec-extra 指向注入后的 fixture 副本），
 *      必须 exit 1 且逐条打 SHAPE_FAIL NEG-…（自测件里自己算出来的"红"不算红，
 *      要传到门的名义上才算）。
 * 用法：node scripts/qa/test-source-shape-absence.mjs
 * 标签规矩（照 scripts/qa/test-evidence-fabrication.cjs:14 的自伤记录）：说明文字里
 * 不要出现 `ABSENT_RESULT=FAIL` 原形，聚合器抓的是输出里第一个 *_TEST|RESULT=(PASS|FAIL)。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

process.env.QA_SHAPE_LIB = "1";            // 只借引擎，不在 import 时跑 CLI（那是第二台解析器的开始）
const REPO = resolve(import.meta.dirname, "..", "..");
const CARRIER = resolve(REPO, "scripts/qa/verify-source-shape.mjs");
const { SPEC, CRIT_ROWS, BANDS, bandOf, inject, runRow } = await import(pathToFileURL(CARRIER).href);

const GATE = "scripts/qa/verify-source-shape.mjs";
const FXREL = ".zcode/tmp/lane-abs7/negfix";
mkdirSync(resolve(REPO, FXREL), { recursive: true });

/* 判据台 A 类行的**定案名册**（写死是有意的棘轮：门里少一条 ⇒ 这里红；门里冒出一条没定案过的
   criteria 行 ⇒ 也一样红，必须有人把它登记进来才算数）。**新增判据行时必须同批改这张表**，
   并把下面 A1 的期望条数一起改 —— 这条断言的力气就在"名单与计数同时相等"，
   把 == 换成 >= 就等于把红藏起来。最近一次登记：LG31（round-7，36 条 CNR 里唯一 D-unclear
   的那条，去向＝源码级判点，见 reports/audit/round-7/lg31-nonframe-r10b.md）。 */
const WANT = [
  ["H13", "PAGES-HOME-INDEX.json", "pages/home/index"],
  ["N10", "PAGES-NEARBY-INDEX.json", "pages/nearby/index"],
  ["CI22", "SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json", "subpackages/circles/circles/index"],
  ["MT21", "SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json", "subpackages/discover-extra/discover/matching"],
  ["CS26", "SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json", "subpackages/chat/chat-session/index"],
  ["PFI41", "PAGES-PROFILE-INDEX.json", "pages/profile/index"],
  ["CH22", "SUBPACKAGES-CAMPUS-CAMPUS-HUB.json", "subpackages/campus/campus/hub"],
  ["LG31", "PAGES-LOGIN-INDEX.json", "pages/login/index"],
];

let cases = 0, fail = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  «" + String(detail).slice(0, 200) + "»" : ""}`); }
};

/* 承载文件的指纹（开测前 / 收测后各取一次）：注入必须只发生在内存里 */
const carrierFiles = [...new Set(SPEC.flatMap((s) => (s.files || (s.file ? [{ file: s.file }] : [])).map((t) => t.file)))];
const sha = (p) => { try { return createHash("sha256").update(readFileSync(resolve(REPO, p))).digest("hex").slice(0, 16); } catch { return "NOFILE"; } };
const before = new Map(carrierFiles.map((p) => [p, sha(p)]));

/* ── A. 接线：载体必须覆盖定案的 7 条，且指到的行确实是判据台里那条 ── */
const crit = CRIT_ROWS;
ok(crit.length === WANT.length, `A1 SPEC 里 criteria 行 == 定案名册的 ${WANT.length} 条`, `实测 ${crit.length}`);
ok(crit.length > 0, "A2 criteria 行不是空表（空表会让下面所有断言空跑）", crit.length);
for (const [cid, manifest, page] of WANT) {
  const row = crit.find((r) => r.caseId === cid);
  ok(!!row, `A3 ${cid} 在载体里有条目`);
  if (!row) continue;
  ok(row.manifest === manifest, `A4 ${cid} 指对的判据台文件`, row.manifest);
  ok(row.page === page, `A5 ${cid} 指对的页`, row.page);
  const opsPath = resolve(REPO, "reports/audit/round-6/ops", manifest);
  if (!existsSync(opsPath)) { ok(false, `A6 ${cid} 的判据台文件不在盘上`, manifest); continue; }
  const ops = JSON.parse(readFileSync(opsPath, "utf8"));
  const c = (ops.cases || []).find((x) => String(x.id) === String(cid));
  ok(!!c, `A6 ${cid} 在判据台里还在（正文被改过？载体不许指不存在的行）`);
  if (!c) continue;
  const text = [c.title, c.pre, c.action, c.expected].join(" ");
  ok(/无|不|缺失|不得|没有/.test(text), `A7 ${cid} 的判据正文确实是否定命题（缺席断言）`, text.slice(0, 60));
  ok(!!row.claim && row.claim.length > 20, `A8 ${cid} 写清了换成什么谓词（claim 非空）`, row.claim);
}

/* ── B. 正例：7 条判点在今天的盘上全部成立 ── */
for (const s of crit) {
  const bad = runRow(s);
  ok(!bad, `B ${s.caseId} 判点在盘上成立`, bad ? bad.where + " :: " + bad.why : "");
}

/* ── C. 负例：逐条命中注入，整条判点必须变红，而且必须红在被注入的那个承载上 ── */
let negCount = 0;
for (const s of crit) {
  const negs = s.neg || [];
  ok(negs.length > 0, `C1 ${s.caseId} 挂了命中注入的负例（没挂＝这条判点从没被证明会咬）`, negs.length);
  for (const ng of negs) {
    negCount++;
    const targets = s.files || [{ file: s.file }];
    if (!targets.some((t) => t.file === ng.file)) { ok(false, `C2 ${s.caseId} neg 指到了本条判点没读的承载`, ng.file); continue; }
    const raw = readFileSync(resolve(REPO, ng.file), "utf8");
    const inj = inject(raw, ng);
    if (inj.why) { ok(false, `C3 ${s.caseId} 注入落地（${basename(ng.file)}）`, inj.why); continue; }
    ok(inj.text.length !== raw.length, `C4 ${s.caseId} 注入真的改变了文本（${basename(ng.file)}）`, "字节数没变");
    const after = runRow(s, ng.file, inj.text);
    ok(!!after, `C5 ${s.caseId} 注入命中后判点变红（${basename(ng.file)}←${(inj.inserted || inj.removed || "").replace(/\n/g, "\\n").slice(0, 40)}）`, after ? "" : "整条仍然成立 ⇒ 这是一道恒绿门");
    ok(!!after && after.where === ng.file, `C6 ${s.caseId} 红来自被注入的那个承载，不是别处`, after ? after.where : "");
  }
}

/* ── D. 产物档：判据行声明了几档，就必须真读几档，且档上的承载都在盘上非空 ──
 * 旧写法在这里手抄了一张 { mock, real } 两档表，对**每条**判据都要求"每档各一个产物承载"。
 * 2026-10-24 业主裁定后 CH22 把 mock 档整项移出（那档产物早于 R2b-L05-D15，在旧件上判"禁箭头"
 * 恒真＝过期产物白送的假通过，见判据台 CH22 注释），行上 bands=["real"] 已经写明，
 * 测试却还按两档要 ⇒ 假红。判据台本体没有退化，是这张表和真相对不上了。
 * 所以改成**从行上派生**：`s.bands`（声明档）必须与 files 实读的档（由判据台导出的 bandOf 判定）
 * 逐一相等，且每个声明档至少一个承载、承载在盘上非空。
 * 两边任一边脱钩都判红：多声明一档＝"验了一档却勾两档"，实读多一档＝"勾了这档却没验"。
 * 档名→构建根的表由判据台 import（BANDS），不再在测试里抄第二份。 */
let bandPairs = 0;
for (const s of crit) {
  const declared = [...new Set(s.bands || [])].sort();
  const read = [...new Set((s.files || []).map((t) => bandOf(t.file)).filter(Boolean))].sort();
  ok(declared.length > 0, `D1 ${s.caseId} 声明了要验的产物档（没声明＝这条行的产物侧没人对账）`, declared.join(",") || "空");
  ok(declared.join(",") === read.join(","),
    `D2 ${s.caseId} 声明档＝实读档（${declared.join("+") || "空"} vs ${read.join("+") || "无产物承载"}）`,
    "多声明/漏声明都等于报告里那句「验过哪几档」是编的");
  for (const band of declared) {
    const hit = (s.files || []).map((t) => t.file).filter((f) => bandOf(f) === band);
    bandPairs++;
    ok(hit.length > 0, `D3 ${s.caseId} 的 ${band} 档有产物承载（${hit.length} 个）`, "声明了这档却一个承载都没有");
    for (const f of hit) ok(existsSync(resolve(REPO, f)) && statSync(resolve(REPO, f)).size > 0, `D4 ${s.caseId} 的 ${band} 档承载在盘上且非空`, f);
  }
}

/* ── E. 判据台行不许发台账补丁（漏一条就会把整份 cellplan 打死） ── */
{
  const ledger = readFileSync(resolve(REPO, "reports/audit/round-6/issue-matrix.md"), "utf8");
  for (const s of crit) {
    ok(!new RegExp("\\|" + s.id + "\\|").test(ledger), `E ${s.caseId} 的 id 不是台账行 ⇒ 只走 criteriaRows，不进 patches`, s.id);
  }
  const src = readFileSync(CARRIER, "utf8");
  ok(/const ledgerPass = pass\.filter\(\(r\) => !r\.criteria\)/.test(src), "E2 载体里 patches 确实按 criteria 标志排除", "排除语句没找到 ⇒ 判据台行会漏进台账补丁");
}

/* ── F. 端到端：真 CLI + 注入档必须 exit 1 且逐条打 SHAPE_FAIL NEG-（红要传到门的名义上） ── */
/* 子进程必须拿到**没有** QA_SHAPE_LIB 的 env：库模式开关一旦漏进 spawn，
   门就变成"不跑 CLI、不输出、exit 0"的哑门（本车道实测：F1-F6 全报"没打出行"就是这个）。 */
const CHILD_ENV = { ...process.env };
delete CHILD_ENV.QA_SHAPE_LIB;
/* 期望值不再抄「98 条在册判点」「不成立=0」这种数：门自己只对"不成立"打 SHAPE_FAIL 点名行，
   于是「在册不成立的 id 名单」可以从门自己的输出里取，而不是由测试假定它为空。
   本轮活树上就有 11 条台账行不成立（源码按后续裁定改过、判据台那几行字面还停在旧源码上，
   由判据台按 PARTIAL 语义记账，不归本测试），把它们抄成常数只会让本测试隔一轮再红一次。
   本测试要钉的东西一条没少，而且更强了：注入档的不成立集合 **减** 基线集合必须恰好等于注入的
   那几条 id（差集逐个对 id，不数个数）⇒ 任何一条在册判点被牵连、任何一条旧红被注入"洗绿"，
   都会当场红。 */
const runGate = (extra) => {
  const args = [GATE, "--dry"].concat(extra ? ["--spec-extra", extra] : []);
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout: 300000, env: CHILD_ENV });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const ids = [...out.matchAll(/^SHAPE_FAIL (\S+) :: /gm)].map((m) => m[1]);
  const tot = (out.match(/^SRC_SHAPE total=(\d+) 成立=(\d+) 不成立=(\d+)/m) || []).slice(1).map(Number);
  return { status: r.status, out, ids, tot };
};
{
  const rows = [];
  for (const s of crit) {
    const ng = (s.neg || [])[0];
    if (!ng) continue;
    const raw = readFileSync(resolve(REPO, ng.file), "utf8");
    const inj = inject(raw, ng);
    if (inj.why) continue;
    const fx = FXREL + "/" + s.caseId + "__e2e__" + basename(ng.file).replace(/[^\w.-]/g, "_");
    writeFileSync(resolve(REPO, fx), inj.text, "utf8");
    rows.push({
      id: "NEG-" + s.caseId, criteria: true, caseId: s.caseId, manifest: s.manifest, page: s.page,
      claim: "端到端负例注入：" + ng.file,
      files: (s.files || [{ file: s.file, checks: s.checks }]).map((t) => ({
        file: t.file === ng.file ? fx : t.file,
        checks: (t.checks || []).map((c) => ({ kind: c.kind, re: String(c.re), n: c.n })),
      })),
    });
  }
  const plan = FXREL + "/neg-spec.json";
  writeFileSync(resolve(REPO, plan), JSON.stringify({ rows }, null, 1), "utf8");
  const lines = rows.map((r) => r.id);
  /* 基线与注入档背靠背两次跑：中间不隔时间窗，"多出来的那几条"才只能是注入造成的。 */
  const clean = runGate("");
  ok(clean.status === 0, "F0 干净活树上门 exit 0（下面所有「多了几条」都拿这次读数当基线，不抄常数）",
    "exit=" + clean.status + " " + (clean.out.match(/^SRC_SHAPE_RESULT=.*$/m) || ["没打出 RESULT 行"])[0] + " 基线不成立=" + clean.ids.length);
  const gr = runGate(plan);
  const hitLines = lines.filter((id) => new RegExp("^SHAPE_FAIL " + id + " :: " + FXREL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "m").test(gr.out));
  ok(gr.status === 1, "F1 注入档跑真门 ⇒ exit 1（不是 0、不是 2）", "exit=" + gr.status);
  ok(/SRC_SHAPE_RESULT=FAIL reason=判据台缺席判点不成立/.test(gr.out), "F2 红是从「判据台缺席判点不成立」这条分支出来的", (gr.out.match(/^SRC_SHAPE_RESULT=.*$/m) || ["没打出 RESULT 行"])[0]);
  ok(hitLines.length === lines.length, "F3 每条判据的注入都在真门里各红了一次（红点还在被注入的 fixture 上）", hitLines.length + "/" + lines.length + "；" + (gr.out.match(/^SHAPE_FAIL NEG-.*$/gm) || []).slice(0, 2).join(" | "));
  const grew = gr.ids.filter((id) => !clean.ids.includes(id));
  ok(grew.length === lines.length && lines.every((id) => grew.includes(id)), "F4 注入档比基线**只**多了注入的那几条（差集逐个对 id，不数个数）", "多出 " + grew.length + "/" + lines.length + " 条：" + grew.slice(0, 3).join(" ") + "；基线 " + clean.ids.length + " 条");
  const gone = clean.ids.filter((id) => !gr.ids.includes(id));
  ok(gone.length === 0, "F5 基线里在册不成立的判点一条都没被注入洗绿（差集只许增不许减）", gone.join(" ") || "");
  ok(gr.tot.length === 3 && gr.tot[1] + gr.tot[2] === gr.tot[0] && gr.tot[0] === clean.tot[0] + lines.length,
    "F6 守恒成立，且条目数只多了注入的 " + lines.length + " 条", "total/成立/不成立=" + gr.tot.join("/") + "（基线 " + clean.tot.join("/") + "）");
  const after = runGate("");
  ok(after.status === 0 && after.ids.join(",") === clean.ids.join(","), "F7 撤掉注入档后回绿，且不成立名单与基线逐条相同（同一扇门、同一个命令）",
    "exit=" + after.status + " " + (after.out.match(/^SRC_SHAPE_RESULT=.*$/m) || [""])[0]);
  ok(/^SRC_SHAPE_NEG 注入点=\d+ 已变红=\d+ 咬不动=0 没挂负例的判据行=0$/m.test(after.out), "F8 门自己也在每次跑里复查负例（咬不动=0 且没挂=0）", (after.out.match(/^SRC_SHAPE_NEG.*$/m) || ["没打出 NEG 行"])[0]);
}

/* ── G. 注入没有写坏产品（这是本测试自己的纪律，不是信任问题） ── */
let drift = 0;
for (const [p, h] of before) { const now = sha(p); if (now !== h) { drift++; console.log("  DRIFT " + p + " " + h + "→" + now); } }
ok(drift === 0, "G 全部 " + carrierFiles.length + " 个承载文件 sha256 未变（注入只在内存）", drift + " 个文件被改动了");

console.log(`ABSENT_SUMMARY cases=${cases} fail=${fail} 判据行=${crit.length} 注入点=${negCount} 承载文件=${carrierFiles.length} 产物档对=${bandPairs}`);
console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(`ABSENT_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);
