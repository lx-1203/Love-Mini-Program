#!/usr/bin/env node
/* ①/⑤ 的证据缺口（"要求出帧但帧没成立"）不能靠重判洗掉，也不能只起个名字就算数。
   本脚本把每一洞换成一件可重跑的断言：源码结构上能判的就当场判，
   只有运行时才判得了的（重复进出后页面栈是否累积）就单跑一次运行时探针。
   模式：
     缺省 judge    —— 离线：跑源码断言 + 读已量的运行时结果，出三态（DECIDED / BOOKED / *_FAIL）
     --mode measure —— 拿 UI 租约量运行时探针，写 runtime-holes-measured.json
     --selftest    —— 把每条判据各破坏一次，要求条条能红（红不了的负例等于没测）
   Node 要 v22：PATH 上的缺省 node 是 DevTools 的 v16。 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { acquireUi, releaseUi, renewUi, heldLeases } from "./ui-lease.mjs";
import { openPage, routeStack } from "./cli-automator.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const MODE = arg("mode", "judge");
const SELFTEST = process.argv.includes("--selftest");
/* 洞散落在多把身份刀上（DC33 在游客刀、REG29/REG36 在 A 刀），所以triage 是多份、取并集；
   只读一份会造成「载体里有洞、点名表里没有」这种假脱钩。 */
const TRIAGES = (arg("triage", ".zcode/tmp/triage-r7-areal.json,.zcode/tmp/triage-r7-guest.json")).split(",").map((s) => s.trim()).filter(Boolean).map((s) => resolve(REPO, s));
const MEASURED = resolve(REPO, arg("measured", "reports/audit/round-7/runtime-holes-measured.json"));
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/evidence-holes-verdict.json"));
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin-real"));
const OWNER = "r7-evidence-holes";
const sleep = (ms) => { const e = Date.now() + ms; while (Date.now() < e) { /* 探针是同步 execFileSync，这里不需要事件循环 */ } };
const strip = (s) => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const src = (p) => strip(readFileSync(resolve(REPO, p), "utf8"));
const hitsOf = (file, re) => (src(file).match(new RegExp(re.source, "g")) || []).length;

/* 每一洞：来自哪次执行、判它的那件东西是什么。断言一律指到盘上真存在的写法。 */
const HOLES = [
  {
    hole: "DC33", page: "pages/discover/index",
    from: "round-7 游客刀 real 档（帧只有 2958B，按契约不当证据）",
    claim: "离开本页时 store 被显式回收（onUnload → discoverStore.dispose），且重复进出 3 次后页面栈不累积",
    checks: [{ file: "apps/client/src/pages/discover/index.vue", re: /onUnload\(\(\)\s*=>\s*\{[\s\S]{0,60}discoverStore\.dispose\(\);/, want: ">=1" }],
    runtime: { key: "stackAfter3Cycles", expect: 1 },
  },
  {
    hole: "REG29", page: "pages/register/index",
    from: "round-7 A 刀 real 档（simulator_screenshot 调用失败，帧未写出）",
    claim: "注册提交无论失败走哪条分支，最终都在 finally 里复位 submitting ⇒ 不残留 loading；错误分支集中交给 handleRegisterError",
    checks: [
      { file: "apps/client/src/pages/register/index.vue", re: /\}\s*finally\s*\{[\s\S]{0,80}submitting\.value = false;/, want: ">=1" },
      { file: "apps/client/src/pages/register/index.vue", re: /\} catch \(error\) \{[\s\S]{0,60}handleRegisterError\(error\);/, want: ">=1" },
    ],
  },
  {
    hole: "REG36", page: "pages/register/index",
    from: "round-7 A 刀 real 档（同上，帧未写出）",
    claim: "注册页不消费任何 onLoad/query ⇒ 「幽灵参数不生效」的对照面是零读取，而不是某一帧像素",
    checks: [{ file: "apps/client/src/pages/register/index.vue", re: /\bonLoad\s*\(/, want: "==0" }],
  },
];

function checkVerdict(c) {
  const n = hitsOf(c.file, c.re);
  const ok = c.want === ">=1" ? n >= 1 : c.want === "==0" ? n === 0 : false;
  return { ok, n, msg: `${c.file} :: ${c.re.source.slice(0, 46)} 命中 ${n}（要求 ${c.want}）` };
}

function judgeHoles(overrides = {}) {
  const measured = existsSync(MEASURED) ? JSON.parse(readFileSync(MEASURED, "utf8")) : null;
  return HOLES.map((h, i) => {
    const miss = [];
    for (const c of h.checks) {
      const v = checkVerdict(overrides[h.hole] ? { ...c, re: overrides[h.hole] } : c);
      if (!v.ok) miss.push(v.msg);
    }
    let runtime = null;
    if (h.runtime) {
      const row = measured && measured.rows ? measured.rows.find((r) => r.hole === h.hole) : null;
      if (!row) runtime = "PROBE_NOT_RUN";
      else if (row[h.runtime.key] !== h.runtime.expect) runtime = `PROBE_FAIL(${h.runtime.key}=${row[h.runtime.key]}，期望 ${h.runtime.expect})`;
      else runtime = "PROBE_OK";
    }
    const status = miss.length ? "SOURCE_FAIL" : runtime === "PROBE_NOT_RUN" ? "BOOKED" : runtime && runtime !== "PROBE_OK" ? runtime : "DECIDED";
    return { hole: h.hole, page: h.page, from: h.from, claim: h.claim, status, sourceMisses: miss, runtime };
  });
}

function measure() {
  const h = HOLES.find((x) => x.runtime);
  acquireUi({ owner: OWNER, batch: "R7" });
  try {
    const cycles = [];
    for (let i = 0; i < 3; i++) {
      renewUi({ owner: OWNER, batch: "R7" });
      openPage("/" + h.page, "", { project: PROJECT });
      sleep(1500);
      const inStack = String(routeStack({ project: PROJECT }) || "");
      openPage("/pages/home/index", "", { project: PROJECT });
      sleep(1200);
      cycles.push({ cycle: i + 1, in: inStack, out: String(routeStack({ project: PROJECT }) || "") });
    }
    const finalStack = String(routeStack({ project: PROJECT }) || "");
    const top = finalStack.split("|").filter(Boolean);
    const row = {
      hole: h.hole, page: h.page, cycles,
      stackAfter3Cycles: top.length,
      discoverInStack: top.filter((r) => r.includes("discover")).length,
      measuredAt: new Date().toISOString(),
    };
    writeFileSync(MEASURED, JSON.stringify({ mode: "measure", generatedAt: row.measuredAt, project: arg("project"), rows: [row] }, null, 1));
    console.log(`RUNTIME_HOLES DC33 进出 3 次后栈长=${row.stackAfter3Cycles} 目标页残留=${row.discoverInStack} → ${MEASURED}`);
  } finally {
    try { releaseUi({ owner: OWNER }); } catch (e) { /* 退出路径上的释放失败不改判决 */ }
  }
}

if (MODE === "measure") {
  if (heldLeases({ excludeOwner: OWNER }).length) { console.log("EVIDENCE_HOLES=BLOCKED reason=UI 租约被占（等前一腿收尾）"); process.exit(3); }
  measure();
  process.exit(0);
}

if (SELFTEST) {
  /* 每条判据各破坏一次。判据是"命中数不符合要求"，所以破坏方式不同：
     存在性判据换成盘上没有的写法；零命中判据换成盘上必然存在的东西。 */
  const negs = [
    ["DC33 的 onUnload 断言换成盘上不存在的写法 ⇒ 必须判不过", (() => { const r = checkVerdict({ file: "apps/client/src/pages/discover/index.vue", re: /onUnload\(\(\)\s*=>\s*\{\s*NOT_A_THING\(\);/, want: ">=1" }); return !r.ok; })()],
    ["REG36 的零命中断言换成必然存在的东西 ⇒ 必须判不过", (() => { const r = checkVerdict({ file: "apps/client/src/pages/register/index.vue", re: /const submitting = ref\(false\);/, want: "==0" }); return !r.ok; })()],
    ["整表在破坏性覆盖下必须出现 SOURCE_FAIL", judgeHoles({ REG29: /NOT_A_THING_AT_ALL_/ }).some((v) => v.status === "SOURCE_FAIL")],
    ["未被破坏的其余洞不能被覆盖误伤", judgeHoles({ REG29: /NOT_A_THING_AT_ALL_/ }).filter((v) => v.hole !== "REG29").every((v) => v.status !== "SOURCE_FAIL")],
  ];
  let nf = 0;
  for (const [n, ok] of negs) { console.log((ok ? "  ok   NEG " : "  ✗    NEG ") + n); if (!ok) nf++; }
  console.log(`EVIDENCE_HOLES_SELFTEST=${nf ? "FAIL" : "PASS"} 破坏样本=${negs.length} 没红=${nf}`);
  if (nf) process.exit(2);
}

const verdict = judgeHoles();
const triLists = TRIAGES.filter(existsSync).map((f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { return null; } }).filter(Boolean);
if (!triLists.length) { console.log("EVIDENCE_HOLES=FAIL reason=读不到任何 triage 语料（没有点名清单就等于门禁空转）：" + TRIAGES.join(",")); process.exit(2); }
const triHoles = [...new Set(triLists.flatMap((t) => (t.evidenceHoles || []).map((s) => String(s).split(" @ ")[0])))];
const problems = [];
const known = new Set(verdict.map((v) => v.hole));
for (const h of triHoles) if (!known.has(h)) problems.push(`triage 点名了洞 ${h}，本表没有判它的断言 ⇒ 新增洞必须当场配载体`);
for (const h of known) if (!triHoles.includes(h)) problems.push(`本表里的洞 ${h} 不在 triage 点名清单里（载体与事实脱钩，要么洞已消失要么读错语料）`);
if (verdict.length !== HOLES.length) problems.push(`守恒破：判决 ${verdict.length} ≠ 洞数 ${HOLES.length}`);
for (const v of verdict) if (v.status !== "DECIDED") problems.push(`${v.hole} 未判定（${v.status}）：${[...v.sourceMisses, v.runtime || ""].filter(Boolean).join("；")}`);

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), holes: verdict.length, decided: verdict.filter((v) => v.status === "DECIDED").length, triageHoles: triHoles, rows: verdict }, null, 1));
console.log(`EVIDENCE_HOLES 洞=${verdict.length} 已判定=${verdict.filter((v) => v.status === "DECIDED").length} triage点名=${triHoles.join(",") || "(无)"}`);
for (const v of verdict) console.log(`  ${v.status.padEnd(12)} ${v.hole} @ ${v.page} :: ${v.claim}`);
if (problems.length) {
  console.log(`EVIDENCE_HOLES_RESULT=FAIL problems=${problems.length}`);
  for (const p of problems) console.log("  ✗ " + p);
  process.exit(2);
}
console.log("EVIDENCE_HOLES_RESULT=PASS 每个洞都有可重跑判据，无一靠重判结案");
