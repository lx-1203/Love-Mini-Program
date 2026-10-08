# 裁定收口报告（2026-10-06）——13 项全量采纳后的治理落账

> 性质：执行报告。输入=项目所有者对 `ruling-recommendations-2026-10-06.md` 13 项的**全部采纳**；
> 本程把采纳结果按仓库自身机制落进 QA 治理体系（判据台/台账/门脚本/机器名册），逐项留痕。
> 范围纪律：不碰 apps/ 产品代码、不碰 database/、不碰 round-1~6 历史证据文件。
> live 判据源按 verify 引用链认定：`scripts/qa/verify-source-shape.mjs`（判点 SPEC）、
> `reports/audit/round-6/issue-matrix.md`（权威台账，verify-ledger 与 patch-ledger-cells 的默认目标）、
> `reports/audit/round-6/ops/*.json`（判据台正文，verify-real-coverage 与 apply-ops-cellplans 的默认目标）、
> `reports/audit/round-7/decisions-v33.md` §36 名册（PENDING_RULINGS 的权威件）。
> round-1~6 目录里的 findings/exec-results/judge 件一字未动；round-6 里只动了上述两个 live 台的
> 具名判据行/列（各自走其 sanctioned 写入机制并留 .bak）。

## 0. 结论一句话

13 项全部落账：**名册 open 13→0（closed=13、half_closed=7，20 行守恒）**；判据修正 4 处机械执行并有读数；
三台门脚本按裁定改造（LEGACY 豁免 / judge 侧车 / 去向账归并标记）；DISPATCHABLE_NOW 1 条已真跑收账
（REALCOV_UNCOVERED 10→9）。未能执行项均为"需要设备腿或所有者专办"的**已裁未执行**，逐条带精确命令登记在 §9/§10。

## 1. 逐项改动（T1–T10）

### T1 —— decisions#1 `--r-lg` 判据改 20rpx
- `reports/audit/round-6/issue-matrix.md:171`（MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004 处置列）：
  原文全文保留，尾接裁定块「2026-10-06 采纳建议书 #1：16→--r-lg 的**等值替换要求作废**、以实现为准 20rpx」。
  落账走 `reports/audit/round-7/ledger-plan-ruling-closure-2026-10-06.json` + `patch-ledger-cells --apply`
  （写前自动备份 `.pre-cellpatch.bak`），`verify-ledger PASS`（STATUS_VOCAB_BAD=0、OFF_SCHEMA_ROWS=0）。
- 为什么落这里：要求"16rpx"的 live 判据只在台账该行处置列（判据台/源码判点均无 16rpx 谓词——
  verify-source-shape 的 PUBLISH-004 判点只钉 24rpx 等值档与 --card-radius 禁用，与本裁定无冲突、原样保留）。
- 实值锚点（留档）：`apps/client/src/theme/design-variables.scss:201` `$radius-lg: 20rpx` → `:445 --r-lg`；
  `tests/design-token-rulings.spec.ts:122` 同钉 20rpx；`publish.vue:1082` 的 16rpx 字面量按 `:1123-1125`
  既有收口注释以 nit 保留。

### T2 —— decisions#3 MESSAGES-INDEX-002 判据迁 real 带 + MOCK_UNJUDGEABLE 豁免
- `scripts/qa/verify-source-shape.mjs:243-266`（MP-R2VIS-PAGES-MESSAGES-INDEX-002 判点行，id 在 :254）：
  加 `bands: ["real"]`、claim 注记「复验带=real，mock 侧 MOCK_UNJUDGEABLE 豁免——2026-10-06 采纳建议书 #3」，
  注释写明豁免语义**沿用执行器既有 SKIPPED/EXEMPT 口径**（verify-real-coverage 的豁免三铁律同源）：
  只免判、不算覆盖、不销红；mock 侧免的是"判"，real 带仍须一次腿判过才能闭。
- `reports/audit/round-6/issue-matrix.md:60`（同 id 行处置列）：尾接同口径裁定块（同一 plan 件、同一次 --apply）。
- 复验：`verify-source-shape --dry` `SRC_SHAPE_RESULT=OK`（判点 8/8 成立；该行谓词本身未动，负例照咬）。
- 欠账：一次 real 腿（§9），故名册记 half_closed（已裁未跑），不虚报 closed。

### T3 —— decisions#7 village-publish-001 判据 1000→500
- `reports/audit/round-6/issue-matrix.md:169`（MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001）：
  status 列 `未取证/需裁决（口径未定…）` → `保留-判据不成立（2026-10-06 采纳建议书 #7：0/1000 系理想稿口径、
  设计依据缺失，按裁定以实现为准＝500…）`；处置列由 lane-C 人判指令整体换为裁定落地记录（原文见 git 与 .bak）。
  同一 plan 件、`verify-ledger PASS`。词表取"保留-判据不成立"而非"已修复"：判据被裁定推翻，无任何实现改动。
- 判据台侧无需改：round-6/ops 判据台与 verify-source-shape 均无 0/1000 谓词（该判据只活在台账行）。
- 状态词变更与 `verify-status-vs-disposition` 对账：新 status 终态化后其两列**不含**任何欠款标记词
  （OWED 词表逐项核对过），advisory 命中维持基线 13 条不变（无新增）。

### T4 —— decisions#28 CH22 滚动归属 + 行号漂移校正
- `scripts/qa/verify-source-shape.mjs:1415-1426`（MP-R7CRIT-SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH22 判据行）：
  claim 按裁定 (a) 改写——归属记到实际滚动容器 `<scroll-view class="campus-hub__feed">`
  （hub.vue:269-271 起、:334 闭合，campus-hub__more-text 在 :330-332 即 scroll-view 内），
  原 ACTION 句「页级 window 滚动，非 scroll-view」记为笔误；行号漂移一并校正（hub.vue:336-339→:330-332，
  zh-CN.ts:3447→:3628）；`needsRuling` 清空（冲突已裁）⇒ 门读数 `未裁半句 1→0`。
- `reports/audit/round-6/ops/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json`（判据台正文，备份
  `.pre-ruling28-20261006.bak`）：CH22 `action`/`expected` 同步更正归属与行号。
- 连带（本仓 sanctioned 路径）：判据台字节变了 ⇒ `verify-ops-corpus-stamp --check` 如实判红
  （DRIFT 点名该文件"正文/字段值被改"）→ 按既定约定 `--write` 重打语料戳（备份
  `ops-corpus-stamp.json.pre-stamp-write.20261006-160619.bak`）→ `STAMP_RESULT=PASS`（cases=1107 守恒）。
  与 2cd578ae「语料戳按 sanctioned 路径重打」同一条路径。
- 行号均按当日工作树实测（hub.vue:269-271/330-332/334，zh-CN.ts:3628），非抄旧判据。

### T5 —— decisions#12-A verify-provenance-all LEGACY 豁免
- `scripts/qa/verify-provenance-all.mjs`：加**窄豁免分支**（:195-221 注释三条收窄 + 实现紧随；输出 :321）：
  只豁免「①整份 manifest 无 gitSha 且 generatedAt 早于 git 派生的 STAMP_CONVENTION（不读手维护名单）
  ②盘上**不存在**的帧 ③行内无自带 bandSha」三条件齐备的帧 → 单列
  `PROV_FRAMES_LEGACY_EXEMPT=144` + 逐条样例行 + 结论钉死**「历史证据，不可引用」**（不进 CONSISTENT、
  不算覆盖、不给本轮结论背书）；守恒式同步加桶（in=out=9184 OK）。约定之后的无戳清单照旧 noStamp 判红，
  豁免面不随时间自动变大——注释里写明"不给断链开后门"的理由。
- 门禁前后：
  - 无库（缺省环境）：`FAIL(PROV_FRAMES_UNRESOLVABLE=149 + PRE_STAMP=4881)` →
    `FAIL(UNRESOLVABLE=5 + LEGACY_EXEMPT=144 + PRE_STAMP=4881)`——round-1 的 144 帧不再冒充"证据被这轮弄丢"，
    余 5 条非 legacy 缺席帧**照旧红**（豁免不外溢）。
  - 带库（QA_EVIDENCE_STORE=D:/6/love-mini-evidence，同 run-final-verify 口径）：
    `FAIL(PRE_STAMP=4881)` → `FAIL(PRE_STAMP=4881)`。**门没有转绿，原因是另一条用户裁定**：
    4881 张 pre-stamp（exec-* 族打"转换时刻 HEAD"而非采集带）已由用户按 decisions-v33:426 裁定
    「#25：记为已知历史红，每轮如实复量」——按裁定**不许**用豁免洗掉它。建议书红三门表把
    provenance-all 的红全部归因 #12-A 与盘不符，此处如实记录：#12-A 那一格（144 帧）已闭，门整体仍红
    且红得与裁定一致。
- 配套自测：`test-prov-dialect.cjs` 20 断言 0 失败（`PVD_TEST=PASS`）。

### T6 —— r10new#D verify-evidence-holes judge 分支侧车化
- `scripts/qa/verify-evidence-holes.mjs`：judge 缺省落点改为
  `reports/audit/round-7/evidence-holes-verdict.sidecar.json`；显式 `--out` 仍被尊重——那就是
  「人工确认后并入权威件」的动作（`--out evidence-holes-verdict.json` 即并入）。脚本头注释写明
  **侧车 → 人工确认 → 并入权威件** 流程与理由（此前裸跑/终验每次都重打权威件的 generatedAt，
  git status 里那份常驻 M 即由此来）；输出行加判决落点标注（sidecar / 显式 --out）。
- 消费方核查：全仓无工具把权威判决件当输入（triage-exec-failures:649 自己从行里算）；
  面板 emit-round-report 本就走 `--out` 指到自己侧车目录（:834），行为不变。
- 验证：裸跑 `EVIDENCE_HOLES_RESULT=PASS` 且**权威件 md5 前后一致**（本次收口对它零写入；
  其未提交的工作树改动按嘱不动）；`--selftest` PASS。

### T7 —— r10new#A 两套去向账归并（门侧为唯一真值源）
- `reports/audit/round-7/incident-destinations-round10.json`（面板侧）：头部加
  `$archived: true`、`$archivedAt`、`$archivedBy`、`$truthSource: reports/audit/round-7/real-coverage-disposition.json`
  与 `$archivedNote`（降级归档不删；新增去向一律改写真值源；撤 RCD_DUAL 时本件同步退役）。
  **rows 一字未动**——RCD_DUAL 与面板读者（emit-round-report EMIT_DESTINATIONS）的输入面保持可比。
- 门侧 `real-coverage-disposition.json` 不动（本来就是核对门的登记册，词表权威在门）。
- RCD_DUAL 门确认在 `verify-real-coverage-disposition.mjs`（:184-219；verify-status-vs-disposition 是
  另一把尺子——台账 status 列 vs 处置列的矛盾检测，与去向账无关）。两脚本各跑一次：
  `RCD_RESULT=PASS（10 条欠账条条有在册去向…）RCD_DUAL 状态=compared 只在本册=0 只在面板册=0 去向不一致=0`；
  `DISPO_RESULT=ADVISORY 13 行`（与改前基线逐字相同）。
- **记档：归并完成，下轮可撤 RCD_DUAL**（撤门时同步把 emit-round-report 的 EMIT_DESTINATIONS 切到真值源，
  该改动属面板参数语义，留给下轮）。

### T8 —— real-coverage DISPATCHABLE_NOW 1 条（次要18|TD03）真跑
- 载具探测：后端 8080 LISTENING；自动化 IDE 实例在 9420（`ws-channel-up` `WS_UP=OK`，apiMode=real）。
  第一次腿失败（`cant find runtimeid by projectpath` ⇒ real 档项目窗口未开）——按仓库口径先
  `open-project-window.mjs --project D:/6/恋爱小程序/apps/client/dist/build/mp-weixin-real`
  （`OPENWIN_RESULT=OK`，probe route=pages/login/index）再跑。
- 执行（Node22）：
  `node scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-real --out reports/audit/round-7/exec-td03-ruling-closure-r10n --manifests 次要18 --real-cases-only --identity A --tap --native-capture`
  → `RUNNER_RESULT=OK`，88 行（次要18 全 manifest），identity=A `loginVerify=logged-in userId=100158`，
  产帧 7 张落 `reports/screenshots/round-7-exec/`。
- **TD03 行**：`status=EXECUTED  band=real@f0677920  identity=A`（observed：.reply-input/.reply-btn present、
  tap 腿下发记录在行内）。产出目录首次误名 `ruling-closure-td03-r10n`，因门只认 `exec-*` 前缀目录
  （verify-real-coverage.mjs:116），按命名约定更名 `exec-td03-ruling-closure-r10n`，内容字节不变。
- 门读数：`REALCOV_UNCOVERED 10→9`、`REALCOV_COVERED 198→199`，TD03 离开 UNCOVERED 点名表；
  去向册按设计记 `STALE 次要18|TD03（advisory，收账不是出事）`，RCD 守恒 OK。
- **如实划界**：本腿买到的是覆盖账的那一格（真实档+判过+身份轴），**不是判据 ①–⑥ 全判**——
  observed 明记「输入腿动词对不上元素，退回点击」「钩子不在位(取件时 __qaNativeHooked=false)」；
  判全仍欠建议书原文点名的两项能力（参数化输入值+回读、networkFault）与一次 replies 服务端回读
  （去向册 cost 列原话）。未把任何格子改判成"已过"——EXECUTED 是执行器自己落的行为判决。

### T9 —— #11 / #29c 设备腿（待设备跑；已裁未执行）
- **#11 booked 复测腿**（判据出处：decisions §11/§32『每一组落地对须有 booked 复测腿或裁决』；
  判据台=`scripts/qa/guest-landing-policy.json` 28 组 + `verify-guest-landing.mjs` 的 landingStatus 与
  stable 地板 `max(MIN_STABLE_SAMPLES=2, repeat)`）：
  1. `node scripts/qa/open-project-window.mjs --project D:/6/恋爱小程序/apps/client/dist/build/mp-weixin-real`
  2. `node22 scripts/qa/verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real`
     （自带 UI 租约；写 `guest-landing-measured.json`，merge-never-shrink 保护旧账）
  3. `node22 scripts/qa/verify-guest-landing.mjs --mode book`（回读落 `guest-landing-booked.json`）
- **#29c 落地对 (c) 腿**（判据出处：decisions §29:237-290 存档的 (a) 路径『对那 5 页用 --identity guest
  与 --identity A 各跑一条腿，让 9 个 key 变成可归属』；5 组/9 key 清单以
  `triage-exec-failures` 的 landingGroups / 面板 `landingMissing` 现量为准）：
  1. `node22 scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-real --out reports/audit/round-7/exec-landing-c-guest --real-cases-only --identity guest --tap --native-capture --manifests <5组所在manifest,逗号分隔>`
  2. 同上换 `--identity A --out reports/audit/round-7/exec-landing-c-a`
  （游客腿预期落 `FAILED-guest-gate-by-ruling`——判红与裁定同向；登录腿走受控摘除）。
- **run-qa-selftests 预期行为**：#11 腿跑完之前该门**仍红**（`test-guest-landing-writeguard` 14 断言、
  `test-guest-landing` 5 断言；其中"锚点不可核"两条指向 `vip/index.vue:50/:63` 行漂移——腿重拍后若仍不可核，
  需按行漂移重锚，属机械修正、不可离线编造），这是**已裁定未执行**的预期红，不是新缺陷。

### T10 —— §36 台账落账（机器名册归零）
- `reports/audit/round-7/decisions-v33.md`：
  - 名册块 20 行中 13 行 open → 按定义挪移：**closed=13**（原 4：#8/#15/r10new#B/r10new#E ＋ 新收
    #1/#7/#10/#12/#24/#28/r10new#A/r10new#D ＋ r10new#C）、**half_closed=7**（原 3：#5/#9/#14 ＋ 新收
    #3/#6/#11/#29c）、**open=0**；`PENDING_RULINGS_END open=0 half_closed=7 closed=13`（20 守恒）。
    每行 options= 记裁定结果＋2026-10-06＋执行态，basis= 记出处（ruling-recommendations-2026-10-06.md）
    与盘上证据；#11/#29c/#3/#6 按其口径归 **half_closed（已裁未跑/所有者专办）**，不虚报 closed。
    **r10new#C 补记**：本报告初稿把它记 half_closed（按建议书原文"由你执行"），主会话在收口前已按采纳
    建议执行完毕（两枚 worktree 均 0 脏文件后 `git worktree remove` 成功，reasonix 载体 HEAD=53c82b69、
    .qoder 载体 HEAD=a4c8f995，`git worktree prune` 已跑、空目录 .qoder/worktrees 与 .qoder 已删、
    两枚分支已 `git branch -D` 且 SHA 留档，`git worktree list` 现仅剩主工作树）⇒ 名册已挪 closed，
    挪移理由注「2026-10-06 已执行：双 worktree 零脏移除+双分支删除，SHA 53c82b69/a4c8f995 留档」。
  - BEGIN 行 head= 更新为当前 HEAD c088e2d6（手写维护件，解析器不消费该字段，仅留痕）。
  - 末尾补 §36.2「2026-10-06 全量采纳」叙事（引用建议书与 release-size-recheck-2026-10-05）。
- **连带（机器契约两处，非可选）**：
  - `scripts/qa/gen-round8-report.mjs`：『切不出 open ⇒ 必是解析打架』守卫收窄——全量采纳后的合法归零
    （status 全在词表内 **且** 尾部计数与逐行自洽）不再被误读成"未读名册"；不自洽的零照旧退回并明印。
  - `scripts/qa/test-ruling-roster.cjs`：D 组 `open>0` 过期钉子改为派生不变量（从真册逐行复算 open 数与
    生成器 §6 对账）；新增 E 组正反例（合法归零 → source=roster/§6 如实印 0；尾部不自洽的零 → 退回+明印）。
  - `scripts/qa/test-report-decision-buckets.cjs`：修掉基线即红的一枚过期钉子（"§5 必在待拍板清单"——
    名册里 #5 早已 half-closed），改为按名册逐行复算的 status 断言成员资格。
  - 验证：`test-ruling-roster` PASS（A/B/C/D/E 全绿）；`test-report-decision-buckets` PASS（0 失败，改前 1 失败）；
    生成器对真册 `GENREPORT_SECTION6_SELFCOUNT heading_number=0 … source=roster`，bucket_guard OK。

## 2. 门禁前后状态表

| 门/自测 | 前 | 后 | 说明 |
|---|---|---|---|
| verify-ledger（round-6） | PASS | PASS | 3 行 4 列落账后回读；STATUS_VOCAB_BAD=0 |
| verify-ops-corpus-stamp --check | PASS | FAIL→（--write 重打）PASS | sanctioned 判据更正被如实点名，按既定路径重打 |
| verify-source-shape --dry | OK（未裁半句=1） | OK（未裁半句=0） | 8 判据台行成立、负例 42/42 咬动 |
| verify-provenance-all（带库） | FAIL（PRE_STAMP=4881） | FAIL（PRE_STAMP=4881） | 144 帧转 LEGACY_EXEMPT；残余红=用户裁定 #25 已知历史红，不许豁免 |
| verify-provenance-all（无库） | FAIL（断链 149） | FAIL（断链 5＋LEGACY_EXEMPT 144） | round-1 144 帧不再误读为证据丢失；豁免不外溢 |
| test-prov-dialect | PASS(20) | PASS(20) | 豁免分支不碍方言负例 |
| verify-real-coverage | FAIL UNCOVERED=10 | FAIL UNCOVERED=9 | TD03 收账；余 9 条=7 NEEDS_CAPABILITY+1 IDENTITY_IMPOSSIBLE+1 BAND_CHANGE |
| verify-real-coverage-disposition（含 RCD_DUAL） | PASS（10/10 有去向，DUAL 一致） | PASS（9/9＋STALE 1 advisory，DUAL 一致 0 diff） | **归并完成，下轮可撤 RCD_DUAL** |
| verify-status-vs-disposition | ADVISORY 13 | ADVISORY 13 | 与基线逐字相同（新增判据文本无欠款标记词） |
| verify-rulings-landed | FAIL 未落地=1 | FAIL 未落地=1 | 同一枚 ChatInput.vue 缺日期标记，基线即红，与本收口无关 |
| verify-evidence-holes（judge） | PASS（覆写权威件） | PASS（写侧车） | 权威件 md5 前后一致 |
| verify-evidence-holes --selftest | PASS | PASS | 判据负例照咬 |
| test-ruling-roster | PASS | PASS | D 组派生化＋E 组正反例 |
| test-report-decision-buckets | FAIL(1) | PASS(0) | 过期钉子"§5 必在待办"改为名册派生不变量 |
| test-real-coverage-disposition | PASS(61) | PASS(61) | 归并标记不碰 rows |
| test-source-shape-lg31 / absence | PASS(98) / PASS(242) | PASS(98) / PASS(242) | SPEC 两处修订不伤判点 |
| run-qa-selftests（聚合） | FAIL（3 个测试） | FAIL（2 个测试） | buckets 已修绿；余 2 个=#11 一族（已裁定未执行，§9） |

## 3. 未竟事项（全部是"已裁定、缺执行"，无一虚报）

| 项 | 缺什么 | 阻塞原因 | 精确动作 |
|---|---|---|---|
| #11 | 一次设备 booked 复测腿 | 需 DevTools+租约（本环境已具备，留待统一设备窗） | §9 命令 1-3 |
| #29c | 落地对 (c) 两条腿（guest+A） | 同上 | §9 命令模板 |
| #3 | MESSAGES-INDEX-002 的一次 real 腿 | 同上（判据侧已迁 real 带） | real 窗已验证可开（§1.T8 同法），腿按 MSG06/NotLoggedWaiting 载体跑 |
| real-coverage 余 9 条 | 7 条 NEEDS_CAPABILITY（nativeModal/networkFault/WS 子树/precondition 四类原语）、1 条 IDENTITY_IMPOSSIBLE（先一次只读核实）、1 条 BAND_CHANGE（VB03→showcase 档） | 均为去向册登记在案的能力件/载具件，非本轮判域 | 按去向册 cost 列逐条补能力后跑腿 |
| #6 | sanitize 在目标库 COMMIT | 数据不可逆，归所有者 | database/sanitize/prod-sanitize.sql（默认 ROLLBACK） |
| #10 尾巴 | 真 HTTPS+ICP 域名 | 运营材料，只有所有者有 | docs/wechat-submission-materials-checklist.md |
| 面板读者切换 | EMIT_DESTINATIONS 改读真值源 | 属面板参数语义（判域），随撤 RCD_DUAL 一并做 | 下轮 |

## 4. 本程改动的全部文件（git 可核）

- `reports/audit/round-7/decisions-v33.md`（名册 13 行＋尾部计数＋head=＋§36.2）
- `reports/audit/round-6/issue-matrix.md`（3 行 4 列，经 patch-ledger-cells，留 .pre-cellpatch.bak）
- `reports/audit/round-6/ops/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json`（CH22 判据正文，留 .pre-ruling28-20261006.bak）
- `reports/audit/round-7/ops-corpus-stamp.json`（sanctioned 重打，留 .pre-stamp-write.20261006-160619.bak）
- `reports/audit/round-7/incident-destinations-round10.json`（头部归档标记，rows 未动）
- `reports/audit/round-7/ledger-plan-ruling-closure-2026-10-06.json`（新增 plan 件，仓库既有体例）
- `scripts/qa/verify-source-shape.mjs`（T2 bands+豁免注、T4 CH22 判据行）
- `scripts/qa/verify-provenance-all.mjs`（T5 LEGACY_EXEMPT 窄分支＋守恒＋输出行）
- `scripts/qa/verify-evidence-holes.mjs`（T6 侧车缺省＋流程注释）
- `scripts/qa/gen-round8-report.mjs`（T10 归零守卫收窄）
- `scripts/qa/test-ruling-roster.cjs`、`scripts/qa/test-report-decision-buckets.cjs`（T10 连带自测）
- 新增证据目录：`reports/audit/round-7/exec-td03-ruling-closure-r10n/`（TD03 腿 exec-results.json）；
  7 张帧落既有共享目录 `reports/screenshots/round-7-exec/`
- 新增侧车：`reports/audit/round-7/evidence-holes-verdict.sidecar.json`（judge 判决，待人工确认并入）
- **未动**：`reports/audit/round-7/evidence-holes-verdict.json`（md5 校验一致）、round-1~6 历史证据、
  apps/ 产品代码、database/。
