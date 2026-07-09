# Tasks - 核心体验重做（4 阶段）

> **执行原则**：分阶段串行执行，每阶段完成后验证；阶段内子任务可并行。

---

## Phase 1: 基础调整（首页背景 + tabBar 顺序）

- [ ] Task 1: 首页背景改纯蓝色渐变
  - [ ] SubTask 1.1: 移除 `pages/home/index.vue` 中的 `<image>` 海报背景层与 `home-bg` 容器
  - [ ] SubTask 1.2: 修改 `.home-page` 样式，背景改为 `linear-gradient(180deg, #5B7FFF 0%, #7C9BFF 100%)`
  - [ ] SubTask 1.3: 调整学校选择器位置：`.home-header` 增加 `padding-top: calc(env(safe-area-inset-top) + 24rpx)`
  - [ ] SubTask 1.4: 调整首页内文字、卡片颜色以适配蓝色背景（白色文字、半透明白底卡片）

- [ ] Task 2: tabBar 顺序与默认页调整
  - [ ] SubTask 2.1: 修改 `src/pages.json`（或 manifest 配置）将 `pages/discover/index` 移到 pages 数组首位（默认进入页）
  - [ ] SubTask 2.2: 修改 `src/custom-tab-bar/index.js` 的 tabBar list 顺序为：discover → village → home → chat → profile
  - [ ] SubTask 2.3: 修改 `src/config/navigation.ts` 中 TAB_ITEMS 顺序与上同步
  - [ ] SubTask 2.4: 修改 `src/components/layout/TabBar.vue` 的 defaultTabs 顺序同步
  - [ ] SubTask 2.5: 修改 `app.json` 构建产物的 tabBar.list 顺序（构建后自动生成，验证即可）

- [ ] Task 3: 修复 tabBar 圈子图标切换问题
  - [ ] SubTask 3.1: 检查 `custom-tab-bar/index.js` 的 `switchTab` 方法，确认 selected 字段更新逻辑
  - [ ] SubTask 3.2: 验证 village-active.png 图标文件存在且路径正确
  - [ ] SubTask 3.3: 修复 `setData` 调用，确保 selectedIconPath 正确切换

---

## Phase 2: 圈子页面贴吧式重做

- [ ] Task 4: 圈子页面布局重做
  - [ ] SubTask 4.1: 重写 `pages/village/index.vue` 顶部 banner（保留村口主题，但采用贴吧式 header）
  - [ ] SubTask 4.2: 帖子列表改为贴吧式卡片：每张卡片包含 [头像] [楼主昵称 + 楼主标识] [标题] [内容预览 2 行] [底部分区标签 + 回复数 + 时间]
  - [ ] SubTask 4.3: 添加分区筛选 tab（热门 / 最新 / 校园 / 情感 / 学习），点击切换帖子列表
  - [ ] SubTask 4.4: 强化视觉层次：楼主标识用蓝色徽章、分区标签用色块、回复数图标 + 数字
  - [ ] SubTask 4.5: 帖子卡片添加点击跳转 `pages/village/detail?id=xxx`

- [ ] Task 5: 圈子页面数据强化
  - [ ] SubTask 5.1: 扩充 `stores/village.ts` mock 数据：至少 8 条帖子，覆盖不同分区
  - [ ] SubTask 5.2: 帖子数据添加 `authorAvatar`、`authorName`、`section`、`replyCount`、`isOP` 字段
  - [ ] SubTask 5.3: 帖子头像引用真实 avatar-N.jpg 图片

---

## Phase 3: 匹配功能完全重做

- [ ] Task 6: 匹配卡片滑动组件
  - [ ] SubTask 6.1: 新建 `components/discover/SwipeCard.vue` - 单张滑动卡片（头像、姓名、年龄、标签、个人简介）
  - [ ] SubTask 6.2: 新建 `components/discover/SwipeCardStack.vue` - 卡片堆叠容器（管理卡片栈、滑动事件、动画）
  - [ ] SubTask 6.3: 实现触摸滑动：左滑（skip）、右滑（like），滑动时卡片旋转 + 透明度变化
  - [ ] SubTask 6.4: 实现底部操作按钮：跳过（圆形灰色）、喜欢（圆形粉色）、超级喜欢（圆形蓝色）
  - [ ] SubTask 6.5: 滑动结束后加载下一张卡片，卡片耗尽显示「暂无更多推荐」

- [ ] Task 7: 匹配成功逻辑与弹窗
  - [ ] SubTask 7.1: 在 `stores/discover.ts` 中实现 mock 匹配逻辑：右滑有 30% 概率匹配成功
  - [ ] SubTask 7.2: 新建 `components/discover/MatchSuccessModal.vue` - 匹配成功弹窗（双人头像、爱心动画、「开始聊天」按钮）
  - [ ] SubTask 7.3: 匹配成功后弹出 Modal，点击「开始聊天」跳转 `pages/chat-session/index?id=xxx`
  - [ ] SubTask 7.4: 滑动统计：今日喜欢数、匹配数（顶部展示）

- [ ] Task 8: 重写 `pages/discover/index.vue` 主体
  - [ ] SubTask 8.1: 移除旧的「立即签到」入口（签到功能保留在首页）
  - [ ] SubTask 8.2: 顶部 header：标题「寻觅」+ 今日匹配统计 chip
  - [ ] SubTask 8.3: 主体区域：SwipeCardStack 卡片堆叠
  - [ ] SubTask 8.4: 底部操作按钮区：跳过 / 喜欢 / 超级喜欢
  - [ ] SubTask 8.5: 底部次级入口：匹配历史、喜欢我的（跳转 likes 页）

---

## Phase 4: 消息页面与聊天会话重做

- [ ] Task 9: 修复消息列表页 `pages/chat/index.vue`
  - [ ] SubTask 9.1: 顶部 header：「消息」标题 + 搜索图标
  - [ ] SubTask 9.2: 会话列表卡片：[头像] [昵称] [最后一条消息预览] [时间] [未读数红点]
  - [ ] SubTask 9.3: 点击会话跳转 `pages/chat-session/index?id=xxx`
  - [ ] SubTask 9.4: mock 数据至少 5 条会话，覆盖不同状态（已读、未读、匹配成功）

- [ ] Task 10: 重做聊天会话页 `pages/chat-session/index.vue`
  - [ ] SubTask 10.1: 顶部导航栏：[返回按钮 ←] [对方昵称] [更多 ...]，返回按钮调用 `uni.navigateBack()`
  - [ ] SubTask 10.2: 消息气泡区域：自己（右侧蓝色气泡）、对方（左侧白色气泡），每条消息带时间戳
  - [ ] SubTask 10.3: 底部输入栏：[语音/键盘切换图标] [文字输入框 / 按住说话按钮] [发送按钮]
  - [ ] SubTask 10.4: 文字输入：输入后点击发送，消息追加到列表，输入框清空
  - [ ] SubTask 10.5: 语音模式：切换后显示「按住说话」按钮，长按录音、松开发送（mock 实现，录音时长 1-3 秒）
  - [ ] SubTask 10.6: mock 自动回复：发送消息后 1.5 秒，对方自动回复一条预设消息

- [ ] Task 11: 聊天 mock 数据与 store
  - [ ] SubTask 11.1: 新建 `stores/chat.ts` - 管理会话列表与消息记录
  - [ ] SubTask 11.2: mock 至少 5 条会话，每条会话有 3-5 条历史消息
  - [ ] SubTask 11.3: 实现 `sendMessage`、`receiveMessage`、`switchSession` actions

---

## Phase 5: 构建验证

- [ ] Task 12: 重新构建 mp-weixin
  - [ ] SubTask 12.1: 执行 `npm --workspace apps/client run build:mp-weixin`
  - [ ] SubTask 12.2: 验证构建无错误
  - [ ] SubTask 12.3: 验证 `dist/build/mp-weixin/app.json` 的 tabBar 顺序与 pages 数组首位为 discover
  - [ ] SubTask 12.4: 验证所有图片资源完整

- [ ] Task 13: 微信开发者工具截图验证
  - [ ] SubTask 13.1: 启动后默认进入匹配页，截图 01-discover.png
  - [ ] SubTask 13.2: 切换到圈子页（贴吧式），截图 02-village.png
  - [ ] SubTask 13.3: 切换到首页（纯蓝背景），截图 03-home.png
  - [ ] SubTask 13.4: 切换到消息页，截图 04-chat.png
  - [ ] SubTask 13.5: 进入聊天会话页（含返回按钮），截图 05-chat-session.png
  - [ ] SubTask 13.6: 在匹配页右滑，截图 06-match-like.png
  - [ ] SubTask 13.7: 匹配成功弹窗，截图 07-match-success.png
  - [ ] SubTask 13.8: 撰写 `test-screenshots/2026-07-02-core-rebuild/verification-report.md`

---

# Task Dependencies

- Task 2 依赖 Task 1（首页调整完后再调 tabBar，避免相互影响）
- Task 3 与 Task 4 可并行（修复 tabBar 与重做圈子页面无依赖）
- Task 6/7/8 串行（SwipeCard → MatchModal → discover 主页整合）
- Task 9/10/11 可并行（消息列表、聊天会话、chat store 互相独立）
- Task 12 依赖所有前置任务完成
- Task 13 依赖 Task 12 构建成功
