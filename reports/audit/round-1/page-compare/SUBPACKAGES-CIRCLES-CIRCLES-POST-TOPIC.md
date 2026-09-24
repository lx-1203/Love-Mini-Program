# PageCompare · subpackages/circles/circles/post-topic（兴趣圈·发帖）· R1 需求对照（A4）

- 审查角色：A4 需求对照员（只读代码与证据，未改动任何业务文件）
- 日期：2026-09-24；证据基线 gitSha=aefd8a72（与 HEAD 一致）
- 理想图参照：素材/理想效果图/发布帖子页面.png（19 张整页稿中唯一的发帖页稿）
- 执行证据：reports/audit/round-1/interact/exec-results.json（manifest=SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC，PT01–PT34，34 例：7 VERIFIED / 1 FAILED / 26 UNVERIFIED，判定文件 interact/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-judge.json）
- 操作截图：reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT*.png + reports/screenshots/round-1-tour/A|B/subpackages_circles_circles_post-topic__*.png
- 源码：apps/client/src/subpackages/circles/circles/post-topic.vue（1365 行，逐行通读）

## 0. 理想图锚定仲裁（前置裁决，防伪偏差）

发布帖子页面.png 的归属存在三说，本轮逐一直接核验后裁决如下：

| 主张 | 出处 | 本轮核验 |
| --- | --- | --- |
| 锚定 village/publish | 同轮姊妹需求对照文件 findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-req.json（meta.ideal） | 该页按此稿完成了 7 项 Issue 对照，像素级 L1–L4 锚定权已行使 |
| 对应 village/post | 本页视觉审查员 findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json 观察4（post.vue:606/786/798 逐项对应） | 归属消歧权已行使，结论为「非本页理想稿」 |
| 圈场景发布=circles/post-topic | 审计基线 reports/audit/baseline/ideal-baseline.md:101（publish（圈场景发布=circles/post-topic、campus/post-topic）←发布帖子页面.png） | 本轮采信其「功能语义」半边 |

**裁决**：发布帖子页面.png 的**像素级锚定（L1–L4 硬对照）归 village/publish**（姊妹需求员已行使，两页信息架构确非同构：本页有标题字段与发布目标选择器，理想稿没有）。但该稿的「发布到摄影圈」场景在语义上就是本页的生产职责（圈内发帖），且本页是发布功能族中**唯一有生产入口的圈发帖页**（见 L7），故将其作为本页的**功能需求参照**（capability checklist），不做像素级 L1–L4 判定。理想稿能力位清单：发布到圈卡（头像/圈内成员可见 pill/1.2w 成员/chevron）、正文 0/1000、图格（图片/视频）、添加话题 0/5、添加位置（POI 级）、提及好友、谁可以看（权限选择）、发帖小贴士、底部五项工具条、× 关闭钮。

## 1. 本页功能 target（应该具备什么）→ current / gap / fix

生产职责（由入口与提交链实证）：**从兴趣圈内部发起话题发布**——目标圈锁定（circleId）、标题+正文+配图、校验反馈、成功后返回来源页并可被圈内话题流看见。

### T1 目标圈锁定与展示
- **target**：进入即锁定来源圈并展示目标（理想稿：圈卡带头像/成员数/「圈内成员可见」pill/chevron）。
- **current**：带 circleId 进入时为只读两行文本「发布到 / 圈名」（post-topic.vue:516-519），圈名取 circleStore.circles 查找（:104-107），查不到回落通用词「兴趣圈」（PT01 冷启动深链 circleId=8 实测显示通用词，circles 未加载完成时自愈）。无头像、无成员数、无可见范围 badge、无 chevron。
- **gap**：目标展示存在但信息量为理想卡的子集（展示层裁剪，不阻塞发布）。
- **fix**：目标行升级为圈卡（头像+成员数+「圈内成员可见」只读 badge），数据 circleStore.circles 已含圈信息。

### T2 标题+正文输入与校验
- **target**：标题/正文必填、长度钳制、计数联动、错误 toast。
- **current**：标题 maxlength=30（constants/village.ts:24 POST_TITLE_MAX_LENGTH，:493 挂载）、正文 maxlength=500 + 0/500 计数（:504/:507-509）；空标题/空正文 toast 经执行捕获逐字一致（PT05「请输入标题」、PT06「请输入内容」，均 VERIFIED）；500/500 正常灰不误报（PT08 VERIFIED，截图直观证实）；帖子模式另有 5 字下限拦截分支（:351-354，文案 zh-CN.ts:3690，执行级 PT14 UNVERIFIED——执行器定位失败，分支未被触达）。
- **gap**：无功能缺失。数值偏差见 T8（0/500 vs 理想 0/1000）；理想稿无标题字段属 publish/post 家族分工（后端 posts title 5-30 必填，CreatePostRequest.java:17），非本页缺陷。
- **fix**：—（数值偏差归 Issue MP-R1-POSTTOPIC-304）

### T3 图片上传
- **target**：多选、预览、删除、上限、隐私授权（理想稿工具条首项为「图片/视频」）。
- **current**：MAX_IMAGES=9、chooseImage 前隐私授权检查（:190-218 ensurePrivacyAuthorized）、压缩 sizeType、相册/相机双源、× 删除（:223-225）、n/9 计数（:673）；real 模式提交前本地临时路径统一上传（:325-342，MP-R2-POSTTOPIC-001）。执行级：PT34 UNVERIFIED（uni.chooseImage 系统相册无法被 automator mock，Manifest 预授权如实标注）、PT33 UNVERIFIED（DevTools 默认已授权，拒绝分支不可构造）——**链路代码在位但执行级零覆盖，如实声明**。
- **gap**：仅图片不支持视频（uni.chooseImage 无 mediaType 视频）；上限 9 与理想一致。
- **fix**：家族级裁决（同 publish/post 均仅图片）：后端与三页统一引入 uni.chooseMedia 视频链路，或理想稿「图片/视频」标注裁剪。

### T4 话题标签（理想：「# 添加话题 已选 0/5」）
- **target**：发布时可打话题标签（多选上限）。
- **current**：标签区 `v-if="useMock()"`（:576）——mock 模式 7 枚预设 chip 多选（上限 MAX_TAGS=3，:70/:130-141，超限 toast :137），real 模式整块不可见。根因按路径分叉：①生产话题路径（circle-home/topics 带圈进入→circleStore.createTopic）real 请求体仅 title/content/images（stores/circle.ts:520-530；后端 CreateTopicRequest.java:246-250 无 tags/favorite 字段）——隐藏是防「UI 承诺≠落库」的正确行为，但能力净缺失；②帖子路径（villageStore.createPost）payload 本就透传 tags（:361）且后端 CreatePostRequest.java:20 支持 tags（≤20）——本页标签门对该路径过度隐藏，但该路径在本页无生产入口（L7，全仓 grep 无 channel= 导航）。
- **gap**：**真实用户圈内发话题不能打任何标签**（生产链路能力缺失；mock 可用掩盖真实体验）。同族同根因：village/publish 圈目标隐藏话题行（MP-R1-VILLAGE-PUBLISH-107，保留）、publish 话题无选择器（-101）。
- **fix**：后端 CreateTopicRequest+落库增加 tags（posts 路径已有 @Size(max=20) 先例）；前端移除 useMock() 门、上限 3→对齐理想 5。在此之前保持隐藏是正确行为。
- → **Issue MP-R1-POSTTOPIC-301（Function，P2，保留）**

### T5 添加位置（理想：「📍 添加位置 北京大学·未名湖校区 ›」）
- **target**：发布时可附位置。
- **current**：整页无任何位置 UI/状态/payload 字段；后端两路径 DTO 均无 location 字段（CreateTopicRequest.java:246-250、CreatePostRequest.java:14-28）。兄弟页 publish 尚有城市级只读行（姊妹 req 文件 MP-R1-VILLAGE-PUBLISH-104，P3 保留，注明系代码内产品决定）；本页连占位行都没有。
- **gap**：能力位整体缺失（发布族范围裁剪的页内极端形态）。
- **fix**：产品族级裁决：维持裁剪则理想稿标注+本页无需补行；恢复则 chooseLocation + DTO location 字段三端同步。
- → **Issue MP-R1-POSTTOPIC-302（Function，P2，保留，与提及/谁可以看合并）**

### T6 提及好友（理想：「@ 提及好友 ›」）
- **target**：发布时 @ 好友。
- **current**：整页零 UI 零链路；后端无 mention 字段。兄弟页 publish 有 stub（点击 toast「即将开放」，MP-R1-VILLAGE-PUBLISH-102）。
- **gap**：能力位整体缺失。→ 合并 Issue 302。
- **fix**：同族裁决（弱化占位或接关注/喜欢列表实现）。

### T7 谁可以看（理想：「👁 谁可以看 圈内成员可见 ›」+ 目标卡 pill）
- **target**：可见范围展示/选择。
- **current**：整页零 UI。圈发话语义下可见范围=圈内成员（隐式成立，无字段无泄露风险）；posts 路径 visibility 由 targetType 推导（后端无显式字段，姊妹 req -103 已证）。
- **gap**：理想明示的权限展示/选择缺失；目标展示亦无可见范围 badge（归 T1 升级一并解决）。
- **fix**：最低成本满足理想语义：目标卡「圈内成员可见」只读 badge；真实权限选择需后端字段。
- → 合并 Issue 302。

### T8 正文容量（理想 0/1000）
- **current**：页面 MAX_LENGTH=500（:149）+ maxlength=500（:504）；store MAX_CONTENT_LENGTH=500（stores/village/constants.ts:12）；常量 POST_MAX_LENGTH=500（constants/village.ts:18）——客户端三方自洽。后端 DTO 实为 @Size(max=5000)（CreatePostRequest.java:18、CreateTopicRequest.java:248），RealCircleService 无 500 二次校验（仅 :888 展示截断）。姊妹 req 文件（-106）称 500 系「与后端规则对齐」，与本仓 DTO 实读不符——如实记录修正。
- **gap**：与理想稿数值不符；放宽空间客观存在（后端 5000）。
- **fix**：产品裁决：理想稿改 0/500，或客户端三方放宽（后端已可承接）。
- → **Issue MP-R1-POSTTOPIC-304（Consistency，P3，保留）**

### T9 关闭/返回
- **target**（理想稿 × 关闭 = 退出发布不提交）。
- **current**：头部返回 pill（:470-472 goBack→uni.navigateBack 裸调）；生产栈深≥2 返回正常，栈底失败产生未处理拒绝（PT30 FAILED + PT10/26/29 同根因，已由交互判定员立 MP-R1-POSTTOPIC-101 P3）+ isSubmitting 成功不复位在跳转失败时实例锁死（MP-R1-POSTTOPIC-102 P2）——**均已在交互判定文件立案，本轮不重复**。
- **gap**：—（归交互判定员 101/102）

### T10 关联活动/喜爱开关/发布目标选择器（本页独有，理想稿无）
- current：帖子模式关联活动（:599-634，弹层 :694-725）、mock 喜爱 switch（:637-648）、无参目标选择器（:520-570）均为本页扩展或双模式职责件；**生产不可达**（L7）：无参进入仅 dev/showcase/深链可达，channel=today 全仓无导航入口。执行级 PT28 VERIFIED（深链 channel=today&activityId=a-1 自动回填已选活动卡渲染正确）。
- gap：无缺失；生产不可达的大块 UI 属维护性观察（死入口风险），不计 Issue。

## 2. structureNotes（L1–L10 逐级）

- **L1 存在/可达：通过**。pages.json:109 注册于 circles 分包；constants/routes.ts:140 路由常量；深链渲染完整（exec PT01 EXECUTED：.title-input/.target-section/.tags-section/.favorite-section present、console 无错误）。
- **L2 骨架顺序**：头（返回/发布话题/发布）→标题→正文+0/500→发布到（带圈=只读两行；无圈=双 chip+8 分类宫格）→[mock:7 标签+喜爱 switch]→[帖子模式:关联活动]→图片 0/9→底部发布大钮。与理想稿骨架（发布到卡→正文→图格→话题→位置→提及→谁可以看→贴士→工具条）**非同构**——按 §0 裁决本页不做像素锚定判级；差异项中位置/提及/谁可以看/贴士/工具条五者为本页真实能力位缺失（§1 T5–T7 及贴士未立 Issue 归入功能缺口清单），标题/发布目标选择为本页双模式职责所需。
- **L3 组件**：8 张 section 卡（--c-bg-container+24rpx 圆角+软阴影）与圈内表单页同族；chip 选中态语言与列表页一致；tag-chip 选中=品牌绿实底白字（:1032-1046，2026-08-31 对比度修复）；ActivityCard 复用 village 组件。视觉审查员实拍 10 帧（A/B 双身份）证实渲染一致。
- **L4 文案**：zh-CN.ts:3679-3717 键位齐全与实拍逐字一致（发布话题/话题标题/分享你的想法.../最多选择 3 个标签/发布到/兴趣圈）；页面标题「发布话题」vs 理想「发布动态」属家族分工命名（publish 页已统一「个人动态」），非缺陷。
- **L5 状态**：头/底双发布钮 disabled 灰态（:476/:683）PT05 after.wxml 证实；超限红态（:901-903）代码在位但因 maxlength 钳制实际不可达（PT08 500/500 正常灰）；成功/失败 toast 分支（:367/:419）成功侧 PT10/PT26 捕获、失败侧 real 模式不可构造（PT16 如实标注）。
- **L6 交互链路**：校验链 PT05/PT06 VERIFIED；发布成功链 toast 捕获（PT10 01:57:04.5Z / PT26 02:03:17.5Z）但 store 级落库断言未采集；**34 例中 26 UNVERIFIED**（执行器候选定位失败 8 例/前置断链 6 例/条件不可构造 4 例/系统能力不可自动化 2 例/编排缺失等），标签多选（PT18）、分类单选（PT04）、弹层三路关闭（PT22）、图片添加删除（PT34）执行级零覆盖——被引元素均经截图/wxml 证实正常渲染，属验证债非页面行为反证。isSubmitting 成功不复位+栈底 navigateBack 失败的组合缺陷已由交互判定员立 101/102。
- **L7 入口 wiring**：生产入口恒带 circleId——circle-home.vue:371（「去圈内发帖」goToPostTopic）、topics.vue:115，共 2 个，均走话题路径；**无参态（目标选择器/校园圈 createPost 兜底）与 channel 帖子模式（今日广场/学校圈/活动）在本页无任何生产导航入口**（全仓 grep `channel=today|channel=school|channel=activity` 于 src 内 0 命中），仅深链/dev(:209)/showcase(:110) 可达。
- **L8 数据链**：real 话题路径请求体仅 title/content/images（circle.ts:520-530↔CreateTopicRequest.java:246-250 双侧实读一致）；本地临时图先上传再提交（:325-342）；无数字圈 ID 的 real 拦截（:387-391 防 slug 500）；双 store errorMessage 按分支取用（:313-317/:414-418，MP-R2-POSTTOPIC-006）。
- **L9 一致性**：字数客户端三方自洽 500（页/store/常量），后端 DTO 实为 5000——姊妹 req 文件「与后端规则对齐」表述与本仓实读不符（修正记录于 T8）；图片上限页 9=后端 9（@Size(max=9)）一致。
- **L10 回归**：MP-R1/R2/R3-POSTTOPIC 系列修复在位并经本轮证据无反证（onLoad 取参 :449-462、上传上移 :325-342、仅失败复位 :423-425、CSS var 头部 :755-763）；视觉审查员 201（滚动头部滚出）/202（热区）与本轮功能结论无冲突。

## 3. usageNotes（理想 vs 实际操作路径）

- **理想路径**（发布到摄影圈场景）：进入→（目标卡确认）→写正文→（配图/话题/位置/提及/权限）→发布→× 或发布完成退出。
- **实际生产路径**：圈详情/圈内话题列表→「去圈内发帖」→带 circleId 进入（目标锁定只读）→标题+正文→（首次）隐私授权→选图→发布→toast「发布成功」→800ms 自动返回来源页。**核心任务可顺畅完成**：PT10 发布成功 toast 捕获（生产栈深≥2 时 navigateBack 正常，本轮实测失败均为 harness reLaunch 置底伪影——PT29 判定原文）；来源页圈内容可见新话题（mock 侧 store.unshift 在位，real 侧 store 断言本轮未采集，如实声明）。
- **迷路风险**：低。单层表单、目标锁定免选择；但滚动后头部连返回钮滚出视口（视觉审查员 201 P2），长文输入后视觉返回路径仅剩系统侧滑手势+底部发布钮兜底。
- **2 步回 tab**：本页为分包非 tab 页；返回→圈详情（1 步）→底部 tab（2 步内达成）；冷启动深链栈底返回失败已由交互 101 立案（生产深链场景）。
- **卡点**：①真实模式话题标签/位置/提及/权限四个能力位不可用（Issue 301/302）；②跳转失败实例锁死（交互 102）；③核心链路的执行级证据仅 7/34 VERIFIED，验证债大面积存在（非页面行为反证，但按「未运行即未验证」如实计入）。

## 4. functionGaps（汇总）

| # | target | current | gap | fix |
| --- | --- | --- | --- | --- |
| 1 | 话题标签多选（理想 0/5） | mock-only（:576）；生产真实模式零能力；topic 路径后端无 tags 字段（CreateTopicRequest.java:246-250），posts 路径后端支持（CreatePostRequest.java:20）但本页帖子模式无生产入口 | 真实用户圈内发话题不能打标签 | 后端 CreateTopicRequest+落库加 tags→前端去 useMock() 门、上限对齐 5（Issue 301，保留） |
| 2 | 添加位置（POI 级） | 零 UI 零字段（两 DTO 均无 location） | 能力位整体缺失（兄弟页 publish 尚有城市级只读行） | 族级产品裁决（Issue 302，保留） |
| 3 | 提及好友 | 零 UI（publish 有 stub toast） | 能力位缺失 | 族级产品裁决（Issue 302，保留） |
| 4 | 谁可以看（圈内成员可见） | 零 UI；语义上圈话题隐式圈内可见 | 理想明示的权限展示缺失 | 最低成本：目标卡只读 badge；真实选择需后端（Issue 302，保留） |
| 5 | 图片/视频 | 仅 uni.chooseImage 图片（:206） | 无视频 | 族级裁决 uni.chooseMedia（Issue 303，保留） |
| 6 | 正文 0/1000 | 0/500 客户端三方自洽；后端实 5000 | 与理想稿数值不符 | 理想稿改 500 或客户端三方放宽（Issue 304，保留） |
| 7 | 目标圈卡（头像/成员数/可见 pill/chevron） | 两行纯文本（:516-519） | 信息展示弱（不阻塞发布） | 目标行升级圈卡（circleStore 数据在位，成员数需核字段） |
| 8 | 发帖小贴士卡+底部五项工具条 | 无（本页自建底部发布大钮替代） | 理想结构元素缺省（帮助性内容+快捷入口） | 产品裁决：工具条功能均经主体区可达无净损失，建议理想稿标注裁剪 |

## 5. verdict

**基本达标** —— 生产核心任务（圈内发话题：进入→填写→校验→发布→返回）链路完整且关键节点获执行级证实（校验 toast 逐字一致、发布成功 toast 捕获、深链渲染无错）；未达标项集中在真实模式能力位（话题标签/位置/提及/权限，均系后端字段缺失的发布族范围裁剪，页面侧「隐藏不承诺」是当前正确行为）与大面积执行级验证债（26/34 UNVERIFIED，主因执行器缺陷非页面反证）。无 L1 级缺陷；不判「达标」因能力位缺失与验证债如实存在，不判「不达标」因无功能不可用级缺陷且核心路径可完成。

## 6. 证据索引

- 代码：apps/client/src/subpackages/circles/circles/post-topic.vue（:70/:104-107/:149/:190-218/:325-342/:351-354/:387-391/:449-462/:476/:504/:516-519/:576/:599-634/:637-648/:683/:694-725/:755-763/:901-903/:1032-1046）；stores/circle.ts:473-531；stores/village/index.ts:416-540；stores/village/api.ts:203-228；stores/village/constants.ts:12；constants/village.ts:18/:24；constants/routes.ts:140；pages.json:109；subpackages/circles/circles/circle-home.vue:369-372；topics.vue:115；i18n/locales/zh-CN.ts:3679-3717
- 后端：apps/api/src/main/java/com/campuslove/api/village/CreatePostRequest.java:14-28；discover/CircleController.java:246-250；discover/RealCircleService.java:888
- 执行：reports/audit/round-1/interact/exec-results.json（PT01–PT34）；interact/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-judge.json（7V/1F/26U + Issues 101/102）
- 截图：reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT02/PT05(wxml)/PT06/PT08/PT09/PT27/PT28/PT33-after.png；reports/screenshots/round-1-tour/A|B/subpackages_circles_circles_post-topic__默认/滚动-中部/滚动-底部.png
- 姊妹裁决：findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-req.json（理想稿锚定 publish + Issues 101–107）；findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json（观察4 锚定消歧 + Issues 201/202）；reports/audit/baseline/ideal-baseline.md:101
