# WF-RUNTIME-GAPS — miniprogram-qa-loop-v32.dwf.ts 运行时缺口审计

审计对象：`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（1432 行 / 99,767 B，今日从 v31 复制后增量编辑）
基线对照：`.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts`
方法：整份文件当作"马上要真跑一遍"来审计 —— 符号闭环、执行器 API 一致性、控制流、Gate 落点、提示词自洽、可执行性预检。

## 0. 缺陷总表（按致命度排序）

审计对象绝对路径：`D:\6\恋爱小程序\.zcode\workflows\miniprogram-qa-loop-v32.dwf.ts`（下表 file:line 均指此文件，除非注明）。
判定口径：**确定是缺陷** = 有代码/运行证据；**需人工确认** = 依赖宿主或代理行为，静态无法定论；**无问题** = 核查过、排除。

| # | 缺陷 | 严重度 | 判定 | file:line | 建议改法 |
|---|------|--------|------|-----------|----------|
| F1 | G7 构建走 `build:mp-weixin:real:dev`，该脚本链不注入 `UNI_OUTPUT_DIR`（runPnpm 也无 env 通道），real 产物会**覆盖 mock 共享产物**，违反自家【构建隔离】协议；仓库已存在专用隔离脚本 `apps/client/scripts/build-real-isolated.mjs`（头注释点名"G7 QA 工作流 v3.2 专用"、"直接跑就会把 real 覆盖进 dist/build/mp-weixin，毁掉 mock 轮的 before/after 配对证据"）及其 npm 别名 `build:mp-weixin:real:isolated`，DSL 全文 0 次引用 | **致命** | 确定是缺陷 | :30, :1232, :548, :1216-1218；对照 `apps/client/package.json` scripts、`apps/client/scripts/build-real-isolated.mjs:1-20`、`apps/client/scripts/prepare-static.mjs:154` | `WORKFLOW.build.realScript` 改为 `"build:mp-weixin:real:isolated"`（或 `world.run("node",["apps/client/scripts/build-real-isolated.mjs","--out","apps/client/dist/build/mp-weixin-real"])`）；连带 :547 提示词里的构建指引同步更新 |
| F2 | 真实模式成功分支对 LLM 返回做**无守卫属性链访问**：`real.g8.rings.map`、`for (const g of real.fieldParityGaps)`、`real.artifactsLeft.length` 等，任一字段缺失 → TypeError 炸在**终报之前**，整轮工作流（含全部 mock 轮成果）报废。已用 stub 宿主实测复现（见 §6 C 案：`Cannot read properties of undefined (reading 'map')`）。v31 全文惯例是 `?? []` 守卫（:719/:758/:759/:767/:786） | **致命** | 确定是缺陷 | :1257, :1258, :1259, :1260, :1261 | 1237-1261 整段包 try/catch，异常/缺字段一律落入既有的"记 3 条 BLOCKED"else 分支（:1262-1269）；并对 `real?.g8?.rings ?? []`、`real.fieldParityGaps ?? []`、`real.artifactsLeft ?? []` 加守卫 |
| F3 | 真实模式验收员 `.ask` 本身无 catch：模型超时/拒绝/JSON 解析失败同样炸在终报之前（与 F2 同落点、不同触发源） | 高 | 需人工确认（取决于宿主 ask 失败是否 reject） | :1237 | 同 F2 的 try/catch，即一并覆盖 |
| F4 | 新角色「真实模式验收员」承担客户端侧操作（G8 第(1)环"体验账号按钮"、"真机侧要取跳转登录页那一帧"），但其提示词**未注入 UI_LOCK_RULES**，且不是 A1——与"A1 独占 9420"的 Actor 模型冲突；若它驱动模拟器，锁协议对其无约束 | 高 | 需人工确认（验收员是否真驱动 9420 取决于提示词执行力） | :1237-1255, :550, :1248-1249；对照 :17, :702 | 要么明确 G8(1)/真机帧改由 A1（`exec0`）执行并注入 UI_LOCK_RULES，要么在该 prompt 追加 UI_LOCK_RULES + 声明其为 9420 第二写者并修订 Actor 计数 |
| F5 | v32 新增 5 个**纯死配置键**：`build.mockScript`、`realEnv.wechatLogin`、`realEnv.guestLoginWorks`、`instrument.forbidPlaceholderSelector`、`instrument.requireManifestTotalReconcile` 全文各仅 1 次出现（定义处），实际值全部手抄进提示词文本；改配置=不改行为（正是"协议常量没注入任何提示词就等于没生效"一类）。另 buildGate 硬编码字符串绕过 mockScript | 中 | 确定是缺陷 | :29, :39, :40, :43, :45；硬编码对照 :504, :924, :1038, :1149 | 删除或改为插值消费（如 :504 用 `${WORKFLOW.build.mockScript}`、:539 引 wechatLogin 值）；继承自 v31 的同族死键（severityPolicy/evidence/cache/regression/baselineRound/maxConcurrent 等，v31 即死）可另列 backlog |
| F6 | `INSTRUMENT_RULES` 只注入 A1 执行员一处；A6 交互判定员是 verdict 归属的实际裁决者，却看不到 `UNVERIFIED-INSTRUMENT`/`NOT-EVIDENCED-BY-MOCK` 口径——执行员若仍回填 FAILED，判定员会按产品失败计数，噪声治理链路只有半程 | 中 | 确定是缺陷 | 定义 :536-542；注入仅 :714；judgeChunk :748-756 未含；终报 :1310 有 3b 补救但为时已晚 | judgeChunk prompt 追加 `INSTRUMENT_RULES`；用例设计员（:685-694）也应看到【断言分域】requiresReal 规则 |
| F7 | 真实阶段失败时 G7/G8/G9 虽进 `realGates`，但 FAIL/BLOCKED 文案未同时进 `blockers[]` 的只有"后端不可达"与"real 构建失败"两处；`requireBackendUp=false` 时 :1264 的 why 误写"后端不可达"（实际是被禁用），且该路径下 G7 FAIL 类 blocker 完全缺失 | 低 | 确定是缺陷（文案）/ 需人工确认（是否要求入 blockers） | :1225, :1264 | else 分支把三道 Gate 记录同步 push 进 blockers，并把 why 区分"禁用/不可达/构建失败" |
| F8 | 版本与措辞残留：横幅 :15/:21 仍写 v3.1；:18"Evidence Bus 四路并行"vs 描述 :5"六路"vs 实现 :724 五路复核；:344 `FinalReport.gates` 注释"六道 Gate"（实为九道）；:517 锁状态枚举 `(AVAILABLE|LEASED|STALE)` 不含 :521 新引入的 `status=released`（v3.2 墓碑语义自身破坏了状态机枚举）；:4"7 Actor（6 推理+A1）"未计入新增第 7 个推理角色；:1309"数组为空说明该阶段被跳过"不可达（两分支必推 3 条） | 低 | 确定是缺陷（文本） | :15, :21, :18/:5/:724, :344, :517 vs :521, :4, :1309 | 统一 v3.2 横幅；枚举补 `released(RELEASED_TOMBSTONE)`；gates 注释改"九道（G1-G6 代理自判 / G7-G9 脚本注入）"；Actor 改"8 Actor（7 推理 + A1）"或说明验收员归属 |
| F9 | G8 汇入终报时逐环 `evidence` 被丢弃（只留 name=ok/MISS），后端响应片段进不了终报输入；G1-G6 无任何结构化脚本侧数值注入（仅 :1302 计数），"九道 Gate"里六道全靠总验收官自由裁量——G7-G9 有 given 值、G1-G6 没有，口径不对称（G1-G6 部分继承自 v31） | 低 | 需人工确认（设计意图） | :1258；:1302, :1308-1309 | :1258 拼接 `r.evidence`；可选：把 buildGate/typecheck 结果与 gitSha 汇总成 `mockGates` 一并以"given 值不得改写"注入 |
| N1 | 65 处 TS2304 全部属于宿主全局族（agent/artifact/git/log/phase/report/world），无一处笔误；v31→v32 增量 +5 恰为真实阶段 5 个宿主调用点（:1220/:1226/:1230/:1237/:1261）。`gates.push` 一类"引用运行时不存在之物"的错误在**全部可达路径**上已实测不存在（两种 stub 画像均跑通至 return） | 无问题 | 无问题 | 见 §1 | 无需改 |
| N2 | `history` 顶层重声明（TS2451 :621）与 TS1375/TS1108（顶层 await/return）均系"脚本按宿主约定嵌入 async 函数体"的编译噪声，v31 同量存在；干跑证实运行时语义正确 | 无问题 | 无问题 | :621 等 | 无需改 |
| N3 | 真实阶段插入位置与可达性：位于终验循环（:1141-1213）之后、`phase("最终回归与总报告")`（:1274）之前，唯一能挡住它的是 :608 的盘点空页面早退（合理）；快速失败 Gate G1/G2 不阻断该阶段（正确，real 验收与 mock 产物无关）；失败分支三道 Gate 记录齐全（:1266-1268，干跑实证） | 无问题 | 无问题 | :1220, :608, :1262-1269 | 无需改 |

**统计：致命 2（F1、F2，同落真实阶段，互相放大）+ 高危 2（F3、F4）；中 2；低 3；核查排除 3。**

## 1. 符号定义-使用闭环（含 TS2304 归类）

### 1.1 编译诊断全景（tsc 5.3.3，`--noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck`）

| 错误码 | v31 | v32 | 归类 |
|---|---|---|---|
| TS2304 找不到名字 | 60 | **65** | 全部宿主注入全局（见 1.2），+5 = 真实阶段新增调用点 |
| TS2552 `report`(:453) | 1 | 1 | 宿主全局（TS2304 的"Did you mean Report"变体），非笔误 |
| TS2451 重声明 `history`(:621) | 1 | 1 | lib.dom 全局 `history` 与顶层 `const history` 冲突；宿主把 DSL 嵌进函数作用域且 VM 无 DOM，运行时合法（干跑实证）；v31 遗留 |
| TS1375 顶层 await | 22 | 25 | 宿主约定（包进 async 函数体），非缺陷；+3 为真实阶段新增 await |
| TS1108 顶层 return | 2 | 2 | 同上（:608 早退、:1390 结果返回） |

### 1.2 65 处 TS2304 逐个归类（按名字分组，行号全列）

| 宿主全局 | 处数 | v32 行号 |
|---|---|---|
| `agent` | 18 | 588, 589, 590, 591, 597, 622, 631, 646, 685, 702, 728, 748, 776, 806, 832, 1006, 1237, 1297 |
| `log` | 27 | 615, 641, 654, 665, 699, 719, 743, 768, 798, 823, 850, 875, 885, 908, 996, 1032, 1037, 1108, 1129, 1133, 1146, 1164, 1205, 1208, **1230, 1261**, 1324 |
| `phase` | 11 | 596, 620, 645, 858, 898, 1063, 1121, 1132, 1145, **1220**, 1274 |
| `artifact` | 4 | 365, 1321, 1327, 1334 |
| `world` | 3 | 497, 508, **1226** |
| `report` | 1 | 1001（另 :453 为 TS2552 同族） |
| `git` | 1 | 861（try 内使用、catch 有 gitTry 兜底，v31 同款） |

**加粗** 5 处 = v32 新增（全在 :1220-1261 真实阶段），均属宿主族 → **0 处笔误**。`gates.push` 事故同类的"引用运行时不存在之物"未再发现：`realGates`(:1223) 定义→:1257-1259/:1266-1268 写入→:1309 注入终报，闭环完整；两画像干跑（§6）均无 ReferenceError。

### 1.3 定义→使用交叉（b 类：引用未定义 → 无；a 类：定义未引用 → 死文本清单）

函数 28 个（normSev/slug/cnt/findIssue/normConf/normalizeIssue/admit/pushBoard/chunkKeyFor/histForPages/idealForPages/makeChunks/affectedPages/scopePages/runPnpm/buildGate/gitTry/uiEvidence/codeChunk/judgeChunk/visualChunk/requirementChunk/regressionChunk/commitRound/fixAndRegress/scribeRound/auditRound/sevToImp）**全部 ≥1 使用点，无死函数**。顶层 const（WORKFLOW、PNPM_ENTRY、七段协议常量、看板态 allIssues…result）全部被消费。协议常量注入点：UI_LOCK_RULES(:676,:711)、RESET_RULES(:677,:712)、INSTRUMENT_RULES(:714 仅一处，见 F6)、REAL_E2E_RULES(:1250)、EVIDENCE_BUDGET(:691,:713)、RULES_AUDIT(:789)、RULES_CASES(:690,:754) —— **无一段是"定义了却没进提示词"的死文本**。

真正未被引用的定义（死文本，均不炸运行时）：
- **v32 新增死配置键**：`build.mockScript`(:29，且 :504 硬编码绕过)、`realEnv.wechatLogin`(:39)、`realEnv.guestLoginWorks`(:40)、`instrument.forbidPlaceholderSelector`(:43)、`instrument.requireManifestTotalReconcile`(:45) → 表 F5。
- **v31 遗留死配置键**：`ui.maxConcurrent`(:49)、`audit.baselineRound`(:57)、`audit.requireObservationPerPage/requireFindingPerPage`(:60-61)、`severityPolicy.*`(:63-68)、`evidence.*`(:69-74)、`cache.*`(:75-78)、`regression.*`(:79-82) —— 值均手抄进 :558-565/:572 等提示词文本。
- **死接口（类型擦除后无残留）**：`TestCase`(:166-180)、`RegIndexEntry`(:132-143) —— v31 同死；用例结构只以 :582 提示词文本存在，`ask<OpsPrep>` 不含 cases 数组类型，属文档性定义，低优先。

## 2. 执行器 API 一致性（v32 新增段 vs v31 既有形态）

| v32 新写法 | 位置 | v31 既有同形态？ | 判定 |
|---|---|---|---|
| `agent(名字, 人设).ask<T>(promptString)` | :1237 | 是（:588-591, :597 等 17 处） | 无问题 |
| `.ask<T>([...].join("\n"))` 数组拼提示词 | :1245-1256 | 是（:598, :671 等） | 无问题 |
| `world.run(cmd, args[, opts])` 取 `.stdout/.exitCode` | :1226 | 是（:497, :508；`.stdout` 真实存在，runPnpm/gitTry 皆消费） | 形态一致 |
| **`world.run(...).catch(()=>null)`（Promise 链 catch，不经 try/catch 包装）** | :1226 | **否** —— v31 两处 world.run 均包在 try/catch 函数内 | 新形态，低危：若宿主 world.run 同步 throw（非 reject），`.catch` 接不住 → 顶层未捕获。若 reject 或 resolve 非零码则安全（health.stdout 为空串时判非 200 → BLOCKED，干跑实证）。建议改走 gitTry 同款包装 |
| curl 探测 `%{http_code}` | :1226-1227 | **否，v31 全文无 curl** | 新形态，高危确认点：宿主 world.run 无 shell，需 Windows 系统 curl.exe 在 PATH（现代 Win10+ 具备）；`-o /dev/null` Windows curl 特判支持；未检查 exitCode 属有意（用 stdout 判 200，"000"/空 均落 BLOCKED 分支）——逻辑自洽，但**首次真跑前建议人工在宿主里手动跑一次该 curl** |
| `runPnpm([...])` 跑真实构建脚本 | :1232 | 是（:504, :933 同法） | 形态一致，但目标脚本错误 → **F1 致命**（见总表） |
| 返回值消费无 `?? []` 守卫（`real.g8.rings.map` 等） | :1257-1261 | **否** —— v31 对代理返回一律 `res.xxx ?? []`（:738, :758, :786, :799, :824, :849） | 新代码违背自家防御惯例 → F2 致命，已实测复现 TypeError |
| 僵尸锁按 pid 接管、墓碑释放（UI_LOCK_RULES 新条款） | :521-523 | v31 无（释放即删） | 纯提示词协议，DSL 自身不持锁，无需代码配套 → 无问题；但枚举不一致见 F8 |

## 3. 控制流完整性（真实模式阶段插入位置 / 可达性 / 失败分支 / 锁兜底）

**插入位置——正确。** 真实阶段 :1220-1269 位于 mock 侧全部终点之后：R1 :1122 → R2..R4 回归循环 :1125-1136 → 终验循环 :1141-1213（含 `clean` 判定与 :1211 blockers 兜底）→ **真实阶段 :1220** → P3 终验 :1276-1292 → 总报告 :1298。符合"回归轮结束后、总报告之前"，也符合 :1216-1218 自述理由（real 构建覆盖共享产物，必须最后跑——但正因如此 F1 的目录覆盖才要害 :1276 的 P3 定向补拍与 :1307 总验收官的 automator 实测：它们都会加载被污染的共享 dist 却以为自己测的是 mock）。

**可达性——正常。** 唯一早退是 :608（盘点 0 页面，合理）；G1/G2 快速失败只关 UI 会话（:664-668, :954-997），不 return，不会挡住 :1220；终验循环 break/continue 均落到 :1215 之后。干跑 A/B 两画像均实际抵达 :1220。

**失败分支 Gate 记录——大体成立，两处小口。**
- 后端不可达：blockers :1229 + else 分支三道 BLOCKED :1266-1268 ✅（"不记 PASS 也不记 FAIL"与 :38 注释一致；verdict 逻辑 :1267 仅 G7 在有构建错误时记 FAIL，正确）。
- real 构建失败：blockers :1233 + G7 FAIL/G8/G9 BLOCKED ✅。
- **口 1**：`requireBackendUp=false` 时无任何 blocker，:1264 why 误称"后端不可达"（F7）。
- **口 2（真缺口）**：真实验收员 ask 抛错或返回缺字段（F2/F3）时**没有任何兜底**——三道 Gate 既不入 realGates 也不入 blockers，整个 workflow 直接死于 :1258，终报、artifact 发布、WorkflowReport 全部不产。这正是"失败分支凭空消失"的极端版：不是 Gate 消失，是整场消失。建议 :1236-1261 包 try/catch，catch 内走 :1266-1268 同款三连 BLOCKED 记录。

**finally/信号兜底——语义正确但为提示词级。** :522 要求 A1 侧脚本把释锁挂 finally + SIGINT/SIGTERM/uncaughtException，:523 僵尸租约按 `owner.pid` 存活接管——对象是代理生成的巡检/执行脚本，DSL 本身不持锁、无需配套代码，逻辑闭环 ✅。残余风险（需人工确认）：若 A1 代理生成的脚本忘记装处理器，DSL 层无 watchdog 强制释放；缓解因素是真实阶段排在最后，即使锁泄漏也不阻塞本轮 mock 轮。墓碑条款 :521 与 :517 状态枚举的矛盾记入 F8。

## 4. Gate 清单完整性（G1..G9 四处落点矩阵）

终报口径：:1308 明确"九道 Gate"，实列 G1..G9 恰九 ✅；:1309 注入的 `realGates` 恒为 3 条（两分支均推满）✅ 数量一致；"数组为空记 BLOCKED"是永不触发的保险丝（F8 文案项）。

| Gate | 定义 | 执行 | 记录 | 汇入终报 | 缺哪处 |
|---|---|---|---|---|---|
| G1 构建 | :503 buildGate + :1308 | :1035/:922-930/:1147 | :943/:1040/:1151 blockers 自由文本；:921 gatesOk 局部量 | ❌ 无结构化给值，验收官自判 | 汇入（继承 v31） |
| G2 typecheck | :1308 | :933/:936 | :939 blockers | ❌ 同上 | 汇入 |
| G3 页面覆盖 | :1308 | 隐式：tour.failures :698→captureFailures | :1302/:1383 计数注入 | ◐ 半结构化 | 独立记录行 |
| G4 交互覆盖 | :1308 + :1310 3b 噪声口径 | judgeChunk :764-766 | totalCases/casesVerified/casesFailed | ◐ :1302 数值注入 | 独立记录行 |
| G5 数据合规 | :1308 | ❌ 脚本层无任何对应检查 | ❌ | ❌ 纯靠验收官 | 执行/记录/汇入（继承 v31，九道里唯一零脚本落点） |
| G6 证据可信 | :1308 | ◐ gitSha :657 + manifest 指令 :679/:784 | ❌ | ❌ | 记录/汇入 |
| G7 real 构建 | :30 + :547 | :1232（但脚本选错=F1） | :1229/:1233/:1257/:1267 | ✅ :1309 注入 | 本体闭环（内容错见 F1） |
| G8 数据同步五环 | :550 | :1237-1256 验收员 | :1258/:1267 | ✅ :1309（逐环 evidence 被丢=F9） | 无结构性缺失 |
| G9 素材可达性 | :551 | 同上 | :1259/:1267 | ✅ :1309 | 无 |

**结论**：v3.2 的 G7-G9 是唯一做到「定义+执行+记录+汇入」四件齐的三道；G1-G6 维持 v31 的"半生不熟"状态——终报里九道 Gate 的成色实际是 3 道实测 + 6 道自由裁量。建议至少把 gatesOk/build 重试次数、typecheck 结果、gitSha 攒成 `mockGates` 同 :1309 格式注入（一次性改动，消掉 F9 的不对称）。FinalReport 注释"六道 Gate"(:344) 需同步改九道。

## 5. 提示词自洽（版本残留 / mock-real 措辞 / 写死数值）

**版本残留（除用户已知横幅外新发现 4 处）**：
1. :14-22 横幅整块仍写"v3.1 —— 完整执行协议 / v3.1 升级协议"（已知）。
2. :18 横幅"Evidence Bus **四路**并行" vs :5 描述"**六路**并行复核" vs :724 实现注释六路复核实列 **5** 个并行支（A2/A3/A4/A5/A6 + 非 UI 用例设计支）——三个口径互斥，建议统一为"五路复核 + 1 条用例预备支"。
3. :344 `FinalReport.gates` 注释"六道 Gate"——v32 已九道，残留。
4. :515 注释头仍写"UI Lock 状态机协议（**v3.1**：AVAILABLE/LEASED/STALE…）"，而其下 :521-523 三条是 v3.2 修订——且 :521 的 `status=released` 不在 :517 枚举 `(AVAILABLE|LEASED|STALE)` 内，状态机枚举被自家新条款破坏。
5. :4 描述"7 Actor（6 推理 + A1）"未计入新推理角色"真实模式验收员"(:1237)，实际 8 Actor / 7 推理。
（:43/:48/:540/:546/:552/:1415 等处的"v3.1"是对旧版缺陷的历史指称，属合法引用，无问题。）

**mock/real 措辞冲突**：
- :1308 G1 定义"构建（0 error/体积/**无 mock 泄漏**）"——G1 是 **mock** 构建门禁，"mock 泄漏"是 real 构建的关切（:547 G7 的 MODE 断言才是它的对应物），放 G1 属 v31 遗留的语义错位（v31 :1195 同文）；v32 有 G7 后应改写为"G1 mock 构建产物指纹 / 无 real 密钥泄漏进 mock"。
- :1233 记"G7 FAIL"、:1229 记"G7/G8/G9 BLOCKED"与 :38 注释"后端不通→BLOCKED 不记 FAIL"一致 ✅；:1265 `realGate.err ? "FAIL" : "BLOCKED"` 只在构建真跑过失败时给 FAIL ✅。唯一别扭是 :1264 的 why 把"requireBackendUp=false"也说成"后端不可达"（F7）。
- :679 mock 轮 manifest 固定 `buildMode:"build:mp-weixin:mock"` 与 real 阶段互不污染 ✅（前提是 F1 修掉目录覆盖，否则 real 覆盖共享 dist 后该字段与实物不符）。
- :1247 给验收员的指引"若不存在，用 `UNI_OUTPUT_DIR=…` 隔离构建"——在 Windows pnpm 脚本链里给子进程注入该变量的正确做法就是跑 build-real-isolated.mjs（其头注释 :10-12 明说脚本链注不进去），提示词指了一条执行不了的路，与 F1 同根。

**写死数值盘点**：:1027 "60 项修复"（一次性历史事实，v31 遗留，可接受）；:538/:541 的 288/192/67、1107/940/167 与 :551 heart-filled-white 属"实测教训"叙事性引用（CHANGELOG :1404-1411 同源），不是判定阈值——**无问题**；:547 提示词里的 MODE/VITE_API_BASE_URL 断言值全部来自 WORKFLOW 插值 ✅；:1232 超时 1800000 与 buildGate :504 一致 ✅。风险仅与 F5 重合：wechatLogin/guestLoginWorks 这类"实测值"只活在 :39-40 注释与 :1248 手抄文本里，环境变了改配置不改变提示词。

## 6. 可执行性预检（最小干跑方案）

**方案**：不碰宿主、不起 UI、不写库——用 typescript 包 `transpileModule` 剥类型（0 诊断即语法/解析通过），再用 `AsyncFunction` 构造器把产物包进异步函数体（同时化解 TS1375 顶层 await 与 TS1108 顶层 return 的宿主约定），以 7 个 stub 全局（`agent/log/phase/report/artifact/git/world`，即 §1.2 识别出的宿主族全集）注入后真跑主控制流。**本审计已在仓库内实测通过以下三案**（命令经 `node <<'EOF'` stdin 执行，零落盘）：

- **A 案 · 快速失败画像**（world.run 恒返回 `exitCode:1,stdout:""` → G1 构建 FAIL、curl 非 200）：预期输出依次为 `[phase] 盘点完成` → R1 构建未过走代码层 → 终验 Gate 受限 → `[log] 后端不可达 → 真实模式三项门禁记 BLOCKED` → `FULL DRYRUN OK -> "未通过最终验收：…G7/G8/G9 BLOCKED：后端 /actuator/health 未返回 200…"`。**实测结果：通过**，证明新阶段在 mock 全挂时仍可达且失败分支留痕。
- **B 案 · 全绿画像**（world.run 返回 `exitCode:0`，curl→"200"；agent.ask 恒返回含 g7/g8.rings/g9/fieldParityGaps/artifactsLeft 的完备对象）：预期走通 UI 证据/六路复核/终验通过 → 真实阶段三连 `realGates.push` → `HAPPY-PATH DRYRUN OK`，conclusion 含"后台字段对账缺口：admin缺title"。**实测结果：通过**，证明 :1257-1261 新代码在良构输入下无 ReferenceError。
- **C 案 · 畸形输入探针**（B 案基础上删掉 `g8.rings`）：**实测输出 `CRASH PROVEN: TypeError -> Cannot read properties of undefined (reading 'map')`**，即 F2 的复现证据——真实阶段畸形返回炸掉终报。

**最小命令**（仓库根执行；`<TS>` = `node_modules/.pnpm/typescript@5.3.3/node_modules/typescript` 绝对路径，pnpm 布局下 `require('typescript')` 从 stdin 解析不到，需显式路径）：

```bash
cd "D:/6/恋爱小程序" && node <<'EOF'
const ts=require('<TS>');const fs=require('fs');
const out=ts.transpileModule(fs.readFileSync('.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts','utf8'),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
console.log('transpile diagnostics:',out.diagnostics.length);      // 预期 0
const AF=Object.getPrototypeOf(async function(){}).constructor;
const R=()=>({/* 全形状 stub：pages[]、shots[]、g7/g8/g9、fieldParityGaps[]… */});
const agent=()=>({ask:async()=>R()});
const log=m=>console.log('[log]',m); const phase=m=>console.log('[phase]',m);
const report=()=>{}; const artifact={board:()=>{},file:()=>{},markdown:()=>{}};
const git={status:async()=>({staged:[],unstaged:[],untracked:[]})};
const world={run:async c=>({exitCode:0,stdout:c==='curl'?'200':'deadbee',stderr:''})};
new AF('agent','log','phase','report','artifact','git','world',out.outputText)
  (agent,log,phase,report,artifact,git,world)
  .then(r=>console.log('DRYRUN OK',r.conclusion.slice(0,60)))
  .catch(e=>console.error('CRASH:',e.message));
EOF
```

**判读标准**：`transpile diagnostics: 0` = DSL 解析通过；跑完输出 `DRYRUN OK` 且 phase 序列含"真实模式端到端验收（G7/G8/G9）"= 主控制流与新阶段接线正确；任何 `ReferenceError` = 又出现了 gates.push 同类事故（本轮审计结论：**修 F1/F2 之前不写真跑**，二者任一触发都会让整场 QA 在终报前报废）。另建议真跑前在宿主环境手动验证 `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/actuator/health` 与 `pnpm -C apps/client run build:mp-weixin:real:isolated` 两条命令本体可通（§2 的两个新调用形态）。
