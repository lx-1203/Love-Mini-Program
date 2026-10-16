#!/usr/bin/env node
/**
 * apply-coverage-revalidation.mjs
 * ---------------------------------------------------------------------------
 * 目的：把用户授予的那句权限「重跑落第一条有效判过读数时由我写」做成一个**失败即闭**的工具。
 * 它只在“重跑真的落了一条有效、判过（非 SKIPPED、非旧档位戳、会话可证）的读数”时，
 * 往判决效力台账的那一行盖 `coverageEffect:"revalidated"`。任何量不到的情形一律拒，不猜。
 *
 * 与消费者共享判点（这是本工具唯一的存在意义）：
 *   权威消费者 = scripts/qa/verify-real-coverage.mjs。它对 VOIDED 桶的判决效力只读 `--ledger`
 *   那本 **JSON 台账**（缺省 reports/audit/ui-audit-2026-10-09/tour-ledger.json），经 buildVoidBook
 *   （:485-527）/ applyVoidBook（:530-547）判 `state = coverageEffect==="revalidated" ? revalidated : disputed`
 *   （:509，DECL_REVALIDATED=:477）。该门**从不读 reports/audit/round-6/issue-matrix.md**
 *   （issue-matrix.md 只被 scripts/qa/verify-ledger.mjs 按 11 列形状核对：DATA_ROWS / OFF_SCHEMA_ROWS）。
 *   ⇒ 把 revalidated 写进 issue-matrix.md 对本门**一个读数都不动**（正撞“写入器不共享消费者判点就会造出
 *     一行仍然领不到钱的假账”那条错）。所以本工具写的是消费者真正读的那本 JSON 台账，且**绝不编辑 issue-matrix.md**、
 *     绝不改写任何行的 status/prose（待修复/未取证 不改成 已修复；覆盖记账 ≠ 宣告修复，两件事分开）。
 *
 * 认领一条“有效判过读数”的五条判点（逐条与消费者同源，file:line 见 .zcode/tmp/revalidate-lane-report.md）：
 *   ① exec-* 目录含 exec-results.json          —— verify-real-coverage.mjs:161-162（execRows）
 *   ② key 命中 ops requiresReal 判据集           —— :126-155（requiredCases，c.requiresReal===true :133）+ :320/:269
 *   ③ band=real@<sha8> 等于当前构建尺（现算）    —— :181 REAL_BAND + :244-255/:251（readApiMode=artifact-band.mjs:22）+ :259-264 rowFreshness + :284-303 applyExpiry
 *   ④ 行是判过而非 SKIPPED                       —— :180 JUDGED=/^(EXECUTED|FAILED|PASS)$/（:333/:270 用）
 *   ⑤ 身份/会话一致（标签与证据不矛盾）+ 落在该判据要求的身份轴 —— :197-215 sessionVerdict（:336 contradict 撤认领）+ :225-229 axesOf + :383-384
 *
 * 用法：
 *   node scripts/qa/apply-coverage-revalidation.mjs \
 *     --key <manifest|id> [--key <manifest|id> ...] \
 *     --exec <exec-目录名（相对 --dir）或含 exec-results.json 的路径> \
 *     [--dir reports/audit/round-7] [--ops reports/audit/round-6/ops] \
 *     [--ledger reports/audit/ui-audit-2026-10-09/tour-ledger.json] \
 *     [--real-bundle apps/client/dist/build/mp-weixin-real] \
 *     [--dry | --apply] [--attest "<重跑落的第一条有效判过读数的出处/理由>"]
 *   缺省 = --dry（打印将改写的单元格与逐条证据，不落盘）。档位戳一律由 --real-bundle 现算，不接受手填。
 *
 * 输出：机读结果行 `REVALIDATE_RESULT=OK|REFUSED ...` + 每键一行点名证据（exec 文件、行号、band、判过状态）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { readApiMode } from "./artifact-band.mjs"; // 与消费者同一把尺：sha8 = 在盘 config/env.js 字节的 sha256 前 8 位

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] && !String(argv[i + 1]).startsWith("--") ? argv[i + 1] : d; };
const allArg = (k) => { const out = []; for (let i = 0; i < argv.length; i++) if (argv[i] === "--" + k && argv[i + 1]) out.push(argv[i + 1]); return out; };
const APPLY = argv.includes("--apply");
// ---- 输入 ----
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const DIR = resolve(REPO, arg("dir", "reports/audit/round-7"));
// 判决效力台账 = 消费者 --ledger 真正读的那本 JSON（不是 issue-matrix.md）。
const LEDGER_ARG = arg("ledger", "reports/audit/ui-audit-2026-10-09/tour-ledger.json");
const LEDGER = resolve(REPO, LEDGER_ARG);
const REAL_BUNDLE = resolve(REPO, arg("real-bundle", "apps/client/dist/build/mp-weixin-real"));
const ATTEST = arg("attest", "");
const RAW_KEYS = allArg("key").flatMap((s) => String(s).split(",")).map((s) => s.trim()).filter(Boolean);

// ---- 与消费者逐字同源的判点常量 ----
const JUDGED = /^(EXECUTED|FAILED|PASS)$/;      // verify-real-coverage.mjs:180
const REAL_BAND = /^real(@|$)/;                  // :181
const LOGIN_IDS = ["A", "B", "minor"];           // :194（minor 亦登录轴，见 :225-229 axesOf 与注释）
const GUEST_IDS = ["guest", "not-logged-in"];    // :195
const DECL_REVALIDATED = "revalidated";          // :477
const VOID_WORDS = ["未有效判决", "未有效测试", "出列", "作废", "重跑", "回写", "维持 UNCOVERED"]; // :455-463 消费者自己的判词词表
const NEEDSUSER_RE = /needsUser\s+([A-Za-z0-9][A-Za-z0-9._-]*)/g; // :453

const problems = [];   // 硬失败（任一 ⇒ 整体拒绝，绝不落盘）
const blockNotes = []; // “量到证据但判决效力仍被台账自己挂着的未决断挡住” ⇒ 不判合格（除非 --attest）
const perKey = [];     // 逐键点名

function fail(key, reason) { problems.push(`[${key || "GLOBAL"}] ${reason}`); }

function maskSecret(v) { // 绝不印凭据值；按长度脱敏
  const s = String(v == null ? "" : v);
  return s.length ? `‹masked len=${s.length}›` : "";
}

// 判据②：ops requiresReal 判据集（造 key 与消费者一致：manifest=j.suite||文件名去后缀, id=c.id）
function requiredCases() {
  const map = new Map();
  if (!existsSync(OPS)) { fail("OPS", `判据台目录不存在 ${OPS}`); return map; }
  for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { continue; }
    const manifest = j.suite || f.replace(/\.json$/, "");
    for (const c of (j.cases || j.items || [])) {
      if (c && c.requiresReal === true) {
        map.set(manifest + "|" + String(c.id || ""), { manifest, id: String(c.id || ""), identities: Array.isArray(c.identities) ? c.identities.map(String) : [], automatable: c.automatable, title: String(c.title || "") });
      }
    }
  }
  return map;
}

// 判据③：当前尺（现算，不接受手填）
function currentStamp() {
  try {
    const band = readApiMode(REAL_BUNDLE);
    if (band && band.sha8) return { sha8: String(band.sha8).toLowerCase(), raw: (band.mode || "?") + "@" + band.sha8, source: "bundle:" + REAL_BUNDLE.replace(REPO + "/", "") };
  } catch { /* 读不到 ⇒ UNMEASURABLE ⇒ 拒绝 */ }
  return { sha8: null, raw: "", source: "unmeasurable" };
}
function rowRealSha8(band) { const m = String(band || "").match(/^real@([0-9a-fA-F]{6,})/); return m ? m[1].toLowerCase() : null; } // :257
// 判据⑤：会话对账（与消费者 sessionVerdict :197-215 同一判点）
function sessionVerdict(r) {
  const src = String(r.sessionSource || "").trim();
  const ver = String(r.loginVerify || "").trim();
  const login = ["A", "B"].includes(r.identity);
  const guest = GUEST_IDS.slice(0, 2).includes(r.identity); // guest / not-logged-in
  if (!login && !guest) return "unproven";
  if (!src && !ver) return "unproven";
  const phoneMint = src === "phone-login";
  const guestMint = src === "guest-login" || src === "cleared";
  const logged = /^logged-in\b/.test(ver);
  const notLogged = /^not-logged-in\b/.test(ver);
  if (!src || !ver) return "unproven";
  if (!(phoneMint || guestMint)) return "unproven";
  if (login) return phoneMint && logged ? "proven" : "contradict";
  return guestMint && (notLogged || logged) ? "proven" : "contradict";
}
function axesOf(identities) { // :225-229
  const ids = (identities || []).map(String).filter(Boolean);
  if (!ids.length) return { login: true, guest: true };
  return { login: ids.some((x) => x === "A" || x === "B" || x === "minor"), guest: ids.some((x) => x === "guest" || x === "none") };
}

// 判决效力台账（JSON）：取点名到该用例 id 的所有行 + 当前判词/needsUser/是否引用了 exec
function ledgerAdjudication(caseId) {
  if (!existsSync(LEDGER)) { fail("LEDGER", `判决效力台账不存在 ${LEDGER_ARG} ⇒ 无法核对判决效力（“读不到”≠“没有作废”）`); return null; }
  let j; try { j = JSON.parse(readFileSync(LEDGER, "utf8")); } catch (e) { fail("LEDGER", `台账不是可读 JSON：${String(e.message).slice(0, 50)}`); return null; }
  const sects = [["corrections", j.corrections], ["fixlane", j.fixlane]];
  const rows = []; let maxSect = -1;
  sects.forEach(([name, arr], si) => {
    for (const r of (Array.isArray(arr) ? arr : [])) {
      const text = [r.id, r.applied, r.result, r.ledgerEffect, r.open, r.evidence, r.run].filter((x) => typeof x === "string").join(" "); // :480-482 ledgerRowText
      const declared = [].concat(r.cases || [], r.case ? [r.case] : []).map(String);
      const token = new RegExp("\\b" + caseId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      if (declared.includes(caseId) || token.test(text)) { rows.push({ sect: name, id: String(r.id || ""), text, coverageEffect: r.coverageEffect }); if (si > maxSect) maxSect = si; }
    }
  });
  if (!rows.length) return { exists: false };
  const needsUser = [...new Set(rows.flatMap((r) => [...r.text.matchAll(NEEDSUSER_RE)].map((m) => m[1])))];
  const voidWords = [...new Set(VOID_WORDS.filter((w) => rows.some((r) => r.text.includes(w))))];
  const alreadyRevalidated = rows.some((r) => r.coverageEffect === DECL_REVALIDATED);
  return { exists: true, rows, needsUser, voidWords, alreadyRevalidated, targetSection: maxSect === 1 ? "fixlane" : "corrections" };
}

// ---- 主流程 ----
if (!RAW_KEYS.length) fail("ARGS", "至少给一条 --key <manifest|id>");
if (!arg("exec", "")) fail("ARGS", "必须给 --exec <重跑产出的 exec 目录/含 exec-results.json 的路径>");
const req = requiredCases();
const cur = currentStamp();
if (!cur.sha8) fail("BAND", `当前尺取不到（${REAL_BUNDLE.replace(REPO + "/", "")} 的 config/env.js 读不到/无 sha8）⇒ UNMEASURABLE，宁可不判，绝不编一个比较`);

let exec = null;
const EXEC_ARG = arg("exec", "");
if (EXEC_ARG) {
  const p = isAbsolute(EXEC_ARG) ? EXEC_ARG : (existsSync(join(EXEC_ARG, "exec-results.json")) ? EXEC_ARG : join(DIR, EXEC_ARG));
  const json = join(p, "exec-results.json");
  if (!existsSync(json)) fail("EXEC", `exec 目录缺 exec-results.json：${p}`);
  else {
    try { exec = { dir: p.replace(REPO + "/", "").replace(/\\/g, "/"), file: json, results: JSON.parse(readFileSync(json, "utf8")).results || [] }; }
    catch (e) { fail("EXEC", `exec-results.json 解析失败：${String(e.message).slice(0, 50)}`); }
  }
}

for (const key of RAW_KEYS) {
  const rec = req.get(key);
  const ev = { key, verdict: "REFUSED", lines: [] };
  if (!rec) { ev.why = "key 不在 ops requiresReal 判据集（判据②）⇒ 无处落地"; perKey.push(ev); fail(key, ev.why); continue; }
  if (rec.automatable === false) { ev.why = "判据声明 automatable=false（执行通道免检）⇒ 本就不该有认领腿，谈不上重判过"; perKey.push(ev); fail(key, ev.why); continue; }
  if (!exec) { ev.why = "无可用 exec 证据件（判据①）"; perKey.push(ev); fail(key, ev.why); continue; }

  const mi = key.indexOf("|"); const caseId = mi < 0 ? key : key.slice(mi + 1);
  const rowsIdx = [];
  exec.results.forEach((r, i) => { if ((r.manifest + "|" + String(r.id || "")) === key) rowsIdx.push(i); });
  if (!rowsIdx.length) { ev.why = `该 key 在 ${exec.dir} 里一行都没有（判据①/②）`; perKey.push(ev); fail(key, ev.why); continue; }
  ev.lines.push(`  EVID ${key} 文件=${exec.file.replace(REPO + "/", "").replace(/\\/g, "/")} 行号=[${rowsIdx.join(",")}] band/身份/判词：`);
  for (const i of rowsIdx) {
    const r = exec.results[i];
    const rs = rowRealSha8(r.band);
    const fresh = rs === cur.sha8;
    ev.lines.push(`    row#${i} band=${r.band || "(无)"} ${fresh ? "FRESH" : (rs ? "STALE@" + rs : "无戳")} status=${r.status} ident=${JSON.stringify(r.identity || "")} session=${sessionVerdict(r)} src=${maskSecret(r.sessionSource)} lv=${maskSecret(r.loginVerify)}`);
  }

  // 判据③ band：该 key 在本件里有没有 real@当前戳 的行
  const realShas = [...new Set(rowsIdx.map((i) => rowRealSha8(exec.results[i].band)).filter(Boolean))];
  if (!realShas.length) { ev.why = `本件里该 key 没有 real@sha8 档的行（判据③；现算尺=${cur.raw}）⇒ 无从判新`; perKey.push(ev); fail(key, ev.why); continue; }
  if (!realShas.includes(cur.sha8)) { ev.why = `band 不匹配：现算尺=${cur.raw}，本件行上 real 段=${realShas.map((s) => "real@" + s).join(",")} ⇒ 旧档位戳读数不记账（判据③）`; perKey.push(ev); fail(key, ev.why); continue; }

  // 判据④/⑤：是否存在“判过 + 当前戳 + 会话不矛盾 + 落在要求身份轴”的有效认领行
  const ax = axesOf(rec.identities);
  const credit = (axis) => rowsIdx.filter((i) => {
    const r = exec.results[i];
    if (!JUDGED.test(String(r.status || ""))) return false;          // ④
    if (rowRealSha8(r.band) !== cur.sha8) return false;             // ③
    if (sessionVerdict(r) === "contradict") return false;          // ⑤
    return axis === "login" ? LOGIN_IDS.includes(String(r.identity || "")) : GUEST_IDS.slice(0, 2).includes(String(r.identity || ""));
  });
  const judgedButSkippedOnly = !rowsIdx.some((i) => JUDGED.test(String(exec.results[i].status || "")));
  if (judgedButSkippedOnly) { ev.why = "该 key 在本件里全是 SKIPPED（判据④：跳过不记账）"; perKey.push(ev); fail(key, ev.why); continue; }
  const missingAxis = [];
  if (ax.login && credit("login").length === 0) missingAxis.push("login");
  if (ax.guest && credit("guest").length === 0) missingAxis.push("guest");
  if (missingAxis.length) { ev.why = `有效判过行缺身份轴 ${missingAxis.join("+")}（判据⑤；要求轴=${[ax.login && "login", ax.guest && "guest"].filter(Boolean).join("+")}）⇒ 一条也不补；别改标签补数`; perKey.push(ev); fail(key, ev.why); continue; }

  // 判决效力台账：行必须存在（判据④的“ledger row exists”），且据此判定“是否真是第一条有效判过读数”
  const adj = ledgerAdjudication(caseId);
  if (!adj) { ev.why = "判决效力台账不可读"; perKey.push(ev); fail(key, ev.why); continue; }
  if (!adj.exists) { ev.why = `台账里没有点名 ${caseId} 的行（“ledger row doesn't exist”）⇒ revalidated 无处可盖`; perKey.push(ev); fail(key, ev.why); continue; }
  ev.lines.push(`  LEDGER ${caseId} 出处=${adj.rows.map((r) => r.sect + ":" + r.id).join(" ")} 目标节=${adj.targetSection}`);

  if (adj.alreadyRevalidated) { ev.verdict = "ALREADY"; ev.why = "台账已有 coverageEffect:\"revalidated\" 行 ⇒ 无需重写"; perKey.push(ev); continue; }

  // 诚实判点：有效认领行“在机械判点上成立”，但本权限只允许在“重跑落第一条**有效**判过读数”时盖。
  // 只要该用例的台账判决效力仍挂着未决 needsUser / 仍写着“未有效判决·重跑待回写·不得读作已判过”这类作废词，
  // 就说明这条认领会被台账现判为 disputed（重跑本身还没被裁/还没落有效读数）⇒ 不判合格。
  const blockers = [];
  if (adj.needsUser.length) blockers.push(`未决 needsUser=${adj.needsUser.join(",")}`);
  if (adj.voidWords.length) blockers.push(`台账现判词=${adj.voidWords.join("+")}`);
  if (blockers.length) {
    ev.verdict = "NOT-QUALIFIED";
    ev.why = `机械认领判点已过（当前尺 real 档、判过、会话可证、要求轴齐），但 ${blockers.join("；")} ⇒ 这条 fresh 行正是台账作废/挂起的那条读数，不是“重跑落的第一条有效判过读数”，不盖`;
    blockNotes.push(`[${key}] ${ev.why}`);
    perKey.push(ev);
    continue;
  }
  ev.verdict = "ELIGIBLE";
  const firstCredit = credit(ax.login ? "login" : "guest")[0];
  ev.why = `有效判过读数成立且台账无挂起判决：exec=${exec.dir} 行#${firstCredit} band=${cur.raw} status=${exec.results[firstCredit] ? exec.results[firstCredit].status : "?"} session=${exec.results[firstCredit] ? sessionVerdict(exec.results[firstCredit]) : "?"}`;
  perKey.push(ev);
}

// ---- 落盘只在最后的 APPLY 分支做；此处仅做“全部合格 + --attest”的前置校验，绝不预先写任何文件 ----
if (!problems.length && APPLY) {
  if (!ATTEST) { fail("APPLY", "--apply 需要 --attest \"<重跑落的第一条有效判过读数的出处/理由>\"（把“由我写”变成可归因的一击）"); }
  const notOk = perKey.filter((e) => e.verdict !== "ELIGIBLE");
  if (notOk.length) { fail("APPLY", `并非所有点名键都合格（${notOk.map((e) => e.key + "=" + e.verdict).join(" ")}）⇒ 整批拒绝，绝不半写`); }
}

// ---- 打印 ----
console.log(`REVALIDATE stamp=${cur.raw || "(取不到)"} 尺源=${cur.source}（现算自 ${REAL_BUNDLE.replace(REPO + "/", "")}，与消费者同一算法 artifact-band.mjs:22；不接受手填戳）`);
console.log(`REVALIDATE ledger=${LEDGER_ARG}（判决效力来源=消费者 --ledger 真读的 JSON；本工具绝不编辑 round-6/issue-matrix.md、绝不改写 status/prose）`);
console.log(`REVALIDATE exec=${exec ? exec.dir : "(未给/无效)"} ops=${OPS.replace(REPO + "/", "")} mode=${APPLY ? "APPLY" : "DRY"}`);
for (const e of perKey) {
  console.log(`REVALIDATE ${e.key} => ${e.verdict}${e.why ? " —— " + e.why : ""}`);
  for (const l of e.lines) console.log(l);
  if (e.verdict === "ELIGIBLE" && !APPLY) console.log(`  WOULD-WRITE cell=在 ${LEDGER_ARG} 末尾追加一行 {coverageEffect:"revalidated", case:"${e.key.split("|")[1]}"}（新增行、不删旧行、不动 11 列 markdown 台账、不改任何行 status/prose）`);
}
if (blockNotes.length) { console.log("REVALIDATE_BLOCKED 以下键机械判点过、但判决效力仍被台账挂起（不算合格）："); for (const b of blockNotes) console.log("  " + b); }
if (problems.length) { console.log(`REVALIDATE_RESULT=REFUSED problems=${problems.length}（失败即闭，未落盘）`); for (const p of problems) console.log("  ✗ " + p); process.exit(2); }
if (APPLY) {
  // 真正的写盘分支（守恒：corrections+fixlane 行数 before → after，JSON 仍可解析）
  const j = JSON.parse(readFileSync(LEDGER, "utf8"));
  const before = (j.corrections || []).length + (j.fixlane || []).length;
  const caseId = RAW_KEYS.length === 1 ? RAW_KEYS[0].split("|")[1] : RAW_KEYS.map((k) => k.split("|")[1]);
  j.fixlane = j.fixlane || [];
  j.fixlane.push({ id: `REVALIDATE-${String(Date.now()).slice(-6)}`, applied: `coverageEffect=revalidated（覆盖记账 ≠ 宣告修复；未改任何行的 status/prose）`, case: caseId, coverageEffect: DECL_REVALIDATED, revalidateEvidence: { exec: exec.dir, band: cur.raw } });
  const after = (j.corrections || []).length + (j.fixlane || []).length;
  const measured = JSON.parse(readFileSync(LEDGER, "utf8")); // 重读校验可解析（守恒定义只有一份：JSON.parse 成功 + 行数=before+键数）
  const measuredRows = (measured.corrections || []).length + (measured.fixlane || []).length;
  if (after !== before + RAW_KEYS.length || measuredRows !== before) { console.log(`REVALIDATE_RESULT=REFUSED reason=守恒不过 期望 before ${before}+${RAW_KEYS.length}；写前读回=${measuredRows}（异常，未确认写入）`); process.exit(2); }
  writeFileSync(LEDGER, JSON.stringify(j, null, 1));
  const reRead = JSON.parse(readFileSync(LEDGER, "utf8"));
  const reRows = (reRead.corrections || []).length + (reRead.fixlane || []).length;
  if (reRows !== before + RAW_KEYS.length) { console.log(`REVALIDATE_RESULT=REFUSED reason=写盘后行数 ${reRows} ≠ ${before + RAW_KEYS.length}（守恒不过，请从 .zcode/tmp/revalidate-lane/ledger-before.json 恢复）`); process.exit(2); }
  console.log(`REVALIDATE 已落盘 fixlane ${before} → ${reRows}（corrections+fixlane 合计；11 列 markdown 台账未触碰）`);
  console.log("REVALIDATE_RESULT=OK");
  process.exit(0);
}
console.log("REVALIDATE_RESULT=DRY（加 --apply --attest \"…\" 才写台账）");
process.exit(0);
