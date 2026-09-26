# WF-RERUN-READINESS — 小程序 QA 闭环（v3.2）下一轮起跑条件核查

> 性质：纯只读调查。未修改/删除/构建任何文件，未启动任何进程或 UI 会话，未触碰 `.zcode/workflows/` 下任何文件（仅 Grep 只读检索）。
> 生成时间：2026-09-25 00:32 (+0800) / 2026-09-24T16:32Z（`powershell Get-Date`）
> 仓库：`D:\6\恋爱小程序`  ·  HEAD `cc540a6e73221ae31194d6e8173e30d1ac6b2e5b`（main）
> ⚠️ **引用漂移警告**：`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts` 在本调查期间被其它代理并发编辑（`ls` 实测：00:15 版 99767 B → 00:49 版 122550 B）。本报告所有 `.dwf.ts:行号` 均指向 **00:31 读到的 99767 B 版本**；下一轮使用前请按字段名（`endpoint`/`realOutDir`/`staleAfterSeconds`/`UI_LOCK_RULES`）重新定位行号，勿按行号盲改。仓库 HEAD 同样在期间从 `cc540a6e` 漂到 `874ff52f`（见 3.3）。


## 结论速览

**总判定：不能直接开跑。** 五节里有 **4 节各自构成一条阻塞项**，其中第 1 节（通道消失）与第 3 节（证据基线过期）是"跑了也白跑"级别。

- [x] 1. **9420 通道与 UI Lock** —— 锁可直接接管（僵尸租约，pid 40468 已死）；但 **9420 上已无任何监听者**，开发者工具实际在听 **9430**。⚠️ **阻塞**
- [x] 2. **开发者工具指向** —— 两份 project.config.json 的 miniprogramRoot **都指向 mock 产物** `mp-weixin/`，无一指向 `mp-weixin-real/`；同一工具会话内跑不了 mock+real。⚠️ **影响 G8/G9**
- [x] 3. **gitSha 陷阱** —— 证据绑 `18c91ccf`，HEAD 已是 `874ff52f`，期间 47 个 client/src 文件被改 → **941/941 条 mock 证据全部过期须重采**；另 166 例从未跑、real 侧 0 证据。⚠️ **阻塞**
- [x] 4. **产物目录卫生** —— 13 目录 ≈387M，其中 **11 个 ≈321M（83%）零引用可删**；`mp-weixin`/`mp-weixin-real` 仍被引用不可动。垃圾文件 `0` 已被**提交进版本库**。建议级
- [x] 5. **截图语料卫生** —— 全量 7136 张：重复 1282（18.0%）、孤立 4303（70.0%）、真空白 3 张；**更致命的是 46.7% 图像证据是 `ERROR:timeout` 串、434 条指向不存在的文件**（通道故障被静默计入完成度）。阻塞（并入第 1 条）

> 优先级表见文末第 6 节：**阻塞级 5 条 / 建议级 6 条**。


---

## 1. 9420 通道与 UI Lock 的真实状态

### 1.1 锁文件定位
工作流协议原文（`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts:517`）声明：
> 锁文件 `tmp/qa/locks/wechat-automation-9420.lock`，字段：resource/owner/pid/batch/status(AVAILABLE|LEASED|STALE)/leaseUntil/lastHeartbeat/attempt。

实测该文件存在：`D:\6\恋爱小程序\tmp\qa\locks\wechat-automation-9420.lock`，273 字节，mtime `2026-09-25 00:06`（`ls -la tmp/qa/locks/`）。目录下**仅此一个锁文件**，没有 AVAILABLE 墓碑、没有其它资源锁。

### 1.2 锁字段原文与 STALE 判定
`cat tmp/qa/locks/wechat-automation-9420.lock` 原文：

| 字段 | 值 |
|---|---|
| resource | `wechat-automation-9420` |
| owner | `r2-exec-subagent-R2` |
| pid | `40468` |
| batch | `R2` |
| status | **`LEASED`**（未回写为 AVAILABLE/STALE —— 进程被强杀，收尾 finally 未执行） |
| leaseUntil | `2026-09-24T16:21:42.519Z` |
| lastHeartbeat | `2026-09-24T16:06:42.519Z` |
| acquiredAt | `2026-09-24T10:59:06.253Z` |
| attempt | 1 |

换算到本地时间（+0800）：acquiredAt = 09-24 18:59:06，lastHeartbeat = 09-25 **00:06:42**，leaseUntil = 09-25 **00:21:42**。
当前时间 `2026-09-25 00:32:06 +0800` = `2026-09-24T16:32:06Z`（`powershell Get-Date`）。

- `leaseUntil` 已过期 **≈10 分 24 秒**（16:32:06Z − 16:21:42Z）。
- `lastHeartbeat` 停更 **≈25 分 24 秒**，远超协议阈值 `staleAfterSeconds = 30`、`graceSeconds = 30`（`.dwf.ts:52-53`）。
- 结论：**该锁在时间维度上已确定 STALE**，只是 status 字段仍谎报 LEASED。leaseUntil 恰好 = lastHeartbeat + `leaseMinutes 15`（`.dwf.ts:50`），说明最后一次心跳刷新是正常顺延，之后进程直接被 kill。

### 1.3 owner pid 存活性
协议 `v3.2` 接管判据（`.dwf.ts:523`）要求先用 `tasklist`/`Get-Process` 校验 owner.pid 是否活进程：

- `Get-Process -Id 40468` → **`PID 40468 NOT RUNNING`**
- `tasklist /FI "PID eq 40468"` → `信息: 没有运行的任务匹配指定标准。`（GBK 输出）

即 **pid 40468 已死，这是协议定义的标准"僵尸租约"**，下一轮可凭 `staleAfterSeconds` 直接接管，无需等待，只需在结论里记"接管僵尸锁 pid=40468"。协议同时禁止 kill 任何进程（`.dwf.ts:520`）——本次调查也未 kill 任何进程。

### 1.4 9420 端口/连接归属 —— **真正的阻塞点：9420 上已经没有任何监听者**

`netstat -ano | grep -c 9420` → **0**（全表无任何 9420 条目，既无 LISTENING 也无 ESTABLISHED）。
`Get-NetTCPConnection -LocalPort 9420` → 空结果。
本机 62 条 LISTENING 记录中，9xxx 段只有 **`127.0.0.1:9430` pid 32580**。

pid 32580 归属（`Get-Process -Id 32580`）：
```
ProcessName : 微信开发者工具
Path        : D:\微信开发者\微信web开发者工具\微信开发者工具.exe
StartTime   : 2026/9/24 14:51:14
```
进程面交叉验证（`Get-Process | Group-Object ProcessName`）：`微信开发者工具` 7 个进程、`WeChatAppEx` 8 个、`node` 13 个 —— **开发者工具本体与模拟器仍在运行**，只是它的自动化端口现在落在 **9430**，而不是工作流硬编码的 **9420**（`.dwf.ts:48 endpoint: "ws://127.0.0.1:9420"`）。

关于"9420 上曾有 6 条连接属于微信开发者工具自身而非 exec"：本轮复核已无法直接观测到那 6 条（端口清空）。当前可确认的是：**9420 上 exec 侧连接 0 条、工具侧连接 0 条 —— 归属问题已因通道整体迁移到 9430 而消失**。

### 1.5 下一轮能否直接接管

| 维度 | 判定 |
|---|---|
| 锁文件 | ✅ 可接管：僵尸租约（pid 40468 已死 + 心跳停 25min > staleAfterSeconds 30s） |
| 端口 9420 | ❌ **不可用**：无任何监听者，工作流默认 endpoint 指向一个空端口 |
| 端口 9430 | ⚠️ 这才是开发者工具当前实际监听的自动化端口 |

**判定**：锁不是问题，**endpoint 才是问题**。下一轮若照 v3.2 原文 `ws://127.0.0.1:9420` 起跑，A1 会在连接阶段直接失败（或更糟：抢锁成功后全程 0 证据）。必须先确认自动化工具实际服务端口并把 endpoint 改到 9430（或在工具侧把端口复位回 9420），再谈接管。

## 2. 开发者工具当前指向哪个产物目录

### 2.1 根 project.config.json（`D:\6\恋爱小程序\project.config.json`）
```
"compileType": "miniprogram",
"libVersion": "3.17.1",
"miniprogramRoot": "apps/client/dist/build/mp-weixin/",
"appid": "wxc67cd233d72388d0",
"sitemapLocation": "sitemap.json"
```
→ 以仓库根为项目根打开时，模拟器加载的是 **`apps/client/dist/build/mp-weixin/`，即 mock 产物**（工作流协议中该目录即 `WORKFLOW.build.sharedOutDir`，`.dwf.ts:548` 称"mock 产物"）。

### 2.2 project.private.config.json（同目录，857 B）
**不含 miniprogramRoot / 不含项目路径字段**，只覆盖 `setting.*`（urlCheck/es6/enhance/postcss/minified/compileHotReLoad:false 等），外加 `"libVersion": "3.7.12"`、`"condition": {}`。
→ 本地私有配置**不会**把工具改道到 real 产物；它也不覆盖 miniprogramRoot。注意 root 与 private 的 libVersion 不一致（3.17.1 vs 3.7.12），且 apps/client 那份是 3.7.12 —— 基础库版本对不上是 G3 视觉/行为漂移的潜在来源。

### 2.3 次级 project.config.json（`apps/client/project.config.json`，803 B）
仓库里**存在第二个项目定义**：
```
"miniprogramRoot": "dist/build/mp-weixin/",
"appid": "wxc67cd233d72388d0",  "projectname": "校园恋爱",  "libVersion": "3.7.12"
```
两份配置的 appid 相同、都指向 **mp-weixin（mock）**，没有一份指向 `mp-weixin-real`。
→ 无论工具是以仓库根还是以 `apps/client` 为项目根打开，**加载的都是 mock 产物**。`mp-weixin-real/` 存在（mtime 09-24 22:55）但**不在任何 project.config.json 的 miniprogramRoot 上**。

### 2.4 对 real 模式验收（G8/G9）的影响
- 工作流要求 G7 产物自证：读 `apps/client/dist/build/mp-weixin-real/config/env.js` 断言 `MODE="real"`（`.dwf.ts:547`，`realOutDir` 见 `.dwf.ts:32`）。**产物可以构建出来，但当前这个开发者工具会话看不到它** —— UI 上的 real 模式五环（G8）与素材可达性（G9）在默认 miniprogramRoot 下会把 mock 产物当 real 产物验收，属于"证据与被测物不一致"。
- 因此 real 验收要求**三选一**：① 改 root `project.config.json` 的 miniprogramRoot 指向 mp-weixin-real（会污染 mock 轮证据的复现基线）；② 以 `apps/client/dist/build/mp-weixin-real` 为新项目根单独开一次工具会话（当前工具会话是 14:51 起的，重开成本 = 一次 UI 会话）；③ 不动配置、G8/G9 直接记 BLOCKED。
- **同一工具会话内同时跑 mock（G1–G6）与 real（G7–G9）验收在现有配置下不成立**，因为 miniprogramRoot 只有一个值。
- 另注意 `.dwf.ts:548` 的既有坑：`apps/client/scripts/{prepare-static,prune-unreferenced-static,verify-build-features}.mjs` 与 `scripts/verify-package-size.mjs` **硬编码**共享 outDir，改道构建时 prune 脚本会往 mock 目录里删文件 —— 这是上一轮记录在案的隔离缺陷，起跑前应视为已知风险（本次未运行任何构建去验证它）。


## 3. 证据是否已过期（gitSha 陷阱）

### 3.1 工作流的 gitSha 绑定规定
`.dwf.ts:1308` 的 G6 门禁原文：**"G6 证据可信（同轮证据同 gitSha、链路 PASS、历史回归 0 复发）"**；`.dwf.ts:705` 在派活给 A1 时把 `当前 gitSha=${gitSha}` 写进指令；`.dwf.ts:548` 进一步警告"若 mock 轮证据仍在被消费，覆盖即造成**证据与被测物不一致**"。
→ 判定口径：**证据的 gitSha 必须等于当轮起跑时的 HEAD**，否则不满足 G6。

### 3.2 证据文件里记录的 gitSha（实测）

| 证据载体 | 路径 | 记录的 gitSha | 时间戳 |
|---|---|---|---|
| 用例结果（主证据） | `reports/audit/round-2/interact/exec-results.json` | **`18c91ccf`** | `updatedAt 2026-09-24T16:06:40.116Z`（= 本地 09-25 00:06:40，即被终止前 2 秒） |
| 截图清单 | `reports/audit/round-2/screenshot-manifest.json` | **`18c91ccf`** | `workflowVersion: "3.1"`、`buildMode: "build:mp-weixin:mock"` |
| 停止快照 | `.zcode/tmp/exec-stop-snapshot.json` | **`18c91ccf`** | `takenAt 2026-09-25T00:06:36+0800`，`cases=940`，`suites_recorded=21` |
| 轮 1 证据 | `reports/audit/round-1/findings/*.json`（27 处） | **`aefd8a72`**（更早，09-22 11:24） | — |

`exec-results.json` 结构：顶层 `{round:"R2", gitSha:"18c91ccf", updatedAt, results[]}`；`results` 长度 **941**，941 条全部**不携带** per-case gitSha（`<inherit>` 941/941），即整套语料只绑一个 SHA —— 一处过期，全体过期。

### 3.3 与 HEAD / 工作区脏度对照

- 证据 SHA：`18c91ccf`（`2026-09-24 10:28:49 +0800 fix(miniprogram): round-1 audit fixes`）
- 起跑 HEAD：**`874ff52f587c2f1cb180105a29dba090facf651d`**
  ⚠️ **调查期间 HEAD 发生过移动**：00:31:42 我读到的是 `cc540a6e`，`git reflog` 显示 `874ff52f` 提交于 `2026-09-25 00:31:39 +0800`（"round-2 audit fixes（R2 中断批次固化…）"）。即另有代理正在并发提交。
- `git merge-base --is-ancestor 18c91ccf HEAD` → rc=0（**证据 SHA 是 HEAD 的祖先，距离 2 个提交**：`874ff52f`、`cc540a6e`）
- `18c91ccf..HEAD` 变更面（`git diff --name-only`）：**81 个文件**，其中 `apps/client` **52**、`apps/client/src` **47**、`apps/admin` 5、`apps/api` 2。
- 工作区脏度：本次起跑前用户提示"apps/client/src 有大量未提交修改"—— 00:31:42 实测确为 `git status --porcelain -- apps/client/src` = **47**、全仓 **103**；到 00:41 复查已降为 src **0**、全仓 **33**（差异被 `874ff52f` 提交吸收）。
  → **结论：脏度是一个正在被并发写入的动态量，不能作为起跑前置事实；只有 HEAD 一致性与"提交后再不脏"才是。** `screenshot-manifest.json` 自身记录的 `gitWorktreeDirtyPaths = 35`，也印证采集当时工作区就是脏的。
- 被改动的共享模块 fan-in（`grep -rl` 于 `apps/client/src`）：`services/http.ts` → **24** 个源文件引用、`theme/design-variables.scss` → 9、`stores/messages.ts`/`config/images.ts` → 6、`components/common/Avatar.vue`/`stores/campus.ts`/`utils/media.ts`/`i18n/locales/zh-CN.ts` → 4~5，另有 `styles/tokens.scss`、`config/channels.ts`、`stores/village/mock-data.ts`、5 个 `static/assets/icons/common/*.svg` 被改。
  → 即便只看间接依赖，**没有任何一个套件的证据可以声称与被测物同源**。

### 3.4 不可复用证据的量化范围

先纠正一处口径：任务描述与停止快照都写 **940**，磁盘实测 `results` 长度为 **941**（差 1）。清单侧 `reports/audit/round-2/ops/*.json` 共 **24** 份 manifest、`cases[]` 合计 **1107**，与协议记录的"清单 1107 / 记录 940、差 167"一致（按实测 941 计则缺口 **166**）。

**（a）按 G6 严格判定：941/941 条 mock 用例证据全部不可复用，必须重采。**
理由链：① 证据 SHA `18c91ccf` ≠ 起跑 HEAD `874ff52f`；② 期间 47 个 `apps/client/src` 文件被改；③ 语料无 per-case SHA，无法只作废受影响子集；④ 清单还标注 `workflowVersion:"3.1"`，而下一轮按 v3.2 协议跑（`__CAND__` 隔离、队列对账、锁墓碑等新语义），跨版本证据本就不等价。

**（b）按"直接改动页面文件"分级的重采优先级**（把 `18c91ccf..HEAD` 的 12 个页面级改动映射回套件）：

| 重采优先级 | 套件（已记录例数） | 直接命中的改动文件 |
|---|---|---|
| **P-高：页面本体被改** | 次要21(102)、次要18(88)、PAGES-DISCOVER-INDEX(45)、PAGES-PROFILE-INDEX(45)、PAGES-NEARBY-INDEX(42)、CAMPUS-CAMPUS-POST-TOPIC(41)、CHAT-CHAT-SESSION-INDEX(34)、CAMPUS-CAMPUS-INDEX(30)、CIRCLES-CIRCLES-INDEX(25)、DISCOVER-EXTRA-MATCHING(24) | `pages/{discover,nearby,profile}/index.vue`、`subpackages/campus/campus/{post-topic,topic-detail}.vue`、`subpackages/chat/chat-session/index.vue`、`subpackages/circles/circles/index.vue`、`subpackages/discover-extra/discover/matching.vue`、`subpackages/{setup/schedule,support/feedback}/index.vue` 小计 **476 例** |
| **P-中：仅共享模块污染** | PAGES-HOME-INDEX(48)、PAGES-MESSAGES-INDEX(41)、PAGES-LOGIN-INDEX(38)、PAGES-REGISTER-INDEX(37)、CIRCLES-POST-TOPIC(40)、CAMPUS-HUB(27)、MATCH-SUCCESS(20)、REGISTER-SUCCESS(16)、次要20(101)、次要22(78)、次要19(19) | 无页面级命中，但经 `http.ts`/`Avatar.vue`/`tokens.scss`/`i18n`/`images.ts` 传导；小计 **465 例** |
| **零证据（本轮未跑，非"过期"而是"缺失"）** | SUBPACKAGES-VILLAGE-VILLAGE-**INDEX**(清单 42)、VILLAGE-**POST**(40)、VILLAGE-**PUBLISH**(34) —— 共 **116 例**；次要19 仅记录 19/69（缺 **50**） | `subpackages/village/village/{post,publish}.vue` 在 `18c91ccf..HEAD` **已被改**且完全无证据；`subpackages/tools/activities/detail.vue` 同 |

116 + 50 = **166**，与 1107 − 941 = 166 精确对上（`.dwf.ts:541` 队列对账断言所要求的即此等式）。

**（c）real 侧证据：不存在。** `REAL_DIR = reports/audit/real-e2e`（`.dwf.ts:1221`）目录 **`No such file or directory`**，G7/G8/G9 目前 **0 条证据**，属"从未采集"而非"过期"。同时 round-2 全部证据的 `buildMode = build:mp-weixin:mock / apiMode = mock`，与第 2 节"工具只挂了 mock 产物"互相印证。


## 4. 产物目录卫生（apps/client/dist/build/）

统计口径：`du -sh`（体积）+ `find -type f -printf '%T@'`（最新文件 mtime）+ `grep -rn "dist/build"`（脚本硬编码引用）+ `Grep` 全仓目录名引用（排除 `**/dist/**`）。整个 `dist/` 被 `.gitignore:10 dist/` 忽略 → **下列目录全部不在 git 视野内，删除不产生 diff，但也完全不可回滚**（本任务一律不删）。

| 目录 | 体积 | 文件数 | 最新 mtime | 被谁引用（实测） | 判定 |
|---|---|---|---|---|---|
| `mp-weixin/` | 33M | 2152 | **2026-09-25 00:08** | 根 `project.config.json` miniprogramRoot、`apps/client/project.config.json`；硬编码于 `apps/client/scripts/prepare-static.mjs:154`、`prune-unreferenced-static.mjs:26`、`verify-build-features.mjs:19`、`scripts/{verify-build,verify-package-size,find-svg-refs,find-svg-detail}.mjs`；= `WORKFLOW.build.sharedOutDir` | **仍被引用（当前 mock 被测物，绝不可动）** |
| `mp-weixin-real/` | 33M | 2151 | 2026-09-24 22:55 | `apps/client/scripts/build-real-isolated.mjs:38`（默认 outDir）、`.dwf.ts:32 realOutDir`（G7 断言目标） | **仍被引用（real 验收唯一产物，必须保留）** |
| `h5/` | 24M | 1008 | 2026-08-20 06:57 | 无文本引用；但 `apps/client/package.json:21 build:h5` 的默认输出目录就是 `dist/build/h5`，属可再生成目标 | 可安全删除（**会自动重建**；5 周未更新，无人在用） |
| `mp-weixin-qa/` | 35M | 2084 | 2026-08-26 01:49 | 仅 `reports/audit/round-1/{page-compare/次要25.md,findings/次要25-req.json}` 的**取证叙述**提及；无脚本/配置引用 | 可安全删除（唯一残留价值：round-1 次要25 那条"三份 app.json 对账"结论的复现素材） |
| `mp-weixin-dev-4/` | 35M | 2074 | 2026-08-25 20:39 | 同上，仅 round-1 次要25 报告文本提及 | 可安全删除 |
| `mp-weixin-dev-backup/` | 35M | 2074 | 2026-08-25 20:26 | **零引用**（配置/脚本/报告均无命中） | 可安全删除 |
| `mp-weixin-old-161524/` | 25M | 1968 | 2026-08-25 16:12 | **零引用** | 可安全删除 |
| `mp-weixin-broken-qa4/` | 26M | 2056 | 2026-08-25 19:04 | **零引用** | 可安全删除 |
| `mp-weixin-r5-old/` | 34M | 2028 | 2026-08-25 20:39 | **零引用** | 可安全删除 |
| `mp-weixin-r5b-old/` | 35M | 2084 | 2026-08-25 21:24 | **零引用** | 可安全删除 |
| `mp-weixin-r5d-old/` | 32M | 2084 | 2026-08-25 23:10 | **零引用** | 可安全删除 |
| `mp-weixin-r5e-old/` | 35M | 2084 | 2026-08-25 23:11 | **零引用** | 可安全删除 |
| `mp-weixin-r5f-old/` | **32K** | **136** | 2026-08-25 23:44 | **零引用** | 可安全删除（且是残缺产物：136 文件 / 32K，明显构建中断，无参考价值） |

汇总：**13 个目录 ≈ 387M**；其中 `mp-weixin` + `mp-weixin-real` 共 66M 为活跃被测物，其余 **11 个目录 ≈ 321M（约 83%）为 08-25/08-26 的历史快照**，与本轮（09-24）证据无任何耦合。

> 为什么这仍然是一条"建议级"而非"可忽略"事项：`.dwf.ts:548` 明确 real 改道构建时，四个硬编码 `dist/build/mp-weixin` 的脚本会被打到共享目录，且 `prune-unreferenced-static.mjs:26` **会删文件**。目录越多、名字越像，A1 越容易把 `mp-weixin-qa`/`mp-weixin-dev-4` 误当被测物；本轮又新添了 `mp-weixin-real` 这个合法同前缀目录，混淆面已经扩大。

### 4.4 根目录垃圾文件 `0` 与 `nul`

| 文件 | 大小 | mtime | 实测内容 | 来源判定 |
|---|---|---|---|---|
| `0` | 14 B | 2026-09-24 01:05 | `od -c`: `377 376 2 \0 0 \0 5 \0 2 \0 \r \0 \n \0` → **UTF-16LE BOM + `2052\r\n`**（`iconv -f UTF-16LE` 解出 `2052`） | `2052 = 0x0804 = zh-CN 的 LCID`，即某次 locale 探测的输出；UTF-16LE + CRLF 的编码形态是 **Windows PowerShell 5.1 `>` 重定向的特征**，重定向目标 token 塌成了 `0`（典型如误写 `... > 0` / `2>&1` 被 PS 解析）。 |
| `nul` | 51 B | 2026-09-24 12:16 | `dir: cannot access '/b': No such file or directory` | **Git Bash 里跑 Windows 式命令**：`dir /b ... > nul`。bash 的 coreutils `dir` 不认 `/b` 开关、把它当路径，于是打出该错误；而 `> nul` 在 POSIX 下不是丢弃流，**真建了一个名叫 `nul` 的文件**（Windows 保留名，后续任何工具想用 `nul` 丢弃输出都会踩坑）。 |

**差异化处置结论（不执行）**：
- `nul` 已被 `.gitignore:114 nul` 覆盖 → 未进版本库，危害限于本地。
- `0` **未被 .gitignore 覆盖且已被 git 跟踪**（`git ls-files -- "0"` 返回 `0`），并在调查期间被 **`874ff52f`（09-25 00:31:39）提交进历史**（`git log --oneline -- 0` 命中；`git diff --name-only 18c91ccf HEAD` 的输出里它就占了一行）。
  → 直接后果：任何用 `git diff --name-only` 计算"改动面/失效证据范围"的代理都会拿到一条假文件 `0`，污染变更判定。这一条比"磁盘上多个垃圾文件"更值得处理。


## 5. 截图证据语料卫生

### 5.1 方法与统计口径（**全量脚本化，零抽样**）
语料规模实测：`reports/screenshots/` **6150** 张 + `截图存档/` **986** 张 = **7136** 张（`Path.rglob` 计数；`find | wc -l` 交叉核对 7136）。
四个统计脚本全部 **100% 覆盖 7136 张，hash 错误 0**（`IMAGES=7136 ... hash_err=0`），**没有任何一步是"看单帧"或抽样推断**：

1. **重复帧** = 全量 `md5` 分组（逐字节读取全部 7136 个文件），非尺寸近似。
2. **空白帧** = 全量 PIL 解码 → 48×48 缩略 → `getcolors()` 色数普查，两档阈值（≤3 色 / 4–8 色）。
3. **孤立帧** = 从 5 份 manifest（`reports/audit/round-{1,2}/screenshot-manifest.json`、`reports/screenshots/round-1/manifest.json`、`round-{1,2}-tour/manifest-detail.json`）**加** 2 份 `exec-results.json` 的 `results[].evidence[]` 展开全部引用路径，与磁盘做集合差。
4. **反向孤立**（清单说有、磁盘上没有）单独统计。

口径局限（必须承认）：色数普查能抓"纯空白/纯色"，**抓不到骨架屏与加载占位**（它们本身 >8 色）；带渐变壁纸的空白页也会漏。同页不同状态的"语义重复"未纳入，本节只报逐字节完全相同者。

### 5.2 量化结论

| 症状 | 数量 | 判定依据 |
|---|---|---|
| **重复帧（逐字节相同）** | **1282 张冗余**（892 个重复组；7136 → 唯一 md5 5854），占语料 **18.0%** | 全量 md5 分组 |
| ├ 同目录内冗余（纯浪费） | 1220 | 组内 `dirname` 计数 |
| └ 跨目录冗余 | 62 | 同上 |
| 最大重复组 | **17 份完全相同**：`reports/screenshots/round-1-interact/`；次高 14 份 `截图存档/2026-08-08-2/admin/` | md5 组大小排序 |
| **空白/单色帧** | **5 张**（≤3 色），另 1 张落在 4–8 色带 | 48×48 缩略色数普查 |
| ├ 真空白（判定为缺陷帧） | **3 张**，全在 `reports/screenshots/r11-acceptance/`：`B-b0918-1725-subpackages_tools_{heart-signals_index, love-center_consulting, love-center_index}.b.png`，色数 = 1 | 单色 = 未渲染 |
| └ 可解释 | 2 张在 `round-2-tour/A/subpackages_chat_chat-session_*__zoom3x-放大窗.png`（3× 裁切放大，3 色属正常），**不计为污染** | 文件名含 zoom3x |
| **孤立帧（无任何 manifest/证据引用）** | `reports/screenshots/` **4303 / 6150 = 70.0%**；`截图存档/` **986 / 986 = 100%**（该树根本没有清单，属人工存档） | 集合差 |
| ├ 最大孤立池 | `round-1-interact` **2397** 孤立（磁盘 3043，仅 646 被 round-1 exec-results 引到） | 同上 |
| ├ | `r11-acceptance` **920**（该轮无清单）、`round-2-tour` **345**（磁盘 599 vs 清单 254）、`round-1-after` 116、`r10-audit` 81、`round3` 79 | 同上 |
| └ **本轮干净项** | `round-2-interact` 磁盘 498 张，**498 全部被 exec-results 引用，孤立 0** | 同上 |
| **反向孤立：证据指向不存在的文件** | **434 / 932** 个 distinct round-2 证据路径**磁盘上不存在** | `os.path.isfile` 逐个验证 |
| **证据本身带 ERROR 标记** | **437 / 935 条（46.7%）** 证据串写着 `ERROR:timeout waiting for automator response`；波及 **373 / 941 个用例（39.6%）** | 字符串匹配 |
| **0 图证的用例** | **288 / 941（30.6%）** | evidence 数组无 png |
| 判定词表异常 | status 只有 `EXECUTED 523 / FAILED 289 / SKIPPED 129` —— **没有一条 PASS**，G4"判定通过率"无法直接算出，须回读 `observed` 文本 | `Counter(status)` |
| 证据路径卫生 | **935 / 935 = 100% 绝对 Windows 路径**（`D:\6\恋爱小程序\...`），与仓库自身"全仓绝对路径清零"策略（提交 `aefd8a72` 的标题原文）直接冲突；换机/换目录即全部失效 | 正则计数 |
| 视口 | 全语料 79 种尺寸；round-2 两目录仅 3 种：`378×814` 752 张、`1134×732` 230 张、`1134×339` 115 张（后两者是裁切/放大帧，不是新视口） | PNG IHDR 头解析 |
| 清单侧元数据（一并核对） | `round-2/screenshot-manifest.json`：`gitSha=18c91ccf`、`workflowVersion="3.1"`、`buildMode=build:mp-weixin:mock`、`shots=254`、`stateNotAppliedCount=37`、`routeDriftCount=13`、`gateBypassedShots=16`、`gitWorktreeDirtyPaths=35` | 直接读 JSON |

### 5.3 判定
本轮（R2）截图语料在"孤立帧"这一维是干净的（`round-2-interact` 0 孤立），真正的污染集中在 **R2 之前**：1282 张逐字节重复 + 4303 张无清单引用。
但 R2 自身有一个**比脏帧更致命的问题**：**近一半图像证据是"截图动作本身超时"的 ERROR 串，434 个证据路径指向不存在的文件**。这说明 automator 通道在 R2 期间已经不稳定（与第 1 节 9420 通道最终彻底消失形成连续证据链）—— 即"通道劣化 → 采集失败被记成证据 → 用例仍被计入 940"。下一轮若不先修 endpoint，只会重演。

## 6. 下一轮开跑前必须先处理的事项（优先级表）

| # | 级别 | 事项 | 依据（命令/路径） | 不处理的后果 |
|---|---|---|---|---|
| 1 | **阻塞级** | **endpoint 复位**：9420 无任何监听者，开发者工具实际监听 `127.0.0.1:9430`（pid 32580）。要么在工作流里把 endpoint 改到 9430，要么在工具侧把自动化端口复位回 9420 | `netstat -ano \| grep -c 9420` → 0；`Get-NetTCPConnection -LocalPort 9430` → pid 32580 = `D:\微信开发者\微信web开发者工具\微信开发者工具.exe`；`.dwf.ts:48` | A1 连不上通道，整轮 0 UI 证据；且会重演"ERROR 串被当证据" |
| 2 | **阻塞级** | **僵尸锁接管并落 tombstone**：`tmp/qa/locks/wechat-automation-9420.lock` 仍谎报 `status:LEASED`，owner pid 40468 已死（心跳停 25min > `staleAfterSeconds:30`）。按 v3.2 `[C-4]` 语义改写/释放，禁止留 LEASED 原文进轮 | 锁文件原文；`Get-Process -Id 40468` → NOT RUNNING；`.dwf.ts:518/523` | 后续执行器 `LOCK_BUSY` 空等一个 15min 租期（协议里已记过这个实测教训） |
| 3 | **阻塞级** | **证据基线重采**：941 条 mock 用例证据绑 `18c91ccf`，起跑 HEAD 已是 `874ff52f`，期间 47 个 `apps/client/src` 文件被改 → G6"同轮证据同 gitSha"不成立 | `exec-results.json: gitSha`；`git rev-parse HEAD`；`git diff --name-only 18c91ccf HEAD -- apps/client/src \| wc -l` = 47 | 直接违反 G6，整轮验收无效 |
| 4 | **阻塞级** | **队列缺口补齐**：清单 1107 / 记录 941，缺 **166**：村口三套 VILLAGE-INDEX(42)/POST(40)/PUBLISH(34) = 116 例**从未跑**，次要19 仅 19/69（缺 50）。且 `subpackages/village/village/{post,publish}.vue` 在 `18c91ccf..HEAD` **已被改动**，属"改过且零证据"最高危区 | `reports/audit/round-2/ops/*.json` 求和 = 1107（24 份）；`exec-stop-snapshot.json cases=940`；`.dwf.ts:541` 队列对账断言 | 协议明文：不等即为 BLOCKER |
| 5 | **阻塞级** | **real 侧从零开始 + 改道**：`reports/audit/real-e2e/` 不存在 → G7/G8/G9 **0 证据**；两份 project.config.json 的 miniprogramRoot 都指向 **mock** `mp-weixin/`，无一指向 `mp-weixin-real/` | `ls reports/audit/real-e2e` → No such file；`project.config.json` / `apps/client/project.config.json` | real 验收只能记 BLOCKED；若强行改 miniprogramRoot 会毁掉 mock 复现基线 |
| 6 | 建议级 | **并发提交与脏度竞态**：调查期间 HEAD 由 `cc540a6e` 漂到 `874ff52f`（00:31:39），全仓脏文件 103 → 33，`apps/client/src` 47 → 0；起跑前必须约定"无其他代理提交"的静默窗口并重新取 SHA | `git reflog -6`；两次 `git status --porcelain \| wc -l` | 起跑 SHA 与实际被测物不一致，第 3 项判定失效 |
| 7 | 建议级 | **产物目录清理（勿在本轮做）**：11 个历史快照目录 ≈ **321M / 占 83%** 可安全删除（零配置零脚本引用，仅 round-1 报告文本提及 `mp-weixin-qa`/`-dev-4`）；`mp-weixin`(33M)、`mp-weixin-real`(33M) **仍被引用不可动**；`h5`(24M) 可再生 | `du -sh` + `grep -rn "dist/build" scripts apps/client/scripts`；全部受 `.gitignore:10 dist/` 保护 | 同前缀目录越多，A1 越容易把旧快照当被测物；且 `prune-unreferenced-static.mjs` 会往 `mp-weixin/static` 删文件 |
| 8 | 建议级 | **垃圾文件 `0` 已进版本库**：`0`（UTF-16LE `"2052"` = zh-CN LCID，PowerShell 重定向误建）**未被 gitignore 且已被 `874ff52f` 提交**，会作为伪变更文件混入 `git diff --name-only`；`nul`（内容为 bash `dir: cannot access '/b'` 报错，源自 Git Bash 里跑 `dir /b … > nul`）已被 `.gitignore:114` 覆盖。两者本轮均**未删除** | `od -c 0`、`git ls-files -- 0`、`git log --oneline -- 0`、`git check-ignore -v nul` | 改动面统计被污染，第 3 节口径被干扰 |
| 9 | 建议级 | **证据可移植性**：R2 的 935 条图像证据 100% 为绝对 Windows 路径，且 437 条是 `ERROR:timeout` 串（434 个路径指向不存在文件）。建议改相对路径 + 禁止把"截图失败"计入用例完成度 | `exec-results.json` evidence 正则计数 | 换目录即全断链；通道故障被静默吞掉 |
| 10 | 建议级 | **语料瘦身**：重复帧 1282（18.0%）、孤立帧 4303（70.0% of reports/screenshots）、真空白 3 张（`r11-acceptance`）；round-2 之前的轮次建议按清单归档而非留在原位 | 第 5 节四个全量脚本 | 检索噪声 + 复现时取错帧 |
| 11 | 建议级 | **判定词表**：941 条 status 仅 EXECUTED/FAILED/SKIPPED，**无 PASS**，G4 通过率不可直接计算；须规定 verdict 枚举 | `Counter(status)` | G4 门禁无法自动判定 |
| 12 | 建议级 | **基础库版本三处不一**：根 `project.config.json` 3.17.1 / `project.private.config.json` 3.7.12 / `apps/client/project.config.json` 3.7.12 | 三份 JSON 直读 | G3 视觉漂移无法归因 |

