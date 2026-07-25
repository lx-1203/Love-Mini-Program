# 19-vue-hardcode-pages.md — Vue/TS 前端硬编码 (pages 目录) 审计

> **审计日期**: 2026-07-25 | **严重程度分布**: 0 CRITICAL · ~6 HIGH · ~25 MEDIUM · ~14 LOW | **总计 45 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 0 | — |
| HIGH | ~6 | 路由脆弱性、可维护性风险 |
| MEDIUM | ~25 | 代码重复、CSS 不一致、魔法数字 |
| LOW | ~14 | 最佳实践 |

---

## HIGH 发现

### 1. 跨页面硬编码路由路径重复 10+ 次

- **文件**: `apps/client/pages/activities/index.vue`、`chat/index.vue`、`chat-session/index.vue`、`login/index.vue`、`discussions/index.vue`、`apps/client/src/components/**/*.vue`
- **问题**: 路由跳转路径如 `'/pages/discover/index'`、`'/pages/chat/chat-session/index'` 以字符串字面量形式在多个页面和组件中重复出现。经统计 `'/pages/discover/index'` 出现 10+ 次，`'/pages/chat/index'` 出现 8+ 次。
- **影响**: 如果页面路径发生变化（如目录重构），需要在 10+ 个文件中同时修改，遗漏任何一处导致页面间导航断裂。当前已存在被删除的路径仍被引用的情况（如 `pages.json` 已删除但仍被代码中的 `uni.navigateTo` 引用）。
- **修复建议**: 定义路由路径常量文件 `constants/routes.ts`：

    ```typescript
    export const ROUTES = {
      DISCOVER: '/pages/discover/index',
      CHAT: '/pages/chat/index',
      CHAT_SESSION: '/pages/chat-session/index',
      DISCUSSIONS: '/pages/discussions/index',
      ACTIVITIES: '/pages/activities/index',
      LOGIN: '/pages/login/index',
    } as const;
    ```

### 2. CSS 颜色值硬编码 (#fff, #000, 渐变值等)

- **文件**: `apps/client/pages/activities/index.vue`、`chat/index.vue`、`chat-session/index.vue`、`login/index.vue`、`discussions/index.vue`
- **问题**: 各页面 `<style>` 块中直接使用硬编码的颜色值，如 `background: #fff`、`color: #333`、`border: 1px solid #eee`、`linear-gradient(...)`。项目未建立 CSS 变量体系。
- **影响**: 
  - 暗色模式切换需要修改每个页面的每个颜色值
  - 品牌色变更时需要全局搜索替换
  - 不同页面可能使用略有不同的灰色（`#f5f5f5` vs `#f0f0f0` vs `#eee`），视觉不统一
- **修复建议**: 在 `App.vue` 的 `:root` 中定义 CSS 自定义属性，逐步替换各页面中的硬编码颜色。

### 3. Emoji 表情充当功能图标

- **文件**: `apps/client/pages/activities/index.vue`、`chat-session/index.vue`、`discussions/index.vue`
- **问题**: 页面中使用 emoji 字符作为图标——活动列表用 📍 表示地点、🕐 表示时间、👤 表示参与者。这不是专业的 UI 图标方案。
- **影响**: 
  - Emoji 在不同设备/系统上渲染效果不一致（iOS vs Android vs Windows）
  - 无法通过 CSS 控制颜色、大小，只能使用原始 emoji 样式
  - 部分 emoji 在旧设备上不显示（显示为方框）
  - 与整体 UI 设计风格不协调
- **修复建议**: 使用 SVG 图标或 uni-app 的 `<uni-icons>` 组件替换所有 emoji。

### 4. 所有页面 100% 硬编码中文文案

- **文件**: `apps/client/pages/activities/index.vue`、`chat/index.vue`、`chat-session/index.vue`、`login/index.vue`、`discussions/index.vue`
- **问题**: 所有用户界面文案——包括占位符文本、Toast 提示、按钮标签、空状态提示、表单标签——全部以中文字符串字面量直接写在 `<template>` 和 `<script>` 中。无 i18n key，无文案抽取机制。
- **影响**: 
  - 未来国际化时需逐文件改造
  - 运营团队无法独立调整文案进行 A/B 测试
  - 同一语义的文案在不同页面写法不一致（如 "加载中..." vs "正在加载..."）
- **修复建议**: 即使当前仅支持中文，也应使用文案常量文件将文案集中管理，为未来国际化做准备。

### 5. 魔法数字遍布各页面

- **文件**: `apps/client/pages/chat-session/index.vue`、`discussions/index.vue`、`activities/index.vue`
- **问题**: 关键业务参数以数字字面量分散在各文件中：
  - `50` — 消息文本截断长度 (chat-session)
  - `10` — 标题最大显示字数 (discussions)
  - `99` — 未读消息角标封顶值 (chat)
  - `240` — 文本输入框 maxlength (chat-session)
  - `200` — placeholder 文本的最大长度
- **影响**: 产品经理提出 "标题截断改为 15 字" 时，开发者需要跨文件搜索所有 `10` 字面量并判断哪些是需要修改的，极易误改。
- **修复建议**: 定义语义化常量：

    ```typescript
    export const UI_LIMITS = {
      MESSAGE_PREVIEW_LENGTH: 50,
      TITLE_MAX_LENGTH: 10,
      BADGE_MAX: 99,
      INPUT_MAX_LENGTH: 240,
    } as const;
    ```

### 6. 日历组件日期标签硬编码

- **文件**: `apps/client/pages/activities/index.vue`
- **问题**: 签到/活动日历的星期标签硬编码为 `['日', '一', '二', '三', '四', '五', '六']`，月份标签硬编码为 `['1月', '2月', ...]`。
- **影响**: 英文用户看到中文星期/月份名称，用户体验不佳。
- **修复建议**: 使用 `Intl.DateTimeFormat` 或 dayjs 的 locale 功能动态生成。

---

## 代表 MEDIUM 发现

### 7. 筛选选项硬编码

- **文件**: `apps/client/pages/activities/index.vue`、`discussions/index.vue`
- **问题**: 活动的类型筛选（"全部"、"运动"、"学习"、"娱乐"等）和论坛版块筛选以静态数组形式硬编码在页面组件的 `data()` 或 `setup()` 中。
- **影响**: 运营新增活动类型后，筛选功能无法反映新类型——后端返回了类型但前端筛选列表找不到对应选项。需要发版才能同步。
- **修复建议**: 筛选选项应从后端 API 获取，页面组件仅负责渲染。

### 8. 白色背景硬编码 vs CSS 变量

- **文件**: `apps/client/pages/chat/index.vue`、`chat-session/index.vue`
- **问题**: 聊天页面背景和聊天气泡背景使用硬编码的 `#fff` 和 `#f8f8f8`，而非引用全局 CSS 变量。项目中其他组件已开始使用 `var(--bg-primary)` 等变量。
- **影响**: 聊天页面与其他页面的背景色在暗色模式下不一致，用户感知到页面切换时的闪烁。
- **修复建议**: 统一使用 `var(--bg-primary)` / `var(--bg-secondary)` 替换页面组件中的硬编码颜色。

### 9. 页面级 loading 文案硬编码

- **文件**: `apps/client/pages/activities/index.vue`、`discussions/index.vue`
- **问题**: `uni.showLoading({ title: '加载中...' })` 和 Empty 状态的 "暂无数据" 文案以字面量重复出现在多个页面中。
- **影响**: 修改全局 loading 文案需要跨文件搜索替换。
- **修复建议**: 定义全局 UI 文案常量文件，各页面统一引用。

### 10. 输入框 placeholder 硬编码

- **文件**: `apps/client/pages/chat-session/index.vue`、`login/index.vue`
- **问题**: input 组件的 `placeholder` 属性值如 "输入消息..."、"请输入手机号" 等直接写在模板中。
- **影响**: 与文案硬编码同理，修改无集中管理。

### 11. 动画时长硬编码

- **文件**: `apps/client/pages/chat-session/index.vue`、`activities/index.vue`
- **问题**: CSS transition/animation 的 `duration` 值 `0.3s`、`0.5s` 在各页面中重复出现，未统一定义动画时长 token。
- **影响**: 全局调快/调慢动画速度时需修改多处。

---

## 代表 LOW 发现

| # | 文件 | 问题 |
|---|------|------|
| 12 | activities/index.vue | 活动卡片高度 `240rpx` 硬编码，长标题时文字溢出 |
| 13 | chat/index.vue | 会话列表项高度 `120rpx` 硬编码，与设计规范中统一列表高度不一致 |
| 14 | discussions/index.vue | 帖子封面图宽高比 `16:9` 硬编码，实际图片可能非此比例导致变形 |
| 15 | login/index.vue | 验证码发送间隔 `60` 秒硬编码 |
| 16 | chat-session/index.vue | 表情面板每行列数 `8` 硬编码 |
| 17 | activities/index.vue | 活动报名状态枚举 `['open', 'full', 'ended']` 硬编码，与后端可能不一致 |
| 18 | chat/index.vue | 会话时间格式化规则（今天/昨天/日期）硬编码在模板中 |
| 19 | login/index.vue | 手机号正则 `/^1[3-9]\d{9}$/` 硬编码——若运营商新增号段（如 16 号段）需代码修改 |

---

## 页面硬编码分布

| 页面 | 路由硬编码 | CSS 颜色 | 中文文案 | 魔法数字 | Emoji | 总计 |
|------|-----------|----------|----------|----------|-------|------|
| activities/index.vue | 3 | 12 | 18 | 5 | 4 | ~42 |
| chat/index.vue | 4 | 8 | 10 | 3 | 0 | ~25 |
| chat-session/index.vue | 2 | 15 | 22 | 6 | 2 | ~47 |
| login/index.vue | 2 | 10 | 14 | 3 | 0 | ~29 |
| discussions/index.vue | 3 | 9 | 15 | 4 | 1 | ~32 |

---

## 关键文件清单

| 文件 | 行数(估) | 主要问题 |
|------|----------|----------|
| `apps/client/pages/chat-session/index.vue` | ~500 | 文案、颜色、魔法数字最多 |
| `apps/client/pages/activities/index.vue` | ~400 | Emoji + 文案 + 颜色 + 日历硬编码 |
| `apps/client/pages/chat/index.vue` | ~300 | 路由 + 颜色 + 筛选硬编码 |
| `apps/client/pages/discussions/index.vue` | ~350 | 路由 + 颜色 + 文案 + Emoji |
| `apps/client/pages/login/index.vue` | ~250 | 颜色 + 文案 + 正则硬编码 |

---

## 修复优先级建议

1. **立即修复 (HIGH)**: 路由路径常量抽取（避免页面导航断裂）
2. **本周修复 (MEDIUM)**: CSS 变量体系、UI 魔法数字常量文件
3. **下个迭代 (LOW)**: Emoji 替换为 SVG、文案集中管理、动态筛选
