# Tasks — 客户端 i18n 文案抽取（P2.G Task 28）

> **基线**：`scripts/scan-chinese.mjs` 扫描共 1345 处中文硬编码（.vue 30 文件、.ts 81 文件）。
> **目标**：用户可见中文文案抽取为 i18n key，typecheck + build:mp-weixin 全绿，扫描命中数大幅下降。
> **不修改**：业务逻辑、既有 i18n key 值、路由配置、错误码常量、API 枚举。

## 阶段 0：基线确认与工具准备

- [ ] Task 0.1: 确认扫描基线
  - [ ] 运行 `node scripts/scan-chinese.mjs` 生成 `.scan-baseline.txt`，记录基线总数
  - [ ] 运行 `node scripts/analyze-vue.mjs` 输出 top 30 .vue / .ts 文件分布
  - [ ] 将基线写入 `.scan-baseline.before.txt` 作为对比锚点

- [ ] Task 0.2: 检查 i18n 体系现状
  - [ ] 读取 `apps/client/src/i18n/index.ts` 确认 vue-i18n 配置与全局 `$t`/`t` 注入
  - [ ] 读取 `apps/client/src/i18n/locales/zh-CN.ts` 确认现有命名空间结构
  - [ ] 读取 `apps/client/src/i18n/locales/en-US.ts` 确认与 zh-CN 结构对齐
  - [ ] 列出现有命名空间清单（common/home/village/discover/circle/...），供后续复用

## 阶段 1：.vue 模板区域抽取（优先级 P1，按文件中文数排序）

- [x] Task 1.1: `pages/village/detail.vue` 模板抽取（55 处，重点文件）
  - [x] 新增 i18n key 到 `village.detail.*` 命名空间（reportReason*、copyContent、reportAction、copyFailed、reportDescTitle 等）
  - [x] 同步新增 `en-US.ts` 对应 key（TODO 占位）
  - [x] 替换 `<template>` 中文本节点、属性绑定为 `t()` 调用
  - [x] 替换 `aria-label` 静态值为 `:aria-label="t(...)"`（复用 `village.backAria`、`village.reportPostAria`）
  - [x] `INTEREST_KEYWORDS` 数组改用 `tm("village.interestKeywords")` 引用（中文值保持不变以保证 includes 匹配不回归）

- [x] Task 1.2: `subpackages/setup/profile/index.vue` 模板抽取（47 处）
  - [x] 新增 i18n key 到 `setup.profile.*` 命名空间
  - [x] 同步 `en-US.ts`
  - [x] 替换模板文本、属性绑定、placeholder、picker range 等

- [x] Task 1.3: `components/discover/FilterDrawer.vue` 模板抽取（31 处）
  - [x] 新增 i18n key 到 `discover.filter.*` / `filterDrawer.*` 命名空间
  - [x] 同步 `en-US.ts`
  - [x] 替换筛选器标签、按钮文案、aria-label
  - [x] **保留** `PROVINCE_CITY_MAP` 中文（地理数据，等同 API 枚举，豁免）

- [x] Task 1.4: `pages/circle/index.vue` 模板抽取（28 处）
  - [x] 新增 i18n key 到 `circle.*` 命名空间
  - [x] 同步 `en-US.ts`
  - [x] `posts` 模拟数据保留中文（属 Mock 数据，归 Mock 隔离 spec 一并迁移）

- [ ] Task 1.5: `subpackages/discover/activities/index.vue` 模板抽取（26 处）
  - [ ] 新增 i18n key 到 `activities.*` 命名空间
  - [ ] 同步 `en-US.ts`

- [ ] Task 1.6: `pages/dev/index.vue` 模板抽取（25 处）
  - [ ] 新增 i18n key 到 `dev.*` 命名空间
  - [ ] 同步 `en-US.ts`
  - [ ] **注**：此页为 DEV 模式开发者导航，文件顶部已标注「后续需整体删除」，优先级最低

- [ ] Task 1.7: `pages/village/tag-posts.vue` 模板抽取（19 处）
  - [ ] 复用 `village.*` 命名空间或新增 `village.tagPosts.*`
  - [ ] 同步 `en-US.ts`

- [x] Task 1.8: `pages/campus/post-topic.vue` 模板抽取（17 处）
  - [x] 新增 i18n key 到 `campus.postTopic.*` 命名空间
  - [x] 同步 `en-US.ts`

- [ ] Task 1.9: `pages/home/index.vue` 模板抽取（17 处）
  - [ ] 复用 `home.*` 既有 key，新增缺失项
  - [ ] 同步 `en-US.ts`

- [x] Task 1.10: `pages/campus/topic-detail.vue` 模板抽取（16 处）
  - [x] 新增 i18n key 到 `campus.topicDetail.*` 命名空间
  - [x] 同步 `en-US.ts`

- [ ] Task 1.11: `subpackages/setup/recommend-pref/index.vue` 模板抽取（16 处）
  - [ ] 新增 i18n key 到 `setup.recommendPref.*` 命名空间
  - [ ] 同步 `en-US.ts`

- [x] Task 1.12: `pages/campus/index.vue` 模板抽取（15 处）
  - [x] 复用 `campus.*` 既有 key
  - [x] 同步 `en-US.ts`

- [x] Task 1.13: `subpackages/support/feedback/index.vue` 模板抽取（15 处）
  - [x] 新增 i18n key 到 `feedback.*` 命名空间
  - [x] 同步 `en-US.ts`

- [ ] Task 1.14: `subpackages/setup/campus/index.vue` 模板抽取（13 处）
  - [ ] 新增 i18n key 到 `setup.campus.*` 命名空间
  - [ ] 同步 `en-US.ts`

- [ ] Task 1.15: `subpackages/setup/schedule/index.vue` 模板抽取（11 处）
  - [ ] 新增 i18n key 到 `setup.schedule.*` 命名空间
  - [ ] 同步 `en-US.ts`

- [ ] Task 1.16: `components/discover/AdvancedFilter.vue` 模板抽取（10 处）
  - [ ] 复用 `discover.filter.*` 命名空间
  - [ ] 同步 `en-US.ts`

- [ ] Task 1.17: `subpackages/discover/discussions/index.vue` 模板抽取（10 处）
  - [ ] 新增 i18n key 到 `discover.discussions.*` 命名空间
  - [ ] 同步 `en-US.ts`

- [x] Task 1.18: `pages/chat-session/index.vue` 模板抽取（9 处）
  - [x] 复用 `chat.*` 既有 key，新增 `chat.longPressMenu.*` 子命名空间
  - [x] 同步 `en-US.ts`

- [x] Task 1.19: 剩余 .vue 文件批量抽取（≤ 6 处的文件，共约 11 个）
  - [ ] `pages/profile/visitors.vue`（6 处）
  - [ ] `components/discover/CardDetailOverlay.vue`（5 处）
  - [ ] `pages/village/post.vue`（4 处）
  - [x] `components/common/BottomActionBar.vue`（1 处 aria-label）
  - [ ] `components/common/EducationBadge.vue`（1 处）
  - [ ] `components/common/HeartParticles.vue`（1 处）
  - [x] `components/common/PageStateContainer.vue`（1 处）
  - [ ] `components/common/SafeImage.vue`（1 处）
  - [x] `components/common/Skeleton.vue`（1 处）
  - [ ] `components/discover/CardSwiper.vue`（1 处）
  - [ ] `subpackages/legal/agreement/index.vue`（1 处）
  - [ ] `subpackages/legal/privacy/index.vue`（1 处）

## 阶段 2：.vue 脚本区域抽取（优先级 P2）

- [x] Task 2.1: `pages/village/detail.vue` 脚本区抽取
  - [x] `INTEREST_KEYWORDS` 数组改用 `tm("village.interestKeywords.*")` 引用
  - [x] `console.error("点赞失败:", ...)` 等 console 输出保留（豁免）
  - [x] 检查 `uni.showToast` / `uni.showModal` 的 title/content/confirmText/cancelText 全部走 i18n
  - [x] 验证 `getInterestCategory` 业务逻辑不回归（颜色映射仍正确，中文值保持一致）

- [x] Task 2.2: 其余 .vue 文件脚本区抽取（按需）
  - [x] 逐文件检查 `<script setup>` 内的 `uni.showToast` / `uni.showModal` / `ref<string>("中文")` 默认值
  - [x] 替换为 `t()` 调用
  - [x] 确保已在 `<script setup>` 顶部 `const { t } = useI18n();`（缺失则补齐）

## 阶段 3：.ts 文件抽取（优先级 P3，仅业务文案）

- [ ] Task 3.1: `view-models/*.ts` 抽取
  - [ ] `view-models/profile.ts`（11 处）—— fallback 文案、未设置默认值
  - [ ] `view-models/home.ts`（10 处）—— 推荐理由、提示文案
  - [ ] `view-models/feedback.ts`、`view-models/chat.ts`、`view-models/login.ts`——按需
  - [ ] 通过 `import i18n from "@/i18n"` + `i18n.global.t(...)` 引用

- [ ] Task 3.2: `config/*.ts` 抽取（仅业务文案）
  - [ ] `config/profile-tags.ts`（32 处）—— 兴趣标签名（业务文案）
  - [ ] `config/popular-topics.ts`（12 处）—— 话题标题
  - [ ] `config/status-copy.ts`（12 处）—— 状态展示文案
  - [ ] `config/vip-plans.ts`（11 处）—— VIP 套餐名（保留 id/价格等非文案）
  - [ ] `config/home-recommended-people.ts`（15 处）—— Mock 推荐人物，按 Mock 隔离 spec 标记豁免
  - [ ] **不抽取**：`config/navigation.ts`（路由 path）、`config/api.ts`、`config/env.ts`

- [ ] Task 3.3: `stores/*.ts` 抽取（仅用户可见错误提示）
  - [ ] `stores/campus.ts`（71 处）—— error message、状态文案
  - [ ] `stores/messages.ts`（67 处）—— 会话状态、错误提示
  - [ ] `stores/village/utils.ts`（46 处）—— 时间格式化文案
  - [ ] `stores/circle.ts`（40 处）—— 错误提示
  - [ ] `stores/village/index.ts`（33 处）—— 错误提示
  - [ ] `stores/likes.ts`（30 处）—— 状态文案
  - [ ] `stores/schedule.ts`、`stores/campus-wall.ts`、`stores/activity.ts`、`stores/daily-question.ts`、`stores/profile.ts`、`stores/vip.ts`——按需
  - [ ] **不抽取**：`stores/*/api.ts`、`stores/*/types.ts`、`stores/*/constants.ts`（API 路径、枚举）
  - [ ] **不抽取**：`stores/chat/mock-data.ts`（Mock 数据，归 Mock 隔离 spec）

- [ ] Task 3.4: `services/*.ts` 抽取（仅用户可见错误提示）
  - [ ] `services/agnes-video.ts`（10 处）—— 错误提示
  - [ ] `services/api-error.ts`、`services/auth.ts`——按需
  - [ ] **不抽取**：`services/mocks/fixtures.ts`、`services/generated/api-types.ts`

## 阶段 4：验证与报告

- [ ] Task 4.1: typecheck 验证
  - [ ] 执行 `npm --workspace apps/client run typecheck`
  - [ ] 退出码必须为 0
  - [ ] 若失败：定位 TS1117（重复 key）/ TS2304（未定义 key）/ TS2322（类型不匹配）并修复

- [ ] Task 4.2: mp-weixin 构建验证
  - [ ] 执行 `npm --workspace apps/client run build:mp-weixin`
  - [ ] 退出码必须为 0
  - [ ] 若失败：根据错误信息修复（常见：`import.meta` 误用、可选 catch 语法、`:hover` 伪类）

- [ ] Task 4.3: 扫描验证对比
  - [ ] 重新执行 `node scripts/scan-chinese.mjs` 与 `node scripts/analyze-vue.mjs`
  - [ ] 对比基线，记录前后命中数
  - [ ] .vue 文件中文硬编码下降 ≥ 80%
  - [ ] .ts 业务文件（排除 stories / mocks）下降 ≥ 60%

- [ ] Task 4.4: 残留项分析
  - [ ] 列出所有剩余中文硬编码
  - [ ] 逐项归类到豁免清单（注释 / console / stories / mock fixtures / locale / 路由 path / API 枚举）
  - [ ] 无法归类的标注为「待处理」并说明原因

- [ ] Task 4.5: 输出最终报告
  - [ ] 修改文件清单（新增 key 数、替换文件数）
  - [ ] 验证命令输出（typecheck / build:mp-weixin 退出码）
  - [ ] Grep 验证前后命中数对比表
  - [ ] 残留项清单与豁免说明
  - [ ] 阻塞项（若有）说明

## 阶段 5（可选）：英文翻译补齐

- [ ] Task 5.1: en-US.ts 占位符替换
  - [ ] 将 "TODO" 占位替换为正式英文翻译
  - [ ] 优先级：用户高频可见文案（common.*、home.*、tabs.*）→ 业务页面文案
  - [ ] 翻译单独立项，不阻塞本 spec 验收

# Task Dependencies

- Task 0.1 / 0.2 必须先完成，确立基线与命名空间清单
- 阶段 1 各 Task 之间相互独立，可并行执行
- 阶段 2 依赖阶段 1 完成（同文件先模板后脚本）
- 阶段 3 各 Task 之间相互独立，可并行执行
- 阶段 4 依赖阶段 1-3 全部完成
- 阶段 5 与本 spec 验收解耦，可后续迭代

# 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 兴趣标签数组改 `t()` 后业务逻辑回归 | Task 2.1 单独验证 `getInterestCategory` 颜色映射 |
| `useI18n()` 在 `<script setup>` 顶部缺失导致 `t` 未定义 | 替换前先 Grep `useI18n` 引入，缺失则补齐 |
| en-US.ts 漏新增 key 导致运行时显示 key 本身 | Task 4.1 typecheck 验证 + Task 4.4 残留项分析 |
| 大量替换引入 TS1117 重复 key | 新增 key 前 Grep 既有 key，命名空间隔离 |
| mp-weixin 构建失败（`import.meta` / 可选 catch） | 严格遵守项目硬约束，不引入禁用语法 |
