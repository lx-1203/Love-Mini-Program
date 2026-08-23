# 寻觅 v3 SVG UI 设计包

这套 SVG 不是把参考位图强行描成逐像素矢量，而是把参考图里的**可复用 UI 语言、布局和组件**重新结构化为可编辑 SVG：
- 5 Tab：发现 / 附近 / 匹配 / 消息 / 我的
- 核心链路：匹配中 / 匹配成功 / 聊天
- 状态页：未登录
- 关系组件：悄悄话弹层
- 统一 Design System：颜色、圆角、间距、按钮、Chip、底部导航

## 文件

- `00_master_board.svg`：总览
- `01_discover_home.svg`：发现首页
- `02_nearby.svg`：附近四 Tab 中的“附近的人”
- `03_matching_hub.svg`：匹配中心 Hub
- `04_matching_progress.svg`：匹配中
- `05_match_success.svg`：互相喜欢成功
- `06_messages.svg`：消息关系页
- `07_chat.svg`：聊天会话
- `08_my_profile.svg`：我的主页
- `09_other_profile.svg`：他人主页
- `10_login_empty.svg`：未登录入口
- `11_whisper_sheet.svg`：悄悄话 Sheet
- `12_design_system.svg`：基础设计 Token / 通用组件

## 与 v3.1 实施逻辑的对应

1. 发现只负责 Browse，不放“开始匹配”。
2. 匹配中心只负责主动速配，不再塞发现聚合入口。
3. 附近使用列表 + 四 Tab，不使用 CardSwiper。
4. 消息只承载已建立关系：悄悄话、新匹配、喜欢你的人、聊天。
5. 我的页采用 Hero + 核心数据 + 列表式菜单，避免旧版成就/VIP/心动值首屏堆叠。
6. 所有主 CTA 统一使用绿色；心动行为统一使用粉色；次级操作用白底描边。
7. 页面间距基准：4 / 8 / 12 / 16 / 20 / 24 / 32 px。
8. 卡片圆角优先 16；大 Hero 22~24；Chip 15；圆形动作 26~28。

## 图片资产

参考图中的人物摄影、风景、头像属于位图素材，因此这里保留为“图片槽位”，没有把照片伪矢量化。
接入项目时，直接在 SVG 中替换对应的 `<rect>` 图片占位区域即可。

## 使用建议

把单页 SVG 导入 Figma / Illustrator / Sketch / Photopea 都可以继续拆解和替换；
如果用于小程序开发，建议把同一套 token 映射到 CSS / Less / SCSS / Tailwind 变量，而不是逐页硬编码颜色。
