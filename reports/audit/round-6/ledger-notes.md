# Round-6 台账收编账目 · ledger-notes.md

配套：`reports/audit/round-6/issue-matrix.md`（本轮唯一权威台账）。本文件只记账：170 条怎么落成行、并了谁、推翻了谁、门禁实测多少。生成时点 2026-09-25 10:00:29Z。

- HEAD `874ff52f`。判决输入：`.zcode/tmp/ledger-reconcile/reconcile.json`（383 条判决：NEW_ADMISSION 170 / ALREADY_IN_MATRIX 157 / DUPLICATE_OF 38 / NOISE 18）+ `.zcode/tmp/admission/lane-{A,B,C,C2,C3,C4,D}.json`（170 条回源码重判）。
- 聚合按 `lane-[A-Z]\d*.json` 匹配七片；只匹配 `lane-[A-Z].json` 会静默漏掉 `lane-C2/C3/C4` 三片（本会话曾因此把 116 数成 82）。
- 收编不改判：status 逐字取 lane 的 `verdict`，severity 逐字取 lane 的 `suggestedSeverity`。

## 一、170 条 → 160 本尊行 + 10 条并 canonical

| 路 | 条数 | 待修复 | 已修复待复验 | 保留-判据不成立 | 未取证 |
|---|---|---|---|---|---|
| A | 38 | 28 | 8 | 1 | 1 |
| B | 30 | 18 | 4 | 8 | 0 |
| C | 20 | 16 | 1 | 3 | 0 |
| C2 | 18 | 12 | 3 | 3 | 0 |
| C3 | 18 | 11 | 2 | 5 | 0 |
| C4 | 17 | 11 | 4 | 2 | 0 |
| D | 29 | 20 | 7 | 2 | 0 |
| **合计** | **170** | **116** | **29** | **24** | **1** |

10 条按 A 路另报**不新增行**（第二节）→ 第一节本尊行 = 170 − 10 = **160**，行内状态分布：待修复 112 / 已修复待复验 23 / 保留-判据不成立 24 / 未取证 1。
覆盖面 32 个页面/模块（pages/* 11 + subpackages/* 15 + components/config/utils/tmp 等 6）。类别分布：UI 51 / Consistency 25 / Architecture 21 / Function 16 / Regression 15 / MiniProgram 12 / Interaction 10 / UX 9 / Data 7 / Performance 4。

### severity 分布（reconcile 原判 → 本轮重判）

| severity | 原判 | 重判 |
|---|---|---|
| P0 | 2 | 0 |
| P1 | 13 | 3 |
| P2 | 51 | 24 |
| P3 | 53 | 37 |
| P4 | 51 | 101 |
| 撤销 | 0 | 5 |

共 66 条改档（以下调为主），P0 2→0、P1 13→3；C3 路对判据不成立的 5 条直接给 `NONE`，行内记作「撤销（原判 P2/P3）」，不占 severity 档位。

## 二、A 路 10 条「自带 canonical 且 canonical 已在册」→ 不新增行

reconcile 判 NEW_ADMISSION，但缺陷正文/源码修复注释点名了一个已在历史台账有本尊行的号 → 属**换号重发**，不是漏立。只登记别名关系，不复制历史行正文。

| 本轮新号 | canonical（在册本尊行） | 重判 | 并册理由 |
|---|---|---|---|
| MP-R2-PAGES-NEARBY-INDEX-011 | MP-R1-PAGES-NEARBY-INDEX-016〔reports/audit/round-1/issue-matrix.md:171〕 | STILL_OPEN | 正文自述「R1-PAGES-NEARBY-INDEX-016（顶部 padding 双机制并存互相覆盖）未修复」，round-1 有本尊行 → 换号重发 |
| MP-R2-PAGES-NEARBY-INDEX-012 | MP-R1-PAGES-NEARBY-INDEX-017〔reports/audit/round-1/issue-matrix.md:172〕 | STILL_OPEN | 正文自述「R1-017（reportLocation 节流时间戳请求前置写入）未修复」，核到 utils/location.ts:156-158 原样 |
| MP-R2-PAGES-NEARBY-INDEX-013 | MP-R1-PAGES-NEARBY-INDEX-018〔reports/audit/round-1/issue-matrix.md:173〕 | STILL_OPEN | 正文自述「R1-018（校园圈入口恒用静态 SCHOOLS）未修复」 |
| MP-R2-PAGES-NEARBY-INDEX-015 | MP-R1-PAGES-NEARBY-INDEX-012〔reports/audit/round-1/issue-matrix.md:167〕 | FIXED_IN_HEAD | A 路：PostCard 内嵌 ActivityCard 报名死按钮的复验记录，修复注释 PostCard.vue:215-216 逐字引用 R1-012 |
| MP-R2-PAGES-NEARBY-INDEX-016 | MP-R1-PAGES-NEARBY-INDEX-013〔reports/audit/round-1/issue-matrix.md:168〕 | FIXED_IN_HEAD | A 路：登出后残留动态的复验记录，nearby/index.vue:617-619 注释逐字引用 R1-013 |
| MP-R2-PAGES-NEARBY-INDEX-017 | MP-R2-PAGES-NEARBY-INDEX-002〔reports/audit/round-2/issue-matrix.md:135〕 | FIXED_IN_HEAD | A 路：onPullDownRefresh 死 catch 的复验记录，index.vue:152-153 注释逐字引用已在册的 -002 |
| MP-R2-PAGES-NEARBY-INDEX-018 | MP-R2-PAGES-NEARBY-INDEX-003〔reports/audit/round-2/issue-matrix.md:136〕 | FIXED_IN_HEAD | A 路：三分区失败态的复验记录，:458/:567/:610 三处注释逐字引用已在册的 -003 |
| MP-R2-PAGES-HOME-INDEX-102 | MP-R3-PAGES-HOME-INDEX-002〔无本尊行·仅提及于 reports/audit/baseline/regression-index.json〕 | STILL_OPEN | 正文自述「历史 MP-R3-PAGES-HOME-INDEX-002 home-images-via-unified-media-exit 未落地/回归」；canonical 在册于基线回归索引（无矩阵正文行，见遗留 7） |
| MP-R2-PAGES-HOME-INDEX-103 | MP-R3-PAGES-HOME-INDEX-003〔无本尊行·仅提及于 reports/audit/baseline/regression-index.json〕 | FIXED_IN_HEAD | 正文自述「历史 MP-R3-PAGES-HOME-INDEX-003 旅行圈 icon 指向不存在文件」回归，且 HEAD 已修 → 双重不该新立 |
| MP-R2-PAGES-MESSAGES-INDEX-017 | MP-R1-PAGES-MESSAGES-INDEX-007〔reports/audit/round-1/issue-matrix.md:219〕 MP-R1-PAGES-MESSAGES-INDEX-008〔reports/audit/round-1/issue-matrix.md:220〕 MP-R1-PAGES-MESSAGES-INDEX-009〔reports/audit/round-1/issue-matrix.md:221〕 MP-R1-PAGES-MESSAGES-INDEX-010〔reports/audit/round-1/issue-matrix.md:222〕 MP-R1-PAGES-MESSAGES-INDEX-011〔reports/audit/round-1/issue-matrix.md:223〕 | FIXED_IN_HEAD | R1-PAGES-MESSAGES-INDEX-006..018 P2 簇复核记录，5 个子项 canonical 逐条在 round-1/issue-matrix.md:219-223 有本尊行 |

- 这 10 条里 4 条重判 STILL_OPEN（NEARBY-011/-012/-013 + HOME-102）、6 条 FIXED_IN_HEAD → 状态**跟 canonical 行走**，本轮证据只作 canonical 行的复验注记；
- `MP-R2-PAGES-HOME-INDEX-102/-103` 的 canonical `MP-R3-PAGES-HOME-INDEX-002/-003` 只活在 `reports/audit/baseline/regression-index.json:4130/4146` 与 `baseline/historical-issues.md:445`，**任何轮次矩阵里都没有带正文的本尊行** → 并册后这两条缺陷在全仓矩阵中仍无正文描述（遗留 7，本轮不代写历史）。

## 三、38 条 DUPLICATE_OF 并 alias（0 新增行）

reconcile 实测判 DUPLICATE_OF **38 条**，题面写「35 条 alias」，差 3 条。收编以输入文件为准（38 条全收），未做任何剔除——数据里不存在能支撑「只并 35 条」这个切分的字段（按 -R/-RNN 结尾的复验锚点切是 9 条，按正文自述「回归核对记录（非新缺陷）」切是 14 条，都对不上 35）。
逐条核 canonical：38/38 条的 canonical **不在 383 孤儿名单**（历史矩阵已有本尊行），0 条指向本轮新号 → 全部并入既有行，本轮矩阵 0 新增行，只在第三节登记别名。

| 重复号 | canonical | canonical 本尊行 | 类别 | 并入理由 |
|---|---|---|---|---|
| MP-R1-PUBLISH-001-R | MP-R1-PUBLISH-001 | reports/audit/round-1/regression-report.md:197 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-PUBLISH-001 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R1-PUBLISH-CLUSTER-R | MP-R2-PUB-107 | reports/audit/round-2/issue-matrix.md:392 | Regression | 条目正文自述同族在册锚点（MP-R2-PUB-107），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-CAMPUSPOST-009 | MP-R1-CAMPUSPOST-002 | reports/audit/round-1/audit-report.md:67 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-CAMPUSPOST-002 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-CIRCLES-INDEX-001 | MP-R2-CIRCLES-001 | reports/audit/round-2/issue-matrix.md:414 | MiniProgram | 【源码复核推翻 finding 的 status=待修复】胶囊避让已落地：apps/client/src/subpackages/circles/circles/index.vue:23 import useMenuButtonRec… |
| MP-R2-CIRCLES-INDEX-002 | MP-R2-CIRCLES-001 | reports/audit/round-2/issue-matrix.md:414 | Data | 【源码复核推翻 finding 的 status=待修复】源码注释自述同病灶：apps/client/src/subpackages/circles/circles/index.vue:247「MP-R2-CIRCLES-INDEX-… |
| MP-R2-CIRCLES-INDEX-R01 | MP-R1-CIRCLE-004 | reports/audit/round-1/regression-report.md:225 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-CIRCLE-004 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-MATCHING-015 | MP-R2-MATCHING-011 | reports/audit/round-2/issue-matrix.md:337 | MiniProgram | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R2-MATCHING-011 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-PAGES-HOME-INDEX-101 | MP-R2-PAGES-HOME-INDEX-001 | reports/audit/round-2/issue-matrix.md:65 | Regression | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-001），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-104 | MP-R2-PAGES-HOME-INDEX-011 | reports/audit/round-2/issue-matrix.md:75 | Architecture | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-011），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-107 | MP-R2-PAGES-HOME-INDEX-004 | reports/audit/round-2/issue-matrix.md:68 | Consistency | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-004），同页同缺陷链；按 G5「补证据不新增 ID」并入。 ⚠ 证据锚点命中构建窗口桩化路径（apps/client/src/stores/circle/moc… |
| MP-R2-PAGES-HOME-INDEX-108 | MP-R2-PAGES-HOME-INDEX-002 | reports/audit/round-2/issue-matrix.md:66 | Consistency | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-002），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-109 | MP-R2-PAGES-HOME-INDEX-006 | reports/audit/round-2/issue-matrix.md:70 | UI | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-006），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-113 | MP-R2-PAGES-HOME-INDEX-003 | reports/audit/round-2/issue-matrix.md:67 | Interaction | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-003），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-114 | MP-R2-PAGES-HOME-INDEX-008 | reports/audit/round-2/issue-matrix.md:72 | Architecture | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-008），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-115 | MP-R2-PAGES-HOME-INDEX-009 | reports/audit/round-2/issue-matrix.md:73 | Consistency | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-009），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-116 | MP-R2-PAGES-HOME-INDEX-015 | reports/audit/round-2/issue-matrix.md:79 | UX | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-015），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-117 | MP-R2-PAGES-HOME-INDEX-014 | reports/audit/round-2/issue-matrix.md:78 | Interaction | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-014），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-118 | MP-R2-PAGES-HOME-INDEX-010 | reports/audit/round-2/issue-matrix.md:74 | Consistency | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-010），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-HOME-INDEX-119 | MP-R2-PAGES-HOME-INDEX-013 | reports/audit/round-2/issue-matrix.md:77 | Consistency | 条目正文自述同族在册锚点（MP-R2-PAGES-HOME-INDEX-013），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PAGES-MESSAGES-INDEX-015 | MP-R1-PAGES-MESSAGES-INDEX-004 | reports/audit/round-1/audit-report.md:50 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-PAGES-MESSAGES-INDEX-004 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否… |
| MP-R2-PAGES-MESSAGES-INDEX-016 | MP-R1-PAGES-MESSAGES-INDEX-005 | reports/audit/round-1/audit-report.md:51 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-PAGES-MESSAGES-INDEX-005 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否… |
| MP-R2-PROFILE-020 | MP-R1-PROFILE-201 | reports/audit/round-1/audit-report.md:53 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-PROFILE-201 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-PROFILE-021 | MP-R1-PROFILE-202 | reports/audit/round-1/audit-report.md:54 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-PROFILE-202 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-PROFILE-026 | MP-R2-PROFILE-006 | reports/audit/round-2/issue-matrix.md:159 | Architecture | 条目正文自述同族在册锚点（MP-R2-PROFILE-006），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PROFILE-027 | MP-R2-PROFILE-011 | reports/audit/round-2/issue-matrix.md:164 | Consistency | 条目正文自述同族在册锚点（MP-R2-PROFILE-011），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PROFILE-028 | MP-R2-PROFILE-012 | reports/audit/round-2/issue-matrix.md:165 | Consistency | 条目正文自述同族在册锚点（MP-R2-PROFILE-012），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PROFILE-029 | MP-R2-PROFILE-018 | reports/audit/round-2/issue-matrix.md:171 | Function | 条目正文自述同族在册锚点（MP-R2-PROFILE-018），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PROFILE-030 | MP-R2-PROFILE-014 | reports/audit/round-2/issue-matrix.md:167 | Data | 条目正文自述同族在册锚点（MP-R2-PROFILE-014），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PROFILE-031 | MP-R2-PROFILE-017 | reports/audit/round-2/issue-matrix.md:170 | Consistency | 条目正文自述同族在册锚点（MP-R2-PROFILE-017），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-PROFILE-032 | MP-R2-PROFILE-016 | reports/audit/round-2/issue-matrix.md:169 | Interaction | 条目正文自述同族在册锚点（MP-R2-PROFILE-016），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-VILLAGE-INDEX-R04 | MP-R1-VILLAGE-INDEX-101 | reports/audit/round-1/audit-report.md:57 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-VILLAGE-INDEX-101 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-VILLAGE-INDEX-R05 | MP-R1-VILLAGE-INDEX-102 | reports/audit/round-1/audit-report.md:58 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-VILLAGE-INDEX-102 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-VILLAGE-INDEX-R06 | MP-R3-VILLAGE-INDEX-002 | reports/audit/round-1/audit-report.md:56 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R3-VILLAGE-INDEX-002 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-VILLAGE-POST-R01 | MP-R1-POST-001 | reports/audit/round-1/issue-matrix.md:331 | Regression | 条目正文自述同族在册锚点（MP-R1-POST-001），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R2-VILLAGE-POST-R02 | MP-R1-POST-101 | reports/audit/round-1/audit-report.md:61 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R1-POST-101 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R2-VILLAGE-POST-R03 | MP-R2-VILL-013 | reports/audit/round-1/audit-report.md:62 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R2-VILL-013 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |
| MP-R3-CAMPUS-INDEX-001 | MP-R2-CAMPUSINDEX-004 | reports/audit/round-2/issue-matrix.md:233 | Regression | 条目正文自述同族在册锚点（MP-R2-CAMPUSINDEX-004），同页同缺陷链；按 G5「补证据不新增 ID」并入。 |
| MP-R3-CAMPUS-INDEX-002 | MP-R2-CAMPUSINDEX-003 | reports/audit/round-2/issue-matrix.md:232 | Regression | 回归核对记录（非新缺陷）：正文逐字复核 canonical MP-R2-CAMPUSINDEX-003 的修复是否仍在位，结论=已修复/已验证。应作为该行的证据+状态更新（round-2 复验注记），不得另立新行，否则总数不收敛。 |

这 38 个重复号在 issue-matrix 第三节以「单元格首 token」形态逐条点名，门禁按 ID 正则能命中；canonical 仍留在原轮次矩阵，**未从别处复制历史行文本进本轮充数**。

## 四、18 条 NOISE 逐条处置

| ID | 类型 | 出处 | 处置与理由 |
|---|---|---|---|
| MP-R1- | ID_RE 截断串 | reports/audit/round-2/findings/VISUAL-WAVE2.json:770 | 正则截断产物（通配/散文写法在 ID_RE 处断句），无对应缺陷实体。出处 reports/audit/round-2/findings/VISUAL-WAVE2.json:770 |
| MP-R1-CIRCLES-001 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json:31 | 仅在 round-1/page-compare/次要20.md:115 作为『已修』注记出现，无任何矩阵本尊行/簇行；round-2 的 MP-R2-CIRCLES-001 是「等 N 位朋友加入」捏造数据，非同缺陷 → 幽灵锚点，不得据此立账。 |
| MP-R1-DETAIL-006 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/次要18.json:440 | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| MP-R1-HOME-015 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/PAGES-HOME-INDEX.json:308 | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| MP-R1-HOME-REG-007-018 | 源码复核推翻（簇/过期证据） | reports/audit/round-2/code-findings/PAGES-HOME-INDEX.json:issues/MP-R1-HOME-R… | 【源码复核推翻 finding 的 status=待修复】簇核对记录而非缺陷号：正文是 R1「HOME-REG-007..018」11 项簇的回归核对小结（10 项代码层在位、1 项偶发白屏单列）。10 项各自的 canonical 行已在 round-1 台账在册，残留的白屏项在 harvest.json 以工作项 R12-IND… |
| MP-R1-PUBLISH-002 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json:193 | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| MP-R1-PUBLISH-005 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json:… | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| MP-R1-PUBLISH-006 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json:… | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| MP-R1-SETTINGS-002 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/次要19.json:98 | R2 新发现正文以「历史 MP-R1-SETTINGS-002 同类问题」类比；台账 0 本尊行（round-1 只有簇行 MP-R1-SETTINGS-001-002 的 001 侧），且 MP-R2-SETTINGS-002 是深色模式三态开关，不同缺陷 → 幽灵锚点。 |
| MP-R2- | ID_RE 截断串 | reports/audit/round-2/findings/VISUAL-WAVE2.json:770 | 正则截断产物（通配/散文写法在 ID_RE 处断句），无对应缺陷实体。出处 reports/audit/round-2/findings/VISUAL-WAVE2.json:770 |
| MP-R2-CIRCLES-INDEX- | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/findings/VISUAL-WAVE2.json:770 | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| MP-R2-HOME-INDEX-103 | 写错的引用号（真实内容已另立） | reports/audit/round-2/interact/exec-results.json:817 | 交互用例标题写成 MP-R2-HOME-INDEX-103，全台账 0 行；其所指「旅行圈封面空白」的真实内容是本轮新立案 MP-R3-PAGES-HOME-INDEX-003（mock 旅行圈 icon 指向不存在的 travel.svg），属串号而非独立缺陷。 |
| MP-R2-MSG-003 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/interact/exec-results.json:4831 | 用例标题引用号在全部轮次台账 0 行；最近似的 round-1/issue-matrix.md:1653 MP-R1-MSG-003 是「活动推荐卡空 targetUrl 无反馈」，与「会话头像 @error 兜底」不同缺陷 → 幽灵锚点。 |
| MP-R2VIS- | ID_RE 截断串 | reports/audit/round-2/findings/VISUAL-WAVE2.json:16 | 正则截断产物（通配/散文写法在 ID_RE 处断句），无对应缺陷实体。出处 reports/audit/round-2/findings/VISUAL-WAVE2.json:16 |
| MP-R2VIS-REPORTS-AUDIT-SCREENSHOT-MANIFEST-001 | 源码复核推翻（簇/过期证据） | reports/audit/round-2/findings/VISUAL-WAVE2.json:issues/MP-R2VIS-REPORTS-AUDI… | 【源码复核推翻 finding 的 status=待修复】证据已过期不可采信：实测 reports/audit/round-2/screenshot-manifest.json 的 gitSha 已是 18c91ccf（finding 称「两份均硬编码 aefd8a72」），shots 数=254（finding 称「仅 8 sho… |
| MP-R3 | ID_RE 截断串 | reports/audit/round-2/findings/VISUAL-WAVE2.json:770 | 正则截断产物（通配/散文写法在 ID_RE 处断句），无对应缺陷实体。出处 reports/audit/round-2/findings/VISUAL-WAVE2.json:770 |
| MP-R3-VILLAGE-POST-001-002 | 幽灵锚点（12 轮台账 0 本尊行） | reports/audit/round-2/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json:27 | 幽灵锚点：全 12 轮台账（含 round-1..5 / r8 / r11 / r12 / baseline 回归索引 / historical-issues）grep 0 本尊行、0 簇成员命中；该串仅作为 R2 切片正文/coverage/测试用例标题的『历史线索』引用存在，无缺陷正文与 file:line 复现证据 → 不得凭… |
| R12-IND-HOME-001 | 非 MP 工作代号 | reports/audit/round-2/code-findings/PAGES-HOME-INDEX.json:issues/R12-IND-HOME… | 非 MP 台账锚点：harvest.all[].id 里的 R12 工作项代号（R12-IND-HOME-001，见 harvest.json 该记录 status=保留/监控）。verify-ledger.mjs 第 31 行 map(x=>x?.id) 未按 /^MP-/ 过滤，把它计入 NOT_IN_ANY_MATRIX，属工… |

不立账计数：截断串/非 MP 代号 5 条（门禁本身按 MALFORMED_TOKEN 处理，不判在册也不判孤儿）；幽灵锚点 10 条（正文亦无缺陷实体，多数只在 round-1 的「已修」注记或簇行里被顺带提过）；证据过期/簇写法/写错引用号 3 条。18 条全部在 issue-matrix 第四节留名，不复制进第一节。

## 五、被推翻的继承结论清单

reconcile 的继承状态（字段 `ledgerStatus`）与本轮 lane 重判不一致的共 59 条：

| 继承 → 本轮 | 条数 |
|---|---|
| 待修复 ⇒ 保留-判据不成立 | 20 |
| 待修复 ⇒ 已修复待复验 | 22 |
| 待修复 ⇒ 未取证 | 1 |
| 已验证 ⇒ 已修复待复验 | 1 |
| 已修复待终验 ⇒ 已修复待复验 | 6 |
| 待裁决 ⇒ 待修复 | 5 |
| 待裁决 ⇒ 保留-判据不成立 | 4 |

### 5.1 判据不成立（24 条 NOT_A_DEFECT，按否证类型归并）

| ID | 路 | 原判级 | 否证类型 | 依据（本轮实测） |
|---|---|---|---|---|
| MP-R2-CAMPUSPOST-010 | C | P3 | 触发前提在 HEAD 不可达 | 判据触发前提（上传阶段在 catch 之前抛错、顶替陈旧 errorMessage）在 HEAD 已不可达：real 模式图片上传链路被能力开关整体关闭（本域已知事实：后端 CreateCampusTopicRequest 无 images 字段），mock 模式不经 campusStore.… |
| MP-R2-CAMPUSPOST-012 | C | P4 | 回源码核对后判据事实不成立 | 每图唯一 vs 重试幂等本为二选一权衡，且当前 real 模式该路径整体关闭（后端无 images 字段，见 -201 注释）。按开关挡掉不立的处置，不单立开放项。 ; 无需修。留档：若开关翻 true，文件名含 Date.now() 使重试幂等失效（后端 @Idempotent 对 /med… |
| MP-R2-CAMPUSPOST-015 | C | P4 | 命中用户/产品裁定豁免 | 本条主张的是「两页上传流程近似重复→抽公共工具」，属被用户裁定豁免的跨页重复族（两个发布页/多处重复不合并=产品裁定，残余差异不逐立）。唯一具体差异是 village 文件名无每图序号，但逐张 await 顺序执行、同毫秒碰撞概率极低，且 campus 侧该路径 real 整体关闭，非活跃缺陷… |
| MP-R2-PAGES-REGISTER-INDEX-015 | B | P4 | 回源码核对后判据事实不成立 | 被后端源码否证「客户端有可用机器码通道」这一隐含判据：RegisterValidationException 以 super(BAD_REQUEST, userFacingCode, userFacingCode) 同值下发，而 ErrorMessages.PHONE_ALREADY_REGI… |
| MP-R2-PROFILE-033 | B | P4 | 触发前提在 HEAD 不可达 | 判据被两点否证：①「backdrop-filter 仅 H5 条件编译」出自 reports/audit/2026-09-18-r11-full-acceptance/acceptance-plan.md 附录 B（非权威说明文档），且 eslint.config.mjs / scripts/… |
| MP-R2-PUB-112 | C4 | P2 | 命中用户/产品裁定豁免 | 直接命中已知裁定 #2『两个发布页并存不合并=用户裁定，别立重复缺陷』。且其支撑事实已在 HEAD 失效：原判据『post 全文仅 :574 clientApi.deleteDraft()』所指越权删后端草稿已随 MP-R2-POST-011 整段删除（post.vue:672-676），所述… |
| MP-R2VIS-PAGES-LOGIN-INDEX-002 | B | P2 | 判据取自说明文档/铁律正文，理想图或源码不支持 | 「52px」出自说明文档正文 deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:156，非理想图。理想图主按钮实测高 71px，按帧宽 641px=375pt 折算 ≈41.5px；实现 --btn-height-md=96rpx=48px(th… |
| MP-R2VIS-PAGES-LOGIN-INDEX-003 | B | P2 | 判据取自说明文档/铁律正文，理想图或源码不支持 | 理想图 素材/理想效果图/登录页面.png 两行墨迹实测 33px / 29px（折算字号 ≈21px / ≈19px）——两行本就不同尺寸，「规范两行均 28px」是文档正文口径且与图不符；实现 40rpx=20px 与主句实测一致，副句 30rpx=15px 偏小约 4px，属字级微调而非… |
| MP-R2VIS-PAGES-LOGIN-INDEX-004 | B | P2 | 理想图逐像素实测否证 | 有效色被算错：--c-text-primary=#1A1E1C(design-variables.scss:114) × opacity .55 叠在 --c-bg-page=#EEF7F2(:120) 上 = ≈#79807C（对比 ≈3.5:1），不是 reviewer 写的 #9AA39… |
| MP-R2VIS-PAGES-LOGIN-INDEX-005 | B | P2 | 说明文档造出幻影元素，理想图无此元素 | 「副标题句尾粉色小爱心」只出现在说明文档正文（全站设计规范与逐页设计稿说明.md:156），属幻影组件：权威理想图 素材/理想效果图/登录页面.png 副标题「慢慢成为特别的人」实测无粉心（#FF6B81±45 全帧扫描仅命中插画肤色杂点 x522-680/y493-632，均值 RGB≈(2… |
| MP-R2VIS-PAGES-LOGIN-INDEX-008 | B | P3 | 理想图逐像素实测否证 | 「理想图无此重复」为误读：素材/理想效果图/登录页面.png 本身即顶部品牌区「寻觅 / 遇见同频的人」+ 图下「遇见同频的人 / 慢慢成为特别的人」，实测两处文字带 y166-205 与 y751-783，与实现一致，属产品意图。 ; 不改（改了会偏离理想图）。 |
| MP-R2VIS-PAGES-LOGIN-INDEX-009 | B | P4 | 回源码核对后判据事实不成立 | 对被引帧做逐行像素复核：toast 深色框 y388-425（x102-276），H1「遇见同频的人」墨迹 y426-443（x129-247）——两带相邻但不重叠，标题完整可辨；原卡置信度 0.5 且自陈「1x 帧位置判读，未做像素级双证」，像素级双证后「遮挡 H1」被否证。 ; 无需按缺陷… |
| MP-R2VIS-PAGES-MESSAGES-INDEX-006 | A | P1 | 理想图逐像素实测否证 | **推翻 reconcile 的 NEW_ADMISSION**：判据的事实前提为假。「mock 会话 unreadCount 全 0」不成立——mockSessions 实际种子为 unreadCount: 2 / 0 / 3 / 1 / 1 / 5（mock-data.ts:19/32/4… |
| MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-005 | C3 | P2 | 判据取自说明文档/铁律正文，理想图或源码不支持 | 结论被三重否证：①本页列表源是静态 config（hub.vue:17 import { SCHOOLS }），不是 store；②配置端点 DTO CampusView 无 coverUrl 字段，故 :56 的 `s.coverUrl` 分支在 HEAD 恒 undefined，实际取值只… |
| MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-005 | D | P3 | 回源码核对后判据事实不成立 | 推翻本条：唯一残留的「面板与输入栏同为 --c-bg-container 仅一条 1rpx 淡线」（EmojiPanel.vue:76-77 vs chat-session/index.vue:2593/:2868）是页面多处注释自述的「微信 1:1」既定取向，判据出处 §3.7 属 repo… |
| MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-A01 | D | P4 | 回源码核对后判据事实不成立 | 推翻本条：mp-weixin 与 H5 均支持 env()，有无兜底在受支持引擎上渲染结果逐字相同，无用户可见差异；且四处不叠加已由 Wave-2 判定 ; 不立缺陷；若要统一，作为 stylelint 规则级 nit 处理 |
| MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-003 | C3 | P3 | 说明文档造出幻影元素，理想图无此元素 | 两半都不成立。①比例：按卡内容宽反解三图约 205×190rpx＝1.08，与参考 1.18 差不足 10%，而参考值来自「÷2.272」的猜测缩放（素材/理想效果图/圈子详情，摄影圈参考.png 与实测帧机型不同）；报告给的修法「高度降至 160rpx」会把比例推到约 1.28，偏离更远。②… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-003 | C2 | P3 | 回源码核对后判据事实不成立 | 被源码否证：判据的「从校园圈/兴趣圈/话题列表深链（栈深 1）」在站内不成立——这些入口都走 openAppPath → navigateTo，栈深 ≥2，goBack 走 navigateBack 原路返回。getCurrentPages().length === 1 只剩分享卡/编译直达两… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-004 | C3 | P2 | 回源码核对后判据事实不成立 | real 分支的推荐源是 GET /village/{id}/similar-authors，后端在候选池阶段就剔除帖子作者：VillageQueryService.java:919 取 postAuthorId、:933-935 filter `!id.equals(postAuthorId… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-002 | C2 | P2 | 触发前提在 HEAD 不可达 | 被源码否证：判据成立的前提是「服务端相对路径会落到这处 :src」，而 HEAD 无任何可达路径——images.value 只接受 chooseImages/compressImages 的本地临时路径（wxfile://、http://tmp/，mp <image> 原生支持），后端 /m… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-003 | C3 | P3 | 判据取自说明文档/铁律正文，理想图或源码不支持 | 被规则原文否证：铁律 6 的限定语是「iOS WebView 装饰 image 加 pointer-events:none 防吞点击」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:118），本处图标位于 .publish-tip__titl… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A02 | C4 | P3 | 回源码核对后判据事实不成立 | 原为『待裁决』。真正的缺陷风险——看着像能点却点了没反应的可点假象——已在 HEAD 消除：该行剥离了所有交互线索。残留仅 label『添加位置』+无城市时 meta『选择位置』的字面措辞，属 :859/:872-874 记录的『固定只读』产品意图，判为 NOT_A_DEFECT（判据的可点假… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A03 | C2 | P2 | 触发前提在 HEAD 不可达 | 被源码否证：弹层行项与守卫读同一个 joinedCircles getter（circles.filter(c => c.isJoined) 再 slice），凡被渲染出来的行必 isJoined=true，:213 的 return 在常规、深链、脏数据（后端 isJoined 缺失 → u… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A04 | C3 | P3 | 量化实测否证（色值/尺寸/取值） | 报告自认「非死按钮」。「浅绿但仍可点、点下去告诉你缺什么」是两页逐字一致的 tap-to-explain 设计（publish.vue:734 与 post.vue:731 结构相同），控件确实可用，aria-label 也如实标为「发布」→ 语义未失配。被引为口径来源的 aria-disab… |

其中 5 条（`MP-R2VIS-PAGES-LOGIN-INDEX-002/-003/-004/-005/-008`）与已记录的 **design-spec 文档漂移**同源：判据取自 `deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:156` 的正文口径，而权威理想图 `素材/理想效果图/登录页面.png` 像素实测相反（主按钮高 71px 而非 52px、两行字号本就不等、无粉色爱心）。按硬要求「判据来自说明文档正文而理想图不支持的直接落到保留-判据不成立」处置，置信不给 ≥0.7。`MP-R2-PROFILE-033` 同理——「backdrop-filter 仅 H5 条件编译」出自 round-11 验收计划正文，非设计判据。

### 5.2 已修（29 条 FIXED_IN_HEAD，逐条带 statusEvidence）

推进状态的前提是写出「修在哪的 file:line」，issue-matrix 第一节 statusEvidence 列逐条填 HEAD 锚点（多数为 git log -S + 修复注释逐字引用本 ID 的双锚）。其中 6 条（NEARBY-015/016/017/018、HOME-103、MESSAGES-017）的锚点指向**自己的历史号**，已落在第二节并册、不在第一节。

| ID | 路 | statusEvidence（修在哪） |
|---|---|---|
| MP-R2-CIRCLES-INDEX-009 | C | apps/client/src/subpackages/circles/circles/index.vue:159-197 goToCircleHome 体内仅 openAppPath，无局部 useSessionStore；全文 useSessionStore 仅 :13 import + … |
| MP-R2-PAGES-HOME-INDEX-103 | A | apps/client/src/static/assets/icons/common/travel.svg (git show --name-status HEAD → A) |
| MP-R2-PAGES-LOGIN-INDEX-016 | B | apps/client/src/pages/login/index.vue:733 |
| MP-R2-PAGES-MESSAGES-INDEX-017 | A | apps/client/src/stores/messages.ts:588-613 |
| MP-R2-PAGES-NEARBY-INDEX-015 | A | apps/client/src/components/village/PostCard.vue:215-218 |
| MP-R2-PAGES-NEARBY-INDEX-016 | A | apps/client/src/pages/nearby/index.vue:594-620 |
| MP-R2-PAGES-NEARBY-INDEX-017 | A | apps/client/src/pages/nearby/index.vue:147-168 |
| MP-R2-PAGES-NEARBY-INDEX-018 | A | apps/client/src/pages/nearby/index.vue:458-480,564-588,607-616 |
| MP-R2-POST-009 | C2 | apps/client/src/subpackages/village/village/post.vue:199 + :840 + :313 + :294-300；apps/client/src/stores/circle.ts:293-294 |
| MP-R2-POST-010 | C3 | apps/client/src/subpackages/village/village/post.vue:181,266,683,702（并 :528-531 / :604） |
| MP-R2-POST-011 | C4 | apps/client/src/subpackages/village/village/post.vue:672-676（注释自证越权 deleteDraft 已删）; :450-507 restoreDraft 仅读本地; grep clientApi.(get/save/delete)Dr… |
| MP-R2-POST-012 | C2 | apps/client/src/subpackages/village/village/post.vue:27 + :357；apps/client/src/utils/media.ts:384-391 |
| MP-R2-POST-014 | C4 | apps/client/src/subpackages/village/village/post.vue:672-676（deleteDraft 调用整体移除）; grep '.catch(() *=> *{})' 本页 0 命中 |
| MP-R2-PROFILE-022 | B | apps/client/src/components/profile/NotLoggedProfile.vue:159,168 |
| MP-R2-PROFILE-023 | B | apps/client/src/pages/profile/index.vue:769-771,1813,2033,218-220,1550-1551 |
| MP-R2-PROFILE-035 | B | apps/client/src/pages/profile/index.vue:1573-1575,1593-1595 |
| MP-R2-PUB-113 | C2 | apps/client/src/subpackages/village/village/publish.vue:416-430（hasDraftContent）+ :442（flushDraftSave 闸）+ :454（scheduleDraftSave 闸，双端写入前）+ :500（res… |
| MP-R2VIS-CONFIG-IMAGES-001 | D | git log --diff-filter=A -1 -- apps/client/src/static/assets/icons/common/paw.svg → 874ff52f（HEAD，'round-2 audit fixes'）；实测 apps/client/src/static/a… |
| MP-R2VIS-PAGES-HOME-INDEX-001 | A | apps/client/src/components/home/RelationActivity.vue:121-125 |
| MP-R2VIS-PAGES-HOME-INDEX-002 | A | apps/client/src/components/home/InviteBanner.vue:110-115 |
| MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-003 | C4 | 朋友数已同规则：index.vue:279-283 friendJoinedCount=raw>0?raw:5+(seed%8) 与 circle-home.vue:209-215 完全一致；正常导航读同一 store：circle-home.vue:79-80 circles.find(id… |
| MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-002 | D | apps/client/src/components/profile/public/PublicHero.vue:23 `<view class="public-hero__top-gradient" />`（模板已挂）+ :62-69 `.public-hero__top-gradient{… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-001 | C4 | post.vue:1519-1522 .post-row__label{font-size:var(--fs-lg,28rpx); color:var(--c-text-primary,#1A1E1C)} — 三级色 #9AA39F 已改主文本令牌、height 属性已整条删除；publish… |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-003 | C3 | apps/client/src/subpackages/village/village/publish.vue:1070（HEAD 新增 .publish-sheet__panel：70vh + calc(safe+48rpx)）↔ post.vue:1651-1658 |
| MP-R2VIS-THEME-DESIGN-VARIABLES-001 | D | apps/client/src/theme/design-variables.scss:187-190 收敛说明注释 + :191-197 唯一一组 $radius-*；全仓 grep '^\s*\$radius-[a-z0-9]*\s*:' 在 theme/ 与 styles/ 仅 7 命中… |
| MP-R2VIS-THEME-DESIGN-VARIABLES-002 | D | 后果点已修：apps/client/src/subpackages/tools/activities/detail.vue:504-511 `.detail-cover__badge{background:var(--c-badge-on-image-bg, rgba(15,23,42,0.7… |
| MP-R2VIS-TMP-TOUR-R2-001 | D | tmp/tour-R2.mjs:175-186 mock wx.getLocation 回固定坐标、:201-211 mock wx.authorize→success、:213-224 mock wx.getSetting 回报 scope.userLocation/scope.record… |
| MP-R2VIS-TMP-TOUR-R2-002 | D | tmp/tour-R2.mjs:344-347 `function frameHash(buf)`（sha256 前 16 位）+ :352 调用点 + :28-29 自述 A-2 = frameHash/decideFrameFiling；.zcode/tmp/tour-R6.mjs:372… |
| MP-R2VIS-TMP-TOUR-R2-003 | D | tmp/tour-R2.mjs:361-368 probeRoute() 取 getCurrentPages() 栈顶 route（:361 注释明确弃用 currentPage().path 因跳转在途滞后）+ :29 A-3 = probeRoute + save() 内 shot.rou… |

### 5.3 未取证（1 条）

- `MP-R2-PAGES-MESSAGES-INDEX-014`（lane-A，P1→P4）：代码半可静态确认（`apps/client/src/stores/messages.ts:272` 预览原样透传、无脱敏），数据半需一次只读 SQL（`private_messages id=3894` / `private_conversations id=461` 当前是否仍在）；本轮工作树被巡检独占，未并发打库。另注：即便确认也是需授权的 DB 清理项（DELETE 不可逆），不该进客户端缺陷台账。

### 5.4 A 路另报「不该新立」14 条中除并册外的 4 条重定性

| ID | 原继承 | 本轮 | 理由 |
|---|---|---|---|
| MP-R2VIS-PAGES-MESSAGES-INDEX-006 | 新立 P1 待修复 | 保留-判据不成立 | 判据前提为假：`stores/messages/mock-data.ts:19/32/45/53/65/72` 的 unreadCount 是 2/0/3/1/1/5，且该文件在 HEAD、`18c91ccf`、`29a2b1df` 三档逐字一致（git show 比对）→ 撰写时就非「全 0」，不是后来修好的。截图无角标的真因是 `pages/messages/index.vue:299/:315` 每次 onShow 调 markAllSessionsRead（`stores/messages.ts:1366-1371`），属用户裁定的红点闭环；按原判据补 mock 种子是无效动作 |
| MP-R2VIS-PAGES-MESSAGES-INDEX-005 | 新立 P1 | 待修复（重定性 P4） | real 契约存在（`apps/api` MessageDashboardController.java:28 + MockMessageDashboardController.java:34 均实现该端点且含 warmPeople）→ 生产不受影响，本条实为 mock 构建的取证覆盖缺口，不是产品缺陷 |
| MP-R2VIS-PAGES-HOME-INDEX-001 / -002 | 新立 P1 | 已修复待复验（P1→P4） | 源码注释逐字引用本 ID 且修复在位；同意 reconcile 的结论但反对其 P1 定级与「新立」动作——属回归核对行 |

### 5.5 推翻的家族归并（reconcile dupFamilies 14 组序号巧合，全部拒收）

reconcile 的 94 组 dupFamilies 按「页 + 序号」跨轮配对。凡本轮新号作 canonical 的 14 组，逐组读正文核对后 **14/14 是序号巧合**，不构成同一缺陷，一律不写进别名列（写了就是替门禁凑绿）：

| reconcile 主张的组 | 本轮新号实际判据 | 该 alias 实际判据 | 本轮另核出的真实 canonical |
|---|---|---|---|
| MP-R2-PAGES-NEARBY-INDEX-011 ↔ MP-R1-PAGES-NEARBY-INDEX-011 | R1-PAGES-NEARBY-INDEX-016（页面顶部 padding 双机制并存互… | useTabBar 文档注释 tab 顺序过期误导调用方（上轮条目复核，未修）：注释写「t… | MP-R1-PAGES-NEARBY-INDEX-016〔reports/audit/round-1/issue-matrix.md:171〕 |
| MP-R2-PAGES-NEARBY-INDEX-012 ↔ MP-R1-PAGES-NEARBY-INDEX-012 | R1-PAGES-NEARBY-INDEX-017（reportLocation 节流时间… | PostCard 内嵌 ActivityCard 的「报名」按钮全链无监听（死按钮，组件事… | MP-R1-PAGES-NEARBY-INDEX-017〔reports/audit/round-1/issue-matrix.md:172〕 |
| MP-R2-PAGES-NEARBY-INDEX-013 ↔ MP-R1-PAGES-NEARBY-INDEX-013 | R1-PAGES-NEARBY-INDEX-018（校园圈入口恒用静态 SCHOOLS，从… | 登出/换号后 villageStore.nearbyPosts 不清理 + 分区⑤模板 v… | MP-R1-PAGES-NEARBY-INDEX-018〔reports/audit/round-1/issue-matrix.md:173〕 |
| MP-R2-PAGES-NEARBY-INDEX-014 ↔ MP-R1-PAGES-NEARBY-INDEX-014 | 首次进入本页活动列表接口重复请求一次（上轮稿已发现，未修复）：onLoad → loadN… | 模板硬编码中文「 人加入」绕过 i18n：圈卡成员数后缀写死在模板插值里，i18n 体系已… | 未另核出（本号即首次立案，或正文未点名历史号） |
| MP-R2-PAGES-NEARBY-INDEX-015 ↔ MP-R1-PAGES-NEARBY-INDEX-015 | R1-PAGES-NEARBY-INDEX-012（PostCard 内嵌 Activit… | 三处 .catch(() => {}) 为死防御代码：①107 行 reportLocat… | MP-R1-PAGES-NEARBY-INDEX-012〔reports/audit/round-1/issue-matrix.md:167〕 |
| MP-R2-PAGES-NEARBY-INDEX-016 ↔ MP-R1-PAGES-NEARBY-INDEX-016 | R1-PAGES-NEARBY-INDEX-013（登出/换号后上一账号附近动态残留渲染）… | 页面顶部 padding 双机制并存互相覆盖、注释口径互斥：模板根节点内联 padding… | MP-R1-PAGES-NEARBY-INDEX-013〔reports/audit/round-1/issue-matrix.md:168〕 |
| MP-R2-PAGES-NEARBY-INDEX-017 ↔ MP-R1-PAGES-NEARBY-INDEX-017 | 上轮稿发现「下拉刷新 Promise.catch 是死路径、刷新失败用户无感知」已修复并复… | reportLocation 节流时间戳在请求前置写入：lastReportAt = no… | MP-R2-PAGES-NEARBY-INDEX-002〔reports/audit/round-2/issue-matrix.md:135〕 |
| MP-R2-PAGES-NEARBY-INDEX-018 ↔ MP-R1-PAGES-NEARBY-INDEX-018 | 上轮稿发现「三个数据分区失败态被静默或伪装成空态」已修复并复核：分区②兴趣圈补齐骨架→错误… | 校园圈入口恒用静态 SCHOOLS，从不调用 loadSchools() 后端校区列表：c… | MP-R2-PAGES-NEARBY-INDEX-003〔reports/audit/round-2/issue-matrix.md:136〕 |
| MP-R2-PAGES-MESSAGES-INDEX-019 ↔ MP-R1-PAGES-MESSAGES-INDEX-019 | 活动推荐卡「查看详情」CTA 死按钮风险：卡片与 CTA 无条件渲染，openActivi… | 头部缺「+（发起会话）」入口：理想基线明确消息页头部右侧为「放大镜 + 加号（发起会话）」… | 未另核出（本号即首次立案，或正文未点名历史号） |
| MP-R2-CAMPUS-HUB-010 ↔ MP-R1-CAMPUS-HUB-010 | 封面兜底链保证 school.coverUrl 恒为非空字符串（hub.vue:54-57… | 回归核对：5 处 UI 文案硬编码中文绕过 i18n——代码层确认已修复。当前模板全部用户… | 未另核出（本号即首次立案，或正文未点名历史号） |
| MP-R2-PAGES-HOME-INDEX-112 ↔ MP-R1-PAGES-HOME-INDEX-112 | mock fixtures 嵌套双重 resolveMediaUrl(resolveMed… | 兴趣推荐封面为线稿图标 svg 占位（大灰相机/旅行车/音符/餐盘线稿），非理想图的实景照… | 未另核出（本号即首次立案，或正文未点名历史号） |
| MP-R2-CIRCLES-INDEX-005 ↔ MP-R1-CIRCLES-INDEX-005 | scroll-view 无高度约束链，scroll-y 永不生效：.circles-lis… | 设计 token 强制违规（存在对应 token 而用字面量）：①硬编码字号——头部返回/… | 未另核出（本号即首次立案，或正文未点名历史号） |
| MP-R2-PAGES-REGISTER-INDEX-011 ↔ MP-R1-PAGES-REGISTER-INDEX-011 | 【本轮补录，承 MP-R1-PAGES-REGISTER-INDEX-008（09-22 … | 确认密码比对触发时机与设计规范 §6.1 不符，输入过程中即时报错造成红框噪声。设计规范（… | MP-R1-PAGES-REGISTER-INDEX-008〔reports/audit/round-1/issue-matrix.md:86〕 |
| MP-R2-PAGES-REGISTER-INDEX-012 ↔ MP-R1-PAGES-REGISTER-INDEX-012 | 【本轮补录，承 MP-R1-PAGES-REGISTER-INDEX-011（09-22 … | 短信发送相关 toast 文案硬编码中文、绕过 vue-i18n，与镜像页登录页已完成的同… | MP-R1-PAGES-REGISTER-INDEX-011〔reports/audit/round-1/issue-matrix.md:89〕 |

结论：`MP-R1-…` 与 `MP-R2-…` 的同序号不代表同一缺陷（附近页 R1↔R2 序号整体错位 3 位、注册页错位 1–2 位）。本轮改以「正文点名 + 修复注释逐字引用 + 历史本尊行 file:line」为唯一别名依据，核出 10 条并册（第二节）+ 10 条同缺陷承接（第一节别名列），其余 150 行老实写「无（本号首次立案）」。

## 六、置信与证据强度分布（第一节 160 行）

| 置信 | 行数 | 含义 |
|---|---|---|
| 0.7 | 7 | 本轮新帧（ID 被 round-6/ops 用例点名且该页在 screenshot-manifest 有帧）+ file:line 双证 |
| 0.6 | 40 | 理想图亲验 + file:line，无本轮新帧 |
| 0.5 | 111 | 纯代码静态推断（HEAD 复核） |
| 0.4 | 1 | 仅缺失型断言（grep 0 命中） |
| 0.3 | 1 | 未取证 |

没有任何一行凭「只有代码推断」拿到 ≥0.7；`已修复待复验` 的 23 行全部带 statusEvidence，无一行凭口头推进状态。

## 七、门禁实测原文（node22 直跑，未改脚本）

命令：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6`（PATH 上的 node 是 v16，不用它跑）。退出码 0。

```text
LEDGER_SOURCES=3 DISTINCT_IDS=313 MATRIX_IDS=1695 NOT_IN_ANY_MATRIX=0
MATRIX_IDS_CURRENT_ROUND=312 MATRIX_FILES=28 CURRENT_MATRIX_FILES=1
NOT_IN_CURRENT_ROUND_MATRIX=1（旧报"从未入账"、实际只在别的轮次/别的锚点形态在册）
LEDGER_ORPHAN_ALL=1（旧口径：只比对当前轮次五份矩阵）
LEDGER_ORPHAN_TRUE=0（扩矩阵集 + 锚点展开后仍无任何本尊行 → 硬失败依据）
LEDGER_CROSS_ROUND=1 LEDGER_ALIAS_HITS=0 LEDGER_CLUSTER_EXPANDED=0
LEDGER_MATRIX_CLUSTER_ANCHORS=51 LEDGER_CROSS_ROUND_MENTION_ONLY=0 LEDGER_ALIAS_AMBIGUOUS=0
LEDGER_MALFORMED_TOKENS=5（ID_RE 截断串/非 MP 工作代号，不算缺陷 ID，单列复核；其中 0 条旧口径被记成孤儿）
   312  matrix:reports/audit/round-6/issue-matrix.md
     1  interact/exec-results.json
     0  mode-dependent-issues.json
     6  matrix(其他轮次):reports/audit/2026-09-12-round1/audit-report.md
     1  matrix(其他轮次):reports/audit/2026-09-13-r3/audit-report.md
     4  matrix(其他轮次):reports/audit/2026-09-13-r5/audit-report.md
     1  matrix(其他轮次):reports/audit/2026-09-14-r6-editpage/audit-report.md
     9  matrix(其他轮次):reports/audit/2026-09-15-r7-full-verify/audit-report.md
    12  matrix(其他轮次):reports/audit/2026-09-16-r8-independent/audit-report.md
     3  matrix(其他轮次):reports/audit/2026-09-16-r9-newuser-lifecycle/audit-report.md
   255  matrix(其他轮次):reports/audit/baseline/historical-issues.md
   203  matrix(其他轮次):reports/audit/baseline/regression-index.json
   204  matrix(其他轮次):reports/audit/round-1/audit-report.md
   117  matrix(其他轮次):reports/audit/round-1/interaction-matrix.md
   865  matrix(其他轮次):reports/audit/round-1/issue-matrix.md
   118  matrix(其他轮次):reports/audit/round-1/regression-report.md
    34  matrix(其他轮次):reports/audit/round-1/screenshot-matrix.md
    76  matrix(其他轮次):reports/audit/round-2/audit-report.md
    67  matrix(其他轮次):reports/audit/round-2/interaction-matrix.md
   339  matrix(其他轮次):reports/audit/round-2/issue-matrix.md
    95  matrix(其他轮次):reports/audit/round-2/regression-report.md
     7  matrix(其他轮次):reports/audit/round-2/screenshot-matrix.md
    54  matrix(其他轮次):reports/audit/round-3/audit-report.md
    23  matrix(其他轮次):reports/audit/round-4/audit-report.md
  LEDGER_CROSS_ROUND MP-R2-PAGES-REGISTER-SUCCESS-002 @ reports/audit/round-1/issue-matrix.md
  MALFORMED_TOKEN MP-WEIXIN  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R1-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-CIRCLES-INDEX-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2VIS-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
LEDGER_MULTI_ID_FAMILIES=15（同一缺陷多 ID 的族数，>0 就说明台账没收敛）
  DUP_FAMILY MP-R*-PAGES-NEARBY-INDEX-011 ×2
  DUP_FAMILY MP-R*-PROFILE-001 ×2
  DUP_FAMILY MP-R*-PAGES-REGISTER-INDEX-011 ×2
  DUP_FAMILY MP-R*-PAGES-REGISTER-INDEX-012 ×2
  DUP_FAMILY MP-R*-PAGES-NEARBY-INDEX-016 ×2
  DUP_FAMILY MP-R*-PAGES-NEARBY-INDEX-012 ×2
LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法
```

### 7.1 佐证跑：同一份矩阵对 round-2 台账集的效果

`… scripts/qa/verify-ledger.mjs reports/audit/round-2`——round-2 才是真正持有 383 条孤儿来源的轮次（34 个台账源、750 个 distinct ID）。收编前基线：`LEDGER_ORPHAN_TRUE=211`、`NOT_IN_ANY_MATRIX=211`、`LEDGER_RESULT=FAIL`、退出码 1；收编后退出码 0。

```text
LEDGER_SOURCES=34 DISTINCT_IDS=750 MATRIX_IDS=1695 NOT_IN_ANY_MATRIX=0
MATRIX_IDS_CURRENT_ROUND=367 MATRIX_FILES=28 CURRENT_MATRIX_FILES=5
NOT_IN_CURRENT_ROUND_MATRIX=378（旧报"从未入账"、实际只在别的轮次/别的锚点形态在册）
LEDGER_ORPHAN_ALL=383（旧口径：只比对当前轮次五份矩阵）
LEDGER_ORPHAN_TRUE=0（扩矩阵集 + 锚点展开后仍无任何本尊行 → 硬失败依据）
LEDGER_CROSS_ROUND=362 LEDGER_ALIAS_HITS=13 LEDGER_CLUSTER_EXPANDED=3
LEDGER_MATRIX_CLUSTER_ANCHORS=51 LEDGER_CROSS_ROUND_MENTION_ONLY=6 LEDGER_ALIAS_AMBIGUOUS=0
LEDGER_MALFORMED_TOKENS=7（ID_RE 截断串/非 MP 工作代号，不算缺陷 ID，单列复核；其中 5 条旧口径被记成孤儿）
   339  matrix:reports/audit/round-2/issue-matrix.md
    67  matrix:reports/audit/round-2/interaction-matrix.md
     7  matrix:reports/audit/round-2/screenshot-matrix.md
    95  matrix:reports/audit/round-2/regression-report.md
    76  matrix:reports/audit/round-2/audit-report.md
   152  findings/VISUAL-WAVE2.json
    10  findings/WAVE2-AFFORDANCE-PENDING.json
    17  code-findings/PAGES-DISCOVER-INDEX.json
    29  code-findings/PAGES-HOME-INDEX.json
    19  code-findings/PAGES-LOGIN-INDEX.json
    35  code-findings/PAGES-MESSAGES-INDEX.json
    35  code-findings/PAGES-NEARBY-INDEX.json
    32  code-findings/PAGES-PROFILE-INDEX.json
    22  code-findings/PAGES-REGISTER-INDEX.json
     7  code-findings/PAGES-REGISTER-SUCCESS.json
    16  code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json
    15  code-findings/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json
    23  code-findings/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json
    17  code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json
    16  code-findings/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json
    18  code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json
    10  code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json
    18  code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json
    29  code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json
    30  code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json
    31  code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json
    49  code-findings/次要18.json
    33  code-findings/次要19.json
    26  code-findings/次要20.json
    31  code-findings/次要21.json
    24  code-findings/次要22.json
   113  interact/exec-results.json
   473  harvest.json
     0  mode-dependent-issues.json
     6  matrix(其他轮次):reports/audit/2026-09-12-round1/audit-report.md
     1  matrix(其他轮次):reports/audit/2026-09-13-r3/audit-report.md
     4  matrix(其他轮次):reports/audit/2026-09-13-r5/audit-report.md
     1  matrix(其他轮次):reports/audit/2026-09-14-r6-editpage/audit-report.md
     9  matrix(其他轮次):reports/audit/2026-09-15-r7-full-verify/audit-report.md
    12  matrix(其他轮次):reports/audit/2026-09-16-r8-independent/audit-report.md
     3  matrix(其他轮次):reports/audit/2026-09-16-r9-newuser-lifecycle/audit-report.md
   255  matrix(其他轮次):reports/audit/baseline/historical-issues.md
   203  matrix(其他轮次):reports/audit/baseline/regression-index.json
   204  matrix(其他轮次):reports/audit/round-1/audit-report.md
   117  matrix(其他轮次):reports/audit/round-1/interaction-matrix.md
   865  matrix(其他轮次):reports/audit/round-1/issue-matrix.md
   118  matrix(其他轮次):reports/audit/round-1/regression-report.md
    34  matrix(其他轮次):reports/audit/round-1/screenshot-matrix.md
    54  matrix(其他轮次):reports/audit/round-3/audit-report.md
    23  matrix(其他轮次):reports/audit/round-4/audit-report.md
   312  matrix(其他轮次):reports/audit/round-6/issue-matrix.md
  LEDGER_CLUSTER_HIT MP-R1-LIKES-103 <= 簇锚 MP-R1-LIKES-102-103 @ reports/audit/baseline/regression-index.json
  LEDGER_CLUSTER_HIT MP-R2-MSG-002 <= 簇锚 MP-R2-MSG-001-002 @ reports/audit/baseline/regression-index.json
  LEDGER_CLUSTER_HIT MP-R1-SETUPINTEREST-002 <= 簇锚 MP-R1-SETUPINTEREST-001-002 @ reports/audit/round-1/issue-matrix.md
  LEDGER_ALIAS_HIT MP-R1-004 ≈ MP-R1-PAGES-DISCOVER-INDEX-004 @ reports/audit/round-2/regression-report.md [核心词 DISCOVER]
  LEDGER_ALIAS_HIT MP-R1-007 ≈ MP-R1-PAGES-MESSAGES-INDEX-007 @ reports/audit/round-1/issue-matrix.md [核心词 MESSAGES]
  LEDGER_ALIAS_HIT MP-R1-008 ≈ MP-R1-PAGES-MESSAGES-INDEX-008 @ reports/audit/round-1/issue-matrix.md [核心词 MESSAGES]
  LEDGER_ALIAS_HIT MP-R1-011 ≈ MP-R1-PAGES-MESSAGES-INDEX-011 @ reports/audit/round-1/interaction-matrix.md [核心词 MESSAGES]
  LEDGER_ALIAS_HIT MP-R2-HOME-003 ≈ MP-R2-PAGES-HOME-INDEX-003 @ reports/audit/round-2/issue-matrix.md [核心词 HOME]
  LEDGER_ALIAS_HIT MP-R2-HOME-002 ≈ MP-R2-PAGES-HOME-INDEX-002 @ reports/audit/round-2/issue-matrix.md [核心词 HOME]
  LEDGER_ALIAS_HIT MP-R2-DISCOVER-001 ≈ MP-R2-PAGES-DISCOVER-INDEX-001 @ reports/audit/round-2/screenshot-matrix.md [核心词 DISCOVER]
  LEDGER_ALIAS_HIT MP-R2-DISCOVER-002 ≈ MP-R2-PAGES-DISCOVER-INDEX-002 @ reports/audit/round-2/screenshot-matrix.md [核心词 DISCOVER]
  LEDGER_ALIAS_HIT MP-R2-CHAT-002 ≈ MP-R2-CHAT-CHAT-SESSION-INDEX-002 @ reports/audit/round-2/issue-matrix.md [核心词 CHAT]
  LEDGER_ALIAS_HIT MP-R2-CHAT-003 ≈ MP-R2-CHAT-CHAT-SESSION-INDEX-003 @ reports/audit/round-2/issue-matrix.md [核心词 CHAT]
  LEDGER_ALIAS_HIT MP-R2-CHAT-004 ≈ MP-R2-CHAT-CHAT-SESSION-INDEX-004 @ reports/audit/round-2/regression-report.md [核心词 CHAT]
  LEDGER_ALIAS_HIT MP-R2-MATCH-SUCCESS-005 ≈ MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-005 @ reports/audit/round-2/issue-matrix.md [核心词 MATCH,SUCCESS]
  LEDGER_ALIAS_HIT MP-R2-MATCH-SUCCESS-001 ≈ MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-001 @ reports/audit/round-2/screenshot-matrix.md [核心词 MATCH,SUCCESS]
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-001 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-THEME-DESIGN-VARIABLES-001 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-002 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-003 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-004 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-005 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-006 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-007 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R1-PAGES-LOGIN-INDEX-201 @ reports/audit/round-1/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R1-PAGES-LOGIN-INDEX-004 @ reports/audit/round-1/audit-report.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-008 @ reports/audit/round-6/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2VIS-PAGES-LOGIN-INDEX-009 @ reports/audit/round-6/issue-matrix.md
  …LEDGER_CROSS_ROUND 另有 350 条（LEDGER_VERBOSE=1 全量打印）
  MALFORMED_TOKEN MP-WEIXIN  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-PUB-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2VIS-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R1-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-CIRCLES-INDEX-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN R12-IND-HOME-001  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
LEDGER_MULTI_ID_FAMILIES=94（同一缺陷多 ID 的族数，>0 就说明台账没收敛）
  DUP_FAMILY MP-R*-PROFILE-001 ×4
  DUP_FAMILY MP-R*-PAGES-HOME-INDEX-001 ×3
  DUP_FAMILY MP-R*-POSTTOPIC-001 ×3
  DUP_FAMILY MP-R*-VILLAGE-INDEX-001 ×3
  DUP_FAMILY MP-R*-SETTINGS-001 ×3
  DUP_FAMILY MP-R*-LIKES-001 ×3
LEDGER_RESULT=PASS；另有 7 条非 ID 截断串待改源头写法
```

两种跑法都 `LEDGER_ORPHAN_TRUE=0`：round-6 口径下 383 条孤儿靠本轮矩阵吸收后 `NOT_IN_ANY_MATRIX=0`，round-2 口径下 378/383 由跨轮·簇·缩写三类锚点救回、余下 5 条为 MALFORMED_TOKEN（不判孤儿）。

## 八、差额、遗留与工具缺陷（未动脚本，只记录）

1. **硬要求达成**：`LEDGER_ORPHAN_TRUE=0`（round-6 与 round-2 两种跑法均为 0，原文见第七节），差额 0，无需列举残余 ID。全部 170 新号 + 38 重复号 + 18 噪音号 = 226 个 ID 在矩阵里点名，一条不落。
2. 旧口径 `LEDGER_ORPHAN_ALL=1`（round-6 跑法）：`MP-R2-PAGES-REGISTER-SUCCESS-002` 只在 round-1/issue-matrix.md 有本尊行，本轮不复制历史正文，靠新门禁的跨轮判据救回（`LEDGER_CROSS_ROUND=1`）→ 设计如此，不是账实不符。
3. `LEDGER_MALFORMED_TOKENS=5`：`MP-R1-`、`MP-R2-`、`MP-R2VIS-`、`MP-R3`、`MP-R2-CIRCLES-INDEX-` 是第四节按原文登记的 NOISE 串，源头是 round-2 `findings/VISUAL-WAVE2.json` 的通配/散文写法。清零要改别人的轮次文件，本轮不改。
4. `LEDGER_MULTI_ID_FAMILIES=15` 现在**由别名登记本身触发**——同一行同时写新号与 canonical（如 MP-R2-PAGES-NEARBY-INDEX-011 + MP-R1-PAGES-NEARBY-INDEX-016），后缀归一化后必然 ×2。它已不表示「台账没收敛」，脚本第 271 行的判读文案需相应修正。
5. 台账扫描目录集缺 `ops/`：门禁只扫 roundDir 的 `findings/ code-findings/ interact/ regression/` + `harvest.json`，本轮 24 份 `reports/audit/round-6/ops/*.json`（用例正文引用 295 个去重 MP-* ID、其中 MP-R2-* 串 302 处）**不在扫描集内** → 用例↔缺陷的连线没进门禁，本轮 PASS 只覆盖 interact 已落的 ID。
6. 空集即 FAIL 的时序缺陷：17:52 巡检写入 `interact/exec-results.json` 之前，round-6 的 `allIds=0`，门禁直接 `LEDGER_RESULT=FAIL reason=台账扫描集为空` 退出码 2，哪怕同行 `LEDGER_ORPHAN_TRUE=0`。新轮次开局必然红。巡检后续往 interact 追加新号时该集合会继续变化，本台账只对写入时点负责——若之后出现新孤儿，属执行员侧新增 ID 未入册，不是本轮收编漏项。
7. `MP-R3-PAGES-HOME-INDEX-002/-003` 在册但全仓无带正文的本尊行（只活在被门禁当锚点用的 baseline 索引里）→ 门禁绿、账上读不到缺陷描述。建议下一轮在 canonical 侧补正文。
8. 历史矩阵存在**同 ID 两缺陷**：`MP-R1-PAGES-REGISTER-INDEX-002` 在 `reports/audit/round-1/issue-matrix.md:80`（isAdult 时区误拒）与 `:1582`（四处小控件热区）是同 ID 不同缺陷。纯 ID 锚定不足以表达对应关系 → 本轮别名列一律写成 `ID〔file:line〕`。
9. `round-6/interact/exec-results.json` 由巡检独占写入，其 1 个在册 ID 是本轮 PASS 的既有前提；本收编未触碰 `interact/`、`ops/`、`screenshot-manifest.json`，也未改 `scripts/qa/verify-ledger.mjs` 与 `.zcode/**`，未跑构建、未连开发者工具、未做 git 写操作。
10. 未收录的 157 条 ALREADY_IN_MATRIX：按硬要求不新增行、也不把历史行文本复制进本轮矩阵（那是充数）。它们的本尊行仍在原轮次，逐条对账可由 `node scripts/qa/verify-ledger.mjs reports/audit/round-2` 的 `LEDGER_CROSS_ROUND=362` 反查。

## 九、本轮修订记录（23:3x）

修订员＝台账修订员（本轮只改 `reports/audit/round-6/issue-matrix.md` 与本文件，未动代码、未动 `reports/**` 其他路径、未碰 `scripts/**`、未跑构建、未连 94xx、无 git 写操作）。运行器 `D:\codex-tools\node-v22.17.0-win-x64\node.exe`（v22.17.0）。

输入：`.zcode/tmp/fixwave/visual-rulings.json` 的 `ledger_fix_list`（10 条）+ `lane-{1..8}.json` + `closer.json` + `i18n-landed.json` + `i18n-wired.json`（落地证据）+ `.zcode/tmp/ledger-reconcile/reconcile.json`（dupFamilies 原始建议，本轮**未采纳任何一条**，理由见第五节既有结论：14 组全是「页+序号」巧合）。

方法：每条建议先**独立复验**再落笔。HEAD 侧全部用 `git show 874ff52f:<path>` 导出到 `.zcode/tmp/ledger-revise-23/head/`（27 份）按内容重找行号，工作树侧直接读盘——**不抄任何一侧的行号**（本轮 51 个前端文件被编辑过，行号普遍漂移 2–40 行）。

### 9.1 六件事各自做了什么

**① 10 条锚点修订：10 条全部落进行，其中 6 条按建议的字面落、6 条落但改了建议的行号/前提（无一条完全拒落）。** 逐条复验结论见 9.2。已改的行：`issue-matrix.md` 的 PUBLISH-004 / PROFILE-INDEX-004 / APPSHELL-001 / OTHER-001 / DISCOVER-013 / PROFILE-024 / MESSAGES-005 / REGISTER-014 / PUBLISH-005 / POST-015 十行，外加被 -005 顺带更正的 `MP-R2VIS-PAGES-HOME-INDEX-005` 一行（其原证据 `HomeHeader.vue:88 padding-left` 在 HEAD 与工作树都不是该属性，HEAD 真行 `:85` 是 `padding:` 简写的左值）。

**② 3 条状态推进（每条都写了 file:line 证据，未写证据的 0 条）**：

| ID | 推进到 | statusEvidence（本轮按内容重找，非抄收口批行号） |
|---|---|---|
| MP-R2VIS-PAGES-PROFILE-INDEX-004 | 已修复待复验（工作树） | `apps/client/src/components/profile/mine/MyHeader.vue:265-273`：:269 display:-webkit-box / :270 -webkit-box-orient / :271 -webkit-line-clamp:2 / :272 overflow:hidden / :273 text-overflow:ellipsis；HEAD 同选择器仅 :265-269 四行、无 clamp |
| MP-R2-PAGES-DISCOVER-INDEX-013 | 已修复待复验（工作树） | `apps/client/src/components/match/MatchInfo.vue:28-33`：:28 t("matchV1.online") / :29 t("discover.activeToday") / :31 t("discover.activeHoursAgo") / :33 t("discover.activeDaysAgo")；残留复查 `git grep 今天活跃\|小时前活跃\|天前活跃` 在组件层 0 命中，仅余 `stores/discover/types.ts:65` 注释 |
| MP-R2-POST-015 | 已修复待复验（工作树，本文件半边） | `apps/client/src/subpackages/village/village/post.vue:1773-1774` `page{background: var(--c-neutral-0,#FFFFFF)}`（HEAD :1770-1772 是裸 `#ffffff`） |

三条的共同保留意见（已写进各行的 status 列与 9.4）：**证据全部在工作树，HEAD `874ff52f` 未含**，而词表里 `已修复待复验`＝`FIXED_IN_HEAD` → 未提交即不算修，下轮复验须以提交后快照为准。POST-015 更只推进了「本文件半边」，同族 `publish.vue:1119-1121`、`village/index.vue:1379-1381` 实测至今仍是裸 `#ffffff`，「同批清零」不成立。

**③ ChatInput 两行合一**：保留 `MP-R2VIS-COMPONENTS-CHAT-CHATINPUT-A01`（组件侧），把 `MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-003`（消费页侧）从第一节移除、写进保留行的「历史别名」列并带原本尊行指针 `issue-matrix.md:128`。两行指同一枚死组件、互为「二选一」的同一处改点 → 属同一缺陷，可按别名列口径合并（不同于第五节那 14 组序号巧合）。

**④ 新开一行记 32rpx 残留**：`MP-R2VIS-PAGES-HOME-INDEX-006`（第一节，UI / P4 / 置信 0.6 / 待修复），锚点 `apps/client/src/components/home/TodayLoveProgress.vue:105 margin: 0 40rpx 20rpx`（HEAD 与工作树同行，本轮未触及该件）。severity 自定为 P4：与同族 -005 同档、量级是 8rpx(=4px@375) 的基线错位；置信 0.6 而非 0.7：本号未被 round-6/ops 用例点名（无本轮新帧连线），依据是理想图亲验 + file:line。判成 32rpx 的实测量测记录现在 `HomeHeader.vue:85-89` 的 -005 裁决注释里（首页.png 卡片左缘 x=33px≈29.0rpx，与 40rpx=45.5px 差 12.5px）。同页横向基线复核实测：`HomeHeader.vue:90`、`InviteBanner.vue:35` 走 var(--page-padding)，`TodayRecommendationCard.vue:113`、`RelationActivity.vue:85`、`CommunityFeed.vue:260` 是 32rpx 字面量 → 本枚是首页**唯一** 40rpx 消费者。按 -005 原话「同批处理否则只是换一处漂移」的口径单立一行，未并入 -005（-005 射程只含 HomeHeader+InviteBanner 两枚，本枚是收口后新查出的第三枚，属同族非同一缺陷）。

**⑤ 3 条「图不背书」裁决登记**（状态写 `未取证/需裁决`、置信按词表下限降到 0.3，不再写 `待修复`）：

| ID | 为什么不能定 | 一句代价 |
|---|---|---|
| MP-R2-CIRCLES-INDEX-005 | 判据是滚动架构（window 滚动 vs 内部 scroll-view），静态理想图无此维度；台账推荐的 A 案与 `AppShell.vue:250-254` 明文裁定「禁止锁死 height:100%」正面冲突 | A 案代价＝.shell 是全站共享外壳，锁高波及 15 个消费页并让 :306-314 的 sticky 头部失效（拿一条新缺陷换一条旧缺陷）；B 案代价＝模板 :386 的 scroll-y/:enhanced/:bounces 成误导性死属性；C 案代价＝要 --statusbar/胶囊实测值，本 wave 禁构建禁连工具，猜值即造新漂移 |
| MP-R2-CIRCLES-INDEX-007（后半） | 理想图**能**定浅色态、且定出来与现值相反（图 浅粉底 #FEEFF0 + 红字 #F30D23，码 饱和红底 rgba(255,77,92,.92) + 白字 #FFFFFF）；暗值全部理想图为浅色态、无帧可依 | A 案（新增成对令牌并给暗值）代价＝自创暗值＋把与理想图相反的配色固化成 token、每页复用一次错色；B 案（收编 --c-badge-on-image-*）代价＝语义错位（徽标在白卡上不在图片上）且剥夺暗色翻转；C 案（复用 --c-romance-50 #FFECEF / --c-romance-*，暗值由 tokens.scss:267-275 自动给出）代价＝是**改色不是转令牌**、超本条授权，需另立视觉变更行并给帧复验 |
| MP-R2-PAGES-HOME-INDEX-106 | 判据是状态机（成功后是否记住已喜欢），首页.png 今日推荐卡只画单一粉实心「喜欢」态、无已喜欢/置灰/回显第三态，round-6 清单亦无 liked/unliked 成对帧 | A 案（后端回 `liked`、前端单源）代价＝要改 apps/api 并重启 8080（本轮越权）＋重生成 TodayRecommendationView＋补 mock 分支；B 案（前端记本会话已喜欢集合并加 prop）代价＝刷新即丢、要给 Lane 2 名下组件新增 liked prop 与置灰态（现成键仅 discover.likeSent → 需新键）、改的是首页主 CTA 可点性且禁构建无法自证不破版 |

三行都不是「不修」：CIRCLES-007 的前半（:911 换 var(--c-brand,#36C99A)）与 HOME-106 的死状态删除半（likeSent 三行）本轮实测都已在工作树落地，行内已分别写明。

### 9.2 复验结果：哪几条没照建议改（附证据）

`ledger_fix_list` 的 10 条在**判据实质**上 10/10 复验成立、无一条被拒落；但其中 **6 条给出的行号或前提复验不通过**，落笔时按内容重找改正，未照抄。逐条：

| # | ID | 复验 | 与建议的差异（本轮实读值） |
|---|---|---|---|
| 1 | PUBLISH-004 | 成立，行号半拒 | `--card-radius: 40rpx`(design-variables.scss:652) ✓、`$radius-xl:24rpx`(:195)→`--r-xl`(:436) ✓、台账 :878,893,914,922,929 在 HEAD 全是模板/注释行 ✓、HEAD 字面量八处 :1000,1010,1019,1025,1033,1046,1054,1085 ✓ **逐字命中**。唯建议给的「工作树 1018,1028,1029,1037,1043,1051,1064,1066,1072,1082,1088」混入了 :1029/:1066（border-radius:50% 正圆）与 :1082/:1088（已 var()）且**漏了 :1103**（.publish-tip 20rpx）→ 本轮重算的字面量八处＝:1018,1028,1037,1043,1051,1064,1072,1103。另：「统一走 var(--r-xl)」只对 24rpx 那两处等值，其余 999/8/32/6/16/20rpx 无同值档 → 行内改写成分两档 |
| 2 | PROFILE-INDEX-004 | 全部成立 | HEAD `.my-header__bio` :265-269 ✓、工作树 :265-273 ✓、模板 :77 ✓、四属性齐备 ✓。**唯一未照做的**：建议要求「一并回改 Lane 6 分诊记录」——分诊记录是 `.zcode/tmp/fixwave/lane-6.json`，不在本轮可写面（只许改两份台账文件）→ 未改，行内留了指针（见 9.5） |
| 3 | APPSHELL-001 | 实质成立，**行号拒** | 台账 grep `sp-6`＝**0 命中**（修订前，现 1 命中＝本行）✓、matrix:31 那行 `grep circles`＝false ✓（全行只讲 MyHeader.vue:63 与 :187/:188 字面色，本轮复验 HEAD :63/:187/:188 三处逐字成立、images.ts:245 `CHECK_WHITE_SVG` 亦存在 → 该行**无需改动**，错挂不在它身上）。HEAD 三处锚点 :919-923 / :842-848 / :931-933 ✓ 逐字命中。**但建议的「收口后工作树 :925-930」复验不通过**：`git status` 显示 `.circles-tabs` 在工作树真实落在 **:945-951**（:949 `padding: 0`、:947-948 带本 ID 注释），:925-930 区间是 `.circles-header__search` 的胶囊避让注释块 → 按 :945-951 落笔 |
| 4 | OTHER-001 | 全部成立 | `api/profile.ts:21 location: "北京 · 北京大学"`（HEAD 与工作树同行）✓、`PublicIdentity.vue:22-30`（:26 解构位序不动、:27-28 push 顺序 age→school→city）✓ 逐字命中 → 建议的「解析位序不变、只改输出顺序」全句照落 |
| 5 | DISCOVER-013 | 实质成立，**前提拒** | 键命名空间部分逐字成立：zh-CN.ts:1038-1040 ✓、en-US.ts:932-934 ✓、matchV1 块起 :4781 且其下只有 :4782 online / :4785 sameSchool ✓、CardSwiper.vue:387,399 ✓、CardDetailOverlay.vue:350,359 ✓、MatchInfo 工作树 :28-33 ✓。**但「MatchCard.vue:32-48 在 HEAD 之后已 t() 化」这一前提复验不通过**：`git show 874ff52f:...MatchCard.vue` 的 :33/:46 在 HEAD **就已经**是 `t("matchV1.online")`/`t("matchV1.sameSchool")`，与工作树逐字相同 → 不是修好了、是台账立卡时把 MatchCard 读错了（该行原证据「33 return "在线"；46 return "同校"」在 HEAD 0 命中）。行内据此把 MatchCard 半边改判为「立卡证据为假、不列入射程」，真病灶只剩 MatchInfo 一处 |
| 6 | PROFILE-024 | 实质成立，**一处行号拒** | 292/296rpx+2env 两步算术复验成立（NotLoggedProfile 工作树 :451 bottom=calc(env*2+200rpx)、:452 height:92rpx；GlobalPublishFab :112 bottom 同值、:114 height:96rpx；`custom-tab-bar/index.wxss:17-18` height 160rpx+env + padding-bottom env+24rpx → 面板顶缘 184rpx+2env）✓、`pages/profile/index.vue:1828 v-if="isOwnProfile"` ✓ 逐字命中、`NotLoggedProfile.vue:161` ✓ 逐字命中。**GlobalPublishFab 锚点收紧**：建议写 :108-114，本轮按内容重锚改指 :112/:114。**「MyProfile.vue:73」复验不通过**：工作树 padding-bottom 实为 **:72**（:70-71 是本轮新增注释）→ 行内写 :72（并保留 HEAD :69 原值 120rpx 的对照）。另复核：收口确实按台账原口径落了 184rpx+2env、未擅自放大（两处注释自陈「钮顶缘 292rpx+2env，余差留台账复核」）→ 本条仍开放 |
| 7 | MESSAGES-005 | 实质成立，行号微调 | `api-types-supplement.ts:708-714` `MessageDashboardView` 五块全必填无 `?` ✓ 逐字命中；`stores/messages.ts` 合并块按内容重锚为 **:587-612**（建议写 :588-613，:587 才是 `if (Array.isArray(data.recentChats))`、:612 是闭合）；:597-599 保留 pinned/muted、:603-607 追加官方号 ✓ → 「只加种子不碰 store 逻辑」不存在最小路径，建议成立。**状态未照建议改判成「不成立」**：词表无「取证覆盖项」档，抹成 `保留-判据不成立` 会连带删掉真实存在的 mock 取证缺口 → 行内保留 `待修复` 并在 status 列写明重定性 |
| 8 | REGISTER-014 | 实质成立，**「全需重锚」拒** | 令牌侧全部逐字命中：design-variables.scss:359 `--c-text-inverse`（$text-inverse :108 = #FFFFFF）、styles/tokens.scss:244 暗值 #1A1F26、:235 `--c-bg-container` 暗值 #1A1F26、design-variables.scss:794 `--c-error-bg-tint: rgba(229,69,77,0.1)`、工作树漂移 :1036/:1119/:1136 与 :923/:1149/:1171 与 :878 已令牌化 **全部逐字命中**。**但「台账 :908,917,1023,1104,1134,1156 需按 HEAD 重锚」以偏概全**：六条里五条（:908/:917/:1104/:1134/:1156）对 HEAD 就是字面量所在行，只有 **:1023 错**（HEAD :1023 是 `}`，真行 :1021）→ 行内写成「五条成立、一条更正」而非全盘重锚，并补齐建议未点名的选择器归属（:923=.field--focus、:1149=.ghost-btn、**1171=.agree__chk**、:932=.field--error）。附带发现：台账原证据的 token 侧 `design-variables.scss:360` 也错一行（:360 是 --c-text-brand） |
| 9 | PUBLISH-005 | 实质成立，**HEAD 归属拒** | × 移除钮确为 `<text>` ✓、同族 post.vue 无 hover-class ✓、`publish.vue:788` 的 `<view>+hover-class+hover-stay-time="120"` 范式 ✓ **三处均按工作树逐字命中**。**但建议标注的「publish.vue:856，HEAD 同构」把行号归属写错了**：:856 是工作树行号，HEAD 874ff52f 的同构节点在 **:891**（HEAD :856 是 `.publish-row__meta`）；post.vue 同理 HEAD :984 / 工作树 :985。**且被当作「正确范式」引用的 :788 本身是本轮工作树新增**——HEAD :830 的 `.publish-image__remove` 只有 `<view>` 而无 hover-class → 范式未进 HEAD，行内已注明 |
| 10 | POST-015 | 全部成立，另补两处 | HEAD :1662-1664＝`.post-sheet__head` 的 align-items/justify-content/padding、无 background ✓、真锚点 `page{background:#ffffff}` HEAD :1770-1772 ✓、工作树 :1773-1774 已 var() ✓、同族工作树 publish.vue:1119-1121 与 village/index.vue:1379-1381 至今裸 `#ffffff` ✓ **逐字命中**。本轮另核出建议未点名的两处错锚：该行证据列的 `publish.vue:848-850` 是模板 `<view>`/hover-class 行（HEAD 真背景块在 :1101-1103），`theme/design-variables.scss:337/:907` 与 --c-neutral-0 无关（:337 是 --c-error-dark、:907 是 --c-overlay-white-bg-16；真定义＝:89 `$neutral-0:#FFFFFF` → :343 `--c-neutral-0`，且 **styles/tokens.scss 暗色块对该令牌 0 覆盖**，grep 全 theme/+styles/ 仅 2 命中）→ 换令牌在暗色态不产生任何变化，该事实已写进行内并指向 9.4 的暗值待裁项 |

### 9.3 复测计数（可复核）

- 工作树 `grep -rn "ChatInput" apps/client/src/` → **0 命中**；`find apps -iname "*ChatInput*"` → **0**；`ls apps/client/src/components/chat/` → 无该件（同目录 ChatBubble/ChatHeader/EmojiPanel 等 13 个 .vue + chat.stories.ts 在盘）。
- HEAD 侧 `git cat-file -e HEAD:apps/client/src/components/chat/ChatInput.vue` → **存在**；`git status --porcelain -- apps/client/src/components/chat/` → ` M ChatBubble.vue` + ` D ChatInput.vue`（**未提交**）；`git log --diff-filter=D --all -- …ChatInput.vue` → **0 条**（无任何提交删除过它）。
- 删除先例对照：`git log --diff-filter=D -- **/CheckinPopup.vue` → `874ff52f D apps/client/src/components/discover/CheckinPopup.vue`（先例是**以提交形态**删的）。
- `grep -c "sp-6" reports/audit/round-6/issue-matrix.md` → 修订前 0、修订后 1（＝APPSHELL-001 本行）。
- `git grep -n "今天活跃\|小时前活跃\|天前活跃" HEAD -- apps/client/src` → HEAD 命中 MatchInfo.vue:26/28/30（病灶在 HEAD 确实存在）；工作树同 grep 组件层 0 命中。
- 工作树 `grep -rn likeSent apps/client/src` → 仅剩 zh-CN.ts:932、en-US.ts:812、home/index.vue:152、matching.vue:83（三行死状态已删）。

### 9.4 ChatInput 到底删没删（如实报告，未照抄「已删」）

**结论：文件在工作树已消失，但「整件删除」这件事没有任何修复记录背书、也没进 HEAD → 本条不推进状态，行内保持 `待修复`。**

1. 收口批三份记录**一致自陈未删**：`lane-4.json items[13]` action=`deferred-p4`、diff=`""`、note「延后待并案裁决，**不擅删文件**」；`closer.json` action=`needs_ruling`、diff=「**无（未删文件、未改复用）**」；`i18n-wired.json handoff_5` 「`ChatInput.vue` **仍在**（2909B，mtime 2026-08-31 22:53）」。题面所说「收口批报整件删除」与这三份原文相反。
2. 盘上事实：ChatInput.vue 确已不在工作树（见 9.3 的 ls/find/grep 三项 0 命中），删除是**未提交的 ` D` 状态**，且 `git log --diff-filter=D` 全库 0 条 → 删除无署名、无提交、无构建证实（本 wave 禁构建）。
3. 因此按本台账纪律（`已修复待复验`＝FIXED_IN_HEAD、写不出证据不算推进）：既不能记「已删＝已修」，也不能记「文件还在」——记为「删除动作来源不明、HEAD 未变、整条仍开放」，两案（按 CheckinPopup 先例提交删除 / 让 chat-session 复用并接 i18n）留主编排层裁。
4. 已闭环的一半：`pages/register/index.vue` 注释里的 ChatInput 字样确已被摘（i18n-wired handoff_5 自陈并由本轮 grep 0 命中复证）→ 台账错挂锚点不再把这条缺陷指到注册页。

### 9.5 本轮明确没做的事（越界面与遗留）

1. **未回改 Lane 6 分诊记录**（ledger_fix_list 第 2 条要求）：对象是 `.zcode/tmp/fixwave/lane-6.json`，不在本轮两份可写文件内 → 只在 issue-matrix 行内留了指针。
2. **未推进 3 条之外的任何状态**：OTHER-001、APPSHELL-001、HOME-INDEX-005 三行收口批都给了工作树级 statusEvidence，但不在授权推进清单内 → 行内只记「落工作树、状态不动、留下轮」；HOME-006 的兄弟行 -005 同样只补锚点不改状态。
3. **未采纳 reconcile 的 dupFamilies 任何一组**（本轮实测复核沿用第五节结论：14 组「页+序号」配对全是巧合）。
4. 未改 `scripts/qa/verify-ledger.mjs` 凑绿；未动 `interact/`、`ops/`、`screenshot-manifest.json`、`reports/**` 其他路径、`apps/**`、`.zcode/**`；未跑构建、未连 94xx、未重启 8080、未打数据库、无 git 写操作（git 只用于 `show/status/log/cat-file/rev-parse`）。
5. **本文件既有小节的两处账现在与第一节实盘不符，按「不改写历史实测」原则保留原文、在此登记 delta**：第六节置信表（0.6 40→41、0.5 111→107、0.3 1→4，0.7=7、0.4=1 不变，合计仍 160）与第一节的行内状态分布（待修复 112→106、已修复待复验 23→26、新增 未取证/需裁决 3、保留-判据不成立 24、未取证 1，合计 160）；差异来源＝并案移除 1 行（-003，原 待修复/0.5）+ 新立 1 行（HOME-006，待修复/0.6）+ 3 行推进（0.5 不变）+ 3 行升级（0.5→0.3）。第七节 312/313 那份是 10:00Z 收编时点的门禁原文，本节 9.6 才是 23:3x 修订后的复跑。
6. 顺带发现、未在本轮范围内处理的**门禁外部事实**：`interact/exec-results.json` 在本轮修订期间被巡检继续写入（第七节记录时点是 1 个在册 ID，本次复跑已是 50 个），`DISTINCT_IDS` 由 313 涨到 345；这些新增 ID 全部能在本矩阵点名（`NOT_IN_ANY_MATRIX=0`），故 PASS 未破——该时序缺陷第八节第 6、9 条已有记载，本轮不重复立案。

### 9.6 门禁复跑原文（23:3x 修订后，node22 直跑，未改脚本）

命令：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6`。退出码 **0**，`LEDGER_ORPHAN_TRUE=0`、`LEDGER_RESULT=PASS`。以下为**未删节的完整原文**（68 行 stdout，逐字粘贴，未做任何省略或合并）：

```text
LEDGER_SOURCES=3 DISTINCT_IDS=345 MATRIX_IDS=1696 NOT_IN_ANY_MATRIX=0
MATRIX_IDS_CURRENT_ROUND=313 MATRIX_FILES=28 CURRENT_MATRIX_FILES=1
NOT_IN_CURRENT_ROUND_MATRIX=32（旧报"从未入账"、实际只在别的轮次/别的锚点形态在册）
LEDGER_ORPHAN_ALL=32（旧口径：只比对当前轮次五份矩阵）
LEDGER_ORPHAN_TRUE=0（扩矩阵集 + 锚点展开后仍无任何本尊行 → 硬失败依据）
LEDGER_CROSS_ROUND=22 LEDGER_ALIAS_HITS=9 LEDGER_CLUSTER_EXPANDED=1
LEDGER_MATRIX_CLUSTER_ANCHORS=51 LEDGER_CROSS_ROUND_MENTION_ONLY=0 LEDGER_ALIAS_AMBIGUOUS=0
LEDGER_MALFORMED_TOKENS=5（ID_RE 截断串/非 MP 工作代号，不算缺陷 ID，单列复核；其中 0 条旧口径被记成孤儿）
   313  matrix:reports/audit/round-6/issue-matrix.md
    50  interact/exec-results.json
     0  mode-dependent-issues.json
     6  matrix(其他轮次):reports/audit/2026-09-12-round1/audit-report.md
     1  matrix(其他轮次):reports/audit/2026-09-13-r3/audit-report.md
     4  matrix(其他轮次):reports/audit/2026-09-13-r5/audit-report.md
     1  matrix(其他轮次):reports/audit/2026-09-14-r6-editpage/audit-report.md
     9  matrix(其他轮次):reports/audit/2026-09-15-r7-full-verify/audit-report.md
    12  matrix(其他轮次):reports/audit/2026-09-16-r8-independent/audit-report.md
     3  matrix(其他轮次):reports/audit/2026-09-16-r9-newuser-lifecycle/audit-report.md
   255  matrix(其他轮次):reports/audit/baseline/historical-issues.md
   203  matrix(其他轮次):reports/audit/baseline/regression-index.json
   204  matrix(其他轮次):reports/audit/round-1/audit-report.md
   117  matrix(其他轮次):reports/audit/round-1/interaction-matrix.md
   865  matrix(其他轮次):reports/audit/round-1/issue-matrix.md
   118  matrix(其他轮次):reports/audit/round-1/regression-report.md
    34  matrix(其他轮次):reports/audit/round-1/screenshot-matrix.md
    76  matrix(其他轮次):reports/audit/round-2/audit-report.md
    67  matrix(其他轮次):reports/audit/round-2/interaction-matrix.md
   339  matrix(其他轮次):reports/audit/round-2/issue-matrix.md
    95  matrix(其他轮次):reports/audit/round-2/regression-report.md
     7  matrix(其他轮次):reports/audit/round-2/screenshot-matrix.md
    54  matrix(其他轮次):reports/audit/round-3/audit-report.md
    23  matrix(其他轮次):reports/audit/round-4/audit-report.md
  LEDGER_CLUSTER_HIT MP-R2-MSG-002 <= 簇锚 MP-R2-MSG-001-002 @ reports/audit/baseline/regression-index.json
  LEDGER_ALIAS_HIT MP-R2-DISCOVER-001 ≈ MP-R2-PAGES-DISCOVER-INDEX-001 @ reports/audit/round-2/issue-matrix.md [核心词 DISCOVER]
  LEDGER_ALIAS_HIT MP-R2-DISCOVER-002 ≈ MP-R2-PAGES-DISCOVER-INDEX-002 @ reports/audit/round-1/regression-report.md [核心词 DISCOVER]
  LEDGER_ALIAS_HIT MP-R2-HOME-003 ≈ MP-R2-PAGES-HOME-INDEX-003 @ reports/audit/round-6/issue-matrix.md [核心词 HOME]
  LEDGER_ALIAS_HIT MP-R2-HOME-002 ≈ MP-R2-PAGES-HOME-INDEX-002 @ reports/audit/round-6/issue-matrix.md [核心词 HOME]
  LEDGER_ALIAS_HIT MP-R2-CHAT-002 ≈ MP-R2-CHAT-CHAT-SESSION-INDEX-002 @ reports/audit/round-2/issue-matrix.md [核心词 CHAT]
  LEDGER_ALIAS_HIT MP-R2-CHAT-003 ≈ MP-R2-CHAT-CHAT-SESSION-INDEX-003 @ reports/audit/round-2/issue-matrix.md [核心词 CHAT]
  LEDGER_ALIAS_HIT MP-R2-CHAT-004 ≈ MP-R2-CHAT-CHAT-SESSION-INDEX-004 @ reports/audit/round-2/issue-matrix.md [核心词 CHAT]
  LEDGER_ALIAS_HIT MP-R2-MATCH-SUCCESS-005 ≈ MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-005 @ reports/audit/round-2/issue-matrix.md [核心词 MATCH,SUCCESS]
  LEDGER_ALIAS_HIT MP-R2-MATCH-SUCCESS-001 ≈ MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-001 @ reports/audit/round-2/audit-report.md [核心词 MATCH,SUCCESS]
  LEDGER_CROSS_ROUND MP-R2-PAGES-REGISTER-SUCCESS-002 @ reports/audit/round-1/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2-HOME-012 @ reports/audit/baseline/regression-index.json
  LEDGER_CROSS_ROUND MP-R1-LOGIN-003 @ reports/audit/round-1/audit-report.md
  LEDGER_CROSS_ROUND MP-R2-MSG-001 @ reports/audit/baseline/historical-issues.md
  LEDGER_CROSS_ROUND MP-R2-PROFILE-007 @ reports/audit/round-1/interaction-matrix.md
  LEDGER_CROSS_ROUND MP-R1-PROFILE-219 @ reports/audit/round-1/audit-report.md
  LEDGER_CROSS_ROUND MP-R2-PAGES-REGISTER-INDEX-002 @ reports/audit/round-2/audit-report.md
  LEDGER_CROSS_ROUND MP-R2-PAGES-REGISTER-INDEX-005 @ reports/audit/round-2/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R2-PAGES-REGISTER-INDEX-003 @ reports/audit/round-2/issue-matrix.md
  LEDGER_CROSS_ROUND MP-R1-CAMPUSINDEX-002 @ reports/audit/round-1/audit-report.md
  LEDGER_CROSS_ROUND MP-R1-CAMPUSINDEX-003 @ reports/audit/round-1/audit-report.md
  LEDGER_CROSS_ROUND MP-R1-CAMPUSPOST-001 @ reports/audit/round-1/interaction-matrix.md
  …LEDGER_CROSS_ROUND 另有 10 条（LEDGER_VERBOSE=1 全量打印）
  MALFORMED_TOKEN MP-WEIXIN  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R1-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2-CIRCLES-INDEX-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
  MALFORMED_TOKEN MP-R2VIS-  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]
LEDGER_MULTI_ID_FAMILIES=23（同一缺陷多 ID 的族数，>0 就说明台账没收敛）
  DUP_FAMILY MP-R*-PAGES-NEARBY-INDEX-011 ×2
  DUP_FAMILY MP-R*-PROFILE-001 ×2
  DUP_FAMILY MP-R*-PAGES-REGISTER-INDEX-002 ×2
  DUP_FAMILY MP-R*-HOME-012 ×2
  DUP_FAMILY MP-R*-PAGES-REGISTER-INDEX-011 ×2
  DUP_FAMILY MP-R*-PAGES-REGISTER-INDEX-012 ×2
LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法
```


对照第七节收编时点：`MATRIX_IDS_CURRENT_ROUND` 312→**313**（新号 HOME-006）、`MATRIX_IDS` 1695→**1696**、`LEDGER_MULTI_ID_FAMILIES` 15→**23** 与 `DISTINCT_IDS` 313→345 全部由 17:52 起巡检持续往 `interact/exec-results.json` 追加造成（该文件在册 ID 1→50），**与本轮台账修订无关**；本轮改动的净效应是 -003 从第一节行首移到别名单元格（仍被 leadRe 判为锚点、未成孤儿）与 HOME-006 新增，两者都不产生孤儿。**修订前基线跑（同一命令、同一 HEAD）也已存档**：`LEDGER_ORPHAN_TRUE=0 / LEDGER_RESULT=PASS / DISTINCT_IDS=342 / MATRIX_IDS_CURRENT_ROUND=312` → 本轮没把绿的改成红。

