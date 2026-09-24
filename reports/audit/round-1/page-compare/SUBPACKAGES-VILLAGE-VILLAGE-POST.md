# R1 需求对照 · subpackages/village/village/post（村口·发帖页）

> 审查员：A4 需求对照（R1）。只读证据：源码 + round-1 交互执行结果 + 静态截图 + 理想图。
> **页面名勘误**：任务清单将其命名为「村口·帖子详情」，但该路由实际是**发帖/发布动态页**——
> `pages.json:83`（`village/post`）、`constants/routes.ts:81-82`（`POST: "/subpackages/village/village/post"`，注释「发帖页（旧，保留兼容）」）、
> `post.vue:2`（「发布动态页（village/post）」）。帖子详情页是 `village/detail`（`ROUTES.VILLAGE.DETAIL`）。
> 本审查以路由为准对照**发布动态功能**，理想图锚定「素材/理想效果图/发布帖子页面.png」。

## 证据基线

| 证据 | 路径 | 结论 |
| --- | --- | --- |
| 理想图 | 素材/理想效果图/发布帖子页面.png | 唯一页面级对照依据 |
| 静态截图 | reports/screenshots/round-1-tour/A/subpackages_village_village_post__默认.png（交互后/弹层态同目录） | 默认态与理想图逐段对照 |
| 交互执行 | reports/audit/round-1/interact/exec-results.json（S05-village，VP01–VP34） | 13 EXECUTED / 17 FAILED / 4 SKIPPED |
| wxml 证据 | reports/screenshots/round-1-interact/wxml/SUBPACKAGES-VILLAGE-VILLAGE-POST-VP*.wxml | VP02/VP29 等 DOM 实拍 |
| 源码 | apps/client/src/subpackages/village/village/post.vue（1616 行）；stores/village/{index,api,types}.ts；stores/circle.ts | 提交链路逐字段核对 |

## PageCompare

- **route**: `subpackages/village/village/post`
- **baseline**: 素材/理想效果图/发布帖子页面.png + 静态截图 round-1-tour/A 默认态 + exec-results.json VP01–VP34
- **structureNotes**（L1–L10）：
  - **L1 布局骨架**：理想图七段式「顶部导航（X＋发布动态＋绿发布胶囊）→ 发布到卡片 → 输入区 → 图片九宫格 → 附加功能行 → 发帖小贴士 → 吸底工具栏」与实际截图逐段对齐（静态截图默认态与 VP29-after.wxml DOM 双重证实：post-header / post-to / post-title / post-content / post-images / post-rows / post-tip / post-toolbar 全在）。✅
  - **L2 模块**：目标卡片、4 条附加行（添加话题/添加位置/提及好友/谁可以看）、5 个工具项（图片/话题/位置/提及/更多）、贴士条均与理想图一一对应。✅ 偏差：实际新增**独立标题输入**（0/20 计数，post.vue:714-728）——理想图无标题栏，为 2026-09-05 R17「小红书化」有意增强（标题或正文任一非空即可发布，post.vue:142-145），方向为超集，不作缺陷。
  - **L3 组件**：圆形头像＋名称＋「圈内成员可见」tag＋成员数副标题＋右箭头（post.vue:616-641）与理想图目标卡结构一致；虚线添加框、已选话题 chips、贴士关闭 × 均在。文本差异：正文计数上限 **0/500 vs 理想图 0/1000**（constants/village.ts:18 `POST_MAX_LENGTH=500`）；工具栏首项「图片」vs 理想图「图片 / 视频」；正文 placeholder「分享你的故事、心情或寻找那个TA...」vs 理想图「分享一点最近发生的事...」（wxml VP29 证实实际文案）。文案/规格级差异归视觉侧，此处记录。
  - **L4 行为**：发布钮空表单 disabled 联动已证实（VP01 observed `.post-header__submit--disabled:present`）；空表单 tap 发布 → Toast「请输入内容」（VP02 toast 证据）；连点 ×5 全部命中拦截、无重复提交（VP05，5×toast「请输入内容」，`submitting` 守卫 post.vue:477-478）；空表单点 X 无弹层直接返回（VP09）；目标弹层打开/选回个人动态联动（VP11/VP13）；圈子目标下话题入口在附加行与底栏同步隐藏（VP19，v-if `!isCircleTarget` post.vue:777-789、872-881）；吸底工具栏滚动不遮挡（VP32 pageScrollTo top/bottom）。深链 `?circleId` / `?target=campus` 解析代码在（post.vue:178-189），但 VP29/VP30/VP31 的 route options 均为 `{}`（未带参导航），**深链带参行为未获交互证实**。
  - **L5 层级**：弹层 z-index 1100 > 工具栏 120 > 页面（post.vue:1183/1456），遮罩 `@tap` 关闭、面板 `@tap.stop`；四弹层均无 X 关闭钮（三路关闭仅遮罩＋选完即关，VP23 未验证）。
  - **L6 反馈**：全交互点 press-feedback hover 态；toast/modal 反馈链路存在（拦截/上限/失败文案 post.vue:262-286、437-461、566-572）。
  - **L7 状态栏/胶囊**：R20 statusBarHeight 注入（post.vue:37-41、582）、R21 右侧胶囊避让 `padding-right: calc(var(--capsule-right,7px)+104px)`（post.vue:1055-1057）已落实，静态截图无叠印。
  - **L8 token**：全页走 `--c-brand/--c-brand-600` 绿系与 `--c-romance-500` 点缀，注释声明对齐「他人显示主页」白底（post.vue:1610-1613）。token 值是否符合 v3.1 冻结色归 token 裁决链/视觉侧，此处不判。
  - **L9 热区**：X 关闭钮 64rpx（post.vue:1062-1064）低于 88rpx 铁律，VP34 仅 observe-only 未裁决 → 留给交互侧；本页不重复立 issue。
  - **L10 无障碍**：关键按钮均有 role="button"+aria-label（标题/正文/自定义话题输入含 aria-label）。
  - **L1–L4 判定**：无「不达标」级偏差——差异均为增强（标题栏）或文案/规格级（500 vs 1000、placeholder 文案），结构达标。
- **usageNotes**：
  - 理想路径「打开发布页 → 写标题/正文 →（选目标/话题/位置）→ 发布」：输入与发布钮同屏 2 步内完成，发布成功 800ms 后自动返回（post.vue:556-561）+ 草稿自动清空，无迷路点。
  - 返回链路：X → requestLeave（脏表单弹「保留/放弃」modal，post.vue:430-462；空表单直接返回已证实 VP09）→ `leave()` 栈>1 navigateBack，兜底 reLaunch 村口 index（post.vue:464-472）——深链直进场景不会困死；村口 index 为社区二级页，任意页 2 步内回 tab 成立。
  - 风险提示：①「发布成功」端到端路径在本轮自动化**未证实**（VP03/VP04/VP27 全部因自动化器 `el.input is not a function` 无法写入输入框而 FAILED，属工具限制而非页面缺陷，页面 maxlength/回退逻辑代码在 post.vue:510-514）；② 草稿落盘/恢复（VP06-08/10）、话题/位置/可见范围弹层内容交互（VP15-18/20-22）、图片九宫格（VP24，需相册授权）、输入边界（VP26）同样因工具限制未验证——上述均**未运行**，不能记为通过；③ 用户填了位置/提及后若不细看，感知不到这两项提交后被丢弃（见 functionGaps 1/2）。
- **functionGaps**：
  1. **位置输入全链路静默丢失**：页面收集位置（快捷 chips＋自定义输入＋草稿持久化，post.vue:82-83、116-127、326、392），但提交 payload 不含 location——createTopic 仅 title/content/images/tags（post.vue:516-521），createPost 仅 categoryId/title/content/images/tags/visibility/targetType/targetId（post.vue:523-538）；store 签名无 location（stores/village/index.ts:416-430），API 请求体无 location（stores/village/api.ts:203-247），PostItem 无帖子位置字段。用户选「北京大学·未名湖校区」发布后位置消失且无提示。→ fix：createPost 链路增补 location 字段并在帖子卡/详情展示；若后端短期不支持，发布时 Toast 明示「位置暂不随帖保存」或隐藏该入口。
  2. **提及好友为纯文本装饰**：insertMention 仅在正文末尾追加「@」字符（post.vue:129-133，toast 自述「请输入昵称」），无好友选择器、无 @ 解析、无通知链路（全端 grep 无 mention 解析实现；detail.vue 评论区同款轻量实现）。理想图「提及好友」行语义是被提及好友。→ fix：接好友选择弹层并在发布时解析为 userId 列表触发通知；短期至少在文案上降级为「插入 @ 符号」避免误导。
  3. **视频发布缺失**：理想图工具栏首项「图片 / 视频」；实现仅 `uni.chooseImage`（post.vue:272-287），全页无 chooseMedia/chooseVideo。→ fix：改 chooseMedia 支持 video 或明确产品裁剪并同步改理想图口径。
  4. **圈子目标发帖无话题**：理想图目标卡为「摄影圈」且「添加话题」行并存（圈内成员可见＋已选 0/5）；实现为规避后端 CreateTopicRequest 无 tags（circle.ts:531-541 real 请求体仅 title/content/images，P0-12 注释）而隐藏圈子目标下的话题入口（post.vue:777-789 v-if `!isCircleTarget`，VP19 证实隐藏生效）。属后端能力缺位导致的功能裁剪。→ fix：后端 CreateTopicRequest 扩展 tags 后放开入口；维持现状则需在理想图/契约中确认该裁剪。
  5. **目标弹层圈子列表静默截断 8 个**：`circleStore.circles.slice(0, 8)`（post.vue:691），无「更多」入口或截断提示，用户加入圈子 >8 个时第 9 个起无法被选为发布目标。→ fix：滚动列表全量展示或加「查看全部圈子」入口。
- **verdict**: **基本达标** —— L1–L4 结构与理想图一致或为超集增强，核心「写内容→发布」路径与空表单拦截/防连点/关闭兜底已获交互证据；但发布成功端到端未证实（工具限制），且存在 4 项 P2 功能缺失（位置丢失、提及装饰、视频缺失、圈子话题缺失）。

## 交互证据清单（exec-results.json S05-village，VP01–VP34）

| 用例 | 状态 | 证据摘要 |
| --- | --- | --- |
| VP01 冷启动首屏 | EXECUTED | `.post-header__submit--disabled:present`；截图超时 |
| VP02 空表单发布拦截 | EXECUTED | toast「请输入内容」；after 截图 70473B＋wxml |
| VP03 仅标题发布 | FAILED | 自动化器 `el.input is not a function`（工具限制，未验证） |
| VP04 仅正文发布（标题回退首行） | FAILED | 同上，未验证 |
| VP05 连点×5 防重 | EXECUTED | 5×拦截 toast，无 posts 变动 |
| VP06 草稿防抖落盘恢复 | FAILED | `element not found: __CAND__`（工具限制，未验证） |
| VP07/08 X 关闭保留/放弃分支 | FAILED | input 前置失败致弹层未触发（未验证）；after 落回村口 index |
| VP09 空表单 X 直接返回 | EXECUTED | 无弹层直接返回 |
| VP10 重复进出×3 | FAILED | `navErr:Uncaught` ×3＋input 失败（工具侧，未验证） |
| VP11 目标弹层打开 | EXECUTED | tap `.post-to__card` 成功；截图超时 |
| VP12 选校园圈联动 | SKIPPED | 不可自动化 |
| VP13 选回个人动态 | EXECUTED | 卡片联动 |
| VP14 弹层遮罩关闭 | FAILED | 未先开弹层 `.post-target-sheet` 不存在（编排缺陷） |
| VP15-18 话题弹层系列 | FAILED/SKIPPED | `__CAND__` 文本查找失败（弹层未开，工具限制，未验证） |
| VP19 圈子目标隐藏话题入口 | EXECUTED | after 截图 56988B |
| VP20-22 位置/提及/可见范围弹层 | FAILED | `__CAND__` 查找失败（未验证） |
| VP23 四弹层三路关闭 | SKIPPED | 不可自动化 |
| VP24 图片九宫格＋上限 | FAILED | 相册授权不可自动化（未验证） |
| VP25 移除图片 | SKIPPED | 不可自动化 |
| VP26 输入边界 20/500 | FAILED | input 工具限制（未验证） |
| VP27 emoji/多行发布 | FAILED | input 工具限制（未验证） |
| VP28 清空后回落 disabled | FAILED | input 工具限制；初始 disabled 态由 VP01 证实 |
| VP29 ?circleId=8 → createTopic | EXECUTED | **但 route options={}（未带参）**，wxml 显示「个人动态」——深链分支未真实触达，未验证 |
| VP30 ?target=campus 归位 | EXECUTED | route options={}，observe-only，未带参 |
| VP31 无效 circleId 兜底「兴趣圈帖子」 | EXECUTED | route options={}，未带参；兜底逻辑代码在 post.vue:150-157 |
| VP32 吸底工具栏不遮挡 | EXECUTED | pageScrollTo top/bottom |
| VP33 发布失败 Toast | EXECUTED | 命中的仍是空表单拦截分支，真实失败分支未触达 |
| VP34 X 热区 64rpx 核查 | EXECUTED | observe-only，未出裁决（留交互侧） |

## 结论

页面结构与理想图高度还原（结构达标），交互防御链（拦截/防重/关闭兜底/弹层分组）有实证；功能面对照理想图有 4 项 P2 缺失与 1 项 P3 边界缺陷，全部立为 Function issue（见 findings/SUBPACKAGES-VILLAGE-VILLAGE-POST-req.json）。发布成功端到端、草稿、弹层内容交互、图片、深链带参共 17+4 项未获本轮自动化证实，已如实标注「未验证」，不作为缺陷定罪依据，建议下轮以 uni.input 桥或手工脚本补测。
