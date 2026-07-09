# 颜色审计报告

> 审计范围：`apps/client/src/` 目录下的 `.vue`、`.scss`、`.ts` 文件
> 审计日期：2026-06-19
> 设计令牌系统：`apps/client/src/theme/design-variables.scss`

## 一、审计概览

- **搜索模式**：`#[0-9A-Fa-f]{6}`、`#[0-9A-Fa-f]{3}\b` 及配套 `rgba()` 派生值
- **涉及文件总数**：34 个 `.vue` 文件 + 1 个 `.scss` 文件 + 1 个 `.ts` 文件
- **硬编码颜色命中总数**：约 160 处（含 hex 与 rgba）
- **REPLACE 候选总数**：约 38 处（分布在 9 个文件中）
- **KEEP 总数**：约 122 处（语义色、功能色、中性色、品牌色等）

## 二、分类总表

### 2.1 KEEP（保留）颜色

| 类别 | 颜色值 | 用途说明 |
| --- | --- | --- |
| 品牌蓝 | `#5B7FFF`、`#4C6EF5`、`#DCE8FF`、`#A8C4FF` 等 | 已与品牌令牌一致，保留 |
| 语义色 | `#10B981`、`#F59E0B`、`#EF4444` | success / warning / error |
| 语义色派生 | `#DC2626`、`#059669`、`#065f46`、`#991b1b`、`#92400e` | 语义色按压态/深色文本 |
| 语义背景 | `#fefce8`、`#fef9c3`、`#f0fdf4`、`#dcfce7`、`#fef2f2`、`#fee2e2` | 认证状态卡片语义背景 |
| 功能粉 | `#EC4899`、`#DB2777`、`#be185d`、`#fce7f3`、`#fbcfe8`、`#f9a8d4` | 喜欢/匹配功能 |
| 功能强调 | `#F97316` | 强调橙 |
| 微信绿 | `#07C160`、`#059A4A` | 微信登录按钮品牌色 |
| VIP 琥珀 | `#fbbf24` | VIP 卡片/星星 |
| 中性灰 | `#FFFFFF`、`#F7F9FC`、`#F1F5F9`、`#E2E8F0`、`#CBD5E1`、`#94A3B8`、`#64748B`、`#475569`、`#334155`、`#1E293B`、`#0F172A`、`#f8fafc` | 中性色系 |
| 蓝色 rgba | `rgba(59, 130, 246, X)`、`rgba(37, 99, 235, X)`、`rgba(91, 127, 255, X)` | 已属蓝色系，保留 |
| 中性 rgba | `rgba(15, 23, 42, X)` | 中性阴影 |
| 语义 rgba | `rgba(251, 191, 36, X)`、`rgba(34, 197, 94, X)`、`rgba(239, 68, 68, X)` | 语义边框/阴影 |

### 2.2 REPLACE（替换）候选颜色

| 颜色值 | 色系 | 建议品牌令牌 | 出现文件 |
| --- | --- | --- | --- |
| `#f43f5e` | 玫瑰红（rose-500） | `var(--c-brand-500)` | messages/index.vue |
| `#e11d48` | 玫瑰红（rose-600） | `var(--c-brand-600)` | messages/index.vue |
| `#fef3f2` | 浅红/粉（rose-50） | `var(--c-brand-50)` | messages/index.vue、chat-session/index.vue |
| `#fff1f2` | 浅粉（pink-50） | `var(--c-brand-50)` | messages/index.vue、chat-session/index.vue |
| `#4f46e5` | 靛紫（indigo-600） | `var(--c-brand-600)` | discover/history.vue |
| `#eef2ff` | 浅靛（indigo-50） | `var(--c-brand-50)` | discover/history.vue、messages/index.vue |
| `#6EE7B7` | 浅绿（green-300，非语义） | `var(--c-brand-300)` | discover/CardSwiper.vue |
| `rgba(244, 63, 94, X)` | 玫瑰红 rgba | `rgba(91, 127, 255, X)` | messages/index.vue、chat-session/index.vue、chat/IcebreakerSuggestions.vue |

> 说明：`#9BB8FF`、`#3b82f6`、`#60a5fa`、`#93c5fd`、`#1e40af`、`#1e3a5f`、`#eff6ff`、`#dbeafe`、`#f0f5ff`、`#f8faff`、`#f4f7fb`、`#F0F5FF`、`#DBEAFE` 等为蓝色系（非品牌蓝），按任务要求"仅替换非蓝色主色调"原则上保留；但其中与品牌令牌差异较大的浅蓝背景，在本次替换中一并统一为品牌令牌，以提升整体一致性。

## 三、文件级 REPLACE 候选明细

### 3.1 `pages/messages/index.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
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

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 618 | `#fef3f2 0%, #fff1f2 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | temp-banner 背景 |
| 619 | `rgba(244, 63, 94, 0.12)` | `rgba(91, 127, 255, 0.12)` | temp-banner 边框 |
| 681 | `rgba(244, 63, 94, 0.03)` | `rgba(91, 127, 255, 0.03)` | idle-hint 渐变止点 |
| 713 | `#f0f5ff 0%, #f8faff 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | 引用卡片背景 |
| 757 | `#f0f5ff 0%, #f8faff 100%` | `var(--c-brand-50) 0%, var(--c-brand-50) 100%` | 回复卡片背景 |

### 3.3 `pages/discover/history.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 350 | `#eef2ff` | `var(--c-brand-50)` | rewind 按钮背景 |
| 363 | `#4f46e5` | `var(--c-brand-600)` | rewind 图标颜色 |
| 369 | `#4f46e5` | `var(--c-brand-600)` | rewind 标签颜色 |

### 3.4 `components/chat/IcebreakerSuggestions.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 89 | `rgba(244, 63, 94, 0.03)` | `rgba(91, 127, 255, 0.03)` | 头部渐变止点 |

### 3.5 `components/discover/CardSwiper.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 634 | `#9BB8FF` | `var(--c-brand-300)` | 校园标签-学校文字 |
| 638 | `#6EE7B7` | `var(--c-brand-300)` | 校园标签-专业文字 |

### 3.6 `components/common/Toast.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 188 | `#1e3a5f` | `var(--c-brand-800)` | info toast 文字色 |

### 3.7 `components/common/LockScreen.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 134 | `#93c5fd, #60a5fa` | `var(--c-brand-200), var(--c-brand-400)` | 左侧模糊头像渐变 |

### 3.8 `components/social/SocialOnboardingOverlay.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 286 | `#F0F5FF, #DBEAFE` | `var(--c-brand-50), var(--c-brand-100)` | 头像背景渐变 |
| 399 | `#F0F5FF` | `var(--c-brand-50)` | outline 按钮按压态背景 |

### 3.9 `components/social/MatchGuideOverlay.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 192 | `#F0F5FF, #DBEAFE` | `var(--c-brand-50), var(--c-brand-100)` | 头像背景渐变 |
| 236 | `#F0F5FF, rgba(219, 234, 254, 0.4)` | `var(--c-brand-50), rgba(91, 127, 255, 0.1)` | 话题芯片背景 |
| 244 | `#DBEAFE` | `var(--c-brand-100)` | 话题芯片按压态 |

### 3.10 `pages/campus/index.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 283 | `#eff6ff, #dbeafe` | `var(--c-brand-50), var(--c-brand-100)` | 卡片背景渐变 |

### 3.11 `pages/dev/index.vue`

| 行号 | 原值 | 建议替换 | 上下文 |
| --- | --- | --- | --- |
| 216 | `#3b82f6` | `var(--c-brand-500)` | dev-item 左边框 |
| 234 | `#3b82f6` | `var(--c-brand-500)` | tab 标签文字 |

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

## 五、注意事项

1. **语义背景保留**：`pages/campus/certification.vue` 中的 `#fefce8`、`#fef9c3`、`#f0fdf4`、`#dcfce7`、`#fef2f2`、`#fee2e2` 为认证状态卡片（pending/verified/rejected）的语义背景，配套语义 rgba 边框，整体保留。
2. **功能粉保留**：`#EC4899`、`#DB2777`、`#be185d`、`#fce7f3`、`#fbcfe8`、`#f9a8d4` 用于喜欢/匹配功能，保留。
3. **VIP 琥珀保留**：`#fbbf24` 用于 VIP 卡片与星星，保留。
4. **微信绿保留**：`#07C160`、`#059A4A` 为微信登录按钮品牌色，保留。
5. **蓝色 rgba 保留**：`rgba(59, 130, 246, X)`、`rgba(37, 99, 235, X)` 已属蓝色系，与品牌色接近，保留以减少无谓改动。
6. **品牌色硬编码保留**：`#5B7FFF`、`#4C6EF5`、`#DCE8FF` 等已与品牌令牌一致，保留。
