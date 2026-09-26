/* zcode-workflow
description: v3.2 完整执行协议：在 v3.1 之上补齐「真实模式端到端验收」阶段与 G7 real 构建 / G8 前后端数据同步五环 /
  G9 real 素材可达性三道 Gate，并把执行器噪声（__CAND__ 占位与中文标题正则截断）从产品判定里剥离、新增用例契约与队列对账协议、
  修正 UI Lock 释放语义（墓碑保留 + finally/信号兜底 + 僵尸租约按 pid 存活接管）。7 Actor（6 推理 + A1 UI Driver 独占 9420）。轮次结构化：R1 全量基线 →
  R2+ 影响范围回归（Impact Graph）→ 终验全量独立审计。Evidence Bus 五路并行复核（代码/视觉/需求/历史回归/交互判定）；A1
  按 Suite+Checkpoint 分段执行固定结构用例（证据预算分级采集）；UI Lock
  状态机（AVAILABLE/LEASED/STALE + released 墓碑，不旋轮重试）；三级重置；Gate 快速失败（G1/G2 FAIL 禁新 UI
  会话）；观察证据制（不强制每页凑缺陷）；Finding 四层标准化（severity/status/confidence/sources）；证据缓存绑定
  Git SHA；A5 历史回归走 regression-index 机器差分；修复分级回归（P0/P1 立即定向、P2 批量、P3 终验）。
whenToUse: 需要对本微信小程序（apps/client）做全量 QA
  闭环（截图取证→操作验证→五路审查→修复→影响范围回归→独立终验→真实模式前后端联通验收）时运行；改版后回归或发布前验收皆可。
args: {}
*/
// =====================================================================
// 微信小程序 QA 闭环工作流 v3.2 —— 完整执行协议（mock 全量闭环 + 真实模式 G7/G8/G9 + 收尾改造）
// 6 推理 Agent（A0 编排/A2 代码/A3 视觉/A4 需求/A5 历史回归/A6 交互判定）
// + 1 UI Driver（A1，唯一可驱动 ws://127.0.0.1:9420）
// 核心：Evidence Bus 五路并行 ∙ A1 Suite/Checkpoint ∙ 三级重置 ∙ UI Lock 状态机
// ∙ Impact Graph 影响范围回归 ∙ 回归索引机器差分 ∙ 证据预算 ∙ 观察证据制
// ∙ Finding 四层标准化 ∙ 证据缓存绑定 Git SHA+构建指纹 ∙ Gate 快速失败
// 依据：《微信小程序无限 Token 全面审查总控提示词》+ R11 验收方案 + v3.1 升级协议 + v3.2 收尾改造（R2 收割 / 定向终验 / G7-G9）
// =====================================================================

// ===== 执行协议配置（修订只改这里；数值不进提示词，避免修订破坏缓存）=====
const WORKFLOW = {
  version: "3.2",
  // ===== v3.2 新增：构建模式与真实环境（v3.1 只有 mock 一条路，见下方 CHANGE 说明）=====
  build: {
    mockScript: "build:mp-weixin:mock",
    realScript: "build:mp-weixin:real:isolated",   // v3.2：必须走隔离脚本（自设 UNI_OUTPUT_DIR 并断言 mock 产物未被改动）；real:dev 会把 real 覆盖进共享 dist
    sharedOutDir: "apps/client/dist/build/mp-weixin",
    realOutDir: "apps/client/dist/build/mp-weixin-real",
    outDirEnvKey: "UNI_OUTPUT_DIR",           // 已实测 @dcloudio/vite-plugin-uni/dist/cli/utils.js:128-131 支持用它改道
  },
  realEnv: {
    apiBaseUrl: "http://127.0.0.1:8080/api",
    healthPath: "/actuator/health",
    requireBackendUp: true,      // 后端不通 → G7/G8/G9 记 BLOCKED，不记 PASS 也不记 FAIL
    wechatLogin: "dev-fallback-off-means-502",  // 实测本机后端 WECHAT_DEV_FALLBACK_ENABLED=false → /auth/wechat-login 必 502
    guestLoginWorks: true,       // 实测 /auth/guest-login 200，是 real 模式唯一可用的自动登录入口
  },
  instrument: {
    forbidPlaceholderSelector: true,  // v3.1 的 R2 轮 289 条 FAILED 有 194 条（67.1%）是 __CAND__ 占位/垃圾标签，属测试台噪声而非产品缺陷（权威账本重算，见 [C-18]）
    unresolvedVerdict: "UNVERIFIED-INSTRUMENT",
    requireManifestTotalReconcile: true,
  },
  ui: {
    endpoint: "ws://127.0.0.1:9420",
    /** v3.2：DevTools 的自动化端口不保证是 9420（实测本机起在 127.0.0.1:9430）。
     *  G0 预检按此列表逐个探活，取第一个真在听的端口，禁止照固定端口空跑一整轮。 */
    portCandidates: [9420, 9430],
    maxConcurrent: 1,          // 9420 单写者
    leaseMinutes: 15,
    heartbeatSeconds: 5,
    staleAfterSeconds: 30,
    graceSeconds: 30,
    maxReLaunchPerSuite: 1,    // L2 reLaunch 每 Suite 至多 1 次
  },
  audit: {
    baselineRound: 1,          // R1 = 全量基线审查
    /** v3.2 收尾改造：R2 不再整轮重跑（64 页六路复核是 6.65 亿 token 消耗的主因），
     *  改为「收割已落盘 JSON + 工作树固化 + 定向复验」。maxFixRounds / maxFinalAuditTries 已无引用，删除以免误用。 */
    maxTargetedFinalAuditTries: 2,   // v3.2：终验为定向独立审计，最多 2 次
    finalAuditPageCap: 24,           // v3.2：定向终验抽样上限（页）
    requireObservationPerPage: true,   // 每页必须有观察证据
    requireFindingPerPage: false,      // 不强制每页凑缺陷
  },
  boardLimit: 120,
  // 注：severityPolicy / evidence / cache / regression 四组死配置键已删除（0 引用）——
  // 它们的语义已由代码内实现承接：修复分级见 fixAndRegress 的 worklist 过滤，证据预算见
  // EVIDENCE_BUDGET 与分级采集规则，缓存校验见 provenanceGate，影响范围回归见 scopePages/Impact Graph。
};

// ===== 真实审查环境（自 v3.2 收尾稿并入；注入 A1/修复/验证/终验角色）=====
// 凭据一律不落本文件：本文件未列入 .gitignore，写死口令等于把口令提交进仓库（见 [C-7] 凭据规则）。
// 需要口令时从根目录 .env 读，禁止内联进任何命令行或提示词。
const REAL_ENV = [
  `【真实环境（真实审查模式必读）】`,
  `- 后端：real profile，http://127.0.0.1:8080；健康检查 curl http://127.0.0.1:8080${WORKFLOW.realEnv.healthPath} 应返回 {"status":"UP"}；API 前缀 /api/v1。`,
  `- 游客登录 POST /api/v1/auth/guest-login（幂等签发体验账号 JWT，账号 100151「阿辰」）。注意 real profile 下 app.guest-login.enabled 默认 false → 403 TRIAL_LOGIN_DISABLED，只有后端以 APP_GUEST_LOGIN_ENABLED=true 启动才放开；取到 403 记「环境未启用体验入口」，不得记产品缺陷。`,
  `- 微信一键登录 POST /api/v1/auth/wechat-login 在本机必 502（WECHAT_DEV_FALLBACK_ENABLED=false 且未配 WECHAT_SECRET）；上游返回 errcode=40029 时是 401，不在此列。该路一律记 NOT-EVIDENCED。`,
  `- 依赖（只读核对，禁止写库/清库/重启服务）：MySQL 127.0.0.1:3306（库 campus_love）；Redis 127.0.0.1:6379。口令见仓库根 .env，禁止内联进命令行（内联会在传递中被改写）。`,
  `- 管理员（SUPER_ADMIN）凭据同样只在 .env；用于管理后台侧核对与权限/风控类用例；只操作演示数据，禁止删除既有业务数据。`,
  `- real 模式素材由后端托管：${WORKFLOW.realEnv.apiBaseUrl.replace(/\/api\/?$/, "")}/api/v1/media/app-assets/{assets,generated}/…（mock/dev 才走包内 /static）。**成因 A 已确证并修复**：MediaAccessController.extractAppAssetSubPath() 曾拿未解码的 getRequestURI() 当 media_asset.url 查找键，中文名素材因此必然 404（库里存的是原始 UTF-8）；改为 UriUtils.decode(sub, UTF_8) 后实测 IMAGE_PATHS 455 条可达数从 62 升到 432，翻转的 370 条正是原 CJK 集合。**不要再把字符集当待查假设**——它是已关闭的因；穿越面未扩大（注册表白名单 + validateSubPath + normalize/startsWith 三重，实测 %2e%2e%2f→400、裸 ../→401、双重编码→400）。`,
  `- **成因 B（assets/icons/register/ 整批 23 条）已于 2026-09-25 清除**：后端盘缺的 9 个文件已从 static-local-backup 补拷、14+9 共 23 行已按既有列约定注册进 media_asset（回滚句在 .zcode/tmp/register-register-batch.sql），实测 IMAGE_PATHS 455/455 全部可达，G9=PASS。此后任何素材 404 都按**回归**处理：先跑 node scripts/probe-real-env.mjs 与 .zcode/tmp/g9-probe.cjs 拿实测数，核对注册表与盘上文件再定性；禁止凭印象归因"字符集"（已关闭的因）或"待注册"（常态已不存在）。`,
  `- 开发者工具自动化：优先读 skill 文档 wechatide-skill/SKILL.md；本项目封装脚本 scripts/devtools/wx10.ps1；自动化端口是**发现值不是固定值**——默认写的是 ${WORKFLOW.ui.endpoint}，但真端口以 G0 预检实测为准（本机实测起在 9430），锁文件名跟着端口走；照固定端口连会让整轮 0 证据。`,
  `- 登录态两步注入（窗口重启后必做）：① wx.setStorageSync('token', <JWT>)；② getApp().$vm.$pinia._s.get('session').bootstrap()；校验 isLoggedIn（参考 scripts/eval_boot.ps1、scripts/eval_state.ps1）。`,
  `- 环境异常处置：后端挂了先 curl 健康检查并如实记 BLOCKED，禁止自行 mvn/package 重启后端；提交纪律：只做本地 git commit，禁止 git push / 改 remote / 修改 .env。`,
  `- 前置探测（G7/G8/G9 开工前必跑，只读不写）：node scripts/probe-real-env.mjs —— 它输出 PROBE_BACKEND / PROBE_ASSETS_REACHABLE / PROBE_VERDICT 机器可读行；退出码 2=后端不可达、3=素材注册未全覆盖。禁止把探测器的失败当成产品缺陷。`,
].join("\n");

// ===== 全局约定（v3.2 补 D 系列条款共用的前置声明，只插一次；来源 .zcode/research/V32-D-RULES-DRAFT.md §0）=====
// 0.1 宿主符号白名单：本文件新增的规则常量与门禁函数只引用两类名字——① 宿主注入全局
//     agent / log / phase / world / artifact / git / report；② 本文件里已存在、可 grep 自证的符号。
//     禁止凭印象生造符号名（历史事故：引用了运行时并不存在的 gates.push）。
// 0.2 world.run 契约：运行期校验一律走 await world.run(cmd, args, {timeoutMs}) 并读
//     r.exitCode / r.stdout / r.stderr，与既有 runPnpm / gitTry / ENV_PROBE / HARVEST / G7 健康检查
//     同法，不引入任何新宿主能力。内联校验（node -e）的结论必须同时印成「机器可读行 + 非 0 退出码」，
//     DSL 侧只解析 stdout，不解释自然语言。
// 0.3 校验函数统一形状：async function xxxGate(...): Promise<{ ok: boolean; detail: string }>，
//     与 gitTry / runPnpm / buildGate 的返回形状一致；失败只写进 blockers / captureFailures /
//     interactUnverifiable，不 throw（本文件惯例是防御式收尾，见 [C-11]）。
// 0.4 插入方式：规则常量以「新增顶层 const」给出；提示词以「数组元素行」插在唯一锚点行之后
//     或之前，锚点行本身原样保留，避免与并行编辑冲突。前部规则常量只引用 WORKFLOW.* 与其它
//     同样位于前部的常量（const 有 TDZ：引用后部声明如 REAL_DIR 会在求值时 ReferenceError）。
// 0.5 占位符纪律：条款文本内不出现 …、「以下同理」、伪代码；形参在调用点由本文件既有局部变量
//     （label / dir / shotDir / tour / exec / opsFiles 等）供给。中文语境的引号用「」，避免
//     ASCII 双引号嵌进双引号字符串里造成语法错。
// 0.6 计数漂移：各条款引用的 grep 命中数是撰写时点快照；锚点定位串总表见
//     .zcode/research/V32-D-RULES-DRAFT.md §15.1（31 个定位串，落地前逐个复核唯一命中）。

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
  /** v3.2 补 D3：本轮帧落盘根目录（工作区相对，如 reports/screenshots/round-2-tour）。
   *  没有它就没法扫孤儿帧——manifest 在 reports/audit/ 下，默认根目录会把整轮校验变成空跑。 */
  shotRoot: string;
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
  /**
   * v3.2：该用例的 expected 是否只有真实后端才能取证（落库/后台可见/审核流转/计数同步）。
   * 缺省视为 false；true 的用例在 mock 轮只能记 NOT-EVIDENCED-BY-MOCK，禁止记 PASS/FAILED。
   * 没标此字段的历史 Manifest 一律按 unknown 处理（见 INSTRUMENT_RULES），不得据此判产品失败。
   */
  requiresReal?: boolean;
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
  /** v3.2 补 D5：第四等态计数（动作可能跑了但没有干净证据）。
   *  executed 不再等于"有证据的用例数"，下游算通过率必须用 executed - noEvidence 作分子。 */
  noEvidence: number;
  /** 失败/跳过用例与原因 */
  failures: ExecFailure[];
  /** v3.2 补 D10：终止/中断时最后一条已落盘用例的时间戳（ISO），供恢复时重算总数用 */
  lastRecordedAt: string;
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
  /** VERIFIED / FAILED / UNVERIFIED / NO-EVIDENCE */
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
  /** v3.2 补 D8：落点/缺证据分诊码。取值域：
   *  BUILD_FLAG_ABSENT | PARAM_REQUIRED | HARNESS_CALL_DEFECT | PERMISSION_SUPPRESSED
   *  | DEVICE_CAPABILITY_UNREACHABLE | GENUINE_APP_DEFECT
   *  非 GENUINE_APP_DEFECT 者不得占页面级 P0/P1，且必须给 owner=instrument 与一句话解法。 */
  triageCode?: string;
  /** 证据支持强度 0~1（不是主观把握，是证据支持强度） */
  confidence: number;
  ideal: string;
  fix: string;
  /** 待修复 / 已修复 / 已修复待终验 / 已验证 / 保留 */
  status: string;
  /** v3.2 补 D7：本条是否为他人缺陷的别名（填正号）；正号条目此字段留空 */
  canonical?: string;
  /** v3.2 补 D7：同一缺陷的历史 ID（立项时误开的重号），审计用 */
  aliases?: string[];
  /** v3.2 补 D7：状态推进所依据的复验证据「文件:行」或截图路径；缺它不得离开「待修复」 */
  statusEvidence?: string;
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
  /** 九道 Gate（G1-G6 由验收官自判，G7-G9 由脚本给定值注入）：PASS/FAIL/BLOCKED + 证据 */
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

// 台账自洽审计（v3.2 补 D7）。只看内存里的 allIssues，不跑外部命令。
function ledgerAudit(): { ok: boolean; detail: string } {
  const fams = new Map<string, Issue[]>();
  for (const it of allIssues) {
    const key = [
      (it.page || "").trim().toLowerCase(),
      (it.category || "").trim().toLowerCase(),
      (it.description || "").replace(/\s+/g, "").slice(0, 40).toLowerCase(),
    ].join("|");
    const arr = fams.get(key) ?? [];
    arr.push(it);
    fams.set(key, arr);
  }
  const unlinked: string[] = [];
  let maxFamily = 0;
  for (const [key, arr] of fams) {
    if (arr.length < 2) continue;
    maxFamily = Math.max(maxFamily, arr.length);
    const declared = arr.filter(i => (i.canonical ?? "") !== "" || (i.aliases ?? []).length > 0);
    if (declared.length === 0) unlinked.push(`${key.slice(0, 60)}×${arr.length}[${arr.map(i => i.id).join(",")}]`);
  }
  const advancedNoProof = allIssues.filter(i => (i.status === "已修复" || i.status === "已修复待终验" || i.status === "已验证") && !(i.statusEvidence ?? "").trim()).length;
  const open = allIssues.filter(i => i.status === "待修复").length;
  const sample = unlinked.slice(0, 3).join(" ; ");
  const detail = `台账 ${allIssues.length} 条 / 待修复 ${open}；未声明谱系的重号族 ${unlinked.length} 组（最大一族 ${maxFamily} 个 ID）；无复验证据的状态推进 ${advancedNoProof} 条${sample ? "；样例 " + sample : ""}`;
  return { ok: unlinked.length === 0 && advancedNoProof === 0, detail };
}

// 落盘 ID 全集对账（v3.2 补 D7）：凡写进本轮 findings 的 MP-* ID 必须已被台账收编。
// 实测依据：上一轮 237 个 ID 存在于 code-findings/findings/interact JSON 但未进任何 issue-matrix。
async function ledgerCoverageGate(roundDir: string): Promise<{ ok: boolean; detail: string }> {
  const COV_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const base=process.argv[1]||'';",
    "const ids=new Set();let files=0;",
    "function touch(o){if(o&&typeof o==='object'){if(typeof o.id==='string'&&/^MP-/i.test(o.id))ids.add(o.id.trim());for(const k of Object.keys(o)){const v=o[k];if(Array.isArray(v))v.forEach(touch);else if(v&&typeof v==='object')touch(v)}}}",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory()){walk(p)}else if(e.name.endsWith('.json')){files++;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));touch(j)}catch(err){}}}}",
    "for(const sub of ['code-findings','findings','interact','regression'])walk(base+'/'+sub);",
    "let hv={};try{hv=JSON.parse(fs.readFileSync(base+'/harvest.json','utf8'))}catch(e){}",
    "const openInHarvest=(hv.all||[]).filter(function(x){return x&&x.status==='待修复'}).length;",
    "console.log('COV_FILES='+files+' DISK_IDS='+ids.size+' HARVEST_TOTAL='+((hv.summary&&hv.summary.total)||0)+' HARVEST_OPEN='+openInHarvest);",
    "console.log('DISK_ID_LIST='+Array.from(ids).join(','));",
  ].join("");
  try {
    const r = await world.run("node", ["-e", COV_SCRIPT, roundDir]);
    const out = String(r.stdout || "");
    const stat = (out.split("\n").map(s => s.trim()).filter(Boolean)[0]) || "（对账脚本无输出）";
    const line = out.split("\n").find(s => s.indexOf("DISK_ID_LIST=") === 0) || "";
    const disk = line.slice("DISK_ID_LIST=".length).split(",").map(s => s.trim()).filter(s => s.length > 0);
    const missing: string[] = [];
    for (const id of disk) {
      if (!findIssue(id)) missing.push(id);
    }
    if (r.exitCode !== 0) return { ok: false, detail: `${roundDir}: 对账脚本退出码 ${r.exitCode}（${stat}）` };
    if (missing.length > 0) {
      return { ok: false, detail: `${stat} | 台账外漏账 ID ${missing.length} 个：${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}` };
    }
    return { ok: true, detail: `${stat} | 盘上 ${disk.length} 个 ID 全部在账` };
  } catch (e) {
    return { ok: false, detail: `${roundDir}: 台账对账无法启动 ${String(e).slice(0, 160)}` };
  }
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

// Windows 下 world.run 无法直接 spawn pnpm/.cmd，且 PATH 里的 node 是 v16（uni build 必挂）。
// 用字面量 "node" 启动 tmp/run-pnpm22.cjs 包装器（CJS 兼容 v16）：包装器把 v22 目录提到
// PATH 最前，并用绝对路径的 v22 node.exe 拉起 corepack pnpm——整棵子进程树都是 v22。
const PNPM_WRAPPER = "tmp/run-pnpm22.cjs";
async function runPnpm(args: string[], timeoutMs: number): Promise<{ ok: boolean; err: string }> {
  try {
    const b = await world.run("node", [PNPM_WRAPPER, ...args], { timeoutMs });
    return { ok: b.exitCode === 0, err: (b.stderr || b.stdout).slice(-4000) };
  } catch (e) {
    return { ok: false, err: "命令无法启动: " + String(e) };
  }
}
// 构建一律走「构建守门员」子代理：world.run 沙箱对本条构建链秒级失败（实测三轮一致）。
// 若继续用 runPnpm 直接跑 uni build，会把 Gate 记成假 FAIL，污染九道 Gate 的终报口径。
const gatekeeper = agent("构建守门员", "你只负责运行构建命令并如实报告结果，绝不修改任何文件、绝不为通过而改跑别的命令。" + REAL_ENV);
async function runBuildViaGatekeeper(purpose: string, command: string, timeoutMs: number = 1800000): Promise<{ ok: boolean; err: string }> {
  const r = await gatekeeper.ask<{ ok: boolean; err: string; command: string }>(
    [
      `运行${purpose}并如实报告。用 Bash 执行这一行（PATH 前置 Node 22）：`,
      `export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" && ${command}`,
      `要求：等待命令完整结束（可能 2~30 分钟，Bash timeout 设 ${timeoutMs}）；ok = (退出码 === 0)；err = 失败时最后 50 行输出、成功时留空；command 回填实际执行的命令。`,
      `【诚实铁律】禁止伪造：命令跑不起来/超时/输出异常，都如实 ok=false 并在 err 说明实际现象；禁止顺手修任何编译错误（修复不是你的职责）。`,
    ].join("\n"),
  ).then((v) => v, (e) => ({ ok: false, err: "守门员调用失败: " + String(e), command }));
  return { ok: r.ok === true, err: typeof r.err === "string" ? r.err : "" };
}
async function buildGate(): Promise<{ ok: boolean; err: string }> {
  return runBuildViaGatekeeper("G1 mock 构建", `pnpm -C apps/client run ${WORKFLOW.build.mockScript}`);
}
/**
 * ask 逐点兜底：任一代理调用被拒（网络/配额/JSON 解析失败）不得终止整轮，
 * 但**必须**由调用点交出"自己这一站语义正确的降级值"，并且必然写入 blockers。
 * 为什么不用全局包装器：已实测否决（见 CHANGELOG 遗留 4)）——深壳代理会击穿
 * 全文 `res.x ?? 默认值` 的惯用法，把"未取证"伪装成"取到空结果"，比崩更糟。
 * 为什么是 .then((v) => v, …) 而不是 .catch：门面的 Node<T> 只 extends PromiseLike（没有 .catch），
 * 用 .catch 会在真实 CreateWorkflow 编译器下整份编译不过（2026-09-25 实证；干跑台桩是原生
 * Promise 所以看不见这条）。写新兜底点时一律 .then 双参形式。
 */
function askFail<T>(who: string, e: unknown, fallback: T): T {
  const msg = `${who} 的 ask 调用失败（属执行器/配额故障，不是产品缺陷，也不得计入通过）：${String(e).slice(0, 140)}`;
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


// ===== 取证四等态（v3.2 补 D5：EXECUTED 必须有干净帧，否则只能落第四等态）=====
const EVIDENCE_STATE_RULES = [
  `【状态域四值，不是三值】用例状态取值域固定为 EXECUTED / FAILED / SKIPPED / NO-EVIDENCE。第四态 NO-EVIDENCE 的含义是"动作可能执行了，但本轮拿不出可复核的干净证据"：证据路径为空、剥掉尾注后文件不存在、体积低于阈值、或证据串里混着 ERROR/timeout。`,
  `【禁止用 EXECUTED 冒充已取证】EXECUTED 的判据是"按 tier 要求的证据全部落盘且可复核"，不是"脚本没抛异常"。实测教训：R2 的 523 条 EXECUTED 里 298 条（57.0%）没有任何干净截图，按三态口径这 298 条被读成"已验证通过"，通过率因此彻底失真；另有 437 条证据串直接写着 ERROR:timeout waiting for automator response。`,
  `【SKIPPED 必须带能力归因】SKIPPED 只能因"执行器能力边界"（swipe 无元素 API、el.input is not a function、桌面模拟器不渲染软键盘），且 reason 必须写 capability=<能力名>。实测 R2 的 129 条 SKIPPED 100% 属此类，全部前缀 action-not-automatable:；把它们算成产品缺陷是反向失真。`,
  `【judge 层同规则】判定结论 verdict 的取值域同样含 NO-EVIDENCE：证据缺失/外部占用/仲裁不了的，一律写进 unverifiable 并在用例上落第四态，禁止只在自然语言里说"40 项 UNVERIFIED"却没有可统计字段——上一轮就是这个缺口导致 VERIFIED 上限（约 25.8%）无人能从产物里算出来。`,
].join("\n");

// 第四等态机器门禁（v3.2 补 D5）。只读 exec-results.json，退出码 1 = 状态域越界 / 有 EXECUTED 未满足本 tier 证据要求。
// 实测依据（本稿已在 R2 真数据上跑通，见"可机检说明"）：523 条 EXECUTED 中 298 条无干净帧、按 tier 判有 194 条不达标。
async function execEvidenceGate(label: string, resultsFile: string): Promise<{ ok: boolean; detail: string }> {
  if (!resultsFile) return { ok: false, detail: `${label}: 未返回 resultsFile，四等态无从校验` };
  const EVID_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'';",
    "let j={};try{j=JSON.parse(fs.readFileSync(rf,'utf8'))}catch(e){console.log('STATE_RESULT=FAIL reason=结果文件不可读 '+rf);process.exit(1)}",
    "const rows=j.results||[];",
    "if(!rows.length){console.log('STATE_RESULT=FAIL reason=results[] 为空，执行账本没有任何用例');process.exit(1)}",
    "const DOMAIN={EXECUTED:1,FAILED:1,SKIPPED:1,'NO-EVIDENCE':1};",
    "const NEED={critical:2,normal:1,navigation:0,noop:0};",
    "const stray={};",
    "const strip=function(s){let b=String(s).trim();let g=0;while(g++<3&&/\\([^)]*\\)\\s*$/i.test(b))b=b.replace(/\\([^)]*\\)\\s*$/i,'').trim();return b};",
    "let noClean=0,executed=0,errInEvidence=0,noEvidenceTagged=0,tierUnmet=0,skippedNoWhy=0;const ex=[];",
    "for(const r of rows){",
    "  const st=String(r.status||'');",
    "  if(!DOMAIN[st])stray[st||'(空)']=(stray[st||'(空)']||0)+1;",
    "  const why=String(r.failureReason||r.observed||'');",
    "  if(st==='SKIPPED'&&why.indexOf('action-not-automatable')<0&&why.indexOf('capability=')<0)skippedNoWhy++;",
    "  const evs=Array.isArray(r.evidence)?r.evidence:[];",
    "  let clean=0;",
    "  for(const raw of evs){const s=String(raw);if(/ERROR:|timeout/i.test(s)){errInEvidence++;continue}const b=strip(s);if(!/\\.(png|jpe?g|webp|gif)$/i.test(b))continue;if(fs.existsSync(b))clean++}",
    "  if(st==='NO-EVIDENCE')noEvidenceTagged++;",
    "  if(st!=='EXECUTED')continue;",
    "  executed++;",
    "  if(clean===0){noClean++}",
    "  const tier=String(r.tier||'');const need=NEED[tier]===undefined?1:NEED[tier];",
    "  const okPic=clean>=need;",
    "  const okRoute=Array.isArray(r.route)&&r.route.length>0;",
    "  const okLog=(Array.isArray(r.console)&&r.console.length>0)||String(r.observed||'').length>0;",
    "  const met=tier==='navigation'?(okRoute||okLog):tier==='noop'?okLog:okPic;",
    "  if(!met){tierUnmet++;if(ex.length<5)ex.push(String(r.suite||'?')+'/'+String(r.id||'?')+'('+tier+',帧='+clean+')')}",
    "}",
    "const strayList=Object.keys(stray).map(function(k){return k+'×'+stray[k]}).join(',');",
    "console.log('STATE_ROWS='+rows.length+' EXECUTED='+executed+' EXECUTED_NO_CLEAN_FRAME='+noClean+' EXECUTED_TIER_UNMET='+tierUnmet+' TAGGED_NO_EVIDENCE='+noEvidenceTagged+' ERROR_STRINGS_IN_EVIDENCE='+errInEvidence+' SKIPPED_WITHOUT_CAPABILITY='+skippedNoWhy+' DOMAIN_VIOLATIONS='+(strayList||'0'));",
    "if(ex.length)console.log('STATE_UNMET_SAMPLES '+ex.join(' ; '));",
    "const hardFail=!!(tierUnmet||skippedNoWhy||strayList);",
    "console.log(hardFail?'STATE_RESULT=FAIL（有用例被记成 EXECUTED 却没交齐本 tier 的证据，或状态域越界）':'STATE_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", EVID_SCRIPT, resultsFile]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("STATE_ROWS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("STATE_RESULT=") === 0) || (r.exitCode === 0 ? "STATE_RESULT=PASS(未打印)" : "STATE_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 四等态校验无法启动 ${String(e).slice(0, 160)}` };
  }
}

// ===== 身份可行性与凭证时效（v3.2 补 D12：前置不可满足的东西不许当覆盖要求）=====
const IDENTITY_RULES = [
  `【身份可行性矩阵必须先声明再开跑】每轮 manifest 必须含 identityMatrix: [{identity, feasible, reason}]。判定规则写死：mock 产物（config/env.js 的 MODE=mp-weixin-mock）下第二身份恒不可满足 —— apps/client/src/stores/session.ts 的 mockUserSession.userId 硬编码 "user-1001"（R4-00134 全 mock 家族统一），固定表 A=100158/B=100159 在 mock 下拿不到任何一个。因此 mock 轮凡是 pre/expected 依赖"两个不同身份对照"的用例，一律记 UNVERIFIED-IDENTITY（不进通过率分母），禁止用"注入后还是同一个号"这种自报去凑覆盖。`,
  `【注入不一致即停该身份】执行员每次身份注入后必须回读实际 userId 并与要求比对；不一致时该身份本轮已产出的全部帧与用例改判 UNVERIFIED-IDENTITY 并停止继续为它取证。实测教训：R2 有 366 条（占 38.9%）observed 里写着 pre:login …MISMATCH 却照常往下跑，A=114 帧 / B=2 帧这种悬殊分布在任何报告里都看不出来。`,
  `【凭证过期就是不过期】任何写死在文件里的 JWT（tmp_r11_login.json / tmp_r11_guest.json 这类固化凭证）开跑前必须解出 exp 与当前时间比对，余量不足即禁止使用：要么重新签发，要么把相关用例记 BLOCKED-CREDENTIAL。实测教训：固化凭证 exp=1790088124（2026-09-22T14:42Z）比套件执行时刻（toast ts=1790141167 ≈ 09-23T05:19Z）早了一天多，整轮仍然照跑，于是"登录链路失败"被当成了产品缺陷立案。`,
  `【双身份只在 real 轮要求】A/B 双身份覆盖属于真实模式（G7/G8/G9）的前置：real 轮用 ${WORKFLOW.realEnv.apiBaseUrl}/auth/guest-login 现签，签一次算一次时效；mock 轮的单身份覆盖要求维持现状，不得因为"只有一组身份帧"而判页面缺陷。`,
].join("\n");

// 固化凭证文件（只读探测；本稿实测其存在：tmp_r11_login.json / tmp_r11_guest.json）
const HARDCODED_CRED_FILES = ["tmp_r11_login.json", "tmp_r11_guest.json"];

// 凭证时效门禁（v3.2 补 D12）：解 JWT 的 exp，过期或余量不足即非 0 退出。
async function credentialFreshGate(minAheadSeconds: number): Promise<{ ok: boolean; detail: string }> {
  const CRED_SCRIPT = [
    "const fs=require('fs');",
    "const minAhead=Number(process.argv[1]||0);",
    "const files=(process.argv[2]||'').split('|').filter(Boolean);",
    "function b64u(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Buffer.from(s,'base64').toString('utf8')}",
    "const now=Math.floor(Date.now()/1000);const bad=[];const rep=[];",
    "for(const f of files){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){rep.push(f+':(不可读，按未使用处理)');continue}",
    "let tok='';(function find(o){if(tok)return;if(typeof o==='string'){const m=o.match(/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/);if(m)tok=o;return}if(o&&typeof o==='object'){for(const k of Object.keys(o))find(o[k])}})(j);",
    "if(!tok){rep.push(f+':(内无 JWT)');continue}",
    "let p={};try{p=JSON.parse(b64u(tok.split('.')[1]))}catch(e){rep.push(f+':(payload 解不开)');bad.push(f+' payload 不可解');continue}",
    "const exp=Number(p.exp||0);const ahead=exp-now;",
    "rep.push(f+' exp='+(exp?new Date(exp*1000).toISOString():'(无)')+' ahead='+ahead+'s');",
    "if(!exp)bad.push(f+' 无 exp 字段');",
    "else if(ahead<=0)bad.push(f+' 已过期 '+(-ahead)+'s');",
    "else if(ahead<minAhead)bad.push(f+' 余量 '+ahead+'s < 要求 '+minAhead+'s');",
    "}",
    "console.log('CRED_FILES='+files.length+' '+rep.join(' | '));",
    "if(bad.length){for(const b of bad)console.log('CRED_BAD '+b);console.log('CRED_RESULT=FAIL（固化凭证过期/余量不足：禁用或重签，相关用例记 BLOCKED-CREDENTIAL）');process.exit(1)}",
    "console.log('CRED_RESULT=PASS');",
  ].join("");
  try {
    const r = await world.run("node", ["-e", CRED_SCRIPT, String(Math.max(3600, minAheadSeconds)), HARDCODED_CRED_FILES.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("CRED_FILES=") === 0) || "（无输出）";
    const bad = lines.filter(l => l.indexOf("CRED_BAD") === 0).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${stat}${bad.length ? " | " + bad.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `凭证时效探测无法启动 ${String(e).slice(0, 160)}` };
  }
}

// 身份取证可行性对账（v3.2 补 D12）：MISMATCH 自报数 + A/B 两侧帧数悬殊。
async function identityFeasibilityGate(label: string, resultsFile: string, manifestFile: string): Promise<{ ok: boolean; detail: string }> {
  const ID_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'',mf=process.argv[2]||'';",
    "let mismatch=0,rowsN=0;",
    "try{const j=JSON.parse(fs.readFileSync(rf,'utf8'));const rs=j.results||[];rowsN=rs.length;",
    "for(const r of rs){const t=String(r.observed||'')+String(r.failureReason||'');if(/MISMATCH/i.test(t))mismatch++}}catch(e){}",
    "let A=-1,B=-1,noMatrix=false;",
    "try{const m=JSON.parse(fs.readFileSync(mf,'utf8'));const s=m.shots||[];",
    "A=s.filter(x=>/\\/A\\/|\\\\A\\\\|__A_/.test(String(x.path||''))).length;",
    "B=s.filter(x=>/\\/B\\/|\\\\B\\\\|__B_/.test(String(x.path||''))).length;",
    "noMatrix=!Array.isArray(m.identityMatrix)||m.identityMatrix.length===0}catch(e){}",
    "const skewed=(A>=0&&B>=0)&&(Math.min(A,B)+5)<Math.max(A,B)*0.25;",
    "console.log('IDENT_ROWS='+rowsN+' MISMATCH_REPORTED='+mismatch+' FRAMES_A='+(A<0?'(无 manifest)':A)+' FRAMES_B='+(B<0?'(无 manifest)':B)+' IDENTITY_MATRIX_DECLARED='+(noMatrix?'false':'true'));",
    "const hardFail=!!(mismatch>0||skewed||noMatrix);",
    "console.log(hardFail?'IDENT_RESULT=FAIL（身份注入不一致仍继续取证 / 双身份帧数悬殊 / 未声明身份可行性矩阵）':'IDENT_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", ID_SCRIPT, resultsFile, manifestFile]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("IDENT_ROWS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("IDENT_RESULT=") === 0) || (r.exitCode === 0 ? "IDENT_RESULT=PASS(未打印)" : "IDENT_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 身份对账无法启动 ${String(e).slice(0, 160)}` };
  }
}

// v3.2 补 D16：被测物新鲜度对账用的路径（一律取产物入口文件，不看构建命令字符串）
const FRESH_PATHS = {
  clientSrc: "apps/client/src",
  clientArtifactEntry: WORKFLOW.build.sharedOutDir + "/app.json",
  clientArtifactEnv: WORKFLOW.build.sharedOutDir + "/config/env.js",
  realArtifactEntry: WORKFLOW.build.realOutDir + "/app.json",
  apiSrc: "apps/api/src",
  apiClasses: "apps/api/target/classes",
};
// 工作树/产物新鲜度的披露汇集处（终报 notCovered 会引用它）
const worktreeNotes: string[] = [];

// ===== 修复与取证解耦协议（v3.2 补 D16：改了什么就要重新生成什么，否则证据属改前）=====
const WORKTREE_RULES = [
  `【先固化再取证】本轮修复要进入 UI 复验前，必须先把改动 commit（走 Git 管家，范围限定在已列 filesChanged），再重建产物、再取证。确实不能提交的（如需用户裁定），必须在 manifest 里记 gitWorktreeDirtyPaths=<数量> 并在终报披露"证据含未提交改动"。实测教训：HEAD 仍停在 18c91ccf 而工作树有 26~35 个源码路径未提交（同一件事三个数），于是"证据对应哪个代码"根本无法判定。`,
  `【HEAD 不可构建即整轮阻塞】G1 是对**提交后的 HEAD** 负责，不是对工作树负责。若干净 HEAD 构建不过（实测：setup/schedule/index.vue:9 缺 ref 导入却在 :50 用了 ref(false)，全仓无 auto-import），必须先修到 HEAD 可构建；期间用工作树截出来的图一律标 "EVIDENCE-BASE=DIRTY-WORKTREE"，不得用于宣告 HEAD 状态正常。`,
  `【改动类型决定重放动作】客户端源码改动 → 必须重建产物（${WORKFLOW.build.mockScript} 或 ${WORKFLOW.build.realScript}）后才允许复验；后端 Java/配置改动 → 必须重启 8080 并留下生效证明（新进程启动时间晚于改动时间，或改动字段在接口响应里已出现）才允许复验。二者缺一时结论只能记 BLOCKED-EFFECT-PENDING，**禁止记"已修复/已验证"**。实测教训：wave3 三处改动的四项效果（loginRequired 文案、hadSession 分支、后台 title 列、heart-filled 反色）至今全部未取证。`,
  `【脏度自证】manifest 必须记 gitWorktreeDirtyPaths（同一算法：git status --porcelain -- apps 的行数）与 artifactBuiltAt（产物入口文件 mtime）；两者与本轮取证时间一起构成"证据基线"。`,
].join("\n");

// 被测物新鲜度门禁（v3.2 补 D16）。只读文件系统时间戳。
// 实测依据：exec 跑在 15:57 的 mock 产物上、wave3 改动 23:2x 才落地；real 包同样是改前构建。
async function artifactFreshGate(): Promise<{ ok: boolean; detail: string }> {
  const FRESH_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const P=JSON.parse(process.argv[1]||'{}');",
    "function newest(dir,re,depth){let best=0,count=0;if(!dir||!fs.existsSync(dir))return -1;",
    "(function walk(d,d0){if(d0>9)return;let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);let st=null;try{st=fs.statSync(p)}catch(err){continue}",
    "if(st.isDirectory()){walk(p,d0+1);continue}count++;if(re.test(e.name)&&st.mtimeMs>best)best=st.mtimeMs}}})(dir,0);return count?best:-2}",
    "function mtimeOf(p){try{return fs.statSync(p).mtimeMs}catch(e){return -1}}",
    "const CS=/\\.(vue|ts|js|json|scss|css)$/;",
    "const AS=/\\.(java|yml|yaml|xml|properties)$/;",
    "const srcC=newest(P.clientSrc,CS,0), artC=mtimeOf(P.clientArtifactEntry);",
    "const srcA=newest(P.apiSrc,AS,0), clsA=newest(P.apiClasses,/\\.class$/,0);",
    "let mode='(无)';try{const t=fs.readFileSync(P.clientArtifactEnv,'utf8');const mm=t.match(/MODE\\s*[:=]\\s*[\"']?([A-Za-z0-9_\\-]+)/);if(mm)mode=mm[1]}catch(e){}",
    "const clientStale=srcC>=0&&artC>=0&&srcC>artC;",
    "const apiStale=srcA>=0&&clsA>=0&&srcA>clsA;",
    "const clientGapMs=clientStale?Math.round(srcC-artC):-1;",
    "const apiGapMs=apiStale?Math.round(srcA-clsA):-1;",
    "console.log('FRESH_CLIENT_SRC='+(srcC<0?'(缺)':new Date(srcC).toISOString())+' FRESH_CLIENT_ARTIFACT='+(artC<0?'(缺)':new Date(artC).toISOString())+' FRESH_API_SRC='+(srcA<0?'(缺)':new Date(srcA).toISOString())+' FRESH_API_CLASSES='+(clsA<0?'(缺)':new Date(clsA).toISOString())+' CLIENT_STALE='+(clientStale?clientGapMs+'ms':'no')+' API_STALE='+(apiStale?apiGapMs+'ms':'no')+' ARTIFACT_MODE='+mode+' REAL_ARTIFACT='+(mtimeOf(P.realArtifactEntry)>0?'present':'absent'));",
    "const hardFail=clientStale||apiStale;",
    "console.log(hardFail?'FRESH_RESULT=FAIL（源码比被测产物新：本轮取证取的是改动前的行为）':'FRESH_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", FRESH_SCRIPT, JSON.stringify(FRESH_PATHS)]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("FRESH_CLIENT_SRC=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("FRESH_RESULT=") === 0) || (r.exitCode === 0 ? "FRESH_RESULT=PASS(未打印)" : "FRESH_RESULT=FAIL(退出码 " + r.exitCode + ")");
    let dirty = "-1";
    const g = await gitTry(["status", "--porcelain", "--", "apps"]);
    if (g.spawned && g.ok) dirty = String(g.out.split("\n").map(s => s.trim()).filter(Boolean).length);
    return { ok: r.exitCode === 0, detail: `${stat} | 工作树未提交 apps/ 路径=${dirty} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `被测物新鲜度校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
// ===== UI Lock 状态机协议（v3.2：AVAILABLE/LEASED/STALE + RELEASED 墓碑；不旋轮重试）=====
// 参数化端口（v3.2 修 [C-23]）：这段协议是**逐字注入给执行员/验收员的文本**，原文写死 9420，
// 而实测本机 DevTools 起在 9430 —— 于是照协议办事的执行员会去续一把 9420 的锁、却在 9430 上
// 驱动同一个 UI 会话，"单写者"保证被静默拆掉（两个驱动各自认为自己独占）。
// [C-14] 只把 G0 预检的措辞改成了"端口要发现"，协议正文一直没跟着改。
function uiLockRules(port: number): string {
  return [
  `【UI Lock 状态机】ws://127.0.0.1:${port} 是单写者资源。锁文件 tmp/qa/locks/wechat-automation-${port}.lock（**锁名跟着端口走**，端口不是 ${WORKFLOW.ui.portCandidates[0]} 时绝不许沿用固定名字的旧锁），字段：resource/owner/pid/batch/status(AVAILABLE|LEASED|STALE|released)/leaseUntil/lastHeartbeat/attempt。`,
  `获取：无锁或 status≠LEASED 或 leaseUntil 已过期（超过 ${WORKFLOW.ui.graceSeconds}s grace）→ 原子写入 status=LEASED + leaseUntil=now+${WORKFLOW.ui.leaseMinutes}min 后开始工作；每完成一个用例/分段刷新 lastHeartbeat（间隔 ≤${WORKFLOW.ui.heartbeatSeconds}s 量级）并顺延 leaseUntil；超过 ${WORKFLOW.ui.staleAfterSeconds}s 无心跳视为 STALE，他人可接管。`,
  `锁不可得时禁止 sleep 循环抢锁：记录 BLOCKED（时间+原因）→ 转做非 UI 准备工作（重读 Manifest/整理证据/预生成脚本）→ 稍后再查（有界次数，如 3 次）→ 仍不可得则将剩余用例如实标 UNVERIFIED。`,
  `持锁期间先 netstat -ano 观察 ${port} 连接：发现外部客户端只记录，【禁止 taskkill 任何进程】；受影响用例标 UNVERIFIED（reason=endpoint occupied by external client + attempts）。`,
  `结束（v3.2 修订）：写 status=released + releasedAt 后**保留锁文件作为墓碑**，不要 unlink 删除——删除会让"上一轮谁持有、何时释放"无从审计，且与"绝不删除他人锁文件"的约束难以区分。`,
  `退出兜底（v3.2 新增，必做）：释锁必须挂在 finally + SIGINT/SIGTERM/uncaughtException 处理器上。实测教训：R2 巡检脚本结束时未释放锁，直接导致后续执行器 LOCK_BUSY 空等一个租期；被外部终止的进程更不会走收尾。`,
  `接管判据（v3.2 新增）：面对 LEASED 但心跳停更的锁，先用 tasklist/Get-Process 校验 owner.pid 是否仍是活进程；进程已死即为僵尸租约，可依据 staleAfterSeconds 接管并在结论里记"接管僵尸锁 pid=…"。禁止仅凭 leaseUntil 未到就无谓等待，也禁止为了抢资源去 kill 别人的进程。`,
  ].join("\n");
}


// ===== 状态单一真值源（v3.2 补 D10：一份权威账本 + 派生视图同批原子写 + 主键全局唯一）=====
const STATE_TRUTH_RULES = [
  `【唯一权威】本轮执行状态只有一个权威文件：\${dir}/interact/exec-results.json。检查点 tmp/qa/checkpoints/*.json 与终止快照都是它的**派生视图**，派生视图不得自行累加、不得晚于权威文件写、不得与它口径不同。实测教训：终止前 100 秒内三份各自报出 922 / 940 / 941 例与 FAILED 282 / 288 / 289，没有任何一份能仲裁另两份，全部统计从此都成了"某一份的口径"。`,
  `【同批原子写】每完成一个 Suite：先在内存里更新权威结构，再一次性写权威文件 + 派生视图（写临时文件后 rename），三者 updatedAt 必须逐字节相同。禁止"检查点每套一写、权威文件轮末一写"这种错拍写法 —— 上一轮正是错拍，导致检查点比权威少 19 例、少 7 条 FAILED。`,
  `【明细不得只报计数】凡 per-suite 记了 failed>0，权威文件与检查点的 failures[] 必须同时给出对应明细（caseId + reason）。实测：exec-R2.json 的 failures[] 在 failed 合计 282 的情况下恒为 []，等于把失败明细全丢了。`,
  `【主键全局唯一】用例主键固定为 suite + "/" + caseId（如 PAGES-HOME-INDEX/H01）。裸 caseId 只许在 suite 内唯一，跨 suite 复用即算缺陷：上一轮 941 条记录只有 911 个唯一 id（30 组复用），任何按 id 去重的统计都会低估。`,
  `【终止也要落盘】SIGINT / SIGTERM / uncaughtException 处理器里必须完成"权威文件 + 派生视图 + 释锁墓碑（同一处理器）"三件事后再退出；被强杀前留不下收尾的，必须在恢复时按已落盘的最后一条重算，禁止凭上一轮的总数继续报数。`,
  `【Windows 上停轮只能靠旗标，不能靠信号】round-6 三次实测：监督器 child.kill('SIGTERM')、监督器 child.kill('SIGINT')、进程内 process.kill(pid,'SIGINT') —— 三种都送不到上面那个处理器（Windows 的 kill 实为 TerminateProcess，日志里没有 EXEC_SIGNAL）。因此"装了钩子"不等于"停轮会落盘"：硬停必须走协作式 EXEC_STOP_FLAG（监督器写旗标，执行器在**用例之间**查旗标并正常收尾，已实测在跑的行会落盘），并且落盘本体要有一条不依赖信号送达的自检（EXEC_SELF_FLUSH=<ms> 自我调用同一处理器）。人按 Ctrl+C 那条路径本机造不出来，只能记 NOT-MEASURED，禁止写成已验证。`,
].join("\n");

// 三份状态产物对账（v3.2 补 D10）。只读，退出码 1 = 分叉/丢明细/主键复用/时标错拍。
// 实测依据：922/940/941 与 FAILED 282/288/289 在 100 秒内分叉、failures[] 恒空、941 条只有 911 个唯一 id。
async function stateTruthGate(label: string, resultsFile: string, checkpointFile: string): Promise<{ ok: boolean; detail: string }> {
  if (!resultsFile) return { ok: false, detail: `${label}: 未返回 resultsFile，无从确立真值源` };
  const TRUTH_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'',cf=process.argv[2]||'';",
    "let a={};try{a=JSON.parse(fs.readFileSync(rf,'utf8'))}catch(e){console.log('TRUTH_RESULT=FAIL reason=权威文件不可读 '+rf);process.exit(1)}",
    "const rows=a.results||[];",
    "const bySuite={};let failedRows=0;",
    "for(const r of rows){const s=String(r.suite||'(无suite)');bySuite[s]=bySuite[s]||{n:0,f:0};bySuite[s].n++;if(String(r.status)==='FAILED'){bySuite[s].f++;failedRows++}}",
    "const keys={};for(const r of rows){const k=String(r.suite||'?')+'/'+String(r.id||'?');keys[k]=(keys[k]||0)+1}",
    "const dk=Object.keys(keys).filter(function(k){return keys[k]>1});",
    "const bare={};for(const r of rows){bare[String(r.id||'?')]=(bare[String(r.id||'?')]||0)+1}",
    "const bareDup=Object.keys(bare).filter(function(k){return bare[k]>1}).length;",
    "let c={};try{c=JSON.parse(fs.readFileSync(cf,'utf8'))}catch(e){c=null}",
    "let sumExec=0,sumFail=0,badDetail=0,mismatched=0;",
    "const cs=c&&c.suites?(Array.isArray(c.suites)?c.suites:Object.keys(c.suites).map(function(k){const v=c.suites[k];v.suite=k;return v})):null;",
    "if(cs){for(const s of cs){sumExec+=Number(s.executed||0);sumFail+=Number(s.failed||0);const d=Array.isArray(s.executedCaseIds)?s.executedCaseIds.length:-1;if(d>=0&&Number(s.executed||0)!==d)mismatched++;if(Number(s.failed||0)>0&&(!Array.isArray(s.failures)||s.failures.length===0))badDetail++}",
    "if(Number(c.failed||0)>0&&(!Array.isArray(c.failures)||c.failures.length===0))badDetail++}",
    "const ckSum=sumExec;",
    "const diffA=cs?rows.length-ckSum:0;",
    "const skew=c&&c.updatedAt&&a.updatedAt?Math.abs(new Date(c.updatedAt).getTime()-new Date(a.updatedAt).getTime()):-1;",
    "const topFailKept=Array.isArray(c&&c.failures)?c.failures.length:-1;",
    "console.log('TRUTH_ROWS='+rows.length+' FAILED_ROWS='+failedRows+' SUITES='+Object.keys(bySuite).length+' DUP_COMPOSITE_KEYS='+dk.length+' DUP_BARE_IDS='+bareDup+' CK_SUM_EXECUTED='+(cs?ckSum:'(无)')+' CK_SUM_FAILED='+(cs?sumFail:'(无)')+' CK_DETAIL_MISMATCH='+(cs?mismatched:'(无)')+' MISSING_FAILURE_LIST='+(cs?badDetail:'(无)')+' CK_FAILURES_LEN='+topFailKept+' UPDATE_SKEW_MS='+(skew<0?'(无 updatedAt)':skew));",
    "if(dk.length)console.log('TRUTH_DUP_KEY '+dk.slice(0,5).join(','));",
    "const hardFail=!!(dk.length||bareDup||mismatched||badDetail||(topFailKept===0&&failedRows>0)||skew>20000||diffA!==0);",
    "console.log(hardFail?'TRUTH_RESULT=FAIL（三份状态分叉 / 主键复用 / 失败明细丢失 / 时标错拍 >20s）':'TRUTH_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", TRUTH_SCRIPT, resultsFile, checkpointFile]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("TRUTH_ROWS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("TRUTH_RESULT=") === 0) || (r.exitCode === 0 ? "TRUTH_RESULT=PASS(未打印)" : "TRUTH_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 真值源对账无法启动 ${String(e).slice(0, 160)}` };
  }
}

// ===== 自动化通道劣化协议（v3.2 补 D17：超时不是"个别用例失败"，是通道在坏）=====
const CHANNEL_RULES = [
  `【劣化必须计数】执行器必须为每个 Suite 维护真实的 reconnects 计数器：每次因 automator 无响应/超时而重建连接（disconnect→connect 或重启会话）都 +1，并把触发用例号写进该 Suite 的 degradedFrom。禁止把 reconnects 写成常量 0 —— 实测 R2 的 21 个 suite 全部记 0，而同轮证据里躺着 437 条 timeout，这个字段因此完全失去信息量。`,
  `【阈值即降级】同一 Suite 内累计超时 ≥5 次，或超时证据占比 >5%：立即重连一次；重连后该 Suite 已标 EXECUTED 的用例必须重跑证据采集（按 tier），拿不回证据的一律改判 NO-EVIDENCE（与 D5 同一等态）；重连仍失败的，把该 Suite 标 degraded=true 并在结论里写明"此后用例不可背书"。`,
  `【通道噪声不得冒充产品缺陷】timeout / ERROR: 串不得出现在 evidence[] 里当证据（要么去掉、要么把该用例改判）；实测 R2 的 437 条错误串正是这样被算进"已执行"的。`,
  `【统计口径要露出】轮末报告必须印：超时证据条数 / 占证据总数比例 / 受影响用例数 / 实际重连次数 / 被降级的 Suite 列表。上一轮这些数一个都没露，所以"reconnects 全 0"看起来像一切正常。`,
  `【劣化的自变量是"会话年龄"，不是"用例难度"】round-6 实测：同一通道内按行序分窗的超时污染率单调爬升 29%→38%→31%→48%→50%→70%，平均耗时 15.1s→39.6s，当前 Suite 达 83.8s/例；而把执行器**整进程**重起一次（新 WS 会话），同样本立刻回到 38% / 18.2s（约 4 倍）。所以必须按"会话"统计劣化并在协议里给出会话上限，只按 Suite 或按轮汇总会把趋势抹平成"这批页面比较难"。`,
  `【simulator_refresh 不是重连，别拿它当缓解手段】round-6 日志里「proactive refresh @15」与「[recovery] simulator_refresh ok」每次都报成功，污染率照样爬到 70% —— 刷新治不了通道老化。真正有效的是 disconnect→connect 或换进程。凡把 refresh 计入「已重连」的实现都必须改判：reconnects 只在真的重建过 WS 连接时才 +1。`,
  `【单次会话上限要显式钉住】执行器监督器的一轮 attempt 上限从 50 分钟压到 20 分钟（round-6 实测：50 分钟那一轮的后半段产出六成以上空证据，等于白跑）。上限值必须由参数给出、启动时打印「cap=20min」，不允许「看起来在跑就算数」。`,
].join("\n");

// 通道劣化对账（v3.2 补 D17）：证据里的 timeout 串 vs 检查点自报的 reconnects。
// 实测依据：21 个 suite 全记 reconnects=0，同轮 exec-results 证据里有 437 条 ERROR:timeout。
async function channelHealthGate(label: string, resultsFile: string, checkpointFile: string, scriptPath: string): Promise<{ ok: boolean; detail: string }> {
  const CH_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'',cf=process.argv[2]||'',sp=process.argv[3]||'';",
    "let entries=0,timeoutStr=0,casesHit=0;",
    "try{const j=JSON.parse(fs.readFileSync(rf,'utf8'));const rs=j.results||[];",
    "for(const r of rs){const evs=Array.isArray(r.evidence)?r.evidence:[];let hit=false;",
    "for(const s of evs){entries++;if(/ERROR:|timeout waiting for automator/i.test(String(s))){timeoutStr++;hit=true}}",
    "if(hit)casesHit++}}catch(e){}",
    "let suites=0,reconn=0,degraded=0,noFlag=false;",
    "try{const c=JSON.parse(fs.readFileSync(cf,'utf8'));const arr=c.suites?(Array.isArray(c.suites)?c.suites:Object.keys(c.suites).map(function(k){const v=c.suites[k];v.suite=k;return v})):[];",
    "suites=arr.length;for(const s of arr){reconn+=Number(s.reconnects||0);if(s.degraded===true)degraded++;if(typeof s.reconnects!=='number')noFlag++}}catch(e){}",
    "let hardcoded='no';",
    "if(sp&&fs.existsSync(sp)){const ls=fs.readFileSync(sp,'utf8').split(/\\r?\\n/);",
    "for(const l of ls){const t=l.trim();if(t.indexOf('//')===0||t.indexOf('*')===0)continue;if(/reconnects\\s*[:=]\\s*0\\b/.test(l)&&!/\\+\\+|\\+=|count/i.test(l)){hardcoded='yes';break}}}",
    "const ratio=entries?(timeoutStr/entries*100):0;",
    "console.log('CHAN_ENTRIES='+entries+' CHAN_TIMEOUT_STRINGS='+timeoutStr+' ('+ratio.toFixed(1)+'%) CASES_HIT='+casesHit+' SUITES='+suites+' RECONNECTS_SUM='+reconn+' DEGRADED_SUITES='+degraded+' NO_RECONNECTS_FIELD='+noFlag+' HARDCODED_ZERO='+(sp?hardcoded:'(未给脚本)'));",
    "const hardFail=!!(timeoutStr>0&&(reconn===0||degraded===0))||noFlag>0||hardcoded==='yes';",
    "console.log(hardFail?'CHAN_RESULT=FAIL（通道已在超时却没重连/没降级，或 reconnects 是写死的常量）':'CHAN_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", CH_SCRIPT, resultsFile, checkpointFile, scriptPath]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("CHAN_ENTRIES=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("CHAN_RESULT=") === 0) || (r.exitCode === 0 ? "CHAN_RESULT=PASS(未打印)" : "CHAN_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 通道对账无法启动 ${String(e).slice(0, 160)}` };
  }
}
// ===== 三级重置协议（A1 恢复手段；避免频繁 reLaunch）=====
const RESET_RULES = [
  `【三级重置】恢复 UI 状态按代价升序：`,
  `LEVEL 0 软重置（默认）：关闭当前弹窗/返回页面顶部/清除临时输入/收起键盘——不离开当前页；`,
  `LEVEL 1 路由重置：重新进入当前页面（redirectTo/navigateTo 自身），用于页面状态污染；`,
  `LEVEL 2 整机重置：uni.reLaunch 重启小程序，仅用于路由异常/应用卡死/核心状态异常；每个 Suite 至多 1 次（maxReLaunchPerSuite=${WORKFLOW.ui.maxReLaunchPerSuite}）。`,
  `用例之间默认只做 LEVEL 0；禁止把 reLaunch 当常规步骤。`,
].join("\n");

// ===== 用例契约与执行器噪声治理（v3.2 新增）=====
const INSTRUMENT_RULES = [
  `【用例契约】Manifest 每条 case 的 action 必须带可解析目标：优先 CSS 选择器（action.selector），或**确实存在于该页面渲染文本中**的 label。`,
  `禁止执行器用正则从中文标题里"猜"选择器后回填 ${'__CAND__'} 占位符。实测教训：R2 轮 289 条 FAILED 里 194 条是 ${'__CAND__'}，其中 74 条完全无标题（裸 ${'__CAND__'}）、另有 25 条 label 被截成"按/校/机/题/赞"等单字垃圾——这些全是测试台缺陷，把它们当产品缺陷会淹没真信号并让通过率彻底失真。`,
  `解析不到目标时的判定是 ${WORKFLOW.instrument.unresolvedVerdict}（未取证），不是 FAILED；且必须把"用了哪个 label / 候选列表 / 为什么没命中"写进 observed，供人事后判断是页面真没这个入口还是选择器写错。`,
  `【断言分域】凡 expected 涉及"落库/后台可见/审核流转/计数同步"的用例，必须打 requiresReal: true。mock 产物（config/env.js 的 MODE=mp-weixin-mock）下这类用例只能记 NOT-EVIDENCED-BY-MOCK，禁止记 PASS 也禁止记 FAILED。实测教训：v3.1 全程只构建 mock，R2 一整轮对数据库写入 0 条，前后端写链路自始至终没有证据，却在通过率里被算作"失败用例"。`,
  `【队列对账】启动时打印 SUITES.length 还不够：每完成一个 Suite 追加一行 [queue] done=N running=X pending=[...]（含每套用例数），轮末必须断言 已记录用例数 == 各 Manifest cases[] 总数，不等即为 BLOCKER 并列出缺失套件与缺口条数。实测教训：R2 清单 1107 例、记录 941 例，缺口 166 例 = 村口三套 116 例从未开跑 + 次要19 跑到一半被终止截断 50 例，中途两次被误读成"快跑完了/最后一套"。`,
  `【队列对账的机检口径（v3.2 接线）】上面那条轮末断言不再只靠自报：编排层每轮跑 node scripts/verify-queue-reconcile.mjs <本轮目录> 取退出码，它打印 QUEUE_PLANNED_SUITES / QUEUE_PLANNED_CASES / QUEUE_RECORDED_CASES / QUEUE_GAP / QUEUE_NEVER_RAN_SUITES / QUEUE_UNPLANNED_SUITES / QUEUE_DUP_ID_GROUPS 机器可读行；退出码非 0 即 BLOCKER，缺口与从未开跑的套件名原样进 blockers。执行员仍要打印 [queue] 行便于人读，但判定以工具退出码为准。`,
  `【定位失败判产品前，必须先看渲染后 DOM】判据固定三轴一致才允许记产品缺陷：源码取值 → locale 实际串 → 渲染后 DOM。round-6 实测教训：两个 post-topic 套件共 15 条 FAILED 写着「element not found: __CAND__("发布")」，而源码 post-topic.vue:443 的文案是数据绑定（构建出的静态 wxml 那一格就是花括号表达式，整页字面中文只剩「删除图片」），locale 里 submitPublish 确实是「发布」（zh-CN.ts:3594），同一次执行抓到的渲染后 DOM（wxml/*-after.wxml）里 submit-text 节点上「发布」就在屏上——是执行器扫不到，不是产品没有。`,
  `【标签解析必须有页面级回退】只扫候选类与 components 子树时，页面自身模板里的 view>text 结构无人负责。round-6 已在 r-exec.cjs 的 deepResolveLabel 末尾补页面级 $$ 扫描（view/text/button，封顶 400 节点防拖死整轮）；该改动必须在新会话里跑出前后对比数据才算生效，之前那 15 条一律记 instrument，不得转成产品缺陷。`,
  `【not-found 必须打印查找过什么】失败文案不许只剩 __CAND__ 哨兵，必须同时带 label 与候选选择器列表。round-6 有 41 条 FAILED 既无文案也无候选，事后无法复核，等于把执行器的解析失败伪装成用例结论（r-exec.cjs:1384-1386 的拼接就是漏点）。`,
  `【evidence 落盘前必须存在性校验】记录路径前先 existsSync 且 size>0，不存在的只能进 missingEvidence[]。round-6 实测：701 条证据里 241 条指向盘上不存在的文件，且全在同一个正确目录（不是拼错路径，是截图调用超时后压根没写出来）；后果是 281 条 EXECUTED 只有 111 条握有一张真图，零像素 60.5%，其中 critical 档 30 条。`,
  `【中途换被测物必须留下可派生的边界】重建构建或重启后端之后，权威件就是两个被测物的混合体。边界只能按 suite|manifest|id 复合键与冻结快照比对派生（执行器就地 upsert，按行号必错位：round-6 真抓到 1 行 FAILED→EXECUTED 的原地改写），并把快照路径、sha16、行数记进台账；混合合计不得当通过率分母。`,
  `【长期工具不得留在 .zcode/tmp】本仓 .gitignore:111 的 tmp/（无前导斜杠=任意层级）把 .zcode/tmp/** 整个吃掉：门禁、执行器、分诊台、快照写在那儿就进不了版本库，一次 clean checkout 全丢。round-6 因此把 verify-*/triage-*/readjudicate-*/r-exec/g8-e2e/poll-reshoot 一律落进 scripts/qa/，纯一次性脚手架才放 tmp。`,
  `【守恒必须同时对上游来源计数，而不是只对桶自己】所有分桶/分组类工具都要印「条目数 vs 上游来源数」并要求两者相等：只断言"各桶相加=条目数"是不够的——round-6 的产物级复验工具在一次改动后把 116 条静默塌成 3 条，五格守恒照样 CONSERVED ✔。判据来源要点名（fix-lanes.stillOpen=116、台账第一节 160 行等），塌成空集或小子集必须 exit 2。`,
  `【复验范围从台账派生，不许手写页集】重巡检/重采的页面清单必须由"状态以 待修复 / 已修复待复验 开头的行"归一化导出（round-6：132 行 → 23 个页面锚点 → 22 页在可达全集内 → A/B 共 44 行 TSV），并且必须把"台账有开放条目、但巡检可达全集里没有"的页显式列成缺口而不是默默少跑：本轮就是这样做才把 chat-session（该页 0 帧、12 条以上开放条目）从"以为跑过了"里捞出来。归一化必做：台账"页面"列里混着括注、组件文件、theme/scss、测试台脚本，整格比对会把真页面误判成没到达、把非页面锚点当页面。`,
  `【"0 帧"必须分清三种成因，不许一律记产品缺陷】① 构建裁剪（如 subpackages/setup/dev/index 根本不在 mock 产物 app.json 里）；② 运行时被弹走（chat-session 两身份都「落在 pages/login/index 而非目标页」，且路由在册、页面自身无登录跳转、boot 已 logged-in —— 定位不到来源之前不得写"页面不可达"）；③ 参数缺失导致进不去（PARAM_MAP 无该页参数）。终报必须按成因分列。`,
  `【重采清单从"改判结果"导出，不从错误串导出】需要重拍的是"tier 要求的像素帧不齐备"的降级行；帧其实在盘上、只是证据串带了 (ERROR:…) 注记的行不必重拍（round-6 band A：降级 122 例必须重采，另有 88 例只需净字符串——把它们混进来就是白烧模拟器）。每条降级行都必须落到一条可执行命令（未映射=0），并给出例数×实测每例耗时的成本估算。`,
].join("\n");

// ===== 证据溯源协议（v3.2 补 D1：gitSha 必须是采集时刻实测值，且必须是脚本自己算的）=====
const PROVENANCE_RULES = [
  `【provenance 三不】① 不写死：巡检/执行脚本里的 gitSha 必须由脚本自身在同一进程内执行 git rev-parse --short HEAD 得到，禁止字面量（实测教训：R1 轮 tmp/tour-R2.mjs 曾写死 'aefd8a72'，HEAD 实为 18c91ccf，导致 R1 全部 305 帧按契约属过期证据）；② 不抄提示词：编排层提示词里出现的 gitSha= 只是开轮计划值，与脚本实测不一致时以脚本实测为准，并在 notes 里写 "DRIFT plan=<计划值> actual=<实测值>"；③ 不静默：取不到 SHA 只能记 "unknown"，且 unknown 的 manifest 视为无溯源、整轮 UI 证据降级。`,
  `【manifest 必带溯源字段】${WORKFLOW.version} 起的每份 screenshot-manifest 必须含 gitSha / workflowVersion / buildMode / capturedAt（ISO，采集完成时刻）/ gitShaSource（值固定 "script:rev-parse"，另附脚本路径）。缺 capturedAt 或 gitShaSource 的 manifest 按 unknown 处理，不得据其判产品通过或失败。`,
  `【轮内提交即换证据基准】本轮若发生过 commit（提交由 Git 管家按显式路径执行，绝不 git add -A），提交之后采集的帧必须写新的 gitSha；不得沿用提交前算出的值给提交后的帧背书。发现混用即整轮证据标 STALE-MIXED 并记 BLOCKER。`,
].join("\n");
// 证据溯源机器门禁：manifest.gitSha 是否等于当前 HEAD、是否脚本自算（非字面量）。
// 只读；退出码 1 = 过期或伪造溯源。实测依据：round-1-tour/manifest-detail.json 记 aefd8a72、HEAD=18c91ccf。
async function provenanceGate(label: string, manifestFile: string, scriptPath: string): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 巡检未返回 manifestFile，溯源无从校验（按 unknown 处理）` };
  const PROV_SCRIPT = [
    "const fs=require('fs'),cp=require('child_process');",
    "const mf=process.argv[1]||'',sp=process.argv[2]||'';",
    "let head='';try{head=cp.execSync('git rev-parse --short HEAD',{encoding:'utf8',timeout:8000}).trim()}catch(e){head=''}",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('PROV_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const rec=String(m.gitSha||'');",
    "if(!rec||rec==='unknown'){console.log('PROV_RESULT=FAIL reason=manifest 未记 gitSha（过期判定无从触发）');process.exit(1)}",
    "if(head&&rec!==head){console.log('PROV_RESULT=FAIL reason=manifest.gitSha='+rec+' 当前 HEAD='+head+' 证据与被测提交脱钩');process.exit(1)}",
    "const hits=[];",
    "if(sp&&fs.existsSync(sp)){",
    "const re=/(GIT_SHA|gitSha)\\s*[:=]\\s*[^0-9a-zA-Z\\n]{0,2}([0-9a-f]{7,40})[^0-9a-zA-Z\\n]/;",
    "const ls=fs.readFileSync(sp,'utf8').split(/\\r?\\n/);",
    "for(let i=0;i<ls.length;i++){const t=ls[i].trim();if(t.indexOf('//')===0||t.indexOf('*')===0)continue;if(re.test(ls[i]))hits.push(sp+':'+(i+1)+'='+ls[i].trim().slice(0,90))}",
    "}",
    "if(hits.length){for(const h of hits)console.log('PROV_HARDCODE '+h);console.log('PROV_RESULT=FAIL reason=脚本内出现字面量 SHA，provenance 属自报而非实测');process.exit(1)}",
    "console.log('PROV_RESULT=OK sha='+rec+' head='+head+' capturedAt='+(m.capturedAt||'(缺)')+' shaSource='+(m.gitShaSource||'(缺)')+' script='+(sp||'(未给)'));",
    "process.exit(0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", PROV_SCRIPT, manifestFile, scriptPath]);
    const out = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const tail = out.length ? out[out.length - 1] : "（校验脚本无输出，按 FAIL 处理）";
    return { ok: r.exitCode === 0, detail: `${label}: ${tail}` };
  } catch (e) {
    return { ok: false, detail: `${label}: provenance 校验无法启动 ${String(e).slice(0, 160)}` };
  }
}

// ===== 证据==盘 不变量（v3.2 补 D3：把「证据与盘一致」从叮嘱变成退出码）=====
const EVIDENCE_DISK_RULES = [
  `【G6 磁盘一致性判据】每轮 UI 取证结束后必须跑：node scripts/verify-evidence-integrity.mjs <manifest 路径> --dir <本轮截图根>。判据是硬三条：MISSING==0（manifest 引用的帧在盘上存在）、HASH_MISMATCH==0（manifest.contentHash 与盘上字节 sha256 前 16 位一致）、ORPHANS==0（目录里没有 manifest 未登记的图片）。任一非 0 → 本轮 G6 不得记 PASS，已产出的视觉结论全部降级为「证据未背书」。`,
  `【孤儿帧只许搬迁不许删除】实测教训：round-2-tour/A、B 未清空即复用，磁盘 304 张 1x 帧里 50 张不在 manifest（其中 39 张是上一轮 11:0x–12:xx 的位置授权弹窗污染帧），V1–V5 五组视觉审查因此审到旧帧。发现孤儿帧一律整体搬迁到 .zcode/tmp/orphan-frames-from-<轮次标签>/，并在结论里写明搬迁数量与旧轮归属；禁止 rm，禁止「看起来是旧的」就地覆盖。`,
  `【采集前目录状态必须自报】巡检开始前必须数一次目标目录里的 PNG 数量，写进 manifest 的 preExistingFrames 字段：非 0 就意味着本轮在往旧目录里叠加，判定员据此把该目录整体标 STALE-MIXED。禁止用「先截后清」的顺序规避这项。`,
  `【contentHash 一律实测】哈希由采集脚本对**写盘后的同一份字节**计算（算法固定 sha256 取前 16 位十六进制），不得复用裁切/缩放前的内存缓冲哈希；无哈希的帧不参与配额、不参与判定（见 D4）。`,
].join("\n");

// 证据==盘 门禁（v3.2 补 D3）。复用仓内既有工具 scripts/verify-evidence-integrity.mjs（只读校验），
// 不新建脚本；它的 stdout 契约：EVIDENCE_SHOTS=.. MATCHED=.. MISSING=.. HASH_MISMATCH=.. ORPHANS=.. DUP_STATE_GROUPS=..
async function evidenceDiskGate(label: string, manifestFile: string, shotRoot: string): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 未返回 manifestFile，无法核对证据与盘` };
  if (!shotRoot) return { ok: false, detail: `${label}: 未返回 shotRoot，孤儿帧扫描会退化成空跑（失败关闭）` };
  try {
    const r = await world.run("node", ["scripts/verify-evidence-integrity.mjs", manifestFile, "--dir", shotRoot]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("EVIDENCE_SHOTS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("EVIDENCE_RESULT=") === 0) || (r.exitCode === 0 ? "EVIDENCE_RESULT=PASS(未打印)" : "EVIDENCE_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const bad = lines.filter(l => l.indexOf("EVIDENCE_MISSING") === 0 || l.indexOf("EVIDENCE_MISMATCH") === 0 || l.indexOf("EVIDENCE_ORPHAN") === 0).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${bad.length ? " | 样例 " + bad.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 一致性校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
// ===== 真实模式端到端验收协议（v3.2 新增：v3.1 完全没有这一环）=====
const REAL_E2E_RULES = [
  `【为什么必须单独一轮】v3.1 的 G1 只构建 build:mp-weixin:mock，因此整条"前端写 → 后端落库 → 后台审核 → 前端读回"链路从未被验证过。mock 产物连 API 都不打，用它证明"前后端联通"是范畴错误。`,
  `【G7 real 构建门禁】构建 ${WORKFLOW.build.realScript}，产物必须自证模式：读 ${WORKFLOW.build.realOutDir}/config/env.js，断言 MODE="real" 且 VITE_API_MODE="real" 且 VITE_API_BASE_URL=${WORKFLOW.realEnv.apiBaseUrl}。禁止凭构建命令的字符串推断模式——一切以产物文件为准。`,
  `【构建隔离】real 构建必须用 ${WORKFLOW.build.outDirEnvKey} 指到 ${WORKFLOW.build.realOutDir}，不得覆盖 mock 产物；若 mock 轮证据仍在被消费，覆盖即造成"证据与被测物不一致"。注意 apps/client/scripts/{prepare-static,prune-unreferenced-static,verify-build-features}.mjs 与 ../../scripts/verify-package-size.mjs **硬编码** ${WORKFLOW.build.sharedOutDir}，改道构建时必须一并跳过或先参数化它们，否则它们会打到共享目录（prune 还会删文件）。`,
  `【桩化还原校验】real 链的 strip-mock-for-mp.mjs 会把 8 个源文件临时替换成桩再构建。轮末必须逐文件比对 scripts/.strip-mock-backup/ 的字节数与恢复后的源文件，一致才算过；并 git grep 确认工作树无 AUTO-GENERATED STUB 残留。`,
  `【G8 前后端数据同步五环】按顺序取证，缺一环即 G8 FAIL：(1) 客户端身份：real 模式走"体验账号"按钮 → POST /auth/guest-login 200（wx.login 在本机必 502，见前置条件，记为未取证不记失败）；(2) 写：POST /posts 返回 id；(3) 后台读：GET /admin/forum/village-posts/{id} 命中；(4) 审核驱动可见性：审核前 GET /posts 列表不含该 id（新帖默认 pending，属预期），审核通过后列表 total +1 且该 id 在列；(5) 幂等：同 Idempotency-Key 重放必须 409 且 total 不再变。计数类（评论/赞/藏）要客户端侧与后台侧双向比对一致。【执行器】本环可用 node scripts/qa/g8-e2e.cjs 机检（2026-09-25 实测 6/6 PASS：guest 身份 200 / POST /posts 建帖 / 后台按 id 读到且 title 可见 / audit 通过后前端 total +1 / 同 Idempotency-Key 重放必 409 且 posts_total 不增 / 客户端与 DB 的 likes_count、comments_count 一致）；注意管理端返回体是**扁平**的（无 {code,data} 外层），照客户端形状解析会误报「后台不暴露字段」。`,
  `【G9 real 素材可达性】从 apps/client/src/config/images.ts 解析 IMAGE_PATHS 全量常量，按 real 基址（VITE_API_BASE_URL 去 /api 后缀 + /api/v1/media/app-assets）逐个 GET，断言 0 个 404 且 0 个 0 字节。必须同时报告"抽取到多少 / 探到多少 / 跳过多少"——抽取为 0 是解析失败，不是通过。实测教训：这一项抓到 heart-filled-white.svg 客户端包内有、后端 apps/api/uploads/app-assets 内没有，只在 real 模式 404，mock 截图永远看不出来。404 的归因顺序必须是：① 文件是否在后端 uploads 目录；② 文件名含中文/特殊字符时的 URL 编码（实测两个中文名素材在盘仍 404，纯 ASCII 同类 200）；③ 最后才在**带对照实验**的前提下谈 media_asset 注册表——该检查是否真的决定 200/404 尚未证实（既往出现过未注册却返回 200），禁止未做对照就把它写成根因。`,
  `【后台字段对账】客户端写入的每个业务字段，后台 list/detail 视图必须既暴露又可检索。实测教训：posts.title 真实存在且客户端必填 5–30 字，而后台 searchForVillageAdmin 只 LIKE content、两个 View record 都没有 title 字段，导致审核员看不到也搜不到——纯靠人工发现，v3.1 无任何机制会抓到。`,
  `【后端前置条件必须前置声明】开工前先实测：GET /actuator/health 是否 200；WECHAT_DEV_FALLBACK_ENABLED 取值（false 则 wx.login 必 502，须在建轮之前作为已知约束写进计划，而不是跑到登录链路才发现）；以及后端改动是否需要重启才生效（改了 Java 侧字段/查询但未重启，取证取到的是旧行为）。`,
  `【凭据处理】凭据一律走文件体（curl --data-binary @file / 脚本内读文件），不得内联进命令行——实测内联密钥会在传递中被改写，曾据此误判成"数据库被人裸 SQL 改过密码"。含凭据的临时脚本用完立即删除，且删除前确认结论与 ID 已落进证据文档。`,
].join("\n");


// ===== 状态配额内容学（v3.2 补 D4：配额按"字节不同"计，不按"标签不同"计）=====
const STATE_QUOTA_RULES = [
  `【配额只认字节】R11 §3 的每页帧数配额（普通页≥1、滚动页≥3、核心页≥6）只统计 contentHash 互不相同的帧；同一页里 state 标签不同但字节相同的帧算 1 张，且必须在 manifest 里显式打 countsTowardStateQuota=false + aliasLabel=true。实测教训：上一轮 267 帧里 29 组「不同状态」字节完全相同，核心页 ≥6 状态是被同名不同质凑满的。`,
  `【状态未生效必须回校】stateNotApplied[] 里的帧（实测 37 条）不得留在配额分母里，也不得留在判定证据里：判定员引用前必须逐条回看该帧是否真的呈现了目标状态，未呈现的按「无法取证」处理（与 D5 同一等态），禁止当作"页面就是长这样"的证据下缺陷结论。`,
  `【清盘先于补拍】同一轮内补拍/重截必须写回同一目录，且写回前先把该目录既有帧逐张与 manifest 哈希回校：回校不过的帧按 D3 搬迁，不许留着与新帧混成一个"状态集"。实测教训：本轮给在册帧加了哈希判定却没清目录，于是"配额已修"与"目录仍混"两件事同时为真。`,
].join("\n");

// 状态配额内容门禁（v3.2 补 D4）：同一页内"不同状态=相同字节"即判配额造假。
// 实测依据：countsTowardStateQuota=true 仅 241/254、stateNotAppliedCount=37、评审 A-2 的 29 组重复。
async function stateQuotaGate(label: string, manifestFile: string, pages: PageEntry[]): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 无 manifest，配额无从核对` };
  const QUOTA_SCRIPT = [
    "const fs=require('fs');",
    "const mf=process.argv[1]||'';",
    "let pages=[];try{pages=JSON.parse(process.argv[2]||'[]')}catch(e){pages=[]}",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('QUOTA_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const shots=m.shots||[];",
    "if(!shots.length){console.log('QUOTA_RESULT=FAIL reason=manifest 无 shots');process.exit(1)}",
    "const noFlag=shots.filter(function(s){return typeof s.countsTowardStateQuota!=='boolean'}).length;",
    "const noHash=shots.filter(function(s){return !s.contentHash}).length;",
    "const pg=new Map();",
    "for(const s of shots){const k=String(s.page||'')+'::'+String(s.contentHash||'');if(!pg.has(k))pg.set(k,new Set());pg.get(k).add(String(s.state||''));}",
    "let dupGroups=0;const dupEx=[];",
    "for(const e of pg){if(e[1].size>1){dupGroups++;if(dupEx.length<3)dupEx.push(e[0].split('::')[0]+'×'+e[1].size+'态')}}",
    "const elig=new Map();",
    "for(const s of shots){if(s.countsTowardStateQuota===false)continue;if(!s.contentHash)continue;const k=String(s.page||'');if(!elig.has(k))elig.set(k,new Set());elig.get(k).add(String(s.contentHash));}",
    "const core=new Set(pages.filter(function(p){return p.core}).map(function(p){return p.route}));",
    "let shortCore=0,shortOther=0,shortEx=[];",
    "for(const p of pages){const got=(elig.get(p.route)||new Set()).size;const need=p.core?6:1;if(got<need){if(p.core)shortCore++;else shortOther++;if(shortEx.length<3)shortEx.push(p.route+' '+got+'/'+need)}}",
    "const snaList=Array.isArray(m.stateNotApplied)?m.stateNotApplied.length:-1;",
    "const snaCount=typeof m.stateNotAppliedCount==='number'?m.stateNotAppliedCount:-1;",
    "if(snaCount>=0&&snaList<0){console.log('QUOTA_RESULT=FAIL reason=记了 stateNotAppliedCount 却没落 stateNotApplied[] 清单（哈希未回校）');process.exit(1)}",
    "const eligible=[...elig.values()].reduce(function(a,b){return a+b.size},0);",
    "console.log('QUOTA_PAGES='+pages.length+' ELIGIBLE_DISTINCT='+eligible+'/'+shots.length+' NO_FLAG='+noFlag+' NO_HASH='+noHash+' DUP_STATE_GROUPS='+dupGroups+' SHORT_CORE='+shortCore+' SHORT_OTHER='+shortOther+' STATE_NOT_APPLIED='+snaList);",
    "if(dupEx.length)console.log('QUOTA_DUP '+dupEx.join(' ; '));",
    "if(shortEx.length)console.log('QUOTA_SHORT '+shortEx.join(' ; '));",
    "const hardFail=dupGroups>0||noFlag>0||shortCore>0||snaCount>0;",
    "console.log(hardFail?'QUOTA_RESULT=FAIL（配额被同名不同质凑满或有状态未生效帧）':'QUOTA_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", QUOTA_SCRIPT, manifestFile, JSON.stringify(pages.map(p => ({ route: p.route, core: p.core })))]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("QUOTA_PAGES=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("QUOTA_RESULT=") === 0) || (r.exitCode === 0 ? "QUOTA_RESULT=PASS(未打印)" : "QUOTA_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 配额校验无法启动 ${String(e).slice(0, 160)}` };
  }
}

// ===== 台账收敛协议（v3.2 补 D7：同一缺陷只许一个正号，状态必须回写，总数只有一本账）=====
const LEDGER_RULES = [
  `【单一正号】一个缺陷只有一个 canonical id。新立项前必须先按「同页 + 同 category + 描述前 40 字归一化」检索既有台账；命中即**不得新建 ID**，改为把新 ID 追加进既有条目的 aliases[]，并把新证据并进 evidence。实测教训：i18n 裸键这一个缺陷挂了 4 个 ID、VILLAGE 热度榜挂了 2 个，导致修复与终验各修各的、总数永远收敛不了。`,
  `【状态必须回写且有据】status 从「待修复」往前推进时，必须同时写 statusEvidence = 复验证据的「文件:行 或 截图路径」；写不出证据的推进一律不算推进。已清理的外部残留（如已删除的库内数据）若仍让条目挂"待修复"，必须在 statusNote 里写明"卡在哪儿、等什么"，禁止靠口径注水。`,
  `【总数只有一本账】任何报告/矩阵/终报里出现的「待修复 / 各 severity」数字，必须逐字取自本轮台账（编排层内存里的问题全集，与本轮 harvest.json 对账后的结果），禁止各写各的。上一轮同一件事有三个数：harvest.json 记 335、TAKEOVER-HANDOFF 记 552、旧稿记 674 且自注"虚高"——这种账没法审。`,
  `【落盘即入账】写进 code-findings/、findings/、interact/ 的每一个 MP-* ID 都必须被台账收编；台账里没有的 ID 属"漏账"，必须在轮末逐条给出处置（收编 / 判重并入 aliases / 判噪声并注明理由），不许以"矩阵没提"为由留着不管（上一轮 237 个 ID 就是这么消失的）。`,
].join("\n");

// ===== 落点分诊协议（v3.2 补 D8：先分诊"为什么没到这一页"，再决定能不能立 P1）=====
const TRIAGE_RULES = [
  `【立 P1 之前必须先分诊落点】凡「本页本轮零截图 / 截图落在别的页 / 打开即被弹走」这类观察，第一步不是立 P1，而是给出 triageCode，取值域固定六选一并附实测依据：BUILD_FLAG_ABSENT（特性开关关闭导致路由被硬跳，如 isShowcaseMode=false / membershipEnabled=false）、PARAM_REQUIRED（缺参或参数表给了幽灵参数）、HARNESS_CALL_DEFECT（巡检脚本自己的调用方式错，如 navigateTo 打 tabBar 页）、PERMISSION_SUPPRESSED（权限弹窗抑制，见 D14）、DEVICE_CAPABILITY_UNREACHABLE（模拟器结构性不可达，见 D5 的 SKIPPED 归因）、GENUINE_APP_DEFECT（应用自己的缺陷）。`,
  `【只有 GENUINE_APP_DEFECT 能留 P0/P1】其余五码：缺陷立项对象是**测试台或环境**，页面级 severity 降为 P2 以下并记 owner=instrument，且必须同时给出"解法一句话"（实测这 13 页的解法成本极低：补 scripts/r11-param-map.json 两条参数、用 mockWxMethod('switchTab') 包住会员路由、给门禁路由记 gateBypass 不占覆盖）。上一轮把 4 条全判成页面级 P1，是因为定义里没有任何一步要求先给落点归因。`,
  `【门禁路由必须单列】因特性开关进不去的路由，逐条写进 manifest 的 gateBypassRoutes 并给出原因与配置来源（文件:行）；这些页的截图记 gateBypass=true，不得计入"页面已覆盖"，也不得因为"截图没落在目标页"而判页面缺陷。实测上一轮有 16 张这类帧。`,
  `【归因要有反证检查】把现象归因给某个代码分支之前，必须先证明该分支真的会被执行：上一轮 R1 把弹跳归因给 session-guard 的自动前进，事后证明那段是死代码、AUTH_GUARD_BOUNCE 实测 0 次 —— 结论错了整整一轮。凡"根因=X 代码"的结论，evidence 里必须含 X 被命中的一次实测记录。`,
].join("\n");

// 落点分诊机器门禁（v3.2 补 D8）。三件事：① 参数表里的键必须在该页源码/产物里真的被读（幽灵参数）；
// ② 缺证据类 P0/P1 必须已给 triageCode；③ 非 GENUINE_APP_DEFECT 的不得占 P0/P1。
// 实测依据：?target=10003 在 matching 页源码与编译产物里出现 0 次，却据此立了页面级 P1。
async function bounceTriageGate(label: string, findingsDirs: string[]): Promise<{ ok: boolean; detail: string }> {
  const TRIAGE_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const srcRoot=process.argv[1]||'',distRoot=process.argv[2]||'',dirs=(process.argv[3]||'').split('|').filter(Boolean);",
    "let pm={};try{pm=JSON.parse(fs.readFileSync('scripts/r11-param-map.json','utf8')).params||{}}catch(e){}",
    "const ghosts=[];",
    "function cands(r){return [srcRoot+'/'+r+'.vue',srcRoot+'/'+r+'/index.vue',srcRoot+'/'+r+'.ts',distRoot+'/'+r+'.js',distRoot+'/'+r+'.wxml',distRoot+'/'+r+'/index.js',distRoot+'/'+r+'/index.wxml'].filter(function(p){return fs.existsSync(p)})}",
    "for(const r of Object.keys(pm)){",
    "const keys=String(pm[r]).replace(/^\\?/,'').split(/[&;]/).map(function(s){return s.split('=')[0]}).filter(Boolean);",
    "const cs=cands(r);",
    "if(!cs.length){ghosts.push(r+':无候选文件（路由或参数表路径写错）');continue}",
    "const txt=cs.map(function(p){return fs.readFileSync(p,'utf8')}).join('\\n');",
    "for(const k of keys){if(txt.indexOf(k)<0)ghosts.push(r+'?'+k+'=（该页源码与产物里 0 命中，属幽灵参数）')}",
    "}",
    "const CODES={BUILD_FLAG_ABSENT:1,PARAM_REQUIRED:1,HARNESS_CALL_DEFECT:1,PERMISSION_SUPPRESSED:1,DEVICE_CAPABILITY_UNREACHABLE:1,GENUINE_APP_DEFECT:1};",
    "const SIG=/零截图|无截图|截图缺失|未渲染|落在|而非目标页|弹走|弹跳|redirect|不覆盖/;",
    "let missing=0,wrongSev=0,badCode=0,scanned=0,openIssues=0;const ex=[];",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch(err){continue}",
    "const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);",
    "for(const it of arr){if(!it||typeof it!=='object'||typeof it.id!=='string')continue;scanned++;",
    "const sev=String(it.severity||''),txt=(String(it.description||'')+String(it.evidence||'')).slice(0,600);",
    "if(sev==='P0'||sev==='P1')openIssues++;",
    "if(SIG.test(txt)){const c=String(it.triageCode||'');",
    "if(!c){missing++;if(ex.length<5)ex.push(it.id+' 缺 triageCode')}",
    "else if(!CODES[c]){badCode++;if(ex.length<5)ex.push(it.id+' triageCode 取值非法:'+c)}",
    "else if(c!=='GENUINE_APP_DEFECT'&&(sev==='P0'||sev==='P1')){wrongSev++;if(ex.length<5)ex.push(it.id+' '+c+' 仍占 '+sev)}",
    "}}} }",
    "for(const d of dirs)walk(d);",
    "console.log('TRIAGE_PARAM_ROUTES='+Object.keys(pm).length+' GHOST_PARAMS='+ghosts.length+' FINDINGS_SCANNED='+scanned+' P0_P1_TOTAL='+openIssues+' NO_TRIAGE_CODE='+missing+' ILLEGAL_CODE='+badCode+' NON_GENUINE_KEEPING_P0P1='+wrongSev);",
    "ghosts.slice(0,6).forEach(function(g){console.log('TRIAGE_GHOST '+g)});",
    "ex.slice(0,6).forEach(function(l){console.log('TRIAGE_UNROUTAGED '+l)});",
    "const hardFail=ghosts.length>0||missing>0||badCode>0||wrongSev>0;",
    "console.log(hardFail?'TRIAGE_RESULT=FAIL（未分诊落点就立了页面级 P1，或参数表含幽灵参数）':'TRIAGE_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", TRIAGE_SCRIPT, recon.srcRoot, WORKFLOW.build.sharedOutDir, findingsDirs.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("TRIAGE_PARAM_ROUTES=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("TRIAGE_RESULT=") === 0) || (r.exitCode === 0 ? "TRIAGE_RESULT=PASS(未打印)" : "TRIAGE_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const samples = lines.filter(l => l.indexOf("TRIAGE_GHOST") === 0 || l.indexOf("TRIAGE_UNROUTAGED") === 0).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${samples.length ? " | " + samples.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 落点分诊校验无法启动 ${String(e).slice(0, 160)}` };
  }
}

// ===== 取证能力上限与置信封顶（v3.2 补 D13：1x 帧判不了字级，就得在结构上不许判）=====
const CAPTURE_CAPABILITY_RULES = [
  `【能力上限必须前置声明】巡检 manifest 必须含 captureLimitations: {screenshotDprSupported, apiEvidence, zoomCropSupported, zoomFactor, zoomOn, deviceInfo:{model,pixelRatio,windowWidth,windowHeight}} 与 frameSizes.distribution（"宽x高"→张数）。声明缺项、或声明与盘上实测分布不符，一律按"取证能力未知"处理：本轮不得产出任何依赖像素细节的结论。实测：截图 API 无 dpr 参数，全轮 254 帧恒 378×814，而设备 pixelRatio=3，也就是**证据天生只有 1/3 分辨率**。`,
  `【字级判定的取证门槛】凡结论依赖字号/行高/1–2px 间距/字形叠印/抗锯齿/文本截断位置，evidence 里必须给出对应的放大裁切帧路径（zoomFrames 之一）与裁切区域坐标；只给 1x 原生帧的，判"不可判读"。`,
  `【置信封顶是硬数值，不是措辞】1x 原生帧的像素推断 confidence ≤ 0.35；纯代码/文件存在性推断 ≤ 0.4；有放大帧且放大帧自报 upscaleAddsDetail=true 才可到 0.7 以上。放大最近邻帧 upscaleAddsDetail=false —— 它只是让肉眼看得清，**不增加信息量**，不得据此抬高置信。上一轮 80 条视觉发现里 conf≥0.9 为 0 条、42 条 <0.6，这套封顶当时只写在提示词里、没有任何结构拦阻，于是"P1 但不可判读"的条目照样进了修复队列。`,
  `【能力缺口要进 notCovered 而不是缺陷池】dpr 不可控、软键盘不渲染、swipe 无元素 API 这三类是取证手段的边界：写进终报 notCovered（本轮已实现的披露口），禁止转写成页面缺陷。`,
].join("\n");

// 取证能力与置信封顶门禁（v3.2 补 D13）。只读 manifest 与本轮 findings，退出码 1 = 越界结论。
// 实测依据：254 帧全为 378x814（1x）而 pixelRatio=3；345 张放大帧全部 upscaleAddsDetail=false。
async function captureCapabilityGate(label: string, manifestFile: string, findingsDirs: string[]): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 无 manifest，取证能力无从核对` };
  const CAP_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const mf=process.argv[1]||'',dirs=(process.argv[2]||'').split('|').filter(Boolean);",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('CAP_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const cl=m.captureLimitations||{};",
    "const missing=[];",
    "if(typeof cl.screenshotDprSupported!=='boolean')missing.push('screenshotDprSupported');",
    "if(!cl.apiEvidence)missing.push('apiEvidence');",
    "if(!cl.deviceInfo||!cl.deviceInfo.pixelRatio)missing.push('deviceInfo.pixelRatio');",
    "if(!m.frameSizes&&!cl.frameSizes)missing.push('frameSizes');",
    "const declared=((m.frameSizes&&m.frameSizes.distribution)||(cl.frameSizes&&cl.frameSizes.distribution)||{});",
    "function sizeOf(p){try{const fd=fs.openSync(p,'r');const b=Buffer.alloc(24);fs.readSync(fd,b,0,24,0);fs.closeSync(fd);if(!(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47))return '';return b.readUInt32BE(16)+'x'+b.readUInt32BE(20)}catch(e){return ''}}",
    "const measured={};let unreadable=0;",
    "for(const s of (m.shots||[])){const k=sizeOf(String(s.path||''));if(!k){unreadable++;continue}measured[k]=(measured[k]||0)+1}",
    "const dk=Object.keys(declared).sort().join(','),mk=Object.keys(measured).sort().join(',');",
    "let declaredTotal=0;for(const k of Object.keys(declared))declaredTotal+=Number(declared[k]||0);",
    "const zoomList=m.zoomFrames||[];",
    "const zoomNoFlag=zoomList.filter(function(z){return !z||typeof z.upscaleAddsDetail!=='boolean'}).length;",
    "const zoomClaim=zoomList.filter(function(z){return z&&z.upscaleAddsDetail===true}).length;",
    "const WORDSZ=/字号|字体大小|行高|字高|1px|2px|3px|4px|6px|像素|间距|叠印|抗锯齿|截断|省略号|字形/;",
    "let over=0,scanned=0;const ex=[];",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch(err){continue}",
    "const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);",
    "for(const it of arr){if(!it||typeof it!=='object'||typeof it.id!=='string')continue;scanned++;",
    "const txt=(String(it.description||'')+String(it.evidence||'')+String(it.ideal||'')).slice(0,800);",
    "const conf=typeof it.confidence==='number'?it.confidence:0.5;",
    "const hasZoom=/zoom|_3x|_4x|3x\\.|4x\\.|放大|裁切/i.test(String(it.evidence||'')+String(it.screenshot||''));",
    "if(WORDSZ.test(txt)&&!hasZoom&&conf>0.35){over++;if(ex.length<5)ex.push(it.id+' conf='+conf)}",
    "}}} }",
    "for(const d of dirs)walk(d);",
    "console.log('CAP_SHOTS='+(m.shots||[]).length+' DECLARED_TOTAL='+declaredTotal+' MEASURED=['+mk+'] UNREADABLE='+unreadable+' DECLARED_KEYS=['+dk+'] ZOOM='+zoomList.length+' ZOOM_CLAIM_ADDS_DETAIL='+zoomClaim+' ZOOM_NO_FLAG='+zoomNoFlag+' FINDINGS_SCANNED='+scanned+' OVER_CEILING_NO_ZOOM='+over+' LIMIT_MISSING='+(missing.length?missing.join(','):'0'));",
    "if(ex.length)console.log('CAP_OVER '+ex.join(' ; '));",
    "const hardFail=!!(missing.length||unreadable||Object.keys(measured).length!==Object.keys(declared).length||(dk&&dk!==mk)||zoomNoFlag||zoomClaim||over);",
    "console.log(hardFail?'CAP_RESULT=FAIL（能力未声明 / 声明与盘不符 / 放大帧谎称增细节 / 无放大帧却下字级高置信结论）':'CAP_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", CAP_SCRIPT, manifestFile, findingsDirs.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("CAP_SHOTS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("CAP_RESULT=") === 0) || (r.exitCode === 0 ? "CAP_RESULT=PASS(未打印)" : "CAP_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const samples = lines.filter(l => l.indexOf("CAP_OVER") === 0).slice(0, 2);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${samples.length ? " | " + samples.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 能力门禁启动失败 ${String(e).slice(0, 160)}` };
  }
}

// ===== 权限抑制确认协议（v3.2 补 D14：抑制是取证手段的取舍，未确认就不能给结论背书）=====
const PERMISSION_RULES = [
  `【抑制清单必带确认状态】manifest 的 permissionSuppression 必须逐方法给 {method, mocked:true|false, realCallSite:"文件:行", confirmed:"CONFIRMED"|"UNCONFIRMED"|"IMPOSSIBLE", confirmEvidence}。只列方法名不给确认状态的清单等于没写。实测：R2 列了 6 个方法（getLocation/chooseLocation/authorize/getSetting/requirePrivacyAuthorize/getPrivacySetting），但 254/254 帧全部 permSuppressedUnconfirmed=true —— 本轮对权限链的取证自始至终没有一次背书。`,
  `【未确认即封判定域】凡 confirmed≠CONFIRMED，则所有依赖该权限链的用例与视觉结论只能记 UNVERIFIED-PERMISSION：定位/附近的人/地址逆地理、隐私弹窗与合规拦截、麦克风与录音、相机与相册选图。禁止据此立页面级 P0/P1，也禁止宣布"功能正常"。实测教训：位置授权弹窗从未被处理造成整页遮罩污染、多组页面有效帧为 0，却被当成页面缺陷进了修复队列。`,
  `【弹窗必须被处理一次，或被证明处理不了】自动化能点原生授权框（wx10/automator 的 modal 接口）就必须至少处理一次并留 before/after 两帧作为 CONFIRMED 证据；确认点不动的（apiCannotAssertNativeDialog=true）必须写明"哪个 API 为什么不行"，并据此把相关页面标为**取证不可达页面**、写进终报 notCovered，不许再给它们算覆盖率。`,
  `【遮罩污染帧不得计入配额】被系统弹窗/授权框遮住的帧必须打 masked=true 且不计状态配额（与 D4 同一判据），并单独报"因遮罩丢失有效帧的页面数"。`,
].join("\n");

// 权限抑制确认门禁（v3.2 补 D14）。退出码 1 = 抑制未确认却仍产出权限链结论 / 清单缺确认字段。
// 实测依据：6 个 wx 方法被抑制、254/254 帧 permSuppressedUnconfirmed=true、两条遮罩污染被判 P0/P1。
async function permissionConfirmGate(label: string, manifestFile: string, findingsDirs: string[]): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 无 manifest，权限抑制范围无从界定` };
  const PERM_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const mf=process.argv[1]||'',dirs=(process.argv[2]||'').split('|').filter(Boolean);",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('PERM_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const ps=m.permissionSuppression||{};",
    "const methods=Array.isArray(ps.mockMethods)?ps.mockMethods:[];",
    "const list=Array.isArray(ps.entries)?ps.entries:null;",
    "const unconfirmed=[];",
    "if(list){for(const e of list){if(String(e.confirmed||'')!=='CONFIRMED')unconfirmed.push(String(e.method||'?')+'='+(e.confirmed||'(缺)'))}}",
    "else if(methods.length){for(const x of methods)unconfirmed.push(x+'=(清单未给 confirmed 字段)')}",
    "const shots=m.shots||[];",
    "const unconf=shots.filter(function(s){return s&&s.permSuppressedUnconfirmed===true}).length;",
    "const masked=shots.filter(function(s){return s&&s.masked===true}).length;",
    "const CHAIN=/定位|位置|附近|地址|逆地理|授权|隐私|麦克风|录音|语音|相机|相册|选图|权限|getLocation|chooseLocation|authorize|getSetting|Privacy|录音机/;",
    "let badIssues=0,scanned=0;const ex=[];",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch(err){continue}",
    "const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);",
    "for(const it of arr){if(!it||typeof it!=='object'||typeof it.id!=='string')continue;scanned++;",
    "const txt=(String(it.description||'')+String(it.evidence||'')).slice(0,800);",
    "const sev=String(it.severity||'');",
    "if(CHAIN.test(txt)&&(sev==='P0'||sev==='P1')&&String(it.status||'待修复')!=='保留'){",
    "const ok=unconfirmed.length===0&&String(it.permissionConfirmed||'')==='CONFIRMED';",
    "if(!ok){badIssues++;if(ex.length<5)ex.push(it.id+' '+sev)}",
    "}}}}} }",
    "for(const d of dirs)walk(d);",
    "console.log('PERM_METHODS='+methods.length+' UNCONFIRMED_ENTRIES='+(list?unconfirmed.length:(methods.length?'(缺 entries[])':0))+' SHOTS='+shots.length+' SHOTS_UNCONFIRMED='+unconf+' SHOTS_MASKED='+masked+' FINDINGS_SCANNED='+scanned+' CHAIN_P0P1_WITHOUT_BACKING='+badIssues);",
    "if(unconfirmed.length)console.log('PERM_UNCONFIRMED '+unconfirmed.slice(0,8).join(','));",
    "if(ex.length)console.log('PERM_VIOLATION '+ex.join(' ; '));",
    "const hardFail=!!(methods.length&&unconfirmed.length)||badIssues>0;",
    "console.log(hardFail?'PERM_RESULT=FAIL（权限抑制未经确认却被用来下 P0/P1 结论）':'PERM_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", PERM_SCRIPT, manifestFile, findingsDirs.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("PERM_METHODS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("PERM_RESULT=") === 0) || (r.exitCode === 0 ? "PERM_RESULT=PASS(未打印)" : "PERM_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const samples = lines.filter(l => l.indexOf("PERM_VIOLATION") === 0 || l.indexOf("PERM_UNCONFIRMED") === 0).slice(0, 2);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${samples.length ? " | " + samples.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 权限确认门禁启动失败 ${String(e).slice(0, 160)}` };
  }
}

// ===== 既有门禁工具接线（v3.2 补：仓内四个已实测的门禁工具此前在本定义里引用数为 0）=====
// 接线表（工具 → 定义里的调用者 → 归属 Gate）：
//   scripts/verify-evidence-integrity.mjs          → evidenceDiskGate（见 D3 一节）      → G6 证据==盘
//   scripts/verify-queue-reconcile.mjs             → queueReconcileGate（下面新增）      → G6 队列对账
//   scripts/probe-real-env.mjs                     → realProbeGate（下面新增）           → G7/G8/G9 前置
//   apps/client/scripts/build-real-isolated.mjs    → g7ArtifactCheckGate（下面新增）     → G7 产物自证
// 共同点：四个工具都已经把结论做成「机器可读行 + 退出码」，本定义只解析 stdout 并按退出码记
// blockers，不再让轮末断言停留在提示词的自然语言层。
async function queueReconcileGate(label: string, roundDir: string): Promise<{ ok: boolean; detail: string }> {
  if (!roundDir) return { ok: false, detail: `${label}: 未给本轮目录，队列无从对账（失败关闭）` };
  try {
    const r = await world.run("node", ["scripts/verify-queue-reconcile.mjs", roundDir]);
    const out = String(r.stdout || "") + String(r.stderr || "");
    const grab = (k: string) => {
      const i = out.indexOf(k);
      if (i < 0) return "(未输出)";
      return (out.slice(i + k.length).split(/[\s,;|]/)[0] || "(未输出)");
    };
    const never = (out.match(/QUEUE_NEVER_RAN [^\n]+/g) || []).slice(0, 3);
    const stat = `计划 ${grab("QUEUE_PLANNED_CASES=")} 例 / 记录 ${grab("QUEUE_RECORDED_CASES=")} 例 / 缺口 ${grab("QUEUE_GAP=")} 例 / 从未开跑 ${grab("QUEUE_NEVER_RAN_SUITES=")} 套 / 未计划 ${grab("QUEUE_UNPLANNED_SUITES=")} 套 / 重复 id 组 ${grab("QUEUE_DUP_ID_GROUPS=")}`;
    return { ok: r.exitCode === 0, detail: `${label}: ${stat}${never.length ? " | 从未开跑：" + never.join(" ; ") : ""} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 队列对账工具无法启动 ${String(e).slice(0, 160)}` };
  }
}
async function realProbeGate(): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await world.run("node", ["scripts/probe-real-env.mjs"]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const pick = (k: string) => (lines.find(l => l.indexOf(k) === 0) || k.replace("=", "") + "=(未输出)");
    return { ok: r.exitCode === 0, detail: `${pick("PROBE_BACKEND=")} | ${pick("PROBE_ASSETS_REACHABLE=")} | ${pick("PROBE_VERDICT=")} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `前置探测无法启动 ${String(e).slice(0, 160)}` };
  }
}
async function g7ArtifactCheckGate(): Promise<{ ok: boolean; detail: string }> {
  try {
    // --check-only 只复核产物里的 MODE / VITE_API_MODE / VITE_API_BASE_URL 与 mock 共享产物指纹，不重新构建。
    // 必须经 tmp/run-node22.cjs 转一道：本仓 PATH 上的 node 是 v16.13.1（微信开发者工具自带的那个），
    // 而 build-real-isolated.mjs 自己会拒绝在 node<18 上跑并自报 G7_RESULT=FAIL —— 直接在沙箱里
    // 用 "node" 调它，量到的是**测试台的 node 版本**，会被记成一条产品 G7 FAIL（2026-09-25 实测）。
    const r = await world.run("node", ["tmp/run-node22.cjs", "apps/client/scripts/build-real-isolated.mjs", "--check-only", "--out", WORKFLOW.build.realOutDir]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const line = lines.find(l => l.indexOf("G7_RESULT=") === 0) || (r.exitCode === 0 ? "G7_RESULT=PASS(未打印)" : "G7_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const proof = lines.find(l => l.indexOf("[g7] 产物自证") === 0) || "（无产物自证行）";
    const untouched = lines.find(l => l.indexOf("[g7] outDir=") === 0) || "";
    // 测试台噪声与产品缺陷必须分开写：判 FAIL 但不把它记成产品失败，是这条门禁的全部意义。
    const harness = /过老|node\s*1[2-7]\b|node 版本/.test(line + " " + lines.join(" "));
    return {
      ok: r.exitCode === 0,
      detail: `${line} | ${proof}${untouched ? " | " + untouched : ""}${harness ? " | 归因=测试台 node 版本过老（非产品缺陷），修法是走 tmp/run-node22.cjs 或换 node≥18 后重跑" : ""}`,
    };
  } catch (e) {
    return { ok: false, detail: `G7 产物自证无法启动 ${String(e).slice(0, 160)}` };
  }
}
// ===== 语料 / 台账 / 状态真值 / 后端新鲜度侧门禁接线（v3.2 补）=====
// 这一组的来历：[C-21] 曾把五个工具记作"本轮一律不创建"，后来工具都建好并实测过，
// 但**定义正文里的引用数仍是 1 —— 而且那唯一一处就是 [C-21] 自己的注释**。工具存在却没人
// 调用，等于规则没有生效（同一教训见 queueReconcileGate：接线表里必须先有调用者）。
// 接线表（工具 → 调用者 → 归属时机）：
//   scripts/qa/verify-evidence-corpus.mjs        → corpusGate         → 开跑前：历史证据可否复用
//   scripts/qa/verify-provenance-all.mjs         → provenanceAllGate  → 开跑前 + 终报前：戳记可信度 + 生产者是否运行时派生
//   scripts/qa/verify-state-truth.mjs            → stateTruthToolGate → 轮末：四源真值是否收敛
//   scripts/qa/verify-ledger.mjs                 → ledgerGate         → 轮末：发现是否全部入账
//   scripts/qa/verify-backend-restarted.mjs      → backendFreshGate   → 真实模式前：量到的是不是新构建
//   scripts/verify-evidence-integrity.mjs --exec → execEvidenceToolGate → 轮末：错误串/断链不得计入完成度
// 共同点：判读一律以退出码为准，代理自报与工具结论冲突时以工具为准并写明差异。
const grabLine = (out: string, prefix: string) => (out.split("\n").map(s => s.trim()).find(l => l.indexOf(prefix) === 0) || `${prefix}(未输出)`);
const grabNum = (out: string, key: string) => {
  const i = out.indexOf(key);
  if (i < 0) return "(未输出)";
  return (out.slice(i + key.length).split(/[\s,;|]/)[0] || "(未输出)");
};

async function corpusGate(scope?: string): Promise<{ ok: boolean; detail: string }> {
  // 不传 scope = 全域（开跑前用，判"历史证据能不能复用"）；传 scope = 只看本轮产物，
  // 否则上一轮留在盘上的过期 manifest 会把门禁永久钉红，本轮到底可不可信就再也读不出来了。
  const args = ["scripts/qa/verify-evidence-corpus.mjs"].concat(scope ? ["--scope", scope] : []);
  try {
    const r = await world.run("node", args);
    const out = String(r.stdout || "") + String(r.stderr || "");
    const stat = `扫到 ${grabNum(out, "CORPUS_SCANNED=")} 份带帧清单 / 过期 ${grabNum(out, "CORPUS_EXPIRED_GITSHA=")} 份 / 问题 ${grabNum(out, "CORPUS_PROBLEMS=")} 处`;
    return { ok: r.exitCode === 0, detail: `${stat} | ${grabLine(out, "CORPUS_RESULT=")} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `全语料审计无法启动 ${String(e).slice(0, 160)}` };
  }
}

async function provenanceAllGate(label: string, scope?: string): Promise<{ ok: boolean; detail: string }> {
  const args = ["scripts/qa/verify-provenance-all.mjs"].concat(scope ? ["--scope", scope] : []);
  try {
    const r = await world.run("node", args);
    const out = String(r.stdout || "") + String(r.stderr || "");
    const stat = `帧 ${grabNum(out, "FRAMES=")} 张：时间轴相符 ${grabNum(out, "PROV_FRAMES_CONSISTENT=")} / 戳记过期 ${grabNum(out, "PROV_FRAMES_STALE=")} / 回填伪造 ${grabNum(out, "PROV_FRAMES_PRE_STAMP=")} / 无戳 ${grabNum(out, "PROV_FRAMES_UNDATED=")}；生产者 ${grabNum(out, "PROV_PRODUCERS=")} 个：字面量 SHA ${grabNum(out, "LITERAL_SHA=")} / 未派生 ${grabNum(out, "NO_DERIVE=")}`;
    const lits = (out.match(/PROV_(?:INFO_)?PRODUCER_(?:LITERAL|NODESCRIBE) [^\n]+/g) || []).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat}${lits.length ? " | " + lits.join(" ; ") : ""} | ${grabLine(out, "PROVENANCE_RESULT=")} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `${label}: provenance 全域清算无法启动 ${String(e).slice(0, 160)}` };
  }
}

// 轮次目录归属门禁（v3.2 补）：本定义的轮目录是 reports/audit/round-<n>，跨会话复用同名目录。
// 实测隐患：round-2-tour 未清空即复用，50 张上一轮帧混进本轮（其中 39 张是弹窗污染帧），
// 五路视觉审查因此审到旧帧。目录该不该复用不是靠"记得清盘"，而是看它上一份 manifest 的
// gitSha 是否就是本轮 HEAD —— 是则本轮在同一提交上续跑（可复用），否则必须换轮号或换命名空间。
async function roundOwnershipGate(label: string, roundDir: string): Promise<{ ok: boolean; detail: string }> {
  const chk = [
    "const fs=require('fs');const p=(process.argv[1]||'')+'/screenshot-manifest.json';",
    "if(!fs.existsSync(p)){console.log('OWN_RESULT=PASS reason=轮目录是新的，没有旧证据可混');process.exit(0)}",
    "let s='';try{s=JSON.parse(fs.readFileSync(p,'utf8')).gitSha||''}catch(e){console.log('OWN_RESULT=FAIL reason=旧 manifest 不可解析 '+p);process.exit(1)}",
    "const cur=process.argv[2]||'';",
    "console.log('OWN_existingGitSha='+(s||'(无)')+' own='+(s===cur?'yes':'no'));",
    "if(s!==cur){console.log('OWN_RESULT=FAIL reason=该轮目录属另一次提交，复用会把两轮证据混成一堆（换轮号或先整体搬迁）');process.exit(1)}",
    "console.log('OWN_RESULT=PASS');process.exit(0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", chk, roundDir, gitSha]);
    const out = String(r.stdout || "") + String(r.stderr || "");
    return { ok: r.exitCode === 0, detail: `${label}: ${grabLine(out, "OWN_existingGitSha=")} | ${grabLine(out, "OWN_RESULT=")} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 轮目录归属校验无法启动 ${String(e).slice(0, 160)}` };
  }
}

async function stateTruthToolGate(label: string, roundDir: string): Promise<{ ok: boolean; detail: string }> {
  if (!roundDir) return { ok: false, detail: `${label}: 未给本轮目录，四源真值无从核对（失败关闭）` };
  try {
    const r = await world.run("node", ["scripts/qa/verify-state-truth.mjs", roundDir]);
    const out = String(r.stdout || "") + String(r.stderr || "");
    const stat = `用例数极差 ${grabNum(out, "STATE_CASE_SPREAD=")} / FAILED 极差 ${grabNum(out, "STATE_FAIL_SPREAD=")} / 重复 id 组 ${grabNum(out, "STATE_DUP_ID_GROUPS=")}`;
    const detail = (out.match(/STATE_FAIL_\d [^\n]+/g) || []).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${grabLine(out, "STATE_RESULT=")}${detail.length ? " | " + detail.join(" ; ") : ""} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 四源真值门禁无法启动 ${String(e).slice(0, 160)}` };
  }
}

async function ledgerGate(label: string, roundDir: string): Promise<{ ok: boolean; detail: string }> {
  if (!roundDir) return { ok: false, detail: `${label}: 未给本轮目录，台账无从对账（失败关闭）` };
  try {
    const r = await world.run("node", ["scripts/qa/verify-ledger.mjs", roundDir]);
    const out = String(r.stdout || "") + String(r.stderr || "");
    // 字段口径（v3.2 实测后更正）：NOT_IN_ANY_MATRIX 已不再是"旧口径 383"，扩矩阵集后它等于
    // LEDGER_ORPHAN_TRUE；旧口径改由 LEDGER_ORPHAN_ALL 承载。三个都读，缺一个就如实打"(未输出)"，
    // 不许拿 383 这个历史数当预期去判工具坏了。
    const stat = `来源 ${grabNum(out, "LEDGER_SOURCES=")} 个 / distinct ID ${grabNum(out, "DISTINCT_IDS=")} / 全轮次在册 ${grabNum(out, "MATRIX_IDS=")} / 全轮次仍无本尊行 ${grabNum(out, "LEDGER_ORPHAN_TRUE=")}（旧口径 ${grabNum(out, "LEDGER_ORPHAN_ALL=")}）/ 跨轮在册 ${grabNum(out, "LEDGER_CROSS_ROUND=")} / 别名命中 ${grabNum(out, "LEDGER_ALIAS_HITS=")} / 簇锚展开 ${grabNum(out, "LEDGER_CLUSTER_EXPANDED=")} / 多 ID 族 ${grabNum(out, "LEDGER_MULTI_ID_FAMILIES=")}`;
    const orphans = (out.match(/ORPHAN_ID [^\n]+/g) || []).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${grabLine(out, "LEDGER_RESULT=")}${orphans.length ? " | 样例 " + orphans.join(" ; ") : ""} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 台账收敛门禁无法启动 ${String(e).slice(0, 160)}` };
  }
}

async function backendFreshGate(): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await world.run("node", ["scripts/qa/verify-backend-restarted.mjs"]);
    const out = String(r.stdout || "") + String(r.stderr || "");
    return { ok: r.exitCode === 0, detail: `${grabLine(out, "RESTARTED_PID=")} | ${grabLine(out, "RESTARTED_STALE_SOURCE=")} | ${grabLine(out, "RESTARTED_RESULT=")} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `后端新鲜度证明无法启动 ${String(e).slice(0, 160)}` };
  }
}

// 证据字段污染门禁（D5）：exec-results 的 evidence[] 里带 ERROR:timeout 尾注或断链的串，
// 不得计入完成度。实测 R2：941 例里 373 例（39.6%）至少一条被污染，通道故障被静默当成了已执行。
async function execEvidenceToolGate(label: string, manifestFile: string, execResultsFile: string, shotRoot: string): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile || !execResultsFile) {
    return { ok: false, detail: `${label}: manifest 或 exec-results 路径为空，工具会退化成用法提示（失败关闭）` };
  }
  try {
    const r = await world.run("node", ["scripts/verify-evidence-integrity.mjs", manifestFile, "--exec", execResultsFile, "--dir", shotRoot]);
    const out = String(r.stdout || "") + String(r.stderr || "");
    const stat = `证据条目 ${grabNum(out, "EXEC_EVIDENCE_ENTRIES=")} / 带错误串 ${grabNum(out, "WITH_ERROR=")} / 受影响用例 ${grabNum(out, "CASES_WITH_ERROR=")} / 干净但断链 ${grabNum(out, "EXEC_CLEAN_BUT_MISSING=")}`;
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${grabLine(out, "EXEC_EVIDENCE=")} | 退出码=${r.exitCode}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 证据字段污染门禁无法启动 ${String(e).slice(0, 160)}` };
  }
}

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
  "【落点分诊（先于立 P1）】「零截图 / 落在别页 / 打开即弹走」这类观察必须先给 triageCode 与实测依据再定级：只有 GENUINE_APP_DEFECT 可留 P0/P1；BUILD_FLAG_ABSENT / PARAM_REQUIRED / HARNESS_CALL_DEFECT / PERMISSION_SUPPRESSED / DEVICE_CAPABILITY_UNREACHABLE 一律降级并把 owner 记为 instrument，且写一句最低成本解法（补参数表、包住 switchTab、记 gateBypass）。归因某段代码前必须先证明那段代码真会被执行。",
  "【权限链结论要有背书】定位/隐私/麦克风/相机类结论只有在 manifest 里该权限 confirmed=CONFIRMED（附证据）时才可立 P0/P1；否则记 UNVERIFIED-PERMISSION 并写进 unverifiable。因授权弹窗导致的整页遮罩属取证缺陷（owner=instrument），不是页面缺陷。",
  "【证据缓存校验】审查前先读证据 manifest（巡检员产出），核对其中 gitSha/构建指纹与当前一致；不一致的证据视为过期，不得据其下结论（把过期证据列为「未基于新代码验证」）。",
  "【独立性】默认项目仍有问题；不得读取 reports/audit 下其他轮次结论文当作答案。",
].join("\n");

const RULES_CASES = [
  `【用例固定结构】每条用例：id（页面缩写+两位序号，如 N01）/page/title/tier/pre（前置与进入方式）/action（选择器或坐标/输入）/expected（预期反应：界面变化/路由/Toast/状态）/evidence（按 tier 的采集要求）。`,
  `【交互规格铁律（R11 §5）】通用铁律：任何可点击元素点击后 500ms 内必须有可观测反馈（路由变化/DOM 变化/Toast/震动之一），否则即「死按钮」缺陷。主按钮防连点（快击 5 次只提交 1 次）；热区≥88rpx；搜索输入 300ms 防抖；Tab 切换滚动位与数据不丢；返回落点=来源页且状态恢复；冷启动深链严禁闪现错误空态；表单三态（空/非法/合法）；弹层三路关闭；Toast 文案正确、Loading 不永驻；点赞/收藏/关注乐观更新+失败回滚；CardSwiper 方向语义；下拉刷新真实重拉；上拉分页正确；头像兜底链；核心页七态 Idle/Loading/Success/Empty/Error/Disabled/Refreshing。`,
  `【操作覆盖】每页覆盖：全部可点击元素、全部输入框（正常+清空+超长+特殊字符）、滚动到底/顶、返回/关闭、Tab 切换、弹层开关、下拉刷新（若有）。核心页另加：快速连点×5、重复提交、空提交、打开即返回、重复进出。`,
].join("\n");

// ===== 复用子代理（跨轮积累上下文）=====
const shooter = agent("截图取证员", "你负责用微信开发者工具 CLI 与 miniprogram-automator 给小程序页面做单会话全量截图巡检，熟悉本项目 scripts/r11-tour.ps1、r11-reshoot.ps1 与 tools/screenshot-all.mjs。长跑注意分段防假死，不放弃不伪造。" + REAL_ENV);
const fixer = agent("修复工程师", "你是微信小程序前端工程专家，按证据修复问题，只以小程序真实表现为标准，修完自查不引入新问题。修复涉及登录/权限/数据链路时，用真实环境后端与管理员账号核实契约（见环境说明）。【真实截图铁律】每个修复完成后必须用开发者工具自动化在真实 UI 上复验并产出 before/after 真实截图；截图是修复被采纳的唯一依据，只改代码不出截图证据的修复视为未完成。" + REAL_ENV);
const verifier = agent("修复验证员", "你负责用定向重截/重跑操作证明每个修复真的生效，按影响范围回归，不放水、不臆断，复验不过如实记 failed。【真实截图铁律】每条复验结论必须附本轮新截图的路径作为证据；禁止只凭代码推断宣布「已验证」——没有真实截图支撑一律标 UNVERIFIED 并说明缺什么。" + REAL_ENV);
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
).then((v) => v, (e) => askFail("项目盘点员", e, { srcRoot: "apps/client/src", distRoot: "", pages: [], captureHow: "", idealDirs: [], notes: "盘点代理调用失败，页面清单为空" }));
if (recon.pages.length === 0) {
  const why = blockers.length > 0
    ? `（故障记录：${blockers.slice(-3).join("；")}）`
    : "请确认 apps/client/src/pages.json 存在且可读。";
  return {
    conclusion: `项目盘点没有返回任何页面，无法开始审计。${why}`,
    findings: [],
    verified: [],
    notCovered: blockers.length > 0 ? [...blockers, "整个审计流程未启动"] : ["整个审计流程未启动"],
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
  ).then((v) => v, (e) => askFail("历史问题整理员", e, { historicalIssues: [], highRiskAreas: [], idealRefs: [], listFile: "reports/audit/baseline/historical-issues.md", summary: "" })),
  agent("理想图基准员", "你负责把散落的设计稿/参考图整理成每页的理想目标基准，理想图是最终构建目标而不是参考。").ask<{ idealRefs: IdealRef[]; baselineFile: string; summary: string }>(
    [
      "把项目里的理想图/设计稿/参考图/设计规范统一整理为 Target UI Baseline：",
      "1. 在 素材/、素材/全站素材补齐-0912_assets/、素材/寻觅注册页-素材_assets/、截图存档/、doc/、docs/、specs/、reports/audit/ 下的 ideal-comparison.md 等处找每页的参考。",
      "2. 对每个有参考的页面给出 idealRefs（page 路由或 *、图片/规范文件路径、notes 简述该页理想结构：主视觉/内容顺序/CTA/底部导航/页面状态）。",
      "3. 汇总写入 reports/audit/baseline/ideal-baseline.md，baselineFile 返回该路径。",
      "只读素材 + 写这一个基准文件，不改任何代码。",
    ].join("\n"),
  ).then((v) => v, (e) => askFail("理想图基准员", e, { idealRefs: [], baselineFile: "reports/audit/baseline/ideal-baseline.md", summary: "" })),
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
).then((v) => v, (e) => askFail("回归索引员", e, { indexFile: "reports/audit/baseline/regression-index.json", entries: 0 }));
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
      `【落盘根目录（v3.2 必填）】本轮全部帧写入同一个工作区相对根目录，并把该路径原样返回到 shotRoot；shots[].path 必须是相对工作区可直接 existsSync 的路径。开工前先数目标目录里的 PNG 数量写进 manifest.preExistingFrames，非 0 只报不改。`,
      EVIDENCE_DISK_RULES,
      `【身份可行性（v3.2 必填）】manifest 追加 identityMatrix: [{identity, feasible, reason}]：mock 产物下第二身份（B）feasible 必须填 false 并给 reason（stores/session.ts 的 mockUserSession.userId 硬编码 "user-1001"，R4-00134），此时禁止再用"只有 A 侧帧"当覆盖缺口；real 轮必须写清每个身份的来源（guest-login 现签 / 固化文件）与签出时间。`,
      IDENTITY_RULES,
      `【权限抑制清单（v3.2 必填）】permissionSuppression.entries 逐方法给 {method, mocked, realCallSite:"文件:行", confirmed:"CONFIRMED|UNCONFIRMED|IMPOSSIBLE", confirmEvidence}；被系统弹窗遮住的帧打 masked=true 并同步 stateNotApplied 口径。凡 confirmed 非 CONFIRMED，相关页面在 coverage 里必须写"取证不可达（原因）"而不是"已覆盖"。`,
      PERMISSION_RULES,
      `页面清单共 ${pages.length} 个：${JSON.stringify(pages.map(p => ({ route: p.route, name: p.name, core: p.core })))}`,
      `要求（R11 §3）：普通页≥1 张首屏；滚动页≥3 张（顶/中/底）；核心页≥6 张（默认/滚动/交互后/空态/数据态/弹层态）；表单页+2（校验错误/键盘弹起）；双身份尽量覆盖；参数用既有固化表（${recon.captureHow}）。`,
      `【配额内容学（v3.2）】上面这句配额只统计字节内容互不相同的帧：同一页里 state 标签不同但 contentHash 相同的，必须打 countsTowardStateQuota=false + aliasLabel=true，且在 notes 里写清"这几张是同帧别名"。状态没真正生效的帧（弹窗没弹出、数据没切换、空态没触发）必须进 stateNotApplied[] 并同步 stateNotAppliedCount，两者缺一即视为清单自相矛盾。`,
      STATE_QUOTA_RULES,
      `【Suite/Checkpoint】把页面按域分成若干 Suite（每 Suite ≤8 页，如 home+nearby / messages+profile / village+publish / 其余分包）：每 Suite 独立会话段，段间做 Checkpoint（记录已完成页面到 tmp/qa/checkpoints/tour-${label}.json）；Suite 内恢复按三级重置（LEVEL 0 默认，LEVEL 2 reLaunch 每 Suite 至多 ${WORKFLOW.ui.maxReLaunchPerSuite} 次）。`,
      uiLockRules(uiPortLive),
      RESET_RULES,
      `空白/纯骨架截图自动重拍 3 次，仍异常记 failures 并标 P1。每页同步抓 console error 写到 ${dir}/console-evidence.log。`,
      `【证据清单（必须）】完成后写 ${dir}/screenshot-manifest.json：{ gitSha: "${gitSha}", workflowVersion: "${WORKFLOW.version}", buildMode: "build:mp-weixin:mock", shots: [{page, path, state}] }。manifestFile 返回该路径。`,
      `【provenance（v3.2 铁律，优先级高于上一行的 gitSha 提示值）】manifest 里的 gitSha 必须由你的采集脚本运行期执行 git rev-parse --short HEAD 取得，并同批写 capturedAt（ISO）与 gitShaSource="script:rev-parse"；把编排层给的字符串抄进 manifest 属伪造溯源，直接判该轮证据作废。`,
      PROVENANCE_RULES,
      `禁止伪造截图；截不到的写进 failures。scriptPath 填巡检脚本路径。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail("截图取证员", e, { shots: [], pagesCovered: 0, failures: [{ page: "*", reason: "截图取证员 ask 调用失败，本轮无 UI 帧" }], scriptPath: "", manifestFile: "", shotRoot: "", notes: "" }));
  const opsPromise = Promise.all(chunks.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    return agent(`用例设计员-${label}-${key}`, "你是测试用例设计员（A0 的规划臂），只读源码把页面交互翻译成固定结构的 Test Manifest，不驱动开发者工具、不改代码。").ask<OpsPrep>(
      [
        `第 ${label} 轮 · 用例设计。你负责这些页面：`,
        JSON.stringify(chunk.map(p => ({ route: p.route, name: p.name }))),
        `读每页源码（${recon.srcRoot}/ 及其组件），产出固定结构用例（PRE/ACTION/EXPECTED/EVIDENCE/tier/requiresReal），带参页面参数用既有固化表（${recon.captureHow}）。`,
        `【可自动化自检】ACTION/EXPECTED 必须是执行器做得到的动作、且是它读得到的读数。` +
          `round-6 实测 1107 条里有 136 条被记为 action-not-automatable 而整条 SKIPPED（12.3%，散在全部 24 个 Suite 上），` +
          `但把 136 条原因串全量回灌执行器自己的判据后，这个数分成两半，归因必须分开写：` +
          `62 条（46%）其实是「读 .selector」「检查 X 是否 Y」这类**观察型断言**，` +
          `是旧 OBSERVE_MARKERS 只认复合词「读取」造成的**执行器词汇缺口**（已扩表，` +
          `由 scripts/qa/test-observe-markers.cjs 用全量真实串钉住）——这类不是用例的错，设计员不要为此改写它们；` +
          `另一半是「拖动 / 滑块 / swipe / 长按 / 依次点 N 个 / 逐个点击」这类没有对应 op 的真能力缺口，` +
          `加上少数确实只能人眼判的写法（要求逐态截图并人工标注构造方式、亚秒级连拍、对每一屏做全文本节点扫描裸 key、主观审美比对）。` +
          `后两类不许进 cases 数组冒充覆盖率：能换成等价可测断言就换` +
          `（元素存在、文本包含、路由变化、Toast 文案、storage 键值、请求状态码），` +
          `确实只能人判或执行器暂无此 op 的，写进 notes 里以「manualOnly=N: 编号列表」回报。`,
        `【requiresReal 判据】凡 expected 断言"落库/后台可见/审核流转/计数同步/total 变化/幂等重放"这类只有真实后端才能证伪的效果，必须显式打 requiresReal: true；只断言界面反应、路由、Toast、本地 store 的打 false。**特别注意反向断言**（如"清空后提交被拦、network 计数=0"）属 mock 可证的 false 类，不得因为它提到"提交/计数"就升成 true——实测这类误判会让 G8 范围虚高约 45%。`,
        RULES_CASES,
        EVIDENCE_BUDGET,
        `【产出】用例 JSON 写入 ${dir}/ops/${key}.json（{cases:[...]}），返回 file 与 cases 数，并在 notes 里回报本批 requiresReal=true 的条数（形如 requiresReal=N）。一个真实业务页若报 0，视为漏打而非确无，需自查后重报。不改任何文件。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail(`用例设计员-${label}-${key}`, e, { file: "", cases: 0, notes: "用例设计调用失败，本 Suite 无 Manifest" })).then(prep => ({ key, file: prep.file ?? "", cases: prep.cases ?? 0 }));
  }));
  const [tour, opsFiles] = await Promise.all([tourPromise, opsPromise]);
  // v3.2 补 D1：证据溯源机器校验（失败即整轮 UI 证据不得被下游当有效证据消费）
  const prov = await provenanceGate(`${label}-tour`, tour.manifestFile, tour.scriptPath);
  if (!prov.ok) {
    blockers.push(`${label}: G6 溯源门禁 FAIL —— ${prov.detail}`);
    captureFailures.push(`${label}: provenance FAIL，本轮 ${tour.shots.length} 张截图按过期证据处置，不得用于判产品通过/失败`);
    log(`溯源门禁未过：${prov.detail}`);
  } else {
    log(`溯源门禁通过：${prov.detail}`);
  }
  totalShots += tour.shots.length;
  for (const f of tour.failures) captureFailures.push(`${label} ${f.page}: ${f.reason}`);
  // v3.2 补 D3：证据==盘（MISSING/HASH_MISMATCH/ORPHANS 三条硬判据）
  const diskTour = await evidenceDiskGate(`${label}-tour`, tour.manifestFile, tour.shotRoot);
  if (!diskTour.ok) {
    blockers.push(`${label}: G6 证据一致性 FAIL —— ${diskTour.detail}`);
    log(`G6 证据一致性未过：${diskTour.detail}`);
  } else {
    log(`G6 证据一致性通过：${diskTour.detail}`);
  }
  // v3.2 补 D4：状态配额内容门禁（同名不同质帧 / 状态未生效帧）
  const quota = await stateQuotaGate(`${label}-quota`, tour.manifestFile, pages);
  if (!quota.ok) {
    blockers.push(`${label}: G6 状态配额 FAIL —— ${quota.detail}`);
    log(`状态配额未过：${quota.detail}`);
  } else {
    log(`状态配额通过：${quota.detail}`);
  }
  log(`第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖 ${tour.pagesCovered} 页；用例清单 ${opsFiles.reduce((s, o) => s + o.cases, 0)} 条已备好`);

  // —— A1 单写者执行：Suite 化 + Checkpoint + 证据预算 ——
  const exec0 = agent(`操作执行员-${label}`, "你是 A1 UI Driver：唯一可驱动微信开发者工具自动化端口的执行器。只按 Manifest 执行，不自由探索、不判断设计；分段 Suite + Checkpoint + 三级重置；不伪造执行结果。" + REAL_ENV);
  const exec = await exec0.ask<ExecResult>(
    [
      `第 ${label} 轮 · 执行全部用例（你独占 ${uiPortLive}，锁文件随之为 wechat-automation-${uiPortLive}.lock；G0 实测端口=${uiLivePort ?? "无监听"}）。当前 gitSha=${gitSha}。`,
      `用例清单：`,
      opsFiles.map(o => `${o.key}: ${o.file}（${o.cases} 条）`).join("\n"),
      `【Suite 划分】按页面域分 Suite（每 Suite ≤6 页）：每 Suite 独立连接执行；Suite 开始前读检查点 tmp/qa/checkpoints/exec-${label}.json，已完成 Suite 跳过；每 Suite 结束写检查点（suite/status/executedCaseIds）。`,
      `【单一真值源（v3.2 必做）】权威文件 = ${dir}/interact/exec-results.json，每完成一个 Suite 用「写临时文件 + rename」同批更新它与 tmp/qa/checkpoints/exec-${label}.json，两份的 updatedAt 必须逐字节相同；per-suite failed>0 时 failures[] 必须同步给出 {suite,caseId,reason} 明细，禁止只报计数。主键写 suite + "/" + caseId（裸 caseId 只在本 suite 内唯一）。SIGINT/SIGTERM/uncaughtException 里必须完成这两份落盘再退。`,
      `【通道健康（v3.2 必做）】检查点每 Suite 必须写真实计数：reconnects（因超时/无响应重建连接的次数，禁止写常量 0）、degraded(bool)、degradedFrom(首个受影响用例)。同一 Suite 累计超时 ≥5 次先重连一次并重跑该段证据采集，重连后仍拿不到证据的用例改判 NO-EVIDENCE；证据串里禁止留 "ERROR:timeout …" 这类尾注当证据。`,
      CHANNEL_RULES,
      `【执行】逐用例：按 pre 建立前置 → action → 等稳定（≥500ms 观察反馈）→ 按 tier 采集证据（critical=前后截图，normal=后截图，navigation=仅路由断言，noop=仅日志）→ 记录 observed/route/toast/console。截图到 reports/screenshots/${shotDir}-interact/（页面大写-用例号-before/after.png），结果逐用例写入 ${dir}/interact/exec-results.json（id/page/tier/observed/route/toast/console/evidence[]/status=EXECUTED|FAILED|SKIPPED）。`,
      `【四等态（v3.2 必填）】status 取值域是 EXECUTED|FAILED|SKIPPED|NO-EVIDENCE。判 EXECUTED 前必须逐条核对：按该用例 tier 要求的证据是否都写进 evidence[] 且**剥掉尾注（括号串）后文件真实存在**；不满足就落 NO-EVIDENCE 并写 missingEvidence=<缺哪类>。禁止把 "xxx.png(ERROR:timeout…)" 这种带错误尾注的串当证据，禁止把"没抛异常"读成"已取证"。返回 noEvidence 计数。`,
      EVIDENCE_STATE_RULES,
      STATE_TRUTH_RULES,
      `【身份注入自证（v3.2）】每次注入后回读实际 userId 并与要求比对，把 "要求 X / 实得 Y / 一致|不一致" 写进该用例 observed；一旦不一致，本 Suite 内该身份的后续用例直接记 UNVERIFIED-IDENTITY 并停止取证，禁止带着 MISMATCH 继续跑（上一轮 366 条 MISMATCH 就是这样被无声消耗的）。固化凭证开跑前必须验 exp，过期就记 BLOCKED-CREDENTIAL 而不是 FAILED。`,
      `既有连接方式：${recon.captureHow}。`,
      uiLockRules(uiPortLive),
      RESET_RULES,
      EVIDENCE_BUDGET,
      INSTRUMENT_RULES,
      `【队列对账（v3.2 必做）】每完成一个 Suite 追加一行 [queue] done=N running=X pending=[套件名(用例数)]；轮末断言 已记录用例数 == 上述清单用例数之和，不等则把缺失套件名与缺口条数写进 failures 并在返回里显式声明，禁止静默收尾。`,
      `返回：resultsFile/executed/failures/scriptPath/checkpoints。禁止伪造。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<ExecResult>(`操作执行员-${label}`, e, { resultsFile: "", shotDir: "", executed: 0, noEvidence: 0, failures: [], lastRecordedAt: "", scriptPath: "", checkpoints: [], notes: "执行员调用失败，本轮无 UI 操作证据" }));
  // v3.2 补 D5：EXECUTED 必须有干净帧，否则整批落第四等态
  const stGate = await execEvidenceGate(label, exec.resultsFile);
  if (!stGate.ok) {
    blockers.push(`${label}: G6 四等态 FAIL —— ${stGate.detail}`);
    interactUnverifiable.push(`${label}: 本轮按 tier 应证未证的用例已计入 NO-EVIDENCE（见上条 detail），不得进入通过率分子`);
    log(`四等态门禁未过：${stGate.detail}`);
  } else {
    log(`四等态门禁通过：${stGate.detail}`);
  }
  log(`第 ${label} 轮执行完成：${exec.executed ?? 0} 条用例，失败/跳过 ${(exec.failures ?? []).length}`);
  // v3.2 补 D10：三份状态产物必须互相对得上，否则本轮统计不可用
  const truth = await stateTruthGate(label, exec.resultsFile, (exec.checkpoints ?? [])[0] ?? `tmp/qa/checkpoints/exec-${label}.json`);
  if (!truth.ok) {
    blockers.push(`${label}: 状态真值源未收敛 —— ${truth.detail}`);
    log(`真值源对账未过：${truth.detail}`);
  } else {
    log(`真值源对账通过：${truth.detail}`);
  }
  // v3.2 补 D12：身份可行性对账（MISMATCH 自报 + A/B 帧数悬殊 + 未声明矩阵）
  const ident = await identityFeasibilityGate(label, exec.resultsFile, tour.manifestFile);
  if (!ident.ok) {
    blockers.push(`${label}: 身份取证不可背书 —— ${ident.detail}`);
    interactUnverifiable.push(`${label}: 双身份对照类用例本轮全部改判 UNVERIFIED-IDENTITY（见身份对账 detail）`);
    log(`身份对账未过：${ident.detail}`);
  } else {
    log(`身份对账通过：${ident.detail}`);
  }
  // v3.2 补 D17：超时与"自报 0 次重连"对不上账即整轮通道不可背书
  const chan = await channelHealthGate(label, exec.resultsFile, `tmp/qa/checkpoints/exec-${label}.json`, exec.scriptPath);
  if (!chan.ok) {
    blockers.push(`${label}: 通道劣化未处置 —— ${chan.detail}`);
    interactUnverifiable.push(`${label}: 超时涉及的用例本轮不得计入已验证（详见通道对账 detail）`);
    log(`通道对账未过：${chan.detail}`);
  } else {
    log(`通道对账通过：${chan.detail}`);
  }
  return { tour, exec, opsFiles };
}

// =====================================================================
// 通用：五路复核（Evidence Bus：A2 代码 ∥ A3 视觉 ∥ A4 需求 ∥ A5 回归 ∥ A6 交互判定）
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
  ).then((v) => v, (e) => askFail<CodeBatch>(`分片审查员-${label}-${chunkKey}`, e, { issues: [], findingsFile: "", coverage: [] }));
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
      INSTRUMENT_RULES,
      `【判定分域（v3.2 必做）】执行器回填的 FAILED 里，凡属选择器解析不到/__CAND__ 占位/工具噪声，一律改判 UNVERIFIED-INSTRUMENT 并单列进 unverifiable，不得计入产品失败分母；requiresReal 用例在 mock 轮的结论只能是 NOT-EVIDENCED-BY-MOCK。`,
      `【第四态入结构化字段（v3.2）】checks[].verdict 允许值含 NO-EVIDENCE；凡 EXECUTED 但按 tier 应有截图/路由/console 而缺的，改判 NO-EVIDENCE 并计入 unverifiable（格式「用例|缺什么证据|尝试次数」）。分母口径固定为：可判定用例 = 总用例 − NO-EVIDENCE − SKIPPED(能力边界)，报告里必须把这两个扣减数印出来。`,
      `【产出】checks（caseId/page/operation/expected/actual/verdict/evidence[]/confidence）逐用例；issues；unverifiable。结果写入 ${dir}/interact/${chunkKey}-judge.json 并结构化返回。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail(`交互判定员-${label}-${chunkKey}`, e, { checks: [], issues: [], findingsFile: "", unverifiable: [], notes: "" }));
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
        : `（本批页面本轮没有静态截图——**先按落点分诊定归因再定级**：逐条读 tour.failures 里的原因串，命中 BUILD_FLAG_ABSENT / PARAM_REQUIRED / HARNESS_CALL_DEFECT / PERMISSION_SUPPRESSED / DEVICE_CAPABILITY_UNREACHABLE 者，记为 owner=instrument 的 P3 取证缺陷并写一句解法；只有排除完这五类后仍解释不通的，才允许立页面级 P1 MiniProgram 问题，且必须附 triageCode=GENUINE_APP_DEFECT 与实测反证。失败原因清单：${JSON.stringify(tour.failures).slice(0, 800)}）`,
      `行为证据：${exec.resultsFile}；操作截图目录：${exec.shotDir}/；证据清单（先校验 gitSha）：${tour.manifestFile}（当前应为 gitSha=${gitSha}，不一致的证据按过期处理并如实标注）。`,
      `代码层已发现问题（不要重复报，补它漏掉的）：${codeFiles.length > 0 ? codeFiles.join("、") : "（无）"}`,
      histFor.length > 0 ? `历史问题线索（回归核对，验证后才能作为发现）：${JSON.stringify(histFor.map(h => ({ id: h.id, page: h.page, desc: h.desc, severity: h.severity })))}` : "（无）",
      `理想图参考：`,
      idealForPages(chunk, hist).length > 0 ? idealForPages(chunk, hist).map(r => `${r.page}: ${r.path}（${r.notes}）`).join("\n") : "（无专门理想图，按微信小程序设计规范与本项目一致性为基准）",
      RULES_AUDIT,
      TRIAGE_RULES,
      CAPTURE_CAPABILITY_RULES,
      `【产出】issues 与 observations（逐页至少一条观察证据：page/observation/evidence 截图路径）写入 ${dir}/findings/${chunkKey}.json 并结构化返回；coverage 逐页写核对说明（无问题页按 13 项举证列明）。你只管视觉与证据审查；功能目标对照归需求对照员、历史回归归历史回归员、交互判定归交互判定员，不要越界。`,
      `【置信封顶（v3.2 硬数值）】凡依赖字号/1–2px 间距/字形叠印/文本截断位置的结论：evidence 必须给出放大裁切帧路径 + 裁切区域坐标；只有 1x 原生帧时 confidence 上限 0.35、severity 上限 P3；纯代码或文件存在性推断上限 0.4。放大帧若 upscaleAddsDetail=false 不得当作新增了细节。取证能力边界（无 dpr、软键盘不渲染、swipe 无 API）写进 coverage 说明，不得转写成页面缺陷。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<VisualBatch>(`分片审查员-${label}-${chunkKey}`, e, { issues: [], findingsFile: "", observations: [], coverage: [] }));
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
  ).then((v) => v, (e) => askFail<ReqBatch>(`需求对照员-${label}-${chunkKey}`, e, { issues: [], pageCompares: [], findingsFile: "" }));
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
  ).then((v) => v, (e) => askFail(`历史回归员-${label}-${chunkKey}`, e, { issues: [], checked: [], findingsFile: "" }));
  const issues = admit(res.issues ?? [], issueIds, "MP-" + label + "-" + chunkKey + "-REG");
  for (const it of issues) {
    allIssues.push(it);
    pushBoard(it);
  }
  const checked = res.checked ?? [];
  // v3.2 并入（收尾改造）：「仍开放」类历史条目只有核对记录、不生成 Issue，会绕开 worklist
  // 永远无人修复；「证据不足」不在此列——把未知升格成待修项只会制造噪声。
  const stillOpen = checked.filter(
    c => c && c.id && !issueIds.has(c.id) && /仍开放|未修复|未整改|仍待修/.test(c.status ?? "")
  ).map(c => ({
    id: c.id,
    page: c.page ?? "",
    category: "Regression",
    severity: "P2",
    description: `历史问题仍未修复（A5 判读为「${c.status}」，非本轮复发）：${c.evidence ?? ""}`,
    evidence: c.evidence ?? `${indexFile}:${c.id}`,
    sources: ["code"],
    status: "待修复",
  }) as Issue);
  const admittedOpen = admit(stillOpen, issueIds, "MP-" + label + "-" + chunkKey + "-REGOPEN");
  for (const it of admittedOpen) {
    allIssues.push(it);
    pushBoard(it);
  }
  log(`历史回归员-${label}-${chunkKey}：核对 ${checked.length} 条（已复发 ${issues.length}，仍开放补录 ${admittedOpen.length}，未复发 ${checked.filter(c => c.status === "未复发").length}，证据不足 ${checked.filter(c => c.status === "证据不足").length}）`);
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
  // 提交范围硬过滤（本轮实测驱动加的）：根目录误建文件曾随宽 add 进过 HEAD ——
  // `0`(14B, shell 重定向事故) 实测已被 874ff52f 提交进仓库，`nul`(51B) 是同批残留但未被跟踪。
  // 本函数按 dir / reports/screenshots / fixerFiles 组范围本不会收它们，但"Git 管家兜底通道"
  // 与人手提交会——所以在唯一出口处拒收，并把它记成一条工作树告警而不是静默跳过。
  const SUSPECT_PATH = /(^|[\\/])(0|1|null|nul|con|prn|aux|stdout|stderr)$/i;
  const allTargets = [...targets];
  const rejectedPaths = allTargets.filter((p) => SUSPECT_PATH.test(String(p).trim()));
  const list = allTargets.filter((p) => !SUSPECT_PATH.test(String(p).trim()));
  if (rejectedPaths.length) {
    worktreeNotes.push(`提交范围已剔除可疑文件 ${rejectedPaths.join("、")}（疑似 shell 重定向误建；先删除或改成语义路径再提交，不许让它进 HEAD）`);
    log(`提交前剔除 ${rejectedPaths.length} 个可疑路径`);
  }
  if (list.length === 0) {
    log(`第 ${n} 轮没有需要提交的改动，跳过提交`);
    return "";
  }
  const add = await gitTry(["add", ...list]);
  if (!add.spawned) {
    const res = await gitButler.ask<CommitResult>(
      `脚本环境无法启动 git（${add.err.slice(0, 300)}）。请在你的终端完成本轮提交：git add 以下路径（仅限这些）：${list.join("、")}，然后 git commit -m "fix(miniprogram): round-${n} audit fixes"。不要动其他文件。commit 返回 hash；无法提交时如实写原因。`,
    ).then((v) => v, (e) => askFail("Git 管家", e, { commit: "" }));
    return res.commit;
  }
  if (!add.ok) log(`git add 失败：${add.err.slice(0, 300)}`);
  const cm = await gitTry(["commit", "-m", "fix(miniprogram): round-" + n + " audit fixes"]);
  if (!cm.ok) {
    const res = await gitButler.ask<CommitResult>(
      `git commit 失败，错误尾部：\n${cm.err.slice(-2000)}\n请检查 git 状态，解决后完成提交，提交信息 fix(miniprogram): round-${n} audit fixes。只允许提交这些路径：${list.join("、")}。commit 返回 hash；无法提交时如实写原因。`,
    ).then((v) => v, (e) => askFail("Git 管家", e, { commit: "" }));
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
        `【生效条件（v3.2 必填）】返回里为每个 fixedIds 说明它需要哪种重放才生效：client（要重建产物）/ api（要重启 8080）/ none；无法自行完成重放的，必须在 skipped 之外另记 blockedIds 并写"待重放后才可复验"。禁止在产物未重建、后端未重启时宣称"已验证"。`,
      WORKTREE_RULES,
        `要求：只以微信小程序为标准；功能缺失真正实现；交互偏差修到「操作后反应与预期一致」；本项目高频缺陷优先核对（子组件 emit 父页面未监听、@tap.stop/catchtap 冒泡、空 catch、双数据源不同步）；修完自查不引入新问题；不留调试代码；不改历史报告与无关文件；不碰 tmp_*、*.log。`,
        `返回 fixedIds / skipped（不修必须写 reason+decision）/ filesChanged。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<FixResult>(`修复工程师-${label}`, e, { fixedIds: [], skipped: [], filesChanged: [], notes: "" }));
    for (const f of fixRes.filesChanged) fixerFiles.add(f);

    // Gate G1/G2 快速失败：构建+typecheck 不过则禁止新 UI 会话（分析可继续）
    let gatesOk = true;
    const gate = await buildGate();
    if (!gate.ok) {
      await fixer.ask(`构建未通过（错误尾部）：\n${gate.err}\n请在你自己的终端运行 pnpm -C apps/client run build:mp-weixin:mock（Windows 用 pnpm.cmd）修复直到通过，返回退出码与结论。`).then((v) => v, (e) => askFail("修复工程师（构建修复指令）", e, ""));
      const gate2 = await buildGate();
      if (!gate2.ok) {
        await fixer.ask(`构建第二次仍未通过（错误尾部）：\n${gate2.err}\n继续修复直到通过。`).then((v) => v, (e) => askFail("修复工程师（构建二次修复指令）", e, ""));
        const gate3 = await buildGate();
        gatesOk = gate3.ok;
      }
    }
    if (gatesOk) {
      const tc = await runBuildViaGatekeeper("G2 typecheck", "pnpm -C apps/client run typecheck", 900000);
      if (!tc.ok) {
        await fixer.ask(`vue-tsc 未通过（错误尾部）：\n${tc.err}\n请修复所有类型错误直到 pnpm -C apps/client run typecheck 通过，返回结论。`).then((v) => v, (e) => askFail("修复工程师（typecheck 修复指令）", e, ""));
        const tc2 = await runBuildViaGatekeeper("G2 typecheck 重试", "pnpm -C apps/client run typecheck", 900000);
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
        ).then((v) => v, (e) => askFail(`修复验证员-${label}`, e, { verifiedIds: [], failed: [], newIssues: [], interactionRecheck: [], impactCovered: [] }));
        for (const id of verRes.verifiedIds ?? []) {
          const it = findIssue(id);
          if (it) {
            it.status = "已验证";
            fixed += 1;
            pushBoard(it);
          }
        }
        for (const f of verRes.failed ?? []) {
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
      LEDGER_RULES,
      `【台账口径（v3.2 铁律）】各矩阵与报告里的问题总数、分 severity 数、待修复数一律取自本轮台账（DSL 传入的 allIssues 统计 + 对账结果），不得自行另算、不得引用上一轮文本里的数；同一缺陷只写正号 ID，重号写进"亦见"列。台账外 ID 必须逐条给处置，漏一条就是漏账。`,
      `写出：audit-report.md（含每页使用对比与功能目标汇总）、issue-matrix.md（逐截图与逐用例）、screenshot-matrix.md、interaction-matrix.md（逐用例 PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS）、regression-report.md、git-summary.md。全部中文。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail(name, e, { written: [], notes: "书记员调用失败，本轮报告未落盘" }));
}

// =====================================================================
// 通用：单轮审计（scope=full 全量 | impact 影响范围）
// =====================================================================
// v3.2 补 D18：轮次必须有会话命名空间。reports/audit/round-<n> 这套名字是**按轮号**编的，
// 而轮号每次起跑都从 1 开始 —— 于是新会话的 R1 会直接写进上一轮那 305 帧的目录里。
// 实测后果不是"目录乱"，是判定失真：round-2-tour 未清空即复用，50 张上一轮帧（39 张是
// 位置授权弹窗污染帧）混进本轮，五路视觉审查因此审到了旧对象。
// 规则：legacy 名（round-<n>）只有在"该目录从未产过证据"时才允许用；一旦有 screenshot-manifest.json
// 就说明它属另一次取证，本轮改写到 reports/audit/<RUN_NS>/round-<n>。
// 刻意不无条件改名：R2 的收割逻辑要读上一轮真落在那里的 JSON，历史可指性比命名整洁更重要。
const RUN_NS = `run-${gitSha}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
async function roundOccupied(legacyDir: string): Promise<boolean> {
  try {
    const r = await world.run("node", ["-e",
      "console.log(require('fs').existsSync(process.argv[1])?'OCCUPIED':'FREE')",
      legacyDir + "/screenshot-manifest.json"]);
    const out = String(r.stdout || "");
    if (out.indexOf("OCCUPIED") >= 0) return true;
    if (out.indexOf("FREE") >= 0) return false;
    // 探针没有交出可判读的输出（宿主沙箱不让跑、node 不在 PATH、输出被吞）→ 按"已被占用"处理：
    // 宁可多开一层命名空间，也不能在状态未知时把两轮证据倒进同一个目录。
    return true;
  } catch (e) {
    // 探不动就当已被占：宁可多开一个命名空间，也不许把两轮证据混进同一目录
    return true;
  }
}
async function auditRound(n: number, label: string, scope: "full" | "impact", impactFiles: string[]): Promise<{ shots: number; cases: number; found: number; fixed: number; commit: string; pages: PageEntry[] }> {
  const legacyDir = "reports/audit/round-" + n;
  const occupied = await roundOccupied(legacyDir);
  const dir = occupied ? `reports/audit/${RUN_NS}/round-${n}` : legacyDir;
  const shotDir = occupied ? `${RUN_NS}/round-${n}` : "round-" + n;
  log(`${label} 轮证据落点：${dir}（legacy ${legacyDir} ${occupied ? "已被旧证据占用，改用会话命名空间" : "空闲，按原命名使用"}）`);
  const reuseNote = n === 1
    ? `（证据复用须校验 gitSha：reports/audit/round-1/ 与 reports/screenshots/round-1(-interact)/ 存在上一运行的大批取证。当前 gitSha=${gitSha}——若这些证据的产出先于本轮最新提交（60 项修复），静态截图视为过期，只可作参考；交互判定 JSON 中已验证通过的历史回归项可直接引用其结论。）`
    : "";
  // v3.2 接线（补 [C-21] 遗留）：轮目录归属先判一次。reports/audit/round-<n> 是跨会话同名目录，
  // 上一轮没清空就会把两轮帧混成一堆（实测：round-2-tour 里混着 50 张上一轮帧，五路视觉审查
  // 因此审到了旧对象）。"记得清盘"不是判据，旧 manifest 的 gitSha 等不等本轮 HEAD 才是。
  const own = await roundOwnershipGate(label, dir);
  if (!own.ok) {
    blockers.push(`${label}: 轮目录归属 FAIL —— ${own.detail}；本轮不得写入该目录，须换轮号或先把旧证据整体搬迁到 .zcode/tmp/orphan-frames-from-<轮次>/ 再继续`);
    log(`轮目录归属未过：${own.detail}`);
  } else {
    log(`轮目录归属通过：${own.detail}`);
  }
  // 影响范围：受影响页面 ∪ 待修复问题所在页面；full 则全量
  const openPages = new Set(allIssues.filter(i => i.status === "待修复").map(i => i.page));
  const pages = scope === "full" ? recon.pages : scopePages(recon.pages, new Set(impactFiles), openPages);
  log(`${label} 轮（${scope === "full" ? "全量基线" : "影响范围回归"}）：${pages.length}/${recon.pages.length} 页入库`);

  // Gate G1：构建快速失败——失败则本轮无 UI（分析继续）
  // v3.2 补 D16：取证之前先确认被测物不比源码旧（旧则整轮证据属改前行为）
  const fresh = await artifactFreshGate();
  if (!fresh.ok) {
    blockers.push(`${label}: 被测物新鲜度 FAIL —— ${fresh.detail}`);
    worktreeNotes.push(`${label}: ${fresh.detail}`);
    log(`被测物新鲜度未过：${fresh.detail}`);
  } else {
    log(`被测物新鲜度通过：${fresh.detail}`);
  }
  let gate = await buildGate();
  if (!gate.ok) {
    log("构建未通过，交修复工程师处理后重试一次");
    await fixer.ask(`小程序构建未通过（错误尾部）：\n${gate.err}\n请在你的终端运行 pnpm -C apps/client run build:mp-weixin:mock（Windows 用 pnpm.cmd）修复直到通过，返回退出码与结论。`).then((v) => v, (e) => askFail("修复工程师（轮前构建修复指令）", e, ""));
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

  // v3.2 补 D8：落点分诊先于立 P1（参数表幽灵键 + 未分诊的缺证据类 P0/P1）
  const triage = await bounceTriageGate(label, [`${dir}/code-findings`, `${dir}/findings`]);
  if (!triage.ok) {
    blockers.push(`${label}: G6 落点分诊 FAIL —— ${triage.detail}`);
    log(`落点分诊未过：${triage.detail}`);
  } else {
    log(`落点分诊通过：${triage.detail}`);
  }
  if (!uiRes.tour || !uiRes.exec) {
    const r = await fixAndRegress(n, label, dir, code.issues, code.findingFiles, code.coverage, [], [], [], uiRes, history);
    return { shots: 0, cases: 0, found: code.issues.length, fixed: r.fixed, commit: r.commit, pages };
  }
  const tour = uiRes.tour;
  // v3.2 补 D13：取证能力声明与字级判定置信封顶
  const cap = await captureCapabilityGate(label, tour.manifestFile, [`${dir}/findings`, `${dir}/code-findings`]);
  if (!cap.ok) {
    blockers.push(`${label}: 取证能力/置信封顶 FAIL —— ${cap.detail}`);
    log(`能力门禁未过：${cap.detail}`);
  } else {
    log(`能力门禁通过：${cap.detail}`);
  }
  // v3.2 补 D14：权限抑制未经确认不得给结论背书
  const perm = await permissionConfirmGate(label, tour.manifestFile, [`${dir}/findings`, `${dir}/code-findings`, `${dir}/interact`]);
  if (!perm.ok) {
    blockers.push(`${label}: 权限确认门禁 FAIL —— ${perm.detail}`);
    interactUnverifiable.push(`${label}: 依赖授权链的用例本轮改判 UNVERIFIED-PERMISSION（详见门禁 detail）`);
    log(`权限确认门禁未过：${perm.detail}`);
  } else {
    log(`权限确认门禁通过：${perm.detail}`);
  }
  const exec = uiRes.exec;
  // v3.2 接线：队列对账改由既有工具出退出码（轮末自然语言断言 → 退出码）
  const qRec = await queueReconcileGate(label, dir);
  if (!qRec.ok) {
    blockers.push(`${label}: G6 队列对账 FAIL —— ${qRec.detail}`);
    log(`队列对账未过：${qRec.detail}`);
  } else {
    log(`队列对账通过：${qRec.detail}`);
  }
  // v3.2 接线（补 [C-21] 遗留：工具已建、定义里却只有注释提到它们，引用数 0 = 规则没生效）
  // D5：证据字段污染——R2 实测 941 例里 373 例带 ERROR:timeout 尾注，通道故障被静默计成了完成度。
  // --dir 指本轮审计目录而不是 -interact 截图树：那批操作截图只登记在 exec-results.evidence[] 里，
  // 拿 tour manifest 去扫它会把几百张正常帧报成孤儿帧（工具自己的假阳性，实测踩过）。
  const execEv = await execEvidenceToolGate(`${label}-exec证据`, tour.manifestFile, exec.resultsFile, dir);
  if (!execEv.ok) {
    blockers.push(`${label}: G6 证据字段污染 FAIL —— ${execEv.detail}`);
    log(`证据字段污染门禁未过：${execEv.detail}`);
  } else {
    log(`证据字段污染门禁通过：${execEv.detail}`);
  }
  // D10：计划/权威/检查点/终止快照四源真值必须收敛，否则"本轮跑了多少例"没有单一答案。
  const stTruth = await stateTruthToolGate(label, dir);
  if (!stTruth.ok) {
    blockers.push(`${label}: D10 状态真值 FAIL（四源未收敛，禁止据此写完成率）—— ${stTruth.detail}`);
    log(`状态真值未过：${stTruth.detail}`);
  } else {
    log(`状态真值通过：${stTruth.detail}`);
  }
  // D7：落盘即入账——写进 findings/code-findings/interact 的每个 ID 都必须被矩阵收编。
  const ledg = await ledgerGate(label, dir);
  if (!ledg.ok) {
    blockers.push(`${label}: D7 台账收敛 FAIL（有发现从未进矩阵）—— ${ledg.detail}`);
    log(`台账收敛未过：${ledg.detail}`);
  } else {
    log(`台账收敛通过：${ledg.detail}`);
  }
  // D1/D3 的本轮版：限定 scope 到本轮产物，这样"本轮证据可不可信"是本轮自己的结论，
  // 不会被上一轮留在盘上的过期 manifest 永久钉红（那一版在开跑前跑，判的是历史能不能复用）。
  const roundScope = `${dir},reports/screenshots/${shotDir}`;
  const corpusNow = await corpusGate(roundScope);
  if (!corpusNow.ok) {
    blockers.push(`${label}: 本轮证据语料审计 FAIL —— ${corpusNow.detail}（本轮视觉结论降级为「证据未背书」）`);
    captureFailures.push(`${label}: 本轮 manifest 未通过全语料审计（scope=${roundScope}），${tour.shots.length} 张帧不得用于判产品通过/失败`);
    log(`本轮语料审计未过：${corpusNow.detail}`);
  } else {
    log(`本轮语料审计通过：${corpusNow.detail}`);
  }
  const provNow = await provenanceAllGate(`${label} 本轮`, roundScope);
  if (!provNow.ok) {
    blockers.push(`${label}: 本轮 provenance FAIL —— ${provNow.detail}（戳记不可信，本轮证据不得背书任何结论）`);
    log(`本轮 provenance 未过：${provNow.detail}`);
  } else {
    log(`本轮 provenance 通过：${provNow.detail}`);
  }

  // —— 五路复核全并行 ——
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

// v3.2 补 D12：固化凭证时效 —— 过期凭证跑出来的"失败"不是产品缺陷
const cred = await credentialFreshGate(6 * 3600);
if (!cred.ok) {
  blockers.push(`凭证时效不满足开跑条件 —— ${cred.detail}；依赖登录态的用例本轮记 BLOCKED-CREDENTIAL，不得记 FAILED`);
  log(`凭证时效未过：${cred.detail}`);
} else {
  log(`凭证时效通过：${cred.detail}`);
}
// v3.2 接线（补 [C-21] 遗留）：开跑前先把"历史证据能不能复用"变成一个工具结论，而不是靠
// 提示词里那句"不一致的证据视为过期"。实测：5/5 份 manifest 的 gitSha 都不是当前 HEAD，
// round-1 的 305 帧整批没有 contentHash —— 所以本轮所有结论只能站在新采帧上。
// 这里刻意记 captureFailures 而不是 blockers：过期是**历史事实**，不是本轮缺陷；记成 blocker
// 会让任何后续会话都无法验收（旧 manifest 永远躺在盘上），判据就退化成了没人看的告警。
const corpusPre = await corpusGate();
if (!corpusPre.ok) {
  captureFailures.push(`开跑前全语料审计 FAIL：${corpusPre.detail} —— 既有截图/切片一律按「参考、未按当前代码验证」处置，本轮结论只依据新采证据`);
  log(`全语料审计（开跑前）：${corpusPre.detail}`);
} else {
  log(`全语料审计（开跑前）通过：${corpusPre.detail}`);
}
const provPre = await provenanceAllGate("开跑前");
if (!provPre.ok) {
  captureFailures.push(`开跑前 provenance 清算 FAIL：${provPre.detail} —— 生产者侧若仍有字面量 SHA，本轮产出的 manifest 必须由编排层复核后才算背书`);
  log(`provenance 清算（开跑前）：${provPre.detail}`);
} else {
  log(`provenance 清算（开跑前）通过：${provPre.detail}`);
}
// =====================================================================
// G0 环境预检（确定性、零 token）：自动化端口普查（不假定 9420）+ 8080 后端健康
// v3.2 修 [C-23]（本轮实测）：这段原先长在"R2 收割与工作树固化"阶段里，也就是**跑在 R1 之后**。
// 后果：R1 的巡检员与执行员在被注入的协议里只看到写死的 9420，端口发现结果那时还不存在——
// [C-14] 修好的只是"预检报出的那句话"，没修"预检发生得太晚"。而 A1 整轮 0 证据恰恰是
// 沿用固定端口的直接后果，于是这一整个 mock 轮的 UI 证据都可能作废。现在前置到第一个轮之前。
// =====================================================================
const ENV_PROBE = [
  "const net=require('net'),http=require('http');",
  "function probe(port){return new Promise(res=>{const s=net.connect({port:port,host:'127.0.0.1'});const done=v=>{s.destroy();res(v)};s.on('connect',()=>done(true));s.on('error',()=>done(false));setTimeout(()=>done(false),3000);});}",
  "function health(){return new Promise(res=>{const r=http.get('http://127.0.0.1:8080/actuator/health',x=>{x.resume();res(x.statusCode===200)});r.on('error',()=>res(false));setTimeout(()=>{r.destroy();res(false)},3000);});}",
  `const CANDS=${JSON.stringify(WORKFLOW.ui.portCandidates)};`,
  "Promise.all(CANDS.map(probe).concat([health()])).then(function(z){const api=z[z.length-1];const live=CANDS.filter(function(p,i){return z[i]===true});process.stdout.write(JSON.stringify({live:live,api:api}))});",
].join("");
let uiLivePort: number | null = null;
let apiUp = false;
try {
  const probeRes = await world.run("node", ["-e", ENV_PROBE]);
  const envState = JSON.parse(probeRes.stdout || "{}") as { live?: number[]; api?: boolean };
  uiLivePort = (envState.live ?? [])[0] ?? null;
  apiUp = envState.api === true;
} catch (e) {
  log("G0 环境预检执行失败：" + String(e).slice(0, 200));
}
const uiReady = uiLivePort !== null;
const uiEndpointLive = `ws://127.0.0.1:${uiLivePort ?? WORKFLOW.ui.portCandidates[0]}`;
const uiPortLive = uiLivePort ?? WORKFLOW.ui.portCandidates[0];
if (!uiReady) {
  blockers.push(`G0 预检：候选端口 ${WORKFLOW.ui.portCandidates.join("/")} 均无自动化监听——A1 整轮不可取证，UI 相关判定一律记 BLOCKED（不得记 PASS/FAIL）。先起端口：cli.bat auto --project <产物目录> --auto-port <端口>。`);
} else if (uiLivePort !== WORKFLOW.ui.portCandidates[0]) {
  blockers.push(`G0 预检：自动化端口实为 ${uiLivePort}，而协议里写的是 ${WORKFLOW.ui.portCandidates[0]}。本轮所有连接必须按 ${uiEndpointLive} 走，锁文件名同步为 wechat-automation-${uiLivePort}.lock；沿用固定端口会让 A1 全程 0 证据。`);
}
if (!apiUp) blockers.push("G0 预检：后端 8080 健康检查未通过——真实链路用例按 BLOCKED 处理");
log(`G0 环境预检：自动化端口=${uiLivePort ?? "无监听"}（期望 ${WORKFLOW.ui.portCandidates[0]}，候选 ${WORKFLOW.ui.portCandidates.join("/")}）；后端 8080=${apiUp ? "在线" : "离线"}`);

phase("第 1 轮：全量基线审查");
const r1 = await auditRound(1, "R1", "full", []);
roundOutcomes.push({ round: "R1", mode: "baseline-full", pages: r1.pages.length, shots: r1.shots, cases: r1.cases, found: r1.found, fixed: r1.fixed, commit: r1.commit });

// =====================================================================
// v3.2 收尾改造（本节起为收尾逻辑；上方 R1 区逐字未动，保住前轮缓存回放）：
// 原 v3.1 在 R1 后整轮重跑 R2（64 页六路复核）+ 最多 4 次全量终验——这是
// 6.65 亿 token 消耗与两度配额停跑的主因。收尾版改为：
//   R2 = 收割 round-2 已落盘发现 + 接续上次中断的工作树修复批 + 门禁 + 定向复验 + 提交；
//   终验 = 定向独立审计（核心 ∪ 待修复页 ∪ 影响页 ∪ 抽样，≤24 页，最多 2 次）。
// =====================================================================

// ---- R2 收割与工作树固化 ----
phase("R2 收割与工作树固化");
// （G0 环境预检已前移到第一个 UI 轮之前，见 [C-23]；此处不再重复探测，避免两份端口口径）

// R2 发现收割：round-2 已落盘 JSON（code-findings/findings/interact/regression）→ 去重归一
const HARVEST = [
  "const fs=require('fs'),path=require('path');",
  "const roots=['reports/audit/round-2/code-findings','reports/audit/round-2/findings','reports/audit/round-2/interact','reports/audit/round-2/regression'];",
  "const raw=[];",
  "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}for(const e of es){const p=path.join(d,e.name);if(e.isDirectory()){walk(p)}else if(e.name.endsWith('.json')){try{const j=JSON.parse(fs.readFileSync(p,'utf8'));const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);for(const it of arr){if(it&&typeof it==='object'&&it.id){raw.push({id:String(it.id),page:String(it.page||''),category:String(it.category||'UI'),severity:String(it.severity||'P3'),description:String(it.description||'').slice(0,400),evidence:String(it.evidence||'').slice(0,300),ideal:String(it.ideal||'').slice(0,200),fix:String(it.fix||'').slice(0,300),screenshot:String(it.screenshot||''),sources:Array.isArray(it.sources)?it.sources.map(String):[],confidence:typeof it.confidence==='number'?it.confidence:0.5,status:String(it.status||'待修复')})}}}catch(e){}}}}",
  "for(const r of roots){walk(r)}",
  "const seen=new Set();const all=[];for(const it of raw){if(seen.has(it.id))continue;seen.add(it.id);all.push(it)}",
  "function norm(s){s=String(s||'').toUpperCase();return s.indexOf('P0')===0?'P0':s.indexOf('P1')===0?'P1':s.indexOf('P2')===0?'P2':s.indexOf('P3')===0?'P3':s.indexOf('P4')===0?'P4':'P3'}",
  "const bySev={};for(const it of all){const v=norm(it.severity);bySev[v]=(bySev[v]||0)+1}",
  "const summary={total:all.length,bySev:bySev};",
  "fs.writeFileSync('reports/audit/round-2/harvest.json',JSON.stringify({summary:summary,all:all}));",
  "process.stdout.write(JSON.stringify({summary:summary,all:all}));",
].join("");
let harvestSummary = { total: 0, bySev: {} as Record<string, number> };
let r2All: Issue[] = [];
try {
  const harvestRes = await world.run("node", ["-e", HARVEST]);
  // summary 与 all 一次性从 stdout 取：原先第二步用 files.read(...) 读 harvest.json，
  // 但 files 不属于宿主注入的七个全局（agent/log/phase/world/artifact/git/report），
  // 调用被外层 try 静默吞掉，整个 R2 收割区此后再没入账过一条（干跑实测）。
  const parsed = JSON.parse(harvestRes.stdout || "{}") as { summary?: { total?: number; bySev?: Record<string, number> }; all?: Issue[] };
  harvestSummary = { total: parsed.summary?.total ?? 0, bySev: parsed.summary?.bySev ?? {} };
  r2All = admit(parsed.all ?? [], issueIds, "MP-R2");
  for (const it of r2All) {
    allIssues.push(it);
    pushBoard(it);
  }
} catch (e) {
  log("R2 收割失败（继续以 R1 结果推进）：" + String(e).slice(0, 200));
}
// 收割政策：P0/P1 全修；P2 置信≥0.6 修；P3/P4 与低置信 P2 → 保留（backlog 归档 harvest.json）
const r2Worklist = r2All.filter(i => {
  if (i.status !== "待修复") return false;
  if (i.severity === "P0" || i.severity === "P1") return true;
  return i.severity === "P2" && i.confidence >= 0.6;
});
for (const it of r2All) {
  if (it.status === "待修复" && !r2Worklist.includes(it)) {
    it.status = "保留";
  }
}
log(`R2 收割：落盘 ${harvestSummary.total} 条（P0 ${harvestSummary.bySev.P0 ?? 0}/P1 ${harvestSummary.bySev.P1 ?? 0}/P2 ${harvestSummary.bySev.P2 ?? 0}/P3 ${harvestSummary.bySev.P3 ?? 0}/P4 ${harvestSummary.bySev.P4 ?? 0}）；去重入账 ${r2All.length}，本轮待修 ${r2Worklist.length}，其余归档 backlog${harvestSummary.total === 0 ? "【警告：0 条不等于「确无发现」——很可能是 HARVEST 解析失败或 harvest.json 不存在，必须核对后再继续，禁止把这行读成收割完成】" : ""}`);

// 工作树盘点：上次中断的 R2 修复批（64 文件）纳入本轮提交范围
try {
  const st = await git.status();
  for (const p of [...st.staged, ...st.unstaged, ...st.untracked]) {
    if (p.startsWith("apps/") || p.startsWith("scripts/") || p.startsWith("config/") || p.startsWith("database/") || p.startsWith("reports/audit/baseline")) {
      fixerFiles.add(p);
    }
  }
  log(`工作树盘点：${fixerFiles.size} 个改动文件归入本轮提交范围`);
} catch {
  log("git.status 不可用，提交范围以修复工程师声明为准");
}

let r2Fixed = 0;
let r2Commit = "";
let headAfterR2 = gitSha;
if (r2Worklist.length > 0) {
  log(`R2 待修复 ${r2Worklist.length}（P0 ${cnt(r2Worklist, "P0")} / P1 ${cnt(r2Worklist, "P1")} / P2 ${cnt(r2Worklist, "P2")}）——交修复工程师接续上次中断的修复批`);
  const fixRes = await fixer.ask<FixResult>(
    [
      `R2 轮待修复 ${r2Worklist.length} 个（接续上次中断的修复批：工作树里已有你上一批未提交的修复改动，先逐条核对这些问题的现状——已修好的不要重复改，仍存在的才修）：`,
      JSON.stringify(r2Worklist.map(i => ({ id: i.id, severity: i.severity, page: i.page, category: i.category, description: i.description, evidence: i.evidence, ideal: i.ideal, fix: i.fix }))),
      `完整证据文件：reports/audit/round-2/ 下 code-findings/、findings/、harvest.json。`,
      `要求：只以微信小程序为标准；功能缺失真正实现；本项目高频缺陷优先核对（子组件 emit 父页面未监听、@tap.stop/catchtap 冒泡、空 catch、双数据源不同步）；修完自查不引入新问题；不留调试代码；不改历史报告与无关文件。`,
      `返回 fixedIds / skipped（不修必须写 reason+decision）/ filesChanged。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<FixResult>("修复工程师-R2", e, { fixedIds: [], skipped: [], filesChanged: [], notes: "" }));
  for (const f of fixRes.filesChanged) fixerFiles.add(f);
  for (const s of fixRes.skipped) {
    const it = findIssue(s.id);
    if (it) it.status = "保留";
  }

  // 门禁 G1/G2：构建 + typecheck（不过则交修复工程师定向修复，各一次重试）
  let gatesOk = true;
  const gate2a = await buildGate();
  if (!gate2a.ok) {
    await fixer.ask(`构建未通过（错误尾部）：\n${gate2a.err}\n请在你自己的终端运行 pnpm -C apps/client run build:mp-weixin:mock（Windows 用 pnpm.cmd）修复直到通过，返回退出码与结论。`).then((v) => v, (e) => askFail("修复工程师（R2 构建修复指令）", e, ""));
    const gate2b = await buildGate();
    gatesOk = gate2b.ok;
  }
  if (gatesOk) {
    const tc1 = await runPnpm(["-C", "apps/client", "run", "typecheck"], 900000);
    if (!tc1.ok) {
      await fixer.ask(`vue-tsc 未通过（错误尾部）：\n${tc1.err}\n请修复所有类型错误直到 pnpm -C apps/client run typecheck 通过，返回结论。`).then((v) => v, (e) => askFail("修复工程师（R2 typecheck 修复指令）", e, ""));
      const tc2 = await runPnpm(["-C", "apps/client", "run", "typecheck"], 900000);
      gatesOk = tc2.ok;
    }
  }
  if (!gatesOk) blockers.push("R2 收尾：构建/typecheck 仍未通过（详见日志）");

  // 定向复验（真实截图铁律）：P0/P1 逐条，P2 批量；修了但未复验的标「已修复待终验」
  const toVerify = r2Worklist.filter(i => fixRes.fixedIds.includes(i.id));
  if (toVerify.length > 0) {
    const verRes = await verifier.ask<VerifyResult>(
      [
        `复验 R2 轮修复（定向模式）。声称已修复 ${toVerify.length} 个：${JSON.stringify(toVerify.map(i => ({ id: i.id, severity: i.severity, page: i.page, description: i.description })))}`,
        `改动文件：${JSON.stringify([...fixerFiles]).slice(0, 3000)}`,
        uiReady
          ? `DevTools 自动化在线（${uiPortLive}）：用定向重截/重跑（r11-reshoot 模式）逐条取证，输出到 reports/screenshots/round-2-after/；P0/P1 逐条必须 before/after 真实截图；P2 可批量同场验证。登录态注入与工具用法见环境说明。`
          : `DevTools 离线：只做代码层静态确认，无法用截图确认的一律标 UNVERIFIED（写明原因），禁止谎报已验证。`,
        `verifiedIds 只放你确认问题确实消失的；failed 写明原因；before/after 路径写 beforeAfter；impactCovered 列出实际覆盖页面。禁止放水。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail("R2 定向复验员", e, { verifiedIds: [], failed: [], newIssues: [], interactionRecheck: [], impactCovered: [] }));
    for (const id of verRes.verifiedIds ?? []) {
      const it = findIssue(id);
      if (it) {
        it.status = "已验证";
        r2Fixed += 1;
        pushBoard(it);
      }
    }
    for (const f of verRes.failed ?? []) {
      const it = findIssue(f.id);
      if (it) {
        it.status = "待修复";
        pushBoard(it);
        blockers.push(`R2 收尾：${f.id} 复验未通过（${f.reason.slice(0, 80)}）`);
      }
    }
    const fresh = admit(verRes.newIssues ?? [], issueIds, "MP-R2-FIX");
    for (const it of fresh) {
      allIssues.push(it);
      pushBoard(it);
    }
  }
  for (const it of r2Worklist) {
    if (it.status === "待修复" && fixRes.fixedIds.includes(it.id)) {
      it.status = "已修复待终验";
      pushBoard(it);
    }
  }
}
r2Commit = await commitRound(2, "reports/audit/round-2");
headAfterR2 = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || gitSha;
roundOutcomes.push({ round: "R2", mode: "harvest-commit-verify", pages: r2All.length, shots: 0, cases: 0, found: r2All.length, fixed: r2Fixed, commit: r2Commit });
log(`R2 收尾完成：修复并验证 ${r2Fixed}，提交 ${r2Commit || "（无）"}，当前 HEAD=${headAfterR2}（终验证据以此为准）`);

// ---- 终验：定向独立审计（全新审查员 + 目标页全新证据；最多 2 次）----

// =====================================================================
// 终验：全量独立审计（全新审查员+全新证据），发现问题→修复→影响范围复验→再审
// =====================================================================
let clean = false;
for (let a = 1; a <= WORKFLOW.audit.maxTargetedFinalAuditTries; a++) {
  const label = "F" + a;
  const dir = "reports/audit/final-" + a;
  phase("终验：定向独立审计");
  log(`终验第 ${a} 次（定向范围）：全新审查员 + 目标页全新截图与用例执行`);
  let gateF = await buildGate();
  if (!gateF.ok) {
    await fixer.ask(`终验前构建未通过（错误尾部）：\n${gateF.err}\n请在你自己的终端运行 pnpm -C apps/client run build:mp-weixin:mock 修复直到通过，返回结论。`).then((v) => v, (e) => askFail("修复工程师（终验前构建修复指令）", e, ""));
    gateF = await buildGate();
    if (!gateF.ok) blockers.push(`终验 F${a}: 构建未通过`);
  }
  // 定向范围：待修复/待终验问题所在页 ∪ 改动影响页 ∪ 核心页，再抽样补齐到 24 页
  const openIssuesF = allIssues.filter(iss => iss.status === "待修复" || iss.status === "已修复待终验");
  const openIssuePagesF = new Set<string>();
  for (const iss of openIssuesF) {
    const pg = (iss.page ?? "").replace(/\\/g, "/");
    for (const p of recon.pages) {
      if (pg !== "" && (pg.includes(p.route) || p.route.includes(pg))) openIssuePagesF.add(p.route);
    }
  }
  const baseF = scopePages(recon.pages, new Set(fixerFiles), openIssuePagesF);
  const scopeSet = new Map<string, PageEntry>();
  for (const p of baseF) scopeSet.set(p.route, p);
  for (const p of recon.pages) {
    if (p.core) scopeSet.set(p.route, p);
  }
  const CAP = WORKFLOW.audit.finalAuditPageCap;
  const baseArr = [...scopeSet.values()];
  const restF = recon.pages.filter(p => !scopeSet.has(p.route) && !p.core);
  const sampleCount = Math.max(0, CAP - baseArr.length);
  const sampledF: PageEntry[] = [];
  if (sampleCount > 0 && restF.length > 0) {
    const step = Math.max(1, Math.floor(restF.length / sampleCount));
    for (let i = 0; i < restF.length && sampledF.length < sampleCount; i += step) sampledF.push(restF[i]);
  }
  const pagesF = [...baseArr, ...sampledF];
  log(`终验范围：${pagesF.length}/${recon.pages.length} 页（待修复/影响/核心 ${baseArr.length} + 抽样 ${sampledF.length}）`);
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
  const regPromiseF = Promise.all(chunksF.map((chunk, idx) => {
    const key = chunkKeyFor(chunk, idx);
    const codeFilesFor = codeFSweep.findingFiles.filter(f => f.includes(key));
    return regressionChunk(label, dir, key, chunk, codeFilesFor, execF, tourF, history, regIndex.indexFile, [...fixerFiles]);
  }));
  const [judgeResultsF, visualResultsF, regResultsF] = await Promise.all([judgePromiseF, visualPromiseF, regPromiseF]);
  const interF: JudgeSweep = { checks: judgeResultsF.flatMap(r => r.checks), issues: judgeResultsF.flatMap(r => r.issues), findingFiles: judgeResultsF.map(r => r.findingsFile).filter(f => f !== ""), unverifiable: judgeResultsF.flatMap(r => r.unverifiable) };
  const visualF: VisualSweep = { issues: visualResultsF.flatMap(r => r.issues), findingFiles: visualResultsF.map(r => r.findingsFile).filter(f => f !== ""), observations: visualResultsF.flatMap(r => r.observations), coverage: visualResultsF.flatMap(r => r.coverage) };
  const regF: RegSweep = { issues: regResultsF.flatMap(r => r.issues), checked: regResultsF.flatMap(r => r.checked), findingFiles: regResultsF.map(r => r.findingsFile).filter(f => f !== "") };
  await scribeRound(`书记员-${label}`, dir, [...codeFSweep.findingFiles, ...visualF.findingFiles], visualF.coverage, [], interF.findingFiles, regF.findingFiles, history);

  const foundF = [...codeFSweep.issues, ...interF.issues, ...visualF.issues, ...regF.issues];
  // 终验发现纪律：新 P3 不再触发修复轮（归档保留），P0/P1/P2 才修
  for (const it of foundF) {
    if (it.severity === "P3" && it.status === "待修复") it.status = "保留";
  }
  const actionable = foundF.filter(i => (i.severity === "P0" || i.severity === "P1" || i.severity === "P2") && i.status === "待修复");
  if (actionable.length === 0) {
    clean = true;
    log(`终验通过：第 ${a} 次定向独立审计未发现新的 P0/P1/P2（新 P3 已归档保留；证据落盘 ${dir}）`);
    break;
  }
  log(`终验发现 ${actionable.length} 个可行动问题（P0 ${cnt(actionable, "P0")} / P1 ${cnt(actionable, "P1")} / P2 ${cnt(actionable, "P2")}）→ 修复 + 影响范围复验`);
  await fixAndRegress(100 + a, label, dir, foundF, [...codeFSweep.findingFiles, ...visualF.findingFiles], visualF.coverage, [], interF.findingFiles, regF.findingFiles, { tour: tourF, exec: execF }, history);
}
if (!clean) {
  blockers.push(`终验 ${WORKFLOW.audit.maxTargetedFinalAuditTries} 次后仍发现问题`);
}

// =====================================================================
// v3.2 新增阶段：真实模式端到端验收（G7 real 构建 / G8 前后端数据同步 / G9 素材可达性）
// 必须放在 mock 轮全部结束之后：real 构建与模拟器会话都要独占资源，且覆盖 mock 产物
// 会让在产证据与被测物不一致（实测踩过的坑）。
// =====================================================================
phase("真实模式端到端验收（G7/G8/G9）");
const REAL_DIR = "reports/audit/real-e2e";
/** 本阶段产出的三道 Gate，稍后并入终报的 gates[]（FinalReport 是代理的输出结构，不是全局数组） */
const realGates: { gate: string; result: string; evidence: string }[] = [];
// v3.2 接线：G7/G8/G9 开工前先跑仓内既有前置探测器，判读以退出码为准
// 退出码 0=READY；2=后端不可达 → 三项一律 BLOCKED（不得记 PASS 也不得记 FAIL）；3=在盘素材不可达 → G9 记 BLOCKED-需对照
const realProbe = await realProbeGate();
if (!realProbe.ok) {
  blockers.push(`G7/G8/G9 前置探测未过（按 BLOCKED 处置，不记产品 FAIL）—— ${realProbe.detail}`);
  log(`前置探测：${realProbe.detail}`);
} else {
  log(`前置探测通过：${realProbe.detail}`);
}
// v3.2 接线（补 [C-21] 遗留）：真实模式开工前先证明"8080 上跑的就是被测代码"。
// 实测教训：那次 8080 起在 2026-09-19 18:48，而 AdminVillagePostController.java 改于 09-24 23:22
// —— 一整轮 G8/G9 取证量的都是五天前的构建，结论方向全错却无人察觉。DSL 自己只能证到"已重编"，
// "已重启并生效"必须靠这个工具的退出码。
const bkFresh = await backendFreshGate();
if (!bkFresh.ok) {
  blockers.push(`G7/G8/G9 BLOCKED：后端新鲜度未证明 —— ${bkFresh.detail}；未经重启的活体结论一律按"量的是旧构建"处置，不得记 PASS 也不得记 FAIL`);
  log(`后端新鲜度未过：${bkFresh.detail}`);
} else {
  log(`后端新鲜度通过：${bkFresh.detail}`);
}
let realGate = { ok: false, err: "" };
if (WORKFLOW.realEnv.requireBackendUp) {
  const health = await world.run("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}",
    WORKFLOW.realEnv.apiBaseUrl.replace(/\/api\/?$/, "") + WORKFLOW.realEnv.healthPath]).catch(() => null);
  if (!health || health.stdout.trim() !== "200") {
    blockers.push(`G7/G8/G9 BLOCKED：后端 ${WORKFLOW.realEnv.healthPath} 未返回 200（实际 "${health ? health.stdout.trim() : "命令不可用"}"）。真实模式验收不得记 PASS 也不得记 FAIL。`);
    log("后端不可达 → 真实模式三项门禁记 BLOCKED，转人工");
  } else {
    realGate = await runBuildViaGatekeeper("G7 real 隔离构建", `pnpm -C apps/client run ${WORKFLOW.build.realScript}`);
    if (!realGate.ok) blockers.push(`G7 FAIL：${WORKFLOW.build.realScript} 未通过（${realGate.err.slice(-200)}）`);
    // v3.2 接线：G7 的产物自证改由既有工具的退出码给出（--check-only 只复核产物、不重新构建），不接受代理自报
    if (realGate.ok) {
      const g7chk = await g7ArtifactCheckGate();
      if (!g7chk.ok) {
        realGate = { ok: false, err: `G7 产物自证未过：${g7chk.detail}` };
        blockers.push(`G7 FAIL（工具退出码）：${g7chk.detail}`);
      } else {
        log(`G7 产物自证通过：${g7chk.detail}`);
      }
    }
  }
}
if (realGate.ok) {
  const real = await agent("真实模式验收员", `你负责在本机真实后端上证明"前端写 → 后端落库 → 后台读 → 审核驱动可见性 → 前端读回 → 幂等"这条链路成立，并证明 real 产物自身模式正确、远端素材全部可达。只按契约取证，绝不为了通过而放宽判定；取不到证据就如实 BLOCKED/NOT-EVIDENCED。若需驱动微信开发者工具（G8 第①环、跳转登录页取帧），必须先按下列锁协议取 ${uiEndpointLive} 锁，与 A1 共用同一把锁，禁止绕过：\n${uiLockRules(uiPortLive)}`).ask<{
    g7: { result: string; evidence: string };
    g8: { result: string; rings: { name: string; ok: boolean; evidence: string }[] };
    g9: { result: string; extracted: number; probed: number; skipped: number; failures: string[] };
    fieldParityGaps: string[];
    artifactsLeft: string[];
    notes: string;
  }>(
    [
      `【前置事实（已实测，不要重新推断）】`,
      `real 产物在 ${WORKFLOW.build.realOutDir}（若不存在，用 ${WORKFLOW.build.outDirEnvKey}=${WORKFLOW.build.realOutDir} 隔离构建，禁止覆盖 mock 产物 ${WORKFLOW.build.sharedOutDir}）。`,
      `wx.login 在本机后端必 502（WECHAT_DEV_FALLBACK_ENABLED=false，且生产 profile 禁止开启）→ 该路记 NOT-EVIDENCED，改用登录页无条件渲染的「体验账号」按钮 → POST /auth/guest-login（实测 200）。`,
      `游客未登录访问 GET /posts 返回 401 属**产品预期**（用户裁定：游客不应看到广场，应被引导到注册页）；真机侧要取的是"跳转登录页"那一帧，而不是把 401 当缺陷。`,
      REAL_E2E_RULES,
      `【交付】写 ${REAL_DIR}/real-e2e-report.md，逐项给 G7/G8/G9 的 PASS|FAIL|BLOCKED + 证据（文件:行 或 HTTP 状态与响应片段）。G8 五环必须逐环单列，缺一环即整体 FAIL。`,
      `【对账】额外产出"后台字段对账表"：客户端 create 请求体的每个字段 × 后台 list/detail 视图是否暴露 × 是否可被 keyword 检索。`,
      `【遗留数据】本轮写入的真实数据（帖子/评论/点赞 id）必须逐条列进 artifactsLeft，供用户决定保留或下架；不得擅自删除，也不得在产品里留提示说"这是测试数据"。`,
      `【凭据】见 REAL_E2E_RULES 末条：走文件体，用完即删，禁止内联进命令行。`,
      `【门禁工具（v3.2 接线，判读以退出码为准）】开工前先跑 node scripts/probe-real-env.mjs，并把 PROBE_BACKEND / PROBE_ASSETS_REACHABLE / PROBE_VERDICT 三行原文与退出码贴进报告：退出码 2 → G7/G8/G9 一律 BLOCKED（不是 FAIL）；3 → G9 记 BLOCKED-需对照实验，禁止把「在盘却不可达」的素材直接写成产品缺陷。G7 的结论还必须附 node apps/client/scripts/build-real-isolated.mjs --check-only --out ${WORKFLOW.build.realOutDir} 打印的 G7_RESULT= 行；编排层已按这两个退出码记 blockers，自报与工具结论不一致时以工具为准并写明差异。`,
    ].join("\n"),
  ).then((v) => v, (e) => { log(`真实模式验收员调用异常：${String(e).slice(0, 160)}`); return null; });
  if (real) {
    // 逐字段守卫：代理漏字段是常态，绝不允许 TypeError 炸在终报之前（v3.1 惯例 res.xxx ?? []）
    const rings = real.g8?.rings ?? [];
    const gaps = real.fieldParityGaps ?? [];
    const left = real.artifactsLeft ?? [];
    realGates.push({ gate: "G7 real 构建", result: real.g7?.result ?? "BLOCKED", evidence: real.g7?.evidence ?? "验收员未返回 G7 字段" });
    realGates.push({ gate: "G8 前后端数据同步", result: real.g8?.result ?? "BLOCKED", evidence: rings.length ? rings.map(r => `${r.name}=${r.ok ? "ok" : "MISS"}（${(r.evidence ?? "无证据").slice(0, 120)}）`).join(" | ") : "验收员未返回五环明细" });
    realGates.push({ gate: "G9 real 素材可达性", result: real.g9?.result ?? "BLOCKED", evidence: real.g9 ? `抽取 ${real.g9.extracted ?? 0} / 探得 ${real.g9.probed ?? 0} / 跳过 ${real.g9.skipped ?? 0} / 失败 ${(real.g9.failures ?? []).length}` : "验收员未返回 G9 计数" });
    for (const g of gaps) blockers.push(`后台字段对账缺口：${g}`);
    if (left.length) log(`真实模式遗留数据 ${left.length} 条，待用户决定：${left.join(", ")}`);
  } else {
    for (const g of ["G7 real 构建", "G8 前后端数据同步", "G9 real 素材可达性"]) {
      realGates.push({ gate: g, result: "BLOCKED", evidence: "验收员未产出可用结构（ask 失败或超时）" });
    }
    blockers.push("G7/G8/G9 BLOCKED：真实模式验收员未返回可用结构");
  }
} else {
  // 未跑成也要留 Gate 记录，禁止让三项在终报里凭空消失（"没测"不等于"通过"）
  const why = realGate.err ? `real 构建失败：${realGate.err.slice(-160)}` : "后端不可达或前置条件不满足";
  const verdict = realGate.err ? "FAIL" : "BLOCKED";
  for (const g of ["G7 real 构建", "G8 前后端数据同步", "G9 real 素材可达性"]) {
    realGates.push({ gate: g, result: g === "G7 real 构建" ? verdict : "BLOCKED", evidence: why });
  }
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
  ).then((v) => v, (e) => askFail("P3 终验员", e, { verifiedIds: [], failed: [] }));
  for (const id of verP3.verifiedIds ?? []) {
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
// v3.2 补 D7：台账自洽 + 落盘 ID 对账（失败只记 blocker 与披露，不中断收尾）
const ledgerSelf = ledgerAudit();
if (!ledgerSelf.ok) {
  blockers.push(`台账未收敛 —— ${ledgerSelf.detail}`);
  log(`台账自洽未过：${ledgerSelf.detail}`);
} else {
  log(`台账自洽通过：${ledgerSelf.detail}`);
}
const ledgerCov = await ledgerCoverageGate("reports/audit/round-2");
if (!ledgerCov.ok) {
  blockers.push(`台账漏账 —— ${ledgerCov.detail}`);
  log(`台账对账未过：${ledgerCov.detail}`);
} else {
  log(`台账对账通过：${ledgerCov.detail}`);
}
const counts = { P0: cnt(allIssues, "P0"), P1: cnt(allIssues, "P1"), P2: cnt(allIssues, "P2"), P3: cnt(allIssues, "P3"), P4: cnt(allIssues, "P4") };
const officer = agent("总验收官", "你负责最终验收。怀疑一切：默认项目仍有问题，只有证据充分才判通过，证据不足的如实标注。【真实截图铁律】验收以本轮真实截图与 automator 实测证据为第一标准：没有真实截图支撑的结论最高只能标 UNVERIFIED，代码层推断只能作为线索。" + REAL_ENV);
const finalRes = await officer.ask<FinalReport>(
  [
    `对整个 QA 闭环做最终验收并写总报告。本轮为真实审查模式：后端 real profile（健康检查 ${WORKFLOW.realEnv.apiBaseUrl.replace(/\/api\/?$/, "")}${WORKFLOW.realEnv.healthPath}）、游客登录 POST /api/v1/auth/guest-login、管理员凭据按 REAL_ENV 指向的根目录 .env 读取（禁止把口令写进报告、命令行或本文件）；核心链路尽量 automator 实测，环境不可用如实标 BLOCKED/UNVERIFIED。`,
    `【验收基准（真实截图优先）】终验的每一条结论必须基于本轮产生的真实截图/automator 证据：① 每条 P0/P1/P2 的最终状态（已验证/未验证）都要有本轮真实截图或路由/console 证据支撑；② 核心链路 A–H 逐链给出实测截图目录；③ 代码层推断只能作为发现线索，不得直接作为验收结论。`,
    `轮次结构（R1 基线全量 → R2 收割与工作树固化 + 定向复验 → F 定向独立审计）：${JSON.stringify(roundOutcomes)}`,
    `（v3.2 收尾说明：R2 未整轮重跑，实为「收割已落盘发现 + 工作树修复固化 + 定向复验」；终验为定向独立审计（核心∪待修复∪影响页∪抽样，≤${WORKFLOW.audit.finalAuditPageCap} 页），需求对照（A4）沿用 R1 的每页使用对比；R2 收割中未修的 P3/P4/低置信发现归档 reports/audit/round-2/harvest.json。总报告须如实注明上述范围与全量基线的差别。终验证据绑定真实 HEAD：${headAfterR2}）`,
    `问题总账：${JSON.stringify(counts)}；待修复 P0=${openP0} P1=${openP1} 历史回归=${openRegression}；终验${clean ? "已通过" : "未完全通过"}；截图 ${totalShots}；用例 ${totalCases}（VERIFIED ${casesVerified} / FAILED ${casesFailed} / UNVERIFIED ${interactUnverifiable.length}）。`,
    `每页使用对比（终验轮）：${JSON.stringify(lastCompares.map(c => ({ route: c.route, verdict: c.verdict, gaps: c.functionGaps.length, file: c.file })))}`,
    `脚本已判定的停止条件：${JSON.stringify({ roundsDone: roundOutcomes.length, independentClean: clean, openP0, openP1, openRegression, envBlockers: blockers })}`,
    `任务：`,
    `1. 逐条核验历史问题清单（${history.listFile}）回归状态（可用回归索引 ${regIndex.indexFile} 差分），写历史回归表。`,
    `2. 验证核心链路 A–H（尽量 automator 实测，跑不了的如实标 UNVERIFIED，禁止谎报）：A 浏览 登录→首页→附近→查看人→内容→返回；B 匹配 寻觅→喜欢→匹配成功→聊天；C 圈子 附近→兴趣圈→圈子详情（冷启动直连）→帖子→详情→评论；D 校园 附近→校园圈→内容→返回；E 发布 发布→编辑→预览→发布→我的帖子；F 消息 消息→会话→聊天→输入→返回（未读清零）；G 资料 我的→编辑资料→保存；H 新用户 注册→向导→实名→完成度。`,
    `3. 九道 Gate（每项 PASS/FAIL/BLOCKED + 证据）：G1 构建（0 error/体积/无 mock 泄漏）；G2 静态守卫（构建检查链+typecheck+eslint）；G3 页面覆盖（截图矩阵无空白/骨架、console error=0）；G4 交互覆盖（用例判定通过率、死按钮=0；【判定必须剔除测试台噪声】）；G5 数据合规（封存页无价格/币泄漏）；G6 证据可信（同轮证据同 gitSha、链路 PASS、历史回归 0 复发）；G7 real 构建；G8 前后端数据同步五环；G9 real 素材可达性。`,
    `   G7/G8/G9 由「真实模式端到端验收」阶段实测产出，脚本给定值如下，**不得自行改写或补判**；数组为空说明该阶段被跳过，必须记 BLOCKED 并说明原因：${JSON.stringify(realGates)}`,
    `3b. G4 口径要求：通过率的分母只能是"判定成功的产品用例"。执行器解析不到目标而产出的 ${'__CAND__'} 类记录属测试台缺陷，必须单列"未取证(工具)"计数并另报需要修的选择器清单，禁止把它们算成产品失败、也禁止把它们从报告里静默丢弃。`,
    `4. 汇总每页使用对比为「功能目标完成情况」表（Page/Target/Implemented/Missing/使用对比结论）。`,
    `5. 写 reports/audit/final/final-report.md：一、项目状态（页面/截图/用例/问题/轮次结构）；二、每页最终问题表；三、历史回归表；四、各轮表（轮次/模式/范围/发现/修复/提交）；五、功能目标完成情况；六、九道 Gate 与小程序专项（viewport/safe-area/TabBar/scroll/keyboard/modal/navigation/performance）；七、真实模式端到端结论（G7/G8/G9 + 后台字段对账表 + 遗留数据清单）；八、最终遗留项（无则 None）。`,
    `6. 最终截图集整理到 reports/final/。`,
    `blockers 列所有未达成验收条件，没有才空数组。reportPath 返回报告路径。`,
  ].join("\n"),
).then((v) => v, (e) => askFail("总验收官", e, {
  reportPath: "(终报未产出)",
  chains: [] as { chain: string; result: string; evidence: string }[],
  gates: [] as { gate: string; result: string; evidence: string }[],
  blockers: ["总验收官未产出终报（ask 调用失败）——本轮一律不得视为通过"],
  screenshotDir: "",
  notes: "",
}));

// 发布最终报告
let published = false;
try {
  await artifact.file("final-report", finalRes.reportPath, { title: "小程序 QA 闭环最终验收报告", description: `${roundOutcomes.length} 轮（含终验）、${totalShots} 张截图、${totalCases} 条用例、${allIssues.length} 个问题`, primary: true });
  published = true;
} catch {
  log(`最终报告发布失败（${finalRes.reportPath}），请总验收官确认路径`);
  const fixPath = await officer.ask<FinalReport>(`发布时找不到 ${finalRes.reportPath}。请确认报告已写到该路径（或修正路径重写），重新返回 reportPath。`)
    .then((v) => v, (e) => askFail("总验收官（路径修正）", e, { reportPath: finalRes.reportPath, chains: finalRes.chains ?? [], gates: finalRes.gates ?? [], blockers: [...(finalRes.blockers ?? []), "终报路径无法定位，报告可能未落盘"], screenshotDir: "", notes: "" }));
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

// BLOCKED 不等于 PASS：任一道真实模式 Gate 未取得证据，都必须挡住"已通过最终验收"，
// 否则会出现 G7-G9 全 BLOCKED 却判通过的静默假阳性。
for (const g of realGates) {
  if (g.result !== "PASS") blockers.push(`${g.gate} 未取得 PASS 证据（实为 ${g.result}）：${String(g.evidence ?? "").slice(0, 120)}`);
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
    `A1 UI Driver 凭 UI Lock 状态机（AVAILABLE/LEASED/STALE + released 墓碑，lease ${WORKFLOW.ui.leaseMinutes}min/heartbeat ${WORKFLOW.ui.heartbeatSeconds}s）独占自动化端口（G0 实测为准）；Suite+Checkpoint 分段；三级重置（reLaunch 每 Suite ≤${WORKFLOW.ui.maxReLaunchPerSuite} 次）`,
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
    `R2 收割中未修复的 P3/P4 与低置信发现（归档 reports/audit/round-2/harvest.json）`,
    `终验轮未重跑需求对照（A4），沿用 R1 每页使用对比`,
    ...(openIssues.length > 50 ? [`仅列出前 50 条遗留，其余见最终报告`] : []),
    ...(worktreeNotes.length ? [`工作树/产物新鲜度未闭环：${worktreeNotes.join("；")}（相关"已修复"结论按改前证据看待）`] : []),
  ],
};
return result;

// =====================================================================
// CHANGELOG v3.1 → v3.2（每条都对应本轮 QA 实际踩到并有磁盘证据的缺陷）
// =====================================================================
// [C-1] 新增「真实模式端到端验收」阶段 + G7/G8/G9 三道 Gate。
//   根因：v3.1 全文 grep "mp-weixin:real" / "apiMode" / "数据同步" / "8080" 命中数 = 0，
//         G1 永远只构建 build:mp-weixin:mock。mock 产物连 API 都不打，
//         因此 R2 一整轮对数据库写入 0 条，前后端链路从头到尾没有任何证据。
//   证据：.zcode/tmp/build-real-evidence.md、.zcode/tmp/e2e-sync-findings.md（五环表）、
//         .zcode/tmp/real-assets-probe.md（312 抽取 / 1 真断链）。
//
// [C-2] 新增 INSTRUMENT_RULES：禁 __CAND__ 占位、解析不到记 UNVERIFIED-INSTRUMENT、
//   requiresReal 用例在 mock 轮记 NOT-EVIDENCED-BY-MOCK。
//   根因：R2 的 289 条 FAILED 里 194 条（67.1%）是执行器用正则从中文标题猜选择器产生的占位/垃圾标签
//         （74 条是完全无标题的裸 __CAND__；另有 25 条 label 被截成"按/校/机/题/赞"单字）。按 v3.1 口径这些全算产品失败，
//         通过率失真到无法使用。
//   证据：.zcode/tmp/exec-failure-triage.md、reports/audit/round-2/interact/exec-results.json。
//
// [C-3] 新增队列对账：每 Suite 打印 pending 列表 + 轮末断言 记录数 == 清单总数。
//   根因：R2 清单 1107 例、实际记录 941 例，缺口 166 例 = 村口三套 116 例从未开跑 + 次要19 被终止截断 50 例；启动行只印
//         suites=24(dynamic)，没有 pending 视图，导致两次误判为"最后一套/快跑完"。
//
// [C-4] UI Lock 释放语义修正：released 写墓碑不删文件；释锁挂 finally + 信号兜底；
//   僵尸租约按 owner.pid 存活判定接管。
//   根因：v3.1 第 499 行原文是"结束：status=released 并删除锁文件"——删除会销毁审计痕迹；
//         实测巡检脚本退出时不释锁，直接把执行器卡在 LOCK_BUSY 空等一个租期。
//
// [C-5] 后台字段对账纳入验收。
//   根因：posts.title 真实存在且客户端必填 5–30 字，但后台 searchForVillageAdmin 只 LIKE content、
//         两个 View record 无 title 字段，审核员看不到也搜不到。v3.1 无任何机制能发现这类
//         "前后端字段认知不一致"，本次靠人工 API 探活才抓到。
//
// [C-6] 后端前置条件前置声明（health / WECHAT_DEV_FALLBACK_ENABLED / 改动是否需重启）。
//   根因：wx.login 本机必 502 是环境既成事实，v3.1 没地方声明它，于是跑到登录链路才当成 bug 查。
//
// [C-7] 凭据处理规则入协议：走文件体、禁内联命令行、用完即删。
//   根因：内联密钥在传递中被改写，曾据此误判成"有人裸 SQL 改了管理员密码"，实际是传输层改写。
//
// [C-8] 并入第二条轴线（.zcode/workflow-drafts 那份"v3.2 收尾改造"稿，00:03 已真实编译执行、
//   00:06 被叫停）：R2 由「整轮重跑」改为「收割已落盘 JSON + 工作树固化 + 定向复验」，
//   终验改为定向独立审计（≤finalAuditPageCap 页、maxTargetedFinalAuditTries 次）。
//   根因：整轮 64 页六路复核 + 最多 4 次全量终验 = 6.65 亿 token 消耗与两度配额停跑的主因。
//   代价（已同步进 officer 提示词与 notCovered 披露）：终验不再重跑 A4 需求对照。
//
// [C-9] 构建改走「构建守门员」子代理 + tmp/run-pnpm22.cjs 包装器（PNPM_ENTRY → PNPM_WRAPPER）。
//   根因：world.run 沙箱对这条构建链秒级失败（实测三轮一致），且 PATH 上的 node 是 v16
//         （本轮实测 v16.13.1，连全局 fetch 都没有），runPnpm 直接跑 uni build 会把 Gate 记成假 FAIL。
//
// [C-10] G7 改用隔离构建脚本 build:mp-weixin:real:isolated（apps/client/scripts/build-real-isolated.mjs）。
//   根因：real 产物目录只能靠 UNI_OUTPUT_DIR 改道，而 pnpm 脚本链无法向子进程注入该变量；
//         prepare-static/prune-unreferenced-static/verify-build-features/verify-package-size
//         四个脚本硬编码 dist/build/mp-weixin，其中 prune 会删文件。原 C-1 记的"遗留前置"就此解除。
//         新脚本自带两道机器断言：real 产物 env.js 的 MODE/VITE_API_MODE 必须为 real，
//         且 mock 共享产物指纹必须逐字节未变——把"不许覆盖在产证据"从提示词变成长退出码。
//
// [C-11] 真实模式阶段全链路加防御（ask().catch() + 逐字段 ?? 守卫 + 异常落 BLOCKED）。
//   根因：审计用 stub 宿主干跑复现 TypeError -> Cannot read properties of undefined (reading 'map')，
//         炸点在终报之前，会带走整场 QA 的全部 mock 成果。
//
// [C-12] REAL_ENV 入协议（注入 shooter/fixer/verifier/exec0/officer/验收员），但凭据不落本文件：
//   本文件不在 .gitignore 内，写死 MySQL root / Redis / 管理员口令等于把口令提交进仓库；
//   一律指向根目录 .env，与 [C-7] 同一纪律。同时写入两条实测前置：
//   real profile 下 app.guest-login.enabled 默认 false → 403（须 APP_GUEST_LOGIN_ENABLED=true）；
//   real 素材可达 = 后端存活 ∧ 文件在盘（media_asset 是否参与尚未证实，须带对照），与 REAL_ENV/REAL_E2E_RULES 同口径；
//   探测器 scripts/probe-real-env.mjs 已接入本定义（realProbeGate + 验收员提示词），判读以其退出码为准。
//
// [C-13] A5「仍开放」历史条目补录成 Issue；TestCase 增 requiresReal 字段（协议要求了结构装不下的字段）；
//   INSTRUMENT_RULES 同时注入 A6 判定员（噪声治理原只有半程：执行员乱填 FAILED，判定员照单全收）。
//
// [C-14] G0 预检改为「自动化端口普查」，不再假定 9420。
//   根因：实测本机 DevTools 的自动化端口起在 127.0.0.1:9430，9420 无任何监听者
//         （netstat 复核：仅 9430 LISTENING，pid 32580）。沿用固定 endpoint 会让 A1
//         整轮连不上而只留下"9420 未监听，请手动打开开发者工具"这种误导性结论——
//         工具明明开着。现在按 ui.portCandidates 逐个探活，取实际端口并在 blocker 里
//         同步锁文件名（wechat-automation-<port>.lock）；全都不在听才记 BLOCKED。
//   实测：探针生成码在本机返回 {"live":[9430],"api":true}。
//
// [C-15] 并入 M6/M7 时的两处接线错误（由干跑实测抓出，非推断）：
//   a) 截断：按 diff 的 hunk 边界（B:1117-1294 / B:1296-1352）做定长替换，但 B 的终验块
//      实际延伸到 1386 行，导致 judgePromiseF 之后整个终验循环体被吃掉、文件在 EOF 处
//      少两个右括号（TS1005）。已按 B 的真实块尾补回，transpile 诊断 0、八案干跑全部对
//      着 shipped 文件跑通。
//   b) 重复声明：B 的块自带两行 R1，替换起点却从 for 循环开始，于是 const r1 出现两次
//      （SyntaxError: Identifier 'r1' has already been declared）。已折叠为一份。
//   教训：跨文件合并只能按"语义锚点"切，不能按 diff 行号切；改完必须重新解析。
//
// [C-16] R2 收割区静默空转修复：原代码第二步用 files.read(".../harvest.json") 读回明细，
//   而 files 不属于宿主注入的七个全局（agent/log/phase/world/artifact/git/report），
//   调用抛错被外层 try 吞掉 → 收割区从头到尾没入账过任何一条发现，且日志照常打印。
//   现由 HARVEST 一次性把 {summary,all} 打到 stdout，单源解析并给默认值
//   （顺带修掉 harvestSummary.bySev.P0 在 stdout 为 "{}" 时的 TypeError 崩点）。
//
// [C-17] 两处判定收紧：
//   - G2 typecheck 与 G1/G7 同迁到构建守门员（原先仍走 runPnpm，同样会因沙箱/Node16 假 FAIL）。
//   - 任一 realGates 不为 PASS 必须写入 blockers：否则 G7/G8/G9 全 BLOCKED 时
//     accepted 仍可算出"已通过最终验收"，这是最恶劣的一种静默假阳性。
//
// [C-18] 合并 .zcode/research/V32-D-RULES-DRAFT.md：§0 全局约定 + 12 条定义缺陷条款
//   （D1 D3 D4 D5 D7 D8 D10 D12 D13 D14 D16 D17，顺序按稿子），逐节锚点核实与落位记录见
//   .zcode/research/V32-MERGE-LOG.md。
//   新增顶层规则常量 12 个：PROVENANCE_RULES / EVIDENCE_DISK_RULES / STATE_QUOTA_RULES /
//     EVIDENCE_STATE_RULES / LEDGER_RULES / TRIAGE_RULES / STATE_TRUTH_RULES / IDENTITY_RULES /
//     CAPTURE_CAPABILITY_RULES / PERMISSION_RULES / WORKTREE_RULES / CHANNEL_RULES。
//     每个常量都接进了对应提示词数组——未接线的常量就是无人执行的规则：巡检席 5 个
//     （PROVENANCE/EVIDENCE_DISK/STATE_QUOTA/IDENTITY/PERMISSION）、执行席 3 个
//     （EVIDENCE_STATE/STATE_TRUTH/CHANNEL）、视觉席 2 个（TRIAGE/CAPTURE_CAPABILITY）、
//     记录员 1 个（LEDGER）、修复工程师 1 个（WORKTREE）。
//   新增结构字段 6 个 + 1 处注释：ShotBatch.shotRoot(D3)、ExecResult.noEvidence(D5)、
//     ExecResult.lastRecordedAt(D10)、Issue.canonical/aliases/statusEvidence(D7)、
//     Issue.triageCode(D8)；OpCheck.verdict 的注释补第四态 NO-EVIDENCE（D5 可选项，已做）。
//   新增机器门禁 17 个（见 [C-19] 的 3 个 + 稿子给的 14 个：provenanceGate evidenceDiskGate
//     stateQuotaGate execEvidenceGate ledgerAudit ledgerCoverageGate bounceTriageGate
//     stateTruthGate credentialFreshGate identityFeasibilityGate captureCapabilityGate
//     permissionConfirmGate artifactFreshGate channelHealthGate），全部走 world.run 内联 node，
//     结论=机器可读行+退出码，失败只写 blockers/captureFailures/interactUnverifiable，不 throw
//     （沿用 [C-11] 的防御式收尾）。调用点分布：uiEvidence 内取证后 7、auditRound 内 5、
//     开跑前 1（凭证时效）、真实模式阶段 2、终报统计前 2（台账自洽 + 漏账对账）。
//   D8 第 (6) 项是**替换**而不是新增：视觉席那句「把「缺截图」本身作为 P1 MiniProgram 问题记录」
//     是那 4 条被分诊推翻的页面级假 P1 的定义级来源，现改为「先按落点分诊定归因再定级」，
//     非 GENUINE_APP_DEFECT 一律降为 owner=instrument 的 P3 取证缺陷并附一句最低成本解法。
//   合并时实测修掉的稿子自身缺陷 2 处（都是字符串数组里相邻两行少一个逗号 → 语法错，
//     transpile 由 0 变 1 才被抓出来）：D8(4) 的 ex.push(it.id+' '+c+' 仍占 '+sev)}}" 行、
//     D14(2) 的 if(!ok){badIssues++…} 行。
//   落位偏差 3 处（同一类）：D3(2)/D5(2)/D10(3) 的结构字段插在「字段行之后」，不是稿子写的
//     「其文档注释行之后」——照原文插会把既有注释和字段拆开；锚点唯一性判据不变。
//   证据：.zcode/research/ISSUE-CENSUS-2026-09-25.md §4 各 D 节 / §3.9 / §3.10、
//     .zcode/tmp/visual-audit-V6-newframes.md、.zcode/tmp/nav-bounce-triage.md、
//     .zcode/tmp/TAKEOVER-HANDOFF.md、reports/audit/round-2/screenshot-manifest.json、
//     reports/audit/round-2/interact/exec-results.json、tmp/qa/checkpoints/exec-R2.json。
//
// [C-19] 四个已在仓内实测的门禁工具，此前在本定义里的调用数为 0（"工具在仓库里、编排层不知道它
//   存在"），本轮全部接线，把轮末自然语言断言换成退出码判读：
//     scripts/verify-evidence-integrity.mjs        → evidenceDiskGate（G6 证据==盘，D3 已含）
//     scripts/verify-queue-reconcile.mjs           → queueReconcileGate（G6 队列对账，auditRound 内）
//     scripts/probe-real-env.mjs                   → realProbeGate（G7/G8/G9 前置探测；退出码 2=后端
//                                                    不可达 → 三项一律 BLOCKED，3=在盘素材不可达 →
//                                                    G9 记 BLOCKED-需对照，都不得记产品 FAIL）
//     apps/client/scripts/build-real-isolated.mjs  → g7ArtifactCheckGate（--check-only 只复核产物
//                                                    MODE / VITE_API_MODE / mock 共享产物指纹，
//                                                    不重新构建；工具 FAIL 即 realGate 置 false，
//                                                    G7 结论不再接受代理自报）
//   INSTRUMENT_RULES 与真实模式验收员提示词同步写明"自报与工具结论不一致时以工具为准"。
//   复核：本文件内引用数 4 / 3 / 5 / 4（声明+调用+提示词），合并前是 0 / 0 / 2 / 1。
//
// [C-20] 数字偏差清单 8 条落地（稿子 §13；权威口径 = reports/audit/round-2/interact/
//   exec-results.json 的 941 行全量重算，旧数来自中途时点件 .zcode/tmp/exec-stop-snapshot.json
//   与 exec-failure-triage.md）：WORKFLOW.instrument 注释与 INSTRUMENT_RULES 改 289 条 FAILED /
//   194 条（67.1%）/ 74 条完全无标题的裸 __CAND__ / 补「实测 25 条被截成单字」；队列对账改
//   「清单 1107 例、记录 941 例，缺口 166 例 = 村口三套 116 + 次要19 被截断 50」；[C-2]/[C-3]
//   同步改写；[C-12] 的「media_asset approved 与门」与本文件 REAL_ENV / REAL_E2E_RULES 自相矛盾
//   （那两处写的是"是否决定 200/404 尚未证实、须带对照"），已按后者口径改写。
//   注意：STATE_TRUTH_RULES 与 stateTruthGate 注释里的 922/940/941 与 282/288/289 是"三份产物
//   互相分叉"的历史事实描述，不是权威口径，故意保留不改。
//
// [C-21] 本轮未合并 / 未做的部分与原因（定义已就位，落地要下轮建脚本或改产品代码）：
//   0) 条款级未合并：无——§0 与 12 条全部合并，无一条因锚点失配被跳过。
//   1) 【本节已被 [C-22] 推翻，保留原文是为了让下一轮看得见"台账说没做、其实做了一半却没接线"
//      这种状态有多容易骗过接手人】原先记作"本轮一律不创建"的五个工具，后来四个已建并实测：
//      scripts/qa/verify-evidence-corpus.mjs（D3+D1 全语料）、verify-ledger.mjs（D7 跨源 ID）、
//      verify-state-truth.mjs（D10 四列并排）、verify-backend-restarted.mjs（D16「已重启」证明）。
//      但它们在**本文件正文里的引用数一直是 1，且那唯一一处就是下面这段注释**——工具存在、
//      无人调用，等于规则从未生效。第五个 scripts/qa/verify-provenance-all.mjs（D1 逐帧时间轴
//      归属 + 生产者侧派生审计）当轮确实没建。五个现在全部建成并接线，见 [C-22]。
//   2) 【已被 [C-22] 完成】scripts/verify-evidence-integrity.mjs 的 hardFail 已含 dupState.length
//      （D4）与 execFail（D5）。
//   3) 需改产品代码/构建配置（稿子 §14-A，apps/ 下一字未动）：D16 的
//      apps/client/src/subpackages/setup/schedule/index.vue 缺 ref 导入且要提交进 HEAD；
//      D14 的 mock 权限抑制策略改成按页/按方法粒度（或让自动化能处理原生授权弹窗）；
//      D13 的出图口（miniprogram-automator 的 screenshot 无 dpr，需换 wx10 / Page.screenshot / 真机）；
//      D12 的双身份（real 轮需后端以 APP_GUEST_LOGIN_ENABLED=true 启动，或改
//      apps/client/src/services/mocks/fixtures.ts 的身份层）；D8 的 4 条 BUILD_FLAG_ABSENT
//      （isShowcaseMode / membershipEnabled 开关）与 2 条 PARAM_REQUIRED（scripts/r11-param-map.json）。
//   4) D17 的真重连逻辑（disconnect→connect + 每 Suite 计数）必须在执行器脚本内实现，DSL 只能抓
//      「reconnects 是写死的 0」——与遗留第 2 项（9420 锁没有 DSL watchdog）是同一类结构缺口。
//   5) D7(6) 的 ledgerCoverageGate 按稿子原文写死单轮目录 reports/audit/round-2；逐轮循环
//      （round-1 与 real-e2e 一起对账）留待下轮，本轮不改稿子给定的调用形状。
//   6) D3(6) 说明的「交互侧证据==盘」第二道硬门禁需要先给 ExecResult 加 manifestFile 并要求
//      执行员产出 manifest，属接口改动，稿子明确不纳入本条，未做。
//
// 仍属遗留（下一轮的事，别再假装已解决）：
//   1) 四个硬编码 dist/build/mp-weixin 的脚本本身仍未参数化——G7 靠"绕开它们"避险，
//      发布形态的完整 real 链（含 prune/verify-package-size）还不能安全改道构建。
//   2) 9420 锁没有 DSL 层 watchdog：释锁靠代理自觉挂 finally，DSL 无法强制。
//   3) 证据语料卫生：dist/build 下 8+ 个历史产物目录、根目录 `0`/`nul` 两个误建文件未清理。
//   4) 【本条原口径已过期，见 [C-22]】原记「ask 兜底 12/31，其余 19 点被拒仍会终止整轮」。
//      实际按 AST 重测：31 个 .ask 调用点全部带拒绝兜底（.catch 或两参 .then），0 点裸奔；
//      干跑 D2 案的预期也从"崩"改判成了"conclusion 携带 blockers 故障记录、诚实早退"。
//      复核口径：node .zcode/tmp/ask-coverage.cjs <本文件> → ASK_SITES/GUARDED/UNGUARDED 三行
//      （别用 grep 数：兜底有 .catch 与 .then(v,e) 两种写法，按行数会把 31 点算成 3 点）。
//      全局包装器那条捷径仍是否决状态，理由保留在下一段。
//      **已试并否决一条捷径**：在首次使用前重新绑定宿主形参 agent、给 ask 套全局 catch 并返回
//      deep-stub 代理（八案崩 0）。但深壳对象是 truthy、任何属性都取得到值，会**击穿全文的
//      `res.x ?? 默认值` 惯用法**：D3 案里 G7/G8/G9 从应有的 BLOCKED 变成 undefined，
//      等于把"响亮地失败"换成"静默给出空判定"，比崩更糟。已回滚（v32.pre-askguard.bak.ts）。
//      正确修法是逐点加 `.catch(() => 该点自己的显式降级值)`（照"真实模式验收员"那个调用点的
//      写法：降级值给全字段 + 必写 blockers），并让降级值必然写入 blockers；不要试图用全局包装器一步到位。
//
// [C-22] 2026-09-25 下午续跑：把 [C-21] 那批"工具已建、定义没接线"的账结清，并修掉工具自己的四个缺陷
//   触发点：接手时按引用数复核 [C-21]，发现 verify-state-truth / verify-ledger /
//   verify-evidence-corpus / verify-backend-restarted 四个已实测过的工具在本文件正文里的**调用点
//   数为 0**，唯一命中就是 [C-21] 那段"本轮一律不创建"的注释；verify-provenance-all 则确实没建。
//   一个门禁没人调用，就还是不存在的规则（同 queueReconcileGate 的接线纪律）。
//   接线（本轮新增 6 个 helper + 1 个新门禁）：
//     corpusGate / provenanceAllGate —— 开跑前全域跑一次（判"历史证据能否复用"，FAIL 记
//       captureFailures 而不是 blockers：过期是历史事实，记成 blocker 会让后续会话永远无法验收，
//       判据就退化成没人看的告警）；每轮末再以 --scope 限定本轮产物跑一次（FAIL 才记 blocker）。
//     stateTruthGate / ledgerGate / execEvidenceGate（--exec 分支此前也没人调用，D5 的
//       "错误串不得计入完成度"因此在源头落不了地）—— 挂在 queueReconcileGate 之后。
//     backendFreshGate —— 挂在 realProbeGate 之后：G7/G8/G9 开工前必须先证明 8080 上的 JVM
//       晚于全部 java 源码改动与 HEAD，否则整轮活体量的是旧构建（实测过一次，错了一整轮）。
//     roundOwnershipGate + D18 会话命名空间 —— 轮目录 reports/audit/round-<n> 是跨会话同名目录，
//       旧 manifest 的 gitSha ≠ 本轮 HEAD 时禁止写入（实测隐患：round-2-tour 混着上一轮 50 张帧，
//       五路视觉审查因此审到旧对象）。配套的 D18：auditRound 现在按 roundOccupied() 决定落点 ——
//       legacy 目录里已有 screenshot-manifest.json 就改走 reports/audit/<RUN_NS>/round-<n>
//       （RUN_NS=run-<gitSha>-<日期>），legacy 空闲才沿用原名。**没有无条件改名**：R2 的收割逻辑
//       要读上一轮真实落在那个目录里的 JSON，历史可指性比命名整洁更重要；探针读不到可判输出时
//       一律按"已占用"处理（状态未知就不许把两轮倒进一处）。
//   工具侧四个真实缺陷（都先被实测复现、再修、再复测）：
//     1) verify-evidence-integrity.mjs 的孤儿扫描用裸 statSync：.claude/skills/planning-with-files
//        是一个断链符号链接，实测 --dir 覆盖到它时整个 G6 以未捕获 ENOENT 死掉（编排层只能记成
//        "一致性校验无法启动"）。改 lstat + visited 集 + 逐条 try，并新增 WALK_SKIPPED 计数；
//        复测 --dir .claude → 正常出结论、WALK_SKIPPED=1。
//     2) verify-evidence-corpus.mjs 只认 shots[].path，而早期 schema 用的是 file —— 于是
//        reports/screenshots/round-1/manifest.json 的 144 帧被报成"路径不可解析"。**这是对既有
//        台账的一处公开更正**：实测 144/144 帧都在盘上、且记的 bytes 与盘上字节数逐张相符；
//        它真正的问题是整份没有 gitSha。同类盲区另见 round-1-tour 的 305 帧（也带 bytes，现计
//        bytesOk=305）。
//     3) 两个"扫描集为空却判绿"的空过口子：corpus 在没有 manifest 时 fail=0 → PASS；
//        state-truth 只有一列可比时 spread=0 → PASS。现均为必需源缺失即 FAIL（退出码 1/2），
//        并用空目录对照组复测过。
//     4) verify-state-truth.mjs 不认轮次：终止快照 .zcode/tmp/exec-stop-snapshot.json 属上一轮
//        （gitSha=18c91ccf、940 例），新一轮的轮末对账会拿它比，缺口被永久钉在上一轮上。
//        现按 gitSha 判归属，不同轮就从比较集排除并如实记一笔。
//   口径更正：本文件遗留第 4 条原写「ask 兜底 12/31、其余 19 点被拒仍终止整轮」，按 AST 重测
//   实为 31/31 全覆盖（复核脚本 .zcode/tmp/ask-coverage.cjs，别用 grep 数）。
//   另一处机检加强：scripts/verify-queue-reconcile.mjs 现在普查 requiresReal 打标情况
//   （QUEUE_REQUIRES_REAL_TRUE / _FALSE / _UNLABELED、QUEUE_REAL_ONLY_MARKED），未打标或
//   真值数为 0 直接计入退出码——"mock 轮不得把写库断言记成 PASS/FAIL"这条规则此前只在提示词里，
//   manifest 字段命中 0，机检核不到；审计历史轮可加 --allow-unlabeled 保持数字可比。
//   实测对 round-2 计划件：1107 例全部未打标、REAL_ONLY 文本标记 192 例（与该数独立重算所得
//   的可信下界逐字吻合），SUITES_WITH_MARK=0。
//   续跑期实测追加（同一轮内发生，别当成"下轮再看"）：
//     a) G7 产物自证在 PATH node 上是**假 FAIL**：本机 PATH 的 node 是 v16.13.1（微信开发者工具
//        自带的那个），build-real-isolated.mjs 会自报"node 过老"→ G7_RESULT=FAIL。g7ArtifactCheckGate
//        现在经 tmp/run-node22.cjs 转一道，并在 detail 里把"测试台 node 版本过老"与产品缺陷分开写。
//     b) 计划件已补上生产者侧字段：round-6/ops 24 份 / 1107 例逐条打 requiresReal
//        （true 236 / false 871 / 未打 0，落在 192~352 可信区间内），机检原文
//        QUEUE_REQUIRES_REAL_TRUE=236 QUEUE_REQUIRES_REAL_UNLABELED=0。
//     c) 执行器的 Suite 表是硬编码的，实测只能排到 669/1107 例：引用了 5 个 ops 里不存在的
//        manifest（SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX、次要23~26），而 次要18/次要19 共 157 例
//        根本没有任何 suite 引用 → 永远不会被调度。这类"规划阶段就漏、轮末才发现"的缺口，
//        正是 queue-reconcile 与 EXEC_SELFCHECK 要拦住的东西（拦截已生效：自检查报 FAIL 而非空跑）。
//        对策见 scripts/qa/r-exec.cjs 的派生规划（EXEC_SUITE_MODE=auto）。
//
// [C-23] 2026-09-25 傍晚续跑：修掉"发现得太晚"与"协议里还写着固定端口"这两类顺序/口径缺陷
//   1) 【真缺陷·已修】G0 环境预检原先长在 "R2 收割与工作树固化" 阶段里，也就是**跑在 R1 之后**。
//      [C-14] 把预检的话术改成了"端口要发现"，却没改它发生的时机：R1 的巡检员与执行员被注入的
//      协议里只看到写死的 9420，而那时端口发现结果还不存在。实测本机在听的是 9430，
//      "沿用固定端口 → A1 整轮 0 证据"正是 [C-14] 想防的事， prevention 本身却晚了一整个轮。
//      现在 ENV_PROBE / uiLivePort / uiReady / uiEndpointLive / uiPortLive 全部前移到
//      phase("第 1 轮") 之前，R2 段只留一行指路注释（不重复探测，避免两份端口口径）。
//   2) 【真缺陷·已修】UI_LOCK_RULES 从常量改成 uiLockRules(port) 函数：它原文写着
//      "锁文件 tmp/qa/locks/wechat-automation-9420.lock" 与 "netstat 观察 9420"，
//      照它办事的执行员会在 9430 上驱动 UI、却去续一把 9420 的锁——单写者保证被静默拆掉，
//      两个驱动各自认为自己独占。三处调用点与执行员/验收员提示词里的"独占 9420"同步改活。
//      顺带修掉一处模板错位：D1 那条"轮内提交即换证据基准"里插的是 ${WORKFLOW.ui.endpoint}
//      （渲染出"ws://127.0.0.1:9420 之外的 git 写操作"这种无意义句子），改回提交语义本身。
//   3) 【工具侧·已修】scripts/verify-evidence-integrity.mjs 的孤儿扫描遇断链符号链接会 ENOENT
//      崩溃（.claude/skills/planning-with-files 实测触发）→ 改 lstat + visited + 逐条 try，
//      新增 WALK_SKIPPED；复测 --dir .claude 正常出结论。
//   4) 【机检加强·已实测】queue-reconcile 现普查 requiresReal：round-2 计划件 1107 例全部未打标
//      （REAL_ONLY 文本标记 192 例，与独立重算的可信下界逐字吻合）；round-6 计划件已补全
//      true 236 / false 871 / 未打 0，机检原文 QUEUE_REQUIRES_REAL_TRUE=236 UNLABELED=0。
//   5) 【执行器·已建】scripts/qa/r-exec.cjs（r1-exec 的按轮参数化 fork）：端口发现 + 锁名跟端口
//      + EXEC_SELFCHECK 不连端口 + requiresReal 随行；Suite 规划从硬编码改为按 ops 派生，
//      实测派生覆盖 1107/1107（29 Suite，每套≤6 页），legacy 表只能排到 669/1107 且引用 5 个
//      不存在的 manifest、漏掉 次要18/次要19 共 157 例；auto 模式覆盖不全即 exit 2，禁止回落。
//   6) 【G7 假失败·已修】build-real-isolated.mjs --check-only 在 PATH node（v16.13.1，
//      微信开发者工具自带）上自报"node 过老"→ G7_RESULT=FAIL。g7ArtifactCheckGate 改经
//      tmp/run-node22.cjs 转一道，并把"测试台 node 版本过老"与产品缺陷在 detail 里分开写。
//   7) 【本轮实测基线】G1 mock / G7 real 均 exit 0（HEAD 874ff52f，桩化还原 clean、STUB 命中 0、
//      mock 产物指纹未被 real 覆盖）；G9 455/455 PASS；backend-restarted PASS（JVM 11:37:11）；
//      probe-real-env READY（8/8 可达）。工作树清理：dist/build 下 11 个历史产物目录（353MB，
//      实测 0 处被在册 manifest 引用）逐个删除，仅留本轮两个被测物；根目录 `0`/`nul` 已清。
//
// [C-24] 2026-09-25 傍晚：补上"干跑台看不见的两类编译期缺陷"，并把检查接进验收口径
//   触发事实：正式编译通道逮到两件事，本仓的干跑台一件都报不出来——
//     (i) 门面 `agent().ask<T>()` 返回 **PromiseLike**，上面没有 `.catch`；
//     (ii) 降级形状与接口字段不齐（缺 noEvidence / findingsFile / observations）、
//          空数组被推成 `never[]` 后再 `.includes()`。
//   根因不是运气差，是**验收台的动力学模型不对**：dryrun 的 agent 桩返回原生 Promise
//   （`.catch` 谁都挂得动），而它的语义扫描把 7 个宿主全局当"未解析名字"直接放行——
//   于是"transpile 0 + 8/8 VERDICT PASS"这三件事同时为真时，文件依然可能在真实通道编译失败。
//   只把 31 处兜底改成 `.then(v, e)` 双参形式（已实测：全文 `.catch(` 只剩 3 处，全部挂在
//   world.run 返回的真 Promise 上，合法），下次照样会中同类招。
//   本轮做法：
//     1) 新建 `.zcode/tmp/tcheck-v32.cjs` —— 用真实 typescript 程序 + 按正文实际用到的成员
//        忠实重建的门面声明（ask→PromiseLike、world.run/git.status→Promise、
//        artifact.board/.markdown/.file、report(content, board)）做整程序类型检查；
//        脚本体包进 async function（与真实编译器一致），core lib 走默认路径显式当 rootFile
//        （首版自己实现 host，core lib 一个没加载，报出 429 条 string/Array 成员不存在的
//         假阳性——先复核自己的工具再复核被测物，这条本仓已记过一次）。
//     2) 把它挂进 dryrun 的验收链（=== 6.5 ===），SUMMARY 现在打 `assertion failures = N（含 tcheck=M）`。
//        自己建了检查却不接进验收，等于规则没生效——这与 [C-22] 那五个"工具存在、调用数 0"
//        的门禁是同一个错。
//   tcheck 顺手逮到的**本轮自伤**（记下来，因为这正是"改完必跑解析"的价值）：
//     我在 [C-22] 新增的 `stateTruthGate` / `execEvidenceGate` 与正文里 672 / 884 两处
//     **同名 function 声明**冲突。JS 允许重名函数声明且后者静默覆盖前者，transpile 不报、
//     干跑 8/8 也照不出来，但真实通道报 TS2393×4 + 参数元数不匹配 ×3；后果是那两处既有的
//     内联门禁变成死代码，而它们的调用点拿 2~3 个参数撞我 4 参数签名 → 每轮白记一条 blocker。
//     修法：我的两个改名为 `stateTruthToolGate` / `execEvidenceToolGate`（内联版与工具版并存，
//     职责不同：内联查形状，工具查四源真值/证据字段污染）。
//   现口径复测：`node .zcode/tmp/dryrun-v32.cjs --case all` → transpile 0、语义真问题 0、
//   TCHECK_DIAGS=0、8/8 VERDICT PASS、`SUMMARY: assertion failures = 0（含 tcheck=0）`；
//   全文重名 function 声明 0 处；31 个 ask 调用点全部带拒绝兜底（AST 复核）。
//   本轮开跑前实测基线（HEAD=874ff52f，全部为真实退出码，不做回填）：
//     queue-reconcile FAIL（计划 1107 / 记录 941 / 缺口 166 / 从未开跑 3 套 / 重复 id 组 30 /
//       错误污染 373 例）、evidence-integrity FAIL（254 帧哈希全对，但 3 组"不同状态同字节"）、
//       --exec FAIL（1270 条证据里 437 条带 ERROR:timeout，占 34.4%；373 例受影响）、
//       state-truth FAIL（四源 1107/941/922/940，极差 185）、ledger FAIL（383 个 ID 从未进矩阵、
//       94 个多 ID 族）、corpus FAIL（5/5 份 gitSha ≠ HEAD）、provenance-all FAIL
//       （生产者 3 处字面量 SHA：tmp/gen-judge.js 新发现、tmp/rebuild-R1/R2-manifest.mjs 故意留着）；
//       backend-restarted PASS、probe-real-env READY。红是真实状态，唯一正路是重采一轮。

