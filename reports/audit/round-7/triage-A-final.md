# 执行轮失败分诊（round 权威件：reports/audit/round-7/exec-A-mock-final/exec-results.json）

- 权威件快照：round=round-7-A-mock-final gitSha=e4495d67 updatedAt=2026-09-27T02:43:12.087Z 行数=1107
- 构建索引：apps/client/dist/build/mp-weixin → 808/808 文件；源码索引：apps/client/src → 745/745 文件
- 守恒：桶合计 1107 == 行数 1107 ✔
- 解析来源：failureReason 0 条 / observed 兜底 0 条；FAILED 行里 failureReason 为空 0 条
- 单字标签（从用例散文里抠出来的残字，几乎必是规格噪声而不是产品缺陷）：0 条
- 动作发生时不在用例声明的页面上：74 条；observed 里读不到 top= 也读不到 route[]（判不了）：0 条
- observed 带 `MISMATCH!`（执行器自报前置身份/状态不符）：0 条

| 桶 | 条数 | 含义 |
|---|---|---|
| EXECUTED | 650 | 已通过的行，不参与分诊 |
| SKIPPED-real-band | 236 | 判据要真实后端：本条由 real 带腿（--project mp-weixin-real + 8080 在跑）复测 |
| SKIPPED-vague-action | 73 | action 写了交互动词却没点名可交互元素 —— 判据含糊，缺的是判据不是产品缺陷 |
| SKIPPED-vague-criterion | 34 | 判据既无类名也不要求出帧 —— 没有可观测物件，不能记 EXECUTED |
| SKIPPED-observe-only-slice | 19 | 交互型动作落在 observe-only 切片里 —— 切片配置所致，非覆盖缺口 |
| SKIPPED-deny-irreversible | 15 | 注销/解绑/清空类不可逆动作显式 DENY，为的是保住后面几百条共用的会话 |
| SKIPPED-interact-reststate-absent | 31 | 交互腿下发失败，且同帧探针说类名本就不在静息态 ⇒ 欠前置配方（先展开/先切态） |
| SKIPPED-interact-channel | 5 | 交互腿下发失败，但探针说物件在、元素级动作仍点不动 ⇒ 通道或选择器问题，须人工判 |
| SKIPPED-left-page | 1 | 交互后已离开目标页（LEFT_PAGE），状态量不到 —— 不是产品判红 |
| FAILED-landing-guard | 43 | 导航落在了别的页（页内守卫或路由重定向），元素存在性无从判 —— 每一组落地对须有 booked 复测腿或裁决 |

判据形态未能归类的行数（归在兜底桶里，逐条列在下文）：**0**

## 存在性四格（只统计能恢复出查找目标的定位失败）

| 结论 | 条数 |
|---|---|
| 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） | 36 |

## 落地对（FAILED-landing-guard：每组须有 booked 复测腿或裁决）

| 声明页 → 实际落地页 | 条数 | 处置 |
|---|---|---|
| pages/login/index → pages/discover/index | 26 | 身份带不匹配：mock 带自动登录，已登录态进登录页被守卫送到广场。由 guest 真实带腿复测（exec-guest-real）。 |
| subpackages/vip/index → pages/profile/index | 10 | 已结案：复测腿 GG-vip-index 实测符合裁定（2026-09-27T01:45:25.511Z，档位 real@f0677920） |
| subpackages/vip/bills → pages/profile/index | 5 | 已结案：复测腿 GG-vip-bills 实测符合裁定（2026-09-27T01:45:04.758Z，档位 real@f0677920） |
| subpackages/vip/promo-code → pages/profile/index | 2 | 已结案：复测腿 GG-vip-promo-code 实测符合裁定（2026-09-27T01:45:47.185Z，档位 real@f0677920） |

## SKIPPED-real-band（236 条）

- subpackages/village/village/index（20 条）：VI01、VI07、VI08、VI12；另 16 条
- subpackages/village/village/publish（18 条）：PUB04、PUB13、PUB14、PUB15；另 14 条
- subpackages/village/village/post（17 条）：VP03、VP09、VP14、VP15；另 13 条
- subpackages/campus/campus/post-topic（16 条）：PT01、PT11、PT16、PT17；另 12 条
- subpackages/circles/circles/post-topic（13 条）：CPT03、CPT06、CPT11、CPT17；另 9 条
- subpackages/campus/campus/index（10 条）：CX11、CX12、CX14、CX15；另 6 条
- subpackages/profile-extra/profile/other（10 条）：OT01、OT05、OT06、OT07；另 6 条
- subpackages/profile-extra/profile/tasks（10 条）：TK03、TK04、TK05、TK07；另 6 条
- subpackages/profile-extra/profile/album（7 条）：AB03、AB04、AB06、AB07；另 3 条
- subpackages/profile-extra/profile/favorites（7 条）：FV01、FV03、FV04、FV05；另 3 条
- pages/profile/index（6 条）：PFI03、PFI11、PFI23、PFI25；另 2 条
- subpackages/profile-extra/verification/real-name（6 条）：VRN07、VRN08、VRN09、VRN10；另 2 条
- pages/home/index（5 条）：H17、H19、H30、H31；另 1 条
- subpackages/chat/chat-session/index（5 条）：CS04、CS09、CS10、CS11；另 1 条
- subpackages/market/shop/index（5 条）：MS01、MS03、MS06、MS07；另 1 条
- subpackages/market/wallet/index（5 条）：MW01、MW02、MW03、MW06；另 1 条
- subpackages/campus/campus/hub（4 条）：CH14、CH15、CH16、CH27
- subpackages/profile-extra/verification/index（4 条）：VCI09、VCI10、VCI11、VCI12
- subpackages/profile-extra/feedback/history（4 条）：FHT05、FHT09、FHT10、FHT14
- subpackages/setup/interest/index（4 条）：INT02、INT05、INT06、INT10
- subpackages/market/detail/index（4 条）：MD01、MD03、MD07、MD09
- subpackages/vip/promo-code（4 条）：PC06、PC07、PC08、PC09
- subpackages/vip/bills（4 条）：VB03、VB06、VB07、VB10
- pages/messages/index（3 条）：MSG23、MSG24、MSG26
- pages/nearby/index（3 条）：N25、N26、N27
- subpackages/village/village/detail（3 条）：VD04、VD10、VD15
- subpackages/campus/campus/certification（3 条）：CF04、CF07、CF08
- subpackages/chat/official-chat/index（3 条）：OC08、OC09、OC11
- subpackages/discover/activities/index（3 条）：AC08、AC10、AC11
- pages/register/index（2 条）：REG11、REG26
- subpackages/circles/circles/index（2 条）：CI13、CI07
- subpackages/circles/circles/topic-detail（2 条）：TD03、TD06
- subpackages/discover-extra/likes/index（2 条）：LK04、LK07
- subpackages/profile-extra/profile/location（2 条）：PL03、PL04
- subpackages/profile-extra/profile/privacy（2 条）：PR05、PR10
- subpackages/setup/campus/index（2 条）：SCU02、SCU11
- subpackages/setup/recommend-pref/index（2 条）：RP07、RP08
- subpackages/support/feedback/index（2 条）：FB08、FB13
- pages/discover/index（1 条）：DC11
- pages/login/index（1 条）：LG30
- subpackages/discover-extra/discover/matching（1 条）：MT14
- subpackages/village/village/tag-posts（1 条）：TP04
- subpackages/circles/circles/topics（1 条）：CT06
- subpackages/circles/circles/circle-home（1 条）：CH05
- subpackages/tools/search/index（1 条）：SE08
- subpackages/tools/love-center/nearby（1 条）：LN04
- subpackages/profile-extra/settings/index（1 条）：ST08
- subpackages/profile-extra/settings/dnd（1 条）：DND09
- subpackages/setup/schedule/index（1 条）：SCH11
- subpackages/vip/index（1 条）：VI11

## SKIPPED-vague-action（73 条）

- pages/nearby/index（7 条）：N02、N03、N04、N05；另 3 条
- pages/home/index（6 条）：H02、H03、H24、H25；另 2 条
- pages/profile/index（5 条）：PFI22、PFI28、PFI37、PFI41；另 1 条
- subpackages/campus/campus/index（5 条）：CX13、CX16、CX20、CX26；另 1 条
- subpackages/chat/chat-session/index（5 条）：CS08、CS20、CS23、CS24；另 1 条
- subpackages/circles/circles/index（5 条）：CI06、CI17、CI18、CI22；另 1 条
- pages/discover/index（4 条）：DC08、DC16、DC22、DC29
- pages/messages/index（4 条）：MSG05、MSG21、MSG22、MSG25
- subpackages/discover-extra/discover/matching（3 条）：MT02、MT20、MT21
- pages/register/index（2 条）：REG31、REG32
- subpackages/village/village/detail（2 条）：VD08、VD09
- subpackages/village/village/tag-posts（2 条）：TP06、TP07
- subpackages/village/village/history（2 条）：HS03、HS04
- subpackages/tools/search/index（2 条）：SE06、SE09
- subpackages/profile-extra/profile/album（2 条）：AB08、AB14
- pages/register/success（1 条）：RS13
- subpackages/campus/campus/hub（1 条）：CH22
- subpackages/circles/circles/post-topic（1 条）：CPT39
- subpackages/discover-extra/discover/match-success（1 条）：MS17
- subpackages/circles/circles/topics（1 条）：CT08
- subpackages/circles/circles/circle-home（1 条）：CH09
- subpackages/campus/campus/certification（1 条）：CF10
- subpackages/discover-extra/home/segment（1 条）：SG06
- subpackages/discover-extra/nearby/people（1 条）：PE03
- subpackages/tools/help/index（1 条）：HP06
- subpackages/tools/love-center/nearby（1 条）：LN01
- subpackages/tools/love-center/mbti（1 条）：LM08
- subpackages/profile-extra/profile/tasks（1 条）：TK01
- subpackages/setup/schedule/index（1 条）：SCH12
- subpackages/setup/recommend-pref/index（1 条）：RP11
- subpackages/discover/activities/index（1 条）：AC02
- subpackages/market/wallet/index（1 条）：MW09

## SKIPPED-vague-criterion（34 条）

- pages/nearby/index（7 条）：N10、N16、N23、N28；另 3 条
- pages/profile/index（5 条）：PFI08、PFI20、PFI36、PFI40；另 1 条
- pages/home/index（3 条）：H13、H29、H44
- pages/messages/index（3 条）：MSG14、MSG33、MSG35
- subpackages/campus/campus/index（3 条）：CX02、CX03、CX25
- subpackages/village/village/index（3 条）：VI29、VI35、VI36
- subpackages/village/village/detail（2 条）：VD02、VD20
- pages/discover/index（1 条）：DC37
- subpackages/campus/campus/post-topic（1 条）：PT05
- subpackages/circles/circles/post-topic（1 条）：CPT08
- subpackages/discover-extra/discover/match-success（1 条）：MS16
- subpackages/village/village/post（1 条）：VP05
- subpackages/village/village/publish（1 条）：PUB05
- subpackages/circles/circles/index（1 条）：CI06
- subpackages/tools/love-center/mbti（1 条）：LM06

## SKIPPED-observe-only-slice（19 条）

- pages/login/index（11 条）：LG11、LG12、LG13、LG15；另 7 条
- subpackages/vip/promo-code（6 条）：PC02、PC03、PC04、PC05；另 2 条
- subpackages/vip/index（1 条）：VI03
- subpackages/vip/bills（1 条）：VB04

## SKIPPED-deny-irreversible（15 条）

- pages/register/index（2 条）：REG14、REG18
- subpackages/campus/campus/post-topic（2 条）：PT10、PT26
- subpackages/campus/campus/certification（2 条）：CF02、CF05
- subpackages/tools/search/index（2 条）：SE02、SE11
- pages/nearby/index（1 条）：N30
- subpackages/campus/campus/hub（1 条）：CH06
- subpackages/village/village/post（1 条）：VP07
- subpackages/village/village/detail（1 条）：VD11
- subpackages/discover-extra/likes/index（1 条）：LK08
- subpackages/profile-extra/verification/index（1 条）：VCI05
- subpackages/chat/official-chat/index（1 条）：OC04

## SKIPPED-interact-reststate-absent（31 条）

| 要找的东西 | 页面 | 条数 | dist 命中(本页) | src 命中(本页) | 结论 |
|---|---|---|---|---|---|
| .wechat-input-bar__input「wechat-input-bar__input」 | subpackages/chat/chat-session/index | 6 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .search-bar__input「search-bar__input」 | pages/messages/index | 3 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .keyword-input__field「keyword-input__field」 | pages/discover/index | 2 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .wechat-input-bar__send「wechat-input-bar__send」 | subpackages/chat/chat-session/index | 2 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .chat-header__avatar-wrap「chat-header__avatar-wrap」 | subpackages/chat/chat-session/index | 2 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .swipe-container「swipe-container」 | pages/discover/index | 1 | 4(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .match-actions__label「match-actions__label」 | pages/discover/index | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .post-card__follow「post-card__follow」 | pages/home/index | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .nearby-home__empty--guide「nearby-home__empty--guide」 | pages/nearby/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .nearby-login-guide__btn「nearby-login-guide__btn」 | pages/nearby/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .my-more__cell「my-more__cell」 | pages/profile/index | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .strength__bar--on「strength__bar--on」 | pages/register/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .topic-selector__create-input「topic-selector__create-input」 | subpackages/campus/campus/post-topic | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .wechat-input-bar__icon-btn--emoji「wechat-input-bar__icon-btn--emoji」 | subpackages/chat/chat-session/index | 1 | 1(1) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .composer-bar__lock「composer-bar__lock」 | subpackages/village/village/index | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .post-card__image「post-card__image」 | subpackages/village/village/index | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .emoji-panel__item「emoji-panel__item」 | subpackages/village/village/detail | 1 | 4(2) | 2(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .share-modal__count「share-modal__count」 | subpackages/village/village/detail | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .not-logged__btn--primary「not-logged__btn--primary」 | subpackages/discover-extra/likes/index | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .card--current「card--current」 | subpackages/tools/love-center/nearby | 1 | 2(0) | 1(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .wallet__recharge「wallet__recharge」 | subpackages/market/wallet/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |

## SKIPPED-interact-channel（5 条）

| 要找的东西 | 页面 | 条数 | dist 命中(本页) | src 命中(本页) | 结论 |
|---|---|---|---|---|---|
| .chat-item__status「chat-item__status」 | pages/messages/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .nearby-home__search-btn「nearby-home__search-btn」 | pages/nearby/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .reply-input「reply-input」 | subpackages/circles/circles/topic-detail | 1 | 4(4) | 2(2) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .error-btn「error-btn」 | subpackages/discover-extra/likes/index | 1 | 2(0) | 2(0) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |
| .history-header__btn「history-header__btn」 | subpackages/support/feedback/index | 1 | 2(2) | 1(1) | 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） |

## SKIPPED-left-page（1 条）

- subpackages/tools/love-center/mbti（1 条）：LM07

## FAILED-landing-guard（43 条）

- pages/login/index（26 条）：LG01→pages/discover/index、LG02→pages/discover/index、LG03→pages/discover/index、LG04→pages/discover/index；另 22 条
- subpackages/vip/index（10 条）：VI01→pages/profile/index、VI02→pages/profile/index、VI04→pages/profile/index、VI05→pages/profile/index；另 6 条
- subpackages/vip/bills（5 条）：VB01→pages/profile/index、VB02→pages/profile/index、VB05→pages/profile/index、VB08→pages/profile/index；另 1 条
- subpackages/vip/promo-code（2 条）：PC01→pages/profile/index、PC11→pages/profile/index
