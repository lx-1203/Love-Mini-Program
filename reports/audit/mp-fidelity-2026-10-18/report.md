# 小程序真机保真审计 · 报告（MP-FIDELITY，2026-10-18/19）

## 0. 结论与档戳

**一句话**：构建链现在真的能跑通并产出发布形态的包；71 页逐页取景做到 68 页有可用帧 + 3 页"够不着"有据；
每页至少指出一个问题的硬要求做到 124 条缺陷全部带帧路径+内容哈希+源码行；R1 那批改动经像素复核确实上屏；
前后端↔后台做过一次真实写回环并守恒闭合。**三轮修复没跑完**：算数的轮次目前 1 轮（R2b），
收口门 8 条判据里 6 条 OK、2 条红（轮次不足、末轮仍有新增缺陷）。

| 项 | 实测值 | 出处 |
|---|---|---|
| 产物档戳 | `real@f0677920`（env.js 的 sha256 前 8 位），全程未漂 | `verify-fidelity-closeout` 的 band 判据：OK |
| 取景尺 | automator 378×814（保真比对唯一尺）；CLI 通道实测也出 378×814 但**内容是 JPEG** | parked.md D-N08 |
| 发布链 | `CHAINSTEPS_RESULT=PASS drySteps=15 required=13 负例可红=是` | spawn `verify-release-chain-steps.mjs` |
| 包体（真档实测） | 主包 1.73MB / 上限 2.00MB；总包 2.76MB / 10MB；village 分包 0.19MB | `node scripts/verify-package-size.mjs apps/client/dist/build/mp-weixin-real` |
| loopback 豁免 | `ENVCHECK_RESULT=WAIVED_LOOPBACK carrier=release-chain shippable=no`，产物内 `LOOPBACK_WAIVER.json`（494B，git=6b53921b） | `scripts/verify-env-release.mjs` + 产物文件 |
| 写回环 | `ROUNDTRIP_RESULT=PASS created=396 fields=5/5 torn_down=yes conserved=yes` | `database/backup/qafid-R2b-20261018T191822.sql`（142,272B） |
| 收口 | `FIDELITY_CLOSEOUT_RESULT=FAIL 不中=rounds,newdefects` | `tmp/qa/logs/closeout-latest.txt` |

**这一档不可上传发布**：豁免只放行 https/loopback 两个判点，API 指向 127.0.0.1，
凭证券里明写 `shippable: false`。它证明的是"在座这台机器上跑得通、看得对"，不是"可以发版"。

## 1. 发布链：三个后处理步骤历史上量的是别人的产物

本轮开工前的磁盘证据（`prune-unreferenced-static.mjs` 硬编码 mock 目录、`add-lazy-code-loading` 与
`verify-package-size` 同、编排器从不设 `UNI_OUTPUT_DIR`）意味着**此前的包体结论量的不是这棵树**。
现状：链加 `--out` 全程注入 `UNI_OUTPUT_DIR`，三步各自吃同一个 out 目录，
步序门从链自己的 `--dry` argv 判（不判我手维护的步表），并有内部负例——`--out` 指回共享目录必须被拒。

| 判点 | 结果行 |
|---|---|
| 后处理步是否指向本轮产物 | `CHAINSTEPS_RESULT=PASS`，逐步 argv 判定 |
| 是否拒绝写共享目录 | 负例实测拒绝（`RELEASECHAIN_RESULT=FAIL`） |
| prune 的档位断言 | 缺 `--dist` 退 2；mock 目录退 1 `REFUSED_BAND`；删除前 `PRUNE_BACKUP=` 具名备份 |
| 幂等性 | 链开场 `RELEASECHAIN_PRESTATE` 比较 src 与备份文件数，缺则先恢复（此前"成功会毒化下一跑"） |
| svg→png 步序 | 必须早于裁剪：`SVGPNG_RESULT=PASS encoded=48 mismatch=0` |

## 2. 71 页覆盖

分母来自编译产物 `app.json`（71 路由 = 主包 8 + 分包 63），不来自记忆或历史清单。

| 通道 | 页 | 帧 | 尺 |
|---|---|---|---|
| automator（有基准 14 页） | 14 | 28（top/bottom） | 378×814 PNG |
| wechatide CLI（无基准 57 页） | 57 | 57（默认态） | 378×814 JPEG（见 D-N08） |
| 合计并集 | 68 页有可用帧 | — | 跨通道同图/空转件/band 不符各自能红 |
| 够不着 | 3（`subpackages/vip/{index,promo-code,bills}`） | 0 | 每行带 reason+evidence：实测三页帧落点都是 `pages/profile/index`、逐字节同图 10,206B，而"不开会员/showcase 旗标"是在册禁令 |

`SWEEPCOVER_STATS want=71 covered=68 blocked=3 covered+blocked=71/71 blankPages=0 noFramePages=0 dupGroups=0 landingMismatchFrames=0`
→ `SWEEPCOVER_RESULT=PASS`。够不着桶是自证 12 例里的 5 例，全部实测能红；**哪天真拍到帧就把那行判红**，豁免不许赖着。

## 3. 每页逐张缺陷（R2b 轮）

泳道 7 条（6 条有基准 + 1 条补登录/匹配中页），派单件与交卡件对账后 defect_id 合计 **124**。
配额门读数：`FINDERLANE_STATS frames=24 可用帧=28 未被覆盖=4 defects=118 hash_mismatch=0 ungrepable_citations=0 axis_invalid=0`。

其中"未被覆盖=4"这一判点是本轮新加的，理由是它抓到了一次真实的假交付：
**L02 泳道自述"21 张卡已交付"，而盘上那个文件只有 20 字节的标题行**。
旧分母读的是"卡里提到过几张帧"，所以那张空件照样 0 违规通过。

密度最高的几页（卡数）：`profile/other` + `match-success` 23 条、`discover`+`home` 22 条、
`nearby`+`messages` 24 条（重派后）、`village/detail`+`circles/index` 19 条、
`circle-home`+`hub` 16 条、`profile`+`publish` 20 条、`login`+`matching` 15 条。

三条系统性的：
1. **滚不动**（可达性 P0/P1）：`discover`、`village/detail`、`publish`、`profile/other` 四页的 top/bottom
   内容区逐像素差 **0.000%–0.001%**，只有状态栏时钟在走。根因一类是卡片容器比视口高（R1 把 MatchActions
   移出 scroll-view 后没重算高度），一类是折叠区在空数据时塌掉使页高不足 100vh。
2. **素材在真档下不渲染**：多个图标/头像是空白圆片或灰块，而文件在 `src/static` 下确实存在且非空 ⇒
   指向 `resolveMediaUrl` / REAL_ASSETS 的 CDN 迁移，不是缺文件。泳道按"不造路径"的规矩把这些报成需新建/需修解析。
3. **取证串进用户可见文案**：帖身/标签/评论里留着 `G8 端到端取证帖 2610171341…`、tag `g8` 这类历史 QA 数据。

## 4. 需要新建的目标功能（含全部无基准页）

57 页无基准 = 没有权威画面可比，本轮只做到"可达 + 渲染 + 帧唯一"。逐页需要的基准图与判定口径见
`baseline-ledger.md`；`derive-baseline-ledger` 的判点是"表里点名而盘上没有 ⇒ 判红，绝不回退"。

需新建（轴=需新建，本轮泳道点名）：寻觅页收藏入口（已在 fb7815af 接上真实路由与素材）、
他人主页理想图的 4 个下方模块、匹配中页的真实进度（假 89% 按 §12 禁令已删，需以 2600ms 兜底计时推导）、
游客态消息页理想图的 5 个模块、带翅膀的心素材（`static` 下不存在，不许造路径）。

## 5. 连通与写回环

`127.0.0.1:8080/api/v1` 直连（点 UI 会触发 boot hooks，那条教训在册）。
一次真实往返：客户端 `POST /posts` → 两端各自按 id 读 → 字段对账 → 后台 `DELETE` → 回读那一行 → 计数守恒。

| 读数 | 值 |
|---|---|
| 建 | `POST /posts -> 200 id=396` |
| 读 | client=200 admin=200，字段对账 **5/5** |
| 撤 | `DELETE -> 200`，回读 `http=200 status=deleted` ⇒ 判"不再是活行"成立 |
| 守恒 | 客户端 269→269（等号有意义）；后台 347→348→349→350（**含软删行，只如实报差**） |
| 备份 | `database/backup/qafid-R2b-20261018T191822.sql` 142,272B（口令经 MYSQL_PWD，不进命令行） |

照出三件此前不知道的产品事实（详见 parked.md D-N09/N10/N11）：后台删除是软删；
后台列表 total 把已删行算在内；两端作者字段键形不同（客户端 `author.userId`，后台 `authorId`），
而审核态只存在于后台一侧——客户端契约里没有治理字段。
残留：`id=394,395,396` 三行软删帖仍在表里，真删是改数据的动作，没有擅自做。

## 6. 轮次台账

| 轮 | 取景 | 有效性 | 卡 | 修 | 像素复核 |
|---|---|---|---|---|---|
| R1 | 14 页 / 28 帧（自动机） | **不计入轮次**：清单里没有 reattach 证明（该字段本轮才加） | 119 条 | 11 页 + 3 处既有类型错误（`bf182936`） | 改前尺是整文件哈希 |
| R2 | 14 页 | **作废**：IDE 窗口没重开 ⇒ 整轮是改前编译；两条泳道独立量到"改动一条没上屏" | — | — | 该轮即发现 FIX_VISIBLE 是时钟假阳性（visible=5/clockOnly=10/notVisible=10） |
| R2b | 14 页 / 28 帧 + 57 页 / 57 帧 | **有效**：`reattach.exit=0` 已落进清单 | 124 条 | 第一批 22 条（`fb7815af`），其余在途 | `FIXVIS_RESULT=PASS visible=17 fixNotVisible=0 gaps=7`（内容区像素，裁掉状态栏 40px） |
| R3 | 待跑（本轮修完重建后复拍） | — | — | — | — |

R2b 的像素复核是关键一步：它证明 R1 那 11 页的改动**确实上屏了**（17 张帧内容区变化、0 张逐字节不变、
0 张只有时钟在走），因此 R2b 找出的 124 条是"修好之后仍然存在的问题"，不是同一批旧账重报。

## 7. 历史问题复查

`reports/audit/round-6/issue-matrix.md` 的行只对**帧里量得到**的重判。本轮顺手复查出两条：
* `circle-home` 的 R1 "P0 空态"缺陷其实是**仪表造的**——参数 `circleId=3` 出自 round-6 ops 的一条负例，
  不在 `GET /circles` 的真实 id 域（8–15）里；换成 8（摄影圈，与理想图同名）后同一帧从 31,974B 变 159,723B。
  取景腿的 `--params` 注释已按此更正。
* 上一轮被判"已修"的 `discover` 高度问题在 R2b 变成了新的 P0（改法本身造成了滚不动）⇒
  按"同轴不同现象可重报"的规则记为新缺陷，不重开旧行。

## 8. 门禁与双载具一致性

本轮新建的门：`verify-env-release`（含 `--self-test` 7 例）、`verify-release-chain-steps`、
`derive-baseline-ledger`、`shoot-fidelity-sweep`、`verify-sweep-coverage`（12 例）、
`verify-finder-lane`（8 例 + 新分母）、`verify-fix-visibility`（5 例，含真实 PNG 的"只有时钟在走"必红）、
`verify-admin-roundtrip`、`render-defects`、`verify-fidelity-closeout`（9 例，含"空表不许当绿"与变异翻绿）。

`GATESYNC_RESULT=PASS（判点数=14，不一致=0）`，`GATESYNC_ORPHANS=3 baseline=3`。
载具里点的是各门的 `--self-test`/`--dry` 形状：真批次的输入按轮变化，写死进载具等于下一程拿旧判决读数；
真批次的跑法由本程手动执行并把 `*_RESULT=` 抄进本报告。两个例外：`verify-gate-list-sync` 自己在两侧都点名，
`verify-admin-roundtrip` 在两侧都点 `--dry`（它会写库，塞进终验载具等于每次跑清单都往 posts 插一行）。

## 9. 挂起与待裁

见同目录 `parked.md`：48 条开放行、28 条待裁、覆盖欠账 5/4/1、棘轮基线不动，
外加本轮新登记的 D-N01…N12 与 #11/#26/#27。
新增待裁两件：① "71 页每页都要有帧"与"游客身份只扫 tabBar 页"的既有裁定对登录页互斥（本轮以 `identity=none`
补拍解决，但那是对原裁定的偏离，需确认口径）；② 会员三页在旗标关闭时构造上不可达，
本轮用"够不着桶"记账而不是降阈值——是否要把它们从保真分母里正式摘出，请裁。

## 10. 如实未验证清单

* 三轮没跑满：算数的轮次 1/3。R3 复拍与"末轮新增缺陷=0"未达成，收口门因此红。
* 57 张 CLI 帧是 JPEG 且只拍默认态：这 57 页的**像素保真**没判过，只判了可达/渲染/帧唯一。
* console 采不到：miniprogram-automator 0.12.1 没有 `onConsole/onError`（grep 过导出面），本轮不假装采到。
* 真机（非模拟器）未跑：全部读数来自 IDE 模拟器 + 127.0.0.1 后端。
* 素材类缺陷的根因（`resolveMediaUrl` / REAL_ASSETS CDN 迁移）未修，只登记；它横跨多个组件，
  不在任何单页泳道的可写集里。
* `--tab-bar-total-h` 与 `custom-tab-bar/index.wxss` 是否同批修，仍未裁。
* 修复批次里被泳道判"根因在别人的文件里"的 4 条（CommunityFeed 一组）本轮未动。
