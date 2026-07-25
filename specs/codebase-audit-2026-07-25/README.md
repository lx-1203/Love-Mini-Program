# 项目全面审计报告

> **日期**: 2026-07-25
> **审计范围**: 全部项目文件（1,122 个 Git 跟踪文件）
> **总发现问题**: 1,618 项
> **审计维度**: 19 个

---

## 目录

1. [总览与严重程度分布](#1-总览)
2. [设计系统 CSS - 组件层 (147项)](#2-设计系统css)
3. [Admin 后台 i18n 硬编码 (177项)](#3-admin-i18n)
4. [Java 后端硬编码与技术债 (136项)](#4-java-硬编码)
5. [i18n 硬编码中文 - Client (128项)](#5-i18n-client)
6. [配置/基础设施/架构 (127项)](#6-配置架构)
7. [数据库 SQL & Flyway (115项)](#7-数据库)
8. [Java 后端 Bug & 安全 (89项)](#8-java-bug安全)
9. [Java API 层深度审查 (87项)](#9-java-api)
10. [微信小程序专项 (79项)](#10-微信小程序)
11. [无障碍/i18n/设计系统 (78项)](#11-设计系统审计)
12. [测试覆盖率 & 质量 (65项)](#12-测试)
13. [Vue/TS 组件库 Bug/UX (56项)](#13-vue组件)
14. [Vue/TS Pages Bug/UX (56项)](#14-vue-pages-bug)
15. [Admin 后台整体 (51项)](#15-admin后台)
16. [Vue/TS src stores/services (50项)](#16-vue-src)
17. [Java API 层 Admin/Campus等 (47项)](#17-java-api-2)
18. [Vue/TS 前端硬编码 src (47项)](#18-vue-hardcode)
19. [Vue/TS 前端硬编码 pages (45项)](#19-vue-pages-hardcode)
20. [无障碍深度审计 (38项)](#20-a11y)
21. [修复优先级建议](#21-优先级)

---

## 1. 总览

### 1.1 按严重程度分布

| 严重程度 | 约数 | 标识 |
|----------|------|------|
| CRITICAL 🔴 | ~65 | 立即修复 - 安全漏洞、数据丢失、生产崩溃 |
| HIGH 🟠 | ~310 | 尽快修复 - 功能缺失、性能问题、合规风险 |
| MEDIUM 🟡 | ~700 | 计划修复 - 技术债、UX 缺陷、可维护性 |
| LOW 🟢 | ~540 | 择机修复 - 代码风格、文档、优化 |

### 1.2 审计维度与发现数

| # | 审计维度 | 发现数 | 主要覆盖 |
|---|----------|--------|----------|
| 1 | 设计系统 CSS (组件层) | 147 | CSS 变量未使用、硬编码颜色 |
| 2 | Admin 后台 i18n 硬编码 | 177 | 管理后台中文字符串 |
| 3 | Java 后端硬编码 & 技术债 | 136 | 硬编码 URL、magic number、God Class |
| 4 | i18n 硬编码中文 (client) | 128 | 客户端中文字符串 |
| 5 | 配置/基础设施/架构 | 127 | CI/CD、Docker、安全配置 |
| 6 | 数据库 SQL & Flyway | 115 | 缺失外键、ENUM 滥用、非幂等迁移 |
| 7 | Java 后端 Bug & 安全 | 89 | 竞态条件、N+1 查询、权限缺失 |
| 8 | Java API 层深度审查 | 87 | REST 设计、DTO、缓存、版本控制 |
| 9 | 微信小程序专项 | 79 | WXSS 兼容性、wx.login、隐私合规 |
| 10 | 无障碍/i18n/设计系统 | 78 | a11y、i18n、设计 tokens |
| 11 | 测试覆盖率 & 质量 | 65 | 测试缺失、覆盖率阈值过低 |
| 12 | Vue/TS 组件库 Bug/UX | 56 | 组件 bug、TouchEvent、响应式 |
| 13 | Vue/TS Pages Bug/UX | 56 | 页面 bug、双 store 架构 |
| 14 | Admin 后台整体 | 51 | 硬编码、技术债、重复代码 |
| 15 | Vue/TS src stores/services | 50 | Store bug、竞态条件、类型安全 |
| 16 | Java API 层 Admin/Campus等 | 47 | 控制器缺失 @PreAuthorize、N+1 |
| 17 | Vue/TS 前端硬编码 src | 47 | API URL、magic number、mock 数据 |
| 18 | Vue/TS 前端硬编码 pages | 45 | 路由路径、CSS 颜色、中文文本 |
| 19 | 无障碍深度审计 | 38 | ARIA 角色、label 关联、焦点管理 |

### 1.3 前十系统性问题

1. **设计令牌系统分裂** — `design-system/`(天蓝) vs `tokens.ts`(薄荷绿) vs Admin(紫色) 三个品牌色
2. **零 i18n 基础设施** — 500+ 处硬编码中文字符串，无 `$t()` 函数
3. **零 @Version 乐观锁** — 全部 JPA 实体并发写入数据丢失风险
4. **微信登录是 Mock** — `loginWithWechat()` 未调用 `wx.login()`，OAuth 完全未实现
5. **缺失 WXSS 兼容性处理** — `display: grid`、`backdrop-filter`、`aspect-ratio` 在微信小程序中不支持
6. **54 个 Flyway 迁移无回滚脚本** — 无法安全回滚
7. **/uploads/** 公开可访问** — 媒体文件无认证保护
8. **8 个管理员控制器缺少 @PreAuthorize** — 任何已认证用户可访问管理功能
9. **15+ CSS 动画无 prefers-reduced-motion** — 无障碍合规风险
10. **零 E2E/性能/a11y 测试** — 无 Playwright/Cypress/JMeter/Lighthouse CI

### 1.4 语言栈覆盖

| 语言/格式 | 文件数(约) | 主要审计维度 |
|-----------|-----------|-------------|
| Java | 304 | 硬编码、技术债、Bug、安全、API 设计 |
| TypeScript | 162 | 硬编码、i18n、类型安全、Store bug |
| Vue SFC | 100+ | 组件 Bug、UX、CSS token、a11y |
| SQL | 60+ | 表设计、迁移幂等性、索引 |
| SCSS/CSS | 多处 | 设计系统违规、颜色硬编码 |
| YAML/JSON/TOML | 20+ | 配置管理、CI/CD、安全扫描 |
| Markdown | 15+ | 文档过时、矛盾信息 |
| Shell/Batch | 8+ | 错误处理、跨平台兼容 |
