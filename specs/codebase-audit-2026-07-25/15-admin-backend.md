# 15-admin-backend.md — Admin 后台审计

> **审计日期**: 2026-07-25 | **严重程度分布**: 1 CRITICAL · ~15 HIGH · ~25 MEDIUM · ~10 LOW | **总计 51 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 1 | 数据完整性问题，可能误导运营决策 |
| HIGH | ~15 | 架构缺陷、安全风险、功能缺失 |
| MEDIUM | ~25 | 代码质量、可维护性问题 |
| LOW | ~10 | 代码风格、最佳实践 |

---

## CRITICAL 发现

### 1. Feedback.vue — 硬编码 Mock/Demo 数据伪装成真实数据

- **文件**: `apps/admin/src/views/Feedback.vue`
- **问题**: 组件内使用硬编码的静态数组 `mockFeedback` 初始化反馈列表，并直接在模板中渲染。该数组包含虚假的用户名、手机号、反馈内容（如 "希望增加更多匹配条件"），与真实用户反馈完全无关。组件未调用任何后端 API 获取数据。
- **影响**: 运营人员看到的反馈列表是固定的演示数据，完全不能反映线上用户的真实反馈。这意味着所有用户提交的反馈从未被运营团队看到过，可能导致重要问题（如投诉、Bug 报告）被长期忽略。
- **修复建议**: 移除所有 mock 数据，接入真实的 `GET /api/admin/feedback` 接口，添加 loading 和 empty 状态。

---

## HIGH 发现

### 2. CSS 重复问题 — 8 个 View 组件中 15+ 个相同 CSS 类被复制粘贴

- **文件**: `apps/admin/src/views/Dashboard.vue`、`Users.vue`、`Posts.vue`、`Feedback.vue`、`Reports.vue`、`AuditLogs.vue`、`NotifyConfig.vue`、`SensitiveWords.vue`
- **问题**: 以下 CSS 类在 8 个视图组件中以完全相同的样式定义重复出现：`.page-header`、`.page-title`、`.stats-grid`、`.stat-card`、`.stat-value`、`.stat-label`、`.table-container`、`.table`、`.table th`、`.table td`、`.search-bar`、`.search-input`、`.btn`、`.btn-primary`、`.btn-danger`、`.pagination`。
- **影响**: 修改任何一个全局样式（如表格行高或主题色）需要同时修改 8 个文件，极易遗漏，导致样式不一致。
- **修复建议**: 将这些公共样式提取到 `src/styles/admin-common.css` 或创建 `<AdminPageHeader>`、`<AdminTable>`、`<AdminPagination>` 等共享组件。

### 3. 环境变量命名不一致 — `VITE_DEV_USERNAME` vs `VITE_DEV_DEFAULT_USERNAME`

- **文件**: `apps/admin/src/stores/session.ts`（使用 `VITE_DEV_USERNAME`）、`apps/admin/.env.development`（定义 `VITE_DEV_DEFAULT_USERNAME`）
- **问题**: session store 中读取的环境变量名为 `VITE_DEV_USERNAME`，但 `.env.development` 文件中实际定义的变量为 `VITE_DEV_DEFAULT_USERNAME`。Vite 编译时不会报错——不存在的环境变量返回 `undefined`。
- **影响**: 开发环境下自动登录功能静默失效，开发者每次启动都需要手动输入账号密码，浪费时间且难以排查原因。
- **修复建议**: 统一变量名为 `VITE_DEV_DEFAULT_USERNAME`，并添加构建时环境变量校验。

### 4. Users.vue — `handleSaveEdit` 是空函数（No-op Stub）

- **文件**: `apps/admin/src/views/Users.vue`
- **问题**: `handleSaveEdit()` 函数体为空，或仅包含一个 `console.log`。编辑用户信息（如修改昵称、状态、VIP 等级）后点击保存，函数被调用但不执行任何 API 请求。
- **影响**: 运营人员可以打开编辑弹窗并修改用户数据，但保存按钮实际上不产生任何效果。修改在关闭弹窗后丢失，运营人员误以为操作已完成。
- **修复建议**: 实现 `handleSaveEdit`，调用 `PUT /api/admin/users/:id` 并处理响应和错误状态。

### 5. 分页逻辑重复 — 3 个组件中相同的分页实现

- **文件**: `apps/admin/src/views/Users.vue`、`Posts.vue`、`AuditLogs.vue`
- **问题**: 三个组件各自实现了完全相同的分页逻辑：`currentPage`、`pageSize`、`total` 状态、`totalPages` 计算属性、`changePage()` 方法、页码按钮渲染。合计约 80 行重复代码。
- **影响**: 如果在 Users 中修复了分页边界条件 bug（如 totalPages 为 0 时的处理），Posts 和 AuditLogs 中相同 bug 依然存在。
- **修复建议**: 抽取 `<Pagination>` 通用组件或 `usePagination` composable，三个组件复用。

### 6. 缺少 Design Token 系统

- **文件**: `apps/admin/src/views/*.vue` (全部视图组件)
- **问题**: 所有组件中的颜色、间距、字体大小、圆角、阴影等均以硬编码的 CSS 字面量存在（如 `#409EFF`、`#E6A23C`、`16px`、`8px`）。没有任何 CSS 变量或设计 token 定义。
- **影响**: 无法实现主题切换（如暗色模式），修改品牌色需要全局搜索替换 50+ 处。
- **修复建议**: 定义 CSS 自定义属性（`--color-primary`、`--spacing-md` 等）在 `:root` 中，全面替换硬编码值。

### 7. API Base URL 硬编码 Fallback

- **文件**: `apps/admin/src/utils/http.ts`
- **问题**: HTTP 客户端的 baseURL 配置使用了 `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'`。当环境变量缺失时，请求被发送到 localhost。
- **影响**: 生产部署时如果忘记设置环境变量，所有 API 请求发往 localhost，页面表现为空白但无任何错误提示，运维排查困难。
- **修复建议**: 移除 fallback 值，使用构建时环境变量校验在启动时崩溃并给出明确错误信息，而非静默使用错误 URL。

### 8. localStorage Key 名称在多处重复硬编码

- **文件**: `apps/admin/src/stores/session.ts`、`apps/admin/src/utils/http.ts`
- **问题**: `token`、`userInfo`、`refreshToken` 等 localStorage key 名称字符串在多个文件中以字面量形式重复出现。
- **影响**: 修改存储 key 名称时需要同步修改多处，遗漏任何一处导致认证失效。
- **修复建议**: 定义常量文件 `src/constants/storage-keys.ts` 统一管理所有 key 名称。

### 9. 菜单图标路径硬编码

- **文件**: `apps/admin/src/views/Layout.vue`
- **问题**: 侧边栏菜单的图标使用硬编码的 SVG 路径字符串写在 `<template>` 中，共 8 个菜单项的图标路径内联在模板内。
- **影响**: 添加新菜单项或修改图标时需要在大量模板代码中定位对应代码段，模板可读性差。
- **修复建议**: 使用 icon 组件或定义菜单配置数组（含 name、path、icon），通过 `v-for` 渲染菜单项。

### 10. 无 i18n 基础设施

- **文件**: `apps/admin/src/views/*.vue` (全部视图组件)
- **问题**: 所有界面文案（按钮文字、表格列头、提示信息、表单标签）均为硬编码中文，无任何国际化框架或翻译 key。
- **影响**: 如果未来需要支持多语言运营后台，需要逐文件改造，改造成本极高。
- **修复建议**: 引入 `vue-i18n`（即使当前仅有一个 locale），将所有文案提取到 locale 文件中，为未来多语言做好准备。

---

## 代表 MEDIUM 发现

| # | 文件 | 问题 |
|---|------|------|
| 11 | session.ts | `login()` 中敏感信息（密码）通过明文存储在 Vuex/Redux DevTools 中可被查看 |
| 12 | http.ts | 请求拦截器中 token 过期判断使用客户端时间，可被篡改 |
| 13 | Layout.vue | 菜单激活状态依赖 `route.path` 简单字符串匹配，子路由可能导致父菜单不高亮 |
| 14 | Dashboard.vue | 统计卡片数据无骨架屏或 loading 状态——数据加载前显示 "0" 误导用户 |
| 15 | Users.vue | 搜索输入框无防抖，每次按键触发 API 请求 |
| 16 | Posts.vue | 删除帖子操作无二次确认弹窗，误点导致数据丢失 |
| 17 | AuditLogs.vue | 日志时间显示使用 `new Date().toLocaleString()` 无时区处理 |
| 18 | SensitiveWords.vue | 敏感词列表新增后未清空表单，用户可能重复提交 |
| 19 | NotifyConfig.vue | 开关切换无乐观更新，用户感知延迟 |
| 20 | Reports.vue | 举报处理操作无操作日志记录，无法追溯运营人员的处理历史 |

---

## 关键文件清单

| 文件 | 行数(估) | 主要问题 |
|------|----------|----------|
| `apps/admin/src/stores/session.ts` | ~150 | 环境变量命名不一致、明文密码 |
| `apps/admin/src/utils/http.ts` | ~80 | baseURL fallback、token 过期判断 |
| `apps/admin/src/views/Layout.vue` | ~200 | 菜单图标硬编码、路由匹配问题 |
| `apps/admin/src/views/Dashboard.vue` | ~180 | 无 loading 状态、CSS 重复 |
| `apps/admin/src/views/Users.vue` | ~250 | handleSaveEdit 空函数、分页重复 |
| `apps/admin/src/views/Posts.vue` | ~200 | 无确认删除、CSS 重复 |
| `apps/admin/src/views/Feedback.vue` | ~150 | **CRITICAL** mock 数据 |
| `apps/admin/src/views/Reports.vue` | ~120 | 无操作日志 |
| `apps/admin/src/views/AuditLogs.vue` | ~100 | 时区问题 |
| `apps/admin/src/views/NotifyConfig.vue` | ~130 | 无乐观更新 |
| `apps/admin/src/views/SensitiveWords.vue` | ~100 | 表单未清空 |

---

## 修复优先级建议

1. **立即修复 (CRITICAL)**: Feedback.vue 的 mock 数据 → 接入真实 API
2. **本周修复 (HIGH)**: handleSaveEdit 实现、环境变量统一、CSS 重复抽取
3. **下个迭代 (MEDIUM)**: 分页组件抽取、Design Token、骨架屏
