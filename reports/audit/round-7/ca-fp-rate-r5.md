# CA gate: measuring the false-positive rate of the `--results` self-check axis

> **入库副本 + 一处结论已被后一条车道推翻（编排加的，必读）**：本件从
> `.zcode/tmp/lane-ca-fp/REPORT.md` 复制入库，测量时 HEAD `1788675d`，量出的 FP 口径本身
> （85/102 = 83.3%、执行侧 140/交集 17）经车道 L11 从零重导一遍**全部复现**，可以直接引用。
> 但本文里"**83.3% is a floor**"这句**是错的，方向反了**：L11 复核发现这 85 条中
> "他因跳过=0、结果件里没有这行=0"，所以在该门自己的定义下 83.3% 是**精确值也是实测最大值**，
> 保守下限反而是 **47.1%（48/102，只算"跑完且通过"）**；而在当轮语料上 FP 更低且部分不可测
> （round-7/interact 只能证到 44.1%）。引用本件时请按 47.1%–83.3% 这个区间说，不要说"至少 83.3%"。
> 另：本文说"没有接线caller"——r9 之后**已接**（三处调用点都喂 `--results`），
> 接线过程与亲验读数见 `followups-v33.md` §12 与 `ruling-packet-r9.md`。

Lane: ca-fp. HEAD 1788675d. Read-only against `reports/**`. Gate NOT edited.

## 0. What the axis actually compares (from code, not guesses)

- Trigger: `--results <exec-results.json>`; guarded by `existsSync`, so a wrong path silently skips the whole block (line 125).
- Fields read from the results file: `rj.results[]`, per row `r.status`, `r.observed`, `r.failureReason`, `r.manifest`, `r.id`.
- Executor side: `status === "SKIPPED"` AND `/action-not-automatable/` on `observed + " " + failureReason` -> key `${r.manifest}|${r.id}`.
- Static side: ops re-scanned a 2nd time into `fullStatic` (because `flagged` is truncated to 60).
- Printed machine lines (verbatim from code):
  - `CA_AGREE 执行器实测 action-not-automatable=<n> 静态命中=<m> 交集=<k>`
  - `CA_AGREE_RATE 覆盖执行侧 <p>%；静态侧额外拦到 <q> 条（执行轮还没跑到或未判不可自动化）`
- NOTE ON DIRECTION: the printed % is `both / execBad.size` = RECALL of the executor side, NOT the
  false-positive rate. FP rate must be derived as `(静态命中 - 交集) / 静态命中`.
- Dead code spotted: `execBadTotal` (line 129/132) and `staticSet` (line 134) are computed and never used.
- Exit code is unaffected by `--results` (line 169) — the axis is print-only.

## 1. Baseline (no `--results`) — REPRODUCED

Node 22 (`/d/codex-tools/node-v22.17.0-win-x64/node.exe` v22.17.0), HEAD 1788675d:

```
"$N" scripts/qa/verify-case-automatable.mjs --json .zcode/tmp/lane-ca-fp/baseline.json
```

Verbatim final line (unchanged from the documented reading):

```
CA_RESULT=ADVISORY（静态命中 102/1107，占 9.2%；假阳性率未量，默认不判红——要判红加 --strict）；分派口径：…
```

Counter line: `CA_TOTAL=1107 CA_UNAUTOMATABLE=102 CA_CLEAN=1005 CA_MULTI=2（一条命中多类的重复计数）`
Per-class: 真能力缺口 55 / 逐态截图并人工标注 5 / 亚秒级连续截图 5 / 全文本节点扫描裸 key 36 / 需人眼判观感 3 (sum 104 over 102 rows, 2 rows double-counted).
Exit code 0. **Baseline matches — nothing moved under us today.**

## 2. Pairings tested / which are valid

Ops corpora on disk: `round-1/ops` (27 entries), `round-2/ops` (21), `round-6/ops` (127 entries = 24 `.json` + 103 `.bak`; all 24 have cases, none empty → 1107), `round-7/ops` (24, 1107).
The gate filters `/\.json$/i`, so the 103 `.bak` neighbours are correctly excluded from both numerator and denominator.
Pairing verified three ways, not assumed: (a) manifest-name set equality, (b) key-coverage of the results file against the corpus, (c) **title equality per case id** (content-level proof the results row came from the same case text).

| results artifact | rows | ana rows | keys vs 1107 | title match | verdict |
|---|---|---|---|---|---|
| `round-6/interact/exec-results.json` (R6, 874ff52f) | 1107 | **140** | 1107/1107, ABSENT=0 | 100% | **PRIMARY valid pair** — full corpus, executor still emits `action-not-automatable` |
| `round-2/interact/exec-results.json` (R2) | 941 | 129 | 941/1107 (16 ABSENT) | 100% | secondary — key-compatible, older band, 15% uncovered |
| `round-7/exec-A-mock-final/…` (1107) | 1107 | **0** | 1107/1107 | 100% | pairable but **axis vacuous** (executor side empty) |
| `round-7/exec-A-real-r7final/…`, `exec-guest-real-r7final/…`, `exec-tap-final3/…`, `interact/…` | 1107 | 0 | 1107/1107 | 100% | same: ana=0 |
| `round-7/exec-A-real-stage7/…` | 875 | 20 | 875/1107 (37 ABSENT) | 100% | partial band — agreement number is band-skewed |
| `round-1/interact/exec-results.json` | 1283 | 33 | 588/1107 | **1%** | **INVALID pair** — different corpus generation |

Why ana=0 across every round-7 full run: the round-7 executor dropped the `action-not-automatable` reason entirely and replaced it with banding/attribution reasons
(`requiresReal ⇒ 本切片只跑 mock 产物` ×236, `action 含交互动词但没点名可交互元素` ×73, `判据未点名可观测物件` ×34, `交互腿下发全部失败` ×31, …). Grep for `automatable` across `exec-A-mock-final`: **0 rows**. So the gate's self-check axis is only reachable against the round-6 (and round-2/round-7-stage7) vocabulary generation.

Also note: `reports/audit/round-7/ops-provenance.json` calls round-7/ops a "冻结拷贝" of round-6/ops, but 21 of 24 files now differ by sha256 — the LIVE round-6 corpus has drifted since the 2026-09-28 freeze. Both corpora still yield the identical `CA_UNAUTOMATABLE=102`, so the drift does not move today's number.

## 3. Measured agreement per valid pairing

Primary pair, verbatim gate output (`--results reports/audit/round-6/interact/exec-results.json`, exit 0):

```
CA_AGREE 执行器实测 action-not-automatable=140 静态命中=102 交集=17
CA_AGREE_RATE 覆盖执行侧 12%；静态侧额外拦到 85 条（执行轮还没跑到或未判不可自动化）
```

**The printed percentage is NOT the false-positive rate.** `CA_AGREE_RATE` = `交集 / 执行器实测` = 17/140 = 12% — that is the static gate's RECALL against the executor, the opposite direction from what the human needs. The FP rate lives in the other term (`静态侧额外拦到 85`), and the gate never divides it by 102.

Derived from the gate's own two printed numbers: **85 / 102 = 83.3% false-positive rate.**
Recall gap in the other direction: 140 - 17 = **123 / 140 = 87.9%** of executor-confirmed unautomatable cases are missed by the gate.

I then checked the gate's hedge ("执行轮还没跑到") against the row-level data, because a FP rate inflated by un-run rows is not a FP rate. Bucketing all 102 static hits by their actual round-6 row status:

| bucket | n | meaning |
|---|---|---|
| TP (SKIPPED as action-not-automatable) | 17 | gate corroborated |
| FP, status EXECUTED | 48 | **executor ran it to a verdict** |
| FP, status FAILED | 37 | **executor ran it**; failed for an unrelated reason |
| SKIPPED for another reason | **0** | no banding excuse available |
| ABSENT from the results file | **0** | every static hit was actually run |

So all 85 are evidence-bearing false positives, not "还没跑到". **FP = 85/102 = 83.3%, and it is a floor, not a ceiling.**

Cross-round corroboration (union over 7 authoritative full runs: R6, R2, and round-7 mock/real/guest/tap finals):
all 102 hits covered by ≥1 run (never-run = 0), 99 were EXECUTED or FAILED at least once, 17 were called action-not-automatable at least once,
**14 cases are self-contradictory across rounds** (called unautomatable in R6, ran fine in a later round after the r-exec vocabulary fix),
confirmed-FP = **85 (83.3%)**, confirmed-TP-that-never-ran = 3, undetermined = **0**.
Round-2 alone gives the same answer independently: TP 14 / RAN 72 → 83.7% FP over its evidence-bearing set.

Per-pattern FP rate (this is where the number should be acted on, not the aggregate):

| pattern class | hits | TP | confirmed FP | FP rate |
|---|---|---|---|---|
| 真能力缺口（执行器无对应 op） | 55 | 9 | 46 | 83.6% |
| 全文本节点扫描裸 key | 36 | 3 | 33 | 91.7% |
| 亚秒级连续截图 | 5 | 0 | 5 | **100%** |
| 需人眼判观感/主观语义 | 3 | 0 | 3 | **100%** |
| 逐态截图并人工标注 | 5 | 5 | 0 | **0% — the only clean class** |

## 4. Can the axis actually vary? — YES, and one silent-failure mode

Fed deliberately mismatched pairings; the printed number moves, so the axis is not a constant generator:

| results fed against default `round-6/ops` | CA_AGREE_RATE |
|---|---|
| round-6/interact (correct pair) | 12% (交集 17) |
| round-2/interact | 11% (交集 14) |
| round-1/interact (wrong corpus) | 3% (交集 1) |
| round-7 exec-A-mock-final (ana=0) | **0% (交集 0)** |
| round-7 exec-A-real-r7final (ana=0) | **0% (交集 0)** |
| round-7 exec-A-real-stage7 (band) | 25% (交集 5) |
| round-7 exec-guest-real-login-r8 | 8% (交集 1) |

**But two real defects make it a weak instrument** (evidence, not opinion):

1. **Vacuous-by-construction against current-round artifacts.** Every full round-7 run prints `静态命中=102 交集=0 / 覆盖执行侧 0%` — a number that looks like a catastrophic gate failure but actually means "the executor no longer emits this status". The block has no guard for `execBad.size === 0`, and `both / Math.max(1, execBad.size)` turns a divide-by-zero into a confident `0%`. Anyone wiring `--results` to the newest results file gets a meaningless reading and no warning.
2. **A wrong path fails silently.** Line 125 is `if (RESULTS && existsSync(...))`. Fed `exec-RESULTS-typo.json`: `CA_AGREE` line count = **0**, and no `WARN`/`不存在`/`FAIL` of any kind — the gate exits 0 exactly as if `--results` had not been passed. The axis can vanish on a typo with zero signal.
3. Dead code confirming the axis was never finished: `execBadTotal` (assigned line 132, never read) and `staticSet` (line 134, never read — `fullStatic` recomputes it).
4. The axis is print-only: exit code is identical with and without `--results` (0/0), so it cannot currently gate anything even in principle.

Verdict: **reachable and variable, but it does not print the FP rate, and it is vacuous or silently absent for the artifacts the workflow actually has today.** The 83.3% above had to be derived from its two printed integers plus a read-only row-level lookup.

## 5. What it would cost to go `--strict` (stated neutrally — the human decides)

Measured, verbatim with `--strict` on the primary pair: `CA_RESULT=FAIL（静态命中 102/1107，占 9.2%；假阳性率未量，默认不判红——要判红加 --strict）`, node exit code **1** (without it: 0).

- The gate is **aggregate, not per-row**: `bad === 0 ? 0 : 1`. Flipping strict does not turn 102 rows red individually — it turns **the entire gate red whenever any of the 102 exists**, so green requires driving `bad` to 0.
- Of the 102: **17** are corroborated by executor evidence (and only **3** of those went uncontested — the other 14 the executor later ran successfully anyway); **85 = 83.3%** have positive executor evidence that they run, i.e. triaging to green means first clearing 85 flags the machine has already measured to be wrong.
- Only **5 of 102** (`逐态截图并人工标注`, 0% measured FP) are corroborated as a class. A strict red today is a red that is 4-in-5 attributable to the gate, not to the cases.
- Note the gate's own exit-code comment (line 158) still says "交集只有 17/136" while the authoritative file now contains **140** `action-not-automatable` rows — the prose is one stale snapshot behind the artifact. Not edited by me.
- Where a strict flip would land: the gate is wired at `scripts/qa/run-round7-closeout.mjs:349` (GATE_SUITE, args `--json` only) and `scripts/qa/run-final-verify-v33.sh:58`. Neither passes `--results`, so **the self-check axis is currently never executed anywhere in the workflow** — that is the gap this lane closed by hand.

## 6. What I did not touch

- `scripts/qa/verify-case-automatable.mjs` — read only, zero edits. No `--strict` added to any caller.
- DSL, `emit-round-report.mjs`, `reports/**/ops*`, `apply-ops-cellplans.mjs` — untouched.
- No results file deleted, rewritten, reordered or reformatted; all `reports/**` access was read-only.
- No UI, no DevTools, no leases, no rebuilds, no commits (HEAD still 1788675d).
- Git-level proof of the above: `git status --porcelain scripts/qa/verify-case-automatable.mjs scripts/qa/r-exec.cjs` and the same on
  `reports/audit/round-6/interact/exec-results.json` return **empty** — gate, executor source of truth, and the primary results artifact are byte-untouched by this lane.
- Files written, all outside `reports/**` and confined to `.zcode/tmp/lane-ca-fp/`: `REPORT.md`, `baseline.json`, `r6-ops_x_r6-results.json`, `r1x6/r2x6/r7mockx6/r7realx6/r7stage7x6/r7guestloginx6.json`, `strict-probe.json`, `nostict.json`, `r7-ops-baseline.json`, `bogus.json`, `measure-fp.mjs` (read-only probe replicating the gate's `classify()` verbatim; checksum-verified to reproduce the gate's own 1107/102 before any lookup was done), `enum.json`, `list.txt`.
- One honest caveat on my own method: the per-pattern table counts a case once per class it hits, so the rows overlapping the 2 double-classified cases are counted twice there; the 102/17/85 headline is row-level and matches the gate's own integers exactly.
