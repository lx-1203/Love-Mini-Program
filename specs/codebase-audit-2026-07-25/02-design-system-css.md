# 02-design-system-css.md

## Category: 设计系统 CSS 违规

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| HIGH    | 52   | 硬编码 hex 颜色值，缺少 CSS 变量 |
| MEDIUM  | 63   | 错误单位使用、非常规 border-radius、硬编码阴影 |
| LOW     | 32   | 间距不一致、字体大小硬编码 |
| **总计** | **147** | 42 个 Vue 组件文件 |

---

## 审计范围

对 `apps/client/src/` 下 42 个 Vue 组件文件进行了设计系统合规性审计，检查以下维度：

1. 颜色值是否使用 CSS 自定义属性（`var(--c-*)`）
2. 间距是否使用设计系统尺度（`var(--spacing-*)`）
3. border-radius 是否符合设计尺度规范
4. box-shadow 是否使用设计令牌
5. 字体大小是否使用语义化变量
6. 断点/响应式是否使用项目定义的标准

---

## Top 15 关键发现

### 1. TabBar.vue — 27 处违规 (HIGH)
**文件:** `apps/client/src/components/layout/TabBar.vue`

- **硬编码颜色 (18 处):** 包括 `#333333`、`#999999`、`#FF6B9D`（活跃图标色）、`#ffffff`（背景）、`#f0f0f0`（分割线）
- **硬编码阴影 (4 处):** `box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05)` 与其他组件的阴影风格不一致
- **硬编码字号 (5 处):** `font-size: 24rpx`、`font-size: 20rpx` 未使用语义化变量
- **影响:** 所有页面底部的 TabBar 是用户最常接触的 UI 元素，其主题色 `#FF6B9D` 在多处重复

**建议修复:**
```css
/* 错误 */
.active-tab { color: #FF6B9D; }
/* 正确 */
.active-tab { color: var(--c-primary); }
```

### 2. IcebreakerSuggestions.vue — 18 处违规 (HIGH)
**文件:** `apps/client/src/components/chat/IcebreakerSuggestions.vue`

- **button 颜色 (8 处):** `background: #FF6B9D`、`color: #fff`、`border: 1px solid #eee`
- **卡片背景 (4 处):** `background: #F8F8F8`、`background: rgba(255,107,157,0.08)`
- **文字颜色 (6 处):** `color: #666`、`color: #999`、`color: #333`
- **影响:** 用户进入聊天页面时看到的首屏元素，品牌色不一致会削弱品牌认知

### 3. UnlockGuideModal.vue — 10 处违规 (MEDIUM)
**文件:** `apps/client/src/components/UnlockGuideModal.vue`

- **遮罩层:** `background: rgba(0, 0, 0, 0.6)` 应使用 `var(--c-overlay)`
- **卡片背景:** `background: #ffffff` 应使用 `var(--c-bg-primary)`
- **按钮渐变:** `background: linear-gradient(135deg, #FF6B9D, #C44569)` 硬编码品牌渐变
- **文字颜色:** `color: #333`、`color: #666` 应使用语义化颜色变量
- **分隔线:** `border-bottom: 1px solid #e5e5e5` 应使用 `var(--c-border)`
- **圆角:** `border-radius: 16rpx`、`border-radius: 40rpx` 是否在尺度范围内待确认

### 4. color: #fff 硬编码模式 (HIGH — 12+ 文件)
**模式:** 至少 12 个组件文件使用 `color: #fff` 而非 `var(--c-text-inverse)`

| 文件 | 出现次数 |
|------|---------|
| `CardDetailOverlay.vue` | 3 |
| `HeartSignal.vue` | 2 |
| `LockScreen.vue` | 2 |
| `LongPressMenu.vue` | 1 |
| `ActivityCard.vue` | 2 |
| `HomeHeader.vue` | 2 |
| `AppShell.vue` | 1 |
| `LoginIllustration.vue` | 1 |
| `CardSwiper.vue` | 2 |
| `HeartParticles.vue` | 1 |
| `chat/index.vue` | 1 |
| `chat-session/index.vue` | 1 |

**风险:** 如果设计系统的主色调、背景色或文字颜色发生变化，所有这些硬编码位置都需要手动修改，极易出现遗漏。

### 5. box-shadow 硬编码分散 (MEDIUM — Widespread)
**模式:** 整个项目中 box-shadow 值不一致，缺乏统一的设计令牌

常见的几种 box-shadow 模式（彼此不一致）：
- `0 -2rpx 10rpx rgba(0,0,0,0.05)` — TabBar
- `0 4rpx 20rpx rgba(0,0,0,0.08)` — 卡片组件
- `0 2rpx 12rpx rgba(0,0,0,0.06)` — 模态框
- `0 8rpx 24rpx rgba(0,0,0,0.12)` — 浮动按钮
- `box-shadow: 0 0 20rpx rgba(255,107,157,0.3)` — 品牌色光晕

**风险:** 视觉效果不一致；无法通过更改一个变量来全局调整阴影风格。

### 6. border-radius 不在设计尺度内 (MEDIUM — 15+ 文件)
**模式:** 项目使用了多种 border-radius 值，部分可能不在设计系统的预定义尺度中

发现的值：
- `4rpx`, `6rpx`, `8rpx`, `10rpx`, `12rpx`, `14rpx`, `16rpx`, `20rpx`, `24rpx`, `32rpx`, `40rpx`, `50rpx`

如果设计系统只定义了 4 个尺度（如 `sm`/`md`/`lg`/`xl`），那么大部分值都是违规的。

### 7. HeartSignal.vue — 动画颜色硬编码 (HIGH)
**文件:** `apps/client/src/components/chat/HeartSignal.vue`

- 心跳动画中的关键帧颜色 `#FF6B9D` 硬编码（3 处）
- 动态计算的粒子颜色使用 RGB 拼接，但基数颜色硬编码
- `background: rgba(255, 107, 157, 0.3)` 在多个动画状态中出现
- **影响:** 品牌色变更时需要修改动画关键帧，而关键帧不支持 CSS 变量（部分浏览器兼容性问题）

### 8. LockScreen.vue — 全屏锁定页面 (MEDIUM)
**文件:** `apps/client/src/components/common/LockScreen.vue`

- `background: linear-gradient(180deg, #FF6B9D 0%, #FF8E8E 100%)` — 渐变硬编码
- `color: #ffffff` — 文字颜色
- `background: rgba(255, 255, 255, 0.2)` — 半透明按钮
- `border: 1px solid rgba(255, 255, 255, 0.3)` — 边框
- **影响:** 这是用户解锁前看到的全屏页面，视觉效果对第一印象至关重要

### 9. CardSwiper.vue — 卡片滑动主界面 (MEDIUM)
**文件:** `apps/client/src/components/discover/CardSwiper.vue`

- 卡片阴影: `box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08)`
- 标签颜色: `background: #FF6B9D`、`background: #6BCB77`、`background: #4D96FF`
- 文字叠加: `background: linear-gradient(0deg, rgba(0,0,0,0.6), transparent)`
- **建议:** 标签颜色应有语义（primary/success/info），而非直接用颜色值

### 10. CardDetailOverlay.vue — 详情浮层 (MEDIUM)
**文件:** `apps/client/src/components/discover/CardDetailOverlay.vue`

- 标签页指示符: `background: #FF6B9D`
- 信息行背景: `background: #F8F8F8`
- 分割线: `border-bottom: 1rpx solid #F0F0F0`
- 关闭按钮: `color: #333`

### 11. AppShell.vue — 应用框架 (MEDIUM)
**文件:** `apps/client/src/components/layout/AppShell.vue`

- 安全区域背景: `background: #fff`
- 加载状态: `color: #999`
- 网络状态条: `background: #FFF3CD`、`color: #856404`

### 12. HomeHeader.vue — 首页顶部 (MEDIUM)
**文件:** `apps/client/src/components/home/HomeHeader.vue`

- 渐变背景: `background: linear-gradient(180deg, #FF6B9D 0%, #FF8E8E 100%)`
- 通知徽标: `background: #FF4757`、`color: #fff`
- 搜索框: `background: rgba(255, 255, 255, 0.3)`、`color: #fff`

### 13. chat/index.vue 和 chat-session/index.vue — 页面级别 (MEDIUM)
**文件:** `apps/client/pages/chat/index.vue`, `apps/client/pages/chat-session/index.vue`

- 聊天气泡颜色硬编码
  - 发送方: `background: #FF6B9D`、`color: #fff`
  - 接收方: `background: #F0F0F0`、`color: #333`
- 输入区域: `border-top: 1px solid #E5E5E5`、`background: #fff`
- 时间分割线: `color: #999`

### 14. discover 页面相关组件 (MEDIUM)
**涉及文件:**
- `pages/discussions/index.vue`
- `components/discover/LongPressMenu.vue`

- 讨论卡片背景: `background: #fff`
- 热门标签: `color: #FF6B9D`
- 长按菜单: `background: rgba(0, 0, 0, 0.8)`、`color: #fff`
- 分割线: `background: #f5f5f5`

### 15. HeartParticles.vue — 粒子特效 (LOW)
**文件:** `apps/client/src/components/common/HeartParticles.vue`

- Canvas 绘制颜色硬编码: `#FF6B9D`、`#FF8E8E`、`#FFB3C6`
- 粒子透明度: `rgba(255, 107, 157, 0.3)` 等
- **说明:** Canvas API 无法使用 CSS 变量，但可通过 JS 读取 CSS 变量值后再应用到 Canvas 上下文

---

## 统计汇总

| 违规类型 | 文件数 | 出现次数 |
|---------|--------|---------|
| 硬编码 hex 颜色 | 38 | ~110 |
| 硬编码 box-shadow | 18 | ~25 |
| 非标准 border-radius | 20 | ~30 |
| 硬编码字体大小 | 10 | ~20 |
| 硬编码 rgba() | 15 | ~25 |

## 修复优先级建议

1. **立即修复:** TabBar.vue、IcebreakerSuggestions.vue（用户最高频接触）
2. **短期修复:** LockScreen.vue、UnlockGuideModal.vue、CardSwiper.vue（品牌认知关键页面）
3. **计划修复:** 其余所有组件统一迁移到 CSS 变量
4. **建立规范:** 在 ESLint 中添加 `vue-scoped-css/no-unused-css-vars` 规则，CI 中运行 stylelint 检查硬编码颜色
