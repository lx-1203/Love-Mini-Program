# Gate lane — `scripts/qa/verify-real-coverage.mjs` (R3-01 voided/pending bucket)

Lane scope: only `scripts/qa/verify-real-coverage.mjs` (+ its in-file `--selftest`).
Ledger `reports/audit/ui-audit-2026-10-09/tour-ledger.json` is READ-ONLY input. Nothing run against
DevTools / wechatide / browser / 8080. All work provable offline.

## 0. BEFORE state (measured this session)

Command: `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-real-coverage.mjs`
(default `--ops reports/audit/round-6/ops`, `--dir reports/audit/round-7`), exit=1:

```
REALCOV_CASES=236 EXEC_ROWS=16082
REALCOV_NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=5 JUDGED_MISSING_A=5 JUDGED_MISSING_GUEST=2
REALCOV_AUTOMATABLE_EXEMPT=28
REALCOV_COVERED=203
REALCOV_UNCOVERED=5／236
REALCOV_UNCOVERED_LIST=5
REALCOV_CONSERVATION=OK 免检=28 + 覆盖=203 + 欠账=5 = 236／236
REALCOV_UNCOVERED_LEDGER=OK 点名=5 欠账=5 判据外=0
REALCOV_RESULT=FAIL
```

→ brief's quoted numbers reproduce exactly (203 / 5 / CONSERVATION OK / LEDGER OK / RESULT=FAIL).

## 1. Ledger shape (read this session, not edited)

`tour-ledger.json` top keys: round, generatedAt, consoleMethod, consoleOriginal, elementsMethod,
securityMethod, **corrections(11)**, routes(73, per-page not per-case), **fixlane(5)**, fixlaneGateReadout.

- `corrections[i]` = `{ id, applied }` (+ optional `evidence`, `open`) — **no structured case/verdict field**.
- `fixlane[i]` = `{ id, run, result, ledgerEffect }` — prose only.
- Case ids therefore only appear (a) inside the row handle `id` (`REAL-VI34-04`, `R2-VI25-08`,
  `REAL-PFI25-05/F07`, `REAL-VB03-03`) and (b) inside prose.
- Token rule `prose|id` → `/[A-Z]{1,4}\d{1,3}/` intersected with the 236 requiresReal ids
  (all 236 ids globally unique — verified) yields, on the real file:
  `VB03, VI34, PFI25, VI25(+VI34 ref), OT05, OT06, OT09` — OT*/ = already UNCOVERED ⇒ disputed-but-not-covered.
  ⇒ expected bucket after fix = 4 = {次要22|VB03, SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI34, …|VI25, PAGES-PROFILE-INDEX|PFI25}.
- All four verified as currently COVERED by real-band judged rows under `--dir reports/audit/round-7`
  (VI34 EXECUTED exec-realcov-b1/b1b, VI25 EXECUTED exec-realcov-b1c, PFI25 FAILED exec-fixlane-pfi25/b1/b1b,
  VB03 EXECUTED exec-fixlane-vb03); their `identities=["A","B"]` ⇒ login axis only ⇒ one judged A row = covered.

## 2. Design decisions (see §4 for the constraint I am surfacing)

- bucket = `REALCOV_VOIDED` (待判决). It only ever takes cases OUT of `COVERED`; prose can never put one back.
- re-admission requires a declared machine-readable field (`coverageEffect:"revalidated"`), which the real ledger
  does not carry today ⇒ on today's corpus the bucket is strictly subtractive (no false green possible).
- conservation identity grows a 4th term: 免检 + 覆盖 + 欠账 + 待判 = 判据条数.
- pass condition: `uncovered===0 && voided===0 && conserved` (+ both ledger self-consistency assertions).

## 3. Steps

- [x] measure BEFORE
- [x] read ledger / ops shape
- [ ] implement bucket in-file
- [ ] extend `--selftest` (≥2 negative samples: voided-row leaves COVERED; stale-void retraction must not re-admit)
- [ ] measure AFTER on real corpus + control runs
- [ ] re-read diff, verify every number came from a command run here

## 4. Constraints surfaced (append as found)

## 5. AFTER (all numbers below were produced by commands run in this session)

`node22 scripts/qa/verify-real-coverage.mjs` (default --ops round-6/ops, --dir round-7, --ledger = R3-01 ledger), exit=1:

```
REALCOV_LEDGER_SOURCE=reports/audit/ui-audit-2026-10-09/tour-ledger.json（corrections=11 行 / fixlane=5 行…）
REALCOV_COVERED=199            （was 203，−4）
REALCOV_UNCOVERED=5／236        （unchanged；点名仍是 次要20|OT05 OT06 OT09 / 次要20|VRN07 / 次要21|OC09）
REALCOV_VOIDED=4               （新增格）
REALCOV_CONSERVATION=OK 免检=28 + 覆盖=199 + 欠账=5 + 待判=4 = 236／236
REALCOV_UNCOVERED_LEDGER=OK 点名=5 欠账=5 判据外=0
REALCOV_VOIDED_LEDGER=OK 待判=4 台账点到判据内=8 台账行=corrections 11+fixlane 5
REALCOV_RESULT=FAIL（… —— 另有 4 条待判决，见 REALCOV_VOIDED 点名）
```

VOIDED 点名（逐条，含台账出处/判词/needsUser 令牌）：
- `PAGES-PROFILE-INDEX|PFI25`  ← corrections:REAL-PFI25-05/F07 + fixlane:REAL-PFI25-05/F07，判词=re-run+write-back
- `SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25` ← corrections:R2-VI25-08，判词=未有效判决+出列+作废+待重跑，待拍板=REAL-VI34-04-Q
- `SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI34` ← corrections:REAL-VI34-04 + R2-VI25-08，同上
- `次要22|VB03` ← corrections:REAL-VB03-03 + fixlane:REAL-VB03-03，待拍板=F06
  `VOIDED_NOTE 次要22|VB03 counted-via-replacement-assertion … 原判据=…onShow 命中 store 缓存不重拉 → …需下拉才更新…; original-criterion-pending-ruling F06`
  ⇒ finding R3-01 要求的 VB03 注记到位，且注记是从台账行 + 判据台 title 推出来的，不是硬编码。

Selftest: `REALCOV_SELFTEST=PASS cases=48 bad=0 台账负样本=6 待判决桶样本=12（其中"必须能红"的负样本=9）` exit=0
（36 → 48：新增 12 例待判桶样本；旧 36 例的期望值一个字没改。）

## 6. Controls / falsification evidence

1. `--ledger tmp/nope.json`（显式指定的台账读不到）⇒ COVERED=203、VOIDED=0、
   `REALCOV_VOIDED_LEDGER=FAIL`、RESULT=FAIL（exit=1）。桶确实由台账驱动，不是硬编码名单。
2. 诱饵台账（tmp/decoy-ledger.json，跑完即删）：3 条 prose 作废 + 1 条声明 `coverageEffect:"revalidated"` 的 VB03 ⇒
   COVERED=200 / VOIDED=3（VB03 被声明字段放回）。证明：声明字段是唯一能重新入列的门，且真盘 corpus 上 ±1 走得动。
3. 变异测试（scratch 副本 tmp/gate-lane-mut/*，跑完即删）：
   - MUT A（把桶做成空转：`if (false) voided.push(...)`）⇒ selftest FAIL bad=28
   - MUT B（让 prose 也能把用例洗回 COVERED：state 恒为 revalidated）⇒ selftest FAIL bad=28
   - MUT C（摘了却没从 covered 扣＝重复计）⇒ selftest FAIL bad=14，报的就是 4 项守恒 `0+3+0+1≠3`
   ⇒ 新样本非真空断言。
4. 下游消费者未破：`scripts/qa/test-real-coverage-nominate.mjs` 连真盘跑 ⇒ `RCOV_TEST=PASS cases=42 fail=0`
   （它按 `^REALCOV_COVERED=`、`^REALCOV_UNCOVERED=`、`REALCOV_CONSERVATION=(\w+)`、`REALCOV_RESULT=(\w+)` 抓数，
   这些键名/行首形状都保持原样；只有 CONSERVATION 那行的 prose 尾巴多了一项 `+ 待判=n`，
   以及 `--ops/--dir/--round` 语义未变，`--selftest` 仍在读盘之前退出。）
5. 另一条 corpus（本轮自己的腿目录）：`--dir reports/audit/ui-audit-2026-10-09` ⇒ EXEC_ROWS=28、
   COVERED=0、VOIDED=4、UNCOVERED=204、CONSERVATION OK。
   **这条最刺眼**：在这个 corpus 上，门原本记的全部 4 条覆盖（摘之前的 covered=4）恰恰就是台账作废的那 4 条 ⇒
   改之前那笔绿 100% 是假绿。
6. 语法/风格：`node --check` OK；eslint 0 errors（27 条 `prefer-template` warning，与本文件原有写法同源，未新增 error）。

## 7. Judgment calls / constraints（不藏）

- **台账 today 的 corrections 行没有结构化 case/verdict 字段**（形状=`{id, applied}`，fixlane=`{id, run, result, ledgerEffect}`）。
  所以"哪条用例被作废"只能从台账自己写的行 handle + 正文里取 token，再与判据集的 236 条 id 求交
  （实测量过：236 条 id 跨 manifest 零重号，所以按 id 匹配不会串账）。
  这与本文件早先"不从 prose/id 模式反推"的教条相冲，冲的理由写在文件头：这一格只允许把用例**摘出** COVERED，
  prose 永远不许把用例**放回** COVERED（放回只有声明字段 `coverageEffect:"revalidated"` 一条路），
  所以它构造上只能让账更红，不能造绿。结构化通道已同时支持（`cases`/`case` + `coverageEffect`），
  声明了判据集外的 id ⇒ 以门自己的名字判红（对什么都不响的解析器不可信）。
- prose 解析唯一的坑是**否定式**：会话期间另一条车道往 PFI25 的 fixlane 行里写了
  「本行不得读作已修复/已判过」，我第一版用宽口径 `/已判过|修正配方/` 把这句**否定**读成了"替换判点"注记
  （实测输出里 PFI25 带着 VOIDED_NOTE）。已改成锚在 `<用例号>=已判过` 且带否定前缀守卫，
  并补了一条 selftest 样本 `wantVoidNoteAbsent` 钉住它。⇒ 现在只有 VB03 拿到替换判点注记。
- **台账在本次会话中被别的车道改过**（`git status` 显示 M tour-ledger.json，mtime 2026-10-13 19:05，
  6 insertions/6 deletions）。上面 AFTER 的 4 条待判是对**改后**台账测的；改前测得的第一轮读数也是 4 条
  （COVERED 203→199），只是 PFI25 那行的注记不同。台账是移动靶，这条要报出去。
- 缺省 `--ledger` 路径不存在 ⇒ 桶空、不新增常红判点（只大声印 `REALCOV_LEDGER_SOURCE=…（不存在）`），
  显式 `--ledger` 读不到 ⇒ 判红。这是为了避免把旧 closure 记录里的调用形状打成常红（本文件反复讲的那个错）。
- 一条台账行点到"已经在欠账里"的用例（OT05/OT06/OT09 就是这样）⇒ 留在欠账、不进待判桶（两桶互斥）。
- 自洽性口径：`uncovered===0 && voided===0 && conserved` 才绿；待判桶的红不是"欠账新增"，
  RESULT 那行会把 `另有 n 条待判决` 明写出来，免得读红的人去追一条不存在的欠账。

## 8. 补测（把推断变成实测）

改前的 selftest 行数不是推的：把 HEAD 版临时复制到 `tmp/gate-head/`（跑完即删）实测 ⇒
`REALCOV_SELFTEST=PASS cases=36 bad=0 台账负样本=6`（exit=0）。
改后同一命令：`REALCOV_SELFTEST=PASS cases=48 bad=0 台账负样本=6 待判决桶样本=12（其中"必须能红"的负样本=9）`（exit=0）。
⇒ 36→48（+12），旧 36 例的 want 值一条没动（`git diff` 里所有被删行都是注释/循环头/守恒式/打印式，
没有任何 `want*` 期望值被改；已逐行核过）。

改动落点（改后文件的行号）：
- `:63-86` 文件头新增"待判决桶"口径段 + `:88` 用法行加 `--ledger`
- `:101-107` `--ledger` 选项（LEDGER_ARG / LEDGER_EXPLICIT / LEDGER）
- `:130-131` requiredCases 带出 `title`（只给注脚用，不参与判点）
- `:350-489` 待判决桶机制：`:363` CASE_TOKEN_RE、`:380` isReplacementClaim（锚 `<id>=已判过` + 否定守卫）、
  `:396` buildVoidBook、`:441` applyVoidBook、`:461/:468` voidLine/voidNoteLine、`:477` readLedgerFile
- `:609-684` selftest 新增 12 例待判桶样本；`:686` 样本循环并入 voidCases；`:690-692` 循环内建账并摘桶；
  `:711-733` 待判桶断言（条数/点名/判词/注记/否定式不得贴注记/自洽性）；`:735` 守恒式改成四项；`:774` 计数行
- `:785-793` main：读台账 + applyVoidBook + `REALCOV_LEDGER_SOURCE` 行
- `:884-888` `REALCOV_VOIDED=n` + 逐条点名 + VOIDED_HINT
- `:902-905` 守恒四项；`:905` `ok = uncovered===0 && voidedN===0 && conserved`
- `:914-921` `REALCOV_VOIDED_LEDGER=OK|FAIL` + `pass = ok && ledgerOk && voidLedgerOk` + RESULT 尾巴
