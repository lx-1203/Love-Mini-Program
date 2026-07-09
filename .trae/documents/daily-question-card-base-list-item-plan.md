# daily-question/index.vue 应用 card-base & list-item 工具类计划

## 一、任务摘要

为 6 个 Vue 页面中的最后一个文件 `daily-question/index.vue` 应用全局工具类 `card-base` 与 `list-item`,完成用户要求的"边缘色未显示、层级划分不清晰、图片显示效果较差分割不明显"问题修复收尾工作。

- 已完成文件(5 个):
  - `apps/client/src/pages/home/index.vue` — 5 card-base + 4 list-item
  - `apps/client/src/pages/discover/index.vue` — 6 card-base + 1 list-item
  - `apps/client/src/pages/likes/index.vue` — 0 card-base + 2 list-item
  - `apps/client/src/pages/village/index.vue` — 0 card-base + 2 list-item
  - `apps/client/src/pages/messages/index.vue` — 0 card-base + 4 list-item
- 待处理文件(1 个):
  - `apps/client/src/pages/daily-question/index.vue` — 本计划目标

## 二、当前状态分析

### 2.1 全局工具类定义已确认(位于 `App.vue`)

- **`.card-base`**(第 463-469 行):
  - `background: #FFFFFF;`
  - `border: var(--card-border);`
  - `border-radius: 24rpx;`
  - `box-shadow: var(--card-shadow);`
  - `margin-bottom: var(--section-gap);`

- **`.list-item`**(第 361-371 行):
  - `animation: list-item-enter 300ms cubic-bezier(0.4, 0, 0.2, 1) both;`
  - `:nth-child(1)` 到 `:nth-child(n+7)` 提供 0ms → 360ms 阶梯延迟

### 2.2 daily-question/index.vue 现状(已读全文)

文件路径:`d:\6\恋爱小程序\apps\client\src\pages\daily-question\index.vue`

通过 Grep 验证,该文件**目前无任何 card-base / list-item 应用**。模板中含 "card" 关键字的元素:

| 行号 | 代码片段 | 类型 | 是否独立 | 处理方案 |
|------|---------|------|---------|---------|
| 86 | `<view v-if="!checkInStore.checkedIn" class="lock-card">` | 含 card 关键字 | 是,主要独立卡片 | **应用 card-base** |
| 101 | `<view v-if="todayQuestion" class="question-card">` | 含 card 关键字 | 是,主要独立卡片 | **应用 card-base** |
| 110 | `<view v-if="!hasAnswered && todayQuestion" class="answer-section">` | 不含 card 关键字 | — | 跳过(规则1不适用) |
| 154 | `class="answer-card"`(在 `v-for="answer in answers"` 内) | v-for 顶层列表项 + 含 card 关键字 | v-for 内 | **应用 list-item**(规则2优先) |

### 2.3 修改规则(用户原话)

1. **card-base**:找 class 中包含 "card" 关键字的 `<view>` 元素,**只修改主要的、独立的卡片容器(不修改 v-for 内的卡片)**,追加 class,保留原 class
2. **list-item**:找 v-for 渲染的顶层列表项(class 含 xxx-item 或 xxx-card),追加 class,保留原 class
3. 不修改已有 card-base/list-item 的元素、纯装饰元素、弹窗遮罩层
4. 不修改任何逻辑、样式、模板内容,不添加注释

### 2.4 验证要求

- 每个文件至少有 2 个 card-base 或 list-item 应用 → daily-question 将有 3 个(2 card-base + 1 list-item),满足要求
- 不破坏现有逻辑 → 仅追加 class,不改其他属性

## 三、拟定修改

### 修改 1:lock-card 追加 card-base(第 86 行)

**文件**:`d:\6\恋爱小程序\apps\client\src\pages\daily-question\index.vue`

**修改前**:
```vue
<view v-if="!checkInStore.checkedIn" class="lock-card">
```

**修改后**:
```vue
<view v-if="!checkInStore.checkedIn" class="lock-card card-base">
```

**理由**:lock-card 是未签到时显示的独立提示卡片,符合规则1"主要的、独立的卡片容器",应用 card-base 提供统一的边框、阴影、圆角、间距。

### 修改 2:question-card 追加 card-base(第 101 行)

**修改前**:
```vue
<view v-if="todayQuestion" class="question-card">
```

**修改后**:
```vue
<view v-if="todayQuestion" class="question-card card-base">
```

**理由**:question-card 是显示今日问题的主要独立卡片,符合规则1,应用 card-base 强化边缘色与层级划分。

### 修改 3:answer-card 追加 list-item(第 151-155 行)

**修改前**:
```vue
<view
  v-for="answer in answers"
  :key="answer.id"
  class="answer-card"
>
```

**修改后**:
```vue
<view
  v-for="answer in answers"
  :key="answer.id"
  class="answer-card list-item"
>
```

**理由**:answer-card 是 v-for 渲染的顶层列表项,且 class 含 "card" 关键字,符合规则2,应用 list-item 提供 60ms 阶梯延迟入场动画。注意:虽然 answer-card 含 card 关键字,但因其位于 v-for 内,根据规则1"不修改 v-for 内的卡片",不应用 card-base,仅应用 list-item。

## 四、假设与决策

### 4.1 假设

- `var(--card-border)`、`var(--card-shadow)`、`var(--section-gap)` 等 CSS 变量已在 `theme/design-variables.scss` 中定义(App.vue 第 51 行有 `@import "./theme/design-variables.scss";`)
- mp-weixin 环境支持 `:nth-child` 选择器和 `animation-delay`,与已完成的 5 个文件保持一致
- card-base 的 `margin-bottom: var(--section-gap)` 不会与 lock-card 现有的 `margin: 80rpx 32rpx;` 产生冲突,因为 card-base 的 margin-bottom 会覆盖外边距底部(实际可能存在轻微样式叠加,但与已完成的 home/discover 文件中同类卡片处理方式一致,符合用户预期)

### 4.2 决策

- **不修改 answer-section**(第 110 行):虽是独立容器,但 class 中不含 "card" 关键字,规则1 不适用
- **不修改 answered-hint**(第 139 行):class 不含 "card" 关键字,且为提示条而非卡片
- **不修改 answers-list**(第 145 行):class 不含 "card" 关键字,是列表容器而非卡片
- **answer-card 仅应用 list-item 不应用 card-base**:严格遵守规则1"不修改 v-for 内的卡片"

## 五、验证步骤

### 5.1 修改完成后验证

执行 Grep 验证 daily-question/index.vue 的应用情况:

```
Grep "card-base|list-item" path="d:\6\恋爱小程序\apps\client\src\pages\daily-question\index.vue" output_mode="content" -n=true
```

预期输出:
- 第 86 行:`<view v-if="!checkInStore.checkedIn" class="lock-card card-base">`
- 第 101 行:`<view v-if="todayQuestion" class="question-card card-base">`
- 第 154 行:`class="answer-card list-item"`

共 3 处匹配(2 card-base + 1 list-item),满足"每个文件至少有 2 个应用"的要求。

### 5.2 全局验证

执行 Grep 跨全部 6 个目标文件确认整体应用情况:

```
Grep "card-base|list-item" path="d:\6\恋爱小程序\apps\client\src\pages" output_mode="count"
```

预期:6 个目标文件均至少有 2 个应用,与其他已完成文件无回归。

### 5.3 不破坏逻辑验证

- 模板逻辑:仅追加 class 字符串,未删除/修改任何 v-if/v-for/v-model/@tap 等指令
- 样式:未修改 `<style scoped lang="scss">` 中任何 SCSS 规则
- 脚本:未触碰 `<script setup lang="ts">` 中任何代码
- 注释:未添加/删除任何注释

## 六、执行顺序

1. 读取本计划文件刷新上下文
2. 使用 Edit 工具对 `d:\6\恋爱小程序\apps\client\src\pages\daily-question\index.vue` 执行 3 次精确替换
3. 执行 Grep 验证(5.1 与 5.2)
4. 返回最终总结报告,包含:
   - 6 个文件的 card-base + list-item 数量统计表
   - 验证结果
   - 完成状态确认

## 七、风险与回滚

### 7.1 风险

- **样式叠加风险**:card-base 的 `margin-bottom: var(--section-gap)` 与 lock-card 现有 `margin: 80rpx 32rpx;` 可能产生底部边距叠加。但因 home/index.vue 中的 checkin-card 已采用相同处理方式且未反馈问题,风险可控。
- **编译风险**:mp-weixin 环境对工具类组合的支持已在已完成的 5 个文件中验证通过,无新增风险。

### 7.2 回滚方案

如出现问题,可通过将 3 处修改逆向还原(删除追加的 `card-base` / `list-item` 字符串),不影响其他文件。
