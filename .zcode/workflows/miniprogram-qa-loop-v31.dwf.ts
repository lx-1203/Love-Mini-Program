/* zcode-workflow
description: v3.1 完整执行协议：7 Actor（6 推理 + A1 UI Driver 独占 9420）。轮次结构化：R1 全量基线 →
  R2+ 影响范围回归（Impact Graph）→ 终验全量独立审计。Evidence Bus 六路并行复核（代码/视觉/需求/历史回归/交互判定）；A1
  按 Suite+Checkpoint 分段执行固定结构用例（证据预算分级采集）；UI Lock
  状态机（LEASED/STALE，不旋轮重试）；三级重置；Gate 快速失败（G1/G2 FAIL 禁新 UI
  会话）；观察证据制（不强制每页凑缺陷）；Finding 四层标准化（severity/status/confidence/sources）；证据缓存绑定
  Git SHA；A5 历史回归走 regression-index 机器差分；修复分级回归（P0/P1 立即定向、P2 批量、P3 终验）。
whenToUse: 需要对本微信小程序（apps/client）做全量 QA
  闭环（截图取证→操作验证→六路审查→修复→影响范围回归→独立终验）时运行；改版后回归或发布前验收皆可。
args: {}
*/
// =====================================================================
// 微信小程序 QA 闭环工作流 v3.1 —— 完整执行协议
// 6 推理 Agent（A0 编排/A2 代码/A3 视觉/A4 需求/A5 历史回归/A6 交互判定）
// + 1 UI Driver（A1，唯一可驱动 ws://127.0.0.1:9420）
// 核心：Evidence Bus 四路并行 ∙ A1 Suite/Checkpoint ∙ 三级重置 ∙ UI Lock 状态机
// ∙ Impact Graph 影响范围回归 ∙ 回归索引机器差分 ∙ 证据预算 ∙ 观察证据制
// ∙ Finding 四层标准化 ∙ 证据缓存绑定 Git SHA+构建指纹 ∙ Gate 快速失败
// 依据：《微信小程序无限 Token 全面审查总控提示词》+ R11 验收方案 + v3.1 升级协议
// =====================================================================

// ===== 执行协议配置（修订只改这里；数值不进提示词，避免修订破坏缓存）=====
const WORKFLOW = {
  version: "3.1",
  ui: {
    endpoint: "ws://127.0.0.1:9420",
    maxConcurrent: 1,          // 9420 单写者
    leaseMinutes: 15,
    heartbeatSeconds: 5,
    staleAfterSeconds: 30,
    graceSeconds: 30,
    maxReLaunchPerSuite: 1,    // L2 reLaunch 每 Suite 至多 1 次
  },
  audit: {
    baselineRound: 1,          // R1 = 全量基线审查
    maxFixRounds: 3,           // R2+ = 影响范围回归轮（最多 3 轮）
    maxFinalAuditTries: 4,     // 最终独立全量审计最多尝试次数
    requireObservationPerPage: true,   // 每页必须有观察证据
    requireFindingPerPage: false,      // 不强制每页凑缺陷
  },
  severityPolicy: {
    P0: "immediate-regression",  // 修复后立即定向回归
    P1: "immediate-regression",
    P2: "batch-regression",      // 本轮批量复验
    P3: "final-regression",      // 仅最终回归验证
  },
  evidence: {
    critical: "before-after",  // 关键操作：前后截图
    normal: "after",           // 普通操作：仅后截图
    navigation: "route-only",  // 纯导航：路由证据
    noop: "log-only",          // 无效果操作：仅日志
  },
  cache: {
    requireGitShaMatch: true,      // 证据复用必须 Git SHA 一致
    requireBuildFingerprintMatch: true,
  },
  regression: {
    useImpactGraph: true,              // 修复只回归受影响区域
    fullRegressionOnlyOnFinalAudit: true,
  },
  boardLimit: 120,
};

// ===== 数据结构 =====
interface PageEntry {
  /** 页面路由，如 pages/home/index */
  route: string;
  /** 页面中文名 */
  name: string;
  /** 是否核心页面（tabBar 与主链路页面） */
  core: boolean;
}
interface Recon {
  /** 小程序源码根（pages.json 所在目录） */
  srcRoot: string;
  /** 编译产物根（project.config.json 的 miniprogramRoot） */
  distRoot: string;
  pages: PageEntry[];
  /** 既有截图取证方案说明：工具脚本、开发者工具路径、登录/双身份做法 */
  captureHow: string;
  /** 理想图/设计稿目录（若找到） */
  idealDirs: string[];
  notes: string;
}
interface HistoricalIssue {
  /** 历史编号（尽量沿用原报告 ID） */
  id: string;
  page: string;
  desc: string;
  severity: string;
  /** 来源报告文件路径 */
  source: string;
}
interface IdealRef {
  /** 页面路由，"*" 表示全局 */
  page: string;
  /** 理想图/设计稿/规范文件路径 */
  path: string;
  notes: string;
}
interface History {
  historicalIssues: HistoricalIssue[];
  /** 回归高风险区 */
  highRiskAreas: string[];
  idealRefs: IdealRef[];
  /** 历史问题清单落盘路径 */
  listFile: string;
  summary: string;
}
interface RegIndexEntry {
  /** 历史/已修问题编号 */
  id: string;
  page: string;
  /** 相关组件 */
  components: string[];
  /** 风险文件（改动这些文件必须回归该条） */
  riskFiles: string[];
  /** 验证点（页面/交互用例名） */
  verification: string[];
  severity: string;
}
interface Shot {
  /** 页面路由 */
  page: string;
  /** 截图文件路径（工作区相对） */
  path: string;
  /** 状态：默认/滚动后/交互后/空态/弹窗态等 */
  state: string;
}
interface ShotBatch {
  shots: Shot[];
  /** 成功截取的页面数 */
  pagesCovered: number;
  /** 截不到的页面与原因（如实记录，不得隐瞒） */
  failures: { page: string; reason: string }[];
  /** 本轮巡检脚本路径 */
  scriptPath: string;
  /** 证据清单落盘路径（manifest，含 gitSha/构建指纹/截图清单；审查前必须校验） */
  manifestFile: string;
  notes: string;
}
/** 证据预算分级：critical=前后截图 normal=后截图 navigation=仅路由 noop=仅日志 */
type EvidenceTier = "critical" | "normal" | "navigation" | "noop";
interface TestCase {
  /** 固定用例号，如 N01 */
  id: string;
  page: string;
  title: string;
  tier: EvidenceTier;
  /** 前置状态/进入方式 */
  pre: string;
  /** 动作（选择器/坐标/输入） */
  action: string;
  /** 预期反应 */
  expected: string;
  /** 证据采集要求（按 tier） */
  evidence: string;
}
interface OpsPrep {
  /** 用例清单落盘路径（本 Suite 批次的 Test Manifest） */
  file: string;
  /** 用例数 */
  cases: number;
  notes: string;
}
interface ExecFailure {
  page: string;
  caseId: string;
  reason: string;
}
interface ExecResult {
  /** 执行结果落盘路径（逐用例：id/page/tier/observed/route/toast/console/evidence/status） */
  resultsFile: string;
  /** 操作前后截图目录 */
  shotDir: string;
  /** 已执行用例数 */
  executed: number;
  /** 失败/跳过用例与原因 */
  failures: ExecFailure[];
  /** 执行器脚本路径 */
  scriptPath: string;
  /** Suite 划分与检查点文件路径（tmp/qa/checkpoints/*.json） */
  checkpoints: string[];
  notes: string;
}
interface OpCheck {
  /** 用例号 */
  caseId: string;
  page: string;
  /** 操作名 */
  operation: string;
  /** 预期反应（来自 Manifest） */
  expected: string;
  /** 实际观察（来自 A1 证据） */
  actual: string;
  /** VERIFIED / FAILED / UNVERIFIED */
  verdict: string;
  /** 证据文件（截图/traces） */
  evidence: string[];
  /** 证据支持强度 0~1 */
  confidence: number;
}
interface JudgeBatch {
  checks: OpCheck[];
  issues: Issue[];
  findingsFile: string;
  unverifiable: string[];
  notes: string;
}
interface FunctionGap {
  target: string;
  current: string;
  gap: string;
  fix: string;
}
interface PageCompare {
  route: string;
  baseline: string;
  structureNotes: string;
  usageNotes: string;
  functionGaps: FunctionGap[];
  verdict: string;
  file: string;
}
interface Issue {
  /** 唯一编号 MP-轮次-页面-序号 */
  id: string;
  round: string;
  page: string;
  screenshot: string;
  /** UI / UX / MiniProgram / Data / Consistency / Function / Interaction / Architecture / Regression / Performance */
  category: string;
  /** P0/P1/P2/P3/P4 */
  severity: string;
  description: string;
  /** 证据：截图/代码行号/与理想图差异 */
  evidence: string;
  /** 证据来源：screenshot/interaction/code/log 的组合 */
  sources: string[];
  /** 证据支持强度 0~1（不是主观把握，是证据支持强度） */
  confidence: number;
  ideal: string;
  fix: string;
  /** 待修复 / 已修复 / 已修复待终验 / 已验证 / 保留 */
  status: string;
}
interface CodeBatch {
  issues: Issue[];
  findingsFile: string;
  coverage: string[];
}
interface CodeSweep {
  issues: Issue[];
  findingFiles: string[];
  coverage: string[];
}
interface VisualBatch {
  issues: Issue[];
  findingsFile: string;
  /** 逐页观察证据（每页至少一条；无缺陷时 observation 即为产出） */
  observations: { page: string; observation: string; evidence: string }[];
  coverage: string[];
}
interface VisualSweep {
  issues: Issue[];
  findingFiles: string[];
  observations: VisualBatch["observations"];
  coverage: string[];
}
interface ReqBatch {
  issues: Issue[];
  pageCompares: PageCompare[];
  findingsFile: string;
}
interface ReqSweep {
  issues: Issue[];
  pageCompares: PageCompare[];
  findingFiles: string[];
}
interface RegBatch {
  issues: Issue[];
  checked: { id: string; page: string; status: string; evidence: string }[];
  findingsFile: string;
}
interface RegSweep {
  issues: Issue[];
  checked: RegBatch["checked"];
  findingFiles: string[];
}
interface JudgeSweep {
  checks: OpCheck[];
  issues: Issue[];
  findingFiles: string[];
  unverifiable: string[];
}
interface FixResult {
  fixedIds: string[];
  skipped: { id: string; reason: string; decision: string }[];
  filesChanged: string[];
  notes: string;
}
interface VerifyResult {
  verifiedIds: string[];
  failed: { id: string; reason: string }[];
  newIssues: Issue[];
  interactionRecheck: { id: string; operation: string; verdict: string; after: string }[];
  beforeAfter: { id: string; before: string; after: string }[];
  /** 影响范围：本次实际回归覆盖的页面与用例（由改动文件经影响图推导） */
  impactCovered: string[];
  notes: string;
}
interface ScribeResult {
  written: string[];
  notes: string;
}
interface CommitResult {
  commit: string;
}
interface FinalReport {
  reportPath: string;
  chains: { chain: string; result: string; evidence: string }[];
  /** 六道 Gate：PASS/FAIL/BLOCKED + 证据 */
  gates: { gate: string; result: string; evidence: string }[];
  blockers: string[];
  screenshotDir: string;
  notes: string;
}
interface Finding {
  where: string;
  what: string;
  evidence: string;
  status: "verified" | "unconfirmed";
  severity: "high" | "medium" | "low";
}
interface WorkflowReport {
  conclusion: string;
  findings: Finding[];
  verified: string[];
  notCovered: string[];
}

// ===== 看板 =====
artifact.board("issues", {
  title: "审计问题看板",
  description: "P0–P2 问题实时状态；P3/P4 与全量明细见各轮报告文件",
  key: "id",
  status: "status",
  columns: ["待修复", "已修复", "已修复待终验", "已验证", "保留"],
  detail: [
    { field: "severity", label: "级别" },
    { field: "page", label: "页面" },
    { field: "category", label: "类别" },
    { field: "round", label: "轮次" },
    { field: "description", label: "问题" },
    { field: "confidence", label: "置信" },
  ],
});

// ===== 跨轮次共享状态 =====
const allIssues: Issue[] = [];
const issueIds = new Set<string>();
const fixerFiles = new Set<string>();
const blockers: string[] = [];
const captureFailures: string[] = [];
const interactUnverifiable: string[] = [];
let boardTagged = 0;
let totalShots = 0;
let totalCases = 0;
let casesVerified = 0;
let casesFailed = 0;
let lastCompares: PageCompare[] = [];

// ===== 工具 =====
function normSev(raw: string): string {
  const v = (raw ?? "").toUpperCase();
  if (v.startsWith("P0")) return "P0";
  if (v.startsWith("P1")) return "P1";
  if (v.startsWith("P2")) return "P2";
  if (v.startsWith("P3")) return "P3";
  if (v.startsWith("P4")) return "P4";
  return "P3";
}
function slug(route: string): string {
  return route.replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase();
}
function cnt(list: Issue[], sev: string): number {
  return list.filter(i => i.severity === sev).length;
}
function findIssue(id: string): Issue | undefined {
  return allIssues.find(i => i.id === id);
}
function normConf(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}
function normalizeIssue(it: Issue, seen: Set<string>, prefix: string): Issue {
  let id = (it.id ?? "").trim();
  if (id === "" || seen.has(id)) {
    let n = 1;
    let cand = prefix + "-" + n;
    while (seen.has(cand)) {
      n += 1;
      cand = prefix + "-" + n;
    }
    id = cand;
  }
  it.id = id;
  it.severity = normSev(it.severity);
  const st = (it.status ?? "").trim();
  it.status = ["待修复", "已修复", "已修复待终验", "已验证", "保留"].includes(st) ? st : "待修复";
  it.category = (it.category ?? "").trim() === "" ? "UI" : it.category;
  it.round = (it.round ?? "").trim() === "" ? prefix : it.round;
  it.sources = Array.isArray(it.sources) ? it.sources : [];
  it.confidence = normConf(it.confidence);
  seen.add(id);
  return it;
}
function admit(list: Issue[], seen: Set<string>, prefix: string): Issue[] {
  const out: Issue[] = [];
  for (const it of list ?? []) {
    if (!it) continue;
    out.push(normalizeIssue(it, seen, prefix));
  }
  return out;
}
function pushBoard(it: Issue): void {
  if (it.severity !== "P0" && it.severity !== "P1" && it.severity !== "P2") return;
  if (boardTagged >= WORKFLOW.boardLimit) return;
  boardTagged += 1;
  report(it, "issues");
}
function chunkKeyFor(chunk: PageEntry[], idx: number): string {
  return chunk.length === 1 && chunk[0].core ? slug(chunk[0].route) : "次要" + idx;
}
function histForPages(pages: PageEntry[], hist: History): HistoricalIssue[] {
  return hist.historicalIssues.filter(h => {
    const pg = (h.page ?? "").trim();
    if (pg === "") return false;
    return pages.some(p => pg.includes(p.route) || p.route.includes(pg));
  });
}
function idealForPages(pages: PageEntry[], hist: History): IdealRef[] {
  return hist.idealRefs.filter(r => {
    const pg = (r.page ?? "").trim();
    if (pg === "") return false;
    return pg === "*" || pages.some(p => pg.includes(p.route) || p.route.includes(pg));
  });
}
function makeChunks(pages: PageEntry[]): PageEntry[][] {
  const core = pages.filter(p => p.core);
  const rest = pages.filter(p => !p.core);
  const chunks: PageEntry[][] = core.map(p => [p]);
  for (let i = 0; i < rest.length; i += 8) chunks.push(rest.slice(i, i + 8));
  return chunks;
}
/** Impact Graph：改动文件 → 受影响页面（文件路径包含页面路由段即视为命中） */
function affectedPages(files: Set<string> | string[], pages: PageEntry[]): PageEntry[] {
  const arr = [...files].map(f => f.replace(/\\/g, "/"));
  return pages.filter(p => arr.some(f => f.includes(p.route)));
}
/** 受影响页面 ∪ 仍待修复问题所在页面（回归范围下限） */
function scopePages(base: PageEntry[], files: Set<string>, openIssuePages: Set<string>): PageEntry[] {
  const impacted = affectedPages(files, base);
  const set = new Map<string, PageEntry>();
  for (const p of impacted) set.set(p.route, p);
  for (const p of base) if (openIssuePages.has(p.route)) set.set(p.route, p);
  return base.filter(p => set.has(p.route));
}

// Windows 下 world.run 无法直接 spawn pnpm/.cmd，统一走 node + corepack 入口
const PNPM_ENTRY = "D:\\codex-tools\\node-v22.17.0-win-x64\\node_modules\\corepack\\dist\\pnpm.js";
async function runPnpm(args: string[], timeoutMs: number): Promise<{ ok: boolean; err: string }> {
  try {
    const b = await world.run("node", [PNPM_ENTRY, ...args], { timeoutMs });
    return { ok: b.exitCode === 0, err: (b.stderr || b.stdout).slice(-4000) };
  } catch (e) {
    return { ok: false, err: "命令无法启动: " + String(e) };
  }
}
async function buildGate(): Promise<{ ok: boolean; err: string }> {
  return runPnpm(["-C", "apps/client", "run", "build:mp-weixin:mock"], 1800000);
}
async function gitTry(args: string[]): Promise<{ spawned: boolean; ok: boolean; out: string; err: string }> {
  try {
    const r = await world.run("git", args);
    return { spawned: true, ok: r.exitCode === 0, out: r.stdout, err: r.stderr };
  } catch (e) {
    return { spawned: false, ok: false, out: "", err: String(e) };
  }
}

// ===== UI Lock 状态机协议（v3.1：AVAILABLE/LEASED/STALE；不旋轮重试）=====
const UI_LOCK_RULES = [
  `【UI Lock 状态机】${WORKFLOW.ui.endpoint} 是单写者资源。锁文件 tmp/qa/locks/wechat-automation-9420.lock，字段：resource/owner/pid/batch/status(AVAILABLE|LEASED|STALE)/leaseUntil/lastHeartbeat/attempt。`,
  `获取：无锁或 status≠LEASED 或 leaseUntil 已过期（超过 ${WORKFLOW.ui.graceSeconds}s grace）→ 原子写入 status=LEASED + leaseUntil=now+${WORKFLOW.ui.leaseMinutes}min 后开始工作；每完成一个用例/分段刷新 lastHeartbeat（间隔 ≤${WORKFLOW.ui.heartbeatSeconds}s 量级）并顺延 leaseUntil；超过 ${WORKFLOW.ui.staleAfterSeconds}s 无心跳视为 STALE，他人可接管。`,
  `锁不可得时禁止 sleep 循环抢锁：记录 BLOCKED（时间+原因）→ 转做非 UI 准备工作（重读 Manifest/整理证据/预生成脚本）→ 稍后再查（有界次数，如 3 次）→ 仍不可得则将剩余用例如实标 UNVERIFIED。`,
  `持锁期间先 netstat -ano 观察 9420 连接：发现外部客户端只记录，【禁止 taskkill 任何进程】；受影响用例标 UNVERIFIED（reason=endpoint occupied by external client + attempts）。`,
  `结束：status=released 并删除锁文件；结论里报告锁的获取/释放/等待情况。`,
].join("\n");

// ===== 三级重置协议（A1 恢复手段；避免频繁 reLaunch）=====
const RESET_RULES = [
  `【三级重置】恢复 UI 状态按代价升序：`,
  `LEVEL 0 软重置（默认）：关闭当前弹窗/返回页面顶部/清除临时输入/收起键盘——不离开当前页；`,
  `LEVEL 1 路由重置：重新进入当前页面（redirectTo/navigateTo 自身），用于页面状态污染；`,
  `LEVEL 2 整机重置：uni.reLaunch 重启小程序，仅用于路由异常/应用卡死/核心状态异常；每个 Suite 至多 1 次（maxReLaunchPerSuite=${WORKFLOW.ui.maxReLaunchPerSuite}）。`,
  `用例之间默认只做 LEVEL 0；禁止把 reLaunch 当常规步骤。`,
].join("\n");

// ===== 证据预算协议（减少截图与解析成本）=====
const EVIDENCE_BUDGET = [
  `【证据预算】每个用例按 tier 采集证据，不多采：`,
  `critical（下单/发布/删除/支付/权限/匹配等有副作用的关键操作）= before + after 截图 + 路由 + Toast 文案 + console；`,
  `normal（普通点击/开关/输入）= after 截图 + 路由 + console；`,
  `navigation（纯跳转/返回/切 Tab）= 路由断言（getCurrentPages 链）即可，可不截图；`,
  `noop（纯滚动/悬停类无状态变化）= 执行日志（scroll 位置/console）即可。`,
  `Manifest 里每个用例必须标 tier；执行器按 tier 采集；判定员不得因证据少而降低判定标准——UNVERIFIED 如实标注。`,
].join("\n");

// ===== 审查规则 =====
const RULES_AUDIT = [
  "【标准】只以微信小程序真实表现为标准（真实 viewport/安全区/TabBar/导航与手势/键盘/弹层/页面生命周期），禁止用 H5 或浏览器标准。",
  "【五维审查深度（R11 §4）】UI 维查到 token 值级（应为 token X 16px 实际 8px，禁止「感觉挤」）；UX 维查到操作路径级（热区≥88rpx、任意页 2 步内能否回 tab、CTA 第一眼可见、返回落点符合心智）；小程序维查到设备行为级（状态栏叠印/TabBar 遮挡滚到底最后一条完整可见/safe-area/scroll-view 高度回弹/sticky/fixed 覆盖/键盘弹起/modal 层级/内容裁切/胶囊按钮 96px 预留）；数据维查到极值级（空/最短「张三」/中/50 字/100/500/1000 字/长昵称/多图/无头像/缺字段/加载失败/图片 fallback 链 halfBodyPhotoUrl→photoGallery[0]→avatarUrl→默认头像）；一致性维查到跨页对照级（按钮/卡片/导航栏/空态/Toast/图标风格/头像兜底与其他页并排对比）。",
  "【理想图对比顺序（R11 §2.2）】L1 结构 → L2 信息层级 → L3 交互位置 → L4 卡片尺寸 → L5 间距 → L6 Typography → L7 Icon → L8 颜色 → L9 阴影 → L10 微细节；L1–L4 有偏差即不达标。",
  "【观察证据制（重要）】每页必须产出至少一条「观察证据」（observation：该页核对过什么、状态如何，附截图路径）；但不强制每页必须报缺陷。禁止为了产出而编造或夸大问题（「间距可能略大」「颜色可能略偏」这类无证据推测一律不得作为 Issue）；有缺陷必须报，无缺陷如实写 observation。",
  "【Finding 四层标准】每个 Issue 必须含：severity（P0 阻断/P1 严重功能/P2 明显体验/P3 视觉细节/P4 优化）+ status + confidence（0~1，证据支持强度而非主观把握）+ sources（screenshot/interaction/code/log 组合）+ evidence（具体截图位置/代码文件行号/与理想图差异）。功能缺失必须记 P1/P2 Function，禁止降级写成视觉问题。",
  "【严重级】P0 阻断使用；P1 严重影响功能；P2 明显影响体验；P3 视觉细节；P4 优化项。",
  "【「本页无问题」13 项举证（R11 §10.3）】截图已看/理想图已对照/滚动已测/点击已测/返回已测/safe-area 已查/TabBar 已查/空态已查/长文已查/加载态已查/错误态已查/组件一致性已查/历史 Bug 回归已查——全齐才允许判无问题并在 coverage 列明，缺任一项继续查。",
  "【编号】Issue id 格式：MP-轮次标签-页面路由大写-三位序号。",
  "【证据缓存校验】审查前先读证据 manifest（巡检员产出），核对其中 gitSha/构建指纹与当前一致；不一致的证据视为过期，不得据其下结论（把过期证据列为「未基于新代码验证」）。",
  "【独立性】默认项目仍有问题；不得读取 reports/audit 下其他轮次结论文当作答案。",
].join("\n");

const RULES_CASES = [
  `【用例固定结构】每条用例：id（页面缩写+两位序号，如 N01）/page/title/tier/pre（前置与进入方式）/action（选择器或坐标/输入）/expected（预期反应：界面变化/路由/Toast/状态）/evidence（按 tier 的采集要求）。`,
  `【交互规格铁律（R11 §5）】通用铁律：任何可点击元素点击后 500ms 内必须有可观测反馈（路由变化/DOM 变化/Toast/震动之一），否则即「死按钮」缺陷。主按钮防连点（快击 5 次只提交 1 次）；热区≥88rpx；搜索输入 300ms 防抖；Tab 切换滚动位与数据不丢；返回落点=来源页且状态恢复；冷启动深链严禁闪现错误空态；表单三态（空/非法/合法）；弹层三路关闭；Toast 文案正确、Loading 不永驻；点赞/收藏/关注乐观更新+失败回滚；CardSwiper 方向语义；下拉刷新真实重拉；上拉分页正确；头像兜底链；核心页七态 Idle/Loading/Success/Empty/Error/Disabled/Refreshing。`,
  `【操作覆盖】每页覆盖：全部可点击元素、全部输入框（正常+清空+超长+特殊字符）、滚动到底/顶、返回/关闭、Tab 切换、弹层开关、下拉刷新（若有）。核心页另加：快速连点×5、重复提交、空提交、打开即返回、重复进出。`,
].join("\n");

// ===== 复用子代理（跨轮积累上下文）=====
const shooter = agent("截图取证员", "你负责用微信开发者工具 CLI 与 miniprogram-automator 给小程序页面做单会话全量截图巡检，熟悉本项目 scripts/r11-tour.ps1、r11-reshoot.ps1 与 tools/screenshot-all.mjs。长跑注意分段防假死，不放弃不伪造。");
const fixer = agent("修复工程师", "你是微信小程序前端工程专家，按证据修复问题，只以小程序真实表现为标准，修完自查不引入新问题。");
const verifier = agent("修复验证员", "你负责用定向重截/重跑操作证明每个修复真的生效，按影响范围回归，不放水、不臆断，复验不过如实记 failed。");
const gitButler = agent("Git 管家", "你负责在 git 提交失败时诊断并完成规定范围的提交，绝不提交范围外文件。");

// =====================================================================
// 阶段一：盘点（与 v2 逐字一致，保证缓存复用）
// =====================================================================
phase("盘点项目结构与页面清单");
const recon = await agent("项目盘点员").ask<Recon>(
  [
    "盘点这个微信小程序项目（uni-app 写法，源码在 apps/client/src）。不要修改任何文件。",
    "1. 读 apps/client/src/pages.json，列出全部页面（含分包，以代码实际页面为准，不要只看 README），并标注核心页面：tabBar 页 + 登录/注册/寻觅/首页/附近/消息/我的/校园圈/发布/聊天等主链路页面。",
    "2. 读 project.config.json 确认 miniprogramRoot；确认构建命令（apps/client/package.json 的 build:mp-weixin:mock 可用，构建含图片样式检查、包体积校验、构建特性校验）。",
    "3. 摸清既有截图取证方案写进 captureHow：tools/screenshot-all.mjs 的连接方式（开发者工具路径、projectPath）、scripts/ 下 automator 探针、reports/audit/r11-acceptance 的双身份截图与 mock 登录做法（tmp_r11_login.json 等）、scripts/r11-tour.ps1 与 r11-param-map.json 参数固化表。",
    "4. 找理想图/设计稿目录（素材/、素材/全站素材补齐-0912_assets/、素材/寻觅注册页-素材_assets/、截图存档/、doc/、docs/、specs/ 等）列进 idealDirs。",
    "srcRoot 填 apps/client/src（或实际源码根），distRoot 填 miniprogramRoot。",
  ].join("\n"),
);
if (recon.pages.length === 0) {
  return {
    conclusion: "项目盘点没有发现任何页面，无法开始审计。请确认 apps/client/src/pages.json 存在且可读。",
    findings: [],
    verified: [],
    notCovered: ["整个审计流程未启动"],
  };
}
log(`盘点完成：${recon.pages.length} 个页面（核心 ${recon.pages.filter(p => p.core).length} 个）`);

// =====================================================================
// 阶段二：基线（历史问题 ∥ 理想图，与 v2 逐字一致）+ 回归索引
// =====================================================================
phase("梳理历史问题与理想图基准");
const [history, ideal] = await Promise.all([
  agent("历史问题整理员", "你负责从项目既有审计报告中提炼历史问题清单，宁可多收不可漏收，每条都要标来源。").ask<History>(
    [
      "这个项目此前已经跑过多轮审计：reports/audit/ 下有 round-1..5、r6..r11、r11-acceptance、independent、2026-09-* 等目录。",
      "1. 通读这些报告（audit-report.md、issue-matrix、screenshot-matrix、regression、independent、ideal-comparison 等），提取所有曾发现的问题，重点是 P0/P1 和反复出现的问题，形成历史问题清单。历史问题不得因为截图暂时正常就当作已解决，只能作为本轮回归核对的线索。",
      "2. 梳理回归高风险区（底部导航/页面高度/滚动/弹窗/聊天/发布/匹配/个人资料/图片/返回/状态）。",
      "3. 把清单写入 reports/audit/baseline/historical-issues.md，listFile 返回该路径。",
      "只读报告 + 写这一个基准文件，不改任何代码。",
    ].join("\n"),
  ),
  agent("理想图基准员", "你负责把散落的设计稿/参考图整理成每页的理想目标基准，理想图是最终构建目标而不是参考。").ask<{ idealRefs: IdealRef[]; baselineFile: string; summary: string }>(
    [
      "把项目里的理想图/设计稿/参考图/设计规范统一整理为 Target UI Baseline：",
      "1. 在 素材/、素材/全站素材补齐-0912_assets/、素材/寻觅注册页-素材_assets/、截图存档/、doc/、docs/、specs/、reports/audit/ 下的 ideal-comparison.md 等处找每页的参考。",
      "2. 对每个有参考的页面给出 idealRefs（page 路由或 *、图片/规范文件路径、notes 简述该页理想结构：主视觉/内容顺序/CTA/底部导航/页面状态）。",
      "3. 汇总写入 reports/audit/baseline/ideal-baseline.md，baselineFile 返回该路径。",
      "只读素材 + 写这一个基准文件，不改任何代码。",
    ].join("\n"),
  ),
]);
log(`历史问题 ${history.historicalIssues.length} 条（高风险区 ${history.highRiskAreas.length} 个），理想图参考 ${ideal.idealRefs.length} 条`);
history.idealRefs = ideal.idealRefs;

// 回归索引（A5 机器差分的数据基座）：历史问题 → riskFiles/verification 映射
phase("建立回归索引");
const regIndex = await agent("回归索引员", "你负责把历史问题清单机器化：为每条问题建立 riskFiles（哪些文件改动必须回归它）与 verification（回归时要验证的用例）。只读清单与代码，写一个索引文件。").ask<{ indexFile: string; entries: number }>(
  [
    `读 ${history.listFile}（历史问题清单）与 reports/audit/baseline/ 下其他基线文件，为每条问题建立回归索引条目：`,
    `{ id, page, components（相关组件名）, riskFiles（工作区相对文件路径，改这些文件必须回归该条）, verification（回归验证点，用页面/用例名描述）, severity }。`,
    `riskFiles 从问题代码位置推导（读 apps/client/src 对应源码确认真实路径）；verification 拆成可执行验证点（如 nearby-card-click、chat-forward）。`,
    `写入 reports/audit/baseline/regression-index.json（JSON 数组）。不改任何代码。indexFile 返回路径，entries 返回条数。`,
  ].join("\n"),
);
log(`回归索引：${regIndex.entries} 条 → ${regIndex.indexFile}`);

// 当前 Git SHA（证据缓存绑定的指纹之一）
const gitSha = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";

// =====================================================================
// 通用：UI 证据采集（A1；scope=full 全量 | impact 影响范围）
// =====================================================================
async function uiEvidence(label: string, dir: string, shotDir: string, pages: PageEntry[], buildOk: boolean, reuseNote: string): Promise<{ tour: ShotBatch | null; exec: ExecResult | null; opsFiles: { key: string; file: string; cases: number }[] }> {
  const chunks = makeChunks(pages);
  if (!buildOk) {
    log("构建未通过（Gate G1 FAIL）→ 快速失败：跳过全部 UI 会话，只保留非 UI 分析");
    blockers.push(`${label}: 构建未通过，本轮无 UI 证据（分析仅限代码层）`);
    return { tour: null, exec: null, opsFiles: [] };
  }
  // —— 并行：A1 截图巡检 ∥ 操作用例预备（A0 的 Test Manifest，非 UI）∥ （调用方并行跑代码审查）——
  const tourPromise = shooter.ask<ShotBatch>(
    [
      `第 ${label} 轮截图巡检（单会话、Suite 化）。构建已由脚本完成，当前 gitSha=${gitSha}。${reuseNote ? "\n" + reuseNote : ""}`,
      `页面清单共 ${pages.length} 个：${JSON.stringify(pages.map(p => ({ route: p.route, name: p.name, core: p.core })))}`,
      `要求（R11 §3）：普通页≥1 张首屏；滚动页≥3 张（顶/中/底）；核心页≥6 张（默认/滚动/交互后/空态/数据态/弹层态）；表单页+2（校验错误/键盘弹起）；双身份尽量覆盖；参数用既有固化表（${recon.captureHow}）。`,
      `【Suite/Checkpoint】把页面按域分成若干 Suite（每 Suite ≤8 页，如 home+nearby / messages+profile / village+publish / 其余分包）：每 Suite 独立会话段，段间做 Checkpoint（记录已完成页面到 tmp/qa/checkpoints/tour-${label}.json）；Suite 内恢复按三级重置（LEVEL 0 默认，LEVEL 2 reLaunch 每 Suite 至多 ${WORKFLOW.ui.maxReLaunchPerSuite} 次）。`,
      UI_LOCK_RULES,
      RESET_RULES,
      `空白/纯骨架截图自动重拍 3 次，仍异常记 failures 并标 P1。每页同步抓 console error 写到 ${dir}/console-evidence.log。`,
      `【证据清单（必须）】完成后写 ${dir}/screenshot-manifest.json：{ gitSha: "${gitSha}", workflowVersion: "${WORKFLOW.version}", buildMode: "build:mp-weixin:mock", shots: [{page, path, state}] }。manifestFile 返回该路径。`,
      `禁止伪造截图；截不到的写进 failures。scriptPath 填巡检脚本路径。`,
    ].join("\n"),
  );
  const opsPromise = Promise.all(chunks.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    return agent(`用例设计员-${label}-${key}`, "你是测试用例设计员（A0 的规划臂），只读源码把页面交互翻译成固定结构的 Test Manifest，不驱动开发者工具、不改代码。").ask<OpsPrep>(
      [
        `第 ${label} 轮 · 用例设计。你负责这些页面：`,
        JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
        `读每页源码（${recon.srcRoot}/ 及其组件），产出固定结构用例（PRE/ACTION/EXPECTED/EVIDENCE/tier），带参页面参数用既有固化表（${recon.captureHow}）。`,
        RULES_CASES,
        EVIDENCE_BUDGET,
        `【产出】用例 JSON 写入 ${dir}/ops/${key}.json（{cases:[...]}），返回 file 与 cases 数。不改任何文件。`,
      ].join("\n"),
    ).then(prep => ({ key, file: prep.file ?? "", cases: prep.cases ?? 0 }));
  }));
  const [tour, opsFiles] = await Promise.all([tourPromise, opsPromise]);
  totalShots += tour.shots.length;
  for (const f of tour.failures) captureFailures.push(`${label} ${f.page}: ${f.reason}`);
  log(`第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖 ${tour.pagesCovered} 页；用例清单 ${opsFiles.reduce((s, o) => s + o.cases, 0)} 条已备好`);

  // —— A1 单写者执行：Suite 化 + Checkpoint + 证据预算 ——
  const exec0 = agent(`操作执行员-${label}`, "你是 A1 UI Driver：唯一可驱动微信开发者工具自动化端口的执行器。只按 Manifest 执行，不自由探索、不判断设计；分段 Suite + Checkpoint + 三级重置；不伪造执行结果。");
  const exec = await exec0.ask<ExecResult>(
    [
      `第 ${label} 轮 · 执行全部用例（你独占 9420）。当前 gitSha=${gitSha}。`,
      `用例清单：`,
      opsFiles.map(o => `${o.key}: ${o.file}（${o.cases} 条）`).join("\n"),
      `【Suite 划分】按页面域分 Suite（每 Suite ≤6 页）：每 Suite 独立连接执行；Suite 开始前读检查点 tmp/qa/checkpoints/exec-${label}.json，已完成 Suite 跳过；每 Suite 结束写检查点（suite/status/executedCaseIds）。`,
      `【执行】逐用例：按 pre 建立前置 → action → 等稳定（≥500ms 观察反馈）→ 按 tier 采集证据（critical=前后截图，normal=后截图，navigation=仅路由断言，noop=仅日志）→ 记录 observed/route/toast/console。截图到 reports/screenshots/${shotDir}-interact/（页面大写-用例号-before/after.png），结果逐用例写入 ${dir}/interact/exec-results.json（id/page/tier/observed/route/toast/console/evidence[]/status=EXECUTED|FAILED|SKIPPED）。`,
      `既有连接方式：${recon.captureHow}。`,
      UI_LOCK_RULES,
      RESET_RULES,
      EVIDENCE_BUDGET,
      `返回：resultsFile/executed/failures/scriptPath/checkpoints。禁止伪造。`,
    ].join("\n"),
  );
  log(`第 ${label} 轮执行完成：${exec.executed} 条用例，失败/跳过 ${(exec.failures ?? []).length}`);
  return { tour, exec, opsFiles };
}

// =====================================================================
// 通用：六路复核（Evidence Bus：A2 代码 ∥ A3 视觉 ∥ A4 需求 ∥ A5 回归 ∥ A6 交互判定）
// =====================================================================
async function codeChunk(label: string, dir: string, chunkKey: string, chunk: PageEntry[], hist: History): Promise<CodeBatch> {
  const histFor = histForPages(chunk, hist);
  const res = await agent(`代码审查员-${label}-${chunkKey}`, "你是代码审查员（A2，Layer A），只读源码找问题，证据到文件行号，不驱动开发者工具、不截图、不改代码。").ask<CodeBatch>(
    [
      `第 ${label} 轮 · 代码层审查。你负责这些页面（含其引用的组件/store/utils）：`,
      JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
      `检查清单：架构与重复代码/命名/状态管理（单一数据源、store 与页面同步）/API 错误处理（空 catch、静默失败、未处理 Promise 拒绝）/异步流程/样式（硬编码、token 强制、IMAGE_PATHS）/组件事件接线（子组件 emit 父页面是否监听——本项目高频缺陷）/小程序专项代码（scroll-view 高度、safe-area、fixed、键盘、onShow 刷新、页面栈、@tap.stop 与 catchtap 冒泡）。`,
      `【项目硬约束（R11 附录 B）】禁 :hover；禁 grid；禁空 catch {}；组件禁 import.meta.env.DEV；业务组件禁 emoji；设计 token 强制；backdrop-filter 仅 H5 条件编译；页面切换逻辑内联 .vue；工具函数从 .ts 导入；自定义组件宿主节点 flex:1；CardSwiper min-height:860rpx 兜底。`,
      histFor.length > 0 ? `历史问题线索（回归核对，代码层验证后才能作为发现，category=Regression）：${JSON.stringify(histFor.map(h => ({ id: h.id, page: h.page, desc: h.desc, severity: h.severity })))}` : "（无）",
      `【产出】issues（含 confidence 0~1 与 sources）写入 ${dir}/code-findings/${chunkKey}.json 并结构化返回；coverage 逐页写核对说明。不改任何文件。`,
    ].join("\n"),
  );
  const issues = admit(res.issues ?? [], issueIds, "MP-" + label + "-" + chunkKey);
  for (const it of issues) {
    allIssues.push(it);
    pushBoard(it);
  }
  log(`代码审查员-${label}-${chunkKey}：${chunk.length} 页发现 ${issues.length} 个代码层问题`);
  return { issues, findingsFile: res.findingsFile ?? "", coverage: res.coverage ?? [] };
}

async function judgeChunk(label: string, dir: string, chunkKey: string, chunk: PageEntry[], manifestFile: string, exec: ExecResult, hist: History): Promise<JudgeBatch> {
  const res = await agent(`交互判定员-${label}-${chunkKey}`, "你是交互判定员（A6，证据仲裁者）：专门裁决「代码/Manifest 说应该这样（expected）vs A1 实际执行结果是那样（observed）vs 截图看起来这样」三个证据源的冲突，形成 VERIFIED/FAILED/UNVERIFIED 判定。只读证据，不驱动开发者工具、不改代码、不放水也不冤枉。").ask<JudgeBatch>(
    [
      `第 ${label} 轮 · 交互判定（证据仲裁）。你负责这些页面：`,
      JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
      `证据：用例 Manifest（expected 权威来源）：${manifestFile}；A1 执行结果（observed 权威来源）：${exec.resultsFile}；操作截图目录：${exec.shotDir}/；巡检截图与 manifest 见 ${dir}/screenshot-manifest.json。`,
      `做法：逐用例三方对照（Manifest.expected vs A1.observed vs 截图），一致→VERIFIED；预期未达成→FAILED（生成 Issue，category=Interaction，evidence 列三源证据，给 confidence）；执行失败/证据缺失/外部占用→UNVERIFIED（写入 unverifiable，格式「用例|原因|尝试次数」），禁止凭代码推测判 VERIFIED。`,
      RULES_CASES,
      `【产出】checks（caseId/page/operation/expected/actual/verdict/evidence[]/confidence）逐用例；issues；unverifiable。结果写入 ${dir}/interact/${chunkKey}-judge.json 并结构化返回。`,
    ].join("\n"),
  );
  const checks = res.checks ?? [];
  const issues = admit(res.issues ?? [], issueIds, "MP-" + label + "-" + chunkKey);
  for (const it of issues) {
    allIssues.push(it);
    pushBoard(it);
  }
  totalCases += checks.length;
  casesVerified += checks.filter(c => c.verdict === "VERIFIED").length;
  casesFailed += checks.filter(c => c.verdict === "FAILED").length;
  for (const u of res.unverifiable ?? []) interactUnverifiable.push(`${label} ${chunkKey}: ${u}`);
  log(`交互判定员-${label}-${chunkKey}：${checks.length} 用例（VERIFIED ${checks.filter(c => c.verdict === "VERIFIED").length} / FAILED ${checks.filter(c => c.verdict === "FAILED").length} / UNVERIFIED ${(res.unverifiable ?? []).length}）`);
  return { checks, issues, findingsFile: res.findingsFile ?? "", unverifiable: res.unverifiable ?? [], notes: res.notes ?? "" };
}

async function visualChunk(label: string, dir: string, chunkKey: string, chunk: PageEntry[], tour: ShotBatch, exec: ExecResult, codeFiles: string[], hist: History): Promise<VisualBatch> {
  const routes = chunk.map(p => p.route);
  const shots = tour.shots.filter(s => routes.includes(s.page));
  const histFor = histForPages(chunk, hist);
  const res = await agent(`视觉审查员-${label}-${chunkKey}`, "你是视觉审查员（A3），专注截图与证据的视觉/布局/状态审查，以小程序真实表现为唯一标准，证据优先。观察证据制：每页必须有观察证据，但不强制每页凑缺陷。").ask<VisualBatch>(
    [
      `第 ${label} 轮 · 视觉审查。你负责这些页面：`,
      JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
      `静态截图（逐张审查）：`,
      shots.length > 0
        ? shots.map(s => `${s.page} [${s.state}] ${s.path}`).join("\n")
        : `（本批页面本轮没有静态截图——把「缺截图」本身作为 P1 MiniProgram 问题记录，引用失败原因：${JSON.stringify(tour.failures).slice(0, 800)}）`,
      `行为证据：${exec.resultsFile}；操作截图目录：${exec.shotDir}/；证据清单（先校验 gitSha）：${tour.manifestFile}（当前应为 gitSha=${gitSha}，不一致的证据按过期处理并如实标注）。`,
      `代码层已发现问题（不要重复报，补它漏掉的）：${codeFiles.length > 0 ? codeFiles.join("、") : "（无）"}`,
      histFor.length > 0 ? `历史问题线索（回归核对，验证后才能作为发现）：${JSON.stringify(histFor.map(h => ({ id: h.id, page: h.page, desc: h.desc, severity: h.severity })))}` : "（无）",
      `理想图参考：`,
      idealForPages(chunk, hist).length > 0 ? idealForPages(chunk, hist).map(r => `${r.page}: ${r.path}（${r.notes}）`).join("\n") : "（无专门理想图，按微信小程序设计规范与本项目一致性为基准）",
      RULES_AUDIT,
      `【产出】issues 与 observations（逐页至少一条观察证据：page/observation/evidence 截图路径）写入 ${dir}/findings/${chunkKey}.json 并结构化返回；coverage 逐页写核对说明（无问题页按 13 项举证列明）。你只管视觉与证据审查；功能目标对照归需求对照员、历史回归归历史回归员、交互判定归交互判定员，不要越界。`,
    ].join("\n"),
  );
  const issues = admit(res.issues ?? [], issueIds, "MP-" + label + "-" + chunkKey);
  for (const it of issues) {
    allIssues.push(it);
    pushBoard(it);
  }
  log(`视觉审查员-${label}-${chunkKey}：${chunk.length} 页 / ${shots.length} 张截图，缺陷 ${issues.length}，观察证据 ${(res.observations ?? []).length} 条`);
  return { issues, findingsFile: res.findingsFile ?? "", observations: res.observations ?? [], coverage: res.coverage ?? [] };
}

async function requirementChunk(label: string, dir: string, chunkKey: string, chunk: PageEntry[], tour: ShotBatch, exec: ExecResult, hist: History): Promise<ReqBatch> {
  const routes = chunk.map(p => p.route);
  const shots = tour.shots.filter(s => routes.includes(s.page));
  const idealFor = idealForPages(chunk, hist);
  const res = await agent(`需求对照员-${label}-${chunkKey}`, "你是需求对照审查员（A4），沿「需求/理想设计 → 页面 → 组件 → 行为 → 验收条件」逐页核对功能目标是否真正实现，只读代码与证据，不改代码、不碰开发者工具。").ask<ReqBatch>(
    [
      `第 ${label} 轮 · 需求与功能目标对照。你负责这些页面：`,
      JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
      `证据：静态截图 ${shots.length} 张；执行结果：${exec.resultsFile}；操作截图目录：${exec.shotDir}/；源码：${recon.srcRoot}/。`,
      idealFor.length > 0 ? `理想图/规范参考：${idealFor.map(r => `${r.page}: ${r.path}（${r.notes}）`).join("\n")}` : "（无专门理想图，按微信小程序设计规范与同类产品惯例推导应有功能）",
      `做法：每页明确「应该具备什么功能」（target），逐条给 current（读代码+执行结果证实）/gap/fix。`,
      `【每页使用对比 PageCompare】structureNotes（L1–L10 逐级，L1–L4 偏差即不达标）；usageNotes（理想 vs 实际操作路径：能否顺畅完成核心任务、会不会迷路、任意页 2 步内能否回 tab）；functionGaps；verdict（达标/基本达标/不达标）。详情写入 ${dir}/page-compare/${chunkKey}.md，file 返回该路径。`,
      `【功能缺失定性】功能缺失生成 Issue（category=Function，P1/P2，禁止降级为视觉问题），含 confidence 与 sources。`,
      `【产出】issues 与 pageCompares 写入 ${dir}/findings/${chunkKey}-req.json（与视觉审查员分文件）并结构化返回。`,
    ].join("\n"),
  );
  const issues = admit(res.issues ?? [], issueIds, "MP-" + label + "-" + chunkKey + "-REQ");
  for (const it of issues) {
    allIssues.push(it);
    pushBoard(it);
  }
  log(`需求对照员-${label}-${chunkKey}：${chunk.length} 页对照完成，功能缺失 ${issues.length}，使用对比 ${(res.pageCompares ?? []).length} 份`);
  return { issues, pageCompares: res.pageCompares ?? [], findingsFile: res.findingsFile ?? "" };
}

async function regressionChunk(label: string, dir: string, chunkKey: string, chunk: PageEntry[], codeFiles: string[], exec: ExecResult, tour: ShotBatch, hist: History, indexFile: string, impactFiles: string[]): Promise<RegBatch> {
  const histFor = histForPages(chunk, hist);
  if (histFor.length === 0) return { issues: [], checked: [], findingsFile: "" };
  const routes = chunk.map(p => p.route);
  const shots = tour.shots.filter(s => routes.includes(s.page));
  const res = await agent(`历史回归员-${label}-${chunkKey}`, "你是历史回归审查员（A5）：只回答「以前修掉的问题有没有被改回来」。用回归索引做机器差分——只核对 riskFiles 与本轮改动/证据相关的条目，不全量重读。只读清单、代码与证据，不改代码、不碰开发者工具；宁可标「证据不足」也不猜测。").ask<RegBatch>(
    [
      `第 ${label} 轮 · 历史问题回归核对（索引差分模式）。你负责这些页面：`,
      JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
      `回归索引（先读它，按 riskFiles/verification 差分）：${indexFile}`,
      impactFiles.length > 0 ? `本轮影响范围（改动文件——riskFiles 与其相交的条目必须重点核对）：${impactFiles.join("、")}` : "（本轮无定向改动清单，按页面相关条目核对）",
      `页面相关历史条目：${JSON.stringify(histFor.map(h => ({ id: h.id, page: h.page, desc: h.desc, severity: h.severity })))}`,
      `可用证据：源码（证明问题路径是否仍存在）；执行结果：${exec.resultsFile}；操作截图：${exec.shotDir}/；静态截图 ${shots.length} 张；本批代码发现：${codeFiles.length > 0 ? codeFiles.join("、") : "（无）"}。`,
      `做法：逐条给 checked（id/page/status/evidence）：未复发（附证据）/ 已复发（生成 Issue category=Regression，severity 不低于原级）/ 证据不足（写明缺什么）。`,
      `【产出】issues 与 checked 写入 ${dir}/regression/${chunkKey}.json 并结构化返回。`,
    ].join("\n"),
  );
  const issues = admit(res.issues ?? [], issueIds, "MP-" + label + "-" + chunkKey + "-REG");
  for (const it of issues) {
    allIssues.push(it);
    pushBoard(it);
  }
  const checked = res.checked ?? [];
  log(`历史回归员-${label}-${chunkKey}：核对 ${checked.length} 条（已复发 ${issues.length}，未复发 ${checked.filter(c => c.status === "未复发").length}，证据不足 ${checked.filter(c => c.status === "证据不足").length}）`);
  return { issues, checked, findingsFile: res.findingsFile ?? "" };
}

// =====================================================================
// 通用：修复 + 分级回归（P0/P1 立即定向 / P2 批量 / P3 待终验）+ Git
// =====================================================================
async function commitRound(n: number, dir: string): Promise<string> {
  phase("固化本轮改动到 Git");
  let statusPaths: string[] = [];
  try {
    const st = await git.status();
    statusPaths = [...st.staged, ...st.unstaged, ...st.untracked];
  } catch {
    const st2 = await gitTry(["status", "--porcelain"]);
    if (st2.spawned && st2.ok) {
      statusPaths = st2.out.split("\n").map(l => l.trim()).filter(l => l.length > 3).map(l => l.slice(3));
    }
  }
  const targets = new Set<string>();
  for (const c of statusPaths) {
    if (c.startsWith(dir) || c.startsWith("reports/screenshots/") || fixerFiles.has(c)) targets.add(c);
  }
  const list = [...targets];
  if (list.length === 0) {
    log(`第 ${n} 轮没有需要提交的改动，跳过提交`);
    return "";
  }
  const add = await gitTry(["add", ...list]);
  if (!add.spawned) {
    const res = await gitButler.ask<CommitResult>(
      `脚本环境无法启动 git（${add.err.slice(0, 300)}）。请在你的终端完成本轮提交：git add 以下路径（仅限这些）：${list.join("、")}，然后 git commit -m "fix(miniprogram): round-${n} audit fixes"。不要动其他文件。commit 返回 hash；无法提交时如实写原因。`,
    );
    return res.commit;
  }
  if (!add.ok) log(`git add 失败：${add.err.slice(0, 300)}`);
  const cm = await gitTry(["commit", "-m", "fix(miniprogram): round-" + n + " audit fixes"]);
  if (!cm.ok) {
    const res = await gitButler.ask<CommitResult>(
      `git commit 失败，错误尾部：\n${cm.err.slice(-2000)}\n请检查 git 状态，解决后完成提交，提交信息 fix(miniprogram): round-${n} audit fixes。只允许提交这些路径：${list.join("、")}。commit 返回 hash；无法提交时如实写原因。`,
    );
    return res.commit;
  }
  const lg = await gitTry(["log", "-1", "--format=%h %s"]);
  return lg.ok ? lg.out.trim() : "";
}

async function fixAndRegress(n: number, label: string, dir: string, found: Issue[], findingFiles: string[], coverage: string[], compares: PageCompare[], judgeFiles: string[], regFiles: string[], ui: { tour: ShotBatch | null; exec: ExecResult | null }, hist: History): Promise<{ fixed: number; commit: string }> {
  phase("修复并分级回归");
  for (const it of found) {
    if (it.severity === "P4" && it.status === "待修复") {
      it.status = "保留";
      pushBoard(it);
    }
  }
  const worklist = found.filter(i => i.status === "待修复" && (i.severity === "P0" || i.severity === "P1" || i.severity === "P2" || (n >= 2 && i.severity === "P3")));
  let fixed = 0;
  if (worklist.length > 0) {
    log(`第 ${label} 轮待修复 ${worklist.length}（P0 ${cnt(worklist, "P0")} / P1 ${cnt(worklist, "P1")} / P2 ${cnt(worklist, "P2")} / P3 ${cnt(worklist, "P3")}）；分级回归：P0/P1 立即定向，P2 本轮批量，P3 留终验`);
    const fixRes = await fixer.ask<FixResult>(
      [
        `第 ${label} 轮待修复 ${worklist.length} 个，P0>P1>P2：`,
        JSON.stringify(worklist.map(i => ({ id: i.id, severity: i.severity, page: i.page, category: i.category, description: i.description, evidence: i.evidence, ideal: i.ideal, fix: i.fix, screenshot: i.screenshot }))),
        `完整证据文件：${findingFiles.join("、") || dir + "/ 下 findings/ 与 code-findings/"}`,
        `要求：只以微信小程序为标准；功能缺失真正实现；交互偏差修到「操作后反应与预期一致」；本项目高频缺陷优先核对（子组件 emit 父页面未监听、@tap.stop/catchtap 冒泡、空 catch、双数据源不同步）；修完自查不引入新问题；不留调试代码；不改历史报告与无关文件；不碰 tmp_*、*.log。`,
        `返回 fixedIds / skipped（不修必须写 reason+decision）/ filesChanged。`,
      ].join("\n"),
    );
    for (const f of fixRes.filesChanged) fixerFiles.add(f);

    // Gate G1/G2 快速失败：构建+typecheck 不过则禁止新 UI 会话（分析可继续）
    let gatesOk = true;
    const gate = await buildGate();
    if (!gate.ok) {
      await fixer.ask(`构建未通过（错误尾部）：\n${gate.err}\n请在你自己的终端运行 pnpm -C apps/client run build:mp-weixin:mock（Windows 用 pnpm.cmd）修复直到通过，返回退出码与结论。`);
      const gate2 = await buildGate();
      if (!gate2.ok) {
        await fixer.ask(`构建第二次仍未通过（错误尾部）：\n${gate2.err}\n继续修复直到通过。`);
        const gate3 = await buildGate();
        gatesOk = gate3.ok;
      }
    }
    if (gatesOk) {
      const tc = await runPnpm(["-C", "apps/client", "run", "typecheck"], 900000);
      if (!tc.ok) {
        await fixer.ask(`vue-tsc 未通过（错误尾部）：\n${tc.err}\n请修复所有类型错误直到 pnpm -C apps/client run typecheck 通过，返回结论。`);
        const tc2 = await runPnpm(["-C", "apps/client", "run", "typecheck"], 900000);
        if (!tc2.ok) {
          gatesOk = false;
          blockers.push(`round-${n}: typecheck 仍未通过（Gate G2 FAIL，禁止新 UI 会话）`);
        }
      }
    } else {
      blockers.push(`round-${n}: 构建连续未通过（Gate G1 FAIL，禁止新 UI 会话）`);
    }

    // P3 修复后只标「已修复待终验」，最终回归才验证
    for (const it of worklist) {
      if (it.severity === "P3" && it.status === "待修复") {
        it.status = "已修复待终验";
        pushBoard(it);
      }
    }

    if (gatesOk) {
      const immediate = worklist.filter(i => fixRes.fixedIds.includes(i.id) && (i.severity === "P0" || i.severity === "P1" || i.severity === "P2"));
      if (immediate.length > 0) {
        const verRes = await verifier.ask<VerifyResult>(
          [
            `复验第 ${label} 轮修复（影响范围回归模式）。已修复 ${immediate.length} 个：${JSON.stringify(immediate.map(i => ({ id: i.id, severity: i.severity, page: i.page, category: i.category, description: i.description })))}`,
            `改动文件（Impact Graph 起点）：${JSON.stringify(fixRes.filesChanged)}`,
            `做法：先做影响推导——改动文件 → 组件 → 页面 → 路由 → 受影响用例；只回归受影响页面+仍待修复问题所在页面，不全量。P0/P1 逐条立即验证，P2 可批量同场验证。`,
            ui.tour && ui.exec ? `巡检脚本：${ui.tour.scriptPath}；执行结果与截图目录：${ui.exec.resultsFile} / ${ui.exec.shotDir}/（定向重截/重跑参考 r11-reshoot 模式，输出到 reports/screenshots/round-${n}-after/）` : `（本轮无 UI 会话——只做代码层静态确认，无法确认的如实标 failed/UNVERIFIED，禁止谎报）`,
            `verifiedIds 只放你用截图/重跑操作确认消失的；failed 写明原因；interactionRecheck 记录重跑判定；impactCovered 列出实际回归覆盖的页面与用例。before/after 路径写 beforeAfter。禁止放水。`,
          ].join("\n"),
        );
        for (const id of verRes.verifiedIds) {
          const it = findIssue(id);
          if (it) {
            it.status = "已验证";
            fixed += 1;
            pushBoard(it);
          }
        }
        for (const f of verRes.failed) {
          const it = findIssue(f.id);
          if (it) {
            it.status = "待修复";
            pushBoard(it);
            blockers.push(`round-${n}: ${f.id} 复验未通过（${f.reason.slice(0, 80)}）`);
          }
        }
        for (const s of fixRes.skipped) {
          const it = findIssue(s.id);
          if (it) {
            it.status = "保留";
            pushBoard(it);
          }
        }
        const fresh = admit(verRes.newIssues ?? [], issueIds, "MP-" + label + "-FIX");
        for (const it of fresh) {
          allIssues.push(it);
          pushBoard(it);
        }
      }
    } else {
      log("Gate 未通过，本轮跳过 UI 复验（P0/P1/P2 保持待修复，下轮优先）");
    }
  }
  await scribeRound(`书记员-${label}`, dir, findingFiles, coverage, compares, judgeFiles, regFiles, hist);
  const commit = await commitRound(n, dir);
  report({ type: "round-summary", round: label, issuesFound: found.length, issuesFixed: fixed, commit });
  return { fixed, commit };
}

async function scribeRound(name: string, dir: string, allFindingFiles: string[], coverage: string[], pageCompares: PageCompare[], interFiles: string[], regFiles: string[], hist: History): Promise<void> {
  await agent(name, "你负责把审计原始资料整理成规范报告，所有结论必须有文件/截图依据，不得编造。").ask<ScribeResult>(
    [
      `把本轮审计资料整理落盘到 ${dir}/（目录不存在就创建）。数据只来自这些来源：`,
      `- 审查发现 JSON（代码+视觉+需求）：${allFindingFiles.join("、") || "（读 " + dir + "/ 下 findings/ 与 code-findings/）"}`,
      `- 交互判定 JSON：${interFiles.join("、") || "（读 " + dir + "/interact/）"}`,
      `- 历史回归核对 JSON：${regFiles.join("、") || "（读 " + dir + "/regression/，逐条含 未复发/已复发/证据不足）"}`,
      `- 页面使用对比：${pageCompares.map(c => c.file).filter(f => f !== "").join("、") || "（读 " + dir + "/page-compare/）"}`,
      `- 覆盖记录与观察证据：${JSON.stringify(coverage).slice(0, 2000)}`,
      `- 历史清单：${hist.listFile}；截图：reports/screenshots/ 下本轮目录`,
      `写出：audit-report.md（含每页使用对比与功能目标汇总）、issue-matrix.md（逐截图与逐用例）、screenshot-matrix.md、interaction-matrix.md（逐用例 PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS）、regression-report.md、git-summary.md。全部中文。`,
    ].join("\n"),
  );
}

// =====================================================================
// 通用：单轮审计（scope=full 全量 | impact 影响范围）
// =====================================================================
async function auditRound(n: number, label: string, scope: "full" | "impact", impactFiles: string[]): Promise<{ shots: number; cases: number; found: number; fixed: number; commit: string; pages: PageEntry[] }> {
  const dir = "reports/audit/round-" + n;
  const shotDir = "round-" + n;
  const reuseNote = n === 1
    ? `（证据复用须校验 gitSha：reports/audit/round-1/ 与 reports/screenshots/round-1(-interact)/ 存在上一运行的大批取证。当前 gitSha=${gitSha}——若这些证据的产出先于本轮最新提交（60 项修复），静态截图视为过期，只可作参考；交互判定 JSON 中已验证通过的历史回归项可直接引用其结论。）`
    : "";
  // 影响范围：受影响页面 ∪ 待修复问题所在页面；full 则全量
  const openPages = new Set(allIssues.filter(i => i.status === "待修复").map(i => i.page));
  const pages = scope === "full" ? recon.pages : scopePages(recon.pages, new Set(impactFiles), openPages);
  log(`${label} 轮（${scope === "full" ? "全量基线" : "影响范围回归"}）：${pages.length}/${recon.pages.length} 页入库`);

  // Gate G1：构建快速失败——失败则本轮无 UI（分析继续）
  let gate = await buildGate();
  if (!gate.ok) {
    log("构建未通过，交修复工程师处理后重试一次");
    await fixer.ask(`小程序构建未通过（错误尾部）：\n${gate.err}\n请在你的终端运行 pnpm -C apps/client run build:mp-weixin:mock（Windows 用 pnpm.cmd）修复直到通过，返回退出码与结论。`);
    gate = await buildGate();
    if (!gate.ok) blockers.push(`${label}: 构建未通过（${gate.err.slice(0, 120)}）`);
  }
  const buildOk = gate.ok;

  // —— Evidence Bus：代码审查（非 UI，总是跑）∥ 用例预备（非 UI）∥ UI 证据（受 Gate 控制）——
  const chunks = makeChunks(pages);
  const codePromise = Promise.all(chunks.map((chunk, idx) => codeChunk(label, dir, chunkKeyFor(chunk, idx), chunk, history)));
  const uiRes = await uiEvidence(label, dir, shotDir, pages, buildOk, reuseNote);
  const codeDone = await codePromise;
  const code: CodeSweep = {
    issues: codeDone.flatMap(r => r.issues),
    findingFiles: codeDone.map(r => r.findingsFile).filter(f => f !== ""),
    coverage: codeDone.flatMap(r => r.coverage),
  };

  if (!uiRes.tour || !uiRes.exec) {
    const r = await fixAndRegress(n, label, dir, code.issues, code.findingFiles, code.coverage, [], [], [], uiRes, history);
    return { shots: 0, cases: 0, found: code.issues.length, fixed: r.fixed, commit: r.commit, pages };
  }
  const tour = uiRes.tour;
  const exec = uiRes.exec;

  // —— 六路复核全并行 ——
  phase("并行复核：交互判定与视觉/需求/历史审查");
  const judgePromise = Promise.all(chunks.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const prep = uiRes.opsFiles.find(o => o.key === key);
    return judgeChunk(label, dir, key, chunk, prep && prep.file !== "" ? prep.file : dir + "/ops/", exec, history);
  }));
  const visualPromise = Promise.all(chunks.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const codeFilesFor = code.findingFiles.filter(f => f.includes(key));
    return visualChunk(label, dir, key, chunk, tour, exec, codeFilesFor, history);
  }));
  const reqPromise = Promise.all(chunks.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    return requirementChunk(label, dir, key, chunk, tour, exec, history);
  }));
  const regPromise = Promise.all(chunks.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const codeFilesFor = code.findingFiles.filter(f => f.includes(key));
    return regressionChunk(label, dir, key, chunk, codeFilesFor, exec, tour, history, regIndex.indexFile, impactFiles);
  }));
  const [judgeResults, visualResults, reqResults, regResults] = await Promise.all([judgePromise, visualPromise, reqPromise, regPromise]);

  const inter: JudgeSweep = {
    checks: judgeResults.flatMap(r => r.checks),
    issues: judgeResults.flatMap(r => r.issues),
    findingFiles: judgeResults.map(r => r.findingsFile).filter(f => f !== ""),
    unverifiable: judgeResults.flatMap(r => r.unverifiable),
  };
  const visual: VisualSweep = {
    issues: visualResults.flatMap(r => r.issues),
    findingFiles: visualResults.map(r => r.findingsFile).filter(f => f !== ""),
    observations: visualResults.flatMap(r => r.observations),
    coverage: visualResults.flatMap(r => r.coverage),
  };
  const req: ReqSweep = {
    issues: reqResults.flatMap(r => r.issues),
    pageCompares: reqResults.flatMap(r => r.pageCompares),
    findingFiles: reqResults.map(r => r.findingsFile).filter(f => f !== ""),
  };
  const reg: RegSweep = {
    issues: regResults.flatMap(r => r.issues),
    checked: regResults.flatMap(r => r.checked),
    findingFiles: regResults.map(r => r.findingsFile).filter(f => f !== ""),
  };
  lastCompares = req.pageCompares;
  log(`${label} 轮复核完成：用例 ${inter.checks.length}（VERIFIED ${casesVerified} / FAILED ${casesFailed} / UNVERIFIED ${inter.unverifiable.length}），视觉缺陷 ${visual.issues.length}（观察证据 ${visual.observations.length}），功能缺失 ${req.issues.length}，历史复发 ${reg.issues.length}`);

  const found = [...code.issues, ...inter.issues, ...visual.issues, ...req.issues, ...reg.issues];
  const findingFiles = [...code.findingFiles, ...visual.findingFiles, ...req.findingFiles];
  const r = await fixAndRegress(n, label, dir, found, findingFiles, visual.coverage, req.pageCompares, inter.findingFiles, reg.findingFiles, { tour: uiRes.tour, exec: uiRes.exec }, history);
  return { shots: uiRes.tour.shots.length, cases: inter.checks.length, found: found.length, fixed: r.fixed, commit: r.commit, pages };
}

// =====================================================================
// 轮次结构：R1 全量基线 → R2..R4 影响范围回归 → 终验全量独立审计
// =====================================================================
const roundOutcomes: { round: string; mode: string; pages: number; shots: number; cases: number; found: number; fixed: number; commit: string }[] = [];

phase("第 1 轮：全量基线审查");
const r1 = await auditRound(1, "R1", "full", []);
roundOutcomes.push({ round: "R1", mode: "baseline-full", pages: r1.pages.length, shots: r1.shots, cases: r1.cases, found: r1.found, fixed: r1.fixed, commit: r1.commit });

for (let n = 2; n <= 1 + WORKFLOW.audit.maxFixRounds; n++) {
  const openP12 = allIssues.filter(i => (i.severity === "P0" || i.severity === "P1" || i.severity === "P2") && i.status === "待修复");
  const pendingFinal = allIssues.filter(i => i.status === "已修复待终验").length;
  if (openP12.length === 0) {
    log(`第 ${n} 轮前无待修复 P0/P1/P2（待终验 ${pendingFinal} 条），提前进入终验`);
    break;
  }
  phase("影响范围回归轮");
  log(`第 ${n} 轮：改动文件 ${fixerFiles.size} 个 → Impact Graph 推导回归范围`);
  const r = await auditRound(n, "R" + n, "impact", [...fixerFiles]);
  roundOutcomes.push({ round: "R" + n, mode: "impact-regression", pages: r.pages.length, shots: r.shots, cases: r.cases, found: r.found, fixed: r.fixed, commit: r.commit });
}

// =====================================================================
// 终验：全量独立审计（全新审查员+全新证据），发现问题→修复→影响范围复验→再审
// =====================================================================
let clean = false;
for (let a = 1; a <= WORKFLOW.audit.maxFinalAuditTries && !clean; a++) {
  const label = "F" + a;
  const dir = "reports/audit/final-" + a;
  phase("最终独立全量审计");
  log(`终验第 ${a} 次：全新审查员、全新截图、全新用例执行（视同第一次拿到这个项目）`);
  let gateF = await buildGate();
  if (!gateF.ok) {
    await fixer.ask(`终验前构建未通过（错误尾部）：\n${gateF.err}\n请在你自己的终端运行 pnpm -C apps/client run build:mp-weixin:mock 修复直到通过，返回结论。`);
    gateF = await buildGate();
    if (!gateF.ok) blockers.push(`终验 F${a}: 构建未通过`);
  }
  const openPagesF = new Set(allIssues.filter(i => i.status === "待修复").map(i => i.page));
  const pagesF = openPagesF.size === 0 ? recon.pages : scopePages(recon.pages, new Set(fixerFiles), openPagesF);
  const uiF = await uiEvidence(label, dir, "final-" + a, pagesF, gateF.ok, "");
  const chunksF = makeChunks(pagesF);
  const codeFPromise = Promise.all(chunksF.map((chunk, idx) => codeChunk(label, dir, chunkKeyFor(chunk, idx), chunk, history)));
  if (uiF.tour === null || uiF.exec === null) {
    // Gate FAIL：只收代码层发现
    const codeF = await codeFPromise;
    const foundCode = codeF.flatMap(r => r.issues);
    if (foundCode.filter(i => i.severity !== "P4").length === 0) {
      clean = allIssues.filter(i => (i.severity === "P0" || i.severity === "P1" || i.severity === "P2" || i.severity === "P3") && (i.status === "待修复" || i.status === "已修复待终验")).length === 0;
      if (clean) log(`终验第 ${a} 次：Gate 受限模式下代码层无新问题，且无遗留待验项`);
      break;
    }
    await fixAndRegress(100 + a, label, dir, foundCode, codeF.map(r => r.findingsFile).filter(f => f !== ""), codeF.flatMap(r => r.coverage), [], [], [], { tour: null, exec: null }, history);
    continue;
  }
  const tourF = uiF.tour;
  const execF = uiF.exec;
  const codeF = await codeFPromise;
  const codeFSweep: CodeSweep = { issues: codeF.flatMap(r => r.issues), findingFiles: codeF.map(r => r.findingsFile).filter(f => f !== ""), coverage: codeF.flatMap(r => r.coverage) };
  const judgePromiseF = Promise.all(chunksF.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const prep = uiF.opsFiles.find(o => o.key === key);
    return judgeChunk(label, dir, key, chunk, prep && prep.file !== "" ? prep.file : dir + "/ops/", execF, history);
  }));
  const visualPromiseF = Promise.all(chunksF.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const codeFilesFor = codeFSweep.findingFiles.filter(f => f.includes(key));
    return visualChunk(label, dir, key, chunk, tourF, execF, codeFilesFor, history);
  }));
  const reqPromiseF = Promise.all(chunksF.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    return requirementChunk(label, dir, key, chunk, tourF, execF, history);
  }));
  const regPromiseF = Promise.all(chunksF.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const codeFilesFor = codeFSweep.findingFiles.filter(f => f.includes(key));
    return regressionChunk(label, dir, key, chunk, codeFilesFor, execF, tourF, history, regIndex.indexFile, [...fixerFiles]);
  }));
  const [judgeResultsF, visualResultsF, reqResultsF, regResultsF] = await Promise.all([judgePromiseF, visualPromiseF, reqPromiseF, regPromiseF]);
  const interF: JudgeSweep = { checks: judgeResultsF.flatMap(r => r.checks), issues: judgeResultsF.flatMap(r => r.issues), findingFiles: judgeResultsF.map(r => r.findingsFile).filter(f => f !== ""), unverifiable: judgeResultsF.flatMap(r => r.unverifiable) };
  const visualF: VisualSweep = { issues: visualResultsF.flatMap(r => r.issues), findingFiles: visualResultsF.map(r => r.findingsFile).filter(f => f !== ""), observations: visualResultsF.flatMap(r => r.observations), coverage: visualResultsF.flatMap(r => r.coverage) };
  const reqF: ReqSweep = { issues: reqResultsF.flatMap(r => r.issues), pageCompares: reqResultsF.flatMap(r => r.pageCompares), findingFiles: reqResultsF.map(r => r.findingsFile).filter(f => f !== "") };
  const regF: RegSweep = { issues: regResultsF.flatMap(r => r.issues), checked: regResultsF.flatMap(r => r.checked), findingFiles: regResultsF.map(r => r.findingsFile).filter(f => f !== "") };
  lastCompares = reqF.pageCompares;
  await scribeRound(`书记员-${label}`, dir, [...codeFSweep.findingFiles, ...visualF.findingFiles, ...reqF.findingFiles], visualF.coverage, reqF.pageCompares, interF.findingFiles, regF.findingFiles, history);

  const foundF = [...codeFSweep.issues, ...interF.issues, ...visualF.issues, ...reqF.issues, ...regF.issues];
  const actionable = foundF.filter(i => (i.severity === "P0" || i.severity === "P1" || i.severity === "P2" || i.severity === "P3") && i.status === "待修复");
  if (actionable.length === 0) {
    clean = true;
    log(`终验通过：第 ${a} 次全量独立审计未发现新的可证明问题（证据落盘 ${dir}）`);
    break;
  }
  log(`终验发现 ${actionable.length} 个可行动问题（P0 ${cnt(actionable, "P0")} / P1 ${cnt(actionable, "P1")} / P2 ${cnt(actionable, "P2")} / P3 ${cnt(actionable, "P3")}）→ 修复 + 影响范围复验`);
  await fixAndRegress(100 + a, label, dir, foundF, [...codeFSweep.findingFiles, ...visualF.findingFiles, ...reqF.findingFiles], visualF.coverage, reqF.pageCompares, interF.findingFiles, regF.findingFiles, { tour: tourF, exec: execF }, history);
}
if (!clean) {
  blockers.push(`终验 ${WORKFLOW.audit.maxFinalAuditTries} 次后仍发现问题`);
}

// =====================================================================
// 最终回归与总报告
// =====================================================================
phase("最终回归与总报告");
// P3「已修复待终验」终验：修复验证员定向验证
const p3Pending = allIssues.filter(i => i.status === "已修复待终验");
if (p3Pending.length > 0) {
  const verP3 = await verifier.ask<VerifyResult>(
    [
      `终验阶段：验证 ${p3Pending.length} 条「已修复待终验」的 P3（视觉/细节类，全部在此刻定向复验）：`,
      JSON.stringify(p3Pending.map(i => ({ id: i.id, page: i.page, description: i.description, screenshot: i.screenshot }))),
      `用 r11-reshoot 定向补拍模式只截受影响页面（reports/screenshots/final-p3/），逐条对照是否消失；verifiedIds 只放确认消失的，failed 写原因。`,
    ].join("\n"),
  );
  for (const id of verP3.verifiedIds) {
    const it = findIssue(id);
    if (it) {
      it.status = "已验证";
      pushBoard(it);
    }
  }
}
const openP0 = allIssues.filter(i => i.severity === "P0" && i.status === "待修复").length;
const openP1 = allIssues.filter(i => i.severity === "P1" && i.status === "待修复").length;
const openRegression = allIssues.filter(i => i.category === "Regression" && i.status === "待修复").length;
const counts = { P0: cnt(allIssues, "P0"), P1: cnt(allIssues, "P1"), P2: cnt(allIssues, "P2"), P3: cnt(allIssues, "P3"), P4: cnt(allIssues, "P4") };
const officer = agent("总验收官", "你负责最终验收。怀疑一切：默认项目仍有问题，只有证据充分才判通过，证据不足的如实标注。");
const finalRes = await officer.ask<FinalReport>(
  [
    `对整个 QA 闭环做最终验收并写总报告。`,
    `轮次结构（R1 基线全量 → R2+ 影响范围回归 → F 终验全量独立审计）：${JSON.stringify(roundOutcomes)}`,
    `问题总账：${JSON.stringify(counts)}；待修复 P0=${openP0} P1=${openP1} 历史回归=${openRegression}；终验${clean ? "已通过" : "未完全通过"}；截图 ${totalShots}；用例 ${totalCases}（VERIFIED ${casesVerified} / FAILED ${casesFailed} / UNVERIFIED ${interactUnverifiable.length}）。`,
    `每页使用对比（终验轮）：${JSON.stringify(lastCompares.map(c => ({ route: c.route, verdict: c.verdict, gaps: c.functionGaps.length, file: c.file })))}`,
    `脚本已判定的停止条件：${JSON.stringify({ roundsDone: roundOutcomes.length, independentClean: clean, openP0, openP1, openRegression, envBlockers: blockers })}`,
    `任务：`,
    `1. 逐条核验历史问题清单（${history.listFile}）回归状态（可用回归索引 ${regIndex.indexFile} 差分），写历史回归表。`,
    `2. 验证核心链路 A–H（尽量 automator 实测，跑不了的如实标 UNVERIFIED，禁止谎报）：A 浏览 登录→首页→附近→查看人→内容→返回；B 匹配 寻觅→喜欢→匹配成功→聊天；C 圈子 附近→兴趣圈→圈子详情（冷启动直连）→帖子→详情→评论；D 校园 附近→校园圈→内容→返回；E 发布 发布→编辑→预览→发布→我的帖子；F 消息 消息→会话→聊天→输入→返回（未读清零）；G 资料 我的→编辑资料→保存；H 新用户 注册→向导→实名→完成度。`,
    `3. 六道 Gate（每项 PASS/FAIL/BLOCKED + 证据）：G1 构建（0 error/体积/无 mock 泄漏）；G2 静态守卫（构建检查链+typecheck+eslint）；G3 页面覆盖（截图矩阵无空白/骨架、console error=0）；G4 交互覆盖（用例判定通过率、死按钮=0）；G5 数据合规（封存页无价格/币泄漏）；G6 证据可信（同轮证据同 gitSha、链路 PASS、历史回归 0 复发）。`,
    `4. 汇总每页使用对比为「功能目标完成情况」表（Page/Target/Implemented/Missing/使用对比结论）。`,
    `5. 写 reports/audit/final/final-report.md：一、项目状态（页面/截图/用例/问题/轮次结构）；二、每页最终问题表；三、历史回归表；四、各轮表（轮次/模式/范围/发现/修复/提交）；五、功能目标完成情况；六、六道 Gate 与小程序专项（viewport/safe-area/TabBar/scroll/keyboard/modal/navigation/performance）；七、最终遗留项（无则 None）。`,
    `6. 最终截图集整理到 reports/final/。`,
    `blockers 列所有未达成验收条件，没有才空数组。reportPath 返回报告路径。`,
  ].join("\n"),
);

// 发布最终报告
let published = false;
try {
  await artifact.file("final-report", finalRes.reportPath, { title: "小程序 QA 闭环最终验收报告", description: `${roundOutcomes.length} 轮（含终验）、${totalShots} 张截图、${totalCases} 条用例、${allIssues.length} 个问题`, primary: true });
  published = true;
} catch {
  log(`最终报告发布失败（${finalRes.reportPath}），请总验收官确认路径`);
  const fixPath = await officer.ask<FinalReport>(`发布时找不到 ${finalRes.reportPath}。请确认报告已写到该路径（或修正路径重写），重新返回 reportPath。`);
  try {
    await artifact.file("final-report", fixPath.reportPath, { title: "小程序 QA 闭环最终验收报告", description: `${roundOutcomes.length} 轮（含终验）、${totalShots} 张截图、${totalCases} 条用例、${allIssues.length} 个问题`, primary: true });
    published = true;
  } catch {
    blockers.push(`最终报告文件 ${fixPath.reportPath} 无法发布`);
  }
}
if (!published) {
  await artifact.markdown(
    "final-report-md",
    [
      "# 小程序 QA 闭环最终验收报告（要点）",
      "",
      `- 轮次结构：${roundOutcomes.map(r => r.round + "(" + r.mode + ")").join(" → ")}；终验${clean ? "通过" : "未完全通过"}`,
      `- 截图 ${totalShots}；用例 ${totalCases}（VERIFIED ${casesVerified} / FAILED ${casesFailed} / UNVERIFIED ${interactUnverifiable.length}）`,
      `- 问题总账：${JSON.stringify(counts)}；待修复 P0=${openP0} P1=${openP1}`,
      `- 提交：${roundOutcomes.map(r => r.round + " " + r.commit).filter(c => !c.endsWith(": ")).join("、") || "（无）"}`,
      `- 阻塞项：${[...blockers, ...finalRes.blockers].join("；") || "无"}`,
      "",
      "完整报告发布失败，详见 reports/audit/final/。",
    ].join("\n"),
    { title: "小程序 QA 闭环最终验收报告（要点）" },
  );
}

const accepted = clean && openP0 === 0 && openP1 === 0 && finalRes.blockers.length === 0 && blockers.length === 0;
const allBlockers = [...new Set([...blockers, ...finalRes.blockers])];
const openIssues = allIssues.filter(i => i.status === "待修复" || i.status === "已修复待终验");
function sevToImp(s: string): "high" | "medium" | "low" {
  if (s === "P0" || s === "P1") return "high";
  if (s === "P2") return "medium";
  return "low";
}
const findings: Finding[] = openIssues.slice(0, 50).map((i): Finding => ({
  where: i.page,
  what: `[${i.severity}][${i.category}][置信${i.confidence}] ${i.description}`,
  evidence: i.evidence || i.screenshot || "见 findings 文件",
  status: "unconfirmed",
  severity: sevToImp(i.severity),
}));
const commits = roundOutcomes.map(r => r.round + ":" + r.commit).filter(c => !c.endsWith(":"));
const result: WorkflowReport = {
  conclusion: accepted
    ? `已通过最终验收：轮次结构 ${roundOutcomes.map(r => r.round).join("→")}（终验通过），${allIssues.length} 个问题全部处置（P0 ${counts.P0}/P1 ${counts.P1}/P2 ${counts.P2}/P3 ${counts.P3}/P4 ${counts.P4}），${totalShots} 张截图、${totalCases} 条用例（VERIFIED ${casesVerified}/FAILED ${casesFailed}），影响范围回归+终验全量独立审计完成。提交 ${commits.length} 个。报告：${finalRes.reportPath}`
    : `未通过最终验收：${allBlockers.join("；") || "仍有待修复问题"}。剩余 ${openIssues.length} 条（P0 ${openP0}、P1 ${openP1}、待终验 P3 ${p3Pending.length}）。报告：${finalRes.reportPath}`,
  findings,
  verified: [
    `轮次结构化执行：R1 全量基线 → 影响范围回归轮（Impact Graph：改动文件→组件→页面→用例）→ 终验全量独立审计（全新审查员+全新证据）`,
    `每轮构建门禁 build:mp-weixin:mock + 修复后 typecheck（Gate G1/G2 快速失败：FAIL 时禁止新 UI 会话）`,
    `A1 UI Driver 凭 UI Lock 状态机（LEASED/STALE，lease ${WORKFLOW.ui.leaseMinutes}min/heartbeat ${WORKFLOW.ui.heartbeatSeconds}s）独占 9420；Suite+Checkpoint 分段；三级重置（reLaunch 每 Suite ≤${WORKFLOW.ui.maxReLaunchPerSuite} 次）`,
    `${totalCases} 条固定结构用例（PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS）按证据预算采集（critical=前后截图/navigation=路由/noop=日志），A6 交互判定员三方仲裁（Manifest vs 执行结果 vs 截图）`,
    `Finding 四层标准化（severity/status/confidence/sources）；观察证据制（每页必有观察，不强制凑缺陷）`,
    `证据缓存绑定 gitSha=${gitSha}（manifest 校验，过期证据不作为结论依据）`,
    `修复分级回归：P0/P1 立即定向、P2 批量、P3 终验统一验证；A5 历史回归用 regression-index 差分（${regIndex.entries} 条索引）`,
    `Git 固化：${commits.join("、") || "（无提交，见 blockers）"}`,
  ],
  notCovered: [
    ...captureFailures.slice(0, 20),
    ...interactUnverifiable.slice(0, 20),
    ...finalRes.chains.filter(c => c.result !== "通过").map(c => `核心链路未实测：${c.chain}（${c.evidence}）`),
    `P4 优化项 ${counts.P4} 个保留为 backlog`,
    ...(openIssues.length > 50 ? [`仅列出前 50 条遗留，其余见最终报告`] : []),
  ],
};
return result;
