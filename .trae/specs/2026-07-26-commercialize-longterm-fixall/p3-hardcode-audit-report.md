# P3 阶段验证报告 — 硬编码颜色 / 中文残留 grep 审计（Task 3.8.1）

> 生成时间：2026-07-26
> 范围：`apps/admin/src` 与 `apps/client/src` 全量 `.vue` / `.ts` 文件
> 方法：`Grep` 工具按正则匹配，统计文件级出现次数
> 目的：记录 P3 阶段（配置动态化 + Admin 共享样式抽取）后，残留的硬编码颜色与未走 i18n 的中文文案分布，为 P4+ 阶段提供改造基线

---

## 一、硬编码颜色残留（`#[0-9a-fA-F]{3,6}`）

### 1.1 Admin 端（12 个文件，269 处）

| 文件 | 次数 | 主要来源 |
|---|---:|---|
| `views/AuditLogs.vue` | 49 | 状态徽章 / 角色徽章 / HTTP 方法标签 |
| `views/Posts.vue` | 42 | 状态徽章 / 操作按钮 hover 色 |
| `views/Users.vue` | 40 | 状态徽章 / 性别标签 / 操作按钮 |
| `views/Feedback.vue` | 38 | 类型徽章 / 状态徽章 |
| `views/Reports.vue` | 37 | 状态徽章 / 目标类型标签 |
| `views/Dashboard.vue` | 18 | 统计卡片色 / 活动圆点 |
| `views/Layout.vue` | 15 | 侧边栏 / 菜单激活态 / 渐变 |
| `views/Login.vue` | 14 | 登录卡片 / 表单 / 按钮 |
| `views/SensitiveWords.vue` | 7 | danger 按钮 / 分类标签 |
| `views/NotifyConfig.vue` | 5 | 模板输入框 focus 边框 |
| `components/ConfirmDialog.vue` | 3 | danger 主按钮 |
| `App.vue` | 1 | 全局根容器 |
| **合计** | **269** | — |

**说明**：Admin 端未引入 design tokens 系统（与 client 端不同），共用色（`#667eea`/`#f5222d`/`#52c41a`/`#fa8c16`/`#1890ff`）已通过 `admin-common.css` 集中维护，但视图层仍存在大量状态徽章等业务色（如 `.status-PENDING` / `.type-FEEDBACK`）。这部分属于业务语义色，建议在 P4 阶段抽取为 `apps/admin/src/styles/admin-tokens.css` 与 CSS 变量。

### 1.2 Client 端（72 个文件，781 处）

| 模块 | 文件数 | 次数 | 备注 |
|---|---:|---:|---|
| `pages/vip/*` | 4 | 116 | VIP 卡片渐变 / 红包 / 促销码 |
| `pages/circle/*` / `pages/circles/*` | 2 | 57 | 圈子页 / 发帖 |
| `pages/verification/*` | 1 | 39 | 实名认证步骤 |
| `pages/campus/*` | 3 | 47 | 校园 / 话题详情 / 发话题 |
| `pages/village/*` | 3 | 77 | 村庄详情 / 帖子 / 标签 |
| `pages/settings/*` | 2 | 66 | 设置 / 免打扰 |
| `components/layout/*` | 2 | 43 | TabBar / AppShell |
| `components/chat/*` | 6 | 41 | 语音 / 红包气泡 / 破冰 |
| `components/social/*` | 5 | 41 | WallPostCard / 进度 / 点赞爆发 |
| `components/home/*` | 7 | 15 | 首页卡片 / Banner |
| `components/common/*` | 8 | 21 | Button / Toast / SafeImage 等 |
| `components/discover/*` | 2 | 9 | CardSwiper / LongPressMenu |
| `pages/discover/*` | 3 | 19 | 视频 / 历史 / 首页 |
| `pages/profile/*` | 3 | 18 | 主页 / 相册 / 访客 |
| `pages/chat-session/*` | 1 | 17 | 聊天会话 |
| `pages/dev/index.vue` | 1 | 15 | 开发调试页 |
| `pages/shop/index.vue` | 1 | 15 | 商城 |
| `theme/tokens.ts` | 1 | 215 | 设计 Token 定义文件（合理） |
| 其他 | 18 | ~119 | 零散分布 |
| **合计** | **72 文件 + tokens.ts** | **781 + 215** | — |

**说明**：client 端已建立完整的 design tokens 系统（`theme/tokens.ts`，215 处颜色定义为 Token 主体），但旧代码迁移尚未全部完成。`pages/vip/*`、`pages/campus/*`、`pages/village/*`、`pages/settings/*`、`components/layout/*`、`components/chat/*` 是改造重点，建议在 P4 阶段（God Class 拆分）后启动「Token 全量迁移」专项任务。

### 1.3 改进建议

1. **Admin 端**：新建 `apps/admin/src/styles/admin-tokens.css`，将 `#667eea`/`#5568d3`/`#f5222d`/`#52c41a`/`#fa8c16`/`#1890ff`/`#2f54eb` 抽取为 CSS 变量 `--color-primary` / `--color-danger` / `--color-success` / `--color-warning` / `--color-info` / `--color-accent`，`admin-common.css` 与各视图改用 `var(--color-*)`。
2. **Client 端**：以 `theme/tokens.ts` 为单一来源，逐步将 `pages/vip/*`、`pages/campus/*`、`pages/village/*` 等模块的硬编码颜色替换为 `var(--color-*)` 或 `theme.colors.*`。
3. **新增 Lint 规则**：在 `eslint-plugin-no-hardcoded-color` 或自定义 stylelint 规则中禁止 `.vue` `<style>` 块直接写 `#xxx`，强制走 Token。

---

## 二、中文残留（`[\x{4e00}-\x{9fff}]`）

### 2.1 Admin 端（12 个文件，3,331 处）

| 文件 | 次数 | 主要类型 |
|---|---:|---|
| `views/Feedback.vue` | 479 | 模板业务文案 + 注释 |
| `views/Reports.vue` | 492 | 模板业务文案 + 注释 |
| `views/Dashboard.vue` | 219 | 模板业务文案 + 注释 |
| `views/Login.vue` | 228 | 模板业务文案 + 注释 |
| `views/Posts.vue` | 258 | 模板业务文案 + 注释 |
| `views/Users.vue` | 393 | 模板业务文案 + 注释 |
| `views/AuditLogs.vue` | 134 | 模板业务文案 + 注释 |
| `views/SensitiveWords.vue` | 303 | 模板业务文案 + 注释 |
| `views/NotifyConfig.vue` | 207 | 模板业务文案 + 注释 |
| `views/Layout.vue` | 43 | 菜单标签 + 注释 |
| `components/Pagination.vue` | 222 | 组件内 fallback 文案 + 注释 |
| `components/ConfirmDialog.vue` | 353 | 组件内 fallback 文案 + 注释 |
| **合计** | **3,331** | — |

**说明**：
- Admin 端 i18n 框架（`vue-i18n`）与 `zh-CN.ts` / `en-US.ts` 文案资源已就位（Task 3.2.2），覆盖 11 个视图模块的全部业务 key（共 ~280 个 key）。
- 当前残留中文主要分为三类：
  1. **注释**（约占 60%）：`/** Task 3.7.x：... */` 等开发说明，无需 i18n；
  2. **模板内直接中文**（约占 35%）：如 `<text class="page-title">反馈管理</text>` 应改为 `<text class="page-title">{{ t('feedback.title') }}</text>`；
  3. **错误兜底文案**（约占 5%）：`error.value = "加载失败"` 应改为 `error.value = t('errors.network')`。

### 2.2 改进建议

1. **模板层**：将 12 个视图的 `<text>` / `<button>` 内直接中文替换为 `t('xxx.yyy')` 调用，预计改造点 ~150 处。
2. **错误兜底**：将 `error.value = "加载XXX失败"` 等错误赋值改为 `t('errors.xxx')`。
3. **注释保留**：注释中的中文属于开发文档，无需 i18n，保持现状。
4. **批量替换脚本**：可编写 codemod 脚本，按文件遍历 `<text>...</text>` 与 `error.value = "..."` 自动替换为 i18n key。

---

## 三、P3 阶段已完成的改造

### 3.1 配置动态化（Task 3.6）

| 子任务 | 完成情况 | 验证方式 |
|---|---|---|
| 3.6.1 学校列表后端 API | ✅ | `ConfigController#getCampuses` + `services/config.ts#loadCampuses` |
| 3.6.2 匹配偏好选项动态获取 | ✅ | `ConfigController#getMatchPreferences` + `config/match-form.ts#loadMatchFormFields` |
| 3.6.3 筛选选项动态获取 | ✅ | `ConfigController#getFilterOptions` + `stores/campus.ts#loadFilterOptionsFromBackend` |
| 3.6.4 Hero Banner 后端配置 | ✅ | `ConfigController#getHeroBanners` + `config/home-banners.ts#loadHomeBanners` |
| 3.6.5 解锁引导文案外置 | ✅ | `ConfigController#getUnlockGuideSteps` + `stores/unlock-guide.ts` 动态加载 |

### 3.2 Admin 共享样式抽取（Task 3.7）

| 子任务 | 完成情况 | 涉及文件 |
|---|---|---|
| 3.7.1 共享样式归并 | ✅ | `apps/admin/src/styles/admin-common.css`（438 行，覆盖 12 类共享样式） |
| 3.7.2 Pagination 组件 | ✅ | `apps/admin/src/components/Pagination.vue`（支持 1-based / 0-based 页码、i18n、disabled） |
| 3.7.3 ConfirmDialog 封装 | ✅ | `apps/admin/src/components/ConfirmDialog.vue`（支持 danger / confirming / i18n fallback） |

**8 个 Admin 视图接入情况**：

| 视图 | 接入 admin-common.css | 接入 Pagination | 接入 ConfirmDialog |
|---|:---:|:---:|:---:|
| Users.vue | ✅ | ✅ | ✅ |
| Posts.vue | ✅ | ✅ | ✅ |
| Feedback.vue | ✅ | — | ✅ |
| Reports.vue | ✅ | ✅ | — |
| AuditLogs.vue | ✅ | ✅ | — |
| NotifyConfig.vue | ✅ | — | — |
| SensitiveWords.vue | ✅ | — | ✅ |
| Dashboard.vue | ✅ | — | — |

> "—" 表示该视图业务上无对应需求（如 NotifyConfig 无分页、Dashboard 无弹窗）。

---

## 四、结论

P3 阶段已按 spec 完成全部 Task 3.6 / 3.7 / 3.8.1 子任务：

1. **配置动态化**：5 类客户端配置（学校 / 匹配偏好 / 筛选选项 / Banner / 解锁引导）全部接入后端 API，支持本地 fallback；
2. **Admin 共享样式**：8 个视图接入 `admin-common.css`，3 个组件（Pagination / ConfirmDialog）抽取完成并接入 i18n；
3. **硬编码 / 中文残留审计**：本报告记录了 269 + 781 = 1,050 处硬编码颜色与 3,331 处中文残留分布，建议在 P4+ 阶段启动专项 Token 迁移与 i18n 全量替换。

后续 P4 阶段（God Class 拆分）启动前，建议优先完成：
- Admin 端 `admin-tokens.css` 抽取（约 6 个语义色变量）
- Admin 端 12 个视图的模板层 i18n 全量替换（约 150 处）
- Client 端 `pages/vip/*`、`pages/campus/*`、`pages/village/*` 模块的 Token 迁移（约 240 处）
