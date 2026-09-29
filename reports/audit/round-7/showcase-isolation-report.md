# Showcase band isolation — implementation report

Lane: showcase-isolation. Date: 2026-09-29. Scope owned: `apps/client/scripts/**`, `apps/client/package.json`.
Node 22 = `/d/codex-tools/node-v22.17.0-win-x64/node.exe` (v22.17.0); PATH `node` is v16.13.1, which makes the
carrier self-report `FAIL reason=node 过老` (`apps/client/scripts/build-real-isolated.mjs:128-132`), so every
direct run below is pinned to Node 22. Exit codes are read as `$?` of the redirected command itself — never of a
pipe, never shared across `a && b`.

---

## 0. Recon finding that changes the framing of the brief

The brief says "Do NOT copy `build-real-isolated.mjs` into a second file." **A second file already existed**:
`apps/client/scripts/build-showcase-isolated.mjs` (mtime 2026-09-27 00:42, 116 lines) was a full copy of the
real-band carrier with the showcase assertions filled in. The drift the brief warns about is not hypothetical —
it is on disk, and it had already produced four symptoms:

| drift symptom | evidence |
|---|---|
| the copy carries a Windows fix the original never got (`uni` must be invoked as an absolute `node_modules/.bin/uni.CMD`, because `Path` and the injected `PATH` coexist and `cmd.exe` picks the old one) | copy `:74-84` vs original `:47-52` |
| the build-marker detector only knows the original's file name, so runs of the copy are not recognised as builds | `scripts/qa/run-npm-script.mjs:31` regex `/uni\s+build\s+--platform\|vite\s+build\|build-real-isolated/` — measured: `NO-MATCH` for `node scripts/build-showcase-isolated.mjs --check-only` |
| the copy was **never wired into `package.json`** — the only showcase script was the un-isolated one, so "always use the isolated script" lived only in prose and leg files | `apps/client/package.json:27` (before this change), `scripts/qa/ui-queue.round7-stage6.json:37-40`, `scripts/qa/ui-queue.round7-carryover.json:4-7`, `scripts/qa/round7-post-b-slice.sh:62` |
| a downstream gate asserts the copy's behaviour that isn't true | `scripts/qa/verify-band-freshness.mjs:296-301` claims the showcase band goes through `strip-mock-for-mp`; the copy never called it (`:84`). Wrong in the conservative direction (it *declines* to convict), so no false red — reported, not edited (not my file) |

Consequence for this lane: generalising is still the right move, but **deleting the copy is not** — four files
outside my ownership call it by path. So the copy became a zero-logic delegation shim (§3), leaving exactly one
carrier. The regex gap above is now closed for the recommended path: measured `MATCH` for
`node scripts/build-real-isolated.mjs --band showcase`.

Also confirmed live concurrency: `scripts/qa/r-exec-cli.mjs` (mtime 16:21), `emit-tapfix-briefs.mjs`,
`emit-round-report.mjs`, `test-evidence-store-axis.mjs` were all being written by other lanes *while* this lane
ran. I touched none of them; my mutation work used copies under `.zcode/tmp` only, and both scratch trees are
removed (`test -d .zcode/tmp/orig-vs-new` → gone; `--self-test` deletes its own scratch).

---

## 1. BEFORE (recorded 16:15 local, before any edit)

| band | dir | `MODE:` | `VITE_API_MODE:` | `VITE_SHOWCASE_MODE:` | env.js size:mtime | sha256 |
|---|---|---|---|---|---|---|
| mock | `apps/client/dist/build/mp-weixin` | `mp-weixin-mock` | `mock` | absent | 2402:1790667960 | `f1c7b96b0b1e3b71cf4336102b19d5c2cf87fac987e290530b83667c0cc013f5` |
| real | `apps/client/dist/build/mp-weixin-real` | `real` | `real` | absent | 2392:1790667512 | `f0677920198be53f230c17ab56c10af7c07b27cdd7e028d259b7f6ffb1f87eb2` |
| showcase | `apps/client/dist/build/mp-weixin-showcase` | `mp-weixin-showcase` | `real` | `true` | 2441:1790667797 | `ed1cd82cf2f71837767c202163ac47a0d61138be53f5596926e31ad41c2a0e22` |

File counts: mock **2154**, real 2153, showcase 2154. (The brief said ~2153 for the mock band; measured 2154.)
**All three bands were self-consistent when this lane started** — the poisoning was live but dormant, already
repaired by a mock rebuild at 15:46. That makes the mock sha above a valid control for §4.
UI lease before building: `tmp/qa/locks/wechat-automation-cli.lock` = `"status":"released"`,
`releasedAt 2026-09-29T07:55:24Z`. No lease acquired, no legs run, simulator never started (builds only).

---

## 2. Step-2 decision: **fail loudly** (with an acknowledgement hatch), not warn

`build:mp-weixin:showcase` keeps its name, its `uni build ... --mode mp-weixin-showcase` tail and its position —
it is **not** silently repointed. A new pre-flight guard
(`apps/client/scripts/check-band-outdir-collision.mjs`) is now the **first** command in that chain, and it exits
1 when the run would write a non-mock band into the mock evidence dir. `build:mp-weixin:showcase:isolated` is the
new recommended path.

Why refusal is the safer of the two options:
- **A warning cannot reach a chain.** `a && b && c` continues past `console.warn`, so the build still lands in
  `dist/build/mp-weixin`; the damage surfaces later, in a *different* gate. That is exactly today's incident:
  `G7_RESULT=PASS` and `[verify] PASS` both printed while the mock dir held showcase content, so
  `verify-band-freshness` and every mock-band gate were measuring showcase bytes under a mock label.
- **The two outcomes are not symmetric in recoverability.** A refusal costs one re-run. A poisoned band costs
  the bytes *and* every verdict already stamped against that band's `mode@sha8`.
- **Refusal is red-capable**; §6 proves that removing it turns the same command green. A warning nobody asserts
  is unfalsifiable, and unfalsifiable guards in this repo have a habit of being "verified" by grep.
- **The hatch keeps it from being a brick:** `ALLOW_SHARED_MOCK_OUT=1` restores the old behaviour behind an
  explicit, logged acknowledgement (measured exit 0 + 4-line `!!` banner).
- **Ordering matters:** the guard runs *before* `prepare-static.mjs --dev`, which atomically swaps all of
  `apps/client/src/static`. Refusing after that write would churn the source tree for nothing. Measured: after
  `pnpm run build:mp-weixin:showcase`, `grep -c '^\[prepare-static\]'` = **0** — nothing downstream executed.

---

## 3. Changes (4 files; 1 new)

| file | change |
|---|---|
| `apps/client/scripts/build-real-isolated.mjs` | **generalised carrier** (118 → 353 lines). New `BANDS` table (`:86-116`) holding each band's genuinely specific facts — `uniMode`, output dir name, `stripMock`, pre-steps / full-chain steps, expected `MODE`/`VITE_API_MODE`/`VITE_SHOWCASE_MODE`, whether `VITE_API_BASE_URL` must be non-empty, the `[label]` prefix and the machine-line key. Flags: `--band real\|showcase`, `--expect-mode`, `--expect-api-mode`, `--expect-showcase-mode [V]`, `--mode`, `--self-test`. Defaults = real band = the pre-edit behaviour. Also absorbed from the copy: absolute `uni.CMD` resolution for non-`strip-mock` bands (`:191-198`, comment `:186-190`), and the showcase `config/feature-flags.js` self-cert (`:260-264`). Guard widened: now refuses case-variant, trailing-separator, `..`-aliased and **sub-directories** of the shared dir (`:145-162`) |
| `apps/client/scripts/build-showcase-isolated.mjs` | 116-line copy → 25-line **zero-logic shim** that spawns the carrier with `--band showcase` and forwards argv + exit code. Old path-based callers (`scripts/qa/round7-post-b-slice.sh:62`, the `ui-queue.round7-*.json` legs) keep working; nothing can drift because there is no second decision procedure |
| `apps/client/scripts/check-band-outdir-collision.mjs` | **new.** `--mode <uni --mode>` pre-flight guard for chains that cannot set `UNI_OUTPUT_DIR`; `--audit` prints each band's own `MODE`/`VITE_API_MODE`/`VITE_SHOWCASE_MODE` against `verify-band-freshness.mjs:33-37`'s expectations and exits 1 on any mismatch (automates the "after any multi-band rebuild, grep each band's `MODE:`" rule) |
| `apps/client/package.json` | `:27` guard-prefixed (still un-isolated, now fails); `:28` **new** `build:mp-weixin:showcase:isolated` → `node scripts/build-real-isolated.mjs --band showcase`; `:38` `check:band-collision` (`--audit`); `:39` `test:band-isolation` (`--self-test`). `build:mp-weixin:real:isolated` (`:31`) and `:isolated:full` (`:32`) left textually untouched |

Machine-line keys preserved per band: `G7_RESULT=` for real (parsed by `scripts/qa/write-gates-json.mjs:111`,
`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts:1355`, `scripts/qa/emit-round-report.mjs:1256` — the last one
greps the literal `[g7] 产物自证 .*` / `[g7] outDir=.*`, so both the prefix and the two-line shape are kept) and
`SHOWCASE_RESULT=` for showcase (the string the copy emitted, so leg prose stays true).

---

## 4. AFTER — the three required verifications

Ran `node22 apps/client/scripts/build-real-isolated.mjs --band showcase` from the **repo root** (proving the
carrier resolves its own paths, as the queue legs do). Log: `.zcode/tmp/showcase-build.log` (740 lines).

Carrier output (verbatim tail):
```
[prepare-static] restored full-static -> src/static: atomic promote OK（旧 SRC 已清理）
[uni-build-showcase] 用 D:\6\恋爱小程序\apps\client\node_modules\.bin\uni.CMD
[showcase] 产物自证 MODE=mp-weixin-showcase VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api VITE_SHOWCASE_MODE=true
[showcase] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-showcase sharedOutUntouched=yes
[showcase] feature-flags 产物里的初值：membershipEnabled:!1
SHOWCASE_RESULT=PASS
```

| required check | result | how measured |
|---|---|---|
| 1. `mp-weixin/config/env.js` still `MODE:"mp-weixin-mock"`, untouched by the showcase build | **YES** — `MODE:"mp-weixin-mock"` + `VITE_API_MODE:"mock"`; sha `f1c7b96b…c0cc013f5` **identical to the §1 control**; still 2154 files; mtime still 15:46:00 | `certutil -hashfile` + `find \| wc -l` + `stat` |
| 2. `mp-weixin-showcase/config/env.js` = `MODE:"mp-weixin-showcase"` and `SHOWCASE_MODE` present/true | **YES** — `MODE:"mp-weixin-showcase"`, `VITE_API_MODE:"real"`, `VITE_SHOWCASE_MODE:"true"`; env.js mtime moved 1790667797 → **1790669851 (16:17:31)** so bytes were really rewritten | same |
| 3. carrier printed `sharedOutUntouched=yes` | **YES** — line 738 of the log, quoted above | `grep` |

Two notes on honesty:
- The rebuilt showcase `env.js` **sha256 equals the pre-build sha** (`ed1cd82c…`) while its mtime moved. That is
  determinism, not a skipped build: the log contains the full vite pipeline (391→740 lines, chunk generation,
  `prepare-static` promote). Source had not changed since the 15:43 build, so the config file is byte-identical.
  Claim supported: *the band is built in its own directory without touching the other two*. Claim **not**
  supported by this run: *the showcase band picked up new source* — there was no new source to pick up
  (`verify-band-freshness` reports `srcDirtyFiles=0`).
- The build ran as a background job, so its own `$?` was not captured directly. `SHOWCASE_RESULT=PASS` is
  printed only on the zero-problems path, which is immediately followed by `process.exit(0)`
  (`build-real-isolated.mjs:267-268`), and the identical assertion path measured **exit 0** on a re-run with
  `--check-only` (see §6 table row 8). §9 then measured a *complete* run's exit code end-to-end through pnpm.

---

## 5. `verify-band-freshness` (unmodified, run before and after)

```
$ node22 scripts/qa/verify-band-freshness.mjs   → FRESH_EXIT=0
FRESH srcFiles=752 git脏项(0行报出/0条解析) srcDirtyFiles=0 档位=3 标记=4
  mock      产物文件=2154 最新产物=2026-09-29T07:46:03.835Z 脏项晚于产物=0 构建写回(仅mtime)=0
  real      产物文件=2153 最新产物=2026-09-29T07:38:36.179Z 脏项晚于产物=0 构建写回(仅mtime)=8
  showcase  产物文件=2154 最新产物=2026-09-29T08:17:34.649Z 脏项晚于产物=0 构建写回(仅mtime)=0
  标记 isAllowedMediaExt / parsePrivateQuoteContext / pinnedNotice / --hot-badge-bg ⇒ mock=real=showcase 全命中
FRESH_内容级 嫌疑(按mtime)=0 真过期=0 仅mtime已洗清=0 无法定罪=0 不可观测=0
FRESH_RESULT=PASS bands=3 markers=4 —— 每档产物都不晚于任何未提交改动，且符号级深检全部命中
```
**`FRESH_RESULT=PASS bands=3 markers=4`, true exit code 0.** The band-mode identity assertions at
`verify-band-freshness.mjs:135-140` (the ones that would have convicted this incident: `档位 mock 的产物模式不符…`)
are green, and showcase is now the **freshest** of the three bands — closing the "showcase lags mock/real" hole
for this cycle. `pnpm run check:band-collision` (`--audit`) independently reports
`BANDCOLLIDE_RESULT=AUDIT_OK bands=3`, exit 0.

---

## 6. Red-capable negatives (all measured)

Nothing below launched a build into a real band: refusals happen before any write, and every mutation ran on a
throwaway **copy** under `.zcode/tmp`.

| # | command | true exit | machine line | shared dir touched? |
|---|---|---|---|---|
| 1 | carrier `--out <real shared mock dir>` | **1** | `G7_RESULT=FAIL reason=拒绝把 real 产物构建到 mock 共享目录 D:\6\恋爱小程序\apps\client\dist\build\mp-weixin` (+ a new `…FAIL hint=` line) | **NO** — sha `f1c7b96b…` before == after; 2154 files |
| 2 | carrier `--band showcase --out <shared>` | **1** | `SHOWCASE_RESULT=FAIL reason=拒绝把 showcase 产物构建到 mock 共享目录 …` | NO |
| 3 | guard `--mode mp-weixin-showcase`, `UNI_OUTPUT_DIR` unset (= the pre-repair shape of `package.json:27`) | **1** | `BANDCOLLIDE_RESULT=REFUSE mode=mp-weixin-showcase target=…\mp-weixin shared_now=MODE:"mp-weixin-mock"/API:"mock" shared_fingerprint=2402:1790667960560.9883` | NO (guard never writes) |
| 4 | `pnpm run build:mp-weixin:showcase` (end-to-end legacy chain) | **1** | as #3, and `[ELIFECYCLE] Command failed with exit code 1` | NO — `^\[prepare-static\]` executed **0** times; mock sha unchanged afterwards |
| 5 | guard + `ALLOW_SHARED_MOCK_OUT=1` (hatch) | **0** | `BANDCOLLIDE_RESULT=WARN allowed_by_env=1` | n/a (guard alone) |
| 6 | guard `--mode mp-weixin-mock` (shared dir *is* its home) | **0** | `BANDCOLLIDE_RESULT=OK shared_is_home=true` | n/a |
| 7 | guard `--mode mp-weixin-showcase` **with** `UNI_OUTPUT_DIR=…\mp-weixin-showcase` | **0** | `BANDCOLLIDE_RESULT=OK isolated=yes` | n/a |
| 8 | carrier `--band showcase --check-only` (assertion path of the build in §4) | **0** | `SHOWCASE_RESULT=PASS` | NO |

### 6a. The mutation proof (`--self-test`, exit 0)

`node22 apps/client/scripts/build-real-isolated.mjs --self-test` copies **itself** into
`.zcode/tmp/band-isolation-selftest/{A-guarded,B-mutant}/` (so each copy's `SHARED_OUT` resolves inside the temp
tree and the real bands are physically unreachable), crafts a `real`-shaped `config/env.js` in the fake shared
dir, and deletes the guard from B by regex over the `// <<BAND_GUARD_BEGIN>> … <<BAND_GUARD_END>>` markers:

```
BANDISOLATION_A 带闸指向共享目录：exit=1 拒绝行=有 假共享目录指纹未变=yes
BANDISOLATION_B 删闸同命令：exit=0 拒绝行=无 机读行=G7_RESULT=PASS
BANDISOLATION_C 带闸指向合法独立目录：exit=0 机读行=G7_RESULT=PASS
BANDISOLATION_D 带闸 + showcase 档指向共享目录：exit=1 拒绝行=有 机读行=SHOWCASE_RESULT=FAIL
BANDISOLATION_RESULT=PASS cases=4 负例可红=是
```
- **A** = the assertion "it must refuse" is green.
- **B** = with the refusal removed, the *same* command prints `G7_RESULT=PASS`, exit 0 — so a test asserting
  refusal **fails on the mutant**, and the mutant green-lights a build straight into the mock band. That is
  today's incident reproduced on command, and it is the definition of red-capable the brief asked for.
- **C** = anti-"always-red gate" control: a guard that refused *everything* would also satisfy A, so C proves the
  legitimate isolated target still passes.
- **D** = the showcase instance of the same guard — the actual defect this lane was sent to fix.
- If the guard block is ever renamed/deleted, the self-test itself goes red rather than silently losing its
  negative (`BANDISOLATION_NOTE=… 找不到 BAND_GUARD 标记段`).

### 6b. Flag wiring proved non-dead (each override actually bites)

| run | exit | observed |
|---|---|---|
| `--band showcase --check-only --expect-mode nope` | 1 | `[showcase] MODE=mp-weixin-showcase（应为 nope）` → `SHOWCASE_RESULT=FAIL` |
| `--band showcase --check-only --expect-api-mode mock` | 1 | `[showcase] VITE_API_MODE=real（应为 mock）` → FAIL |
| `--check-only --expect-showcase-mode` (real band, which has no such field) | 1 | `[g7] VITE_SHOWCASE_MODE=取不到（应为 true）` → `G7_RESULT=FAIL` |
| `--band showcase --check-only --expect-showcase-mode` (bare, end of argv) | 0 | `SHOWCASE_RESULT=PASS` |

The third row caught a real bug during this lane: my first `optFlag()` returned `undefined` for a bare flag at
the end of `argv`, printing `（应为 undefined）` — an assertion whose own expected value silently degrades. Fixed
(`build-real-isolated.mjs:55-63`), then the whole battery was re-run.

---

## 7. The real band is byte-identical (proof, not claim)

The pre-generalisation carrier was pulled read-only out of git (`git show HEAD:apps/client/scripts/build-real-isolated.mjs`)
and both versions were run **in the same fake tree** (`.zcode/tmp/orig-vs-new/`, crafted per-band `env.js`) so
that every path in their output is identical:

| command | orig exit | new exit | stdout diff |
|---|---|---|---|
| `--check-only` (no other args = the `build:mp-weixin:real:isolated` assertion path) | 0 | 0 | **empty → `IDENTICAL=yes`** |
| `--check-only --out <fake shared dir>` | 1 | 1 | first line byte-identical; new adds a second `…FAIL hint=` line |

verbatim, both versions:
```
[g7] 产物自证 MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api
[g7] outDir=D:\6\恋爱小程序\.zcode\tmp\orig-vs-new\dist\build\mp-weixin-real sharedOutUntouched=yes
G7_RESULT=PASS
```
Behavioural additions on the real path are guard-*widening* only (each measured exit 1, refusal line present):
`…\mp-weixin\` (trailing sep), `…\mp-weixin/../mp-weixin`, `…\MP-WEIXIN` (Windows case-insensitive),
`…\mp-weixin\sub` (writing inside the band). None of these could occur before, so the default run is unchanged.

One later refinement was re-checked against the same fake tree, because it touched the same function: the
node-too-old hint hardcoded the word `G7`, which is wrong for the showcase band. It is now a band field
(`gateName`, `build-real-isolated.mjs:99` and `:115`; used at `:132`). Re-measured after the change:
`BYTE_IDENTICAL=yes` for the real band (orig exit 0 / new exit 0, empty diff), and the hint reads
`…会把 G7 记成假 FAIL` under `--band real` vs `…会把 展示档自证 记成假 FAIL` under `--band showcase`.
Both were also run under the PATH Node (v16.13.1) to record the trap honestly: each exits **1** with
`…=FAIL reason=node 16.13.1 过老` — an environment red, not a product red, and identical to how the real band
already behaved. (`pnpm run` is *not* affected: measured `process.versions.node = 22.17.0` inside a pnpm-run
script, §9.)

Every gate was re-run once more after that edit: `--self-test` exit 0 `BANDISOLATION_RESULT=PASS cases=4`;
`--check-only` exit 0 `G7_RESULT=PASS`; `--band showcase --check-only` exit 0 `SHOWCASE_RESULT=PASS`;
`verify-band-freshness` exit 0 `FRESH_RESULT=PASS bands=3 markers=4`; mock band sha still `f1c7b96b0b1e3b71`
(= the §1 control). Both temporary fake trees used for these comparisons (`.zcode/tmp/orig-vs-new`,
`.zcode/tmp/cmp`) were deleted, so no second copy of the carrier is left in the tree for a grep to find.

`pnpm run build:mp-weixin:real:isolated` and `…:isolated:full` command strings are untouched
(`package.json:31-32`), and their carrier is the same file the gates already point at
(`scripts/qa/write-gates-json.mjs:104`, `scripts/qa/emit-round-report.mjs:768`,
`scripts/qa/verify-rulings-landed.mjs:66`, `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts:1353`) — that is why
the generalised carrier kept the **name** `build-real-isolated.mjs` instead of being renamed to something honest.

---

## 8. Boundary compliance

No commits; no `git stash/checkout/reset/clean` (`git show HEAD:<path>` is read-only); `emit-tapfix-briefs.mjs`
never executed; `r-exec-cli.mjs`, `cli-automator.mjs`, `verify-band-freshness.mjs`, `run-npm-script.mjs` and
`reports/**` never edited. **Nothing under `dist/build` was deleted or cleared**: no `rm -rf` was ever pointed at
a band dir — the showcase band was overwritten in place by `uni` itself, and mock/real were only ever *read*
(proved by sha equality in §1/§4/§9). Final `git status --porcelain -- apps/client` shows exactly 3 modified +
1 untracked, all in paths I own. `apps/client/src` dirty count after the build: **0**; `src/static` back in its
`--dev` state (1345 files); the 4 `static_prepare_*` leftovers in `apps/client/` all pre-date this session
(09-12 / 09-22), my runs created none.

## 9. End-to-end through pnpm (`pnpm run build:mp-weixin:showcase:isolated`)

The new script was then run the way a human or CI would run it — `pnpm run` from `apps/client`, output
redirected, `$?` read from that command alone:

```
$ pnpm run build:mp-weixin:showcase:isolated          → EXIT=0
$ node scripts/build-real-isolated.mjs --band showcase      (pnpm's echo of the chain)
[prepare-static] restored full-static -> src/static: atomic promote OK（旧 SRC 已清理）
[prepare-static] 完成（模式 --dev）
[uni-build-showcase] 用 D:\6\恋爱小程序\apps\client\node_modules\.bin\uni.CMD
…
DONE  Build complete.          (line 736, exactly one occurrence)
[showcase] 产物自证 MODE=mp-weixin-showcase VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api VITE_SHOWCASE_MODE=true
[showcase] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-showcase sharedOutUntouched=yes
[showcase] feature-flags 产物里的初值：membershipEnabled:!1
SHOWCASE_RESULT=PASS
```

Two side findings worth recording:
- **pnpm hands the script Node 22, not the PATH Node.** Measured inside the same shell: bash's `node --version`
  = `v16.13.1`, but `process.versions.node` seen by a child of a pnpm-run script = `22.17.0`. So the
  node-too-old trap that forces `tmp/run-node22.cjs` wrappers in the workflow does **not** apply to the pnpm
  entry points — which is what `scripts/qa/write-gates-json.mjs:104` relies on.
- Final band table after this second rebuild (mock/real shas still equal to the §1 control):

| band | files | MODE / VITE_API_MODE / VITE_SHOWCASE_MODE | env.js sha256 | moved? |
|---|---|---|---|---|
| mock | 2154 | `mp-weixin-mock` / `mock` / absent | `f1c7b96b…c0cc013f5` | no (= §1 control) |
| real | 2153 | `real` / `real` / absent | `f0677920…f87eb2` | no (= §1 control) |
| showcase | 2154 | `mp-weixin-showcase` / `real` / `true` | `ed1cd82c…2a0e22` | mtime → 16:25:53 |

Final gate state: `verify-band-freshness` → **exit 0**, `FRESH_RESULT=PASS bands=3 markers=4`, showcase now the
freshest band (08:25:57Z vs mock 07:46:03Z / real 07:38:36Z); `check:band-collision --audit` → exit 0,
`BANDCOLLIDE_RESULT=AUDIT_OK bands=3`; `test:band-isolation` → exit 0, `BANDISOLATION_RESULT=PASS cases=4`.

## 10. Still unproven / follow-ups (paths outside this lane's ownership)

1. **`start-showcase.bat` is now broken by design and needs a one-line decision.** It calls
   `pnpm run build:mp-weixin:showcase` at `:45` and then advertises the output dir as
   `apps\client\dist\build\mp-weixin` at `:59` — i.e. the launcher was written *expecting* the defect. With the
   guard it stops at step 1 with `BANDCOLLIDE_RESULT=REFUSE` (measured, exit 1) and prints
   `[ERROR] 展示包编译失败`. Correct fix is either `build:mp-weixin:showcase:isolated` + point at
   `dist\build\mp-weixin-showcase`, or `set ALLOW_SHARED_MOCK_OUT=1` before `:45` to keep the old behaviour
   behind the loud banner. I did not edit it (outside ownership) and did **not** run it (`:26` launches
   `pnpm api:dev`, a backend side effect I am not authorised to start). **UNKNOWN: whether the bat works
   end-to-end either way — never executed in this lane.**
2. **`build:mp-weixin` (`package.json:25`) is a second instance of the same class, left unguarded.**
   Its `--mode mp-weixin` + `.env.mp-weixin:14` (`VITE_API_MODE=real`) means it also lands in the mock band's dir,
   and the guard convicts it when run directly (measured: `BANDCOLLIDE_RESULT=REFUSE mode=mp-weixin`, exit 1) —
   but I did not wire it into the chain, because `build-mp-weixin.bat:74` and `tools/verify-client-builds.mjs:35`
   call that script and wiring would turn another lane's check red without its owner's consent. Needs a decision.
3. **`scripts/qa/run-npm-script.mjs:31` still cannot see the shim path.** Measured against that exact regex:
   `MATCH` for `node scripts/build-real-isolated.mjs --band showcase` (the new script is now recognised as a
   build — one concrete dividend of generalising instead of copying), but still `NO-MATCH` for
   `node scripts/build-showcase-isolated.mjs --check-only`. Legs that name the shim
   (`scripts/qa/round7-post-b-slice.sh:62`, `ui-queue.round7-stage6.json:37`, `round7-carryover.json:4`,
   `round7-final.json:18`) should switch to `build:mp-weixin:showcase:isolated` or the carrier path.
4. **`scripts/qa/verify-band-freshness.mjs:296-301` carries a false premise about showcase.** It exempts
   `src/services/mocks/**` from conviction on non-mock bands because "that band's chain has strip-mock-for-mp";
   the showcase band does **not** strip mock (`build-real-isolated.mjs` `BANDS.showcase.stripMock:false`). The
   error is in the safe direction — it declines to convict files it could actually have searched — so no red is
   invented, but coverage on the showcase band is quietly lower than the comment claims. Not my file; reported.
5. **`--full-chain` for the showcase band is implemented but never executed.** I only ran the showcase default
   chain (`prepare-static --dev` → `profile-svg-to-png` → `uni build`) and `--check-only`.
   **UNKNOWN: whether `--band showcase --full-chain` passes** (it adds `check-statusbar-offset`,
   `check-tabbar-consistency`, `check-project-rules` — `check-project-rules` measured PASS standalone, exit 0).
6. **`pnpm run build:mp-weixin:real:isolated` was never re-run for real in this session.** I proved its assertion
   path byte-identical in a fake tree (§7) instead of rebuilding the real band (needs 8080 up).
   **UNKNOWN for this session: a live real rebuild passing.** The gate that reads it
   (`write-gates-json.mjs:104` → `--check-only`) does pass against the on-disk real band (§6/§9 shas).
7. **The isolated showcase band is built and self-certified, not proven shootable.** Per the standing
   constraint I did not start the simulator, acquire `ui-lease`, or run legs — and a freshly built band dir must
   be imported into DevTools once before automation answers. **UNKNOWN: DevTools behaviour on
   `dist/build/mp-weixin-showcase`.**
8. **Size/feature gates still measure the wrong directory for showcase.** The carrier deliberately does not run
   `verify-package-size.mjs` / `verify-build-features.mjs` because they hardcode `dist/build/mp-weixin`
   (`prepare-static.mjs:154`, `verify-build-features.mjs:19`, `prune-unreferenced-static.mjs:26`; documented in the
   carrier header at `build-real-isolated.mjs:21-24`).
   So a green showcase build is **not** size compliance for that band, same caveat as the real band.

## 11. Final confirmation matrix (single pass, all of the above re-measured together)

| command | exit | machine line |
|---|---|---|
| `build-real-isolated.mjs --check-only` (the `build:mp-weixin:real:isolated` assertion path) | 0 | `G7_RESULT=PASS` |
| `build-real-isolated.mjs --band showcase --check-only` | 0 | `SHOWCASE_RESULT=PASS`, `sharedOutUntouched=yes` |
| `build-real-isolated.mjs --out <shared mock dir>` | **1** | `G7_RESULT=FAIL reason=拒绝把 real 产物构建到 mock 共享目录 …` |
| `build-real-isolated.mjs --band showcase --out <shared mock dir>` | **1** | `SHOWCASE_RESULT=FAIL reason=拒绝把 showcase 产物构建到 mock 共享目录 …` |
| `build-showcase-isolated.mjs --check-only` (old callers' path → shim) | 0 | `SHOWCASE_RESULT=PASS` |
| `build-real-isolated.mjs --self-test` | 0 | `BANDISOLATION_RESULT=PASS cases=4 负例可红=是` |
| `check-band-outdir-collision.mjs --audit` (= `pnpm run check:band-collision`) | 0 | `BANDCOLLIDE_RESULT=AUDIT_OK bands=3` |
| `scripts/qa/verify-band-freshness.mjs` | 0 | `FRESH_RESULT=PASS bands=3 markers=4` |
| `pnpm run build:mp-weixin:showcase` (legacy chain) | **1** | `BANDCOLLIDE_RESULT=REFUSE mode=mp-weixin-showcase …` |
| `pnpm run build:mp-weixin:showcase:isolated` (new, full build) | 0 | `SHOWCASE_RESULT=PASS` + `DONE  Build complete.` |

Band state at the end of the lane (shas unchanged from the §1 control for mock and real):

| band | `MODE:` | sha256 (16) | vs §1 |
|---|---|---|---|
| mock | `mp-weixin-mock` | `f1c7b96b0b1e3b71` | identical → never touched by this lane |
| real | `real` | `f0677920198be53f` | identical → never touched by this lane |
| showcase | `mp-weixin-showcase` + `VITE_SHOWCASE_MODE:"true"` | `ed1cd82cf2f71837` | rebuilt twice, in its own dir |

Scratch left behind on purpose (measurement evidence, all under `.zcode/tmp/`): `showcase-build.log`,
`pnpm-iso.txt`, `pnpm-legacy.txt`, `fresh{,2,3}.txt`, `st{2,3}.txt`, `ref*.txt`, `g1.txt`, `g2.txt`, `o*.txt`,
`f1-f8.txt`, `eslint{,-pre}.txt`. The two fake trees that held **copies of the carrier**
(`.zcode/tmp/orig-vs-new`, `.zcode/tmp/band-isolation-selftest`) are deleted, so no stale second carrier is
findable in the repo.

