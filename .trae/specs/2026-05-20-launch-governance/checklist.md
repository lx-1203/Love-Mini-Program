# Checklist

## Day 0 — 治理底座

- [ ] `main` 分支已创建并推送到远程
- [ ] `main` 分支受保护：禁止直推、force-push、自审自合
- [ ] CI status checks 设为 blocking：npm test / mvn test / flyway validate / spectral lint / gitleaks
- [ ] Flyway `V2026.05.20.0000__school_verification.sql` 迁移可执行
- [ ] `verification_request` 表字段完整：id、user_id、student_id、image_path、status、review_notes、created_at、updated_at
- [ ] PR 模板包含所有强制字段（Phase/模块/用户影响/DB影响/隐私影响/回滚方案/验证证据/非首发范围）
- [ ] `.github/CODEOWNERS` 覆盖 `apps/admin/**` 和双审路径

## Day 1-2 — 认证 + 学校验证

- [ ] Client 端接入 WeChat JS-SDK（测试号）
- [ ] `POST /auth/wechat-login` code2Session 仅在服务端执行
- [ ] 授权拒绝后有回退路径，无死路
- [ ] 资料完善页包含字段校验（昵称长度、bio 限制等）
- [ ] `POST /profile/avatar` 可用
- [ ] 学生证图片上传页可用
- [ ] 学号输入和格式校验可用
- [ ] `POST /profile/campus/verify` 创建认证请求
- [ ] Admin 待审列表 `GET /admin/verifications` 可用
- [ ] Admin 通过/拒绝操作可用
- [ ] OpenAPI 包含学校认证相关 schema
- [ ] PR `feature/p0-auth-school-verification` 合并到 main

## Day 3 — 课表 + 推荐

- [ ] 课表编辑器支持增删改 courseBlocks
- [ ] 不再有硬编码 courseBlocks
- [ ] `PUT /profile/schedule` 持久化可用
- [ ] `RecommendationService` 基于空闲时间+学校+地点+话题偏好排序
- [ ] 无 ChatGPT/AI 术语残留
- [ ] 首页"AI 关闭"卡片已替换为"今日推荐人选"
- [ ] `GET /home/dashboard` 返回规则排序推荐
- [ ] PR `feature/p0-schedule-recommendation` 合并到 main

## Day 4 — 匹配状态机

- [ ] 匹配表单 pill 可点击选择话题
- [ ] `POST /matches` 提交带话题匹配请求
- [ ] 匹配结果页展示话题标签和状态
- [ ] `MatchTicket` 为独立状态机类
- [ ] queued/connected/expired 三态合法转换
- [ ] 状态迁移测试覆盖所有合法转换和非法拒绝
- [ ] 队列超时自动 expired
- [ ] PR `feature/p1-match-topic-machine` 合并到 main

## Day 5 — 聊天 + 联系方式交换

- [ ] Client 端可主动提议交换联系方式
- [ ] 对方可接受/拒绝交换请求
- [ ] 双向同意后才暴露真实联系方式
- [ ] `@ControllerAdvice` 全局异常处理器存在
- [ ] 结构化错误 JSON `{ error, message }` 格式
- [ ] 覆盖 400/401/403/404/500 错误场景
- [ ] 聊天详情页 Loading/Error/Empty 态完整
- [ ] 匹配页审核失败态完整
- [ ] 首页离线态/重试态完整
- [ ] PR `feature/p1-chat-contact-exchange` 合并到 main

## Day 6 — 联调 + 测试

- [ ] `requiresProfile = true` 生效，未完成跳转资料页
- [ ] `requiresCampus = true` 生效，未完成跳转认证页
- [ ] `requiresSchedule = true` 生效，未完成跳转课表页
- [ ] feedback store 单元测试存在
- [ ] chat store 单元测试存在
- [ ] home store 单元测试存在
- [ ] AppShell 组件测试存在
- [ ] 弱网/重试场景测试存在
- [ ] 全链路 smoke：登录→资料→认证→课表→推荐→匹配→聊天→交换→反馈 mock 模式通过
- [ ] 全链路 smoke：real 模式通过
- [ ] `npm test` 全量通过
- [ ] PR `chore/p0-full-funnel-guard-tests` 合并到 main

## Day 7 — 冻结准备

- [ ] `application-db.yml` Profile 切换成功
- [ ] Flyway migrate 在 MySQL 上执行成功
- [ ] 全链路在 MySQL 上跑通
- [ ] Admin 审核列表页 UI 完成
- [ ] Admin 通过/拒绝操作正常
- [ ] Admin 审核备注填写和展示正常
- [ ] P0/P1 缺陷清零
- [ ] CI 全绿
- [ ] `npm run verify:phase01` 全量通过
- [ ] `release/2026-06-08` 分支已创建

## 关键约束验证

- [ ] 所有 PR 有效改动 ≤ 500 行
- [ ] auth/match/temp-chat/database/flyway 改动均经过 2 人审
- [ ] 接口变更先改 OpenAPI → 改实现 → 改调用方
- [ ] 讨论圈/活动仅保留预览/只读，无半成品暴露