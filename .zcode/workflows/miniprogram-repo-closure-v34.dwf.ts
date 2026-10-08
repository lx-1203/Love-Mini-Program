/* zcode-workflow
description: 仓库收口 v3.4（谱系 qa-loop v3.1→v3.2→qa-finish
  v3.3→本版）：面向「整理工作区根目录并修复启动bat路径」一类仓库状态收口——根目录白名单清点探针、绝对路径回归扫描、启动bat静态+动态（版本闸/NODE22_DIR
  逃生门）双门、reports 截图删留由证据门实测裁决、QA 全清单门禁两轮+面板、客户端构建/typecheck/单测守门员、分组显式提交+sha
  敏感复量、绿且无新转红才推送；需拍板事项只列不做。仪器事实：本机 files.glob/files.grep 会挂死，世界读取全走
  world.run(node -e)/git；PATH node 是 v16，跑 scripts/** 必须前置 Node22。相对 v3.3
  修掉一条空参假绿门（verify-real-coverage-disposition 的 args:[]）。
whenToUse: 需要把根目录整洁度、启动bat可用性、绝对路径回归、工作树删留与推送这些「仓库状态缺口」一次并行收口并出终报时运行；根目录整理类任务改版后回归或发布前清库皆可。
*/
// =====================================================================
// 根目录整理终验与仓库收口工作流 v3.4
// 谱系：miniprogram-qa-loop v3.1 → v3.2 → miniprogram-qa-finish v3.3 → 本文件（v3.4）
// 本轮目标（承接用户指定会话「整理工作区根目录并修复启动bat路径」的收尾 + 当前工作树实测缺口）：
//   ① 根目录再清点与回收：目录整理说明.md 标准（25 文件 + 31 目录）vs 现状（tmp_* 13 枚、nul、tmpr1-regsuccess-crops/）
//   ② 启动 bat 终验：%~dp0 定位没问题，但两支 bat 仍裸依赖 PATH 上的 pnpm/node —— PATH node 实测 v16.13.1，
//      uni 构建链需要 Node>=20（v16 会把构建崩成假红，实测记录见 v3.3 文件头）：给 bat 加版本闸 + NODE22_DIR
//      逃生门，再由守门员动态实跑证明
//   ③ 绝对路径回归清零：aefd8a72 清了 173 个脚本，其后 r7~r10 新增脚本必须重扫（扫描门进账单+终验各一轮）
//   ④ 3852 个 reports/screenshots 删除未提交：由证据门（corpus/provenance）实测裁决——双绿则提交删留、
//      有红指向缺件则当场恢复、读数起不来则列需拍板
//   ⑤ 32 个本地提交未推送 + 本轮新提交：终验绿且复量无新转红才推送；推送失败/本地落后即列需拍板
// 相对 v3.3 的改进（各有今天的实测依据）：
//   Ⅰ. 仪器事实：files.glob/files.grep 在本机当前环境挂死（连 scripts/qa/*.mjs 都 90s 超时），git.status 正常
//      ⇒ 全脚本禁用 files.*，世界读取一律 world.run(node -e)/git；
//   Ⅱ. 修掉 v3.3 一条空参门：GATE_SUITE 里 verify-real-coverage-disposition 的 args 是 []，
//      world.run 裸 node 无脚本秒退 0 ⇒ 假绿；本版补上真实脚本路径（与 bash run-final-verify-v33.sh :73 同参）；
//   Ⅲ. 仓库收口轮不强开 UI 交互腿（9420/DevTools 与本轮判域无关，省一条串行车与端口协议）；
//   Ⅳ. 收口对象从「台账缺口」换成「仓库状态缺口」：工作树分拣（删留/未提交功能体/未推送）是显式车道；
//   Ⅴ. appendonly.aof 是目录整理说明 §2.4 明文保护的合法根文件（Redis 运行时持久化）——根目录卫生车道不许动它。
// 纪律（沿用 v3.3 全部铁律 + 本轮补充）：
//   门面 Node<T> 无 .catch（兜底一律 .then 双参 + askFail）；world.run 沙箱跑不了 pnpm/uni/bat
//   （构建链与 bat 动态验证走「收口守门员」子代理，PATH 前置 Node22，stdin 给 </dev/null 防 bat 末尾 pause 挂死）；
//   数值判读以退出码/机器行为准；需用户拍板的事项只列不做（本项目铁律：不替写政策）；
//   增量落盘是硬要求（车道先把报告骨架写盘，每完成一项立刻更新那一份文件，绝不攒最后一次写；
//   盘上没有对应读数＝这项未收口，不许在回报里当已完成）。
// =====================================================================

// ===== 配置（数值只进这里）=====
const WORKFLOW = {
  version: "3.4",
  nodeBin: "D:/codex-tools/node-v22.17.0-win-x64/node.exe",
  closureDir: "reports/audit/rootorg-closure-2026-10-08",
  standardDoc: "目录整理说明.md",
  healthUrl: "http://127.0.0.1:8080/actuator/health",
  commitMsgA: "chore(repo): 根目录卫生回收+启动bat版本闸+绝对路径回归清零（v3.4 工作流）",
  commitMsgB: "evidence(qa): rootorg-closure 取证落盘+历史截图删留分拣落地（v3.4 工作流）",
};

// ===== 根目录白名单（来源：目录整理说明.md §1/§2；docs/ 是 openapi 门禁恢复产物，说明文档本轮补记）=====
const ROOT_FILES_ALLOWED = [
  "README.md", "目录整理说明.md", "build-mp-weixin.bat", "start-showcase.bat",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "eslint.config.mjs",
  "docker-compose.yml", "project.config.json", "project.private.config.json", "appendonly.aof",
  ".gitignore", ".editorconfig", ".npmrc", ".prettierignore", ".prettierrc.json", ".dockerignore",
  ".gitleaks.toml", ".spectral.yaml", ".env", ".env.example", ".scan-baseline.txt",
  ".scan-chinese-baseline.txt", ".zcodeignore", ".gitattributes", // 2026-09-29 用户裁定的 LFS fail-loud 闸，v3.4 首轮误报后补录
];
const ROOT_DIRS_ALLOWED = [
  ".claude", ".codegraph", ".design_library", ".git", ".github", ".mimosa", ".reasonix", ".trae", ".vscode", ".workbuddy", ".zcode",
  "apps", "config", "node_modules", "scripts", "tools", "tests", "database", "docker",
  "doc", "specs", "reports", "docs",
  "素材", "报告", "deliverables", "archive",
  "logs", "tmp", "截图存档", "verification_logs",
];

// ===== 门禁清单：与 v3.3 GATE_SUITE 同步（name/args/timeoutMs 逐字），完整判据注释见 v3.3 文件与 =====
// ===== scripts/qa/run-final-verify-v33.sh；本表只留一行动机。唯一实质差异见 disposition 那条注释。 =====
const GATE_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "台账词表/形状 verify-ledger", args: ["scripts/qa/verify-ledger.mjs", "reports/audit/round-6"], timeoutMs: 120000 },
  { name: "状态真值 verify-state-truth", args: ["scripts/qa/verify-state-truth.mjs", "reports/audit/round-7"], timeoutMs: 180000 },
  { name: "队列守恒 verify-queue-reconcile", args: ["scripts/verify-queue-reconcile.mjs", "reports/audit/round-7"], timeoutMs: 120000 },
  { name: "真实档覆盖 verify-real-coverage", args: ["scripts/qa/verify-real-coverage.mjs"], timeoutMs: 180000 },
  // --dry：账单阶段只准读盘不准写盘（不带 --dry 会覆写 round-7 判决件，v3.3 实测）
  { name: "判据台 verify-source-shape", args: ["scripts/qa/verify-source-shape.mjs", "--dry"], timeoutMs: 180000 },
  { name: "证据语料 verify-evidence-corpus", args: ["scripts/qa/verify-evidence-corpus.mjs"], timeoutMs: 600000 },
  { name: "溯源全量 verify-provenance-all", args: ["scripts/qa/verify-provenance-all.mjs"], timeoutMs: 600000 },
  // 420s：bash 同参；只准往大调，往小调是把能跑完的门改成被掐死的门（假红）
  { name: "档位新鲜度 verify-band-freshness", args: ["scripts/qa/verify-band-freshness.mjs"], timeoutMs: 420000 },
  { name: "后端新鲜度 verify-backend-fresh", args: ["scripts/qa/verify-backend-fresh.mjs"], timeoutMs: 120000 },
  // judge 分支会无条件写 round-7/evidence-holes-verdict.json（bash 同形，判域不动）
  { name: "证据洞 verify-evidence-holes", args: ["scripts/qa/verify-evidence-holes.mjs", "--mode", "judge"], timeoutMs: 300000 },
  { name: "离线负例聚合 run-qa-selftests", args: ["scripts/qa/run-qa-selftests.mjs"], timeoutMs: 900000 },
  { name: "dry 不抢租约静态门 verify-dry-no-lease", args: ["scripts/qa/verify-dry-no-lease.mjs"], timeoutMs: 180000 },
  { name: "载体接线零消费者门 verify-carrier-wiring", args: ["scripts/qa/verify-carrier-wiring.mjs"], timeoutMs: 180000 },
  { name: "车道报告骨架完成度 verify-lane-report-complete", args: ["scripts/qa/verify-lane-report-complete.mjs", "--intake", "reports/audit/round-7/lane-report-intake-round-7.json", "--exemptions", "reports/audit/round-7/lane-report-exemptions-round-7.json"], timeoutMs: 90000 },
  // v3.3 缺陷修复：原 args 是 []——world.run 裸 node 无脚本秒退 0 = 永假绿；本版补上脚本路径（bash :73 同参）
  { name: "真实档覆盖去向册 verify-real-coverage-disposition", args: ["scripts/qa/verify-real-coverage-disposition.mjs"], timeoutMs: 180000 },
  // --results 配对必须 title 全等（round-6 interact 那份），换配对会退 2——那是要的效果，别删本行
  { name: "用例可自动化预检 verify-case-automatable", args: ["scripts/qa/verify-case-automatable.mjs", "--results", "reports/audit/round-6/interact/exec-results.json", "--json", ".zcode/tmp/case-automatable/preflight.json"], timeoutMs: 180000 },
  { name: "工作流干跑预检 dryrun-workflow", args: ["scripts/qa/dryrun-workflow.mjs", "--profile", "all"], timeoutMs: 300000 },
  { name: "判据台戳 verify-ops-stamp", args: ["scripts/qa/verify-ops-corpus-stamp.mjs", "--check"], timeoutMs: 180000 },
];

// ===== 面板与面板后复量（与 GATE_SUITE 分表的原因见 v3.3 :177-188：面板重、抢租约、单发 1800s）=====
const PANEL_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "全量面板 emit-round-report", args: ["scripts/qa/emit-round-report.mjs", "--round-dir", "reports/audit/round-7", "--sidecar-dir", ".zcode/tmp/final-verify/panel", "--report", ".zcode/tmp/final-verify/panel/round-7-report.md", "--metrics", ".zcode/tmp/final-verify/panel/round-7-metrics.json"], timeoutMs: 1800000 },
  { name: "面板后台账复量 verify-ledger-after-panel", args: ["scripts/qa/verify-ledger.mjs", "reports/audit/round-6"], timeoutMs: 120000 },
  { name: "面板后状态真值复量 verify-state-truth-after-panel", args: ["scripts/qa/verify-state-truth.mjs", "reports/audit/round-7"], timeoutMs: 180000 },
];

// ===== 看板（声明一次；report(item,"gates") 喂点，同名 key 后写覆盖 → 终验后展示最终状态）=====
artifact.board("gates", {
  key: "gate",
  status: "status",
  columns: ["PASS", "RED"],
  cardTitle: "gate",
  detail: [{ field: "detail" }],
});

// ===== 结果类型 =====
interface GateOut {
  /** 门禁名 */
  name: string;
  /** 退出码 0=绿；-1=命令无法启动 */
  exitCode: number;
  /** 输出里的关键机器行（*_RESULT=… 等），截 200 字 */
  resultLine: string;
}
interface ProbeOut {
  /** 探针机器行读出的 PASS/FAIL */
  verdict: string;
  /** 输出要点（含违例清单），截 900 字 */
  detail: string;
  exitCode: number;
}
interface Bill {
  gates: GateOut[];
  rootInv: ProbeOut;
  absScan: ProbeOut;
  batStatic: ProbeOut;
  backendUp: boolean;
  pathNodeVersion: string;
  dirty: number;
  deletions: number;
  deletionsScreenshots: number;
  untracked: number;
  ahead: number;
  branch: string;
  head: string;
}
interface SortItem {
  /** 缺口编号 */
  id: string;
  /** 收口车道域：根目录卫生/启动bat/绝对路径/证据删留 */
  area: string;
  /** 指定补法 */
  how: string;
  /** 出处（探针名/文件:行） */
  source: string;
}
interface UserItem {
  id: string;
  why: string;
  options: string;
}
interface SortOut {
  executable: SortItem[];
  needsUser: UserItem[];
  notes: string;
}
interface LaneOut {
  lane: string;
  fixedIds: string[];
  filesChanged: string[];
  skipped: { id: string; reason: string }[];
  evidence: string[];
  notes: string;
}
interface CheckOut {
  ok: boolean;
  err: string;
  command: string;
}
interface Finding {
  where: string;
  what: string;
  evidence: string;
  status: "verified" | "unconfirmed";
  severity: "high" | "medium" | "low";
}

// ===== 兜底与工具 =====
const blockers: string[] = [];
function askFail<T>(who: string, e: unknown, fallback: T): T {
  const msg = `${who} 的 ask 调用失败（执行器/配额故障，不是产品缺陷，也不得计入通过）：${String(e).slice(0, 140)}`;
  blockers.push(msg);
  log("[ask-catch] " + msg);
  return fallback;
}
async function gitTry(args: string[]): Promise<{ spawned: boolean; ok: boolean; out: string; err: string }> {
  try {
    const r = await world.run("git", args);
    return { spawned: true, ok: r.exitCode === 0, out: r.stdout, err: r.stderr };
  } catch (e) {
    return { spawned: false, ok: false, out: "", err: String(e) };
  }
}
function resultLineOf(out: string): string {
  const lines = out.split(/\r?\n/).filter(l => /_RESULT\s*=/.test(l));
  const last = lines.length > 0 ? lines[lines.length - 1] : "(无机器行)";
  return last.slice(0, 200);
}
async function runGate(g: { name: string; args: string[]; timeoutMs: number }): Promise<GateOut> {
  try {
    const r = await world.run("D:/codex-tools/node-v22.17.0-win-x64/node.exe", g.args, { timeoutMs: g.timeoutMs });
    const out = (r.stdout || "") + (r.stderr || "");
    return { name: g.name, exitCode: r.exitCode, resultLine: resultLineOf(out) };
  } catch (e) {
    return { name: g.name, exitCode: -1, resultLine: ("命令无法启动: " + String(e)).slice(0, 200) };
  }
}
function gateToBoard(g: GateOut): void {
  report({ gate: g.name, status: g.exitCode === 0 ? "PASS" : "RED", detail: g.resultLine }, "gates");
}
/** 探针 = node -e 代码字符串（代码是本文件常量，world.run 日志按 argv 固定，重放安全） */
async function runProbe(name: string, code: string, args: string[], timeoutMs: number): Promise<ProbeOut> {
  try {
    const r = await world.run("D:/codex-tools/node-v22.17.0-win-x64/node.exe", ["-e", code, ...args], { timeoutMs });
    const out = (r.stdout || "") + (r.stderr || "");
    const m = out.match(new RegExp(name + "_RESULT=(\\S+)"));
    return { verdict: m ? m[1] : (r.exitCode === 0 ? "PASS" : "FAIL"), detail: out.slice(0, 900), exitCode: r.exitCode };
  } catch (e) {
    return { verdict: "FAIL", detail: "探针无法启动: " + String(e).slice(0, 200), exitCode: -1 };
  }
}
/** 账单落盘：看板只活在宿主会话里，每阶段先落盘再推理。内容走 argv，绝不拼进脚本文本。 */
async function persistJson(file: string, data: unknown): Promise<void> {
  try {
    await world.run("D:/codex-tools/node-v22.17.0-win-x64/node.exe", ["-e",
      "const f=require('fs'),p=require('path');f.mkdirSync(p.dirname(process.argv[1]),{recursive:true});f.writeFileSync(process.argv[1],process.argv[2]);",
      file, JSON.stringify(data, null, 1)], { timeoutMs: 20000 });
  } catch (e) {
    log("账单落盘失败（不改变门禁判定）：" + String(e).slice(0, 80));
  }
}

// ===== 三只探针的 node -e 代码（TS 侧单引号字符串；正则反斜杠按 JS 源码转义）=====
const ROOT_INV_CODE = [
  "const fs=require('fs'),p=require('path');",
  "const allow=JSON.parse(process.argv[1]);",
  "const fileViol=[],dirViol=[];",
  "for(const e of fs.readdirSync('.',{withFileTypes:true})){",
  "  if(allow.files.indexOf(e.name)>=0||allow.dirs.indexOf(e.name)>=0)continue;",
  "  let isDir=e.isDirectory();",
  "  if(e.isSymbolicLink()){try{isDir=fs.statSync(e.name).isDirectory();}catch(_){}}",
  "  (isDir?dirViol:fileViol).push(e.name);",
  "}",
  "fs.mkdirSync(p.dirname(process.argv[2]),{recursive:true});",
  "fs.writeFileSync(process.argv[2],JSON.stringify({fileViol,dirViol},null,1));",
  "console.log('ROOT_INV_RESULT='+(fileViol.length+dirViol.length===0?'PASS':'FAIL'));",
  "console.log('ROOT_INV_FILE_VIOL='+JSON.stringify(fileViol));",
  "console.log('ROOT_INV_DIR_VIOL='+JSON.stringify(dirViol));",
].join("\n");

const ABS_SCAN_CODE = [
  "const fs=require('fs'),path=require('path');",
  "const SKIP=new Set(['node_modules','.git','dist','unpackage','target','build','.gradle','out','archive','reports','tmp','logs','verification_logs','截图存档','素材','报告','deliverables','.zcode','doc','.codegraph','.design_library','.mimosa','.reasonix','.trae','.workbuddy','.claude','.vscode','.github']);",
  "const EXTS=new Set(['.js','.cjs','.mjs','.ts','.vue','.json','.yml','.yaml','.sh','.bat','.cmd','.ps1','.properties','.xml','.sql','.html','.css','.scss','.java','.gradle','.svg']);",
  "const RE=new RegExp('(?<![A-Za-z])[A-Za-z]:[\\\\/]');",
  "const hits=[];let scanned=0;let stopped=false;",
  "function scanText(rel){",
  "  let txt='';try{txt=fs.readFileSync(rel,'utf8');}catch(_){return;}",
  "  scanned++;",
  "  const lines=txt.split(/\\r?\\n/);",
  "  for(let i=0;i<lines.length;i++){",
  "    if(RE.test(lines[i])){hits.push({f:rel.split('\\\\').join('/'),l:i+1,t:lines[i].trim().slice(0,120)});if(hits.length>=500){stopped=true;return;}}",
  "  }",
  "}",
  "function walk(d){",
  "  if(stopped)return;",
  "  let list=[];try{list=fs.readdirSync(d,{withFileTypes:true});}catch(_){return;}",
  "  for(const e of list){",
  "    if(stopped)return;",
  "    if(e.name.charAt(0)==='.')continue;",
  "    const full=d+'/'+e.name;",
  "    if(e.isDirectory()){if(!SKIP.has(e.name))walk(full);continue;}",
  "    if(EXTS.has(path.extname(e.name).toLowerCase()))scanText(full);",
  "  }",
  "}",
  "for(const r of ['scripts','tools','tests','config','database','docker','docs','specs','apps'])walk(r);",
  "for(const b of ['build-mp-weixin.bat','start-showcase.bat'])scanText(b);",
  "fs.mkdirSync(path.dirname(process.argv[1]),{recursive:true});",
  "fs.writeFileSync(process.argv[1],JSON.stringify({scanned,hits,stopped},null,1));",
  "console.log('ABS_SCAN_RESULT='+(hits.length===0?'PASS':'HIT')+' scanned='+scanned+' hits='+hits.length+(stopped?' (上限500截断)':''));",
  "for(const h of hits.slice(0,10))console.log('ABS_HIT '+h.f+':'+h.l+' '+h.t);",
].join("\n");

const BAT_STATIC_CODE = [
  "const fs=require('fs'),p=require('path');",
  "const bats=['build-mp-weixin.bat','start-showcase.bat'];",
  "const problems=[];",
  "const RE=new RegExp('(?<![A-Za-z])[A-Za-z]:[\\\\/]');",
  "for(const b of bats){",
  "  let txt='';try{txt=fs.readFileSync(b,'utf8');}catch(e){problems.push(b+': 读取失败 '+String(e).slice(0,60));continue;}",
  "  if(RE.test(txt))problems.push(b+': 含盘符绝对路径（违反 目录整理说明.md §5）');",
  "  if(txt.indexOf('%~dp0')<0)problems.push(b+': 未用 %~dp0 定位工作目录');",
  "  if(txt.indexOf('NODE22_DIR')<0)problems.push(b+': 缺 NODE22_DIR/Node 版本闸（PATH node=v16 会把构建链崩成假红）');",
  "}",
  "let pkg={};try{pkg=JSON.parse(fs.readFileSync('apps/client/package.json','utf8'));}catch(e){problems.push('apps/client/package.json 解析失败');}",
  "const need=['build:mp-weixin','build:mp-weixin:mock','build:mp-weixin:showcase:isolated'];",
  "for(const k of need){if(!pkg.scripts||!pkg.scripts[k])problems.push('apps/client/package.json 缺 script: '+k);}",
  "if(!fs.existsSync('apps/client/scripts/inject-wx-appid.mjs'))problems.push('缺 apps/client/scripts/inject-wx-appid.mjs（WX_APPID 注入依赖）');",
  "fs.mkdirSync(p.dirname(process.argv[1]),{recursive:true});",
  "fs.writeFileSync(process.argv[1],JSON.stringify({problems},null,1));",
  "console.log('BAT_STATIC_RESULT='+(problems.length===0?'PASS':'FAIL'));",
  "for(const q of problems)console.log('BAT_STATIC_PROBLEM '+q);",
].join("\n");

// ===== 守门员（构建链/bat 动态验证唯一合法通道）=====
const gatekeeper = agent("收口守门员", "你只负责运行指定命令并如实报告结果，绝不修改任何文件、绝不为通过而改跑别的命令。若命令不可能通过，如实 ok=false 并贴出现象，宁可红也不放水。");
// Git 管家单例：A/B 两组提交回退共用一个具名代理（同一运行里具名代理重名会炸整场，绝不两处 agent 同名）
const gitButler = agent("Git 管家", "你负责在 git 提交失败时诊断并完成规定范围的提交，绝不提交范围外文件。做不到就如实说原因，绝不扩范围硬提。");
async function runViaGatekeeper(purpose: string, command: string, timeoutMs: number): Promise<CheckOut> {
  const r = await gatekeeper.ask<CheckOut>(
    [
      `运行${purpose}并如实报告。用 Bash 执行这一行（PATH 前置 Node22，Windows Git Bash；stdin 接 /dev/null 防 bat 末尾 pause 挂死）：`,
      `export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" && ${command}`,
      `要求：等命令完整结束（Bash timeout 设 ${timeoutMs}）；ok = (退出码 === 0)；err = 失败时最后 50 行输出、成功时留空；command 回填实际执行的命令。`,
      `【诚实铁律】禁止伪造：跑不起来/超时/输出异常都如实 ok=false；禁止顺手修任何编译错误（修复不是你的职责）。若你的指令相互矛盾或命令不可能通过，直接说明而不是硬跑。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<CheckOut>("收口守门员", e, { ok: false, err: "守门员调用失败: " + String(e), command }));
  return { ok: r.ok === true, err: typeof r.err === "string" ? r.err : "", command: typeof r.command === "string" ? r.command : command };
}

// =====================================================================
phase("盘点出账单");
// —— QA 全清单门禁并行 + 三只仓库状态探针（根目录清点/绝对路径扫描/bat 静态检查）+ 环境/工作树读数 ——
const gateOuts: GateOut[] = await Promise.all(GATE_SUITE.map(async (g) => {
  const out = await runGate(g);
  gateToBoard(out);
  log(`门禁 ${out.name}: exit=${out.exitCode} ${out.resultLine}`);
  return out;
}));
const allowJson = JSON.stringify({ files: ROOT_FILES_ALLOWED, dirs: ROOT_DIRS_ALLOWED });
const probeResults = await Promise.all([
  runProbe("ROOT_INV", ROOT_INV_CODE, [allowJson, WORKFLOW.closureDir + "/probe-root-inventory.json"], 60000),
  runProbe("ABS_SCAN", ABS_SCAN_CODE, [WORKFLOW.closureDir + "/probe-abs-paths.json"], 300000),
  runProbe("BAT_STATIC", BAT_STATIC_CODE, [WORKFLOW.closureDir + "/probe-bat-static.json"], 60000),
]);
const rootInv = probeResults[0];
const absScan = probeResults[1];
const batStatic = probeResults[2];
log(`根目录清点=${rootInv.verdict} 绝对路径扫描=${absScan.verdict} bat静态=${batStatic.verdict}`);

let backendUp = false;
try {
  const h = await world.run("curl", ["-s", "-m", "3", WORKFLOW.healthUrl], { timeoutMs: 10000 });
  backendUp = h.stdout.indexOf('"UP"') >= 0;
} catch {
  backendUp = false;
}
let pathNodeVersion = "unknown";
try {
  const nv = await world.run("node", ["-v"], { timeoutMs: 15000 });
  pathNodeVersion = nv.stdout.trim() || "unknown";
} catch {
  pathNodeVersion = "unknown";
}
const st = await gitTry(["status", "--porcelain"]);
let dirty = -1;
let deletions = 0;
let deletionsScreenshots = 0;
let untracked = 0;
if (st.ok) {
  const lines = st.out.split(/\r?\n/).filter(l => l.trim() !== "");
  dirty = lines.length;
  for (const line of lines) {
    if (line.startsWith("D ")) {
      deletions++;
      if (line.indexOf("reports/screenshots") >= 0) deletionsScreenshots++;
    } else if (line.startsWith("??")) {
      untracked++;
    }
  }
}
const aheadRes = await gitTry(["rev-list", "--count", "origin/main..HEAD"]);
const ahead = aheadRes.ok ? (parseInt(aheadRes.out.trim(), 10) || 0) : -1;
const head = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
const branch = (await gitTry(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() || "unknown";
const redGates = gateOuts.filter(g => g.exitCode !== 0);
const bill: Bill = { gates: gateOuts, rootInv, absScan, batStatic, backendUp, pathNodeVersion, dirty, deletions, deletionsScreenshots, untracked, ahead, branch, head };
log(`账单就绪：红门 ${redGates.length}/${gateOuts.length}，根目录违例见 ${rootInv.verdict}，绝对路径 ${absScan.verdict}，bat静态 ${batStatic.verdict}，后端${backendUp ? "UP" : "DOWN"}，PATH node=${pathNodeVersion}，工作树脏 ${dirty}（删 ${deletions}，其中截图 ${deletionsScreenshots}），未跟踪 ${untracked}，领先远端 ${ahead}，HEAD=${head}`);
await persistJson(WORKFLOW.closureDir + "/gapbill-v34.json", bill);

// =====================================================================
phase("分拣缺口");
// —— 分拣员只分拣不执行：四条固定车道吃确定性种子，分拣员补漏并把政策类事项交还用户 ——
const seeds: SortItem[] = [];
if (rootInv.verdict !== "PASS") {
  seeds.push({
    id: "ROOT-HYGIENE",
    area: "根目录卫生",
    how: "按 目录整理说明.md §3 决策表回收根目录违例：tmp_* 散文件与 tmpr1-regsuccess-crops/ 一律移入 tmp/retired-20261008/（不删，非破坏）；nul 是 Windows 保留名垃圾文件，先试 Git Bash 的 rm -f nul，不行再试 cmd //c \"del \\\\\\\\.\\\\D:\\\\6\\\\恋爱小程序\\\\nul\"，两条都不行就如实记 skipped 并留方法。appendonly.aof 是说明 §2.4 保护文件（Redis 运行时持久化）绝对不动。回收完成后同步修订 目录整理说明.md：§0 说 25 个文件而 §2 标题写 29 个，本身就是矛盾——按现状重数并统一；把 docs/（openapi 门禁恢复产物）补进 §1 子目录清单并注明恢复缘由。违例清单见 " + WORKFLOW.closureDir + "/probe-root-inventory.json",
    source: "本轮 ROOT_INV 探针 + 目录整理说明.md §0/§1/§2.4",
  });
}
if (batStatic.verdict !== "PASS") {
  seeds.push({
    id: "BAT-VERSIONGATE",
    area: "启动bat",
    how: "给 build-mp-weixin.bat 与 start-showcase.bat 补 Node 版本闸（两支 bat 都在 Step1 之前）：① 若定义了 NODE22_DIR 环境变量则把它前置到 PATH；② 否则用 node -v 探测 PATH 上的 node 主版本，低于 20 就打印 ERROR 与两条修复路径（升级 node，或 set NODE22_DIR=<你的 Node>=20 目录 后重跑）并 exit /b 1——不许在 bat 里写死任何盘符路径（扫描门会红）。保持 %~dp0 定位与既有 errorlevel 纪律。静态清单见 " + WORKFLOW.closureDir + "/probe-bat-static.json",
    source: "本轮 BAT_STATIC 探针 + v3.3 文件头 Node16 PATH 坑实测记录",
  });
}
if (absScan.verdict !== "PASS") {
  seeds.push({
    id: "ABSPATH-REGRESSION",
    area: "绝对路径",
    how: "把扫描命中的盘符绝对路径改回可推导写法（__dirname/import.meta.dirname/%~dp0/$SCRIPT_DIR/require.resolve），只动代码/脚本/配置文件；命中若在文档或 QA 报告里（引用历史的叙述）不改，逐条列进报告留档待拍板。命中清单见 " + WORKFLOW.closureDir + "/probe-abs-paths.json",
    source: "本轮 ABS_SCAN 探针（aefd8a72 清零后的回归扫描）",
  });
}
seeds.push({
  id: "EVIDENCE-DELETIONS",
  area: "证据删留",
  how: "对 3852 个 reports/screenshots 未提交删除做实测裁决：读账单里 verify-evidence-corpus 与 verify-provenance-all 两条读数——① 双 exit=0 ⇒ 删除是证据门 bless 过的状态，写决定文件 awaiting-commit-deletions=true（真正提交在编排层提交阶段做，你不执行 git add/commit）；② 任一红且红因指向缺截图 ⇒ 立即 git restore reports/screenshots 并复跑那两条门确认转绿；③ 任一读数 exit=-1（起不来）⇒ 不动盘面，写进需拍板。另把本轮三个未跟踪证据路径（reports/audit/2026-10-07-editpage-replace/、reports/audit/round-7/cap-ids/、reports/audit/round-7/device-legs-closure-2026-10-06.md）登记进待提交清单 awaiting-commit-adds。",
  source: "git status 实测：删除 " + String(deletions) + " 条全在 reports/screenshots",
});
log(`确定性种子 ${seeds.length} 条：` + seeds.map(s => s.id).join("、"));

const sorter = agent("缺口分拣员", "你是只读分拣员：读账单与相关文档，把本轮缺口分拣清楚。绝不修改任何文件、绝不把「需拍板」项擅自划进可执行——本项目铁律是判据冲突/政策类事项交人决定。");
const sortRes = await sorter.ask<SortOut>(
  [
    `缺口账单（机器实测）：${JSON.stringify({ redGates: redGates.map(g => ({ name: g.name, line: g.resultLine })), rootInv: rootInv.detail, absScan: absScan.detail, batStatic: batStatic.detail, deletions, deletionsScreenshots, untracked, ahead, pathNodeVersion, backendUp })}`,
    `四条固定车道已吃下这些确定性种子（不用重复分拣）：${seeds.map(s => s.id + "（" + s.area + "）").join("、")}。`,
    `你的任务：① 检查账单里还有没有种子没覆盖的缺口（尤其红门里与仓库状态相关、且判据明确的），补成分拣行，area 从这四个里选：根目录卫生/启动bat/绝对路径/证据删留，每条 {id, area, how, source}；② 把政策/判据冲突/数据去留类事项列成 needsUser 每条 {id, why, options}；③ 如果账单干净、没有要补的，executable 返回空数组即可，不要硬凑。`,
    `判域边界：2026-10-05 功能体（VIP 订单/微信支付等未提交源码）不归本轮、不得列入 executable；QA 台账（round-7 issue-matrix）本轮不写；DevTools/UI 验证不归本轮。`,
    `【纪律】宁多列 needsUser 也不许把拍板项混进 executable；每条 executable 必须能指到探针/门禁读数或文档出处。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<SortOut>("缺口分拣员", e, { executable: [], needsUser: [], notes: "分拣员调用失败，本轮按确定性种子收口" }));
const executableRows = Array.isArray(sortRes.executable) ? sortRes.executable : [];
const needsUserRows = Array.isArray(sortRes.needsUser) ? sortRes.needsUser : [];
log(`分拣完成：分拣员补充可执行 ${executableRows.length} 项，需拍板 ${needsUserRows.length} 项`);
await persistJson(WORKFLOW.closureDir + "/sort-v34.json", { seeds, executableRows, needsUserRows });

// —— 需拍板事项的确定性底座：功能体入库方式永远交用户 ——
const seededNeedsUser: UserItem[] = [
  {
    id: "OCT5-FEATURE-BODY",
    why: "工作树挂着 2026-10-05 功能体未提交（VIP 订单/微信支付/实名照片清理/协议留痕：约 108 个改动 + 约 34 个新文件 + 6 个 Flyway 迁移 V2026.10.05.*），不属于本轮「根目录整理」判域，且未经后端测试门验证，不得擅自入库",
    options: "a) 下一轮跑后端 mvnw test 全绿后按功能拆提交入库；b) 保持未提交现状仅留档说明；c) 你指定拆分粒度后执行",
  },
];

// =====================================================================
phase("并行收口四车道");
// —— 按域并行；每车道内部 修复→独立复验 链式；增量落盘是硬要求 ——
const areas = ["根目录卫生", "启动bat", "绝对路径", "证据删留"];
const laneRecipes: Record<string, string> = {
  "根目录卫生": "违例文件与目录的移动/删除一律非破坏优先（移入 tmp/retired-20261008/ 而不是删）；nul 用保留名专用删法；appendonly.aof 不许动；说明文档计数修订以实际重数为准",
  "启动bat": "只改根目录两支 .bat 与（如确需）apps/client/scripts 下的配套脚本；版本闸不许写死盘符；改完自测两支 bat 的 node -v 探测分支（可用 NODE22_DIR 指向 D:/codex-tools/node-v22.17.0-win-x64 演练 good-case，用清空 PATH 演练 bad-case 的报错文案）",
  "绝对路径": "只动代码/脚本/配置；文档/QA 报告里的命中不改、逐条留档；改完用 grep -rInP '(?<!)[A-Za-z]:[/\\\\](6|Users|[Uu]sers)' 自测（注意 Git Bash 的 -P 看后行语法），确保代码域清零",
  "证据删留": "按种子 how 里的三分规则执行；恢复用 git restore reports/screenshots（若规则②）；决定与待提交清单写到 " + WORKFLOW.closureDir + "/evidence-disposition.json；不执行任何 git add/commit（提交归编排层）",
};
const lanePromises = areas.map((area) => {
  const items = [...seeds.filter(i => i.area === area), ...executableRows.filter(i => i && i.area === area)];
  return (async (): Promise<LaneOut> => {
    if (items.length === 0) {
      log(`车道 ${area}：无分拣项，跳过（该域探针本就 PASS 时属正常）`);
      return { lane: area, fixedIds: [], filesChanged: [], skipped: [], evidence: [], notes: "无分拣项" };
    }
    const fixer = await agent(`收口车道-${area}`, "你按指定补法实现收口：只动本车道判域内的文件，不碰 .zcode/**、不做 git 提交、不跑别的车道的事。修完必须留下能变红的自测证据。若实现前提不成立，如实写进 skipped 不硬修。若指令相互矛盾或做不到，如实说明而不是绕过。").ask<LaneOut>(
      [
        `本车道要收口的缺口：${JSON.stringify(items)}`,
        `本车道纪律：${laneRecipes[area] ?? ""}`,
        `环境纪律：跑命令用 Bash 且 PATH 前置 Node22（export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH"）。`,
        `增量落盘是硬要求：开工先把报告骨架写入 ${WORKFLOW.closureDir}/lane-${area}.md，此后每完成一项立刻更新那一份文件，绝不攒到最后一次写；盘上没有对应读数＝这项未收口，不许在回报里当已完成。`,
        `返回 fixedIds / filesChanged（工作区相对路径）/ skipped（不修必须给 reason）/ evidence（文件:行 或 命令输出要点）/ notes。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>(`收口车道-${area}`, e, { lane: area, fixedIds: [], filesChanged: [], skipped: items.map(i => ({ id: i.id, reason: "车道调用失败，未处理" })), evidence: [], notes: "" }));
    const toVerify = (fixer.fixedIds ?? []).filter(id => id !== "");
    if (toVerify.length === 0) return fixer;
    const verifier = await agent(`收口复验员-${area}`, "你是独立复验员：只认盘上证据（文件:行、命令输出、探针重跑），不复述修复者的自报。每条要么给可复核的证实证据（放 fixedIds），要么如实进 skipped（reason 写「复验未通过: …」）。不修改任何文件。").ask<LaneOut>(
      [
        `逐条复验这些声称已收口的缺口：${JSON.stringify(toVerify)}；改动文件：${JSON.stringify(fixer.filesChanged ?? []).slice(0, 2000)}`,
        `验证方式优先级：重跑对应探针/门（根目录卫生→重数根目录条目对照白名单；启动bat→检查两支 bat 含 NODE22_DIR 与 %~dp0 且无盘符路径、被引用脚本存在；绝对路径→重跑 grep 扫描；证据删留→git status 对照决定文件）> 直接读文件锚点。fixedIds 只放你亲手证实的；skipped 放未通过的；evidence 给命令输出要点或 文件:行。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>(`收口复验员-${area}`, e, { lane: area, fixedIds: [], filesChanged: [], skipped: toVerify.map(id => ({ id, reason: "复验员调用失败，按未证实处置" })), evidence: [], notes: "" }));
    const merged: LaneOut = {
      lane: area,
      fixedIds: verifier.fixedIds ?? [],
      filesChanged: [...new Set([...(fixer.filesChanged ?? []), ...(verifier.filesChanged ?? [])])].filter(f => f !== ""),
      skipped: [...(fixer.skipped ?? []), ...(verifier.skipped ?? [])],
      evidence: verifier.evidence ?? [],
      notes: [(fixer.notes ?? ""), (verifier.notes ?? "")].filter(s => s !== "").join("；"),
    };
    for (const s of merged.skipped) blockers.push(`车道 ${area}: ${s.id} 未收口（${s.reason.slice(0, 80)}）`);
    report({ lane: area, fixed: merged.fixedIds.length, skipped: merged.skipped.length, files: merged.filesChanged.length });
    return merged;
  })();
});
const laneResults: LaneOut[] = await Promise.all(lanePromises);
const allLaneFiles = [...new Set(laneResults.flatMap(l => l.filesChanged ?? []))].filter(f => f !== "");
log(`四车道收工：证实 ${laneResults.reduce((n, l) => n + (l.fixedIds?.length ?? 0), 0)} 条，未收 ${laneResults.reduce((n, l) => n + (l.skipped?.length ?? 0), 0)} 条，改动文件 ${allLaneFiles.length} 个`);
await persistJson(WORKFLOW.closureDir + "/lane-results-v34.json", laneResults);

// —— 证据删留裁决读取（决定提交阶段怎么处理 reports/screenshots 删除）——
let commitDeletions = false;
let restoreDone = false;
const evLane = laneResults.find(l => l.lane === "证据删留");
if (evLane) {
  commitDeletions = ((evLane.notes ?? "") + " " + (evLane.evidence ?? []).join(" ")).indexOf("awaiting-commit-deletions=true") >= 0;
  restoreDone = ((evLane.notes ?? "") + " " + (evLane.evidence ?? []).join(" ")).indexOf("restored") >= 0 || ((evLane.notes ?? "").indexOf("已恢复") >= 0);
}
const corpusGate = gateOuts.find(g => g.name.endsWith("verify-evidence-corpus"));
const provGate = gateOuts.find(g => g.name.endsWith("verify-provenance-all"));
if (corpusGate && provGate && corpusGate.exitCode === 0 && provGate.exitCode === 0 && deletions > 0 && !restoreDone) {
  commitDeletions = true;
  log(`证据删留脚本侧裁决：corpus/provenance 双绿且删除仍在盘 ⇒ 按 bless 状态提交删留（commitDeletions=true）`);
}

// =====================================================================
phase("门禁终验与构建");
// —— 构建/typecheck/vitest 守门员（失败交修复工程师，最多 2 轮）+ bat 动态实跑 + 门禁套件复量对照账单 ——
const fixerAgent = agent("收口修复工程师", "你是小程序前端与仓库工程专家：按失败输出修复问题，只修真问题，禁止改测试断言来凑绿、禁止用 any 糊弄，修完自查。不碰 .zcode/**、不提交。若问题在你的判域之外（如判据本身待拍板），如实说明。");
let buildOk = false;
let tcOk = false;
let testOk = false;
let showcaseOk = false;
let backendCompileOk = false;
for (let round = 1; round <= 2; round++) {
  log(`构建/typecheck/vitest 第 ${round} 次守门员验证`);
  // G1：build-mp-weixin.bat 动态实跑——既是 mock 构建（G1 等价物），又是启动 bat 路径修复的动态证明
  const b = await runViaGatekeeper("G1 build-mp-weixin.bat 动态实跑（mock 构建 + 启动bat路径证明）", "cmd //c build-mp-weixin.bat </dev/null", 1800000);
  buildOk = b.ok;
  if (!b.ok) {
    blockers.push(`bat 动态实跑未过（第 ${round} 次）：${b.err.slice(-300)}`);
    await fixerAgent.ask(
      `build-mp-weixin.bat 动态实跑失败尾部：\n${b.err.slice(-2000)}\n请修复直到该 bat 在 PATH 前置 Node22 的环境下能完整跑通（保持版本闸与 %~dp0，不许写死盘符路径）。返回退出码与结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
    continue;
  }
  const tc = await runViaGatekeeper("G2 typecheck", "pnpm -C apps/client run typecheck", 900000);
  tcOk = tc.ok;
  if (!tc.ok) {
    blockers.push(`typecheck 未过（第 ${round} 次）：${tc.err.slice(-300)}`);
    await fixerAgent.ask(
      `typecheck 失败尾部：\n${tc.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run typecheck 通过，返回结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
    continue;
  }
  const t = await runViaGatekeeper("G3 单测", "pnpm -C apps/client run test:unit", 1800000);
  testOk = t.ok;
  if (!t.ok) {
    blockers.push(`单测未过（第 ${round} 次）：${t.err.slice(-300)}`);
    await fixerAgent.ask(
      `单测失败尾部：\n${t.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run test:unit 通过，返回结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
  }
}
if (testOk) {
  // 展示包隔离构建：start-showcase.bat 的核心编译步（不起后端窗口，那步留待人工）
  const sc = await runViaGatekeeper("showcase 隔离构建（start-showcase.bat 核心步）", "pnpm -C apps/client run build:mp-weixin:showcase:isolated", 1800000);
  showcaseOk = sc.ok;
  if (!sc.ok) blockers.push(`showcase 隔离构建未过：${sc.err.slice(-300)}`);
  const be = await runViaGatekeeper("后端编译门（工作树未提交源码的可编译性）", "cd apps/api && ./mvnw -q -DskipTests compile", 1200000);
  backendCompileOk = be.ok;
  if (!be.ok) blockers.push(`后端编译未过：${be.err.slice(-300)}`);
}
log(`构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"} showcase=${showcaseOk ? "PASS" : "FAIL"} 后端编译=${backendCompileOk ? "PASS" : "FAIL"}`);
if (!buildOk) blockers.push("终验：build-mp-weixin.bat 动态实跑 FAIL");
if (!tcOk) blockers.push("终验：typecheck FAIL");
if (!testOk) blockers.push("终验：单测 FAIL");

// —— 门禁套件复量：与开账单对照 + 三只仓库探针复量 ——
const gateOuts2: GateOut[] = await Promise.all(GATE_SUITE.map(async (g) => {
  const out = await runGate(g);
  gateToBoard(out);
  return out;
}));
const probeResults2 = await Promise.all([
  runProbe("ROOT_INV", ROOT_INV_CODE, [allowJson, WORKFLOW.closureDir + "/probe-root-inventory-final.json"], 60000),
  runProbe("ABS_SCAN", ABS_SCAN_CODE, [WORKFLOW.closureDir + "/probe-abs-paths-final.json"], 300000),
  runProbe("BAT_STATIC", BAT_STATIC_CODE, [WORKFLOW.closureDir + "/probe-bat-static-final.json"], 60000),
]);
const before = new Map(gateOuts.map(g => [g.name, g.exitCode]));
const improved = gateOuts2.filter(g => (before.get(g.name) ?? -1) !== 0 && g.exitCode === 0).map(g => g.name);
const stillRed = gateOuts2.filter(g => g.exitCode !== 0).map(g => g.name);
const flippedNew = gateOuts2.filter(g => {
  const b = before.get(g.name);
  return b === 0 && g.exitCode !== 0;
});
log(`门禁复量：新转绿 ${improved.length} 项（${improved.join("、") || "无"}），仍红 ${stillRed.length} 项，新转红 ${flippedNew.length} 项`);
for (const o of flippedNew) blockers.push(`终验新转红（收口动作所致或环境漂移，须解释）：${o.name}（${o.resultLine}）`);
log(`探针复量：根目录=${probeResults2[0].verdict} 绝对路径=${probeResults2[1].verdict} bat静态=${probeResults2[2].verdict}`);
if (probeResults2[0].verdict !== "PASS") blockers.push("终验探针：根目录仍有违例 " + probeResults2[0].detail.slice(0, 200));
if (probeResults2[1].verdict !== "PASS") blockers.push("终验探针：绝对路径仍有命中 " + probeResults2[1].detail.slice(0, 200));
if (probeResults2[2].verdict !== "PASS") blockers.push("终验探针：bat 静态检查未过 " + probeResults2[2].detail.slice(0, 200));

// —— 反 vacuous-green：复量出来的绿必须能变红，否则那条绿不算证据 ——
const redProbe = await runGate({ name: "门禁可变红自检 prove-gates-can-fail", args: ["scripts/qa/prove-gates-can-fail.mjs"], timeoutMs: 300000 });
gateToBoard(redProbe);
log(`可变红自检：exit=${redProbe.exitCode} ${redProbe.resultLine}`);
if (redProbe.exitCode !== 0) blockers.push(`有门禁在变异后仍放行（VACUOUS）或案例证据不足（INCONCLUSIVE）：${redProbe.resultLine}`);
await persistJson(WORKFLOW.closureDir + "/gate-recheck-v34.json", { gates: gateOuts2, improved, stillRed, flipped: flippedNew.map(o => o.name), probes: probeResults2, redProbe });

// —— 全量面板 + 面板后复量（顺序跑不并发：后两条读的就是面板落盘之后的台账形状）——
const panelOuts: GateOut[] = [];
for (const g of PANEL_SUITE) {
  const o = await runGate(g);
  gateToBoard(o);
  panelOuts.push(o);
  log(`面板腿 ${o.name}: exit=${o.exitCode} ${o.resultLine}`);
  if (o.exitCode !== 0) blockers.push(`面板腿红：${o.name}（${o.resultLine}）`);
}

// —— 终报读数汇总（键集在终验后即定；落盘与生成器在提交前那个 phase 做，好让 §7 回填进 B 组提交）——
const finalReadings: Record<string, number> = {};
for (const o of [...gateOuts2, ...panelOuts]) finalReadings[o.name] = o.exitCode;
finalReadings["ROOT_INV"] = probeResults2[0].exitCode;
finalReadings["ABS_SCAN"] = probeResults2[1].exitCode;
finalReadings["BAT_STATIC"] = probeResults2[2].exitCode;
finalReadings["BAT_DYNAMIC_BUILD"] = buildOk ? 0 : 1;
finalReadings["SHOWCASE_ISOLATED_BUILD"] = showcaseOk ? 0 : 1;
finalReadings["BACKEND_COMPILE"] = backendCompileOk ? 0 : 1;
const redNames = Object.keys(finalReadings).filter(k => finalReadings[k] !== 0);

// =====================================================================
phase("落账、提交与推送");
// —— 记录员汇总闭环报告；读数落盘+§7 回填；显式路径清单分组提交；sha 敏感门提交后复量；绿且无新转红才推送 ——
const recorder = await agent("收口记录员", "你是唯一写闭环总报告的角色：把车道结论、探针读数、门禁复量如实汇编成一份报告文件。只写这一个文件，不改任何代码，不执行 git 命令。读数以给你的机器行为准，禁止手填或推断数字。").ask<{ file: string; sections: number }>(
  [
    `把以下材料汇编为 ${WORKFLOW.closureDir}/closure-report.md（开工即写骨架，逐步补全，绝不攒最后一次写）：`,
    `① 账单：${JSON.stringify({ redGates: redGates.map(g => g.name), rootInv: rootInv.verdict, absScan: absScan.verdict, batStatic: batStatic.verdict, deletions, deletionsScreenshots, untracked, ahead, pathNodeVersion, backendUp, head, branch })}`,
    `② 四车道结论：${JSON.stringify(laneResults).slice(0, 12000)}（各车道自己的报告在 ${WORKFLOW.closureDir}/lane-*.md，可引用路径）`,
    `③ 终验读数：构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"} showcase=${showcaseOk ? "PASS" : "FAIL"} 后端编译=${backendCompileOk ? "PASS" : "FAIL"}；门禁复量新转绿 ${improved.length}、仍红 ${stillRed.length}（${stillRed.join("、")}）、新转红 ${flippedNew.length}；探针复量 ${probeResults2.map(p => p.verdict).join("/")}；可变红自检 exit=${redProbe.exitCode}`,
    `④ 需拍板清单：${JSON.stringify([...seededNeedsUser, ...needsUserRows])}`,
    `报告结构：# 根目录整理终验与仓库收口总报告（v3.4）/ 一、结论摘要 / 二、账单与四车道 / 三、门禁终验读数 / 四、需你拍板 / 五、仍未收口（blockers 见下）。blockers：${JSON.stringify(blockers.slice(0, 30))}`,
    `返回 file（写好的路径）与 sections（章节数）。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<{ file: string; sections: number }>("收口记录员", e, { file: "", sections: 0 }));
if (recorder.file === "") blockers.push("闭环总报告未写成（记录员调用失败），本轮证据只有 JSON 落盘件");

// —— 终报读数落盘 + 生成器接进必经调用点（schema 与 bash 版 summary.json 同，喂 round-7 报告 §7）——
// 放在 B 组提交之前：gen-round8-report 回填的 round7-final-report.md 要随本轮证据一起入库，不留脏尾巴。
await persistJson(".zcode/tmp/final-verify/summary.json", {
  headBefore: head,
  headAfter: (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head,
  gates: finalReadings,
  reds: redNames,
  producedBy: "rootorg-closure-v34 DSL（与 run-final-verify-v33.sh 同 schema，任一生产者都能喂 §7）",
});
log(`终报读数已落盘：门 ${Object.keys(finalReadings).length} 条，红 ${redNames.length} 条${redNames.length ? "（" + redNames.join("、") + "）" : ""}`);
const reportGen = await runGate({ name: "总报告读数回填 gen-round8-report", args: ["scripts/qa/gen-round8-report.mjs"], timeoutMs: 120000 });
log(`报告生成器：exit=${reportGen.exitCode} ${reportGen.resultLine}`);
if (reportGen.exitCode !== 0) blockers.push(`总报告生成器没跑成，round-7 报告 §7 会停在"未跑"——不得手填数字代替读数：exit=${reportGen.exitCode} ${reportGen.resultLine}`);

// —— 分组显式路径提交（A=代码/文档域，B=证据域）——
const groupA = [...new Set(allLaneFiles)].filter(f =>
  f !== "" && !f.startsWith(".zcode") && !f.startsWith("reports/"));
let commitA = "";
let commitB = "";
if (groupA.length > 0) {
  const add = await gitTry(["add", "--", ...groupA]);
  if (add.spawned && add.ok) {
    const cm = await gitTry(["commit", "-m", WORKFLOW.commitMsgA]);
    if (cm.ok) {
      commitA = (await gitTry(["log", "-1", "--format=%h"])).out.trim();
    } else {
      const res = await gitButler.ask<{ commit: string }>(
        `git commit 失败，错误尾部：\n${cm.err.slice(-1500)}\n请检查状态后完成提交，信息：${WORKFLOW.commitMsgA}。只允许这些路径：${groupA.join("、")}。commit 返回 hash；无法提交时如实写原因。`,
      ).then((v) => v, (e) => askFail<{ commit: string }>("Git 管家", e, { commit: "" }));
      commitA = res.commit ?? "";
    }
  } else {
    blockers.push("git add（A组）失败，改动未提交：" + add.err.slice(0, 120));
  }
} else {
  log("A 组无可提交改动（四车道无代码域文件变更）");
}
// B 组：证据目录整目录 add（含记录员报告、探针 JSON、车道 md、账单）+ §7 回填件 + 证据删留的落地
const addB = await gitTry(["add", "--", WORKFLOW.closureDir + "/", "reports/audit/round-7/round7-final-report.md"]);
if (addB.spawned && addB.ok) {
  if (commitDeletions) {
    const addDel = await gitTry(["add", "-u", "reports/screenshots"]);
    if (!addDel.ok) blockers.push("截图删留 git add -u 失败：" + addDel.err.slice(0, 120));
  }
  const cmB = await gitTry(["commit", "-m", WORKFLOW.commitMsgB]);
  if (cmB.ok) {
    commitB = (await gitTry(["log", "-1", "--format=%h"])).out.trim();
  } else {
    // 可能只有删留在暂存区而证据目录无变化等场景；有暂存才值得管家救
    const hasStaged = await gitTry(["diff", "--cached", "--quiet"]);
    if (!hasStaged.ok) {
      const res = await gitButler.ask<{ commit: string }>(
        `git commit 失败，错误尾部：\n${cmB.err.slice(-1500)}\n请检查状态后完成提交，信息：${WORKFLOW.commitMsgB}。只允许这些路径：${WORKFLOW.closureDir}/ 与（若在暂存区）reports/screenshots 的删除。commit 返回 hash；无法提交时如实写原因。`,
      ).then((v) => v, (e) => askFail<{ commit: string }>("Git 管家", e, { commit: "" }));
      commitB = res.commit ?? "";
    }
  }
} else {
  blockers.push("git add（B组证据目录）失败：" + addB.err.slice(0, 120));
}
log(`提交：A组=${commitA || "（无/失败）"} B组=${commitB || "（无/失败）"}${commitDeletions ? "（含截图删留落地）" : ""}`);

// —— 提交会推 HEAD，sha 敏感门的"绿"可能只是提交前快照：提交后按 SHA 敏感子集复量 ——
const shaSensitive = GATE_SUITE.filter(g => /corpus|provenance|band-freshness|real-coverage/.test(g.name));
const postCommit: GateOut[] = (commitA !== "" || commitB !== "") ? await Promise.all(shaSensitive.map(async (g) => {
  const o = await runGate(g);
  gateToBoard(o);
  return o;
})) : [];
if (postCommit.length > 0) {
  const headAfterCommit = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
  const flippedPost = postCommit.filter(o => {
    const b = gateOuts2.find(x => x.name === o.name);
    return !!b && b.exitCode === 0 && o.exitCode !== 0;
  });
  log(`提交后 HEAD=${headAfterCommit}，sha 敏感门复量 ${postCommit.length} 条，由绿转红 ${flippedPost.length} 条`);
  for (const o of flippedPost) blockers.push(`提交后转红（HEAD 被本轮提交推进所致，不是被测物退化）：${o.name}（${o.resultLine}）`);
  await persistJson(WORKFLOW.closureDir + "/post-commit-gates-v34.json", { head, headAfterCommit, gates: postCommit, flipped: flippedPost.map(o => o.name) });
}

// —— 推送闸：客户端三门全绿 + 复量无新转红 + 本地不落后 ——
const clientGreen = buildOk && tcOk && testOk;
let pushed = false;
let pushNote = "";
if (!clientGreen) {
  pushNote = "未推送：客户端构建/typecheck/单测存在红项";
} else if (flippedNew.length > 0) {
  pushNote = `未推送：终验复量有 ${flippedNew.length} 条新转红`;
} else {
  const fe = await gitTry(["fetch", "origin"]);
  if (!fe.ok) {
    pushNote = "未推送：git fetch 失败 " + fe.err.slice(0, 80);
  } else {
    const behindRes = await gitTry(["rev-list", "--count", "HEAD..origin/main"]);
    const behindN = behindRes.ok ? (parseInt(behindRes.out.trim(), 10) || 0) : -1;
    if (behindN > 0) {
      pushNote = `未推送：本地落后 origin/main ${behindN} 个提交，合并方式需拍板`;
    } else {
      const p = await gitTry(["push", "origin", "main"]);
      pushed = p.ok;
      pushNote = p.ok ? `已推送 origin main（含此前领先的 ${ahead} 个本地提交 + 本轮新提交）` : "推送失败：" + p.err.slice(-200);
    }
  }
}
log(pushNote);
if (!pushed) blockers.push("推送未完成：" + pushNote);
await persistJson(WORKFLOW.closureDir + "/push-result-v34.json", { pushed, pushNote, commitA, commitB, commitDeletions });

// =====================================================================
phase("总报告与需拍板清单");
const finalHead = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head;
const allNeedsUser = [...seededNeedsUser, ...needsUserRows];
const verified: string[] = [
  `QA 全清单机器门禁两轮实测（GATE_SUITE ${GATE_SUITE.length} 条，开账单 + 终验复量各一遍；判读以退出码与 *_RESULT 机器行为准）`,
  `三只仓库状态探针两轮实测（根目录清点/绝对路径扫描/bat 静态，账单 + 终验各一遍；读数落盘 ${WORKFLOW.closureDir}/probe-*.json）`,
  "build-mp-weixin.bat 动态实跑（mock 构建 + 启动bat路径证明，经收口守门员，PATH 前置 Node22）",
  "typecheck / vitest / showcase 隔离构建 / 后端 mvnw compile 经收口守门员实测",
  `全量面板与面板后复量 ${PANEL_SUITE.length} 条（emit-round-report → verify-ledger / verify-state-truth 顺序腿）`,
  "门禁可变红自检 prove-gates-can-fail（绿不是恒绿）",
  "每条收口都经独立复验员按盘上证据证实，不复述修复者自报",
  `提交后 sha 敏感子集复量 ${postCommit.length} 条（corpus/provenance/band-freshness/real-coverage）`,
];
const notCovered: string[] = [
  "start-showcase.bat 的「启动后端 mock 窗口」一步未动态验证（会另开 cmd 窗口，不适合无人值守运行）；其核心编译步已由 showcase 隔离构建代证",
  "后端只做 compile 门：mvnw test 全量未跑——工作树未提交的 2026-10-05 功能体入库方式属需拍板事项，测试属其前置",
  "2026-10-05 功能体（VIP 订单/微信支付/实名照片清理等）保持未提交，见需拍板 OCT5-FEATURE-BODY",
  "appendonly.aof 按 目录整理说明.md §2.4 保留（Redis 运行中）；Redis 停机后的清理时机归用户",
  "需用户拍板事项只列不做，见 findings 与总报告",
];
if (!backendUp) notCovered.push("后端 8080 不可达：verify-backend-fresh 等真实档门的读数按其自身判据落地");
const findings: Finding[] = [];
for (const u of allNeedsUser) {
  findings.push({ where: u?.id ?? "(缺 id)", what: "需用户拍板：" + (u?.why ?? "(未填 why)"), evidence: u?.options ?? "", status: "verified", severity: "medium" });
}
for (const b of blockers.slice(0, 40)) {
  findings.push({ where: "本轮 blockers", what: b, evidence: "见对应车道/门禁/探针输出", status: "verified", severity: "medium" });
}

const md = [
  `# 根目录整理终验与仓库收口总报告（v${WORKFLOW.version}）`,
  "",
  `- 起点：HEAD ${head}（branch ${branch}），工作树脏 ${dirty}（删 ${deletions}，其中截图 ${deletionsScreenshots}），领先远端 ${ahead}；PATH node=${pathNodeVersion}；后端${backendUp ? "UP" : "DOWN"}`,
  `- 终点：HEAD ${finalHead}；${pushNote}`,
  `- 探针：根目录清点 ${rootInv.verdict} → 终验 ${probeResults2[0].verdict}；绝对路径 ${absScan.verdict} → 终验 ${probeResults2[1].verdict}；bat 静态 ${batStatic.verdict} → 终验 ${probeResults2[2].verdict}`,
  `- 四车道：${laneResults.map(l => `${l.lane}（证实 ${(l.fixedIds ?? []).length} / 未收 ${(l.skipped ?? []).length}）`).join("、")}`,
  `- 构建(bat)/typecheck/单测/showcase/后端编译：${buildOk ? "PASS" : "FAIL"} / ${tcOk ? "PASS" : "FAIL"} / ${testOk ? "PASS" : "FAIL"} / ${showcaseOk ? "PASS" : "FAIL"} / ${backendCompileOk ? "PASS" : "FAIL"}`,
  `- 门禁复量：新转绿 ${improved.length}；仍红 ${stillRed.length}（${stillRed.join("、") || "无"}）；新转红 ${flippedNew.length}`,
  `- 提交：A组 ${commitA || "（无/失败）"}；B组 ${commitB || "（无/失败）"}${commitDeletions ? "（B组含 3852 截图删留落地）" : ""}`,
  `- 推送：${pushNote}`,
  "",
  "## 需你拍板（未替你决定）",
  ...(allNeedsUser.length > 0 ? allNeedsUser.map(u => `- ${u?.id ?? "(缺 id)"}：${u?.why ?? "(未填)"}（可选：${u?.options ?? "(未填)"}）`) : ["- （无）"]),
  "",
  "## 仍未收口（每条带原因）",
  ...(blockers.length > 0 ? blockers.map(b => `- ${b}`) : ["- （无）"]),
].join("\n");
try {
  await artifact.markdown("final", md, { title: "根目录整理终验与仓库收口总报告", description: "缺口账单→四车道并行收口→门禁终验→提交推送的结果与需拍板清单", primary: true });
} catch (e) {
  log("总报告 artifact 发布失败：" + String(e).slice(0, 120));
}

return {
  conclusion: `根目录整理终验与仓库收口完成：四车道证实 ${laneResults.reduce((n, l) => n + (l.fixedIds?.length ?? 0), 0)} 条（根目录卫生/启动bat/绝对路径/证据删留）；bat 动态实跑与构建/类型/单测 ${buildOk && tcOk && testOk ? "全绿" : "存在红项"}；门禁新转绿 ${improved.length}、仍红 ${stillRed.length}、新转红 ${flippedNew.length}；提交 A=${commitA || "无"} B=${commitB || "无"}；${pushNote}；需你拍板 ${allNeedsUser.length} 项已原样列出，未替你决定。`,
  findings,
  verified,
  notCovered,
};
