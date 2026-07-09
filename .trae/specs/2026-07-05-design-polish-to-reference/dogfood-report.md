# H5 Dogfood 现状诊断报告

**日期**: 2026-07-05  
**版本**: v1.0  
**服务器地址**: http://localhost:5173/  
**设备模拟**: iPhone 14 (390x844)

---

## 一、页面截图清单

| # | 页面 | 路由 | 截图路径 |
|---|------|------|----------|
| 1 | 登录页 | /pages/login/index | .trae/screenshots/dogfood-2026-07-05/01-login.png |
| 2 | 首页 | /pages/home/index (/#/) | .trae/screenshots/dogfood-2026-07-05/02-home.png |
| 3 | 寻觅（匹配）页 | /pages/discover/index | .trae/screenshots/dogfood-2026-07-05/03-discover.png |
| 4 | 喜欢页 | /pages/likes/index | .trae/screenshots/dogfood-2026-07-05/04-likes.png |
| 5 | 消息列表页（旧） | /pages/messages/index | .trae/screenshots/dogfood-2026-07-05/05-messages-old.png |
| 6 | 聊天会话页 | /pages/chat-session/index | .trae/screenshots/dogfood-2026-07-05/06-chat-session.png |
| 7 | 村口（圈子）页 | /pages/village/index | .trae/screenshots/dogfood-2026-07-05/07-village.png |
| 8 | 我的页 | /pages/profile/index | .trae/screenshots/dogfood-2026-07-05/08-profile.png |
| 9 | 聊天列表页（TabBar实际使用） | /pages/chat/index | .trae/screenshots/dogfood-2026-07-05/09-chat-list.png |

---

## 二、控制台错误汇总

经检查，当前 H5 开发模式下 **无 JavaScript 运行时错误**。但存在以下警告/问题：

| 级别 | 描述 | 位置 |
|------|------|------|
| Low | agent-browser snapshot 交互元素检测失败（uni-view/uni-text 组件未能正确映射为可交互元素） | 全局 |
| Low | tabBar 配置 selectedColor 为 `#5B7FFF`（蓝色），与青藤绿主色调不一致 | pages.json:179 |

---

## 三、问题清单（按严重程度分类）

### Critical（阻断性问题 - 0个）
无阻断性崩溃问题。

### High（高优先级功能/视觉问题 - 10个）

| ID | 严重程度 | 模块 | 问题描述 | 位置 |
|----|----------|------|----------|------|
| H-01 | high | 签到功能 | **签到后额外配额未持久化**：`extraQuota` 在 `discoverStore.setExtraQuota()` 中仅设置内存状态，未写入 localStorage，刷新页面后 +5 次配额丢失，导致"签到了但次数没加上" | src/stores/discover.ts:1026-1028, 876-891 |
| H-02 | high | 签到功能 | **已签到卡片不可点击/无跳转**：签到后显示的 `checkin-card--done` 状态卡片（`benefit-card--quota`）没有 `@click` 事件，点击无反应，用户困惑"签到后无法操作" | src/pages/discover/index.vue:303-312 |
| H-03 | high | 聊天输入 | **微信风格输入栏点击无反应**：`wechat-input-bar` 区域的按钮（语音、表情、+号）和输入框未绑定事件处理函数，输入法适配缺失（keyboardHeight 监听未接入，输入框不随键盘上移） | 用户选中元素 #4 |
| H-04 | high | 视觉设计 | **核心页面缺乏若隐若现的氛围感**：寻觅页、锁屏页等关键页面缺少青藤之恋风格的高斯模糊、半透明渐变、柔光效果，视觉吸引力不足 | 全局 |
| H-05 | high | 视觉设计 | **卡片边缘色/阴影过弱或缺失**：部分卡片（如 benefit-card、daily-question-card）边框为 none 或阴影极淡，在白色/浅灰背景下几乎"飘浮"无边界，层级感差 | src/pages/discover/index.vue:872-874 |
| H-06 | high | 资料设置 | **"第一版尽量简短"文案需要删除**：基础资料页副标题写着"第一版尽量简短，后面都可以继续修改"，不符合产品正式版定位 | subpackages/setup/profile/index（用户选中元素 #6） |
| H-07 | high | 匹配筛选 | **筛选条件过于简单**：只有附近/不限/18-25岁/匹配度优先4个选项，缺乏相亲核心需求筛选（身高、学历、感情状态、籍贯、未来规划等），用户要求全部可选 | src/pages/discover/index.vue:154-159 |
| H-08 | high | 用户卡片 | **只有头像没有半身/全身照**：列表用户卡片（user-card）仅展示小头像（avatar），缺乏青藤之恋风格的大尺寸半身照片展示，无法体现人物魅力 | 用户选中元素 #9 |
| H-09 | high | 课表功能 | **课表功能被校园认证锁定**：`schedule-locked-card` 显示"完成校园认证后解锁课表功能"，用户明确要求课表不需要认证即可使用 | 用户选中元素 #10（需移除锁定逻辑） |
| H-10 | high | 个人主页 | **顶部背景无法展示图片**：profile-top-bar 和个人主页头部缺少自定义背景图上传/展示功能，用户要求"背景要能放图片展示" | 用户选中元素 #5 |

### Medium（中优先级问题 - 16个）

| ID | 严重程度 | 模块 | 问题描述 | 位置 |
|----|----------|------|----------|------|
| M-01 | medium | 色彩系统 | **大量硬编码颜色未使用主题变量**：discover/index.vue 中有 20+ 处硬编码颜色（#f8fafc、#eef2ff、#9AA1AB、#2DB97A、#FFFFFF、rgba(226,232,240,0.8) 等），未使用 var(--c-*) 变量 | src/pages/discover/index.vue:476, 504, 598, 686 等 |
| M-02 | medium | 圆角系统 | **圆角不统一**：卡片圆角有 20rpx（benefit-card）、24rpx（checkin-card）、16rpx（设计规范）混用；按钮有的用 999rpx（full）有的用 24rpx | src/pages/discover/index.vue:643, 870, 935 |
| M-03 | medium | 间距系统 | **间距存在非标准档位**：代码中出现 gap: 4rpx、gap: 6rpx、padding: 14rpx 28rpx、margin: 16rpx 24rpx 等不符合 4/8/12/16/24/32rpx 标准档位的值 | src/pages/discover/index.vue:501, 539, 577 |
| M-04 | medium | 主色调一致性 | **TabBar 选中色为蓝色**：pages.json 中 selectedColor 为 #5B7FFF（蓝色），与青藤绿主色 #3FCF8E 不一致 | pages.json:179 |
| M-05 | medium | 页面背景 | **寻觅页背景渐变错误**：当前背景为 `linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`（蓝灰色调），应该使用青藤绿+浪漫粉的氛围渐变 `var(--gradient-page)` | src/pages/discover/index.vue:476 |
| M-06 | medium | 点击反馈 | **部分可点击元素缺少 press-feedback 激活态**：虽然大部分有 hover-class，但某些交互区域（如签到成功后的权益卡片箭头）缺少明确的 scale/opacity 反馈 | 全局 |
| M-07 | medium | 学校认证 | **学校认证入口缺失/不明显**：用户要求加入学校认证，但当前 setup 流程中校园认证入口不突出，需要强化认证引导和认证标识展示 | 用户选中元素 #6 |
| M-08 | medium | 论坛跳转 | **圈子（村口）到匹配的跳转路径不明显**：在 village/circles 页面缺少"去匹配""发现附近的人"等便捷跳转入口，用户需要从论坛方便地跳转到匹配 | 用户选中元素 #8 |
| M-09 | medium | Onboarding | **onboard-top 引导元素不显示/被遮挡**：onboard-top 区域（1/6 步骤、跳过按钮）在当前页面中未正常渲染，可能是条件渲染或 z-index 问题 | 用户选中元素 #1 |
| M-10 | medium | 个人主页 | **match-count-chip 缺少背景图展示能力**：profile 顶部的匹配次数胶囊与背景图层级关系需要调整，确保背景图可见 | 用户选中元素 #5 |
| M-11 | medium | 视频上传 | **缺少个人视频上传功能**：用户资料和卡片展示只有图片，没有视频上传/播放功能，青藤之恋等竞品支持视频展示 | 全局 |
| M-12 | medium | 签到状态 | **签到后"已签到"卡片视觉不突出**：benefit-card--quota 使用浅绿背景但文字对比度一般，成功状态缺乏庆祝动画或更醒目的视觉反馈 | src/pages/discover/index.vue:884-887 |
| M-13 | medium | 文字层级 | **部分标题/描述文字层级不清晰**：如每日一问卡片的描述文字 opacity:0.7 导致可读性差，次要信息与主要信息字重/颜色对比不足 | src/pages/discover/index.vue:973-980 |
| M-14 | medium | 锁屏页面 | **lock-screen 装饰 blur-avatar 效果不佳**：三个模糊头像位置和模糊度不够吸引人，需要更强的若隐若现感和心动氛围 | 用户选中元素 #7 |
| M-15 | medium | 首页模块 | **首页5大模块对齐参考不足**：校园圈活动/课表空闲/校园墙/逛逛推荐/可能认识这5个模块的布局和视觉权重需要参照青藤之恋重新规划，当前信息密度和吸引力不够 | src/pages/home/index.vue |
| M-16 | medium | 搜索框 | **搜索框功能未实现**：搜索框输入只触发防抖，但 mock 模式下未实际过滤卡片，搜索无实际效果 | src/pages/discover/index.vue:175-177 |

### Low（低优先级优化项 - 12个）

| ID | 严重程度 | 模块 | 问题描述 |
|----|----------|------|----------|
| L-01 | low | 字体 | **字体使用系统默认栈**，可以考虑引入更有青春感的中文字体（如 PingFang SC 已配置但字重映射可优化） |
| L-02 | low | 图标 | **部分图标使用 emoji 字符**（📍👥🎂✨🔍🎤😊+ 等），与图标库风格不统一，应替换为 SVG 图标 |
| L-03 | low | 筛选chip | **筛选 chip 激活态阴影为蓝色调** `rgba(63, 207, 142, 0.3)` 实际是绿色但背景渐变正确，可增加微光效果 |
| L-04 | low | 数字显示 | **"7 次"等数字的渐变文字**在某些设备/浏览器上 background-clip:text 可能失效，需要降级测试 |
| L-05 | low | 动画 | **卡片滑动动画时长**可再优化，当前 300ms cubic-bezier 可更"弹"一些 |
| L-06 | low | 签到按钮 | **签到成功动画**只有缩放弹出，缺少撒花/心形粒子效果 |
| L-07 | low | 空状态 | **卡片用完后的活动推荐**视觉上与匹配卡片脱节，过渡不自然 |
| L-08 | low | 匹配动画 | **match-overlay** 双头像碰撞动画背景纯黑，可改为半透明渐变+模糊背景 |
| L-09 | low | 社交提示 | **social-hint 社交升温提示**可增加小箭头或心跳动画增强吸引力 |
| L-10 | low | 每日一问 | **daily-question-card 浪漫粉色调**与整体青藤绿主题的融合可更自然 |
| L-11 | low | count-chip | **discover-header__count-chip** 使用了错误的蓝色备用变量 `rgba(91, 127, 255, 0.1)`（#5B7FFF是旧版蓝色），应改为青藤绿 |
| L-12 | low | 骨架屏 | **签到骨架屏动画**可增加微光扫过（shimmer）效果提升质感 |

---

## 四、用户选中的 10 个 uni-view 元素定位与问题

| # | 元素类名 | 所在页面/组件 | 对应问题ID | 问题描述 |
|---|----------|---------------|------------|----------|
| 1 | `.onboard-top` | 引导页/Onboarding | M-09 | 引导步骤条（1/6 + 跳过）未正常显示，可能是 v-if 条件或层级问题导致隐藏 |
| 2 | `.checkin-card--done` | 寻觅页（签到后状态） | H-02, M-12 | 已签到卡片点击无反应，没有绑定 @click 事件；视觉上成功感不足 |
| 3 | `.discover-page` | 寻觅页整体 | H-04, H-05, M-05 | 核心匹配页面缺乏若隐若现的氛围感，卡片边缘阴影弱，背景色为蓝灰而非浪漫渐变；论坛到匹配跳转不便捷 |
| 4 | `.wechat-input-bar` | 聊天会话页 | H-03 | 微信风格输入栏按钮无事件绑定，输入法键盘适配未完成（keyboardHeight 未生效） |
| 5 | `.profile-top-bar` / `.match-count-chip` | 我的页 | H-10, M-10 | 个人主页顶部无法展示自定义背景图片；匹配次数胶囊与背景层级需调整 |
| 6 | `.shell` (基础资料页) | 资料设置 subpackage | H-06, M-07 | "第一版尽量简短"文案需删除；筛选维度太少；学校认证入口需要强化 |
| 7 | `.lock-screen` | 锁屏/功能引导页 | H-04, M-14 | 解锁引导页的模糊头像效果不够吸引人，缺乏心动/若隐若现的氛围感 |
| 8 | `.discover-page` (核心页面) | 寻觅页 | H-04, M-08 | 核心页面需要重新设计，增强若隐若现的吸引力；需要增加论坛（村口）到匹配的便捷跳转 |
| 9 | `.user-card` (列表用户卡片) | 喜欢页/列表页 | H-08, M-11 | 用户卡片只有小头像，缺乏半身/全身大照片展示；需要支持视频上传展示人物魅力 |
| 10 | `.schedule-locked-card` | 课表相关页面 | H-09 | 课表功能被错误地要求校园认证，用户明确要求课表无需认证即可使用，需移除锁定卡片 |

---

## 五、与青藤之恋参考设计的差距列表

| 差距维度 | 当前状态 | 参考目标 | 优先级 |
|----------|----------|----------|--------|
| **视觉氛围** | 平面化、卡片+列表为主，缺少层次感 | 高斯模糊、半透明卡片、渐变叠加、柔光氛围、若隐若现 | high |
| **人物展示** | 小头像（48-80rpx），文字为主 | 大尺寸半身照片（占屏幕宽度60-70%），照片墙，视频展示 | high |
| **筛选维度** | 4个简单选项（附近/不限/年龄/匹配度） | 身高、学历、感情状态、籍贯、未来城市、生活习惯、兴趣标签等全维度可选 | high |
| **主色调一致性** | TabBar蓝色、部分备用色蓝色 | 全量青藤绿 #3FCF8E + 浪漫粉 #EC4899 双色系 | medium |
| **边缘与阴影** | 阴影淡、边框弱、部分卡片无边框 | 清晰的卡片层级：微妙边框+多层阴影+16rpx圆角 | high |
| **点击反馈** | 部分有 press-feedback，缺少触觉 | 全部可点击元素有 scale(0.96-0.98) 反馈 + 触觉震动 | medium |
| **间距系统** | 存在非标准值（6rpx、14rpx等） | 严格 4/8/12/16/24/32/48rpx 8档间距 | medium |
| **圆角系统** | 20/24/16rpx 混用 | 卡片16rpx、弹层24rpx、胶囊full、输入框12rpx 严格统一 | medium |
| **背景渐变** | 部分页面错误使用蓝灰色 | 全局浪漫渐变：#FFF5F7 → #E8F8F0 → #F4F6FA | medium |
| **学校认证** | 入口不明显，认证状态展示弱 | 明显的认证徽章、认证流程引导、认证用户优先推荐 | medium |
| **课表功能** | 被认证锁定 | 无需认证即可使用，作为校园社交核心卖点 | high |
| **个人主页背景** | 纯色/无背景 | 支持上传自定义背景图片，营造个人风格 | high |
| **视频资料** | 完全不支持 | 支持上传个人介绍视频，自动播放预览 | medium |
| **签到体验** | 签到后仅显示文字，无配额增加感 | 签到成功有粒子/心形动画，配额数字实时+5动画反馈 | high |
| **论坛→匹配跳转** | 需要切Tab，路径长 | 村口帖子作者头像/卡片可直接点击跳转到匹配/个人资料 | medium |

---

## 六、硬编码审计（部分典型示例）

需要清理的硬编码颜色/数值（src/pages/discover/index.vue 中已发现）：

```scss
// 第476行 - 背景渐变硬编码（应使用 var(--gradient-page)）
background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);

// 第504行 - 边框色硬编码（应使用 var(--c-border-light)）
border: 1rpx solid rgba(226, 232, 240, 0.8);

// 第539行 - margin 硬编码非标准值（应使用 var(--sp-*)）
margin: 16rpx 24rpx;

// 第598行 - 文字颜色硬编码（应使用 var(--c-text-tertiary)）
color: #9AA1AB;

// 第613-614行 - count-chip 使用旧蓝色（应改为青藤绿）
background: var(--c-brand-50, rgba(91, 127, 255, 0.1));
border: 1rpx solid var(--c-brand-200, rgba(91, 127, 255, 0.2));

// 第643-645行 - 签到卡片圆角24rpx（规范为16rpx）
border-radius: 24rpx;

// 第686行 - 按钮文字颜色硬编码
color: #2DB97A;

// 第870行 - 权益卡片圆角20rpx（规范为16rpx）
border-radius: 20rpx;

// 第970行 - 每日一问标题颜色硬编码
color: #BE185D;
```

---

## 七、功能Bug确认

| Bug ID | 模块 | 现象 | 根因分析 |
|--------|------|------|----------|
| BUG-01 | 签到配额 | 签到后显示"+5"但刷新页面后次数回到原值 | `discoverStore.saveToStorage()` 只保存 viewedCards/hasRewoundToday/lastRefreshTime，未持久化 extraQuota；跨天重置逻辑也未从签到状态恢复配额 |
| BUG-02 | 签到点击 | 已签到后卡片点击无反应 | `benefit-card--quota` 没有 @click 事件，也没有 hover-class 激活态 |
| BUG-03 | 输入框 | 聊天输入框点击无反应 | `wechat-input-bar__input` 是 uni-input 但外层没有绑定 @confirm/@input 完整事件，+号/表情/语音按钮无 @tap |
| BUG-04 | 筛选 | 点击筛选chip只是高亮，不改变推荐列表 | `setFilter()` 调用 fetchCards() 但 mock 模式下 fetchCards() 不根据 activeFilter 过滤卡片 |
| BUG-05 | 课表 | 课表被锁定要求认证 | `schedule-locked-card` 条件渲染未移除，用户需求是课表无需认证 |
| BUG-06 | 页面路由 | pages/messages/index 与 pages/chat/index 两个消息页并存 | tabBar 使用 chat/index，但 messages/index 是旧页面，造成混淆 |

---

## 八、总结统计

| 严重程度 | 数量 |
|----------|------|
| Critical（阻断） | 0 |
| High（高优先级） | 10 |
| Medium（中优先级） | 16 |
| Low（低优先级） | 12 |
| **合计** | **38** |

**核心结论**：
1. 基础功能框架完整，无崩溃问题
2. **签到配额持久化**和**聊天输入交互**是两个最紧急的功能bug
3. 视觉上最大差距是**缺乏青藤之恋风格的"若隐若现"氛围感**（半透明、模糊、渐变、大照片）
4. 硬编码颜色/间距/圆角问题较普遍，需要一轮全面的token替换
5. 筛选维度和人物展示（半身照+视频）是产品体验升级的关键方向
6. 课表的认证锁定需要立即移除
7. 文案"第一版"需要删除，学校认证需要强化
