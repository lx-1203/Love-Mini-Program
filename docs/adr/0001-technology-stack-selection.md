# ADR-0001: 技术栈选型 - Spring Boot + Vue 3 + uni-app

- **Status**: Accepted
- **Date**: 2026-05-18
- **Deciders**: 架构组、CTO、前端 Lead、后端 Lead
- **Tags**: architecture, frontend, backend, full-stack

---

## Context and Problem Statement

校园恋爱小程序（Campus Love）需要在 2026 年 Q2-Q3 完成首版商业化发布。项目要求同时支持微信小程序、H5 网页与 Admin 后台三个端，且团队规模有限（5 名后端、3 名前端、2 名 DevOps）。

技术栈选型直接决定：

1. **开发效率**：能否在 4 个月内完成 200+ API、60+ 页面
2. **跨端一致性**：小程序与 H5 是否能共享代码
3. **可维护性**：未来 3 年的人才招聘与社区支持
4. **生态成熟度**：依赖库、文档、问题排查便利性
5. **运营成本**：服务器资源、第三方服务费用

需在后端、前端、跨端框架、数据库、缓存、消息队列等多个层面作出选型。

---

## Decision Drivers

- **微信小程序优先**：核心发布渠道是微信小程序，必须 100% 兼容
- **跨端能力**：H5 与小程序代码复用率 ≥ 70%
- **团队技能匹配**：后端熟悉 Java/Spring，前端熟悉 Vue
- **生态稳定性**：选用的框架必须有 LTS 与活跃社区
- **商业化合规**：满足微信小程序提审要求与个人信息保护法
- **未来演进**：易于扩展到 App、海外市场

---

## Considered Options

### 方案 A：Spring Boot + Vue 3 + uni-app（**选定**）

- **后端**：Spring Boot 3.2 + Java 17 + Maven
- **客户端**：Vue 3 + uni-app + Vite + TypeScript
- **Admin**：Vue 3 + Vite + Element Plus
- **数据库**：MySQL 8 + Flyway 迁移
- **缓存**：Redis 7 + Caffeine（本地）
- **搜索**：Elasticsearch 8
- **消息队列**：RabbitMQ 3.12

### 方案 B：Node.js (NestJS) + React + Taro

- 后端：NestJS + TypeScript + Prisma
- 客户端：React + Taro + Vite
- Admin：React + Ant Design
- 优势：全 TypeScript，前后端共享类型
- 劣势：团队成员对 NestJS 不熟悉，学习成本高

### 方案 C：Go (Gin) + Vue 3 + uni-app

- 后端：Go + Gin + GORM
- 优势：性能更高，部署更轻量
- 劣势：团队无 Go 经验，ORM 生态不如 Java

### 方案 D：纯微信小程序原生 + Spring Boot

- 客户端：微信小程序原生（WXML/WXSS/JS）
- 优势：性能最优，无跨端开销
- 劣势：无法复用到 H5，未来扩展受限

---

## Pros and Cons of the Options

### 方案 A（Spring Boot + Vue 3 + uni-app）

| 优点 | 缺点 |
|------|------|
| ✅ Spring Boot 生态成熟，Java 人才多 | ❌ Java 内存占用较高（JVM ≥ 512MB） |
| ✅ uni-app 一套代码多端运行 | ❌ uni-app 对复杂动画支持有限 |
| ✅ Vue 3 Composition API 类型友好 | ❌ 小程序原生 API 差异需条件编译 |
| ✅ TypeScript 端到端类型安全 | ❌ Maven 构建较慢（vs Gradle） |
| ✅ Flyway 数据库迁移可追溯 | |
| ✅ Redis + Caffeine 两级缓存性能优 | |

### 方案 B（NestJS + React + Taro）

| 优点 | 缺点 |
|------|------|
| ✅ 全栈 TypeScript，前后端类型共享 | ❌ 团队无 NestJS 经验，学习曲线陡 |
| ✅ Prisma 类型安全 ORM | ❌ NestJS 大型项目案例较少 |
| ✅ React 生态丰富 | ❌ Taro 与 React 兼容性偶有问题 |
| | ❌ Prisma 在复杂查询上不如 JPA 灵活 |

### 方案 C（Go + Vue 3 + uni-app）

| 优点 | 缺点 |
|------|------|
| ✅ 性能最优，内存占用低 | ❌ 团队无 Go 经验 |
| ✅ 部署简单（单二进制） | ❌ GORM 不如 JPA 成熟 |
| ✅ 并发模型适合高并发场景 | ❌ Go 微服务生态不如 Java |

### 方案 D（微信原生 + Spring Boot）

| 优点 | 缺点 |
|------|------|
| ✅ 小程序性能最优 | ❌ 无法复用到 H5 |
| ✅ 微信 API 完整支持 | ❌ 双端维护成本翻倍 |
| | ❌ WXML 语法局限，组件化弱 |

---

## Decision

**选定方案 A：Spring Boot 3.2 + Vue 3 + uni-app**

具体技术栈：

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Spring Boot | 3.2.x |
| 后端语言 | Java | 17 LTS |
| ORM | Spring Data JPA + Hibernate | 6.x |
| 数据库迁移 | Flyway | 9.x |
| 安全框架 | Spring Security | 6.x |
| API 文档 | springdoc-openapi | 2.x |
| 客户端框架 | Vue 3 | 3.4.x |
| 客户端语言 | TypeScript | 5.x |
| 跨端框架 | uni-app | 3.x |
| 构建工具 | Vite | 5.x |
| 状态管理 | Pinia | 2.x |
| 国际化 | vue-i18n | 9.x |
| Admin UI | Element Plus | 2.x |
| 数据库 | MySQL | 8.0 |
| 缓存 | Redis | 7.x |
| 搜索引擎 | Elasticsearch | 8.x |
| 消息队列 | RabbitMQ | 3.12 |

---

## Consequences

### 正面后果

- **跨端开发**：uni-app 一套代码同时支持微信小程序、H5、App，复用率 ≥ 70%
- **人才招聘**：Java + Vue 是国内最主流的全栈组合，招聘容易
- **生态成熟**：Spring Boot + Vue 都有 LTS 与庞大社区，问题易解决
- **类型安全**：TypeScript + JPA 提供端到端类型保障
- **未来扩展**：uni-app 支持后续扩展到 App、字节小程序、支付宝小程序

### 负面后果

- **JVM 内存占用**：API 服务需 ≥ 512MB 内存，运营成本增加
- **uni-app 限制**：复杂动画、高性能场景需用原生或条件编译处理
- **构建速度**：Maven + Vite + uni-app 三重构建链路较慢（CI 全量构建 ~8 分钟）
- **学习成本**：uni-app 的条件编译、小程序特有 API 需团队学习

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| uni-app 跨端兼容性问题 | 重要页面在微信小程序与 H5 双端测试 |
| JVM 内存压力 | 配置 `-XX:MaxRAMPercentage=75`，监控 GC |
| Maven 构建慢 | 使用并行构建 `mvn -T 4`，CI 缓存 .m2 |
| TypeScript 编译错误 | 配置 strict mode + CI typecheck 门禁 |

---

## Compliance Note

- 本决策符合项目硬约束：所有页面过渡逻辑内联在 .vue 文件中
- 所有选用的库均有 LTS 或活跃维护（最近 6 个月有提交）
- 所有框架版本兼容微信小程序基础库 2.8.0+

---

## Related Documents

- [ADR-0002: 认证方案](./0002-authentication-jwt-wechat.md)
- [ADR-0003: 数据库选型](./0003-database-mysql-utf8mb4.md)
- [ADR-0009: Monorepo](./0009-monorepo-pnpm-workspace.md)
- `package.json`、`apps/api/pom.xml`（具体版本）

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-18 | 首次提议 | 架构组 |
| 2026-05-20 | 评审通过 | CTO |
