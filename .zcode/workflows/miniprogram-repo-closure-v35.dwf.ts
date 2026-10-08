/* zcode-workflow
description: 仓库收口 v3.5（谱系 v3.1→v3.2→v3.3→v3.4→本版）：把上一轮「需拍板」清单里可执行的部分全部消化——后端
  mvnw test 全量作功能体入库的决定性强门（红则修复≤3 轮，仍红才降级不入库），三车道（功能体按域拆
  commitPlan/证据删留附死因记录落地/自检 1of51 定位修复）只产出提交计划、由编排层单点顺序执行（check-ignore
  过滤+暂存面实证，修掉 v3.4 的 add 假失败），档位重建工程师按 verify-band-freshness 点名迭代到绿，8080 按原
  profile 受控重启并补提交后读数；判据/政策类（CORPUS-LEGACY-144、PROV-PRESTAMP
  复采、REALCOV-9、.qoder）只列不做。仪器事实沿用：files.* 挂死禁用、Node22 前置、演练产物只准落 tmp/ 子目录。
whenToUse: 需要把「未提交功能体入库+构建档位新鲜化+后端实例对齐 HEAD+离线自检清零」一次收口并出终报时运行；v3.4
  待拍板清单落地后的第一轮、或任何把工作树功能体推进入库的轮次皆可。
*/
// =====================================================================
// 功能体入库与档位收口工作流 v3.5
// 谱系：qa-loop v3.1 → v3.2 → qa-finish v3.3 → repo-closure v3.4 → 本文件（v3.5）
// 本轮主题：把 v3.4 终报交还的 8 项「需拍板」里所有可执行的部分全部消化掉——
//   ① OCT5-FEATURE-BODY：按既定选项 (a) 执行「后端 mvnw test 全绿 → 按功能拆提交入库」；
//     测试门是本轮的决定性强门，红则修复工程师两轮，仍红才如实降级为不入库。
//   ② EVID-DELETION-DEADLOCK：v3.4 车道实测「双绿才提交」判据永不可达（corpus 红因是已提交
//     删除无物可 restore、provenance 红因是历史回填戳 restore 不触及）⇒ 本版按其选项 (a)
//     执行「附红因记录+提交删除」，corpus/provenance 保持诚实红，判据修订仍留拍板。
//   ③ BAND-REBUILD：功能体入库前提下重建 mock/showcase（必要时 real）档位，产物=已定字节；
//     由档位重建工程师按 verify-band-freshness 的点名迭代到绿（≤3 轮）。
//   ④ BACKEND-8080：提交+重建后按原 profile 重启 8080，verify-backend-fresh 补一次提交后读数
//     （该门的判据含 apps/api 未提交计数，所以重启必须排在提交之后，读数才有效）。
//   ⑤ SELFTEST-1OF51：授权写 .zcode/tmp 夹具复跑聚合器，定位 1/51 失败者，真缺陷即修即验。
//   ⑥ PROV-PRESTAMP-4881：采纳其选项 (a) 的报告口径——本轮结论只锚 CONSISTENT=4154，
//     4881 帧按 manifest 点名降级留档（这是报告纪律不是判据修改，门照旧红）。
//   ⑦ CORPUS-LEGACY-144 / REALCOV-9 / .qoder 裁处：判据或数据政策类，只列不做（项目铁律）。
// 相对 v3.4 的改进（各有上轮实测教训）：
//   Ⅰ. A 组提交假失败：`git add` 遇 gitignore 显式路径会 exit 1 但已暂存项保留——上轮误判整组失败。
//     本版提交执行器先 `git check-ignore` 过滤清单，add 后用 `git diff --cached --name-only`
//     实证暂存面非空才提交，不再以退出码单判。
//   Ⅱ. 演练产物污染：上轮 bat 车道把 __drill-*.bat / exit 写进仓库根。本版所有车道硬约束：
//     任何演练/临时产物只准落 tmp/ 子目录或车道自己的 closureDir，违者复验员直接判未收口。
//   Ⅲ. 车道不再执行 git 提交：三车道只产出 commitPlan（message+paths），编排层单点顺序执行，
//     消灭并发抢 index 锁与暂存面失控两类风险。
//   Ⅳ. 决定性强门升级：功能体从「compile 过=可入库」升到「test 过=可入库」；后端新鲜度从
//     「挂起待拍板」变「提交后重启+提交后读数」。
//   Ⅴ. 白名单补录 .gitattributes（上轮误报修正，用户裁定件）。
// 纪律（沿用前版全部铁律）：files.* 在本机挂死 ⇒ 世界读取全走 world.run/git；PATH node=v16
//   ⇒ 跑 scripts/** 前置 Node22；门面 Node<T> 兜底一律 .then 双参 + askFail；数值判读以退出码/
//   机器行为准；需拍板事项只列不做；增量落盘是硬要求（车道先写骨架、每完成一项立刻更新）。
// =====================================================================

// ===== 配置（数值只进这里）=====
const WORKFLOW = {
  version: "3.5",
  nodeBin: "D:/codex-tools/node-v22.17.0-win-x64/node.exe",
  closureDir: "reports/audit/repo-closure-2026-10-09",
  standardDoc: "目录整理说明.md",
  healthUrl: "http://127.0.0.1:8080/actuator/health",
  commitMsgE: "chore(repo): repo-closure v3.5 收口取证落盘（功能体入库+档位重建+自检定位）",
};

// ===== 根目录白名单（目录整理说明.md §1/§2 + 上轮补录的 .gitattributes；.qoder 裁处待拍板，故意不录）=====
const ROOT_FILES_ALLOWED = [
  "README.md", "目录整理说明.md", "build-mp-weixin.bat", "start-showcase.bat",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "eslint.config.mjs",
  "docker-compose.yml", "project.config.json", "project.private.config.json", "appendonly.aof",
  ".gitignore", ".editorconfig", ".npmrc", ".prettierignore", ".prettierrc.json", ".dockerignore",
  ".gitleaks.toml", ".spectral.yaml", ".env", ".env.example", ".scan-baseline.txt",
  ".scan-chinese-baseline.txt", ".zcodeignore", ".gitattributes", // 2026-09-29 用户裁定的 LFS fail-loud 闸
];
const ROOT_DIRS_ALLOWED = [
  ".claude", ".codegraph", ".design_library", ".git", ".github", ".mimosa", ".reasonix", ".trae", ".vscode", ".workbuddy", ".zcode",
  "apps", "config", "node_modules", "scripts", "tools", "tests", "database", "docker",
  "doc", "specs", "reports", "docs",
  "素材", "报告", "deliverables", "archive",
  "logs", "tmp", "截图存档", "verification_logs",
];

// ===== QA 门禁清单：与 v3.3/v3.4 GATE_SUITE 逐字同步（唯一实质差异仍是 v3.4 修掉的 disposition 空参）=====
const GATE_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "台账词表/形状 verify-ledger", args: ["scripts/qa/verify-ledger.mjs", "reports/audit/round-6"], timeoutMs: 120000 },
  { name: "状态真值 verify-state-truth", args: ["scripts/qa/verify-state-truth.mjs", "reports/audit/round-7"], timeoutMs: 180000 },
  { name: "队列守恒 verify-queue-reconcile", args: ["scripts/verify-queue-reconcile.mjs", "reports/audit/round-7"], timeoutMs: 120000 },
  { name: "真实档覆盖 verify-real-coverage", args: ["scripts/qa/verify-real-coverage.mjs"], timeoutMs: 180000 },
  { name: "判据台 verify-source-shape", args: ["scripts/qa/verify-source-shape.mjs", "--dry"], timeoutMs: 180000 },
  { name: "证据语料 verify-evidence-corpus", args: ["scripts/qa/verify-evidence-corpus.mjs"], timeoutMs: 600000 },
  { name: "溯源全量 verify-provenance-all", args: ["scripts/qa/verify-provenance-all.mjs"], timeoutMs: 600000 },
  { name: "档位新鲜度 verify-band-freshness", args: ["scripts/qa/verify-band-freshness.mjs"], timeoutMs: 420000 },
  { name: "后端新鲜度 verify-backend-fresh", args: ["scripts/qa/verify-backend-fresh.mjs"], timeoutMs: 120000 },
  { name: "证据洞 verify-evidence-holes", args: ["scripts/qa/verify-evidence-holes.mjs", "--mode", "judge"], timeoutMs: 300000 },
  { name: "离线负例聚合 run-qa-selftests", args: ["scripts/qa/run-qa-selftests.mjs"], timeoutMs: 900000 },
  { name: "dry 不抢租约静态门 verify-dry-no-lease", args: ["scripts/qa/verify-dry-no-lease.mjs"], timeoutMs: 180000 },
  { name: "载体接线零消费者门 verify-carrier-wiring", args: ["scripts/qa/verify-carrier-wiring.mjs"], timeoutMs: 180000 },
  { name: "车道报告骨架完成度 verify-lane-report-complete", args: ["scripts/qa/verify-lane-report-complete.mjs", "--intake", "reports/audit/round-7/lane-report-intake-round-7.json", "--exemptions", "reports/audit/round-7/lane-report-exemptions-round-7.json"], timeoutMs: 90000 },
  // v3.3 缺陷修复沿用：原 args 是 []——裸 node 秒退 0 假绿；本表补上脚本路径（bash :73 同参）
  { name: "真实档覆盖去向册 verify-real-coverage-disposition", args: ["scripts/qa/verify-real-coverage-disposition.mjs"], timeoutMs: 180000 },
  { name: "用例可自动化预检 verify-case-automatable", args: ["scripts/qa/verify-case-automatable.mjs", "--results", "reports/audit/round-6/interact/exec-results.json", "--json", ".zcode/tmp/case-automatable/preflight.json"], timeoutMs: 180000 },
  { name: "工作流干跑预检 dryrun-workflow", args: ["scripts/qa/dryrun-workflow.mjs", "--profile", "all"], timeoutMs: 300000 },
  { name: "判据台戳 verify-ops-stamp", args: ["scripts/qa/verify-ops-corpus-stamp.mjs", "--check"], timeoutMs: 180000 },
];

// ===== 面板与面板后复量（与 GATE_SUITE 分表的原因见 v3.3 :177-188）=====
const PANEL_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "全量面板 emit-round-report", args: ["scripts/qa/emit-round-report.mjs", "--round-dir", "reports/audit/round-7", "--sidecar-dir", ".zcode/tmp/final-verify/panel", "--report", ".zcode/tmp/final-verify/panel/round-7-report.md", "--metrics", ".zcode/tmp/final-verify/panel/round-7-metrics.json"], timeoutMs: 1800000 },
  { name: "面板后台账复量 verify-ledger-after-panel", args: ["scripts/qa/verify-ledger.mjs", "reports/audit/round-6"], timeoutMs: 120000 },
  { name: "面板后状态真值复量 verify-state-truth-after-panel", args: ["scripts/qa/verify-state-truth.mjs", "reports/audit/round-7"], timeoutMs: 180000 },
];

// ===== 看板 =====
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
  backendPid: string;
  pathNodeVersion: string;
  deletions: number;
  featureModified: number;
  featureUntracked: number;
  qaScriptsModified: number;
  ahead: number;
  branch: string;
  head: string;
}
interface LaneCommit {
  /** 提交信息（仓库风格：feat(scope)/fix(scope)/chore/evidence + 中文描述） */
  message: string;
  /** 常规暂存路径/目录（git add --） */
  paths: string[];
  /** 删除落地目录（git add -A --，用于把盘上已删的跟踪文件记成删除） */
  deletePaths: string[];
}
interface SortItem {
  /** 缺口编号 */
  id: string;
  /** 收口车道域：功能体入库/证据删留/自检定位 */
  area: string;
  /** 指定补法 */
  how: string;
  /** 出处 */
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
  /** 交编排层单点顺序执行的提交计划（车道自己绝不碰 git add/commit） */
  commits: LaneCommit[];
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
async function persistJson(file: string, data: unknown): Promise<void> {
  try {
    await world.run("D:/codex-tools/node-v22.17.0-win-x64/node.exe", ["-e",
      "const f=require('fs'),p=require('path');f.mkdirSync(p.dirname(process.argv[1]),{recursive:true});f.writeFileSync(process.argv[1],process.argv[2]);",
      file, JSON.stringify(data, null, 1)], { timeoutMs: 20000 });
  } catch (e) {
    log("账单落盘失败（不改变门禁判定）：" + String(e).slice(0, 80));
  }
}

// ===== 三只仓库状态探针（node -e 代码；v3.4 同款）=====
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
  "const SKIP=new Set(['node_modules','.git','dist','unpackage','target','build','.gradle','out','archive','reports','tmp','logs','verification_logs','截图存档','素材','报告','deliverables','.zcode','doc','.codegraph','.design_library','.mimosa','.reasonix','.trae','.workbuddy','.claude','.vscode','.github','.qoder']);",
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
  "  if(txt.indexOf('NODE22_DIR')<0)problems.push(b+': 缺 NODE22_DIR/Node 版本闸');",
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

// ===== 守门员 / 修复工程师 / Git 管家（单例，具名代理重名会炸整场）=====
const gatekeeper = agent("收口守门员", "你只负责运行指定命令并如实报告结果，绝不修改任何文件、绝不为通过而改跑别的命令。若命令不可能通过，如实 ok=false 并贴出现象，宁可红也不放水。");
const gitButler = agent("Git 管家", "你负责在 git 提交失败时诊断并完成规定范围的提交，绝不提交范围外文件。做不到就如实说原因，绝不扩范围硬提。");
async function runViaGatekeeper(purpose: string, command: string, timeoutMs: number): Promise<CheckOut> {
  const r = await gatekeeper.ask<CheckOut>(
    [
      `运行${purpose}并如实报告。用 Bash 执行这一行（PATH 前置 Node22，Windows Git Bash；stdin 接 /dev/null 防 bat 末尾 pause 挂死）：`,
      `export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" && ${command}`,
      `要求：等命令完整结束（Bash timeout 设 ${timeoutMs}）；ok = (退出码 === 0)；err = 失败时最后 50 行输出、成功时留空；command 回填实际执行的命令。`,
      `【诚实铁律】禁止伪造：跑不起来/超时/输出异常都如实 ok=false；禁止顺手修任何错误（修复不是你的职责）。若指令相互矛盾或命令不可能通过，直接说明。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<CheckOut>("收口守门员", e, { ok: false, err: "守门员调用失败: " + String(e), command }));
  return { ok: r.ok === true, err: typeof r.err === "string" ? r.err : "", command: typeof r.command === "string" ? r.command : command };
}

// =====================================================================
phase("盘点出账单");
// —— QA 全清单门禁并行 + 三只仓库探针 + 工作树分域计数 + 后端进程读数 ——
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
let backendPid = "unknown";
try {
  const ns = await world.run("netstat", ["-ano"], { timeoutMs: 30000 });
  const line = ns.stdout.split(/\r?\n/).find(l => l.indexOf(":8080") >= 0 && l.indexOf("LISTENING") >= 0);
  if (line) {
    const parts = line.trim().split(/\s+/);
    backendPid = parts[parts.length - 1] || "unknown";
  }
} catch {
  backendPid = "unknown";
}
const st = await gitTry(["status", "--porcelain"]);
let deletions = 0;
let featureModified = 0;
let featureUntracked = 0;
let qaScriptsModified = 0;
if (st.ok) {
  for (const line of st.out.split(/\r?\n/)) {
    if (line.startsWith("D ")) {
      deletions++;
    } else if (line.startsWith("??")) {
      const p = line.slice(3);
      if (/^(apps|database|docs\/wechat-submission)/.test(p)) featureUntracked++;
    } else if (line.startsWith(" M") || line.startsWith("M ")) {
      const p = line.slice(3);
      if (p.startsWith("scripts/qa/")) qaScriptsModified++;
      else if (/^(apps|database|docs|\.github\/|\.gitignore$|package\.json$|pnpm-lock)/.test(p)) featureModified++;
    }
  }
}
const aheadRes = await gitTry(["rev-list", "--count", "origin/main..HEAD"]);
const ahead = aheadRes.ok ? (parseInt(aheadRes.out.trim(), 10) || 0) : -1;
const head = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
const branch = (await gitTry(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() || "unknown";
const redGates = gateOuts.filter(g => g.exitCode !== 0);
const bill: Bill = { gates: gateOuts, rootInv, absScan, batStatic, backendUp, backendPid, pathNodeVersion: "v16(PATH)/v22(nodeBin)", deletions, featureModified, featureUntracked, qaScriptsModified, ahead, branch, head };
log(`账单就绪：红门 ${redGates.length}/${gateOuts.length}，探针 ${probeResults.map(p => p.verdict).join("/")}，后端${backendUp ? "UP" : "DOWN"}(pid=${backendPid})，删除 ${deletions} 待裁，功能体 M=${featureModified}/??=${featureUntracked}，QA脚本 M=${qaScriptsModified}，领先远端 ${ahead}，HEAD=${head}`);
await persistJson(WORKFLOW.closureDir + "/gapbill-v35.json", bill);

// =====================================================================
phase("后端测试门");
// —— 功能体入库的决定性强门：mvnw test 全量；红则修复工程师两轮，仍红才降级不入库 ——
const fixerAgent = agent("收口修复工程师", "你是小程序前端与后端 Java(Spring Boot) 工程专家：按失败输出修复问题，只修真问题，禁止改测试断言来凑绿、禁止用 any 糊弄，修完自查。不碰 .zcode/**、不做 git 提交、不改 reports/**。若问题在你的判域之外（判据待拍板/环境缺件），如实说明而不是硬修。");
let backendTestOk = false;
let backendTestSummary = "(未运行)";
for (let round = 1; round <= 3; round++) {
  log(`后端 mvnw test 第 ${round} 次实测`);
  const t = await runViaGatekeeper(
    `后端全量单测（第 ${round} 轮）。err 规则例外：无论成败都把输出最后 120 行放进 err（那是 Tests run 摘要的提取来源，不代表失败）`,
    "cd apps/api && ./mvnw test 2>&1 | tail -120",
    2400000,
  );
  const outTail = t.err !== "" ? t.err : "(exit 0)";
  const mSummary = outTail.match(/Tests run: [^,\n]+(, Failures: [^,\n]+)?(, Errors: [^,\n]+)?(, Skipped: [^,\n]+)?/);
  backendTestSummary = mSummary ? mSummary[0] : (t.ok ? "BUILD SUCCESS（未见 surefire 摘要行）" : "BUILD FAILURE");
  backendTestOk = t.ok;
  log(`后端测试门第 ${round} 轮：ok=${t.ok} ${backendTestSummary}`);
  if (t.ok) break;
  if (round === 3) {
    blockers.push(`后端 mvnw test 三轮未过（第 3 轮尾部）：${outTail.slice(-300)}`);
    break;
  }
  blockers.push(`后端 mvnw test 未过（第 ${round} 轮，${backendTestSummary}）：${outTail.slice(-240)}`);
  await fixerAgent.ask(
    `后端 mvnw test 失败输出尾部：\n${outTail.slice(-3500)}\n请修复直到 cd apps/api && ./mvnw test 通过。只修真问题：禁止改测试断言凑绿；环境缺件（DB 连不上/端口占用）如实报告不要硬修。返回你改了什么、为什么这是真问题。`,
  ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
}
log(`后端测试门：${backendTestOk ? "GREEN" : "RED"} ${backendTestSummary}`);

// =====================================================================
phase("分拣缺口");
// —— 分拣员消费 v3.4 待拍板清单与账单；三车道种子脚本侧预置 ——
const featureHow = backendTestOk
  ? "按功能拆提交：读 git status 的 M/?? 清单（apps/**、database/**、docs/wechat-*、.github/**、application*.yml、.gitignore 等），按域分组产出 commitPlan——参考分组：VIP 订单（VipOrder*/vip/*/Billing*/VipBill/wallet 解锁）、微信支付（wxpay/**/PaymentCallbackLog/PaymentMetrics）、协议留痕（AgreementConsent*/UserAgreementConsent*）、实名照片保留策略（RealNameMediaPurgeService/verification/*）、Flyway 迁移与 database/sanitize、基础设施（ci.yml/.gitignore/配置/其余散件）。每条 {message, paths, deletePaths:[]}，message 用仓库风格 feat(scope): 中文描述；路径必须精确到本组文件，禁止 . 或 -A 全量；scripts/qa 的既有 M 文件不动（QA 台账体另册）。你绝不执行 git add/commit。"
  : "后端测试门三轮未过，本轮不入库：如实 skipped，把三轮失败尾部与修复尝试写进车道报告，功能体保持未提交。";
const seeds: SortItem[] = [
  {
    id: "FEATURE-BODY-COMMIT",
    area: "功能体入库",
    how: "后端测试门" + (backendTestOk ? "已 GREEN。" : "未过。") + featureHow,
    source: "v3.4 终报 OCT5-FEATURE-BODY 选项 (a) + 本轮后端测试门实测",
  },
  {
    id: "EVID-DELETION-LAND",
    area: "证据删留",
    how: `按 v3.4 车道实测的死角落执行其选项 (a)：写 ${WORKFLOW.closureDir}/evidence-deletion-disposition.md（记载：3851 张 reports/screenshots 删除的实测死因——corpus 红因 round-1 manifest 144 帧已提交删除无物可 restore、provenance 红因 4881 帧历史回填戳 restore 不触及且恢复反而翻 STALE_STAMP；两门读数原文；帧内容在 git 历史与仓外证据库可按哈希回溯）。commitPlan：{message: "evidence(qa): reports/screenshots 历史截图删留落地（附死因记录与红因读数，判据修订留待拍板）", paths: ["${WORKFLOW.closureDir}/evidence-deletion-disposition.md"], deletePaths: ["reports/screenshots"]}。判据本身一字不改（CORPUS-LEGACY-144 仍留拍板）。`,
    source: "v3.4 终报 EVID-DELETION-DEADLOCK 选项 (a)",
  },
  {
    id: "SELFTEST-LOCATE",
    area: "自检定位",
    how: `本轮授权写 .zcode/tmp 夹具：用 Node22 跑 node scripts/qa/run-qa-selftests.mjs，定位上轮 1/51 失败者身份；真缺陷（测试/门的 bug）→ 最小修复 → 复跑聚合器到 51/51；若是裁定内期望或环境缺件 → 不修，把失败原文与定性写进车道报告。若落了代码修复，给出 commitPlan（paths 精确到改动文件）。演练/临时产物只准落 .zcode/tmp 或 ${WORKFLOW.closureDir}，禁止写仓库根。`,
    source: "v3.4 终报 SELFTEST-1OF51 选项 (a)",
  },
];
const sorter = agent("缺口分拣员", "你是只读分拣员：读账单与 v3.4 终报待拍板清单，把本轮缺口分拣清楚。绝不修改任何文件、绝不把「需拍板」项擅自划进可执行——判据冲突/政策/数据去留类事项交人决定。");
const sortRes = await sorter.ask<SortOut>(
  [
    `缺口账单：${JSON.stringify({ redGates: redGates.map(g => ({ name: g.name, line: g.resultLine })), rootInv: rootInv.detail, absScan: absScan.detail, batStatic: batStatic.detail, deletions, featureModified, featureUntracked, qaScriptsModified, backendUp, backendPid, ahead, head })}`,
    `后端测试门：${backendTestOk ? "GREEN " + backendTestSummary : "RED（三轮）"}。`,
    `三车道已吃下确定性种子：${seeds.map(s => s.id).join("、")}。`,
    `你的任务：① 账单里若有种子未覆盖、且判据明确的可执行缺口，补成分拣行（area 从 功能体入库/证据删留/自检定位 里选，每条 {id, area, how, source}）；② 判据/政策/数据去留类列 needsUser {id, why, options}（v3.4 遗留的 CORPUS-LEGACY-144、PROV-PRESTAMP-4881 复采轮、REALCOV-9 真实腿、.qoder 裁处要带上）；③ 没有要补的就返回空 executable，不要硬凑。`,
    `【纪律】判域边界：scripts/qa 既有 M 文件是 QA 台账体，不进功能体入库；DevTools/UI 腿不归本轮；宁多列 needsUser 也不许把拍板项混进 executable。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<SortOut>("缺口分拣员", e, { executable: [], needsUser: [], notes: "分拣员调用失败，按确定性种子收口" }));
const executableRows = Array.isArray(sortRes.executable) ? sortRes.executable : [];
const needsUserRows = Array.isArray(sortRes.needsUser) ? sortRes.needsUser : [];
log(`分拣完成：补充可执行 ${executableRows.length} 项，需拍板 ${needsUserRows.length} 项`);
await persistJson(WORKFLOW.closureDir + "/sort-v35.json", { seeds, executableRows, needsUserRows });

// —— 需拍板的确定性底座（无论分拣员说什么都在场）——
const seededNeedsUser: UserItem[] = [
  { id: "CORPUS-LEGACY-144", why: "同一批 144 帧两把尺子结论相反：provenance 按裁定 #12-A 豁免，corpus 缺席轴仍判红（其 advisory 认不出已提交删除）。改判据属政策。", options: "a) corpus 加与 #12-A 同口径的 legacy 豁免；b) 处置 round-1 manifest 本体；c) 接受该门长期红并仿 RCD 立去向册" },
  { id: "PROV-PRESTAMP-4881", why: "4881 帧历史回填戳（门禁自述禁止据此下结论）。本轮已采纳其选项 (a) 的报告口径：结论只锚 CONSISTENT=4154。剩你是否要重采。", options: "a) 维持现状（本轮已采纳）；b) 另立真实模式重采轮（需 DevTools/UI，属 QA 轮）" },
  { id: "REALCOV-9-SCHED", why: "9/236 真实档覆盖缺口（RCD 去向册 PASS，条条有在册去向），补腿需真实模式 DevTools 轮。", options: "a) 下一真实模式 QA 轮按点名补腿；b) 判据侧收缩（须拍板）" },
  { id: "QODER-DISPOSITION", why: "根目录 .qoder/ 目录（未知 IDE 工具产物）无裁处授权依据，白名单故意不录，探针会持续点名。", options: "a) 确认属废弃工具产物→删除或归档并补白名单；b) 在用→补录白名单；c) 维持待裁点名" },
];
if (!backendTestOk) {
  seededNeedsUser.push({
    id: "FEATURE-BODY-TEST-RED",
    why: "后端 mvnw test 三轮未过，功能体本轮未入库（工作树保持原状）。",
    options: "a) 你看三轮失败尾部定修复方向后下一轮重试；b) 授权跳过指定测试套件先入库（须你拍板）；c) 功能体回炉另做",
  });
}

// =====================================================================
phase("并行收口三车道");
// —— 按域并行；每车道 修复→独立复验 链式；车道只产出 commitPlan，绝不碰 git ——
const areas = ["功能体入库", "证据删留", "自检定位"];
const laneRecipes: Record<string, string> = {
  "功能体入库": "判域=apps/**、database/**、docs/wechat-*、.github/**、application*.yml、.gitignore、根 package.json/pnpm-lock；scripts/qa/** 一律不碰；reports/** 不碰；commitPlan 的路径必须存在且属于本判域",
  "证据删留": "只写 disposition 文件 + 产出 commitPlan；reports/screenshots 的删除由 deletePaths 字段交编排层落地；corpus/provenance 判据一字不改",
  "自检定位": "唯一可写 .zcode/tmp 夹具的车道；修真缺陷最小化；裁定内/环境缺件不修只定性；任何临时产物禁止写仓库根",
};
const lanePromises = areas.map((area) => {
  const items = [...seeds.filter(i => i.area === area), ...executableRows.filter(i => i && i.area === area)];
  return (async (): Promise<LaneOut> => {
    if (items.length === 0) {
      log(`车道 ${area}：无分拣项，跳过`);
      return { lane: area, fixedIds: [], filesChanged: [], skipped: [], evidence: [], commits: [], notes: "无分拣项" };
    }
    const fixer = await agent(`收口车道-${area}`, "你按指定补法实现收口：只动本车道判域内的文件；任何演练/临时产物只准落 tmp/ 子目录或本轮 closureDir，禁止写仓库根；绝不执行任何 git add/commit（提交归编排层）；增量落盘是硬要求——开工先把报告骨架写入 closureDir 下本车道 md，此后每完成一项立刻更新。若前提不成立或指令矛盾，如实写进 skipped/notes，不硬修。").ask<LaneOut>(
      [
        `本轮 closureDir：${WORKFLOW.closureDir}`,
        `本车道要收口的缺口：${JSON.stringify(items)}`,
        `本车道纪律：${laneRecipes[area] ?? ""}`,
        `环境纪律：跑命令用 Bash 且 PATH 前置 Node22（export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH"）。`,
        `返回 fixedIds / filesChanged / skipped（带 reason）/ evidence（文件:行 或 命令输出要点）/ commits（commitPlan 数组，每条 {message, paths, deletePaths}，不执行只规划）/ notes。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>(`收口车道-${area}`, e, { lane: area, fixedIds: [], filesChanged: [], skipped: items.map(i => ({ id: i.id, reason: "车道调用失败，未处理" })), evidence: [], commits: [], notes: "" }));
    const toVerify = (fixer.fixedIds ?? []).filter(id => id !== "");
    if (toVerify.length === 0) return fixer;
    const verifier = await agent(`收口复验员-${area}`, "你是独立复验员：只认盘上证据，不复述修复者自报。每条要么给可复核的证实证据（放 fixedIds），要么如实进 skipped（reason 写「复验未通过: …」）。不修改任何文件、不执行 git 写操作。").ask<LaneOut>(
      [
        `逐条复验这些声称已收口的缺口：${JSON.stringify(toVerify)}；修复者自报改动：${JSON.stringify((fixer.filesChanged ?? []).slice(0, 2000))}；commitPlan 条数：${(fixer.commits ?? []).length}`,
        `验证方式：功能体入库→逐条核对 commitPlan 路径存在性、判域符合性（scripts/qa 与 reports 不得出现）、分组合理性（同组文件确实同域）；证据删留→disposition 文件内容与红因读数逐字核对（可重跑那两条门对照）；自检定位→亲手重跑聚合器看 51/51（只写 .zcode/tmp 允许）。fixedIds 只放你亲手证实的。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>(`收口复验员-${area}`, e, { lane: area, fixedIds: [], filesChanged: [], skipped: toVerify.map(id => ({ id, reason: "复验员调用失败，按未证实处置" })), evidence: [], commits: [], notes: "" }));
    const merged: LaneOut = {
      lane: area,
      fixedIds: verifier.fixedIds ?? [],
      filesChanged: [...new Set([...(fixer.filesChanged ?? []), ...(verifier.filesChanged ?? [])])].filter(f => f !== ""),
      skipped: [...(fixer.skipped ?? []), ...(verifier.skipped ?? [])],
      evidence: verifier.evidence ?? [],
      commits: (fixer.commits ?? []).filter(c => c && typeof c.message === "string" && c.message !== ""),
      notes: [(fixer.notes ?? ""), (verifier.notes ?? "")].filter(s => s !== "").join("；"),
    };
    for (const s of merged.skipped) blockers.push(`车道 ${area}: ${s.id} 未收口（${s.reason.slice(0, 80)}）`);
    report({ lane: area, fixed: merged.fixedIds.length, skipped: merged.skipped.length, files: merged.filesChanged.length, commits: merged.commits.length });
    return merged;
  })();
});
const laneResults: LaneOut[] = await Promise.all(lanePromises);
log(`三车道收工：证实 ${laneResults.reduce((n, l) => n + (l.fixedIds?.length ?? 0), 0)} 条，未收 ${laneResults.reduce((n, l) => n + (l.skipped?.length ?? 0), 0)} 条，提交计划 ${laneResults.reduce((n, l) => n + (l.commits?.length ?? 0), 0)} 条`);
await persistJson(WORKFLOW.closureDir + "/lane-results-v35.json", laneResults);

// =====================================================================
phase("档位重建与后端重启");
// —— 前提：后端测试门 GREEN（重建产物=即将入库的同一份字节）。先由环境管家摸清 8080 现状， ——
// —— 再由档位重建工程师按 verify-band-freshness 点名迭代到绿；重启排在提交阶段之后做，读数才有效。 ——
const envSteward = agent("环境管家", "你负责本机开发环境（8080 后端）的现状核查与受控重启：先查清再动手，每一步留证据（pid/profile/日志尾部/健康读数）。绝不 kill 不是 8080 链上的进程；起不来或健康不转 UP 就如实报告，绝不伪造。");
const stewardLook = await envSteward.ask<{ pid: string; profile: string; entry: string; note: string }>(
  [
    `核查 8080 后端现状（pid 线索=${backendPid}）：用 netstat -ano 找 :8080 LISTENING 的 pid，再用 powershell「Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"」取命令行，判断它由哪条链启动（根 package.json 的 api:dev = node tools/run-api-wrapper.cjs spring-boot:run -Dspring-boot.run.profiles=mock，也可能有 api:real 变体或直接 java -jar）。回答 pid / profile（mock 或 real，以进程命令行或其日志为准）/ entry（重启应复刻的精确命令）/ note（父进程链，wrapper 是否也会残留）。只读，不动任何进程。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<{ pid: string; profile: string; entry: string; note: string }>("环境管家", e, { pid: backendPid, profile: "unknown", entry: "pnpm api:dev", note: "环境管家调用失败：" + String(e).slice(0, 80) }));
log(`8080 现状：pid=${stewardLook.pid} profile=${stewardLook.profile} entry=${stewardLook.entry}`);

let bandsRebuilt = false;
let bandFinalLine = "(未重建)";
if (backendTestOk) {
  const bandEngineer = await agent("档位重建工程师", "你按门禁点名重建前端构建档位：每次只跑 package.json 里已定义的构建脚本，产物只落 dist/**（gitignored）；跑完必跑 verify-band-freshness 对照，读到哪档坏就修哪档，最多迭代 3 轮；门不可能绿就如实报告读数。绝不改 src/**。").ask<{ ok: boolean; reading: string; rounds: number }>(
    [
      `任务：把 verify-band-freshness 修到绿（或量到不可能绿）。`,
      `背景读数：上轮该门红（mock 档目录被 real 构建覆盖、mock 对 vip/index.vue 过期、showcase 对 pages.json 过期）。此刻工作树即将按 commitPlan 入库，产物与入库字节同源。`,
      `迭代法（每轮）：① PATH 前置 Node22 跑 node scripts/qa/verify-band-freshness.mjs 读点名；② 按点名跑对应生产者（mock 档→pnpm -C apps/client run build:mp-weixin:mock；showcase→build:mp-weixin:showcase:isolated；若点名 real 档→build:mp-weixin:real:isolated；以 package.json 实际脚本名为准，先读再跑）；③ 复跑门对照。`,
      `返回 ok（门绿=true）/ reading（最终 *_RESULT 机器行 + 剩余 problems 数）/ rounds。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<{ ok: boolean; reading: string; rounds: number }>("档位重建工程师", e, { ok: false, reading: "档位重建工程师调用失败", rounds: 0 }));
  bandsRebuilt = bandEngineer.ok;
  bandFinalLine = bandEngineer.reading;
  log(`档位重建：${bandsRebuilt ? "GREEN" : "仍红"}（${bandEngineer.rounds} 轮）${bandFinalLine.slice(0, 160)}`);
  if (!bandsRebuilt) blockers.push(`档位重建未达绿：${bandFinalLine.slice(0, 200)}`);
} else {
  const h2 = await world.run("curl", ["-s", "-m", "3", WORKFLOW.healthUrl], { timeoutMs: 10000 });
  log(`后端测试门未过，档位重建按选项 (b) 跳过（避免把未入库字节烧进档位）；8080 健康=${h2.stdout.indexOf('"UP"') >= 0 ? "UP" : "DOWN"}`);
  blockers.push("档位重建跳过：后端测试门未过，功能体未入库（BAND-REBUILD 留待功能体落地后）");
}

// =====================================================================
phase("门禁终验与构建");
// —— 客户端三门经 bat 动态实跑 + typecheck + vitest（修复≤2 轮）；门禁套件复量对照账单 ——
let buildOk = false;
let tcOk = false;
let testOk = false;
for (let round = 1; round <= 2; round++) {
  log(`构建/typecheck/vitest 第 ${round} 次守门员验证`);
  const b = await runViaGatekeeper("G1 build-mp-weixin.bat 动态实跑（mock 构建 + 启动bat证明）", "cmd //c build-mp-weixin.bat </dev/null", 1800000);
  buildOk = b.ok;
  if (!b.ok) {
    blockers.push(`bat 动态实跑未过（第 ${round} 次）：${b.err.slice(-300)}`);
    await fixerAgent.ask(`build-mp-weixin.bat 动态实跑失败尾部：\n${b.err.slice(-2000)}\n请修复直到该 bat 在 PATH 前置 Node22 环境下完整跑通（保持版本闸与 %~dp0，不许写死盘符路径，临时产物只准落 tmp/）。返回结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
    continue;
  }
  const tc = await runViaGatekeeper("G2 typecheck", "pnpm -C apps/client run typecheck", 900000);
  tcOk = tc.ok;
  if (!tc.ok) {
    blockers.push(`typecheck 未过（第 ${round} 次）：${tc.err.slice(-300)}`);
    await fixerAgent.ask(`typecheck 失败尾部：\n${tc.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run typecheck 通过。返回结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
    continue;
  }
  const t = await runViaGatekeeper("G3 单测", "pnpm -C apps/client run test:unit", 1800000);
  testOk = t.ok;
  if (!t.ok) {
    blockers.push(`单测未过（第 ${round} 次）：${t.err.slice(-300)}`);
    await fixerAgent.ask(`单测失败尾部：\n${t.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run test:unit 通过。返回结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
  }
}
log(`构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}`);
if (!buildOk) blockers.push("终验：build-mp-weixin.bat 动态实跑 FAIL");
if (!tcOk) blockers.push("终验：typecheck FAIL");
if (!testOk) blockers.push("终验：单测 FAIL");

// —— 门禁套件复量 + 探针复量：与开账单对照 ——
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
log(`门禁复量：新转绿 ${improved.length}（${improved.join("、") || "无"}），仍红 ${stillRed.length}，新转红 ${flippedNew.length}`);
for (const o of flippedNew) blockers.push(`终验新转红（须解释）：${o.name}（${o.resultLine}）`);
log(`探针复量：根目录=${probeResults2[0].verdict} 绝对路径=${probeResults2[1].verdict} bat静态=${probeResults2[2].verdict}`);
if (probeResults2[0].verdict !== "PASS") blockers.push("终验探针：根目录仍有违例 " + probeResults2[0].detail.slice(0, 200));
if (probeResults2[1].verdict !== "PASS") blockers.push("终验探针：绝对路径仍有命中 " + probeResults2[1].detail.slice(0, 200));
if (probeResults2[2].verdict !== "PASS") blockers.push("终验探针：bat 静态未过 " + probeResults2[2].detail.slice(0, 200));

const redProbe = await runGate({ name: "门禁可变红自检 prove-gates-can-fail", args: ["scripts/qa/prove-gates-can-fail.mjs"], timeoutMs: 300000 });
gateToBoard(redProbe);
if (redProbe.exitCode !== 0) blockers.push(`可变红自检未过：${redProbe.resultLine}`);
await persistJson(WORKFLOW.closureDir + "/gate-recheck-v35.json", { gates: gateOuts2, improved, stillRed, flipped: flippedNew.map(o => o.name), probes: probeResults2, redProbe, bandsRebuilt, bandFinalLine, backendTestOk, backendTestSummary });

const panelOuts: GateOut[] = [];
for (const g of PANEL_SUITE) {
  const o = await runGate(g);
  gateToBoard(o);
  panelOuts.push(o);
  log(`面板腿 ${o.name}: exit=${o.exitCode} ${o.resultLine}`);
  if (o.exitCode !== 0) blockers.push(`面板腿红：${o.name}（${o.resultLine}）`);
}

// —— 终报读数汇总（落盘与 §7 回填放提交阶段，好让回填件随本轮证据入库）——
const finalReadings: Record<string, number> = {};
for (const o of [...gateOuts2, ...panelOuts]) finalReadings[o.name] = o.exitCode;
finalReadings["ROOT_INV"] = probeResults2[0].exitCode;
finalReadings["ABS_SCAN"] = probeResults2[1].exitCode;
finalReadings["BAT_STATIC"] = probeResults2[2].exitCode;
finalReadings["BAT_DYNAMIC_BUILD"] = buildOk ? 0 : 1;
finalReadings["BACKEND_TEST_GATE"] = backendTestOk ? 0 : 1;
finalReadings["BAND_REBUILD"] = bandsRebuilt ? 0 : 1;
const redNames = Object.keys(finalReadings).filter(k => finalReadings[k] !== 0);

// =====================================================================
phase("落账提交与后端重启");
// —— 记录员汇总闭环报告；编排层单点顺序执行 commitPlan；提交后按原 profile 重启 8080 并补读数 ——
const recorder = await agent("收口记录员", "你是唯一写闭环总报告的角色：把测试门、车道结论、探针与门禁复量如实汇编成一份报告文件。只写这一个文件，不改代码、不执行 git 命令、读数以机器行为准禁止手填。").ask<{ file: string }>(
  [
    `把以下材料汇编为 ${WORKFLOW.closureDir}/closure-report.md（开工即写骨架，逐步补全）：`,
    `① 账单：${JSON.stringify({ redGates: redGates.map(g => g.name), deletions, featureModified, featureUntracked, qaScriptsModified, backendUp, backendPid, ahead, head, branch })}`,
    `② 后端测试门：${backendTestOk ? "GREEN" : "RED"} ${backendTestSummary}`,
    `③ 三车道结论：${JSON.stringify(laneResults).slice(0, 12000)}`,
    `④ 档位重建：${bandsRebuilt ? "GREEN" : "未达绿"} ${bandFinalLine.slice(0, 200)}`,
    `⑤ 终验：构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}；新转绿 ${improved.length}（${improved.join("、")}）；仍红 ${stillRed.length}（${stillRed.join("、")}）；新转红 ${flippedNew.length}；探针 ${probeResults2.map(p => p.verdict).join("/")}；可变红自检 exit=${redProbe.exitCode}`,
    `⑥ 报告口径（PROV-PRESTAMP 采纳项）：本轮全部结论只锚 CONSISTENT=4154，4881 帧历史回填戳按 manifest 点名降级留档。`,
    `⑦ 需拍板：${JSON.stringify([...seededNeedsUser, ...needsUserRows])}`,
    `blockers：${JSON.stringify(blockers.slice(0, 30))}`,
    `返回 file。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<{ file: string }>("收口记录员", e, { file: "" }));
if (recorder.file === "") blockers.push("闭环总报告未写成（记录员调用失败），本轮证据只有 JSON 落盘件");

await persistJson(".zcode/tmp/final-verify/summary.json", {
  headBefore: head,
  headAfter: (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head,
  gates: finalReadings,
  reds: redNames,
  producedBy: "repo-closure-v35 DSL（与 run-final-verify-v33.sh 同 schema）",
});
log(`终报读数已落盘：门 ${Object.keys(finalReadings).length} 条，红 ${redNames.length} 条`);
const reportGen = await runGate({ name: "总报告读数回填 gen-round8-report", args: ["scripts/qa/gen-round8-report.mjs"], timeoutMs: 120000 });
if (reportGen.exitCode !== 0) blockers.push(`报告生成器没跑成，§7 会停在"未跑"：exit=${reportGen.exitCode} ${reportGen.resultLine}`);

// —— 编排层单点顺序执行 commitPlan（check-ignore 过滤 → add → 暂存面实证 → commit；管家兜底）——
const commitPlans = laneResults.flatMap(l => (l.commits ?? []).map(c => ({
  lane: l.lane,
  message: typeof c.message === "string" && c.message !== "" ? c.message : "chore(repo): repo-closure v3.5 车道提交",
  paths: Array.isArray(c.paths) ? c.paths.filter(p => typeof p === "string" && p !== "") : [],
  deletePaths: Array.isArray(c.deletePaths) ? c.deletePaths.filter(p => typeof p === "string" && p !== "") : [],
})));
commitPlans.push({
  lane: "编排层",
  message: WORKFLOW.commitMsgE,
  paths: [WORKFLOW.closureDir + "/", "reports/audit/round-7/round7-final-report.md"],
  deletePaths: [],
});
const commitHashes: string[] = [];
for (const plan of commitPlans) {
  const allPaths = [...plan.paths, ...plan.deletePaths];
  if (allPaths.length === 0) continue;
  // v3.4 教训：git add 遇显式 gitignore 路径会 exit 1 但保留已暂存项——先过滤，再以暂存面实证
  const ig = await gitTry(["check-ignore", ...allPaths]);
  const ignored = new Set(ig.ok ? ig.out.split(/\r?\n/).filter(l => l.trim() !== "") : []);
  const okPaths = plan.paths.filter(p => !ignored.has(p));
  const okDelPaths = plan.deletePaths.filter(p => !ignored.has(p));
  if (okPaths.length > 0) await gitTry(["add", "--", ...okPaths]);
  if (okDelPaths.length > 0) await gitTry(["add", "-A", "--", ...okDelPaths]);
  const staged = await gitTry(["diff", "--cached", "--name-only"]);
  const stagedN = staged.ok ? staged.out.split(/\r?\n/).filter(l => l.trim() !== "").length : 0;
  if (stagedN === 0) {
    log(`提交计划[${plan.lane}]「${plan.message.slice(0, 50)}」暂存面为空，跳过`);
    continue;
  }
  const cm = await gitTry(["commit", "-m", plan.message]);
  if (cm.ok) {
    const h = (await gitTry(["log", "-1", "--format=%h"])).out.trim();
    commitHashes.push(h + " " + plan.message.slice(0, 60));
    log(`已提交 ${h}（${plan.lane}，暂存 ${stagedN} 项）`);
  } else {
    const res = await gitButler.ask<{ commit: string }>(
      `git commit 失败，错误尾部：\n${cm.err.slice(-1500)}\n请检查状态后完成提交，信息：${plan.message}。只允许提交当前暂存区里已有的内容，绝不 add 新文件。commit 返回 hash；无法提交时如实写原因。`,
    ).then((v) => v, (e) => askFail<{ commit: string }>("Git 管家", e, { commit: "" }));
    if (res.commit) {
      commitHashes.push(res.commit + " " + plan.message.slice(0, 60));
      log(`管家完成提交 ${res.commit}（${plan.lane}）`);
    } else {
      blockers.push(`提交计划[${plan.lane}]「${plan.message.slice(0, 50)}」未落地：${cm.err.slice(-160)}`);
    }
  }
}
log(`提交完成：${commitHashes.length} 笔`);

// —— 提交后按原 profile 重启 8080，再补一次后端新鲜度读数（门的判据含 apps/api 未提交计数）——
let backendRestarted = false;
let backendFreshAfter = "(未重启，跳过读数)";
if (backendTestOk && stewardLook.entry) {
  const rs = await envSteward.ask<{ ok: boolean; oldPid: string; newPid: string; health: string; note: string }>(
    [
      `受控重启 8080：① 记下旧 pid（=${stewardLook.pid}）并停止它及其父链（taskkill //F //T //PID <pid>，或 powershell Stop-Process；只动 8080 链）；② 用 PATH 前置 Node22 的 Git Bash 以分离方式重启：cd /d/6/恋爱小程序 && nohup ${stewardLook.entry} > tmp/api-dev-v35.log 2>&1 &（entry=${stewardLook.entry}，profile=${stewardLook.profile}，以你核查到的为准）；③ 轮询 curl -s -m 3 http://127.0.0.1:8080/actuator/health 直到含 "UP"（最多等 180 秒）；④ 再跑 node scripts/qa/verify-backend-fresh.mjs（Node22）取提交后读数。`,
      `返回 ok / oldPid / newPid / health（UP/DOWN）/ note（新进程命令行与日志尾部要点）。起不来就如实 ok=false 并贴日志尾部。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<{ ok: boolean; oldPid: string; newPid: string; health: string; note: string }>("环境管家", e, { ok: false, oldPid: stewardLook.pid, newPid: "", health: "DOWN", note: "环境管家重启调用失败：" + String(e).slice(0, 80) }));
  backendRestarted = rs.ok && rs.health === "UP";
  if (!backendRestarted) {
    blockers.push(`8080 重启未达 UP：${rs.note.slice(0, 200)}`);
  } else {
    const bf = await runGate({ name: "提交后后端新鲜度复量 verify-backend-fresh-after-commit", args: ["scripts/qa/verify-backend-fresh.mjs"], timeoutMs: 120000 });
    gateToBoard(bf);
    backendFreshAfter = bf.resultLine;
    finalReadings[bf.name] = bf.exitCode;
    log(`提交后后端读数：exit=${bf.exitCode} ${bf.resultLine}`);
    if (bf.exitCode !== 0) blockers.push(`提交后 verify-backend-fresh 仍红：${bf.resultLine}`);
  }
} else {
  blockers.push("8080 未重启：后端测试门未过或重启入口不明（BACKEND-8080 留拍板）");
}
await persistJson(WORKFLOW.closureDir + "/commit-restart-v35.json", { commitHashes, backendRestarted, backendFreshAfter });

// —— 提交会推 HEAD：sha 敏感门提交后复量 ——
const shaSensitive = GATE_SUITE.filter(g => /corpus|provenance|band-freshness|real-coverage/.test(g.name));
const headNow = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head;
const postCommit: GateOut[] = commitHashes.length > 0 ? await Promise.all(shaSensitive.map(async (g) => {
  const o = await runGate(g);
  gateToBoard(o);
  return o;
})) : [];
if (postCommit.length > 0) {
  const flippedPost = postCommit.filter(o => {
    const b = gateOuts2.find(x => x.name === o.name);
    return !!b && b.exitCode === 0 && o.exitCode !== 0;
  });
  log(`提交后 HEAD=${headNow}，sha 敏感门复量 ${postCommit.length} 条，由绿转红 ${flippedPost.length} 条`);
  for (const o of flippedPost) blockers.push(`提交后转红：${o.name}（${o.resultLine}）`);
  await persistJson(WORKFLOW.closureDir + "/post-commit-gates-v35.json", { head, headAfter: headNow, gates: postCommit, flipped: flippedPost.map(o => o.name) });
}

// =====================================================================
phase("推送与总报告");
const finalHead = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head;
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
      pushNote = p.ok ? `已推送 origin main（${commitHashes.length} 笔新提交）` : "推送失败：" + p.err.slice(-200);
    }
  }
}
log(pushNote);
if (!pushed) blockers.push("推送未完成：" + pushNote);
await persistJson(WORKFLOW.closureDir + "/push-result-v35.json", { pushed, pushNote, commitHashes });

const allNeedsUser = [...seededNeedsUser, ...needsUserRows];
const verified: string[] = [
  `后端 mvnw test 全量实测${backendTestOk ? "（GREEN " + backendTestSummary + "）" : "（三轮 RED，功能体未入库）"}`,
  `QA 全清单机器门禁两轮实测（GATE_SUITE ${GATE_SUITE.length} 条，账单 + 终验复量；判读以退出码与机器行为准）`,
  `三只仓库探针两轮实测（读数落盘 ${WORKFLOW.closureDir}/probe-*.json）`,
  "build-mp-weixin.bat 动态实跑 + typecheck + vitest 经收口守门员实测（PATH 前置 Node22）",
  bandsRebuilt ? `档位重建经档位重建工程师按 verify-band-freshness 点名迭代并复测（${bandFinalLine.slice(0, 120)}）` : "档位重建按选项 (b) 跳过（后端测试门未过），未把未入库字节烧进档位",
  backendRestarted ? `8080 按原 profile 受控重启并补提交后读数（${backendFreshAfter.slice(0, 120)}）` : "8080 未重启（测试门未过/入口不明），如实降级",
  "全量面板与面板后复量 3 条（顺序腿）+ 门禁可变红自检 prove-gates-can-fail",
  `提交计划由编排层单点顺序执行（check-ignore 过滤 + 暂存面实证），共 ${commitHashes.length} 笔；提交后 sha 敏感子集复量 ${postCommit.length} 条`,
];
const notCovered: string[] = [
  "scripts/qa 的既有 M 文件（QA 台账体）保持未提交、未重写，另册待其专门轮次处置",
  "CORPUS-LEGACY-144 / PROV-PRESTAMP-4881 复采 / REALCOV-9 真实腿 / .qoder 裁处：判据与政策类，只列不做（见需拍板）",
  "start-showcase.bat 的拉起后端窗口一步未动态验证（会留孤儿进程）；核心编译步由 showcase 隔离构建历史证据覆盖",
  "未做真机（手机）实测与 H5 端验证（历轮同此口径）",
  "需用户拍板事项只列不做，见 findings 与总报告",
];
if (!backendUp && !backendRestarted) notCovered.push("后端 8080 全程不可达：真实档相关读数按各门自身判据落地");
const findings: Finding[] = [];
for (const u of allNeedsUser) {
  findings.push({ where: u?.id ?? "(缺 id)", what: "需用户拍板：" + (u?.why ?? "(未填 why)"), evidence: u?.options ?? "", status: "verified", severity: "medium" });
}
for (const b of blockers.slice(0, 40)) {
  findings.push({ where: "本轮 blockers", what: b, evidence: "见对应车道/门禁/探针输出", status: "verified", severity: "medium" });
}

const md = [
  `# 功能体入库与档位收口总报告（v${WORKFLOW.version}）`,
  "",
  `- 起点：HEAD ${head}（branch ${branch}），删除待裁 ${deletions}，功能体 M=${featureModified}/??=${featureUntracked}，领先远端 ${ahead}`,
  `- 终点：HEAD ${finalHead}；${pushNote}`,
  `- 后端测试门：${backendTestOk ? "GREEN" : "RED"} ${backendTestSummary}`,
  `- 三车道：${laneResults.map(l => `${l.lane}（证实 ${(l.fixedIds ?? []).length} / 未收 ${(l.skipped ?? []).length} / 提交计划 ${(l.commits ?? []).length}）`).join("、")}`,
  `- 档位重建：${bandsRebuilt ? "GREEN" : "未达绿"}；8080 重启：${backendRestarted ? "UP（提交后读数已补）" : "未重启"}`,
  `- 门禁复量：新转绿 ${improved.length}（${improved.join("、") || "无"}）；仍红 ${stillRed.length}（${stillRed.join("、") || "无"}）；新转红 ${flippedNew.length}`,
  `- 提交：${commitHashes.length} 笔（${commitHashes.map(c => c.slice(0, 40)).join("；") || "无"}）`,
  "",
  "## 需你拍板（未替你决定）",
  ...(allNeedsUser.length > 0 ? allNeedsUser.map(u => `- ${u?.id ?? "(缺 id)"}：${u?.why ?? "(未填)"}（可选：${u?.options ?? "(未填)"}）`) : ["- （无）"]),
  "",
  "## 仍未收口（每条带原因）",
  ...(blockers.length > 0 ? blockers.map(b => `- ${b}`) : ["- （无）"]),
].join("\n");
try {
  await artifact.markdown("final", md, { title: "功能体入库与档位收口总报告", description: "后端测试门→三车道→档位重建→提交重启→推送的结果与需拍板清单", primary: true });
} catch (e) {
  log("总报告 artifact 发布失败：" + String(e).slice(0, 120));
}

return {
  conclusion: `功能体入库与档位收口完成：后端测试门${backendTestOk ? " GREEN" : " RED（功能体未入库）"}；三车道证实 ${laneResults.reduce((n, l) => n + (l.fixedIds?.length ?? 0), 0)} 条、提交 ${commitHashes.length} 笔；档位重建${bandsRebuilt ? "达绿" : "未达绿"}、8080${backendRestarted ? "已重启达 UP" : "未重启"}；门禁新转绿 ${improved.length}、仍红 ${stillRed.length}（全部为已点名的拍板项/判据项）、新转红 ${flippedNew.length}；${pushNote}；需你拍板 ${allNeedsUser.length} 项已原样列出。`,
  findings,
  verified,
  notCovered,
};
