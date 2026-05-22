# Tasks

## Phase 1: 基础架构与数据模型（Week 1）

- [x] Task 1.1: 重构导航与页面结构
  - [x] SubTask 1.1.1: 更新 `apps/client/src/pages.json`，调整为寻觅/喜欢/村口/消息/我的五入口
  - [x] SubTask 1.1.2: 更新 `apps/client/src/config/navigation.ts`，配置新TabBar
  - [x] SubTask 1.1.3: 创建新页面目录结构：`pages/discover/`、`pages/likes/`、`pages/village/`、`pages/messages/`
  - **验证**：TabBar切换正常，五个入口均可访问

- [x] Task 1.2: 设计并创建核心数据模型
  - [x] SubTask 1.2.1: 创建 `Like` 模型（用户ID、目标用户ID、状态、创建时间）
  - [x] SubTask 1.2.2: 创建 `Visitor` 模型（访客ID、被访用户ID、访问时间）
  - [x] SubTask 1.2.3: 创建 `Post` 模型（帖子ID、作者ID、内容、图片、话题标签、分类、点赞数、评论数、创建时间）
  - [x] SubTask 1.2.4: 创建 `Comment` 模型（评论ID、帖子ID、作者ID、内容、创建时间）
  - [x] SubTask 1.2.5: 创建 `HeartSignal` 模型（信号ID、用户A、用户B、状态、过期时间）
  - [x] SubTask 1.2.6: 更新 `User` 模型，添加资料完善度字段、关注列表、粉丝列表
  - **验证**：所有模型在mock模式下可正常CRUD

- [x] Task 1.3: 更新OpenAPI契约
  - [x] SubTask 1.3.1: 新增 `likes.yaml`：喜欢/取消喜欢、获取喜欢列表、获取访客列表
  - [x] SubTask 1.3.2: 新增 `village.yaml`：发帖、获取帖子列表、点赞、评论、获取评论列表
  - [x] SubTask 1.3.3: 新增 `heart-signal.yaml`：获取心动信号、接受心动信号
  - [x] SubTask 1.3.4: 更新 `users.yaml`：资料完善度、关注/取消关注
  - [x] SubTask 1.3.5: 更新 `recommendations.yaml`：卡片推荐列表、每日限量控制
  - **验证**：`npm run lint:openapi` 全绿

- [x] Task 1.4: 创建Flyway迁移脚本
  - [x] SubTask 1.4.1: `V2026.05.21.0001__create_likes_table.sql`
  - [x] SubTask 1.4.2: `V2026.05.21.0002__create_visitors_table.sql`
  - [x] SubTask 1.4.3: `V2026.05.21.0003__create_posts_table.sql`
  - [x] SubTask 1.4.4: `V2026.05.21.0004__create_comments_table.sql`
  - [x] SubTask 1.4.5: `V2026.05.21.0005__create_heart_signals_table.sql`
  - [x] SubTask 1.4.6: `V2026.05.21.0006__alter_users_add_profile_completion.sql`
  - **验证**：`run-flyway.cmd migrate` 成功

---

## Phase 2: 寻觅页 — 卡片式推荐（Week 1-2）

- [x] Task 2.1: 实现卡片滑动组件
  - [x] SubTask 2.1.1: 创建 `CardSwiper` 组件，支持全屏卡片展示
  - [x] SubTask 2.1.2: 实现左滑拒绝、右滑喜欢的手势交互
  - [x] SubTask 2.1.3: 实现卡片堆叠效果（显示下一张卡片边缘）
  - [x] SubTask 2.1.4: 添加滑动动画（卡片飞出、新卡片进入）
  - **验证**：手势流畅，动画自然

- [x] Task 2.2: 实现用户卡片内容
  - [x] SubTask 2.2.1: 展示用户头像、昵称、学校、年级、专业
  - [x] SubTask 2.2.2: 展示兴趣标签（最多5个）
  - [x] SubTask 2.2.3: 展示个人简介（限制字数，支持展开）
  - [x] SubTask 2.2.4: 底部操作按钮：拒绝（X）、喜欢（❤️）、超级喜欢（可选）
  - **验证**：卡片信息完整，布局美观

- [x] Task 2.3: 实现推荐逻辑
  - [x] SubTask 2.3.1: API `GET /recommendations/cards` 返回卡片列表
  - [x] SubTask 2.3.2: 基于规则排序（学校优先、同城、兴趣匹配）
  - [x] SubTask 2.3.3: 每日限量控制（默认10张，可配置）
  - [x] SubTask 2.3.4: 记录用户已看过的卡片，避免重复推荐
  - **验证**：推荐列表按规则排序，每日限量生效

- [x] Task 2.4: 实现时间门控与回看
  - [x] SubTask 2.4.1: 当日推荐浏览完后显示"明天中午12点刷新"提示
  - [x] SubTask 2.4.2: 提供"更多嘉宾"入口（查看历史推荐）
  - [x] SubTask 2.4.3: 提供"逛逛村口"入口跳转社区
  - [x] SubTask 2.4.4: 回看功能：可浏览今日已拒绝的卡片，支持"挽回"
  - **验证**：时间门控逻辑正确，回看功能可用

- [x] Task 2.5: 底部嵌入村口动态
  - [x] SubTask 2.5.1: 在寻觅页底部展示村口热门帖子
  - [x] SubTask 2.5.2: 帖子展示：用户头像、昵称、内容摘要、点赞数
  - [x] SubTask 2.5.3: 点击帖子跳转村口详情
  - **验证**：村口动态正常展示，点击进入详情

---

## Phase 3: 喜欢页 — 双向喜欢与访客（Week 2）

- [x] Task 3.1: 实现喜欢列表
  - [x] SubTask 3.1.1: 双标签页UI：喜欢我的 / 访客
  - [x] SubTask 3.1.2: API `GET /likes/me` 获取喜欢我的用户列表
  - [Task 3.1.3: API `GET /visitors` 获取访客列表
  - [x] SubTask 3.1.4: 列表项展示：头像、昵称、学校、喜欢/访问时间
  - **验证**：列表正常展示，数据正确

- [x] Task 3.2: 实现功能锁定
  - [x] SubTask 3.2.1: 未完善资料时显示锁定页面
  - [x] SubTask 3.2.2: 锁定页展示模糊头像（3个重叠圆形）
  - [x] SubTask 3.2.3: 提示文案："完善资料后才能获得访客和喜欢"
  - [x] SubTask 3.2.4: "立即完善"按钮跳转资料页
  - **验证**：未完善资料时正确锁定，完善后解锁

- [x] Task 3.3: 实现双向喜欢检测与心动信号
  - [x] SubTask 3.3.1: 用户A喜欢用户B时，检测用户B是否已喜欢用户A
  - [x] SubTask 3.3.2: 双向喜欢时创建 `HeartSignal` 记录
  - [x] SubTask 3.3.3: 向双方发送"心动信号"通知
  - [x] SubTask 3.3.4: 在消息页展示心动信号Banner
  - **验证**：双向喜欢时正确触发心动信号

---

## Phase 4: 村口页 — UGC社区广场（Week 2-3）

- [x] Task 4.1: 实现帖子列表
  - [x] SubTask 4.1.1: 三大标签：关注 / 同城 / 发现
  - [x] SubTask 4.1.2: 六大分类筛选：全部 / 兴趣圈 / 诚意帖 / 同乡 / 蒙面 / 最新
  - [x] SubTask 4.1.3: API `GET /posts` 支持标签+分类筛选
  - [x] SubTask 4.1.4: 帖子卡片：用户身份标签、图文内容、话题标签、互动数据
  - **验证**：列表正常展示，筛选功能可用

- [x] Task 4.2: 实现帖子互动
  - [x] SubTask 4.2.1: 关注按钮：点击关注/取消关注作者
  - [x] SubTask 4.2.2: 私信按钮：点击创建私信会话
  - [x] SubTask 4.2.3: 点赞按钮：点击点赞/取消点赞
  - [x] SubTask 4.2.4: 评论按钮：点击展开评论区
  - **验证**：所有互动功能正常

- [x] Task 4.3: 实现发帖功能
  - [x] SubTask 4.3.1: 悬浮+按钮，点击进入发帖页
  - [x] SubTask 4.3.2: 发帖页：文字输入框（限制500字）
  - [x] SubTask 4.3.3: 图片上传：支持最多9张图片
  - [x] SubTask 4.3.4: 话题标签选择：支持自定义和热门标签推荐
  - [x] SubTask 4.3.5: 分类选择：诚意帖/同乡/蒙面等
  - [x] SubTask 4.3.6: API `POST /posts` 发布帖子
  - **验证**：发帖流程完整，发布后可在列表看到

- [x] Task 4.4: 实现评论功能
  - [x] SubTask 4.4.1: 帖子详情页展示评论列表
  - [x] SubTask 4.4.2: 评论输入框，支持发送评论
  - [x] SubTask 4.4.3: API `GET /posts/{id}/comments` 获取评论
  - [x] SubTask 4.4.4: API `POST /posts/{id}/comments` 发表评论
  - **验证**：评论正常展示和发送

---

## Phase 5: 消息页 — 私信+心动信号（Week 3）

- [x] Task 5.1: 重构消息列表
  - [x] SubTask 5.1.1: 消息分类：私信列表、系统通知
  - [x] SubTask 5.1.2: 私信列表项：头像、昵称、最后消息、未读数、时间
  - [x] SubTask 5.1.3: API `GET /messages` 获取消息列表
  - **验证**：列表正常展示

- [x] Task 5.2: 实现心动信号Banner
  - [x] SubTask 5.2.1: 消息页顶部展示心动信号Banner
  - [x] SubTask 5.2.2: Banner内容：对方头像、学校、年龄、城市、简介亮点
  - [x] SubTask 5.2.3: "直接开聊"按钮，带倒计时（默认24小时）
  - [x] SubTask 5.2.4: 点击按钮创建私信会话，倒计时结束后信号过期
  - **验证**：心动信号正确展示，倒计时正常

- [x] Task 5.3: 保留临时匿名聊天
  - [x] SubTask 5.3.1: 私信会话中标记"临时聊天"类型
  - [x] SubTask 5.3.2: 临时聊天保持24小时过期机制
  - [x] SubTask 5.3.3: 临时聊天保持匿名（不暴露真实信息）
  - [x] SubTask 5.3.4: 临时聊天结束后可选择交换联系方式
  - **验证**：临时聊天功能完整保留

---

## Phase 6: 资料完善硬门槛（Week 3）

- [x] Task 6.1: 实现资料完善度计算
  - [x] SubTask 6.1.1: 定义完善度字段权重：头像(20%)、昵称(10%)、性别(10%)、生日(10%)、学校(20%)、专业(10%)、兴趣标签(10%)、个人简介(10%)
  - [x] SubTask 6.1.2: API 返回资料完善度百分比
  - [x] SubTask 6.1.3: 我的页展示完善度进度条
  - **验证**：完善度计算正确

- [x] Task 6.2: 实现功能锁定逻辑
  - [x] SubTask 6.2.1: 路由守卫：进入喜欢/村口/消息/我的时检查完善度
  - [x] SubTask 6.2.2: 完善度<100%时显示锁定页面
  - [x] SubTask 6.2.3: 锁定页统一UI：插画+提示文案+立即完善按钮
  - [x] SubTask 6.2.4: 寻觅页保持开放（用于引流）
  - **验证**：未完善资料时正确锁定四大模块

- [x] Task 6.3: 优化资料编辑页
  - [x] SubTask 6.3.1: 分步骤引导：基础资料→学校认证→兴趣标签→个人简介
  - [x] SubTask 6.3.2: 每步显示进度和剩余字段
  - [x] SubTask 6.3.3: 支持保存草稿，下次继续
  - **验证**：资料编辑流程顺畅

---

## Phase 7: 移除旧功能（Week 3-4）

- [x] Task 7.1: 移除课表编辑器
  - [x] SubTask 7.1.1: 删除课表编辑页面和组件
  - [x] SubTask 7.1.2: 课表数据保留为只读字段（从资料中展示）
  - [x] SubTask 7.1.3: 删除相关API和OpenAPI定义
  - **验证**：课表编辑功能完全移除

- [x] Task 7.2: 移除AI计划
  - [x] SubTask 7.2.1: 删除AI计划相关页面和组件
  - [x] SubTask 7.2.2: 删除相关API和OpenAPI定义
  - [x] SubTask 7.2.3: 首页替换为卡片推荐+村口动态
  - **验证**：AI计划完全移除

- [x] Task 7.3: 移除话题匹配/一键速配
  - [x] SubTask 7.3.1: 删除匹配页面和话题匹配逻辑
  - [x] SubTask 7.3.2: 匹配逻辑融入卡片喜欢系统
  - [x] SubTask 7.3.3: 删除相关API和OpenAPI定义
  - **验证**：旧匹配功能完全移除

---

## Phase 8: 测试与优化（Week 4）

- [x] Task 8.1: 全链路测试
  - [x] SubTask 8.1.1: 寻觅→喜欢→心动信号→私信完整流程
  - [x] SubTask 8.1.2: 村口→发帖→评论→私信完整流程
  - [x] SubTask 8.1.3: 资料完善→解锁功能完整流程
  - [x] SubTask 8.1.4: mock/real 双模式验证
  - **验证**：所有主链路可用

- [x] Task 8.2: 性能优化
  - [x] SubTask 8.2.1: 卡片滑动性能优化（图片懒加载、虚拟列表）
  - [x] SubTask 8.2.2: 村口列表性能优化（分页加载、下拉刷新）
  - [x] SubTask 8.2.3: 消息列表性能优化（增量加载）
  - **验证**：页面流畅，无明显卡顿

- [x] Task 8.3: 体验优化
  - [x] SubTask 8.3.1: 空状态、加载态、错误态统一设计
  - [x] SubTask 8.3.2: 弱网/断网提示和重试机制
  - [x] SubTask 8.3.3: 新手引导（首次使用提示）
  - **验证**：体验完整，边界情况处理完善

# Task Dependencies

- Task 1.1 → Task 2.1、3.1、4.1、5.1（页面结构依赖）
- Task 1.2 → Task 2.3、3.3、4.1、5.2（数据模型依赖）
- Task 1.3 → Task 2.3、3.1、4.1、5.1（API契约依赖）
- Task 2.3 → Task 3.3（推荐数据用于双向喜欢检测）
- Task 3.3 → Task 5.2（心动信号在消息页展示）
- Task 6.2 → Task 3.2、4.x、5.x、6.x（功能锁定依赖完善度逻辑）
- Task 7.x 可与其他任务并行（移除旧功能不影响新功能开发）
- Task 8.x 依赖所有功能开发完成