# R10 修车波处置登记（138 行逐条，来自车道交付件的逐条处置行，非汇总自述）

生成：2026-10-22　派单件：`tmp/qa/lanes/R10fix/dispatch-manifest.json`（42 批次 / 138 行 / 42 个互斥文件）
读法：本件只登记**处置声明**；每条是否真的上了屏，由 `fix-visibility-R11.json` 按帧判，不由本件说了算。

## 计数（解析器：在车道交付件里按「行 ID 作主语」定位该条，再在其后 9 行内取处置词）
- 派发 138 行，全部读到处置 = 138/138（读不到 = 0）
- 纯「已修」128　「半修/部分已修」2　「未修」7　「证伪」1
- 越界写 0 处（改动文件 ⊆ 派发文件集）；`BottomActionBar.vue` 在派发集内但一字未动——FXA 按交接件 §11.3 拒了那两张卡。

## 主代理在车道之外补收的 3 条（`i18n/` 不在任何车道的可写集内）
| defect_id | 级 | 车道声明 | 主代理处置 |
|---|---|---|---|
| R10-L08-D18 | P2 | FXJ 未修（源在 `zh-CN.ts:845`） | 已修：`dimensionSN` 中文「直觉/实感」与代码位 S/N 反了（同帧另三枚 E/I、T/F、J/P 都是正序）⇒ 改「实感/直觉」；`en-US.ts:761` 同键同毛病 ⇒ 改 `Sensing/Intuition` |
| R10-L08-D08 | P3 | FXA 未修（源在 `zh-CN.ts:2895`） | 已修：`lock.unlockHintModal` 动词与 `{name}` 之间一枚裸半角空格，同屏主标题「登录后解锁心动信号」却是连写 ⇒ 删空格。`en-US` 那版该空格语法必需，未动 |
| R10-L06-D20 | P3 | FXG 未修（源在 `zh-CN.ts:3704`） | 已修：`discoverHistory.emptyDesc` 中文夹拉丁缩写无空格、整句无句末标点 ⇒ 改「快去寻觅页看看，发现有趣的 TA 吧」；`history.vue:135` 引的 R8 原文已补注，不当现行文案读 |

补收后：未修 7 → 4。

## 主代理补收的 1 处「同根因、无卡」缺陷
FXJ 在交付件里点名：`love-center/mbti.vue:27`、`love-center/nearby.vue:34` 的返回箭头仍吃
`ICONS_COMMON.BACK`（折线 `#94A2B7`），与它已修的 `R10-L08-D09`（`activities/detail.vue`）**同一根因、不同页**，
但**没有对应缺陷卡**，故按「只修有卡的」留下了。两个文件都在 FXJ 的可写集内，改法它已实证。

实算（WCAG 相对亮度，底色的 token 真值取自 `theme/design-variables.scss`）：

| 页 | 页头底 | `#94A2B7` 对底 | 换 `ICONS_V2.BACK`（#333333）后 |
|---|---|---|---|
| love-center/mbti | `--c-brand-500 #36C99A` → `--c-brand-400 #6fe0b0` 渐变 | 1.23 / 1.60 | 6.00 / 7.80 |
| love-center/nearby | 无自底色，落 `--c-bg-page #EEF7F2`（`:127`） | 2.37 | 11.56 |

两页都低于非文本控件 3:1 线 ⇒ 已按同 lane 既有口径换成 `IMAGE_PATHS.ICONS_V2.BACK`。
素材三棵树（`src/static/`、`static-local-backup/full-static/`、`apps/api/uploads/app-assets/`）实测均在盘 ⇒ 硬规矩 7 的同步动作不适用。

## 仍开着的 4 条 P1（本轮不闭，逐条给理由）

### 1. `R10-L04-D11`（P1 / 需新建 / circles/circle-home）——后端缺列，前端不许编
`interest_circle` 全列已核（`apps/api/.../entity/InterestCircle.java:26-72`），**无 `tags` 列**；
discover 包里搜到的 `tags` 全是**用户**兴趣标签（`user_interest_tag` / `interest_tag`），不是圈标签。
卡上的第二方案「按圈 id 映射既有标签库」= 写死演示标签，正面撞在册契约 `MP-R1-CIRCLEHOME-001`
（`circle-home.vue:143-147` 注释自证）。
**缺的列：`interest_circle.tags`。** 属产品缺口，不是像素缺陷 ⇒ 移交业主侧，与在册的
#11 / N2-N4 / A4-A5 / Q1 / #25 同一类。

### 2. `R10-L04-D14`（P1 / 需新建 / circles/circle-home）——缺列且缺接口
置顶公告条无数据源：库里无 `announcement`/notice 列，也无对应端点；「本地圈规常量」同样被
`MP-R1-CIRCLEHOME-001`（`circle-home.vue:149-153`）禁掉。
**缺：`interest_circle.announcement` 或一个独立圈公告接口。** 同上移交。

### 3. `R10-L02-D14`（P1 / 需新建 / village/publish）——半边已修，半边缺列
真实选点器（`uni.chooseLocation`）、三态显示、草稿内持久化、清除入口都已上屏；
**「帖子对外带位置」做不到**：`Post.java` 的 @Column 全表、`CreatePostRequest`、`PostDto` 均无 location/city 列
（`stores/village/types.ts:91` 那个 `location` 属 `ActivitySummaryView`，不是帖子）。
页面已当场明示「位置仅保存在草稿，暂不随本条帖子对外展示」，不假装已发布。
**缺：`posts` 表的地理位置列 + 写入/回读链路。** 这条是三里面唯一可实施的（用户在选点器里选的是真位置，
不算造数据），但它是一次后端 schema 变更 + 迁移 + 三端接线，不属修车波范围。

### 4. `R10-L10-D03`（P1 / 需新建 → **判点前提被推翻**）——卡说缺列，实际两列都在
卡原文：「§3.9 第三行『距离 · 在线』因**后端不下发 distanceText** 恒不渲染且无占位」。
实测该前提不成立：
- `apps/api/.../profile/UserProfileDTO.java:36` 声明 `String distanceText`、`:56` 声明 `Boolean online`；
- `UserProfileController.java:193` 在 `isPublic` 分支里 `distanceText = deriveDistanceText(...)` 真算真发；
- 注释自证规则：查看者未上报坐标、或超 300km 视为 GPS 漂移时**才**给 null。

⇒ 帧上没有「在线」胶囊，是因为后端真回了 `online=false`（**一个真值**），不是缺列。
FXC 只落了该修的那一半（距离行去掉整块 `v-if` 开关、空值落固定占位「距离待更新」），
并**拒绝**了卡建议的 `online: true` 兜底——那正是把真值改成假值。此判定已由主代理回源码复核。
**这条不该再被 R11 计成新缺陷**；要计的是「查看者未上报坐标 ⇒ 距离恒缺」这条真实数据缺口，级别另判。

## 其余 3 条非 P1 的未闭项（如实登记，不挡收口门）
- `R10-L10-D04`（P2）：粉族令牌最深只到 `--c-romance-700`，压 `--c-tint-pink-50` 只有 3.70:1、压 `--c-romance-50` 3.93:1，
  照卡改会把 R9 刚达标的 5.30:1 退回去。**缺 `--c-romance-800`**，而 `design-variables.scss` 不在 FXC 的可写集。
- `R10-L14-D09`（P3）：`wallet/index.vue:389` 已逐字等于卡上建议值 `var(--sp-10) var(--page-padding)`；
  漂移实在 `detail.vue:539` / `shop:732` 的 60rpx 私值，两文件既不在 FXC 也不在本轮任何泳道的可写集。
- `R10-L02-D15`（P2 / 证伪）：卡要求把正文上限对齐到 1000，但
  `reports/audit/round-7/ruling-recommendations-2026-10-06.md:13,39-40`（decisions#7）早已裁定
  「以实现为准改判据＝500，要 1000 另开产品需求单」；且 `MAX_CONTENT_LENGTH=500` 在
  `stores/village/constants.ts:12`（非本车道文件），只改页面会让 501+ 字的发布必败。契约侧
  `docs/openapi/village.yaml` 的 1000 是评论/回复，帖子正文是 5000。**判点不成立，未改。**
