# API 契约文档（前后端接口约定）

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.1.3
> 维护者：后端 Lead & 前端 Lead
> 最近更新：2026-07-27
> 配套文档：
> - `docs/OPENAPI-ANNOTATION-GUIDE.md`：OpenAPI 注解补全指南
> - `docs/openapi/*.yaml`：分模块 OpenAPI Schema 定义（权威源）
> - 在线 Swagger UI：`/swagger-ui.html`（生产环境仅 ADMIN 可访问）

---

## 0. 一致性声明与权威源

本文档下的端点清单与下列来源保持一致；若任何来源之间出现差异，按下列优先级判定权威源：

1. `docs/openapi/*.yaml`（OpenAPI Schema，最高权威）
2. `apps/api/src/main/java/com/campuslove/api/**/*Controller.java` 中的 `@RequestMapping` / `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` 注解
3. 本文档（`docs/API-CONTRACT.md`）

> 当本文档与 OpenAPI YAML 或 Controller 注解不一致时：
> - 以 OpenAPI YAML 为准。
> - 若 YAML 缺失，以 Controller 注解为准。
> - 请在 PR 中提交 issue 标注差异点，并在合并后更新本文档与 YAML，禁止单方面修改本文档。
> - 复核脚本：`pnpm run lint:openapi`（OpenAPI YAML 结构校验）+ `pnpm run lint:openapi:spectral`（Spectral 规范 lint）+ `pnpm run generate:openapi`（前端类型生成）+ `pnpm run verify:client-builds`（多端构建验证）。

### 0.1 当前已知差异（待修复，禁止视为"已实现"）

下列端点在本文档与 OpenAPI YAML / Controller 注解间存在差异，已在 REAUDIT-REPORT-100+ 第 3.5 节编号 112 跟踪。在差异修复前，前端调用必须以 OpenAPI YAML / Controller 注解为准：

| 域 | 本文档当前描述 | OpenAPI YAML / 代码实际路径 | 处理建议 |
|---|---|---|---|
| Auth | `POST /api/v1/auth/wechat` | `POST /api/v1/auth/wechat-login`（`AuthController`） + `POST /api/v1/auth/wechat`（`WechatAuthController`） | 双端点并存，前端按 YAML 使用 `/auth/wechat-login` |
| Third-party Auth | `GET /api/v1/auth/third-party` | `GET /api/v1/auth/third-party/bindings` | 按 YAML 更新 |
| Match | `POST /api/v1/matches/like` | `POST /api/v1/likes/{userId}`（`likes.yaml`） | 按 YAML 更新 |
| Match | `POST /api/v1/matches/cancel-like` | `DELETE /api/v1/likes/{userId}` | 按 YAML 更新 |
| Village | `/api/v1/village/posts/**` | `/api/v1/posts/**`（`VillageController`） | 按 YAML 更新 |
| Chat Sessions | `/api/v1/chat/sessions/**` | `/api/v1/messages/conversations/**`（`PrivateMessageController`） | 按 Controller 更新 |
| Temp Chat | `/api/v1/chat/temp-sessions/**` | `/api/v1/temp-chat/sessions/**`（`TempChatController`） | 按 YAML 更新 |
| Feedback | `POST /api/v1/feedback` | `POST /api/v1/feedback/{issues,suggestions,activity-proposals}` + `GET /api/v1/feedback/my-submissions` | 按 YAML 更新 |
| Growth - Check-in | `/api/v1/growth/check-in/**` | `/api/v1/check-in/**`（`CheckInController`） | 按 YAML 更新 |
| Growth - Hero | `GET /api/v1/growth/hero-config` | `GET /api/v1/app-config/login-hero`（`AppConfigController`） | 按 YAML 更新 |
| Growth - DND | `/api/v1/growth/do-not-disturb` | `/api/v1/dnd`（`DoNotDisturbController`） | 按 Controller 更新 |
| AI | `POST /api/ai/video/generate`（不带 v1） | `POST /api/v1/ai/video/generate`（`AiVideoController`） | 按 Controller 更新（带 v1） |
| Notifications | `/api/v1/chat/notifications` | `/api/v1/notifications`（`NotificationController`） | 按 YAML 更新 |
| Voice Message | `/api/v1/chat/sessions/{id}/voice` | `/api/v1/chat/voice`（`VoiceMessageController`） | 按 Controller 更新 |
| Video Call | `/api/v1/chat/video-calls/**` | `/api/v1/chat/video-call/{start,end,records}`（`VideoCallController`） | 按 Controller 更新 |
| Reports | `POST /api/v1/reports` | `POST /api/v1/posts/{id}/report`（`PostReportController`） | 按 Controller 更新（按帖子维度） |

> 修复计划：R4-02102 已按现有 Controller 映射重建第 3 节接口清单（与代码对齐）；
> OpenAPI YAML 覆盖仍有缺口（vip / campus / media / config / home / admin 等模块
> 尚无独立 YAML，docs/openapi 现有 8 个文件，R4-02105），后续由后端 Lead
> 主导按模块补齐 YAML 后，第 3 节以 YAML 为最高权威源继续同步。

---

## 1. 总则

### 1.1 契约优先（Contract-First）

本项目采用 **契约优先** 协作模式：

1. **新增/修改接口** 必须先在 `docs/openapi/<module>.yaml` 或 Controller 上的 OpenAPI 注解中定义
2. 后端按注解实现 Controller，前端按 `apps/client/src/services/generated/api-types.ts`（由 `npm run generate:openapi` 生成）实现调用
3. PR 评审阶段必须同时检查注解、Schema、前端类型一致性
4. 任何 breaking change 必须先在 CHANGELOG.md 登记，并按 §9 灰度策略发布

### 1.2 版本化策略

- API 路径前缀：`/api/v1/**`（v1 为当前主版本）
- 引入不兼容变更时新增 `/api/v2/**`，v1 至少维持 6 个月兼容期
- 兼容期内 v1 端点保留，但响应可附加 `deprecation` 字段提示前端迁移
- AI 接口与其他业务接口一致使用 `/api/v1/ai/**` 版本化前缀（`AiVideoController` 实为 `@RequestMapping("/api/v1/ai")`，R4-02103 修正旧版「/api/ai/** 不带版本号」的错误声明）

### 1.3 响应包装

所有业务接口统一返回 `ApiResponse<T>`：

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": { ... },
  "traceId": "a1b2c3d4-e5f6-7890"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 业务状态码，`OK` 表示成功；其他见 §4 错误码表 |
| `message` | string | ✅ | 人类可读消息（i18n 后端 MessageSource） |
| `data` | T \| null | ✅ | 业务数据，失败时为 null |
| `traceId` | string | ✅ | 请求追踪 ID，与响应头 `X-Trace-Id` 一致 |

例外：媒体二进制流接口（`GET /api/v1/media/{userId}/**`）直接返回 `application/octet-stream`，不走 ApiResponse 包装。

### 1.4 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 业务成功 |
| 201 | Created | 资源创建成功（POST 新建） |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 参数校验失败 / 业务规则不满足 |
| 401 | Unauthorized | 未携带/无效/已撤销 JWT |
| 403 | Forbidden | 已认证但无权限（如访问他人媒体） |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 乐观锁冲突 / 唯一约束冲突 |
| 413 | Payload Too Large | 上传文件超限 |
| 422 | Unprocessable Entity | 业务校验失败（如已签到） |
| 429 | Too Many Requests | 触发限流 |
| 500 | Internal Server Error | 服务端异常（生产环境返回通用消息） |
| 502 | Bad Gateway | 第三方服务故障（微信 API 等） |
| 503 | Service Unavailable | 熔断器打开 |

---

## 2. 鉴权约定

### 2.1 JWT Bearer Token

- 请求头：`Authorization: Bearer <token>`
- 例外：媒体二进制接口支持 `?token=<token>` 查询参数（用于 `<image src>` 标签无法携带 Header）
- Token 有效期：Access Token **24 小时**（修复 R4-00490：与 docker-compose / .env.example 的
  `JWT_EXPIRATION_MS=86400000` 默认值一致，原契约「2 小时」与实现失配）；
  当前无 Refresh Token 机制（历史契约「Refresh Token 30 天」不成立——登录仅签发单 JWT）
- Token 撤销：退出登录时主动写入 Redis 黑名单（Key=`jwt:blacklist:{jti}`，TTL=剩余有效期）
- ⚠️ 已知缺口（R4-00490）：管理端（apps/admin）无 token 静默续期机制，
  `http.ts` 收到 401 直接清库跳登录——管理员 token 到期（24h）后会被强制登出，
  需在管理端补「401 静默续期/重登引导」后方可消除

### 2.2 鉴权流程

```
客户端                         后端                         Redis
  │  ─── Authorization ──────▶  │                            │
  │                              │  ── 查 jti 黑名单 ──────▶  │
  │                              │  ◀───── miss ───────────  │
  │                              │  ── 校验签名+exp ──        │
  │                              │  ── 加载 User ───         │
  │                              │  ── 注入 SecurityCtx ──   │
  │  ◀──── 200/401 ────────────  │                            │
```

### 2.3 安全要求

- 所有写接口**后端要求**携带 `Idempotency-Key` 请求头（缺失返回 400「缺少 Idempotency-Key 请求头」），
  后端 Redis 去重 24h。注入现状（修复 R4-00490 标注）：
  - ✅ 客户端（apps/client）：`services/http.ts` 拦截器统一注入——
    调用方未显式设置时自动生成稳定幂等键（签到/充值/活动报名/解锁等显式键不覆盖）；
  - ⚠️ 管理端（apps/admin）：全部写请求**未注入** Idempotency-Key（B3-4 待修），
    弱网重试/双击时资金类操作（钱包调整、批量兑换码）存在重复执行风险
- 限流：登录 5次/分钟、上传 30桶/秒补 1、喜欢 60桶/秒补 2、发帖 10次/分钟
- CORS：`allowedOriginPatterns` 由 `app.cors.allowed-origins` 注入，生产环境仅允许 H5 域名
- CSRF：JWT 模式天然免疫 CSRF，不使用 Cookie

---

## 3. 接口清单（按业务域）

> 完整 OpenAPI Schema 见 `/swagger-ui.html` 或 `docs/openapi/*.yaml`。本节列出端点摘要。

### 3.1 认证域（Auth）

> R4-02102：按 `AuthController` / `WechatAuthController` / `ThirdPartyAuthController` 实际映射重建。

| Method | Path | 鉴权 | 描述 | operationId |
|--------|------|------|------|-------------|
| POST | `/api/v1/auth/register` | ❌ | 手机号注册 | `register` |
| POST | `/api/v1/auth/phone-login` | ❌ | 手机号密码登录 | `phoneLogin` |
| POST | `/api/v1/auth/guest-login` | ❌ | 游客登录 | `guestLogin` |
| POST | `/api/v1/auth/wechat-login` | ❌ | 微信 code 登录（主入口） | `wechatLogin` |
| POST | `/api/v1/auth/wechat` | ❌ | 微信登录（WechatAuthController） | `wechatLogin` |
| POST | `/api/v1/auth/admin/login` | ❌ | 管理员密码登录 | `adminLogin` |
| POST | `/api/v1/auth/admin/logout` | ✅ | 管理员退出登录 | `adminLogout` |
| GET | `/api/v1/auth/me` | ✅ | 获取当前会话 | `getCurrentSession` |
| POST | `/api/v1/auth/refresh` | ✅ | 刷新 Token | `refreshToken` |
| POST | `/api/v1/auth/logout` | ✅ | 退出登录（撤销 Token） | `logout` |
| GET | `/api/v1/auth/third-party/bindings` | ✅ | 查询第三方绑定 | `getThirdPartyBindings` |
| POST | `/api/v1/auth/third-party/wechat` | ✅ | 绑定微信 | `bindWechat` |
| POST | `/api/v1/auth/third-party/apple` | ✅ | 绑定 Apple | `bindApple` |
| POST | `/api/v1/auth/third-party/bind` | ✅ | 绑定第三方账号 | `bindThirdParty` |
| DELETE | `/api/v1/auth/third-party/unbind` | ✅ | 解绑第三方 | `unbindThirdParty` |

**关键 Schema**：

```typescript
interface UserSessionView {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  vipStatus: 'free' | 'vip';
  vipExpireAt: string | null;  // ISO 8601
  profileCompletion: number;   // 0-100
  roles: ('USER' | 'ADMIN')[];
  loginAt: string;
}
```

### 3.2 匹配与社交域（Match）

> R4-02102：按 `MatchController`（`/api/v1/matches`）实际映射重建（原 `/matches/icebreakers` 实为 `/matches/{matchId}/icebreakers`）。

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/matches/form-config` | ✅ | 匹配表单配置 |
| POST | `/api/v1/matches` | ✅ | 创建匹配请求 |
| POST | `/api/v1/matches/quick` | ✅ | 快速匹配 |
| GET | `/api/v1/matches/{id}` | ✅ | 匹配详情 |
| POST | `/api/v1/matches/like` | ✅ | 喜欢用户（右滑） |
| POST | `/api/v1/matches/super-like` | ✅ | 超级喜欢（不受普通喜欢日上限约束，独立配额默认 10 次/日） |
| POST | `/api/v1/matches/cancel-like` | ✅ | 取消喜欢 |
| POST | `/api/v1/matches/pass` | ✅ | 跳过用户（左滑） |
| POST | `/api/v1/matches/rewind` | ✅ | 反悔上次操作（每日 1 次） |
| GET | `/api/v1/matches/liked-me` | ✅ | 喜欢我的列表 |
| GET | `/api/v1/matches/my-likes` | ✅ | 我喜欢的列表 |
| GET | `/api/v1/matches/visitors` | ✅ | 访客列表 |
| POST | `/api/v1/matches/visit` | ✅ | 记录访客 |
| PUT | `/api/v1/matches/visitors/{id}/read` | ✅ | 访客记录标记已读 |
| GET | `/api/v1/matches/heart-signals` | ✅ | 心动的信号（匹配结果）列表 |
| POST | `/api/v1/matches/heart-signals/{id}/accept` | ✅ | 接受信号 |
| POST | `/api/v1/matches/heart-signals/{id}/decline` | ✅ | 拒绝信号 |
| GET | `/api/v1/matches/{matchId}/icebreakers` | ✅ | 破冰话题 |

### 3.3 推荐域（Recommendation）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/recommendations` | ✅ | 推荐列表（分页） |
| POST | `/api/v1/recommendations/swipe` | ✅ | 上报滑动（左滑/右滑） |
| GET | `/api/v1/recommendations/preferences` | ✅ | 推荐偏好 |
| PUT | `/api/v1/recommendations/preferences` | ✅ | 更新偏好 |

### 3.4 媒体域（Media）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/media/upload` | ✅ | 上传文件（image/video/background） |
| GET | `/api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}` | ✅ | 鉴权读取（支持 `?token=`） |

**上传响应**：

```typescript
interface UploadResponse {
  url: string;             // 鉴权代理路径，如 /api/v1/media/123/202607/abc.jpg
  width: number | null;
  height: number | null;
  mime: string;            // image/jpeg, video/mp4 等
  size: number;            // 字节
  durationMs: number | null;  // 视频时长
}
```

**限制**：
- 图片 ≤ 10MB，格式 JPEG/PNG/GIF/WebP
- 视频 ≤ 50MB，格式 MP4/WebM
- 照片墙最多 6 张

### 3.5 个人资料域（Profile）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/profile/stats` | ✅ | 资料统计 |
| GET | `/api/v1/profile/basic` | ✅ | 基本资料 |
| PUT | `/api/v1/profile/basic` | ✅ | 保存基本资料（向后兼容） |
| POST | `/api/v1/profile/background` | ✅ | 上传背景图 |
| POST | `/api/v1/profile/photos?index={0-5}` | ✅ | 上传照片墙 |
| DELETE | `/api/v1/profile/photos/{index}` | ✅ | 删除照片墙 |
| POST | `/api/v1/profile/video` | ✅ | 上传个人视频 |
| POST | `/api/v1/profile/half-body` | ✅ | 上传半身照 |
| GET | `/api/v1/profile/campus` | ✅ | 校园资料 |
| PUT | `/api/v1/profile/campus` | ✅ | 保存校园资料 |
| GET | `/api/v1/profile/schedule` | ✅ | 课表资料 |
| PUT | `/api/v1/profile/schedule` | ✅ | 保存课表 |
| GET | `/api/v1/profile/dto` | ✅ | 脱敏 DTO（演示用） |
| GET | `/api/v1/profile/visitors` | ✅ | 访客记录 |

### 3.6 聊天域（Chat）

> R4-02102：按 `PrivateMessageController` / `TempChatController` / `VoiceMessageController` / `NotificationController` / `VideoCallController` 实际映射重建（原 `/chat/sessions/**`、`/chat/temp-sessions/**` 为陈旧路径）。

**私信会话（`PrivateMessageController`，`/api/v1/messages/conversations`）**

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/messages/conversations` | ✅ | 会话列表 |
| POST | `/api/v1/messages/conversations` | ✅ | 新建会话 |
| GET | `/api/v1/messages/conversations/{id}/messages` | ✅ | 历史消息（分页） |
| POST | `/api/v1/messages/conversations/{id}/messages` | ✅ | 发送消息（文本/活动卡片 kind=activity） |
| PUT | `/api/v1/messages/conversations/{id}/read` | ✅ | 标记会话已读 |
| PUT | `/api/v1/messages/conversations/{id}/pin` | ✅ | 置顶会话 |
| DELETE | `/api/v1/messages/conversations/{id}` | ✅ | 删除会话 |

**临时聊天（`TempChatController`，`/api/v1/temp-chat/sessions`）**

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/temp-chat/sessions` | ✅ | 创建临时会话 |
| GET | `/api/v1/temp-chat/sessions/{id}` | ✅ | 会话详情 |
| POST | `/api/v1/temp-chat/sessions/{id}/messages` | ✅ | 发送消息 |
| POST | `/api/v1/temp-chat/sessions/{id}/contact-exchange/respond` | ✅ | 回应联系方式交换 |
| POST | `/api/v1/temp-chat/sessions/{id}/end` | ✅ | 结束会话 |
| POST | `/api/v1/temp-chat/sessions/{id}/pin` | ✅ | 置顶会话 |
| POST | `/api/v1/temp-chat/sessions/{id}/unpin` | ✅ | 取消置顶 |
| POST | `/api/v1/temp-chat/sessions/{id}/read` | ✅ | 标记已读 |
| POST | `/api/v1/temp-chat/sessions/{id}/messages/{messageId}/recall` | ✅ | 撤回消息 |

**语音消息（`VoiceMessageController`，`/api/v1/chat/voice`）**

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/chat/voice` | ✅ | 上传语音消息 |
| DELETE | `/api/v1/chat/voice/{id}` | ✅ | 删除语音消息 |

**通知（`NotificationController`，`/api/v1/notifications`）**

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/notifications/list` | ✅ | 通知列表（分页） |
| GET | `/api/v1/notifications/unread-count` | ✅ | 未读数 |
| GET | `/api/v1/notifications/count` | ✅ | 通知总数 |
| PUT | `/api/v1/notifications/{id}/read` | ✅ | 标记单条已读 |
| PUT | `/api/v1/notifications/{id}/read-with-user` | ✅ | 标记已读（含用户维度） |
| PUT | `/api/v1/notifications/read-all` | ✅ | 全部标记已读 |

**视频通话（`VideoCallController`，`/api/v1/chat/video-call`）**

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/chat/video-call/start` | ✅ | 发起视频通话 |
| POST | `/api/v1/chat/video-call/accept` | ✅ | 接听 |
| POST | `/api/v1/chat/video-call/reject` | ✅ | 拒绝 |
| POST | `/api/v1/chat/video-call/end` | ✅ | 结束通话 |
| GET | `/api/v1/chat/video-call/records` | ✅ | 通话记录 |

**WebSocket 端点**：`/ws/chat?token=<jwt>`
- 订阅 topic：`/user/queue/messages`、`/user/queue/notifications`
- 发送 topic：`/app/chat.send`

**私信活动卡片（`POST /api/v1/messages/conversations/{id}/messages`，`kind=activity`）**：

content 为 JSON（与官方号 card 消息语义一致，点击跳转活动详情）：

```json
{
  "title": "校园操场「星空告白夜」",
  "desc": "本周五晚 19:00 · 现场抽幸运观众上台告白",
  "tag": "本周活动",
  "targetUrl": "/pages/activities/detail?id=star-confession"
}
```

- 会话列表 preview 显示为「[活动] 标题」（解析失败回退「[活动] 活动卡片」）
- 前端渲染：`ActivityCard` 组件（绿粉渐变卡片 + 「查看详情」CTA），点击 `openAppPath(targetUrl)`
- 兼容性：未知 kind 前端回退 text 渲染；JSON 解析失败回退普通文本气泡

### 3.6.1 官方号域（Official Account）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/official-accounts` | ✅ | 启用官方号列表（产品助手号/活动运营号，按 sortOrder 升序） |
| GET | `/api/v1/official-accounts/{code}/messages` | ✅ | 官方号消息流（发布时间升序；text 文本 / card 活动卡片，含 CTA） |

### 3.7 校园域（Campus）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/campus/topics` | ✅ | 校园话题（分页） |
| POST | `/api/v1/campus/topics` | ✅ | 发布话题 |
| GET | `/api/v1/campus/topics/{id}` | ✅ | 话题详情 |
| POST | `/api/v1/campus/topics/{id}/replies` | ✅ | 回复话题 |
| POST | `/api/v1/campus/certification` | ✅ | 提交认证申请 |
| GET | `/api/v1/campus/certification` | ✅ | 查询认证状态 |

### 3.8 村落域（Village）

> R4-02102：`VillageController` 实际前缀为 `/api/v1/posts`（原 `/village/posts/**` 为陈旧路径）。

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/posts/campus-feed` | ✅ | 校园动态流（分页+筛选） |
| GET | `/api/v1/posts/{id}` | ✅ | 帖子详情 |
| GET | `/api/v1/posts/{id}/comments` | ✅ | 评论列表 |
| POST | `/api/v1/posts/{id}/comments` | ✅ | 发表评论 |
| POST | `/api/v1/posts/{id}/like` | ✅ | 点赞 |
| POST | `/api/v1/posts/{id}/favorite` | ✅ | 收藏 |
| POST | `/api/v1/posts/{id}/share` | ✅ | 分享 |
| POST | `/api/v1/posts/comments/{commentId}/like` | ✅ | 评论点赞 |
| GET | `/api/v1/posts/{id}/similar-authors` | ✅ | 相似作者推荐 |
| GET | `/api/v1/posts/history` | ✅ | 浏览历史 |
| DELETE | `/api/v1/posts/history` | ✅ | 清空浏览历史 |
| GET | `/api/v1/post-tags/popular?limit=5` | ✅ | 热门话题（标签聚合，含帖子数与封面图） |
| GET | `/api/v1/post-tags/posts?tagName=&page=&size=` | ✅ | 按话题标签查询帖子 |

### 3.9 圈子域（Circle）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/circles` | ✅ | 圈子列表 |
| POST | `/api/v1/circles` | ✅ | 创建圈子 |
| GET | `/api/v1/circles/{id}` | ✅ | 圈子详情 |
| POST | `/api/v1/circles/{id}/join` | ✅ | 加入圈子 |
| DELETE | `/api/v1/circles/{id}/membership` | ✅ | 退出圈子 |
| GET | `/api/v1/circles/{id}/topics` | ✅ | 圈子话题 |
| POST | `/api/v1/circles/{id}/topics` | ✅ | 发布圈子话题 |

### 3.10 活动域（Activity）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/activities` | ✅ | 活动列表 |
| GET | `/api/v1/activities/{id}` | ✅ | 活动详情 |
| POST | `/api/v1/activities/{id}/register` | ✅ | 报名活动 |
| DELETE | `/api/v1/activities/{id}/register` | ✅ | 取消报名 |

### 3.11 每日一问（DailyQuestion）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/daily-questions/today` | ✅ | 今日问题 |
| POST | `/api/v1/daily-questions/{id}/answers` | ✅ | 提交答案 |
| GET | `/api/v1/daily-questions/{id}/answers/mine` | ✅ | 我的答案 |

### 3.12 成长域（Growth）

> R4-02102：签到前缀为 `/api/v1/check-in`（`CheckInController`），免打扰为 `/api/v1/dnd`（`DoNotDisturbController`），登录页 Hero 为 `/api/v1/app-config/login-hero`（`AppConfigController`）；push-preferences 端点尚未实现，不列入契约。

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/check-in/status` | ✅ | 签到状态 |
| POST | `/api/v1/check-in/make-up` | ✅ | 补签 |
| GET | `/api/v1/growth/social-progress` | ✅ | 社交进度 |
| GET | `/api/v1/dnd` | ✅ | 免打扰设置 |
| PUT | `/api/v1/dnd` | ✅ | 更新免打扰 |
| GET | `/api/v1/app-config/login-hero` | ✅ | 登录页 Hero 配置 |

### 3.13 反馈域（Feedback）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/feedback` | ✅ | 提交反馈 |
| GET | `/api/v1/feedback/mine` | ✅ | 我的反馈列表 |
| GET | `/api/v1/feedback/{id}` | ✅ | 反馈详情 |

### 3.14 举报域（Report）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/reports` | ✅ | 提交举报 |

### 3.15 配置域（Config）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/config/campuses` | ❌ | 校区列表 |
| GET | `/api/v1/config/match-preferences` | ❌ | 匹配偏好选项 |
| GET | `/api/v1/config/filter-options` | ❌ | 筛选选项 |
| GET | `/api/v1/config/hero-banners` | ❌ | Hero Banner |
| GET | `/api/v1/config/unlock-guide-steps` | ❌ | 解锁引导步骤 |

### 3.16 首页域（Home）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/home/dashboard` | ✅ | 首页聚合数据 |

### 3.17 用户域（User）

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/users/{id}` | ✅ | 用户公开资料 |
| GET | `/api/v1/users/{id}/posts` | ✅ | 用户帖子 |
| POST | `/api/v1/users/{id}/follow` | ✅ | 关注 |
| DELETE | `/api/v1/users/{id}/follow` | ✅ | 取消关注 |

### 3.18 AI 域

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| POST | `/api/ai/video/generate` | ✅ | 生成 AI 视频（后端代理） |

### 3.19 VIP 域

> 修复（R4-00487 / R4-00488）：本表按 `apps/api/src/main/java/com/campuslove/api/vip/`
> 与 `admin/AdminVipController.java` 的真实路由重建：
> - `/api/v1/vip/plans` 套餐列表端点在后端不存在（客户端 VipPlans.vue 自述
>   「后端未提供套餐列表管理端点」），已删除；
> - `/api/v1/vip/orders`、`/api/v1/vip/orders/{id}/pay` 不存在，购卡走
>   `POST /api/v1/vip/bills/purchase`；
> - VIP 红包相关端点（`/api/v1/vip/red-packets`、`/red-packets/{id}/claim`、
>   `/api/v1/admin/business/vip/red-packets`）随红包功能下线已删除，
>   对应实体 VipRedPacket/VipRedPacketClaim 已移除（变更登记见根目录 CHANGELOG.md）。

| Method | Path | 鉴权 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/vip/auto-renew/status` | ✅ | 自动续费状态 |
| POST | `/api/v1/vip/auto-renew` | ✅ | 开通自动续费 |
| DELETE | `/api/v1/vip/auto-renew` | ✅ | 关闭自动续费 |
| POST | `/api/v1/vip/auto-renew/trigger` | ✅ | 手动触发续费（运营/调试） |
| GET | `/api/v1/vip/bills` | ✅ | VIP 账单列表（当前用户） |
| POST | `/api/v1/vip/bills/purchase` | ✅ | 购买 VIP（下单+支付入口） |
| POST | `/api/v1/vip/bills/payment-callback` | ❌ | 支付回调（服务端签名校验） |
| POST | `/api/v1/vip/promo-codes/validate` | ✅ | 校验兑换码 |
| POST | `/api/v1/vip/promo-codes/redeem` | ✅ | 兑换优惠码 |

### 3.20 管理端（Admin）

> 所有 `/api/v1/admin/**` 接口要求登录且类级 `@PreAuthorize("hasRole('ADMIN')")`，
> 并经 `AdminPermissionAspect` 切面二次校验；表中标注「仅 SUPER_ADMIN」的写操作
> 额外要求全局超级管理员角色（ADMIN=校区管理员，SUPER_ADMIN=全局超级管理员）。
> 本表按 `apps/api/src/main/java/com/campuslove/api/admin/` 下 27 个 Controller
> 的真实路由重建，旧契约中已不存在的端点见表后说明。

#### 账号与会话

| Method | Path | 权限 | 描述 |
|--------|------|------|------|
| POST | `/api/v1/admin/account/change-password` | 仅 SUPER_ADMIN | 管理员修改密码 |
| GET | `/api/v1/admin/online-users` | 仅 SUPER_ADMIN | 在线用户列表 |
| POST | `/api/v1/admin/online-users/{userId}/kick` | 仅 SUPER_ADMIN | 强制下线用户 |

#### 用户与内容

| Method | Path | 权限 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/admin/users` | ADMIN | 用户列表（分页+搜索，校区管理员自动按管辖校区过滤） |
| POST | `/api/v1/admin/users` | 仅 SUPER_ADMIN | 新增用户 |
| GET | `/api/v1/admin/users/{id}` | ADMIN | 用户详情 |
| PUT | `/api/v1/admin/users/{id}` | ADMIN | 编辑用户（昵称等） |
| POST | `/api/v1/admin/users/{id}/disable` | ADMIN | 禁用用户 |
| POST | `/api/v1/admin/users/{id}/enable` | ADMIN | 启用用户 |
| GET | `/api/v1/admin/users/admins` | 仅 SUPER_ADMIN | 管理员列表（含管辖校区） |
| POST | `/api/v1/admin/users/admins` | 仅 SUPER_ADMIN | 创建管理员（校区管理员绑定高校） |
| GET | `/api/v1/admin/certifications` | ADMIN | 认证审核列表 |
| POST | `/api/v1/admin/certifications/{id}/review` | ADMIN | 审核认证（通过/拒绝） |
| GET | `/api/v1/admin/reports` | ADMIN | 举报列表 |
| POST | `/api/v1/admin/reports/{id}/handle` | ADMIN | 处理举报 |
| GET | `/api/v1/admin/feedback` | ADMIN | 反馈列表 |
| PUT | `/api/v1/admin/feedback/{id}/reply` | ADMIN | 回复反馈 |
| POST | `/api/v1/admin/activity-proposals/{id}/convert` | ADMIN | 活动提案转活动（⚠️ 仅 API，管理端暂无对应 UI 入口，R4-00494） |
| GET | `/api/v1/admin/sensitive-words` | ADMIN | 敏感词列表 |
| POST | `/api/v1/admin/sensitive-words` | 仅 SUPER_ADMIN | 新增敏感词 |
| POST | `/api/v1/admin/sensitive-words/batch-import` | 仅 SUPER_ADMIN | 批量异步导入敏感词（返回受理结果；⚠️ 仅 API，管理端暂无对应 UI 入口，R4-00494） |
| DELETE | `/api/v1/admin/sensitive-words/{id}` | 仅 SUPER_ADMIN | 删除敏感词 |

#### 论坛

| Method | Path | 权限 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/admin/forum/village-posts` | ADMIN | 村落动态列表 |
| GET | `/api/v1/admin/forum/village-posts/{id}` | ADMIN | 村落动态详情 |
| GET | `/api/v1/admin/forum/village-posts/{id}/views` | ADMIN | 动态浏览记录（R4-00489，管理端 api/forum.ts listPostViewers 在用） |
| POST | `/api/v1/admin/forum/village-posts/{id}/audit` | ADMIN | 审核村落动态 |
| POST | `/api/v1/admin/forum/village-posts/{id}/pin` | ADMIN | 置顶村落动态 |
| POST | `/api/v1/admin/forum/village-posts/{id}/unpin` | ADMIN | 取消置顶 |
| DELETE | `/api/v1/admin/forum/village-posts/{id}` | ADMIN | 删除村落动态 |
| GET | `/api/v1/admin/forum/village-posts/{id}/comments` | ADMIN | 动态评论列表 |
| GET | `/api/v1/admin/forum/circles` | ADMIN | 兴趣圈列表 |
| POST | `/api/v1/admin/forum/circles` | ADMIN | 新增兴趣圈 |
| PUT | `/api/v1/admin/forum/circles/{id}` | ADMIN | 编辑兴趣圈 |
| DELETE | `/api/v1/admin/forum/circles/{id}` | ADMIN | 删除兴趣圈 |
| GET | `/api/v1/admin/forum/circles/{id}/topics` | ADMIN | 圈内话题列表 |
| POST | `/api/v1/admin/forum/circles/topics/{id}/pin` | ADMIN | 置顶圈内话题 |
| POST | `/api/v1/admin/forum/circles/topics/{id}/unpin` | ADMIN | 取消置顶圈内话题 |
| DELETE | `/api/v1/admin/forum/circles/topics/{id}` | ADMIN | 删除圈内话题 |
| GET | `/api/v1/admin/forum/campus-topics` | ADMIN | 校园圈话题列表 |
| POST | `/api/v1/admin/forum/campus-topics/{id}/audit` | ADMIN | 审核校园圈话题 |
| DELETE | `/api/v1/admin/forum/campus-topics/{id}` | ADMIN | 删除校园圈话题 |
| GET | `/api/v1/admin/posts` | ADMIN | 帖子审核列表 |
| POST | `/api/v1/admin/posts/{id}/audit` | ADMIN | 审核帖子 |
| DELETE | `/api/v1/admin/posts/{id}` | ADMIN | 删除帖子 |
| GET | `/api/v1/admin/comments` | ADMIN | 评论列表 |
| DELETE | `/api/v1/admin/comments/{id}` | ADMIN | 删除评论 |

#### 活动

| Method | Path | 权限 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/admin/activities` | ADMIN | 活动列表（分页+筛选） |
| GET | `/api/v1/admin/activities/{id}` | ADMIN | 活动详情 |
| POST | `/api/v1/admin/activities` | ADMIN | 新增活动 |
| PUT | `/api/v1/admin/activities/{id}` | ADMIN | 编辑活动 |
| DELETE | `/api/v1/admin/activities/{id}` | ADMIN | 删除活动（报名记录一并清除） |
| POST | `/api/v1/admin/activities/{id}/publish` | ADMIN | 上架活动 |
| POST | `/api/v1/admin/activities/{id}/unpublish` | ADMIN | 下架活动 |
| GET | `/api/v1/admin/activities/{id}/enrollments` | ADMIN | 报名列表 |
| GET | `/api/v1/admin/activities/{id}/enrollments/export` | ADMIN | 报名 CSV 导出 |

#### 商业运营

| Method | Path | 权限 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/admin/business/vip/bills` | ADMIN | VIP 账单列表 |
| GET | `/api/v1/admin/business/vip/bills/{id}` | ADMIN | VIP 账单详情 |
| GET | `/api/v1/admin/business/promo-codes` | ADMIN | 兑换码列表 |
| POST | `/api/v1/admin/business/promo-codes/batch` | ADMIN | 批量生成兑换码 |
| POST | `/api/v1/admin/business/promo-codes/{id}/disable` | ADMIN | 作废兑换码 |
| GET | `/api/v1/admin/business/promo-codes/export` | ADMIN | 兑换码 CSV 导出 |
| GET | `/api/v1/admin/business/wallets` | ADMIN | 钱包列表 |
| GET | `/api/v1/admin/business/wallets/transactions` | ADMIN | 钱包流水 |
| POST | `/api/v1/admin/business/wallets/{userId}/adjust` | ADMIN | 钱包余额调整 |
| GET | `/api/v1/admin/business/coins` | ADMIN | 金币列表 |
| GET | `/api/v1/admin/business/shop` | ADMIN | 商城商品列表 |
| POST | `/api/v1/admin/business/shop` | ADMIN | 新增商品 |
| PUT | `/api/v1/admin/business/shop/{id}` | ADMIN | 编辑商品 |
| POST | `/api/v1/admin/business/shop/{id}/publish` | ADMIN | 上架商品 |
| POST | `/api/v1/admin/business/shop/{id}/unpublish` | ADMIN | 下架商品 |
| DELETE | `/api/v1/admin/business/shop/{id}` | ADMIN | 删除商品 |

#### 配置与系统

| Method | Path | 权限 | 描述 |
|--------|------|------|------|
| GET | `/api/v1/admin/configs` | ADMIN | 系统参数配置 |
| PUT | `/api/v1/admin/configs/{key}` | 仅 SUPER_ADMIN | 更新参数配置 |
| GET | `/api/v1/admin/rules` | ADMIN | 业务规则 |
| PUT | `/api/v1/admin/rules/{id}` | 仅 SUPER_ADMIN | 更新业务规则 |
| GET | `/api/v1/admin/switches` | ADMIN | 功能开关 |
| PUT | `/api/v1/admin/switches/{key}` | 仅 SUPER_ADMIN | 更新功能开关 |
| GET | `/api/v1/admin/match-config` | ADMIN | 匹配算法配置 |
| PUT | `/api/v1/admin/match-config` | 仅 SUPER_ADMIN | 更新匹配算法配置 |
| GET | `/api/v1/admin/recommend-strategy` | ADMIN | 推荐策略配置 |
| PUT | `/api/v1/admin/recommend-strategy` | 仅 SUPER_ADMIN | 更新推荐策略配置 |
| GET | `/api/v1/admin/notify-config` | ADMIN | 通知配置 |
| PUT | `/api/v1/admin/notify-config` | 仅 SUPER_ADMIN | 更新通知配置 |
| GET | `/api/v1/admin/official-accounts` | ADMIN | 官方号列表 |
| GET | `/api/v1/admin/official-accounts/{code}/messages` | ADMIN | 官方号消息流 |
| GET | `/api/v1/admin/audit-logs` | ADMIN | 审计日志（分页） |
| GET | `/api/v1/admin/stats/users` | ADMIN | 用户统计 |
| GET | `/api/v1/admin/stats/active` | ADMIN | 活跃统计 |
| GET | `/api/v1/admin/stats/matches` | ADMIN | 匹配统计 |
| GET | `/api/v1/admin/menus/current` | ADMIN | 当前管理员可见菜单树 |
| GET | `/api/v1/admin/menus` | 仅 SUPER_ADMIN | 全量菜单树 |
| GET | `/api/v1/admin/menus/{id}` | 仅 SUPER_ADMIN | 菜单详情 |
| POST | `/api/v1/admin/menus` | 仅 SUPER_ADMIN | 新增菜单 |
| PUT | `/api/v1/admin/menus/{id}` | 仅 SUPER_ADMIN | 编辑菜单 |
| DELETE | `/api/v1/admin/menus/{id}` | 仅 SUPER_ADMIN | 删除菜单 |
| GET | `/api/v1/admin/schools` | ADMIN | 高校列表 |
| GET | `/api/v1/admin/schools/options` | ADMIN | 启用高校下拉选项 |
| GET | `/api/v1/admin/schools/{id}` | ADMIN | 高校详情 |
| POST | `/api/v1/admin/schools` | 仅 SUPER_ADMIN | 新增高校 |
| PUT | `/api/v1/admin/schools/{id}` | 仅 SUPER_ADMIN | 编辑高校 |
| POST | `/api/v1/admin/schools/{id}/status` | 仅 SUPER_ADMIN | 启用/停用高校 |
| DELETE | `/api/v1/admin/schools/{id}` | 仅 SUPER_ADMIN | 删除高校 |
| GET | `/api/v1/admin/dicts` | ADMIN | 字典列表 |
| GET | `/api/v1/admin/dicts/{id}` | ADMIN | 字典详情 |
| GET | `/api/v1/admin/dicts/{code}/items` | ADMIN | 字典条目 |
| POST | `/api/v1/admin/dicts` | 仅 SUPER_ADMIN | 新增字典 |
| PUT | `/api/v1/admin/dicts/{id}` | 仅 SUPER_ADMIN | 编辑字典 |
| DELETE | `/api/v1/admin/dicts/{id}` | 仅 SUPER_ADMIN | 删除字典 |
| POST | `/api/v1/admin/dicts/{dictId}/items` | 仅 SUPER_ADMIN | 新增字典条目 |
| PUT | `/api/v1/admin/dicts/items/{itemId}` | 仅 SUPER_ADMIN | 编辑字典条目 |
| DELETE | `/api/v1/admin/dicts/items/{itemId}` | 仅 SUPER_ADMIN | 删除字典条目 |
| GET | `/api/v1/admin/roles` | 仅 SUPER_ADMIN | 角色列表 |
| GET | `/api/v1/admin/roles/{id}` | 仅 SUPER_ADMIN | 角色详情 |
| GET | `/api/v1/admin/roles/{id}/menus` | 仅 SUPER_ADMIN | 角色已分配菜单 id |
| POST | `/api/v1/admin/roles` | 仅 SUPER_ADMIN | 新增角色 |
| PUT | `/api/v1/admin/roles/{id}` | 仅 SUPER_ADMIN | 编辑角色 |
| PUT | `/api/v1/admin/roles/{id}/menus` | 仅 SUPER_ADMIN | 保存角色菜单分配 |
| DELETE | `/api/v1/admin/roles/{id}` | 仅 SUPER_ADMIN | 删除角色 |

> **旧契约变更说明**：以下旧表端点已不存在，以本表为准——
> - `GET /stats/dashboard` → 拆分为 `/stats/users`、`/stats/active`、`/stats/matches`
> - `POST /sensitive-words/import` → `/sensitive-words/batch-import`（异步受理）
> - `PUT /certifications/{id}/audit` → `POST /certifications/{id}/review`
> - `PUT /reports/{id}/handle` → `POST /reports/{id}/handle`
> - `PUT /configs`（整体更新）→ `PUT /configs/{key}`（单键更新）

---

## 4. 错误码表

### 4.1 通用错误码

| code | HTTP | 含义 | 触发场景 |
|------|------|------|----------|
| `OK` | 200 | 成功 | 业务成功 |
| `BAD_REQUEST` | 400 | 参数错误 | 校验失败 |
| `UNAUTHORIZED` | 401 | 未授权 | Token 缺失/无效/已撤销 |
| `FORBIDDEN` | 403 | 无权限 | 已认证但无权限 |
| `NOT_FOUND` | 404 | 资源不存在 | 资源 ID 无效 |
| `CONFLICT` | 409 | 冲突 | 乐观锁/唯一约束 |
| `PAYLOAD_TOO_LARGE` | 413 | 文件过大 | 上传超限 |
| `UNPROCESSABLE_ENTITY` | 422 | 业务校验失败 | 如已签到 |
| `RATE_LIMITED` | 429 | 限流 | 触发桶限流 |
| `INTERNAL_ERROR` | 500 | 内部错误 | 未捕获异常 |
| `BAD_GATEWAY` | 502 | 网关错误 | 第三方故障 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 | 熔断打开 |

### 4.2 业务错误码

| code | HTTP | 含义 |
|------|------|------|
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `USER_DISABLED` | 403 | 用户已禁用 |
| `ADMIN_DISABLED` | 403 | 管理员已禁用 |
| `INVALID_CREDENTIALS` | 401 | 凭据无效 |
| `INVALID_TOKEN` | 401 | Token 无效 |
| `TOKEN_REVOKED` | 401 | Token 已撤销 |
| `RESOURCE_CONFLICT` | 409 | 资源冲突 |
| `OPERATION_FORBIDDEN` | 403 | 操作被禁止 |
| `INVALID_OPERATION` | 422 | 非法操作 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `MATCH_ALREADY_EXISTS` | 409 | 匹配已存在 |
| `IDEMPOTENCY_CONFLICT` | 409 | 幂等冲突 |
| `DAILY_LIMIT_EXCEEDED` | 429 | 每日限额超限 |
| `WECHAT_LOGIN_ERROR` | 401 | 微信登录失败 |
| `WECHAT_API_ERROR` | 502 | 微信 API 故障 |
| `AI_API_UNAUTHORIZED` | 401 | AI 接口未授权 |
| `AI_API_ERROR` | 502 | AI 接口故障 |
| `MEDIA_SIZE_LIMIT_EXCEEDED` | 413 | 媒体超限 |
| `RATE_LIMIT_EXCEEDED` | 429 | 限流 |

### 4.3 错误响应示例

```json
{
  "code": "DAILY_LIMIT_EXCEEDED",
  "message": "今日反悔次数已用尽（限额 1 次）",
  "data": null,
  "traceId": "a1b2c3d4-e5f6-7890",
  "details": {
    "limit": 1,
    "used": 1,
    "resetAt": "2026-07-27T00:00:00+08:00"
  }
}
```

---

## 5. 通用 Schema

### 5.1 分页请求

```
GET /api/v1/xxx?page=1&size=20&sort=createdAt,desc
```

| 参数 | 类型 | 默认 | 约束 |
|------|------|------|------|
| `page` | int | 1 | ≥ 1 |
| `size` | int | 20 | 1-100（@Max(100) 强制） |
| `sort` | string | createdAt,desc | Spring Data Sort 格式 |

### 5.2 分页响应

```typescript
interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}
```

### 5.3 时间格式

- 所有时间字段使用 ISO 8601 字符串：`2026-07-26T10:30:00+08:00`
- 后端 `LocalDateTime` 序列化时配置 `JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")`
- 时区统一为 `Asia/Shanghai`（服务器 JVM `-Duser.timezone=Asia/Shanghai`）

### 5.4 ID 规范

- 用户/帖子等业务 ID：`number`（Long，JavaScript 安全整数范围内）
- 会话/匹配 ID：`string`（UUID 或业务前缀+短码，如 `match-abc123`）
- 媒体路径：`/api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}`

### 5.5 i18n

- 后端通过 `Accept-Language` 请求头切换（`zh-CN` / `en-US`）
- 错误消息由 `MessageSource` 解析，按 `messages_zh_CN.properties` / `messages_en_US.properties` 提供
- 客户端通过 `vue-i18n` 在前端做兜底翻译

---

## 6. 幂等性与限流

### 6.1 幂等性（Idempotency-Key）

- 适用：所有 POST/PUT/DELETE 写接口（34 处已标注 `@Idempotent`）
- 请求头：`Idempotency-Key: <uuid-v4>`
- 后端 Redis 缓存 24 小时：Key=`idem:{userId}:{key}`，Value=响应体
- 重复请求返回首次结果（HTTP 200 + 首次响应体），不重复执行业务
- 客户端前端 `services/http.ts` 自动注入（UUIDv4 + sessionStorage 缓存）

### 6.2 限流（RateLimit）

| 接口 | 桶容量 | 补充速率 | Key |
|------|--------|----------|-----|
| 登录 | 5 | 1/分钟 | IP |
| 上传 | 30 | 1/秒 | IP |
| 喜欢 | 60 | 2/秒 | IP |
| 发帖 | 10 | 1/分钟 | userId |
| 发消息 | 60 | 1/秒 | userId |
| 反馈 | 5 | 1/小时 | userId |
| 通知 | 60 | 1/秒 | userId |
| 评论 | 30 | 1/分钟 | userId |

触发限流返回 HTTP 429 + `RATE_LIMITED`，响应头：
- `X-RateLimit-Limit`：桶容量
- `X-RateLimit-Remaining`：剩余令牌
- `X-RateLimit-Reset`：重置时间（Unix 秒）

---

## 7. WebSocket 协议

### 7.1 连接

```
wss://api.example.com/ws/chat?token=<jwt>
```

- 鉴权：URL 查询参数 `token`，由 `JwtChannelInterceptor` 在握手阶段校验
- 心跳：客户端 30s 发送 `/ping`，服务端 60s 无心跳断开
- 重连：客户端指数退避（1s → 2s → 4s → 8s → 16s → 30s 上限）

### 7.2 订阅与发送

```typescript
// 客户端订阅
stompClient.subscribe('/user/queue/messages', (msg) => { ... });
stompClient.subscribe('/user/queue/notifications', (msg) => { ... });

// 客户端发送
stompClient.publish({
  destination: '/app/chat.send',
  body: JSON.stringify({ sessionId: 123, content: 'hello', type: 'TEXT' })
});
```

### 7.3 消息格式

```typescript
interface WsMessage<T = unknown> {
  type: 'MESSAGE' | 'NOTIFICATION' | 'TYPING' | 'READ' | 'PRESENCE';
  data: T;
  timestamp: string;
}
```

---

## 8. 媒体访问约定

### 8.1 路径格式

```
GET /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}
```

- `userId`：文件归属者（必须是当前 JWT 用户或 ADMIN）
- `yyyyMM`：年月分片（如 `202607`）
- `uuid`：UUID（无扩展名）
- `ext`：扩展名（jpg/png/gif/webp/mp4/webm）

### 8.2 鉴权方式

- 标准：`Authorization: Bearer <token>`
- Image 标签：`?token=<token>`（用于小程序 `<image src>` 无法携带 Header）
- 后端 `JwtAuthenticationFilter` 自动识别查询参数 token

### 8.3 缓存

- 响应头：`Cache-Control: private, max-age=3600`
- 仅本人可缓存（私有），不共享 CDN

### 8.4 路径穿越防护

- 字符级校验：subPath 不含 `..`、`\`、绝对路径前缀、控制字符、分号
- 绝对路径校验：normalize 后必须仍在 `storageRoot` 之下
- 详见 `MediaAccessService.loadMedia`

---

## 9. 变更管理

### 9.1 Breaking Change 流程

1. 在 ADR 中记录决策（`docs/adr/NNNN-xxx.md`）
2. 新增 `/api/v2/**` 端点，保留 v1 兼容期 ≥ 6 个月
3. v1 端点响应附加 `deprecation: true` + `sunset: <date>` 字段
4. CHANGELOG.md 登记，提前 4 周通知前端
5. 兼容期结束后下线 v1，记录在 CHANGELOG.md

### 9.2 兼容性原则

- 新增字段：向后兼容，前端忽略未知字段
- 删除字段：breaking change，需新版本
- 改字段类型：breaking change，需新版本
- 改字段语义：breaking change，需新版本
- 改必填为可选：向后兼容
- 改可选为必填：breaking change

### 9.3 客户端类型同步

```bash
# 客户端
cd apps/client
npm run generate:openapi  # 从 docs/openapi/feedback-growth-and-auth.yaml 生成类型

# 后端
mvn spring-boot:run  # 启动后访问 /v3/api-docs 导出最新 Schema
```

---

## 10. 测试约定

### 10.1 契约测试

- 后端：每个 Controller 必须有 `*ControllerTest`，使用 `MockMvc` 验证响应 Schema
- 前端：API 层测试不使用 `vi.mock()` 完全替换，使用 MSW（Mock Service Worker）模拟响应
- 集成：`docs/openapi/*.yaml` 作为契约基准，前后端各自生成 stub 验证

### 10.2 端到端验证

- 真机：微信开发者工具 + 真机预览
- H5：本地 `npm run client:dev:h5:real`（或 `apps/client` 目录下 `npm run dev:h5:real`）接入本地后端
- 自动化：Playwright 覆盖核心旅程（注册→匹配→聊天）

---

## 11. 监控与可观测性

### 11.1 TraceId

- 每个 HTTP 请求由 `TraceIdFilter` 生成 `X-Trace-Id`（UUID）
- 注入 MDC，贯穿日志链路
- 响应头返回，便于前端反馈问题

### 11.2 Actuator 端点

- `/actuator/health`：健康检查（permitAll）
- `/actuator/info`：构建信息（permitAll）
- `/actuator/prometheus`：Prometheus 抓取（hasRole('ADMIN')）
- `/actuator/metrics`：指标查询（hasRole('ADMIN')）

### 11.3 关键指标

- `http_server_requests_seconds`：HTTP 请求延迟
- `match_swipe_total`：滑动操作计数
- `match_success_total`：匹配成功计数
- `media_upload_bytes`：上传字节
- `chat_message_sent_total`：消息发送计数
- `jwt_token_blacklist_hit_total`：Token 黑名单命中

---

## 12. 安全规范

### 12.1 凭据脱敏

- `User.password`、`UserSession.sessionToken` 标注 `@JsonIgnore`
- 所有接口返回 DTO，禁止返回 Entity
- 日志中敏感字段（token/password/openid）由 `logback-spring.xml` 脱敏

### 12.2 越权防护

- 所有 `@PathVariable` 资源 ID 必须校验归属（如 `mediaAccessService.loadMedia`）
- 所有写接口从 `SecurityUtils.getCurrentUserId()` 获取用户 ID，不信任请求体
- Admin 接口双重校验：`@PreAuthorize` + `AdminPermissionAspect`

### 12.3 输入校验

- 所有 `@RequestBody` 使用 `@Valid` + JSR-303 注解
- 字符串字段使用 `@NotBlank` / `@Size` / `@Pattern`
- 数值字段使用 `@Min` / `@Max`
- 集合字段使用 `@Size(max=...)` 防止超大请求

### 12.4 SQL 注入防护

- 全部使用 Spring Data JPA 或 MyBatis 参数化查询
- 禁止 nativeQuery 字符串拼接（grep 验证 `nativeQuery=true` 出现 0 处）

### 12.5 XSS 防护

- 后端 `@ResponseBody` 默认 `application/json`，不会执行 HTML
- 前端 Vue 模板默认转义，禁止使用 `v-html` 渲染用户输入
- 富文本字段（如帖子内容）后端 `SensitiveWordFilter` 过滤

---

## 13. 文档维护

### 13.1 责任人

| 模块 | 后端 Lead | 前端 Lead |
|------|-----------|-----------|
| Auth | TBD | TBD |
| Match | TBD | TBD |
| Media | TBD | TBD |
| Profile | TBD | TBD |
| Chat | TBD | TBD |
| Village/Circle | TBD | TBD |
| Admin | TBD | TBD |

### 13.2 更新流程

1. 修改 Controller 注解或 `docs/openapi/*.yaml`
2. 运行 `mvn spring-boot:run` 验证 Swagger UI 展示正确
3. 运行 `npm run generate:openapi` 同步前端类型
4. PR 评审：后端 Lead 检查 Schema，前端 Lead 检查类型
5. 合并后更新本文件版本号与日期

### 13.3 版本

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-07-26 | 初始版本，覆盖 P0-P9 全量接口契约 |
| 1.1.0 | 2026-07-27 | REAUDIT-REPORT-100+ 第 3.5 节编号 112 修复：新增 §0 一致性声明与权威源、§0.1 已知差异表，与 `docs/openapi/*.yaml` 与 Java Controller 注解对齐 |
