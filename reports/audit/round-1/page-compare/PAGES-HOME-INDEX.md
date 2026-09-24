# R1 需求对照 · pages/home/index（首页 / tabBar）

- 审查员：A4 需求对照员（与视觉审查员分文件；本页交互取证归 A3，本文件只做「需求/理想设计 → 页面 → 组件 → 行为 → 验收条件」对照）
- 轮次：R1 · gitSha aefd8a72
- 理想基线：`素材/理想效果图/首页.png`（19 张整页高保真稿中本页唯一对照依据）；Token 裁决链 v3.1 契约（首页 = 白底红线；底部五 Tab 寻觅中央浮岛）
- 证据：
  - 静态截图 5 张：`reports/screenshots/round-1-tour/A/pages_home_index__{默认,弹层态,交互后,滚动-中部,滚动-底部}.png`
  - 交互执行：`reports/audit/round-1/interact/exec-results.json`（manifest=PAGES-HOME-INDEX，59/59 用例在案：50 EXECUTED / 8 FAILED / 1 SKIPPED）+ 独立判读 `reports/audit/round-1/interact/PAGES-HOME-INDEX-judge.json`（21 verified / 6 failed / 32 unverified）
  - 源码：`apps/client/src/pages/home/index.vue` + `components/home/*`（HomeHeader / TodayRecommendationCard / TodayLoveProgress / RelationActivity / InterestRecommendation / NearbyPeople / CommunityFeed / InviteBanner）+ 数据层（`services/generated/api-types-supplement.ts`、`services/mocks/fixtures.ts`、`apps/api/.../home/RealHomeService.java`）
  - 既有偏差台账：R13 `reports/audit/2026-09-22-r13-goal/design-parity-findings.md` §2.1（5 项）
  - 旧像素级基线：`报告/像素级对比还原报告.md:144-276`（2026-08-16，其中「社区动态/邀请横幅/附近的人整模块缺失」等结论已过时——本轮截图证实三模块均在位）

---

## 一、功能目标（target）逐条对照

### T1 顶部区：标题 + 副标题 + 定位白胶囊 + 通知铃铛（无本人头像钮）
- **current**：
  - 标题「首页」+爱心、副标题「发现今天值得遇见的人」：`HomeHeader.vue:54-56,76` ✅
  - 定位白胶囊 → 点击弹「我的位置」BottomSheet（当前位置/校区认证/精度三行 + footer 重新定位/我知道了 + hero 整块可跳「位置主页」+ mask/×/按钮三路关闭）：`pages/home/index.vue:241-269,397-486`；执行 H02 VERIFIED（judge conf 0.8，弹层态截图同证）、H44（hero→位置主页）、H46（我知道了关闭）EXECUTED ✅
  - 铃铛 → 消息 tab，角标接真实未读数（0 隐藏/1-99 原值/>99 显 99+）：`HomeHeader.vue:22-24,67-73`；H03 VERIFIED、H04 EXECUTED ✅
  - **多出「本人头像」圆钮**（绿描边，→我的页）：`HomeHeader.vue:59-62,164-176`；H01 已执行但 judge 判 UNVERIFIED（落点未被捕获）。理想图头部**无**此钮（R13 §2.1#1 同证）❌
- **gap**：多一个理想图不存在的头部元素，把定位胶囊往左挤（默认.png 可见）；其余功能全部在位。
- **fix**：产品二选一——①删除 `.header-me` 对齐理想图；②产品确认保留为「快速账号入口」增强并更新理想基线备注。

### T2 今日推荐卡（图左文右）
- **current**：
  - 竖版照片 320×440rpx + 左上「● 在线」绿胶囊：`TodayRecommendationCard.vue:44-56,154-179` ✅
  - 92% 合拍度实心粉圆：**已位于 photo-wrap 内部右下**（模板 59-64 是 photo-wrap 子元素；样式 `:195-207` absolute right/bottom 12rpx）——R13 §2.1#3 所述「压信息列文案、截断末行」在当前轮截图（默认.png）未复现，判**已修复待终验**
  - 姓名/年龄/学校 meta 行（R21 数组拼接无尾点）、4 兴趣标签、签名 2 行、距离·认证·星座行：`:19-28,68-77` ✅（截图可见「1.2km · 已认证 双子座」）
  - CTA「看看TA」绿描边 +「❤喜欢」粉底白心图：`:78-86`；H08（喜欢 toast 已喜欢）、H06（信息区→他人主页）VERIFIED/EXECUTED；H05（**照片区点击**）judge FAILED：点击已执行但无落点，同卡信息区可达 ⇒ 疑死响应/hit-area 问题（conf 0.7）❌；H07「看看TA」元素未找到系时序取证失败（按钮在模板 `:79` 存在，H05/H06 已证实 view 链路可跳），判 UNVERIFIED
  - 「↻ 换一位」+ 800ms 整卡防抖 + rotate 防重入/失败 toast/池底提示：`index.vue:133-186`；H09/H10 EXECUTED ✅
  - loading 骨架 / empty 空态 / 主图加载失败占位：`:40-41,7-14,47`；H11、H59（无错误空态闪现）EXECUTED ✅
  - **「4 张缩略图一行」缺失**：模板 42-88 无 gallery 节点（R13 §2.1#2 同证）；数据层三层皆无——`TodayRecommendationView`（api-types-supplement.ts:283-298）仅 `photoUrl` 单图字段，mock fixture（fixtures.ts:1118-1133）同，`RealHomeService.java:466-482` 也只输出单 photoUrl ❌
- **gap**：①缩略图行 = 渲染/类型契约/API 数据**全栈缺失**（功能缺失，Function P2）；②照片区点击一次死响应（Interaction P2，待复验）。
- **fix**：API `TodayRecommendationView` 增加 `photos: string[]`（real 取相册前 4 张、mock 补 4 张本地图）→ 组件在 bio/距离行与按钮之间渲染 88rpx 圆角缩略一行（点击可预览）；照片区 tap 复验（wxml 命中坐标/press-feedback 干扰排查）。

### T3 今日恋爱进度（4 卡）
- **current**：标题+「?」帮助点+「2/4 项完成」+进度条（`TodayLoveProgress.vue:64-77`）；4 卡彩底圆图标（绿✓/粉心/橙笑脸/紫星，完成态切白✓）+步骤名 i18n+状态词+说明行（`:11-19,78-99`）；点击→对应 tab（`index.vue:188-193`）。执行：H12（完善资料→我的）VERIFIED、H14（悄悄话→消息）EXECUTED；H13/H15 元素未找到系 `.love-step` 多元素选择器取证失败，判 UNVERIFIED（handler 链已在 H12/H14 证实）。「?」无处理器（H16 死按钮取证 EXECUTED，理想图同为纯展示）。
- **gap**：
  - **状态词恒「待开始」**：`:91` `step.completed ? '已完成' : stepMeta(step.id).todo`，whisper 的 todo 为字面量「待开始」（`:14`）。理想第 3 卡橙色「**1 条待处理**」是数据驱动待办数——步骤契约仅有 completed 布尔（api-types-supplement.ts:265），`RealHomeService.java:349` 自留 TODO「后续改为 pending/unread 数量」、`:520` whisper 步骤只传收件箱布尔 ⇒ **全栈无该数据**（功能缺失，Function P2）；滚动-中部.png 实拍第 3 卡「待开始」
  - **每卡多 1-2 行说明文字**（`:93-97` stepDescription + `:226-238` 样式），理想为「图标+标题+状态词」三行无说明（R13 §2.1#5 前半）❌（UI 结构偏差）
- **fix**：后端 whisper 步骤输出 pendingCount（未处理悄悄话数），前端 todo 分支改染「N 条待处理」（0 回退「未开始」）；移除 `.love-step__desc` 节点对齐理想三行结构。另：interest 步骤 action="nearby"（fixtures.ts:1141、RealHomeService.java:521）→「参与兴趣互动」落附近 tab，语义弱连接（附近页含兴趣圈入口），建议改跳圈子首页——记入 usageNotes 不立 Issue。

### T4 关系动态（4 格）
- **current**：标题+「全部 ›」（→消息 tab，H17 VERIFIED）；4 cell 吉祥物四色圆（heart/shy/wave/cheer）+数值+标签+3 头像堆，pointer-events=none 保 tap、hover 按下态，骨架屏（`RelationActivity.vue:25-79`）；4 cell 分别→喜欢我的/消息/访客/喜欢页（H18-H22 全部 EXECUTED）✅
- **gap**：
  - **布局竖排**（图标→数字→标签→头像 纵向 column，`:113-122`），理想为「图标与数字同行 → 标签 → 头像堆」横排矮卡（R13 §2.1#4）❌（UI 结构偏差；滚动-中部.png 实拍整块明显高于理想比例）
  - **3 头像堆在 mock 模式恒不出现**：组件支持（`:41-43` 等），real 后端有数据（`RealHomeService.java:544-567` 四组 Avatars），但 mock fixture 的 relationActivity 不带 avatar 数组（fixtures.ts:1144）→ 5 张截图均无头像堆（理想图每格 3 枚）（Consistency P3）
- **fix**：flex 改 row 首行（图标+数字同行）压矮卡片；mock fixture 补四组 avatar 数组与 real 对齐。

### T5 兴趣推荐
- **current**：标题+「查看更多 ›」→圈子首页（H23 EXECUTED）；横滑封面卡+圈名+人数（千分位/w 格式）+「加入/已加入」（登录门禁、pending 守卫、成功后 homeFeed 单源翻转+人数同步+toast，`InterestRecommendation.vue:35-79`、`index.vue:200-233`）；卡点→圈子主页 `index.vue:195-198`。执行：H25/H26（加入成功/失败路径）、H27（横滑）EXECUTED。
- **gap**：
  - H24 judge FAILED：圈子卡点击后无 circle-home 落点，且 H25 窗口捕获「页面打开失败，请重试」toast（`index.vue:275-277` fail 回调口径）——但 `subpackages/circles/circles/circle-home` 已在 pages.json 注册（本轮核查 root=circles, path=circles/circle-home），疑子包冷加载/自动化环境，conf 0.65，**待复验**（Interaction P3）
  - **封面为线稿图标 svg 而非理想照片封面**：mock icon=`/static/assets/icons/common/{camera,travel,music,food}.svg`（fixtures.ts:1149-1152）以「/」开头被 `coverSrc` 直通放行（InterestRecommendation.vue:25-29），绕过照片封面映射 → 滚动-中部.png 实拍大灰相机/音符线稿，理想为实景照片卡（UI P3）
  - 防连点：H25 快击 5 次捕获 4 条「操作成功」toast（judge conf 0.85）——mock 即时回包窗口内 pending 守卫失效，4 次真实提交（Interaction P3；real 高时延下守卫有效）
- **fix**：复验 circle-home 跳转（预载子包/真机复测）；mock icon 改照片封面路径或 coverSrc 对已知图形 svg 强制走 circle-covers 映射；join/like 防重入改为「请求期内 + 成功后 300ms」双窗口或以请求序号丢弃陈旧并发。

### T6 附近的人
- **current**：标题+「全部 ›」；横滑头像+在线点+名字+距离+共同兴趣；底部「附近有 N 位值得认识的人」真实计数条（`NearbyPeople.vue:34-78`、`index.vue:74-77` 注释：已去保底伪造）；头像加载失败 dataset 防循环兜底（`:23-30`）；骨架（`:40-48`）。执行：H29（头像项→他人主页）、H30（底部 bar→附近列表）EXECUTED ✅
- **gap**：H28 judge FAILED——「全部 ›」点击无落点（同目标底部 bar H30 可达，对照成立），conf 0.65，**待复验**（Interaction P2）。布局小偏差：理想为「头像行 + 右侧绿卡 CTA」，当前为「头像行 + 底部通栏绿条」，语义等价（structureNotes 记录，不立 Issue）。
- **fix**：复验「全部 ›」wxml 命中（与 H30 同 handler，疑自动化坐标/热区问题）；如真机复现按 H30 口径排查。

### T7 社区动态 Feed
- **current**：标题+「查看更多 ›」→村口列表（H33，R21 已修「误跳发帖页」）；帖子卡：作者头像 SafeImage 兜底/昵称/圈标/时间相对化/2 行正文/≤3 图/赞·评·分享 icon 行；**关注按钮接通真实 follow/unfollow + 服务端持久 + 防连点**（CommunityFeed.vue:65-130，H37/H38/H39 EXECUTED）；作者头像/昵称→他人主页（H36 VERIFIED；H35 元素未找到判 UNVERIFIED）；整卡→帖子详情（H34 judge FAILED conf 0.55：tap 命中但无 detail 落点，疑坐标落作者区，待复验）；骨架/错误+重试/空态三态（`:141-161`；H40 元素未找到系错误态未构造，判 UNVERIFIED）。
- **gap**：整卡→详情一次无落点（待复验，P3）；分享 icon 无计数无 handler（理想图亦仅「分享」字标，观察项不立 Issue）。
- **fix**：复验 H34（区分卡体空白区 tap 与作者区 tap）；其余功能在位。

### T8 邀请好友横幅
- **current**：粉渐变底（R20 调整为浅粉云底+深粉按钮，注释声明对齐理想图）+礼物图标+「邀请好友一起遇见心动/遇见更多美好，解锁专属权益」i18n+「去邀请」+翅膀爱心装饰（InviteBanner.vue:14-27）；整卡→我的页 invite=1 桥接（`index.vue:319-321`；H43 EXECUTED）✅
- **gap**：无（底色饱和度为视觉审查员裁量范围）。

### T9 底部导航（五 Tab + 寻觅中央浮岛）
- **current**：自定义 tabBar（pages.json tabBar custom=true，5 tab 齐：首页/附近/寻觅/消息/我的），中央寻觅绿心浮岛，消息真实未读角标（5 张截图均可见，实拍 12=真实未读）；`useTabBar(0)` 高亮首页（index.vue:40）✅

### T10 状态完备与全局行为
- **current**：骨架（推荐/关系/兴趣/附近/社区五区块各有）、空态（推荐 empty+社区 empty）、错误重试（社区 error+retry→`homeStore.fetchDashboard()`）；未登录预览可加载+交互统一「请先登录后再使用该功能」门禁（H54-H57 全 EXECUTED）；30s 陈旧重拉+下拉刷新+登录补拉+切 tab <30s 不重拉（`index.vue:82-121`；H50/H53 已执行）；滚动状态栏遮罩（H51/H52）；real 未登录不发受保护请求（`:87-88`）；深链冷启动无错误空态闪现（H59）✅

---

## 二、PageCompare

### structureNotes（L1–L10）
- **L1 页面结构**：✅ 达标。页面存在、六大区块+底部五 Tab 全在位，区块顺序与理想图一致（头部→今日推荐→今日恋爱进度→关系动态→兴趣推荐→附近的人→社区动态→邀请横幅）。
- **L2 区块结构**：❌ 4 处偏差——①头部多「本人头像」钮（理想无，R13#1）；②今日推荐缺「4 缩略图一行」（R13#2）；③恋爱进度卡多说明行（R13#5）；④关系动态竖排 vs 理想「图标数字同行」横排矮卡（R13#4）。
- **L3 组件结构**：合拍度粉圆已收敛进照片内右下（R13#3 现拍未复现，待终验）；附近的人 CTA 由理想「右侧绿卡」变「底部通栏条」（语义等价）；兴趣推荐横滑卡 vs 理想 4 张等宽满行。
- **L4 元素结构**：关系动态头像堆元素在 mock 态不渲染（数据缺）；「认识新人」vs 理想「认识新的人」措辞微差；其余元素（在线标/角标/CTA/标签/徽章/装饰爱心）齐备。
- **L5–L10（色彩/字体/间距/圆角/动效/状态）**：白底+Primary 绿 #36C99A+Love 粉 #FF6B81 符合 v3.1 裁决链首页白底红线；骨架/空态/错误/按压反馈/滚动遮罩在位；未见显著偏差（像素级裁量归视觉审查员）。
- **判定**：L1 达标、L2 不达标（4 处）→ 按本轮规则「L1-L4 偏差即不达标」，结构维度不达标；偏差均为「理想结构增强项」，非功能不可用。

### usageNotes（理想 vs 实际操作路径）
- **核心任务可达**：看推荐/喜欢/换一位/进主页（H06/H08/H09/H10）、关系动态四路跳转（H17-H22）、兴趣圈加入（H25/H26）、附近查看（H29/H30）、社区关注/作者主页（H36-H39）、邀请（H43）、定位弹层三功能（H02/H44/H46）——主链路顺畅，未登录全门禁（H54-H57），任意位置经恒在的自定义 tabBar ≤2 步回 tab，无迷路点。
- **路径疵点（执行取证）**：①今日推荐照片区一次死响应（H05，同卡信息区可达）；②附近「全部 ›」一次死响应（H28，同目标底部 bar 可达）；③帖子整卡→详情一次无落点（H34）；④圈子卡→圈子主页一次「页面打开失败」toast（H24，路径已注册）；⑤mock 快回包窗口内喜欢/加入连点多次提交（H08 5 次、H25 4 次）。四项死响应/失败均需真机或修正取证坐标后复验。
- **语义弱连接**：恋爱进度第 4 卡「参与兴趣互动」落附近 tab（fixtures.ts:1141 action=nearby），建议产品确认是否改跳圈子首页。

### functionGaps
| target | current | gap | fix |
|---|---|---|---|
| 今日推荐信息列含 4 张缩略图一行 | 无 gallery 节点；类型仅 photoUrl；mock/real 均单图 | 全栈缺失（渲染+契约+数据） | API 增 photos[]，组件补缩略行 |
| 第 3 卡状态词「1 条待处理」（待办计数） | 恒字面量「待开始」；契约仅 completed 布尔；后端留 TODO | 待办计数数据+渲染全栈缺失 | 后端出 pendingCount，前端绑定渲染 |
| 关系动态每格 3 头像堆 | 组件支持；real 有数据；mock fixture 无此字段 | mock 态理想元素恒缺失 | fixture 补四组 avatar 数组 |
| 兴趣推荐实景照片封面 | mock icon=线稿 svg 直通渲染 | 封面为图标占位非照片 | mock 改照片路径/coverSrc 强制映射 |

### verdict
**基本达标** —— 页面骨架、六大模块、五 Tab、三态完备、未登录门禁与主交互链路全部在位且大多经执行取证证实；但存在 2 项全栈功能缺失（缩略图行、待办计数）、4 处 L2 结构偏差（R13#1/2/4/5）、2 个待复验死响应点（H05/H28）与防连点窗口缺陷，未达「达标」。

---

## 三、Issue 清单（详见 PAGES-HOME-INDEX-req.json）

| id | category | severity | 摘要 | status |
|---|---|---|---|---|
| MP-R1-PAGES-HOME-INDEX-101 | Function | P2 | 今日推荐缺 4 缩略图一行（渲染/类型/API 三层缺失） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-102 | Function | P2 | 悄悄话步骤无「1 条待处理」待办计数（恒「待开始」，全栈无数据） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-103 | UI | P3 | 头部多「本人头像」钮，理想图无（R13 §2.1#1） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-104 | UI | P3 | 关系动态 4 格竖排，理想为图标数字同行横排矮卡（R13 §2.1#4） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-105 | UI | P3 | 恋爱进度每卡多说明行，理想三行无说明（R13 §2.1#5 前半） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-106 | Interaction | P2 | 今日推荐照片区点击一次死响应（H05 judge FAILED 0.7，待复验） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-107 | Interaction | P2 | 附近「全部 ›」死响应（H28 judge FAILED 0.65；同目标 bar 可达） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-108 | Interaction | P3 | 帖子整卡→详情一次无落点（H34 0.55，疑坐标落作者区，待复验） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-109 | Interaction | P3 | 圈子卡→圈子主页一次「页面打开失败」toast（H24 0.65；路径已注册） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-110 | Interaction | P3 | 防连点契约未达成：喜欢×5→5 次提交、加入×5→4 次提交（H08/H25 0.85） | 待修复 |
| MP-R1-PAGES-HOME-INDEX-111 | Consistency | P3 | 关系动态头像堆仅 real 有数据，mock 恒空 | 待修复 |
| MP-R1-PAGES-HOME-INDEX-112 | UI | P3 | 兴趣推荐封面为线稿 svg 占位，非理想照片封面 | 待修复 |
| MP-R1-PAGES-HOME-INDEX-113 | UI | P3 | 合拍度粉圆压文案（R13 §2.1#3）——现轮代码+截图未见复现 | 已修复待终验 |

## 四、本次实际执行过的检查
- 读源码：pages/home/index.vue 全文、components/home 8 组件、view-models/home-dashboard.ts、api-types-supplement.ts（类型）、mocks/fixtures.ts（mock 数据）、RealHomeService.java（real 数据）、constants/routes.ts、pages.json（tabBar+子包注册核查）。
- 执行 `python` 解析 exec-results.json（59 条 home 用例逐条提取）与 PAGES-HOME-INDEX-judge.json（21V/6F/32U 及 6 条 FAILED 判读全文）。
- 视觉对照：素材/理想效果图/首页.png vs 5 张 round-1-tour/A 首页截图逐区块比对。
- 未执行：真机/开发者工具复验（本轮只读约束）；H13/H15/H35/H40/H45/H47/H48 的重放（归 A3 交互轮）。
