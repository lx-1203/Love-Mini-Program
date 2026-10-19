# 本轮改向时挂起的条目（parked，不关闭）

本轮靶子由用户改写（从「VI34 一条判据的配方」改成「整个小程序逐页真机保真 + 至少三轮修复」）。
下面这些条目**原样保留、状态不改、不销账**，只登记「本轮没在做它们」以及为什么。
所有计数都是用**消费方自己的谓词**现数的，不是我抄散文数字。

| 项 | 出处 | 现数 | 本轮状态 |
|---|---|---|---|
| 开放行 openRows | `openrows-blockers-v38.json` → `openRowCount` | **48** | 保留（本轮新增的保真缺陷另立册，不并进这 48 行） |
| 待裁条目 status=open | `decisions-v38.md` 块内 `^\s*RULING id=` + `status=open` | **28**（块内 RULING 行共 44） | 保留，未裁 |
| 其中 half_closed / closed | 同上块尾行 `PENDING_RULINGS_END` | 7 / 9 | 不动 |
| 覆盖欠账 | 同上文件 `coverageDebt`，band=`real@f0677920` | uncovered 5 ｜ voided 4 ｜ expired 1 | 不动（本轮帧只落 `tmp/qa/frames`，不喂 exec 台账，覆盖账不可能被像素虚增） |
| 行阻塞分布 | `blockers` | reverify 18 ｜ code 16 ｜ decision 5 ｜ probe 3 ｜ unverified 2 ｜ UNCLASSIFIED 2 ｜ backend 1 ｜ frame 1 | 不动 |

## 本轮顺手查出的一条溯源缺陷（要修，但不属保真范围）

**待裁菜单少印一条 open 条目。** 名册 `status=open` 共 28 条，编号
`decisions#30 … decisions#69`；而 `ruling-menu-v38.md` 只渲染 №30–№68（全文 `№69` 命中 **0** 次，
标题自述也是「27 条」）。少的那条是：

```
RULING id=decisions#69 status=open
title=Q1（RESHOOT-CREDIT）守卫弹回造成的 FAILED 算不算量到
options=(a) 接受：FAILED 也是 JUDGED，弹回本身是被量到的产品事实，PC06/VB10 继续抵账（现 COVERED=198）
        |(b) 不接受：这两行退回未取证并删除该腿目录（回到 196/3）
        |(c) 接受但分档：抵账照计，行上另标 guard-bounce，使绿不被读成功能已验
```

后果不是数字难看：**这条恰好是要用户拍的 Q1**，菜单没把它送到用户面前，用户就没有裁到它的可能；
而覆盖账上那 2 行仍在按 (a) 的口径抵着 COVERED。与本表 #26（Q1(c) 重做：把 guard-bounce 标记接到认领路径
并配能红的负例）是同一条欠账的两个面：菜单漏印 ⇒ 裁不到；未接认领路径 ⇒ 裁了也落不下去。

修法（留给下一程，本轮不顺手改，因为改菜单渲染会重排用户已答过的编号）：`emit-round-bill` 的菜单渲染
谓词与名册 `status=open` 的行数做一次守恒比对（`菜单打印数 == 名册 open 数`，不等就判红并点名缺的 id）。

## 任务清单里挂起的三条

- **#11 反馈工单页在后台导航里被隐藏**：属产品方向，需用户拍；本轮保真审计会在 §4 目标功能清单里
  如实标注该页在小程序侧/后台侧的可见性事实，但**不擅自合并或改动导航**。
- **#26 Q1(c) 重做**：见上一条（与 `decisions#69` 同一条欠账）。
- **#27 VI34 七态前置配方**：原计划。本轮取景会对「圈子/广场」页拍到真实状态，
  但**七态注入（空态/Disabled/错误态）不属保真取景**，配方那条腿仍未接进任何载具
  （`--recipes` 在两个载具里点名数实测为 0）。条目原样留着。

## 用户长期约束（本轮同样遵守，逐条）

不合并并存的两个发布页；不开会员/showcase 旗标；不把回复长度上限抬到服务端值；
不动 11 个 CRC32 不符的历史迁移；不删任何 `.bak-20261014-rot`；不做 repo-wide restore 或 broad add；
设备腿证据件永久 untracked；未经明说不 push（push 前先做一轮 security 扫描）；
凭据只回显长度/前缀，绝不打印值；DB 写必须先备份 + ROLLBACK 预演。

本轮已按约执行的两处实例：`prune` 删 64 个文件前先 `cp -a` 到 `archive/prune-backup/real-<stamp>/`；
被我误触发的 plan 覆写的跟踪证据件先留 `.pre-import-accident-*.bak` 再**逐文件**从 HEAD 恢复，没有做目录级 restore。

## R2b 这一发查出来的六件事（登记，不在本轮内自行销账）

| id | 现象（实测读数） | 类别 | 本轮怎么处置 |
|---|---|---|---|
| D-N01 | `pages/login/index` 在登录身份 A 下**拍不到自己**：帧落点读成 `pages/discover/index`，且与寻觅页帧逐字节同图（191,452B / sha16=0b7373c4）。源码依据 `apps/client/src/pages/login/index.vue:87` 的 `if (sessionStore.isLoggedIn && !autoForwardedToMain) { … uni.switchTab("/pages/discover/index") }` | 规则相撞（要用户裁） | 本轮的取景裁定是「A 扫全部页，B/游客只扫 tabBar 页」，而覆盖判据要求 71 页各有自己的帧——**这两条对登录页互斥**。(a) 给登录/注册单开一发 B（未登录）取景，覆盖判据仍按 71；(b) 把登录页从覆盖分母里降级为「身份不可表达」，与 IDENTITY_BLOCKED 同列。我按 (a) 先做（不改分母、不豁免判据），但这是**偏离原裁定的动作**，须用户确认口径 |
| D-N02 | `subpackages/discover-extra/discover/matching` reLaunch 后落点 `pages/discover/index`（191,469B）⇒ 这页要**正在匹配**的状态才进得去，身份轴表达不了它 | 需新建（前置状态入口） | 记为落点不符、不计覆盖；进 §4 目标功能清单：要么给 QA 一个"进入匹配中"的入口/参数，要么裁定它只能由寻觅页流程内触达 |
| D-N03 | 我给账本加的身份派生第一版把 `isLoggedIn` 之后 240 字内出现 `switchTab` 就判"登录即转发页" ⇒ **pages/home/index、pages/discover/index 被误标成游客页**（3 页误标，分母 66→写错）。改成"同一条 `if(isLoggedIn&&…)` 块内"之后：转发页=1（只有登录页），tabBar A+B 回到 5 | 仪表缺陷（本轮已修） | 判点从"邻近"改成"同块"，并打印 `LEDGER_GUEST_ONLY` 逐条点名依据。假阳性是我自己量出来才发现的，不是泳道报的 |
| D-N04 | `derive-baseline-ledger.mjs --out` 只按目录实现，传 .json 路径时 `mkdirSync` 撞在已存在的**文件**上抛 `EEXIST`，长得像权限问题 | 仪表缺陷（本轮已修） | 按后缀取父目录建；派生重跑 `BASELINELEDGER_RESULT=PASS routes=71 守恒=yes` |
| D-N05 | 取景腿正式拍的帧**从没写过 `landingVerified`**（只有 --resume 分支写）⇒ 清单里 14/14 路由 `landing=null`，resume 的跳过条件恒不成立（补跑不收敛，每次全重拍），收口门也读不到落点证明。R2b 实测 18 张帧全是 `-` | 仪表缺陷（本轮已修） | 正式分支补 `landingVerified`，并加路由级 `landing`/`landingVerified` 汇总；落点读数不再只活在 stdout |
| D-N06 | automator WS 成片超时的**根因已量到**：WS 的 `App.captureScreenshot` 每拍一张就在应用 `USER_DATA_PATH` 里留一个 `safeimg-<n>.jpg`，攒够就把整条截图流水线卡死，先报 `saveFile:fail exceeded the maximum size of the file storage limit`，之后全是 `timeout waiting for automator response`。探针实测：清之前 `before=108 / 599,890B`（还混着历史设备腿的 `devleg-*.jpg`），重启自动化实例 + 清空之后 `before=2`（含 `safeimg-483455531.jpg`）→ 当场补拍成功 9,652B。`getSavedFileList` 在这里是误导性读数（返 0，而目录里有 108 个文件） | 仪器缺陷（本轮已修） | 取景腿加 `cleanUserFiles()`：预热前清一次、每 8 张清一次、单张失败后先清再重试（重试上限 2→3）。`scripts/qa/probe-saved-files.mjs` 是这件事的能红探针（清理后补拍不成 ⇒ exit 1，"根因不是这个"就写在退出码上） |
| D-N07 | 我自己造成的设备事故：为了排查上面的卡死，我调了 `close_project_window`，**把 9420 那条自动化通道整个打死**（`Failed connecting to ws…check if target project window is opened with automation enabled`）——这正是 `real-tour-cli.mjs:5-8` 记过的那个不可 CLI 恢复的口子。恢复靠 `ws-channel-up.mjs`（它自己会重架自动化实例：`WS_UP=OK port=9420 ownerPid=13356`，且 `WS_UP_BAND_RESULT=match` 证明架回来的是 real@f0677920 那一档） | 仪器操作纪律（已恢复） | 教训入册：`close_project_window` 不是"重开窗口"的同义词，它是拆通道；要刷新画面只用 `open_project_window`（reuse 语义）。恢复动作点名 `ws-channel-up.mjs`，别新造第二套 |
| D-N08 | 在册口径「CLI 出图 193×413、2.6s/张，automator 378×814 ⇒ 禁止跨 harness 比像素」**两处与今测不符**：本轮同一台 IDE 上 `simulator_screenshot` 回 `{imageWidth:378, imageHeight:814}`、耗时 10.1/11.3s；而且它写出的文件**扩展名是 .png、内容是 JPEG**（magic=`ff d8 ff e0 … JFIF`，31,196B） | 文档过期 + 落盘格式与名不符 | 不据此解禁跨 harness 比对：**编码不同就已经不可比**（JPEG 有损，逐字节/内容 hash 与像素级色值都会漂），"禁比"这条裁定的结论仍成立，理由要换成"编码"而不是"分辨率"。取景仍钉在 WS/PNG；`verify-fix-visibility` 的 pngjs 路径遇到 CLI 帧会读错，所以帧目录里不许混进 CLI 件（本轮没混） |

## Phase G 写回环：判点跑通了，但它照出两件产品事实（登记，不自行销账）

`ROUNDTRIP_RESULT=PASS created=396 fields=5/5 torn_down=yes conserved=yes`，
备份 `database/backup/qafid-R2b-20261018T191822.sql`（142,272B，posts 表，口令经 MYSQL_PWD 传不落命令行）。
过程里量到三件此前不知道的事：

| id | 实测 | 性质 |
|---|---|---|
| D-N09 | `DELETE /admin/forum/village-posts/{id}` 是**软删除**：撤后按同一 id 回读仍 HTTP 200，`status="deleted"` | 需用户裁：审计留痕可以是理由，但"删除"在后台列表里到底该不该继续计数，是产品口径 |
| D-N10 | 后台列表 `total` 把 `status=deleted` 的行算在内：连跑三次往返，347→348→349→350，而客户端 `total` 恒为 269 | 与 D-N09 同源的产品事实；后台计数与客户端计数不同尺，任何"两边总数对齐"的判据都不可能成立。我的收口判据已改成**只要求撤后该行不再是活行 + 客户端计数回原**，后台差如实报出 |
| D-N11 | 两端字段**键形不同**：客户端把作者放在 `author.userId`（嵌套），后台放在 `authorId`（平铺）；`status` 只在后台一侧（客户端契约里没有治理字段） | 仪表缺陷（本轮已修）：原版按同名硬比，报成"字段对账 2/6"，看着像同步坏了，其实是我的对账表没有别名。改成别名映射后 5/5 |
| D-N12 | 往返判点的输入自己也会造红：`title` 有服务端长度判点（5..30），我第一版把整枚 UTC 戳拼进标题 = 31 字符 ⇒ `400 Validation Failed`，长得像"链路不通"；另外 `MYSQLDUMP` 缺省值写成 git-bash 的 `/d/...`，Windows 上 Node 的 existsSync 恒 false ⇒ 这道"没备份不许真写"的门**因路径方言而恒红**（fail-closed 方向对，理由是假的） | 仪表缺陷（本轮已修） |

**残留**：为证"删得掉"而产生的 3 行软删帖 `id=394,395,396`（status=deleted）仍在 posts 表里，
按 D-N09 的语义它们不会从后台计数消失。要不要真删（`DELETE FROM posts WHERE id IN (394,395,396)`）
是改数据的动作，我没有擅自做；备份已在 `database/backup/`，语句可回滚。

## 修复三批判"没修成"的部分（跨车道与跨端边界，逐条留名不糊）

| 项 | 卡住的根因 | 该谁做 |
|---|---|---|
| 中心 tab 的圆盘与标签 | `components/layout/TabBar.vue` 实测**没有任何 importer**（`pages.json` 里 `tabBar.custom:true` ⇒ 小程序走 `custom-tab-bar/index.wxml/wxss`）。标签已在 index.js 改成「匹配」，但圆盘视觉要改 wxml/wxss；同时 `config/navigation.ts:51`、i18n `tabs.discover`、`pages.json:425` 三处仍写「寻觅」 | 需一车道同批改 custom-tab-bar 的 wxml/wxss + 三个单一来源，**否则这条在真机上等于没修** |
| `--tab-bar-total-h` 双算 safe-area | token 本体在 `theme/design-variables.scss:462` 里 `env()` 写了两遍；各消费页（messages/publish 等）只删了自己那一份 | 与上表 D-N01 同属"同批还是分票"的待裁项 |
| `MyMore` 四个图标 + mascot 一组 | 素材文件在盘上但 `config/images.ts` 没有对应 `IMAGE_PATHS` 注册；而真档的 `prune-unreferenced-static` 会把整个 `assets/images/mascot/` 裁掉（实测真档 static 下 65 个文件里没有该目录） | 改 `config/images.ts` 的登记，另需核裁剪保留集是否按引用扫（prepare-static 已加 `--scan src`，但这一类是"注册缺失"而非"扫描漏"） |
| 兴趣标签的理想配色 | `InterestTag` 的 variant 在别的车道文件里 | 下一批 |
| 他人主页真实数据下的两行 | `online` / `distance` 后端 `UserProfileDTO` 没有字段；`commonInterests` 是 `List<String>`，副标题靠客户端 `"tag/subtitle"` 约定拆 | 后端加结构化 `commonPoints[{title,subtitle,icon}]`；本轮**没有编数据糊上**，缺就渲染明确占位文案 |
| `PublicMoment.vue:39` 空数据仍隐藏"最近动态" | 不在 FX3 可写集 | 与 B30 同页批次的下一轮 |
| publish 的位置选择器（R2b-L03-D16） | 要 `uni.chooseLocation` + 后端 location 字段 | 需新建目标功能，已进 §4 清单 |
| CommunityFeed 的 4 条（图格/工具图标/相对时间） | 根因分别在上游 view-model（每帖只发一张图）、`utils/media.ts` 的 `resolveMediaUrl`、`theme/global.scss` 的网格几何，均不在单页可写集 | 单开一条"素材解析"车道：这也是一条系统性缺陷（多个页的图标在真档下渲染为空白），不该按页修 |

## R3 复拍：改动可见性当场判红 12/24 帧（这一条比"修了多少"重要）

`FIDELITYSWEEP_RESULT=PASS 本跑 targets=12 全落帧且落点已验 band=real@f0677920`，reattach exit=0，
构建在前（`RELEASECHAIN_RESULT=PASS steps=13`、`ENVCHECK… git=ac7805e0`），取景在后，链路顺序是对的。
可是 `FIXVIS_RESULT=FAIL fixNotVisible=12（含时钟污染 12）`：24 张帧里 12 张**内容区逐像素与 R2b 一模一样**，
只有状态栏在走。按页点名：

| 页 | 未上屏的帧 | 对应批次 |
|---|---|---|
| subpackages/village/village/detail | top + bottom | R2b-B31（含那条 P0 滚不动：给 scroll-view 补 min-height:0/overflow-y） |
| subpackages/village/village/publish | top + bottom | R2b-B32 |
| subpackages/profile-extra/profile/other | top + bottom | R2b-B14…B21 + B30 整组他人主页 |
| subpackages/circles/circles/index | top + bottom | R2b-B28（FX6） |
| pages/home/index | bottom | R2b-B02…B09 |
| pages/nearby/index | top | R2b-B25 |
| subpackages/campus/campus/hub | bottom | R2b-B26（FX6） |
| subpackages/circles/circles/circle-home | top | R2b-B27（FX6） |

最刺眼的一条：**village/detail 的 P0 滚不动修了没生效**——那正是这条判据存在的理由。
若没有内容区哈希，上一程我会拿着"整文件哈希变了"宣布修好，而那 100% 是时钟。

下一步只有两条正路，不能靠改判据自解：
① 先排除仪器/构建侧（产物里到底有没有这批改动：查编译出的 wxss/wxml 是否含新规则；
   以及 IDE 是不是又吃了缓存）；② 排除后再判"修得不对"，把整批缺陷重开。
在此之前，R2b 修复批次的**已修数不写进任何"完成"口径**。

### 12 张未上屏帧的归因（第一版结论我自己证伪了，留下错与对的 trace）

产物侧先排除"没编进去"，五处实测为**已在产物**：
detail.wxss 含 min-height:0 + overflow-y:auto；publish.wxss 含新类 publish-to__tag--neutral；
circles/index.wxss 含 circle-card__action-text；other.wxss 里被删的 other-more- 前缀已不存在；
nearby/index.js 里 tabCircles 与 hotCircles 并存。

我先前写的 A 类（"页面内容在 scroll-view 里 ⇒ pageScrollTo 滚不动"）**被 R3 自己的数据证伪**：
R3 清单里 discover / nearby / circles-index / hub / circle-home 的 top≠bottom（内容区哈希不同）
⇒ 这些页走的是页面级滚动，滚动确实发生了。A 类只成立在两页：detail 与 publish
（主内容容器就是那个 scroll-view，R3 里它们 top/bottom 仍然逐字节相同）。

| 类 | 帧 | 证据 | 性质 |
|---|---|---|---|
| A 仪器滚不动 | detail 2、publish 2 | 主容器是 scroll-view，R3 内 top/bottom 仍相同 | 取景腿判点缺陷：pageScrollTo 只滚页面；要证"滚不动"得驱动组件 scrollTop 或走 automation_element_action scrollTo |
| B 未达分支 | home bottom、hub bottom、circle-home top | 同页 top 变了、bottom 没变 ⇒ 改动集中在上半屏或当前数据态不渲染的块 | 判据没错，但"用哪帧证哪条缺陷"没对上；需在能触发该分支的数据态重拍 |
| C 待判：渲染陈旧 | nearby top、circles/index 2、other 2 | 改动已确认在产物里，帧却与 R2b 逐字节相同；other 那组是"页底色 token 换值 + 删掉整枚悬浮按钮"这种不可能看不见的路子 | 未定。一发就能二选一：整台 IDE 重启后重拍这三页——变＝R3 吃的是陈旧渲染（reattach 不足以刷新这几页）；不变＝改动被别处覆盖 |
| D 真没修 | hub 的 .campus-hub__more-arrow 孤儿规则仍在产物里 | FX6 在 150 轮上限处停在半句调用上，D18 本该处理它 | FX6 半成品，按未闭合记 |

other 的渲染链已核：other.vue:23 引 ProfileShell，产物 other.json 的 usingComponents 里确有 profile-shell，
ProfileShell 再引 PublicProfile / PublicCommon / PublicGallery
⇒ 我先前那句"被修的公共组件不在该页 usingComponents 里"是**只查了一层**造成的误判；
嵌套一层就在链上，浅查组件图不足以判"改动无效"。

要认的两条：① R2b 报的"这页滚不动"只有 detail/publish 需要按 scroll-view 手段重证，
其余四页是我把仪器行为当成了产品行为；② 判"组件不在渲染链上"必须沿嵌套查到底。

### C 类当场判掉：R3 那 12 张"未上屏"是我的仪表，不是代码（R4 复拍实量）

两点同时成立，都能复现：
1. **R3 吃的是陈旧渲染。** 零源码改动、只把 IDE 整台 quit + 重开 + 重架自动化通道，再拍同样 8 页：
   R3→R4 的逐帧对照 `visible=16 notVisible=0 clockOnly=0` —— 8 页全变。
   ⇒ 开场 reattach（open-project_window 的 reuse 语义）不足以刷新这几页，窗口复用 != 渲染重载。
2. **R2b 的"滚不动"有两条是仪器。** 取景腿改用 Element.scrollTo 驱动页内 scroll-view 后，
   detail/publish/circles-index/nearby 的 top≠bottom（内容区哈希不同、sameAsTop=false）：
   它们本来就滚得动，是 `wx.pageScrollTo` 只滚页面、滚不动组件。

修完这两条之后的真判据：**R2b→R4 `FIXVIS_RESULT=PASS visible=16 fixNotVisible=0 gaps=8`**
⇒ R2b 修复批次的改动确实上屏。此前"已修数不写进完成口径"的限制解除，
但 R3 这一发的 FAIL 读数留档不删：它是"门自己坏掉时把坏读数学成产品缺陷"的标本。

还有一条判据层面的教训：R2b 报的 4 页滚不动里，只有 profile/other 是"页高不足 100vh"这一类
（它没有内层 scroll-view，R4 里 top≠bottom 也仍然成立与否要单独看），其余是把仪器边界当成了产品事实。
凡判"某状态取不到证"，必须先证明**我驱动得了那个容器**，否则记的是仪器缺陷。

## 发布形态的体积缺口（本轮暴露，需产品口径，不属我能拍板）

主包 12.70MB / 微信上限 2.00MB。占量前几名全是**被源码字面量引用的位图**
（campus-arch-landmark.jpg 705KB、circle-studybuddy.png 533KB、campus-rain 406KB…），
不是这次补回来的 219 个图标（753KB，已限定 icons/ 与 svg-spec/ 且单个 ≤64KB）。

此前 `PACKAGE_SIZE_RESULT=PASS 1.73MB` 的真实成因：更早几轮构建已经把 src/static 裁到只剩 129 个文件，
字面量引用的图**已经被删了**，所以"包小"与"图标空白"是同一件事的两面。
HEAD 跟踪 1344 个素材、备份树 27.5MB。

三条候选路，取舍要用户定：
  (a) 大位图走后端 app-assets/CDN，并让 utils/media.ts **不再把 app-assets 地址反写成 /static**
      （它现在正是这么做的，等于强制包自带；后端实测 0 个图标、直连 401，需先把资产铺上去）
  (b) 把这些图移进分包（分包上限另算，主包只留首屏必需）
  (c) 资产瘦身（重压缩/降分辨率），代价是画质与理想图的还原度
