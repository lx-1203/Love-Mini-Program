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

**已落地并有读数**
- **F-04（L13）已按裁定收窄，且比账面更严重**：那条 `DENY_TAP` 不是两份而是**三份副本**
  （`r-exec-cli.mjs:138`、`r-exec-ws.mjs:391`、`shoot-frameplan.mjs:479`；我任务书里写的 `cli:60` 是 import 行，错了）。
  L13 把两条被授权的载具收敛到新单一真值源 `scripts/qa/deny-tap.cjs`，`shoot-frameplan` 因输入不同
  （`note+selector`）**留作具名欠账**，没有顺手统一。规则一句话：「清空」按宾语判——判据文本就地指出
  `<input>`/`<textarea>`/`v-model=` 且清的正是那个框才放行，否则照旧拦。
  全语料前后对照：`DENYTAP_CORPUS cases=1107 refuse_before=32 refuse_after=30 released=次要18|TD03,次要20|OT09 newly_denied=(none)`
  ⇒ **只放出被点名的两条，没有一条新拦**。双向负例：临时放宽会漏放 `PR05/HS07/SE05/CPT33`（`leaked=4, over=26`），
  改回后 `DENYTAP_TEST=PASS`、聚合器 `发现 36→37`、`EXEC_SELFTEST=PASS cases=97 bad=0`。
  TD03 **仍未代跑、仍未记通过**（本册只记"可Dispatch"，不代替腿产出结论）。
- **#16（`run-round7-closeout.mjs` 没人跑）本轮第一次真跑**，只读档（默认不写盘、写盘类步骤要 `--allow-write`、
  启动前逐个 `existsSync` 核步骤名、有腿持租约就拒启动 —— 这几条我已读源码确认，不是听它自报）：
  `CLOSEOUT_RAN=20 红=3`，`CLOSEOUT_RESULT=ATTENTION 收尾计划跑完；终报与提交在 --with-report 之后`。
  其中一条红的读数值得单记：`LANDING_IDENTITY_UNDECLARED subpackages/discover-extra/discover/matching → pages/discover/index`
  —— 该组 5 行**无一声明 identity**，所以这一轴"不判、也不"（并标 `UNVERIFIED-INSTRUMENT=yes`），
  即 §29 收窄后的行为在真载具上是成立的：它不拿零声明去索要处置，也不把它算成绿。
  ⇒ 这一发的结论是**"stage-8 类问题现在有读数了"**，不是"stage-8 过了"：3 条红腿各自带原因。

**待补（现在是状态，不是遗漏）**：L16（证据语料分母读数，此刻正在改 `verify-evidence-corpus.mjs`，
mtime 04:44 起有动）、L17（游客腿写盘守卫 + 重接重试 —— 该文件自 00:30 起未动，守卫尚未落地，
所以那条腿**还没重试**）三件收工后，其读数与负例证据进本节；**r9 十八步→十九步终局复量当前那份是暂定读数**
（红 6，HEAD 前=后=491210dd，但它跑在 L13/L16/L17 在途期间，我的静默判据把"文件 39 分钟没动"误读成"车道收工"），
车道全部落地后必须复量；§7 由 `gen-round8-report.mjs` 机器回填，我不手填任何数。

## 34. 2026-09-30 用户裁定三项（"将所有问题解决"当次）+ 逐项落地（原文各节一字未动）
- **3a 台账 71 条孤儿 → 登记退役、具名报数（不恢复被有意删除的凭证，不重建行）**。已落地 `6e3420ec`：
  新增 `scripts/qa/derive-ledger-retire-register.mjs`（凭证靠逐字搜索删除前的 18 份 blob 定；literal 找不到的
  用仍存活的 `round-6/ledger-notes.md` 里簇锚/别名行补并标 `via`；找不到的一律不登记），产出
  `reports/audit/round-7/ledger-retired-vouchers.json`：**71/71 有凭证 = literal 64 + alias 6 + cluster 1**
  （与 L15 独立量出的分布逐字一致）。`verify-ledger` 读它：`LEDGER_RETIRED=71` 逐条具名，
  硬失败只看未登记那部分，**PASS 行也带退役数**。双向已验：带件 PASS(exit 0)／移开件 FAIL exit 1。
- **3b 覆盖欠账去向件 → 建具名件 + 面板加读者**。已落地 `6e3420ec`：`reports/audit/round-7/incident-destinations-round10.json`
  （L14 那份 10 行件入库）+ `emit-round-report` 新增 `EMIT_DESTINATIONS` 行，校验"行数与门实测 UNCOVERED 相等 /
  去向在词表内 / `blocker` 非空"，任一不成立进 ERRORS。实测 `rows=10 gate_uncovered=10 dispatchable=1
  tally={NEEDS_CAPABILITY:7,DISPATCHABLE_NOW:1,NEEDS_IDENTITY_IMPOSSIBLE:1,NEEDS_BAND_CHANGE:1}`。
- **item 4 非本会话未提交改动 → 保持原样、登记归属待定**。这些改动（DSL/gen-round8/run-final-verify/run-qa-selftests/
  verify-package-size）**仍在树里且未提交**，其中 `run-final-verify-v33.sh` 的 +14 行**新增了两条我没见过的门**
  （`verify-carrier-wiring`、`verify-lane-report-complete`）并都读红 ⇒ 任何终验读数里这两条红**归它们**，不归本轮车道。

**同批修掉一处既存缺陷（与上面裁定无关，是被测试带出来的）**：`emit-round-report.mjs` 的 `LIVE_SKIP_WHY`
在原文件里"先赋值后声明"⇒ **任何 `--dry` 调用都在 :114 TDZ ReferenceError 崩在启动处**；而静态门
`verify-dry-no-lease` 只审守卫形状、审不出运行时崩，所以这条路径一直是坏的、没人发现。已改为先声明后赋值并复验
（`--dry` 现在能跑到底，只剩"G7/G8/G9/probe 未复跑 ⇒ 按缺证据处理"这条设计内的告警）。

**一处我自己的污染，作废两条读数**：19:0x 那发十九步终验（红 8）**不可引用** —— 它是在 sweep 进行中我编辑
`emit-round-report.mjs` 导致的（面板那一步读到改到一半的文件，报出 10 条"缺理由"其实是我字段名写错），
叠加上述两条外来门；重跑的那发才是本轮终值。教训与既有那条同族：**门禁跑到一半不许改门**。

## 35. r10 收口流水（2026-09-30 12:3x；编排亲验，非车道自报。上面 0–33 节原文一字未动）
⚠ **编号更正留痕**：本节原写作 `## 34.`，与同册第 569 行另一会话的 `## 34. 用户裁定三项` **同号**——两会话并行写同一工作树、
各自从 §33 之后接笔所致（那次会话的 §34 未反向引用本节子节，已实测：命中 0）。此处**只把编号 34→35、本节内自引用同步**，
正文一字未删改；第 569 行那节保持原样。撞号本身按本册体例不抹除，就记在这里。
本节只记**编排方自己复跑过**的事；车道自报而未复验的写在 F 段"待补"里，不当已入账。门数一个都不手填，
终局复量读数一律走 `run-final-verify-v33.sh` → `.zcode/tmp/final-verify/summary.json` → 生成器回填。

**A. 起跑时实测到的三条在途缺口（§33「待补」的续账，逐条可复跑）**
- `grep -n 'DENOM' scripts/qa/verify-evidence-corpus.mjs` **只命中该文件第 28 行那条注释本身**——注释声称
  "新增 `CORPUS_*_DENOM_*` 具名读数"，代码里没有。⇒ 又是一例"自述与盘上不符"，与 `#25` 那台假仪器同族。
- `grep -rn 'measured-ledger' scripts/` **0 命中**：`measured-ledger.mjs`（128 行，`ROW_POLICY="merge-never-shrink"`）
  建好了没人 import ⇒ §33 记的那个病灶（一次 0 帧产出、`MEASURE_EXIT=1` 的失败测量把 28 行权威账本抹成 `[]`）
  在 12:03 时点**仍然无人挡**。
- `reports/audit/round-7/gate-recheck-v33.json` 与 `post-commit-gates-v33.json` **两份都不在盘上**，而 DSL
  `:548/:591` 明确会写它们 ⇒ 事实是**这场 DSL 从未跑到过那两个 persistJson**，只有 bash 载体产过 `summary.json`。
  如实记这条不是为了追责，是因为 `gen-round8-report.mjs:14-15` 读它们时缺件默认 `null` 并印
  「（未跑，故此处不留结论。）」——它不静默填绿，所以**报告里那两格是诚实的空白，不是被抹掉的账**。

**B. 编排亲验读数（Node22 `D:/codex-tools/node-v22.17.0-win-x64/node.exe`，全部未接管道取退出码）**
- corpus 门（在途码 × 无 `QA_EVIDENCE_STORE`）：`exit=1`，`CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47
  CORPUS_PROBLEMS=2`，两条 PROBLEM 是 `exec-a-mock-final/manifest-detail.json 共 650 帧 :: 帧不存在=3` 与
  `reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144`；`CORPUS_SHA_CLASS
  resolvableOlder=46 unresolvable=0 empty=1 :: frames resolvableOlder=9040 unresolvable=0 empty=144`；
  `CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144 打戳约定起点=2026-09-24T16:31:39.000Z`。
  ⚠ **口径必须钉死**：r9 那份 summary 记 `verify-evidence-corpus exit=0`，跑的是 bash 载体——仓外库
  `D:/6/love-mini-evidence` 实测存在，`run-final-verify-v33.sh:23-25` 会 `export QA_EVIDENCE_STORE` 走
  reachable 支；我这两发是 unconfigured 支。**同一道门跨载体不是同一次测量**，两格之差不得读成回归。
  收口后要量满三格（在途码×有库 / 在途码×无库 / HEAD 码×有库）才能谈差值。
- r9 暂定基线（盘上件直读）：`headBefore=headAfter=491210dd`、19 键、红 6（`prove-gates-can-fail`、
  `run-qa-selftests`、`verify-ledger`、`verify-ledger-after-panel`、`verify-provenance-all`、
  `verify-real-coverage`），其中 `verify-evidence-corpus=0`。
- 产品账（`reports/audit/round-6/issue-matrix.md`，mtime 09-29 02:03，按 `status` 列前缀归类，共 **238 行**）：
  已修复 127 / 保留-判据不成立 38 / 并入-不另立案 26 / 不立账 17 / 回归核对类 19 /
  **未结案 9**＝待修复 2（一条 `needs_backend`、一条需排 UI 帧）+ 已修复待复验 3 + 待复验 1 + 未取证 1 +
  未取证/需裁决 1（后者即 `#7` `village-publish-001`）。
  ⚠ 另有 2 行 `status` 装的是非状态串（`为什么不新增行`、`---`），是 markdown 说明行/分隔被当数据列；
  §33 曾记"5 条非 ID 截断串"，我这次按前缀口径量到 2 条，**差在归类口径**，不以我这次计数去改判据——
  以 `verify-ledger` 自己的具名读数为准。
- 客户端与后端实测：220 个 `.vue`（pages+14 分包共 73 个页面文件）、**121 个 `*.spec.ts`**（`*.test.ts` 0 个），
  `apps/client/tsconfig.json:20-25` 的 `exclude` 含 `src/tests/**/*` ⇒ 这 121 个 spec 全不在 `vue-tsc` 射程内；
  后端 `127.0.0.1:8080/actuator/health` = `{"status":"UP"}`。
- 分支账：全仓 371 个提交，本地领先 `origin/main` **4 个**、落后 0 ⇒ 仍按"仅本地落账、不推送"执行。

**C. 纠偏（本册体例：只新增、不回改原文）**
- **`docs/` 那条"预期红"作废**。旧记载称 252 个跟踪文件删除未入库、`test:structure` 与 openapi lint 按设计为红。
  实测：`git status --porcelain -- docs` **零行**，`git ls-files docs` = 9 = 盘上 9，最后一次变动是
  `cc540a6e docs: restore openapi specs dropped in root-dir cleanup (unbreak CI openapi gate)`。
  ⇒ 根级三道门 `lint` / `lint:openapi` / `test:structure` **不在预期红名单里**，今后若红就是真红，不许拿这条旧账放过。
- `#13` 正文写 `PROV_FRAMES_PRE_STAMP=4867`，而 `#25`/§33 写 4886：差 19 恰是 §25 点名的 19 张 round-8-interact 帧。
  两条在各自时刻可能都真，但并排读起来像同一量互相打脸 ⇒ 引用 provenance 红数时**必须带时刻与 log 出处**。
- `#5`（证据可携）两个轴要分开重述：**绝对路径轴已自愈**——`reports/audit/round-7/tapfix-merged.json`
  （mtime 09-29 12:16，即 `#5` 写下之后被重写）的 `lanes` 是 array[56] 且逐条为仓内相对路径，遍历全件绝对路径 **0 条**；
  只剩 `.json.json` 双后缀这一轴还活着。**像素轴的分母要钉**——`.gitignore:61` 是 `reports/screenshots/`、`:70` 是 `*.png`，
  但 HEAD 实际跟踪 `reports/**` 下 **10,425 个 .png + 32 个 jpg = 10,457 枚**（早于 ignore 规则入库者仍被跟踪），
  所以原文"干净 clone 一条都打不开"对这 10,457 枚**不成立**。⇒ `#5` 的 A/B/C 要按"一轴已闭 / 一轴仍在 / 一轴分母已变"重述。
- `#24` 的数**证实**：`apps/client/src/utils/person-avatars.ts` 2717 字节、恰 21 条 `import`；
  同口径下 `src/static/**/person-NN.png` 21 个、合计 **999,151 bytes = 0.953MB**，与原文逐字相符。
  我第一次用 `*person*` 宽口径数到 31 个 / 1,421,234 bytes —— **那是我口径错，不是册子错**，按纪律先纠自己。
- **两个载具里的"手填数字"已与盘上脱节**：DSL `:648` 的未覆盖面句写「实测 **117** 个 spec 不在 vue-tsc 范围内」，
  同口径现量是 **121**；bash `run-final-verify-v33.sh:53` 注释写「GATE_SUITE 现有 **12** 条」，而 DSL `:635` 那句
  早已改成插值取长度 ⇒ 散文里那个 12 是漏改的第二处。处置原则：判据/阈值/退出码一律不动，只把手填数字换成插值或由机器行供给。
- **§30:338 那句"仍等你裁定"漏计 5 条**（逐节对照原文得出）：`#5`、`#7`、`#10`、`#11`、`#15` 至今都明写着"需要你定"，
  其中 `#10` 卡的正是**能不能上传**；而它列的 14 条里已有 7 条被 §32/§33 与 `bc89dc79`/`138c366b` 关掉
  （`#2` `#4` `#13` `#16` `#23` `#25` `#29(a)`）。⇒ **真实开放集合约 14 条**：既不是 `round8-final-report.md` §6 那个
  "34 项"（那是 `gen-round8-report.mjs:20` 把每个 `## N.` 标题都当拍板项、`:79` 直接印 `decisions.length` 的**标题数**，
  我加本节它就变 35，L21 正在修分类器），也不是 §30 那句"16 项"。
- **编号漂移再加一条硬规矩**：跨册引用一律带册名前缀（`decisions #N` / `followups §N`）。本册 §32 那句
  「§9 `profile-svg-to-png`」指的是 `followups-v33.md` §9，而本册 `#9` 是高 dpr 巡检帧；§30:318 那句"正在跑 #15"
  指的也是 followups 那一侧的 showcase 覆盖问题，不是本册 `#15`（`verify-openqueue-lanes.mjs` 修门还是归档）。
  已有的 `D-17`/`G-17` 前缀规矩与此同源。

**D. 编排下刀一处（措辞，判据与退出码一字未动）**
`scripts/verify-package-size.mjs:106` 那句「← 以上数字只代表上面那个档，不是发布形态」原是**硬编码常量**，
real 档也照印，与同一脚本 `:16`「发布形态由 real 构建（无 `--allow-mock`）执行严格主包 ≤2MB 门禁」互相打脸。
已改成按 `bandMode` 条件化三态（未知档位 / real 档 / 其余档）。A/B 实测（盘上三档产物，未重建）：
real 严格档 改前 `exit=1` → 改后 `exit=1`（现印"本档是发布形态门禁的调用对象；但只有走 `build:mp-weixin:real`
（含 `prepare-static --real` 与 prune）出的档才是发布形态，这份 prune 过没有本门不判"）；
mock 挂 `--allow-mock` 仍 `exit=0`；mock 无旗仍 `exit=1`（门不自证）；showcase 标
`MODE:mp-weixin-showcase API:real SHOWCASE:on` 并正确印"不是发布形态"。消费者核查（限定 `scripts/`）只命中产生
那行字的 `:106` 一处，无程序化消费端；`ruling-packet-r9.md:257/:346` 与其 JSON 是**当日测量记录**的逐字引用，
按本册体例不改历史，此处记一句"该措辞已按档位条件化"即可。
**未证部分如实标注**：`MODE:未知` 那一支没有夹具实测（要造一个缺 `config/env.js` 的假 dist），属结构可核而非实测。
⚠ 这条对 `#10` 有直接后果：`#10` 里"发布形态主包 ≈2.59MB、瘦到位 1762.7KB=1.72MB 已在 2.00MB 内"那组数
**今天在盘上复现不出来**——三份 dist（mock / real / showcase）都不是 prune 过的发布档（实测主包 27.67/27.78MB）。
⇒ 选 A（继续瘦）/ B（改分包）/ C（降成告警）之前，必须先按 `:16` 那条构建路径重出一次带 prune 的发布档，
否则三条路都是在对着复现不了的数讨论。此数在 §35 记为**未复现**，不当已核。

**E. 车道事故与接手（如实记，不掩盖）**
L16 / L17 / L18 于 **12:34 被服务端异常打断**（`error: unknown, unexpected agent result status`），三处半成品留盘：
corpus 门已改 + 负例已建、报告 7 节全「（待填）」；`verify-guest-landing.mjs` 已变 M（说明守卫真接上了）+
writeguard 负例已建 + 运行前具名备份 `guest-landing-measured.json.bak-r17-20260930-121557`（备份纪律照做了）、
报告 8 节全「（待填）」；`verify-carrier-wiring.mjs` 等三件已建，但 **DSL 与 bash 两个载体都不在 modified 列表里**
⇒ 接线那步根本没做。已按"按组重派"开 L16b / L17b / L18b 接手，任务书要求**先验收半成品再决定去留**，
并明确"增量落盘是硬要求"。
⚠ 这一手把本册 `#25`/§31 那台"假仪器"的病在 15 分钟内复现了三回：**代码写了、报告空着、没有任何门会红**。
根因已定位在 DSL 自身的分野——`:447/:455`「交互腿」prompt 写着「增量落盘是硬要求：车道 agent 有轮次上限
（实测 150 轮会被截断），先把骨架写盘，之后每完成一行立刻更新」，而 `:415/:417-421`「收口车道」prompt
一个字都没有，车道撞上限就只走 `:422` 的 `askFail`。⇒ 派生两件事：① L20 的收件清单必须把"车道死了但产物存在"
当 **blocking** case；② 该句增量落盘要求由编排方补进收口车道 prompt（改完必跑 DSL 语法自检 + `dryrun --profile all`）。

**F. 待补（现在是状态，不是遗漏）**
六条车道（L16b / L17b / L18b / L19 / L20 / L21）收工后才跑 r10 终局复量；§7 读数由机器回填，本册不手填门数。
键数预期从 19 涨到 20+（L18 的 carrier-wiring、L19 的 real-coverage-disposition、L20 的 lane-report-complete 各自
按收工实况接线），条数以 `GATE_SUITE` 为准、不在散文里写死。
⚠ **接线时必须点明的一条**：L19 的门名含 `real-coverage` ⇒ 会**自动落进** DSL `:577` 那个 sha 敏感子集
（`corpus|provenance|band-freshness|real-coverage`），提交后复量条数随之 +1；这是对"去向账是否随产物变"的正确行为，
但要在对账表里写清，别让人读成"莫名多跑了一条门"。
另：`#11`/`#29` 那批待拍板项此后要在本册里做成**机器可读块**（具名 `PENDING_RULINGS` 逐条带编号与出处），
让生成器读它而不是数标题——这一步要等 L21 的分桶器落地后做，否则两边各写一套会漂。

### 35.1 用户 2026-09-30 12:43 裁定两项（上面 0–34 节原文一字未动）
- **`reports/screenshots/**` 那 3849 个 D 状态：不入库。** ⇒ 直接后果如实记账：
  ① 本轮及后续提交一律走**显式路径清单**，禁止 `git add -A`/`git add .`，也禁止 `git checkout -- .`/`git restore .`
  （后者会复活用户刚删的帧，§32 已立此规矩）；
  ② `verify-ledger` 那 71 条孤儿引用与 corpus 门那 144 条 `帧不存在` **保持为红**，
  不恢复、不重指向、不改判据——它们是"不入库"这个选择的**已知后果**，不是待修缺陷；
  ③ 终报里凡引用盘上截图处均须带"本机采集态"限定，干净 clone 不含这些字节。
  ⇒ 交还清单里的"新·3849 帧要不要入库"一项**就此关闭**，选的是"不入"。
- **其余按最优建议执行。** 我把这句的作用域**只按在收口动作上**，因为本册铁律是"需拍板事项只列不做"，
  而判据冲突/令牌值/视觉口径属政策选择，不属收口：
  **授权我做的**——显式路径本地提交（不推送，延续 `不推送` 指示）、新门按 dsl-gate-sync 三条接进两个载具、
  §7 由 `gen-round8-report.mjs` 机器回填、把 `:455` 那句"增量落盘是硬要求"补进 DSL 的收口车道 prompt
  （改完必跑语法自检 + `dryrun --profile all`）、体积门措辞刀（已在 §35 D 段做完并留 A/B 证据）。
  **仍交还你的**——§35 F 段之前那 15 项 + `#5`/`#12` 的口径重述后版本；
  **我不做的**——删除两枚陈旧 worktree/分支（不可逆，且不在"收口"范围内），只给建议：留着无害，
  真要清就逐条 `git worktree list` 指名后再动。
- **一条实测风险登记**：r9 的暂定读数件已被我快照为 `.zcode/tmp/final-verify/summary-r9-provisional.json`，
  因为 `run-final-verify-v33.sh` 的 `OUT` 目录是固定的，下一发终验会原地覆写 `summary.json`——
  没有这份快照，§35 B 段那条"19 键红 6"的差值归因就失去可比对象。

### 35.2 停点与续跑规程（2026-09-30 12:47；编排回合预算耗尽，此段是状态，不是遗漏）
**此刻在盘上的事实（逐条可复跑，全部 Node22、未接管道）**
- 六条车道在途，产物状态：`wiring-gate-r18.md` 143 行 / 0 待填（L18b 实质收工，且**已自行把
  `verify-carrier-wiring` 接进两个载具**：DSL +19 行、bash +8 行）；`leg-writeguard-r17.md` 37→67 行（L17b 增量回填中）；
  `lane-report-complete-r20.md` 427 行 / 14 待填；`corpus-blindspot-r16.md` 仍 32 行 / 7 待填；
  `uncovered10-disposition-carrier-r19.md` 与 `report-buckets-r21.md` 尚未创建。
- 聚合器收件分母实测 **42** 个 `^test-.+\.(cjs|mjs)$`（HEAD 跟踪 36 + 未跟踪 6）。
  ⇒ 终局复量里 `run-qa-selftests` 的 `发现=` 应读 **42**；若比 42 大，说明有车道把临时变异体留在了 `scripts/qa/`，
  那是要点名的事故，不是"多测了几条"。**小于 42** 则是有车道的负例没落进收件目录＝没接线。
- 只读门全量复量在后台跑（`tmp/r10-readonly-gates.sh`，日志与退出码只进 `tmp/r10-gates/`，
  **不写 `reports/**`、不覆写 `.zcode/tmp/final-verify/summary.json`**）；
  它把 `verify-evidence-corpus` 量了**两格**（`-storemode` 与 `-nostore`），因为同一道门跨载体不是同一次测量。
- 车道前的独立基线（编排亲跑）：corpus 在途码×无库 `exit=1 / CORPUS_PROBLEMS=2`；
  real-coverage `exit=1 / COVERED=198 / UNCOVERED=10／236 / 免检 28`，且
  `REALCOV_UNCOVERED_LEDGER=OK 点名=10 欠账=10 判据外=0`，十条缺腿轴＝8 条 `login` + `OT06`/`OC09` 两条 `login+guest`。

**续跑的固定顺序（顺序本身是判据，别并到前面去）**
1. 等六条车道全部回报；在此之前**不跑面板、不提交**（面板 `emit-round-report` 会抢 UI 租约并 spawn 三十来条实时门，
   与 L17b 的设备腿并发＝互相污染；提交会推 HEAD，会抽掉 L16b 取 `git archive` 改前读数的脚）。
2. 车道收工后跑 `bash scripts/qa/run-final-verify-v33.sh`（1800 秒面板腿 + 面板后 `verify-ledger` /
   `verify-state-truth` 两条复量），产出新的 `summary.json`。
3. 与 `summary-r9-provisional.json`（19 键、红 6、`headBefore=headAfter=491210dd`、`verify-evidence-corpus=0`）
   做**逐条差值归因**，每条红点名成因；键数会因新门接线而涨，**条数以 `GATE_SUITE` 为准，散文里不写死数字**。
4. 按 dsl-gate-sync 三条（name 以 bash 门名结尾 / 实参与 bash 逐字一致 / `timeoutMs ≥ bash 秒×1000` 且只准往大调）
   验收 L18b 的接线，并追加 L19、L20 两条；⚠ **L19 的门名含 `real-coverage`，会自动落进 DSL `:577` 的 sha 敏感子集**，
   提交后复量条数随之 +1，要在对账表里写清，别让人读成"莫名多跑了一条门"。
5. 把 DSL `:447/:455`「交互腿」那句**增量落盘硬要求**补进 `:415/:417-421`「收口车道」prompt，
   随后必跑：语法自检（`parseDiagnostics` 期望 0）与 `dryrun-workflow --profile all`（期望 `DRYRUN_RESULT=PASS` 3/3），
   两条都未接管道取退出码。
6. 补产 DSL 契约件 `gate-recheck-v33.json` 与 `post-commit-gates-v33.json`（§35 A 段实测两者从未落盘，
   而 `gen-round8-report.mjs:14-15` 会读它们；缺件时它印「（未跑，故此处不留结论。）」，是诚实空白、不是绿）。
7. `node22 scripts/qa/gen-round8-report.mjs` 机器回填 §7 与 §6 分桶 ⇒ **编排方一个数都不手填**。
8. 显式路径本地提交、不推送；**绝不 `git add -A`**（3849 个截图 D 状态按 §35.1 裁定不入库），
   也绝不 `git checkout -- .` / `git restore .`（会复活用户刚删的帧）。
   清单至少含：`scripts/verify-package-size.mjs`、L13 的 `deny-tap.cjs` / `r-exec-cli.mjs` / `r-exec-ws.mjs` /
   `test-deny-tap-field-clear.cjs`、五条车道各自的门/负例/报告、两个载具、裁定册与本文件。
9. 提交后再量一遍 sha 敏感子集，落 post-commit 件；由绿转红的归因为"HEAD 被本轮提交推进"，不写成本测物退化。

**本轮已交还、不许我替你做的**：§35 C 段那 15 项 + 本轮新增三条（陈旧 worktree 清理属不可逆、只给建议不执行；
`verify-evidence-holes` 的 judge 分支仍无条件覆写权威判决件，改它属判域）。

**停点后补记（12:48，只读复量第一发落地，改写了 `#12` 的归因）**
`verify-evidence-corpus`（跑的是 L16 那版在途码，L16b 尚未接手）**两格已测出**：
- × **reachable**（`QA_EVIDENCE_STORE=D:/6/love-mini-evidence`，与 bash 载体同形）⇒ **`exit=0`**，
  `CORPUS_RESULT=PASS（无不可背书证据；legacy 无戳清单=1 帧=144 …）`（该行被我只留 80 字截断，续跑者取全文看
  `tmp/r10-gates/verify-evidence-corpus-storemode.log`）
- × **unconfigured**（裸跑）⇒ **`exit=1`**，`CORPUS_PROBLEMS=2`，其中一条就是
  `reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144`
⇒ **结论**：那 144 帧的"帧不存在"红**是库轴没接上造成的，不是新增的证据销毁**——同一批帧在仓外库可被唯一背书。
所以 `#12` 重述时要写成：round-1 144 帧仍是"无戳可核的 legacy"（`LEGACY_NO_SHA=1/144 帧`，两格都在印），
而**"帧不存在"这一条只在无库格出现**；把它当产品/证据新账来追就是追错方向。
同理 §35 B 段那条"r9 记 corpus=0 vs 我测 corpus=1"的差值，**主因已定位为库轴而非码轴**（在途码在两格分别给 0 与 1，
而 r9 那一发是 HEAD 码×有库）——第三格（HEAD 码×有库）仍需复量才能收口。

### 35.3 一条车道事故的如实记法（12:49；这条比读数更要紧）
12:34 我同时收到 3 条 `error: unknown, unexpected agent result status` 失败通知（L16/L17/L18），
按本仓既有纪律"服务端瞬时拒答按组重派"立刻开出 L16b/L17b/L18b 接手，任务书写的是"前任死于异常、留下半成品"。
**15 分钟后原 L18 自己回报了完整交付**：新门 `verify-carrier-wiring.mjs`、双向负例 25 断言、
DSL + bash 两载体接线（bash `:65 g verify-carrier-wiring 180 …` ↔ DSL `{name:"载体接线零消费者门 verify-carrier-wiring",
args:["scripts/qa/verify-carrier-wiring.mjs"], timeoutMs:180000}`，三条对齐口径齐、实测 wall ≈3 秒 ⇒ 180 秒有 57 倍余量）、
报告 321 行。而 L18b 的任务书前提（"接线那步根本没做"）因此是**错的**，它正准备把同一条门再插一遍。
处置：12:49 `TaskStop` 掉 L18b。事后核盘：两载体 mtime 仍是 12:35/12:36（原车道写入），
DSL 里 `verify-carrier-wiring` 的 2 次命中是**同一条目的 name + args**、bash 1 次，非重复插入；
`parseDiagnostics=0`、`bash -n` exit 0 ⇒ **未写坏，但属侥幸**（接手车道还在验收阶段就被停）。
⇒ 派生两条硬规矩（已同步进跨项目编排记忆）：
① **失败通知 ≠ 代理已死**。重派前先复查"交付态"：它名下产物是否在**通知之后**仍在长、共享载体是否已被它改过。
② 接手车道的"前任留了半成品"是断言，任务书必须写成**"先验收，若前任其实已交付则立刻收手回报"**。
③ 一旦发现原车道回报，主控第一动作是停掉接手方，而不是等它做完。

**L18 这一刀带出一条新的具名红（终局复量要按新账读）**：该门首跑即点名两枚"建了没人跑"的活体死件——
`WIRING_DEAD_ITEM path=scripts/qa/emit-component-scoped-ids.mjs 导出=parseScoped 消费者=0` 与
`WIRING_DEAD_ITEM path=scripts/qa/run-round7-closeout.mjs 导出=reconcileQueueTally 消费者=0`，
`WIRING_RESULT=FAIL（死件=2）`、`GATE_EXIT_UNPIPED=1`。**豁免清单 0 条**——车道论证是把这两条入账换绿等于掩盖，
它们都是"文件头写明了该被谁吃、盘上零调用点"。⚠ 特别记一句：`run-round7-closeout.mjs` 正是 `decisions #16`
那把"唯一能答 stage-8 过了吗"的载具，§33 记它本轮第一次真跑；**载具跑过 ≠ 它的导出有人消费**，两件事别混。
另：车道如实报出 `发现=39 → 42（差 +3 而非 +1）`，并按文件名集合差归因为"本车道只贡献 1 枚，另 2 枚属并发车道"——
这是本册要的记法，采纳；它同时给出 §35.2 分母 42 的第二条独立来源（聚合器亲印）。

### 35.4 编排接线：`verify-lane-report-complete` 接进三个登记点（12:5x，L20 交付后由主控串行追加）
L20 这道门交付时**只有实现没有消费者**——正是本册 §35 A/E 两段反复在拆的形状。接线三处全由编排方改（车道未动载体）：
- `scripts/qa/run-final-verify-v33.sh` ⇒ `g verify-lane-report-complete 60 scripts/qa/verify-lane-report-complete.mjs
  --intake reports/audit/round-7/lane-report-intake-round-7.json --exemptions reports/audit/round-7/lane-report-exemptions-round-7.json`
- DSL `GATE_SUITE` ⇒ `{ name: "车道报告骨架完成度 verify-lane-report-complete", args:[同实参], timeoutMs: 90000 }`；
  按 dsl-gate-sync 三条核过：name 以 bash 门名结尾 ✓、实参逐字一致 ✓、`90000 ≥ 60×1000` 只往大调 ✓；
  名字不含 `corpus|provenance|band-freshness|real-coverage` ⇒ 不会被提交后的 sha 敏感子集重复捞（它读报告字节）。
- `scripts/qa/run-qa-selftests.mjs` 的 `GATE_SELFTESTS` ⇒ 追加
  `{ name:"verify-lane-report-complete", cmd:[…,"--selftest"], want:/LR_SELFTEST=PASS cases=(\d+) bad=0/ }`。
  ⚠ **这是 L20 替我补出来的第三个登记点**：我的任务书原本只要求两个载体，而门自证轴若不进这张表，
  就是"写好了 11 例、全仓零调用点"——与本册反复治的病同源，这次是车道发现并上报的。

**接线后编排亲验（Node22，全部未接管道取退出码）**
- `--selftest` ⇒ `exit=0`，`LR_SELFTEST=PASS cases=11 bad=0（判据边界：只认「（待填」；待补/TODO/半角/含待字的正常句/反引号引用一律不判红）`
- 真跑（具名收件 20 份）⇒ **`exit=1`**，`LANEREPORT_INTAKE=20 SCANNED=20 MISSING=0 SKELETON_FILES=2
  SKELETON_SECTIONS=4 EXEMPT_DECLARED=0 EXEMPT_APPLIED=0 EXEMPT_STALE=0 EXEMPT_BAD=0 EXEMPT_SWEEP=NO
  PROBLEMS=4 RESULT=FAIL`
- `bash -n` exit 0；DSL `parseDiagnostics: 0`；命中数 DSL=1 / bash=1 / selftests=2 ⇒ **无重复插入**。

**这条红是对的，并且它上线第一发就证明了自己的价值**：四个未填小节全部来自**此刻仍在写的两条车道**——
`corpus-blindspot-r16.md` 小节「0. 对 L16 半成品的验收判定」(:17) 与「7. 下游要求（本车道不改的文件）」(:80)、
`leg-writeguard-r17.md` 小节「5. 复跑结果」(:179) 等。同刻旁证：r16 由 32 行涨到 80 行（待填 7→2）、
r17 由 37 行涨到 240 行（待填 8→2）、`uncovered10-disposition-carrier-r19.md` 已 292 行 / 待填 0（L19 实质收工）、
`report-buckets-r21.md` 尚未创建。⇒ 上一程那种"车道死了、报告全空骨架、而一切照绿"的状态，**从今天起会在终验里必然变红**。
⚠ 读数口径要写清：这条门的红**随车道收工态移动**——现在是"在途"，不是"缺陷"；车道全部收工后若仍红，
剩下的每一节都必须逐条点名是哪条车道没交付，**不许用豁免清单把它抹平**（sidecar 现为 0 条、`EXEMPT_SWEEP=NO`，
这个"零放行"状态本身就是要保住的账）。

### 35.5 只读门全量复量收工（13:15，15/15；这批数**不是终局复量**，面板腿与面板后两发仍未跑）
载体：`tmp/r10-readonly-gates.sh`，读数落 `tmp/r10-gates/`，不写 `reports/**`、不覆写 `.zcode/tmp/final-verify/summary.json`。
HEAD 全程 `da996f3a`（未提交 ⇒ 无 sha 漂移污染）。**9 绿 / 6 红**：
- 绿：`dryrun-workflow`(PASS 3/3)、`verify-backend-fresh`、`verify-band-freshness`(`FRESH_RESULT=PASS bands=3 markers=4`)、
  `verify-dry-no-lease`、`verify-ops-stamp`(`STAMP_RESULT=PASS cases=1107 与记录一致`)、`verify-queue-reconcile`、
  `verify-source-shape --dry`、`verify-state-truth`
- 红：`verify-ledger`（71 个 ID 无本尊行，`§35.1` 记为既定后果）、`verify-provenance-all`、
  `verify-real-coverage`（10 条欠账）、`prove-gates-can-fail`（**有案例证据不足**，非"变异仍能放行"，两语义别混，
  详见其 log）、`verify-evidence-corpus-nostore`，以及 **`run-qa-selftests` exit=124**。
- ⚠⚠ **`run-qa-selftests exit=124` 是我这台载具的错，不是被测物的红**：我照 bash 抄了 600 秒，
  而 DSL `GATE_SUITE` 给这条门的是 **900000ms**，其注释写得明明白白"留的是负例批量起进程的余量"——
  本轮收件数已从 36 涨到 42（+6 条新负例），600 秒不够。⇒ **这条读数作废，须按 900 秒重跑**。
  这正是本册 `dsl-gate-sync` 那段说的"被 timeout 掐掉时读出来是假红"，我自己犯了一次，如实记。
- **corpus 两格齐了**（第三格"HEAD 码×有库"仍需复量）：`storemode exit=0 PASS` vs `nostore exit=1 FAIL` ⇒
  `§35.2` 那条"`round-1` 144 帧不存在只在无库格出现"的结论在本批里再次成立。
- 顺带把一件挂着的核查收掉：全仓搜 `caliber_label_already_printed_by_gate` 只命中
  `.zcode/tmp/lane-new-reds/post/**` 与 `.zcode/tmp/lane-ruling-packet/**` 两份**数据件副本**，
  无任何脚本消费 ⇒ `§35 D` 那句"体积门措辞无程序化消费端"由这条迟到的全仓搜索独立证实。

### 35.6 L21 交付：分桶器落地，并量出"待办数"三方打架（差 11 条，这才是真账）
交付三件：`scripts/qa/gen-round8-report.mjs`（分桶）、`scripts/qa/test-report-decision-buckets.cjs`（26 断言负例）、
`reports/audit/round-7/report-buckets-r21.md`。**改前**逐字：`commits=88 decisions=34 … §6 印「需你拍板 34 项」`；
编排方真加 §35 后当场复量即变 `decisions=35` ⇒ **§35 C 段预言的"加一节就虚增待办"当场发生，不是假想**。
**改后**机器行：`GENREPORT_DECISION_BUCKETS headings_total=35 pending=26 ruled=2 closed=1 log=6 sum=35`、
`GENREPORT_BUCKET_GUARD=OK removed=9/35 pending_zero_guard=clear ask_override_held=0`、
`GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26`。默认桶＝待拍板，规则只按标题语义、无节号、无 sidecar；
移出 9 条各带命中片段；`ASK_OVERRIDE` 只会把待办往**大**推；空桶或移出>70% 一律印 RED。
"新增一节流水不增待办数"有三条实测（真 §35：35/26/log 5→6；副本假 §35：36/26/log 7；夹具 A→B pending 3→3，
反向对照 3→4）。负例变异（默认桶改 closed）⇒ `BUCKETS_TEST=FAIL（7 条断言未过）exit=1`，含
`真册子 §6 自数一致｜标题=0 列出=1`；聚合器 `发现=42 → 43`（+1，与我 §35.2 钉的分母自洽）。
它**没有**跑正式版 `round8-final-report.md`（盘上 `summary.json` 还是 r9 暂定读数，跑了就等于把暂定写成权威件），
mtime 全程未变 ⇒ 真回填归编排方。`a4c8f995` 基线核过仍成立（`cat-file -t`=commit、88 发范围），未擅自改动态值。

⚠ **它顺手量出本册最大的一处口径不一致**（`GENREPORT_LEDGER_DECLARED marker_line=337 marker_section=30
latest_section=34 declared_lag=4 pending_declared=15 diff_vs_generator=11`）：
同一个"等你拍板 N 项"今天有三个数——**26**（分桶器按标题语义的保守判定）、**15**（`§30:338` 那句人工汇总行）、
**约 14**（编排方 §35 C 逐节核原文后的结论：§30 漏 5 条、其中 7 条已被后续关掉）。
**三个都不是错，是分母不同**：26 把"标题没写闭合措辞"的全算待办（它读不到后面状态对账节里的闭合，
这正是 §35 F 段预告的设计张力）；15 是人工汇总行，已被证伪漏计；14 是逐节核对的结果但依赖人读。
⇒ 结论：**"待拍板数"在没有机器可读名册之前不可能唯一**，`§35 F` 那条 `PENDING_RULINGS` 具名块的优先级
因此从"以后再做"升为**本轮下一刀**（有了它，分桶器就能读名册而不是猜标题，三方归一）。
L21 另外点名两条：`#24`、`#28` 正文都明写"交你定/请你三选一"却不在 §30 那句里（与 §35 C 独立吻合）；
反向多计 `#17 #18 #22 #27`（§30 称已闭，而 `#22` 标题还写着"未修"，**同一册内自相矛盾**）——
这4条它如实标为"只核到原文与 commit 号存在、未复算门的效果"，我采纳同样的限定语，不替它升级成实测。

### 35.7 L19 交付 + 编排接线（13:2x），并把 L19 自己标"未实测"的那条断言当场量掉
L19 交付五件（`verify-real-coverage-disposition.mjs`、`emit-real-coverage-disposition.mjs`、
`test-real-coverage-disposition.cjs` 61 断言、去向册 JSON、报告 292 行 0 待填）。三条要紧的：
- **取数面**：上游 `verify-real-coverage.mjs` 无 `--json`、无写盘（`writeFileSync|--json|JSON.stringify` 零命中，
  fs 只 import 读类），所以 L19 走"spawn 它 + 解析 `  UNCOVERED <suite>|<id> 缺=<轴>` 逐条行"，
  并实测连跑两次 `diff -q` 相同（`STDOUT_IDENTICAL=yes`）、落盘后再跑上游仍相同 ⇒ **没改判域也没污染被测物**。
  五桶与 §33 逐字节全等：`NEEDS_CAPABILITY=7 NEEDS_BAND_CHANGE=1 NEEDS_IDENTITY_IMPOSSIBLE=1 DISPATCHABLE_NOW=1 NOT_SHOOTABLE=0｜合计=10`。
- **最关键那条性质成立**：`RCD_NO_REDUCTION 本门不替 verify-real-coverage 减红：REALCOV_UNCOVERED 仍=10`、
  `RCD_RESULT=PASS（… 上游门照旧 RESULT=FAIL UNCOVERED=10）`、`RCD_STALE_POLICY=advisory`
  （理由：一条 case 离开 UNCOVERED 只可能是收账，把"忘划旧去向"做成常红的唯一绿路是删册子＝销毁账）。
  词表权威钉在门里，五词中**没有 DONE/CLOSED/EXEMPT** ⇒ 结构上销不掉红，这正是 §32 那句"分流不许关掉任何红"的机器化。
- 自数诚实度值得记一笔：它报聚合器 `37(12:24) → 42(12:49)`，**明说"原始 +5，不是我 +1"**，
  并按件名集合差只认领自己那一枚；`FAILED +1` 它也点名属 L18 的 `test-carrier-wiring.cjs` 而非自己。
  ⇒ 与我 §35.2 钉的分母 42、§35.6 报的 43 三方自洽。

**编排接线（两处登记点；该门无 `--selftest`，故不涉及 `GATE_SELFTESTS`）**：bash `:69`
`g verify-real-coverage-disposition 180 scripts/qa/verify-real-coverage-disposition.mjs` ↔
DSL `{ name: "真实档覆盖去向册 verify-real-coverage-disposition", args: [], timeoutMs: 180000 }`
（实测墙钟 3.3–4.7 秒 ⇒ 180 秒余量 ~38 倍；`args:[]` 是因为本门自己 spawn 上游，DSL 侧不需再传旗标）。
亲验：`L19_GATE_EXIT=0`、`RCD_CHECK 门欠账=10 有去向=10 无去向=0 册外词=0 空条目=0 重复键=0 陈旧=0 轴漂移=0 守恒=OK`、
`bash -n` exit 0、DSL `parseDiagnostics: 0`。
**L19 自己标为"转述、非实测"的那条断言，我当场量掉了**：按现盘解析两空格缩进条目共 21 条（GATE 18 + PANEL 3），
其中命中 sha 敏感正则 `corpus|provenance|band-freshness|real-coverage` 的从 4 条涨到 **5 条**——新增正是
`真实档覆盖去向册 verify-real-coverage-disposition`。⇒ §35.2 F 段那句预警成立且已量化：提交后复量必然多跑这一条，
终局复量的键数因此从 19 涨到 **21**（GATE +2：去向册、车道报告完成度；再加 L18 的 carrier-wiring 一发 ⇒ 以收工实况为准）。

**车道事故台账更新**：原 L17 于 13:2x 真死（`Queuing failed. Try again later or enter /model to switch models`，
155 次工具调用后）；这次没有重叠风险——接手方 L17b 是在跑的那条，`leg-writeguard-r17.md` 由 37 行涨到 240 行、
待填 8→2 都是它做的。⚠ 与 §35.3 那条教训相反方向的对照：L18 是"通知说死了其实活着"，L17 是"通知说死了确实死了"——
**结论不是"通知都别信"，而是"以盘上交付态为准"**：产物在通知之后继续长＝活着，载体 mtime 未再动且报告停在待填＝按死处理。

### 35.8 L16b 交付：分母轴落地，并带回一条要改账的实测（`PRE_STAMP` 4886 → **4882**）
先记它的**验收判定**（这正是接手车道该做的事）：门体**留用**——`grep -c DENOM` 工作树 17 / `git show HEAD` 0，
12:37 实跑真印五行，`git diff` 只删 5 行、判据仅动 `if (blockingMissing||…)` 一格、阈值未改；
但 **L16 原版测试件被实测判为假负例并重写**——12:47 亲跑 = `cases=44 fail=2 exit=1`、
`NEGATIVE_PROOF live_bad=2 mutant_bad=2`（变异前后都红 ⇒ 那条证明与谓词无关；替身未锚夹具根导致空扫描集 exit=2），
且耗时 289s 距聚合器 300s kill 只剩 11s。**这一手把 §31 那台"一直在打零分的假仪器"的形状又抓了一次。**

**分母轴真落地了**（15:52 全域默认，Node22，未接管道，`exit=1`）：
`CORPUS_DENOM_TRACKED trackedFiles=12047 trackedFrames=10457 trackedNonImage=1590`、
`CORPUS_DENOM_ABSENT trackedAbsentFiles=3851 trackedAbsentFrames=3841 trackedAbsentNonImage=10`、
`CORPUS_DENOM_SCANNED gateItems=9184 gateNamedPaths=6460 gateNamedAbsent=149 :: vouchedByDeletionSet=5 notVouched=144`、
`CORPUS_DENOM_BLINDSPOT absentNamedByGate=5 absentNeverOpenedByGate=3846`、
`CORPUS_DENOM_AXIS advisoryFrames=5 blockingFrames=144 strict=off`。
⇒ §32 里 L15 那句"对 3848 张被删帧只看得见 2 张却印 PROBLEMS=0"的盲区从此有了**具名分母**；
`trackedFrames=10457` 与我 §35 C 段独立量的"HEAD 仍跟踪 reports/** 下 10,457 枚图片"**逐字对上**（两条不同路径的数互证）。
极性按裁定执行：选定删除集能背书的 5 帧走 advisory（逐条 `git ls-files` 仍 tracked 且在 `--deleted` 内），
**round-1 那 144 帧 `inDeletedSet=false stillTracked=false`（从未入库）⇒ 照旧判红，没有洗**。
`--strict` 时 PROBLEMS=3；配库时 PROBLEMS=0 但 `BLINDSPOT` 仍 3846 —— 配库不等于盲区消失，这句要留。

⚠⚠ **改账：`PRE_STAMP` 今天复量是 4882，不是本册 §25/§33 反复引用的 4886。** 依据四条全是实测：
`verify-provenance-all.mjs` 工作树未改（`git status` 空）；该门 `if (!p || !existsSync(abs)) { unresolvable++; continue; }`
使**缺席帧在 pre-stamp 判定之前就逃逸**；`PROV_FRAMES_UNRESOLVABLE=148` 与本门 `gateNamedAbsent=148` 相等、
`in=9184` 与 `gateItems=9184` 相等；12:06 基线 54 行 `shots=` 与其复量 diff 为空 ⇒ **变的只有盘上存在性**。
⇒ 派生一条通用规矩（比这个数本身重要）：**这张门的红数不随证据减少而变大——删帧会让 `PRE_STAMP` 自己变小**。
所以"这轮红数降了"永远不许被读成改善，必须先答"是不是有帧从可见集里逃逸了"。
本册 `#25`（用户裁定"记为已知历史红、每轮如实复量"）**不改**，只是复量值随盘移动，按裁定原样报新数。

**它留下的两条连带红，我认下来、不掩盖**：兄弟自测 `test-corpus-legacy-window` 与 `test-evidence-store-axis`
同发各 1 条断言红，两者都读 `PROBLEMS` 的构成 ⇒ 本轮把 5 帧改判 advisory 是**有连带面的 polarity 变更**。
车道如实写明"我没拿 HEAD 码跑它们，故不能断言改前是绿"（`test-evidence-store-axis` 因用户删帧转红是 §32 已记的既定后果）。
⇒ 新增待办：这两条要么按新 `PROBLEMS` 口径改断言（属修仪器），要么证明分轴判定本身错（属回退本刀），
**由编排方在终局复量时定，不许靠放宽让它闭嘴**。另 `3→4→5` 帧漂移被点名是并行车道续删所致、盲区差恒 3846——
这条要在终局复量里复现一次，若不可复现就写成本册的一处不确定读数。

## §35 2026-09-30 17:1x 终局复量后的三处仪器缺陷（我自己造成的两条在内），按"判据缺陷按判据修"处置

**背景**：`edd55203` 的 22 门终验出 3 红，其中 `run-qa-selftests` 上一 HEAD 还是绿的 ⇒ 红是我这轮改动带进来的。
逐条从源码复验后，三条都是**仪器层**缺陷，不是产品缺陷；也都不是"放宽判据就能闭嘴"的形状。

**(1) 门替身不带相对依赖 ⇒ 整发自检测的是空气。**
`test-corpus-denominator.cjs` / `test-corpus-legacy-window.cjs` 都会把 `verify-evidence-corpus.mjs` **复制**到
`.zcode/tmp` 下再跑（锚定夹具仓根 / 翻转一条谓词）。我为了消除 DENY_TAP 式三份副本，把仓外证据库的三态判定
收敛成 `evidence-store-read.mjs` 一个实现，门于是多了一条 `import "./evidence-store-read.mjs"`；ESM 的相对说明符
按**导入方自身位置**解析 ⇒ 替身目录里没这个文件 ⇒ `ERR_MODULE_NOT_FOUND`、门零输出。
后果两种，都极难从读数看出来：denominator 那一发 14 格读数全成 `null`（跑得飞快、退出码却像"正常跑完"）；
legacy-window 那一发的"变异必红"被同一次崩溃**假满足**（node 未捕获异常同样 exit 1）。
⇒ 处置：共用实现 `scripts/qa/gate-substitute-deps.cjs`，**搬运清单从替身文本派生**（写死文件名的清单在门以后再加
   import 时会静默漏搬）；两处接线各自带反证 —— denominator 的 C1x 主动摘掉依赖证明"读不出数"、再搬回证明
   后续读数测的是判据；legacy-window 的 I 组新增"替身两发必须**带着读数**失败"与"极性就是窗口翻转本身"
   （BEFORE 由 legacy 变红、AFTER 由红变 legacy），把崩溃冒充反证的形状钉死。
实测：`CORPDEN cases=56 fail=0`、`LEGWIN cases=39 fail=0`（替身依赖派生 1 条 = `evidence-store-read.mjs`）。

**(2) 共享实现的入参优先级回归：`dirOverride || …` 把"显式不配库"漏给了环境变量通道。**
`openEvidenceStore({dir:""})` 本意是"我要未配库那一发"，但空串在 `||` 链里被当成"没传"，于是继承了
`QA_EVIDENCE_STORE` ⇒ 在带该变量的壳里"未配库"格读成 `reachable`，测的根本不是它声称的那一支
（`ambient env is a second config channel` 那条教训的另一半：环境是第二通道，**显式入参必须是第一权威**）。
⇒ 处置：按"是否显式提供"分支（`dirIn !== undefined`），优先级 `显式 dir > --store > 环境变量`；
   测试进场先摘 `QA_EVIDENCE_STORE`、出场前用它**反向证明环境通道确实会被读到**（否则"隔离"只是自欺）。
   新增 4 格正反例。变异证明：把优先级改回 `||` ⇒ 恰 1 格具名红、exit 1；实测 `STORE_READ cases=16 fail=0`（带/不带环境两种壳都跑过）。

**(3) 聚合器取数语法的 stem 上限量不到带下划线的标记词。**
`run-qa-selftests.mjs` 认旧式 `^\w{2,8}_SUMMARY … fail=N`；本文件标记词 `STORE_READ` 有 10 个字符 ⇒ 匹配不上 ⇒
"无自报断言计数（不可信）"而判红（exit 明明是 0）。⇒ 两处修：**测试补印主方言** `SUMMARY: assertion failures = N`
（这一条单独就能闭红，不依赖聚合器改动）；聚合器把 stem 放宽到 `\w{2,24}` —— 但**这一处改动留在工作树里不提交**，
因为该文件同时带着兄弟车道的 +3（`GATE_SELFTESTS` 新增 `verify-lane-report-complete`，其门文件尚未入册）：
提交它等于把别人在途的工作钉进我的提交边界，还会让 HEAD 引用一个不在仓库里的门文件。归因仍按 §35 记"待定"。

**(4) 游客落点的 `stable` 在 n=1 时是空判据（本条只落账、不在此刀改）。**
`verify-guest-landing.mjs:315` 是 `new Set(samples.map(s=>s.landing)).size===1` —— 单样本恒为真。
盘上实测：账本 28 行**全部**声称 `stable=true`，其中 **17 行只有 1 个样本**（04:39–04:58 那一列 leg 跑的是 repeat=1；
顶层 `repeat=2` 是 06:0x 之后改的，`rowPolicy=merge-never-shrink` 把旧行原样留下 ⇒ 顶层声明与行内样本数互相矛盾）。
⇒ 这是判据缺陷，不是数据缺陷，也不是"帧没截到"：交车道在**源码/单元层**收紧（`samples.length >= repeat` 才算 stable，
   降级必须具名报数、不许悄悄 de-green）；把 17 行的第二个样本补齐是**另一件事**，要 UI 租约 + 8080 + 真档产物，
   且按既定裁定"取证时效"必须重拍而非继承。收紧后必然丢 17 格绿 ⇒ 按 `audit green loss after tightening` 那条，
   车道必须逐行说明"从哪格绿到哪格、为什么"，编排方在终局复量里核。

**§35(4) 落地后的三处更正（车道 L18 从源码回我的前提，两条把我写错的地方纠回来了；本册按"错了就改、改痕留档"的规矩原样入册）**：
1. **我说"下游把 stable 当已闭环"是错的**：`guest-landing-status.mjs` 的 `landingStatus()` **从来没有消费过 `stable`**
   —— 一条 `MEASURED-*` 行只要落点等于预期就无条件拿 CLOSED。所以"把 stable 当闭环证据的地方"这一路是**零个消费者**，
   L18 补的正是这条缺失的边（新增第 5 态 `MEASURED-UNSTABLE` ⇒ 进 `LANDING_UNCLOSED` ⇒ triage 的 `TRIAGE_OPEN` 数得到它）。
   ⇒ 教训：本册里凡"下游会因此变严"的推断，都要 grep 一次消费者再落笔；这条我按 §35 写下时只看了判据本体。
2. **我给的口径不够严**：只要求 `n >= 声明 repeat`，一条 `--repeat 1` 的腿照样自证清白（`n=1>=1` 恒真）⇒
   生效要求改成 `max(MIN_STABLE_SAMPLES=2, 声明 repeat)`，地板值是判据的一部分。当前实测结果仍是 17 行降级，
   但地板值管的是**以后的腿**，不是这一批账。
3. **我把时间线写错了**：§35(4) 说"顶层 `repeat=2` 是 06:0x 之后才改的、n=1 那批来自 04:39–04:58 的 repeat=1 旧腿"。
   盘上实际有 11 行 `n=2` 早到 `2026-09-30T05:02:56Z` 就已写入，06:01 那一发只是 `rowsWritten=3` 的覆盖。
   结论数字不变（17/28 仍是样本数不足、落点不一致 0），但**归因的话术要按盘上时间戳重述**：
   账本里两类样本数是两次覆盖序列交错的结果，不是一条旧腿加一条新腿。
   ⇒ 独立复算凭据（编排方自己跑的，不读车道的 md）：现算仍稳定=11、因样本数降级=17、因落点不一致=0、
   行内写着 `stable=true` 但现算不成立=17；`guest-stability-tightening-r22.md` 逐行列 `guardCaseId`。


