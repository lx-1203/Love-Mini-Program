# 第七轮审查车道 AUDIT-O：ops 判据台 identity 打标的全部下游

审查对象：`f998762d` 的 `tag-ops-identity-scope.mjs --apply`（RP×9 + MW×11 新标）与 4 个 ops 文件重排版。
形态：只读审查 + 临时副本探针（探针脚本与全部中间产物落 `.zcode/tmp/lane-O-*`，该目录被 `.gitignore:137 tmp/` 忽略；未改仓内任何文件、无 git 写操作）。

## 0) HEAD 与独立性声明

- `git rev-parse HEAD` → **`f998762dfb008151ac841c2a31aab2742568b7ff`**，与指派一致。工作树相对 HEAD 对 `reports/audit/round-6/ops/`、`scripts/qa/`、`apps/client/src/tests/` **干净**（`git status --short -- <三目录>` 空输出）；工作树里的大量 `archive/` 删除与 `??` 未跟踪件与本审查无关、未触碰。
- **独立性**：以下结论全部为本轮**亲自复量**，不是转述 `2026-11-01-round7-remediation.md` §5：
  - 4 个 ops 文件旧版（`git show f998762d^:<path>`）与工作树版的 **JSON.parse 后深度 diff**（自写探针 `.zcode/tmp/lane-O-deepdiff.mjs`）；
  - **序列化重放**逐字节比对（旧J→1空格/2空格、新J→2空格）；
  - `git diff -w`（忽略空白）对 4 文件全量 diff 的归类；
  - 全目录 identities 形状扫描与按本轮规则重算的分桶（`.zcode/tmp/lane-O-buckets.mjs`）；
  - 20 条新标行与 14 行存量的**逐行正文阅读**（pre/expected 全文）；
  - tag 工具 **dry-run 真跑**（`IDSCOPE_RESULT=DRY`，改写文件=0，证幂等）；
  - `verify-guest-landing.mjs` **真跑**（book 模式，`--out` 落 `.zcode/tmp/lane-O-guest-booked.json`）与 `test-guest-landing.mjs` **真跑**（45 checks）。
- 唯一转述项：remediation §5 的声明原文本身（作为被复核对象引用）。

## 1) 六轴逐条

### 轴 0/2｜重排版影响面与 §5 声明独立复核

**命令与读数**：

1. `git show f998762d --stat`（4 个 ops 文件部分）：
   `PAGES-LOGIN-INDEX.json 72 ±｜SUBPACKAGES-TOOLS-SECURITY-INDEX.json 586 ±（293+293）｜次要21.json 3644 ±（1822+1822）｜次要22.json 2582 ±（1291+1291）`。
2. `git diff -w f998762d^ f998762d -- <4文件>`（忽略空白）：非空白变化**只剩 identities 相关行**——`"A"/"B"` 数组元素与 `identities/identitiesFrom/identitiesWhy` 键行；对 diff 的 `+-` 行做 `grep -v identities` 后无其他内容行。stat（-w）= LOGIN 72、SEC 118、次要21 72、次要22 88（共 256+/94-）。
3. 深度 diff（`node .zcode/tmp/lane-O-deepdiff.mjs`，旧版 vs 工作树 parse 后逐路径比）：
   - **次要21**：27 个差异路径 = 9 个 case（索引 66/67/68/69/71/73/74/75/76 = RP01-04/06/08-11）× 3 键 `KEY ADDED`（identities/identitiesFrom/identitiesWhy）；
   - **次要22**：33 个差异路径 = 11 个 case（索引 33-43 = MW01-11）× 3 键 `KEY ADDED`；
   - **LOGIN**：36 个差异路径 = 36 个 case 的 `identitiesWhy` **值重写**（旧值含 `apps/client/src/pages/login/index.vue:98-101` 行号，新值无行号；`identities` 值本身未变，36 行全为 `["guest"]` 新旧一致）；
   - **SEC**：24 个差异路径 = 12 个 case（SEC 页 16 行中 12 行规则命中）的 `identitiesFrom`+`identitiesWhy` 值重写（from 由「tag-ops-identity-scope.mjs（W5 车道 2026-11-01 按规矩 1/2 手工打标，未跑 --apply）」→「tag-ops-identity-scope.mjs」）；
   - 四文件 `cases` 剔除 identities 三键后 **JSON 逐字节全等 = true**（判据正文 title/action/pre/expected/evidence、数组顺序、条目数零变化）；顶层非 cases 键（pageNotes 等）全等 = true；无 `KEY REMOVED`、无键序变化。
4. 序列化重放：
   - 次要21：旧文本 == `JSON.stringify(旧J,null,1)+'\n'` **true**；新文本 == `(新J,null,2)+'\n'` **true**；
   - 次要22：同上 **true/true**；
   - LOGIN：旧文本 == `(旧J,null,2)+'\n'` **true**（旧版本来就是标准 2 空格，**不存在 1→2 空格重排**）；新文本 == 2 空格 **true**；
   - SEC：旧文本 != 1 空格重放（首差在 `"identities": ["A", "B"],` **内联单行**——W5 手工混合格式）；新文本 == 2 空格重放 **true**。
5. 行数相称性：次要22 `@@ -1,1260 +1,1326 @@` 单巨型 hunk（全文件缩进变化所致），行数 1261→1327，**+66 = 11 组三元组 × 6 行/组**；次要21 1798→1852 **+54 = 9×6**；LOGIN 740→740（36 处等行数 why 值替换，72 行 diff = 36删+36加）；SEC 276→318 **+42 = 14 处 W5 内联单行 identities 展开为 4 行（+3/处）**。全部对得上，无「多出来的行」。
6. corpus 守恒：ops 目录 25 个权威 JSON，cases 总数 **1123**；次要22=78、次要21=102、login=38 —— 与 §5 声明的数字逐一相符。

**判定**：
- 「内容无删改」在**判据正文与裁定值层面成立**（三重独立验证：深度 diff、-w diff、序列化重放）；「行数守恒 1123」成立。
- 但「语义变化只有 identities 三元组**新增**」**不准确**：另有 **48 处既有元数据被重写**（LOGIN 36 处 identitiesWhy 丢 `:98-101` 行号出处；SEC 12 处 from/why 模板化、W5 手工打标 provenance 被抹）——见发现 F-1。
- 「W5 的 1 空格版整体换格式」对 **LOGIN 不适用**（它旧版已是标准 2 空格，本轮对它的 72 行 diff 全部来自 identitiesWhy 重写，无缩进重排成分）——见发现 F-1。

### 轴 1｜identities 字段的全部消费者

`grep -rln identities scripts/qa/**`（15 文件）+ `grep -rln identities apps/client/src/tests/**`（**0 文件**——client 测试不读该字段；`guest-guard-census.spec.ts`/`guest-landing-policy.spec.ts` 引用的是页面集合与 policy，不做行级 identities 分桶）。逐处判定：

**真消费者（读 ops 判据行的 `c.identities`，打标直接改变其行为）**：

| 消费者 | 读法 | 打标后的行为变化 | 判定 |
|---|---|---|---|
| `r-exec-cli.mjs:187 identityScopeSkip(c, identity)`（调用点 :1599-1603） | ids 非空且不含本腿 → 出一行 `SKIPPED`（理由串点名载体），`stats.idScope++` | 游客腿对 20 条新标行从「跑并得『落在别的页 ⇒ FAILED』」变为「SKIPPED（身份适用范围外）」；`stats.idScope` 进 `skippedTotal()`（:1436）与 RUNNER_STATS 分解串（:1908），两口径同源不打架 | 设计内；行数守恒不破（SKIPPED 不是消失）；自测 :236-241 六例覆盖正反 |
| `verify-guest-landing.mjs:90 guestNoLongerClaims / :98 identityDeclared` | ①收窄行（#67 路线）②整页未声明（entireGuest 路线，:108-117） | RP/MW 20 行从「无声明（若整页无声明可当 entireGuest 证人）」转入 narrowed 证人；recommend-pref 与 wallet 两页**退出 entireGuest 命中面**，30 个裁定页全部走① | 设计内且是本轮目的（§2.1 第 4 点）；真跑读数见轴 6 |
| `verify-real-coverage.mjs:225 axesOf / :134-137` | `A,B` → 只登录轴；未标 → 两轴都要 | 20 条新标行的**游客轴覆盖要求消失**（原来未标=游客腿也要一条真实覆盖） | 设计内（游客腿对弹走页作不了证）；前提是 20 行确属登录态——轴 3 逐行核实为是 |
| `apply-coverage-revalidation.mjs:87/:120 axesOf`（直接扫 ops 目录，仅 requiresReal 行） | 同上 | 同上（复验通过判据不再要求这些行的游客轴） | 同上 |
| `r-exec-ws.mjs:1293-1298 wrongId` | 名单行 identities 不含本腿 identity → `WSX_RESULT=FAIL` | 盘面与腿一致即无影响；防「B 腿替 A-only 行作证」 | 无被害 |
| `test-real-coverage-nominate.mjs` / `test-device-leg-tally.mjs` / `test-guest-landing.mjs:181/:334-335` | 合成 fixtures（A01/A02/A03、DL01、9a/9b 负例） | 不读盘面行数，负例自造 identities——打标不影响 | 无被害 |

**同名不同物（`identities` 是腿清点/CLI 旗标，不吃 ops 字段，打标零影响）**：`device-leg-tally.mjs:177`、`r-exec-cli.mjs:1414/:1955`（结果文件头的腿集合）、`r-exec-ws.mjs:1249`（实测行腿清点）、`shoot-fidelity-sweep.mjs:560-562`、`tour-r6.mjs:1591-1598`、`gen-tour-tsv.mjs --identities`、`make-reshoot-plan.mjs --identities`。`verify-real-coverage-disposition.mjs` 仅注释提及「identities 与 ops 字节 0 改动」的免检断言。

**cellplan/旧行序依赖**：`apply-ops-cellplans.mjs:85-86` 按 **case id** `find(x => x.id === id)` 匹配，不按行号/行序；本轮 cases 数组顺序与 id 均未变（轴 0 复核）⇒ **无 cellplan 被搞坏**。`merge-cellplans.mjs` 不含 identities。

**结论：没有被这 20 行新标搞坏或搞静默的消费者**；两个门（verify-real-coverage、apply-coverage-revalidation）对这 20 行的游客轴要求按设计消失——其正当性完全取决于 20 行确属登录态（轴 3 已逐行证实）。

### 轴 3｜20 条新标行打标语义抽检

命令：`.zcode/tmp/lane-O-rows.mjs`（新标行正文全量列出）+ RP05/RP07/MW04 全文单独复读。

- **RP01-04/06/08-11（9 条，次要21[66-76]）**：pre 逐条为「身份A mock 登录…」「同 RP01」；RP08 拉取失败重试、RP09 语言包、RP10 热区量测、RP11 滚动留白——全部登录态下的页面行为/回归采证。**无游客断言**。
- **MW01-11（11 条，次要22[33-43]）**：pre 逐条为「身份A 登录 → reLaunch wallet」「开放支（MW01 前置）」「开放支结束态」；MW11 虽未写身份词，expected 依赖登录态 store 余额 800.00，页有游客守卫。**无游客断言**。
- **MW04（封存支路，重点核）**：触发条件是 `app-config` 未下发 `commerce.coin=true` 的**配置分支**（缺省封存），pre 明写「身份A 登录」；断言的是封存卡渲染/零请求/零余额泄露——与身份无关的登录态行为。**标 A,B 正确**，不是把游客断言摘掉。
- **RP07（留游客腿之一）**：REAL_ONLY 清 token 构造**未登录**保存 → 采证「零 PUT 却提示成功」的假成功缺陷——判据本体就是未登录视角断言。**留游客腿正确**（规矩 2 的正确命中）。
- **RP05（留游客腿之二）**：title「…replaceAppPath 进寻觅（**完成引导**）」——「引导」指新用户 onboarding 完成跳转，pre 是「身份A mock 登录进本页」。**属 GUEST_RELEVANT 词表误伤**：语义是登录腿行，漏标 A,B，游客腿将白跑一条必得「落在登录页」的行——见发现 F-3。

**判定**：20 条新标**没有一条是游客行为被误标**（tagger 规矩 2 最怕的形状未发生）；RP07 保留正确；RP05 为关键词误伤漏标（P3，多噪声不丢覆盖）。

### 轴 4｜14 行存量 A,B（正文现命中游客词）逐行

全目录扫描（`.zcode/tmp/lane-O-rows.mjs` + `lane-O-buckets.mjs`）：`A,B` 总数 **466**，本轮规则命中 **452**，差 **14**。逐行（文件/ID/命中词/判定）：

**桶A——页在裁定表 & 正文命中游客词 & A,B（4 行）**：

| # | 文件/ID | 命中词与语境 | 判定 |
|---|---|---|---|
| 1 | SEC-INDEX[12] `SEC13` | pre「游客」：「身份 A 登录（**游客**档这张卡根本不渲染，已由 SEC02 判）」——括注解释，判据本体=登录态两层确认遮罩 | 关键词误伤语境；**保留 A,B 正确**（游客侧由 SEC02 承担） |
| 2 | SEC-INDEX[14] `SEC15` | expected「游客」：「guestGuarded 必须仍为 false（本页不因返回重新走 onLoad 而误判**游客**）」——守卫内部逻辑解释词 | 误伤；**保留正确** |
| 3 | 次要20[20] `VRN07` | expected「引导」：「401 时页面走『从严 + 重新登录**引导**』」——重登录语境；pre=「未满 18 岁的**登录身份**」 | 误伤；**保留正确** |
| 4 | 次要22[77] `VB10` | pre「游客」：「新注册**游客**账号无账单（…禁止删既有业务数据）」——数据构造说明；判据本体=「展示版 + 身份A 登录」看账单列表 | 误伤；**保留正确** |

**桶B——页不在裁定表(LANDINGS) 却有 A,B（10 行，`from=gap-carriers/identities-tagging.json`）**：

| # | 文件/ID | 页 | pre 身份词 | 判定 |
|---|---|---|---|---|
| 5 | PAGES-PROFILE[22] `PFI23` | pages/profile/index | （接 PFI22，录音授权） | 语音=本人资料功能，登录态合理；但无 policy 背书 |
| 6 | PAGES-PROFILE[24] `PFI25` | pages/profile/index | （接 PFI23 已有语音状态） | 同上 |
| 7 | CHAT-SESSION[9] `CS10` | subpackages/chat/chat-session/index | 「身份 A 进入一个私聊会话」 | 登录态；私信写操作游客必不可能 |
| 8 | CHAT-SESSION[28] `CS29` | 同上 | 「身份 A 已登录」 | 登录态 |
| 9 | 次要18[9] `VD10` | subpackages/village/village/detail | 「身份A 进入帖子详情」 | 发评论写操作，登录态 |
| 10 | 次要18[14] `VD15` | 同上 | 「身份A 进入他人帖子详情」 | 举报写操作，登录态 |
| 11 | 次要18[60] `TD03` | subpackages/circles/circles/topic-detail | 「身份A 进入话题详情」 | 发回复写操作，登录态 |
| 12 | 次要18[63] `TD06` | 同上 | 「身份A 进入他人话题详情」 | 举报写操作，登录态 |
| 13 | 次要20[32] `OT05` | subpackages/profile-extra/profile/other | 「身份A mock 登录」 | 喜欢写操作，登录态 |
| 14 | 次要20[36] `OT09` | 同上 | 「态2（已实名登录）」 | 悄悄话写请求，登录态 |

**判定**：**无一行是「语义上确属游客断言却被标 A,B」——不构成 P1**（tagger 规矩 2 最怕的「唯一有效游客断言被摘」未发生）。但账本对「14 行」的**归因**（§2.1：「历史标过、之后判据正文被改写命中游客词」）只对 4 行勉强成立（且这 4 行是误伤语境而非「后被改写」）、对 10+2 行 gap-carriers 来源不成立——见发现 F-2。

### 轴 5｜r-exec 腿跳过面（静态推演，次要21/22）

- r-exec-cli 的 chunk = ops 文件名（`--only 次要21`；:1177/:1448 按 `OPS/<name>.json` 加载）。`identityScopeSkip` 在每条 case 循环最前（:1599），命中即 `SKIPPED` + `stats.idScope++`。
- **次要21**（102 行，identities 分布 A,B=85）：游客腿（identity=guest）跳 **85** 行、跑 **17** 行（RP05/RP07 在跑的 17 行里）；本轮前为跳 76/跑 26 ⇒ **+9**。
- **次要22**（78 行，A,B=55）：游客腿跳 **55**、跑 **23**；本轮前 44/34 ⇒ **+11**。
- A/B 腿对 A,B 行照跑（ids 含本腿 ⇒ 不跳）；login 页 36 行 `["guest"]` 反向跳过登录腿（本轮未变）。
- **台账钉旧跳过数检查**：`test-guest-landing.mjs` 断言全部结构化（`booked.rows.length === polObj.rows.length`、「整页未声明恒 0」、9b 负例 exit 2 等），**无 per-chunk 跳过数钉值**；`r-exec-cli --selftest` 为纯函数合成对象（:236-241）不读盘面；reports 内的 `身份适用范围外=165`（device-legs-closure）、`SKIPPED=243`、注释「不再认领 420 条」（verify-guest-landing.mjs:78）均为**历史读数/叙述，非断言**。`stats.idScope` 同进 `skippedTotal()`（:1436）与 RUNNER_STATS（:1908），守恒等式「行数=判据数」由 SKIPPED 行保持。
- **结论：跳过理由行不会与任何既有 ledger/报告预期冲突；无台账钉着旧跳过数。**

### 轴 6｜guest-landing 三角账 + 真跑

**静态三角**（`.zcode/tmp` 探针 + tagger dry-run）：
- policy `rows=30`、唯一 page=**30**；
- ops 在册 58 页中，policy 30 页**全部有行（缺 0）**，30 页全部 narrowed>0；
- tagger dry-run `IDSCOPE_PAGES_WITH_RULING=30`（同一 policy 来源）。
- **三者页面集合一致（30=30=30）**。

**真跑**（`node scripts/qa/verify-guest-landing.mjs --policy scripts/qa/guest-landing-policy.json --triage .zcode/tmp/triage-r7-guest.json --out .zcode/tmp/lane-O-guest-booked.json`）：

```
GUEST_LAND_SOURCES=.zcode/tmp/triage-r7-guest.json（组=26，行次=239） ⇒ 并集组数=26 并集行数=239
GUEST_LAND_NO_RUN_WITNESS=4 组
GUEST_LAND_ROSTER 组=30（成员来自 ops 的=30 只来自跑测的=0）成员行次合计=468
GUEST_LAND_OPS_ENTIRE_GUEST=0 组 / 0 行（…）（无）
GUEST_LANDING groups=26 覆盖欠款行=468 锚点可核=18（不可核 0）
  状态分布 CLOSED=28 BOOKED=2
GUEST_LANDING_RESULT=OK（每组都有具名复测腿…）
EXIT=0
```

- **`GUEST_LAND_OPS_ENTIRE_GUEST=0 组 / 0 行`——与预期读数一致**（30 裁定页全部走①收窄路线）。
- 468 = 456（policy 页上 narrowed 口径行，本探针独立复算）+ 12（triage 跑测第二证人增量，`ids = [...narrowed, ...observed]` 并集）——口径闭合。
- 追加真跑 `test-guest-landing.mjs`：`checks=45 assertion failures = 1`，唯一红为「booked 组=30 ≠ measured 组=28」（真机 measure 腿边界，与本轮打标无关）；**第 10 块新断言「真数据：裁定页全部走收窄路线（整页未声明=0）」绿**——断言收紧在真数据上成立。

## 2) 发现（P1 无；P2×2；P3×1；备忘×1）

**F-1｜P2｜§5「内容无删改、语义变化只有 identities 三元组新增」的声明不完全成立：48 处既有 identities 元数据被重写，其中 LOGIN 的 36 处丢失源码行号出处、SEC 的 12 处丢失 W5 手工打标 provenance；且 LOGIN 根本没有「1 空格换 2 空格」的重排版**
- 判据正文（title/action/pre/expected/evidence）与 identities 裁定值零变化（已三重复核）——**打标语义本身无恙**；但「语义变化只有三元组新增」在字面上不实：`PAGES-LOGIN-INDEX.json` 36 处 `identitiesWhy` 旧值含 `index.vue:98-101` 行号出处、新值（工具模板取 policy.reason 现值截 200 字）无行号——**行号出处从权威盘上消失且无账**；`SUBPACKAGES-TOOLS-SECURITY-INDEX.json` 12 处 `identitiesFrom` 从「（W5 车道 2026-11-01 按规矩 1/2 手工打标，未跑 --apply）」被覆写为裸工具名——**W5 人工打标的溯源标记被抹**。另「W5 的 1 空格版整体换格式」对 LOGIN 不适用（其旧版==标准 2 空格序列化，72 行 diff 全是 why 重写）。
- 复现：`git diff -w f998762d^ f998762d -- reports/audit/round-6/ops/PAGES-LOGIN-INDEX.json | grep -c '^[+-].*identitiesWhy'` → 72（36 对）；`git show 'f998762d^:reports/audit/round-6/ops/PAGES-LOGIN-INDEX.json' | grep -c ':98-101'` → 36，工作树同命令 → 0。

**F-2｜P2｜「存量 14 行」的账本归因与盘面事实不符：只有 4 行是「表内页正文命中游客词」，另 10 行是页不在裁定表的 gap-carriers 历史标（工具三分支皆不覆盖的静默存量）**
- remediation §2.1 第 2 点与 tag 工具注释 :184-187 把复读改尺子的动机记为「历史标过、之后判据正文被改写命中游客词…实测存量 14 行」。实测 14 = 全量 A,B 466 − 规则命中 452，构成：桶A 4 行（SEC13/SEC15/VRN07/VB10，游客词均为误伤语境）+ 桶B 10 行（PFI23/PFI25/CS10/CS29/VD10/VD15/TD03/TD06/OT05/OT09，`from=gap-carriers/identities-tagging.json`，页不在 policy LANDINGS）。桶B 10 行不被工具任何分支触达（不标/不收窄/不撤销），其游客腿 SKIPPED **无 policy 背书**；语义抽检 10 行前置全部逐字登录身份（写操作类），无覆盖损失——但「改尺子」的真实动机（12 行非本工具来源）没有入账，下轮若有人按 §2.1 的归因去找「被改写命中游客词的行」，只能找到 4 行。
- 复现：`node .zcode/tmp/lane-O-buckets.mjs` → 桶A=4、桶B=10、差=14；`git show 'f998762d^:reports/audit/round-6/ops/次要20.json' | grep -A2 '"id": "OT05"'` → from=gap-carriers。

**F-3｜P3｜RP05 因「引导」关键词误伤漏标 A,B（onboarding 语境，非游客语境）——游客腿将多跑一条必失败行**
- RP05 title「保存成功：…replaceAppPath 进寻觅（完成引导）」、pre「身份A mock 登录进本页」——登录腿行为；GUEST_RELEVANT 的「引导」把 onboarding「完成引导」误伤 ⇒ 按规矩 2 字面不标 ⇒ 游客腿仍认领，而 recommend-pref 页游客被弹走（policy 裁定），该行在游客腿必产出「落在登录页」噪声——恰是本轮打标要消除的形状。丢的是噪声不是覆盖（P3）。同型风险：任何判据正文含 onboarding「引导」二字的行。
- 复现：`node scripts/qa/tag-ops-identity-scope.mjs`（dry-run，计划清单里无 RP05）；正文见 `次要21.json` RP05。

**F-4｜备忘（不计级）｜6 个 qa 工具里的 `identities` 与 ops 判据字段同名不同物**
- `device-leg-tally/r-exec-cli(结果头)/r-exec-ws(:1249)/shoot-fidelity-sweep/tour-r6` 的 `identities` 是**腿清点**，`gen-tour-tsv/make-reshoot-plan` 是 **CLI 旗标**——均不受打标影响。列此防下轮把同名误当消费链。

## 3) 台账

| 项 | 读数 |
|---|---|
| HEAD | `f998762dfb008151ac841c2a31aab2742568b7ff`（相符） |
| 4 ops 文件插/删 | LOGIN 36+36、SEC 293+293、次要21 1822+1822、次要22 1291+1291 |
| 深度 diff 差异路径 | 次要21=27（9×3 KEY ADDED）、次要22=33（11×3）、LOGIN=36（why 值重写）、SEC=24（from/why 值重写）；判据正文四文件 0 差异 |
| cases 计数（旧→新） | LOGIN 38→38、SEC 16→16、次要21 102→102、次要22 78→78；全目录 1123 |
| identities 形状（工作树，全目录） | guest=36、A,B=466（无其他形状） |
| 规则命中 / 存量差 | onRule=452；allAB−onRule=14（桶A 4 + 桶B 10） |
| tagger dry-run（幂等） | total=1123、裁定表页用例=498、收窄 A/B=452、保留游客=46、guest=36、撤销=0、**改写文件=0**、LANDINGS=30、loggedOutOnly 余量 2/2 无幽灵 |
| 游客腿跳过面（静态） | 次要21 跳 85/跑 17（本轮 +9）；次要22 跳 55/跑 23（本轮 +11） |
| verify-guest-landing 真跑 | ROSTER 30 组/468 行、NO_RUN_WITNESS=4、**OPS_ENTIRE_GUEST=0 组/0 行**、锚点 18/0、CLOSED=28 BOOKED=2、**EXIT=0** |
| test-guest-landing 真跑 | checks=45、failures=1（booked 30 ≠ measured 28，真机边界）；「整页未声明=0」断言绿 |
| 新标语义抽检 | 20/20 登录态；MW04 封存支路=配置分支+登录前置，标 A,B 正确；RP07 留游客腿正确；RP05 误伤漏标（F-3） |
| 探针产物 | `.zcode/tmp/lane-O-{deepdiff,count,rows,buckets}.mjs`、`.zcode/tmp/lane-O-guest-booked.json`（均被 gitignore 覆盖，仓内零改动） |
