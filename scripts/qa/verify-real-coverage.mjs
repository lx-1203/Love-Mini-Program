#!/usr/bin/env node
/** 真实模式覆盖守恒：每一条 requiresReal 用例，必须至少被一条"档位=real"的执行腿**判过**（不是跳过），
 *  而且 ⑤ 要的双身份 ⇒ A 与 guest 两把身份各要有一条。
 *
 *  为什么单独一条门（2026-09-27）：执行器把 236 条 requiresReal 全记成 SKIPPED，
 *  而排队器与 queue-reconcile 数的是"这条用例有没有一行结果"——SKIPPED 也算一行，
 *  于是覆盖账看起来是满的。真实模式实际量为零。跳过原因那句"本切片只跑 mock 产物"
 *  在它自己那次运行里都不成立（它开的就是 real 档），更没人去核。
 *  这条门只认一个事实：**行上的 band 是不是 real，状态是不是"没被跳过"**。
 *
 *  执行通道免检轴（2026-09-28 补）：判据台自己盖过章「这条本通道做不了」的行
 *  （ops 用例上的声明字段 c.automatable === false），执行腿是被**禁止**去跑它们的——
 *  dc9f7297 让 r-exec-ws.mjs 对含这些行的名单整批拒跑（WSX_IDS_NOT_AUTOMATABLE）。
 *  一条门不能一边禁跑、一边又索要"你为什么不跑"的红：那样这些行永远凑不齐证据，
 *  门就永久红，永久红的门最后会被绕过去。所以这里给它们一个**单独的、计数的、点名的**
 *  桶：REALCOV_AUTOMATABLE_EXEMPT=n + 逐条 EXEMPT 明细。
 *  三条硬口径：① 只读判据台声明的 automatable 字段（与 r-exec-ws.mjs:341 同一个字段、
 *  同一个严格判等 === false），不从 prose、id 模式或硬编码名单反推；
 *  ② 豁免 ≠ 覆盖，免检行绝不并进 covered；
 *  ③ 剩余非免检的欠账照旧按原阈值（uncovered === 0 才绿）判红，一条不减。
 *
 *  合同的下半场（2026-09-28 补）：**没有 band 的行**过去落在这条门的暗面里——
 *  认领靠 /^real(@|$)/ 匹配 band，band 缺省成空串就永远匹配不上，于是"扫到了、一行也没认领"
 *  与"根本没扫到"两种形状在读数上一模一样。实测：round-8 那条 145 行、admissible=yes、
 *  outcome=measured 的 WS 波次（reports/audit/round-7/exec-ws-tap-r8，r-exec-ws.mjs 产的，
 *  行里根本没有 band 字段）进了 EXEC_ROWS=14678，却没让 COVERED 与 UNCOVERED 动过任何一格。
 *  漏字段的生产者不是"少了一格覆盖"，是**一整类证据对门不可见**，而门对此一声不吭。
 *  现在这一侧也闭环：REALCOV_BANDLESS_ROWS / _CASES 数出来、逐条点名、写清是哪几个目录。
 *  两条边界：① 只数"本门会去看的那些行"（key 命中 requiresReal 判据），其余目录的行不归这本账；
 *  ② 计数与点名**不改判红阈值**（ok 仍只看 uncovered 与守恒）——今天已有 4586 条合法 mock 行，
 *  把漏盖做成新的常红判点，正撞上面那句"永久红的门最后会被绕过去"。它是一条看得见的漏，
 *  不是一根新的狼牙棒。
 *
 *  用法：node scripts/qa/verify-real-coverage.mjs [--round round-7]
 *       [--ops reports/audit/round-6/ops] [--dir reports/audit/round-7] [--selftest]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? argv1(i) : d; };
function argv1(i) { return process.argv[i + 1]; }
const ROUND = arg("round", "round-7");
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const DIR = resolve(REPO, arg("dir", "reports/audit/" + ROUND));

/** 权威用例集：ops 判据台里逐条点名 requiresReal 的那些（不从执行结果反推，
 *  否则"没跑 ⇒ 没行 ⇒ 不欠账"会自己把自己证明成满分）。 */
function requiredCases() {
  const out = [];
  if (!existsSync(OPS)) { console.log("REALCOV_RESULT=FAIL reason=判据台目录不存在 " + OPS); process.exit(2); }
  for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { continue; }
    const cases = j.cases || j.items || [];
    for (const c of cases) {
      if (c && c.requiresReal === true) {
        /* 身份适用范围（#51 由 tag-ops-identity-scope.mjs 落的 c.identities）也来自判据台：
           判据说"这条的前置是登录态"，那 guest 这一腿就无权认领 ⇒ 门不能再替它记账。
           口径只减不增：没标的照旧要求双身份，标了的按标的那几腿各要一条。 */
        const ids = Array.isArray(c.identities) ? c.identities.map(String).filter(Boolean) : [];
        /* 免检轴的唯一来源=判据台上声明的 c.automatable（原样带出，判等留在 judge 里做，
           这样"读的是声明字段"这件事在判定点上就可读）。notAutomatableFrom 是它的出处，
           只用于打印，不参与判定。 */
        out.push({
          manifest: (j.suite || f.replace(/\.json$/, "")),
          id: String(c.id || c.caseId || ""),
          page: j.page || c.page || "",
          identities: ids,
          automatable: c.automatable,
          notAutomatableFrom: typeof c.notAutomatableFrom === "string" ? c.notAutomatableFrom : "",
        });
      }
    }
  }
  return out.filter((c) => c.id);
}

function execRows() {
  const rows = [];
  if (!existsSync(DIR)) { console.log("REALCOV_RESULT=FAIL reason=本轮结果目录不存在 " + DIR); process.exit(2); }
  for (const d of readdirSync(DIR)) {
    const p = join(DIR, d, "exec-results.json");
    if (!d.startsWith("exec-") || !existsSync(p)) continue;
    let j; try { j = JSON.parse(readFileSync(p, "utf8")); } catch { console.log("REALCOV_SKIP_UNPARSEABLE " + d); continue; }
    /* dir 带着走：漏盖这件事必须能报到"是哪一条腿/哪个目录没盖"，否则计数没有下一步。 */
    for (const r of j.results || []) rows.push({ key: r.manifest + "|" + r.id, band: String(r.band || ""), identity: String(r.identity || "?"), status: String(r.status || ""), dir: d });
  }
  return rows;
}

/* 只有"判过"才算覆盖：EXECUTED / FAILED 是判过（哪怕判成红），SKIPPED 不是。
   把 SKIPPED 记成覆盖，正是本轮 236 条被吞掉的那条路径。 */
const JUDGED = /^(EXECUTED|FAILED|PASS)$/;
const REAL_BAND = /^real(@|$)/;

/* 一条判据"该由谁来判"，按 ops 的 identities 折算成两条轴（本门只有这两条轴）：
   登录侧 = A 或 B（这条门不区分账号，区分账号是台账的事）；游客侧 = guest/none。
   没标 identities ⇒ 两轴都要（⑤ 的双身份原口径，一条都不放松）。 */
function axesOf(identities) {
  const ids = (identities || []).map(String).filter(Boolean);
  if (!ids.length) return { login: true, guest: true };
  return { login: ids.some((x) => x === "A" || x === "B"), guest: ids.some((x) => x === "guest" || x === "none") };
}

function judge(rows, req, ids) {
  const byId = new Map();
  /* 漏盖计数（行轴，不是用例轴）：本门会去看、却读不出档位的行。
     只数 key 命中 requiresReal 判据的行——其它判据本来就不归这本账，数进来只会稀释信号。 */
  const bandless = { rows: 0, cases: new Map() };
  for (const r of rows) {
    if (!ids.has(r.key)) continue;
    const rec = byId.get(r.key) || { real: new Set(), realJudged: new Set() };
    if (!r.band) {
      bandless.rows++;
      bandless.cases.set(r.key, (bandless.cases.get(r.key) || 0) + 1);
    }
    if (REAL_BAND.test(r.band)) {
      rec.real.add(r.identity);
      if (JUDGED.test(r.status)) rec.realJudged.add(r.identity);
    }
    byId.set(r.key, rec);
  }
  const missing = {
    neverOnReal: [], skippedOnly: {}, noGuest: [], noA: [], scopedGuestExempt: 0, scopedLoginExempt: 0,
    /* 免检桶与覆盖桶都是新增的、互斥的格子；下面三个旧判点（neverOnReal / noA / noGuest）
       以及 skippedOnly 的判据一个字没改，只是免检行不再进它们的路径。 */
    automatableExempt: [], covered: [],
    bandless,
  };
  for (const c of req) {
    const key = c.manifest + "|" + c.id;
    const ax = axesOf(c.identities);
    if (!ax.guest) missing.scopedGuestExempt++;
    if (!ax.login) missing.scopedLoginExempt++;
    /* 执行通道免检：判据台声明字段 c.automatable === false（严格判等，跟 r-exec-ws.mjs:341
       拒跑名单用的是同一个字段同一个条件；写成 "false" 字符串、0、null 都不算豁免）。
       放在身份轴读数之后，是为了让 REALCOV_IDENTITY_SCOPED 的两个数与加轴前完全可比。
       免检行单独点名，不进 covered ⇒ "本门不追"绝不被读成"量到了"。 */
    if (c.automatable === false) {
      const rec = byId.get(key);
      const hadRealRow = !!(rec && rec.real.size > 0);
      const judged = !!(rec && rec.realJudged.size > 0);
      missing.automatableExempt.push({ key, from: c.notAutomatableFrom || "", hadRealRow, judged, allSkipped: hadRealRow && !judged });
      continue;
    }
    const rec = byId.get(key);
    if (!rec || rec.real.size === 0) { missing.neverOnReal.push(key); continue; }
    const judgedLogin = rec.realJudged.has("A") || rec.realJudged.has("B");
    const judgedGuest = rec.realJudged.has("guest") || rec.realJudged.has("not-logged-in");
    let deficient = false;
    if (ax.login && !judgedLogin) { missing.noA.push(key); deficient = true; }
    if (ax.guest && !judgedGuest) { missing.noGuest.push(key); deficient = true; }
    if (rec.realJudged.size === 0) missing.skippedOnly[key] = [...rec.real];
    if (!deficient) missing.covered.push(key);
  }
  return missing;
}

function selftest() {
  const req = [{ manifest: "M", id: "1" }, { manifest: "M", id: "2" }, { manifest: "M", id: "3" }];
  const ids = new Set(req.map((c) => c.manifest + "|" + c.id));
  const cases = [
    { n: "两把身份都在 real 档判过⇒ 不欠", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "A", status: "FAILED" }, { key: "M|2", band: "real@abc", identity: "not-logged-in", status: "FAILED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0 },
    { n: "只在 mock 档有行⇒ 三条全欠（本轮的真实形状）", rows: [{ key: "M|1", band: "mock@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "mock@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "mock@abc", identity: "A", status: "EXECUTED" }], wantMissing: 3 },
    { n: "real 档但全被 SKIPPED⇒ 仍算欠（跳过不等于覆盖）", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }, { key: "M|2", band: "real@abc", identity: "A", status: "SKIPPED" }, { key: "M|3", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 3 },
    { n: "只有 A 判过、guest 缺⇒ 双身份口径下欠 3", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 3 },
  ];
  let bad = 0;
  const reqOf = (c) => c.req || req;
  const extraReq = [{ manifest: "M", id: "1", identities: ["A", "B"] }];
  const extraIds = new Set(extraReq.map((c) => c.manifest + "|" + c.id));
  const cases2 = cases.concat([
    { n: "标了 A/B 且 A 在 real 档判过 ⇒ 游客轴不再记账（收窄≠免检，登录轴还在）", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 0 },
    { n: "标了 A/B 但只有 guest 判过 ⇒ 仍算欠（identity 只减少认领者，不降低标准）", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 1 },
    { n: "标了 A/B 且全被 SKIPPED ⇒ 欠", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 1 },
    { n: "没标 identities 的同款行 ⇒ 维持双身份口径，游客缺就算欠", req: [{ manifest: "M", id: "1" }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 1 },
  ]);
  /* 免检轴自己的样本：方向必须两头都锁死——盖章的进免检桶且不许进 covered，
     没盖章的（含把 automatable 写成字符串的）照旧算欠。 */
  const ax3 = [
    { manifest: "M", id: "1", automatable: false, notAutomatableFrom: "cellplan-x.json" },
    { manifest: "M", id: "2", automatable: false },
    { manifest: "M", id: "3", automatable: false },
  ];
  const ax3Ids = new Set(ax3.map((c) => c.manifest + "|" + c.id));
  const cases3 = [
    { n: "盖章 automatable=false 且真档一行都没有⇒ 进免检桶，不算欠、也不算覆盖", req: ax3, ids: ax3Ids, rows: [{ key: "M|2", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "guest", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0, wantExempt: 3, wantCovered: 0 },
    { n: "盖章但这条真档其实被判过⇒ 仍只进免检桶（豁免≠覆盖，不许给门添量）", req: [{ manifest: "M", id: "1", automatable: false }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0, wantExempt: 1, wantCovered: 0 },
    { n: "没盖章（automatable:true）⇒ 完全照旧，双身份缺 guest 就算欠", req: [{ manifest: "M", id: "1", automatable: true }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 1, wantExempt: 0, wantCovered: 0 },
    { n: "automatable 写成字符串 \"false\"⇒ 不算豁免（只认声明的布尔 false，防 prose 混进来）", req: [{ manifest: "M", id: "1", automatable: "false" }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 1, wantExempt: 0, wantCovered: 0 },
    { n: "盖章一条 + 没盖章两条全欠⇒ 免检 1 欠 2，两桶互斥", req: [{ manifest: "M", id: "1", automatable: false }, { manifest: "M", id: "2" }, { manifest: "M", id: "3" }], ids: new Set(["M|1", "M|2", "M|3"]), rows: [], wantMissing: 2, wantExempt: 1, wantCovered: 0 },
  ];
  /* 下半场（漏盖 band）自己的样本：三个方向必须同时锁死——
     · 没 band 的行一条也不认领，且被数出来（这是 exec-ws-tap-r8 那 145 行的原形状）；
     · 同一批行盖上 real@ 就整批转成覆盖、漏盖归零（证明"隐身"的唯一成因就是缺字段）；
     · 合法 mock@ 行既不认领也不算漏盖（不许把 4586 条 mock 行报成新红）。 */
  const blCases = [
    { n: "行缺 band⇒ 一条不认领（判据全欠），且漏盖被逐条数出来",
      rows: [{ key: "M|1", band: "", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "", identity: "guest", status: "EXECUTED" },
             { key: "M|2", band: "", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "", identity: "guest", status: "EXECUTED" },
             { key: "M|3", band: "", identity: "guest", status: "FAILED" }, { key: "M|3", band: "", identity: "not-logged-in", status: "FAILED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantBandlessRows: 6, wantBandlessCases: 3 },
    { n: "同一批行只补上 real@⇒ 三条全转覆盖、漏盖归零（缺字段是唯一致盲原因）",
      rows: [{ key: "M|1", band: "real@deadbeef", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@deadbeef", identity: "guest", status: "EXECUTED" },
             { key: "M|2", band: "real@deadbeef", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@deadbeef", identity: "guest", status: "EXECUTED" },
             { key: "M|3", band: "real@deadbeef", identity: "A", status: "FAILED" }, { key: "M|3", band: "real@deadbeef", identity: "not-logged-in", status: "FAILED" }],
      wantMissing: 0, wantExempt: 0, wantCovered: 3, wantBandlessRows: 0, wantBandlessCases: 0 },
    { n: "合法 mock@ 行⇒ 不算 real 覆盖、也不算漏盖（不许把 mock 波次报成新红）",
      rows: [{ key: "M|1", band: "mock@f1c7b96b", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "mock@f1c7b96b", identity: "guest", status: "EXECUTED" },
             { key: "M|2", band: "mock@f1c7b96b", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "mock@f1c7b96b", identity: "guest", status: "EXECUTED" },
             { key: "M|3", band: "mock@f1c7b96b", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "mock@f1c7b96b", identity: "guest", status: "EXECUTED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantBandlessRows: 0, wantBandlessCases: 0 },
    { n: "real 档但身份不是 A/B/guest（缺 identity 字段的形状）⇒ 仍不算覆盖",
      rows: [{ key: "M|1", band: "real@deadbeef", identity: "?", status: "EXECUTED" }, { key: "M|2", band: "real@deadbeef", identity: "?", status: "EXECUTED" },
             { key: "M|3", band: "real@deadbeef", identity: "?", status: "EXECUTED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantBandlessRows: 0, wantBandlessCases: 0 },
  ];
  for (const c of cases2.concat(cases3, blCases)) {
    const R = reqOf(c);
    const m = judge(c.rows, R, c.ids || ids);
    const got = new Set([...m.neverOnReal, ...m.noA, ...m.noGuest]).size;
    if (got !== c.wantMissing) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} got=${got} want=${c.wantMissing}`); }
    const ge = m.automatableExempt.length, gc = m.covered.length;
    if (c.wantExempt !== undefined && ge !== c.wantExempt) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} exempt=${ge} want=${c.wantExempt}`); }
    if (c.wantCovered !== undefined && gc !== c.wantCovered) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} covered=${gc} want=${c.wantCovered}`); }
    /* 漏盖计数：行数与命中判据数两头都要对上，缺一项就报不出来。 */
    if (c.wantBandlessRows !== undefined && m.bandless.rows !== c.wantBandlessRows) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 漏盖行=${m.bandless.rows} want=${c.wantBandlessRows}`); }
    if (c.wantBandlessCases !== undefined && m.bandless.cases.size !== c.wantBandlessCases) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 漏盖判据=${m.bandless.cases.size} want=${c.wantBandlessCases}`); }
    /* 守恒在每个样本上都得成立：免检 + 覆盖 + 欠账 = 用例条数，一个都不许凭空消失或重复计。
       漏盖是**行轴**的读数，不参与这条等式（同一行既可能被认领也可能同时被数成漏盖）。 */
    if (ge + gc + got !== R.length) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 守恒 ${ge}+${gc}+${got}≠${R.length}`); }
  }
  console.log(`REALCOV_SELFTEST=${bad === 0 ? "PASS" : "FAIL"} cases=${cases2.length + cases3.length + blCases.length} bad=${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}
if (process.argv.includes("--selftest")) selftest();

const req = requiredCases();
if (!req.length) { console.log("REALCOV_RESULT=FAIL reason=判据台里一条 requiresReal 都没抓到 ⇒ 判点空转，不认绿"); process.exit(2); }
const ids = new Set(req.map((c) => c.manifest + "|" + c.id));
const rows = execRows();
const m = judge(rows, req, ids);
console.log(`REALCOV_CASES=${req.length} EXEC_ROWS=${rows.length} 结果目录=${DIR.replace(REPO + "/", "")}`);
console.log(`REALCOV_NEVER_ON_REAL=${m.neverOnReal.length} REAL_BAND_BUT_ALL_SKIPPED=${Object.keys(m.skippedOnly).length} JUDGED_MISSING_A=${m.noA.length} JUDGED_MISSING_GUEST=${m.noGuest.length}`);
console.log(`REALCOV_IDENTITY_SCOPED 游客轴豁免=${m.scopedGuestExempt} 登录轴豁免=${m.scopedLoginExempt}（来源=ops 用例上的 c.identities，载体 tag-ops-identity-scope.mjs；豁免只减认领者，不减判据）`);
const exemptN = m.automatableExempt.length;
const exemptSkipped = m.automatableExempt.filter((e) => e.allSkipped).length;
console.log(`REALCOV_AUTOMATABLE_EXEMPT=${exemptN}（其中 real 档有行但全被 SKIPPED=${exemptSkipped}）来源=ops 用例声明字段 c.automatable===false（严格判等，与 r-exec-ws.mjs:341 拒跑名单同一字段同一条件；载具 dc9f7297 WSX_IDS_NOT_AUTOMATABLE）⇒ 执行腿被禁止跑的行，本门不再索要"跑过"的证据；豁免≠覆盖，REALCOV_COVERED 不含它们。`);
const EXEMPT_PRINT = 40;
for (const e of m.automatableExempt.slice(0, EXEMPT_PRINT)) {
  console.log(`  EXEMPT ${e.key} 出处=${e.from || "(判据台未记 notAutomatableFrom)"} real档=${e.hadRealRow ? (e.judged ? "有行且判过" : "有行但全 SKIPPED") : "无行"}`);
}
if (exemptN > EXEMPT_PRINT) console.log(`  EXEMPT …另 ${exemptN - EXEMPT_PRINT} 条未逐条点名（总数已计入上面 ${"REALCOV_AUTOMATABLE_EXEMPT"}）`);
for (const k of m.neverOnReal.slice(0, 6)) console.log("  NEVER_ON_REAL " + k);
for (const k of m.noA.slice(0, 6)) console.log("  NO_A_JUDGED " + k);
for (const k of m.noGuest.slice(0, 6)) console.log("  NO_GUEST_JUDGED " + k);
const uncovered = new Set([...m.neverOnReal, ...m.noA, ...m.noGuest]).size;
const coveredN = m.covered.length;
/* 下半场（漏盖 band 的行）：认领靠 band，读不出 band 的行就是"扫到了但一条也认领不了"。
   以前这一格是空的——门不吭声，整类证据（backend 字段没有门对应物那一类）就此隐身。
   口径：① rows 数的是本门真会去看的那些行（key 命中 requiresReal），② 同时给全扫描的漏盖数与
   所属目录，③ **不进 ok 的判据**（今天 4586 条合法 mock 行都带 band，漏盖只可能来自忘盖的生产者；
   把它做成常红判点，就重犯了上面注释里"永久红的门最后会被绕过去"那条错）。 */
const bandlessAll = rows.filter((r) => !r.band);
const inIdsRows = rows.filter((r) => ids.has(r.key));
const bl = m.bandless;
const blDir = new Map();
for (const r of bandlessAll) blDir.set(r.dir, (blDir.get(r.dir) || 0) + 1);
console.log(`REALCOV_BANDLESS_ROWS=${bl.rows}（在本门会看的 ${inIdsRows.length} 行里）REALCOV_BANDLESS_CASES=${bl.cases.size} REALCOV_BANDLESS_SCANNED=${bandlessAll.length}／${rows.length} 全扫描行`);
if (bandlessAll.length) {
  console.log(`  BANDLESS 出处 ${[...blDir].map(([d, n]) => d + "=" + n).join(" ")}（这些行的 band 字段缺失 ⇒ 无论档位是 mock 还是 real，本门一律无法认领；盖法见 r-exec-cli.mjs:176 与 r-exec-ws.mjs 的 mkRow/BAND_STR，格式 mode@sha8，判点即上面的 REAL_BAND）`);
  const BL_PRINT = 12;
  for (const [k, n] of [...bl.cases].sort((a, b) => b[1] - a[1]).slice(0, BL_PRINT)) console.log(`  BANDLESS ${k} 漏盖行=${n}`);
  if (bl.cases.size > BL_PRINT) console.log(`  BANDLESS …另 ${bl.cases.size - BL_PRINT} 条判据未逐条点名（总数已计入 REALCOV_BANDLESS_CASES）`);
  console.log(`  BANDLESS_HINT 这不是欠账新增（欠账仍按 real 档的行算），是生产者的字段缺失；修法是让那条腿盖上 band 再重跑，别把 mock 行改成 real 来"补数"`);
}
console.log(`REALCOV_COVERED=${coveredN}`);
console.log(`REALCOV_UNCOVERED=${uncovered}／${req.length}（阈值同旧：非免检欠账 =0 才绿）`);
const sum = exemptN + coveredN + uncovered;
const conserved = sum === req.length;
console.log(`REALCOV_CONSERVATION=${conserved ? "OK" : "FAIL"} 免检=${exemptN} + 覆盖=${coveredN} + 欠账=${uncovered} = ${sum}／${req.length}`);
if (!conserved) console.log(`  CONSERVATION_FAIL 差=${req.length - sum} ⇒ 有用例没被「免检/覆盖/欠账」任一格接住（或有重复计），这笔账不可信，门直接判红`);
const ok = uncovered === 0 && conserved;
console.log(`REALCOV_RESULT=${ok ? "PASS" : "FAIL"}（真实模式覆盖守恒：跳过不算量到，单身份不算双身份；免检只免"本门不追"，不降阈值）`);
process.exit(ok ? 0 : 1);
