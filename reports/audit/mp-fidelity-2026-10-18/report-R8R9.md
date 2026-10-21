# R8 → R9 段报告（MP-FIDELITY 收口波）

生成时刻 2026-10-21。上游报告：`report.md`（R1–R4）、`report-R6R7.md`（R6/R7）。
本段覆盖 **R8 全量复判 → R8 修车波 → R9 复拍复判**，以及交付侧（管理后台 / 开发者工具）核查。

## 1. 一句话读数

- 收口门八条判据 **7 绿 1 红**：`FIDELITY_CLOSEOUT_RESULT=FAIL 不中=newdefects`。
  红的那条完全可归因：**14 条泳道只交了 10 条**（4 条被外部 Chat 配额掐断），且有 P1=14、漏审帧=36。
- 其余七条全部带出处重验：rounds=4/4、coverage 68+3=71、fixvis visible=74/notVisible=0、
  band=real@f0677920、chain=PASS、carriers 孤儿 3/基线 3、roundtrip PASS（fields 5/5、conserved）。

## 2. R8：全量复判与修车波

R8 取景 142 帧（71 页 × 2 态，blank=0、noUniqueFrame=0），14 条泳道全部交卡：
**237 条缺陷 / P0=0 / P1=50 / P2=136 / P3=51**，0 条未标级、0 条词表外轴、0 条引文抓不到、
0 条漏审、0 条卡上有而账上无。缺陷册见 `defects-R8.md`（2040 行，逐帧逐条）。

R8 的 237 条比 R7 的 57 条多一个量级，原因不是质量变差，而是 **R7 有三条泳道根本没交卡**。
这一点必须记在账上：跨轮比较必须先看分母。

修车波按 `fixlist-R8.json` 的 83 个批次派发，取「含 P1 ∪ 共享 ∪ 根因」= 36 批次 / 130 行
（其余 47 批次 / 107 行是纯 P2/P3 且非根因，本轮有意不派，见 `dispatch-manifest.json`）。
结果：**124 落地 / 4 未修 / 2 证伪**，改动 36 个文件，逐一对账授权清单越界 0。

四条根因（比逐页刷样式值钱）：

1. **`SafeImage` 的尺寸永远传不进去**，真因是 uni-app 的 `data-v` 作用域边界，不是"类挂错节点"：
   `custom-class`/`root-class` 是 prop，值落在组件**内部**节点上，那些节点不带宿主页的 scope id
   ⇒ 宿主页 scoped 的 `.x{width:40rpx}` 编译成 `.x.data-v-<host>`，命中 0 个节点。
   R7 把类从 `custom-class` 挪到 `root-class` 因此完全无效（同一个边界）。
   修法：`SafeImage.vue:348` 补 `:host{display:block;width:100%;height:100%}`——`:host` 特异度
   0,1,0 低于任何宿主 scoped 规则，未写尺寸的既有调用点逐像素不变；宿主把尺寸写在**组件标签**上即生效。
2. **`vars(--statusbar, env(...))` 在本运行档解出 0**，靠它做状态栏让位的控件全部压进系统时间/胶囊带。
   修法：组件自己 `useStatusBarHeight()` 注入（LockScreen 已改，5 个宿主一次覆盖）。
3. **空态居中需要宿主页有可解析高度**：`min-height:100%` 在无确定高的祖先下退化成 auto，
   `flex:1`+居中全是惰性的；AppShell 已改 `100vh` + flex 列。
4. **`assets/icons/` 根目录既不在 cdn 桶也不在 local 白名单**，而 prune 的 `PATH_RE` 要"目录/文件"
   两级字面量 ⇒ 以 `ICONS_BASE + '/x.svg'` 拼接形态引用的会被静默剪掉。
   本轮用 `IN_PACKAGE_ASSETS` 的 pkg+tail 双登记补齐到 14 枚，**包内实测 14/14**（R8 时只有 6 枚）。

顺带纠了两个我自己给错的题面：`status-online.svg` / `run.svg` 并非缺 `width`（两枚都有），
R8 那三枚 P1 的真因是 `SafeImage` 边界与 `icons/emoji/` 只登记在 cdnPrefixes 的裸绑 404。

## 3. R9：复拍与复判

- 取景：142 帧，blank=0、noUniqueFrame=0，只有 vip 三页 landingMismatch=6/pageErrors=3
  （会员旗标关闭时整组不可达，名册在 `blocked-routes.json`）。
- 覆盖率：68/71 + 够不着 3 = 71/71，覆盖门红=0。
- 修复可见性：`visible=74 / notVisible=0 / clockOnly=0`（prev=R8、cur=R9、fixlist=派单子集）。
- 复判：10 条泳道交件，**140 条缺陷 / P0=0 / P1=14 / P2=102 / P3=24**，0 条未标级。
  P1 从 R8 的 50 条降到 14 条。

**P1 全部 14 条点名**（下一轮先修这些）：
`register/index·可达性`；`nearby/index·层级遮挡`、`nearby/index·可达性`；
`messages/index·素材缺失`、`profile/index·素材缺失`、`profile/index·位置`；
`village/index·可达性`、`village/index·层级遮挡`、`village/publish·素材缺失`；
`circles/circle-home·可达性`、`campus/post-topic·可达性`、`tools/activities/detail·可达性`、
`profile/other·可达性`、`favorites·可达性`。

## 4. 未完成与具名缺口（不改判据、不删派单）

1. **4 条泳道被外部配额掐断**：R9-L09 / L11 / L12 / L14 四次派发都返回
   「You've reached your daily usage limit for Chat」。这四条泳道覆盖 36 帧，判据记 `漏审帧=36`。
   另 R9-L10 是**部分交件**：卡上有真实缺陷行，但同时留下 10 个只有 `## FRAME`+哈希、
   既无缺陷也无 CLEAN 的空段，渲染器把这些段单列成「空帧段（未交代，不算已审）」，
   没有让它们冒充已审。**没有为凑数代写这四张卡**——那等于伪造见证件。
2. `blocked-rows.json` 两行（不是豁免名单，带 reason/evidence/unblocks_when）：
   `R8-L01-D09` 需后端 `TodayRecommendationView.photos` 列；`R8-L12-D01` 是用户真上传的两枚
   81×81 定位针 PNG（数据脏，前端无任何可辨信号）。
3. 另有 4 条「未修」是缺数据列：`campuses.member_count`、`TodayRecommendationView.photos`、
   `photo_gallery.asset_kind/宽高`、`locales` 需新增的 setup.schedule 第三分区键。
4. 在册但本轮未动的后继：`daily-question:484` 仍用 `--c-brand-600`（白字 2.81:1）；
   `common/back.png` 折线 #94A2B7 压白 1.6:1（全站 20+ 页头在用）；`common/lock.svg` 硬编码 #94A3B8；
   `PublicCommon.vue:45` 仍裸绑 `ICONS_EMOJI.RUN`；规范文档 §3.13 需补记详情页 not-found 版式。
5. **轮次选取已在两处留证**：带 `--rounds R2b,R7,R8,R9` 与不带该参数各跑一次
   （`tmp/qa/logs/closeout-R9-selected.txt` / `closeout-R9-allrounds.txt`）。
   不带参数时 `coverage` 会红，因为 R3/R4/R5 是局部落补轮（12/8/12 页）、R6 的 help 页在
   R7 裁定后才可拍（不能挂 blocked）。这不是挪阈值，是把"那一轮本来就不是全量轮"登记下来。

## 5. 交付侧核查（用户可复核）

- **管理后台·浏览器级**：`ADMINBROWSER_RESULT=PASS`
  - 媒体页 20 个 `<img>` **全部真解码、裂图 0**；
  - 计数对齐 `overview=posts=village-posts=195`；
  - 真实管理动作：点「取消置顶」→ XHR `.../village-posts/127/unpin` 200，二次点击还原成功；
  - 5 张截图在 `admin-browser-shots/`。
- **写库往返**：`ROUNDTRIP_RESULT=PASS created=412 fields=5/5 torn_down=yes conserved=yes`，
  mysqldump 在写之前。
- **后台计数探针**：`PROBE_VERDICT=COUNTS_PRESENT 3/3`（`likesCount`/`commentsCount` 在后台读侧存在）。
- **数据卫生**：`DATA_HYGIENE_RESULT=PASS cells=3550 dirty=0`。本轮真删了 3 行取证垃圾
  （`posts#281/282`、`circle_replies#43`，title/content 字面 "123456"）并回补了
  `circle_topics#37.reply_count`（13→12，与实到一致）；另清掉本机 roundtrip 自己留下的
  `posts#412` 与 `post_tags#289`（`qafid` 串）。两次都先 mysqldump（
  `database/backup/hygiene-pending-*.sql`、`hygiene-roundtrip-*.sql`）。
- **真机档截图**：`reports/screenshots/r9-real/` 7 张（CLI 通道 192×413，
  **不得与 automator 的 378×814 跨尺比像素**）：discover / nearby / messages / profile /
  circles / search / campus。home 与 login 是 tabBar 页与登录跳转页，由 R9 的 automator 帧覆盖。

### 一条真实的产品行为（不是缺陷，但用户会看到）
后台总览计数是**进程内 5 分钟 TTL 缓存**（`RealAdminStatsService.java:123`，R4-00392 的性能取舍）。
我删完数据后第一次读 `overview=197` 而列表 `195`，等满一个 TTL 后三处一致 `195`，
判据随即转绿。若要求"删完立刻同步"，需在内容变更处补一次统计缓存失效（一行 `CacheEvict`/清 key），
本轮未做，登记在此。

## 6. 工作流改进（本轮落地）

1. `scripts/qa/emit-fix-lanes.mjs`（新）：修车道派单件生成器 + `dispatch-manifest.json` 派单台账。
   自测 4 例（含**变异证明**：把命名改回原 bug，两条判点当场 FAIL）。它当场逮到自己一个静默 bug：
   同区切块两块同名 ⇒ 后写覆掉先写，10 条车道只落 7 份任务书而互斥自检照样绿。
2. `emit-fidelity-lanes.mjs`：**严重度口径进任务书**。此前没有任何定义，只有主代理口头说，
   导致 R7 57 条 / R8 237 条的分级不可比。现在 P0..P3 四档判据 + "不许照抄上一轮的级"写进每份任务书，
   R9 已按此分级（L03/L06/L07 各自以证据判 0 条 P1）。
3. `render-defects.mjs`：认得 `## CLEAN` 段（此前 17 张合规 CLEAN 卡被当成畸形缺陷行，
   整册被 NOT-EVIDENCED 拒出），并新增「空帧段」具名桶（R9 就是靠它抓住 L10 的 10 个空段）。
   自测 2→5 例；R6 重渲染 297 条**逐字同集**（页内顺序不同），已发布件未被覆写。
4. `reports/audit/mp-fidelity-2026-10-18/fix-lane-known-mechanisms.md`（新）：把 9 类机制
   （data-v 边界、对比度算式表、空态高度、statusbar=0、吸顶/吸底 prop、两条 404 路径、
   "改了没上屏"四种成因、四条不许假修、在册后继）固化成件，供 `--notes` 注入。
5. `probe-admin-post-counts.mjs`：修了凭据管道——它把 `.env` 里的 bcrypt 哈希当口令发出去
   （必然 401），且只解析载具脚本文本、不读真环境。现在优先读环境变量，两条 admin 门同时段可登。

## 7. 复现命令

```bash
export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH"   # 裸 node 是开发者工具的 v16，会假红
node scripts/qa/shoot-fidelity-sweep.mjs --ledger reports/audit/mp-fidelity-2026-10-18/baseline-ledger.json \
  --round R9 --identity A --params scripts/qa/fidelity-sweep-params.json
node scripts/qa/verify-sweep-coverage.mjs --ledger reports/audit/mp-fidelity-2026-10-18/baseline-ledger.json \
  --manifest tmp/qa/frames/R9/real-f0677920/sweep-manifest.json --blocked reports/audit/mp-fidelity-2026-10-18/blocked-routes.json
node scripts/qa/verify-fix-visibility.mjs --prev tmp/qa/frames/R8/real-f0677920/sweep-manifest.json \
  --cur tmp/qa/frames/R9/real-f0677920/sweep-manifest.json \
  --fixlist reports/audit/mp-fidelity-2026-10-18/fixlist-R8-dispatched.json \
  --out reports/audit/mp-fidelity-2026-10-18/fix-visibility-R9.json
node scripts/qa/emit-fix-lanes.mjs --fixlist reports/audit/mp-fidelity-2026-10-18/fixlist-R9.json \
  --rows <逐行卡件> --round R9 --out tmp/qa/lanes/R9fix --severity P1 \
  --notes reports/audit/mp-fidelity-2026-10-18/fix-lane-known-mechanisms.md
node scripts/qa/verify-fidelity-closeout.mjs --ledger reports/audit/mp-fidelity-2026-10-18/baseline-ledger.json \
  --rounds R2b,R7,R8,R9 --lanes-last tmp/qa/lanes/R9 \
  --fixvis reports/audit/mp-fidelity-2026-10-18/fix-visibility-R9.json \
  --roundtrip reports/audit/mp-fidelity-2026-10-18/roundtrip-R9.json
```
