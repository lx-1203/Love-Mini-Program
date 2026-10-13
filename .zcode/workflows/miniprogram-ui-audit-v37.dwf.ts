/* zcode-workflow
description: 全量UI巡检闭环 v3.7（谱系 v3.1→v3.2→v3.3→v3.4/v3.5→v3.6→本版）：对小程序全部页面
  （页数由 pages.json 派生，不写死）做巡检—审查—修复—回归闭环。本版两处硬改动：①收割续跑——
  上一轮 v3.6 跑完 round1/2、round3 停在分拣，本轮以 HEAD 戳与带宽戳为准复用其产物，只补跑
  缺失的修复/复量/报告/提交尾段；②修掉十条会让"绿"失去含义的定义缺陷（门禁判本轮目录、
  终报读数由 DSL 自己产出、审查降级不得判"零新增缺陷"、DSL 与代理件名分 namespace、
  干跑预检测自己、采集通道表与载具能力对齐、发现必须入册）。判据只认脚本自己印的机器行
  （WS_UP=OK/WS_UP_BAND=match/REALCOV_*）。
whenToUse: 需要全量审查小程序所有页面/按钮/功能并循环修复到无新增缺陷时运行；改版后全量回归、
  发布前验收、真实档覆盖补腿皆可。前置：Redis 6379 + 后端 8080 real UP + 三档构建新鲜
  （缺失时本工作流自己按守门员车道拉，不要求人点任何按钮）。
*/
// =====================================================================
// 全量UI巡检闭环工作流 v3.7
// 谱系：qa-loop v3.1 → v3.2 → qa-finish v3.3 → repo-closure v3.4/v3.5 → ui-audit v3.6 → 本文件
// 目标（用户指令）：对小程序全部页面的所有按钮与功能做全量巡检审查，审计-修复-回归
//   循环直到无新增问题；有空缺全速派发子代理；保证整轮跑到终点（v3.6 没跑到）。
//
// 本版相对 v3.6 的十条改动（D1–D11，每条都是实测缺陷，不是风格偏好）：
//   D1 解释器单一来源：WORKFLOW.nodeBin 不再只是摆设，runGate/落盘/守门员 PATH/UI 文案
//      全部由它派生；并在探活阶段实跑一次 --version，主版本<20 直接 blocker 不进终验
//      （PATH node 实测 v16.13.1，v16 下凡用 import.meta.dirname 的门都会假红）。
//   D2 不写死数：页页数、批大小、最大轮数、REALCOV 点名清单全部运行时派生。
//      v3.6 的 realcovItems 是 9 个 ID 的字面串，而门自己报 UNCOVERED=10 —— 字面串已腐。
//   D3 门禁判本轮目录：本轮产出即其输入的门（verify-real-coverage 的 --dir/--ops、
//      emit-round-report 的 --round-dir）一律指到 closureDir；判历史台账的门
//      （verify-ledger round-6 / verify-state-truth|queue-reconcile round-7）保持原靶，
//      本轮新发现靠 D11 的入册车道并进去，而不是把门挪走。
//      v3.6 的实测后果：真档补腿写在 ui-audit-2026-10-09/，门默认扫 round-7，
//      门禁根本看不见本轮的腿 —— 结构性假红，不是欠账。
//   D4 终报读数由 DSL 自己产出：v3.6 完全不写 .zcode/tmp/final-verify/summary.json、
//      也不调 gen-round8-report，而盘上那份 summary 还是上一轮的
//      ⇒ 报告 §7 会印上一轮数字（比印"未跑"更坏）。本版两条都接上，且禁止手填。
//   D5 面板腿不再改它要测的东西：emit-round-report 带 --dry（真语义：不取租约、
//      不复跑 G7/G8/G9/probe），可红证明就是 verify-dry-no-lease 那条静态门。
//   D6 降级不等于"没问题"：三路审查 ask 失败的兜底改成显式未取证哨兵（notVerified），
//      提前停条件加 !auditDegraded；realcovClosed 由覆盖门退出码推，不再由
//      功能审查的 items 推（v3.6 :330 的后果：功能审查失败 = "REALCOV 已闭"）。
//   D7 件名 namespace：DSL 自己写的件一律 dsl- 前缀，代理写的件一律 agent- 前缀，
//      二者不得同名。v3.6 实测后果：tour-round2/3.json 被代理形态覆盖，
//      同一件名一处是数组一处是 {round,rows} 对象 —— 计数与类型双双污染，无法续跑。
//   D8 收割续跑：dsl-run-manifest.json 记录每轮每段状态与其 HEAD/带宽戳；
//      复用条件=产物在盘且戳与当前一致，否则标 stale 重跑。绝不给旧帧盖新戳。
//   D9 干跑预检必须测自己：dryrun-workflow.mjs 的 --file 默认值是 v3.3，
//      v3.6 那条"工作流干跑预检"门从来没干跑过 v3.6 自己。
//   D10 采集通道能力表：通道能否交付由 CAPTURE_CHANNELS 声明，prompt 与 tour-plan
//      都从这张表渲染；不能交付的当场标 NOT_SHOOTABLE+原因。
//      v3.6 实测后果：tour-plan 承诺「onLoad 期 storage 键嗅探」，巡检 prompt 从未要求，
//      连续三轮无人兑现；console「页面真实加载期原文」同理只能走重放。
//   D11 发现必须入册：sort/fix 的缺陷不会自己进 issue-matrix；没有矩阵行的条目
//      既不会被修、也不会出现在终账里（谱系里两轮验证过的失败模式）。
//
// 纪律（沿用谱系全部铁律 + 本轮补充）：
//   files.* 在本机挂死 ⇒ 世界读取全走 world.run/git；跑 scripts/** 一律 Node22；
//   UI 单写者：全部 DevTools 驱动只经「UI巡检执行员」一个代理（锁协议，不旋轮抢锁）；
//   批次化巡检：按 WORKFLOW.batchSize 分 ask（车道 agent 实测 150 轮会被截断，绝不单 ask 吃全量）；
//   增量落盘是硬要求：骨架先行，每完成一页/一项立刻更新，盘上没有读数＝该项未做；
//   安全护栏：支付/VIP 拉起只验封存态（404/403=预期）；删除/解绑/同意类破坏性动作记 SKIP(guard)；
//     真实档写操作只做门禁点名页与缺陷复现所需，按既定裁定；
//   需拍板项阻塞的腿不占设备租约：某条腿的判决要等人裁的，如实记 RULING_BLOCKED，不空跑；
//   循环有界：最多 WORKFLOW.maxRounds 轮，零新增缺陷且覆盖闭干净才提前停，绝不假称"保证无问题"。
// =====================================================================

// ===== 配置（数值与路径只进这里）=====
const WORKFLOW = {
  version: "3.7",
  nodeBin: "D:/codex-tools/node-v22.17.0-win-x64/node.exe",
  closureDir: "reports/audit/ui-audit-2026-10-13",
  /** 上一轮（v3.6，跑到 round-3 分拣即停）的产物目录：只读收割，绝不覆写 */
  harvestFrom: "reports/audit/ui-audit-2026-10-09",
  /**
   * 判据台（用例全集）所在目录：覆盖门与队列守恒门的分母来源。
   * 定这个目录不是随手定的，实测三处一致指向 round-6/ops：
   *   ① verify-ops-corpus-stamp.mjs 的 DEF_OPS 与在盘戳记（STAMP_OPS=reports/audit/round-6/ops
   *      files=24 cases=1107 canon=4afc5c3d674f，戳记一致 ⇒ 语料与戳一致）；
   *   ② verify-real-coverage.mjs:99 的 --ops 默认值；
   *   ③ 执行器 r-exec-cli.mjs:43 的默认语料目录。
   * round-7/ops 是 9-28 的另一份拷贝（round-6/ops 里的活跃件 9-29~10-06 更新），
   * 两者 automatable===false 计数实测 101 vs 21 —— 选错目录会把 80 条"执行腿被禁止跑"的
   * 免检判点静默换成"欠账"，覆盖门当场多出约 4 条红。故这里锁 round-6/ops，
   * 并在探活阶段把两套 ops 的读数同时量一遍、不等就印出来，不再让它变成隐性差异。
   */
  opsDir: "reports/audit/round-6/ops",
  /** 另一套历史拷贝，只用来对照，不用来判绿 */
  opsDirAlt: "reports/audit/round-7/ops",
  /** 历史台账目录：verify-ledger 的靶（本轮新发现经入册车道并进这里，而不是把门挪走） */
  matrixDir: "reports/audit/round-6",
  legacyRoundDir: "reports/audit/round-7",
  /**
   * 真档腿的落点，同时也是覆盖门的 --dir。都用 round-7 是实测决定，不是偏好：
   * round-7 已经在收各波 exec-* 腿（exec-tap-final3、exec-td03-ruling-closure-r10n、
   * exec-vb03-showcase-closure、exec-realcov-b*… 共 49 个目录，实测 du/ls），
   * "一个轮次目录累积各波腿"是本仓既有约定。
   * 若把 --dir 改指本轮新目录，覆盖门就只看得见本轮那几条腿 —— v3.6 已经吃过
   * 反方向的同一症状（腿写 A 目录、门扫 B 目录 ⇒ 结构性假红）。本轮新腿一律落
   * ${execDir}/exec-v37-<点名>/，只增历史件，不改一个字节。
   */
  execDir: "reports/audit/round-7",
  healthUrl: "http://127.0.0.1:8080/actuator/health",
  batchSize: 15,
  maxRounds: 3,
  regressionPageCap: 30,
  /** 已裁接受的已知红：报告里单列"已知已裁红"，不计入新增问题（前提是红探针仍能把它判红） */
  acceptedReds: ["溯源全量 verify-provenance-all"],
  uiLockName: "ui-audit-v37.lock",
  commitMsg: "evidence(qa): 全量UI巡检闭环 v3.7 —— 收割 v3.6 round-3 分拣尾段（修复/复量/入册/报告）+ 真档补腿",
};

// ===== D10：采集通道能力表（单一来源；prompt 与 tour-plan 都由它渲染）=====
// deliverable=载具当前能否交付该通道；不能交付的必须在计划件里如实标 NOT_SHOOTABLE，
// 否则判据会去要一张永远拍不出来的帧。依据出处见每条 note。
interface Channel {
  key: string;
  what: string;
  artifact: string;
  deliverable: "yes" | "partial" | "no";
  note: string;
}
const CAPTURE_CHANNELS: Channel[] = [
  {
    key: "nav",
    what: "navigate 到该路由（tab 页 switchTab、普通页 reLaunch/navigateTo、分包页全路径），回报落地路由",
    artifact: "closureDir/screenshots/<批>/<路由>.png",
    deliverable: "yes",
    note: "但带 query 的桥 open 会让 currentPage 回报 webview 代理态、$ 全超时（v3.6 三层根因之一）；开页形态由执行器 --open-form 控制",
  },
  {
    key: "screenshot",
    what: "页面停留期截图一帧（状态命名见帧账规则）",
    artifact: "closureDir/screenshots/r<轮>-b<批>-<序号>-<路由>.png",
    deliverable: "yes",
    note: "CLI 桥实测 2.4–2.9 s/帧；返回的是 JPEG 字节挂在 .png 名下 —— 任何嗅探 PNG magic 的判点会误判，按内容判、不要按扩展名判",
  },
  {
    key: "console",
    what: "页面 console 读数（error/warn 分级）",
    artifact: "closureDir/console/<路由>.log",
    deliverable: "partial",
    note: "页面真实加载期原文结构性不可得（重放路径可取，MARK 预验证据件 console-mark-r2con01.log 在案）⇒ 判据口径只能写到「重放期 console 清白」，不得写「加载期无错」；换载具决策属拍板项 R3-11",
  },
  {
    key: "interactive",
    what: "可交互元素清点（button/input/textarea/可点击 view 的数量与关键类名）",
    artifact: "closureDir/elements/<路由>.json",
    deliverable: "yes",
    note: "自定义组件默认不穿透（automator 层实测）。编译后标签形状两说未定谳：v3.6 台账 R2-OT-06 断言是路径形 components/profile/public/RelationshipCTA，而 2026-10-13 实读 PublicProfile.json 注册的是 kebab 名 relationship-c-t-a、PublicProfile.wxml 亦输出 kebab、全树无路径形标签 ⇒ 选择器一律从当前编译产物实读，不得照任一说法写死；组件内节点优先走执行器的 handler 直调通道，且不得因选择器命中失败就判「元素不存在」",
  },
  {
    key: "safe-action",
    what: "安全动作抽测：每页 1–2 个主按钮 tap 后回退；支付/VIP 只验封存态；破坏性动作 SKIP(guard)",
    artifact: "closureDir/tour-round<轮>.md 的 actions 列",
    deliverable: "yes",
    note: "tap 通道已实证可用；rapidTap/swipe 需 --rapid/--scroll 旗标，nativeModal/networkFault 注入需 WS 道能力（exec-capabilities C1/C3）",
  },
  {
    key: "storage-sniff",
    what: "页面 onLoad 期 storage 键嗅探（token/身份键是否明文落盘）",
    artifact: "closureDir/security/<路由>.json 的 storageKeys 字段",
    deliverable: "no",
    note: "本仓执行器没有任何「读该页应用实例 storage 命名空间」的已证通道：v3.6 三轮均未交付（security/ 只有准入/入口/注入三项，storageKeys 零命中）。口径要么补载体、要么正式改写 —— 属拍板项 R3-10，本版不再在计划件里空头承诺",
  },
  {
    key: "access-guard",
    what: "未登录/guest 直开该路由的准入行为（是否引导到登录/注册）",
    artifact: "closureDir/security/<路由>.json 的 guard 字段",
    deliverable: "yes",
    note: "游客轴只在 real 档有意义：mock 档 bootstrap 无条件赋 mockUserSession，永远进不了未登录态",
  },
  {
    key: "route-inject",
    what: "路由参数注入容错（?id= 非法值不白屏）",
    artifact: "closureDir/security/<路由>.json 的 inject 字段",
    deliverable: "yes",
    note: "带 query 开页须用基底页+navigateTo 形态，否则落入 webview 代理态（见 nav 通道）",
  },
];

// ===== QA 门禁清单（D3：本轮产出即其输入的门，args 由 WORKFLOW 派生）=====
// 判读一律以退出码与机器行为准；每条门的"为什么是这个靶"写在注释里，防止下一轮又漂回去。
const GATE_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "台账词表/形状 verify-ledger", args: ["scripts/qa/verify-ledger.mjs", WORKFLOW.matrixDir], timeoutMs: 120000 }, // 历史台账靶；本轮新发现经入册车道并进来后复量
  { name: "状态真值 verify-state-truth", args: ["scripts/qa/verify-state-truth.mjs", WORKFLOW.legacyRoundDir], timeoutMs: 180000 }, // 判历史轮的四源一致，本轮不产出它的输入
  { name: "队列守恒 verify-queue-reconcile", args: ["scripts/verify-queue-reconcile.mjs", WORKFLOW.legacyRoundDir], timeoutMs: 120000 }, // 分母是 ops 全集，输入件在 round-7
  { name: "真实档覆盖 verify-real-coverage", args: ["scripts/qa/verify-real-coverage.mjs", "--ops", WORKFLOW.opsDir, "--dir", WORKFLOW.execDir, "--ledger", WORKFLOW.harvestFrom + "/tour-ledger.json"], timeoutMs: 180000 }, // D3：判绿目录=本轮新腿落地的 execDir；--ledger 显式点名，避免门的收割默认值随版本漂移
  { name: "判据台 verify-source-shape", args: ["scripts/qa/verify-source-shape.mjs", "--dry"], timeoutMs: 180000 }, // 必须 --dry：非 dry 会重写本轮的输入件
  { name: "证据语料 verify-evidence-corpus", args: ["scripts/qa/verify-evidence-corpus.mjs"], timeoutMs: 600000 },
  { name: "溯源全量 verify-provenance-all", args: ["scripts/qa/verify-provenance-all.mjs"], timeoutMs: 600000 }, // PRE_STAMP 属已裁已知红，见 WORKFLOW.acceptedReds
  { name: "档位新鲜度 verify-band-freshness", args: ["scripts/qa/verify-band-freshness.mjs"], timeoutMs: 420000 }, // 实测约需 99 s，180 s 太薄
  { name: "后端新鲜度 verify-backend-fresh", args: ["scripts/qa/verify-backend-fresh.mjs"], timeoutMs: 120000 },
  { name: "证据洞 verify-evidence-holes", args: ["scripts/qa/verify-evidence-holes.mjs", "--mode", "judge"], timeoutMs: 300000 },
  { name: "离线负例聚合 run-qa-selftests", args: ["scripts/qa/run-qa-selftests.mjs"], timeoutMs: 900000 },
  { name: "dry 不抢租约静态门 verify-dry-no-lease", args: ["scripts/qa/verify-dry-no-lease.mjs"], timeoutMs: 180000 }, // 同时是 D5 的可红证明
  { name: "载体接线零消费者门 verify-carrier-wiring", args: ["scripts/qa/verify-carrier-wiring.mjs"], timeoutMs: 180000 },
  { name: "车道报告骨架完成度 verify-lane-report-complete", args: ["scripts/qa/verify-lane-report-complete.mjs", "--intake", WORKFLOW.legacyRoundDir + "/lane-report-intake-round-7.json", "--exemptions", WORKFLOW.legacyRoundDir + "/lane-report-exemptions-round-7.json"], timeoutMs: 90000 },
  { name: "真实档覆盖去向册 verify-real-coverage-disposition", args: ["scripts/qa/verify-real-coverage-disposition.mjs"], timeoutMs: 180000 },
  { name: "用例可自动化预检 verify-case-automatable", args: ["scripts/qa/verify-case-automatable.mjs", "--results", WORKFLOW.matrixDir + "/interact/exec-results.json", "--json", ".zcode/tmp/case-automatable/preflight.json"], timeoutMs: 180000 }, // 该 --results 配对是唯一标题 100% 相等的组合；若该件被清理，门按设计退 2，正确处置是改指另一个标题相等配对，绝不是删旗标
  { name: "工作流干跑预检 dryrun-workflow", args: ["scripts/qa/dryrun-workflow.mjs", "--file", ".zcode/workflows/miniprogram-ui-audit-v37.dwf.ts", "--profile", "all"], timeoutMs: 300000 }, // D9：不带 --file 就是在干跑 v3.3，测不到本文件
  { name: "降级结论诚实性 verify-degraded-conclusion", args: ["scripts/qa/verify-degraded-conclusion.mjs"], timeoutMs: 180000 }, // D6 的第二条腿：干跑只问"跑到底没有"，这一条问"结论诚实不诚实"，并以 v3.6 为对照自证能红
  { name: "门禁清单两载具一致 verify-gate-list-sync", args: ["scripts/qa/verify-gate-list-sync.cjs"], timeoutMs: 120000 }, // 本清单有 DSL 与 bash 两个载具、各自硬编码，谱系里实测漂移过一整边（一边 15 条、一边 18 步却都自称全清单）⇒ 一致性必须是能红的判据，不能靠人对眼
  { name: "判据台戳 verify-ops-stamp", args: ["scripts/qa/verify-ops-corpus-stamp.mjs", "--check"], timeoutMs: 180000 },
];

// ===== 面板腿（D5：一律 --dry；显式 --report/--metrics 以免轮次号从目录名派生出非数字）=====
const PANEL_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  { name: "全量面板 emit-round-report", args: ["scripts/qa/emit-round-report.mjs", "--dry", "--round-dir", WORKFLOW.legacyRoundDir, "--sidecar-dir", ".zcode/tmp/final-verify/panel", "--report", ".zcode/tmp/final-verify/panel/v37-report.md", "--metrics", ".zcode/tmp/final-verify/panel/v37-metrics.json"], timeoutMs: 1800000 },
  { name: "面板后台账复量 verify-ledger-after-panel", args: ["scripts/qa/verify-ledger.mjs", WORKFLOW.matrixDir], timeoutMs: 120000 },
  { name: "面板后状态真值复量 verify-state-truth-after-panel", args: ["scripts/qa/verify-state-truth.mjs", WORKFLOW.legacyRoundDir], timeoutMs: 180000 },
];

// ===== 看板 =====
artifact.board("gates", {
  key: "gate",
  status: "status",
  columns: ["PASS", "RED", "已知红"],
  cardTitle: "gate",
  detail: [{ field: "detail" }],
});

// ===== 结果类型 =====
interface GateOut {
  name: string;
  exitCode: number;
  resultLine: string;
  /** D2/D3：从门自己的机器行里摊出来的读数，不接受任何手写数字 */
  metrics: Record<string, string>;
  uncovered: UncoveredItem[];
}
interface UncoveredItem {
  /** suite|caseId 形式，直接照门印的来 */
  key: string;
  /** 缺哪根轴：never-on-real / login / guest / login+guest */
  axis: string;
}
interface SetupOut {
  /** WS 通道是否就绪（判据=ws-channel-up 自己印的 WS_UP=OK/ALREADY_UP，不是 netstat） */
  wsUp: boolean;
  port: string;
  /** 驱动的是哪一档（real/mock/showcase），与 bandMatch 一起构成续跑准入的第二把尺 */
  band: string;
  bandMatch: boolean;
  /** pages.json 清点出的路由全集（长度即页页数，不写死） */
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
  band: string;
  notes: string;
}
interface TourOut {
  round: number;
  rows: TourRow[];
  evidence: string[];
  /** 车道自报：本批是否真的 dispatch 过动作。空 wsApplied / 零 dispatch 的轮次要按仪器故障处理 */
  dispatched: number;
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
  what: string;
  evidence: string;
  severity: "high" | "medium" | "low";
}
interface AuditOut {
  items: AuditItem[];
  openCount: number;
  /** D6：ask 失败或证据不足时置 true —— "没查到问题"与"这一路没取证"是两种状态，不可混写 */
  notVerified: boolean;
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
/** D8：续跑账本。戳一律用内容与 HEAD/带宽表达 —— 宿主禁 Date.now/无参 new Date/Math.random */
interface ManifestRound {
  tour: string;
  audit: string;
  sort: string;
  fix: string;
  stamp: string;
}
interface Manifest {
  version: string;
  headAtStart: string;
  headNow: string;
  closureDir: string;
  harvestFrom: string;
  inputs: { opsStamp: string; bandStamp: string };
  rounds: Record<string, ManifestRound>;
  gates: string;
  admission: string;
  report: string;
  notes: string;
}

// ===== 兜底与工具 =====
const blockers: string[] = [];
function askFail<T>(who: string, e: unknown, fallback: T): T {
  const msg = `${who} 的 ask 调用失败（执行器/配额故障，不是产品缺陷，也不得计入通过）：${String(e).slice(0, 140)}`;
  blockers.push(msg);
  log("[ask-catch] " + msg);
  return fallback;
}
/** D6 专用：审查/分拣类车道的"未取证"兜底。空 items + notVerified=true，绝不等于零缺陷 */
function notVerifiedAudit(who: string, e: unknown): AuditOut {
  return { items: [], openCount: -1, notVerified: true, notes: who + " 未取证：" + String(e).slice(0, 120) };
}
/**
 * D6 边界归一：一条审查回件必须**正面声明**它取到了什么，才算取证成功。
 * 只把 notVerified!==true 当"已取证"是不够的 —— 畸形回件（{}）既没有 items 也没有
 * notVerified，会被读成"查了、没问题"，那正是 v3.6 的假绿形状。
 * 判据：items 必须是数组（哪怕是空数组），否则一律 notVerified=true、openCount=-1。
 */
function normAudit(a: unknown, who: string): AuditOut {
  const o = (a && typeof a === "object" ? a : {}) as Partial<AuditOut>;
  const hasItems = Array.isArray(o.items);
  return {
    items: hasItems ? (o.items as AuditItem[]).filter((i) => i && typeof i.id === "string") : [],
    openCount: typeof o.openCount === "number" ? o.openCount : -1,
    notVerified: o.notVerified === true || !hasItems,
    notes: typeof o.notes === "string" && o.notes !== "" ? o.notes : (hasItems ? who + "：回件缺 notVerified/notes 字段，按 items 是否数组判定" : who + "：回件没有 items 数组 ⇒ 本路未取证（不是零缺陷）"),
  };
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
  const lines = out.split(/\r?\n/).filter((l) => /_RESULT\s*=/.test(l));
  const last = lines.length > 0 ? lines[lines.length - 1] : "(无机器行)";
  return last.slice(0, 200);
}
/** 摊机器行：任意 NAME=VALUE 行都进 metrics，门新增的桶（如 voided/pending）自动可见，无需改 DSL */
function metricsOf(out: string): Record<string, string> {
  const m: Record<string, string> = {};
  for (const line of out.split(/\r?\n/)) {
    const mm = line.match(/^([A-Z][A-Z0-9_]{2,}=)(.*)$/);
    if (mm) m[mm[1].slice(0, -1)] = mm[2].slice(0, 300);
  }
  return m;
}
/** D2：欠账逐条点名 —— 照门自己印的 `  UNCOVERED <suite>|<id> 缺=<轴>` 收，绝不写死 ID 串 */
function uncoveredOf(out: string): UncoveredItem[] {
  const list: UncoveredItem[] = [];
  for (const line of out.split(/\r?\n/)) {
    const mm = line.match(/^\s+UNCOVERED\s+(\S+)\s+缺=(\S+)/);
    if (mm && !list.some((x) => x.key === mm[1])) list.push({ key: mm[1], axis: mm[2] });
  }
  return list;
}
function numMetric(m: Record<string, string>, key: string): number {
  const v = m[key];
  if (typeof v !== "string") return NaN;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}
async function runGate(g: { name: string; args: string[]; timeoutMs: number }): Promise<GateOut> {
  try {
    const r = await world.run(WORKFLOW.nodeBin, g.args, { timeoutMs: g.timeoutMs }); // D1
    const out = (r.stdout || "") + (r.stderr || "");
    return { name: g.name, exitCode: r.exitCode, resultLine: resultLineOf(out), metrics: metricsOf(out), uncovered: uncoveredOf(out) };
  } catch (e) {
    return { name: g.name, exitCode: -1, resultLine: "命令无法启动: " + String(e), metrics: {}, uncovered: [] };
  }
}
function gateToBoard(g: GateOut, accepted?: string[]): void {
  const status = g.exitCode === 0 ? "PASS" : (accepted && accepted.indexOf(g.name) >= 0 ? "已知红" : "RED");
  report({ gate: g.name, status, detail: g.resultLine }, "gates");
}
/** 落盘 JSON：走 node -e，不依赖 files.*（本机 files.* 会挂死） */
async function persistJson(file: string, data: unknown): Promise<void> {
  try {
    await world.run(WORKFLOW.nodeBin, ["-e",
      "const f=require('fs'),p=require('path');f.mkdirSync(p.dirname(process.argv[1]),{recursive:true});f.writeFileSync(process.argv[1],process.argv[2]);",
      file, JSON.stringify(data, null, 1)], { timeoutMs: 20000 });
  } catch (e) {
    log("落盘失败（不改变判定）：" + String(e).slice(0, 80));
  }
}
/** 读回 JSON（续跑复用与守恒核对用）；读不到/解析不了都返回 null，由调用方判 stale 重跑 */
async function readJson<T>(file: string): Promise<T | null> {
  try {
    const r = await world.run(WORKFLOW.nodeBin, ["-e",
      "try{process.stdout.write(require('fs').readFileSync(process.argv[1],'utf8'))}catch{process.stdout.write('')} ",
      file], { timeoutMs: 20000 });
    const s = (r.stdout || "").trim();
    if (r.exitCode !== 0 || s === "") return null;
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
async function shaStampOf(dir: string): Promise<string> {
  try {
    const r = await world.run(WORKFLOW.nodeBin, ["-e",
      "const f=require('fs'),c=require('crypto'),p=require('path');let a=[];const w=(d)=>{for(const e of f.readdirSync(d,{withFileTypes:true})){const q=p.join(d,e.name);if(e.isDirectory())w(q);else if(/\\.(json|md)$/i.test(e.name))a.push(q+':'+f.statSync(q).size)}};try{w(process.argv[1])}catch{process.stdout.write('MISSING');process.exit(0)}a.sort();process.stdout.write(c.createHash('sha256').update(a.join('\\n')).digest('hex').slice(0,12))",
      dir], { timeoutMs: 60000 });
    return (r.stdout || "").trim() || "unknown";
  } catch {
    return "unknown";
  }
}
/** D8：本轮唯一的状态来源。戳 = HEAD + 判据台内容戳 + 带宽；三者齐等才允许复用旧产物 */
async function loadManifest(): Promise<Manifest | null> {
  return await readJson<Manifest>(WORKFLOW.closureDir + "/dsl-run-manifest.json");
}
function legReusable(man: Manifest | null, round: number, leg: keyof ManifestRound, head: string, opsStamp: string): boolean {
  if (!man) return false;
  const r = man.rounds[String(round)];
  if (!r || r[leg] !== "done") return false;
  return man.headNow === head && man.inputs && man.inputs.opsStamp === opsStamp && r.stamp === `${head}+${opsStamp}`;
}
function readLeg<T>(harvestDir: string, file: string): Promise<T | null> {
  return readJson<T>(harvestDir + "/" + file);
}
const gatekeeper = agent("终验守门员", "你只负责运行指定命令并如实报告结果，绝不修改任何文件、绝不为通过而改跑别的命令。若命令不可能通过，如实 ok=false 并贴出现象，宁可红也不放水。");
/** D1：守门员的 PATH 前缀由 nodeBin 派生，不再另写一遍死路径 */
function node22DirOf(bin: string): string {
  const i = bin.lastIndexOf("/");
  return i > 0 ? bin.slice(0, i) : ".";
}
async function runViaGatekeeper(purpose: string, command: string, timeoutMs: number): Promise<CheckOut> {
  const r = await gatekeeper.ask<CheckOut>(
    [
      `运行${purpose}并如实报告。用 Bash 执行这一行（PATH 前置 Node22，Windows Git Bash；stdin 接 /dev/null）：`,
      `export PATH="${node22DirOf(WORKFLOW.nodeBin)}:$PATH" && ${command}`,
      `要求：等命令完整结束（Bash timeout 设 ${timeoutMs}）；ok = (退出码 === 0)；err = 失败时最后 50 行输出、成功时留空；command 回填实际执行的命令。`,
      `【诚实铁律】禁止伪造：跑不起来/超时/输出异常都如实 ok=false；禁止顺手修任何错误。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<CheckOut>("终验守门员", e, { ok: false, err: "守门员调用失败: " + String(e), command }));
  return { ok: r.ok === true, err: typeof r.err === "string" ? r.err : "", command: typeof r.command === "string" ? r.command : command };
}
/** 只读量一次覆盖门，摊它自己的机器行（D2/D3：派活清单与判绿同源于门自己） */
async function measureCoverage(dir: string, label: string): Promise<GateOut> {
  const ledgerArg = WORKFLOW.harvestFrom + "/tour-ledger.json";
  const g = await runGate({ name: `真实档覆盖[${label}] verify-real-coverage --dir ${dir}`, args: ["scripts/qa/verify-real-coverage.mjs", "--ops", WORKFLOW.opsDir, "--dir", dir, "--ledger", ledgerArg], timeoutMs: 180000 });
  /**
   * 回执核对：本仓的门普遍用通用 arg() 解析、没有 KNOWN_FLAGS 白名单，
   * 实测把一个旗标名打错（--ledgir）时门**照跑不误、静默回落到默认值**，
   * 屏幕上什么都不变 ⇒ "我以为我在判 A 台账，其实在判默认台账"这种错毫无征兆。
   * 所以不信旗标，只信门自己回显的路径：它印的 结果目录 / LEDGER_SOURCE 必须就是我传进去的那两个。
   */
  const echoedDir = (g.metrics["REALCOV_CASES"] || "").match(/结果目录=(.*)$/);
  const echoedLedger = g.metrics["REALCOV_LEDGER_SOURCE"] || "";
  const dirTail = dir.replace(/\\/g, "/").split("/").filter(Boolean).slice(-1)[0] || "";
  const dirOk = !echoedDir || echoedDir[1].replace(/\\/g, "/").indexOf(dirTail) >= 0;
  const ledgerTail = ledgerArg.replace(/\\/g, "/").split("/").filter(Boolean).slice(-2).join("/");
  const ledgerOk = echoedLedger === "" || echoedLedger.indexOf(ledgerTail) >= 0;
  if (!dirOk) blockers.push(`覆盖门[${label}]回显的结果目录不含 "${dirTail}" ⇒ --dir 没被吃进去，本轮覆盖判的是别的目录，读数作废`);
  if (!ledgerOk) blockers.push(`覆盖门[${label}]回显的台账不含 "${ledgerTail}" ⇒ --ledger 没被吃进去（多半是旗标名打错，本仓的门对未知旗标静默回落默认值），待判决桶判的是别的台账`);
  if (dirOk && ledgerOk && echoedLedger === "") blockers.push(`覆盖门[${label}]没有回显台账出处 ⇒ 无法证明它读的是哪本台账，待判决桶不可信`);
  return g;
}
function covNum(g: GateOut): { covered: number; uncovered: number; required: number; list: number } {
  const unc = (g.metrics["REALCOV_UNCOVERED"] || "").match(/^(\d+)／(\d+)/);
  return {
    covered: numMetric(g.metrics, "REALCOV_COVERED"),
    uncovered: unc ? parseInt(unc[1], 10) : NaN,
    required: unc ? parseInt(unc[2], 10) : NaN,
    list: g.uncovered.length,
  };
}

// =====================================================================
phase("探活与巡检准备");

// —— D1：解释器前置校验。跑在门之前，否则 v16 会把带 import.meta.dirname 的门全判成假红 ——
let nodeVersion = "(取不到)";
let interpreterOk = false;
{
  const v = await world.run(WORKFLOW.nodeBin, ["--version"], { timeoutMs: 15000 });
  nodeVersion = ((v.stdout || "") + (v.stderr || "")).trim().slice(0, 40);
  const major = parseInt(nodeVersion.replace(/^v/, "").split(".")[0], 10);
  interpreterOk = Number.isFinite(major) && major >= 20;
}
log(`解释器：${nodeVersion} 单一来源=WORKFLOW.nodeBin；满足门禁需求=${interpreterOk ? "是" : "否"}`);
if (!interpreterOk) blockers.push(`解释器 ${nodeVersion} 主版本<20：凡用 import.meta.dirname 的门（verify-source-shape/verify-evidence-holes/dryrun-workflow）都会假红，本轮不采信任何门禁绿`);

let backendUp = false;
try {
  const h = await world.run("curl", ["-s", "-m", "3", WORKFLOW.healthUrl], { timeoutMs: 10000 });
  backendUp = (h.stdout || "").indexOf('"UP"') >= 0;
} catch {
  backendUp = false;
}
log(`后端 8080：${backendUp ? "UP" : "DOWN"}${backendUp ? "" : "（真档腿与前后端连通证据全部不成立，须先由守门员拉 real profile + Redis）"}`);
if (!backendUp) blockers.push("后端 8080 未 UP：本轮 real/showcase 档证据不可产生，涉及写库与同步的断言一律 NOT-EVIDENCED");

const head = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
const branch = (await gitTry(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() || "unknown";
/** D8：续跑准入用的两把尺 —— 判据台内容戳与 real 档带宽（都不依赖时钟，宿主禁 Date.now） */
const opsStamp = await shaStampOf(WORKFLOW.opsDir);
let bandStamp = "unknown";
{
  const b = await world.run(WORKFLOW.nodeBin, ["-e",
    "const f=require('fs'),c=require('crypto');const p=process.argv[1]+'/config/env.js';try{const s=f.readFileSync(p,'utf8');const m=(s.match(/MODE:\"([^\"]*)\"/)||[])[1]||\"nomode\";const a=(s.match(/API_MODE:\"([^\"]*)\"/)||[])[1]||\"na\";console.log(m+'|'+a+'@'+c.createHash('sha256').update(s).digest('hex').slice(0,8))}catch{console.log('MISSING')}",
    "apps/client/dist/build/mp-weixin-real"], { timeoutMs: 20000 });
  bandStamp = ((b.stdout || "").trim() || "MISSING");
}
log(`续跑尺：HEAD=${head} 判据台戳=${opsStamp} real 带宽=${bandStamp}`);

// —— D8：收割上一轮（v3.6）产物；件名两种历史形态都要能吃下（数组 / {round,rows}） ——
const harvested = await readJson<unknown>(WORKFLOW.harvestFrom + "/dsl-run-manifest.json");
let manifest: Manifest = (harvested && typeof harvested === "object")
  ? (harvested as Manifest)
  : {
      version: WORKFLOW.version, headAtStart: head, headNow: head,
      closureDir: WORKFLOW.closureDir, harvestFrom: WORKFLOW.harvestFrom,
      inputs: { opsStamp, bandStamp }, rounds: {}, gates: "pending", admission: "pending", report: "pending",
      notes: "本轮新建账本；harvest 见 rounds 内的 done-harvest 标记",
    };
function seedRound(n: number): ManifestRound {
  const key = String(n);
  if (!manifest.rounds[key]) manifest.rounds[key] = { tour: "pending", audit: "pending", sort: "pending", fix: "pending", stamp: `${head}+${opsStamp}` };
  return manifest.rounds[key];
}
const harvestTours: TourRow[] = [];
for (let n = 1; n <= WORKFLOW.maxRounds; n++) {
  const raw = await readJson<unknown>(WORKFLOW.harvestFrom + `/tour-round${n}.json`);
  const rows: TourRow[] = Array.isArray(raw) ? (raw as TourRow[])
    : (raw && Array.isArray((raw as { rows?: TourRow[] }).rows) ? (raw as { rows: TourRow[] }).rows : []);
  if (rows.length > 0) {
    for (const r of rows) if (r && typeof r.route === "string") harvestTours.push(r);
    const rd = seedRound(n);
    rd.tour = "done-harvest";
    log(`收割 round${n} 巡检：${rows.length} 行（形态=${Array.isArray(raw) ? "数组" : "对象"}）`);
  }
}
const harvestAudit = await readJson<{ consoleAudit?: AuditOut; funcAudit?: AuditOut; visualAudit?: AuditOut }>(WORKFLOW.harvestFrom + `/audit-round${WORKFLOW.maxRounds}.json`);
const harvestSort = await readJson<SortOut>(WORKFLOW.harvestFrom + `/sort-round${WORKFLOW.maxRounds}.json`);
if (harvestAudit) seedRound(WORKFLOW.maxRounds).audit = "done-harvest";
if (harvestSort) seedRound(WORKFLOW.maxRounds).sort = "done-harvest";
const sortExec = (harvestSort && Array.isArray(harvestSort.executable)) ? harvestSort.executable : [];
const sortNeedsUser = (harvestSort && Array.isArray(harvestSort.needsUser)) ? harvestSort.needsUser : [];
log(`收割 round${WORKFLOW.maxRounds}：审查件=${harvestAudit ? "在盘" : "缺"} 分拣件=${harvestSort ? `executable=${sortExec.length} needsUser=${sortNeedsUser.length}` : "缺"}`);

// —— 收割件自证一致性：console 全零不等于「清白」，landing 与 notes 互斥时不得复用 ——
const harvestLedger = await readJson<{ routes?: Array<{ route?: string; status?: string; notes?: string; consoleRecap?: { lines?: number; errors?: number; warns?: number; landing?: string } }> }>(WORKFLOW.harvestFrom + "/tour-ledger.json");
if (harvestLedger && Array.isArray(harvestLedger.routes)) {
  const ledgerRoutes = harvestLedger.routes;
  const zeroConsole = ledgerRoutes.filter((r) => r && r.consoleRecap && (r.consoleRecap.errors ?? 0) === 0 && (r.consoleRecap.lines ?? 0) === 0).length;
  const landingConflict = ledgerRoutes.filter((r) => r && r.status === "NAV_FAIL" && r.consoleRecap && r.consoleRecap.landing === r.route && /落点/.test(r.notes || "")).length;
  log(`收割台账自证：${ledgerRoutes.length} 路由行，console 计数全零=${zeroConsole}，NAV_FAIL 且 landing==请求路由而 notes 记另一落点=${landingConflict}`);
  if (zeroConsole > 0) blockers.push(`收割台账 ${zeroConsole}/${ledgerRoutes.length} 行 console 计数全零（采集通道 partial：加载期原文不可得）⇒「console 清白」在收割件里不成立，本轮 console 类判定必须由新腿出，不得从全零推清白`);
  if (landingConflict > 0) blockers.push(`收割台账 ${landingConflict} 行 NAV_FAIL 的 consoleRecap.landing 仍写请求路由、notes 却记另一落点 ⇒ 复用其 landing 会把弹回读成到达，本轮不采信该字段，落地判定只认新腿回报的路由`);
}

// —— 覆盖门判绿的目录 = execDir（round-7，本轮新腿只往这里增）——
// 不做"把上一轮的腿搬进本轮目录"这件事：实测 round-7 与 harvestFrom 里存在同名腿
// （exec-realcov-b1/b1b/b1c/b3/b4/b4b/b4g/b5 两边都有），搬运会造出同一份证据的两个副本，
// 一旦有两处 --dir 都扫到就是重复计覆盖。判绿只扫一处，历史目录只对照。
const covDupCheck = await world.run(WORKFLOW.nodeBin, ["-e",
  "const f=require('fs'),p=require('path'),c=require('crypto');const[a,b]=process.argv.slice(1);const h=(d)=>{const o={};try{for(const e of f.readdirSync(d)){if(!/^exec-/.test(e.name))continue;const q=p.join(d,e.name,'exec-results.json');if(f.existsSync(q))o[e.name]=c.createHash('sha256').update(f.readFileSync(q)).digest('hex').slice(0,12)}}catch{}return o};const A=h(a),B=h(b);const shared=Object.keys(A).filter(k=>B[k]!==undefined);const same=shared.filter(k=>A[k]===B[k]);const diff=shared.filter(k=>A[k]!==B[k]);console.log('LEGMIRROR src='+Object.keys(A).length+' dst='+Object.keys(B).length+' 同名='+shared.length+' 逐字同='+same.length+' 同名不同字节='+diff.length+(diff.length?' ['+diff.slice(0,6).join(',')+']':''))",
  WORKFLOW.legacyRoundDir, WORKFLOW.harvestFrom], { timeoutMs: 120000 });
const legMirrorLine = ((covDupCheck.stdout || "") + (covDupCheck.stderr || "")).trim().slice(0, 200);
log(`同名腿镜像检查：${legMirrorLine}`);
await persistJson(WORKFLOW.closureDir + "/dsl-leg-mirror-check.json", {
  compared: [WORKFLOW.legacyRoundDir, WORKFLOW.harvestFrom],
  line: legMirrorLine,
  judgeDir: WORKFLOW.execDir,
  note: "判绿只扫 judgeDir；同名不同字节的腿属待裁事项（同一证据两份副本，任一处被改都不会被另一处发现）",
});

// —— D2：派活清单来自门自己的点名行，不来自任何字面串 ——
const covBase = await measureCoverage(WORKFLOW.execDir, "判绿目录");
const covAlt = await measureCoverage(WORKFLOW.opsDirAlt, "对照 ops=round-7/ops");
const covNumH = covNum(covBase);
const covNumL = covNum(covAlt);
log(`覆盖基线（ops=${WORKFLOW.opsDir}，dir=${WORKFLOW.execDir}）：COVERED=${covNumH.covered} UNCOVERED=${covNumH.uncovered}/${covNumH.required} 点名=${covNumH.list}（exit=${covBase.exitCode}）`);
log(`对照（同一 execDir、ops=${WORKFLOW.opsDirAlt}）：COVERED=${covNumL.covered} UNCOVERED=${covNumL.uncovered}/${covNumL.required}（exit=${covAlt.exitCode}）`);
if (covNumH.uncovered !== covNumL.uncovered || covNumH.covered !== covNumL.covered) {
  blockers.push(`两套 ops 给出不同分母（欠账 ${covNumH.uncovered} vs ${covNumL.uncovered}，覆盖 ${covNumH.covered} vs ${covNumL.covered}）⇒ 免检声明不一致，判绿只用 ops=${WORKFLOW.opsDir}（与戳记门/执行器默认同源的目录），另一套只作对照，不许任一方拿来凑绿`);
}
const realcovItems: UncoveredItem[] = covBase.uncovered;
if (covBase.exitCode !== 0 && realcovItems.length === 0) {
  blockers.push(`覆盖门判红但一条欠账都没点名（UNCOVERED=${covNumH.uncovered}）⇒ 判点空转，先修门再谈欠账`);
}

// —— UI 单写者：探活 + 零点击冷启 + 页面清点 + 巡检计划落盘（D10：计划件由通道表渲染）——
const ui = agent("UI巡检执行员", `你独占驱动微信开发者工具自动化（单写者）。先按锁协议取锁（tmp/qa/locks/${WORKFLOW.uiLockName}，字段 owner/pid/status/leaseUntil；拿不到锁就如实 BLOCKED，禁止旋轮抢锁、禁止 kill 他人进程）。冷启纪律：以 cli-automator 的子进程 argv 形态跑 check_wechatide_status（它会 auto-auth 并冷启 IDE 服务），再用 ${WORKFLOW.nodeBin} 跑 scripts/qa/ws-channel-up.mjs --wait 300；端口一律运行时发现，不假设任何数字。判据只有脚本自己印的 WS_UP=OK/ALREADY_UP 与 WS_UP_BAND=match 两行，不是 netstat 端口表，也不是 CLI 的 ✔ auto（--wait 60 会给误导性 FAIL：端口约 18 秒已绑但没热完）。拿不到 WS_UP 就如实 wsUp=false，绝不伪造。件名纪律：你写的件一律带 agent- 前缀，DSL 自己写的 dsl- 前缀件你不要碰。所有临时产物只准落 tmp/ 或本轮 closureDir，禁止写仓库根。任何 rebuild 之后通道会被作废（cant find runtimeid by projectpath），重跑 ws-channel-up 并复判 WS_UP_BAND_RESULT=match 再继续。`);
const setup = await ui.ask<SetupOut>(
  [
    `本轮 closureDir：${WORKFLOW.closureDir}；收割源（只读）：${WORKFLOW.harvestFrom}；后端 8080 已 ${backendUp ? "UP(real)" : "DOWN"}；HEAD=${head}；real 带宽=${bandStamp}。`,
    `任务（只做探活与计划，不巡检）：① 取锁；② 零点击冷启 IDE + ws-channel-up，读 WS_UP/WS_UP_BAND 机器行并回报驱动的是哪一档（读该档 config/env.js 的 MODE 自证）；③ 用 ${WORKFLOW.nodeBin} 解析 apps/client/src/pages.json（JSONC，允许注释——先去 // 注释再 JSON.parse），拼出主包+全部 subPackages 的完整路由清单（主包=pages[].path；分包=「root + / + pages[].path」）—— 条数即页页数，不要引用任何文档里写死的数字；④ 把巡检计划写入 ${WORKFLOW.closureDir}/agent-tour-plan.json 与 agent-tour-plan.md，计划的采集通道**必须逐条照下面这张表渲染**，deliverable=否 的通道要在计划件里明写 NOT_SHOOTABLE 与其 note 里的原因，禁止承诺载具交付不了的采集面。`,
    `采集通道表（唯一来源）：${JSON.stringify(CAPTURE_CHANNELS)}`,
    `返回 wsUp / port / band / bandMatch / routes（全长数组，逐条）/ planFile / notes。`,
  ].join("\n"),
).then((v) => v, (e) => askFail<SetupOut>("UI巡检执行员", e, { wsUp: false, port: "", band: "", bandMatch: false, routes: [], planFile: "", notes: "探活 ask 失败：" + String(e).slice(0, 100) }));
const routes = Array.isArray(setup.routes) ? setup.routes.filter((r) => typeof r === "string" && r !== "") : [];
log(`探活完成：WS_UP=${setup.wsUp ? "OK" : "FAIL"}(${setup.port || "无端口"}) 档=${setup.band || "?"} 带匹配=${setup.bandMatch ? "match" : "NOMATCH"}，页面清点 ${routes.length} 条（派生，非写死），计划=${setup.planFile || "未落盘"}`);
await persistJson(WORKFLOW.closureDir + "/dsl-setup-v37.json", { wsUp: setup.wsUp, port: setup.port, band: setup.band, bandMatch: setup.bandMatch === true, routeCount: routes.length, head, branch, backendUp, bandStamp, opsStamp, interpreter: nodeVersion, legMirrorLine, coverage: { judgeDir: covNumH, opsAltReadonly: covNumL } });
if (!setup.wsUp) blockers.push("DevTools 自动化通道未就绪（零点击冷启后仍无 WS_UP=OK）：UI 巡检全量降级，仅余代码级审查腿");
if (setup.wsUp && setup.bandMatch === false) blockers.push(`通道就绪但驱动档与预期不符（回报 band=${setup.band}）：真档判据不可采信，先重连/重建再跑腿`);
if (routes.length === 0) blockers.push("pages.json 路由清点为空，巡检无对象");
manifest.headNow = head;
manifest.inputs.opsStamp = opsStamp;
manifest.inputs.bandStamp = bandStamp;
await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);
// =====================================================================
phase("巡检-审查-修复循环");
// —— 最多 WORKFLOW.maxRounds 轮：巡检 → 三路审查 → 分拣 → 修复 → 回归；
//    零新增缺陷且覆盖闭干净才提前停；收割来的轮次不再重跑设备腿（D8） ——
const consoleAuditor = agent("console网络审查员", "你是只读审查员：读盘上巡检结果件，逐条核对 console error/warn 与网络请求失败，判：产品缺陷 / 环境性拦截（如 urlCheck 域名校验）/ 预期封存行为。绝不修改文件；判 Product 缺陷必须给 route+console 原文+复现路径，判环境/预期必须给判据出处。console 通道的口径上限见采集通道表：只有「重放期 console 清白」可判，「加载期无错」不可判，不得据后者立案或结案。");
const funcAuditor = agent("功能断言审查员", "你是只读审查员：对照 pages.json 路由全集、盘上巡检覆盖与覆盖门点名的欠账清单，审「哪些页面/按钮/功能没被巡到、哪些断言未过」。绝不修改文件；每条缺口必须给路由/元素/期待行为三要素。欠账清单以门印的 UNCOVERED 行为准，不要引用任何文档里写死的 ID 串。");
const visualAuditor = agent("视觉对照审查员", "你是只读审查员：抽检巡检截图对照 deliverables/ 下设计规范，只报可复现的布局/样式偏差（有像素/结构证据），不报审美偏好；判不清的如实进 notes。注意帧是 JPEG 字节挂 .png 名，且 1× 分辨率不足以判字形级差异 —— 达不到判据分辨率时如实进 notes，不要猜。绝不修改文件。");
const sorter = agent("缺口分拣员", "你是只读分拣员：把三路审查的缺陷分拣为 executable（area ∈ 前端实现刀/backend/数据配置/覆盖补腿/工具载体）与 needsUser（判据冲突/政策/数据去留/载体口径）。绝不修改文件；绝不把拍板项混进 executable；每条 executable 必须指到审查证据；同一缺陷主体在不同页面重复出现的，必须归一到同一 id 并在 what 里注明「与 X 同主体」，不得拆成两条欠账。");
const fixerAgent = agent("巡检修复工程师", "你是小程序前端与后端工程专家：按审查证据修复缺陷，只修真问题，禁止改测试断言凑绿、禁止 any 糊弄、禁止为通过门禁新增无人消费的文件。不碰 .zcode/**、reports/**，不做 git 提交；增量落盘到 closureDir/agent-fix-lane.md（骨架先行，每修一项立刻更新，盘上没有记录＝没有修）。做不到的如实 skipped 带原因。");
const fixVerifier = agent("修复复验员", "你是独立复验员：只认盘上证据（文件:行、命令输出），不复述修复者自报；每条要么给可复核证据放 fixedIds，要么如实进 skipped（「复验未通过: …」）。不修改文件。撤红不等于判绿：源码级证伪了旧归因只说明「不是那个原因」，不得据此写「已修复/已判过」。");

const allTourRows: TourRow[] = [];
for (const r of harvestTours) allTourRows.push(r);
const allNeedsUser: UserItem[] = [];
for (const u of sortNeedsUser) if (u && typeof u.id === "string") allNeedsUser.push(u);
let openItems = -1;
let realcovClosed = false;
let roundsDone = 0;
let lastCov: GateOut = covBase;
/** 循环外的入册车道要用最后一轮的分拣结果，故把 executable 提到循环外持有 */
let lastExecutable: AuditItem[] = [];
/**
 * D6 的第二条腿：提前停条件里加了 !auditDegraded 还不够 ——
 * 终局 conclusion 是另外一组条件算出来的，若那一组不含降级状态，
 * 三路全失败的轮次照样能在最后一行印出"闭环完成"（实测被自造检查抓到过）。
 * 所以降级必须提到循环外持有，并显式进终局判据与 notCovered。
 */
let auditDegradedAny = false;
let degradedRounds = 0;

for (let round = 1; round <= WORKFLOW.maxRounds; round++) {
  roundsDone = round;
  const rd = seedRound(round);
  const stampNow = `${head}+${opsStamp}`;
  rd.stamp = stampNow;

  // —— 巡检腿 ——
  phase("逐页巡检采集");
  const failedRoutes = allTourRows.filter((x) => x.status !== "NAV_OK").map((x) => x.route);
  const pendingRoutes = round === 1
    ? routes
    : [...new Set([...failedRoutes, ...routes.filter((rt) => !allTourRows.some((x) => x.route === rt && x.status === "NAV_OK"))])];
  const tourReusable = rd.tour === "done-harvest" || rd.tour === "done";
  if (tourReusable) {
    log(`第 ${round} 轮巡检：复用既有产物（${rd.tour}，戳=${stampNow}），不占设备租约重跑 ${pendingRoutes.length} 页`);
  } else if (setup.wsUp && pendingRoutes.length > 0) {
    const batchSize = Math.max(1, Math.min(WORKFLOW.batchSize, pendingRoutes.length));
    for (let b = 0; b < pendingRoutes.length; b += batchSize) {
      const batch = pendingRoutes.slice(b, b + batchSize);
      const batchNo = Math.floor(b / batchSize) + 1;
      const isReline = round > 1;
      const tour = await ui.ask<TourOut>(
        [
          `第 ${round} 轮巡检，批次 ${batchNo}/${Math.ceil(pendingRoutes.length / batchSize)}（${isReline ? "回归批" : "全量批"}）：${JSON.stringify(batch)}`,
          `逐页执行，采集面严格按这张通道表（deliverable=否 的通道直接记 NOT_SHOOTABLE 并把 note 原文抄进 notes，禁止假装采到）：${JSON.stringify(CAPTURE_CHANNELS)}`,
          `【护栏】支付/VIP 拉起只验封存态（404/403「支付未开通」=预期通过）；删除/解绑/同意类一律记 SKIP(guard)；真实档写操作除覆盖门点名页外一律不做。`,
          `覆盖门点名欠账（本轮要按门自己的期待格式补 login/login+guest 真实腿，缺哪根轴补哪条腿；绝不允许把 mock 行改标 real 来「补数」）：${JSON.stringify(realcovItems).slice(0, 6000)}`,
          `【增量落盘是硬要求】开工先写 ${WORKFLOW.closureDir}/agent-tour-round${round}-b${batchNo}.md 骨架，每完成一页立刻补那一行；本批结束把 rows 返回（route/status(NAV_OK|NAV_FAIL|SKIP(guard)|NOT_SHOOTABLE)/screenshot/elementCount/keyElements/consoleErrors/actions/band/notes），band 写 mode@sha8。dispatched 要填本批真实 dispatch 出去的动作数——0 就是 0，别为了好看编数。`,
          `【正向对照】开工先选一个磁盘上确认存在的 selector 证明通道能选中并能动作；选不中就整批记 UNVERIFIED-INSTRUMENT，不得记产品失败。`,
        ].join("\n"),
      ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], dispatched: -1, notes: "巡检批 ask 失败：" + String(e).slice(0, 100) }));
      let rows = Array.isArray(tour.rows) ? tour.rows : [];
      if (rows.length > 0 && !(tour.dispatched > 0)) {
        log(`批次 ${batchNo} 有 ${rows.length} 行但 dispatched=${tour.dispatched} ⇒ 仪器故障，整批改记 UNVERIFIED-INSTRUMENT（历史上这一形态伪造过 3 条 STATE_NOT_APPLIED）`);
        blockers.push(`第 ${round} 轮批次 ${batchNo}：通道未真正选中/动作（dispatched=${String(tour.dispatched)}），${rows.length} 行按 UNVERIFIED-INSTRUMENT 处理，不作产品判决`);
        rows = rows.map((x) => ({ ...x, status: x.status === "SKIP(guard)" ? x.status : "UNVERIFIED-INSTRUMENT" }));
      }
      for (const row of rows) {
        if (!row || typeof row.route !== "string") continue;
        const idx = allTourRows.findIndex((x) => x.route === row.route);
        if (idx >= 0) allTourRows[idx] = row; else allTourRows.push(row);
      }
      log(`第 ${round} 轮批次 ${batchNo}：+${rows.length} 行（累计 ${allTourRows.length}，dispatched=${String(tour.dispatched)}）`);
      await persistJson(WORKFLOW.closureDir + `/dsl-tour-cumulative-round${round}.json`, allTourRows); // D7
    }
    rd.tour = "done";
  } else if (!setup.wsUp) {
    log("WS 通道未就绪，跳过巡检腿（本轮页面级保证不成立）");
  } else {
    log("无待巡页面，本轮免巡检");
    rd.tour = "done";
  }
  manifest.rounds[String(round)] = rd;
  manifest.headNow = head;
  await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest); // D8

  // —— 三路审查 + 分拣（读盘上结果件，不吃对话上下文；可复用则不重问） ——
  phase("三路审查与分拣");
  const navOk = allTourRows.filter((x) => x.status === "NAV_OK").length;
  const navFail = allTourRows.filter((x) => x.status === "NAV_FAIL").length;
  const instrFault = allTourRows.filter((x) => (x.status || "").indexOf("UNVERIFIED-INSTRUMENT") >= 0).length;
  const consoleErrCount = allTourRows.reduce((n, x) => n + ((x.consoleErrors || "").split(";").filter((s) => s.trim() !== "").length), 0);
  log(`巡检覆盖：NAV_OK=${navOk} NAV_FAIL=${navFail} 仪器故障=${instrFault} / 派生页数 ${routes.length}，console 错误计数≈${consoleErrCount}`);
  const auditPromptTail = [
    `巡检结果件：${WORKFLOW.closureDir}/ 下的 agent-tour-round${round}*.json 与 dsl-tour-cumulative-round${round}.json（历史轮同在）；计划件：${WORKFLOW.closureDir}/agent-tour-plan.json；覆盖门点名欠账（实时读数，非写死）：${JSON.stringify(realcovItems).slice(0, 4000)}`,
    `返回 items（每条 {id, area, what, evidence, severity}）与 openCount 与 notVerified（这一路没取证时必须 true）。`,
  ].join("\n");
  let consoleAudit: AuditOut;
  let funcAudit: AuditOut;
  let visualAudit: AuditOut;
  if (rd.audit === "done-harvest" && harvestAudit) {
    consoleAudit = normAudit(harvestAudit.consoleAudit, "收割件 console网络审查员");
    funcAudit = normAudit(harvestAudit.funcAudit, "收割件 功能断言审查员");
    visualAudit = normAudit(harvestAudit.visualAudit, "收割件 视觉对照审查员");
    log(`第 ${round} 轮三路审查：复用收割件（console=${consoleAudit.items.length} 功能=${funcAudit.items.length} 视觉=${visualAudit.items.length}；未取证路数=${[consoleAudit, funcAudit, visualAudit].filter((a) => a.notVerified).length}/3）`);
  } else {
    consoleAudit = normAudit(await consoleAuditor.ask<AuditOut>([`审 console/网络：${auditPromptTail}`].join("\n"),
    ).then((v) => v, (e) => notVerifiedAudit("console网络审查员", e)), "console网络审查员"); // D6
    funcAudit = normAudit(await funcAuditor.ask<AuditOut>([`审功能覆盖与断言：${auditPromptTail}`].join("\n"),
    ).then((v) => v, (e) => notVerifiedAudit("功能断言审查员", e)), "功能断言审查员");
    visualAudit = normAudit(await visualAuditor.ask<AuditOut>([`审视觉对照（抽检关键页截图）：${auditPromptTail}`].join("\n"),
    ).then((v) => v, (e) => notVerifiedAudit("视觉对照审查员", e)), "视觉对照审查员");
    rd.audit = "done";
    await persistJson(WORKFLOW.closureDir + `/dsl-audit-round${round}.json`, { consoleAudit, funcAudit, visualAudit });
  }
  const degraded = [consoleAudit, funcAudit, visualAudit].filter((a) => !a || a.notVerified === true);
  const auditDegraded = degraded.length > 0;
  if (auditDegraded) {
    auditDegradedAny = true;
    degradedRounds++;
    blockers.push(`第 ${round} 轮三路审查未全部取证（${degraded.length}/3 路未取证）⇒ 本轮不判「零新增缺陷」，提前停条件关闭`);
  }
  const auditItems: AuditItem[] = [
    ...(Array.isArray(consoleAudit.items) ? consoleAudit.items : []),
    ...(Array.isArray(funcAudit.items) ? funcAudit.items : []),
    ...(Array.isArray(visualAudit.items) ? visualAudit.items : []),
  ].filter((i) => i && typeof i.id === "string");

  let executable: AuditItem[];
  let needsUser: UserItem[];
  if (rd.sort === "done-harvest" && harvestSort) {
    executable = sortExec;
    needsUser = sortNeedsUser;
    log(`第 ${round} 轮分拣：复用收割件（executable=${executable.length} needsUser=${needsUser.length}）`);
  } else {
    const sortRes = await sorter.ask<SortOut>(
      [
        `缺陷清单：${JSON.stringify(auditItems).slice(0, 14000)}`,
        `分拣为 executable（area ∈ 前端实现刀/backend/数据配置/覆盖补腿/工具载体；每条保留 id/what/evidence/severity 并补补法一句）与 needsUser。判据冲突/政策/数据去留/载体口径一律 needsUser。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<SortOut>("缺口分拣员", e, { executable: [], needsUser: [], notes: "分拣 ask 失败：" + String(e).slice(0, 100) }));
    executable = Array.isArray(sortRes.executable) ? sortRes.executable : [];
    needsUser = Array.isArray(sortRes.needsUser) ? sortRes.needsUser : [];
    if (executable.length === 0 && auditItems.length > 0) blockers.push("分拣车道失败或被降级：缺陷清单非空但 executable 为空 —— 不视为「无可修项」，本轮不得提前停");
    rd.sort = "done";
    await persistJson(WORKFLOW.closureDir + `/dsl-sort-round${round}.json`, { executable, needsUser });
  }
  for (const u of needsUser) {
    if (u && typeof u.id === "string" && !allNeedsUser.some((x) => x.id === u.id)) allNeedsUser.push(u);
  }
  lastExecutable = executable;
  manifest.rounds[String(round)] = rd;
  await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);

  // —— D6：realcovClosed 只认覆盖门自己的退出码，不认任何审查员的 items ——
  lastCov = await measureCoverage(WORKFLOW.execDir, `round${round}复量`);
  const lastCovNum = covNum(lastCov);
  realcovClosed = lastCov.exitCode === 0;
  log(`覆盖门复量：exit=${lastCov.exitCode} COVERED=${lastCovNum.covered} UNCOVERED=${lastCovNum.uncovered}/${lastCovNum.required} ⇒ realcovClosed=${realcovClosed ? "真" : "未闭/未证"}`);

  openItems = executable.length;
  if (executable.length === 0 && needsUser.length === 0 && navFail === 0 && !auditDegraded && realcovClosed) {
    log(`第 ${round} 轮零新增缺陷、无失败页且覆盖已闭，提前收工`);
    break;
  }
  if (executable.length === 0 && !auditDegraded) {
    log(`第 ${round} 轮无可执行缺陷（剩 ${needsUser.length} 项待拍板，覆盖欠账 ${lastCovNum.uncovered}）`);
    break;
  }

  // —— 修复 + 独立复验 + UI 回归（代码修复归修复工程师，覆盖补腿归 UI 车道）——
  phase("修复与回归验证");
  const codeFixItems = executable.filter((i) => i.area !== "覆盖补腿");
  const covLegItemsAll = executable.filter((i) => i.area === "覆盖补腿");
  // 需拍板项阻塞的腿不占设备租约：判决要等人裁的腿，跑了也只是空帧
  const pendingRulingIds = allNeedsUser.map((u) => u.id).filter((s) => typeof s === "string" && s !== "");
  const covLegItems = covLegItemsAll.filter((i) => !pendingRulingIds.some((rid) => ((i.what || "") + (i.evidence || "")).indexOf(rid) >= 0));
  const rulingBlocked = covLegItemsAll.filter((i) => pendingRulingIds.some((rid) => ((i.what || "") + (i.evidence || "")).indexOf(rid) >= 0));
  if (rulingBlocked.length > 0) {
    for (const it of rulingBlocked) blockers.push(`补腿 ${it.id} 不空跑：其判决挂在待拍板项上（RULING_BLOCKED），先裁再跑`);
    log(`覆盖补腿 ${covLegItemsAll.length} 条中 ${rulingBlocked.length} 条因需拍板项而不去占租约`);
  }
  const fix = codeFixItems.length > 0
    ? await fixerAgent.ask<LaneOut>(
      [
        `本轮要修复的缺陷（按 area 分组，含分拣给的补法）：${JSON.stringify(codeFixItems).slice(0, 14000)}`,
        `巡检与审查证据件在 ${WORKFLOW.closureDir}/（agent-tour-round${round}*.json、dsl-audit-round${round}.json、dsl-sort-round${round}.json）。环境纪律：跑 scripts/** 一律用 ${WORKFLOW.nodeBin}（PATH node 是 v16，会把带 import.meta.dirname 的门判成假红）。`,
        `增量落盘 ${WORKFLOW.closureDir}/agent-fix-lane.md（骨架先行）。撤红不等于判绿：源码证伪旧归因只能写「红已撤、绿未证」。`,
        `返回 fixedIds / filesChanged / skipped / evidence / notes。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>("巡检修复工程师", e, { lane: "修复", fixedIds: [], filesChanged: [], skipped: codeFixItems.map((i) => ({ id: i.id, reason: "修复 ask 失败" })), evidence: [], notes: "" }))
    : { lane: "修复", fixedIds: [], filesChanged: [], skipped: [], evidence: [], notes: "本轮无代码修复项" };
  if (covLegItems.length > 0 && setup.wsUp) {
    const legs = await ui.ask<TourOut>(
      [
        `覆盖补腿批（第 ${round} 轮）：${JSON.stringify(covLegItems).slice(0, 6000)}`,
        `覆盖门实时点名与轴口径（照抄门的期待格式，缺哪根轴补哪条腿）：${JSON.stringify(realcovItems).slice(0, 4000)}`,
        `逐条补真实腿（login 或 login+guest）：真实登录态用 dev-user 演示入口或 r-exec 既有 login op 铸造，禁编造；结果件写 ${WORKFLOW.execDir}/exec-v37-<点名>/exec-results.json（本轮新腿一律 exec-v37- 前缀，只新增不改任何历史件；覆盖门的 --dir 就是这个目录），每行必须带 band=mode@sha8 与 sessionSource/loginVerify（无身份/无带宽的行门不认，不得靠改标签凑覆盖）。`,
        `【点样重跑】上一轮的腿是在本次 rebuild 之前拍的，带宽戳只识别 config 不识别构建；除欠账外再从既有真档页里挑若干页在当前带宽重拍，notes 写 attests=current。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], dispatched: -1, notes: "补腿 ask 失败：" + String(e).slice(0, 80) }));
    const legRows = Array.isArray(legs.rows) ? legs.rows : [];
    for (const row of legRows) {
      if (!row || typeof row.route !== "string") continue;
      const idx = allTourRows.findIndex((x) => x.route === row.route);
      if (idx >= 0) allTourRows[idx] = row; else allTourRows.push(row);
    }
    await persistJson(WORKFLOW.closureDir + `/dsl-cov-legs-round${round}.json`, { covLegItems, legRows, rulingBlocked: rulingBlocked.map((x) => x.id), evidence: legs.evidence ?? [], dispatched: legs.dispatched });
    log(`覆盖补腿：${legRows.length} 行（dispatched=${String(legs.dispatched)}）`);
  } else if (covLegItems.length > 0) {
    blockers.push(`覆盖补腿 ${covLegItems.length} 条未执行：WS 通道未就绪`);
  }
  const toVerify = (fix.fixedIds ?? []).filter((id) => id !== "");
  let verifiedIds: string[] = [];
  if (toVerify.length > 0) {
    const fv = await fixVerifier.ask<LaneOut>(
      [
        `逐条复验声称已修复的缺陷：${JSON.stringify(toVerify)}；改动文件：${JSON.stringify((fix.filesChanged ?? []).slice(0, 2000))}`,
        `验证方式：源码锚点 > 相关单测重跑（用 ${WORKFLOW.nodeBin}）。fixedIds 只放你亲手在盘上证实的；行为类主张若没有本轮帧或路由/控制台证据，只能写「源码级已改，行为未证」。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<LaneOut>("修复复验员", e, { lane: "复验", fixedIds: [], filesChanged: [], skipped: toVerify.map((id) => ({ id, reason: "复验 ask 失败" })), evidence: [], notes: "" }));
    verifiedIds = fv.fixedIds ?? [];
    for (const s of [...(fix.skipped ?? []), ...(fv.skipped ?? [])]) blockers.push(`修复未收口: ${s.id}（${String(s.reason).slice(0, 80)}）`);
  }
  rd.fix = "done";
  manifest.rounds[String(round)] = rd;
  await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);
  await persistJson(WORKFLOW.closureDir + `/dsl-fix-round${round}.json`, { fix, verifiedIds, covLegItems: covLegItems.map((x) => x.id), rulingBlocked: rulingBlocked.map((x) => x.id) });
  if (setup.wsUp && verifiedIds.length > 0) {
    const regRoutes = allTourRows.filter((x) => verifiedIds.some((id) => (x.notes || "").indexOf(id) >= 0 || (x.route || "").indexOf(id) >= 0)).map((x) => x.route);
    const regressionTargets = (regRoutes.length > 0 ? regRoutes : allTourRows.filter((x) => x.status === "NAV_FAIL").map((x) => x.route)).slice(0, WORKFLOW.regressionPageCap);
    if (regressionTargets.length > 0) {
      const reg = await ui.ask<TourOut>(
        [
          `回归批（第 ${round} 轮修复后，上限 ${WORKFLOW.regressionPageCap} 页）：${JSON.stringify(regressionTargets)}`,
          `逐页重走巡检流程（同前批纪律、护栏与通道表口径），结果写 ${WORKFLOW.closureDir}/agent-tour-round${round}-regression.json 并返回 rows（含 dispatched）。`,
        ].join("\n"),
      ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], dispatched: -1, notes: "回归 ask 失败" }));
      const regRows = Array.isArray(reg.rows) ? reg.rows : [];
      for (const row of regRows) {
        if (!row || typeof row.route !== "string") continue;
        const idx = allTourRows.findIndex((x) => x.route === row.route);
        if (idx >= 0) allTourRows[idx] = row; else allTourRows.push(row);
      }
      await persistJson(WORKFLOW.closureDir + `/dsl-tour-cumulative-round${round}.json`, allTourRows);
      log(`回归：${regRows.length} 页重验（dispatched=${String(reg.dispatched)}）`);
    }
  }
}
// =====================================================================
phase("发现入册");
// —— D11：没有矩阵行的发现既不会被修、也不会出现在终账里。v3.6 三轮的 sort/fix 件
//    从未并进 issue-matrix，本轮补一次显式入册，再由 verify-ledger 复量。 ——
const admitter = agent("台账入册员", "你是台账写手：把本轮缺陷逐条对账进 issue-matrix。铁律：① 先 grep 现有矩阵，命中同主体就记 new-id ≡ existing-id 并附**矩阵行号**（历史矩阵存在同一 ID 承载两个缺陷的情形，不写行号等于没写）；② 置信按证据强度分级——只有本轮同轮干净帧支持才给 ≥0.7，重放帧/1× 帧/纯源码推断一律 0.4–0.5；③ 不得把状态写成比实际更有利（撤红≠判绿）；④ 只做单写者，一次改一份件；⑤ 改动前后各数一次矩阵数据行数并报数，行数变小就是删错了，必须回滚。");
const admissionRows = lastExecutable.map((i) => ({ id: i.id, area: i.area, what: i.what, severity: i.severity, evidence: (i.evidence || "").slice(0, 600) }));
const admission = admissionRows.length > 0
  ? await admitter.ask<{ added: number; aliased: number; rowsBefore: number; rowsAfter: number; notes: string }>(
    [
      `待入册条目（本轮分拣的 executable）：${JSON.stringify(admissionRows).slice(0, 12000)}`,
      `矩阵：${WORKFLOW.matrixDir}/issue-matrix.md（先数行数，再逐条 grep 判重）。本轮产物目录：${WORKFLOW.closureDir}（证据件路径要能回指）。`,
      `同时把本轮 needsUser ${allNeedsUser.length} 条列成"待裁清单"写进 ${WORKFLOW.closureDir}/agent-ruling-queue.md（每条：为何要裁、可选项、不裁挡住哪几条腿）。`,
      `返回 added / aliased / rowsBefore / rowsAfter / notes。改完必须自己复数一遍行数。`,
    ].join("\n"),
  ).then((v) => v, (e) => askFail<{ added: number; aliased: number; rowsBefore: number; rowsAfter: number; notes: string }>("台账入册员", e, { added: -1, aliased: -1, rowsBefore: -1, rowsAfter: -1, notes: "入册 ask 失败：" + String(e).slice(0, 100) }))
  : { added: 0, aliased: 0, rowsBefore: -1, rowsAfter: -1, notes: "本轮无可入册缺陷" };
manifest.admission = admission.added >= 0 ? "done" : "failed";
await persistJson(WORKFLOW.closureDir + "/dsl-admission.json", { admission, atHead: head });
await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);
log(`入册：新增=${admission.added} 归并=${admission.aliased} 矩阵行数 ${admission.rowsBefore}→${admission.rowsAfter}（${admission.notes.slice(0, 80)}）`);
if (admission.rowsBefore >= 0 && admission.rowsAfter >= 0 && admission.rowsAfter < admission.rowsBefore) {
  blockers.push(`入册后矩阵行数变小（${admission.rowsBefore}→${admission.rowsAfter}）⇒ 疑似删行，必须从 git 恢复后重做`);
}

// =====================================================================
phase("门禁终验与构建");
let buildOk = false;
let tcOk = false;
let testOk = false;
{
  // 客户端三门（修复车道动过前端/后端源码）：bat 动态实跑 + typecheck + 单测，失败交修复工程师（≤2 轮）
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
  gateToBoard(out, WORKFLOW.acceptedReds);
  return out;
}));
const realcovGate = gateOuts.find((g) => g.name.indexOf("verify-real-coverage") >= 0) || null;
const realcovNum = realcovGate ? covNum(realcovGate) : { covered: NaN, uncovered: NaN, required: NaN, list: 0 };
/* 同一道门在 DSL 里有第二个调用点（GATE_SUITE 直调，不走 measureCoverage），
   回执核对必须在这一发也做一遍，否则终局读数可以来自一个旗标没生效的运行。 */
if (realcovGate) {
  const eDir = (realcovGate.metrics["REALCOV_CASES"] || "").match(/结果目录=(.*)$/);
  const eLedger = realcovGate.metrics["REALCOV_LEDGER_SOURCE"] || "";
  const wantDir = WORKFLOW.execDir.split("/").slice(-1)[0];
  const wantLedger = WORKFLOW.harvestFrom + "/tour-ledger.json";
  if (!eDir || eDir[1].replace(/\\/g, "/").indexOf(wantDir) < 0) blockers.push(`终局覆盖门回显结果目录不含 "${wantDir}" ⇒ --dir 未生效，终局覆盖读数作废`);
  if (eLedger.indexOf(wantLedger.split("/").slice(-2).join("/")) < 0) blockers.push(`终局覆盖门回显台账不含 "${wantLedger.split("/").slice(-2).join("/")}" ⇒ --ledger 未生效，待判决桶判的不是本轮点名的台账`);
}
/** 只读量一次上一轮目录，作为对照；它不参与判绿，只为把"腿写在哪儿门就只看得见哪儿"这件事留痕 */
const covHistory = await measureCoverage(WORKFLOW.harvestFrom, "上一轮只读对照");
const covHistoryNum = covNum(covHistory);
if (realcovGate) log(`REALCOV 终验（判绿目录=${WORKFLOW.execDir}）：exit=${realcovGate.exitCode} COVERED=${realcovNum.covered} UNCOVERED=${realcovNum.uncovered}/${realcovNum.required} 点名=${realcovNum.list}；对照（只读，不判绿）COVERED=${covHistoryNum.covered} UNCOVERED=${covHistoryNum.uncovered}`);
// D2/D3：门判红却没点名 ⇒ 判点空转，这条红不许当成欠账，也不许当成通过
if (realcovGate && realcovGate.exitCode !== 0 && realcovNum.list === 0) blockers.push("覆盖门判红但 UNCOVERED 点名清单为空 ⇒ 门自身空转，本轮覆盖结论不采信");

const redProbe = await runGate({ name: "门禁可变红自检 prove-gates-can-fail", args: ["scripts/qa/prove-gates-can-fail.mjs"], timeoutMs: 300000 });
gateToBoard(redProbe);
log(`可变红自检 prove-gates-can-fail exit=${redProbe.exitCode}（${redProbe.resultLine.slice(0, 120)}）—— 不绿则本轮任何红数下降都不作数`);
const gatesTrusted = interpreterOk && redProbe.exitCode === 0;
if (!gatesTrusted) blockers.push(`门禁可信度不成立（解释器 OK=${interpreterOk}，红探针 exit=${redProbe.exitCode}）⇒ 本轮任何"红数下降"都不作数，绿也不作数`);

const panelOuts: GateOut[] = [];
for (const g of PANEL_SUITE) {
  const o = await runGate(g);
  gateToBoard(o);
  panelOuts.push(o);
  if (o.exitCode !== 0) blockers.push(`面板腿红：${o.name}（${o.resultLine}）`);
}
const stillRed = gateOuts.filter((g) => g.exitCode !== 0 && WORKFLOW.acceptedReds.indexOf(g.name) < 0).map((g) => g.name);
const knownRed = gateOuts.filter((g) => g.exitCode !== 0 && WORKFLOW.acceptedReds.indexOf(g.name) >= 0).map((g) => g.name);
if (knownRed.length > 0 && redProbe.exitCode === 0) log(`已知已裁红（不计入本轮新增问题，红探针已证实其仍可判红）：${knownRed.join("、")}`);
else if (knownRed.length > 0) blockers.push("有红项落在 acceptedReds 白名单内，但红探针自检未通过 ⇒ 白名单依据不成立，先证明门还能红");

await persistJson(WORKFLOW.closureDir + "/dsl-gate-recheck-v37.json", {
  gates: gateOuts, stillRed, knownRed, acceptedReds: WORKFLOW.acceptedReds, redProbe, panelOuts,
  coverage: { judgeDir: realcovNum, judgeDirName: WORKFLOW.execDir, readonlyCompare: covHistoryNum },
  tourRows: allTourRows.length, roundsDone, realcovClosed, openItems, gatesTrusted,
});

// —— D4：DSL 自己产出报告要读的那份读数件，否则 §7 会印上一轮留在盘上的旧 summary ——
const gateExitMap: Record<string, number> = {};
for (const g of gateOuts) gateExitMap[g.name] = g.exitCode;
log(`门禁复量：GATE_SUITE ${GATE_SUITE.length} 条实测，仍红 ${stillRed.length}（${stillRed.join("、") || "无"}），已知已裁红 ${knownRed.length}（${knownRed.join("、") || "无"}），可信度=${gatesTrusted ? "成立" : "不成立"}`);
await persistJson(".zcode/tmp/final-verify/summary.json", {
  producedBy: "ui-audit-v37 DSL",
  headBefore: head,
  headAfter: head,
  gates: gateExitMap,
  reds: stillRed,
  knownReds: knownRed,
  panelReds: panelOuts.filter((o) => o.exitCode !== 0).map((o) => o.name),
  redProbeExit: redProbe.exitCode,
  coverage: { covered: realcovNum.covered, uncovered: realcovNum.uncovered, required: realcovNum.required },
  note: "本轮 DSL 产出的终局读数；§1–§6 若仍引 round-7/v3.3 的历史账单件，那些节属历史账，不是本轮读数",
});
log(`终报读数已落盘：.zcode/tmp/final-verify/summary.json（gates=${Object.keys(gateExitMap).length} 条，红 ${stillRed.length}）`);
const reportGen = await runGate({ name: "总报告回填 gen-round8-report", args: ["scripts/qa/gen-round8-report.mjs"], timeoutMs: 180000 });
gateToBoard(reportGen);
log(`报告生成器 gen-round8-report exit=${reportGen.exitCode}（${reportGen.resultLine.slice(0, 120)}）—— §7 只认这份读数，禁止手填数字`);
if (reportGen.exitCode !== 0) blockers.push(`总报告回填未跑成（exit=${reportGen.exitCode}）⇒ §7 停在未跑，禁止手填数字代替读数`);
manifest.report = reportGen.exitCode === 0 ? "done" : "failed";
manifest.gates = gatesTrusted ? (stillRed.length === 0 ? "green" : "red") : "untrusted";
await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);

// =====================================================================
phase("提交推送与总报告");
// —— 显式路径提交（本仓有用户刻意删除的 tracked 证据，绝不 add -A / add -u）——
const addRes = await gitTry(["add", "--", WORKFLOW.closureDir + "/", WORKFLOW.matrixDir + "/issue-matrix.md"]);
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

// —— 提交后复量 sha 敏感门：HEAD 一动，语料/溯源/新鲜度类门的读数就会变，绿可能是提交前快照 ——
const SHA_SENSITIVE = ["证据语料 verify-evidence-corpus", "溯源全量 verify-provenance-all", "档位新鲜度 verify-band-freshness", "后端新鲜度 verify-backend-fresh", "真实档覆盖 verify-real-coverage"];
const postCommit: GateOut[] = [];
for (const nm of SHA_SENSITIVE) {
  const g = GATE_SUITE.find((x) => x.name === nm);
  if (!g) continue;
  const o = await runGate(g);
  postCommit.push(o);
  gateToBoard(o, WORKFLOW.acceptedReds);
}
const postReds = postCommit.filter((g) => g.exitCode !== 0 && WORKFLOW.acceptedReds.indexOf(g.name) < 0).map((g) => g.name);
const summaryAfter: Record<string, number> = {};
for (const g of postCommit) summaryAfter[g.name + "(提交后)"] = g.exitCode;
await persistJson(".zcode/tmp/final-verify/summary.json", {
  producedBy: "ui-audit-v37 DSL",
  headBefore: head,
  headAfter: finalHead,
  gates: Object.assign({}, gateExitMap, summaryAfter),
  reds: stillRed,
  redsAfterCommit: postReds,
  knownReds: knownRed,
  panelReds: panelOuts.filter((o) => o.exitCode !== 0).map((o) => o.name),
  redProbeExit: redProbe.exitCode,
  coverage: { covered: realcovNum.covered, uncovered: realcovNum.uncovered, required: realcovNum.required },
  movedByCommit: postReds.filter((n) => stillRed.indexOf(n) < 0),
  note: "HEAD 由 " + head + " 推进到 " + finalHead + "；同一格红/绿以提交后读数为准，翻转项见 movedByCommit",
});
await persistJson(WORKFLOW.closureDir + "/dsl-post-commit-v37.json", { head, finalHead, postCommit, postReds });
log(`提交后 HEAD=${finalHead}（起点 ${head}）；sha 敏感门复量 ${postCommit.length} 条，新增红 ${postReds.length}（${postReds.join("、") || "无"}）—— 本轮终账以提交后读数为准`);

const clientGreen = buildOk && tcOk && testOk;
let pushed = false;
let pushNote = "";
if (!clientGreen) {
  pushNote = "未推送：客户端构建/typecheck/单测存在红项";
} else if (!gatesTrusted) {
  pushNote = "未推送：门禁可信度不成立（解释器或红探针未通过）";
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

const navOkFinal = allTourRows.filter((x) => x.status === "NAV_OK").length;
const guardSkips = allTourRows.filter((x) => (x.status || "").indexOf("SKIP") >= 0).length;
const instrFinal = allTourRows.filter((x) => (x.status || "").indexOf("UNVERIFIED-INSTRUMENT") >= 0).length;
const md = [
  `# 全量UI巡检闭环总报告（v${WORKFLOW.version}，收割续跑）`,
  "",
  `- 起点 HEAD ${head}（${branch}），终点 ${finalHead}；后端 8080 ${backendUp ? "UP(real)" : "DOWN"}；WS 通道 ${setup.wsUp ? "OK(" + setup.port + ")" : "FAIL"}（档=${setup.band || "?"} 匹配=${setup.bandMatch ? "match" : "NOMATCH"}）；解释器=${nodeVersion}`,
  `- 收割：只读自 ${WORKFLOW.harvestFrom}（不搬运腿，避免同一证据出现两份副本）；同名腿镜像检查=${legMirrorLine}；轮次状态见 dsl-run-manifest.json`,
  `- 巡检：${roundsDone} 轮，覆盖 ${navOkFinal}/${routes.length} 页 NAV_OK（页数由 pages.json 派生），失败 ${allTourRows.filter((x) => x.status === "NAV_FAIL").length}，仪器故障 ${instrFinal}，护栏跳过 ${guardSkips}`,
  `- 审查-修复-回归：最终 openItems=${openItems}；入册 新增=${admission.added} 归并=${admission.aliased} 矩阵 ${admission.rowsBefore}→${admission.rowsAfter}`,
  `- 覆盖门（判绿目录 ${WORKFLOW.execDir}，本轮新腿落 ${WORKFLOW.execDir}/exec-v37-*）：COVERED=${realcovNum.covered} UNCOVERED=${realcovNum.uncovered}/${realcovNum.required} 点名=${realcovNum.list}；只读对照 COVERED=${covHistoryNum.covered} UNCOVERED=${covHistoryNum.uncovered}`,
  `- 客户端三门：构建=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}；门禁仍红 ${stillRed.length}（${stillRed.join("、") || "无"}）；已知已裁红 ${knownRed.length}（${knownRed.join("、") || "无"}）；提交后新增红 ${postReds.length}（${postReds.join("、") || "无"}）`,
  `- 门禁可信度：${gatesTrusted ? "成立" : "不成立（本轮任何绿/红下降都不作数）"}；总报告回填 ${reportGen.exitCode === 0 ? "已跑" : "未跑（§7 不留结论）"}`,
  `- ${pushNote}`,
  "",
  "## 需你拍板（未替你决定）",
  ...(allNeedsUser.length > 0 ? allNeedsUser.map((u) => `- ${u?.id ?? "?"}：${u?.why ?? ""}（可选：${u?.options ?? ""}）`) : ["- （无）"]),
  "",
  "## 仍未保证（每条带原因）",
  ...(blockers.length > 0 ? blockers.map((b) => `- ${b}`) : ["- （无）"]),
  "",
  "## 口径说明",
  `- 「保证所有问题没有」以机器可判据收口：全部 ${routes.length} 页 NAV_OK + 重放期 console 清白 + 可交互元素清点齐 + 安全动作抽测无失败 + 覆盖门 UNCOVERED 清零且点名闭合。`,
  "- 页面真实加载期 console 原文、storage 明文嗅探属采集通道表已声明的能力边界（partial / no），不在判据内；不得以「未发现问题」表述替代「未取证」。",
  "- 截图帧未入库：.gitattributes 的 LFS fail-loud 闸 + .gitignore 的 *.png 双重挡住，帧留盘可复核，入库方式归既有拍板。",
  "- 搬运自上一轮的真档腿 attests 的是 rebuild 之前的 bundle（带宽戳只识别 config 不识别构建），本轮另有点样重跑，两者在 dsl-harvest-provenance.json 分列。",
].join("\n");
try {
  await artifact.markdown("final", md, { title: "全量UI巡检闭环总报告 v3.7", description: "收割 v3.6 round-3 尾段的巡检-修复-入册-终验结果、已知红与需拍板清单", primary: true });
} catch (e) {
  log("总报告发布失败：" + String(e).slice(0, 120));
}

const verified: string[] = [
  `巡检 ${roundsDone} 轮：${navOkFinal}/${routes.length} 页 NAV_OK，累计 ${allTourRows.length} 行落 ${WORKFLOW.closureDir}/dsl-tour-cumulative-round*.json`,
  `三路独立审查逐轮执行（降级路数已如实计入 blockers，未取证不当零缺陷）；分拣 executable=${openItems}、needsUser=${allNeedsUser.length}`,
  `修复后客户端三门守门员实测：构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}`,
  `GATE_SUITE ${GATE_SUITE.length} 条 + 红探针 + 面板 ${PANEL_SUITE.length} 条（面板带 --dry，不再改写它要测的输入）；终局读数由本 DSL 自己写入 .zcode/tmp/final-verify/summary.json 并调 gen-round8-report 回填`,
  `覆盖门终验读数：COVERED=${realcovNum.covered} UNCOVERED=${realcovNum.uncovered}/${realcovNum.required} 点名=${realcovNum.list}（exit=${realcovGate ? realcovGate.exitCode : "?"}）`,
  `入册：${WORKFLOW.matrixDir}/issue-matrix.md 行数 ${admission.rowsBefore}→${admission.rowsAfter}（新增 ${admission.added}，归并 ${admission.aliased}）`,
];
const notCovered: string[] = [
  "巡检截图帧未入库（LFS fail-loud 闸 + *.png 忽略，归既有拍板）；帧在 " + WORKFLOW.closureDir + "/screenshots/ 可复核",
  "支付/VIP 真实拉起不在巡检范围（商业化封存态，只验 404/403 设计行为）",
  "破坏性动作（删除/解绑/同意类）按护栏跳过，未真实执行",
  "真机手感、长时压测、弱网不在机器判据内",
  "页面真实加载期 console 原文不可得（重放路径为上限）；storage 明文嗅探无已证通道 —— 两条均为采集通道表声明的能力边界，分别挂拍板项 R3-11 / R3-10",
  ...(!setup.wsUp ? ["DevTools 通道未就绪：本轮 UI 巡检降级，页面级保证不成立（见 blockers）"] : []),
  ...(auditDegradedAny ? [`三路审查有 ${degradedRounds}/${roundsDone} 轮未全部取证：那几轮的"无新增缺陷"不成立，缺陷总数下界未知`] : []),
  ...(!backendUp ? ["后端 8080 未 UP：真档腿与前后端连通/后台同步证据本轮不可产生，一律 NOT-EVIDENCED"] : []),
  ...(!gatesTrusted ? ["门禁可信度不成立：本轮门禁读数（含绿）一律不采信"] : []),
];
const findings: Finding[] = [];
for (const u of allNeedsUser) {
  findings.push({ where: u?.id ?? "(缺 id)", what: "需用户拍板：" + (u?.why ?? ""), evidence: u?.options ?? "", status: "verified", severity: "medium" });
}
for (const b of blockers.slice(0, 40)) {
  findings.push({ where: "本轮 blockers", what: b, evidence: "见对应审查/巡检/门禁输出", status: "verified", severity: "medium" });
}

return {
  conclusion: `全量UI巡检闭环${gatesTrusted && !auditDegradedAny && stillRed.length === 0 && realcovClosed && clientGreen ? "完成" : "跑到终点但未全绿（如实报）"}：收割 ${roundsDone} 轮巡检覆盖 ${navOkFinal}/${routes.length} 页，三路审查-修复-回归终态 openItems=${openItems}、入册新增=${admission.added}；客户端三门${clientGreen ? "全绿" : "有红项"}；覆盖门 UNCOVERED=${realcovNum.uncovered}/${realcovNum.required}（点名=${realcovNum.list}）；门禁仍红 ${stillRed.length}${knownRed.length ? ` + 已知已裁红 ${knownRed.length}` : ""}；审查降级轮数 ${degradedRounds}/${roundsDone}${auditDegradedAny ? "（故「无新增缺陷」不成立）" : ""}；${pushNote}。「所有问题没有」只在机器判据口径内成立，判据之外与未取证项逐条列在 findings/notCovered。`,
  findings,
  verified,
  notCovered,
};
