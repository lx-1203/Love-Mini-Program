# R13 落判复核：1 条 P0 + 15 条 P1 的逐条裁定（主代理回 API/回源码/回帧，不采信泳道自述）

R13 全 14 张找茬卡交齐并通过验卡门（豁免修复后）：146 条缺陷 / 67 批，P0=1、P1=17、P2/P3 其余，12 张 CLEAN 卡（4 张一次采信、8 张格式返修后采信）。
本轮是 R12 修车波之后的复拍找茬，帧为新编译产物（取景腿经历「复用窗口旧编译包」仪器事故，杀 IDE 冷启 + sweep 补 session.bootstrap 后重拍，详见交件与 sweep-R13*.log）。

结论：**P0 1 条按 R12 在册先例延展在册（后端种子治理族）；P1 里 13 条成立入修车波、2 条在册（缺后端列/素材）+ 2 条并种子族。**

## 一、P0 1 条：R13-L06-D01（segment 在线列表 9 行种子人格）→ 在册延展，不派修

泳道判据：segment.vue:177 顶帧「在线」列表全是种子人格——4 行昵称剥「演示·」前缀后仍是校名，「浙江大学 · 230km」常量假距离。

复核**事实成立**，但处置循 R12 先例（R12-p0-adjudication.md 第四节 R12-L06-D07）：把种子行变真人只能靠后端种子治理/真实推荐数据源——这与 nearby/people 是**同一份 QA 种子数据集**在同一族页面（segment/home-segment）的另两处渲染。R12 已裁「前端剥前缀已做，再改就是编身份」，本轮若把 segment 列表整块撤掉，与 R12 对 nearby「保留列表+剥前缀」的处置跨页矛盾。
**处置：并入在册「推荐源种子治理」族（后端/运营动作），segment.vue 两处渲染点登记进该在册项的渲染点清单。R14 泳道对同象不重报。**

## 二、成立的 P1 13 条 → 修车波（R13fix）

| id | 页 | 轴 | 修法要点 |
|---|---|---|---|
| R13-L01（nearby） | nearby | 可达性 | PostCard 分享键 noop 死按钮（R1 挂账）：接 uni 分享能力或按 §12 撤按钮 |
| R13-L01（discover） | discover | 位置 | 匹配度环压简介：MatchCard max-width :deep 在 mp-weixin 样式隔离下不生效，改组件标签内联/组件内样式 |
| R13-L02（messages） | messages | 颜色token | 「查看详情›」2.10:1 → 归 secondary/brand-800 档 |
| R13-L02（profile） | profile | 颜色token | 「在线」徽标白字压 #36C99A 2.10:1 → 深墨/浅底档 |
| R13-L03（village/detail） | village/detail | 素材缺失 | 作者行校徽 chip 缺席：campusName 真字段同页 ：1001 已消费，接线即可 |
| R13-L03（circles/topics） | circles/topics | 层级遮挡 | R12 吸顶修复在深滚帧仍缺席（FXD onScroll 方案未覆盖此滚动态）→ 补完 |
| R13-L04（circle-home） | circle-home | 素材缺失 | hero 话题 chips 行缺席：topics 链路有真数据可接 |
| R13-L04（campus/index） | campus/index | 颜色token | 作者名 romance 粉 2.7:1 → 正文墨档 |
| R13-L05（campus/post-topic） | campus/post-topic | 颜色token | 匿名说明 warning 2.01:1 → 提档 |
| R13-L05（campus/topic-detail） | campus/topic-detail | 可达性 | 底栏切换胶囊 57-62rpx → 88rpx |
| R13-L06（history+likes） | village/history, likes | 可达性 | 两页返回钮 72/64rpx → 88rpx（同分包 segment/people 已修，漏改） |
| R13-L07（security） | security | 颜色token | 徽章 brand-600 压未注册 tint 2.62:1 → help 同型已修口径 |
| R13-L11（setup/profile） | setup/profile | 颜色token | 「换头像」徽标 2.10:1 → 深墨/浅底档 |
| R13-L12（feedback） | support/feedback | 颜色token | 选中 chip 白字压 #36C99A 2.1:1 → 浅底+brand-800 字（recommend-pref 同档） |
| R13-L13（activities） | discover/activities | 颜色token | 选中态 brand-700+白字 4.0:1 → brand-800（LegalTextPage 同尺已修口径） |

（行数 15：含 L06 两页返回钮合并一行——实际派修行以 fixlist-R13 批次表为准。）

## 三、不成立的 P1 2 条 + P0 族内 1 条：在册（不派修）

1. **R13-L01（home）**：今日推荐卡缺 4 格相册条——组件只消费单张 photoUrl，四格需后端 photos 数组列 → 在册缺列（与 match-success reasons 同族）。
2. **R13-L06（segment）**：两行共用同一张足球场头像——头像值来自 QA 种子数据 → 并入种子治理在册族（同 P0）。

## 四、R14 找茬预告口径

- 上表修复 + 本裁决在册项，R14 任务书随 fixlist-R13-dispatched + fix-visibility-R14 带出。
- 在册族（种子治理 3 渲染点、home photos 列、R12 延续四条）同象不重报；R14 只报新可测偏差。
