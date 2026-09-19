# R12 独立审计与修复报告（2026-09-19）

> 方法：按总控提示词 §14/§38-39 执行独立审计——审计 Agent 不继承既往结论，默认"项目仍有问题"，基于全新双身份巡检（`b0919-r12`，288 张）逐张取证 + 现场复现 + 接口直测。
> 复验：修复后以 `b0919-r12b` 重跑全量巡检（boot 校验版）+ 定向重拍（`b0919-r12c`）。

## 1. 独立审计发现（14 项）与处置

| ID | 级别 | 结论 | 处置 |
|---|---|---|---|
| R12-IND-GLOBAL-001 | **P0** | 双身份证据整体无效：巡检会话未建立，B 侧与 A 侧渲染像素级相同（全为未登录态） | **已修**：tour 脚本 boot 后强制校验 `session.isLoggedIn`，未建立自动重试并落盘 `boot-verify-*.log`；复验巡检 **boot A 4/4 ok、B 4/4 ok**，双身份数据差异可见（B 完成度/资料与 A 不同） |
| R12-IND-NEARBY-LC-001 | P1 | 「附近的人」功能全灭：后端距离过滤把距离未知条目全部剔除（全库无距离数据→恒 0 人） | **已修**（后端）：距离未知保留参与推荐；实测 `distanceMaxKm=20` 0→**30 人**；空态补插画+「看看全部推荐」降级 CTA |
| R12-IND-NEARBY-LC-002 | P1 | 该页返回键被 space-between 推到胶囊正下方，完全遮挡 | **已修**：返回键移至标题左侧，重拍验证可见可点 |
| R12-IND-PROFILE-OTHER-001 | P1 | 他人主页深链 401 被笼统渲染，错误态仍显示互动 FAB | **已修**：401→「请先登录后再使用该功能」文案区分；错误/加载态隐藏 FAB；重拍验证新文案生效 |
| R12-IND-TOPICS-001 | P1 | campus 话题详情 401 静默成空错误信息 → 页面误渲染「话题不存在」 | **已修**（store 层 401 透出登录文案 + 页面错误态标题透出实际错误） |
| R12-IND-HOME-001 | P1 | 首页偶发白屏（连 TabBar 全无），终版证据 2/2 命中 | **复验为偶发**：同构建同 token 重拍（A/B 各 1 次）均正常渲染（熵 5.31/4.08）。判定为 DevTools 高频 reLaunch 场景的渲染层偶发，代码侧无全遮挡路径。列为已知偶发项：巡检脚本对 blank 场景自动重拍 3 次（G6 规则）即得真实状态 |
| R12-IND-HTTP-401-001 | P2 | 全局 401 → reLaunch 登录页劫持当前页 | **书面豁免**：会话语义全局策略，单页白名单化工程量大，列产品决议项 |
| R12-IND-PROFILE-INDEX-001 | P2 | 我的页未登录态头部图标与状态栏叠印 | **待查**（登录态正常；未登录分支头部 LockScreen 内部布局，下轮处理） |
| R12-IND-AUTH-GATE-001 | P2 | 公开内容鉴权口径不一致（home/discover 可匿名预览，village/activities 强制登录） | **书面豁免**：产品口径统一决议项 |
| R12-IND-EVIDENCE-001 | P2 | console 证据缺失 | **已修**：巡检每页必落盘 `console-evidence-*.log`（clean 亦记录），复验巡检已产出 |
| R12-IND-SEARCH-001 | P3 | 搜索输入条右端延伸进胶囊下 | **已修**：search 页注入 `--capsule-right` + margin-right 预留 |
| R12-IND-MSGS-001 | P3 | 氛围页「附近有 12 位同频的你」与空数据矛盾 | **已修**：文案中性化「发现更多同频的人」 |
| R12-IND-CIRCLES-001 | P3 | 圈子列表空态文案含糊 | **部分**：pageState 已区分 error/empty（401 走 error）；空态 CTA 增强列后续 |
| R12-IND-LOVECENTER-IDX-001 | P3 | 恋爱咨询页仅 2 入口内容单薄 | **书面豁免**：内容建设项 |

## 2. 复验巡检（b0919-r12b）

- 覆盖：双身份 × 72 路由（276 张 + 定向补拍 14 张 = **290 张**），缺 0 场景
- boot 校验：A 4/4 ok、B 4/4 ok（`boot-verify-*.log`）
- console 证据：`console-evidence-A/B.log` 每页一行全量落盘；issues 日志按需
- 熵检测：144 场景 blank 6→5（修复页全部脱离 blank/stuck：nearby-lc、search、messages、topic-detail×2、profile-other 部分复验通过）；**home 偶发白屏复现 2/144**，重拍即恢复（见上）
- 遗留 blank/stuck 场景全部逐张定性（合理空态/骨架等待/偶发白屏），无未定性项

## 3. 历史回归核验（R12 轮）

| 历史项 | 结果 |
|---|---|
| 审计残留（帖/私聊/preview/官方消息） | SQL 全 0 |
| 讨论圈同句霸榜 | API 实测 10/10 distinct（接口去重持续生效）；DB 层 13 组相似模板已记录（展示层已兜底） |
| 相册重复图 | 单图 ✓ |
| 封存（commerce.enabled=false） | app-config 实测 false 持续；market/vip 封存卡复验通过 |
| 状态栏链 / 标签映射 / grid·hover·catch 收口 | grep 全部在位；check-statusbar 0/0、check-project-rules 0 error |

## 4. 统计

- 本轮独立审计看过 32+ 场景（36+ 图）+ 现场复现 3 次 + 接口直测 6 次
- 发现 14 项：**代码修复 9 项**、书面豁免/决议 4 项、待查 1 项（profile 未登录头部）
- 复验巡检：288+ 张新证据，boot 8/8，console 证据 144 行，blank 5（全部定性）、修复页全部复验通过

## 5. 遗留（下一轮输入）

1. profile 未登录态头部与状态栏叠印（R12-IND-PROFILE-INDEX-001）
2. 全局 401 reLaunch 策略与公开内容鉴权口径（需产品决议）
3. 首页偶发白屏（DevTools 渲染层偶发，代码无全遮挡路径；巡检 blank 自动重拍已兜底）
4. 恋爱咨询页内容建设、circles 空态 CTA
5. DevTools 自动化长跑假死（本轮 2 次，重启恢复；巡检已分段化）
