#!/usr/bin/env node
/**
 * verify-state-truth.mjs 的 failures[] 窗口核对回归。
 * 存在的理由：首版把「按 suite 的行数-条目数」当账不平检测器写，那是个恒等式（每个 suite
 * 必然收敛到条目数本身），实测残差恒为 0 —— 一个永远不会响的门禁比没有门禁更糟。
 * 本测试逐条驱动 MISSING / DUP / STALE / ORPHAN / 上限 NOTE / 权威件断链 六个分支，
 * 并含一个「全对也必须 PASS」的反向对照，防止改成"无条件判红"。
 * 用法：node scripts/qa/test-state-truth-ck-window.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const GATE = path.join(REPO, "scripts", "qa", "verify-state-truth.mjs");
const TMP = path.join(REPO, ".zcode", "tmp", "state-truth-fixture");
const SHA = "FIXTURESHA1";

let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : " :: " + detail}`);
  if (!cond) failures++;
}

/** 写一份自洽的四源产物；spread 一律做成 0，让断言只反映新分支。 */
function build(dir, opts) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "ops"), { recursive: true });
  fs.mkdirSync(path.join(dir, "interact"), { recursive: true });
  const n = opts.n;
  const ids = Array.from({ length: n }, (_, i) => `A${String(i + 1).padStart(3, "0")}`);
  fs.writeFileSync(path.join(dir, "ops", "m1.json"), JSON.stringify({ manifest: "M1", cases: ids.map((id) => ({ id })) }));

  const rows = ids.map((id) => ({
    suite: "S1", manifest: "M1", id, page: "p", tier: "P1", requiresReal: false,
    title: "t-" + id,
    status: opts.failedIds.has(id) ? "FAILED" : "EXECUTED",
    failureReason: opts.blankReason && opts.failedIds.has(id) ? "" : "boom",
    observed: opts.blankReason && opts.failedIds.has(id) ? "" : "saw boom",
    route: null, toast: [], console: [], evidence: [],
  }));
  const resultsFile = path.join(dir, "interact", "exec-results.json");
  fs.writeFileSync(resultsFile, JSON.stringify({ round: "FIX", gitSha: SHA, results: rows }, null, 1));

  const entries = opts.entryIds.map((id) => ({ at: "x", suite: opts.ckSuiteName || "S1", manifest: "M1", id, page: "p", reason: "boom" }));
  if (opts.extraOrphanId) entries.push({ at: "x", suite: opts.ckSuiteName || "S1", manifest: "M1", id: opts.extraOrphanId, page: "p", reason: "ghost" });
  const ckptFile = path.join(dir, "ckpt.json");
  /* ckExecuted 默认等于权威行数 = "全轮计数器"；显式传小值就是在模拟
     "复跑窗口把同一份检查点覆盖成局部数"（round-6 的 T4 实际发生的事）。 */
  const ckExec = opts.ckExecuted === undefined ? n : opts.ckExecuted;
  fs.writeFileSync(ckptFile, JSON.stringify({
    round: "FIX", gitSha: SHA,
    suites: { [opts.ckSuiteName || "S1"]: { status: "completed", executed: ckExec, failed: rows.filter((r) => r.status === "FAILED").length, executedCaseIds: ids } },
    failures: entries,
  }, null, 1));
  return { resultsFile, ckptFile };
}

function run(dir, paths) {
  const out = execFileSync(process.execPath, [GATE, dir, "--results", paths.resultsFile, "--ckpt", paths.ckptFile, "--snap", path.join(dir, "no-snap.json")], {
    encoding: "utf8", cwd: REPO, timeout: 60000,
  });
  return out;
}
function grab(out, key) { const m = out.match(new RegExp(key + "=(\\d+)")); return m ? Number(m[1]) : null; }

const all = (arr) => new Set(arr);

// ---- 1) 反向对照：窗口与权威件完全一致，必须全 0 且 PASS ----
{
  const dir = path.join(TMP, "clean");
  const ids = ["A001", "A002"];
  const p = build(dir, { n: 2, failedIds: all(ids), entryIds: ids });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("clean: 六个计数全 0", ["STATE_CK_MISSING", "STATE_CK_DUP_PUSH", "STATE_CK_STALE", "STATE_CK_ORPHAN", "STATE_AUTHORITATIVE_REASON_MISSING"].every((k) => grab(out, k) === 0),
    out.split("\n").filter((l) => l.startsWith("STATE_")).join(" | "));
  check("clean: 判绿", /STATE_RESULT=PASS/.test(out), out);
}

// ---- 2) ORPHAN：条目指向权威件里不存在的用例 ----
{
  const dir = path.join(TMP, "orphan");
  const p = build(dir, { n: 3, failedIds: all(["A001"]), entryIds: ["A001"], extraOrphanId: "A999" });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("orphan: STATE_CK_ORPHAN=1", grab(out, "STATE_CK_ORPHAN") === 1, out);
  check("orphan: STATE_FAIL_4 触发", /STATE_FAIL_4/.test(out), out);
}

// ---- 3) MISSING：权威 FAILED 行在窗口里没有条目（D21 前 attempt / splice 丢弃的形状） ----
{
  const dir = path.join(TMP, "missing");
  const p = build(dir, { n: 3, failedIds: all(["A001", "A002", "A003"]), entryIds: ["A001"] });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("missing: STATE_CK_MISSING=2", grab(out, "STATE_CK_MISSING") === 2, out);
  check("missing: 只报数不判红（窗口本就是视图）", /STATE_FAIL_4|STATE_FAIL_5/.test(out) === false, out);
}

// ---- 4) DUP + STALE：同一用例被 push 两次；条目指向的用例已不是 FAILED ----
{
  const dir = path.join(TMP, "dupstale");
  const p = build(dir, { n: 4, failedIds: all(["A001", "A002"]), entryIds: ["A001", "A001", "A003"] });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("dupstale: STATE_CK_DUP_PUSH=1", grab(out, "STATE_CK_DUP_PUSH") === 1, out);
  check("dupstale: STATE_CK_STALE=1（A003 已非 FAILED；A001 去重后算 1 条）", grab(out, "STATE_CK_STALE") === 1, out);
  check("dupstale: MISSING=1（A002 无条目）", grab(out, "STATE_CK_MISSING") === 1, out);
}

// ---- 5) 权威件断链：FAILED 行既无 failureReason 也无 observed ----
{
  const dir = path.join(TMP, "blankreason");
  const p = build(dir, { n: 2, failedIds: all(["A001"]), entryIds: ["A001"], blankReason: true });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("blankreason: STATE_AUTHORITATIVE_REASON_MISSING=1", grab(out, "STATE_AUTHORITATIVE_REASON_MISSING") === 1, out);
  check("blankreason: STATE_FAIL_5 触发", /STATE_FAIL_5/.test(out), out);
}

// ---- 6) 滚动上限：entries 正好 300 时必须提醒"只能当下界读" ----
{
  const dir = path.join(TMP, "capped");
  const n = 320;
  const ids = Array.from({ length: n }, (_, i) => `A${String(i + 1).padStart(3, "0")}`);
  const p = build(dir, { n, failedIds: all(ids), entryIds: ids.slice(0, 300) });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("capped: STATE_CK_ENTRIES=300", grab(out, "STATE_CK_ENTRIES") === 300, out.slice(0, 400));
  check("capped: MISSING=20（下界口径成立）", grab(out, "STATE_CK_MISSING") === 20, out);
  check("capped: 上限 NOTE 打出", /STATE_NOTE=failures\[\] 正好等于写入端上限 300/.test(out), out);
}

// ---- 7) 窗口覆盖（T4 复跑把全轮计数器覆盖成局部数）：排除全局极差，但必须做包含核对 ----
{
  // 7a 干净的窗口：可以小，不可以大 → 判绿，且必须点名它是窗口
  const dir = path.join(TMP, "window-ok");
  const p = build(dir, { n: 4, failedIds: all(["A001", "A002"]), entryIds: ["A001"], ckExecuted: 2 });
  let out = "";
  try { out = run(dir, p); } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  check("window-ok: 判为 subset-window", /STATE_CK_SCOPE=subset-window/.test(out), out.split("\n").filter((l) => /STATE_CK_SCOPE|STATE_RESULT/.test(l)).join(" | "));
  check("window-ok: suite 键 1/1 对得上", /STATE_CK_SUITES_MATCHED=1\/1/.test(out), out);
  check("window-ok: 用例数极差 0（窗口没被拉进比较）", grab(out, "STATE_CASE_SPREAD") === 0, out);
  check("window-ok: 判绿", /STATE_RESULT=PASS/.test(out), out);

  // 7b 窗口报得比权威件还大 = 真漂移，必须红
  const dir2 = path.join(TMP, "window-over");
  const p2 = build(dir2, { n: 2, failedIds: all(["A001"]), entryIds: ["A001"], ckExecuted: 5 });
  let out2 = "";
  try { out2 = run(dir2, p2); } catch (e) { out2 = String(e.stdout || "") + String(e.stderr || ""); }
  check("window-over: STATE_FAIL_1C 触发", /STATE_FAIL_1C/.test(out2), out2.split("\n").filter((l) => /STATE_FAIL|STATE_RESULT/.test(l)).join(" | "));
  check("window-over: 点名是哪套超了多少", /S1：ckpt executed=5 > 权威行数 2/.test(out2), out2.match(/STATE_FAIL_1C[^\n]*/)?.[0] || "(1C 未打印)");
  check("window-over: 笼统极差 FAIL_1 也一并响（两个方向不互斥）", /STATE_FAIL_1 /.test(out2), out2.split("\n").filter((l) => /STATE_FAIL_1\b/.test(l)).join(" | "));
  check("window-over: 判红", /STATE_RESULT=FAIL/.test(out2), out2);

  // 7c 窗口 suite 键与权威件对不上 = 包含核对扫描集为空，不得当作通过
  const dir3 = path.join(TMP, "window-keymismatch");
  const p3 = build(dir3, { n: 2, failedIds: all(["A001"]), entryIds: ["A001"], ckExecuted: 1, ckSuiteName: "Z9" });
  let out3 = "";
  try { out3 = run(dir3, p3); } catch (e) { out3 = String(e.stdout || "") + String(e.stderr || ""); }
  check("window-keymismatch: MATCHED=0/1", /STATE_CK_SUITES_MATCHED=0\/1/.test(out3), out3);
  check("window-keymismatch: STATE_FAIL_1B 触发（空扫描集不许绿）", /STATE_FAIL_1B/.test(out3), out3);
}

console.log(`\nSUMMARY: assertion failures = ${failures}`);
process.exit(failures ? 1 : 0);
