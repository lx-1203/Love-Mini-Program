# evidence-deletion-disposition —— reports/screenshots 历史截图删留落地（v3.5 收口 · EVID-DELETION-LAND）

> 状态：**定稿（2026-10-09，本车道 EVID-DELETION-LAND）**。
> 来源：v3.4 终报（reports/audit/rootorg-closure-2026-10-08/closure-report.md）EVID-DELETION-DEADLOCK 选项 (a)：红因已具名且各有裁定/去向的前提下，按「附红因记录+提交删除」收口（终报保留 CORPUS/PROV 红读数原文）。
> 车道纪律：corpus/provenance 两门判据一字不改；CORPUS-LEGACY-144 仍留拍板（sort-v35.json needsUserRows[0]）；本车道不执行任何 git add/commit，删除经 §6 commitPlan 的 deletePaths 交编排层落地。

## 0. 处置结论

执行 v3.4 EVID-DELETION-DEADLOCK 选项 (a)：**3851 张 reports/screenshots 在册删除按「附红因记录+提交删除」落地**。v3.4 车道亲测的「双绿才提交」通道本轮经亲手复跑与亲手复现证实仍不可达（死因见 §2/§3，机制复现见 §3 实验两则）；两门读数原文在档（§4）；删除不灭失，回溯腿实测在档（§5）。判据侧零改动：`scripts/qa/verify-evidence-corpus.mjs` 与 `scripts/qa/verify-provenance-all.mjs` 本车道未碰一字；CORPUS-LEGACY-144 与 PROV-PRESTAMP-4881-RESCAN 两项拍板地位不变。两门在本轮账单仍红（CORPUS_RESULT=FAIL、PROVENANCE_RESULT=FAIL），与本处置并存不悖——红因已具名，按 2026-09-30 裁定口径不把用户行使删除选择权做成默认红。

## 1. 删除标的与现状实测

本轮（v3.5 收口，2026-10-09）实测命令与读数：

- `git status --short -- reports/screenshots | awk '{print $1}' | sort | uniq -c` → **`3851 D` + `26 M`**（3851 个在册文件已在工作树删除、未暂存；26 个在册文件内容有改动，全在 `reports/screenshots/round-7-exec/` 的 `PAGES-MESSAGES-INDEX-MSG*.png`）。
- `git ls-files reports/screenshots | wc -l` → **11333**（在册总数）；`find reports/screenshots -type f | wc -l` → **12380**（盘上现存，含 gitignore 掩掉的未跟踪件——`.gitignore:61` 有 `reports/screenshots/`，故未跟踪件不出现在 status 里）。
- 语料门分母轴对账（本轮复跑原文）：`CORPUS_DENOM_ABSENT trackedAbsentFiles=3851 trackedAbsentFrames=3841 trackedAbsentNonImage=10` —— 3851 缺席里 3841 是证据帧、10 是非图件（.tsv/.json/.log 等），两数不等正是分母轴设计要暴露的对账点。

这 3851 张即 v3.4 车道（EVIDENCE-DELETIONS）按用户 2026-09-30 删留裁定执行工作树删除后、卡在「双绿才提交」判据死角的同一批删除（v3.4 终报 §4.2）。本车道不重数、不增删，只把死因与读数落档。

## 2. 死因一：corpus 门 —— round-1 manifest 144 帧已提交删除，无物可 restore

**判据位置**：`scripts/qa/verify-evidence-corpus.mjs:279-282`（缺席帧只有落在 DENOM.absentSet 里才记 advisory，而 absentSet 的凭据就是 `git ls-files --deleted`，见 :201-215 的 `const tracked = ls([]), absent = ls(["--deleted"])`）；`:323`（`const blockingMissing = STRICT ? missing : missing - advisory`）。

**实测（本轮亲手）**：

- round-1 的 144 帧本体：0 tracked / 0 on-disk / 不在 HEAD —— `git ls-files reports/screenshots/round-1/ | wc -l` → **2**（仅 manifest.json + blank-check.tsv 两个非帧件）；`find reports/screenshots/round-1 -type f | wc -l` → **1**（仅 manifest.json）；`git ls-tree -r --name-only HEAD reports/screenshots/round-1/ | wc -l` → **2**。`git restore` 对这 144 帧没有任何可恢复对象。
- 语料门复跑：`CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144`，`CORPUS_DENOM_AXIS advisoryFrames=5 advisoryPaths=5 advisoryManifests=1 blockingFrames=144 strict=off`，`CORPUS_RESULT=FAIL`。

**死因句**：advisory 轴只认「未提交删除」（`git ls-files --deleted`）这一种凭据；round-1 那 144 帧的删除早已提交（2026-09-30 裁定执行），凭据集里永远不会有它们 ⇒ 只能落 blocking ⇒ `CORPUS_PROBLEMS=1` 恒红，且 restore 无物可还——这就是「双绿」的 corpus 半边不可达的实测机制。

**提交后的可预见读数（判据代码推导，非实测）**：本删除提交落地后 `git ls-files --deleted` 清空，本轮唯一拿到 advisory 的 5 帧（`reports/audit/round-7/exec-a-mock-final/manifest-detail.json`）凭据同时失效 ⇒ blockingFrames 144→149、CORPUS_PROBLEMS 预计 1→2。红因同类（判据认不出已提交删除），归 CORPUS-LEGACY-144 拍板项同一篮子，不构成本处置的新障碍。

## 3. 死因二：provenance 门 —— 4881 帧历史回填戳，restore 不触及且恢复反而翻 STALE_STAMP

**判据位置**：`scripts/qa/verify-provenance-all.mjs:246`（帧 mtime 早于所记提交 ⇒ `fabricated`/PRE_STAMP）；`:250-251`（mtime 落在更晚提交之后且不等于所记提交 ⇒ `staleStamp`/STALE_STAMP）；`:195-206`（#12-A legacy 豁免：整份 manifest 无 gitSha 且 generatedAt 早于打戳约定、帧不在盘、行内无 bandSha，三条件缺一不可，豁免面单列 `PROV_FRAMES_LEGACY_EXEMPT`，结论钉死「历史证据，不可引用」）。

**本轮复跑原文（尾部）**：`PROV_FRAMES_CONSISTENT=4154 PROV_FRAMES_STALE=0 PROV_FRAMES_PRE_STAMP=4881 PROV_FRAMES_UNRESOLVABLE=5 PROV_FRAMES_UNDATED=0 PROV_FRAMES_UNKNOWN_BAND=0 PROV_FRAMES_LEGACY=0 PROV_FRAMES_LEGACY_EXEMPT=144`；`PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）`；生产者侧干净 `PROV_PRODUCERS=11 DERIVED_OK=11 LITERAL_SHA=0`。与 v3.4 终报 §4.4 实测逐项同值。

**实测一（restore 不触及）**：4881 个 PRE_STAMP 帧全在盘上、且是在册干净件。样本 `reports/screenshots/round-7-A-mock-final/PAGES-DISCOVER-INDEX-DC09-after.png`（本轮 PROV_PRE_STAMP 样本行点名件）：`git status --short` 为空（在册干净）；`stat` mtime=`2026-09-27 09:50:51.119802700 +0800` size=14293，跑 `git restore -- <该件>` 后 stat 读数**逐字节不变**，status 仍为空 ⇒ restore 对在盘干净帧不重写、不翻戳，4881 个红因 restore 一个都消不掉。

**实测二（恢复反而翻 STALE_STAMP，本轮亲手复现 v3.4 五帧实验）**：取删除集内被 exec-A-mock-final manifest 点名的 `PAGES-DISCOVER-INDEX-DC01-after.png`（当时属 `PROV_FRAMES_UNRESOLVABLE=5` 之一）执行 `git restore` 后复跑门：

- 该帧 mtime 翻成恢复时刻 `2026-10-08T17:43:03.101Z`；
- 门出具新样本行原文：`PROV_STALE_STAMP reports/audit/round-7/exec-A-mock-final/manifest-detail.json 帧=reports/screenshots/round-7-A-mock-final/PAGES-DISCOVER-INDEX-DC01-after.png mtime=2026-10-08T17:43:03.101Z 实际对应 3a91b254，戳记却是 6fd151786c43438eb3cc32c5b53d0ac6d67d95f3`；
- 总账翻位：`PROV_FRAMES_STALE=1`（原 0）、`PROV_FRAMES_UNRESOLVABLE=4`（原 5）、`PROV_FRAMES_PRE_STAMP=4881` **纹丝不动**、`PROVENANCE_RESULT=FAIL` 照旧。

即：restore 要么无事可做（已提交删除的 144 帧），要么不触及（在盘的 4881），要么把红从一个桶翻进另一个桶（UNRESOLVABLE→STALE_STAMP）——**「双绿」的 provenance 半边同样不可达**。实验后工作树已还原（逐项核对回 `3851 D + 26 M`，DC01 复归 ` D`，盘上无残留）。

## 4. 两门读数原文

**v3.4 转录**（reports/audit/rootorg-closure-2026-10-08/closure-report.md:145-146，材料④复量叙述）：

> 证据语料 verify-evidence-corpus：唯一红因是 round-1 manifest 的 144 帧，实测 0 tracked/0 pending-deleted/0 on-disk（已按 2026-09-30 裁定提交删除，盘上无物可 restore）；其 advisory 只认 git ls-files --deleted 的未提交删除、认不出已提交删除（scripts/qa/verify-evidence-corpus.mjs:279-282,323）⇒ CORPUS_PROBLEMS=1 恒红。
>
> 溯源全量 verify-provenance-all：复跑实测 PROV_FRAMES_PRE_STAMP=4881／CONSISTENT=4154：19 份 manifest（round-7 exec-tap-final 646 帧、exec-guest-real 434 帧、round-8-interact 19 帧等）在盘帧 mtime 早于所记提交（如 mtime 2026-09-27 vs 所记 6fd15178@2026-09-28）⇒ 回填戳记，门禁原话「禁止据此下结论」。生产者侧干净（11/11 派生、0 字面量），债在历史证据本体。

**本轮复跑（2026-10-09，命令：`node scripts/qa/verify-evidence-corpus.mjs`、`node scripts/qa/verify-provenance-all.mjs`）**：

- corpus：`CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=1`；`CORPUS_DENOM_AXIS advisoryFrames=5 advisoryPaths=5 advisoryManifests=1 blockingFrames=144 strict=off`；`CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144`；`CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144`；`CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）`；`CORPUS_STORE=unconfigured`。
- provenance：`PROV_FRAMES_CONSISTENT=4154 PROV_FRAMES_STALE=0 PROV_FRAMES_PRE_STAMP=4881 PROV_FRAMES_UNRESOLVABLE=5 … PROV_FRAMES_LEGACY_EXEMPT=144`；`PROV_LEGACY_EXEMPT_NOTE 打戳约定生效前的无戳历史 manifest（如 round-1）里盘上已不存在的帧，按 2026-10-06 采纳建议书 #12-A 单列豁免：结论=历史证据，不可引用…`；`PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）`；`PROV_STORE=unconfigured 库内对象=0`。

本轮与 v3.4 读数逐项同值：两门红是**跨轮稳定的常红**，红因即 §2/§3 所记，不随删留落地翻绿，也不因它翻深。

## 5. 帧内容可回溯性：git 历史 + 仓外证据库按哈希回溯

**腿一：git 对象库（覆盖 3851 删除批次）**。这批全是 git 在册件（`git ls-files --deleted` 的定义即在册而盘缺）。样本实测：`PAGES-DISCOVER-INDEX-DC01-after.png` 经 `git restore` 恢复后 `sha256sum` 前 16 位 = **`cafe8f47278705d4`**，与 `reports/audit/round-7/exec-A-mock-final/manifest-detail.json` 所记 `contentHash: cafe8f47278705d4` **逐位一致** ⇒ git 里的内容就是 manifest 记账的那一枚，按路径可回放、按哈希可对账。

**腿二：仓外证据库（覆盖 round-1 的 144 帧，含全部删除外的历史帧）**。库缺省路径 `resolve(repo, "..", "love-mini-evidence")`（scripts/qa/evidence-store.mjs:36），实测 `D:\6\love-mini-evidence` 在、mode=reachable、3497 个对象。对 round-1 manifest 全部 144 帧按 contentHash 逐枚查询（openEvidenceStore + storeVouches）：**storeVouched=144 / notVouchable=0 / noHash=0，全部唯一前缀命中**。删除批次样本（exec-A-mock-final 缺席帧）查询同样 `vouchable=true, why=unique_prefix_hit`。

**两腿分工的诚实边界**：round-1 的 144 帧**不在 git 历史里**——`git ls-tree -r 5e2d050c -- reports/screenshots/round-1` 仅 2 件（blank-check.tsv + manifest.json，无任何帧 PNG），per-frame `git log --all` 为空；它们的回溯腿是仓外库（实测 144/144）。3851 删除批次的回溯腿是 git 对象库（在册即可 restore，样本已验）。两腿并立，「帧内容不因本次删除而灭失，可按哈希回溯」成立。

**与门的关系**：两门都内建了库背书通道（`--store` / `QA_EVIDENCE_STORE`；语料门 `CORPUS_STORE`/storeVouched 轴，溯源门 `PROV_FRAME_STORE_VOUCHED` 轴），但本轮官方读数按聚合器口径为 `CORPUS_STORE=unconfigured / PROV_STORE=unconfigured`——库背书只证「内容找得回」，不改两门判红；本节所有库查询为只读演示，未以 `--store` 重跑门禁、未产生第二套官方读数。

## 6. commitPlan（交编排层执行，本车道不执行任何 git 写命令）

```json
{
  "message": "evidence(qa): reports/screenshots 历史截图删留落地（附死因记录与红因读数，判据修订留待拍板）",
  "paths": ["reports/audit/repo-closure-2026-10-09/evidence-deletion-disposition.md"],
  "deletePaths": ["reports/screenshots"]
}
```

执行注记（如实并陈，处置权在编排层）：

- `.gitignore:61` 覆盖 `reports/screenshots/` ⇒ `git add -A -- reports/screenshots` 只会 stage 在册件的 3851 删除 + 26 内容改动，不会把盘上未跟踪件（12380−7482=4898 枚）加进库。
- 26 个 ` M` 件（round-7-exec 的 PAGES-MESSAGES 帧）在 `add -A` 下会以「内容修改」落地、保持在册；若编排层意图是「该目录在册件全数退场」，需对这 26 件另行明示，本车道不改 commitPlan 一字。
- 提交落地后两门读数见 §2「提交后的可预见读数」：corpus 预计 CORPUS_PROBLEMS 1→2（红因同类），provenance 读数不受本提交影响（4881 帧不在删除集内）。

---

*处置完。本文件由 EVID-DELETION-LAND 车道依 v3.4 终报选项 (a) 落地，全部读数可溯源至本文所记命令与 scripts/qa/verify-*.mjs 判据行；本车道未执行 git add/commit，未改动任何判据文件。*
