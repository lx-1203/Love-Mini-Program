# 全项目代码审计修复 - 技术设计文档

## 1. 架构概述

项目为 monorepo 结构（pnpm workspace）：
- **apps/client**: uni-app (Vue 3 + TypeScript + SCSS) 前端客户端
- **apps/api**: Spring Boot 3 + JPA 后端服务
- **apps/admin**: Vue 3 + Vite + TypeScript 管理后台
- **database/flyway**: Flyway 数据库迁移

## 2. 修复策略

### 2.1 P0 安全漏洞修复方案

#### S1/S2: Agnes AI API Key
- **方案**: 移除客户端硬编码密钥，在后端新增 `/api/ai/video/generate` 代理端点
- **后端新增**: `AiProxyController.java` — 接收请求，使用服务端环境变量 `AGNES_API_KEY` 转发
- **前端修改**: `agnes-video.ts` 改为调用自身后端代理
- **脚本修改**: `media-gen/config.ts` 改为 `process.env.AGNES_API_KEY`

#### S3: 管理员密码明文注释
- **方案**: 修改 SQL 注释，移除明文密码，改为"默认密码通过环境变量 ADMIN_PASSWORD 设置"
- **文件**: `V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql`

#### S4: 管理后台开发凭据
- **方案**: 移除硬编码凭据，改为环境变量 `VITE_DEV_USERNAME` / `VITE_DEV_PASSWORD`
- **文件**: `apps/admin/src/stores/session.ts`

#### S5: Gitleaks 不阻断 CI
- **方案**: 移除 `continue-on-error: true`

#### S6: openid 日志泄露
- **方案**: 第 156 行的 `log.error` 中 openid 参数改为 `maskOpenid(openid)` 调用

#### S7: 默认管理员弱密码
- **方案**: 将 `application-db.yml` 中 `ADMIN_PASSWORD_HASH` 默认值设为空，`DatabaseConfigValidator` 增加非空校验

#### S8: 图片审核
- **方案**: 标记为 P2 待实现（需要微信 `security.imgSecCheck` 资质审核），暂不处理

#### S9: 文件上传魔数校验
- **方案**: `LocalMediaStorageService.java` 增加魔数校验，读取文件头部字节比对

### 2.2 P0 Bug 修复方案

#### B1: BCrypt 哈希缺引号
- **方案**: 占位符外添加单引号 → `'${flyway:adminPasswordHash}'` (直接用 Flyway placeholder 语法)

#### B2: MediaUploadController 认证绕过
- **方案**: 删除兜底返回 1L 的逻辑，未认证直接抛 `AccessDeniedException`

#### B3: WeChatPushService 竞态
- **方案**: `getAccessToken()` 加 `synchronized`，在方法内部双重检查

#### B4: 10 个外键缺 CASCADE
- **方案**: 新增 Flyway 迁移 `V2026.07.25.0001__add_on_delete_cascade.sql`

#### B5/B6: 重复文件
- **方案**: 删除根目录 `apps/client/pages.json` 和 `apps/client/subpackages/` 目录

### 2.3 P1 功能缺口修复方案

#### 假按钮修复
- 有后端 API 的 → 对接 API
- 暂无后端 API 的 → 移除按钮或显示 "功能开发中" dialog
- 装饰性元素（通知铃铛等）→ 已有数据则对接数据，无则移除点击区域

#### 占位功能修复
- 手机登录 → 保留 UI，明确标注 "暂不支持，请使用微信登录"
- VIP 开通 → 保留 mock 行为，标记清楚
- 搜索/群聊/恋爱助手 → 明确标记 "开发中"

### 2.4 设计/体验修复

- 删除 7 个僵尸组件
- 删除 3 个零引用 Store
- 全局处理重复 CSS 工具类 — App.vue 中删除与 global.scss 重复的定义

## 3. 文件变更清单

### 新增文件
- `apps/api/src/main/java/com/campuslove/api/ai/AiProxyController.java`
- `database/flyway/sql/V2026.07.25.0001__add_on_delete_cascade.sql`

### 修改文件

#### 前端 (apps/client)
- `src/services/agnes-video.ts` — 改为调后端代理
- `src/App.vue` — 删除重复 CSS 工具类
- `src/pages/home/index.vue` — 假按钮修复
- `src/pages/chat-session/index.vue` — 表情/更多按钮处理
- `src/pages/messages/index.vue` — 占位功能标记
- `src/pages/login/index.vue` — 手机登录标记
- `src/pages/village/index.vue` — 分享按钮 + 加载更多
- `src/pages/circle/index.vue` — 分享按钮 + 帖子点击
- `src/pages/vip/index.vue` — mock 标记
- `src/pages/verification/index.vue` — API 调用
- `src/services/websocket.ts` — 断连提示
- `src/config/page-access.ts` — 移除 deprecated
- `src/services/env.ts` — 修复诊断日志

#### 后端 (apps/api)
- `src/main/resources/application-db.yml` — 移除默认凭据
- `RealAuthService.java` — 日志脱敏
- `MediaUploadController.java` — 认证修复
- `WeChatPushService.java` — 同步缓存
- `LocalMediaStorageService.java` — 魔数校验
- `SecurityConfig.java` — CORS 统一
- `WebConfig.java` — 移除重复 CORS

#### 管理后台 (apps/admin)
- `src/stores/session.ts` — 移除硬编码凭据
- `src/views/Feedback.vue` — 实现处理函数
- `src/views/Users.vue` — 修复 filteredUsers + statusLabel
- `src/views/AuditLogs.vue` — 修复 err.message 重复

#### 数据库
- `V2026.06.25.0002` — 修复引号 + 移除明文密码
- `V2026.05.28.0002` — 修正 collation

#### 配置/脚本
- `.github/workflows/ci.yml` — 移除 continue-on-error
- `.gitleaks.toml` — 收缩白名单
- 10+ 个脚本文件 — 绝对路径改为相对路径

### 删除文件
- `apps/client/pages.json` — 旧版本
- `apps/client/subpackages/` — 全部 7 个文件
- `apps/client/src/components/login/` — 5 个僵尸组件
- `apps/client/src/components/layout/ChatHeader.vue`
- `apps/client/src/components/chat/ChatItem.vue`
- `apps/client/src/stores/campus-wall.ts`
- `apps/client/src/stores/vip.ts` — 参考前确认无引用
- `apps/client/src/stores/home.ts` — 参考前确认无引用

## 4. 技术决策与权衡

| 决策 | 理由 |
|------|------|
| AI API 代理到后端而非简单移除 | 保留功能但保证安全 |
| 假按钮优先"标记开发中"而非删除 | 保持 UI 设计完整，方便后续实现 |
| 图片审核标记 P2 而非立即实现 | 需要微信资质 + 第三方服务接入，非纯代码 |
| 手机登录保持 UI 但禁用 | 保留代码便于后续接入，当前不误导用户 |
| synchronized 而非 ReentrantLock | 微信 token 调用频率低，简单同步足够 |
