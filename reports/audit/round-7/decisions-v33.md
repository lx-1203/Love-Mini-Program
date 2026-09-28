# 需你拍板的事（v3.3 续作轮，2026-09-29 02:51 落）

这一轮把所有能自己判的都判了，下面这些**不是一时没法子**，而是按项目铁律必须由你决定：改判据、改令牌值、删数据、接受"证据绑采集机"这四类都是政策选择，我不替你写。每条给了出处和可选项。

## 1. `--r-lg` 令牌值与判据正面冲突
`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004` 要求把 `border-radius` 从 16 改成 `--r-lg`，但 `--r-lg` 实值是 20rpx，照判据做就违反判据。出处：round7-final-report §3.3。
- 选 A：改判据，让它指一个实值为 16rpx 的令牌。
- 选 B：改令牌值（会影响所有用 `--r-lg` 的地方，不只这一处）。
- 现状：这条判据我扣住没动，`已修复` 与 `已修复待复验` 都没给它。

## 2. `--c-text-inverse` 与 `--c-bg-container` 浅色值完全相同
`design-variables.scss:108/121`、`tokens.scss:235/244` 两组值相同，导致相关判据逐像素不可判。出处：round7-final-report §3.6。
- 选 A：收敛令牌（承认这两个是同一个东西，删掉一条判据）。
- 选 B：把其中一个浅色值改掉，让判据可判（会改视觉）。
- 撞上这族的在册行：`MP-R2VIS-PAGES-MESSAGES-INDEX-001`。本轮复验员实测两色曼哈顿距离仅 22，且与在册契约 `MP-R1-PAGES-MESSAGES-INDEX-106`（消息页整页白底）正面冲突，所以该行**停在 `已修复待复验` 没往下走**。

## 3. `MP-R2-PAGES-MESSAGES-INDEX-002` 判据与已生效裁定只能动一个
组件 `:16-32` 与 `zh-CN.ts:681-685` 都记了"否计数不该出现"，但 mock 构建下 messages 路由根本不挂该组件。出处：round7-final-report §3.5。
- 选 A：改判据（承认 mock 档判不了，换成真实档判点）。
- 选 B：改裁定（让该组件在 mock 下也挂上）。

## 4. AppShell 的左右内距到底是 28rpx 还是 32rpx
`MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001` 本轮被复验员打开源码核对：**它根本没修**（AppShell 仍是 `0 28rpx`），而 `-005` 那条已经裁过 32rpx。它台账上挂着"需帧复验（T5）"是旧措辞，不是欠帧。出处：`.zcode/tmp/lane-recheck/rows.json`。
- 选 A：按 -005 的裁定改成 32rpx（实现刀，我下一轮就能做）。
- 选 B：推翻 -005，保留 28rpx，并改 -005 的判据。
- 我停在原地：没落账也没改码，等你选。

## 5. 帧像素与清单路径要不要长期可查
`.gitignore:68` 是 `*.png`，所以所有报告里写的帧路径只在采集机可解析，干净 clone 一条都打不开。本轮新出帧还有个具体坑：**DevTools 的截图通道回来的字节是 JPEG，却挂在 `.png` 文件名上**，任何 sniff PNG magic 的检查都会被骗。出处：round7-final-report §3.2、`.zcode/tmp/lane-devtools/status.json`。

**同一条病还有第二个轴（本轮新查出来的）**：`reports/audit/round-7/tapfix-merged.json` 的 `lanes` 存的是**绝对路径**（`D:/6/恋爱小程序/reports/…/tapfix-briefs/09/tapfix-lane-PAGES-LOGIN-INDEX.json.json`），文件名还带 `.json.json` 双后缀。我实测这份件里 56 条 lanes 路径 56 条存在、0 缺失，所以本机自洽；但换一个 clone 根目录，这 56 条引用全部指空。也就是说"证据可携"现在坏在两处：像素被 ignore 规则挡住，路径被绝对写法挡住。
- 选 A：进 Git LFS，同时把清单里的绝对路径改成仓内相对路径（一次收掉两个轴）。
- 选 B：包外归档（报告里只留 hash 指纹，不留图也不留本机路径）。
- 选 C：明确接受"证据绑定采集机"，在报告模板里写死这句，别再让清单长得像可携引用。

顺带记一笔本轮查实的账（不需要你决定，只是把归因写清）：工作树里有 6 个被删的跟踪文件
（`tapfix-lane-{login,register}-index.json`、`tapfix-lane-village-{index,post,publish}.json`、
`tapfix-lane-campus-post-topic.json`），我核过它们**不是丢证据**：新布局
`tapfix-briefs/NN/tapfix-lane-*.json.json` 里六页都有对应件，merged 的 56 条引用零缺失，
且原件在 HEAD 里仍可取回（18692 / 28333 字节）。属旧扁平布局被合并，不是有人删了证据。

## 6. 各轮写进库的测试数据要不要清
`posts=270 / comments=1238`，其中本轮 G8 又自增了 `posts.id=270`、`comments.id=1238`、`campus_topics.id=299`、`campus_replies.id=31`；每跑一次 G8 就 +1。默认"保留"已按你的授权落地（`inventory-g8-test-data.mjs` + `test-data-cleanup.sql`，后者默认 ROLLBACK 且表名未实名替换前删不动）。出处：round7-final-report §3.1。
- 悬着的不是"留不留"，是"要不要清"：那需要人先对一遍 schema 表名。
- 连带后果：`MP-R2-PAGES-MESSAGES-INDEX-014`（未取证）问的就是"指定会话的 `last_message_preview` 有没有外露 QA 残留文案"。要它不出现，得先撤销"保留"这条裁定。所以这行我**没有**替你关掉。

## 7. `village-publish-001` 的提示元素与文案缺设计依据
台账状态是 `未取证/需裁决`：判据口径未定（提示元素与文案没有设计依据，两页字数阈值语义分歧属产品选择）。出处：`reports/audit/round-6/issue-matrix.md` 该行处置列。
- 需要你定：字数阈值按哪一页的语义，以及提示文案以哪张设计稿为准。

## 8. 几百个非 png 的文本 dump 要不要入库
`reports/screenshots/round-2-interact`（258 个 wxml 文本）、`round-6-interact`（340 个）、`round-2-tour`（3 个日志）现在整体未跟踪。提交它们是可选项不是必须项，一次涉及几百个文件。出处：round7-final-report §3.2 末段。

## 9. 高 dpr 机型档的巡检帧要不要补
现有全库帧最大竖屏 459×1012（早期 56 张），近期各档 378×814，**没有一行真实档欠账以高 dpr 为前置**（本轮 UI 复验员逐字复制后 grep 0 命中）；高 dpr 缺口只绑在 `MP-R2VIS-TMP-TOUR-R2-004` 这一条待修复上。出处：`.zcode/tmp/lane-uicov/result.json`。
- 选 A：加一档高 dpr 设备配置，重拍 `HOME-005` 与 `TMP-TOUR-R2-004`（这两条现在即使通道全活也判不了）。
- 选 B：接受这两条长期 `NOT_SHOOTABLE`，把它们从待办改成免检并记明理由。

## 10. 主包体积超微信上限，需要你定怎么瘦
本轮实测（体积车道，逐字节复算与门禁自报一致）：
- 被测物是 `apps/client/dist/build/mp-weixin`，它的 `env.js` 自证 `DEV:!1、PROD:!0、MODE:"mp-weixin-mock"` —— 也就是**mock 料的生产编译**，不是 dev 包。`verify-package-size` 那句"dev 构建豁免"是错名，豁免实际来自调用方挂的 `--allow-mock` 旗号（同一份字节：挂旗 exit 0，去旗 exit 1，所以门本身能红、不是自我放行）。
- 按发布形态的保留规则 dry-run 重建：主包约 **2.59MB**（若按 src 引用图分支统计 3.42MB），微信上限 2.00MB ⇒ **超约 0.59MB（+29%）**；`prune-unreferenced-static` 只能再删 0 字节，2.59 已是紧上界。
- 现在还能读到的是装饰图那类本地 raw 引用：头注写"约 7.7MB"，实测该目录 26.31MB，差 3 倍多，说明瘦身机制生效但还差最后约 1.23MB 的本地引用没断。
- 盘上另有 `mp-weixin-real`（27.67/28.71MB），但它跳过 `prepare-static --real` 与 prune，**不代表发布形态**，不能拿它定档。

需要你在三条路里选一条：
- 选 A：继续瘦身（把剩下约 1.23MB 的本地 raw 静态引用改成按需/远程），目标是发布形态主包压进 2.00MB。
- 选 B：承认真包就是超的，改分包结构（把页面挪进 subPackages），这是改架构不是改图片。
- 选 C：接受"这套产物不能直接上传"，把体积门的目标改成告警而非门禁，并在发布流程里写明必须另出发布档。

我没动这条门（按 (c) 类纪律），也没替你选。另建议（待授权，非本轮范围）：把那句在两条 ⚠ 之后仍打印的"✓ 验收通过：主包/总包体积合规"改成 `PACKAGE_SIZE_RESULT=WAIVED_MOCK|PASS|FAIL` 三态，免得人和面板都把它读成合规。

## 11. 五组游客落地对没有裁定，分诊台因此一直 exit 2
分诊台（`scripts/qa/triage-exec-failures.mjs:1089`）给的合法出路只有两条：进 `scripts/qa/guest-landing-policy.json` 的 `rows`，或补脚本里手写的 `LANDING_DISPOSITION`（:576，读取顺序在 :845 —— booked 复测腿优先于手写表）。往手写表里塞一句"放行"就是放宽判据，本轮没做。

缺裁定的五组（page → 游客实测 landing）：
1. `subpackages/campus/campus/index` → `subpackages/campus/campus/hub`
2. `subpackages/discover-extra/discover/matching` → `pages/discover/index`
3. `subpackages/village/village/tag-posts` → `subpackages/village/village/index`
4. `subpackages/setup/campus/index` → `pages/discover/index`
5. `subpackages/setup/recommend-pref/index` → `pages/discover/index`

**为什么这是你的决定而不是我的**：在册裁定是"游客不得浏览广场/内容流，未登录必须被引导到注册"，而 policy 里已有的行 family 都记 `guide-401`、landing 一律是 `pages/login/index`。上面五组**全部落在非登录页**，按字面读就是违例；但第 4、5 组是 setup 引导流程，很可能是"设计上就允许游客走完再注册"，那就是裁定范围要收窄，不是产品缺陷。这两条路我都能走，但都不该我选。

- 选 A：认定违例 ⇒ 开实现刀，把这五组在游客档改成引导到登录/注册（改的是产品行为，会影响现有 26 组/239 落点的实测数）。
- 选 B：逐组裁定"允许" ⇒ 我给 policy 补行，`family` 要写清机制（例如 `setup-flow-allowed`，与 `guide-401` 区分），并把在册裁定的文字收窄到"内容页与个人数据页"。
- 选 C：只裁 setup 两组允许，其余三组按违例开实现刀。

顺带一条同域但不用你决定的：`selectorsOf()` 丢非 BEM 选择器，把 `.btn-primary` 这类降级成 `FRAME_ONLY`（记在 `reports/audit/round-7/register-fieldinput-diagnosis.json`），属载具缺陷，待授权后单独修。另有一条 `CH12` 欠一次带 prestate 的 `--tap` 复跑（节点在 `hub.vue:215` 的 `v-if=!isVerified`，未认证身份才点得动），命名不等于结案。

## 12. round-1 那 144 帧没有 gitSha，要不要给个显式豁免
`reports/screenshots/round-1/manifest.json` 顶层没有 gitSha，144 帧无从核实 —— 这是 corpus 门现在唯一剩下的具名红。车道查遍六处出处都不给实名：自身字段无、`audit-report.md:5` 写的 `aefd8a72` 比这批帧晚三天（属冒充带，不能用）、同目录日志无、引用扫描 0 命中、`ops-provenance` 只覆盖 round-7；只剩"用 mtime 对 gitlog 推"这一条，推出来是 `281de531`，但那是推断，按铁律不许当成出处写进证据件。
- 选 A：给 corpus 门加一条 `LEGACY` 显式豁免（provenance 门已经有这个轴，实测读数 `PROV_FRAMES_LEGACY=144`），把"无从核实"从暗红变成有名有据的豁免类。
- 选 B：重跑这一批取证，用今天的带子重新出帧并打上真 sha（代价是 round-1 的原始状态早就不在了，重跑出来的不是当时那一轮）。
- 选 C：接受它长期红，写明"round-1 证据不可背书"，并把 round-1 的结论降级为不可引用。

## 13. 18 份在途 exec-* 清单要不要授权代跑
provenance 门剩下的红主要是 `PROV_FRAMES_PRE_STAMP=4867`，成因已定位：生产者 `exec-frames-to-corpus.mjs:67-68` 打的是"转换时刻 HEAD"而不是采集带（同一份文件里的 `resultsGitSha` 早记着真带 `e4495d67`；帧未入库，`at` 与 mtime 逐毫秒互证，不是 mtime 噪声）。生产者已修好并配了夹具（剥带 ⇒ 650 帧 FAIL；带在 ⇒ 650 consistent PASS），但这 18 份 `reports/audit/round-7/exec-*` 是别的车道正在写的未提交产物，戳记车道按边界没代跑，也没有任何 `reports/**` 被它改过。
- 选 A：授权对那 18 份代跑修好的生产者 ⇒ `PRE_STAMP` 归零、provenance 门有可能转绿（改的是产物清单里的戳字段，不改判决值）。
- 选 B：留给 exec/帧车道，由它们重拍或重建清单 ⇒ 慢，但每份清单由产出者自己背书。
- 现在盘上事实：`corpus --scope 本轮` exit 0；全量 corpus 仍 exit 1（只因第 12 项那一处断链）；provenance 仍 exit 1。

## 14. 一枚生产者退出溯源集合，要不要把它拉回来
`verify-rulings-landed.mjs:170` 那枚写死的 `deadbeef` 其实是它内嵌自检的负例夹具、并不往盘上写戳。车道把它改成运行时 sha1 派生后 `LITERAL_SHA 1→0`，代价是这条脚本退出了生产者集合（`PROV_PRODUCERS` 12→11）—— 门只统计"会写盘戳"的生产者。
- 选 A：就这样（它确实不产盘上戳，11 是诚实数）。
- 选 B：想让门继续盯着它，就把那个派生常量命名为 `GIT_SHA`（一行），它会重新进集合。
- 盘上按 A 落定；"能变红"已用临时探针证明过（真写死时门报 `PROV_PRODUCER_LITERAL` 且 exit 1，探针已删）。要 B 说一声就改。

## 15. verify-openqueue-lanes.mjs：修成真的门，还是归档
接线车道判它"不该接"，理由都在盘上：:22 写死 round-7、:90 无条件覆写 round-7 判决件，而全文 process.exit 出现 0 次 —— 实测它打完 OPENQ_RESULT=PARTIAL 仍然 exit=0。一条"说有事却放行"的门接进清单只会教人误信绿。
- 选 A：先修它（exit 码与判决一致、不再无条件覆写权威件、去掉写死轮次），再当门接；
- 选 B：当 round-7 一次性转换工具归档，不再按门看待；
- 已在 GATE_SUITE 留排除注释，防下一程又试着接它。

## 16. run-round7-closeout.mjs：唯一能答"stage-8 过了吗"的载具，现在没人跑
车道查实它 hasConsumer=false，但它**不是死批处理**：NOTES:4266 点名它的 queue-tally 是回答"stage-8 过了吗"的唯一载具。实测经它跑那两条新门可以红（ CLOSEOUT_RAN=1 红=1 → exit 1），也可以绿（RAN=2 红=0 → exit 0）。
- 选 A：经现有"收口守门员"接进工作流（推荐，因为它是门而不是转换工具）；
- 选 B：留在人工收尾时用，但得接受"stage-8 过了吗"这个问题每次都要手跑一遍才有答案。
