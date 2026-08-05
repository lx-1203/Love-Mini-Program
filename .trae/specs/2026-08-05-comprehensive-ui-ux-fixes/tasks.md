# Tasks

本任务清单按 A-J 十大模块拆分，遵循"小步迭代"原则，每个子任务独立可验证。任务间依赖关系见末尾"Task Dependencies"。所有 `[x]` 为已完成，`[ ]` 为待实现。

## 0. 小程序构建与源码审查（已完成）

- [x] Task 0.1: 运行 `pnpm --filter client run build:mp-weixin`，确认构建成功
- [x] Task 0.2: 审查 `pages/discover/index.wxml` 与 `components/discover/CardSwiper.wxml`，定位卡片挤压根因
  - [x] SubTask 0.2.1: 确认 `.action-bar` 位于文档流，挤压卡片区域
  - [x] SubTask 0.2.2: 确认 discover 页面存在大量堆叠块级元素（header/filter/search/checkin/benefits/daily-question/activity-recommend）
- [x] Task 0.3: 审查 `pages/circles/index.wxml` 与 `pages/circle/index.vue`，定位圈子入口与标题问题
  - [x] SubTask 0.3.1: 确认 TabBar 圈子入口指向
  - [x] SubTask 0.3.2: 确认 `pages/circle/index.vue` 仍显示"村口发帖"与顶部发帖按钮
- [x] Task 0.4: 审查 `pages/messages/index.wxml`，定位 GlobalPublishFab 缺失与官方头像问题
  - [x] SubTask 0.4.1: 确认消息页构建产物中无 `global-publish-fab`
  - [x] SubTask 0.4.2: 确认官方消息/小助手使用 emoji 图标
- [x] Task 0.5: 审查 `pages/profile/index.wxml` 与源码，确认编辑资料、图标、功能入口现状
- [x] Task 0.6: 审查 `pages/home/index.vue`，确认学校选择认证与绑定逻辑现状

## A. 寻觅页（discover）卡片可见性修复

- [ ] Task A1: 将 CardSwiper 的 `.action-bar` 改为绝对定位，叠加在卡片底部
  - [ ] SubTask A1.1: 修改 `CardSwiper.vue` 样式，`.action-bar` 使用 `position:absolute; bottom:24rpx`
  - [ ] SubTask A1.2: 卡片容器 `.card-swiper` 增加相对定位与高度约束
  - [ ] SubTask A1.3: 操作栏增加半透明背景与模糊降级
- [ ] Task A2: 收缩 discover 页面非核心区块对卡片区域的挤压
  - [ ] SubTask A2.1: 将签到卡片改为顶部紧凑横条或折叠入口
  - [ ] SubTask A2.2: 将权益卡片/每日问题/活动推荐改为可选折叠或横向入口
  - [ ] SubTask A2.3: 调整 `.card-area` 的 flex 与 min-height，确保常见机型卡片区域 >= 45% 可视高度
- [ ] Task A3: mp-weixin 真机验证卡片完整可见
  - [ ] SubTask A3.1: 在微信开发者工具模拟 iPhone SE/12/Pro Max 查看卡片区域
  - [ ] SubTask A3.2: 记录不同机型截图并归档到 `.trae/specs/2026-08-05-comprehensive-ui-ux-fixes/evidence/`

## B. 寻觅页操作按钮真实响应

- [ ] Task B1: 修复爱心按钮真实响应
  - [ ] SubTask B1.1: 在 `CardSwiper.vue` 中检查 `onLike` handler，确保调用 `discoverStore.swipeRight(cardId)`
  - [ ] SubTask B1.2: 添加 haptic 反馈与按钮高亮动画
- [ ] Task B2: 修复收藏按钮真实响应
  - [ ] SubTask B2.1: 在 `discoverStore` 中新增或完善 `collectCard(cardId)` action
  - [ ] SubTask B2.2: `CardSwiper.vue` 中收藏按钮调用该 action，状态切换后给出反馈
- [ ] Task B3: 操作按钮 ARIA 与可访问性
  - [ ] SubTask B3.1: 确保收藏/爱心按钮有 `role="button"` 与 `aria-label`
  - [ ] SubTask B3.2: 按钮状态变化时更新 `aria-label`

## C. 圈子页（circle）生态重构

- [ ] Task C1: 统一圈子入口与标题
  - [ ] SubTask C1.1: 检查 `components/layout/TabBar.vue` 与 `pages.json` 中圈子 Tab 指向
  - [ ] SubTask C1.2: 将圈子主入口统一为 `pages/circles/index` 或重构 `pages/circle/index`
  - [ ] SubTask C1.3: 页面左上角标题改为"圈子"（i18n key `circle.navTitle`）
  - [ ] SubTask C1.4: 移除顶部"发帖"按钮
- [ ] Task C2: 圈子分层（校园圈/兴趣圈）
  - [ ] SubTask C2.1: 在圈子主页面增加"校园圈/兴趣圈"分区切换
  - [ ] SubTask C2.2: 校园圈模式下接入 `sessionStore.isCampusVerified` 校验，未认证展示引导卡片
  - [ ] SubTask C2.3: 兴趣圈模式下展示兴趣分类列表（学习/运动/音乐/电影/旅行等）
  - [ ] SubTask C2.4: 在 `stores/circle.ts` 中新增 `circleMode`、`interestCategories` 状态与 fetch action
- [ ] Task C3: FAB 发帖按钮
  - [ ] SubTask C3.1: 在圈子主页面右下角放置全局/局部 FAB，位置 `bottom = TabBar高度 + safe-area-inset-bottom + 20rpx`
  - [ ] SubTask C3.2: FAB 默认圆形（border-radius: 50%），`:active`/`:hover` 过渡到圆角方形（border-radius: 24rpx）
  - [ ] SubTask C3.3: 点击 FAB 跳转 `/pages/circles/post-topic`
- [ ] Task C4: 发帖编辑页功能补齐
  - [ ] SubTask C4.1: 在 `pages/circles/post-topic.vue` 增加"发布到"圈子选择器（校园圈/兴趣圈）
  - [ ] SubTask C4.2: 增加 tag 选择器（多选，从预设 tag 列表选择）
  - [ ] SubTask C4.3: 增加"喜爱"标签切换
  - [ ] SubTask C4.4: 提交时携带 circleId/tags/favorite 字段调用后端发布接口
- [ ] Task C5: 帖子间距与底部留白
  - [ ] SubTask C5.1: 帖子列表 gap 调整为 24rpx
  - [ ] SubTask C5.2: 列表底部留白足够，避免最后一个帖子被 FAB 遮挡

## D. 首页（home）学校匹配绑定

- [ ] Task D1: 验证并修复学校选择器认证前置
  - [ ] SubTask D1.1: 在 `pages/home/index.vue` 的 `onSchoolSelectorTap` 中确认 `isCampusVerified` 校验逻辑
  - [ ] SubTask D1.2: 未认证时 `uni.showModal` 提示并跳转 `/pages/campus/certification`
- [ ] Task D2: 验证并修复一次性绑定学校
  - [ ] SubTask D2.1: 在 `stores/session.ts` 中确认 `bindSchool` action 调用真实后端接口
  - [ ] SubTask D2.2: 绑定成功后 `userSession.schoolBound` 写入持久化状态
  - [ ] SubTask D2.3: 学校选择器根据 `schoolBound` 显示锁定态（lock 图标，无下拉箭头）
  - [ ] SubTask D2.4: 已绑定用户点击选择器提示"学校已绑定，如需修改请联系客服"
- [ ] Task D3: 后端绑定接口校验
  - [ ] SubTask D3.1: 确认 `POST /api/v1/users/bind-school` 接口存在且校验校园认证状态
  - [ ] SubTask D3.2: 增加幂等性校验：已绑定学校的用户不可重复绑定

## E. 签到（checkin）积分体系

- [ ] Task E1: 积分展示
  - [ ] SubTask E1.1: 在 `stores/checkin.ts` 中新增 `pointsEarned` 字段，签到成功后从后端响应读取
  - [ ] SubTask E1.2: 修改 `pages/discover/index.vue` 签到成功提示文案为"获得 N 积分"
  - [ ] SubTask E1.3: 签到卡片/成功区域增加"我的积分：N"入口
- [ ] Task E2: 积分用途说明
  - [ ] SubTask E2.1: 签到成功区域增加"积分可在商城兑换权益"提示文案
  - [ ] SubTask E2.2: 提示文案点击跳转 `/pages/shop/index`
- [ ] Task E3: 积分商城联动
  - [ ] SubTask E3.1: 在 `pages/shop/index.vue` 顶部展示当前积分余额
  - [ ] SubTask E3.2: 增加积分兑换商品占位列表

## F. 活动页与设置入口

- [ ] Task F1: 活动日历可用
  - [ ] SubTask F1.1: 检查 `pages/activities/index.vue` 与 `home/index.vue` 中的活动日历，修复日历点击无响应问题
  - [ ] SubTask F1.2: 日历支持横向滑动切换月份，点击日期展示当日活动列表
- [ ] Task F2: 活动详情页
  - [ ] SubTask F2.1: 确认 `pages/activities/detail.vue` 存在且包含活动介绍、时间、地点、报名按钮
  - [ ] SubTask F2.2: 编入"新人礼遇""周末派对"等示例活动数据
- [ ] Task F3: 附近的人/MBTI/恋爱咨询课程页面
  - [ ] SubTask F3.1: 确认 `pages/love-center/nearby.vue` 存在且有示例内容
  - [ ] SubTask F3.2: 确认 `pages/love-center/mbti.vue` 存在且有示例题目
  - [ ] SubTask F3.3: 确认 `pages/love-center/consulting.vue` 存在且有示例内容
  - [ ] SubTask F3.4: 三个页面支持后台配置 H5 URL，配置后通过 webview 加载
- [ ] Task F4: 内容页退出按钮
  - [ ] SubTask F4.1: 在 F3 三个页面及活动详情页左上角/右上角增加退出按钮（返回箭头）
  - [ ] SubTask F4.2: 点击退出按钮调用 `uni.navigateBack()`
- [ ] Task F5: 主页设置入口
  - [ ] SubTask F5.1: 在 `pages/home/index.vue` 与 `pages/discover/index.vue` 顶部增加齿轮图标按钮
  - [ ] SubTask F5.2: 点击跳转 `/pages/settings/index`
- [ ] Task F6: 反馈入口上移
  - [ ] SubTask F6.1: 在 `pages/settings/index.vue` 一级菜单增加"反馈"入口
  - [ ] SubTask F6.2: 点击跳转 `/pages/feedback/history`

## G. 全局发布动态 FAB

- [ ] Task G1: 全局 FAB 组件确认
  - [ ] SubTask G1.1: 确认 `components/common/GlobalPublishFab.vue` 存在且 fixed 定位于右下角
  - [ ] SubTask G1.2: 确认 bottom 值 = TabBar 高度 + safe-area-inset-bottom + 20rpx
  - [ ] SubTask G1.3: 点击触发发帖流程（跳转 `/pages/circles/post-topic`）
- [ ] Task G2: 主 Tab 页面接入全局 FAB
  - [ ] SubTask G2.1: 在 `pages/discover/index.vue` 接入 GlobalPublishFab
  - [ ] SubTask G2.2: 在 `pages/home/index.vue` 接入 GlobalPublishFab
  - [ ] SubTask G2.3: 在 `pages/circles/index.vue` 接入 GlobalPublishFab（与圈子页 FAB 统一）
  - [ ] SubTask G2.4: 在 `pages/messages/index.vue` 接入 GlobalPublishFab（当前构建产物缺失）
  - [ ] SubTask G2.5: 在 `pages/profile/index.vue` 接入 GlobalPublishFab
- [ ] Task G3: FAB 不重叠底栏验证
  - [ ] SubTask G3.1: mp-weixin 端微信开发者工具验证 FAB 不与 TabBar 重叠
  - [ ] SubTask G3.2: 页面滚动时 FAB 始终保持 fixed 定位

## H. 消息页（messages）整理

- [ ] Task H1: 林夕头像修复
  - [ ] SubTask H1.1: 在 `stores/messages.ts` 中查找"林夕"会话，确认 avatar 字段
  - [ ] SubTask H1.2: 移除/替换异常图标，统一回退到 `/static/default-avatar.png` 或真实头像
- [ ] Task H2: 官方消息置顶
  - [ ] SubTask H2.1: 在 `pages/messages/index.vue` 私信列表顶部固定展示"官方消息"会话
  - [ ] SubTask H2.2: 官方消息使用真实头像或品牌 SVG 图标
- [ ] Task H3: 小助手置顶
  - [ ] SubTask H3.1: 私信列表顶部固定展示"小助手"会话（位于官方消息下方）
  - [ ] SubTask H3.2: 小助手使用真实头像或 sparkles/gift SVG 图标
- [ ] Task H4: 话题推荐迁移
  - [ ] SubTask H4.1: 从 `pages/messages/index.vue` 移除话题推荐入口
  - [ ] SubTask H4.2: 在圈子页顶部增加话题推荐入口
- [ ] Task H5: 头像展示兜底
  - [ ] SubTask H5.1: 所有私信会话使用 SafeImage 展示对方真实头像
  - [ ] SubTask H5.2: 头像加载失败时回退到默认头像

## I. 我的页（profile）修复

- [ ] Task I1: 编辑资料按钮修复
  - [ ] SubTask I1.1: 检查 `pages/profile/index.vue` 中"编辑资料"按钮的 click 热区，移除遮挡元素
  - [ ] SubTask I1.2: 缩小按钮图标尺寸至 32-40rpx
  - [ ] SubTask I1.3: 扩大点击热区至不小于 80rpx（增加 padding）
- [ ] Task I2: 未知大图标移除
  - [ ] SubTask I2.1: 检查 profile 顶部 header 区域，定位未知大图标
  - [ ] SubTask I2.2: 移除或替换为正确 SVG
- [ ] Task I3: 爱心 emoji 替换
  - [ ] SubTask I3.1: 在我的动态分区中查找爱心 emoji（如 `❤️`）
  - [ ] SubTask I3.2: 替换为 `ICONS_PROFILE.POSTS` 或其他 SVG 标记
- [ ] Task I4: 功能入口补齐
  - [ ] SubTask I4.1: "动态"入口跳转 `/pages/village/index?tab=mine`
  - [ ] SubTask I4.2: "任务中心"跳转 `/pages/profile/tasks`
  - [ ] SubTask I4.3: "访客记录"跳转 `/pages/profile/visitors`
  - [ ] SubTask I4.4: "相册"跳转 `/pages/profile/album`
  - [ ] SubTask I4.5: "恋爱认证"跳转 `/pages/verification/index`
- [ ] Task I5: SVG 图标统一
  - [ ] SubTask I5.1: 在 `config/images.ts` 中补齐 `ICONS_PROFILE` 所有图标
  - [ ] SubTask I5.2: 从 Iconfont 或类似来源下载相同样式的 SVG，统一线条粗细/颜色/尺寸
  - [ ] SubTask I5.3: 替换菜单项 bgColor 为统一同色系浅色背景
- [ ] Task I6: 顶部退出按钮
  - [ ] SubTask I6.1: 确认 profile 顶部 header 有显式退出图标按钮
  - [ ] SubTask I6.2: 点击触发 `handleLogout()` 确认弹窗

## J. 验证与测试

- [ ] Task J1: 单元测试补齐
  - [ ] SubTask J1.1: 为新增/修改的 store action 补充单元测试（checkin/circle/session/messages）
  - [ ] SubTask J1.2: 运行 `pnpm --filter client run test`
- [ ] Task J2: 小程序构建验证
  - [ ] SubTask J2.1: 运行 `pnpm --filter client run build:mp-weixin` 验证构建成功
  - [ ] SubTask J2.2: 检查构建产物中无 console error
- [ ] Task J3: 微信小程序实测
  - [ ] SubTask J3.1: 微信开发者工具预览所有主 Tab 页面
  - [ ] SubTask J3.2: 使用 chrome-devtools 验证 UI/UX 无视觉断层
  - [ ] SubTask J3.3: 收集真机截图并归档到 evidence 目录

# Task Dependencies

- Task A2（卡片可见性）依赖 Task A1（action-bar 绝对定位）
- Task B（按钮响应）依赖 Task A（卡片可见）
- Task C3（FAB）依赖 Task C1（入口统一）
- Task C4（发帖编辑页）依赖 Task C2（圈子分层）
- Task D2（一次性绑定）依赖 Task D1（认证前置）
- Task E2（积分用途）依赖 Task E1（积分展示）
- Task F2（活动详情页）依赖 Task F1（活动日历）
- Task F4（退出按钮）依赖 Task F2（活动详情页）与 Task F3（内容页）
- Task G2（主 Tab 接入 FAB）依赖 Task G1（FAB 组件确认）
- Task H2/H3（置顶）可并行
- Task I4（功能入口）依赖 Task I5（SVG 图标）
- Task J1（单元测试）依赖所有功能任务完成
- Task J2（构建验证）依赖 Task J1
- Task J3（实测）依赖 Task J2

# 并行化建议

以下任务无依赖关系，可并行执行：
- Task A（寻觅页布局）与 Task D（首页学校）与 Task F（活动/设置）与 Task I（我的页）
- Task C（圈子页）与 Task H（消息页）与 Task E（签到积分）
- Task G（全局 FAB）可在 Task C3 之后与 Task C 并行收尾

# 统计计划

> 用于整体跟踪本轮小程序修复的工作量、进度与风险。

## 模块与任务统计

| 模块 | 业务域 | 顶层任务数 | 关键子任务数 | 验收检查点 |
|------|--------|-----------|-------------|-----------|
| 0 | 构建与源码审查 | 6 | 12 | 12（已完成） |
| A | 寻觅页卡片可见性 | 3 | 8 | 6 |
| B | 寻觅页操作按钮 | 3 | 6 | 4 |
| C | 圈子页生态重构 | 5 | 15 | 16 |
| D | 首页学校匹配绑定 | 3 | 8 | 7 |
| E | 签到积分体系 | 3 | 7 | 6 |
| F | 活动页与设置入口 | 6 | 15 | 19 |
| G | 全局发布动态 FAB | 3 | 8 | 10 |
| H | 消息页整理 | 5 | 10 | 9 |
| I | 我的页修复 | 6 | 12 | 14 |
| J | 验证与测试 | 3 | 6 | 9 |
| **合计** | **10 业务域 + 1 审查** | **43** | **107** | **112** |

## 依赖关系统计

- 强依赖链：13 条（如 A1→A2→A3、C1→C3→C4、D1→D2→D3 等）
- 可并行任务组：3 大组
  - 第 1 组（页面布局/入口）：A / D / F / I
  - 第 2 组（社交/积分）：C / H / E
  - 第 3 组（全局 FAB）：G（依赖 C3 完成后收尾）

## 关键风险点

1. **CardSwiper 真机适配**：iPhone SE 等小屏机型上卡片区域能否稳定 ≥ 45% 可视高度，需要真机截图验证（Task A3 / J3）。
2. **圈子入口路由统一**：TabBar 配置与 `pages/circle/index`、`pages/circles/index` 两个文件可能产生冲突，需先确认当前 TabBar 指向（Task C1）。
3. **学校绑定后端幂等**：`POST /api/v1/users/bind-school` 若缺少幂等校验，可能导致重复绑定或状态不一致（Task D3）。
4. **SVG 图标外部依赖**：我的页/圈子页多个入口需要统一风格的 SVG，若 Iconfont 无法直接下载，需要手动调整路径或找替代源（Task I5 / C3）。
5. **微信小程序构建产物差异**：mp-weixin 编译后的 wxml 结构与 H5 不同，需在每次修改后重新 `build:mp-weixin` 并在开发者工具中截图确认（Task J2 / J3）。

## 证据归档计划

- 证据目录：`.trae/specs/2026-08-05-comprehensive-ui-ux-fixes/evidence/`
- 每张截图命名规则：`{模块}-{机型或页面}-{序号}.png`，例如 `A-discover-iphoneSE-01.png`
- 必拍页面/状态：
  - 寻觅页（iPhone SE / 12 / Pro Max 三种高度）
  - 圈子页（校园圈未认证态、兴趣圈列表、FAB 按下态）
  - 首页（学校选择器未认证态、已绑定态）
  - 消息页（官方消息/小助手置顶、话题推荐移除后）
  - 我的页（编辑资料热区、菜单图标、退出按钮）
- 收集责任：Task A3 / J3 负责执行，所有关键检查点必须有对应截图或开发者工具录屏。
