# 校园恋爱小程序 — 详细设计文档

> 版本：1.0  
> 基于：`docs/project-structure-detailed.md` + `database/flyway/` 全部迁移 + `apps/api/src/`

---

## 1. 架构概览

### 1.1 整体分层

```
┌─────────────────────────────────────────────────────────────┐
│                     apps/client (uni-app)                    │
│  pages/  components/  stores/  services/  composables/      │
│  Mock Mode: fixtures.ts          Real Mode: api.ts          │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                   apps/api (Spring Boot)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Controller Layer (REST + WebSocket)                     ││
│  │  auth/ profile/ home/ discover/ match/ chat/ village/   ││
│  │  feedback/ growth/ user/ debug/                          ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Service Layer (Interface + Real + Mock)                 ││
│  │  *Service.java → Real*Service.java / Mock*Service.java  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Repository Layer (JPA Repository)                       ││
│  │  *Repository.java (30+ repositories)                    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Entity Layer (JPA Entity)                               ││
│  │  *Entity.java (28+ entities)                             ││
│  └─────────────────────────────────────────────────────────┘│
│  config/ (JWT, WebSocket, Security, App Configs)             │
│  runtime/ (MockRuntimeState — mock 模式共享状态)              │
│  debug/ (错误模拟 + 匹配调试 — 仅 dev)                        │
└────────────────────────────┬────────────────────────────────┘
                             │ JDBC / SQL
┌────────────────────────────▼────────────────────────────────┐
│              database/flyway/sql/                             │
│  V*.sql (逐版迁移，28+ 张表，Flyway 版本控制)                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Mock/Real 双模式设计

```
                    ┌─────────────┐
                    │  请求到达     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Controller  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐      │      ┌─────▼─────┐
        │ mock profile│     │      │ real/db     │
        │ (开发/测试)  │     │      │ profile     │
        └─────┬─────┘      │      └─────┬─────┘
              │            │            │
    Mock*Service.java      │    Real*Service.java
    (内存 Map/List)        │    (调用 Repository)
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │   响应返回    │
                    └─────────────┘
```

**Spring Profile 切换**：
- `mock`：默认 profile，所有 Service 注入 Mock 实现，不依赖数据库
- `db`：注入 Real 实现，连接 MySQL，启用 Flyway 迁移
- 切换命令：`mvnw spring-boot:run -Dspring-boot.run.profiles=mock`

---

## 2. 模块职责矩阵

| 模块 | 包路径 | 核心职责 | 测试覆盖 |
|------|--------|----------|----------|
| **配置** | `config/` | JWT、WebSocket、Security、CORS、限流、App 配置 | JUnit |
| **认证** | `auth/` | 微信登录、JWT 签发/刷新、会话管理、Token黑名单 | JUnit + MockMvc |
| **资料** | `profile/` | 用户资料 CRUD、完善度计算、校园认证、推荐偏好 | JUnit + MockMvc |
| **首页** | `home/` | 仪表盘聚合、课表摘要、推荐预览、AI 计划、活动入口 | JUnit + MockMvc |
| **发现-推荐** | `discover/` | 推荐人选、卡片浏览、每日限额、挽回、Pass记录 | JUnit + MockMvc |
| **发现-活动** | `discover/` | 活动列表、详情、报名/取消 | JUnit + MockMvc |
| **发现-每日一问** | `discover/` | 每日题目、回答提交、回答浏览 | JUnit + MockMvc |
| **发现-兴趣圈** | `discover/` | 圈子列表、话题、回复、成员管理 | JUnit + MockMvc |
| **匹配** | `match/` | 喜欢/取消、访客记录、心跳信号、互相匹配、破冰话题 | JUnit + MockMvc |
| **聊天-临时** | `chat/` | 匿名聊天、24h过期、联系方式交换 | JUnit + WebSocket |
| **聊天-私信** | `chat/` | 私信会话、消息、WebSocket 推送、已读回执 | JUnit + WebSocket |
| **通知** | `chat/` | 系统通知、互动事件 | JUnit |
| **村口** | `village/` | 帖子CRUD、评论、点赞、分享、分类 | JUnit + MockMvc |
| **反馈** | `feedback/` | 工单提交、查询状态 | JUnit |
| **成长-签到** | `growth/` | 每日签到、连续天数 | JUnit |
| **用户** | `user/` | 公共用户信息、关注/取消、在线状态 | JUnit |

---

## 3. 数据库设计

### 3.1 完整表清单（基于 Flyway 迁移）

| 表名 | 用途 | 迁移版本 |
|------|------|----------|
| `users` | 用户主表（union_id、微信信息、状态） | V2026.05.18.0001 |
| `user_basic_profile` | 基础资料（昵称/头像/生日/性别/简介/兴趣标签） | (同 foundation) |
| `user_campus_profile` | 校园资料（学校/年级/专业/学号） | (同 foundation) |
| `user_schedule_profile` | 时间安排/课表 | (同 foundation) |
| `user_sessions` | 用户 JWT 会话 | V2026.05.24.0003 |
| `user_online_status` | 在线状态 | V2026.05.30.0002 |
| `user_follows` | 用户关注关系 | V2026.05.25.0001 |
| `likes` | 喜欢/超级喜欢记录 | V2026.05.21.0001 |
| `visitors` | 访客记录 | V2026.05.21.0002 |
| `pass_records` | 划过记录（拒绝） | V2026.05.29.0001 |
| `heart_signals` | 心跳信号（匹配） | V2026.05.21.0005 |
| `posts` | 村口帖子 | V2026.05.21.0003 |
| `post_categories` | 帖子分类（六分类） | V2026.05.29.0003 |
| `post_likes` | 帖子点赞 | V2026.05.26.0003 |
| `post_shares` | 帖子分享 | V2026.05.23.0006 |
| `post_tags` | 帖子话题标签 | V2026.05.28.0010 |
| `comments` | 评论 | V2026.05.21.0004 |
| `temp_chat_sessions` | 临时匿名聊天会话 | V2026.05.27.0001 |
| `temp_chat_messages` | 临时聊天消息 | V2026.05.27.0001 |
| `temp_chat_contact_exchanges` | 联系方式交换记录 | V2026.05.27.0001 |
| `private_conversations` | 私信会话 | V2026.05.24.0002 |
| `private_messages` | 私信消息 | V2026.05.24.0002 |
| `notifications` | 系统通知 | V2026.05.23.0004 |
| `interaction_events` | 互动事件流 | V2026.05.30.0004 |
| `activities` | 活动 | V2026.05.24.0004 |
| `activity_enrollments` | 活动报名 | V2026.05.23.0001 |
| `check_ins` | 签到记录 | V2026.05.23.0002 |
| `daily_questions` | 每日一问问题 | V2026.05.23.0003 |
| `daily_answers` | 每日一问回答 | (同 foundation) |
| `interest_circles` | 兴趣圈 | V2026.05.23.0005 |
| `circle_topics` | 圈话题 | (同) |
| `circle_replies` | 圈回复 | (同) |
| `circle_memberships` | 圈成员 | (同) |
| `recommendation_preferences` | 推荐偏好 | V2026.05.24.0001 |
| `icebreaker_topics` | 破冰话题 | V2026.05.30.0003 |
| `feedback_tickets` | 反馈工单 | V2026.05.28.0001 |
| `social_progress` | 社交进度/完善度 | V2026.05.28.0002 |
| `campus_certifications` | 校园认证记录 | V2026.05.28.0005 |
| `campus_topics` | 校园话题 | V2026.05.28.0004 |
| `app_login_hero_config` | 登录页英雄区配置 | (foundation) |

### 3.2 核心实体关系

```
User (1) ── (1) UserBasicProfile
User (1) ── (1) UserCampusProfile
User (1) ── (1) UserScheduleProfile
User (1) ── (N) Like          (发出)
User (1) ── (N) Visitor       (被访问)
User (1) ── (N) PassRecord    (发出)
User (1) ── (N) HeartSignal   (作为发起方/接收方)
User (1) ── (N) Post          (作者)
User (1) ── (N) Comment       (评论者)
User (1) ── (N) PostLike      (点赞者)
User (1) ── (N) CheckIn       (签到)
User (1) ── (N) DailyAnswer   (回答)
User (1) ── (N) PrivateConversation (参与者)
User (1) ── (N) Notification  (接收者)
User (1) ── (N) UserFollow    (关注/被关注)
User (1) ── (N) ActivityEnrollment (报名)
User (1) ── (N) CircleMembership   (圈成员)
```

---

## 4. API 设计

### 4.1 RESTful 端点总览

| 方法 | 路径 | 模块 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | auth | 微信登录 |
| POST | `/api/auth/refresh` | auth | 刷新 Token |
| POST | `/api/auth/logout` | auth | 登出 |
| GET | `/api/home/dashboard` | home | 首页仪表盘聚合 |
| GET | `/api/discover/candidates` | discover | 每日推荐人选 |
| POST | `/api/discover/like/{userId}` | discover | 喜欢 |
| POST | `/api/discover/pass/{userId}` | discover | 拒绝 |
| POST | `/api/discover/rewind` | discover | 挽回 |
| GET | `/api/likes/liked-me` | likes | 喜欢我的人 |
| GET | `/api/likes/visitors` | likes | 访客记录 |
| POST | `/api/match/heart-signal` | match | 发送心动信号 |
| GET | `/api/match/mutual` | match | 互相匹配列表 |
| GET | `/api/village/posts` | village | 帖子列表（支持分类/标签筛选） |
| POST | `/api/village/posts` | village | 发帖 |
| GET | `/api/village/posts/{id}` | village | 帖子详情 |
| POST | `/api/village/posts/{id}/comments` | village | 评论帖子 |
| POST | `/api/village/posts/{id}/like` | village | 点赞帖子 |
| POST | `/api/village/posts/{id}/share` | village | 分享帖子 |
| GET | `/api/chat/conversations` | chat | 私信会话列表 |
| GET | `/api/chat/conversations/{id}/messages` | chat | 消息历史 |
| POST | `/api/chat/conversations/{id}/messages` | chat | 发送消息 |
| POST | `/api/chat/temp/sessions` | chat | 创建临时会话 |
| POST | `/api/chat/temp/exchange` | chat | 申请联系方式交换 |
| GET | `/api/notifications` | chat | 通知列表 |
| PUT | `/api/notifications/{id}/read` | chat | 标记已读 |
| GET | `/api/profile` | profile | 获取个人资料 |
| PUT | `/api/profile` | profile | 更新资料 |
| POST | `/api/profile/certification` | profile | 提交校园认证 |
| GET | `/api/check-in/status` | growth | 签到状态 |
| POST | `/api/check-in` | growth | 执行签到 |
| GET | `/api/daily-question` | discover | 今日问题 |
| POST | `/api/daily-question/answer` | discover | 提交回答 |
| GET | `/api/circles` | discover | 兴趣圈列表 |
| POST | `/api/circles/{id}/join` | discover | 加入圈子 |
| GET | `/api/circles/{id}/topics` | discover | 圈话题列表 |
| POST | `/api/circles/{id}/topics` | discover | 发布话题 |
| GET | `/api/activities` | discover | 活动列表 |
| GET | `/api/activities/{id}` | discover | 活动详情 |
| POST | `/api/activities/{id}/enroll` | discover | 报名活动 |
| GET | `/api/users/{id}` | user | 用户公开信息 |
| POST | `/api/users/{id}/follow` | user | 关注用户 |
| POST | `/api/feedback` | feedback | 提交反馈 |
| GET | `/api/feedback/records` | feedback | 反馈记录 |
| GET | `/api/icebreaker/topics` | match | 破冰话题 |

### 4.2 WebSocket 端点

| 路径 | 模块 | 说明 |
|------|------|------|
| `/ws/chat/private?token={jwt}` | chat | 私信实时推送 |
| `/ws/chat/temp?sessionId={id}&token={jwt}` | chat | 临时聊天实时推送 |

**WebSocket 消息类型**：
- `text` — 文字消息
- `image` — 图片消息
- `voice` — 语音消息
- `emoji` — 表情
- `system` — 系统消息（入群/超时/交换请求等）

---

## 5. 安全设计

### 5.1 JWT 认证流程

```
1. 微信登录 → 获取 code
2. code 换取 openId/unionId（调用微信 API）
3. 签发 access_token (30min) + refresh_token (7d)
4. 后续请求带 Authorization: Bearer {access_token}
5. access_token 过期 → 用 refresh_token 刷新
6. 登出 → access_token 加入黑名单 (Redis/内存)
```

### 5.2 安全措施清单

| 措施 | 实现 |
|------|------|
| JWT 签名 | HMAC-SHA256，密钥从配置读取 |
| Token 有效期 | access: 30min / refresh: 7d |
| Token 黑名单 | 内存 ConcurrencyHashMap（mock）/ Redis（real） |
| CORS | 仅允许白名单域名 + localhost |
| 速率限制 | IP + 用户双维度，令牌桶算法 |
| 敏感词过滤 | Aho-Corasick 算法，词库可配置 |
| 安全响应头 | CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security |
| SQL 注入防护 | JPA 参数化查询（默认安全） |
| XSS 防护 | 输出编码，内容过滤 |

---

## 6. 测试策略

### 6.1 测试分层

```
┌──────────────────────────────────┐
│  E2E / 手动验收                   │  验证主链路 10 场景
├──────────────────────────────────┤
│  集成测试 (MockMvc + WebSocket)    │  每个模块 3-8 个场景
├──────────────────────────────────┤
│  单元测试 (JUnit 5 + Mockito)     │  每个 Service 方法 ≥1 测试
├──────────────────────────────────┤
│  前端单元测试 (Vitest)             │  每个 store/composable/component
├──────────────────────────────────┤
│  契约测试 (OpenAPI Spectral)      │  所有 .yaml 契约
├──────────────────────────────────┤
│  Python 工具测试 (pytest)         │  run_full_test.py 等
└──────────────────────────────────┘
```

### 6.2 质量门禁

| 门禁 | 工具 | 阈值 |
|------|------|------|
| 前端单元测试通过 | Vitest | 100% 通过 |
| 后端单元测试通过 | JUnit 5 | 100% 通过 |
| 后端集成测试通过 | MockMvc | 核心场景通过 |
| 前端 TypeScript 类型检查 | `vue-tsc` | 0 error |
| Python 脚本测试通过 | pytest | 100% 通过 |
| Python 类型检查 | `mypy --strict` | 0 error |
| Python 代码规范 | `ruff check` | 0 error |
| OpenAPI 规范检查 | Spectral | 0 error |
| 客户端构建成功 | H5 + MP-WEIXIN | 构建无错误 |

### 6.3 Mock/Real 双模式测试覆盖

| 测试场景 | Mock | Real |
|----------|------|------|
| 登录认证 | ✅ | ✅ |
| 首页仪表盘 | ✅ | ✅ |
| 推荐人选 | ✅ | ✅ |
| 喜欢/拒绝/挽回 | ✅ | ✅ |
| 心跳信号 | ✅ | ✅ |
| 私信通讯 | ✅ | ✅ |
| 临时聊天 | ✅ | ✅ |
| 村口帖子 | ✅ | ✅ |
| 签到 | ✅ | ✅ |
| 错误处理（400/404/500） | ✅ | ✅ |

---

## 7. 关键业务流程

### 7.1 用户注册→解锁

```
微信扫码授权
    │
    ▼
登录成功 → JWT 签发
    │
    ▼
引导完善资料（逐步）
    ├── 上传头像 (20%)
    ├── 填写昵称 (10%)
    ├── 选择性别 (10%)
    ├── 填写生日 (10%)
    ├── 学校认证 (20%)
    ├── 年级+专业 (10%)
    ├── 兴趣标签 (10%)
    └── 个人简介 (10%)
    │
    ▼
资料完善度 = 100%
    │
    ▼
解锁全部功能：喜欢/村口/消息/我的
```

### 7.2 卡片推荐→匹配→聊天

```
寻觅页获取每日候选
    │
    ▼
浏览卡片（左右滑动）
    ├── 右滑 → 调用 POST /discover/like/{userId}
    │          ├── 检测对方是否已喜欢我
    │          └── 是 → 触发心动信号
    └── 左滑 → 调用 POST /discover/pass/{userId}
               └── 记录到 pass_records
    │
    ▼
心动信号触发
    ├── 双方收到通知
    ├── 24h 倒计时开始
    └── "直接开聊" → 创建/复用私信会话
    │
    ▼
进入私信详情页（WebSocket连接）
    ├── 发送文字/图片/语音
    └── 实时已读回执
```

### 7.3 村口发帖→互动

```
点击 FAB "发一条"
    │
    ▼
发帖页
    ├── 输入文字 (≤500字)
    ├── 上传图片 (最多9张)
    ├── 选择分类 (六分类之一)
    ├── 添加话题标签
    ├── 添加定位 (可选)
    └── 发布
    │
    ▼
帖子列表可见
    ├── 其他用户 → 点赞 / 评论 / 关注作者 / 私信
    └── 作者收到互动通知
```

---

## 8. Python 工具链设计

项目中包含 Python 脚本（如 `run_full_test.py`），需遵守以下规范：

| 工具 | 配置 | 目标 |
|------|------|------|
| pytest | `pytest.ini` / `pyproject.toml` | 所有 Python 测试通过 |
| mypy | `mypy.ini` → `strict = true` | 0 类型错误 |
| ruff | `ruff.toml` → select ALL | 0 lint 错误 |
| 目录 | `tools/` `tests/` `scripts/` | Python 代码集中管理 |

**典型 pytest 测试结构**：
```python
# tests/test_example.py
def test_something() -> None:
    result = some_function()
    assert result == expected
```

---

## 9. 验收主链路（10 场景）

1. 登录后进入首页 → 看到仪表盘
2. 首页展示课表摘要 + 资料引导 + 推荐的人 + 活动入口
3. 从推荐的人进入聊天
4. 会话立即出现在聊天列表
5. 进入详情发送文字/语音
6. 处理联系方式交换
7. 主动结束会话
8. 返回聊天列表看到状态变化
9. 从匹配页进入聊天链路
10. Real 模式与 Mock 模式状态迁移一致

---

## 10. 蓝色主题实现指南

### 10.1 色彩 Token 映射（关键变更）

| Token | 旧值 | 新值 |
|-------|------|------|
| `brand-500` | `#4C6EF5` | `#2563EB` |
| `brand-400` | `#5B7FFF` | `#3B82F6` |
| `brand-600` | `#3D5FEE` | `#1D4ED8` |
| `bg-page` | `#F7F9FC` | `#F8FAFC` |
| `gradient-brand` | `linear-gradient(135deg, #5B7FFF, #7B9CFF)` | `linear-gradient(135deg, #2563EB, #60A5FA)` |

### 10.2 受影响的文件

| 文件 | 变更 |
|------|------|
| `apps/client/src/theme/tokens.ts` | 色彩 Token 更新 |
| `apps/client/src/theme/design-variables.scss` | SCSS 变量更新 |
| `apps/client/src/uni.scss` | 全局样式变量 |
| `design-system/tokens.ts` | 同步更新 |
| 所有页面 `.vue` 文件 | 确保使用 Token 而非硬编码颜色 |
| 所有 SVG 图标 | 替换 emoji，使用线面结合风格 |

---

## 11. 目录结构规范

```
campus-love-monorepo/
├── apps/
│   ├── api/                    # Spring Boot 后端
│   │   └── src/main/java/com/campuslove/api/
│   │       ├── auth/           # 认证模块
│   │       ├── profile/        # 资料模块
│   │       ├── home/           # 首页模块
│   │       ├── discover/       # 发现模块（推荐+活动+每日一问+兴趣圈）
│   │       ├── match/          # 匹配模块（喜欢+心跳+破冰）
│   │       ├── chat/           # 聊天模块（私信+临时+通知+WebSocket）
│   │       ├── village/        # 村口社区模块
│   │       ├── feedback/       # 反馈模块
│   │       ├── growth/         # 成长模块（签到+配置）
│   │       ├── user/           # 用户模块（关注+在线状态）
│   │       ├── entity/         # JPA 实体
│   │       ├── repository/     # JPA Repository
│   │       ├── config/         # 配置类
│   │       ├── runtime/        # Mock 运行时状态
│   │       └── debug/          # 调试控制器（仅dev）
│   ├── client/                 # uni-app 前端
│   │   └── src/
│   │       ├── pages/          # 页面
│   │       ├── components/     # 组件
│   │       ├── stores/         # Pinia stores
│   │       ├── services/       # API + Mock + WebSocket
│   │       ├── composables/    # 组合式函数
│   │       ├── config/         # 配置
│   │       ├── guards/         # 路由守卫
│   │       ├── theme/          # 设计 Token
│   │       ├── static/         # 静态资源（SVG图标等）
│   │       └── subpackages/    # 分包
│   └── admin/                  # 后台管理（预留）
├── database/flyway/            # 数据库迁移
├── docs/                       # 文档
│   ├── proposal.md             # 需求文档
│   ├── detailed-design.md      # 详细设计
│   ├── prompt.md               # VibeCoding Prompt
│   └── tasks/                  # 任务清单
├── tests/                      # 集成/结构测试
├── tools/                      # 工具脚本
├── scripts/                    # Python 脚本
├── design-system/              # 设计系统
├── progress.md                 # 进度跟踪
└── package.json                # Monorepo 根配置
```
