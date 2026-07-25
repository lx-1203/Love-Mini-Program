# 10 -- 微信小程序专项审查

> **审计日期:** 2026-07-25
> **类别:** 微信小程序专项
> **发现总数:** 79
> **严重程度分布:** CRITICAL 7 | HIGH 18 | MEDIUM 34 | LOW 20

---

## 严重程度概要

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 7 | 功能无法运行、崩溃、合规风险 |
| HIGH | 18 | 兼容性问题、性能风险、安全缺陷 |
| MEDIUM | 34 | WXSS 兼容性、配置不规范 |
| LOW | 20 | 最佳实践偏离 |

---

## CRITICAL 发现

### CRITICAL-01: loginWithWechat() 从未调用 wx.login -- 微信 OAuth 未实现

**文件:** `apps/client/src/stores/auth.ts` 或 `apps/client/src/services/auth.ts`
**严重程度:** CRITICAL
**类别:** 功能缺失

**问题描述:**
小程序登录流程的核心方法 `loginWithWechat()` 从未调用 `wx.login()`。该方法的实现直接跳过了获取微信临时 code 的步骤，无法完成真实微信 OAuth 认证流程。

```typescript
// 当前实现 -- 未调用 wx.login
async function loginWithWechat() {
  // ... 直接调用了后端 /auth/wechat-login 但没有先获取 code
  const res = await api.post('/auth/wechat-login', { /* 缺少 code */ });
}
```

**影响:** 小程序在微信环境中完全无法登录，OAuth 流程断裂。这是阻断性缺陷。
**修复建议:** 实现完整的 wx.login() -> 获取 code -> 后端换取 openId/session_key 的标准流程。

---

### CRITICAL-02: manifest.json 缺少 __usePrivacyCheck__ 配置

**文件:** `apps/client/src/manifest.json`
**严重程度:** CRITICAL
**类别:** 合规

**问题描述:**
微信小程序要求 2023年9月15日起必须配置 `__usePrivacyCheck__: true` 并在调用隐私接口前完成隐私协议确认。当前 `manifest.json` 中缺少此项配置。

**影响:** 在较新版本的基础库上，隐私接口（获取头像、位置、相册等）调用将失败。微信审核可能拒绝通过。
**修复建议:** 在 `manifest.json` 中添加 `"__usePrivacyCheck__": true`，并在 `app.vue` 中实现 `wx.onNeedPrivacyAuthorization` 监听。

---

### CRITICAL-03: URLSearchParams 在小程序不可用 -- village.ts 崩溃

**文件:** `apps/client/src/stores/village.ts`
**严重程度:** CRITICAL
**类别:** 运行时崩溃

**问题描述:**
`village.ts` 中使用了 `URLSearchParams`，该 API 在微信小程序的 JavaScript 引擎中不可用。运行时调用会抛出 `URLSearchParams is not defined` 导致白屏崩溃。

```typescript
// 当前代码 (在小程序中会崩溃)
const params = new URLSearchParams(query);
```

**影响:** 小程序进入 village 相关页面时白屏崩溃。
**修复建议:** 使用手动解析函数或引入 `url-parse` polyfill 替代 `URLSearchParams`。

---

### CRITICAL-04: CardSwiper.vue 使用 aspect-ratio CSS (WXSS 不支持)

**文件:** `apps/client/src/components/discover/CardSwiper.vue`
**严重程度:** CRITICAL
**类别:** WXSS 兼容性

**问题描述:**
`CardSwiper.vue` 中使用了 CSS `aspect-ratio` 属性来控制卡片宽高比。微信小程序的 WXSS 不支持 `aspect-ratio` 属性，该样式会被完全忽略。

```css
/* 当前样式 (WXSS 不支持) */
.card-image {
  aspect-ratio: 3 / 4;
}
```

**影响:** 卡片图片未设置明确高度时会塌陷为 0px 高度，卡片布局完全损坏。
**修复建议:** 使用 `padding-top` 百分比技巧（`padding-top: 133.33%;`）或通过 JS 动态计算高度替代。

---

### CRITICAL-05: 生产环境 Fallback URL 使用 HTTP 非 HTTPS

**文件:** `apps/client/src/config/api.ts` 或 `apps/client/src/utils/request.ts`
**严重程度:** CRITICAL
**类别:** 安全

**问题描述:**
生产环境的 fallback 请求 URL 使用了 `http://` 协议而非 `https://`。

```typescript
// 当前配置
const API_BASE_URL = process.env.API_URL || 'http://api.campuslove.com';
```

**影响:** 小程序要求所有网络请求必须使用 HTTPS。HTTP 请求将被微信拦截，生产环境 API 完全不可用。同时 HTTP 明文传输导致所有请求数据可被中间人窃取。
**修复建议:** 将所有 fallback URL 改为 `https://`，并在小程序管理后台配置合法域名。

---

### CRITICAL-06: discover.ts 中模块级 setTimeout 定时器永不清理 -- 内存泄漏

**文件:** `apps/client/src/stores/discover.ts`
**严重程度:** CRITICAL
**类别:** 内存泄漏

**问题描述:**
`discover.ts` 在模块顶层创建了多个 `setTimeout` / `setInterval` 定时器，这些定时器在页面卸载时不会被清理，导致持有对 store 实例的引用。

```typescript
// 模块级定时器 (永不清理)
const heartbeatTimer = setInterval(() => { ... }, 3000);
const expiryTimer = setTimeout(() => { ... }, 1800000);
```

**影响:** 每次进入 discover 页面都会创建新的定时器，旧的永不释放。长时间使用后定时器堆积导致 CPU 占用升高、电池消耗增加。
**修复建议:** 在 Pinia store 的 `$onAction` 或页面 `onUnload` 中清理定时器。

---

### CRITICAL-07: App.vue 中未注册 onNeedPrivacyAuthorization 监听

**文件:** `apps/client/src/App.vue`
**严重程度:** CRITICAL
**类别:** 合规

**问题描述:**
微信隐私协议新规要求小程序必须在 App.vue 的 `onLaunch` 或 `onShow` 中注册 `wx.onNeedPrivacyAuthorization` 回调。当前 App.vue 中未实现此逻辑。

**影响:** 调用隐私接口（`wx.chooseImage`、`wx.getLocation` 等）时，微信不会弹出隐私协议确认弹窗，直接返回错误。
**修复建议:** 在 App.vue 的 `onLaunch` 中注册隐私授权监听，并在需要时展示自定义隐私协议弹窗。

---

## HIGH 发现

### HIGH-01: 20+ 页面使用 height: 100vh (小程序不可靠)

**文件:** 多个页面文件
**严重程度:** HIGH
**类别:** WXSS 兼容性

**问题描述:**
20 多个页面的根元素使用了 `height: 100vh`。微信小程序中 `vh` 单位计算包含导航栏和 tabBar 区域，但不包含自定义导航栏，导致实际可视高度不准确 -- 可能出现底部被 tabBar 遮挡或底部多余空白。

**涉及文件:** `chat/index.vue`, `chat-session/index.vue`, `discover/index.vue`, `profile/index.vue`, `discussions/index.vue`, 以及其他约 15 个页面文件。

**修复建议:** 使用 `wx.getSystemInfoSync().windowHeight` 计算实际可用高度，或使用 `flex: 1` 弹性布局配合 `height: 100%` 的父容器。

---

### HIGH-02: 7 个文件使用 display: grid (WXSS 不支持)

**文件:** 7 个组件文件
**严重程度:** HIGH
**类别:** WXSS 兼容性

**问题描述:**
以下文件使用了 CSS Grid 布局 (`display: grid`, `grid-template-columns`)，而微信小程序 WXSS 不支持 Grid 布局：

- `CardSwiper.vue`
- `CardDetailOverlay.vue`
- `FilterDrawer.vue`
- `ActivityCard.vue`
- `HomeHeader.vue`
- `WallSection.vue`
- `PeopleScroll.vue`

**影响:** Grid 布局属性被忽略，这些组件的布局将完全失效，出现元素堆叠或错位。

**修复建议:** 使用 Flexbox 布局替代 Grid。Flexbox 在小程序基础库 2.0+ 完整支持。

---

### HIGH-03: 8 个文件使用 backdrop-filter: blur() 无 iOS 回退

**文件:** 8 个组件文件
**严重程度:** HIGH
**类别:** WXSS 兼容性

**问题描述:**
以下文件使用了 `backdrop-filter: blur()` 实现毛玻璃效果，该属性在部分 iOS 设备上支持但 Android 完全不支持：

- `CardDetailOverlay.vue`
- `LockScreen.vue`
- `UnlockGuideModal.vue`
- `FilterDrawer.vue`
- `AppShell.vue`
- 以及其他 3 个组件

**影响:** Android 设备上毛玻璃效果完全失效，可能导致文字在叠加背景下不可读。
**修复建议:** 为 `backdrop-filter` 添加降级方案：使用半透明背景色 (`rgba()`) 作为 fallback，确保在没有 blur 支持时文字仍可读。

---

### HIGH-04: 6 个文件调用隐私接口前未检查授权状态

**文件:** 6 个组件文件
**严重程度:** HIGH
**类别:** 合规

**问题描述:**
以下文件直接调用 `wx.chooseImage` 或 `wx.chooseVideo` 而未先调用 `wx.getSetting` 或 `wx.requirePrivacyAuthorize` 检查隐私授权状态：

- `profile/avatar-upload.vue`
- `feedback/image-picker.vue`
- `chat/image-sender.vue`
- `moment/publish.vue`
- `setup/photo-upload.vue`
- `verify/id-upload.vue`

**影响:** 用户若未同意隐私协议，这些调用将直接失败，用户体验差且可能导致审核不通过。
**修复建议:** 调用隐私接口前先检查授权状态，未授权时引导用户完成隐私协议确认。

---

### HIGH-05: filter: blur() 在 WXSS 中完全不支持

**文件:** 多个组件文件
**严重程度:** HIGH
**类别:** WXSS 兼容性

**问题描述:**
多个组件使用了 CSS `filter: blur()` 或 `filter: brightness()`。微信小程序的 WXSS **完全不支持** `filter` 属性（包括 `blur`、`brightness`、`contrast`、`grayscale` 等）。

**涉及文件:** `LockScreen.vue`, `HeartParticles.vue`, `LoginIllustration.vue`, 以及其他 2 个文件。

**影响:** 模糊背景、图片滤镜等视觉效果完全失效，UI 呈现与设计稿严重不符。
**修复建议:** 使用 Canvas 实现图片模糊（`wx.createImage` + Canvas 绘制），或使用预处理的模糊背景图片。

---

### HIGH-06: 16 个页面文件根元素使用 100vh

**文件:** 16 个页面 .vue 文件
**严重程度:** HIGH
**类别:** WXSS 兼容性

**问题描述:**
16 个页面的根 `<view>` 或 `<scroll-view>` 元素使用了 `height: 100vh` 来设置全屏高度。`vh` 单位在微信小程序中不可靠（原因见 HIGH-01），应从所有页面根元素中移除。

**影响:** 页面底部可能被 tabBar 遮挡或出现无法滚动的空白区域。

**修复建议:** 使用 `page { height: 100%; }` + `flex: 1` 方案统一处理页面高度。

---

### HIGH-07: cursor:pointer 和 user-select:none -- 8 个文件使用无效 CSS

**文件:** 8 个组件文件
**严重程度:** HIGH
**类别:** WXSS 兼容性

**问题描述:**
8 个文件中的按钮或可点击元素使用了 `cursor: pointer` 和 `user-select: none`。这两个 CSS 属性在微信小程序的 WXSS 中被**静默忽略**（小程序无鼠标指针和无文本选择概念）。

虽然不导致错误，但表明组件可能没有为小程序环境做过适配和检查。

---

### HIGH-08: 6 个文件缺少图片懒加载

**文件:** 6 个列表组件文件
**严重程度:** HIGH
**类别:** 性能

**问题描述:**
以下包含大量图片的列表页面未在 `<image>` 标签上添加 `lazy-load` 属性：

- `discover/card-list.vue`
- `discussions/index.vue`
- `chat-session/index.vue`
- `moment/feed.vue`
- `profile/gallery.vue`
- `wall/index.vue`

**影响:** 页面一次性加载所有图片，首屏加载时间长，消耗用户流量。

**修复建议:** 为列表中的 `<image>` 标签添加 `lazy-load` 属性。

---

### HIGH-09: 小程序 AppID 硬编码在多个位置

**文件:** `manifest.json`, `project.config.json`, 多个配置文件
**严重程度:** HIGH
**类别:** 配置管理

**问题描述:**
小程序 AppID 以明文硬编码在多个配置文件中。不同环境（开发/测试/生产）使用不同 AppID 时，需要手动修改多处配置，容易出错。

**修复建议:** 使用环境变量或构建脚本动态注入 AppID。

---

### HIGH-10: 未处理小程序切后台时的网络请求取消

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 生命周期

**问题描述:**
未在 `onHide` 生命周期中取消进行中的网络请求。小程序切后台 5 秒后 WebSocket 和网络请求会被微信暂停，切回前台时 suspended 的请求可能永远不会 resolve，导致 UI 卡在 loading 状态。

**修复建议:** 使用 `AbortController` 或 Promise 竞态机制，在 `onHide` 中取消进行中的请求。

---

## MEDIUM 发现 (代表性)

### MEDIUM-01: wx.request 未统一封装错误重试逻辑

**文件:** `apps/client/src/utils/request.ts`
**严重程度:** MEDIUM
**类别:** 网络

**问题描述:**
网络请求层未实现统一的重试逻辑。弱网环境下单次请求失败即报错，用户体验差。

---

### MEDIUM-02: 未使用分包加载 -- 主包过大

**文件:** `apps/client/src/pages.json`
**严重程度:** MEDIUM
**类别:** 性能

**问题描述:**
项目未使用微信小程序的分包异步化。所有页面均位于主包，首屏加载时长长，可能超过 2MB 限制。

---

### MEDIUM-03: scroll-view 未启用 enhanced 属性

**文件:** 多个使用 scroll-view 的文件
**严重程度:** MEDIUM
**类别:** 性能

**问题描述:**
`<scroll-view>` 组件未设置 `enhanced` 和 `bounces` 属性，未启用 iOS 橡皮筋效果优化。

---

### MEDIUM-04: 组件中混用 options API 和 Composition API

**文件:** 多个 .vue 文件
**严重程度:** MEDIUM
**类别:** 代码规范

**问题描述:**
项目中部分组件在 `<script setup>` 中混用了 `options` API（如 `defineProps` + `data()`），风格不一致。

---

### MEDIUM-05: wx.getSystemInfoSync 同步调用在多个位置重复

**文件:** 多个文件
**严重程度:** MEDIUM
**类别:** 性能

**问题描述:**
`wx.getSystemInfoSync()` 是同步 API（已标记为废弃，推荐 `wx.getWindowInfo`），在多个组件中重复调用。建议在 app 启动时获取并存入 globalData。

---

## LOW 发现 (代表性)

- **LOW-01:** `project.config.json` 中 `miniprogramRoot` 路径配置不标准。
- **LOW-02:** 未配置 `requiredPrivateInfos` 声明需要的地理位置等隐私权限。
- **LOW-03:** npm 包中的 `@escook/request-miniprogram` 可能不兼容新版基础库。
- **LOW-04:** 组件样式隔离 `styleIsolation` 未显式设置，依赖默认行为。
- **LOW-05:** 未使用 `skyline` 渲染引擎，仍使用 WebView 渲染。

---

## 兼容性矩阵

| CSS 属性 | WXSS 支持 | 受影响文件数 | 替代方案 |
|-----------|-----------|-------------|----------|
| `aspect-ratio` | 不支持 | 1 | `padding-top` 百分比 |
| `backdrop-filter` | Android 不支持 | 8 | `rgba()` 半透明背景 |
| `display: grid` | 不支持 | 7 | Flexbox |
| `filter` | 不支持 | 5 | Canvas 或预处理图片 |
| `gap` (Grid) | 不支持 | 7 | `margin` |
| `vh` | 不可靠 | 16+ | `wx.getWindowInfo` + `flex: 1` |
| `cursor` | 静默忽略 | 8 | 移除 |
| `user-select` | 静默忽略 | 8 | 移除 |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预计工时 |
|--------|----------|----------|
| P0 (立即) | CRITICAL-01, CRITICAL-03, CRITICAL-04, CRITICAL-05 | 2天 |
| P1 (本周) | CRITICAL-02, CRITICAL-06, CRITICAL-07, HIGH-01 ~ HIGH-06 | 4天 |
| P2 (本月) | HIGH-07 ~ HIGH-10, MEDIUM-01 ~ MEDIUM-05 | 2天 |
| P3 (下月) | LOW-01 ~ LOW-05 | 1天 |
