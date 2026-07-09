# Tasks

## Phase 1：P0 业务阻断点 + 安全凭据修复（紧急，1-2 天）

- [x] 任务 1: 修复聊天会话跳转触发登出 BUG
  - [x] 子任务 1.1: 排查 `apps/client/src/guards/session-guard.ts` 在聊天会话跳转时的执行路径
  - [x] 子任务 1.2: 排查 `apps/client/src/pages/messages/index` 跳转到聊天会话详情的参数传递
  - [x] 子任务 1.3: 修复 session-guard 在某些条件下误判 `isLoggedIn = false` 的问题
  - [x] 子任务 1.4: 验证从消息列表 → 聊天会话 → 返回消息列表的完整流程无登出
  - [x] 子任务 1.5: 截图验证（before/after）

- [x] 任务 2: 修复资料完善后村口仍锁定 BUG
  - [x] 子任务 2.1: 排查 `apps/client/src/guards/profile-guard.ts` 与 `apps/client/src/config/page-access.ts` 完善度判定不一致问题
  - [x] 子任务 2.2: 排查 `apps/client/src/stores/session.ts` 的 `isProfileComplete` / `profileCompletion` 状态更新时机
  - [x] 子任务 2.3: 修复 profile-guard 与 session-guard 的完善度判定逻辑统一
  - [x] 子任务 2.4: 修复 LOCKED_PAGES 与 page-access.ts 中 `requiresProfile` 配置一致性
  - [x] 子任务 2.5: 验证资料完善 → 村口/讨论圈/我的页面立即解锁
  - [x] 子任务 2.6: 截图验证（before/after）

- [x] 任务 3: 修复管理员密码明文比较
  - [x] 子任务 3.1: 在 `apps/api/.../RealAuthService.java:213` 引入 `BCryptPasswordEncoder`
  - [x] 子任务 3.2: 修改管理员密码校验逻辑为 `bcrypt.matches(rawPassword, storedHash)`
  - [x] 子任务 3.3: 为现有管理员账号生成 BCrypt 哈希并更新数据库
  - [x] 子任务 3.4: 提供密码重置工具脚本（用于存量数据迁移）
  - [x] 子任务 3.5: 单元测试覆盖 BCrypt 校验逻辑

- [x] 任务 4: 修复默认凭据明文展示
  - [x] 子任务 4.1: 移除 `apps/admin/src/views/Login.vue:79` 默认账号密码明文展示
  - [x] 子任务 4.2: 改为从环境变量读取默认凭据（仅开发环境）
  - [x] 子任务 4.3: 生产环境强制要求首次登录修改密码
  - [x] 子任务 4.4: 截图验证（before/after）

- [x] 任务 5: 修复角色大小写不一致
  - [x] 子任务 5.1: 统一前端 `apps/admin/src/stores/session.ts:61` 角色 `admin` → `ADMIN`
  - [x] 子任务 5.2: 统一客户端所有角色判断为 `ADMIN`/`USER`（大写）
  - [x] 子任务 5.3: 后端 `User.java:62` 角色字段强制大写
  - [x] 子任务 5.4: 数据库迁移脚本：将存量 `admin`/`user` 值更新为 `ADMIN`/`USER`
  - [x] 子任务 5.5: 单元测试覆盖角色判定逻辑
  - [x] 子任务 5.6: 端到端测试：管理员登录后权限校验通过

## Phase 2：管理端 12 类后端 API 补齐（3-5 天）

- [x] 任务 6: 用户管理 API
  - [x] 子任务 6.1: `GET /api/admin/users` 分页列表接口
  - [x] 子任务 6.2: `GET /api/admin/users/{id}` 用户详情接口
  - [x] 子任务 6.3: `PUT /api/admin/users/{id}` 编辑用户接口
  - [x] 子任务 6.4: `POST /api/admin/users/{id}/disable` 禁用用户接口
  - [x] 子任务 6.5: `POST /api/admin/users/{id}/enable` 启用用户接口
  - [x] 子任务 6.6: 管理前端切换 Mock → Real
  - [x] 子任务 6.7: 接口测试

- [x] 任务 7: 内容管理 API
  - [x] 子任务 7.1: `GET /api/admin/posts` 帖子列表接口（含审核状态筛选）
  - [x] 子任务 7.2: `POST /api/admin/posts/{id}/audit` 帖子审核接口
  - [x] 子任务 7.3: `DELETE /api/admin/posts/{id}` 帖子删除接口
  - [x] 子任务 7.4: `GET /api/admin/comments` 评论列表接口
  - [x] 子任务 7.5: `DELETE /api/admin/comments/{id}` 评论删除接口
  - [x] 子任务 7.6: `GET /api/admin/reports` 举报列表接口
  - [x] 子任务 7.7: `POST /api/admin/reports/{id}/handle` 举报处理接口
  - [x] 子任务 7.8: 管理前端切换 Mock → Real
  - [x] 子任务 7.9: 接口测试

- [x] 任务 8: 系统配置 API
  - [x] 子任务 8.1: `GET /api/admin/configs` 参数配置列表接口
  - [x] 子任务 8.2: `PUT /api/admin/configs/{key}` 参数配置更新接口
  - [x] 子任务 8.3: `GET /api/admin/rules` 规则列表接口
  - [x] 子任务 8.4: `PUT /api/admin/rules/{id}` 规则更新接口
  - [x] 子任务 8.5: `GET /api/admin/switches` 开关控制列表接口
  - [x] 子任务 8.6: `PUT /api/admin/switches/{key}` 开关切换接口
  - [x] 子任务 8.7: 管理前端切换 Mock → Real
  - [x] 子任务 8.8: 接口测试

- [x] 任务 9: 数据统计 API
  - [x] 子任务 9.1: `GET /api/admin/stats/users` 用户统计接口
  - [x] 子任务 9.2: `GET /api/admin/stats/active` 活跃度统计接口
  - [x] 子任务 9.3: `GET /api/admin/stats/matches` 匹配统计接口
  - [x] 子任务 9.4: 管理前端切换 Mock → Real
  - [x] 子任务 9.5: 接口测试

- [x] 任务 10: 匹配算法与推荐策略配置 API
  - [x] 子任务 10.1: `GET /api/admin/match-config` 匹配算法配置查询接口
  - [x] 子任务 10.2: `PUT /api/admin/match-config` 匹配算法配置更新接口
  - [x] 子任务 10.3: `GET /api/admin/recommend-strategy` 推荐策略查询接口
  - [x] 子任务 10.4: `PUT /api/admin/recommend-strategy` 推荐策略更新接口
  - [x] 子任务 10.5: 管理前端切换 Mock → Real
  - [x] 子任务 10.6: 接口测试

- [x] 任务 11: 通知配置与敏感词 API
  - [x] 子任务 11.1: `GET /api/admin/notify-config` 通知配置查询接口
  - [x] 子任务 11.2: `PUT /api/admin/notify-config` 通知配置更新接口
  - [x] 子任务 11.3: `GET /api/admin/sensitive-words` 敏感词列表接口
  - [x] 子任务 11.4: `POST /api/admin/sensitive-words` 敏感词新增接口
  - [x] 子任务 11.5: `DELETE /api/admin/sensitive-words/{id}` 敏感词删除接口
  - [x] 子任务 11.6: 管理前端切换 Mock → Real
  - [x] 子任务 11.7: 接口测试

- [x] 任务 12: 审计日志 API
  - [x] 子任务 12.1: 创建 `audit_log` 表（Flyway 迁移）
  - [x] 子任务 12.2: 实现审计日志 AOP 切面，自动记录管理操作
  - [x] 子任务 12.3: `GET /api/admin/audit-logs` 审计日志分页查询接口
  - [x] 子任务 12.4: 管理前端审计日志页面接入
  - [x] 子任务 12.5: 接口测试

## Phase 3：安全加固（5-7 天）

- [x] 任务 13: BCrypt 密码加密完整接入
  - [x] 子任务 13.1: 后端注册接口使用 BCrypt 加密密码
  - [x] 子任务 13.2: 后端登录接口使用 BCrypt 校验密码
  - [x] 子任务 13.3: 客户端注册/登录流程验证
  - [x] 子任务 13.4: 管理端登录流程验证
  - [x] 子任务 13.5: 密码重置流程使用 BCrypt
  - [x] 子任务 13.6: 单元测试覆盖

- [x] 任务 14: JWT 密钥外部化
  - [x] 子任务 14.1: 移除 `application-mock.yml` 中硬编码 JWT 密钥
  - [x] 子任务 14.2: 改为从 `JWT_SECRET` 环境变量读取
  - [x] 子任务 14.3: 应用启动时校验 `JWT_SECRET` 存在，否则启动失败
  - [x] 子任务 14.4: 部署文档更新（说明必须配置 `JWT_SECRET`）
  - [x] 子任务 14.5: 单元测试覆盖

- [x] 任务 15: WebSocket token 改为 Header 传递
  - [x] 子任务 15.1: 修改 `apps/client/src/services/websocket.ts:282-284`，移除 URL `?token=xxx` 参数
  - [x] 子任务 15.2: 改为通过 `Sec-WebSocket-Protocol` Header 传递 token
  - [x] 子任务 15.3: 后端 WebSocket 握手处理器从 Header 提取 token
  - [x] 子任务 15.4: 客户端/服务端联调
  - [x] 子任务 15.5: 验证 WebSocket 连接建立与消息收发正常
  - [x] 子任务 15.6: 截图验证（before/after URL）

- [x] 任务 16: 数据库凭据外部化
  - [x] 子任务 16.1: 移除 `application-db.yml:7` 空 password 默认值
  - [x] 子任务 16.2: 移除 `application-db.yml:18` change-me 默认值
  - [x] 子任务 16.3: 改为从 `DB_PASSWORD` 环境变量读取
  - [x] 子任务 16.4: 应用启动时校验 `DB_PASSWORD` 存在
  - [x] 子任务 16.5: 部署文档更新
  - [x] 子任务 16.6: 单元测试覆盖

- [x] 任务 17: SecurityConfig 鉴权收敛
  - [x] 子任务 17.1: 修改 Mock profile 中 `permitAll` 全放行配置
  - [x] 子任务 17.2: 仅放行 `/api/auth/login`、`/api/auth/register`、`/api/public/**`
  - [x] 子任务 17.3: `/api/admin/**` 强制要求 `ADMIN` 角色
  - [x] 子任务 17.4: `/api/user/**` 强制要求 `USER` 角色且认证通过
  - [x] 子任务 17.5: 集成测试覆盖（401/403 场景）
  - [x] 子任务 17.6: 截图验证（before/after）

## Phase 4：性能优化 + 解锁提示优化（2-3 天）

- [x] 任务 18: 资源分包优化
  - [x] 子任务 18.1: 分析 96 个脚本资源依赖关系
  - [x] 子任务 18.2: 在 `apps/admin/vite.config.ts` 扩展 `manualChunks`（vant、uni-app、echarts 等）
  - [x] 子任务 18.3: 客户端 H5 构建分包优化
  - [x] 子任务 18.4: 验证资源数量从 96 降至 ≤ 30
  - [x] 子任务 18.5: 验证首屏传输从 5MB 降至 ≤ 2MB

- [x] 任务 19: 首屏优化
  - [x] 子任务 19.1: 路由懒加载审计（确保所有非首屏路由动态 import）
  - [x] 子任务 19.2: 图片懒加载（uni-app lazy-load 属性）
  - [x] 子任务 19.3: 关键 CSS 内联
  - [x] 子任务 19.4: Lighthouse 性能追踪对比
  - [x] 子任务 19.5: 验证 LCP ≤ 1.5s

- [x] 任务 20: 解锁提示友好引导
  - [x] 子任务 20.1: 实现通用 `UnlockGuideModal` 组件
  - [x] 子任务 20.2: 替换 `profile-guard` 静默重定向为 Modal 弹窗
  - [x] 子任务 20.3: 弹窗含"去完善资料"按钮（跳转 setup 页）
  - [x] 子任务 20.4: 弹窗含"暂不完善"按钮（关闭弹窗停留当前页）
  - [x] 子任务 20.5: 首次进入锁定页时显示一次性蒙层引导
  - [x] 子任务 20.6: 截图验证（before/after）

- [x] 任务 21: 性能与体验回归测试
  - [x] 子任务 21.1: Chrome DevTools Performance 追踪
  - [x] 子任务 21.2: Core Web Vitals 对比（LCP/CLS/INP）
  - [x] 子任务 21.3: 完整业务链路回归（登录→完善→匹配→聊天→讨论圈）
  - [x] 子任务 21.4: 生成 Phase 4 验收报告

# Task Dependencies

- [Phase 1 全部任务] 优先级最高，可并行
- [Phase 2 任务 6-12] 依赖 [Phase 1 任务 5 角色统一] 完成
- [Phase 3 任务 13-17] 依赖 [Phase 1 任务 3 BCrypt 引入] 完成
- [Phase 3 任务 15 WebSocket Header] 与 [Phase 2] 可并行
- [Phase 4 任务 18-19 性能优化] 与 [Phase 3] 可并行
- [Phase 4 任务 20 解锁提示] 依赖 [Phase 1 任务 2 资料完善 BUG 修复] 完成
- [Phase 4 任务 21 回归测试] 依赖 [Phase 1-3 全部完成]

# Parallelizable Tasks

- Phase 1 内任务 1-5 可并行（修复点彼此独立）
- Phase 2 内任务 6-12 可并行（API 类别彼此独立）
- Phase 3 内任务 13-17 可并行（安全修复点彼此独立）
- Phase 4 任务 18-19 可与 Phase 3 并行
