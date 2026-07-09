# 视觉差距审计报告 · Visual Gap Report

**审计日期**: 2026-07-05
**当前截图目录**: [`.trae/screenshots/visual-reaudit-2026-07-05/`](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/)
**参考图**: [docs/design-reference-analysis.md](file:///d:/6/恋爱小程序/docs/design-reference-analysis.md)
**前序 dogfood 报告**: [dogfood-report.md](file:///d:/6/恋爱小程序/.trae/specs/2026-07-05-design-polish-to-reference/dogfood-report.md)

---

## 审计方法

- 使用 Chrome DevTools MCP 对 12 个核心页面进行 full-page 截图
- 与 `docs/design-reference-analysis.md` §2.1-§2.7 设计元素逐项比对
- 按 6 维度（颜色/间距/圆角/阴影/氛围感/层级）分类差距
- 严重程度：critical（阻断）/ high（高）/ medium（中）/ low（低）

---

## 一、登录页 (01-login.png)

**当前截图**: [01-login.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/01-login.png)
**参考图**: [14_53_26.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_53_26.png) §1.1 登录页

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| L-01.1 | 氛围感 | 实景图占比不足 70%，主视觉弱 | 实景图占 70% 高度，主标题压底 | high |
| L-01.2 | 层级 | 主标题字号不足 28/Bold，缺乏视觉冲击 | 28/Bold，副标 14/Regular | medium |
| L-01.3 | 颜色 | 主按钮青绿色正确但缺微信图标 | 微信图标 + 青绿实心 | medium |
| L-01.4 | 间距 | 按钮区与图像区比例失衡 | 图像(70%) → 标题(15%) → 按钮(15%) | high |
| L-01.5 | 氛围感 | 缺少半透明渐变叠加层 | 底部白色渐变叠加增强文字可读性 | medium |

---

## 二、首页 (02-home.png)

**当前截图**: [02-home.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/02-home.png)
**参考图**: [14_57_50.png](file:///d:/6/恋爱小程序/ref_img.png) §1.4 单屏首页大图

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| H-02.1 | 间距 | 模块间距非 16rpx 标准档，存在 14/28rpx | 严格 16/12/8 三档 | high |
| H-02.2 | 圆角 | 校园圈活动卡片圆角混用 16/20/24 | 统一 16rpx | high |
| H-02.3 | 阴影 | 卡片阴影过淡，边缘色缺失 | 0 1px 2px + 0 4px 12px 双层阴影 + 1rpx 边 | high |
| H-02.4 | 颜色 | 状态徽章三色未严格对齐参考 | signup 薄荷绿 / ongoing 琥珀黄 / preview 蓝紫 | high |
| H-02.5 | 颜色 | 课程色块饱和度过高 | 饱和度 ≤20%，明度 ≈92% | medium |
| H-02.6 | 层级 | 模块标题与右侧操作权重失衡 | 主标题 16/Bold + 右侧 14/灰色右箭头 | medium |
| H-02.7 | 氛围感 | 缺少最近活动 sticky banner | TabBar 上方 64rpx 胶囊 banner | medium |
| H-02.8 | 间距 | 卡片内边距不统一 14/16/20 混用 | 严格 16rpx | high |
| H-02.9 | 颜色 | 价格红色未使用 #E5454D 标准 | 严格 #E5454D | medium |
| H-02.10 | 层级 | "打个招呼"按钮样式不统一 | 蓝色描边胶囊 --r-full | medium |

---

## 三、寻觅页 (03-discover.png)

**当前截图**: [03-discover.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/03-discover.png)
**参考图**: [14_53_26.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_53_26.png) §1.1 + [14_59_58.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_59_58.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| D-03.1 | 颜色 | 背景渐变错误（蓝灰） | 浪漫粉绿渐变 #FFF5F7→#E8F8F0→#F4F6FA | high |
| D-03.2 | 氛围感 | 缺少若隐若现的卡片氛围 | 卡片轻微高斯模糊背景层 | high |
| D-03.3 | 圆角 | CardSwiper 卡片圆角非 24rpx | 严格 --r-xl 24rpx | high |
| D-03.4 | 阴影 | 卡片阴影弱、边缘色缺失 | 品牌阴影 + 1rpx 边 | high |
| D-03.5 | 层级 | 用户卡片仅小头像，缺半身照 | 顶部 4:5 大图 + 底部信息区 | high |
| D-03.6 | 颜色 | count-chip 使用旧蓝色 fallback | 青藤绿 var(--c-bg-brand) | medium |
| D-03.7 | 间距 | 出现 4/6/14/28rpx 非标准值 | 严格 4/8/12/16/24/32/48 | high |
| D-03.8 | 层级 | 筛选 chip 维度过少（仅 4 个） | 身高/学历/感情状态/籍贯/未来城市/关键词 | high |
| D-03.9 | 颜色 | 签到卡片文字对比度不足 | 浅绿底 + 深绿字 (#7CD9A6/#1A7A4A) | medium |
| D-03.10 | 氛围感 | 签到成功缺粒子动画 | 心形粒子撒花 1.5s | medium |
| D-03.11 | 颜色 | 每日一问卡片硬编码 #BE185D | 使用 var(--c-romance-500) | medium |
| D-03.12 | 层级 | 已签到卡片无点击反馈 | press-scale + 跳转 | high |

---

## 四、喜欢页 (04-likes.png)

**当前截图**: [04-likes.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/04-likes.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| L-04.1 | 颜色 | 背景 hardcode | var(--c-gradient-page) | medium |
| L-04.2 | 层级 | 用户卡片仅小头像，缺大尺寸照片 | 横卡 80rpx 头像 + 缩略图入口 | high |
| L-04.3 | 圆角 | 卡片圆角不统一 | --r-lg 16rpx | medium |
| L-04.4 | 层级 | Tab 切换样式权重不足 | 胶囊样式 + 激活态主色 | medium |
| L-04.5 | 颜色 | 缺认证徽章 | 显示 verificationBadgeLevel | medium |

---

## 五、消息列表 (05-messages.png)

**当前截图**: [05-messages.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/05-messages.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| M-05.1 | 间距 | 列表项 padding 不统一 | 12/16rpx 标准 | medium |
| M-05.2 | 颜色 | 未读数红点颜色 hardcode | var(--c-error) | low |
| M-05.3 | 层级 | 时间戳字号偏大 | 12/灰色 | low |
| M-05.4 | 阴影 | 列表分隔线颜色偏深 | var(--c-border-light) | low |

---

## 六、聊天会话 (06-chat-session.png)

**当前截图**: [06-chat-session.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/06-chat-session.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| C-06.1 | 颜色 | 本人气泡非青绿底 | var(--c-brand) 白字 | high |
| C-06.2 | 圆角 | 气泡圆角非 18rpx | 严格 18rpx | medium |
| C-06.3 | 间距 | 气泡内边距非 10/14rpx | 严格 10/14 | medium |
| C-06.4 | 层级 | 输入栏按钮无反应（BUG-03） | 绑定 @tap 事件 | high |
| C-06.5 | 间距 | 输入栏未跟随键盘上移 | keyboardHeight 监听 | high |
| C-06.6 | 颜色 | 对方气泡非浅灰底 | var(--c-neutral-100) | medium |
| C-06.7 | 层级 | 缺时间戳居中灰色小字 | 11:21 格式居中 | low |

---

## 七、村口/圈子 (07-village.png)

**当前截图**: [07-village.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/07-village.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| V-07.1 | 颜色 | 卡片背景 hardcode | var(--c-bg-container) | medium |
| V-07.2 | 圆角 | 卡片圆角非 16rpx | --r-lg 16rpx | medium |
| V-07.3 | 层级 | 帖子作者头像不可点击跳转 | @tap 跳转 profile | high |
| V-07.4 | 层级 | 缺"附近的人"快捷入口 | 跳转 /pages/discover/index | medium |
| V-07.5 | 阴影 | FAB 阴影不足 | var(--s-float-btn) | medium |
| V-07.6 | 颜色 | Tab 切换样式权重不足 | 胶囊 + 激活态主色 | low |

---

## 八、我的页 (08-profile.png)

**当前截图**: [08-profile.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/08-profile.png)
**参考图**: [14_53_26.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_53_26.png) §1.1 我的会员页

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| P-08.1 | 氛围感 | 顶部缺背景图（H-10） | 支持上传背景图，fallback 品牌渐变 | high |
| P-08.2 | 颜色 | VIP 横幅非暖金渐变 12° | linear-gradient(12deg, #C9A36A, #E8C98A) | high |
| P-08.3 | 层级 | 编辑按钮可见性弱 | 添加背景、边框 | high |
| P-08.4 | 层级 | 缺认证徽章（M-07） | VerificationBadge 组件 | high |
| P-08.5 | 颜色 | 8 格宫格图标使用 emoji | SVG 线性 1.5px 描边 | medium |
| P-08.6 | 层级 | 缺个人视频区块（M-11） | 上传/播放/删除 | high |
| P-08.7 | 层级 | 缺照片墙区块 | 3x2 网格 6 张 | high |
| P-08.8 | 间距 | 数据统计三列间距非标准 | 严格 --sp-4 | medium |
| P-08.9 | 颜色 | 横幅"立即续费"按钮非白描边 | 白色描边 + 白字 | medium |
| P-08.10 | 层级 | 资料完善度进度条样式弱 | 品牌色填充 + 圆角 | low |

---

## 九、课表页 (09-schedule.png)

**当前截图**: [09-schedule.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/09-schedule.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| S-09.1 | 颜色 | 课程色块饱和度过高 | 饱和度 ≤20% 明度 ≈92% | high |
| S-09.2 | 圆角 | 课程块圆角非 8rpx | --r-sm 8rpx | medium |
| S-09.3 | 间距 | 时间刻度列间距非 16rpx | --sp-4 | medium |
| S-09.4 | 层级 | 课程块字号非 10/Medium | --fs-xs + Medium | low |
| S-09.5 | 颜色 | 6 色块未严格对齐参考 | mint/blue/purple/apricot/green/pink | medium |

---

## 十、校园认证 (10-certification.png)

**当前截图**: [10-certification.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/10-certification.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| CT-10.1 | 颜色 | ~80 处 hardcode | 全部 token 化 | medium |
| CT-10.2 | 圆角 | 表单圆角不统一 | --r-md 12rpx | medium |
| CT-10.3 | 间距 | 间距非标准档位 | 严格 4/8/12/16/24/32 | medium |
| CT-10.4 | 层级 | 认证状态徽章未显示 | verificationBadgeLevel 展示 | high |
| CT-10.5 | 颜色 | 错误色 hardcode | var(--c-error) | low |

---

## 十一、每日一问 (11-daily-question.png)

**当前截图**: [11-daily-question.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/11-daily-question.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| DQ-11.1 | 颜色 | ~75 处 hardcode | 全部 token 化 | medium |
| DQ-11.2 | 氛围感 | 问题卡片非浪漫粉绿渐变 | var(--c-bg-romance) → var(--c-bg-brand) | medium |
| DQ-11.3 | 圆角 | 卡片圆角不统一 | --r-lg 16rpx | medium |
| DQ-11.4 | 阴影 | 阴影缺失 | var(--s-card-soft) | medium |
| DQ-11.5 | 层级 | 描述文字 opacity 0.7 可读性差 | 使用 --c-text-secondary | low |

---

## 十二、圈子广场 (12-circles.png)

**当前截图**: [12-circles.png](file:///d:/6/恋爱小程序/.trae/screenshots/visual-reaudit-2026-07-05/12-circles.png)

### 差距清单

| ID | 维度 | 当前状态 | 参考目标 | 严重程度 |
|----|------|----------|----------|----------|
| CR-12.1 | 颜色 | 卡片背景 hardcode | var(--c-bg-container) | medium |
| CR-12.2 | 圆角 | 圆角不统一 | --r-lg 16rpx | medium |
| CR-12.3 | 层级 | 帖子作者头像不可点击 | @tap 跳转 profile | high |
| CR-12.4 | 间距 | 卡片间距非 12rpx 标准 | --sp-3 12rpx | medium |
| CR-12.5 | 颜色 | 位置标签胶囊非蓝色 | 蓝底蓝字 + 📍 SVG | medium |
| CR-12.6 | 层级 | 缺"附近的人"快捷入口 | 跳转 /pages/discover/index | medium |

---

## 跨页面通用差距

### 颜色系统差距

| ID | 维度 | 当前状态 | 参考目标 | 影响页面 |
|----|------|----------|----------|----------|
| G-C1 | 颜色 | TabBar selectedColor 蓝色残留 | #3FCF8E 青藤绿 | 全局 |
| G-C2 | 颜色 | 文本三色 hardcode | 主 #1F2329 / 次 #5B6470 / 辅 #9AA1AB | 全局 |
| G-C3 | 颜色 | 中性背景 hardcode | 浅 #F4F6FA / 卡片 #FFFFFF | 全局 |
| G-C4 | 颜色 | 状态徽章三色未严格对齐 | signup #7CD9A6/#1A7A4A 等 | 首页/活动 |
| G-C5 | 颜色 | VIP 暖金棕渐变角度非 12° | linear-gradient(12deg, #C9A36A, #E8C98A) | profile |
| G-C6 | 颜色 | 价格红非 #E5454D | #E5454D | 首页/活动 |

### 间距系统差距

| ID | 维度 | 当前状态 | 参考目标 |
|----|------|----------|----------|
| G-S1 | 间距 | 出现 4/6/14/20/28rpx 非标准值 | 严格 4/8/12/16/24/32/48 七档 |
| G-S2 | 间距 | 卡片间间距非 12rpx | --sp-3 12rpx |
| G-S3 | 间距 | 模块间距非 16-24rpx | --sp-4 ~ --sp-6 |

### 圆角系统差距

| ID | 维度 | 当前状态 | 参考目标 |
|----|------|----------|----------|
| G-R1 | 圆角 | 卡片圆角 16/20/24 混用 | --r-lg 16rpx 严格 |
| G-R2 | 圆角 | 弹层圆角非 24rpx | --r-xl 24rpx |
| G-R3 | 圆角 | 输入框圆角非 12rpx | --r-md 12rpx |
| G-R4 | 圆角 | 胶囊按钮非 9999rpx | --r-full |

### 阴影系统差距

| ID | 维度 | 当前状态 | 参考目标 |
|----|------|----------|----------|
| G-SH1 | 阴影 | 卡片阴影过淡/缺失 | var(--s-card-soft) 双层 |
| G-SH2 | 阴影 | 弹层阴影不足 | var(--s-modal) 60px 模糊 |
| G-SH3 | 阴影 | FAB 阴影不足 | var(--s-float-btn) |
| G-SH4 | 阴影 | 卡片边缘色缺失 | 1rpx solid var(--c-border-card) |

### 氛围感差距

| ID | 维度 | 当前状态 | 参考目标 |
|----|------|----------|----------|
| G-A1 | 氛围感 | 登录页实景图比例不足 70% | 70/30 比例 |
| G-A2 | 氛围感 | 锁屏页模糊头像效果弱 | filter: blur(8rpx) opacity(0.6) |
| G-A3 | 氛围感 | VIP 横幅质感不足 | 暖金渐变 12° + 白字 |
| G-A4 | 氛围感 | 寻觅页背景蓝灰非浪漫渐变 | 浪漫粉绿渐变 |
| G-A5 | 氛围感 | 缺少浮动小心形等心动元素 | CSS 动画浮动 |

### 层级差距

| ID | 维度 | 当前状态 | 参考目标 |
|----|------|----------|----------|
| G-L1 | 层级 | 模块标题权重不足 | 16/Bold + 右侧 14/灰 |
| G-L2 | 层级 | 信息密度过高/过低 | 参考首页 5 模块节奏 |
| G-L3 | 层级 | 主色点缀原则未贯彻 | 80/20 主色点缀 |
| G-L4 | 层级 | TabBar 激活态对比不足 | 实心青绿 + 文字主色 |

---

## 严重程度统计

| 严重程度 | 数量 |
|----------|------|
| critical | 0 |
| high | 28 |
| medium | 41 |
| low | 18 |
| **合计** | **87** |

## 修复优先级建议

### P0 - 立即修复（high 严重程度，影响视觉匹配核心）
1. Design Token 偏差修正（颜色/圆角/间距/阴影 token 校准）
2. 寻觅页背景渐变 + 卡片氛围感重构
3. 首页模块间距/圆角/阴影统一
4. 聊天会话本人气泡青绿底 + 输入栏修复
5. 个人主页背景图 + VIP 暖金渐变 + 认证徽章
6. 状态徽章三色严格对齐
7. CardSwiper 大尺寸照片展示

### P1 - 重要修复（medium 严重程度）
1. emoji → SVG 替换
2. 签到粒子动画
3. 圈子→匹配跳转
4. 课程色块低饱和化
5. 各页面 hardcode 清理

### P2 - 优化项（low 严重程度）
1. 时间戳字号调整
2. 进度条样式优化
3. 描述文字 opacity 调整

---

## 下一步行动

基于本差距报告，进入 Phase 1 视觉重构，按以下顺序执行：
1. Task 1.1: Design Token 偏差修正
2. Task 1.2: 氛围感元素重构
3. Task 1.3: 卡片质感与间距韵律重构
4. Task 1.4: 状态徽章 + 课程色块重构
5. Task 1.5: TabBar + 图标重构

并行执行 Phase A-G 功能补全任务。
