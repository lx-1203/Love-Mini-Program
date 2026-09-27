#!/usr/bin/env node
/**
 * 把"被载具污染的执行行"点出来，交给复跑清单。
 *
 * 为什么单独做：#70④ 的 input 腿路由（`r-exec-cli.mjs:408` 只看 action 文本里的"输入/填写/粘贴"，
 * 且按条不按元素）把 `input:` 发到了非输入元素上，而且**IDE 不报错、行还记成 EXECUTED、还计入 tapsDone**。
 * 所以修完载具之后，这些行的旧判决不能继续引用 —— 它们不是"产品没做"也不是"判据含糊"，是被点错了元素。
 * 只读盘上的执行结果，不重跑任何东西（重跑是队列的事）。
 *
 * 用法：node scripts/qa/emit-carrier-defect-rerun.mjs [--out scripts/qa/rerun-carrier-defect.json]
 *   判"目标像不像输入框"的词根是刻意放宽的（宁可多算几个页去重跑，也不要漏掉被污染的旧证据）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const KNOWN = ["out", "root"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`CARRIERDEF_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 只认 ${KNOWN.join(",")}（拼错路径会扫到零个语料然后报"没有污染的腿"）`); process.exit(2); }
}
const ROOT = resolve(REPO, arg("root", "reports/audit/round-7"));
const OUT = resolve(REPO, arg("out", "scripts/qa/rerun-carrier-defect.json"));
const INPUTISH = /(input|field|editor|textarea|search|entry|box|code|phone|msg|message|content|text|nick|title|keyword|amount|comment|desc|remark|url|mail|pwd|password|otp|captcha)/i;

if (!existsSync(ROOT)) { console.log(`CARRIERDEF_RESULT=FAIL reason=语料根不存在 ${ROOT}`); process.exit(2); }
const dirs = readdirSync(ROOT).filter((d) => d.startsWith("exec-") && existsSync(join(ROOT, d, "exec-results.json")));
if (!dirs.length) { console.log(`CARRIERDEF_RESULT=FAIL reason=${ROOT} 下一条 exec-* 语料都没有 ⇒ "没有污染的腿"与"没得扫"不能共用一个输出`); process.exit(2); }

const rows = [];
const noInputDispatch = [];
for (const d of dirs) {
  let j;
  const f = join(ROOT, d, "exec-results.json");
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.log(`CARRIERDEF_SKIP ${d} 读不到：${String(e.message).slice(0, 60)}`); continue; }
  const list = j.results || [];
  let dispatched = 0;
  for (const r of list) {
    const obs = String(r.observed || "") + " " + String(r.evidence || "") + " " + String(r.console || "");
    if (!/\binput:/i.test(obs)) continue;
    dispatched++;
    /* 这一行下发过 input: ⇒ 只有当它点的东西名字里连一点输入框的样子都没有，才算被污染。 */
    const targets = [...obs.matchAll(/\binput:\s*([.#][\w-]+)/g)].map((m) => m[1]);
    const badTargets = targets.filter((t) => !INPUTISH.test(t));
    if (!badTargets.length && targets.length) continue;
    rows.push({ dir: d, manifest: r.manifest, id: r.id, page: r.page || "", status: r.status, targets: targets, badTargets: badTargets.length ? badTargets : ["(该行发过 input: 但没记下目标名 ⇒ 保守算进来)"] });
  }
  if (!dispatched) noInputDispatch.push(d);
}

const manifests = [...new Set(rows.map((r) => r.manifest))].sort();
const ids = [...new Set(rows.map((r) => `${r.manifest}/${r.id}`))].sort();
console.log(`CARRIERDEF 语料=${dirs.length} 个（其中没出现过 input: 的=${noInputDispatch.length}：${noInputDispatch.slice(0, 4).join(",") || "无"}）`);
console.log(`CARRIERDEF 被污染行=${rows.length} 去重后=${ids.length} 涉及 manifest=${manifests.length}`);
console.log(`CARRIERDEF MANIFESTS ${manifests.join(" ")}`);
writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(), carrier: "scripts/qa/r-exec-cli.mjs:408（input 腿按 action 文本路由，不看元素）",
  rule: "行里下发过 input: 且目标类名不含任何输入框词根；词根刻意放宽 ⇒ 宁可多跑几个页",
  wordRoots: String(INPUTISH), corpusDirs: dirs, polluted: rows, manifestList: manifests, caseIds: ids,
  sourceMtimes: dirs.map((d) => ({ dir: d, mtime: statSync(join(ROOT, d, "exec-results.json")).mtime.toISOString() })),
}, null, 1) + "\n");
console.log(`CARRIERDEF_WRITTEN=${OUT}`);
if (!rows.length) { console.log("CARRIERDEF_RESULT=WARN reason=一条都没扫到 ⇒ 先确认语料里 observed 真的带 input: 字样，别把「扫不到」读成「没有污染」"); process.exit(0); }
console.log("CARRIERDEF_RESULT=OK 复跑清单已出（把 manifestList 并进 stage-7 的 --manifests）");
