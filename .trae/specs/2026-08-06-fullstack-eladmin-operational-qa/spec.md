# 全栈运行 + eladmin 参考改进 + 全量审查清单 Spec

## Why

用户需要将微信小程序（mp-weixin，非 H5）与管理后台、后端 API 三端在本机完整运行起来进行实验验证：以 eladmin（https://github.com/elunez/eladmin）为后台参考标准，研究并对齐改进后端，保证所有页面可操作、用户可注册登录、数据互通、无任何报错，最终输出一份完整审查清单，满足商业化质量要求。

## 现状（调研结论）

- 仓库为 pnpm monorepo：`apps/client`（uni-app Vue3，构建目标 mp-weixin）、`apps/api`（Spring Boot 3.3.1 / Java 17+ / JWT / Spring Security / JPA / Flyway / Redis / RabbitMQ 降级）、`apps/admin`（Vue3 + Vite 管理后台，dev 端口 5177，`/api` 代理到 `localhost:8080`）。
- 本机环境：Java 21（Temurin）、Node 22、pnpm 11；**无 Docker**、无全局 Maven（使用 `apps/api/mvnw.cmd` wrapper）；MySQL(3306) 与 Redis(6379) 已在本地运行。
- 本地数据库凭据（用户提供，仅用于本地开发 `.env`，**严禁提交仓库**）：MySQL 密码 `hyp5022940`（默认用户 root，库 `campus_love`）；Redis 密码待 Task 0.4 探测确认。
- 8080 端口已有一个 Java 进程（`java @run-real.args`，`--spring.profiles.active=real`）在运行本项目 API，但 `/actuator/health` 返回 503（服务不健康），需诊断修复。
- 客户端已具备注册/登录链路：`POST /api/v1/auth/register`（手机号+密码+昵称，注释明确“参考 eladmin 账号注册模式”）、`/phone-login`、`/wechat-login`、`/admin/login`。
- `apps/client/.env.mp-weixin` 当前指向占位域名 `https://api.campuslove.example.com/api`（不可用），本地实验需改为 `http://127.0.0.1:8080/api`（`project.config.json` 已设 `urlCheck:false`，开发者工具可访问 http）。
- `apps/admin/.env.development` 已指向 `http://127.0.0.1:8080/api`。
- eladmin 特性（参考基准）：用户/角色/菜单/部门/岗位管理、数据字典、操作日志与异常日志、SQL 监控、定时任务、代码生成、邮件、S3 云存储、支付宝支付、服务监控、在线用户管理与单用户登录限制、运维管理。
- 当前后端已具备：JWT+Security+Redis、JPA+Flyway、审计日志（AuditLogAspect + AdminAuditLogController）、Admin 系列控制器（用户/帖子/举报/反馈/配置/敏感词/统计/匹配配置/通知配置）、Actuator+Prometheus+Grafana 监控、Bucket4j 限流、Resilience4j 熔断、幂等注解、VIP 计费/兑换码/红包等。
- 工作区 git 状态为 dirty（main 分支存在大量用户未提交改动）；存在 `xingji-branch/` 历史备份目录，**均不得回滚或改动**。

## What Changes

- 三端本地完整运行链路：API（real profile + 本地 MySQL/Redis）健康运行 → 管理后台可登录、全页面可操作 → 小程序 `build:mp-weixin` 构建无报错并在微信开发者工具中运行。
- 诊断并修复 8080 现有 API 实例 503 不健康问题；建立可复现的本地 `.env` 启动配置。
- 完成 eladmin 差距分析，形成报告；按「小步迭代 + 优先级（P1 必须 / P2 应该 / P3 可选）」实施对当前项目有实际价值的对齐改进（不整体移植 eladmin 全功能）。
- 验证并修复注册/登录/登出（上下线）、活动上下架与报名、页面操作等核心链路。
- **以真实用户身份对全部功能链路做端到端完整测试**（小程序端 + 管理后台端）：账号资料、寻觅匹配、聊天、圈子动态、活动、签到积分商城、我的/设置、VIP 商业化、后台运营等；凡页面/入口/接口暴露但未实现或仅为占位的功能，一律小步补齐实现并保证可用。
- 打通数据互通：小程序注册用户 → 后端入库 → 管理后台可见可管理；后台配置（内容页/配置项/敏感词/举报处理）→ 客户端生效。
- 全量质量门禁：三端构建无报错、client 单元测试、api Maven 测试（含 JaCoCo 阈值）、开发者工具运行无 console 错误。
- 交付完整审查清单（`checklist.md` 即交付清单），覆盖运行、功能、互通、eladmin 对齐、质量与商业化要求。

## Impact

- Affected specs（能力）: 认证与注册、管理后台运营能力、小程序端可操作性、数据互通、质量门禁。
- Affected code：
  - `apps/api`（Spring Boot 后端：诊断修复、按差距报告的小幅改进）
  - `apps/admin`（管理后台：页面可操作性验证与补齐）
  - `apps/client`（仅 mp-weixin 构建与本地 API 指向，非 H5）
  - 根目录/各 app 的 `.env*`（本地运行配置，`.env` 不入库）
  - 文档：`docs/` 下如有必要同步本地运行说明（不新增营销/无效文档）

## Non-Goals（明确不做）

- 不做 H5 端（用户明确“不要H5”），H5 相关代码不修改、不验证、不回归。
- 不整体移植 eladmin 全功能（代码生成、Druid、支付宝、邮件、S3、Quartz 等对本项目非必要项，仅记录在差距报告中）。
- 不回滚、不改动工作区用户未提交的改动；不触碰 `xingji-branch/`。

---

## ADDED Requirements

### Requirement: 本地基础设施与 API 健康运行
系统 SHALL 在本地（无 Docker）完成 API real profile 启动配置，并保持 `/actuator/health` 为 UP。

#### Scenario: 成功运行
- **WHEN** 使用 `mvnw.cmd` 以 real profile 启动 API，并注入本地 MySQL/Redis 凭据
- **THEN** 应用启动成功，`GET /actuator/health` 返回 `{"status":"UP"}`，8080 无端口冲突

#### Scenario: 旧实例处理
- **WHEN** 8080 被不健康的旧实例占用
- **THEN** 定位其进程与启动参数，安全重启为健康实例（不破坏数据）

### Requirement: eladmin 参考研究
系统 SHALL 产出基于 eladmin 的后端/后台差距分析，覆盖：用户管理、角色权限、菜单、数据字典、操作/异常日志、监控、在线用户、定时任务等，并明确各差距对「页面可操作、注册、数据互通、商业化」的影响等级。

#### Scenario: 差距报告
- **WHEN** 对照 eladmin 12 项核心特性逐项审查当前后端与后台
- **THEN** 输出 P1/P2/P3 分级差距清单（含证据：代码位置/接口/页面），P1 项（阻塞运营或商业要求）必须进入实施

### Requirement: 管理后台全页面可操作
管理后台 SHALL 登录成功（管理员账号密码），且所有现有页面（Dashboard/用户/帖子/举报/反馈/配置/敏感词/审计日志/通知配置/匹配配置/统计等）均可正常浏览与操作。

#### Scenario: 成功登录与操作
- **WHEN** 使用配置的管理员账号登录 `apps/admin`
- **THEN** 进入后台且每个页面无报错，列表可加载、详情可查看、关键操作（禁用用户/处理举报/改配置/加敏感词）可执行

### Requirement: 小程序端注册、登录与页面可操作
小程序（mp-weixin）SHALL 构建无报错，并在微信开发者工具中完成：手机号注册、手机号登录、微信登录（有凭据时）、登出（上下线），以及所有主 Tab 与一级入口页面可正常操作、无 console 错误。

#### Scenario: 注册闭环
- **WHEN** 在开发者工具中小程序使用手机号+密码+昵称注册
- **THEN** 注册成功即签发 JWT 并进入主流程，后端 `user` 表新增记录，无任何报错

#### Scenario: 页面可操作
- **WHEN** 逐页打开主 Tab（首页/寻觅/圈子/消息/我的）及一级入口（设置/反馈/任务/相册/访客/认证/活动等）
- **THEN** 页面渲染正常、可交互，控制台无 error，数据来自真实后端（非前端 mock）

### Requirement: 全功能链路测试与用户角色走查
系统 SHALL 以真实用户身份走查全部功能链路（小程序端 + 管理后台端），每条链路端到端完整测试（不只冒烟）；凡页面/入口/接口暴露的功能未实现或为占位，SHALL 补齐实现并保证可用，最终形成全功能清单与走查证据。

#### Scenario: 用户角色全链路走查
- **WHEN** 以用户身份依次走查：账号注册/登录/登出、资料编辑、寻觅匹配（滑动/喜欢/收藏/每日推荐/心动信号）、聊天（会话/私信/临时会话/语音/红包/视频）、圈子动态（浏览/发帖/评论/点赞/话题/校园圈认证/兴趣圈）、活动（日历/详情/报名）、签到积分商城、每日一问、我的页（相册/访客/任务/认证/隐私/免打扰）、设置与反馈、VIP（套餐/账单/兑换码/红包）
- **THEN** 每条链路端到端可用、数据真实落库、无报错，截图/日志/数据核对证据归档

#### Scenario: 后台角色全链路走查
- **WHEN** 以管理员身份走查：登录、Dashboard/统计、用户管理（详情/禁用）、帖子审核、举报处理、反馈处理、内容页/通知/匹配配置、敏感词、审计日志
- **THEN** 每页可操作、数据与小程序侧互通，无报错

#### Scenario: 未实现/占位功能补齐
- **WHEN** 功能清点发现某入口/接口仅有展示或 mock 占位、无真实逻辑
- **THEN** 按小步迭代补齐真实实现并补充测试，保证该功能可用，且不破坏既有链路

### Requirement: 数据互通
小程序、管理后台与后端 SHALL 共享同一数据库并双向生效。

#### Scenario: 注册用户后台可见
- **WHEN** 小程序注册新用户后进入管理后台「用户管理」
- **THEN** 新用户出现在列表中，可查看详情、可禁用/启用

#### Scenario: 后台配置下发
- **WHEN** 后台修改内容页 URL/通知配置/敏感词/举报处理
- **THEN** 小程序对应页面/接口立即生效，行为符合配置

#### Scenario: 客户端数据回流
- **WHEN** 小程序发帖/反馈/签到等产生数据
- **THEN** 管理后台对应列表可见并可处理

### Requirement: eladmin 对齐改进
按差距报告实施 P1（必须）与经确认的 P2（应该）改进，遵循小步迭代：单次修改只处理一个独立逻辑单元，附带测试与注释，不引入无关重构。

#### Scenario: 改进可验证
- **WHEN** 实施某项对齐改进（如在线用户管理、管理员改密、数据字典等差距报告确认项）
- **THEN** 该能力有对应接口/页面/测试，且不影响既有链路

### Requirement: 质量门禁与商业化清单
系统 SHALL 通过以下门禁：client 单元测试全绿、api `mvnw test` 全绿（JaCoCo 阈值 LINE≥0.80/BRANCH≥0.75/METHOD≥0.80/CLASS≥0.75）、三端构建无报错、开发者工具运行无 console 错误；最终 `checklist.md` 全项核验通过并作为交付清单。

#### Scenario: 门禁通过
- **WHEN** 执行 `pnpm --filter client run test`、`pnpm --filter client run typecheck`、`pnpm --filter client run build:mp-weixin`、`apps/api/mvnw.cmd test`、`pnpm --filter admin run build`
- **THEN** 全部成功且无失败项，`checklist.md` 全项打勾

## MODIFIED Requirements

### Requirement: 客户端 API 指向（mp-weixin 本地联调）
原 `.env.mp-weixin` 指向占位 HTTPS 域名导致小程序无法联调。修改为本地 `http://127.0.0.1:8080/api`（real 模式）用于本地实验；**发布前必须恢复为真实 HTTPS 域名**（保留 `.env.production`/构建说明中的约束，禁止携带本地地址发布）。

## REMOVED Requirements

无（本次不删除既有功能；仅修复与改进）。
