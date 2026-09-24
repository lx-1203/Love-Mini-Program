# PageCompare · R1 · subpackages/village/village/publish（村口·发布帖子）

- 审查员：A4 需求对照员（与视觉审查员分文件）
- 日期：2026-09-24
- 理想基线：`素材/理想效果图/发布帖子页面.png`（唯一页面级对照依据）
- 实际证据：
  - 静态截图：`reports/screenshots/round-1/A|B/SUBPACKAGES_VILLAGE_VILLAGE_PUBLISH-默认.png`（已目检 A 版）
  - 交互执行：`reports/audit/round-1/interact/exec-results.json`（sha aefd8a72，PUB01–PUB37 共 37 例：EXECUTED 18 / FAILED 19）
  - 操作截图目录：`reports/screenshots/round-1-interact/`（SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB*.png / wxml）
  - 源码：`apps/client/src/subpackages/village/village/publish.vue`（867 行，HEAD 逐行通读）

## 页面目标（target，源自理想图+本轮需求文本）

1. 顶部导航：X 关闭 + 「发布动态」标题 + 绿色胶囊「发布」CTA。
2. 「发布到」目标卡：圈场景=发布到摄影圈（头像+圈内成员可见 tag+成员数 1.2w 格式）；个人动态页默认「个人动态」——双入口设计。
3. 内容顺序：正文 0/1000 → 图格（删除X+虚线添加）→ 话题 0/5 → 位置 → 提及 → 谁可以看 → 小贴士 → 底部工具条。
4. CTA「发布」可提交；状态：谁可以看权限选择。
5. 同构复用：circles/post-topic、campus/post-topic 为兄弟页。

## structureNotes（L1–L10 逐级）

- **L1 页面存在与可达 — 通过**：`pages.json:79` 注册 `village/publish`；路由常量 `constants/routes.ts:82`；深链直入渲染完整（PUB01 EXECUTED：`.publish-header__title/.publish-to__card/.publish-content__input/.publish-content__count/.publish-image--add` 全 present，无错误/空态闪现）。
- **L2 布局骨架与顺序 — 基本一致，两处缺省**：实际顺序=顶部(X/发布动态/发布)→发布到卡→正文+计数→图格→行项组(话题/位置/提及/谁可以看)→小贴士，与理想一致；偏差①**底部工具条整体移除**（publish.vue:752 注释「2026-09-06 已按需求移除」，样式残壳 :856-859）——与本轮需求文本「…→小贴士→底部工具条」冲突；偏差②**话题行在圈子目标下隐藏**（publish.vue:699-707，MP-R2-PUB-104：后端 CreateTopicRequest 无 tags，选中即丢数据）。PUB12 EXECUTED 证实「话题行已隐藏」。
- **L3 组件级 — 通过（含已修复项）**：添加图片块为白底虚线+「＋」（publish.vue:837，R21 注明对齐理想图）；发布到卡=头像+名称+tag+副标题+chevron（:601-615）；成员数短格式 1.2w 与理想图「1.2w 成员」同款（formatMemberShort :135-139）。
- **L4 文案级 — 大体一致**：「发布动态」「发布」「发布到」「添加话题 已选 n/5」「添加位置」「提及好友」「谁可以看」「发帖小贴士」及贴士正文「真实分享校园生活，友善互动，让更多人认识有趣的你～」与理想图逐字一致（publish.vue:591/593/600/704-706/711/717/729/740-742）。偏差：①计数上限 **0/500**（`stores/village/constants.ts:12` MAX_CONTENT_LENGTH=500，理想图为 0/1000）——注意静态截图显示 0/1000、位置行「北京市·自动定位」为**修复前构建**的留影，HEAD 实渲染 0/500（:681）与无缓存时「选择位置」（:714，MP-R1-PUBLISH-006）；②圈子目标下「谁可以看」值显示「兴趣圈」（:146），理想图为「圈内成员可见」（发布到卡 tag 仍是「圈内成员可见」:610，同义不同词）。
- **L5 状态级 — 部分达标**：发布钮禁用态（空内容 #C7E9DC 深绿字，:788-789，PUB08 空 content Toast「请输入内容」EXECUTED）；计数近上限警示色（:74-77,:829）；发布到弹层三态（加载中/失败+重试/空态 :634-661）；小贴士可关闭。**「谁可以看」不可真正选择**：cycleVisibility 四种目标的轮换列表均为单值（general=public / campus=school / friends=friends / circle=interest，publish.vue:275-282），点击永远无变化，但行保留 press-feedback+chevron（friends 除外 :722-732）——误导性可点 affordance。
- **L6 交互链路 — 代码在、执行级未证**：发布成功链路（≥5 字→Loading→createPost/createTopic→400ms 返回→草稿双清，publish.vue:498-576）代码完整，但 PUB10/PUB09 因 harness `el.input is not a function` 无法向 textarea 输入，实际观察到的是「请输入内容」Toast——**发布成功 E2E 在 R1 交互轮未获执行级证实**（PUB35 同样卡在空内容）。
- **L7 入口 wiring — 与「双入口」语义存在错位**：本页实际存活入口仅 `pages/profile/index.vue:806`「添加故事」→ `?target=friends`（个人日常）；村口列表主发帖入口走 `ROUTES.VILLAGE.POST`＝**post.vue**（village/index.vue:389），兴趣圈发帖走 `circles/post-topic?circleId=`（topics.vue:115、circle-home.vue:371）——均为兄弟页。publish.vue 的 `?circleId`/`?target=campus` 入口仅深链可达（PUB05/06/07 EXECUTED 证实参数语义正确：campus→校园圈+学校圈；circleId 未加入→回退个人动态）。全库无任何导航向 publish.vue 传 circleId（grep 证实）。
- **L8 草稿链路 — 通过（代码）**：独立键 `village:publish-draft`（constants/village.ts:49，MP-R1-PUBLISH-004 防与 post.vue 互写污染）、本地+后端双写、退出「保留/放弃」弹窗、入口参数优先于旧草稿（publish.vue:152-170,293-455）。PUB33/34 的弹窗按钮点击因 harness 元素定位失败未执行。
- **L9 数据一致性 — 通过**：字数上限与 store 校验同源 500（MP-R1-PUB-016）；可见范围与后端 visibility 枚举三态强联动（批次 B4 注释 :266-270）；本地/已上传图片统一 isUploadedMediaUrl 判定（MP-R2-PUB-102）。
- **L10 回归防护 — 部分**：静态截图与 HEAD 存在两处滞后（0/1000、自动定位），说明截图未随 MP-R1-PUB-016 / MP-R1-PUBLISH-006 修复重拍；PUB15/16（计数三段/禁用态）FAILED 于 harness，无替代执行证据。

## usageNotes（理想 vs 实际操作路径）

- **核心任务「写一条动态并发布」**：进入（我的→添加故事，1 步）→输入正文（≥5 字，后端标题 5–30 规则映射 :503-509）→点「发布」→成功 Toast→400ms 返回。路径短、无迷路点；空内容/过短/失败均有 Toast 反馈（PUB08 执行证实）。⚠ 唯一保留意见：含内容的提交链路在 R1 交互执行中因 harness 无法输入 textarea 而未跑通（PUB09/10/11/12/13/14 全部退化为「请输入内容」），执行级只证实到校验层。
- **选目标/权限**：「发布到」弹层三级分组（公域/校园私域/兴趣圈子）顺滑，三路关闭（遮罩/再点卡/选择即关，PUB22/23 EXECUTED）；但「谁可以看」行点了没反应（单值轮换），权限选择实际只能靠切换发布目标间接完成——用户按理想图预期点「谁可以看」换权限时会卡壳。
- **话题/提及**：话题无选择器（点行=切换硬编码「#校园日常」），只能在正文里手打 #tag（buildMergedTopics :299-305 可并入）；提及点了只弹「即将开放」。两项在理想图里都是可用能力。
- **任意页 2 步回 tab**：X→navigateBack 回「我的」（tab 页）=1 步；冷启动深链栈=1 时 X→reLaunch 村口（PUB02/03 EXECUTED，不白屏）。达标。
- **丢失风险**：退出有草稿保留弹窗、草稿本地+后端双写双清（MP-R8-DRAFT-001 防已发布内容复活），保护到位（代码级；PUB31/33/34 执行未完成）。

## functionGaps（详见 findings JSON）

| # | target | current | gap | severity |
|---|--------|---------|-----|----------|
| 1 | 话题 0/5 可多选 | 点行仅切换硬编码「#校园日常」（:702,255-260）；兄弟页 circles/post-topic 有预设话题 chips（post-topic.vue:65-129） | 无话题选择器 | Function P2 |
| 2 | 提及好友 | 点击仅 Toast「提及好友即将开放」（:262-264；zh-CN.ts:1991） | 占位 stub | Function P2 |
| 3 | 谁可以看权限选择 | 四种目标轮换列表均单值，点击无变化但保留可点样式（:271-291,722-732） | 控件失效 affordance 误导 | Function P2 |
| 4 | 位置可选（理想=北大·未名湖校区级 POI） | 城市级只读展示（:50-61,708-715；2026-09-06 代码注明产品决定） | 无 POI 选择 | Function P3（保留） |
| 5 | 底部工具条 | 已整体移除（:752；样式残壳 :856-859），与本轮需求顺序文本冲突 | 结构缺省，功能经行项可达 | Consistency P3（保留） |
| 6 | 正文 0/1000 | 0/500（store/常量/后端三方一致，MP-R1-PUB-016/PUBLISH-012） | 与理想稿数值不符 | Consistency P3（保留） |
| 7 | 圈子场景话题行 | 圈子目标下整体隐藏（:699-707，后端 CreateTopicRequest 无 tags） | 圈内发帖无话题入口 | Function P3（保留） |

## verdict

**基本达标** — L1/L2 骨架、双入口参数语义、发布到三级弹层、草稿链路、文案与理想图高度一致，核心「发一条动态」任务可完成且不迷路；但理想图内容顺序中的三个能力位（话题选择、提及、谁可以看选择）为占位/失效控件，底部工具条移除与本轮需求文本冲突，且发布成功 E2E 在 R1 交互轮未获执行级证实（harness 无法输入 textarea），故不足「达标」。

## 附：R1 交互执行口径说明

PUB01–PUB37 中 19 例 FAILED 全部为 `act-FAIL`（harness 无法定位/输入元素，如 `el.input is not a function`、`element not found: __CAND__`），非页面行为失败；本报告对这 19 项一律标注「执行级未证、代码级核对」，不将其计为页面缺陷，也不计入通过。
