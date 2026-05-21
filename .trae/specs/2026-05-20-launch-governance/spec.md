# 7 天 Phase 0/1 冲刺 Spec

## Why

仓库当前处于骨架期，需要在 2026-05-27 前完成首发闭环（登录→资料→学校认证→课表→推荐→匹配→临时聊天→联系方式交换→反馈），确保 2026-06-08 微信提审窗口可用。本次冲刺聚焦「圈子和匹配」核心体验，覆盖大学以上用户的恋爱需求。

## 关键决策

| 决策       | 结论                                |
| -------- | --------------------------------- |
| 学校认证     | 中等版：学生证图片上传 + 学号填写 + 格式校验 + 管理员审核 |
| Admin    | 本计划内建简单审核页（审核列表 + 通过/拒绝）          |
| 微信 AppID | 先用测试号接入，上线前换正式                    |
| 推荐       | 规则引擎替代 stub AI 卡片                 |
| 数据库      | 冻结前保持 mock，冻结日切真实 DB              |

## What Changes

### Day 0 (05-20) — 治理底座

* 创建 `main` 分支并配置受保护分支规则

* 设置 CI status checks 为 blocking（npm test / mvn test / flyway validate / spectral lint / gitleaks）

* 新增 Flyway 迁移 `V2026.05.20.0000__school_verification.sql`，建立 `verification_request` 表

### Day 1-2 (05-21 \~ 05-22) — 认证 + 学校验证

* **BREAKING**: Client 接入 WeChat SDK 测试号，`POST /auth/wechat-login` 调真实 code2Session

* 资料完善加字段校验 + avatar 上传端点 + loading/error 状态

* 学校认证全链路：学生证图片上传 + 学号输入 → API 文件上传 + 认证提交 → Admin 待审列表 + 通过/拒绝

### Day 3 (05-23) — 课表 + 推荐

* **BREAKING**: 课表编辑器支持增删改 courseBlocks，不再硬编码

* **BREAKING**: 推荐从 stub AI 卡片切换为规则引擎（基于空闲时间 + 学校 + 地点 + 话题偏好排序）

* 首页替换"AI 关闭"卡片为"今日推荐人选"

### Day 4 (05-24) — 匹配状态机

* 话题匹配表单 pill 可点击选择 + 提交

* MatchTicket 从 Controller/Service 中提取为独立状态机类

* 队列管理：超时/拒绝/匹配成功全闭环

### Day 5 (05-25) — 聊天 + 联系方式交换

* 联系方式从"仅能同意"升级为可主动提议交换

* API 添加 `@ControllerAdvice` 统一错误处理 + 结构化错误 JSON

* Client UI 补齐 Loading/Error/Empty/审核失败态

### Day 6 (05-26) — 联调 + 测试

* 页面守卫全开：`requiresProfile/Campus/Schedule = true`，软引导变硬门禁

* 补测试：feedback store、chat store、home store、AppShell、弱网/重试

* 全链路 smoke：登录→资料→学校认证→课表→推荐→匹配→聊天→交换→反馈

### Day 7 (05-27) — 冻结准备

* DB 验证：切 `application-db.yml` Profile，Flyway migrate，全链路在 MySQL 上跑通

* Admin 审核页完成并验证

* P0/P1 清零，CI 全绿

* 切 `release/2026-06-08` 分支

## Impact

* Affected specs: 2026-05-19-ui-redesign（UI 层改动需保持一致）

* Affected code: `apps/client/**`、`apps/api/**`、`apps/admin/**`、`database/flyway/**`、`docs/openapi/**`、`.github/**`

## ADDED Requirements

### Requirement: 学校认证中等版

系统 SHALL 支持学生证图片上传 + 学号填写 + 格式校验 + 管理员审核的完整认证流程。

#### Scenario: 用户提交学校认证

* **WHEN** 用户上传学生证图片并填写学号

* **THEN** 系统创建 `verification_request` 记录（状态=draft），图片存储到私有存储，管理员可在 Admin 页查看并执行通过/拒绝操作

#### Scenario: 认证被拒绝

* **WHEN** 管理员拒绝认证申请

* **THEN** 用户看到拒绝原因，可重新提交

### Requirement: 规则引擎推荐

系统 SHALL 基于空闲时间 + 学校 + 地点 + 话题偏好进行规则排序推荐，不依赖 AI 模型。

#### Scenario: 首页推荐展示

* **WHEN** 用户打开首页

* **THEN** `GET /home/dashboard` 返回基于规则排序的推荐人选列表，无 AI 术语残留

### Requirement: Admin 简单审核页

系统 SHALL 提供审核列表 + 通过/拒绝操作的简单 Admin 页面。

#### Scenario: 管理员审核认证

* **WHEN** 管理员登录 Admin 页面

* **THEN** 可查看待审认证列表，对每条记录执行通过或拒绝操作

### Requirement: WeChat 测试号登录

系统 SHALL 在提审前使用微信测试号接入，code2Session 仅在服务端执行。

#### Scenario: 微信登录流程

* **WHEN** 用户点击微信登录

* **THEN** Client 调用 wx.login 获取 code，POST 到服务端完成 code2Session 交换，返回会话

### Requirement: Flyway school\_verification 迁移

系统 SHALL 新增 `verification_request` 表，包含用户ID、学号、图片路径、状态、审核备注字段。

#### Scenario: 数据库迁移

* **WHEN** 运行 Flyway migrate

* **THEN** `verification_request` 表创建成功，字段完整

## MODIFIED Requirements

### Requirement: 课表编辑器（原为硬编码 courseBlocks）

课表编辑器 SHALL 支持星期/节次选择器，用户可增删改 courseBlocks，不再硬编码。

#### Scenario: 用户编辑课表

* **WHEN** 用户在课表页添加/修改/删除课程块

* **THEN** 数据持久化到服务端，`GET /profile/schedule` 返回最新数据

### Requirement: 匹配状态机（原为 Controller 内联逻辑）

MatchTicket SHALL 作为独立状态机类存在，包含 queued/connected/expired 三态及完整迁移测试。

#### Scenario: 匹配超时

* **WHEN** 匹配排队超过时限

* **THEN** 状态迁移为 expired，用户收到超时提示

### Requirement: 联系方式交换（原为仅能同意）

联系方式交换 SHALL 支持任意一方主动提议交换，双方同意后完成。

#### Scenario: 主动提议交换

* **WHEN** 用户在临时聊天中点击"交换联系方式"

* **THEN** 对方收到交换请求，可选择接受或拒绝

### Requirement: 统一错误处理

API SHALL 使用 `@ControllerAdvice` 提供结构化错误 JSON 响应。

#### Scenario: API 异常

* **WHEN** 服务端发生任何未捕获异常

* **THEN** 返回结构化 JSON `{ error: string, message: string }`，HTTP 状态码正确

### Requirement: 页面守卫（原为软引导）

页面守卫 SHALL 将 `requiresProfile/Campus/Schedule` 设为 `true`，软引导变硬门禁。

#### Scenario: 未完善资料用户访问受限页面

* **WHEN** 用户未完成资料/学校/课表访问需要这些信息的功能

* **THEN** 系统重定向到对应的资料完善页，不允许跳过

## 关键约束

* 每个 PR 不超过 500 行有效改动，超了按领域拆分

* `auth`、`matches`、`temp-chat`、`database/flyway` 改动需要 2 人审

* 改接口先改 OpenAPI → 改实现 → 改调用方

* 每晚 `verify:phase01` 全量通过

* 讨论圈/活动仅保留预览/只读，不进入首发验收主链路

