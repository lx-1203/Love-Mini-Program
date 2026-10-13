# 证据债 lane 现场笔记（2026-10-13）

 lane: evidence-debt（只读探针；不写台账、不跑 executor、不碰设备）
 解释器: `D:/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH node = v16.13.1，会对 `import.meta.dirname` 误 RED）
 权威开单: `reports/audit/ui-audit-2026-10-13/open-items-v37.json`（本 session 已复读，见下）

## 开单复核（本 session 实测）
- 文件 `open-items-v37.json` 机读行：`"ledgerRows": 171`、`"open": 7`、`"by": { reverify:4, unverified:1, backend:1, frame:1 }`
- 两行都在单上：`MP-R2-PAGES-MESSAGES-INDEX-014`（bucket unverified, sev P1→P4, status 未取证）、`MP-R6EVID-STATE-DUPBYTES-001`（bucket reverify, sev P3）

## Row 1 · MP-R2-PAGES-MESSAGES-INDEX-014（bucket unverified / 未取证 / P1→P4）

### 原始判据要求（读出来的，不是推测）
- `reports/audit/round-6/issue-matrix.md:101`：证据格写 `本轮只读 SQL（pymysql，campus@127.0.0.1:3306/campus_love …）：SELECT … FROM private_messages WHERE id…`，缺的载体格写 `—（缺一次只读取证）`；判决格 `未取证：代码半可判、数据半不可判`。
- `reports/audit/round-6/ledger-notes.md:214`：`数据半需一次只读 SQL（private_messages id=3894 / private_conversations id=461 当前是否仍在）；本轮工作树被巡检独占，未并发打库`；另注 `即便确认也是需授权的 DB 清理项（DELETE 不可逆）`。
- 载体用例 = `reports/audit/round-6/ops/PAGES-MESSAGES-INDEX.json` 里的 **MSG04**（`id:"MSG04"`，action=逐条读 `.chat-item__preview`，expected 里点名 `private_messages id=3894 与其所在会话 461`，并把 `你好呀，测试消息（conv 390）` 预先划为种子演示文案、不计入失败）。
- `fixwave-verdicts.json` **不含本条**（`grep -c` = 0），所以历史判决在 round-1 侧：`reports/audit/round-1/issue-matrix.md:217` 行 `R13-DATA-3894` 与 `reports/audit/round-1/findings/PAGES-MESSAGES-INDEX-req.json:24`（`本轮未连库，行级现状未实查`）。
- 两轮执行记录都是**未派发**：`reports/audit/round-6/interact/exec-results.json:3798` 与 `reports/audit/round-2/interact/exec-results.json:4313` 的 `observed` 均为 `action-not-automatable: 逐条读 .chat-item__preview …`；`reports/audit/round-6/adjudicated/PAGES-MESSAGES-INDEX.json:35` `reason":"未执行：action-not-automatable …"`。

### 实测
(b) 载体门第一半，用的是**不写权威件的模式**：`--mode judge` 是缺省值（`verify-evidence-holes.mjs:27` `arg("mode","judge")`），而 judge 分支缺省落**侧车**（`:34` `arg("out","reports/audit/round-7/evidence-holes-verdict.sidecar.json")`，注释 `:12` 归因 r10new#D）；我没有传 `--out`，所以权威件 `evidence-holes-verdict.json` 未被写。逐字输出：

```
EVIDENCE_HOLES 洞=3 已判定=3 triage点名=REG29,REG36,DC33 判决落点=evidence-holes-verdict.sidecar.json（侧车：人工确认后用 --out 并入权威件）
EVIDENCE_HOLES_RESULT=PASS 每个洞都有可重跑判据，无一靠重判结案
```
→ 洞表里只有 DC33/REG29/REG36 三个洞，**没有本行**：载体的前半对 014 是空转，它管不到这条行的数据半。

(c) 数据半＝那条一直没跑的只读 SQL。本机 `D:/mysql-8.0.45-winx64/bin/mysql`，凭据取自仓库 `.env` 的 `DB_URL/DB_USERNAME/DB_PASSWORD`（口令只经 `MYSQL_PWD` 传入、输出里做了替换，未打印）。**只发 SELECT**，逐字行（`exit=` 为 mysql 退出码）：

```
TARGET host=127.0.0.1 port=3306 db=campus_love userLen=6 passPresent=true
Q alive exit=0 => 1 err=
Q m3894   exit=0 => 0 err=
Q c461    exit=0 => 1 err=
Q resMsg  exit=0 => 0 err=
Q resPrev exit=0 => 0 err=
Q resPrev2 exit=0 => 1 err=
Q conv461 exit=0 => 461	真实链路测试：周末摄影展走起？	2026-09-11 14:19:39 err=
Q hitRow  exit=0 => 390	你好呀，测试消息 err=
Q hitTime exit=0 => 0 err=
Q msgsIn461 exit=0 => 2 err=
Q maxMsgId exit=0 => 3896 err=
Q totalConv exit=0 => 462 err=
```
SQL 对应：m3894=`COUNT(*) FROM private_messages WHERE id=3894`；c461=`COUNT(*) … id=461`；resMsg=`content LIKE '%全链路验收测试%'`；resPrev=`last_message_preview LIKE '%全链路验收测试%'`；resPrev2=`… LIKE '%测试消息%'`；hitTime=`… LIKE '%验收%'`。

代码半就地重测（行号已漂）：
- `apps/client/src/stores/messages.ts:275` `function mapToMessageSession(raw: ConversationView)`（台账写的 `:272` 是旧行号，函数仍在）
- `apps/client/src/stores/messages.ts:293` `lastMessagePreview: raw.lastMessagePreview,`（原样透传，未改）
- `apps/client/src/pages/messages/index.vue:562-564` `<EmojiText v-if="session.lastMessagePreview" :text="session.lastMessagePreview"`（台账写的 `:548-554` 漂到 `:562-564`）
- 脱敏检索：`grep -c "脱敏|sanitiz|mask|redact"` → `stores/messages.ts:0`、`pages/messages/index.vue:0`（No matches found）
- 后端侧 `apps/api/src/main/java/com/campuslove/api/entity/PrivateConversation.java:42 @Column(name="last_message_preview", …)` 仍在；`mapToMessageSession` 全 `apps/api` 0 命中（该符号只在客户端 store）。

## 两条行的原始判据要求（总览）

（待填：从 round-6/issue-matrix.md 与 fixwave-verdicts.json 读到的原文判据）

## Row 2 · MP-R6EVID-STATE-DUPBYTES-001（bucket reverify / 待复验 / P3）

### 原始判据要求
- `reports/audit/round-6/issue-matrix.md:185`（判决格逐字）：`**产品层待复验** —— 7 个实体分两类：\`弹层态\` 4 个（publish A/B、post A/B）与 \`交互后\` 3 个（nearby A/B、hub B）：需要在真机上以元素级断言（弹层节点是否挂载、点击是否命中目标）而非像素比对来定「弹层根本没开」还是「开了但截图不含它」`；并附反证 `dupfix corpus（08:26 用现行规则重拍）里 A·nearby 交互后、A·publish 弹层态、A·hub 交互后 三条**已经不等**`。
- 证据格点名载体：`reports/audit/round-6/screenshot-manifest.json` → `stateNotApplied[]` 内 `retroactive=true` 的 13 条。

### 实测
1) 13 条 retroactive 条目存在（`stateNotApplied len 84 retroactive 13`），**我自己重算的字节比对**（sha256 前 16 位 + 文件字节数，不采信清单里的哈希）：
```
PAIR IDENTICAL A pages/nearby/index 交互后 vs 默认 sha256_16(state)=4f8a9a46fb9a77ab sha256_16(default)=4f8a9a46fb9a77ab ledgerHash=4f8a9a46fb9a77ab bytes=139903/139903 manifestHashMatchesFile=true
…（13 条全部同形）…
SUMMARY identical=13 different=0 missing=0 of 13
```
→ 13/13 确实逐字节相同，且清单里的 `contentHash` = 真实文件 sha256 的前 16 位（采集时打哈希这一点成立，不是事后补的）。
2) dupfix corpus（`round-6-tour-dupfix`，generatedAt=2026-09-26T00:26:59.334Z）配对：
```
DUPFIX A pages_nearby_index 交互后=[3bbcca18535174ce 137826B] 默认=[0edcdd8975886c4a 137910B] => DIFFERENT
DUPFIX A subpackages_village_village_publish 弹层态=[3d27ec7a6fc7d77f 55676B] 默认=[ca8b8e38e8fd22aa 55623B] => DIFFERENT
DUPFIX A subpackages_campus_campus_hub 交互后=[8efcbe58c8051397 195685B] 默认=[95927c67959f4d67 195790B] => DIFFERENT
DUPFIX A subpackages_village_village_post 弹层态=[NOFILE] …（其余 5 组同为 NOFILE）
```
→ 台账那条反证**只对了一半范围**：真正"已经不等"的恰好是它点名的 3 条；另 5 组在 dupfix 里根本没拍（NOFILE ≠ DIFFERENT）。
   dupfix 自己的 `stateNotApplied len=6 retro=0`（现行规则当场判掉的重复）：
```
DUP A …post 弹层态 dupOf=默认 / DUP A …hub 弹层态 dupOf=交互后 / DUP B …nearby 交互后 dupOf=默认
DUP B …publish 弹层态 dupOf=默认 / DUP B …post 弹层态 dupOf=默认 / DUP B …hub 弹层态 dupOf=交互后
```
   → 注意 `B·nearby 交互后=默认` 在三个 corpus 里都同字节（156bef0d / 295787b0 / dupfix 现场判重），而 A·nearby 在 dupfix 里不等 ⇒ 同不同**按身份稳定**，不是纯随机时序噪声。
3) 派发记录（这是本行真正的分水岭）。清单里每条帧带 `interaction{action,expect,observedRoute,applied}`：
```
RETRO round-6-tour A pages/nearby/index 交互后 inShots=YES dispatch={"action":"tap 通用入口 [class*=\"card\"]","expect":"页内状态变化","observedRoute":"pages/nearby/index","applied":true} applied=true
RETRO round-6-tour B subpackages/campus/campus/hub 交互后 … observedRoute=subpackages/campus/campus/hub, applied=true …
RETRO round-6-tour A subpackages/village/village/publish 弹层态 inShots=YES dispatch=(none) applied=undefined
```
（13 条里 6 条 `交互后` 全部 `applied=true` 且 `observedRoute==本页`（无 drift）；7 条 `弹层态` 全部 `dispatch=(none)`。）
`dispatch=(none)` **不等于"没点"**——`scripts/qa/tour-r6.mjs:1512` 页内弹层分支只传 `{ preRoute }`，不传 action/expect，是**记账字段缺项**；而帧能存在本身就证明点了：`:1507 if (hit)` / `:1482 if (tapped)` 是存帧的前置门（`tapSelector` 在 `:1174-1177` 只有 `page.$(sel)` 命中且 `el.tap()` 不抛才返回选择器串），并且命中串写进了 console 通道：
```
2026-09-25T07:37:30.438Z	A	subpackages/village/village/publish	弹层态(tap [class*="sheet"])	clean
2026-09-25T07:37:58.900Z	A	subpackages/village/village/post	弹层态(tap [class*="sheet"])	clean
2026-09-25T07:37:27.637Z	A	subpackages/village/village/publish	交互后(tap [class*="card"])	clean
2026-09-25T07:35:27.920Z	A	pages/nearby/index	交互后(tap [class*="card"])	clean
```
4) 「前一步是否真的改过画面」直接自算哈希（这是 `弹层态` 半段结论的支撑）：
```
round-6-tour A subpackages_village_village_publish 交互后=0dd5b83a4b92467f 默认=08c07b186c1334dc => DIFFERENT
round-6-tour B subpackages_village_village_post 交互后=a55db7c956919aca 默认=5e339d3099c8b066 => DIFFERENT
round-6-tour-reshoot A subpackages_village_village_publish 交互后=d75318939df1695b 默认=7daef694aa1164e2 => DIFFERENT
round-6-tour-dupfix A subpackages_village_village_post 交互后=d86cb7301b07d302 默认=4b56e2000c77e92d => DIFFERENT
round-6-tour A subpackages_campus_campus_hub 交互后=82296ecb3d9217e5 默认=fe7e15dd574da845 => DIFFERENT
round-6-tour B subpackages_campus_campus_hub 弹层态=e78d7bb394c2d4b6 默认=3d2785648e7f593e => DIFFERENT
```
→ publish/post 的 `交互后` 帧在 3 个 corpus 里都**确实**与默认不同（与"那一步把弹层打开了"一致），而紧随的 `弹层态` 帧又精确回到默认字节。同时 hub 的 `交互后` 只有 B 同字节、A 不同 ⇒ 按身份稳定。
5) 源码静态结构（解释"为什么逐字节相同"，只读未改）：
- `publish.vue:751` 是全页**唯一** class 含 card 的节点：`.publish-to__card … @tap="targetOpen = !targetOpen"`；`post.vue:746` 同形（`.post-to__card`）。
- 弹层根节点是**条件挂载**：`publish.vue:892 <view v-if="targetOpen" class="publish-target-sheet" @tap="targetOpen = false">`、`post.vue:780 <view v-if="targetOpen" class="post-target-sheet" @tap="targetOpen = false">`；页内其余 sheet 节点（`…__panel/__head/__title/…`）全在 892/780 的子树里。
- `nearby/index.vue:543 class="campus-cards"` 是该页唯一含 card 的 class，且**它自己没有 @tap**；处理函数在子节点 `:545-556 .campus-entry … @tap="goCampusHub(school.name)"`。
- `campus/hub.vue:206 class="campus-guide card-base"` 同样**无 @tap**；CTA 是子节点 `:214-224 <view v-if="!isVerified" class="campus-guide__btn" @tap="goCertification">`（否则走 `:225-227` 静态 badge 分支）。
- `nearby/index.vue:82-89 schoolEntries` 恒返回 ≤4 条，所以那个容器一般非空。

## 两条行的原始判据要求（总览）
- Row 1 = 代码半（预览原样透传、无脱敏）+ **数据半（一次只读 SQL，行级现状）**；后者被记为 `—（缺一次只读取证）`。
- Row 2 = 采集层已由"移出 shots[]/哈希前移到采集时"收口；**产品层**要的是"这页这态到底有没有可见差异，还是交互压根没发生"，判据明文要求元素级断言而非像素比对。

## 实测（索引）
- Row 1：holes 门（judge→侧车）`EVIDENCE_HOLES 洞=3 … 无本行`；只读 SQL 12 条 labelled 行（m3894=0、c461=1、resMsg=0、resPrev=0、resPrev2=1、conv461=「真实链路测试：周末摄影展走起？」、hitRow=「390 你好呀，测试消息」）；代码半行号已漂（275/293、562-564），脱敏命中 0；载体后半干跑 `RJ_APPLY=OFF`。
- Row 2：13/13 自算 sha256 相同；dupfix 3 条真不等 / 5 条 NOFILE；`applied=true`×6、`dispatch=(none)`×7 且经 `:1507 if (hit)` 门 + console 命中串还原为"确实派发过"；四页的命中节点**都是无处理函数的容器/条件挂载根**。

## 能闭到哪
- **Row 1（014）——数据半就地闭合，不需要新采集。** `private_messages id=3894` 现为 0 行；残留串「全链路验收测试」在 `private_messages.content` 与 `private_conversations.last_message_preview` 均为 0 行（LIKE '%验收%' 也是 0）⇒ 立案所依据的那条残留文案已经不在库里；conv 461 的预览已是「真实链路测试：周末摄影展走起？」。唯一「测试消息」命中是 conv 390「你好呀，测试消息」，而 MSG04 的 expected 已预先把它划成种子演示文案、不计入失败。代码半（透传 + 无脱敏）复核仍成立。载体两半都跑到位于本行：holes 门洞表里没有它；readjudicate 给出 `RJ_CASE PAGES-MESSAGES-INDEX/MSG04 tier=normal(manifest) status=SKIPPED class=NOT_A_FILE_REF frames=0/1`（没有可改判的证据，与 未取证 一致）。
  ⇒ 这一行可以从 未取证 走到"取证完成"；**但不是"客户端缺陷已修"**。
- **Row 2（DUPBYTES-001）——只闭一半，闭的是 `弹层态` 那一半。**
  `弹层态` 4 个实体：**「弹层根本没开」被机器证据否证**。`[class*="sheet"]` 想命中，`targetOpen` 必须已为 true（sheet 根是 `v-if`），即拍这帧时弹层是**挂载着**的；而命中的正是带 `@tap="targetOpen = false"` 的**遮罩根**，于是这一步把上一步（`[class*="card"]` → 全页唯一卡片节点 = 开弹层的开关）刚打开的弹层**又关了回去**，截到的就是关闭态页面 ⇒ 与 `默认` 逐字节相同是**采集序列的必然结果**，既不是"页面没有可见差异"，也不是"交互没派发"。
  `交互后` 3 个实体（nearby A/B、hub B）：只能到"派发过、路由未变、像素未变"为止，见下节。
- 两行台账文本我都没动（`issue-matrix.md`/各 ledger 未写）；holes 判决只落侧车。

## 闭不动的半段与原因
- **Row 1**：剩下的是**人的一次定性**，不是缺测量。① 残留文案何时/被谁清掉没有记录（我只能证明 2026-10-13 库内不存在，不能证明是"修复"）；② conv 461 现预览「真实链路测试：周末摄影展走起？」本身也像联调期残留，算不算属于判据口径；③ `ledger-notes.md:214` 自陈「即便确认也是需授权的 DB 清理项（DELETE 不可逆），不该进客户端缺陷台账」——转数据清理登记还是留客户端台账，人拍板。
- **Row 2 的 `交互后` 半段**：现有记录分不清"没有可见差异"和"交互没生效"。原因是命中节点按源码结构**自己不带处理函数**（nearby `.campus-cards`、hub `.campus-guide.card-base`），handler 在子节点；automator 只记"我对这个元素调了 tap"，**没记 tap 点实际落在哪个子节点**。两种解释都没被排除：(a) 中心点落在网格缝隙/纯文本 → 事件没进任何 handler（"交互没生效"，产品侧无罪）；(b) 中心点确实落在 `.campus-entry` 上，而 `@tap=goCampusHub` 该跳转却路由未变、像素未变 → 真·死按钮。`applied=true` / `observedRoute` 未变 / `clean` 三条都**不能**在这两者间做选择——`clean` 只说明 console 无报错，200/exit-code 不是行为证据。
  同时要挡掉一个已知伪造路径：7 个实体里 7 条 `弹层态` 的 `interaction` 字段为空，若有人据"字段为空"直接写"派发过且无变化"，那正是"记了行却没派发"的假判决；我靠存帧门 + console 命中串反推才敢写"确实派发过"。

## 需要的测量
1. **元素级断言替代像素比对**（判据原文点名）：tap 后立刻 `page.$('.publish-target-sheet')` / `('.post-target-sheet')` 记 `mounted=true/false`，并对命中元素取 `getBoundingClientRect()`。这把「弹层根本没开 / 开了但截图不含它 / 被这一步自己关掉」三态分开。
2. **tap 落点命中测试**：记录选择器命中元素的 class 与中心坐标，再取该坐标处的真实节点（wxml dump 或 `elementFromPoint` 等价物）；若命中的是无 handler 容器，该帧应标 `不可达（选择器命中无处理容器）` 且**不计**状态配额。
3. **按页专用选择器重拍 `交互后`**：nearby 用 `.campus-entry`，hub 用 `.campus-guide__btn`（且需先确认该身份 `isVerified=false`，否则只有静态 badge 分支）。选择器与 handler 绑死后，再逐字节相同才真的等于"无可见差异"。这是设备/巡检 lane 的活。
4. **Row 1 不需要新测量**，需要两个决定：残留消失的归因，以及 014 是否迁出客户端台账。

## 写入面自检（本 session 结束时补）
- holes 门只写了侧车，权威件未被触碰（mtime 实测）：
```
-rw-r--r-- 1 ... 1219 2026-10-01_12:42:02 reports/audit/round-7/evidence-holes-verdict.json        ← 未变
-rw-r--r-- 1 ...     <sidecar>           reports/audit/round-7/evidence-holes-verdict.sidecar.json ← 本次落点
```
- `readjudicate-evidence.mjs` 以缺省干跑执行：`RJ_APPLY=OFF（干跑：未写任何文件；加 --apply 且 --out 落在 reports/** 之外才会写）`。
- `git status --short` 显示 `reports/audit/round-6/issue-matrix.md` 与各 ledger **均无 M**；本 lane 只新增 `reports/audit/ui-audit-2026-10-13/evidence-lane.md`（其余 M 文件是别的 lane 的）。
- DB 侧只发 `SELECT`/`COUNT`/`MAX`，未执行任何 DML/DDL（`.env` 口令未打印，仅按长度与存在性披露）。

## 解释器自检
本 session 所有 `scripts/qa/*` 调用均走 `D:/codex-tools/node-v22.17.0-win-x64/node.exe`；PATH node（v16.13.1）未使用。

## 若中断：还剩什么
- Row 1：实测完毕，只等人写回台账。
- Row 2：`弹层态` 半段结论已定；`交互后` 半段等上面 (1)(2)(3)，都需要设备通道（本轮 WS automator 端口不可用，`issue-matrix.md:185` 引台账 §101）。
