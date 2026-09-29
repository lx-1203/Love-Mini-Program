# 需你拍板的事（v3.3 续作轮，2026-09-29 02:51 落）

这一轮把所有能自己判的都判了，下面这些**不是一时没法子**，而是按项目铁律必须由你决定：改判据、改令牌值、删数据、接受"证据绑采集机"这四类都是政策选择，我不替你写。每条给了出处和可选项。

## 0. 用户已裁定（2026-09-29 06:20；下列四项口径已定，本轮按此执行）

| 原条目 | 裁定 | 落法 |
|---|---|---|
| 11（5 组游客落地对，含 matching→discover 与在册裁定相反） | **按裁定改实现** —— 5 组一律引导到登录/注册，setup 两组不豁免 | 实现刀动路由/守卫，随后落点账需重跑（26 组/239 行基线会变） |
| 10（主包约 2.59MB，超 2.00MB） | **继续瘦资源** —— 断剩余本地 raw 引用，不靠分包、不靠改判据 | 体积刀改引用图，目标发布形态主包 ≤2.00MB |
| 1/2/3/4/7（判据点了产品没有的东西、令牌值与判据正面冲突） | **一律按判据补齐实现** —— 不改判据、不降级断言，缺物件就补物件 | 实现刀分批；`--r-lg`/浅色同值这类改完会动视觉，需构建后帧级复核 |
| 5（证据可携两个轴） | **帧进 Git LFS + 清单绝对路径改相对** | 本轮只做相对路径那一半；LFS 涉及改历史，单独等授权 |

**仍未裁、保留在下面各条**：6（测试数据要不要清）、8（几百个非 png 文本 dump 入库与否）、9（高 dpr 档补不补）、
12（round-1 空戳：LEGACY 豁免还是重跑）、13（18 份在途 exec-* 是否授权代跑）、14（生产者集合 11 vs 12）、
15（openqueue 修成门还是归档）、16（closeout 驱动器接不接）。
第 17（面板重打 booked）与 18（分诊目录反推）按 A 案已在修，不再算待裁。

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

## 17. 面板每跑一次就重打一份权威判决件
`emit-round-report.mjs` spawn `verify-guest-landing.mjs --mode book` 时**不带 `--out`**，于是每跑一次面板就重打一次 `reports/audit/round-7/guest-landing-booked.json`（实测差异只有 generatedAt）。这与本轮已修的"账单阶段覆写自己依赖的事实源"是同一形状：门的读数随"谁在什么时候跑过面板"而变。
- 选 A：面板侧加 `--out` 指到 `.zcode/tmp` 侧车，权威件只由显式落盘动作改；
- 选 B：保持现状，但承认"booked 文件的时间戳不代表业务变更"，任何 diff 判读都要忽略 generatedAt。

## 18. 分诊台的判据台目录是从结果路径反推的
它按 `dirname(dirname(--results))/ops` 派生判据台位置 ⇒ **同一批语料换个目录就会换分类结果**。本轮那条 CH12 命名能核上，部分正因为语料恰好在预期层级。
- 选 A：改成显式参数（`--cellplan-dir`），调用点写死；
- 选 B：保留反推，但在门里加一条"派生目录不存在 ⇒ exit 2"的 fail-closed 断言（现在读不到判决表时是 `:517` fail-closed，派生层级错则未必）。

## 19. 那 5 组落地对仍是真欠账（与第 11 项同源，这里补一条新证据）
面板车道复核后确认其中 `matching → discover/index` 与既定裁定方向相反；policy 与处置表不在该车道的可写域，所以没有代填。第 11 项的 A/B/C 仍然有效，只是多一条：这一组不是"读数口径"问题，而是产品行为与裁定相反，选 A 的话要动实现。

## 20. 提交前自我纠一处我自己造成的文件损伤
上面三节第一次写入时用内联 shell 传字符串，字符串里的反引号被 bash 当成命令替换执行，
结果 `emit-round-report.mjs`、`--out`、`dirname(dirname(--results))/ops`、
`matching → discover/index` 这几个标识符在正文里被吃掉（留下"spawn  时不带 --out"这种缺主语的鬼话）。
已用不走 shell 的编辑通道逐字补回。记这条是因为：这正是本轮我纠过车道三次的同一类错
（写死条数、不存在的旗标、旧数字），只不过这次是我自己写的。
**纪律补一条：往文档里写带反引号的内容，绝不走内联 shell。**

## 21. 第 5 项的两处"传闻"已量成实测，结论比原记载更糟

- **JPEG 冒充 .png 不是个别现象，是 99%**：835 张已跟踪帧里 **826 张是 JPEG 字节挂 .png 名**，真 PNG 只有 9 张（`od` 出 `ff d8 ff e0 … JFIF`，`file(1)` 判 `JPEG image data … 373x820`；集中在 `r11-acceptance` 632 / `r9-lifecycle` 66 / `r7-final-verify` 36）。含义：**任何 sniff PNG magic 的校验会把 99% 的帧判成坏帧**，实际效果是逼人关掉校验；而 LFS 按扩展名迁移完全看不出问题 —— 于是"全绿"、谎原封带进新历史。**LFS 收得住"文件在不在",收不住"文件是什么"。**
- **改成相对路径治不了第二个洞**：`git ls-files reports/audit/round-7/tapfix-briefs/` = **0**，56 张 lane 产物全是未跟踪 ⇒ 干净 clone 现在拿到的是"路径正确、文件不存在"。所以第 5 项的"帧进 LFS"必须与"这些文本产物也入库"同批裁，否则可携性只做了一半。
- **绝对路径规模**：`reports/` + `scripts/` 下 133 个文件 / 5265 行含绝对仓库路径，其中 **4809 行在被跟踪文件里**（逐条登记在 `.zcode/tmp/lane-relpath/abs-scan.json`）。根因是一处分隔符写错并在 **20 个脚本**里复制：拼接键用了 `REPO + "/"`，Windows 上 `REPO` 是反斜杠形态 ⇒ 空操作、绝对路径原样漏进产物。反证在同族：`emit-tapfix-briefs.mjs:114` 用 `REPO + "\\"` 就正常。
- **有些绝对路径不能改**（改了会坏）：`TOUR_PROJECT`/`CLI_PROJECT` 12 处是原样喂给 DevTools `simulator_refresh --project` 的**执行输入**，不是证据引用；`real-e2e/provenance.json` 的 `rawOutput` 是命令逐字 stdout，规范化等于伪造取证；`ops/**` 的 `tapTargetEvidence` 是判据正文。

## 22. 一条会删无回滚产物的载具（本轮实测，未修）
`emit-tapfix-briefs.mjs:51` 有 `rmSync(OUT, {recursive:true})` —— 跑一次就把那 56 张**没进 git** 的 lane 产物整批抹掉，且没有任何回滚点。可携车道因此全程用独立模拟验证命名，没执行这个脚本。
- 选 A：给它加"目标目录含未跟踪文件 ⇒ 先自动打包/备份再清"的闸（与本轮戳备份同形状）；
- 选 B：把 56 张 lane 产物入库（与第 21 项第二条一起），让 rmSync 至少删的是可恢复的东西。
在选做之前，**任何车道跑它都等于一次性毁证**，这条按风险登记而不是当已解决。

## 23. 体积达标了，但"达的是哪一个口径"必须你认定
按你裁的"继续瘦资源"做完了：只改引用点、**0 个素材文件被删**（`git status` 在 `apps/client/src/static` 下删除数 0），15 个文件改动，把 61 项本地 raw 引用改指到项目**已有**的后端公开端点 `/api/v1/media/app-assets`（65 张已托管且字节一致，没有自定域名）。

复算结果（我自己跑的，不是车道自报）：发布形态主包 **2652.9KB → 1762.7KB（约 1.72MB）**，在 2.00MB 内，余量约 0.28MB；10 个相关 spec / 121 用例全绿；`build:mp-weixin:mock` exit 0。

但**同一个门去旗后仍然 exit 1**，读数是主包 27.78MB / 总包 28.82MB —— 因为 mock 链首步 `prepare-static --dev` 会用 `full-static` 整目录覆盖 `src/static`（实测三处字节完全相等），静态段大小与引用点无关。于是有三个不同的"主包"数字并存，得由你定哪个算数：

| 口径 | 主包 | 状态 |
|---|---|---|
| 发布形态（真实上传物） | **1.72MB** | ✅ 达标 |
| `src` 退化扫描（不含 static 覆盖） | 2.76MB | ❌ 超 0.76MB |
| `verify-package-size` 默认被测物（mock 档） | 27.78MB | ❌ 门红 |

- 选 A：把门的被测物与阈值改成按**发布形态**判（门从此量的是真上传物，mock 档另设或明写不判）；
- 选 B：保留三门并立，但在报告与门输出里强制标口径（现状是只印一个数，最容易读错）；
- 选 C：要 mock 档也降下来，只能改 `prepare-static` 的备份目录策略或删除 mock 装饰图 —— 两者都会动到本轮被明确钉为"不许删"的素材，需你单独放行。

## 24. 剩下 0.76MB 的最大单一来源：`utils/person-avatars.ts` 的 21 条强制收集 import
999,151B（person-01~21）。它是 09-03 / 09-12 两次"头像 404"修复留下的强制引用 —— 删掉它 `src` 退化口径立刻从 2.76MB 降到约 1.81MB，但可能把那两次 404 复发。
另有 `mascot` 组 23 张 / 311,678B 占改后剩余保留集的 81.5%，它在册钉死本地且是匹配/消息动效本体；`tabbar`/默认头像/功能 SVG 70,745B 属 `NEVER_DELETE`；这三项体积刀**故意没动**。
要不要为 0.76MB 动 `person-avatars.ts`，是"复发 404 风险 vs 达标"的取舍，交你定。

## 25. provenance 那 4886 张帧：三种改法我都量过了，**买不到绿**
终验读数 `PROV_FRAMES_PRE_STAMP=4886 / CONSISTENT=4154 / STALE=0`（`.zcode/tmp/final-verify/verify-provenance-all.log:1958`）。逐册看：19 份 manifest 的全部帧都是 pre_stamp，其中 18 份共用同一枚顶层 `gitSha=6fd151786c…`（提交于 2026-09-28T18:07+08），而帧的 `at` 是 2026-09-26/27 —— 归属晚于实物，这一条判红是对的。

根因不在转换载具（它已经修好了）：`scripts/qa/exec-frames-to-corpus.mjs:70` 现在逐行写 `bandSha`，`:82-90` 明写"顶层 gitSha 仍是转换时刻的 HEAD，两者不同是事实，不是造假"。真正晚到的那枚 sha 来自**更上游**——腿自己的 `exec-results.json` 就是在写盘时读 HEAD。实测新证据：`reports/screenshots/round-8-interact/manifest-detail.json` 行内 `bandSha=93650335`（该提交 2026-09-28T19:41Z），而 `shots[0].at=2026-09-28T19:13Z` ⇒ 转换载具诚实继承了一份本身就晚的 sha，19 张照红。

我写了门的判定复刻（`.zcode/tmp/prov-predicate-replica.mjs`），先让它**复现门的原数**才敢用它做投影：`MANIFESTS=47 FRAMES=9184 CONSISTENT=4154 PRE_STAMP=4886 STALE=0 UNRESOLVABLE=0 LEGACY=144` —— 与门逐字相同（第一版复刻漏看行内 `bandSha`，把 325 张跨带帧误算进 pre_stamp，差值恰是门注释里点名的那 325）。三种改法的投影：

| 改法 | CONSISTENT | PRE_STAMP | STALE | 门 |
|---|---|---|---|---|
| ① 不改（现状） | 4154 | 4886 | 0 | 红 |
| ② 顶层 `gitSha := 册内已有的 resultsGitSha` | 8697 | 19 | **324** | **仍红**（红换了类名） |
| ③ 逐帧按采集时刻归带 | 9165 | 19 | 0 | **仍红**，且 LEGACY 被抹成 0 |

③ 的"好看"是假的：它给 round-1 那 144 张本来**没有戳**的帧凭空造出一枚归属，那是造证据，不是修证据。②是唯一干净的（sha 是册子里本来就记着的腿自身的值），但它换来 324 张 stale —— 语义是"帧拍摄时 src 已有更新的提交"，这条判据同样判红，而且**它是真话**：那些腿横跨了改动。

所以这一门的绿只能靠：**(a)** 重跑这 19 册的腿（要设备时间，量级是十几个 leg 而不是几条），或 **(b)** 你给一个长期口径"转换带/跨提交带的历史帧不作产物级引用"——(b) 等于给门加一档 legacy，属改判口径，我不自决。**不需你裁定、我会做的**：把 leg 的 sha 改成在**腿起点**读（止住继续新造假归属），排在 UI 车道收工之后，跑中不改载具。

## 26. 纠正我写进库的一处错：命名闸**并不**拒作用域哈希
我给 VI09 落的 `notAutomatableReason`（已随 4727f38b 提交，在 `reports/audit/round-6/ops/次要22.json:802` 与 `scripts/qa/cellplan-round8-held4.json:10/:28`）写着"class 位只有作用域哈希，`apply-ops-cellplans.mjs:118` 只收 .class/#id"。**这句的机制是错的**：

- 实测 `/^[.#][\w-]+$/` 对 `.data-v-f489de86` 返回 **true**（Node22 直试：`.data-v-f489de86`、`.a_b-1`、`#mine-header`、`.vip-switch` 全 true；`switch`、`pages/home/index` false）。:118 拒的是**裸标签/标签链**，不是作用域哈希。
- 门的第二道 `nameInBands`（`apply-ops-cellplans.mjs:110-116`）要的是"每一档都逐字命中"，不是"必须作者手写的名字"。实测三档 `subpackages/vip/index.wxml` 里 switch 各 1 枚、类值同为 `data-v-f489de86` ⇒ 哈希连这道也能过。

所以 VI09 真正拦它的不是词表，而是：换组件就换哈希、**它不是作者可维护的名字**，以及同页两枚 switch 共用同一哈希时点不唯一（车道实测 settings/dnd/privacy 各 2 枚；vip 实测 1 枚，所以 vip 不含歧义）。这两处文字我会在 B7 落地的同一波里一并改口径，不单独留错在库里；判据正文不动。

## 27. B7「给 switch 补名字」是必要的，但**不足以**让那 7 条变绿
车道普查（`.zcode/tmp/b7-switch-inventory.md`）+ 我自己复核：`apps/client/src` 下原生 `<switch>` 共 **9 枚 / 6 文件**（12 处 `<switch` 命中里 3 处是 `env.d.ts` 的文档行），9 枚全部零 class、零 id、零 data-qa。受影响判据是 `ST05, ST06, PT25, DND02, DND03, PR05, VI09`；另 **CPT28 是同源的第 8 条**（不在那 7 条名单里），而 v33 桶里的第 7 条 **PFI28 不是 switch 行**（它卡的是 `.video-cta` 歧义）。

补名字之后仍拦着的，是**执行器只有两条腿**：`r-exec-cli.mjs:611-613` 实测只有 `element("input"|"tap", …)`，没有 `change`/属性读通道；而 9 枚 switch 编译出来全是 `bindchange`（vip 那份 wxml 逐字可见 `checked="{{s}}" … bindchange="{{w}}"`）。也就是说：判据要断言"开关处于开/关态"，执行器既不能稳定派发也不能读回状态。按车道结论，**光补钩子 0/7 确定可自动化**（PT25 现实可、ST05/ST06/DND02 只部分）。

这一条我不打算靠"把动词降级成 tap"来凑绿——MSG26/DND08/DC08/VI40 已明确记为不许换动词。要真收这批账，得给执行器加一条 change/属性读的能力（就是 followups 第 6 节第 4 条那三件"载具已有、只是没接线"的事），排在做完 §10 的落账之后。

## 28. CH22 只落了不依赖滚动裁决的那半，另半是三件事互斥，得你选一个解释
abs7 车道把 7 条"断言某物不存在"的判据换成了能判的非帧载体（判据正文一字未动，我已复跑：`SRC_SHAPE total=98 成立=98 不成立=0`、`SRC_SHAPE_NEG 注入点=33 已变红=33 咬不动=0`、`SRC_SHAPE_RESULT=OK`）。其中 6 条 DONE，**CH22 是第 7 条 = NEEDS_RULING**，车道没有替我选解释，我也同意不选：

同一条判据里三处互不相让：
- **ACTION 句**说"页级 window 滚动，非 scroll-view"；
- **expected 句**要"滚到底可见…以 `scrollTop/scrollHeight` 数值回填"——这是 scroll-view 才有的量，页级 window 滚动给不出这两个数；
- **盘上的第三个事实**：`apps/client/src/subpackages/campus/campus/hub.vue:269-271` 是 `<scroll-view class="campus-hub__feed" scroll-y :enhanced :bounces>`，一直开到 :334 ⇒ 底部文案确实在 scroll-view **内**。

所以"按字面补实现"在这条上不可满足：满足 ACTION 句就得把 feed 从 scroll-view 里搬出来（动结构、动滚动语义），满足 expected 句就得承认它是 scroll-view（那 ACTION 句为假）。我只落了**不需要这个裁决的那半**并让它可判：
`hub.vue:330-332` 底部块无 `@tap`/无箭头节点（模板里 `campus-hub__more-arrow` 0 命中，只剩 :768 那行死样式）、i18n 文案 `zh-CN.ts:3628 "更多校园圈持续接入中"` 无箭头字符、mock/real **两档** `hub.wxml` 各判 `absent(/⌄|campus-hub__more-arrow/g)` 实测 0/0。

请你三选一：**(a)** 承认它是 scroll-view，把 ACTION 那句当笔误（判据按 expected 的 scrollTop/scrollHeight 走，需要执行器加"读 scroll-view 数值"的能力）；**(b)** 要它变成页级 window 滚动（我把 `campus-hub__feed` 搬出 scroll-view，属结构改动，会牵动 :269-271 的 enhanced/bounces 行为）；**(c)** 拆成两条各判各的（无箭头/无可点 = 已落；滚动归属 = 另立新行）。

另记一条会咬人的漂移：CH22 判据正文引用的行号 `:336-339` 已经漂到 `:330-332`。判据里写死行号是定时炸弹，建议后续只写"锚点 + 类名"不写行号——但这属于改判据文本，得你点头才动。

## 29. `landingMissing=5` 不是产品欠账：分诊台在向一份"零行声明身份"的语料索要**游客**处置
先给复跑核对（我把 triage 钉到面板同一份输入，见 `emit-round-report.mjs:82` 的 `EXEC` 口径）：

| 读数 | 13:05（终局复量） | 现在（守卫车道之后） |
|---|---|---|
| total | 1107 | 1107 |
| unclassified | 0 | 0 |
| landingKeys | 9 | 9 |
| **landingMissing** | **5** | **5（逐字未变）** |

守卫本身已经生效并有物证：新腿 `reports/audit/round-7/exec-guest-real-guard-r10/exec-results.json`
顶层与逐行都写 `identity="guest"`、`band=real@f0677920`、156 行，五页 `observed` 全为
`top=pages/login/index` ⇒ **游客轴 1→0**，帧在盘。

那 5 组为什么不动：它们来自 `reports/audit/round-7/interact/exec-results.json`，
而我逐行数过 ——**这份语料 1107 行里 0 行带 `identity` 字段，`doc.identity` 也是 `undefined`**。
`triage-exec-failures.mjs:843` 于是把 `corpusIdentity` 落成 `"?"`，而 `:877` 的
`landingMissing = landingKeys.filter(k => !dispositionOf(k))` **不看身份**：
它照样向这份身份不明的语料索要"游客落地处置"。
换句话说：这一条红不是产品缺陷，是**门的判域越界**。车道拒绝把 5 组补进账本是对的
（补进去就是造账）；但它的理由"这是 A 档跑的"是从 `observed` 散文里推的，盘上没那个字段——
诚实的说法是"此处门无权判"，不是"A 档与我无关"。

**裁定已下（2026-09-29 14:5x，用户）：选 (b)，并强制附那条能变红的负例。** 已按此实现：
`triage-exec-failures.mjs` 逐组记下该组行**真的**声明了哪些身份（`items` 现在带 `identity`，
不再从 `observed` 散文猜），只有"整组行都无 identity 声明"才改记
`LANDING_IDENTITY_UNDECLARED=<组>` + `TRIAGE_LANDING_SCOPE= …UNVERIFIED-INSTRUMENT=yes`，不判红也不算结案；
只要该组有任何一行声明了身份，判红照旧。阈值本身没动（仍是 `landingMissing===0`），改的是"谁有权被数进去"。
负例是新文件 `scripts/qa/test-landing-identity-scope.mjs`（9 条断言全过，聚合器已按文件名自动收进来）：
声明 `guest` + 无处置 ⇒ **exit 2 且红句点名那一组**；同一语料剥掉 identity ⇒ exit 0、
`landingMissing=0 而 landingUndeclared=1`、且必须逐组点名（静默吞掉即红）；
两侧"看见的组数"必须相同 ⇒ 证明收窄只改判域、没让轴消失。
实现顺带撞出两处我自己的契约漏洞：`test-triage-dead-selector.mjs:162` 对 `gateFires` 做**全等**比键，
扩两个键就红（这是对的，期望已同步并注明"静默扩键才是真隐患"）；新测试第一版只印自家方言
`LANDING_SCOPE_TEST cases=…`，被聚合器判"无自报断言计数（不可信）"—— 聚合器认
`assertion failures = N` 与 `*_TEST=` 两种写法（`run-qa-selftests.mjs:45-49`），必须照其一印，
否则"绿等于没测"。路 (a)/(c) 不再执行；那 5 组的产品级归属仍等 §29 之外的语料重拍。

当时摆出的三条路原文存档如下（(b) 已执行，另两条留作日后若改口径的参照）：
- **(a) 重拍带身份的切片**：对那 5 页用 `--identity guest` 与 `--identity A` 各跑一条腿，
  让 9 个 key 变成可归属；游客那批会落 `FAILED-guest-gate-by-ruling`（词表在 `:305` 已备），
  登录态那批走 `SKIPPED-identity-scope`。代价：两条腿的设备时间，**不改门的任何判定**。
- **(b) 给门加一道前置**：语料零行声明身份 ⇒ 不raise `landingMissing`，改打
  `LANDING_IDENTITY_UNDECLARED=1107` 并判 `UNVERIFIED-INSTRUMENT`。
  这是**收窄论断到它能归属的那批人**，不是降阈值；但它是改门的口径，所以要你点头。
  附条件：必须同时加一条能变红的负例——一份**声明了** `identity=guest` 的语料里留一组未入账落地对，
  门必须照旧 exit 2（否则 (b) 就成了把红藏起来）。
- **(c) 维持现状**：这条红长期挂着，我在总报告里如实写"5 组落地对无法归属，守卫在游客轴已证"，
  不拿它当产品失败，也不拿它当已结案。

顺带一条同源事实（不是新账，是同一病根的另一处）：`verify-real-coverage` 已经在量这个形状——
本轮 `REALCOV_IDENTITYLESS_ROWS=31`、`REALCOV_IDENT_VOCAB` 还抓到 `not-logged-in` 与 `none`
是"有判点无生产者"的死词。**一个门认这个字段、另一个门不认就去索要处置**，这个不对称本身就是 §29 的成因。

## 30. 状态对账（2026-09-29 16:2x；上面 0–29 节原文一字未改，现状态只写在这里）
要查历史说法请看本文件的 git 旧版，不要相信下面这段的转述。

**已闭（盘上有证据）**
- **#17 已闭，但我先前报小了。** `ea3bd785` 只把 `verify-guest-landing --mode book` 的落点改侧车；
  面板自己**另两发写权威件的调用一直漏着**：`emit-round-report.mjs:620` 不带 `--dry`
  （`verify-source-shape.mjs:25` 的默认 OUT 就是 `cellplan-source-shape.json`，而那份是**下游输入** ——
  `ui-queue.round7-final.json` 点名它，`rerun-round7-slices.sh`/`round7-post-b-slice.sh` 也引它），
  `:662` 不带 `--out`（`verify-evidence-holes.mjs:17` MODE 默认 judge、`:144` 无条件写 verdict，
  而全仓没人读回它 —— triage 在 `:649` 自己从行里算 evidenceHoles）。
  实测 r4 面板跑完这两份文件各多一行 M，且 diff 只有 `generatedAt` 一个字段。
  commit `6e5bfd38` 按同一口径修完：判定、参数语义、退出码一字未动，只改落点。
- **#18 已闭**：`triage-exec-failures.mjs:507/511/521-524` 有 `OPS_EXPLICIT` 开关与
  "派生分支目录不存在 ⇒ 红"的 fail-closed；现值自报来源
  （`opsFromCorpus=true`、`ops="reports\audit\round-7\ops"`、`opsRenameEntries=1107`）。
  残留：反推那一支仍是默认行为，只是不再静默。
- **#19 被 #29 取代**：原文写"5 组仍是真欠账"。本轮实测推翻该归因 —— 那 5 组所属语料
  `reports/audit/round-7/interact/exec-results.json` **1107 行里 0 行声明 identity**
  （`doc.identity` 亦 undefined）。守卫本身已在重建后的 real 档上以逐行 `identity="guest"` 证得 5/5→登录。
  原文保留，判定以 #29 为准。
- **#21 / #26 / #27**：都已把"传闻"换成实测，并纠了我自己的错引
  （`:118` 词表其实**接受**作用域哈希；命名必要而非充分）。
- **#29**：(b) 已落地并配能变红的负例（`test-landing-identity-scope.mjs`，9 断言全过），
  `emit-round-report` 在 r4 实测**转绿**（`EMIT_RESULT=OK 全部源可读、全部守恒断言通过`）。
  **(a) 那 5 组的产品级归属仍开着，等带 `--identity` 重拍。**

**本轮正在跑、暂不结案**
- **#15** showcase 覆盖 mock 共享产物 → 车道 #15（独立 `UNI_OUTPUT_DIR` 出口）。
- **#22 已修**（`emit-tapfix-briefs.mjs`：所有权 = 根层 `NN.json` **且**内容也必须是载具形状；外来的保留并打
  `TAPFIX_KEEP_FOREIGN=`；删前先整批逐字节验备份；撞名 `exit 3`；另修了无视 `--out` 的打印）。
  复验：`rmSync(OUT,{recursive:true})` 已不存在（只剩逐文件删），负例 `NOTWIPE_TEST=PASS checks=18`，
  聚合器 `SELFTEST_RESULT=PASS` exit 0。
- **#22 的暴露面数字，我在本节上一版写错了，在此纠正**：我写的是"删的是 git **已跟踪的 7 个**文件
  （不是我原先记的 56 个未跟踪产物）"。**这句是错的，原记载反而是对的。**
  实测：`git ls-files reports/audit/round-7/tapfix-briefs | wc -l` = **0**，`git status --short` 该目录是
  `?? …/tapfix-briefs/`（整个目录未被跟踪）；盘上该目录共 **66 个文件**（含子目录；顶层 20 项）。
  我那个"7"是另一条命令的产物 —— `git ls-files reports/audit/round-7 | grep -c tapfix` = 7，
  数的是**父目录**里的 `tapfix-*` 文件（6 个 `.applied` + `tapfix-merged.json`），**正好在 wipe 目标之外**。
  错法记录：把"路径前缀相近的两次计数"当成同一件事，且没看 `git status` 给的形式（`??` 已明说未跟踪）。
  这个错数还被我写进了车道任务书，是车道复核时纠正的 —— 也就是说我差点让它按错前提改代码。
  危险方向也要说清：**真正被抹的是 42 份手写复核结果**（未跟踪 ⇒ 无 git 可回滚），
  比"已跟踪"的版本更糟而不是更轻；我当时那句"更严重一档"的推论一并作废。
- **执行器能力**（#27 结尾点名的那把刀）→ 车道 #16：toast 钩子搬运（`evaluate` 已在
  `r-exec-cli.mjs:25` 导入，可行）、pullDown/longpress 派发出口；网络计数/条件注入属真新代码，
  只调研不硬造。车道约束里写死 **MSG26 / DND08 / DC08 / VI40 不许换动词凑绿**。

**仍等你裁定（一条都没替你选）**
#1 #2 #3 #4 #6 #8 #9 #12 #13 #14 #23 #24 #25 #28，以及 #29 的 (a)/(c)。
其中三个能直接解掉现存的三条红：**#12**（corpus 唯一红源）、**#25**（provenance，
三种改法实测都买不到绿）、**#13**（代跑 18 份在途清单 —— 那也是 real-coverage 那 10 条欠账的主要解法）。

**一条必须提前说清的代价**
`TAP_RE` 那把刀把判域从 705 放宽到 **719（新增 14 条，含 DND08）**。这些行以前"没人发交互却记 EXECUTED"，
下一轮真跑会第一次真的去点 ⇒ **可能冒出一批新失败**。那不是回归，是被静默吞掉的账第一次露头；
我不会为了让数字好看把它们预先标成免检。

## 31. 36 条 CRITERIA_NAMES_NOTHING 的去向已经跑完，顺带纠出一台**假仪器**（2026-09-29 20:4x）

r7→r8 这一段做的是裁定"一律按判据补齐实现"在 36 条 CNR 行上的落地。**判据正文一个字没改过。**

### ① 七条 B 类（可照字面补）：6 条早已在盘，第 7 条今天补上
`DND02/DND03/ST05/ST06/PT25/CPT28` 六枚原生 `<switch>` 的作者类名不在我这一轮改的——它们在盘上，
且**两档产物都带着**（实测：9 枚 switch 全部有 authored class，页内唯一命中，mock 与 real 的 wxml 逐枚一致）。
`PFI28` 是今天才真的动：`pages/profile/index.vue` 三枚 `.video-cta` 同名 ⇒ 邀请入口点不到
（首匹配落在录音那枚）。加 `video-cta--invite` 一枚修饰类，判点从 0→1：
改前 `bare=3 invite=0`、改后 `bare=3 invite=1`，两档 wxml 各命中 1 次，
并把这条钉进 `native-switch-naming.spec.ts`（该 spec 8→9 tests）。
**这份绿不是"能测了"**：执行器仍没有 `change` 这条腿（§27 那句仍然成立），且 DND02 的
expected 里那半条网络计数谓词要靠下面的 `--net-count` 才谈得上可判。

### ② 七条 A 类（判据断言的是"不存在"）：全部改走非帧载具，最后一条今天入册
`H13/N10/CI22/MT21/CS26/PFI41/CH22` 先前已在 `verify-source-shape` 的 SPEC 里；
`LG31` 是唯一没去向的（它点名的 `#login-sms-code` 已被 `MP-R2-PAGES-LOGIN-INDEX-015` 整删）。
今天入册后实测：`SRC_SHAPE total=98→99 成立=98→99 不成立=0`、负例注入点 `33→42 全变红`。
连带纠出一处**过期夹具**：`test-source-shape-absence.mjs` 把判据行数写死成 `== 7`，
名册合法增长到 8 就红。处置是**登记 LG31 进名册**（棘轮：少一条红、冒出一条没定案过的也红），
不是把 `==` 松成 `>=`——松比较就是 §29 那类"把红藏起来"。

### ③ 二十一条 C 类（物件在，缺的是载具能力）：拆成三种去向，不许混成一句"测不了"
- **接上了**：`--rapid`（rapidTap×N 逐次计时，窗口没守住仍拒发）、`--scroll`（页级 `wx.pageScrollTo` +
  scroll-view 的 `scrollOffset` 回读，判点取自"scrollTop 动没动"而不是"调用没抛"）、
  `--geom-pos`（boundingClientRect 的 left/top + scrollOffset 进 geometry）、
  `--net-count`（逐时刻请求计数，走 `uni.addInterceptor('request')`）。
  自测 `EXEC_SELFTEST cases=67→92→97 bad=0`，且每条新通道都配了会红的负例（我用摘除式变异实测过
  `netGap` 那一支：改坏后 `EXEC_SELFTEST=FAIL bad=1 exit=1`，改回即 PASS）。
- **仍缺原语、如实记拒发**：`swipe` 的三点带位移序列、原生 Modal 里"选哪个选项"的驱动、断网/500 故障注入。
- **今天新发现的结构性缺陷**：见 ④。

### ④ 今天最要紧的一条：`--native-capture` 的 toast 半边是一台假仪器，而它一直在打零分
`r-exec-cli.mjs` 的注释与结论行此前写着"钩子包的是 `wx.*`，`uni.showToast` 最终落到 `wx.showToast` ⇒ 覆盖得到"，
并在开钩子时打印"「toast 文案在本项目量不到」这句话从本腿起不再成立"。**两句都是错的**，实测三条独立证据：
1. 编译产物里 `uni` 是 `Fr=Vf(Zf,tp,ji)`，get-trap 默认分支 `Tn(i, r(i, n[i]))`，`n=ji=Hi()`
   是**启动期把 `wx[t]` 逐名按引用拷死**的快照（`vendor.js +230990`）⇒ 之后再换 `wx.showToast`，
   `uni.showToast` 调的还是快照里那个；
2. CLI 的 `automation.evaluate` **只有 service 上下文**（一个 `Page={}` 空壳，无 App、无全局逻辑层），
   应用代码在 appservice worker 里 ⇒ 实测 `installed:false / hooked:false` 恒成立，钩子根本没装进对象；
3. 应用侧 586 处 toast 调用全是 `uni.*`，**0 处直呼 `wx.*`** ⇒ 这条通道对本项目一件都采不到。
反证也在盘上：`globalThis.wx===ji`（两名字同一对象）时钩子就会亮 ⇒ "采不到"不是普遍规律而是本通道的形状。

**为什么这条比一条判据红更严重**：行上 `toast:""` 会被下游读成"这一条判据的窗口里页面没弹 toast"，
于是"没弹"变成产品缺陷——**是仪器在被告，不是 app**。今天已改口（三处打印 + 行内
`nativeCapture/consoleScope` 的出处声明 + `evidenceGaps` 的两条文案），并加了判点：
Toast 类判据要证据请走 **WS 腿**（`r1-exec.cjs:217-218` 的 onConsole、`:278-299` 的 installToastHook，
那份实现跑在 AppService 上下文里，实测抓到过含 `appservice.log` 的 8 条）。

顺带纠两处**车道自报的错**（我核过才写）：#10-d 说 "`addInterceptor` 在产物里 0 命中、恒 false"——
实测三档产物各有 **2 处命中**，且 `ko` 对象上明写着 `addInterceptor: tf` ⇒ 网络计数通道不需要重建产物；
它真正的限制是 ④ 那条上下文问题，装不上时如实报 `no-uni/no-addInterceptor` 并逐行记欠账，绝不交出假零。
我自己也在 brief 里把 `b7-switch-inventory-r10.md` 写成了 `b7-naming-report.md`——**在提示里点符号名，
就得自己先跑一遍 grep**（这条教训早就在账上，我又犯了一次）。

### ⑤ 令牌冲突族：能补的补了，两句互相矛盾的交给你
`AppShell` 水平内边距 28rpx→**32rpx** 按判据补齐，连带把耦合的负边距/吸顶行内边距一起改齐
（只改一侧会造出新错位），实测编译产物 `AppShell.wxss` 里 `padding:0 32rpx` 命中 2 处、`28rpx` 0 处；
出处三条（`round-6/issue-matrix.md:28`、`--page-padding:32rpx` 及其 12 个消费者、spec §1.4）。
**但 decisions-v33:37-39 引用的 `APPSHELL-005` 在仓里 0 命中**——那个编号不存在，值是三条独立出处顶住的，
引用缺陷一并登记。两条**必须你裁定**、我不动实现的：
`MP-R2VIS-PAGES-MESSAGES-INDEX-002`（判据要游客可见 `/recommendations/people` 计数，
与"游客必须被引导去登录/注册"的生效裁定正面冲突，且 `messages/index.vue:374` 的 `!useMock()` 让它在 mock 档不可测）；
`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001`（判据点名的"九宫格上限常驻提示"产品里没有，
spec §3.14 既没给元素也没给文案，而且它写的 0/1000 与在跑的 500 相互矛盾）。

## 32. 2026-09-29 21:41 用户裁定四项（原文 0–31 节一字未动，裁定只写在本节）
本轮 r9 续作起跑前向用户交还的待拍板清单，用户已答复四项。逐条照录裁定与由此派生的动作，
每条点名车道，不替用户扩写范围：

- **#13 授权代跑 18 份在途 exec-\* 清单**（用户选项「授权代跑」）。派生动作：车道 L7 先只读普查
  这批准入（band/身份从**各自声明字段**取，不从目录名推），产出 SHOOTABLE_NOW / NEEDS_REBAND /
  NOT_SHOOTABLE 三态与"能关掉 real-coverage 哪几条欠账"的保守对照；设备腿排在产物重建之后。
  **⚠ 本条授权的前提已被实测推翻，见 §32.1 —— 用户是在「它是那 10 条欠账的主要解法」这句话的
  前提下选的，而今日实测它是 0 条。授权范围是否延伸见 §32.1 的重述。**
- **§11(a) 游客腿成员来源**（用户选项「整页游客断言即可当证人」）。派生动作：车道 L6 改
  `verify-guest-landing.mjs` 的成员派生——整页都是游客断言的页，其游客行自动算证人；
  **必须**配一条能变红的负例（声明了 guest 却无名册落地对的组照旧 exit 2）。
  明确不采用 (b)：不给 RP 行补 `identities:["guest"]`，不动 ops 语料、不动判据台 canon。
- **#25 provenance 4886 帧 `pre_stamp`**（用户选项「记为已知历史红，每轮如实复量」）。
  派生动作：**不**买绿、**不**重打历史戳、不改判据；每轮终验继续把该数原样复量并归因。
  这条红在 r9 之后仍应为红，这是裁定的预期结果，不是回归。
- **§9 `profile-svg-to-png`**（用户选项「授权修：产物移出 src 并确定化」）。派生动作：车道 L9
  改构建链与 src 的关系，改完按 mock → real:isolated → showcase:isolated 顺序重建三档，
  逐档 grep `MODE:` 复核（不看构建退出码），并量 `git status --short apps/client/src` 必须为空。

**一处我自己报错的读数，在此纠正并留痕**：我在 21:36 向用户说"DevTools 自动化通道已在 real 档架好，
9420/9430 实测 LISTENING"。端口确实在听（netstat 实测 `0.0.0.0:9210`、`127.0.0.1:9410/9430`，随后
`9420` 也进监听），但**这句话把"在听"当成了"可驱动"**：我把命令接了 `| tail -25`，取到的 exit 0 是
`tail` 的退出码而不是脚本的，脚本自己打的是
`WS_UP=FAIL reason=端口 9420 在 19s 起就在听，但自动化会话在 150s 内没准备好（connect 后取页失败 34 次，
最后一次观测：Cannot read properties of undefined (reading 'split')）`。
⇒ 自动化腿当时**不可开拍**；加大 `--wait` 或先把项目窗口开一次再接通道，是脚本自己给的下一步。
教训与既有那条同族（管道状态是 `tail` 的）：**架通道这件事的凭据只能是 `WS_UP=OK` 这一行，不能是端口表**。

### 32.1 r9 实测推翻本节 §32 的两条前提，并补记用户后续三项裁定（2026-09-30 00:45）
本小节是 §32 的**事实纠偏**，不改写 §32 原文（原文留作"我当时是怎么错的"的记录）。

**(1) #13 的前提不成立：那 18 份"在途清单"在盘上对不上任何测量。**
L7（只读普查）实测：`reports/audit/round-7/exec-*` 是执行器的 **`--out` 结果目录**，不是清单容器；
清单输入在 `reports/audit/round-6/ops/*.json`，`--manifests` 是**名字过滤器**不是路径（`r-exec-cli.mjs:83/1132/1390`）。
36 个 glob 项 = 3 个 `.md` + **33 个目录**，其中 30 个有内容充实的 `exec-results.json`、3 个完全为空
（`exec-guest-login-r8`、`exec-guest-mock-r7final`、`exec-guest-tap` ⇒ 没有可跑的东西）。
`manifest-detail.json` 是**下游**转换产物（它自己的 `harness` 字段指向它消费的结果件），
所以它不能当"已跑/未跑"的判别式 —— 11 个确实跑过的目录里它反而缺席。**"18" 这个数字来源不明，作废。**

**(2) 两个授权对 real-coverage 那 10 条欠账各关 0 条（L4 与 L7 两条独立车道同数）。**
- `grep -c "guest-landing" scripts/qa/verify-real-coverage.mjs` = **0** ⇒ 覆盖门**根本不读** `guest-landing-{booked,measured}.json`，
  它只认 exec 行上的 `band/identity/status`。所以"待 #17 的设备腿授权"这句归因（`followups-v33.md` §10 表）
  的收账价值今日实测是 **0 条**，不是 10 条。
- `REALCOV_NEVER_ON_REAL=0` ⇒ 这 10 条**在盘上都已有 real 档行，且全部 SKIPPED**；13 个目录（含
  `exec-real-coverage-*-r9` 这一批补救腿）都声明了它们在内 —— 跑过，跳过了。
- 10 条里 8 条缺 login 轴、2 条缺 login+guest（`次要20|OT06`、`次要21|OC09`）。
⇒ `followups-v33.md` §10 的归因与本节 §32 的"主要解法"说法**都不成立**；两个说法并存于此，数附在车道件里。

**用户后续裁定（2026-09-30 00:45，三项）**
- **F-04 授权修词界**：`r-exec-cli.mjs:60` / `r-exec-ws.mjs:391` 的 `DENY_TAP` 把"清空输入框"当账号级动作拦了，
  误拦 `次要18|TD03`、`次要20|OT09`。L7 实测 **TD03 不需要任何设备能力，只坑这一处改就能跑**。
  派生动作：验收车道按上下文区分"账号级清空"与"清空输入框"，并**必须**配一条能变红的负例
  （真账号级动作照旧被拦）—— 白名单是安全边界，收窄不许顺手放宽。
- **10 条欠账逐条按可采性分流**：TD03 走 F-04；`VB03` 转 showcase 档（它自己的 `pre` 就写着展示版，real 档会重定向）；
  `VRN07` 需未成年真身份 ⇒ 登记不可采；其余 7 条（原生模态 PFI25/OT05/OT09、故障/网络注入 VI34/OC09、逐例配方 VI25）
  逐条写明成因后记 `NOT_SHOOTABLE`。**红不靠换动词或标免检来解除。**
- **3848 帧盘上截图的删除：用户确认"不用管，这是我选的"** ⇒ 不恢复、不改判据、不为此重打证据。
  直接后果如实落账：`test-evidence-store-axis` 因此转红（仓外库背书、盘上无物，`PROBLEMS=0 基线 P0=2`），
  `verify-ledger` 因 `70472d92` exit 1（提交信息自称"260 个文件"，**L15 实量 118 个 —— 我先前照抄了 260，按实测纠正**）。
  该红的因果已被 L15 用对照实验钉死，不是推断：同一条未改动的门、同一 argv，跑在 `git archive 70472d92^` 的镜像上
  ⇒ **exit 0、孤儿 0**；跑在当前盘上 ⇒
  `LEDGER_RESULT=FAIL（71 个 ID 全轮次矩阵均无本尊行，账实不符；另有 5 条非 ID 截断串待改源头写法）` exit 1（未接管道亲验）。
  71 条逐条有归属：**71/71 是被删掉的"佐证文档"**（64 个字面 token + 1 个 cluster 锚 `MP-R2-MSG-001-002 @ baseline/regression-index.json` + 6 个别名指向 `round-2/*`）；
  **0 条来自截图删除，0 条内容违例**（形状轴逐字节相同：`DATA_ROWS=236`、`OFF_SCHEMA/ROTATED/VOCAB_BAD=0`）。
  ⇒ 这条红**不是台账写坏，是台账还在引用已被 hygiene 提交抹掉的东西**；解法要么恢复那 7 个文件（L15 消融实量：可让 71→0 并 PASS），
  要么重指向（等于重建 71 行），两者都**隐藏 provenance**，只有"语料缩水断言"这条是加信息的。选哪条归人。
  **同一轮里 L15 还量出一处更该警惕的静默盲区**：`verify-evidence-corpus` 对着 3848 张被删帧**只看得见 2 张**
  （其余没有被任何 manifest 点名），却照印 `PROBLEMS=0` PASS。车道 L16 正在把"分母/缩水"做成具名读数。
  另：`prove-gates-can-fail` 会因这条链路把自己的 FAIL 读成纯传播（它 `baselineExit!==0` 即判 INCONCLUSIVE）。
  这两条都进 §33 与终报的读数口径。
  ⚠ 由此派生一条硬规矩：**本仓禁止 `git checkout -- .` / `git restore .` 这类全仓还原** ——
  它会复活用户刚删掉的 3848 帧。要还原只能按**具名路径**逐条动。

**一条车道事故，如实记**：验收目标 §9 的车道 L9（`profile-svg-to-png` 产物移出 src + 确定化）在 **150 轮上限中断**，
盘上留有**未验收**改动：`apps/client/scripts/profile-svg-to-png.mjs`、`apps/client/scripts/prepare-static.mjs`、
`.gitignore`（新增 `apps/client/static-generated/` 忽略条，理由是 `.gitignore:91` 的 `!/**/avatar*.png` 白名单
会把该目录里的 `avatar-ring.png` 重新放行成未跟踪脏项）。它中断前发现一个真缺陷：
`cpSingle` 吞掉了 Windows 的伪错误、而它的 seed 函数对此**报谎**。⇒ 这条**不能记为已完成**，派验收车道接手。

**编号漂移登记（引用时必须带前缀）**：本册 §17 = "面板重打权威判决件"（D-17，§30 记已闭）；
`followups-v33.md` §11 与各轮终验里"待 #17 的设备腿授权"指的是**游客落地设备腿**（G-17）。
两者同号不同事；本册此后用 `D-17` / `G-17` 分写，避免用户按错号裁定。

## 33. r9 收口流水（2026-09-30 01:4x；编排亲验，非车道自报）
本节只记**我已经自己复跑过**的事；车道自报但未复验的一律写在"待补"里，不当已入账。

**已验收**
- **§9 构建确定性（用户授权修）—— 经 L12 验收后成立**，且我逐档自己 grep 过 `config/env.js`：
  mock `MODE:"mp-weixin-mock"` / real `MODE:"real"` / showcase `MODE:"mp-weixin-showcase"`，三档各自归位、无串档；
  `git status --short apps/client/src` **0 行**（这正是授权要买的东西：src 不再是构建输出）。
  L12 另修了一处 `prepare-static.mjs:104-114` 的 `cpSingle` 吞 Windows 伪错误（读覆盖写回：`cpSync` 抛"操作成功完成"
  而旧字节留在盘上），负例 `NEG_EXIT=1`、真伪错误仍放行 `POS_EXIT=0`。今天两条调用点都写新建 stage 目录 ⇒ 属排雷，不属救火。
- **§11 游客腿拦门 —— 用户裁定 (a) 已落地**，我自己跑 `--mode book` 亲验：`BOOK_EXIT=0`、
  `GUEST_LAND_ROSTER 组=28 … 成员行次合计=445`、`GUEST_LAND_OPS_ENTIRE_GUEST=1 组 / 11 行`、`GUEST_LANDING_RESULT=OK`。
- **两条"建了没人跑"的门已接**（编排亲跑后再接线）：`verify-case-automatable --results`（自证轴此前三个调用点
  一个都没喂，"假阳性率未量"是结构必然；现量 FP 83.3%／硬口径 47.1%／召回 12.1%，`CA_AGREE_CONSERVE …=102 校验=ok`）；
  `verify-ops-corpus-stamp --check`（判据台语料戳，此前只在车道"自己记得跑"里；本跑 `canon=0fef00d141e7 / cases=1107 / 零漂移` exit 0，
  且在 HEAD 连动三次的情况下仍是 0 ⇒ 不是 sha 敏感门，标签因此刻意不含 "corpus"，避开 :561 那条复量子集）。
- **real-coverage 那 10 条已逐条给去向**（用户裁定"按可采性分流"，L14 落账后我自己复跑那条门确认**逐字节未变**：
  `CASES=236 UNCOVERED=10 COVERED=198 EXEMPT=28 NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=10`）：
  `NEEDS_CAPABILITY` 7（PFI25 VI25 VI34 OT05 OT06 OT09 OC09）· `NEEDS_BAND_CHANGE` 1（VB03→showcase）·
  `NEEDS_IDENTITY_IMPOSSIBLE` 1（VRN07，它自己的 `pre` 就承认没有 birthDate）· `DISPATCHABLE_NOW` 1（TD03）·
  `NOT_SHOOTABLE` 0 · **免检 0 条、identities 与 ops 字节 0 改动**（这条是本节最要紧的一句：分流没有关掉任何红）。
  ⚠ **F-04 授权的产量被 L14 实测下调**：TD03 即使 DENY_TAP 收窄，它自己的第⑥步「断网」撞上恒拒的 `networkFault`
  会整例 SKIPPED（`:1560-1567`），输入值还硬编码 `123456` ⇒ **光修词界很可能关 0 条**。这是本轮第二条
  "授权前提被高估"，与 §32.1 的 #13/#17 同族，以后要授权前先量产量。
  去向的**机器件无处可落**：仓里没有消费它的工具（最接近的 `emit-openrow-register.mjs` 键的是 `MP-*` 台账行、
  读者是 `verify-frame-debt-coverage`，不是这条门）。要落地只有两条路：扩那张 register 的键并给这条门加读者，
  或新建一个具名载具。这属于改判域/加工具，**归你或归我下刀，不由车道顺手改**。

**一处工具造成的证据销毁，已还原，并派生在修的缺陷**
G-17 那条腿我按裁定 (a) 放行后开跑：预检过了、租约拿到了，却在 `clearSession`（`cli-automator.mjs:349` ←
`verify-guest-landing.mjs:271`）抛 `cant find runtimeid by projectpath …mp-weixin-real` 而死，`MEASURE_EXIT=1`、
**落盘帧 0 张**——可它已经改了权威账本：`rows` 从 **28 行变成 `[]`**，`generatedAt`/`repeat`(1→3) 被重打。
**一次没产出任何证据的失败测量，把上一轮的真实测量抹掉了。** 处置：我跑前留了
`.bak-prer9-20260930-011844`，已从该具名备份还原并核 `RESTORED rows= 28`、sha256 与备份全等。
根因两条分开写清：(i) 触发是我的编排错——我 01:06 接好通道，L12 **01:07:18 重建了 real 档**，
IDE 对该路径的 runtime 绑定随之失效，正是本仓"每轮重建之后必须重接设备腿"那条老规矩；
(ii) 缺陷在载具自己——失败/零行路径不该无条件覆写账本。修法与能变红的负例交给车道 L17
（"失败或零行的 measure 不得缩减/覆写既有账本；缩减必须显式具名旗标"），并在守卫落地前不重试那条腿。

**终验前必须知道的读数口径（本轮已实测，不许当噪声）**
- `verify-ledger` 现红：`LEDGER_RESULT=FAIL（71 个 ID 全轮次矩阵均无本尊行…）`，因果由 `git archive 70472d92^`
  镜像对照钉死（改前 exit 0／孤儿 0）。71 条全是被那次 hygiene 提交删掉的佐证文档，0 条来自截图删除、0 条内容违例。
- **`verify-evidence-corpus` 对 3848 张被删帧只看得见 2 张，却印 `PROBLEMS=0` PASS**（L15 量）——
  盲区正在由 L16 补成具名分母读数；不改判据、不把你选的删除判成默认红。
- `prove-gates-can-fail` 遇上游红会读成纯传播（`baselineExit!==0` ⇒ INCONCLUSIVE），本反空转检查器本轮部分失效。
- 离线聚合器 01:08 那一发是红的（4 失败 + 2 条没印判据行），四条我已逐条归因：
  torn read（L12 重建窗口）、端口占用、你的删帧（既定后果）、以及 L16 正在改 corpus 门的过期夹具。
  ⇒ **r9 终验必须在所有车道收工后跑**，否则读数不可归因。

**待补（现在是状态，不是遗漏）**：L13（F-04 词界收窄）、L16（语料分母读数）、L17（腿写盘守卫 + 重接重试）
三件收工后，其读数与负例证据进本节；r9 十八步→十九步（新接一条）终验与 §7 由
`gen-round8-report.mjs` 机器回填，我不手填任何数。

