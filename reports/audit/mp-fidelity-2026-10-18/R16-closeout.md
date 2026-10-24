# R16 复判轮：收口门八条全中（2026-10-24）＋ 三条必须留档的判据事实

本轮是 R15 找茬波（210 条 / 14 车道）→ R15fix（44 行派单，33 修 / 8 挂账 / 3 证伪）→ 重建 →
R16 复拍 → R16 逐帧复判 的闭环。读数出处全部在文末，不靠本文自述。

## 一、收口门读数（`FIDELITY_CLOSEOUT_RESULT=PASS 判据=8 不中=0`）

| 判据 | 读数 |
|---|---|
| rounds | 盘上 4 轮（R13/R14/R15/R16），4 轮都有 `reattach.exit=0` 重开窗证明（要求 ≥3） |
| coverage | 并集覆盖 68/71，够不着 3（`subpackages/vip/*`，在册禁开会员标记），缺页 0，覆盖门红 0 |
| newdefects | 14 泳道 14 卡齐、136 可用帧零漏审、**P0=0 P1=0** P2=150 P3=64（逐条点名 214 行） |
| fixvis | `visible=32 notVisible=0 clockOnly=0`（比内容区像素、裁顶 40px，不比状态栏时钟） |
| band | `real@f0677920`（与账本 bandStamp 同档） |
| chain | `CHAINSTEPS_RESULT=PASS`（13 步发布链，三步后处理指向本轮产物） |
| carriers | `GATESYNC_ORPHANS=3/基线=3`（本轮没新增门，孤儿不涨） |
| roundtrip | `verdict=PASS conserved=true fields=5/5`，建 id=418 → 两端读到 → 删 → 计数回原，备份 `database/backup/qafid-R16-20261024T033527.sql` |

## 二、R15 那条 P0 是仪器造的，本轮用帧证掉了（不是用话说掉的）

`R15-L09-D11`（可达性 P0）当时的证据是「verification 的 top/bottom 两帧逐字节相同（sha16 `848081a9`），
提交按钮两帧都不在画面里」。**R16 重拍后两帧哈希不同**（top `a41a02542c88c98e`、bottom `c20d9158e3f54bcb`），
bottom 帧上「填写认证信息」表单、「上传学生证」卡与「提交认证申请」按钮全部在画面内（逐项目视过）。
⇒ 成因是取景那一发没滚成，不是产品不可达。R16-L09 卡里把这条例由写进 provenance，行不带走。
留一句给下一程：**同哈希两帧本身不是缺陷**，它是「这一帧没拍到新画面」的仪表读数；
把它判成 P0 之前必须先重拍一次，本轮就是这么把它从缺陷册里请出去的（R3 那次也是同一个坑）。

## 三、`R15-L01-D14`（今日推荐照片墙）从 P1 降到 P2 的完整依据

降级的不是级别，是**成因**——原判定「模板里没有任何缩略图容器 ⇒ 从未渲染」这一条前提被本轮实测证伪了，
所以按新前提重开一条行 `R16-L01-D18`（素材缺失 P2），证据三件：

1. 渲染出口已建：`TodayRecommendationCard.vue:131` 的 `.today-card__gallery` + `galleryPhotos` computed；
   后端 `TodayRecommendationView.photos` 已下发（`HomeController` 记录 + `RealHomeService` 取
   `RecommendedPersonView.photoGallery`，该字段本就在 `PrivacyFieldFilter.ALLOWED_FIELDS` 白名单里、
   且已由 `RecommendationRanker:592-594` 过媒体审核 ⇒ 没有放宽隐私面、没有绕过审核）。
2. 当前候选人确实没照片：实测 `GET /api/v1/home/dashboard` 返回 `"photos":[]`，
   其 userId=100171 的 `user_basic_profile.photo_gallery` 逐字为 `[]`（SQL 实测）。
   组件走「无图整行不占位」分支，**没有伪造占位图**——这是正确行为，不是修得不够。
3. 语料撑不起理想图那一帧：全库 217 个 profile 的图集张数直方图 = `0 张:5 人 / 1 张:211 人 / 2 张:1 人`，
   **没有任何一个用户够得上理想图的 4 张** ⇒ 这条轴在当前数据下不可能出绿帧。

要拿到那一帧只有两条路，两条都不该由前端自己决定，故本轮两条都没动手：
①给推荐池里的演示账号补 `photo_gallery`（真实上传流或具名 seed，属库内数据变更，要先备份、要业主点头）；
②把规范 §3.2 的「4 张」改成「按人数 1–4 张自适应」并同步理想图说明。
这条已进目标功能清单，不是被豁免掉的账。

## 四、本轮帧件跨两发构建，噪声底实测过（别让下一程把「哈希变了」读成「修好了」）

R16 的 24 页复拍跑在构建 A 上；home 那两帧是在补完照片墙出口、重新走一遍发布链之后（构建 B）重拍的。
为证明两发构建对**没改过**的页没有画面差，另起 `R16spot` 目录把 profile / search / village 三页重拍一遍，
与构建 A 的 R16 帧逐像素比：差 1891 / 3036 / 3339 px（满帧 378×814=307,692 px，即 0.6%–1.1%），
bbox 铺满全屏而不是集中在某一块版面 ⇒ 这是采集抖动（页淡入动画 / 亚像素），不是版面变化。

后果必须写明白：**FIXVIS 的 `visible=32` 只是「这些帧没停在改前那一字节」的下界证明**，
它挡的是「改了却没上屏」（`notVisible=0`），它**不**证明「改成对的了」。
逐条落地证明来自 R16 复判泳道——11 条车道逐帧对着新帧核过每一条 R15 修复是否上屏、
是否修到位（L02/L04/L05/L06/L07/L08/L09/L12/L13/L14 各自点名「已落地」或「上一轮修得不够」），
只有画面逐字节没动的 3 条车道（L01/L03/L10，home 除外）把 R15 卡按同哈希原样带过。

## 五、本轮改了什么（代码面）

- 客户端 13 个文件（R15fix 五车道）+ `TodayRecommendationCard.vue`（照片墙出口）。
- 后端 4 个文件：`HomeController`（视图加 `photos`）、`RealHomeService`（取 photoGallery）、
  `MockHomeService`（两处）、`HomeFeedFallbackProvider`（兜底给空数组，不声称有照片）。
- 契约：`docs/openapi/feedback-growth-and-auth.yaml` 加 `photos`，重新生成 `api-types.ts`，
  手写件 `api-types-supplement.ts` 同步；mock fixture 两处给 `photos: []`（不给假 URL）。
- 校验：`vue-tsc` 0 错、后端 `compile` 0 错、home-feed 契约用例 2/2、发布链 13 步 PASS、主包体积 PASS。

## 六、还欠着的（都不阻断本轮收口，逐条点名）

| 项 | 缺什么 | 出处 |
|---|---|---|
| 匹配成功页共同点/匹配度 | 后端 `match_reasons` 与匹配度真值列（§12.3 在册） | R15-L06-D01 未修，只落了无数字空态骨架 |
| 安全页手机号 | `UserSession` 只有 `phoneBound: boolean`，无脱敏号码列 | R15-L07-D21 未修 |
| 恋爱中心服务分区文案 | i18n 键 `home.loveServicesSection` 不存在 | R15-L07-D15 未修 |
| 认证页警示三角配色 | 仓内只有灰 `warning.svg`，琥珀档素材需新建并三树同步 | R15-L09-D10 未修 |
| 今日推荐照片墙那一帧 | 语料里没人有 4 张（见第三节） | R16-L01-D18 |
| 28 条历史裁决 / #11 后台导航可见性 / P5-4b | 业主裁定，不自行执行 | 前几轮在册 |

## 七、下一程要做的事（本轮没做完的，写清楚别靠记性）

1. **载具要重跑**：本轮动了 `apps/api`，`reports/audit/real-e2e/GATES.json` 的 gitSha 章会过期，
   `verify-rulings-landed` 在「有 api 改动 + 距离>0」时判红 ⇒ 提交之后要先具名备份再 re-bake GATES.json，
   然后才跑 `scripts/qa/run-final-verify-v33.sh`。顺序不能反（先跑再提交＝白跑）。
2. 取景腿的 settle：heart-signals 的 bottom 帧在默认 settle 下连三发超时（本轮实测 8000ms 才出帧），
   下一程把这条页写进慢页清单，别把「仪器超时沿用了上一跑帧」当成「画面没变」。
3. R16 的 214 条 P2/P3 是下一轮修车波的输入；派单仍走 `emit-fix-lanes --severity P1` 那条互斥切分，
   比较基准用 `fixlist-R16-dispatched.json`（本轮还没切，下一程切）。

## 八、47 步载具实跑读数（2026-10-24，跑到第 26 步被本机进程额度打断）

载具在离线门段跑完后死于 `bash: fork: Resource temporarily unavailable`（Win32 0xC0000142），
**不是门坏**——设备腿那一段没跑到。离线段的四条红逐条复跑定位如下：

| 门 | 读数 | 定性 |
|---|---|---|
| `prove-gates-can-fail` | 曾 `5/7 + INCONCLUSIVE=2` ⇒ **现 PASS 7/7** | 已修：两条 INCONCLUSIVE 不是它自己的问题，是被 lint 欠账拖住（基线 errors=5/budget=2 ⇒ 两条 lint 负例"基线本就不绿，无法判"）。合并三处重复 `utils/media` 导入后 errors 回到 2，负例全部拿到证据。**没有抬阈值、没有动预算。** |
| `verify-source-shape` | `FAIL 判据台缺席判点不成立（2 条：CS26 CH22）` | **两条性质不同**，见下 |
| `verify-real-coverage` | `FAIL`，守恒 OK（免检28+覆盖198+欠账5+待判4+过期1=236/236） | 5 条欠账全是 `缺=login` / `缺=login+guest` 的**轴欠账**（OT05/OT06/OT09/VRN07/OC09），要的是把这几条用例在真档按登录/游客身份各跑一遍，属设备腿活儿，不是判据坏 |
| `verify-provenance-all` | `FAIL`（STALE=1、UNRESOLVABLE=5、PRE_STAMP=4880 已走在册 LEGACY 豁免、DERIVED_OK=12/12） | 1 条过期戳记 + 5 条断链帧，量小且可逐条定位，属证据侧收口 |

### CS26 与 CH22 必须分开处理（别再混成"一条红"）

- **CS26（chat-session 错误态互斥渲染）＝纯形状漂移，不变量仍然成立。**
  判据钉的是老写法 `<view v-if="pageErrorMessage" class="meta-copy meta-copy--padded">{{ pageErrorMessage }}</view>`
  紧接 `<template v-else>`；盘上现在是 `index.vue:2089` 的 `<view v-if="pageErrorMessage" class="chat-error-state">`
  （内挂 EmptyState）→ `v-else-if loading` → `v-else-if errorMessage` → `v-else` 的 `.chat-list`，
  而输入栏 `wechat-input-bar__input` 全页只有一枚（:2290）且就在最后那个 `v-else` 分支里
  ⇒ **"出错时输入栏结构性不可达"这条不变量没破**，破的只是判据引用的标签/类名/变量名。
  重钉形状是"把纠正落进真相源"，但按本仓惯例要同步 ops 判据台正文并重打语料戳，故未擅自改。
- **CH22（hub「查看更多」禁可点假象）＝产品方向问题，不是形状问题。**
  判据判的是"无展开箭头、无可点动作"的死元素不得回归；盘上 `hub.vue:365-373` 现在是
  `class="campus-hub__more"` + `role="button"` + `@tap="toggleSchools"` + `:aria-expanded` + 条件箭头
  `campus-hub__more-arrow`（`canToggleMore` 为假时挂 `--static` 且不渲染箭头）——
  即它已是一枚**真的折叠/展开控件**，而判据把"有可点动作"本身当禁用写法。
  把它改成"必须绑真实 handler"会比原判据更强，但那是改判据的**实质**，属裁定范围（decisions#N 那条路），
  不自作主张。

