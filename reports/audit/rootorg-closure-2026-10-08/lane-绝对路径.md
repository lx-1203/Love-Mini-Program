# 收口车道报告：绝对路径（ABSPATH-REGRESSION）

- 车道：收口车道-绝对路径
- 缺口：ABSPATH-REGRESSION —— 把扫描命中的盘符绝对路径改回可推导写法（__dirname / import.meta.dirname / %~dp0 / $SCRIPT_DIR / require.resolve），只动代码/脚本/配置文件；文档/QA 报告里的命中不改、逐条留档待拍板。
- 命中清单来源：reports/audit/rootorg-closure-2026-10-08/probe-abs-paths.json（aefd8a72 清零后的回归扫描，scanned=4321，hits≈200）
- 状态：已收口（代码域清零；留档项见 §4）

## 0. 重要事实：给定探针清单与当前树有漂移

终验时用逐字复刻探针语义的脚本复扫当前树（`ABS_SCAN_RESULT=HIT scanned=3767 hits=1`），发现**大量探针 JSON 未列出的现行命中**（约 33 个 ps1/bat/cjs 注释/pom/campus.ts，其中 migrate-font-sizes.ps1 一个文件就有 26 行、`.ps1/.bat/.cmd` 都在探针扩展名白名单内）。这些命中全在本车道判域内，已一并修复（见 §2.5）。推测原因：探针 JSON 生成于本轮开工前，之后多车道并行改动过工作树。

## 1. 修复约定（本车道引入/沿用的可推导写法）

| 场景 | 写法 |
|------|------|
| 仓库内路径（node ESM） | `resolve(dirname(fileURLToPath(import.meta.url)), …)`；cjs 用 `__dirname` |
| typescript 等依赖 | `createRequire(import.meta.url)(resolve(REPO, "apps/client/node_modules/typescript"))`、pnpm store 前缀随 REPO 推导 |
| node22（重生成 node 的 QA 链） | `--node22 参数 > NODE22_EXE 环境变量 > 当前 node 自身（仅当主版本 ≥20）`；取不到大声 FAIL 指路，绝不回落盘符死路径 |
| 微信开发者工具 | `--ide 参数 > WECHATIDE_DIR 环境变量 > 扫 PATH 找 wechatide.cmd 取其目录`；本机实测 PATH 推导命中 `D:\微信开发者\微信web开发者工具\wechatide.cmd`，与旧字面量同址 |
| mysql 客户端 | `MYSQL_BIN 环境变量 > PATH 上的 mysql`（实测 `command -v mysql` 命中 `/d/mysql-8.0.45-winx64/bin/mysql`，同一二进制） |
| shell（.sh） | 仓库根 `$(cd "$(dirname "$0")/.." && pwd)`（要传给 IDE 的转 Windows 形态：`cygpath -m`，无 cygpath 时回退原形并如实降级）；node 走 `NODE22_EXE > command -v node` |
| bat | `%~dp0..\..`（apps\api\ 的上两级 = 仓库根） |
| PowerShell | `$repo = Split-Path $PSScriptRoot -Parent`（scripts/ 一级）/ `Split-Path (Split-Path $PSScriptRoot -Parent) -Parent`（apps/api、scripts/launcher 两级）；`Join-Path` 拼子路径 |
| 计划/队列配置 JSON | 值改仓库相对，由消费方按仓库根摊平（ws-channel-up :52-:53 原有；tour-r6 :82 本次补上 `path.resolve(PROJECT_PATH, …)`） |
| 注释/文案里的盘符示例 | 一律改文字表述（「盘符+正斜杠」「盘符+冒号+斜杠」），不再落任何 `X:/`、`X:\` 字面量 |

## 2. 修复台账

### 2.1 给定探针清单内 —— scripts/qa（21 项）

| # | 文件 | 命中行 | 处置要点 |
|---|------|--------|----------|
| 1 | scripts/qa/emit-round-report.mjs | 36,106 | NODE22 三级解析 + runGate 守卫（取不到记 FAIL 写明原因，返回形状一致）。`node --check` 过 |
| 2 | scripts/qa/dryrun-workflow.mjs | 20 | typescript 改 `resolve(REPO,…)`。实测 dryrun `--profile empty` → `DRYRUN_RESULT=PASS` |
| 3 | scripts/qa/cli-automator.mjs | 22,38,57 | IDE_DIR 三级解析；electronExe 对空目录容错；示例/注释字面量文字化。`print-argv` 实测解析到同一 IDE 目录 |
| 4 | scripts/qa/ws-channel-up.mjs | 41 | 同 3 解析序。`node --check` 过 |
| 5 | scripts/qa/real-tour-cli.mjs | 33,46 | IDE 三级解析 + FAIL 文案补指路；注释文字化。`node --check` 过 |
| 6 | scripts/qa/tail-1-freeze-and-readjudicate.cjs | 9 | NODE22_EXE>自身(≥20)，空则 `TAIL1=ABORT` |
| 7 | scripts/qa/test-fourgrid-domextract.mjs | 36 | env>env>空串，既有 !NODE 分支报 FAIL |
| 8 | scripts/qa/test-triage-dead-selector.mjs | 37 | 同 7 |
| 9 | scripts/qa/test-guest-landing-stability.mjs | 16 | 头注释跑法文字化 |
| 10 | scripts/qa/test-guest-landing-writeguard.mjs | 10 | 同 9 |
| 11 | scripts/qa/test-lane-report-complete.cjs | 25,34 | NODE22=NODE22_EXE，回落守卫保留 |
| 12 | scripts/qa/test-prov-dialect.cjs | 6 | 注释文字化 |
| 13 | scripts/qa/test-report-decision-buckets.cjs | 81 | FAIL 提示改 NODE22_EXE/PATH |
| 14 | scripts/qa/tour-cli-states.mjs | 17 | 用法示例改仓库相对（值经 resolveProjectPath 摊平） |
| 15 | scripts/qa/ui-queue.round8b-tour.json | 13,57,72 | 三处值改仓库相对；腿 1 why 记账句同步改写（保留历史教训）。`JSON.parse` 过 |
| 16 | scripts/qa/tour-r6.mjs | 82（清单外） | `path.resolve(PROJECT_PATH, TOUR_PROJECT)`，IDE 拿到的仍是绝对路径 |
| 17 | scripts/qa/verify-evidence-corpus.mjs | 119,161 | 注释文字化 |
| 18 | scripts/qa/verify-guest-landing.mjs | 8 | 注释改 NODE22_EXE/PATH |
| 19 | scripts/qa/verify-provenance-all.mjs | 27 | 注释文字化 |
| 20 | scripts/qa/rerun-round7-slices.sh | 11 | NODE 三级解析，:14 `:?` 守卫兜底。`bash -n` 过 |
| 21 | scripts/qa/run-final-verify-v33.sh | 9,10,20,24 | REPO 推导、N22 三级+≥20 版本闸、证据库=仓库根仓外兄弟目录（cygpath -m 实测推出 `D:/6/love-mini-evidence` 同址；推不出如实记 unresolved）。`bash -n` 过 |

### 2.2 给定探针清单内 —— scripts/ 根（13 项）

| # | 文件 | 命中行 | 处置要点 |
|---|------|--------|----------|
| 22 | scripts/audit-client-scan.mjs | 6,7,372 | ROOTS/outPath 随 REPO/HERE 推导（一级）。推导路径实测 EXISTS |
| 23 | scripts/scan-chinese.mjs | 13,190 | ROOT=join(REPO,…)，relative(REPO,…) |
| 24-26 | scripts/r13-admin-audit.mjs / -image-recheck.mjs / -ui-manage.mjs | 各 1 | OUT=join(REPO, reports/audit/2026-09-22-r13-goal) |
| 27 | scripts/r13-final.sh | 5,6,7 | ROOT 推导+cygpath -m；WI 三级解析+FATAL。`bash -n` 过 |
| 28 | scripts/r13-i18n-dupkeys.mjs | 5 | pnpm typescript 前缀随 REPO。实测 `node scripts/r13-i18n-dupkeys.mjs apps/client/src/stores/session.ts` → `### …: 0 duplicate key(s)`（首版误用两级 .. 推到 D:\6，被这次实跑抓出并改正） |
| 29 | scripts/r13b-mp-verify.sh | 5,6,28 | P 推导；IDE exe 改 `$(dirname "$WI")/wechatdevtools.exe` |
| 30 | scripts/r13c-mp-recover.sh | 5,6 | P 推导 |
| 31 | scripts/r13d-mp-verify.sh | 4,5,6,62 | ROOT/D/OUT 推导；日志 grep 改 $ROOT/... |
| 32 | scripts/r13e-mp-final.sh | 6,7,8,43,64 | 同 31，409 基线两处改 $ROOT/... |
| 33 | scripts/shoot-all-2026-08-20.cjs | 148 | cliPath 随 WECHATIDE_DIR/PATH 推导；失败文案补指路 |
| 34 | scripts/sync-app-assets.mjs | 33 | MYSQL=MYSQL_BIN>PATH（未实跑拷贝，不带 --apply 才安全） |

### 2.3 给定探针清单内 —— apps/（8 项）

| # | 文件 | 命中行 | 处置要点 |
|---|------|--------|----------|
| 35 | apps/client/scan-aria.cjs | 6,39 | `path.join(__dirname,'src'/'scan-aria-results.json')` |
| 36-41 | apps/client/scripts/add-error-a11y.mjs、add-input-aria-label.mjs、add-list-roles.mjs、add-loading-a11y.mjs、detect-broken-aria-comments.mjs、fix-broken-aria-comments.mjs | 各 2 行 | ROOT=`resolve(dirname(fileURLToPath(import.meta.url)),"..","src")`；推导 ROOT 实测 EXISTS；`node --check` 全过 |
| 42 | apps/api/src/test/java/com/campuslove/api/wxpay/WxPayRequestSignerTest.java | 139 | `Z:/not/exist/key.pem` → `java.io.tmpdir/wxpay-signer-test-<nanoTime>/key.pem`（保证不存在、不依赖盘符）。**未编译验证**（需全量 classpath，超出本车道判据；判据是 grep 清零） |

### 2.4 生成物（未跟踪、已 gitignore、可再生的暂态件 —— 删除）

| 物件 | 数量 | 依据 |
|------|------|------|
| apps/client/vite.config.ts.timestamp-*.mjs | 41 → 0 | `.gitignore:150`；vite 配置加载的暂存件，残留=进程被杀；git ls-files = 0（未跟踪）；无任何脚本引用 |
| apps/client/test-result.json | 1 → 0 | `.gitignore:51`；旧 jest 输出；未跟踪、无引用 |
| apps/client/coverage/ | 517 文件 → 0 | `.gitignore:40 coverage/`；lcov 报告（其 .html 在探针扩展名白名单内，含 `D:\6\...`）；未跟踪 |

### 2.5 终验新增批次（探针清单未列、当前树实存，共 34 项）

PowerShell 系列（29 个，统一 `$repo=Split-Path $PSScriptRoot(-Parent)` + `Join-Path`，wechatide/NODE22 走 env>PATH）：
`scripts/debug-fs.ps1`、`scripts/eval-app.ps1`、`scripts/eval_boot.ps1`、`scripts/eval_pinia.ps1`、`scripts/eval_state.ps1`、`scripts/eval_vm.ps1`、`scripts/launcher/run-local-demo.ps1`、`scripts/migrate-font-sizes.ps1`（26 行字面量改相对清单 + Join-Path 管道）、`scripts/profile-style-update.ps1`、`scripts/r10-regress.ps1`、`scripts/r10-shoot.ps1`、`scripts/r11-ideal-shots.ps1`、`scripts/r11-n1-home.ps1`、`scripts/r11-reshoot.ps1`、`scripts/r11-tour.ps1`、`scripts/r11-tti.ps1`、`scripts/r5-shots.ps1`、`scripts/r7-journey.ps1`（另含 `D:\codex-tools\node-v20.19.5...` → NODE22_EXE>Get-Command node）、`scripts/r7-validate-journey.ps1`、`scripts/r8-audit-retest.ps1`、`scripts/r8-audit-shoot.ps1`、`scripts/r8-chain-e.ps1`、`scripts/r8-chain-nav.ps1`、`scripts/r8-fix-verify-one.ps1`、`scripts/r8-fix-verify.ps1`、`scripts/r9-tour.ps1`、`scripts/shot-full.ps1`、`scripts/shot-round2.ps1`、`scripts/shot-round2b.ps1`；`apps/api/start-api-fixed.ps1`、`apps/api/start-api-mock.ps1`（Set-Location $PSScriptRoot）、`apps/api/start-api.ps1`（flyway filesystem: 随 $PSScriptRoot 推导）。

其他：
- `apps/api/start-api-fixed.bat`（16,24）→ `%~dp0..\..` 推导（flyway filesystem: 与 -jar 路径）。
- `scripts/qa-full-screenshot.cjs`（5,9）→ 前置说明注释文字化。
- `apps/api/pom.xml`（311）→ JaCoCo 注释里的 `D:\6\恋爱小程序` 示例改「盘符+非 ASCII（如本仓库根的中文目录名）」。
- `apps/client/src/stores/campus.ts`（1）→ 头注释路径改仓库相对 `apps/client/src/stores/campus.ts`。

PowerShell 语法自检：自写 Parser::ParseFile 批量检查 32 个改过的 ps1 → 27/32 OK；5 个失败经与 `git show HEAD:` 基线同法对照，**全部为既有失败**（UTF-8 无 BOM 被 PowerShell 5.1 按 GBK 误读所致），错误数 11=11、2=2、5=5，另两个修改后反而比基线少（6→5、3→2）。详见 §5 备注 4。

## 3. 自测读数（全部本车道实跑）

1. **探针复刻复扫**（逐字照抄 rootorg-closure-v34.dwf.ts ABS_SCAN 语义的独立脚本，输出到系统临时目录，不写仓库）：
   `node /c/Users/dsghy/AppData/Local/Temp/abs-scan-lane-replica.cjs …`
   → `ABS_SCAN_RESULT=HIT scanned=3767 hits=1`，唯一命中 `scripts/qa/cellplan-round7-criteria-c.json:2`（QA 记账叙述，见 §4.1）。开工前同一复刻在修复中途的读数为多命中（ps1 批次修复前），已归零至该条。
2. **纪律 grep（代码域 = 探针 walk 域 scripts/tools/tests/config/database/docker/docs/specs/apps + 扩展名白名单 + 跳过探针 SKIP 集与点条目）**：
   - 无看后变体 `[A-Za-z]:[/\\](6|Users|[Uu]sers)` → **0 条**
   - 探针同款看后变体 `(?<![A-Za-z])[A-Za-z]:[/\\](6|Users|[Uu]sers)` → **0 条**
3. **纪律原式本身是坏的，须换等价式（已实证）**：`echo "D:/6/x" | grep -cP '(?<!)[A-Za-z]:[/]'` → **0**——PCRE2 里空负向看后 `(?<!)` 内的空模式恒命中、其否定恒失败 ⇒ 原式在任何输入上都不匹配，跑了等于空转。本车道按其显然本意改跑上述两条等价式并如实声明。
4. **运行时冒烟**：dryrun `DRYRUN_RESULT=PASS`；r13-i18n-dupkeys 0 duplicates；cli-automator print-argv 解析到 `D:\微信开发者\…\skill-index.js`；run-final-verify 的库推导 `[ -d ]` 命中且 `cygpath -m` → `D:/6/love-mini-evidence`；PS Parser 27/32（5 个既有失败有 HEAD 基线对照）。
5. **行为保持证据**：wechatide/mysql/证据库的 PATH/env 推导结果与旧字面量逐一同址；未跟踪生成物删除前后 git status 空输出（确认 git 不认识其增删）。

## 4. 不改、留档待拍板清单（代码域之外）

### 4.1 代码域内唯一残留（探针正则命中、纪律正则不命中）
- `scripts/qa/cellplan-round7-criteria-c.json:2` — 「…git show 094f7239 基线源码，node 走 D:/codex-tools」。QA 记账叙述（描述当年复验用什么跑的），且 QA 契约件是 sha 敏感物，按车道纪律不改。待拍板：是否豁免/改写。

### 4.2 文档
- `目录整理说明.md:152` — 「`C:/Users/<用户>/.trae-cn/...` 形式的**外部机器路径**…」：文档叙述引用历史（且为占位符模板），按纪律不改。

### 4.3 QA 报告/证据（reports/ 域，探针设计上跳过 reports/）
- **261 个文件、1773 条命中**。大头：`reports/audit/rootorg-closure-2026-10-08/probe-abs-paths.json`（163 条——探针自己的命中清单，天然含历史路径）、round-7 vitest/单元测试日志（各 110+ 条）、tapfix 系判决件、round-6 issue-matrix.md 及其 .bak。全部为历史证据/判决/日志叙述。

### 4.4 运行日志与本机状态
- `apps/**/*.log`（约 120 个，api/client/admin 的运行/构建/JVM hs_err 日志）、`scripts/archive/*`（10 个归档日志/txt）、`apps/api/logs/campus-love-api*.log`（按日轮转的服务日志）——机器输出，非代码。
- `apps/client/src/.mimosa/**`（5 个文件，`C:\Users\dsghy\...`）——安全扫描插件的本机会话状态，探针按点条目规则跳过。
- `scripts/audit-client-issues.csv`（1088）/`scripts/consolidated-issues.csv`（721）——**未跟踪**的审计数据导出（内容就是扫描到的文件路径，属数据本体）。探针扩展名白名单不含 .csv，不影响终验；要清的话用修好的 `scripts/audit-client-scan.mjs` 重导即可（自然变成仓库相对），是否重导/删除留拍板。

## 5. 备注

1. 给定探针 JSON 与当前树存在漂移（§0）；本车道以「复刻探针复扫 + 纪律 grep」的当前树读数为准，多修的 34 项都在同一判域内。
2. 新引入的环境变量约定：`NODE22_EXE`（node22 位置）、`WECHATIDE_DIR`（微信开发者工具安装目录，cli-automator/ws-channel-up 原有）、`MYSQL_BIN`。全部有 PATH 级兜底，缺省时大声失败而非静默。
3. `ui-queue.round8b-tour.json` 腿 1 的 why 记账句已同步改写为「仓库相对 + 消费方摊平」的新形状，历史教训原句保留改写（未删）。
4. **既有状况（非本车道引入）**：5 个 ps1（launcher/run-local-demo、shot-full、start-api-fixed、start-api-mock、start-api）在 HEAD 就因 UTF-8 无 BOM 被 PowerShell 5.1 误读而解析失败；本车道未动其编码（超判域），留拍板是否补 BOM。
5. Java 测试只做语法级改动、未编译（模块编译需全量 classpath，且后端模块被其他车道并行改动中）。
6. 本车道未提交任何 git 提交；临时自测脚本都在系统临时目录（`/c/Users/dsghy/AppData/Local/Temp/`），未落仓库。
