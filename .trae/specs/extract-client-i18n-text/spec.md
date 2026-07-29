# 客户端 i18n 文案抽取 Spec（P2.G Task 28）

## Why

客户端 `apps/client/src/` 下大量 .vue / .ts 文件存在中文硬编码（扫描基线 1345 处，其中 .vue 文件 30 个、.ts 文件 81 个）。这些硬编码导致：
- 多语言扩展困难——切换至 en-US 时仍残留中文，影响海外/外籍留学生用户体验；
- 文案运营成本高——同一文案散落多处，修改需逐文件检索；
- 与现有 `i18n/locales/{zh-CN,en-US}.ts` 体系脱节，违反项目「文案统一通过 t() 引用」的工程约定；
- 复审报告 `REAUDIT-REPORT-100+.md` 已将「客户端 i18n 收尾」列为 P2 商业化交付的必达项。

本 spec 收口 P2.G Task 28：将客户端源码中的用户可见中文文案（模板文本、脚本字符串、占位符、aria-label、toast/title 等）抽取为 i18n key，并通过 `t()` / `$t()` 引用，保证 typecheck 与 `build:mp-weixin` 全绿。

## What Changes

### 范围界定
- **覆盖**：`apps/client/src/pages/**/*.vue`、`apps/client/src/subpackages/**/*.vue`、`apps/client/src/components/**/*.vue`、`apps/client/src/view-models/*.ts`、`apps/client/src/config/*.ts`（仅业务文案，不含路由/枚举）、`apps/client/src/stores/*.ts`（仅用户可见错误提示与状态文案）
- **不覆盖**：
  - `.stories.ts` 文件（Storybook 演示文案，非生产路径，单独立项处理）
  - `services/mocks/fixtures.ts` 等纯 Mock 数据文件（随 Mock 服务隔离 spec 一并迁移）
  - `i18n/locales/{zh-CN,en-US}.ts` 本身（locale 源文件）
  - 代码注释中的中文（不影响用户）
  - `console.*` 输出中的中文（仅开发可见）
  - 路由 path、错误码常量、API 参数枚举（非用户可见）

### 抽取策略
1. **优先级 P1：.vue 模板区域中文**——`<template>` 内的文本节点、属性绑定（placeholder、title、aria-label、confirm-text、cancel-text 等）
2. **优先级 P2：.vue 脚本区域中文**——`<script setup>` 内 `uni.showToast({title: ...})`、`uni.showModal({title/content: ...})`、`ref<string>("中文")` 默认值、computed 返回的中文
3. **优先级 P3：.ts 文件中文**——stores 中的 errorMessage、view-models 中的 fallback 文案、config 中的标签名
4. **批量处理**：同一页面/模块的文案归集到对应命名空间（如 `village.detail.*`、`setup.profile.*`、`discover.filter.*`），避免平铺

### 文案命名规则
- 沿用现有命名空间结构：`common.*`、`home.*`、`village.*`、`discover.*`、`circle.*`、`activities.*`、`setup.*`、`legal.*` 等
- 子页面用 `.` 分隔，如 `village.detail.reportReasonSpam`
- 复用文案优先复用现有 key，新增前先 Grep 现有 key
- en-US.ts 同步新增 key，英文翻译可暂用 "TODO" 占位（保证结构对齐，翻译单独立项）

### 处理细则
- **Vue SFC 模板**：
  - 文本节点：`<text>返回</text>` → `<text>{{ t("common.back") }}</text>`
  - 属性绑定：`:placeholder="请输入"` → `:placeholder="t('common.inputPlaceholder')"`
  - 静态属性：`placeholder="请输入"` → `:placeholder="t('common.inputPlaceholder')"`
  - aria-label：`aria-label="操作栏"` → `:aria-label="t('common.actionBarAria')"`
- **Vue SFC 脚本**：
  - `uni.showToast({ title: "成功" })` → `uni.showToast({ title: t("common.success") })`
  - `const label = "运动"` → `const label = t("village.interestSports")`
  - **兴趣标签数组**：保持数据结构，但用 `t()` 包装：`["运动", "健身"]` → `[t("village.interestSports"), t("village.interestFitness")]`
- **.ts 文件**：在函数内通过 `i18n.global.t()` 引用（stores/view-models 不便使用 `useI18n()` composable）

### 残留项豁免清单
以下场景允许保留中文（需在最终报告中列出）：
- 注释（`//` / `/* */` / `<!-- -->`）
- `console.*` 调试输出
- `i18n/locales/` 目录文件
- 路由 path 常量（`/pages/xxx`）
- API 枚举值（如 `reportType: "SPAM"` 不抽取，但展示给用户的 "垃圾广告" 抽取）
- Storybook stories 文件
- Mock fixtures 数据

## Impact

- **Affected specs**：
  - `2026-07-27-reaudit-fixall`（P2 设计系统收口项的子集）
  - `complete-p2h-design-tasks`（Task 34 ARIA 无障碍需引用 i18n key，依赖本 spec 完成）
  - `2026-05-23-hardcode-audit`（P1 后端文案统一管理的前端对应项）
- **Affected code**：
  - `apps/client/src/i18n/locales/zh-CN.ts`（新增 key）
  - `apps/client/src/i18n/locales/en-US.ts`（同步新增 key，TODO 占位）
  - `apps/client/src/pages/**/*.vue`（30+ 文件替换）
  - `apps/client/src/subpackages/**/*.vue`（10+ 文件替换）
  - `apps/client/src/components/**/*.vue`（10+ 文件替换）
  - `apps/client/src/view-models/*.ts`（4 文件）
  - `apps/client/src/stores/*.ts`（部分用户可见文案）
  - `apps/client/src/config/*.ts`（仅业务文案，如 profile-tags.ts、popular-topics.ts）

## ADDED Requirements

### Requirement: 客户端用户可见中文文案通过 i18n key 引用

系统 SHALL 将客户端所有用户可见的中文文案（模板文本、属性、toast、modal、aria-label、状态文案）通过 `t()` / `$t()` / `i18n.global.t()` 引用 i18n key，禁止在 `apps/client/src/` 下的 .vue / .ts 文件中硬编码中文（除豁免清单外）。

#### Scenario: 模板文本节点引用 i18n
- **WHEN** 用户进入 `pages/village/detail.vue` 帖子详情页
- **THEN** 顶部「返回」按钮文本通过 `t("village.detail.back")` 渲染
- **AND** 切换至 en-US locale 时显示 "Back"

#### Scenario: 属性绑定引用 i18n
- **WHEN** 渲染 `<input>` 元素的 placeholder
- **THEN** placeholder 通过 `:placeholder="t('common.inputPlaceholder')"` 绑定
- **AND** 不出现 `placeholder="请输入"` 字面量

#### Scenario: 脚本内 toast 引用 i18n
- **WHEN** 调用 `uni.showToast` 显示成功提示
- **THEN** title 参数为 `t("common.success")` 或对应业务 key
- **AND** 不出现 `title: "成功"` 字面量

#### Scenario: 兴趣标签数组引用 i18n
- **WHEN** `pages/village/detail.vue` 渲染兴趣 chip
- **THEN** `INTEREST_KEYWORDS` 数组中每个中文关键词通过 `t("village.interest*")` 引用
- **AND** 颜色映射逻辑保持不变（仍能识别兴趣所属类别）

### Requirement: i18n locale 文件结构同步

`zh-CN.ts` 与 `en-US.ts` SHALL 保持完全相同的 key 结构，新增 key 时同步更新两端；en-US 翻译可暂时使用 "TODO" 占位符，但 key 必须存在以避免运行时 `t()` 返回 key 本身。

#### Scenario: 新增 village.detail.key 时两端同步
- **WHEN** 在 `zh-CN.ts` 的 `village.detail` 命名空间下新增 `copySuccess: "复制成功"`
- **THEN** `en-US.ts` 的 `village.detail` 命名空间下同步存在 `copySuccess: "TODO"` 或英文翻译
- **AND** typecheck 通过，无 TS1117 重复 key 错误

### Requirement: 命名空间按页面/模块组织

i18n key SHALL 按「页面/模块」分组，使用点号分隔命名空间；同一页面的文案归集到同一命名空间下，避免平铺到根级或 common 下。

#### Scenario: 帖子详情页文案归集
- **WHEN** 抽取 `pages/village/detail.vue` 的文案
- **THEN** 所有该页面独有的文案归入 `village.detail.*` 命名空间
- **AND** 复用文案（如「确认」「取消」）引用 `common.*` 既有 key

### Requirement: 兴趣标签等业务数据保持可识别性

对于 `INTEREST_KEYWORDS` 等用于业务逻辑判断（如颜色映射）的中文关键词数组，SHALL 通过 `t()` 引用 i18n key，但 key 的中文值 SHALL 与原数组字面量一致，保证 `text.includes(kw)` 等业务逻辑不回归。

#### Scenario: 兴趣类别识别保持正确
- **WHEN** 用户兴趣文本为 "我喜欢运动和阅读"
- **THEN** `getInterestCategory` 函数仍能识别为 sports 或 arts 类别
- **AND** 颜色映射不因 i18n 抽取而失效

### Requirement: typecheck 与构建验证通过

完成 i18n 抽取后，客户端 SHALL 通过 typecheck 与 mp-weixin 构建，无新增类型错误或编译错误。

#### Scenario: typecheck 通过
- **WHEN** 执行 `npm --workspace apps/client run typecheck`
- **THEN** 退出码为 0，无 TS1117、TS2304、TS2322 等错误

#### Scenario: mp-weixin 构建通过
- **WHEN** 执行 `npm --workspace apps/client run build:mp-weixin`
- **THEN** 退出码为 0，构建产物可正常生成

### Requirement: 中文硬编码扫描命中数大幅下降

完成抽取后，`scripts/scan-chinese.mjs` 扫描结果 SHALL 较基线（1345 处）大幅下降，残留项仅限豁免清单（注释、console、stories、mock fixtures、locale 文件、路由 path、API 枚举）。

#### Scenario: Grep 验证命中数下降
- **WHEN** 执行 `node scripts/scan-chinese.mjs` 与 `node scripts/analyze-vue.mjs`
- **THEN** .vue 文件中文硬编码总数较基线下降 ≥ 80%
- **AND** .ts 业务文件（排除 stories / mocks）中文硬编码下降 ≥ 60%
- **AND** 残留项可在报告中逐一解释归属豁免清单

## MODIFIED Requirements

### Requirement: 客户端设计系统完整性（来自 complete-p2h-design-tasks）

P2.H Task 34 ARIA 无障碍补齐依赖本 spec 完成的 i18n key——所有新增 `aria-label` SHALL 通过 `t()` 引用既有或新增 i18n key，不硬编码中文字符串。

## REMOVED Requirements

无移除项。本 spec 为新增抽取工作，不改变现有 i18n 体系结构与既有 key 值。
