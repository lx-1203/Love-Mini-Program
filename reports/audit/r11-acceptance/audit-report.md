# R11 全量验收总报告（2026-09-18）

> 验收方案：[acceptance-plan.md](./acceptance-plan.md)
> 验收形式：**real:dev 构建形态**（本地无生产 HTTPS 域名，release 门禁见 §环境偏差）
> 巡检身份：A = 100158 曦风（满配）/ B = 100159 小新生（新用户·校园未认证）
> 证据戳：`b0918-1725`（终版构建后统一拍摄）+ 受 lint 修复影响页面补拍戳 `b0918-final`

---

## 0. Gate 结论总表

| Gate | 标准 | 结论 |
|---|---|---|
| G1 构建完整 | client real 链 / admin build / api test 全绿 | ✅ client real:dev BUILD_EXIT=0（9 守卫链）；admin build exit=0；api test **BUILD SUCCESS**（1084 tests / 0 fail / 0 err，30 个上下文错误修复后归零） |
| G2 静态守卫 | 全部 check 脚本 0 error，warn 清零或白名单 | ✅ check-mp-image-strict 0 / **check-statusbar 0 err 0 warn**（29→0：15 页补注入 + 宿主白名单 + fail-fast 升级）/ check-tabbar ✓ / check-project-rules **74 error→0**（新增脚本，129 warn 留档）/ p0-compliance 修复解析后无失败项 / verify-contract ✓ / check-missing-files 0 / verify-image-paths exit 0 |
| G3 页面覆盖 | 73 页 × 双身份 × 冷启动 reLaunch | ✅ 截图矩阵见 [screenshot-matrix.md](../../screenshots/r11-acceptance/…)（hot 启动为抽样覆盖，见 §偏差） |
| G4 交互覆盖 | 交互清单逐点执行 | ⚠️ 静态清单 809 绑定/898 行全量生成（interaction-matrix.csv）；行为级执行采用「七链路 API 级全链验证 + 分类抽样点验」，未做到 913 逐点（见 §偏差） |
| G5 数据合规 | 审计残留 0 / 封存正确 / 标签字典映射 | ✅ 扫描 0 命中（scan-result.txt）；讨论圈同句在接口层去重（10/10 distinct）；封存页 consult/market×3/vip×3 截图核验通过；标签 111 个中 5 个英文值全部被 tag-label.ts 映射覆盖（AI/DIY 为通用缩写） |
| G6 证据可信 | 截图锚定终版构建，空白/骨架不计 PASS | ✅ 全部截图带 build 戳；空白/骨架由 r11_matrix.py 自动检测（阈值：熵<1.2 或主色>97% 判空白；双拍哈希距≤4 且低熵判卡死），命中的场景自动标记缺陷 |

## 1. 三端构建证据（G1）

| 端 | 命令 | 结果 | 日志 |
|---|---|---|---|
| client | `build:mp-weixin:real:dev`（9 守卫链） | exit 0 | tmp/r11-final-build.log |
| client | `typecheck`（vue-tsc） | **0 error**（46→0） | tmp/r11-typecheck.log |
| client | `test:unit`（vitest） | **109 files / 1280 tests 全绿**（40 失败修复后） | tmp/r11-test.log |
| admin | `build`（vite） | exit 0（26.42s） | tmp/r11-admin-build.log |
| api | `api:test`（surefire） | **1084 tests, 0 failures, 0 errors**（30 个上下文错误修复后） | tmp/r11-api-test3.log |

修复明细：
- client 测试 40 失败 = 1 个产品真 bug（messages store mock 分支写未声明字段）+ 39 个契约演进断言同步（无 skip/恒真）
- typecheck 46 = 5 处产品真 bug（3 处幂等键 `header`→`headers` 导致幂等键从未生效；nearby-people 漏 import `tagLabelsFor` 渲染即 ReferenceError——R10 的 R34 骨架屏即此因；uploadPostImage 缺 name）+ 类型修正 + 未用清理
- api 30 error = R16 新增 `OfficialChatMessageRepository` 依赖未按 mock-profile 惯例补 `@MockBean`（2026-09-07 起损坏的既有问题），3 个测试类补齐后全绿

## 2. Phase 2 页面覆盖（G3）

- 路由：73 注册页（8 主包 + 65 分包）；real 包实测不含 `setup/dev`（app.json 0 命中）
- 巡检：双身份 × 4 段 × 18 路由，每路由 reLaunch 直连（冷启动）+ 双拍（间隔 2s，用于卡死检测）+ console 过滤（NAV_FAIL/TypeError/is not defined）
- 带参固化表：scripts/r11-param-map.json（12 个带参页面的真实参数名与 DB 存活 id）
- 结果：见 screenshot-matrix.md；空白/骨架命中场景已列出并在报告中处置

## 3. Phase 3 交互覆盖（G4）

- 静态清单：`interaction-matrix.csv` —— 809 绑定 / 898 行（组件绑定上卷宿主页面；913 为方案期估算，实测口径 809）
- 行为验证：
  - **七链路 API 级 7/7 PASS（14/14 步骤）**：会话/喜欢/评论/话题/发帖/聊天/资料——每步 HTTP 2xx + DB 落库断言 + 清理后 0 残留（chain-results.md，含残留复查 SQL 与输出）
  - 导航/开关/弹层类在 Phase 2 截图巡检中随页面触达
  - 过程发现：POST /matches/like 强制 Idempotency-Key 头（客户端 3 处 header→headers 修复后已真实携带）；cancel-like 为软删除

## 4. Phase 4 数据合规（G5）

- 审计残留扫描（scan.sql → scan-result.txt）：posts/private/temp_chat/whisper/official 全 0 命中（R10 遗留 3 条 QA 帖由 V2026.09.18.0002 清理）
- 种子质量：讨论圈同句在 `RealRecommendationService.getDiscussions` 接口层按内容指纹去重（**修复后 API 实测 10 条返回 10 个不同内容**）；种子内容 V2026.09.18.0002 主题化轮换
- 相册重复：V2026.09.18.0001 按 MD5 字节级实证后去重
- 标签字典：DB 111 个标签值，5 个英文值全部被 tag-label.ts 别名覆盖，展示层无未映射英文（db-tags.txt 留档）
- 合规接线：`getPhoneNumber` / `ContentSecurityChecker` / WS `connect()` 维持「正式封存」决议（9.17 汇报口径），本轮无接线变更

## 5. Phase 5 性能基线

- 包体积（build-evidence/package-size.txt）：**发布形态门禁被环境前置阻塞**——release 链的 verify-env-release 要求 HTTPS 生产域名（本地无），real:dev 形态按脚本内 2026-08-29 书面豁免将主包断言降级为警告（本地形态携带 mock 时代装饰图，主包 27.68MB）。**书面偏差**：发布前必须配置生产域名走 release 链完成 ≤2MB 严格门禁（资产需迁媒体宿主/CDN）
- TTI 基线：tti-baseline.tsv（5 tab 页 reLaunch→路由就绪毫秒数，附首屏截图）

## 6. 偏差与遗留（书面记录）

1. **G4 未逐点点验 913/809**：交互行为级验证以七链路 + 页面触达覆盖；完整逐点执行需要逐元素 UI 自动化（miniprogram-automator 元素 tap 对自定义组件不生效的工具限制，见 R9 备忘），列入下一轮工具建设
2. **hot 启动覆盖为抽样**：自动化 reLaunch 冷启动为全量；「上一级页面点击进入」需逐页 UI 操作，仅对主包 tab 与一级入口抽样
3. **release 链三步未本地执行**：verify-env-release（HTTPS 域名）+ 发布形态主包 ≤2MB 严格门禁 + 真机隐私授权链——均依赖生产部署要素
4. **lint warnings 14432**：0 error 达标；warnings 为格式类（vue/max-attributes 等），`--fix` 可批量消除但会产生全仓 diff，建议单独批次
5. **巡检稳定性**：DevTools 自动化在 >150 次导航后偶发 runtimeid 丢失（本轮 3 次，全量重启恢复）；巡检脚本已内置段间 refresh，长跑建议按段分批

## 6A. 管理后台联通与数据同步（2026-09-19 补充验收）

| 项 | 结果 |
|---|---|
| 管理员登录 | ✅ POST /api/v1/auth/admin/login 200（SUPER_ADMIN local-dev-admin-openid-123456；写接口统一强制 Idempotency-Key，admin 前端 http.ts 已自动携带） |
| 用户数据同步 | ✅ admin /admin/users total=275 = DB users 275 |
| 内容数据同步 | ✅ admin /admin/posts 200 实时列表；DB active posts=183、审计残留 0 |
| 圈子数据同步 | ✅ client /circles circle#8 memberCount=12001 = DB interest_circles 12001 |
| 认证审核 | ✅ admin /admin/certifications 200 |
| 证据 | data-compliance/admin-sync-result.txt |

## 6B. 理想图一致性对照（2026-09-19 补充验收）

**12 组核心页 Level1-4 结构比对全部通过**（ideal-comparison.md），无结构性偏差。过程发现并修复 2 项：
1. 会话 preview 审计残留（R10 清理只删消息行未清会话预览）→ 迁移 V2026.09.19.0001 + 消息页实拍验证通过
2. 巡检参数表 `?id=225` 已失效（R10 删除的审计帖）→ 参数表更新 `?id=1`，帖子详情完整渲染验证通过

终版构建（lint/typecheck 修复后重编译）：BUILD_EXIT=0，9 步守卫链全 PASS（tmp/r11-verified-build.log）。

## 7. 本轮新增/修改交付物

- 守卫：`check-statusbar-offset.mjs`（+白名单+fail-fast）、`check-project-rules.mjs`（新增）、`check-tabbar-consistency`/`check-project-rules` 接入构建链、p0-compliance 修复
- 脚本：`r11-param-map.json`、`r11-interaction-scan.mjs`、`r11-tour.ps1`、`r11-tti.ps1`、`r11-n1-home.ps1`、`eval_app/eval_boot/eval_state/eval_pinia/eval_vm.ps1`（登录态两步恢复取证）
- 迁移：`V2026.09.18.0001__r11_n6_album_dedup.sql`、`V2026.09.18.0002__r11_seed_content_diversify.sql`
- 报告：本目录 chain-results.md / screenshot-matrix.md / data-compliance/* / build-evidence/*
- 修复：N1-N6 全项 + messages store 真 bug + 3 处幂等键真 bug + nearby-people 漏 import 真 bug + uploadPostImage 缺参 + api 测试上下文 30 错 + eslint 21 error + typecheck 46 error
