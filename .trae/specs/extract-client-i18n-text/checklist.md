# Checklist — 客户端 i18n 文案抽取（P2.G Task 28）

> 验证本 spec 是否达成可商业化交付标准。每项必须经实际验证后勾选，禁止未验证直接勾选。

## 阶段 0：基线确认

- [ ] 已运行 `node scripts/scan-chinese.mjs` 并记录基线总数（1345 处）
- [ ] 已运行 `node scripts/analyze-vue.mjs` 并保存 top 30 文件分布到 `.scan-baseline.before.txt`
- [x] 已读取 `apps/client/src/i18n/index.ts` 确认 vue-i18n 配置（legacy: false, Composition API）
- [x] 已读取 `apps/client/src/i18n/locales/zh-CN.ts` 确认现有命名空间结构
- [x] 已读取 `apps/client/src/i18n/locales/en-US.ts` 确认与 zh-CN 结构对齐
- [x] 已列出现有命名空间清单供后续复用（common/home/village/discover/circle/campus/setup/feedback/chat/vip/login 等）

## 阶段 1：.vue 模板区域抽取

- [x] `pages/village/detail.vue` 模板中文已抽取（55 处 → 0 处用户可见残留）
- [x] `subpackages/setup/profile/index.vue` 模板中文已抽取（47 处 → 0 处用户可见残留）
- [x] `components/discover/FilterDrawer.vue` 模板中文已抽取（31 处 → 0 处用户可见残留，PROVINCE_CITY_MAP 地理数据豁免）
- [x] `pages/circle/index.vue` 模板中文已抽取（28 处 → 0 处用户可见残留，posts mock 数据豁免）
- [ ] `subpackages/discover/activities/index.vue` 模板中文已抽取（26 处 → 0 处用户可见残留）
- [ ] `pages/dev/index.vue` 模板中文已抽取（25 处 → 0 处用户可见残留，DEV 模式页待删除）
- [ ] `pages/village/tag-posts.vue` 模板中文已抽取（19 处）
- [x] `pages/campus/post-topic.vue` 模板中文已抽取（17 处）
- [ ] `pages/home/index.vue` 模板中文已抽取（17 处）
- [x] `pages/campus/topic-detail.vue` 模板中文已抽取（16 处）
- [ ] `subpackages/setup/recommend-pref/index.vue` 模板中文已抽取（16 处）
- [x] `pages/campus/index.vue` 模板中文已抽取（15 处）
- [x] `subpackages/support/feedback/index.vue` 模板中文已抽取（15 处）
- [ ] `subpackages/setup/campus/index.vue` 模板中文已抽取（13 处）
- [ ] `subpackages/setup/schedule/index.vue` 模板中文已抽取（11 处）
- [ ] `components/discover/AdvancedFilter.vue` 模板中文已抽取（10 处）
- [ ] `subpackages/discover/discussions/index.vue` 模板中文已抽取（10 处）
- [x] `pages/chat-session/index.vue` 模板中文已抽取（9 处）
- [ ] `pages/profile/visitors.vue` 模板中文已抽取（6 处）
- [ ] `components/discover/CardDetailOverlay.vue` 模板中文已抽取（5 处）
- [ ] `pages/village/post.vue` 模板中文已抽取（4 处）
- [x] `components/common/BottomActionBar.vue` 模板中文已抽取（1 处 aria-label）
- [ ] `components/common/EducationBadge.vue` 模板中文已抽取
- [ ] `components/common/HeartParticles.vue` 模板中文已抽取
- [x] `components/common/PageStateContainer.vue` 模板中文已抽取
- [ ] `components/common/SafeImage.vue` 模板中文已抽取
- [x] `components/common/Skeleton.vue` 模板中文已抽取
- [ ] `components/discover/CardSwiper.vue` 模板中文已抽取
- [ ] `subpackages/legal/agreement/index.vue` 模板中文已抽取
- [ ] `subpackages/legal/privacy/index.vue` 模板中文已抽取

## 阶段 2：.vue 脚本区域抽取

- [x] `pages/village/detail.vue` 脚本区 `uni.showToast` / `uni.showModal` 已抽取
- [x] `pages/village/detail.vue` `INTEREST_KEYWORDS` 数组已用 `tm()` 包装且颜色映射不回归
- [x] `pages/village/detail.vue` `console.error` 中文保留（豁免清单内）
- [x] 所有已处理 .vue 文件 `<script setup>` 顶部已 `import { useI18n } from "vue-i18n"` 并 `const { t } = useI18n()`
- [x] 所有已处理 .vue 文件 `uni.showToast({ title: "中文" })` 已替换为 `t()` 调用
- [x] 所有已处理 .vue 文件 `uni.showModal({ title/content/confirmText/cancelText: "中文" })` 已替换
- [x] 所有已处理 .vue 文件 `ref<string>("中文")` 默认值已替换（除非为业务占位非用户可见）

## 阶段 3：.ts 文件抽取

- [ ] `view-models/profile.ts` 用户可见 fallback 文案已抽取（11 处）
- [ ] `view-models/home.ts` 推荐理由、提示文案已抽取（10 处）
- [ ] `view-models/feedback.ts` / `chat.ts` / `login.ts` 已按需抽取
- [ ] `config/profile-tags.ts` 兴趣标签名已抽取（32 处）
- [ ] `config/popular-topics.ts` 话题标题已抽取（12 处）
- [ ] `config/status-copy.ts` 状态文案已抽取（12 处）
- [ ] `config/vip-plans.ts` VIP 套餐名已抽取（11 处，保留 id/价格）
- [ ] `config/home-recommended-people.ts` 已标记为 Mock 豁免（15 处）
- [ ] `stores/campus.ts` 错误提示已抽取（71 处）
- [ ] `stores/messages.ts` 状态文案已抽取（67 处）
- [ ] `stores/village/utils.ts` 时间格式化文案已抽取（46 处）
- [ ] `stores/circle.ts` 错误提示已抽取（40 处）
- [ ] `stores/village/index.ts` 错误提示已抽取（33 处）
- [ ] `stores/likes.ts` 状态文案已抽取（30 处）
- [ ] `services/agnes-video.ts` 错误提示已抽取（10 处）
- [ ] **未抽取项确认**：`stores/*/api.ts`、`stores/*/types.ts`、`stores/*/constants.ts`、`services/mocks/fixtures.ts`、`services/generated/api-types.ts`、`config/navigation.ts`、`config/api.ts`、`config/env.ts`、所有 `.stories.ts` 文件——这些应保留原状

## 阶段 4：i18n locale 文件同步

- [x] `zh-CN.ts` 新增的所有 key 在 `en-US.ts` 中存在对应 key（结构对齐）
- [x] `en-US.ts` 新增 key 可使用 "TODO" 占位（阶段 5 替换）
- [x] 无 TS1117 重复 key 错误（typecheck 通过）
- [x] 新增 key 遵循现有命名空间结构（未平铺到根级）
- [x] 复用文案优先复用既有 key（如 `common.confirm` / `common.cancel`）

## 阶段 5：业务逻辑无回归

- [x] `pages/village/detail.vue` `getInterestCategory` 颜色映射在 i18n 抽取后仍正确（INTEREST_KEYWORDS 中文值保持一致，includes 匹配不回归）
- [x] 兴趣文本「我喜欢运动和阅读」仍能识别为 sports/arts 类别（i18n 值与原字面量一致）
- [x] 举报原因列表顺序与原数组一致（REPORT_REASONS computed 顺序未变）
- [x] 路由跳转路径未改变（`/pages/village/tag-posts` 等不变）
- [x] API 枚举值未改变（`reportType: "SPAM"` 等不变）

## 阶段 6：验证命令

- [x] `npm --workspace apps/client run typecheck` 退出码为 0
- [x] `npm --workspace apps/client run build:mp-weixin` 退出码为 0
- [ ] `node scripts/scan-chinese.mjs` 命中数较基线（1345）大幅下降
- [ ] `node scripts/analyze-vue.mjs` 显示 .vue 文件中文硬编码下降 ≥ 80%
- [ ] .ts 业务文件（排除 stories / mocks）中文硬编码下降 ≥ 60%
- [ ] 残留项可在报告中逐一解释归属豁免清单

## 阶段 7：硬约束遵守

- [x] 未修改业务逻辑（仅文案抽取，无算法/流程改动）
- [x] 未修改 i18n locale 文件中的现有 key 值（仅新增）
- [x] 未修改路由配置（`pages.json` / `config/navigation.ts` 不变）
- [x] 未修改错误码常量、API 参数枚举
- [x] 未引入 `import.meta.env.DEV`（mp-weixin 不兼容）
- [x] 未使用可选 catch 语法 `catch {`（mp-weixin 不兼容）
- [x] 未使用 `:hover` 伪类（mp-weixin 不支持）
- [x] 未引入 `backdrop-filter`（除 H5 条件编译外）
- [x] 未创建外部 composable 模块（如 `usePageTransition.js`）
- [x] 所有页面切换逻辑内联在 .vue 文件中

## 阶段 8：报告交付

- [x] 已输出修改文件清单（新增 i18n key 数、替换文件数）
- [x] 已输出验证命令实际输出（typecheck / build:mp-weixin 退出码与日志）
- [x] 已输出 Grep 验证前后命中数对比表
- [x] 已输出残留项清单与豁免说明
- [x] 已说明阻塞项（若有）及具体阻塞点
- [x] 未提交 git commit（除非用户明确要求）
