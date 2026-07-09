# UI 全面优化（基于真实浏览器反馈）Spec

## Why

上一轮（2026-07-04-h5-real-verification-tdd-redesign）已完成 TypeError 修复、mp-weixin 兼容性、按钮反馈动画等基础工程问题。但用户在真实浏览器中点击体验后发现 **16 项具体的 UI/交互问题**：图标显示为路径文本、按钮无点击效果、卡片适配差、chat 缺少头像、课表不方便等。这些问题需要在新一轮"严格参考 + 整体适配 + 硬编码清理 + 真实浏览器验证"的迭代中系统性解决。

**核心原则**：
1. **严格参考**：每一项改动 MUST 对照 `参考/` 目录的青藤之恋截图（analysis_141.png / mobile_141.png / screenshot_141.png 等），提取具体视觉参数（颜色/圆角/间距/字号），不得凭感觉设计
2. **整体适配**：H5 优先调试，但所有改动 MUST 同时通过 mp-weixin 编译验证，不得出现"只在 H5 能看"的改动
3. **硬编码清理**：所有颜色/字号/间距/路径 MUST 走 design tokens 或 assets config，不得在 .vue 文件中出现 magic number 或硬编码路径，确保后续可维护

## What Changes

### A. 显示问题修复（4 项）
- 修复 SocialProgressIndicator 的 `sip-action-card__icon` 显示路径文本而非图标（应渲染 `<image>`，参考 `参考/screenshot_141.png` 个人主页行动卡片）
- 修复 profile 页面"编辑资料"按钮可见性（被遮挡/对比度不足，参考 `参考/mobile_141.png` 我的页面编辑按钮样式）
- 修复 discover 页面"15 次"次数 chip 看不清楚（字号/对比度不足，参考 `参考/screenshot_142.png` 顶部次数徽章）
- 重构 SocialProgressIndicator 卡片设计（适配差、不够突出，参考 design-system 卡片层级 + `参考/img143_top.png`）

### B. 交互补全（4 项）
- 首页功能网格 8 个入口补全点击效果与跳转逻辑（附近的人/兴趣匹配/语音房/CP匹配/校园活动/恋爱事务所/真心话/恋爱测试），参考 `参考/screenshot_141.png` 首页功能宫格
- 突出"匹配"功能在功能网格中的视觉权重（用户特别强调"突出匹配的重要"，参考 `参考/img142_top.png` 匹配入口高亮）
- 修复 discover 页面无法滑动问题（页面滚动 + card-stack 滑动冲突）
- 补全筛选栏功能：4 个 chip 实际可点击切换 + 新增搜索框可输入（参考 `参考/screenshot_142.png` 筛选栏）

### C. 跨页面复用（1 项）
- 匹配次数图标 chip（discover-header__count-chip 样式）在首页和我的页面也显示，3 个页面样式完全一致

### D. 视觉强化（6 项）
- 作者卡片（author-card）突出每个人的特点：头像光环、身份徽章、兴趣标签视觉强化（参考 `参考/img144_top.png` 帖子作者卡片）
- chat 消息气泡加入左右头像 + 突出对面背景（对方气泡背景使用对方头像主色调，参考 `参考/screenshot_144.png` 聊天页）
- chat 输入栏改造为类似微信的打字栏（输入框 + 表情/语音/更多 按钮 + 适配键盘，参考 `参考/screenshot_144.png` 底部输入栏）
- profile-info 后台可配置背景图 + 重点突出自己的资料（头像放大、数据前置，参考 `参考/mobile_141.png` 个人主页头部）
- card-stack 支持左右滑动 + 凸显背景 + 突出特殊（参考 design-beautify-research §3.1 PersonCard 头像光环 + 匹配度色条，对照 `参考/img142_mid.png` 卡片堆）
- 课表改造为"一周安排"（不限于课程，方便看，可直接看到一周所有安排，参考 `参考/img143_mid.png` 课表设计）

### E. 课表编辑优化（1 项）
- 课表编辑入口仅对已校园认证的用户开放（未认证时显示引导卡片）
- 课表内容支持"课程 + 活动 + 自定义安排"，编辑方便、一目了然

### F. 浏览器验证 + mp-weixin 整体适配（贯穿全程）
- 所有改动通过 Chrome DevTools MCP 真实浏览器验证（H5 端）
- 所有改动通过 `npx uni build --platform mp-weixin` 编译验证（mp-weixin 端）
- 所有改动保持 mp-weixin 兼容性（禁用 :hover / backdrop-filter / catch {} / import.meta.env.DEV）
- **整体适配要求**：每个改动需在 H5 和 mp-weixin 双端验证，不得出现"只在 H5 能看"的代码

### G. 硬编码清理（贯穿全程，与 A-F 并行）
- **颜色硬编码清理**：所有 `#xxxxxx` 颜色替换为 `var(--c-brand-xxx)` 或 design tokens 引用
- **字号硬编码清理**：所有 `font-size: 24rpx` 等 magic number 替换为 `var(--fs-xxx)` 或 design tokens
- **间距硬编码清理**：所有 `padding: 16rpx` 等 magic number 替换为 `var(--sp-xxx)` 或 design tokens
- **路径硬编码清理**：所有 `/static/assets/...` 路径替换为从 `config/assets-index.ts` 导入
- **新增 tokens**：如需新增颜色/字号/间距，MUST 在 `theme/design-variables.scss` 中定义后再使用
- **新增资源**：如需新增图片，MUST 在 `config/assets-index.ts` 中注册路径后再使用

## Impact

- **Affected specs**：
  - `2026-07-04-h5-real-verification-tdd-redesign`（前置 spec，已完成）
  - `qingteng-social-differentiation`（青藤之恋设计语言对齐）
  - `redesign-ui-2026-05-27`（早期 UI 重设计）
- **Affected code**（关键文件）：
  - `apps/client/src/components/social/SocialProgressIndicator.vue`（sip-action-card 修复 + 卡片重设计）
  - `apps/client/src/components/social/SocialOnboardingOverlay.vue`（如有连带）
  - `apps/client/src/pages/home/index.vue`（功能网格点击 + 匹配次数 chip）
  - `apps/client/src/pages/profile/index.vue`（编辑资料按钮 + 匹配次数 chip + profile-info 背景配置）
  - `apps/client/src/pages/discover/index.vue`（滑动修复 + 筛选栏搜索 + count-chip 清晰度）
  - `apps/client/src/components/discover/CardSwiper.vue`（左右滑动 + 背景凸显 + 突出特殊）
  - `apps/client/src/components/chat/ChatBubble.vue`（左右头像 + 对面背景）
  - `apps/client/src/pages/chat/index.vue` + `chat-session/index.vue`（微信风格输入栏）
  - `apps/client/src/pages/village/index.vue` + `village/detail.vue`（作者卡片突出特点）
  - `apps/client/src/pages/village/post.vue` + `components/common/AuthorCard.vue`（如有）
  - `apps/client/src/subpackages/setup/schedule/index.vue`（课表一周安排 + 编辑）
  - `apps/client/src/stores/schedule.ts`（课表数据扩展为活动+自定义）
  - `apps/client/src/stores/session.ts`（campusVerified 守卫）
  - `apps/client/src/theme/design-variables.scss`（如需新增 token）
  - `apps/client/src/App.vue`（全局 utility class）

## ADDED Requirements

### Requirement: 真实浏览器驱动的 UI 优化

系统 SHALL 在真实浏览器（Chrome DevTools MCP）中验证所有 16 项 UI 改动，每项改动需通过"截图前后对比 + DOM 检查 + 控制台无错误"三重验证。

#### Scenario: SocialProgressIndicator 行动卡片图标正常显示
- **WHEN** 用户在 home/profile 页面查看 SocialProgressIndicator
- **THEN** `sip-action-card__icon` 渲染为 `<image src=".../visitor.png">` 而非路径文本
- **AND** 图标尺寸 40rpx×40rpx，垂直居中

#### Scenario: 编辑资料按钮清晰可见
- **WHEN** 用户在 profile 页面查看 profile-info
- **THEN** "编辑资料"按钮对比度 ≥ 4.5:1
- **AND** 按钮不被头像光环或其他元素遮挡
- **AND** 按钮有明显的边框或背景色区分

#### Scenario: 功能网格全部可点击跳转
- **WHEN** 用户点击首页功能网格中的任一入口（如"兴趣匹配"）
- **THEN** 触发 press-feedback 按压动画
- **AND** 跳转到对应页面（/pages/discover/index 等）
- **AND** "兴趣匹配"和"CP匹配"在视觉上比其他入口更突出（用户强调突出匹配）

#### Scenario: discover 页面可上下滑动
- **WHEN** 用户在 discover 页面上下滑动
- **THEN** 页面正常滚动，无卡顿
- **AND** card-stack 不与页面滚动冲突（card-stack 内部左右滑动，页面整体上下滚动）

#### Scenario: card-stack 支持左右滑动
- **WHEN** 用户在 discover 页面 card-stack 区域左右滑动
- **THEN** 当前卡片向左/右滑出（带旋转和透明度动画）
- **AND** 触发对应逻辑（左滑 pass / 右滑 like）
- **AND** 卡片背景图凸显（用户强调"凸显出背景并且突出特殊"）

#### Scenario: chat 消息气泡显示左右头像
- **WHEN** 用户在 chat-session 页面查看消息
- **THEN** 对方消息左侧显示对方头像（32rpx 圆形）
- **AND** 自己消息右侧显示自己头像（32rpx 圆形）
- **AND** 对方气泡背景使用对方头像主色调的浅色变体（突出对面背景）

#### Scenario: chat 输入栏类似微信
- **WHEN** 用户在 chat-session 页面查看底部输入栏
- **THEN** 输入栏包含：左侧语音按钮 + 中间输入框 + 右侧表情按钮 + 更多按钮
- **AND** 输入框聚焦时显示"发送"按钮
- **AND** 输入栏适配键盘弹起（不遮挡输入框）

#### Scenario: profile-info 背景可配置
- **WHEN** 用户在 profile 页面查看 profile-info
- **THEN** profile-info 顶部显示背景图（默认品牌色渐变，可在编辑资料中配置）
- **AND** 头像放大到 128rpx，位于背景图下方居中
- **AND** 数据统计（关注/粉丝/获赞）前置显示，字号增大

#### Scenario: 课表仅校园认证用户可用
- **WHEN** 未校园认证用户访问课表
- **THEN** 显示引导卡片"完成校园认证后解锁课表功能"
- **AND** 引导卡片有"去认证"按钮跳转到 /pages/campus/certification
- **WHEN** 已校园认证用户访问课表
- **THEN** 显示一周安排（周一到周日）
- **AND** 支持添加课程/活动/自定义安排
- **AND** 一目了然看到每个时间段的状态（已安排/空闲）

#### Scenario: 匹配次数 chip 跨页面显示
- **WHEN** 用户在 home 或 profile 页面查看
- **THEN** 顶部显示匹配次数 chip（与 discover 页面一致样式）
- **AND** chip 显示剩余匹配次数和 match.png 图标
- **AND** 点击 chip 跳转到 discover 页面

#### Scenario: 作者卡片突出特点
- **WHEN** 用户在 village 详情页或 village 主页查看作者卡片
- **THEN** 作者卡片显示：头像（带光环）+ 昵称 + 校友/认证徽章 + 学校标签 + 兴趣 chip + 简介
- **AND** 头像光环使用品牌色渐变
- **AND** 兴趣 chip 视觉强化（彩色背景，每个 chip 颜色根据兴趣类别映射）
- **AND** 简介字号增大，最多 2 行

#### Scenario: discover count-chip 清晰可见
- **WHEN** 用户在 discover 页面查看顶部次数 chip
- **THEN** "15 次"字号 ≥ 28rpx，颜色使用品牌色或深色
- **AND** chip 背景对比度 ≥ 4.5:1
- **AND** icon 与文字水平居中

#### Scenario: 筛选栏支持搜索
- **WHEN** 用户在 discover 页面筛选栏区域
- **THEN** 4 个 chip 可点击切换（附近/不限/18-25岁/匹配度优先）
- **AND** chip 下方新增搜索框，可输入用户名/标签/学校
- **AND** 输入时实时过滤推荐列表

#### Scenario: SocialProgressIndicator 卡片重设计
- **WHEN** 用户在 home/profile 页面查看 SocialProgressIndicator
- **THEN** 卡片有明显的层级（card-base--elevated 双层阴影）
- **AND** 6 步漏斗指示器视觉强化（连接线渐变、当前步骤脉冲动画）
- **AND** 行动卡片有完整的可点击区域（不是仅文字）
- **AND** 点击行动卡片跳转到对应页面

## MODIFIED Requirements

### Requirement: CardSwiper 滑动手势

[原] CardSwiper 仅支持点击 like/pass/super-like 按钮触发卡片切换
[新] CardSwiper 同时支持：
1. 点击按钮触发（保留）
2. 左右滑动手势触发（新增）
3. 卡片背景图全屏显示（保留 16:9 比例，但增强渐变遮罩凸显背景）
4. 当前卡片有"特殊"视觉提示（如轻微缩放、阴影增强）

### Requirement: 课表数据模型

[原] 课表仅支持课程数据（courseName + classroom + time）
[新] 课表支持三类数据：
1. 课程（course）：courseName + classroom + teacher
2. 活动（activity）：activityName + location + sponsor
3. 自定义（custom）：title + location + note
所有类型共享 timeSlot 字段（startTime + endTime + dayOfWeek）

### Requirement: chat 输入栏组件

[原] chat 输入栏使用 uni-textarea + 两个按钮（发送文字/发送语音）
[新] chat 输入栏改造为微信风格：
1. 左侧：语音切换按钮（长按说话）
2. 中间：输入框（聚焦时显示发送按钮）
3. 右侧：表情按钮 + 更多按钮（+ 号）
4. 输入框失焦时显示 3 个按钮，聚焦时显示发送按钮

## REMOVED Requirements

### Requirement: 旧的 chat 输入栏双按钮设计
**Reason**: 用户反馈"需要类似微信的打字栏"
**Migration**: 替换为微信风格输入栏，保留原有的发送文字/语音功能但融入新设计

## 设计参考对齐

本次改进 SHALL 严格对齐 `参考/` 目录和 `design-preview/`、`design-system/` 的设计语言：

1. **卡片**：白底、圆角 16rpx、双层阴影 `0 1px 2px + 0 4px 12px rgba(15,23,42,.04)`
2. **头像**：圆形，多档尺寸（chat 32rpx / 卡片 48rpx / 资料 64rpx / 顶部 128rpx）
3. **课表色块**：低饱和同明度（薄荷/浅蓝/浅紫/浅杏，饱和度≤20%，明度≈92%）
4. **聊天气泡**：圆角 18rpx + 尾角 4rpx；对方灰底 `#F0F2F5`+黑字+头像；本人品牌绿+白字+头像
5. **功能网格**：4 列宫格，每格 gray-50 底 + 12rpx 圆角，icon 24rpx 线性 1.5px 描边品牌色
6. **筛选栏**：胶囊 chip，6×16 padding，16rpx 圆角，激活态 brand-50 底
7. **个人主页头部**：白底 + 128rpx 圆形头像（带渐变光环）+ 20rpx 昵称 + 13rpx 学校灰字
8. **VIP 横幅**：金棕 12° 渐变 `#C9A36A→#E8C98A` + 白字 + 半透明描边按钮
9. **状态徽章**：浅底深字反白（薄荷 7CD9A6/1A7A4A；琥珀 FFD479/8A5A00；蓝紫 B7C4FF/3B47B7）
10. **禁止**：渐变按钮、毛玻璃、>3 主色、全大写、红色主色、emoji 当图标

## 兼容性约束（继承 project_memory）

- 禁用 `import.meta.env.DEV`
- 禁用 optional catch binding (`catch {`)
- 禁用 `:hover` 伪类（用 `hover-class` 或 `press-feedback--active`）
- 禁用 `backdrop-filter`（custom-tab-bar 除外）
- `position: sticky` 仅在基础库 2.8.0+ 支持（village/circles 可用）
- 页面切换逻辑必须内联在 .vue 文件中
- 从 .ts 文件直接导入工具函数
