# 13 -- Vue/TS 组件库 Bug/UX

> **审计日期:** 2026-07-25
> **类别:** Vue/TS 组件库 Bug & UX
> **发现总数:** 56
> **严重程度分布:** HIGH 12 | MEDIUM 28 | LOW 16

---

## 严重程度概要

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| HIGH | 12 | 功能缺陷、运行时 Bug、数据丢失风险 |
| MEDIUM | 28 | UX 问题、性能隐患、代码质量 |
| LOW | 16 | 代码风格、小改进 |

---

## HIGH 发现

### HIGH-01: CardSwiper.vue 使用浏览器 TouchEvent -- 与 mp-weixin 不兼容

**文件:** `apps/client/src/components/discover/CardSwiper.vue`
**严重程度:** HIGH
**类别:** 兼容性 Bug

**问题描述:**
`CardSwiper.vue` 中的滑动手势处理使用了 Web 标准的 `TouchEvent` 类型和事件属性 (`event.touches`, `event.changedTouches`)。微信小程序的触摸事件虽然 API 类似但事件对象结构不同：

```typescript
// 当前代码 -- Web TouchEvent (不兼容小程序)
function handleTouchStart(e: TouchEvent) {
  startX.value = e.touches[0].clientX;
  startY.value = e.touches[0].clientY;
}
```

小程序中应使用 `@touchstart` 的事件对象，其坐标通过 `e.touches[0].x` / `e.touches[0].y` 获取，而非 `clientX`/`clientY`。此外小程序没有 `TouchEvent` 全局类型。

**影响:** 核心卡片滑动功能在小程序真机上行为不可预测 -- 坐标计算可能错误或直接报错。
**修复建议:** 使用 UniApp uni-app 提供的统一触摸事件处理，或封装一个适配层统一 Web/小程序触摸事件差异。

---

### HIGH-02: CardDetailOverlay.vue 使用浏览器 TouchEvent -- 与 mp-weixin 不兼容

**文件:** `apps/client/src/components/discover/CardDetailOverlay.vue`
**严重程度:** HIGH
**类别:** 兼容性 Bug

**问题描述:**
与 HIGH-01 相同的问题。`CardDetailOverlay.vue` 中的图片滑动浏览功能使用了 Web `TouchEvent`，在小程序环境下不兼容。

**影响:** 卡片详情页的图片左右滑动功能在小程序真机上失效。
**修复建议:** 与 HIGH-01 统一修复方案。

---

### HIGH-03: SocialProgressIndicator.vue -- setTimeout 在 computed() 内部使用 (严重 Vue 反模式)

**文件:** `apps/client/src/components/common/SocialProgressIndicator.vue`
**严重程度:** HIGH
**类别:** Vue 反模式

**问题描述:**
`SocialProgressIndicator.vue` 在 `computed` 属性内部调用了 `setTimeout`。这是严重的 Vue 反模式：

1. `computed` 应该是纯函数，不应有副作用
2. `setTimeout` 在 computed 内部的回调可能在组件已卸载后执行
3. 每次依赖变化都会创建新的定时器，前一个不清理
4. computed 的缓存机制被副作用破坏

```typescript
// 反模式示例
const progressPercent = computed(() => {
  setTimeout(() => {
    // 副作用 -- 修改响应式状态
    animatedValue.value = target;
  }, 0);
  return rawValue;
});
```

**影响:** 定时器泄漏、卸载后状态更新导致 Vue 警告、进度动画行为不稳定。
**修复建议:** 使用 `watch` + `nextTick` 或 `watchEffect` 替代 computed 内的副作用。如需动画过渡，使用 `requestAnimationFrame` 并在 `onBeforeUnmount` 中取消。

---

### HIGH-04: Ripple.vue -- 模块级 timer 跨组件实例共享

**文件:** `apps/client/src/components/common/Ripple.vue`
**严重程度:** HIGH
**类别:** 组件隔离 Bug

**问题描述:**
`Ripple.vue` 在 `<script setup>` 外部（模块顶层）声明了 timer 变量，导致该组件的所有实例共享同一个 timer 引用。

```typescript
// 模块级变量 -- 所有 Ripple 实例共享
let rippleTimer: ReturnType<typeof setTimeout> | null = null;

// 在 <script setup> 内使用
const startRipple = () => {
  if (rippleTimer) clearTimeout(rippleTimer); // 影响其他实例
  rippleTimer = setTimeout(() => { ... }, 400);
};
```

**影响:** 页面上多个波纹按钮同时存在时，一个按钮触发波纹会清除其他按钮的动画定时器，导致动画中断或表现异常。
**修复建议:** 将 timer 变量移入 `<script setup>` 内部，使每个组件实例拥有独立的 timer。

---

### HIGH-05: HeartParticles.vue -- 模块级 timer 跨组件实例共享

**文件:** `apps/client/src/components/common/HeartParticles.vue`
**严重程度:** HIGH
**类别:** 组件隔离 Bug

**问题描述:**
`HeartParticles.vue` 的粒子动画管理定时器声明在模块级别，多个爱心粒子实例同时存在时相互干扰。

**影响:** 多个 `<HeartParticles>` 组件同时渲染时，动画定时器相互覆盖，粒子行为错乱。
**修复建议:** 将所有 timer 变量移入 `<script setup>` 内部，在 `onBeforeUnmount` 中各自清理。

---

### HIGH-06: FilterDrawer.vue -- 模块级变量跨组件实例共享

**文件:** `apps/client/src/components/discover/FilterDrawer.vue`
**严重程度:** HIGH
**类别:** 组件隔离 Bug

**问题描述:**
`FilterDrawer.vue` 的动画状态或过渡相关变量声明在模块级别，同一页面不会同时出现多个 FilterDrawer，但在页面切换时如果前一个实例的清理不彻底，残留状态会影响新实例。

**修复建议:** 将模块级变量移入 `<script setup>` 作用域。

---

### HIGH-07: ChatBubble.vue -- longpress 事件 emit 了 quoteRef 而非 messageId

**文件:** `apps/client/src/components/chat/ChatBubble.vue`
**严重程度:** HIGH
**类别:** Bug -- 数据传递错误

**问题描述:**
`ChatBubble.vue` 的长按事件 `emit` 的 payload 为 `quoteRef` 对象，但父组件期望接收 `messageId`（字符串或数字）。

```typescript
// 当前 emit
emit('longpress', { quoteRef: props.message.id }); // 传了 quoteRef 对象
// 父组件期望
<ChatBubble @longpress="handleLongPress" />
// handleLongPress(messageId: string) { ... }
```

**影响:** 长按消息触发引用回复功能时，父组件收到错误格式的数据，引用回复功能可能不工作或显示错误消息。
**修复建议:** 统一 emit payload 格式，确认父组件期望的接口并修改 emit 调用。或者让父组件适配当前 payload。

---

### HIGH-08: Toast.vue 单例 -- 第二次调用丢失未 resolve 的 Promise

**文件:** `apps/client/src/components/common/Toast.vue`
**严重程度:** HIGH
**类别:** Bug -- 并发调用

**问题描述:**
`Toast.vue` 的 `showToast()` 使用单例模式，但当第二次调用时直接清除了前一个 toast 的显示状态，导致前一个调用者的 `Promise` 永远不会 resolve：

```typescript
let resolvePromise: (() => void) | null = null;

function showToast(message: string, duration: number): Promise<void> {
  // 第二次调用时上一个 Promise 的 resolve 被丢弃
  if (resolvePromise) {
    // 上一个 Promise 永远不会 resolve -- 丢失
  }
  return new Promise(resolve => {
    resolvePromise = resolve;
    // ...显示 toast
  });
}
```

**影响:** 如果代码中使用 `await showToast('...')` 并依赖其 resolve 来执行后续操作，在快速连续调用 toast 时后续代码会永久卡住。
**修复建议:** 使用队列管理多个 toast 请求，或在上一个 toast 被替换时先 `resolve()` 上一个 Promise。

---

### HIGH-09: MatchGuideOverlay.vue -- visible 状态纯内部管理，关闭后永不重新打开

**文件:** `apps/client/src/components/discover/MatchGuideOverlay.vue`
**严重程度:** HIGH
**类别:** Bug -- 状态管理

**问题描述:**
`MatchGuideOverlay.vue` 的显示/隐藏状态完全由内部 `visible` ref 管理。用户关闭引导后 `visible` 被设置为 `false`，但组件没有提供重置 or 外部触发重新显示的手段（缺少 `watch` prop 或 `defineExpose` 方法）。

```typescript
const visible = ref(true);
const close = () => { visible.value = false; };
// 无任何方式将 visible 重置为 true
// 父组件无法控制其显示
```

**影响:** 用户在首次使用时关闭引导后，无法再次打开查看。除非重新进入小程序（组件重新挂载）。
**修复建议:** 添加 `defineProps({ show: Boolean })` 支持外部控制，或通过 `defineExpose({ show: () => visible.value = true })` 暴露重新打开方法。

---

### HIGH-10: UnreadBadge 始终可见 -- 无 v-if 控制

**文件:** `apps/client/src/components/layout/UnreadBadge.vue`
**严重程度:** HIGH
**类别:** Bug -- 假通知

**问题描述:**
`UnreadBadge.vue` 的 DOM 始终渲染（未使用 `v-if` 或 `v-show`），仅当 `count` 为 0 时显示为 `0`。用户会看到红点上显示 "0"，造成有消息的假象。

```vue
<!-- 当前实现 -- count 为 0 时仍显示 0 -->
<view class="badge">{{ count }}</view>
<!-- 应改为 -->
<view v-if="count > 0" class="badge">{{ count }}</view>
```

**影响:** 无未读消息时红点仍显示，用户反复点击后发现没有新消息，产生困惑和不信任感。严重 UX 问题。
**修复建议:** 添加 `v-if="count > 0"`，count 为 0 时隐藏整个徽标。

---

### HIGH-11: PeopleScroll.vue -- 硬编码 .slice(0, 5)

**文件:** `apps/client/src/components/home/PeopleScroll.vue`
**严重程度:** HIGH
**类别:** 硬编码限制

**问题描述:**
`PeopleScroll.vue` 中无论接口返回多少用户数据，都在渲染前硬编码截断为前 5 条：

```typescript
const displayUsers = computed(() => props.users.slice(0, 5));
```

**影响:** 后端返回更多推荐用户时，前端只能展示 5 个。若有有效的推荐算法，超过 5 个的结果被浪费。
**修复建议:** 根据设计规范确定合理展示数量，或通过 prop 控制（`maxDisplay`），或使用分页加载。

---

### HIGH-12: VerificationBadge.vue -- idcard 映射到 SCHOOL 图标 (错误!)

**文件:** `apps/client/src/components/profile/VerificationBadge.vue`
**严重程度:** HIGH
**类别:** Bug -- 数据映射错误

**问题描述:**
`VerificationBadge.vue` 中 `idcard` 认证类型被错误地映射到了 `SCHOOL` 图标，而非 `IDCARD` 图标。

```typescript
// 当前错误映射
const iconMap = {
  student: ICONS.SCHOOL,
  idcard: ICONS.SCHOOL,     // 错误：身份证映射到了学校图标
  phone: ICONS.PHONE,
};
// 正确映射应为
const iconMap = {
  student: ICONS.SCHOOL,
  idcard: ICONS.IDCARD,     // 身份证应使用身份证图标
  phone: ICONS.PHONE,
};
```

**影响:** 用户完成实名认证后，认证标识显示为 "学校认证" 图标，传达错误的认证信息，可能导致其他用户误解认证类型。
**修复建议:** 修正 `idcard` 的图标映射，并检查是否定义了 `IDCARD` 图标，如未定义则添加。

---

## MEDIUM 发现 (代表性)

### MEDIUM-01: 组件缺少 name 属性影响 DevTools 调试

**文件:** 多个 .vue 文件
**严重程度:** MEDIUM
**类别:** 开发体验

**问题描述:**
大量组件使用 `<script setup>` 但未通过额外 `<script>` 块设置 `name` 属性。Vue DevTools 中显示为 `<AnonymousComponent>`，排查问题时难以定位。

---

### MEDIUM-02: defineProps 缺少验证器 (validator)

**文件:** 多个组件文件
**严重程度:** MEDIUM
**类别:** 代码健壮性

**问题描述:**
多个组件接收 props 但未使用 `validator` 函数校验值的合法性。例如 `type`, `variant`, `size` 等枚举型 prop 接受任意字符串。

---

### MEDIUM-03: 组件 emit 事件未在 defineEmits 中声明类型

**文件:** 多个组件文件
**严重程度:** MEDIUM
**类别:** TypeScript

**问题描述:**
使用 `defineEmits` 但未声明 payload 类型，参数默认为 `any`，父组件无法获得类型检查。

---

### MEDIUM-04: 大组件单文件超过 500 行

**文件:** `CardDetailOverlay.vue` (~600+ 行), `CardSwiper.vue` (~500+ 行)
**严重程度:** MEDIUM
**类别:** 可维护性

**问题描述:**
部分组件单文件超过 500 行，包含模板、逻辑、多处动画，难以维护和测试。建议拆分为更小的子组件或提取 composables。

---

### MEDIUM-05: 使用 $refs 直接操作 DOM 而非数据驱动

**文件:** 3-4 个组件文件
**严重程度:** MEDIUM
**类别:** Vue 最佳实践

**问题描述:**
部分组件通过 `ref` 获取 DOM 元素并直接修改样式/类名，而非通过响应式数据和 `:class`/`:style` 进行声明式渲染。

---

### MEDIUM-06: 图片加载失败无 fallback 处理

**文件:** `CardSwiper.vue`, `CardDetailOverlay.vue`, 多个头像组件
**严重程度:** MEDIUM
**类别:** UX

**问题描述:**
用户头像/图片加载失败时未使用 `@error` 事件显示默认占位图，出现空白或破碎图片图标。

---

### MEDIUM-07: 列表渲染 key 使用 index

**文件:** 多个使用 `v-for` 的组件
**严重程度:** MEDIUM
**类别:** Vue 最佳实践

**问题描述:**
部分列表使用 `:key="index"` 而非唯一稳定的业务 ID。在列表项增删或排序时导致不必要的 DOM 重建和动画错误。

---

### MEDIUM-08: 没有组件使用文档或 Storybook

**文件:** 全项目范围
**严重程度:** MEDIUM
**类别:** 文档

**问题描述:**
43 个组件没有任何使用文档、Props 说明、示例或 Storybook stories。

---

### MEDIUM-09: 未处理网络状态变化

**文件:** 全项目范围
**严重程度:** MEDIUM
**类别:** UX

**问题描述:**
组件未监听 `wx.onNetworkStatusChange`。网络断开时用户尝试操作会得到不友好的错误提示，而非主动告知网络状态。

---

### MEDIUM-10: transition 动画未使用 <Transition> 组件

**文件:** 多个组件文件
**严重程度:** MEDIUM
**类别:** Vue 最佳实践

**问题描述:**
部分组件手动通过 CSS class 切换 + `setTimeout` 实现过渡效果，而非使用 Vue 内置 `<Transition>` 和 `<TransitionGroup>` 组件。

---

## LOW 发现 (代表性)

- **LOW-01:** `<style scoped>` 中使用了深层选择器 `::v-deep`，可能在小程序中不生效。
- **LOW-02:** 组件文件内 import 语句未分组排序。
- **LOW-03:** 使用 `export default` 混合 `defineComponent` 和 `<script setup>` 语法。
- **LOW-04:** 访问 `props.xxx` 但未在 `defineProps` 中声明该属性。
- **LOW-05:** 多处 `console.log` 调试代码未清理。
- **LOW-06:** 组件中硬编码的时间常量（如 `2000ms` 动画时长）未提取为常量。

---

## 组件问题矩阵

| 组件 | 发现数 | 最高严重度 | 核心问题 |
|------|--------|-----------|----------|
| CardSwiper.vue | 6 | HIGH | TouchEvent 兼容 + 硬编码 + 大文件 |
| CardDetailOverlay.vue | 5 | HIGH | TouchEvent 兼容 + 大文件 |
| SocialProgressIndicator.vue | 3 | HIGH | computed 副作用 |
| Ripple.vue | 2 | HIGH | 模块级 timer 共享 |
| HeartParticles.vue | 3 | HIGH | 模块级 timer 共享 |
| FilterDrawer.vue | 3 | HIGH | 模块级变量共享 |
| ChatBubble.vue | 3 | HIGH | emit payload 错误 |
| Toast.vue | 3 | HIGH | Promise 丢失 |
| MatchGuideOverlay.vue | 2 | HIGH | 状态不可重置 |
| UnreadBadge.vue | 2 | HIGH | 假通知指示器 |
| PeopleScroll.vue | 2 | HIGH | 硬编码截断 |
| VerificationBadge.vue | 2 | HIGH | 图标映射错误 |
| 其余 31 个组件 | 20 | MEDIUM | 各类中度问题 |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预计工时 |
|--------|----------|----------|
| P0 (立即) | HIGH-10 (UnreadBadge), HIGH-12 (VerificationBadge) | 0.5天 |
| P1 (本周) | HIGH-03 (computed 副作用), HIGH-07 (emit 错误), HIGH-08 (Toast Promise) | 1天 |
| P2 (本月) | HIGH-01, HIGH-02 (TouchEvent), HIGH-04~HIGH-06 (timer 共享), HIGH-09, HIGH-11 | 3天 |
| P3 (下月) | MEDIUM-01 ~ MEDIUM-10, LOW-01 ~ LOW-06 | 2天 |
