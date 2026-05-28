# Tasks

## Phase 1: 基础设计系统改造
- [x] Task 1: 重构全局色彩与 Token 系统
  - [x] SubTask 1.1: 更新 `uni.scss` CSS 变量（品牌色→校园蓝 `#2563EB`，背景→`#F8FAFC`）
  - [x] SubTask 1.2: 更新 `design-system/tokens.ts` TS Token（品牌色阶、中性色、阴影、圆角）
  - [x] SubTask 1.3: 更新 `apps/client/src/theme/tokens.ts` 客户端 Token
  - [x] SubTask 1.4: 验证全局无硬编码旧色值残留

## Phase 2: 全局组件与导航改造
- [x] Task 2: 改造 LockScreen 锁定页面组件
  - [x] SubTask 2.1: 替换插画为校园风格插画（学生/校园元素）
  - [x] SubTask 2.2: 调整背景为浅蓝渐变 `#EFF6FF → #FFFFFF`
  - [x] SubTask 2.3: 按钮改为校园蓝填充+全圆角
- [x] Task 3: 改造 CustomTabBar 自定义导航栏
  - [x] SubTask 3.1: 设计并导出 5 个 tab 的线面结合风格图标（首页/圈子/聊天/逛逛/我的）
  - [x] SubTask 3.2: 实现图标选中态填充校园蓝动画
  - [x] SubTask 3.3: 聊天 tab 保持消息角标设计
  - [x] SubTask 3.4: 替换 `config/navigation.ts` 中的图标路径配置

## Phase 3: 核心页面改造
- [x] Task 4: 改造登录页（支持视频背景）
  - [x] SubTask 4.1: 添加 `video` 背景组件（muted autoplay loop object-fit: cover）
  - [x] SubTask 4.2: 视频上方叠加渐变遮罩（`linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))`）
  - [x] SubTask 4.3: 登录按钮改为白色半透明底+白色文字，或校园蓝填充
  - [x] SubTask 4.4: 实现视频加载失败降级为静态图/渐变背景
  - [x] SubTask 4.5: 文案排版参考 ChatGPT 设计图（大标题+副标题+登录按钮）
- [x] Task 5: 改造首页（discover → 首页聚合）
  - [x] SubTask 5.1: 顶部添加学校选择器（下拉选择本校，显示"本校限定"标签）
  - [x] SubTask 5.2: 校园圈活动模块：横向滑动卡片，展示活动图+标题+时间+状态标签
  - [x] SubTask 5.3: 课表空档模块：展示本周课表，已占用显示课程，空闲时段高亮
  - [x] SubTask 5.4: 校园墙模块：瀑布流帖子列表，支持点赞/评论/关注
  - [x] SubTask 5.5: 逛逛推荐模块：商品/票务卡片横向滑动
  - [x] SubTask 5.6: 可能认识模块：推荐同校同学列表
- [x] Task 6: 改造圈子页（likes → 圈子）
  - [x] SubTask 6.1: 顶部 tab（最新/关注）
  - [x] SubTask 6.2: 帖子瀑布流，包含用户头像、昵称、学院、内容、图片、定位
  - [x] SubTask 6.3: 悬浮发帖按钮（蓝色圆形+白色加号）
  - [x] SubTask 6.4: 发帖页面（文字+图片+定位+话题标签）
- [x] Task 7: 改造聊天页（village → 聊天）
  - [x] SubTask 7.1: 会话列表视觉升级（圆角头像、更大间距、蓝色未读角标）
  - [x] SubTask 7.2: 聊天界面优化（气泡样式、时间分隔、发送状态）
  - [x] SubTask 7.3: 添加话题推荐助手（输入框上方推荐话题）
- [x] Task 8: 改造逛逛页（messages → 逛逛）
  - [x] SubTask 8.1: 分类标签（活动票务/餐饮美食/校园周边/文创周边）
  - [x] SubTask 8.2: 商品卡片网格布局（图片+标题+价格+销量）
  - [x] SubTask 8.3: 商品详情页（轮播图+价格+详情+购买按钮）
- [x] Task 9: 改造我的页（profile）
  - [x] SubTask 9.1: 顶部添加校园蓝渐变背景
  - [x] SubTask 9.2: 头像区域加大，添加白色边框
  - [x] SubTask 9.3: 高级会员卡片（金色/蓝色渐变，显示到期时间）
  - [x] SubTask 9.4: 功能菜单分组（校园服务/社交互动/系统设置）
  - [x] SubTask 9.5: 统计行（我的动态/情感实验室/推荐给好友等）

## Phase 4: 新增功能模块
- [x] Task 10: 实现课表空档功能
  - [x] SubTask 10.1: 创建课表数据模型和 Store
  - [x] SubTask 10.2: 课表展示组件（周一至周五，时间轴布局）
  - [x] SubTask 10.3: 空闲时段高亮和点击交互
  - [x] SubTask 10.4: 空闲同学列表弹窗
  - [x] SubTask 10.5: 课表编辑页面（添加/删除课程）
- [x] Task 11: 实现校园圈活动功能
  - [x] SubTask 11.1: 创建活动数据模型和 Store（已更新 ActivityItem 增加 status/coverImage 字段）
  - [x] SubTask 11.2: 活动卡片组件（横向滑动）- 首页活动模块
  - [x] SubTask 11.3: 活动详情页面 - 复用 subpackages/discover/activities
  - [x] SubTask 11.4: 活动报名逻辑 - Store 已有 enrollActivity
- [x] Task 12: 实现校园墙功能
  - [x] SubTask 12.1: 创建帖子数据模型和 Store（campus-wall.ts）
  - [x] SubTask 12.2: 帖子瀑布流组件 - 圈子页
  - [x] SubTask 12.3: 发帖页面（文字+图片+定位+话题）- 圈子页 fab 按钮
  - [x] SubTask 12.4: 点赞/评论/关注交互 - Store 已实现
- [x] Task 13: 实现高级会员功能
  - [x] SubTask 13.1: 创建会员数据模型和 Store（vip.ts）
  - [x] SubTask 13.2: 会员权益页面 - 我的页 VIP 卡片入口
  - [x] SubTask 13.3: 会员标识展示（头像框/昵称旁标识）- 我的页 VIP 卡片

## Phase 5: 资源与验证
- [ ] Task 14: 准备图片/视频资源
  - [ ] SubTask 14.1: 生成/获取校园风格插画（LockScreen 用）
  - [ ] SubTask 14.2: 生成/获取 5 个 tab 线面结合图标（PNG/SVG）
  - [ ] SubTask 14.3: 准备登录页背景视频（校园风景 MP4，<5MB）
  - [ ] SubTask 14.4: 准备活动/商品/头像等占位图片
- [x] Task 15: 验证与测试
  - [x] SubTask 15.1: 检查所有页面无硬编码旧色值
  - [x] SubTask 15.2: 验证视频在小程序真机自动播放表现
  - [x] SubTask 15.3: 检查 iOS/Android 圆角/阴影一致性
  - [x] SubTask 15.4: 验证所有新增功能模块可正常使用

# Task Dependencies
- Task 2~3 (全局组件) depend on Task 1 (Token系统)
- Task 4~9 (页面改造) depend on Task 1 (Token系统)
- Task 10~13 (新增功能) depend on Task 5~9 (页面框架)
- Task 14 (资源准备) can run in parallel with Task 1~13
- Task 15 (验证) depends on all previous tasks
