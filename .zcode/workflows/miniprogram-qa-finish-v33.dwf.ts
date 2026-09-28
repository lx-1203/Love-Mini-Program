/* zcode-workflow
description: round-8 收官闭环（v3.3 续作）：不重跑已完成的 R1/R2/round-7 主体，直接从机器门禁账单出发——
  十项只读门禁并行 + 环境/端口/工作树探针出「缺口账单」；分拣员把缺口三分（可执行/需用户拍板/需环境），只有可执行项进车道；
  按域并行收口（每车道 修复→独立复验 链式流水；UI 交互腿单写者串行、锁协议）；账本员统一落账（先干跑核对再 --apply，备份纪律）；
  门禁终验复量对照 + 构建/typecheck/vitest 守门员重跑；显式路径清单提交；总报告把「需拍板清单」原样交还用户，绝不替写政策。
  前置事实：后端 8080 在跑（health UP）；DevTools 自动化端口可能是冷的，但**零点击能拉起**（见交互腿车道纪律），不要一上来就判 UNVERIFIED-TOOLING；跑任何 scripts/** 都必须用 Node>=20.11（PATH 上的 node 是 v16，会把多条门崩成假红）。
whenToUse: 需要把 round-7/r8 之后仍挂着的具名缺口（台账待修复、已修复待复验、门禁红项、真实档覆盖缺行）一次并行收口并出终报时运行。
args: {}
*/
// =====================================================================
// round-8 收官闭环工作流 v3.3 —— 续作（缺口账单驱动，全速并行，诚实降级）
// 依据：reports/audit/round-7/round7-final-report.md（§3 待拍板、§7.2/§9.8 缺口表）
//       + 2026-09-26..28 的 r8a..r8i 阶段提交 + 今日 evidence-holes-verdict（3 洞全 DECIDED）
// 纪律：门面 Node<T> 无 .catch（兜底一律 .then 双参 + askFail<T> 显式类型）；
//       world.run 沙箱起不了 pnpm/uni（构建链走「收口守门员」子代理，PATH 前置 Node22）；
//       9420/9430 单写者（锁协议，UI 车道独占）；数值判读一律以工具退出码/机器行为准；
//       需用户拍板的事项只列不做（本项目铁律：不替写政策）。
// 改完本文件必须先自检再提交运行，两条都要跑（Node>=20.11；PATH 的 node 是 v16 会崩）：
// 1) 语法：node -e "const ts=require('./apps/client/node_modules/typescript'),fs=require('fs');const p='.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts';const sf=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);console.log('syntax diagnostics:',(sf.parseDiagnostics||[]).length)"
// 2) 干跑（真跑之前把整场 DSL 用 stub 宿主过一遍，抓 F2 同型的"炸在终报之前"）：
//    node scripts/qa/dryrun-workflow.mjs --profile all     → 期望 DRYRUN_RESULT=PASS（3/3 画像）
//    对照证据：同一工具跑 v3.2 会在「盘点项目结构与页面清单」之后 CRASHED BEFORE REPORT（exit 1）。
// =====================================================================

// ===== 配置（数值只进这里）=====
const WORKFLOW = {
  version: "3.3",
  ledgerDir: "reports/audit/round-6",
  roundDir: "reports/audit/round-7",
  finalReport: "reports/audit/round-7/round7-final-report.md",
  notes: "reports/audit/round-7/round7-NOTES.md",
  healthUrl: "http://127.0.0.1:8080/actuator/health",
  buildScript: "build:mp-weixin:mock",
  // PATH 上的 node 是 v16.13.1：verify-source-shape.mjs:22 与 verify-evidence-holes.mjs:15 用
  // import.meta.dirname（需 >=20.11），裸 node 会把这两条门崩成假红（实测 ERR_INVALID_ARG_TYPE）。
  nodeBin: "D:/codex-tools/node-v22.17.0-win-x64/node.exe",
  commitMsg: "fix(qa): round-8 收官续作——缺口账单+并行收口+门禁终验（v3.3 工作流）",
};

// ===== 门禁清单（命令面已逐一对过仓库内脚本；退出码非 0 即该项红）=====
const GATE_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "台账词表/形状 verify-ledger", args: ["scripts/qa/verify-ledger.mjs", WORKFLOW.ledgerDir], timeoutMs: 120000 },
  { name: "状态真值 verify-state-truth", args: ["scripts/qa/verify-state-truth.mjs", WORKFLOW.roundDir], timeoutMs: 180000 },
  { name: "队列守恒 verify-queue-reconcile", args: ["scripts/verify-queue-reconcile.mjs", WORKFLOW.roundDir], timeoutMs: 120000 },
  { name: "真实档覆盖 verify-real-coverage", args: ["scripts/qa/verify-real-coverage.mjs"], timeoutMs: 180000 },
  // --dry：账单阶段只准读盘不准写盘。不带 --dry 时这条门会把
  // reports/audit/round-7/cellplan-source-shape.json 覆写掉（实测：上一程起跑即覆写），
  // 让"唯一事实源"变成"被自己改写的对象"。
  { name: "判据台 verify-source-shape", args: ["scripts/qa/verify-source-shape.mjs", "--dry"], timeoutMs: 180000 },
  { name: "证据语料 verify-evidence-corpus", args: ["scripts/qa/verify-evidence-corpus.mjs"], timeoutMs: 600000 },
  { name: "溯源全量 verify-provenance-all", args: ["scripts/qa/verify-provenance-all.mjs"], timeoutMs: 600000 },
  { name: "档位新鲜度 verify-band-freshness", args: ["scripts/qa/verify-band-freshness.mjs"], timeoutMs: 180000 },
  { name: "后端新鲜度 verify-backend-fresh", args: ["scripts/qa/verify-backend-fresh.mjs"], timeoutMs: 120000 },
  { name: "证据洞 verify-evidence-holes", args: ["scripts/qa/verify-evidence-holes.mjs"], timeoutMs: 180000 },
];

// ===== 看板（声明一次；report(item,"gates") 喂点，同名 key 后写覆盖 → 终验后展示的是最终状态）=====
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
interface Bill {
  gates: GateOut[];
  /** 后端 8080 是否 UP */
  backendUp: boolean;
  /** 在听自动化端口；空数组=DevTools 未开 */
  uiPorts: number[];
  /** 工作树脏文件数；-1=git 不可用 */
  dirty: number;
  branch: string;
  head: string;
}
interface SortItem {
  /** 缺口编号（台账行 ID 或门禁名+对象） */
  id: string;
  /** 收口车道域：实现刀/backend/复验/工具债 */
  area: string;
  /** 指定补法（来自终报/NOTES，照抄不改写） */
  how: string;
  /** 出处（报告 §节/文件:行） */
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
interface UiRow {
  id: string;
  status: string;
  reason: string;
}
interface UiLaneOut {
  lane: string;
  attempted: boolean;
  port: string;
  rows: UiRow[];
  filesChanged: string[];
  evidence: string[];
  notes: string;
}
interface CheckOut {
  ok: boolean;
  err: string;
  command: string;
}
interface LedgerOut {
  appliedPatches: number;
  ledgerPass: boolean;
  truthPass: boolean;
  filesChanged: string[];
  notes: string;
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
/**
 * ask 逐点兜底：门面 Node<T> 只 extends PromiseLike（没有 .catch），兜底一律
 * .then((v) => v, (e) => askFail<T>(…)) 双参形式；降级值按本站返回结构给全字段，必然写 blockers。
 */
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
/** 从命令输出里抽最后一行 *_RESULT=… 机器行（读法纪律：判成败看输出里的机器行，不是管道退出码幻觉） */
function resultLineOf(out: string): string {
  const lines = out.split(/\r?\n/).filter(l => /_RESULT\s*=/.test(l));
  const last = lines.length > 0 ? lines[lines.length - 1] : "(无机器行)";
  return last.slice(0, 200);
}
/** 单门禁执行：世界层拒绝（起不来/超时）按 exitCode=-1 记，不让一颗雷炸掉整组并行 */
async function runGate(g: { name: string; args: string[]; timeoutMs: number }): Promise<GateOut> {
  try {
    const r = await world.run(WORKFLOW.nodeBin, g.args, { timeoutMs: g.timeoutMs });
    const out = (r.stdout || "") + (r.stderr || "");
    return { name: g.name, exitCode: r.exitCode, resultLine: resultLineOf(out) };
  } catch (e) {
    return { name: g.name, exitCode: -1, resultLine: ("命令无法启动: " + String(e)).slice(0, 200) };
  }
}
function gateToBoard(g: GateOut): void {
  report({ gate: g.name, status: g.exitCode === 0 ? "PASS" : "RED", detail: g.resultLine }, "gates");
}
/** 账单落盘：看板只活在宿主会话里。上一程实测——宿主 actor 转 cold 后 reportPersisted=false，
 *  盘上只剩两条被门自己覆写的判决件，整份缺口账单无处可续。所以每阶段先落盘再推理。
 *  内容走 argv，绝不拼进脚本文本（避免引号/注入）。 */
async function persistJson(file: string, data: unknown): Promise<void> {
  try {
    await world.run(WORKFLOW.nodeBin, ["-e",
      "const f=require('fs'),p=require('path');f.mkdirSync(p.dirname(process.argv[1]),{recursive:true});f.writeFileSync(process.argv[1],process.argv[2]);",
      file, JSON.stringify(data, null, 1)], { timeoutMs: 20000 });
  } catch (e) {
    log("账单落盘失败（不改变门禁判定）：" + String(e).slice(0, 80));
  }
}

// ===== 守门员（构建链唯一合法通道）=====
const gatekeeper = agent("收口守门员", "你只负责运行指定命令并如实报告结果，绝不修改任何文件、绝不为通过而改跑别的命令。若命令不可能通过，如实 ok=false 并贴出现象，宁可红也不放水。");
async function runViaGatekeeper(purpose: string, command: string, timeoutMs: number): Promise<CheckOut> {
  const r = await gatekeeper.ask<CheckOut>(
    [
      `运行${purpose}并如实报告。用 Bash 执行这一行（PATH 前置 Node22，Windows Git Bash）：`,
      `export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" && ${command}`,
      `要求：等命令完整结束（Bash timeout 设 ${timeoutMs}）；ok = (退出码 === 0)；err = 失败时最后 50 行输出、成功时留空；command 回填实际执行的命令。`,
      `【诚实铁律】禁止伪造：跑不起来/超时/输出异常都如实 ok=false；禁止顺手修任何编译错误（修复不是你的职责）。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<CheckOut>("收口守门员", e, { ok: false, err: "守门员调用失败: " + String(e), command }));
  return { ok: r.ok === true, err: typeof r.err === "string" ? r.err : "", command: typeof r.command === "string" ? r.command : command };
}
/** UI 车道结果并入统一车道形状 */
function uiToLane(u: UiLaneOut): LaneOut {
  return {
    lane: "交互腿",
    fixedIds: (u.rows ?? []).filter(r => r.status === "EXECUTED" || r.status === "VERIFIED").map(r => r.id),
    filesChanged: u.filesChanged ?? [],
    skipped: (u.rows ?? []).filter(r => r.status !== "EXECUTED" && r.status !== "VERIFIED").map(r => ({ id: r.id, reason: r.status + ": " + r.reason })),
    evidence: u.evidence ?? [],
    notes: u.notes ?? "",
  };
}

// =====================================================================
phase("缺口账单");
// —— 十项只读门禁并行 + 环境/端口/工作树探针；产出本轮唯一事实源 ——
const gateOuts: GateOut[] = await Promise.all(GATE_SUITE.map(async (g) => {
  const out = await runGate(g);
  gateToBoard(out);
  log(`门禁 ${out.name}: exit=${out.exitCode} ${out.resultLine}`);
  return out;
}));
let backendUp = false;
try {
  const h = await world.run("curl", ["-s", "-m", "3", WORKFLOW.healthUrl], { timeoutMs: 10000 });
  backendUp = h.stdout.indexOf('"UP"') >= 0;
} catch {
  backendUp = false;
}
const PORT_PROBE = [
  "const net=require('net');const ports=[9420,9430,9431];let left=ports.length;const live=[];",
  "for(const p of ports){const s=net.connect({host:'127.0.0.1',port:p},()=>{live.push(p);s.destroy();done();});",
  "s.on('error',()=>{done();});s.setTimeout(1500,()=>{s.destroy();done();});}",
  "function done(){left--;if(left<=0)console.log('UI_PORTS_LIVE='+JSON.stringify(live));}",
].join("");
let uiPorts: number[] = [];
try {
  const pr = await world.run(WORKFLOW.nodeBin, ["-e", PORT_PROBE], { timeoutMs: 15000 });
  const m = pr.stdout.match(/UI_PORTS_LIVE=(\[[^\]]*\])/);
  if (m) uiPorts = JSON.parse(m[1]) as number[];
} catch (e) {
  log("端口探针失败（按无监听处置）：" + String(e).slice(0, 80));
}
const st = await gitTry(["status", "--porcelain"]);
const dirty = st.ok ? st.out.split(/\r?\n/).filter(l => l.trim() !== "").length : -1;
const head = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
const branch = (await gitTry(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() || "unknown";
const bill: Bill = { gates: gateOuts, backendUp, uiPorts, dirty, branch, head };
log(`账单就绪：红门 ${gateOuts.filter(g => g.exitCode !== 0).length}/${gateOuts.length}，后端${backendUp ? "UP" : "DOWN"}，自动化端口 [${uiPorts.join(",") || "无"}]，工作树脏 ${dirty}，HEAD=${head}`);
await persistJson("reports/audit/round-7/gapbill-v33.json", bill);

// =====================================================================
phase("分拣与拍板清单");
// —— 分拣员只分拣不执行：可执行项进车道，需拍板项原样交还用户 ——
const sorter = agent("缺口分拣员", "你是只读分拣员：读账单与终报，把缺口三分。绝不修改任何文件、绝不把「需拍板」项擅自划进可执行——本项目铁律是判据冲突/政策类事项交人决定。");
const sortRes = await sorter.ask<SortOut>(
  [
    `缺口账单（机器门禁实测，红门 exit≠0）：${JSON.stringify(bill)}`,
    `权威缺口清单在：${WORKFLOW.finalReport} 的 §3（需拍板）、§7.2 与 §9.8（仍明确缺着的）；过程事实按需检索 ${WORKFLOW.notes}（很长，别全量读）。`,
    `最新提交线索：HEAD=${head}（a4c8f995 说「两条落地对属裁定问题留红」；c126870e 说「收尾 47 步全跑完」）。`,
    `把仍开放的事项分成两类返回：`,
    `executable：现在就能由子代理收口的，每条 {id, area, how, source}。area 取值：实现刀（源码实现缺落地，如 nearby:659 顶值、circles 判据点、village 错误条/EmptyState、post-topic 提交中 loading）、backend（needs_backend 夹具，台账 :106 附近）、复验（已修复待复验行，先源码级判点后帧级）、工具债（#51/#67 一类载具缺陷）。`,
    `交互腿不进 executable：凡需 DevTools/真实档的行（含 register 页 .field__input 三条成因调查）留给编排层单独的交互腿车道，你在 notes 里点名即可。`,
    `needsUser：判据冲突/政策/数据去留/入库方式类（MESSAGES-004 判据 vs 裁定二选一、VILLAGE-PUBLISH-004 的 --r-lg、--c-text-inverse 令牌、测试数据清理、PNG 入库方式、两条落地对政策、MESSAGES-014、#51 身份适用范围等），每条 {id, why, options}，options 写清可选方向，不做任何倾向性改码。`,
    `【纪律】台账状态改动不归你；宁多列 needsUser 也不许把拍板项混进 executable；每条 executable 必须能指到报告/台账出处。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<SortOut>("缺口分拣员", e, { executable: [], needsUser: [], notes: "分拣员调用失败，本轮只能出账单不能收口" }));
/** 形状守卫（对齐 WF-RUNTIME-GAPS.md 对 v3.2 致命项 F2 的判词）：代理返回缺字段是常态，不是异常。
 *  实测本文件在分拣员返回 {} 时，整场在「分拣与拍板清单」phase 就 TypeError 死掉，
 *  终报、看板、artifact 全部不产——与上一程"跑一半整场消失"是同型风险。
 *  下游所有 .map / .length / for..of 一律走归一化后的数组，不再直接摸代理对象。 */
const executableRows = Array.isArray(sortRes.executable) ? sortRes.executable : [];
const needsUserRows = Array.isArray(sortRes.needsUser) ? sortRes.needsUser : [];
const uiNamed = typeof sortRes.notes === "string" && sortRes.notes.length > 0;
log(`分拣完成：可执行 ${executableRows.length} 项（非 UI），需拍板 ${needsUserRows.length} 项，交互腿线索 ${uiNamed ? "有" : "无"}`);

// =====================================================================
phase("并行收口各车道");
// —— 按域并行；每车道内部 修复→独立复验 链式；UI 交互腿单独一条串行车（9420 单写者）——
const areas = [...new Set(executableRows.map(i => (i && typeof i.area === "string" ? i.area : "")).filter(a => a !== ""))];
log(`车道划分：${areas.join("、") || "（无非 UI 可执行项）"} + 交互腿(UI 串行，无论分拣是否点名都会尝试)`);

const lanePromises = areas.map((area) => {
  const items = executableRows.filter(i => i && i.area === area);
  return (async (): Promise<LaneOut> => {
    const fixer = await agent(`收口车道-${area}`, "你按终报指定的补法实现修复：只动本车道事项涉及的源码/夹具/脚本，不碰台账（reports/audit/**/issue-matrix.md）、不做 git 提交、不跑别的车道的事。修完必须跑能变红的自测/判点验证，evidence 里给出 文件:行 级证据。若实现前提不成立（比如判据本身待拍板），如实写进 skipped 不硬修。").ask<LaneOut>(
      [
        `本车道要收口的缺口（照 how 的指定补法做）：${JSON.stringify(items)}`,
        `上下文出处：${WORKFLOW.finalReport}、${WORKFLOW.notes}（按需读）。`,
        `环境纪律：跑命令用 Bash 且 PATH 前置 Node22（export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH"）；类型检查验证可用 node D:/codex-tools/node-v22.17.0-win-x64/node_modules/corepack/dist/pnpm.js -C apps/client run typecheck。`,
        `返回 fixedIds / filesChanged（工作区相对路径）/ skipped（不修必须给 reason）/ evidence（文件:行 或 命令输出要点）/ notes。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>(`收口车道-${area}`, e, { lane: area, fixedIds: [], filesChanged: [], skipped: items.map(i => ({ id: i.id, reason: "车道调用失败，未处理" })), evidence: [], notes: "" }));
    // 链式复验：独立上下文的复验员，只认证据不认自报
    const toVerify = (fixer.fixedIds ?? []).filter(id => id !== "");
    if (toVerify.length === 0) return fixer;
    const verifier = await agent(`收口复验员-${area}`, "你是独立复验员：只认盘上证据（文件:行、命令输出、判点计数），不复述修复者的自报。每条要么给可复核的证实证据（放 fixedIds），要么如实进 skipped（reason 写「复验未通过: …」）。不修改任何文件。").ask<LaneOut>(
      [
        `逐条复验这些声称已收口的缺口：${JSON.stringify(toVerify)}；改动文件：${JSON.stringify(fixer.filesChanged ?? []).slice(0, 2000)}`,
        `验证方式优先级：仓库既有判点/自测工具（scripts/qa/ 下，PATH 前置 Node22）> 直接读源码锚点 > 重跑相关单测。fixedIds 只放你亲手证实的；skipped 放未通过的（reason 前缀「复验未通过:」）；evidence 给命令输出要点或 文件:行。`,
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

const uiLanePromise = (async (): Promise<UiLaneOut> => {
  const res = await agent("交互腿执行员", "你独占驱动微信开发者工具自动化（单写者）。先按锁协议取锁（tmp/qa/locks/ 下本工作流专用锁文件，字段 owner/pid/status/leaseUntil/lastHeartbeat；拿不到锁就如实 BLOCKED，禁止旋轮抢锁、禁止 kill 他人进程），再探端口。无监听时先试零点击冷启（2026-09-29 本机实测可通，不需要用户手动介入）：① 以 cli-automator 的子进程 argv 形态跑 check_wechatide_status，它会 auto-auth 并冷启 IDE 服务（9430 随之出现）；② 再用 Node22 跑 scripts/qa/ws-channel-up.mjs --wait 150 起 9420。注意 --wait 60 会给出误导性的 WS_UP=FAIL（端口约 18 秒已绑但没热完），必须读 reason 分辨形状。scripts/qa/cli-automator.mjs 主入口自己不取租约，裸调 shot/open/tap 必须由你显式包 acquireUi/releaseUi。两条冷启都试过仍起不来，才把全部行如实记 UNVERIFIED-TOOLING（带命令原文与报错原文），绝不伪造帧或判过。").ask<UiLaneOut>(
    [
      `本轮要做的事（两项）：`,
      `1) 交互行复测候选：分拣员线索「${(sortRes.notes ?? "").slice(0, 400)}」+ 台账/门禁里标记为交互腿欠复测的行（真实档交互动词、register 页 .field__input 三条 STATE_NOT_APPLIED 的成因调查——先查因再判）。从 ${WORKFLOW.finalReport} §7.2/§9.8 与 ${WORKFLOW.notes} 里把行号找全。`,
      `2) 只有在上面两条零点击冷启都留下失败原文之后，才允许记 UNVERIFIED-TOOLING；notes 里必须写清是哪一条命令、退出码与报错原文，不要笼统说"需用户手动开开发者工具"（实测本机冷启可通，那样说是假的）。`,
      `执行纪律：L0 软重置为主；单操作 30 秒超时跳过记 failure；证据预算分级（critical 前后帧、normal 后帧、navigation 仅路由断言）；结果行必须带 band 与 identity，混身份打 RUNNER_MIXED；禁止写库（真实档交互只读或按既有 guest-landing-policy 裁定判读）。`,
      `增量落盘是硬要求：车道 agent 有轮次上限（实测 150 轮会被截断），所以先把 result 骨架写盘，之后每完成一行立刻更新落盘；行数多时按每批不超过 15 行分块，绝不允许攒到最后一次写。`,
      `返回 rows（逐行 {id,status,reason}）、attempted、port、filesChanged（若查因后落了代码修复）、evidence（帧/日志路径）、notes。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<UiLaneOut>("交互腿执行员", e, { lane: "交互腿", attempted: false, port: "", rows: [], filesChanged: [], evidence: [], notes: "交互腿执行员调用失败，全部行按 UNVERIFIED-TOOLING 处置" }));
  for (const r of (res.rows ?? []).filter(x => x.status !== "EXECUTED" && x.status !== "VERIFIED")) {
    blockers.push(`交互腿: ${r.id}=${r.status}（${String(r.reason).slice(0, 80)}）`);
  }
  report({ lane: "交互腿", attempted: res.attempted === true, port: res.port ?? "", rows: (res.rows ?? []).length, unresolved: (res.rows ?? []).filter(x => x.status !== "EXECUTED" && x.status !== "VERIFIED").length });
  return res;
})();

const allLanes = await Promise.all([...lanePromises, uiLanePromise]);
const laneResults: LaneOut[] = [
  ...allLanes.slice(0, areas.length).map(r => r as LaneOut),
  uiToLane(allLanes[areas.length] as UiLaneOut),
];

// =====================================================================
phase("账本落账与对账");
// —— 唯一有台账写权的车道：先干跑核对、备份纪律、--apply 后必须回读 PASS ——
const ledgerman = await agent("账本员", "你是唯一有台账写权的角色：把车道复验结论落进权威台账（scripts/qa/patch-ledger-cells.mjs）。铁律：改前先 --dry 干跑核对单元格、确认 .pre-cellpatch 备份不覆盖同日更早备份、--apply 后回读 verify-ledger 必须 PASS；状态词只用台账词表内取值；绝不改历史轮次的行；顺带把本轮各车道产出与门禁复量的报告文件路径也列进 filesChanged。").ask<LedgerOut>(
  [
    `各车道复验结论（落账依据）：${JSON.stringify(laneResults).slice(0, 14000)}`,
    `台账：${WORKFLOW.ledgerDir}/issue-matrix.md（round-7 新条目也记在里面）。工具：node scripts/qa/patch-ledger-cells.mjs（先 --dry 核对，再 --apply；PATH 前置 Node22）。`,
    `落账后必跑并回贴机器行：node scripts/qa/verify-ledger.mjs ${WORKFLOW.ledgerDir} 与 node scripts/qa/verify-state-truth.mjs ${WORKFLOW.roundDir}。任一 FAIL 就如实返回 false 并说明，不要反复硬改。`,
    `返回 appliedPatches / ledgerPass / truthPass / filesChanged（台账与本轮报告文件）/ notes。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<LedgerOut>("账本员", e, { appliedPatches: 0, ledgerPass: false, truthPass: false, filesChanged: [], notes: "账本员调用失败，台账未动" }));
if (!ledgerman.ledgerPass) blockers.push(`台账门禁未过：verify-ledger FAIL（${(ledgerman.notes ?? "").slice(0, 120)}）`);
if (!ledgerman.truthPass) blockers.push("状态真值门禁未过：verify-state-truth FAIL");

// =====================================================================
phase("门禁终验与构建测试");
// —— 构建/typecheck/vitest 守门员（失败交修复工程师，最多 2 轮）；门禁套件复量对照账单 ——
// 同名 agent 在一次运行里只能创建一次，修复工程师提升为循环外单例复用（跨轮保留上下文）
const fixerAgent = agent("收口修复工程师", "你是小程序前端工程专家：按失败输出修复问题，只修真问题，禁止改测试断言来凑绿、禁止用 any 糊弄，修完自查。不碰台账、不提交。");
let buildOk = false;
let tcOk = false;
let testOk = false;
for (let round = 1; round <= 2; round++) {
  log(`构建/typecheck/vitest 第 ${round} 次守门员验证`);
  const b = await runViaGatekeeper("G1 mock 构建", `pnpm -C apps/client run ${WORKFLOW.buildScript}`, 1800000);
  buildOk = b.ok;
  if (b.ok) {
    const tc = await runViaGatekeeper("G2 typecheck", "pnpm -C apps/client run typecheck", 900000);
    tcOk = tc.ok;
    if (tc.ok) {
      const t = await runViaGatekeeper("G3 单测", "pnpm -C apps/client run test:unit", 1800000);
      testOk = t.ok;
      if (t.ok) break;
      blockers.push(`单测未过（第 ${round} 次）：${t.err.slice(-300)}`);
      await fixerAgent.ask(
        `单测失败尾部：\n${t.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run test:unit 通过，返回结论。`,
      ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
    } else {
      blockers.push(`typecheck 未过（第 ${round} 次）：${tc.err.slice(-300)}`);
      await fixerAgent.ask(
        `typecheck 失败尾部：\n${tc.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run typecheck 通过，返回结论。`,
      ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
    }
  } else {
    blockers.push(`构建未过（第 ${round} 次）：${b.err.slice(-300)}`);
    await fixerAgent.ask(
      `构建失败尾部：\n${b.err.slice(-2000)}\n请修复直到 pnpm -C apps/client run ${WORKFLOW.buildScript} 通过，返回退出码与结论。`,
    ).then((v) => v, (e) => askFail<string>("收口修复工程师", e, ""));
  }
}
log(`构建=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}`);
if (!buildOk) blockers.push("终验：构建 FAIL（守门员实测）");
if (!tcOk) blockers.push("终验：typecheck FAIL");
if (!testOk) blockers.push("终验：单测 FAIL");

// —— 门禁套件复量：与开账单对照 ——
const gateOuts2: GateOut[] = await Promise.all(GATE_SUITE.map(async (g) => {
  const out = await runGate(g);
  gateToBoard(out);
  return out;
}));
const before = new Map(gateOuts.map(g => [g.name, g.exitCode]));
const improved = gateOuts2.filter(g => (before.get(g.name) ?? -1) !== 0 && g.exitCode === 0).map(g => g.name);
const stillRed = gateOuts2.filter(g => g.exitCode !== 0).map(g => g.name);
log(`门禁复量：新转绿 ${improved.length} 项（${improved.join("、") || "无"}），仍红 ${stillRed.length} 项`);
for (const name of stillRed) {
  const g2 = gateOuts2.find(x => x.name === name);
  blockers.push(`终验门禁仍红：${name}（${g2 ? g2.resultLine : "?"}）`);
}

// —— 反 vacuous-green：复量出来的绿必须能变红，否则那条绿不算证据 ——
// 实测本机 4/4 RED-PROVEN（值域外 / 扫描集为空 / 缺计划清单 / 状态真值），变异只在临时副本上做。
const redProbe = await runGate({ name: "门禁可变红自检 prove-gates-can-fail", args: ["scripts/qa/prove-gates-can-fail.mjs"], timeoutMs: 300000 });
gateToBoard(redProbe);
log(`可变红自检：exit=${redProbe.exitCode} ${redProbe.resultLine}`);
if (redProbe.exitCode !== 0) blockers.push(`有门禁在变异后仍放行（VACUOUS）或案例证据不足（INCONCLUSIVE）：${redProbe.resultLine}`);
await persistJson("reports/audit/round-7/gate-recheck-v33.json", { gates: gateOuts2, improved, stillRed, redProbe });

// =====================================================================
phase("提交与总报告");
// —— 显式路径清单提交（只提本轮改到的文件；.zcode 机器区一律不提）——
let commit = "";
const addList = [...new Set([...laneResults.flatMap(l => l.filesChanged ?? []), ...(ledgerman.filesChanged ?? [])])].filter(f => f !== "" && !f.startsWith(".zcode"));
if (addList.length > 0) {
  const add = await gitTry(["add", ...addList]);
  if (add.spawned && add.ok) {
    const cm = await gitTry(["commit", "-m", WORKFLOW.commitMsg]);
    if (!cm.ok) {
      const res = await agent("Git 管家", "你负责在 git 提交失败时诊断并完成规定范围的提交，绝不提交范围外文件。").ask<{ commit: string }>(
        `git commit 失败，错误尾部：\n${cm.err.slice(-1500)}\n请检查状态后完成提交，信息：${WORKFLOW.commitMsg}。只允许这些路径：${addList.join("、")}。commit 返回 hash；无法提交时如实写原因。`,
      ).then((v) => v, (e) => askFail<{ commit: string }>("Git 管家", e, { commit: "" }));
      commit = res.commit ?? "";
    } else {
      commit = (await gitTry(["log", "-1", "--format=%h"])).out.trim();
    }
  } else {
    blockers.push("git add 失败，本轮改动未提交：" + add.err.slice(0, 120));
  }
} else {
  log("没有可提交的改动，跳过提交");
}

const verified: string[] = [
  "十项机器门禁两轮实测（开账单 + 终验复量），判读以退出码与 *_RESULT 机器行为准",
  "门禁可变红自检 prove-gates-can-fail：值域外/空扫描集/缺计划清单/状态真值 四类变异各自咬红，绿不是恒绿",
  "构建 build:mp-weixin:mock / typecheck / vitest 全量经收口守门员实测（PATH 前置 Node22）",
  `台账落账后回读 verify-ledger=${ledgerman.ledgerPass ? "PASS" : "FAIL"}、verify-state-truth=${ledgerman.truthPass ? "PASS" : "FAIL"}`,
  "每条收口都经独立复验员按盘上证据证实，不复述修复者自报",
];
const notCovered: string[] = [];
// 两条已核实的"绿不自证"范围，写进报告免得被读成全覆盖（数字与归因以 sizegate 车道产出为准）：
notCovered.push("verify-package-size 对 dev/mock 档体积走自我豁免分支仍 exit 0：构建绿≠体积合规，读数见 .zcode/tmp/lane-sizegate/findings.json");
notCovered.push("typecheck 不覆盖测试代码：apps/client/tsconfig.json 的 exclude 里有 src/tests/**/*（实测 117 个 spec 不在 vue-tsc 范围内）");
if (!backendUp) notCovered.push("后端 8080 不可达：真实档相关验证只能 BLOCKED");
if (uiPorts.length === 0) notCovered.push("DevTools 自动化端口无监听：UI 帧级复验受限，相关行如实 UNVERIFIED-TOOLING");
notCovered.push("需用户拍板事项（判据冲突/政策/数据去留）只列不做，见 findings 与总报告");

const findings: Finding[] = [];
for (const u of needsUserRows) {
  findings.push({ where: u?.id ?? "(缺 id)", what: "需用户拍板：" + (u?.why ?? "(分拣员未填 why)"), evidence: u?.options ?? "", status: "verified", severity: "medium" });
}
for (const b of blockers.slice(0, 40)) {
  findings.push({ where: "本轮 blockers", what: b, evidence: "见对应车道/门禁输出", status: "verified", severity: "medium" });
}

const md = [
  `# round-8 收官闭环总报告（v${WORKFLOW.version} 续作工作流）`,
  "",
  `- 起点：HEAD ${head}（branch ${branch}），工作树脏 ${dirty} 文件；后端${backendUp ? "UP" : "DOWN"}；自动化端口 [${uiPorts.join(", ") || "无"}]`,
  `- 收口车道：${laneResults.map(l => `${l.lane}（证实 ${(l.fixedIds ?? []).length} / 未收 ${(l.skipped ?? []).length}）`).join("、") || "无"}`,
  // appliedPatches 用 typeof 而不是 ||0：合法的 0 不能被 or 表达式抹成别的数
  `- 台账：落账 ${typeof ledgerman.appliedPatches === "number" ? ledgerman.appliedPatches : 0} 处补丁，verify-ledger=${ledgerman.ledgerPass ? "PASS" : "FAIL"}，verify-state-truth=${ledgerman.truthPass ? "PASS" : "FAIL"}`,
  `- 构建/类型/单测：${buildOk ? "PASS" : "FAIL"} / ${tcOk ? "PASS" : "FAIL"} / ${testOk ? "PASS" : "FAIL"}`,
  `- 门禁复量：新转绿 ${improved.length}（${improved.join("、") || "无"}）；仍红 ${stillRed.length}（${stillRed.join("、") || "无"}）`,
  `- 提交：${commit === "" ? "（无可提交改动或提交失败，见 blockers）" : commit}`,
  "",
  "## 需你拍板（未替你决定）",
  ...(needsUserRows.length > 0 ? needsUserRows.map(u => `- ${u?.id ?? "(缺 id)"}：${u?.why ?? "(未填)"}（可选：${u?.options ?? "(未填)"}）`) : ["- （无）"]),
  "",
  "## 仍未收口（每条带原因）",
  ...(blockers.length > 0 ? blockers.map(b => `- ${b}`) : ["- （无）"]),
].join("\n");
try {
  await artifact.markdown("final", md, { title: "round-8 收官闭环总报告", description: "缺口账单→并行收口→门禁终验的结果与需拍板清单", primary: true });
} catch (e) {
  log("总报告 artifact 发布失败：" + String(e).slice(0, 120));
}

return {
  conclusion: `收官续作完成：${executableRows.length} 项可执行缺口分 ${areas.length + 1} 车道并行收口，证实 ${laneResults.reduce((n, l) => n + (l.fixedIds?.length ?? 0), 0)} 条；构建/类型/单测 ${buildOk && tcOk && testOk ? "全绿" : "存在红项"}；门禁新转绿 ${improved.length}、仍红 ${stillRed.length}；需你拍板 ${needsUserRows.length} 项已原样列出，未替你决定。`,
  findings,
  verified,
  notCovered,
};
