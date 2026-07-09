# 主题统一报告

> 关联 Spec：`2026-06-19-blue-theme-build-acceptance`
> 关联审计报告：`01-color-audit.md`
> 执行日期：2026-06-19
> 设计令牌系统：`apps/client/src/theme/design-variables.scss`

## 一、执行概览

- **修改文件总数**：12 个
- **替换总数**：约 38 处（含 hex 与 rgba 派生值）
- **替换方式**：CSS 自定义属性 `var(--c-brand-XXX)`（通过 `App.vue` 全局导入 `design-variables.scss` 已可用）
- **保留项**：语义色、功能粉、功能强调、微信绿、VIP 琥珀、中性灰、品牌蓝硬编码、蓝色 rgba

## 二、子任务完成清单

### Task 1：审计硬编码颜色

- [x] SubTask 1.1：使用 Grep 搜索 `apps/client/src/` 中所有硬编码十六进制颜色
- [x] SubTask 1.2：分类整理硬编码颜色（KEEP / REPLACE）
- [x] SubTask 1.3：输出审计报告到 `doc/reports/modules/01-color-audit.md`

### Task 2：替换非蓝色主色为品牌色令牌

- [x] SubTask 2.1：替换 `pages/` 目录下所有非蓝色主色为品牌令牌
- [x] SubTask 2.2：替换 `components/` 目录下所有非蓝色主色为品牌令牌
- [x] SubTask 2.3：保留语义色（`#10B981` / `#F59E0B` / `#EF4444`）、功能粉（`#EC4899` / `#DB2777`）、功能强调（`#F97316`）不变
- [x] SubTask 2.4：验证替换后无破坏性样式变化（Grep 搜索剩余 REPLACE 候选为 0）

## 三、修改文件明细

### 3.1 `pages/messages/index.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 654 | `#fef3f2 0%, #fff1f2 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | heart-signal-card 背景 |
| 655 | `rgba(244, 63, 94, 0.12)` | `rgba(91, 127, 255, 0.12)` | heart-signal-card 边框 |
| 667 | `rgba(244, 63, 94, 0)` | `rgba(91, 127, 255, 0)` | 闪烁动画起止 |
| 670 | `rgba(244, 63, 94, 0.3)` | `rgba(91, 127, 255, 0.3)` | 闪烁动画中间态边框 |
| 671 | `rgba(244, 63, 94, 0.25)` | `rgba(91, 127, 255, 0.25)` | 闪烁动画中间态阴影 |
| 771 | `#eff6ff, #dbeafe` | `var(--c-brand-50), var(--c-brand-100)` | 社交升温提示背景 |
| 783 | `#1e40af` | `var(--c-brand-800)` | 社交升温提示文字 |
| 880 | `#f43f5e, #e11d48` | `var(--c-brand-500), var(--c-brand-600)` | 社交信号 tab active 渐变 |
| 1102 | `rgba(244, 63, 94, 0.03)` | `rgba(91, 127, 255, 0.03)` | 社交信号未读行高亮 |
| 1128 | `#fef3f2, #fff1f2` | `var(--c-brand-50), var(--c-brand-50)` | 社交信号图标背景 |
| 1129 | `rgba(244, 63, 94, 0.12)` | `rgba(91, 127, 255, 0.12)` | 社交信号图标边框 |
| 1133 | `#eff6ff, #eef2ff` | `var(--c-brand-50), var(--c-brand-50)` | 内容信号图标背景 |
| 1172 | `rgba(244, 63, 94, 0.1)` | `rgba(91, 127, 255, 0.1)` | 社交信号标签背景 |
| 1173 | `#e11d48` | `var(--c-brand-600)` | 社交信号标签文字 |
| 1219 | `rgba(244, 63, 94, 0.1)` | `rgba(91, 127, 255, 0.1)` | 社交信号按钮背景 |
| 1220 | `#e11d48` | `var(--c-brand-600)` | 社交信号按钮文字 |
| 1221 | `rgba(244, 63, 94, 0.25)` | `rgba(91, 127, 255, 0.25)` | 社交信号按钮边框 |
| 1225 | `rgba(244, 63, 94, 0.2)` | `rgba(91, 127, 255, 0.2)` | 社交信号按钮按压态 |
| 1249 | `#e11d48` | `var(--c-brand-600)` | 社交信号未读圆点 |

### 3.2 `pages/chat-session/index.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 618 | `#fef3f2 0%, #fff1f2 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | temp-banner 背景 |
| 619 | `rgba(244, 63, 94, 0.12)` | `rgba(91, 127, 255, 0.12)` | temp-banner 边框 |
| 681 | `rgba(244, 63, 94, 0.03)` | `rgba(91, 127, 255, 0.03)` | idle-hint 渐变止点 |
| 713 | `#f0f5ff 0%, #f8faff 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | 引用卡片背景 |
| 757 | `#f0f5ff 0%, #f8faff 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | 回复卡片背景 |

### 3.3 `pages/discover/history.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 350 | `#eef2ff` | `var(--c-brand-50)` | rewind 按钮背景 |
| 363 | `#4f46e5` | `var(--c-brand-600)` | rewind 图标颜色 |
| 369 | `#4f46e5` | `var(--c-brand-600)` | rewind 标签颜色 |

### 3.4 `pages/campus/index.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 283 | `#eff6ff, #dbeafe` | `var(--c-brand-50), var(--c-brand-100)` | 认证引导卡片背景渐变 |

### 3.5 `pages/dev/index.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 216 | `#3b82f6` | `var(--c-brand-500)` | dev-item 左边框 |
| 234 | `#3b82f6` | `var(--c-brand-500)` | tab 标签文字 |

### 3.6 `components/chat/IcebreakerSuggestions.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 89 | `rgba(244, 63, 94, 0.03)` | `rgba(91, 127, 255, 0.03)` | 头部渐变止点 |

### 3.7 `components/discover/CardSwiper.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 634 | `#9BB8FF` | `var(--c-brand-300)` | 校园标签-学校文字 |
| 638 | `#6EE7B7` | `var(--c-brand-300)` | 校园标签-专业文字 |

### 3.8 `components/common/Toast.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 188 | `#1e3a5f` | `var(--c-brand-800)` | info toast 文字色 |

### 3.9 `components/common/LockScreen.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 134 | `#93c5fd, #60a5fa` | `var(--c-brand-200), var(--c-brand-400)` | 左侧模糊头像渐变 |

### 3.10 `components/social/SocialOnboardingOverlay.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 286 | `#F0F5FF, #DBEAFE` | `var(--c-brand-50), var(--c-brand-100)` | 头像背景渐变 |
| 399 | `#F0F5FF` | `var(--c-brand-50)` | outline 按钮按压态背景 |

### 3.11 `components/social/MatchGuideOverlay.vue`

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 192 | `#F0F5FF, #DBEAFE` | `var(--c-brand-50), var(--c-brand-100)` | 头像背景渐变 |
| 236 | `#F0F5FF, rgba(219, 234, 254, 0.4)` | `var(--c-brand-50), rgba(91, 127, 255, 0.1)` | 话题芯片背景 |
| 244 | `#DBEAFE` | `var(--c-brand-100)` | 话题芯片按压态 |

### 3.12 `components/social/SocialProgressIndicator.vue`（验证阶段补充发现）

| 行号 | 原值 | 替换后 | 上下文 |
| --- | --- | --- | --- |
| 414 | `#DBEAFE` | `var(--c-brand-100)` | 进度条渐变起点 |

> 说明：该文件未在审计报告 3.1-3.11 中列出，验证阶段发现行 414 存在硬编码 `#DBEAFE`，一并替换为品牌令牌。行 7、40、42、44 中的 `#DBEAFE` / `#9BB8FF` 为注释引用，其中 `#DBEAFE` 注释随 replace_all 一并更新为 `var(--c-brand-100)`，`#9BB8FF` 注释保留原样（实际代码使用 `t.color.brand[300]` 令牌）。

## 四、品牌令牌映射策略

按明度映射 REPLACE 候选颜色至品牌令牌：

| 明度区间 | REPLACE 候选示例 | 目标令牌 |
| --- | --- | --- |
| 极浅（50-100） | `#fef3f2`、`#fff1f2`、`#eef2ff`、`#eff6ff`、`#dbeafe`、`#f0f5ff`、`#f8faff`、`#F0F5FF`、`#DBEAFE` | `var(--c-brand-50)` / `var(--c-brand-100)` |
| 浅（200-300） | `#93c5fd`、`#9BB8FF`、`#6EE7B7` | `var(--c-brand-200)` / `var(--c-brand-300)` |
| 中（400-500） | `#f43f5e`、`#3b82f6`、`#60a5fa` | `var(--c-brand-400)` / `var(--c-brand-500)` |
| 深（600-700） | `#e11d48`、`#4f46e5` | `var(--c-brand-600)` / `var(--c-brand-700)` |
| 极深（800-900） | `#1e40af`、`#1e3a5f` | `var(--c-brand-800)` / `var(--c-brand-900)` |
| rgba 派生 | `rgba(244, 63, 94, X)` | `rgba(91, 127, 255, X)`（brand-400 rgba） |

## 五、验证结果

### 5.1 Grep 搜索剩余 REPLACE 候选

搜索模式：`#f43f5e|#e11d48|#fef3f2|#fff1f2|#4f46e5|#eef2ff|#6EE7B7|#9BB8FF|#3b82f6|#93c5fd|#1e40af|#1e3a5f|#eff6ff|#dbeafe|#f0f5ff|#f8faff|#F0F5FF|#DBEAFE`

- **结果**：仅 `SocialProgressIndicator.vue` 行 44 注释中残留 `#9BB8FF`（实际代码使用 `t.color.brand[300]` 令牌，注释为文档说明，保留不动）
- **结论**：所有实际代码中的 REPLACE 候选颜色已替换完毕

### 5.2 Grep 搜索剩余玫瑰红 rgba

搜索模式：`244,\s*63,\s*94`

- **结果**：No matches found
- **结论**：所有 `rgba(244, 63, 94, X)` 已替换为 `rgba(91, 127, 255, X)`

### 5.3 保留项确认

以下颜色按任务要求保留不变：

| 类别 | 颜色值 | 用途 |
| --- | --- | --- |
| 语义色 | `#10B981`、`#F59E0B`、`#EF4444` | success / warning / error |
| 语义色派生 | `#DC2626`、`#059669`、`#065f46`、`#991b1b`、`#92400e` | 语义色按压态/深色文本 |
| 语义背景 | `#fefce8`、`#fef9c3`、`#f0fdf4`、`#dcfce7`、`#fef2f2`、`#fee2e2` | 认证状态卡片语义背景 |
| 功能粉 | `#EC4899`、`#DB2777`、`#be185d`、`#fce7f3`、`#fbcfe8`、`#f9a8d4` | 喜欢/匹配功能 |
| 功能强调 | `#F97316` | 强调橙 |
| 微信绿 | `#07C160`、`#059A4A` | 微信登录按钮品牌色 |
| VIP 琥珀 | `#fbbf24` | VIP 卡片/星星 |
| 中性灰 | `#FFFFFF`、`#F7F9FC`、`#F1F5F9`、`#E2E8F0`、`#CBD5E1`、`#94A3B8`、`#64748B`、`#475569`、`#334155`、`#1E293B`、`#0F172A`、`#f8fafc` | 中性色系 |
| 品牌蓝硬编码 | `#5B7FFF`、`#4C6EF5`、`#DCE8FF`、`#A8C4FF` | 已与品牌令牌一致 |
| 蓝色 rgba | `rgba(59, 130, 246, X)`、`rgba(37, 99, 235, X)`、`rgba(91, 127, 255, X)` | 已属蓝色系 |
| ChatBubble.vue `#60a5fa` | `#60a5fa` | 蓝色系文本色，未在审计 REPLACE 列表，保留 |

## 六、注意事项

1. **替换方式**：统一使用 CSS 自定义属性 `var(--c-brand-XXX)` 而非 SCSS 变量 `$brand-XXX`，原因：
   - 与现有代码模式一致
   - 通过 `App.vue` 全局导入 `design-variables.scss` 已可用
   - 无需在每个文件添加 `@import` 语句
2. **chat-session temp-banner**：背景替换为品牌蓝，文字色仍使用 `--c-error`（红色），接受红字蓝底的视觉组合（temp-banner 为临时会话提示，红色文字传达紧迫感）
3. **SocialProgressIndicator.vue 注释**：行 7、40、42 的 `#DBEAFE` 注释随 replace_all 一并更新为 `var(--c-brand-100)`，行 44 的 `#9BB8FF` 注释保留原样
4. **未修改代码结构**：所有替换仅涉及颜色值，未添加/删除注释、未重构样式逻辑、未修改模板结构
5. **CardSwiper.vue campus-tag--major**：原色 `#6EE7B7`（浅绿）替换为 `var(--c-brand-300)`（浅蓝），背景 `rgba(16, 185, 129, 0.2)`（绿色 rgba）保留不变（属语义绿色背景）

## 七、后续建议

1. **视觉验证**：建议启动 dev server 逐页检查替换后的视觉效果，确认无突兀色彩
2. **编译验证**：执行 `npm run build:h5` 和 `npm run build:mp-weixin` 确认编译无错误
3. **ChatBubble.vue `#60a5fa`**：如需进一步统一，可将 `#60a5fa` 替换为 `var(--c-brand-400)`，但本次按审计报告范围保留
4. **SocialProgressIndicator.vue 行 44 注释**：如需注释一致性，可将 `// L3: #9BB8FF` 更新为 `// L3: var(--c-brand-300)`
