# L21：round-8 总报告 §6「需你拍板」分桶修复（r21）

车道：L21 日期：2026-09-30 归属文件：`scripts/qa/gen-round8-report.mjs`、`scripts/qa/test-report-decision-buckets.cjs`、本报告
**未改**：`reports/audit/round-7/decisions-v33.md`（编排方独占）、`round8-final-report.md` 正式版、判据台 canon、其它车道文件。

## 0. 硬规矩遵守情况（先说这个，因为本仓吃过好几次）

**我没有跑过一次会重写 `round8-final-report.md` 的正式版。** 权威件全程保持：

```
2026-09-30 03:35:56.193629200 +0800  11937   reports/audit/round-7/round8-final-report.md
```

（`stat` 实测，取数时刻 12:29 / 12:52 / 13:5x 三次量都一模一样。）
原因不是"小心"而是实测过危险：`.zcode/tmp/final-verify/summary.json` **盘上存在**，所以第 7 节会吃上一程 r9 的暂定读数真填进去——此刻跑正式版就是把半成品写成权威件。
验证一律走我给生成器新加的两个可选参数：`--ledger <路径>`、`--out <路径>`（默认值仍是盘上真件，所以终局回填的用法一字未变），输出全部落 `tmp/l21-buckets/`。

## 1. 改前 / 改后 stdout（逐字）

裁定册在这期间被编排方动过三次，所以"改前"有两发，各带自己的输入口径（sha1 前 12 位）：

**1.1 改前（12:29 那发，册子 34 个 `## N.` 标题，sha1=7d351e10b3e8）**

由 `git show HEAD:scripts/qa/gen-round8-report.mjs` 导出的逐字副本跑出的（副本只改两处：`REPO` 指回真仓、`writeFileSync` 落 `tmp/`），
其产物与盘上权威件 **sha1 完全相同**（`real_report=1385c5d1aa69`、`before_copy_out=1385c5d1aa69`、`SAME=yes`）⇒ 这台量具是准的。

```
WROTE reports/audit/round-7/round8-final-report.md
commits=88 decisions=34 openRows=8 finalReadings=已填
```

它的 §6 标题行：`## 6. 需你拍板 34 项（本轮一律未自裁）`，底下 34 条全量照抄（实测 `bullets_under_6=34`）。

**1.2 改前（12:52 那发，编排方刚写完 §34，册子 35 个标题，sha1=05c62699fa0d）**

```
WROTE reports/audit/round-7/round8-final-report.md
commits=88 decisions=35 openRows=8 finalReadings=已填
```

§6 标题行：`## 6. 需你拍板 35 项（本轮一律未自裁）` ⇒ **任务书预言的"一边收账一边虚增待办数"当场发生了**：编排方收了一笔流水账，待办数就从 34 涨到 35，一条真待办都没多。

**1.3 改后（同一时刻、同一册子 35 个标题那一发的对照）**

```
WROTE tmp/l21-buckets/report-after2.md ledger=reports/audit/round-7/decisions-v33.md
commits=88 decisions=35 openRows=8 finalReadings=已填
GENREPORT_DECISION_BUCKETS ledger=reports/audit/round-7/decisions-v33.md sha1=05c62699fa0d headings_total=35 pending=26 ruled=2 closed=1 log=6 sum=35
GENREPORT_BUCKET_GUARD=OK removed=9/35 pending_zero_guard=clear ask_override_held=0
GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26
GENREPORT_LEDGER_DECLARED marker=yes pending_declared=12 diff_vs_generator=14
```

（1.3 这一发的 `GENREPORT_LEDGER_DECLARED` 是**旧格式**：那版解析器把 §34 里**引用**"仍等你裁定"的那句点评也当成声明抓了，于是 12 条里混进了已被关掉的编号。这是我在 1.4 之前才修掉的自己的缺陷，见第 5 节第 2 条；1.4 才是修好后的格式。两发原始输出都照录，不拿后一发覆盖前一发。）

**1.4 改后（收工前最后一发，13:5x，册子已被编排方改到 sha1=50a137ac62a4，仍是 35 个标题）**

```
WROTE tmp/l21-buckets/report-after3.md ledger=reports/audit/round-7/decisions-v33.md
commits=88 decisions=35 openRows=8 finalReadings=已填
GENREPORT_DECISION_BUCKETS ledger=reports/audit/round-7/decisions-v33.md sha1=50a137ac62a4 headings_total=35 pending=26 ruled=2 closed=1 log=6 sum=35
GENREPORT_BUCKET_GUARD=OK removed=9/35 pending_zero_guard=clear ask_override_held=0
GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26
GENREPORT_LEDGER_DECLARED marker_line=337 marker_section=30 latest_section=34 declared_lag=4 pending_declared=15 diff_vs_generator=11
```

`decisions=` 这一行的语义我**故意没改**：它仍然是"按标题总数计的原始数"（34→35），这样任何读旧机读行的载具不会突然看到口径换了；新增的是 §6 只列 26 条真待办，并把原始数一并印在 §6 的口径行与 6.1 里。

## 2. 分类怎么做的（保守分桶，不是删列表）

`gen-round8-report.mjs` 里 `BUCKETS` / `RULES` / `ASK_OVERRIDE` / `classified` 四段（约 :48-:79）。四条不变式都由机器保证，不靠人记：

- **默认桶=待拍板**：`classified` 里 `if (!hit) return { bucket: "pending", … }`——只有命中显式规则才移出，规则一共 3 条（已裁定 / 已闭或状态对账 / 流水与自我纠正），全部按**标题措辞**匹配，**不含任何节号**。
- **每条移出项带依据**：`basis` 记录命中的正则与**原文片段**，报告 §6.2 逐条印出（实测 §6.2 里 `｜移出依据：` 行数 == 移出条数，1.3/1.4 两发都是 9==9）。
- **反例守卫 ASK_OVERRIDE**：标题里还有"要你拍板/你定/得你选/还是/要不要"这类选择题措辞时，**即使命中移出规则也留在待拍板桶**（守卫只会把待办数往大推，不会往小推）。盘上现例：§15「修成真的门，还是归档」含"归档"字样但不算结论，留在待办。
- **反"凭空归零"**：待拍板桶为空（而标题数>0）或移出比例>70% ⇒ 印 `GENREPORT_BUCKET_GUARD=RED`，并在 §6 正文印"本桶为空……先按 6.2 逐条复核再采信"，绝不静默交还一张空清单。
- **自数一致**：§6 标题里的数字就是它自己列出的条数（`GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26`），另印 6.1 的原始数与四桶守恒 `26+2+1+6=35`。
- **口径钉住**：机读行带 `ledger=<路径> sha1=<12 位> headings_total=`，换册子必然换 sha1，读数不复现时一眼能看出。
- **没有 sidecar 名单**：分类只读裁定册自身的盘上文本；我没新建任何需人工维护的注册表。唯一的旁证是 §6.3 那一段"与册内自述的对账"，它**不参与分桶**，只印差集（理由见第 5 节）。
- **没动的 already-correct 行为**：第 5 节交互腿读数、§7 从 `.zcode/tmp/final-verify/summary.json` 回填与缺件时印「（未跑，故此处不留结论。）」这套一字未改；`a4c8f995` 仍是硬编码字面量（现位于 :30，注释仍在文件头 :6），只核对不改动态值。

## 3. 现有裁定册 §0–§34 全量分类（35 条，一眼核对）

口径：下表对应 `decisions-v33.md` **sha1=50a137ac62a4**（35 个 `## N.` 标题，13:5x 实测），由 `report-after3.md` 的 §6/§6.2 机器输出反解出来，不是我手抄；收工前复量册子仍是 35 个标题（其后编排方只改了正文，标题未增 ⇒ 分桶不受影响）。

| § | 标题（盘上原文，截 44 字） | 桶 | 移出依据（命中片段） |
|---|---|---|---|
| 0 | 用户已裁定（2026-09-29 06:20；下列四项口径已定，本轮按此执行） | 已裁定（册内已记录用户裁定） | `已裁定` |
| 1 | `--r-lg` 令牌值与判据正面冲突 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 2 | `--c-text-inverse` 与 `--c-bg-container` 浅色值完… | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 3 | `MP-R2-PAGES-MESSAGES-INDEX-002` 判据与已生效裁定只能动… | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 4 | AppShell 的左右内距到底是 28rpx 还是 32rpx | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 5 | 帧像素与清单路径要不要长期可查 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 6 | 各轮写进库的测试数据要不要清 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 7 | `village-publish-001` 的提示元素与文案缺设计依据 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 8 | 几百个非 png 的文本 dump 要不要入库 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 9 | 高 dpr 机型档的巡检帧要不要补 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 10 | 主包体积超微信上限，需要你定怎么瘦 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 11 | 五组游客落地对没有裁定，分诊台因此一直 exit 2 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 12 | round-1 那 144 帧没有 gitSha，要不要给个显式豁免 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 13 | 18 份在途 exec-* 清单要不要授权代跑 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 14 | 一枚生产者退出溯源集合，要不要把它拉回来 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 15 | verify-openqueue-lanes.mjs：修成真的门，还是归档 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 16 | run-round7-closeout.mjs：唯一能答"stage-8 过了吗"的载具… | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 17 | 面板每跑一次就重打一份权威判决件 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 18 | 分诊台的判据台目录是从结果路径反推的 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 19 | 那 5 组落地对仍是真欠账（与第 11 项同源，这里补一条新证据） | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 20 | 提交前自我纠一处我自己造成的文件损伤 | 流水与自我纠正 | `自我纠` |
| 21 | 第 5 项的两处"传闻"已量成实测，结论比原记载更糟 | 流水与自我纠正 | `已量成实测` |
| 22 | 一条会删无回滚产物的载具（本轮实测，未修） | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 23 | 体积达标了，但"达的是哪一个口径"必须你认定 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 24 | 剩下 0.76MB 的最大单一来源：`utils/person-avatars.ts` … | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 25 | provenance 那 4886 张帧：三种改法我都量过了，**买不到绿** | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 26 | 纠正我写进库的一处错：命名闸**并不**拒作用域哈希 | 流水与自我纠正 | `纠正` |
| 27 | B7「给 switch 补名字」是必要的，但**不足以**让那 7 条变绿 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 28 | CH22 只落了不依赖滚动裁决的那半，另半是三件事互斥，得你选一个解释 | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 29 | `landingMissing=5` 不是产品欠账：分诊台在向一份"零行声明身份"的语料… | **待拍板** | 未命中移出规则 ⇒ 保守默认 |
| 30 | 状态对账（2026-09-29 16:2x；上面 0–29 节原文一字未改，现状态只写在… | 已闭或状态对账 | `状态对账` |
| 31 | 36 条 CRITERIA_NAMES_NOTHING 的去向已经跑完，顺带纠出一台**… | 流水与自我纠正 | `已经跑完` |
| 32 | 2026-09-29 21:41 用户裁定四项（原文 0–31 节一字未动，裁定只写在本… | 已裁定（册内已记录用户裁定） | `用户裁定` |
| 33 | r9 收口流水（2026-09-30 01:4x；编排亲验，非车道自报） | 流水与自我纠正 | `收口流水` |
| 34 | r10 收口流水（2026-09-30 12:3x；编排亲验，非车道自报。上面 0–33… | 流水与自我纠正 | `收口流水` |

合计：**待拍板 26 / 已裁定 2 / 已闭或状态对账 1 / 流水与自我纠正 6 / 移出 9 / 标题总数 35**。
待拍板编号 = 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,22,23,24,25,27,28,29。
（34 个标题那一发是 pending=26 / ruled=2 / closed=1 / log=5，移出 8 条——即任务书点名的 §0/§20/§21/§26/§30/§31/§32/§33，一条不多一条不少。）

## 4. 「新增一节流水不增待拍板数」的实测证明

三条独立证据，全部只写 `tmp/`，真册子一字未动：

1. **真实世界那一发（不是我造的）**：编排方 12:4x 给真册子加了 §34「r10 收口流水」。同一时刻对照量（1.2 vs 1.3）：改前 `decisions=34→35`、§6 印「需你拍板 35 项」；改后 `headings_total=35 pending=26`，新节自动进流水桶（`log 5→6`）。
2. **我自己造的副本册子（证明不依赖那一发的措辞运气）**：把真册子复制成 `tmp/l21-buckets/ledger-copy-34.md`，在末尾追加一节假的 `## 34. r9 收口流水（2026-09-30 12:3x…）`：
   `headings_total=36 pending=26 ruled=2 closed=1 log=7 sum=36`、`GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26` ⇒ **标题 35→36，待拍板 26→26**。副本用完已删（见第 7 节 ls 证据）。
3. **夹具层（进了负例，会随聚合器天天跑）**：`fixture-a` → `fixture-b(多一节收口流水)`：`pending 3→3`、`headings 7→8`、`log 2→3`、§6 标题数字不变；并有反向对照 `fixture-c(多一条真待办)`：`pending 3→4` ⇒ 证明它不是写死的常数。

## 5. §6.3 那个对账为什么只印对照、不拿来分桶

生成器会找册内**最后一处声明式**「仍等你裁定」并印 `GENREPORT_LEDGER_DECLARED marker_line=337 marker_section=30 latest_section=34 declared_lag=4 pending_declared=15 diff_vs_generator=11`。
- 它自动失效的方式就是 `declared_lag`：声明写在 §30，而册子最新节已到 §34 ⇒ 机器直接印"这句落后 4 节没重写"，谁也不敢拿它当事实源。
- 只认声明、不认引用：编排方在 §34 里**引用**了"§30:338 那句'仍等你裁定'漏计 5 条"来点评旧清单。首版解析器把这行引用也当声明抓了，于是把"已被关掉的 #2/#4/#13…"抓成待裁项（`pending_declared=12`）。现已按措辞排除（`isDeclaration`，:81），实测从 12 条纠正回 §30 那 15 条。这是我这轮自己咬到的一个错，如实记在这里。
- 分桶一律不用它：那行文本是人手写的汇总，本仓的病就是"清单靠人记得改"。§6.3 只印差集并给"册内怎么说"的逐条摘录，让人一眼分辨是"生成器漏了"还是"册内声明滞后"。

## 6. 负例与变异证明

新文件 `scripts/qa/test-report-decision-buckets.cjs`（文件名匹配聚合器 `^test-.+\.(cjs|mjs)$` 收件规则；夹具全部在 `tmp/l21-buckets-test/`，跑完自删，**不往 `scripts/qa/` 掉任何临时件**，免得污染同伴车道的 `发现=`）。

PASS 那一发（真生成器，Node22）：

```
BUCKETS_TEST=PASS
SUMMARY: assertion failures = 0
```

聚合器收件后的实跑行：`PASS  test-report-decision-buckets.cjs  exit=0  断言失败数=0  BUCKETS_TEST=PASS  2s`

变异证明：把 `classified()` 的默认桶从 `pending` 改成 `closed`（变异体放在 `tmp/l21-buckets/gen-mutant.mjs`，用 `L21_GEN=` 指给负例，不落在收件目录）：

```
BUCKETS_TEST=FAIL（7 条断言未过）
SUMMARY: assertion failures = 7
MUTANT_EXIT=1
  FAIL §6 列出了 #99  ｜§6=**（本桶为空。若裁定册仍有 `## N
  FAIL 夹具 A 桶数  ｜pending=0/headings=7（期望 3/7：…）
  FAIL §6 标题里的数字 == 实际列出条数  ｜标题=0 列出=1
  FAIL 反向对照：新增真待办 ⇒ 待拍板数 +1  ｜pending 0→0（不是写死不动的数）
  FAIL 真册子 §6 自数一致  ｜标题=0 列出=1
  FAIL 真册子非待办项确实被移出（反向对照）  ｜§5（要不要长期可查）仍在待拍板桶
  FAIL 反 vacuous：待拍板桶非空  ｜pending=0（原始标题数 34）
```

⇒ 默认桶一被换成"已闭"，待办数凭空归零这件事**立刻变红**（含真册子那一发：pending=0/34）。改回默认桶后同一发命令 `BUCKETS_TEST=PASS`、`REAL_EXIT=0`。
负例共 26 条断言，含阳性（新造 `## 99. 需要你定 X` 必进待拍板桶）、阴性对照（`## 0. 用户已裁定…`、`## 33. r9 收口流水…`、`## 30. 状态对账…`、`## 31. …已经跑完…` 一律不在）、守卫（`## 35. 上一批用户已裁定，本批还需你拍板一项` 留在待办，`ask_override_held=1`）、空桶必印 RED、以及真册子回归。

聚合器 `发现=` before/after（**两次背靠背实跑，Node22，取数时刻 12:43→13:00 / 13:00→13:13 本地 +0800**；before 那一发我把本车道的测试文件临时挪到 `tmp/` 之外再挪回，所以差值只归我）：

```
before: SELFTEST_DIR=qa/test-*  发现=42   SELFTEST_RAN=41 SKIPPED=1 FAILED=6
after : SELFTEST_DIR=qa/test-*  发现=43   SELFTEST_RAN=42 SKIPPED=1 FAILED=3
```

**差值 = +1**，与"我这一个文件"严格相符。⚠ 如实标注：`FAILED` 从 6 变 3 **不是我造成的**，是并发车道在两发之间在改它们自己的 `scripts/qa/*` —— after 那一发的 3 条红是 `test-corpus-denominator`、`test-corpus-legacy-window`、`test-evidence-store-axis.mjs`；before 那一发里 `test-corpus-legacy-window.cjs`/`test-evidence-store-axis.mjs` 还量到 `exit=null`（300s 超时）。我只读了聚合器的汇总行，没读这些车道文件的内容。

## 7. 临时件清理证据

变异体与两份"改前生成器副本"（`gen-mutant.mjs`、`gen-before.mjs`、`gen-before2.mjs`）以及假册子副本（`ledger-copy-34.md`）全部 `rm` 掉之后，盘上真实列表（逐字，12:5x→13:2x 两次清理后各量一次，最终 32 项全为 txt/md 文本证据）：

```
$ ls tmp/l21-buckets/ | sort
agg-after.txt  agg-before.txt  bodyask.txt  decl34.txt  decl34b.txt  ledger-now.txt  mk.txt  mutant-log.txt
report-after.md  report-after2.md  report-after3.md  report-before.md  report-before2.md  report-copy34.md
sec6.txt  sec63.txt  sec63b.txt  sha.txt  stderr-after.txt  stderr-before.txt
stdout-after.txt  stdout-after2.txt  stdout-after3.txt  stdout-before.txt  stdout-before2.txt
table-log.txt  table.md  table2.md  test-final.txt  test-mutant.txt  test-mutant2.txt  test-real.txt

$ ls tmp/l21-buckets/*.mjs tmp/l21-buckets/ledger-copy-34.md
ls: cannot access 'tmp/l21-buckets/*.mjs': No such file or directory
ls: cannot access 'tmp/l21-buckets/ledger-copy-34.md': No such file or directory
```

负例自己的夹具目录 `tmp/l21-buckets-test/` 由测试在 `finally` 里自删（实测 `ls: cannot access 'tmp/l21-buckets-test': No such file or directory`）；`scripts/qa/` 下没有任何我的临时件（`ls scripts/qa/ | grep -E "l21|mutant|tmp"` 零命中）。留下的都是 stdout/表格文本，供复算。
一处自我纠正：本节第一版是我凭记忆写的，漏了 `gen-before2.mjs` 与 `ledger-copy-34.md` 当时还在盘上——现已删除并按 `ls` 逐字重写。


## 8. 我认为编排方很可能算错的两条

- **#24 与 #28——被册内自述漏掉的真待办（危险方向：待办凭空变少）**。
  §24 正文末句逐字是「要不要为 0.76MB 动 `person-avatars.ts`，是"复发 404 风险 vs 达标"的取舍，**交你定**」；§28 正文逐字是「**请你三选一**：(a)…(b)…(c)…」＋「但这属于改判据文本，**得你点头**才动」。
  可 §30 那句「仍等你裁定」列的 15 条里没有它们，§34 新写的那串编号里也没有（§34 只是逐条复量了 #24 的字节数，没把它算进待裁集合）。⇒ 若照那行汇总交还清单，这两条会被静默吞掉。我的按语义分桶把两条都留在待拍板桶（保守默认），这条差异已由 §6.3 印出（#24、#28 在差集里，且标注"册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列"）。
- 次一条（反方向，待办虚高）：**#22 的标题与 §30 直接互相打脸**——标题逐字写「（本轮实测，**未修**）」，而 §30 写「**#22 已修**」并附负例 `NOTWIPE_TEST=PASS checks=18`。两者不可能同时成立，必有一处腐烂；我按"标题措辞"分桶只能保守地把它留在待办（宁可多派一趟工，不可少派）。同族还有 **#17 / #18**（§30 明写「#17 已闭」「#18 已闭」并给 `ea3bd785`/`6e5bfd38`）与 **#27**（§30 与 #21/#26 同批判为"已换成实测、纠了我自己的错引"）——这 4 条我的规则都不移出，因为它们自己那节的**标题**没有任何 closure 措辞。
  标注：以上"已闭"我只核到册内原文与它引用的 commit 号存在，**没有复算那几把门的代码效果**（属推断，非实测）。若编排方认可，正确解法不是往生成器里塞名单，而是把 §17/§18/§22/§27 的标题各加一个机器可读的 closure 措辞（或按体例新开一节 §35「状态对账」），代码不用改就会自动移出。

## 9. 基线提交 `a4c8f995` 核对（只核对，未改成动态值）

```
git cat-file -t a4c8f995                 → commit
git log -1 --format="%h %ad %s" a4c8f995 → a4c8f995 2026-09-28 18:57:55 +0800 fix(qa): 分诊认得"这一刀没开 tap"那一型，75 行不再算作无人认领
git rev-parse --short HEAD               → da996f3a
git log --format=%h a4c8f995..HEAD | wc  → 88
生成器实跑 stdout                          → commits=88（三次复跑同为 88）
```

⇒ **基线仍然成立**：范围可解析、非空、88 发。文件头 :6 那句"换轮次要改"如实保留，我没有把它改成动态值——那是换轮次的决定，归编排方。

## 10. 没做成 / 需要注意的

- 我没跑正式版的终局回填（按第 0 节的硬规矩），所以 §6 的新形态**尚未落进 `round8-final-report.md`**；编排方在全部车道收工后跑 `node22 scripts/qa/gen-round8-report.mjs`（不带参数，默认路径未变）即可，届时 §6 会印 26 条真待办 + 四桶守恒 + 逐条移出依据。
- `pending=26` 与编排方 §34 自算的"真实开放集合约 14 条"有 12 条差距，其中 4 条已在上文点名（#17/#18/#22/#27），其余按我的规则就是留在待办。**这是设计上的保守不对称**：宁可交还一张偏长的清单，也不让任何一条真待办被"人记得改"的名单吃掉。要不要收紧，请把 closure 措辞写进标题，不要写进代码。
- 分类只看**标题**，不看正文（正文只在 §6.3 对照里被摘录）。因此"标题平淡、正文里才写要你定"的节会留在待办（安全方向）；反过来"标题说已闭、正文其实还开着"的节会被移出——盘上暂未见到这种形状，但这是本规则的已知边界。

## 11. 收工前最后一次复验（逐字，13:5x，Node22）

```
$ node22 scripts/qa/test-report-decision-buckets.cjs      （重定向到文件后读退出码，不接管道）
TEST_EXIT=0
BUCKETS_TEST=PASS
SUMMARY: assertion failures = 0

$ node22 scripts/qa/gen-round8-report.mjs --out tmp/l21-buckets/report-final.md
commits=88 decisions=35 openRows=8 finalReadings=已填
GENREPORT_DECISION_BUCKETS ledger=reports/audit/round-7/decisions-v33.md sha1=50a137ac62a4 headings_total=35 pending=26 ruled=2 closed=1 log=6 sum=35
GENREPORT_BUCKET_GUARD=OK removed=9/35 pending_zero_guard=clear ask_override_held=0
GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26
GENREPORT_LEDGER_DECLARED marker_line=337 marker_section=30 latest_section=34 declared_lag=4 pending_declared=15 diff_vs_generator=11

$ stat -c '%y %s' reports/audit/round-7/round8-final-report.md
2026-09-30 03:35:56.193629200 +0800 11937     ← 全程未变：权威一件没被我这车道碰过
$ ls -d tmp/l21-buckets-test
ls: cannot access 'tmp/l21-buckets-test': No such file or directory
```

