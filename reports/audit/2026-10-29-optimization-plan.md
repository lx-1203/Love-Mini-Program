# 优化清单落地方案（2026-10-29）

本轮按「安全的直接改，破坏性的先确认」分档执行。本文档记录**已改完并验证**的部分，以及**已备好方案、等你确认才动**的部分。

---

## 一、已执行（可直接 review `git diff`）

| # | 项目 | 改动 | 验证方式与结果 |
|---|---|---|---|
| A1 | 客户端英文版下线 | 删 `apps/client/src/i18n/locales/en-US.ts`，去条件编译注册，改 6 个 spec | 见客户端 typecheck + vitest（代理执行） |
| A2 | 管理端英文版下线 | 删 `en-US.ts`(2295 行)、`setLocale`、App.vue/Layout.vue 语言下拉 | `vue-tsc` 无错误；`test:unit` 39/39 通过 |
| A3 | Element Plus 移除 | 全仓只有 1 处 `<el-drawer>` → 新增 `components/DetailDrawer.vue`；`main.ts` 去全量注册；删 `element-override.css`；`package.json` 摘 `element-plus`/`@element-plus/icons-vue` + lockfile 同步 | admin 构建产物 **14MB → 2.1MB**，JS 1.22MB、CSS 0.61MB；39/39 用例通过 |
| A4 | sourcemap 泄露 | admin + client 生产 `sourcemap` 改为默认 `false`（`BUILD_SOURCEMAP=true` 才产 hidden）；admin 与 client 两份 nginx 均加 `location ~* \.(map\|tsbuildinfo)$ { return 404; }` | admin dist 内 `.map` **67 → 0** |
| A5 | 构建档位身份 | 新增 `apps/client/scripts/mark-build-band.mjs`；挂到 `build:h5`/`build:mp-weixin`/`:mock`/`:showcase`；自测 5 例接入 `test:build-band` 并入 `test:contracts`；`tests/release-gate.spec.mjs` 新增接线断言（盖章不可缺、不可借用发布豁免旗标） | 自测 5/5；对现有产物实测：mp 档判 `非 HTTPS + 指向本机回环`，h5 档判 `示例占位域名` |
| A6 | ESLint 噪音 | `flat/recommended` → `flat/essential`（格式规则交 Prettier） | warning **14,820 → 491**，0 error；剩余大头是 478 条 `prefer-template` |
| A7 | 后端 N+1 | `AdminDataScope.resolveUserCampusNames()` 批量解析（500 一批）；`AdminFeedbackController` 列表改两段式过滤，语义不变；新增 `AdminDataScopeCampusBatchTest` 6 例 | `./mvnw -o verify -Dspring-boot.repackage.skip=true`：**1431 测试 0 失败，All coverage checks have been met，BUILD SUCCESS** |
| A9 | H5 真实包剥离 Mock | `build:h5:real` 与 `build:h5:real:ci` 改走 `strip-mock-for-mp.mjs`（mp 档已在用的同一套桩化） | 待构建验证 |
| A10 | 文档与工具链 | README 28 条死链清理并说明历史文档在 `aefd8a72` 被删；新增 `.nvmrc`(20)；`.gitignore` 补 `deck_build/`、`*.pptx`、`/database/backup/` 等；`tests/docs-contract.spec.mjs` 新增三道门：README 文档链接存在性、`.nvmrc`↔CI↔engines 版本一致 | `test:docs` 通过（14 条链接全存在，node 20 对齐）；`test:tracked-refs` 由红转绿 |

未接入 CI 的空白项：本轮没有改动 `.github/workflows/ci.yml`。

---

## 二、B1 仓库瘦身与备份清理（**待你确认**）

脚本已就位：`scripts/repo-purge.sh`（默认 dry-run，需 `--apply` + 输入 `PURGE-INDEX` 才动索引；只动索引、不删本地文件、不重写历史、不 commit）。

实测数据：

```
git ls-files                        → 18,062
git ls-files -ci --exclude-standard → 7,980   （reports 7,487 / .trae 164 / database 105 / .design_library 99 / apps 51 …）
git count-objects -vH               → size-pack 800.55 MiB
git ls-files database/backup        → 105 个文件，其中 .sql 23 个
```

**对上一份报告的更正（重要）**：我先前写「105 份含真实手机号的备份入库」，逐个复核后站不住：

- `database/backup` 下被跟踪的是 23 个 `.sql` + 82 个 svg 资产快照；
- 只有 `qafid-R6-20261019T130104.sql`、`qafid-R6-20261019T130124.sql` 两个文件含 `INSERT INTO users`（292 行，列含 openid/phone/password）；
- 这些手机号是 **13700001001~13700001129 连号**、另含 176 个 BCrypt 哈希 —— 是**种子/演示数据**，不是真实用户；
- 未跟踪的本地转储（`post-verify-*`、`pre-admin-reset-*` 等）内容同一套 seed。

因此正确定性是：**「演示账号口令哈希 + users 全表结构进版本库」**，属必须清理的脏数据与撞库面（种子口令在 `database/seed-test-users.sql` 等处是公开的），而不是「真实用户数据泄露事件」。严重度从 P0 降到 P1，但清理动作照做。

确认后执行顺序：

1. `bash scripts/repo-purge.sh` 看计划 → `bash scripts/repo-purge.sh --apply` → 你自己 `git commit`。
2. 历史清理（**破坏性**，需团队同意 + 全仓镜像）：`git filter-repo --path database/backup --invert-paths`，再按同样方式处理 `reports/screenshots`。
3. 若仓库曾经公开或有外部协作者：把 seed 账号口令换掉，并检查是否有环境直接用 seed 数据上线。
4. 本地垃圾清理（不进 git，纯磁盘）：`tmp/` 582MB、`deck_build/` 425MB、`截图存档/` 122MB、`apps/client/archive/` 163MB、`deliverables/` 101MB、`logs/`+`verification_logs/` 65MB、根目录 `appendonly.aof`/`dump.rdb`（Redis 持久化，可能含在跑服务的会话）。
5. QA 证据改走仓外存储，`reports/` 只留索引文件。

---

## 三、B2 支付事务改造（**待你确认**，属资金链路）

现状（已核实）：`VipOrderService.java:136` `@Transactional` 的方法内，`:166` 调用 `wxPayJsapiService.createJsapiOrder(...)`。

问题：外部 HTTP 调用被包在数据库事务里 —— 微信慢时长时间持有连接与行锁；微信下单成功而本地回滚 → 钱货不一致；重试可能重复下单。

方案（不新增依赖）：

1. **拆事务**：`createOrder()` 只做本地落单（状态 `PENDING`）并提交；
2. **事务外调微信**：拿到 `prepay_id` 后用独立的 `@Transactional` 方法回写 `prepay_id + SUCCESS/FAILED`；
3. **幂等键**：`order_no` 唯一索引已可复用，调用前按 `order_no` 查已有 prepay 结果，命中则不再下单；
4. **补偿**：进程崩溃在两步之间时，由既有的关单/对账定时任务把 `PENDING` 超时单关掉（注意该任务需要分布式锁，见 B3 第 4 条）；
5. **回调**：`handlePayNotification` / `handleRefundNotification` 保持独立事务，且按 `transaction_id` 幂等（先查状态再写）。

验收要能失败：

- 单测：mock `WxPayJsapiService` 抛异常 ⇒ 断言本地订单仍是 `PENDING` 且未被回滚；
- 集成测试（需 Docker）：下单 → 回调 → 重复回调，断言 VIP 权益只加一次。

我没有动这段代码：它涉及真实收款，且现在**没有任何集成测试兜底**（Docker 未运行，改完无法验证）。

---

## 四、B3 其余优化项方案（**待你确认**）

1. **巨型文件拆分**：客户端 `chat-session/index.vue` 3741 行、`village/detail.vue` 3636、`pages/profile/index.vue` 3163；后端 `RealAuthService` 1282、`VillageQueryService` 1212、`RealCircleService` 1200（Java >500 行的共 34 个）。做法：先补 characterization test（现有 132 个 client spec 是底子），再按「容器 / 展示 / composable」或「用例 Service」切，每切一块跑一次全量测试。建议一次只拆一个文件，单独 PR。
2. **长列表与重复拉取**：658 个 `<image>` 只有 81 处 `lazy-load`；聊天页全量 `v-for`，`components/common/VirtualList.vue` 已存在但零生产引用（本轮清理时我特意保留它）；`pages/profile` 每次 `onShow` 重拉日常/帖子/点赞。做法：聊天列表接入 VirtualList + 分页；`onShow` 改增量（带 `If-None-Match` 或时间戳短路）。
3. **图片管线**：实测 `src/static` 37MB（1354 个文件，单图最大 1.46MB），但**真实档位已被 prepare-static 裁到 436KB**（mp 真实包 4.5MB，主包门禁 ≤2MB 通过），所以小程序侧不是问题；H5 档 `dist/build/h5` 43MB 里 assets 14MB 才是真下载量。做法：H5 侧把大封面/头像转 WebP + CDN，dev-only 的 demo 素材不进 H5 生产目录。
4. **运行时配置**：Caffeine 无 `maximumSize`（`CaffeineCacheConfig.java:91,112`）；`online:user:{id}` 单 key 覆盖多端会话（`OnlineUserService.java:47,127`）；14 个 `@Scheduled` 无分布式锁。做法：加容量上限与逐 cache 指标、在线状态改 hash/set、引入 ShedLock（多实例前必须做）。
5. **集成测试**：后端只有 16 个 `@SpringBootTest`、0 Testcontainers、0 `@DataJpaTest`；JaCoCo 门禁按 pom 注释自述从 80% 下调到 LINE 30%/BRANCH 22%。做法：Testcontainers-MySQL 建 6–10 条关键链路（登录越权、下单回调退款、圈层数据范围、反馈列表分页），覆盖率改按模块 ratchet。前提是本机 Docker Desktop 起来（当前 `docker version` 连不上引擎）。
6. **Mock/Real 双实现**：后端 52 个 `Real*`（16,558 行）+ 49 个 `Mock*`（8,396 行），靠 profile 切换，两套行为无契约测试约束。做法：Mock 侧降级为 test fixture，或加一组「同请求同断言」的 mock/real 对照测试。
7. **请求层收口**：25 个页面直接 import `services/http`，`sentry.ts:497`、`utils/location.ts:193` 绕过封装。做法：加 `no-restricted-imports` 规则，页面只准调领域 service。
8. **管理端表格组件化**：47 页里 39 页手写 `<table>`，67 处重复的 page/pageSize/total，`Certifications` 与 `RealNameCertifications` 高度相似。做法：抽 `ProTable`（列定义 + 分页 + 写权限闸），一次迁 3–5 页。
9. **数据库**：122 表、224 迁移、31 个 seed 迁移混在 DDL 里。做法：建 schema baseline + 独立 seed 目录；按慢查询日志补索引（当前 59 个索引 vs 122 张表）。
10. **遗留应用**：`apps/admin-legacy` 13MB/454 文件、CI 与 compose 零引用。删除前需要你确认 5178 回退端无人使用。

---

## 五、本轮遗留

- `build:h5:real` 走 strip-mock 后**尚未跑过一次完整 H5 真实构建**验证产物（需 `BUILD_SOURCEMAP` 与域名占位配置）。
- ESLint 剩余 478 条 `prefer-template` 未 `--fix`（会产生跨数百文件的大 diff，建议单独一次提交）。
- `apps/client/scripts/strip-mock-for-mp.mjs` 的 `STUB_TARGETS` 已移除过期条目，并加了「重新引入英文时必须加回」的告警注释。

### 死代码清理进度（A8）

只读扫描器对 145 个组件做了六类引用判定（显式 import / PascalCase 标签 / kebab 标签 / 动态注册 / usingComponents / 同名 story 区分），分三档：

| 档 | 内容 | 本轮 |
|---|---|---|
| A1 | 全仓零命中 30 个 | **已删 29 个 / 3,775 行**（保留 `discover/MatchActionButton.vue`：它是「v3 冻结、刻意不接」的设计资产，且有反向断言测试守着） |
| A2 | 生产零引用但被 26 个 story/spec 引用 20 个 / 4,664 行 | 未删。删它等于同时删测试，且会动 `VirtualList.vue`（长列表优化正要用它，特意排除在外） |
| A3 | 级联孤儿（唯一消费者是 A2 里的死组件）5 个 / 865 行 | 未删，必须与 A2 同批才安全 |

另删：空目录 `apps/archive/`、`apps/admin/src/styles/element-override.css`、双端 `i18n/locales/en-US.ts`。

A2/A3 建议单独一次提交：删 25 个组件 + 26 个对应 story/spec，然后重跑客户端 vitest 与 `test:asset-coverage:source`（本轮基线：ASSETCOV PASS、分母 929、缺件 0）。

