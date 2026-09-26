#!/usr/bin/env node
/* 提交清单生成器（T7 用）。
   为什么要有这个文件：上一份 `commit-manifest.json` 是**内联脚本**产出的，
   仓库里没有任何可重跑的生成器（`scripts/` 与 `scripts/qa/` 下都搜不到 make-commit-list），
   而 `.zcode/tmp/**` 被 .gitignore 整目录吞掉（根 .gitignore 的裸 `tmp/` 规则）——
   也就是说"清单是怎么来的"这件事本身不可复现。收尾要按显式路径提交（定义 :1000：
   Git 管家绝不 `git add -A`），那这份清单就必须是**机器可重生成**的，而不是回忆。
   三条硬规矩：
   1. head 一律运行期 `git rev-parse --short HEAD` 取，**绝不写死**（本轮已因写死 SHA 修过两次伪造溯源）。
   2. 疑似含密钥的路径一律进 holdback，不进取用清单：`.env*`、`*credential*`、`*secret*`、
      `restart-backend.ps1`、`*.pem`、`id_rsa*`。宁可漏提，不可泄露。
   3. 守恒自判：`include + holdback + excluded == 全部条目`，且每个路径只属于一处；
      对不上就 exit 2，不写文件。扫描集为空同样判红。
   用法：node scripts/qa/make-commit-list.mjs [--out 路径] [--print-add]
*/
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ——— 分类规则（纯函数，便于被测试直接驱动，不靠"跑一次看看"） ——— */
/* 关键认知：`git status --porcelain` **本身就已经过滤掉 gitignore 的路径**，
   所以出现在这里的都是"未被忽略"的东西。首版在这里写了 `.zcode/` 与 `tmp/` 的整目录排除，
   结果把 `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（**已跟踪、本轮改过的交付物本身**）
   和 `.zcode/research/` 一起判成 excluded —— 照这份清单提交就会把工作流定义漏在门外。
   排除面因此收窄到"确实不该进取用清单的构建产物/依赖/暂存子目录"，
   并且不再对 .zcode 一刀切（只排 .zcode/tmp/，那才是本轮的 scratch 区）。 */
const SECRET_RE = /(^|\/)\.env|credential|secret|restart-backend\.ps1$|\.pem$|id_rsa|\.key$/i;
const NEVER_RE = /(^|\/)(node_modules|dist|build|\.next|\.cache)(\/|$)|(^|\/)\.git\/|\.zcode\/tmp\/|(^|\/)tmp\/qa\//;
const GROUP_RULES = [
  ["client_src", /^apps\/client\/src\//],
  ["api_src", /^apps\/api\//],
  ["admin_src", /^apps\/admin\//],
  ["workflow_def", /^\.zcode\/workflows\//],
  ["research", /^\.zcode\/research\//],
  ["tools", /^(scripts|tests)\/|^apps\/client\/scripts\//],
  ["evidence", /^reports\//],
  ["assets", /^素材\/|^assets\//],
  ["docs", /\.md$/],
];

/** 单个路径 → { group, verdict: include|holdback|excluded, why } */
/* 截图帧单独一档：`reports/screenshots/**` 里的 .png 本轮实测 65MB 量级，
   跟着清单一次性提交会把仓库体积永久抬上去（且二进制不可 diff），所以默认 holdback；
   但同一批目录里的 `manifest-detail.json` 是**采集原始记录**（帧名/字节/sha256/落点探针结果），
   是权威索引的可追溯性来源，必须能提交 —— 因此只按扩展名把清单类文件留在 include 侧。
   目录级条目（porcelain 会把未跟踪目录压成一行 `xxx/`）落 holdback，
   里面的 .json 由收尾时显式点名 `git add <路径>` 补进来，不靠"整个目录一起提"。 */
const FRAMES_RE = /^reports\/screenshots\//;
export function classify(p) {
  const path = p.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (NEVER_RE.test(path)) return { group: "other", verdict: "excluded", why: "构建产物/依赖/被 gitignore 的临时区，一律不进取用清单" };
  if (SECRET_RE.test(path)) return { group: "holdback", verdict: "holdback", why: "路径疑似含凭据，按纪律不自动进取用清单（要提必须由人显式点名）" };
  if (FRAMES_RE.test(path) && !/\.json$/i.test(path)) return { group: "frames", verdict: "holdback", why: "截图帧是二进制大图（本轮 65MB 量级、不可 diff），默认不进取用清单；要归档须人显式点名并优先走 Git LFS/包外存档" };
  const hit = GROUP_RULES.find(([, re]) => re.test(path));
  return { group: hit ? hit[0] : "carryover", verdict: "include", why: hit ? "命中分类规则" : "未分类，默认进取用清单并由人复核（carryover）" };
}

/** porcelain 行 → 路径（含 R/C 的 "old -> new" 取新名） */
export function pathFromPorcelain(line) {
  const st = line.slice(0, 2);
  let rest = line.slice(3);
  const arrow = rest.indexOf(" -> ");
  if (arrow >= 0 && /^[RC]/.test(st)) rest = rest.slice(arrow + 4);
  return { status: st, path: rest.replace(/^"|"$/g, "") };
}

/** porcelain 文本 → 行。
    过滤条件必须是**原始行长度**：porcelain 每行是「2 状态位 + 1 空格 + 路径」，
    单字符文件名（本轮就有：仓库根那个 shell 重定向产物 `0`）整行只有 4 字节，
    一旦先 `trim()` 再比长度就会把它吃掉 —— 首版正是这么写的，于是那条待提交的删除
    **从清单里静默消失**，扫描集变小却照样"守恒通过"（同一个"静默缩集"毛病的第 N 次）。 */
export function porcelainRows(text) {
  return text.split("\n").filter((l) => l.length >= 4).map(pathFromPorcelain);
}

function gitStatus() {
  const out = execFileSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return porcelainRows(out);
}

const HEAD = (() => {
  try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
})();

const args = process.argv.slice(2);
/** 只有"被直接运行"才执行取数与落盘。
    理由：`classify` / `pathFromPorcelain` 是导出的纯规则，测试要 import 它们；
    不加这道闸，import 就会跑 git status 并**写出清单文件**，测试就成了有副作用的操作。 */
const IS_MAIN = (() => {
  const entry = process.argv[1] || "";
  return entry.replace(/\\/g, "/").endsWith("/make-commit-list.mjs");
})();

function main() {
const outArg = args.indexOf("--out");
const OUT = outArg >= 0 ? resolve(args[outArg + 1]) : join(REPO, ".zcode", "tmp", "round6-exec", "commit-manifest.json");

const rows = gitStatus();
if (!rows.length) {
  console.log("COMMITLIST=FAIL reason=git status 一条都没有 —— 扫描集为空不许产出清单（要么树真干净，要么取数方式错了）");
  process.exit(2);
}

const entries = {};
const groups = {};
const include = [], holdback = [], excluded = [];
for (const r of rows) {
  const c = classify(r.path);
  entries[r.path] = { status: r.status, group: c.group, verdict: c.verdict, why: c.why };
  (groups[c.group] = groups[c.group] || []).push(r.path);
  (c.verdict === "include" ? include : c.verdict === "holdback" ? holdback : excluded).push(r.path);
}

const sum = include.length + holdback.length + excluded.length;
const dupes = rows.length - Object.keys(entries).length;
console.log(`COMMITLIST_HEAD=${HEAD}（运行期 rev-parse，非写死） porcelain=${rows.length}`);
for (const [g, v] of Object.entries(groups)) console.log(`  group ${g} = ${v.length}`);
console.log(`COMMITLIST_INCLUDE=${include.length} HOLDBACK=${holdback.length} EXCLUDED=${excluded.length} 合计=${sum} vs ${rows.length} 重复键=${dupes}`);
holdback.forEach((p) => console.log(`  HOLDBACK ${p}  原因=${entries[p].why}`));
excluded.slice(0, 12).forEach((p) => console.log(`  EXCLUDED ${p}`));
if (excluded.length > 12) console.log(`  …EXCLUDED 另有 ${excluded.length - 12} 条`);
if (sum !== rows.length || dupes) { console.log("COMMITLIST=FAIL 守恒不成立，不写清单"); process.exit(2); }

const doc = {
  generatedAt: new Date().toISOString(), head: HEAD, source: "git status --porcelain",
  generator: "scripts/qa/make-commit-list.mjs",
  policy: { neverPatterns: ["node_modules", "dist", "build", ".cache", "tmp/", ".zcode/", ".git/"], secretPatterns: [".env", "credential", "secret", "restart-backend.ps1", ".pem", "id_rsa", ".key"] },
  entries, groups, include, holdback, excluded_not_in_list: excluded,
  notes: [
    "绝不 git add -A：取用只能按本清单 include[] 的显式路径逐条加。",
    "holdback[] 不是'不需要提交'，是'不能自动进取用清单'——需要提交时必须由人点名并核过内容。",
    "evidence[]（reports/**）与 tools[]（scripts/**）常是本轮主要交付物；carryover[] 是未分类项，必须人复核。",
  ],
};

writeFileSync(OUT, JSON.stringify(doc, null, 1));
console.log(`COMMITLIST=WROTE ${OUT.replace(REPO + "/", "")} include=${include.length}`);
const carry = (groups.carryover || []);
if (carry.length) console.log(`COMMITLIST_NOTE carryover=${carry.length} 条未分类，其中前 5：${carry.slice(0, 5).join(", ")}`);
if (args.includes("--print-add")) console.log(include.map((p) => `git add -- "${p}"`).join("\n"));
process.exit(0);
}

if (IS_MAIN) main();
