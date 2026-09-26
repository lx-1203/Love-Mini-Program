# round-7 台账外记（本轮实测，不含任何继承结论）

本轮开跑 SHA：`094f7239`（= 当前 HEAD，round-6 收口提交）。所有"本轮落地"的判定都以它为对照组，
`--baseline 094f7239` 显式写在每一次判据台调用里；因此**只有工作树里未提交的改动**能被记作本轮成果，
已在 HEAD 里的修复不会被重复计账（这一点是本轮公开纠正的第一项：见 §5）。

## 1 采集通道：CLI 元素级交互已经可用，WS 仍未恢复
- 18 行交互态清单（`.zcode/tmp/round7/states.tsv`）→ `reports/screenshots/round-7-states/manifest-detail.json`，
  逐行给出「动作前节点数 → 动作后节点数」+ 前后两帧的 sha256：
  `STATES_ROWS=18 FRAMES=18 PROBE_ERR=2 HARNESS_MISS=5 PATH_BAD=0 STATES_CONSERVE=OK`
  判决分布 `APPEARED=10 / CHANGED_BUT_NO_NODE=1 / HARNESS_MISS=5 / PROBE_ERR=2`。
- **round-6 那条"弹层态帧与默认态逐字节相同"的悬案就此判定**：5 个 DUPBYTES 实体
  （publish A/B 话题+目标、post A/B 目标、hub B 已加入空态）全部 `APPEARED`（期望节点 0→1），
  即弹层确实挂载，round-6 的同字节是采集/判点问题，不是"弹层根本没开"。
  反证同批到位：`HARNESS_MISS` 的行（post 话题弹层、home 位置弹层、login 手机号表单）
  是取景器点错控件，按规则不进产品账。
- 复跑命令（可重跑）：
  `PATH=/d/codex-tools/node-v22.17.0-win-x64:$PATH node scripts/qa/tour-cli-states.mjs --tsv .zcode/tmp/round7/states.tsv --project <apps/client/dist/build/mp-weixin 绝对路径> --label round-7-states`
- 取景器边界（本轮新测得，写进判据之前必须知道）：
  1. **自定义组件内部节点 `page.$` 够不到**：`.emoji-panel`、`.chat-header__avatar-wrap` 只存在于
     `components/chat/*.wxml`，页级查询恒 0 ⇒ `chat-session 表情面板态` 判成 `CHANGED_BUT_NO_NODE`
     （像素 6594→11417 明显变了）而不是产品缺陷。
  2. `text.<class>` 这种"标签+类"选择器在本机 IDE 上退化成"只取第一个命中"，
     `.post-tool__icon--glyph` 单独用也仍取到第一个 `.post-tool`（读回「图片」）⇒ 图标类按钮不能靠选择器定位。
  3. IDE automator 桥会整段超时（`timeout waiting for automator response`）。
     本轮两次实测：主批 2 行 `PROBE_ERR`，复拍批 4 行里 2 行 `PROBE_ERR`。
- **修掉的载体缺陷**：`cli-automator.mjs:routeStack()` 以前会把 `ideCall` 的抛错直接冒到顶层，
  一次路由探针超时就打死整批取景（已拍的帧全部作废）。现按它文档里承诺的三态返回 `ERR:<原因>`；
  `tour-cli-states.mjs` 的落点缺失记录也改成带出探针实际值，不再一律写成"返回空"。
- **未恢复**：`miniprogram-automator` 的 WS 通道。`cli auto --auto-port N` 返回 `✔ auto` 但不落监听端口，
  `automator.connect()` 在任何端口都是 ~15ms 失败 ⇒ `r-exec.cjs`（1107 例执行轮）跑不起来。
  CLI 通道下每次调用 3–5 s，1107 例 ≈ 7 h，不是"慢一点"，是**这条腿本轮没有**（见 §6）。
- **批量传输层的探针跑了两次，两次都没给出吞吐结论，但量出一条新的通道性质**：
  `scripts/qa/probe-batch-transport.mjs`（一次 `automation_evaluate` 里链 K 个 `selectAll().fields()`，
  用 `.exec(cb)` 按链序取 K 个结果，再和"逐条单发"的 `element(offset)` 结果逐条比对保真）。
  K=20 那次批量调用 `timeout waiting for automator response`，而**同进程内先后的非 Promise evaluate
  （铸 token / 起会话 / verifyLogin / openPage）全部成功**；K=3 那次干脆从 try/catch 里漏出去，
  以未捕获的 socket `_onTimeout` 结束进程。两条都是要写进执行器设计的前提：
  ① 通道的故障率本身是实测属性（本轮 4 个批次里 3 个出现过 timeout）；
  ② `execFileSync` 的超时在某些路径上是以**异步事件**冒出来的，外层 try/catch 兜不住 ⇒
  真要跑 7 小时量级的批量执行轮，必须先给传输层加 `uncaughtException` 级别的隔离，
  而不是先假设"折叠调用就更快"。 Promise 形态到底可不可用：**未判定**，探针留着，通道恢复后按 §7 的判别实验再跑。


## 2 判据台的列位事实（本轮纠正的第二项）
判点是 **`issue-matrix.md` 第 11 列（处置格）** 抽的；第 8 列（证据格）只喂"修前值"。
所以 round-7 第一批"把写错的判据改成可判物件"的 5 次改写**完全没有进入判据台**——
不是我判断错，是改错了格子。这条是被自己造的仪表抓出来的：
`PROSE_BRACKET_REAL spans=0`（说明壳一次都没在生产数据上触发）⇒ 说明我改的文本没被读到。
改到第 11 列之后同一批的实测：`ARTIFACT_VERIFIED 9→14`、`NOT_IN_EITHER 7→2`、`PROBE_CONFLICTS 4→3`，
守恒式 `14+1+62+2+37=116` 成立（`CONSERVED=yes`），`NEEDS_UI_FRAME 55→62`。

## 3 ⟨⟩ 说明壳：一条既拦得住、也没把手的规则
问题形状：判据写错时，单元格里必须写下"原判点是谁、为什么作废"，
但抽取器分不清"要搜的词"和"被作废的词"——它把我写进去的 `TodayRecommendationView`、`metaLine`、
`toggleSessionPin` 又抠成硬判点，于是**改好的判据被自己的说明文字打回 NOT_IN_EITHER**（实测 3 条）。
落地形态：`verify-fixes-against-artifact.cjs` 的 `stripProseBrackets()`，`⟨…⟩` 内一律不抽判点。
配套（缺一个就不算装好）：
- 自检 `PROBE_SELFCHECK_CASES=6 SUPPRESSED=5 KEPT=5`，两个方向都要求非零；**它第一次跑就抓到我两个写错的用例**
  （一条 fixture 根本没放壳、一条期望 `--x` 能被抽出而抽取器只认 `var(--x)`），判据台当场 exit 2 拒绝出报告。
- 生产侧度量：`PROSE_BRACKET_REAL spans=24 suppressed-ident-tokens=61`（新脚本数的是被壳吃掉的候选判点数，
  第一版数错了轴——数了替换后的整句）。
- 台账完整性进门禁：`LEDGER_BRACKET spans=30 pairs=30/30 straddling-clause-delimiter=0`，
  不等或跨子句就直接判红。原因见 `scripts/qa/normalize-bracket-spans.mjs` 头注释：
  `clausesOf` 按 `。；;` 切子句，跨分隔符的长壳会被劈成"只有开壳的前半"，
  后果是**把它后面所有真判点静默吃掉**（比造假指控更糟）。本轮 30 个壳里 11 个有这毛病，已机械修平。
- 工具自身词表进黑名单（`JUNK_TOOLVOCAB`）：`srcRels`/`callerSnapshot`/`PROBE_CONFLICTS` 这类
  判据台自己的字段名被我写进说明后又被抽成判点，属同一类自伤。
- 两个新脚本：`scripts/qa/normalize-bracket-spans.mjs`、`scripts/qa/bracket-tokens.mjs`（按 token 粒度包壳，
  只在壳外替换、守恒检查开闭配对、一个都没包上就 exit 2，拒绝"空过"）。
  包壳计划可回溯：`reports/audit/round-7/bracketplan-false-probes.json`（每条 `why` 里带实测 art/src 命中数）。

## 4 判据改写 lanes（3 个 agent，各写一个计划文件，都不许碰台账）
`reports/audit/round-7/cellplan-criteria-{nie,und-a,und-b}.json`：
51 条分三组复核（7 条 NIE + 4 条自相矛盾 + 43 条 UNDECIDABLE，去重后 51 条、无双重归属），
产出的不是"全部改判据"而是**分桶**：patch 7 · needsFrame 13 · alreadyClosedInBaseline 21 · needsRuling 10
（按 token 复核后合计 51，与各计划文件 `counts` 逐项一致）。
lanes 里最值钱的一条反驳：**HEAD 就是本轮基线**，所以只有工作树里未提交的改动有方向可言；
它据此把 14 条我准备继续追的条目挡成 `alreadyClosedInBaseline`，避免"给已在 HEAD 里的修复再记一次功"。
另一条：`MP-R2VIS-...-CHAT-SESSION-A03` 的 baseline 命中其实来自**删除注释本身**（注释不进产物），
所以那条 absent 判点对本基线永真 ⇒ 拒绝写成绿。我按它的证据把该格标成"与判据台冲突，待人判"。

## 5 真实模式：不重启也把话说实
- **不重启 8080 的依据（两条实测，不是"应该没事"）**：`git log -- apps/api` 最后一次改动是 `f9a60925`；
  在跑的 JVM 就是台账 §里记的那个 pid **29536**，`StartTime 2026/9/26 3:12:29` 晚于该提交的工作时间，
  所以运行实例已经含全部已提交的后端代码；`GET /api/campus/topics` 返回 401（活着且在鉴权，
  与"游客不得浏览广场"的裁定一致）。共享实例的重启成本（82s 启动 + 打断别的取证）没有对应的收益，故不动。
- **G8 十环复跑：`G8_RINGS_OK=10/10 · G8_RESULT=PASS`**（凭据仍从 `apps/api/restart-backend.ps1` 运行时解析，未上命令行）。
  本轮写入的真实数据 **保留未删**，按既定裁定披露：`posts.id=256`、`comments.id=1224`、
  `campus_topics.id=285`、`campus_replies.id=17`。
  Ring6 的判据仍如实写着"后台视图没有计数字段 ⇒ 这是后台字段对账缺口，不是数值不一致"，没有为了绿把它折叠掉。
- **G9 素材探针：`G9_PROBED=455 G9_OK=455 G9_FAIL=0 · G9_RESULT=PASS`**，
  且四象限对照 (`G9_CONTROL`) 全 0 异常：在盘且 200=455，其余三格=0。
- **载体搬家（补上"建了却没接线"的老洞）**：G9 的可执行文件原本只在 `.zcode/tmp/g9-probe.cjs`——
  一个被 gitignore 的目录里，门禁面板却直接调它。现移到 `scripts/qa/g9-probe.cjs` 并改
  `emit-round-report.mjs:345` 的调用路径；搬完立刻从新位置跑了一次（上一条就是结果），
  不是"移完就算好"。
- 真实模式 UI 帧：见下方 §5c（本轮 real 巡检的结果与限制）。

## 5.1 real 模式巡检（本轮新增）
- `REALTOUR_SHOTS=18/18 FAILURES=2 gitSha=91e56562 out=reports/screenshots/round-7-real-tour`，
  路径自证 `REALTOUR_PATH_SELFCHECK=OK 18/18 条 path 按消费方解法可 stat`。
  gitSha 就是本轮的提交号 ⇒ 这批帧取的是**提交后的代码**，不是工作树里的半成品。
- 两条失败是同一条已知行为，而且这次是**真实模式**下复现的：
  已登录身份访问 `pages/login/index` 落在 `pages/discover/index`（A、B 两个身份都这样）。
  round-6 §102 在 real 产物上测到 2/2，本轮再 2/2 ⇒ 跨两轮、两种构建模式共 4/4 稳定复现。
  这条正是待裁决项「登录页已登录落地页」——裁决不该由我做，因为两个方向都合理
  （承认 discover 是登录后落地页，或改弹回来源页），而它会改变产品行为。
  所以本轮只把它从"一次性观察"升级成"可复现观察"，不动代码、不改状态。

## 6 撤销与裁决

- **撤销**：上一轮记忆里"3 项后端契约待改"（写侧 DTO 缺字段、私聊引用回复字段、上传扩展名校验）——
  本轮在 `apps/api` 复核，三处**都已在 HEAD 里**，`mvnw -q compile` 通过，无迁移待跑。
  那条断言的来源是我的记忆，不是工件；已把记忆原文标为 RETRACTED。
  推论：本轮**没有重启 8080**（共享实例重启的前提是"有契约改动要验"，前提不成立），
  因此真实模式的复跑（G8 十环 / G9 素材 / real 模式 UI 帧）本轮**仍未做**，不算已修。
  real 产物已重建：`build:mp-weixin:real:isolated` → `G7_RESULT=PASS`，
  产物落 `apps/client/dist/build/mp-weixin-real`，`sharedOutUntouched=yes`（mock 目录没被污染）。
- **裁决（ChatInput 去留）**：保持删除。依据三条实测：
  `apps/client/src` 全树 `ChatInput` 0 命中；mock 构建 exit 0；real 构建 `G7_RESULT=PASS`；
  `vitest src/tests/stores/messages.spec.ts` 23/23。
- **裁决（消息页死代码）**：`toggleSessionPin` 与其测试用例一并删除，长按菜单分支不采纳
  （判点只剩"被删的死函数不在产物里"，实测 art=0）。

## 7 本轮范围内仍开着的（不洗、不藏）
1. **1107 例执行轮跑不了**：WS 通道缺失，CLI 吞吐不支撑。可行路径是把多条断言折进**一次**
   `automation_evaluate`（一次调用返回逐例判决数组，截图仍逐例），需要先把 `r-exec.cjs` 的传输层换掉；
   本轮没有做完这件事，所以 round-7 的"完整循环"里执行轮这一格是空的。
   **预先登记的判别实验**（通道恢复后按这个顺序跑，不要凭印象改设计）：
   ① 先给 `cli-automator` 的传输层加 `uncaughtException`/`unhandledRejection` 隔离并重跑 K=3；
   ② 若仍 timeout ⇒ 换成"同步形态"再试一次（在 fn-source 里不返回 Promise，改用 IDE 支持的回调返回值），
   区分"通道死了"与"bridge 不等 Promise"；
   ③ 只有批量与单发**逐条一致**（`BATCH_FIDELITY=K/K`）才允许动 `r-exec.cjs`，
   否则就是把 1107 例换成一批更快的错答案。
2. ~~`NOT_IN_EITHER=2`：`CHAT-SESSION-A03`、`PROFILE-LOCATION-001`。~~ **已被 §8 取代：现在 `NOT_IN_EITHER=0`。**
   当初的定位是对的（不可判标识不在我改的那一列，而在 round-6 冻结的 `.zcode/tmp/fixwave/closer.json`
   与台账 col 9 里 —— 判据台把 closer 的 `action/evidence` 也当判点来源），
   解法不是改读取顺序，而是让台账的 ⟨⟩ 裁定对所有来源生效（见 §8）。
3. `PROBE_CONFLICTS=3`、`UNDECIDABLE=37`、`NEEDS_UI_FRAME=62`：去向已逐条写进台账格子。
4. 取景器 5 行 `HARNESS_MISS` + 2 行 `PROBE_ERR` 未终判（选择器要重定；`home` 位置弹层的期望节点
   在产物里真名是 `.location-sheet`，台账写的 `.bottom-sheet-root` 是错的锚点，尚未回写到判据）。
5. 未落地裁决 4 项：POST-002 图标族（要新增 2 个 SVG + 后端登记，不自己编）、HUB-006 键合并、
   `-111` 空态行、HOME-102 族余下 18 处裸路径。
6. `MP-R6EVID-STATE-DUPBYTES-001` 的"登录态再进登录页被弹到 discover"仍是二选一，本轮无新证据。
7. A/B 身份同页两态在本轮 5 个成对样本里 **2 组逐字节相同、3 组不同** ⇒ "跨身份同字节"既不恒定也不普遍，
   不能单独作为产品结论，也不能作为"构建模式决定"的定论（本轮未证机制）。

## 8 后半程：判点来源收敛到台账（取代 §7 第 2 条）

§7 第 2 条写的"改台账改不动 closer.json"在本节被解决，方式是**给壳加上行级语义**，而不是把判点来源改成"台账优先"：

- 实测判点来源其实有四条：台账 col 9（状态证据）、col 11（处置）、closer 差异串、源码锚点。
  第一轮只在 col 11 入壳，于是 `console.warn` 与 `ChatHeader` 从 col 9 混进来照样当硬判点——
  `NOT_IN_EITHER` 反而从 2 涨到 3（否决掉自相矛盾的那一侧之后，剩下那侧的不可判就露出来了）。
- 规则改成：**壳是"按行、按标识"的裁定**，同一行里任何来源的同名判点一律无效；
  壳外仍然写着的同名 token 照旧作判点。新增计数 `PROBE_VETOED_BY_LEDGER_SHELL=24 涉及条目=10`，
  逐条 (来源:类型:标识) 写进 item.notes —— 否决必须可清点，否则就是"规则悄悄改了考卷"。
- 顺带修掉一个**潜伏在旧代码里的索引缺陷**：去重表 `pseen` 是在登记下标之后才判丢弃的
  （"修前值黑名单"那条老路径同样有这个问题，只是一直没被触发），丢弃后不回收下标 ⇒
  后来的同名判点会 merge 到错位甚至 undefined 上。新增的否决规则第一次跑就把它撞成崩溃
  （`Cannot read properties of undefined (reading 'origin')`）。现在：丢弃即回收下标，
  并且每条 item 跑一次"索引不得悬空"断言，命中就进 FATAL 判红。
- 结果（同一基线 `094f7239`、同一 116 条扫描集）：
  `ARTIFACT_VERIFIED=16 SOURCE_ONLY=1 NEEDS_UI_FRAME=63 NOT_IN_EITHER=0 UNDECIDABLE=36 PROBE_CONFLICTS=3 CONSERVED=yes`。
  **本轮范围内已不存在"判据成立但未修"的条目**；剩 3 条 CONFLICTS 是真的二选一待裁决（不是判据写坏），
  36 条 UNDECIDABLE 的格子里都写了去向。
- 落账侧相应改动：`land-verdicts-into-ledger.mjs` 现在区分"看了 111 行、确实无需改动"
  （`PASS-NOOP`，exit 0）与"一行都没匹配上"（`FAIL`，exit 2）——
  之前两者共用 exit 2，会在干净结果上误报工具失效。
- 载体新增：`scripts/qa/bracket-tokens.mjs` 支持 `col` 字段（按列入壳，且只在壳外替换）；
  计划件 `reports/audit/round-7/bracketplan-round7b.json`（每条 `why` 里带实测 art/src 命中数）。
  台账现在 36 个壳、开闭 36/36、无一跨子句分隔符，这条不变式由判据台每次运行自己验。

### 8.1 一处**放宽测试**的公开交代（不是把红洗成绿）
`scripts/qa/test-probe-hygiene.cjs` 原有一条"NIE 桶非空（否则本测试的这条判据是空转）"。
本轮把 `NOT_IN_EITHER` 真降到 0 之后，这条断言以"空转防护"的名义把成功判成失败。
它真正要防的是"这段代码从没被执行过"，所以换成直接问代码：
要么确有 NIE 条目，要么壳否决路径真的处理过同名作废标识（`PROBE_VETOED_BY_LEDGER_SHELL>0`），
两者都为 0 才算空转；同时"回落口径"那条只在确有 NIE 条目时才要求出现。
计数型耦合去掉之后，机制型断言保留 —— 这是把测试从"生产数据当前分布"上解绑，不是降低标准。

## 9 巡检腿（⑤ 的第一半）：77 行 × real 模式，全部取景成功
- 清单由 `scripts/qa/gen-tour-tsv.mjs` 从**已编译产物**的 `app.json` 派生：
  主包 8 + 分包 64 = **72 页**；A 身份扫全部 72 页，B 身份只扫 5 个 tab 页（游客不得浏览广场是既有裁定）
  ⇒ `TOURTSV_ROWS=77`。不再抄上一轮的页面表，理由写在该脚本头注释里。
- 结果：`REALTOUR_SHOTS=77/77 FAILURES=5 gitSha=57e907e1`，
  路径自证 `REALTOUR_PATH_SELFCHECK=OK 77/77`，
  77 帧里 **76 个不同 contentHash**（只有一对同字节）、**0 帧 <4KB**（没有空白页混进证据）、
  `driftOrErrRoutes=0`（每条都拿到了可用路由）。
  产物：`reports/screenshots/round-7-real-tour-full/manifest-detail.json`。
- 5 条 failures 全部是"直开页面时被页面自己弹走"，其中 3 条**有源码依据、不是缺陷**：
  `subpackages/vip/{index,promo-code,bills}` 的 `index.vue:57 onLoad` 就是入口守卫
  （`:46` 的注释写明"从页面入口进入时 onLoad 拦截"，`navigateBack()` 在无返回栈时失败 ⇒ 落 `:63 switchTab(PROFILE)`）。
  取景器用 `simulator_open_page` 直开、没有返回栈，所以必然被弹回 profile —— 属 HARNESS 形状，不进产品账。
- 另外 2 条**未判定**，不当成已解释：
  `pages/login/index`（已登录被弹 discover；这是待裁决项，本轮第三次复现，见 §5.1）；
  `subpackages/setup/showcase/index`（弹 discover；该页 `:159` 有 `switchTab("/pages/discover/index")`，
  但没定位到它是守卫分支还是按钮回调 ⇒ 记为"原因未定"，不写成缺陷也不写成已解释）。
- 守恒：`77 行 = 77 帧`，`failures 5 ⊂ 77`（失败行也有帧，因为弹走前后都拍了），
  `A=72 / B=5` 与清单分组一致。

## 10 GATES.json 载体重写（④ 的第三项）与它的成本交代
- 这块载体的问题不是"数字过期"，而是**仓里没有任何代码写它**：报告读它、门禁面板读它，
  `grep -rn "real-e2e/GATES.json" scripts/` 只找得到读它的地方。于是它停在 `874ff52f` 的 6/6 环上。
- 新载体由 `scripts/qa/write-gates-json.mjs` 生成：当场跑"后端已重启"前置件 + G7 + G8 + G9，
  从各机的 `KEY=` 行解析后落盘；`schemaVersion` 升到 `gates-2`，带 `supersedes`（上一版的 SHA/时间/环数）。
  失败形状是刻意的：前置件不 PASS ⇒ 三道 Gate 记 BLOCKED（不沿用旧值）；
  任一机器没打出必要 KEY ⇒ 拒绝写盘（exit 2），因为"缺席"不能当"空值"更不能当"通过"。
- 现值：`precondition=PASS(pid 29536)` · `G7=PASS` · `G8=PASS(10/10)` · `G9=PASS(455/455)` ·
  `overall=PASS` · `gitSha=1598715f` · `caveat=["G8 环数已是 10（历史载体记 6）…"]`。
- 写这个脚本过程中自己踩到的三个解析缺陷（都已修，且都属"载体说假话"那一类）：
  ① `RESTARTED_RESULT=PASS JVM 晚于…` 是同行带说明，按整行相等判 ⇒ 真 PASS 被读成非 PASS，
     三道 Gate 全被记 BLOCKED（故障方向安全，但是假阴性）；
  ② `RESTARTED_PID=29536 startedAt="…"` 同样同行 ⇒ `jvmPid` 落成 `null`；
  ③ `G8_ARTIFACTS` 的第 4 项后面跟着中文说明 ⇒ 带锚点的正则把它整条丢掉 ⇒
     载体声称"本轮新增主键清单"却少一项（这条最危险：漏报的正是披露义务本身）。
- **成本交代**：G8 每跑一次真写 4 行库数据。本轮共跑 5 次 live G8（一次手工复验、生成器两次、
  最终门禁一次，另有一次生成器 dry），实测新增且**保留未删**的主键：
  `posts 256/258/259/260/261`、`comments 1224/1226/1227/1228/1229`、
  `campus_topics 285/287/288/289/290`、`campus_replies 17/21/22`
  （258/259 两次的 replies 主键没被打进当时的输出，不补记、不猜）。
  为把"改一个解析 bug 就要再花 4 行数据"这条成本降到 0，脚本每次把四台机器的原始输出留档到
  `.zcode/tmp/gates-run/`，支持 `--reuse` 从留档重解析、只重写载体——最终那版权体就是这样重写的，
  没有新增任何库行。

## 11 批量传输层的判别实验跑完了（⑤ 剩下那一格的定位）
`scripts/qa/probe-batch-transport.mjs` 三种形态各测（同一通道、同一会话、`login=logged-in userId=user-1001`）：

| 形态 | 一次调用带回 | 用时 | 结论 |
|---|---|---|---|
| 折叠 K 条**异步**节点查询（返回 Promise） | K=3 / K=6 都没带回 | 11.0 / 11.1 s 后 `api timeout` | **bridge 不等返回的 Promise** |
| 逐条单发 `element(offset)`（既有形态） | 1 条 | 每条 3–5 s | 1107 例 ⇒ ≈7 h，跑不动 |
| 折叠 K 条**同步**可算断言（不返回 Promise） | K=6 全部带回 | **0.9 s**（≈0.15 s/条） | 折叠本身可行，且快 20–30 倍 |

所以之前记的"CLI 通道吞吐不够"要收窄成一句更准的话：
**瓶颈不是 CLI 慢，而是断言的形状**——`page.$()` / `element()` 这类节点与文本断言只能一发一条，
而能从 JS 状态同步算出来的断言（路由栈、store/`$vm` 上的值、i18n 取出的文案、布尔守卫）可以成批折叠。

这同时说明执行轮该怎么落：`r-exec.cjs` 不能整体换成"一次 evaluate 跑一批"，
要按 `EXPECTED` 的形状分流——状态型走批量（0.15 s/条），节点型仍走单发（3–5 s/条）并单独记账。
本轮没有做这个分流改造（它是一次真实的执行器重写，半做完的执行器比没有更糟），
所以 1107 例这一格仍是空的；但"能不能批量、快多少、为什么"这三问现在是**量出来的**。

顺带一条通道事实：`execFileSync` 的超时不总是以可捕获异常出现，本轮出现过一次
未捕获的 `Socket._onTimeout` 直接把进程带走 ⇒ 长批量任务必须自带
`uncaughtException`/`unhandledRejection` 隔离，否则一条超时打掉整轮。

## 12 折叠传输层的保真实验跑通了（#36 的入场券，不是它本身）
`probe-batch-transport.mjs` 加了第三种形态与三态判定后，在同一通道、同一会话、同一页上做出了一次**有效**测量：

- 候选类名不再写死，改成从**被测页的 wxml 现取**；第一次取 4 个全答 0，
  原因是那 4 个都属于 `location-sheet` 那层未挂载的弹层 ⇒ 加了"答案必须是 1 与 0 的混合、
  且本页自己的类名至少 3 个答'存在'"两道闸，空对空的一致性直接判 FAIL。
- 结果页 `pages/discover/index`（`landed=` 与请求页一致）：15 条节点存在性断言，
  逐条单发答案 `[1,1,1,1,1,0,1,1,0,1,0,0,1,1,0]`，延迟折叠取件**逐位相同** ⇒ `DEFERRED_FIDELITY=15/15`。
- 计时：单发 0.77 s/条；折叠 2 次调用取回 15 条 = 3.1 s ⇒ **0.21 s/条（≈13×）**，
  按 15 条/批外推 1107 例的节点断言约 **3.7 分钟**（截图仍逐例，另计）。
- 折叠的实现形状（写进这里，是为了不用重新发明）：
  第一次调用 `getApp().__probeBag = {}` 后对每个 selector 起一条
  `wx.createSelectorQuery().selectAll(sel).fields({size:true}, cb)` 并 `exec()`，回调把 `'1'/'0'` 写进袋子，
  **当场同步返回** `'started:K:pendingN'`；等约 1.6 s；第二次调用只读袋子。
  绕开的正是"bridge 不 await 返回的 Promise"（同一页上返回 Promise 的批量在 11 s 处超时）。
- 通道事实一并留下：`routeStack()` 这条探针在同一次运行里会出现"整批正常、路由探针返回空"的情况
  （实测 3 次空、第 4 次正常）。所以页身份改由答案证明，落点探针为空只记一条 WARN——
  把它当硬闸门会误杀有效测量。

`#36` 仍然开着：这组数字证明的是"节点型断言可以成批且与单发逐位一致"，
执行器改造（按 `EXPECTED` 形状分流、批内失败要能定位到单例、长任务加异常隔离）还没动。
