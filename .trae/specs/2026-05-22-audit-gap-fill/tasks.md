# Tasks

## Phase 1: 村口页补齐（接入已实现 Store）

- [x] Task 1.1: 重构村口首页 `village/index.vue`
  - [x] SubTask 1.1.1: 接入 `useVillageStore`，替换占位符内容
  - [x] SubTask 1.1.2: 实现三标签 Tab：关注 / 同城 / 发现
  - [x] SubTask 1.1.3: 实现六分类横向滚动筛选栏：全部 / 兴趣圈 / 诚意帖 / 同乡 / 蒙面 / 最新
  - [x] SubTask 1.1.4: 实现帖子卡片列表（复用 village store 中的 PostItem 接口）
  - [x] SubTask 1.1.5: 帖子卡片展示：作者身份标签、图文内容、话题标签、互动数据
  - [x] SubTask 1.1.6: 实现点赞（toggle like）和关注（toggle follow）UI 交互
  - [x] SubTask 1.1.7: 帖子卡片点击跳转详情页（复用已实现的 `detail.vue`）
  - [x] SubTask 1.1.8: 实现悬浮+按钮，点击跳转发帖页（复用已实现的 `post.vue`）
  - [x] SubTask 1.1.9: 实现下拉刷新和上拉加载更多
  - **验证**：村口页可正常浏览帖子列表、切换标签/分类、发帖、点击进入详情

## Phase 2: 我的页完整化

- [x] Task 2.1: 重构"我的"页 `profile/index.vue`
  - [x] SubTask 2.1.1: 展示用户头像、昵称、学校（接入 `useSessionStore`）
  - [x] SubTask 2.1.2: 展示资料完善度进度条（使用 `profileCompletion` getter）
  - [x] SubTask 2.1.3: 展示关注数 / 粉丝数
  - [x] SubTask 2.1.4: 展示个人简介
  - [x] SubTask 2.1.5: 编辑资料入口 → 跳转 `subpackages/setup/profile/index`
  - [x] SubTask 2.1.6: 推荐计划设置入口 → 跳转推荐计划设置页
  - [x] SubTask 2.1.7: 反馈中心入口 → 跳转 `subpackages/support/feedback/index`
  - [x] SubTask 2.1.8: 学校认证入口 → 跳转 `subpackages/setup/campus/index`
  - [x] SubTask 2.1.9: 关于/设置等通用入口
  - **验证**："我的"页展示完整信息，所有入口可正常跳转

## Phase 3: 推荐计划设置（新增功能）

- [x] Task 3.1: 创建推荐偏好后端 API
  - [x] SubTask 3.1.1: 在 `RecommendationController` 新增 `GET /api/recommendations/preferences` 接口
  - [x] SubTask 3.1.2: 在 `RecommendationController` 新增 `PUT /api/recommendations/preferences` 接口
  - [x] SubTask 3.1.3: 实现 `RecommendationService` 中的偏好读写逻辑
  - [x] SubTask 3.1.4: 更新 `docs/openapi/recommendations.yaml`，新增偏好设置 Schema
  - **验证**：API 可正常读写推荐偏好，lint 通过

- [x] Task 3.2: 创建推荐计划设置前端页面
  - [x] SubTask 3.2.1: 创建 `subpackages/setup/recommend-pref/index.vue` 页面
  - [x] SubTask 3.2.2: 在 `pages.json` 中注册新页面到 setup 子包
  - [x] SubTask 3.2.3: 实现每日推荐时间选择器（10:00 / 12:00 / 14:00 / 18:00 选项）
  - [x] SubTask 3.2.4: 实现推荐范围选择器（同校优先 / 同城 / 不限）
  - [x] SubTask 3.2.5: 保存按钮调用 API 持久化设置
  - [x] SubTask 3.2.6: 在"我的"页添加推荐计划设置入口
  - **验证**：设置页功能完整，偏好可保存并回显

## Phase 4: 线下活动整合

- [x] Task 4.1: 重构活动页 `pages/activities/index.vue`
  - [x] SubTask 4.1.1: 移除对废弃 `useHomeStore` 的依赖
  - [x] SubTask 4.1.2: 创建 `useActivityStore` 或扩展现有 Store 管理活动数据
  - [x] SubTask 4.1.3: 调用 `GET /api/recommendations/activities` 获取活动列表
  - [x] SubTask 4.1.4: 活动列表展示：标题、地点、时间摘要
  - [x] SubTask 4.1.5: 活动详情展示完整信息
  - [x] SubTask 4.1.6: 实现"感兴趣" / "参加"按钮交互
  - **验证**：活动页正常展示列表，点击可查看详情，报名功能可用

- [x] Task 4.2: 寻觅页底部嵌入活动推荐
  - [x] SubTask 4.2.1: 在卡片浏览完后（`remainingCount === 0` 或 `cards.length === 0`）展示活动推荐板块
  - [x] SubTask 4.2.2: 活动推荐展示：标题、地点、时间
  - [x] SubTask 4.2.3: 点击跳转活动详情
  - **验证**：卡片用完后正确展示活动推荐

## Phase 5: 联调与验证

- [x] Task 5.1: 全链路验证
  - [x] SubTask 5.1.1: 村口→发帖→评论→点赞→详情→私信 完整链路
  - [x] SubTask 5.1.2: 我的→编辑资料→完善→解锁 完整链路
  - [x] SubTask 5.1.3: 我的→推荐计划设置→保存偏好 完整链路
  - [x] SubTask 5.1.4: 寻觅→卡片用尽→活动推荐→活动详情→报名 完整链路
  - [x] SubTask 5.1.5: mock 模式下所有链路可用
  - **验证**：所有新链路在 mock 模式下正常运行

# Task Dependencies

- Task 1.1 独立，无前置依赖（Store 已实现）
- Task 2.1 独立，无前置依赖（SessionStore 已实现）
- Task 3.1 → Task 3.2（前端依赖后端 API）
- Task 4.1 独立，可与其他任务并行
- Task 4.2 依赖 Task 4.1（活动数据来源）
- Task 5.1 依赖所有任务完成

# 可并行执行

- Task 1.1、Task 2.1、Task 3.1、Task 4.1 可同时启动（相互独立）