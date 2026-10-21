# R11 落判复核：17 条 P0 的逐条裁定（主代理回源码/回库/回帧，不采信泳道自述）

R11 全 14 张找茬卡交齐：285 条缺陷 / 69 页 / 136 帧，P0=17、P1=56、P2=174、P3=38，
空帧段 0、无批次 0、rejected 0、互斥成立。

级别由泳道判，但**收口门的 P0=0 判点不能建立在未复核的升级上**，故逐条回查。
结论：**13 条成立、3 条不成立（撞在册裁定）、1 条是取景前提产物。**

## 一、不成立的 3 条：R11-L14-D01 / D07 / D13（market 三页整块内容缺席）

泳道判据：`detail/index.vue:306`、`shop/index.vue:285`、`wallet/index.vue:162` 三页在 real 档
只渲染一张「功能封存中」卡，商品/价格/余额/流水 0 像素 ⇒ 判 P0「主操作不可见」。

**判点事实正确，但级别不成立。** 库里实测（`campus_love.app_switch`）：

| switch_key | enabled | description（库内原文） |
|---|---|---|
| `commerce.enabled` | **0** | 商业化总闸：关闭时无视子闸全部付费功能封存 |
| `commerce.vip` | 0 | 会员/VIP 子闸：VIP 购买、自动续费开通、优惠码兑换 |
| `commerce.coin` | 0 | 虚拟货币子闸：钱包充值、交友币扣费、付费内容解锁 |
| `commerce.course` | 0 | 付费课程子闸：课程报名 |
| `commerce.consult` | 0 | 付费咨询子闸：独立咨询报名端点接入时生效（预留） |

⇒ 三页渲染的正是**设计出来的封存态**，不是缺陷。且上一轮同一泳道已判过一次：
`R10-L14` 交件原文「三页同墙的商业化封存策略（ADR-2，属缺功能不属像素缺陷），故本轮无 P0」。
本轮 L14 换了个人判成 P0，属跨轮级别不可比——正是严重度口径进任务书要防的事。

**处置：降级为在册产品范围（不是缺陷，也不进修车波派发集）。**
用户长期约束「不开会员/showcase 旗标」仍然生效，开闸不属本工作流权限。

L14 剩下的 15 条（P1×1、P2×10、P3×4）不受此裁定影响——它们判的是封存卡**自身**的
圆角/内衬/页头底色/返回键热区，那些是真实可修的像素缺陷。

## 二、取景前提产物 1 条：R11-L06-D18（likes/index 整页游客墙）

泳道判据：`likes/index.vue:668` 的 `v-if="!sessionStore.isLoggedIn"` 让整页变成登录墙 ⇒ P0。
该卡自己已写明：「任务书身份前提 A 说『页面未声明门槛』，实测自带游客墙，帧是游客态所摄，与前提不符」。

回帧核实：`subpackages__discover-extra__likes__index__top.png` 确实是完整登录墙
（微信一键登录 / 手机号登录 / 稍后再看），而**同批** `pages__home__index__top.png` 是登录后的正文
（今日推荐真人卡、今日恋爱进度、关系动态、tabBar）。⇒ 不是全局没登录，是**直开子包页时 session store 未水合**。

**处置：不进修车波派发集，改登记为取景前提欠账**——该页需要「先开基底页 → 应用内 navigateTo」
的 `--navto-open` 腿，或在取景前显式水合会话，否则每次直开都会拍到登录墙。
按「判点可采信与否」的口径，这条不是产品缺陷，但**也不许当成已修**：它是一行未取到的真读数。

## 三、顺带查出的载具缺陷：`sessionState.loggedIn` 读数不可信

清单里 71 页有 50 页记着 `loggedIn:false`，但 home 帧明明是登录后正文。
⇒ `sweep-manifest.json` 的 `sessionState.loggedIn` 是**假阴性读数**，不能用它给帧分「游客/登录」档。
本轮 R10 与 R11 的该字段分布完全相同（21/50），所以 R10→R11 的逐帧比对仍然同口径、fixvis 结论不受影响；
受影响的是**任何拿这个字段判前提的下游**。已登记，修载具时要用帧内容而不是这个字段来验。

对照历史：R9 是 65 登录 / 6 游客，R10 起掉到 21 / 50 ⇒ 这是一次**未被归因的口径漂移**，
R10 那一轮的部分「模块缺席」类缺陷可能是它的副产物，不能全算产品账。

## 四、成立的 13 条 P0（进修车波派发集）

全部属同一族：**画面上的数字/承诺没有真相源**。这正是用户点名要的「所有数据真实有效」。

| defect_id | 页 | 实测出处 | 为什么是 P0 |
|---|---|---|---|
| R11-L01-D17 | pages/home | `TodayLoveProgress.vue:51` vs `:63/:69` | 帧上「1/4项完成」+进度条 25%，同模块两格却是白对勾「已完成」⇒ 自相矛盾的假计数 |
| R11-L04-D01 | circles/topics | `topics.vue:266-269` `5+(seed%8)` | 按圈 id 字符哈希现算「等 N 位朋友已加入」，无 useMock 守卫、real 档照编；同圈在 circle-home 读作 12 ⇒ 两页互斥 |
| R11-L04-D15 | campus/hub | `hub.vue:87-102` | 四张学校卡的三行数字全是前端按校 id 写死的字面量表，表外学校一律回退同一组 1.0k/8k/120 |
| R11-L06-D01 | discover/match-success | `match-success.vue:50` | 昵称槽位直出开发者兜底串「对方昵称加载失败」⇒ 把内部提示当用户名渲染 |
| R11-L07-D01 | likes-visitors | `:85` 取 `likedBy.length` | 游客态概览三格 0/0/0，Tab 角标却挂「1」（mock 人格池）⇒ 假计数且与同屏矛盾 |
| R11-L08-D18 | love-center/nearby | `CardSwiper.vue:355` + `constants/match.ts:92/95/98` | 「80% 匹配」＝常量算式，共同圈为 0 时读数恒等于裸底数 80 ⇒ 假兼容度。**这条同时指回我上一轮的裁定**：修 MatchSuccess 时我把 `matchScore` 当作"真值"接了过去，而它本身就是这个算式的产物 |
| R11-L09-D01 | love-center/consulting | `consulting.vue:50-61` | 三档价目与三门课、三位讲师全出自前端常量表，页面不请求课程接口、报名只弹 toast；而 `commerce.course=0` ⇒ 一张不可成交却装作可下单的价目表 |
| R11-L09-D13 | profile-extra/verification | `verification/index.vue:136` + `zh-CN.ts:3401` | 承诺「匹配概率提升 1.5 倍」，后端 `RecommendationRanker.java:615-616/690-691` 只透传认证字段、全仓无认证倍率实现；同仓另一处同义文案还写着「2 倍」⇒ 用不存在的回报换姓名+学号+学生证 |
| R11-L10-D03 | profile-extra/profile/other | `PublicGallery.vue:36` `DEMO_PHOTOS` | 「生活瞬间」四格逐格同序命中竹林/鹈鹕/麦田落日四张活动与商品装饰图，而该账号 photoGallery 为空 ⇒ 把素材当本人生活照 |
| R11-L11-D15 | chat/chat-session | `:980 if(!sessionId) return 1` | 会话未解析成功的错误态，页头仍断言「认识 1 天」+「离线」+ 固定第三人头像 ⇒ 无会话却编关系数据 |
| R11-L12-D15 | setup/recommend-pref | `SetupProgress.vue:67-72` | 步骤表里没有「时间安排」这一步，而真实链路是 profile→campus→schedule→recommend-pref ⇒「第 3/4 步」是假计数且号位张冠李戴 |
| R11-L13-D16 | legal/privacy | `config/legal-texts.ts:142` `new Date()` | 合规页「最后更新：<今天>」是渲染当天现造的，不是政策修订日期 |
| R11-L13-D19 | legal/agreement | `LegalTextPage.vue:139` | 同根因第二处：唯一能揭穿"这是本地兜底文本"的 `version:"local-fallback"` 药丸被主动抹成空串，注释理由「避免误导用户」实际效果相反 |

## 五、对上一轮我自己裁定的更正（必须记，否则会复发）

修 R10-L06-D01 时，我把匹配成功页的假分数改成绑定 `props.matchScore`，理由写的是
「它由 `view-models/match.ts:40` 从 `commonCircleCount` 派生，是真值」。
R11-L08-D18 证明这个说法只对了一半：`computeMatchScore = min(98, 80 + n×5)` 的**底数 80 是常量**，
共同圈为 0 时它照样报 80%。所以那是"由真信号偏移出来的数"，不是"真值"。
⇒ 修车波要把 MatchSuccess 与 CardSwiper 放在同一批里一起判，别只修一处留下另一处。
