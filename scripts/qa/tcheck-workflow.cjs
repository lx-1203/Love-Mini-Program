#!/usr/bin/env node
/* 工作流的**真实类型通道**预检（不是干跑，也不是语法检查）
 *
 * 为什么要有它：干跑台 scripts/qa/dryrun-workflow.mjs 把宿主注入的七件套当未解析名字放行，
 * 而且它的桩 world.run/agent 返回的是**原生 Promise** ⇒ 它永远看不见门面返回类型的问题。
 * 本仓被这两类缺陷烧过，且都是干跑全绿、真跑才炸的形状：
 *   ① agent().ask<T>() 返回的是 PromiseLike<T>，**没有 .catch**（也没有 .finally）。
 *      挂 .catch 在真实编译通道下逐个编译不过；干跑里 8/8 画像全 SURVIVED 也照不出来。
 *      守卫只能是两参形式：`.then((v) => v, (e) => …)`（本谱系所有 ask 都这么写）。
 *   ② 重复的 function 声明：JS 静默让**最后一个赢**，前一份连同它的全部逻辑一起消失，
 *      不报错、不判红，干跑照样跑到底 —— 只能由真实语义检查（TS2393）抓。
 *
 * 来历与提升：这份检原先只活在 .zcode/tmp/tcheck-v32.cjs（6.9 KB，Sep 25 落盘）。
 * .gitignore 的 tmp/ 是 any-depth 规则 ⇒ clean checkout 上这个文件根本不存在，
 * 于是"唯一的两类致命缺陷检查器"随时会蒸发。本版把它提升到 scripts/qa/，并同时进
 * 两个载具（DSL 的 GATE_SUITE 与 bash 的 g 步骤），由 verify-gate-list-sync 盯着不再单边漂移。
 *
 * 【--file 无缺省值】带缺省的 --file 已在本仓两次把预检测错工作流版本
 * （dryrun-workflow.mjs 的默认值就害过 v3.6 —— 见其谱系 D9），所以这里**不给默认**：
 * 没传 --file 一律 exit 2 大声失败，绝不"猜一个版本测了然后报绿"。
 *
 * 用法：node scripts/qa/tcheck-workflow.cjs --file .zcode/workflows/<本版>.dwf.ts [--json <out>]
 * 机器行：TCHECK_RESULT=PASS|FAIL|NOSUCHFILE|NOFILE  TCHECK_FILE=…  TCHECK_DIAGS=n
 * 退出码：0 无真实类型错误；1 有；2 门自己没跑成（缺 --file / 文件不存在 / 找不到 typescript / 载入 lib 失败）。
 * 只读：不取租约、不连后端、不改被测文件；只在 tmp/qa/tcheck-src 下落一份重建后的编译现场。
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null; };

/* ---------- 前置：--file 必须显式给 ---------- */
const FILE_REL = arg("file");
const finish = (status, reason, extra) => {
  console.log(`TCHECK_RESULT=${status} ${reason}${extra ? " " + extra : ""}`);
  process.exit(status === "PASS" ? 0 : status === "FAIL" ? 1 : 2);
};
if (!FILE_REL) {
  console.log("TCHECK_NOFILE 本检不给 --file 缺省值：带缺省的 --file 已两次把工作流预检指向别的版本（谱系 D9 同一形状）");
  finish("NOFILE", "用法 --file .zcode/workflows/<本版>.dwf.ts");
}
const FILE = path.isAbsolute(FILE_REL) ? FILE_REL : path.resolve(REPO, FILE_REL);
if (!fs.existsSync(FILE)) { console.log("TCHECK_PATH " + FILE); finish("NOSUCHFILE", "被测工作流文件不存在"); }

/* ---------- typescript 解析：不写盘符死路径 ---------- */
/* 旧件里那行 TS_PATH = "D:/6/恋爱小程序/node_modules/.pnpm/typescript@5.3.3/…" 把仓库名钉进了脚本，
   换一台机器/换一个目录名就整片崩；而且 5.3.3 是猜的。现在按三档实找，找不到就 exit 2，不猜。 */
function loadTs() {
  const tries = [];
  try {
    const pnpm = path.join(REPO, "node_modules", ".pnpm");
    for (const d of fs.readdirSync(pnpm)) {
      if (/^typescript@\d/.test(d)) {
        tries.push(path.join(pnpm, d, "node_modules", "typescript"));
        tries.push(path.join(pnpm, d, "node_modules", "typescript", "lib"));
      }
    }
  } catch { /* 没有 .pnpm 目录（非 pnpm 安装），继续往下找 */ }
  tries.push(path.join(REPO, "node_modules", "typescript"));
  tries.push(path.join(REPO, "apps", "client", "node_modules", "typescript"));
  for (const t of tries) {
    try {
      if (fs.existsSync(t) || fs.existsSync(t + ".js") || fs.existsSync(path.join(t, "typescript.js"))) return require(t);
    } catch { /* 这一档读不动，试下一档 */ }
  }
  try { return require("typescript"); } catch { return null; }
}
const ts = loadTs();
if (!ts) finish("NOSUCHFILE", "找不到 typescript（三档实读全空：node_modules/.pnpm/typescript@*、node_modules/typescript、apps/client/node_modules/typescript）⇒ 装依赖再跑，不许降级成语法检查糊过去");

/* ---------- 宿主门面的忠实重建 ---------- */
/* 七件套的 shape 按 v3.8 正文**实际用到的成员**重建；关键一条已写进头注：
   ask<T>() 返回 PromiseLike —— 没有 .catch。world.run 与 git.status 按正式通道实测可用
   .catch/.finally（返回真 Promise），所以这里刻意区分建模：一旦有人给 ask 挂 .catch，
   本检必须逐条编译不过，那是它存在的理由。 */
const FACADE = `
interface WfNode<T> extends PromiseLike<T> {}
interface AgentHandle {
  ask<T>(prompt: string): WfNode<T>;
}
interface RunResult { exitCode: number; stdout: string; stderr: string; }
interface GitStatus { staged: string[]; unstaged: string[]; untracked: string[]; }
interface ArtifactApi {
  (name: string, content?: unknown): string;
  board(name: string, spec?: Record<string, unknown>): unknown;
  markdown(name: string, content?: unknown, meta?: Record<string, unknown>): unknown;
  file(name: string, p: string, meta?: Record<string, unknown>): Promise<unknown>;
}
declare const agent: (name: string, description?: string) => AgentHandle;
declare const log: (msg: unknown) => void;
declare const phase: (name: string) => void;
declare const world: {
  run(cmd: string, args: string[], opts?: { timeoutMs?: number }): Promise<RunResult>;
  fs?: unknown;
};
declare const artifact: ArtifactApi;
declare const git: { status(): Promise<GitStatus> };
declare const report: (content: unknown, board?: string) => void;
`;

const src = fs.readFileSync(FILE, "utf8");
/* 脚本体包进 async function：与真实编译通道一致（宿主就是这么执行的），故行号需 −1 校准 */
const WRAPPED = "async function __wf_entry() {\n" + src + "\n}\n";

const WORKDIR = path.join(REPO, "tmp", "qa", "tcheck-src");
fs.mkdirSync(WORKDIR, { recursive: true });
fs.writeFileSync(path.join(WORKDIR, "facade.d.ts"), FACADE, "utf8");
fs.writeFileSync(path.join(WORKDIR, "workflow.ts"), WRAPPED, "utf8");

const options = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  strict: false,
  noImplicitAny: false,
  skipLibCheck: true,
};
/* lib 解析走默认路径：首版用 options.lib + 自定义 host，结果 core lib 一个都没加载，
   报出 429 条 "Property 'replace' does not exist on type 'string'" 这种整片假阳性
   —— 先复核自己的工具，再复核被测物。 */
const libFile = ts.getDefaultLibFilePath(options);
if (!fs.existsSync(libFile)) finish("NOSUCHFILE", "找不到 typescript core lib: " + libFile);
const program = ts.createProgram(
  [libFile, path.join(WORKDIR, "facade.d.ts"), path.join(WORKDIR, "workflow.ts")],
  options
);
const allDiags = ts.getPreEmitDiagnostics(program);
const diags = allDiags.filter((d) => d.file && d.file.fileName.replace(/\\/g, "/").endsWith("tcheck-src/workflow.ts"));
if (allDiags.length && allDiags.length - diags.length > 0) {
  const other = allDiags.filter((d) => !diags.includes(d)).slice(0, 3)
    .map((d) => `${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 120)}`);
  console.log(`TCHECK_NONTARGET_DIAGS=${allDiags.length - diags.length} 样例: ${other.join(" | ")}`);
}

/* 行号校准：源文件第 N 行（1-based）在包装后是第 N+1 行，而 getLineAndCharacterOfPosition().line
   是 0-based ⇒ 恰好等于 N。首版又减了 1，报出来的行全部偏低一行，害人去核代码时对不上。 */
const realLine = (d) => (d.file && typeof d.start === "number" ? d.file.getLineAndCharacterOfPosition(d.start).line : 0);
const rows = diags.map((d) => ({ code: d.code, line: realLine(d) - 1, msg: ts.flattenDiagnosticMessageText(d.messageText, " ") }));

const byCode = new Map();
for (const r of rows) byCode.set(r.code, (byCode.get(r.code) || 0) + 1);

/* 类①的识别式要同时吃三种写法：报的是 **属性名带单引号**（Property 'catch' does not exist on type
   'WfNode<TourOut>'），不是 ".catch" —— 首版只按 /\.catch/ 匹配，把这条真缺陷归进了"其他"，
   于是它最该响亮报出的那一类反而藏在末尾的通用清单里（实测注入复现：TS2339 落 OTHER=1）。
   门面节点类型名 WfNode 也一并算命中，因为 .then/.finally 挂错时的说法有半句在类型名上。 */
const PROMISELIKE = rows.filter((r) =>
  /PromiseLike|WfNode/.test(r.msg)
  || (r.code === 2339 && /['".](catch|finally|then)\b/.test(r.msg)));
const SHAPES = rows.filter((r) => r.code === 2345 || r.code === 2322 || r.code === 2739 || r.code === 2741 || r.code === 2554);
const NEVER = rows.filter((r) => /never/.test(r.msg));
/* ② 重复 function 声明：TS 侧是 TS2393；同时自己做一遍字面清点，
   因为"同名两处声明"里其中一处被注释掉时 TS 不报，而读者会以为它还在跑。 */
const DUPDIAG = rows.filter((r) => r.code === 2393 || /Duplicate function implementation|函数实现重复/.test(r.msg));
const declared = [];
{
  const re = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*[<(]/gm;
  let m;
  const stripped = src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  while ((m = re.exec(stripped))) declared.push(m[1]);
}
const dupNames = Object.keys(declared.reduce((a, n) => ((a[n] = (a[n] || 0) + 1), a), {})).filter((n) => declared.filter((x) => x === n).length > 1);
if (dupNames.length > 0) {
  for (const n of dupNames) rows.push({ code: 2393, line: -1, msg: `重复的 function 声明：${n}（清点命中 ${declared.filter((x) => x === n).length} 处）⇒ JS 静默让最后一个赢，前一份连同其逻辑一起蒸发` });
}
const OTHER = rows.filter((r) => !PROMISELIKE.includes(r) && !SHAPES.includes(r) && !NEVER.includes(r) && !DUPDIAG.includes(r) && !(dupNames.length && r.code === 2393));

console.log(`TCHECK_FILE=${path.relative(REPO, FILE).split(path.sep).join("/")} lines=${src.split(/\r?\n/).length}`);
console.log(`TCHECK_DIAGS=${rows.length} by_code=${[...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => c + ":" + n).join(" ")}`);
console.log(`TCHECK_PROMISELIKE_CATCH=${PROMISELIKE.length} TCHECK_DUP_FUNCTION=${dupNames.length}(${dupNames.join(",") || "none"}) TCHECK_SHAPE_MISMATCH=${SHAPES.length} TCHECK_NEVER=${NEVER.length} TCHECK_OTHER=${OTHER.length}`);
console.log(`TCHECK_FUNCTIONS_DECLARED=${declared.length}`);
const dump = (label, list, n) => {
  if (!list.length) return;
  console.log(`--- ${label} (${list.length}) ---`);
  list.slice(0, n).forEach((r) => console.log(`  :${r.line} TS${r.code} ${r.msg.slice(0, 220)}`));
};
dump("PROMISE-LIKE 上不存在的成员（真实通道会逐个编译失败）", PROMISELIKE, 12);
dump("重复 function 声明（最后一个静默赢）", rows.filter((r) => r.code === 2393), 12);
dump("降级形状 / 接口字段不齐", SHAPES, 20);
dump("never 推断", NEVER, 10);
dump("其他", OTHER, 10);
const jsonArg = arg("json");
if (jsonArg) {
  const out = path.isAbsolute(jsonArg) ? jsonArg : path.resolve(REPO, jsonArg);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ file: FILE, ts: ts.version || "(未知版本)", rows, dupNames, functions: declared.length }, null, 2));
  console.log("TCHECK_SIDECAR " + path.relative(REPO, out).split(path.sep).join("/"));
}
finish(rows.length ? "FAIL" : "PASS", rows.length ? `（真实类型检查未过：判定点 ${rows.length} 条）` : `（typescript ${ts.version || "?"} 实编译，0 条真实类型错误）`);
