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
 *   3) 步骤清单在启动时逐个核 `existsSync`，写错一个文件名就直接 FAIL，绝不静默跳过一步。
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
  { id: "exec-frames-to-corpus", file: "scripts/qa/exec-frames-to-corpus.mjs", kind: "gate", write: true, args: ["--round", ROUND], note: "执行轮出的帧登记进语料库（#52）" },
  { id: "verify-evidence-corpus", file: "scripts/qa/verify-evidence-corpus.mjs", kind: "gate", args: ["--round", ROUND], note: "证据索引与盘上一致：路径存在、哈希一致（帧入账后必须复量）" },
  { id: "verdict-from-frames", file: "scripts/qa/verdict-from-frames.mjs", kind: "gate", write: true, args: ["--round", ROUND], note: "把帧级判决从证据里读出来（① 要的帧级终态）" },
  { id: "audit-frame-verdicts", file: "scripts/qa/audit-frame-verdicts.mjs", kind: "gate", args: ["--round", ROUND], note: "帧判决的审计：有没有拿没背书的判决落账" },
  { id: "triage-exec-A-mock", file: "scripts/qa/triage-exec-failures.mjs", kind: "gate", args: ["--results", `reports/audit/${ROUND}/exec-A-mock-stage7/exec-results.json`, "--dist", "apps/client/dist/build/mp-weixin"], note: "A 刀语料分诊（词表可达 + unclassified=0 + 落地对）" },
  { id: "triage-exec-guest-real", file: "scripts/qa/triage-exec-failures.mjs", kind: "gate", args: ["--results", `reports/audit/${ROUND}/exec-guest-real-stage7/exec-results.json`, "--dist", "apps/client/dist/build/mp-weixin-real"], note: "游客刀语料分诊（真实档）" },
  { id: "guest-landing-recheck", file: "scripts/qa/verify-guest-landing.mjs", kind: "gate", write: true, args: ["--mode", "measure", "--project", "apps/client/dist/build/mp-weixin-real"], note: "27 组游客落点逐页实测（GG-* 复测腿）：BOOKED/MEASURED-* 不算结案，只有这一条跑出 CLOSED，triage 的「未结案」才会归零" },
  { id: "verify-real-coverage", file: "scripts/qa/verify-real-coverage.mjs", kind: "gate", args: ["--round", ROUND], note: "真实模式覆盖守恒（含身份轴豁免读数）" },
  { id: "verify-criteria-frame-debt", file: "scripts/qa/verify-criteria-frame-debt.mjs", kind: "gate", args: ["--strict"], note: "判据台欠帧的去向账（--strict：掉了去向就红）" },
  { id: "verify-frame-debt-coverage", file: "scripts/qa/verify-frame-debt-coverage.mjs", kind: "gate", args: ["--strict-src-only"], note: "台账未收口行的去向账（含源码级判点轴）" },
  { id: "verify-tab-bar-single-source", file: "scripts/qa/verify-tab-bar-single-source.mjs", kind: "gate", args: [], note: "④ 第 5 项的判点：面板字面量相加 == token" },
  { id: "verify-case-selectors-mock", file: "scripts/qa/verify-case-selectors-exist.mjs", kind: "gate", args: [], note: "点名物件在两档产物里成不成元素（mock 档）" },
  { id: "verify-case-selectors-real", file: "scripts/qa/verify-case-selectors-exist.mjs", kind: "gate", args: ["--band", "apps/client/dist/build/mp-weixin-real"], note: "同上，real 档" },
  { id: "g8-e2e", file: "scripts/qa/g8-e2e.cjs", kind: "gate", write: true, device: false, needs: "--with-g8", args: [], note: "十环真后端复跑（会写库：G8 产生的行按既定裁定保留并披露）" },
  { id: "g9-probe", file: "scripts/qa/g9-probe.cjs", kind: "gate", write: true, needs: "--with-g8", args: [], note: "素材普查复量" },
  { id: "land-verdicts-into-ledger", file: "scripts/qa/land-verdicts-into-ledger.mjs", kind: "gate", write: true, args: ["--dry"], note: "帧级判决落台账（默认 --dry，看清单再 --apply）" },
  { id: "emit-round-report", file: "scripts/qa/emit-round-report.mjs", kind: "gate", write: true, needs: "--with-report", args: [], note: "带溯源终报（面板含本轮所有新门）" },
  { id: "make-commit-list", file: "scripts/qa/make-commit-list.mjs", kind: "gate", write: false, needs: "--with-report", args: [], note: "显式路径提交清单（帧目录仍 HOLDBACK，交给人点名）" },
];
{
  const missing = STEPS.filter((s) => s.file && !existsSync(join(REPO, s.file)));
  if (missing.length) { console.log("CLOSEOUT_RESULT=FAIL reason=步骤表里这些脚本不存在（写错一个文件名就会静默少跑一步）：" + missing.map((m) => m.id + "→" + m.file).join(", ")); process.exit(2); }
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
  const f = join(RDIR, "queue-state.json");
  if (!existsSync(f)) return "MISSING " + f;
  const j = JSON.parse(readFileSync(f, "utf8"));
  const legs = (j.legs || []);
  const c = {};
  for (const l of legs) c[l.status] = (c[l.status] || 0) + 1;
  const sum = Object.values(c).reduce((a, b) => a + b, 0);
  const ok = sum === legs.length;
  return "腿=" + legs.length + " 分布=" + JSON.stringify(c) + " 合计=" + sum + (ok ? " CONSERVED" : " MISMATCH") +
    " 红腿=" + legs.filter((l) => l.status === "FAIL").map((l) => l.name || l.id || "?").join(",") +
    " ADVISORY_RED=" + legs.filter((l) => l.status === "ADVISORY_RED").length;
})();
console.log("CLOSEOUT_STEP queue-tally :: " + tally);

let fails = 0, ran = 0;
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
