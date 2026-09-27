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
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { heldLeases } from "./ui-lease.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
{
  const KNOWN = ["list", "allow-write", "with-g8", "with-report", "round", "only", "strict-triage", "ops", "plans"];
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("CLOSEOUT_RESULT=FAIL reason=不认识的旗标 " + bad.join(",") + " ⇒ 会被忽略而少跑步骤"); process.exit(2); }
}
const ROUND = arg("round", "round-7");
const RDIR = join(REPO, "reports", "audit", ROUND);

/* 步骤表：write=true 的步骤默认不跑（要 --allow-write）；device=true 的还要设备空着。 */
const STEPS = [
  { id: "queue-tally", kind: "check", note: "读排队器状态：守恒 OK+FAIL+NOT_RUN==腿数，红腿逐条点名" },
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

const tally = (() => {
  /* 现量：排队器把状态写在它自己的 --out 目录（reports/audit/round-7/ui-queue/queue-state.json），
     不在轮目录根下 ⇒ 这一步以前只会打印 MISSING 然后照常往下跑，等于收尾的第一步从没真判过。
     两个位置都试；都读不到就是把本轮腿账读空，必须算失败，不许读成"没有红腿"。 */
  const rel = (x) => String(x).replace(REPO + "/", "").replace(REPO + "\\", "");
  const cands = [join(RDIR, "queue-state.json"), join(RDIR, "ui-queue", "queue-state.json")];
  const f = cands.find((x) => existsSync(x));
  if (!f) return { line: "CLOSEOUT_TALLY=FAIL reason=读不到 queue-state.json（试过：" + cands.map(rel).join(" , ") + "）⇒ 本轮腿账是空的，不许当成没有红腿", fail: true };
  const j = JSON.parse(readFileSync(f, "utf8"));
  const legs = (j.legs || []);
  const c = {};
  for (const l of legs) c[l.status] = (c[l.status] || 0) + 1;
  const sum = Object.values(c).reduce((a, b) => a + b, 0);
  const ok = sum === legs.length;
  return { line: "CLOSEOUT_STEP queue-tally（" + rel(f) + "） :: 腿=" + legs.length + " 分布=" + JSON.stringify(c) + " 合计=" + sum + (ok ? " CONSERVED" : " MISMATCH") +
      " 红腿=" + legs.filter((l) => l.status === "FAIL").map((l) => l.name || l.id || "?").join(",") +
      " 未跑=" + legs.filter((l) => l.status === "NOT_RUN").map((l) => l.name || l.id || "?").join(",") +
      " ADVISORY_RED=" + legs.filter((l) => l.status === "ADVISORY_RED").length,
    fail: !ok,
    notRun: legs.filter((l) => l.status === "NOT_RUN").length };
})();
console.log(tally.line);

let fails = tally.fail ? 1 : 0, ran = 0;
if (tally.fail) console.log("CLOSEOUT_TALLY counted as a failing step（守恒破了或状态读空）");
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
