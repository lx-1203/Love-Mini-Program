# Executor capability wiring — items 1 & 2 (`r-exec-cli.mjs`)

Lane: executor capabilities. Date: 2026-09-29. Device: **not touched** (no lease, no simulator, no
ports 9420/9430, no leg executed). Node 22 used for every run below.

## 0. Citation re-verification (prior line numbers)

Measured against `git show HEAD:scripts/qa/r-exec-cli.mjs` (1010 lines) and the live file after this
lane (1364 lines). Nothing below is taken on trust.

| cited | by | truth |
|---|---|---|
| `r-exec-cli.mjs:25` imports `evaluate` | your brief | **CONFIRMED** (HEAD and now). Item 1 is a wire-up, not a new transport. |
| `row.toast`/`row.console` pinned empty at `:184` | c21 audit (`:64`, `:146`, `:298`) | **WRONG at HEAD** — at HEAD it is **`:241`**: `route: route \|\| "", toast: "", console: "", evidence: evid \|\| "",`. Substance confirmed: no second assignment anywhere in the file. |
| interaction loop `:604-615` / dispatch `:611` | c21 audit (d)(a) | **STALE** — at HEAD the loop is `:808-817` and the dispatch call is **`:814`**. |
| "real code is at `:777+`, call at `:814`" | your brief (re-measured) | **CONFIRMED**: `:784` is the `if (TAP_MODE && !bandSkip(c) && routeOk !== false && wantsInteraction(c.action))` gate, `:808` the `targets.slice(0, 4)` loop, `:814` the only `element(…)`, `:817` the `sleep(700)`. |
| `r1-exec.cjs:278 installToastHook`, `:293` wraps `showModal`, `:300-305 drainToasts` | brief + audit | **CONFIRMED verbatim**. Wrap line is `wrap('showToast'); wrap('hideToast'); wrap('showModal'); wrap('showLoading');` (`:293`). Pushed shape `{api, title, ts}` (`:288`). Consumed at `:1437 toast: toasts`. |
| `r1-exec.cjs:1115-1120 pullDown` / `:1121-1126 evalStopRefresh` | audit | **CONFIRMED** (`uni.startPullDownRefresh` → `'uni-ok'/'no-uni'/'ERR …'`). |
| `r1-exec.cjs:1033`+`:1068 longpress`, `:1032`+`:1075-1081 rapidTap` | audit | **CONFIRMED** (`el.longpress()` at `:1068`; rapid loop 60 ms apart at `:1077-1080`). |
| `cli-automator.mjs:11-13` verb surface, `element()` `:162-164` | audit | **CONFIRMED** — first arg of `element()` is a free string, so `longpress` costs one argument, no new transport. |
| `r-exec.cjs:1174 UNIMPLEMENTABLE_ACTION_RE` | audit (f) | **CONFIRMED** (`:1174`, used by `isObserveOnly` `:1175-1177`; regression test `scripts/qa/test-observe-markers.cjs`). No counterpart existed in `r-exec-cli.mjs` — verified by grep. |
| `run-qa-selftests.mjs:45-49` summary parsing | brief | **DRIFTED to `:49-53`**: `assertion failures = N` at `:49`, `\w{2,8}_SUMMARY … fail=` at `:50`, `*_TEST=` at `:52`, `ok` at `:53`. Filename rule `^test-.+\.(cjs|mjs)$` confirmed at `:25`. |
| audit header "r-exec-cli.mjs — 797 lines" | c21 audit `:8` | STALE (1010 at HEAD). The `TAP_CAMEL_RE` fix and the `#C-1` geometry work both landed since; `#C-1` (geometry readout, `probeStartSource`/`interpretProbe`/`geomText`, `row.geometry`) is **already wired** by another lane — I did not touch it. |

## 1. Item 1 — Toast / native-modal capture (`--native-capture`)

**Claim change, stated explicitly:** the audit's headline that "toast copy is unmeasurable in this
project" (`c21-executor-capability-matrix.md:151`, `:298`) is **no longer true**. From this lane the
CLI executor can observe the toast / native-modal call stream, so the rows whose `evidence` names
Toast are no longer "carrier-blind by construction" — they are "carrier exists, run it with the flag".
The same sentence now applies to `console` too, but **only for the app-context half** (see limits).

### What was wired (`scripts/qa/r-exec-cli.mjs`; line numbers are the post-lane file, 1364 lines)

| piece | line | carrier it came from |
|---|---|---|
| flag `NATIVE_CAPTURE = --native-capture` | `:66` | new flag |
| `nativeHookSource()` — wraps `wx.showToast/hideToast/showModal/showLoading` + `console.log/warn/error`; pushes `{api,title,content,confirm,cancel,dur,ts}` / `{level,text,ts}`; idempotent via `globalThis.__qaNativeHooked`; returns `installed/already/ERR` | `:343-363` | `r1-exec.cjs:278-299` (wrap list `:293`, pushed shape `:288`, already-guard `:281`) |
| `nativeDrainSource()` — `splice(0)` both bags, returns JSON incl. `hooked` | `:365-368` | `r1-exec.cjs:300-305` |
| `interpretNative(raw)` — tolerant parse: skips the IDE noise prefix, never throws, reports `err` on garbage | `:372-383` | new glue (`cli-automator.mjs:144` may hand back a non-JSON string) |
| `consoleLines(logs)` — plain `log` dropped, `log` lines containing error/warn/fail/TypeError kept | `:385-392` | filter ported from `r1-exec.cjs:1393` |
| `toastSummary(toasts)` — `条数=N showToast×1 … 文案[…]` (the number DND08 ② asks for) | `:394-402` | new rendering |
| `evidenceKindsNamed(c)` / `evidenceGaps(c, cap)` | `:404-431` | closes audit **C-3** (`:146`) |
| `nativeInstall()` / `nativeDrain()` — both return immediately when the flag is off | `:433-449` | — |
| install once after boot, **before any page opens** + `RUNNER_NATIVE_CAPTURE` line | `:882-893` | `r1-exec.cjs:230` (installs at connect) |
| group baseline drain after `openPage`+settle → `RUNNER_GROUP_NATIVE` | `:946-955` | windowing idea of `r1-exec.cjs:1273`/`:1393` |
| **drain inside `row()`** → `toast`/`console` arrays + `nativeCapture`/`consoleScope`/`evidenceGaps` keys | `:471-490`, `:505-512` | `r1-exec.cjs:1437-1438` |

Why the drain lives in `row()`: it is the **single exit for every verdict** in the file — 18
`rows.push(row(…))` call sites (`:975` open-page FAILED, `:1020` lock gate, `:1074` identity scope,
`:1080` stamped-not-automatable, `:1098` DENY, `:1108` verb refusal, `:1127` no target, `:1175` dispatch
failed, `:1188` LEFT_PAGE, `:1198`/`:1204` band skips, `:1217` interaction skipped, `:1228` FAILED,
`:1235` no observable object, `:1240`/`:1244` probe-no-answer, `:1260` frame miss, `:1266` EXECUTED).
Draining in the success path would leave precisely the rejected rows with empty `toast`/`console` —
the "rejection path doesn't fill the fields its own reporting reads" class. Attribution: each row owns
`[previous drain, now]`; page-`onLoad` toasts (guest gate, guard redirect, lock screen) are drained
once per group **before** the first case and go to `RUNNER_GROUP_NATIVE`, never onto a case.

### Row-shape effect (non-destructive default)
* flag **off** (default): `toast: ""`, `console: ""` — byte-identical to HEAD `:241`. Three keys are
  added (`nativeCapture:"off"`, `consoleScope:"none"`, `evidenceGaps:[…]`); additive only — the repo's
  own note that appended JSON keys are ignored by existing readers is at `tour-r6.mjs:49`.
* flag **on**: `toast`/`console` become **arrays**, the same shape `r1-exec.cjs:1437-1438` writes. This
  is the first time `readjudicate-evidence.mjs:241 Array.isArray(r.console)` can be true for a CLI row
  (audit C-4 `:147` recorded it as permanently false). Only two consumers of these fields exist in
  `scripts/qa`: `verify-guest-landing.mjs:182-183` (truthiness — with the flag on, its
  "本载具的 toast 字段实测恒空" problem line legitimately stops firing) and
  `readjudicate-evidence.mjs:241`. Neither does string ops, so neither breaks.

### Honesty limits, recorded where a reader will hit them
1. The hook captures **invocation**, not rendering. Whether the overlay actually painted still needs the frame.
2. `console` is **app-context only**. DevTools framework warnings/exceptions live on the WS event
   stream (`r1-exec.cjs:211-222`), which the audit itself classes `[PORT, WS-only]` (G-5 `:375`). The
   row carries `consoleScope:"app-context-only(…)"` so nobody reads it as parity.
3. `showActionSheet` is deliberately **not** in the wrap list (r1 doesn't wrap it either). A test pins
   that non-overclaim, so "modal captured" can never be read as "ActionSheet captured".
4. If the hook fails to install or a drain errors, `hooked:false` / `err` land in the row and in
   `observed`; a channel failure is never readable as "this criterion produced no toast".
5. Cost when on: one extra `evaluate` per row (this file's own budget note says ~0.21 s per folded
   probe, `:9`) ⇒ roughly +4 min over 1107 rows, plus one baseline drain per page group.

### Gap accounting measured, not assumed
Over the real 1107-case corpus, naming in `evidence`+`title`+`expected`:
`frame=1016 toast=457 console=893 network=554`, and **990 rows carry ≥1 `evidenceGaps` entry** while
the capture channel is off. `evidence` field alone: `toast=372 console=864 network=460` — the 372/864
reproduce the audit's G-4/G-5 denominators exactly, which is the cross-check that this scanner reads
the same thing the audit read. (`network=460` vs the audit's 409 because my token set is
`network|请求|接口|响应|抓包`; naming the statistic, not just the number.)

## 2. Item 2 — pullDown / longpress dispatch + anti-degradation guard

Two flags, deliberately split, because they are two different kinds of change:
`--gestures` (**adds dispatches**) and `--strict-verbs` (**withholds dispatches**).
`--gestures` implies `--strict-verbs` (`:65`): the capability and the no-degradation rule must arrive
in the same leg, otherwise "longpress enabled" would still let DND08 be顶掉 by one plain tap.

| piece | line | what it does |
|---|---|---|
| `GESTURE_MODE` / `STRICT_VERBS` | `:64-65` | `--gestures`; `--strict-verbs` or implied by gestures |
| `MODE_SUFFIX` → `runner:"…（tap+gestures+capture 切片）"` | `:72-74` | the落盘 field cannot lie about which verbs ran |
| verb corpus: `VERB_LONGPRESS_RE … VERB_OFFLINE_RE` | `:261-266` | six verb families, one regex each |
| `VERB_RULES[]` with `needsGesture` + per-verb `why` | `:267-280` | the only place that knows what is emittable |
| `verbsNamed(action, gesturesOn)` | `:282-290` | **pure**; flag passed as an argument, not read from argv ⇒ offline can drive both modes |
| `verbRefusal(action, gesturesOn)` | `:292-299` | returns `NOT_SHOOTABLE(verb=a/b): …` or `""` |
| `pickElementVerb(action, sel, gesturesOn)` | `:301-306` | the single verb choice point: `input` / `longpress` / `tap` |
| `pullDownSource()` / `stopRefreshSource()` | `:309-319` | `uni.startPullDownRefresh` / `uni.stopPullDownRefresh`, ported from `r1-exec.cjs:1115-1126`; adds a `page.onPullDownRefresh` fallback and a `no-page` state |
| `pullDownVerdict(r)` | `:321-329` | `ok / ok(direct handler) / unsupported / no-page / error / unknown` — `no-uni` is never readable as "pulled down" |
| refusal gate, **before** target resolution | `:1104-1114` | inside `if (TAP_MODE …)`, after DENY, before `authorityTargets(c)` ⇒ nothing can have been dispatched |
| longpress dispatch | `:1134`, `:1141` | `element(verb, …)` — same tool, one different `--action` (`cli-automator.mjs:162-164`) |
| pullDown leg + settle + stop-refresh | `:1151-1163` | evaluate, `sleep(SETTLE)`, record verdict in `tapNote`, then stop the spinner so the next cases measure a resting page |
| `tapsDone` counts element verbs only | `:1165` | pullDown is counted in `stats.pullDowns`, never inflated into the click number |
| `stats.verbRefused` → `skippedTotal()` | `:1008`, `:1107` | the refused rows are in the skipped total (two skipped口径 must not disagree) |
| `RUNNER_VERBS` (boot) + `RUNNER_CAP` (final) | `:914`, `:1319` | mode, refusals, longpresses/pullDowns sent, toast/console/gap row counts |

### Non-destructive default — and the one honest caveat
With no flags, the dispatch point is **the same statement as HEAD `:814`** (same tool, same
`--wait 1` / `--value 123456` payloads — `pickElementVerb(…, false)` returns only `tap`/`input`), the
refusal gate is unreachable (`if (STRICT_VERBS)`), and `stats.verbRefused` stays 0 ⇒ verdicts identical.
`--gestures`/`--strict-verbs` change verdicts **only for rows that name a verb the leg cannot emit**.

Caveat I will not paper over: HEAD's behaviour for those rows is the fake green the audit called
higher-severity than "unwired" (`c21:354-360`). Because your hard constraint says existing legs must
keep producing the same verdicts, I made the guard opt-in rather than default, and added a loud boot
line (`:914-921`) that a bare `--tap` leg prints: it names the six verb families that will still be
replaced by one plain tap and says those `EXECUTED` rows must not be read as "named verb tested".
So the risk is now announced instead of silent, but **it is not eliminated on a legacy `--tap` leg** —
recommend booking future legs with `--gestures` (or at least `--strict-verbs`). If you want the guard
default-on instead, it is a one-line change (`:65`), and the measured blast radius is below.

### Measured blast radius over the 1107-case corpus (read-only, via the live regexes + live `verbRefusal`)
| quantity | value |
|---|---|
| `wantsInteraction(c.action)` | 712 |
| …of which already stamped `automatable:false` (never reach the block; `notAutomatableSkip` `:1080` fires first) | 88 |
| reachable by the interaction block | **624** |
| refused with `--strict-verbs` only (no gestures) | **132** |
| refused with `--gestures` | **100** |
| newly dispatchable because of `--gestures` (longpress/pullDown family) | **32** |
| naming longpress / pullDown / repeat-family / swipe-family / native-modal / offline (in `action`) | 17 / 46 / 105 / 23 / 9 / 29 |

Sample of the 32 the flag unblocks: `MSG21 MSG22 MSG25 CS20 AB06 AB08 AB14 FB11` (longpress, audit G-7)
and `LG27 MSG41 PFI25 REG31 CI22 MT21 VI21 VI25 VI34 TP06 CH09 SG06 LK01 CT08 HS03` (pull-down, G-9).
The widths were chosen on this measurement, not by reading: my first candidate (`重复点`, bare
`×N 次`, `500`) hit 147–186 rows including pure measurement prose such as "记录…500ms 内" — rejected
after inspecting 22 matched rows. The retained `repeat` family (56 rows with no other refused verb)
was inspected one by one: CT07 `④ 对同一卡片连点 ①×2`, CF04 `③ 300ms 内…rapidTap 上传…×5`,
LK04 `(c) 300ms 内 rapidTap 解锁 ×5`, N40 `逐个点击…`, PFI17 `依次点 .my-stats__col 四格…` — all
genuinely require a repeat/sequential primitive. Note `依次点|逐个点击` is exactly what the ported
`r-exec.cjs:1174` guard names, so that part is a port, not my invention.

### `scroll` left as a known remaining exposure (deliberate)
`TAP_RE` also matches `滚动|scroll`, and **64 criteria name it in `action`** (51 of them unstamped;
measured with the live `TAP_RE`/`TAP_CAMEL_RE`). `r-exec-cli.mjs` still has no scroll leg, so today a
scroll criterion gets one plain tap — the same degradation class. I did **not** add it to the refusal
set, because refusing a class I cannot service would convert ~51 honest-but-incomplete rows (audit
G-10 counts 57) into pure skips with no replacement path, and scroll *is* portable
(`r1-exec.cjs:1083-1114`, `cli-automator.mjs:13` documents `scrollTo`). It belongs with the port that
brings the scroll leg, not here. Flagging it so nobody reads "guard landed" as "all verbs honest".

## 3. Item 3 — network counting / condition injection / ActionSheet-option stubs (INVESTIGATION ONLY)
## 4. The four do-not-degrade ids (MSG26, DND08, DC08, VI40)
## 5. Negative tests and red-proof
## 6. Verdict lines (measured exit codes)
## 7. What remains UNKNOWN / device-only
