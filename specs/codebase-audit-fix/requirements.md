# 全项目代码审计修复 - 需求文档

## 1. 功能概述

对微信恋爱小程序全项目进行系统性修复，覆盖**前端、后端、数据库、配置、管理后台**五大模块。修复范围基于 8 个 Agent 并行审计发现的 210+ 项问题。

## 2. 修复目标

### 2.1 🔴 P0 安全漏洞（必须立即修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| S1 | Agnes AI API Key 明文硬编码 | `apps/client/src/services/agnes-video.ts#L18` | 任何人均可提取使用，产生费用 |
| S2 | Agnes AI Key 重复暴露 | `apps/client/scripts/media-gen/config.ts#L14` | 同上 |
| S3 | 管理员密码明文写死在 SQL 注释 | `database/flyway/sql/V2026.06.25.0002` | Git 历史永久可见 |
| S4 | 开发凭据 `admin/admin123` 硬编码 | `apps/admin/src/stores/session.ts#L83` | 构建失误可泄露到生产 |
| S5 | Gitleaks 密钥扫描不阻断 CI | `.github/workflows/ci.yml#L127` | 真正密钥泄露不会被阻止 |
| S6 | openid 泄露在错误日志 | `apps/api/.../RealAuthService.java#L156` | 敏感信息明文进日志 |
| S7 | 默认管理员密码哈希 `password` | `apps/api/.../application-db.yml#L29` | 弱密码可被爆破 |
| S8 | 图片审核完全缺失 | 全项目 | 社交 App 高风险 |
| S9 | 文件上传仅验扩展名 | `apps/api/.../LocalMediaStorageService.java` | 可绕过上传恶意文件 |

### 2.2 🔴 P0 致命 Bug

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| B1 | BCrypt 哈希占位符缺引号 → SQL 语法错误 | `database/flyway/sql/V2026.06.25.0002#L35` | 迁移执行失败 |
| B2 | 认证失败兜底返回 userId=1 | `apps/api/.../MediaUploadController.java#L94` | 匿名可上传 |
| B3 | access_token 缓存无同步锁 | `apps/api/.../WeChatPushService.java#L34` | 高并发 token 风暴 |
| B4 | 10 个外键缺 ON DELETE CASCADE | 多个 Flyway 文件 | 用户删除操作失败 |
| B5 | 双份 pages.json 内容不同 | `apps/client/pages.json` vs `src/pages.json` | 构建指向不确定 |
| B6 | 双份 subpackages/ 目录 | `apps/client/subpackages/` vs `src/subpackages/` | 构建不一致 |

### 2.3 🟡 P1 功能缺口（12 个假按钮 + 15 个占位功能）

| 页面 | 假按钮 | 占位功能 |
|------|--------|----------|
| `home/index.vue` | 通知铃铛、换一批、帖子评论、帖子收藏、推荐卡片 | 课表空闲选项 |
| `chat-session/index.vue` | 表情按钮(smile)、更多按钮(+) | — |
| `chat/index.vue` | 话题推荐标签 | — |
| `messages/index.vue` | — | 搜索、群聊、恋爱助手 |
| `village/index.vue` | 分享按钮 | 加载更多(hasMore=false) |
| `circle/index.vue` | 分享按钮、帖子点击 | — |
| `login/index.vue` | — | 验证码(无SMS)、手机登录(无API)、协议(仅toast) |
| `vip/index.vue` | — | 开通(仅mock) |
| `verification/index.vue` | — | 认证(仅setTimeout) |
| `shop/index.vue` | — | 全部(仅mock数据) |

### 2.4 🟡 P1 设计/体验问题

- 设计 Token 使用率仅 35-45%，533+ 硬编码颜色
- 设计系统文档全面过时（v1/v2 vs 实际 v3）
- 7 个僵尸组件零引用
- 3 个 Store 零引用
- WebSocket 断连无用户提示
- 首页无加载指示器
- 48+ console.log 生产环境未清理
- 40+ `any` 类型
- 55 处 `catch (Exception e)` 泛化

### 2.5 🟢 P2 轻微优化

- 魔法数字提取常量
- i18n 文案集中管理
- 缺失数据库索引
- 字符集 collation 不一致
- CI 流程补充 lint/覆盖率

## 3. 验收标准

### 3.1 P0 安全

- [ ] Given 任何人查看源码，When 搜索 API Key 或密码，Then 不应在客户端代码/SQL注释中找到
- [ ] Given 有人提交真实密钥，When CI 运行 Gitleaks，Then CI 必须失败
- [ ] Given openid 出现在错误日志，When 查看日志，Then openid 已被脱敏
- [ ] Given 上传重命名的恶意文件，When 校验，Then 魔数不匹配应被拒绝

### 3.2 P0 Bug

- [ ] Given 默认 Flyway 占位符值，When 执行迁移，Then SQL 语法正确无错误
- [ ] Given 未认证请求上传文件，When 调用 upload，Then 返回 401 而非归到 userId=1
- [ ] Given 高并发获取 access_token，When 多线程调用，Then 仅一次微信 API 请求
- [ ] Given 删除用户，When 执行，Then 关联数据同步清理不被外键阻止
- [ ] Given 构建项目，When 读取 pages.json，Then 使用唯一正确的 `src/pages.json`

### 3.3 P1 功能

- [ ] Given 点击任意按钮，When 按钮可见且可点击，Then 必须有实际功能而非 toast/console.log/noop
- [ ] Given 按钮功能暂未实现，When 渲染，Then 应显示"开发中"状态或隐藏

### 3.4 P1 设计/体验

- [ ] Given 检查全局样式，When 统计 CSS 变量引用 vs 硬编码颜色，Then Token 使用率应 ≥ 70%
- [ ] Given 存在零引用组件/Store，When 代码审查，Then 应被删除或标记复用计划
- [ ] Given WebSocket 断连/重连失败，When 发生，Then 用户能收到 UI 提示

## 4. 非功能性需求

- 不引入新依赖（除非绝对必要）
- 遵循现有命名规范（Java: camelCase, 前端: kebab-case + Composition API）
- 保持 Mock/Real 双 Profile 模式兼容
- 保持 uni-app 跨平台兼容性

## 5. 影响范围

基于审计覆盖的分析，修复涉及：
- **前端**: 30+ 个 .vue 文件, 10+ 个 .ts/.js 文件
- **后端**: 20+ 个 Java 文件, 5+ 个配置文件
- **数据库**: 10+ 个 Flyway 迁移文件
- **配置**: 5+ 个 yml/json/toml 文件
- **脚本**: 10+ 个 .bat/.mjs/.ps1 文件
- **文档**: 5+ 个设计系统 .md 文件
- **CI/CD**: 2 个 workflow 文件
