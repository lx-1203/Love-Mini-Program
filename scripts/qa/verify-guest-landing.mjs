#!/usr/bin/env node
/* 游客落点：把 26 组「声明页 → 实测落地页」从"人写在脚本里的处置文字"变成有载体的裁定 + 复测腿。
   两个模式：
     --mode book    （缺省，不开模拟器）从 triage 的 landingGroups 反推组集，与 policy 双向核对，出「复测腿账本」
     --mode measure 拿到 UI 租约后逐页实测：清会话→开页→按判定窗取栈顶+探针→出 measured.json
   判决口径：booked 不等于结案。三态由 landingStatus() 统一给（triage 门禁 import 它），
   所以「写了腿没跑」「跑了不过」「跑过且符合裁定」在报告里长得不一样。
   Node：PATH 上的 node 是 DevTools 的 v16，本文件要 v22（见 D:/codex-tools/node-v22.17.0-win-x64）。 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { acquireUi, releaseUi, renewUi, heldLeases } from "./ui-lease.mjs";
import { openPage, routeStack, nodeCount, clearSession, verifyLogin } from "./cli-automator.mjs";
import { readApiMode, assertGuestCapable } from "./artifact-band.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const MODE = arg("mode", "book");
const POLICY = resolve(REPO, arg("policy", "scripts/qa/guest-landing-policy.json"));
const TRIAGE_RAW = arg("triage", ".zcode/tmp/triage-r7-guest.json");
/* 默认值本身是个单份 scratch 文件：不显式传 --triage 时，账本成员名册就跟着"那一次跑到的切片"走
   （round-7 的 favorites/tasks/vip-promo-code 漏记就是这么来的）。这里只警告不改退出码 ——
   正在跑的腿不能因为一条新加的硬失败被带走，但警告行会进终报，收口时按并集显式传参。 */
if (MODE === "book" && !process.argv.includes("--triage"))
  console.log("GUEST_LAND_WARN=--triage 未显式给出 ⇒ 名册取自单份 scratch 默认（" + TRIAGE_RAW + "）；本轮多条执行腿必须 --triage a,b 传并集");
const MEASURED = resolve(REPO, arg("measured", "reports/audit/round-7/guest-landing-measured.json"));
const BOOK_OUT = resolve(REPO, arg("out", "reports/audit/round-7/guest-landing-booked.json"));
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin-real"));
const OWNER = arg("owner", "r7-guest-landing");
/* 判定窗取自被测物而不是拍脑袋：LOGIN_REDIRECT_DELAY_MS=500 + 网络往返。
   首窗不够就复采到次窗，两窗都走（只记最后一次会把"弹得慢"误判成"没弹"）。 */
const WINDOWS = [2500, 4500];
const sleep = (ms) => { const e = Date.now() + ms; while (Date.now() < e) { /* 同步等待：探针本身是 execFileSync，事件循环里没有别的事 */ } };

const problems = [];
const markProblem = (m) => { problems.push(m); };
const key = (page, landing) => page + " → " + landing;

/* ---------- 锚点可核：policy 每条依据都得是 {file,line,needle} 且那一行真写着 needle ---------- */
function checkAnchor(a) {
  const p = resolve(REPO, a.file);
  if (!existsSync(p)) return "文件不存在 " + a.file;
  const line = (readFileSync(p, "utf8").split(/\r?\n/)[a.line - 1] || "").trim();
  if (!line.includes(a.needle)) return `行漂移 ${a.file}:${a.line} 里没有「${a.needle}」，该行实为 ${line.slice(0, 70)}`;
  return null;
}

/* ---------- #67：账本成员改由判据台（ops）派生，不再只吃某一次跑的落地对 ----------
   为什么必须改：2026-09-27 起游客腿按 c.identities 不再认领 420 条"前置是登录态"的用例
   （那是 #51 要的语义），于是"这一组在本轮 triage 里出现过的行"会成批消失。
   继续拿它当唯一名册，就会出现两种错：① 把"游客不该跑"误判成"裁定过期/落点已变"而判红；
   ② 更坏 —— 某组真的没人复验了，却因为名册空而被当成"没有债"。
   名册的**成员**因此改由 ops 派生，跑测观察到的落地对只作为"第二证人"参与守恒，不再单独决定谁在账上。
   2026-09-30 裁定 (a) 之后 ops 这一路有**两条并列路线**（都在 opsRosterByPage() 里，只有一个名册对象）：
     ①被收窄出游客腿的行（#67 原口径）；②整页都没有 identities 声明的页的全部行（新，窄条件见其注释）。
   改这一路的直接后果：roster 不再随 "--triage 喂的是哪一份切片" 在 27/28 组之间摆 ⇒ 不会出现
   "在册账本有这一组、预检却说它没有证人" 的那种拍不了的账本（followups-v33.md §11）。 */
const OPS_DIR = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));

/** 这条 case 是否已被收窄成"只有登录态腿认领"（游客腿不再作证 ⇒ 需要 GG-* 复测腿替它记账）。 */
export function guestNoLongerClaims(c) {
  const ids = (Array.isArray(c && c.identities) ? c.identities : []).map(String).filter(Boolean);
  if (!ids.length) return false;
  return !ids.some((x) => x === "guest" || x === "none");
}

/** 这条 case 有没有**任何**身份声明。没有声明 ≠ 没人在判：执行器 scripts/qa/r-exec-cli.mjs:159-163
 *  identityScopeSkip() 对空 identities 一律 return ""（不跳），即"未声明 = 游客腿照跑这一行"。 */
export function identityDeclared(c) {
  return (Array.isArray(c && c.identities) ? c.identities : []).map(String).filter(Boolean).length > 0;
}

const EMPTY_ROSTER = () => ({ ids: new Set(), narrowed: new Set(), entireGuest: new Set(), undeclared: new Set(), rows: 0 });

/**
 * page → 该页在 ops 判据台上的成员账。**book 与 measure 只有这一个成员来源**（两者都走 buildPlan()，
 * 不许再有第二处按 triage 或按 identities 各自凑一遍名册）。每页给两类证人：
 *  ① narrowed：被收窄出游客腿的行（#67 立的口径，一字未改）。
 *  ② entireGuest（2026-09-30 裁定 (a)）：**整页每一行都没有 identities 声明**的页 ⇒ 该页全部行计为证人。
 *     三条都成立才生效，缺一不生效：(i) 该页在 ops 里至少 1 行；(ii) 该页**每一行**都 `!identityDeclared(c)`；
 *     (iii) 于是该页没有一行被收窄（①=0，否则用不着新路线）。
 *   为什么 (ii) 必须是"整页都没声明"而不是"整页都被游客认领"：
 *     `identities:["guest"]` 是判据台**明写**"这些行归游客执行腿自己判"—— 那批行由 exec 游客腿直接作证，
 *     不需要 GG-* 落点腿替它们记账；此时跑测证人再缺席，这一组就仍然是"没有任何证人"，必须照旧 exit 2。
 *     （负例：test-guest-landing.mjs 第 3b 条 = 整页声明 guest、第 9 条 = 部分声明的页，两条都必须红。）
 *   实测口径命中面：policy 28 个裁定页里恰好 1 页（subpackages/setup/recommend-pref/index，11 行 RP01–RP11），
 *     其余 27 页仍走 ① ⇒ 改动面 = 1 组 / 11 行，别的组的成员一个字节都没动。
 */
function opsRosterByPage() {
  const out = new Map();
  if (!existsSync(OPS_DIR)) { markProblem("ops 判据台目录不存在：" + OPS_DIR + " ⇒ 名册无法由判据台派生（不退回单份语料）"); return out; }
  for (const f of readdirSync(OPS_DIR).filter((x) => x.endsWith(".json")).sort()) {
    let j; try { j = JSON.parse(readFileSync(join(OPS_DIR, f), "utf8")); } catch (e) { markProblem("ops 文件读不动 " + f + "：" + String(e.message).slice(0, 50)); continue; }
    for (const c of j.cases || []) {
      const page = String(c.page || "").trim();
      if (!page) continue;
      const r = out.get(page) || EMPTY_ROSTER();
      r.rows++;
      const id = String(c.id || "");
      if (!identityDeclared(c)) r.undeclared.add(id);
      if (guestNoLongerClaims(c)) r.narrowed.add(id);
      out.set(page, r);
    }
  }
  for (const [page, r] of out) {
    if (r.rows > 0 && r.undeclared.size === r.rows) for (const id of r.undeclared) if (id) r.entireGuest.add(id);
    for (const id of r.narrowed) if (id) r.ids.add(id);
    for (const id of r.entireGuest) if (id) r.ids.add(id);
  }
  return out;
}

/* ---------- 共用：把 policy + triage 合成组集，并做双向守恒 ---------- */
function buildPlan() {
  const pol = JSON.parse(readFileSync(POLICY, "utf8"));
  /* 成员账必须吃"所有语料的并集"。单份 triage 只描述它那一次跑到的切片——
     round-7 实测就是拿一份 --real-cases-only 的输出去记账，结果
     favorites / tasks / vip-promo-code 三组的账本成员比任何一次全量跑都少，
     核对时表现为"实测多于账本"，看着像债对不上，其实是账本漏记。
     --triage 允许逗号分隔多份；每份点名贡献多少组多少行，并集为空仍判红。 */
  const groups = {};
  const triItems = [];
  const perFile = [];
  for (const tf of String(TRIAGE_RAW).split(",").map((s) => s.trim()).filter(Boolean)) {
    let tri;
    try { tri = JSON.parse(readFileSync(resolve(REPO, tf), "utf8")); }
    catch (e) { markProblem("triage 读不到/解析不了 " + tf + "：" + String(e && e.message).slice(0, 60)); continue; }
    const g = tri.landingGroups || {};
    for (const it of tri.items || []) triItems.push(it);
    let hits = 0;
    for (const [k, ids] of Object.entries(g)) {
      const set = groups[k] || (groups[k] = []);
      for (const id of ids || []) { hits++; if (!set.includes(id)) set.push(id); }
    }
    perFile.push(tf + "（组=" + Object.keys(g).length + "，行次=" + hits + "）");
  }
  console.log("GUEST_LAND_SOURCES=" + (perFile.join(" ; ") || "(无)") + " ⇒ 并集组数=" + Object.keys(groups).length +
    " 并集行数=" + Object.values(groups).reduce((a, v) => a + v.length, 0));
  /* 空并集一律判红（2026-09-29 复位）。这条 guard 本来就在，是在 #67 那次改写（commit d480461c
     "GG-* 成员账改由判据台派生"）里被连带删掉的，而 buildPlan() 里那段讲多源的注释一直还写着
     "并集为空仍判红" —— 判据与注释相反，注释成了谎话。删掉之后的实测后果（test-guest-landing.mjs
     的第 4 条负例抓到）：喂进 {landingGroups:{}} 也 exit 0 判绿，因为成员账改由 ops 派生之后
     账本仍然有 27 组 434 行，于是"这一轮没有任何跑测证人"被读成"欠款都记着、门通过"。
     这不是新增判据、是恢复既有判据，且比 #67 之前更窄：ops 派生只改"谁在账上"，不改"没有跑测证人
     就不能出复测腿"这一条 —— 载具量不到的东西不许变成 GG-* 腿。 */
  const gkeys = Object.keys(groups);
  if (!gkeys.length) markProblem("所有 --triage 源的落地对并集为空 ⇒ 要么上游没跑，要么吃进错了文件（空集不能当成「全部已裁定」，也不能当成「没有欠款」）");
  const pkeys = pol.rows.map((r) => key(r.page, r.landing));
  const byKey = Object.fromEntries(pol.rows.map((r) => [key(r.page, r.landing), r]));
  const opsRoster = opsRosterByPage();
  const rosterOf = (page) => opsRoster.get(page) || EMPTY_ROSTER();
  const gset = new Set(gkeys), pset = new Set(pkeys);
  const onlyTriage = gkeys.filter((k) => !pset.has(k));
  /* 双向守恒按新方向查：
     - 跑测里出现 policy 没有的落点 ⇒ 仍然红（新落点必须当场裁定，不许落进兜底）；
     - policy 有而本轮跑测没出现 ⇒ 先问 ops 有没有成员：有 ⇒ 只是"这一组的跑测证人没出现"（收窄出游客腿，
       或 2026-09-30 裁定 (a) 的整页游客断言），记一条具名读数；ops 也没有 ⇒ 红，这一组既没人跑也没人记账，才是真缺口。
     旧的"policy 多出来的组一律判红"就是"裁定过期或落点已变"那句话，在 #51 之后会天天假红。 */
  const noRunWitness = [], trulyEmpty = [];
  for (const k of pkeys) {
    if (gset.has(k)) continue;
    const [page] = k.split(" → ");
    if (rosterOf(page).ids.size) noRunWitness.push(k); else trulyEmpty.push(k);
  }
  if (onlyTriage.length) markProblem("policy 缺这几组落地对（新落点必须当场裁定，不许落进兜底）：\n  " + onlyTriage.join("\n  "));
  if (trulyEmpty.length) markProblem("policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何证人（既没有被收窄出游客腿的行，也不是整页未声明 identities 的游客断言页）⇒ 这一组没有任何证人：\n  " + trulyEmpty.join("\n  "));
  if (noRunWitness.length) console.log("GUEST_LAND_NO_RUN_WITNESS=" + noRunWitness.length + " 组（跑测里不再出现这些落地对 ⇒ 成员账由 ops 判据台派生（收窄出游客腿 / 整页游客断言两条路线），不是裁定过期）");
  const dup = pkeys.filter((k, i) => pkeys.indexOf(k) !== i);
  if (dup.length) markProblem("policy 键重复：" + dup.join(" / "));

  const rows = [];
  let debt = 0, opsSourced = 0, observedOnly = 0, entireGuestGroups = 0, entireGuestRows = 0;
  const entireGuestPages = [];
  /* 名册遍历 policy 而不是跑测观察到的组：一组会不会从账上"消失"，过去取决于那次跑有没有撞上它。 */
  for (const k of pkeys.slice().sort()) {
    const r = byKey[k];
    if (!r) continue;
    const [page, landing] = k.split(" → ");
    const observed = groups[k] || [];
    const ent = rosterOf(page);
    const fromOps = [...ent.ids];
    const ids = [...new Set([...fromOps, ...observed])];
    if (!ids.length) { markProblem(`组 ${k} 一名成员都没有 ⇒ 有裁定却没有账本成员（ops 既没有被收窄出游客腿的行，也不是整页未声明 identities 的游客断言页；跑测这一组也没出现），不能出 GG-* 腿`); continue; }
    debt += ids.length;
    if (fromOps.length) opsSourced++; else observedOnly++;
    if (ent.entireGuest.size) { entireGuestGroups++; entireGuestRows += ent.entireGuest.size; entireGuestPages.push(page + "(ops 行=" + ent.rows + " 全部未声明 identities ⇒ 证人=" + ent.entireGuest.size + ")"); }
    const mk = pol.markers[r.family];
    if (!mk) { markProblem(`组 ${k} 的 family=${r.family} 在 markers 里没有口径`); continue; }
    rows.push({
      groupKey: k, page, landing, family: r.family, entry: r.entry,
      /* 复测腿绑身份：游客档量到的落点成员不能替 A 档的同一组落地对说话
         （A 档在 VIP 三页上也会落到 pages/profile/index，但那是另一批行）。 */
      identity: "guest",
      caseIds: ids, debtRows: ids.length,
      /* 成员来源必须写成机器可读字段而不是备注：判决"这一组凭什么在账上"要能被人复核（本仓库硬规矩）。
         fromOpsNarrowed = #67 的"被收窄出游客腿"路线；fromOpsEntireGuest = 2026-09-30 裁定 (a)
         的"整页游客断言"路线（条件见 opsRosterByPage() 的注释）；两者互斥（后者要求该页一行声明都没有）。 */
      memberSource: { fromOps: fromOps.length, fromRun: observed.length, fromOpsNarrowed: ent.narrowed.size, fromOpsEntireGuest: ent.entireGuest.size },
      memberBasis: ent.entireGuest.size ? "ops-entirely-undeclared-guest-assertions"
        : (ent.narrowed.size ? "ops-narrowed-out-of-guest-leg" : "run-observed-only"),
      memberBasisEvidence: {
        opsRowsOnPage: ent.rows,
        rowsWithoutIdentityDeclaration: ent.undeclared.size,
        rowsScopedOutOfGuestLeg: ent.narrowed.size,
        rowsScopedToGuestLegByDeclaration: Math.max(0, ent.rows - ent.undeclared.size - ent.narrowed.size),
        rule: ent.entireGuest.size
          ? "verify-guest-landing.mjs#ops-entirely-undeclared-guest-assertions（2026-09-30 裁定 (a)：该页 ops 行整页没有 identities 声明 ⇒ 按 r-exec-cli.mjs:161 游客腿仍在认领每一行 ⇒ 这些行自己就是这一落地对的证人）"
          : "verify-guest-landing.mjs#guestNoLongerClaims（#67：被收窄出游客腿的行才需要 GG-* 腿记账）",
      },
      landingMarker: mk.landingMarker, registerEntry: mk.registerEntry ?? null,
      guardCaseId: "GG-" + page.replace(/^subpackages\//, "").replace(/\//g, "-"),
      criterion: `游客（verifyLogin=not-logged-in）reLaunch('/${page}') 后 ${WINDOWS[0]}ms 内（复采 ${WINDOWS[1]}ms）栈顶 route === ${landing}`
        + `${mk.landingMarker}:present（证明落的是真页而不是空壳）`
        + (mk.registerEntry ? `${mk.registerEntry}:present（裁定要「未登录须引导到注册」⇒ 默认态就得露出注册入口）` : "")
        + `；采样时身份不是游客的落点不作证`,
      why: pol.$ruling,
    });
  }
  console.log("GUEST_LAND_ROSTER 组=" + rows.length + "（成员来自 ops 的=" + opsSourced + " 只来自跑测的=" + observedOnly + "）成员行次合计=" + debt + "｜跑测观察并集组数=" + gkeys.length);
  /* 裁定 (a) 的命中面单独打一行：谁靠新路线进的账、几行，必须可见，不许混在"成员来自 ops 的"里蒙过去。 */
  console.log("GUEST_LAND_OPS_ENTIRE_GUEST=" + entireGuestGroups + " 组 / " + entireGuestRows + " 行（该页 ops 行整页没有 identities 声明 ⇒ 游客腿一行都没被收窄 ⇒ 2026-09-30 裁定 (a) 计为证人）"
    + (entireGuestPages.length ? "：" + entireGuestPages.join("，") : "（无）"));

  /* 守恒独立复算一遍"应有的成员数"：循环里任何一次 continue（缺 markers 口径、成员为空）
     都会把该组的成员从 debt 里丢掉 ⇒ 复算与累加不等就报红。恒等式（sum==累加）永远绿，不写那种。
     复算走的是同一个 rosterOf()（同一个成员来源），所以它检的是"循环有没有漏组"，不是第二套口径。 */
  let expect = 0;
  for (const k of pkeys) {
    const [page] = k.split(" → ");
    expect += new Set([...rosterOf(page).ids, ...(groups[k] || [])].filter(Boolean)).size;
  }
  const sum = expect;
  if (sum !== debt) markProblem(`名册漏记：按 policy 应覆盖 ${sum} 行，实际进了 ${debt} 行 ⇒ 有组被跳过（缺 markers 口径或成员为空），那些行的债从账上掉了`);
  /* "booked 却拍不了"是本轮的病灶（§11）：账本一旦写出，每一组都必须当场量得到证人。
     这里不比对旧文件（旧 booked 属于别的调用输入），只把这条不变式钉死：rows 与 policy 组数之差
     必须等于被 continue 掉的组数，且那种情况一律已经进 problems ⇒ 不许有"账本比 roster 多"的静默状态。 */
  if (rows.length !== pkeys.length) {
    markProblem(`roster 组=${rows.length} ≠ policy 裁定组=${pkeys.length} ⇒ 有裁定出不了腿（这一组要么补证人要么改裁定，不许留着一本拍不了的账本）：`
      + pkeys.filter((k) => !rows.some((x) => x.groupKey === k)).join(" / "));
  }
  const ids = rows.map((r) => r.guardCaseId);
  if (new Set(ids).size !== ids.length) markProblem("guardCaseId 撞号（一页两号会让复测腿归属不清）");
  /* 载具能不能量这条判据：exec 语料里 toast 从来没被采到过 ⇒ 任何 criterion 提 toast 都是永不会成功的一条。 */
  const anyToast = (triItems || []).some((it) => it && it.toast);
  if (!anyToast && rows.some((r) => /toast/i.test(r.criterion))) markProblem("判据里出现了 toast，而本载具的 toast 字段实测恒空");
  return { pol, rows, groupCount: gkeys.length, debtRows: debt, generatedAt: new Date().toISOString() };
}

/* ---------- 三态：booked + measured 合起来才是结论（纯函数在 guest-landing-status.mjs，门禁共用） ---------- */
import { landingStatus } from "./guest-landing-status.mjs";


/* ---------- mode=measure ---------- */
function measure(plan) {
  /* --only 让这条腿能只复测某几组（例如量出 MEASURED-DRIFT 的那一组要定性：
     稳定漂移还是竞态）；--repeat 决定同一组连测几次。 */
  const only = (arg("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const REPEAT = Math.max(1, Number(arg("repeat", "1")) || 1);
  const rows = only.length ? plan.rows.filter((r) => only.includes(r.guardCaseId)) : plan.rows;
  if (only.length && rows.length !== only.length) {
    console.log("GUEST_LANDING=FAIL reason=--only 里有对不上的 guardCaseId（请求 " + only.length + " 组，命中 " + rows.length + " 组）：" + only.filter((o) => !rows.some((r) => r.guardCaseId === o)).join(","));
    process.exit(2);
  }
  const cap = assertGuestCapable(REPO, PROJECT, { allow: true });
  const band = readApiMode(PROJECT);
  const out = { mode: "measure", generatedAt: new Date().toISOString(), project: arg("project"), band: (band.mode || "?") + "@" + (band.sha8 || "?"), guestCapable: cap.ok === true, repeat: REPEAT, rows: [] };
  writeFileSync(MEASURED, JSON.stringify(out, null, 1));
  for (const r of rows) {
    const samples = [];
    for (let pass = 0; pass < REPEAT; pass++) {
      renewUi({ owner: OWNER, batch: "R7" });
      clearSession({ project: PROJECT });
      openPage("/" + r.page, "", { project: PROJECT });
      let landing = "", identity = "", markers = {}, waited = 0;
      for (const w of WINDOWS) {
        sleep(w - waited); waited = w;
        landing = String(routeStack({ project: PROJECT }) || "").split("|").filter(Boolean).pop() || "";
        identity = String(verifyLogin({ project: PROJECT }) || "");
        if (landing === r.landing) break;
      }
      markers[r.landingMarker] = nodeCount(r.landingMarker, { project: PROJECT });
      if (r.registerEntry) markers[r.registerEntry] = nodeCount(r.registerEntry, { project: PROJECT });
      samples.push({ landing, identity, markers, waitedMs: waited });
    }
    const stable = new Set(samples.map((s) => s.landing)).size === 1;
    const stableText = stable ? "yes" : "NO(所有落点: " + samples.map((x) => x.landing).join(" | ") + ")";
    const s0 = samples[0];
    out.rows.push({ groupKey: r.groupKey, guardCaseId: r.guardCaseId, measuredLanding: s0.landing, identity: s0.identity, markers: s0.markers, waitedMs: s0.waitedMs, samples, stable, measuredAt: new Date().toISOString(), band: out.band });
    /* 逐行落盘：中途掉链子时，已量到的行仍然是证据（整批只在最后写盘 = 一崩就没跑过）。 */
    writeFileSync(MEASURED, JSON.stringify(out, null, 1));
    console.log(`  LANDING ${r.page} → ${s0.landing || "(空)"} 身份=${s0.identity} 连测${REPEAT}次落点一致=${stableText} ${Object.entries(s0.markers).map(([k, v]) => k + ":" + v).join(" ")}`);
  }
  console.log(`GUEST_LANDING_MEASURED=${out.rows.length} 档=${out.band} 全部落点稳定=${out.rows.every((x) => x.stable) ? "yes" : "NO"} → ${MEASURED}`);
}

/* ---------- 主流程 ---------- */
const plan = buildPlan();
let anchorsOk = 0, anchorsBad = 0;
for (const a of (plan.pol.anchors || [])) {
  const err = checkAnchor(a);
  anchorsBad += err ? 1 : 0; anchorsOk += err ? 0 : 1;
  if (err) markProblem("锚点不可核：" + err);
}
if (!plan.pol.anchors) markProblem("policy 没有 anchors 字段 ⇒ 依据全是裸文字，没人能复核（不许用计数蒙过去）");
if (MODE === "measure") {
  if (problems.length) { console.log("GUEST_LANDING=FAIL 先修这几条再来量（带病出腿 = 白拿租约）：\n  " + problems.join("\n  ")); process.exit(2); }
  if (heldLeases({ excludeOwner: OWNER }).length) { console.log("GUEST_LANDING=BLOCKED reason=UI 租约被占（等前一腿收尾，不抢锁）"); process.exit(3); }
  acquireUi({ owner: OWNER, batch: "R7" });
  try { measure(plan); } finally { try { releaseUi({ owner: OWNER }); } catch (e) { /* 退出路径上的释放失败不该改判决 */ } }
}
writeFileSync(BOOK_OUT, JSON.stringify({
  generatedAt: plan.generatedAt, source: `${arg("policy")} + ${arg("triage")}`,
  ruling: plan.pol.$ruling, groups: plan.groupCount, debtRows: plan.debtRows,
  anchorsOk, anchorsBad, carrier: `scripts/qa/verify-guest-landing.mjs --mode measure --project ${arg("project")}`,
  measuredFile: "reports/audit/round-7/guest-landing-measured.json", rows: plan.rows,
}, null, 1));
const st = landingStatus(plan, existsSync(MEASURED) ? JSON.parse(readFileSync(MEASURED, "utf8")) : null);
const cnt = {};
for (const r of st) cnt[r.status] = (cnt[r.status] || 0) + 1;
console.log(`GUEST_LANDING groups=${plan.groupCount} 覆盖欠款行=${plan.debtRows} 锚点可核=${anchorsOk}（不可核 ${anchorsBad}）`);
console.log("  状态分布 " + (Object.keys(cnt).length ? Object.entries(cnt).map(([k, v]) => k + "=" + v).join(" ") : "空"));
console.log("  booked → " + BOOK_OUT);
if (problems.length) {
  console.log(`GUEST_LANDING_RESULT=FAIL problems=${problems.length}`);
  for (const p of problems) console.log("  ✗ " + p);
  process.exit(2);
}
console.log("GUEST_LANDING_RESULT=OK（每组都有具名复测腿；BOOKED/MEASURED-* 非 CLOSED 一律不算结案）");
process.exit(0);
