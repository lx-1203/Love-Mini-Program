# 车道报告：证据删留（EVIDENCE-DELETIONS）

- 车道：收口车道-证据删留
- 日期：2026-10-08
- 判域：3852 个 reports/screenshots 未提交删除的实测裁决 + 3 个未跟踪证据路径登记进待提交清单
- 纪律：不执行 git add/commit（提交归编排层）；恢复手段只有 git restore reports/screenshots

## 待办清单

- [x] ① 读账单 gapbill-v34.json 里 verify-evidence-corpus 与 verify-provenance-all 两条读数
- [x] ② 实测复跑两条门（Node22+QA_EVIDENCE_STORE，账单读数量于删除前故必须复跑）
- [x] ③ 三分规则裁决：①②③均不满足 ⇒ 删除去留入 needsAdjudication 待拍板，盘面未动
- [x] ④ 三个未跟踪证据路径登记 awaiting-commit-adds
- [x] ⑤ 写决定文件 evidence-disposition.json

## ① 账单读数

来源：reports/audit/rootorg-closure-2026-10-08/gapbill-v34.json:29-37（账单口径 head=c088e2d6，bill 自记 `deletionsScreenshots: 0` ⇒ 读数量于删除发生**之前**的盘面）

| 门 | exitCode | resultLine |
|---|---|---|
| verify-evidence-corpus | **1（红）** | `CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）` |
| verify-provenance-all | **1（红）** | `PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）` |

两条红因均未点名「缺截图」。旁证：.zcode/tmp/final-verify/ 里 10-01 的旧读数 corpus.exit=0 / provenance.exit=1，与账单不一致 ⇒ 账单读数是快照，不能直接裁当前盘面，须实测复跑（见②）。

## ② 实测复跑读数

复跑方式：与 scripts/qa/run-final-verify-v33.sh:44-45 同一条码路（裸脚本、timeout、Node22、库在则 export QA_EVIDENCE_STORE=D:/6/love-mini-evidence——实测 STORE_MODE=reachable）；日志与退出码留盘于本目录 `gate-verify-evidence-corpus.{log,exit}`、`gate-verify-provenance-all.{log,exit}`。当前盘面：reports/screenshots 未提交删除实测 **3851** 条（种子写 3852；差 1 条是已暂存的 `apps/client/src/i18n/locales/tmp-zh.js`，不在本车道判域，未动）。

| 门 | 实测 exit | 关键读数 |
|---|---|---|
| verify-evidence-corpus | **0（绿）** | `CORPUS_PROBLEMS=0`；`缺席帧=0 在册缺席而门未遍历=3846 默认不判红`；legacy 无戳 1 册 144 帧按约定起点不判红 |
| verify-provenance-all | **1（红）** | `PROV_FRAMES_PRE_STAMP=4881`（回填戳记）；断链轴全零：`UNRESOLVABLE=0 STALE=0 NO_SHA=0 BAD_SHA=0 ABSOLUTE=0`、`ACCOUNTING in=9184 out=9184 OK` |

**红因归属实测**：provenance 红点名帧 `reports/screenshots/round-7-A-mock-final/PAGES-DISCOVER-INDEX-DC06-after.png` 实测**在盘**（不在 3851 删除之列）；红因全部是 round-7/exec-*/manifest-detail.json 与 round-8-interact 的 pre_stamp（帧 mtime 2026-09-27 早于所记提交 6fd15178@2026-09-28 的回填戳），与「缺截图」无关。删除前已红：账单 deletionsScreenshots=0 时 provenance 就已是 exit=1 同一红因串（gapbill-v34.json:34-37）。corpus 门的缺席两轴设计见 scripts/qa/verify-evidence-corpus.mjs:31-36、196-198——缺席凭据=「git ls-files --deleted」恰是本轮这批删除，归 advisory 轴。

## ③ 裁决

三分规则逐条对照实测读数：

- **①「双 exit=0」不满足**：corpus=0 绿，但 provenance=1 红 ⇒ `awaitingCommitDeletions` 不能写 true（种子口径须双绿才 bless）。
- **②「红因指向缺截图」不满足**：provenance 红因=回填 pre_stamp 4881 帧（manifest 所记提交晚于帧 mtime），断链/无戳/坏戳轴全零、账平 in=out=9184、点名帧实测在盘，且账单在 deletionsScreenshots=0（删除未发生）时就已红同一因 ⇒ **未执行 git restore**（restore 无门索要，反而只会翻转 corpus 的 advisory 计数）。
- **③「exit=-1」不满足**：两门都起、都跑到底（exit 0 与 1，无 timeout 124）。

**落点**：实测盘面是三分规则未穷举的第四态——「corpus 绿（缺席轴=advisory 且凭据恰为本批删除，scripts/qa/verify-evidence-corpus.mjs:31-36,196-198）+ provenance 红但红因先于删除、与删除无关」。按种子「做不到/未覆盖就如实说，不绕过」的纪律：**删除的提交/保留去留不由本车道代裁，写入 needsAdjudication 待拍板**；盘面保持原样（删除保持未暂存，未 restore、未 add、未 commit）。拍板要点：① corpus 对这批删除实测绿且按设计就把它当在册缺席不判红；② provenance 红与删除无关，修它在 round-7/exec-* 与 round-8-interact 的回填戳，不在截图删留。

## ④ 待提交清单（adds）

三个未跟踪证据路径实测在盘且确为未跟踪（`git ls-files` 计数 0、`git status --porcelain` 计 ?? 1 条/路径），登记进 awaiting-commit-adds：

| 路径 | 文件数 |
|---|---|
| reports/audit/2026-10-07-editpage-replace/ | 31 |
| reports/audit/round-7/cap-ids/ | 1 |
| reports/audit/round-7/device-legs-closure-2026-10-06.md | 1 |

（登记≠提交：本车道未执行任何 git add/commit，提交归编排层。）

## 证据索引

| 证据 | 位置 |
|---|---|
| 账单两条门读数 | reports/audit/rootorg-closure-2026-10-08/gapbill-v34.json:29-37（另 111-113 行 deletions/deletionsScreenshots=0） |
| corpus 复跑退出码/日志 | reports/audit/rootorg-closure-2026-10-08/gate-verify-evidence-corpus.exit（=0）、gate-verify-evidence-corpus.log |
| provenance 复跑退出码/日志 | reports/audit/rootorg-closure-2026-10-08/gate-verify-provenance-all.exit（=1）、gate-verify-provenance-all.log（PRE_STAMP=4881 见行 2008；断链零计数见行 2007-2023） |
| corpus 缺席两轴设计 | scripts/qa/verify-evidence-corpus.mjs:31-36、196-198（缺席凭据=git ls-files --deleted） |
| 门调用码路 | scripts/qa/run-final-verify-v33.sh:44-45（g verify-evidence-corpus / g verify-provenance-all） |
| 决定文件 | reports/audit/rootorg-closure-2026-10-08/evidence-disposition.json |

## 结论一句话

3851 条 reports/screenshots 未提交删除：corpus 门实测绿（按设计把本批删除当在册缺席、advisory 不判红），provenance 门实测红但红因=回填 pre_stamp 4881 帧、先于删除且与删除无关 ⇒ 三分规则①②③均不触发，删除的去留**待拍板**（needsAdjudication），盘面未动、未 restore；三个未跟踪证据路径已登记 awaiting-commit-adds；决定与读数已落盘 evidence-disposition.json。
