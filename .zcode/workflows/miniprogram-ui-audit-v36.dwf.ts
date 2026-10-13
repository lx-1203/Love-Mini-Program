/* zcode-workflow
description: 全量UI巡检闭环 v3.6（谱系 v3.1→v3.2→v3.3→v3.4/v3.5→本版）：对小程序全部 73
  页（主包+13分包）做全量巡检——UI 单写者零点击冷启 DevTools（判据只认 ws-channel-up 自己的
  WS_UP=OK/ALREADY_UP 与 WS_UP_BAND=match）、73 页 15
  页/批逐页截图+console+可交互元素清点+安全动作抽测（支付只验封存态、破坏性动作护栏跳过）、三路独立审查（console/网络、功能断言、视觉对照）、分拣后修复+独立复验+UI
  回归，审计-修复-回归最多 3
  轮、零新增缺陷提前停；REALCOV-9（PFI25/VI25/VI34/OT05/OT06/OT09/VRN07/OC09/VB03）真实腿补齐按门禁期待格式落证据；终验=GATE_SUITE+客户端三门+面板；截图帧按
  LFS 裁定不入库只落盘。
whenToUse: 需要全量审查小程序所有页面/按钮/功能并循环修复到无新增缺陷时运行；改版后全量回归、发布前验收、真实档覆盖补腿皆可。前置：后端 8080
  real UP + 三档构建新鲜。
*/
// =====================================================================
// 全量UI巡检闭环工作流 v3.6
// 谱系：qa-loop v3.1 → v3.2 → qa-finish v3.3 → repo-closure v3.4/v3.5 → 本文件（v3.6）
// 目标（用户指令）：对小程序全部 73 个页面的所有按钮与功能做全量巡检审查，审计-修复-回归
//   循环直到无新增问题，并保证过程所见皆可用。
// 本轮特有条件（2026-10-09 实测）：
//   ① 后端 8080 real UP（v3.5 收尾刚修好，verify-backend-fresh PASS，运行实例=HEAD）；
//   ② 三档构建全绿（verify-band-freshness PASS bands=3 problems=0），real 档 mp-weixin-real 在场；
//   ③ DevTools 自动化端口 9420/9430/9431 全冷（IDE 未开）——按 r9 实测的零点击冷启路线拉起：
//      cli-automator 的 check_wechatide_status 子进程 argv 形态会 auto-auth 并冷启 IDE 服务（9430），
//      再 ws-channel-up --wait 300 起 9420。判据只有一条：脚本自己印的 WS_UP=OK/ALREADY_UP，
//      不是 netstat 端口表（r9 教训：最小化窗口端口在听但不可驱动）。
//   ④ REALCOV 门 9 条真实档覆盖缺口（PFI25/VI25/VI34/OT05/OT06/OT09/VRN07/OC09/VB03，
//      缺 login 或 login+guest 真实腿）= 本轮要补的功能盲区清单；去向册 RCD PASS。
// 纪律（沿用谱系全部铁律 + 本轮补充）：
//   files.* 在本机挂死 ⇒ 世界读取全走 world.run/git；跑 scripts/** 前置 Node22；
//   UI 单写者：全部 DevTools 驱动只经「UI巡检执行员」一个代理（锁协议，不旋轮抢锁）；
//   批次化巡检：73 页按 15 页/批分 ask（车道 agent 实测 150 轮会被截断，绝不单 ask 吃全量）；
//   增量落盘是硬要求：巡检骨架先落盘，每批完成立刻更新，盘上没有读数＝该页未巡检；
//   安全护栏：支付/VIP 拉起只验「封存态 404/403 支付未开通」设计行为；删除/解绑/同意类破坏性
//   动作一律跳过记 SKIP(guard)；真实档写操作只做 REALCOV 点名页与缺陷复现所需，按既定裁定；
//   循环有界：审计-修复-回归最多 3 轮，零新增缺陷且 REALCOV 闭干净才提前停，绝不假称"保证无问题"。
// =====================================================================

// ===== 配置（数值只进这里）=====
const WORKFLOW = {
  version: "3.6",
  nodeBin: "D:/codex-tools/node-v22.17.0-win-x64/node.exe",
  closureDir: "reports/audit/ui-audit-2026-10-09",
  healthUrl: "http://127.0.0.1:8080/actuator/health",
  realcovItems: "PFI25/VI25/VI34/OT05/OT06/OT09/VRN07/OC09/VB03",
  commitMsg: "evidence(qa): 全量UI巡检闭环（v3.6 工作流）——73页巡检+三路审查+修复回归+REALCOV补腿取证",
};

// ===== QA 门禁清单：与 v3.3/v3.4/v3.5 GATE_SUITE 同步（判读以退出码/机器行为准）=====
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
  { name: "真实档覆盖去向册 verify-real-coverage-disposition", args: ["scripts/qa/verify-real-coverage-disposition.mjs"], timeoutMs: 180000 },
  { name: "用例可自动化预检 verify-case-automatable", args: ["scripts/qa/verify-case-automatable.mjs", "--results", "reports/audit/round-6/interact/exec-results.json", "--json", ".zcode/tmp/case-automatable/preflight.json"], timeoutMs: 180000 },
  { name: "工作流干跑预检 dryrun-workflow", args: ["scripts/qa/dryrun-workflow.mjs", "--profile", "all"], timeoutMs: 300000 },
  { name: "判据台戳 verify-ops-stamp", args: ["scripts/qa/verify-ops-corpus-stamp.mjs", "--check"], timeoutMs: 180000 },
];

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
  name: string;
  exitCode: number;
  resultLine: string;
}
interface SetupOut {
  /** WS 通道是否就绪（判据=ws-channel-up 自己印的 WS_UP=OK/ALREADY_UP） */
  wsUp: boolean;
  port: string;
  /** pages.json 清点的页面路由全集 */
  routes: string[];
  planFile: string;
  notes: string;
}
interface TourRow {
  route: string;
  status: string;
  screenshot: string;
  elementCount: number;
  keyElements: string;
  consoleErrors: string;
  actions: string;
  notes: string;
}
interface TourOut {
  round: number;
  rows: TourRow[];
  evidence: string[];
  notes: string;
}
interface Finding {
  where: string;
  what: string;
  evidence: string;
  status: "verified" | "unconfirmed";
  severity: "high" | "medium" | "low";
}
interface AuditItem {
  id: string;
  area: string;
  /** 缺陷描述（哪里、现象、复现路径） */
  what: string;
  evidence: string;
  severity: "high" | "medium" | "low";
}
interface AuditOut {
  items: AuditItem[];
  openCount: number;
  notes: string;
}
interface UserItem {
  id: string;
  why: string;
  options: string;
}
interface SortOut {
  executable: AuditItem[];
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
async function persistJson(file: string, data: unknown): Promise<void> {
  try {
    await world.run("D:/codex-tools/node-v22.17.0-win-x64/node.exe", ["-e",
      "const f=require('fs'),p=require('path');f.mkdirSync(p.dirname(process.argv[1]),{recursive:true});f.writeFileSync(process.argv[1],process.argv[2]);",
      file, JSON.stringify(data, null, 1)], { timeoutMs: 20000 });
  } catch (e) {
    log("落盘失败（不改变判定）：" + String(e).slice(0, 80));
  }
}
const gatekeeper = agent("终验守门员", "你只负责运行指定命令并如实报告结果，绝不修改任何文件、绝不为通过而改跑别的命令。若命令不可能通过，如实 ok=false 并贴出现象，宁可红也不放水。");
async function runViaGatekeeper(purpose: string, command: string, timeoutMs: number): Promise<CheckOut> {
  const r = await gatekeeper.ask<CheckOut>(
    [
      `运行${purpose}并如实报告。用 Bash 执行这一行（PATH 前置 Node22，Windows Git Bash；stdin 接 /dev/null）：`,
      `export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" && ${command}`,
      `要求：等命令完整结束（Bash timeout 设 ${timeoutMs}）；ok = (退出码 === 0)；err = 失败时最后 50 行输出、成功时留空；command 回填实际执行的命令。`,
      `【诚实铁律】禁止伪造：跑不起来/超时/输出异常都如实 ok=false；禁止顺手修任何错误。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<CheckOut>("终验守门员", e, { ok: false, err: "守门员调用失败: " + String(e), command }));
  return { ok: r.ok === true, err: typeof r.err === "string" ? r.err : "", command: typeof r.command === "string" ? r.command : command };
}

// =====================================================================
phase("探活与巡检准备");
let backendUp = false;
try {
  const h = await world.run("curl", ["-s", "-m", "3", WORKFLOW.healthUrl], { timeoutMs: 10000 });
  backendUp = h.stdout.indexOf('"UP"') >= 0;
} catch {
  backendUp = false;
}
log(`后端 8080：${backendUp ? "UP" : "DOWN"}`);
const head = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
const branch = (await gitTry(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() || "unknown";

// —— UI 单写者：探活 + 零点击冷启 + 页面清点 + 巡检计划落盘 ——
const ui = agent("UI巡检执行员", "你独占驱动微信开发者工具自动化（单写者）。先按锁协议取锁（tmp/qa/locks/ui-audit-v36.lock，字段 owner/pid/status/leaseUntil；拿不到锁就如实 BLOCKED，禁止旋轮抢锁、禁止 kill 他人进程）。冷启纪律：以 cli-automator 的子进程 argv 形态跑 check_wechatide_status（它会 auto-auth 并冷启 IDE 服务，9430 随之出现），再用 Node22 跑 scripts/qa/ws-channel-up.mjs --wait 300 起 9420；判据只有脚本自己印的 WS_UP=OK/ALREADY_UP 与 WS_UP_BAND=match，不是 netstat；--wait 60 会给误导性 FAIL（端口约 18 秒已绑但没热完）。拿不到 WS_UP 就如实 wsUp=false，绝不伪造。你的所有演练/临时产物只准落 tmp/ 或本轮 closureDir，禁止写仓库根。");
const setup = await ui.ask<SetupOut>(
  [
    `本轮 closureDir：${WORKFLOW.closureDir}；后端 8080 已 ${backendUp ? "UP(real)" : "DOWN"}；HEAD=${head}。`,
    `任务（只做探活与计划，不巡检）：① 取锁；② 零点击冷启 IDE + ws-channel-up，读 WS_UP/WS_UP_BAND 机器行；③ 用 Node22 解析 apps/client/src/pages.json（JSONC，允许注释——先去 // 注释再 JSON.parse），拼出主包+全部 subPackages 的完整路由清单（主包=pages[].path；分包=「root + / + pages[].path」），应得 73 条；④ 把巡检计划骨架（路由清单、批次 15 页/批、每页要采什么：截图/console/可交互元素/安全动作）写入 ${WORKFLOW.closureDir}/tour-plan.json 与 tour-plan.md。`,
    `返回 wsUp / port / routes（73 条路由数组）/ planFile / notes。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<SetupOut>("UI巡检执行员", e, { wsUp: false, port: "", routes: [], planFile: "", notes: "探活 ask 失败：" + String(e).slice(0, 100) }));
const routes = Array.isArray(setup.routes) ? setup.routes.filter(r => typeof r === "string" && r !== "") : [];
log(`探活完成：WS_UP=${setup.wsUp ? "OK" : "FAIL"}(${setup.port || "无端口"})，页面清点 ${routes.length} 条，计划=${setup.planFile || "未落盘"}`);
await persistJson(WORKFLOW.closureDir + "/setup-v36.json", { wsUp: setup.wsUp, port: setup.port, routeCount: routes.length, head, branch, backendUp });
if (!setup.wsUp) blockers.push("DevTools 自动化通道未就绪（零点击冷启后仍无 WS_UP=OK）：UI 巡检全量降级，仅余代码级审查腿");
if (routes.length === 0) blockers.push("pages.json 路由清点为空，巡检无对象");

// =====================================================================
phase("巡检-审查-修复循环");
// —— 最多 3 轮：全量巡检 → 三路审查 → 分拣 → 修复 → UI 回归 → 重审；零新增缺陷且覆盖闭干净才提前停 ——
const consoleAuditor = agent("console网络审查员", "你是只读审查员：读盘上巡检结果件，逐条核对 console error/warn 与网络请求失败，判：产品缺陷 / 环境性拦截（如 urlCheck 域名校验）/ 预期封存行为。绝不修改文件；判 Product 缺陷必须给 route+console 原文+复现路径，判环境/预期必须给判据出处。");
const funcAuditor = agent("功能断言审查员", "你是只读审查员：对照 pages.json 路由全集、盘上巡检覆盖与 REALCOV 点名清单，审「哪些页面/按钮/功能没被巡到、哪些断言未过」。绝不修改文件；每条缺口必须给路由/元素/期待行为三要素。");
const visualAuditor = agent("视觉对照审查员", "你是只读审查员：抽检巡检截图对照 deliverables/ 下设计规范，只报可复现的布局/样式偏差（有像素/结构证据），不报审美偏好；判不清的如实进 notes。绝不修改文件。");
const sorter = agent("缺口分拣员", "你是只读分拣员：把三路审查的缺陷分拣为 executable（area ∈ 前端实现刀/backend/数据配置/覆盖补腿）与 needsUser（判据冲突/政策/数据去留）。绝不修改文件；绝不把拍板项混进 executable；每条 executable 必须指到审查证据。");
const fixerAgent = agent("巡检修复工程师", "你是小程序前端与后端工程专家：按审查证据修复缺陷，只修真问题，禁止改测试断言凑绿、禁止 any 糊弄。不碰 .zcode/**、reports/**，不做 git 提交；增量落盘到 closureDir/fix-lane.md（骨架先行，每修一项立刻更新）。做不到的如实 skipped 带原因。");
const fixVerifier = agent("修复复验员", "你是独立复验员：只认盘上证据（文件:行、命令输出），不复述修复者自报；每条要么给可复核证据放 fixedIds，要么如实进 skipped（「复验未通过: …」）。不修改文件。");

const allTourRows: TourRow[] = [];
const allNeedsUser: UserItem[] = [];
let openItems = -1;
let realcovClosed = false;
let roundsDone = 0;
for (let round = 1; round <= 3; round++) {
  roundsDone = round;
  // —— 巡检腿：round 1 全量批次；round 2+ 只巡失败页/新覆盖页 ——
  phase("逐页巡检采集");
  const failedRoutes = allTourRows.filter(x => x.status !== "NAV_OK").map(x => x.route);
  const pendingRoutes = round === 1
    ? routes
    : [...new Set([...failedRoutes, ...routes.filter(rt => !allTourRows.some(x => x.route === rt && x.status === "NAV_OK"))])];
  if (setup.wsUp && pendingRoutes.length > 0) {
    const batchSize = 15;
    for (let b = 0; b < pendingRoutes.length; b += batchSize) {
      const batch = pendingRoutes.slice(b, b + batchSize);
      const isReline = round > 1;
      const tour = await ui.ask<TourOut>(
        [
          `第 ${round} 轮巡检，批次 ${Math.floor(b / batchSize) + 1}/${Math.ceil(pendingRoutes.length / batchSize)}（${isReline ? "回归批" : "全量批"}）：${JSON.stringify(batch)}`,
          `逐页执行：① navigate 到该路由（tab 页用 switchTab、普通页 reLaunch/navigateTo，分包页直接全路径）；② 等 3 秒截图存 ${WORKFLOW.closureDir}/screenshots/r${round}-b${Math.floor(b / batchSize)}-<序号>-<路由转文件名>.png；③ 采 console 全量（error/warn 分开）；④ 清点可交互元素（button/tab/cell/link/input 数量与关键类名）；⑤ 安全动作抽测：每页挑 1-2 个主按钮 tap 后回退；【护栏】支付/VIP 拉起只验封存态（404/403「支付未开通」=预期通过）、删除/解绑/同意类一律跳过记 SKIP(guard)、真实档写操作除 REALCOV 点名页外一律不做。`,
          `REALCOV 点名页（本轮要补 login/login+guest 真实腿，按 verify-real-coverage 门禁输出的逐条期待格式落证据）：${WORKFLOW.realcovItems}。登录态用既有 dev-user 演示入口或 r-exec 既有 login op 铸造，禁止编造。`,
          `【增量落盘是硬要求】开工先写 ${WORKFLOW.closureDir}/tour-round${round}.md 骨架，每完成一页立刻补那一行；本批结束把 rows 返回（route/status(NAV_OK|NAV_FAIL|SKIP(guard))/screenshot/elementCount/keyElements/consoleErrors/actions/notes）。单操作 30 秒超时跳过记 failure，绝不伪造帧。`,
        ].join("\n"),
      ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], notes: "巡检批 ask 失败：" + String(e).slice(0, 100) }));
      const rows = Array.isArray(tour.rows) ? tour.rows : [];
      for (const row of rows) {
        if (row && typeof row.route === "string") allTourRows.push(row);
      }
      log(`第 ${round} 轮批次 ${Math.floor(b / batchSize) + 1}：+${rows.length} 行（累计 ${allTourRows.length}）`);
      await persistJson(WORKFLOW.closureDir + `/tour-round${round}.json`, allTourRows);
    }
  } else if (!setup.wsUp) {
    log("WS 通道未就绪，跳过巡检腿");
  } else {
    log("无待巡页面，本轮免巡检");
  }

  // —— 三路审查 + 分拣（读盘上结果件，不吃对话上下文）——
  phase("三路审查与分拣");
  const navOk = allTourRows.filter(x => x.status === "NAV_OK").length;
  const navFail = allTourRows.filter(x => x.status === "NAV_FAIL").length;
  const consoleErrCount = allTourRows.reduce((n, x) => n + ((x.consoleErrors || "").split(";").filter(s => s.trim() !== "").length), 0);
  log(`巡检覆盖：NAV_OK=${navOk} NAV_FAIL=${navFail} / ${routes.length}，console 错误计数≈${consoleErrCount}`);
  const auditPromptTail = [
    `巡检结果件：${WORKFLOW.closureDir}/tour-round${round}.json（历史轮 tour-round*.json 也在）；计划件：${WORKFLOW.closureDir}/tour-plan.json；REALCOV 点名：${WORKFLOW.realcovItems}。`,
    `返回 items（每条 {id, area, what, evidence, severity}）与 openCount。`,
  ].join("\n");
  const consoleAudit = await consoleAuditor.ask<AuditOut>(
    [`审 console/网络：${auditPromptTail}`].join("\n"),
  ).then((v) => v, (e) => askFail<AuditOut>("console网络审查员", e, { items: [], openCount: 0, notes: "审查 ask 失败" }));
  const funcAudit = await funcAuditor.ask<AuditOut>(
    [`审功能覆盖与断言：${auditPromptTail}`].join("\n"),
  ).then((v) => v, (e) => askFail<AuditOut>("功能断言审查员", e, { items: [], openCount: 0, notes: "审查 ask 失败" }));
  const visualAudit = await visualAuditor.ask<AuditOut>(
    [`审视觉对照（抽检关键页截图）：${auditPromptTail}`].join("\n"),
  ).then((v) => v, (e) => askFail<AuditOut>("视觉对照审查员", e, { items: [], openCount: 0, notes: "审查 ask 失败" }));
  const auditItems: AuditItem[] = [
    ...(Array.isArray(consoleAudit.items) ? consoleAudit.items : []),
    ...(Array.isArray(funcAudit.items) ? funcAudit.items : []),
    ...(Array.isArray(visualAudit.items) ? visualAudit.items : []),
  ].filter(i => i && typeof i.id === "string");
  log(`三路审查：console=${(consoleAudit.items || []).length} 功能=${(funcAudit.items || []).length} 视觉=${(visualAudit.items || []).length}`);
  await persistJson(WORKFLOW.closureDir + `/audit-round${round}.json`, { consoleAudit, funcAudit, visualAudit });

  const sortRes = await sorter.ask<SortOut>(
    [
      `缺陷清单：${JSON.stringify(auditItems).slice(0, 14000)}`,
      `分拣为 executable（area ∈ 前端实现刀/backend/数据配置/覆盖补腿；每条保留 id/what/evidence/severity 并补补法一句）与 needsUser。判据冲突/政策/数据去留一律 needsUser。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<SortOut>("缺口分拣员", e, { executable: [], needsUser: [], notes: "分拣 ask 失败" }));
  const executable = Array.isArray(sortRes.executable) ? sortRes.executable : [];
  const needsUser = Array.isArray(sortRes.needsUser) ? sortRes.needsUser : [];
  for (const u of needsUser) {
    if (u && typeof u.id === "string" && !allNeedsUser.some(x => x.id === u.id)) allNeedsUser.push(u);
  }
  await persistJson(WORKFLOW.closureDir + `/sort-round${round}.json`, { executable, needsUser });

  realcovClosed = !(funcAudit.items ?? []).some(i => (i.id || "").indexOf("REALCOV") >= 0);
  openItems = executable.length;
  if (executable.length === 0 && needsUser.length === 0 && navFail === 0) {
    log(`第 ${round} 轮零新增缺陷且无失败页，提前收工`);
    break;
  }
  if (executable.length === 0) {
    log(`第 ${round} 轮无可执行缺陷（剩 ${needsUser.length} 项待拍板），停止循环`);
    break;
  }

  // —— 修复 + 独立复验 + UI 回归（覆盖补腿类归 UI 车道，代码修复类归修复工程师）——
  phase("修复与回归验证");
  const codeFixItems = executable.filter(i => i.area !== "覆盖补腿");
  const covLegItems = executable.filter(i => i.area === "覆盖补腿");
  const fix = codeFixItems.length > 0
    ? await fixerAgent.ask<LaneOut>(
      [
        `本轮要修复的缺陷（按 area 分组给补法）：${JSON.stringify(codeFixItems).slice(0, 14000)}`,
        `巡检证据件在 ${WORKFLOW.closureDir}/tour-round${round}.json 与 audit-round${round}.json。环境纪律：Bash PATH 前置 Node22。增量落盘 ${WORKFLOW.closureDir}/fix-lane.md。`,
        `返回 fixedIds / filesChanged / skipped / evidence / notes。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>("巡检修复工程师", e, { lane: "修复", fixedIds: [], filesChanged: [], skipped: codeFixItems.map(i => ({ id: i.id, reason: "修复 ask 失败" })), evidence: [], notes: "" }))
    : { lane: "修复", fixedIds: [], filesChanged: [], skipped: [], evidence: [], notes: "本轮无代码修复项" };
  if (covLegItems.length > 0 && setup.wsUp) {
    const legs = await ui.ask<TourOut>(
      [
        `覆盖补腿批（REALCOV 缺口，第 ${round} 轮）：${JSON.stringify(covLegItems).slice(0, 6000)}`,
        `逐条补真实腿（login 或 login+guest，按各条 what 指定）：真实登录态用 dev-user 演示入口或 r-exec 既有 login op，禁编造；证据按 verify-real-coverage 门禁输出的逐条期待格式落到其期待的 measured/evidence 文件；动作结果同步返回 rows（route/status/actions/notes）。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], notes: "补腿 ask 失败：" + String(e).slice(0, 80) }));
    const legRows = Array.isArray(legs.rows) ? legs.rows : [];
    for (const row of legRows) {
      const idx = allTourRows.findIndex(x => x.route === row.route);
      if (idx >= 0) allTourRows[idx] = row; else allTourRows.push(row);
    }
    await persistJson(WORKFLOW.closureDir + `/cov-legs-round${round}.json`, { covLegItems, legRows, evidence: legs.evidence ?? [] });
    log(`覆盖补腿：${legRows.length} 行`);
  } else if (covLegItems.length > 0) {
    blockers.push(`覆盖补腿 ${covLegItems.length} 条未执行：WS 通道未就绪`);
  }
  const toVerify = (fix.fixedIds ?? []).filter(id => id !== "");
  let verifiedIds: string[] = [];
  if (toVerify.length > 0) {
    const fv = await fixVerifier.ask<LaneOut>(
      [
        `逐条复验声称已修复的缺陷：${JSON.stringify(toVerify)}；改动文件：${JSON.stringify((fix.filesChanged ?? []).slice(0, 2000))}`,
        `验证方式：源码锚点 > 相关单测重跑（Node22）。fixedIds 只放亲手证实的。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>("修复复验员", e, { lane: "复验", fixedIds: [], filesChanged: [], skipped: toVerify.map(id => ({ id, reason: "复验 ask 失败" })), evidence: [], notes: "" }));
    verifiedIds = fv.fixedIds ?? [];
    for (const s of [...(fix.skipped ?? []), ...(fv.skipped ?? [])]) blockers.push(`修复未收口: ${s.id}（${String(s.reason).slice(0, 80)}）`);
  }
  await persistJson(WORKFLOW.closureDir + `/fix-round${round}.json`, { fix, verifiedIds });
  if (setup.wsUp) {
    const regRoutes = allTourRows.filter(x => verifiedIds.some(id => (x.notes || "").indexOf(id) >= 0 || (x.route || "").indexOf(id) >= 0)).map(x => x.route);
    const regressionTargets = regRoutes.length > 0 ? regRoutes : allTourRows.filter(x => x.status === "NAV_FAIL").map(x => x.route);
    if (regressionTargets.length > 0) {
      const reg = await ui.ask<TourOut>(
        [
          `回归批（第 ${round} 轮修复后）：${JSON.stringify(regressionTargets.slice(0, 30))}`,
          `逐页重走巡检流程（同前批纪律与护栏），结果写 ${WORKFLOW.closureDir}/tour-round${round}-regression.json 并返回 rows。`,
        ].join("\n"),
      ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], notes: "回归 ask 失败" }));
      const regRows = Array.isArray(reg.rows) ? reg.rows : [];
      for (const row of regRows) {
        const idx = allTourRows.findIndex(x => x.route === row.route);
        if (idx >= 0) allTourRows[idx] = row; else allTourRows.push(row);
      }
      await persistJson(WORKFLOW.closureDir + `/tour-round${round}.json`, allTourRows);
      log(`回归：${regRows.length} 页重验`);
    }
  }
}

// =====================================================================
phase("门禁终验与构建");
let buildOk = false;
let tcOk = false;
let testOk = false;
{
  // 客户端三门（修复车道可能动了前端源码）：bat 动态实跑 + typecheck + vitest，失败交修复工程师（≤2 轮）
  for (let round = 1; round <= 2; round++) {
    const b = await runViaGatekeeper("G1 build-mp-weixin.bat 动态实跑", "cmd //c build-mp-weixin.bat </dev/null", 1800000);
    buildOk = b.ok;
    if (!b.ok) {
      blockers.push(`bat 动态实跑未过（第 ${round} 次）：${b.err.slice(-300)}`);
      await fixerAgent.ask(`build-mp-weixin.bat 实跑失败尾部：\n${b.err.slice(-2000)}\n请修复（保持版本闸与 %~dp0，临时产物只准落 tmp/）。`,
      ).then((v) => v, (e) => askFail<string>("巡检修复工程师", e, ""));
      continue;
    }
    const tc = await runViaGatekeeper("G2 typecheck", "pnpm -C apps/client run typecheck", 900000);
    tcOk = tc.ok;
    if (!tc.ok) {
      blockers.push(`typecheck 未过（第 ${round} 次）：${tc.err.slice(-300)}`);
      await fixerAgent.ask(`typecheck 失败尾部：\n${tc.err.slice(-2000)}\n请修复。`,
      ).then((v) => v, (e) => askFail<string>("巡检修复工程师", e, ""));
      continue;
    }
    const t = await runViaGatekeeper("G3 单测", "pnpm -C apps/client run test:unit", 1800000);
    testOk = t.ok;
    if (!t.ok) {
      blockers.push(`单测未过（第 ${round} 次）：${t.err.slice(-300)}`);
      await fixerAgent.ask(`单测失败尾部：\n${t.err.slice(-2000)}\n请修复。`,
      ).then((v) => v, (e) => askFail<string>("巡检修复工程师", e, ""));
    }
  }
}
log(`构建=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}`);

const gateOuts: GateOut[] = await Promise.all(GATE_SUITE.map(async (g) => {
  const out = await runGate(g);
  gateToBoard(out);
  return out;
}));
const realcovGate = gateOuts.find(g => g.name === "真实档覆盖 verify-real-coverage");
log(`REALCOV 门终验：exit=${realcovGate ? realcovGate.exitCode : "?"} ${realcovGate ? realcovGate.resultLine : "?"}（本轮目标是 UNCOVERED 清零）`);
const redProbe = await runGate({ name: "门禁可变红自检 prove-gates-can-fail", args: ["scripts/qa/prove-gates-can-fail.mjs"], timeoutMs: 300000 });
gateToBoard(redProbe);
const panelOuts: GateOut[] = [];
for (const g of PANEL_SUITE) {
  const o = await runGate(g);
  gateToBoard(o);
  panelOuts.push(o);
  if (o.exitCode !== 0) blockers.push(`面板腿红：${o.name}（${o.resultLine}）`);
}
const stillRed = gateOuts.filter(g => g.exitCode !== 0).map(g => g.name);
await persistJson(WORKFLOW.closureDir + "/gate-recheck-v36.json", { gates: gateOuts, stillRed, redProbe, panelOuts, tourRows: allTourRows.length, roundsDone, realcovClosed, openItems });

// =====================================================================
phase("提交推送与总报告");
// —— 先落证据提交（显式路径；巡检截图不入库走 LFS 拍板），再做唯一一次推送闸 ——
const addRes = await gitTry(["add", "--", WORKFLOW.closureDir + "/", "reports/audit/round-7/", "reports/audit/round-6/"]);
let commitHash = "";
if (addRes.ok) {
  const cm = await gitTry(["commit", "-m", WORKFLOW.commitMsg]);
  if (cm.ok) {
    commitHash = (await gitTry(["log", "-1", "--format=%h"])).out.trim();
    log(`证据提交：${commitHash}`);
  } else {
    blockers.push("证据提交失败：" + cm.err.slice(-150));
  }
} else {
  blockers.push("证据 git add 失败：" + addRes.err.slice(-150));
}
const finalHead = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head;
const clientGreen = buildOk && tcOk && testOk;
let pushed = false;
let pushNote = "";
if (!clientGreen) {
  pushNote = "未推送：客户端构建/typecheck/单测存在红项";
} else {
  const fe = await gitTry(["fetch", "origin"]);
  const behindRes = fe.ok ? await gitTry(["rev-list", "--count", "HEAD..origin/main"]) : { ok: false, out: "", err: "fetch failed", spawned: false };
  const behindN = behindRes.ok ? (parseInt(behindRes.out.trim(), 10) || 0) : -1;
  if (behindN > 0) {
    pushNote = `未推送：本地落后 origin/main ${behindN} 个提交，合并方式需拍板`;
  } else {
    const p = await gitTry(["push", "origin", "main"]);
    pushed = p.ok;
    pushNote = p.ok ? `已推送 origin main（含巡检证据 ${commitHash || "未落盘"}）` : "推送失败：" + p.err.slice(-200);
  }
}
log(pushNote);
if (!pushed) blockers.push("推送未完成：" + pushNote);

const navOkFinal = allTourRows.filter(x => x.status === "NAV_OK").length;
const guardSkips = allTourRows.filter(x => (x.status || "").indexOf("SKIP") >= 0).length;
const md = [
  `# 全量UI巡检闭环总报告（v${WORKFLOW.version}）`,
  "",
  `- 起点 HEAD ${head}（${branch}），终点 ${finalHead}；后端 8080 ${backendUp ? "UP(real)" : "DOWN"}；WS 通道 ${setup.wsUp ? "OK(" + setup.port + ")" : "FAIL"}；${pushNote}`,
  `- 巡检：${roundsDone} 轮，覆盖 ${navOkFinal}/${routes.length} 页 NAV_OK，失败 ${allTourRows.filter(x => x.status === "NAV_FAIL").length}，护栏跳过 ${guardSkips}，截图与逐页证据在 ${WORKFLOW.closureDir}/`,
  `- 审查-修复-回归：最终 openItems=${openItems}；REALCOV 门终验 exit=${realcovGate ? realcovGate.exitCode : "?"}（${realcovGate ? realcovGate.resultLine.slice(0, 120) : "?"}）`,
  `- 客户端三门：构建=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}；门禁仍红 ${stillRed.length}（${stillRed.join("、") || "无"}）`,
  "",
  "## 需你拍板（未替你决定）",
  ...(allNeedsUser.length > 0 ? allNeedsUser.map(u => `- ${u?.id ?? "?"}：${u?.why ?? ""}（可选：${u?.options ?? ""}）`) : ["- （无）"]),
  "",
  "## 仍未保证（每条带原因）",
  ...(blockers.length > 0 ? blockers.map(b => `- ${b}`) : ["- （无）"]),
  "",
  "## 口径说明",
  "- 「保证所有问题没有」以机器可判据收口：全部 73 页 NAV_OK + 逐页 console 清白 + 可交互元素清点齐 + 安全动作抽测无失败 + REALCOV UNCOVERED 清零；凡判据之外的（真机手感/长时压测/支付真实拉起）不在本报告保证范围。",
  "- 截图帧未入库：.gitattributes 的 LFS fail-loud 闸裁定证据帧必须走 LFS，本机未装 LFS，git add 会故意失败——帧留盘未提交，入库方式归拍板。",
].join("\n");
try {
  await artifact.markdown("final", md, { title: "全量UI巡检闭环总报告", description: "73页巡检+三路审查+修复回归+REALCOV补腿的结果与需拍板清单", primary: true });
} catch (e) {
  log("总报告发布失败：" + String(e).slice(0, 120));
}

const verified: string[] = [
  `逐页巡检 ${roundsDone} 轮：${navOkFinal}/${routes.length} 页 NAV_OK，每页截图+console+可交互元素清点落盘 ${WORKFLOW.closureDir}/tour-round*.json`,
  "三路独立审查（console/网络、功能断言、视觉对照）逐轮执行，缺陷经分拣后修复并独立复验",
  `修复后客户端三门守门员实测：构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}`,
  `GATE_SUITE ${GATE_SUITE.length} 条门终验复量 + prove-gates-can-fail + 全量面板 ${PANEL_SUITE.length} 条`,
  `REALCOV 门终验读数：${realcovGate ? realcovGate.resultLine.slice(0, 140) : "?"}`,
];
const notCovered: string[] = [
  "巡检截图帧未入库（LFS fail-loud 闸，归拍板）；帧在 " + WORKFLOW.closureDir + "/screenshots/ 可复核",
  "支付/VIP 真实拉起不在巡检范围（商业化封存态，只验封存态设计行为）",
  "破坏性动作（删除/解绑/同意类）按护栏跳过，未真实执行",
  "真机（手机）手感、长时压测、弱网不在本轮判据",
  ...(!setup.wsUp ? ["DevTools 通道未就绪：本轮 UI 巡检降级，页面级保证不成立（见 blockers）"] : []),
];
const findings: Finding[] = [];
for (const u of allNeedsUser) {
  findings.push({ where: u?.id ?? "(缺 id)", what: "需用户拍板：" + (u?.why ?? ""), evidence: u?.options ?? "", status: "verified", severity: "medium" });
}
for (const b of blockers.slice(0, 40)) {
  findings.push({ where: "本轮 blockers", what: b, evidence: "见对应审查/巡检输出", status: "verified", severity: "medium" });
}

return {
  conclusion: `全量UI巡检闭环完成：${roundsDone} 轮巡检覆盖 ${navOkFinal}/${routes.length} 页，三路审查-修复-回归循环终态 openItems=${openItems}；客户端三门${buildOk && tcOk && testOk ? "全绿" : "存在红项"}；REALCOV 门 ${realcovGate ? (realcovGate.exitCode === 0 ? "UNCOVERED 清零" : "仍有缺口：" + realcovGate.resultLine.slice(0, 80)) : "?"}；${pushNote}；「所有问题没有」以机器判据口径成立的部分见 verified，判据之外与未竟项如实列入 findings。`,
  findings,
  verified,
  notCovered,
};
