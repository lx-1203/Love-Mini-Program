# 问题修复建议清单

## 一、修复优先级总览

| 优先级 | 数量 | 修复时间窗口 | 阻断交付 |
|--------|------|------------|---------|
| P0 致命 | 12 | 立即（24h 内） | ✅ 是 |
| P1 严重 | 26 | 1 周内 | ⚠️ 部分 |
| P2 一般 | 10 | 2 周内 | ❌ 否 |
| P3 轻微 | 4 | 1 月内 | ❌ 否 |
| **合计** | **52** | - | - |

---

## 二、P0 致命问题修复清单（立即修复）

### P0-01 聊天会话跳转触发登出
- **位置**：`apps/client/src/guards/session-guard.ts` + `apps/client/src/pages/chat-session/index.vue`
- **现象**：点击聊天会话（URL: `/pages/chat-session/index?sessionId=1`）后跳转至登录页
- **根因**：session-guard 守卫在会话跳转时检测到 session 状态异常，触发登出逻辑
- **修复建议**：
  1. 检查 session-guard 在路由跳转时的 session 校验逻辑
  2. 确保 sessionId 参数传递不触发 token 失效判断
  3. 修复 chat-session 页面的 session 加载逻辑，避免守卫误判
- **工作量**：2-4 小时
- **技术可行性**：高（已有 session 守卫框架，仅需调试逻辑）

### P0-02 资料完善后村口仍锁定
- **位置**：`apps/client/src/guards/profile-guard.ts` + `apps/client/src/config/page-access.ts`
- **现象**：资料完善度显示 100%，但访问 `/pages/village/index` 仍显示锁定提示
- **根因**：profile-guard 的解锁条件与 profile store 的完善度计算不一致
- **修复建议**：
  1. 统一 profile-guard 解锁条件与 profile store 完善度计算
  2. 检查 `LOCKED_PAGES` 配置与 `page-access.ts` 的一致性
  3. 完善度达 100% 后自动移除村口锁定
- **工作量**：2-3 小时
- **技术可行性**：高

### P0-03 WebSocket token 明文 URL 传递
- **位置**：`apps/client/src/services/websocket.ts:282-284`
- **现象**：WebSocket 连接 URL 含 `?token=xxx`，且 `console.log` 打印含 token 的 URL
- **根因**：STOMP WebSocket 不支持自定义 Header，开发者用 URL 参数传递
- **修复建议**：
  1. 改用 STOMP connectHeaders 传递 token
  2. 移除 `console.log` 打印含 token URL 的代码
  3. 后端 STOMP 握手拦截器从 Header 读取 token
- **工作量**：4-6 小时
- **技术可行性**：高（STOMP 协议支持 Header）

### P0-04 管理员密码明文比较
- **位置**：`apps/api/src/main/java/.../RealAuthService.java:213`
- **现象**：管理员登录用 `String.equals` 明文比较密码
- **根因**：未集成 BCrypt 密码编码器
- **修复建议**：
  1. 引入 `BCryptPasswordEncoder`
  2. 用户注册/创建时加密密码
  3. 登录用 `matches` 校验
  4. 数据库迁移：现有密码全部重置并要求首次登录修改
- **工作量**：4-8 小时
- **技术可行性**：高

### P0-05 Mock profile 全 permitAll
- **位置**：`apps/api/src/main/java/.../SecurityConfig.java`（mock profile）
- **现象**：Mock profile 下所有接口 `permitAll`，包括 `/api/admin/**`
- **根因**：开发期便利配置误留
- **修复建议**：
  1. Mock profile 保留 `/api/auth/**` permitAll
  2. `/api/admin/**` 强制 JWT + 角色校验
  3. 通过 `@Profile` 隔离 mock 与 real 的 SecurityConfig
- **工作量**：2-4 小时
- **技术可行性**：高

### P0-06 数据库默认空密码
- **位置**：`apps/api/src/main/resources/application-db.yml:7`
- **现象**：数据库连接密码为空
- **根因**：开发期本地数据库无密码
- **修复建议**：
  1. 移除硬编码密码，改用 `${DB_PASSWORD}` 环境变量
  2. 本地开发用 `.env` 文件或 `application-local.yml`
  3. 生产强制非空密码
- **工作量**：1-2 小时
- **技术可行性**：高

### P0-07 admin-openid 含 change-me 默认值
- **位置**：`apps/api/src/main/resources/application-db.yml:18`
- **现象**：`admin-openid: change-me`
- **根因**：开发期占位符
- **修复建议**：
  1. 移除默认值，强制环境变量
  2. 启动时校验非 `change-me`，否则拒绝启动
- **工作量**：1 小时
- **技术可行性**：高

### P0-08 mock 密钥硬编码
- **位置**：`apps/api/src/main/resources/application-mock.yml:10`
- **现象**：JWT 签名密钥硬编码在配置文件
- **根因**：开发期便利
- **修复建议**：
  1. 密钥改用 `${JWT_SECRET}` 环境变量
  2. 启动时校验密钥长度与复杂度
- **工作量**：1 小时
- **技术可行性**：高

### P0-09 默认凭据明文展示
- **位置**：`apps/admin/src/views/Login.vue:79`
- **现象**：登录页展示"默认账号：admin / admin123"
- **根因**：开发期提示，未移除
- **修复建议**：
  1. 移除该提示文本
  2. 生产构建强制无默认凭据
  3. 首次部署强制修改默认密码
- **工作量**：30 分钟
- **技术可行性**：高

### P0-10 前后端角色大小写不一致
- **位置**：`apps/admin/src/stores/session.ts:61` vs `apps/api/.../User.java:62`
- **现象**：前端校验 `role === 'admin'`，后端存储 `role = 'ADMIN'`
- **根因**：约定不一致
- **修复建议**：
  1. 统一使用大写 `ADMIN`/`USER`
  2. 或统一使用小写并后端 `@JsonValue` 转换
  3. 添加角色枚举类避免字符串硬编码
- **工作量**：1-2 小时
- **技术可行性**：高

### P0-11 admin stores 硬编码 admin/admin123
- **位置**：`apps/admin/src/stores/session.ts`
- **现象**：store 中硬编码默认凭据
- **修复建议**：
  1. 移除硬编码凭据
  2. 凭据仅从登录表单获取
  3. 登录失败明确提示
- **工作量**：30 分钟
- **技术可行性**：高

### P0-12 生产环境回退 localhost
- **位置**：`apps/client/src/services/env.ts:24-25`
- **现象**：生产环境 API URL 回退至 `http://localhost:8080`
- **修复建议**：
  1. 生产环境无 API URL 时拒绝启动
  2. 移除 localhost 回退
  3. 添加配置校验
- **工作量**：1 小时
- **技术可行性**：高

---

## 三、P1 严重问题修复清单（1 周内）

### P1-01 至 P1-06：管理后台全 Mock，需集成真实 API

| 编号 | 问题 | 位置 | 修复建议 | 工作量 |
|------|------|------|---------|--------|
| P1-01 | Dashboard 数据硬编码 | `Dashboard.vue` | 对接 `/api/admin/dashboard/stats` | 4h |
| P1-02 | Users CRUD 未实现 | `Users.vue` | 对接 `/api/admin/users` | 8h |
| P1-03 | Posts CRUD 未实现 | `Posts.vue` | 对接 `/api/admin/posts` | 8h |
| P1-04 | Feedback CRUD 未实现 | `Feedback.vue` | 对接 `/api/admin/feedback` | 6h |
| P1-05 | 搜索功能未实现 | `Users.vue` | 后端添加搜索参数 | 2h |
| P1-06 | convertProposal 不创建活动 | `AdminCertificationController` | 实现活动创建逻辑或修改命名 | 4h |

### P1-07 至 P1-12：后端管理 API 缺失

| 编号 | 缺失接口 | 修复建议 | 工作量 |
|------|---------|---------|--------|
| P1-07 | 用户管理 API | 实现 `/api/admin/users` CRUD | 8h |
| P1-08 | 帖子管理 API | 实现 `/api/admin/posts` CRUD | 6h |
| P1-09 | 仪表盘统计 API | 实现 `/api/admin/dashboard/stats` | 6h |
| P1-10 | 配置管理 API | 实现 `/api/admin/config/*` | 8h |
| P1-11 | 审计日志 API | 实现 AuditLog 实体 + 查询接口 | 12h |
| P1-12 | 评论/举报 API | 实现 `/api/admin/comments`、`/api/admin/reports` | 8h |

### P1-13 至 P1-18：安全机制缺失

| 编号 | 问题 | 修复建议 | 工作量 |
|------|------|---------|--------|
| P1-13 | 无 token 黑名单 | 实现 Redis token 黑名单或 DB 失效标记 | 6h |
| P1-14 | 无登录失败锁定 | 实现 5 次失败锁定 15 分钟 | 3h |
| P1-15 | 无验证码 | 实现图形验证码或滑块验证 | 4h |
| P1-16 | JWT 无 role claim | JWT 添加 role claim + 接口校验 | 4h |
| P1-17 | CORS 遗漏 5177 | 添加 `http://localhost:5177` 到 CORS 白名单 | 30min |
| P1-18 | JwtAuthenticationFilter 每次查库 | 引入 Redis token 缓存 | 6h |

### P1-19 至 P1-22：性能与质量

| 编号 | 问题 | 修复建议 | 工作量 |
|------|------|---------|--------|
| P1-19 | 5MB 资源传输 | 实现路由懒加载 + 代码分割 | 8h |
| P1-20 | 2 次未捕获 Promise | 添加全局 `unhandledrejection` 处理 + 修复具体 Promise | 4h |
| P1-21 | AdminCertificationController 注释矛盾 | 修正注释或实现 | 1h |
| P1-22 | profile-guard 双重定义 | 统一至 `page-access.ts` | 2h |

### P1-23 至 P1-26：其他

| 编号 | 问题 | 修复建议 | 工作量 |
|------|------|---------|--------|
| P1-23 | 缺少手机号登录 | 实现手机号 + 验证码登录 | 12h |
| P1-24 | 11 次文本嵌套警告 | 修复 uni-app 文本组件嵌套 | 2h |
| P1-25 | 匹配按钮无文字标签 | 添加 "喜欢"/"不喜欢" 文字 | 1h |
| P1-26 | 推荐偏好未在主流程 | 设置流程添加推荐偏好步骤 | 2h |

---

## 四、P2 一般问题修复清单（2 周内）

| 编号 | 问题 | 位置 | 修复建议 | 工作量 |
|------|------|------|---------|--------|
| P2-01 | 系统配置仅静态 | MatchConfig 等 | 实现运行时配置 API + UI | 16h |
| P2-02 | 无 token 静默刷新 | 前端 http.ts | 实现 refresh token 机制 | 6h |
| P2-03 | 截图多次超时 | 渲染压力 | 优化长任务 + 代码分割 | 4h |
| P2-04 | 设置子页面跳转不一致 | 设置流程 | 统一跳转逻辑 | 2h |
| P2-05 | 无 HTTP 缓存策略 | 后端 | 添加 ETag/Cache-Control | 4h |
| P2-06 | 无路由懒加载 | vite.config.ts | 配置 dynamic import | 4h |
| P2-07 | 无 Service Worker | 客户端 | 可选 PWA 离线支持 | 8h |
| P2-08 | 无错误上报 | 全局 | 集成 Sentry/自建上报 | 6h |
| P2-09 | 无性能监控 | 全局 | 集成 RUM 监控 | 6h |
| P2-10 | 无单元测试覆盖率统计 | 全局 | 配置 vitest 覆盖率 + CI 门槛 | 4h |

---

## 五、P3 轻微问题修复清单（1 月内）

| 编号 | 问题 | 修复建议 | 工作量 |
|------|------|---------|--------|
| P3-01 | Vite CJS 弃用警告 | 升级 vite.config.ts 为 ESM | 1h |
| P3-02 | LCP Load Delay 占比 78% | 优化资源加载优先级 | 4h |
| P3-03 | 控制台 uni-app 警告 | 修复文本组件嵌套 | 2h |
| P3-04 | 默认 avatar 占位图 | 优化默认头像设计 | 2h |

---

## 六、修复优先级与工作量汇总

| 优先级 | 数量 | 预计工作量 | 修复窗口 |
|--------|------|-----------|---------|
| P0 致命 | 12 | ~30 小时 | 24h 内 |
| P1 严重 | 26 | ~140 小时 | 1 周内 |
| P2 一般 | 10 | ~54 小时 | 2 周内 |
| P3 轻微 | 4 | ~9 小时 | 1 月内 |
| **合计** | **52** | **~233 小时** | - |

## 七、技术可行性分析

### 7.1 高可行性（可直接修复）
- 所有 P0 问题（架构已支持，仅需调试/配置）
- P1 安全机制（Spring Security 生态完善）
- P1 后端 API（CRUD 模板化开发）

### 7.2 中等可行性（需架构调整）
- P1 管理后台真实集成（需前后端联调）
- P2 运行时配置管理（需配置中心）
- P2 token 静默刷新（需 refresh token 流程）

### 7.3 低可行性（需重大改造）
- P2 PWA 离线支持（需 Service Worker 架构）
- P2 RUM 监控（需监控基础设施）

## 八、修复后回归测试建议

### 8.1 P0 修复后回归测试
1. 聊天会话跳转：点击会话成功进入详情页
2. 村口解锁：资料完善后村口正常显示
3. WebSocket：token 不出现在 URL，连接正常
4. 管理员登录：密码加密，登录正常
5. Mock profile：admin 接口需认证
6. 配置：无硬编码密码/密钥
7. 凭据：登录页无默认凭据提示
8. 角色一致性：前后端角色值统一

### 8.2 P1 修复后回归测试
1. 管理后台 CRUD 全流程
2. 审计日志查询
3. token 黑名单登出后失效
4. 登录失败锁定
5. CORS 跨域正常
6. 代码分割后首屏体积

## 九、修复责任建议

| 模块 | 负责人建议 | 修复内容 |
|------|-----------|---------|
| 客户端前端 | 前端工程师 | P0-01/02/12 + P1-19/20/22/23/24/25/26 |
| 管理后台前端 | 前端工程师 | P0-09/11 + P1-01/02/03/04/05 |
| 后端 API | 后端工程师 | P0-04/05/06/07/08/10 + P1-06~12/13~18/21 |
| 配置与运维 | DevOps | P0-06/07/08 + P1-17 |
| 测试与验收 | QA | 全部修复后回归测试 |

## 十、交付建议

1. **立即启动 P0 修复**（24h 内完成 12 项）
2. **P0 修复后回归测试**（确认核心链路顺畅）
3. **P1 修复并行推进**（1 周内完成 26 项）
4. **P1 修复后管理端验收**（确认管理端可用）
5. **P2/P3 按计划推进**（2-4 周内完成）
6. **全部修复后最终验收**（确认生产就绪）

**关键里程碑**：P0 修复 + 回归测试通过 = 核心业务链路顺畅，达到交付最低标准。
