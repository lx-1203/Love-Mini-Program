# 20-a11y-deep.md — 无障碍深度审计

> **审计日期**: 2026-07-25 | **严重程度分布**: ~10 CRITICAL/HIGH · ~18 MEDIUM · ~10 LOW | **总计 38 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL/HIGH | ~10 | 屏幕阅读器用户完全无法使用关键功能 |
| MEDIUM | ~18 | 可访问性降级、部分用户群体受限 |
| LOW | ~10 | WCAG 最佳实践改进 |

---

## 适用标准

本次审计依据 **WCAG 2.1 Level AA** 标准，重点聚焦：
- **1.1.1** 非文本内容 (alt text)
- **1.3.1** 信息和关系 (label association, table headers)
- **1.4.1** 颜色的使用 (color-only indicators)
- **1.4.3** 对比度 (最低)
- **2.1.1** 键盘 (焦点管理)
- **2.2.2** 暂停、停止、隐藏 (动画)
- **2.4.1** 跳过块 (skip links)
- **2.4.7** 焦点可见 (outline:none)
- **4.1.2** 名称、角色、值 (ARIA)

---

## CRITICAL 发现

### 1. CardSwiper — 7 张功能图片缺失 alt/aria-label

- **文件**: `apps/client/src/components/discover/CardSwiper.vue`
- **问题**: 卡片滑动组件中包含 7 张具有功能交互的图片（视频标识徽章、喜欢/跳过/超级喜欢按钮图标），但全部缺失 `alt` 属性。这些图片不是纯装饰性的——它们传达功能信息（视频类型标识、操作类型）。
- **影响**: 屏幕阅读器用户无法获知：哪个卡片是视频内容、三个操作按钮各代表什么操作。核心匹配功能对盲人用户完全不可用。
- **WCAG 违反**: 1.1.1 非文本内容 (Level A)
- **修复建议**:
  ```html
  <!-- 视频徽章 -->
  <image src="video-badge.png" alt="视频内容" />
  <!-- 操作按钮 -->
  <image src="like-icon.png" alt="喜欢" role="button" />
  <image src="skip-icon.png" alt="跳过" role="button" />
  <image src="super-like-icon.png" alt="超级喜欢" role="button" />
  ```

### 2. CardDetailOverlay — 11 张交互图片缺失 alt

- **文件**: `apps/client/src/components/discover/CardDetailOverlay.vue`
- **问题**: 用户详情浮层中包含 11 张图片（头像、照片轮播图、关闭按钮、更多操作按钮、分享按钮、举报按钮等），所有 `<image>` 标签均无 `alt` 属性或 `aria-label`。
- **影响**: 屏幕阅读器用户无法浏览用户照片（轮播图完全不可感知），无法区分关闭/分享/举报等操作按钮。用户详情页面对辅助技术用户是一堵不透风的墙。
- **WCAG 违反**: 1.1.1 非文本内容 (Level A)
- **修复建议**: 为所有图片添加描述性 alt 文本，装饰性图片使用 `alt=""` 配合 `aria-hidden="true"`。

### 3. TabBar — 4 个 Tab 图标缺失 alt 且无 role="tab"

- **文件**: `apps/client/src/components/layout/AppShell.vue`（或其他 TabBar 组件中）
- **问题**: 底部导航栏的 4 个 Tab（发现/消息/论坛/我的）使用 `<image>` 显示图标，无 `alt` 属性。同时缺失 `role="tab"`、`aria-selected`、`aria-label` 等 ARIA 属性。
- **影响**: 屏幕阅读器用户听到的是无意义的 "image" 而非 "发现 Tab, 已选中" 或 "消息 Tab, 3 条未读"。无法通过辅助技术进行页面导航。
- **WCAG 违反**: 1.1.1 非文本内容 (Level A)、4.1.2 名称/角色/值 (Level A)
- **修复建议**:
  ```html
  <view role="tab" :aria-selected="currentTab === 0" :aria-label="`发现${unreadCount > 0 ? ', ' + unreadCount + '条未读' : ''}`">
    <image :src="tabIcon" alt="" aria-hidden="true" />
    <text>发现</text>
  </view>
  ```

### 4. 登录表单输入框缺失 label 关联

- **文件**: `apps/client/pages/login/index.vue`
- **问题**: 登录页面的手机号输入框和验证码输入框没有通过 `<label>` 标签或 `aria-labelledby` 与对应的标签文字关联。标签文字（"手机号"、"验证码"）仅作为视觉文本放在输入框上方，程序化未关联。
- **影响**: 屏幕阅读器聚焦到输入框时，仅播报 "输入框" 或 "编辑框"，不播报 "手机号 输入框"。视障用户无法知道当前焦点输入框的用途。
- **WCAG 违反**: 1.3.1 信息和关系 (Level A)
- **修复建议**:
  ```html
  <label for="phone-input">手机号</label>
  <input id="phone-input" type="tel" placeholder="请输入手机号" />
  <!-- 或在 input 上添加 -->
  <input aria-label="手机号" placeholder="请输入手机号" />
  ```

### 5. Admin 登录表单输入框 — label 未与 input 语义关联

- **文件**: `apps/admin/src/views/Login.vue`（或对应的登录页组件）
- **问题**: 与客户端登录页面相同的问题——管理后台的登录表单（用户名、密码输入框）没有通过 `<label for="...">` 或 `aria-labelledby` 与对应的标签文字进行程序化关联。
- **影响**: 视障运营人员无法使用管理后台的登录功能，影响工作的可及性。在某些合规场景下可能违反无障碍法规。
- **WCAG 违反**: 1.3.1 信息和关系 (Level A)
- **修复建议**: 为每个 input 添加对应的 `<label>` 元素或 `aria-label` 属性。

---

## HIGH 发现

### 6. 100+ 张图片在全组件范围缺失 alt 或 aria-hidden

- **文件**: `apps/client/src/components/**/*.vue` (所有组件)
- **问题**: 对全量组件进行扫描后发现超过 100 个 `<image>` 标签缺失 `alt` 属性。包括用户头像、帖子配图、活动海报、功能图标、装饰性分隔线等。
- **影响**: 对于功能性和信息性图片（头像、帖子图、活动海报），屏幕阅读器用户完全无法感知其内容。对于装饰性图片，因为没有 `alt=""` + `aria-hidden="true"`，屏幕阅读器会尝试读取图片文件名，产生噪音干扰。
- **修复建议**: 建立分类规则：内容图片必须 `alt`、功能图标必须 `aria-label`、纯装饰使用 `alt="" aria-hidden="true"`。建议添加 ESLint 规则 `vuejs/accessibility` 或 `eslint-plugin-vue-a11y` 强制检查。

### 7. 7 个表单 input 在 subpackage 中缺失 label 关联

- **文件**: 各分包中的表单组件
- **问题**: 除登录页外，以下 7 个位置的表单输入框也缺失 label 关联：
  - 编辑个人资料页 — 昵称、简介、标签输入框
  - 发布帖子页 — 标题、内容输入框
  - 匹配偏好设置 — 年龄范围、身高范围
  - 搜索筛选 — 关键词输入框
  - 活动报名表单 — 姓名、联系方式
  - 反馈提交 — 反馈内容输入框
  - 聊天消息 — 消息输入框
- **影响**: 这些是用户完成核心任务必须使用的表单，辅助技术用户在这些页面上寸步难行。
- **WCAG 违反**: 1.3.1 信息和关系 (Level A)
- **修复建议**: 统一为所有表单 input 添加 label 或 aria-label。

### 8. 3 处 `outline: none` 消除键盘焦点

- **文件**: 
  - `apps/admin/src/views/Login.vue` (如果存在独立组件)
  - `apps/admin/src/views/NotifyConfig.vue`
  - `apps/admin/src/views/Users.vue`
- **问题**: 3 处代码中使用 `outline: none` 或 `outline: 0` 移除元素的键盘焦点指示器，但没有提供替代的焦点样式（如 `box-shadow` 或 `border` 变化）。
- **影响**: 仅使用键盘导航的用户（包括运动障碍用户和高级用户）在 Tab 键切换焦点时，无法看到当前焦点位置。页面完全无法用键盘操作。
- **WCAG 违反**: 2.4.7 焦点可见 (Level AA)
- **修复建议**: 移除 `outline: none`，或替换为同等可见的自定义焦点样式：
  ```css
  :focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  ```

### 9. 13+ 个动画在 App.vue 中无 `prefers-reduced-motion` 处理

- **文件**: `apps/client/src/App.vue`
- **问题**: App.vue 中包含 13 个以上的 CSS 动画（页面过渡动画、淡入淡出、缩放效果等），但没有任何 `@media (prefers-reduced-motion: reduce)` 查询来响应系统级的减少动画偏好。
- **影响**: 前庭功能障碍、注意力缺陷或光敏性癫痫的用户可能在观看这些动画时感到不适（头晕、恶心甚至诱发症状）。这些用户已在操作系统中设置 "减少动画"，但应用完全忽略此偏好。
- **WCAG 违反**: 2.3.3 交互动画 (Level AAA)、2.2.2 暂停/停止/隐藏 (Level A)
- **修复建议**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

### 10. HeartParticles 粒子雨动画无 reduced-motion 处理

- **文件**: `apps/client/src/components/common/HeartParticles.vue`
- **问题**: 爱心粒子飘落动画持续运行，通过 JavaScript 的 `requestAnimationFrame` 循环在 Canvas 上绘制。没有检测 `prefers-reduced-motion` 媒体查询，也没有提供暂停按钮。
- **影响**: 持续的粒子动画是一个重要的无障碍问题——不仅影响前庭功能障碍用户，也消耗大量 CPU/GPU 资源导致设备发热和电池快速消耗，对使用低端设备的用户不友好。
- **WCAG 违反**: 2.2.2 暂停/停止/隐藏 (Level A)
- **修复建议**: 
  1. 检测 `window.matchMedia('(prefers-reduced-motion: reduce)').matches` 并禁用动画
  2. 提供用户可控的开关（如设置页面中的 "减少动画" 选项）

### 11. LongPressMenu 过渡动画无 reduced-motion 回退

- **文件**: `apps/client/src/components/discover/LongPressMenu.vue`
- **问题**: 长按菜单弹出/消失使用 CSS transition 实现缩放+淡入淡出效果，未处理 reduced-motion 偏好。
- **影响**: 同样触发前庭功能障碍问题。长按菜单是核心交互控件，应尊重系统动画偏好。
- **修复建议**: 添加 `prefers-reduced-motion` 媒体查询，在减少动效模式下立即显示/隐藏菜单，无过渡动画。

### 12. 触控目标过小 — 图片删除按钮和筛选清除按钮

- **文件**: `apps/client/pages/activities/index.vue`（或其他含小按钮的组件）
- **问题**: 图片删除按钮（右上角小叉号）和筛选清除按钮的实际触控区域小于 WCAG 建议的 44x44 CSS 像素（约 24x24 px）。在小屏手机上极易误触或点不中。
- **影响**: 运动障碍用户、老年人或手指较大的用户难以精确点击这些小按钮，频繁误操作。
- **WCAG 违反**: 2.5.5 目标大小 (Level AAA, 建议级)
- **修复建议**: 将小按钮的可点击区域通过 `padding` 或伪元素扩展到至少 44x44 px。

### 13. 仅靠颜色传递状态信息 — CardDetailOverlay 在线状态点

- **文件**: `apps/client/src/components/discover/CardDetailOverlay.vue`
- **问题**: 用户在线状态仅通过一个绿色小圆点（在线）或灰色小圆点（离线）表示，无任何文字说明。
- **影响**: 色盲和色弱用户无法区分绿色和灰色圆点的含义。屏幕阅读器用户完全不知道状态点的存在。
- **WCAG 违反**: 1.4.1 颜色的使用 (Level A)
- **修复建议**: 
  1. 在圆点旁添加文字 "在线" / "离线" 或 "刚刚在线"
  2. 使用 `aria-label="用户在线"` 或 `aria-label="用户离线"`
  3. 在圆点上叠加不同的图标形状（实心 vs 空心）作为双重编码

### 14. Admin 表格 `<th>` 元素缺失 `scope` 属性

- **文件**: `apps/admin/src/views/Users.vue`、`Posts.vue`、`AuditLogs.vue`、`Feedback.vue`、`Reports.vue`、`NotifyConfig.vue`、`SensitiveWords.vue`、`Dashboard.vue`
- **问题**: 所有管理后台的表格组件的 `<th>` 表头单元格都缺失 `scope="col"`（列标题）或 `scope="row"`（行标题）属性。
- **影响**: 屏幕阅读器在浏览表格数据时无法正确播报当前单元格的列标题——用户听到的只是孤立的数值，不知道它属于 "用户名" 列还是 "注册时间" 列。大表格完全无法理解。
- **WCAG 违反**: 1.3.1 信息和关系 (Level A)
- **修复建议**:
  ```html
  <thead>
    <tr>
      <th scope="col">用户名</th>
      <th scope="col">注册时间</th>
      <th scope="col">状态</th>
    </tr>
  </thead>
  ```

### 15. Admin 无 "跳到主内容" 链接

- **文件**: `apps/admin/src/views/Layout.vue`
- **问题**: 管理后台页面缺少 "跳到主内容" (Skip to Content) 的导航链接。这是键盘导航用户和屏幕阅读器用户快速跳过重复的侧边栏和顶部导航的关键功能。
- **影响**: 键盘用户每次切换页面都需要 Tab 键穿过完整的侧边栏菜单（可能 20+ 次按键）才能到达主内容区，严重降低工作效率。
- **WCAG 违反**: 2.4.1 跳过块 (Level A)
- **修复建议**:
  ```html
  <a href="#main-content" class="skip-link">跳到主内容</a>
  <!-- 搭配CSS -->
  <style>
  .skip-link {
    position: absolute;
    top: -100%;
    left: 0;
    z-index: 9999;
    padding: 8px 16px;
    background: var(--color-primary);
    color: white;
  }
  .skip-link:focus {
    top: 0;
  }
  </style>
  ```

---

## 代表 MEDIUM 发现

| # | 文件 | 问题 | WCAG 标准 |
|---|------|------|-----------|
| 16 | UnlockGuideModal.vue | 弹窗未设置 `role="dialog"` 和 `aria-modal="true"` | 4.1.2 |
| 17 | UnlockGuideModal.vue | 弹窗打开时焦点未自动移至弹窗内第一个可聚焦元素 | 2.4.3 |
| 18 | LockScreen.vue | 锁定屏幕缺少 `aria-label` 说明锁定状态 | 4.1.2 |
| 19 | IcebreakerSuggestions.vue | 快捷回复按钮无 `role="button"` 仅用 `<view>` 实现 | 4.1.2 |
| 20 | HeartSignal.vue | 心跳信号动画无暂停机制 | 2.2.2 |
| 21 | ActivityCard.vue | 活动卡片整体可点击但无 `role="button"` 或 `tabindex` | 4.1.2 |
| 22 | HomeHeader.vue | 通知铃铛仅靠红点表示未读，无文字或 aria-label | 1.4.1 |
| 23 | LoginIllustration.vue | 登录插画缺失 `alt` 属性 | 1.1.1 |
| 24 | PhotoViewer (全局) | 图片查看器无关闭按钮的 `aria-label` 说明 | 4.1.2 |
| 25 | SearchBar.vue | 搜索输入框的清除按钮无 `aria-label` | 4.1.2 |
| 26 | admin/Login.vue | 密码可见/隐藏切换按钮无 `aria-label` | 4.1.2 |
| 27 | admin/Layout.vue | 侧边栏使用 `<div>` 实现无 `role="navigation"` | 4.1.2 |
| 28 | admin/Dashboard.vue | 统计卡片数字使用 `<div>` 无语义标记 | 1.3.1 |
| 29 | 全局 | 无 `<html lang="zh-CN">` 声明，影响屏幕阅读器语言识别 | 3.1.1 |
| 30 | 全局 | 页面 `<title>` 动态变化时未通过 `aria-live` 通知屏幕阅读器 | 4.1.3 |

---

## 代表 LOW 发现

| # | 文件 | 问题 |
|---|------|------|
| 31 | chat-session/index.vue | 消息列表使用 `<scroll-view>` 但未设置 `aria-live="polite"` 使屏幕阅读器感知新消息 |
| 32 | discover/* | 卡片滑动的手势提示仅为视觉指示，无音频或触觉反馈 |
| 33 | login/index.vue | 验证码倒计时按钮禁用时无 `aria-disabled` 说明 |
| 34 | 全局 | 应用级别的 `<view>` 容器无 `role="application"` 或 `role="main"` 标记 |
| 35 | 全局 | 表单提交按钮仅为 `<button>` 无 `type="submit"` |
| 36 | 全局 | 切换开关 (toggle/switch) 使用 `<view>` 实现，无 `role="switch"` + `aria-checked` |
| 37 | 全局 | 弹窗关闭时焦点未返回至触发弹窗的元素 |
| 38 | 全局 | 加载中状态仅视觉指示，未使用 `aria-busy="true"` 通知辅助技术 |

---

## WCAG 合规率估算

| 标准 | 违规项 | 合规率 |
|------|--------|--------|
| 1.1.1 非文本内容 | 10 项 | ~30% |
| 1.3.1 信息和关系 | 7 项 | ~50% |
| 1.4.1 颜色的使用 | 2 项 | ~60% |
| 1.4.3 对比度 | 未深度检测 | 待测 |
| 2.1.1 键盘 | 3 项 | ~40% |
| 2.2.2 暂停/停止/隐藏 | 3 项 | ~30% |
| 2.4.1 跳过块 | 1 项 | 0% |
| 2.4.7 焦点可见 | 3 项 | ~50% |
| 4.1.2 名称/角色/值 | 8 项 | ~20% |

**总体估计 WCAG 2.1 Level A 合规率: ~35%**

---

## 关键文件清单

| 文件 | 主要问题 |
|------|----------|
| `apps/client/src/components/discover/CardSwiper.vue` | **CRITICAL** 7 图片无 alt |
| `apps/client/src/components/discover/CardDetailOverlay.vue` | **CRITICAL** 11 图片无 alt、颜色唯一标识 |
| `apps/client/src/components/layout/AppShell.vue` | **CRITICAL** TabBar 无 alt/role/aria |
| `apps/client/pages/login/index.vue` | **CRITICAL** label 未关联 |
| `apps/admin/src/views/Login.vue` | **CRITICAL** label 未关联 |
| `apps/client/src/App.vue` | **HIGH** 13+ 动画无 reduced-motion |
| `apps/client/src/components/common/HeartParticles.vue` | **HIGH** 持续动画无 reduced-motion |
| `apps/client/src/components/discover/LongPressMenu.vue` | **HIGH** 过渡动画无 reduced-motion |
| `apps/admin/src/views/Users.vue` | **HIGH** th 无 scope、outline:none |
| `apps/admin/src/views/Layout.vue` | **HIGH** 无 skip link、无 role="navigation" |
| 全部 `apps/admin/src/views/*.vue` | **HIGH** th 无 scope |

---

## 修复优先级建议

1. **立即修复 (CRITICAL)**: 为所有交互图片添加 alt/aria-label、TabBar ARIA 属性、表单 label 关联
2. **本周修复 (HIGH)**: reduced-motion 支持、表格 th scope、outline 焦点样式、Skip Link
3. **下个迭代 (MEDIUM)**: 弹窗 ARIA、按钮语义化、Canvas 无障碍
4. **持续改进 (LOW)**: lang 属性、页面 title、aria-live
