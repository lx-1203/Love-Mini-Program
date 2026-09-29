# Corpus gate × stamping-convention window (lane: corpus-legacy)

Task: `scripts/qa/verify-evidence-corpus.mjs` and `scripts/qa/verify-provenance-all.mjs` disagreed
about the same 144 frames. Corpus judged them red (`CORPUS_PROBLEMS=1`, empty `gitSha` ⇒ "cannot be
verified"), provenance already classified the identical artifact as
`PROV_MANIFEST_LEGACY` / `PROV_FRAMES_LEGACY=144` ("the convention did not exist yet ⇒ not red").
This lane moved the *same* convention-start ruler into the corpus gate — it did not loosen anything else.

## Status
`verify-evidence-corpus.mjs` is now **green by exemption, not by silence** (`CORPUS_PROBLEMS=0`,
`CORPUS_LEGACY_NO_SHA=1 / 144 frames`, exit 0). `verify-provenance-all.mjs` is numerically untouched.
`run-qa-selftests.mjs` is exit 1 solely because `test-evidence-store-axis.mjs` (another lane's file, which
I must not edit) hardcodes the real-corpus baseline `PROBLEMS=1` that this very fix removes — see the
"Cross-lane coupling" section for the four lines its owner needs to re-baseline.

## Ownership / constraints honored
- changed: `scripts/qa/verify-evidence-corpus.mjs` (only file edited), `scripts/qa/test-corpus-legacy-window.cjs` (new)
- untouched: `verify-provenance-all.mjs`, `r-exec-cli.mjs`, `triage-exec-failures.mjs`, `emit-round-report.mjs`,
  `test-evidence-store-axis.mjs`, `test-corpus-sha-axis.cjs`, `apps/client/**`, `reports/**` (read-only)
- `git status --porcelain scripts/qa/` → exactly ` M scripts/qa/verify-evidence-corpus.mjs` +
  `?? scripts/qa/test-corpus-legacy-window.cjs`; no commits, no stash/checkout/reset/clean, no UI/lease/ports touched.

## Before (real repo, node22 = /d/codex-tools/node-v22.17.0-win-x64/node.exe)
Convention start, for reference: `git log --reverse --format=%h -S gitSha -- scripts/qa` →
`874ff52f 2026-09-25T00:31:39+08:00` (= `2026-09-24T16:31:39Z`); round-1's `generatedAt=2026-09-19T17:28:57.090Z`
predates it by ~5 days, i.e. it genuinely could not have carried a field that did not exist yet.
corpus gate (`verify-evidence-corpus.mjs`, exit code read from a redirect, not a pipe):
```
REAL_EXIT=1
:50  CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=1
:51  CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames ... empty=144
:52  CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: gitSha 不可核实(空 ⇒ 顶层无 gitSha（无从核实）)
:53  CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）
```
Only problem in the corpus = `reports/screenshots/round-1/manifest.json` (`generatedAt=2026-09-19T17:28:57.090Z`,
144 frames all present, `matched=144`).

provenance gate (read-only baseline, unchanged by this lane):
```
PROV_EXIT=1
PROV_FRAMES_CONSISTENT=4154 ... PROV_FRAMES_PRE_STAMP=4886 ... PROV_FRAMES_LEGACY=144
PROV_MANIFESTS_NO_SHA=0 PROV_MANIFESTS_NO_SHA_LEGACY=1 ... 打戳约定起点=2026-09-24T16:31:39.000Z
PROV_FRAME_ACCOUNTING in=9184 out=9184 OK      PROV_PRODUCERS=11 DERIVED_OK=11 LITERAL_SHA=0 NO_DERIVE=0
```

## Design decisions (with citations)
1. **Convention start derived, never hardcoded** — `verify-evidence-corpus.mjs:91-95` runs the exact
   command provenance uses (`verify-provenance-all.mjs:139-144`):
   `git log --reverse --format=%cI -S gitSha -- scripts/qa` → first committer date. A hardcoded date
   constant expires silently; the derived lower bound can only be strict-side, never loose-side, so
   manifests generated after the convention still go red.
   If derivation fails: **no legacy exemption at all** (behaviour byte-identical to pre-change) and the
   failure is printed in `CORPUS_LEGACY_NO_SHA=... 打戳约定起点=(派生不出来 …)` (`:333`). Provenance
   exits 2 on the same failure; adding that exit path here would have changed exit-code semantics,
   which this lane was told not to do, so the conservative fallback + loud line is used instead.
2. **`generatedAt` read in provenance's dialect** — `:99-103` (`generatedAt` then `generated_at`),
   matching `verify-provenance-all.mjs:166-168`. Undated ⇒ not legacy (cannot prove it predates ⇒ no forgiveness).
3. **Legacy covers exactly one cell** — `:238`
   `legacyNoStamp = !sha && !!STAMP_CONVENTION && !!gen.at && gen.at < STAMP_CONVENTION` (strict `<`;
   equal ⇒ red). Only the "top-level gitSha absent" class. An unresolvable-but-sha-shaped value stays
   red even when it predates the convention (`:258-262`, asserted by case E of the test).
4. **Existing counters keep their meaning; legacy is added, never merged** — `expiredEmpty`/`framesEmpty`
   still count the no-gitSha manifest and its 144 frames (`verify-evidence-corpus.mjs:253` untouched), so
   `CORPUS_SHA_CLASS ... empty=1 ... empty=144` reads the same as before; the *verdict* changed, not the fact.
   New independent counters `legacyNoSha` / `legacyNoShaFrames` (`:196`) feed the new machine line only.
   `CORPUS_SCANNED= / CORPUS_EXPIRED_GITSHA= / CORPUS_PROBLEMS=` (line 324) is byte-identical, and the
   stale in-file citation was corrected (`emit-round-report.mjs:1254` → the real consumer `:1332`).
5. **Never quiet** — `:333` `CORPUS_LEGACY_NO_SHA=<n> CORPUS_LEGACY_FRAMES=<n> 打戳约定起点=<iso>`,
   plus per-file `  CORPUS_LEGACY_FILE <rel> 共 N 帧 :: ...` at `:338`, mirroring the existing
   `  CORPUS_PROBLEM <rel> 共 N 帧 :: ...` naming (`:337`). PASS line carries the legacy count too (`:344`).
6. **Nothing else moved**: store axis (`:307-323`), empty-scan-set exit 2 (`:179`, `:278`), hardcoded-SHA
   axis (`:282-302`), scope/segMatch logic, and `process.exit(fail || hardBlocking… ? 1 : 0)` (`:345`) unchanged.

## After (real repo, node22)
```
REAL_EXIT=0                                    (was 1)
:50 CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=0
:51 CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames ... empty=144
:52 CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144 打戳约定起点=2026-09-24T16:31:39.000Z …
:53 CORPUS_LEGACY_FILE reports/screenshots/round-1/manifest.json 共 144 帧 :: generatedAt=2026-09-19T17:28:57.090Z 早于打戳约定 …
:54 CORPUS_RESULT=PASS（… legacy 无戳清单=1 帧=144 … ⇒ 绿＝没有违规，≠ 证据全有背书）
```
provenance re-run after the change: `PROV_FRAMES_CONSISTENT=4154 / PRE_STAMP=4886 / LEGACY=144`,
`NO_SHA=0 / NO_SHA_LEGACY=1`, `FRAME_ACCOUNTING 9184/9184 OK`, `PRODUCERS=11`, exit 1 — **identical**.
Only output diff is one extra line, which is the expected auto-classification of the new fixture file:
`PROV_PRODUCER_EXEMPT scripts/qa/test-corpus-legacy-window.cjs 自测夹具` (no counter moved).

## Negative test — `scripts/qa/test-corpus-legacy-window.cjs`
Auto-discovered by `run-qa-selftests.mjs:25` (`^test-.+\.(cjs|mjs)$`). 36 assertions, `LEGWIN_TEST=PASS`,
exit 0, ~20s. It self-reports in both accepted forms (`run-qa-selftests.mjs:49-51`):
`SUMMARY: assertion failures = 0` + `LEGWIN_SUMMARY cases=36 fail=0` + `LEGWIN_TEST=PASS`.
Coverage: A empty sha + generatedAt after convention ⇒ red (code 1, PROBLEMS 1, LEGACY 0);
B generatedAt exactly == convention ⇒ red (strict boundary); C before ⇒ not red, `CORPUS_LEGACY_NO_SHA=1`,
legacy frames counted separately, `empty` class still 1/2, per-file naming present, gate's printed
convention start == the test's independently derived one; D no generatedAt ⇒ red;
E phantom sha + pre-convention ⇒ **still** red (proves nothing was loosened); F sha==HEAD40 ⇒ green with
LEGACY 0 (axis is not permanently red); G mixed ⇒ LEGACY 1 and PROBLEMS 1 simultaneously, still FAIL overall;
H **cross-gate agreement on the real repo**: corpus `CORPUS_LEGACY_FILE` set == provenance
`PROV_MANIFEST_LEGACY` set (both scoped to `reports/screenshots/round-1`) and both name round-1.

### Red-capable proof (mutation, throwaway copy only)
The battery `windowBattery()` (the two core expectations: after⇒red / before⇒legacy) is run against the
live gate and against a mutant copy at `.zcode/tmp/corpuslegacy-mutant/verify-evidence-corpus.mut.mjs`.
The mutant differs from the live file in exactly 2 lines (asserted): predicate sign flip
`gen.at < STAMP_CONVENTION` → `gen.at > STAMP_CONVENTION`, plus re-anchoring `const repo = resolve(here, "../..")`
to the real repo (a copy outside `scripts/qa` would otherwise resolve the wrong root — mechanical, not a judgment).
```
NEGATIVE_PROOF live_bad=0 mutant_bad=2（翻转 <→> 让 BEFORE 判红、AFTER 变 legacy ⇒ 窗口两端都真的在受力）
```
The live gate's sha256 is asserted unchanged before/after the mutation sequence, and both throwaway
directories are deleted and re-checked (`ls` afterwards: `No such file or directory` for both).

## Aggregator (`node22 scripts/qa/run-qa-selftests.mjs`, true exit read from a redirect, not a pipe)
```
SELFTESTS_EXIT=1
SELFTEST_DIR=qa/test-*  发现=31  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
PASS  test-corpus-legacy-window.cjs  exit=0  断言失败数=0  LEGWIN_TEST=PASS  28s   ← new, auto-discovered by :25
PASS  test-corpus-sha-axis.cjs       exit=0  断言失败数=0  CPSSHA_TEST=PASS  10s   ← unaffected
FAIL  test-evidence-store-axis.mjs   exit=1  断言失败数=4  EVS_TEST=FAIL   110s   ← other lane, see next section
SELFTEST_RAN=30 SKIPPED=1 FAILED=1 NO_SUMMARY_LINE=0 覆盖文件=31/31
GATE_SELFTESTS_RAN=1 GATE_SELFTESTS_FAILED=0
SELFTEST_RESULT=FAIL（1/31 个离线测试与门自检未过）
```
30/31 green + 1 UI-bound skip (`test-stop-flag.cjs`, pre-existing policy). `NO_SUMMARY_LINE=0` proves my
test's self-report was recognised by `run-qa-selftests.mjs:49-51` rather than reading as
"无自报断言计数（不可信）".

### Final gate state (deterministic re-run after everything)
```
FINAL_EXIT=0
CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=0
CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames resolvableOlder=9040 unresolvable=0 empty=144
CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144 打戳约定起点=2026-09-24T16:31:39.000Z …
  CORPUS_LEGACY_FILE reports/screenshots/round-1/manifest.json 共 144 帧 :: generatedAt=2026-09-19T17:28:57.090Z 早于打戳约定 …
CORPUS_RESULT=PASS（… ⇒ 绿＝没有违规，≠ 证据全有背书）
```
Scoped mode still works too (`--scope reports/screenshots/round-8-interact` ⇒ SCANNED=1 PROBLEMS=0
LEGACY_NO_SHA=0, exit 0) — the legacy line prints even at zero, so the axis never goes quiet.

## Line numbers re-verified (the brief's citations, corrected where stale)
- aggregator filename rule `^test-.+\.(cjs|mjs)$` → `run-qa-selftests.mjs:25` (brief said "filename rule", correct).
- self-report acceptance is **`:49-52`**, not `:45-49`: `:45-48` is the explanatory comment, `:49` =
  `assertion failures = (\d+)`, `:50` = `^\w{2,8}_SUMMARY\b.*?\bfail=(\d+)`, `:51` = `cnt`, `:52` = the
  `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)` token (first match wins — hence the hyphenated-label discipline).
- `verify-provenance-all.mjs:139-144` = `STAMP_CONVENTION` derivation, `:166-176` = legacy/no-sha split — confirmed.
- the corpus gate's old "empty ⇒ red" was `:204` (verdict) + `:214-217` (fail condition); it is now `:238-246` / `:258-262`.
- `emit-round-report.mjs` parses this gate at `:1332` and `:1335` (the in-file comment claimed `:1254`; corrected).

## Cross-lane coupling found (NOT fixed by me — not my file)
`scripts/qa/test-evidence-store-axis.mjs` (another lane's, mtime 2026-09-29 16:00) hardcodes the *real*
corpus baseline as PROBLEMS=1/exit=1, which was only true because of the very asymmetry this lane fixed.
Observed in this run (4 assertion failures, `EVS_TEST=FAIL`):
```
FAIL 1 未配库：判定与从前相同 :: exit=0 PROBLEMS=0（从前实测就是 1：round-1 空 gitSha 那一份）
FAIL 2 库可达：PROBLEMS 仍是 1 :: PROBLEMS=0 ｜ CORPUS_STORE=reachable … 库内对象=3497
FAIL 3 不可达 ⇒ 判红：PROBLEMS 必须比基线多 :: exit=1 PROBLEMS=1
FAIL 3b 库落在仓内 ⇒ 也判红 :: PROBLEMS=1
```
Lines to re-baseline: `:59` (`=== 1 && code === 1` → now 0/0), `:66-67` (`=== 1` → now 0),
`:77-78` (unreachable `>= 2` → now 1), `:84-86` (inside-repo `>= 2` → now 1).
Assertions 4 / 4c / 4z still pass (a missing frame still adds a red on top of the 0 baseline), and the
gate's own store semantics are untouched — `CORPUS_STORE=unconfigured/reachable/unreachable/inside-repo`
all still print. The owner should re-baseline those four to `0/exit 0` and `>= 1`, or assert
`CORPUS_PROBLEMS + CORPUS_LEGACY_NO_SHA`. No other test broke: `test-corpus-sha-axis.cjs` case B/F build
fixtures with `generatedAt: now()` (`:68`), i.e. post-convention ⇒ still red ⇒ that file still reports
`CPSSHA_TEST=PASS` (confirmed in this run, 10s).

## Meaning of green here (must be said out loud)
`CORPUS_RESULT=PASS` from this gate now means **"no citable violation"** — not "every frame is backed".
The 144 round-1 frames are visible on disk and hash-match, but they carry no `gitSha`, so nothing about
product code at a given commit can be *cited* from them; they are exempt from red, not endorsed. Anyone
reading the green must look at `CORPUS_LEGACY_NO_SHA` / `CORPUS_LEGACY_FILE` on the next two lines.
