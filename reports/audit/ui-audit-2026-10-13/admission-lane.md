# 立账车道（ledger-admission lane）· 2026-10-13

任务：把 `reports/audit/ui-audit-2026-10-09/sort-round3.json`（executable 14 条 / needsUser 6 条）里
从未进入权威台账 `reports/audit/round-6/issue-matrix.md` 的缺陷，逐条判重后经承载
`scripts/qa/admit-ledger-row.mjs` 立进主表。本文件是车道自己的过程记录，边做边写。
所有 node 一律用 `D:/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH node=v16.13.1 会炸 `import.meta.dirname`）。

## 起点行数

- `grep -cE '^\| *MP-' reports/audit/round-6/issue-matrix.md` ⇒ **236**（全文所有表格的 MP 行，含 §二/§三/§四）
- 主表（§一，表头第 20 行，分隔行第 21 行）数据行：第 22..191 行 ⇒ **170**
  - 复核：主表内 `grep -vnE '^\| *MP-'` 空命中（170 行全是 MP 本尊行），逐行切分单元格数全部 = 11
- 起点台账与 HEAD 一致：`git status --porcelain` 空、`git show HEAD:… | grep -cE '^\| *MP-'` = 236
  ⇒ 写盘可逆性由 HEAD 副本 f9fd17b1（2026-10-09 04:43）保证；改格走 `patch-ledger-cells.mjs`（自带 `.pre-cellpatch.bak`）。
- 受控词表（唯一来源 `scripts/qa/normalize-ledger-status.mjs:30`，**14 档**）：
  待修复（需产品裁决 / 已修复待复验 / 保留-判据不成立 / 判据不成立 / 未取证/需裁决 / 未取证 / 需裁决 /
  撤销 / 回归核对 / 并入-不另立案 / 待复验 / 待修复 / 不立账 / 已修复
- 列序（`normalize-ledger-status.mjs:33`）：新号｜历史别名｜页面｜类别｜severity｜status｜置信｜证据(file:line)｜statusEvidence｜理想图依据｜处置
- `verify-ledger.mjs` 改前基线（实跑 exit=0）：
  `LEDGER_SOURCES=3 DISTINCT_IDS=439 MATRIX_IDS=1231 NOT_IN_ANY_MATRIX=71`
  `LEDGER_ORPHAN_TRUE=71` → `LEDGER_RETIRED=71`（全已登记退役，LIVE=0）
  `LEDGER_MULTI_ID_FAMILIES=29` ／ `LEDGER_MALFORMED_TOKENS=5`
  `LEDGER_SHAPE_DECLARED_COLS=11 DATA_ROWS=236 OFF_SCHEMA_ROWS=0 ROTATED_ROWS=0 STATUS_VOCAB_BAD=0 矩阵文件=1`
  `LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法；另有 71 条已登记退役（…退役 ≠ 通过）`

### 起点差异（先判清再落笔）

`open-items-v37.json` 机读行 `OPEN_ITEMS 主表=171 未结案=7 …`，我数到 **170**。根因不是台账少行，
而是 `emit-open-items.mjs:24` 只按「切出来 11 格」认定数据行，**分隔行 `|---|…|` 也是 11 格**被当成一行。
本车道实跑复现（node -e 复刻同一循环）：

```
counted_rows=171
first_3_ids=["---","MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-002","MP-R7CLIENT-UPLOAD-EXT-001"]
non_MP_rows=["---"]
real_MP_data_rows=170
```

`admit-ledger-row.mjs:39` 的 `bodyRows` 同样含分隔行 ⇒ 它打的「主表行数 171→172」与 open-items 同口径，
守恒式 `after===before+1` 两侧含同一个幽灵行，不受影响。**结论：台账真值 170，机读行虚高 1；没有为凑 171 动台账。**

## 逐条判重结果（含命中行号）

判重三把尺：① 按 sort-round3 的 ID 与其引用的 ledger 令牌（R2-OT-06/R2-NEARBY-09/R2-VI25-08/R2-NET-03/R2-CON-01/
REAL-VI34-04/REAL-PFI25-05、F06/F07）grep；② 按页面 grep 主表；③ 按 `what` 里的特征词 grep（穿透、自定义组件、
UNCOVERED、REALCOV、voided、netFault、PFI25、VI25、VI34、switchTab、heart-signals、toggleLike、feed-actions、
create-pending-post、QA_MARK、verify-real-coverage、弹回 …）。矩阵内这些特征词**除 switchTab/matching/nearby/
MatchCard 的既有行外全部 0 命中**。命中到的既有行号：52、90、185、187、189（另 §二 199-208、§三 216-253、§四 261-279 逐行看过）。

| 分拣条目 | 判重结论 | 落点 |
|---|---|---|
| R3-OT-01 | 矩阵无本尊行（穿透/OT0x/自定义组件 0 命中）⇒ 新行 | matrix:192 `MP-R3AUDIT-CTA-PENETRATION-001` |
| R3-02 | **≡ R3-OT-01**（sort-round3.json 自述「与 R3-OT-01 同一缺陷主体」）⇒ 不另立行，别名写进 192 行 | alias@192 |
| R3-NEARBY-02 | 同机制不同主体：matrix:187 判的是「已登录直达登录页被弹走＝有意实现」，本条是「tabBar 进 nearby 被同一条 onShow 弹走」⇒ 新行 | matrix:193 `MP-R3AUDIT-NEARBY-TAB-BOUNCE-001` |
| R3-04 | **≡ R3-NEARBY-02**（自述「同主体，第 4 次同向」）⇒ 不另立行 | alias@193 |
| R3-PFI25-03 | 矩阵 0 命中（PFI25/voiceStatus 均无）⇒ 新行，状态按「红已撤、绿未证」 | matrix:194 |
| R3-07 | **≡ R3-PFI25-03**（自述「补法随 R3-PFI25-03」）⇒ 不另立行；其「旧口径未同步」半段只登记不代改 | alias@194 |
| R3-NET-04 | 矩阵 0 命中（netFault/臂展/functionDeclaration 均无）⇒ 新行 | matrix:195 |
| R3-08 | **≡ R3-NET-04**（自述「同一缺陷主体的判点面」）⇒ 不另立行 | alias@195 |
| R3-VI25-05 | 矩阵 0 命中（VI25/VI34/create-pending-post 均无）⇒ 新行（两条案首次进权威台账） | matrix:196 |
| R3-01 | 矩阵 0 命中（REALCOV/voided/verify-real-coverage 均无）⇒ 新行 | matrix:197 |
| R3-05 | 同页既有 matrix:189 `MP-R7-GUEST-MATCHING-REDIRECT-RACE-001` 只判**游客轴**重定向优先级且已源码级修复；本条是**已登录直开落点归因＋内容面零覆盖**，未被覆盖 ⇒ 新行（判重理由与 189 行号写进行内） | matrix:198 |
| R3-06 | 矩阵 0 命中（heart-signals/toggleLike/feed-actions 均无）⇒ 新行（两页同一守卫判据，合立一行，按 185 行多页先例） | matrix:199 |
| R3-09 | 同页既有 matrix:52（activeLabel 文案键，行内自注「MatchCard 半边本不成立」）与 matrix:90（tab-bar 高度单点化）都不是「主视觉空白＋三钮不可见」⇒ 新行 | matrix:200 |
| R3-CON-06 | **不立行**：条目自述「无独立待办…补法：无需动作，仅留档」，两项动作（MARK 证据件、round2 回写 NAV_FAIL）都已闭环；唯一可动半段是 needsUser R3-11（不在本车道 14 条内）。无缺陷实体 ⇒ 按 §四「不立账」同口径留在记要里，不进主表 | 未立账 |

反向也核了（防「我以为缺」的假阳性）：14 条里 4 条是同主体重复（R3-02/04/07/08），1 条无实体（R3-CON-06），
其余 9 条经三把尺 grep 确认确实不在账上——**没有一条被证实为「其实已在册」**。

## 新增行（全部经 `admit-ledger-row.mjs`，先干跑后 --apply，一条一行）

九次 `--apply` 的机读行（逐条守恒 1→1）：

```
ADMIT 已落盘 主表行数 171 → 172（表头在第 20 行，插入点第 192 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 172 → 173（表头在第 20 行，插入点第 193 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 173 → 174（表头在第 20 行，插入点第 194 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 174 → 175（表头在第 20 行，插入点第 195 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 175 → 176（表头在第 20 行，插入点第 196 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 176 → 177（表头在第 20 行，插入点第 197 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 177 → 178（表头在第 20 行，插入点第 198 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 178 → 179（表头在第 20 行，插入点第 199 行）  ADMIT_RESULT=OK
ADMIT 已落盘 主表行数 179 → 180（表头在第 20 行，插入点第 200 行）  ADMIT_RESULT=OK
```

九行的 status 与置信（判据强度分档，见「置信口径」节）：

| 行 | 新号 | status 起头 | 置信 |
|---|---|---|---|
| 192 | MP-R3AUDIT-CTA-PENETRATION-001 | 已修复待复验 | 0.6 |
| 193 | MP-R3AUDIT-NEARBY-TAB-BOUNCE-001 | 已修复待复验 | 0.6 |
| 194 | MP-R3AUDIT-PFI25-VOICE-ORCHESTRATION-001 | 未取证（红已撤、绿未证…） | 0.5 |
| 195 | MP-R3AUDIT-NETFAULT-REARM-WINDOW-001 | 已修复待复验 | 0.5 |
| 196 | MP-R3AUDIT-VI25-VI34-PARKED-001 | 需裁决 | 0.5 |
| 197 | MP-R3AUDIT-GATE-VOIDED-BUCKET-001 | 已修复待复验 | 0.5 |
| 198 | MP-R3AUDIT-MATCHING-DIRECT-OPEN-BOUNCE-001 | 未取证 | 0.5 |
| 199 | MP-R3AUDIT-TAPWRITE-GUARD-PENDING-001 | 未取证 | 0.4 |
| 200 | MP-R3AUDIT-DISCOVER-MATCHCARD-BLANK-001 | 待修复 | 0.4 |

行文本文件留在 `reports/audit/ui-audit-2026-10-13/rows/row{1..9}-*.txt`（改格计划同目录）。

## 改格行（走 `patch-ledger-cells.mjs --plan`，两次）

1. **新号改名**（`rows/rename-plan.json`）：首落时我用 `MP-AUDITR3-*`（承载脚本的 ID 判据是
   `/^MP-[A-Z0-9-]+$/`，放行）。落盘后 `verify-ledger.mjs` 把九行打成
   `MALFORMED_TOKEN … [非缺陷 ID：ID_RE 截断串/非 MP 代号]`，`LEDGER_MALFORMED_TOKENS` 由 5→14。
   根因：门禁 `verify-ledger.mjs:224` 的 `isRealId = /^MP-R\d/ && !endsWith("-")` 比承载脚本严。
   ⇒ 按门禁口径改锚成 `MP-R3AUDIT-*`（与既有 `MP-R2VIS-`/`MP-R6REAL-`/`MP-R6EVID-` 同族风格）。
   `CELLPATCH_PLANNED=9` / `CELLPATCH_RESULT=OK`，改后 `LEDGER_MALFORMED_TOKENS=5` 回到基线。
2. **194 行证据格更正**（`rows/fix-row3-evidence-plan.json`，col 8）：原写法引了
   `wechatide-skill/references/tool-index.md:24`——本车道 `find` 全仓 **0 命中**（审计原文带过来的仓外引用），
   改锚到在盘的 `tour-ledger.json:1605`，并把 `exec-results.json:39` 的 recipe 合写键写成不含竖线的说法。

## 词表缺口

- 「红已撤、绿未证」这一态在 14 档里没有对应词：
  - `撤销` 单用只说「这条不欠了」，而 `emit-open-items.mjs:29` 的 `OPEN_RE=^待修复|^待复验|^已修复待复验|^未取证|^需裁决`
    **不收 撤销** ⇒ 用它就等于把「实带重跑」这笔欠账从没结案队列里抹掉，正是本车道存在的理由要防的失效模式；
  - `未取证` 单用只说「没证据」，丢掉「原判红已被自己撤回」这半句；
  - 折中：`未取证（红已撤、绿未证：…）`——起头词让行留在未结案队列，括号里如实写撤红。
- **`已修复待复验` 一词承了三种不同的欠**（192/195/197 欠「实带重跑」、193 欠「两档行为复测」），
  真实强度只能写在格子里；词表没有「载体已落、行为未证」这一档。
- 建议（不在本车道实施）：词表补 `撤销待重判`。本车道不碰 `normalize-ledger-status.mjs`。

## 置信口径（按证据强度，不按描述信念）

- 本轮帧两条已知局限，实测核对：`screenshots/r1-b0-04-pages-discover-index.png` 头三字节 = `ffd8ff`
  ⇒ **JPEG 字节装在 .png 名下**；matrix:179 在册 378×814 ⇒ **1× 设备档，字形级判不可能**。
- 分档结果：像素判点行 199/200 = **0.4**；纯源码推断 / 载体落盘未跑 = **0.5**；
  有在盘探针机读读数且跨轮重复（192 四腿 SKIPPED 全录、193 switchTab 全链读数 4 次同向）= **0.6**；
  **本轮没有任何一行达到 0.7**（没有当轮干净帧）。
- 审计引证不实也写进了行内：R3-09 引的配对帧「r2-b0-01」经核是 `pages/login/index` 帧
  （`ls screenshots | grep ^r2` 里 round-2 的 b0 段没有 pages/discover 帧），所以「两轮字节差 0.11%」
  的配对对象待复核 ⇒ 199/200 行判点不升级、不改口。

## 复量读数（写盘后实跑）

- `grep -cE '^\| *MP-'` ⇒ **245**（236 + 9）
- 主表数据行（22..200）⇒ **179**（170 + 9）；主表止于 200，第 201 行起为非表格行（`awk NR>20 && !/^\|/` ⇒ 201）
- `git diff --numstat` ⇒ `9  0  reports/audit/round-6/issue-matrix.md`（净增 9 行、0 删 ⇒ 既有行未被碰）
- `verify-ledger.mjs`（exit=0）：
  `LEDGER_SOURCES=3 DISTINCT_IDS=448 MATRIX_IDS=1240 NOT_IN_ANY_MATRIX=71`
  `MATRIX_IDS_CURRENT_ROUND=334 MATRIX_FILES=7 CURRENT_MATRIX_FILES=1`
  `LEDGER_ORPHAN_TRUE=71` / `LEDGER_RETIRED=71` / `LEDGER_MULTI_ID_FAMILIES=29` / `LEDGER_MALFORMED_TOKENS=5`
  `LEDGER_VOCAB_SOURCE=normalize-ledger-status.mjs 档数=14`
  `LEDGER_SHAPE_DECLARED_COLS=11 DATA_ROWS=245 OFF_SCHEMA_ROWS=0 ROTATED_ROWS=0 STATUS_VOCAB_BAD=0 矩阵文件=1`
  `LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法；另有 71 条已登记退役（…退役 ≠ 通过）`
  与基线逐行 diff 只多九行 ID，孤儿/词表/形状/族数四项不变 ⇒ **不是我改红的，也没把已有的红改绿**。
- `emit-open-items.mjs --out tmp/…`（不改别的车道的 v37 件）：
  `OPEN_ITEMS 主表=180 未结案=16 分桶=reverify:8 unverified:2 backend:1 frame:1 decision:1 probe:2 code:1`
  `OPEN_ITEMS_RESULT=OK（decision 两桶本就该由人拍板，无脚本载体）`
  ⇒ 未结案 7→16 正是 +9（九行全部留在队列里，没有一行被写成结案）；`主表=180 = 179 真行 + 1 分隔行幽灵`。
- 守恒逐条：九次 ADMIT 各 +1，累计 +9，与 numstat/行数复核一致。

## 未做（以及为什么不做）

1. **needsUser 6 条（R3-03、R3-10、R3-11、F06、REAL-VI34-04-Q、GUEST-VERB-Q）未立行**：
   本车道领的是 14 条 executable；且其中三条已被 `decisions-v37.md` §A1/§A2/§A3 与 §A4/§A5/§A6 收进裁定包等拍板。
   只有 R3-VI25-05 的执法后果（两条案悬在账外）落成了 196 行，并把 §A5 令牌引进行内。
2. **没替任何车道改判/改文件**：192/194 行内登记了 `tour-ledger.json:30`（F01/F02 仍写「结构性错配实锤」）
   与 fixlane/sort-round2 的「critical 产品缺陷候选」旧口径两处自相矛盾，但该文件属 ledger 车道 ⇒ 只钉账不代改。
3. **没跑实带/设备/后端**（纪律禁止），也没跑 `verify-real-coverage.mjs` 本身 ⇒ 192/195/197 三行因此写
   已修复待复验而不是已修复。
4. **没改 §一 标题的行数**：标题仍写「160 行」，正文散文（283-284 行）也说 160 —— 这是**我接手前就有的过期口径**
   （起点真值 170，已错 10），改成 179 会顺手替别的车道改判词，超出本车道授权。记在这里，交终报车道。
5. **没动门禁/承载**：`verify-ledger.mjs`、`admit-ledger-row.mjs`、`normalize-ledger-status.mjs` 一字未改。
   两处判据缺陷只做记录：
   - `admit-ledger-row.mjs:26` 的 ID 判据 `/^MP-[A-Z0-9-]+$/` 与 `verify-ledger.mjs:224` 的 `isRealId=/^MP-R\d/` 不一致，
     承载放行的号会被门禁读成「非缺陷 ID」——本车道第一遍就踩上了；
   - `emit-open-items.mjs:24` 与 `admit-ledger-row.mjs:39` 都把分隔行当数据行数 ⇒ 机读行恒 +1；
   - `patch-ledger-cells.mjs` 每次 --apply 都往同一个 `issue-matrix.md.pre-cellpatch.bak` 覆盖：本车道两次改格
     把它覆盖了两次，**把另一条车道 2026-09-29 留下的那份 .pre-cellpatch.bak 顶掉了**（现件是本次改前的状态，
     337KB/245 行）。台账本身可回滚（HEAD f9fd17b1 起算 `9 0` 净增），但这条备份语义值得在承载里改成带时间戳的。
