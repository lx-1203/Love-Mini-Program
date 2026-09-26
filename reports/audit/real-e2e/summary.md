# 真实模式三道 Gate 实测证据集（G7 / G8 / G9）

- 取证时间：2026-09-25 15:43 +08:00
- 提交戳：**`874ff52f`** —— 权威值以运行时派生的 [`provenance.json`](./provenance.json) 为准（`git rev-parse --short HEAD` 于 `emit-provenance.cjs` 内现取，本文所写为其副本）。仓库 D1 硬规矩：写死 SHA 会让整批证据过期作废。
- 证据文件：`provenance.json` · `g7-verify.txt` · `g8-rings.txt` · `g9-assets.txt` · `GATES.json`
- 取证路径：**纯 HTTP + 只读 SQL**。未启动微信开发者工具、未占用 9420/9430/94xx 自动化端口（UI 会话由另一代理独占）。

## 一、三道 Gate 结论

| Gate | 工具 | 结论 | 退出码 | 关键自证 |
|---|---|---|---|---|
| 前置：后端确实重启过 | `scripts/qa/verify-backend-restarted.mjs` | **PASS** | 0 | JVM pid 11800 起于 2026-09-25 11:37:11，晚于最新 java 源码与 HEAD 提交 |
| G7 产物自证 | `apps/client/scripts/build-real-isolated.mjs --check-only` | **PASS** | 0 | `MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api`，`sharedOutUntouched=yes` |
| G8 前后端数据同步六环 | `scripts/qa/g8-e2e.cjs` | **PASS** | 0 | `G8_RINGS_OK=6/6` |
| G9 素材可达性 | `.zcode/tmp/g9-probe.cjs` | **PASS** | 0 | `G9_PROBED=455 G9_OK=455 G9_FAIL=0` |

三道 Gate 全部实测通过，**无任一环失败**，因此本目录不存在 BLOCKED 记录。

### G8 六环逐环

| 环 | 名称 | 状态 | 实测证据 |
|---|---|---|---|
| 1 | 客户端身份（体验账号） | OK | `POST /auth/guest-login` → 200，取到 JWT |
| 2 | 客户端写库 | OK | `POST /posts` → HTTP 200，返回 id=**236** |
| 3 | 后台按 id 读到该帖 | OK | `GET /admin/forum/village-posts/236` → 200；`title` 字段可见（值 `G8取证2609250743号`），证实管理端为**扁平返回体** |
| 4 | 审核驱动前端可见性 | OK | 审核前 total=185 / audit 200 / 审核后 total=186，**以 total 增量为判据**成立 |
| 5 | 同 Idempotency-Key 重放 | OK | 重放 → **HTTP 409**，重放后 total 仍 186，未新增行 |
| 6 | 计数客户端↔后台一致 | OK | 评论 200 / 点赞 200；客户端 comment=1、like=1 |

### G9 对照表四格

`在盘且200=455` · `在盘但失败=0` · `不在盘但200=0` · `不在盘且失败=0`

`G9_EXTRACTED=455`（IMAGE_PATHS 块 61376 字节 / 字面量 458 条 / 模板拼接 0 条）。四格全落在"在盘且 200"，即**无缺文件、无注册漏项、无中文名编码问题**。

## 二、本轮因 G8 新增的库内主键清单

写入**全部经后端 HTTP 接口**产生，未直接写库；下表主键为生成 `GATES.json` 时**重新 SELECT 数据库**派生（非抄 G8 stdout），与接口返回值相符才闭环。**数据一律保留未删除**（本仓既有决定：遗留测试数据保留并写进终报）。

| 表 | 主键 | 归属/内容 | 落库时间 |
|---|---|---|---|
| `posts` | **id = 236** | `G8取证2609250743号`，`audit_status=approved`，`status=active`，`author_id=100151` | 2026-09-25 15:43:45 |
| `comments` | **id = 1205** | `post_id=236`，内容 `G8 取证评论 2609250743` | 2026-09-25 15:43:46 |
| `post_likes` | **id = 69** | 点赞落在 **`posts.id=236`**，`user_id=100151` | 2026-09-25 15:43:46 |

- 身份账号：`users.id=100151`，昵称「阿辰」（guest 体验账号，`phone` 为 NULL）。该 guest 账号本轮**未新建**，由 `/auth/guest-login` 复用既有试用账号。
- 幂等复核：`SELECT COUNT(*) FROM posts WHERE title='G8取证2609250743号'` = **1** → Ring 5 的 409 确实拦住了重复写入。
- **本轮实际写入量（1 帖 + 1 评论 + 1 赞）少于任务预估的"2–4 条 posts"**：原因是 Ring 5 的同 `Idempotency-Key` 重放被后端正确以 409 拒绝，没有产生第二条帖。属幂等生效的结果，**不是漏跑**。
- 库内总量（写后）：`posts=190`、`comments=1114`、`post_likes=52`。

### Ring 6 残留缺口的归因（重要，别记错性质）

G8 工具原文自己标注：管理端返回体字段集为
`id,authorId,authorNickname,authorAvatar,title,content,images,tags,category,status,auditStatus,visibility,circleId,auditRemark`
——**不含任何计数字段**。本轮以 DB 读回补齐：`posts.id=236` 上 `comments` 实存 1 条、`post_likes` 实存 1 条，与客户端 `GET /posts/236` 的 `comment=1 / like=1` **数值相符**。

所以这不是"前后端计数不一致"，而是**后台视图层的字段对账缺口**（管理端接口未暴露 count 列）。请勿据此记产品数值缺陷。

## 三、两条已知未取证项（记 NOT-EVIDENCED，不记失败）

1. **`wx.login` 真机身份链路 = NOT-EVIDENCED**
   本机无小程序 secret，`wx.login` 必 502。这是环境约束不是产品缺陷。身份一环已由 `POST /auth/guest-login` 取得 JWT 作为替代证据（Ring 1 OK）。
2. **real 产物下的 UI 截图 = NOT-EVIDENCED**
   本轮 G8 只走 HTTP + DB 读回，未启动微信开发者工具、未占用 94xx 自动化端口（UI 会话被另一轮独占）。
   ⇒ **G7 的 PASS 只证明 real 构建产物的模式自证正确（API 基址/mode 写对、未污染 mock 共享产物），不证明它在模拟器或真机上的渲染表现。** 这两者不可互相冒充。

## 四、前置探测复跑原文

### 4.1 `node scripts/qa/verify-backend-restarted.mjs`（node22）

```text
RESTARTED_PID=11800 startedAt="2026-09-25 11:37:11"
RESTARTED_NEWEST_SOURCE=D:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java mtime=2026-09-24T17:40:55.722Z
RESTARTED_HEAD_COMMIT_TIME=2026-09-24T16:31:39.000Z
RESTARTED_STALE_SOURCE=none  HEAD_NEWER_THAN_JVM=no
RESTARTED_RESULT=PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提
```

退出码：`VERIFY_RESTARTED_EXIT=0`

### 4.2 `node scripts/probe-real-env.mjs`（node22）

```text
PROBE_BACKEND=UP http=200
PROBE_ASSET OK  /api/v1/media/app-assets/assets/default-avatar.jpg status=200 len=24379
PROBE_ASSET OK  /api/v1/media/app-assets/assets/icons/heart.svg status=200 len=322
PROBE_ASSET OK  /api/v1/media/app-assets/assets/images/activities/activity-1.jpg status=200 len=130682
PROBE_ASSET OK  /api/v1/media/app-assets/assets/images/avatars/person-01-avatar.png status=200 len=45345
PROBE_ASSET OK  /api/v1/media/app-assets/assets/images/mascot/head_happy.png status=200 len=8400
PROBE_ASSET OK  /api/v1/media/app-assets/assets/images/messages-split/消息_r06_c02.png status=200 len=9221
PROBE_ASSET OK  /api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c03.png status=200 len=5945
PROBE_ASSET OK  /api/v1/media/app-assets/assets/profile/svg/microphone.svg status=200 len=287
PROBE_ASSETS_ON_DISK=1440 PROBE_ASSETS_REACHABLE=8/8
PROBE_GUEST_LOGIN=需启动方式确认：real profile 默认 false→403；须确认后端以 APP_GUEST_LOGIN_ENABLED=true 启动（.env:17 / scripts/launcher/scripts-start-backend.cmd:31）
PROBE_VERDICT=READY
```

退出码：`PROBE_REAL_ENV_EXIT=0`

两点值得记录的读数：
- `消息_r06_c02.png` 这类**中文名素材已 200 可达**。该探测脚本头部注释记载的旧成因 (A)（`MediaAccessController` 用未解码的 `getRequestURI()` 当注册表键 → 中文路径必 404）已在源码侧修为 `UriUtils.decode`，且 JVM(11:37) 晚于 `MediaAccessController.java`(9-24 17:40) 的改动 ⇒ **修复已随本轮活体生效**，与 G9 的 455/455 互相印证。
- `PROBE_ASSETS_ON_DISK=1440` 与 `G9_EXTRACTED=455` **口径不同、不可互换**：前者是 uploads 目录全量文件数（抽样 8 个），后者是 `images.ts` 的 `IMAGE_PATHS` 实际引用集全量探测。

## 五、口径与踩坑声明

- **`GET /actuator/health` 免鉴权，200 只证明进程活着，不证明数据可读。** 本轮的联通证据是 G8 六环的真实 HTTP 往返 + DB 读回，**不是** health 码。
- 凭据（MySQL、管理员口令）全程运行时从 `apps/api/restart-backend.ps1` 解析，MySQL 经 `MYSQL_PWD` 环境变量传入，**未内联进命令行**。
- 全部脚本以 node22（`D:/codex-tools/node-v22.17.0-win-x64/node.exe`，v22.17.0）执行。PATH 上的 node 是 v16.13.1：`build-real-isolated.mjs` 在 v16 上会自报 `G7_RESULT=FAIL`，那是测试台环境噪声，据此记 G7 失败即为假 FAIL。
- Ring 4 的"审核后在列表=false"**不是缺陷**：首页只取 50 条且按热度/时间排序，"这一条是否出现在第 1 页"不可靠，故判据取 total 增量。
- 生成器自查记录（一次真实的自伤，已修）：`emit-gates.cjs` 首版用未锚定的 `/G7_RESULT=\w+/` 解析 `g7-verify.txt`，先撞上了我为说明 v16 噪声而写在表头的 `G7_RESULT=FAIL` 字样，把 G7 读成 FAIL。现改为解析前剥除 `#` 注释行 + 行首锚定。**同类"注释文本污染机器计数"的坑，`g9-probe.cjs` 里已记过两次。**

## 六、机检门禁复跑结果（含必须澄清的 FAIL）

### 6.1 可复核性自证

- `provenance.json.gitSha` == 复跑时 `git rev-parse --short HEAD` == **`874ff52f`**，且值为运行时派生（`emit-provenance.cjs` 内 `execSync("git rev-parse --short HEAD")`，文件无字面量 SHA）。派生失败即整个目录不出，符合 D1。
- `GATES.json` 的六环文本、G9 对照表四格、库内主键**全部由解析/查库得到**：重跑 `node .zcode/tmp/emit-gates.cjs` 可从 `g7-verify.txt`/`g8-rings.txt`/`g9-assets.txt` + MySQL 复现同一份 JSON，无人工誊写第二份真相。

### 6.2 `verify-evidence-corpus.mjs --scope reports/audit/real-e2e` → `CORPUS_RESULT=FAIL`

```text
CORPUS_MANIFESTS=0 CORPUS_MANIFESTS_TOTAL=6 SCOPE=reports/audit/real-e2e HEAD=874ff52f
CORPUS_RESULT=FAIL reason=reports/ 下一份 manifest 都没扫到，空过没有意义
```

**这是本目录的预期状态，不是本轮证据有问题。** 该门禁只校验带 `shots/frames` 的截图清单，而本轮 UI 截图为 NOT-EVIDENCED（见第三节），目录内**没有也不该有**帧清单。
⇒ 若为了让这条门禁变绿而补一份空 manifest，就是"用假证据喂门禁"，与该工具"空扫描集不得判绿"的设计正面冲突。**已明确拒绝此做法。** 该门禁对本轮的复合作用应待 UI 轮补上截图 manifest 后再评估。

### 6.3 全域 `verify-evidence-corpus.mjs` / `verify-provenance-all.mjs` → FAIL，**与本轮无关**

两者全域跑均为 FAIL，根因全部指向本轮之前既有的历史产物：

- `reports/screenshots/round-1-tour/manifest-detail.json` 305 帧 `gitSha=aefd8a72` → 非当前 HEAD，按契约过期；
- `reports/screenshots/round-2-tour/manifest-detail.json` 254 帧 `gitSha=18c91ccf` → 同上过期；
- `PROV_PRODUCER_LITERAL` 命中 `tmp/gen-judge.js`、`tmp/rebuild-R1-manifest.mjs`、`tmp/rebuild-R2-manifest.mjs` 内字面量 `aefd8a72`——三个文件 mtime 为 9-23 20:56 / 9-23 03:08 / 9-24 11:41，**均早于本轮取证起点（9-25 15:43）**；
- `reports/audit/round-6/screenshot-manifest.json`（另一 UI 轮次产物，非本轮）。

`verify-provenance-all.mjs` 输出的 6 份 `PROV_MANIFEST` 中**无任何一条位于 `reports/audit/real-e2e/`**；本轮新增的两个生成器位于 `.zcode/tmp/`，不在其 `PRODUCER_DIRS`（`scripts|tmp|tools|apps/*/scripts`）扫描范围内，故既未被计入 FAIL，也未污染上述历史命中。

> 记录这一节的意义：全域门禁红是历史欠账，**不能被读成"本轮 G7/G8/G9 结论不可信"**；反过来，本轮也不替历史欠账背书或销账。

## 七、本轮边界（未做的事）

未重启 8080；未改 `apps/api/**` 与任何 Java 源码；未跑构建；未改 `.zcode/workflows/**`、`scripts/**`、`apps/client/scripts/**` 内既有工具（仅调用）；未执行任何 git 写操作（`rev-parse`/`log`/`status` 均只读）；未删除 G8 写入的任何数据。

新增文件仅为：`reports/audit/real-e2e/` 下 5 份证据，及两个本轮取证用的生成器 `.zcode/tmp/emit-provenance.cjs`、`.zcode/tmp/emit-gates.cjs`（均不含字面量 SHA，位于机检生产者扫描目录 `scripts|tmp|tools|apps/*/scripts` 之外）。
