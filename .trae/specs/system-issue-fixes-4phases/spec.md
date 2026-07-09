# 系统问题修复 4 阶段计划 Spec

## Why

系统综合测试已完成（参见 `system-comprehensive-testing` spec），共发现 52 个问题（12 P0 / 26 P1 / 10 P2 / 4 P3），其中 2 个 P0 级问题直接阻断核心业务链路：
1. 聊天会话跳转触发登出（用户无法进入聊天会话）
2. 资料完善后村口仍锁定（用户完成资料后无法访问讨论圈/我的页面）

此外，管理端 12 类后端 API 完全缺失，安全凭据多处明文/硬编码，系统当前不具备生产可用性。本 spec 按 4 阶段递进修复，确保业务链路先打通，再补齐管理端，再做安全加固，最后做性能优化。

## What Changes

### Phase 1（紧急，1-2 天）：P0 业务阻断点 + 安全凭据
- 修复聊天会话跳转触发登出 BUG（`apps/client/src/guards/session-guard.ts`）
- 修复资料完善后村口仍锁定 BUG（`apps/client/src/guards/profile-guard.ts` + `apps/client/src/config/page-access.ts` + `apps/client/src/stores/session.ts` 完善度同步）
- 修复管理员密码明文比较（`apps/api/.../RealAuthService.java`，引入 BCrypt）
- 修复默认凭据明文展示（`apps/admin/src/views/Login.vue`）
- 修复角色大小写不一致（前端 `admin` ↔ 后端 `ADMIN`，统一为 `ADMIN`）

### Phase 2（3-5 天）：管理端 12 类后端 API 补齐
- 用户管理 API：列表/详情/编辑/禁用启用
- 内容管理 API：帖子审核/评论管理/举报处理
- 系统配置 API：参数配置/规则设置/开关控制
- 数据统计 API：用户/活跃度/匹配统计
- 匹配算法配置 API、推荐策略配置 API
- 通知配置 API、敏感词过滤 API
- 审计日志 API（管理操作可追溯）
- 管理端前端切换 Mock → Real 模式

### Phase 3（5-7 天）：安全加固
- BCrypt 密码加密完整接入（前端注册/登录、后端鉴权）
- JWT 密钥外部化（移除 `application-mock.yml` 硬编码密钥）
- WebSocket token 改为 Header 传递（移除 URL 明文）
- 数据库默认密码移除（`application-db.yml` 空 password / change-me 默认值）
- Mock profile `permitAll` 全放行收敛为按角色鉴权

### Phase 4（2-3 天）：性能优化 + 解锁提示优化
- 资源分包：96 个脚本资源合并优化（vendor-vue 已有，扩展到 vant/uni-app 等）
- 首屏优化：5MB 传输瘦身，懒加载非首屏路由
- 解锁提示优化：村口/我的页面被锁定时给出友好引导弹窗，含"去完善资料"按钮
- 解锁引导蒙层：首次进入锁定页时显示一次性蒙层提示

## Impact

- **Affected specs**: `system-comprehensive-testing`（测试报告中的问题逐项消除）
- **Affected code**:
  - 客户端：`apps/client/src/guards/`、`apps/client/src/config/page-access.ts`、`apps/client/src/stores/session.ts`、`apps/client/src/services/websocket.ts`
  - 管理端：`apps/admin/src/views/Login.vue`、`apps/admin/src/stores/session.ts`、`apps/admin/src/api/*`（Mock → Real）
  - 后端：`apps/api/src/main/java/com/loveapp/api/`（新增 12 类 admin controller/service、`SecurityConfig`、`RealAuthService`、`application-*.yml`）
- **Breaking changes**:
  - **BREAKING**：角色值统一为 `ADMIN`/`USER`（前端 `admin`/`user` 不再使用），数据库需迁移现有角色字段
  - **BREAKING**：JWT 密钥改为从环境变量读取，部署时必须配置 `JWT_SECRET`
  - **BREAKING**：数据库密码改为从环境变量读取，部署时必须配置 `DB_PASSWORD`

## ADDED Requirements

### Requirement: 聊天会话跳转不再触发登出
系统 SHALL 在用户从聊天列表点击会话进入聊天详情时，保持会话登录状态不被破坏。

#### Scenario: 用户从消息列表进入聊天会话
- **WHEN** 已登录用户在 `/pages/messages/index` 点击某个聊天会话
- **THEN** 应正确跳转到聊天会话详情页，且 session 状态保持 `isLoggedIn = true`
- **AND** 不应触发 `session-guard` 重定向到 `/pages/login/index`

#### Scenario: 聊天会话跳转后返回
- **WHEN** 用户从聊天会话详情页返回消息列表
- **THEN** 消息列表应正确显示，无重复登录提示

### Requirement: 资料完善后村口解锁
系统 SHALL 在用户完成资料完善（`isProfileComplete = true`）后，立即解锁村口/讨论圈/我的页面访问限制。

#### Scenario: 用户完成资料完善后访问村口
- **WHEN** 用户在 `/subpackages/setup/profile/index` 提交资料并通过校验
- **AND** `sessionStore.isProfileComplete` 变为 `true`
- **THEN** 用户访问 `/pages/village/index` 应直接进入，不被重定向
- **AND** `profile-guard` 与 `session-guard` 的完善度判定应一致

#### Scenario: 资料完善度同步
- **WHEN** 资料保存成功
- **THEN** `session store` 的 `profileCompletion` 与 `isProfileComplete` 应在 100ms 内同步更新
- **AND** 不应出现 store 已更新但 guard 仍读取旧值的情况

### Requirement: 管理员密码 BCrypt 加密
系统 SHALL 对管理员密码使用 BCrypt 算法加密存储与校验，禁止明文比较。

#### Scenario: 管理员登录密码校验
- **WHEN** 管理员提交用户名和密码
- **THEN** 后端应使用 `BCryptPasswordEncoder.matches(rawPassword, hashedPassword)` 校验
- **AND** 不应出现 `rawPassword.equals(storedPassword)` 的明文比较

### Requirement: 管理端 12 类后端 API 完整提供
系统 SHALL 在后端实现 12 类管理端 API，并接入管理前端，使管理端从全 Mock 模式切换为 Real 模式。

#### Scenario: 管理员查看用户列表
- **WHEN** 管理员在管理端用户管理页打开列表
- **THEN** 前端应调用 `GET /api/admin/users` 真实接口
- **AND** 后端应返回分页用户数据，含角色/状态/注册时间
- **AND** 不应返回 Mock 数据

#### Scenario: 管理员审核帖子
- **WHEN** 管理员对某帖子执行审核操作（通过/拒绝）
- **THEN** 应调用 `POST /api/admin/posts/{id}/audit` 接口
- **AND** 操作应记录到审计日志

### Requirement: JWT 密钥外部化
系统 SHALL 从环境变量读取 JWT 密钥，禁止在配置文件硬编码。

#### Scenario: 应用启动时加载密钥
- **WHEN** 后端应用启动
- **THEN** 应从 `JWT_SECRET` 环境变量读取密钥
- **AND** 若环境变量未配置，应启动失败并给出明确错误

### Requirement: WebSocket token 走 Header 传递
系统 SHALL 通过 WebSocket Subprotocol Header 传递 token，禁止 URL 明文。

#### Scenario: 客户端建立 WebSocket 连接
- **WHEN** 客户端发起 WebSocket 连接
- **THEN** token 应通过 `Sec-WebSocket-Protocol` Header 传递
- **AND** URL 中不应出现 `?token=xxx` 参数

### Requirement: 解锁提示友好引导
系统 SHALL 在用户访问被锁定页面时，提供清晰的引导提示而非静默重定向。

#### Scenario: 未完善资料用户访问村口
- **WHEN** 未完善资料的用户点击村口入口
- **THEN** 应显示 Modal 弹窗，文案："完成资料完善即可解锁村口"
- **AND** 提供"去完善资料"按钮，点击跳转到 `/subpackages/setup/profile/index`
- **AND** 提供"暂不完善"按钮，关闭弹窗并停留在当前页

## MODIFIED Requirements

### Requirement: 角色权限值统一
原系统前端使用小写 `admin`/`user`，后端使用大写 `ADMIN`/`USER`，导致权限校验不一致。修改后统一为大写 `ADMIN`/`USER`。

#### Scenario: 管理员登录后角色判定
- **WHEN** 管理员登录成功
- **THEN** 前端 `session store` 的 `role` 字段应为 `ADMIN`（大写）
- **AND** 前端权限判断 `role === 'ADMIN'` 应通过
- **AND** 后端 `User.role` 字段应为 `ADMIN`

### Requirement: SecurityConfig 鉴权收敛
原 Mock profile 中所有接口 `permitAll` 全放行。修改后按角色鉴权：

#### Scenario: 普通用户访问管理接口
- **WHEN** 普通用户（角色 `USER`）调用 `/api/admin/**` 接口
- **THEN** 应返回 403 Forbidden
- **AND** 不应返回任何管理数据

#### Scenario: 未登录用户访问受保护接口
- **WHEN** 未登录用户调用 `/api/user/**` 接口
- **THEN** 应返回 401 Unauthorized

## REMOVED Requirements

### Requirement: Mock profile 默认放行
**Reason**: Mock profile 中 `permitAll` 全放行存在严重安全风险，任何未登录用户可访问所有接口。
**Migration**: 改为 `permitAll` 仅放行 `/api/auth/login`、`/api/auth/register`、`/api/public/**`，其他接口按角色鉴权。

### Requirement: 默认数据库空密码
**Reason**: `application-db.yml` 中数据库密码为空，存在未授权访问风险。
**Migration**: 改为从 `DB_PASSWORD` 环境变量读取，部署文档强制要求配置。
