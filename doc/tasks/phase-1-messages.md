# Phase 1 — 消息模块 — 任务清单

## 模块概述
实现私信系统 + 临时匿名聊天 + 系统通知：WebSocket 实时推送、会话管理、24h 临时聊天、联系方式交换、通知分类。

## 依赖关系
- **上游依赖**：phase-0-auth、phase-1-likes（心跳信号→开聊→私信）
- **下游被依赖**：无

## 任务列表

- [ ] **T001: 实现 WebSocket 连接管理**
  - 输入：`config/WebSocketConfig.java`、`chat/MessageWebSocketHandler.java`
  - 输出：WebSocket 连接认证（JWT 验证）、心跳保活、断线重连
  - 验收：WS 连接成功，JWT 无效时拒绝连接
  - 测试命令：`npm run api:test`（WebSocket 集成测试）

- [ ] **T002: 实现私信会话 + 消息服务**
  - 输入：`chat/PrivateMessageService.java` → `RealPrivateMessageService.java` / `MockPrivateMessageService.java`
  - 输出：GET `/api/chat/conversations`（会话列表）、GET `/api/chat/conversations/{id}/messages`（消息历史）、POST `/api/chat/conversations/{id}/messages`（发送）
  - 验收：消息实时推送、已读回执、分页加载历史
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现临时匿名聊天服务**
  - 输入：`chat/TempChatService.java`
  - 输出：创建临时会话（24h过期）、发送消息（匿名）、联系方式交换（双向确认）
  - 验收：24h倒计时正确、超时自动关闭、联系方式交换需双方确认
  - 测试命令：`npm run api:test`

- [ ] **T004: 实现系统通知服务**
  - 输入：`chat/NotificationService.java`
  - 输出：GET `/api/notifications`（分类列表）、PUT `/api/notifications/{id}/read`（标记已读）
  - 验收：喜欢/访客/评论/关注/匹配通知自动生成，跳转链接正确
  - 测试命令：`npm run api:test`

- [ ] **T005: 实现前端消息列表页**
  - 输入：`apps/client/src/pages/messages/index.vue`、`apps/client/src/stores/messages.ts`
  - 输出：心动信号 Banner（顶部）+ 私信会话列表 + 系统通知入口
  - 验收：Banner 倒计时实时更新、会话列表按最后消息时间排序、未读红点
  - 测试命令：`npm run test:client`

- [ ] **T006: 实现前端聊天详情页**
  - 输入：`apps/client/src/pages/chat-session/index.vue`、`apps/client/src/stores/chat.ts`、`apps/client/src/services/websocket.ts`
  - 输出：聊天界面（文字+图片消息）、消息气泡、已读状态、实时推送
  - 验收：消息即时显示、WebSocket 断线重连、临时聊天24h倒计时展示
  - 测试命令：`npm run test:client`

- [ ] **T007: 实现前端聊天组件**
  - 输入：`apps/client/src/components/chat/ChatBubble.vue`、`ChatItem.vue`、`VoicePill.vue`、`IcebreakerSuggestions.vue`
  - 输出：消息气泡组件、会话项组件、语音组件、破冰建议组件
  - 验收：各组件 Mock/Real 模式渲染一致
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| WebSocket 连接管理 | ⏳ |
| 私信会话+消息 | ⏳ |
| 临时匿名聊天 | ⏳ |
| 系统通知 | ⏳ |
| 前端消息列表页 | ⏳ |
| 前端聊天详情页 | ⏳ |
| 前端聊天组件 | ⏳ |
