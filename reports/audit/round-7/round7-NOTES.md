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

## 14 1107 例的成本结构（把"跑不动"换成"贵在哪"）
`scripts/qa/case-cost-census.mjs` 读 `reports/audit/round-6/ops/*.json` 的 24 份清单、1107 条用例，
按清单里已有字段（`pre/action/expected/evidence/requiresReal`）分类，单价用 §12 实测的那组数字
（开页 3.2 s、tap 1 s、截图 2.6 s、折叠断言 0.21 s/条），逐条落 `reports/audit/round-7/case-cost-census.json`。

- 分类分布：`frame-only=510 interact+frame=502 interact=46 route-assert=31 assert-only=7 needs-backend=11`
- 需要出帧的用例 **1023/1107（92%）**；需要交互的 554 条；要求真实模式的 236 条；页分组 58 组。
- 总时长估算 **≈69 分钟**，拆开看才是重点：
  `shot=44.3min(64%) tap=17.8min(26%) assert=3.9min(6%) open=3.1min(4%)`。

**这组数字推翻了我自己上一轮的假设**：折叠断言虽然把断言单价从 0.77 s 压到 0.21 s（13×），
但断言只占整个执行轮的 6% —— **真正的大头是"92% 的用例各要一张截图"**。
所以执行轮的正确改造顺序是：
1. 截图策略（同页同态去重、只给 `tier=critical` 出全帧、normal 用折叠断言 + 抽样帧），
   这一项决定 60%+ 的时长；
2. 每页只开一次（58 组 ⇒ 开页成本从 59 min 压到 3 min 级别）；
3. 断言折叠（只省 6%，但顺手）；
4. 异常隔离（§11 的未捕获 socket 超时）。
`needs-backend` 第一版判成 456 条（41%）是分类器过火——它只看"提到接口/响应"却没看 `pre` 写着 mock 构建；
收紧后是 11 条。**两版数字都留在这里**，因为"我第一版量错了"本身就是这一节要交的东西。

## 15 ① 结案：WS 采集通道是能被按需拉起来的，而它的成本结构和 CLI 桥正好相反

`cli-automator.mjs` 开头那段"本机 IDE 版本不再暴露 automator WS"的结论是**我上一轮写错的**，
今天被自己的测量推翻并已就地改正。载体是 `scripts/qa/ws-channel-up.mjs`（可重跑，退出码即结论）：

```
WS_UP=ALREADY_UP port=9420 connectMs=89 page=pages/discover/index hits=11000010 单条查询=8.1ms
```

拉起形态照 `cli.bat` 抄：Electron 主程序 + `ELECTRON_RUN_AS_NODE=1` + `cwd=安装目录` +
`['-e', BOOTSTRAP, '<install>/resources/app.asar.unpacked/js/common/cli/index.js', 'auto',
'--project', <产物目录>, '--auto-port', '9420']`，然后轮询 `netstat`。
两种错形态都以**误导性**的方式失败：把脚本路径塞在 `-e` 后面 ⇒ exe 把路径当代码求值（`[eval]:1 SyntaxError`）；
直接用顶层 `cli.js` ⇒ `MODULE_NOT_FOUND`。监听端口挂在**另一个 IDE 实例**上（9420=自动化实例，
9430=主窗口的 HTTP 桥），这正好对上"per-port 锁不等于机器级独占"那条既有结论。

单价实测（`ws-automator-bench.cjs` / `ws-signature-probe.cjs`）：

| 动作 | WS | CLI 桥 |
|---|---|---|
| 单条元素查询 `page.$` | **6.6–8.1 ms** | 210 ms（折叠探针，每次 spawn 子进程） |
| `page.$$` / `page.data` / `callWxMethod` | 92 / 160 / 186 ms | — |
| **出帧** | **61 s/张，5 次里 2 次超时** | 2.6 s/张 |

⇒ 结论不是"换成 WS"，而是**查询走 WS、出帧留在 CLI 桥**。§14 的量级摆在这：断言只占执行轮 6%，
截图占 64%，把一个只影响 6% 的腿提速 30 倍并不能救这一轮；而且 `close()` 会把整个自动化 IDE 实例关掉
（本轮我亲手关掉过一次，端口随之从监听表消失，下一次 connect 直接报
"check if target project window is opened with automation enabled"，看着像传输坏了其实是我自己按的）。
这个版本的会话对象没有 `disconnect`，收尾只能 `process.exit(0)`——顺带一条通用坑：
**socket 开着不退出，脚本打印完也像卡着**。

同页签名稳定性（`ws-signature-probe.cjs`，discover 页 6 轮 × 2.5 s 间隔）：
`page.data()` 签名 **6/6 全同**、元素存在性签名 **6/6 全同**，
而同一页连拍 12 帧只有 2 个唯一 sha256（§13 的旧实测）。
⇒ 数据/DOM 层没漂，像素层在漂（CSS 动画/自动轮播一类）。
所以"同态复用一帧"这条策略的复用键只能是**状态签名**，写进证据时必须注明它保证的是
"同一渲染态"而不是"字节相同"，否则就是在用弱断言冒充强断言。

执行轮这一头：观察态切片跑到 **93 行 / 2 个页组**（EXECUTED 69、SKIPPED 24）我就动手停了它——
按 2 页组/10 min 的速度全量 24 组要 4 小时，而我要先验证传输与截图策略，
没必要让一个已被判定为慢的通道继续占着模拟器。已 flush 的行留在
`reports/audit/round-7/interact/exec-results.json`，`RUNNER_SCOPE=observe-only` 那句话仍然成立：
**这不是一轮完整的执行轮**。它同时也是 §7 那条"跑完再报"的未完成项。

## 16 ④ 四项待裁决落地（以及"谁来签字"这件事的变化）

本轮目标里明写"把 4 项待裁决按可辩护默认落地并写明理由"，所以 §6 我那句"裁决不该由我做"
在**这一项**上不再成立；但授权只改变"谁签字"，不改变"每一条都要有可核对的证据"。

1. **登录页已登录落地页**（`MP-R6REAL-PAGES-LOGIN-INDEX-001`）：采台账里的 ①「承认现状」。
   证据：`pages/login/index.vue:87-89` 与 `:120` 本身就是 `switchTab("/pages/discover/index")`，
   `:504` 注释写明登录成功续体也 reLaunch 到「寻觅」⇒ "已登录访问登录页被弹到 discover" 与
   "登录成功后的落地页" 是同一个目标，不是分叉；本轮执行轮第 N 次复现同一弹走（不是偶发）。
   反向方案（弹 home 或弹来源页）需要"来源页"信息，而 `switchTab` 到 tab 页并不保证 referrer，
   等于为一个没有入口的需求引入新机制。**留一口**：若将来真要做"切换账号"，登录页需要自己的显式入口，
   这条要重开——现在的裁决只覆盖"已登录直达登录页"这一种触达。
2. **ChatInput.vue 删除去留**（`MP-R2VIS-COMPONENTS-CHAT-CHATINPUT-A01`）：采 (A) 保留删除。
   证据三条：`git ls-files` 已无该文件（删除已进 HEAD，不是只在工作树）；全仓 `src` + `tests`
   对 `ChatInput` **0 命中**；消费页 `subpackages/chat/chat-session/index.vue` 自带 `<textarea>/<input>`，
   输入能力没有随删除丢失。**但这条不能算"已用帧确认不破版"**：本轮上半程的帧出自 10:48 的产物，
   而删除是 14:42 的提交（见下面第 5 条），旧产物已被 15:13 的重建覆盖、内容无从回查 ⇒
   "不破版"这一半只能等重建后的新帧，现在登记的只有"死组件、零引用、能力仍在"。
3. **GATES.json 过期载体**：已按 §10 重写（`scripts/qa/write-gates-json.mjs`，带 supersedes 与 BLOCKED 语义）。
4. **遗留测试数据处置**：维持既有"保留 + 逐轮披露"裁定，理由不变（G8/G9 写入的行是环检的对照基线，
   清掉等于让下一轮十环没有可比对象）；累计披露见 §9/§10。

## 17 执行轮的 45 条 FAILED：全部能在源码里指到那一行导航

载体 `scripts/qa/triage-cold-entry.mjs`（把 FAILED 的"实际落点"回查源码，ROUTES 常量就地解析）：

```
TRIAGE_FAILED_ROWS=45 组=8 GUARD_COLD_ENTRY=34 GUARD_GLOBAL=11
TRIAGE_OPEN=0 全部 FAILED 都能在源码里指到具体导航
```

- 34 条是**页面自己的兜底导航**（如 `matching.vue:67-69` navigateBack / switchTab 到寻觅，
  `campus/index.vue:105-107`），即"冷启动直达"这条路本来不通；
- 11 条（setup/campus、setup/recommend-pref）页面内没有任何导航，出处是全局会话守卫
  `guards/session-guard.ts:93`（`redirectTo: ROUTES.TAB.DISCOVER`，缺 profile/campus/schedule 完成态就弹走）。

**这条不是把红洗成绿**：`GUARD_*` 只说明"这一组用例不能靠 open_page 直达取证"，
页面功能对不对仍要靠真实导航路径点进去看（＝交互切片的活），所以这 45 条的**覆盖债还在**，
只是从"未知故障"变成了"已知触达方式不对"。脚本里 UNEXPLAINED/GUARD_OTHER/NO_SOURCE 三个桶
一律算开口，`TRIAGE_OPEN` 不为 0 就不许写"已收口"。


## 18 帧的成本实测：59% 是字节相同的重复，但去重要发生在拍之前才算省

> **已用自洽数据重算（08:18，观察刀跑完之后）**：下面这组数就是干净数据的结果，撤稿横幅解除。
> §19 记录的是"为什么第一版数字不能用"——那组是在重建后那一轮进行到第 27 分钟时算的，
> 同名帧正在被覆盖，量到的是两个产物的混合字节。作废的那组是 224 帧 / 91 唯一 / 59%；
> 结论方向不变，数值以本节为准。

`scripts/qa/frame-hash-census.mjs`（对执行轮引用的每一帧做 sha256；输入=观察刀跑完后的
`exec-results.json`，267 条有帧的 EXECUTED）：

```
FH_ROWS_WITH_EVIDENCE=267 解析出路径=267 文件存在=267 文件缺失=0
FH_HASH_UNIQUE=103 FH_DUPEABLE=164 占比=61% 重复组=57
FH_DUP_GROUPS_CROSS_PAGE=0
```

三件事一次说清：

1. **重复是真的多**：103 个唯一内容 / 267 张，57 组重复里**没有一组跨页**
   （例：`pages/discover/index` 的 DC03–DC06 四张完全同字节）。⇒ 复用键只能用内容 hash；
   §15 已量过"按页+状态名去重只省 1%"，两条合起来才成立。
2. **但 hash 是拍完才知道的**：要省时间必须在按快门前就决定不拍。能提前知道的只有
   状态签名（§15 实测同一静态页 6 轮里 `page.data()` 与元素存在性签名 6/6 全同），
   所以策略是「按状态签名决定拍不拍 + 事后用 hash 证明这一组确实同字节」，
   而不是"先拍满再删重复"（那只省磁盘，不省 60 分钟）。这一条留给下一刀实现，
   本轮仍按每例一帧拍满——先拿到最强证据，再谈省。
3. **上一条"真缺陷"撤回**：我在 contaminated 版本里写"`SUBPACKAGES-CAMPUS-CAMPUS-HUB/CH01`
   的证据路径在盘上不存在（224 条里 1 条）"。干净数据上是 **267/267 全存在**，那个文件
   现在也在盘上（38379B，15:42 由重建后那一轮写的）⇒ 它和 59% 那组数一样是混合数据集的
   副产物，不是产品缺陷。**记成缺陷是我把自己的测量噪声上报成了问题**，撤回。

同批体检的兄弟脚本 `check-frame-orphanage.mjs` 报：孤儿 12 张（全属重建前那一批，来源要分开叙述），
晚于在测产物且没被引用的是 0 张。另：本轮也推翻了我自己在 §14 用的截图单价——普查里
`screenshot=2.6s` 是旧计时取的常数，实测约 10 s/帧，所以"截图占 64%"其实被低估了。

## 19 我自己上一节的数字要撤回一半：同帧名被重建后那一轮覆盖了

`exec-frames-to-corpus.mjs`（把执行轮结果导成 corpus 索引，逐帧从盘上重算 sha256）第一次跑就报：

```
EXEC2CORPUS frames=224 uniqueHash=96 可省=128 failures=45 skipped=838 证据异常=149
  E2C_EVIDENCE_BAD PAGES-DISCOVER-INDEX/DC02 :: 字节不符：记 14193 实 34078
```

**224 条里 149 条的证据字节对不上**，原因就是两轮用的是同一个取景目录 + 同一套
`MANIFEST-ID-after.png` 文件名：重建后那一轮（15:15 起）按同名覆盖了重建前那一轮
（13:44–13:52）留下的帧。所以：

- `exec-results.pre-rebuild-1048.json` 这份快照**只剩结论口径，它的 evidence 路径已经指向另一个产物的帧**。
  它作为"上一轮做了什么"的记录仍然有效，作为**帧证据**无效——谁引用谁就得带上这句。
- **§18 那组 59% / 91 唯一 / 42 组重复的数字不能要**：那是 07:42 算的，而覆盖从 15:15 就在持续发生，
  我量的是**两个产物混在一堆**的字节。结论方向（重复率高）大概率不变，但数值不成立，
  撤回，等重建后那一轮跑完在同一份数据上重算，再决定是否写回 §18。
  这条正是记忆里"审计自己的声明、别复述自己写过的数"的现行样本——我这次是**自己写的数也要重量**。
- 顺带说明为什么这个检查值得存在：它不是"测试绿了"，而是**每次从盘上重算**才看见的。
  执行器自己报 `RUNNER_EVIDENCE_HOLE=0` 全程都是 0，它没撒谎，但它只能保证
  "我拍的时候这张帧在"，保证不了"现在盘上这张还是我拍的那张"。

**下一轮的修法（写下来免得只留在对话里）**：取景目录按 `gitSha` 分一层
（`reports/screenshots/round-7-exec-<sha8>/`），或在文件名里带上产物指纹；同名覆盖在
"一轮跨多个产物"时是静默的证据腐化。当前这轮先手工把重建后的结果单独导 corpus，不动旧快照。

## 20 三条 lane 收紧判据的结果：UNDECIDABLE 36→10，但其中 8 条其实是"对照组选错"

三条 lane（A/B/C，各写自己的 cellplan，合并由 `merge-cellplans.mjs` 单写者做）合完 39 格后台账仍
229 行 / 0 错位 / 0 值域外。判据台同口径复算：

```
DUAL_ANCESTRY 874ff52f 早于 094f7239（后者才是本轮对照组）
DUAL_RUN a baseline=094f7239 … ARTIFACT_VERIFIED=22 NEEDS_UI_FRAME=82 NOT_IN_EITHER=1 UNDECIDABLE=10 CONSERVED=yes
DUAL_RUN b baseline=874ff52f … ARTIFACT_VERIFIED=30 NEEDS_UI_FRAME=79 NOT_IN_EITHER=1 UNDECIDABLE=5  CONSERVED=yes
DUAL_SAME_VERDICT=108 不一致=8 DUAL_ONLY_B_AV=8 DUAL_ONLY_A_AV=0
```

三件事：

1. **UNDECIDABLE 36 → 10**。这 26 条不是都"变可判了"，而是被分到该去的地方：
   2 条给出真判点（可机判），其余降级成 `人判：…` 显式人判项 ⇒ 它们改落 NEEDS_UI_FRAME
   （61→82）。**"含糊"变成"欠一帧/欠一个人判"是进展，不是变绿**，桶位的涨要如实报。
2. **lane B 抓到一个方法级错误，且它是对的**：有 8 条的修复提交是 `f9a60925`，而它是我本轮
   对照组 `094f7239` 的**祖先** ⇒ 在这个口径下"判点在基线里不存在"永远不可能成立。
   换更早的 `874ff52f` 再算，8 条立刻 ARTIFACT_VERIFIED，且反向掉出来的有 **0** 条
   （单调，不存在"换个好看的口径"的取舍）。所以这 8 条的正确结论是
   **"上一轮就已修，本轮口径不认"**，不是"本轮判据含糊"；引用它们时必须带上是哪个口径。
   我没有据此改判状态词，只是把两个口径都留下、逐条点名（`scripts/qa/dual-baseline-verdicts.mjs`）。
3. **NOT_IN_EITHER 从 0 变 1，且这条是真缺陷**：`MP-R2VIS…CAMPUS-HUB-002` 的判点是"删除型"
   （`campus-hub__cert-btn` / `-text` 两个类名不得出现在 hub.wxml/hub.wxss），lane A 如实写了
   "今天正确判决是 NOT_IN_EITHER"——也就是**判据已经成立、东西还没修**。本轮直接把它修掉：
   页头删掉重复的认证入口，只保留引导横幅那一处（`goCertification`、`campusHub.goCertify`
   仍各有一处消费 ⇒ 没造出孤儿处理器，也没造出孤儿文案键），两条样式规则一并删。
   状态词暂记 `待修复→已修复待复验`，等重建产物证明两个类名在 wxml/wxss 里都不出现才升。

**一处我没照着判据字面做，写清楚**：处置列原句是"页头只留标题与搜索图标"，但该页页头实际是
返回钮 + 标题 + 副标题，没有搜索图标；照字面删就会把**返回入口**删掉，为一个措辞不精确的判据
造成可用性问题。所以只执行判据里可机判、可证伪的那一半（两个类名必须消失），保留返回钮与
已认证标记（`v-else` 相应改成 `v-if="isVerified"`），并在此登记措辞与实物不符。

## 21 交互刀跑完：513 条里 361 条"没有可点的东西"，这是判据的账不是通道的账

`--tap --redo-taps` 的守恒结果（只把上一刀显式跳过的交互动词类退回重跑，已 EXECUTED 的行不动）：

```
WSX_ROWS new=513 merged=1107 之前已有=594 重复新行=0
WSX_STATS executed=59 failed=72 skipped=382(… tap禁触=21 tap无目标=361 tap失败=0 tap无帧=0)
WSX_EVIDENCE_HOLE 0 / WSX_RESULT=OK
```

拆分比"通过率"有用得多：

- **361/513（70%）= action 里根本没点名可点元素**（或元素当下不在页上）。
  这不是通道慢、也不是 IDE 不稳，是**用例文本没写"点哪个"** ⇒
  交互覆盖的缺口要靠补判据（给每条交互用例写上 selector）来还，
  任何传输层的改造都救不了它。这一条把 §14 里"要不要做交互刀"的问题换成了"判据先要能落"。
- 21 条命中不可逆清单（注销/解绑/清空/登出）⇒ 禁触并显式记 SKIPPED。
  这不是躲问题：一次登出会打掉后面几百条共用的会话，那一轮就只剩"注销成功"一帧。
- **tap 技术失败 0、点后无帧 0**；真跑起来的 59 条每条都带帧。
- FAILED 从观察刀的 62 涨到 134，`triage-cold-entry` 重新跑完仍然 **OPEN=0**
  （GUARD_COLD_ENTRY=114 / GUARD_GLOBAL=20）——涨的部分是"点完之后被守卫弹走"，逐条指得到源码导航行。

## 22 帧去重重算：52% 可省，但有 3 组跨页同字节，那不是"能省的重复"

观察刀＋交互刀合起来 326 条有帧的行，同一份自洽数据重算：

```
FH_HASH_UNIQUE=156 FH_DUPEABLE=170 占比=52% 重复组=63
FH_DUP_GROUPS_CROSS_PAGE=3
  3ad39623d7a1ad19 :: subpackages/tools/love-center/nearby | .../love-center/mbti
  543fb6aa05ef091a :: subpackages/profile-extra/profile/other | .../profile/location
```

两个结论，方向相反都要记：

1. 按内容 hash 复用可以少拍 170 张（52%），仍是省时间的正解；
2. **跨页同字节的 3 组不能算"省"**：两张不同页的帧字节完全一样，说明其中至少一张
   根本没落在它声称的那一页（或那两页在当下态确实长得一样）。
   ⇒ 复用键必须是 (内容 hash + 目标页)，只按 hash 去重会把"没落到目标页"这件事洗成"省了一张帧"。
   这 3 组作为取景嫌疑进本轮开口清单，不当成已收口。

（§18 的 59%/91 那组数作废的经过记在 §19；本节是替代它的自洽测量。）

## 23 真实刀不是上不去，是我把 `mintToken` 当同步函数用了

上一节收口时我把真实模式记成"blocker：产物起不来登录态（verify=not-logged-in）"。这条判断是错的，
而且错得很基础：`cli-automator.mjs:144` 的签名是 `mintToken(kind, repoRoot, deviceId)` 而且是 `async`，
而 `r-exec-cli.mjs:122` 写的是 `String(mintToken({ project: PROJECT }))`——

- `kind` 收到的是一个对象 ⇒ 不等于 `"A"` ⇒ 悄悄走了 **guest 分支**；
- 忘了 `await` ⇒ `String(Promise)` 得到字面量 `"[object Promise]"`，被当成 token 写进 storage。

载体核对（`scripts/qa/probe-boot-callsite.mjs`，两种形态 × 两个工程各测一次，串行跑，连测会把通道打挂）：

| 工程 | 形态 | verify | token 长度 |
|---|---|---|---|
| mock | broken | `logged-in userId=user-1001` | — |
| mock | fixed | `logged-in userId=user-1001` | 249 |
| real | broken | `not-logged-in` | — |
| real | fixed | `logged-in userId=100158` | 249 |

两个结论分开：
1. **mock 那两刀不受影响**——mock 的 session store 只认"有没有 token"，坏 token 也算登进（userId 就是
   夹具里的 user-1001），所以 §17/§21 的 134 条落点归因与 513 条交互刀不必重跑。
2. **真实模式的"blocker"是我自己造的门**。`interact-real` 那 259 行 SKIPPED 全部作废，
   原文件留作 `exec-results.ABORTED-void-callsite.json`（不删，作为"我错过一次"的载体）。

修完之后的真实刀（`reports/audit/round-7/interact-real/exec-results.json`，label `round-7-real-exec`，
`identity=A loginVerify=logged-in userId=100158`，绑 `1a1df78b`）：

```
RUNNER_ROWS new=1107 merged=1107 重复新行=0
EXECUTED=169 FAILED=16 SKIPPED=922（交互动词=49 非真实用例=871 判据无可判物件=2）
requiresReal 236 = 169 + 49 + 2 + 16   出帧=169  EVIDENCE_HOLE=0  通道异常=0  RUNNER_RESULT=OK
```

顺带修掉两处同类问题（都是"同一份账两个口径"）：
- `r-exec-cli` 组内那条 `skipped=` 漏加 `skipNonReal`，与终稿那条打架 ⇒ 两处共用 `skippedTotal()`；
- 结果文件写盘时 `identity` / `loginVerify` 没进 JSON ⇒ 增量与终稿两处写盘都补上，身份从此是**读得见的字段**。

还加了一条前置断言：铸 token 或 store 校验不成立就**一行都不跑**（`process.exit(2)`）。
身份不对时整批落点都不可信，让它继续跑只会产出一堆需要作废的行。
`r-exec-ws.mjs` 同样加了，但走 WS 自己的会话（`wsBootSession`/`wsVerifyLogin`）——在隔壁房间点灯不算这边亮。

## 24 台账里有 10 行是"列内容转置"的，列数门禁看不见它

判据台读台账是**按列名取值**的。第 16 轮账目归一化时有一批 6 列的 lane brief 被直接补成 11 列，
于是这 10 行整体错位：`页面` 装的是判据台判决（`STILL_OPEN` / `FIXED_IN_HEAD`），
`类别` 装的是状态文本，`severity` 装的是 `file:line`。列数正好是 11、status 那格恰好还是受控词，
所以 `OFF_SCHEMA_ROWS` 与 `STATUS_VOCAB_BAD` 两个判据都是 0 —— **形状合规、语义错位**。

- 清点：`ROTATED_ROWS=10`（229 行里的 4.4%），集中在 192–201 行。
- 修法：`scripts/qa/repair-rotated-ledger-rows.mjs`。它只做搬运不做判断——原判词、原状态文本、
  原 `file:line` 全部搬进「处置」，`页面` 按源文件反推成完整路由（`pages/nearby/index` 这种，
  与其余 23 行同口径），`severity` 记 `(未评，并案行)` 而不是编一个等级。
  **无损约束**：原行每个非空格子的文本必须在修后的整行里仍然出现，有一条丢字就不写盘。
- 门禁补上：`verify-ledger.mjs` 现在按表头列名定位 `页面`/`severity` 两列做语义核对，
  `ROTATED_ROWS>0` 直接判红。先在备份上证明它会咬（10），再在现行台账上证明它不误伤（0，`LEDGER_RESULT=PASS`，
  229 行不变）。
- **诚实记录：这次修复没有改变任何判决。** 修完后重跑判据台，116 条里只有 2 条的 `verdictWhy` 多了一句
  "判据只点到两载体都不存在的名字 STILL_OPEN"，桶分布仍是 `AV=31 / SO=1 / NUI=79 / NIE=0 / UN=5`。
  我原本预计这 10 行会造出假判决——错了。原因：判据台读的是「处置」列散文，而散文我一个字没动。
  这条的价值是账本正确 + 门禁能挡住下一次，不是把红洗掉；写在这里是为了不让它被记成"修了 10 条缺陷"。

## 25 79 条帧债第一次被拆开：56 条根本不需要交互，0 条需要新通道

§21 说过"0/82 可拍"——那是 **ops 用例**那一份账（判据没点名元素）。判据台的 79 条 `NEEDS_UI_FRAME`
是另一份账，之前一直没拆过。拆完（`scripts/qa/export-ui-frame-debts.mjs` →
`reports/audit/round-7/ui-frame-debt-classes.md`）：

```
STATIC_SHOOTABLE=56  NEEDS_STATE=9  NEEDS_INTERACTION=9  NEEDS_RUNTIME=4  UNSHOOTABLE=1  （合计 79，守恒）
```

76/79 的台账「页面」列能直接给出路由，id 里也能抠出来，最终 76 条有路由、3 条没有
（`AppShell` 组件级、`MP-R2-MATCHING-016` 冲突项、一条 `tmp/tour-R2` 来源行）。

按文件切成 5 条 lane（`split-frame-debt-lanes.mjs`，**同一文件的条目必须同桶**，
第一版按条贪心装桶会把一个文件劈成两半）交并行 agent 写"取景配方"：每条 = route + precondition +
steps + **可机器判的 assertion**（点名 selector/文案 + 极性 + `file:line` 依据）；
写不出来的必须显式落到 `REWRITE` 或 `NOT_SHOOTABLE`，不许含糊。

结果：`SHOOT=42 / REWRITE=16 / NOT_SHOOTABLE=21`（79 条全覆盖）。

**复核工具自己错了两次，这两次都会把对的配方判成假的**（`merge-frameplans.mjs`）：
1. 类名索引只收带 `__`/`--` 的名字 ⇒ 单连字符块名（`circle-card`、`comments-list`、`pinned-text`）
   必然"全仓找不到"。lane-F 复核时逐条证实，13 条里有 7 条是它误判。补了 `class="…"` 与 `.selector` 两路索引。
2. BEM 前缀正则 `[A-Za-z_$][\w$]*` 不允许连字符 ⇒ `my-interaction__label` 这种根本进不了索引。
3. 路由目录把主包当字符串读（`String(p)` 得到 `[object Object]`）⇒ `pages/profile/index` 被判成不存在的路由，
   `ROUTE_BAD=16` 全是我造的。改成 `p.path || p`。
   三个都修完后：`ANCHOR_MISS=0 / ANCHOR_TOKEN=0 / ROUTE_BAD=0 / stillBad=0`，`MERGE_RESULT=OK`，
   42 条 SHOOT 的 143 条断言逐条过机器核（71 处锚点被搬回真实位置、12 处按 lane-F 改对名字，全部留痕）。

顺带被 lane 指出、**尚未处理**的源码疑点（记在这里，不当已修）：
- `pages/nearby/index.vue:659` 顶值仍是 `24rpx`，判据称已取零；
- `subpackages/circles/circles/index.vue` 只有 900 行，判据点的 `:911` 不存在，徽标仍是 `:574` 的裸 `rgba`；
- `village/index.vue:730 / :695` 的错误条与 EmptyState 物件不存在（判据点名的东西没落地）；
- `MP-R2-PAGES-MESSAGES-INDEX-002` 与已生效裁定正面冲突（组件 `:16-32` + `zh-CN.ts:681-685` 双记否计数），
  且 mock 构建下 messages 路由根本不挂该组件；
- `--c-text-inverse` 与 `--c-bg-container` 浅/深色值完全相同（`design-variables.scss:108/121`、
  `tokens.scss:235/244`）⇒ 用对用错逐像素一致，这条判据永不可判。

## 26 帧级判决第一次跑通：8 条按帧闭环、8 条判红，而我自己的测量错改了三次才收敛

配方落成之后第一次真拍（`scripts/qa/shoot-frameplan.mjs`，label `round-7-uidebt-1a1df78b`）：
42 条 SHOOT 全出帧、字节都过 3000、守恒成立、通道异常 4 次（重试后都恢复）。
但**判决连错三次**，每一次都是"我把自己的测量问题记成了产品缺陷"：

1. **极性**：`wantAbsent` 之前从 `kind + expected` 散文里猜，散文里出现「无 / 不」就把 present 判成 absent
   ⇒ 26 条被判"未成立"。极性只允许来自 `kind` 字段（`absent|not-|hidden|不出现`）。
   修完 machine-pass 从 9 涨到 16，未成立从 26 降到 12。
2. **步骤没执行**：42 条里 **36 条的 steps 含非 `open-page` 动作**（tap 15 / scroll 12 / input 4 / measure 5 /
   capture 6 / longpress 2 …），而取景器只会"开页然后探测"。没点开弹层就看到弹层不存在，那不是回归。
   ⇒ 加了 `runSteps()`：CLI 这条腿能做的（scroll/wait/theme/navigate）真做，做不了的（tap/input/longpress/swipe）
   记 `stepsUnmet`，整条判 `STATE_NOT_APPLIED` 而不是判红，并显式欠给 WS 那条腿。
3. **落点**：`routeStack` 偶发取空/报错，上一版只重试一次 ⇒ 12 条"未成立"里有 4 条其实连页面都没确认。
   ⇒ 重试预算加到 3 次（每次之间重新开页），判决侧新增 `NO_LANDING` 桶：落点没确认的帧一律不作判据。
   同时禁止复用上轮"落点未确认"的帧（`--reuse-frames` 只允许复用落点确认过的），否则等于把一次测量错固化成证据。
4. 还有一个更早的：`selectorsOf` 把 lane 写的 `..publish-topic-chip__remove` 原样丢给 selectorQuery，
   查询必然失败 ⇒ 加了点号归一。7 条受影响。

当前口径（`reports/audit/round-7/frame-verdicts.md`，`FV_CONSERVED=yes` 覆盖 79/79）：

| 桶 | 条数 | 含义 |
|---|---|---|
| FIXED_FRAME | 8 | 帧 + 机器判点全部成立 ⇒ 台账改 `已修复（帧级复验…）` |
| REGRESSION | 8 | 落点确认、状态已施加、判点仍未成立 ⇒ 真发现，改回 `待修复` 并记实测值 |
| NO_LANDING | 10 | 帧拍了但落点未确认 ⇒ 不作判据，待重拍（本轮已在重拍中） |
| STATE_NOT_APPLIED | 14 | 欠 tap/input 等交互步骤 ⇒ 欠 WS 那条腿，不判 |
| NEEDS_EYE | 2 | 判点只能人读帧，帧路径已进 statusEvidence |
| REWRITE / NOT_SHOOTABLE | 16 / 21 | 欠的是判据或夹具，账上写明缺什么 |

台账被这两轮判决改动前后：`待修复 58→47`、`已修复 18→36`、`已修复待复验 57→50`，
`verify-ledger` 全程 `PASS`（229 行、`ROTATED_ROWS=0`、`STATUS_VOCAB_BAD=0`）。

## 27 又一批"待修复"其实早修完了：13 条里 11 条是过期状态

不在配方里的 13 条 `待修复` 交两条只读判定 lane（`openqueue-lane-G/H.json`），
再用 `scripts/qa/verify-openqueue-lanes.mjs` 逐条重开文件复核它们声称的 `file:line` + 原文：

```
OPENQ_PASSED=10 HELD=3 REJECTED=0   （11 条 ALREADY_FIXED，其中 1 条被我扣住，见下）
```

- **11 条判 ALREADY_FIXED**、0 条 FIX_NEEDED。这是本轮第 N 次出现"继承来的状态是过期的"，
  所以流程固定成：改台账之前必须机器复核锚点，`REJECTED=0` 才允许写。
- 我扣住了 1 条（`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004`）：lane 自己指出判据要求把 `border-radius`
  改成 `--r-lg`，而 `--r-lg` 实值是 20rpx、判据讲的是 16 —— 值对不对机器锚点检查看不出来，
  这种"语义冲突"交人裁决，不跟着 11 条一起自动写绿（`--hold` 就是这个用途）。
- 2 条 CRITERION_VAGUE 已改写判据但**不动状态**，其中 `…PROFILE-LOCATION-001` 拆成两半：
  可判的那半（三件物件同批在位）现已成立；`>100km` 距离守卫那半**没有载体**——
  `LocationCityView.java` 至今只有 `String city`，全仓 `cityCenter` 0 命中 ⇒ 这是一条新的 needs_backend 契约项，
  与 ③ 那三项不同，本轮不落地，写进终报开口清单。


## 28 WS 那条腿终于用来做动作了：18 条"状态未施加"里 13 条可判，但 18 条判红最后只落账 3 条

接 §27。给 `shoot-frameplan.mjs` 补上 WS 交互腿（`--ws-taps`：`page.$(sel)` + `tap/longpress/input`），
同一条腿兼任落点确认的第二通道。跑完整 42 条配方：
`SHOOT_SUMMARY planned=42 出帧=42 无证据=0 证据洞=0 失败=0 WS交互成功=16 WS交互未成=8`，
判决分桶从 `STATE_NOT_APPLIED=18 / FIXED=8 / REGRESSION=9` 变成 `5 / 12 / 18`。

三个只在真跑之后才暴露的测量问题，全部当场转成载体而不是"下次注意"：

1. **判红不等于可判**。18 条判红里，一半的 target 是散文（`陈默那一行的 .chat-item__time-row 内的 image 与 …`），
   `selectorsOf()` 从散文里抠一个 BEM 片段去 `selectAll`，抠到的物件条件渲染与否根本不受判据保证。
   新增 `scripts/qa/audit-frame-verdicts.mjs`：可判性三条件（target 是单一选择器 / 锚点在产物里真实存在 /
   探针给了数字答案）+ 第四条**正对照**（同帧至少要有一个 PRESENT(n>0)，否则"全 0"分不清是物件不在还是页面没渲染）。
   结果：**18 → 可落账 3、不作判据 15**。审计器第一版把类名切成了 `card__photo`
   （正则 `[a-zA-Z]\w*(__|--)\w+` 不许分隔符前有连字符），于是把真在产物里的 `.today-card__photo`
   报成"查无此 class"——正则修成 `[\w-]*` 后重跑，剔掉的才从 8 条变成真实的 15 条。
   被扣住的 15 条不但不落红，还要**撤销 12:14Z 那次已经写进台账的判红**：
   审计器 `--restore-from issue-matrix.md.pre-cellpatch.bak` 逐条把 status 恢复成取景前的值，
   statusEvidence 写明"撤销是因为探针不可判，不是因为验过没事"。15 条撤销、0 条静默丢弃。
2. **`--identity guest` 是假的**。`ensureIdentity("guest")` 走的是"铸一个 B token 再 boot"，
   日志打 `guest` 而 `verifyLogin` 回 `logged-in`——同一页被盖了两个身份的章。
   补 `clearSession()`（removeStorage + logout/reset）并硬性要求量到 `not-logged-in`，否则这一组直接失败。
3. **CLI 的 routeStack 会把子进程失败原文当值返回**（`ERR:automation_evaluate 调用失败…`），
   于是 5 条永远停在 NO_LANDING。加 WS 落点腿之后真相出来了：这 5 条**根本没到达目标页**——
   `pages/login/index` 实落 `pages/discover/index`、`subpackages/campus/campus/index` 实落 `…/campus/hub`。
   这是产品守卫行为，不是取景手段问题，也不是判红理由。落账方式见 `emit-landing-debt-plan.mjs`：
   只登记"请求哪页、实落哪页、由哪条通道确认、欠哪个前置"，不给判决。
   其中两条登录页行改用真游客身份重拍后落点确认（`uidebt-shoot-guest2`），
   剩下 3 条（matching ×2、campus/index ×1）按实测重定向落账。

顺带把两个 `WS 未启用` 之外的记账补齐：`steps[].action === "none"` 不再算 unmet（上一版把"无需交互"
记成"状态未施加"，白扣 6 条），以及交互后二次读栈记 `landingAfter` → 新桶 `LEFT_PAGE`
（点了返回钮之后在本页查物件必然查不到，那不是回归）。本轮 LEFT_PAGE=0。

台账现状：`待修复 47 / 已修复待复验 46 / 已修复（帧级）40`，`verify-ledger reports/audit/round-6` 仍 PASS
（229 行、错位 0、转置 0、值域外 0）。

## 29 唯一那条 P1 的未落一半，本轮真的落了：`/ip-city` 现在带城市中心坐标

§27 结尾写的是"`>100km` 距离守卫没有载体，本轮不落地，写进终报开口清单"。
这条决定在本轮稍后被推翻并落地——它不需要新裁决，需要的只是后端把中心坐标交出来。

- 契约：`LocationCityView` 由 `String city` 扩成 `(city, latitude, longitude)`，
  额外加一个"只有城市名"的兼容构造器；`LocationService` 新增 `CITY_CENTERS`
  （南京/杭州/上海/成都/广州——正好覆盖 `DEMO_CITY_NETS` 的取值域加默认城市），
  查不到中心的城市返回 `null` 坐标，语义是"量不出来"，**不许当距离 0**。
  `resolveCityView(ip)` 是新的调用面，`/api/v1/location/ip-city` 直接用它。
- 客户端：`utils/location.ts` 新增 `CITY_COORD_MAX_KM=100`、`distanceKm()`，
  `LocationResult` 新增 `cityDistanceKm` 与 `cityTrusted`；
  `citySource==="ip"` 且（距离 >100km 或 量不出来）⇒ `cityTrusted=false`。
- 页面：`subpackages/profile-extra/profile/location.vue` 新增 `cityDistant` 与 `shownCity`，
  不可信时**整块丢弃城市**（连地图 callout 一起改读 `shownCity`），落到"地址解析不可用 + 坐标行"，
  不再走 `buildLocationText`——那条链会兜出硬编码"北京大学 · 附近"，等于用假城市盖住缺陷。
- 载体：`apps/client/src/tests/utils/location-city.spec.ts`（6 例：跨省距离、同城市距离、
  无中心表=不可信、无城市=不掺和）+ `apps/api/src/test/java/.../LocationServiceTest.java`
  （3 例：演示网段带中心、内网走默认城市带中心、未知城市坐标必须是 null 不是 0）。
  vitest 全量 `1251` 例里唯一那条红是 `stores/match.spec.ts` 的**过期断言**
  （`swipeRight` 因 MP-R2-MATCHING-016 多了第三个实参 `callerSnapshot`，测试还按两个参数比），
  已按新契约钉成 `("card-1", true, null)` —— 参数被删掉时这条会红，而不是静默少一个实参。
- 重建与重启：mock 与 real 两份产物都重建，`cityTrusted` 在
  `dist/build/mp-weixin/utils/location.js` 与 `mp-weixin-real/utils/location.js` 各自在位，
  消费页 `subpackages/profile-extra/profile/location.js` 也读到它；8080 重启后
  `curl /api/v1/location/ip-city` 原样回 `{"city":"南京","latitude":32.041544,"longitude":118.767413}`。
  （共享 8080 的重启是本项明确授权的，旧进程 PID 29536 已核对命令行后停止，新 PID 32156。）
- home/nearby **故意没动**：它们的行（MP-R6-F1-NEARBY-IP-CITY-001）已经用 `citySource`
  把"IP 城市不做同城过滤、不写 NEARBY_CITY"关掉了，这一轮再改会作废它自己的待复验前置
  （重建前 `serverCityTag` 在 home/nearby 各 0 次、重建后必须 ≥1 次）。
  该行 §91 里"尚未开工"那句与源码不符：`home/index.vue:74`、`nearby/index.vue:117` 都已在读 `citySource`，
  已在本次核对中记下。

## 30 两个"跑到出报告才发现"的门禁洞：没有冻结步骤，和把空集当体检

1. **round-7 从来没有"冻结快照"这一步**。终报的 A/B 两侧分界要求 `.zcode/tmp/round7-exec/exec-results.snapshot-*.json`，
   而这个目录整轮不存在——只有 round-6 有。缺的不是文件，是**产生它的载体**：
   round-6 那次是手抄的 cp。新增 `scripts/qa/freeze-exec-snapshot.mjs`（原样复制、文件名带源 sha256 前 12 位、
   无真实 gitSha 或 0 行直接拒绝冻结），用它把重建前的 `exec-results.pre-rebuild-1048.json`
   （gitSha `713c1729`、1107 行）冻成 `exec-results.snapshot-b89dc4a71654.json`。
2. **`dist/src 四格` 把"无可检"和"检了没事"混成同一条红**。本轮定位类失败确实是 0 条
   （`locate-label / locate-selector / locate-label-token-lost` 三桶皆 0），
   旧逻辑一律记 `空集判红`，于是终报永远出不来。改成按桶计数分流：
   有定位类失败却恢复不出 token ⇒ 仍然 FAIL（提取器坏了）；三桶全 0 ⇒ 印 `NOT_APPLICABLE`
   并显式声明"它没有通过，它没跑"，不计入任何通过率。改完 `EMIT_RESULT=OK`，
   17 条守恒断言全绿（`G8 10/10`、`G9 455/455`、证据 `326+0+0`、`NO_EVIDENCE_*=0`）。
3. 顺手修掉一个会误导人的标签：分诊 sidecar 文件名写死 `triage-r6-at-report`，
   在 round-7 的报告里把新跑出来的分诊标成 r6 来源。现按 `--round-dir` 派生（`triage-r7-at-report`）。

## 31 重建之后第一次有 B 侧数据：90 行重测、0 行判红迁移，21 行只是"从未测变已测"

终报此前的口径是"B 侧 0 行 ⇒ 两个被测物的边界在数据上不存在"（§28 之前）。
本轮改动编入产物 + 8080 重启之后，用 `r-exec-cli.mjs --out reports/audit/round-7/interact-b`
跑了两个切片（home 40 行 → nearby/profile 50 行），再和 §30 冻出来的
`exec-results.snapshot-b89dc4a71654.json`（gitSha `713c1729`、1107 行）做差：

```
HISTO_LIVE={"EXECUTED":53,"SKIPPED":37}   ONLY_IN_LIVE=0   DUP_COMPOSITE_KEY live=0 frozen=0
MIGRATIONS=SKIPPED→EXECUTED=21
PASSRATE_LIVE nominal=53/90=58.9%  引用了png=53  png确在盘上=53
DELTA=OK 守恒 90=90
```

**这 21 条不是"修好了 21 条"**，逐条对过原因：
- 20 条的 A 侧状态就是自标注的测量洞——`落点探针没给结果（routeStack 取空/超时）⇒ … 待重跑`。
  这一轮重跑拿到了落点答案，于是从"没测"变成"测了"。
- 1 条（`PFI06`，MyHeader 分享）A 侧按"action 含交互动词"跳过，本轮以 observe-only 记了一条
  DOM 事实 `.my-header__icon--share:absent`。**observe-only 不判极性**，所以这条既不算通过也不算回归；
  它的终判仍要等交互腿（WS tap）那一刀。
- 迁移矩阵里 **没有任何 `EXECUTED→FAILED` 或 `FAILED→EXECUTED`**，
  也就是说 `utils/location.ts` 的 `cityTrusted` 改动在 home/nearby/profile 三页上量到的是零漂移
  （这三页都不读新字段，零漂移正是预期结果，不是额外成绩）。

诚实边界：这只覆盖 1107 里的 90 行，且集中在两个直接消费 `fetchCurrentLocation` 的页面。
"全轮 B 侧已复跑"仍然不成立，剩下 1017 行的 ONLY_IN_FROZEN 就摆在那里；
按 §30 记进 `rerun-round7-slices.sh` 的命令续跑即可，`--out` 指到 `interact-b` 不会覆盖 A 侧权威件。

## 32 ④ 第 4 项按"保留"落地，并顺手抓到清单自己会失忆

`遗留测试数据处置` 此前只写到"等你说"，等于把这一步退回给人拍板——但 ④ 要的是
**按可辩护默认落地并写明理由**。默认取"保留"：这些行是本轮判据的证据本体（RING2 的帖子、
RING5 的幂等计数、RING6 的评论/点赞都靠"行还在"才可复查），删掉就是把已成立的结论改成不可复查。

新增 `scripts/qa/inventory-g8-test-data.mjs`：
- 从 `g8-rings.txt / g9-assets.txt / summary.md` 抽指纹，**先数总账再分类**，
  凡落在 `id=`/`Id=` 总账里却没被分类收走的，一律以 `id-unclassified` 兜底入册；
  守恒判据是"去重主键全部入册"，不是"写下来的等于我解析到的"（后者只证明正则自洽，
  而漏数恰恰发生在正则层面——实测 `userId=100151` 因词边界躲过了第一版分类正则）。
- 分类只看**同一行**：之前取"前 90 字符"窗口，会把上一行的"点赞 HTTP 200"串进行身份账号那一行，
  把 user 标成 like。清单里的类别将来是删除依据，标错类别比不标更危险。
- 清理骨架**不猜表名**：日志里只有 HTTP 路径，JPA 到表的映射本脚本无权读，
  所以生成的是 `DELETE FROM <TABLE:post> WHERE id IN (236);` 这种填不动就删不掉的形态，
  且永远 `ROLLBACK`；`--apply` 还额外要求 `--backup` 指向一个真实存在的备份文件。

写这份清单时抓到一件更要紧的事：**`g8-rings.txt` 会被后一次 G8 整份覆盖**。
终报里记着的 `posts.id=270 / comments.id=1238 / campus_topics.id=299 / campus_replies.id=31`
在现在的日志里已经找不到了——也就是说"日志派生的清单"天生会失忆。
因此加了只增不换的 `test-data-ledger.json`（现在 8 条：4 条强指纹=取证日志、
4 条弱指纹=只剩报告文字、机器不可复核 ⇒ 不许进 DELETE），并要求每次 G8 之后立刻重跑清单。
这条纠正同时写进终报第 3 节第 1 项。

## 33 那 14 条"没有正对照"不是页面没渲染，是我把"探针没回答"读成了 0

§32 之后把 15 条被扣住的判红按成因分类：**14 条是"整帧所有机器判点都读成 0"**，只有 1 条是纯散文 target。
顺着这条查到执行器本身的错：`shoot-frameplan.mjs` 的折叠探测分两步（点火写 `app.__fpBag`、第二次调用取件），
第二步取回**空对象**时，下游 `ss.map(s => dom[s]).filter(v => v !== undefined)` 得到空数组，
再 `Math.max(0, ...[])` 就是 0 ⇒ 记成 `ABSENT_UNEXPECTED`。
也就是说"探针根本没回答"和"物件确实不在页面上"在我的代码里是同一个值，
而前者是通道故障、后者是产品结论——我把 14 次通道故障写成了 14 条判红候选。

两处修法：
- `hit.length === 0` 一律出 `PROBE_NO_ANSWER`，不判红也不判绿；
- `probeMany` 拿到空 bag 时**多等 1.6 s 再读一次**，两次都空就直接返回 `__err`（点名"探针没跑通"），
  因为真正的"物件不存在"会给回 `bag[i] = 0`（键在、值为 0），空对象只可能是取件早于回调。

同时核对同一套折叠探测在 `r-exec-cli.mjs` 里的实现：**它本来就分得开**
（第 97 行把 `undefined` 记成 `no-answer`、只有数字 0 才记 `absent`，第 249 行还要求 answered 非空），
所以这条错只影响我这一轮新写的取景器，不影响 1107 例执行轮的账。
教训不是"小心点"，而是：**任何"数个数"的探测都必须三态**（present / absent / no-answer），
两态实现早晚会把通道故障折算成产品缺陷——这次是 14 条，占被判红条目的 78%。

## 34 六条"永远等不到帧"的行改用源码级判点结案，顺带暴露 CRLF 会把注释读成代码

② 里有一批行的判据本来就是**代码结构命题**：模板不得每次调 `statsOf`、`avatarFailedIds` 必须有清除点、
`onLoad` 的 import 要在文件头、删掉 `.catch(() => {})` 空兜底、白色前景改用 `--c-text-inverse`
且禁改 `--c-bg-container`、删除 `socialProgressStore` 实例化与 `fetchProgress()`。
这些量帧和像素两侧都取不到，挂在"待修复"上是假的（改动确实在位），
记成"已修复（帧级复验）"更是假借帧的名义给绿。

新增 `scripts/qa/verify-source-shape.mjs`：把判据写成**谓词数据**（absent / present / countEq /
countTemplateEq / importHead），逐条重跑、逐条把原文 claim 写进 statusEvidence，
状态一律记 `已修复（源码级判点…）`。6 条全部成立，台账随之
`待修复 47→44`、`已修复待复验 46→43`、`已修复* 40→46`，`verify-ledger reports/audit/round-6` 仍 PASS
（229 行、值域外 0、转置 0）。

写这个闸时踩到一个会反复咬人的坑，值得单独记：**CRLF 会让 `$` 锚定的行正则整行匹配不到**。
`l.replace(/\/\/.*$/, "")` 在行尾带 `\r` 的文件上不生效——`.` 不匹配 `\r`，而没有 `m` 修饰的 `$`
只在整串末尾成立，于是那行注释没被剥掉，注释里作为反面例子写着的
``.catch(() => {})`` 被当成活代码，`MP-R2-VILLAGE-INDEX-010` 被误判"未修"。
修法是先 `\r\n → \n` 归一再剥注释。**这类"读不到就是没有 / 读到就是违反"的错向两边都会犯**：
上一节是"没回答读成 0 ⇒ 假红 14 条"，这一节是"注释读成代码 ⇒ 假红 1 条"。
本仓 `.vue`/`.scss` 多为 CRLF，任何按行锚定的门禁都要先归一。

## 35 剩下 43 条待修复按"欠什么"分类，并且有 4 条我**拒绝**写成判点

派生视图（不是门禁，只服务终报的"到底还欠什么"）：`待修复 44 → 7 类`，随后 §34 又收 1 条 ⇒ 现 43 条。

| 条数 | 欠的东西 | 下一步的载体 |
|---|---|---|
| 16 | 渲染帧（配方已就绪） | §33 修好三态探针后重拍 |
| 8 | 判据本身不可判 | 按 ② 收紧成可判物件 |
| 7 | closer 记为 P4 延后出本轮 | 本轮范围外，不动它才是对的 |
| 7 | 判点不可判（§32 审计扣住） | 先改配方的 target，再重拍 |
| 3 | 帧级判红（可落账的那批） | 真发现，要修代码 |
| 1 | 欠后端能力 / 1 | 待裁决 | 与 ③④ 对齐 |

有 4 条行我很想塞进 `verify-source-shape.mjs` 立刻结案，但对过源码后**没有加**——
加了就会得到一个"过得去的绿灯"，而谓词本身站不住：

- `MP-R2-POST-016`（删掉图块规则里写死的高度）：文件里剩下的 `height: calc(120rpx + env(safe-area-inset-bottom))`
  是底部安全区那条规则，不是图块规则。写成"全文件不得有 `height: calc`"会既红又假。
- `MP-R2-POSTTOPIC-013`（两处禁用条件并入 isSubmitting）：文件里 `isSubmitting` 出现 11 次，
  但一处 `:disabled=` 都搜不到，禁用是怎么表达的我还没确认，写不出等价谓词。
- `MP-R2VIS-PAGES-PROFILE-INDEX-003`（术语统一为 故事 还是 日常）：`MyStory.vue` 里
  `故事` 10 处、`日常` 4 处——**术语根本没统一**，这是行内容是真的未修，不是判据不可判；
  写 `countEq(故事,0)` 只会得到一条与产品口径绑定的红，而拍哪个词是产品决定。
- `MP-R2VIS-PAGES-MESSAGES-INDEX-002`：判据要求Subtitle 带 `{n}` 计数，而被点名的组件按已生效裁定整段否掉，
  且我按行内锚点去找 `components/profile/NotLoggedWaiting.vue` 时文件不在该路径——先找对承载文件再谈谓词。

对照下来，能安全进判点库的只有 `MP-R2-CAMPUS-HUB-009`（`#F0F4F2` 0 处、`#EEF7F2` 恰 2 处），已加进 SPEC 并落账。
判点库的价值恰恰在于它**会拒收**：一条写不出可靠谓词的"修复"就不是修复。

## 36 三条"可落账的判红"其实也是载体错位：文本判点要读文案，尺寸判点要读盒子

§33 之后剩下 3 条通过可判性审计的判红。逐条把 expected 和实测并排看，三条都不是产品回归：

| 行 | 判点原文要求 | 数量探测给的 | 真相需要 |
|---|---|---|---|
| `MP-R2-PAGES-REGISTER-INDEX-011` | `.field__tap--32` / `.field__clear` 的盒子 `≥88rpx`、`32rpx×32rpx 不变` | `ABSENT_UNEXPECTED` | 盒子尺寸（清除钮本就按输入态条件渲染） |
| `MP-R2-PAGES-REGISTER-INDEX-013` | `.field-error__text` **不得出现键路径字面量** `register.errPhoneFormat` | `PRESENT_UNEXPECTED(1)` | 渲染出的文案 |
| `MP-R2-PUB-114` | `.publish-row__meta` 不得出现「所有人可见」 | `PRESENT_UNEXPECTED(3)` | 渲染出的文案 |

也就是说我把 `text-not-contains` / `bounding-box-*` 这类判点当成"物件在不在"来判了——
`wantAbsent` 的正则确实把 `not-` 认成了负极性，但负极性作用在**数量**上，
而判据说的负极性作用在**文案内容**上：节点在、文案对，才是这条成立。
数量探测回答不了它，`fields({size:true})` 的 `.length` 也回答不了它。

补第二载具（`shoot-frameplan.mjs`）：
- `wsMeasure(anchors)` 用 WS 那条腿对每个锚点取 `element.text()` 与 `element.size()`；
- `textVerdict` 只认 expected 里被「」括起来的字面量，取不到字面量就 `PROBE_NO_ANSWER`，
  **不许"没提到就算通过"**；`text-not-contains` 命中字面量记 `TEXT_LEAK`，未命中记 `TEXT_CLEAN`；
- `boxVerdict` 按 `windowWidth/750` 把 rpx 折成 px（expected 里写了 px 就用 px），
  `min` 类要求宽高都不小于阈值（容差 1px），等值类要求偏差 ≤2px，否则 `BOX_SMALL/BOX_OFF`；
- 判决侧（`verdict-from-frames.mjs`）把 `TEXT_LEAK|TEXT_MISS|BOX_SMALL|BOX_OFF` 并入红，
  审计侧（`audit-frame-verdicts.mjs`）把 `TEXT_MATCH/TEXT_CLEAN/BOX_OK` 承认为正对照，
  并且**文本/尺寸判点不再因为 target 是人话而被扣住**——被读的是 anchor，anchor 仍要在产物里存在。

这三条要重拍才能拿到新载具的结论，等 B 侧执行轮跑完（设备只有一条，不能并发）再做；
在拿到之前它们维持 §33 的处置：不进台账判决，statusEvidence 里写明欠的是哪个载体。

## 37 B 侧 61 条失败全是同一类"到不了那一页"，拆成三个具名前置后就地补上

B 侧执行轮跑到 553 行时（EXECUTED 283 / SKIPPED 209 / FAILED 61）把失败逐条过了一遍：
**61 条的失败原因完全相同**——`落在别的页（页内守卫或路由重定向），须人判`，
且只集中在三个 suite：`PAGES-LOGIN-INDEX` 26、`SUBPACKAGES-CAMPUS-CAMPUS-INDEX` 15、
`SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING` 20。没有一条是别的失败形态，
也就是说这不是产品回归，是**用例的前置没写全**（A 侧把它们记成 SKIPPED，所以我一直没看见）。

三个前置逐个对到源码，都确认是"按设计就不接受裸直达"：

| suite | 弹走它的那行 | 缺的前置 | 本轮补法 |
|---|---|---|---|
| login | `pages/login/index.vue:87-89` 已登录 ⇒ `switchTab(discover)` | 游客身份 | `r-exec-cli.mjs --identity guest`（真清会话 + 硬性要求 `not-logged-in`；旧注释写的 `--identity B` 其实仍是登录态） |
| campus/index | `campus/index.vue:202-203` 无 `?school=` ⇒ `redirectTo(hub)`，注释自陈这是 2026-08-25 的 P0 设计 | URL 参数 | 新增 `ROUTE_QUERY`，两个执行器开页时都带 `school=…`（表在两处保持一致） |
| matching | `matching.vue:56-60`+`:76` 非 preview 且无在途配对 ⇒ 弹走 | URL 参数 | `onLoad` 里 **有现成的 QA 入口**：`?dev-preview=1`（注释自陈「直接停在匹配中页（QA 复验入口，规格书 06」）⇒ 已加进 `ROUTE_QUERY`，20 条不必注入 store 就能测 |

配套证据：§32 那 5 条"取景未到达目标页"落在的正是同样两个路由（campus/index→hub、
login→discover），两条独立通道给出同一个结论，所以这不是取景器的错觉。
matching 的 20 条在 A 侧同样是 SKIPPED。

**订正（写下本节几分钟后）**：我上一行说 matching 的前置「尚未补」是查得不够——它的 `onLoad` 里本来就留着 `?dev-preview=1` 这个 QA 复验入口，
和 campus/index 的 `?school=` 是同一类东西。两个参数都已进 `ROUTE_QUERY`，所以这 35 条（15+20）与 26 条游客档
一起，是**补前置**而不是等夹具；`dev-preview` 会把 status 直接置为已配对，因此它测的是这一页的呈现而不是配对算法，
报告里引用它时必须这样限定。

## 38 B 侧执行轮跑满 1107 行：A/B 第一次能整批对照，通过率 20.2% → 49.8%，且 0 条判绿转判红

`r-exec-cli.mjs --out reports/audit/round-7/interact-b`（gitSha `af66c4ed`，重建后的 mock 产物）跑完：

```
RUNNER_ROWS new=1017 merged=1107 之前已有=90 重复新行=0
RUNNER_STATUS_ALL EXECUTED=551 FAILED=85 SKIPPED=471
RUNNER_EVIDENCE_HOLE 0     通道异常次数=0     页组=57     出帧=498
```

对 §30 冻结的 A 侧快照（`exec-results.snapshot-b89dc4a71654.json`，gitSha `713c1729`）做差：

| | A（冻结，重建前） | B（本轮，重建后） |
|---|---|---|
| EXECUTED | 224 | 551 |
| SKIPPED | 838 | 471 |
| FAILED | 45 | 85 |
| 通过率（三个口径同名） | 20.2% | 49.8% |

`ONLY_IN_LIVE=0 ONLY_IN_FROZEN=0`、复合主键两份都 0 重复、png 三口径（字面引用 / 计数 / 确在盘上）都相等。
迁移矩阵逐条要有归因，不能只报涨的那半边：

- `SKIPPED→EXECUTED 323`、`FAILED→EXECUTED 11`：**覆盖变化，不是修好了 334 条**。
  A 侧那 11 条的失败原因是 `routeStack 探针没结果`（§33 同一条通道故障），B 侧拿到了落点答案；
  323 条则是 A 侧被 `requiresReal / 交互动词 / 探针空` 挡住，本轮真产物 + 修好的探针过了那道门。
- `FAILED→SKIPPED 2`、`EXECUTED→SKIPPED 7`：**这是覆盖率倒退，必须点名**。
  7 条全部是 `action 含交互动词 ⇒ observe-only` —— A 侧那批是在更宽松的老口径下被"跑了一遍"，
  现在的执行器拒绝在没有交互腿时假装测过。所以这 7 条在交互刀（WS tap 那一轮）补上之前
  不算测过，报覆盖率时要把它们从"已覆盖"里扣出来。
- `SKIPPED→FAILED 53`：全部落在 §37 那五类"缺前置"的页（login 26 / campus-index 15 / matching 20 /
  tag-posts 7 / 次要22 17 = 85 条 FAILED 的全部），B 侧执行轮启动早于 `ROUTE_QUERY` 与 `--identity guest`
  两处修改，所以这一轮**没能**用上补好的前置；接刀脚本 `round7-post-b-slice.sh` 用 `interact-b2` 重测它们。
- **没有任何 `EXECUTED→FAILED`**：重建 + 8080 契约改动 + `cityTrusted` 落地，
  在 1107 行里没有制造一条新红。

## 39 「落在别的页」其实有两种：产品把人弹走，和载体根本表达不了那个身份

接刀脚本补完三个具名前置后，`interact-b2` 的 A 侧 10 个页组 **executed=88 / failed=0**
（`subpackages/campus/campus/index`、`discover/matching`、`village/detail`、`village/tag-posts`、
`village/history`、`circles/index`、`circles/topics`、`circles/topic-detail`、`circles/circle-home`、
`campus/certification`）——§37 那三类"缺前置"里带 URL 参数的两条确实被参数治好了。
剩下没治好的是游客腿那 26 条：`[boot] clear-ok identity=guest verify=not-logged-in`
之后开 `pages/login/index`，落点仍是 `pages/discover/index`。
**这一条我没有直接记红，因为同一件事在帧目录里有两个反例。**

| 取景目录 | 头部标的身份 | 头部 verify | 落点 |
|---|---|---|---|
| `uidebt-shoot-guest` | guest | `not-logged-in` | `pages/discover/index` |
| `uidebt-shoot-guest2` | guest | `not-logged-in` | **`pages/login/index`** |
| `uidebt-shoot-wsl3` | guest | **`logged-in userId=user-1001`** | `pages/login/index` |

同样"已清会话"的两次，一次被弹走一次停住；而唯一"其实没清掉"的那次反而停住了。
这不像产品行为，像**次序**：差别只在"这一次开页有没有顺带重跑启动链路"。
静态证据支持这个方向——mock 包每次启动都会造一个登录态出来：

- 被测物档位：`apps/client/dist/build/mp-weixin/config/env.js` → `VITE_API_MODE:"mock"`（`envSha8=f1c7b96b`），
  `.../mp-weixin-real/config/env.js` → `VITE_API_MODE:"real"`（`envSha8=f0677920`）。
- `apps/client/src/stores/session.ts:617` 的 `if (useMock()) { this.userSession = { ...mockUserSession }; }`
  是**无条件**赋值（这条判点由 `scripts/qa/artifact-band.mjs` 读工作树源码算出来，不是抄注释；
  产品哪天给它加了条件，这条前置会自己放行）。
- 于是登录页 `pages/login/index.vue:87-89` 的 `watch(isLoggedIn) → switchTab(discover)` 按设计生效——
  这正是 §29 已经裁过的那件事（已登录直达登录页被弹到寻觅是有意实现）。

**这次新增的载体侧东西**（目的都是"下次不许再把测量错记成产品缺陷"）：

1. `scripts/qa/artifact-band.mjs`：读在盘产物档位 + 读源码无条件注入判点 → `assertGuestCapable()`。
2. `scripts/qa/probe-guest-band.mjs`：cold / warm 两条腿各量一次「开页前 / 开页后」的会话与落点，
   把"是次序还是产品"变成一条可重跑的实测（结论见 §40）。
3. `scripts/qa/r-exec-cli.mjs`：游客腿开跑前先过档位前置——不通过就 `exit 2` 一行都不跑，
   确认要跑的话显式加 `--guest-warmup`（先开一个无关页把启动链路消耗掉再清会话）。
4. 同一文件把**档位写进每一行**：行新增 `identity` 与 `band`（`mock@f1c7b96b` 这种形态），
   文件头新增 `identities` / `project` / `band` / `fileBands`，日志新增
   `RUNNER_BAND` / `RUNNER_IDENTITIES` / `RUNNER_FILE_BANDS`，多于一种就打 `RUNNER_MIXED`。
   原因很具体：本轮 `interact-b2` 头部写着 `identity=A`，里面 38 行却是游客腿跑出来的——
   单一标量的头部会替所有行说话，事后复盘时"游客档失败"到底是谁测的就查不清了。

顺带从同一批数据里挖出**第三类落不了地的用例**：34 条 VIP 用例（`ops/次要22`，含 17 条判 FAILED）。
`subpackages/vip/index.vue:57-65` 的 `onLoad` 守卫读 `featureFlags.membershipEnabled`，
而 `apps/client/src/config/feature-flags.ts:29` 默认 `false`（会员未上线），
只有 `config/showcase.ts:69` 的 `applyShowcaseMode()` 会置 `true` ⇒
**mock 与 real 两档产物上都量不到 VIP 页**，被弹回「我的」Tab 是守卫按设计工作。
为此新增 `apps/client/scripts/build-showcase-isolated.mjs`（用 `UNI_OUTPUT_DIR` 把展示版
构建到 `apps/client/dist/build/mp-weixin-showcase`，构建前后比对 mock 产物指纹）。
它第一次跑就**失败并自动回滚**：`prepare-static.mjs` 要整目录换 `src/static`，
与还在读工程的模拟器抢锁 → `Permission denied`，脚本自己把 `src/static.bak.*` 移回原位。
教训写在这里：**构建不能与模拟器并发**（这条与 §35 的"并发写同一批文件"是同一类错）。

账没动的部分：那 26 条游客 FAILED 现在仍按 `FAILED` 留在 `interact-b2` 里，
等 §40 的实测与重测自己说话——不改判、不重打戳。

## 40 实测把 26 条游客 FAILED 判成"载体没量到"，并在真档上重测成 25 条通过

`scripts/qa/probe-guest-band.mjs` 在 mock 产物（`envSha8=f1c7b96b`）上跑两条腿，
两腿都是同一个结果——**清完会话、验证过 `not-logged-in` 之后，任何一次开页都会把会话造回来**：

```
cold_verify_before=not-logged-in  cold_verify_after=logged-in userId=user-1001  cold_route=pages/login/index  ⇒ AUTOLOGIN_ON_OPEN
warm_verify_before=not-logged-in  warm_verify_after=logged-in userId=user-1001  warm_route=pages/discover/index ⇒ AUTOLOGIN_ON_OPEN
```

所以"落点是不是 login/index"根本不是这条判据要问的东西：游客身份在 mock 档上不可测，
落点与否都只是登录页自己的 `switchTab`。§39 表里 `guest2` 那次"停在 login/index"也不是反例——
它停在页上，但出帧那一刻 store 已登录，**那张帧是登录态帧盖了游客的章**。

换 `mp-weixin-real` 档（`envSha8=f0677920`，后端 8080 在服）重跑同一份 manifest：

```
RUNNER_GUEST_BAND mode=real ok=true
RUNNER_STATS identity=guest loginVerify=not-logged-in executed=25 failed=0 skipped=13(交互动词=11 requiresReal=1) 出帧=25
RUNNER_EVIDENCE_HOLE 0 ｜ RUNNER_BAND project=.../mp-weixin-real VITE_API_MODE=real ｜ RUNNER_IDENTITIES guest=38
```

**取代关系写成了一张可对账的纸**：`scripts/qa/supersede-mock-guest-rows.mjs`
→ `reports/audit/round-7/guest-band-supersede.json`（38 行逐条 old/new 对照，`SUPERSEDE_UNMATCHED 0`）。
它不信任文件头那个 `identity` 标量（会被后跑的腿覆盖），而是回到
`round7-post-b-slice.sh` 里核"这个 manifest 是否只出现在 `--identity guest` 那条命令上"
（`SUPERSEDE_IDENTITY_PROOF … 是`；第一版因为它按物理行读 shell 而证明失败——续行没折起来，
证不出来时它选择 **停住不作废**，这个行为是对的）。它还拒绝用"无证据的绿"去取代红。

顺带把这类错位变成结构性拦截：

- `scripts/qa/artifact-band.mjs`（新增）：读在盘产物档位 + 读工作树 `session.ts:617` 的无条件注入判点；
  产品哪天收了那个分支，前置会自己放行。
- 执行器：`--identity guest` 先过档位前置，不过就 `exit 2` 一行不跑；显式 `--guest-warmup` 才允许预热后跑；
  每行带 `identity` + `band`，文件头带 `identities` / `fileBands`，多于一种就打 `RUNNER_MIXED`。
- 取景器：出帧前再量一次身份（`identityAtFrame` / `identityOk`），
  不符就把该组帧标成"不可当该身份证据"并记进 `identityMismatch`；`ensureIdentity` 的 guest 分支同样先过档位前置。
- 判决器 `verdict-from-frames.mjs`：新增 `IDENTITY_MISMATCH` 桶，优先于落点/状态判定，
  带错身份章的帧既不判红也不判绿。
- 真档重拍 6 条被身份吃掉的帧判点（`--ws-taps` → `reports/audit/round-7/uidebt-shoot-real-guest/`）；
  结果与它的 `identityAtFrame` 一起进 §41 的分桶。

## 41 这一批落账的东西，以及我在撤销逻辑里抓到的第二个自己写的错

`round7-post-b-slice.sh` 的 4 步跑完后核对再落账：

- 第二载具（`element.text` / `element.size`）重拍 28 条，全部 `落点=确认`；
  分桶 `FIXED_FRAME=13`（比上一批多 1）、`REGRESSION=18`、`STATE_NOT_APPLIED=6`、
  `LEFT_PAGE=1`、`NEEDS_EYE=4`、`NOT_SHOOTABLE=21`、`REWRITE=16`。
- 可判性闸：19 条判红里 **可落账 2 / 不作判据 17**。
- **抓到的错**：第一版 `audit-frame-verdicts.mjs` 的"撤销"只挡备份值为帧级**绿**的情况，
  备份本身是**上一轮帧级判红**时它照抄——于是 `撤销本轮判红` 的补丁会把一条判红原样写回去，
  17 条撤销里有 9 条是这样。另一个方向也错：备份是帧级绿时它 `continue`，
  等于本轮那条红根本没被撤销。改成分三种去向（见 `frame-red-audit.md` 新增的"撤销去向"一节）：
  普通状态→照抄；备份是帧级绿→照抄（那才是撤销对象）；备份也是判红→写成
  `待修复（帧级判点不可判…）`，状态仍是红但不冒充"产品未修"。
  并加守恒行 `FRA_RESTORE_CONSERVE 被扣住=17 有去向记录=17 改写为不可判=9 备份查无=0`。
- 落账：`cellplan-round7-frames-admissible.json` 111 处 + `cellplan-source-shape.json` 14 处，
  台账从 `帧级绿 12 / 帧级红 10` 变成 **`帧级绿 13 / 帧级红 2 / 帧级判点不可判 9`**，
  `源码级判点 7` 保持；`verify-ledger reports/audit/round-6` = PASS（229 行、词表非法 0），
  `verify-state-truth reports/audit/round-7` = PASS。
- 一个要记的坑：`patch-ledger-cells.mjs` 的备份名固定 `issue-matrix.md.pre-cellpatch.bak`，
  第二次 apply 会把第一次的备份覆盖掉 ⇒ 现在那个 `.bak` 已经是"本轮两次写入之后"的状态，
  再拿它当 `--restore-from` 会退到写入之后而不是之前。

真档重拍那 6 条之后，判决器一次读三份帧文件（ws 42 行 + txt 28 行 + real-guest 6 行，后传覆盖先传并逐条打 `FV_WARN`）：
`IDENTITY_MISMATCH=0`、`STATE_NOT_APPLIED=9`（6 条里 3 条 register 落到这桶）、`REGRESSION=15`、`FIXED_FRAME=13`，
`FV_CONSERVED=yes PATCHES=107`；可判性闸 `16 条判红 → 可落账 2 / 不作判据 14`。
**这一批落账后 `col:6` 与台账 0 处不同**（状态列不用再动），94 处补丁全是 `col:9` 的证据文本，已 apply。

## 42 台账引用的载体有三分之一不在版本控制里

顺手做的一次扫描（拿台账 9/11 两列里出现的路径去问 `git ls-files --error-unmatch`）：

- `素材/理想效果图/*.png`（理想图基线，8 行以上在引）——文件在盘上，但被 `.gitignore:68` 的 `*.png` 整类忽略。
  干净克隆里这些行只剩一句"理想图 = 某张不存在的图"。
- `tmp/tour-R2.mjs`（3 行 `MP-R2VIS-TMP-TOUR-R2-001/002/003` 的承载文件）——被 `.gitignore:111` 的 `tmp/` 忽略。
  这三行处置写的都是"**HEAD 已修**，待下轮真机帧复验"，而 HEAD 里根本没有这个文件：那句话当时是不可核的。
  真正的后继载体是**已跟踪**的 `scripts/qa/tour-r6.mjs`，三处修都在里面，逐条对过：
  `frameHash()` sha256→16 位（:378-380，在 `[R2-DEDUPE-BEGIN]` 块里）、
  `probeRoute()` 返回 `{top, depth, stack}` 而不再只给栈顶（:407-425）、
  权限抑制走 `wx.*` JS 桥那层的 `PERM_MOCKS`，且 `wx.onNeedPrivacyAuthorization` 故意不 mock（:313、:819）。
  ⇒ 结论不变（确实已修），但**证据载体从不可核的文件换成可核的文件**，这类"HEAD 已修"以后必须指向 tracked 路径。
- `MP-R2VIS-TMP-TOUR-R2-002` 还引了 `tmp/tour-R6.mjs` —— 这个路径**在盘上也不存在**（悬空引用）。
- `apps/client/src/components/chat/ChatInput.vue`、`.../discover/CheckinPopup.vue`、`config/emoji-map.ts`
  报"不在版本控制"是因为**已删除**（与 §29 的 ChatInput 裁决一致），不是载体丢失——
  扫描要把"删了"和"没入库"分开，否则会把正确的历史写成缺陷。

`MP-R2VIS-PAGES-LOGIN-INDEX-001`（P1，一直挂着"待人读帧"）改由源码级判点结案：
判点不是"整文件有 3 处 `var(--r-full)`"这种弱计数，而是逐选择器量
`.btn-primary` / `.btn-phone-quick` / `.btn-guest` 三条规则里各自的 `border-radius: var(--r-full)`，
再加一条 countEq=3 兜住漂移；`verify-source-shape.mjs` 现在 8 条判点全成立。
同族的 `-007` **没有**跟着结案：它的判据是"两键值分开命名 **并弱化兜底样式**"，
命名那半可证（`login.phoneQuickLogin` / `login.phoneLogin` 两键在 zh-CN:2189/2215、en-US:2131/2159 各自独立），
样式那半是视觉命题，帧里量不到 ⇒ 整条不闭环，仍挂 `待修复（P4 延后）`。

## 43 第三档产物（showcase）跑通了：34 条 VIP 用例从"判红/跳过"变成一次成立测量

构建侧：`node apps/client/scripts/build-showcase-isolated.mjs` → `SHOWCASE_RESULT=PASS`，
产物自证 `MODE=mp-weixin-showcase VITE_API_MODE=real VITE_SHOWCASE_MODE=true`，
`sharedOutUntouched=yes`（mock 包指纹没动）。
产物里的 `config/feature-flags.js` 初值仍是 `membershipEnabled:!1` —— 这不是矛盾：
开关是**运行时**由 `main.ts` 在 mount 前调 `applyShowcaseMode()` 翻的，构建期写死的只有
`VITE_SHOWCASE_MODE` 这一个信号。

IDE 侧：那批 QA 脚本只会对着"已经在开发者工具里打开过的工程"发 `automation_evaluate`，
新目录必须先 `project_import`（返回 `alreadyImported:false` ⇒ 之前确实没入过库）+
`open_project_window`（`type:"newopen" winId:"s3"`）。开窗后第一次 `evaluate` 仍 `ok:false`
（窗口还在编译），等一下就通了 ⇒ 这一档的阻塞原因是"工程没导入 + 编译没完"，不是脚本坏了。

跑出来的数（`interact-showcase`，档位指纹 `real@ed1cd82c`，boot 身份
`logged-in userId=100158`——真实后端账号，不是 mock 的 `user-1001`）：

```
RUNNER_GROUP ×7：activities 8 / market-detail 15 / market-shop 20 / market-wallet 24 /
                  vip-index 34 / vip-promo-code 36 / vip-bills 41 条 executed，failed 全程 0
RUNNER_STATS identity=A executed=41 failed=0 skipped=37(交互动词=11 requiresReal=26) 出帧=41 通道异常=0
RUNNER_EVIDENCE_HOLE 0 ｜ 新档产物在盘，mock 未被覆盖
```

作废账：`supersede-mock-guest-rows.mjs` 加了 `--mode flag`，三条前提现场从源码核
（`membershipEnabled:false` 默认 / `showcase.ts` 置 true / `vip/index.vue` 守卫读它）
＋"旧行确实落回 `pages/profile/index`"，并且**只作废弹回的那些行**
（同一 manifest 里另外 44 行不是档位问题——本来就是 EXECUTED，或欠的是交互动词/requiresReal）：
`SUPERSEDE_SCOPE 旧行=34（FAILED 17 + SKIPPED 17）→ 新件 EXECUTED 17 + SKIPPED 17，UNMATCHED 0`，
写进 `reports/audit/round-7/flag-band-supersede.json`。
⇒ 执行轮里"到不了的那一页"这一类，至此只剩交互腿与 requiresReal 两种named原因。

顺手修掉一个**假不可判**：可判性闸的 `isBareSelector` 把 `.chat-list.chat-list--empty`
这种合法的链式 class 当成散文挡掉（第二个 `.` 前没空格）。改判点后加了一条 11 case 自检
（`FRA_SELTEST 通过=11/11`，判错方向就直接 exit 2）——这类"只会少落账、不会让谁失败"的判点
最容易悄悄烂掉，所以必须带自检。本轮这一改没改变任何行的去留（那几条还有别的问题），
但挡掉了下一轮凭空多出来的 held。

## 44 交互刀真正欠的不是点击工具，是 534 条没写"点哪儿"的判据

给执行器补上 `--tap`（走 CLI 的 `automation_element_action`，`tour-cli-states.mjs:107` 已在用，
会真触发点击/输入）之后，跑 `PAGES-HOME-INDEX` 一片 27 行：

```
executed=19 failed=0 skipped=8(交互没点名=5、requiresReal=2、判据无可判物件=1) 真做过的交互=0 出帧=19
RUNNER_EVIDENCE_HOLE 0 ｜ RUNNER_BAND mock@f1c7b96b ｜ RUNNER_IDENTITIES A=27
```

**`真做过的交互=0` 是关键那一格**：这一页 5 条交互用例，`action` 里一个 `.class` 都没有 ⇒
点击没法归属到某个东西。于是做了普查（`scripts/qa/census-tap-targets.mjs` →
`tap-target-census.json/.md`，守恒 `204 + 534 = 738`）：

| | 数 |
|---|---|
| 判据台用例 | 1107 |
| `action` 含交互动词 | 738 |
| 其中点名了 `.class` | 204 |
| **没点名** | **534（分布在 57 个页，全部按路由找到了源码文件）** |

⇒ §38 挂着的"覆盖债"里交互那一半**不是工具欠的，是判据欠的**：
判据只写了"点击某处"这种人话，没写要点哪个物件。
这一条也纠正 objective 里的旧说法（原文写"37 条判据含糊"，交互判据的实测含糊量是 534 条）。
下一步只能是把 534 条按页收紧成"点名可交互元素"的判据，再做真点击；
直接跑 `--tap` 只会产出 534 行 `交互没点名` 的 SKIPPED——这张普查表就是为了不出现"看着像跑过了"。

顺带两个通道事实（写下来免得下次重新踩）：WS automator 会话一旦连上 9420，**CLI 的 `simulator_open_page` 就整批失败**
（`r-exec-ws.mjs --fidelity` 两次都卡在这，最后靠外层 timeout 才结束）——两条通道抢同一个模拟器；
已把该脚本的对照分支改成"开页重试两次 + 打印完直接 `process.exit`"，不再挂住设备。
所以混合传输的对照门槛（`FIDELITY=PASS` 才允许把 WS 当默认）目前**拿不到样本**，
`FIDELITY=TOO_FEW_SAMPLES … 别拿它当通过` 是对的判读，不是把失败说成跳过。

## 45 又有 4 条"待复验"是靠谓词结案的，另有 1 条我**拒绝**结案

`verify-source-shape.mjs` 加了两种判点能力后，判点总数 11→15：

- `files: [{file, checks}]`——一条判据横跨几个文件时逐文件核，任一不过整条不过
  （`MP-R6-F1-NEARBY-IP-CITY-001` 要的是"home 与 nearby 都标注 IP 推断城市 + 不写进 NEARBY_CITY"，
  只核 home 就给绿灯是错的）。实测：home:74-77 与 nearby:117-120 都有 `citySource === "ip"` +
  `locationPage.serverCityTag`，nearby:128 的 `if (!ipSourced)` 才写缓存 ⇒ 三处齐了才落这条绿。
- `fileExists`——图标这类"引用了但文件在不在"的判据本来就是存在性命题
  （`MP-R2VIS-CONFIG-IMAGES-001`：先核 `config/images.ts:581-583` 确实引用这三枚，再核
  `src/static/assets/icons/common/{paw,cat,planet}.svg` 在盘上且非 0 字节）。
- `MP-R2-PROFILE-035`（两处空 catch 改上报）与 `MP-R2-CIRCLES-INDEX-009`（删函数内重复 store 实例化）
  用 countEq 结案：前者要求 `source: "profile.fetchLikes"` 的 captureException **正好 2 处**、
  空 catch 0 处；后者要求 `const sessionStore = useSessionStore()` **正好 1 处**。
  这种"正好几次"的判点才有判别力——只写 present 的话，回退了也不会报警。

**拒绝结案的那条**：`MP-R2-PAGES-LOGIN-INDEX-016`（WCAG 2.5.3：`aria-label` 与可见文本不能取自不同键）。
台账给的行号（:733 / :736）在现在的源码里已经对不上，而 `:aria-label="t('login.phoneLogin')"`
在 :643、:665 仍然出现——要证伪它得逐对比较"这个按钮的 aria-label 键 vs 它的可见文本键"，
那是一个配对判点，不是单文件正则能诚实表达的。**没有现成谓词就不给绿**，它继续挂 `已修复待复验`。

落账后：源码级判点 15、`已修复待复验` 37→33、`待修复` 44；`verify-ledger reports/audit/round-6` PASS。

## 46 lane 交回来的"点名目标"有 11 条被我拒了——它们把交互动词改了

6 个 lane（village/index、login、register、village/post、village/publish、campus/post-topic）
按页补"点哪儿"。复核器 `merge-tapfix-lanes.mjs` 不接受 lane 自报数字，
逐条现场重算：selector 是否真的在它声称的那一行、整份文件是否含该类名、
条数是否等于普查该页的 missing（按普查这条硬线，不按 lane 自报的 planned）、id 是否真在待补清单里。
**再加一条语义守恒**（第一版漏了，是 village/publish 的 lane 自己申报才发现的）：

> lane 为了让执行器不去走 `input` 分支，把 6 条 case 的「输入 xxx」改写成「预置/敲 xxx」——
> 那等于把一条输入框判据换成了按钮判据；通过率上去了，但测的不是同一个东西。

于是判点规则升级成"动词必须逐字保留"（丢了什么 / 多了什么都要点名），重跑结果：
`TAPFIX_ACCEPTED=97 REJECTED=11`，11 条拒绝里
6 条是 publish 页自报的换动词、3 条是 register/village 页**没自报**被规则抓到的
（REG15/REG20 丢「输入」、REG25 凭空多「勾选」，VI26/VP09 反过来多「输入」）。
落盘只写采信的 97 条，manifest 各留 `.pre-tapfix.bak`。

**普查随之变化（这就是"收紧判据"的实际进度）**：
`action 点名 .class` 204 → **267**，缺口 534 → **471**（守恒 `267+471=738`）。
剩下 471 条要继续按页摊 lane，且 lane 必须保留动词——这条现在由复核器兜住，不靠我读 lane 的自述。

顺手补的两处执行器事实：目标优先取判据里的 `tapTarget` 字段
（裸类名 `.error-btn` / `.channel-feed` 没有 BEM 分隔符，`classesOf` 抠不出来，
只看 action 文本会把它们重新退回"没点名"）。

另外 3 条"待修复"经核实**处置要求的改法早就在源码里**，按判点结案（源码级判点 15→18）：
`MP-R2-PAGES-MESSAGES-INDEX-019`（CTA 已按 `v-if="act.targetUrl"` 条件渲染）、
`MP-R2-PAGES-NEARBY-INDEX-014`（`loadActivities` 非 force 分支已有 `if (activityStore.loading) return;`）、
`MP-R2-PAGES-HOME-INDEX-110`（`distanceLine` 已是 parts 数组 `join(" · ")`、模板只有一个 text）。
⇒ 台账的"待修复"里也藏着**修完没同步状态**的行，与"判据成立但未修"是相反方向的同一类账实不符。

### 46.1 更正 §44 的那个 534：口径本身有盲区

§44 写"534 条判据没点名可交互元素"，用的是执行器那条 **只认 BEM 分隔符** 的类名正则
（`x__y` / `x--y`）。普查沿用了它，于是 `.title-input`、`.error-btn`、`.channel-feed`
这类**裸类名目标被当成"没点名"**。把口径改成"任意 `.kebab-case` 选择器 或 判据带 `tapTarget` 字段"后重算：

| 口径 | 已点名 | 缺口 |
|---|---|---|
| 只认 BEM（§44 用的） | 204 | 534 |
| 认任意类名 + tapTarget（现在的普查） | **457** | **281** |

反推本轮开工前的真实缺口：`457 − 140(本次 lane 落盘) = 317` ⇒ 开工前是 **421**，不是 534；
补完 140 条后是 **281**。守恒仍是 `457 + 281 = 738`。
⇒ 数字缩水不影响"交互刀被判据卡住"这个结论（421 条仍是真缺口），
但**报出去的数字必须是可复核口径下的**：这条与 §33"探针没回答不能读成 0"是同一类错——
度量工具的正则盲区会直接变成结论里的量级。

## 48 交互刀第一次真跑起来：一个页里只做成 1 次点击，原因是分支顺序而不是判据

`--tap` 在 mock 档跑 `SUBPACKAGES-VILLAGE-VILLAGE-INDEX`（该页刚落盘 22 条点名目标）：

```
executed=11 failed=0 skipped=24(requiresReal=18、交互动词没目标=3、交互没点名=1、判据无可判物件=2)
真做过的交互=1 出帧=11 RUNNER_EVIDENCE_HOLE 0
```

**`真做过的交互=1` 不是判据没修好，是我自己的分支顺序**：执行器里
`requiresReal ⇒ SKIPPED` 的判定排在交互腿前面，所以 42 条里那 18 条真实模式用例
**还没走到点击就被记成跳过**；剩下能点的也只有 1 条真正落了下发。
⇒ 补 `--real`（并在真实档产物上跑）才是这一页的正解，已按同参数在
`mp-weixin-real` 上重跑（`interact-real-taps`），两边的行数与状态各自守恒。
教训：判"某条腿做不动"之前要先看是被哪一道门挡的——门在前、能力在后时，
计数会把"没测"写成"测不了"。









## 49 交互判据点名波：281 条缺口摊成 12 个批次，199 条补成真目标、82 条记成有名字的欠项

§46.1 更正后的真实缺口是 281 条（不是 534）。这一轮把它一次摊完，载体是四个新脚本：

| 脚本 | 职责 |
|---|---|
| `emit-tapfix-briefs.mjs` | 按页装箱成 12 份简报（每份自带 schema + 硬规则 + 该写哪个文件），**批次守恒先自检**：摊出去 281 与普查 281 不等就直接 FAIL |
| `merge-tapfix-lanes.mjs` | 独立复核 + 落盘（逐行重读源码验 selector、动词守恒、条数守恒） |
| `repair-tapfix-truncation.mjs` | 把"照截断简报改写"的条目以判据台现文为底重建成文，并出**逐 id 覆盖守恒** |
| `emit-tapfix-register.mjs` | 把 lane 判"点不了"的条目汇成欠项台账，按**欠哪条载具**分组 |

12 个并发 lane 交回 54 份 lane 文件。合并器第一遍：`TAPFIX_ACCEPTED=183 REJECTED=22`，
其中 16 条是我自己造成的——普查把 `action` 截到 160 字再写进简报，lane 照着截断文改写，
落盘就会把长判据的尾巴静默删掉。三个 lane 自己发现了并报警（§49.1），但**报警不该靠 lane 自觉**，
所以合并器加了机械门禁：`newAction` 必须还装得下判据台现文（字符多重集比对，丢 >3 字即拒），
另加 `opsCase()` 校验 id 真的在目标 ops 文件里。修复后 `ACCEPTED=199 REJECTED=0`，
落盘 199 条 action + `tapTarget` + `tapTargetEvidence`，涉及 24 个 ops 文件，
备份自动续号（`.pre-tapfix.2.bak`）以保住上一波的改动前状态。

**普查重算（这就是"收紧判据"的可复核进度）**：
`含交互动词 738 = 已点名 656 + 没点名 82`（守恒 yes），
分支归因 `只在 action 文本=341 / 只在 tapTarget 字段=5 / 两处都有=310`。
那 5 条暴露了普查自己的第二个盲区：判定"点名"的正则要求类名里必须有 `-`，
于是 `.chip`/`.field` 这种**已由合并器逐行核过源码**的单段类名仍被算成没点名。
已改成"带点的类名片段即可，或 `tapTarget` 字段非空即可"。
> 同一类错误在 §46.1 已经记过一次（度量工具的正则盲区会直接变成结论里的量级）。两条都不许再犯第三次。

**82 条欠项只欠三样东西**（`reports/audit/round-7/tapfix-unverifiable.md`）：
连续手势 55 条（swipe/drag/longpress/scroll，CLI 桥只有 tap/input ⇒ 归 ① 的 WS 通道）、
断言对象是文案/数值而非可点物件 22 条、需要特定夹具或账号状态 5 条。
守恒打印 `199 + 82 = 281 yes`、`同一条既补又欠=0`、`无人认领=0`。

### 49.1 lane 的自述里有一条推翻了我对执行器的假设

三个 lane 同时报"简报的 oldAction 被截断"，还有一个报 **`tapChannel=input` 是普查把
「粘贴到输入框回读」误判成输入腿**，并且警告：`.code-input` 这种**类名里带 input 的点击目标**
会被执行器翻成输入腿。我一开始以为这是 lane 在给自己找台阶，去读 `r-exec-cli.mjs:325` 才发现
判据是 `/输入|input|填写/.test(action)` —— 判据现在会把选择器写进 action 文本，
所以那个 `input` 分支是我自己引入的**回归**。改成只按动词判（`/输入|填写|粘贴/`）。
教训：lane 报错时先分清"它在狡辩"和"它撞到了我的工具"，判据台现文是唯一能分辨两者的东西。

## 50 真实档第一轮 33 条 EXECUTED 全部作废：不是产品判红，是整页锁屏挡着，探针量的是锁屏

`--tap --real` 在 `mp-weixin-real`（identity=A，userId=100158）跑完 village/index 42 条：
`executed=33 failed=0 skipped=9 真做过的交互=0`。两件事同时不对劲，我按顺序查：

1. **`真做过的交互=0` 不是通道坏了。** 直接打 `automation_element_action`：
   `.channel-tab`/`.post-card`/`scroll-view` 答 `no such element`，而 **`.village-page` 和 `view` 答得出文本**
   ⇒ 桥、页、选择器引擎全都是好的。答案在返回的那段文本里：
   「完善资料，解锁完整交友功能 … 当前完善度 30% … 立即完善 / 先逛逛公开内容」。
   真实账号被 `LockScreen.vue`（7 个页共用：login/profile/chat-session/official-chat/likes-visitors/
   heart-signals/village-index）整页盖住，`isUnlocked = sessionStore.isProfileComplete`
   （`session.ts:403` 只看后端 `profileCompleted`）。showcase 档只旁路 `usePageAccess` 的路由守卫，
   **不管页面内部的 LockScreen**，所以换档也躲不开。
2. **于是那 33 条 EXECUTED 是"在锁屏帧上量的 absent"** —— 与 §33、
   [[feedback-absence-is-not-evidence-in-built-output]] 同一类，但这次是整批：
   帧是真的，帧里的页不是被测的页。

补的正对照（`r-exec-cli.mjs`）：每开一页先探 `.lock-screen`，present 时
- 判据点名的**不是**锁屏自己的物件（`__lock` / `.lock-screen`）⇒ 记 `SKIPPED`，
  原因写明"是门槛挡的，不是产品未做"，并点名欠的载具（过完善度门槛的账号夹具 / `--allow-gate`）；
- 锁屏自身的判点照判（那才是这一档能问出来的东西）；
- 无论判不判，`observed` 末尾一律带上 `锁屏=在（present(N)）`，并打 `RUNNER_GATE` 行——
  状态必须留在行里，否则下一道程序又会把它读成普通 absent。
取景侧同一个规矩做成两份：`shoot-frameplan` 出帧时量 `lockAtFrame/lockHit`，
`verdict-from-frames` 新增 `LOCK_SCREEN_BLOCKED` 桶（既不判红也不判绿）。

顺带修掉两处执行器时序缺陷：
- **`requiresReal ⇒ SKIPPED` 的分支排在交互腿之后，但交互已经真做过了** ⇒ 加了 `bandSkip()`，
  要被档位跳过的行连点击都不该发生（点了再跳过会把同页后面几百条共用的状态改掉）；
- **交互腿做完仍然掉进 `else if (TAP_RE)` 被记成"本切片只跑 observe-only"**（实测 5 条被这样误记），
  改成 `tapped` 标志分流；`tapped` 一开始用 `var` 声明，会让一条点着过就把后面所有条都标成已交互，
  已改成每条各自 `let` 复位。下发全部失败的行改记 `交互下发失败`，不许顺着往下记 EXECUTED。
- `RUNNER_SCOPE` 现在能区分 `tap+real / tap / observe-only`，不再把跑过的交互轮说成没跑。

**留下的欠项（要用户裁定，不自作）**：真实档要量到"过锁屏之后"的页面内容，只有三条路——
(a) 把 A 账号资料补到 `profileCompleted=true`（写共享 8080 的开发库，会同时改变其他页的行为）；
(b) 新种一个资料完整的测试账号；
(c) 承认这 7 个页在真实档只欠"锁屏自身的判点"，页面内容留在 mock 档测。
本轮先按 (c) 记账，(a)/(b) 等裁定。

## 51 修复波（6 个 lane、11 条待修复）：7 条里 5 条的处置早就在码上，台账一直挂着红

按文件分 lane（每 lane 一份互不重叠的文件清单，越界就上报不改）。12 个 lane 的结果：

| 台账行 | 真相 | 本轮做了什么 |
|---|---|---|
| LOCATION-001 (P1) | 处置三处写法 + ip 标注早已在工作树 | 补一处**同源残留**：`pickFromMap` 沿用上一次 locate 的 `cityFromIp/cityDistant`，把新选地址标成「服务器所在城市」或吞成「地址解析不可用」；+3 例单测（去掉复位即红） |
| CHAT-SESSION-001 / 004 | 修在 `f9a60925` 就进了 HEAD，台账仍记待修复 | 只补机器判点 + 单测（行序 `[timebar,message,timebar,message]`、骨架/`@error` 文案态） |
| CIRCLES-INDEX-001 / POSTTOPIC-011 | 令牌写法早已在码且在产物 | **零改动**；lane 还查出一个会误伤的名字：`--c-overlay-bg-pure` 与要禁的 `--c-overlay-bg` 是子串关系 |
| LOGIN-007 | 命名半段既往已落，样式半段没落 | 补降级样式（`.login-phone-entry`：`--btn-height-sm` + 1rpx 细边 + 透明底），主按钮仍走 `.btn-phone-quick` |
| MATCHING-001 | 半段没落 | 跳过钮底色→`var(--c-bg-container)`、文字→`var(--c-text-brand)`；`__skip` 规则里不再留裸 `rgba(54,…` |
| HOME-111 | 没落 | 两卡各补 `v-else-if="items.length === 0"` 空态块，文案复用既有串、不新增 i18n 键 |
| PUBLISH-005 | 大部分已由上一波 hover-class 落盘 | 补 `publish-header__close/__submit` 两个漏网 `@tap` view；并确认全文件 `<text … hover-class=` 计数为 0 |
| MESSAGES-020 | **toast 早就在**（`91e56562`，产物 `d99f3a1f` 的祖先），台账记「无任何 toast」是误测 | 零改动，按裁决 (a) 记账 |

⇒ 台账的 `待修复` 里，**这一批 11 条有 5 条是"修完没同步状态"**。它与 §47 那 3 条同属一类：
账实不符有两个方向，把已修的说成没修，和把没修的说成修好，一样会让下一轮拿错的账去做决策。
结案载体是 `verify-source-shape.mjs` 的谓词（18 → **25** 条判点，全部成立），
状态与证据各写一格：证据格保留旧取证文字（NOT_SHOOTABLE / 状态未施加 / 判点 0 条），
只把"静态这一半结案"补进去 —— 覆盖证据格等于销毁欠项，这是禁止的。

台账门禁按对的口径复跑：`node scripts/qa/verify-ledger.mjs reports/audit/round-6`
⇒ `DATA_ROWS=229 OFF_SCHEMA_ROWS=0 ROTATED_ROWS=0 STATUS_VOCAB_BAD=0 LEDGER_RESULT=PASS`。
不带参数跑会落在 round-2 那份旧矩阵，打出 `DATA_ROWS=0 + LEDGER_SHAPE_VACUOUS=1` 的 **FAIL**——
那是"一条都没查"的空转判据，不能当合规（脚本自己的注释里就写着这条，我这次又踩了一遍）。

## 52 判点载体自己的缺陷：剥注释把 17KB 模板删掉了，14 个 hover-class 变 0

写 PUBLISH-005 的判点时它死活不过，而源码里明写着那三个属性。查下来是 `verify-source-shape.mjs`
的 `stripComments()` 自己有问题：它先无脑删「块注释」，于是**字符串字面量里的 `/*` 被当成注释开头**。
`publish.vue` 里有一条误判防护清单 `["/*、http://usr/", …]`，从那个位置一路吞到 17KB 之外的第一个收尾组合，
整段模板被"剥"没了 —— `hover-class="press-feedback--active"` 出现次数 14 → 0。

这不是"某条判点写错了"，是**判点载体不可信**：
- 指向模板的 `present` 判点会假失败（本轮就是这样差点把一条已修的行留在红里）；
- 更危险的是反向：想证明"某写法已消失"的 `absent` 判点会**假通过**——代码被解析器删了，不是被修没了。

改法：字符串与注释放进同一个 alternation 单遍扫描，谁先出现取谁（字符串内容原样保留）。
修后 `SRC_SHAPE total=25 成立=25 补丁=50（守恒：yes）`。
**并核对过载体变更没有把绿改没**：改动前 24/25、改动后 25/25，
没有一条原本成立的判点因解析变严而失败，也没有一条是靠解析器吞掉代码才成立的。

同一类事已经第三次了：度量工具自身的缺陷会直接变成结论里的数字（§46.1 的正则盲区、
§50 的"锁屏帧量出来的 absent"、这次是"解析器删掉的代码"）。
凡判点不过，先问"载体问对了吗"，再问"东西没做吗"。

## 53 第二波修复（8 lane / 19 行）：真正需要改码的只有 6 行，其余 13 行的处置早已在 HEAD

台账上写着「待修复」而码里早就改完的行，这一波又翻出一批：

| 类别 | 行数 | 明细 |
|---|---|---|
| 本轮真改了码 | 6 | PROFILE-024（两档安全区）、REGISTER-013（14 处裸中文→t()，13 个 zh/en 配对键）、CAMPUSINDEX-010（store 拆 certificationError + 重试条）、VILLAGE-INDEX-012（话题失败错误条 + 活动空态）、DETAIL-002（两图 50/50）、POSTTOPIC-013（提交中文案切 common.submitting） |
| 处置早在 HEAD/工作树 | 9 | HOME-004、REGISTER-011、REGISTER-012、CHAT-007、CHAT-A02、VILLAGE-INDEX-001、POST-013、PUB-114、PUBLISH-004 |
| 判据前提被推翻 | 1 | OTHER-001：见 §53.1 |
| 半段结案半段留欠 | 2 | MESSAGES-020（toast 半段已在码，后端同步仍欠）、PROFILE-024（静态半段结案，观感欠一帧） |

判点从 28 条扩到 **44 条**（`SRC_SHAPE total=44 成立=44 不成立=0 补丁=88 守恒 yes`），
台账 `待修复` 从 34 行降到 **17 行**，且 `verify-ledger.mjs reports/audit/round-6` 仍
`DATA_ROWS=229 OFF_SCHEMA_ROWS=0 ROTATED_ROWS=0 STATUS_VOCAB_BAD=0 → PASS`。
剩下的 17 行里 12 行人判（欠帧）、2 行 needs_backend、3 行是裁决/前提/口径问题——没有一行是"判据成立但没人动过"。

### 53.1 有一条判据的前提是错的，不能拿已符合的那半段冒充整条结案

OTHER-001 要求他人页 meta「与我的页 MyHeader 的 metaLine 共用同一 formatter」。
实读：`PublicIdentity.vue:26-28` 已经是 age · school · city（解析位序不动、只改 push 序，处置自撤的
「对调解构」那句确实会做出反的），但 `MyHeader.vue:22-27` 是把 `basic.location` 原样塞进去，
而 `api/profile.ts:21` 实证后端串本体就是「城市 · 学校」⇒ **我的页实际渲染 age · city · school**。
两页顺序相反，"共用 formatter"这条前提不成立（`src/utils` 18 个文件里也没有任何 profile-meta formatter）。

所以这行不结案，状态写成「待修复（前提核实…）」并把真缺陷重述为
**「两页 meta 顺序不一致」**——该改的是判据，不是拿半段绿灯把整行划掉。
另记：两页 meta 目前 0 条测试覆盖。

### 53.2 两处「原判词措辞不对」，删除理由记错比不删更危险

* CHAT-A02 原判「不可达的死分支」：绑定其实**可达**（`keyboardHeight` 在 :1392 会被赋值），
  它真正的问题是样式与基线 `.wechat-input-bar`(:2866) 的 padding 计算值**完全等价、零视觉差**。
  删是对的，但理由要改成「等价冗余」。
* PUBLISH-004 的处置原文举例 `16rpx→--r-lg`，实测 `--r-lg=20rpx≠16` ⇒ 16rpx 与 6rpx 两处**不换**
  （"不等值即不替换"由 `absent --card-radius` + `countEq var(--r-xl,24rpx)=2` 钉死）。
  顺手翻出 :1110 `.publish-sheet__input = var(--r-lg, 16rpx)` 是早于基线的非等值写法（渲染 20、兜底谎称 16），
  另立裁决，不混进本行。

### 53.3 新危害：真档构建会把 en-US.ts 临时换成空壳，判点在这 106 秒里会造出假红

注册 lane 报告 `scripts/strip-mock-for-mp.mjs` 在 19:14:13Z→19:15:59Z 把 `en-US.ts` 换成
`export default {}`；我随后跑判点时恰好撞上这个窗口，两条 locale 判点报
「写法查不到」的假红（`You can't register until you're 18` / `Visible to circle members` 都在盘上）。
已给 `verify-source-shape.mjs` 加载体完整性护栏：两份 locale 任一 < 20KB 就直接
`SRC_SHAPE_RESULT=FAIL reason=承载文件疑似被构建脚本临时改写` 退出，不在 flux 上出判决。
这与 §50 的"锁屏帧读成 absent"是同一类错误：**量到的是构建过程/页面状态，不是产品**。

### 53.4 lane 越界自首一次（记录，不回滚）

PROFILE-024 的清单只给了 `pages/profile/index.vue` 与 `NotLoggedProfile.vue`，
lane 实际还改了 `components/profile/mine/MyProfile.vue` 并在报告里主动申报。
该文件正是台账点名的「本人态」承载，不回滚；但把这条记成"清单写窄了"的样本：
下一波 lane 的文件清单应当从判据的承载列直接生成，而不是我从标题猜。
它另报了一处未证：本人态 padding 落在 ProfileShell 内、页尾还有 `.safe-bottom`，
296rpx 是否真盖到页尾没有帧证 ⇒ 该行状态里明确只结静态半段。

## 54 长跑载具补齐：协同停止位在 r-exec-cli 上生效，判据台双对照重跑中

`EXEC_STOP_FLAG` 之前只有 r-exec.cjs 认；本轮给 r-exec-cli 补上后实测
`EXEC_STOPPED=clean flag=… 已跑组=4`，172 行按组落盘、无一行丢失（在锁屏发现之后停是刻意的：
继续跑下去只会把更多行量在错误的载体上）。全量交互轮已在**新产物**（含两波修复的 mock/real，
构建 exit=0、单测 114 文件全绿）上重启到 `reports/audit/round-7/exec-tap-final/`；
判据台按 `--a 094f7239 --b 874ff52f` 双对照重跑（口径纪律照旧：两个桶都给，差异逐条点名，
不许把不利口径扔掉）。

## 55 判据台按新判据 + 新产物重跑（双对照），并修掉判点自己的三个假红

产物重建（含两波修复的 mock/real 都 exit=0、单测 114 文件全绿）之后，
判据台以 `--a 094f7239 --b 874ff52f` 重跑，116 项逐条比桶位，两遍都 `CONSERVED=yes`：

| 桶 | a=094f7239（本轮开跑） | b=874ff52f（上一轮收口） |
|---|---|---|
| ARTIFACT_VERIFIED | **28** | **35** |
| NEEDS_UI_FRAME | 74 | 72 |
| UNDECIDABLE | 14 | 9 |
| NOT_IN_EITHER | **0**（本轮开工前 1） | **0** |
| SOURCE_ONLY | **0**（先前 1） | 0 |

与本轮开工前那次同口径记录（notes §34 前后：a 口径 AV=22 / NUIF=82 / NIE=1 / UNDECIDABLE=10）比：
**AV +6、NEEDS_UI_FRAME −8、NOT_IN_EITHER 归零**。涨的那些全部能指到具体载体改动：
199 条判据点名后探针有了可查对象、hex 归一（+1）、局部成员访问改名护栏（−1 SOURCE_ONLY）、
参照页令牌作废（campus 那条从 NOT_IN_EITHER 变成 ARTIFACT_VERIFIED）。

**两口径不一致的 7 条逐条点名**（这是判据台现在的真实边界，不是噪声）：
`PAGES-DISCOVER-INDEX-014`、`PAGES-REGISTER-INDEX-010`、`CAMPUSPOST-011`、
`CIRCLES-CIRCLES-INDEX-004`、`POSTTOPIC-010`、`PAGES-PROFILE-INDEX-002`、`PROFILE-EXTRA-PROFILE-OTHER-003`
——其中 **5 条是 a=UNDECIDABLE / b=ARTIFACT_VERIFIED**，即"看着像判据含糊、实则对照组选错"：
它们的修法提交晚于 094f7239，在 a 口径下"判点在修复前 HEAD 里就已存在"这一条永远不成立。
口径纪律照旧执行：`DUAL_ONLY_A_AV=0`（换口径反而掉绿的条数）与 `DUAL_ONLY_B_AV=7` 一起报，
只报涨的那半边是不允许的。

### 55.1 三个假红都是判点载体自己的错，不是产品的

1. **hex 缩写**：源码 `color: #555555` 编译成 `color:#555`，六位 token 在产物里永远查不到。
   已在 `squash()` 里对两侧同时归一，并加自检断言
   （六位↔三位必须互认、八位带 alpha 不许误折、rgba 空白归一）——
   第一版我把反向引用写错（`([0-9a-f])([0-9a-f])([0-9a-f])\3`），
   **是这条自检当场把我拦下来的**（`PROBE_SELFCHECK_RESULT=FAIL 六位/三位 hex 归一失败`）。
2. **局部量的成员访问**：`iconSrc.plus` 被抽取器当 string-lit（因为台账用反引号包它），
   于是躲过"标识符会被改名"那条规则，产物查不到就记成 SOURCE_ONLY=「源码改了、产物没有」。
   实测产物里连 `iconSrc` 这个头名都不存在。改法：头名在该项源码文件里是
   `const/let/var` 声明的局部量 ⇒ 按可改名处理，落 **UNDECIDABLE** 而不是 SOURCE_ONLY。
   这不是把红洗成绿——两者都不是已验，区别只在于不许把载体的无能为力写成关于产品的判断。
3. **参照物被抽成本页必需判点**：三条 `NOT_IN_EITHER` 里有两条是"参考 hub.vue 的 certLoadFailed 形态"
   "参考 village/index.vue 的 `.village-page` 定高链"被当成本页必须出现/消失的 token；
   另一条更隐蔽——**是我自己刚写进证据格的 `单色绿走 color: var(--c-brand-500)`**
   被删除型判据抽成"这串必须消失"的探针，于是产物里当然还在 ⇒ 假红。
   前两条按既有 ⟨作废⟩ 机制标注，第三条改成不会被解析成 css-decl 的写法。
   修完 `NOT_IN_EITHER=0`，那一条改落 NEEDS_UI_FRAME（诚实：静态问不出来，欠一帧）。

`normalize-bracket-spans` 复核：`spans=53 pairs 53/53 with-delimiter=0 residual=0`；
`verify-ledger.mjs reports/audit/round-6` 仍 `DATA_ROWS=229 … STATUS_VOCAB_BAD=0 → PASS`；
源码级判点 `44/44 成立`。

## 56 ③④ 收口：G8 十环重跑 10/10，GATES.json 载体由代码重生成，RING6 翻出一条新的后端读侧缺口

`node scripts/qa/write-gates-json.mjs --write` 的输出（不是手改，是当场把前置件跑一遍再落盘）：

```
GATESJSON precondition=PASS G7=PASS G8=PASS(10/10) G9=PASS(455/455) overall=PASS
GATESJSON newDbKeys={"posts":276,"comments":1244,"campus_topics":305,"campus_replies":37} missing-keys=0
GATESJSON_RESULT=OK written=reports/audit/real-e2e/GATES.json gitSha=e4495d67
```

G8 逐环（`reports/audit/round-7/g8-rerun.log`）：RING1 身份 / RING2 写库 id=275 / RING3 后台按 id 读到 /
RING4 审核驱动可见性（以 total 增量为准，且实测确认「默认 pending」——我一度因 javadoc 写「默认 approved」
而怀疑这条判据，**注释与实现不一致的是注释**）/ RING5 同 Idempotency-Key 重放 409 且不新增行 /
RING6 计数对账 / RING7 校园话题写侧收 images+isAnonymous / **RING8 data.id=304**（#27 那次接生的实测证）/
RING9 读回 images 与匿名遮蔽 / RING10 匿名回复透传。⇒ `G8_RINGS_OK=10/10`。

**留下的真实数据（按既定决定不删，逐条点名）**：posts.id=275/276、comments.id=1243/1244、
campus_topics.id=304/305、campus_replies.id=36/37（两轮各一份：我手跑一遍 + 载体生成器又跑一遍）。
要清的话走 `inventory-g8-test-data.mjs --emit-sql`，它只按显式主键生成且默认 ROLLBACK。

RING6 翻出的不是数值不一致，而是**后台读侧视图根本没有计数字段**：
`GET admin/village-posts` 的字段集里没有 commentCount/likeCount，而客户端同一帖子读到 comment=1 like=1。
"看不见"不能写成"不一致"（本轮已在锁屏帧上犯过一次同类错），所以按新缺陷立案：
`MP-R7-G8-RING6-ADMIN-COUNT-FIELDS-001`（P3，needs_backend，两案择一），
台账复跑 `DATA_ROWS=230 … STATUS_VOCAB_BAD=0 → LEDGER_RESULT=PASS`。

### 56.1 我自己在这一步里错了两次，都记下来

1. 我先断定"终报引用的 `write-gates-json.mjs` 不存在"——因为我只在 `scripts/` 根目录 grep，
   它在 `scripts/qa/`。**"报告引用了不存在的脚本"这个结论是我搜错了目录**，不是报告的错。
   同一条 grep 还让我一度以为 GATES.json 该在 `dist/build/mp-weixin-real/` 下——
   它真正的载体位置是 `reports/audit/real-e2e/GATES.json`。
2. 第三次在同一天里把 ASCII 双引号写进 JS 字符串（`不是"前后端数值不一致"`），
   `node --check` 当场拒绝。这条规则我给自己记过（中文行文里的引号一律用「」），
   仍然连犯三次 ⇒ 以后凡是我用脚本生成台账/判点文本，**先 `node --check` 再谈别的**。

## 57 ⑤ 仍在跑的部分（写到这里时的时间戳）

全量交互+观察轮在新产物（含两波修复）上重跑到 `reports/audit/round-7/exec-tap-final/`，
带 `EXEC_STOP_FLAG` 可停在组边界；写这行时已完成 4 个页组。
它跑完之前我不会声称"1107 例执行轮已复跑"——那是这条记录现在唯一的用处：
让下一句绿话有对照可查。

## 58 我自己把一批测量搞坏了：两个驱动同时开页；补了租约并把事故写进自检

写 §56 那段 GATES 载体的时候，我同时挂着 `exec-tap-final` 交互轮。
`write-gates-json.mjs` 会真的跑 G7/G9（**会开页**），于是两条通道在同一个模拟器上互相换页。
症状不是崩溃，而是**静默的坏测量**：那 214 行里
`落点探针没给结果` 58 行、`交互腿下发全部失败` 28 行、`真做过的交互=0`。
如果不是我先加了"下发失败要带同帧探针读数"这条，我会把它读成"点不到的判据"，
而不是"页被人换了"。已按停止位收尾（`EXEC_STOPPED=clean 已跑组=6`，行不丢），
作废目录留着不删：`reports/audit/round-7/exec-tap-final/` 是"被污染的测量"的实物证据。

补的载具（`scripts/qa/ui-lease.mjs`）：
· 锁沿用既有约定 `tmp/qa/locks/*.lock` + `status/owner/pid/leaseUntil/lastHeartbeat`；
· **只读别人的锁**，绝不改写或删除非本人属主的锁（9420 那把上一轮墓碑里写着"不得动"，就不动）；
· 只要有活租约就拒绝启动：租期没到算占用；租期过了但 pid 还活着也算（只是忘了续租）；
  `status=released` 的历史墓碑不算，否则锁目录会越用越满；
· 已接进三个 UI 驱动：`r-exec-cli`（每组续租一次）、`shoot-frameplan`、`write-gates-json`；
· 自检 `test-ui-lease.mjs` 9 条断言全在临时目录里跑，一次都不碰真实锁目录。

现场验过（不是只跑单测）：交互轮持锁后，第二条驱动启动即被拒——
`RUNNER_RESULT=FAIL reason=模拟器已被占用（r7-cli-exec-round-7-tap2@pid24252 租期到 20:34:43Z）⇒ 一行都不跑`。
一个副作用值得记：聚合器一开始把我的自检判成 FAIL（`无自报断言计数（不可信）`），
因为它只认 `*_SUMMARY … fail=N` 这一种口径 —— **这个保守是对的**：
一条没人能核对计数的"PASS"跟没跑一样。已按口径补上 `LEASE_SUMMARY checks=9 fail=0`。

新一轮已在新产物 + 持锁状态下重启到 `exec-tap-final2/`。

## 59 真正的并发源找到了：我自己四个孤儿驱动，其中一个我"以为已经杀掉了"

排查"为什么 discover 整组 45 行什么都没量到"时按命令行枚举了 node 进程，发现**四个还在跑的驱动**：

| PID | 启动 | 命令行 |
|---|---|---|
| 27668 | 14:42:19 | `r-exec-ws.mjs --redo-holes` |
| 37480 | 15:15:02 | `r-exec-ws.mjs` |
| 22604 | 16:18:40 | `r-exec-ws.mjs --tap --redo-taps` |
| 42048 | 02:28:46（本地） | `r-exec-cli.mjs … --out interact-taps-mock-full --tap` |

三个 WS 驱动从下午起就一直挂着同一个模拟器会话（它们完成通知刚刚才到，状态=failed，因为我杀了它们——
也就是说这几小时里我一直以为"那一轮早就结束了"）。第四个是 19:56 我 `taskkill` 过的那个：
命令返回"无法终止…子进程仍在清理"，我随后用一份 `Format-Table` 预览（被 head 截断）**判定它已经死了**。
它没死，04:22 还在往 `interact-taps-mock-full/exec-results.json` 里写。
⇒ 这正是我自己记过的那条："管道后的状态是 tail 的"、"kill 前先核命令行"——
这次的反例是**kill 后也要按命令行确认消失，而不是看一份会被截断的进程列表**。

清干净之后同一件事就成立了（现场实验，非推断）：
```
probe .quick-card = "有人喜欢你22 人喜欢了你去看看"
TAP .quick-card 已下发
route before=pages/messages/index  after=pages/messages/index|subpackages/discover-extra/likes-visitors/index  changed=true
```
**交互刀是通的**。之前 `真做过的交互=0` 不是通道坏，也不是判据坏，是页被别的驱动换掉了。

### 59.1 需要一并撤回/降级的旧结论与受影响测量

1. **§（前文）1184 行"两条通道抢同一个模拟器 ⇒ WS 一连上 `simulator_open_page` 就整批失败"**：
   当时那三个 `r-exec-ws` 进程正活着，所以这个因果**未被证明**——观察到的只是"并发时开页失败"，
   而不是"WS 与 CLI 天生互斥"。已降级为待重测（方法：单 CLI 驱动持锁运行时，另开一次 WS 会话看 `open_page`
   是否仍可服务），在重测之前，不许再拿这条当"WS 通道不可用"的依据。
2. **受污染的产物目录（保留不删，标为不可引用）**：`interact-taps-mock-full/`（04:22 仍在写）、
   `exec-tap-final/`（58 行落点无答案）、`exec-tap-final2/`（整组空转）。
   新一轮 `exec-tap-final3/` 是**当前唯一驱动**下跑的（`RUNNER_LEASE=ACQUIRED`，进程数复查=1）。
3. 上一轮 WS 时代产出的 `interact/`、`interact-b/`、`interact-b2/` 里若有"absent/no such element"类判决，
   在引用前要先确认它不是产生于并发窗口——按本次经验，至少 14:42–20:22 这一整段都不可信。

## 60 帧债的真实形状：不是"没拍照"，而是取景载具与判据锚点的错配

`export-ui-frame-debts` 把 74 条 NEEDS_UI_FRAME 分类：`STATIC_SHOOTABLE=47 / NEEDS_STATE=11 /
NEEDS_INTERACTION=10 / NEEDS_RUNTIME=6`（恰好覆盖 74，守恒 OK）。
往下要生成"能拍的行"时踩到两件事：

1. `gen-states-from-debt` 要求每行同时有 tap 与 expect 两个 BEM 类名，结果
   `SHOOTABLE=0 / NEEDS_CRITERIA=42 / NO_ROUTE=32`，它自己给的结论是
   "一条都派生不出可执行取景行 ⇒ 欠帧全是判据没写够"。**对页级帧这是错的载具**——
   47 条 STATIC_SHOOTABLE 只需要打开那一页看，不需要先点一下。
2. 我差点把 `NO_ROUTE=32` 读成"32 条判据指向不存在的页面"。把桶里的条目逐条对产物
   `app.json` 的路由表核了一遍才发现：**这个桶根本没有 route 字段**，
   它带的是 `laneFile`，而且值常是组件或主题文件
   （`components/match/MatchInfo.vue`、`src/theme/design-variables.scss`、`components/home/CommunityFeed.vue`）。
   所以 NO_ROUTE 的真实含义是"这条判据锚在组件/样式文件上，工具拿不到页路由"，
   不是产品或判据失效。我原先那句"真不在路由表里的=32/32"也是同一个误读：
   表达式取了 `x.page||x.route||""`，空串永远匹配不上，于是**任何数都能"验证"成 32**。
   ⇒ 记一条通用规矩：拿字段名去核对之前，先看一条真实条目的键名，别用假想字段跑守恒。

正确的载具是页级补拍清单：`make-reshoot-plan --out reports/audit/round-7/reverify7 --identities A,guest`
⇒ `needFrames=51（待修复 18 + 已修复待复验 33）`、`pages=17 全在巡检全集内（不在=0）`、
`TSV 行=45`、守恒 `17+0=17 ✔`，另报 `BACKFILL_ROWS=11`（11 个产物内页面从未被任何巡检规划过）。
这份 TSV 已放进可提交的 reports 目录而不是 `.zcode/tmp`，交互型/状态型那 27 条仍按
"先补 selector"处理，不拿页级帧冒充它们的答案。

## 61 终报生成器也上了租约，并把这一轮的耗时用实测而不是感觉写下来

§58 那次自我破坏的根源是「一个会开页的工具在没人的时候被顺手跑了一下」。
`emit-round-report.mjs` 的实时分支正是这类工具里最危险的一个：`--check-only` 的 G7 会重建并打开页面，
G9 探针也会开页 —— 而在它被写出来的那一刻，`exec-tap-final3` 正在量同一台模拟器。
所以这一节只做一件事：把「跑终报」也变成必须排队。

改动（`scripts/qa/emit-round-report.mjs`）：

1. 实时门（G7/G8/G9/probe）跑之前先 `acquireUi`。拿不到租约 ⇒ **不跑**，并把
   `SKIP_LIVE` 打开、`LIVE_SKIP_WHY` 写成「UI 租约被占用（owner@pid …）」，
   由既有的失败分支把它记成一条 FAIL + 一个 OPEN 项 —— 报告不会因此变绿，只会缺一块并说明为什么缺。
2. 每件实时门跑之前 `renewUi` 一次：单件上限 600s、租期 1200s，不续会在长门中途被判失效。
3. 跑完立刻 `releaseUi`，并把释放结果原样打出来。
4. 新增 `--lease-probe-only`：**只看**目录里有没有活租约，不取锁、不写任何锁文件、不跑任何门。
   为什么必须有 —— 用一个会开页的分支去验证「它会不会避让」，本身就是 §58 的复制品；
   `--skip-live-gates` 也验不到这段代码，因为它在租约逻辑之前就把整块跳过了。

`ui-lease.mjs` 顺带修了一处会反噬的写法：它原先用 `import.meta.dirname` 推 REPO，
而该属性要 node ≥20.11；租约模块现在被终报生成器 import，一旦有人用 PATH 上的 v16 跑报告，
就会在 import 期抛 TypeError（一整份报告打不出来，原因却藏在另一个文件里）。
改成 `typeof import.meta.dirname === "string" ? … : dirname(fileURLToPath(import.meta.url))`。

验证（全部在租约被 `r7-cli-exec-round-7-tap3`（pid 41428）持有期间做的只读验证）：

- `node22 --check` 两个文件均 OK；
- `scripts/qa/test-ui-lease.mjs` ⇒ `LEASE_SUMMARY checks=9 fail=0` / `LEASE_TEST=PASS`（跑在临时目录，不碰真锁）；
- `--lease-probe-only` 对真实目录 ⇒ `LEASE_PROBE holders=1`、`holder wechat-automation-cli owner=r7-cli-exec-round-7-tap3 pid=41428`、
  `LEASE_PROBE_RESULT=BUSY ⇒ 实时门(G7/G8/G9/probe)会被跳过并记为缺证据`，退出码 0；
- `QA_LOCK_DIR` 指到空的 `.zcode/tmp/lease-empty` ⇒ `holders=0` / `LEASE_PROBE_RESULT=FREE`（免费分支也真跑到）；
- 探针跑完 `sha256sum tmp/qa/locks/*.lock` 前后逐字节相同 ⇒ `LOCKS_UNCHANGED=yes`，四把锁（含 9420 那把历史墓碑）无人被改写。

### 61.1 这一轮执行速度的实测数（不用感觉估）

`exec-tap-final3/run.log` 的组边界自带时间：
`discover/index 待跑=45 … 已跑=5.3min` ⇒ `home/index … 已跑=9.8min`，
即 93 行 / 9.8 min ≈ **9.5 行/分钟**（每行都出一帧：`出帧=68` 与 `executed=68` 相等，截图就是主要成本）。
按 1107 例推 **≈117 分钟**。这条推断的可证伪点是「下一组边界的时间戳」，跑完会回头核。

同时要写清一件容易被念成"完成"的事：这一跑的 `identities=["A"]` —— **只有登录身份**。
⑤ 要的是「62+ 页 × 双身份」，所以 A 跑完不等于执行轮跑完，游客刀（guest）仍欠一整遍；
我不会把 A 的通过率当成双身份结论写进终报。

清场：根目录有一个 0 字节、未跟踪的杂散文件 `cd`（本次会话期间 03:16 产生，是我打命令留下的），已删除。

## 62 把避让铺到所有会开页的工具，并且在铺的过程中被自检抓出一个真洞

§61 只护住了终报生成器。但本轮那起事故的肇事者并不是它，而是"某个会开页的工具没排队"。
所以这次把避让逻辑收成一个共用入口 `guardUiLease()`（`ui-lease.mjs`），并挂到剩下四个会开页的载具上：
`tour-cli-states`、`real-tour-cli`、`probe-guest-band`、`r-exec-ws`。
`r-exec-cli` / `shoot-frameplan` / `write-gates-json` 保持原样没动 —— 它们已各自实现了同一段，
而 `r-exec-cli` 此刻正在跑，改它等于在跑动的进程脚下换文件。

### 62.1 自检抓到的真洞：owner 同名就等于"这是我"

`acquireUi` 原来判断"这把活锁是不是我自己"用的是 **owner 字符串相等**：

```js
heldLeases({ excludeOwner: owner }).filter((h) => h.resource !== SELF_RESOURCE || h.owner !== owner)
```

而 owner 全是从 `LABEL` / `PAGE` / `--round` 这类入参派生的（`real-tour-round-6-real-tour`、
`probe-guest-band-pages/login/index`…）。两个进程用同一个 label 并发 ⇒ 两边都把对方的锁读成"我的" ⇒
**双双放行、同时独占一台模拟器** —— 租约在这条路径上形同不存在，而这正是它唯一要防的事。
改成只认 pid：`!(h.owner === owner && Number(h.pid) === process.pid)`。

发现方式不是读代码，是把 `guardUiLease` 放进子进程测：`test-ui-lease.mjs` 新增 a12 系列
（本进程先占住一个 owner 名，再让同名的孩子去取），旧实现在 a12b 会 ACQUIRED，现在 BUSY。

### 62.2 顺手修掉两条"看着像测了其实没测"的断言

- a8 原文 `r.released === false || r.released === true` —— **恒真**，等于没断言。换成两条真的：
  释放别人的锁必须被拒绝且文件原样（a8），释放自己的必须落到 `released` 墓碑（a8b）。
- a10 原先拿"a9 那个孩子留下的锁"当"崩掉的持有者"。但 `guardUiLease` 在正常退出时会自己 release，
  那份锁根本不是孤儿 —— 这条测的是空气。改成手工造孤儿（`status=LEASED` + pid 不存在 + 租期未过），
  现在它真的拦住后来者（a10）且不改写孤儿锁（a10b）。
- `LEASE_SUMMARY checks=9` 是写死的：加一条就报出一个不存在的总数。改成从 `t()` 里累加的 `ran` 派生。

`LEASE_TEST=PASS checks=19 fail=0`（全程临时目录 + 子进程，一次都没碰真实 `tmp/qa/locks/`）。
另外用 `probe-guest-band` 做过一次端到端验证：把真实目录的锁复制到 scratch 后用 `QA_LOCK_DIR` 指过去，
它在**开页之前**就打印 `GUEST_BAND_RESULT=FAIL reason=模拟器已被占用（r7-cli-exec-round-7-tap3@pid41428 …）` 并退出。

### 62.3 一条给后来者的读锁指南（免得把正常现象当事故）

`wechat-automation-cli.lock` 的 sha256 在跑轮期间**必然一直变**：持有者每完成一行就 `renewUi`，
`lastHeartbeat` / `leaseUntil` / `attempt` 都在往前走。判断"有没有被动过"要看的是
`owner` / `pid` 有没有换人，不是哈希有没有变。真正一格都不能动的是另外三把按端口命名的历史锁
（9420 是上一轮的墓碑）—— 这一轮它们前后逐字节相同。

### 62.4 §61 那个耗时预测正在被数据推翻，先记下来

§61 按"93 行 / 9.8 分钟"推 1107 例 ≈117 分钟，并写明可证伪点是"下一组边界的时间戳"。
实际到 `pages/messages/index` 组末是 **172 行 / 14.2 分钟**（≈12.1 行/分钟）⇒ 全量约 **91 分钟**。
差额来自开头两组吃掉了 boot + 登录页的固定成本。轮末会用真实总时长再核一次，
不在这里把 117 分钟说成"验证通过"。

## 63 无人看守的腿队列：`scripts/qa/run-ui-queue.mjs`

执行轮单程 ≈1.5 小时，A 身份跑完之后 guest 身份还得再跑一遍（⑤ 要"双身份"）。
守着它每几分钟手点一次，既烧轮次，也容易在某个疏忽里造成 §58 那起并发换页。
所以补一个只做三件事的排队器：**等 UI 空出来 → 按清单串行跑腿 → 每腿把退出码与自己的结论行落盘**。

三条设计上的克制：

1. 排队器**自己不取租约**。锁属于每一条腿（`r-exec-cli` 会自己 `RUNNER_LEASE=ACQUIRED`）；
   我提前占住，它就会撞在我这把同名锁上，看起来反倒像"避让失效"。
2. **一条腿失败就停**：后面的腿记 `NOT_RUN`，不继续。一条红腿后面接一串依赖它的腿，
   只会把红变成"看不见的红"。
3. 守恒 `QUEUE_TALLY OK+FAIL+NOT_RUN == 腿总数`，不等就 `QUEUE_RESULT=FAIL`（漏腿比慢腿危险）。

上线前用三条干跑验过（全部不碰模拟器）：
`T1` 真实锁目录 + 3 秒等待上限 ⇒ `WAIT_UI 占用中：r7-cli-exec-round-7-tap3@pid41428` ×3 然后超时判 FAIL；
`T2` 空锁目录 + 两条必赢腿 ⇒ `QUEUE_TALLY OK=2 sum=2/2 CONSERVED` / `QUEUE_RESULT=OK`；
`T3` 第一条腿故意 `exit 3` ⇒ `FAIL=1 NOT_RUN=1 sum=2/2 CONSERVED` / `QUEUE_RESULT=FAIL`。
（顺带修了干跑暴露的一处：Windows 的 `join()` 生反斜杠，`replace(REPO + "/")` 永不命中，
日志里会漏出绝对路径 —— 溯源里的路径必须能原样复现。）

实跑已挂在后台：`--out reports/audit/round-7/ui-queue`，腿清单 `scripts/qa/ui-queue.default.json`
= 一条 `exec-guest-tap`（`r-exec-cli.mjs --tap --identity guest --label round-7-guest1
--out reports/audit/round-7/exec-guest-tap`）。

## 64 ④ 四项待裁决：按盘上的东西核了一遍，并且把派生口径改对

派活让只读子代理去核（它没碰模拟器、没改文件）。它的四条结论我逐条回验过盘：

| 项 | 盘上事实 | 判定 |
|---|---|---|
| 登录页已登录落地页 | `apps/client/src/pages/login/index.vue:87-90` `isLoggedIn && !autoForwardedToMain ⇒ switchTab(/pages/discover/index)`；台账行 `MP-R6REAL-PAGES-LOGIN-INDEX-001` 状态=判据不成立（裁决 2026-09-26） | LANDED |
| ChatInput.vue 去留 | 文件在盘上 0 命中、`git cat-file -e HEAD:…ChatInput.vue` ⇒ 不存在；台账行 `MP-R2VIS-COMPONENTS-CHAT-CHATINPUT-A01` 状态=已修复待复验 | LANDED（但"不破版"的帧级复验仍欠，属 ① 的帧债） |
| GATES.json 过期载体 | `reports/audit/real-e2e/GATES.json` 顶层 `gitSha=e4495d67`＝当前 HEAD，`supersedes.gitSha=1a1df78b`，由 `scripts/qa/write-gates-json.mjs` 生成 | LANDED |
| 遗留测试数据处置 | `reports/audit/real-e2e/test-data-inventory.md:4` 口径=保留，配 `test-data-ledger.json` + `inventory-g8-test-data.mjs`，`test-data-cleanup.sql` 只 BEGIN/ROLLBACK | LANDED |

### 64.1 撤回一个我自己差点发出去的数："还有 8 条待裁决"

子代理先报"8 条仍在等人拍板"。我按**关键字**去数台账，得到的是 9 行——两个数都不对。
错因：`需人拍板 / 待裁决` 这些词大量出现在**处置列的历史叙述**里（"原判为待裁决，后已…"），
而那一行的状态列早就走完了。关键字命中不等于语义类别，这跟 §60 那次拿假想字段跑守恒是同一类错。

正确的派生口径是**只看状态列**（`split("|")` 后第 6 格）。按它重数，开放项是 **5 条**，不是 8/9：

- 状态本身就是 `未取证/需裁决` 的 2 条 —— 这两条我真的不能自裁：
  `MP-R2-CIRCLES-INDEX-005`（两条既有裁定正面冲突 + 滚动架构无静态帧维度）、
  `MP-R2-CIRCLES-INDEX-007`（理想图只有浅色态、暗值无图可依 ⇒ 没有可比对象，不是我不愿判）。
- 状态 `待修复`、决策留在处置列的 3 条 —— 可以按 ④ 同款"可辩护默认"自裁：
  `…CIRCLE-HOME-002`（写死的「【规约】…」是否入 i18n）、
  `…VILLAGE-POST-006`（两个发布入口的圈子候选行结构取哪一种）、
  `…CAMPUS-HUB-006`（校园域两级键命名空间要不要统一）。
- 其余 4 行（`CAMPUS-HUB-001`、`MP-R2-POST-015`、`VILLAGE-PUBLISH-004`、`VILLAGE-PUBLISH-A02`）
  状态列分别是已修复/保留-判据不成立，只是文本里留着旧词 ⇒ **不算开放项**。

### 64.2 一处文字与产物不一致（不改历史，只在此更正）

`round7-final-report.md:44` 写 GATES 载体绑 `1a1df78b`，`round7-NOTES.md:211`（§10）写 `1598715f`，
而盘上 `GATES.json` 顶层是 `e4495d67`、`1a1df78b` 退到了 `supersedes` 里。
两份文字都比盘上落后一次重写。§10 是当时的现场记录，不回改；以这条更正为准，
终报重生成时其数字直接从 `GATES.json` 取（生成器本来就只认具名文件）。

## 65 §64 里那三条"我可以自裁"的开放项：三条都落地了，其中一条写坏过一次文件

A 刀还在跑（同一台模拟器不能并发），所以这三条全部是不碰 UI 的源码工作。

### 65.1 `…CIRCLE-HOME-002`（写死的演示公告）

`circle-home.vue:115-119` 的 `pinnedNotice` 从字面量换成 `t("circle.home.pinnedNotice")`，
键与相邻的 `circle.home.pinnedBadge` 同层，中英文两份各 1 份。
**关键核对**：`useMock()` 那道门在本次改动**之前**就已经在码里（逐行读 `git diff` 的 `-` 侧确认），
所以"real 档不渲染演示公告"这条旧裁定（MP-R1-CIRCLEHOME-001）没有被顺带改掉——
这正是我敢自裁的前提；否则这就是改产品行为。
子代理还报了一个盘面比台账更事实的细节：字面量早已是「【圈规】」而不是台账证据里写的「【规约】」，
判点因此两种都查（`absent 【(圈规|规约)】`）。

### 65.2 `…VILLAGE-POST-006`（两个发布入口的结构二选一）

按**多数侧**收口：6 个候选行里 5 处已经是「名称段 + 描述段」两段式，
三段式带独立「已加入」pill 的写法全仓只有 1 处（旧 `publish.vue:931`）⇒ 改那一处，`post.vue` 本来就是胜出侧、未动。
同向的次级证据：pill 是 `role="button"` 行里的孤立 `<text>`，且它的 `#2FA366`/`#E8F6EE`/`6rpx` 都没有令牌对应。
只改一个文件这一点也写进台账，防止下一轮以为两页都被重写过。

### 65.3 `…CAMPUS-HUB-006`（命名空间）与那次自动回滚

选边同样是计数：校园域五页里四页走两级（48/34/21/20 = 123 处），只有一页 `hub.vue` 用顶层扁平
`campusHub`（23 处）⇒ 统一到 `campus.hub`。这是一次 25 键 × 2 语言包 + 23 处引用的结构迁移，
不能手改，写了 `.zcode/tmp/rename-campushub-ns.mjs`（默认干跑，断言全过才允许 `--apply`）。

过程中这个脚本暴露了三个我自己的错，前两个是干跑救的、第三个是真跑救的：

1. 第一版用宽松正则找目标 `campus` 块 ⇒ 命中的是**第 2226/2282 行那个一行式标签页对象**
   （`campus: { title, desc }`），不是校园域那个。干跑打印的子键是 `[title, desc]` 才露馅。
   修法是双条件：行首恰好两空格（顶层）+ 子键里必须有 `certification`，并且写盘阶段沿用干跑锁定的坐标，
   绝不在写盘时重新匹配一次。
2. 第一版删除范围从 `{` 起算 ⇒ `"campusHub": ` 这个半个成员被留下，写出来是 `"campusHub": ,`，
   直接把语言包写成语法错误。
3. 语法错误没让我发现，**是脚本自己的事务检查发现的**：写完之后它把
   `scripts/qa/verify-i18n-orphan.mjs` 当外置裁判跑一遍，非零就从 `.bak` 整体回滚三个文件。
   实测输出：`ROLLBACK=done` + `MIGRATE_RESULT=FAIL`。改完 1、2 之后再跑才是
   `MIGRATE_RESULT=OK … 门禁同轮回绿`。教训值得单独一条：
   **改机器可读的载体（语言包、JSON、DSL）时，计数守恒不足以证明没写坏，必须让真正解析它的裁判说了算。**

判点 #47 的判别力做过反对照：拿迁移前的 `zh-CN.ts.bak` 用同一条 present 正则去查 ⇒ `false`，
旧写法 `campusHub` 只在改前存在 ⇒ `true`。同批 `SRC_SHAPE total=47 成立=47 不成立=0 守恒 yes`，
`I18N_ZH_KEYS=4171＝I18N_EN_KEYS`、`ZH_ONLY=0`、`EN_ONLY=0`、`I18N_RESULT=PASS`。

### 65.4 台账与补拍清单同步后的守恒

三条都从 `待修复` 迁到 `已修复待复验`（判点成立、帧未复验），`verify-ledger` 仍
`DATA_ROWS=230 … PASS`。补拍清单重派生：
`needFrames=51（待修复 15 + 已修复待复验 36）`，总量不变、组成按计划位移 ——
这三行本来就在"欠帧"集合里，改状态不该改变总数，改了才说明派生有别的洞。

### 65.5 两条留给下一手的诚实记录

- 迁移搬过去 25 个键里有一批零引用键（它们早就计入孤儿数 1257 那个棘轮里）。删它们会让棘轮**下降**，
  那是下一次收口的活；本轮不混做。派生名单不能靠裸键名 grep——`statusVerified` 这类名字在别的
  命名空间有同名引用，我这次就差点把"有同名"读成"有人在用"。
- `.zcode/tmp` 之外新留下的三个 `.bak`（zh-CN / en-US / hub.vue）是这次迁移的现场备份，
  属于**不该提交**的文件；提交清单里要显式排除。

## 66 A 刀那 26 条 FAILED：载体早就自己说了"落在别的页"，缺的是身份前置

到 `pages/messages/index` 组末，A 刀累计 `failed=26`，且这 26 条**全部**是 `pages/login/index`。
把行原文调出来看（`exec-results.json` 的快照副本，取文件前先看 mtime=78s，不解析正在写的文件）：

```
id=LG01  identity=A  band=mock@f1c7b96b
title = Idle：清登录态冷启动落登录页，协议默认「未勾选」（证伪 R1 旧预期「默认已勾选」）
observed = top=pages/discover/index ≠ pages/login/index | dom: .login-page__brand:absent …
failureReason = 落在别的页（页内守卫或路由重定向），须人判
```

判词：**档位错配，不是产品缺陷**。这些用例的前提就是"清掉登录态"，而它们跑在已登录身份 A 上；
④ 已经裁过"已登录访问登录页 ⇒ `switchTab(/pages/discover/index)`"，所以它们**必然**落不到登录页。
换句话说：产品按裁决在做，用例没带上"我需要游客态"这个前置。

要老实记下两点：

1. 这不是新发现——同一族 26 条在 #42 就判过一次，判词相同。它这次**又红了一遍**，
   说明当时只下了结论、没把结论编译进载具（`ops` 清单里没有身份前置字段）。
   **结论没落成载具，就等于没发生**，这条要写进终报的"载体欠账"里。
2. 修法有顺序约束：执行器是**按组现读** `ops/*.json` 的，两刀还在跑的时候改清单，
   同一轮里就会出现两套判据（前半旧、后半新）。所以 #51 明确排在两条腿都结束之后。

## 67 ③ 的第二、三项：后端早就做完了，缺的是客户端——这条是我核对盘才发现的

③ 在目标里写的是"落地 3 项后端契约改动"。派只读核对去盘上逐项验（不改 Java、不重启 8080、不碰模拟器），
结论不是"三项都完成"，而是**一项真完成、两项只做了后端那一半**：

| 项 | 后端 | 客户端 | 判定 |
|---|---|---|---|
| 写侧 DTO 缺字段 | `CampusController.java:456-474` 请求 record 有 images/isAnonymous，`RealCampusService` 落库 | `stores/campus.ts:744,831` 发同名键 | 两端都通（提交在 `f9a60925`，是 HEAD 祖先） |
| 私聊引用回复 | `PrivateMessageController.java:219 @Size(max=64) String quoteRef` → `:241-251` 写 `quote_context` → `MessageView.java:17` 读回，链路完整 | **断的**：`stores/messages.ts` 把入参写成 `_quoteRef` 不用，只发 `{content, kind}`；也没人解析 `quoteContext` | 端到端不可用 |
| 上传扩展名 | `LocalMediaStorageService.java:79-87` 图片/视频/音频三集合 + 写盘前强制 + 魔数 | **只有一条腿**：唯一客户端校验在 `support/feedback/index.vue:63` 自带一份白名单；共享路径（头像/相册/发帖/认证/语音）盲发 | 共享路径仍不校验 |

最刺眼的一条不是"没做"，而是**代码里留着一句已经不成立的自我开脱**：
`stores/messages.ts` 那段注释写着"PrivateMessageController 无引用字段 ⇒ 结案需后端先加"。
后端早就加了。这种注释比没注释更坏——它会让下一轮把这行判成"等别人"，于是永远不动。

### 67.1 客户端补齐（两处）与我自己补的第三处

- 私信：`stores/messages.ts` 新增 `quoteContext` 进 `BackendMessageView`、`parsePrivateQuoteContext()`
  把后端快照解析成行模型的 `quoteRef/quoteBody/quoteSender`（后端这里的 `sender` 是用户 ID 数字，
  与临时会话用的 self/peer 不同口径，所以按 currentUserId 归一）；发送侧
  `data: quoteRefPayload ? { content, kind, quoteRef: quoteRefPayload } : { content, kind }`，
  空白与 >64 一律不发（引用是可选语义，不该让一个非法引用把整条消息拖进 400）。
- 共享上传：`utils/media.ts:339-411` 立 `ALLOWED_MEDIA_EXTS` 为**单一来源**（与后端逐集合同名同集合），
  `services/api.ts` 上传前按 `resolveUploadMediaKind(formData.type)` 判定并抛错，复用调用方已有的 toast 通道；
  `services/voice-upload.ts` 走同一判定。新文案键 `storeErrors.media.uploadExtNotAllowed` 中英各一份。
- **临时会话那条我另外补**：round-1 的原判词是"私信与临时两条链路均被静默丢弃"，
  lane 只接了私信。若我就此结案，就是拿半修冒充全修（正是本轮反复修的"把红洗成绿"）。
  所以 `stores/chat/actions/messaging.ts` 的 `sendText` 加第三参 `quoteRef`（`SendMessageRequest` 本来就有这个字段，
  只是没人赋），页面 `chat-session/index.vue:1266` 把 `quoteRef?.messageId ?? null` 真的传下去。
  未做的部分写在行里，不藏：临时链路的 **WS form-B** 仍不带引用。

### 67.2 补登记两条行 + 判点 + 守恒

`MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-002` 是 **round-1 的老号**（`round-1/issue-matrix.md:490`），
从来没并进权威台账——代码注释里引它在册，台账里却查无此号。本轮补登记（历史别名列写明来源），
并新立 `MP-R7CLIENT-UPLOAD-EXT-001`。台账 `DATA_ROWS=230 → 232`，`LEDGER_RESULT=PASS`、
`OFF_SCHEMA_ROWS=0 STATUS_VOCAB_BAD=0`。判点从 47 加到 **49**，`SRC_SHAPE 49/49 守恒 yes`；
`I18N_ZH_KEYS=4172＝I18N_EN_KEYS`、`ZH_ONLY=0`、`EN_ONLY=0`、孤儿 1257＝上界（新键被引用 ⇒ 不涨孤儿）。

补拍清单重派生：`needFrames=53（待修复 15 + 已修复待复验 38）`、`pages=18 在巡检全集内=17 不在=1`，
守恒打印 `17+1 vs 18` 明写了那 1 页被丢。被丢的是上传闸门那条——它的"页面"是一组模块文件，
页级巡演根本开不到它；**它的复验载具不是帧，而是一次真上传正例 + 一次非法扩展名负例**，
这条差异要写进终报，不能让"53 行都排进补拍了"这种话糊过去。

### 67.3 一处流程教训（也是本轮第 N 次撞上同一类）

结论没落成载具就等于没发生：同一族 26 条登录页用例在 #42 就判过"档位错配"，
这次 A 刀又原样红了 26 条，因为判据清单里始终没有"这条要游客态"的前置字段。
③ 这两项同理——"后端已修"被记成"已落地"，客户端那半段静默缺席了一整轮。

## 68 两刀之间的离线窗口：产物重建完、索引重建完、核验台重跑完，其中三件事是当场发现的洞

排队器这一轮跑了 6 条腿，前 4 条成功：`rebuild-mock` ✓ → `gates-source-shape` ✓（47/47）
→ `gates-i18n` ✓ → `rebuild-real` ✓（`G7_RESULT=PASS`）。第 5 条 `exec-guest-real` 退 2，第 6 条 NOT_RUN。
先说成功的部分带出来的三件事实，再说失败那条。

### 68.1 重建之后核验台的桶位移：`SOURCE_ONLY` 归零

对**新产物**重跑核验台：`items=116 ARTIFACT_VERIFIED=27 SOURCE_ONLY=0 NEEDS_UI_FRAME=73 NOT_IN_EITHER=1 UNDECIDABLE=15 CONSERVED=yes`。
`SOURCE_ONLY` 从"00:16 之后才改的"那一整类直接清空 ⇒ 今天所有的源码侧修复（含 ③ 客户端半段）
现在都在被量的载体里了。仍然欠的是那 73 条要帧的，与两刀顺序一致。

### 68.2 权威证据索引第一次真正接上了执行轮

`emit-exec-manifest.mjs`（A 刀 tap3）：`总行=1107 带帧行=646 拒收帧=4 盘上=650 无人认领=0` ⇒ 守恒成立
（646 证据 + 4 张"太小的帧不算证据"= 650，两边都有账）。写盘后 `rebuild-frozen-manifest --round 7 --allow-bands`：
**`shots` 从 303 涨到 499**、`stateNotApplied=530`、逐条哈希全等 `UNION_SELFCHECK=OK`。
但这里有个必须写下来的判读：tap3 自己贡献 `201 张独立帧 + 445 张同字节降权`——
**执行轮每条用例都出一帧，不等于 445 条判据各自有了独立视觉证据**；
同页同身份同字节的后到帧按现行采集规则不算独立证据。终报里"出帧=646"这句话必须带这条限定，
否则就是把页级帧说成判据级证据。

### 68.3 一处旧 corpus 的哈希对不上：是"重拍覆盖了旧目录"，不是编译噪声

自证一开始 FAIL 5 条、一个字节都不写。逐条看：`round-7-uidebt-1a1df78b` 的 manifest 写在本地 19:27，
而这 5 个 .png 的 mtime 是 20:31~20:38 —— **晚了一小时**，且重拍后**两两同字节**
（MATCHING-001 与 MATCHING-016 同为 `f22b30aa…`；LOGIN-INDEX-001 与 -007 同为 `ba53e382…`）。
也就是后来的取景往旧 corpus 目录里覆写，却没重算那份 manifest。

处理上我拒绝"把新哈希写回 shots[]"（那是拿一次没有配文的取景悄悄替换旧判据的证据 ⇒ 目标明令禁止的重打戳），
改成 `scripts/qa/repair-corpus-rehash.mjs`：把这 5 条从 `shots[]` **移进** `stateNotApplied[]`，
每条带上 `supersededHash / supersededBytes / currentContentHash / fileMtime / movedReason`（含同字节孪生点名），
守恒打印 `42 = 37 保持 + 5 移出`，写前 `.pre-rehash.bak`。判据要恢复只能重拍，账是清的。

### 68.4 第 5 条腿为什么退 2：换档位必须换项目窗口，这一步此前没人做

`exec-guest-real` 打印 `RUNNER_GUEST_BAND mode=real ok=true`（⇒ real 档确实能表达游客，
mock 档那句"会把游客吃掉"的拒跑是对的），但紧接着 `TRANSPORT_ERR automation_evaluate 调用失败`、
`RUNNER_RESULT=FAIL reason=启动阶段（登录票据/开页）就抛了`。原因不在判据，在窗口：
执行器只往**当前开着的那个模拟器**里注入，它自己不开窗；`real-tour-cli.mjs` 才带着自己的开窗口径。
补了 `scripts/qa/open-project-window.mjs`（调 `open_project_window` 之后**必须**回读一次当前页路由，
读不到就 FAIL——"命令返回 ok"和"窗口里跑的是我要的产物"是两件事），
并把腿清单改成 `开 real 窗 → guest 腿 → A-real 腿 → 开回 mock 窗`。
截至写这一节，该工具第一次实跑仍 `verify=no-live-route`，正在等第二个数据点（延时探针）；
若窗口确实起不来，⑤ 的"双身份"就只能靠 real 档页巡（`real-tour-cli` 那条已验证过的路）补，
**不会**拿 mock 档的"游客腿"冒充——那正是这条腿自己拒绝做的事。
**（本段的两处推测已在 §72 撤回：窗口是活的，`no-live-route` 是我自己把探测串写成了裸 `return`；
而那次 guest 腿失败的根因是 real 项目窗口未被打开，腿日志看到的 FAIL 又是上一轮留下的旧文件。）**

### 68.5 一条复发陷阱，写下来防第三次

`NOT_IN_EITHER` 第一条的原因是我自己写的证据散文：核验台把格子里的裸标识符
（工具输出的键名、反对照变量名）当成"产物里该搜到的名字"。改成中文描述后它**不再是同一个原因**，
现在剩的是"判据含英文口径，而 mock 构建只出 zh-CN.js"——那是**载体表达不了**（同 §68.4 的档位问题一个形状），
正确处置是指名它的载体是源码侧的中英配对门禁（`I18N` 门禁同轮中英各 4171、单侧独有 0），
而不是把这条说成"没落地"。凡引用工具输出：要么改写成中文描述，要么加 ⟨⟩ 括注。

## 72 guest 腿差点被我误杀：三条"看起来是产品/环境坏了"的线索，最后全是我的载具在骗我

上一节我写下"real 档窗口可能起不来"。**那句话现在撤回**——它建立在三个各自都有 bug 的观察上，
逐个纠正如下（每一个都是"退出码/日志行是对的，但它回答的不是我以为的问题"）：

1. **`open-project-window.mjs` 的验证串写错了形式。** 我给 `automation_evaluate` 传的是裸
   `return JSON.stringify(...)`，而本仓可用的探测串一律是箭头函数表达式 `() => …`
   （`r-exec-cli.mjs` 的 `probeMany` 就是这么写的）。IDE 侧把它当脚本首行解析，报
   `Uncaught Unexpected token 'return'` ——**两个项目同时报同一个错**，
   于是看起来像"窗口/档位有问题"，其实是我送进去的源码不合法。改成箭头式后同一条调用
   立刻读到 `{"route":"pages/login/index","pages":1}`，且 `open_project_window` 返回
   `{"success":true,"type":"reuse","winId":"s0"}` ⇒ real 窗口是活的。
2. **错误信息被自己截掉了。** `cli-automator.ideCall` 抛错时把 `e.stdout` 取**头部** 260 字，
   可头部全被那条 200+ 字的 bootstrap `-e` 命令行占满，真正的 MCP 报错一个字符都留不下
   ——我连读了三次 `stdout={ "ok":` 就断了。改成取**尾巴** 460 字之后，才看到
   真正的原因是 `timeout waiting for automator response`（以及第 1 条那个 Uncaught）。
   同一个函数里我加的重试只认"传输层超时"这一种错（产品失败会有答案、不会走到这条），
   它确实让 `openPage` 之后那一下起死回生（探针第 7 步从 FAIL 变 OK）——
   **但要写清楚：guest 腿当时的失败原因是窗口没开，不是这个超时**，
   不能把"我加了重试所以它活了"当成因果，那条腿比我的重试编辑早 3 分钟起跑。
3. **排队器的腿日志只在腿结束时写。** 我 22:38 和 22:42 两次去读
   `ui-queue/exec-guest-real.log` 看到 `RUNNER_RESULT=FAIL`，那其实是**上一次尝试**留下的文件；
   正在跑的这条一直在正常出帧（`exec-guest-real/exec-results.json` 36 KB、
   `reports/screenshots/round-7-guest-real/` 在长、租约心跳在走）。
   我据此又起了一个重复队列（等同一把锁，一旦前面的腿结束就会两家抢），
   发现后按命令行核对 pid 只杀了我自己 2 分钟前起的那个 ⇒ 现在队列 1 个、runner 1 个。

现在的真实状态：`RUNNER_GUEST_BAND mode=real ok=true` + `verifyLogin=not-logged-in` +
guest 腿在 real 档正常跑（⑤ 的第二把身份刀第一次真的在动），
它的腿日志要等它结束才会落到 `ui-queue/` 下——**判断在跑的腿看它自己的 out 目录，别看腿日志**。

顺带把这条固化成规则：以后凡是我新建的工具，第一次跑出来的"红"先按**我自己的载具有 bug** 处理，
把完整错误文本拿到手再下结论；本轮三次误判全都是这个顺序倒过来造成的。

## 73 A 刀 43 条 FAILED 的账：只有一种失败原因，且两种落点各自都有正确的载体

按页 × 落点拆开（`exec-results.json` 全 1107 行统计，非抽样）：

| 条数 | 页 | 实际落在 |
|---|---|---|
| 26 | `pages/login/index` | `pages/discover/index` |
| 10 | `subpackages/vip/index` | `pages/profile/index` |
| 5 | `subpackages/vip/bills` | `pages/profile/index` |
| 2 | `subpackages/vip/promo-code` | `pages/profile/index` |

43 条的 `failureReason` 是**同一句**：`落在别的页（页内守卫或路由重定向），须人判`。
两条判词（都不需要人，因为落点本身就是被裁过/被开关解释的）：

1. **登录页那 26 条 = 身份档位错配。** 用例前提写着"清登录态冷启动落登录页"，却跑在已登录身份 A 上；
   ④ 已裁"已登录访问登录页 ⇒ `switchTab(discover)`"，所以它们**必然**到不了登录页。
   正确载体是 guest 腿 —— 正是此刻在 real 档跑的那一条。#51 另外要把这批用例在 ops 里挂上 guest-only 前置，
   让 A 档显式 `SKIP/IDENTITY_MISMATCH` 而不是每次都吃 26 条红。
2. **VIP 那 17 条 = 功能开关把非 VIP 用户弹回 profile。** 与 #43 同一族（那 34 条当时是用 showcase 档补测的），
   showcase 只绕 `usePageAccess`、不绕页内 LockScreen，所以这一族仍要按 #43 的口径单独跑一遍 showcase 腿。

诚实边界：这两类都**不是产品缺陷**，但也**不能当成"跑过了"**——本轮的终报里我要写成
"执行轮 1107 例：EXECUTED=650 / FAILED=43（全部为落点守卫类，已归因到身份与开关两条腿）/ SKIPPED=414"，
并且**在 guest 腿与 showcase 腿回来之前，不宣称双身份已完成**。
`unclassified=457` 是分诊台的老分类器不认识这批原因词（它按 round-6 的词汇表分类），
所以那 457 条里包含 414 条 SKIPPED —— 这是**分诊载具落后**，不是新的红；
下一手要把 `triage-exec-failures.mjs` 的词表跟着本轮的 `failureReason` 口径补一遍（它自己就是一次"结论没落成载具"）。




### 67.4 那两条"页级巡演开不到"的行，载具补成了单测

`MP-R7CLIENT-UPLOAD-EXT-001` 的"页面"是一组共享模块，`make-reshoot-plan` 把它算成
`不在巡检全集内=1` 明着丢掉——**截图载具对它是错的**：既要不到负例（非法扩展名根本不会开一页），
又贵。所以补一份真载具：`apps/client/src/tests/upload-quote-guards.spec.ts`，
`vitest run` 单文件 **9 例全过**：

- 白名单三档与后端逐集合等值（`image=jpg/jpeg/png/webp`、`video=mp4/mov`、`audio=aac/mp3/m4a/wav`），
  以后端为准写死在断言里 ⇒ 有人单方面改客户端表就红；
- `gif / webm / svg / txt` 必须拒（gif 正是历史那份 `limits.ts` 清单放行、后端拒收的那个，
  挂在 `MP-R7CLIENT-LIMITS-GIF-001` 上）；
- 大小写与带查询串/反斜杠的临时路径都能取对扩展名，`blob:` 与空串**保守放行**（不误杀 H5）；
- `quoteContext` 的 self/peer/system 三口径、非 JSON 脏数据、缺 id，
  以及 `currentUserId` 还没就绪时**不得**翻转成 self（R16 那类左右翻转的根因之一）。

两行的证据格都已把这份载具写进去（`patch` 走程序化追加，列数守恒断言 + `verify-ledger` 232 行 PASS）。
仍然欠的只有端到端观感：真机上被拦下的 toast、真上传成功一次、真发一条带引用让对端看到引用条。
另：`vue-tsc --noEmit` 在这一批客户端改动之后 `TSC_EXIT=0`（日志
`reports/audit/round-7/typecheck-after-client-fixes.log`）。

## 69 我自己引入过一次测试回归：桩比模块表面窄

跑全量 vitest（改完 ③ 客户端半段之后）⇒ `Test Files 1 failed | 114 passed`、
`Tests 1 failed | 1307 passed (1308)`。唯一红的是
`src/tests/ws-store-dispatch.spec.ts > 私信 real 载荷经转换层进入 onNewMessage`，
症状是 `Number of calls: 0`——**看着像产品把私信分发弄坏了**。

真因是我的改动链：`ws-message-adapter.fromWsPayload` 现在会调
`parsePrivateQuoteContext`，而那份 spec 对 `../stores/messages` 用**显式工厂 mock**、
只导出 `useMessagesStore` 一个名字 ⇒ 调用即抛 ⇒ 分发没发生。
所以这不是产品缺陷，是**桩的导出面比模块窄**，被一次合法的新增依赖戳穿了。

修法与一次失败的尝试都记下来：

- 第一次我改成 `importOriginal` 透传真函数（听起来最"诚实"）。结果整个 spec **连采集都失败**（0 test）：
  真 store 会拖进 `config/env` 等一整套依赖，而该文件对 env 是部分 mock ⇒
  `No "clientEnv" export is defined on the "../config/env" mock`。
  **在一个已经部分 mock 依赖链的文件里，用 importOriginal 去"求真"会把整条链拽进来。**
- 最终修法：桩里补一个 `parsePrivateQuoteContext: () => null`，
  并在注释里写清"本 spec 量分发、引用解析的真覆盖在 `upload-quote-guards.spec.ts`（那边 import 真模块、不经过桩）"。
  分工明确 ⇒ 既不虚报覆盖，也不让一个分发测试替解析逻辑背书。
- 复核：`Test Files 2 passed / Tests 16 passed`。全量复跑排在两刀之后（#50 的一部分）。

这条也算 ⑤ 的一部分：门禁不是"跑过就行"，跑出来的每一条红都要先判它红在**产品**还是红在**我的载具**，
再决定改码还是改桩——反过来也一样，绿也可能是桩太窄把真调用挡住了的绿。

## 70 ① 里"端口走配置文件而非命令行"这一句，之前其实没有对应载具

对照盘上事实核 ① 时发现：`ws-channel-up.mjs` 的端口一直是 `opt('port', '9420')` ——
**命令行字面量**，而 ① 明确写着"IDE 服务端口这一档，走配置文件而非命令行"。
`round6-LEDGER.md:3488` 早就记过为什么必须是配置文件：CLI 全表里没有 settings/enable/port 开关，
UI 那一档脚本改不了。也就是说：通道本身能用（这一轮真实用过 WS 取景，`uidebt-shoot-ws*` 都在盘上），
但"端口来自配置文件"这半句从来没有载具。补上：

- `scripts/qa/ide-port.json`：IDE「设置 → 安全设置 → 服务端口」在本仓的**镜像**，
  自带 `$comment` 说明为什么是镜像（不是 IDE 真配置：`%APPDATA%\微信开发者工具\Preferences`
  实测只有 57 字节，端口不在里面；找不到可靠的 IDE 真配置文件 ⇒ 不假装读到过）、
  端口会随 IDE 重启漂移的历史（9431 消失那次），以及"两条通道同时驱动一台模拟器不报错只换页"
  ⇒ 独占归租约管，不归端口管。
- `scripts/qa/ide-service-port.mjs`：读它 + **当场用 netstat 证明端口在听**，
  不在听就非零退出并明写"不要退回硬编码端口，先去 IDE 设置里打开"。
  配置形状也有判据（端口区间、桥端口非空、必须带 `$comment`）。
- `ws-channel-up.mjs` 的缺省端口改成从配置文件派生，并打印 `WSX_PORT_SOURCE=config …`；
  读不到才回落 9420，且回落**必须留一行痕迹**，不许静默。`--port` 仍可覆盖（做对照用）。

正反两个方向都验过（都只读，没开任何窗口）：

- 真配置 ⇒ `ws=9420 listening=yes pid=31084`、`bridge=9430:38636`、`IDEPORT_RESULT=OK`，
  pid 与手打 `netstat -ano -p tcp` 的两行逐字对得上；
- 造一个死端口 ⇒ `listening=NO` / `bridge=…:down` / `IDEPORT_RESULT=FAIL` 退出码 1。

过程里我自己的工具错过两次，都记下来：第一版把 netstat 的**状态字**当 pid 打出去
（`pid=LISTENING`——退出码是对的，回答的问题是错的）；第一版负例配置少写 `$comment`，
于是它先被我自己的形状守卫拦掉，**根本没跑到监听判定那一步**，负例一度是空的。
两条都是"补跑一次 + 看输出而不是看退出码"才露出来的。

## 71 ⑤ 的机制洞（本轮新找到第 5 个）：执行轮拍了 622 张帧，但权威索引一条都不认

盘上事实：

- `reports/screenshots/round-7-tap3/` 有 **627 张 png**，目录里**没有** `manifest-detail.json`；
- `rebuild-frozen-manifest.mjs:47` 只认 corpus 自己的 `manifest-detail.json`，缺文件就打印
  `SKIP <corpus>` ⇒ 这整个 corpus 进不了权威索引；
- `r-exec-cli.mjs` 全文不写 manifest，只把帧塞进行里的
  `evidence: "reports/screenshots/round-7-tap3/XXX.png(9560B)"`；
- 权威索引 `reports/audit/round-7/screenshot-manifest.json` 现有 303 条，
  按 corpus 分布是 `real-exec 100 / mock-tour 77 / real-tour-full 77 / uidebt 31 / real-tour 18` ⇒
  **tap3 一条都没有**（guest 腿同理）。

所以"1107 例执行轮 + 双身份"这件事，光跑完不算完成：帧在盘上、在结果里，
但读证据的那几把门禁（完整性、per-round 索引、后续复用）看不见它们。

补的载具 `scripts/qa/emit-exec-manifest.mjs`：从 `exec-results.json` 的行**反推**出
corpus 的 `manifest-detail.json`，写盘前三条判据——

1. 双向守恒：带 evidence 的行数 == shot 数，且盘上每张 png 都被某行引用（孤儿文件即拒绝）；
2. 字节自证：行里那串 `(NNNNB)` 必须等于文件真实大小，不符就拒绝（那是采集当时打印的值，
   对不上就是证据自己在撒谎）；
3. 逐条 `statSync` + 重算 sha256 前 16 位，与 `rebuild-frozen-manifest` 的自证同口径。

上线前正好用它自己的负例做了对照：拿**上一分钟**的结果快照（529 行、319 帧）去跑还在写的轮，
它正确地拒绝 —— `盘上 png=627 被引用=319 孤儿文件=308 ⇒ EXECMAN_RESULT=FAIL`。
这正是我要它做的事：结果文件落后于盘上事实时，**不许**产出一份看起来完整的索引。

顺带把 `state` 字段定成 `用例号 + 标题首段`（唯一、可回溯），因为同字节检测比的是 `contentHash`，
标签唯一不会掩盖重复，反而能把"同页两个状态出同字节"这件事露出来。










## 74 分诊台词表跟上执行器：负例测试当场抓到我自己写的三个谎

执行轮（A 刀 1107 行）跑完后，`triage-exec-failures.mjs` 的分诊结果不可用：
round-6 时它的输入长这样 —— `action tap .x failed: element not found: ...`；
本轮执行器换成了中文判据语句（`requiresReal ⇒ …`、`落在别的页（页内守卫或路由重定向），须人判`）。
旧词表把这些全塞进兜底桶，而兜底桶在报告里只是一个数字。

修法不是"多加几条 if"，而是**把本轮实测到的口径逐条命名成桶**，并且让词表漂移必须变红。
实测口径 = 31 个 distinct 前缀，归成 9 个新桶 + 保留 8 个旧桶；合计 650+236+73+34+19+15+31+5+1+43 = 1107，
与行总数守恒（脚本自己断言）。

### 74.1 两条新断言：`unclassified === 0`，以及"每组落地对必须有处置"

`FAIL → 落在别的页` 有 43 条，但它们不是 43 个结论，是 **4 组「声明页 → 实际落地页」**：

| 落地对 | 条数 | 处置 |
|---|---|---|
| `pages/login/index → pages/discover/index` | 26 | 身份带不匹配（mock 带自动登录），由 guest 真实带腿复测 |
| `subpackages/vip/index → pages/profile/index` | 10 | 权益重定向，由 showcase 带腿复测 |
| `subpackages/vip/bills → pages/profile/index` | 5 | 同上 |
| `subpackages/vip/promo-code → pages/profile/index` | 2 | 同上 |

条数是脚本自己分组数出来的，`LANDING_DISPOSITION` 里只写"这组由哪条腿复测"。
新增一组落地对而这里没有条目 ⇒ 门禁红。这一条防的是：以后有人把"点不动"改成"判红"或者反过来，
必须先回答"那谁来复测"。

### 74.2 负例测试抓到的三个缺陷（都不是被测物，是我的载具）

按老规矩，写完门禁先拿**故意造错的输入**跑一遍 —— 不会变红的门禁等于没有门禁。三个当场暴露：

1. **未知 SKIPPED 口径被贴错标签**：它落进了 `SKIPPED-not-automatable`（"通道做不了这类动作"），
   而事实是"本脚本不认识这句话"。计数没错（unclassified 照加），**结论却是错的** ——
   读报告的人会以为这是覆盖缺口而不是分类器落后。已改成落进 `other-fail` 并单独记原因。
2. **红的时候证据是空的**：die 消息里的清单是从兜底桶反查的，而缺陷 1 恰好把那行搬去了别的桶，
   于是打印出 `有 1 行没落进具名桶：`+ 空。改成在任何改名之前就 `markUnclassified(r, 原因)` 记一条，
   行号、页面、status、reason 原文一起进 md 和 json。
3. **第一条断言 throw 掉，第二条就永远不跑**：负例里那个"没有处置的新落地对"其实也成立，
   但 `die()` 抛异常直接终止，只报了第一个问题。改成先收集 `gateProblems[]`、写完盘、
   一次性打印全部、最后 `process.exit(2)`。

### 74.3 顺带修掉报告面板里两处会失真的写死

`emit-round-report.mjs` 的 D 节本来写死了 round-6 那 8 个桶名，并且把"本轮没出现的桶"印成
`（本次为 0、故未列出的桶）`。在 round-7 的词表下这句话是**假的**：`locate-label=0` 读起来像
"文案定位问题清零了"，实际是本轮这条通道压根没产出那种口径。现在桶名单由分诊台自己在
`bucketNames` 里带出来，措辞也改成"本轮词表内没有这种口径 ⇒ 不代表该类问题不存在"。

同节的回退路径原本硬编码读 `.zcode/tmp/triage-r6.json`。但分诊台的契约现在是
**判红之前先把本轮 sidecar 写完** —— 于是红的那一次，本轮就有可信文件，回退去读上一轮反倒把
round-6 的数字印进 round-7 的报告。改成先读本轮（标明"判红那份、其数字不可用于通过率"并 ERRORS.push），
读不到才退旧文件。

### 74.4 一个命名上的自伤

我把 stdout 的 `TRIAGE_RESULT=OK` 改成了 `TRIAGE_SUMMARY` + 结尾 `TRIAGE_GATE=PASS`。
原因是失败分支还在打印 `TRIAGE_RESULT=FAIL`，而退出码 2 之前那句"OK"会被任何按 grep 取绿的人读到 ——
一个脚本同时输出 OK 和 exit 2，就是假的两个真相。现在绿只有 `TRIAGE_GATE=PASS`，红只有
`TRIAGE_RESULT=FAIL`，两边退出码分别是 0 / 2。

载具：`scripts/qa/triage-exec-failures.mjs`（词表 + 两条断言）、负例输入
`.zcode/tmp/neg-triage-results.json`（保留，可重放），正例输出 `.zcode/tmp/triage-r7-a.md/.json`。

## 75 新增一道「档位新鲜度」门：三条判决原来绑的是一份已经不存在的构建

做 #53 时顺手核对两刀的执行轮到底跑在**哪一份产物**上，量出来的时间线（UTC）：

| 事件 | 时刻 |
|---|---|
| A 刀（1107 例，mock 档）起跑 | 20:25:35 |
| 改 `stores/messages.ts` | 21:38:38 |
| 改 `utils/media.ts` | 21:40:20 |
| A 刀收尾 | 22:14:11 |
| mock 包重建完成 | 22:22:43 |
| real 包重建完成 | 22:23:42 |
| guest 腿起跑（real 档） | 22:42 起 |

⇒ **A 刀整轮绑的是 22:22 之前那一份 mock 包**，而那份已经被覆盖、盘上不存在了；
它却盖着 `gitSha=e4495d67`（工作树 HEAD）。这就是 ⑤「执行轮 × 最终产物」的一个洞，
而且此前**没有任何一门会告诉我**：判据台只看源码/产物形状，不看"产物是不是这一轮那一份"。

于是立了 `scripts/qa/verify-band-freshness.mjs`（并接进门禁面板 `G.fresh`，进否决集）。

### 75.1 实测结论（三档分别）

- **mock / real：`FRESH_RESULT=PASS`** —— 盘上这两档不晚于任何未提交改动，符号级深检全命中。
  也就是说 guest 腿和"A 刀重跑"用的载体是干净的；要重跑 A 刀只是因为**旧那份没了**，不是因为新那份脏。
- **showcase：判红四条** —— 它停在 16:52，`isAllowedMediaExt` / `parsePrivateQuoteContext` /
  `pinnedNotice` 三个本轮修复都不在包里，`village/detail.vue` 新增的 6 个字面量里 3 个找不到。
  #43 想拿它补 VIP 那 17 条，等于用旧源码测新档位 ⇒ 必须先重建（已写成 carryover 腿）。

### 75.2 一条要公开的载体局限：产物不承载英文语料

门的第一版把 mock/real 也判红了，理由是 `en-US.ts` 新增的 30 个字面量里 24 个不在包里。
**这是假的**。单独量了一次校准：

| 文件 | 文件内字面量 | 在 mock 产物中命中 | 命中率 |
|---|---|---|---|
| `zh-CN.ts` | 4904 | 4876 | 99% |
| `en-US.ts` | 2976 | 251 | 8% |

⇒ 构建根本没把英文语料打进包（HEAD 里既有的英文也只有 8% 命中，所以不是我新增的那几条的问题）。
现在门在定罪前先做这个校准：某文件在该档的**既有内容命中率 < 25%** ⇒ 判 `不可观测`，
既不定罪也不洗清，单独打印并送进终报的"一条不藏"。

这条同时解释了判据台上一直挂着的 `NOT_IN_EITHER`：**凡是判据只能靠英文文案成立的条目，
在产物级永远不可能结案**，只能靠源码判点或单测 —— 不是产品缺，也不是我漏改。

### 75.3 这道门自己身上抓到的四个缺陷（都是我的，不是被测物）

1. `dirty.set(...)` —— `Set` 的方法是 `add`，`set` 是 `Map` 的。抛出的 TypeError 被自己的 catch 咽成
   一句"读不到 git 脏项"，于是脏项集合是空的，**所有**源码文件都被归成"与 HEAD 相同"：
   真过期的那批全部当成 mtime 噪声，门会绿得完全相反。补了一条守恒：`git 报出行数 > 0 而解析出 0 条` ⇒ 判红。
2. **注释被当成探针**：第一版从 `+` 行里抠字符串字面量，把「底部留白分两档」「半透明品牌绿」这类
   我自己写的注释拿去产物里搜，于是三档全判过期。注释永远不进产物 —— 这是载具极性选错，
   跟 §75.2 是同一类错。现在跳过 `//`、`/*`、`*` 行并剥掉行内注释。
3. **测试文件不该参与**：`src/tests/**` 从来不进小程序产物，拿"产物里找不到它"判红是一个永远正确的假红。
   现在排除并单独计数。
4. **一条结论复制 38 遍**：一档被第一个文件定罪后，其余嫌疑文件必然同样判红，把首因埋在一屏重复里。
   改成定罪即 break，跳过数单独打印。

外加一个建模修正：`utils/media.ts` 新增的是一串 4 字符扩展名，低于字面量长度门槛、也太通用，
任何档都永远"无法定罪" ⇒ 门对它永久红。标记符号现在可以声明 `covers: [文件...]`，
由符号替这些没有可搜足迹的文件说话。一把永远红的门等于没有门。

### 75.4 顺带发现：取景配方本身也过期了

`frameplan-merged.json` 的 `generatedAt=10:19`，早于 21:38/21:40 那波修复，
它的 `SHOOT=42 / REWRITE=16 / NOT_SHOOTABLE=21`（合计=expected 79，守恒成立）
是**按当时的台账**算出来的。carryover 腿里先跑重建与新鲜度门，出帧前还要按当前台账重生成一次配方，
否则 ① 的帧债会对着一份旧判决拍完。

## 76 guest 腿当场把新门的价值证明了：33 条落地对里 0 条是产品缺陷，1 条是证据缺口

#53 的门建好后，立刻拿还在跑的 guest 腿快照（469 行）试了一次，两个新东西当天就露头：

1. **一种没学过的失败口径**：`出帧失败且探针无有效答案（miss=…DC33-after.png（仅 2958B…）` ——
   执行器要求出帧、帧因太小被拒、同帧探针又没给有效答案。
   这一条**故意不给绿灯**：桶叫 `SKIPPED-frame-evidence-hole`，同时进 `evidenceHoles[]`，
   由文末断言单独否决（`TRIAGE_RESULT=FAIL`）。理由是：如果"起个名字"就算归类成功，
   那么给每个证据洞起个名字就能把门刷绿 —— 命名只让它从"没人看见"变成"人人看见"。
2. **两组没有处置的落地对**：`campus/hub → pages/login/index`（18 条）、
   `campus/index → pages/login/index`（15 条），合计正好是 guest 腿全部的 33 条 FAILED。
   按已定的裁定（游客不得浏览、未登录必须引导到登录/注册），**产品方向是对的**，
   错的是判据：这两组用例断言的是"看到校园页内容"。
   处置写成 `未结案：…`，门绿也要在 `TRIAGE_OPEN` 里报出来 —— 分类成功 ≠ 结案。

一条口径上的自伤顺带修了：未结案的组数原先只在 PASS 那行打印，于是**判红的那一次反而看不见它们**；
现在 FAIL/PASS 两条路径都打 `TRIAGE_OPEN 未结案的落地对=N 证据缺口=M`。
输出里的项目符号从 `○` 换成 ASCII 的 `OPEN_RULING` —— 这机的控制台是 cp936，
非 ASCII 符号进日志会让后面的 grep 全部落空（本轮已经为这类编码付过一次钱）。

两件事各开一条任务：#57 按裁定收紧这 33 条判据并重新登记，#58 补 DC33 的帧或换成机器可判断言。

## 77 本轮的修复把上一轮的免罪理由作废了：一条缺陷原地复活，而没有一门会报警

做 ③ 第①项的核实时撞见的事：台账 `MP-R2-CAMPUSPOST-010` 判「保留-判据不成立」，
理由原文是 —— *real 模式图片上传链路被能力开关整体关闭（后端 `CreateCampusTopicRequest` 无 images 字段）
⇒ 上传阶段抛不出错 ⇒ 判据触发前提不可达*。

盘上现状（逐个量过）：

| 锚点 | 立案时 | 现在 |
|---|---|---|
| `post-topic.vue` 的 `CAMPUS_TOPIC_IMAGES_SUPPORTED` | `false`（:64） | `true`（:65，行号还漂了一行） |
| 后端 `CreateCampusTopicRequest` | 无 `images` | `CampusController.java:461` 有 `@Size(max=6) List<@Size(max=2048) String> images`，:180 真的传给服务层 |

⇒ 逐张 `uploadPostImage` 那段（`post-topic.vue:319-341`）**真的会跑、真的会抛**。
而它跑在 `campusStore.createCampusTopic()` 之前，`errorMessage` 只在 `createCampusTopic` 入口才清空 ——
所以上传失败会落进发布的 catch，屏幕上显示的是上一次动作（拉话题 / 拉认证）留下的陈旧文案。
**缺陷一直躺在代码里，是它的免罪理由被本轮自己的修复作废了。**

判据台不看这个（它只问"修复在不在产物里"），台账自己也不会翻旧理由 —— 所以这事没人报警。

### 77.1 立一门专查「免罪锚点有没有被作废」

`scripts/qa/verify-disproof-anchors.mjs`：扫台账数据行里 `路径:行 名字=true|false` 形状的锚点，
回盘核对 —— 值反了 ⇒ 判红（前提不再成立，必须复判）；全文找不到那个量 ⇒ 判红（依据整个没了）；
行号漂了 ⇒ 判红并给出真实行号。已接进门禁面板的否决集。

它**只回答「依据还成立吗」**，不回答「这条该不该修」。这一条边界很重要，否则它会给人一种
"门绿了=判对了"的错觉。

实现上撞到一个真问题：复判后同一格里会同时出现**现行依据**（`:65 …=true`）和
**历史引文**（"原引 `:64 …=false`，已作废"），两者字面形状完全一样，
靠散文里有没有"原引"这种词不可靠，也不该让人再维护一张白名单。
规则最后改成能自证的：同一 (行, 文件, 常量名) 里只要有一条在当前盘上真的成立，其余同名的降级成
`CITATION`；一条都不成立才判红。想靠"多写一条真锚点"糊过去也不行 —— 那条必须自己在盘上成立，
等于把依据重新落地一次。

### 77.2 复判结果

- `MP-R2-CAMPUSPOST-010`：状态从「保留-判据不成立」推进到 **已修复待复验**。
  修法：上传段自己 `try/catch`，给 `t("campus.postTopic.uploadFailed")`（中英两份配对加键），
  复位 `isSubmitting` 后 `return`，不再冒充发布失败。判点是多文件谓词：
  `post-topic.vue` 要能扫到包住 `for` 的 `try`、`catch (uploadErr)`、那句 i18n 调用，
  两份语料都要有那个键 —— 五处全过才算过（`SRC_SHAPE total=50 成立=50 守恒 yes`）。
  **没做完的部分照原样登记**：真机上那张"被拦下时的 toast 观感帧"仍欠，属 ① 的帧债同类。
- `MP-R2-CAMPUSPOST-015`：状态**不动**（仍是不成立），但依据从两条腿变成一条腿 ——
  跨页重复豁免（用户裁定）还在，「real 链路关着所以无从表现」这条作废。
  这种"结论不变、依据变窄"必须写进去，否则下一轮会把两条腿都照抄。

写这两次改的时候顺手抓到我自己一个错：第一版把 010 的锚点写成
「`:65 现在是 CAMPUS_TOPIC_IMAGES_SUPPORTED=true`」的散文形状，**锚点门扫不到它** ——
我写的证据逃过了我写的门。已改成门能认的形状（门现在对它做机械核对并判 HOLDS）。

### 77.3 同时抓到判点载具自己在往台账写 `undefined`

`verify-source-shape.mjs` 生成 statusEvidence 补丁时取 `r.file`，而多文件判点没有 `r.file`
（只有 `files:[…]`），`where` 只在**失败**分支才被换成真文件名 ——
于是 50 条判点里 **14 条**（正好是最需要溯源的跨文件命题）往台账写成「承载 undefined」。
现在成功分支也带全承载列表（`a ＋ b ＋ c`），并加了一条守卫：
补丁文字里出现 `undefined` 直接判红。守卫拿旧写法做过负例，14 条当场复现、退出码 2。

### 77.4 补了一道 2 秒的门：改动先过解析器

一次 mock 重建要 ~40 分钟，而"少一个 `}`"这类错误本来会在那里才炸。
新增 `scripts/qa/parse-check-sfc.mjs`（用仓里自带的 typescript parser，只报 parse 诊断，
不冒充类型检查），支持 `--from-git`。本轮 39 个已改动客户端文件全过。
负例：故意写坏的 SFC 报 `L4:1 '}' expected.` 退出码 2；台账里写了不存在的文件也判红而不是静默跳过。
这道门也接进面板，和锚点门并列进否决集。

### 77.5 guest 腿的规模修正：不是 33 条，是 129 条 / 10 组

早先按 2 组 33 条登记了游客落地对。跑到 783 行时重量：**10 组、129 条，全部 `X → pages/login/index`**
（matching 20、match-success 19、village/index 19、campus/hub 18、campus/index 15、village/publish 12、
circle-home 9、tag-posts 7、history 6、certification 4）。
10 组逐组写进 `LANDING_DISPOSITION`（不用通配 —— 将来守卫放宽某一页时，要靠那一组锚点失配暴露，
而不是被一条笼统规则吸收），`TRIAGE_OPEN 未结案的落地对=10`。
其中 `certification` 那 4 条单独留了个真问题：新用户发起认证的入口如果**应该**是注册页而不是登录页，
那这一组就不是判据问题，是产品缺口 —— 这一条要人拍板，不在这里替它结案。

## 78 一行"永远为真"的缺口统计，和一次没成立的自我假设

给 #56（重生成取景配方）做前置核对时，撞见两件必须公开的事。

### 78.1 假设先说清楚：**没有**成立

我原先判断 `.zcode/tmp/fixverify/verdicts.jsonl` 之所以把 5 条已写「已修复」的行算进帧债，
是因为上一轮判据台用了 `--baseline HEAD`，而 HEAD 已被本轮自己的提交推前 ⇒ 已提交的修复对判据台不可见。
这个假设**可以机械检验**，就去验了：

| 检查 | 结果 |
|---|---|
| 那次跑的 meta | `baselineRef="HEAD" baselineSha="e4495d67" headSha="e4495d67"` ⇒ 基线确实等于头，怀疑的**前提**成立 |
| 换成 `--baseline 094f7239`（本轮开跑 SHA，已确认可从 HEAD 追溯）重跑 | `ARTIFACT_VERIFIED 27→29`、`UNDECIDABLE 15→14`、`NEEDS_UI_FRAME 73→72`、`SOURCE_ONLY 0→0`、`CONSERVED=yes` |

⇒ 前提成立、**结论基本不成立**：整轮只挪动 2 条。那 5 条的 `why` 依然写着
「授予绿用的判点在修复前的 HEAD 里就已存在」，换成真基线后也没变 —— 也就是说那几条不是被基线坑了，
而是台账发绿所依据的那个 token **本来就不是本轮的改动**（例如 `--tab-bar-total-h`、`--page-padding`）。
这类"判点早已存在 ⇒ 命中不证明改动落地"是真缺口，不能靠换基线洗掉。
（旧结果整份另存为 `verdicts.pre-baseline-head.json[l]` 作对照，改口径前后的差别可以逐条查。）

### 78.2 真找到的载具缺陷：`需交互或状态但没点名 selector=27` 是一句空话

`export-ui-frame-debts.mjs` 的 `namedSelectors` 只从 `r.uiMarkers` 里挑，
而 `uiMarkers` 装的是**类别标签**（`runtime` / `visual` / `static`…）——
正好被同一行那个 `/^(runtime|visual|static|…)$/` 过滤器全部丢掉。
结果 72 行的点名列 100% 为空，那句 GAP 数的是"我从不读的那个字段是空的"，
而不是"判据有没有点名"。真正的类名在 `probes[]` 里 `kind==="class"` 的 token（本轮 64 个）。

改完之后，同一件事的真实口径是：

| 口径 | 数值 |
|---|---|
| NEEDS_UI_FRAME 欠款 | 72 |
| 非静态类（INTERACTION 10 ＋ STATE 11 ＋ RUNTIME 6） | 27 |
| 其中带类名探针 | 9 |
| **取景前必须先点名** | **18**（旧脚本报 27） |

顺手加了一条反空转自检：**全部行点名列都空 ⇒ 直接 exit 2**，因为那在这个仓里已经发生第三次
（字段名不对、过滤器丢光有效值、提取器读错源），一次比一次隐蔽。

### 78.3 顺带量到取景配方确实过期了

以当前 72 条欠款对照 10:19 生成的 `frameplan-merged.json`（79 条）：
**4 条在欠款里而配方没有**（会被漏拍），**11 条在配方里而已经不是欠款**（会白烧模拟器时间）。
11 条离开的原因逐条回台账查过：都仍在册（不存在"扫描集悄悄变小"），状态多已推进到
`已修复（源码级判点…）`；但其中 4 条的 statusEvidence 里**仍然明写帧侧欠项**
（discover/matching 的观感半段、home/index-111、campus/hub-006、login/index-007）——
这属于"离开欠款集合"与"散文里还写着欠帧"不一致，要在 #37 的收尾里一起对账，不能只按桶的归属放行。

## 79 「18 行缺点名」其实是四种不同的债：只有 1 行点名就能结案

#60 我按"给 18 行补上点名类名"立案了。真去逐条回盘核之后，**这个题目本身就起错了** ——
18 行里有 15 行补类名根本不解决问题。派了三个只读核查（逐条读文件、给 file:line 证据、
并与基线 `094f7239` 对照），我自己又复核了其中三条最要紧的断言，结果是：

| 去向 | 行数 | 意味着什么 |
|---|---|---|
| needs_code | 3 | 物件在盘上还不存在，先写代码才谈得上点名 |
| needs_ruling | 7 | 要么等产品拍板，要么判据本身把盘上事实读错了 |
| needs_naming | 3，其中**只有 1 行的 token 真有判别力** | 基线里没有、本轮才有的物件 |
| not_frame_observable | 5 | 帧看不见这个量，拍了就是假结案 |

合计 18，与"当前非静态且没点名"的行集由 `scripts/qa/verify-frame-debt-triage.mjs` 的 C1 机器守恒
（门自己打印：`当前没点名=18 归置=18 needs_ruling=7 needs_naming=3 not_frame_observable=5 needs_code=3 已真正点名=1`）。
`HOME-004` 起初被我标成"已点名"，后来按 79.1 的证据改判进 `needs_ruling` —— 这也是为什么
ruling 是 7 而不是 6。

### 79.1 「点名就能结案」只有 LOCATION-001 一行成立

`cityDistant` 在基线 0 命中、工作树 5 命中，且页面确实按它分支到 `t("locationPage.addressUnavailable")`
⇒ 判点已立（多文件谓词：utils 层阈值常量 + 页面分支）。台账原来把 srcFile 写成 `utils/location.ts`，
那个文件里没有可渲染物件，探针要落在页面文件 —— 已在归置表里改正。

`MP-R2VIS-PAGES-HOME-INDEX-004` 一开始我也标了"已点名"，**是错的**：换 SVG 那半确实是本轮改动
（基线里还是行内字符 `↻`，`.today-card__rotate-icon` 基线 0 命中），但判据还要求「色 `--c-text-tertiary`、
与 22rpx 文字同字号」。字号对上了（22rpx），颜色没对上，且这次是我量出来的：

- `static/assets/icons/common/refresh.svg` 里 `stroke="#94A3B8"` 是写死的，`currentColor` 出现 0 次
- `--c-text-tertiary` 实测 `#6B7571`（design-variables.scss:105/357）
- 微信 `<image>` 引 svg 无法由 CSS 继承着色

⇒ 「同色」这个要求在当前资源方案下**不可达**，不是漏做一半。已把它从 needs_naming 改判 needs_ruling，
判点只保留换图那一半（claim 文字明确限定，避免将来发绿时把颜色也算进去）。

### 79.2 取景配方里有 6 行会被拍出假结案 —— 新门直接拦下

`C3` 拿当前配方（42 行标 SHOOT）与归置表求交集，命中 6 行：
`POSTTOPIC-012`（返回栈兜底，两态像素相同）、`PUBLISH-A05`（判据要的是 DOM 嵌套层级，帧分不出）、
`CIRCLE-HOME-002`（本轮把文案搬进 i18n，zh 值与原字面量逐字节相同 ⇒ 视觉零变化）、
`CHAT-SESSION-001`（先过滤再建行的顺序守卫，物件前后都在）、
`MESSAGES-020`（还挂着两件待拍）、`HOME-004`（着色那半不可达，见 79.1）。
最后一条是改判之后才进这个名单的 —— 所以数目从 5 变 6 是**我订正归置的结果**，不是门在抖。
这 6 行被拍进配方只会给台账添 6 个"有帧即已验"的空判决。门现在为这件事判红（也带整轮报告判红），
直到配方按归置结果重生成 —— 这正是 #56 排在这之后的原因。

新门同样做了负例（漏一行 / 假 carrier / 假 token / 空 next）：四条检查各命中一次，退出码 2。

### 79.3 另外三行是判据把盘上的东西读错了

- `NEARBY-INDEX-011`：判据称"页根容器上内边距取零"，盘上是 `padding: 24rpx 32rpx 0` —— 末位 0 是**下**内边距，
  上内边距是 24rpx；且该文件自基线起 `git diff` 为空。判据的目标是被误读的简写造出来的。
- `PROFILE-INDEX-002`：台账证据写着四组件 `margin:24rpx 24rpx 0`，盘上（和基线上）四者都已是 `var(--page-padding)`。
- `PROFILE-INDEX-003`：台账证据写"渲染『添加日常』"，盘上四处锚点都是「添加故事」且与基线逐字节相同。

这三条不改状态、不删结论，只把**事实**订正进归置表并留下待裁问题；
把判据里那句错的抄掉之前，任何"复验通过"都是建立在不存在的东西上。

## 80 双身份这一格终于有实测：guest 真实带 1107 行跑完

⑤ 写的是「巡检 62+ 页 × **双身份**」。在此之前只有 mock 档那一刀（identity=A，
运行时 `loginVerify=logged-in userId=user-1001`）。guest 真实带这一刀刚刚跑完：

| 腿 | 产物档 | 运行时身份核验 | 行数 | EXECUTED | SKIPPED | FAILED | 页 |
|---|---|---|---|---|---|---|---|
| A 刀（round-7-tap3） | mock@f1c7b96b | logged-in userId=user-1001 | 1107 | 650 | 414 | 43 | 62 |
| guest 刀（round-7-guest-real） | real@f0677920 | not-logged-in | 1107 | 434 | 434 | 239 | 57 |

两刀 `gitSha` 同为 `e4495d67`，身份不是写在标签上的，是 `loginVerify` 在跑之前实测的。

**两刀的比例差本身就是结论**：guest 档的 EXECUTED 只有 mock 的 2/3，FAILED 是它的 5.6 倍，
而 239 条 FAILED 全部是同一种形状 —— 26 组「声明页 → `pages/login/index`」。
逐条回盘看，没有一条是产品判红：mock 档里 26 条登录页用例失败（自动登录把游客吃掉），
guest 档里同一批用例通过且 `.login-page__brand:present(1)`；反向地，guest 档进内容页一律被守卫送到登录页。
⇒ 「同一个用例在两档里各失败一半」这件事，**只有双身份都跑才看得见**，
单档跑多少轮都不会暴露。#42 之前判的「26 条是载体错不是产品错」，这一刀是它的对照证据。

分诊口径（`.zcode/tmp/triage-r7-guest`）：`unclassified=0`，23 组写着「未结案」（另 3 组 VIP 是已 booking 的复测腿），
仍然判红的那 1 条不是分类问题，是 `DC33` 的帧没成立（2958B 被拒 + 探针无有效答案）——
按 §76 的约定，命名不等于结案。

A 刀绑的是已被替换的构建（§75），所以这一轮的「1107 例执行轮」要以重建后的 mock 档重跑一次才算数（#55）；
guest 刀不受影响 —— 它跑的 real 档就是当前盘上这一份（`verify-band-freshness` 对它判 PASS）。

## 81 登记 guest 那 435 张帧时，量出权威索引根本不含本轮

按 ⑤「带溯源终报」去登记第二把身份刀的帧，才看清 `rebuild-frozen-manifest.mjs` 的默认口径是 `--round 6`，
它写的是 `reports/audit/round-6/screenshot-manifest.json`（443 帧、gitSha=874ff52f）。
也就是说：**round-7 执行轮拍的帧此前一张都不在权威索引里**。不是漏登记，是索引压根没为 round-7 出过。

做完的四件事：

1. **登记 guest 帧**：`emit-exec-manifest` 双向守恒 —— 盘上 435 = 引用为证据 434 ＋ 已记为拒收 1，
   `无人认领=0 记账缺失=0`。那张 2958B 的小帧没有变成孤儿文件，而是被记成"拒收"（#58 的缺口由此可查）。
2. **出 round-7 权威索引**：`--round 7 --allow-bands` 之后 `in=1485 kept=642 moved=843 守恒 OK`，
   并按 5 个构建带分列（`e4495d67`=guest-real/tap3、`1a1df78b`、`91e56562`、`57e907e1`、`094f7239`=states 系列）。
   首轮不加 `--allow-bands` 时它直接判红（`gitSha 不一致`）—— 这个拒绝是对的，一轮跨多个构建不能混成一本账。
3. **6 个 `gitSha=unknown` 的 corpus 被 KICK**（`round-7-states*`，共 27 帧声明）。
   新增 `scripts/qa/stamp-orphan-corpora.mjs`：不手填，按 `generatedAt` 反查"采集那一刻的 HEAD"，
   并把来历一起写进文件（`gitShaSource`、`gitShaFull`、`gitShaLagSec`）。六个全部推到 `094f7239`
   ＝本轮开跑 SHA，lag 23 分钟～2 小时，语义自洽（那些 pilot 就在本轮开头跑的）。
   三条拒绝条件让它不能用来编证据：无时间戳、查不到更早提交、推出来的提交比采集时间还新 ⇒ 一律保持 KICK。
4. **顺手补掉一个"只给计数的红"**：全域 corpus 门一直打印 `CORPUS_PROBLEMS=3` 却不说是哪三件。
   现在逐条给 `CORPUS_PROBLEM <文件> :: <原因>`，一跑就看清这 3 件全是 round-1 的历史账
   （`round-1` 系列 754 帧根本没有 `contentHash`）—— 与本轮无关，也印证了"全域红是历史记录、
   scope 红才否决收尾"这个双口径设计的必要。

完整性轴复跑 `EVIDENCE_RESULT=PASS`：642/642 命中、missing=0、哈希不符=0、孤儿=0、
且执行件引用 0 处伪证。A-real 那一腿跑完还要再登记一次并重出索引（#52 因此不算完成）。

## 82 我自己把 mock 档覆盖了：一次"构建成功"却产出错误档位的事故记录

我按 #54 的待办去重建 showcase 档，用的是 `scripts/qa/run-npm-script.mjs --script build:mp-weixin:showcase`。
它如实回报 `DONE Build complete.` / `NPMSCRIPT_RESULT=OK`（退出码 0）。
但复量档位时三件事同时不对：showcase 目录 mtime 没变（还是 16:52）、三个标记符号仍然 0 命中、
而 mock 档**从嫌疑名单里消失了**。

盘上真相：

| 目录 | 事件 |
|---|---|
| `dist/build/mp-weixin`（mock 档） | 最新文件 00:22:04 —— 正是那次"成功"的 showcase 构建；`config/env.js` 变成 `VITE_API_MODE:"real"` |
| `dist/build/mp-weixin-showcase` | 16:52:47，一动没动 |

根因：`build:mp-weixin:showcase` 这条 npm 脚本**没有 `--outDir`**，uni-app 按平台默认写到
`dist/build/mp-weixin` —— 也就是 mock 档的目录。所以那次构建不是"构建失败"，
而是**构建成功、把另一档原地换掉了**，而且目录名还叫 mock。
仓里本来就有正确工具 `apps/client/scripts/build-showcase-isolated.mjs`（输出到 `mp-weixin-showcase`
并自检 `MODE == mp-weixin-showcase`）；real 档也早有 `build-real-isolated.mjs`。是我给 #54 写的腿用错了工具。

### 82.1 为什么"成功退出码"没拦住它

`run-npm-script.mjs` 的判据是"输出里出现 `Build complete|built in`"。这句话**只证明构建跑完了**，
不证明构建写到我要的那个目录。而档位新鲜度门当时只问两件事：产物字节新不新、包里没有那些标记符号。
它不问"这包是不是它名字所说的那一档"。于是覆盖发生的那几分钟里，
mock 档反而以"没有任何嫌疑"的姿态通过 —— 因为它真的比所有源码都新，只是**内容换成了 real 档**。

这正是本轮一直在抓的那类失败的第 N 次现身：一次成功的信号被当成正确的信号。

### 82.2 处置与加固

1. **已复原**：`build:mp-weixin:mock` 重跑完成（`MODE:"mp-weixin-mock" VITE_API_MODE:"mock"`），
   顺带让 mock 档吃进了本轮最新的 CAMPUSPOST-010 修复 —— 现在的实测是
   `isAllowedMediaExt mock=3 / parsePrivateQuoteContext mock=2 / pinnedNotice mock=2` 全命中，
   内容级"真过期=0"。#55（A 刀在最终 mock 档上重跑）的前提比之前更强，不是更弱。
2. **档位身份检查**（新）：`verify-band-freshness.mjs` 现在按名字核对产物自己的
   `VITE_API_MODE` 与 `MODE`，不符直接判红并说明"这个目录已被别的档位的构建覆盖"。
   负例现做：把 mock 标签指向 showcase 目录 ⇒ `VITE_API_MODE=real（应 mock）、MODE=mp-weixin-showcase（应 mp-weixin-mock）`，退出码 2。
   新鲜度问"新旧"，这一问问的是"是不是这一档"，两者不能互相替代。
3. **腿清单改对**：#54 的 `rebuild-showcase` 换成 `apps/client/scripts/build-showcase-isolated.mjs`，
   并在 `why` 里写明不能用那条 npm 脚本以及踩过的现场，避免下一轮又顺着名字捡回去。
4. 正在用 isolated 脚本重建 showcase；A 刀真实腿跑的是 `mp-weixin-real`（22:23 那一份），
   全程没被这两次构建碰过 —— 这点也是查了 mtime 才敢说，不是推断。

### 82.3 顺带量出来的一个真实待办

real 档现在比源码旧一处：`post-topic.vue` 的上传段修复（本轮改的）12/12 个字面量不在包里。
所以正在跑的 A-real 腿量的是**修复前**的 real 包（`real@f0677920`）—— 这是合法事实，但它绑的是那一份，
不能算作物本轮修复的复验；等这腿跑完要重建 real 档再复跑，这条已记进 #50/#55 的顺序里。

## 83 showcase 档重建到位；一条我自己误报的"开关没开"当场撤回

用 `apps/client/scripts/build-showcase-isolated.mjs` 重建成功，它自己就把"不许碰到共享输出目录"当成判据：
`[showcase] outDir=…\mp-weixin-showcase sharedOutUntouched=yes`、`产物自证 MODE=mp-weixin-showcase VITE_API_MODE=real VITE_SHOWCASE_MODE=true`。
复量三档：

| 档 | 三个本轮标记符号 | 内容级新鲜度 | 档位身份 |
|---|---|---|---|
| mock | 3 / 2 / 2 全命中 | 无嫌疑 | mock + mp-weixin-mock ✔ |
| real | 3 / 2 / 2 全命中 | post-topic.vue 12/12 缺失（我 00:2x 改的 CAMPUSPOST-010 修复没进包） | real + real ✔ |
| showcase | 3 / 2 / 2 全命中（原先是 0/0/0） | 无嫌疑 | real + mp-weixin-showcase ✔ |

顺带撤回一条我自己刚提出的怀疑。构建日志里印着 `feature-flags 产物里的初值：membershipEnabled:!1`，
我据此怀疑"showcase 档其实开不了会员，#43 拿它补那 17 条 VIP 用例的前提不成立"。
回盘查了链路再下结论：`config/feature-flags.ts:29` 那个 false 只是默认值，
`config/showcase.ts:64-71` 的 `applyShowcaseMode()` 会把四个开关全部置 true，
而 `main.ts:89` 在启动时确实调它 —— 所以运行时是开的，**#43 的前提仍然成立，我那条怀疑作废**。
（把它写下来而不是删掉：一次"看起来很有道理的前提崩塌"如果不是查了调用点就报出去，
下一轮就会有人照着去"修"一个不存在的问题。）

还欠的一件事记清楚：real 档现在比源码旧一处，因此**正在跑的 A-real 腿量的是 CAMPUSPOST-010 修复之前的 real 包**。
这不是脏数据，是一个合法的、要写进报告的绑定 —— 但它不能当那条修复的复验；复验要等这腿结束后重建 real 档再跑。

---

## §84 游客落点：从"手写的处置文字"改成有载具的裁定 + 三态复测腿（并立出一条真的产品缺口）

### 干了什么

round-7 游客刀 1107 行里有 **239 行**落在别的页上（26 组「声明页 → 实测落点」）。
之前它们的"处置"是 `triage-exec-failures.mjs` 里一张手写的 `LANDING_DISPOSITION` 表——
那就是"有人想过这件事"，不是"有一腿会替我们量"。现在换成三份物件：

| 物件 | 作用 |
|---|---|
| `scripts/qa/guest-landing-policy.json` | 26 组裁定（一页一行）+ 11 条 `anchors`（`file:line:needle` 三件套，逐条实测可核） |
| `scripts/qa/verify-guest-landing.mjs --mode book` | 组集与 policy **双向**核对、守恒、出具 `reports/audit/round-7/guest-landing-booked.json` |
| `scripts/qa/verify-guest-landing.mjs --mode measure` | 拿 UI 租约后逐页实测：清会话 → 开页 → 判定窗取栈顶 + 探针 → `guest-landing-measured.json` |

三态口径在 `scripts/qa/guest-landing-status.mjs`（纯函数，triage 门禁 import 它）：
`BOOKED`（有腿未跑）/ `MEASURED-DRIFT`（落点变了）/ `MEASURED-INVALID`（采样时不是游客）/
`MEASURED-FAIL`（跑了但判据不过）/ `CLOSED`。**除 CLOSED 一律算未结案。**

### 机制核到了行（这一步顺带推翻了一个没证据的归因）

这 239 行从前被写成"页内守卫或路由重定向"。源码事实：

- `apps/client/src/composables/usePageAccess.ts:79` —— 守卫对「无 token 的游客」**一律 return 放行**，
  它根本没有把游客送到登录页这条路径；
- `apps/client/src/services/http.ts:493-494` —— 真正把游客送走的是 **HTTP 401 兜底**：
  先 `showToast(apiErrors.loginRequired)`（游客无 token 专用文案，见同文件 473-482 的 `hadSession` 判定），
  再在 `LOGIN_REDIRECT_DELAY_MS = 500`（`constants/app.ts:40`）之后 `uni.reLaunch(ROUTES.LOGIN)`。

⇒ 判定窗按载体取 2500ms / 复采 4500ms，而不是拍一个 500ms。
⇒ VIP 那 3 组是**另一回事**：`subpackages/vip/index.vue:50` 是 `featureFlags.membershipEnabled` 为假时
`switchTab` 到我的页（`:63`），与身份无关 —— real 档恒关、showcase 档恒开。

### 由此立出来的一条真缺口：MP-R7-GUEST-LANDING-REGENTRY-001（P2 · 待修复）

裁定是「游客不得浏览，未登录必须引导到注册」。落点对了，引导链没对：

- 游客被弹到的 `pages/login/index` 默认走 `login/index.vue:604` 的 `.login-quick` 分支（微信一键登录 / 手机号快捷 / 游客体验三个按钮），
- 「去注册」实体在 `:688` 的 `v-else` `login-form` 分支里的 `:745-752`，还额外受 `isRegisterOpen` 开关控制（`:746`）。

⇒ 一个没有账号的新用户被弹过来时，**在这个页面上看不见任何注册入口**，要先点一次「手机号登录」。
判据成立、产品未修，这就是本轮范围内该被清掉的那类条目。
修法写进台账了：在 `.login-quick` 加 `.login-register-entry`，复用既有文案键 `login.goRegister`
（`zh-CN.ts:2197` / `en-US.ts:2140`），不新增文案、不动业务分支。
**sequencing：等 A-real 腿收尾后与 real 档重建一并做** —— §82 那次教训就是"腿在跑的时候动客户端源码"。

### 一条判据被载具挡回去了（写下来防止它换个壳回来）

游客落地时产品确实弹了 toast（`apiErrors.loginRequired`「请先登录后再使用该功能」），
但**本轮 1107 行 exec 记录里 `toast` 字段恒为空** —— 这个载具量不到 toast。
所以复测腿的判据只断言：落地 route、`.login-page__brand:present`、`.login-register-entry:present`、
以及采样时 `verifyLogin === not-logged-in`。把 toast 写进判据 = 造一条永远不会成功的检查。
（`verify-guest-landing.mjs` 里有这条否决：exec 语料 toast 全空时，criterion 里出现 toast 直接判红。）

### 门禁自检与"绿变红"的账

`scripts/qa/test-guest-landing.mjs`：**18 条断言全过**（`GL_TEST=PASS`），
含 5 个"必须红"的注入：新落点无裁定 / 失效裁定 / 空集 / 锚点行漂移 / guardCaseId 撞号 / policy 无 anchors，
以及三态各自的单测（`探针答 ERR` 也必须算不过 —— 不许把"探针坏了"折成 absent）。

**本轮因此丢掉的绿，逐条交账（不是门禁抽风，是我把一条假的收紧成了真的）**：

| 变化 | 原因 |
|---|---|
| `landingMissing` 3 → 0 | 26 组全部有具名复测腿入账（`TRIAGE_RESULT` 从"没处置"这一类问题里摘出来了） |
| 未结案落地对 23 → **26** | VIP 三组从前写的是「权益重定向…由 showcase 带腿复测」（无"未结案"前缀 = 记成已处置）。但 showcase 那条腿量的是 **A 身份**，游客落点从来没测过。换成账本口径后它们如实回落到 `BOOKED` |
| `TRIAGE_RESULT=FAIL problems=1` 仍在 | DC33 @ pages/discover/index 那条 2958B 的帧（任务 #58）—— 这条是真洞，留着 |

### 顺手补的第二个载体：`scripts/qa/admit-ledger-row.mjs`

立台账行这件事以前只能手改 markdown，坏点固定在三个：列数不对、ID 撞号、status 不在词表。
现在插入前逐条断言（词表从 `normalize-ledger-status.mjs` 的 `VOCAB` 里**读**出来，不抄第二份），
写盘前后各数一次主表行数守恒。干跑时就抓到一件事：主表其实到第 188 行就结束了，
后面 `## 二`、`## 四` 是另外两张表 —— 手改很容易把行插进隔壁口径里。
落盘后 `verify-ledger.mjs reports/audit/round-6` = `LEDGER_RESULT=PASS`、`DATA_ROWS=233`、`OFF_SCHEMA=0`、`STATUS_VOCAB_BAD=0`。

（我自己的调用错也记一条：`verify-ledger.mjs` 的轮次是**位置参数**，缺省 `reports/audit/round-2`。
第一次裸跑它扫的是 round-2，于是打出 `LEDGER_SHAPE_VACUOUS=1 / 表头缺失` 的假红 ——
那不是台账坏，是我拿错了范围。这条与 memory 里「verify command output, not exit code」是同一类坑。）

---

## §85 A-real 腿收口 + 两处客户端修复（判据先行）+ 一次锚点自捕

### A-real 腿（real@f0677920）跑完了

1107 行 = EXECUTED 822 / SKIPPED 236 / FAILED 49。
这一腿绑的是 §83 公开过的那份"比源码旧"的 real 包，所以它**不能**当两处本轮修复的复验；
它的 1107 行仍然是"真实档 A 身份"唯一一份整轮执行证据，报告里按 `band=real@f0677920` 引用。

跑完后 triage 抓到三件事，都是载具问题而不是产品问题：

1. **词表又漂了**：执行器新增口径 `落点探针没给结果（routeStack 取空/超时）⇒ …答案无法归属，待重跑`
   （集中在 pages/register/success 一批）。已补具名桶 `SKIPPED-route-probe-no-answer`。
   它不能并进 `FAILED-landing-guard` —— 那是拿"没量到"冒充"量到了别的页"。
2. **我自己那条新断言造了三条假红**：`coverMismatch`（复测腿账本成员 vs 本轮实测成员）跨身份比了。
   账本绑的是游客档那 239 行；A 档在 VIP 三页上同样落 pages/profile/index，但那是**另一批行**。
   ⇒ 账本每行加 `identity`，比较前先对齐身份；现在打 `COVER_SKIP` 而不是判红。
   同一条断言在游客语料上仍然生效（guest vs guest 才比），没有因此变松。
3. **2 条新证据缺口**：REG29 / REG36 @ pages/register/index 要求出帧但帧未成立。
   与 DC33 一起留给帧阶段（#58 扩成三条）。

### 两处客户端修复（判据先立，代码后补）

| 条目 | 改动 | 判点载体 |
|---|---|---|
| MP-R7-GUEST-LANDING-REGENTRY-001 | `pages/login/index.vue` 的 `.login-quick` 默认分支加 `.login-register-entry`（复用 `login.goRegister` 文案键与 `goRegisterPage`、`isRegisterOpen` 开关，不新增文案、不新增 CSS —— 直接挂现有 `.btn-text`） | `verify-source-shape.mjs` 4 项（含 `v-if="isRegisterOpen"` 计数 1→2、`@tap="goRegisterPage"` 计数 1→2）+ 游客落点 measure 腿的 `.login-register-entry:present` |
| MP-R2-PAGES-MESSAGES-INDEX-020 | 删掉 `onShow` 里那次无条件 `markAllSessionsRead()`。实测 `loadPage` 在 `!isUnlocked` 时 early return（:294），:304 那次在数据加载完成后才执行 ⇒ onShow 这次是"内容没看到就把未读清掉"的另一半 | `verify-source-shape.mjs` 把该行的判点从 1 项扩到 3 项（`countEq` 调用次数 = 1） |

顺序是**先写判点、再改代码**：两条新判点在改代码前实测不过（`SRC_SHAPE total=53 成立=51 不成立=2`，
红的两条正好是这两个），改完变 `成立=53 不成立=0`。这样"判据成立但未修"是当场量出来的，不是我事后叙述的。

顺带核实：全仓测试里没有任何 spec 引用 `markAllSessionsRead` ⇒ 这次删除不会打掉一条既有单测（也没给它补一条假单测）。

### ④ 的裁决又落了一批（6 行），并且都带测量

`ledger-plan-rulings4.json` + `ledger-plan-rulings5.json`，共 9 格 cell patch：

- **MP-R2VIS-PAGES-HOME-INDEX-004**：判据的"同色"半段实测不可达 —— 素材 `static/assets/icons/common/refresh.svg` 的描边烧在文件里（`stroke="#94A3B8"`），`--c-text-tertiary` 实测 `#6B7571`（`design-variables.scss:118/357`），且微信 `<image>` 引用 svg 不参与 CSS 继承。裁定：判据只要求"换 SVG + 同字号"，同色半段摘掉并留这条测量；不采内联方案（绕开 `resolveMediaUrl` 统一出口，且内联 svg 真机渲染未取证）。
- **MP-R2-POST-016**：要删的高度声明在基线 094f7239 里就不存在（`git log -S` → f9a60925）⇒ 改判「本轮前落地」；"极旧内核要不要百分比撑高"按可辩护默认判**不做**，并写明推翻它需要什么证据（支持矩阵文档 / 构建目标 / 用户侧条目，三者本轮都没有）。
- **MP-R2-PAGES-NEARBY-INDEX-011**：判据原句"页根容器上内边距取零"是误读简写 —— 盘上 `nearby/index.vue:659` 是 `padding: 24rpx 32rpx 0`，末位 0 是**下**内边距。裁定保留 24rpx 顶边距（安全区避让与内容留白不是同一个量）。
- **MP-R2VIS-PAGES-MESSAGES-INDEX-005**：原判据"只加种子不碰 store 逻辑"实测不可行（`MessageDashboardView` 五块全必填；`warmPeople` 是 `MessageDashboardService.java:44` 从 conversations **派生**的，不是种子字段）⇒ 删句，剩余半段去向 `needs_backend`，状态如实留在待修复。
- **MP-R2-CIRCLES-INDEX-007**：A/B/C 三案逐条按盘上事实否掉（A 要自创暗值、B 语义错位且改视觉、C 是改色不是转令牌，超出本行授权）⇒ 保持现值，把"要不要给 hot-badge 一套令牌"升为**设计需求**，不记缺陷也不记已修。
- **MP-R2VIS-PAGES-PROFILE-INDEX-003**：四处锚点与基线逐字节相同 ⇒ 「本轮前落地」；范围外的 `MyStory.vue:59`（注释）与 `:93`（用户可见文案）记观察项，改文案要产品给口径且 zh/en 同批。

`verify-ledger.mjs reports/audit/round-6` 每次改完都跑：`LEDGER_RESULT=PASS`、`DATA_ROWS=233`、`OFF_SCHEMA_ROWS=0`、`STATUS_VOCAB_BAD=0`。

### 门禁当场逮到我自己的改动（这条最值得记）

改完登录页之后 `verify-guest-landing.mjs` 立刻红两条：

```
✗ 锚点不可核：行漂移 apps/client/src/pages/login/index.vue:688 里没有「class="login-form"」
✗ 锚点不可核：行漂移 apps/client/src/pages/login/index.vue:746 里没有「isRegisterOpen」
```

——我往同一个文件插了 13 行，把**我自己上午刚核过的两个锚点**顶走了。
这正是 `anchors` 要 `{file,line,needle}` 三件套而不是写一句散文的原因：
行号一漂，判据不是"变得不可信"，而是**当场不可用**。
已把锚点跟到新行号（688→704、746→762），`markers.registerEntrySource` 那句
"该分支内目前没有任何注册入口节点"也一并改掉 —— 它已经被我自己的修复证伪了，留着就是假证据。
负例自检同步复跑：`GL_TEST=PASS 18/18`。

### 全量单测：一红一绿两轮，差异**没有**被解释成"负载"就完事

`vitest-after-client-fixes.log`（05:56Z 那份）记的是 `1 failed | 1307 passed`，
失败项 `src/tests/ws-store-dispatch.spec.ts`；本轮重跑（01:12Z）= `115 files / 1308 tests` 全绿。

我一开始想把这一红归因成"与 UI 腿抢 CPU 的负载假红"。**当场自查否掉了这个说法**：
01:12Z 那次全绿的运行恰恰**也是**在 A-real 腿跑动时重叠发生的（腿 01:16Z 才结束），
所以"有负载 ⇒ 假红"这条因果被我自己的数据推翻了 —— 两次的差异另有原因（用例间状态污染 / 顺序相关），
而它现在**不可复现**（单跑 7/7 过，整轮重跑也全过）。

记下来的结论有两条：
1. 通过数依赖执行顺序这件事本身就是一个载具缺陷，`1308/1308` 不能当"稳定真值"引用；
2. 终报里的单测数字必须是**在没有任何 UI 腿并发时**重跑的那一次 —— 本轮队列跑完后我会单独重跑一次并以此为准。

（这条与 memory 里那条"失败的预测是一次发现，不是一条要改写的记录"是同一类：
我没有把 05:56 的红抹掉，而是把它留在这里，并写清楚它现在为什么不成立。）

### 另一条自我更正（引证必须是本会话量到的）

POST-016 那格我第一次落账时写了「git log -S 指向 f9a60925」——那是从 `frame-debt-triage.json`
**继承**来的说法，我当时没复现。随后我用一个自己编的 needle（`height: 320rpx`）去查，查不到东西，
这才承认"我引了一条我没量过的证据"。改法：换成两条本会话跑出来的测量 ——
`git diff -U6 094f7239 -- post.vue` 里高度相关改动只有底部栏那一处（别的条目），
图块 `.post-images` 整段不在 diff 内；基线同段只有 `width: calc(...)` 与 `aspect-ratio: 1`。
`f9a60925`（2026-09-26，round-6 收尾）现在只作为时间线佐证，不再充当判据。
落账：`reports/audit/round-7/ledger-plan-post016-fix.json`（1 格），复跑后台账仍 `LEDGER_RESULT=PASS`。


### 队列（无人看守串）

`scripts/qa/ui-queue.round7-final.json` 11 腿已启动（01:29:37 起，out=reports/audit/round-7/ui-queue-final）：

```
rebuild-real → rebuild-mock → rebuild-showcase → gate-band-freshness-all → gate-source-shape
→ measure-guest-landing → exec-A-mock-final → exec-guest-real-final
→ gate-frame-debt-triage → shoot-frameplan-final → close-out-open-window-mock
```

前置核实：8080 在听（`/v1/health` 返 401 = 服务活着且该端点受保护），UI 租约 `heldLeases()=[]`。
遗留一件已识别但**不在本轮队列里**的欠项：A 身份 × real 档 整轮绑的是修复前的包，
两条修复的复验走"定向切片重跑"（49 FAILED + CAMPUSPOST-010 所在 manifest）而不是再花 1.5 小时整轮，
等这两处修复进包后安排。

---

## §86 落点复测腿第一次跑通：26 组里 25 组结案、1 组量出稳定的错误落点

### 第一次 measure 腿死于我漏排的一步（不是产品问题）

`ui-queue.round7-final` 第一阶段：`rebuild-real / rebuild-mock / rebuild-showcase / gate-band-freshness-all / gate-source-shape` 五腿全 OK，
但 `measure-guest-landing` 在**第一页**就死在 `automation_evaluate` 传输层超时（重试 3 次全 timeout），queue 记 `FAIL / NOT_RUN=5`。
根因不是通道坏：**三条重建腿刚把产物换掉，模拟器窗口里跑的还是换字节前的那一版**，桥接不上新产物。
诊断方式是不信队列、单独手跑一次 `open-project-window.mjs --project …-real`，它回 `type:reuse / probe route=pages/discover/index / OPENWIN_RESULT=OK`
——窗口活着、evaluate 也活着，唯一的差别就是"产物换过之后没人重新把窗口落上去"。
⇒ 队列里补了三条窗口腿（real→mock→real→mock，每条带 `--settle 24`），并把这条经验写进 legs 文件的 `why`，
下一轮不必再拿一整条腿的失败去换这个认知。

### 落点复测结果（26 组 × 每页清会话→开页→取栈顶+探针）

`reports/audit/round-7/guest-landing-measured.json`：

- **CLOSED = 25**：22 组内容/个人数据页全部按裁定落 `pages/login/index`，且 `.login-page__brand:present` **并且** `.login-register-entry:present`
  （注册入口在默认态就露出来了 = §85 那处修复在真产物上量到了）；3 组 VIP 页落 `pages/profile/index`（功能开关弹回，与身份无关）。
- **MEASURED-DRIFT = 1**：`subpackages/discover-extra/discover/matching` 落的是 `pages/discover/index`，不是裁定的登录页。
- 26 行 `verifyLogin` 全部 `not-logged-in` ⇒ 这批落点没有一行是"身份不成立时量出来的"。

漂移那组没有当成噪声放过，也没有当成"裁定写错"改掉 —— 先定性再落账：
`--only GG-discover-extra-discover-matching --repeat 3` 连测三次 **落点一致**（`guest-landing-drift-recheck.json`），
所以它是稳定行为，不是竞态。机制查到了行：`matching.vue:56-69` 的"无卡片兜底"会 `uni.switchTab(ROUTES.TAB.DISCOVER)`
把人送进寻觅 Tab，而 `http.ts:493-494` 的 401 兜底送登录页 —— **两条重定向在抢同一个入口**。
23:57 那把刀该组 20 行全落登录页，修复后重建再测就稳定落到寻觅 Tab 了。
⇒ 立新行 `MP-R7-GUEST-MATCHING-REDIRECT-RACE-001`（P2·待修复，用 `admit-ledger-row.mjs` 落的：第一次干跑被自己的列数断言挡下 —— 我漏写了「理想图依据」那一格，10 列 ≠ 11 列，这类断言存在的意义就是这一刻）。
结案条件写死：measure 腿那一组从 `MEASURED-DRIFT` 转 `CLOSED` 且连测一致，才算这条判据过。

### 台账当前口径（每次动完都复跑 `verify-ledger.mjs reports/audit/round-6`）

`DATA_ROWS=234`（本轮新增 2 行：REGENTRY-001 与 MATCHING-REDIRECT-RACE-001）、`OFF_SCHEMA_ROWS=0`、`STATUS_VOCAB_BAD=0`、`LEDGER_RESULT=PASS`。

### 正在跑

`ui-queue.round7-final2`：drift 复测腿 OK → mock 窗口腿 OK → **exec-A-mock-final（1107 例，绑重建后的 mock 档）** 于 01:50 开跑，
其后依次是 real 窗口腿 → exec-guest-real-final → gate-frame-debt-triage → shoot-frameplan-final → 收口窗口腿。

---

## §87 ④ 现在有一条会红的门（以及我第一次写出的"假负例"）

`scripts/qa/verify-rulings-landed.mjs` 把 ④ 的四项各绑一个可机检判据：

| 项 | 判据 |
|---|---|
| 登录页已登录落地页 | 台账行 `MP-R6REAL-PAGES-LOGIN-INDEX-001` 行内必须有带日期的裁决句 + `pages/login/index.vue:8x` 源码锚点 |
| ChatInput.vue 去留 | 行 `MP-R2VIS-COMPONENTS-CHAT-CHATINPUT-A01` 必须有裁决句 + `git ls-files` 这个可复现核对动作 |
| GATES.json 载体重写 | `schemaVersion=gates-2` + `gitSha` 是运行期 `git rev-parse` 取的（不许写死 HEAD）+ 带 `verify-backend-restarted` 前置件指针 |
| 遗留测试数据处置 | `dbWriteDisclosure` 在 + `newDbKeysThisRound` 至少 4 类且逐类是非负数 |

结果：`RULINGS_RESULT=PASS 四项都有可重跑判据背书`，且已接进报告面板
（`emit-round-report.mjs` 里新增 `G.rulings` 与 `G.guestLanding` 两条门，不再"建了没人跑"）。

**我自己写的第一版里有一条假负例。** `--selftest` 想验"裁决日期被抹掉时门必须红"，
但它改的是**整份台账文本的第一处日期**（`replace(/裁决\s*2026…/) ` 不带 /g），
而台账里带日期的裁决句有十几条 —— 那一枪打在别的行上，判据当然还绿，负例就"永远不红"。
第二版又漏了一次：改成 `judge(items, text)` 之后调用点没把 `tamperedLedger` 传进去，
`text || ledgerText` 于是回落到真台账，症状一模一样（NEG 一直 ✗）。
两处都修了，现在是 `破坏样本=6 没红=0`。

教训写成一句话：**"我加了一条负例"不等于"这条负例测到了它声称的东西"**；
负例必须检查"它自己是否可失败"，否则它比没有负例更糟 —— 它会让人以为这块有覆盖。

另记一条读法上的坑：执行轮头部现在写 `band=mock@f1c7b96b`，
但档位指纹只哈希 `config/env.js`，**同配置的多次重建会得到同一个 sha8**。
这次 mock 包在 01:30 重建过（含两处客户端修复），sha8 却和旧 A 刀一样 ——
所以"产物是不是新的"不能看 band，只能看 `gate-band-freshness-all`（它比 mtime + 新增字面量）。
这条限制在 §82 那档事故里就该更醒目地写出来，这里补上。

---

## §88 ②「37 条判据含糊」的尾巴：把 6 行抠成可判物件，其中 4 行当场分出真/伪归因

台账未结案从 **19 降到 14**。做法是逐行回到源码，而不是回到旧结论。两个只读研究 lane 先量，
我再独立复核每条关键行（`fixtures.ts:1460/:1131`、`register/index.vue:114-122`、`hub.vue:283-284` 对基线 291、
`NotLoggedWaiting.vue:62-66`、`profile/index.vue:694/:758`、`messages/index.vue:542/555-561/571-573`）。

判点全部进 `verify-source-shape.mjs`：`total=59 成立=58 不成立=1`（红的只有 `MP-R2VIS-PAGES-MESSAGES-INDEX-004`，
它红是**正确状态**——整图海报还没拆，判据不放宽）。收紧结果分四类：

| 类 | 行 | 量出来的东西 |
|---|---|---|
| 真·本轮修复 | MESSAGES-INDEX-009 | 免打扰图标从时间行移进昵称行：三条判点在基线 094f7239 上是 `0/0/1`、现状是 `1/1/0` ⇒ 归因是量出来的；帧侧永远分不出父子，这条终于不需要人判 |
| 本轮修复（代码） | HOME-INDEX-112 | `fixtures.ts:1460` 双层 `resolveMediaUrl` 抵消了 R13 的真实构建修正（`media.ts:180-190` 会把带前缀的路径再改写回 `/static`），已改回裸终路径；台账原判的对比行 `:1155-1163` 是 `nearbyPeople` 的裸 `avatarUrl`，与嵌套无关 |
| 本轮前落地（不记账） | REGISTER-INDEX-009、CAMPUS-HUB-011、PROFILE-025 | 三行在基线上就已全绿：`isAdult` 的整串 UTC 解析病灶在任何可达版本都不存在（台账 :103-109 其实是 phoneRaw/phoneValid/today）；hub 的 key 早在 `f9a60925` 收敛为 `school.id`（旧写法只在 `874ff52f:284`）；profile 两处访客取值与基线逐字节相同 |
| 判据不可满足（改状态，不改口） | VILLAGE-PUBLISH-001、VILLAGE-DETAIL-001、MESSAGES-004 | publish 的「已达一致」半段量掉（两处都走 `POST_MAX_IMAGES`），剩下缺的是提示元素与文案的产品口径 ⇒ 转 `未取证/需裁决`；detail 的遮挡是几何量，转成「真实档两态帧 + 间隙量测」，并纠正它那条**写坏的选择器**（`.comment-item.comment-reply-btn` 两个类分属 :968/:1014 两个元素，正确是后代形式）；MESSAGES-004 的正半段要 avatar 数据源与设计口径 ⇒ 明确写「不许放宽成整图也算」 |

三条测量纪律在这批里各挡了一次错：

1. **归因要靠基线对照**。判点绿不代表本轮修的；`git show 094f7239` + 同组正则重跑是唯一硬证据（PROFILE-025 三条全绿但基线也全绿 ⇒ 不能记账）。
2. **判点必须能红**。研究 lane 交了变体测试（把 `:758` 改回反向优先级后三条里两条转红），并主动放弃一条在变体下仍绿的计数判点 —— 永真判点比没有判点更坏。
3. **`||` 不能进台账格**。第一次批量落账被 `patch-ledger-cells` 的竖线守卫拦停（DETAIL-001 那格引用了模板条件 `!!replyingTo || commentImages.length > 0`），改成中文连接词后才落盘。这正是本仓把「机器解析的表格里写 shell」列为反复出错项后，守卫第一次替我拦住。

一个已知覆盖冲突先记在这里：`verify-source-shape.mjs` 非干跑时会把它生成的通用 6/9 格
（`源码判点：<claim> ｜承载 <file>`）再打一遍，会盖掉我在 `ledger-plan-twopredicates.json` 里写进 9 格的基线数字。
 durable 记录以该计划文件与本节为准；终报落账顺序是"先通用判点补丁、后本批人工补丁"。

行内旧行号一并纠正了 12 处（`publish.vue:792→794`、图格区 `785-795→786-797`、预警类 `779-781→782`、
预警样式 `1071→1079`、`detail.vue` 预留 `1617→1621-1622`、输入栏 `2913-2923→2929`、`hub.vue:293→284`、
`messages` 昵称行 `541-559→542-561`、时间行 `570-573→571-573` 等）—— 行号漂移本身不是错，
**照抄漂移后的行号当证据才是**。

## 89 一条假账的来历：截断读数的 `slice(0, 14)`（2026-09-27 03:0x）

这一节记的是一件比"修了什么"更要紧的事：**台账 24 行那条 `needs_backend` 是我自己造出来的**，
而它活了整整一轮没人发现，因为把它造出来的那行代码看起来只是在"打印证据"。

### 89.1 判据台怎么错的

`scripts/qa/g8-e2e.cjs` 的 RING6 名字叫「计数客户端↔后台一致」，但它的 ok 条件只有
`cm.status < 300 && lk.status < 300` —— 两条写操作的 HTTP，跟"一致"没有任何关系。
evidence 串里那半句 `Object.keys(aRow).slice(0, 14).join(逗号)` 被当成"顺手把后台字段集也打出来"，
而 `AdminVillagePostDetailView` 有 **27 个分量**，`likesCount`／`commentsCount` 排在第 18、19 位，
正好被截断切掉。于是那行打印长这样：

`后台字段集=id,authorId,authorNickname,authorAvatar,title,content,images,tags,category,status,auditStatus,visibility,circleId,auditRemark`

15 个、以 `auditRemark` 收尾、一个计数都没有。我当时把这句话**逐字抄进台账 24 行的处置列**，
配上"与之一字不差"，判成 needs_backend 挂账。**截断比空读数危险：空读数会逼我去查，
截断读数交出一个看起来完整的答案。**

### 89.2 反证怎么做的（载具都可重跑）

新建只读探针 `scripts/qa/probe-admin-post-counts.mjs`（只 GET、不写库，所以在游客刀正在读广场的时候也能跑）：

- 第一次跑**当场红**：`HTTP 422 缺少 Idempotency-Key 请求头` → 探针没有令牌就 `PROBE_RESULT=FAIL`，
  没有拿"读不到"去反推"字段不存在"（这正是我上一版犯的错的方向）。补上幂等头（同 `g8-e2e.cjs`）后重跑：
- `post=270 HTTP=200 字段数=27 计数类字段=likesCount,commentsCount 值={"likesCount":1,"commentsCount":1}`
- `post=236 HTTP=200 字段数=27 计数类字段=likesCount,commentsCount 值={"likesCount":1,"commentsCount":1}`
- 读数落盘 `reports/audit/round-7/admin-post-counts-probe.json`

源码侧与之一致：`AdminVillagePostController.java:857-885`（详情 record 第 18、19 分量）、`:787-810`（列表 record 同样带）、
`:71`（`@RequestMapping("/api/v1/admin/forum/village-posts")`，和环里请求的路径是同一个）；
`git diff 094f7239..HEAD` 对该文件**为空** ⇒ 不是本轮谁改好的，是这条账从立案起就判错了对象。

### 89.3 环怎么补的（并且证明它能变红）

RING6 判点换成抽出来的纯函数 `countsParity(clientCounts, aRow)`：两侧都必须**读到数值**且同名同值才 OK，
任一侧读不到 ⇒ 判点不可判、按不通过处理（不许拿 HTTP 200 顶包）；字段名两侧拼写不同（客户端 `likeCount`、
后台 `likesCount`）所以按候选名收，不猜某一个。evidence 不再截断，改打字段总数。

判点抽成纯函数就是为了 `node scripts/qa/g8-e2e.cjs --selftest`：六条样本
（两侧同值=成、后台缺评论计数=不分成、数值不等=不分成、客户端 0 而后台缺字段=不分成、后台空体=不分成、
客户端字段是字符串=不分成）实测 `G8_SELFTEST=PASS cases=6`，三条变异体（`sameCount` 永真、
`numOf` 缺字段补 0、不读数即通过）分别把样本打到 `bad=1/2/5` 全红 —— 这条环现在是**有能力红的**。

### 89.4 翻案之后剩下的真缺口（已落地，待复验）

后端不缺字段，但**后台列表页确实少一列**：`apps/admin/src/views/forum/VillagePosts.vue:457-461` 的 stats-cell
只有 赞／藏／看 三枚，`zh-CN.ts` 的 `villagePosts` 段（1137 起）没有 `statsComments`（同仓 `posts` 段 1081 有，但无人消费），
en-US 同样缺。本轮补齐：模板加第二枚 span（`villagePosts.statsComments`, `post.commentsCount ?? 0`），
两个语言包成对加 `statsComments`（zh「评 {n}」／en「C {n}」，沿用该段既有的单字风格）。

`apps/admin` 的 typecheck 走 `run-npm-script.mjs` 判 OK；机器判点
`MP-R7-ADMIN-VILLAGE-COMMENTSCOLUMN-001` 进 `verify-source-shape.mjs`（模板两处 + 两个 locale 各一处），
本轮实测 `SRC_SHAPE total=61 成立=60 不成立=1`（唯一不成立仍是 MESSAGES-INDEX-004，属待裁决）。
台账新增同号一行 `已修复待复验`，**不复验完不结案**：后台是 Web 页，本轮 DevTools 载具只覆盖小程序，
所以它还欠一帧真机截图 + G8 RING6 重跑；24 行本身改判 `判据不成立`，反证链三件（运行态／源码／成因）写在 statusEvidence。
`verify-ledger` 复跑 `DATA_ROWS=235 OFF_SCHEMA_ROWS=0 STATUS_VOCAB_BAD=0 LEDGER_RESULT=PASS`。

### 89.5 顺带修掉的载体缺陷：`run-npm-script.mjs` 的成功判据

它原本对所有脚本要求输出里出现 `Build complete|built in`，于是
`typecheck = vue-tsc --noEmit` 干净通过时（60 字节输出、退出码 0）被报成 FAIL ——
**这是判据不能表达该脚本形态，不是类型检查坏了**。改成按 package.json 里那条命令本身推形态：
`uni build --platform|vite build|build-real-isolated` → 必须命中构建标记；
`--noEmit` → 退出码 0 且输出里没有失败证据；**认不出来的一律 UNREGISTERED 直接 FAIL**
（第一版我把默认写成宽松档，`--selftest` 里那条 classify 样本立刻退化成永真断言，删掉整条规则它仍绿；
所以默认必须朝严格一侧倒）。`node scripts/qa/run-npm-script.mjs --selftest` 现 8 条样本全过，
五个变异体（丢 mp-build 档、失败证据正则永空、UNREGISTERED 放行、标记判断永真、忽略退出码）实测全红。
实测结果：`apps/client` 与 `apps/admin` 两侧 typecheck 都 `NPMSCRIPT_RESULT=OK class=silent-check`。

### 89.6 A 刀收工与分诊守恒

`exec-A-mock-final`（mock 档、身份 A）跑完：`executed=650 failed=43 skipped=414`，**1107 守恒**。
`triage-exec-failures` 对这轮的读数 `rows=1107 unclassified=0 TRIAGE_GATE=PASS`，
43 条 FAILED 全部落在 `FAILED-landing-guard`：26 条 `pages/login/index`（已登录访问登录页被弹到寻觅，
= ④ 第 1 项已裁的有意行为）＋ 17 条 VIP 三页（`membershipEnabled=false` 的开关弹回 profile，
= `guest-landing-policy.json` 的 `flag-bounce` 家族）。`COVER_SKIP` 三条是身份档位差异
（账本绑 guest 行、这份语料是 A 行），按落地对仍照账本处置，不冒充成员级覆盖。
真实档游客刀 `exec-guest-real-final` 此刻仍在跑，所以本节里所有"重建后"的复验都排在它之后。

## 90 两份词表各写各的，和一个"报了拒绝却已经把动作做完"的工具（2026-09-27 03:1x）

补后台文案的时候顺手把立账工具用了一遍，结果连着翻出两件我自己的载体缺陷。**这两件都比那两条文案要紧**，
因为它们会让"台账是干净的"这句话失去意义。

### 90.1 现象：admit 报 FAIL，行却已经进去了

给 `MP-R7-ADMIN-I18N-MISSING-COMMON-001` 立账时，status 我写的是 `已修复（源码级判点＋运行时键解析判点：…）`。
`admit-ledger-row.mjs` 打的是：

```
ADMIT_RESULT=FAIL problems=1
  ✗ status「已修复（源码级判点＋运行时键解析判点：判据是「页…」不在受控词表里（词表 13 档）
```

但同一时刻 `verify-ledger` 报 `STATUS_VOCAB_BAD=0 LEDGER_RESULT=PASS`，而 `grep -c` 那一号 = **1**。
也就是说：**它已经把那行插进台账了，然后才打印拒绝**。查代码是 `if (APPLY) { …writeFileSync… }` 排在
`if (errs.length) { …process.exit(2) }` 前面 —— 只有"插入后行数守恒"那一条挡在写盘前，形状/词表/撞号三条都没挡。
一个拒绝过 Yet 已执行的工具比一个直接红的工具危险：它交付的是"我以为没落账"的假干净。

修法是把 errs 判空挪到写盘之前，并**当场做一条负例证明它拦得住**：造一行 status 越界的
`MP-ZZ-NOT-A-REAL-ID-001 --apply` → `ADMIT_RESULT=FAIL problems=1（未落盘）`、
台账里该号出现次数 `0`。这条负例以后每次动这个工具都该重跑一遍。

### 90.2 根因：受控词表有两份，各写各的

- `normalize-ledger-status.mjs` 里是**数组** `VOCAB`（13 档），`admit-ledger-row.mjs` 用正则截出来 `JSON.parse` 后按 `startsWith` 判；
- `verify-ledger.mjs:317` 里是**另一条正则** `/^(待修复|已修复待复验|待复验|已修复|保留-判据不成立|…)/`，**含 `已修复`**。

判点台 `verify-source-shape.mjs` 往 status 列写的正是 `已修复（源码级判点：…）`，台账里这样的行有 **85 条**。
于是数组那一侧认不下它们：`admit` 会把合法写法判越界，而 `normalize-ledger-status` 的入口判空
（`if (!VOCAB.some(t => v.startsWith(t))) bad.push(...)`）会把这 85 行**当成待归一的坏值**送进分组逻辑，
按后面的散文正则走一遍 —— 最坏情况是被塞进 `需裁决`。今天没出事，只是因为那条归一化一直没 `--apply`。
这正是记忆里那条"同族豁免被自己的规则反掉 / 两份守卫实现漂移"的又一次重演。

修法：数组补 `"已修复"`，并且**必须排在 `"已修复待复验"` 之后**（`VOCAB.find(t => prose.startsWith(t))` 取第一个命中，
顺序反了就会把"待复验"的行读成"已修复"，那等于把欠的复验洗成结案）；注释写在数组**外面**——
数组里塞 `/* */` 会让 admit 那句 `JSON.parse("[" + inner + "]")` 当场炸（本轮踩到，改完立刻实测才敢用）。

改前后各量一遍（不量就不算交代）：
- `normalize-ledger-status`（干跑）：`STATUS_NORM 待归位=0`（改前按那份数组判，85 行都是"坏值"；改后 0 行）；
- `verify-ledger`：`DATA_ROWS=236 OFF_SCHEMA_ROWS=0 STATUS_VOCAB_BAD=0 LEDGER_RESULT=PASS` —— **没有丢任何既有绿**，
  只是不再把 85 行合法写法当异常；
- `admit` 现在报 `词表=14 档`，负例（90.1）仍红。

同一件事的另一半也本轮落地了：**`verify-ledger` 那侧的正则改为由这份数组生成**（单一来源），
读不到来源时**不退回旧正则、整体判红**。实测两件事：
①正常路径 `LEDGER_VOCAB_SOURCE=normalize-ledger-status.mjs 档数=14` → `STATUS_VOCAB_BAD=0 / LEDGER_RESULT=PASS`（与改前一致，没丢绿）；
②把来源路径改成不存在的文件（在 `scripts/qa/` 里放临时副本跑，保证 REPO_ROOT 解析一致）→
`LEDGER_VOCAB_SOURCE=UNREADABLE` 且 `STATUS_VOCAB_BAD=237`、`LEDGER_RESULT=FAIL` ——
这条新分支是**有能力红**的，不是"读不到就当没事发生"。临时副本已删。

### 90.3 顺带量到的后台文案面（47 视图 / 1424 键）

新判点 `scripts/qa/probe-admin-i18n-keys.mjs`（把两份 locale 用 TypeScript 编译器转 CJS 后在 vm 里跑成对象，
按点号路径逐个解析，并比对 `{n}` 占位符集合）第一次全量跑：

- `--all`：`ADMIN_I18N_VIEWS=47 KEYS=1424 BAD=2` ⇒ 只有两把键缺，且**两份语言包都缺**：
  `common.view`／`common.empty`，都在 `apps/admin/src/views/content/Whispers.vue`（:95 的「查看」按钮、:101 的空态）。
  vue-i18n 取不到键**不报错**，只把 key 原文画出来 ⇒ 那页会直接显示字符串 `common.view`。
- 处置：`common.view` 是真缺文案 ⇒ 两份各加（zh「查看」／en「View」，成对改）；
  `common.empty` 是**同义键重复**（`noData` 已存在，zh「暂无数据」／en「No data」）⇒ 不动文案表，把视图改指 `t('common.noData')`。
- 复跑：`KEYS=1424 BAD=0`；`apps/admin` typecheck 判 OK；该判点已接进终报面板（`G.adminI18n`），
  并配 `--selftest` 四条样本（"只有中文有必须红""占位符漂移必须红""空判点不认绿"）。
- 台账：`MP-R7-ADMIN-I18N-MISSING-COMMON-001` 立账（`已修复（源码级判点＋运行时键解析判点…）`），
  它的"人看一眼的那一帧"与 §89.4 那条评论列**同一欠项**（后台 Web 页不在 DevTools 载具覆盖内），合并复验、不各记一次。

## 91 最后一条"判据含糊"重写完了：两页 meta 必须同序（2026-09-27 03:2x）

`criteria` 那一桶（判据本身不成立、需要先重写成可判物件）只剩一条：
`MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001`。它挂着两句互相矛盾的话——
原句「把 loc 解构顺序对调」字面不可执行（后端 `basic.location` 串本体是「城市 · 学校」，对调会把城市渲染成学校），
而「与 MyHeader 共用 formatter」的前提早被源码推翻（MyHeader 当时整串直出，两页根本不同序）。

**方向不由我定，由图定**：本轮逐图读了 `素材/理想效果图/已经填完资料的个人主页.png`，
它的 meta 行是「21岁 · 北京大学 · 北京」，与 `他人显示主页.png` 同序 ⇒
该动的是**我的页**，不是已经改对的他人页。于是重写成的可判物件是一句话：
**两页对同一份 basic 必须渲染出同一序**。

落地三件（`PARSE_RESULT=PASS files=46`、`apps/client` typecheck OK）：
- 新建 `apps/client/src/utils/profile-meta.ts`：`profileMetaParts` / `profileMetaLine`，解析位序不动、只改输出 push 序；
- `components/profile/mine/MyHeader.vue:23` 由整串直出改成 `profileMetaLine`；
- `components/profile/public/PublicIdentity.vue:21` 由本地重排改成 `profileMetaParts`。

载具是 `apps/client/src/tests/utils/profile-meta.spec.ts` 六条（**不是源码正则**）：
纯函数三条钉"重序／无分隔符不凭空造学校／缺字段不产悬空分隔符"，挂载测三条钉"两页各自 年龄 在最前且 学校 先于 城市"
与"两页必须真的调用共用 formatter、不得自己 split location"。实测 `Tests 6 passed (6)`。

**负例照旧要跑**：把 MyHeader 临时退回整串直出，同一命令报
`MyHeader 里应当出现城市: expected 17 to be greater than 17`、`Tests 1 failed 5 passed` ——
它抓的正是这条缺陷的历史形状；退回后复跑回 6/6。
这一轮还顺手把该 spec 的一条弱判点改硬：原先只查 `import` 语句，留一个没用上的 import 也能过，
现在要求查到真实调用 `profileMeta(Line|Parts)(`。

台账该行改 `已修复待复验`：欠的是 mock 档重建后重跑 spec ＋ 两页各一帧（我的页与他人主页），
结案条件与"若有人主张保持后端串序则属产品裁定"都写进处置列。
`emit-open-items` 复跑：`主表=171 未结案=52 分桶=reverify:38 frame:4 decision:7 unverified:1 backend:1 code:1`
—— `criteria` 桶清零，剩下的 52 条里没有一条是"判据成立但没人动手"。

## 92 真实模式那 236 条**一条都没跑过**：旗标压过了被测档位（2026-09-27 03:3x）

游客刀收工后对它做分诊，`TRIAGE_SUMMARY` 里这一行把我钉住了：

```
239 FAILED-landing-guard
236 SKIPPED-real-band
```

真实档的腿上，`requiresReal` 的 236 条**全部是 SKIPPED**。查执行器：

```js
const bandSkip = (c) => … || (c.requiresReal === true && !process.argv.includes("--real"));
```

跑不跑真实用例，取决于有没有人记得加 `--real` 旗标，而**不取决于 `--project` 指向哪一档产物**。
本轮两条腿（A/mock、guest/real）都只带了 `--project …/mp-weixin-real`，没带 `--real` ⇒
① mock 腿跳过 236 条是对的；② real 腿跳过它们是**错的**，而且错得看不出来，因为
写进行里的跳过原因是那句「本切片只跑 mock 产物；真实模式要换 --project 到 mp-weixin-real」——
**一句在它自己都不成立的话**（它明明开的就是 real 档）。我读统计时信了这句文案，就没去核档位。

后果要说准，**并且要把我第一版说过头的地方改回来**。新写的守恒门
`scripts/qa/verify-real-coverage.mjs`（只认两件事：行上的 `band` 是不是 real、状态是不是"判过"——
`SKIPPED` 不算量到，单身份不算双身份）实测：

```
REALCOV_CASES=236 EXEC_ROWS=5887
REALCOV_NEVER_ON_REAL=0  REAL_BAND_BUT_ALL_SKIPPED=35
JUDGED_MISSING_A=35      JUDGED_MISSING_GUEST=236
REALCOV_UNCOVERED=236／236  REALCOV_RESULT=FAIL（exit 1）
```

⇒ 准确的说法是：**登录身份 A 在 real 档判过 201／236，游客身份在 real 档一条都没判过（0／236），
另有 35 条从未在任何 real 档腿里被判过**。我最初写的"本轮没有任何一条 requiresReal 被真实模式量到过"
是说过头的——那 201 条来自本轮更早的 `exec-A-real` 等腿，我只数了最后两条腿就下了全称结论。
（写这一段的唯一目的是把它改对：守恒的门禁数字优先于我当时的印象。）

不变的部分是缺陷本身：本轮收工的两条腿（A/mock、guest/real）里，real 档那腿把 236 条全跳过了，
而它写进每行的跳过原因是「本切片只跑 mock 产物；真实模式要换 --project 到 mp-weixin-real」——
**一句在它自己那次运行里都不成立的话**（它开的就是 real 档）。我读统计时信了这句文案，没去核档位，
所以 ⑤ 的"双身份 × 全量"在游客这一半上一直是零。

修法三件（`node --check` 通过，实测 `readApiMode` 三档：mock⇒false、real⇒true、showcase⇒true）：
1. **档位自己说了算**：新增 `REAL_BAND = BAND.mode === "real" || argv 里有 --real`，
   `bandSkip`／`MODE_LABEL`／`RUNNER_SCOPE` 全部改用它；`--real` 降级成"人工强制"，不再是唯一开关。
2. **跳过原因不许撒谎**：改成把当时的档位打出来 ——
   `requiresReal ⇒ 当前被测档位 VITE_API_MODE=<mode>（project=<路径>）不是 real ⇒ 跳过`。
3. **两个方向都加守恒**（写盘前，红就不落盘）：
   real 档却跳过 N 条 ⇒ `这一腿没量到真实模式，不许当真实轮记账`；
   非 real 档却跑了 N 条 ⇒ `mock 帧不能冒充真实模式结论`。
   另加一行 `RUNNER_REAL_CASES=on|off band=<mode>@<sha8> project=<路径>`，让档位与用例集的关系在日志里可读。

补覆盖的腿已排进 `scripts/qa/ui-queue.round7-stage4.json`（11 条腿）：
先重建 mock 与 real 两档（吸收本轮三处未进档的修复）→ 档位新鲜度门 → 重开窗口 →
`exec-A-real-only` 与 `exec-guest-real-only`（`--real-cases-only --tap`，两把身份各 236 条）→
matching 落点漂移复测 → 落点账本复核 → 判据台 `--baseline 094f7239` → 定向补帧。
排队器仍**不取租约**，每腿自取；任何一腿红就停，不在红腿后面接一串依赖它的腿。

## 93 两条腿为什么当场红：发布守卫不该用在取证档上（2026-09-27 03:4x–03:5x）

stage-4 第一次跑（`ui-queue-stage4`）13 秒就死在 `rebuild-real-stage4`，第二次（`ui-queue-stage4b`）
连 mock 腿都红了。两个原因不同，都值得写下来，因为它们都不是产品缺陷，却都能让"重建产物"这一步永远做不完。

### 93.1 `build:mp-weixin:real` 在本地**必然**红

链子里那一步 `scripts/verify-env-release.mjs` 报：

```
VITE_API_BASE_URL 必须为 https（当前: http://127.0.0.1:8080/api）
VITE_API_BASE_URL 不得指向本机地址（当前: http://127.0.0.1:8080/api）
```

它是**发布面守卫**（微信小程序合法域名必须 HTTPS），而真实模式取证量的就是本机 8080。
本地 real 档的既有载具是 `build:mp-weixin:real:isolated`（`build-real-isolated.mjs`：
`UNI_OUTPUT_DIR` 改道到 `mp-weixin-real`、`prepare-static --dev`、`--mode real`，
并且拒绝把 real 产物构建进 mock 共享目录）。⇒ 排队器这一腿换成 isolated 脚本，**守卫本身不改**——
它守的是上线包，不是取证包；把守卫放宽去迁就构建，才是真正会放走问题的改法。

### 93.2 mock 腿那次红是我自己制造的：诊断时手跑了构建子步

`ui-queue-stage4b` 的 mock 腿死在 `profile-svg-to-png`：
`src/static/assets/profile/png/profile-hero.png: write error / system error: Invalid argument`。
根因是我为了定位 93.1，**手工跑了 `node scripts/prepare-static.mjs --real`** ——
这一步会把 `src/static` 整树按 real 口径"atomic promote"（它自己打的日志：
`real 模式：本地保留 tabBar + 源码字面量引用 164 个文件: atomic promote OK（旧 SRC 已清理）`），
也就是**改工作树**。核对：`git status --porcelain apps/client/src/static` 当时有 1 行 M（就是那张 png）。

处置（不碰 git）：直接重跑生成器 `node scripts/profile-svg-to-png.mjs` ⇒ 退出 0、
文件重新是合法 PNG（签名 `89504e47…`、尾部 IEND、28638 字节），`git status` 该目录回到 0 行；
再跑一次 mock 构建 ⇒ `Build complete`、exit 0。第三次排队（`ui-queue-stage4c`）从干净状态起跑。

**规矩**：诊断构建失败时只跑**只读**检查（那几个 check-*.mjs 我都单独跑过，全部 PASS），
带写副作用的构建子步（`prepare-static`、`prune-unreferenced-static`、`profile-svg-to-png`）
不在排队器之外手跑；必须跑时先记下 `git status` 的受影响路径，跑完当场核对回 0。
（`prune-unreferenced-static.mjs` 更危险——它会删文件，`build-real-isolated.mjs` 的头注里就点名过这一点。）

### 93.3 取景腿收工读数：35 条里 29 出帧、6 条无证据、9 条 WS 交互未成

`shoot-frameplan-final` 以 `SHOOT_RESULT=FAIL（6 条没拿到可用帧）` 停队（守恒 `SHOOT_CONSERVED=yes`，
`失败=0` ⇒ 不是崩，是那 6 条没拿到帧）。同一条腿还报 **WS交互成功=0 / WS交互未成=9**
（`WS 未启用或连不上`），以及两处 `identity-err guest :: mock 包会把游客吃掉`
——mock 档表达不了游客身份，这一类要换 real 档腿去量，不是产品没做到。
这 6+9 条是 ① 那批"判据要渲染帧/要 WS"的欠款里剩下的部分，已单独立任务跟（不并进重建腿，
免得把"档位表达不了"和"没取证"混成同一个红）。

### 93.4 档位新鲜度门自己也被量出两个模型缺口

`gate-band-freshness-stage4` 当场 exit 2，报了 3 条 problems。逐条核下来是**两条假红 + 一条真过期**：

| 判定 | 事实 | 处置 |
| --- | --- | --- |
| `real ← fixtures.ts 真过期` | 假红。`services/mocks/**` 在 real / showcase 两档被 `strip-mock-for-mp` 按设计剔掉，搜不到新增字面量证明的是"这档不带 mock 数据" | 门加 `MOCK_STRIPPED` 豁免：非 mock 档上的 mock 源码域 ⇒ 记「不可观测」，不定罪也不判清白 |
| `showcase ← profile-meta.ts 无法定罪` | 门只会搜字符串字面量，而新增的是一个**纯函数**（没有 ≥6 字符字面量）⇒ 它永远沉默 | 门加第二级探针 `addedExports`：用新增的导出符号名（`profileMetaParts`/`profileMetaLine`）搜产物，全命中=洗清、全不命中=真过期、部分命中=仍不可定 |
| `showcase ← matching.vue 7/9 缺失` | **真过期**：showcase 档还是 01:32 那一次构建，没吃进本轮三处修复 | 用 `scripts/build-showcase-isolated.mjs` 重建（`SHOWCASE_RESULT=PASS`、`sharedOutUntouched=yes`），不手改 npm 脚本 —— `build:mp-weixin:showcase` 不设 `UNI_OUTPUT_DIR`，直接跑会把 showcase 产物写进 mock 共享目录 |

复跑门：`FRESH_内容级 嫌疑=4 真过期=0 已洗清=1 无法定罪=0 不可观测=3 → FRESH_RESULT=PASS bands=3 markers=3`。

顺手核掉一个我怀疑过的假问题：showcase 产物自证打的是
`feature-flags 产物里的初值：membershipEnabled:!1`，看着像"showcase 档根本没开会员开关"
（那 #43 的 34 条就是假覆盖）。实际是 `config/showcase.ts:65-70` 的 `applyShowcaseMode()`
在运行时把四个开关整体置 true，产物里那个 `!1` 只是**应用之前的初值**——
`config/showcase.js` 确实进了 showcase 包。#43 的结论不因此翻。
教训留一句：**初值不等于生效值**，凡是"运行时被改写"的量，判点要量改写之后的那一面。

## 94 同一个条件有两个出口：我第一次的修法只修了一半（2026-09-27 04:0x–04:1x）

tail 队开跑后我抽了第一把真实档腿的前 339 行看，`statuses` 是**全 SKIPPED**，
其中 30 行的原因是我自己三分钟前写的那句新文案：

```
requiresReal ⇒ 当前被测档位 VITE_API_MODE=real（project=apps/client/dist/build/mp-weixin-real）不是 real ⇒ 跳过
```

一句自我矛盾的话——档位明明是 real，行里却说"不是 real ⇒ 跳过"。查代码：
`bandSkip`（第 339-340 行）我改成了查 `REAL_BAND`，但**记 SKIPPED 的那个分支在第 414 行，
它自己又写了一遍 `!process.argv.includes("--real")`**。也就是说：
判定"跳不跳"的条件有两个出口，我只改了其中一个，而两个出口共用同一句原因串——
于是"改了判据、没改记账"，谎话从第二个出口原样漏出来。

三件事一起记下：
1. **改条件要把同一条件的每个出口一起改**，改完 `grep` 一遍旧表达式（`includes("--real")` 现在只剩
   第 41 行 `REAL_BAND` 定义里那一次，那是有意保留的人工强制口）。
2. 我在 92 节加的双向守恒（`REAL_BAND && realSkipped ⇒ FAIL 不落盘`）**确实会拦住这一腿**——
   它会在收尾时把整腿判红。但"等收尾才发现"要烧掉 20 分钟实跑，所以我选择当场停腿、修完再放。
3. 停腿的现场要处理干净：那条腿的锁（owner `r7-cli-exec-round-7-A-real-only`，pid 22800）
   在 `ui-lease.mjs` 的规则下**租期没到就仍算有人在用**（`unexpired || pidAlive`，这是有意的，
   防止抢跑活体），所以不能干等 18 分钟也不能硬删。做法：`process.kill(pid,0)` 核实 pid 不存活
   → 把锁改写成 `status:"released"` 墓碑并在文件里写清"谁的腿、为什么停、pid 核实结论"，
   **不删文件、不改 owner**；同时把已落的 partial 结果目录整体改名
   `exec-A-real-only.partial-second-exit-bug` 留在原地当证据，
   否则执行器的"按 manifest|id 跳过跑过的"续跑逻辑会把那 30 条 SKIPPED 当成已跑，永远不再判。

修完复跑，同一把腿 4 分钟后的读数（增量落盘中）：

```
rows 214 band real@f0677920 statuses {"SKIPPED":203,"EXECUTED":10,"FAILED":1}
requiresReal 行 13，其中已判(EXECUTED/FAILED)=11，跳过=2
```

⇒ 真实用例这一腿**真的在判**了（203 条 SKIPPED 里绝大多数是 `--real-cases-only` 的守恒计数行，
原因串是"真实刀只跑 requiresReal 用例…"，与档位无关）。这一把跑完再看 `REALCOV_*`，
⑤ 的"双身份 × 全量"与 ③ 的真实模式那半才开始有账。

## 95 ③ 的"重启 8080"经测量是**不必再做一次**（2026-09-27 04:2x）

目标 ③ 写着"重建 + 重启 8080"。我没有照着再重启一次共享实例，而是先把"运行中的后端是不是 HEAD 那份"
量出来，并把它做成一条门 `scripts/qa/verify-backend-fresh.mjs`（已接进终报面板 `G.backendFresh`）：

```
BACKEND_FRESH java最新=2026-09-26T12:55:06Z class最新=2026-09-26T13:08:47Z
              运行实例=pid 32156 java.exe 起于 2026-09-26T21:32:46（本地 +0800 = 13:32:46Z）
              apps/api脏项=0 源码比class新=0
BACKEND_FRESH_RESULT=PASS
```

三条依据：① `git status --porcelain -- apps/api` 为空 ⇒ 工作树没有未编译的改动；
② 每个 `.java` 都能找到不早于它的 `.class`（本轮 742 个源文件全过）；
③ 监听 8080 的进程启动时间（13:32:46Z）晚于最新 class（13:08:47Z）。
另外 `git log -1 -- apps/api` 停在 `6be06a80`（21:43 本地），此后 HEAD 上再没有后端改动。
⇒ **重启一次都不会改变被测对象**，只会打断正在跑的真实模式腿；所以这条从"待办"改成"有判据的既成事实"。

写这条门的过程本身也踩了一个红：第一版把 `Get-Process -Id $c.OwningProcess` 和 `-f` 格式化
塞在同一行 PowerShell 里，`$p` 是 null（`InvokeMethodOnNull`），于是门把"活着的前端"读成
"端口 8080 没有监听进程"并判红 —— **一个把被测对象查丢了的门，红得比不红更糟**。
拆成"先问端口归属、再按 pid 问 CIM"两步后才拿到真读数。
（同一版还带一个 `walk(dir, re)` 少传累加器的崩溃，以及"没有监听进程"这句被推两遍的重复；都已收掉。）

## 96 判据台自己咬了自己一口：壳被变更动词剪断，而我抽函数把另一条判点抽成了空判（2026-09-27 04:4x）

在真实档腿跑着的时候复跑了判据台（`--baseline 094f7239`），三件事一起冒出来。

### 96.1 `NOT_IN_EITHER` 三条全是"说明文字被当成判点"

| 行 | 台子抽到的"硬判点" | 实际是什么 |
| --- | --- | --- |
| MP-R2-POST-016 | `height:calc(200rpx` → `calc(120rpx` | 处置列里描述**别的条目那次 diff** 的原话 |
| MESSAGES-INDEX-005 | `warmPeople` 缺席、`recentChats` 缺席 | 「原方案要往 mock 种子补 ⟨warmPeople⟩≥4」的引用，不是要删它们 |
| CAMPUS-HUB-006 | 标识符 `campusHub` 必须存在 | 迁移动作**之前**的旧命名空间名，迁移后本就该消失 |

三条都不是产品缺陷，是台账把引用性文字写进了会被挖矿的列。按既有约定套 `⟨⟩` 之后
`NOT_IN_EITHER 3 → 0`，同时 `ARTIFACT_VERIFIED 29→28`、`UNDECIDABLE 18→20`——
**去掉假判点之后台子少声称了两条"已验证"**，这是方向正确的收敛，不是丢绿。

### 96.2 壳不能装动词：切句器会在「删除／移除」处剪断

`PROSE_BRACKET_UNBALANCED_WARN` 一直报 `unbalanced=1`。我先按"壳跨句号"去查（`normalize-bracket-spans.mjs`
报 `spans-with-delimiter=0`，没有跨句），改词再跑，剪断点跟着我的词走：`删除`→`移除` 之后
样本从「并同步删测试用例…」变成「并同步去掉测试用例…」。⇒ **切句器把变更动词当子句边界**，
壳里只要有这类词就会被从中间剪断，半只壳会把它后面的真判点全部"按说明处理"吞掉。
`normalize-bracket-spans.mjs` 只建模 `。；`，所以它检不出来（`emptyOrStraddling=1` 报了但不修）。
处置：把那一格的四个壳改成**纯名词短语**（`⟨原处置＝二选一且互斥⟩ ⟨旧判点＝同一 token 两支互斥⟩…`），
`unbalanced` 归 0。留一条待办：切句器与归一化器对"壳"的建模不一致，属载具缺陷，
应在台子里把"壳内含变更动词"做成显式告警，而不是靠人肉换词。

### 96.3 我自己把一条判点抽成了空判

`MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001` 的三条 present 钉的是
PublicIdentity 里的**内联解析**（`const [cityPart, schoolPart] = loc.split("·")` 等）。
本轮我把这段逻辑抽进 `utils/profile-meta.ts` 之后，三条当场失效——**不是缺陷回归，是判点钉错了地方**：
它钉"某一页内部怎么写"，而这条缺陷的本体是"两页必须同序"。判点已重锚成结构断言
（两页都 import 且调用 `profileMeta*`、都不再就地 split、共用模块里 push 序 school→city），
`SRC_SHAPE total=62 成立=61 不成立=1`（唯一不成立仍是 MESSAGES-004 那条待裁决）。
这正是记忆里那条"同一轮的修复会作废当初豁免所依据的事实"的又一次重演——**我自己改的代码，
把我的门改红了，而门是对的，红的是我的判点**。

### 96.4 MESSAGES-022：产物侧那块"已见"的绿是假的

台子新读数：`ARTIFACT_VERIFIED → UNDECIDABLE`，理由「授予绿用的判点在修复前的 HEAD 里就已存在
（`console.warn`）——命中不能证明改动落地」。当场复核真身：
`git show 094f7239:apps/client/src/stores/messages.ts | grep -c toggleSessionPin` = **2**，
工作树源码 **0**，mock 产物 grep **0** 命中（`src/.mimosa/hook-state` 里那些命中是别家工具的历史快照，不是源码）。
⇒ 改动是真的，**判点是错的**：删除型缺陷只能按 absent 判。已在 `verify-source-shape.mjs` 立
同号条目（`absent /toggleSessionPin/` + `present /async setSessionPinned\(/`），台账该行状态由
「已修复（产物侧已见…）」改判到「已修复（源码级判点…）」，并在处置里写明旧的那条绿为什么不算数。

## 97 「WS 与 CLI 天生互斥」这句话我从来没有实验支撑（2026-09-27 04:5x）

取景腿报 `WS交互成功=0 / WS交互未成=9`，原因串是 `WS 未启用或连不上`。我此前据此在账上写过一条
因果结论（"WS 通道与 CLI 自动化互斥"）。这轮去查 `shoot-frameplan.mjs` 的 `wsSession()`，两个成因都不是互斥：

1. **旗标根本没带**：`if (!flag("ws-taps")) return null;` —— 这条腿的 args 里没有 `--ws-taps`，
   所以它是"未启用"，不是"连不上"。而那一句把两件事合并成一个字符串，读的人无从分辨。
2. **端口写死**：`wsEndpoint: "ws://127.0.0.1:" + (process.env.WSX_PORT || "9420")` ——
   本轮 DevTools 的自动化端口在 **9430/9431**（"端口要发现、不能写死 9420"这条我自己记过一次，
   却只落在 r-exec 上，没落到取景器）。⇒ 就算带了旗标，第一次真实尝试也会连到错的端口。

修法（都已落码，`node --check` 通过）：

- `ws-off 未启用（这条腿没带 --ws-taps；不是连不上）` 与 `ws-connect-err …` 分成两条日志；
  行内错误串改成「WS 不可用（具体原因见本腿日志里的 ws-off / ws-connect-err 行…）」，不再合并成因。
- 端口改成**发现**：`WSX_PORT` / `WS_ENDPOINT` 有值就用（`source=env`），否则扫本机 94xx 监听端口
  并把 9420 兜底追加（`source=discover`），逐个试；连上打 `ws-connected port=<n> source=<..> 试过=<列表>`，
  全失败才报 `候选端口全部连不上 <端口:错误>`。

重测排程：`scripts/qa/ui-queue.round7-stage5.json` 的 `reshoot-mock-with-ws-taps` 腿带 `--ws-taps`
重拍 `frameplan-round7-final` 的 35 行。**两种结果都可信**：连上并把交互做完 ⇒ 那条"互斥"结论作废，
成因是配置；仍然连不上 ⇒ 才算真互斥，而且这次有端口与错误清单可查。

通用教训一句：**一句合并过的错误串，就是我敢拿去做因果结论的假数据源**。未启用 / 连不上 /
连上但超时是三件不同的事，必须分开报；而我"已经学过一次"的规矩（端口要发现）必须落到**每一个**
消费者身上，只修我当时手里那一个等于没修。

## 98 真实档第二把身份终于开始量东西，以及三条"载具建好没接线"的账（2026-09-27 05:1x–05:4x）

### 98.1 先把上一轮的假结论钉死

`exec-guest-real` 与 `exec-guest-real-final` 两腿都写着 `band=real@f0677920`，可
`requiresReal` 判过 **0／236**，236 条全带同一句原因：

```
requiresReal ⇒ 本切片只跑 mock 产物；真实模式要换 --project 到 mp-weixin-real 且后端在跑
```

而 `--project` 当时**就是** `mp-weixin-real`。那句话不是判断，是硬编码的台词——
`REAL_BAND` 修好之前，这一支查的是 argv 里的 `--real` 旗标而不是量到的档位。
所以"游客在真实档没覆盖"这件事，根因是我自己的载具在说谎，不是产品跑不出来。

现在这一腿（`exec-guest-real-only`，05:19 起）实测：

| 时刻 | 行数 | requiresReal 判过 |
|---|---|---|
| 05:31 | 444／1107 | 48／56 |
| 05:35 | 595／1107 | 80／91 |
| 05:40 | 689／1107 | 109／129 |
| 05:47 | 815／1107 | 119／142 |

`因档位跳过=0`。这条曲线才是"真实模式补满"的真实进度，之前那两腿的 0 不算量过。

### 98.2 一次预检为什么没预检到东西（载体的口径，不是产品的口径）

`--limit 4` 的预检跑出了 `RUNNER_RESULT=OK`，但 4 行全是 `非真实用例=4` 的 SKIP，
`真实用例判过=0`。原因在 `r-exec-cli.mjs:464`：**预算在 SKIPPED 行上也递减**。
所以 `--limit` 量不到"requiresReal 到底会不会被跑"，它只证明了三件事：
档位判定 `RUNNER_GUEST_BAND mode=real ok=true`、`.lock-screen=absent`、通道可用。

预检文件叫 `preflight-guest-real-probe`（不带 `exec-` 前缀）是刻意的：
`verify-real-coverage.mjs:45` 只扫 `exec-*` 目录，探针不能进守恒分母。
教训一句：**预检能证明的三件事要按它真的证明了什么来写，不能因为它是 `OK` 就当"这一腿会量到东西"**。

### 98.3 17 行"缺的载体=需人复判后指定"落成源码级判点

台账里 17 行状态是 `已修复待复验（去向：判据台未覆盖本条…）`——意思是"活干了，但没有任何
可重跑的东西能证明它"。这一批逐条按 `statusEvidence` 的锚点回读盘后写进
`verify-source-shape.mjs`：`SRC_SHAPE total` 从 62 → **79，成立 79，不成立 0，守恒 yes**，
补丁 158 条落在 `reports/audit/round-7/cellplan-source-shape.json`（等排队器不再写台账时落账）。

两处台账措辞与盘上真形不同，按盘上写并在判点注释里说明：
- `MP-R2-PROFILE-022`：让位状态栏不是 `padding-top`，是 `padding` 简式里的
  `calc(var(--statusbar, env(safe-area-inset-top)) + 32rpx)`；
- `MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-003`："两页同规则"不是同一串字面量——
  列表页把种子抽成了 `circleIdSeed(circle.id)`，圈主页仍内联 `charCodeAt` 归约。
  判点因此钉表达式形状 `return 5 + .*% 8\);` 加 `if (!useMock()) return 0;`，两边各一条。

### 98.4 一把第一次就全绿的门，默认当作没装好

79/79 全绿之后我没有落账，而是去跑变异（`tmp/qa/mutcheck-source-shape.mjs`）。
结果抓到**两条我自己的错**：

1. `CIRCLES-003` 的判点原本写成 `present /return 5 + \(/`——把 `% 8` 改成 `% 9`（正是那条判据
   声称已修的东西）判点**仍然绿**。形状判点不钉判别常量就是没判。已收紧。
2. 我自己的变异脚本在 `summarize()` 里只 return `{code, reds}`，断言却读 `result.out`，
   于是"还原后没有回到全绿"永远为真——一把永远红的检查器。补上 `out` 之后：
   三条变异各红一次，还原回到 79/79，`MUTCHECK=PASS`。

顺带确认一件差点被我改错的事：`verify-source-shape.mjs` 在 `PARTIAL` 时 **exit 0** 是有意的
（它是补丁生产者，"不过的那几条不落账"是正常产出，只有守恒不成立才 exit 2）。
我先把它当成接线漏了，读了 `process.exit` 那行才没动手。

### 98.5 `MP-R2VIS-PAGES-MESSAGES-INDEX-004`：本轮唯一"判据成立但确实没修"的那条，修了

判据是两条 absent（整图海报引用 + `not-logged__bg` 节点），实测长期为红，而台账写着
"不许用『整图也算一种实现』把判据放宽"。这一轮按理想图 `未登录等待页面.png` 把它拆成独立节点：
`NotLoggedWaiting.vue` 删掉整图，改成虚线轨道 + 6 个独立头像（各带心动角标）+ 中心吉祥物，
并把"绝对定位压底"改成正常流（标题左对齐 → 环 → 解锁提示 → 4 icon → 按钮，按理想图顺序）。

判点同时补了正半段（`present` 吉祥物/轨道/头像节点 + `countEq PEOPLE.AVATAR_n = 6`）——
只留负半段的话，把 `<image>` 删干净也能过。第二载体是挂载测
`apps/client/src/tests/components/not-logged-waiting-orbit.spec.ts`（4 例，测渲染后 DOM 计数、
6 个 src 互不相同、内容顺序），变异测：把头像池少留一个 → `expected [ …(5) ] to have a length of 6`。

**这条的帧债没清**：那张卡只在真实档游客身份渲染，而盘上的 real 档是 03:52 建的，
不含这次改动 ⇒ 复验必须是"重建之后"的 guest 真实帧。终轮（stage-6）的
`reshoot-guest-real-r7final` 就是为它排的。

### 98.6 G8 十环重跑 10/10，RING6 的判点终于问的是数值

`tmp/qa/g8-round7-recheck.log`：`G8_RINGS_OK=10/10`，RING6 实测
`点赞 likeCount=1 vs likesCount=1 / 评论 commentCount=1 vs commentsCount=1，后台字段总数=27`。
上一版那条 `needs_backend` 假账的来源（`Object.keys(...).slice(0, 14)` 把第 18、19 位切掉）
已经由打印不再截断而消除。

新写入的行按只增台账登记：`posts.id=277 / comments.id=1245 / campus_topics.id=306 / campus_replies.id=38`
（`TDI_ROWS=9 台账=13（新增 5，弱指纹 4）`，`TDI_RESULT=OK`）。
这次的原始输出另存为 `reports/audit/real-e2e/g8-rings-20260927-0520.log` 而**没有覆盖**
`g8-rings.txt`——`inventory-g8-test-data.mjs:30` 的扫描式是 `^g[89].*\.(txt|log)$`，
带日期的文件会被一起扫到，于是"日志被后一次 G8 覆盖导致指纹不可复核"那件失忆事不再重演。

### 98.7 游客那 42 条 FAILED：裁定早就写好了，执行轮从来没读过它

失败原因清一色是"落在别的页（页内守卫或路由重定向），须人判"，落点统计是
`{"pages/login/index": 42}`，页面集中在 village/campus 那几组。而
`scripts/qa/guest-landing-policy.json` 里 26 组落点**早就把这几页写成 → pages/login/index**，
`$ruling` 还写明"内容页被弹到登录页属方向正确，错的是判据"。

也就是说：同一件事在两个载具里说法相反——裁定说"这是设计"，执行轮把它算成产品缺陷。
建了不接等于没建。这一轮把两边接上：

- `r-exec-cli.mjs` 启动时读 policy（`RUNNER_POLICY_LANDINGS=26`），
- 判定抽成纯函数 `guestGateVerdict(loginVerify, landings, page, top)`，
  三条同时成立才归因闸门：实测身份 `not-logged-in`、该页在裁定表里、实际落点=裁定落点；
- 行**仍然记 FAILED**（那几条判据的前置确实是登录态，本条判据没满足就是没满足），
  但原因串点名裁定，并单独计数 `RUNNER_GUEST_GATE`，终报据此区分"闸门行为"与"产品缺陷"；
- `--selftest` 5 条样本，删掉登录态那一行 → 第 3 条立刻 BAD 且 `exit=1`（证明这把尺能红）。

真正干净的解法是给这些 case 标 `identities`，让游客腿不再认领 A 侧判据——
但 ops 文件正被在跑的腿逐组读取，改它会混改本轮语义，所以排在终轮之前做（#51 同一机制）。

### 98.8 终轮队已经备好（`scripts/qa/ui-queue.round7-stage6.json`，24 腿）

因为本轮我又改了客户端源码，盘上三档产物已不代表工作树 ⇒ 之前所有帧与执行轮量的是旧档。
⑤ 要的"全新 round-7 完整循环"只能在修复全部落地之后跑，所以这一队是：
自测 → 重建三档 → 档位新鲜度 → mock 双身份 1107 → 真实档双身份 236 → REALCOV 守恒 →
落点量测/落账 → 判据台（`--baseline 094f7239`）→ 按当前台账重生成取景配方 → mock/真实档出帧 →
双身份巡检 → 状态真值/证据缺口 → `GATES.json --write`。

两个坑在写队时就避掉了：
- 不能用 `build:mp-weixin:showcase`（它的输出目录**就是 mock 那一档** `dist/build/mp-weixin`，
  跑了会把刚重建的 mock 盖掉）→ 改走 `apps/client/scripts/build-showcase-isolated.mjs`；
- 每一腿执行前重新 `open-project-window`：重建会打掉模拟器连接，不接回设备就是拿旧会话量新产物。

## 99 `verify-ledger` 的默认参数审的不是权威台账；顺带一条因果是我从自己工具的打印里抄错的（2026-09-27 06:1x–07:0x）

### 99.1 一条"永远红"的门，其实一直在数错文件

`verify-ledger.mjs` 的 `roundDir` 默认值是 `reports/audit/round-2`（脚本最早年代的参数），
而权威台账后来搬到了 round-6。也就是说我这一整轮反复引用的"台账门绿/红"，
不带参数跑时**审的从来不是 round-6**：它的列数与 status 词表判据一次都没在权威台账上跑过。

修法不是"把 round-6 写死成新默认"（那只是把同一个坑挪后一轮），而是
默认取"最新的、带 `issue-matrix.md` 的 `round-N`"，并打印 `LEDGER_TARGET=… source=argv|自动选取`——
让读者能看见它开了哪个文件。改完实测：`DATA_ROWS=236 列数=11 OFF_SCHEMA=0 ROTATED=0 VOCAB_BAD=0 PASS`。

### 99.2 那条"表头缺失"的错误，挡住了 36 条真问题

round-2 的表用中文列名 `状态`，门只认 `status` ⇒ 它一进门就 `continue`，
后面的列数核对与词表核对根本没执行。接受 `状态` 别名之后，同一份文件立刻暴露：

- **21 行列数不一**（10/11/13 列 vs 表头 9 列 ⇒ 单元格里有未转义的 `|`，这些行对任何按列取值的读者不存在）；
- **15 行 status 越界**（`已验证` / `保留` 是 round-2 那一代的词，不在今天的 VOCAB 里）。

通用一条：**门在第一个检查就报错时，它后面本来还会说的话全部没说**。
下次看到"表头找不到"这种早退错误，先问"如果它走下去会讲什么"。

我也没去"修平"round-2：`normalize-ledger-shape.mjs` 干跑显示它会把 **294 行里的 284 行**改写成 11 列，
而 round-2 本来就是 9 列表 ⇒ 那是拿今天的 schema 碾历史产物。读干跑的三个数（before/after、
需归一化行数、目标列数）救下了这一次手滑。

### 99.3 8 行"本轮前落地"是数出来的，不是我判断的

判据台给 19 条判了 UNDECIDABLE，其中 8 条的理由是"授予绿用的判点在修复前的 HEAD 里就已存在"。
我没有直接照抄这句，而是写了 `emit-prebaseline-attribution-patches.mjs`：
它对每条判点跑 `git show 094f7239:<file>` 与工作树各数一遍，**两边计数逐字相同才落补丁**，
不同就把这一行踢出计划。实测 8 条全部相同（`maskPhone` 1/1、`btn-guest` 7/7、
`circles-header__search` 5/5、`MORE_SVG` 1/1…），于是按台账既有口径落成
「保留-判据不成立（本轮前落地：…）」并把等式本身写进 statusEvidence，
下一个读者不必再信我的转述。派活给子代理做的逐 hunk 归因，我也自己复验了最关键的两条
（`NEARBY-013` 文件零差异、`MESSAGES-022` 删除确系本轮 `91e56562`）。

顺带被它逮到我自己写的判点：`MESSAGES-022` 的 present 半边
（`async setSessionPinned(`）在基线里就有 ⇒ 那条判点只有 absent 半边在起作用。

### 99.4 我从自己工具的打印里抄错了一次因果

`triage-exec-failures` 的"复测腿与债同源"核对在 `--real-cases-only` 切片上报 24 组红。
我先加了"切片语料不比成员"的守卫（这是对的：切片天生只含 236 行），
然后打印里出现一句 `实测多于账本 ⇒ 账本漏记`，我**照抄进任务单**当成了结论。

自己去数两份语料才发现方向是反的：同一组 `profile/favorites`
在切片里 7 行、在**全量**跑里只有 5 行；`profile/tasks` 是 7 vs 3。
账本没漏记——是**成员本身随单次运行而变**（哪些行落进 `FAILED-landing-guard`
取决于当次的落点与交互结果）。所以真缺陷是"债名册由一次跑派生"这件事不成立。

两处收口：
- 守卫只放过"实测 ≤ 账本"的组（真子集），多于账本仍判红，但措辞降回可观测事实
  「成员随单次运行而变」，不再替我下因果结论；反向证明过：把切片标记抹掉，24 组立刻重新变红。
- `verify-guest-landing --mode book` 的 `--triage` 改成可吃逗号分隔多份并取并集
  （实测并集 331 行 vs 单份 239 行），这样至少不再由"碰巧那一次跑"决定名册；
  真正的解（成员改由 ops 清单派生：凡 `page ∈ policy` 的 case 全部入册）留在 #67。

教训一句：**我自己工具打印出来的因果，和别人的结论一样是假设**。
它比别人的结论更危险，因为我天然信它三分。

### 99.5 这一波还落的载具

- 执行器又一句谎话：`--tap` 腿里游客被弹走的行仍写"本切片只跑 observe-only"。已按量到的东西分四档原因。
- 游客落点裁定接入执行轮（`RUNNER_POLICY_LANDINGS=26` + 纯函数 `guestGateVerdict` + `--selftest` 5 例，
  删掉"实测身份=未登录"那一行检查立刻变红）。这些行**仍记 FAILED**，只是原因点名裁定并单独计数，
  不把闸门行为算成产品缺陷，也不反过来当成本条判据通过。
- triage 词表补 4 个桶（含"真实刀守恒占位行"这一整类 871 行），round-7 两份真实档实测 `unclassified=0`。
- `run-npm-script.mjs` 的打印把脚本名装在 `cwd=` 标签下（`NPMSCRIPT cwd=typecheck`），已改成 `cwd=… script=…`。
- 附近页两处产品修复（校区列表接 `loadSchools()`、头像改顶部锚定裁切）各配判点，
  变异测均能红；判据台从 79 → **83 条全绿**，补丁 166 条已落账且落完仍 `LEDGER_RESULT=PASS`。

## 100 目标 ① 那句"端口走配置文件"其实一直没有载体，这次补上了（2026-09-27 07:0x–07:1x）

`scripts/qa/ide-port.json` 早就在（里面还写着"CLI 全表没有 settings/enable/port 开关，
这一档只能人在 UI 里开"的理由），`ws-channel-up.mjs` 也有一份 `configPort()` 读它。
看起来这条子句是有载体的。

但我去查真正的消费者时，发现**没有一处读那份配置**：

| 消费者 | 它当时怎么拿端口 |
|---|---|
| `shoot-frameplan.mjs`（`--ws-taps` 出帧腿） | `process.env.WSX_PORT` → 没有就 `listeningWsPorts()` 发现，兜底 `9420` |
| `r-exec-ws.mjs` | `process.env.WSX_PORT || "9420"` |
| `ws-channel-up.mjs` | 读配置文件（全场唯一读它的那个） |

也就是说：唯一读配置文件的那个脚本，恰恰不是取证的那两条腿。
"配置文件存在"和"目标 ① 的子句有载体"之间差的还是那句老话——**建了不接等于没建**。

这一轮把读法抽成 `scripts/qa/ide-port-config.mjs`（唯一实现），三个消费者全部改从它取，
优先级按子句的意思排：**配置文件 → 显式 env 覆盖（做对照实验用）→ 回落**，
并且 `shoot-frameplan` 在"配置文件说的端口不在监听表"时**明打 `ws-drift` 再补发现候选**，
不静默换端口——这样这一腿的端口来源到底还是不是配置文件，读者看得见。

自测 `--selftest` 4 例（无 env 走配置 / env 覆盖优先 / env 不合法不许冒充 env /
监听表判定），并且**证明过它会红**：把代码里 `join(REPO,"scripts","qa","ide-port.json")`
指到一个不存在的文件名，第 1、3 例立刻 BAD、`exit=1`。

这里我自己踩了一次记录过的坑：第一次做这个变异时用
`s.replace('ide-port.json', …)`，它命中的是**注释里**的第一个出现，
代码一行没动，于是"变异后自测仍然 PASS"——一把不会红的自测被我差点当成"自测通过"记进账。
换成带引号的完整 join 表达式做靶子才真的红。
（同一条教训在 `feedback-negative-tests-must-be-capable-of-failing` 里已经写过一次：
不带 `/g` 的 replace 改到的是文件里第一个匹配。这次是同一个错的第二种表现：**靶子选在了注释里**。）

## 101 三把"没人读"的门与一次口径纠正：证据戳、语料版本戳、选择器是否真存在于产物（2026-09-27 07:4x–08:1x）

本轮 stage-6（24 腿，后台 `b2y0rcdrm`，日志 `tmp/qa/stage6.log`）还在跑 A 档 mock 的 1107 例，
等待窗口里做的全是**判据载体侧**的事：把上一节遗留的假红清零，并补三把此前不存在或没人读的门。

### 101.1 provenance 门的最后一类假红：约定之前的历史清单
`scripts/qa/verify-provenance-all.mjs` 在把跨带帧改为按行内 `bandSha` 判之后，只剩两处红：
`PROV_MANIFESTS_NO_SHA=1` 与生产者侧 4 个命名 offender。逐条查：
- 那 1 份无戳清单是 `reports/screenshots/round-1/manifest.json`（144 帧，磁盘上一张不缺，
  字节数与清单逐张对得上，`generatedAt=2026-09-19`）。给它补 gitSha 就是目标 ⑤ 禁止的"重打戳"，
  所以不补文件，改门：**打戳约定的生效时间由 git 派生**（`git log -S gitSha -- scripts/qa` 取最早一次），
  早于它的无戳清单记 `PROV_MANIFESTS_NO_SHA_LEGACY`，逐条打印并单列其帧 `PROV_FRAMES_LEGACY`，
  其帧不参与时间轴判决也不得在终报里当"产物级"证据引用；晚于它生成的无戳清单仍判红。
  约定起点实测 `2026-09-24T16:31:39.000Z`（提交 874ff52f）。
- 生产者侧 4 个 offender 全是夹具与一次性脚本：`scripts/qa/test-evidence-fabrication.cjs`
  写的字面量 `deadbeef` 正是本门自己的负例，另 3 个在 `tmp/`。改为**逐条打印的显式豁免**
  （`PROV_PRODUCER_EXEMPT …`），不是静默过滤。
- 新增帧守恒断言：`PROV_FRAME_ACCOUNTING in=out OK`，不等直接判红并抢在其它结论之前。
  实测 `in=4288 out=4288`，`CONSISTENT=4144 LEGACY=144 STALE=0 PRE_STAMP=0 UNRESOLVABLE=0 UNKNOWN_BAND=0`，
  生产者 `11/11 DERIVED_OK`，本门转 PASS。
- 负例（夹具目录 + `--root`）：约定之后的无戳清单、以及**根本不写 generatedAt** 的清单，
  两条都进 `PROV_MANIFEST_NO_SHA` 并 `exit=1`；"缺证据"不等于"可豁免"。
- 报告侧接线：`emit-round-report.mjs` 的 provenance 两行现在会打印 `约定前历史清单=` /
  `LEGACY_FRAMES=` / 整条 `PROV_FRAME_ACCOUNTING`。字段名不是照抄的——
  `tmp/qa/prov-row-fields-live.mjs` 从报告源码里抠出它引用的每个 `PROV_*`，再拿真实门输出逐个试匹配，
  实测 8 个字段 + 1 行锚点全命中（漏一个就是终报里一个 `?`）。

### 101.2 这一轮跑的到底是哪一版判据：ops 语料版本戳
先量到两个事实：`r-exec-cli.mjs:43` 的默认语料是 `reports/audit/round-6/ops`，而 stage-6 的 5 条执行腿
**一腿 --ops 都没带**；`scripts/qa/freeze-ops-copy.mjs` 造的 `reports/audit/round-7/ops` 被引用次数为 0，
盘上内容停在 2026-09-25 15:19（比本轮少 97 条 tapTarget 与一批 requiresReal）。
一份没人读的"冻结副本"比没有副本更危险——本轮我自己就先读了它，差点把"登录页已登录落寻觅"这条裁定
当成不在本轮语料里（它在两份里都有，只是行号漂了）。
新载体 `scripts/qa/verify-ops-corpus-stamp.mjs`（四模式，全部真跑过）：
- `--write` 记内容戳：实测 `24 文件 / 1107 例 / canon=b1d91bae3a50` → `reports/audit/round-7/ops-corpus-stamp.json`；
  `canon` 走递归排序键的稳定序列化（改缩进不算漂移），`bytes` 轴单列（重排版能被看见并说明来源）。
- `--check` 复算并与戳逐文件对；三种真实跑法都验过：真目录 PASS、改一条 `expected` ⇒ `名册未变⇒是正文被改（改判风险）`
  + `exit=1`、只改缩进 ⇒ 走「只有字节变了」分支。
- `--copy <目录>` 用同一把戳核对冻结副本；实测现有 `round-7/ops` 11+ 个文件与本轮所读不同 ⇒ 本步待执行腿结束后重造再复验。
- `--queue <file>` 判"同一轮所有执行腿是否读同一份语料"。这一把我一开始写错了形状（只看 `l.cmd`，
  真实腿是 `{name,file,args[]}`），于是 24 条腿识别出 0 条——它没有静默放过而是 `exit=2`，
  修好后实测 `执行腿=5 不同语料目录=1`。
- `--selftest` 3 个负例：纯缩进不得算漂移、改正文必须算漂移、空目录必须前置失败。
三把（stamp check / copy / queue per 队列文件）都进了 `emit-round-report.mjs` 的 `gatePanel`，
队列那把按 `ui-queue.round-<N>-*.json` 动态收集，不写死清单。

### 101.3 一次口径纠正：普查问的不是"点得到吗"
`census-tap-targets.mjs` 的注释写着"与执行器保持一致"，实际却另抄一份正则并多加了裸类名分支、又多扫 `pre`。
后果实测：旧口径报 `656 已点名 / 82 待补`，按**执行器 classesOf 的原文正则**（新写法是把那条正则从
`r-exec-cli.mjs` 里抠出来用，两边不可能再漂）重算 ⇒ `515 已点名 / 223 待补`，简报少摊了 141 条。
`TAPCENSUS_AXES` 现在打印口径来源正则，并加了"派生口径命中 0 条 ⇒ 直接 FAIL"的自保。
按新口径重摊：`BRIEF_TOTAL 页=56 条=223 批次=10 守恒=yes`（其中 135 条正文已写裸类名）。

我顺手想机械闭合那 135 条（脚本 `scripts/qa/emit-bare-tapfix.mjs`：只处理整页都是裸类名的页，
要求类名逐字出现在该页源码且 ±2 行挂着事件绑定、候选唯一，否则退回人判）。实测 `页闭合=13 补上目标=0 退回人判=41`
——**一条都没补上**。第一版诊断脚本据此说"55 个类名根本不存在"，这个结论是错的：它拿 `.vue` 源码当基准，
而类名多数住在子组件与样式里。正确的是以被测产物为基准，于是有了第三把门 ↓

### 101.4 判据点名的选择器，在产物里到底有没有这个元素
新门 `scripts/qa/verify-case-selectors-exist.mjs`（只读）：从每条判据抠 `tapTarget` + action/expected 里的
类名，在编译档里分五轴——页内 class token 精确 / 页内 wxml 文本（条件类名）/ 别处 wxml（子组件）/
**只在 wxss** / 完全找不到；后两轴判红（"样式里有"不等于"渲染树里有可点的"）。
守恒实测 `1302+327+230+1+10=1870`，mock 与 real 两档同数（两档同源同版本）。
判红 11 条：`.sms-send-btn`×3（早已改名 `.sms-btn`）、`.chat-session`×2、`.header-search`、`.picker-field`、
`.campus-hub__cert-btn`、`.village-back`、`.length-1`、`.publish-toolbar`（只在样式里）。
`--selftest` 有 5 条断言，正负都要验：它当场抓到我第一版把"条件类名"归错桶（`.cond-state` 其实进的是
class token 精确桶），也抓住了 `absent` 若判不出来本门就永远绿的假绿风险。
已接进 `emit-round-report.mjs` 的 gatePanel（两档各一行）。

### 101.5 登录页 38 例：26 红不是产品缺陷，但跳过原因串在说谎
`exec-A-mock-r7final` 现在 26 条 FAILED 全在 `pages/login/index`，`observed` 是
`top=pages/discover/index ≠ pages/login/index`，triage 已归到 `FAILED-landing-guard`。
按身份对照实测（38 例全都有两侧行）：guest/real 档 27 EXECUTED + 11 SKIPPED，A/mock 档 26 FAILED + 12 SKIPPED，
A/real 档 27 FAILED + 11 SKIPPED ⇒ 26 这个数只是单次运行的成员切面，不是稳定的 26 条。
复核员逐条查证给出两处纠正：
- 那 11 条 SKIPPED 里只有 LG31 真的没点名目标；LG11–LG26 带着 `tapTarget: ".input-field"`，
  真机是 `no such element`——表单在 `index.vue:704` 的 `v-else` 里（`showPhoneLogin=ref(false)` :57）。
  也就是说 `r-exec-cli.mjs:369-371` 的 "(本条没点名类名)" 只看 scrape 结果、不看 tapTarget，
  把两种完全不同的原因印成同一句话 ⇒ triage 的 vague-action / reststate-absent 分桶被它带偏（任务 #70）。
- 唯一可自动化的新点是 LG17（`#login-password`，两档 wxml 都命中且唯一），已连同 10 条 B 类写进
  `scripts/qa/cellplan-round7-login-skips.json`。
判据正文里那条"已登录进登录页应单跳落寻觅"（LG02/LG03）本身就是 ④ 的落地断言，且已在语料里 ⇒
把清登录态的用例限定到 guest 身份不会丢掉 ④ 的覆盖（#51 的前提条件成立）。

### 101.6 等待窗口里没做的事（有意不做）
没有改 `r-exec-cli.mjs`、没有改 `reports/audit/round-6/ops/*`、没有改任何被 stage-6 后续腿调用的脚本
（同一轮里让不同的腿跑不同代码，等于这一轮 1107 例不能整体引用）。语料改动一律排在 5 条执行腿结束之后：
#68（11 条死选择器）+ #71（223 条待点名，5 个 lane 正在并行出 lane 文件）+ #70（说谎原因串）
+ #69（重造冻结副本并用 `--copy` 复验），然后按改动点定向复测、再跑终报面板与显式路径清单提交。

### 101.7 补：#45 结案、新门的选择器极性与台账 19 行收口清单
- **#45（真实档整页锁屏作废）结案为"假设不可证 + 载体测不到"**，不是重跑：三份 corpus（guest-real-final 1107 行、A-real 1107 行、A-mock-r7final 部分 968 行）里提到锁屏类名的只有 6 行/份，evidence 串含锁屏字样 0 条，observed 为空 0 条（条条有真实 DOM 读数）⇒ 整页锁屏不可能长出这个样子。
  但这轮尝试暴露一个空字段：**`durationMs` 在 3182/3182 行里全是 0**，即该字段从未被写过 ⇒ 任何引用它的门或报表都在读常量。要判"跑到一半设备睡了"必须有每行时间戳。已并入 #70（与"说谎的 (本条没点名类名)"同一批改）。
- **新门 `verify-case-selectors-exist` 的极性教训**：第一版把 1870 个名字一视同仁判红，实测既误杀幽灵入口断言（H13 的结论就是"首页无搜索入口"，判红它等于把断言判反），又漏掉真判据（LG29 "留空点 .sms-send-btn" 因词表只写"点击"被漏）。
  改成**动词紧邻类名**（动词与 `.class` 之间只允许空白/冒号）或显式 tapTarget 才判红 ⇒ 判红 3 条、只提示 8 条，两档同数。
  `--selftest` 里两个方向各留一个夹具（`.search-ghost` 必须不判红、`.sms-ghost` 必须判红），否则"我修好了"只是自述。
- **`.sms-send-btn` 不是改名问题**：`apps/client/src/pages/login/index.vue:207` 写明短信链路整删、`:1221` 写明死样式已删，发码按钮现在在 `pages/register/index`（两档 wxml 有 `.sms-btn__spinner/__text`）。
  处置写在 `scripts/qa/cellplan-round7-deadselectors.json`：登录页两条改判成"入口不应存在"的幽灵断言（两档零命中即判点成立且可证伪），真行为在注册页重出 `MP-R7-REGISTER-SMS-*` 并在台账挂历史别名指回 LG29/LG30 —— 不删行、不把登录页判据悄悄搬成注册页判据。
- **目标 ⑤ 末句的可核对清单**（按 status 列取词、剥括注后统计 236 行）：未收口 **19 行** = 已修复待复验 12 + 待修复 3 + 未取证/需裁决 2 + 未取证 1 + 待复验 1。
  分两层：13 行欠渲染帧（stage-6 的 frameplan/reshoot/tour 三条腿负责；现配方 rows=79、lanes=5、stillBad=0、demotions=7，15 个页名都在配方里）；6 行欠裁定或换载体（已派证据 lane 出 `reports/audit/round-7/rulings-evidence.json`，处置由我逐条落）。
  台账正文与 ops 正文一样，要等 exec 腿跑完才动 —— `judge-stand-r7final` 腿正在读台账。

### 101.8 第四把新门：台账欠账行有没有人管；以及"组件作用域点不动"被量化
- `scripts/qa/verify-frame-debt-coverage.mjs`（已进 gatePanel；`--selftest` 含三种去向各认一次、登记表补上后必须转绿、读不到表头不得按 0 行判绿）。实测：台账 open=19 = A 配方 SHOOT 5 + B 归置表 2 + C 登记 0 + 在配方但非 SHOOT 5 + **裸行 7**（守恒 19=19）。
  根因是载具不同轴：`reconcile-frameplan.mjs` 只读 `frameplan-merged.json`，从不读台账状态列，它的 `conserved=true` 只对自己入出行数负责 ⇒ "台账说欠帧"与"配方说要拍帧"是两张表。已核实它对行数中性（只要求 out==in、只许降级），所以收口波往里追加 SHOOT 行会被接受；本轮不追加，因为 reshoot 腿正在排队，中途加行有让腿半途失败的历史教训（tail-4 那条腿红掉带走了后面三条）。
- **组件作用域是真实限制，不是猜测**：两条 lane 独立报告"页面作用域查询进不去组件"，我用两份完整 corpus（guest-real-final + A-real，n=630 行带 tapTarget）量化"找不到元素"率：
  只在组件 wxml 里 = 116/128（**90.6%**），只在页面自己的 .vue 里 = 150/434（34.6%），两处都有 = 22/68（32.4%）。
  这直接改变 ②/⑤ 的一条判断：**"已点名"不等于"点得到"**，还差一层作用域。已把这一轴做进门里（`SEL_SCOPE 页内可点=1629 只在别处 wxml=230`），并把"这些行该换 WS 腿"写进 #70④；WS 那条腿的 `WS_ACTS` 支持 tap/longpress/input/swipe/swipe-card/press-hold/re-enter-tab，是这 230 条的合法去向。
- lane 波（223 条待点名）已回两份：batch 01-02 出 16 A + 24 B，batch 07-08 出 6 A + 18 B；两份都自查过合并器的判据（闭包、file:line 逐字、动词守恒）。合并器确实递归找 `tapfix-lane-*.json`（`walk(OUT)` + 目录递归），所以 lane 因 outFile 同名冲突改写到兄弟文件不会丢——这一条我核过源码而不是信自述。
  它们报出的 B 类机制比 A 类更有价值，且都可核对：`commerce.enabled` 恒 false ⇒ 商城只剩 `.shop-sealed`；`membershipEnabled:false` ⇒ 账单页弹回我的页；`topicId` 不在 `ROUTE_QUERY` 里 ⇒ 话题详情整块在 `v-if` 后；campus/index 带 `?school=南京大学` 进入而 campus.ts:476 对非北京大学返回空列表 ⇒ 5 条列表用例无元素；`r-exec-cli.mjs:408` 因散文里"输入框"三字把判据送去 input 腿（#70③）；共享类名 first-match 让默认选中的 filter-chip 早退。

## 102 我自己把 stage-6 打断两次，以及一条腿本来就永远跑不动（2026-09-27 08:39–08:50）

### 事故一：我用"只读"的名义抢了独占租约
`write-gates-json.mjs` 不带 `--write` 时打印 `GATESJSON_RESULT=DRY`，我就当它是只读工具，在收尾前跑了一次"看一眼结论"。
实测它 DRY 路径照样 `acquireUi` 拿 `wechat-automation-cli` 独占锁、照样实跑 G7/G8/G9（会写库）。
后果：stage-6 的 `exec-guest-mock-r7final` 在 08:39:17 起跑，看到 `模拟器已被占用（gates-writer-44580 租期到 08:59:17）` 直接 exit=2，
队列 fail-fast ⇒ 后面 **16 条腿 NOT_RUN**，`QUEUE_TALLY OK=7 FAIL=1 NOT_RUN=16 sum=24/24 CONSERVED`（守恒没错，错的是我）。
教训写进 #74：名字里有 DRY/dry 不构成只读证明，判据是它有没有拿租约、有没有写库；用之前先看这两件事。

### 事故二（其实是真发现）：mock 档 × 游客 这条腿永远跑不动
同一条腿即使没有我的租约也会红：`RUNNER_GUEST_BAND mode=mock ok=false`，原因是 `session.ts:617` 的 `useMock()` 分支无条件注入 `mockUserSession`。
按守卫提示加了 `--guest-warmup` 再实测 `probe-guest-band.mjs`：**cold 与 warm 两腿都是 AUTOLOGIN_ON_OPEN** ⇒ 预热救不了，mock 包表达不了游客身份。
历史核查证明这不是回归：guest 从来没在 mock 档成功跑过（`exec-guest-real*` 三份 1107 行 loginVerify=not-logged-in；`exec-guest-mock-r7final/` 里连 `exec-results.json` 都没有）
⇒ 是我排 stage-6 队列时塞了一条载体满足不了的腿。处置：从续跑队列里剔除该腿，并写在 `reports/audit/round-7/stage6b-dropped.json`
（含证据路径、"这不是跳过而是 NOT_SHOOTABLE"、游客覆盖由 real 档承担的说法、以及 durable 修法：build 期不注入会话的 mock-guest 隔离档）。

### 顺带把配方按档位拆开，避免第三次打断
`frameplan-round7-final.json`（mock 腿读的）里有 6 行需要游客态且 disposition=SHOOT，而 `shoot-frameplan.mjs` 的退出码规则是
`noEvidence>0 ⇒ exit 2` ⇒ 这 6 行在 mock 档拍不到帧，会在几小时后把 tour / state-truth / evidence-holes / gates-json 全部带走。
做法：把这 6 行在 `frameplan-merged.json` 里改成 `NOT_SHOOTABLE_ON_THIS_BAND` 并写 `bandNote`（它们在 `frameplan-round7-guest-real.json` 里都在，逐 id 核过 0 落单）；
`reconcile-frameplan` 只降级不升级，会原样通过 ⇒ 干跑复核：`REWRITE=17 SHOOT=29 NOT_SHOOTABLE=27 NOT_SHOOTABLE_ON_THIS_BAND=6`，合计 79 守恒。
同时给 `verify-frame-debt-coverage.mjs` 补了"多份配方"的读法（一行在任何一份里是 SHOOT 就算会被拍帧），
`--selftest` 加两条：只读第二份的行必须被认成有帧可拍；一份配方都读不到时算全裸而不是静默绿。

### 现状
续跑队列 `scripts/qa/ui-queue.round7-stage6b.json`（16 腿）已起，`exec-A-real-r7final` 在跑（后台 `b0qqoc7p8`，日志 `tmp/qa/stage6b.log`）。
`write-gates-json.mjs` 的 DRY 语义修复故意排在这条队列的 `gates-json-r7final` 腿之后再做 —— 那是队列最后一腿，中途改文件等于让同轮不同腿跑不同代码。

## 103 ④ 六项待裁决落到载体、RING6 换成人判得动的只读探针（2026-09-27 08:56–09:04）

- **④ 的四项**：`verify-rulings-landed.mjs` 实跑 `RULINGS 四项=4 已落地=4 未落地=0`。但发现它此前**只被跑、不被计** —— 没进 `gatePanel`，任何一项退回未落地时面板照样报"全绿"。已接进去，并补一行可核对的报表行（数字直接取门自己的 `四项=/已落地=/未落地=` 统计行；我第一版写成"数 ✗ 行"，而它的标记根本不是 `miss`，那种行计数会永远等于 0，变成一条假的好消息）。
- **③ 三项后端契约的落点核对**（`git diff 094f7239..HEAD -- apps/api` 只有 Location 四件套）：引用回复与上传扩展名的**客户端半段**在 `verify-source-shape` 有 SPEC 判点，后端半段此前已单独提交；`MP-R2-CAMPUSPOST-010` 的失效否证锚点已由 `verify-disproof-anchors.mjs` 看着。台账里三行的处置列各自写着还欠什么（见下条）。
- **新门 `verify-status-vs-disposition.mjs`**：第 6 列说"到终态"、处置/证据列还写"仍欠 / 未跑 / 需人复验 / 状态停在…"的行，实测 **10/236**。第一版抓了 11 条，其中 `CHATINPUT-A01` 是假红 —— 它的状态本来就是「已修复待复验」，被"已修复"前缀匹配成终态。加了 `NON_TERMINAL_TOO` 排除并把这一类写成夹具里的第 5 例（该抓的两例、不该抓的三例都在）。默认 **advisory**：措辞列是散文，误报率没量够之前不配否决收尾；但必须印出来，否则下一轮只读第 6 列就会把这十行当结案。
- **④ 六行的证据与去向**已落成 `reports/audit/round-7/rulings-evidence.json`（54 条机器可核 / 22 条不可核 / 41 条复核命令），并据此写了 `reports/audit/round-7/open-row-dispositions.json`。三条判断值得单独记：
  · `VILLAGE-DETAIL-001` 挂的是"需人复验"，静态算术却已经给出答案 —— 表情面板再加 313rpx 且不在 `:781` 的条件里 ⇒ 那一态**必重叠**，它不是判不了，是还没立案去修；
  · `VILLAGE-PUBLISH-001` 的"两页字数阈值语义分歧"前提半数是错的：客户端各处都是 500（`constants/village.ts:18`、store `:445`），`limits.ts:47` 的 1000 是无人读的死值，服务端 5000，`post.vue` 的 `--over` 因 `maxlength=500` 到不了；
  · `TOUR-R2-004` 的字级判定问题在载具：仓里没有任何 dpr 阈值常量，巡检记录 dpr=3 而出图约 1x ⇒ 换成静态 px 算术判点，脚本无权改模拟器档位。
  `verify-frame-debt-coverage` 因此从「裸行 7 / 显式登记 0」变成「C=5、裸行 5、A=5、B=2、降级 2，守恒 19=19」。**故意不登记**的是那 5 条帧可判行（HOME-006、PROFILE-004、CAMPUS-HUB-002、CHATINPUT-A01、VILLAGE-011）—— 它们只能进取景配方或 SPEC，进这张表就是拿"已归置"洗掉帧债。
- **RING6 复验换成只读探针**：`probe-admin-post-counts.mjs`（GET only，趁真实执行腿在跑也能做）⇒ `post=277/270/236` 三张 `PROBE_ADMISIBLE=3/3`、字段数 27、`likesCount`/`commentsCount` 都在且 =1/1、`verdict=COUNTS_PRESENT` ⇒ "后端重启未做"被排除。顺带把这条环的老毛病写清：`g8-e2e` 里 RING6 只看 HTTP<300，字段集那半段只是打印 ⇒ 名字叫"两侧一致"却不会因不一致而红。探针按设计不判 PASS/FAIL，数值一致那一步留给收口波的 RING6 加强版（会写库，不能插在执行腿中间）。

## 104 三行帧债进了配方、三把门补了"未知旗标即红"、执行腿实况复核（2026-09-27 09:11–09:20）

- **①/②的收口清单从 19 行减到"全部有去向"**：`scripts/qa/apply-plan-additions.mjs` 把 §102/§103 故意留着的那 3 行帧可判债追加进 `frameplan-merged.json`（行数 79→82，守恒 yes，`PLANADD_RESULT=PASS`）。三条都带 route/identity/frameName/precondition/assertion，且落盘前逐条核过台账第 6 列确实是未收口词表 —— 负例（状态不是未收口 / 缺 assertion）此前都已实测会 exit 1，一条都不落盘。
  另外 2 行（`CAMPUS-HUB-002`、`VILLAGE-PUBLISH-001`）本来就在配方的 SHOOT 集里，所以"故意不登记"的 5 行现在全部走帧这条路，登记表 `C=9` 里没有它们。
- **拍 CHATINPUT-A01 前先探它的前提**（不是"配方里有就一定能拍"）：三档产物 `grep -rl ChatInput` 命中文件数都是 0，源码 `components/chat/ChatInput.vue` 也确实不存在 ⇒ 这张"删除后"的帧现在拍出来是真证据，不是一张会指错方向的帧。
- **验证没跑脏腿**：把 reconcile 的 `--out` 指到 `tmp/qa/planprobe/` 干跑一遍（不动 `frameplan-round7-final.json`，那是腿 9 的输入），配方 SHOOT 29→32、档位分布 `REWRITE=17 SHOOT=32 NOT_SHOOTABLE=27 NOT_SHOOTABLE_ON_THIS_BAND=6`；同一份探针配方喂给 `verify-frame-debt-coverage` ⇒ `FRAMECOV open=19 A=8 B=2 C=9 裸行=0 … RESULT=PASS`。权威 final 配方仍由队列腿 7 自己 `--apply` 写，权威与探针的差别只是"谁按那个按钮"。
- **一把自己咬过我的门补了旗标校验**：上面那次 coverage 我先用 `--plan`（单数）跑，`arg()` 把它当没传、回落默认两份配方，于是刚追加的 3 行仍报"裸行 3"—— 看起来像"追加没生效"。真实旗标是 `--plans`。给 `verify-frame-debt-coverage` / `verify-ops-corpus-stamp` / `verify-case-selectors-exist` 各加一条"未知 `--旗标` ⇒ exit 2 并打印本门认的集合"：拼错模式名的后果是**一个模式都不跑**（stamp 门尤其明显，它四种模式全靠旗标选），静默绿比红坏。三把门 `--selftest` 加旗后仍 PASS，负例三把都 `exit=2`（用 `out=$(...)` 取码，不用管道 —— 管道后 `$?` 是 `tail` 的）。
- **执行腿实况（别拿腿日志当进度）**：`exec-A-real-r7final` 到 699 行 = `EXECUTED 115 / SKIPPED 583 / FAILED 1`，档位 `real@f0677920`，租约心跳与 `exec-results.json` mtime 同步在 09:11:20；进程枚举 `r-exec-cli` 命中数=1。顺带记一次探针口径错误：`CommandLine -match 'run-ui-queue'` 数出 4 个"队列"，其实只有 1 个 node 编排进程，另 3 个是它的 bash 包装（命令行里含同一个字符串）⇒ 数驱动进程要按 `解释器+脚本` 过滤，不能只按脚本名。
- **`--real-cases-only` 的真实语义需要重新判**（#70① 的说法要改）：这条腿里 583 行 `requiresReal:false` 的用例并没有被挡在计划外，而是照样写行并标 SKIPPED；且行里**没有** `skipReason` 字段，跳过原因被塞进 `failureReason`（样本首字"真…"）。这是否让下游把 band 跳过当失败，交给只读分析腿 `tmp/qa/exec-defects-analysis.md` 逐条引 `file:line` 判，判完再动 `r-exec-cli.mjs` —— 腿还在跑，不改它自己。
- 另派一条只读腿盘点台账 19 行未收口 + 56 行"已修复待复验"今天各自有什么载体（`tmp/qa/openrow-inventory.md`），用来在收口波前把"还差什么"变成一张清单而不是凭印象。

### 104.1 排队器加了一等公民"advisory 腿"，并实测过语义
`scripts/qa/run-ui-queue.mjs` 原来只有一种失败语义：任何腿红 ⇒ 后面全部 `NOT_RUN`。stage-6 那一轮就是这么白的：一条只读门腿红，把后面十几条出帧腿全带走了。现在：
- 腿可带 `"advisory": true` ⇒ 红记成 `ADVISORY_RED`、**后面的腿照跑**、结尾仍然 `QUEUE_RESULT=FAIL`（exit 1）。红不会因为放行而变绿，被放行的只是"后面的腿"。
- 超时永不让路（`leg.advisory && !timedOut`）：超时意味着租约/模拟器本身出事，继续跑只会产出被并发污染的证据（§101 那次 214 行 58 条"探针没回答"就是这么来的）。
- 实测（`tmp/qa/adv-legs.json` 四条腿 + 空锁目录 `QA_LOCK_DIR`，不碰真锁）：`ADVISORY_RED=1 OK=1 FAIL=1 NOT_RUN=1 sum=4/4 CONSERVED`，第 2 条腿确实在第 1 条红之后跑了，第 4 条在阻断红之后仍 `NOT_RUN`。
- stage-7 生成器给 4 条纯复量腿打了这个标（`gate-selectors-exist-mock`、`gate-real-coverage-stage7`、`stamp-check-stage7`、`queue-homogeneity-stage7`），开窗/执行/重建/冻结那 15 条保持阻断 —— 它们红了后面的腿就没有意义。
- 顺手把 `merge-tapfix-lanes.mjs` 的 dry 落盘改名成 `tapfix-merged.dry.json`：dry 打印"只出计划"却无条件覆写 `tapfix-merged.json`，而 `emit-tapfix-register.mjs` 读的就是这个名字 —— 一张没人核对过的计划不该冒充核对过的计划（§101「DRY 不是只读」的同一类）。

### 104.2 交互点名刀的独立复核对出两个数
`merge-tapfix-lanes.mjs` 的独立复核（逐条回源核对 lane 自报的 file:line + 类名逐字 + 普查守恒）结果：`TAPFIX_ACCEPTED=56 REJECTED=0 普查缺口=223`，每页 `planned == ok + unverifiable` 全部守恒。⇒ 真正的缺口是**其余 167 条被 lane 判"不可核"**，而不是"lane 撒了谎"。这两种欠账的处置完全不同，所以按批次切成三刀（01–03 / 04–06 / 07–10）各派一条只读腿重判，判据是五种去向：`SELECTOR_MISSED`（源里有真名，可回收成 tapTarget）/ `COMPOSED_OR_SCOPED`（元素在但名字查不到，要写清机制）/ `CRITERIA_NAMES_NOTHING`（判据点了个产品没有的东西 ⇒ 收紧判据或改成非帧判）/ `WRONG_BAND`（这条档表达不了 ⇒ 点名哪一档能）/ `NO_ELEMENT_NO_FIX`。产物 `tmp/qa/unverifiable-recheck-{1,2,3}.json`。

### 104.3 新建收口波缺的那件载体：`scripts/qa/apply-ops-cellplans.mjs`
三份手写计划（`cellplan-round7-deadselectors` / `-login-skips` / `-taptarget`，合计 31 行）之前**没有任何消费者** —— `merge-cellplans` 写的是台账格子，`merge-tapfix-lanes` 写的是"普查里没点名"的 lane 结果，形状与语义都不同。所以 #68/#51 的 ops 正文改动一直没有落盘工具。补上之后带四道闸：
- 新名字必须在**两档产物该页 wxml 里逐字命中**才允许落盘（`class="…"` 属性按空白切整词比，不做子串：`.post-content` 命中 `post-content-extra` 这种前缀假阳性，选择器门上一版就误判过）；`.class` 与 `#id` 都收（`c.tapTarget` 是执行器直接当选择器用的，不经类名抠取）；
- rename 组必须能在正文里找到那个死名字，找不到就拒 —— 否则"改名"会变成偷偷换判据；
- B 组（不可自动化）只打 `automatable:false + notAutomatableReason + 载体` 三个标记，**一条都不删**；落盘前后各数一次用例总数，不守恒 exit 1；
- 全部改动先在内存里做完整份再一次性落盘（每个 manifest 先自动续号备份），半途退出不会留"改了一半"的判据台。
实测：dry `A=9 B=22 拒绝=0，涉及 10 个 manifest 的用例数=581（改前=581）OK`；负例（假类名 + 不存在的 id + 无 why 的盖章）三条全被点名并 `exit=1`，ops 一个字没动。
第一版我自己写坏了两处（都是"我的工具红了不等于环境红了"）：① 拿 `class=".campus-guide__btn"` 去比产物（产物不带点）⇒ 把 9 条真名字全判成"产物里没有"；② 尾巴上留了一段 ESM 里 `require()` 的死代码 + 先写盘后打标记的错序，B 组标记会被自己冲掉。都已改，重跑同上。

### 104.4 章出来的标记必须有读者，否则就是又一份没人读的冻结副本
`automatable:false` 单写不读等于没写。已经接上的读者：
- `census-tap-targets.mjs` 多一个桶并重写守恒：`含交互动词 = 点名 + 待补 + 已盖章不可自动化`（实测 `738 = 515 + 223 + 0 守恒 yes`，盖章数当前为 0 因为 B 组还没落盘）。这样"待补变少"必须被解释成"有一批改成了欠裁决"，不能悄悄缩水。
- 还欠两个读者，收口波一起做（都在执行器一侧，腿还在跑不能改它）：`r-exec-cli` 遇到 `automatable:false` 要显式跳过并写原因（并入 #70 那一批），`emit-round-report` 把盖章数打印进终报。
- `verify-case-selectors-exist` 故意**不**跳过盖章条目：它点名的仍是"正文里引用了产物里不存在的名字"，这件事与那条判据今后跑不跑无关，留着看得见。

## 105 收口波 runbook（stage-6b 跑完之后按这个顺序，别再现场推）
前提：`ui-queue.round7-stage6b` 16 条腿全部结束（含 `judge-stand-r7final`、`reconcile-frameplan-r7final --apply`、两条 reshoot、`tour-dual-r7final`、`gates-json-r7final`）。**在此之前不许动 ops 正文、台账正文、三档产物，也不许改 `r-exec-cli.mjs`**（腿 1/2 还要用它；改了会让同一轮的两把身份刀读不同代码）。

1. 复核 stage-6b 的账：`queue-state.json` 每条腿的状态与 `resultLines` 逐条读，红腿必须有三样东西才算交代过 —— 成因、是产品缺陷还是载具缺陷、后续腿。守恒看 `QUEUE_TALLY … CONSERVED`。
2. 落 56 条交互点名：`node scripts/qa/merge-tapfix-lanes.mjs`（dry 已实测 `ACCEPTED=56 REJECTED=0`，dry 现在写 `tapfix-merged.dry.json`）→ 核对无误再 `--apply`（自动续号备份 `.pre-tapfix.N.bak`）。
3. 落三份手写计划：`node scripts/qa/apply-ops-cellplans.mjs`（dry 实测 `A=9 B=22 待改=31 拒绝=0，涉及 10 个 manifest 用例数=581 守恒 OK`）→ `--apply`。
   **落完必须立刻复跑一次 dry 证明幂等**：预期 `已落地=31 待改=0 … OPSCELL_RESULT=PASS`。这一步没做，#68/#51 的"已落地"就只是我说过。
4. 身份限定：`node scripts/qa/tag-ops-identity-scope.mjs`（dry → --apply），#51 的 26 例 login 归 guest。
5. #70 执行器那一批：按 `tmp/qa/exec-defects-analysis.md` 的 TRUE 项逐条改（含 `automatable:false` 的显式跳过与原因、每行时间戳、`durationMs`、input 腿路由、组件作用域点名）；FALSE 项写进 NOTES 说明当初误判在哪。**别把只读分析的结论直接抄成事实**——每条落码前自己在 `file:line` 再看一次。
6. 台账正文：把 ①②③④ 这轮真长出载体的行改成终态（`patch-ledger-cells.mjs` + `merge-cellplans.mjs`，先 dry 查跨 lane 的 (id,col) 冲突），改完跑 `verify-status-vs-disposition`（advisory，但必须逐条看）与 `verify-frame-debt-coverage`（必须 `裸行=0`）。
7. 语料定版：`verify-ops-corpus-stamp.mjs --write` 重记戳 → `freeze-ops-copy.mjs` 重造 `reports/audit/round-7/ops` 冻结副本 → `--check` 与 `--copy` 都必须绿（#69）。
8. 重建三档（此时 DevTools 必须没有窗口在跑，见 §101 事故一）：mock / real:isolated / showcase-isolated → `verify-band-freshness` → `verify-case-selectors-exist` 两档各一次。
9. #74②：补一条 guest-mock 档构建（mock 档表达不了游客态，那 16 条腿才会动）。
10. stage-7 队列（19 条腿，4 条已标 advisory）：`node tmp/qa/write-stage7-queue.mjs --write` 重新生成 ⇒ 读第 2/3 步的合并回执来定"改动页"清单（现在 dry 看到的是 6 页/全量退化，因为它读的是旧的 `tapfix-merged.json`）→ `run-ui-queue.mjs --legs scripts/qa/ui-queue.round7-stage7.json --out reports/audit/round-7/ui-queue-stage7`。
11. 帧与索引：`exec-frames-to-corpus.mjs --results <每个 exec-results.json> --corpus reports/screenshots/round-7-exec --identity …`（#52），再 `check-frame-orphanage` + `audit-frame-verdicts`。
12. G8/G9 + RING6 加强版复跑（会写库，按 [[feedback-destructive-db-protocol]] 先备份 + ROLLBACK 干跑），④ 的遗留测试数据处置走已裁默认。
13. 终报：`emit-round-report.mjs`（面板现在多 `apply-ops-cellplans --dry` 一行；锚点没打出来会显示成"(没打出 …)"而不是被静默丢掉）→ §10 写"还欠什么"→ `make-commit-list.mjs` 出显式路径清单，提交范围由用户点头（帧目录是否入库仍未决）。

依赖关系说明：2/3/4 必须在 1 之后（腿 1/2 在读 ops），7 必须在 2/3/4 之后（戳要盖住改完的正文），8 必须在 7 之后（判据台改了不重建产物，判据台与帧就对不上），10 必须在 8/9 之后，11/12 在 10 之后，13 最后。

## 106 只读复判第一刀回来，根因不是"判据含糊"而是执行器抠名字太窄（2026-09-27 09:43）
`tmp/qa/unverifiable-recheck-2.json`（批次 04–06，46 条全部重判、入=出守恒）：`SELECTOR_MISSED=1 COMPOSED_OR_SCOPED=11 WRONG_BAND=6 CRITERIA_NAMES_NOTHING=24 NO_ELEMENT_NO_FIX=4`。三件要记账的事：
- **根因**：`r-exec-cli.mjs:134 classesOf` 的正则只认 BEM 形态（必须含 `__` / `--`），于是 `.save-btn` / `.quick-filter` / `.action-btn` 这类**产物里真实存在、也能点**的裸 kebab 类名在执行器眼里等于没点名 ⇒ lane 报"不可核"其实是我方载具看不见。普查里那个 `bareOnly` 桶（"待补里只有裸类名的"）就是这件事的残影，而普查口径是从执行器源码里现抠的，所以**改 `classesOf` 一处，普查的"已点名"会自己涨上去**，不用手改任何判据正文。
- **但不能只放宽**：裸类名容易多命中（`.title-input` 一页里可能好几处）。所以同一条改动必须带上"命中数>1 就在行里写 `targetAmbiguous=N`，不许默默点第一个"——否则放宽变成新的假绿来源（点到了隔壁元素还判过）。这条并入 #70。
- **`pageWxmlExact` 也有假阳性**：VI17/VI18 的"页里有这个名字"是同目录兄弟页的 wxml 命中，真身在子组件 `PostCard.wxml:274` ⇒ 光按页文件判存在会点到错的按钮。取景/点名相关的门要按**组件归属**而不是同目录存在来判（并入 #68 的核对口径）。
- 另 11 条 `COMPOSED_OR_SCOPED` 是 uni-app 把 `class="x" :class="{…}"` 编成 `class="{{['x',…]}}"`：类名真的渲染了，但产物里是绑定表达式 ⇒ 静态 wxml 抠不到，需要一次"第 N 个子元素"式的点法或组件内点名。这类既不是产品缺陷也不是判据含糊，别再拿它当"判据不可判"写进登记表。

## 107 执行器只读审计回来：两条我原来的说法是错的，两条比我想的更严重（2026-09-27 09:44）
`tmp/qa/exec-defects-analysis.md`（读了 12 份 round-7 语料、10611 行，全程只读）。逐条对我在 #70 里的说法判 TRUE / PARTLY / FALSE，并给 `file:line`：
- **#70①「说谎的跳过原因」= PARTLY，而且罪名搞错了位置。** `--real-cases-only` 确实不过滤计划（开页、探针，然后记 SKIPPED，`r-exec-cli.mjs:375-376, 389, 445-449`），但原因文本是准确的；`failureReason`/`skipReason` 混用**没有伤到任何消费者**（四个下游全按 `status` 判，triage 的 15 条正则覆盖了全部字符串，unclassified=0）。真正的谎在两处：`:423-425` 用 `cls` 断"探针说物件在"，而探针集合（`:353`）**不含 `tapTarget`**（`:398`）⇒ **51 行在断一个从没量过的答案**；`:371` 的「本条没点名类名」在 **928 行**上是假的 —— 而 triage 的 channel/reststate 分桶（`:155-161`）正是读这句话。
- **#70④ input 腿路由 = TRUE 且是证据有效性问题。** `:408` 只按 `action` 里的"输入/填写/粘贴"判，且按条不按元素 ⇒ **111 行 EXECUTED** 把 `123456` 打进了 `.hero__back`、`.post-header__submit`、`.agree__chk` 这类根本不是输入框的东西，166/178 连报错都没有 ⇒ 这些"通过"不可信。**后果**：stage-7 的定向复跑清单必须并入这 111 行所在的 manifest（否则修了载具却没重拍被污染的那批证据，等于把假绿留在终态里）。
- **#70⑤ 组件作用域 = TRUE，且比"换 WS 腿"更悲观。** 只有组件里有的类名读数存在 = **0/1485**，页内类名 59%；而 WS 执行器同样只用单层 `p.$`，且本轮没产出任何语料 ⇒ 「换 WS 就能看组件」这个设想**没有被验证过**，不能当成 ① 那 54 条 NEEDS_UI_FRAME 的兜底载体。要么给执行器加组件内查询，要么这些行显式改判成"当前载具不可见"并写明换什么载体能判。
- #70② `durationMs` 与 #70③ 每行时间戳 = TRUE（单一赋值点 `:131` 恒 0；round-6 的 WS 语料反而是填好的 1107/1107；没时间戳导致 `exec-results-to-checkpoint.mjs:58` 只能写 `startedAt:null`）。
- 建议修序 `4 → 1 → 3+2 → 5` 我接受，但 **5 不能排最后就完事**：它决定 ① 的 54 条里有多少"本轮判不了"，所以它的结论要在终报 §10 里成数，不能只是"排到了"。

### 107.1 污染行不再是口头账：`scripts/qa/emit-carrier-defect-rerun.mjs`
按"行里下发过 `input:` 且目标类名不含任何输入框词根"现算（词根刻意放宽，宁可多跑几个页）：`语料=12 个｜被污染行=125｜去重后 24 个 (manifest,id)｜涉及 8 个 manifest`，写成 `scripts/qa/rerun-carrier-defect.json`。与只读审计的 `111 行 / 178 次动作` 的差 = 我那 14 行"发过 input: 但没记下目标名"的保守计入 —— 两边口径不同，都保留在纸上，不合并成一个数。
已并进 stage-7 生成器：改动页清单从 6 页涨到 **12 页**，并打印 `并入 #70④ 污染 manifest=8 个（行数=125）`（清单文件缺失时它会明说"本队列不含定向复跑"，不会静默少跑）。
两件我自己踩过的坑一并记下来：新脚本第一版 `--selftest` 只写进 KNOWN 却没实现（一个什么都不做的旗标正是这几天反复报的那类陷阱）⇒ 直接从允许集里删掉而不是假装实现；以及 ASCII 双引号写进中文双引号字符串里又触发了一次 `SyntaxError`（第 4 次）⇒ 从此新写 JS 一律"先 `--check` 再跑"，两步在同一条命令里。

## 108 「页内有没有这个名字」按目录前缀判是错的，三个只读腿各自独立撞上也证实了（2026-09-27 09:48）
- 复判第一刀（批次 01–03，`tmp/qa/unverifiable-recheck-1.json`）：`68 计划 − 16 已收 = 52 条全判`，分布 `SELECTOR_MISSED=12 COMPOSED_OR_SCOPED=12 CRITERIA_NAMES_NOTHING=5 WRONG_BAND=7 NO_ELEMENT_NO_FIX=16` ⇒ 又有 24 条"不可核"背后其实有真元素（12 条可直接补 tapTarget：`CX20 .topic-card`、`CI17 .circle-card__count`、`CS07 .temp-banner`、`CS20 .quote-reply-bar`、`CS24 .unread-hint`、`VD01/08/09/15/16/20`…）。
- 它与第二刀（04–06）各自独立指到同两处载具缺陷，所以这次不再等验证、直接改：
  1. **`classesOf` 只认 BEM**（`r-exec-cli.mjs:134`）⇒ 判据已经 spelled-out 的 `.topic-scroll` / `.chat-scroll` / `.detail-page` / `.post-tag` 在执行器眼里=没点名。这条记在 #70⑥，放宽必须同时带"多命中就记 `targetAmbiguous`，不许默默点第一个"。
  2. **`verify-case-selectors-exist.mjs:107` 用目录前缀判"页内有没有"** ⇒ 同目录兄弟页冒充本页（`.reply-input` 真身在 `campus/topic-detail.wxml`、字面 `.post-image` 只在 `village/post.wxml`）。已改成"必须等于 `<页>.wxml`"，实测代价与守恒都摊开：`页内精确 1302→1276（−26）`，去向是 `页内文本 327→339（+12）` 与 `别处 wxml 230→244（+14）`，`12+14=26` 正好守恒；**判红轴没动**（`死名=11 / 判红=3 / 只提示=8` 与改前一致），`--selftest` 仍 PASS ⇒ 这次收紧只把"绿的位置"挪对了，没有制造新红也没有掩盖旧红。
- 第三条是同一族的渲染事实：uni-app 把 `class="x" :class="{…}"` 编成 `class="{{['x',…]}}"` ⇒ 静态 wxml 里"x"不再是整词 token。这类既不是死名也不该算"页内精确"，两刀都独立数到了它。
- ① 的口径今天第一次有了机器数字：台账里 `已修复（源码级判点…）` 共 **83 行**，其中 18 行进配方（本轮会出帧）、8 行有归置、**57 行既没帧也没机器可读的声明**（状态格里有那句"帧与像素两侧都取不到该量"的散文，但没进门读得到的地方）。已派只读腿 `tmp/qa/srconly-owed-plan.json` 逐行判"真的帧不可判"还是"贴错标签"，判完再决定哪些进配方、哪些进登记表——**不允许整批盖章**，那正是"拿重打戳把红洗成绿"。

## 109 腿 1 收口、腿 2 接上；两条只读刀又回收 13 个可点真名（2026-09-27 09:49–09:51）
- `exec-A-real-r7final` 以 `RUNNER_RESULT=OK` 收在 `executed=195 failed=6 skipped=906 出帧=195 页组=58 真做过的交互=36`，跳过原因分解是 `非真实用例=871 / 交互没点名=16 / 交互下发失败=11 / 判据无可判物件=2 / 交互禁触=2 / 交互动词=4 / 探针无结果=0 / 出帧失败=0 / 锁屏挡住=0`。`探针无结果=0` 这一项值得留着看：§101 那次并发污染的签名就是"探针大面积没回答"，这条腿是干净的。
- 离线归置这 6 条红（`tmp/qa/triage-A-real-r7final.*`，只读、不碰租约）：**6 条全是 `FAILED-landing-guard`，且全在 VIP 三页**（`vip/promo-code`、`vip/index`、`vip/bills` 都落到 `pages/profile/index`）。`TRIAGE_GATE=PASS unclassified=0`，但三组的处置自己写着"复测腿 GG-vip-* 已入账未跑" ⇒ **PASS 不等于结案**，工具已经把这句话打出来了；这三组的账由 guest 刀（现在这条腿）与 stage-7 的 guest-mock 腿认领，A 档这一侧不比对成员（`COVER_SKIP` 三条，档位身份不同）。
- 复判第三刀（批次 07–10）与 ① 的源码级行还在跑；第一、二刀的 `SELECTOR_MISSED` 已由脚本现算成 `scripts/qa/cellplan-round7-recovered.json`（13 行、4 个 manifest；id→manifest 从 ops 里查，不手抄），过 `apply-ops-cellplans` 的两档 wxml 逐字核：**拒绝=0、守恒 177=177**。它已进 applier 默认计划集（`计划=4 份 A=22 B=22 待改=44 拒绝=0`）与 stage-7 生成器的点名清单（`cellplan 点名=24 条`）。
- `COMPOSED_OR_SCOPED` 那 23 条**没有**塞进这张表：它们欠的是组件内查询/第 N 子元素（#70⑤⑥），换个名字就是把载具缺陷记到判据头上。

## 110 #70 落地：执行器放宽抠名 + 输入腿按元素判 + 每行时间戳（2026-09-27 09:54–09:58）
腿 2 用的是已加载进内存的旧代码，所以改 `r-exec-cli.mjs` 只影响 stage-7（正是我要的：终轮用修好的载具跑）。改前五件都对照 `tmp/qa/exec-defects-analysis.md` 的 `file:line` 复核过，没有照抄结论：
- **⑥ `classesOf` 放宽**：BEM 之外再抠裸 kebab（`.save-btn`、`.topic-card`）。必须带 `(?![\w-])` 尾锚 —— 第一版没有它，`.circle-card__count` 被抠成幽灵目标 `.circle-card`（页上根本没这个类），这条守卫由自检里一条样本盯着。
  效果是可以量的：普查口径改成 **eval 执行器同一个 `classesOf` 函数体**（不再"用正则抠正则"，那种写法会被字面量里的括号截断，且 heredoc 传反斜杠已两次被吃掉），实测
  `已点名 515 → 650（+135）`、`待补 223 → 88（−135）`、`bareOnly 135 → 0`、`含交互动词 738 = 650 + 88 + 0 守恒 yes`；
  交叉核对：用过 tapTarget 的行数改前后都是 **315**（102+213 = 5+310），也就是说 +135 全部来自"正文里本来就写了裸类名、执行器看不见"这一类 —— **不用改一条判据正文**就回收了 223 里的 135 条。
- **④ 输入腿按元素判**：`wantsInputLeg(action, sel)` 要求"动词说输入 **且** 目标名字像输入框"，否则退回点击并在 `tapNote` 里打"输入腿动词对不上元素，退回点击[…]"。这就是那 111 行被污染判决的机制（`123456` 打进 `.hero__back`）；旧语料不复用，定向复跑清单已由 `emit-carrier-defect-rerun` 并进 stage-7（12 页）。
- **②③ 每行 `at` 时间戳 + 真实 `durationMs`**（`CUR_T0` 在每条用例开头打点；旧值恒 0 且没人读）。
- **①的两处"说谎"按审计的更正来**：探针集合与"本条没点名类名"这句话现在都走 `judgeTargets(c)`（含权威 `tapTarget`），不再出现"点了 tapTarget 却报没点名"（928 行）和"探针说物件在"却没探过（51 行）。
- 多命中守卫（推断名在同页 >1 个）：跳过该目标并在原因里点名跳了几条，`stats.tapAmbiguous` 计数；权威 tapTarget 不受此限（那是判据作者的选择）。
- 自检：`EXEC_SELFTEST=PASS cases=14`，新增 9 条覆盖放宽/幽灵名/tapTarget 合并/`probeCount`/输入腿三种组合；`TAPCENSUS` 里也放了一条"classesOf 自检不符 ⇒ 普查不可用直接 exit 2"的守卫，防止将来有人再改抠名口径而门还在按旧口径数。
- 仍欠 #70⑤：组件作用域查询（0/1485 读数存在）与"第 N 个子元素"点法没实现 —— 它决定 ① 那 54 条 NEEDS_UI_FRAME 里有多少本轮判不了，终报要成数。

### 111.1 判据选择器门也换成"与消费者同一份实现"，顺手清掉 484 个幽灵名字
`verify-case-selectors-exist.mjs` 原来自带一套 BEM+BARE 正则与一张自己发明的动词表。两处都不是执行器：
- BARE 没有 `(?![\w-])` 尾锚 ⇒ 从 `.circle-card__count` 里抠出页上根本不存在的 `.circle-card`。aligning 之后 `selectors=1870 → 1386`（−484 个伪名字），`死名` 仍是 11、**判红仍是 3、只提示仍是 8** ⇒ 这次收紧没有制造新红也没有放掉旧红，只是把"门在数自己的幻觉"数回来了。
- 动词表：我先写成"含裸 `点` 与英文 tap/click"，`--selftest` 立刻把 D7（`emit('searchTap')` 的幽灵入口断言）判红 —— 正是这扇门当初修正过的老毛病回来了。执行器真正的门是 `r-exec-cli.mjs:106 TAP_RE`（只有中文动词、无裸"点"、无英文），所以**改成从执行器源码里把那条正则取出来用**，取不到 exit 2。取法也不用"正则抠正则"（字面量里的括号会截断），按行切。
- 现在这扇门与消费者共用三件东西：`classesOf` 函数体、`TAP_RE`、"含交互动词 ⇒ action 里所有抠得到的类名都会被点"。实测 mock 与 real 两档数字完全一致（`守恒 yes`）。

### 112 动词轴也只留一份：`getApp()` 不再算"这条要点东西"，英文 `tap` 终于真的会点（2026-09-27 10:04）
第三刀（批次 07–10，69 条全判、自带 151 条引用核验全过）抓到两件互相咬住的事：
- **普查的动词表比执行器宽**：`census-tap-targets.mjs:22` 自带一张 `/i` 无边界表 ⇒ `getApp()` 里的 `tAp`、「长按提示」「勾选态」这类名词都被算成交互用例，虚增待补。现在普查**从执行器源码取那一行 `TAP_RE`**（取不到或边界守卫丢了 ⇒ exit 2，仍不许回落到自己抄的表）。
- **执行器的动词表比判据窄**：lane 落进 ops 的 `newAction` 写的是英文 `tap .x`，旧 `TAP_RE` 只有中文 ⇒ 那 13 条名字点得对、执行器却根本不走点击分支（静默不测，比测了判错更糟）。`TAP_RE` 加上带字母边界的 `tap|click|input|scroll|swipe|trigger|press`。
两处一起改完的账：`含交互动词 738 → 705（−33 假阳性）`、`点名 650 → 629`、`待补 88 → 76`、`bareOnly=0`、守恒 yes；选择器门 `判红 3 → 4`（多出来的那条正是"英文 tap 现在真会被执行器去点、而它的目标在产物里不成元素"——是真发现，不是门自己晃）；`EXEC_SELFTEST=PASS cases=18`（新增 4 条：英文动词认、`getApp()`/`searchTap` 不认、中文动词仍认）。
剩一件事没做，也写清楚免得被当成做了：**#70⑤ 组件内/nth 点法我不在没跑过真机之前实现**（审计给的"换 WS 腿"同样未验证：WS 执行器也是单层 `p.$` 且本轮零语料）。它决定 ① 那 54 条 NEEDS_UI_FRAME 里有多少"本轮载具判不了"，终报 §10 按 `0/1485` 这个实测数成数，不猜。

### 112.1 口径一变，"条数相等"这类代理判据就成了新的假红 —— merge-tapfix-lanes 的两处
放宽 `classesOf`/动词轴之后普查待补从 223 缩到 76，于是 `merge-tapfix-lanes` 出现两种新形状，都改了并留痕：
1. **整页守恒从"条数相等"换成"普查要的每条都被交"**（相等只是集合相等的代理，代理失效就用真集合）。硬拒留在真正的反方向：普查点名要的 lane 没交 ⇒ 整份不采信，并列出缺的 id。
2. **lane 多交的名字按 surplus 收下**（打上 `surplus:true` 与出处），不再当成"整页作废"：多一个逐行回源核过的权威 `tapTarget`，比让执行器去猜正文类名更准；但下面几条硬校验一条不减（选择器形态、源码行号逐字、事件绑定）。被标 unverifiable 却已不在待补集里的，改成打印 `TAPFIX_UNVER_OFFLIST` 忽略而不隐瞒。
实测 `TAPFIX_ACCEPTED 56 → 34、REJECTED=18、普查缺口=76`。**34 不是 56 的缩水成功**：那 18 条被拒里有整页因"普查要的没交"而被整份不采信（连带丢了它的 surplus），这正是我下一步该做的 —— 收口波按新的 76 条重发 briefs（`emit-tapfix-briefs` 现算），而不是继续吃 223 那份旧简报。这个数我按原样报，不挑对自己好看的半边。

### 113 ① 的"源码级"族群有了逐行判决，其中 4 行撞上我自己立的棘轮（2026-09-27 10:11）
只读复判（`tmp/qa/srconly-owed-plan.json`，57 行全判、集合差 = 0）：`NOT_FRAME_JUDGEABLE=28 FRAME_JUDGEABLE_NOW=16 STATE_MISSING=8 MISLABELLED=5 CANNOT_DECIDE=0`。
新载体 `scripts/qa/emit-frameplan-additions.mjs` 把 16 行转成追加清单（identity 取腿给的 lane、assertion 退到台账 `证据(file:line)` 列；台账列名带括号，第一版写 `^证据$` 定位失败并 exit 2 —— 门读不到列就不许当成"没有证据"）：`可转=16 丢弃=0`。
`apply-plan-additions --add … --classify …` 的账：**可加 12 / 拒绝 4**，且新增的 `--classify+--verdict` 通道要求"给非未收口行换身份"必须带出处（没有出处仍是原来那条硬拒）。被拒的 4 行是 `MP-R2VIS-PAGES-HOME-INDEX-003`、`MP-R2-PAGES-MESSAGES-INDEX-019`、`MP-R2-POST-013`、`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006` —— 它们在配方里是我早前降级成的 `REWRITE`/`NOT_SHOOTABLE`，棘轮规定降级不许静默升回来。
这就是"两个我自己的产物互相矛盾"，不是工具坏了：解法只有二选一，(a) 复判那句"其实帧能判"够硬 ⇒ 先改 `frame-debt-triage` 那条降级理由（带上两边的引用），再让 reconcile/追加放行；(b) 降级理由仍成立 ⇒ 复判的标签是错的，撤下它。**不做的选项**是"把 12 条先落下去、这 4 条口头说说" —— 那样终报里会出现"同一个 id 在配方是 REWRITE、在复判产物是 FRAME_JUDGEABLE_NOW"，读哪个都有理。已立 #75 记这 4 行。
另外两笔要交出去的事实（都由只读腿现量，不是推测）：**三档产物比 `src` 旧约 1 小时**（`HOME-003` 的 clip 节点在三档里都不存在）⇒ stage-6b 的 reshoot 帧只能算"重建前"的证据，帧级结案必须等 #50/#55 重建之后再拍；SPEC 表 `total=88` 里含 3 个重复 id ⇒ "88 条判点成立"这句要按去重后的数说。

## 114 欠帧的行从"57 条没声明"收到 6 条，每一类的去向都是现算的（2026-09-27 10:18）
`scripts/qa/emit-openrow-register.mjs`（新载体，幂等复跑）把复判结论登记成机器可读去向：
- 复判里 28 条「帧判不了」+ 5 条「其实已被别处判过」⇒ 一次登记 33 条。`reason`/`nextCarrier` 逐字取自复判产物自己写的话；缺任一条就拒绝登记 —— "帧判不了"这种空话不算去向，必须说**欠哪个载体**。复跑一次 ⇒ `可加=0 撞号=33`，也不覆盖表里已有的条目。
- 再补一类出处 `--include-plan-nonshoot`：把"配方里有行但不是 SHOOT"的 19 条登记成 `criteria_needs_tightening` —— 它们不是欠一帧，是欠一次判据收紧（②的原话），理由用配方行自己的 why。
- 台账状态列一个字没改：登记表只是"欠哪个载体"的声明，不等于结案（这正是 `SRCONLY` 桶要把它和 A/B 分开数的原因）。
账目：`FRAMECOV_SRCONLY 行数=83 → A配方SHOOT=31 B归置=4 C登记=42 欠帧且无声明=6`，`裸行=0`，两组守恒都 OK。剩下 6 条逐条列给 #77，不并入"已完成"。
一个自己踩到的口径教训：第一次算"欠帧集合"时我把 plan 输入混了（一次指 `frameplan-merged.json`，一次指 `frameplan-round7-final.json`），得出"57→15 但有 10 条不在复判那 57 里"的糊涂账 —— 差集其实是**换了 plan 文件**。往后凡"前后对比"必须先证明两次跑吃的是同一组输入。
腿 2（guest×real）同步在跑：`rows=783 executed=68 FAILED=49` —— 失败率异常高，等它收尾后离线归置（多半是游客闸门把落地页换掉的 landing-guard 一族，但那要按数说话，不能猜）。

### 114.1 SPEC 表的"88 条"原来是 85 个唯一判点（重复被独立证实，不再只是某条腿的说法）
`verify-source-shape.mjs` 现在自打印 `SRC_SHAPE_DUP 条目=88 带id=88 无id=0 唯一id=85 重复=3（MP-R2-PROFILE-034×2 MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001×2 MP-R2VIS-PAGES-HOME-INDEX-004×2）`。
两个决定：
- 今天**不自动去重**：去重要逐条判"同一条判点写了两遍"还是"两个不同判点共用了一个 id"，后者合并等于悄悄删掉一个判点 —— 那是改判，得单独做（#76 里挂着）。
- 但"88 条判点成立"这句从现在起要写成 **`total=88 / 唯一 id=85`**，终报与面板都用这一对数；`--strict-dup` 旗标留着，等真去重之后再用它把"不许重复 id"变成硬门（现在打开就会红，那是真红，但会盖住今天别的信号）。

### 114.2 一条"建了却没接进门"的门：verify-source-shape 之前只在两条旧队列里跑
grep 全仓：`verify-source-shape.mjs` 只出现在 `ui-queue.post-legs.json` 与 `ui-queue.round7-final.json` 两份腿清单里，**终报面板从来不读它** ⇒ ② 收紧出来的 88 条判点本体在终报里没有任何一行数字背书。现已接进 `emit-round-report.mjs`（`G.sourceShape` + 一行 gateRow），锚点是 `SRC_SHAPE total=` / `SRC_SHAPE_DUP` / `SRC_SHAPE_RESULT=`，其中重复计数那一行没打出来会显式写成"(没打出重复计数行 ⇒ 去重检查是空跑)"而不是静默省略。
重复 id 的决定也说清楚，免得下轮以为漏做：**不合并**。三对重复各是两个不同强度的判点（例：`MP-R2-PROFILE-034` 一条主张"整文件不出现 `socialProgressStore`"，另一条只主张"不出现 `socialProgressStore.fetchProgress(` 这类调用"），合并必然改强度 —— 取强的那条会误红，取弱的那条就是洗绿。口径改成：条数 88、**唯一 id 85**，两个数一起报；`--strict-dup` 旗标留着，只有在真的把"一 id 一判点"定成约定之后才打开。

## 115 WS⊥CLI 的机制那一半变成可重跑探针（2026-09-27 10:25，全程不碰 IDE 与真锁）
新载体 `scripts/qa/probe-ws-cli-exclusion.mjs`：把 `ui-lease` 指到临时空白目录，用子进程真跑 8 条断言 —— 空目录可取/释放后不再算持有/被占时第二把驱动必须非零退出且理由点名 `owner@pid 租期到 …`/`QA_SKIP_UI_LEASE=1` 是唯一放行口且打 SKIPPED 留痕/**只抄 owner 名字但 pid 不同仍拒**/租期一过新驱动可接管/探针确实没写真锁目录。结果 `WSX_EXCL_RESULT=PASS`。
两条自纠：
1. 探针第一版子进程 `import` 用了 Windows 盘符路径 ⇒ `ERR_UNSUPPORTED_ESM_URL_SCHEME`，于是"A1 非零退出"这条**假绿**（崩在 import，不是崩在租约）。改成 `pathToFileURL` 之外，还把 A1 断言加严成"必须打印占用理由"，并加了一条前置门：C1 不过就立刻 exit 2 声明"探针自身坏了"，绝不让后面的断言顶着绿灯走出去。
2. 我原本断"同 owner 重取=续租成功"，实测被拒 —— 持有者身份以 **pid** 为准、owner 只是标签。这不是机制缺陷，是我把期望写错了；改成两条更有用的断言（抄名字不算凭证 / 过期可接管），两条都过。
`emit-round-report` 已接进行（`G.wsExcl`）。#47 剩下的仍是真那一半：**IDE 在 WS 连上时会不会踢掉 automator 会话**只能在开窗口时量一次，不许拿这 8 条绿替它结案。

## 116 ① 的"54 条 NEEDS_UI_FRAME"其实是判据台的账，现在有一把门专门数它（2026-09-27 10:29）
`scripts/qa/verify-criteria-frame-debt.mjs`：吃 `verify-fixes-against-artifact` 的逐条判决（`verdicts.jsonl`），
把每条 `NEEDS_UI_FRAME` 对照取景配方 / 归置表 / 登记表问一句"这轮会有人去拍它吗"，并且**对判决里写过的 frame 路径做 existsSync**。
实测（判决文件是 stage-6b 之前那版）：`items=116 欠帧=68 有去向=63 无去向=5｜frame 路径不存在=0`，守恒 `68=63+5 OK`；`--selftest` 5 条断言全过（含"REWRITE 不算去向 / SHOOT 算 / 登记算 / 假路径必抓"）。
那 5 条无去向里有 4 条正是我这一格刚追加/升级的行（HOME-003、MESSAGES-019、CIRCLES-INDEX-001、VILLAGE-POST-006）——
门读的是 `frameplan-round7-final.json`，而 final 要等队列腿 7 `reconcile --apply` 才会长出来 ⇒ **这是时序差，不是判据漏网**；剩下真的一条 `MP-R2-PAGES-DISCOVER-INDEX-014`（tab-bar 高度的观感项）单独立任务。
默认不否决（`RESULT=WARN`）：这条轴刚建，假阳性率没量过；量完在收口时开 `--strict`。已经接进终报面板（`G.critFrame`）。

## 117 游客×mock 现在是硬停，不再是"跑一小时才 0 帧"（2026-09-27 10:37，#74②）
`r-exec-cli.mjs` 加了结构守卫：`IDENTITY=guest && 档=mock` 且没带 `--allow-guest-mock` ⇒ `RUNNER_RESULT=FAIL reason=…一行都不跑，别占设备`（exit 2），理由里直接说该走 real 档。成因写进注释：mock 引导会先种会话，`--guest-warmup` 清不掉 —— §101 事故二那一轮 16 条腿就是这么白跑的。
配套：stage-7 生成器里那条 `exec-guest-mock-stage7` **删掉**（留着它只会撞自己刚加的硬停并把后面的腿带走），游客刀统一由 `exec-guest-real-stage7` 承担，#51 的登录页身份限定也在那条腿上验。
预检：三档重建脚本名逐个对过 `apps/client/package.json` —— `build:mp-weixin:mock`、`build:mp-weixin:real:isolated`、`build:mp-weixin:showcase` + 隔离脚本 `apps/client/scripts/build-showcase-isolated.mjs`、包装器 `scripts/qa/run-npm-script.mjs` 全在，收口波不会在"重建"那一步才发现脚本名写错。
stage-7 清单现算 `腿数=23`、改动页 14 页（含并入的 #70④ 污染 8 个 manifest / 125 行）。按每条执行腿上限 240 分钟估，整队要跑过夜：这是 ⑤ 要求的量，不为了省时间砍腿；如果轮次先耗尽，队列本身可无人看守继续跑，现场都在 `queue-state.json` 与每条腿的日志里。

## 118 收口波第 3 步真的收口了：ops 四份计划幂等到 0，代价是把"待改"从计数改成点名（2026-09-27 10:52，#68/#51/#4）
`apply-ops-cellplans.mjs` 之前只打印 `待改=2` 却不说是哪两条 ⇒ 幂等复跑无从核对。补了三件事，每件都带负例：
- **逐行点名**：`TODO A/B <计划> :: <id> …`，落完再复跑一次 dry ⇒ `已落地=43 待改=0 拒绝=0 → OPSCELL_RESULT=PASS`（exit 0）。这条才是 §105 第 3 步要的证明，之前那句"已落地"只是我说过。
- **VD15 的跨计划冲突按证据裁决**：`cellplan-round7-taptarget.json` 要 `.post-content`，`cellplan-round7-recovered.json` 要 `.post-body`，两个名字在产物里都逐字存在，所以门拦不住。回源码判：`detail.vue:830 <view class="post-body" @longpress="handlePostLongpress">` 才是长按事件的宿主，`:831` 的 `.post-content` 是它内部的 `<text>`，且纯图帖子没 content 时不渲染 ⇒ 目标会消失。旧行**不删**，搬进同一文件的 `D-adjudicated-superseded` 组（带赢家、理由、grep 证据），运行时打印 `SUPERSEDED … 撤下名=.post-content 赢家=.post-body`。
- **B 组的"两份计划判出同一结论"不再互相覆盖**：LG30 被 login-skips 先盖章、deadselectors 又主张一次。第一份理由是逐字核过产物那份，后到的只补 `notAutomatableAlso` 共章归因（幂等：`also` 里已有本计划 ⇒ 计 ALREADY），绝不重写 `notAutomatableReason`/`From` ⇒ "谁先落的章"可追溯。
- 顺带堵掉一个静默失效：计划文件里组名打错一个字母（`A-add-tapTaget`）原本会让那一组贡献 0 行而门照样绿。现在凡是本工具读不到的数组组一律 REFUSE（负例实测：`REFUSE plan-badkey.json :: 有一个本工具读不到的数组组「A-add-tapTaget」（1 行）⇒ 不许当成空集`）。

## 119 身份适用范围从"字段"变成"有人读"：420 条收窄 + 覆盖门同步换口径（2026-09-27 10:52，#51/#57/#4）
`tag-ops-identity-scope.mjs` 曾经标完 `identities:["A"]` 就收工，但**执行器根本没读这个字段** —— 标了等于没标。这一轮把它接通并按裁定收窄：
- 执行器新增纯函数 `identityScopeSkip(c, IDENTITY)`，调用点在每条 case 的循环最前面（探测之前）：不在名单里的腿出一行 `SKIPPED`（原因串点名"摘掉的是认领，不是判据"+ 载体），**行数守恒不破**；新增 `stats.idScope` 并同时进 `skippedTotal()` 与 `RUNNER_STATS` 的分解串（漏一处就是 §98 那两个互相打架的 skipped 数）。自测从 18 条加到 24 条（含"空名单视同没标"这种反向断言）。
- 标值改成 `["A","B"]` 而不是 `["A"]`：裁定讲的是**游客 vs 登录态**，只写 A 会把 B 腿一起摘掉。落盘前先机器核对执行器确实有这个调用点（`IDSCOPE_CONSUMER=OK`，读不到就 exit 2）—— 这就是"先接消费者，再落字段"。
- 落盘量：`裁定表页上的用例=460 收窄=420 保留游客=40 改写文件=12`，复读 420=计划 420、目录 1107 不变；再跑一次 dry ⇒ `改写文件=0`（幂等）。旧的恒等式守恒（`tagged + (total-tagged) === total`）删掉了，换成三条真断言：遍历数=目录 cases 之和、目录=1107、`收窄 + 保留游客 = 独立数出来的表内用例`。
- 覆盖门 `verify-real-coverage.mjs` 必须跟着改口径，否则这次收窄会**自己造出一批假红**（游客轴从欠 44 跳到欠 420）：判据台里 `c.identities` 现在折算成两条轴（登录侧=A/B 任一，游客侧=guest/none），没标的照旧要求双身份。自测补 4 条，其中关键一条是"标了 A/B 但只有 guest 判过 ⇒ 仍算欠"——**收窄只减少认领者，不降低标准**。实测 `REALCOV_IDENTITY_SCOPED 游客轴豁免=…`（数字在 stage-7 那轮量）。
- `pages/nearby/index → pages/login/index` 这条落地对补进了 `guest-landing-policy.json`（第 27 条）。依据不是"实测被弹走了"这么简单：`nearby/index.vue:63/204` 写明「未登录发起必 401 → http 层 redirectToLogin 强踢」，与 anchors 里的 `services/http.ts:493` 同源 ⇒ 机制就是 `guide-401`；同时该页 `:622` 另有页内引导 `.nearby-login-guide`，所以行里明确写了"本行只声明被踢时落点应为登录页，不把页内引导判成缺陷"。补完后 `verify-guest-landing --mode book --triage <两份并集>` ⇒ `groups=27 覆盖欠款行=242 锚点可核=11（不可核 0）RESULT=OK`，两份游客语料的 `landingMissing` 都归零（26 组 + 1 组仍标"未结案"，等 GG-* 复测腿跑完）。

## 120 我自己制造的一次数据事故 + 两个默认值 hazard（2026-09-27 10:58，诚实记账）
**事故**：我用 `triage-exec-failures.mjs --corpus …` 跑分诊，而这个脚本没有 `--corpus` 旗标 ⇒ 参数被静默忽略，它按默认的 `--results reports/audit/round-6/interact/exec-results.json` 跑，并把 `.zcode/tmp/triage-r6.{md,json}` 覆写成了 round-7 游客轮的内容。那两份是**未跟踪的派生件**（`.zcode/tmp` 被 gitignore 吞掉，git ls-files 为空），可用 round-6 语料原样重跑复现，没有不可逆损失 —— 但"文件名写着 r6、内容其实是 r7"这种事如果不写下来就是我在制造误导证据。读了那份 79 行 unclassified 的读数并据此判断过一次，也是同一件事的下游污染。
**修掉的两条 hazard**：
1. 加了不认识的旗标硬失败（`TRIAGE_RESULT=FAIL reason=不认识的旗标 --corpus …会被静默忽略而回落到默认输入`）—— 同一族已经给 `apply-ops-cellplans`、`tag-ops-identity-scope`、`verify-case-selectors-exist` 等补过，这次轮到分诊器。
2. 默认 `--out` 不再是一个固定的 round-6 名字：没给 `--out` 时按语料名派生（`TRIAGE_OUT_DERIVED out=.zcode/tmp/triage-exec-resultsexec-guest-real-r7final`），换语料忘换旗标这件事从此不可能发生。
**另外查出两个"我之前的读数不是我要的读数"**：
- `TRIAGE_VOCAB` 空转桶核对第一版只认 `{ bucket: "X" }` 一种写法 ⇒ 8 个用 `push(r, "X", …)` 产出的桶全被判成空转（假红）。改成两种产出形态都认，实测 `buckets=24 无规则可达=0`；负例（临时塞一个 `zzz-fake-bucket`）能红，但那次的负例探针因脚本用 `import.meta.dirname` 反推 REPO 而落在 `tmp/qa/`，路径不对 ⇒ 换到 `scripts/qa/` 下再验才算数（沿用 §104 那条"探针要能红才算证明"）。
- `exec-guest-real-final` 这份语料里 nearby **一条 FAILED 都没有**，早前那条 nearby 报错出自 `exec-guest-real-r7final`（3 条 FAILED，实测该页 42/57 行栈顶=登录页）。我一开始拿错了语料，差点把"已经不复现的问题"当成"已被别人修掉"。

## 121 收口波第 6 步（台账格子）落完：48 格 + 一份从门自己输出派生的"开账"计划（2026-09-27 11:08，#72/#73/#77）
`merge-cellplans.mjs` 一次合并 6 份既有计划 ⇒ `patches=48 全部 dry 通过`，`--apply` 后 `MERGE_POSTVERIFY … DATA_ROWS=236 OFF_SCHEMA_ROWS=0 STATUS_VOCAB_BAD=0`（含把 DISCOVER-014 从过绿的"已修复"降回 待修复（半成…）—— 降的是我自己的判词，不是别人的）。
剩下的自相矛盾行没有手抄修：新建 `scripts/qa/emit-dispo-open-cellplan.mjs`，**跑门 → 解析 DISPO_HIT → 按标记派生新状态**，理由：那 13 行的口径由门决定，我手抄一份 id 名单的话，下一次门改了标记，计划还在按旧名单改判（=又一次口径分家）。映射表只列有明确去向的标记（需人复验/待复验/仍欠/状态停在 → `已修复待复验`），认不出的标记一律 SKIP 交给人；`并入-不另立案` 的行不改（欠款该挂在并案目标那一行）。结果：`派生格子=9 跳过=4` → 应用 → `DISPO 自相矛盾行 13→4`，剩下 4 条是刻意留给人的（1 条标记「本轮未动」没有映射规则，3 条并案行）。
方向自查：这一批全部是**开账**（把裸「已修复」改成开放态 9 行），不是销账 —— 台账开放行 20→29，欠帧轴跟着变长，这正是 §116 那把门该抓到的东西。

## 122 帧债 29 行全部有了去向：5 行进三档取景配方、1 行进登记表（2026-09-27 11:13，#60/#66/#72/#78）
`verify-frame-debt-coverage` 报 `裸行=6/29`。逐行按台账处置列原话写复判（`tmp/qa/naked-frame-rows-classify.json`，precondition 直接引用处置列，不改写不添油），走 `emit-frameplan-additions → apply-plan-additions`：
- **按 identity/band 分流到三份配方**（这一步本来会踩坑：`apply-plan-additions` 默认写 `frameplan-merged.json`，而 stage-7 的两条取景腿吃的是 `frameplan-round7-final.json` / `-guest-real.json` —— 写进没人拍的配方等于什么都没做）。分流规则：`identity=guest` → 游客真实档；`band=real` → 新建的登录态真实档；其余 → mock 档。落盘：mock `79→82`、guest-real `6→7`、a-real `0→1`，每份都打了 `守恒：yes`。
- 新建 `frameplan-round7-a-real.json` 的理由写进了文件自己的 `$comment`：requiresReal 的复验帧既不能在 mock 档量到，也不该由游客腿代拍（MP-R2-CAMPUSPOST-010 要的是"真机被拦下的那一帧"）。
- DISCOVER-014 是唯一"欠的不是帧"的：它是常量一致性主张，帧上 184rpx 与 160+24rpx 长得一样，出多少帧都判不出漂移 ⇒ 进 `open-row-dispositions.json` 登记表（`REGADD_WRITTEN 条目 63 → 64`），判点交给 §123 那把新门。
- 复量：`FRAMECOV open=28 A配方SHOOT=13 B归置=3 C登记=13 裸行=0 → FRAMECOV_RESULT=PASS`。
- 顺带把门的默认靶子修了：`--plans` 默认列表里没有 a-real 档 ⇒ 新档的行会被判成裸行。现在默认并集=本轮所有会被 shoot 的三份配方，并把文件头写错的 `--plan` 改成 `--plans`（旗标名写错在文档里，是下一次假红的种子）。

## 123 ④ 第 5 项按可辩护默认落地：单点化改判成"静态核对 + 主张收窄"，判点是一把会红的门（2026-09-27 11:17，#78/#79）
DISCOVER-014 的处置列原本写着"二选一，收口时给去向"。**不采 (a)** 的理由只写已核过的事实：token 定义在 `design-variables.scss:251` 起那个 `page{}` 里（经 `App.vue:301` 引入），而 `apps/client/src/custom-tab-bar/` 对该主题文件 0 引用 ⇒ 让面板本体读 `var()` 要先把 token 注进组件作用域，这一步本轮没做、也没验证真机是否生效；(a) 的完整形态还要重建三档 + 改前/改后对拍帧。所以我第一版写的"CSS 变量传不进去"被自己划掉了 —— 那是我对微信渲染器的猜测，不是量到的东西（登记表与台账证据列都已改成上面这版措辞）。
按 (b) 落地并补上真正的判点载体 `scripts/qa/verify-tab-bar-single-source.mjs`：核对三件事 —— token 的式子、`.tab-bar` 在 `content-box` 下 `height + padding-bottom` 相加、消费侧三处是否走 `var(--tab-bar-total-h…`。现量 `token=184rpx+2env == face=184rpx+2env` ⇒ PASS。
自测 6 例里 3 例是**变异负例**（面板单独改 200rpx / token 多加一个 env / 消费侧退回字面量），全部会红；另外两条 hazard 也是自测抓出来的：
- 第一版 `declValue` 返回 `m[1]`，而带行首锚的正则值在**组 2** ⇒ 每条声明都"读不到"，好例子被判成坏例子（自测当场红）。
- 消费侧参数是 map，我却按数组 `for…of` 迭代 ⇒ `TypeError`。
台账两格（第 6/9 列）由 `cellplan-round7-tabbar-single-source.json` 落盘：状态升到 `已修复（源码级判点…）`，但证据列**照写**"面板侧仍是两处字面量，靠门保证一旦不相等就报红"，不写成"已合并为单一来源"。

## 124 三处"我写的工具会自己造假"的坑（都带负例）（2026-09-27 11:35，#68/#70/#71/#74）
1. **`classesOf` 把 JS 成员访问当类名**：放宽裸 kebab 口径之后，`messages[0].length-1` 被抠成 `.length-1`，把 DND05 判红了一次。加 `(?<![\w$.])` 还不够（`]` 不是词字符）⇒ 现在是 `(?<![\w$.)\]])`，自测加了两条负例当场抓到第一版。连带复量：`TAPCENSUS 含交互动词=705 点名了=626 没点名=62 盖章不可自动化=17（守恒 yes）`，选择器门 `死名 11→7`、取景配方里的假"没点名"也少了。
2. **`automatable:false` 又是一枚没人认领的章**：ops 里 17 条盖了章，但执行器从来没读这个字段 ⇒ 章是装饰，执行器照点照红（LG29/LG30 就是这么被门判成"执行器真会去点却点不到"的）。补 `notAutomatableSkip(c)` 消费者（原因串以 `action-not-automatable:` 开头 ⇒ 直接落进 triage 已有的具名桶），选择器门的"会不会点"两条加名路径改成同一个 `c.automatable !== false` 前置，并且**先核对执行器里真有这个消费者**才肯降轴（找不到就 exit 2，不许门单方面放宽）。结果：mock 与 real 两档同时 `SEL_RESULT=PASS（判红=0，另有 7 条只提示）`，#68 结案。
3. **`verify-band-freshness` 用模板串整串定罪**：`campus-topic-${Date.now()}-${uploaded.length}.jpg` 在打包产物里必然搜不到（插值被拆、标识符被改名），于是把一次正常构建判成"这一档真过期"。改成按 `${}` 切成静态段再比（两处抽取点都改）。同一轮还暴露出**showcase 构建会写进 mock 目录**（跑完 showcase 后 `mp-weixin/config/env.js` 报 `MODE=mp-weixin-showcase`）⇒ stage-7 清单里把 `rebuild-showcase` 挪到 `rebuild-mock` **之前**，否则 `exec-A-mock` 跑在被覆盖的档上。这条排序修正连同两条新腿（`gate-tab-bar-single-source-stage7` advisory、`reshoot-A-real-stage7`）由 `tmp/qa/patch-stage7-queue.mjs` 落进清单，幂等复跑只报"已存在，跳过"。
   同族小修：`run-npm-script.mjs` 以前只把"最后 14 行含 error 的话"打到 stdout ⇒ 一次失败的构建在重跑成功后无从查起（本轮 mock 档 exit=1、第二次 exit=0，现场只剩 npm error 五行）。现在每次运行都全文落盘 `tmp/qa/npm-logs/<script>-<ts>-exit<N>.log` 并打印 `NPMSCRIPT_LOG=`。

## 125 stage-7 已开跑（25 条腿）与它还欠的读数（2026-09-27 11:41）
`node scripts/qa/run-ui-queue.mjs --legs scripts/qa/ui-queue.round7-stage7.json`，日志 `tmp/qa/stage7-queue.log`、状态 `reports/audit/round-7/queue-state.json`。起跑 5 条腿全绿（stamp --write / refreeze / --copy / 选择器门 / tab-bar 门），第 6 条起进入三档重建 → 开窗 → `exec-A-mock`(1107) → `exec-A-real`/`exec-guest-real`(236) → 覆盖守恒 → 取景腿 → B 身份巡检。
本轮范围里剩下的账（等队列读数回来才能结）：① 的 12 行帧级复验 + 判据台欠帧；#52 执行轮帧入语料库索引；#64 G8 RING6 与后台列帧（8080 在跑，pid 32156）；#69 已由队列的 stamp 腿做（`canon=dc3f93f47e56`，24 份 1107 条，改完正文之后重记过一次）；#76 的"产物比 src 旧"由 `gate-band-freshness-stage7` 现场判，showcase 档若仍定罪不了就在终报里单独公开；④ 还剩 GATES.json 过期载体重写与遗留测试数据处置两项；#40 终报 §10 + 显式路径提交清单。

## 126 我把正在跑的队列顶掉了：一次 `--dry` 抢走设备租约（2026-09-27 11:46，事故 + 修复 + 复跑）
**事实链**：11:41 起跑的 stage-7 队列在前 9 条腿全绿（含三档重建 + `gate-band-freshness PASS bands=3`）之后，11:46:24 在 `open-window-mock-stage7` 撞
`OPENWIN_RESULT=FAIL reason=模拟器已被占用（gates-writer-1932@pid1932 租期到 12:06:09）` ⇒ 后面 **15 条腿 NOT_RUN**，`QUEUE_TALLY OK=9 FAIL=1 NOT_RUN=15 sum=25/25 CONSERVED`、`QUEUE_RESULT=FAIL`。
那个持有租约的人就是我自己：11:46:09 我跑了一次 `write-gates-json.mjs --dry` 去核对 ④ 的 GATES.json 载体。**`--dry` 只是"不写那个 json"，它照样 `acquireUi()` 抢独占租约，照样当场跑 G7/G8/G9** —— 而 G8 每跑一次真写 4 行库。这是 §101「DRY 不是只读」的同一个形状，我隔了一天又踩了一遍，而且这次代价是别人的三条执行腿。
顺带一条同源读数陷阱：后台任务的"exit code 0"通知来自我那条包装命令行末尾的 `echo`，不是队列本身；真状态只在 `tmp/qa/stage7-queue*.log` 与 `QUEUE_RESULT=` 行里（`feedback-verify-command-output-not-exit-code` 又一次命中，这次是我自己写的包装）。
**修的东西（都带可重跑判据）**：
1. `write-gates-json.mjs`：`--dry` 现在既不抢租约也不复跑前置件（打印 `GATESJSON_LEASE=SKIPPED_DRY`），G7/G8/G9 的读数改为复用上一次的留档，并把 DRY 那行打印改成"这不是本轮复验凭据"。实测复跑 `--dry` ⇒ `SKIPPED_DRY` 且 `tmp/qa/locks/wechat-automation-cli.lock` 没再出现 `gates-writer-*`（进程退出时也确实 `status:"released"`、`heldLeases()=[]`，所以卡住队列的是"持有期间"而不是残留锁）。
2. `freeze-ops-copy.mjs`：第二次续跑时这条腿以 `errno=-4094 open ...ops-provenance.json` 死掉（同一分钟手工连跑 3 次全绿 ⇒ Windows sharing violation，不是逻辑错）。现在 `copyRobust/writeRobust` 走"同目录临时文件 + rename + 5 次退避"（`node --check` 过；补丁脚本 `tmp/qa/patch-freeze-robust.mjs` 带锚点命中数断言，命中≠1 就直接 FAIL，不许猜）。
3. 队列 11:50 重新起跑（`tmp/qa/stage7-queue-3.log`），起跑 4 条腿全绿、tab-bar 门 `TABBARSRC_RESULT=PASS` 在内。
**这条记录存在的意义**：凡是"只读地看一眼"的工具，只要它碰设备或碰库，就必须像写工具一样被问一句"dry 时你占不占资源"。以后新写门禁类工具，`--dry` 的前置动作（租约、G8 类写库前置、--write 型副作用）要一起被 `--dry` 关掉，而不是只关掉最后那次 `writeFileSync`。

## 127 两笔登记把"去向"补满，面板接线，两次显式路径提交（2026-09-27 11:54-11:58，#60/#72/#76/#77/#40）
- **判据台欠帧轴**：`verify-criteria-frame-debt` 的 `无去向=4`（MP-R2-PAGES-MESSAGES-INDEX-019、CIRCLES-INDEX-001、VILLAGE-POST-006、HOME-INDEX-003）逐条登记去向 —— 共同形状是"判据讲的是行为/观感，没点名帧上要看见什么物件"，所以欠的是**一次判据收紧**而不是一张帧（点名之前出帧只会得到一张没人能判的图）。登记后 `CRITFRAME 欠帧=68 有去向=68 无去向=0 → PASS`，并且把终报面板里这条门**升级成 --strict**（68/68 是真的，升级后"以后掉了去向"会当场红）。
- **台账源码级判点轴**：`--strict-src-only` 报 `欠帧且无声明=13` —— 这 13 行状态列写着 `已修复（源码级判点…）`，声明在**人话里**但没有机器可读的去向（正是"限定语态词表藏债"那一族）。新建派生器 `scripts/qa/emit-srconly-register-classify.mjs`：ids 现取门的 `FRAMECOV_SRC_OWED` 行，reason 取该行**状态列括号里自己那句声明** + 证据列 + statusEvidence，nextCarrier 取处置列原文（里面本来就写着"可重跑 verify-source-shape.mjs 复现"）⇒ 我不另写一句"帧判不了"。落登记 `条目 68 → 81`，复量 `C登记=54 欠帧且无声明=0 → FRAMECOV_RESULT=PASS`。#77 结案。
- 顺手把 SRCONLY 的打印上限从 10 抬到 40：卡在 10 会让人拿着"另有 3 行"去猜名单，而登记必须逐条点名（猜不得）。
- 面板接线：`G.tabBar` 进 `emit-round-report`（新门不接线=下一轮没人知道它存在）。同一次改动里我把注入代码放到了一条多行模板串的**中间**，结果门把自己的源码当读数打印了出来 —— 症状很荒谬但一眼能认出，撤掉后改成直接抬打印上限。教训：按"行"插入多行语句内部会插进字符串里，结构插入要找语句结束点而不是 `\n`。
- 两次提交（都是逐条点名，`git add --pathspec-from-file`，未用 `-A`）：
  `34b6fb3d` = 收口波机械层 127 个路径（scripts/qa 100 + 判据台/台账/notes 27；`.bak` 与敏感件经 grep 核验为 0）；
  `fe3338d2` = 产品侧 53 个路径（client_src + admin_src 两组，来自 commit-manifest；pre-commit 的 mp-image strict lint 通过）。
  `reports/screenshots/**` 9 个帧目录仍是 HOLDBACK（二进制大图，默认不进清单），队列正在写的 evidence 组（177 路径）留到 stage-7 跑完按同一份清单再收一次 —— 那时才是 ⑤ 的终报与终版提交。

## 128 现场交接：stage-7 正在跑，跑完之后按这个顺序收（2026-09-27 12:03）
**正在跑**：`scripts/qa/run-ui-queue.mjs --legs scripts/qa/ui-queue.round7-stage7.json`（25 条腿，串行，独占设备）。
日志 `tmp/qa/stage7-queue-3.log`，每条腿自己的日志在 `reports/audit/round-7/ui-queue/<腿名>.log`，状态 `reports/audit/round-7/queue-state.json`。
截至本节：腿 1-9 全绿（stamp --write、refreeze、--copy、选择器门、tab-bar 门、三档重建、band-freshness `PASS bands=3`、开窗），腿 10 `exec-A-mock-stage7`（1107 例）11:56:07 起跑。
中途我提交过两次（`34b6fb3d`、`fe3338d2`）⇒ 起跑前后 HEAD 不同，各条腿的 `gitSha` 会分两批；提交没有改文件字节，所以档位与判据的内容对应关系不变，但终报里 `verify-provenance-all` 若把"gitSha 是否等于当前 HEAD"当判点，需要按**每条腿自己的 SHA** 读，不要拿单一 HEAD 去套（这是本文件 §101 那一族的读法约束）。

**跑完之后依次做（每条都有现成载具，不用重写）**：
1. 读 `QUEUE_TALLY` / `QUEUE_RESULT` 并把 `OK+FAIL+NOT_RUN == 25` 的守恒核对抄进报告；红腿逐条读它自己的 log，不许用"重跑一次绿了"顶替（advisory 腿会记成 `ADVISORY_RED` 且后面的腿照跑）。
2. 取景腿出的帧 → `exec-frames-to-corpus` 登记 → 重建权威证据索引（#52），再跑 `audit-frame-verdicts` / `verdict-from-frames` 把 ① 的 68 条欠帧推到帧级终态（#37/#41/#66）。
3. `triage-exec-failures --results <新语料> --dist <对应档>`：先看 `TRIAGE_VOCAB`（空转桶必须为 0），再看新增的 `SKIPPED-identity-scope` 桶量到的数（游客腿按裁定不再认领 420 条），最后确认 `unclassified=0`。
4. `verify-real-coverage`：这一轮起 `REALCOV_IDENTITY_SCOPED 游客轴豁免=` 会报一个不小的数，那不是覆盖退化 —— 双身份轴已由 c.identities 折算，判点仍在"登录侧 + （未被豁免的）游客侧"。
5. G8 十环 + RING6 严格化、后台列表「评论」列真机帧（#64）；G9 素材复量。
6. `emit-round-report`（面板已接 `G.tabBar` 且 `critFrame` 走 `--strict`）→ 终报 §10 写"本轮范围内还剩什么"，再按 `.zcode/tmp/round6-exec/commit-manifest.json` 的 evidence 组做终版提交（帧目录仍 HOLDBACK，要归档需人显式点名）。

**这一节里没被任何门覆盖、必须由人判的三件**（objective ④/② 的尾巴，写清楚免得下一轮当"已收口"读）：
- `.tab-bar` 本体仍是两处字面量（单点化按 (b) 口径成立 + 静态门拦漂移）；要走到 (a) 需要先把 token 注入 custom-tab-bar 作用域并验证真机生效，再配改前/改后对拍帧。
- ChatInput 的"删除后不破版"复验：帧已进 mock 配方（`chat-session-inputbar-after-chatinput-delete`），但判点要求产物 gitSha 不早于删除提交 —— 看 `exec-A-mock-stage7` 的 gitSha 是否满足，不满足就重拍，不许拿旧帧结案。
- 台账里 4 行 `DISPO` 刻意留给人判（1 行标记「本轮未动」无映射规则 + 3 行 `并入-不另立案`，它们的欠款应挂在并案目标行上）。

## 129 #67 落地：GG-* 复测腿的成员账改由判据台派生（外加又一只"dry 抢租约"）（2026-09-27 12:10）
#51 让游客腿不再认领 420 条登录态前置用例之后，`verify-guest-landing --mode book` 的旧写法暴露出一个**会让债消失**的结构问题：账本成员来自"那一次跑测撞到的落地对"，跑测不再产生落地对 ⇒ 名册会成批变空；旧守恒还会把这种变空说成"裁定过期或落点已变"（假红），更坏的是某一组真没人复验时反而看起来"没有债"。

改法（`tmp/qa/patch-guest-roster.mjs` 按行号切片替换，锚点不符直接 FAIL，不猜）：
- 新增 `guestNoLongerClaims(c)` 纯函数 + `opsRosterByPage()`：成员账从 `reports/audit/round-6/ops` 派生（该页上被收窄成"只由登录态腿认领"的每一条 case），跑测观察到的落地对降级为"第二证人"；
- 名册遍历 **policy 的行**，不再遍历 `Object.keys(groups)` —— 一组会不会从账上消失，以前只取决于那次跑有没有撞上它；
- 双向守恒改方向：跑测里有、policy 没有 ⇒ 仍红（新落点必须当场裁定）；policy 有、跑测没有 ⇒ 先问 ops 有没有成员，有则打 `GUEST_LAND_NO_RUN_WITNESS`（不是红），ops 也没有才算真缺口；
- 守恒换成"独立复算应有的成员数 vs 实际进账的成员数"（循环里任何一次 `continue` 漏记都会被抓），不写 `sum == 累加值` 那种恒等式。

现量：`GUEST_LAND_ROSTER 组=27（成员来自 ops 的=27 只来自跑测的=0）成员行次合计=433`、`覆盖欠款行=433 锚点可核=11（不可核 0）RESULT=OK`。负例（ops 指向一个没有收窄用例的假目录 + triage 指向不存在的文件）⇒ `FAIL problems=29 ✗ 这几组…没有任何证人` —— 能红才算证明，不是"改完看着顺眼"。

顺带又抓到一只 dry 抢设备：`shoot-frameplan.mjs --dry` 无条件 `acquireUi()`（`DRY` 旗标在租约段之后才解析），于是"我就看一眼配方会拍什么"会把正在跑的取景腿顶掉 —— 与 §126 那起事故同族，一小时内第二次。现在 dry 分支不抢租约，并且**当场用真实现场验过**：`exec-A-mock` 正持有租约时跑 `--dry` ⇒ `SHOOT_LEASE=SKIPPED_DRY` + 照常打出 `items=38 组(路由×身份)=22`。

**下一轮防再犯的硬规则**：任何带 `--dry`/`--check`/"只读预览"字样的工具，`--dry` 必须在**解析参数的那一刻**就同时关掉三类副作用 —— 设备租约、会写库的前置件、落盘。判据是：dry 模式下 `heldLeases()` 前后不变、库行数不变、目标文件 mtime 不变。
## 130 收尾也做成载具：run-round7-closeout.mjs（19 步、设备占用就拒跑）（2026-09-27 12:16）
§128 那份"跑完之后做什么"如果只写在纸上，就是又一次"结论没有载具"。现在收进一个脚本：
- 19 个步骤启动前逐个核 existsSync（文件名写错 ⇒ 直接 FAIL，绝不静默少跑一步）；
- 默认只跑只读门；写盘步骤要 --allow-write，G8/G9 要 --with-g8，终报与提交清单要 --with-report；
- 启动前查 heldLeases()，设备被占用就拒绝 —— 本轮我已经两次用"只读预览"顶掉正在跑的腿（§126、§129），这条守卫把教训变成结构；
- queue-tally 步骤自己核对 OK+FAIL+NOT_RUN==腿数，并逐条点名红腿与 ADVISORY_RED；
- 含 guest-landing-recheck（--mode measure --project mp-weixin-real）：27 组游客落点没有这条就永远停在 BOOKED，triage 的"未结案"归不了零 —— 这一条是 ⑤"没有证据缺口"的最后一环。
负例现验：--only guest-landing-recheck 在未加 --allow-write 时报 FAIL（"有没被启用的步骤"），而不是静默什么也不做。

## §131 ④ 第 1 项裁定终于有了载具；#51 的反向收窄踩了两次自己的坑
队尾腿 10（exec-A-mock-stage7）在跑，这一段全部是不占设备的活。

### 现量先把我的说法改掉
`PAGES-LOGIN-INDEX` 38 行在 A 腿跑完后是：15 行 SKIPPED「action 含交互动词但本页没落在声明页（栈顶=pages/discover/index）」+ 9 行 FAILED「落在别的页…须人判」+ 12 行已盖章「本通道不可自动化」+ 2 行（LG02/LG03）FAILED。
⇒ A 腿在这一页**一条正向证据都没产出**，而我在 policy 里先写的"15 行 SKIPPED"只是腿跑到一半的读数。已按现量改正（`guest-landing-policy.json` 的 evidence 字段）。

### 反向收窄：两版规则都被证伪，最后落在"点名 + 文本兜底 + 幽灵检查"
- 第一版按"文本提没提 自动前进/redirect/switchTab"放行 ⇒ `tmp/qa/probe-login-kept.mjs` 逐行列出保留的 8 条，其中 6 条（LG01/LG08/LG10/LG21/LG22/LG37）的前置其实都是未登录，`redirect` 字样来自 storage 键名 `pending-login-redirect` 或"不消费 redirect 参数"这类断言。关键词把噪声留下了。
- 第二版只认「已登录 / isLoggedIn=true」⇒ 结果 LG03「重复进出登录页每次仍单跳前进」被误收进游客腿。它的前置真是已登录，但正文只写"新实例/自动前进"⇒ 纯关键词又会自己造一条假红。
- 终版：`keepOnLoginLegIds` 点名（LG02/LG03）优先，文本规则只兜底，另加"点名 id 本轮必须真在登录腿出现"的幽灵断言（判据改号时名单不会静默失效）。dry 读数：`收窄为游客腿(guest)=36`、`仍由登录腿跑=2`、`点名=2 实际留下=2 幽灵=无`、总数守恒 `36+2=38`、全库 `1107` 未动。
- #51 原任务名里的"26 例"是按早期读数写的，现量为 36 ⇒ 以现量为准。

### 新载具：`scripts/qa/verify-logged-in-landing.mjs`
"已登录进登录页应落寻觅"这件事以前只能人判：执行器只有**游客**落点口径（`guestGateVerdict` 读 `POL.rows`），登录态落点没口径 ⇒ 裁定每轮重新变成一条 FAILED 红。
本工具不占设备，直接把本轮 exec-results.json 里已经记着的 `route` 按 `policy.loggedInLandings` 判一次。现量：`本页行=38 在范围=38 采到落点=38 一致=38 相反=0` ⇒ `LOGINLAND_RESULT=PASS`。
两条限制写死在输出里，不许被读成整条判据过了：
1. 「全程只 1 次导航 / 两条前进路径无双跳竞争」这一半**不判**（执行器没有导航事件计数器）；
2. 只有点名载体行（LG02/LG03）没量到落点才算缺口，盖章不可自动化的行不计（那是噪声不是缺口）。
自测 9 例全过，其中 4 例是负例（量到第三页、一行都没有、route 全空、点名行缺席）——都验证过能红。
接线：`run-round7-closeout.mjs` 新增 `verify-logged-in-landing` 步骤（--exec 同时喂 mock 与 real 两轮，缺 real 就红），步骤数 19→20 已复核。

### 顺手记两条
- `SEL_RESULT=PASS`，但 `SEL_COMPONENT_SCOPE` 那一轴有条目：元素存在、只是躲在自定义组件里，页面作用域查询进不去（该门自己标注的实测点不动率 90.6%）。
  本节初稿写的是"193 条"，那是我从一次被 `--max-samples 12` 截断的面板读数（5 行 + "另 188 条"）凑出来的**错的数**；按门完整跑一遍的真实读数是 **200 行 / 去重后 145 条判据**（见 §132 的导出器输出）。⇒ #71 那批不是语料的活，是 **WS 腿**的活（① 那条通道），别拿改判据去"修"它。
- 语料 `--apply` 仍然不能现在做：戳在腿 0/1 已封，中途改写会让腿 12/13 量到与腿 10 不同的语料（腿 16 `queue-homogeneity` 就是查这个）。排在队尾之后，落完立刻复跑 dry 证幂等，再补一条只跑 `PAGES-LOGIN-INDEX` 的小队列。

## §132 那 145 条"点不到名"从此有一个能开火的第二把腿（但今天还没开火）
§131 把 `SEL_COMPONENT_SCOPE` 记成"WS 腿的活"之后，这句话本身还是一条没有载体的说法：门只把行数印在面板上，没有任何东西能拿着这批行去跑第二条腿 ⇒ 200 行（去重后 145 条判据）依旧是"知道却没人补"。这一段把载体补上。

- `scripts/qa/emit-component-scoped-ids.mjs`（新）：吃 `verify-case-selectors-exist` 的 stdout，产 `reports/audit/round-7/ids-component-scoped.json`。
  现量：`判据数=145 门行数=200 门自报=200 manifests=16` ⇒ 守恒对上。
  **中间撞过一次自己的假红**：第一版拿"去重后的判据数(145)"去对门的读数(200)，报"守恒破：少了 55 条"。
  两个数其实在回答不同问题——门的轴是"一行一个名"（一条判据点两个名就是两行）。
  改成 `entries`（行数）对门、`cases`（判据数）交名单，并在自测里钉住这条轴：
  `同一条两个名 ⇒ 行数 3、判据数 2，且选择器并起来`。自测 6 例全过（含截断行必须点名、格式不认识要报红、读数不能被 90.6% 的 90 骗走）。
- `r-exec-ws.mjs` 新增 `--ids-file`：名单三个方向都有读数，且**校验发生在拿租约之前**（名单坏了不许占设备）。
  正例现量：`名单=145 在语料=145 找不到=0` 之后立刻 `WSX_RESULT=FAIL reason=模拟器已被占用（r7-cli-exec-round-7-stage7-A-mock@pid28512 租期到 13:14）⇒ 一行都不跑`；
  反例现量：`tmp/qa/ids-bogus.txt` 两行假名单 ⇒ `名单=2 在语料=0 找不到=2` 并逐条点名 `PAGES-HOME-INDEX|ZZZ9`。
  反例还顺手抓出一个真 bug：`MANIFEST ID`（空格分隔）被 `replace(/\s+/g,"")` 拼成 `PAGES-HOME-INDEXH13` ⇒ 好名单也会被误判成找不到；改成按分隔符切开再拼 `|`。
  收尾守恒：`WSX_IDS 名单=N 语料里遇上=… 盘上有行=…`，跑完整而数不齐 ⇒ fails（"有条目被静默跳过"），被 `--limit` 截停 ⇒ 另打 `WSX_IDS_PARTIAL`，两种情况不混成一次成功。
- ① 的通道这一半顺带验到：`IDE_PORT_SOURCE=config D:/…/scripts/qa/ide-port.json → 9420`（端口来自配置文件，不是命令行旗标），且 WS 腿与 CLI 腿共用同一把租约。
- **诚实边界**：这一腿今天一次都没跑（设备被腿 10 占着）。⇒ #71/#47 不算完成，它们的收口条件是这条 WS 腿真跑出 145 行并做落点/探针判定；在那之前 145 条依旧是"判据成立但没在能点的腿上量过"。

## §133 stage-8 的腿先写好，并给它配一个开跑前体检
语料落盘必须排在 stage-7 队尾之后（§131 末），所以这一段把"落完之后按什么顺序跑"写死成 `scripts/qa/ui-queue.round8-stage8.json`：18 条腿、6 条占设备、15 条非 advisory。
顺序就是理由：落盘 → 复跑 dry 证幂等 → 重记戳 → 重造冻结副本 → 戳与副本双向对上 → 名册守恒 → 静态选择器门（两档）→ 开窗接回设备 → A 腿只跑 PAGES-LOGIN-INDEX → 游客腿跑同一 manifest → ④ 落点复判 → 两份分诊 → 换 real 档 → 真实档游客登录 → **WS 腿跑 145 条组件作用域** → 同构核对。
两条纪律是这次写计划时现学的：
1. **写计划=写可执行物件**，所以加了 `scripts/qa/check-queue-plan.mjs`：逐条查 `file` 是否存在、`--旗标` 是否真是那个工具读的口径（`--x` 字面或 `opt("x")/arg("x")/flag("x")`）、参数有没有混进非字符串、`why` 是否短到三个月后读不懂。
   它第一版就把我的错抓满：`verify-queue-homogeneity.mjs` 是我凭空发明的文件名（真实口径是 `verify-ops-corpus-stamp.mjs --queue <计划文件>`）、triage 腿我漏了 `--results/--dist` 两个必填、`--settle 24` 写成了 JSON 数字。
2. 体检器自己也拿已跑过的 stage-7 反证了一次：它对 stage-7 报 1 条 THIN_WHY ⇒ 说明它能红，不是恒绿装置。
现量：`PLANCHK legs=18 非advisory=15 设备腿=6 bad=0 PLAN=OK`。
另外把 `--dry 不许抢租约` 的同一把尺子用在计划上：**静态腿（选择器/分诊/戳）排在一起，占设备的腿成组排在换档之后**，这样任何一条静态红都不会浪费一次开窗。

## §134 三条挂着「待主编排层拍板」的台账行落判点，判点先红后绿
④ 点名的四项裁定此前已全部落地（登录页落点 §131、GATES.json 载体、遗留测试数据、ChatInput 去留）。这一段清的是台账里另外三条同样写着「待主编排层拍板」的行——我就是主编排层，"不代裁"不能变成永久挂账。

- **谓词先落盘，再改源码**（这才叫判点而不是事后描述）：`verify-source-shape.mjs` 加两条 ⇒ 现量 `SHAPE_FAIL MP-R2-CIRCLES-INDEX-007` + `SHAPE_FAIL MP-R2VIS-PAGES-PROFILE-INDEX-003`，改完源码后 `total=90 成立=90 不成立=0 守恒=yes`。
  中途我自己把 `location.vue` 那条规则用一次不对称 Edit 删坏（多出一个 `{` ⇒ `--check` 直接语法错），当场修回并复量条目数 88→90、`LOCATION-001` 仍在 ⇒ 没有静默丢规则。
- **PROFILE-003**：原判据问「拍 故事 还是 日常」——这是问不出答案的问题。改判成可判命题「同一区块内不得混用两个词」，锚 `MyStory.vue:57`（渲染 我的故事）与 `:93`（渲染 日常仅互相喜欢…）。
  裁决 = 区块名保留「我的故事」，提示语不再用第二个术语称呼同一批内容 ⇒ 文案改成「这些内容仅互相喜欢或你关注的人可见」。
  两处都是模板字面量（不是 i18n 键）⇒ 不牵动语言对；且刻意不改成「帖子与相册…」，因为那会新加一层我没验过的内容类型断言。
- **CIRCLES-007**：`--c-badge-on-image-*` 确实存在（`design-variables.scss:706` 声明、`activities/detail.vue:508/515` 消费），但语义是"图上角标"的深色底 `rgba(15,23,42,.7)` ⇒ 收编会把热门徽标从红底改成深色底，是改观感的回归，不是修 bug。
  裁决 = 不收编、不自造暗色令牌；把底/字就近成对声明为 `.circle-card__hot-badge` 上的 `--hot-badge-bg/--hot-badge-text`，**渲染值逐字节不变**（`rgba(255,77,92,0.92)` / `#FFFFFF`），文字节点是徽标节点的子节点 ⇒ 自定义属性能继承（先核了 `:427-428` 的嵌套再动手）。
  纯样式改动没有可搜字符串字面量 ⇒ 在 `band-freshness-markers.json` 登记 `--hot-badge-bg`（条目 3→4），否则这一档永远停在"无法定罪也无法洗清"。
- **CAMPUS-HUB-001（截断取舍）**：裁决 = **接受省略号截断**，不采纳"允许两行"（卡片高度会随统计文本浮动，正是理想图要避免的）与"操作列限宽"（判定面扩大到无判点承载的布局）。理由写进台账处置列，不再留"需人拍板"。
- **HOME-106** 复核发现早已裁定（台账 status 现值：`判据不成立（主编排层裁决：持久化属增强项，非本缺陷）`）⇒ 这一条我没有再动，只是把"它还挂着"这个印象纠正掉。
- 台账落账：`patch-ledger-cells.mjs --apply` 写 180 条计划补丁、实到 16 行变更（其余是同值幂等），备份 `.pre-cellpatch.bak`；`verify-ledger=PASS`（236 行 / 11 列 / 词表 0 违例），`FRAMECOV_CONSERVATION in=19 out=19 OK`，且 diff 里 `CHATINPUT` 命中 0 ⇒ 没把 §132 刚更正的证据格冲掉。
  另：`SRC_SHAPE_DUP` 现量报出谓词表内部 3 个重复 id（`MP-R2-PROFILE-034×2`、`…PROFILE-LOCATION-001×2`、`MP-R2VIS-PAGES-HOME-INDEX-004×2`）⇒ 记进 #76 那笔"重复 id"的账。
- **必须披露的副作用**：这两处源码改动让三档产物全部落后于工作树（`verify-band-freshness` 现量：mock/real/showcase 各列这两个脏项）。
  正在跑的 stage-7 腿 12/13（exec-A-real、exec-guest-real）**量的仍是改动前的产物** ⇒ 那两腿对 MyStory 文案与徽标变量不作证；已在 §133 的计划里补进 `rebuild-showcase-r8 → rebuild-mock-r8 → rebuild-real-r8 → gate-band-freshness-r8`（showcase 最先，因为它写 mock 目录），并把选择器门挪到重建之后 ⇒ 计划体检现量 `legs=22 非advisory=19 设备腿=6 PLAN=OK`。
  体检器顺手抓了我自己一条 `THIN_WHY rebuild-real-r8`（why 只写了 6 个字）⇒ 补成"两档必须同源于同一次工作树"的理由。

## §135 两处"接线洞"：步骤存在，但它读的东西从来不存在
这一段是等设备释放期间做的静态活，收获不在新功能，而在把两个**从来没真判过**的收尾步骤挖出来。两处同一个形状：我按记忆写了输入路径/参数名，而生产者从来不那么写。

1. `exec-frames-to-corpus` 那一步原来传 `--round round-7`，而索引器只认 `--results/--corpus/--identity`，
   并且自带「缺 --results 就 FAIL，不许拿空输入产出一个看起来完整的索引」的守卫
   ⇒ 收尾真跑到这里必红（我用一条已完成执行腿 `--dry` 复现了正例：`frames=105 uniqueHash=46 可省=59 证据异常=0 RESULT=OK`，
   也复现了空输入的 FAIL）。修法不是补一个路径，而是改成 `eachExecResults` 按盘上 `exec-*` 结果目录**现量展开**
   （`CLOSEOUT_EXPANDED → 14 步`），identity 从结果文件里读而不是我手填；一条都没有时留一步空参调用，
   让索引器自己掐红——"没有东西要索引"绝不能读成"索引过了"。
2. 收尾第一步 `queue-tally` 读的是 `reports/audit/round-7/queue-state.json`，而排队器把状态写在
   **它自己的 --out 目录**里：实测存在的是 `…/ui-queue/queue-state.json`（内容 25 腿 `OK=10 QUEUED=15`）。
   ⇒ 这一步历史上每次都只是打印 `MISSING <路径>` 然后继续往下跑完所有门禁，"本轮有没有红腿、有没有被截停的 NOT_RUN 腿"**从来没被断言过**。
   修法：两个位置都试；读不到就 `fail=true` 计入退出码（读空腿账 ≠ 没有红腿）；并把 `NOT_RUN` 的腿逐条点名——
   以前只点 FAIL，被截停的腿反而是隐形的。
3. 顺带把 stage-8 计划补全：`ws-channel-up-r8`（WS 腿的前置，r-exec-ws 的失败口径自己就这么要求，且明令不许 `close()`）、
   以及 §134 那两处源码改动带来的 `rebuild-showcase→mock→real + 新鲜度复量`。计划体检现量 `legs=23 非advisory=20 设备腿=6 PLAN=OK`。
4. 又量了两条我自己写的旧任务标题，都是过大的：
   - #70 的三件里两件已经满足（594 行 `at` 全有；非 EXECUTED 无原因的 0 行），真剩下的只有 FAILED 行不写 durationMs（11 条里 10 条空）与 SKIPPED 两样都有（207 有/197 无）；
   - #72 的「6 行欠裁定」按"状态未收口 且 处置列真写着要人拍板"的口径测得 **0 行**，剩下的是 待修复 3 / 未取证 3 / 欠帧复验 ~12（去向账 FRAMECOV `in=19 out=19` 仍 PASS）。
   两条描述已按现量改写，避免下一轮又拿旧数字当欠款清单。

**这一段的元教训**（不是新增记忆，是执行既有的）：一个步骤只要"输入路径是我凭记忆写的"，它就可能永远不红也永远不判；
所以新步骤落盘时必须同刻跑一次它的正例与它的空输入反例，看到两边的读数不一样才算接上。
