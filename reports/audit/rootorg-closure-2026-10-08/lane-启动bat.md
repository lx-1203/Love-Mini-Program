# 收口车道报告：启动bat（BAT-VERSIONGATE）

- 车道：收口车道-启动bat
- 开工时间：2026-10-08；本报告增量落盘（骨架→逐节更新，最终版为全量读数）
- 缺口来源：本轮 BAT_STATIC 探针（`probe-bat-static.json`）+ v3.3 文件头 Node16 PATH 坑实测记录
- 缺口内容：给 `build-mp-weixin.bat` 与 `start-showcase.bat` 补 Node 版本闸（两支都在 Step 1 之前）：
  ① 定义 `NODE22_DIR` 则前置到 PATH；② `node -v` 探测主版本，低于 20 打印 ERROR + 两条修复路径并 `exit /b 1`；
  不许写死盘符；保持 `%~dp0` 定位与既有 errorlevel 纪律
- 判域：仅根目录两支 .bat；不碰 `.zcode/**`；不做 git 提交

## 状态总览

| # | 事项 | 状态 | 证据锚点 |
| --- | --- | --- | --- |
| 1 | 开工基线（编码/换行/git 快照） | 完成 | §A |
| 2 | build-mp-weixin.bat 加 Node 版本闸 | 完成（自测抓出 1 个真 bug 并修复） | §B |
| 3 | start-showcase.bat 加 Node 版本闸 | 完成 | §C |
| 4 | 静态复查（闸位置 + 无盘符 + 改动面） | 完成 | §D |
| 5 | 动态自测（ASCII 副本矩阵 + 真实文件验收） | 完成 | §E |
| 6 | 既有问题（非本车道修复，如实记录） | 记录 | §F |

---

## §A 开工基线

- `file build-mp-weixin.bat start-showcase.bat` → 两支均为 `DOS batch file, Unicode text, UTF-8 text`，**LF 换行**（CRLF 行数 0）
- `git ls-files --eol` → `i/lf w/lf`，`core.autocrlf=true` ⇒ 仓库 index 存 LF、新 checkout 会落成 CRLF；当前磁盘 LF 系工具直写产物
- `git status --short -- build-mp-weixin.bat start-showcase.bat` → 空（开工时两支对 HEAD 干净）
- `probe-bat-static.json` 两条 problem：两支 bat 均"缺 NODE22_DIR/Node 版本闸（PATH node=v16 会把构建链崩成假红）"

## §B build-mp-weixin.bat 加 Node 版本闸

- 闸体插入在 `cd /d "%~dp0apps\client"` 之后、Step 1（`:60`）之前：`build-mp-weixin.bat:32-58`
- 结构：
  - `:34-37` `if defined NODE22_DIR` → echo 提示 + `set "PATH=!NODE22_DIR!;!PATH!"`（块内用延迟展开；百分号在 if 块里会在解析期展开，未定义时也会执行 set，是已知坑）
  - `:39-45` `for /f ('node -v 2^>nul')` 捕获版本 → `for /f "tokens=1 delims=v."` 取主版本号
  - `:47` `echo %NODE_MAJOR%| findstr /r "^[0-9][0-9]*$"` 数值合法性校验——**此处必须用百分号**：管道两侧由子 cmd 执行，不继承 `setlocal enabledelayedexpansion`，用 `!var!` 会按字面传出导致闸误报（自测中实测踩中后修正）
  - `:48-52` 探测失败分支：`[ERROR] 未找到可用的 node…` + 修复路径一（升级 Node 20+）/ 修复路径二（`set NODE22_DIR=…`）+ `exit /b 1`
  - `:53-58` 主版本 <20 分支：`[ERROR] …版本过低：<实测版本>…` + 同样两条修复路径 + `exit /b 1`
- **自测抓出的真 bug（已修复）**：首版闸行误写为 `set "PATH=!NODE22_DIR;!PATH!"`（`NODE22_DIR` 漏了闭合 `!`），三连 bang 使解析器把 `NODE22_DIR;` 当变量名（未定义→空），PATH 被赋成字面量 `PATH`，后续所有外部命令（findstr/where/node）全部解析失败（M3 首跑 `'findstr' is not recognized`、`PATHDUMP=[PATH]`、exit 255）。对照探针 `__drill-bangtest.bat` 证明 `setlocal enabledelayedexpansion` 本身有效（`BANGTEST=[bar]`），定位到 typo；修为 `!NODE22_DIR!;!PATH!` 后 M3 转绿（§E）

## §C start-showcase.bat 加 Node 版本闸

- 闸体插入在 `chcp 65001` 之后、Step 1（`:51`）与 `start "campus-love-api-mock" …`（`:54`）之前：`start-showcase.bat:18-44`
- 闸代码与 §B 逐字符一致（`:22` 同为修正后的 `set "PATH=!NODE22_DIR!;!PATH!"`）
- 闸先于 `start` 行 ⇒ 后端子窗口继承修正后的 PATH（Windows 子进程环境继承语义）；bad-case 下闸在 `start` 之前 `exit /b 1` ⇒ 演练全程零窗口残留（F3/F4 后 `tasklist /FI "WINDOWTITLE eq campus-love-api-mock*"` = No tasks）
- good-case 未在正主 showcase 上动态跑（闸过闸后会真实拉起后端窗口）：以 M3/F2（build 正主同字符闸行）+ 闸位置静态证据覆盖，避免在用户桌面残留 `cmd /k` 孤儿窗口

## §D 静态复查

- 闸位置：build `:32-58` 先于 Step 1 `:60`；showcase `:18-44` 先于 Step 1 `:51` 与 `start` `:54`（grep -n 读数见 §B/§C）
- 盘符路径扫描：`grep -En '[A-Za-z]:[\\/]' build-mp-weixin.bat start-showcase.bat` 仅命中 2 条 URL 误报（`https://pnpm.io/installation`、`http://127.0.0.1:8080`）；排除 `://` 后复扫 **零命中**（exit 1）——两支 bat 无写死盘符
- 改动面：`git diff --stat` = 两支 bat 各 `+28` 行，共 `56 insertions(+)`，无删除、无其他文件；工作区另将两支换行 LF→CRLF（见 §F-3，index 归一化后对仓库内容零增量）

## §E 动态自测

### E.1 演练基建与口径

- 演练 harness：`cmd //c "chcp 65001 >nul && set PATH=C:\Windows\System32&& call <bat>"`（剥 PATH 至仅 System32，node/pnpm 按用例注入）；假 v16 用 `node.cmd`（`@echo off` + `echo v16.20.2`，首版缺 `@echo off` 会把子 cmd 提示符回显混进捕获，已修正）
- ASCII 结构副本（`perl -pe 's/[\x80-\xFF]+/_/g'`，控制流逐行不变、中文→`_`）用于确定性验证逻辑；真实文件验收见 E.3。原因见 §F-1（多字节错位是既有行为，HEAD 对照同样碎）

### E.2 ASCII 副本矩阵（副本置于仓库根，跑完即删）

| 用例 | 环境 | 期望 | 实测 | 判定 |
| --- | --- | --- | --- | --- |
| M1 build badA | PATH=System32，无 NODE22_DIR | node 未找到文案+两条修复路径，exit 1 | `[ERROR] _ node_node -v _ Node _ 20_` + 修复路径一/二，`M1_EXIT=1` | ✓ fail-closed |
| M2 build badB | + 假 node.cmd=v16.20.2 | 版本过低文案，exit 1 | `[ERROR] PATH _ Node _v16.20.2_ Node _ 20_` + 两条修复路径，`M2_EXIT=1` | ✓ |
| M3 build good | + NODE22_DIR=D:\codex-tools\node-v22.17.0-win-x64 | 前置提示→过闸→继续 Step1 | `_ NODE22_DIR=D:\codex-tools\…_ PATH` → `Node _v22.17.0` → `[1/4]`~`[4/4]` 全走通，止于 prepare-static（演练剥 PATH 致 `cp` 缺失，与闸无关），`M3_EXIT=1` | ✓ |
| M4 showcase badA | 同 M1 | 同 M1 | 同 M1 文案，`M4_EXIT=1`，零窗口 | ✓ |
| M5 showcase badB | 同 M2 | 同 M2 | 同 M2 文案，`M5_EXIT=1`，零窗口 | ✓ |
| M7 HEAD 对照 badA | 无闸 HEAD 版 | 无闸直接漏放 | `[1/4] _ pnpm...` → `[ERROR] _ pnpm_`，`M7_EXIT=1`——**缺 node 无人拦截**，即本缺口要杀的假红形态 | ✓ 证明缺口真实 |

### E.3 真实文件验收（CRLF 工作区版）

| 用例 | 实测要点 | 判定 |
| --- | --- | --- |
| F1 build badA | 闸命中完整中文文案，exit 1；伴随 2-3 条既有错位碎片（§F-1），`修复路径一` 行被一次碎片吞显（非确定性） | ✓ fail-closed |
| F2 build good | 零碎片全链路：`检测到 NODE22_DIR=D:\codex-tools\node-v22.17.0-win-x64，已前置到 PATH` → `Node 版本检查通过：v22.17.0` → `[1/4] pnpm 已安装` → `[2/4] Already up to date` → `[3/4] 跳过` → `[4/4]` 构建链启动，止于 prepare-static `cp` 缺失（演练 PATH 剥离所致；构建在 `uni build` 之前已停，dist 未动），exit 1 | ✓ |
| F3 showcase badA | 闸命中完整文案，exit 1，`campus-love-api-mock` 窗口数=0 | ✓ |
| F4 showcase badB | 零碎片：`[ERROR] PATH 上的 Node 版本过低：v16.20.2…` + 修复路径一/二 完整，exit 1 | ✓ |

### E.4 演练现场清理

- 仓库根 5 份 `__drill-*.bat` 演练副本与 2 份 `build-mp-weixin-crlf-tmp.bat` 全部删除；本车道演练产生的 `apps/client/static_prepare_36192_1791405820267`、`static_prepare_48416_1791406019478` 已删；现存 4 个更早的 `static_prepare_*`（数周前）非本车道产物，未动

## §F 既有问题记录（非本车道修复，如实呈报）

1. **多字节中文 bat 在 cmd 下解析错位（既有，非本次引入）**：HEAD 两支 bat 在管道/预设码页等模式下同样出现行首丢失碎片（`git show HEAD:build-mp-weixin.bat` 对照实测）；机制为 cmd 分块读 bat 按字符数回溯字节偏移，多字节行累积漂移。后果是 echo 类碎片报错、个别行偶发被吞，控制流总体存活（与 v3.3 实测记录"能跑到构建步"相符）。CRLF 化 + 控制台 65001 下最干净（R2 零碎片）；双击模拟（cp936 起步 + bat 内 chcp 切换）下闸仍正确 fail-closed（R3）但伴随碎片噪音
2. **管道模式下不能依赖延迟展开**：`echo !var!| findstr` 的管道两侧由子 cmd 执行，`setlocal enabledelayedexpansion` 不传导；闸代码已按百分号展开书写并在注释中标明
3. **两支 bat 工作区换行 LF→CRLF**：R1（LF 真实文件）实测闸行被错位吞掉（`'MAJOR' is not recognized`，exit 255）——LF 下闸形同不存在；R2 证明同内容 CRLF 完美执行。`git ls-files --eol`=`i/lf`+`core.autocrlf=true` ⇒ 提交时归一回 LF，**index 内容不因此多一个字节**，且与全新 checkout 的落盘形态一致。此改动落在判域两文件内，系让闸真正落地运行的必要修正
4. `apps/client` 现存 4 个数周前的 `static_prepare_*` 残目录与他车道未提交改动（删除态截图等），非本车道产物，未动、仅记录

## §G 收口判定

- BAT_STATIC 两条 problem（两支 bat 缺 NODE22_DIR/Node 版本闸）→ 已修：两支均具备 ① NODE22_DIR 前置 ② `node -v` 主版本探测 + 两条修复路径 + `exit /b 1`，位置先于各自 Step 1，无写死盘符，`%~dp0` 定位与 errorlevel 纪律保持
- bad-case 六连测（M1/M2/M4/M5/F1/F3/F4 中的全部探测分支）全部 fail-closed exit 1；good-case 在 build 正主全链路过闸（F2）
- 未做、如实声明：showcase 正主的 good-case 动态演练（避免拉起后端孤儿窗口，以同字符闸行 + 闸位静态证据覆盖）；CI/扫描门 BAT_STATIC 复跑（该探针属工作流侧，本车道无执行入口，静态判据已在 §D 逐条人工复量）
