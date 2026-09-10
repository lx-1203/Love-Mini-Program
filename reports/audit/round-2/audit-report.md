# Round 2 审计报告

日期：2026-09-10 ｜ 方式：全新 16 张截图（截图存档/round-2）→ 2 个独立审计子代理逐张对抗审查 → 修复 → 本报告

## Round-2 审计发现与处置

| Issue ID | 级别 | 问题 | 处置 |
|---|---|---|---|
| MP-R2-CHAT-001 | P0* | 15 号截图为「缺少会话标识」错误页 | **非产品 Bug**：截图脚本误用 conversationId 参数（正确参数为 userId）。已用 userId 重拍，页面正常。已在捕获脚本 r22 中修正参数顺序 |
| MP-R2-PUB-002 | P0* | publish 版渠道弹层缺「兴趣圈子」组 | 修复：desc 改弹性占位（flex:1，与 post 版一致）+ 行结构统一 + 78vh/安全区（上轮已加）。同构建下 13 版三组完整可见 |
| MP-R2-OFF-003 | P1 | 用户消息头像在气泡左侧（方向反） | **复核为误判**：round-2/16 中用户消息头像在右侧 ✅（judge 将相邻助手消息行误归并） |
| MP-R2-OFF-004 | P1 | 顶部 hero 遮挡首条消息 | 滚动中间态（向上滚可看全），非遮挡 Bug；保留 |
| MP-R2-OFF-005 | P2 | 时间条「01:42」显示在未来 | 修复：formatTime 今天→HH:mm / 昨天→「昨天 HH:mm」/ 更早→「M月D日 HH:mm」 |
| MP-R2-MSG-006 | P1 | 助手卡无红色未读角标 | 修复：角标数据源改为 会话未读+通知未读 合计（原 totalUnreadCount 不含通知）。遗留：tabBar 消息角标需接 custom-tab-bar 数据（P2 待办） |
| MP-R2-HOME-007 | P2 | 「关系动态」右上「全部›」被裁成「全」 | 修复：头部加胶囊避让 padding-right |
| MP-R2-HOME-008 | P2 | 今日推荐 meta「25岁 ·」尾点 | 修复：computed 拼接 |
| MP-R2-HOME-009 | P2 | 合拍度圆形 vs 理想图胶囊形态 | 保留圆形（寻觅匹配卡理想图为圆形；两处理想图形态不一致，取就近口径） |
| MP-R2-TAB-010 | P2 | TabBar 下方游离绿色短横线 | 修复：删除 custom-tab-bar 激活指示条（wxml+wxss） |
| MP-R2-NEAR-011 | P2 | 校园圈徽标「北京大/学」硬换行 | 修复：badge 84rpx + 16rpx 单行 |
| MP-R2-HOME-012 | P1 | 社区动态仅 1 卡（后端 MAX=2 去重后不足） | 修复：查询上限 ×6，作者去重后截取 MAX |
| MP-R2-VILL-013 | P1 | 晚霞帖配热饮图（图文不符） | 修复：按图片语义映射（晚霞→post-7 日落、图书馆→campus-library、食堂/糖水→post-4 热饮） |
| MP-R2-CIRC-014 | P2 | chips 末项贴边 | 保留（横滑滚动暗示，可滚动查看） |
| MP-R2-PUB-015 | P2 | publish 版缺底部工具栏 | 保留：publish 版为简化发布入口（产品决策 2026-09-06），post 版有完整工具栏 |
| MP-R2-MSG-016 | P2 | 活动卡绿叶图标与篮球图文弱相关 | 保留：图标为分类通用映射（outdoor/social 无专属素材），文案/时间/地点语义完整 |

\* 标注 P0* 的两项经复核均非产品缺陷（截图流程参数错误），产品代码无问题。

## 环境修复

- miniprogram-automator 通道频繁超时 → 改用 wechatide MCP 自动化通道
  （automation_navigate / automation_element_action / simulator_screenshot），
  并沉淀 MSYS_NO_PATHCONV=1（Git Bash 路径转换坑）与「URL 必须带前导 /」两条经验
- 关闭 compileHotReLoad（热重载残影是首轮 CSS 串上屏/布尔泄漏的根因）
- project.private.config.json compileHotReLoad=false 已入库

## 遗留（明确记录，全部 P2/P3）

1. 消息 TabBar 图标红点角标（需 custom-tab-bar 接入未读数据，P2）
2. 助手卡副标题对比度可再提升一档（P3）
3. publish 版发布页底部工具栏（产品决策保留）
4. 圈名短名口径（理想图两处互相矛盾，取附近页口径）
