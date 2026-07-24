# 匹配卡片首屏体验打磨 - Implementation Tasks

## Task 1: 确认并修复应用首屏入口

- [x] **Step 1.1: 检查 TabBar 与导航配置**
  - 文件：`apps/client/src/custom-tab-bar/index.js`、`apps/client/src/config/navigation.ts`
  - 确认 discover 为 TabBar 第一项，路径为 `/pages/discover/index`

- [x] **Step 1.2: 检查启动默认页配置**
  - 文件：`apps/client/src/pages.json`（或 `manifest.json`、`App.vue`）
  - 确认启动后首个页面为 discover/index

- [x] **Step 1.3: 验证 useTabBar(0)**
  - 文件：`apps/client/src/pages/discover/index.vue`
  - 确认已调用 `useTabBar(0)`，使底部 TabBar 选中"匹配"

## Task 2: 打磨 CardSwiper 卡片视觉与信息层级

- [x] **Step 2.1: 强化主视觉区**
  - 图片比例保持 4:5 或类似展示比例
  - 多图时展示照片墙 swiper 与分页指示器
  - 图片兜底与加载占位符合项目规范

- [x] **Step 2.2: 突出展示姓名、年龄、性格、收入、社交圈**
  - 姓名使用大字号 display 风格
  - 年龄/学校/认证信息紧凑排列
  - 性格标签使用 pill/chip 样式，最多展示 3-4 个
  - 收入范围与匹配度使用高亮样式
  - 社交圈/共同兴趣圈以图标 + 文字形式展示

- [x] **Step 2.3: 提升卡片质感**
  - 添加圆角、阴影、微边框、渐变遮罩
  - 底部信息区使用渐变遮罩保证文字可读
  - 卡片堆叠时露出下一张卡片边缘，增强层次感

## Task 3: 优化滑动/拖动/点击/长按交互状态

- [x] **Step 3.1: 拖动与滑动反馈**
  - 卡片随手指移动并带旋转
  - 移动超过阈值显示"喜欢"/"跳过"浮层标签
  - 释放后飞出动画流畅，下一张卡片自然顶上

- [x] **Step 3.2: 点击展开详情**
  - 点击当前卡片触发 `showDetail = true`
  - 从卡片位置平滑放大展开至全屏居中
  - 动画时长控制在 300-400ms，使用 cubic-bezier 缓动

- [x] **Step 3.3: 长按调出快捷菜单**
  - 长按超过 500ms 触发 `LongPressMenu`
  - 移动超过 10px 取消长按识别
  - 菜单项：举报、不感兴趣、分享（视项目能力而定）
  - 菜单弹出/关闭带淡入淡出动画

## Task 4: 打磨 CardDetailOverlay 详情全屏展示

- [x] **Step 4.1: 顶部照片墙与基本信息**
  - 全屏顶部 swiper 展示照片墙
  - 姓名、年龄、学校、认证叠加于图片底部渐变
  - 关闭按钮与下滑关闭手势可用

- [x] **Step 4.2: 详细资料区**
  - 身高、学历、收入、年龄、性格标签、个人简介
  - 信息分组展示，使用卡片/列表样式

- [x] **Step 4.3: 社交圈/兴趣圈展示**
  - 展示用户加入的圈子或共同兴趣圈
  - 每个圈子展示图标、名称、成员数

- [x] **Step 4.4: 底部操作栏**
  - 跳过、超级喜欢、喜欢、发消息按钮
  - 事件正确发射到父组件
  - 点击"发消息"使用 `userId` 导航到 chat-session

## Task 5: 验证喜欢/匹配/聊天闭环

- [x] **Step 5.1: 右滑喜欢与超级喜欢**
  - 右滑调用 `discoverStore.swipeRight`
  - 超级喜欢调用 `discoverStore.swipeRight(cardId, true)`
  - 匹配成功时触发双头像动画并跳转 likes 页

- [x] **Step 5.2: 喜欢列表同步**
  - 右滑/超级喜欢后将目标用户同步到 likes store
  - `/pages/likes/index` 中"喜欢我的"/"我发出的喜欢"列表可见

- [x] **Step 5.3: 从详情/匹配进入聊天**
  - 详情页"发消息"导航到 `/pages/chat-session/index?userId={userId}`
  - likes 页匹配项点击可进入聊天

## Task 6: 验证 chat-session 文字与语音消息

- [x] **Step 6.1: 文字消息发送**
  - 输入框非空时发送按钮高亮
  - 点击发送调用对应 store 方法
  - 发送成功后消息追加到列表，输入框清空
  - 失败时 `uni.showToast` 提示

- [x] **Step 6.2: 语音消息发送**
  - 语音模式切换可用
  - 长按录音，松开发送
  - 录音时间 <1s 提示"说话时间太短"
  - mp-weixin 使用 `uni.getRecorderManager`，H5 提供降级提示

## Task 7: 运行类型检查与构建验证

- [x] **Step 7.1: 类型检查**
  - 命令：`cd apps/client && pnpm run typecheck`
  - 确认无新增类型错误

- [ ] **Step 7.2: 微信小程序构建**
  - 命令：`cd apps/client && pnpm run build:mp-weixin`
  - 确认构建成功

- [x] **Step 7.3: 单元测试**
  - 命令：`cd apps/client && pnpm run test:unit`
  - 确认相关测试通过

# Task Dependencies

- Task 2 依赖 Task 1（首屏入口确定后再打磨卡片）
- Task 3 与 Task 4 可并行
- Task 5 依赖 Task 3、Task 4（交互事件需先可用）
- Task 6 可独立并行验证
- Task 7 依赖前面所有任务
