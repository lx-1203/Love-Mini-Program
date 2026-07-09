# 恋爱小程序 · 设计感精修对齐青藤之恋参考 - Product Requirement Document

## Overview
- **Summary**: 基于用户选中的 10 个 uni-view 元素，对全页面进行视觉精修，严格对齐青藤之恋参考设计，强化视觉层级、边缘色彩显示、卡片质感、间距韵律与交互反馈，全面提升设计感。
- **Purpose**: 当前实现已完成基础功能，但视觉上与青藤之恋参考存在差距：边缘色不明显、卡片质感不足、间距节奏不统一、部分组件视觉权重失衡、按钮交互反馈不够清晰。本次精修将严格参考 [design-reference-analysis.md](file:///d:/6/恋爱小程序/docs/design-reference-analysis.md) 中梳理的青藤之恋设计语言，做到像素级对齐。
- **Target Users**: 使用校园恋爱小程序的大学生用户（H5 + mp-weixin 双端）。

## Goals
- **G1**: 严格对齐青藤之恋参考设计的视觉语言（圆角、间距、阴影、色彩、排版）
- **G2**: 强化卡片边缘色彩显示，解决"边缘色未显示、视觉层级弱"问题
- **G3**: 统一全页面间距韵律（8/12/16/24 四档），消除不规则硬编码间距
- **G4**: 提升按钮/可点击元素的交互反馈感知（scale 动画 + 涟漪 + 状态色变化）
- **G5**: 优化核心页面（首页/寻觅/喜欢/消息/我的/圈子/校园墙/聊天）的视觉层级
- **G6**: 清理剩余硬编码颜色/字号/间距，统一走 design tokens
- **G7**: 确保 H5 和 mp-weixin 双端视觉一致，无兼容性回退

## Non-Goals (Out of Scope)
- 不新增业务功能（匹配算法、新页面、新社交特性等）
- 不修改后端 API 或数据模型
- 不做暗色模式完整适配（仅保持现有 darkmode 基础兼容）
- 不重构非视觉相关的逻辑代码
- 不替换现有图片资源为新生成图片

## Background & Context
- **参考设计**: 青藤之恋校园恋爱交友小程序，核心设计语言已在 [design-reference-analysis.md](file:///d:/6/恋爱小程序/docs/design-reference-analysis.md) 中系统梳理
- **现有 Token 系统**: [design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) 已有品牌色、VIP金色、价格红、语义色、圆角、阴影、间距 tokens
- **mp-weixin 约束**: 禁用 `import.meta.env.DEV`、`catch {}`、`:hover` 伪类、`backdrop-filter`（需 opacity 0.96 fallback）、`position: sticky`（基础库 2.8.0+ 可用但谨慎使用）
- **前序工作**: 已完成 TypeError 修复、图标 `<text>`→`<image>` 修复、201 单元测试通过、mp-weixin 编译成功
- **用户最新反馈**: 选中 10 个 uni-view 元素，要求总结并进行设计感改进，要足够符合参考；使用 frontend-skill、frontend-design、canvas-design、brainstorming、dogfood

## Functional Requirements
- **FR-1**: 首页 5 大模块（校园圈活动/课表空闲/校园墙/逛逛推荐/可能认识）严格按参考样式重设计
- **FR-2**: 寻觅页卡片滑动区强化卡片质感，筛选栏样式对齐参考
- **FR-3**: 喜欢/消息/我的页面列表项视觉精修，统一卡片圆角+阴影+边缘色
- **FR-4**: 聊天页气泡样式对齐参考（自己无头像/对方有头像，圆角18，浅灰底/青绿底）
- **FR-5**: 个人主页头部区域重设计，VIP 横幅使用金棕渐变
- **FR-6**: 全页面按钮统一交互反馈（scale 0.95 + 涟漪 + 状态色变化）
- **FR-7**: TabBar 激活态视觉强化，图标线性1.5px描边风格
- **FR-8**: 状态徽章（报名中/进行中/预告）按参考实现"浅底+深字"反白组合
- **FR-9**: 课表色块使用低饱和同明度原则（饱和度≤20%，明度≈92%）
- **FR-10**: 全页面硬编码颜色/字号/间距清理，统一引用 design tokens

## Non-Functional Requirements
- **NFR-1**: H5 首屏渲染 < 1.5s，交互响应 < 100ms（按钮反馈动画触发）
- **NFR-2**: mp-weixin 编译零 error/warning，所有页面可正常打开
- **NFR-3**: 所有组件使用 design tokens，零硬编码色值/字号/间距
- **NFR-4**: 单元测试 201+ 全部通过，新增组件补充对应测试
- **NFR-5**: 视觉一致性：卡片圆角统一 16rpx（弹层24rpx、胶囊24rpx、输入标签12rpx）
- **NFR-6**: 间距一致性：全页面只使用 sp-1(4)/sp-2(8)/sp-3(12)/sp-4(16)/sp-6(24)/sp-8(40) 六档

## Constraints
- **Technical**: uni-app (Vue 3 + Pinia)、H5 + mp-weixin 双端、Vite 构建、Vitest 测试
- **Business**: 不新增业务功能，纯视觉精修；保持现有交互逻辑不变
- **Dependencies**: 现有 design tokens 系统、现有组件库、现有 mock 数据
- **mp-weixin 硬约束**: 禁用 `import.meta`、`catch {}`、`:hover`、`backdrop-filter`（opacity fallback）

## Assumptions
- 用户的 10 个 uni-view 选择代表其认为当前视觉最需改进的区域，覆盖首页核心模块
- 参考设计中的色值（如青藤绿 #3FCF8E、VIP金棕 #C9A36A→#E8C98A、价格红 #E5454D）已在 design-variables.scss 中定义
- H5 开发服务器可正常启动（端口 5173-5175），浏览器可访问进行 dogfood 验证
- 开发环境已配置好 pnpm/node 依赖

## Acceptance Criteria

### AC-1: 首页视觉对齐参考
- **Given**: 用户打开首页
- **When**: 页面加载完成
- **Then**: 顶部状态栏+标题区（高96rpx对应区域）、校园圈活动（白卡圆角16、状态徽章浅底深字）、课表空闲（周视图+低饱和色块）、校园墙（头像+标签+九宫格图+位置胶囊）、逛逛推荐（红价字）、可能认识（横卡+描边按钮）6大模块视觉样式严格匹配参考
- **Verification**: `human-judgment`
- **Notes**: 对照 [design-reference-analysis.md](file:///d:/6/恋爱小程序/docs/design-reference-analysis.md) §1.4 逐项比对

### AC-2: 卡片边缘色与阴影可见
- **Given**: 任意有卡片的页面
- **When**: 用户查看卡片
- **Then**: 每张卡片有明显的 1rpx 边缘色（rgba(15,23,42,0.08)）+ 软阴影（--s-card-soft），卡片之间层级清晰，不会与背景融为一体
- **Verification**: `human-judgment`

### AC-3: 间距韵律统一
- **Given**: 任意页面
- **When**: 测量页面元素间距
- **Then**: 所有间距只使用 4/8/12/16/24/40rpx 六档，模块间 24rpx、卡片间 12rpx、卡内边距 16rpx、卡内分组 8rpx
- **Verification**: `programmatic`（grep 硬编码间距 + 浏览器开发者工具测量）

### AC-4: 按钮交互反馈清晰
- **Given**: 任意可点击按钮/卡片
- **When**: 用户点击（tap）
- **Then**: 立即触发 scale(0.95) 缩放动画 + 涟漪效果 + 触觉反馈（lightHaptic），动画时长 200ms，松手后 150ms 恢复，用户能明确感知"已点击"
- **Verification**: `human-judgment` + `programmatic`（检查 Button 组件和可点击元素 class）

### AC-5: 圆角语言统一
- **Given**: 任意页面
- **When**: 测量圆角
- **Then**: 卡片 16rpx、弹层/模态 24rpx、胶囊按钮 24rpx（full）、输入框/标签 12rpx、头像/图标 50%
- **Verification**: `programmatic`（grep 硬编码 border-radius）

### AC-6: 寻觅页卡片质感强化
- **Given**: 用户打开寻觅页
- **When**: 卡片渲染完成
- **Then**: 推荐卡片有大圆角(24rpx)、品牌渐变边框(--border-accent)、品牌阴影(--c-brand-shadow)、当前卡片 scale(1.02)，视觉权重突出；筛选栏 chip 使用胶囊样式（圆角full、激活态青绿底白字）
- **Verification**: `human-judgment`

### AC-7: 聊天页气泡对齐参考
- **Given**: 用户进入聊天会话页
- **When**: 消息列表渲染
- **Then**: 对方气泡浅灰底(#F0F2F5)、左侧带头像(32px)、圆角18rpx；本人气泡青绿底(var(--c-brand))、右侧无头像、圆角18rpx；时间戳居中灰色小字
- **Verification**: `human-judgment`

### AC-8: 个人主页VIP区域
- **Given**: VIP 用户打开个人主页
- **When**: 页面渲染
- **Then**: VIP 横幅使用金棕渐变(--c-gradient-vip)、深色卡片底、白字、右侧"立即续费"白描边按钮；非VIP用户显示开通引导卡片
- **Verification**: `human-judgment`

### AC-9: 硬编码零残留
- **Given**: 全项目 .vue/.ts/.scss 文件
- **When**: grep 搜索硬编码颜色(#xxx/rgb/rgba)、字号(px/rpx)、间距
- **Then**: 除 design-variables.scss/tokens.ts 定义 token 的文件外，业务组件中零硬编码颜色（白/黑/透明除外需注明）、零硬编码字号、零硬编码间距
- **Verification**: `programmatic`（grep 脚本检查）

### AC-10: mp-weixin 编译零错误
- **Given**: 执行 mp-weixin 构建
- **When**: pnpm build:mp-weixin 完成
- **Then**: 编译退出码 0，无 import.meta、catch {}、:hover 问题
- **Verification**: `programmatic`

### AC-11: 单元测试全部通过
- **Given**: 执行 vitest 测试
- **When**: pnpm test 完成
- **Then**: 201+ 测试用例全部通过，无失败
- **Verification**: `programmatic`

### AC-12: H5 dogfood 走查
- **Given**: H5 开发服务器启动
- **When**: 通过浏览器系统性走查 8 个核心页面（首页/寻觅/喜欢/消息/聊天/圈子/校园墙/我的）
- **Then**: 无控制台错误、所有按钮可点击反馈清晰、图片正常加载、页面滚动流畅、无视觉错位
- **Verification**: `human-judgment`（dogfood skill）

## Open Questions
- [ ] 用户选中的 10 个 uni-view 具体对应哪些元素？（dogfood 阶段通过浏览器截图+标注确认）
