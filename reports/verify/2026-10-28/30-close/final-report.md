# 真实小程序 + 管理后台验收报告（2026-10-28）

> 口径：本轮只覆盖**真实小程序（mp-weixin real + 微信开发者工具模拟器）**与**管理后台（real API + Admin 控制台）**。H5、mock 演示、Compose 部署、OpenAPI 文档不在本轮。
> 证据根：`reports/verify/2026-10-28/`。

## 0. 结论摘要

- **真实小程序构建**：修复了 10-28 提交引入的 SCSS 括号回归后，`RELEASECHAIN_RESULT=PASS steps=15`；主包 1.63MB / 总包 2.72MB；`shippable=no`（loopback 豁免，缺真实 HTTPS 域名/AppID）。
- **管理后台**：按迁移注释认可的 `scripts/dev/reset-local-admin.mjs` 用**新强口令**复通本地超管；超管/校区管理员/审核员三账号登录均 200；浏览器门、角色门、写路径门、数据域门全 PASS。
- **跨端五环**：小程序游客发帖 429 → 后台按 id 读到 → 审核 approved → C 端 feed 194→195 且含该 id → 同幂等键重放 409；PASS。
- **小程序主链**：6/7 链 PASS（发现筛选+like、首页 like、发布 pending、消息发送、设置开关、圈子加入/退出，console 全 0）；4 入口链 2 点击 OK（nearby/tag-posts）+ 2 组件边界 NOT-EVIDENCED（profile/village）。
- **发现并修复 HEAD 上的真实构建阻断**：`030def02` 的「自指包裹收口」在多处多留了 `)`，`src/App.vue` 与 10 个组件样式块 SCSS 语法错；静态门（typecheck/单测/令牌门）不编译 SCSS，未能发现。本轮恢复 41 行原始 `var(--x, var(--x, …))` 合法写法 + 修 App.vue 1 行，兜底字面量棘轮仍 0。
- **未声称**：真机、提审/发布、H5、mock、Compose、产品裁定项。

## 1. 环境与回滚点

| 项 | 值 |
|---|---|
| HEAD | `ecb618a5`（main） |
| 真实后端 | `java -jar apps/api/target/campus-love-api-0.1.0.jar --spring.profiles.active=real --server.port=8080 --spring.flyway.validate-on-migrate=false --app.guest-login.enabled=true` |
| DB | MySQL 3306 `campus_love`；验收前备份 `database/backup/pre-admin-reset-20261028.sql`（3,483,991B，含 users 表与 admin 行） |
| 数据 | 368 用户（139 USER + 223 GUEST + 4 ADMIN + 1 AUDITOR）；活跃帖子 196、hidden 6、deleted 1（验收后口径见 §6） |
| 小程序产物 | `apps/client/dist/build/mp-weixin-real`；band `real@f0677920`；CDN 294 条；`LOOPBACK_WAIVER.json` `shippable=no` |
| 回滚点 | 旧 `mp-weixin-real` 备份 `apps/client/archive/mp-weixin-real-20261027`；后台旧截图 `reports/audit/mp-fidelity-2026-10-18/admin-browser-shots.bak-20261027` |

## 2. 本轮改动

1. **小程序 4 个发帖入口统一到 publish**：`pages/nearby/index.vue`、`pages/profile/index.vue`、`subpackages/village/village/index.vue`、`subpackages/village/village/tag-posts.vue` 的 `ROUTES.VILLAGE.POST` → `ROUTES.VILLAGE.PUBLISH`（旧页与常量保留兼容）。
2. **修复 030def02 的 SCSS 括号回归**：10 个组件的 41 行恢复为原始三层 `var(--x, var(--x, …))` 写法；`App.vue` 的 `linear-gradient` 行修掉多出的 `)`。恢复后 `FALLBACKLIT_RATCHET=OK 基线=0 当前=0 新增=0`。
3. 未改产品裁定项；未改后端代码；未提交 `.env`、dist、DB 备份、截图。

## 3. 管理后台验收

### 3.1 超管复通（本地、按迁移认可路径）
- 迁移 `V2026.10.26.0001__disable_public_test_admin.sql` 明确本地复通路径是 `scripts/dev/reset-local-admin.mjs`，写**仓库里不存在**的新强口令。
- 本轮生成新强口令（25 位，含大小写/数字/特殊字符，只写本地 `.env`，不打印、不入库），DB 先备份，再 `--apply`；结果 `RESET_LOCAL_ADMIN=OK openid=local-dev-admin-openid-123456`，`status=active`。
- 未恢复 `Admin@12345` 或任何仓库内出现过的口令；生产仍必须使用独立强口令。

### 3.2 登录矩阵
| 账号 | 角色 | 结果 |
|---|---|---|
| `local-dev-admin-openid-123456` + 新口令 | SUPER_ADMIN | 200 |
| `phone:13711110004` + `Campus@12345` | ADMIN（北大） | 200 |
| `phone:13711110005` + `Auditor@12345` | AUDITOR（北大） | 200 |

### 3.3 门禁结果
| 门 | 结果 | 证据 |
|---|---|---|
| ADMINBROWSER（登录/用户列表/媒体真图/计数/置顶往返） | PASS：媒体 20/20 真解码、裂图 0；计数 201=201=201；帖子 #408 置顶→取消→还原 | `10-admin/admin-browser-verify.log` |
| ADMAUD（超管/AUDITOR/校区 ADMIN 三角色） | PASS 17/17 断言；校区 ADMIN 跨校区审核 403 | `10-admin/verify-admin-auditor.log` |
| ADMWRITE（公告/建帖/上传/总览） | PASS 16/16 断言；校区管理员建帖落本校 `C1/R3/S1`，C 端可读 | `10-admin/verify-admin-writes.log` |
| ADMSCOPE（圈层×角色数据域） | PASS 17/17 断言；未绑定圈层的 ADMIN 只看到 11 条而非全平台 201 | `10-admin/verify-admin-scope.log` |
| 后台 typecheck / 单测 / build | exit 0 / 5 文件 39 测试 / build 40.91s | `10-admin/admin-typecheck.log`、`admin-unit.log`、`admin-build.log` |

> 说明：ADMWRITE 自建帖子 #428 已按脚本自收尾转为 `deleted`（保留可追溯行）；浏览器门与角色门使用的 #408 已还原置顶态。验收后 C 端 feed 与后台总览的口径不同（作用域/状态过滤），见 §6。

## 4. 跨端五环

`tmp/verify-20261028/five-ring.mjs`（10-26 载具，补 POST `Idempotency-Key`）：

| 步骤 | 结果 |
|---|---|
| 游客登录 | http=200 userId=100253 |
| 发帖（客户端路径） | http=200 id=429，默认 pending |
| 后台登录 / 按 id 读到 / 审核 | 200 / 200（title 一致） / 200（auditStatus=approved） |
| C 端 feed | total 194→195，且含 429 |
| 同幂等键重放 | 409 `IDEMPOTENT_CONFLICT` |

`FIVE_RING_RESULT=PASS steps=10 postId=429 guest=100253`。

## 5. 真实小程序验收

### 5.1 构建与包体
- 失败两轮（真实缺陷，已修）：`App.vue` 的 `linear-gradient` 多 `)`；`topic-detail.vue` 的 `box-shadow` 多 `)`；Sass 全量扫描报 11 条语法错，其中 **10 个真实样式块 + 1 条提取器假阳性**（`interest/index.vue` 的模板行被误当样式块）；真实块全部来自 030def02 的自指包裹收口。
- 修复后 `RELEASECHAIN_RESULT=PASS steps=15`；主包 1.63MB（上限 2.00MB）、总包 2.72MB（上限 10.00MB）、CDN 294 条、`shippable=no`。
- 产物：`apps/client/dist/build/mp-weixin-real`（985 文件）；`src/static` 已用 `prepare-static --dev` 还原为 1354 文件，完整备份树保留在 `static-local-backup/full-static`。

### 5.2 登录路径
| 路径 | 结果 |
|---|---|
| 体验号（guest-login） | 可用（五环、UI 链均实测 200） |
| 手机号 | API 实测 200（ADMWRITE 用 `13711110002`/`Student@12345`）；`13711110011`/`Demo@12345` 是演示学生号，登录页表单走同一 `/auth/phone-login` 端点；本轮 DevTools 未逐号点击表单 |
| 微信 `wx.login` | **外部阻断**：`.env` 无 `WECHAT_SECRET`，后端无法用 code 换会话；本轮不把它算产品红 |

### 5.3 DevTools 9 页只读巡检（变更面）

两轮：**无会话**（新 DevTools 存储）与**真实游客会话**（guest-login userId=100254，已实名、3 条演示会话）。两轮均 9 页、console 0、截图魔数 `89504e47` 且字节 >0。

| 页面 | 无会话落点 | 带会话落点 | console | 帧字节（带会话） |
|---|---|---|---|---|
| `pages/home/index` | `/pages/login/index`（未登录落点） | `/pages/home/index` | 0 | 50,636 |
| `pages/nearby/index` | `/pages/nearby/index` | `/pages/nearby/index` | 0 | 53,041 |
| `pages/discover/index` | `/pages/discover/index` | `/pages/discover/index` | 0 | 70,181 |
| `pages/messages/index` | `/pages/messages/index` | `/pages/messages/index` | 0 | 32,354 |
| `pages/profile/index` | `/pages/profile/index` | `/pages/profile/index` | 0 | 40,510 |
| `subpackages/village/village/index` | `/pages/login/index`（未登录落点） | `/subpackages/village/village/index` | 0 | 50,182 |
| `subpackages/village/village/publish` | `/pages/login/index`（未登录落点） | `/subpackages/village/village/publish` | 0 | 20,613 |
| `subpackages/village/village/post`（旧页，兼容） | `/subpackages/village/village/post` | `/subpackages/village/village/post` | 0 | 22,332 |
| `subpackages/campus/campus/hub` | `/pages/login/index`（未登录落点） | `/subpackages/campus/campus/hub` | 0 | 51,450 |

证据：`20-mp/audit/results_real-r3.tsv`（无会话）、`20-mp/audit-auth/results_auth.tsv`（带会话）、`reports/screenshots/mini-audit-2026-10-28*`。

### 5.4 四个发帖入口点击链

- `nearby` / `tag-posts`：页面级节点，点击后落到 `subpackages/village/village/publish` → **OK**。
- `profile` / `village`：入口节点在自定义组件 `GlobalPublishFab` / `ChannelComposerBar` 内，CLI 不可穿透 → **NOT-EVIDENCED(component-boundary)**（与 10-26 的 MatchActions / 个人页齿轮同类，不是产品红）。
- 4 个入口的代码目标统一为 `ROUTES.VILLAGE.PUBLISH`；`publish-pending` 链已证明发布页可提交（DB 行 430 pending，author=100254）。
- 全量链 6/7 PASS；`publish-entry` 首跑因 hardFail 把两条 component-boundary 记成 `TAP_FAIL` ⇒ 按仓库口径重跑为 PASS（2 OK + 2 NOT-EVIDENCED，console 0）。
- 证据：`20-mp/ui-chains.log`、`ui-chains-publish-entry.log`、`chains-full.json`、`chains-publish-entry.json`。

### 5.5 主链路与媒体

`tmp/verify-20261028/ui-chains.mjs`（10-26 六链 + 本轮 publish-entry），游客会话 userId=100254：

| 链路 | 结果 | 备注 |
|---|---|---|
| `discover-filter-and-like` | PASS：筛选帧变化、`POST /matches/like` 200、console 0 | 组件内 like 按钮 = NOT-EVIDENCED(component-boundary)，底层 API 已回读 |
| `home-more-and-like` | PASS：帖子 like 200、`isLiked=true`、console 0 | 「查看更多」入口 = NOT-EVIDENCED(component-boundary) |
| `publish-pending` | PASS：落 `subpackages/village/village/publish`，DB 行 `430 pending author=100254`，console 0 | QA 帖验收后软删 |
| `messages-send` | PASS：进 `chat-session`，API 回读命中，convs=3，console 0 | 发出一条 QA 消息，验收后按键删除 |
| `settings-weekly-toggle` | PASS：周报开关 1→0→1 并复原，console 0 | 个人页齿轮入口 = NOT-EVIDENCED(selector-not-found) |
| `circle-join` | PASS：加入→已加入→加入，console 0 | 往返复原 |

> 媒体：DevTools 巡检的 9 张截图均为有效 PNG（`89504e47`）且字节 >0；后台媒体门 20/20 真解码、裂图 0。小程序端没有 `naturalWidth` 级别的自动断言，媒体「真图」以截图目检 + 10-26 资产门为基线，本轮记为 `NOT-EVIDENCED` 的自动化项。

## 6. 真实产品缺口与外部阻断（只记录，本轮不补）

- **真机/发布**：`mp-weixin-real` 的 API 是 `127.0.0.1:8080`，仅同机 DevTools 可用；真机需 HTTPS 域名、AppID、`WECHAT_SECRET`，当前 `shippable=no`。
- **微信登录**：缺 `WECHAT_SECRET`（见 §5.2）。
- **VIP**：三页按封存态转发到 profile。
- **课表**：`setup/schedule` 无课表网格（`courseBlocks` 无渲染入口，NEEDS-RULING）。
- **隐私/协议**：后端 CMS 不可达/无正式文本时回退 i18n 本地兜底，正式文本待法务。
- **校园**：`campus/hub` 北师大统计行缺席、「认证中」不可达；`schools` 表无北师大，需 DB 迁移 + 认证源同步，只登记。
- **圈子页**：标签/公告/点赞仍是本地态（后端无对应接口）；**消息**已读标记本地；**喜欢**批量 skip 本地；发帖 @提及「即将开放」；咨询内容「筹备中」；临时会话不支持图片。
- **按裁定保留的红**：截图不入库导致的 corpus 红、`verify-real-coverage` 10 条、`verify-provenance-all` 1 条；本轮未动。

## 7. 数据状态与清理

- 验收写入：五环测试帖 #429、UI 发布链测试帖 #430 已按 id 软删（`posts.status=deleted`）；ADMWRITE 自建帖 #428 已 deleted；后台公告已下架；后台角色/作用域门对 #408 的审核与置顶已还原。
- QA 行清理：`likes` #3435（100254→100171）、`post_likes` #159（100254→408）、`private_messages` #5826（`QA-UI-消息链路-…`）已删除；会话 697 的 `last_message_preview` 回退到种子消息「顺便吃个火锅？」；种子 `likes` #3434 与 5802–5822 消息保留。
- 验收后 posts：active 195 / deleted 3（428/429/430）/ hidden 6。五环的 `feedBefore=194` 是 C 端游客口径，不与管理端总览/DB 行数混用。
- 清理前备份：`database/backup/pre-admin-reset-20261028.sql`（3,483,991B）；清理 SQL：`30-close/cleanup-qa.sql`。
- 后台浏览器旧截图已备份；`admin-browser-shots/report.txt` 已还原到 HEAD，避免 QA 覆盖仓库跟踪文件。

## 8. 证据索引

- 冻结/备份：`10-admin/freeze-git.txt`、`api-process.txt`、`db-counts.txt`、`mysqldump.err`
- 后台：`10-admin/reset-superadmin.log`、`admin-login-probe.log`、`admin-browser-verify.log`、`verify-admin-*.log`
- 小程序：`20-mp/release-chain.log`（失败 1）、`release-chain-r2.log`（失败 2）、`release-chain-r3.log`（PASS）、`paren-scan.log`、`sass-syntax*.log`、`restore-hunks-apply.log`、`mini-audit.log`、`audit/results_real-r3.tsv`
- 跨端：`30-close/five-ring.log`、`five-ring.json`
- 契约/静态：`30-close/contracts.log`、`20-mp/client-typecheck.log`、`client-unit.log`、`fallback-ratchet.log`

## 9. 复现命令

```bash
# 后台静态门
pnpm --filter @campus-love/admin run typecheck
pnpm --filter @campus-love/admin run test:unit
pnpm --filter @campus-love/admin run build

# 后台门（新口令从本地 .env 读）
ADMIN_LOGIN_PASSWORD=<local> node scripts/qa/admin-browser-verify.mjs
SUPER_PASSWORD=<local> node scripts/verify-admin-auditor.mjs
SUPER_PASSWORD=<local> node scripts/verify-admin-writes.mjs
SUPER_PASSWORD=<local> node scripts/verify-admin-scope.mjs

# 小程序 real 构建（Node 22）
PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" node apps/client/scripts/release-chain.mjs --allow-loopback

# DevTools 9 页巡检
PROJECT='D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real' \
OUT=reports/verify/2026-10-28/20-mp/audit \
SHOTS=reports/screenshots/mini-audit-2026-10-28 \
PAGES_FILE=reports/verify/2026-10-28/20-mp/pages.txt \
bash scripts/qa/mini-audit-smoke.sh

# 跨端五环
node tmp/verify-20261028/five-ring.mjs
```

## 10. 产品缺口落地（2026-10-28 追加）

按用户口径完成了 7 项（**不含** VIP 封存、课表网格、北师大统计行）：隐私/协议正式文本 CMS、圈子标签/公告/话题点赞、消息已读/未读同步、批量 skip + liked-me 排除 pass、发帖 @提及、咨询内容+后台 CRUD、临时会话图片。逐项实现、迁移、接口冒烟与验证见 [product-gaps-report.md](product-gaps-report.md)。

关键边界：
- 法律文本种子沿用后端既有内嵌文本 v1.0.0，**待法务复核**；正式文本/版本/生效日期/主体信息需用户提供。
- 咨询课程正文由既有 description 回填，价格/报名默认隐藏；首批正式内容/收费/支付需运营提供。
- 临时会话图片已可用，但媒体仍走现有签名 URL：**未做仅会话双方可读、过期物理删除**，匿名/保留策略需产品裁定；在此之前不宣称匿名安全。
- 圈子公告为单列（一条置顶），标签为逗号分隔；话题点赞不发通知。
- @提及仅覆盖帖子（圈子话题暂不支持），通知在后台审核通过后发送。

### 10.1 Wave-2 追加（2026-10-28 晚）

用户裁定「临时图片选 B 强匿名，其他三项立即开工」后，上述四条边界已落地并被本轮实现取代：

- **圈子公告表化**：`circle_announcements` + 后台发布/下线/置顶互斥 + 客户端公告列表（旧列 `interest_circles.announcement` 仅兼容读）。
- **话题点赞通知**：`topic_like` + `referenceType=topic` + 去重表，取消再赞不重复。
- **@提及扩展**：统一 `content_mentions`，话题审核通过后通知、回复即时通知，仅同圈成员，客户端共享 `MentionPickerSheet`。
- **临时图片 B 强匿名**：`temp/{sessionUid}` 存储（URL 不含 userId）、仅双方可读、签名 TTL 300s、T+48h 清理、举报 hold、伪名/默认头像/隐藏主页、联系交换后揭示。

逐项实现、迁移、读数和边界见 [wave2-implementation.md](wave2-implementation.md)。补充收口（2026-10-28 晚）：通知中心页已上线（铃铛进入，点击跳话题/帖子）；清理已用后台维护端点真实触发并验证文件删除/墓碑/消息删除/hold 跳过；临时会话深链冷启动已修；@提及确认已通过页面 VM 调用组件 confirm 同一处理器自动验证。仍未闭合：组件内部按钮的物理点击受 DevTools 边界限制；真实 48h 墙钟未等待；发布所需 HTTPS 域名/AppID/`WECHAT_SECRET` 未提供（见 [release-external-inputs.md](release-external-inputs.md)）。

