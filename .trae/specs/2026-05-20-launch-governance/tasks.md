# Tasks

## Day 0 (05-20) — 治理底座

- [ ] Task 0.1: 初始化 Git 仓库并创建 main 分支
  - [ ] SubTask 0.1.1: `git init` + `git add -A` + `git commit -m "chore: initial monorepo skeleton"`
  - [ ] SubTask 0.1.2: `git branch -M main`
  - [ ] SubTask 0.1.3: 推送 `main` 到远程仓库
  - **验证**：远程仓库可见 main 分支，包含全部代码

- [ ] Task 0.2: 配置 GitHub 受保护分支规则
  - [ ] SubTask 0.2.1: 在仓库 Settings → Branches 添加 `main` 保护规则
  - [ ] SubTask 0.2.2: 勾选 "Require a pull request before merging"、"Require approvals"（auth/match/temp-chat/database 路径 2 人审，其他 1 人审）
  - [ ] SubTask 0.2.3: 勾选 "Require status checks to pass before merging"（npm test / mvn test / flyway validate / spectral lint / gitleaks）
  - [ ] SubTask 0.2.4: 勾选 "Do not allow bypassing the above settings"（禁止管理员绕过）
  - [ ] SubTask 0.2.5: 禁止 force-push、禁止直推
  - **验证**：尝试直推 main 被拒绝

- [ ] Task 0.3: 确认 CI status checks 为 blocking
  - [ ] SubTask 0.3.1: 确认 `.github/workflows/ci.yml` 包含 verify-phase01、flyway-validate、secret-scan 三个 job
  - [ ] SubTask 0.3.2: 确认 CI 在 PR 触发时全部通过才允许合并
  - [ ] SubTask 0.3.3: 如 CI 不存在则补全（当前已有完整 ci.yml）
  - **验证**：创建一个测试 PR，确认 CI 运行且不绿不能合

- [ ] Task 0.4: 新增 Flyway 迁移 `V2026.05.20.0000__school_verification.sql`
  - [ ] SubTask 0.4.1: 创建 `database/flyway/sql/V2026.05.20.0000__school_verification.sql`
  - [ ] SubTask 0.4.2: 定义 `verification_request` 表：`id`(bigint PK)、`user_id`(varchar)、`student_id`(varchar)、`image_path`(varchar)、`status`(enum: pending/approved/rejected)、`review_notes`(varchar)、`created_at`、`updated_at`
  - [ ] SubTask 0.4.3: 更新 OpenAPI 添加 `SchoolVerification` schema（如需要新接口）
  - **验证**：`run-flyway.cmd migrate` 成功创建表

- [ ] Task 0.5: 升级 PR 模板
  - [ ] SubTask 0.5.1: 更新 `.github/pull_request_template.md`，补充 Phase、模块、用户影响、DB/Flyway 影响、隐私/安全影响、回滚方案、验证证据、"是否触及非首发范围"字段
  - [ ] SubTask 0.5.2: 添加 PR 标题格式校验 `<type>(<scope>): <summary>` 和 500 行上限说明
  - **验证**：新 PR 模板包含所有强制字段

- [ ] Task 0.6: 强化 CODEOWNERS
  - [ ] SubTask 0.6.1: 补充 `apps/admin/**` 路径所有权
  - [ ] SubTask 0.6.2: 添加注释说明双审路径和紧急热修例外规则
  - **验证**：`.github/CODEOWNERS` 覆盖所有关键路径

---

## Day 1-2 (05-21 ~ 05-22) — 认证 + 学校验证

- [ ] Task 1: 微信登录 WeChat SDK 接入（PR: `feature/p0-auth-school-verification`）
  - [ ] SubTask 1.1: Client 端接入 WeChat JS-SDK 测试号
  - [ ] SubTask 1.2: `POST /auth/wechat-login` 实现真实 code2Session 调用（仅服务端）
  - [ ] SubTask 1.3: 更新 OpenAPI 添加微信登录相关 schema（如缺失）
  - [ ] SubTask 1.4: 添加授权拒绝回退路径（无死路）
  - **验证**：mock/real 双模式微信登录流程可用

- [ ] Task 2: 资料完善增强
  - [ ] SubTask 2.1: 添加字段校验（昵称长度、bio 限制等）
  - [ ] SubTask 2.2: 添加 avatar 上传端点 `POST /profile/avatar`
  - [ ] SubTask 2.3: 补全 loading/error 状态
  - [ ] SubTask 2.4: 更新 OpenAPI 添加 avatar 上传 schema
  - **验证**：资料完善页全字段校验 + avatar 上传可用

- [ ] Task 3: 学校认证全链路
  - [ ] SubTask 3.1: Client 端学生证图片上传页 + 学号输入
  - [ ] SubTask 3.2: API 文件上传端点 `POST /profile/campus/verify`
  - [ ] SubTask 3.3: API 认证提交逻辑（关联 verification_request 表）
  - [ ] SubTask 3.4: Admin 端待审列表 `GET /admin/verifications`
  - [ ] SubTask 3.5: Admin 端通过/拒绝操作 `POST /admin/verifications/{id}/approve`、`POST /admin/verifications/{id}/reject`
  - [ ] SubTask 3.6: 更新 OpenAPI 添加学校认证相关 schema
  - **验证**：上传学生证→提交→Admin 审核→通过/拒绝全链路可用

---

## Day 3 (05-23) — 课表 + 推荐

- [ ] Task 4: 课表编辑器（PR: `feature/p0-schedule-recommendation`）
  - [ ] SubTask 4.1: Client 端星期/节次选择器组件，支持增删改 courseBlocks
  - [ ] SubTask 4.2: 移除硬编码 courseBlocks
  - [ ] SubTask 4.3: API `PUT /profile/schedule` 持久化课表数据
  - **验证**：用户可自由增删改课表块，刷新后数据保留

- [ ] Task 5: 规则引擎推荐
  - [ ] SubTask 5.1: API `RecommendationService` 实现基于空闲时间 + 学校 + 地点 + 话题偏好的排序逻辑
  - [ ] SubTask 5.2: 移除 ChatGPT/AI 相关术语和代码
  - [ ] SubTask 5.3: `GET /home/dashboard` 返回规则排序的推荐人选
  - [ ] SubTask 5.4: 首页替换"AI 关闭"卡片为"今日推荐人选"（结构一致）
  - **验证**：首页推荐列表基于用户资料动态排序，无 AI 术语

---

## Day 4 (05-24) — 匹配状态机

- [ ] Task 6: 话题匹配交互（PR: `feature/p1-match-topic-machine`）
  - [ ] SubTask 6.1: Client 端匹配表单 pill 可点击选择话题
  - [ ] SubTask 6.2: `POST /matches` 提交带话题的匹配请求
  - [ ] SubTask 6.3: 匹配结果页展示话题标签和匹配状态
  - **验证**：选择话题→提交匹配→看到结果完整可用

- [ ] Task 7: MatchTicket 独立状态机
  - [ ] SubTask 7.1: 从 Controller/Service 中提取 `MatchTicket` 独立类
  - [ ] SubTask 7.2: 实现 queued/connected/expired 三态及合法转换
  - [ ] SubTask 7.3: 补状态迁移测试（覆盖所有合法转换和非法拒绝）
  - [ ] SubTask 7.4: 队列管理：超时自动 expired、拒绝处理、匹配成功闭环
  - **验证**：`mvn test` 包含 MatchTicket 状态迁移测试且全部通过

---

## Day 5 (05-25) — 聊天 + 联系方式交换

- [ ] Task 8: 联系方式主动发起（PR: `feature/p1-chat-contact-exchange`）
  - [ ] SubTask 8.1: Client 端添加"提议交换联系方式"按钮
  - [ ] SubTask 8.2: API `POST /temp-chat/sessions/{id}/contact-exchange/propose`
  - [ ] SubTask 8.3: 对方收到交换请求，可选择接受/拒绝
  - [ ] SubTask 8.4: 双向同意后才暴露真实联系方式
  - **验证**：任意一方可主动提议交换，双方同意后完成

- [ ] Task 9: API 统一错误处理
  - [ ] SubTask 9.1: 创建 `@ControllerAdvice` 全局异常处理器
  - [ ] SubTask 9.2: 结构化错误 JSON `{ error: string, message: string }`
  - [ ] SubTask 9.3: 覆盖 400/401/403/404/500 错误场景
  - **验证**：触发各类错误均返回结构化 JSON

- [ ] Task 10: Client UI 状态补齐
  - [ ] SubTask 10.1: 聊天详情页 Loading/Error/Empty 态
  - [ ] SubTask 10.2: 匹配页审核失败态
  - [ ] SubTask 10.3: 首页离线态/重试态
  - **验证**：每个核心页面 5 态完整

---

## Day 6 (05-26) — 联调 + 测试

- [ ] Task 11: 页面守卫全开（PR: `chore/p0-full-funnel-guard-tests`）
  - [ ] SubTask 11.1: `requiresProfile = true`（需完成基础资料）
  - [ ] SubTask 11.2: `requiresCampus = true`（需完成学校认证）
  - [ ] SubTask 11.3: `requiresSchedule = true`（需完成课表录入）
  - [ ] SubTask 11.4: 软引导变硬门禁，未完成时跳转到对应完善页
  - **验证**：未完善资料/学校/课表时无法跳过进入受限页面

- [ ] Task 12: 补测试
  - [ ] SubTask 12.1: feedback store 单元测试
  - [ ] SubTask 12.2: chat store 单元测试
  - [ ] SubTask 12.3: home store 单元测试
  - [ ] SubTask 12.4: AppShell 组件测试
  - [ ] SubTask 12.5: 弱网/重试场景测试
  - **验证**：`npm test` 全量通过

- [ ] Task 13: 全链路 smoke
  - [ ] SubTask 13.1: 登录→资料完善→学校认证→课表录入→推荐→匹配→聊天→交换→反馈
  - [ ] SubTask 13.2: 在 mock 模式下完整走通
  - [ ] SubTask 13.3: 在 real 模式下完整走通
  - **验证**：两端 smoke 全部通过

---

## Day 7 (05-27) — 冻结准备

- [ ] Task 14: DB 真实验证
  - [ ] SubTask 14.1: 切换 Profile 为 `application-db.yml`
  - [ ] SubTask 14.2: Flyway migrate 在 MySQL 上执行
  - [ ] SubTask 14.3: 全链路在 MySQL 上跑通
  - **验证**：所有功能在真实 DB 环境下正常

- [ ] Task 15: Admin 审核页完成
  - [ ] SubTask 15.1: 待审列表页 UI 完成
  - [ ] SubTask 15.2: 通过/拒绝操作验证
  - [ ] SubTask 15.3: 审核备注填写和展示
  - **验证**：Admin 审核全流程可用

- [ ] Task 16: 冻结前收口
  - [ ] SubTask 16.1: P0/P1 缺陷清零
  - [ ] SubTask 16.2: CI 全绿
  - [ ] SubTask 16.3: `npm run verify:phase01` 全量通过
  - [ ] SubTask 16.4: `git checkout -b release/2026-06-08`
  - **验证**：release 分支创建，所有门禁通过

# Task Dependencies

- Task 0.2 依赖 Task 0.1（先有 main 分支才能配置保护）
- Task 0.4 可与 Task 0.1-0.3 并行（Flyway 迁移独立）
- Task 0.5、0.6 可与 Task 0.1-0.4 并行
- Task 1-3 严格按 Day 1-2 内顺序（登录→资料→认证）
- Task 4-5 严格按 Day 3 内顺序（课表→推荐，推荐依赖课表空闲时间数据）
- Task 6-7 严格按 Day 4 内顺序（先交互再状态机）
- Task 8-10 严格按 Day 5 内顺序（先功能再错误处理再 UI）
- Task 11-13 严格按 Day 6 内顺序（先守卫再测试再 smoke）
- Task 14-16 严格按 Day 7 内顺序（先 DB 再 Admin 再收口）
- Day 1-2 完成后才能开始 Day 3，依此类推