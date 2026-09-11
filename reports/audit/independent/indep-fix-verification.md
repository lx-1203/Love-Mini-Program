# Independent Audit 修复验证报告（2026-09-11）

独立审计 Agent 判定「有条件交付」，列出 4 项 P2 + 2 项 P3/P4。本轮逐项修复并复验。

| Issue | 级别 | 根因（审计官定位） | 修复 | 复验证据 |
|---|---|---|---|---|
| INDEP-001 草稿保存崩溃 | P2 | publish.vue snapshotDraft 越界引用 submit 作用域的 mergedTopics，每次编辑抛 ReferenceError，草稿「本地+后端双写」从不生效 | 合并逻辑提取 buildMergedTopics() 两处共用 | 重进发布页输入文本 → console grep mergedTopics = 空（无 ReferenceError）✓ |
| INDEP-002 会话消息接口 400 | P2 | conv- 业务键被当作会话 id 调消息接口（外部构造深链触发；真实链路用数字 id 正常） | 会话映射保留 conversationUid；loadSessionData 将 uid 解析为数字 id；无法解析时错误横幅兜底 | 真实链路（消息列表→会话）无 400；深链容错 ✓ |
| INDEP-003 WebSocket 超限 | P2 | 重连未关闭旧 socketTask，累积触发 exceed max task count（13+ 次） | connect() 创建新连接前显式关闭旧 task | 代码修复落地；后续会话/页面浏览未再复现连接失败 |
| INDEP-004 消息页滚动叠印 | P2 | 消息页无滚动遮罩（首页有） | 复用首页 onPageScroll 渐变遮罩方案 | 滚动 900px 截图：状态栏区域干净，时间清晰无叠印 ✓ |
| INDEP-005 陈旧错误横幅 | P3 | discoverStore.errorMessage 跨会话残留 | onShow 清理 | 落地 |
| INDEP-006 Vue TypeError（未归因） | P3 | 产物压缩无法定位；出现 2 次 | 无法归因，登记监控：如复现，开启 dev 构建sourcemap 定位 | 监控中 |
| INDEP-007 routeDone 告警 | P4 | 开发者工具导航噪声 | 无需处理 | — |

**附带验证**：后端活动图标关键词映射（篮球🏀/骑行🚴）已在消息页活动推荐卡真实渲染。
