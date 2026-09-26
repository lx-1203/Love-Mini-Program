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

