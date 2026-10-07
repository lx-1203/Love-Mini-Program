# 根目录整理终验与仓库收口总报告（v3.4）

- 汇编：收口记录员 · 2026-10-08 · 仓库 HEAD `c088e2d6`（branch `main`，ahead 32，账单①）
- 材料来源：本轮收口流程交付记录员的四份材料——①收口账单（JSON）、②车道结论、③终验读数、④需拍板清单——另附 blockers 清单。本报告全部读数逐项转录自上述材料；记录员未重跑任何门禁/探针，未手填、未推断任何数字。文中标注「记录员注」处仅做材料内部的交叉引用，不产出新读数。
- 边界声明：记录员仅写本报告这一个文件；未修改任何代码，未执行任何 git 写命令。目录存在性核对系记录员本 ask 内以 `dir /b reports/audit/rootorg-closure-2026-10-08` 亲自执行（见 §二.0 附注）。
- 车道明细原件（均在盘，目录列表证实）：`reports/audit/rootorg-closure-2026-10-08/lane-根目录卫生.md`、`lane-启动bat.md`、`lane-绝对路径.md`、`lane-证据删留.md`。

## 一、结论摘要

**一句话定性：本轮「根目录整理」判域内的车道收口动作，经复验成立者成立（启动bat 闸修复复验通过；根目录卫生四项原始动作全部证实），但仓库终态不绿——构建类终验 5 项全绿的同时，仍有 6 条红门、3 个探针红读数、16 条未收口 blockers、9 项待拍板；根目录违例为收口后的并发复发（drill 测试架写仓库根），绝对路径门存在探针判据缺陷（正向读数 ≠ 清零）。**

1. **终验构建类读数 5 项全绿**（材料③）：构建(bat)=PASS、typecheck=PASS、单测=PASS、showcase=PASS、后端编译=PASS；可变红自检 exit=0。
2. **门禁复量：新转绿 0、新转红 0、仍红 6**（材料③，与账单① redGates 逐条一致）：真实档覆盖 verify-real-coverage、证据语料 verify-evidence-corpus、溯源全量 verify-provenance-all、档位新鲜度 verify-band-freshness、后端新鲜度 verify-backend-fresh、离线负例聚合 run-qa-selftests。红因与拍板映射见 §三.2。
3. **探针读数仍红**：`ROOT_INV_RESULT=FAIL`（file 违例 `.gitattributes`/`exit`/`nul`，dir 违例 `.qoder`）；`ABS_SCAN_RESULT=HIT`（scanned=3767 hits=1，唯一命中 `scripts/qa/cellplan-round7-criteria-c.json:2`）；账单① `batStatic=FAIL`。材料③「探针复量 FAIL/HIT/PASS」按原文转录，与账单口径并陈、不作调和（§三.3）。另有面板腿 `emit-round-report EMIT_RESULT=FAIL`（自判失败 1 条）。
4. **车道结论：材料②标称「四车道」，实收 3 条车道结论文本**（根目录卫生、启动bat、绝对路径）。第 4 条结论文本未随材料到达；目录列表证实另有第 4 份车道报告 `lane-证据删留.md` 在盘，本报告不汇编其内容、不臆造其结论——与其相关的第一手复量读数已随材料④拍板项到达（144 帧、4881 戳记、1/51 等，见 §三.2 与 §四）。
   - **根目录卫生——收口动作真、门当前红**：四项原始动作（13 个 tmp_* 文件与空目录 tmpr1-regsuccess-crops 移入 `tmp/retired-20261008/`、`nul` 保留名专用删法删除、appendonly.aof 零操作、目录整理说明.md §0/§1/§2 计数修订）经复验员亲手重跑探针全部证实；但收口后（2026-10-08 04:32 起）有并发进程持续往仓库根写 `__drill-*.bat` 与 `exit` 散文件，复验窗口内可见文件 17→18 亲眼见增，ROOT-HYGIENE 白名单对照当前红（白名单 26、实测 32）。复验员判定：四项原始动作无需返工，散件清扫后重验预计可绿。
   - **启动bat——BAT-VERSIONGATE 复验通过**：静态四查（NODE22_DIR 闸、`%~dp0` 定位、盘符路径排除 URL 后零命中、被引用脚本存在）全部以命令输出证实，闸体位置与语义经 Read 全文核对，改动面 28+28=56 insertions 零删除与车道自报一致。边界如实声明：BAT_STATIC 探针本体（工作流侧）未复跑；showcase 正主 good-case 动态演练未复现（过闸会真实拉起后端 cmd /k 窗口）。
   - **绝对路径——ABSPATH-REGRESSION 未通过**：官方探针读数可复现（逐字节提取重跑 = HIT scanned=3767 hits=1），但探针正则被实证只认正斜杠形态（字符类实际求值为 `[/]`）；字符类补上反斜杠后同域重扫 hits=37（36 条未入台账），多条为活代码盘符绝对路径（tour-r6.mjs:933、r-exec.cjs:1123、r1-exec.cjs:42、start-local.bat:11 等），「代码域清零」不成立。且对 probe-abs-paths.json 全部 193 条历史 hits 复测 backslash-only-trigger hits=0——即此前的清零从未统计过 `D:\` 形态。
5. **仓库面（账单①）**：deletions=0、deletionsScreenshots=0（本轮无删除入库）；untracked=0（账单时点读数；根目录卫生车道复验另见 6 个 git 未跟踪根目录散文件，两时点两口径并陈不调和，见 §2.0 注）；ahead=32；pathNodeVersion=v16.13.1（记录员注：低于启动bat 闸要求的 Node ≥20，v16 路径正是该闸设计要拦的形态）；backendUp=true（记录员注：材料④ BACKEND-8080 指认该运行实例起于 2026-09-26，早于最新 class，跑的是旧代码）。
6. **全程无 git 提交**：三条实收车道自报均未提交、未碰 `.zcode/**`；账单 deletions=0。一切入库/删除/重建/重启动作均挂在 §四 的 9 项拍板上。
7. **出口**：需你拍板 9 项（§四）；仍未收口 blockers 16 条 = 13 条车道项 + 3 条终验探针/面板项（§五）。

## 二、账单与车道

### 2.0 收口账单（材料①，逐字段转录）

| 字段 | 读数 |
| --- | --- |
| rootInv | FAIL |
| absScan | HIT |
| batStatic | FAIL |
| deletions | 0 |
| deletionsScreenshots | 0 |
| untracked | 0 |
| ahead | 32 |
| pathNodeVersion | v16.13.1 |
| backendUp | true |
| head | c088e2d6 |
| branch | main |
| redGates（6 条） | 真实档覆盖 verify-real-coverage；证据语料 verify-evidence-corpus；溯源全量 verify-provenance-all；档位新鲜度 verify-band-freshness；后端新鲜度 verify-backend-fresh；离线负例聚合 run-qa-selftests |

> 记录员注（口径并陈，不调和）：账单 untracked=0 为账单时点读数；根目录卫生车道复验实见 6 个 git 未跟踪根目录散文件（§2.1 evidence 第 7 条）。两读数均如实收录。
>
> 2.0 附注（记录员亲自执行的唯一核对）：`dir /b reports/audit/rootorg-closure-2026-10-08` 实测目录在盘，含 lane-根目录卫生.md、lane-启动bat.md、lane-绝对路径.md、lane-证据删留.md 四份车道报告，及 gapbill-v34.json、gate-recheck-v34.json、lane-results-v34.json、probe-root-inventory(-final).json、probe-abs-paths(-final).json、probe-bat-static(-final).json、gate-verify-evidence-corpus.exit/.log、gate-verify-provenance-all.exit/.log、evidence-disposition.json、sort-v34.json。记录员未打开这些文件取数，读数一律以交付材料为准。

### 2.1 车道一：根目录卫生（材料②转录）

- **fixedIds**：（空——本车道无以 fixedIds 记的修复项）
- **filesChanged（3 项）**：`目录整理说明.md`、`reports/audit/rootorg-closure-2026-10-08/lane-根目录卫生.md`、`tmp/retired-20261008/`
- **skipped（3 项，全文转录）**：

| id | reason（原文） |
| --- | --- |
| `.gitattributes` | ROOT_INV 探针标其 fileViol，但缺口 how 未点名且不可移：git 行尾/属性规则只认仓库根，移走即坏。已按现状补录进 目录整理说明.md §2.3（14 个点文件），处置=留在根目录，非本车道可「回收」项。 |
| `.qoder` | ROOT_INV 探针标其 dirViol，但缺口 how 只点名 tmpr1-regsuccess-crops/；.qoder 裁处无授权依据。已在 目录整理说明.md §1 末注标记为待裁、原位不动，留给编排方另开车道裁决。 |
| `ROOT-HYGIENE` | 复验未通过: 验收探针「重数根目录条目对照白名单」当前为红——说明 §0/§2 白名单为 26 个文件（12 可见 + 14 点文件），实测 32 个文件（18 可见 + 14 点文件）；根目录存在 6 个白名单外散文件 __drill-bangtest.bat / __drill-build-ascii.bat / __drill-head-ascii.bat / __drill-showcase-ascii.bat / __drill-trace.bat / exit（全部 git 未跟踪 ??，mtime 2026-10-08 04:32–04:41，晚于车道收口 04:27/04:37，目录整理说明.md 对其一字未提），且复验期间仍实时增长（__drill-bangtest.bat 在两次读数之间新出现）。注：车道原有四项收口动作本身均证实成立（见 evidence），红的是收口后的复发污染。 |

- **evidence（7 条，逐条转录）**：
  1. `find . -maxdepth 1 -name "tmp_*" | wc -l` → 0；`find . -maxdepth 1 -name "nul" | wc -l` → 0（目录项枚举，避开 NUL 设备假象）。
  2. `ls tmp/retired-20261008/` → 13 个 tmp_* 文件齐全（文件名与 lane 报告 §B 清单逐一吻合：tmp_admin_routes / tmp_boot.js / tmp_boot_out.txt / tmp_menus / tmp_msg_exec / tmp_r11_guest / tmp_r11_login / tmp_r1_after_A / tmp_r1_after_B / tmp_r1_guest / tmp_r1_login / tmp_r2_guest / tmp_r2_login）+ 空目录 tmpr1-regsuccess-crops（`find … -type f | wc -l` → 0）。
  3. `git check-ignore -v tmp/retired-20261008/tmp_boot.js` → `.gitignore:114:tmp/`（落点确在忽略规则内）；`git status --porcelain | grep tmp_ | wc -l` → 0。
  4. appendonly.aof 实测 `-rw-r--r-- 2138517 Sep 4 00:00`，与 lane 报告 §E 开工/收口读数逐字一致，原地未动。
  5. `git status --porcelain -- 目录整理说明.md reports/audit/rootorg-closure-2026-10-08/` → ` M 目录整理说明.md` + `?? reports/audit/rootorg-closure-2026-10-08/`；两份改动文件均在盘且 lane 报告 114 行非空。
  6. 子目录复量：`find . -maxdepth 1 -type d | wc -l` → 33（含 . 本身）= 32 个子目录，与说明 §0「32 个子目录（含待裁 .qoder/）」一致；点文件 14 个与 §2.3 一致。
  7. **失败证据**：`find . -maxdepth 1 -type f | wc -l` → 32（≠26）；可见文件 18（≠12）；白名单外 6 项：`__drill-bangtest.bat`(04:41) / `__drill-build-ascii.bat`(04:33) / `__drill-head-ascii.bat`(04:33) / `__drill-showcase-ascii.bat`(04:33) / `__drill-trace.bat`(04:39) / `exit`(04:38)，git status 全部 `??`。exit 文件内容为 `LINE2-CAPTURED=[D:\6\恋爱小程序 /b 0 ]`，drill bat 自标「Task 8.4.4」——是某并发 drill/测试架写进仓库根的散产物，正是 lane 报告 §遗留2 挂账的复发模式（写入者不同）。
- **notes（转录）**：
  - 全程非破坏：14 项违例全部移入 `tmp/retired-20261008/` 原样保留（mv -n 不覆盖，md5 复核），唯 `nul` 按保留名专用删法删除（本就是 51 字节垃圾文件，未跟踪）。未做 git 提交、未碰 `.zcode/**`、未动其他车道 4028 行既有工作区修改。
  - 纪律性说明①：Mimosa PreToolUse 钩子两次拦截命令串中的 tmp_boot.js/tmp_*.js 字面量（视为绕过源码写审查），实际是移动未跟踪散文件，改用 find -exec mv 通配形式后放行，语义不变。
  - 纪律性说明②（复发风险挂账）：`scripts/qa/tour-r6.mjs:1823-1824` 下次运行仍会把 token 写回仓库根 tmp_r2_*.json（fs.writeFileSync），与说明 §3 第 3 条「不要在根目录起 tmp_ 前缀文件」冲突，改脚本超出本车道授权，已在车道报告「遗留与边界」记录。
  - 增量落盘已执行：lane-根目录卫生.md 开工先落骨架，§A-§G 每完成一项即更新，全部读数在盘。
  - 定性：**收口动作真、门当前红**。车道四项动作经亲手重跑探针全部证实；但收口后（04:32 起）有并发进程持续往仓库根写 `__drill-*.bat` 与 `exit` 散文件，复验窗口内亲眼见到新增（17→18 个可见文件），说明 §0 的「26 个文件」读数已过期。两支白名单 bat（build-mp-weixin.bat / start-showcase.bat）mtime 04:43 在被另一车道改写，属白名单内正常活动。建议编排方：追查正在写 `__drill-*`/`exit` 的 drill 测试架（应把产物落到 tmp/ 而非根，说明 §3 第 3 条），散件清扫后本缺口重验预计可绿——四项原始动作无需返工。本复验员未修改任何文件。

### 2.2 车道二：启动bat（材料②转录）

- **fixedIds**：`BAT-VERSIONGATE`（复验通过）
- **filesChanged（3 项）**：`build-mp-weixin.bat`、`start-showcase.bat`、`reports/audit/rootorg-closure-2026-10-08/lane-启动bat.md`
- **skipped（2 项，全文转录）**：

| id | reason（原文） |
| --- | --- |
| `BAT-VERSIONGATE/showcase-good-case-动态` | showcase 正主的 good-case（NODE22_DIR 过闸）未动态演练：闸过闸后会执行 Step1 的 start 真实拉起后端 cmd /k 窗口，会在用户桌面留孤儿进程；以 build 正主上逐字符相同的闸行（F2 全链路过闸）+ 闸位置先于 start 行的静态证据（start-showcase.bat:18-44 先于 :51/:54）覆盖。bad-case 两分支已在 showcase 正主上实跑通过（F3/F4）。 |
| `BAT-VERSIONGATE/BAT_STATIC-复跑` | BAT_STATIC 探针属工作流侧，本车道无执行入口；其静态判据已人工复量：两支 bat 均含 NODE22_DIR 闸（build:32-58、showcase:18-44）且先于各自 Step 1，盘符扫描（排除 URL 口径）零命中。 |

- **evidence（7 条，逐条转录）**：
  1. 重跑检查①NODE22_DIR：`grep -n "NODE22_DIR" build-mp-weixin.bat start-showcase.bat` → EXIT=0，两支均命中：build-mp-weixin.bat:34 `if defined NODE22_DIR (` + :36 `set "PATH=!NODE22_DIR!;!PATH!"`，start-showcase.bat:20/:22 同构；且两支闸体均先于各自 Step 1（build 闸 :32-58，[1/4] 在 :60；showcase 闸 :18-44，Step 1 :51、后端 start 行 :54——bad-case 会在拉起后端窗口前 exit /b 1）。
  2. 重跑检查②`%~dp0`：`grep -n "%~dp0" build-mp-weixin.bat start-showcase.bat` → EXIT=0，build-mp-weixin.bat:26,113；start-showcase.bat:54,61,94，两支均以 %~dp0 定位、无写死工作目录。
  3. 重跑检查③盘符路径：`grep -En '[A-Za-z]:[\\/]' build-mp-weixin.bat start-showcase.bat` → 仅 2 条 URL 误报（build-mp-weixin.bat:66 `https://pnpm.io/installation`、start-showcase.bat:99 `http://127.0.0.1:8080`）；排除 `://` 后复扫 `| grep -v '://'` → exit 1 零命中，与 lane-启动bat.md §D 读数一致。
  4. 重跑检查④被引用脚本存在：build-mp-weixin.bat:90 `node scripts\inject-wx-appid.mjs`（cwd 为 :26 切入的 apps\client）→ `ls apps/client/scripts/inject-wx-appid.mjs` 存在（2438 字节）；build-mp-weixin.bat:102 `pnpm run build:mp-weixin` → apps/client/package.json:25 已定义；start-showcase.bat:54 `pnpm api:dev`（cwd 为根）→ 根 package.json:10 已定义；start-showcase.bat:78 `build:mp-weixin:showcase:isolated` → apps/client/package.json:28 已定义，其下一跳 apps/client/scripts/build-real-isolated.mjs 经 ls 确认存在。
  5. 改动面对照：`git status --short` → 两支 bat 均 ` M`、lane-启动bat.md 为 `??`（未提交，符合车道「不做 git 提交」判域）；`git diff --stat` → 28+28 共 56 insertions、0 deletions，与 lane-启动bat.md §D 自报一致。
  6. 闸语义读验（Read 全文）：两支均含 `node -v` 探测（build:40 / showcase:26）、findstr 数值校验且按百分号展开（build:44 / showcase:30）、`!NODE_MAJOR! LSS 20` → 两条修复路径 + exit /b 1（build:51-56 / showcase:37-42）；两支开头均有 setlocal enabledelayedexpansion（build:12 / showcase:13），与缺口要求①②逐条对上。
  7. 未重跑项（如实声明）：BAT_STATIC 探针本体未复跑——`probe-bat-static.json` 仅是 findings 记录件（原文两条 problem：两支 bat 缺 NODE22_DIR/Node 版本闸），其执行入口在 miniprogram-qa-finish-v33 工作流的 GATE_SUITE 内（ListSavedWorkflows 仅见 3 个大型 QA 工作流，无独立探针入口；为找 standalone runner 的两次递归 grep 在本仓磁盘上超时已中止）。本 ask 对启动bat 点名的验证方式（静态四查）已全量亲手执行，以此为准；另注：车道 §E 的动态演练（ASCII 副本矩阵 M1-M7、真实文件 F1-F4）系修复者自报，本轮未复现，不在本次证实范围。
- **notes（转录）**：
  - ① 顺带修复（判域内、必要）：两支 bat 工作区换行 LF→CRLF——R1 实测 LF 真实文件下闸行被 cmd 多字节偏移错位吞掉（'MAJOR' is not recognized，exit 255，闸形同不存在），R2 证明同内容 CRLF 完美执行；git ls-files --eol=i/lf + core.autocrlf=true ⇒ 提交时归一回 LF，index 内容零增量，且与全新 checkout 落盘形态一致。
  - ② 既有问题如实上报未修：cmd 对多字节中文 bat 的分块偏移漂移（HEAD 对照同样碎，双击模拟下闸仍正确 fail-closed 但伴碎片噪音，个别 echo 行偶发被吞如 F1 的修复路径一）；管道子 cmd 不继承 enabledelayedexpansion（闸已按百分号书写并加注释）。
  - ③ 演练现场已清理：5 份 `__drill-*.bat`、2 份 crlf-tmp 副本、2 个本次产生的 static_prepare_* 残目录全删；现存 4 个数周前的 static_prepare_* 与他车道未提交改动未动。
  - ④ 未做 git 提交、未碰 `.zcode/**`。
  - 复验结论：**BAT-VERSIONGATE 复验通过**——静态四查全部以命令输出证实，闸体位置与语义经 Read 全文核对，改动面与车道自报一致（56 insertions 零删除）。fixedIds 只含亲手证实项。两点边界如实声明：①BAT_STATIC 探针属工作流侧无独立入口未复跑（lane §G 自述一致）；②动态闸行为本轮未复现，判定基于 ask 点名的静态检查。未修改任何文件。
  - 记录员注（勾稽）：本车道③「演练现场已清理：5 份 `__drill-*.bat` …全删」与车道一 evidence 第 7 条「白名单外 6 项 `__drill-*.bat`/`exit` mtime 04:32–04:41」在时间线上互为印证——启动bat 车道清理的是自己演练产物，根目录卫生车道复验窗口内见到的是**另一写入者**（drill bat 自标「Task 8.4.4」）的再写 入，两读数不矛盾，复发源未归案（见 §五 blocker 3）。

### 2.3 车道三：绝对路径（材料②转录）

- **fixedIds**：（空）
- **filesChanged（共 79 项，记录员对材料②清单逐项点数；逐项转录如下）**：
  `scripts/qa/emit-round-report.mjs`、`scripts/qa/dryrun-workflow.mjs`、`scripts/qa/cli-automator.mjs`、`scripts/qa/ws-channel-up.mjs`、`scripts/qa/real-tour-cli.mjs`、`scripts/qa/tail-1-freeze-and-readjudicate.cjs`、`scripts/qa/test-fourgrid-domextract.mjs`、`scripts/qa/test-triage-dead-selector.mjs`、`scripts/qa/test-guest-landing-stability.mjs`、`scripts/qa/test-guest-landing-writeguard.mjs`、`scripts/qa/test-lane-report-complete.cjs`、`scripts/qa/test-prov-dialect.cjs`、`scripts/qa/test-report-decision-buckets.cjs`、`scripts/qa/tour-cli-states.mjs`、`scripts/qa/tour-r6.mjs`、`scripts/qa/ui-queue.round8b-tour.json`、`scripts/qa/verify-evidence-corpus.mjs`、`scripts/qa/verify-guest-landing.mjs`、`scripts/qa/verify-provenance-all.mjs`、`scripts/qa/rerun-round7-slices.sh`、`scripts/qa/run-final-verify-v33.sh`、`scripts/audit-client-scan.mjs`、`scripts/scan-chinese.mjs`、`scripts/r13-admin-audit.mjs`、`scripts/r13-admin-image-recheck.mjs`、`scripts/r13-admin-ui-manage.mjs`、`scripts/r13-final.sh`、`scripts/r13-i18n-dupkeys.mjs`、`scripts/r13b-mp-verify.sh`、`scripts/r13c-mp-recover.sh`、`scripts/r13d-mp-verify.sh`、`scripts/r13e-mp-final.sh`、`scripts/shoot-all-2026-08-20.cjs`、`scripts/sync-app-assets.mjs`、`scripts/debug-fs.ps1`、`scripts/eval-app.ps1`、`scripts/eval_boot.ps1`、`scripts/eval_pinia.ps1`、`scripts/eval_state.ps1`、`scripts/eval_vm.ps1`、`scripts/launcher/run-local-demo.ps1`、`scripts/migrate-font-sizes.ps1`、`scripts/profile-style-update.ps1`、`scripts/qa-full-screenshot.cjs`、`scripts/r10-regress.ps1`、`scripts/r10-shoot.ps1`、`scripts/r11-ideal-shots.ps1`、`scripts/r11-n1-home.ps1`、`scripts/r11-reshoot.ps1`、`scripts/r11-tour.ps1`、`scripts/r11-tti.ps1`、`scripts/r5-shots.ps1`、`scripts/r7-journey.ps1`、`scripts/r7-validate-journey.ps1`、`scripts/r8-audit-retest.ps1`、`scripts/r8-audit-shoot.ps1`、`scripts/r8-chain-e.ps1`、`scripts/r8-chain-nav.ps1`、`scripts/r8-fix-verify-one.ps1`、`scripts/r8-fix-verify.ps1`、`scripts/r9-tour.ps1`、`scripts/shot-full.ps1`、`scripts/shot-round2.ps1`、`scripts/shot-round2b.ps1`、`apps/client/scan-aria.cjs`、`apps/client/scripts/add-error-a11y.mjs`、`apps/client/scripts/add-input-aria-label.mjs`、`apps/client/scripts/add-list-roles.mjs`、`apps/client/scripts/add-loading-a11y.mjs`、`apps/client/scripts/detect-broken-aria-comments.mjs`、`apps/client/scripts/fix-broken-aria-comments.mjs`、`apps/client/src/stores/campus.ts`、`apps/api/src/test/java/com/campuslove/api/wxpay/WxPayRequestSignerTest.java`、`apps/api/start-api-fixed.bat`、`apps/api/start-api-fixed.ps1`、`apps/api/start-api-mock.ps1`、`apps/api/start-api.ps1`、`apps/api/pom.xml`、`reports/audit/rootorg-closure-2026-10-08/lane-绝对路径.md`
- **skipped（8 项，全文转录）**：

| id | reason（原文） |
| --- | --- |
| `scripts/qa/cellplan-round7-criteria-c.json:2` | 代码域内唯一残留盘符命中（『node 走 D:/codex-tools』）。QA 记账叙述且 QA 契约件 sha 敏感，按车道纪律不改、留档待拍板；复刻探针读数 hits=1 即此条。 |
| `目录整理说明.md:152` | 文档叙述引用历史（C:/Users/&lt;用户&gt;/.trae-cn 为占位符模板），按纪律不改、留档待拍板。 |
| `reports/**（261 文件 1773 条）` | QA 报告/判决件/日志（vitest 日志、tapfix 判决、issue-matrix 等），属历史证据叙述；探针设计上跳过 reports/；按纪律不改、留档。 |
| `apps/**/*.log + scripts/archive/*（约 130 个）` | 运行/构建/服务轮转日志，机器输出非代码；留档。 |
| `apps/client/src/.mimosa/**（5 文件）` | 安全扫描插件本机会话状态（C:\Users\dsghy\...）；探针按点条目规则跳过点目录；留档。 |
| `scripts/audit-client-issues.csv + scripts/consolidated-issues.csv` | 未跟踪审计数据导出（共 1809 条，内容即路径数据本体）；探针扩展名白名单不含 .csv 不影响终验；可用修好的 audit-client-scan.mjs 重导为仓库相对，是否重导留拍板。 |
| `5 个 ps1 的既有解析失败` | launcher/run-local-demo、shot-full、start-api-fixed、start-api-mock、start-api 在 git HEAD 即因 UTF-8 无 BOM 被 PS5.1 误读而解析失败（基线对照实锤，错误数相同或更多）；编码修复超本车道判域，留拍板。 |
| `ABSPATH-REGRESSION` | **复验未通过**: 车道读数本身可复现（官方探针逐字节提取重跑 = HIT scanned=3767 hits=1，唯一命中即 §4.1 留档的 scripts/qa/cellplan-round7-criteria-c.json:2），纪律 grep 两条等价式也复现 0 条；但探针正则被实证为只认正斜杠形态——把 walk 域不变、字符类修正为同时含反斜杠后重扫，同域命中 37 条（36 条未入台账），其中多条是活代码盘符绝对路径（tour-r6.mjs:933、r-exec.cjs:71/1122-1123、r1-exec.cjs:39/42/782-783、poll-reshoot.cjs:111、shot-cmp.cjs:8、screenshot-all.mjs:9/13/39、start-api-fixed.ps1:23、start-local.bat:11、start-mysql-3307.bat:2-3、mp-fullshot.cjs:13、devtools/wx.ps1:7、wx10.ps1:4），「代码域清零」不成立。 |

- **evidence（4 条，逐条转录；第 4 条在材料传入时于句中被截断，截断处以【原文至此截断】标示）**：
  1. 官方探针复跑（从 `.zcode/workflow-drafts/rootorg-closure-v34.dwf.ts:246-277` 用 node 提取 ABS_SCAN_CODE 数组原文、spawnSync 按探针同款方式 node -e 运行，输出写系统临时目录）：`ABS_SCAN_RESULT=HIT scanned=3767 hits=1`，唯一 ABS_HIT `scripts/qa/cellplan-round7-criteria-c.json:2`——与 lane-绝对路径.md §3.1 声称的读数逐字一致。
  2. 探针正则缺陷实证：提取出的 RE 行实际字符为 `const RE=new RegExp('(?<![A-Za-z])[A-Za-z]:[\\\\/]')`（JSON.stringify 显示 `\\\\` 即 2 个字面反斜杠字符）→ JS 字符串求值为 `[/\]` → 正则字符类只含正斜杠；行为对照：官方探针代码在同域跑出 hits=1（漏掉 tour-r6.mjs:933 的 `D:\微信开发者…`），而字符类补上反斜杠的同款扫描器报 hits=37。
  3. 原始命中清单同构性佐证：对 `reports/audit/rootorg-closure-2026-10-08/probe-abs-paths.json` 全部 193 条 hits 逐条复测，backslash-only-trigger hits=0——即 aefd8a72 清零与本次收口链从未统计过任何 `D:\` 形态。
  4. 修正字符类（{`/`,`\`} 同域）重扫：node 临时复刻脚本 → `ABS_SCAN_RESULT=HIT scanned=3767 hits=37`；活代码残留举例（文件:行 \| 内容）：`scripts/qa/tour-r6.mjs:933 | execFile('D:\\微信开发者\\微信web开发者工具\\wechatide.cmd',`；`scripts/qa/r-exec.cjs:1123 | const CLI_PROJECT = 'D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\mp-weixin'`；`scripts/qa/r1-exec.cjs:42 | const REPO = 'D:\\6\\恋爱小程序'`；`scripts/qa/poll-reshoot.cjs:111 | const NODE22_DIR = ENV('RESHOOT_NODE22_DIR', 'D:\\codex-tools\\node-v22.17.0-win-x64')`；`tools/screenshot-all.mjs:13 | const PROJECT_PATH = 'd:\\6\\恋爱小程序'`；`apps/api/start-local.bat:11 | if not defined JAVA_HOME set "JAVA_HOME=D:\j`【原文至此截断】
- **notes**：材料②中该车道对象在 evidence 第 4 条句中被截断，未包含 notes 字段——本报告不臆造；该车道全文以在盘原件 `lane-绝对路径.md` 为准（记录员未读其内容取数）。

## 三、门禁终验读数

### 3.1 构建/测试类终验（材料③，五项全绿 + 自检）

| 项 | 读数 |
| --- | --- |
| 构建(bat) | **PASS** |
| typecheck | **PASS** |
| 单测 | **PASS** |
| showcase | **PASS** |
| 后端编译 | **PASS** |
| 可变红自检 | **exit=0** |

### 3.2 门禁复量（材料③：新转绿 0、新转红 0、仍红 6）

仍红 6 门名单（材料③原文顺序），红因转录自材料④对应拍板项的复量叙述（该映射为材料自身给出，非记录员推断）：

| # | 仍红门 | 红因（材料④转录） | 对应拍板项 |
| --- | --- | --- | --- |
| 1 | 真实档覆盖 verify-real-coverage | 复跑实测 REALCOV_UNCOVERED=9/236，逐条点名（PFI25/VI25/VI34/OT05/OT06/OT09/VRN07/OC09/VB03，全部缺 login 或 login+guest 真实腿）；去向册门 RCD 已 PASS（9 条条条有在册去向）。补跑属真实模式 DevTools/UI 轮，不归本轮。 | REALCOV-9-SCHED（§4.9） |
| 2 | 证据语料 verify-evidence-corpus | 唯一红因是 round-1 manifest 的 144 帧，实测 0 tracked/0 pending-deleted/0 on-disk（已按 2026-09-30 裁定提交删除，盘上无物可 restore）；其 advisory 只认 git ls-files --deleted 的未提交删除、认不出已提交删除（scripts/qa/verify-evidence-corpus.mjs:279-282,323）⇒ CORPUS_PROBLEMS=1 恒红。 | CORPUS-LEGACY-144（§4.3）、EVID-DELETION-DEADLOCK（§4.2） |
| 3 | 溯源全量 verify-provenance-all | 复跑实测 PROV_FRAMES_PRE_STAMP=4881／CONSISTENT=4154：19 份 manifest（round-7 exec-tap-final 646 帧、exec-guest-real 434 帧、round-8-interact 19 帧等）在盘帧 mtime 早于所记提交（如 mtime 2026-09-27 vs 所记 6fd15178@2026-09-28）⇒ 回填戳记，门禁原话「禁止据此下结论」。生产者侧干净（11/11 派生、0 字面量），债在历史证据本体。 | PROV-PRESTAMP-4881（§4.4）、EVID-DELETION-DEADLOCK（§4.2） |
| 4 | 档位新鲜度 verify-band-freshness | 复量实测 problems=4：mock 档目录装的是 real 构建档（VITE_API_MODE=real，应 mp-weixin-mock ⇒ 该档全部判决作废）、mock 对 vip/index.vue 真过期、showcase 对 pages.json 真过期、App.vue 无法定罪。另注：账单 02:11 同探针报 problems=16，03:4x 复量报 4，两时点间盘面有变动（有车道在动盘），读数是时点读数。 | BAND-REBUILD（§4.5） |
| 5 | 后端新鲜度 verify-backend-fresh | 运行实例起于 2026-09-26T21:32:46，早于最新 class 2026-10-05T17:26:06 ⇒ 跑的是旧代码；apps/api 有 55 项未提交 ⇒ 运行实例不可能代表 HEAD。修复链=提交/构建/重启。 | BACKEND-8080（§4.6）、OCT5-FEATURE-BODY（§4.1） |
| 6 | 离线负例聚合 run-qa-selftests | SELFTEST_RESULT=FAIL（1/51）只有计数行，失败者身份不可达：.zcode 下最新聚合器落盘日志停在 2026-10-01 12:45，本轮探针 stdout 未持久化；三条门自检实测全 PASS（DRYLEASE cases=5 bad=0、CA cases=7 bad=0、LR cases=11 bad=0）⇒ 失败在 48 个 test-* 之一，其中 41/49 含写盘调用（写 .zcode/tmp 夹具），分拣员只读铁律不允许重跑定位。 | SELFTEST-1OF51（§4.7） |

### 3.3 探针复量（材料③原文 + 账单① + 终验探针 blockers，多口径并陈）

- 材料③原文：「探针复量 **FAIL/HIT/PASS**」（未附逐项映射）。
- 账单①口径：rootInv=**FAIL**、absScan=**HIT**、batStatic=**FAIL**。
- 终验探针 blockers 原文（逐字转录）：
  - 根目录仍有违例：`ROOT_INV_RESULT=FAIL`；`ROOT_INV_FILE_VIOL=[".gitattributes","exit","nul"]`；`ROOT_INV_DIR_VIOL=[".qoder"]`
  - 绝对路径仍有命中：`ABS_SCAN_RESULT=HIT scanned=3767 hits=1`；`ABS_HIT scripts/qa/cellplan-round7-criteria-c.json:2`（该 blocker 句尾混入一段附注原文「"note": "lane C：零散原因的 UNDECIDABLE 收紧。范围按 verdictWhy 前缀排除后实测是 9 条而不是简报说的约 19 条（lane A「台账判据里抠不出任何可比对的具体物件」10 …」，句本身在材料中即被截断，原样转录）
- 记录员注：材料③的 FAIL/HIT/PASS 与账单①的 FAIL/HIT/FAIL 两处口径并陈如上，第三项 PASS 的归属记录员不揣测；可确认的红探针读数以账单①与终验探针 blockers 为准（ROOT_INV=FAIL、ABS_SCAN=HIT、batStatic=FAIL）。
- 另有一条与「nul」相关的张力如实并陈：车道一已将 `nul` 按保留名专用删法删除（§2.1 evidence 第 1、notes 首条），而终验探针 file 违例清单仍含 `nul`；车道一 evidence 曾注明 `find` 目录项枚举可避开 NUL 设备假象。两读数均照录，成因留待复验，记录员不下结论。
- **面板腿**：全量面板 emit-round-report `EMIT_RESULT=FAIL`（自判失败 1 条，材料原文至此截断）→ 计入 §五 blocker 16。

## 四、需你拍板

以下 9 项的 why 与 options 均为材料④原文转录，记录员不增删选项、不排序、不代裁。

### 4.1 OCT5-FEATURE-BODY —— 2026-10-05 功能体未提交
- **Why**：工作树挂着 2026-10-05 功能体未提交（VIP 订单/微信支付/实名照片清理/协议留痕：约 108 个改动 + 约 34 个新文件 + 6 个 Flyway 迁移 V2026.10.05.*），不属于本轮「根目录整理」判域，且未经后端测试门验证，不得擅自入库。
- **Options**：a) 下一轮跑后端 mvnw test 全绿后按功能拆提交入库；b) 保持未提交现状仅留档说明；c) 你指定拆分粒度后执行。

### 4.2 EVID-DELETION-DEADLOCK —— 证据删留「双绿才提交」判据不可达
- **Why**：EVIDENCE-DELETIONS 车道方剂假设「任一红且红因指向缺截图 ⇒ git restore ⇒ 复跑两条门确认转绿 ⇒ 双绿才提交删除」。本轮亲手复跑两条只读门证实该通道不可达：corpus 唯一红因是 round-1 manifest 的 144 帧，实测 0 tracked/0 pending-deleted/0 on-disk（已按 2026-09-30 裁定提交删除，盘上无物可 restore）；provenance 的 4881 个回填戳记全在盘上在帧（restore 不触及），且 5 帧恢复后 mtime 变为恢复时刻，会从 UNRESOLVABLE 翻成 STALE_STAMP 照旧红。即 3852 删留的「双绿才提交」判据永远无法满足，车道会卡死在方剂死角。
- **Options**：a) 红因已具名且各有裁定/去向的前提下，按「附红因记录+提交删除」收口（终报保留 CORPUS/PROV 红读数原文）；b) 全量 git restore 不提交，等判据修订后重裁；c) 先修 §4.3 CORPUS-LEGACY-144 的判据再走原 ① 双绿通道。

### 4.3 CORPUS-LEGACY-144 —— 144 帧两把尺子结论相反
- **Why**：同一批 144 帧两把尺子结论相反：verify-provenance-all 按 2026-10-06 已采纳建议书 #12-A 豁免（复跑实测 PROV_FRAMES_LEGACY_EXEMPT=144，判据见 scripts/qa/verify-provenance-all.mjs:195-206），而 verify-evidence-corpus 的缺席轴仍判 blocking（其 advisory 只认 git ls-files --deleted 的未提交删除，认不出已提交删除，见 scripts/qa/verify-evidence-corpus.mjs:279-282,323）⇒ CORPUS_PROBLEMS=1 恒红。改判据/处置旧 manifest 都属政策与数据去留，不归车道自裁。
- **Options**：a) 给 corpus 缺席轴加与 #12-A 同口径的 legacy/裁定豁免（对齐两把尺子）；b) 处置 reports/screenshots/round-1/manifest.json 本体（移出 reports 扫描域或归档——数据去留）；c) 接受该门长期红，仿 RCD 立去向册逐条点名。

### 4.4 PROV-PRESTAMP-4881 —— 回填戳记
- **Why**：复跑 verify-provenance-all 实测 PROV_FRAMES_PRE_STAMP=4881／CONSISTENT=4154：19 份 manifest（round-7 exec-tap-final 646 帧、exec-guest-real 434 帧等、round-8-interact 19 帧）的在盘帧 mtime 早于所记提交（如 mtime 2026-09-27 vs 所记 6fd15178@2026-09-28）⇒ 回填戳记，门禁原话「禁止据此下结论」。生产者侧干净（11/11 派生、0 字面量），债在历史证据本体。重采属真实模式 UI 轮（不归本轮），改戳属造假。
- **Options**：a) 接受为已知降级：本轮/终报结论只锚 CONSISTENT=4154，4881 帧按 manifest 点名降级留档；b) 另立真实模式重采轮消化（UI 域）；c) 不接受任何一项，维持门红并挂起依赖本轮产物的结论（改戳/倒填 mtime 不设为选项——那是造假）。

### 4.5 BAND-REBUILD —— 档位目录被错档构建覆盖
- **Why**：复跑 verify-band-freshness 实测 problems=4：mock 档目录当前装的是 real 构建档（VITE_API_MODE=real，应 mp-weixin-mock ⇒ 「这个目录已被别的档位的构建覆盖，这一档上的全部判决作废」）、mock 对 vip/index.vue 真过期、showcase 对 pages.json 真过期、App.vue 无法定罪。重建动作属构建链不属四车道域，且产物会吞入未提交功能体。另注：账单 02:11 探针报 problems=16，03:4x 复量报 4，两时点间盘面有变动（有车道在动盘），读数是时点读数。
- **Options**：a) 现在重建 mock+showcase 两档（产物含未提交功能体，仅限本地取证，终报须注明）；b) 功能体入库后再重建；c) 本轮不重建，所有档位级判决挂起并点名。

### 4.6 BACKEND-8080 —— 8080 跑的是旧代码
- **Why**：账单门禁读数：运行实例起于 2026-09-26T21:32:46，早于最新 class 2026-10-05T17:26:06 ⇒ 跑的是旧代码；apps/api 有 55 项未提交 ⇒ 运行实例不可能代表 HEAD。修复链=提交/构建/重启，其中「功能体怎么入库」已有拍板底座（§4.1 OCT5-FEATURE-BODY），但「8080 何时按哪份代码重建重启」仍需拍板。
- **Options**：a) 功能体过后端测试门入库后再重建+重启 8080；b) 先按 HEAD（不含功能体）构建重启，功能体另行走查；c) 本轮不动 8080，一切真实模式判据挂起点名。

### 4.7 SELFTEST-1OF51 —— 1/51 失败者身份不可达
- **Why**：账单 SELFTEST_RESULT=FAIL（1/51）只有计数行，失败者身份不可达：.zcode 下最新聚合器落盘日志停在 2026-10-01 12:45，本轮探针的 stdout 未持久化且运行日志本会话读不到；实测三条门自检全 PASS（DRYLEASE cases=5 bad=0、CA cases=7 bad=0、LR cases=11 bad=0）⇒ 失败在 48 个 test-* 之一，但其中 41/49 含写盘调用（写 .zcode/tmp 夹具），分拣员只读铁律不允许重跑定位。
- **Options**：a) 授权一次允许写 .zcode/tmp 夹具的复跑（node scripts/qa/run-qa-selftests.mjs）定位失败者；b) 归下轮 QA 车道处理；c) 终报按「1 项离线自检未过、定位留待下轮」如实点名。

### 4.8 ROOT-GITATTRIBUTES —— LFS 闸 vs 根目录白名单冲突
- **Why**：判据冲突：根目录白名单（目录整理说明.md/workflow ROOT_FILES_ALLOWED）未列 .gitattributes，探针把它点为 ROOT_INV 文件违例，按车道方剂会被非破坏移入 tmp/retired-20261008/；但该文件是 2026-09-29 用户裁定的 LFS fail-loud 闸（文件头自述：证据帧 force-add 必须走 LFS、未装 LFS 时 git add 故意失败），移走＝静默停用一项用户裁定。目录整理说明.md 对它零提及（grep 无命中）。
- **Options**：a) 白名单补录 .gitattributes 并修订目录整理说明.md（保留 LFS 闸，推荐）；b) 确认 retire（等于明示废止 2026-09-29 LFS 裁定，不建议）；c) 本轮跳过该文件不动，留待专项裁定。

### 4.9 REALCOV-9-SCHED —— 9 条未覆盖真实腿的红读数呈现口径
- **Why**：复跑 verify-real-coverage 实测 REALCOV_UNCOVERED=9/236，逐条点名（PFI25/VI25/VI34/OT05/OT06/OT09/VRN07/OC09/VB03，全部缺 login 或 login+guest 真实腿）；去向册门 RCD 已 PASS（9 条条条有在册去向）。补跑属真实模式 DevTools/UI 轮，不归本轮，但终验时该门仍红，红读数怎么呈现需要口径。
- **Options**：a) 下一真实模式 QA 轮按点名补腿；b) 终验/终报按去向册口径将该门记为「已处置欠账」并接受红；c) 判据侧收缩（须拍板，不默认）。

## 五、仍未收口（blockers）

**合计 16 条 = 13 条车道项（blockers 清单原文，其中部分条目文字在材料传入时即被截断，以「…」标示，全文见 §二对应 skipped 行）+ 3 条终验探针/面板项。**

**车道项（13 条）：**

1. 车道 根目录卫生：`.gitattributes` 未收口（ROOT_INV 探针标其 fileViol，但缺口 how 未点名且不可移：git 行尾/属性规则只认仓库根，移走即坏。已按现状补录进 目录整理说明.md §…）——全文见 §2.1 skipped 第 1 行；与拍板 §4.8 ROOT-GITATTRIBUTES 同源。
2. 车道 根目录卫生：`.qoder` 未收口（ROOT_INV 探针标其 dirViol，但缺口 how 只点名 tmpr1-regsuccess-crops/；.qoder 裁处无授权依据。已在 目录整理…）——全文见 §2.1 skipped 第 2 行。
3. 车道 根目录卫生：`ROOT-HYGIENE` 未收口（复验未通过: 验收探针「重数根目录条目对照白名单」当前为红——说明 §0/§2 白名单为 26 个文件（12 可见 + 14 点文件），实测 32 个文件（18…）——全文见 §2.1 skipped 第 3 行。红因是收口后并发复发（drill 测试架写仓库根），四项原始动作无需返工。
4. 车道 启动bat：`BAT-VERSIONGATE/showcase-good-case-动态` 未收口（showcase 正主的 good-case（NODE22_DIR 过闸）未动态演练：闸过闸后会执行 Step1 的 start 真实拉起后端 cmd /k 窗…）——全文见 §2.2 skipped 第 1 行。
5. 车道 启动bat：`BAT-VERSIONGATE/BAT_STATIC-复跑` 未收口（BAT_STATIC 探针属工作流侧，本车道无执行入口；其静态判据已人工复量：两支 bat 均含 NODE22_DIR 闸（build:32-58、showca…）——全文见 §2.2 skipped 第 2 行。
6. 车道 绝对路径：`scripts/qa/cellplan-round7-criteria-c.json:2` 未收口（代码域内唯一残留盘符命中（『node 走 D:/codex-tools』）。QA 记账叙述且 QA 契约件 sha 敏感，按车道纪律不改、留档待拍板；复刻探针读…）——全文见 §2.3 skipped 第 1 行。
7. 车道 绝对路径：`目录整理说明.md:152` 未收口（文档叙述引用历史（C:/Users/&lt;用户&gt;/.trae-cn 为占位符模板），按纪律不改、留档待拍板）——全文见 §2.3 skipped 第 2 行。
8. 车道 绝对路径：`reports/**（261 文件 1773 条）` 未收口（QA 报告/判决件/日志（vitest 日志、tapfix 判决、issue-matrix 等），属历史证据叙述；探针设计上跳过 reports/；按纪律不改、…）——全文见 §2.3 skipped 第 3 行。
9. 车道 绝对路径：`apps/**/*.log + scripts/archive/*（约 130 个）` 未收口（运行/构建/服务轮转日志，机器输出非代码；留档）。
10. 车道 绝对路径：`apps/client/src/.mimosa/**（5 文件）` 未收口（安全扫描插件本机会话状态（C:\Users\dsghy\...）；探针按点条目规则跳过点目录；留档）。
11. 车道 绝对路径：`scripts/audit-client-issues.csv + scripts/consolidated-issues.csv` 未收口（未跟踪审计数据导出（共 1809 条，内容即路径数据本体）；探针扩展名白名单不含 .csv 不影响终验；可用修好的 audit-client-scan.mjs …）——全文见 §2.3 skipped 第 6 行。
12. 车道 绝对路径：`5 个 ps1 的既有解析失败` 未收口（launcher/run-local-demo、shot-full、start-api-fixed、start-api-mock、start-api 在 git…）——全文见 §2.3 skipped 第 7 行。
13. 车道 绝对路径：`ABSPATH-REGRESSION` 未收口（复验未通过: 车道读数本身可复现（官方探针逐字节提取重跑 = HIT scanned=3767 hits=1，唯一命中即 §4.1 留档的 scripts/qa…）——全文见 §2.3 skipped 第 8 行。根因是探针正则只认正斜杠形态，修正字符类后同域 hits=37。

**终验探针/面板项（3 条，原文转录）：**

14. 终验探针：根目录仍有违例 `ROOT_INV_RESULT=FAIL`；`ROOT_INV_FILE_VIOL=[".gitattributes","exit","nul"]`；`ROOT_INV_DIR_VIOL=[".qoder"]`。（记录员注：`nul` 已被车道一专用删法删除而仍出现在终验违例清单，见 §3.3 的张力并陈；`exit` 与 drill 散件即 blocker 3 的复发污染。）
15. 终验探针：绝对路径仍有命中 `ABS_SCAN_RESULT=HIT scanned=3767 hits=1`；`ABS_HIT scripts/qa/cellplan-round7-criteria-c.json:2`（句尾附注原文截断，见 §3.3 转录）。
16. 面板腿红：全量面板 emit-round-report（`EMIT_RESULT=FAIL` 自判失败 1 条：…材料原文至此截断）。

---

*汇编完。本报告由收口记录员依交付材料汇编，全部读数可溯源至材料①②③④与 blockers 清单原文；记录员未重跑门禁/探针，未修改代码，未执行 git 写命令。*
