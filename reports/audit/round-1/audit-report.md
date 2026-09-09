# Round 1 审计报告（R21 对抗验收闭环）

日期：2026-09-10 ｜ 范围：仅微信小程序（忽略 H5）｜ 构建：`build:mp-weixin`（Node 22，体积门禁通过）

## 背景

第二轮对抗式审查（4 个无记忆 judge 子代理 × 16 张截图，每张强制 ≥1 问题）共发现
**40+ 项问题**，其中 P0 4 项、P1 12 项、P2/P3 若干。本 Round 全部处置完毕，
并以全新 16 张回归截图逐张复核确认。

## P0（全部修复，附证据截图）

| Issue ID | 页面 | 问题 | 修复 | 回归证据 |
|---|---|---|---|---|
| MP-R1-POST-001 | village/post | 「发布」按钮与微信胶囊碰撞（•••发布◎ 挤在一起） | post-header 加 `padding-right: calc(var(--capsule-right,7px)+104px)` | 12-post-top.png：发布在胶囊左侧清晰独立 |
| MP-R1-VILLAGE-002 | village/index | 搜索框右端延伸进胶囊下方被遮挡 | village-header__top 同款避让 | 07-village-feed.png：占位文字完整可读 |
| MP-R1-OFFICIAL-003 | official-chat | 最后一条消息被输入栏截断（加载后从未滚底） | loadOfficialChat 后 nextTick+scrollToBottom | 16-official-chat.png：末条完整可见 |
| MP-R1-CIRCLE-004 | circles/index | 统计行「…1 条动」半字硬裁（ellipsis 加错容器） | ellipsis 移到 `.circle-card__count` 文本节点自身 | 08-circles-list.png：优雅省略号 |

## P1（全部修复）

| Issue ID | 页面 | 问题 | 修复 |
|---|---|---|---|
| MP-R1-NEARBY-005 | nearby | 热门兴趣圈第 4 卡被右缘裁切 | circle-mini 166→150×200rpx，4 卡完整落屏 |
| MP-R1-HOME-006 | home/match | 合拍度徽章无环语义+样式串文本泄漏 | **弃用内联 conic-gradient（mp-weixin 不稳）**，改实心粉圆右下角（对齐理想图） |
| MP-R1-HOME-007 | home | 关系动态 4 格同色不可辨 | 恢复四色底（#FFD9E0/#BCEFDD/#E0D9FF/#FFE4C2） |
| MP-R1-HOME-008 | home | 人数「8.5k」英文单位与理想图「8,932」不一致 | 5 处 formatMemberCount 统一 toLocaleString 千分位 |
| MP-R1-HOME-009 | home | 恋爱进度第 4 卡「参与兴趣互动」截断+数字序号 | 标题允许两行；序号改语义图标（对勾/爱心/对话/星星） |
| MP-R1-HOME-010 | home | 社区动态右上「刷新」语义错 | 改「查看更多 ›」→ 跳村口动态流（原误跳发帖页） |
| MP-R1-HOME-011 | home | 社区动态相邻卡同作者 | 后端 buildCommunityPosts 按作者去重 |
| MP-R1-HOME-012 | home | 「25岁 ·」尾点残留 | meta 行改 computed 拼接 |
| MP-R1-HOME-013 | home | banner 后约 1/3 屏空白 | --tab-bar-clear-zone 360→300rpx |
| MP-R1-PUB-014 | publish/post | 「公开广场」vs「个人动态」命名不一致 | publish 版统一「个人动态」 |
| MP-R1-PUB-015 | publish/post | 行 hint 冗长（正文输入 # 也可…） | 简化为「已选 N/5」 |
| MP-R1-TOPICS-016 | topics | 圈头像灰色相机占位 | hero 头像优先真实封面图 |
| MP-R1-STATUS-017 | 全局 | 10/12 状态栏时间不可见 | globalStyle navigationBarTextStyle=black |

## P2（修复）

- 话题页「认识TA」粉渐变→白底绿描边（全站一致）
- ChatHeader 返回箭头与头像中心对齐（line-height+微调）
- 助手副标题对比度 #999→#667870
- 助手聊天重复「12:16」时间条去重（同分钟不重复）
- 助手发送键空输入禁用态（与私聊一致）
- 两版渠道弹层底部安全区 + 78vh（末行不再贴底）
- publish 图片占位块改白底虚线框（与 post 版一致）
- 兴趣圈「热门」阈值 8000（仅摄影/旅行/音乐带标，运动/美食不带）
- 消息页头部胶囊避让
- 官方客服重复回复去重（SQL 已清 + 0001 迁移补防重 JOIN 删除）

## 数据侧（Flyway V2026.09.09.0001，已应用）

- 116 个演示用户坐标散点化（消除「连续相同 6km」）
- 10001/10002/100151 兴趣标签丰富到 4 个
- 100151 补 3 条未读通知（寻觅助手入口卡红点/铃铛角标数据源）
- 8 标准圈话题各扩至 3-5 条（动态数量级合理化）
- 帖子时间刷新到近 72h（相对时间不再退化为绝对日期）

## 环境级根因（本轮定位并修复）

1. **开发者工具代理**：系统残留 127.0.0.1:7897 代理致模拟器全部请求失败 → 设置改直连
2. **热重载损坏渲染**（compileHotReLoad=true 时多次出现旧代码残影/CSS 串上屏）→ 已关闭
3. **域名校验**：本地设置勾选「不校验合法域名」
4. 构建环境需 Node 22（Node 16 报 crypto.getRandomValues；pnpm 11 需 Node≥22）

## 已知保留项（产品决策，非遗漏）

- tabBar 中央浮岛「寻觅」样式与理想图的常规「匹配」Tab 结构不同（前期产品确认的差异化设计）
- 圈名采用短名（摄影/旅行…），兴趣圈列表理想图为「摄影圈」（两处理想图自身互相矛盾，取附近页口径）
- 邀请 banner 保留粉色系（理想图即为粉色调，本轮已柔化对齐）
