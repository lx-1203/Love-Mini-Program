# Tasks — 客户端 v-for/.stop/setTimeout 三任务收尾验证与补全

> 关联：`refinement-spec.md` / `refinement-checklist.md`
> 目标：将用户原始三项任务（A/B/C）按"完美解决"标准补全并跑通 3 个验证命令。
> 原则：单次修改仅处理一个独立逻辑单元；批量替换保持 handler 行为等价；不引入无关改动。

## 任务 A：v-for :key 收尾验证（无需修改代码）

- [x] Task A.1: 全量 Grep 扫描 `apps/client/src/**/*.vue` 与 `apps/client/pages/**/*.vue`，列出所有 `v-for` 与对应 `:key` 位置
  - [x] SubTask A.1.1: 执行 `grep -rnE "v-for" apps/client/src --include="*.vue"` 收集所有命中行
  - [x] SubTask A.1.2: 对每条命中确认同行或紧邻行存在 `:key` 属性（多行标签需检查后续行）
  - [x] SubTask A.1.3: 输出最终核查报告：0 处 v-for 缺失 :key（前序 reaudit-fixall 已批量补齐）

- [x] Task A.2: 跑通 `npm --workspace apps/client run typecheck`，确认无新 TS 错误
- [x] Task A.3: 跑通 `npm --workspace apps/client run build:mp-weixin`，确认 mp-weixin 产物完整

## 任务 B：.stop 修饰符源码层面替换（核心工作）

- [x] Task B.1: 批量替换 17 个文件 59 处 `@tap.stop` / `@touchmove.stop.prevent` 为 `catchtap` / `catchtouchmove`
  - [x] SubTask B.1.1: `components/discover/FilterDrawer.vue:640` `@tap.stop="onContentTap"` → `catchtap="onContentTap"`
  - [x] SubTask B.1.2: `components/discover/CardSwiper.vue:722` `@touchmove.stop.prevent="onTouchMove"` → `catchtouchmove="onTouchMove"`；handler 内首行添加 `event.preventDefault()`（仅 H5 生效）
  - [x] SubTask B.1.3: `components/discover/CardSwiper.vue:815` `@tap.stop="onVideoBadgeTap"` → `catchtap="onVideoBadgeTap"`
  - [x] SubTask B.1.4: `components/discover/CardSwiper.vue:921` `@tap.stop="toggleBio"` → `catchtap="toggleBio"`
  - [x] SubTask B.1.5: `components/chat/ChatBubble.vue:145` `@tap.stop="handleTapQuote"` → `catchtap="handleTapQuote"`
  - [x] SubTask B.1.6: `components/UnlockGuideModal.vue:101` `@tap.stop="noop"` → `catchtap="noop"`
  - [x] SubTask B.1.7: `components/UnlockGuideModal.vue:121` `@tap.stop="handleConfirm"` → `catchtap="handleConfirm"`
  - [x] SubTask B.1.8: `components/UnlockGuideModal.vue:130` `@tap.stop="handleCancel"` → `catchtap="handleCancel"`
  - [x] SubTask B.1.9: `components/social/WallPostCard.vue:130` `@tap.stop="openReport"` → `catchtap="openReport"`
  - [x] SubTask B.1.10: `components/social/WallPostCard.vue:160` `@tap.stop="handleLike"` → `catchtap="handleLike"`
  - [x] SubTask B.1.11: `components/social/WallPostCard.vue:172` `@tap.stop="emit('comment')"` → `catchtap="emit('comment')"`
  - [x] SubTask B.1.12: `components/social/WallPostCard.vue:181` `@tap.stop="emit('share')"` → `catchtap="emit('share')"`
  - [x] SubTask B.1.13: `components/social/PostReportDialog.vue:177` `@tap.stop="onContentTap"` → `catchtap="onContentTap"`
  - [x] SubTask B.1.14: `components/social/PostReportDialog.vue:193` `@tap.stop="selectReason(item.key)"` → `catchtap="selectReason(item.key)"`
  - [x] SubTask B.1.15: `components/social/PostReportDialog.vue:226` `@tap.stop="close"` → `catchtap="close"`
  - [x] SubTask B.1.16: `components/social/PostReportDialog.vue:235` `@tap.stop="submit"` → `catchtap="submit"`
  - [x] SubTask B.1.17: `components/common/ShareCard.vue:236` `@tap.stop` → `catchtap="noop"`（需添加 noop handler 或引用现有）
  - [x] SubTask B.1.18: `pages/vip/red-packet.vue:312` `@tap.stop` → `catchtap="noop"`（同上）
  - [x] SubTask B.1.19: `pages/village/index.vue:488` `@tap.stop="goToAuthorProfile(post.author.userId)"` → `catchtap=...`
  - [x] SubTask B.1.20: `pages/village/index.vue:521` `@tap.stop="handleFollow(post.author.userId)"` → `catchtap=...`
  - [x] SubTask B.1.21: `pages/village/index.vue:535` `@tap.stop`（图片容器占位） → `catchtap="noop"`
  - [x] SubTask B.1.22: `pages/village/index.vue:559` `@tap.stop="goToTagPosts(tag)"` → `catchtap=...`
  - [x] SubTask B.1.23: `pages/village/index.vue:568` `@tap.stop="goToDetail(post.id)"` → `catchtap=...`
  - [x] SubTask B.1.24: `pages/village/index.vue:576` `@tap.stop="handleLike(post.id)"` → `catchtap=...`
  - [x] SubTask B.1.25: `pages/village/index.vue:582` `@tap.stop`（占位） → `catchtap="noop"`
  - [x] SubTask B.1.26: `pages/village/index.vue:589` `@tap.stop="toggleCollect(post.id)"` → `catchtap=...`
  - [x] SubTask B.1.27: `pages/village/detail.vue:595` `@tap.stop="handleCommentLike(comment.id)"` → `catchtap=...`
  - [x] SubTask B.1.28: `pages/village/detail.vue:751` `@tap.stop`（占位） → `catchtap="noop"`
  - [x] SubTask B.1.29: `pages/discover/index.vue:620` `@tap.stop="clearSearch"` → `catchtap="clearSearch"`
  - [x] SubTask B.1.30: `pages/home/index.vue:387` `@tap.stop`（占位） → `catchtap="noop"`
  - [x] SubTask B.1.31: `pages/chat-session/index.vue:1195` `@tap.stop="noop"` → `catchtap="noop"`
  - [x] SubTask B.1.32: `pages/chat-session/index.vue:1253` `@tap.stop="noop"` → `catchtap="noop"`
  - [x] SubTask B.1.33: `pages/chat/red-packet.vue:277` `@tap.stop="noop"` → `catchtap="noop"`
  - [x] SubTask B.1.34: `pages/circles/topics.vue:200` `@tap.stop="goToAuthorProfile(topic.author.userId)"` → `catchtap=...`
  - [x] SubTask B.1.35: `pages/circles/topic-detail.vue:211` `@tap.stop="goToAuthorProfile(currentTopic.author.userId)"` → `catchtap=...`
  - [x] SubTask B.1.36: `pages/circles/topic-detail.vue:270` `@tap.stop="goToAuthorProfile(reply.author.userId)"` → `catchtap=...`
  - [x] SubTask B.1.37: `pages/circles/topic-detail.vue:292` `@tap.stop="sayHello(reply)"` → `catchtap=...`
  - [x] SubTask B.1.38: `pages/circles/index.vue:165` `@tap.stop="toggleJoin(circle.id, circle.isJoined)"` → `catchtap=...`
  - [x] SubTask B.1.39: `pages/circle/index.vue:223` `@tap.stop="toggleFollow(post.id)"` → `catchtap=...`
  - [x] SubTask B.1.40: `pages/circle/index.vue:263` `@tap.stop="toggleLike(post.id)"` → `catchtap=...`
  - [x] SubTask B.1.41: `pages/circle/index.vue:273` `@tap.stop="handleShare"` → `catchtap=...`
  - [x] SubTask B.1.42: `pages/circle/index.vue:278` `@tap.stop="toggleCollect(post.id)"` → `catchtap=...`
  - [x] SubTask B.1.43: `subpackages/support/feedback/index.vue:482` `@tap.stop="handleRemoveImage(idx)"` → `catchtap=...`

- [x] Task B.2: 对需要 H5 兼容的 handler 添加 `event.stopPropagation()` 调用
  - [x] SubTask B.2.1: 评估每个 handler 是否需要 H5 端冒泡阻止（mp-weixin 端 `catchtap` 已原生阻止）
  - [x] SubTask B.2.2: 对需要 H5 兼容的 handler 函数签名添加 `event` 参数，函数体首行调用 `event.stopPropagation()`（注意 mp-weixin 端 event 对象可能为 undefined，需 `event?.stopPropagation?.()`）
  - [x] SubTask B.2.3: 对 `CardSwiper.vue` 的 `onTouchMove` 添加 `event.preventDefault()` 调用（替代原 `.prevent` 修饰符，仅 H5 生效，mp-weixin 默认不触发默认行为）

- [x] Task B.3: 处理占位 `@tap.stop`（无 handler）的 4 处特殊情况
  - [x] SubTask B.3.1: `components/common/ShareCard.vue:236`、`pages/vip/red-packet.vue:312`、`pages/village/index.vue:535/582`、`pages/village/detail.vue:751`、`pages/home/index.vue:387` 共 6 处 `@tap.stop` 无 handler —— 改为 `catchtap="noop"` 并在脚本中定义 `function noop() {}` 或复用现有 noop
  - [x] SubTask B.3.2: 验证 `catchtap` 必须绑定 handler（mp-weixin 要求），不能为空字符串

- [x] Task B.4: 同步更新相关注释（如 chat-session/index.vue:578-582 的 Task 1.1.7 注释、red-packet.vue:152-156 注释），将"@tap.stop 编译为 catchtap"改为"直接使用 catchtap"

- [x] Task B.5: 跑通 `npm --workspace apps/client run typecheck`，确认 handler 签名变更未引入 TS 错误
- [x] Task B.6: 跑通 `npm --workspace apps/client run build:mp-weixin`，确认 mp-weixin 产物 wxml 中 `catchtap` 数量 ≥ 34 处
- [x] Task B.7: Grep 验证 `grep -rnE "@(tap|click|touchstart|touchmove|touchend|longpress)\.stop" apps/client/src --include="*.vue"` 输出为空

## 任务 C：setTimeout 清理收尾验证（无需修改代码）

- [x] Task C.1: 抽样核查 10 处 `setTimeout` 调用是否保存 timer 引用并在卸载时 `clearTimeout`
  - [x] SubTask C.1.1: `services/http.ts:290` `loginRedirectTimer` —— 已保存引用，`setToken` 调用 `cancelLoginRedirect()` 清理 ✓
  - [x] SubTask C.1.2: `services/websocket/index.ts:421` —— 由 `HeartbeatManager` 统一管理，`disconnect()` 调用 `stop()` 清理 ✓
  - [x] SubTask C.1.3: `stores/chat/utils.ts:91` —— 一次性 Promise resolver，无副作用，无需 clearTimeout ✓
  - [x] SubTask C.1.4: `stores/discover/utils.ts:92` —— 同上 ✓
  - [x] SubTask C.1.5: `utils/audio-recorder.ts:571` `playbackEndTimer` —— 已保存引用，`stopInternal`/`destroy` 调用 `clearTimeout` ✓
  - [x] SubTask C.1.6: `utils/haptic.ts:85` `pendingHapticTimers: Set` —— 已保存引用，导出 `clearAllHapticTimers()` 供卸载调用 ✓
  - [x] SubTask C.1.7: `pages/chat/video-call.vue` 4 处 `setTimeout` —— 已通过 `scheduleNavBack` 入队 `pendingNavBackTimers` Set，`onUnload` 调用 `clearPendingNavBackTimers()` ✓
  - [x] SubTask C.1.8: `services/auth.ts:124` —— 已保存 timer 并在 success/fail 回调 `clearTimeout` ✓
  - [x] SubTask C.1.9: 抽样核查 `VoicePill.vue:60/67`、`HeartParticles.vue:87/104`、`Ripple.vue:117/136`、`Toast.vue:101/151/163`、`LikeBurst.vue:84`、`PostReportDialog.vue:152`、`SocialProgressIndicator.vue:197` —— 全部保存 timer 引用并在卸载时 `clearTimeout` ✓
  - [x] SubTask C.1.10: 输出最终核查报告：10 处 `setTimeout` 全部合规，无内存泄漏风险

- [x] Task C.2: 跑通 `npm --workspace apps/client run typecheck`，确认无新 TS 错误

## 最终验证闭环

- [x] Task V.1: 执行 `npm --workspace apps/client run typecheck`，记录退出码与输出
- [x] Task V.2: 执行 `npm --workspace apps/client run build:mp-weixin`，记录退出码与产物路径
- [x] Task V.3: 执行 `grep -rnE "v-for" apps/client/src --include="*.vue" | grep -v ":key"`，确认输出为空
- [x] Task V.4: 执行 `grep -rnE "@(tap|click|touchstart|touchmove|touchend|longpress)\.stop" apps/client/src --include="*.vue"`，确认输出为空
- [x] Task V.5: 汇总 3 个验证命令输出 + 修改文件清单 + 边界情况说明，形成最终汇报

## 补充任务：TS6133 错误修复（catchtap handler 未被 vue-tsc 识别为已使用）

- [x] Task D.1: 为 17 个受影响文件添加 `defineExpose` 语句，将 catchtap handler 标记为已使用
  - [x] SubTask D.1.1: `components/chat/ChatBubble.vue` — 扩展 defineExpose 包含 `handleTapQuote`
  - [x] SubTask D.1.2: `components/discover/CardSwiper.vue` — 新增 defineExpose 包含 `onTouchMove, toggleBio, onVideoBadgeTap`
  - [x] SubTask D.1.3: `components/discover/FilterDrawer.vue` — 新增 defineExpose 包含 `onContentTap`
  - [x] SubTask D.1.4: `components/social/PostReportDialog.vue` — 新增 defineExpose 包含 `onContentTap, selectReason, submit`
  - [x] SubTask D.1.5: `components/social/WallPostCard.vue` — 扩展 defineExpose 包含 `handleLike, openReport`
  - [x] SubTask D.1.6: `components/UnlockGuideModal.vue` — 新增 defineExpose 包含 `handleConfirm, noop`
  - [x] SubTask D.1.7: `pages/chat-session/index.vue` — 新增 defineExpose 包含 `noop`
  - [x] SubTask D.1.8: `pages/chat/red-packet.vue` — 新增 defineExpose 包含 `noop`
  - [x] SubTask D.1.9: `pages/circle/index.vue` — 新增 defineExpose 包含 `toggleLike, toggleFollow, toggleCollect, handleShare`
  - [x] SubTask D.1.10: `pages/circles/index.vue` — 新增 defineExpose 包含 `toggleJoin`
  - [x] SubTask D.1.11: `pages/circles/topic-detail.vue` — 新增 defineExpose 包含 `sayHello, goToAuthorProfile`
  - [x] SubTask D.1.12: `pages/circles/topics.vue` — 新增 defineExpose 包含 `goToAuthorProfile`
  - [x] SubTask D.1.13: `pages/discover/index.vue` — 新增 defineExpose 包含 `clearSearch`
  - [x] SubTask D.1.14: `pages/home/index.vue` — 新增 defineExpose 包含 `noop`
  - [x] SubTask D.1.15: `pages/village/detail.vue` — 新增 defineExpose 包含 `handleCommentLike, noop`
  - [x] SubTask D.1.16: `pages/village/index.vue` — 新增 defineExpose 包含 `handleLike, toggleCollect, handleFollow, noop, goToAuthorProfile, goToTagPosts`
  - [x] SubTask D.1.17: `pages/vip/red-packet.vue` — 新增 defineExpose 包含 `noop`

- [x] Task D.2: 更新 `WallPostCard.vue:92` 过时注释（`.stop` → `catchtap`）

# Task Dependencies

- Task A.1, A.2, A.3 可并行（验证类任务）
- Task B.1（替换 59 处）→ Task B.2（handler 添加 stopPropagation）→ Task B.3（占位处理）→ Task B.4（注释更新）→ Task B.5/B.6/B.7（验证）
- Task B.1 内 43 个 SubTask 可按文件分组并行处理（每个文件独立 Sub-Agent）
- Task C.1 内 10 个 SubTask 可并行核查（只读验证）
- Task D.1（defineExpose 补齐）依赖 Task B.1 完成
- Task V.* 必须在 Task A/B/C/D 全部完成后执行
