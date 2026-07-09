# 管理员角色测试 - 代码审查报告

> 文档编号：02-admin-code-review
> 审查角色：管理员角色测试子智能体（代码审查）
> 审查日期：2026-06-25
> 审查范围：d:\6\恋爱小程序 管理端模块（apps/admin + apps/api 管理相关代码）

---

## 1. 概述

### 1.1 审查范围

本次审查聚焦于管理员角色相关功能链路，覆盖以下三个层面：

- **管理端前端**（apps/admin/src）：登录、仪表盘、用户管理、帖子管理、反馈管理、整体布局、会话 Store、路由守卫共 8 个核心文件。
- **后端管理 API**（apps/api）：`/api/admin/**`、`/api/auth/admin/**` 路径下的所有 Controller、Service、Security 配置、JWT 过滤器、User 实体（含 role 字段）。
- **系统配置与审计**：匹配算法、推荐策略、通知、敏感词、JWT、管理员密码等配置类；审计日志能力。

### 1.2 审查方法

1. 静态代码逐文件审查，关注功能完整性、安全漏洞、权限隔离、错误处理、与设计文档一致性。
2. 跨层比对：前端调用点 vs 后端接口暴露点 vs 数据库 schema vs 配置文件，识别"前端 mock 不接真接口""后端接口存在但前端未调用"等典型缺口。
3. 权限矩阵分析：普通用户 vs 管理员，分别在 real / mock profile 下的访问边界。
4. 安全维度覆盖：认证强度、会话管理、密码策略、CORS、CSRF、XSS、注入、越权、敏感信息泄露、审计日志。

### 1.3 总体结论

管理端目前处于 **"原型可用、生产不可用"** 阶段：

- 前端 5 个核心页面全部使用硬编码 Mock 数据，**没有任何真实 API 调用**，按钮操作仅 `console.log`。
- 后端 `/api/admin/**` 仅 3 条接口（认证审核、反馈列表、活动提案转换），**缺用户管理、帖子管理、仪表盘统计、配置管理**等核心管理 API。
- 权限校验在 real profile 下基本完整（`hasRole("ADMIN")`），但 mock profile 完全放行，存在误部署风险。
- **完全没有审计日志**，仅有零散 `log.info`，无法满足管理操作可追溯要求。
- 系统配置功能仅以 `@ConfigurationProperties` 形式存在，**无运行时配置管理 UI / API**。

---

## 2. 管理端前端模块清单与实现状态

### 2.1 `apps/admin/src/main.ts` — 应用入口

- **实现状态**：✅ 已实现
- **评估**：标准 Vue 3 + Pinia + Vue Router 启动流程，挂载 App.vue 前未做任何全局错误兜底，未注册全局 axios 拦截器（项目也确实未引入 axios，统一使用 `fetch`）。
- **问题**：无。

### 2.2 `apps/admin/src/App.vue` — 根组件

- **实现状态**：✅ 已实现（仅挂载时调用 `sessionStore.bootstrap()`）
- **评估**：`bootstrap()` 仅从 localStorage 读取已存 token / user，**不向后端验证 token 是否仍有效**。若管理员 token 已在后端失效（如服务端密码已轮换），前端依旧放行进入 Dashboard。
- **问题**：见 P-03。

### 2.3 `apps/admin/src/router/index.ts` — 路由守卫

- **实现状态**：⚠️ 部分实现
- **评估**：
  - 守卫仅判断 `sessionStore.isLoggedIn`（= `!!user && !!token`），**不校验角色**、**不校验 token 是否过期**、**不向后端验证**。
  - 路由 meta 上没有 `roles` / `permissions` 字段，未来扩展细粒度权限需大改。
  - 未实现登录后跳转回原目标页（`redirect` query 参数）。
- **问题**：见 P-04、P-05。

### 2.4 `apps/admin/src/stores/session.ts` — 管理员会话

- **实现状态**：⚠️ 部分实现
- **评估**：
  - 生产路径调用 `POST /api/auth/admin/login`，已将硬编码凭据从生产链路移除，方向正确。
  - DEV 环境仍保留 `admin / admin123` mock 登录，且在 `Login.vue` 页面明文展示（见 2.5）。
  - **致命**：role 校验使用 `data.user.role !== "admin"`（小写），但后端 `User.isAdmin()` 判定的是 `"ADMIN"`（大写），且数据库列默认 `USER` / `ADMIN` 全大写。两端不一致，会导致真实管理员登录被前端误判为"非管理员"而拒登。
  - token 存 localStorage（XSS 可窃取），未考虑 HttpOnly Cookie 方案。
  - 未做 token 过期前自动刷新。
- **问题**：见 P-01（致命）、P-06、P-07。

### 2.5 `apps/admin/src/views/Login.vue` — 登录页

- **实现状态**：⚠️ 部分实现
- **评估**：
  - 表单仅做"非空"校验，无用户名长度、密码强度提示。
  - **严重**：UI 模板中明文渲染 `默认账号：admin / admin123`，生产构建（`vite build`）后该提示仍会出现在浏览器 DOM 中，**凭据泄露**。
  - 无登录失败次数限制、无验证码、无 IP 频次控制。
  - 无"忘记密码"流程。
- **问题**：见 P-02（严重）、P-08。

### 2.6 `apps/admin/src/views/Dashboard.vue` — 仪表盘

- **实现状态**：❌ 未实现（仅 UI 壳）
- **评估**：
  - `stats` 与 `recentActivities` 全部为 `onMounted` 内硬编码 Mock 值（总用户 1234、今日活跃 89、帖子 567、待处理反馈 12）。
  - **无任何 fetch / API 调用**，后端也无对应 `/api/admin/dashboard` 或 `/api/admin/stats` 接口。
  - 用户看到的"统计"与真实业务完全脱钩，无法用于运营决策。
- **问题**：见 P-09、P-10。

### 2.7 `apps/admin/src/views/Users.vue` — 用户管理

- **实现状态**：❌ 未实现（仅 UI 壳）
- **评估**：
  - 列表数据为 2 条硬编码 Mock（id=1 "星野"、id=2 "小明"）。
  - 搜索按钮仅 `console.log("搜索:", searchQuery.value)`，不发请求。
  - 编辑按钮 `console.log("编辑用户:", user)`，删除按钮仅 `confirm()` 后 `console.log`，**不调用任何后端接口，也不修改本地列表**。
  - 后端**完全没有** `/api/admin/users` 相关接口（无列表、无编辑、无禁用、无删除）。
  - 无分页、无状态筛选、无批量操作、无导出。
- **问题**：见 P-11。

### 2.8 `apps/admin/src/views/Posts.vue` — 帖子管理

- **实现状态**：❌ 未实现（仅 UI 壳）
- **评估**：
  - 列表数据为 2 条硬编码 Mock。
  - 编辑/删除按钮均仅 `console.log`，无实际操作。
  - 后端**完全没有** `/api/admin/posts` 相关接口（无管理员删除/隐藏/置顶/加精）。
  - 无内容审核流程、无违规举报入口、无敏感词命中记录展示。
- **问题**：见 P-12。

### 2.9 `apps/admin/src/views/Feedback.vue` — 反馈管理

- **实现状态**：❌ 未实现（仅 UI 壳，且后端接口已存在但未被调用）
- **评估**：
  - 列表数据为 2 条硬编码 Mock。
  - "查看" / "处理" 按钮仅 `console.log`。
  - **后端实际存在** `GET /api/admin/feedback` 与 `POST /api/admin/activity-proposals/{id}/convert`（FeedbackController.java:55、60），但前端**完全没有对接**。
  - 缺回复反馈、状态流转（处理中→已处理）、指派处理人等管理动作。
- **问题**：见 P-13。

### 2.10 `apps/admin/src/views/Layout.vue` — 整体布局

- **实现状态**：✅ 已实现
- **评估**：左侧菜单 + 顶部用户信息 + 退出按钮的标准布局。退出登录调用 `sessionStore.logout()`，逻辑闭环。
- **问题**：菜单写死 4 项，无权限驱动的动态菜单。无面包屑、无页签、无全局通知入口。

---

## 3. 后端管理 API 清单

| # | 路径 | 方法 | 权限校验 | 功能描述 | 文件位置 | 状态 |
|---|------|------|----------|----------|----------|------|
| 1 | `/api/auth/admin/login` | POST | `permitAll` | 管理员账号密码登录，签发 JWT | `AuthController.java:92` | ✅ 已实现 |
| 2 | `/api/auth/admin/logout` | POST | 已认证 | 管理员登出（仅记录日志，不做 token 失效） | `AuthController.java:103` | ⚠️ 部分实现 |
| 3 | `/api/admin/certifications` | GET | `hasRole("ADMIN")` | 列出校园认证申请（按状态过滤） | `AdminCertificationController.java:45` | ✅ 已实现（仅 real profile） |
| 4 | `/api/admin/certifications/{id}/review` | POST | `hasRole("ADMIN")` | 审核通过/拒绝校园认证 | `AdminCertificationController.java:68` | ✅ 已实现 |
| 5 | `/api/admin/feedback` | GET | `hasRole("ADMIN")` | 列出所有反馈（排除活动提案） | `FeedbackController.java:55` | ✅ 已实现 |
| 6 | `/api/admin/activity-proposals/{id}/convert` | POST | `hasRole("ADMIN")` | 活动提案转换为活动（仅改状态） | `FeedbackController.java:60` | ⚠️ 部分实现（未真正创建 Activity） |
| — | `/api/admin/users` | — | — | 用户列表/编辑/禁用/删除 | — | ❌ 未实现 |
| — | `/api/admin/posts` | — | — | 帖子删除/隐藏/置顶/审核 | — | ❌ 未实现 |
| — | `/api/admin/dashboard` 或 `/api/admin/stats` | — | — | 全局统计 | — | ❌ 未实现 |
| — | `/api/admin/config/match` | — | — | 匹配算法权重/阈值管理 | — | ❌ 未实现 |
| — | `/api/admin/config/recommendation` | — | — | 推荐策略管理 | — | ❌ 未实现 |
| — | `/api/admin/config/notification` | — | — | 通知策略管理 | — | ❌ 未实现 |
| — | `/api/admin/config/sensitive-words` | — | — | 敏感词列表管理 | — | ❌ 未实现 |
| — | `/api/admin/config/security` | — | — | 登录策略/密码策略管理 | — | ❌ 未实现 |
| — | `/api/admin/audit-logs` | — | — | 审计日志查询 | — | ❌ 未实现 |

### 3.1 关键说明

- **权限校验位置**：所有 `/api/admin/**` 权限校验集中在 `SecurityConfig.java:68`，通过 `.requestMatchers("/api/admin/**").hasRole("ADMIN")` 实现，**未使用** `@PreAuthorize` 注解（项目未启用 `@EnableMethodSecurity`）。
- **角色注入**：`JwtAuthenticationFilter.java:101-105` 每次请求查库判断 `user.isAdmin()` 并注入 `ROLE_ADMIN`。
- **Mock profile 风险**：`MockSecurityConfig.java:39` 配置 `anyRequest().permitAll()`，**所有 admin 端点在 mock 模式下完全无权限校验**。若 mock profile 被误部署到生产环境，所有人可访问所有 admin 接口。
- **CORS 配置缺口**：`SecurityConfig.java:88-90` 仅允许 `5173 / 5174` 端口，**管理端运行在 5177**（`apps/admin/vite.config.ts:13`），生产/开发环境管理端调用后端会被浏览器 CORS 拦截。

---

## 4. 权限管理评估

### 4.1 角色定义

| 维度 | 实现 |
|------|------|
| 角色枚举 | `User.role` 字段（字符串，"USER" / "ADMIN"），`User.java:62` |
| 数据库列 | `users.role VARCHAR(16) NOT NULL DEFAULT 'USER'`，由 `V2026.06.25.0001__add_user_role_and_init_admin.sql` 添加 |
| 初始化管理员 | Flyway 迁移脚本通过 placeholder 插入一个 `role='ADMIN'` 的用户，openid/nickname 由 `application-db.yml` 配置 |
| 管理员密码 | **不存数据库**，由环境变量 `ADMIN_PASSWORD` 注入，`RealAuthService.java:51` 通过 `@Value` 读取 |
| `isAdmin()` 助手 | `User.java:162`，使用 `equalsIgnoreCase` 判断 |

**评估**：角色定义基本完整，但**仅二值（USER/ADMIN），无中间角色**（如运营、审核员、只读审计员），未来扩展性受限。

### 4.2 权限校验机制

| 层级 | 机制 | 评估 |
|------|------|------|
| 前端路由守卫 | `router/index.ts:46`，仅判断 `isLoggedIn` | ❌ 不校验角色，不校验 token 有效性 |
| 前端按钮显隐 | 无 `v-if="hasPermission(...)"` 指令 | ❌ 无细粒度权限 |
| 后端 SecurityConfig | `/api/admin/**` → `hasRole("ADMIN")`（仅 real profile） | ✅ real 模式下基本有效 |
| 后端方法级 | 未使用 `@PreAuthorize` | ⚠️ 无法做"同部门""本人"等细粒度 |
| 后端业务层 | `AdminCertificationController` 通过 `SecurityUtils.getCurrentUserId()` 记录 reviewerId | ✅ 审核人追溯可行 |
| Mock profile | `MockSecurityConfig.java:39` 全部 permitAll | ❌ 完全跳过权限校验 |
| JWT 角色 claim | `JwtTokenProvider.generateToken()` 仅 subject=userId，**无 role claim** | ⚠️ 每次请求都查库取 role |

### 4.3 角色隔离完整性

| 场景 | 隔离是否完整 |
|------|-------------|
| 普通用户访问 `/api/admin/**`（real） | ✅ 被 Spring Security 拦截 403 |
| 普通用户访问 `/api/admin/**`（mock） | ❌ 放行 |
| 伪造 localStorage 进入管理端 Dashboard | ❌ 前端无后端校验，可进入页面（但调真接口会被 403 拦） |
| Token 被盗用 | ⚠️ 无 IP/UA 校验，无 token 黑名单，登出后 token 仍有效至过期（24h） |
| 同一 token 跨账号切换 | ✅ 隔离（token 内含 userId） |
| 普通用户调管理员接口获取他人数据 | ✅ 阻断 |

### 4.4 已识别漏洞

| 编号 | 漏洞 | 影响 |
|------|------|------|
| V-01 | Mock profile 全部 permitAll，无任何 admin 校验 | 若误部署，全员可调所有 admin 接口 |
| V-02 | 前端 `data.user.role !== "admin"` 与后端 `"ADMIN"` 大小写不一致 | 真实管理员无法通过前端登录（功能阻断） |
| V-03 | 前端路由守卫不校验 token 有效性，仅靠 localStorage | 攻击者可伪造 localStorage 进入页面（但实际 API 调用会被 403） |
| V-04 | `Login.vue` 页面明文展示 `admin / admin123` | 凭据泄露，任何人打开页面即可看到默认账号 |
| V-05 | 管理员密码明文存储于环境变量，比较时使用 `String.equals` | 时序攻击风险（虽较低），且无 hash 防泄露 |
| V-06 | 管理员账号 openid 字段复用为用户名 | 设计混乱，普通用户若 openid 恰为 "admin" 会引发逻辑冲突 |
| V-07 | CORS 未包含管理端端口 5177 | 管理端调真后端被 CORS 拦截 |
| V-08 | 无登录失败次数限制 | 可暴力破解管理员密码 |

---

## 5. 系统配置功能评估

### 5.1 匹配算法配置

| 项 | 实现状态 |
|----|----------|
| 配置类 | ✅ `MatchConfig.java`（`@ConfigurationProperties(prefix="app.match")`） |
| 字段 | ✅ heartSignalExpireHours、candidatePageSize、defaultChatDuration、campusWeight、cityWeight、interestWeight、scheduleWeight |
| 配置文件 | ✅ `application.yml:27-34` 提供默认值 |
| 运行时调整 API | ❌ 无 `/api/admin/config/match` GET/PUT 接口 |
| 管理端 UI | ❌ Dashboard / Settings 页面无配置入口 |
| 修改后热生效 | ❌ 需重启服务 |
| 审计记录 | ❌ 无 |

**结论**：⚠️ 部分实现。配置已外移至 yml，但管理员无法在运行时调整。

### 5.2 推荐策略配置

| 项 | 实现状态 |
|----|----------|
| 配置类 | ✅ `RecommendationConfig.java` |
| 字段 | ✅ dailyLimit、discussionLimit、candidatePageSize、campusWeight、cityWeight、interestWeight、scheduleWeight、sameSchoolBoostPercent、sameMajorWeight、commonCircleWeight、commonDailyAnswerWeight、circleWeight、sameSchoolBoostEnabled |
| 配置文件 | ✅ `application.yml:19-26` |
| 运行时调整 API | ❌ 无 |
| 管理端 UI | ❌ 无 |
| A/B 测试支持 | ❌ 无 |

**结论**：⚠️ 部分实现。字段最全，但同样无可视化管理入口。

### 5.3 通知配置

| 项 | 实现状态 |
|----|----------|
| 用户级推送偏好 | ✅ `PushPreference` 实体 + `PushPreferenceService`（每用户配置） |
| 全局通知策略 | ❌ 无开关、无频次上限、无静默时段配置 |
| 管理端 UI | ❌ 无 |
| 通知模板管理 | ❌ 无 |

**结论**：❌ 未实现（用户级偏好不算管理端配置）。

### 5.4 安全配置

| 项 | 实现状态 | 备注 |
|----|----------|------|
| JWT 密钥 | ✅ `application.yml:14` 从 `JWT_SECRET` 环境变量读取，未设置时启动失败 | 安全实践正确 |
| JWT 过期时间 | ✅ 24h（`86400000` ms） | 偏长，建议缩短 + 引入 refresh token |
| 管理员密码 | ⚠️ `ADMIN_PASSWORD` 环境变量，明文存储，`String.equals` 比较 | 应升级为 BCrypt |
| 密码复杂度策略 | ❌ 无 | — |
| 密码轮换/历史 | ❌ 无 | — |
| 登录失败锁定 | ❌ 无 | 暴力破解风险 |
| 验证码 | ❌ 无 | — |
| 敏感词过滤 | ✅ `SensitiveWordFilter.java` 从 yml 读取关键词列表 | 替换为 `***` 而非拒绝，需配合人工审核 |
| 敏感词运行时管理 | ❌ 无 admin 接口 | 修改需改 yml + 重启 |
| CORS 白名单 | ⚠️ 仅 5173/5174，**遗漏管理端 5177** | 见 V-07 |
| CSRF | ✅ 已禁用（前后端分离 + JWT，合理） | — |
| 安全响应头 | ✅ X-Content-Type-Options、X-Frame-Options、HSTS 已配置 | `SecurityConfig.java:49-57` |
| IP 白名单 | ❌ 无 | 管理端建议叠加 IP 白名单 |

**结论**：⚠️ 部分实现。JWT 与响应头处理到位，但密码策略、登录防护、敏感词运行时管理缺失。

---

## 6. 审计日志评估

### 6.1 当前实现

| 维度 | 状态 |
|------|------|
| 审计日志实体 | ❌ 无独立 AuditLog entity / 表 |
| 审计日志服务 | ❌ 无 AuditLogService |
| 审计日志查询接口 | ❌ 无 `/api/admin/audit-logs` |
| 操作记录 - 管理员登录 | ⚠️ `RealAuthService.java:219` `log.info("管理员登录成功, userId={}, username={}")`，仅写应用日志，不入库 |
| 操作记录 - 管理员登出 | ⚠️ 同上，`RealAuthService.java:246` |
| 操作记录 - 认证审核 | ⚠️ `RealCampusCertificationService.java:142` `log.info("审核人 {} 将认证记录 id={} 审核为: {}")`，且 `reviewerId` 字段入库 |
| 操作记录 - 反馈处理 | ❌ `RealFeedbackService.convertProposal` 仅 `log.info`，未记录操作人 ID |
| 操作记录 - 用户删除/编辑 | ❌ 无接口，自然无日志 |
| 操作记录 - 帖子删除/隐藏 | ❌ 无接口 |
| 操作记录 - 配置变更 | ❌ 无接口 |
| 操作记录 - 敏感词变更 | ❌ 无接口 |
| 日志保留/归档 | ❌ 无策略 |
| 日志防篡改 | ❌ 无 |

### 6.2 评估结论

❌ **完全未实现审计日志体系**。当前仅有零散 `log.info` 写入应用日志文件，存在以下问题：

1. **不入库**：日志文件可被运维直接修改/删除，不具备审计取证能力。
2. **操作人不全**：`convertProposal` 等接口未记录操作人 ID。
3. **覆盖不全**：仅登录/认证审核有日志，绝大部分管理动作无日志。
4. **无查询接口**：即便有日志，管理员也无法在管理端检索。
5. **无告警**：敏感操作（如批量删除）无实时告警。

---

## 7. 业务完整性评估

### 7.1 管理操作对普通用户的影响

| 管理操作 | 是否存在 | 对普通用户的影响 | 数据准确性 |
|----------|----------|------------------|------------|
| 管理员审核校园认证 | ✅ 已实现 | 用户 `campusVerified` 状态变化，影响推荐权重 | ✅ 准确 |
| 管理员处理反馈 | ⚠️ 仅列表 + 转换提案 | 用户提交的反馈状态会被改 | ⚠️ convertProposal 未真正创建 Activity，状态字段 `convertedActivityId` 始终为 null |
| 管理员删除用户 | ❌ 未实现 | — | — |
| 管理员禁用用户 | ❌ 未实现 | — | — |
| 管理员删除/隐藏帖子 | ❌ 未实现 | — | — |
| 管理员修改匹配权重 | ❌ 未实现 | — | — |
| 管理员调整敏感词 | ❌ 未实现 | — | — |

### 7.2 数据准确性问题

1. **Dashboard 统计数据全部为 Mock**：用户看到的"总用户数 1234、今日活跃 89"等数字与数据库真实数据无关，**误导运营决策**。
2. **`convertProposal` 仅改状态不创建 Activity**（`RealFeedbackService.java:139-146`）：注释自承"暂时不创建 Activity 记录"，导致提案"转换"后实际无对应活动，用户看不到活动入口。
3. **AdminCertificationController 仅 real profile 可用**：mock profile 下该 Controller 不加载，前端在 mock 模式调接口会 404，但前端目前根本不调，问题被掩盖。
4. **审计 reviewerId 与 SecurityUtils.getCurrentUserId() 绑定**：在 mock profile 下 `SecurityUtils.getCurrentUserId()` 返回的 principal 是 `1L`（MockSecurityConfig.java:48），所有审核记录的 reviewerId 都是 1，无法区分真实操作人。

### 7.3 关键业务链路缺口

| 业务链路 | 状态 |
|----------|------|
| 管理员发现违规用户 → 禁用账号 → 用户被强制下线 | ❌ 完全缺失 |
| 管理员发现违规帖子 → 删除/隐藏 → 帖子从用户信息流消失 | ❌ 完全缺失 |
| 管理员调整匹配权重 → 实时生效 → 用户推荐结果变化 | ❌ 完全缺失 |
| 管理员处理用户反馈 → 回复用户 → 用户收到通知 | ❌ 完全缺失（仅 convertProposal） |
| 管理员登录失败 → 锁定账号 → 通知管理员 | ❌ 完全缺失 |
| 管理员查看审计日志 → 追溯误操作 → 恢复数据 | ❌ 完全缺失 |

---

## 8. 问题清单

### 8.1 致命（Critical）

#### P-01 前后端角色大小写不一致，导致真实管理员无法登录
- **位置**：`apps/admin/src/stores/session.ts:61`
- **描述**：前端判定 `data.user.role !== "admin"`（小写），后端 `User.java:62` 默认值为 `"USER"`，`isAdmin()` 判定 `"ADMIN"`（大写）。后端返回的 `UserSessionView` 不直接包含 role 字段（仅有 `displayName` 等），但前端若按预期拿到了 role，大小写不匹配会导致所有真实管理员被前端拒登。
- **建议**：统一使用大写 `"ADMIN"`；并在 `UserSessionView` 中显式增加 `role` 字段，由后端权威返回。

### 8.2 严重（High）

#### P-02 登录页面明文展示默认凭据
- **位置**：`apps/admin/src/views/Login.vue:79`
- **描述**：模板中硬编码 `<text>默认账号：admin / admin123</text>`，生产构建后该文本仍存在于浏览器 DOM，任何访问者均可获取默认管理员凭据。
- **建议**：移除该提示；或仅在 `import.meta.env.DEV` 时渲染，且改为"开发环境默认账号见 README"。

#### P-03 应用启动时不向后端校验 token 有效性
- **位置**：`apps/admin/src/App.vue:8` + `apps/admin/src/stores/session.ts:27-40`
- **描述**：`bootstrap()` 仅从 localStorage 读取 token/user，不调用 `/api/auth/me` 验证。token 在后端已失效（密码轮换、服务重启清空内存态）后，前端仍展示管理界面，直到第一次 API 调用 401 才暴露。
- **建议**：`bootstrap()` 中调用一次 `GET /api/auth/me`，失败则清空本地态并跳登录页。

#### P-04 路由守卫不校验角色与 token 过期
- **位置**：`apps/admin/src/router/index.ts:46-56`
- **描述**：仅判断 `isLoggedIn`，不校验 `user.role === "ADMIN"`，不解析 JWT exp 字段。
- **建议**：守卫中增加 `if (to.meta.requiresAuth && sessionStore.user?.role !== 'ADMIN') next({name:'Login'})`；并增加 token 过期本地预判（exp < Date.now()/1000 时主动登出）。

#### P-05 Mock profile 全部 permitAll，无管理员校验
- **位置**：`apps/api/src/main/java/com/campuslove/api/config/MockSecurityConfig.java:39`
- **描述**：mock profile 下 `anyRequest().permitAll()`，所有 `/api/admin/**` 接口对任意请求开放。若误部署到生产（误配置 `spring.profiles.default=mock`），所有用户可调用所有管理接口。
- **建议**：mock profile 也应模拟管理员身份判断，至少在 `/api/admin/**` 上注入 `ROLE_ADMIN` 之外的拦截；或在 MockSecurityConfig 中显式拒绝 `/api/admin/**` 的非 mock-user 访问。强烈建议增加启动时 profile 校验，禁止 mock profile 在生产环境运行。

#### P-06 CORS 未包含管理端端口
- **位置**：`apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java:88-90`
- **描述**：`allowedOriginPatterns` 仅含 `5173 / 5174`，管理端 `vite.config.ts:13` 运行在 `5177`，导致管理端调用后端被浏览器 CORS 拦截。
- **建议**：补充 `http://localhost:5177`、`http://127.0.0.1:5177`；生产环境按管理端实际域名配置。

#### P-07 管理员密码明文比较，无 hash
- **位置**：`apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java:213`
- **描述**：`if (!adminPassword.equals(password))` 直接字符串比较，环境变量泄露即等于密码泄露；且 `String.equals` 存在时序攻击风险（虽 Java 实现可能被 JIT 优化，仍建议规避）。
- **建议**：使用 BCrypt：环境变量 `ADMIN_PASSWORD_BCRYPT` 存哈希，比较时 `BCryptPasswordEncoder.matches(raw, hash)`。

#### P-08 无登录失败次数限制与验证码
- **位置**：`apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java:195-221`
- **描述**：`loginAsAdmin` 无任何失败次数统计与锁定逻辑，可被无限次尝试，结合无验证码，存在暴力破解风险。
- **建议**：引入 Redis 计数（key=`admin:login:fail:{username}`，5 次失败锁定 15 分钟）；登录页增加图形验证码（失败 3 次后强制）。

### 8.3 一般（Medium）

#### P-09 Dashboard 统计全部 Mock，无真实接口
- **位置**：`apps/admin/src/views/Dashboard.vue:11-25`
- **描述**：统计与最近活动均为硬编码值，运营无法基于真实数据决策。
- **建议**：后端新增 `GET /api/admin/dashboard/stats` 返回 `{totalUsers, todayActive, totalPosts, pendingFeedback}`；前端 onMounted 调用并渲染。

#### P-10 Users 页面无真实增删改查
- **位置**：`apps/admin/src/views/Users.vue:4-39`
- **描述**：列表硬编码，搜索/编辑/删除按钮仅 `console.log`，后端无对应接口。
- **建议**：后端新增 `GET/PUT/DELETE /api/admin/users/{id}`；前端对接并增加二次确认弹窗、加载态、错误提示。

#### P-11 Posts 页面无真实管理与审核流程
- **位置**：`apps/admin/src/views/Posts.vue:4-35`
- **描述**：同 P-10，帖子管理无任何真实操作；后端也无 `/api/admin/posts`。
- **建议**：后端新增 `DELETE /api/admin/posts/{id}`（软删除）、`PUT /api/admin/posts/{id}/status`（隐藏/置顶）；前端实现审核工作台。

#### P-12 Feedback 页面未对接已存在的后端接口
- **位置**：`apps/admin/src/views/Feedback.vue:4-30`
- **描述**：后端已有 `GET /api/admin/feedback` 与 `POST /api/admin/activity-proposals/{id}/convert`，但前端完全使用 Mock 数据，未调用。
- **建议**：前端 onMounted 调 `GET /api/admin/feedback`；"处理"按钮调 `convertProposal`；增加反馈回复接口与 UI。

#### P-13 convertProposal 未真正创建 Activity
- **位置**：`apps/api/src/main/java/com/campuslove/api/feedback/RealFeedbackService.java:139-146`
- **描述**：注释自承"暂时不创建 Activity 记录"，仅把 Feedback 状态改为 CONVERTED，`convertedActivityId` 始终为 null。
- **建议**：调用 `ActivityService.create(...)` 创建对应活动并回填 `convertedActivityId`。

#### P-14 JWT 无角色 claim，每次请求查库
- **位置**：`apps/api/src/main/java/com/campuslove/api/config/JwtAuthenticationFilter.java:101-105` + `apps/api/src/main/java/com/campuslove/api/config/JwtTokenProvider.java:40-50`
- **描述**：token 仅 subject=userId，每次请求需查 `userRepository.findById(userId)` 判断是否管理员，高频接口下数据库压力倍增。
- **建议**：在 token 中增加 `role` claim；过滤器优先读 claim，必要时再查库刷新。

#### P-15 登出后 token 仍有效
- **位置**：`apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java:236-247`
- **描述**：`doLogout` 仅 `log.info`，不维护 token 黑名单，token 在剩余有效期内（最长 24h）仍可被复用。
- **建议**：引入 Redis token 黑名单（key=`jwt:blacklist:{jti}`，TTL=剩余有效期），过滤器中校验。

#### P-16 JWT 过期时间 24h 偏长且无 refresh token
- **位置**：`apps/api/src/main/resources/application.yml:15`
- **描述**：access token 24h，被盗后窗口期长；无 refresh token 机制。
- **建议**：access token 缩短到 30min，refresh token 7d，前端在 401 时自动刷新。

#### P-17 无审计日志实体与服务
- **位置**：全工程
- **描述**：见第 6 章，管理操作无法追溯。
- **建议**：新增 `audit_log` 表（id, operatorId, operatorRole, action, targetType, targetId, detail(JSON), ip, ua, createdAt），所有 admin 接口入口处统一 AOP 切面写入；提供 `GET /api/admin/audit-logs` 查询接口。

#### P-18 角色仅有 USER/ADMIN，无中间角色
- **位置**：`apps/api/src/main/java/com/campuslove/api/entity/User.java:55-62`
- **描述**：无运营、审核员、只读审计等角色，无法做细粒度授权。
- **建议**：扩展 role 枚举或引入独立 `roles` + `permissions` 表结构。

#### P-19 AdminCertificationController 控制器注释与实际不符
- **位置**：`apps/api/src/main/java/com/campuslove/api/admin/AdminCertificationController.java:24`
- **描述**：类注释写"当前实现：任何已认证用户可访问（简易版），生产环境应增加角色校验"，但实际 SecurityConfig 已通过 `hasRole("ADMIN")` 强制校验。注释误导。
- **建议**：更新注释，移除过时描述。

#### P-20 前端 fetch 调用未统一封装，无拦截器
- **位置**：`apps/admin/src/stores/session.ts:49-78`
- **描述**：直接使用原生 `fetch`，无统一 401 跳登录、无统一错误提示、无统一 Authorization header 注入。后续接入更多接口时代码重复严重。
- **建议**：封装 `request.ts`，统一处理 token、错误、超时。

### 8.4 轻微（Low）

#### P-21 路由守卫未支持 redirect 回跳
- **位置**：`apps/admin/src/router/index.ts:50`
- **描述**：跳登录页时未携带 `redirect` query，登录后无法回原目标页。
- **建议**：`next({ name: "Login", query: { redirect: to.fullPath } })`，登录成功后优先跳 `redirect`。

#### P-22 Login.vue 无密码强度提示与显示/隐藏切换
- **位置**：`apps/admin/src/views/Login.vue:57-66`
- **描述**：密码输入框无"显示密码"切换；无强度提示。
- **建议**：增加 `<input :type="showPwd ? 'text' : 'password'">` 与切换按钮。

#### P-23 Dashboard 卡片图标使用 emoji
- **位置**：`apps/admin/src/views/Dashboard.vue:5-8`
- **描述**：跨平台显示不一致。
- **建议**：替换为 SVG 图标库（如 `@element-plus/icons-vue` 或自定义 SVG）。

#### P-24 Users.vue 表格无分页与筛选
- **位置**：`apps/admin/src/views/Users.vue:60-94`
- **描述**：硬编码 2 条数据无分页，真实场景下数据量大时性能与体验差。
- **建议**：引入分页组件，支持状态/校区/年级筛选。

#### P-25 Layout.vue 菜单写死
- **位置**：`apps/admin/src/views/Layout.vue:8-13`
- **描述**：菜单项硬编码，未来按角色动态显隐需重构。
- **建议**：菜单数据由 store 统一管理，结合 `user.role` 过滤。

#### P-26 AdminCertificationController 仅 real profile 加载
- **位置**：`apps/api/src/main/java/com/campuslove/api/admin/AdminCertificationController.java:26`
- **描述**：`@Profile("real")` 限制，mock 模式下该 Bean 不存在，前端 mock 模式调接口会 404。当前前端未对接因此未暴露，但属于配置不一致。
- **建议**：mock 模式提供 mock 实现，或前端在 mock 模式不调用。

#### P-27 全局错误处理缺失
- **位置**：`apps/admin/src/main.ts` + `apps/admin/src/App.vue`
- **描述**：未注册 `app.config.errorHandler`，未捕获 Promise rejection，组件抛错直接白屏。
- **建议**：注册全局错误处理器，统一上报与用户提示。

---

## 9. 总体评分

| 维度 | 权重 | 得分 | 加权 |
|------|------|------|------|
| 前端功能完整性 | 25% | 25 | 6.25 |
| 后端 API 完整性 | 20% | 35 | 7.00 |
| 权限管理与隔离 | 20% | 55 | 11.00 |
| 系统配置能力 | 10% | 30 | 3.00 |
| 审计日志 | 10% | 5 | 0.50 |
| 安全防护 | 10% | 50 | 5.00 |
| 代码质量与可维护性 | 5% | 60 | 3.00 |
| **合计** | **100%** | — | **35.75** |

### 总体评分：**36 / 100**（不合格）

### 评级说明

- 0-30：原型阶段，不可用于生产
- 31-60：功能严重缺失，仅能做内部演示
- 61-80：基础完整，需补强后可上线
- 81-95：生产可用
- 96-100：优秀

### 核心改进建议（按优先级）

1. **P-01**：立即修复前后端角色大小写不一致，否则真实管理员无法登录。
2. **P-02 + P-08**：移除登录页默认凭据展示，引入登录失败锁定与验证码。
3. **P-05**：禁止 mock profile 在生产环境运行；至少为 `/api/admin/**` 增加最低校验。
4. **P-03 + P-04**：前端 bootstrap 校验 token，路由守卫校验角色。
5. **P-09 ~ P-13**：实现用户/帖子/反馈/仪表盘真实接口对接，移除 Mock。
6. **P-17**：建立审计日志体系，覆盖所有管理操作。
7. **P-06 + P-07**：补全 CORS、升级密码 hash。
8. **P-14 ~ P-16**：JWT 优化（role claim、黑名单、refresh token）。

---

> 本报告由代码审查子智能体于 2026-06-25 基于代码静态分析生成，所有问题均给出具体文件路径与行号，建议结合运行时测试报告（如 03-engineer-code-review.md）综合决策。
