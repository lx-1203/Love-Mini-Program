# 恋爱小程序 · 设计感精修对齐青藤之恋参考 - The Implementation Plan

## Phase A: Dogfood 现状诊断 + Token 补全

### [x] Task A1: H5 dogfood 现状诊断与问题清单
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 启动 H5 开发服务器，使用 agent-browser 系统性走查 8 个核心页面
  - 截图并标注 10 个 uni-view 对应的具体元素及问题
  - 输出问题清单（视觉错位、边缘缺失、间距不对、色彩不符、按钮无反馈等）
  - 对照参考图逐页标注差距
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `human-judgement` TR-A1.1: 8 个核心页面均有截图
  - `human-judgement` TR-A1.2: 10 个 uni-view 元素被定位并描述问题
  - `programmatic` TR-A1.3: 无控制台 JS 错误
- **Notes**: 使用 dogfood skill 流程，输出到 dogfood-output/

### [x] Task A2: Design Token 补全与校验
- **Priority**: high
- **Depends On**: A1
- **Description**:
  - 审查现有 design-variables.scss tokens 是否覆盖参考设计所有需要的色值/圆角/阴影
  - 补充缺失的语义 token（状态色浅底版本、位置胶囊蓝、校内橙角标、课程块 6 色等）
  - 确保所有参考设计中提到的色值都有对应 CSS 变量
  - 在 global.css 中补充通用工具类（card-base、img-rounded、section-title-brand 等）
- **Acceptance Criteria Addressed**: AC-5, AC-9
- **Test Requirements**:
  - `programmatic` TR-A2.1: design-variables.scss 包含参考设计所有色值（青藤绿/VIP金棕/价格红/状态三色/课程六色）
  - `programmatic` TR-A2.2: 圆角 token 完整（xs:4/sm:8/md:12/lg:16/xl:24/full:9999）
  - `programmatic` TR-A2.3: 间距 token 完整（sp-0~sp-10）
  - `programmatic` TR-A2.4: 全局工具类可用（.card-base、.section-title 等）

---

## Phase B: 通用组件视觉精修

### [/] Task B1: Button 组件交互反馈强化
- **Priority**: high
- **Depends On**: A2
- **Description**:
  - 强化 Button.vue 的 press 态反馈：scale(0.95) + opacity(0.9) 过渡动画 200ms
  - 集成 Ripple 涟漪效果到主按钮
  - 确保 lightHaptic 触觉反馈在 tap 时触发
  - 主按钮/次按钮/文字按钮/胶囊按钮样式严格对齐参考（高48/圆角24/主色实心/白色描边等）
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-B1.1: 点击按钮有明显 scale 缩放反馈
  - `human-judgement` TR-B1.2: 主按钮有涟漪效果
  - `programmatic` TR-B1.3: Button 组件使用 --fs-md/--sp-4 等 token，无硬编码

### [ ] Task B2: Card 通用组件精修
- **Priority**: high
- **Depends On**: A2
- **Description**:
  - Card.vue 统一卡片样式：--r-lg 圆角、--card-border 边缘色、--s-card-soft 阴影、--sp-4 内边距
  - 新增 card-base 全局 class 供直接在模板中使用
  - 确保卡片在 H5 和 mp-weixin 中阴影和边缘色均可见
  - hover/active 态在 H5 中有微妙提升（shadow-md）
- **Acceptance Criteria Addressed**: AC-2, AC-5
- **Test Requirements**:
  - `human-judgement` TR-B2.1: 卡片有可见边缘色和软阴影
  - `programmatic` TR-B2.2: Card 组件使用 token，无硬编码
  - `programmatic` TR-B2.3: mp-weixin 编译无警告

### [ ] Task B3: Avatar 与 Tag 组件对齐参考
- **Priority**: medium
- **Depends On**: A2
- **Description**:
  - Avatar 组件：40/48/64 三档、1px 白底描边、圆形
  - Tag/Chip 组件：新增状态徽章 variant（signup/ongoing/preview），实现"浅底+深字"反白组合
  - 位置胶囊：蓝底蓝字 + 定位图标
  - 校内橙角标：左上角三角/圆角矩形
- **Acceptance Criteria Addressed**: AC-1, AC-8
- **Test Requirements**:
  - `human-judgement` TR-B3.1: 状态徽章三色（薄荷绿/琥珀黄/蓝紫）正确显示
  - `programmatic` TR-B3.2: 组件使用 token

---

## Phase C: 首页视觉精修（核心页面）

### [ ] Task C1: HomeHeader 与顶部区域精修
- **Priority**: high
- **Depends On**: B1, B2
- **Description**:
  - 首页顶部标题"首页"24/Bold、副标14/Regular灰字、搜索/铃铛线性图标
  - 学校选择器胶囊样式
  - MatchCountChip 位置和样式调整
  - 社交进度指示器 SocialProgressIndicator 图标使用 image 而非 text（已修复，再校验）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-C1.1: 标题层级清晰，主副标对比明显
  - `programmatic` TR-C1.2: 无硬编码色值/字号

### [ ] Task C2: 校园圈活动卡片精修
- **Priority**: high
- **Depends On**: B2, B3
- **Description**:
  - 白卡 --r-lg 圆角、--sp-4 内边距、--s-card-soft 阴影
  - 标题"校园圈活动"16/Bold + 右侧"全部 >"14/灰
  - 3 张横向子卡片：4:3 图片、左上角状态徽章（signup/ongoing/preview 三色）、标题、时间、地点、底部堆叠头像+人数
  - 每张子卡可点击，有 press 反馈
- **Acceptance Criteria Addressed**: AC-1, AC-4, AC-8
- **Test Requirements**:
  - `human-judgement` TR-C2.1: 状态徽章三色正确（绿/黄/蓝紫浅底深字）
  - `human-judgement` TR-C2.2: 卡片间距 12rpx、内边距 16rpx
  - `programmatic` TR-C2.3: 无硬编码

### [ ] Task C3: 课表空闲模块精修
- **Priority**: high
- **Depends On**: B2
- **Description**:
  - 白卡样式与其他模块统一
  - "课表空闲"标题 + "本周课表 >"操作
  - "今天 周X MM/DD" 大字日期
  - 周视图表格：5列（周一~周五），时间刻度行
  - 课程块使用低饱和同明度色块（6 色：浅薄荷/浅蓝/浅紫/浅杏/浅绿/浅粉），圆角8rpx，字号10/Medium
  - 未认证时显示校园认证引导卡片
- **Acceptance Criteria Addressed**: AC-1, AC-9
- **Test Requirements**:
  - `human-judgement` TR-C3.1: 课程色块饱和度低、不花哨、协调统一
  - `human-judgement` TR-C3.2: 课程块圆角8rpx、文字清晰
  - `programmatic` TR-C3.3: 色块使用 --c-schedule-* token

### [ ] Task C4: 校园墙嵌入卡片精修
- **Priority**: medium
- **Depends On**: B2, B3
- **Description**:
  - 白卡 + "校园墙 最新/关注" Tab + 蓝色"发一条"描边胶囊
  - 帖子内容：圆形头像 + 昵称 + 学院年级 meta + 时间戳
  - 正文行高1.6、字色 #1F2329
  - 3 张 1:1 图片九宫格
  - 位置标签胶囊（蓝底+蓝字+定位icon）
  - 底部互动行（❤️/💬/🔖 图标+数字）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-C4.1: 位置胶囊样式正确
  - `human-judgement` TR-C4.2: 九宫格图片间距均匀
  - `programmatic` TR-C4.3: 无硬编码

### [ ] Task C5: 逛逛推荐与可能认识模块精修
- **Priority**: medium
- **Depends On**: B2, B1
- **Description**:
  - 逛逛推荐：白卡标题、3 张商品横卡、1:1 缩略图、左上角橙色"校内"角标、大字红色价格(#E5454D 18/Bold)、灰色销量
  - 可能认识：白卡标题+"换一批 >"、3 行人物横卡、圆形40头像、昵称+学院年级、"N个共同圈子"灰字、右侧青绿描边"打个招呼"按钮（24高/圆角full）
  - 卡片可点击有反馈
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `human-judgement` TR-C5.1: 价格字为红色加粗
  - `human-judgement` TR-C5.2: "打个招呼"按钮为描边胶囊样式
  - `programmatic` TR-C5.3: 价格使用 --c-error token（或新增 --c-price）

---

## Phase D: 寻觅页精修

### [ ] Task D1: CardSwiper 卡片质感强化
- **Priority**: high
- **Depends On**: B2, B1
- **Description**:
  - 推荐卡片：大圆角 --r-xl(24rpx)、品牌渐变边框 --border-accent、品牌阴影 --c-brand-shadow
  - 当前激活卡片 scale(1.02) 微微放大
  - 卡片内图片顶部圆角、信息区白底
  - 底部操作按钮（不喜欢/超级喜欢/喜欢）样式统一、有反馈
  - 匹配成功双头像碰撞动画校验
- **Acceptance Criteria Addressed**: AC-6, AC-4
- **Test Requirements**:
  - `human-judgement` TR-D1.1: 卡片有品牌边框和阴影，质感突出
  - `human-judgement` TR-D1.2: 当前卡片微放大
  - `programmatic` TR-D1.3: 使用 token

### [ ] Task D2: 筛选栏与签到区精修
- **Priority**: medium
- **Depends On**: B3
- **Description**:
  - 筛选 chip：横向滚动、圆角full、激活态青绿底白字、非激活态灰底灰字
  - 签到按钮：醒目样式、签到前后状态变化（已签到灰底不可点）
  - 搜索框样式：圆角12rpx、浅灰底、左侧搜索图标
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-D2.1: 筛选 chip 激活态对比明显
  - `human-judgement` TR-D2.2: 签到按钮视觉权重高
  - `programmatic` TR-D2.3: 使用 token

---

## Phase E: 喜欢/消息/聊天/我的/圈子页精修

### [ ] Task E1: 喜欢页(Likes)列表精修
- **Priority**: medium
- **Depends On**: B2, B3
- **Description**:
  - Tab 切换（喜欢我的/我喜欢的/互相喜欢/访客）样式
  - 用户卡片：圆形头像、昵称、学院年级、匹配度标签、操作按钮
  - 空状态 EmptyState 样式优化
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-E1.1: 列表项统一卡片样式
  - `programmatic` TR-E1.2: 无硬编码

### [ ] Task E2: 消息页(Messages)列表精修
- **Priority**: medium
- **Depends On**: B2
- **Description**:
  - 聊天列表项：圆形头像(48)、昵称(15/Medium)、最新消息摘要(13/灰)、时间戳(12/灰)、未读数红点徽章
  - 列表项分隔线 1rpx rgba(15,23,42,0.06)
  - 点击有 scale 反馈
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-E2.1: 头像/昵称/消息/时间层级清晰
  - `programmatic` TR-E2.2: 无硬编码

### [ ] Task E3: 聊天会话页(ChatSession)气泡精修
- **Priority**: high
- **Depends On**: B3
- **Description**:
  - ChatBubble 组件重设计：对方气泡浅灰底(#F0F2F5)、左侧32头像、圆角18rpx；本人气泡青绿底(var(--c-brand))白字、右侧无头像、圆角18rpx
  - 气泡内边距 10/14rpx
  - 时间戳居中、灰色小字
  - 底部输入栏微信风格：左侧语音、居中输入框(圆角12)、表情/加号
  - 键盘弹起时输入栏适配
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-E3.1: 对方气泡灰底带头像，本人气泡绿底无头像
  - `human-judgement` TR-E3.2: 气泡圆角统一 18rpx
  - `programmatic` TR-E3.3: 使用 token，无 :hover 伪类

### [ ] Task E4: 个人主页(Profile)精修
- **Priority**: high
- **Depends On**: B2, B1, B3
- **Description**:
  - 头部区域：背景图/品牌渐变 fallback、圆形大头像(80px)居中、昵称(20/Bold)、学校年级标签、签名
  - VIP 横幅：金棕渐变(--c-gradient-vip)、深色卡片底、白字、右侧"立即续费/开通"白描边按钮、截止日
  - 数据统计：关注/粉丝/获赞三列，数字加粗
  - 功能菜单：8 格宫格图标（2行4列），图标使用 image 标签、彩色浅色圆形背景、文字标签
  - MatchCountChip 显示剩余匹配次数
  - 资料完善度进度条
- **Acceptance Criteria Addressed**: AC-8, AC-1
- **Test Requirements**:
  - `human-judgement` TR-E4.1: VIP 横幅为金棕渐变，质感高级
  - `human-judgement` TR-E4.2: 功能菜单图标使用 image 渲染正确
  - `programmatic` TR-E4.3: 使用 token，无硬编码
  - `programmatic` TR-E4.4: 头像/image 不使用 text 标签

### [ ] Task E5: 圈子/校园墙页精修
- **Priority**: medium
- **Depends On**: B2, B3
- **Description**:
  - 圈子/校园墙列表卡片样式与首页嵌入卡片统一
  - 发帖 FAB（浮动按钮）：圆形、青绿渐变底、白色加号、悬浮阴影 --s-float-btn
  - Tab 切换（最新/关注/热门）胶囊样式
  - 帖子详情页头部返回+标题样式
- **Acceptance Criteria Addressed**: AC-2, AC-4
- **Test Requirements**:
  - `human-judgement` TR-E5.1: 发帖按钮悬浮明显
  - `programmatic` TR-E5.2: FAB 使用 --gradient-float-btn 和 --s-float-btn

---

## Phase F: TabBar 与全局导航精修

### [ ] Task F1: 自定义 TabBar 视觉强化
- **Priority**: medium
- **Depends On**: A2
- **Description**:
  - TabBar 高 49px + 底部安全区
  - 5 枚图标线性1.5px描边风格、激活态实心青绿色
  - 文字 10/Medium，激活态主色
  - 背景白色 + 顶部 1rpx 边缘色
  - backdrop-filter 加上 opacity:0.96 fallback（mp-weixin 兼容）
  - custom-tab-bar/index.wxss 同步更新
- **Acceptance Criteria Addressed**: AC-5, AC-2
- **Test Requirements**:
  - `human-judgement` TR-F1.1: TabBar 激活态对比明显
  - `programmatic` TR-F1.2: backdrop-filter 有 opacity fallback
  - `programmatic` TR-F1.3: 无 :hover 伪类

### [ ] Task F2: 页面切换动画校验
- **Priority**: low
- **Depends On**: F1
- **Description**:
  - 校验所有页面切换动画（uni-app 内置）流畅无闪烁
  - 页面进入时内容不跳动
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `human-judgement` TR-F2.1: 页面切换流畅

---

## Phase G: 硬编码清理 + 最终验证

### [ ] Task G1: 全项目硬编码清理
- **Priority**: high
- **Depends On**: C1-C5, D1-D2, E1-E5, F1
- **Description**:
  - grep 全项目，查找 .vue/.ts/.scss 中的硬编码颜色（#[0-9a-fA-F]{3,6}、rgb/rgba）
  - grep 硬编码字号（font-size:\s*\d+rpx）
  - grep 硬编码间距（margin/padding:\s*\d+rpx）
  - grep 硬编码圆角（border-radius:\s*\d+rpx）
  - 将所有硬编码值替换为 design token 引用
  - 白名单：design-variables.scss、tokens.ts、theme 目录文件可包含原始值
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `programmatic` TR-G1.1: 业务组件（src/components/*、src/pages/*、src/subpackages/*）中硬编码颜色为 0
  - `programmatic` TR-G1.2: 业务组件中硬编码字号为 0
  - `programmatic` TR-G1.3: 业务组件中硬编码间距/圆角为 0（特殊情况需注释说明）

### [ ] Task G2: mp-weixin 编译验证
- **Priority**: high
- **Depends On**: G1
- **Description**:
  - 执行 pnpm build:mp-weixin
  - 确认退出码为 0
  - 检查编译输出无 import.meta、catch {}、:hover 警告
  - 检查 custom-tab-bar 样式正确编译
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `programmatic` TR-G2.1: build:mp-weixin 退出码 0
  - `programmatic` TR-G2.2: 无 import.meta 残留
  - `programmatic` TR-G2.3: 无 optional catch binding
  - `programmatic` TR-G2.4: 无 :hover 伪类

### [ ] Task G3: 单元测试运行
- **Priority**: high
- **Depends On**: G2
- **Description**:
  - 执行 pnpm test（vitest run）
  - 确保所有测试通过（≥201 个用例）
  - 若有测试因样式类名/结构变化失败，修复测试（不弱化断言）
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `programmatic` TR-G3.1: vitest 全部通过，exit code 0
  - `programmatic` TR-G3.2: 测试用例总数 ≥ 201

### [ ] Task G4: H5 最终 dogfood 走查
- **Priority**: high
- **Depends On**: G3
- **Description**:
  - 启动 H5 开发服务器
  - 使用 agent-browser 逐页走查 8 个核心页面
  - 点击所有可交互按钮/卡片，验证反馈动画
  - 截图存档到 .trae/screenshots/final-validation/
  - 对照参考图确认视觉对齐
  - 检查无控制台错误
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-12
- **Test Requirements**:
  - `human-judgement` TR-G4.1: 8 页面全部视觉对齐参考
  - `human-judgement` TR-G4.2: 所有按钮点击反馈清晰
  - `programmatic` TR-G4.3: 控制台零错误
  - `human-judgement` TR-G4.4: 卡片边缘色/阴影清晰可见
  - `human-judgement` TR-G4.5: 间距韵律统一，无突兀留白/拥挤
