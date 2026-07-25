# 11 -- 无障碍 / i18n / 设计系统

> **审计日期:** 2026-07-25
> **类别:** 无障碍 / 国际化 / 设计系统
> **发现总数:** 78
> **严重程度分布:** CRITICAL 14 | HIGH 22 | MEDIUM 28 | LOW 14

---

## 严重程度概要

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 14 | 设计系统分裂、i18n 空白、无障碍根本性缺失 |
| HIGH | 22 | 合规风险、用户体验严重受损 |
| MEDIUM | 28 | 可用性问题、不一致性 |
| LOW | 14 | 改进建议 |

---

## CRITICAL 发现

### CRITICAL-01: 设计 Token 系统分裂 -- 两套独立的调色板

**文件:**
- `design-system/tokens.ts` -- 使用 `#3B9DE5` (Sky Blue) 作为主色
- `apps/client/src/theme/tokens.ts` -- 使用 `#2DB97A` (Mint Green) 作为主色
**严重程度:** CRITICAL
**类别:** 设计系统

**问题描述:**
项目中存在两套完全独立的设计 Token 系统，定义了**不同的**主色调。`design-system/tokens.ts` 以 Sky Blue (`#3B9DE5`) 为基础，而 `apps/client/src/theme/tokens.ts` 以 Mint Green (`#2DB97A`) 为基础。两组 tokens 的其他语义色值（success、warning、danger）也不一致。

```
design-system/tokens.ts       | apps/client/src/theme/tokens.ts
------------------------------+-------------------------------
primary: #3B9DE5 (Sky Blue)  | primary: #2DB97A (Mint Green)
success: #4CAF50              | success: #07C160
warning: #FF9800              | warning: #FF8F1F
danger:  #F44336              | danger:  #FA5151
bg:      #F5F7FA              | bg:      #F6F6F6
```

**影响:** 同一产品的不同组件使用不同的颜色体系，视觉效果割裂。无法确定哪套是 "正确" 的设计系统。任何全局样式修改在不同位置需要改两遍。
**修复建议:** 选择一套作为惟一的 Design Token 来源，删除另一套。所有组件引用统一 token 文件。

---

### CRITICAL-02: Zero i18n 基础设施 -- 200+ 中文字符串硬编码

**文件:** 全项目范围 (Vue 组件 + Java 后端)
**严重程度:** CRITICAL
**类别:** 国际化

**问题描述:**
项目完全没有国际化 (i18n) 基础设施：
- 前端不存在 `vue-i18n` 或任何 i18n 插件
- 200+ 中文字符串硬编码在 Vue 模板和 TypeScript 文件中
- 后端 API 返回的错误消息硬编码为中文
- 没有语言文件 (`zh-CN.json`, `en.json`)
- 没有语言切换机制

```vue
<!-- 典型硬编码示例 -->
<text>请输入手机号</text>
<text>发送验证码</text>
<text>密码长度不能少于6位</text>
<button>确认删除</button>
<view>暂无数据</view>
```

**影响:**
- 产品完全无法国际化，锁定中文市场
- 未来若需支持多语言需重写所有文本
- 文案修改需要逐个文件查找替换，维护成本极高

**修复建议:** 引入 `vue-i18n`，建立 `locales/` 目录结构，将所有用户可见文本迁移到语言文件中。

---

### CRITICAL-03: 管理后台使用独立的设计系统

**文件:** `apps/admin/src/` 目录
**严重程度:** CRITICAL
**类别:** 设计系统

**问题描述:**
管理后台 (`apps/admin`) 使用了完全独立的设计系统（灰度/紫色调色板），与小程序客户端 (`apps/client`) 的体系完全无关。同一产品的两个界面看起来像来自不同公司。

| 维度 | 客户端 | 管理后台 |
|------|--------|----------|
| 主色 | Mint Green / Sky Blue | Purple / Gray |
| 圆角 | 12px-16px | 4px-8px |
| 间距 | 8px 基准 | 16px 基准 |
| 字体 | PingFang SC | Inter / system-ui |

**影响:** 品牌一致性完全丧失，用户体验割裂。
**修复建议:** 管理后台提取公共 Design Tokens 包，引用与客户端相同的语义色和间距变量。

---

### CRITICAL-04: 15+ 动画未适配 prefers-reduced-motion

**文件:** 15 个以上组件文件
**严重程度:** CRITICAL
**类别:** 无障碍 - 动效

**问题描述:**
项目中 15 个以上的组件包含 CSS 动画 (`@keyframes`、`transition`、`animation`)，但没有任何一个组件或全局样式表检查 `prefers-reduced-motion: reduce` 媒体查询。

```css
/* 当前所有动画无此保护 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**影响:** 前庭功能障碍用户（全球约 15% 人口）可能因动画触发眩晕、恶心等症状。违反 WCAG 2.2 标准 2.3.3 (Level AAA)。
**修复建议:** 在全局样式添加 `prefers-reduced-motion` 规则，禁用或缩短所有动画时长。

---

### CRITICAL-05: TabBar 缺少 ARIA 角色和标签

**文件:** `apps/client/src/components/layout/AppShell.vue` 或 TabBar 组件
**严重程度:** CRITICAL
**类别:** 无障碍 - ARIA

**问题描述:**
底部 5 个 TabBar 项目均缺少无障碍标注：
- 没有 `role="tablist"` / `role="tab"`
- 没有 `aria-selected` 状态
- 没有 `aria-label` 描述
- 没有 `tabindex` 管理

**影响:** 屏幕阅读器用户完全无法理解和操作底部导航，小程序核心导航功能不可用。
**修复建议:** 为 TabBar 容器添加 `role="tablist"`，每个 Tab 添加 `role="tab"`、`aria-selected`、`aria-label`。

---

### CRITICAL-06: CardSwiper 操作按钮缺少无障碍标签

**文件:** `apps/client/src/components/discover/CardSwiper.vue`
**严重程度:** CRITICAL
**类别:** 无障碍 - ARIA

**问题描述:**
CardSwiper 的 5 个操作按钮（点赞、跳过、超级喜欢、回退、详情）均为纯图标按钮，缺少 `aria-label`。屏幕阅读器会朗读为 "按钮" 而无法传达操作含义。

**影响:** 核心匹配功能对视障用户完全不可用。
**修复建议:** 为每个操作按钮添加描述性 `aria-label`（如 "喜欢"、"跳过"、"查看详情"）。

---

### CRITICAL-07: 登录表单输入框缺少 label 关联

**文件:** `apps/client/src/pages/login/` 目录
**严重程度:** CRITICAL
**类别:** 无障碍 - 表单

**问题描述:**
登录页面的手机号输入框和验证码输入框使用占位符 (`placeholder`) 代替 `<label>`。占位符在输入内容后消失，且屏幕阅读器对 placeholder 的支持不一致。

```vue
<!-- 当前实现 - 缺少 label -->
<input placeholder="请输入手机号" type="tel" v-model="phone" />
<input placeholder="请输入验证码" type="number" v-model="code" />
```

**影响:** 视障用户无法确认输入框用途。违反 WCAG 2.2 标准 3.3.2 (Labels or Instructions, Level A)。
**修复建议:** 添加 `<label>` 元素并使用 `for` 属性关联 `input` 的 `id`，或将 label 文本内嵌在 `aria-label` 中。

---

### CRITICAL-08: 100+ 交互图片缺少 alt/aria-label

**文件:** 约 10 个组件, 100+ 处 `<image>` 标签
**严重程度:** CRITICAL
**类别:** 无障碍 - 图片

**问题描述:**
项目中超过 100 个 `<image>` 标签存在无障碍文本缺失：

| 组件/页面 | 缺失数 | 图片类型 |
|-----------|--------|----------|
| CardSwiper | 5 | 用户头像卡片 |
| CardDetailOverlay | 8 | 详情页照片 |
| HomeHeader | 3 | 通知/设置图标 |
| ChatHeader | 2 | 返回/更多按钮图标 |
| ActivityCard | 5 | 活动封面图 |
| WallSection | 20+ | 表白墙用户头像 |
| PeopleScroll | 20+ | 用户轮播头像 |
| Profile 页面 | 及其它 | 头像/勋章/认证 |

**影响:** 100+ 处关键交互元素对视障用户不可见。违反 WCAG 1.1.1 (Non-text Content, Level A)。
**修复建议:** 为功能性图片添加 `aria-label`，为装饰性图片添加 `aria-hidden="true"`，为用户生成内容图片添加动态 `aria-label`。

---

### CRITICAL-09: 7 个表单输入框缺少 label 关联

**文件:** `login`, `feedback`, `profile-setup` 等页面
**严重程度:** CRITICAL
**类别:** 无障碍 - 表单

**问题描述:**
除了登录页面 (CRITICAL-07) 之外，还有以下 5 个页面的表单输入框缺少 label：
- `feedback/index.vue` -- 反馈文本域 + 联系方式输入
- `profile-setup/index.vue` -- 昵称 + 简介输入
- `report/index.vue` -- 举报原因选择
- `chat/input-bar.vue` -- 消息输入框
- `verify/submit.vue` -- 认证资料表单

**修复建议:** 所有输入控件关联 `<label>` 元素或提供 `aria-label`。

---

### CRITICAL-10: 3 处 outline:none 移除键盘焦点指示器

**文件:** 3 个全局/组件样式文件
**严重程度:** CRITICAL
**类别:** 无障碍 - 键盘导航

**问题描述:**
以下 3 处 CSS 规则使用 `outline: none` 强行移除了浏览器/系统默认的焦点指示器，但未提供自定义焦点样式作为替代：

```css
/* 3 处出现此类规则 */
button:focus, input:focus {
  outline: none;  /* 移除焦点指示器，未提供替代 */
}
```

**影响:** 键盘用户完全无法获知当前焦点位置，无法通过键盘导航。违反 WCAG 2.4.7 (Focus Visible, Level AA)。
**修复建议:** 移除 `outline: none`，或在使用它时提供更醒目的自定义焦点样式（如 `box-shadow: 0 0 0 3px #2DB97A`）。

---

### CRITICAL-11: 图片删除和筛选清除按钮触控区域过小 (< 44px)

**文件:** 多个组件文件
**严重程度:** CRITICAL
**类别:** 无障碍 - 触控目标

**问题描述:**
以下交互元素的触控区域小于 44x44 CSS 像素（WCAG 2.5.5 Target Size, Level AAA 要求）：
- 头像上传中的删除按钮 (约 18x18px)
- 筛选面板中的清除按钮 (约 20x20px)
- 聊天消息中的引用关闭按钮 (约 24x24px)
- Toast 通知中的关闭按钮 (约 28x28px)

**影响:** 精细动作障碍用户难以准确点击这些小按钮，易误触相邻元素。
**修复建议:** 使用 padding 扩大可点击区域至 44x44px 最小尺寸。

---

### CRITICAL-12: 颜色作为唯一状态指示器

**文件:** `SocialProgressIndicator.vue`, `VerificationBadge.vue`, 等
**严重程度:** CRITICAL
**类别:** 无障碍 - 颜色

**问题描述:**
以下组件仅通过颜色传达状态信息，无文字或图标备选方案：
- `SocialProgressIndicator.vue` -- 社交档案完成度用绿/黄/红表示高低，无百分比文字
- `VerificationBadge.vue` -- 认证状态用蓝/金/灰区分，无文字标签
- `ChatBubble.vue` -- 消息发送状态仅用灰色小勾表示

**影响:** 色盲用户无法区分状态。违反 WCAG 1.4.1 (Use of Color, Level A)。
**修复建议:** 在颜色基础上添加图标或文字标签作为冗余信息通道。

---

### CRITICAL-13: 微信小程序无障碍 API 未使用

**文件:** `apps/client/src/App.vue`, 全局
**严重程度:** CRITICAL
**类别:** 无障碍 - 平台特性

**问题描述:**
微信小程序提供了 `wx.getBackgroundAudioManager`、`aria` 属性支持等无障碍能力，但项目中完全没有使用。小程序的 `aria-*` 属性可在 WXML 中使用但在本项目 .vue 文件中未见到。

**修复建议:** 参考微信小程序无障碍开发指南，在关键交互元素上添加 ARIA 属性。

---

### CRITICAL-14: 未定义任何颜色对比度标准

**文件:** 全项目范围
**严重程度:** CRITICAL
**类别:** 无障碍 - 对比度

**问题描述:**
项目中未定义或验证文字与背景的颜色对比度。以下组合可能存在对比度不足：
- 浅灰文字 `#C0C0C0` 在白色背景 `#FFFFFF` 上 -- 对比度约 1.8:1 (应 >= 4.5:1)
- Mint Green `#2DB97A` 在浅色背景上的文字 -- 需验证
- placeholder 文字颜色 -- 通常太浅

**修复建议:** 使用 WCAG 对比度检查工具验证所有文字/背景色组合，在 Design Tokens 中标注对比度等级。

---

## HIGH 发现 (代表性)

### HIGH-01: 文本缩放时布局崩溃

**文件:** 多个页面文件
**严重程度:** HIGH
**类别:** 无障碍 - 文本缩放

**问题描述:**
多处使用固定高度容器配合 `overflow: hidden`，当用户在微信中调整字体大小时，文字被截断。违反 WCAG 1.4.4 (Resize Text, Level AA)。

---

### HIGH-02: 没有 skip-link 跳过重复内容

**文件:** `AppShell.vue`
**严重程度:** HIGH
**类别:** 无障碍 - 导航

**问题描述:**
每个页面顶部有重复的导航栏和内容，但未提供 skip-link 让键盘用户直接跳到主要内容区域。

---

### HIGH-03: 模态框焦点未锁定

**文件:** `UnlockGuideModal.vue`, `LongPressMenu.vue`, `CardDetailOverlay.vue`
**严重程度:** HIGH
**类别:** 无障碍 - 焦点管理

**问题描述:**
模态框/弹出层打开后，键盘焦点未被限制在模态框内。用户 TAB 导航可能聚焦到被遮罩层覆盖的底层元素。

---

### HIGH-04: 没有暗色模式 (Dark Mode) 支持

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 设计系统 - 夜间模式

**问题描述:**
应用未适配微信小程序的暗色模式 (`darkmode: true` 未在 `app.json` 声明)，在系统暗色模式下色彩可能出现异常对比度或不可读。

---

### HIGH-05: 排版层级不统一 -- 字号跨度混乱

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 设计系统

**问题描述:**
项目中出现 20+ 种不同的 font-size 值（从 10px 到 48px），未形成有限的排版层级 (type scale)。同一语义级别的文字在不同组件中使用了不同的字号。

---

### HIGH-06: 间距系统未统一 -- 使用任意值

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 设计系统

**问题描述:**
组件中使用任意 `padding`/`margin` 值 (`7px`, `13px`, `22px` 等)，未基于限定的间距基准（如 4px 或 8px 的倍数）。

---

### HIGH-07: 图标体系不统一

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 设计系统

**问题描述:**
项目中混用了 Emoji 图标、纯文本符号、自定义 SVG 和 iconfont 图标，同样的功能在不同位置使用不同的图标表达。

---

## MEDIUM 发现 (代表性)

- **MEDIUM-01:** 加载状态仅通过转圈动画指示，缺少文字说明 `aria-busy`。
- **MEDIUM-02:** Toast 提示无 ARIA live region，屏幕阅读器不会自动播报。
- **MEDIUM-03:** 错误状态仅通过红色边框指示，缺少错误文字。
- **MEDIUM-04:** 表单校验错误信息不关联 `aria-describedby`。
- **MEDIUM-05:** 空状态提示 (Empty state) 文本未本地化提取。

---

## LOW 发现 (代表性)

- **LOW-01:** TypeScript 类型定义中缺少 Design Token 类型约束。
- **LOW-02:** 部分 SVG 图标缺少 `viewBox` 属性。
- **LOW-03:** CSS 变量命名不一致（kebab-case vs camelCase）。
- **LOW-04:** 未配置 `meta[name=theme-color]`。
- **LOW-05:** 未使用 CSS `:focus-visible` 替代 `:focus`。

---

## 修复优先级建议

| 优先级 | 发现编号 | 预计工时 |
|--------|----------|----------|
| P0 (立即) | CRITICAL-01 (设计系统统一) | 2天 |
| P1 (本周) | CRITICAL-06 ~ CRITICAL-12 (ARIA/表单/keyboard) | 3天 |
| P2 (本月) | CRITICAL-02 (i18n 基建), CRITICAL-04, HIGH-01 ~ HIGH-05 | 5天 |
| P3 (下月) | CRITICAL-03 (Admin 统一), MEDIUM, LOW | 3天 |

---

## WCAG 2.2 合规性评估

| WCAG 准则 | 合规状态 | 主要差距 |
|-----------|----------|----------|
| 1.1.1 Non-text Content (A) | 不合格 | 100+ 图片缺 alt |
| 1.4.1 Use of Color (A) | 不合格 | 颜色作为唯一指示器 |
| 1.4.3 Contrast (AA) | 未测试 | 未做对比度检查 |
| 2.1.1 Keyboard (A) | 不合格 | outline:none 阻碍键盘操作 |
| 2.4.7 Focus Visible (AA) | 不合格 | 焦点指示器被移除 |
| 2.5.5 Target Size (AAA) | 不合格 | 多处 < 44px 触控区 |
| 3.3.2 Labels (A) | 不合格 | 多处表单缺 label |
| 2.3.3 Animation (AAA) | 不合格 | 缺 reduced-motion 适配 |
