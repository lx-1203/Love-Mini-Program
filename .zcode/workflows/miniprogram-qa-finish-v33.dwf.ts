/* zcode-workflow
description: round-8 收官闭环（v3.3 续作）：不重跑已完成的 R1/R2/round-7 主体，直接从机器门禁账单出发——
  全清单门禁并行（条数以 GATE_SUITE 为准，注释里不写死数字；这批门按"只读账单"口径挑，已知唯一例外是 verify-evidence-holes 的 judge 分支仍写自己那份权威件，见清单内注释）+ 环境/端口/工作树探针出「缺口账单」；分拣员把缺口三分（可执行/需用户拍板/需环境），只有可执行项进车道；
  按域并行收口（每车道 修复→独立复验 链式流水；UI 交互腿单写者串行、锁协议）；账本员统一落账（先干跑核对再 --apply，备份纪律）；
  门禁终验复量对照 + 全量面板与面板后复量（PANEL_SUITE，车道全部收工后顺序跑）+ 构建/typecheck/vitest 守门员重跑；显式路径清单提交；总报告把「需拍板清单」原样交还用户，绝不替写政策。
  前置事实：后端 8080 在跑（health UP）；DevTools 自动化端口可能是冷的，但**零点击能拉起**（见交互腿车道纪律），不要一上来就判 UNVERIFIED-TOOLING；跑任何 scripts/** 都必须用 Node>=20.11（PATH 上的 node 是 v16，会把多条门崩成假红）。
  ⚠ r9 实测给上一句补边界：零点击能把**端口**架起来（9420 在听），不等于会话**可驱动**。
  本轮 `ws-channel-up --wait 150` 打在 real 档上报的是 `WS_UP=FAIL`——端口 19s 起就在听，
  但 connect 后取页失败 34 次（`Cannot read properties of undefined (reading 'split')`），
  量到的原因是那个 IDE 窗口处于**最小化**状态（标题 `undefined - mp-weixin-real`）。
  所以设备腿开拍前的判据只有一条：脚本自己印的 `WS_UP=OK/ALREADY_UP`，**不是** netstat 的端口表；
  先恢复窗口再接通道，别只加大 --wait（我犯过一次，还把 `| tail` 的 0 当成了脚本的 0）。
  【r9 收通的形状，照抄可用】`--wait 300` 那一发回来的是
  `WS_UP=ALREADY_UP port=9420 connectMs=446 page=pages/login/index 单条查询=30.0ms` +
  `WS_UP_BAND=match … VITE_API_MODE=real MODE=real envSha8=f0677920` + `WS_UP_BAND_OK` +
  `WS_UP_BAND_RESULT=match exit=0`，端口来源 `scripts/qa/ide-port.json → 9420`。
  ⚠ **归因不许写谎**：这次收通之前我只做了一件事——试图把那个最小化窗口 activate/restore，
  而那次 MCP 调用是 `idle timeout 120000ms`（**没有成功回执**）。所以"恢复窗口导致可驱动"
  这句我**不能声明**；能声明的只有"从第一次 FAIL 到 ALREADY_UP 之间过了约 29 分钟，
  窗口尝试与时间二者择一，未分离"。下次要定论就把两条分开跑：只等，或只动窗口再等。
  另注：`hits=00000000` 是探针选择器在登录页没命中任何节点，属数据读数，不是通道故障——
  别把它当 `STATE_NOT_APPLIED` 的阳性对照缺席来判红（阳性对照要另选一个已知 present 的选择器）。
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
// 清单对齐纪律（r9 dsl-gate-sync 车道立的口径，对账表：reports/audit/round-7/dsl-gate-sync-r9.md）：
//   本文件的 GATE_SUITE + PANEL_SUITE 是 bash 版 scripts/qa/run-final-verify-v33.sh 的**超集或等集**，
//   改任一条 name/args/timeoutMs 时同步核对三件事：① name 以 bash 那个门名为结尾（summary.json 的键靠它对上）；
//   ② 实参与 bash 逐字一致（有意的不等价必须在注释里写清"为什么不接"，不许静默漂移）；
//   ③ timeoutMs >= bash 秒数×1000 —— 只准往大调：往小调就是把一条能跑完的门改成会被掐死的门，读出来是假红。
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
  // 与 bash 的一处**已知不等价**（r9 落账，故意不接）：bash :21-28 是"库目录在才 export QA_EVIDENCE_STORE"，
  // DSL 的 args 数组是无条件常量，写死 --store 就等于在没库的机器上把 CORPUS_STORE 从 unconfigured（该轴不判）
  // 变成 unreachable（脚本 :316 明写"⇒ 判红"）——那是拿对齐的名义新增一条红，方向正好反了。
  // 后果如实记下：DSL 自己跑的 corpus 门量不到"库背书"那一轴（脚本 :45 保证这不新增红也不豁免），
  // 那一轴的权威读数仍只能出自 bash 全量扫；本条不是"DSL 绿了就等于库验过"。
  { name: "证据语料 verify-evidence-corpus", args: ["scripts/qa/verify-evidence-corpus.mjs"], timeoutMs: 600000 },
  { name: "溯源全量 verify-provenance-all", args: ["scripts/qa/verify-provenance-all.mjs"], timeoutMs: 600000 },
  // 超时对齐（r9 dsl-gate-sync 车道，方向＝上调）：bash 版给 420 秒，DSL 此前给 180 秒。
  // 这条门要遍历三档产物（实测每档 ~2150 文件、srcFiles=753）再做符号级深检，代价随脏项/构建写回数长；
  // 180 秒不是判据、是掐表：被 timeout 掐掉时 runGate 记 exitCode=-1，
  // 于是一条 FRESH_RESULT=PASS 的门读成红。要防的正是这种假红——小的那侧只会造假红，不会造假绿。
  // 实测留档（r9 本车道，Node22、不带 --out ⇒ 零写盘）：99 秒 PASS ⇒ 180 秒只剩 1.8 倍余量；
  // 对齐到 420 秒要消的是"同一发在两个 carrier 里一个绿一个被掐"的形状，不是说今天已经假红过。
  // 阈值/判据一字未动（超时只决定"有没有被允许量完"）。
  { name: "档位新鲜度 verify-band-freshness", args: ["scripts/qa/verify-band-freshness.mjs"], timeoutMs: 420000 },
  { name: "后端新鲜度 verify-backend-fresh", args: ["scripts/qa/verify-backend-fresh.mjs"], timeoutMs: 120000 },
  // 与 bash 同形（r9 对齐）：--mode judge 不是新判据——verify-evidence-holes.mjs:17 写的就是
  // `const MODE = arg("mode", "judge")`，默认值即 judge；显式点出来只为两个 carrier 的命令行逐字一致，
  // 免得"没写旗"和"写了旗"日后被读成两种状态。判据、退出码、阈值一字未动。
  // 超时 180000→300000（方向＝上调）同 band-freshness 那段理由：DSL 侧偏小只会造出假红。
  // 落一个事实给后面读代码的人（本车道不改它）：judge 分支 :144 无条件 writeFileSync
  // reports/audit/round-7/evidence-holes-verdict.json ⇒ 下面「这批门都不写 reports/**」那句口径
  // 对本条其实不成立（bash 同形，它也没给 --out）。要真把落点挪进侧车得改参数语义，那是判域，归人拍板。
  { name: "证据洞 verify-evidence-holes", args: ["scripts/qa/verify-evidence-holes.mjs", "--mode", "judge"], timeoutMs: 300000 },
  // QA 离线自检聚合器必须进这条清单：它按文件名自动收 scripts/qa/test-*，本轮新增的三条负例
  // （落地对判域收窄 test-landing-identity-scope、证据库三态 test-evidence-store-axis、
  //  欠账点名 test-real-coverage-nominate）都靠它才会被真正跑到。
  // 此前 DSL 只跑 prove-gates-can-fail 那一支，聚合器只存在于 bash 版 run-final-verify-v33.sh ——
  // 于是"工作流绿了"与"负例从没被执行过"可以同时成立，这正是"建了门不接线就等于没建"的形状。
  // 超时 900000 > bash 的 600000（方向＝DSL 本来就更大）：留的是负例批量起进程的余量，只放宽掐表、不放宽判据，
  // 不必往小对齐（对齐成更小＝把一条能跑完的门改成会被掐死的门，就是本轮要拆的那颗雷）。
  { name: "离线负例聚合 run-qa-selftests", args: ["scripts/qa/run-qa-selftests.mjs"], timeoutMs: 900000 },
  // 接线（2026-09-29 wiring 车道）：下面两把门是"建了没人跑"的孤儿门，本清单是唯一必然经过的调用点
  // —— GATE_SUITE 被 Promise.all 无条件遍历两处：缺口账单 phase 与门禁终验复量；提交后还按 SHA 敏感子集复量一次
  //    （那条 filter 的口径是 corpus|provenance|band-freshness|real-coverage，下面这几条不在其内，也不该在：
  //     它们扫的是脚本字节、ops 用例清单与工作流自身字节，不随产物/证据 SHA 变）。
  { name: "dry 不抢租约静态门 verify-dry-no-lease", args: ["scripts/qa/verify-dry-no-lease.mjs"], timeoutMs: 180000 },
  // 接线（L18 工作流改进门车道 2026-09-30）：零消费者导出件检测——本流程此前缺的那一格。
  // 病不是"某件东西没接线"，而是「没有任何门会因为没接线而变红」：本轮同族事故实测四次
  //（--results 自证轴三个调用点都没喂 / run-qa-selftests 只在 bash 里 / measured-ledger 建了没人 import /
  //  某门注释声称新增读数而 grep 只命中注释本身），逐条证据见 reports/audit/round-7/wiring-gate-r18.md。
  // 判域刻意做小：只审 scripts/qa/** 与 apps/client/scripts/** 两棵树里写了 export 的 .mjs/.cjs（实测 23 件），
  // 不扫 scripts 根下那 1000+ 个一次性调试脚本——判域一大就是噪音红，噪音红的下场是被整体关掉。
  // 极性：默认判红（不是 --advisory 报数）。理由与 verify-case-automatable 相反且必须写清：
  // 那把门实测假阳性率 83.3%，判据本身不可信所以只能报数等拍板；这把门的判据是结构性的（数入口引用），
  // 且双向红绿都被 scripts/qa/test-carrier-wiring.cjs 钉住（零消费者⇒必须红、补一处真 import⇒必须绿），
  // 命中数只有个位数且每条点到文件名 ⇒ 可处置，没有"红一大片只能整体关掉"的退路。
  // 三个旗标一律不加（与 bash :65 那一发逐字同参）：--advisory 会把刚装上的刹车拆掉；
  // --select 是负例专用旋钮；--json 用脚本默认落点 .zcode/tmp/carrier-wiring/wiring.json（不落 reports/**）。
  // 超时 180000 = bash 的 180 秒 1:1（实测本门最慢一发 3157ms ⇒ ~57 倍余量；只准往大调，这里没往小调）。
  // 名字尾串 verify-carrier-wiring 与 bash 门名相等；不含 corpus|provenance|band-freshness|real-coverage
  // ⇒ 不会被提交后的 sha 敏感子集重复捞（它扫的是脚本字节与入口清单，不随产物/证据 SHA 变）。
  // 派生依赖：scripts/qa/carrier-wiring-exemptions.json（豁免清单，实测生成、逐条带 why）与
  // scripts/qa/run-qa-selftests.mjs 的收件正则 /^test-.+\.(cjs|mjs)$/。前者缺失 ⇒ exit 2；
  // 后者漂走 ⇒ exit 2（那意味着我会把"其实被自动收件的负例"误报成死件）。这两种都是要的效果。
  { name: "载体接线零消费者门 verify-carrier-wiring", args: ["scripts/qa/verify-carrier-wiring.mjs"], timeoutMs: 180000 },
  // 接线（r10 L20）：车道报告的「（待填」骨架此前无人审——上一程三条车道撞轮次上限后留下的就是空骨架，
  // 而"本轮已收口"照样能成立。收件清单与豁免清单都是具名文件，缺清单该门 exit 2（不许静默扫全目录造噪音红）。
  // 与 bash :66 逐字同实参；timeoutMs 90000 ≥ bash 的 60 秒×1000（只往大调）。名字尾串相等，不含
  // corpus|provenance|band-freshness|real-coverage ⇒ 不会被提交后的 sha 敏感子集重复捞（它读的是报告字节）。
  { name: "车道报告骨架完成度 verify-lane-report-complete", args: ["scripts/qa/verify-lane-report-complete.mjs", "--intake", "reports/audit/round-7/lane-report-intake-round-7.json", "--exemptions", "reports/audit/round-7/lane-report-exemptions-round-7.json"], timeoutMs: 90000 },
  // 接线（r10 L19）：那 10 条覆盖欠账的"按可采性分流"此前只有散文，没有机器件也没有门在核。
  // 与 bash :69 逐字同实参（本门自己 spawn 上游 verify-real-coverage，DSL 侧不需再传旗标）；
  // timeoutMs 180000 = bash 180 秒×1000（实测墙钟 3.3–4.7 秒，余量 ~38 倍）。
  // ⚠ 名字含 `real-coverage` ⇒ 会被下面 :577 那条 sha 敏感子集正则捞到，提交后复量必然多跑这一条。
  //   这是对的行为（去向册随产物/证据集移动），但引用时要说清"键数变化是接线所致"，别读成莫名多跑一条门。
  { name: "真实档覆盖去向册 verify-real-coverage-disposition", args: [], timeoutMs: 180000 },
  // verify-case-automatable 两轴分开看：exit 2 = 完整性轴（r-exec.cjs 的 UNIMPLEMENTABLE_ACTION_RE
  // 取不到 / --ops 目录不存在 / 扫到一个 manifest 都没有 ⇒ 单一真值源断了，这条照旧判红）；
  // exit 0 + CA_RESULT=ADVISORY = 普查轴。引用纠偏（r11 之后）：该脚本的退出码契约现在写在 :324-341
  // （旧注释指 :157-169，文件长了一倍后那条已落到别处）；"假阳性率未量"这句在 r11 之后**只对未喂
  // --results 的默认调用成立** —— 轴本身已量出来：FP 83.3%（硬口径 47.1%）、召回 12.1%
  // （实测过程见 reports/audit/round-7/ 与 .zcode/tmp/lane-ca-fp/REPORT.md）。
  // 这里**不**加 --strict：那等于替一条 83.3% 假阳性率的静态判据背书、把 102/1107 直接写成红 ——
  // 拍板归人，见本轮需裁决清单。
  // --json 显式点到 .zcode/tmp（它 :24 自定的规矩：结构化输出必须落在 reports/** 之外），不碰任何判决件。
  // 文件名与 bash 不一致是**判过的保留**（r9 对账，别当漏改）：bash 终验那一发写 final.json，
  // 而 preflight.json 既是该脚本 :42 的默认值、也是 run-round7-closeout.mjs:349 用的名字；
  // DSL 这一张表同时喂「缺口账单」与「终验复量」两个 phase（同一条 args 用两次），
  // 指成 final.json 就会把账单阶段那一发标成"终验"——是造假标签，不是对齐。
  // 退路上也无风险：两份 JSON 全仓零读者（只有本门自己写），退出码与落点无关 ⇒ 改名的收益是 0、代价是label 错。
  // 接线（r9 编排亲验）：这条门自 r11 起"给了 --results 却读不到/零行"退 2，所以喂它的人
  // 必须对语料负责。这里显式喂 round-6 那份 interact 结果件，因为它是本轮唯一被量出来
  // **逐条 title 全等**的配对（1107/1107 键、102 条静态命中全在、title 匹配 102/102）；
  // 换别的配对会退 2 或报"不可测"，那是要的效果——自证轴不许静默消失。
  // 派生依赖：reports/audit/round-6/interact/exec-results.json（今日已确认被 HEAD 跟踪）若被清理，
  // 这条会红并指名"给了 --results 读不到"。那时正确做法是换一个 title 全等的配对，不是删掉本行。
  { name: "用例可自动化预检 verify-case-automatable", args: ["scripts/qa/verify-case-automatable.mjs", "--results", "reports/audit/round-6/interact/exec-results.json", "--json", ".zcode/tmp/case-automatable/preflight.json"], timeoutMs: 180000 },
  // 接线（r9 dsl-gate-sync 车道）：dryrun-workflow 此前只在 bash 版 :64 有一发，DSL 自己从不跑它
  // ⇒ "这条 DSL 还能不能干跑到终报"这句话在工作流里无人作证，而它恰恰是 F2 那一类（炸在终报之前）的探测器。
  // 放进 GATE_SUITE 安全的前提已核过：它只 transpile 本文件 + 在 stub 宿主里执行，world.run/artifact 全是桩，
  // 不落盘、不取 UI 租约；被桩执行的那一遍 DSL 里再调它也不会递归起真进程（桩不 spawn）。
  // 超时 300000 = bash 的 300 秒逐字照抄（1:1，不缩）。名字里不含 corpus|provenance|band-freshness|real-coverage
  // ⇒ 不会被提交后的 sha 敏感子集重复捞（它读的是脚本字节，不随产物 SHA 变）。
  { name: "工作流干跑预检 dryrun-workflow", args: ["scripts/qa/dryrun-workflow.mjs", "--profile", "all"], timeoutMs: 300000 },
  // 接线（r9 编排亲验）：判据台语料的 canon/戳此前**没有任何终验经过它**——它只活在车道"自己记得跑"里，
  // 而本轮确实有车道往 ops 写过行（L2 的 held4 那一笔）。写而不重打戳=判据与戳记分家，正是本仓反复纠的
  // "建了门没人开"。--check 只读：实测今日连过三次 HEAD 移动仍 `canon=0fef00d141e7 / cases=1107 / 零漂移` exit 0。
  // 标签里刻意不含 "corpus"（真文件名是 verify-ops-corpus-stamp.mjs）：:561 那条 sha 敏感子集是按 g.name 匹配的，
  // 而这把门读的是 ops 用例清单的字节、不随产物/证据 SHA 变——按本文件 :96 自己定的口径，它就不该被提交后重复捞一遍。
  { name: "判据台戳 verify-ops-stamp", args: ["scripts/qa/verify-ops-corpus-stamp.mjs", "--check"], timeoutMs: 180000 },
  // 已判"不该接"的一条（wiring 车道，别再试着接它）：verify-openqueue-lanes.mjs 不是门而是 round-7 一次性转换工具——
  // :22 把输入根写死成 reports/audit/round-7、:90 无条件 writeFileSync 覆写 round-7 判决件 cellplan-round7-openqueue.json，
  // 而且全文零个 process.exit ⇒ 打出 OPENQ_RESULT=PARTIAL（:99）照样退 0。接进本清单只会多一条永不变红的假绿。
];

// ===== 面板与面板后复量（r9 从 bash 版 :66-72 补进来；故意**不**并进 GATE_SUITE）=====
// 为什么不能塞进 GATE_SUITE：那张表被 Promise.all 无条件遍历两处（缺口账单 + 终验复量），
// 而 emit-round-report 一旦进去，下面三件事每件都会翻倍：
//   1) 它自己抢 UI 租约再放（r8 侧车日志 .zcode/tmp/final-verify/emit-round-report.log 首行就是 UI_LEASE=released）
//      —— 账单阶段交互腿还没起跑，9420/9430 的单写者协议会被自己人先占一遍；
//   2) 面板内部自己 spawn 三十来条实时门（含 G7 构建、G8/G9 环），一轮真跑里跑两遍＝全场时长翻倍；
//   3) 它单发就要 1800 秒，账单那条 Promise.all 会被它一个人拖住半小时，缺口账单出不来。
// 所以另立一张表，只在「门禁终验与构建测试」phase 末尾、所有车道收工之后**顺序**跑一次
// —— 与 bash 的次序逐字一致：面板 → 再量 verify-ledger / verify-state-truth。
// 顺序本身是判据的一部分：面板是重活（它已把自产物落点改去侧车，但 emit 过程仍动盘），
// 所以面板前那一发读的是"面板落地前"的台账形状，面板后这两发才是收工形状，两回事都留档、不能省。
// 三条名字都不含 corpus|provenance|band-freshness|real-coverage ⇒ 提交后的 sha 敏感子集不会重复捞它们。
const PANEL_SUITE: { name: string; args: string[]; timeoutMs: number }[] = [
  // --report/--metrics/--sidecar-dir 三个落点全指 .zcode/tmp 侧车：这就是 bash 那句"写进 sidecar 不覆写判决件"，
  // DSL 照抄同一组路径，绝不自作主张指回 reports/**（指回去就等于每跑一次工作流重打一次轮末报告）。
  // 超时 1800000 = bash 的 1800 秒逐字照抄（这条是全场最重的门，掐表只往小调只会更假红，没有别的方向）。
  { name: "全量面板 emit-round-report", args: ["scripts/qa/emit-round-report.mjs", "--round-dir", WORKFLOW.roundDir, "--sidecar-dir", ".zcode/tmp/final-verify/panel", "--report", ".zcode/tmp/final-verify/panel/round-7-report.md", "--metrics", ".zcode/tmp/final-verify/panel/round-7-metrics.json"], timeoutMs: 1800000 },
  // 下面两条与 GATE_SUITE 头两条同脚本同参数，但**是两次独立读数、两个独立键**：
  // bash 的 summary.json 里 verify-ledger 与 verify-ledger-after-panel 并存（18 键），
  // 只留前者就会把"面板落地后账本还成不成立"这一问悄悄吞掉。
  { name: "面板后台账复量 verify-ledger-after-panel", args: ["scripts/qa/verify-ledger.mjs", WORKFLOW.ledgerDir], timeoutMs: 120000 },
  { name: "面板后状态真值复量 verify-state-truth-after-panel", args: ["scripts/qa/verify-state-truth.mjs", WORKFLOW.roundDir], timeoutMs: 180000 },
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
// —— 全清单门禁并行（条数 = GATE_SUITE.length，r9 起不写死中文数字）+ 环境/端口/工作树探针；产出本轮唯一事实源 ——
// 「只读」口径：这批门基本都不写 reports/**。已知的两处落盘都记在清单内注释里、本车道都不改判域：
//   ① verify-case-automatable 写 .zcode/tmp 侧车（它 :24 自己规定的：结构化输出必须落在 reports/** 之外）；
//   ② verify-evidence-holes 的 judge 分支无条件写 reports/audit/round-7/evidence-holes-verdict.json（bash 同形）。
// 面板（emit-round-report）不在这条 Promise.all 里，原因见 PANEL_SUITE 段注释。
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
      `WS 腿开跑前必须过一次阳性对照：挑一个盘上已知 present 的选择器（实测可用 register 页 .field__input，real 档产物 wxml 里出现 5 次；同帧 CLI 腿读到 .field__eye=2），确认 WS 真能选中并下发；`,
      `若那一轮的 wsApplied 全为 []，说明是取景器载具的尺子不对，本轮所有 WS 派生的 STATE_NOT_APPLIED 一律记 UNVERIFIED-INSTRUMENT，绝不许记成产品失败——实测吃过：3 行 REGISTER-INDEX-011/012/013 就是这样被误判的，物件与类名在源码和产物里都在。`,
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

// —— 提交会推 HEAD，sha 敏感门的"绿"可能只是提交前的快照 ——
// 实测吃过：本轮边跑边提了十次，戳记车道读到 band gitSha=a4c8f995 时，那已经是"11 个提交前的历史"，
// 同一条门在同一轮里的读数会因 HEAD 移动而变。所以提交后必须复量这几条，两次读数都留档。
const shaSensitive = GATE_SUITE.filter(g => /corpus|provenance|band-freshness|real-coverage/.test(g.name));
const postCommit: GateOut[] = commit === "" ? [] : await Promise.all(shaSensitive.map(async (g) => {
  const o = await runGate(g);
  gateToBoard(o);
  return o;
}));
if (postCommit.length > 0) {
  const headAfter = (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || "unknown";
  const flipped = postCommit.filter(o => {
    const b = gateOuts2.find(x => x.name === o.name);
    return !!b && b.exitCode === 0 && o.exitCode !== 0;
  });
  log(`提交后 HEAD=${headAfter}，sha 敏感门复量 ${postCommit.length} 条，其中由绿转红 ${flipped.length} 条`);
  for (const o of flipped) blockers.push(`提交后转红（HEAD 被本轮提交推进所致，不是被测物退化）：${o.name}（${o.resultLine}）`);
  await persistJson("reports/audit/round-7/post-commit-gates-v33.json", { headBefore: head, headAfter, gates: postCommit, flipped: flipped.map(o => o.name) });
}

// —— 全量面板 + 面板后复量（bash :66-72 的等价腿；r9 接线，顺序跑不并发）——
// 为什么是 for..of 而不是 Promise.all：后两条读的就是"面板落完盘之后"的台账/状态真值，
// 并发等于让复量有机会跑在面板重写之前，那两发就退化成 gateOuts2 的重复读数（假绿形状）。
// 面板红不炸场：runGate 已把起不来/超时收敛成 exitCode=-1，这里照 bash 的口径记进 blockers 继续走。
const panelOuts: GateOut[] = [];
for (const g of PANEL_SUITE) {
  const o = await runGate(g);
  gateToBoard(o);
  panelOuts.push(o);
  log(`面板腿 ${o.name}: exit=${o.exitCode} ${o.resultLine}`);
  if (o.exitCode !== 0) blockers.push(`面板腿红：${o.name}（${o.resultLine}）`);
}

// —— 终报读数落盘 + 生成器接进必经调用点 ——
// 为什么要专门接：总报告的 §7 由 scripts/qa/gen-round8-report.mjs 从 summary.json 读，
// 而这份 DSL 自己不产那个文件（此前只有 bash 版 run-final-verify-v33.sh 产）。不接的后果是
// 下一程明明跑完了全部门禁，报告里 §7 仍是"未跑"，于是有人照着记忆手填数字 —— 手填正是本轮反复纠掉的病。
// 同名门以"提交后复量"为准（后写入覆盖前写入），因为那才是当前 HEAD 下的读数。
const finalReadings: Record<string, number> = {};
// 键集把面板腿也算进来（r9）：bash 的 summary.json 是 18 键（含 dryrun-workflow / emit-round-report /
// verify-*-after-panel），DSL 这侧是 GATE_SUITE 14 + prove-gates-can-fail + gen-round8-report + 面板 3 = 19 键。
// 键名口径说明（不是漏改）：DSL 的 name 是「中文描述 + 脚本名」，且**每一条都以 bash 那个名字结尾**，
// 所以两 carriers 的键集按脚本名逐一对得上，§7 由任一生产者喂都能读；别把前缀差异读成"少了几条门"。
for (const o of [...gateOuts2, ...postCommit, ...panelOuts]) finalReadings[o.name] = o.exitCode;
const redNames = Object.keys(finalReadings).filter(k => finalReadings[k] !== 0);
await persistJson(".zcode/tmp/final-verify/summary.json", {
  headBefore: head,
  headAfter: (await gitTry(["rev-parse", "--short", "HEAD"])).out.trim() || head,
  gates: finalReadings,
  reds: redNames,
  producedBy: "miniprogram-qa-finish-v33 DSL（与 run-final-verify-v33.sh 同 schema，任一生产者都能喂 §7）",
});
log(`终报读数已落盘：门 ${Object.keys(finalReadings).length} 条，红 ${redNames.length} 条${redNames.length ? "（" + redNames.join("、") + "）" : ""}`);
const reportGen = await runGate({ name: "总报告读数回填 gen-round8-report", args: ["scripts/qa/gen-round8-report.mjs"], timeoutMs: 120000 });
log(`报告生成器：exit=${reportGen.exitCode} ${reportGen.resultLine}`);
if (reportGen.exitCode !== 0) blockers.push(`总报告生成器没跑成，§7 会停在"未跑" —— 此时不得手填数字代替读数：exit=${reportGen.exitCode} ${reportGen.resultLine}`);

const verified: string[] = [
  // 条数从数组长度取，不写死中文数字（r9：口径同 bash :38 那句"条数以 GATE_SUITE 为准，不在本脚本里写死数字"。
  // 原句手填的是"十二项"，而接线前的 GATE_SUITE 实有 13 条、接线后 14 条——手填数字与清单脱节正是本轮反复纠的病，
  // 别让终报再犯一次；插值取长度 ⇒ 以后加门不用回来改这句话）
  `全清单机器门禁两轮实测（GATE_SUITE ${GATE_SUITE.length} 条，开账单 + 终验复量各一遍；判读以退出码与 *_RESULT 机器行为准）`,
  `全量面板与面板后复量 ${PANEL_SUITE.length} 条（emit-round-report → verify-ledger / verify-state-truth 顺序腿，读数落进 summary.json）`,
  "门禁可变红自检 prove-gates-can-fail：值域外/空扫描集/缺计划清单/状态真值 四类变异各自咬红，绿不是恒绿",
  "构建 build:mp-weixin:mock / typecheck / vitest 全量经收口守门员实测（PATH 前置 Node22）",
  `台账落账后回读 verify-ledger=${ledgerman.ledgerPass ? "PASS" : "FAIL"}、verify-state-truth=${ledgerman.truthPass ? "PASS" : "FAIL"}`,
  "每条收口都经独立复验员按盘上证据证实，不复述修复者自报",
];
const notCovered: string[] = [];
// 两条已核实的"绿不自证"范围，写进报告免得被读成全覆盖（数字与归因以 sizegate 车道产出为准）：
// 注意措辞：这条不是"dev 档豁免"。实测 apps/client/dist/build/mp-weixin 的 env.js 自证
// DEV:!1、PROD:!0、MODE:"mp-weixin-mock"，是 mock 料的**生产编译**；豁免只是调用方挂了 --allow-mock 旗号。
notCovered.push("verify-package-size 靠调用方 --allow-mock 旗号放行体积（去旗即红，实测同字节 exit 0 vs exit 1）。体积本身在 sizegate 车道后有三个并存口径，别只取一个数下结论：发布形态（真实上传物）主包 1762.7KB=1.72MB 已在 2.00MB 内；src 退化扫描口径 2.76MB 超 0.76MB；门的默认被测物（mock 档，prepare-static --dev 用 full-static 整目录覆盖 src/static）27.78MB 仍判红 —— 哪个口径算数已开成 decisions 第 23 项，未拍板前本工作流不得自称体积合规");
notCovered.push("同一脚本在打印两条 ⚠ 之后仍输出「✓ 验收通过：主包/总包体积合规」，是矛盾命名，判读只认 PACKAGE_SIZE ⚠ 行与退出码，不认那句 ✓");
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
