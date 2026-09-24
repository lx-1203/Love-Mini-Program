# PageCompare · subpackages/campus/campus/post-topic（校园圈·发帖）· R1 需求对照（A4）

- 审查角色：A4 需求对照员（只读代码与证据，未改动任何业务文件）
- 日期：2026-09-24；证据基线 gitSha=aefd8a72（与 HEAD 一致）
- 理想图参照：素材/理想效果图/发布帖子页面.png（锚定依据 reports/audit/baseline/ideal-baseline.md:101「publish（圈场景发布=circles/post-topic、campus/post-topic）←发布帖子页面.png」）；素材/理想效果图/校园圈.png 经实读为校园圈 Hub 列表稿（映射 campus/hub，非本页理想稿）
- 执行证据：reports/audit/round-1/interact/exec-results.json（manifest=SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC，suite S07-campus-matching，PT01–PT38 共 38 例：2 VERIFIED / 0 FAILED / 36 UNVERIFIED，判定文件 interact/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-judge.json，该文件立 Issue MP-R1-CAMPUSPOSTTOPIC-101）
- 操作截图：reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT*.png + reports/screenshots/round-1-tour/A|B/subpackages_campus_campus_post-topic__*.png（A 身份 6 帧）
- 源码：apps/client/src/subpackages/campus/campus/post-topic.vue（839 行，逐行通读）；关联 stores/campus.ts、components/village/TopicSelector.vue、后端 CampusController.java / RealCampusService.java / CampusTopic.java 双侧实读

## 0. 理想图锚定仲裁（前置裁决）

19 张整页稿中**无校园发帖专属稿**：校园圈.png 实读为「校园圈 Hub（学校圈子列表 + 去认证 + 进入/申请加入）」，对应 campus/hub（该页已有独立对照文件）；发布帖子页面.png 按 ideal-baseline.md:101 的「发布功能族」语义覆盖本页（圈场景发布=circles/post-topic、campus/post-topic），其像素级锚定权（L1–L4 硬对照）已由 village/publish 姊妹审查行使。故本页以该稿为**功能需求参照（capability checklist）**，不做像素级判级。理想稿能力位清单：发布到圈卡（头像/成员数/「圈内成员可见」pill/chevron）、正文 0/1000、图格（× 删除 + 虚线加号格）、添加话题 0/5、添加位置（POI）、提及好友、谁可以看、发帖小贴士、底部五项工具条、× 关闭。
另：本页「分类 6 选 1 + 标题 + 匿名开关」为理想稿所无的校园域适配件（与 campus/index 六 Tab 同族），不计缺失。

## 1. 本页功能 target（应该具备什么）→ current / gap / fix

生产职责（由入口与提交链实证）：**本校已认证用户在校园圈发起带分类/标题/正文/配图/话题标签/匿名选项的话题发布，成功后回流当前分类 Tab 顶部**（页面头注释 post-topic.vue:2-11 与提交链 :175-264 一致）。

### T1 入口与分类透传
- **target**：从 campus/index 当前 Tab 的发布入口进入并自动预选该分类。
- **current**：唯一生产入口=campus/index FAB（仅 `isOwnCertifiedView` 可见，index.vue:61-64/:356）→ `goToPostTopic` 透传 `?category=activeCategory`（index.vue:118-122，MP-R2-CAMPUSINDEX-002(a) 修复在位）；本页 onLoad 消费参数（post-topic.vue:61-66）。执行级：PT05 SKIPPED（入口不可自动化定位）；PT02 EXECUTED（?category=study_help 后 .category-option--selected present、console 无错）但选中项文本未断言，judge 判 UNVERIFIED。
- **gap**：透传消费代码在位；但 query.category **未做白名单校验**直接 `cat as CampusTopicCategory`（:62-65）→ 非法深链值会产生「无 chip 高亮 + 发布出孤儿帖」（→ Issue 206）。
- **fix**：onLoad 内校验 `cat in CAMPUS_CATEGORY_MAP` 再赋值，非法回落默认 course_exchange。

### T2 认证门禁（校园域特有 target）
- **target**：仅本校已认证用户可发布（校园圈私域语义，index.vue:60 注释「本校已认证视角（可发帖/互动）」）。
- **current**：客户端入口侧 FAB 门禁（isOwnCertifiedView）；服务端 `POST /campus/topics` 强制 `campusPermissionService.requireVerifiedSameSchool(userId, campusName)`（CampusController.java:169-177，v3 Nearby 冻结）。深链直入时表单可渲染但发布被后端拒（失败 toast 分支 :257-263 兜底）。门禁闭环成立。
- **gap**：无功能缺失。观察项（不立案）：页面级无门禁时未认证用户经深链可见完整表单、填完提交才被拒，体验损耗但语义安全。
- **fix**：—（可选优化：进入时预检认证态给引导，非必需）

### T3 分类 6 选 1
- **target**：六个校园分类单选、即时高亮、默认课程交流。
- **current**：6 chip 双行（:295-318）+ selectCategory 单选（:120-122），选项文案取 CAMPUS_CATEGORY_MAP（:95-102，与 campus/index 六 Tab 同源）。执行级：PT07 UNVERIFIED（六步点选只执行 1 步且目标为已选中首 chip）；PT07-after 截图证实恰 1 个高亮、wxml（PT18-after）证实仅课程交流带 --selected。
- **gap**：无功能缺失；选中迁移唯一性执行级未观测（验证债，非行为反证）。
- **fix**：—

### T4 标题 + 正文 + 计数
- **target**：标题/正文必填、长度钳制、0/500 计数联动。
- **current**：标题 maxlength=50（:329）、正文 maxlength=500 + 计数（:336-346，MAX_LENGTH=500 :105）；PT09 VERIFIED（输入回显 + 双发布钮保持置灰）；PT13/PT14 EXECUTED 但执行器降级为短文本（499/501 边界与清空分支未触达，judge 如实标注）。因 :maxlength 钳制，isOverLimit 红态分支实际不可达（防御性死分支，与 circles 同构）。
- **gap**：无功能缺失；0/500 vs 理想 0/1000（→ Issue 205）。
- **fix**：—

### T5 空表单校验 + 防连点
- **target**：空表单/缺项提交有明确反馈；防重复提交。
- **current**：提交中守卫 + 逐项校验 toast（:179-193，MP-R1-CAMPUSPOST-001 修复）；isSubmitting 防连点 + 成功路径不复位由页面销毁终结（:195/:249-256，MP-R1-CAMPUSPOST-004）。执行级：**PT21 正向实证**（底部按钮 tap → 500ms 内 toast「请输入标题」，exec-results ts=1790130409550）；PT16-PT20 全 UNVERIFIED——根因是执行器文本候选定位不穿透 .submit-text 子节点（judge notes a 项：截图与 wxml 证实「发布」钮真实存在可见），非死按钮；PT19 防连点未执行。
- **gap**：无功能缺失；执行级覆盖不足如实计入 usageNotes。
- **fix**：—

### T6 发布成功 / 失败链
- **target**：成功 toast → 自动返回来源页 → 新帖置顶当前分类；失败 toast 可重试。
- **current**：mock 全链在位（createCampusTopic 校验 + 敏感词于 store，campus.ts:623-659 unshift 回流）→ toast「发布成功」（:248）→ 800ms navigateBack（:252-256）；失败取 store.errorMessage（:257-263）。**执行级：本页发布成功链路零覆盖**——PT18/PT21/PT38 的表单填充前置均未执行（judge notes b：六份 after-wxml md5 全等=恒空表单态）；同构 circles 页 PT10/PT13 侧证同族链路可通，但本页自身无执行证据，如实声明。
- **gap**：无代码缺陷证据；验证债（critical 用例未观测）。
- **fix**：补一例「填表→发布→toast→返回→回流」的可复现自动化用例（需支持 input 填充 + 文本定位穿透）。

### T7 配图（target：理想图格 ×/加号格；页面承诺「上传图片 上限 6 张」）
- **target**：多选图、预览、× 删除、n/6 计数、隐私授权前置、发布后图片随帖可见。
- **current**：UI 与客户端链路完整——chooseImage（相册/相机、压缩、余量 count，:134-162）+ ensurePrivacyAuthorized（:141-145）+ × 删除（:165-167）+ 计数（:353）+ 满图隐藏加号格（:363）+ real 模式先逐张 uploadPostImage 换 URL 再提交（:200-219，MP-R1-CAMPUSPOST-002 唯一文件名防幂等键碰撞；services/api.ts:878-894）。tour 实拍证实「上传图片 0/6 + 添加图片」格渲染。**但 real 模式端到端断裂：客户端把 images 放进 POST /campus/topics 请求体（campus.ts:677），后端 CreateCampusTopicRequest 无 images 字段（CampusController.java:452-457）、RealCampusService.createCampusTopic 无任何 setImages 调用（RealCampusService.java:130-165）——上传成功换来的 URL 在创建时被静默丢弃，帖子 images 恒空**。读侧管线齐全（实体 images JSON 列 CampusTopic.java:62-63、视图返回 :405、客户端 mapToCampusTopicItem 解析 campus.ts:102），系「建了读侧忘写侧」的半成品接线。执行级 PT24-PT29 UNVERIFIED（chooseImage 原生面板不可自动化），本判定为双侧代码实读证据。
- **gap**：**P1 功能缺失：real 模式带图发布图片静默丢失**（mock 可用掩盖）。→ **Issue MP-R1-CAMPUSPOSTTOPIC-201**
- **fix**：后端 DTO 增 `images` 字段（@Size(max=6)）+ service `topic.setImages(serializeTags(images))` 同款 JSON 序列化；客户端无需改。

### T8 话题标签（TopicSelector）
- **target**：发布时可打话题标签（理想 0/5），支持搜索/自建。
- **current**：TopicSelector 全功能集成（搜索过滤 TopicSelector.vue:61-69、自建去重 :147-176、上限 3 toast :116-122、清空 :179-183；页面挂载 :377-380）；**real 模式 tags 全链路真实闭环**——提交 slice(0,5)+每 20 字（:233-245）→ store 透传（campus.ts:666-676）→ 后端 `@Size(max=5) List<@Size(max=20) String> tags`（CampusController.java:456）→ 实体 tags JSON 列（CampusTopic.java:70-71）→ 视图返回。本页是发布功能族中 **tags 唯一真实闭环页**（circles 页同能力 mock-only，见姊妹 Issue MP-R1-POSTTOPIC-301）。执行级 PT30-PT36 UNVERIFIED（执行器不穿透子组件边界，judge notes a：12 chip 经 wxml 证实真实渲染）。
- **gap**：选择上限 3 vs 理想 0/5（→ Issue 205，合并记录）；其余无缺失。
- **fix**：—

### T9 匿名开关
- **target**：承诺「开启后你的信息将显示为『匿名校友』」（anonymousDesc，zh-CN.ts:3544）。
- **current**：mock 模式成立（campus.ts:654 按 isAnonymous 显示匿名校友）。**real 模式三重断裂**：①store real 分支 payload 不含 isAnonymous（campus.ts:672-678 仅 category/title/content/tags/images）；②后端 DTO 无该字段（CampusController.java:452-457）；③服务端硬编码 `topic.setIsAnonymous(false)`（RealCampusService.java:159）——开关为 real 模式安慰剂，实名照常暴露。页面开关**未像 circles 页那样以 useMock() 门隐藏**（:383-395 恒显示），恰构成「UI 承诺≠落库」反模式；校园恋爱社交语境下匿名承诺失效即隐私失效。执行级 PT37 UNVERIFIED（observe-only，wxml 证 checked=false color=#36C99A 初始态）。
- **gap**：**P1 功能缺失：real 模式匿名发布无效**。→ **Issue MP-R1-CAMPUSPOSTTOPIC-202**
- **fix**：DTO 增 isAnonymous + service 落库透传；或短期与 circles 页同口径：real 模式隐藏开关并去文案承诺（二选一，禁保持现状）。

### T10 返回 / 关闭
- **target**：理想稿 × 关闭 = 退出不提交。
- **current**：header「取消」（:278 → goBack :269-271 裸 uni.navigateBack）+ 成功路径 800ms navigateBack（:252-256）均无 fail 兜底——栈深=1（冷启动深链/转发直达）时零反馈 + onUnhandledRejection 全局错误。**已由交互判定员立 MP-R1-CAMPUSPOSTTOPIC-101（P2，Interaction，待修复，fix 范围明示含成功路径加固）**，本轮不重复立案。
- **gap**：—（归 101）
- **fix**：—

### T11 理想稿其余能力位（家族级）
- **添加位置 / 提及好友**：本页零 UI、零状态、payload 无字段（后端 CreateCampusTopicRequest 亦无）→ 合并 **Issue 203（Function，P2，保留，姊妹页同族 Issue MP-R1-POSTTOPIC-302）**。
- **谁可以看**：无显式展示/选择；校园话语义隐式「同校可见」由 schoolId 域 + requireVerifiedSameSchool 门禁成立（CampusController.java:177），并入 Issue 203 一并登记（理想 pill 级展示缺失）。
- **图片/视频**：仅 uni.chooseImage 图片（:146-161）→ **Issue 204（Function，P3，保留，姊妹 MP-R1-POSTTOPIC-303 同族）**。
- **发帖小贴士卡 + 底部五项工具条**：无（底部以自建发布大钮替代，工具条功能均经主体区可达，无净能力损失）→ 结构裁剪观察，不立案，建议理想稿标注。
- **正文 0/500 vs 理想 0/1000、话题 0/3 vs 理想 0/5**：客户端自洽（MAX_LENGTH=500、MAX_TOPIC_SELECTION=3）；后端 content 实为 @Size(max=5000)、tags 实为 ≤5——放宽空间客观存在 → **Issue 205（Consistency，P3，保留，姊妹 MP-R1-POSTTOPIC-304 同族扩充）**。

## 2. structureNotes（L1–L10 逐级）

- **L1 存在/可达：通过**。pages.json:126 注册于 campus 分包；constants/routes.ts:150 路由常量；冷启动深链渲染完整（exec PT01 EXECUTED：.category-option--selected/.title-input/.content-input/.content-count/.submit-text 全 present、console 无错误；tour A/B 双身份 11 帧无错误空态）。
- **L2 骨架顺序**：头（取消/发布话题/发布）→ 分类 6 选 1 → 标题 → 正文 0/500 → 图片 0/6 → 话题选择器（已选 0/3/搜索/热门 12 chip/创建）→ 匿名开关 → 底部发布大钮。与理想稿骨架（发布到卡→正文→图格→话题→位置→提及→谁可以看→贴士→工具条）**非同构**：分类/标题/匿名为本页域适配（理想稿所无，非缺失），位置/提及/谁可以看/贴士/工具条为真实能力位缺失（§1 T11，Issue 203/204/205 登记）。像素级 L1–L4 判级按 §0 裁决不行使（锚定权归 village/publish）。
- **L3 组件**：6 张 section 卡（--c-bg-container + 24rpx 圆角 + 软阴影）与发布族表单页同族；chip 选中=品牌绿描边浅绿底（:562-566）；TopicSelector 复用 village 组件；原生 switch color=brand500 #36C99A（designTokens.color.brand[500]，tokens.ts:22；全仓一致，色值对 29a2b1df 冻结谱的偏差属视觉域，本轮不判）。绿渐变 header（:447）为表单页品牌元素，v3.1 Hero 节奏红线条款为 tab 级页面，不适用本页。
- **L4 文案**：zh-CN.ts:3527-3548 / en-US.ts:3448-3471 键位齐全（publishSuccess/errTitle/errContent/maxImages/privacyRequired/submitPublishing 等 24 键双语逐键核对在位）；tour 实拍逐字一致（发布话题/选择分类/上传图片/添加图片/选择话题/已选话题 0/3/匿名发布/发布话题）；唯一文案-行为矛盾：「开启后…显示为匿名校友」在 real 模式不成立（Issue 202）。
- **L5 状态**：双发布钮 disabled 灰态（:494-507/:824-837，PT09 VERIFIED 双 disabled class present）；正文超限红态分支因 maxlength 钳制实际不可达（防御性死分支）；成功/失败 toast 分支代码在位（:248/:257-263）执行级未覆盖（PT18/PT20 UNVERIFIED）。
- **L6 交互链路**：校验链正向实证（PT21 toast「请输入标题」）；PT21 同证底部按钮非死按钮；分类点选仅单步执行（PT07）；话题选择器 7 例、图片链 6 例执行级零覆盖——judge notes 判明全部 act-FAIL 系执行器文本候选定位不穿透子组件/子节点（wxml 证实目标元素真实渲染），属**验证债非页面行为反证**；但按「未运行即未验证」如实计入，本页执行级证据仅 2/38 VERIFIED。
- **L7 入口 wiring**：唯一生产入口=campus/index FAB（认证门禁）→ 透传 category（index.vue:118-122/:356）；hub.vue 无发帖入口（grep 0 命中）；深链为本轮 judge PT01-PT04 的标准入口形态且可正常渲染提交（服务端门禁兜底，T2）。
- **L8 数据链**：mock 全链在位（store 校验→unshift 回流）；real：tags 闭环（T8）、images/anonymous 双断裂（Issue 201/202）、上传先于提交且文件名含每图唯一量（:213，防 Idempotent 端点 409——MP-R1-CAMPUSPOST-002 在位）；发布失败错误取 store.errorMessage 单一来源（:259）。
- **L9 一致性**：正文 500 客户端三方自洽（页/store UI_LIMITS 无涉）vs 后端 @Size(max=5000) vs 理想 1000；话题 3 vs 后端 5 vs 理想 5；图片上限 6=UI_LIMITS.PHOTO_GALLERY_MAX（limits.ts:29）但后端无对应校验字段（断裂所致，Issue 201 修复时应补 @Size(max=6)）；字数/上限数值差异归 Issue 205。
- **L10 回归**：MP-R1-CAMPUSPOST-001/002/004、MP-R2-CAMPUSPOST-002/005、MP-R2-CAMPUSINDEX-002(a) 历史修复逐条在位且本轮证据无反证；MP-R1-CAMPUSPOSTTOPIC-101（goBack 裸 navigateBack）待修复中。

## 3. usageNotes（理想 vs 实际操作路径）

- **理想路径**：进入→（目标卡确认）→写正文→（配图/话题/位置/提及/权限）→发布→退出。
- **实际路径**：campus/index（认证视角）→ 右下 FAB → 分类已按当前 Tab 预选 → 填标题/正文 →（选图 0/6、选话题 0/3、开匿名）→ 发布 → toast「发布成功」→ 800ms 自动返回 → 新帖在当前 Tab 顶部。**mock 模式核心任务可顺畅完成**（校验反馈 PT21 执行级实证；回流 store.unshift campus.ts:657）；**real 模式文字+话题帖可发布，但带图帖图片静默丢失、匿名帖实名暴露（Issue 201/202）——「带图/匿名分享」这一页面自我承诺的核心任务在生产模式不可完成**。
- **迷路风险**：低。单层表单、双发布钮（header+底部）、header 取消；未发布离开无挽留确认（可接受，发布族同构）。栈底深链「取消」失效由交互 101 立案。
- **2 步回 tab**：返回→campus/index（1 步）→底部 tab（2 步内达成）。
- **卡点**：①real 模式配图/匿名双能力断裂（201/202）；②执行级验证债 36/38 UNVERIFIED（执行器定位缺陷所致，judge notes 已定性）；③入口仅认证用户可见，未认证者由公共浏览横幅引导去认证（index.vue:271），语义正确。

## 4. functionGaps（汇总）

| # | target | current | gap | fix |
| --- | --- | --- | --- | --- |
| 1 | 配图随帖发布并可见（页面承诺「上传图片」+理想图格） | 客户端全链在位且先上传换 URL（post-topic.vue:200-219）；请求体带 images（campus.ts:677）但后端 DTO 无 images（CampusController.java:452-457）、service 不落库（RealCampusService.java:130-165）；读侧管线齐全（CampusTopic.java:62-63、:405、campus.ts:102） | **real 模式图片静默丢失，帖子恒无图（P1，Issue 201）** | DTO 增 images @Size(max=6) + service serialize 落库 |
| 2 | 匿名发布（承诺「显示为匿名校友」） | mock 成立（campus.ts:654）；real：payload 不带（campus.ts:672-678）+ DTO 无字段 + `setIsAnonymous(false)` 硬编码（RealCampusService.java:159）；开关未按 circles 口径隐藏（post-topic.vue:383-395） | **real 模式匿名无效、实名暴露（P1，Issue 202）** | DTO+service 透传落库；或短期 real 隐藏开关并撤文案承诺 |
| 3 | 添加位置（理想 POI 级） | 零 UI 零字段（前端/DTO 均无） | 能力位缺失（家族同 Issue 302） | 族级产品裁决（Issue 203，保留） |
| 4 | 提及好友 | 零 UI 零字段 | 能力位缺失 | 族级裁决（Issue 203，保留） |
| 5 | 谁可以看（显式展示） | 无显式 UI；同校可见由 schoolId+门禁隐式成立 | 理想 pill 级展示缺失 | 低成本只读 badge（并入 Issue 203） |
| 6 | 图片/视频 | 仅 uni.chooseImage（:146-161） | 无视频 | 族级 uni.chooseMedia 裁决（Issue 204，保留） |
| 7 | 正文 0/1000、话题 0/5 | 0/500 与 0/3 客户端自洽；后端实为 5000/5 | 与理想数值不符（放宽空间存在） | 产品裁决理想稿标注或三方放宽（Issue 205，保留） |
| 8 | 分类参数健壮性 | onLoad 直接 cast 无白名单（:62-65）；后端仅 @NotBlank（RealCampusService.java:138-140）；列表按 category 过滤（campus/index.vue:91） | 非法深链值产生全 Tab 不可见孤儿帖（P3，Issue 206） | onLoad 白名单校验回落默认 |

## 5. verdict

**不达标** —— 页面结构完整、入口/门禁/校验/话题标签链路真实可用（T8 为发布族唯一 tags 闭环页，PT21 校验反馈执行级实证），但**两项页面自我承诺且 UI 明示的功能在 real（生产）模式端到端断裂**：配图发布图片被后端创建接口静默丢弃（Issue 201）、匿名开关为安慰剂且实名照常暴露（Issue 202），均系双侧代码实读确证的 P1 功能缺失，且 mock 模式可复现成功恰恰掩盖缺陷。核心承诺「带图/匿名分享校园话题」生产不可完成，故不判「基本达标」。L1–L4 结构级无缺陷；验证债（36/38 UNVERIFIED，执行器定位缺陷所致）如实计入但不作为降级主因。

## 6. 证据索引

- 代码（前端）：apps/client/src/subpackages/campus/campus/post-topic.vue（:61-66/:105/:120-122/:127-129/:134-167/:175-264/:329/:336-346/:353/:363/:377-380/:383-395/:447/:494-507/:824-837）；stores/campus.ts（:96-113/:613-683，real payload :672-678、mock :636-659、images :646/:677、isAnonymous :654）；components/village/TopicSelector.vue（:61-69/:105-125/:147-183）；config/popular-topics.ts:91；constants/limits.ts:29；constants/routes.ts:150；pages.json:126；subpackages/campus/campus/index.vue（:55-64/:91/:118-122/:271/:356）；theme/tokens.ts:22；i18n/locales/zh-CN.ts:3527-3548、en-US.ts:3448-3471
- 代码（后端）：apps/api/src/main/java/com/campuslove/api/campus/CampusController.java（:166-179 createTopic、:177 requireVerifiedSameSchool、:449-457 CreateCampusTopicRequest 无 images/isAnonymous）；campus/RealCampusService.java（:130-165 createCampusTopic 无 setImages、:159 setIsAnonymous(false) 硬编码、:405 视图读 images）；entity/CampusTopic.java（:50-51 category、:62-63 images JSON 列、:70-71 tags JSON 列）；campus/CampusTopicView.java（:14 images、:20 isAnonymous）
- 执行：reports/audit/round-1/interact/exec-results.json（SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC PT01–PT38）；interact/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-judge.json（2V/0F/36U + Issue MP-R1-CAMPUSPOSTTOPIC-101 + notes a-e 定性）
- 截图：reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT04/PT07/PT09/PT21/PT23/PT24-after.png；wxml/PT18-after.wxml（默认态 md5 4ff80bc2…）；reports/screenshots/round-1-tour/A|B/subpackages_campus_campus_post-topic__默认/滚动-底部.png（上传图片 0/6、已选话题 0/3、匿名发布、发布话题 渲染实拍）
- 理想图/基线：素材/理想效果图/发布帖子页面.png（本轮实读，能力位清单来源）、素材/理想效果图/校园圈.png（实读为 hub 稿，排除本页锚定）；reports/audit/baseline/ideal-baseline.md:101
- 姊妹裁决：findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-req.json（MP-R1-POSTTOPIC-301/302/303/304 家族先例 + 理想稿锚定消歧）；page-compare/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.md
