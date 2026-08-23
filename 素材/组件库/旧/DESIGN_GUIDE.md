# 寻觅｜微信小程序 UI 拆分与调用说明

## 1. 与原稿相比的核心变化
原稿的问题不是功能太少，而是“信息层级、视觉节奏、品牌记忆点”不足：
- 原稿顶部、筛选、签到、用户卡片、底部导航都采用接近同等重量的白色圆角容器，层级容易打平。
- 用户卡片虽然信息完整，但照片、标签、匹配率、操作按钮之间缺少明确主次。
- 首页功能入口偏“工具宫格”，恋爱属性弱；改版后用“心动匹配 / 今日缘分 / 推荐用户”作为视觉主角。
- 个人页原稿偏资料管理页；改版后先突出“这个人是谁、为什么值得认识”，再展示视频、相册、标签。
- 消息页改成“关系状态 + 未读 + 对方头像 + 最后一句话”的快速扫读结构。
- 全局保留绿色主题和核心功能，不改变业务逻辑，只改变视觉表达。

## 2. 建议色彩 Token
--brand: #34C38F;
--brand-dark: #269B70;
--brand-light: #E9FBF3;
--pink: #FF5D9E;
--pink-light: #FFF0F7;
--blue: #4D8DFF;
--yellow: #FFB84D;
--text: #222222;
--subtext: #8A8A8A;
--line: #EEF2F1;
--page: #F7FAF9;
--white: #FFFFFF;

## 3. 页面拆分

### A. 发现/匹配页
1. 品牌头部：寻觅 + 副标题 + 今日次数
2. 条件筛选：附近 / 不限 / 年龄 / 匹配优先
3. 搜索框
4. 今日缘分 Banner
5. 大型用户推荐卡：照片为主，底部渐变压图，姓名/年龄/在线状态/学校/距离/标签/个人简介
6. 三个核心操作：不喜欢、超级喜欢、喜欢
7. 推荐用户横向卡片
8. 底部 Tab

### B. 个人主页
1. 渐变封面
2. 头像 + 在线状态 + 认证
3. 基础资料
4. 关注/粉丝/获赞
5. 标签
6. 个人视频
7. 相册
8. 编辑资料
9. 底部 Tab

### C. 消息页
1. 页面标题 + 搜索
2. 新匹配
3. 系统通知
4. 喜欢我的人
5. 普通聊天列表
6. 未读红点
7. 底部 Tab

### D. 首页
1. Hi，同学
2. 学校/校园认证
3. 今日签到
4. 8 个恋爱功能入口
5. 今日缘分值
6. 推荐用户
7. 底部 Tab

## 4. SVG 使用
微信小程序中推荐：
<image src="/assets/icons/icon-heart.svg" mode="aspectFit" />
或者使用 sprite + CSS/自定义组件封装。

图标统一使用 currentColor，因此可以通过 color / CSS 控制颜色。
建议图标尺寸：
- Tab：22px
- 功能入口：24px
- 搜索/返回：20px
- 大按钮图标：28px
- 匹配操作：26~30px

## 5. 建议组件命名
XunmiHeader
FilterPills
SearchBar
CheckinBanner
MatchCard
MatchActions
FeatureGrid
UserMiniCard
ProfileHeader
StatRow
TagList
VideoCard
AlbumGrid
MessageItem
BottomTabBar
OnlineBadge
VerifyBadge

## 6. 交互原则
- 心动/喜欢：粉色
- 品牌/确认/认证：绿色
- 超级喜欢：蓝色
- 取消：白底 + 灰色线框
- 所有点击区域至少 44x44px
- 卡片圆角 16~22px
- 页面背景使用极浅灰绿，不使用纯白铺满整个页面
- 阴影非常轻，避免“廉价拟物感”
