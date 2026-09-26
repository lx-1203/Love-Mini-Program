/**
 * 队列对账门禁（v3.2 [C-3] 的机检载体）。
 *
 * 为什么单独成脚本：定义里写着"轮末必须断言 已记录用例数 == 各 Manifest cases[] 总数，
 * 不等即为 BLOCKER"，但那句话只是给模型看的自然语言。实测教训：R2 计划 1107 例、
 * 实际记录 941 例，村口三套整套未跑，而启动行只印 suites=24(dynamic)，两次被读成"快跑完了"。
 * 只读，不写任何文件。
 *
 * 用法：node scripts/verify-queue-reconcile.mjs <roundDir> [--results <exec-results.json>] [--ckpt <checkpoint.json>]
 *   roundDir 例：reports/audit/round-2
 *
 * 键轴契约（v3.2 接线修复，2026-09-25 实测）：计划侧套件键 = ops/<MANIFEST>.json 的文件名，
 * 记录侧对账键 = 权威件每行的 manifest 字段（同一个名字）。执行器的 suite 字段是**派生规划器 id**
 * （P-<manifest>-<两位序号>），只用于 console-<suite>.log 与检查点续跑，绝不参与对账；
 * 两轴一旦零交集，本工具直接 QUEUE_RESULT=FAIL reason=套件键不匹配，不再把它伪装成"还有缺口没跑完"。
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const argv = process.argv.slice(2);
const pos = argv.find((a) => !a.startsWith("--"));
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
if (!pos || !existsSync(pos)) {
  console.log("QUEUE_RESULT=FAIL reason=用法：node scripts/verify-queue-reconcile.mjs <roundDir>");
  process.exit(1);
}
const roundDir = resolve(pos);
const opsDir = join(roundDir, "ops");
if (!existsSync(opsDir)) {
  console.log(`QUEUE_RESULT=FAIL reason=找不到计划清单目录 ${opsDir}`);
  process.exit(1);
}

// 计划侧：每个 ops/*.json 的 cases[] 计数
const planned = new Map();
let plannedTotal = 0, plannedBad = [];
// requiresReal 普查：这条计数存在的理由是"mock 轮不得把需要真后端的断言记成 PASS/FAIL"这条规则
// 此前只在提示词里，manifest 里字段命中 0（实测 51 份 ops 全缺）——没有生产者侧字段，规则在源头
// 就落不了地。现在把它变成退出码：只要还有用例没打这个标记，本轮就没有资格宣称"NOT-EVIDENCED 已正确处置"。
let rrTrue = 0, rrFalse = 0, rrUnlabeled = 0, rrSuitesWithMark = 0;
for (const f of readdirSync(opsDir).filter((f) => f.endsWith(".json"))) {
  const suite = basename(f, ".json");
  try {
    const j = JSON.parse(readFileSync(join(opsDir, f), "utf8"));
    const n = (j.cases ?? []).length;
    if (!Array.isArray(j.cases)) { plannedBad.push(`${suite}: 无 cases[] 数组`); continue; }
    planned.set(suite, n);
    plannedTotal += n;
    let suiteMarked = 0;
    for (const c of j.cases) {
      if (c.requiresReal === true) { rrTrue++; suiteMarked++; }
      else if (c.requiresReal === false) { rrFalse++; suiteMarked++; }
      else rrUnlabeled++;
    }
    // REAL_ONLY 是历史写法（字符串里带标记），单列一计数，便于和 192 条可信下界对齐
    if (suiteMarked > 0) rrSuitesWithMark++;
  } catch (e) {
    plannedBad.push(`${suite}: JSON 解析失败 ${String(e.message).slice(0, 60)}`);
  }
}
const realOnlyText = [];
for (const f of readdirSync(opsDir).filter((f) => f.endsWith(".json"))) {
  try {
    const j = JSON.parse(readFileSync(join(opsDir, f), "utf8"));
    for (const c of j.cases ?? []) if (/REAL_ONLY/.test(JSON.stringify(c))) realOnlyText.push(`${basename(f, ".json")}/${c.id}`);
  } catch { /* 已在 plannedBad 里记过 */ }
}

// 记录侧。
// 【对账主键轴 = manifest 名，不是 r.suite】为什么：planned 侧的套件键来自 ops/<MANIFEST>.json
// 的文件名，而执行器 r-exec.cjs 的 suite 字段写的是**派生规划器 id**（形如 P-PAGES-REGISTER-SUCCESS-01、
// P-次要20-02，见 planSuitesFromOps 的 id = 'P-' + name + '-' + seq）。两轴永不相交，实测后果是
// round-6 记录 33 例却报 RECORDED_SUITES=2 / NEVER_RAN=24 套 / NEVER_RAN_CASES=1107 / GAP=1074——
// 就算 1107 例全跑完也永远红，门禁等于没有。派生规划本身是必需的（旧硬编码表只能排 669/1107、
// 引用 5 个 ops 里不存在的 manifest、漏掉 次要18/19 共 157 例），所以只能在记录侧认领 manifest 轴。
// 为什么不反过来把 suite 改成 manifest 名：suite 同时是 console-<suite>.log 的文件名与检查点
// ckpt.suites[<suite>] 的续跑键（r-exec.cjs 1744 / 1742 行），改它等于同时改证据文件名与断点语义，
// 改动面更大且会把已落盘的 2 个 console 件与 exec-R6.json 变成孤儿。manifest 字段执行器每条路径
// 都写了（runCase 的 ...key、SKIPPED、case-error），历史轮 round-1/2 也 100% 有，故无需改执行器语义。
const resultsPath = flag("results") || join(roundDir, "interact", "exec-results.json");
const recorded = new Map(); // 对账轴：manifest -> 行数
const recordedByPlanSuite = new Map(); // 诊断轴：r.suite（规划器 id）-> 行数
const idsBySuite = [];
const compositeKeys = [];
let recordedTotal = 0, errTainted = 0, rowsWithoutManifest = 0;
const keyFieldOf = new Map(); // 对账键 -> 它是从哪个字段拿到的（manifest | suite-fallback）
if (existsSync(resultsPath)) {
  const j = JSON.parse(readFileSync(resultsPath, "utf8"));
  for (const r of j.results ?? []) {
    const mf = typeof r.manifest === "string" && r.manifest.trim() ? r.manifest.trim() : null;
    const key = mf || r.suite; // 旧件没有 manifest 字段时退回 suite 轴（round-1/2 的 suite 就是 manifest 名）
    if (!mf) rowsWithoutManifest++;
    recorded.set(key, (recorded.get(key) ?? 0) + 1);
    if (!keyFieldOf.has(key)) keyFieldOf.set(key, mf ? "manifest" : "suite-fallback");
    recordedByPlanSuite.set(r.suite, (recordedByPlanSuite.get(r.suite) ?? 0) + 1);
    idsBySuite.push({ suite: r.suite, id: r.id });
    compositeKeys.push(`${key}/${r.id}`);
    recordedTotal++;
    if ((r.evidence ?? []).some((e) => typeof e === "string" && /ERROR:|timeout/i.test(e))) errTainted++;
  }
} else {
  console.log(`QUEUE_NOTE=结果文件缺失 ${resultsPath}（按 0 条记录对账）`);
}

const neverRan = [...planned.keys()].filter((s) => !recorded.has(s));
const extra = [...recorded.keys()].filter((s) => !planned.has(s));
const gap = plannedTotal - recordedTotal;
const missingCases = neverRan.reduce((s, k) => s + planned.get(k), 0);

// 跨 suite 复用同一 id：按 id 去重会低估（round-2 实测 941 行只有 911 个唯一 id）
const byId = new Map();
for (const x of idsBySuite) byId.set(x.id, (byId.get(x.id) ?? 0) + 1);
const dupIds = [...byId.entries()].filter(([, n]) => n > 1);
const uniqIds = byId.size;
// 主键纪律：权威行必须能表达 manifest + "/" + caseId。裸 id 跨套会撞，所以另数一个复合键口径；
// 复合键出现重复组 = 同一用例被记了两行（多为一个 manifest 被派生表切开后又被两个 Suite 重复认领）。
const byKey = new Map();
for (const k of compositeKeys) byKey.set(k, (byKey.get(k) ?? 0) + 1);
const dupKeys = [...byKey.entries()].filter(([, n]) => n > 1);

// ===== 键轴自检：这次的坑必须由工具自己抓出来，而不是靠人读日志 =====
const matchedOnAxis = [...recorded.keys()].filter((k) => planned.has(k)).length;
// (1) 硬失败：有记录、却与计划侧一个键都对不上 → 两侧根本不同轴。
//     这正是 round-6 的现场（recorded 2 套 / planned 24 套 / 交集 0），此前它表现为"缺口很大"，
//     读起来像"还没跑完"，于是白等了 80 分钟。扫描集为空一律不得判绿。
const keyAxisBroken = recordedTotal > 0 && recorded.size > 0 && matchedOnAxis === 0;
// (2) 规划器 id 轴与计划侧零交集是**设计使然**（P-<manifest>-<seq> 天然不等于 manifest 名），
//     只在 (1) 也成立时才是事故；否则降为 NOTE，避免把"派生表生效"误报成键不匹配。
const planSuiteAxisIntersect = [...recordedByPlanSuite.keys()].filter((k) => planned.has(k)).length;
const sampleRecordedKey = [...recorded.keys()][0] ?? "(无)";
const sampleRawSuite = [...recordedByPlanSuite.keys()][0] ?? "(无)";

const realOnlySuites = new Set(realOnlyText.map((s) => s.split("/")[0]));
console.log(`QUEUE_PLANNED_SUITES=${planned.size} QUEUE_PLANNED_CASES=${plannedTotal}`);
console.log(`QUEUE_RECORDED_SUITES=${recorded.size} QUEUE_RECORDED_CASES=${recordedTotal} UNIQUE_IDS=${uniqIds}`);
// QUEUE_RECORDED_SUITES 与 QUEUE_RECORDED_BY_MANIFEST 现在同为 manifest 轴口径，故数值相同：
// 前者是对账轴计数（老字段名，编排层在读，不能改名），后者把"这个数到底是按什么键数出来的"
// 写进字段名本身，免得下一轮换轴时又只能靠人翻代码。规划器 id 轴单独打印，不参与对账。
console.log(`QUEUE_RECORDED_BY_MANIFEST=${recorded.size} QUEUE_RECORDED_PLAN_SUITES=${recordedByPlanSuite.size} QUEUE_ROWS_WITHOUT_MANIFEST=${rowsWithoutManifest}`);
console.log(`QUEUE_KEY_AXIS=${recordedTotal ? [...new Set(keyFieldOf.values())].join("+") : "none"} QUEUE_KEY_AXIS_MATCHED=${matchedOnAxis}/${recorded.size} QUEUE_PLAN_AXIS_MATCHED=${planSuiteAxisIntersect}/${recordedByPlanSuite.size}`);
console.log(`QUEUE_UNIQUE_KEYS=${byKey.size} QUEUE_DUP_KEY_GROUPS=${dupKeys.length}`);
// 这三个字段历史上印成了没有 QUEUE_ 前缀的 NEVER_RAN_SUITES / NEVER_RAN_CASES / UNPLANNED_SUITES，
// 而编排层 queueReconcileGate（miniprogram-qa-loop-v32.dwf.ts:980 契约 + :1317 grab 解析）
// 找的是 QUEUE_NEVER_RAN_SUITES= / QUEUE_UNPLANNED_SUITES=，实测两个数长期被抓成 "(未输出)"
// ——G6 的"从未开跑几套/未计划几套"从来没进过 blockers。补齐前缀即两边都读得到：
// 仍按裸名 indexOf 的读者会在 QUEUE_ 前缀串里命中同一个 token，取到同一个数，不会断。
console.log(`QUEUE_GAP=${gap} QUEUE_NEVER_RAN_SUITES=${neverRan.length} QUEUE_NEVER_RAN_CASES=${missingCases} QUEUE_UNPLANNED_SUITES=${extra.length}`);
console.log(`QUEUE_DUP_ID_GROUPS=${dupIds.length} QUEUE_ERR_TAINTED_CASES=${errTainted}`);
console.log(`QUEUE_REQUIRES_REAL_TRUE=${rrTrue} QUEUE_REQUIRES_REAL_FALSE=${rrFalse} QUEUE_REQUIRES_REAL_UNLABELED=${rrUnlabeled} SUITES_WITH_MARK=${rrSuitesWithMark}`);
console.log(`QUEUE_REAL_ONLY_MARKED=${realOnlyText.length} QUEUE_REAL_ONLY_SUITES=${realOnlySuites.size}`);
neverRan.slice(0, 10).forEach((s) => console.log(`QUEUE_NEVER_RAN ${s} (${planned.get(s)} 例)`));
extra.slice(0, 10).forEach((s) => console.log(`QUEUE_UNPLANNED ${s} (${recorded.get(s)} 例)`));
dupIds.slice(0, 5).forEach(([id, n]) => console.log(`QUEUE_DUP_ID ${id} 出现 ${n} 次`));
dupKeys.slice(0, 5).forEach(([k, n]) => console.log(`QUEUE_DUP_KEY ${k} 出现 ${n} 次（manifest+caseId 复合主键撞了：同一用例被记成多行）`));
if (rowsWithoutManifest > 0) console.log(`QUEUE_NOTE=${rowsWithoutManifest} 行缺 manifest 字段，已退回 suite 字段对账；若执行器改了记录键，这里就是断点`);
if (keyAxisBroken) {
  console.log(`QUEUE_RESULT=FAIL reason=套件键不匹配（recorded 用的是 ${sampleRecordedKey}，planned 用的是 manifest 名）`);
  console.log(`QUEUE_KEY_AXIS_HINT=recorded 侧取自 ${keyFieldOf.get(sampleRecordedKey)} 字段；规划器 id 轴样本=${sampleRawSuite}（与计划侧交集 ${planSuiteAxisIntersect}）。缺口不是"还没跑完"，而是两侧根本不在同一个键轴上，跑满也永远判不出来。`);
}
plannedBad.slice(0, 5).forEach((l) => console.log(`QUEUE_BAD_MANIFEST ${l}`));

// --allow-unlabeled 只为"审计历史轮"保留：老 manifest 本来就没这个字段，拿今天的尺子量它
// 会把两件不同的事混成一条 FAIL。新轮必须不带这个旗标。
const allowUnlabeled = process.argv.includes("--allow-unlabeled");
const labelFail = !allowUnlabeled && (rrUnlabeled > 0 || rrTrue === 0);
if (labelFail) {
  console.log(`QUEUE_UNLABELED_CASES=${rrUnlabeled} —— 用例未打 requiresReal，"mock 轮不得把写库断言记成 PASS/FAIL"这条规则在源头不可核（真后端需求命中 ${rrTrue} 条）`);
}
if (allowUnlabeled && rrUnlabeled > 0) console.log(`QUEUE_NOTE=--allow-unlabeled 生效，${rrUnlabeled} 条未打标用例不计入退出码（审计历史轮用，新轮禁用）`);
const fail = gap !== 0 || neverRan.length > 0 || plannedBad.length > 0 || labelFail || keyAxisBroken || dupKeys.length > 0;
if (dupKeys.length && !keyAxisBroken) console.log(`QUEUE_RESULT=FAIL reason=${dupKeys.length} 组 manifest+caseId 复合主键重复，权威行无法唯一定位用例`);
console.log(fail ? "QUEUE_RESULT=FAIL（存在未跑套件、缺口、未打标用例或键轴失灵，禁止静默收尾）" : "QUEUE_RESULT=PASS");
process.exit(fail ? 1 : 0);
