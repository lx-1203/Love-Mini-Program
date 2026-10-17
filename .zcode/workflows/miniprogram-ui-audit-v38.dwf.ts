/* zcode-workflow
description: 全量UI巡检闭环 v3.8（谱系 v3.1→v3.2→v3.3→v3.4/v3.5→v3.6→v3.7→本版）：对小程序全部页面
  （页数由 pages.json 派生，不写死）做巡检—审查—修复—回归闭环。本版八处硬改动（E1–E8，全部是实测缺陷）：
  ①收割账本改指本轮并让"自报已完成"必须被盘上的件复核，缺件就降级重跑；②五把后台/设备侧的实测门
  接进面板串行段并实量它们的前置（缺口令=未取证，不是红也不是绿）；③总报告回填移到提交后读数落盘
  之后（v3.7 的 §7 永久用提交前读数）；④git add 与 git commit 之间插一道暂存区密钥预检，默认拦提交；
  ⑤带宽戳只留一把尺（artifact-band.mjs 的 mode@sha8）并机器断言生产者与消费者同源；⑥v3.7 的路径
  硬编码在两载具里一次翻齐，不放宽断言；⑦真实类型通道检查从 gitignore 的 tmp/ 提升到 scripts/qa
  并同时进两载具（--file 无缺省）；⑧maxRounds 3→4，round-4 是"真档欠账清零轮"，派活清单是覆盖门
  自己的三只互斥桶 UNCOVERED/VOIDED/EXPIRED（一条数字也不写进散文）。判据只认脚本自己印的机器行
  （WS_UP=OK/WS_UP_BAND_RESULT=match，以及 REALCOV_ 前缀、ADMAUD_ 前缀、ADMSCOPE_ 前缀、
  ADMWRITE_ 前缀、POSTDETAIL_ 前缀、DEVICELEG_ 前缀、STAGEDSECRETS_ 前缀、TCHECK_ 前缀这类
  以 _RESULT= 收尾的判决行 —— DSL 的 resultLineOf() 与 bash 的 g() 都按同一把尺归因）。
whenToUse: 需要全量审查小程序所有页面/按钮/功能并循环修复到无新增缺陷时运行；改版后全量回归、
  发布前验收、真实档覆盖补腿皆可。前置：Redis 6379 + 后端 8080 real UP + 三档构建新鲜
  （缺失时本工作流自己按守门员车道拉，不要求人点任何按钮）+ DevTools 自动化通道（端口运行时发现）
  + 后台门所需口令在环境里（SUPER_PASSWORD / ADMIN_LOGIN_* / AUDITOR_* / STUDENT_*，本文件只列名不嵌值）
  + admin dev server 的实际地址（verify-admin-post-detail 的缺省是 5177，本轮实测在 5173）。
*/
// =====================================================================
// 全量UI巡检闭环工作流 v3.8
// 谱系：qa-loop v3.1 → v3.2 → qa-finish v3.3 → repo-closure v3.4/v3.5 → ui-audit v3.6 → v3.7 → 本文件
// 目标（用户指令）：对小程序全部页面的所有按钮与功能做全量巡检审查，审计-修复-回归
//   循环直到无新增问题；有空缺全速派发子代理；保证整轮跑到终点（v3.6 没跑到）。
//
// 本版相对 v3.7 的八条改动（E1–E8，每条同样都是实测缺陷，不是风格偏好）：
//   E1 收割与命名空间的三个错位：①锁名 ui-audit-v38.lock 早已被上一轮的 scratch 包腿器占用
//      （tmp/qa/v38-lease-run.mjs:4 硬写 QA_UI_RESOURCE=ui-audit-v38），本版改用 ui-audit-v38-dsl；
//      ②覆盖门的 --ledger 不能随 harvestFrom 走 —— 上一轮目录里没有 tour-ledger.json，
//      显式 --ledger 指空路径时门不只判红，它把待判桶读成 0、把作废的判决放回 COVERED
//      （实测同一 --dir/--ops：COVERED 196→200、VOIDED 4→0），所以 --ledger 单列一键并实量存在性；
//      ③收割来的 manifest 带着上一轮的 closureDir/version/report 出场 ⇒ 一开局就 STALE，
//      本版只继承 rounds，身份字段一律重写。
//   E2 五把后台/设备门此前在两载具里都不存在（今天实测全绿：ADMAUD pass=17 / ADMSCOPE pass=17 /
//      ADMWRITE pass=15 / POSTDETAIL pass=30）。它们不进并发清单的理由逐条写在面板段；
//      前置不齐时落"未取证"第四格，既不记 PASS 也不记产品红（无归属的绿比缺席的门更坏）。
//   E3 报告生成器排在提交前，而 summary.json 提交后又重写一次 ⇒ §7 永久是提交前读数，
//      与本文件"终账以提交后读数为准"那句话直接矛盾；bash 载具早就是先写 summary 再跑报告，
//      本版把 DSL 对到 bash 上。
//   E4 提交前没有暂存区密钥预检：.gitignore 只是"看不见"不是"不许提交"，
//      实测 .env.bak-20261014-rot 同时漏过 .gitignore:24 与 :157 两道规则 —— 只有读索引的门拦得住。
//      本版把它夹在 add 与 commit 之间，且 fail-closed：exit 1（有判点）与 exit 2（量不到）都不提交。
//   E5 带宽戳此前有三个生产者写三种形态（r-exec-cli 的 sha8、device-leg 曾经的 HEAD 短号、
//      DSL 自己的 env.js 内联正则）。band 键写错的后果是静默的：门把该行摘进 EXPIRED，
//      不报错、只减 COVERED。本版只留一把尺，并把"生产者同源""消费者回显同枚 sha8"都做成断言。
//   E6 v3.7 的工作流路径硬编码散在两载具共 5 处；本版一次翻齐且不放宽断言
//      （放宽=拿无名字的豁免开后门，本仓的立规是任何免检都要写理由）。
//   E7 唯一能抓"ask 返回 PromiseLike 却挂 .catch"与"重复 function 声明"的检查器住在
//      .zcode/tmp/tcheck-v32.cjs —— tmp/ 是 any-depth 忽略规则，clean checkout 上它不存在。
//      本版提升到 scripts/qa/tcheck-workflow.cjs，--file 无缺省值，并同时进两个载具。
//   E9 判决不许建立在「固定 sleep 后单发读」上。本轮两条腿红（01-home 路由落在 discover、
//      village store n=0）复核下来都是首读不可信，不是产品缺陷；只补等稳环（读到达标或读到
//      状态自己收回 loading=false 为止，detail 同印首读与稳后读数）同一条腿就落 41 PASS/0 FAIL。
//      ⚠ 截至本版这一条只是措辞纪律，没有可红的判点守着它：新门要同时进 DSL 与 sh 两个载具、
//      给 _RESULT= 机读行、并在 prove-gates-can-fail 里证明它能红——本轮预算已尽，欠下一程。
//      【下一程已兑现（本版补记）】判点 = scripts/qa/verify-settle-discipline.mjs：
//      静态扫 verify-device-leg 与 r-exec-ws 的 await sleep( 站点，按 guarded / single_read / other /
//      arg_not_literal 四类分（尺与逐条基线判读写在该文件头注释），single_read 超过实测基线 7 ⇒ exit 1，
//      载具缺失或零站点 ⇒ exit 2（量不到≠达标）；两载具都接线（GATE_SUITE 与 run-final-verify-v33.sh 的
//      `g settle-discipline 60`），可红证明走 --selftest（注入一条 sleep+check ⇒ 7→8 红；撤掉 ⇒ 7 绿，
//      变异 grep-back 验证落盘），并已在 prove-gates-can-fail 里作为一条案例进"每把门都能红"的总账。
//      它不取租约、不写 DB ⇒ 排在并发道 GATE_SUITE。
//   E10 腿的产物写点必须全部过同一枚凭据屏，"同一枚"是重点（另写一个就会漂移）。
//      本程 tally 侧过了 scrubEvidence，而结果件 exec-results.json 没过：git add 之后被
//      verify-staged-secrets 判出 1 段活会话票（掩码 eyJ****(len=108)）。危险是结构性的——
//      覆盖门只认 exec-*/exec-results.json 这个形状，所以带票的那份正是下一程"必须 add"的那件。
//      本轮该件保持 untracked，且没有手改它的字节去把门喂绿（改产物=造证据）。
//   E11 按名字点门的 runner，一条没匹配上就必须响亮地失败。.zcode/tmp/pre-wave-20261015/
//      run-named-gates.mjs 对 verify-device-leg 报 NAMED_GATES_RAN=0 且 nonZero=0——
//      跑了 0 条却读起来像全绿。RAN=0 是红，不是"无事发生"。
//   E8 maxRounds 3→4，但光加轮数进不去：v3.7 那句 executable=0 就 break 让真档欠账永远派不完
//      （欠账归 area=覆盖补腿 与三只桶，不是代码修复项）。本版把循环入口换成"三桶合计是否为 0"，
//      清单来自门自己的点名行，round-4 就是清零轮。
// =====================================================================
//
// ----- 继承的谱系账（v3.7 相对 v3.6 的 D1–D11；本版一条也没撤回，下面 E1–E8 是叠在其上的）-----
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
// 纪律（沿用谱系全部铁律 + v3.7 补充 + 本版 E 段补充）：
//   files.* 在本机挂死 ⇒ 世界读取全走 world.run/git；跑 scripts/** 一律 Node22；
//   UI 单写者：全部 DevTools 驱动只经「UI巡检执行员」一个代理（锁协议，不旋轮抢锁）；
//     【E2-b】任何别的脚本要碰设备，必须先证明它取的租约资源名与 DSL 的是同一把
//     （guardUiLease 的缺省资源是 wechat-automation-cli，与 ui-audit-v38-dsl 不同名 ⇒ 面板段实量并拦）；
//   批次化巡检：按 WORKFLOW.batchSize 分 ask（车道 agent 实测 150 轮会被截断，绝不单 ask 吃全量）；
//   增量落盘是硬要求：骨架先行，每完成一页/一项立刻更新，盘上没有读数＝该项未做；
//   安全护栏：支付/VIP 拉起只验封存态（404/403=预期）；删除/解绑/同意类破坏性动作记 SKIP(guard)；
//     真实档写操作只做门禁点名页与缺陷复现所需，按既定裁定；
//   【E8】首读不可信 + 正向对照先行：刚拿到 WS_UP=OK 的第一次 page.$ 会把已渲染节点答成 null
//     （实测八条全 0、复查询则 HIT）⇒ 任何选择器至少查两次才允许下"不存在"的结论；
//     没过正对照，后面所有"选不到"一律 UNVERIFIED-INSTRUMENT，不得记产品缺陷；
//   【E8】清点窗口必须声明：censusWindow≠full-tree 的行不得计入"清点齐"的分子；
//   【E8】UNVERIFIED-INSTRUMENT 永远不写成 FAILED；零 dispatch 的轮次不得记 EXECUTED；
//   需拍板项阻塞的腿不占设备租约：某条腿的判决要等人裁的，如实记 RULING_BLOCKED，不空跑；
//   循环有界：最多 WORKFLOW.maxRounds 轮，零新增缺陷且覆盖闭干净才提前停，绝不假称"保证无问题"。
// =====================================================================

// ===== 配置（数值与路径只进这里）=====
const WORKFLOW = {
  version: "3.8",
  nodeBin: "D:/codex-tools/node-v22.17.0-win-x64/node.exe",
  closureDir: "reports/audit/ui-audit-2026-10-16",
  /** 上一轮（v3.7，由 CLI 会话按本定义的 phase/lane 手工派发跑完）的产物目录：只读收割，绝不覆写 */
  harvestFrom: "reports/audit/ui-audit-2026-10-13",
  /**
   * 【E1-b 实测更正：覆盖门的 --ledger 与 harvestFrom 不是同一个轴，必须分键】
   * 本仓有两个轴都习惯从 harvestFrom 派生，但它们的落盘约定不同：
   *   ① 轮次产物收割：${harvestFrom}/tour-round<N>.json、audit-round<N>.json、sort-round<N>.json；
   *   ② 判决效力台账：${harvestFrom}/tour-ledger.json —— 只有 DSL 真跑的那几轮会写它。
   * v3.7 那一轮（2026-10-13）是 CLI 会话派发的，②从未落盘：盘上实测
   *   ls reports/audit/ui-audit-2026-10-13/tour-ledger.json ⇒ 无此件（同目录只有 14 份 *-lane.md、
   *   dsl-run-manifest.json、decisions-v37.md、open-items-v37.json、rows/、frames/）。
   * 而 verify-real-coverage.mjs:120-122 的口径是「显式 --ledger 指到读不到的路径 ⇒ 记一条 problem，
   * 以本门名字判红」。今天实测两发的差别（同一 --ops/--dir，只换 --ledger）：
   *   指 10-13 ⇒ REALCOV_VOIDED_LEDGER=FAIL 待判=0 覆盖=200 欠账=5 过期=3
   *   指 10-09 ⇒ REALCOV_VOIDED_LEDGER=OK  待判=4 覆盖=196 欠账=5 过期=3
   * 也就是说「沿用 harvestFrom」不是多一条红那么简单：它把 4 条待判决静默放回 COVERED，
   * 覆盖分子从 196 顶到 200 —— 方向是洗绿，正是本文件头注 D3 记的那类结构性假读数的反向。
   * 处置：--ledger 单列一个键，值仍是 10-09 那本（门的自有缺省，corrections=11/fixlane=5 实测在读）；
   * 并在探活阶段实跑一次存在性断言（见下方 ledgerExists 处），换轮时漏改这一键会当场 blocker，不靠散文。
   */
  coverageLedger: "reports/audit/ui-audit-2026-10-09/tour-ledger.json",
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
   * ${execDir}/exec-v38-<点名>/，只增历史件，不改一个字节。
   */
  execDir: "reports/audit/round-7",
  healthUrl: "http://127.0.0.1:8080/actuator/health",
  batchSize: 15,
  /**
   * 【E8】v3.7 是 3 轮，本轮 4 轮：round-4 是"真档欠账清零轮"，不是再来一遍全量巡检。
   * 它的输入不是新的路由全集，而是覆盖门自己点名的三只桶（UNCOVERED/VOIDED/EXPIRED，
   * 见 realcovDebt 处运行时派生）—— 桶里有多少条就派多少条腿，一条也不写死。
   */
  maxRounds: 4,
  regressionPageCap: 30,
  /** 已裁接受的已知红：报告里单列"已知已裁红"，不计入新增问题（前提是红探针仍能把它判红） */
  acceptedReds: ["溯源全量 verify-provenance-all"],
  /**
   * 【E1-a 锁名：不能用 ui-audit-v38.lock，这个名字已经有写者】
   * 盘上实测 tmp/qa/locks/ui-audit-v38.lock 存在（mtime 2026-10-13 21:36，owner=r-exec-ws-ui-audit-2026-10-13，
   * batch=R7，status=released），而当时还没有任何 v3.8 工作流。写它的是
   *   tmp/qa/v38-lease-run.mjs:4 `process.env.QA_UI_RESOURCE = "ui-audit-v38";`
   * —— v3.7 那轮的「组件穿透车道」（reports/audit/ui-audit-2026-10-13/comp-chain-lane.md:4,:130）自建的
   * scratch 包腿器，它只是借了 execDir 命名习惯里的 v38 字样，与本版无关。该件在 gitignore 的 tmp/ 下，
   * clean checkout 看不见它，但本机任何一程再跑它照样会写同一把锁 ⇒ 换名不解决问题，必须让 DSL 用一把
   * 与它不同名的资源。所以本版资源名带 -dsl 后缀：只有本文件（与照本文件派活的车道）会用它，
   * 现存任何脚本都不写 ui-audit-v38-dsl.lock（grep 实测 0 命中）。
   * 注意第二把锁：scripts/verify-device-leg.mjs:313 取的是 ui-lease.mjs:40 的缺省资源
   *   QA_UI_RESOURCE || "wechat-automation-cli" —— 与这把 ui-audit-* 锁不同名，
   *   即它默认与 r-exec-cli 串行、不与本 DSL 的单写者串行。这一格由 PANEL_PRECHECK 实量，见 :ENV_PANEL 处。
   */
  uiLockName: "ui-audit-v38-dsl.lock",
  commitMsg: "evidence(qa): 全量UI巡检闭环 v3.8 —— 面板补接五把后台/设备门 + 提交前暂存区密钥预检 + 报告生成器移到提交后 + 带宽戳生产者同源断言 + round-4 真档欠账清零轮",
};
/**
 * 锁资源名 = 锁文件名去掉 .lock。ui-lease.mjs 写的 resource 字段就是它、锁文件名由它 + ".lock" 得出
 * （见其 :38-40 与在盘锁件内容），所以两处必须同源，禁止第二处再手打一遍字符串。
 */
const UI_LEASE_RESOURCE = WORKFLOW.uiLockName.replace(/\.lock$/, "");

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
    note: "可交互元素清点本身可用，但**清点窗口必须声明**：上一轮实测 73 页里 45 页的计数来自 outerWxml 首-view（只读第一个 view 子树），3 页 NAV_OK 却报 0 元素，还有 chat-session=1 / register-success=2 / topic-detail=2 这类不可能的低值 ⇒ 兄弟节点里的主体内容从未进过分子。规则：censusWindow 要如实写 full-tree 或 首-view，写 首-view 的行不得计入「清点齐」。自定义组件默认不穿透（automator 层实测）。编译后标签形状两说未定谳：v3.6 台账 R2-OT-06 断言路径形 components/profile/public/RelationshipCTA，而 2026-10-13 实读 PublicProfile.json 注册的是 kebab 名 relationship-c-t-a、PublicProfile.wxml 亦输出 kebab、全树无路径形标签 ⇒ 选择器一律从当前编译产物实读，不得照任一说法写死；组件内节点优先走执行器的 handler 直调通道，且不得因选择器命中失败就判「元素不存在」",
  },
  {
    key: "safe-action",
    what: "安全动作抽测：每页 1–2 个**自身带事件绑定**的主控件 tap 后回退；支付/VIP 只验封存态；破坏性动作 SKIP(guard)",
    artifact: "closureDir/tour-round<轮>.md 的 actions 列 + 每次 tap 命中的具体节点与其绑定来源",
    deliverable: "partial",
    note: "tap 通道本身可用，但抽测目标必须可归因，否则这一路测的是空气。两条本轮源码实证的失效形状：① 泛化选择器命中无事件的容器——[class*=card] 在 pages/nearby/index.vue:543 命中的是 .campus-cards（纯容器，@tap 挂在子节点 .campus-entry :547-556 上），subpackages/campus/campus/hub.vue:206 的 .campus-guide card-base 自身同样无绑定 ⇒ applied=true、observedRoute 不变、console clean 三条读数齐全却什么都没发生，历史轮的「安全动作抽测无失败」在这类页上没有含义。② 弹层态自取消——subpackages/village/village/publish.vue:892 的弹层根是 v-if=targetOpen 且 @tap=targetOpen=false（点遮罩即关），而 :751 的 .publish-to__card 才是开弹层的钮 ⇒ 按通用 [class*=sheet] 抽测会先命中弹层再把它关掉，两帧逐字节相同是构造使然，不是产品状态无差异。规则：动作目标要回显命中节点与绑定来源（@tap / role / handler 名）；容器无绑定就记 不可达(无绑定容器)，不得计为一次动作样本；弹层类状态用页专用选择器，且以节点挂载断言判迁移，不得用帧等值判。rapidTap/swipe 仍需 --rapid/--scroll 旗标，nativeModal/networkFault 注入需 WS 道能力（exec-capabilities C1/C3）",
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
  { name: "真实档覆盖 verify-real-coverage", args: ["scripts/qa/verify-real-coverage.mjs", "--ops", WORKFLOW.opsDir, "--dir", WORKFLOW.execDir, "--ledger", WORKFLOW.coverageLedger], timeoutMs: 180000 }, // D3：判绿目录=本轮新腿落地的 execDir；--ledger 显式点名（E1-b：这一轴与 harvestFrom 分键，实测拼错会把待判桶读成 0 并洗高 COVERED）
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
  // 登记（本轮补）：verify-rulings-landed 此前两个载具都不点名 ⇒ "裁决到底有没有落地"这句话
  // 从来没有一发全清单替我们作证（本轮 grep 实测：载具文本里零命中，手跑它给 未落地=2）。
  // 它不取租约、不写库，可以进并发段。超时与 bash 步取同值（600s），因为被杀掉的门读起来是红不是跳过。
  { name: "裁决落地核验 verify-rulings-landed", args: ["scripts/qa/verify-rulings-landed.mjs"], timeoutMs: 600000 },
  // 本轮登记 10 条孤儿门进终验：它们此前在两个载具都不点名，从未参与一发终验（实测：印 _RESULT= 的
  // 门/探针 45 个，登记前被任一载具点名的只有 25 个）。全部只读、不取租约、不写库 ⇒ 放并发段是对的。
  // 曾登记 12 条，后撤 2 条（verify-guest-landing / verify-openqueue-lanes）：这两条会写在册产物，
  // 而载具没传它们要的输入 —— 实跑一次就把 booked 的 carrier 写成 --project undefined、
  // 把 cellplan 的精确值 width: 144rpx 换成散文（门自己还印 OK）。受损两件已按名从 HEAD 恢复。
  // 契约补齐（缺输入退 2 且不写产物）后再登记，见台账 MP-R7QA-GUESTLANDING-FAIL-OPEN-001。
  // 另 3 条从未登记：verify-logged-in-landing 要 --exec、verify-evidence-integrity 要 manifest、
  // verify-package-size 要构建目录 —— 裸跑按设计退 2 或红，那是缺输入不是坏门，硬塞只会造假红。
  // 剩下 3 条没登记：verify-logged-in-landing 要 --exec、verify-evidence-integrity 要 manifest、
  // verify-package-size 要构建目录——裸跑按设计退 2 或红，那是"缺输入"不是"坏门"，
  // 硬塞进终验只会造出一串假红或假绿，所以留在孤儿基线里由完备性判点看住。
  { name: "后端重启核验 verify-backend-restarted", args: ["scripts/qa/verify-backend-restarted.mjs"], timeoutMs: 120000 },
  { name: "选择器在册核验 verify-case-selectors-exist", args: ["scripts/qa/verify-case-selectors-exist.mjs"], timeoutMs: 120000 },
  { name: "判据欠帧去向 verify-criteria-frame-debt", args: ["scripts/qa/verify-criteria-frame-debt.mjs"], timeoutMs: 120000 },
  { name: "免罪锚点核验 verify-disproof-anchors", args: ["scripts/qa/verify-disproof-anchors.mjs"], timeoutMs: 120000 },
  { name: "修复对照产物核验 verify-fixes-against-artifact", args: ["scripts/qa/verify-fixes-against-artifact.cjs"], timeoutMs: 180000 },
  { name: "台账欠帧裸行 verify-frame-debt-coverage", args: ["scripts/qa/verify-frame-debt-coverage.mjs"], timeoutMs: 120000 },
  { name: "欠帧分诊闸 verify-frame-debt-triage", args: ["scripts/qa/verify-frame-debt-triage.mjs"], timeoutMs: 120000 },
  { name: "i18n 孤儿键 verify-i18n-orphan", args: ["scripts/qa/verify-i18n-orphan.mjs"], timeoutMs: 120000 },
  { name: "状态与处置一致 verify-status-vs-disposition", args: ["scripts/qa/verify-status-vs-disposition.mjs"], timeoutMs: 120000 },
  { name: "tabBar 单点化 verify-tab-bar-single-source", args: ["scripts/qa/verify-tab-bar-single-source.mjs"], timeoutMs: 120000 },
  // 再登记（本轮）：verify-guest-landing 曾因载具不传旗标而把 "--project undefined" 与
  // "undefined + undefined" 写进在册件、门自己还印 OK（见台账 MP-R7QA-GUESTLANDING-FAIL-OPEN-001）。
  // 现在取参单源 + 带 undefined 即退 2 不写盘，且登记时显式传 --project，不再依赖缺省。
  { name: "游客落地具名腿 verify-guest-landing", args: ["scripts/qa/verify-guest-landing.mjs", "--project", "apps/client/dist/build/mp-weixin-real"], timeoutMs: 120000 },
  { name: "用例可自动化预检 verify-case-automatable", args: ["scripts/qa/verify-case-automatable.mjs", "--results", WORKFLOW.matrixDir + "/interact/exec-results.json", "--json", ".zcode/tmp/case-automatable/preflight.json"], timeoutMs: 180000 }, // 该 --results 配对是唯一标题 100% 相等的组合；若该件被清理，门按设计退 2，正确处置是改指另一个标题相等配对，绝不是删旗标
  { name: "工作流干跑预检 dryrun-workflow", args: ["scripts/qa/dryrun-workflow.mjs", "--file", ".zcode/workflows/miniprogram-ui-audit-v38.dwf.ts", "--profile", "all"], timeoutMs: 300000 }, // D9：不带 --file 就是在干跑 v3.3，测不到本文件【E6：本版文件名自指已随版本翻转，与 bash:98 由 verify-gate-list-sync 的两把正则钉死】
  { name: "工作流真实类型检查 tcheck-workflow", args: ["scripts/qa/tcheck-workflow.cjs", "--file", ".zcode/workflows/miniprogram-ui-audit-v38.dwf.ts"], timeoutMs: 300000 }, // 【E7 提升】干跑台把宿主七件套当未解析名字放行 ⇒ 它永远看不见门面返回类型。本门用真实 typescript 程序 + 忠实门面声明跑类型检查，专抓两类实测烧过本文件的缺陷：PromiseLike 上挂 .catch（ask 的返回没有 .catch，守卫必须两参 .then(v,e)）与重复 function 声明（JS 静默让最后一个赢）。它原先只活在 .zcode/tmp/tcheck-v32.cjs（gitignore 的 any-depth tmp/ ⇒ clean checkout 就没了），现进 scripts/qa 并同时进两个载具。 --file 无缺省值：带缺省的 --file 已在本仓两次把预检测错工作流版本（D9 同一形状）
  { name: "降级结论诚实性 verify-degraded-conclusion", args: ["scripts/qa/verify-degraded-conclusion.mjs"], timeoutMs: 180000 }, // D6 的第二条腿：干跑只问"跑到底没有"，这一条问"结论诚实不诚实"，并以 v3.6 为对照自证能红
  { name: "门禁清单两载具一致 verify-gate-list-sync", args: ["scripts/qa/verify-gate-list-sync.cjs"], timeoutMs: 120000 }, // 本清单有 DSL 与 bash 两个载具、各自硬编码，谱系里实测漂移过一整边（一边 15 条、一边 18 步却都自称全清单）⇒ 一致性必须是能红的判据，不能靠人对眼
  { name: "判据台戳 verify-ops-stamp", args: ["scripts/qa/verify-ops-corpus-stamp.mjs", "--check"], timeoutMs: 180000 },
  { name: "ESLint 进门只数 error lint-gate", args: ["scripts/qa/lint-gate.cjs"], timeoutMs: 300000 }, // 裁定 N7：lint 进门、**只计 error**（--quiet 语义），warning 报数而不染色（实测 2026-10-16：errors=2 / warnings=14103 / 650 文件）。显式预算 2 的具名理由写在 lint-gate.cjs 头注释：②③ apps/client/src/env.d.ts 的 JSX 兜底索引签名与运行时注入载荷，把 any 收窄就是改类型面行为，不能赌（本车道无 vue-tsc 全量回归在手）；① other.vue:181 的 if(false) 静态死块已实测修掉，3→2。它只读产品树、不取租约、不写库 ⇒ 属并发道 GATE_SUITE。timeoutMs 实测依据：同一 scope 冷跑 85 s / 热跑 24-26 s ⇒ 300000 ms ≈ 冷跑上界的 3.5 倍（本仓口径：比实测需求小的上限会读成假红，参见上面 band-freshness 那条"实测约需 99 s，180 s 太薄"）
  { name: "等稳纪律棘轮 verify-settle-discipline", args: ["scripts/qa/verify-settle-discipline.mjs"], timeoutMs: 60000 }, // 【E9 补判点】把"判决不许建立在固定 sleep 后单发读上"从散文变成能红的棘轮门：扫 verify-device-leg / r-exec-ws 两载具的 await sleep( 站点，分 guarded / single_read / other / arg_not_literal 四类，single_read 超过基线（实测 7，逐条判读见该文件头注释与 .zcode/tmp/settle-gate-lane-report.md）⇒ exit 1；载具缺失或零站点 ⇒ exit 2（量不到≠达标）。它只读两个脚本、不取租约、不写 DB ⇒ 属并发道 GATE_SUITE。timeoutMs 实测依据：判定跑 148/138/142 ms、--selftest（内含 3 发子进程）375/389/383 ms ⇒ 60000 ms 对最慢形态仍有 ~150 倍余量，且与 bash 侧 `g settle-discipline 60` 齐平
];

// ===== 面板腿（D5：一律 --dry；显式 --report/--metrics 以免轮次号从目录名派生出非数字）=====
/**
 * 【E2 为什么这五把门进 PANEL_SUITE 而不是 GATE_SUITE】
 * GATE_SUITE 在 :Promise.all 里并发跑（本版 v3.8:1005 附近），并发的前提是"这条腿不动别的腿的输入"。
 * 这五把都不满足，逐条实测理由（与 bash 载具把取租约的步骤排在并发段之外是同一条口径，
 * 见 run-final-verify-v33.sh:102-107 那段"为什么两侧不一样"的注释）：
 *   ① verify-admin-auditor / verify-admin-scope / verify-admin-writes / verify-device-leg 都读
 *      SUPER_PASSWORD（scripts/verify-admin-auditor.mjs:26 起内置默认值已在 2026-10-14 口令轮换后删除，
 *      缺它就走 NOT-EVIDENCED 退 2）——并发段里失败原因会被别的腿的输出淹掉；
 *   ② verify-admin-writes.mjs 会写库（--keep-post 之外默认自清理），两条并发写同一张表会互相把
 *      对方的断言判红，这是"读数被跑法影响"的已知形状；
 *   ③ verify-admin-post-detail.mjs 驱动 Chrome（puppeteer），单实例、单窗口，并发即抢窗口；
 *   ④ verify-device-leg.mjs:313 guardUiLease 取的是全局唯一 UI 租约，且写一条真实 post。
 * PANEL_SUITE 在构建之后串行跑（v3.8:1014 的 for-of），正是为这类腿准备的道。
 *
 * 【前置条件不齐时不许"红"，也不许"绿"——要显式 NOT-MEASURED】
 * 每条带 requiresEnv：DSL 拿不到密钥（宿主进程没有，world.run 的子进程也就没有），
 * 所以这里列的是**变量名**，值一个都不写。跑之前由 preflightEnvOnce() 实量在不在，
 * 缺任何一条就不启动这条腿、落一条"未取证"，既不记 PASS 也不记产品 FAIL。
 * 依据是本仓的既有口径（verify-admin-auditor.mjs:43「仪器与环境故障不计入产品 FAIL ⇒ 退 2」）
 * 与"一个无归属的绿比一条缺席的门更坏"这条判据（resultLineOf() :369-372 与 bash 的 g() :49 都按
 * *_RESULT= 归因；五把门的机器行已逐条实核：ADMAUD_RESULT / ADMSCOPE_RESULT / ADMWRITE_RESULT /
 * POSTDETAIL_RESULT / DEVICELEG_RESULT 全部在盘上印得出来，故五把都可注册）。
 */
const PANEL_SUITE: { name: string; args: string[]; timeoutMs: number; requiresEnv?: string[]; note: string }[] = [
  { name: "全量面板 emit-round-report", args: ["scripts/qa/emit-round-report.mjs", "--dry", "--round-dir", WORKFLOW.legacyRoundDir, "--sidecar-dir", ".zcode/tmp/final-verify/panel", "--report", ".zcode/tmp/final-verify/panel/v38-report.md", "--metrics", ".zcode/tmp/final-verify/panel/v38-metrics.json"], timeoutMs: 1800000, note: "D5：带 --dry ⇒ 不取租约、不复跑 G7/G8/G9/probe；可红证明就是 verify-dry-no-lease 那条静态门" },
  { name: "面板后台账复量 verify-ledger-after-panel", args: ["scripts/qa/verify-ledger.mjs", WORKFLOW.matrixDir], timeoutMs: 120000, note: "面板写过台账，必须复量" },
  { name: "面板后状态真值复量 verify-state-truth-after-panel", args: ["scripts/qa/verify-state-truth.mjs", WORKFLOW.legacyRoundDir], timeoutMs: 180000, note: "同上" },
  // —— E2 新增五把：后台/设备侧的实测门（今日实测全绿：ADMAUD pass=17 / ADMSCOPE pass=17 / ADMWRITE pass=15 / POSTDETAIL pass=30）——
  {
    name: "后台审计域 verify-admin-auditor",
    args: ["scripts/verify-admin-auditor.mjs"],
    timeoutMs: 420000,
    requiresEnv: ["SUPER_PASSWORD", "ADMIN_API_BASE", "AUDITOR_PHONE", "AUDITOR_PASSWORD", "CAMPUS_ADMIN_PHONE", "CAMPUS_ADMIN_PASSWORD"],
    note: "读 7 个后台身份做四域权限对照；缺 SUPER_PASSWORD 时门自己退 2（NOT-EVIDENCED，非产品红）。今日实测 ADMAUD_RESULT=PASS pass=17",
  },
  {
    name: "后台数据域范围 verify-admin-scope",
    args: ["scripts/verify-admin-scope.mjs"],
    timeoutMs: 420000,
    requiresEnv: ["SUPER_PASSWORD", "ADMIN_API_BASE"],
    note: "只读：审数据域可见范围。今日实测 ADMSCOPE_RESULT=PASS pass=17",
  },
  {
    name: "后台写路径 verify-admin-writes",
    args: ["scripts/verify-admin-writes.mjs"],
    timeoutMs: 600000,
    requiresEnv: ["SUPER_PASSWORD", "ADMIN_API_BASE", "UPLOAD_TEST_IMAGE"],
    note: "【写库】会真写 DB 行（默认自清理，--keep-post 才留）；因此绝不允许与并发段的门同跑。今日实测 ADMWRITE_RESULT=PASS pass=15",
  },
  {
    name: "后台帖子详情 verify-admin-post-detail",
    args: ["scripts/verify-admin-post-detail.mjs"],
    timeoutMs: 600000,
    requiresEnv: ["ADMIN_LOGIN_USERNAME", "ADMIN_LOGIN_PASSWORD", "ADMIN_BASE_URL"],
    note: "【驱动 Chrome】puppeteer 单实例；且它的缺省 ADMIN_BASE_URL=http://127.0.0.1:5177 而本轮 admin dev server 实测在 5173（该脚本 :20），所以必须显式给 ADMIN_BASE_URL，否则 transport 计数命中、整条腿 NOT-EVIDENCED。今日实测 POSTDETAIL_RESULT=PASS pass=30",
  },
  {
    name: "设备真档腿 verify-device-leg",
    args: ["scripts/verify-device-leg.mjs", "--band", "real"],
    timeoutMs: 1500000,
    requiresEnv: ["SUPER_PASSWORD", "STUDENT_PHONE", "STUDENT_PASSWORD"],
    note: "【取唯一 UI 租约 + 写一条真实 post】见 v3.8 租约资源断言：它默认取 ui-lease.mjs:40 的 \"wechat-automation-cli\"，与本 DSL 的 ui-audit-v38-dsl 不是同一把锁 ⇒ 前置不成立就不启动",
  },
];
/**
 * 【E5-b 生产者同源约束】带宽戳（覆盖门的 band 键）只有一把尺，两个生产者必须写同一个值：
 *   尺：scripts/qa/artifact-band.mjs:14-22 readApiMode() ⇒ sha8 = sha256(在盘产物 config/env.js 字节).slice(0,8)，
 *       band 键的形态 = <mode>@<sha8>（消费侧 verify-real-coverage.mjs:251-252 的"当前尺"就是它，
 *       今天实测 REALCOV_BAND_STAMP=real@f0677920 尺源=bundle:apps/client/dist/build/mp-weixin-real）。
 *   生产者一：scripts/qa/r-exec-cli.mjs:897 `band: (BAND.mode||"?")+"@"+(BAND.sha8||"?")` —— 用的就是上面这把尺。
 *   生产者二：scripts/verify-device-leg.mjs:206-211 —— 本轮实测已被修成 readApiMode(...) 同源（:49 import、
 *       :301-303 BAND_STAMP = `${mode}@${sha8}`），git HEAD 短号被降级为 provenance-only 字段（:226-231）。
 *   为什么这一格必须机器化而不是写在注释里：band 键写错的那条腿会被门摘进 EXPIRED 桶
 *       （verify-real-coverage.mjs:984-995 新鲜度桶），一条 EXPIRED 都不报错、只把 COVERED 减一 ——
 *       两个生产者各写各的 = 设备腿跑得越多、覆盖越少，且红数不涨，没有任何门会因此变红。
 *   DSL 自己也产出 bandStamp（:570 附近），原先用一套**自解析 env.js 的内联正则**、形态是
 *       `<MODE>|<API_MODE>@<sha8>`，与门的 real@sha8 又差一层。本版把它也接到同一把尺上，
 *       并把内联正则留下做**第二读数**，两者不一致就 blocker（生产者漂移当场可闻）。
 */
const BAND_STAMP_RULE = {
  authority: "scripts/qa/artifact-band.mjs:14-22（readApiMode：sha8=sha256(在盘 config/env.js).slice(0,8)，形态 mode@sha8）",
  producers: [
    "scripts/qa/r-exec-cli.mjs:897（行上 band 的写法）",
    "scripts/verify-device-leg.mjs:206-211（本轮已由 sha8-of-HEAD 修为同源；HEAD 短号仅 provenance，见 :226-231）",
  ],
  consumer: "scripts/qa/verify-real-coverage.mjs:251-252（当前尺）与 :984-995（EXPIRED 桶）",
  bundle: "apps/client/dist/build/mp-weixin-real",
};

// ===== 看板 =====
artifact.board("gates", {
  key: "gate",
  status: "status",
  // 【E2】多第四格"未取证"：前置条件不齐（缺密钥 / 缺租约归属）而**没启动**的腿必须与"跑了且红"分家，
  // 否则面板会把"没量到"印成 RED，下一程就会去修一条不存在的红；印成 PASS 更是无归属的绿。
  columns: ["PASS", "RED", "已知红", "未取证"],
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
  /** 【E8-a】覆盖门三只互斥桶（UNCOVERED/VOIDED/EXPIRED）的逐条点名，运行时从门的输出摊 */
  debt: DebtRow[];
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
  /** 清点窗口：full-tree=整页；其余取值一律按截断窗口处理，不得计入"清点齐" */
  censusWindow: string;
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
/**
 * 【E8-a 真档欠账记分板：三只桶都从门自己的点名行摊，一条也不写死】
 * verify-real-coverage.mjs 把"这条用例为什么不算覆盖"分成互斥的桶，各有各的点名行格式：
 *   `  UNCOVERED <suite>|<id> 缺=<轴>`（:1006）—— 从来没在 real 档跑过 / 缺哪根轴
 *   `  VOIDED <key> 台账行=<出处>`（:552）—— 台账判过但判决效力作废，要先拍 needsUser 令牌再重跑
 *   `  EXPIRED <key> 现戳=… 陈旧行戳=… 缺=<轴>`（:994）—— 认领它的 real 腿带的是旧构建戳
 * 三桶各自的总数也都在机器行上：REALCOV_UNCOVERED / REALCOV_VOIDED / REALCOV_EXPIRED。
 * 为什么必须三桶齐（v3.7 只摊了 UNCOVERED）：本轮实测的真档欠账 = 5 欠账 + 4 待判 + 3 过期 = 12 条，
 * 而 round-4 的活恰恰是把这 12 条转成**当前带宽戳上的新行**；只派 UNCOVERED 那 5 条过去，
 * 另外 7 条既不会被跑、也不会变红（EXPIRED/VOIDED 都不进 UNCOVERED 计数，门自己就印了"既不降分母也不并入欠账"），
 * 覆盖门于是永远红着、却永远收不到这 7 条的腿 —— 这就是"派活清单与判绿不同源"的第二个形状。
 * 计数一律现量：写进散文的 12/5/4/3 在任何一车道加长清单那一刻就过期（本仓有这条立规）。
 */
interface DebtRow {
  bucket: "UNCOVERED" | "VOIDED" | "EXPIRED";
  key: string;
  detail: string;
}
function debtRowsOf(out: string): DebtRow[] {
  const rows: DebtRow[] = [];
  for (const line of (out || "").split(/\r?\n/)) {
    const m = /^\s+(UNCOVERED|VOIDED|EXPIRED)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const key = m[2];
    if (key.indexOf("HINT") === 0 || key.indexOf("轴口径") === 0) continue;
    if (rows.some((x) => x.bucket === m[1] && x.key === key)) continue;
    rows.push({ bucket: m[1] as DebtRow["bucket"], key, detail: m[3].slice(0, 240) });
  }
  return rows;
}
function debtTotalOf(g: GateOut): number {
  const n = covNum(g).uncovered;
  const v = numMetric(g.metrics, "REALCOV_VOIDED");
  const e = numMetric(g.metrics, "REALCOV_EXPIRED");
  const pick = (x: number) => (Number.isFinite(x) ? x : 0);
  return pick(n) + pick(v) + pick(e);
}
async function runGate(g: { name: string; args: string[]; timeoutMs: number }): Promise<GateOut> {
  try {
    const r = await world.run(WORKFLOW.nodeBin, g.args, { timeoutMs: g.timeoutMs }); // D1
    const out = (r.stdout || "") + (r.stderr || "");
    return { name: g.name, exitCode: r.exitCode, resultLine: resultLineOf(out), metrics: metricsOf(out), uncovered: uncoveredOf(out), debt: debtRowsOf(out) };
  } catch (e) {
    return { name: g.name, exitCode: -1, resultLine: "命令无法启动: " + String(e), metrics: {}, uncovered: [], debt: [] };
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
/**
 * 清点窗口判据（本轮实测新增的仪器面缺陷）：
 * 上一轮 73 页里有 45 页 NAV_OK 的元素清点来自 `outerWxml 首-view`（只读第一个 view 子树），
 * 5 页 elementCount=0（其中 3 页仍判 NAV_OK），低到不可能的计数成片出现
 * （subpackages/chat/chat-session/index=1、register/success=2、campus/topic/detail=2）。
 * ⇒ 那句"可交互元素清点齐"是在截断窗口上成立的，它没有覆盖页面主体的兄弟节点。
 * 规则：窗口不是 full-tree 的行可以留 NAV_OK（导航确实通了），
 * 但其元素清点不得计入"覆盖齐"的分子；窗口缺失或计数为 0 却报 NAV_OK 的，按仪器故障改判。
 */
function censusFault(row: TourRow): string {
  const win = String(row && row.censusWindow || "").toLowerCase();
  const n = Number(row && row.elementCount);
  if (row && String(row.status) === "NAV_OK") {
    if (Number.isFinite(n) && n === 0) return "NAV_OK 但元素清点=0（页面不可能什么都没有 ⇒ 探针或窗口坏了）";
    if (win === "" || win.indexOf("full") < 0) return "清点窗口非 full-tree（首-view 截断窗口，计数不可计入覆盖分子）";
  }
  return "";
}
/** 只读量一次覆盖门，摊它自己的机器行（D2/D3：派活清单与判绿同源于门自己） */
async function measureCoverage(dir: string, label: string): Promise<GateOut> {
  // 【E1-b】判决效力台账的来源单独一个键，不再随 harvestFrom 走（理由与实测数字写在该键处）
  const ledgerArg = WORKFLOW.coverageLedger;
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
/**
 * 【E5-a 带宽戳改为与两个生产者同一把尺，并机器断言一致】
 * 旧写法（本文件 v3.7:552-557）是一段内联正则自解析 env.js，产出形态是 `<MODE>|<API_MODE>@<sha8>`，
 * 而门的 band 键是 `<mode>@<sha8>`（artifact-band.mjs:22）。同一份字节、两把尺 ⇒
 * DSL 写进 manifest 的 bandStamp 与腿落在行上的 band 永远不可能字面相等，续跑准入只能"看着像"。
 * 本版：主读数直接 import readApiMode（与 r-exec-cli.mjs:897、verify-device-leg.mjs:301-303 同一条码路），
 * 内联正则降级为"第二读数"只做对照；两者的 sha8 不等 ⇒ blocker 并且不采信带宽。
 * 依据出处见 BAND_STAMP_RULE（含两个生产者的 file:line）。
 */
let bandStamp = "unknown";
let bandStampInlineProbe = "MISSING";
{
  const b = await world.run(WORKFLOW.nodeBin, ["--input-type=module", "-e",
    "import { readApiMode } from './scripts/qa/artifact-band.mjs'; const r = readApiMode(process.argv[1]); console.log(r && r.mode && r.sha8 ? (r.mode + '@' + r.sha8) : ('UNREADABLE|mode=' + (r && r.mode) + '|sha8=' + (r && r.sha8)));",
    BAND_STAMP_RULE.bundle], { timeoutMs: 20000 });
  bandStamp = ((b.stdout || "").trim() || "MISSING");
  // 第二读数：沿用 v3.7 那段内联正则的算法，只为对照，不参与任何判定
  const legacy = await world.run(WORKFLOW.nodeBin, ["-e",
    "const f=require('fs'),c=require('crypto');const p=process.argv[1]+'/config/env.js';try{const s=f.readFileSync(p,'utf8');const m=(s.match(/MODE:\"([^\"]*)\"/)||[])[1]||\"nomode\";const a=(s.match(/API_MODE:\"([^\"]*)\"/)||[])[1]||\"na\";console.log(m+'|'+a+'@'+c.createHash('sha256').update(s).digest('hex').slice(0,8))}catch{console.log('MISSING')}",
    BAND_STAMP_RULE.bundle], { timeoutMs: 20000 });
  bandStampInlineProbe = ((legacy.stdout || "").trim() || "MISSING");
}
/** 取 mode@sha8 里的 sha8（两侧都用这把刀，比较的才同一格） */
function sha8Of(stamp: string): string {
  const m = /@([0-9a-f]{8})$/.exec(String(stamp || "").trim());
  return m ? m[1] : "";
}
{
  const a = sha8Of(bandStamp);
  const b2 = sha8Of(bandStampInlineProbe);
  if (a === "") {
    blockers.push(`带宽尺不可读（readApiMode(${BAND_STAMP_RULE.bundle}) 回报 ${bandStamp}）⇒ 本轮 real 档续跑准入没有尺，凡引用 bandStamp 的判定一律降为未取证（尺源见 ${BAND_STAMP_RULE.authority}）`);
  } else if (b2 !== "" && a !== b2) {
    blockers.push(`带宽戳两个生产者不一致：尺源 readApiMode=${bandStamp} 与内联 env.js 探针=${bandStampInlineProbe} 的 sha8 不等 ⇒ 行上 band 与门侧"当前尺"必然错配，覆盖门会把新腿静默摘进 EXPIRED（verify-real-coverage.mjs:984-995：一条 EXPIRED 不报错、只减 COVERED）。先对齐 ${BAND_STAMP_RULE.producers.join(" / ")} 再谈覆盖读数`);
  } else {
    log(`带宽戳生产者同源核对：readApiMode=${bandStamp} 与内联探针=${bandStampInlineProbe} sha8 一致${b2 === "" ? "（内联探针没读到，只单尺量）" : ""}`);
  }
}
log(`续跑尺：HEAD=${head} 判据台戳=${opsStamp} real 带宽=${bandStamp}（尺源=${BAND_STAMP_RULE.authority}）`);

// —— D8：收割上一轮产物；件名两种历史形态都要能吃下（数组 / {round,rows}） ——
const harvested = await readJson<unknown>(WORKFLOW.harvestFrom + "/dsl-run-manifest.json");
/**
 * 【E1-c 收割来的账本必须把身份字段改成本轮，否则它一开局就是 STALE 的】
 * v3.7 直接把 harvestFrom 里那份 manifest 对象当本轮账本用（只补 inputs/rounds），
 * 于是本轮写出的 dsl-run-manifest.json 里的 closureDir/harvestFrom/version
 * 说的还是上一轮的那三个值 —— 而任务里点到的正是这份件的另一面：
 * reports/audit/ui-audit-2026-10-13/dsl-run-manifest.json 现在写着 report=pending，
 * 而它之后还有车道落过件（即"账本落后于产物"）。账本一开局就带着旧身份，
 * 续跑者读它会以为本轮的落点还是 10-13。
 * 处置：只继承 rounds（那是历史事实），身份三件套与 headAtStart 一律按本轮重写，
 * 并把"继承自哪一份件"留成 harvestNote 里的可追溯线索。
 */
let manifest: Manifest = (harvested && typeof harvested === "object")
  ? (harvested as Manifest)
  : {
      version: WORKFLOW.version, headAtStart: head, headNow: head,
      closureDir: WORKFLOW.closureDir, harvestFrom: WORKFLOW.harvestFrom,
      inputs: { opsStamp, bandStamp }, rounds: {}, gates: "pending", admission: "pending", report: "pending",
      notes: "本轮新建账本；harvest 见 rounds 内的 done-harvest 标记",
    };
/**
 * 【E1-c 续】继承来的账本只保留 rounds（历史事实），身份字段一律改成本轮的。
 * 上一份件的 closureDir/harvestFrom/version 若原样留着，本轮写出的账本一开局就在说上一轮 ——
 * 而本轮 closureDir 是新的空目录，续跑者按账本去找 10-13 的产物就会找到旧读数。
 */
{
  const inherited = manifest.closureDir !== WORKFLOW.closureDir || manifest.version !== WORKFLOW.version;
  const priorClosure = manifest.closureDir;
  const priorReport = manifest.report;
  manifest.version = WORKFLOW.version;
  manifest.closureDir = WORKFLOW.closureDir;
  manifest.harvestFrom = WORKFLOW.harvestFrom;
  manifest.headAtStart = head;
  manifest.headNow = head;
  // 上一轮的 report 字段不作数：那条值描述的是上一轮的相位，本轮的 report 由本轮 E3 位置重写
  manifest.report = "pending";
  manifest.notes = `v${WORKFLOW.version} 本轮账本；rounds 继承自 ${priorClosure || "(无)"}` +
    (inherited ? `（身份字段已按本轮重写；继承件自报 version=${manifest.version} 的上一格 report=${priorReport || "无"}，属历史，不作本轮判据）` : "");
  if (inherited) log(`收割账本身份字段已改指本轮：closureDir ${priorClosure || "(无)"} → ${WORKFLOW.closureDir}，report=${priorReport || "(无)"} → pending（本轮跑完 E3 位置才落 done/failed）`);
}

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

/**
 * 【E8-b 收割账本必须被盘上的件复核，不许自报"已完成"就直接免跑设备腿】
 * 实测事实：v3.7 那一轮不是 DSL 真跑的（harvestFrom/dsl-run-manifest.json 自己写着
 * "drivenBy":"cli-session-subagents"、"DWF 编排运行时在本会话够不到"），它的 manifest 只登记了
 * lane 的 markdown 与 rounds 的自报状态，而 10-13 目录里实测**没有** tour-round*.json /
 * audit-round*.json / sort-round*.json / tour-ledger.json（只有 14 份 *-lane.md、rows/、frames/、
 * decisions-v37.md、open-items-v37.json）。而 D8 的复用判据读的是 rd.tour === "done-harvest" ——
 * seedRound 只补空位、不会覆盖既有值，于是这份自报会把 round-1..3 全部免跑，
 * 巡检腿一条新行都不产生却照样"已完成"，而本轮 closureDir 是空的。
 * 更巧的是任务里已经点过同一件的另一面：那份 manifest 的 report=pending 与后来车道的落盘互相打脸
 * （STALE）。所以本版不信自报状态，只信"件在不在盘上"：不在就降级成 pending 并留痕，
 * 降级条数进终报，不靠注释提醒。
 */
{
  let demoted = 0;
  const demoteLog: string[] = [];
  let checkedCells = 0;
  const legFileNames = (leg: string, n: number): string[] =>
    leg === "tour" ? [`tour-round${n}.json`, `dsl-tour-cumulative-round${n}.json`]
      : leg === "audit" ? [`audit-round${n}.json`, `dsl-audit-round${n}.json`]
        : leg === "sort" ? [`sort-round${n}.json`, `dsl-sort-round${n}.json`]
          : [`fix-round${n}.json`, `dsl-fix-round${n}.json`];
  for (let n = 1; n <= WORKFLOW.maxRounds; n++) {
    const rd = manifest.rounds[String(n)];
    if (!rd) continue;
    for (const leg of ["tour", "audit", "sort", "fix"] as Array<keyof ManifestRound>) {
      const cell = rd as unknown as Record<string, string>;
      const claimed = String(cell[leg] || "");
      if (claimed !== "done-harvest" && claimed !== "done") continue;
      checkedCells++;
      const names = legFileNames(leg, n);
      let onDisk = false;
      for (const dir of [WORKFLOW.closureDir, WORKFLOW.harvestFrom]) {
        for (const f of names) {
          const j = await readJson<unknown>(dir + "/" + f);
          const arr = Array.isArray(j) ? j : (j && typeof j === "object" && Array.isArray((j as { rows?: unknown[]; executable?: unknown[] }).rows)
            ? (j as { rows: unknown[] }).rows
            : (j && typeof j === "object" && Array.isArray((j as { executable?: unknown[] }).executable) ? (j as { executable: unknown[] }).executable : null));
          const nonEmpty = j !== null && (arr === null ? Object.keys(j as object).length > 0 : arr.length > 0);
          if (nonEmpty) { onDisk = true; break; }
        }
        if (onDisk) break;
      }
      if (!onDisk) {
        cell[leg] = "pending";
        demoted++;
        demoteLog.push(`round${n}.${leg} 自称 ${claimed}，但 ${names.join(" / ")} 在 ${WORKFLOW.closureDir} 与 ${WORKFLOW.harvestFrom} 两处都读不到（或读到空件）`);
      }
    }
  }
  if (demoted > 0) {
    log(`收割账本复核：${demoted} 格自报状态被降级为 pending —— ${demoteLog.join("；").slice(0, 900)}`);
    blockers.push(`收割账本有 ${demoted}/${checkedCells} 格自报"已完成"却在盘上读不到对应产物（上一轮由 CLI 会话手工派发、按 lane 记账，未落 DSL 的 tour-round/dsl- 件名）⇒ 本版不按自报状态免跑设备腿，这些相位重跑；续跑准入只认件，不认账本`);
  } else {
    log(`收割账本复核：自报状态与盘上产物逐格对上（核对 ${checkedCells} 格），无降级`);
  }
  await persistJson(WORKFLOW.closureDir + "/dsl-harvest-audit.json", {
    checked: checkedCells, demoted, demoteLog,
    rule: "复用判据的第二把尺：件必须在盘上读得到且非空；manifest 的自报状态只是候选",
  });
}

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
/**
 * 【E8-c 真档欠账记分板（运行时派生，round-4 的派活清单）】
 * 三条桶的逐条点名 + 三个总数全部现量，本轮实测值只作为"注释里的今天"，不进任何判据：
 *   今天实测 REALCOV_CONSERVATION=OK 免检=28 + 覆盖=196 + 欠账=5 + 待判=4 + 过期=3 = 236／236，
 *   即待转化的是 5+4+3=12 条，band 尺 = REALCOV_BAND_STAMP=real@f0677920（尺源=bundle）。
 * round-4 要做的就是把这三桶里的每一条转成**当前带戳上的新行**；记分板就是这三桶的实时点名。
 */
const realcovDebt = {
  rows: covBase.debt,
  scoreboard: {
    uncovered: covNumH.uncovered,
    voided: numMetric(covBase.metrics, "REALCOV_VOIDED"),
    expired: numMetric(covBase.metrics, "REALCOV_EXPIRED"),
    total: debtTotalOf(covBase),
    required: covNumH.required,
    bandStampFromGate: (covBase.metrics["REALCOV_BAND_STAMP"] || "").split(" ")[0],
    freshness: covBase.metrics["REALCOV_FRESHNESS"] || "",
    conservation: covBase.metrics["REALCOV_CONSERVATION"] || "",
  },
  /** 桶名 → 该桶的处置（词表照门自己印的，不自造第五种说法） */
  actionOf: (bucket: string): string =>
    bucket === "UNCOVERED" ? "缺哪根轴补哪条真实腿（login / login+guest），禁改标签、禁把 mock 行改成 real 凑数"
      : bucket === "VOIDED" ? "先拍台账点名的 needsUser 令牌、再重跑那条腿并在台账行上声明 coverageEffect:\"revalidated\"，否则门不会把它放回 COVERED"
        : "在当前 real 产物（当前带戳）上把这条用例重拍一遍：旧构建戳的行继续顶 COVERED 就是陈旧证据",
};
log(`真档欠账记分板（派生）：UNCOVERED=${realcovDebt.scoreboard.uncovered} VOIDED=${realcovDebt.scoreboard.voided} EXPIRED=${realcovDebt.scoreboard.expired} 合计=${realcovDebt.scoreboard.total}／分母 ${realcovDebt.scoreboard.required}；点名行数=${realcovDebt.rows.length}；门侧带戳=${realcovDebt.scoreboard.bandStampFromGate || "(未回显)"}（DSL 侧=${bandStamp}）`);
/**
 * 【E5-c DSL 的尺与门的尺必须同一枚】
 * 上面断言的是"两个生产者同源"，这里断言的是"消费者回显的也是同一枚 sha8"。
 * 不等只有两种解释：产物在两次测量之间被 rebuild 过（那就重烧带宽、复跑 verify-band-freshness），
 * 或者门被 --band-stamp 之类的旗标喂了别的值（verify-real-coverage.mjs:248 有这一条旁路）。
 * 两种都不许在"以为同源"的状态下继续跑 round-4 —— 那正是 12 条欠账跑完仍判不闭的形状。
 */
if (realcovDebt.scoreboard.bandStampFromGate && sha8Of(realcovDebt.scoreboard.bandStampFromGate) !== sha8Of(bandStamp)) {
  blockers.push(`DSL 算出的 real 带宽=${bandStamp} 与覆盖门回显的当前尺=${realcovDebt.scoreboard.bandStampFromGate} 不是同一枚 sha8 ⇒ 本轮新腿落的 band 与门比的尺对不上，补齐后 round-4 的每一条都会落进 EXPIRED；先复跑 verify-band-freshness 与 ws-channel-up 的 WS_UP_BAND_RESULT=match 再继续`);
}
/**
 * 【E1-b 判决效力台账的存在性断言】--ledger 指到一个不存在的件，门不会说"台账没了"就完事：
 * 它把待判桶读成 0，于是那几条 VOIDED 被静默放回 COVERED（实测 196→200）。
 * 所以这里实量一次，读不到就 blocker，绝不沿用 harvestFrom 拼路径。
 */
{
  const ledgerProbe = await world.run(WORKFLOW.nodeBin, ["-e",
    "const f=require('fs');const p=process.argv[1];console.log('LEDGERFILE=' + (f.existsSync(p) ? 'EXISTS size=' + f.statSync(p).size : 'ABSENT'));",
    WORKFLOW.coverageLedger], { timeoutMs: 20000 });
  const lstat = ((ledgerProbe.stdout || "") + (ledgerProbe.stderr || "")).trim();
  log(`判决效力台账预检：${WORKFLOW.coverageLedger} ⇒ ${lstat || "未回显"}`);
  if (lstat.indexOf("EXISTS") < 0) {
    blockers.push(`覆盖门的判决效力台账读不到（${WORKFLOW.coverageLedger} → ${lstat || "无回显"}）⇒ 待判桶会被门读成"没有可核对的作废行"、进而把作废的判决顶回 COVERED（verify-real-coverage.mjs:120-122 显式 --ledger 指空路径即以本门名字判红）。本轮不擅自换路径：换指哪一本要拍板`);
  }
  await persistJson(WORKFLOW.closureDir + "/dsl-coverage-ledger-probe.json", {
    ledger: WORKFLOW.coverageLedger, probe: lstat,
    whyNotHarvestFrom: "harvestFrom(=v3.7 closureDir) 目录里没有 tour-ledger.json：那一轮由 CLI 会话按 lane 记账。实测把 --ledger 指过去 ⇒ VOIDED_LEDGER=FAIL 且 COVERED 由 196 洗成 200",
  });
}
await persistJson(WORKFLOW.closureDir + "/dsl-realcov-debt.json", realcovDebt);

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
await persistJson(WORKFLOW.closureDir + "/dsl-setup-v38.json", { wsUp: setup.wsUp, port: setup.port, band: setup.band, bandMatch: setup.bandMatch === true, routeCount: routes.length, head, branch, backendUp, bandStamp, bandStampInlineProbe, bandStampRule: BAND_STAMP_RULE, opsStamp, interpreter: nodeVersion, legMirrorLine, coverage: { judgeDir: covNumH, opsAltReadonly: covNumL }, uiLeaseResource: UI_LEASE_RESOURCE });
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
/** 收割件里的元素清点有多少来自截断窗口：先量出来再说，不沿用上一轮的"清点齐" */
{
  const ok = allTourRows.filter((x) => (x.status || "").indexOf("NAV_OK") === 0);
  const truncated = ok.filter((x) => !String(x.censusWindow || "").toLowerCase().includes("full")).length;
  const zeroed = ok.filter((x) => Number(x.elementCount) === 0).length;
  log(`收割件清点窗口审计：NAV_OK=${ok.length} 行，其中窗口非 full-tree=${truncated}、elementCount=0=${zeroed}`);
  if (truncated > 0 || zeroed > 0) {
    blockers.push(`收割件的元素清点有 ${truncated} 行来自截断窗口、${zeroed} 行为 0 计数（上一轮实测 45/73 页只读了 outerWxml 首-view，另有 3 页 NAV_OK 却 0 元素）⇒「可交互元素清点齐」在收割件上不成立，本轮该轴只认 censusWindow=full-tree 的新行`);
  }
}
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
  /**
   * 【E8-g round-4 的相位梯】v3.7 的梯子只有 round1 全量批 + round>1 回归批两级，
   * maxRounds 从 3 改成 4 不给新级的话，第 4 轮就是"再跑一次回归"而已。
   * 本版把最后一轮显式命名为真档欠账清零轮：输入是覆盖门三桶的实时点名（不是路由全集），
   * 收割侧只读 harvestFrom，新行一律落 execDir/exec-v38-*。
   */
  if (round === WORKFLOW.maxRounds) phase(`真档欠账清零轮（第 ${round}/${WORKFLOW.maxRounds} 轮）`);
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
          `逐页执行，采集面严格按这张通道表（deliverable=no 的通道直接记 NOT_SHOOTABLE 并把 note 原文抄进 notes，禁止假装采到；deliverable=partial 的只能按 note 写明的口径用，不得升格成更强的主张）：${JSON.stringify(CAPTURE_CHANNELS)}`,
          `【动作归因是硬要求】每次 tap 要回显命中的具体节点选择器与它的绑定来源（@tap / role=button / handler 名）。命中到自身无事件绑定的容器时，记 不可达(无绑定容器) 且**不得**算作一次动作样本——历史上 [class*=card] 就打中过无绑定的 .campus-cards / .campus-guide，applied=true、路由不变、console clean 三样齐全却什么都没发生，那种"无失败"是空读数。弹层类状态要用页专用选择器，并以节点挂载断言判状态迁移，不得用两帧字节等值判"状态无差异"（弹层根常是 v-if 且点遮罩即关，抽测序列会自取消）。`,
          `【护栏】支付/VIP 拉起只验封存态（404/403「支付未开通」=预期通过）；删除/解绑/同意类一律记 SKIP(guard)；真实档写操作除覆盖门点名页外一律不做。`,
          `覆盖门点名欠账（本轮要按门自己的期待格式补 login/login+guest 真实腿，缺哪根轴补哪条腿；绝不允许把 mock 行改标 real 来「补数」）：${JSON.stringify(realcovItems).slice(0, 6000)}`,
          `【E8】另两只桶也要出现在你这批的视野里（门把它们的行从 COVERED 摘出去却不并进 UNCOVERED，只按上面那串补就会漏掉大半）：VOIDED/EXPIRED 的逐条点名=${JSON.stringify(lastCov.debt).slice(0, 4000)}；EXPIRED 的处置是在当前带戳（${bandStamp}）重拍，VOIDED 的处置是先拍待裁令牌再重跑，两者都不能靠改标签或改 band 蒙过去。`,
          `【E8】同时带上另两只桶一起派：UNCOVERED 之外的 VOIDED/EXPIRED 也计在"真档欠账"里（门把它们从 COVERED 摘出却不并进 UNCOVERED，只看 UNCOVERED 会漏掉大半张记分板）。本轮三桶逐条点名（现量，条数不写死）：${JSON.stringify(lastCov.debt).slice(0, 6000)}`,
          `【增量落盘是硬要求】开工先写 ${WORKFLOW.closureDir}/agent-tour-round${round}-b${batchNo}.md 骨架，每完成一页立刻补那一行；本批结束把 rows 返回（route/status(NAV_OK|NAV_FAIL|SKIP(guard)|NOT_SHOOTABLE)/screenshot/elementCount/censusWindow(full-tree 或 首-view，按实际读的窗口如实写，不许为了好看写 full-tree)/keyElements/consoleErrors/actions/band/notes），band 写 mode@sha8。dispatched 要填本批真实 dispatch 出去的动作数——0 就是 0，别为了好看编数。`,
          `【正向对照先于任何"选不到"】开工第一件事：挑一个磁盘上确认存在的 selector，证明通道能选中、能动作、且状态按源码语义翻一个方向而路由不变（例：PRESENT(2)→ABSENT）。没过这条对照，后面所有"选不到"一律记 UNVERIFIED-INSTRUMENT，不得记产品缺陷。`,
          `【首读不可信是实测事实】刚拿到 WS_UP=OK 之后的**第一次** page.$ 会把已经渲染的节点答成 null（同一秒内置探针八条全 0，复查询则 $=HIT、count=1）。所以任何选择器至少要查两次才允许下"不存在"的结论；"未渲染"与"没读到"必须靠复查区分，不得用一次 MISS 造一条缺陷。`,
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
        const fault = censusFault(row);
        if (fault && (row.status || "").indexOf("NAV_OK") === 0) {
          log(`清点判据命中：${row.route} ⇒ ${fault}`);
          blockers.push(`${row.route}：${fault}；该行导航可留证，但元素清点不得计入「清点齐」的分子`);
        }
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
  /**
   * 【E5-d + E8-d：realcovClosed 的第二把尺 —— 行上的 band 必须是当前带戳】
   * v3.7 只认门的退出码。可覆盖门还有 EXPIRED 这只桶：旧构建戳的行会被摘出 COVERED 却不并进 UNCOVERED
   * （verify-real-coverage.mjs:993 自己写的"既不降分母也不并入欠账"），
   * 于是存在一个"exit=0 但本轮 real 证据其实一条都没在当前带上"的形状 —— 尤其当尺取不到时
   * （REALCOV_FRESHNESS=UNMEASURABLE，:991 明写"一条不摘"），旧行全部退回 COVERED、门照样绿。
   * 本版：exit=0 且 新鲜度=MEASURED 且 三桶皆空 且 门回显的当前尺与 DSL 的 bandStamp 同枚 sha8，
   * 四个条件齐了才叫 realcovClosed。缺任何一个都是"未闭/未证"，绝不因为"门绿了"就宣布覆盖闭。
   */
  const freshnessState = lastCov.metrics["REALCOV_FRESHNESS"] || "UNMEASURABLE";
  const gateBand = (lastCov.metrics["REALCOV_BAND_STAMP"] || "").trim().split(/\s+/)[0] || "";
  const debtNow = lastCov.debt;
  const debtTotalNow = debtTotalOf(lastCov);
  const bandAgrees = sha8Of(gateBand) !== "" && sha8Of(gateBand) === sha8Of(bandStamp);
  realcovClosed = lastCov.exitCode === 0 && freshnessState === "MEASURED" && debtTotalNow === 0 && bandAgrees;
  log(`覆盖门复量：exit=${lastCov.exitCode} COVERED=${lastCovNum.covered} UNCOVERED=${lastCovNum.uncovered}/${lastCovNum.required} VOIDED=${numMetric(lastCov.metrics, "REALCOV_VOIDED")} EXPIRED=${numMetric(lastCov.metrics, "REALCOV_EXPIRED")} 三桶合计=${debtTotalNow} 新鲜度=${freshnessState} 门尺=${gateBand || "(未回显)"} 与 DSL 尺同枚=${bandAgrees ? "是" : "否"} ⇒ realcovClosed=${realcovClosed ? "真" : "未闭/未证"}`);
  if (lastCov.exitCode === 0 && !realcovClosed) {
    blockers.push(`覆盖门自己判绿（exit=0）但 realcovClosed 仍为假（新鲜度=${freshnessState}、三桶合计=${debtTotalNow}、门尺与 DSL 尺同枚=${bandAgrees ? "是" : "否"}）⇒ 这一格绿不能当覆盖闭用：尺取不到时旧构建戳的行会退回 COVERED（:991 一条不摘），那是"没比"不是"比过了"`);
  }

  openItems = executable.length;
  if (executable.length === 0 && needsUser.length === 0 && navFail === 0 && !auditDegraded && realcovClosed) {
    log(`第 ${round} 轮零新增缺陷、无失败页且覆盖已闭，提前收工`);
    break;
  }
  /**
   * 【E8-e round-4 的入口条件：欠账没清零就不许因为"分拣空了"而提前散场】
   * v3.7 那句 `executable.length === 0 && !auditDegraded ⇒ break` 会让"本轮没有代码要修"直接结束整场循环，
   * 而真档欠账从来就不是代码修复项（它归 area=覆盖补腿，且大量条目挂在待拍板与陈旧戳上）。
   * 后果：round-4 根本进不去，12 条 real-mode 债还是 12 条，maxRounds 调到 4 也白调。
   * 本版把派活的清单换成门自己点名的三桶（UNCOVERED/VOIDED/EXPIRED，运行时现量，一个数也不写死）：
   * 只要三桶还有东西，最后两轮就继续派腿，且明确禁止为凑数改标签。
   */
  if (executable.length === 0 && !auditDegraded && debtTotalNow === 0) {
    log(`第 ${round} 轮无可执行缺陷且真档欠账已清（剩 ${needsUser.length} 项待拍板）`);
    break;
  }
  if (executable.length === 0 && !auditDegraded && debtTotalNow > 0) {
    log(`第 ${round} 轮分拣没有代码修复项，但真档欠账三桶合计=${debtTotalNow}（UNCOVERED=${lastCovNum.uncovered} VOIDED=${numMetric(lastCov.metrics, "REALCOV_VOIDED")} EXPIRED=${numMetric(lastCov.metrics, "REALCOV_EXPIRED")}）⇒ 循环不提前收，按门点名的三桶继续派腿${round === WORKFLOW.maxRounds ? "（本轮即最后一轮：真档清零轮）" : ""}`);
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
  /**
   * 【E8-f 最后一轮：真档欠账清零轮（round-4）的派活清单】
   * 清单不写死条数，也不只派 UNCOVERED —— v3.7 派的是 covLegItems（分拣给的"覆盖补腿"项）
   * 与 realcovItems（只有 UNCOVERED 一只桶）。今天实测三桶合计 12 条（5 欠账 + 4 待判 + 3 过期），
   * 门印的是 5/4/3，本文件与任何 prompt 都不把这三个数字抄进去（本仓立规：写进散文的计数
   * 在任何一车道加长清单那一刻就过期）。这里把三桶的逐条点名连同各自的处置词一起交给执行腿，
   * 让它按桶下刀：欠账补腿、待判先拍令牌再重跑、过期在当前带上重拍。
   */
  const debtLegs = debtNow.map((d) => ({ ...d, action: realcovDebt.actionOf(d.bucket) }));
  const legTargets: string[] = [...covLegItems.map((i) => i.id), ...debtLegs.map((d) => d.key)];
  if (legTargets.length > 0 && setup.wsUp) {
    const legs = await ui.ask<TourOut>(
      [
        `覆盖补腿批（第 ${round} 轮${round === WORKFLOW.maxRounds ? "＝真档欠账清零轮" : ""}）：分拣给的补腿项 ${JSON.stringify(covLegItems).slice(0, 6000)}`,
        `【记分板=门自己点名的三桶，逐条现量，不要引用任何文档里写死的条数或 ID 串】${JSON.stringify(debtLegs).slice(0, 9000)}`,
        `覆盖门实时点名与轴口径（照抄门的期待格式，缺哪根轴补哪条腿）：${JSON.stringify(realcovItems).slice(0, 4000)}`,
        `当前带宽尺=${bandStamp}（尺源 ${BAND_STAMP_RULE.authority}；门回显的当前尺见 REALCOV_BAND_STAMP）。行上 band 必须是 <mode>@<sha8> 这一形态且 sha8 等于当前尺 —— 用 git HEAD 短号当 band 键是本轮抓到过的第二个生产者漂移（scripts/verify-device-leg.mjs:206-211 原先就这么写，现已修为 readApiMode 同源，HEAD 短号降级为 provenance-only：该文件 :226-231），它会让每一条新腿被静默摘进 EXPIRED：不报错、只减 COVERED。`,
        `逐条补真实腿（login 或 login+guest）：真实登录态用 dev-user 演示入口或 r-exec 既有 login op 铸造，禁编造；结果件写 ${WORKFLOW.execDir}/exec-v38-<点名>/exec-results.json（本轮新腿一律 exec-v38- 前缀，只新增不改任何历史件；覆盖门的 --dir 就是这个目录），每行必须带 band=mode@sha8 与 sessionSource/loginVerify（无身份/无带宽的行门不认，不得靠改标签凑覆盖）。`,
        `【三条不许走的路】① 把 mock 行改标 real 或改 band 来"补数"；② 把 VOIDED 桶的点名字从台账里删掉让它退回 COVERED（门认的是台账行上的 coverageEffect:"revalidated"，prose 洗不成绿，见 REALCOV_VOIDED_HINT）；③ 用 EXPIRED 之外的说法解释陈旧证据 —— 重拍是唯一出路。`,
        `【点样重跑】上一轮的腿是在本次 rebuild 之前拍的，带宽戳只识别 config 不识别构建；除欠账外再从既有真档页里挑若干页在当前带宽重拍，notes 写 attests=current。`,
        `【正向对照先于任何"选不到"】与首读不可信同旧：没过正对照，后面所有"选不到"一律记 UNVERIFIED-INSTRUMENT，不得记产品缺陷；解析不到目标也是 UNVERIFIED-INSTRUMENT，不是 FAILED。`,
      ].join("\n"),
    ).then((v) => v, (e) => askFail<TourOut>("UI巡检执行员", e, { round, rows: [], evidence: [], dispatched: -1, notes: "补腿 ask 失败：" + String(e).slice(0, 80) }));
    const legRows = Array.isArray(legs.rows) ? legs.rows : [];
    for (const row of legRows) {
      if (!row || typeof row.route !== "string") continue;
      const idx = allTourRows.findIndex((x) => x.route === row.route);
      if (idx >= 0) allTourRows[idx] = row; else allTourRows.push(row);
    }
    await persistJson(WORKFLOW.closureDir + `/dsl-cov-legs-round${round}.json`, { covLegItems, debtLegs, legTargets, legRows, rulingBlocked: rulingBlocked.map((x) => x.id), evidence: legs.evidence ?? [], dispatched: legs.dispatched, bandStampAtDispatch: bandStamp });
    log(`覆盖补腿：${legRows.length} 行（dispatched=${String(legs.dispatched)}，派活合流=分拣补腿 ${covLegItems.length} + 门点名三桶 ${debtLegs.length}）`);
  } else if (legTargets.length > 0) {
    blockers.push(`覆盖补腿 ${legTargets.length} 条未执行：WS 通道未就绪（通道没起来时这三桶一条也转不成当前带戳的新行，欠账只能原样留给下一轮，不许当已清）`);
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
  const wantLedger = WORKFLOW.coverageLedger;
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

/**
 * 【E2-a 前置条件实量】只问"变量在不在"，一个值也不打印 ——
 * 值一进 log 就进了证据件与终报，这正是本文件要防的那类外泄（同一轮里 E4 的暂存区密钥门是它的兜底）。
 * 探不到就一律按"缺"处理（fail-closed）：本仓口径是"量不到的东西必须响亮地失败，不许空转判绿"。
 */
async function preflightEnv(names: string[]): Promise<{ present: string[]; missing: string[]; echoed: boolean }> {
  const uniq = [...new Set(names)];
  if (uniq.length === 0) return { present: [], missing: [], echoed: false };
  const r = await world.run(WORKFLOW.nodeBin, ["-e",
    "const k=process.argv.slice(1);const has=(x)=>{const v=process.env[x];return v!==undefined&&v!==''};const p=k.filter(has);const m=k.filter((x)=>p.indexOf(x)<0);console.log('ENVPRESENT='+p.join(','));console.log('ENVMISSING='+m.join(','));",
    ...uniq], { timeoutMs: 20000 });
  const out = (r.stdout || "") + (r.stderr || "");
  const pm = /^ENVPRESENT=(.*)$/m.exec(out);
  const mm = /^ENVMISSING=(.*)$/m.exec(out);
  if (!pm || !mm) return { present: [], missing: uniq, echoed: false };
  const present = pm[1].split(",").map((s) => s.trim()).filter(Boolean);
  return { present, missing: uniq.filter((x) => present.indexOf(x) < 0), echoed: true };
}
/**
 * 【E2-b 单写者锁的归属核对，不许只写在散文里】
 * verify-device-leg.mjs:313 调 guardUiLease()，而资源名来自 ui-lease.mjs:40
 *   `process.env.QA_UI_RESOURCE || "wechat-automation-cli"` —— 与本 DSL 的锁名默认不同一把。
 * 不同一把的后果不是"抢不到锁"，恰恰相反：两条腿各自都以为自己独占，同时驱动同一个 DevTools 实例
 * ——本仓 round-7 实测过那起事故（一次并发把 214 行测量打成 58+41 行作废，记在 ui-lease.mjs:42-55）。
 * 所以这里实测 QA_UI_RESOURCE 的**值**（它不是密钥，可以回显）是否等于 DSL 声明的资源名；
 * 不等就这一条腿不启动，落"未取证"，并 blocker 说明怎么对齐（上一轮就是这么对齐的：
 * reports/audit/ui-audit-2026-10-13/relegs-lane.md:14 显式写了 QA_UI_RESOURCE=ui-audit-v37）。
 */
async function probeUiLeaseResource(): Promise<string> {
  const r = await world.run(WORKFLOW.nodeBin, ["-e",
    "console.log('UIRES=' + (process.env.QA_UI_RESOURCE || '(unset⇒ui-lease.mjs:40 缺省 wechat-automation-cli)'));"], { timeoutMs: 20000 });
  const m = /^UIRES=(.*)$/m.exec((r.stdout || "") + (r.stderr || ""));
  return m ? m[1].trim() : "(探不到)";
}
const panelOuts: GateOut[] = [];
/** 【E2-c】没启动的腿记在这里：终报与 summary 都要能区分"跑了且红"与"前置不齐所以没跑" */
const panelNotMeasured: { name: string; why: string }[] = [];
{
  const requiredAll: string[] = [];
  for (const g of PANEL_SUITE) for (const k of g.requiresEnv || []) if (requiredAll.indexOf(k) < 0) requiredAll.push(k);
  const envPre = await preflightEnv(requiredAll);
  const uiRes = await probeUiLeaseResource();
  log(`面板腿前置实量：需检查环境变量 ${requiredAll.length} 个，在=${envPre.present.length}，缺=${envPre.missing.length}（${envPre.missing.join("、") || "无"}）；UI 租约资源名=${uiRes}，DSL 声明=${UI_LEASE_RESOURCE}`);
  if (!envPre.echoed) blockers.push("环境变量预探测没有回显 ENVPRESENT/ENVMISSING ⇒ 前置无法判定，本轮凡是依赖密钥的面板腿一律按未取证处理（不猜、不判绿）");
  for (const g of PANEL_SUITE) {
    const lack = (g.requiresEnv || []).filter((k) => envPre.missing.indexOf(k) >= 0);
    const leaseMismatch = (g.args.indexOf("scripts/verify-device-leg.mjs") >= 0) && uiRes !== UI_LEASE_RESOURCE;
    if (lack.length > 0 || leaseMismatch) {
      const why = leaseMismatch
        ? `租约归属不同一把锁：QA_UI_RESOURCE=${uiRes} ≠ DSL 的 ${UI_LEASE_RESOURCE} ⇒ 这条腿会与 UI 巡检车道同时驱动同一个 DevTools（不是抢锁，是双写），前置不成立就不跑`
        : `缺前置环境变量 ${lack.join("、")}（值不回显；这些腿的门自己在缺值时退 2=NOT-EVIDENCED，本 DSL 连启动都不启动，免得把"没量到"记成红）`;
      panelNotMeasured.push({ name: g.name, why });
      report({ gate: g.name, status: "未取证", detail: why }, "gates");
      blockers.push(`面板腿未取证：${g.name} —— ${why}`);
      log(`跳过面板腿 ${g.name}：前置不齐（不计红、不计绿）`);
      continue;
    }
    const o = await runGate(g);
    gateToBoard(o);
    panelOuts.push(o);
    if (o.exitCode !== 0) blockers.push(`面板腿红：${o.name}（${o.resultLine}）`);
  }
}
const stillRed = gateOuts.filter((g) => g.exitCode !== 0 && WORKFLOW.acceptedReds.indexOf(g.name) < 0).map((g) => g.name);
const knownRed = gateOuts.filter((g) => g.exitCode !== 0 && WORKFLOW.acceptedReds.indexOf(g.name) >= 0).map((g) => g.name);
if (knownRed.length > 0 && redProbe.exitCode === 0) log(`已知已裁红（不计入本轮新增问题，红探针已证实其仍可判红）：${knownRed.join("、")}`);
else if (knownRed.length > 0) blockers.push("有红项落在 acceptedReds 白名单内，但红探针自检未通过 ⇒ 白名单依据不成立，先证明门还能红");

await persistJson(WORKFLOW.closureDir + "/dsl-gate-recheck-v38.json", {
  gates: gateOuts, stillRed, knownRed, acceptedReds: WORKFLOW.acceptedReds, redProbe, panelOuts,
  panelNotMeasured, panelPreconditions: PANEL_SUITE.map((g) => ({ name: g.name, requiresEnv: g.requiresEnv || [], note: g.note })),
  coverage: { judgeDir: realcovNum, judgeDirName: WORKFLOW.execDir, readonlyCompare: covHistoryNum },
  tourRows: allTourRows.length, roundsDone, realcovClosed, openItems, gatesTrusted,
});

// —— D4：DSL 自己产出报告要读的那份读数件，否则 §7 会印上一轮留在盘上的旧 summary ——
const gateExitMap: Record<string, number> = {};
for (const g of gateOuts) gateExitMap[g.name] = g.exitCode;
log(`门禁复量：GATE_SUITE ${GATE_SUITE.length} 条实测，仍红 ${stillRed.length}（${stillRed.join("、") || "无"}），已知已裁红 ${knownRed.length}（${knownRed.join("、") || "无"}），可信度=${gatesTrusted ? "成立" : "不成立"}`);
await persistJson(".zcode/tmp/final-verify/summary.json", {
  producedBy: "ui-audit-v38 DSL",
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
log(`终报读数已落盘（提交前那一发）：.zcode/tmp/final-verify/summary.json（gates=${Object.keys(gateExitMap).length} 条，红 ${stillRed.length}）`);
/**
 * 【E3 报告生成器不再排在提交前】
 * v3.7 的实测后果：gen-round8-report 在 :1048 跑，而 summary.json 在提交后 :1087-1100 又被覆写一次
 * —— 报告 §7 永远是从**提交前**那份读数回填的，而本文件自己在 :1102 写着"本轮终账以提交后读数为准"。
 * 两句话摆在一起，报告里那一格就永久性地与终账不符，且没有任何门能看见（两侧读的都是同一个文件名）。
 * bash 载具早就是这个次序（run-final-verify-v33.sh:128 先写 summary，:135 才跑 g gen-round8-report，
 * 并把"位置必须在 summary.json 落盘之后"写在 :133），本版把 DSL 对到 bash 上，不是反过来。
 * 保留的硬要求：blocker 文案仍是"禁止手填数字代替读数"；manifest.report 语义不变
 * （done / failed / 以及本版新增的 not-run —— 提交前那一发不再产生 report=done）。
 */
manifest.gates = gatesTrusted ? (stillRed.length === 0 ? "green" : "red") : "untrusted";
manifest.report = "pending-post-commit";
await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);

// =====================================================================
phase("提交推送与总报告");
// —— 显式路径提交（本仓有用户刻意删除的 tracked 证据，绝不 add -A / add -u）——
const addRes = await gitTry(["add", "--", WORKFLOW.closureDir + "/", WORKFLOW.matrixDir + "/issue-matrix.md"]);
let commitHash = "";
if (addRes.ok) {
  /**
   * 【E4 提交前的暂存区密钥预检：默认判据就是"拦下来"】
   * 为什么必须在 add 与 commit 之间、而不是在别的相位：这道门读的是**索引里那份内容**，
   * add 之前索引是空的（等于没判），commit 之后已经进史（拦不住了）。
   * 为什么 fail-closed：本仓的 .gitignore 只是"看不见"不是"不许提交"，
   *   实测 `.env.bak-20261014-rot` 同时漏过 .gitignore:24（字面 `.env`）与 :157（字面 `*.bak`）
   *   两道规则，只靠屏蔽拦不住一次 `git add -f`（出处：scripts/qa/verify-staged-secrets.mjs 头注 4-8 行）。
   *   所以 exit 1（有判点）与 exit 2（门自己没跑成：git 不可达 / 不是仓库 / ref 解析不到 / diff 读不出）
   *   都**不许提交** —— 把"量不到"当"没问题"放过去，就是这道门存在的理由的反面
   *   （该脚本 :14-16 自己写的：退出码 0 干净 / 1 红线 / 2 门没跑成，"量不到的东西必须响亮地失败"）。
   * 落点纪律：--json 侧车只落掩码值（该脚本 :36-38 的输出纪律），所以它可以进本轮 closureDir 并随证据一起提交。
   */
  const stagedSecrets = await runGate({
    name: "暂存区密钥预检 verify-staged-secrets",
    args: ["scripts/qa/verify-staged-secrets.mjs", "--json", WORKFLOW.closureDir + "/dsl-staged-secrets-precommit.json"],
    timeoutMs: 120000,
  });
  gateToBoard(stagedSecrets);
  const secretsCleared = stagedSecrets.exitCode === 0;
  if (stagedSecrets.exitCode === 1) {
    blockers.push(`暂存区密钥预检判红（exit=1）⇒ 本轮不提交：${stagedSecrets.resultLine}（先从索引里撤掉命中的载体再重跑本相位；这道门的判据是"进了索引的字节"，改 .gitignore 撤不掉它）`);
  } else if (stagedSecrets.exitCode === 2) {
    blockers.push(`暂存区密钥预检没跑成（exit=2）⇒ 本轮不提交（fail-closed：没量到不等于没问题）：${stagedSecrets.resultLine}`);
  } else {
    log(`暂存区密钥预检通过：${stagedSecrets.resultLine}`);
  }
  await persistJson(WORKFLOW.closureDir + "/dsl-staged-secrets-gate.json", {
    exitCode: stagedSecrets.exitCode, resultLine: stagedSecrets.resultLine, metrics: stagedSecrets.metrics,
    commitAllowed: secretsCleared, at: "git add 之后 / git commit 之前",
    failClosedRule: "exit!=0 一律不提交：1=索引里有凭据形状，2=门自己量不到",
  });
  if (secretsCleared) {
    const cm = await gitTry(["commit", "-m", WORKFLOW.commitMsg]);
    if (cm.ok) {
      commitHash = (await gitTry(["log", "-1", "--format=%h"])).out.trim();
      log(`证据提交：${commitHash}`);
    } else {
      blockers.push("证据提交失败：" + cm.err.slice(-150));
    }
  } else {
    log("因暂存区密钥预检未过（或没跑成）而跳过 git commit；已 add 的内容留在索引里等处置，DSL 不做 git 写操作去撤它");
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
  producedBy: "ui-audit-v38 DSL",
  headBefore: head,
  headAfter: finalHead,
  gates: Object.assign({}, gateExitMap, summaryAfter),
  reds: stillRed,
  redsAfterCommit: postReds,
  knownReds: knownRed,
  panelReds: panelOuts.filter((o) => o.exitCode !== 0).map((o) => o.name),
  // 【E2-c】没启动的腿与跑了的红腿分列，§7 与终报都读得到，不必靠人去对眼
  panelNotMeasured,
  redProbeExit: redProbe.exitCode,
  coverage: { covered: realcovNum.covered, uncovered: realcovNum.uncovered, required: realcovNum.required },
  realcovDebt: realcovDebt.scoreboard,
  bandStamp,
  bandStampRule: BAND_STAMP_RULE,
  movedByCommit: postReds.filter((n) => stillRed.indexOf(n) < 0),
  note: "HEAD 由 " + head + " 推进到 " + finalHead + "；同一格红/绿以提交后读数为准，翻转项见 movedByCommit。本件写完之后才跑 gen-round8-report（E3），§7 读的就是这一发",
});
await persistJson(WORKFLOW.closureDir + "/dsl-post-commit-v38.json", { head, finalHead, postCommit, postReds, panelNotMeasured });
log(`提交后 HEAD=${finalHead}（起点 ${head}）；sha 敏感门复量 ${postCommit.length} 条，新增红 ${postReds.length}（${postReds.join("、") || "无"}）—— 本轮终账以提交后读数为准`);

/**
 * 【E3 报告生成器实位：就在提交后读数落盘之后】
 * 位置判据与 bash 载具同一条（run-final-verify-v33.sh:133「位置必须在 summary.json 落盘之后：
 * gen-round8-report 的 §7 读的就是这份文件，早一步就是拿旧读数回填」）。
 * 上面那发 persistJson 已经把带 headAfter / redsAfterCommit / panelNotMeasured 的终账写进
 * .zcode/tmp/final-verify/summary.json，这一发起读它并回填报告，所以 §7 与终账必然同源。
 */
/**
 * 【本轮账单生产者：排在总报告回填之前】成因实测：gen-round8-report.mjs 的 §1 读 --gapbill(:68)、
 * §4 读 --openrows(:71)，不给就老实印「未跑」；而 `grep -rn gapbill scripts/` 只命中消费方自己
 * ⇒ 本轮（v3.8）没有任何生产者，这两节永远填不上；盘上只有上一程 v3.3（2026-09）的
 * reports/audit/round-7/{gapbill-v33,openrows-blockers-v33}.json —— 把那份指进来比印「未跑」更坏
 * （拿九月的旧账当本轮现状）。emit-round-bill.mjs 一律现跑三门取 stdout 机器行派生（一个数都不手填，
 * 落盘后自带出处回收），故位置必须在提交后读数落盘之后、报告回填之前——与 E3 同一条次序判据。
 * 退出码 2 = 有一个源读不到 ⇒ 它自己不写盘；这里把它记成 blocker，§1/§4 继续停在「未跑」。
 */
const roundBill = await runGate({ name: "本轮账单 emit-round-bill", args: ["scripts/qa/emit-round-bill.mjs", "--closure", WORKFLOW.closureDir, "--tag", "v38", "--ledger", WORKFLOW.closureDir + "/decisions-v38.md", "--dir", WORKFLOW.execDir, "--ops", WORKFLOW.opsDir], timeoutMs: 420000 });
gateToBoard(roundBill);
log(`账单生产者 emit-round-bill exit=${roundBill.exitCode}（${roundBill.resultLine.slice(0, 170)}）`);
if (roundBill.exitCode !== 0) blockers.push(`本轮缺口账单/未结行归置未生产成（exit=${roundBill.exitCode}）⇒ 终报 §1/§4 停在未跑；禁止把 round-7 那两份 v3.3 历史件当本轮输入指进来`);

const reportGen = await runGate({ name: "总报告回填 gen-round8-report", args: ["scripts/qa/gen-round8-report.mjs", "--ledger", WORKFLOW.closureDir + "/decisions-v38.md", "--out", WORKFLOW.closureDir + "/round-final-report-v38.md", "--round", "v3.8", "--date", "2026-10-16", "--baseline", head, "--summary", ".zcode/tmp/final-verify/summary.json", "--gapbill", WORKFLOW.closureDir + "/gapbill-v38.json", "--openrows", WORKFLOW.closureDir + "/openrows-blockers-v38.json"], timeoutMs: 180000 });
gateToBoard(reportGen);
log(`报告生成器 gen-round8-report exit=${reportGen.exitCode}（${reportGen.resultLine.slice(0, 120)}）—— §7 只认这份读数，禁止手填数字`);
if (reportGen.exitCode !== 0) blockers.push(`总报告回填未跑成（exit=${reportGen.exitCode}）⇒ §7 停在未跑，禁止手填数字代替读数`);
manifest.report = reportGen.exitCode === 0 ? "done" : "failed";
manifest.headNow = finalHead;
await persistJson(WORKFLOW.closureDir + "/dsl-run-manifest.json", manifest);
log(`manifest.report=${manifest.report}（提交后回填；提交前那一发只写 pending-post-commit）`);

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
  `- 覆盖门（判绿目录 ${WORKFLOW.execDir}，本轮新腿落 ${WORKFLOW.execDir}/exec-v38-*）：COVERED=${realcovNum.covered} UNCOVERED=${realcovNum.uncovered}/${realcovNum.required} 点名=${realcovNum.list}；只读对照 COVERED=${covHistoryNum.covered} UNCOVERED=${covHistoryNum.uncovered}`,
  `- 【E8】真档欠账记分板（覆盖门三桶，运行时现量，条数不写进本报告之外的任何散文）：UNCOVERED=${realcovDebt.scoreboard.uncovered} VOIDED=${realcovDebt.scoreboard.voided} EXPIRED=${realcovDebt.scoreboard.expired} 合计=${realcovDebt.scoreboard.total}／分母 ${realcovDebt.scoreboard.required}；点名行数=${realcovDebt.rows.length}；realcovClosed=${realcovClosed ? "真" : "未闭"}（判据=门 exit 0 且 新鲜度 MEASURED 且 三桶皆空 且 门尺与 DSL 尺同枚 sha8）`,
  `- 【E5】带宽尺：DSL=${bandStamp}（内联探针对照=${bandStampInlineProbe}）｜门回显当前尺=${realcovDebt.scoreboard.bandStampFromGate || "(未回显)"}｜尺源 ${BAND_STAMP_RULE.authority}｜生产者账 ${BAND_STAMP_RULE.producers.join(" / ")}`,
  `- 客户端三门：构建=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}；门禁仍红 ${stillRed.length}（${stillRed.join("、") || "无"}）；已知已裁红 ${knownRed.length}（${knownRed.join("、") || "无"}）；提交后新增红 ${postReds.length}（${postReds.join("、") || "无"}）`,
  `- 【E2】面板腿：实跑 ${panelOuts.length} 条（红 ${panelOuts.filter((o) => o.exitCode !== 0).length}），前置不齐而**没启动** ${panelNotMeasured.length} 条${panelNotMeasured.length ? "（" + panelNotMeasured.map((x) => x.name).join("、") + "）" : ""}——没启动的既不记 PASS 也不记产品红，逐条原因见 dsl-gate-recheck-v38.json`,
  `- 门禁可信度：${gatesTrusted ? "成立" : "不成立（本轮任何绿/红下降都不作数）"}；总报告回填 ${reportGen.exitCode === 0 ? "已跑（且在提交后读数落盘之后跑，E3）" : "未跑（§7 不留结论）"}`,
  `- 【E4】提交前暂存区密钥预检：判据与读法见 ${WORKFLOW.closureDir}/dsl-staged-secrets-gate.json —— 该门 exit!=0 时本轮不提交（1=索引里有凭据形状，2=门自己量不到）`,
  `- ${pushNote}`,
  "",
  "## 需你拍板（未替你决定）",
  ...(allNeedsUser.length > 0 ? allNeedsUser.map((u) => `- ${u?.id ?? "?"}：${u?.why ?? ""}（可选：${u?.options ?? ""}）`) : ["- （无）"]),
  "",
  "## 仍未保证（每条带原因）",
  ...(blockers.length > 0 ? blockers.map((b) => `- ${b}`) : ["- （无）"]),
  "",
  "## 口径说明",
  `- 「保证所有问题没有」以机器可判据收口：全部 ${routes.length} 页 NAV_OK + 重放期 console 清白 + 可交互元素清点齐**且 censusWindow=full-tree** + 安全动作抽测**且每次 tap 可归因到带绑定的节点**无失败 + 覆盖门三桶（UNCOVERED/VOIDED/EXPIRED）同时清零且逐条点名闭合。`,
  "- 【E8】只把 UNCOVERED 清零不等于覆盖闭：VOIDED 是判决效力作废（要先拍台账点名的待裁令牌，重跑并在台账行上声明 coverageEffect:\"revalidated\" 才回 COVERED），EXPIRED 是认领它的 real 腿带旧构建戳（只能在当前带上重拍）。这两桶都不进 UNCOVERED 计数，所以本报告的分子分母都由门自己印，不接受任何手写条数。",
  "- 【E1-b】覆盖门的 --ledger（判决效力来源）与轮次收割目录 harvestFrom 是两个轴：v3.7 那一轮按 lane 记账、没落 tour-ledger.json，把 --ledger 指过去会让待判桶读成 0 并把 COVERED 从 196 洗成 200（实测两发对照）。本版 --ledger 单列一键并做存在性预检。",
  "- 【E2】「未取证」是一格独立状态：前置条件（口令/UI 租约归属）不齐的后台/设备门根本没启动，既不算红也不算绿；把它记成红会诱导下一程去修一条不存在的红，记成绿就是无归属的绿。",
  "- 「可交互元素清点齐」只统计清点窗口为 full-tree 的行：上一轮实测 45/73 页的计数来自 outerWxml 首-view（只读第一个 view 子树）、3 页 NAV_OK 报 0 元素，那部分行数不是覆盖证据。",
  "- 「抽测无失败」只在动作可归因时才计数：命中无绑定容器的样本记 不可达、不算样本；弹层类状态以节点挂载断言判，不以两帧字节等值判（等值可能是自取消序列的构造结果）。",
  "- 页面真实加载期 console 原文、storage 明文嗅探属采集通道表已声明的能力边界（partial / no），不在判据内；不得以「未发现问题」表述替代「未取证」。",
  "- 截图帧未入库：.gitattributes 的 LFS fail-loud 闸 + .gitignore 的 *.png 双重挡住，帧留盘可复核，入库方式归既有拍板。",
  "- 搬运自上一轮的真档腿 attests 的是 rebuild 之前的 bundle（带宽戳只识别 config 不识别构建），本轮另有点样重跑，两者在 dsl-harvest-provenance.json 分列。",
  "- 【E8-b】收割账本里自报 done/done-harvest 的格子本轮都经盘上产物复核，读不到就降级重跑（复核结果见 dsl-harvest-audit.json）：账本自报不等于证据在盘，本轮实测上一轮的 manifest 是 CLI 会话按 lane 记的，DSL 件名一件都不在。",
].join("\n");
try {
  await artifact.markdown("final", md, { title: "全量UI巡检闭环总报告 v3.8", description: "收割 v3.7 的巡检-修复-入册-终验结果 + 面板五门前置实量 + 提交前密钥预检 + 真档三桶记分板与需拍板清单", primary: true });
} catch (e) {
  log("总报告发布失败：" + String(e).slice(0, 120));
}

const verified: string[] = [
  `巡检 ${roundsDone} 轮：${navOkFinal}/${routes.length} 页 NAV_OK，累计 ${allTourRows.length} 行落 ${WORKFLOW.closureDir}/dsl-tour-cumulative-round*.json`,
  `三路独立审查逐轮执行（降级路数已如实计入 blockers，未取证不当零缺陷）；分拣 executable=${openItems}、needsUser=${allNeedsUser.length}`,
  `修复后客户端三门守门员实测：构建(bat)=${buildOk ? "PASS" : "FAIL"} typecheck=${tcOk ? "PASS" : "FAIL"} 单测=${testOk ? "PASS" : "FAIL"}`,
  `GATE_SUITE ${GATE_SUITE.length} 条 + 红探针 + 面板 ${PANEL_SUITE.length} 条（面板串行：D5 的 --dry 与 E2 的后台/设备门都排在这里，不并发）；终局读数由本 DSL 写入 .zcode/tmp/final-verify/summary.json（提交后那一发是终账），gen-round8-report 在其之后才跑（E3，与 bash 载具同次序）`,
  `覆盖门终验读数：COVERED=${realcovNum.covered} UNCOVERED=${realcovNum.uncovered}/${realcovNum.required} 点名=${realcovNum.list}（exit=${realcovGate ? realcovGate.exitCode : "?"}）；三桶记分板 UNCOVERED=${realcovDebt.scoreboard.uncovered} VOIDED=${realcovDebt.scoreboard.voided} EXPIRED=${realcovDebt.scoreboard.expired} 合计=${realcovDebt.scoreboard.total}（全部由门自己印，无手写条数）`,
  `面板腿前置实量：需要 ${[...new Set(PANEL_SUITE.filter((x) => x.requiresEnv).flatMap((x) => x.requiresEnv || []))].length} 个环境变量 + 1 个租约归属；实跑 ${panelOuts.length} 条、因前置不齐未启动 ${panelNotMeasured.length} 条（未启动≠红≠绿，逐条理由在 dsl-gate-recheck-v38.json）`,
  `入册：${WORKFLOW.matrixDir}/issue-matrix.md 行数 ${admission.rowsBefore}→${admission.rowsAfter}（新增 ${admission.added}，归并 ${admission.aliased}）`,
];
const notCovered: string[] = [
  "巡检截图帧未入库（LFS fail-loud 闸 + *.png 忽略，归既有拍板）；帧在 " + WORKFLOW.closureDir + "/screenshots/ 可复核",
  "支付/VIP 真实拉起不在巡检范围（商业化封存态，只验 404/403 设计行为）",
  "破坏性动作（删除/解绑/同意类）按护栏跳过，未真实执行",
  "真机手感、长时压测、弱网不在机器判据内",
  "页面真实加载期 console 原文不可得（重放路径为上限）；storage 明文嗅探无已证通道 —— 两条均为采集通道表声明的能力边界，分别挂拍板项 R3-11 / R3-10",
  // 【E2】没启动的后台/设备门是一格独立状态：既不在 verified（没量到就不能算做过），也不在"红"里（不是产品缺陷）
  ...(panelNotMeasured.length > 0 ? [`${panelNotMeasured.length} 条面板腿因前置不齐未启动：${panelNotMeasured.map((x) => x.name + "（" + x.why.slice(0, 60) + "）").join("；")} —— 这些腿的判点本轮一条都没产出，不得计入通过`] : []),
  ...(!setup.wsUp ? ["DevTools 通道未就绪：本轮 UI 巡检降级，页面级保证不成立（见 blockers）"] : []),
  ...(auditDegradedAny ? [`三路审查有 ${degradedRounds}/${roundsDone} 轮未全部取证：那几轮的"无新增缺陷"不成立，缺陷总数下界未知`] : []),
  ...(!backendUp ? ["后端 8080 未 UP：真档腿与前后端连通/后台同步证据本轮不可产生，一律 NOT-EVIDENCED"] : []),
  ...(!gatesTrusted ? ["门禁可信度不成立：本轮门禁读数（含绿）一律不采信"] : []),
  ...(sha8Of(bandStamp) === "" ? [`real 带宽尺取不到（bandStamp=${bandStamp}）⇒ 覆盖门的新鲜度比较与本轮续跑准入都没有第二把尺，EXPIRED 桶不会被摘（尺取不到时门自己按 UNMEASURABLE 一条不摘）`] : []),
];
const findings: Finding[] = [];
for (const u of allNeedsUser) {
  findings.push({ where: u?.id ?? "(缺 id)", what: "需用户拍板：" + (u?.why ?? ""), evidence: u?.options ?? "", status: "verified", severity: "medium" });
}
for (const b of blockers.slice(0, 40)) {
  findings.push({ where: "本轮 blockers", what: b, evidence: "见对应审查/巡检/门禁输出", status: "verified", severity: "medium" });
}

return {
  conclusion: `全量UI巡检闭环${gatesTrusted && !auditDegradedAny && stillRed.length === 0 && realcovClosed && clientGreen ? "完成" : "跑到终点但未全绿（如实报）"}：收割 ${roundsDone}/${WORKFLOW.maxRounds} 轮巡检覆盖 ${navOkFinal}/${routes.length} 页，三路审查-修复-回归终态 openItems=${openItems}、入册新增=${admission.added}；客户端三门${clientGreen ? "全绿" : "有红项"}；覆盖门 UNCOVERED=${realcovNum.uncovered}/${realcovNum.required}（点名=${realcovNum.list}）、真档三桶合计=${realcovDebt.scoreboard.total}（UNCOVERED/VOIDED/EXPIRED 现量，round-4 的派活清单就是这张记分板）；门禁仍红 ${stillRed.length}${knownRed.length ? ` + 已知已裁红 ${knownRed.length}` : ""}；面板未启动 ${panelNotMeasured.length} 条；审查降级轮数 ${degradedRounds}/${roundsDone}${auditDegradedAny ? "（故「无新增缺陷」不成立）" : ""}；${pushNote}。「所有问题没有」只在机器判据口径内成立，判据之外与未取证项逐条列在 findings/notCovered。`,
  findings,
  verified,
  notCovered,
};
