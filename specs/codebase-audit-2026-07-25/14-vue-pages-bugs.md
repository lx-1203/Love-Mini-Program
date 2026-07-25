# 14-vue-pages-bugs.md — Vue/TS Pages Bug/UX 审计

> **审计日期**: 2026-07-25 | **严重程度分布**: 5 CRITICAL · 6 HIGH · 25 MEDIUM · 20 LOW | **总计 56 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 5 | 功能完全不可用或数据完整性问题 |
| HIGH | 6 | 严重影响用户体验或存在潜在数据风险 |
| MEDIUM | 25 | 功能降级、部分场景失效 |
| LOW | 20 | 改进建议、编码规范 |

---

## CRITICAL 发现

### 1. activities/index.vue — `refresherTriggered` 使用普通 `let` 而非 `ref()`，下拉刷新完全失效

- **文件**: `apps/client/pages/activities/index.vue`
- **问题**: 下拉刷新状态变量 `refresherTriggered` 被声明为普通 JavaScript `let` 变量，而非 Vue 的 `ref()`。在 Vue 的响应式系统中，普通 `let` 变量的变更不会触发视图更新，也不会与 uni-app 的 `<scroll-view>` 的 `refresher-triggered` 属性正确绑定。
- **影响**: 用户下拉刷新手势无法触发任何加载逻辑，页面内容永远停留在初始数据。该功能对用户完全不可用。
- **修复建议**: 将 `let refresherTriggered = false` 改为 `const refresherTriggered = ref(false)`，并在使用处改为 `.value` 访问。

### 2. chat-session/index.vue — 消息同时发送到 messagesStore 和 chatStore，导致重复消息

- **文件**: `apps/client/pages/chat-session/index.vue`
- **问题**: 发送消息的函数内，同一条消息对象被同时推入 `messagesStore` 和 `chatStore` 两个独立的状态管理中。两个 Store 各自维护消息列表，互不同步。
- **影响**: 聊天界面显示两条完全相同的消息（每发一条消息，UI 上出现两条重复的对话气泡），严重影响聊天功能的可用性和用户信任。
- **修复建议**: 选择单一数据源（建议保留 messagesStore），移除对 chatStore 消息列表的写入。如果 chatStore 需要读取消息，应通过 getter 从 messagesStore 获取。

### 3. chat-session/index.vue — 从两个独立 Store 渲染消息列表，导致重复渲染

- **文件**: `apps/client/pages/chat-session/index.vue`
- **问题**: 模板中使用 `v-for` 分别遍历 `messagesStore.messages` 和 `chatStore.messages` 两个数组来渲染消息气泡，两个数据源各自包含相同的消息记录。
- **影响**: 每条消息在 UI 上出现两次，与上一个问题的双重写入叠加，导致呈现给用户的是混乱的消息历史。
- **修复建议**: 模板中仅使用单一 `v-for` 遍历一个 Store 的消息列表，删除重复的渲染块。

### 4. chat-session/index.vue — 生产代码中硬编码 Mock 会话 ID

- **文件**: `apps/client/pages/chat-session/index.vue`
- **问题**: 聊天会话创建逻辑中使用了硬编码的 `session-${rawUserId}` 作为会话 ID，没有调用后端 API 来创建或获取真实的会话 ID。
- **影响**: 生产环境中所有用户的聊天会话都映射到本地构造的假 ID，后端无法识别这些会话，消息持久化和会话管理完全失效。
- **修复建议**: 移除硬编码，改为调用 `POST /api/sessions` 创建会话并获取服务端返回的真实 sessionId。

### 5. chat-session/index.vue — `sendVoice` 发送硬编码 `"[语音消息]"` 文本，语音功能未实现

- **文件**: `apps/client/pages/chat-session/index.vue`
- **问题**: `sendVoice()` 函数没有调用录音 API 获取音频数据，而是直接发送字符串 `"[语音消息]"` 到消息列表。
- **影响**: 用户点击语音按钮后，对方收到的是纯文本 `"[语音消息]"` 而非真实的语音内容，语音消息功能完全是空壳。
- **修复建议**: 集成 `uni.getRecorderManager()` 和 `uni.uploadFile()`，实现录音 → 上传 → 发送音频 URL 的完整语音消息流程。

---

## HIGH 发现

### 6. login/index.vue — 登录失败完全无错误处理，静默失败

- **文件**: `apps/client/pages/login/index.vue`
- **问题**: 微信登录调用 `loginWithWechat()` 后，代码中没有 `.catch()` 错误处理分支，也没有对返回值进行有效性校验。当 API 返回 4xx/5xx 或网络超时时，页面无任何反馈。
- **影响**: 用户在登录失败时看到的是永久加载状态或空白页，无法判断是网络问题、服务端问题还是账号问题，只能反复尝试或放弃使用。
- **修复建议**: 添加 try-catch 或 .catch() 处理，使用 `uni.showToast()` 显示具体错误信息。

### 7. discussions/index.vue — 完全缺失错误状态处理

- **文件**: `apps/client/pages/discussions/index.vue`
- **问题**: 页面加载数据时未处理加载中、加载失败、空数据三种状态。页面假设数据加载永远成功。
- **影响**: 网络异常或后端故障时，用户看到空白页面，没有任何重试按钮或错误提示。
- **修复建议**: 添加 `loading`、`error`、`empty` 三态处理，使用统一的错误状态组件。

### 8. chat/index.vue — `.stop` 事件修饰符在微信小程序中无效

- **文件**: `apps/client/pages/chat/index.vue`
- **问题**: 模板中使用了 `@tap.stop` 和 `@click.stop`，但微信小程序的 WXS 事件系统中不支持 Vue 的 `.stop` 事件修饰符。uni-app 编译为小程序时会静默丢弃该修饰符。
- **影响**: 事件冒泡未如预期阻止，可能导致父级元素的点击事件被意外触发，造成导航错误或误操作。
- **修复建议**: 改为在小程序端使用 `catchtap` 替代 `@tap.stop`，或通过条件编译区分平台。

### 9. chat-session/index.vue — fire-and-forget fetch + 同步数据访问导致竞态条件

- **文件**: `apps/client/pages/chat-session/index.vue`
- **问题**: 数据获取函数 `fetchMessages()` 被调用后，代码立即同步访问 Store 中的数据（假设数据已就绪），但 fetch 是异步的且未使用 await。
- **影响**: 页面可能渲染空消息列表，尤其在网络较慢时。用户看到的聊天记录不完整，刷新后可能又正常显示，行为不稳定。
- **修复建议**: 使用 `await` 等待数据加载完成后再进行页面渲染，或使用 loading 状态控制渲染时机。

### 10. chat/index.vue — 会话创建失败无错误反馈

- **文件**: `apps/client/pages/chat/index.vue`
- **问题**: 点击聊天对象创建新会话时，如果后端 API 创建会话失败，页面没有任何 toast 或错误提示，用户停留在当前页面但什么也没发生。
- **影响**: 用户在创建会话失败后反复点击同一用户头像，产生大量无效请求，且无法判断问题原因。
- **修复建议**: 添加会话创建失败的错误处理，向用户展示具体错误信息并提供重试选项。

### 11. discussions/index.vue — 底部 Tab 栏高亮错误，"likes" Tab 在论坛页面被激活

- **文件**: `apps/client/pages/discussions/index.vue`
- **问题**: 论坛页面底部导航栏的 `selected` 属性被错误设置为 `1`（对应 "likes" Tab），而非该页面对应的 Tab 索引。
- **影响**: 用户进入论坛页面时，底部 "喜欢" Tab 图标错误高亮，"论坛" Tab 图标保持未选中状态，造成导航位置混淆。
- **修复建议**: 修正 `selected` 属性值为正确的论坛 Tab 索引。

---

## 代表 MIDIUM 发现

| # | 文件 | 问题 |
|---|------|------|
| 12 | chat-session/index.vue | `onLoad` 中 `sessionId` 参数未校验，`null` 值时仍尝试 fetch |
| 13 | login/index.vue | 登录成功后 `uni.setStorageSync` 同步阻塞主线程 |
| 14 | activities/index.vue | `loadMoreData()` 无防抖——快速滚动触发数十次 API 请求 |
| 15 | chat/index.vue | 会话列表 `v-for` 缺少唯一稳定的 `:key`，使用 `index` 作为 key |
| 16 | chat-session/index.vue | `scroll-into-view` 的消息 ID 可能与实际 DOM id 不匹配 |
| 17 | discussions/index.vue | 点赞操作无乐观更新，用户需等待服务端响应后才能看到 UI 变化 |
| 18 | activities/index.vue | `formatTime()` 使用 `new Date()` 本地时区，用户看到的时间可能偏移 |
| 19 | login/index.vue | 验证码倒计时使用 `setInterval`，页面切后台后计时器继续运行导致倒计时不准 |
| 20 | chat/index.vue | 未读消息数角标在 `onHide` 时未更新，切后台期间收到新消息后回到前台显示旧数据 |
| 21 | chat-session/index.vue | 键盘弹起时消息列表未自动滚到底部，新消息可能被键盘遮挡 |
| 22 | activities/index.vue | 活动报名按钮点击后无 loading 状态，重复点击创建多个报名请求 |
| 23 | discussions/index.vue | 帖子列表分页加载更多时，加载失败的帖子项被静默丢弃 |

---

## 修复优先级建议

1. **立即修复 (CRITICAL)**: chat-session/index.vue 的 4 个 CRITICAL 问题——双重消息存储/渲染、硬编码 sessionId、语音消息空壳
2. **本周修复 (HIGH)**: login 错误处理、discussions 错误状态、chat/index 事件修饰符
3. **下个迭代 (MEDIUM)**: 竞态条件、防抖、loading 状态
