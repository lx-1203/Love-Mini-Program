#!/usr/bin/env node
/**
 * 语法体检：把改过的 .vue / .ts 至少过一遍解析器。
 *
 * 为什么单独有这一门：一次 mock 重建要 ~40 分钟，而**括号不配对**这类错误要等到构建
 * 中途才炸。修复波一个 lane 动辄改七八个文件，提交前用 typescript 的 parser 扫一遍，
 * 2 秒就能拿到"这份文件连解析都过不去"的答复。它**不**代替构建与判据台 ——
 * 它只保证后续那 40 分钟不是浪费在少了一个 } 上。
 *
 * 已知边界（别把它当类型检查用）：只报 parse diagnostics，不报类型、不报未定义符号。
 * 对 .vue 取 <script> 段（含多个 script 块时逐个检），template/style 段不归它管。
 *
 * 用法：node scripts/qa/parse-check-sfc.mjs <文件或目录 ...>
 *       --from-git [子路径]  ⇒ 扫工作树里已改动的 apps/client 源文件
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const tsPath = join(ROOT, "apps", "client", "node_modules", "typescript");
const ts = existsSync(tsPath) ? require(tsPath) : require("typescript");

const argv = process.argv.slice(2);
let targets = argv.filter((a) => !a.startsWith("--"));
if (argv.includes("--from-git")) {
  const sub = argv[argv.indexOf("--from-git") + 1] && !argv[argv.indexOf("--from-git") + 1].startsWith("--")
    ? argv[argv.indexOf("--from-git") + 1] : "apps/client";
  const out = execFileSync("git", ["status", "--porcelain", "--", sub], { cwd: ROOT, encoding: "utf8" });
  targets = targets.concat(
    out.split(/\r?\n/).map((l) => (l.match(/^\s*\S+\s+(.+)$/) || [])[1]).filter(Boolean)
      .filter((p) => /\.(vue|ts)$/.test(p))
  );
}
if (!targets.length) {
  console.log("PARSE_RESULT=FAIL reason=没有目标（给文件路径或 --from-git）");
  process.exit(2);
}

const problems = [];
let checked = 0, scriptBlocks = 0;
const seen = new Set();
for (const raw of targets) {
  const p = resolve(ROOT, raw);
  if (seen.has(p)) continue;
  seen.add(p);
  if (!existsSync(p)) { problems.push(`${raw}：文件不存在（台账/清单里写了个不存在的路径？）`); continue; }
  if (!statSync(p).isFile()) continue;
  checked++;
  const src = readFileSync(p, "utf8");
  const blocks = raw.endsWith(".vue") ? [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]) : [src];
  if (raw.endsWith(".vue") && !blocks.length) { problems.push(`${raw}：.vue 里没有 <script> 段，等于没检`); continue; }
  for (const code of blocks) {
    scriptBlocks++;
    const sf = ts.createSourceFile(raw, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
    const d = sf.parseDiagnostics || [];
    if (!d.length) continue;
    const first = d.slice(0, 3).map((x) => {
      const { line, character } = sf.getLineAndCharacterOfPosition(x.start);
      return `L${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(x.messageText, " ")}`;
    });
    problems.push(`${raw}：解析失败 ${d.length} 处 —— ${first.join(" ; ")}`);
  }
}

console.log(`PARSE_SUMMARY 文件=${checked} script段=${scriptBlocks}`);
if (problems.length) {
  console.log(`PARSE_RESULT=FAIL problems=${problems.length}`);
  for (const p of problems) console.log("  ✗ " + p);
  process.exit(2);
}
console.log(`PARSE_RESULT=PASS files=${checked} scriptBlocks=${scriptBlocks}（只保证能解析，不保证类型与行为）`);
