# 保真审计 · R6/R7 段报告（2026-10-19 至 10-20，接 `report.md` §0–§10 之后另写一节）

体例照本仓规矩：**旧节原文一字不动**，本节只写新状态与新读数。凡引用条目一律带册名前缀
（`decisions #N` / `followups §N` / `parked D-Nxx`），位置给文本锚不给行号。

## R6.0 一句话

**发布链第一次整条真通过（主包 1.55MB / 上限 2.00MB），代价是 12.66MB 素材改由后端托管；
71 页第一次全量进 automator 取景（141 帧 378×814 PNG）；17 条泳道入账 297 条缺陷；
七条修车道落地约 155 条 FIXED。** 收口门仍不绿，差的是"末轮 P0/P1=0"那一发的复拍与复判。

| 项 | 实测值 | 出处 |
|---|---|---|
| 发布链 | `RELEASECHAIN_RESULT=PASS steps=13 shippable=no`（此前它一直红在体积门上） | `tmp/qa/logs/chain-R7c.log` |
| 主包 | **1.55MB / 2.00MB**；总包 2.59MB / 10MB | `PACKAGE_SIZE_RESULT=PASS`，我独立复量 1,614,039B（上一档） |
| CDN 出包 | `PREPARESTATIC_CDN=APPLIED 候选=478 offload=289 出包字节=13,278,119 缺资产=0 保护命中=0` | 同上 |
| 包内素材 | `static` 从 11.33MB/341 件 → **0.106MB/156 件**（只剩 icons/{tabbar,register,common} 与 svg-spec） | 我 `find` 实量 |
| 后端资产覆盖 | `ASSETCOV_COVERAGE 桶=6 分母=166 200同字节=166 404=0 DRIFT=0`；扩到 11 桶后 `分母=1052 DRIFT=0 404=1` | `scripts/qa/verify-app-assets-coverage.mjs` |
| 取景 | R6 `routes=71 frames=141`（`pageErrors` 6→0，`landingMismatch` 11→8） | `tmp/qa/frames/R6/real-f0677920/sweep-manifest.json` |
| 缺陷账 | 297 条 / 86 个互斥批次；**收口门权威分桶 P0=4 / P1=96 / P2=149 / P3=48**（四档相加=297，与聚合器逐条对得上） | `FIDELITY_CLOSEOUT_RESULT` 的 newdefects 行、`fixlist-R6.json` |
| 收口门 | `FIDELITY_CLOSEOUT_RESULT=FAIL 不中=coverage,newdefects` ⇒ **八条里 6 条 OK**，其中 `rounds` 从上一程的"有重开窗证明的轮=1"变到 **5** | 同上（判据表全文见 R6.8） |
| 数据面 | 真删 758 行（含裁定点名的 posts 394/395/396）；后台 total 350→197、`status=deleted` 43→0；新建 41 条真实数据全走 API | `data-hygiene.md` |
| 卫生门 | `DATA_HYGIENE_RESULT=PASS cells=3560 dirty=0`；`--self-test` 注入⇒红 ⇒ `HYGIENE_SELFTEST PASS` | `scripts/qa/verify-data-hygiene.mjs` |
| 后台门 | `ADMAUD=PASS 17/17`、`ADMSCOPE=PASS 17/17`、`POSTDETAIL=PASS 30/30`、`ADMWRITE` 见 R6.5 | 各门实跑 |
| 门禁一致性 | `GATESYNC_RESULT=PASS 判点数=14 不一致=0`、`GATESYNC_ORPHANS=3 baseline=3`、`TCHECK_RESULT=PASS 0 错误` | 三处登记点接满后复量 |

## R6.1 三条用户裁定的落地

**① 大位图走后端 app-assets（不是"再压缩"、不是"塞分包"）。** 单一真源
`apps/client/config/cdn-buckets.json`（schema `mp-cdn-buckets/v1`）；`utils/media.ts` 里那两个
"把 app-assets 反写成 /static" 的分支改成 real 档不反写（其余档一字不动），散在三处的目录硬编码
合并成读契约的 `cdnize()`。构建链按同一份契约出包，非法契约整份拒收（schema、前缀口径、
cdn∩local 相互覆盖、桶含首屏必需）。
**体积这条因果不许再被读反**：此前"包小 = 1.73MB 达标"是因为更早几轮把正在用的图裁没了，
"包小"与"图标空白"是同一件事的两面（`parked` 里已登记）。今程把图请回包外、改由后端托管，
才是两条一起成立的路。

**② 收口判据改造。** 上一程的死结是：找茬门硬要求"每张可用帧必须被至少一条缺陷卡覆盖"，
而收口门要求"末轮新增缺陷=0"——**这两条构造上互斥，PASS 拿不到**。用户裁定：找茬门加逐轴
`## CLEAN` 出口（12 轴逐条给实测读数才允许判"干净"，缺轴/散文空话/假理想图一律作废、该帧退回未覆盖），
收口门 `newdefects` 改按 severity 分桶（P0/P1 阻断，P2/P3 逐条点名不阻断）。
`verify-finder-lane --self-test` 8→24 例，含"去掉卡⇒红 / 补合规 CLEAN⇒绿"的翻转对照，
证明没把门改成恒红；`rounds` 判据与 HEAD 逐字相同并加一条"判据未被放宽"守卫。
**本轮 R6 的 CLEAN 卡是 0 张**——不是出口没用，是每帧还真找得到可测问题；它是给"修无可修"那一轮留的。

**③ 数据治理。** 备份→事务内 ROLLBACK 预演→真删（九步 ROW_COUNT 与预演逐条相同），
41 条新数据**全部走后端真实 API**、零直插 SQL，作者字段按别名对账（客户端 `author.userId` 嵌套 /
后台 `authorId` 平铺是实测事实，不是同步坏）。

## R6.2 空白图标的真根因（我转述错了一次，被车道证伪）

我在派单里转述了一条主张："cdn-buckets 前缀比对落在目录基址上，导致出包后运行时仍指 /static"。
**F1 车道实测把它证伪了**：real 产物里 `ICONS_V2.HEART` 求值为 `/static/assets/icons/v2/heart.png`，
喂进 `resolveMediaUrl` 得到 `http://127.0.0.1:8080/api/v1/media/app-assets/assets/icons/v2/heart.png`，
**命中桶、走后端**。真病是**消费点裸绑 `:src` 根本没过解析器**（全仓 ≥19 处，SafeImage 不算）。

另一条更根本的：`static/assets/icons/` 下 **33 枚 SVG 写死 `stroke="currentColor"`**，
而 mp-weixin 的 `<image src="x.svg">` 载入独立 SVG 时 CSS `color` 传不进去 ⇒ 描边无色 ⇒ 0 墨迹。
自对照证据是同帧里写死 `#94A3B8` 的 `common/schedule.svg` 正常显示。**这跟走不走后端无关**，
所以它同时否掉了"real 档素材不渲染是 CDN 迁移造成的"这个旧猜测（`report.md` §3 第 2 条）。
F1 按理想图取样逐族烘了色值（逐枚依据写在 `tmp/qa/reports/R6/F1-report.md`）。

⚠ **我随即发现只烘包内等于没修**：real 档正是从后端取图，而后端 `uploads/app-assets/` 里
还有一批未烘焙的同名件。已把 33 枚逐文件同步进后端与备份树（`synced=33 缺=0`）——
不同步就会留下"包内好了、真机上还白着"的假修复。

## R6.3 我自己造成的三处错（都留了证据，不糊）

1. **`--out` 语义传错**：取景腿的 `--out` 缺省就是 `tmp/qa/frames/<轮>/<档>`，我照抄上一程日志里的
   完整 band 目录当"根目录"传进去 ⇒ 141 帧平铺在 `tmp/qa/frames/` 根上，收口门按
   `frames/*/*/sweep-manifest.json` 发现轮次，这一发根本不被算成一轮。
   用新脚本 `scripts/qa/relocate-sweep-out.mjs` 机械归位：**逐帧 sha16 与 bytes 先全量核对一致才动盘**
   （`RELOCATE_SWEEPOUT_RESULT=PASS 移动帧=141/141`），改前清单另存 `.pre-relocate.json`。
   它只改 `path` 前缀，不碰任何字节数/哈希/落点/判决字段。
2. **把守卫的假红当成车道改坏了码**。`check-statusbar-offset` 报三条"用 var(--statusbar 而无 JS 注入源"，
   我据此往三个文件补 `useMenuButtonRect`——**其中两个文件本来就有**，编译期撞出
   `Identifier 'useMenuButtonRect' has already been declared`。真因是守卫自己的解析 bug：
   它先剥块注释再剥行注释，而 `hub.vue:13` 那行**行注释里写着 `/uploads/**`**，
   其中的"斜杠星"被当成块注释起点，一路吞到 43 行，把真实的 import 一起抹掉。
   改成单遍状态机后真树 0 错，并用两个探针件证明它仍会红（缺注入源 / 裸 env），撤掉回绿。
   我加的三处重复注入**已全部撤回**。
3. **`timeout` 预算给小了两发**：R7 复拍先被 480s、后被 900s 掐死（`SWEEP_EXIT=124`）。
   124 属于载具不属于被测物——R6 实测每帧约 15 秒，今晨同机约 55 秒/帧，预算该按实测最大值给。
   另外我 kill 掉的那发留下**孤儿租约**，`ui-lease` 按设计仍拦（"pid 已没、租期未过"也拦），
   我走它点名的 `reclaimOrphanUi({confirm:"RECLAIM_ORPHAN", owner:...})` 接管——
   第一次它拒了（"没给 owner ⇒ 接管后这把锁没人认领，等于把租约改成匿名"），这条设计是对的。

## R6.4 修掉的仪器缺陷（与产品缺陷同等重要）

| 门/脚本 | 缺陷 | 修法 |
|---|---|---|
| `check-statusbar-offset` | 注释剥离顺序错 ⇒ 行注释里的 `/*` 吞掉后续代码 ⇒ **假红** | 单遍状态机；两个探针件证明仍会红 |
| `verify-finder-lane` | `resolve("")` 返回 cwd ⇒ "缺输入退 2"守卫从未生效，裸跑抛 EISDIR 退 1 | 显式判空 + spawn 自证（L04 顺手抓的） |
| `verify-data-hygiene` | `--self-test` 注入后直接 exit 1 ⇒ 永远进不了 `GATE_SELFTESTS`（那里要求退出码 0＋自报 PASS 行） | 自判"红得起来没有"，真件读数另印 `HYGIENE_REAL` 不发判决 |
| `strip-mock-for-mp` | 一次 Windows 瞬时锁（errno -4094）就同时坏三件事：整棵 src 停在桩态（`en-US.ts` 4,886 行只剩 2 行，桩头还写"请勿提交"）、异常从 `finally` 逃出顶掉构建退出码、备份在盘上却没人说 | 逐文件重试＋回读字节校验＋只有全部落定才删备份＋`STRIPMOCK_RESTORE=OK/FAIL` 与 `STRIPMOCK_RESULT` 机读行 |
| `verify-package-size` | 同一份输出两头打脸（real 档照印"不是发布形态"的硬编码常量） | 只条件化措辞，**阈值与退出码一个没动** |
| `aggregate-defects` | 把本程早先落在同一目录的 7 份车道报告当泳道卡读（`读卡=24` 而泳道只有 17）⇒ 分母污染 | 报告挪到 `tmp/qa/reports/R6/` 后复量：`读卡=17 defects=297 互斥=成立` |

## R6.5 后台"能真管理"这条上的一个判据缺陷

`verify-admin-writes` 今晨复量 `FAIL pass=14 fail=1`，红在
`总览数值自洽（待审 ≤ 总数，且总数已含新建帖） — pending=2 total=197`。
读代码发现它把**某一天的库状态写死成判点**：`total >= 265`。用户裁定清掉 165 条取证残留帖之后
total 落到 197，于是红的是地板不是产品。改成散文本来声称的那个相对不变量：
建帖前先取一次 `totalPostCount`，断言 `total >= totalBefore + 1`（本次建的那一条必须真被计进总数），
`pending <= total` 单列；建帖前那发读不到数则记 skip 不记产品红。
**这不是放宽**——绝对地板换成"必须真含本次新建行"更严。

后台图片链路实测：`apps/admin/src/api/media.ts:104` 已把 `/static/…` 重写到
`/api/v1/media/app-assets/…`（改写后 200 / 4,701B 真图）；后台 14 处 `:src` 绑定里 11 处过了
`withMediaToken`，剩 3 处是本地上传预览（`url`/`previewUrl`/`previewSrc`），不需要重写。
⚠ 一个静默陷阱：后台源直取 `/static/...` 返回的是 **200 的 978B HTML**（Vite SPA 兜底）而不是 404——
漏调重写的组件会"200 地裂图"，所以任何按 `http=200` 判"图能显示"的断言都不算数，得看 content-type 与字节。

## R6.6 新增待裁（只列不做，等用户拍）

| id | 事项 | 实测依据 |
|---|---|---|
| **R6-A** | **帮助/FAQ 页要求登录是否成立**。`subpackages/tools/help/index` 在已登录身份下两帧落点都是 `pages/login/index`，源码里是 `usePageAccess(chatPageRequirements)`——帮助页复用了聊天页门槛。F17 判读：`chatPageRequirements` 只有 `requiresAuth:true`（同表 discover/village/profile 皆 false），页内是 6 组静态 i18n FAQ + 常量客服邮箱、零用户数据 ⇒ 读 FAQ 不该要登录；但页内两个 CTA（在线客服、意见反馈）的目标页确需登录，宜"页面放开、点击时再拦"。**这是产品口径，我没动。** | 取景 landingMismatch + 源码与 page-access 表实测 |
| **R6-B** | **`--f-2xl` 补不补**。F1 补了 `--f-md/--f-xs/--r-2xl/--c-error-soft` 四枚（定义侧，值有依据），但 `--f-2xl` 若照序列补会把一处现有渲染从 56rpx 拉到 32rpx ⇒ 判成回归，留待裁 | `tmp/qa/reports/R6/F1-report.md` |
| **R6-C** | **6 张圈子封面要重制**。今晨按图定版把 `circle-{food,music,photo,sky,sports,travel}.png` 全换成 750 满幅版，但 F11 用自写 PNG 解码器量出：`food` 750 版下 34.5% 全白、`sports` 22.7%、`sky` 91.6% 且**漏进理想图的 tabBar 房子图标**——即这三张两版都不对。`sports` 已改指真存在的 `circle-cover-sports.jpg`（200/28,501B 同字节），`food`/`astronomy` 登记 `需新建`（缺 `circle-cover-food.jpg`、`circle-cover-astronomy.jpg`）。**没造图。** | `tmp/qa/reports/R6/L11-covers.md` |
| **R6-D** | **`icons/common/` 里那枚零引用孤儿**。它是扩桶后唯一的 404（`getAppAsset()` 读盘前校验 `media_asset` 表，该 url 0 行）。我选择把 `icons/common/` 留在 `localPrefixes`（0.049MB，为 49KB 让覆盖率门变红不划算），而不是删跟踪文件或补注册行——两条路都要人拍 | `assets-coverage.md`、L10/L11 报告 |
| **R6-E** | **软删语义与两侧计数不同尺**（旧 `parked D-N09/D-N10` 的续）：本轮真删之后台 total=200、客户端=188，差值可对账闭合（197−6 hidden−2 pending−1 friends=188），但"后台删除是软删 + 后台 total 含已删行"这条产品口径仍未裁 | `data-hygiene.md` |

## R6.7 如实未验证清单

* **R7 复拍未收口**：12 页基准集的复拍在写这份报告时仍在跑（前两发被我自己的 timeout 掐死）。
  在它出清单之前，**R6 修复批次的 155 条 FIXED 不写进任何"完成"口径**——判据存在的理由就是
  上一程我拿整文件哈希宣布"修好了 15 张"、其中 10 张其实只有状态栏时钟在走。
* **R7 泳道未派**：收口门要"末轮 P0/P1=0"，需要先有 R7 的找茬卡。R6 权威分桶是 **P0=4 / P1=96**
  （⚠ 我先前用 grep 数 severity 标记得到"P0 21"，那是把散文里的字样一起数了——**以门自己现数的四档
  相加=297 那把尺为准**，我错在没先钉口径）。即使 FIXED 全部上屏，末轮清零也还得再来一轮修复；
  本轮没有把它说成已闭。
* **`render-defects` 拒绝出 defects-R6.md**：`NOT-EVIDENCED frame_hash空=95`——95 条缺陷条目没有逐条
  `frame_hash`（门按 `## FRAME` 段收哈希，一段多条目时只有段头带）。这是渲染器比找茬门更严，
  要么补卡内哈希、要么改渲染器按段继承——**我没动任何一边**，先如实登记。
* **57 张 CLI 帧仍是 JPEG 且只拍默认态**：R6 把 71 页全量纳进了 automator（PNG），但 R6 的 CLI 通道
  这一发没跑 ⇒ 收口门的 coverage 判据要"两条通道按轮并集"，R6 只有 automator 一件清单。
* **后台浏览器级截图未做**：后台门是 API 级 + 解码级证据（`POSTDETAIL` 30 项含"配图真解码"），
  我没有用浏览器打开 5177 逐页截图核对"人眼看得到图"。
* **真机（非模拟器）未跑**；**console 采不到**（miniprogram-automator 0.12.1 无 `onConsole/onError`）；
  **本档不可上传发布**（API 指向 127.0.0.1，凭证券 `shippable: false`，正式域名与 AppID 我没有）。
* **`src/static` 停在发布裁剪态**（1148 个跟踪文件 ` D` 未入库，本仓纪律是最后一轮构建取证后再
  按具名路径还原，禁全仓 restore）；F1 的烘焙已同步进备份树，但**还原顺序仍需人工核**，
  否则一次 `prepare-static --dev` 会把未烘焙版搬回来、静默回退 R6.2 那批修复。

## R6.8 收口门八条判据的当前读数（2026-10-20 实跑，逐条给出处）

```
FIDELITY_CLOSEOUT_RESULT=FAIL 不中=coverage,newdefects（还差 2 条，未达"完成"）
  OK   rounds      got=盘上轮=8 有重开窗证明的轮=5 want=>=3
  BAD  coverage    got=并集覆盖=68/71 够不着=3 缺页=0 覆盖门红=4
  BAD  newdefects  got=泳道=17 交卡=17 P0=4 P1=96 P2=149 P3=48 CLEAN=0 可用帧=134 漏审帧=0 CLEAN作废=0
  OK   fixvis      got=读=fix-visibility-R5.json visible=16 notVisible=0 clockOnly=0
  OK   band        got=real@f0677920 want=real@f0677920
  OK   chain       got=CHAINSTEPS_RESULT=PASS exit=0
  OK   carriers    got=GATESYNC_ORPHANS=3 孤儿=3/基线=3
  OK   roundtrip   got=verdict=PASS conserved=true fields=5/5
```

两条 BAD 各自差什么，写清楚免得下一程猜：

* **coverage**：R6 只跑了 automator 一件清单，覆盖判据要的是**两条通道按轮并集**
  （CLI 巡检腿写 `tour-manifest.json`）。上一程 R2b 是 68+3=71 过在这一并集上的；
  R6 现在并集仍是 68/71，红 4 条里含 `tools/help`（见 R6-A 待裁）与两页参数补齐前的旧账。
  ⇒ **下一程的动作是补跑 CLI 通道那一发**，不是动判据。
* **newdefects**：末轮（R6）P0=4 / P1=96 未清零，且 CLEAN=0。
  ⇒ 需要 R7 复拍 + R7 泳道复判这一整轮，本轮时间没跑到那里（见 R6.7 前两条）。

顺手又抓到并修掉一处仪器脆弱性：收口门的轮次发现逻辑原来只判 `existsSync`，
于是帧根目录下**任何一个杂散文件**都会走进内层 `readdirSync(文件)` 抛 `ENOTDIR`
**把整个收口门崩成栈回溯**（触发件就是我归位时留下的 `sweep-manifest.json.pre-relocate.json`）。
读起来像"收口门坏了"，其实是一行留档件引发的 ⇒ 改成 `statSync().isDirectory()` 才继续，
量不到不等于崩。杂散留档件同时挪进 `tmp/qa/frames-archive/`。
