# Tasks

## Phase A: 显示问题修复（4 项 - 优先）

- [ ] Task A1: 修复 SocialProgressIndicator sip-action-card 图标显示
  - [ ] SubTask A1.1: 读取 SocialProgressIndicator.vue line 316-328 找到 sip-action-card__icon 文本渲染位置
  - [ ] SubTask A1.2: 将 `<text class="sip-action-card__icon">{{ currentAction.icon }}</text>` 改为 `<image class="sip-action-card__icon-img" :src="currentAction.icon" mode="aspectFit" />`
  - [ ] SubTask A1.3: 添加 .sip-action-card__icon-img 样式（40rpx×40rpx，flex-shrink:0）
  - [ ] SubTask A1.4: 浏览器验证 home 和 profile 页面图标正常显示

- [x] Task A2: 修复 profile 编辑资料按钮可见性
  - [ ] SubTask A2.1: 读取 profile/index.vue 找到 .edit-btn 样式
  - [ ] SubTask A2.2: 增强 .edit-btn 样式：添加边框 `border: 1rpx solid var(--c-brand-500)` + 背景色 `rgba(91,127,255,0.08)` + 字号 24rpx→26rpx
  - [ ] SubTask A2.3: 调整 z-index 确保 .edit-btn 不被 .avatar-ring 遮挡（z-index: 2）
  - [ ] SubTask A2.4: 浏览器验证按钮清晰可见

- [x] Task A3: 修复 discover count-chip 清晰度
  - [ ] SubTask A3.1: 读取 discover/index.vue 找到 .discover-header__count-chip 和 .discover-header__count 样式
  - [ ] SubTask A3.2: 字号从 24rpx 增大到 30rpx，font-weight: 700
  - [ ] SubTask A3.3: chip 背景从 transparent 改为 `rgba(91,127,255,0.1)`，padding 增大
  - [ ] SubTask A3.4: 浏览器验证"15 次"清晰可见

- [x] Task A4: 重构 SocialProgressIndicator 卡片设计
  - [ ] SubTask A4.1: 给 .sip-card 添加 card-base--elevated 类（双层阴影）
  - [ ] SubTask A4.2: 强化 6 步漏斗：当前步骤添加脉冲动画 `@keyframes pulse-ring`
  - [ ] SubTask A4.3: 连接线改为渐变 `linear-gradient(90deg, prev-color, current-color)`
  - [ ] SubTask A4.4: 行动卡片整块可点击（添加 @click 到 .sip-action-card 整体，添加 press-feedback 类）
  - [ ] SubTask A4.5: 浏览器验证卡片视觉突出 + 点击跳转正常

## Phase B: 交互补全（4 项）

- [x] Task B1: 首页功能网格 8 个入口补全点击跳转
  - [ ] SubTask B1.1: 读取 home/index.vue 找到 function-grid 的 8 个 function-item
  - [ ] SubTask B1.2: 为每个 function-item 添加 @tap="onFunctionTap(item.path)" 和 path 属性
  - [ ] SubTask B1.3: 添加 onFunctionTap 方法，调用 openAppPath
  - [ ] SubTask B1.4: 8 个入口配置：附近的人→/pages/discover/index, 兴趣匹配→/pages/discover/index, 语音房→/pages/messages/index, CP匹配→/pages/discover/index, 校园活动→/pages/activities/index, 恋爱事务所→/pages/village/index, 真心话→/pages/daily-question/index, 恋爱测试→/pages/daily-question/index
  - [ ] SubTask B1.5: 浏览器验证每个入口可点击跳转

- [x] Task B2: 突出"匹配"功能视觉权重
  - [ ] SubTask B2.1: 在 function-grid 中"兴趣匹配"和"CP匹配"添加 .function-item--highlight 类
  - [ ] SubTask B2.2: .function-item--highlight 样式：背景 `rgba(91,127,255,0.08)` + 边框 `1rpx solid rgba(91,127,255,0.3)` + scale(1.05) + 阴影增强
  - [ ] SubTask B2.3: 添加"热门"角标到这两个入口右上角
  - [ ] SubTask B2.4: 浏览器验证匹配入口视觉突出

- [ ] Task B3: 修复 discover 页面无法滑动
  - [ ] SubTask B3.1: 读取 discover/index.vue 找到 .discover-page 容器
  - [ ] SubTask B3.2: 检查 .discover-page 是否有 overflow: hidden 或 height: 100vh 限制
  - [ ] SubTask B3.3: 改为允许垂直滚动：`min-height: 100vh; overflow-y: auto`
  - [ ] SubTask B3.4: 检查 card-stack 区域是否阻止事件冒泡（@touchmove.stop 修改为只阻止水平滑动）
  - [ ] SubTask B3.5: 浏览器验证页面可上下滑动 + card-stack 可左右滑动

- [x] Task B4: 补全筛选栏功能 + 新增搜索框
  - [ ] SubTask B4.1: 读取 discover/index.vue 找到 filter-bar 的 4 个 filter-chip
  - [ ] SubTask B4.2: 为每个 chip 添加 @tap="onFilterChipTap(filter.id)" + active 状态切换逻辑
  - [ ] SubTask B4.3: 在 filter-bar 下方新增 search-box：`<input class="search-input" placeholder="搜索用户/标签/学校" v-model="searchKeyword" />`
  - [ ] SubTask B4.4: 在 discover store 添加 searchKeyword state 和 filteredRecommendations getter
  - [ ] SubTask B4.5: 浏览器验证 chip 切换 + 搜索框输入实时过滤

## Phase C: 跨页面复用（1 项）

- [x] Task C1: 匹配次数 chip 在 home 和 profile 页面显示
  - [x] SubTask C1.1: 抽取 MatchCountChip.vue 组件（在 components/common/ 下）
  - [x] SubTask C1.2: 组件 props: count, icon (默认 /static/assets/icons/social/match.png)
  - [x] SubTask C1.3: 组件 @click 跳转到 /pages/discover/index
  - [x] SubTask C1.4: 在 home/index.vue 顶部 header 区域引入 <MatchCountChip :count="matchCount" />
  - [x] SubTask C1.5: 在 profile/index.vue 顶部引入 <MatchCountChip :count="matchCount" />
  - [x] SubTask C1.6: 从 discover store 共享 matchCount（剩余匹配次数）
  - [x] SubTask C1.7: 浏览器验证 3 个页面 chip 显示一致

## Phase D: 视觉强化（6 项）

- [x] Task D1: 作者卡片突出特点
  - [x] SubTask D1.1: 读取 village/detail.vue 和 village/index.vue 找到 author-card
  - [x] SubTask D1.2: 增强 .author-avatar 添加光环：`box-shadow: 0 0 0 4rpx rgba(91,127,255,0.2), 0 0 0 8rpx rgba(91,127,255,0.1)`
  - [x] SubTask D1.3: 兴趣 chip 颜色映射：根据兴趣类别（运动/文艺/科技/生活）分配 4 种颜色
  - [x] SubTask D1.4: 简介字号 24rpx→28rpx，最多 2 行（line-clamp: 2）
  - [x] SubTask D1.5: 头像左上角添加身份徽章（校友/认证）小图标
  - [x] SubTask D1.6: 浏览器验证作者卡片突出特点

- [x] Task D2: chat 消息气泡加入左右头像 + 突出对面背景
  - [x] SubTask D2.1: 读取 ChatBubble.vue 找到 bubble-wrap--peer 和 bubble-wrap--self
  - [x] SubTask D2.2: bubble-wrap--peer 添加左侧头像：`<image class="bubble-avatar" :src="peerAvatar" mode="aspectFill" />`
  - [x] SubTask D2.3: bubble-wrap--self 添加右侧头像：`<image class="bubble-avatar" :src="selfAvatar" mode="aspectFill" />`
  - [x] SubTask D2.4: .bubble-avatar 样式：32rpx 圆形 + 边框 + flex-shrink:0
  - [x] SubTask D2.5: 对方气泡背景从 #F0F2F5 改为对方头像主色调浅色变体（暂用 brand-50 rgba(91,127,255,0.08)）
  - [x] SubTask D2.6: 浏览器验证左右头像显示 + 对方背景突出

- [x] Task D3: chat 输入栏改造为微信风格
  - [x] SubTask D3.1: 读取 chat-session/index.vue 找到底部输入栏 card--compact
  - [x] SubTask D3.2: 改造结构为：`<view class="wechat-input-bar"><view class="voice-btn">🎤</view><input class="msg-input" /><view class="emoji-btn">😊</view><view class="more-btn">+</view></view>`
  - [x] SubTask D3.3: 输入框聚焦时隐藏 emoji 和 more 按钮，显示发送按钮
  - [x] SubTask D3.4: 添加 .wechat-input-bar 样式：flex 布局 + 8rpx gap + 88rpx 高度 + safe-area-inset-bottom
  - [x] SubTask D3.5: 适配键盘弹起：使用 uni-app 的 @keyboardheightchange 事件
  - [x] SubTask D3.6: 浏览器验证输入栏类似微信

- [x] Task D4: profile-info 背景可配置 + 突出自己资料
  - [x] SubTask D4.1: 读取 profile/index.vue 找到 profile-info
  - [x] SubTask D4.2: 在 profile-info 顶部添加 .profile-bg 背景 view：默认品牌色渐变 `linear-gradient(135deg, #5B7FFF 0%, #7B9CFF 100%)`，高度 240rpx
  - [x] SubTask D4.3: 头像 .avatar 从 96rpx 放大到 128rpx，z-index: 2，margin-top: -64rpx（半遮挡背景）
  - [x] SubTask D4.4: 数据统计 .stats-bar 字号增大：value 36rpx→40rpx，label 22rpx→24rpx，添加背景卡片
  - [x] SubTask D4.5: 在 session store 添加 profileBgUrl 字段（默认空，可在编辑资料中上传）
  - [x] SubTask D4.6: 编辑资料页面添加"更换背景"入口（暂用占位，后续接入上传）
  - [x] SubTask D4.7: 浏览器验证背景显示 + 资料突出

- [x] Task D5: card-stack 支持左右滑动 + 凸显背景 + 突出特殊
  - [x] SubTask D5.1: 读取 CardSwiper.vue 找到 card-stack 和 card--current
  - [x] SubTask D5.2: 给 .card--current 添加 @touchstart、@touchmove、@touchend 事件
  - [x] SubTask D5.3: 实现 touchMove 时根据 deltaX 计算卡片位移和旋转（rotateZ(deg * deltaX/screenWidth * 30)）
  - [x] SubTask D5.4: touchEnd 时根据 deltaX > 100 判定为右滑（like），deltaX < -100 判定为左滑（pass）
  - [x] SubTask D5.5: 增强 .card__bg 凸显背景：增加 `filter: brightness(1.05) saturate(1.1)` 增强背景
  - [x] SubTask D5.6: .card__overlay 渐变遮罩从 rgba(0,0,0,0.4) 调整为 rgba(0,0,0,0.25)（让背景更凸显）
  - [x] SubTask D5.7: .card--current 添加特殊视觉：`box-shadow: 0 20rpx 60rpx rgba(91,127,255,0.25)` + 轻微缩放 scale(1.02)
  - [x] SubTask D5.8: 浏览器验证左右滑动 + 背景凸显 + 突出特殊

- [x] Task D6: 课表改造为"一周安排"
  - [x] SubTask D6.1: 读取 subpackages/setup/schedule/index.vue 找到 schedule-card-new
  - [x] SubTask D6.2: 标题从"今日课表"改为"本周安排"
  - [x] SubTask D6.3: 周一到周日 7 天显示（添加周六周日）
  - [x] SubTask D6.4: 每个时段支持 3 种类型显示：课程（蓝色块）/活动（绿色块）/自定义（橙色块）
  - [x] SubTask D6.5: 添加类型图例（legend）说明
  - [x] SubTask D6.6: 时段无内容时显示"✨ 空闲，可添加安排"
  - [x] SubTask D6.7: 点击空闲时段弹出"添加安排"操作表（课程/活动/自定义）
  - [x] SubTask D6.8: 浏览器验证一周安排一目了然

## Phase E: 课表编辑优化（1 项）

- [x] Task E1: 课表仅校园认证用户可用 + 数据模型扩展
  - [x] SubTask E1.1: 读取 schedule.ts 扩展数据模型：添加 type 字段（'course' | 'activity' | 'custom'）+ 各类型特有字段
  - [x] SubTask E1.2: 添加 mock 数据：3 个课程 + 2 个活动 + 1 个自定义
  - [x] SubTask E1.3: 读取 session.ts 添加 isCampusVerified getter
  - [x] SubTask E1.4: schedule/index.vue 添加 v-if="isCampusVerified" 守卫
  - [x] SubTask E1.5: 未认证时显示引导卡片："完成校园认证后解锁课表功能" + "去认证"按钮
  - [x] SubTask E1.6: "去认证"按钮 @tap="openAppPath('/pages/campus/certification')"
  - [x] SubTask E1.7: 浏览器验证未认证看到引导，已认证看到完整课表

## Phase F: 浏览器验证 + mp-weixin 整体适配（贯穿全程）

- [ ] Task F1: 真实浏览器验证全部 16 项改动
  - [ ] SubTask F1.1: Chrome DevTools MCP 截图 home/profile/discover/chat-session/village 5 个页面
  - [ ] SubTask F1.2: 验证 sip-action-card 图标显示
  - [ ] SubTask F1.3: 验证编辑资料按钮可见
  - [ ] SubTask F1.4: 验证 count-chip 清晰
  - [ ] SubTask F1.5: 验证功能网格 8 个入口可点击
  - [ ] SubTask F1.6: 验证 discover 可滑动 + card-stack 左右滑动
  - [ ] SubTask F1.7: 验证筛选栏搜索框
  - [ ] SubTask F1.8: 验证 chat 左右头像 + 微信输入栏
  - [ ] SubTask F1.9: 验证 profile-info 背景
  - [ ] SubTask F1.10: 验证课表一周安排 + 校园认证守卫
  - [ ] SubTask F1.11: 验证作者卡片突出特点
  - [ ] SubTask F1.12: 验证 SocialProgressIndicator 卡片设计
  - [ ] SubTask F1.13: 验证匹配次数 chip 跨 3 个页面

- [x] Task F2: mp-weixin 兼容性检查 + 整体适配验证
  - [ ] SubTask F2.1: Grep 搜索新代码是否包含 catch {、:hover、backdrop-filter、import.meta.env.DEV
  - [ ] SubTask F2.2: 如有违规，修复为兼容语法
  - [ ] SubTask F2.3: 运行 npx uni build --platform mp-weixin 验证编译成功（exit code 0）
  - [ ] SubTask F2.4: 检查 mp-weixin 编译产物中是否有警告
  - [ ] SubTask F2.5: 确认所有改动在 mp-weixin 端不报错（不只是 H5 能看）

- [x] Task F3: 单元测试回归
  - [ ] SubTask F3.1: 运行 npx vitest run --config vitest.config.ts 验证 201 个测试用例无回归
  - [ ] SubTask F3.2: 如有失败，修复或调整测试用例

## Phase G: 硬编码清理（贯穿全程，与 A-F 并行）

- [ ] Task G1: 颜色硬编码清理
  - [ ] SubTask G1.1: Grep 搜索 A-F 改动的 .vue 文件中的 `#[0-9a-fA-F]{3,6}` 颜色字面量
  - [ ] SubTask G1.2: 将每个硬编码颜色替换为 `var(--c-brand-xxx)` 或 design tokens 引用
  - [ ] SubTask G1.3: 如需新增颜色 token，在 theme/design-variables.scss 中定义
  - [ ] SubTask G1.4: 验证替换后视觉效果与原硬编码一致

- [x] Task G2: 字号硬编码清理
  - [ ] SubTask G2.1: Grep 搜索 A-F 改动的 .vue 文件中的 `font-size: \d+rpx` 字面量
  - [ ] SubTask G2.2: 将每个硬编码字号替换为 `var(--fs-xxx)` 或 design tokens 引用
  - [ ] SubTask G2.3: 如需新增字号 token，在 theme/design-variables.scss 中定义
  - [ ] SubTask G2.4: 验证替换后字号显示一致

- [ ] Task G3: 间距硬编码清理
  - [ ] SubTask G3.1: Grep 搜索 A-F 改动的 .vue 文件中的 `padding|margin|gap: \d+rpx` 字面量
  - [ ] SubTask G3.2: 将每个硬编码间距替换为 `var(--sp-xxx)` 或 design tokens 引用
  - [ ] SubTask G3.3: 如需新增间距 token，在 theme/design-variables.scss 中定义
  - [ ] SubTask G3.4: 验证替换后间距显示一致

- [x] Task G4: 路径硬编码清理
  - [ ] SubTask G4.1: Grep 搜索 A-F 改动的 .vue 文件中的 `/static/assets/...` 路径字面量
  - [ ] SubTask G4.2: 将每个硬编码路径替换为从 `config/assets-index.ts` 导入的常量
  - [ ] SubTask G4.3: 如需新增资源路径，在 config/assets-index.ts 中注册
  - [ ] SubTask G4.4: 验证替换后图片正常加载

- [x] Task G5: 硬编码清理回归验证
  - [ ] SubTask G5.1: 浏览器验证所有改动页面视觉无回归
  - [ ] SubTask G5.2: mp-weixin 编译验证无新增错误
  - [ ] SubTask G5.3: 单元测试无回归

# Task Dependencies

- Task A1-A4 可并行（不同文件不同组件）
- Task B1-B4 可并行（不同功能模块）
- Task C1 依赖 B1（先有功能网格再抽组件）
- Task D1-D6 可并行（不同页面）
- Task E1 依赖 D6（先有一周安排再添加守卫）
- Task G1-G4 与 A-E 并行（每个 Sub-Agent 在完成功能改动后立即清理硬编码）
- Task F1 依赖 A-E + G 全部完成
- Task F2-F3 依赖 F1

# Parallelizable Work

- Phase A 4 个任务可并行
- Phase B 4 个任务可并行
- Phase D 6 个任务可并行（但建议 D2/D3 同一 Sub-Agent 处理 chat 相关）
- Phase G 4 个任务可并行（与功能改动同 Sub-Agent 处理）
- 建议分组（每个 Sub-Agent 内部完成功能改动 + 硬编码清理）：
  - Sub-Agent 1: Phase A 全部 + G1-G4 相关清理（SocialProgressIndicator + profile edit-btn + discover count-chip）
  - Sub-Agent 2: Phase B 全部 + G1-G4 相关清理（功能网格 + 突出匹配 + discover 滑动 + 筛选栏搜索）
  - Sub-Agent 3: Phase C + D1 + D6 + G1-G4 相关清理（MatchCountChip 抽取 + 作者卡片 + 课表）
  - Sub-Agent 4: Phase D2 + D3 + G1-G4 相关清理（chat 头像 + 微信输入栏）
  - Sub-Agent 5: Phase D4 + D5 + G1-G4 相关清理（profile-info 背景 + card-stack 滑动）
  - Sub-Agent 6: Phase E + G1-G4 相关清理（课表校园认证守卫 + 数据模型扩展）
  - 主 Agent: Phase F 浏览器验证 + mp-weixin 整体适配检查 + 最终回归
