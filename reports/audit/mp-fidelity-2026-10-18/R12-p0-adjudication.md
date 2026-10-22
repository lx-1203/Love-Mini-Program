# R12 落判复核：3 条 P0 + 17 条 P1 的逐条裁定（主代理回 API/回源码/回帧，不采信泳道自述）

R12 全 14 张找茬卡交齐并通过验卡门（FINDERLANE_RESULT=PASS）：159 条缺陷 / 67 页 / 131 帧 + 4 张合规 CLEAN 卡，
严重度 P0=3、P1=17、P2=82、P3=57；空帧段 0、无批次 0、rejected 0、互斥成立（AGGREGATE_RESULT=PASS defects=159 batches=75）。

本轮是 **R11 修车波（13 条 P0、184 行）之后的复拍找茬**。级别由泳道按四条口径独立判，但收口门的
P0/P1=0 判点不能建立在未复核的升级上，故逐条回查。结论：**P0 1 条成立、2 条为取景前提产物；
P1 12 条成立（其中 1 条只成立一半）、4 条属后端缺列的功能缺口（前端已处于 §12 合法形态，无像素可修）。
修车波派发集 = 1 条 P0 + 12 条 P1（行），随批带 P2/P3 同根因行。**

## 一、取景前提产物 2 条（降级为仪器债，修参数表不修产品）

### R12-L03-D04（village/detail 整页「帖子不存在」，泳道判 P0 需新建）

泳道判据：帧上导航栏以下只有未找到卡，理想图 7 段内容 0 段渲染，village store 无 currentPost 可载入。

回 API 实测（2026-10-22，guest 票）：

- 取景参数表喂的是 `id=352`（2026-10-19 R2b 当时验证过存在）。
- `GET /api/v1/posts/352` 现在返回 **404 `{"error":"Not Found","message":"Post not found: 352"}`** ——
  这条 QA 帖在 R2b 之后的轮转里被删掉了（roundtrip 每轮建删、QA 清理各轮都在动 posts 表）。
- 页面渲染的「帖子不存在或已被删除」是**对真 404 的诚实空态**（R11 起就是这套文案/热区），
  不是「列表说有、详情说无」的数据断裂。

**处置：降级为取景前提欠账（仪器债）。** 参数表 `scripts/qa/fidelity-sweep-params.json` 已把
id=352 换成 **id=408**（GET /posts 列表首条「八里台的梧桐该修一修了」，实测 200），并在 _note 记出处。
R13 复拍用活 id 重拍，届时该帧应出现真实帖子详情；若仍空态才是产品缺陷，按 P0 重立。

### R12-L05-D10（campus/topic-detail 列表可见、详情「话题不存在」，泳道判 P0 需新建）

泳道判据：列表页有「高数期中复习资料分享」，点进详情整页空态，判 real 捕获中列表与详情数据链路断裂。

回 API + 回源码实测：

- 后端端点存在且工作正常：`CampusController.java:154 GET /api/v1/campus/topics/{id}`，
  `GET /campus/topics/265` 实测 200，返回全字段（id/title/content/authorName/replyCount/…）。
- 断裂的真因在**取景侧**：`fidelity-sweep-params.json` 里根本没有 campus/topic-detail 与
  circles/topic-detail 的参数行——sweep 直开页面、不带 topicId ⇒ 页面 `onLoad` 拿到空参，
  按 FXF（R11-L04-D06）建的「话题 ID 无效 / 话题不存在」空态渲染。泳道把**缺参空态**误判成了
  「详情查询滤空」。前端链路 fetchCampusTopicDetail 本身无缺陷（泳道自己的建议也承认「无改动空间」）。

**处置：降级为取景前提欠账（仪器债）。** 参数表已补
`subpackages/campus/campus/topic-detail: topicId=265`、
`subpackages/circles/circles/topic-detail: topicId=3`（GET /circles/8/topics 列表实测在册），
_note 记出处。R13 复拍重验。

## 二、成立的 P0 1 条：R12-L04-D08（circle-home hero 假好友计数行）→ 修车波

泳道判据：hero 第三行「3 枚头像 + 等 12 位 … 已加入」，计数取 `circle.value.friendJoinedCount`
（circle-home.vue:255），头像恒由圈 id 对 3 张公共头像池取模拼出（:243-250）、无 mock/real 门控。

复核**成立**：R11-L04-D01（P0 假计数）已在册判定该后端字段不是好友加入数
（RealCircleService 取 memberCount/1000 夹到 [3,99]），同域 topics.vue:556-558 已把同一行整行撤下；
circle-home 当时属跨车道文件未动，本轮泳道抓的就是这处残留。§12 合法形态=与 topics.vue 同口径整块撤下，
缺列清单已在 topics.vue:280 登记。**入修车波。**

## 三、成立的 P1 12 条 → 修车波（1 条只成立一半，见 D09 注）

| id | 页 | 轴 | 修法要点（复核后采信泳道建议） |
|---|---|---|---|
| R12-L01-D05 | register | 颜色token | 法务行 placeholder 色 2.37:1 → --c-text-secondary（7.38:1），与登录页协议行同档 |
| R12-L01-D09 | discover | 文案 | **只成立一半**：校名重复展示是前端可修（name 行撤校名拼接，校名行保底）；age/gender 缺列部分在册（见第四节） |
| R12-L02-D01 | nearby | 素材缺失 | 分区②整段零渲染、连空态分支都没出现——派修车泳道**对帧+代码先定根因再修**（模板三态 :765/:768/:783 齐全，嫌疑在数据侧或渲染外层；修不了就如实登记） |
| R12-L02-D09 | village | 可达性 | LockScreen「先逛逛公开内容」实际跳匹配推荐——先做标签诚实化；真公开只读态属功能立项（见第四节注） |
| R12-L03-D07 | village/tag-posts | 可达性 | 「去发布」62rpx → min-height:88rpx（detail.vue:3001 同款） |
| R12-L04-D02 | circles/topics | 层级遮挡 | R11 承诺的吸顶在滚动容器内未生效（circle-home 同构正常）——改等效实现，滚动帧页签带自 y=0 铺满 |
| R12-L04-D07 | circles/post-topic | 需新建 | 「兴趣圈」可选必被 real 守卫拦——先按 §12 改只读提示（撤承诺），映射接口在册 |
| R12-L05-D07 | campus/post-topic | 需新建 | 12 枚热度数字是前端常量（popular-topics.ts:43-48）——撤数字只留话题名（§12 撤承诺），usage_count 列在册 |
| R12-L05-D09 | campus/post-topic | 需新建 | 匿名开关承诺「匿名校友」但 real 硬编码 false——把 ：575-576 的撤承诺替换修到 real 档真正生效（复核 isMockMode 判定） |
| R12-L07-D01 | likes-visitors | 需新建 | 「总浏览量/今日浏览量」两项无后端列且今日=min(总,喜欢) 张冠李戴——撤两项承诺只留真实 likesCount，字段在册 |
| R12-L11-D01 | profile/tasks | 颜色token | 积分值 #36C99A 2.10:1 → --c-brand-800（6.45:1），与同页已完成态同批归口 |
| R12-L11-D02 | profile/tasks | 颜色token | 概览「0%」同上（2.10:1 → 6.45:1），与 D01 同批 |
| R12-L11-D10 | official-chat | 可达性 | 返回箭头写死 #36C99A 1.93:1 → --c-brand-800（≈5.2:1），同型 chat-session 已有先例 |

## 四、不成立的 P1 4 条：后端缺列的功能缺口（前端已处 §12 合法形态，无像素可修 → 在册，不派修）

这四条的共性：泳道判的是「用户拿不到某块内容」，而前端已经把能做的合法形态做完了
（撤承诺/诚实空态），剩下的缺口**只能靠后端补列**，前端再动一步就是编数据（§12 禁止）。
它们不是像素缺陷，按 R11 前例（market 三页「属缺功能不属像素缺陷」）降为在册功能申请，
修车波不派、不计数为可修 P1：

1. **R12-L03-D01**（village post 视频发布入口缺席）：标签「图片」+仅 chooseImage 是对「无视频列」的
   诚实收缩；补入口=先造假能力（帖子表无视频列，L02-D11 已在册）。→ 在册：视频发布链路立项（媒体列+存储）。
2. **R12-L06-D01**（match-success 共同点卡缺席、中部 ~295px 空带）：R11-B11/B40 撤假分数正是 §12
   判定过的合法形态，渲染分支 :117 就绪、缺 props.reasons 真值列。「上一轮修得不对」不成立——
   上一轮修的就是假分数本身；空带是诚实的代价。→ 在册：推荐详情补 reasons 列后接 ：117。
3. **R12-L06-D07**（nearby people 前 3 行是 QA 种子行）：剥前缀（R11-L06-D13）已做；把种子行变真人
   只能靠后端种子治理/真实数据源，前端再改就是编身份。→ 在册：推荐源种子治理（后端/运营动作）。
4. **R12-L13-D04**（discussions 话题正文缺列、截断不可读）：契约只有 id/title/summary/heatLabel，
   前端弹窗已如实展示 summary。→ 在册：讨论接口补 content 列 + 详情展示。

**R13 找茬预告**（给下一轮泳道的口径）：上述四条 + 两处取景参数修复的帧变化，
R13 任务书会随 fixlist-R12 + fix-visibility-R13 带出「已修/在册」上下文；
对在册四条，同轴同象不重报（它们的结果已登记为 NEEDS-DATA / 功能立项），
R13 只在**画面出现新可测偏差**时开新卡。

## 五、R12 修车波派发集（emit-fix-lanes 输入）

- fixlist：`fixlist-R12.json`（159 条聚合，互斥成立）
- 行件：`tmp/qa/r12-dispatch-rows.json`（14 卡全量行，含 P2/P3 同根因行）
- 门参数：`--severity P1`（含 P0 批次全收）——与 R11 修车波同法（批次连带 P2/P3）
- 裁决件：本文件随批次进任务书 notes；第四节的 4 个 id 在派单提示里点名
  **处置=按裁决不修（在册）**，泳道只登记不改动。
- 仪器侧修复（本裁决件同步完成，不占修车波）：`fidelity-sweep-params.json` 三处（见第一节）。
