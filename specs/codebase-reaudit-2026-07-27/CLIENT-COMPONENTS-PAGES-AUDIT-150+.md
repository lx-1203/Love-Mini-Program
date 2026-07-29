# Client Components & Pages 深度审计报告

**审计范围**：apps/client/src/components、apps/client/src/pages
**文件总数**：102
**问题总数**：619
**生成时间**：2026-07-27

> 说明：本报告聚焦客户端组件与页面，按文件/模块组织，覆盖硬编码样式、中文/i18n、微信小程序兼容性、无障碍、UI/UX、功能空壳/Mock、性能 8 个维度。对于同一文件内同类问题已做聚合，保留典型行号与修复方向。

## 严重程度分布

- CRITICAL: 1
- HIGH: 323
- MEDIUM: 247
- LOW: 48

## 问题类别分布

- 性能: 154
- i18n 遗漏: 114
- 硬编码样式: 97
- 功能空壳 / Mock: 80
- 硬编码中文 / i18n 遗漏: 51
- 微信小程序兼容性: 50
- 无障碍 (a11y): 48
- UI/UX 一致性: 25

---

## components\UnlockGuideModal.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\UnlockGuideModal.vue` 第 155 行
- **描述**：检测到 15 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 9 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 155 行: background: var(--c-overlay-mid-strong, rgba(15, 23, 42, 0.5)); | 第 174 行: background: var(--c-text-inverse, #ffffff); | 第 176 行: box-shadow: 0 16rpx 48rpx var(--c-neutral-shadow-xl, rgba(15, 23, 42, 0.16));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\UnlockGuideModal.vue` 第 44 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'lock.thisFeature'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\UnlockGuideModal.vue` 第 57 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'lock.defaultSubtitleModal'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\UnlockGuideModal.vue` 第 157 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\UnlockGuideOverlay.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\UnlockGuideOverlay.vue` 第 127 行
- **描述**：检测到 12 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 127 行: background: var(--c-overlay-stronger, rgba(15, 23, 42, 0.72)); | 第 137 行: background: var(--c-overlay-white-bg-most, rgba(255, 255, 255, 0.96)); | 第 139 行: box-shadow: 0 16rpx 48rpx var(--c-black-shadow-xl, rgba(0, 0, 0, 0.24));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\UnlockGuideOverlay.vue` 第 63 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'lock.title'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\UnlockGuideOverlay.vue` 第 76 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'lock.title'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\UnlockGuideOverlay.vue` 第 108 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\chat\ChatBubble.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\ChatBubble.vue` 第 274 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 6 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 274 行: background: var(--c-overlay-bg-light, var(--c-overlay-bg-light, var(--c-overlay-bg-light, rgba(255, 255, 255, 0.2)))); | 第 277 行: background: var(--c-black-shadow-xs, var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)))); | 第 285 行: background: var(--c-overlay-bg-strong, var(--c-overlay-bg-mid, var(--c-overlay-bg-mid, rgba(255, 255, 255, 0.5))));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\ChatBubble.vue` 第 42 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.recalledBySelf'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\ChatBubble.vue` 第 42 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.recalledByPeer'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`components\chat\ChatBubble.vue` 第 216 行
- **描述**：存在 CSS Grid / grid 布局（共 1 处），示例：/* mp-weixin 不支持 display:grid，单列纵向堆叠改用 flex-direction: column */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

## components\chat\ChatItem.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\chat\ChatItem.vue` 第 78 行
- **描述**：检测到 2 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 78 行: padding: 28rpx 32rpx; | 第 141 行: padding: 4rpx 16rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\ChatItem.vue` 第 53 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.matchBadge'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\ChatItem.vue` 第 66 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.officialBadge'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\chat\HeartSignal.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\HeartSignal.vue` 第 63 行
- **描述**：检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 63 行: margin: 20rpx 32rpx; | 第 66 行: padding: 24rpx; | 第 76 行: width: 72rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\HeartSignal.vue` 第 20 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.heartSignalTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\HeartSignal.vue` 第 26 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.heartSignalAria'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\chat\HeartSignal.vue` 第 84 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\chat\IcebreakerSuggestions.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 110 行
- **描述**：检测到 16 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 14 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 110 行: var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.04))), | 第 111 行: var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(91, 127, 255, 0.03))) | 第 113 行: border-bottom: 1px solid var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.06)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 37 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.icebreakerTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 39 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.icebreakerLoading'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 257 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 性能
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 60 行
- **描述**：v-for 缺少 :key：<view class="icebreaker__skeleton" v-for="n in 3" :key="n">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [HIGH] 性能
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 76 行
- **描述**：v-for 缺少 :key：v-for="item in items"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [MEDIUM] 性能
- **文件**：`components\chat\IcebreakerSuggestions.vue` 第 60 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\chat\RedPacketBubble.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\RedPacketBubble.vue` 第 205 行
- **描述**：检测到 13 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 7 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 205 行: background: linear-gradient(135deg, #FA5151 0%, #E0413E 100%); | 第 206 行: color: var(--c-text-inverse, #FFFFFF); | 第 207 行: box-shadow: var(--s-red-packet, 0 4rpx 12rpx rgba(236, 72, 72, 0.2));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\RedPacketBubble.vue` 第 81 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chatRedPacket.bubbleDefaultBlessing'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\RedPacketBubble.vue` 第 90 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chatRedPacket.bubbleStatusClaimed'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\chat\VoiceMessageBubble.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\VoiceMessageBubble.vue` 第 223 行
- **描述**：检测到 12 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 14 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 223 行: background: var(--c-bg-brand, rgba(63, 207, 142, 0.08)); | 第 224 行: color: var(--c-brand-700, #15803d); | 第 225 行: box-shadow: 0 2rpx 8rpx var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\chat\VoiceMessageBubble.vue` 第 278 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 3. [HIGH] 功能空壳 / Mock
- **文件**：`components\chat\VoiceMessageBubble.vue` 第 78 行
- **描述**：Mock/占位/未实现标记：/** 气泡宽度（根据时长动态调整，模拟微信风格） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`components\chat\VoiceMessageBubble.vue` 第 87 行
- **描述**：Mock/占位/未实现标记：/** 是否可播放（未过期且有时频 URL 或处于 mock 模式） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 性能
- **文件**：`components\chat\VoiceMessageBubble.vue` 第 192 行
- **描述**：v-for 缺少 :key：v-for="n in 5"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\chat\VoiceMessageBubble.vue` 第 192 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\chat\VoicePill.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\VoicePill.vue` 第 114 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 114 行: box-shadow: 0 2rpx 8rpx var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)); | 第 131 行: color: var(--c-text-inverse, #FFFFFF); | 第 132 行: box-shadow: 0 4rpx 16rpx var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.25));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\chat\VoicePill.vue` 第 152 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 3. [HIGH] 功能空壳 / Mock
- **文件**：`components\chat\VoicePill.vue` 第 14 行
- **描述**：Mock/占位/未实现标记：/** 语音文件 URL（可为空，mock 模式仅显示时长） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`components\chat\VoicePill.vue` 第 24 行
- **描述**：Mock/占位/未实现标记：/** 模拟播放结束定时器引用（用于无音频 URL 时的 UI 状态切换） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 性能
- **文件**：`components\chat\VoicePill.vue` 第 94 行
- **描述**：v-for 缺少 :key：v-for="n in 3"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\chat\VoicePill.vue` 第 94 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\chat\VoiceRecorder.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\chat\VoiceRecorder.vue` 第 304 行
- **描述**：检测到 14 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 9 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 304 行: background: var(--c-bg-container, #ffffff); | 第 305 行: border: 1rpx solid var(--c-border-light, #e5e7eb); | 第 340 行: background: var(--c-brand-500, #22c55e);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\VoiceRecorder.vue` 第 105 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.voiceCancelHint'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\chat\VoiceRecorder.vue` 第 110 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.voiceHoldToTalk'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\chat\VoiceRecorder.vue` 第 307 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 性能
- **文件**：`components\chat\VoiceRecorder.vue` 第 255 行
- **描述**：v-for 缺少 :key：v-for="n in 5"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\chat\VoiceRecorder.vue` 第 255 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\common\BaseTabs.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\BaseTabs.vue` 第 161 行
- **描述**：检测到 12 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 161 行: background: var(--c-bg-container, #FFFFFF); | 第 174 行: border-bottom: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06)); | 第 194 行: color: var(--c-text-secondary, #5B6470);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 性能
- **文件**：`components\common\BaseTabs.vue` 第 23 行
- **描述**：v-for 缺少 :key：v-for="tab in tabs"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 3. [HIGH] 性能
- **文件**：`components\common\BaseTabs.vue` 第 48 行
- **描述**：v-for 缺少 :key：v-for="tab in tabs"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 4. [MEDIUM] 性能
- **文件**：`components\common\BaseTabs.vue` 第 23 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\common\BottomActionBar.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\BottomActionBar.vue` 第 65 行
- **描述**：检测到 1 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 3 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 65 行: color: var(--c-text-inverse, #FFFFFF); | 第 55 行: height: 88rpx; | 第 66 行: box-shadow: var(--s-brand);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\common\BottomActionBar.vue` 第 22 行
- **描述**：<template> 中直接使用中文文案：aria-label="操作栏"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

## components\common\Button.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\Button.vue` 第 267 行
- **描述**：检测到 1 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 7 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 267 行: background: var(--c-error-dark, #c43a42); | 第 192 行: box-shadow: var(--s-brand); | 第 195 行: box-shadow: var(--s-brand-sm);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\common\Button.vue` 第 295 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\common\Card.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\Card.vue` 第 82 行
- **描述**：检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 82 行: box-shadow: var(--s-card-soft); | 第 94 行: box-shadow: var(--c-elevation-2); | 第 101 行: box-shadow: var(--s-brand);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

## components\common\EmptyState.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\EmptyState.vue` 第 57 行
- **描述**：检测到 2 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 57 行: padding: 80rpx 40rpx; | 第 59 行: .empty-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\EmptyState.vue` 第 25 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'empty.noData'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\common\EmptyState.vue` 第 29 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'empty.noDataSub'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\common\ErrorState.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\ErrorState.vue` 第 80 行
- **描述**：检测到 1 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 3 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 80 行: color: var(--c-text-inverse, #fff); | 第 59 行: padding: 80rpx 40rpx; | 第 61 行: .error-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\ErrorState.vue` 第 46 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'error.retry'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\common\ErrorState.vue` 第 48 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'error.retry'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\common\HeartParticles.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\HeartParticles.vue` 第 171 行
- **描述**：检测到 6 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 4 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 171 行: color: var(--c-romance-500, #EC4899); | 第 198 行: background: rgba(255, 255, 255, 0.85); | 第 199 行: border: 1rpx solid var(--c-border-default, #e2e8f0);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\common\HeartParticles.vue` 第 140 行
- **描述**：<template> 中直接使用中文文案：:aria-label="paused ? '恢复粒子动画' : '暂停粒子动画'"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 性能
- **文件**：`components\common\HeartParticles.vue` 第 126 行
- **描述**：v-for 缺少 :key：v-for="i in 12"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 4. [MEDIUM] 性能
- **文件**：`components\common\HeartParticles.vue` 第 126 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\common\LockScreen.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\LockScreen.vue` 第 138 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 21 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 138 行: radial-gradient(ellipse at 20% 20%, rgba(63, 207, 142, 0.18) 0%, transparent 50%), | 第 139 行: radial-gradient(ellipse at 80% 30%, rgba(249, 168, 196, 0.2) 0%, transparent 45%), | 第 140 行: radial-gradient(ellipse at 50% 80%, rgba(124, 217, 166, 0.15) 0%, transparent 50%),
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\LockScreen.vue` 第 26 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'lock.thisFeature'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\common\LockScreen.vue` 第 37 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'lock.defaultSubtitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\common\LockScreen.vue` 第 265 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`components\common\LockScreen.vue` 第 165 行
- **描述**：Mock/占位/未实现标记：/* mp-weixin 不支持 filter:blur，用半透明遮罩 + 提升 opacity 兜底模拟若隐若现感 */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## components\common\MatchCountChip.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\MatchCountChip.vue` 第 92 行
- **描述**：检测到 2 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 92 行: width: 28rpx; | 第 93 行: height: 28rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

## components\common\PageStateContainer.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\PageStateContainer.vue` 第 155 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 5 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 155 行: border: 4rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06)); | 第 156 行: border-top-color: var(--c-brand, #3FCF8E); | 第 163 行: color: var(--c-text-tertiary, #9AA1AB);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\common\PageStateContainer.vue` 第 18 行
- **描述**：<template> 中直接使用中文文案：<view class="loading-spinner" role="status" aria-live="polite" aria-label="加载中" />
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\common\PageStateContainer.vue` 第 98 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.loading'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] i18n 遗漏
- **文件**：`components\common\PageStateContainer.vue` 第 99 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'messages.loadFailed'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`components\common\PageStateContainer.vue` 第 133 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\common\SafeImage.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\SafeImage.vue` 第 163 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）。 示例：第 163 行: background: var(--c-neutral-100, #F4F6FA); | 第 175 行: rgba(0, 0, 0, 0.06) 25%, | 第 176 行: rgba(0, 0, 0, 0.1) 37%,
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\common\SafeImage.vue` 第 6 行
- **描述**：<template> 中直接使用中文文案：:aria-label="alt || '图片'"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [LOW] 无障碍 (a11y)
- **文件**：`components\common\SafeImage.vue` 第 180 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`components\common\SafeImage.vue` 第 32 行
- **描述**：Mock/占位/未实现标记：<view v-else class="safe-image__placeholder" :class="customClass" :style="customStyle" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`components\common\SafeImage.vue` 第 121 行
- **描述**：Mock/占位/未实现标记：/** fallback 图片也加载失败：显示纯色占位 */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## components\common\SectionCard.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\SectionCard.vue` 第 35 行
- **描述**：检测到 2 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 35 行: box-shadow: var(--c-elevation-1); | 第 41 行: box-shadow: var(--c-elevation-2);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

## components\common\SectionHeader.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\SectionHeader.vue` 第 49 行
- **描述**：检测到 1 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 49 行: padding: 32rpx 0 20rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\SectionHeader.vue` 第 20 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.viewAll'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\common\ShareCard.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\ShareCard.vue` 第 316 行
- **描述**：检测到 18 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 316 行: background: var(--c-bg-overlay, rgba(0, 0, 0, 0.5)); | 第 324 行: background: linear-gradient(135deg, var(--c-romance-400, #EC4899) 0%, var(--c-brand-500, #3FCF8E) 100%); | 第 325 行: box-shadow: var(--s-modal, 0 20rpx 60rpx rgba(0, 0, 0, 0.2));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\ShareCard.vue` 第 107 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.shareCardTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\common\ShareCard.vue` 第 117 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.shareSuccess'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\common\Skeleton.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\Skeleton.vue` 第 99 行
- **描述**：检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 99 行: padding: 24rpx; | 第 104 行: width: 88rpx; | 第 105 行: height: 88rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\common\Skeleton.vue` 第 21 行
- **描述**：<template> 中直接使用中文文案：aria-label="加载中"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 性能
- **文件**：`components\common\Skeleton.vue` 第 23 行
- **描述**：v-for 缺少 :key：<view v-for="i in count" :key="i" class="skeleton-item" :class="`skeleton--${variant}`">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 4. [MEDIUM] 性能
- **文件**：`components\common\Skeleton.vue` 第 23 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\common\StatusState.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\StatusState.vue` 第 64 行
- **描述**：检测到 2 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 3 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 64 行: background: rgba(16, 185, 129, 0.12); | 第 69 行: background: rgba(245, 158, 11, 0.12); | 第 41 行: padding: 8rpx 16rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

## components\common\Tag.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\Tag.vue` 第 94 行
- **描述**：检测到 8 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）。 示例：第 94 行: background: var(--c-success-bg-tint, var(--c-success-bg-tint, var(--c-success-bg-tint, rgba(16, 185, 129, 0.1)))); | 第 96 行: border-color: var(--c-success-border-tint, var(--c-success-border-tint, var(--c-success-border-tint, rgba(16, 185, 129,  | 第 99 行: background: var(--c-warning-bg-tint, var(--c-warning-bg-tint, var(--c-warning-bg-tint, rgba(245, 158, 11, 0.1))));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

## components\common\Toast.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\Toast.vue` 第 250 行
- **描述**：检测到 12 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 7 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 250 行: box-shadow: 0 8rpx 32rpx var(--c-neutral-shadow-xl, rgba(15, 23, 42, 0.12)); | 第 258 行: background: var(--c-success-bg-tint, rgba(16, 185, 129, 0.1)); | 第 259 行: border: 2rpx solid var(--c-success-border-tint, rgba(16, 185, 129, 0.2));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\Toast.vue` 第 137 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.networkError'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [LOW] 无障碍 (a11y)
- **文件**：`components\common\Toast.vue` 第 302 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\common\UnreadBadge.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\common\UnreadBadge.vue` 第 44 行
- **描述**：检测到 2 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 5 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 44 行: background: var(--c-secondary-blue-400, #5B7FFF); | 第 45 行: color: var(--c-text-inverse, #FFFFFF); | 第 41 行: min-width: 32rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\UnreadBadge.vue` 第 19 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'messages.unreadAria'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [LOW] 无障碍 (a11y)
- **文件**：`components\common\UnreadBadge.vue` 第 52 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\common\VerificationBadge.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\common\VerificationBadge.vue` 第 141 行
- **描述**：检测到 7 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 141 行: border-width: 1rpx; | 第 148 行: padding: 2rpx var(--sp-2); | 第 181 行: width: 20rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\common\VerificationBadge.vue` 第 125 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.verificationCta'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\common\VerificationBadge.vue` 第 127 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.verificationCta'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\common\VirtualList.vue

### 1. [HIGH] 功能空壳 / Mock
- **文件**：`components\common\VirtualList.vue` 第 217 行
- **描述**：Mock/占位/未实现标记：占位容器：高度等于列表总高度，撑开 scroll-view 的可滚动范围。
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 2. [HIGH] 功能空壳 / Mock
- **文件**：`components\common\VirtualList.vue` 第 255 行
- **描述**：Mock/占位/未实现标记：/* 占位容器：撑开可滚动范围，绝对定位避免影响布局流 */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 3. [HIGH] 性能
- **文件**：`components\common\VirtualList.vue` 第 234 行
- **描述**：v-for 缺少 :key：v-for="(item, idx) in visibleItems"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

## components\discover\AdvancedFilter.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\discover\AdvancedFilter.vue` 第 650 行
- **描述**：检测到 1 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 6 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 650 行: box-shadow: 0 2rpx 8rpx var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12)); | 第 599 行: box-shadow: var(--s-brand-sm); | 第 627 行: width: 88rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\AdvancedFilter.vue` 第 73 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'advancedFilter.genderAny'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\AdvancedFilter.vue` 第 74 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'advancedFilter.genderMale'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 性能
- **文件**：`components\discover\AdvancedFilter.vue` 第 393 行
- **描述**：v-for 缺少 :key：v-for="opt in GENDER_OPTIONS"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [HIGH] 性能
- **文件**：`components\discover\AdvancedFilter.vue` 第 448 行
- **描述**：v-for 缺少 :key：v-for="school in SCHOOL_OPTIONS"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\discover\AdvancedFilter.vue` 第 393 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\discover\CardDetailOverlay.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\discover\CardDetailOverlay.vue` 第 651 行
- **描述**：检测到 16 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 43 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 651 行: background: var(--c-black-overlay-transparent, var(--c-black-overlay-transparent, rgba(0, 0, 0, 0))); | 第 656 行: background: var(--c-black-overlay-strong, var(--c-black-overlay-strong, rgba(0, 0, 0, 0.65))); | 第 690 行: var(--c-overlay-bg-pure, var(--c-overlay-bg-pure, rgba(255, 255, 255, 0.95))) 0%,
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\CardDetailOverlay.vue` 第 106 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'cardDetail.operationFailed'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\CardDetailOverlay.vue` 第 129 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.educationHighSchool'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`components\discover\CardDetailOverlay.vue` 第 663 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），fixed 定位下 100vh 会包含状态栏；改用 100% 配合 fixed 父级铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 微信小程序兼容性
- **文件**：`components\discover\CardDetailOverlay.vue` 第 1198 行
- **描述**：存在 backdrop-filter 属性（共 1 处），示例：backdrop-filter: blur(20rpx);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [MEDIUM] 微信小程序兼容性
- **文件**：`components\discover\CardDetailOverlay.vue` 第 1123 行
- **描述**：存在 CSS Grid / grid 布局（共 1 处），示例：/* mp-weixin 不支持 display:grid，2 列等宽布局改用 Flexbox + 子元素 width: calc */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 7. [LOW] 无障碍 (a11y)
- **文件**：`components\discover\CardDetailOverlay.vue` 第 936 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`components\discover\CardDetailOverlay.vue` 第 155 行
- **描述**：Mock/占位/未实现标记：/** 兴趣圈（优先从卡片 tags 派生，否则使用模拟数据） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`components\discover\CardDetailOverlay.vue` 第 180 行
- **描述**：Mock/占位/未实现标记：/** 收入范围（模拟，后续接入后端） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [HIGH] 性能
- **文件**：`components\discover\CardDetailOverlay.vue` 第 427 行
- **描述**：v-for 缺少 :key：<swiper-item v-for="(url, idx) in displayImages" :key="idx" class="detail-hero__item">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [HIGH] 性能
- **文件**：`components\discover\CardDetailOverlay.vue` 第 443 行
- **描述**：v-for 缺少 :key：v-for="(_, idx) in displayImages"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 12. [MEDIUM] 性能
- **文件**：`components\discover\CardDetailOverlay.vue` 第 427 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\discover\CardSwiper.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\discover\CardSwiper.vue` 第 1071 行
- **描述**：检测到 45 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 65 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 1071 行: 0 8rpx 24rpx var(--c-neutral-shadow-lg, var(--c-neutral-shadow-lg, rgba(15, 23, 42, 0.08))), | 第 1072 行: 0 28rpx 72rpx var(--c-neutral-shadow-xl, var(--c-neutral-shadow-xl, rgba(15, 23, 42, 0.14))), | 第 1073 行: 0 0 40rpx var(--c-brand-bg-tint-strong, var(--c-brand-bg-tint-strong, rgba(63, 207, 142, 0.12)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\CardSwiper.vue` 第 253 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.personalityOutgoing'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\CardSwiper.vue` 第 254 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.personalityGentle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 微信小程序兼容性
- **文件**：`components\discover\CardSwiper.vue` 第 1195 行
- **描述**：存在 backdrop-filter 属性（共 4 处），示例：backdrop-filter: blur(8rpx);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`components\discover\CardSwiper.vue` 第 1205 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`components\discover\CardSwiper.vue` 第 744 行
- **描述**：Mock/占位/未实现标记：<view v-else class="card__bg card__bg--placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`components\discover\CardSwiper.vue` 第 745 行
- **描述**：Mock/占位/未实现标记：<text class="card__placeholder-text">{{ nextCard.name[0] }}</text>
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`components\discover\CardSwiper.vue` 第 770 行
- **描述**：v-for 缺少 :key：v-for="(imageUrl, idx) in currentDisplayImages"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`components\discover\CardSwiper.vue` 第 828 行
- **描述**：v-for 缺少 :key：v-for="(_, idx) in currentDisplayImages"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`components\discover\CardSwiper.vue` 第 770 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\discover\FilterDrawer.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\discover\FilterDrawer.vue` 第 911 行
- **描述**：检测到 10 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 911 行: box-shadow: var(--s-modal); | 第 945 行: width: 56rpx; | 第 946 行: height: 56rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\FilterDrawer.vue` 第 70 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.educationHighSchool'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\FilterDrawer.vue` 第 71 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.educationBachelor'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\discover\FilterDrawer.vue` 第 898 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`components\discover\FilterDrawer.vue` 第 790 行
- **描述**：Mock/占位/未实现标记：<text class="picker-trigger__text" :class="{ 'picker-trigger__text--placeholder': !hometownProvinceDraft }">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`components\discover\FilterDrawer.vue` 第 816 行
- **描述**：Mock/占位/未实现标记：<text class="picker-trigger__text" :class="{ 'picker-trigger__text--placeholder': !futureCityDraft }">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`components\discover\FilterDrawer.vue` 第 730 行
- **描述**：v-for 缺少 :key：v-for="opt in EDUCATION_OPTIONS"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [HIGH] 性能
- **文件**：`components\discover\FilterDrawer.vue` 第 754 行
- **描述**：v-for 缺少 :key：v-for="opt in RELATIONSHIP_OPTIONS"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`components\discover\FilterDrawer.vue` 第 730 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\discover\LongPressMenu.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\discover\LongPressMenu.vue` 第 245 行
- **描述**：检测到 7 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 245 行: background: var(--c-black-overlay-transparent, var(--c-black-overlay-transparent, rgba(0, 0, 0, 0))); | 第 250 行: background: var(--c-black-overlay-mid, var(--c-black-overlay-mid, rgba(0, 0, 0, 0.4))); | 第 257 行: background: var(--c-bg-container, #FFFFFF);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\LongPressMenu.vue` 第 120 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.menuTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\discover\LongPressMenu.vue` 第 128 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.cancel'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\home\ActivityCard.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\home\ActivityCard.vue` 第 124 行
- **描述**：检测到 5 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 9 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 124 行: background: linear-gradient(0deg, var(--c-overlay-bg-mid, rgba(255,255,255,0.3)) 0%, transparent 100%); | 第 139 行: background: var(--c-secondary-blue-400, rgba(91, 127, 255, 0.85)); | 第 143 行: background: var(--c-success, rgba(16, 185, 129, 0.85));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 微信小程序兼容性
- **文件**：`components\home\ActivityCard.vue` 第 134 行
- **描述**：存在 backdrop-filter 属性（共 1 处），示例：backdrop-filter: blur(12rpx);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

## components\home\ActivityScroll.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\home\ActivityScroll.vue` 第 58 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 3 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 58 行: background: linear-gradient(90deg, var(--c-neutral-50, #f1f5f9) 25%, var(--c-neutral-200, #e2e8f0) 50%, var(--c-neutral- | 第 49 行: padding: 4rpx 32rpx; | 第 52 行: min-width: 400rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\home\ActivityScroll.vue` 第 60 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 3. [HIGH] 性能
- **文件**：`components\home\ActivityScroll.vue` 第 25 行
- **描述**：v-for 缺少 :key：<view v-if="loading" class="activity-skeleton" v-for="i in 3" :key="i" role="listitem">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 4. [HIGH] 性能
- **文件**：`components\home\ActivityScroll.vue` 第 30 行
- **描述**：v-for 缺少 :key：v-for="item in (items || [])"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [MEDIUM] 性能
- **文件**：`components\home\ActivityScroll.vue` 第 25 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\home\HomeBanner.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\home\HomeBanner.vue` 第 172 行
- **描述**：检测到 8 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 5 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 172 行: rgba(0, 0, 0, 0) 40%, | 第 173 行: rgba(0, 0, 0, 0.55) 100% | 第 193 行: color: var(--c-text-inverse, #ffffff);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\home\HomeBanner.vue` 第 59 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'homeBanner.linkMissing'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\home\HomeBanner.vue` 第 65 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'homeBanner.navigateFailed'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 性能
- **文件**：`components\home\HomeBanner.vue` 第 99 行
- **描述**：v-for 缺少 :key：v-for="banner in homeBanners"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [HIGH] 性能
- **文件**：`components\home\HomeBanner.vue` 第 130 行
- **描述**：v-for 缺少 :key：v-for="(banner, idx) in homeBanners"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\home\HomeBanner.vue` 第 99 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\home\HomeHeader.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\home\HomeHeader.vue` 第 123 行
- **描述**：检测到 1 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 123 行: border: 3rpx solid var(--c-bg-container, #FFFFFF); | 第 59 行: padding: 16rpx 32rpx; | 第 70 行: max-width: 240rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\home\HomeHeader.vue` 第 24 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.selectSchool'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\home\HomeHeader.vue` 第 26 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.welcome'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 微信小程序兼容性
- **文件**：`components\home\HomeHeader.vue` 第 113 行
- **描述**：存在 :hover 伪类（共 1 处），示例：.header-icon:hover { background: var(--c-brand-100); }
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

## components\home\PeopleScroll.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\home\PeopleScroll.vue` 第 74 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 3 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 74 行: background: linear-gradient(90deg, var(--c-neutral-50, #f1f5f9) 25%, var(--c-neutral-200, #e2e8f0) 50%, var(--c-neutral- | 第 65 行: padding: 4rpx 32rpx; | 第 68 行: min-width: 320rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\home\PeopleScroll.vue` 第 76 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 3. [HIGH] 性能
- **文件**：`components\home\PeopleScroll.vue` 第 36 行
- **描述**：v-for 缺少 :key：<view v-if="loading" class="people-skeleton" v-for="i in 3" :key="i" role="listitem">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 4. [HIGH] 性能
- **文件**：`components\home\PeopleScroll.vue` 第 41 行
- **描述**：v-for 缺少 :key：v-for="person in (items || []).slice(0, 5)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [MEDIUM] 性能
- **文件**：`components\home\PeopleScroll.vue` 第 36 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\home\PersonCard.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\home\PersonCard.vue` 第 94 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 6 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 94 行: box-shadow: 0 0 0 4rpx var(--c-secondary-blue-border-tint, rgba(91, 127, 255, 0.2)), 0 0 16rpx var(--c-secondary-blue-bg | 第 156 行: color: var(--c-text-inverse, #FFFFFF); | 第 72 行: padding: 24rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\home\PersonCard.vue` 第 25 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.personActionChat'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\home\PersonCard.vue` 第 54 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.personSameSchool'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\home\WallSection.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\home\WallSection.vue` 第 90 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 1 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 90 行: background: linear-gradient(90deg, var(--c-neutral-50, #f1f5f9) 25%, var(--c-neutral-200, #e2e8f0) 50%, var(--c-neutral- | 第 89 行: height: 300rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\home\WallSection.vue` 第 43 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.campusNews'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\home\WallSection.vue` 第 52 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.loading'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\home\WallSection.vue` 第 92 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 性能
- **文件**：`components\home\WallSection.vue` 第 48 行
- **描述**：v-for 缺少 :key：v-for="i in 2"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [HIGH] 性能
- **文件**：`components\home\WallSection.vue` 第 58 行
- **描述**：v-for 缺少 :key：v-for="post in (posts || []).slice(0, 3)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [MEDIUM] 性能
- **文件**：`components\home\WallSection.vue` 第 48 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\home\WelcomeBanner.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\home\WelcomeBanner.vue` 第 61 行
- **描述**：检测到 9 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 61 行: background: var(--c-overlay-white-bg-tint-mid, rgba(255,255,255,0.1)); | 第 70 行: background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.08)); | 第 79 行: background: var(--c-overlay-white-bg-tint-strong, rgba(255, 255, 255, 0.12));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\home\WelcomeBanner.vue` 第 20 行
- **描述**：<template> 中直接使用中文文案：<text class="banner-greeting">{{ greeting || '下午好，同学' }}</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`components\home\WelcomeBanner.vue` 第 21 行
- **描述**：<template> 中直接使用中文文案：<text class="banner-sub">{{ subtitle || '今天有 3 节课，2 个空闲时段可以认识新朋友' }}</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [HIGH] 微信小程序兼容性
- **文件**：`components\home\WelcomeBanner.vue` 第 141 行
- **描述**：存在 backdrop-filter 属性（共 1 处），示例：backdrop-filter: blur(16rpx);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`components\home\WelcomeBanner.vue` 第 64 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 性能
- **文件**：`components\home\WelcomeBanner.vue` 第 23 行
- **描述**：v-for 缺少 :key：<view v-for="(tag, idx) in tags" :key="idx" class="banner-tag">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [MEDIUM] 性能
- **文件**：`components\home\WelcomeBanner.vue` 第 23 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\layout\AppShell.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\layout\AppShell.vue` 第 244 行
- **描述**：检测到 12 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 7 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 244 行: background: var(--c-bg-page, #F4F6FA); | 第 249 行: background: var(--c-bg-page, #F4F6FA); | 第 256 行: var(--c-bg-brand, #E8F8F0) 0%,
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\layout\AppShell.vue` 第 171 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.skipToMain'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\layout\AppShell.vue` 第 176 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.skipToMain'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\layout\AppShell.vue` 第 372 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\layout\ChatHeader.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\layout\ChatHeader.vue` 第 52 行
- **描述**：检测到 3 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 52 行: padding: 24rpx 32rpx 20rpx; | 第 68 行: width: 88rpx; | 第 69 行: height: 88rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\layout\ChatHeader.vue` 第 16 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.headerTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\layout\ChatHeader.vue` 第 31 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.searchIconAria'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\layout\TabBar.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\layout\TabBar.vue` 第 223 行
- **描述**：检测到 45 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 32 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 223 行: background: var(--c-bg-container, #FFFFFF); | 第 271 行: background: linear-gradient(90deg, var(--c-brand, #3FCF8E) 0%, var(--c-brand-300, #7CD9A6) 100%); | 第 272 行: box-shadow: var(--s-tab-brand, 0 2rpx 6rpx rgba(63, 207, 142, 0.35));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\layout\TabBar.vue` 第 304 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

## components\login\LoginIllustration.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\login\LoginIllustration.vue` 第 30 行
- **描述**：检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 30 行: width: 400rpx; | 第 31 行: height: 320rpx; | 第 33 行: border-radius: 48rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

## components\login\LoginLogo.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\login\LoginLogo.vue` 第 57 行
- **描述**：检测到 5 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 57 行: box-shadow: var(--s-secondary-blue-md, 0 8rpx 32rpx rgba(91, 127, 255, 0.3)); | 第 71 行: color: var(--c-text-inverse, #FFFFFF); | 第 73 行: text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.25);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\login\LoginLogo.vue` 第 12 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.heroTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\login\LoginLogo.vue` 第 13 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.heroSubtitleDefault'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\login\PhoneBtn.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\login\PhoneBtn.vue` 第 35 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 1 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 35 行: border: 2rpx solid rgba(255,255,255,0.4); | 第 44 行: border-color: rgba(255,255,255,0.7); | 第 45 行: background: rgba(255,255,255,0.1);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\login\PhoneBtn.vue` 第 21 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.phoneLogin'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\login\PhoneBtn.vue` 第 25 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.phoneLogin'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 微信小程序兼容性
- **文件**：`components\login\PhoneBtn.vue` 第 43 行
- **描述**：存在 :hover 伪类（共 1 处），示例：.phone-btn:hover {
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

## components\login\TermsText.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\login\TermsText.vue` 第 29 行
- **描述**：检测到 2 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）。 示例：第 29 行: color: rgba(255,255,255,0.5); | 第 33 行: color: rgba(255,255,255,0.7);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\login\TermsText.vue` 第 11 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.agreedPrefix'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\login\TermsText.vue` 第 13 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.termsAgreePrefix'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\login\WechatBtn.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\login\WechatBtn.vue` 第 50 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 6 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 50 行: box-shadow: var(--s-secondary-blue, 0 8rpx 32rpx rgba(91, 127, 255, 0.35)); | 第 56 行: box-shadow: var(--s-secondary-blue-sm, 0 4rpx 16rpx rgba(91, 127, 255, 0.2)); | 第 74 行: color: var(--c-text-inverse, #FFFFFF);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\login\WechatBtn.vue` 第 22 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.wechatLogin'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\login\WechatBtn.vue` 第 32 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.wechatLogin'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

## components\profile\TagSelector.vue

### 1. [MEDIUM] i18n 遗漏
- **文件**：`components\profile\TagSelector.vue` 第 91 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'tagSelector.maxReached'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\profile\TagSelector.vue` 第 149 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'tagSelector.title'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] UI/UX 一致性
- **文件**：`components\profile\TagSelector.vue` 第 187 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 4. [HIGH] 性能
- **文件**：`components\profile\TagSelector.vue` 第 175 行
- **描述**：v-for 缺少 :key：v-for="tag in selectedTags"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [HIGH] 性能
- **文件**：`components\profile\TagSelector.vue` 第 194 行
- **描述**：v-for 缺少 :key：v-for="group in profileTagGroups"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\profile\TagSelector.vue` 第 175 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\setup\SetupProgress.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\setup\SetupProgress.vue` 第 242 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 10 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 242 行: box-shadow: 0 2rpx 8rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.25)); | 第 249 行: box-shadow: 0 0 0 6rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.18)); | 第 255 行: box-shadow: 0 0 0 6rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.18));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [LOW] 无障碍 (a11y)
- **文件**：`components\setup\SetupProgress.vue` 第 250 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 3. [HIGH] 性能
- **文件**：`components\setup\SetupProgress.vue` 第 121 行
- **描述**：v-for 缺少 :key：v-for="(step, idx) in renderSteps"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 4. [HIGH] 性能
- **文件**：`components\setup\SetupProgress.vue` 第 152 行
- **描述**：v-for 缺少 :key：v-for="step in renderSteps"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [MEDIUM] 性能
- **文件**：`components\setup\SetupProgress.vue` 第 121 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\social\LikeBurst.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\social\LikeBurst.vue` 第 146 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）。 示例：第 146 行: color: var(--c-romance-500, #EC4899); | 第 147 行: text-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.4); | 第 181 行: color: var(--particle-color, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\social\LikeBurst.vue` 第 96 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'likeAnimation.burstAria'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [LOW] 无障碍 (a11y)
- **文件**：`components\social\LikeBurst.vue` 第 141 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 4. [HIGH] 性能
- **文件**：`components\social\LikeBurst.vue` 第 105 行
- **描述**：v-for 缺少 :key：v-for="p in particles"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 5. [MEDIUM] 性能
- **文件**：`components\social\LikeBurst.vue` 第 105 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\social\MatchGuideOverlay.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\social\MatchGuideOverlay.vue` 第 204 行
- **描述**：检测到 17 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 12 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 204 行: background: var(--c-overlay-strong, rgba(15, 23, 42, 0.7)); | 第 217 行: background: var(--c-bg-container, #FFFFFF); | 第 220 行: box-shadow: 0 20rpx 60rpx var(--c-neutral-shadow-xl, rgba(15, 23, 42, 0.12)), 0 4rpx 16rpx var(--c-neutral-shadow-md, rg
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\social\MatchGuideOverlay.vue` 第 90 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'matchGuide.maskAria'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\social\MatchGuideOverlay.vue` 第 102 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.matchSuccessTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 微信小程序兼容性
- **文件**：`components\social\MatchGuideOverlay.vue` 第 207 行
- **描述**：存在 backdrop-filter 属性（共 2 处），示例：backdrop-filter: blur(10rpx);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`components\social\MatchGuideOverlay.vue` 第 96 行
- **描述**：Mock/占位/未实现标记：<view class="mgo-avatar-placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`components\social\MatchGuideOverlay.vue` 第 239 行
- **描述**：Mock/占位/未实现标记：.mgo-avatar-placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`components\social\MatchGuideOverlay.vue` 第 115 行
- **描述**：v-for 缺少 :key：v-for="(topic, index) in icebreakers"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [HIGH] 性能
- **文件**：`components\social\MatchGuideOverlay.vue` 第 132 行
- **描述**：v-for 缺少 :key：v-for="circle in commonCircles"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`components\social\MatchGuideOverlay.vue` 第 115 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\social\PostReportDialog.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\social\PostReportDialog.vue` 第 257 行
- **描述**：检测到 19 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 7 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 257 行: background: rgba(0, 0, 0, 0.5); | 第 274 行: background: var(--c-bg-container, #ffffff); | 第 299 行: border-bottom: 1rpx solid var(--c-border-light, #e5e7eb);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\social\PostReportDialog.vue` 第 48 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'postReport.reasonSpam'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\social\PostReportDialog.vue` 第 49 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'postReport.reasonPorn'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\social\PostReportDialog.vue` 第 263 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`components\social\PostReportDialog.vue` 第 213 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('postReport.otherPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`components\social\PostReportDialog.vue` 第 289 行
- **描述**：Mock/占位/未实现标记：/* 仅占位，避免 hover-class 无样式告警 */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`components\social\PostReportDialog.vue` 第 190 行
- **描述**：v-for 缺少 :key：v-for="item in reasons"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`components\social\PostReportDialog.vue` 第 190 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\social\SocialProgressIndicator.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\social\SocialProgressIndicator.vue` 第 510 行
- **描述**：检测到 11 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 31 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 510 行: color: var(--c-secondary-blue-400, #5B7FFF); | 第 512 行: text-shadow: 0 2rpx 4rpx var(--c-secondary-blue-bg-tint-light, var(--c-secondary-blue-bg-tint-light, rgba(91, 127, 255,  | 第 518 行: color: var(--c-secondary-blue-400, #5B7FFF);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\social\SocialProgressIndicator.vue` 第 336 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.socialProgressTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\social\SocialProgressIndicator.vue` 第 337 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.socialProgressSubtitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`components\social\SocialProgressIndicator.vue` 第 654 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 性能
- **文件**：`components\social\SocialProgressIndicator.vue` 第 383 行
- **描述**：v-for 缺少 :key：v-for="(step, index) in steps"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\social\SocialProgressIndicator.vue` 第 383 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\social\WallPostCard.vue

### 1. [HIGH] 硬编码样式
- **文件**：`components\social\WallPostCard.vue` 第 229 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 229 行: background: var(--c-bg-hover, #f5f5f7); | 第 233 行: color: var(--c-text-quaternary, #9ca3af); | 第 317 行: color: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\social\WallPostCard.vue` 第 62 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'village.like'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\social\WallPostCard.vue` 第 63 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'village.comment'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`components\social\WallPostCard.vue` 第 260 行
- **描述**：存在 CSS Grid / grid 布局（共 1 处），示例：/* mp-weixin 不支持 display:grid，改用 Flexbox + width: calc 实现三列等宽布局 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 性能
- **文件**：`components\social\WallPostCard.vue` 第 142 行
- **描述**：v-for 缺少 :key：v-for="(img, idx) in images.slice(0, 3)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`components\social\WallPostCard.vue` 第 142 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## components\village\TopicSelector.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`components\village\TopicSelector.vue` 第 360 行
- **描述**：检测到 2 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 360 行: height: 60rpx; | 第 453 行: height: 72rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`components\village\TopicSelector.vue` 第 138 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'topicSelector.createTopicPlaceholder'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`components\village\TopicSelector.vue` 第 146 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'topicSelector.createTopicExists'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] UI/UX 一致性
- **文件**：`components\village\TopicSelector.vue` 第 214 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`components\village\TopicSelector.vue` 第 224 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('topicSelector.searchPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`components\village\TopicSelector.vue` 第 225 行
- **描述**：Mock/占位/未实现标记：placeholder-class="topic-selector__search-placeholder" aria-label="t('topicSelector.searchPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`components\village\TopicSelector.vue` 第 203 行
- **描述**：v-for 缺少 :key：v-for="topic in selectedTopics"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [HIGH] 性能
- **文件**：`components\village\TopicSelector.vue` 第 234 行
- **描述**：v-for 缺少 :key：v-for="topic in filteredTopics"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`components\village\TopicSelector.vue` 第 203 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\campus\certification.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\campus\certification.vue` 第 332 行
- **描述**：检测到 11 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 18 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 332 行: background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25))); | 第 338 行: background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4))); | 第 383 行: background: linear-gradient(135deg, var(--c-warning-bg-tint, #FEF9C3), var(--c-warning-bg-tint, #FEF3C7));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\certification.vue` 第 175 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\certification.vue` 第 177 行
- **描述**：<template> 中直接使用中文文案：<text class="cert-header__title">学生认证</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\campus\certification.vue` 第 314 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] UI/UX 一致性
- **文件**：`pages\campus\certification.vue` 第 86 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "选择图片失败", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\campus\certification.vue` 第 225 行
- **描述**：Mock/占位/未实现标记：placeholder="请输入你的学校全称" aria-label="请输入你的学校全称"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\campus\certification.vue` 第 235 行
- **描述**：Mock/占位/未实现标记：placeholder="请输入你的专业" aria-label="请输入你的专业"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## pages\campus\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\campus\index.vue` 第 212 行
- **描述**：检测到 32 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 42 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 212 行: $green-primary: var(--c-brand, #3FCF8E); | 第 213 行: $green-light: var(--c-brand-50, #E8F9F1); | 第 214 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\index.vue` 第 118 行
- **描述**：<template> 中直接使用中文文案：<text class="school-name">{{ certificationInfo?.schoolName || "广州大学" }}</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\index.vue` 第 130 行
- **描述**：<template> 中直接使用中文文案：<text class="cert-guide-card__title">完成学生认证，解锁校园专区</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\campus\index.vue` 第 228 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\campus\index.vue` 第 413 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 性能
- **文件**：`pages\campus\index.vue` 第 143 行
- **描述**：v-for 缺少 :key：v-for="tab in categoryTabs"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [HIGH] 性能
- **文件**：`pages\campus\index.vue` 第 171 行
- **描述**：v-for 缺少 :key：v-for="topic in topics"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\campus\index.vue` 第 143 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\campus\post-topic.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\campus\post-topic.vue` 第 283 行
- **描述**：检测到 30 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 28 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 283 行: $green-primary: var(--c-brand, #3FCF8E); | 第 284 行: $green-light: var(--c-brand-50, #E8F8F0); | 第 285 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\post-topic.vue` 第 176 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">取消</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\post-topic.vue` 第 178 行
- **描述**：<template> 中直接使用中文文案：<text class="post-header__title">发布话题</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\campus\post-topic.vue` 第 300 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] UI/UX 一致性
- **文件**：`pages\campus\post-topic.vue` 第 123 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "请输入标题", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\campus\post-topic.vue` 第 226 行
- **描述**：Mock/占位/未实现标记：placeholder="输入一个吸引人的标题"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\campus\post-topic.vue` 第 237 行
- **描述**：Mock/占位/未实现标记：placeholder="分享你的想法、经验或求助..."
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\campus\post-topic.vue` 第 197 行
- **描述**：v-for 缺少 :key：v-for="cat in categoryOptions.slice(0, 3)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\campus\post-topic.vue` 第 208 行
- **描述**：v-for 缺少 :key：v-for="cat in categoryOptions.slice(3, 6)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\campus\post-topic.vue` 第 197 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\campus\topic-detail.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\campus\topic-detail.vue` 第 252 行
- **描述**：检测到 26 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 35 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 252 行: $green-primary: var(--c-brand, #3FCF8E); | 第 253 行: $green-light: var(--c-brand-50, #E8F8F0); | 第 254 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\topic-detail.vue` 第 113 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\campus\topic-detail.vue` 第 115 行
- **描述**：<template> 中直接使用中文文案：<text class="detail-header__title">话题详情</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\campus\topic-detail.vue` 第 268 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\campus\topic-detail.vue` 第 470 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] UI/UX 一致性
- **文件**：`pages\campus\topic-detail.vue` 第 68 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "回复成功", icon: "success" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 7. [MEDIUM] UI/UX 一致性
- **文件**：`pages\campus\topic-detail.vue` 第 201 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\campus\topic-detail.vue` 第 224 行
- **描述**：Mock/占位/未实现标记：placeholder="写下你的回复..."
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\campus\topic-detail.vue` 第 172 行
- **描述**：v-for 缺少 :key：v-for="reply in replies"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\campus\topic-detail.vue` 第 172 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\chat-session\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\chat-session\index.vue` 第 1306 行
- **描述**：检测到 26 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 26 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 1306 行: border: 1rpx solid var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15))); | 第 1376 行: color: var(--c-text-secondary, #475569); | 第 1382 行: background: var(--c-error, #ef4444);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\chat-session\index.vue` 第 967 行
- **描述**：<template> 中直接使用中文文案：{{ tempCountdown === "已结束" ? "会话已结束" : "24小时临时聊天，双方身份匿名" }}
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\chat-session\index.vue` 第 972 行
- **描述**：<template> 中直接使用中文文案：<SectionCard v-if="isTempSession" title="会话状态" compact>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat-session\index.vue` 第 703 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.moreMenuSessionMissing'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 5. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat-session\index.vue` 第 707 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.moreMenuTempNotSupported'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 6. [LOW] 无障碍 (a11y)
- **文件**：`pages\chat-session\index.vue` 第 1397 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 7. [HIGH] UI/UX 一致性
- **文件**：`pages\chat-session\index.vue` 第 376 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "会话已结束，无法发送消息", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\chat-session\index.vue` 第 1104 行
- **描述**：Mock/占位/未实现标记：:placeholder="isSessionClosed ? '会话已结束' : (quoteReply ? '输入回复...' : '输入消息...')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\chat-session\index.vue` 第 991 行
- **描述**：v-for 缺少 :key：<template v-for="message in currentMessagesView" :key="message.id">
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\chat-session\index.vue` 第 991 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\chat\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\chat\index.vue` 第 278 行
- **描述**：检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 278 行: box-shadow: var(--s-sm); | 第 310 行: box-shadow: var(--s-card-soft); | 第 330 行: height: 1rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat\index.vue` 第 47 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.topicWeekend'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat\index.vue` 第 48 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chat.topicBook'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`pages\chat\index.vue` 第 201 行
- **描述**：Mock/占位/未实现标记：<view v-else class="conversation-item__avatar-placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\chat\index.vue` 第 353 行
- **描述**：Mock/占位/未实现标记：.conversation-item__avatar-placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 性能
- **文件**：`pages\chat\index.vue` 第 139 行
- **描述**：v-for 缺少 :key：v-for="(topic, index) in topicSuggestions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [HIGH] 性能
- **文件**：`pages\chat\index.vue` 第 186 行
- **描述**：v-for 缺少 :key：v-for="conv in privateSessions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\chat\index.vue` 第 139 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\chat\red-packet.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\chat\red-packet.vue` 第 319 行
- **描述**：检测到 36 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 26 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 319 行: background: linear-gradient(180deg, var(--c-romance-500, #EC4899) 0%, var(--c-romance-700, #BE185D) 100%); | 第 343 行: background: rgba(255, 255, 255, 0.18); | 第 349 行: /* 反色文字：使用 token 替代硬编码 #FFFFFF */
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat\red-packet.vue` 第 97 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chatRedPacket.formInvalid'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat\red-packet.vue` 第 110 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'chatRedPacket.sendSuccess'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`pages\chat\red-packet.vue` 第 197 行
- **描述**：Mock/占位/未实现标记：<view class="nav-bar__placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\chat\red-packet.vue` 第 221 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('chatRedPacket.amountPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## pages\chat\video-call.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\chat\video-call.vue` 第 479 行
- **描述**：检测到 20 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 11 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 479 行: /* 视频通话页面背景：使用深色 token 替代硬编码 #000000 */ | 第 497 行: background: var(--c-neutral-900, #1a1a2e); | 第 505 行: color: rgba(255, 255, 255, 0.3);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat\video-call.vue` 第 67 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'videoCall.waitingTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\chat\video-call.vue` 第 68 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'videoCall.incomingTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`pages\chat\video-call.vue` 第 50 行
- **描述**：Mock/占位/未实现标记：/** 推流地址（mock 模式为空，真实环境从信令服务器获取） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## pages\circle\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\circle\index.vue` 第 301 行
- **描述**：检测到 44 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 25 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 301 行: background: var(--c-bg-page, #F4F6FA); | 第 306 行: background: var(--c-bg-container, #FFFFFF); | 第 311 行: box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circle\index.vue` 第 183 行
- **描述**：<template> 中直接使用中文文案：<text class="circle-header__title">圈子</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circle\index.vue` 第 185 行
- **描述**：<template> 中直接使用中文文案：<text class="circle-header__publish-text">发布</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\circle\index.vue` 第 299 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\circle\index.vue` 第 507 行
- **描述**：存在 CSS Grid / grid 布局（共 1 处），示例：/* mp-weixin 不支持 display:grid，改用 Flexbox + 子元素 width: calc 实现自适应列布局 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [LOW] 无障碍 (a11y)
- **文件**：`pages\circle\index.vue` 第 367 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 7. [HIGH] UI/UX 一致性
- **文件**：`pages\circle\index.vue` 第 162 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "详情开发中", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\circle\index.vue` 第 162 行
- **描述**：Mock/占位/未实现标记：uni.showToast({ title: "详情开发中", icon: "none" });
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`pages\circle\index.vue` 第 173 行
- **描述**：Mock/占位/未实现标记：uni.showToast({ title: "分享功能开发中", icon: "none" });
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [HIGH] 性能
- **文件**：`pages\circle\index.vue` 第 201 行
- **描述**：v-for 缺少 :key：<view v-for="(post, index) in posts" :key="post.id" class="post-card" :style="{ animationDelay: index * 80 + 'ms' }" @ta
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [HIGH] 性能
- **文件**：`pages\circle\index.vue` 第 231 行
- **描述**：v-for 缺少 :key：v-for="(img, idx) in post.images.slice(0, 9)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 12. [MEDIUM] 性能
- **文件**：`pages\circle\index.vue` 第 201 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\circles\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\circles\index.vue` 第 281 行
- **描述**：检测到 2 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 24 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 281 行: background: var(--c-overlay-bg-light, var(--c-overlay-bg-light, rgba(255, 255, 255, 0.2))); | 第 310 行: color: var(--c-overlay-text-secondary, var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85))); | 第 188 行: padding: 80rpx 40rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\index.vue` 第 97 行
- **描述**：<template> 中直接使用中文文案：title="兴趣圈"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\index.vue` 第 105 行
- **描述**：<template> 中直接使用中文文案：empty-text="暂无兴趣圈"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`pages\circles\index.vue` 第 197 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 性能
- **文件**：`pages\circles\index.vue` 第 138 行
- **描述**：v-for 缺少 :key：v-for="(circle, index) in circles"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 6. [MEDIUM] 性能
- **文件**：`pages\circles\index.vue` 第 138 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\circles\post-topic.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\circles\post-topic.vue` 第 254 行
- **描述**：检测到 30 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 24 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 254 行: $green-primary: var(--c-brand, #3FCF8E); | 第 255 行: $green-light: var(--c-brand-50, #E8F8F0); | 第 256 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\post-topic.vue` 第 168 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\post-topic.vue` 第 170 行
- **描述**：<template> 中直接使用中文文案：<text class="post-header__title">发布话题</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\circles\post-topic.vue` 第 271 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] UI/UX 一致性
- **文件**：`pages\circles\post-topic.vue` 第 113 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "请输入标题", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\circles\post-topic.vue` 第 188 行
- **描述**：Mock/占位/未实现标记：placeholder="话题标题"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\circles\post-topic.vue` 第 198 行
- **描述**：Mock/占位/未实现标记：placeholder="分享你的想法..."
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\circles\post-topic.vue` 第 212 行
- **描述**：v-for 缺少 :key：v-for="(img, idx) in images"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`pages\circles\post-topic.vue` 第 212 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\circles\topic-detail.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\circles\topic-detail.vue` 第 359 行
- **描述**：检测到 3 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 23 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 359 行: background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25))); | 第 366 行: background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4))); | 第 731 行: box-shadow: 0 -4rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\topic-detail.vue` 第 191 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\topic-detail.vue` 第 193 行
- **描述**：<template> 中直接使用中文文案：<text class="detail-header__title">话题详情</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\circles\topic-detail.vue` 第 341 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\circles\topic-detail.vue` 第 549 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] UI/UX 一致性
- **文件**：`pages\circles\topic-detail.vue` 第 65 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "回复成功", icon: "success" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 7. [MEDIUM] UI/UX 一致性
- **文件**：`pages\circles\topic-detail.vue` 第 295 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\circles\topic-detail.vue` 第 151 行
- **描述**：Mock/占位/未实现标记：placeholderText: "请输入补充描述...",
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`pages\circles\topic-detail.vue` 第 318 行
- **描述**：Mock/占位/未实现标记：placeholder="写下你的回复..."
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [HIGH] 性能
- **文件**：`pages\circles\topic-detail.vue` 第 228 行
- **描述**：v-for 缺少 :key：v-for="(img, idx) in currentTopic.images"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [HIGH] 性能
- **文件**：`pages\circles\topic-detail.vue` 第 258 行
- **描述**：v-for 缺少 :key：v-for="reply in replies"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 12. [MEDIUM] 性能
- **文件**：`pages\circles\topic-detail.vue` 第 228 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\circles\topics.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\circles\topics.vue` 第 260 行
- **描述**：检测到 2 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 21 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 260 行: background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25))); | 第 267 行: background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4))); | 第 241 行: /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\topics.vue` 第 136 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\circles\topics.vue` 第 138 行
- **描述**：<template> 中直接使用中文文案：<text class="topics-header__title">{{ circleName || '话题列表' }}</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\circles\topics.vue` 第 241 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\circles\topics.vue` 第 304 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [MEDIUM] UI/UX 一致性
- **文件**：`pages\circles\topics.vue` 第 170 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 7. [HIGH] 性能
- **文件**：`pages\circles\topics.vue` 第 178 行
- **描述**：v-for 缺少 :key：v-for="topic in currentTopics"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\circles\topics.vue` 第 178 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\daily-question\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\daily-question\index.vue` 第 306 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 27 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 306 行: box-shadow: 0 8rpx 32rpx var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15))); | 第 318 行: background: radial-gradient(circle, var(--c-romance-bg-tint, var(--c-romance-bg-tint, rgba(236, 72, 153, 0.1))) 0%, tran | 第 470 行: background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-bg-tint, var(--c-brand-bg-tint, rgba(63, 207, 142, 
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\daily-question\index.vue` 第 69 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\daily-question\index.vue` 第 71 行
- **描述**：<template> 中直接使用中文文案：<text class="dq-header__title">每日一问</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\daily-question\index.vue` 第 188 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\daily-question\index.vue` 第 252 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] UI/UX 一致性
- **文件**：`pages\daily-question\index.vue` 第 38 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "回答成功", icon: "success" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 7. [MEDIUM] UI/UX 一致性
- **文件**：`pages\daily-question\index.vue` 第 172 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\daily-question\index.vue` 第 106 行
- **描述**：Mock/占位/未实现标记：placeholder="分享你的想法..."
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\daily-question\index.vue` 第 143 行
- **描述**：v-for 缺少 :key：v-for="answer in answers"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\daily-question\index.vue` 第 143 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\dev\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\dev\index.vue` 第 142 行
- **描述**：检测到 20 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 16 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 142 行: $green-primary: var(--c-brand, #3FCF8E); | 第 143 行: $green-light: var(--c-brand-50, #E8F8F0); | 第 144 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\dev\index.vue` 第 99 行
- **描述**：<template> 中直接使用中文文案：<text class="dev-header__title">DEV 开发者导航</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\dev\index.vue` 第 107 行
- **描述**：<template> 中直接使用中文文案：<text class="dev-notice__text">⚠️ 开发者模式 - 仅用于测试，上线前删除</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\dev\index.vue` 第 156 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 微信小程序兼容性
- **文件**：`pages\dev\index.vue` 第 207 行
- **描述**：存在 backdrop-filter 属性（共 1 处），示例：backdrop-filter: blur(10rpx);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [HIGH] 性能
- **文件**：`pages\dev\index.vue` 第 112 行
- **描述**：v-for 缺少 :key：v-for="(items, group) in grouped"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [HIGH] 性能
- **文件**：`pages\dev\index.vue` 第 119 行
- **描述**：v-for 缺少 :key：v-for="(item, idx) in items"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\dev\index.vue` 第 112 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\discover\history.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\discover\history.vue` 第 223 行
- **描述**：检测到 20 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 20 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 223 行: $green-primary: var(--c-brand, #3FCF8E); | 第 224 行: $green-light: var(--c-brand-50, #E8F9F1); | 第 225 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\discover\history.vue` 第 126 行
- **描述**：<template> 中直接使用中文文案：<text class="page-title">今日已看</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\discover\history.vue` 第 134 行
- **描述**：<template> 中直接使用中文文案：<text class="stat-label">已浏览</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\discover\history.vue` 第 238 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [MEDIUM] UI/UX 一致性
- **文件**：`pages\discover\history.vue` 第 214 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\discover\history.vue` 第 127 行
- **描述**：Mock/占位/未实现标记：<view class="header-placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\discover\history.vue` 第 292 行
- **描述**：Mock/占位/未实现标记：.header-placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\discover\history.vue` 第 164 行
- **描述**：v-for 缺少 :key：v-for="record in historyCards"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`pages\discover\history.vue` 第 164 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\discover\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\discover\index.vue` 第 908 行
- **描述**：检测到 30 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 56 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 908 行: background: radial-gradient(circle, var(--s-romance, var(--s-romance, rgba(236, 72, 153, 0.32))) 0%, var(--c-romance-bg- | 第 916 行: background: radial-gradient(circle, var(--c-brand-shadow-tint-mid, var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.2 | 第 924 行: background: radial-gradient(circle, var(--c-state-ongoing-bg, var(--c-state-ongoing-bg, rgba(255, 212, 121, 0.22))) 0%, 
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\discover\index.vue` 第 601 行
- **描述**：<template> 中直接使用中文文案：<!-- P2 修复（搜索框自动聚焦）：容器 @tap 触发 focusSearchInput，扩大可点击区域；
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\discover\index.vue` 第 116 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.partnerDefaultName'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] i18n 遗漏
- **文件**：`pages\discover\index.vue` 第 123 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'discover.matchSuccess'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\discover\index.vue` 第 872 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [HIGH] 微信小程序兼容性
- **文件**：`pages\discover\index.vue` 第 1042 行
- **描述**：存在 backdrop-filter 属性（共 4 处），示例：backdrop-filter: blur(10px);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 7. [LOW] 无障碍 (a11y)
- **文件**：`pages\discover\index.vue` 第 1301 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\discover\index.vue` 第 607 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('discover.searchPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`pages\discover\index.vue` 第 1288 行
- **描述**：Mock/占位/未实现标记：/* ========== 签到卡片骨架屏（loading 占位） ========== */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [MEDIUM] 性能
- **文件**：`pages\discover\index.vue` 第 854 行
- **描述**：<image> 未启用 lazy-load：<image class="match-overlay__avatar match-overlay__avatar--left" :src="myAvatar" mode="aspectFill" alt="" />
- **商业化影响**：页面首屏一次性加载全部图片，增加流量消耗与渲染时间，长列表卡顿明显。
- **修复方向**：为视口外/列表中的图片添加 lazy-load="true"；首屏关键图可豁免并加注释说明。

### 11. [HIGH] 性能
- **文件**：`pages\discover\index.vue` 第 544 行
- **描述**：v-for 缺少 :key：v-for="filter in filterOptions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 12. [HIGH] 性能
- **文件**：`pages\discover\index.vue` 第 578 行
- **描述**：v-for 缺少 :key：v-for="capsule in activeFilterCapsules"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 13. [MEDIUM] 性能
- **文件**：`pages\discover\index.vue` 第 544 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\discover\video-player.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\discover\video-player.vue` 第 250 行
- **描述**：检测到 12 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 10 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 250 行: /* 视频播放器背景：使用深色 token 替代硬编码 #000000 */ | 第 264 行: background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%); | 第 279 行: background: rgba(255, 255, 255, 0.12);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\discover\video-player.vue` 第 170 行
- **描述**：<template> 中直接使用中文文案：<text class="video-player__title">个人视频</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\discover\video-player.vue` 第 179 行
- **描述**：<template> 中直接使用中文文案：<text class="video-player__state-title">暂无视频</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [LOW] 无障碍 (a11y)
- **文件**：`pages\discover\video-player.vue` 第 380 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\discover\video-player.vue` 第 171 行
- **描述**：Mock/占位/未实现标记：<view class="video-player__topbar-placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\discover\video-player.vue` 第 296 行
- **描述**：Mock/占位/未实现标记：.video-player__topbar-placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## pages\feedback\history.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\feedback\history.vue` 第 375 行
- **描述**：检测到 6 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 9 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 375 行: border: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04)); | 第 389 行: color: var(--c-text-inverse, #ffffff); | 第 415 行: /* 反色文字：使用 token 替代硬编码 #ffffff */
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\feedback\history.vue` 第 318 行
- **描述**：<template> 中直接使用中文文案：<!-- 修复（严格模式 noUncheckedIndexedAccess）：detailCache[item.id] 索引访问返回 T | undefined，
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\feedback\history.vue` 第 105 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.networkError'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] i18n 遗漏
- **文件**：`pages\feedback\history.vue` 第 149 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'feedback.historyLoadFailed'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\feedback\history.vue` 第 332 行
- **描述**：存在 CSS Grid / grid 布局（共 2 处），示例：<view class="attachment-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [LOW] 无障碍 (a11y)
- **文件**：`pages\feedback\history.vue` 第 523 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 7. [MEDIUM] UI/UX 一致性
- **文件**：`pages\feedback\history.vue` 第 274 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 8. [HIGH] 性能
- **文件**：`pages\feedback\history.vue` 第 248 行
- **描述**：v-for 缺少 :key：v-for="opt in FILTER_OPTIONS"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\feedback\history.vue` 第 282 行
- **描述**：v-for 缺少 :key：v-for="item in filteredSubmissions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\feedback\history.vue` 第 248 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\heart-signals\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\heart-signals\index.vue` 第 281 行
- **描述**：检测到 16 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 281 行: /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */ | 第 295 行: height: 280rpx; | 第 329 行: box-shadow: var(--s-card-soft);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\heart-signals\index.vue` 第 131 行
- **描述**：<template> 中直接使用中文文案：page-name="心动信号"
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\heart-signals\index.vue` 第 141 行
- **描述**：<template> 中直接使用中文文案：<text class="page-header__title">心动信号</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\heart-signals\index.vue` 第 281 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\heart-signals\index.vue` 第 394 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] UI/UX 一致性
- **文件**：`pages\heart-signals\index.vue` 第 86 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "已接受心动信号，去聊天吧", icon: "success" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\heart-signals\index.vue` 第 217 行
- **描述**：Mock/占位/未实现标记：<view v-else class="signal-card__avatar-placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\heart-signals\index.vue` 第 261 行
- **描述**：Mock/占位/未实现标记：<view v-else class="signal-card__avatar-placeholder signal-card__avatar-placeholder--small">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\heart-signals\index.vue` 第 206 行
- **描述**：v-for 缺少 :key：v-for="signal in pendingSignals"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [HIGH] 性能
- **文件**：`pages\heart-signals\index.vue` 第 250 行
- **描述**：v-for 缺少 :key：v-for="signal in (activeTab === 'accepted' ? acceptedSignals : expiredSignals)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [MEDIUM] 性能
- **文件**：`pages\heart-signals\index.vue` 第 206 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\home\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\home\index.vue` 第 980 行
- **描述**：检测到 44 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 85 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 980 行: background: var(--c-overlay-white-text-mid, var(--c-overlay-white-text-mid, rgba(255,255,255,0.7))); | 第 985 行: background: var(--c-overlay-white-bg-most, var(--c-overlay-white-bg-most, rgba(255,255,255,0.96))); | 第 1013 行: background: var(--c-overlay-white-text-mid, var(--c-overlay-white-text-mid, rgba(255,255,255,0.7)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\home\index.vue` 第 119 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.scheduleLegendCourse'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\home\index.vue` 第 120 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'home.scheduleLegendActivity'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\home\index.vue` 第 889 行
- **描述**：存在 100vh 单位（共 2 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 微信小程序兼容性
- **文件**：`pages\home\index.vue` 第 981 行
- **描述**：存在 backdrop-filter 属性（共 4 处），示例：backdrop-filter: blur(10px);
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\home\index.vue` 第 484 行
- **描述**：存在 CSS Grid / grid 布局（共 4 处），示例：<view class="function-grid-card card-base">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 7. [LOW] 无障碍 (a11y)
- **文件**：`pages\home\index.vue` 第 2124 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\home\index.vue` 第 422 行
- **描述**：Mock/占位/未实现标记：<text class="search-placeholder">{{ t('home.searchPlaceholder') }}</text>
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`pages\home\index.vue` 第 619 行
- **描述**：Mock/占位/未实现标记：<view v-else class="activity-card__placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [HIGH] 性能
- **文件**：`pages\home\index.vue` 第 389 行
- **描述**：v-for 缺少 :key：v-for="school in schools"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [HIGH] 性能
- **文件**：`pages\home\index.vue` 第 605 行
- **描述**：v-for 缺少 :key：v-for="item in activityStore.activities.slice(0, 5)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 12. [MEDIUM] 性能
- **文件**：`pages\home\index.vue` 第 389 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\likes\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\likes\index.vue` 第 1079 行
- **描述**：检测到 8 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 26 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 1079 行: background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 20 | 第 1123 行: /* 反色文字：使用 token 替代硬编码 #ffffff */ | 第 1192 行: box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\likes\index.vue` 第 191 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'likes.batchEmpty'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\likes\index.vue` 第 201 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'likes.batchSuccess'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\likes\index.vue` 第 751 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\likes\index.vue` 第 830 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\likes\index.vue` 第 447 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('likes.searchPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\likes\index.vue` 第 523 行
- **描述**：Mock/占位/未实现标记：<view v-else class="likes-card__avatar-placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\likes\index.vue` 第 494 行
- **描述**：v-for 缺少 :key：v-for="(item, idx) in displayLikedBy"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\likes\index.vue` 第 561 行
- **描述**：v-for 缺少 :key：v-for="(item, idx) in displayLikes"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\likes\index.vue` 第 494 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\login\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\login\index.vue` 第 575 行
- **描述**：检测到 4 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 18 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 575 行: background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%); | 第 673 行: background: rgba(255, 255, 255, 0.25); | 第 927 行: /* Apple 品牌黑色：使用深色 token 替代硬编码 #000000 */
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\login\index.vue` 第 399 行
- **描述**：<template> 中直接使用中文文案：<text class="btn-icon-wechat">微</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\login\index.vue` 第 86 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.heroTitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] i18n 遗漏
- **文件**：`pages\login\index.vue` 第 87 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'login.heroSubtitle'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\login\index.vue` 第 541 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\login\index.vue` 第 422 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('login.phonePlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\login\index.vue` 第 423 行
- **描述**：Mock/占位/未实现标记：placeholder-class="input-placeholder"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## pages\messages\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\messages\index.vue` 第 923 行
- **描述**：检测到 11 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 47 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 923 行: color: var(--c-brand-500, #3FCF8E); | 第 967 行: box-shadow: 0 var(--sp-2) var(--sp-5) var(--s-action-super, var(--s-action-super, rgba(59, 130, 246, 0.3))); | 第 972 行: box-shadow: 0 var(--sp-2) var(--sp-5) var(--c-tag-match-to, var(--c-tag-match-to, rgba(249, 115, 22, 0.3)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\messages\index.vue` 第 78 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'messages.private'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\messages\index.vue` 第 79 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'messages.systemNotifications'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\messages\index.vue` 第 821 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\messages\index.vue` 第 1038 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\messages\index.vue` 第 530 行
- **描述**：Mock/占位/未实现标记：<text class="search-bar__placeholder">{{ t('messages.search') }}</text>
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\messages\index.vue` 第 907 行
- **描述**：Mock/占位/未实现标记：.search-bar__placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\messages\index.vue` 第 572 行
- **描述**：v-for 缺少 :key：v-for="signal in messagesStore.pendingHeartSignals"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\messages\index.vue` 第 670 行
- **描述**：v-for 缺少 :key：v-for="(session, index) in privateSessionList"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\messages\index.vue` 第 572 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\profile\album.vue

### 1. [MEDIUM] 硬编码样式
- **文件**：`pages\profile\album.vue` 第 471 行
- **描述**：检测到 6 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 5 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 471 行: /* 反色文字：使用 token 替代硬编码 #ffffff */ | 第 513 行: /* 反色文字：使用 token 替代硬编码 #ffffff */ | 第 577 行: background: rgba(0, 0, 0, 0.45);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\profile\album.vue` 第 104 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'common.networkError'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\profile\album.vue` 第 158 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.noPhotoSelected'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\profile\album.vue` 第 420 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\profile\album.vue` 第 364 行
- **描述**：存在 CSS Grid / grid 布局（共 3 处），示例：<view v-else class="album-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [LOW] 无障碍 (a11y)
- **文件**：`pages\profile\album.vue` 第 592 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 7. [MEDIUM] UI/UX 一致性
- **文件**：`pages\profile\album.vue` 第 345 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\profile\album.vue` 第 392 行
- **描述**：Mock/占位/未实现标记：<view v-if="!cell.filled" class="album-cell__placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`pages\profile\album.vue` 第 553 行
- **描述**：Mock/占位/未实现标记：.album-cell__placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [HIGH] 性能
- **文件**：`pages\profile\album.vue` 第 366 行
- **描述**：v-for 缺少 :key：v-for="cell in photoCells"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [MEDIUM] 性能
- **文件**：`pages\profile\album.vue` 第 366 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\profile\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\profile\index.vue` 第 1270 行
- **描述**：检测到 15 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 47 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 1270 行: background: linear-gradient(180deg, var(--c-brand-border-tint-stronger, var(--c-brand-border-tint-stronger, rgba(63, 207 | 第 1284 行: background: var(--c-overlay-mid, var(--c-overlay-mid, rgba(15, 23, 42, 0.55))); | 第 1290 行: background: var(--c-overlay-strong, var(--c-overlay-strong, rgba(15, 23, 42, 0.7)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\profile\index.vue` 第 261 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.following'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\profile\index.vue` 第 262 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.followers'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [CRITICAL] 微信小程序兼容性
- **文件**：`pages\profile\index.vue` 第 737 行
- **描述**：存在 import.meta 语法（共 1 处），示例：const v = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_VERSION;
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\profile\index.vue` 第 979 行
- **描述**：存在 CSS Grid / grid 布局（共 3 处），示例：<view class="photo-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [LOW] 无障碍 (a11y)
- **文件**：`pages\profile\index.vue` 第 1312 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\profile\index.vue` 第 1223 行
- **描述**：Mock/占位/未实现标记：/* ==================== 安全区占位 ==================== */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\profile\index.vue` 第 895 行
- **描述**：v-for 缺少 :key：v-for="(stat, index) in stats"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\profile\index.vue` 第 981 行
- **描述**：v-for 缺少 :key：v-for="cell in photoCells"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\profile\index.vue` 第 895 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\profile\visitors.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\profile\visitors.vue` 第 389 行
- **描述**：检测到 1 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 8 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 389 行: /* 反色文字：使用 token 替代硬编码 #ffffff */ | 第 311 行: /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */ | 第 406 行: width: 120rpx;
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\profile\visitors.vue` 第 127 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.visitorYesterday'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\profile\visitors.vue` 第 137 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'profile.visitorToday'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\profile\visitors.vue` 第 311 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\profile\visitors.vue` 第 354 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [MEDIUM] UI/UX 一致性
- **文件**：`pages\profile\visitors.vue` 第 254 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\profile\visitors.vue` 第 154 行
- **描述**：Mock/占位/未实现标记：if (appEnv.apiMode === "mock") {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\profile\visitors.vue` 第 289 行
- **描述**：Mock/占位/未实现标记：<view v-else class="visitors-card__avatar-placeholder">
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\profile\visitors.vue` 第 267 行
- **描述**：v-for 缺少 :key：v-for="group in groupedVisitors"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [HIGH] 性能
- **文件**：`pages\profile\visitors.vue` 第 274 行
- **描述**：v-for 缺少 :key：v-for="(item, idx) in group.items"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [MEDIUM] 性能
- **文件**：`pages\profile\visitors.vue` 第 267 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\settings\dnd.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\settings\dnd.vue` 第 487 行
- **描述**：检测到 37 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 26 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 487 行: var(--c-bg-page, #f8fafc) 0%, | 第 488 行: var(--c-tint-blue-50, #eef2ff) 100% | 第 501 行: background: var(--c-bg-container, #ffffff);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\settings\dnd.vue` 第 53 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'dnd.repeatEveryday'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\settings\dnd.vue` 第 54 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'dnd.repeatWeekdays'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\settings\dnd.vue` 第 423 行
- **描述**：存在 CSS Grid / grid 布局（共 3 处），示例：<view class="weekday-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\settings\dnd.vue` 第 568 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\settings\dnd.vue` 第 304 行
- **描述**：Mock/占位/未实现标记：<view class="nav-bar__placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\settings\dnd.vue` 第 534 行
- **描述**：Mock/占位/未实现标记：.nav-bar__placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\settings\dnd.vue` 第 400 行
- **描述**：v-for 缺少 :key：v-for="(option, index) in repeatModeOptions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\settings\dnd.vue` 第 425 行
- **描述**：v-for 缺少 :key：v-for="day in weekdayOptions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\settings\dnd.vue` 第 400 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\settings\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\settings\index.vue` 第 537 行
- **描述**：检测到 26 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 16 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 537 行: background: linear-gradient(180deg, var(--c-bg-page, #f8fafc) 0%, var(--c-tint-blue-50, #eef2ff) 100%); | 第 549 行: background: var(--c-bg-container, #FFFFFF); | 第 550 行: box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\settings\index.vue` 第 97 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'settings.notifyEnabled'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\settings\index.vue` 第 97 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'settings.notifyDisabled'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`pages\settings\index.vue` 第 49 行
- **描述**：Mock/占位/未实现标记：/** 缓存大小（mock） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\settings\index.vue` 第 359 行
- **描述**：Mock/占位/未实现标记：<view class="nav-bar__placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 性能
- **文件**：`pages\settings\index.vue` 第 372 行
- **描述**：v-for 缺少 :key：v-for="(item, index) in accountMenus"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [HIGH] 性能
- **文件**：`pages\settings\index.vue` 第 497 行
- **描述**：v-for 缺少 :key：v-for="(item, index) in aboutMenus"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\settings\index.vue` 第 372 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\shop\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\shop\index.vue` 第 157 行
- **描述**：检测到 19 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 12 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 157 行: $green-primary: var(--c-brand, #3FCF8E); | 第 158 行: $green-light: var(--c-brand-50, #E8F9F1); | 第 159 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\shop\index.vue` 第 100 行
- **描述**：<template> 中直接使用中文文案：<text class="shop-header__title">逛逛</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\shop\index.vue` 第 145 行
- **描述**：<template> 中直接使用中文文案：<text class="shop-card__sales">已售 {{ item.sales }}</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\shop\index.vue` 第 174 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\shop\index.vue` 第 124 行
- **描述**：存在 CSS Grid / grid 布局（共 2 处），示例：<view class="shop-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [HIGH] 性能
- **文件**：`pages\shop\index.vue` 第 108 行
- **描述**：v-for 缺少 :key：v-for="cat in categories"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 7. [HIGH] 性能
- **文件**：`pages\shop\index.vue` 第 126 行
- **描述**：v-for 缺少 :key：v-for="item in filteredItems"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\shop\index.vue` 第 108 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\verification\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\verification\index.vue` 第 405 行
- **描述**：检测到 46 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 37 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 405 行: background: linear-gradient(180deg, var(--c-bg-page, #f8fafc) 0%, var(--c-tint-blue-50, #eef2ff) 100%); | 第 418 行: background: var(--c-bg-container, #FFFFFF); | 第 419 行: box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\verification\index.vue` 第 219 行
- **描述**：<template> 中直接使用中文文案：<text class="nav-bar__title">恋爱认证</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\verification\index.vue` 第 240 行
- **描述**：<template> 中直接使用中文文案：<text class="section__title-text">认证权益</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\verification\index.vue` 第 242 行
- **描述**：存在 CSS Grid / grid 布局（共 3 处），示例：<view class="benefits-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] UI/UX 一致性
- **文件**：`pages\verification\index.vue` 第 126 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "请输入学生姓名", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 6. [MEDIUM] UI/UX 一致性
- **文件**：`pages\verification\index.vue` 第 365 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\verification\index.vue` 第 17 行
- **描述**：Mock/占位/未实现标记：/** 当前认证状态（mock 模式默认 verified） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\verification\index.vue` 第 171 行
- **描述**：Mock/占位/未实现标记：/** 模拟审核通过（mock 模式演示用） */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\verification\index.vue` 第 244 行
- **描述**：v-for 缺少 :key：v-for="(item, index) in benefits"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [HIGH] 性能
- **文件**：`pages\verification\index.vue` 第 287 行
- **描述**：v-for 缺少 :key：v-for="(item, index) in benefits"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [MEDIUM] 性能
- **文件**：`pages\verification\index.vue` 第 244 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\village\detail.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\village\detail.vue` 第 807 行
- **描述**：检测到 58 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 81 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 807 行: $green-primary: var(--c-brand, #3FCF8E); | 第 808 行: $green-light: var(--c-brand-50, #E8F9F1); | 第 809 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\detail.vue` 第 416 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\detail.vue` 第 418 行
- **描述**：<template> 中直接使用中文文案：<text class="detail-header__title">帖子详情</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\village\detail.vue` 第 824 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\village\detail.vue` 第 1491 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] UI/UX 一致性
- **文件**：`pages\village\detail.vue` 第 126 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "复制失败，请重试", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 7. [MEDIUM] UI/UX 一致性
- **文件**：`pages\village\detail.vue` 第 595 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\village\detail.vue` 第 69 行
- **描述**：Mock/占位/未实现标记：/** SubTask 5.5.2：判断图片是否已失败，用于模板 v-if 切换占位元素 */
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 功能空壳 / Mock
- **文件**：`pages\village\detail.vue` 第 165 行
- **描述**：Mock/占位/未实现标记：placeholderText: "请输入补充描述...",
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 10. [HIGH] 性能
- **文件**：`pages\village\detail.vue` 第 476 行
- **描述**：v-for 缺少 :key：v-for="interest in currentPost.author.interests"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [HIGH] 性能
- **文件**：`pages\village\detail.vue` 第 511 行
- **描述**：v-for 缺少 :key：v-for="(img, idx) in currentPost.images"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 12. [MEDIUM] 性能
- **文件**：`pages\village\detail.vue` 第 476 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\village\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\village\index.vue` 第 747 行
- **描述**：检测到 2 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 37 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 747 行: color: var(--c-overlay-text-secondary, var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85))); | 第 922 行: border: 2rpx solid var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15))); | 第 654 行: box-shadow: var(--s-sm);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\index.vue` 第 447 行
- **描述**：<template> 中直接使用中文文案：<!-- ===== 帖子列表 =====
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\village\index.vue` 第 70 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'village.categoryAll'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] i18n 遗漏
- **文件**：`pages\village\index.vue` 第 71 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'village.categoryFollowing'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\village\index.vue` 第 1059 行
- **描述**：存在 CSS Grid / grid 布局（共 1 处），示例：/* mp-weixin 不支持 display:grid，改用 Flexbox + 子元素 width: calc 实现自适应列布局 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [LOW] 无障碍 (a11y)
- **文件**：`pages\village\index.vue` 第 775 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 7. [HIGH] 性能
- **文件**：`pages\village\index.vue` 第 478 行
- **描述**：v-for 缺少 :key：v-for="post in displayPosts"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [HIGH] 性能
- **文件**：`pages\village\index.vue` 第 536 行
- **描述**：v-for 缺少 :key：v-for="(img, idx) in post.images.slice(0, 9)"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`pages\village\index.vue` 第 478 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\village\post.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\village\post.vue` 第 571 行
- **描述**：检测到 26 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 29 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 571 行: $green-primary: var(--c-brand, #3FCF8E); | 第 572 行: $green-light: var(--c-tint-green-50, #E8F9F4); | 第 573 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\post.vue` 第 444 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\post.vue` 第 446 行
- **描述**：<template> 中直接使用中文文案：<text class="post-header__title">发布帖子</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\village\post.vue` 第 586 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\village\post.vue` 第 514 行
- **描述**：存在 CSS Grid / grid 布局（共 2 处），示例：<view class="images-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 6. [HIGH] UI/UX 一致性
- **文件**：`pages\village\post.vue` 第 362 行
- **描述**：uni.showToast 直接使用中文文案：uni.showToast({ title: "标签已存在", icon: "none" });
- **商业化影响**：提示文案无法国际化，且散落在业务代码中导致 Toast 风格/文案不统一。
- **修复方向**：Toast 文案统一走 i18n key，并由通用反馈组件封装。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\village\post.vue` 第 113 行
- **描述**：Mock/占位/未实现标记：if (appEnv.apiMode === "mock") {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 功能空壳 / Mock
- **文件**：`pages\village\post.vue` 第 477 行
- **描述**：Mock/占位/未实现标记：placeholder="分享你的故事、心情或寻找那个TA..."
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 9. [HIGH] 性能
- **文件**：`pages\village\post.vue` 第 461 行
- **描述**：v-for 缺少 :key：v-for="cat in categoryOptions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [HIGH] 性能
- **文件**：`pages\village\post.vue` 第 495 行
- **描述**：v-for 缺少 :key：v-for="tag in presetTags"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 11. [MEDIUM] 性能
- **文件**：`pages\village\post.vue` 第 461 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\village\tag-posts.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\village\tag-posts.vue` 第 347 行
- **描述**：检测到 19 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 20 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 347 行: $green-primary: var(--c-brand, #3FCF8E); | 第 348 行: $green-light: var(--c-tint-green-50, #E8F9F4); | 第 349 行: $pink-primary: var(--c-romance-500, #EC4899);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\tag-posts.vue` 第 235 行
- **描述**：<template> 中直接使用中文文案：<text class="back-icon">返回</text>
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 3. [HIGH] 硬编码中文 / i18n 遗漏
- **文件**：`pages\village\tag-posts.vue` 第 252 行
- **描述**：<template> 中直接使用中文文案：<view class="loading-spinner" role="status" aria-live="polite" aria-label="加载中" />
- **商业化影响**：无法支持多语言切换，海外/港澳台用户看到中文，且运营文案调整需改代码。
- **修复方向**：将文案抽取到 i18n locale 文件，模板中改用 t('xxx') / $t('xxx')。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\village\tag-posts.vue` 第 363 行
- **描述**：存在 100vh 单位（共 1 处），示例：/* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [LOW] 无障碍 (a11y)
- **文件**：`pages\village\tag-posts.vue` 第 423 行
- **描述**：文件包含 CSS 动画但未提供 prefers-reduced-motion 媒体查询回退。
- **商业化影响**：对前庭功能障碍用户可能造成不适，且不符合无障碍最佳实践。
- **修复方向**：在 <style> 中追加 @media (prefers-reduced-motion: reduce) { ... } 关闭或减弱动画。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\village\tag-posts.vue` 第 73 行
- **描述**：Mock/占位/未实现标记：if (appEnv.apiMode === "mock") {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 功能空壳 / Mock
- **文件**：`pages\village\tag-posts.vue` 第 76 行
- **描述**：Mock/占位/未实现标记：const mockTagPosts = getMockTagPosts(tagName.value);
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 8. [HIGH] 性能
- **文件**：`pages\village\tag-posts.vue` 第 274 行
- **描述**：v-for 缺少 :key：v-for="post in posts"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [HIGH] 性能
- **文件**：`pages\village\tag-posts.vue` 第 309 行
- **描述**：v-for 缺少 :key：v-for="tag in post.tags"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 10. [MEDIUM] 性能
- **文件**：`pages\village\tag-posts.vue` 第 274 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\vip\bills.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\vip\bills.vue` 第 250 行
- **描述**：检测到 42 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 19 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 250 行: background: var(--c-bg-base, #F8FAFC); | 第 263 行: /* 容器背景：使用 token 替代硬编码 #FFFFFF */ | 第 265 行: border-bottom: 1rpx solid var(--c-border-light, #E2E8F0);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\bills.vue` 第 29 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.billsFilterAll'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\bills.vue` 第 30 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.billsFilterSubscribe'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] UI/UX 一致性
- **文件**：`pages\vip\bills.vue` 第 177 行
- **描述**：页面使用内联空状态样式（empty class），未复用 EmptyState/ErrorState/PageStateContainer 组件。
- **商业化影响**：空状态/错误状态视觉不统一，增加维护成本，易造成品牌感割裂。
- **修复方向**：统一使用项目内的 EmptyState / ErrorState / PageStateContainer 组件。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\bills.vue` 第 143 行
- **描述**：Mock/占位/未实现标记：<view class="nav-bar__placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\bills.vue` 第 290 行
- **描述**：Mock/占位/未实现标记：.nav-bar__placeholder {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`pages\vip\bills.vue` 第 161 行
- **描述**：v-for 缺少 :key：v-for="opt in filterOptions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [HIGH] 性能
- **文件**：`pages\vip\bills.vue` 第 189 行
- **描述**：v-for 缺少 :key：v-for="bill in filteredBills"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`pages\vip\bills.vue` 第 161 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\vip\index.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\vip\index.vue` 第 482 行
- **描述**：检测到 56 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 34 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 482 行: background: linear-gradient(180deg, var(--c-neutral-800, #1a1a2e) 0%, var(--c-neutral-800, #16213e) 100%); | 第 509 行: background: var(--c-overlay-white-bg-tint-mid, var(--c-overlay-white-bg-tint-mid, rgba(255, 255, 255, 0.1))); | 第 516 行: color: var(--c-text-inverse, #FFFFFF);
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\index.vue` 第 50 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.benefitSeeLikes'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\index.vue` 第 50 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.benefitSeeLikesDesc'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\vip\index.vue` 第 313 行
- **描述**：存在 CSS Grid / grid 布局（共 4 处），示例：<view class="benefits-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\index.vue` 第 36 行
- **描述**：Mock/占位/未实现标记：let mockPaymentTimer: ReturnType<typeof setTimeout> | null = null;
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\index.vue` 第 42 行
- **描述**：Mock/占位/未实现标记：if (mockPaymentTimer) {
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`pages\vip\index.vue` 第 315 行
- **描述**：v-for 缺少 :key：v-for="(item, index) in benefits"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [HIGH] 性能
- **文件**：`pages\vip\index.vue` 第 346 行
- **描述**：v-for 缺少 :key：v-for="plan in plans"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 9. [MEDIUM] 性能
- **文件**：`pages\vip\index.vue` 第 315 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。

## pages\vip\promo-code.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\vip\promo-code.vue` 第 315 行
- **描述**：检测到 37 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 26 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 315 行: background: linear-gradient(180deg, var(--c-gold, #FFD700) 0%, var(--c-accent-400, #FFA500) 100%); | 第 339 行: background: rgba(255, 255, 255, 0.18); | 第 345 行: /* 反色文字：使用 token 替代硬编码 #FFFFFF */
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\promo-code.vue` 第 73 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.promoCodeEmpty'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\promo-code.vue` 第 77 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.promoCodeAmountInvalid'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\promo-code.vue` 第 161 行
- **描述**：Mock/占位/未实现标记：<view class="nav-bar__placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\promo-code.vue` 第 183 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('vip.promoCodeInputPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

## pages\vip\red-packet.vue

### 1. [HIGH] 硬编码样式
- **文件**：`pages\vip\red-packet.vue` 第 354 行
- **描述**：检测到 44 处硬编码色值/渐变回退色（#hex、rgb/rgba/hsl）；检测到 27 行直接使用 rpx/100vh 的尺寸、圆角、阴影。 示例：第 354 行: background: linear-gradient(180deg, var(--c-romance-500, #EC4899) 0%, var(--c-romance-700, #BE185D) 100%); | 第 378 行: background: rgba(255, 255, 255, 0.18); | 第 384 行: /* 反色文字：使用 token 替代硬编码 #FFFFFF */
- **商业化影响**：视觉主题无法通过设计 token 统一收敛，后续品牌换肤/暗黑模式适配成本高，且容易与微信小程序样式表现不一致。
- **修复方向**：将色值、尺寸、圆角、阴影收敛到 tokens 变量（如 var(--c-brand)、var(--fs-md)、var(--r-lg)、var(--s-card)），移除 100vh 等兼容性差的单位。

### 2. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\red-packet.vue` 第 40 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.redPacketTypeNormal'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 3. [MEDIUM] i18n 遗漏
- **文件**：`pages\vip\red-packet.vue` 第 40 行
- **描述**：使用了未在 zh-CN.ts 中定义的 i18n key：'vip.redPacketTypeNormalDesc'
- **商业化影响**：运行时可能回退到 key 本身，导致用户看到英文 key 或空字符串。
- **修复方向**：在 zh-CN.ts 与 en-US.ts 中补充该 key 的翻译，并保持两侧结构一致。

### 4. [MEDIUM] 微信小程序兼容性
- **文件**：`pages\vip\red-packet.vue` 第 213 行
- **描述**：存在 CSS Grid / grid 布局（共 2 处），示例：<view class="type-grid">
- **商业化影响**：在 mp-weixin 基础库上可能引发编译失败、样式失效或运行时异常，影响小程序发布。
- **修复方向**：使用条件编译（#ifdef H5 / #ifndef MP-WEIXIN）包裹，或改用小程序支持的 hover-class、padding-top 百分比、position: sticky 回退等方案。

### 5. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\red-packet.vue` 第 194 行
- **描述**：Mock/占位/未实现标记：<view class="nav-bar__placeholder" />
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 6. [HIGH] 功能空壳 / Mock
- **文件**：`pages\vip\red-packet.vue` 第 239 行
- **描述**：Mock/占位/未实现标记：:placeholder="t('vip.redPacketAmountPlaceholder')"
- **商业化影响**：功能未真正闭环，上线后可能暴露为白屏、报错或体验断层，影响用户留存与商业化转化。
- **修复方向**：移除占位逻辑，接入真实 API；如必须保留，请补充功能开关与降级方案，并明确排期。

### 7. [HIGH] 性能
- **文件**：`pages\vip\red-packet.vue` 第 215 行
- **描述**：v-for 缺少 :key：v-for="opt in typeOptions"
- **商业化影响**：列表项更新时 Vue 无法高效复用 DOM，导致重复渲染、状态错乱、动画异常。
- **修复方向**：为 v-for 提供稳定唯一的 :key（如 item.id）。

### 8. [MEDIUM] 性能
- **文件**：`pages\vip\red-packet.vue` 第 215 行
- **描述**：存在 v-for 列表但未使用 VirtualList 组件进行虚拟滚动。
- **商业化影响**：数据量增大后节点数量线性增长，低端机容易出现滚动卡顿、内存占用高。
- **修复方向**：对可能超过 20 条的长列表使用 VirtualList 或分页加载。
