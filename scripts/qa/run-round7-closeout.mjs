#!/usr/bin/env node
/** round-7 收尾驱动器：把 NOTES §128 那六步"队列跑完之后要做的事"变成一条可重跑的命令。
 *
 *  为什么要有它而不是靠人记：这一轮的教训一再是同一条 —— 结论没有载具就会走样（"我记得我做完了"）。
 *  收尾有 6 大步、十几条门，靠上下文记忆排队执行最容易漏最后一步（漏的就是终报与提交）。
 *
 *  三条硬规矩：
 *   1) 设备正在被用（heldLeases 非空）⇒ 拒绝启动。本轮我已经两次用"只读预览"顶掉正在跑的腿；
 *   2) 默认只跑**只读门**；会写盘/写库的步骤（帧入语料、判决落台账、G8、G9、终报）要显式点名
 *      --allow-write / --with-g8 / --with-report，且每一步都打印它自己的读数，不参与"看起来绿了"；
 *   3) 步骤清单在启动时逐个核 `existsSync`，写错一个文件名就直接 FAIL，绝不静默跳过一步；
 *      每一步转发的旗标也逐个对着消费者自己的 argv 解析核一遍 —— 消费者不读的旗标不报错、只被静默忽略
 *      （0f82b4c1 那一族：--round 传给不认它的消费者，门"绿着"量的却是它的默认目录）。
 *
 *  用法：node scripts/qa/run-round7-closeout.mjs [--list] [--allow-write] [--with-g8] [--with-report]
 *                                             [--round round-7] [--only a,b] [--strict-triage]
 *                                             [--queue-plan scripts/qa/ui-queue.round8-stage8.json]
 *
 *  关于 queue-tally（收尾第一步）：一轮队列不是一条 ledger，而是"红腿被诊断后续跑"留下的多条。
 *  stage-8 现量就散在 5 本账里（ui-queue-stage8 / …tail / …tail2 / …tail3 / …tail4）。
 *  旧实现在轮目录根与 ui-queue/ 两个固定位置里"找到的第一本"就是它读的那一轮 —— 2026-09-27 实测打出
 *  `腿=14 分布={"OK":12,"ADVISORY_RED":1,"FAIL":1} 红腿=tour-B-real-stage7`：那是上一波（stage-7）的账，
 *  拿它当本波结论就是"绿给了错的波次"。6bbe2fdc 修过一次路径、修的是"读空"，没修"读错了波次"，
 *  而队列一分成多本就又过期了。现在按腿名跨 ledger 对账：取**最晚真正跑过它的那本**的结果、
 *  守恒对着权威计划的腿名点齐、保留每腿的重跑历史、读不到/读空一律红 —— 见 reconcileQueueTally()。
 *
 *  被 import 时（DIRECT=false）只导出对账函数，不执行任何步骤：跑步骤要 spawnSync 消费者、还会走设备租约检查，
 *  库模式一行都不该碰。这也是"负对照能在合成台账根上单独跑对账"的载体。
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { heldLeases } from "./ui-lease.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/* 直接跑 == 执行收尾；被 import == 只要 reconcileQueueTally 这一个导出，argv 一律不读，
   免得上层脚本的参数把这一步的默认口径改掉（量了调用者没点名的东西，同 0f82b4c1 那一族）。 */
const SELF = fileURLToPath(import.meta.url);
const DIRECT = (() => { const e = process.argv[1] ? resolve(process.argv[1]) : ""; return e !== "" && (process.platform === "win32" ? e.toLowerCase() === SELF.toLowerCase() : e === SELF); })();
const argv = DIRECT ? process.argv.slice(2) : [];
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
{
  const KNOWN = ["list", "allow-write", "with-g8", "with-report", "round", "only", "strict-triage", "ops", "plans", "queue-plan"];
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("CLOSEOUT_RESULT=FAIL reason=不认识的旗标 " + bad.join(",") + " ⇒ 会被忽略而少跑步骤"); process.exit(2); }
}
const ROUND = arg("round", "round-7");
const ROUND_REL = "reports/audit/" + ROUND;   // 本轮台账根：queue-tally 在这里按前缀现量发现 ledger，不写死子目录名

/* ────────────────────────────────────────────────────────────────────────────────
   queue-tally：跨多条 queue-state 台账的真对账（导出 = 能被单独跑、单独审）

   一轮队列不是一本 ledger，而是「红腿被诊断后续跑」留下的好几本（本波 stage-8 现量散在 5 本）。
   旧实现在两个固定位置里取「找到的第一本」，于是打出过 `腿=14 … 红腿=tour-B-real-stage7` ——
   那是上一波的账，拿它当本波结论就是「绿给了错的波次」（6bbe2fdc 修过一次路径、b29303da 修过一次读空，
   两个坑这次都在这里的负对照里重演）。五条规矩：
    1) 按【腿名】取「最晚真跑过它的那本」的结果（TERMINAL_STATUS 才算跑过）；早期 NOT_RUN 会被后期 OK 顶掉；
    2) 守恒的轴是【权威计划的腿名】而不是某本台账的条数：计划腿 + $dropped 腿 每条恰好落进一个桶，
       $dropped 单独报 DROPPED=n 并带上它记的 disposition，一条腿台账里查无此处 ⇒ 显式 MISSING=n（绝不是默认 0）；
    3) 早期失败不许消失：每腿留重跑历史（尝试数 / 逐次状态+台账名 / 红过几次才绿），
       「修过之后才绿」和「一直绿」是不同的结论，读数必须能区分；
    4) 判决保持严格：FAIL / TIMEOUT / NOT_RUN / 未收口 / MISSING ⇒ 红；ADVISORY_RED 单独成桶但同样计入红；
    5) 台账靠发现（轮目录下 ui-queue 开头的每本子目录里的 queue-state 系列 JSON），不写死目录名；
       任何一本读不出来 / 不是合法 JSON / 没有 legs 数组 / legs 为空 / 腿没有 name ⇒ 大声红，
       不「读空却照常往下跑」。
   ──────────────────────────────────────────────────────────────────────────────── */
const QUEUE_PLAN_DEFAULT = "scripts/qa/ui-queue.round8-stage8.json";
const LEDGER_DIR_RE = /^ui-queue/;
const LEDGER_FILE_RE = /^queue-state.*\.json$/;
const TERMINAL_STATUS = new Set(["OK", "FAIL", "TIMEOUT", "ADVISORY_RED"]);

/** @param {{roundDirRel?:string, planRel?:string, repo?:string}} o 台账根与权威计划都可点名（负对照要在合成根上跑）。 */
export function reconcileQueueTally(o = {}) {
  const repo = o.repo || REPO;
  const roundDirRel = String(o.roundDirRel || ROUND_REL);
  const planRel = String(o.planRel || QUEUE_PLAN_DEFAULT);
  const L = [];
  const relOf = (p) => String(p).split("\\").join("/").replace(String(repo).split("\\").join("/") + "/", "");
  const abs = (p) => (isAbsolute(p) ? p : join(repo, p));
  const rootRelOut = relOf(abs(roundDirRel));   // 打印一律用仓内相对路径：溯源读数不许带机器名（同 run-ui-queue 的 relOf 口径）
  const planRelOut = relOf(abs(planRel));
  const stamp = (x) => { const t = Date.parse(String(x || "")); return Number.isFinite(t) ? t : null; };
  const nothing = () => ({ lines: L, ledgers: [], planLegs: 0, universe: 0, resolved: new Map(), buckets: {}, hardFail: true, fail: true, notRun: 0 });
  const done = (r) => {
    const b = r.buckets || {};
    const reds = [...(b.RED || []), ...(b.NOT_RAN || []), ...(b.MISSING || []), ...(b.ADVISORY_RED || [])];
    if (r.hardFail) {
      r.fail = true;
      r.line = "CLOSEOUT_STEP queue-tally :: 对账没成立（计划/台账读空或读坏，见上面 QUEUE_TALLY_RESULT=FAIL 的 reason）⇒ 这一步记一次红，不许降级成「没有红腿」";
      L.push("CLOSEOUT_TALLY=FAIL");
      return r;
    }
    r.fail = reds.length > 0;
    r.notRun = (b.NOT_RAN || []).length + (b.MISSING || []).length;
    r.line = "CLOSEOUT_STEP queue-tally :: 台账=" + r.ledgers.filter((x) => x.inWave).length + "本（扫到 " + r.ledgers.length + "）" +
      " 计划腿=" + r.planLegs + " 守恒域=" + r.universe + " OK=" + (b.OK || []).length +
      " 红腿=" + ((b.RED || []).join(",") || "无") + " 未跑出=" + ((b.NOT_RAN || []).join(",") || "无") +
      " MISSING=" + (b.MISSING || []).length + " DROPPED=" + (b.DROPPED || []).length + " 建议性红=" + (b.ADVISORY_RED || []).length;
    L.push(r.fail ? "CLOSEOUT_TALLY=FAIL（逐条点名见 QUEUE_TALLY_MAP / QUEUE_TALLY_LEG / QUEUE_TALLY_RERUN / QUEUE_TALLY_CONSERVE）" : "CLOSEOUT_TALLY=OK");
    return r;
  };

  /* ── 0) 权威计划：守恒的轴。读不到 / 读空 / 形状不对 ⇒ 红（没有轴就无从「点齐」） ── */
  const planAbs = abs(planRel);
  let plan = null;
  if (!existsSync(planAbs)) { L.push("QUEUE_TALLY_RESULT=FAIL reason=权威计划读不到 " + planRelOut + " ⇒ 守恒域是空的，不许读成「没有腿要交代」"); return done(nothing()); }
  try { plan = JSON.parse(readFileSync(planAbs, "utf8")); }
  catch (e) { L.push("QUEUE_TALLY_RESULT=FAIL reason=权威计划 " + planRelOut + " 不是合法 JSON：" + String(e.message).slice(0, 140)); return done(nothing()); }
  const planLegsRaw = plan && plan.legs;
  if (!Array.isArray(planLegsRaw) || !planLegsRaw.length) { L.push("QUEUE_TALLY_RESULT=FAIL reason=权威计划 " + planRelOut + " 的 legs 数组缺失或为空 ⇒ 空扫描集不得判绿"); return done(nothing()); }
  const droppedRaw = Array.isArray(plan.$dropped) ? plan.$dropped : [];
  const planNames = [];
  const advNames = new Set();
  const nameBad = [];
  for (const [i, lg] of planLegsRaw.entries()) {
    const n = lg && typeof lg.name === "string" ? lg.name.trim() : "";
    if (!n) { nameBad.push("legs[" + i + "]"); continue; }
    if (lg.advisory === true) advNames.add(n);
    planNames.push(n);
  }
  const droppedNames = [];
  for (const [i, d] of droppedRaw.entries()) {
    const n = d && typeof d.name === "string" ? d.name.trim() : "";
    if (!n) { nameBad.push("$dropped[" + i + "]"); continue; }
    droppedNames.push(n);
  }
  const dupOf = (a) => a.filter((x, i) => a.indexOf(x) !== i);
  const dupPlan = [...new Set(dupOf(planNames))];
  const dupDrop = [...new Set(dupOf(droppedNames))];
  const crossDup = planNames.filter((x) => droppedNames.includes(x));
  const noDisp = droppedRaw.filter((d) => !(d && d.disposition && String(d.disposition).trim())).map((d, i) => (d && d.name) || "$dropped[" + i + "]");
  L.push("QUEUE_TALLY_PLAN " + planRelOut + " :: 计划腿=" + planNames.length + " $dropped=" + droppedNames.length +
    (droppedNames.length ? "（" + droppedNames.join(",") + "）" : "") + " 计划内标 advisory 的腿=" + advNames.size + " 守恒域=" + (planNames.length + droppedNames.length));
  if (nameBad.length || dupPlan.length || dupDrop.length || crossDup.length || noDisp.length) {
    if (nameBad.length) L.push("QUEUE_TALLY_RESULT=FAIL reason=计划里有没点名的腿（" + nameBad.join(",") + "）⇒ 无法归到守恒的某一条");
    if (dupPlan.length) L.push("QUEUE_TALLY_RESULT=FAIL reason=计划腿名重复（" + dupPlan.join(",") + "）⇒「每条恰好算一次」无从成立");
    if (dupDrop.length) L.push("QUEUE_TALLY_RESULT=FAIL reason=$dropped 腿名重复（" + dupDrop.join(",") + "）");
    if (crossDup.length) L.push("QUEUE_TALLY_RESULT=FAIL reason=同一腿既在 legs 又在 $dropped（" + crossDup.join(",") + "）⇒ 会被算两次");
    if (noDisp.length) L.push("QUEUE_TALLY_RESULT=FAIL reason=$dropped 这些腿没记 disposition（" + noDisp.join(",") + "）⇒ 撤腿没有去向，等于静默少一条");
    return done(nothing());
  }
  const universe = new Set([...planNames, ...droppedNames]);

  /* ── 1) 台账发现：不写死任何目录名；读不出来 / 没有 legs 数组 / legs 为空 / 腿没名字 ⇒ 大声红 ── */
  const rootAbs = abs(roundDirRel);
  const problems = [];
  const found = [];
  if (!existsSync(rootAbs)) problems.push("台账根不存在：" + rootRelOut);
  else {
    const dirs = [""].concat(readdirSync(rootAbs).filter((d) => { try { return LEDGER_DIR_RE.test(d) && statSync(join(rootAbs, d)).isDirectory(); } catch { return false; } }).sort());
    for (const d of dirs) { let fs2 = []; try { fs2 = readdirSync(join(rootAbs, d)).filter((x) => LEDGER_FILE_RE.test(x)).sort(); } catch (e) { problems.push(relOf(join(rootAbs, d)) + " 目录读不出来：" + String(e.message).slice(0, 100)); } for (const f of fs2) found.push(join(rootAbs, d, f)); }
  }
  if (!found.length) problems.push("在 " + rootRelOut + "/ui-queue*/queue-state*.json 与轮目录根下一本 ledger 都没扫到 ⇒ 本轮腿账是空的，不许当成「没有红腿」");
  const ledgers = [];
  for (const fp of found) {
    const rel = relOf(fp);
    let j = null;
    try { j = JSON.parse(readFileSync(fp, "utf8")); }
    catch (e) { problems.push(rel + " 读不出来/不是合法 JSON：" + String(e.message).slice(0, 140) + " ⇒ 这一本的账是不可知的，不能当成「没红」"); continue; }
    if (!j || !Array.isArray(j.legs)) { problems.push(rel + " 没有 legs 数组（实得 " + (j ? typeof j.legs : "空文件/非对象") + "）⇒ 读空不等于没有红腿"); continue; }
    if (!j.legs.length) { problems.push(rel + " 的 legs 数组是空的 ⇒ 空账本不产判决"); continue; }
    const bad = j.legs.filter((x) => !x || typeof x.name !== "string" || !x.name.trim()).length;
    if (bad) problems.push(rel + " 有 " + bad + " 条腿没有 name ⇒ 无法归到计划的某一条，宁可判红");
    const started = stamp(j.startedAt);
    const finished = stamp(j.finishedAt);
    const known = Math.max(started === null ? -Infinity : started, finished === null ? -Infinity : finished);
    let mt = 0; try { mt = statSync(fp).mtimeMs || 0; } catch { mt = 0; }
    ledgers.push({
      rel, dir: rel.split("/").slice(-2)[0], startedAt: j.startedAt || null, finishedAt: j.finishedAt || null,
      result: j.result === undefined ? null : j.result,
      order: Number.isFinite(known) ? known : mt,
      orderFrom: finished !== null ? "finishedAt" : (started !== null ? "startedAt（这本还没写 finishedAt）" : "文件 mtime（这本两个时间戳都没写，只能按 mtime 排）"),
      inFlight: !j.finishedAt,
      legs: j.legs.map((x) => ({ name: x.name.trim(), status: String(x.status || ""), exitCode: x.exitCode === undefined ? null : x.exitCode, log: x.log || null })),
      dist: j.legs.reduce((a, x) => { const k = String(x.status || "?"); a[k] = (a[k] || 0) + 1; return a; }, {}),
    });
  }
  ledgers.sort((a, b) => a.order - b.order || String(a.rel).localeCompare(String(b.rel)));
  for (const ld of ledgers) ld.inWave = ld.legs.some((x) => universe.has(x.name));
  const inWave = ledgers.filter((x) => x.inWave);
  const outWave = ledgers.filter((x) => !x.inWave);
  const warnings = [];
  L.push("QUEUE_TALLY_DISCOVER 扫到=" + ledgers.length + " 本含本波计划腿=" + inWave.length + " 其它波次=" + outWave.length +
    " 根=" + rootRelOut + "/ui-queue*/queue-state*.json（目录名按前缀现量发现，未写死这五个名字）");
  if (outWave.length) L.push("QUEUE_TALLY_OUT_OF_WAVE 忽略=" + outWave.length + " 本（一条本波计划的腿都不含 —— 旧实现读到这一类就会「绿给错的波次」）：" +
    outWave.map((x) => x.rel.replace(rootRelOut + "/", "").replace(/^reports\/audit\/[A-Za-z0-9_-]+\//, "")).slice(0, 6).join(", ") + (outWave.length > 6 ? " …（全量在 QUEUE_TALLY_SUMMARY.ledgersSkippedOutOfWave）" : ""));
  for (const x of ledgers) if (String(x.orderFrom).indexOf("mtime") >= 0) warnings.push(x.rel + " 没有任何时间戳，按文件 mtime 排序（跨机复现时顺序可能不同，读数只算现场快照）");
  if (problems.length) {
    for (const p of problems) L.push("QUEUE_TALLY_LEDGER_PROBLEM " + p);
    L.push("QUEUE_TALLY_RESULT=FAIL reason=发现的 ledger 里有 " + problems.length + " 本不可读/形状不对 ⇒ 不许拿「少读的那本」当「没有红腿」");
    const r = nothing(); r.ledgers = ledgers; r.planLegs = planNames.length; r.universe = universe.size;
    return done(r);
  }
  if (!inWave.length) {
    L.push("QUEUE_TALLY_RESULT=FAIL reason=扫到 " + ledgers.length + " 本 ledger，但没有一本含本波计划的腿名 ⇒ 本波一条腿都没入账（读空≠没有红腿）");
    const r = nothing(); r.ledgers = ledgers; r.planLegs = planNames.length; r.universe = universe.size;
    return done(r);
  }
  for (const [i, x] of inWave.entries()) L.push("QUEUE_TALLY_LEDGER " + (i + 1) + "/" + inWave.length + " " + x.dir + " :: 起=" + (x.startedAt || "?") + " 止=" + (x.finishedAt || "（未写 ⇒ 这本还在跑）") +
    " result=" + (x.result === null ? "（未写）" : x.result) + " 腿=" + x.legs.length + " 分布=" + JSON.stringify(x.dist) + " 排序键=" + x.orderFrom);
  const flying = inWave.filter((x) => x.inFlight).map((x) => x.dir);
  if (flying.length) L.push("QUEUE_TALLY_INFLIGHT " + flying.join(",") + " 还没写 finishedAt ⇒ 本波未收口，这一趟是现场快照，不许读成「整波跑完」");

  /* ── 2) 逐腿解析：最晚「真跑过它」的那本说了算；早期失败留在历史里，不折叠 ── */
  const namesAll = planNames.concat(droppedNames);
  const entries = new Map(namesAll.map((n) => [n, []]));
  for (const x of inWave) for (const e of x.legs) { if (!entries.has(e.name)) continue; entries.get(e.name).push({ name: e.name, status: e.status, exitCode: e.exitCode, ledger: x.dir, order: x.order }); }
  const short = (s) => String(s).replace(/^ui-queue-stage8/, "stage8").replace(/^ui-queue-/, "").replace(/^ui-queue$/, "ui-queue");
  const resolved = new Map();
  const buckets = { OK: [], ADVISORY_RED: [], RED: [], NOT_RAN: [], MISSING: [], DROPPED: [] };
  for (const name of namesAll) {
    const es = entries.get(name) || [];
    const term = es.filter((x) => TERMINAL_STATUS.has(x.status));
    const pick = term.length ? term[term.length - 1] : (es.length ? es[es.length - 1] : null);
    const isDrop = droppedNames.includes(name);
    const redTerm = term.filter((x) => x.status === "FAIL" || x.status === "TIMEOUT").length;
    const advTerm = term.filter((x) => x.status === "ADVISORY_RED").length;
    const rec = {
      name, kind: isDrop ? "DROPPED" : "PLAN", result: pick ? pick.status : "MISSING", from: pick ? pick.ledger : null,
      exitCode: pick ? pick.exitCode : null, attempts: term.length, sightings: es.length,
      redAttempts: redTerm, advAttempts: advTerm,
      greenAfterReds: !!pick && pick.status === "OK" && redTerm + advTerm > 0,
      history: es.map((x) => x.status + "@" + short(x.ledger) + (x.exitCode === null ? "" : "(exit" + x.exitCode + ")")),
      advised: advNames.has(name),
    };
    resolved.set(name, rec);
    if (isDrop) buckets.DROPPED.push(name);
    else if (rec.result === "MISSING") buckets.MISSING.push(name);
    else if (rec.result === "OK") buckets.OK.push(name);
    else if (rec.result === "ADVISORY_RED") buckets.ADVISORY_RED.push(name);
    else if (rec.result === "FAIL" || rec.result === "TIMEOUT") buckets.RED.push(name);
    else buckets.NOT_RAN.push(name);
  }

  /* ── 3) 守恒：计划腿 + $dropped 腿 每条恰好一个桶；MISSING 是算出来的显式数字，不是默认的 0 ── */
  const acct = buckets.OK.length + buckets.ADVISORY_RED.length + buckets.RED.length + buckets.NOT_RAN.length + buckets.MISSING.length;
  const u = universe.size;
  const resolvedN = acct - buckets.MISSING.length;
  const idSum = resolvedN + buckets.DROPPED.length + buckets.MISSING.length;
  L.push("QUEUE_TALLY_CONSERVE 守恒域=" + u + "（计划腿 " + planNames.length + " + $dropped " + droppedNames.length + "） 桶内逐条点名=" + (acct + buckets.DROPPED.length) + "/" + u + " " +
    (acct + buckets.DROPPED.length === u ? "CONSERVED" : "LEAKED（有腿没进任何桶或被算两次）") +
    " ｜ OK=" + buckets.OK.length + " ADVISORY_RED=" + buckets.ADVISORY_RED.length + " FAIL/TIMEOUT=" + buckets.RED.length + " 没跑出结果=" + buckets.NOT_RAN.length + " MISSING=" + buckets.MISSING.length + " DROPPED=" + buckets.DROPPED.length);
  L.push("QUEUE_TALLY_ACCOUNT resolved+dropped+missing=" + resolvedN + "+" + buckets.DROPPED.length + "+" + buckets.MISSING.length + "=" + idSum + " == planLegs(守恒域)=" + u + " " + (idSum === u ? "OK" : "MISMATCH"));

  /* ── 4) 读数：解析表 / 每腿明细 / 重跑历史 / 注销腿 / 计划外腿 ── */
  L.push("QUEUE_TALLY_MAP " + planNames.map((n) => { const r = resolved.get(n); return n + "=" + r.result + (r.from ? "@" + short(r.from) : "（台账查无此腿）"); }).join(" "));
  for (const n of planNames) {
    const r = resolved.get(n);
    if (r.result === "OK" && r.attempts <= 1) continue;
    L.push("QUEUE_TALLY_LEG " + n + " :: 结果=" + r.result + (r.from ? "@" + short(r.from) : "") + (r.exitCode === null ? "" : "(exit" + r.exitCode + ")") +
      " 跑出结果=" + r.attempts + "次 其中红=" + (r.redAttempts + r.advAttempts) + "次 历史=" + (r.history.join(" → ") || "ledger 里没有这一腿") + (r.advised ? " ［计划里标 advisory：它跑红时单独记 ADVISORY_RED 成桶、不折叠成 OK；整波判决仍按严格口径算红。没跑出结果则仍算未跑，不享受 advisory］" : ""));
  }
  const rerun = planNames.map((n) => resolved.get(n)).filter((r) => r.attempts > 1 || r.redAttempts + r.advAttempts > 0);
  L.push("QUEUE_TALLY_RERUN 多次尝试或红过的腿=" + rerun.length + (rerun.length ? " :: " + rerun.map((r) => r.name + " 尝试" + r.attempts + "[" + r.history.join("→") + "]" +
    (r.greenAfterReds ? "（红过 " + (r.redAttempts + r.advAttempts) + " 次才转绿 ⇒ 这是「修过之后才绿」，不是「一直绿」）" : "")).join(" ｜ ") : ""));
  for (const d of droppedRaw) {
    const r = resolved.get(String(d.name).trim());
    L.push("QUEUE_TALLY_DROPPED " + d.name + " :: disposition=" + d.disposition + (d.covered_by ? " 由 " + d.covered_by + " 承接" : "") +
      " 台账历史=" + ((r && r.history.length) ? r.history.join(" → ") : "（从没上过台账）") + " ⇒ 注销不折叠：撤一条腿要看得见它被撤，也看得见撤之前红过几次");
  }
  const extra = [...new Set(inWave.flatMap((x) => x.legs.map((y) => y.name)))].filter((n) => !universe.has(n));
  if (extra.length) L.push("QUEUE_TALLY_OUT_OF_PLAN n=" + extra.length + " :: " + extra.join(",") + "（续跑台账自己新加的腿名，权威计划里没有 ⇒ 不进守恒、也不许替计划里的腿作答）");
  for (const w of warnings) L.push("QUEUE_TALLY_WARN " + w);

  /* ── 5) 判决 + 给终报消费的机器可读行 ── */
  L.push("QUEUE_TALLY_RED_NAMES FAIL/TIMEOUT=" + (buckets.RED.join(",") || "无") + " NOT_RUN/未收口=" + (buckets.NOT_RAN.join(",") || "无") + " MISSING=" + (buckets.MISSING.join(",") || "无") + " ADVISORY_RED=" + (buckets.ADVISORY_RED.join(",") || "无"));
  const reasons = [];
  if (buckets.RED.length) reasons.push("红腿 " + buckets.RED.length + " 条");
  if (buckets.NOT_RAN.length) reasons.push("没跑出结果 " + buckets.NOT_RAN.length + " 条");
  if (buckets.MISSING.length) reasons.push("计划腿查无台账 " + buckets.MISSING.length + " 条");
  if (buckets.ADVISORY_RED.length) reasons.push("建议性红 " + buckets.ADVISORY_RED.length + " 条");
  if (flying.length) reasons.push("台账在跑未收口");
  const summary = {
    plan: planRelOut, root: rootRelOut, planLegs: planNames.length, dropped: droppedNames.length, universe: u,
    ledgersInWave: inWave.map((x) => ({ dir: x.dir, legs: x.legs.length, inFlight: x.inFlight, dist: x.dist })),
    ledgersSkippedOutOfWave: outWave.map((x) => x.rel.replace(rootRelOut + "/", "")),
    OK: buckets.OK, ADVISORY_RED: buckets.ADVISORY_RED, RED: buckets.RED, NOT_RAN: buckets.NOT_RAN, MISSING: buckets.MISSING,
    DROPPED: droppedRaw.map((d) => ({ name: d.name, disposition: d.disposition, history: (resolved.get(String(d.name).trim()) || {}).history || [] })),
    outOfPlan: extra, conserved: acct + buckets.DROPPED.length === u, accountHolds: idSum === u,
    resultByLeg: Object.fromEntries(namesAll.map((k) => { const v = resolved.get(k); return [k, v.result + (v.from ? "@" + short(v.from) : "@(无台账)") + " 尝试" + v.attempts + " 红" + (v.redAttempts + v.advAttempts) + " [" + v.history.join(">") + "]"]; })),
  };
  L.push("QUEUE_TALLY_SUMMARY " + JSON.stringify(summary));
  L.push("QUEUE_TALLY_RESULT=" + (reasons.length ? "FAIL" : "OK") + (reasons.length ? " reason=" + reasons.join("；") + "（逐条点名见上）" : " 守恒域内每条腿都跑出 OK 且只算一次"));
  return done({ lines: L, ledgers, planLegs: planNames.length, universe: u, resolved, buckets, fail: false, notRun: 0 });
}
/* ──────────────────────────────────────────────────────────────────────────────── */

/* 步骤表：write=true 的步骤默认不跑（要 --allow-write）；device=true 的还要设备空着。 */
const STEPS = [
  { id: "queue-tally", kind: "check", note: "跨多条 queue-state 台账按腿名对账：解析表 + 对权威计划的腿名守恒（OK/红/MISSING/DROPPED 逐条点名）+ 每腿重跑历史；读空/读坏/有红/有未跑 ⇒ 这一步红" },
  { id: "exec-frames-to-corpus", file: "scripts/qa/exec-frames-to-corpus.mjs", kind: "gate", write: true, eachExecResults: true, args: [], note: "执行轮出的帧登记进语料库（#52）：按盘上真实存在的 exec-results.json 一条一步，identity 从结果文件里读" },
  { id: "client-unit-tests", file: "scripts/qa/run-client-tests.mjs", kind: "gate", write: true, args: [], note: "⑤ 的「全部门禁」含客户端单测：上一轮只在我手动 npx 时跑过一次、证据落在 tmp/（等于没交出去）；这个载具用同一颗 node 跑并把汇总与完整输出留档到 reports/，且要求 files/tests 汇总行齐全 + failed=0 + 退出码 0 三者同时成立才算过" },
  { id: "verify-evidence-corpus", file: "scripts/qa/verify-evidence-corpus.mjs", kind: "gate", args: [], note: "证据索引与盘上一致：路径存在、哈希一致（帧入账后必须复量）。消费者只读 --root/--scope/--short，压根没有轮次轴 ⇒ 原先转发的 --round 被静默忽略（同 0f82b4c1 那一族），现按它的真实口径收全量 reports/" },
  { id: "verdict-from-frames", file: "scripts/qa/verdict-from-frames.mjs", kind: "gate", write: true, args: [], note: "把帧级判决从证据里读出来（① 要的帧级终态）。消费者只读 --plan/--frames，两个默认值本身就落在本轮目录 ⇒ 传 --round 是假接线，去掉后量的东西一模一样" },
  { id: "audit-frame-verdicts", file: "scripts/qa/audit-frame-verdicts.mjs", kind: "gate", write: true, args: [], note: "帧判决的审计：有没有拿没背书的判决落账。它无条件写 frame-red-audit.md + cellplan-round7-frames-admissible.json（L210/L228）⇒ 必须 --allow-write 才允许跑；消费者只读 --frames/--project/--plan/--cellplan/--restore-from ⇒ 去掉假接线的 --round" },
  { id: "triage-exec-A-mock", file: "scripts/qa/triage-exec-failures.mjs", kind: "gate", args: ["--results", `reports/audit/${ROUND}/exec-A-mock-stage7/exec-results.json`, "--dist", "apps/client/dist/build/mp-weixin"], note: "A 刀语料分诊（词表可达 + unclassified=0 + 落地对）" },
  { id: "triage-exec-A-real", file: "scripts/qa/triage-exec-failures.mjs", kind: "gate", args: ["--results", `reports/audit/${ROUND}/exec-A-real-stage7/exec-results.json`, "--dist", "apps/client/dist/build/mp-weixin-real"], note: "真实刀 A 身份语料分诊：这一腿现量 875 行里有 1 条 FAILED 与 98 条非守恒跳过（欠前置配方 50 / 通道或选择器 5 / 没点名物件 6 / 禁触 4 / 盖章不可自动化 20），以前收尾只分诊 A-mock 与 guest-real ⇒ 这一腿的红和跳过从来没进过词表账" },
  { id: "triage-exec-guest-real", file: "scripts/qa/triage-exec-failures.mjs", kind: "gate", args: ["--results", `reports/audit/${ROUND}/exec-guest-real-stage7/exec-results.json`, "--dist", "apps/client/dist/build/mp-weixin-real"], note: "游客刀语料分诊（真实档）" },
  { id: "guest-landing-recheck", file: "scripts/qa/verify-guest-landing.mjs", kind: "gate", write: true, args: ["--mode", "measure", "--project", "apps/client/dist/build/mp-weixin-real"], note: "27 组游客落点逐页实测（GG-* 复测腿）：BOOKED/MEASURED-* 不算结案，只有这一条跑出 CLOSED，triage 的「未结案」才会归零" },
  { id: "verify-real-coverage", file: "scripts/qa/verify-real-coverage.mjs", kind: "gate", args: ["--round", ROUND], note: "真实模式覆盖守恒（含身份轴豁免读数）" },
  { id: "verify-logged-in-landing", file: "scripts/qa/verify-logged-in-landing.mjs", kind: "gate", args: ["--exec", "reports/audit/" + ROUND + "/exec-A-mock-stage7", "--exec", "reports/audit/" + ROUND + "/exec-A-real-stage7"], note: "④ 第 1 项裁定的机器载具：登录腿进登录页的落点按 loggedInLandings 判（导航计数那一半明说不判，不算过）" },
  { id: "verify-criteria-frame-debt", file: "scripts/qa/verify-criteria-frame-debt.mjs", kind: "gate", args: ["--strict"], note: "判据台欠帧的去向账（--strict：掉了去向就红）" },
  { id: "verify-frame-debt-coverage", file: "scripts/qa/verify-frame-debt-coverage.mjs", kind: "gate", args: ["--strict-src-only"], note: "台账未收口行的去向账（含源码级判点轴）" },
  { id: "verify-tab-bar-single-source", file: "scripts/qa/verify-tab-bar-single-source.mjs", kind: "gate", args: [], note: "④ 第 5 项的判点：面板字面量相加 == token" },
  { id: "verify-case-selectors-mock", file: "scripts/qa/verify-case-selectors-exist.mjs", kind: "gate", args: [], note: "点名物件在两档产物里成不成元素（mock 档）" },
  { id: "verify-case-selectors-real", file: "scripts/qa/verify-case-selectors-exist.mjs", kind: "gate", args: ["--band", "apps/client/dist/build/mp-weixin-real"], note: "同上，real 档" },
  { id: "g8-e2e", file: "scripts/qa/g8-e2e.cjs", kind: "gate", write: true, device: false, needs: "--with-g8", args: [], note: "十环真后端复跑（会写库：G8 产生的行按既定裁定保留并披露）" },
  { id: "g9-probe", file: "scripts/qa/g9-probe.cjs", kind: "gate", write: true, needs: "--with-g8", args: [], note: "素材普查复量" },
  { id: "land-verdicts-into-ledger", file: "scripts/qa/land-verdicts-into-ledger.mjs", kind: "gate", write: true, args: [], note: "帧级判决落台账：消费者只有 --apply（不传即 DRY，只打将改清单、落盘前自动备份）⇒ 原先的 --dry 没人读，是假接线；收尾里这一步出的就是那份 DRY 清单" },
  { id: "emit-round-report", file: "scripts/qa/emit-round-report.mjs", kind: "gate", write: true, needs: "--with-report", args: ["--round-dir", "reports/audit/" + ROUND], note: "带溯源终报（面板含本轮所有新门）。必须点名本轮 --round-dir：不传时消费者整套默认值都指 round-6（exec 权威件、报告文件名），本轮终报会被写进上一轮的文件里。台账/ops 仍走它自己的 round-6 默认值，那是它顶部注释里写明的跨轮权威件" },
  { id: "make-commit-list", file: "scripts/qa/make-commit-list.mjs", kind: "gate", write: true, needs: "--with-report", args: [], note: "显式路径提交清单（帧目录仍 HOLDBACK，交给人点名）。它 L140 无条件 writeFileSync 落 commit-manifest.json ⇒ 标 write:true，要 --allow-write 放行" },
];
/* ────────────────────────────────────────────────────────────────────────────────
   下面整段只在「直接跑收尾」时执行：它会 spawnSync 各消费者、读设备租约、最后 process.exit。
   被 import（DIRECT=false，例如负对照 harness 只要 reconcileQueueTally）时一行都不跑。
   函数体没有重新缩进 —— 这一段是原样搬进来的，缩进一动 git diff 就变成"整文件重写"，
   而这条文件正在被审计，可读的 diff 比好看的对齐重要。
   ──────────────────────────────────────────────────────────────────────────────── */
if (DIRECT) main();
function main() {
/* 手工列一条 exec 索引步骤覆盖不了本轮真实存在的多条执行腿（A-mock / A-real / guest-real / r8 补腿），
   而且现量发现过一个接线洞：这一步原先传 --round，而索引器只认 --results/--corpus ⇒ 一跑到这里就红。
   改成按盘上实际存在的 exec-* 结果目录展开，一条腿一步，identity 从结果文件里读而不是我手填。 */
{
  const roundRel = "reports/audit/" + ROUND;
  const roundAbs = join(REPO, roundRel);
  const tplIdx = STEPS.findIndex((s) => s.eachExecResults);
  if (tplIdx >= 0) {
    const tpl = STEPS[tplIdx];
    const made = [];
    const legs = existsSync(roundAbs) ? readdirSync(roundAbs).filter((d) => /^exec-/.test(d)).sort() : [];
    for (const d of legs) {
      const rel = roundRel + "/" + d + "/exec-results.json";
      if (!existsSync(join(REPO, rel))) continue;
      let ident = "?";
      try { ident = String(JSON.parse(readFileSync(join(REPO, rel), "utf8")).identity || "?"); } catch { continue; }
      made.push({ ...tpl, id: tpl.id + ":" + d, args: ["--results", rel, "--corpus", roundRel + "/" + d, "--identity", ident], note: tpl.note + "（这一腿 identity=" + ident + "）" });
    }
    /* 一条都没找到不能读成"没有东西要索引 ⇒ 过"：留一条空参调用，
       让索引器自己的「不许拿空输入产出一个看起来完整的索引」把这轮掐红。 */
    if (!made.length) made.push({ ...tpl, id: tpl.id + ":EMPTY", args: [], note: tpl.note + "（盘上没有 exec-* 结果目录 ⇒ 这一步必然红，而红是对的）" });
    STEPS.splice(tplIdx, 1, ...made);
    console.log("CLOSEOUT_EXPANDED " + tpl.id + " → " + made.length + " 步（按 " + roundRel + "/exec-* 现量展开）");
  }
}
/* 分诊腿以前是手工列的三个名字 ⇒ 同一族"手工列必然漏"的洞：现量盘上已经有
   exec-A-real-stage7、r8 补腿、ws-* 等结果目录从来没被分诊过，它们的红和跳过永远不会进词表账。
   这里按盘上 exec 与 ws 前缀的结果目录补齐缺的分诊步骤（已手工列过的不重复做），并打印补了哪几条。 */
{
  const tpl = STEPS.find((s) => s.file === "scripts/qa/triage-exec-failures.mjs");
  if (tpl) {
    const covered = new Set();
    for (const s of STEPS) {
      if (s.file !== "scripts/qa/triage-exec-failures.mjs") continue;
      const m = (s.args || []).join(" ").match(/([A-Za-z0-9_-]+)\/exec-results\.json/);
      if (m) covered.add(m[1]);
    }
    const baseAbs = join(REPO, "reports/audit", ROUND);
    const added = [];
    for (const d of (existsSync(baseAbs) ? readdirSync(baseAbs) : []).sort()) {
      if (!/^(exec|ws)-/.test(d) || covered.has(d)) continue;
      /* 只补"这一波"的腿：更早的 exec-A-real-only / -final 等目录在它们自己的波次里已经分诊过、
         判决也落进了语料与台账，再补一遍只是把历史红重新端上来。判定按名字里的波次标记走。 */
      if (!/stage7|stage7b|-r8|^ws-/.test(d)) continue;
      if (!existsSync(join(baseAbs, d, "exec-results.json"))) continue;
      const dist = /real/.test(d) ? "apps/client/dist/build/mp-weixin-real" : "apps/client/dist/build/mp-weixin";
      STEPS.push({ id: "triage-" + d, file: "scripts/qa/triage-exec-failures.mjs", kind: "gate", args: ["--results", `reports/audit/${ROUND}/${d}/exec-results.json`, "--dist", dist], note: "自动补的分诊腿（盘上有这一腿的结果但收尾没分诊它）；档位按目录名里的 real 推：" + dist });
      added.push(d);
    }
    console.log("CLOSEOUT_TRIAGE_COVER 手工列=" + covered.size + " 自动补=" + added.length + (added.length ? "（" + added.join(", ") + "）" : "") + "｜分诊口径：每一个 exec-*/ws-* 结果腿都必须有人分诊，漏一条就是本轮留一条没有去向的红");
  }
}
{
  const missing = STEPS.filter((s) => s.file && !existsSync(join(REPO, s.file)));
  if (missing.length) { console.log("CLOSEOUT_RESULT=FAIL reason=步骤表里这些脚本不存在（写错一个文件名就会静默少跑一步）：" + missing.map((m) => m.id + "→" + m.file).join(", ")); process.exit(2); }
}
/* 同一条硬规矩的旗标版：每一步转发的旗标必须在它自己消费者的 argv 解析里真被读取。
   消费者拿不到的旗标不会报错、只会**静默忽略**，于是那一步"绿着"量的却是它自己的默认目录 ——
   0f82b4c1（--round 传给只认 --results/--corpus 的索引器）就是这一族，本轮又实测复发三处。
   抽法故意放宽（把消费者源码里出现过的 --名字 都算它认的），宁可漏杀不可误杀真接线。 */
{
  const readFlags = (src) => {
    const set = new Set();
    for (const m of src.matchAll(/(?:indexOf|includes|startsWith|endsWith|match|test)\(\s*["'`]--([A-Za-z0-9][A-Za-z0-9-]*)/g)) set.add("--" + m[1]);
    for (const m of src.matchAll(/\b(?:arg|flag|has|opt|getArg|hasFlag|readFlag)\(\s*["'`]([A-Za-z0-9][A-Za-z0-9-]*)["'`]/g)) set.add("--" + m[1]);
    for (const m of src.matchAll(/["'`]--([A-Za-z0-9][A-Za-z0-9-]*)["'`]/g)) set.add("--" + m[1]);
    return set;
  };
  const cache = new Map();
  const unreads = [];
  for (const s of STEPS) {
    if (!s.file || !(s.args || []).length) continue;
    let acc = cache.get(s.file);
    if (!acc) { acc = readFlags(readFileSync(join(REPO, s.file), "utf8")); cache.set(s.file, acc); }
    for (const a of s.args.filter((x) => String(x).startsWith("--"))) {
      if (!acc.has(a)) unreads.push(s.id + " 转发 " + a + "，而 " + s.file + " 根本不读它");
    }
  }
  if (unreads.length) { console.log("CLOSEOUT_RESULT=FAIL reason=旗标消费者不认 ⇒ 会被静默忽略、这一步量的是默认目录：" + unreads.join("；")); process.exit(2); }
  console.log("CLOSEOUT_FLAGS=OK 每一步转发的旗标都在消费者源码里核过（核了 " + cache.size + " 个消费者）");
}
const enabled = STEPS.filter((s) => {
  if (s.id === "queue-tally") return true;
  if (s.needs && !has(s.needs.replace(/^--/, ""))) return false;
  if (s.write && !has("allow-write")) return false;
  return true;
});
const only = String(arg("only", "")).split(",").map((x) => x.trim()).filter(Boolean);
const chosen = only.length ? enabled.filter((s) => only.includes(s.id)) : enabled;

console.log(`CLOSEOUT_PLAN 总步骤=${STEPS.length} 本次启用=${chosen.length}（只读门为主；写盘步骤要 --allow-write，G8/G9 要 --with-g8，终报要 --with-report）`);
for (const s of chosen) console.log("  " + s.id + (s.write ? " [写盘]" : "") + " :: " + s.note);
if (has("list")) { console.log("CLOSEOUT_RESULT=LIST 只列计划"); process.exit(0); }
if (only.length && chosen.length !== only.length) {
  console.log("CLOSEOUT_RESULT=FAIL reason=--only 里有没被启用的步骤（可能被写盘开关挡住了）：" + only.filter((o) => !chosen.some((c) => c.id === o)).join(","));
  process.exit(2);
}
const leases = heldLeases({});
if (leases.length) { console.log("CLOSEOUT_RESULT=FAIL reason=设备正在被用（" + leases.map((h) => h.owner + "@pid" + h.pid).join("；") + "）⇒ 收尾里有取景/分诊步骤，不跟执行腿抢通道；等队列跑完再来"); process.exit(2); }

/* 收尾第一步：跨多条 queue-state 台账对账（见 reconcileQueueTally 上方的五条规矩）。
   台账靠发现，不写死目录名；权威计划可由 --queue-plan 点名，默认本波计划，读数里会把用的哪份打出来。 */
const tally = reconcileQueueTally({ roundDirRel: ROUND_REL, planRel: arg("queue-plan", QUEUE_PLAN_DEFAULT) });
for (const l of tally.lines) console.log(l);

let fails = tally.fail ? 1 : 0, ran = 0;
if (tally.fail) console.log("CLOSEOUT_TALLY counted as a failing step（有红腿/有腿没跑出结果/有腿查无台账，或台账与计划根本读空读坏）");
for (const s of chosen) {
  if (!s.file) continue;
  const r = spawnSync(process.execPath, [join(REPO, s.file)].concat(s.args), { cwd: REPO, encoding: "utf8", maxBuffer: 96 * 1024 * 1024, timeout: 30 * 60 * 1000 });
  ran++;
  const body = String(r.stdout || "") + String(r.stderr || "");
  const lines = body.split(/\r?\n/).filter((x) => x.trim());
  const verdict = (lines.slice(-4).join(" ⏎ ")).slice(0, 300);
  const bad = r.status !== 0;
  if (bad) fails++;
  console.log(`CLOSEOUT_STEP ${s.id} exit=${r.status} ${bad ? "RED" : "green"} :: ${verdict}`);
}
console.log(`CLOSEOUT_RAN=${ran} 红=${fails}（红不等于本轮失败：写盘类步骤要显式放行，红腿已逐条带读数）`);
console.log(`CLOSEOUT_RESULT=${fails ? "ATTENTION" : "OK"} 收尾计划跑完；终报与提交在 --with-report 之后`);
process.exit(fails ? 1 : 0);
}
