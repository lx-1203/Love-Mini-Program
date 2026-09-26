# v3.2 工作流研究与完整实现 —— 结果汇总（2026-09-25）

> 本文件是主代理的合并结论。分项证据见同目录 `ISSUE-CENSUS-2026-09-25.md`、
> `WF-VARIANT-RECONCILIATION.md`、`WF-CLAIM-VERIFICATION.md`、`WF-RUNTIME-GAPS.md`、
> `WF-RERUN-READINESS.md`（若已产出）。所有数字均由本次实测重算，未沿用台账继承值。

## 1. 定义文件现状

`​.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts` 现在是**两条独立轴线的合并超集**，约 1600 行。

| 文件 | 行数 | 身份 | 处置 |
|---|---|---|---|
| `workflows/miniprogram-qa-loop-v31.dwf.ts` | 1284 | 权威基线 A，本轮实际运行版本 | 逐字节未动 |
| `workflow-drafts/miniprogram-qa-loop-v31.dwf.ts` | 1512 | **第二轴线 B**：00:03 被逐字编译进 `dwfrun-dd96988a….mjs` 真实执行、00:06 被叫停的"收尾改造"稿 | 10 块已全部并入 v3.2；**不得重复再并** |
| `workflows/miniprogram-qa-loop-v32.dwf.ts` | ~1600 | 合并后的唯一定义 | 唯一可运行入口 |

A↔B 差异 316 行、A↔C 差异 160 行、B↔C 15 hunk / 633 行，两轴互不相交（B 里 `G7/G8/G9/__CAND__/INSTRUMENT` 命中 0；C 里 `REAL_ENV/构建守门员/run-pnpm22` 命中 0）。

**误删核查（防"替换误删"）**：`A \ C = ∅`，function 28=28、interface 33=33、`.ask` 25→26，
A 仅 6 行在 C 中消失且逐行确认为就地改写。合并后备份留在 `.zcode/tmp/v32.pre-merge.bak.ts`。

## 2. 本次并入 / 新修的关键缺陷

| 缺陷 | 证据 | 修法 |
|---|---|---|
| **致命** G7 用 `runPnpm` 跑 real 构建，而 `runPnpm` 无 env 通道 → real 产物覆盖 mock 共享 dist，违反自家隔离协议 | `:1232`、`prepare-static.mjs:154`、`prune-unreferenced-static.mjs:26`（会删文件） | 新建隔离脚本 `build:mp-weixin:real:isolated`；`WORKFLOW.build.realScript` 改指它 |
| **致命** 真实阶段对代理返回做无守卫链式访问（`real.g8.rings.map`）→ 干跑复现 TypeError，炸在终报之前，带走全部 mock 成果 | `WF-RUNTIME-GAPS.md` C 案实测 | `.catch(()=>null)` + 逐字段 `?? []` + 异常路径落 3 条 BLOCKED |
| **阻塞** `world.run` 沙箱对构建链秒级失败（实测三轮一致），且 PATH 上 node 是 v16（`uni build` 必挂）→ 会把 Gate 记成**假 FAIL** | B:482-484；本次实测 `node -v` = v16.13.1（连全局 fetch 都没有） | `PNPM_ENTRY`→`PNPM_WRAPPER(tmp/run-pnpm22.cjs)`；新增「构建守门员」子代理与 `runBuildViaGatekeeper`，G1/G7 统一走它 |
| 协议要求字段但结构装不下：`requiresReal` 在 51 份 ops manifest 里命中 0 | `reports/audit/*/ops/*.json` | `interface TestCase` 增 `requiresReal?: boolean` + 缺省语义 |
| 噪声治理只有半程：INSTRUMENT_RULES 未进 A6 判定员（判定员才是 verdict 归属者） | `WF-RUNTIME-GAPS.md` F6 | 注入 `INSTRUMENT_RULES` + 判定分域条款 |
| A5「仍开放」历史条目不生成 Issue ⇒ 永远绕开 worklist | B:823-845 | 并入 `stillOpen` 补录 |
| 新验收员驱动 9420 却不领锁协议 | F4 | 提示词注入 `UI_LOCK_RULES`，声明与 A1 共用同一把锁 |
| 版本/口径残留 8 处（横幅 v3.1、`六道 Gate`、锁枚举缺 `released`、Actor 计数、四路/六路/五路互斥） | M-1/M-2/F8 | 已改 6 处，余 2 处见 §5 |
| 凭据明文（MySQL root / Redis / 管理员口令）写在 B 稿 `REAL_ENV` 里，而该文件不在 .gitignore | B:64-76 实测 | 并入时改为指向根目录 `.env`，与 [C-7] 同纪律 |
| 终验魔数 `a<=2` / `CAP=24` 违背"数值只进配置"纪律 | §4 M7 | 收进 `maxTargetedFinalAuditTries` / `finalAuditPageCap`；删除已无引用的 `maxFixRounds` |

## 2bis. 我自己把文件改坏过，以及是怎么被发现和修好的

**必须记录的事实**：M6/M7 合并后，v3.2 一度**无法解析**（TS1005 EOF、`const r1` 重复声明）。
如果只按"我改完了"来交付，这份定义是跑不起来的。抓它的是验证代理的干跑，不是我自己的检查。

根因：我按 diff 的 hunk 行号做定长替换，而 B 的终验块实际比 hunk 边界长 34 行 → 循环体被吃掉、
少两个右括号；同时 B 块自带两行 R1，而我的替换起点是 for 循环 → R1 被复制成两份。

修复与验证（`.zcode/tmp/repair-splice.cjs`，备份 `v32.pre-repair.bak.ts`）：
- 用 B 的真实块尾补回 35 行，折叠重复 R1，锚点均带"出现次数必须为 1"的断言；
- 复跑 `dryrun-v32.cjs --case all`：**transpile 诊断 0**，八案全部对着 shipped 文件跑通
  （修复前 A 案 `TypeError reading 'P0'` 崩在 G7 之前；现 A/A2/C/D3 均正常落 3 条 BLOCKED 并出结论）；
- C 案（畸形返回）与 D 案（ask reject）证明 F2/F3 的守卫真的生效。

顺带查出并修掉的三个真实缺陷（都在 [C-16]/[C-17]）：
1. **R2 收割区静默空转**：第二步用 `files.read()`，而 `files` 不是宿主七个全局之一，
   抛错被外层 `try` 吞掉 → 收割从未入账任何发现，日志却照常打印。改为 HARVEST 单源输出 `{summary,all}`。
2. **G2 typecheck 仍走 `runPnpm`**：与 G1/G7 同一沙箱陷阱，会假 FAIL。已迁守门员。
3. **`accepted` 静默假阳性**：`realGates` 里非 PASS 的 Gate 不入 `blockers`，
   于是 G7/G8/G9 全 BLOCKED 仍可能判"已通过最终验收"。已改为强制阻断。

**同类风险：ask 无兜底（已试错并否决一条捷径）**。全文约 30 个 `.ask` 点只有 2 个带 `.catch`
（守门员、真实模式验收员）。D2 对照案实测：任一其它代理调用被 reject 就终止整轮，终报/artifact/
九道 Gate 全不产。

试过并**回滚**的方案：首次使用前重绑宿主形参 `agent`，给 `ask` 套全局 catch + 返回 deep-stub 代理。
八案崩溃数确实降到 0，但 D3 案随即失真：深壳对象 truthy、任何属性都取得到值，**击穿了全文
`res.x ?? 默认值` 的惯用法**，G7/G8/G9 从应有的 `BLOCKED` 变成 `undefined`。
也就是把"响亮地失败"换成"静默给出空判定"，比崩溃更危险。已按备份回滚
（`.zcode/tmp/v32.pre-askguard.bak.ts`，回滚后 diff 为 0 删 / 8 增，八案再次全 PASS）。

**下一轮的正确修法**：逐点加 `.catch(() => 该点自己的显式降级值)`，并让降级必然写入 `blockers`
（照 :1473 验收员那种写法）。不要用全局包装器一步到位——这条已经用实验排除了。

## 2ter. ask 兜底推进到 12/31（用稿子否证过的正确姿势）

按 §2bis 的实验结论，**不用全局包装器**，而是逐点 `.catch` + 每点自己的语义正确降级值 + 必然写 blockers。
本轮新增 10 处：P3 终验员、两处修复复验员、总验收官、终报路径修正、两处分片审查员（代码/视觉共用一个降级形状）、
需求对照员、历史回归员、操作执行员；加上原有 2 处（构建守门员、真实模式验收员）= **12/31**。

每处的降级值都按该调用点的返回结构给全字段（例如复验员给
`{verifiedIds:[], failed:[], newIssues:[], interactionRecheck:[], impactCovered:[]}`），
并把紧邻的 `for (const x of res.foo)` 一并改成 `res.foo ?? []`——
这样"代理没回话"只会退化为"该站没有发现"，同时 blockers 非空使 `accepted` 必为 false。

每次批量修改后都重跑 `dryrun-v32.cjs --case all`：**transpile 诊断 0、8 个 VERDICT 全 PASS、
SUMMARY assertion failures = 0**。仍余 19 个点未兜底（项目盘点员、历史整理员、理想图基准员、
回归索引员、截图取证员、用例设计员、Git 管家、修复工程师若干、书记员），D2 案仍是崩——
这是**已知的、有意的**残留，不是遗漏。

另外规则稿作者查出两件事，均已确认：
- 我写的四个门禁工具（`build-real-isolated` / `probe-real-env` / `verify-evidence-integrity` /
  `verify-queue-reconcile`）在定义正文里的**引用数为 0**——工具存在但没人调用，等于没接线；
  正在合并中补上。
- 视觉审查员提示词里「缺截图即记 P1」是 D8 那批假 P1 的**定义级来源**（census §4 D8 的 4 条 P1
  全部由此产生，而 13 页弹跳分诊的结论是 GENUINE_APP_DEFECT = 0）。

## 3. 新建的可运行工具（把叮嘱变成退出码）

1. **`apps/client/scripts/build-real-isolated.mjs`** —— G7 隔离构建。自设绝对路径 `UNI_OUTPUT_DIR`、
   只跑可安全改道的最小子集、**断言 mock 共享产物指纹未变**、拒绝构建进共享目录、node<18 直接失败并标注
   "测试台噪声非产品缺陷"。**已实测**：v16 下 1 秒内报 `G7_RESULT=FAIL reason=node 过老`；v22 下
   `G7_RESULT=PASS`，`MODE=real VITE_API_MODE=real`，`sharedOutUntouched=yes`，
   全量构建 exit 0，工作树零残留（3 个桩化文件哈希回到构建前值、`AUTO-GENERATED STUB` 命中 0、
   `git status apps/client/src` = 0 项）。
2. **`scripts/probe-real-env.mjs`** —— G7/G8/G9 只读前置探测。**已实测**：
   `PROBE_BACKEND=UP http=200`（推翻"本轮后端不可达"的假设）、`PROBE_ASSETS_ON_DISK=1431`。
3. **`scripts/verify-evidence-integrity.mjs`** —— G6「证据==盘」门禁（contentHash 算法实测为
   sha256 前 16 位）。**已实测** round-2 两份 manifest 各 254 帧：
   `MATCHED=254 MISSING=0 HASH_MISMATCH=0 ORPHANS=0` → PASS，另报 3 组"不同状态字节完全相同"。
   工具自身曾产出 345 个假孤儿（漏算 `zoomFrames`），已修正并在源码注明。
4. **`scripts/verify-queue-reconcile.mjs`** —— 把 [C-3] 那句"轮末必须断言 已记录 == 计划总数"
   变成退出码。**已实测复现全部台账数字**（三条独立来源互相印证）：
   `PLANNED_SUITES=24 PLANNED_CASES=1107` / `RECORDED_SUITES=21 RECORDED_CASES=941 UNIQUE_IDS=911` /
   `GAP=166 NEVER_RAN_SUITES=3 NEVER_RAN_CASES=116`（村口三套 = index 42 + post 40 + publish 34）/
   `DUP_ID_GROUPS=30 ERR_TAINTED_CASES=373` → 退出码 1。
   缺口 166 = 整套未跑 116 + `次要19` 被截断 50，与 §4 的重算值完全对上；
   跨 suite 复用 id 使"按 id 去重"必然低估（941 条只有 911 个唯一 id），此点亦已机检。
   四个新工具均通过仓库自身门禁 `check-project-rules`（0 errors），且不含字面绝对路径。

## 4. 对台账的三处公开更正（都是本次重算所得）

1. **D3「manifest 哈希与盘脱钩」已不成立**：被引为铁证的 `A/pages_messages_index__空态.png`
   已不在盘上、也不在任何 manifest；它被迁到 `.zcode/tmp/orphan-frames-from-12xx-run/`（实测 50 文件），
   迁移件哈希恰为 `428a5662791d1b5e` = 台账所称"盘上实际值"。即当年观察属实、**现已处置**，
   在册 254 帧哈希今日全部对得上。census 把这条列为待堵缺陷而未复核现状。
2. **G9 素材可达性被严重低估，且主因已定位到"中文文件名"**：按 v3.2 定义从 `images.ts` 抽出
   `IMAGE_PATHS` **455** 条（首版抽 0 条＝解析失败，已按协议判 FAIL 而非通过），real 基址探测
   **可达 62 / 404 共 393**，其中 **384 条文件确实在后端 uploads 盘上**。
   **决定性对照**：62 条可达里 **CJK 命名 0 条**；393 条失败里 **CJK 命名 370 条**。
   失败按批次聚集也与之吻合（`messages-split 114 / match-split 71 / profile-other1-split 65 /
   login-split 52 / profile-other2-split 39 / profile-self-split 29`，这些切图文件名均为中文；
   可达的是 `message/svg`、`mascot` 等 ASCII 名）。
   → **修正我自己先前的过强结论**：不能说"是编码而不是注册表"。实测反例已找到——
   `assets/icons/register/` 整批 14 个**纯 ASCII 名**文件全部在盘、全部 404（可达 0/12），
   说明字符集不是唯一决定因素。正确表述是**两类独立成因**：
   (A) 370 条 CJK 命名素材 100% 不可达（成功的 62 条里 CJK 为 0，尚无 CJK 反例），
   指向非 ASCII 路径编解码/存储键；(B) 至少一个 ASCII 批次整批未注册/未同步，与字符集无关。
   两者在"哪些批次被同步过"上是**混淆的**，所以不能再用"按字符集中断"去否定注册表。**机制现已确证**（活体日志 + 只读 SELECT）：`extractAppAssetSubPath()`
   （`MediaAccessController.java:527-537`）拿**未解码**的 `request.getRequestURI()` 当查找键，全链路无一次
   decode，于是百分号编码的中文路径永远匹配不上库里的原始 UTF-8 行（中文行 377 条全 approved、`%` 形态 0 条；
   目标行 `id=1409` 实测 approved）。404 由**注册表分支** `:356-360` 发出，磁盘分支根本没跑到。
   同一中文素材的编码矩阵：单次 UTF-8 百分号 **404** / 双重编码 **400** / curl 裸字节 **400**（Tomcat 连接器拦），
   同目录 ASCII 兄弟全形态 **200**。
   **最小修法 A**：`:527-537` 返回值加一次 `UriUtils.decode(sub, UTF_8)`（**别用 `URLDecoder`**，它会把 `+`
   解成空格，`VoiceMessageController.java:128` 已踩过）；一行改动同时开两扇门，62 条 ASCII 行为不变，
   零迁移零发版，**但需要重启 8080**（正好也要重启才能带上那批 5 天前的 Java 改动）。
   成因 B（整批未注册）仍需单独一次注册/同步，与字符集无关。
   剩余 23 条 ASCII 失败是另一类原因（含 9 条后端盘上根本没有），需单独归因。
   同时**否证**了两条旧说法：(a)"200-vs-404 取决于文件是否在盘"——本次在盘却 404 有 384 例；
   (b)"heart-filled-white.svg 断链是缺陷"——它 **不在 IMAGE_PATHS 里**（images.ts:521 记录该常量已移除，
   MatchSuccess.vue:309 改用 `filter: brightness(0) invert(1)` 复用已获批图标），属故意不用，
   我的探针硬塞样本造成的永久假警报，已从 probe 中删除。
   精确机制（服务端 decode、还是入库 key 编码不一致）仍待服务端核对，不在此处下结论。
3. **数字漂移**：v3.2 文本沿用「288 条 FAILED / 192 条 __CAND__ / 缺口 167」，
   重算终值为 **289 / 194 / 166（= VILLAGE 三套 116 + 次要19 截断 50）**。

另：本轮 exec 确实 0 写库，但同日 22:30–22:43 有独立 API 层 E2E **真实写库**
（`posts.id=230`、`comments.id=1201`、total 182→183），脏数据仍在库（按既有指示未清理）。

## 4bis. 下一轮能否直接跑 —— 结论：不能，且原因不是"锁没放"

`WF-RERUN-READINESS.md` 报出三条阻塞，其中第一条我已独立复核并**当场修进定义**：

1. **自动化端口不是 9420**。我本机 `netstat` 复核：仅 `127.0.0.1:9430 LISTENING`（pid 32580），
   9420 无任何监听者。原 G0 预检只探 9420，会把状况误报成"DevTools 未开，请手动打开并载入项目"——
   而工具其实开着，只是端口不同。沿用固定 endpoint 的后果是 **A1 整轮 0 证据**，
   比本轮暴露的 mock/real 问题更致命，因为它让"有证据"这件事本身静默失败。
   已改为按 `ui.portCandidates` 逐个探活并取实际端口，锁文件名同步为 `wechat-automation-<port>.lock`；
   探针生成码在本机实测返回 `{"live":[9430],"api":true}`。记为 [C-14]。
2. **锁不是问题**：pid 40468 已死、心跳停摆远超 `staleAfterSeconds`，属可直接接管的僵尸租约
   （v3.2 的按 pid 存活接管条款正好覆盖此场景）。
3. **941 条证据已全部过期**：证据绑 `18c91ccf`，HEAD 现为 `874ff52f`（调查期间还在漂），
   期间 47 个 `apps/client/src` 文件被改 → 按 G6"同轮同 SHA"契约，R2 全部证据只能降级为
   "参考、未按当前代码验证"。这条正是 v3.1/v3.2 都堵不住的 **D1（provenance 单点计算）**，
   规则文本待 `V32-D-RULES-DRAFT.md` 并入。
4. **real 侧从零开始**：`reports/audit/real-e2e/` 不存在；两份 `project.config.json` 的
   `miniprogramRoot` 都指 mock 产物 → 同一工具会话跑不了 real 验收，需切项目路径。
5. **取证造假面已量化**：`exec-results.json` 941 例 / 1270 条 evidence 里，
   **437 条（占 935 条文件型证据的 46.7%）带 `ERROR:timeout`**，且其中 **435 条指向的文件根本不存在**
   （只有 2 条虽报错但文件在）；另有 335 条 evidence 是 `scrollPos=bottom` 这类观察串而非像素证据；
   **干净引用里 0 条断链** —— 也就是说损失全部集中在"超时被记成已执行"这一类，不是文件散失。
   373/941 例（39.6%）至少有一条被错误污染的证据。通道故障被静默计入了完成度，此条由
   `scripts/verify-evidence-integrity.mjs --exec` 机检，退出码非 0。
   （注：`46.7%` 与 `34.4%` 是同一事实的两个分母——前者按文件型证据 935 条，后者按全部 1270 条。
   本工具第一版还把 575 条带 `(155040B)` 大小注记的正常路径误判成断链，已修正为剥注记后再判。）

## 4ter. 「证据==盘」不变量的全域体检（5 份 manifest，逐张重算哈希）

`scripts/verify-evidence-integrity.mjs` 对全部历史 manifest 跑一遍，结论是**只有 round-2 可被背书**：

| manifest | 帧数 | 哈希相符 | 未记哈希 | 路径不可解析 | 孤儿 | 同内容"不同状态"组 |
|---|---|---|---|---|---|---|
| round-2 `screenshot-manifest.json` | 254 | **254** | 0 | 0 | 0 | 3 |
| round-2-tour `manifest-detail.json` | 254 | **254** | 0 | 0 | 0 | 3 |
| round-1 `screenshot-manifest.json` | 305 | 0 | **305** | 0 | **144** | 0 |
| round-1-tour `manifest-detail.json` | 305 | 0 | **305** | 0 | 0 | 0 |
| round-1 `manifest.json` | 144 | 0 | 0 | **144** | 144 | 0 |

判读（注意我把"未记哈希"与"哈希不符"分成两列——首轮跑出 `HASH_MISMATCH=305` 是我的措辞错误，
round-1 其实是整批**没有 contentHash 字段**，该特性是之后才加的）：

- round-1 的 305 帧无哈希可校，另有 144 帧记录的相对路径从仓库根无法解析 → **历史帧无法事后背书**。
- 叠加 HEAD 已从 `18c91ccf` 推进到 `874ff52f`（47 个 `apps/client/src` 文件在其间被改），
  按 G6"同轮同 SHA + 哈希可校"的契约，**R1 与 R2 的旧证据在下轮一律按过期处理、须重采**，
  不存在"沿用截图省一轮"的余地。
- round-2 那 3 组同内容不同状态（home / nearby 的「默认 vs 交互后」、village-publish 的
  「默认 vs 弹层态」字节完全相同）是真实的取证缺陷信号：点击后画面无变化，或采证时机太早。

## 4quater. `requiresReal` 的真实规模（给 G8 一个可核对的分母）

对 24 份 ops manifest / 1107 例做只读扫描（不改写任何证据文件）：

- **显式标了 `REAL_ONLY` 的用例 = 192 例**（census 说的"285 处"是该串的**出现次数**，按用例去重后是 192，两者不矛盾）；
- 叠加"expected 语义上需要真实后端"（落库/后台/审核/持久/total/计数 + 写动词）后为 **352 例（31.8%）**，
  波及 **23/24 套**，最重的三套是 `次要20 58/101`、`次要21 50/102`、`次要22 36/78`，
  业务套件里 `VILLAGE-PUBLISH 27/34` 几乎整套都要真后端。
- **352 是上界，不是终值**：语义启发式会把"断言不发请求"的用例误收进来。
  实测反例 `PAGES-LOGIN-INDEX/LG14`（expected 为「无 /auth/phone-login 请求、network 计数=0」），
  它恰好是 mock 就能证伪的负向断言，却被"提交 + 计数"命中。
  → 可信下界取 **192 例**，上界 352；下轮要按 manifest 逐条打 `requiresReal` 字段才算收敛，
  别把 352 当成精确数用。

## 4quinquies. 重启 8080 后复测：成因 A 已消除（393 → 23）

用户授权后按 `apps/api/restart-backend.ps1`（真实 profile，带 `APP_GUEST_LOGIN_ENABLED=true`）重启，
先 kill 旧进程再 `mvnw -o compile`（避免在活 JVM 下改 `target/classes`），41.5s 起来，`/actuator/health` 200。
字节码复核确认 `UriUtils.decode(String, Charset)` + `StandardCharsets.UTF_8` 已在编译产物里。

**同一份 IMAGE_PATHS 探针复跑（455 条，判据完全一致）**：

| | 修复前 | 修复后 |
|---|---|---|
| 可达 | 62 | **432** |
| 404 | 393 | **23** |
| 在盘且 200 | 62 | 432 |
| 在盘但 404 | 384 | **14** |
| 不在盘且 404 | 9 | 9 |
| 不在盘但 200 | 0 | 0 |

翻转的 **370 条恰好等于此前定位的 CJK 集合**，两成因模型被实测证实。
剩余 23 条**全部**是 `assets/icons/register/` 这一 ASCII 批次（14 条在盘未注册 + 9 条包内有但后端盘上无），
与字符集无关 → 只剩成因 B。

**安全对照（解码放宽是否打开穿越）**：`%2e%2e%2fapplication.yml` → **400**；
裸 `../application.yml` → **401**；双重编码 `%252e…` → **400**；已知好的 ASCII 素材仍 **200**
（无回归）。三道防线（注册表白名单 + `validateSubPath` + normalize/startsWith 包含校验）都成立。

遗留小工具缺陷：`g9-probe.cjs` 的 `G9_NONASCII_FAILS` 一度把 `[在盘]` 中文标签算进字符集判断
（报成"23 条非 ASCII"），实际这 23 条全是 ASCII。已修：分类只看 ` -> ` 之前的路径段。
—— 这是本次会话第三次被自己的输出字符串污染判据，已记入 memory。

### 收尾：成因 B 已清除，G9 全绿

在重启并确证成因 A 之后，B 也按**纯增量**方式处理完（该批次实测原有 0 行注册，故无需 DELETE/UPDATE）：
- 从 `static-local-backup/full-static/` 补拷 **9** 个后端盘上缺失的图标到 `apps/api/uploads/app-assets/`；
- 按已知可工作行的列约定（`mime='image/svg+xml'`、真实 size、`width/height=NULL`、
  `status='ready'`、`audit_status='approved'`、`user_id=0`）INSERT **23** 行；
  修正 SQL 与回滚句留在 `.zcode/tmp/register-register-batch.sql` /
  `DELETE ... WHERE type='app_asset' AND url LIKE '%icons/register%'`（只删这 23 行）。
- **最终实测**：`G9_PROBED=455 G9_OK=455 G9_FAIL=0`，对照表四格变成
  `在盘且200=455 / 在盘但失败=0 / 不在盘但200=0 / 不在盘且失败=0` → `G9_RESULT=PASS`；
  `probe-real-env.mjs` 亦报 `PROBE_BACKEND=UP`、`REACHABLE=8/8`、`PROBE_VERDICT=READY`（exit 0）。

顺带纠正两处我自己写错的判断：sync 工具的 `image/webp` 兜底分支**从未真的写进库**
（387 条 svg 行全是 `image/svg+xml`），所以那是代码里的潜在坑而非现存故障；
另外我查 mime 分布时误用 `mime='image/svg%'`（等号不认通配符）得出过 0 行的假结论，已用 `LIKE` 重查。

**G9 至此闭环**：定义有规则、工具有退出码、根因有活体证据、数据已补齐、455/455 实测可达。

## 4sexter. G8 前后端数据同步：已跑通，6/6 环 PASS

重启后用户授权写入，遂把五环（+计数比对）实跑到底。执行器已从临时区提升为
`scripts/qa/g8-e2e.cjs`，并在 v3.2 的 G8 规则里写明"本环可机检 + 管理端返回体是扁平的"这个坑。

| 环 | 结果 | 证据 |
|---|---|---|
| 1 客户端身份 | OK | `POST /auth/guest-login` → 200 且拿到 JWT（launcher env 的 `APP_GUEST_LOGIN_ENABLED=true` 生效）；`wx.login` 仍 502，按 NOT-EVIDENCED 记，不算失败 |
| 2 客户端写库 | OK | `POST /api/v1/posts` → 200，`data.id` 落库（DB 有行） |
| 3 后台按 id 读到 | OK | `GET /api/v1/admin/forum/village-posts/{id}` → 200，**title 字段在**（值如「G8取证2609250403号」） |
| 4 审核驱动可见性 | OK | 建完即在 `posts` 里但 `audit_status=pending`、前端列表不含；`POST …/{id}/audit` decision=approved → 200；前端 `total` 184→185 |
| 5 幂等重放 | OK | 同 `Idempotency-Key` 重放 → **409**，`total` 不变；DB 侧 `posts_total=189`＝基线 184 + 5 次真实建帖，4 次重放**一条都没多写** |
| 6 计数双向一致 | OK | 客户端 `likeCount=1 / commentCount=1` ＝ DB `likes_count=1 / comments_count=1` |

**顺带确证：后台 title 字段对账缺口已修复且真正生效**——`PostRepository` 的
`searchForVillageAdmin` 现已含 `OR p.title LIKE …`（注释自陈"原实现只 LIKE p.content"），
且按纯标题串搜索返回 `total=1`。这项此前只停在"改动等 8080 重启"，是本次重启把它送上线的。

**本轮写入的真实数据（按指示未删除，交你决定去留）**：
`posts.id=231,232,233,234,235`（231/232/233 仍是 pending，234/235 已 approved）、
`comments.id=1202,1203,1204`、233/234/235 各 1 次点赞；
另有 G9 侧新增的 **23 行 `media_asset` 注册**与 **9 个补拷进 `apps/api/uploads/app-assets/` 的图标文件**。
回滚只需按这些主键删，`DELETE` 范围不含任何既有业务数据。

**两次自我否证（重要，别当成产品缺陷）**：
① "后台 detail 不暴露 title" 是我按 `{code,data}` 形状解析**扁平**返回体的结果，实为可见；
② "疑似重复写入" 是我一次 `total` 读数为 null 造成的假告警，DB 计数已证否。
③ `posts.id=231` 是我第一次**崩在解析器上**的那次运行留下的，不是别的会话写的——多出来的行要记在自己账上。

另外我自己把 v3.2 改坏过一次（在模板字符串里嵌了反引号），transpile 立刻从 0 变 2，
按判据回滚修好后复测 8/8 PASS——这正是这条纪律的价值：**改完必跑解析，别信"我应该写对了"**。

## 4septies. 补齐稿子"待下轮"的 5 件工具（并修 D1 的真根因）

| 新门禁 | 堵哪条 | 本次实测输出 |
|---|---|---|
| `scripts/qa/verify-state-truth.mjs` | D10 四源真值 | 计划 1107 / 权威 941 / 检查点 922 / 快照 940 → **用例数极差 185**；FAILED 289/282/288 极差 7；`checkpoint.failures[]` 恒空但累计 282 条；941 条只有 911 唯一 id → **FAIL** |
| `scripts/qa/verify-ledger.mjs` | D7 台账收敛 | 34 个来源、750 个 distinct ID，其中 **383 个从未进任何矩阵**（台账原记 237，又是被继承值低估）→ FAIL |
| `scripts/qa/verify-evidence-corpus.mjs` | D3+D1 全语料 | 5 份 manifest **5/5 的 gitSha 都不是当前 HEAD**（round-1 两份还整批无哈希、round-1/manifest.json 144 条路径不可解析）；并扫出 **5 处硬编码 `aefd8a72`** → FAIL（这是真状态，就该红） |
| `scripts/qa/verify-backend-restarted.mjs` | D16「已重启」证明 | PASS：JVM 起于 11:37:11，晚于最新 java 源码（正是我改的 `MediaAccessController`，17:40Z）与 HEAD(00:31) → 证明本轮 API 结论测的是新构建 |
| `scripts/verify-evidence-integrity.mjs`（扩展） | D4/D5 | `dupState` 与 `--exec` 的缺陷现参与退出码；round-2 因此从"绿"转**红**（3 组同内容"不同状态"），符合 D4 定义 |

**D1 根因当场拔掉两处**：`scripts/qa/r1-exec.cjs:51` 与 `tmp/tour-R1.mjs` 把 gitSha **写死成 `aefd8a72`**，
这正是 R1 那 305 帧集体过期的来源。两处改为运行时 `git rev-parse --short HEAD`，取不到就 exit(1)
——宁可不出证据，也不出一条对不上提交的证据。`tmp/rebuild-R*.mjs` **故意不改**：
用今天的 HEAD 去回填历史 manifest 等于伪造记录，就让扫描器一直指着它们。

**我今天的工具又自产了两次假信号**（都靠回读输出才发现，没发出去）：
① 路径存在性检查里 `(mjs|cjs|js|ps1)` 把 `.json` 截成 `.js`、且漏了 `apps/client/` 前缀，
误报 3 个"dangling 引用"，修正正则后 **0 个**；
② 硬编码 SHA 扫描器命中 `tour-R2.mjs` 的**注释**（那行是在记录"曾经写错过"），
现先剥注释行再匹配。加上此前的 zoomFrames 假孤儿、`(155040B)` 假断链、中文标签污染字符集计数、
`fetch` 未定义伪装后端宕机——**同一类错误今天犯了六次，全是"在自己的输出上判据"**。

## 5. 续跑清单（命令级，接手即可执行）

1. **合并代理收尾后第一件事**（唯一判据，别看行数）：
   `cd /d/6/恋爱小程序 && /d/codex-tools/node-v22.17.0-win-x64/node.exe .zcode/tmp/dryrun-v32.cjs --case all`
   → 必须 `transpile diagnostics: 0` 且 8 个 VERDICT 全 PASS、`SUMMARY: assertion failures = 0`。
   回滚锚点（按时间顺序的 5 份备份都在 `.zcode/tmp/`）：
   `v32.pre-merge.bak.ts`(1449) → `pre-repair`(1715) → `pre-askguard`(1770) → `pre-askcatch`(1778) → `pre-drules`。
2. **补两处已定位未落地的接线**（都在本文 §5 有判据）：
   `用例设计员`【产出】字段清单加 `requiresReal`；`REAL_ENV` 素材条改成"两类成因 + 注册表确证为决定分支"。
3. **重启 8080**（解锁：成因 A 的 `UriUtils.decode` 修复、5 天前的那批 Java 改动、后台 title 对账）。
   重启前先确认 `git status` 里 `apps/api` 的改动范围是自己人写的。
4. **重启后立即复核 G9**：`node .zcode/tmp/g9-probe.cjs`（预期 CJK 那 370 条转可达）
   与 `node scripts/probe-real-env.mjs`。若 CJK 转好、register 批仍 404，就证明只剩成因 B。
5. **成因 B**：先跑不带 `--apply` 的 `node scripts/sync-app-assets.mjs` 拿到 SQL，
   把 DELETE 范围核到只含本批 `type='app_asset'` 后再考虑写库（不可逆写：先备份、先 ROLLBACK 干跑）。
6. **G8**：需要 9420/9430 模拟器会话 + 真实写库；开跑前必须确认后端以
   `APP_GUEST_LOGIN_ENABLED=true` 启动，否则体验账号 403 会被误判成产品缺陷。
7. **ask 兜底收尾**：还剩 19 个点（`grep -nE "\.ask[<(]"` 对比 `grep -c askFail(`），
   每点交出自己的降级值并写 blockers；**不要**再试全局包装器（§2bis 已用实验否证）。
8. 下轮起跑口径：所有历史截图证据按过期处理（HEAD 已从 `18c91ccf` 走到 `874ff52f`，
   且 round-1 的 305 帧根本没有 contentHash 可校，见 §4ter）。

## 6. 未完成 / 需授权

- **【已改代码，待重启生效】成因 A 的一行修复已落地**：`MediaAccessController.extractAppAssetSubPath()`
  改为返回 `UriUtils.decode(raw, UTF_8)`（源文件 `:527-543`，用全限定名故不动 import）。
  安全性已核：解码后仍要过注册表白名单（real）+ `loadAppAsset` 的 `validateSubPath`
  与 normalize/startsWith 双重越界校验，**不扩大路径穿越面**。
  编译验证：`javac` 输出到 `.zcode/tmp/javac-out-g7`（**未碰运行中 JVM 的 `target/classes`**），
  exit 0。改动在重启 8080 之前不生效，而重启正好一并带上那批 5 天前的 Java 改动。
  预期效果：370 条 CJK 素材从 404 变可达（库里 377 条中文行全部 approved）；
  成因 B 的整批未注册素材仍需一次注册/同步。
- **【新增阻塞事实】8080 上跑的是 9 月 19 日的旧构建**：`Get-Process java` 实测
  pid 30324 `StartTime = 2026-09-19 18:48:47`，而 `AdminVillagePostController.java` 的 mtime 是
  **2026-09-24 23:22:56**、`apps/api/.../admin/` 最后一次提交是 **2026-09-25 00:31:39**。
  即后端进程比这些改动早 **5 天多**，本轮所有 API 层取证（含 G9 素材探测、G8 的后台侧读、
  以及"后台字段对账 title"）量到的都是**改动前的代码**。
  → 任何 G8/G9 结论在 8080 重启之前都不成立；重启属需要授权的动作（无 devtools 自动重载，
  且 `mvn compile` 会覆盖运行中 JVM 懒加载的 `target/classes`）。
  这条同时提醒：素材不可达的机制若在 Java 侧，源码里的现状与线上行为可能已经不一致。
- **requiresReal 缺"生产者侧"接线**（合并代理交还写入权后要补，实测于 grep）：字段在
  `interface TestCase` 里已有、`INSTRUMENT_RULES` 也强制要求打这个标记，但**用例设计员的产出契约**
  （`【产出】用例 JSON 写入 …（{cases:[…]}）` 与上一行的 `PRE/ACTION/EXPECTED/EVIDENCE/tier` 清单）
  **从未列出 requiresReal** —— 写用例的代理没被要求输出这个字段，manifest 就永远不会带上它，
  于是"mock 轮不得把写库断言记成 PASS/FAIL"这条规则在源头就落不了地。
  补法：在设计员提示词的字段清单里加 `requiresReal`，并给一条判据
  （expected 含落库/后台可见/审核流转/计数同步 → true），同时要求它回报打了标记的条数，
  好让 `verify-queue-reconcile` 那类机检能核对"标记数 ≠ 0"而不是默认信 0。
- **待回写的一处口径**：v3.2 的 `REAL_ENV` 素材条目目前把"文件名字符集"列为归因顺序①，
  这是我在发现 register 反例**之前**写的。合并代理交还写入权后，要把该条改成"两类独立成因
  （CJK 编解码 / 整批未注册）+ 必须先各做一个反例对照再定性"，否则会误导下一轮只查编码。
- **G8 前后端数据同步**：未执行。需要 9420 模拟器会话 + 真实写库（发帖/点赞/审核流转），属对外可见的
  状态变更，等用户授权；G8 前置须确认后端以 `APP_GUEST_LOGIN_ENABLED=true` 启动，否则 guest 403 会被误判。
- **成因 B 的修复路线（未执行，需授权；含一条危险细节）**：正路是项目自带的
  `scripts/sync-app-assets.mjs`（复制 static → uploads/app-assets，并生成 media_asset 注册 SQL），
  不要手工往 uploads 目录塞文件。
  - `node scripts/sync-app-assets.mjs` —— 默认只拷贝 + 把 SQL 打到 stdout（不碰库）；
  - `--apply` —— **其 SQL 是"先 DELETE 再 INSERT"的幂等写法**，会删库里既有 media_asset 行。
    按本项目纪律（不可逆写先备份、先在 ROLLBACK 下干跑、literal 命令过宽就收窄），**不得直接 --apply**：
    先把 DELETE 范围核到只含 `type='app_asset'` 且属于 `assets/icons/register/` 这批，再谈执行。
  - 顺序：先重启 8080（带上成因 A 的解码修复 + 那批 5 天前的 Java 改动），再补注册，
    否则注册完仍然是在旧构建上量。
  - 现状数字：register 批 14 个 ASCII 文件在盘全部 404，另有 9 个包内有、后端盘上没有。
- 剩 12 条定义缺陷（D1 provenance 单点/可硬编码、D4 同名不同质凑配额、D5 缺第四等态、D7 台账多 ID 不收敛、
  D8 零截图误立 P1、D10 三份产物无单一真值源、D12/13/14 前置未声明、D16 修复与取证同工作树耦合、D17 通信劣化无处置）
  的规则文本由 `V32-D-RULES-DRAFT.md` 承接，逐条并入后本文件更新。
- 版本口径残留 2 处（"四路/六路/五路"表述、锁状态枚举行内文本）与死配置键若干，属低风险文本整理。
- 工作树卫生：`dist/build/` 下 8+ 个历史产物目录、根目录误建文件 `0` / `nul` 未清理。

## 7. 追记（2026-09-25 下午：定义侧收口完成，ask 兜底 31/31）

按本文件 §5/§6 执行了一轮定义侧收口。改动前快照：`.zcode/tmp/v32.pre-askfinish.patch`
（Mimosa 钩子禁止 Bash 直写 .ts，备份为 git patch 形式）。验收判据同 §5.1。

1. **§5.7 ask 兜底：31/31 全部完成**。本轮补 19 处：项目盘点员、历史整理员、理想图基准员、回归索引员、
   截图取证员、用例设计员、交互判定员、Git 管家×2、修复工程师×9、书记员；每点交出按本站返回结构
   给全字段的降级值，经 `askFail` 必然写 blockers。**D2 案行为从"崩溃"变"诚实早退"**
   （盘点无页 → conclusion 携带 blockers 故障记录终止，不再误导向"pages.json 不可读"），
   harness 的 D2 预期已同步改判为 `mustResolve + conclusion 含「无法开始审计」`。
2. **§5.2 requiresReal 生产者接线**：实测已在文件里（设计员字段清单+反向断言判据+计数回报），本轮未动。
3. **§6 REAL_ENV 素材条**：成因 B 从"23 条待注册"更新为闭环口径（补拷 9 文件 + 注册 23 行、455/455 全可达；
   此后任何 404 按回归处理，禁止再归因字符集/待注册）。
4. **版本口径残留清零**：四路/六路/五路统一为"五路"（实际 5 条复核席，5 处文本）；锁枚举行内文本补全
   `AVAILABLE/…/released 墓碑`（2 处）；顺带修掉终验提示词硬编码"独占 9420"（G0 已按 portCandidates 实测为准）。
5. **死配置键清理 + 一个真缺陷**：`severityPolicy/evidence/cache/regression/maxFinalAuditTries` 删除
   （0 引用，语义已由代码承接，删除处留了去向注释）；**真缺陷**：终验兜底 blocker 报数引用
   `maxFinalAuditTries(4)` 而循环上限实为 `maxTargetedFinalAuditTries(2)`，会虚报"终验 4 次"——已改。
6. **semanticScan [2451] history 确证为 harness 假阳性**：TS relatedInformation 指向 `lib.dom.d.ts` 的
   `window.history`（顶层裸编译+全量 lib 才撞）；真实 CreateWorkflow 编译器把脚本包在函数体内，
   局部遮蔽合法（v3.1 同款代码真实跑通过整轮）。harness semanticScan 已改为包 `async function` 后扫描
   （行号 −1 校准），"real problems" 归零——**此后 dryrun 报 real problem 才是真问题**。
7. **验收**：`node .zcode/tmp/dryrun-v32.cjs --case all` → transpile 0、真实语义问题 0、
   8 案 VERDICT 全 PASS、SUMMARY 断言 0（含改判后的 D2）。
8. **仍待运行时/授权**：G8 模拟器会话与真实写库授权、v3.2 完整版真实起跑、`dist/build/` 历史产物目录
   与根目录 `0`/`nul` 清理。
