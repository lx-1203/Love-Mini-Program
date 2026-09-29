# tapfix-briefs carrier: no-wipe fix

Lane: tapfix carrier. Scope: `scripts/qa/emit-tapfix-briefs.mjs` + new test
`scripts/qa/test-tapfix-briefs-no-wipe.cjs`.

## 1. Citation re-verification

Every line number in the brief is correct as of the pre-change file. Verified against disk:

| Citation | Claim | Measured |
|---|---|---|
| `emit-tapfix-briefs.mjs:51` | `rmSync(OUT, { recursive: true, force: true });` | exact match |
| `:14` | `OUT` defaults to `reports/audit/round-7/tapfix-briefs`, overridable by `--out` | exact match |
| `:53` | `const owned = [];` accumulator | exact match |
| `:69` | `tapfix-lane-*` naming | `const file = "tapfix-lane-" + manifestBase + "--" + slug + ".json";` |
| `run-qa-selftests.mjs:45-49` | accepts either `SUMMARY: assertion failures = N` or `EVT_SUMMARY cases=N fail=M` + `NAME_TEST=PASS` | correct; the two regexes are on `:49` (`mNew`) and `:50` (`mOld`), the verdict token on `:52`, the "无自报断言计数（不可信）" branch on `:56` |
| filename auto-discovery | `^test-.+\.(cjs\|mjs)$` | `run-qa-selftests.mjs:25` |
| `verify-ops-corpus-stamp.mjs` `backupStamp()` | exists | defined at `:427`; ts format `YYYYMMDD-HHMMSS` at `:423`; same-second `.2/.3` dedupe at `:432` |
| `*.bak-20260929-134610` under round-7 | exists | 2 files: `guest-landing-booked.json.bak-20260929-134610`, `guest-landing-measured.json.bak-20260929-134610` |

## 2. Premise corrections measured on disk

**The headline premise is wrong, and the error runs the other way.**

- `git ls-files reports/audit/round-7/tapfix-briefs | wc -l` → **0**, not 7. Re-measured twice.
- `git status --porcelain --untracked-files=all reports/audit/round-7/tapfix-briefs | wc -l` → **66**, every line prefixed `??`.
- `git diff --stat -- reports/audit/round-7/tapfix-briefs` → empty.

The 7 is real but is a different set: `git ls-files | grep -i tapfix` lists 12 paths, of which 7 are round-7 artifacts
(`tapfix-lane-{campus-post-topic,login-index,register-index,village-index,village-post,village-publish}.json.applied`
+ `tapfix-merged.json`). Those live directly in `reports/audit/round-7/`, **outside** the wipe target, so
`rmSync(OUT)` never touches them. The other 5 hits are `scripts/qa/*.mjs`.

So: the defect is real and still serious, but it destroys *untracked* work, not version-controlled files.
The decision-log note ("56 untracked artifacts") was off by 10 in count but right in kind — and the
"tracked files with no rollback" framing was not.

**Structural finding that changes the fix:** the carrier never writes a `tapfix-lane-*` file. Its only
`writeFileSync` targets `OUT/<tag>.json` (the batch manifest). The `tapfix-lane-*` names go into
`specs[].outFile` as a *declaration* of where a reviewer should write. Disk proves it:
`tapfix-briefs/01/tapfix-lane-PAGES-HOME-INDEX.json.json` contains `counts.ok=6`, `selector`, `file`, `line`
— filled-in review output. Therefore `owned[]` is a list of names the carrier *claims exist*, not files it created.
Using it as a delete allowlist would delete reviewer results by name — the same failure mode in a new costume.
I inverted it: `tapfix-lane-*` is on a never-delete list.

**Second undeclared deletion site, not mentioned in the brief:** the tail at old `:118`,
`for (const f of readdirSync(OUT)) if (/^tapfix-lane-.*\.json$/.test(f)) rmSync(join(OUT, f), { force: true })`,
deleted root-level lane artifacts, and its regex also matches the 42 `.json.json` historical names.
Removed; now counted instead (`根层lane产物(保留未动)=N`). It currently deletes 0 files in the real dir
(root holds only `01.json`..`10.json`), so removal is behaviour-preserving there.


## 3. Fix design

All in `scripts/qa/emit-tapfix-briefs.mjs`. Line numbers are post-change.

**Ownership, not `owned[]`.** `isCarrierOwned(abs, rel)` at `:78` claims a file only if all four hold:
it sits at the root of `OUT` (`:79`), its name matches `^\d+\.json$` (`:82`, the batch manifest shape written by
the carrier's only `writeFileSync`), it does **not** match `LANE_ARTIFACT` (`:81` with `:71`), and its content
parses as `{ batch: string, lanes: array, hardRules: array }` (`:84`). Name-plus-shape is the load-bearing part:
a tracked file that merely happens to be called `07.json` fails the content test and is refused, not deleted
(proven by the collision scenario described in §4).

**Delete pass** (`:116-117`) partitions the tree into `mine` / `foreign`; only `mine` is removed, after backup.
`walkFiles` (`:88`) skips prior `pre-<ts>` snapshots (`:73` `SNAPSHOT_NAME`) so the foreign count doesn't
self-inflate on rerun. Printed at `:141`:
`TAPFIX_OWNED_REMOVED=N TAPFIX_KEEP_FOREIGN=M TAPFIX_KEEP_LANE_ARTIFACTS=K`, plus up to 5
`TAPFIX_KEEP_SAMPLE=` paths (`:143`).

**Backup before destruction** (`:119-137`), matching `verify-ops-corpus-stamp.mjs:427`:
snapshot `OUT/pre-YYYYMMDD-HHMMSS/` (ts format duplicated from `:423` there), each owned file copied as
`<relpath>.bak`, and the same-second `.2/.3` dedupe of `:432` reproduced at `:123`. The whole batch is
byte-verified against its source *before any delete starts* (`:127-134`) — verifying while deleting means
the 5th file can fail to verify after the first 4 are already gone. `TAPFIX_BACKUP=<path> files=N` is printed
at `:136` before the removals, so the recovery path is visible in the terminal.

Why `.bak` suffix rather than preserving the bare name: `merge-tapfix-lanes.mjs:43` walks all of
`reports/audit/round-7` recursively for `^tapfix-lane-.*\.json$`. A backup that kept a `tapfix-lane-*.json`
name would be swallowed by the merger as a live lane. The `.bak` suffix makes that impossible by construction.

**Fail loud on collision**, before touching anything (`:105-114`): if a batch path `OUT/<tag>.json` is occupied
by something the carrier doesn't own, or a lane dir slot `OUT/<tag>` is a file, it exits 3 naming each path —
no overwrite, no skip. A third gate at `:183-188` re-checks immediately before each write, and `:99-102`
refuses to continue if `--out` points at a file. The pre-existing in-run duplicate check is kept.

**Two incidental correctness fixes in my own file:**
- `outFile` was the literal string `"reports/audit/round-7/tapfix-briefs/" + tag + ...`, so under `--out` the
  path declared inside the brief disagreed with where the carrier actually wrote, and a reviewer following the
  brief would have written into the real directory. Now derived from `OUT` (`:180`).
- The trailing `BRIEF_RESULT=OK out=` used `OUT.replace(REPO + "\\", "")`, which `merge-tapfix-lanes.mjs:24`
  explicitly calls out as the wrong cross-platform idiom. Replaced with `relative()` (`:69`, used at `:228`).
- Header docstring at `:6` now states the no-wipe contract and points at the negative test.

## 4. Negative proof (red against pre-fix)

`scripts/qa/test-tapfix-briefs-no-wipe.cjs`, 18 checks. Every filesystem operation is guarded by
`guarded()` (path must be under `.zcode/tmp` or it throws before running) — the brief's "never against the
real dir" rule is enforced in the instrument, not just promised in prose.

Four outcomes, all measured:

1. **Green against the fixed carrier:** exit 0, `SUMMARY: assertion failures = 0`, `NOTWIPE_TEST=PASS`.
   Asserts: 3 foreign files (`tracked-looking.json`, nested `01/tapfix-lane-*.json.json`, root
   `tapfix-lane-ROOT-STRAY.json`) survive byte-identical; the carrier's stale `01.json` **is** replaced with
   fresh schema-bearing content; a `pre-<ts>/01.json.bak` exists and is byte-identical to the old content;
   `TAPFIX_BACKUP=` and `TAPFIX_KEEP_FOREIGN=3` are printed.
2. **Internal mutant red:** a throwaway copy under `.zcode/tmp` with
   `rmSync(OUT, { recursive: true, force: true });` re-inserted at a text anchor is run against the *same*
   fixture and the *same* judgement function → **7 violations**, with the cause pinned: the foreign files are
   genuinely gone (not a broken fixture), and no `pre-*` backup exists. The mutant is asserted to differ from
   live and to actually contain the wipe line, so the red can't be vacuous.
3. **End-to-end red:** a copy of the test pointed at the pre-fix carrier exits **1** with
   `NOTWIPE_TEST=FAIL` / `SUMMARY: assertion failures = 8`. The first attempt at this produced a *crash*
   rather than a red — my `eq()` threw ENOENT when a file had been deleted. Fixed to return false
   (an assertion must never report via exception); a crash and a red are not the same evidence.
4. **Nothing left behind:** mutant + all fixtures deleted and re-verified absent; live carrier confirmed to
   contain no executable wipe (`^\s*rmSync\(OUT, \{ recursive: true` → no match; the only occurrence is inside
   the block comment at `:56`, which the test's anchor deliberately does not match).

Two real bugs were caught by running this, both worth recording:
- `san()` rewrites `_RESULT=` → `_RESULT~` (dropping the `=`), and one assertion regex still expected
  `=FAIL`, so a passing carrier looked like a failing one. The assertion now tests the raw string, since only
  printed text needs sanitising.
- Sanitising child output matters for a concrete reason: `run-qa-selftests.mjs:52` takes the **first**
  `*_RESULT=(PASS|FAIL)` in the combined stream. The collision sub-test spawns a carrier that legitimately
  prints `BRIEF_RESULT=FAIL`; echoed raw, the aggregator would have read that token as *this test's* verdict.

Also verified: rerun idempotency (`TAPFIX_KEEP_FOREIGN` stays 3 across two runs, snapshots excluded from
the foreign tally) and that both collision classes exit 3 leaving the occupying file byte-intact.


## 5. Real-directory safety check

`git status --short reports/audit/round-7/tapfix-briefs` → **`?? reports/audit/round-7/tapfix-briefs/`**.

That is **not empty, and it cannot be**: the directory is untracked wholesale, so git collapses it to one `??`
line no matter what happens inside it. The brief expected "must be empty", which was derived from the same
misread tracked count. Measured identically **before** any of my work (very first command of this lane) and
after — same single line, so it is not caused by this change.

Substitute evidence that nothing in the real directory moved:

| Check | Result |
|---|---|
| file count in tree, before / after | 66 / 66 |
| `find ... -type f -newermt "2026-09-29" \| wc -l` | **0** |
| newest mtime in tree | 2026-09-27 16:41 |
| `git diff --stat -- <path>` | empty |
| `git ls-files <path>` | 0 (unchanged) |
| carrier ever run against real dir | never — every run used `--out` under `.zcode/tmp` |

Scope note so the numbers aren't over-read: 34 files in `reports/audit/round-7/` (the parent dir) *do* carry
today's date, and `tapfix-merged.dry.json` is stamped 12:35 today. None of that is this lane — my first
measurement ran at ~16:20 (visible in the fixture backup timestamps `pre-20260929-1620xx`), and the other two
(`tapfix-unverifiable.{json,md}`, 09-27 02:29) predate today. The claim above is specifically about the
66 files inside `tapfix-briefs/`, which is the directory this carrier destroys.

## 6. Aggregator run

Command: `node22 scripts/qa/run-qa-selftests.mjs`, stdout redirected to a file, `$?` read from that command.

Final state (re-run after the last comment-only edits):

```
SELFTEST_DIR=qa/test-*  发现=30  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
PASS  test-tapfix-briefs-no-wipe.cjs  exit=0  断言失败数=0  NOTWIPE_TEST=PASS  1s
SELFTEST_RAN=29 SKIPPED=1 FAILED=0 NO_SUMMARY_LINE=0 覆盖文件=30/30
GATE_SELFTESTS_RAN=1 GATE_SELFTESTS_FAILED=0
SELFTEST_RESULT=PASS（29 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）
```

**True exit code: 0.** `NO_SUMMARY_LINE=0`, so no test is counted on a green the aggregator doesn't trust.

Honest caveat: the **first** aggregator run in this session exited **1** with
`SELFTEST_RESULT=FAIL（1/30 个离线测试与门自检未过）`, the sole red being
`test-evidence-store-axis.mjs` (1 assertion, "未配库：判定与从前相同", exit 1, 100s). That file has **0**
references to tapfix, so it cannot read anything I changed; it passed standalone (exit 0, `EVS_SUMMARY cases=14 fail=0`)
and passed in the subsequent full run without any edit to it. It looks like a concurrent-lane/env artifact
(it builds git fixtures for ~100s while two other lanes were writing `r-exec-cli.mjs` and `apps/client/**`),
not a regression from this lane — but it is not reproducible-on-demand either, so it should be treated as
unproven, not as fixed. It is another lane's surface; I did not touch it.

## 7. Residual risk

1. **Stale lane artifacts now survive a rerun.** That is the point, but it moves the problem:
   `merge-tapfix-lanes.mjs:43` walks all of `reports/audit/round-7` for `^tapfix-lane-.*\.json$`, so a reviewer
   artifact superseded by a new census still gets picked up. Verified this is caught rather than silently
   accepted: the merger re-derives `planned` from the live census (`:94`) instead of trusting the lane, rejects
   a whole lane when census-demanded cases are absent (`:111`), rejects pages no longer in the census (`:92`),
   warns on a mismatched self-reported `planned` (`:114-115`), and re-verifies every `selector`/`file`/`line`
   against the source (`:158`). So the failure mode is a visible rejection instead of silent destruction —
   but clearing superseded lanes is now a deliberate human act, and nothing automates it.
2. **No `--force` escape hatch.** Deliberate: a flag that bypasses evidence protection gets used as a
   first resort. Cost: a genuinely stale owned file can only be replaced by the carrier itself, and a foreign
   file occupying `OUT/<tag>.json` requires manual removal.
3. **Backups accumulate forever** in `OUT/pre-<ts>/` inside `reports/`. Nothing prunes them. They are the only
   rollback path, so pruning should be an explicit decision, but someone should confirm they don't want these
   in the evidence-corpus hash audit before the first few reruns land.
4. **A foreign *directory* in a lane-dir slot is accepted.** Only the file-in-dir-slot case exits 3. An
   unrelated dir named `01` at `OUT` is treated as the lane dir and receives new artifacts.
5. **Ownership is a naming + shape heuristic, not a provenance record.** If the batch manifest schema changes
   (`batch`/`lanes`/`hardRules` renamed), `isCarrierOwned` starts reporting those files as foreign: safe
   direction (it keeps rather than deletes), but the carrier would then refuse to overwrite them and exit 3.
6. **The decision-log entry is still wrong** — it says "56 untracked artifacts" and, per this brief, tracked
   files. Actual: 66 untracked, 0 tracked, plus a second undeclared delete site at old `:118` the note didn't
   mention. `feedback-carriers-that-delete-evidence.md` should be corrected; I did not edit memory files from
   this lane.
