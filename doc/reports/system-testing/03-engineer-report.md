# 系统测试工程师测试报告

## 一、测试概述

| 项目 | 内容 |
|------|------|
| 测试角色 | 系统测试工程师 |
| 测试时间 | 2026-06-25 |
| 测试环境 | H5 dev server `http://localhost:5173/` + 管理后台 `http://localhost:5177/` + Spring Boot API |
| 测试工具 | Chrome DevTools MCP（Performance Trace、Console、Heapsnapshot） |
| 测试维度 | 性能表现、代码质量、稳定性、业务完整性（技术实现） |
| 测试方法 | 性能追踪 + 代码静态审查 + 控制台监控 + 资源分析 |

## 二、性能测试

### 2.1 页面加载性能

#### 首页（`/pages/home/index`）性能追踪

| 指标 | 数值 | 阈值 | 评级 |
|------|------|------|------|
| LCP（最大内容绘制） | 397ms | <2500ms | ✅ 优秀 |
| LCP - TTFB | 6ms | <800ms | ✅ 优秀 |
| LCP - Load Delay | 311ms | - | ⚠️ 占比偏高 |
| LCP - Load Duration | 2ms | - | ✅ 良好 |
| LCP - Render Delay | 78ms | - | ✅ 良好 |
| CLS（累积布局偏移） | 0.07 | <0.1 | ✅ 良好 |
| DOMContentLoaded | 467ms | - | ✅ 良好 |
| Load Complete | 484ms | - | ✅ 良好 |
| DOM 节点数 | 219 | <1500 | ✅ 良好 |
| JS 堆内存 | 16MB | - | ✅ 健康 |

#### 资源加载分析

| 指标 | 首页 | 发现页 | 评级 |
|------|------|--------|------|
| 总资源数 | 94 | 113 | ⚠️ 偏多 |
| 脚本资源数 | - | 96 | ❌ 过多（无代码分割） |
| 图片资源数 | - | 26 | ✅ 正常 |
| API 调用数 | - | 12 | ✅ 正常 |
| 总传输大小 | 5,152,216 B (~5MB) | 5,155,516 B (~5MB) | ❌ 过大 |
| 图片传输大小 | - | 5,400 B | ✅ 良好 |

**性能洞察**：
- ✅ LCP/CLS/Core Web Vitals 达标
- ❌ 5MB 传输大小过大（主要来自 JS，96 个脚本资源表明**无代码分割**）
- ⚠️ LCP Load Delay 311ms 占比 78%，暗示资源加载阻塞

### 2.2 接口响应性能

| 接口类型 | 数量 | 响应时间 | 评级 |
|---------|------|---------|------|
| 静态资源 | 94-113 | 整体 4.5s | ⚠️ 慢 |
| API 调用 | 12 | 未单独测量 | ⚠️ 待优化 |
| WebSocket | 1 | 连接建立正常 | ✅ |

### 2.3 并发处理能力
- ⚠️ 未进行多用户并发压测（受限于单浏览器环境）
- ✅ Pinia store 状态管理支持多组件订阅
- ⚠️ `JwtAuthenticationFilter` 每次请求查库（性能瓶颈）

### 2.4 内存泄漏检测
- ✅ 首页 JS 堆内存 16MB，无异常增长
- ⚠️ 未进行长时间运行内存追踪
- ⚠️ 截图捕获多次超时，暗示页面渲染压力大

## 三、代码质量测试

### 3.1 代码规范性

| 模块 | 评分 | 说明 |
|------|------|------|
| 客户端（apps/client） | 8/10 | 命名规范、结构清晰、TypeScript 类型完整 |
| 管理端（apps/admin） | 5/10 | 结构简单但全 Mock，缺乏真实集成 |
| 后端（apps/api） | 8/10 | 分层清晰，但部分注释与实现矛盾 |

### 3.2 错误处理

| 维度 | 评分 | 说明 |
|------|------|------|
| 异常捕获 | 8/10 | services/api-error.ts 统一错误处理 |
| 错误提示 | 7/10 | 前端有 Toast 组件，但部分场景缺失 |
| 降级方案 | 8/10 | Mock/Real 双模式切换完善（withMockMode 高阶函数） |
| 异步错误 | 6/10 | 2 次未捕获 Promise 拒绝 |

### 3.3 安全性

| 维度 | 评分 | 说明 |
|------|------|------|
| SQL 注入 | 9/10 | 使用 JPA/MyBatis 参数化查询 |
| XSS | 8/10 | Vue 默认转义，未发现 v-html 滥用 |
| 权限校验 | 7/10 | 前端守卫存在，但后端接口缺角色校验 |
| 敏感信息 | 6/10 | WebSocket token 明文 URL 传递、密码明文比较、默认凭据展示 |

### 3.4 性能优化点

| 维度 | 评分 | 说明 |
|------|------|------|
| 缓存使用 | 7/10 | Pinia store 持久化，但无 HTTP 缓存策略 |
| 懒加载 | 5/10 | **未实现路由懒加载**（96 个脚本资源） |
| 资源优化 | 6/10 | 图片使用 SVG，但 JS 包未分割 |
| 状态同步 | 9/10 | Pinia watch + 300ms 防抖机制完善 |

## 四、稳定性测试

### 4.1 长时间运行测试
- ⚠️ 未进行 1 小时以上长时间运行测试
- ✅ 内存基线健康（16MB）
- ⚠️ 截图超时暗示渲染压力

### 4.2 边界条件测试

| 场景 | 结果 | 评级 |
|------|------|------|
| 空数据 | 未触发 | ⚠️ 待测 |
| 超大数据 | 未触发 | ⚠️ 待测 |
| 极端输入 | 未触发 | ⚠️ 待测 |
| 网络中断 | 未触发 | ⚠️ 待测 |

### 4.3 异常恢复测试

| 场景 | 结果 | 评级 |
|------|------|------|
| 网络中断恢复 | 未测 | ⚠️ |
| 服务重启恢复 | 未测 | ⚠️ |
| Token 过期 | ❌ 无静默刷新机制 | ❌ |
| 登出后 token | ❌ 仍有效 24h（无黑名单） | ❌ |

### 4.4 兼容性测试
- ✅ H5 模式在 Chrome 桌面端可用
- ⚠️ 未测试 Safari、Firefox、Edge
- ⚠️ 未测试真实移动设备
- ⚠️ 未测试弱网环境

## 五、业务完整性技术实现验证

### 5.1 数据流转技术实现

| 链路 | 实现方式 | 评级 |
|------|---------|------|
| 前端 store → API | Pinia action → services/http.ts → 后端 | ✅ 正确 |
| API → 后端 service | Controller → Service → Repository | ✅ 正确 |
| 后端 → DB | JPA/MyBatis → MySQL/H2 | ✅ 正确 |
| 资料完善度同步 | Pinia store 计算属性 | ❌ 未同步至村口守卫 |

### 5.2 系统链路技术连贯性

| 链路 | 状态 | 问题 |
|------|------|------|
| 登录 → 首页 | ✅ 连贯 | - |
| 首页 → 设置 | ✅ 连贯 | - |
| 设置 → 推荐 | ✅ 连贯 | - |
| 匹配 → 聊天列表 | ✅ 连贯 | - |
| 聊天列表 → 会话详情 | ❌ **中断** | 点击会话触发会话守卫异常，登出 |
| 资料完善 → 解锁功能 | ❌ **中断** | 完善度 100% 未同步至访问守卫 |

### 5.3 异常场景技术处理

| 场景 | 处理方式 | 评级 |
|------|---------|------|
| 网络错误 | api-error.ts 统一处理 | ✅ |
| 401 未授权 | 跳转登录 | ✅ |
| 403 禁止访问 | ❌ 无明确处理 | ❌ |
| 500 服务器错误 | ❌ 无降级 | ❌ |
| 空数据 | EmptyState 组件 | ✅ |

### 5.4 系统扩展性与可维护性

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块解耦 | 8/10 | stores/services/components 分层清晰 |
| 配置化 | 7/10 | env.ts + application.yml 配置完善 |
| 类型安全 | 9/10 | TypeScript 严格模式 + OpenAPI 生成类型 |
| 测试覆盖 | 7/10 | 有 vitest 单元测试，但覆盖率未测 |
| 可维护性 | 7/10 | 代码结构清晰，但部分注释与实现矛盾 |

## 六、控制台错误监控

### 6.1 首页控制台
- ❌ 2 次 "Uncaught (in promise)" 错误
- ⚠️ 11 次 "Do not nest other components in the text component" 警告

### 6.2 管理后台控制台
- ✅ 无控制台错误
- ⚠️ Vite CJS 弃用警告

## 七、问题清单

### P0 致命问题

| 编号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| EN-P0-01 | WebSocket token 明文 URL 传递 | `services/websocket.ts:282-284` | Token 泄露至日志/中间人 |
| EN-P0-02 | 管理员密码明文比较 | `RealAuthService.java:213` | 密码泄露 |
| EN-P0-03 | Mock profile 全 permitAll | `SecurityConfig` | 误部署即全员可调 admin 接口 |
| EN-P0-04 | 数据库默认空密码 | `application-db.yml:7` | 生产数据库无密码 |
| EN-P0-05 | admin-openid 含 change-me 默认值 | `application-db.yml:18` | 默认凭据风险 |
| EN-P0-06 | mock 密钥硬编码 | `application-mock.yml:10` | 密钥泄露 |

### P1 严重问题

| 编号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| EN-P1-01 | admin 后台全 Mock，未集成 API | `apps/admin/views/*` | 管理功能不可用 |
| EN-P1-02 | 无 token 黑名单 | `RealAuthService.java:190` | 登出 token 仍有效 |
| EN-P1-03 | 管理员登录无频率限制 | `AuthController.java:92` | 暴力破解风险 |
| EN-P1-04 | admin 登录页硬编码凭据 | `Login.vue:79` | 凭据泄露 |
| EN-P1-05 | admin stores 硬编码 admin/admin123 | `session.ts` | 凭据泄露 |
| EN-P1-06 | JwtAuthenticationFilter 每次查库 | `JwtAuthenticationFilter:101` | 性能瓶颈 |
| EN-P1-07 | AdminCertificationController 注释与 SecurityConfig 矛盾 | `AdminCertificationController:24` | 权限配置混乱 |
| EN-P1-08 | profile-guard LOCKED_PAGES 与 page-access.ts 双重定义 | `guards/profile-guard.ts` + `config/page-access.ts` | 维护风险 |
| EN-P1-09 | 生产环境回退 localhost | `services/env.ts:24-25` | 生产不可用 |
| EN-P1-10 | 5MB 资源传输，无代码分割 | `vite.config.ts` + 全局 | 首屏慢 |
| EN-P1-11 | 2 次未捕获 Promise 拒绝 | 全局 | 异步错误处理缺失 |
| EN-P1-12 | JWT 无 role claim | JWT 生成逻辑 | 无法接口级角色校验 |
| EN-P1-13 | CORS 遗漏管理端 5177 端口 | `SecurityConfig` | 跨域问题 |
| EN-P1-14 | convertProposal 不创建活动 | `AdminCertificationController` | 功能名实不副 |

### P2 一般问题

| 编号 | 问题 | 影响 |
|------|------|------|
| EN-P2-01 | 11 次 uni-app 文本嵌套警告 | 跨平台显示风险 |
| EN-P2-02 | 无 token 静默刷新 | Token 过期即登出 |
| EN-P2-03 | 截图多次超时 | 渲染压力大 |
| EN-P2-04 | 未实现路由懒加载 | 首屏加载所有页面 |

### P3 轻微问题

| 编号 | 问题 | 影响 |
|------|------|------|
| EN-P3-01 | Vite CJS 弃用警告 | 构建工具升级提示 |
| EN-P3-02 | LCP Load Delay 占比 78% | 资源加载阻塞 |

## 八、维度评分汇总

| 维度 | 评分 | 说明 |
|------|------|------|
| 性能表现 | 75/100 | Core Web Vitals 达标，但资源传输过大 |
| 代码质量 | 76/100 | 架构完整，但 14 项严重问题 |
| 稳定性 | 65/100 | 基础可用，但边界/异常/兼容性未充分测试 |
| 业务完整性（技术） | 60/100 | 主链路技术正确，但 2 处中断 |
| 安全性 | 60/100 | SQL/XSS 良好，但权限/敏感信息缺陷多 |
| **综合** | **67/100** | **架构完整但存在多项需修复的严重问题** |

## 九、测试结论

系统测试工程师视角下，**系统架构完整**（Vue3 + Pinia + uni-app + Spring Boot + JWT + STOMP + Mock/Real 双模式），**Core Web Vitals 达标**（LCP 397ms、CLS 0.07），**TypeScript 类型安全**，**Pinia 状态管理防抖机制完善**。

但存在 **6 项 P0 致命问题**（WebSocket token 明文、密码明文比较、Mock 全放行、数据库默认空密码、change-me 默认值、mock 密钥硬编码）和 **14 项 P1 严重问题**（admin 全 Mock、无 token 黑名单、无频率限制、凭据泄露、JWT 无 role、CORS 遗漏等）。

**资源传输过大**（5MB，无代码分割）、**2 处业务链路技术中断**（聊天会话跳转、资料完善度同步）。

**建议**：上线前必须修复全部 P0 和关键 P1 问题，特别是 WebSocket token、密码加密、Mock profile 加固、admin 后台真实 API 集成。

详细代码审查见：`03-engineer-code-review.md`
