# Lane: manifest triage (READ-ONLY)

> **入库副本（编排加的）**：从 `.zcode/tmp/lane-manifest-triage/` 复制入本仓，
> 同目录机器可读件叫 `inflight-manifests-r7.json`（原 `manifests.json`，33 个目录对象 + 10 个行对象）。
> 本件的价值是**把 #13 那条授权的前提证伪了**：`exec-*` 是执行器的 `--out` 结果目录而不是清单容器，
> "18 份在途清单"在盘上对不上任何测量（33 个目录里 30 个已跑、3 个全空），
> 且对 real-coverage 那 10 条欠账**一条也关不掉**（10 条都已有 real 档行、全部 SKIPPED）。
> 裁定侧的正式记录见 `decisions-v33.md` §32.1；本节"do not burn device time"的结论已被采纳，
> 本轮没有为 #13 花任何设备时间。文中列的载具危害（续跑重写别人表头、`done` 只认 `manifest|id` 不看 status、
> `--label` 在 `reports/screenshots/` 里 rmSync+覆写、showcase 把 `apiMode` 标成 real）
> 都还是**活的**，动执行器或截图目录前先读这一段。

HEAD `1788675d`. No writes outside `.zcode/tmp/lane-manifest-triage/`. No UI lease taken (`tmp/qa/locks/` untouched — 4 lock files observed, left alone). No DevTools touched. `apps/client/dist/build/**` **NOT read** (rebuild in flight); band sha8 values below come from the ops corpus and from the declared `band`/`project` fields inside the existing `exec-results.json` files, and freshness-at-run-time is marked `deferred-to-run-time`.

## 0. Headline — the premise is wrong, and running this batch buys zero coverage

**There are no in-flight unexecuted manifests.** `exec-*` directories under `reports/audit/round-7/` are the executor's **`--out` result directories**, not input-manifest containers. Input case manifests live in the ops corpus: `r-exec-cli.mjs:83` (`--ops` default `reports/audit/round-6/ops`), `:1132` (`readdirSync(OPS)`), `:1390` (`readFileSync(join(OPS, name + ".json"))`). `--manifests A,B` is a **name filter** over that corpus, not a path to a manifest file.

| measure | value |
|---|---|
| glob entries matching `round-7/exec-*` | 36 |
| of which files (`.md`) | 3 |
| of which directories | **33** |
| dirs with a populated (non-empty) `exec-results.json` | **30** — every non-empty one |
| dirs with NO files at all | 3 (`exec-guest-login-r8`, `exec-guest-mock-r7final`, `exec-guest-tap`) |
| dirs holding an unexecuted input manifest | **0** |
| **genuinely unexecuted manifests** | **0** |

**Your number 18 reconciles to nothing I measured** (not 36, 33, 30, 13, 11, 4 or 3). Nearest real numbers: 4 dirs named `exec-real-coverage-*-r9` (the round-8-coverage remedy wave, `gitSha=a4c8f995`), 13 dirs whose declared scope contains all 10 uncovered rows, 11 dirs lacking `manifest-detail.json`. Most likely it is a pre-r9/pre-r10 snapshot.

Second correction: **`manifest-detail.json` is not an input manifest and cannot be an executed/unexecuted discriminator.** Its own declared `harness` field says it is *downstream*: `"scripts/qa/exec-frames-to-corpus.mjs ← reports/audit/round-7/exec-A-real-only/exec-results.json"`. Its presence proves *more* progress than its absence.

Third, decisive: `REALCOV_NEVER_ON_REAL=0`. Not one uncovered row lacks a real-band row. **All 10 have real-band rows and all 10 are SKIPPED** (`REAL_BAND_BUT_ALL_SKIPPED=10`). This is not a band-coverage gap, so no band sweep can close it.

**How many of the 10 uncovered real-coverage rows can this batch close: ZERO. None of them.** All 10 were already *in the declared scope* of `exec-real-coverage-a-r9` (23 rows) and `exec-real-coverage-a-showcase-r9` (16 rows) and of 8 full-ledger real legs. They ran, they came back SKIPPED, and the skip reasons are carrier/recipe/identity/native-layer gaps — not "not yet run". Re-running the same dirs with the same flags reproduces the same skips verbatim. **Device time should not be spent on this batch.**

## 1. Enumeration (all 33 dirs; band + identities read from declared fields)

Declared `band` / `identities` / `project` / `runner` are read from each `exec-results.json` header, never inferred from the dirname.

| dir | cases | band (declared) | identities (declared) | project (declared) | EXECUTED / SKIPPED / FAILED | state |
|---|---|---|---|---|---|---|
| exec-A-login-r8 | 38 | mock@f1c7b96b | A | mp-weixin | 0/36/2 | all-SKIPPED login probe |
| exec-A-mock-final | 1107 | mock@f1c7b96b | A | mp-weixin | 650/414/43 | finished full ledger |
| exec-A-mock-r7final | 1107 | mock@f1c7b96b | A | mp-weixin | 642/414/51 | finished, superseded by -final |
| exec-A-mock-stage7 | 875 | mock@f1c7b96b | A | mp-weixin | 275/589/11 | finished partial band |
| exec-A-real | 1107 | real@f0677920 | A | mp-weixin-real | 822/236/49 | finished full ledger |
| exec-A-real-only | 1107 | real@f0677920 | A | mp-weixin-real | 194/907/6 | finished (+ `exec-results.rejected.json`) |
| exec-A-real-only.partial-second-exit-bug | 410 | real@f0677920 | A | mp-weixin-real | 0/410/0 | **aborted, 100% SKIPPED** — name matches a recorded bug, superseded by `exec-A-real-only` |
| exec-A-real-r7final | 1107 | real@f0677920 | A | mp-weixin-real | 195/906/6 | finished |
| exec-A-real-stage7 | 875 | real@f0677920 | A | mp-weixin-real | 107/767/1 | finished partial |
| exec-A-showcase-r8e | 78 | real@ed1cd82c | A | **mp-weixin-showcase** | 31/47/0 | finished |
| exec-ch12-knife | 1 | real@ed1cd82c | A | mp-weixin-showcase | 1/0/0 | finished single-row knife |
| exec-guest-login-r8 | — | — | — | — | — | **EMPTY dir, no manifest, no results** |
| exec-guest-mock-r7final | — | — | — | — | — | **EMPTY dir** |
| exec-guest-real | 1107 | real@f0677920 | guest | mp-weixin-real | 434/434/239 | finished |
| exec-guest-real-close-r8e | 350 | real@f0677920 | guest | mp-weixin-real | 15/335/0 | finished |
| exec-guest-real-final | 1107 | real@f0677920 | guest | mp-weixin-real | 436/432/239 | finished |
| exec-guest-real-guard-r10 | 156 | real@f0677920 | guest | mp-weixin-real | 2/146/8 | finished; 5 loose PNGs written beside results |
| exec-guest-real-login-r8 | 38 | real@f0677920 | guest | mp-weixin-real | 0/38/0 | aborted, 100% SKIPPED |
| exec-guest-real-only | 1107 | real@f0677920 | guest | mp-weixin-real | 100/915/92 | finished |
| exec-guest-real-r7final | 1107 | real@f0677920 | guest | mp-weixin-real | 105/915/87 | finished |
| exec-guest-real-stage7 | 875 | real@f0677920 | guest | mp-weixin-real | 53/820/2 | finished partial |
| exec-guest-tap | — | — | — | — | — | **EMPTY dir** |
| exec-interact-denyexp-r10 | 1 | real@ed1cd82c | A | mp-weixin-showcase | 0/1/0 | DENY experiment, aborted-shape |
| exec-interact-real-sc-guest-r10 | 3 | real@ed1cd82c | guest | mp-weixin-showcase | 0/3/0 | aborted, 100% SKIPPED |
| exec-interact-real-sc-r10 | 49 | real@ed1cd82c | A | mp-weixin-showcase | 19/30/0 | finished; **custom vehicle, not r-exec-cli** |
| exec-real-coverage-a-r9 | 23 | real@f0677920 | A | mp-weixin-real | 7/16/0 | finished, **the remedy wave — spent** |
| exec-real-coverage-a-showcase-r9 | 16 | real@ed1cd82c | A | mp-weixin-showcase | 2/14/0 | finished, spent |
| exec-real-coverage-guest-r9 | 4 | real@f0677920 | guest | mp-weixin-real | 0/4/0 | aborted, 100% SKIPPED |
| exec-real-coverage-guest-showcase-r9 | 4 | real@ed1cd82c | guest | mp-weixin-showcase | 1/3/0 | finished |
| exec-tap-final | 259 | mock@f1c7b96b | A | mp-weixin | 100/159/0 | finished, superseded by final3 |
| exec-tap-final2 | 93 | mock@f1c7b96b | A | mp-weixin | 31/62/0 | superseded |
| exec-tap-final3 | 1107 | mock@f1c7b96b | A | mp-weixin | 650/414/43 | finished |
| exec-ws-tap-r8 | 145 | **(no band field at all)** | no `identities` key | — | 37/100/8 | finished; produced by `r-exec-ws.mjs`, the gate's 31 BANDLESS + 31 IDENTITYLESS rows |

Naming vs state (the guardrail you flagged): `exec-A-mock-**final**` / `exec-A-mock-**r7final**` differ only by 8 EXECUTED rows; `**stage7**` dirs are 875-row partials, not later than the 1107-row ones; `exec-A-real-only.**partial-second-exit-bug**` is genuinely aborted (410 rows, 0 EXECUTED) and is superseded by `exec-A-real-only`. So a `*final` name does **not** mean "the last word" and `*partial*` does not mean "pending" — all state readings above are from declared fields.

**Capability-flag reading (important):** the `runner` field of all 10 real-band dirs that declare the full 10-row debt scope reads `tap+real 切片` / `real-cases-only 切片` / `tap 切片` — **not one carries a `+rapid` / `+scroll` / `+gestures` / `+capture` / `+geompos` / `+net` suffix.** Per the executor's own header, those five flags are exactly what the rapidTap/scroll/pullDown/toast-modal/geometry criteria need. So the remedy wave was run in the plain slice.

## 2–3. Row-level extraction and classification

The actionable unit is the *row*, not the dir. All fields below read from the ops row's own declared fields (`requiresReal`, `identities`, `pre`, `action`, `tapTarget`) plus the executor's source comments. `unknown` is written where the ops row declares nothing.

| row | page | band from field | identities from field | missing axis | classification | blocking reason |
|---|---|---|---|---|---|---|
| PAGES-PROFILE-INDEX\|PFI25 | pages/profile/index | requiresReal=true → real | A, B | login | **NOT_SHOOTABLE** | native showModal 取消/确定 branch is not in the render tree; `automation_element_action` takes only a selector (c21 G-12 @:381). Plus per-case pre `接 PFI23 已有语音状态` (G-16). pull-down half → `--gestures` |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI25 | subpackages/village/village/index | requiresReal=true → real | A, B | login | **NOT_SHOOTABLE** | `.post-card__audit` only exists after a write side-effect (publish→return); no per-case sequenced pre-recipe exists |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI34 | subpackages/village/village/index | requiresReal=true → real | A, B | login | **NOT_SHOOTABLE** | needs injected slow/failure states + 发帖开关 off (backend app_switch); c21 G-3 is `[NEW]`, true 断网 is `[SURFACE]` |
| 次要18\|TD03 | subpackages/circles/circles/topic-detail | requiresReal=true → real | A, B | login | **NOT_SHOOTABLE (carrier-only fix)** | see below — **all device preconditions already met** |
| 次要20\|OT05 | subpackages/profile-extra/profile/other | requiresReal=true → real | A, B | login | **NOT_SHOOTABLE** | `.relationship-cta__btn--like` is inside `RelationshipCTA.vue`; `r-exec-cli.mjs:1239-1241` says the CLI channel cannot enter a component subtree ⇒ 归 WS 腿 (`r-exec-ws.mjs`), which is WS_UP=FAIL |
| 次要20\|OT06 | same | requiresReal=true → real | **unknown — row declares no `identities` field** | login+guest | **NOT_SHOOTABLE** | same component-subtree block; two contradictory landings on one page; guest axis redirects to pages/login/index |
| 次要20\|OT09 | same | requiresReal=true → real | A, B | login | **NOT_SHOOTABLE** | DENY_TAP prose hit + component subtree (`.whisper-sheet__input` in `WhisperComposeSheet.vue`) |
| 次要20\|VRN07 | subpackages/profile-extra/verification/real-name | requiresReal=true → real | A, B | login | **NEEDS_IDENTITY** | pre demands a real-backend account born <18y (or birthDate absent). All three bands can render this page — band is the wrong axis. `assertIdentityProducible` (`:1156`) refuses an un-mintable label. Criterion itself names UNVERIFIED as the honest terminal state |
| 次要21\|OC09 | subpackages/chat/official-chat/index | requiresReal=true → real | **unknown — row declares no `identities` field** | login+guest | **NOT_SHOOTABLE** | needs `GET /official-accounts/{code}/messages` → 5xx/断网. Network layer, unreachable by selectors; `--net-count` only *counts*, it cannot make a request fail |
| 次要22\|VB03 | subpackages/vip/bills | requiresReal=true → real | A, B | login | **NEEDS_REBAND** | pre literally names **展示版 = the showcase band**. real band cannot hold 我的→VIP→账单 (VIP completeness gate redirects: recorded `本页没落在声明页（栈顶=pages/profile/index）`). Band that CAN express it: `apps/client/dist/build/mp-weixin-showcase` + `--allow-gate`. Second blocker: the row declares **no `tapTarget`**, so the showcase leg recorded `action 含交互动词但没点名可交互元素` — a criterion-tightening debt, not a band one |

Counts: **SHOOTABLE_NOW 0 · NEEDS_IDENTITY 1 · NEEDS_REBAND 1 · NOT_SHOOTABLE 8** (one of the 8 needs only a carrier fix, no device capability).

### The one near-miss worth naming: 次要18|TD03

Everything that normally costs device time is already solved for TD03: real band has rows, identity A is producible, `ROUTE_QUERY` already pins `topicId=37` for this page (`r-exec-cli.mjs:1213-1224`, with the in-register `circle_topics.id=37` justification written out), and input/tap/`rapidTap×5` are covered by `--tap --rapid --strict-verbs`. The **only** blocker is `r-exec-cli.mjs:1539`:

```
const DENY_TAP = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;   // :138
if (TAP_MODE && ... && wantsInteraction(c.action)) { if (DENY_TAP.test(String(c.action||""))) → SKIPPED
```

It matches against the **`c.action` prose**. TD03's action says 「② **清空** .reply-input 后 tap .reply-btn 发送」 — clearing a text field, not destroying an account. OT09 says 「每路关闭后重新打开检查内容是否**清空**」. Both are denied as if they were logout wipes. Verified: no argv bypass exists (only `--allow-gate` / `--allow-guest-mock`, neither touches DENY_TAP). This is a prose-derived verdict — precisely the failure mode this repo's declared-fields rule forbids — and it is 2 of the 10 uncovered rows. Recorded, **not fixed** (out of this lane), and **not converted into a pass**.

## 4. Overlap with verify-real-coverage's named debts

Gate run read-only via `node scripts/qa/verify-real-coverage.mjs` (invoked with no special flag at `scripts/qa/run-final-verify-v33.sh:42`; Node 22). Per-row uncovered list confirmed present:

```
REALCOV_CASES=236  REALCOV_COVERED=198  REALCOV_UNCOVERED=10／236
REALCOV_NEVER_ON_REAL=0  REAL_BAND_BUT_ALL_SKIPPED=10  JUDGED_MISSING_A=10  JUDGED_MISSING_GUEST=2
REALCOV_AUTOMATABLE_EXEMPT=28  REALCOV_CONSERVATION=OK (28+198+10=236/236)
REALCOV_UNCOVERED_LIST=10 → PFI25 VI25 VI34 TD03 OT05 OT06 OT09 VRN07 OC09 VB03
   (8 rows 缺=login; OT06 and OC09 缺=login+guest)
REALCOV_UNCOVERED_LEDGER=OK  REALCOV_RESULT=FAIL
```

**Which uncovered rows would the SHOOTABLE_NOW manifests close? There are no SHOOTABLE_NOW manifests, so: 0 of 10.** Being conservative about declared scope only strengthens this: 13 dirs already list all 10 ids in their own scope (10 of them on a real band), a further 11 list a subset (`exec-A-mock-stage7`(7) `exec-A-real-stage7`(7) `exec-guest-real-stage7`(7) `exec-guest-real-close-r8e`(6) `exec-ws-tap-r8`(5) `exec-real-coverage-guest-r9`(2) `exec-real-coverage-guest-showcase-r9`(2) and 4 with 1), and 9 list none — yet all 10 remain on the list. Presence in a *mock*-band scope does not count: the gate claims only `/^real(@|$)/`, so `exec-A-mock-final`, `exec-A-mock-r7final` and `exec-tap-final3` are structurally invisible to this debt no matter what they contain.

**Answer to your decision question: running this batch is not worth device time.** The remedy is a carrier fix (DENY_TAP scoping → TD03, maybe OT09), a criterion fix (tapTarget on VB03), an identity mint (VRN07), a band switch to showcase (VB03), and the WS channel (OT05/OT06/OT09) — plus a network-fault carrier that does not exist yet (OC09, VI34). Only TD03 is a flag+carrier-only win.

## 5. Command shapes

**Nothing in this batch should be run today.** Shapes below are for *after* the carrier/criterion fixes land, and each is scoped to a **FRESH `--out`** (see hazards). Flags are taken from the executor's own argv reads (`--project --out --ops --label --manifests --limit --settle --identity --real --real-cases-only --tap --gestures --strict-verbs --native-capture --rapid --rapid-gap --scroll --geom-pos --net-count --allow-gate --allow-guest-mock --guest-warmup --redo-holes --selftest`), not from your description.

```sh
N=/d/codex-tools/node-v22.17.0-win-x64/node.exe   # header: PATH=<node22 dir>:$PATH node …

# TD03 — ONLY after DENY_TAP is scoped. real band, login axis.
"$N" scripts/qa/r-exec-cli.mjs \
  --project apps/client/dist/build/mp-weixin-real \
  --ops reports/audit/round-6/ops \
  --manifests 次要18 --limit 1 \
  --label r11-td03-a --out reports/audit/round-7/exec-r11-td03-a \
  --identity A --real --tap --rapid --strict-verbs --native-capture --gestures --scroll --geom-pos
# do NOT set QA_SKIP_UI_LEASE=1

# VB03 — needs the SHOWCASE band + a tapTarget added to the ops row first.
"$N" scripts/qa/r-exec-cli.mjs \
  --project apps/client/dist/build/mp-weixin-showcase \
  --manifests 次要22 --label r11-vb03-a --out reports/audit/round-7/exec-r11-vb03-a \
  --identity A --real --tap --gestures --strict-verbs --allow-gate
# --allow-gate because the VIP completeness gate otherwise SKIPS the row

# guest axis for OT06 / OC09 (login+guest rows) — separate leg, separate --out
"$N" scripts/qa/r-exec-cli.mjs \
  --project apps/client/dist/build/mp-weixin-real \
  --manifests 次要20,次要21 --label r11-oc06-guest --out reports/audit/round-7/exec-r11-oc06-guest \
  --identity guest --real --tap --guest-warmup
# assertGuestCapable refuses guest on the mock band unless --guest-warmup
```

Executor semantics you asked me to confirm (quoted from source):

- **Non-ASCII `--manifests` values survive this shell.** Measured: `node … -- --manifests 次要18,次要20` reaches `process.argv` as `["--manifests","次要18,次要20"]` intact, and `次要18.json … 次要22.json` are real ops filenames. (With `node -e` a bare `--manifests` is parsed as a node option; running the script file, as the shapes above do, is unaffected.) Dropping `--manifests` entirely makes the executor scan all 24 ops files via `readdirSync(OPS)` — i.e. it would sweep ~1107 rows, not the 10 you want.

- **Lease** (`:1246-1260`): `acquireUi({owner: "r7-cli-exec-" + LABEL, batch:"R7"})`. If it cannot get the lease it prints `RUNNER_LEASE=…已被占用…` and **exits 2 having run zero rows** — by design, not a bug. Identity self-proof (`assertIdentityProducible`, `:1156-1159`) happens *before* mkdir and *before* the lease, so a refused identity touches nothing. `QA_SKIP_UI_LEASE=1` overrides the lease and is recorded as `RUNNER_LEASE=SKIPPED`; do not use it while another driver holds the simulator.
- **`--out` resume/merge** (`:1135`, `:1147`): `const done = new Set((prior.results||[]).map(r => r.manifest + "|" + r.id))` — **keyed on manifest|id regardless of status**. A previously **SKIPPED** row counts as done and will **not** be re-shot. `--redo-holes` (`:1142`) only voids rows that are `EXECUTED && !evidence && !/present\(|absent/` — it does **not** void SKIPPED rows. So resuming into an existing dir yields `rows.length === 0` → `:1843` `一行都没产生` → the run fails and writes nothing. **A re-shoot needs a brand-new `--out`.**
- **Per-row sha stamping** (`:1076-1130`, `:1352-1356`): the `#C-2` fix is present and works — a prior row that already carries `gitSha` is passed through untouched, and one that does not inherits the **prior file header** sha with `gitShaSource:"inherited-prior-file"`, never the resuming boot's sha. Top-level `gitSha` is now explicitly scoped (`gitShaScope:"this-boot"`). **But I measured 0 per-row `gitSha` on every existing file** (`exec-real-coverage-a-r9` 0/23, `exec-interact-real-sc-r10` 0/49, `exec-ws-tap-r8` 0/145, `exec-A-real` 0/1107) and no existing file has `gitShaScope`/`boots`/`mergedFrom` — they predate the fix. On resume they get `inherited-prior-file` = that dir's own old header, which is correct attribution, **not** a re-stamp.

## 6. Hazards for the execution lane (flagged, not fixed)

1. **H1 — resuming into any existing `exec-*` dir rewrites another lane's provenance header.** `:1356` writes the merged file with `round: LABEL, identity: IDENTITY, identities, project, band, loginVerify, runner` derived from **the resuming boot**, and `fileStampHeader` sets top-level `gitSha` to the new HEAD. Rows keep their sha, but the *header* of e.g. `exec-real-coverage-a-r9` would flip from `gitSha=a4c8f995 / band=real@f0677920` to the resuming process's values, re-labelling a finished batch produced by another lane. Also these files are the gate's denominator (`EXEC_ROWS=15363`), so an in-place merge changes every other lane's reading. → **Mandatory: fresh `--out`.**
2. **H2 — `--label` collides the evidence corpus.** `SHOT_DIR = reports/screenshots/<LABEL>` (`:298`), frames named `<manifest>-<id>-after.png` (`:1757`), and `:1759` does `rmSync(f,{force:true})` before re-shooting the same path. Two lanes sharing a `--label` **delete and overwrite each other's frames in the authoritative screenshots corpus**, and rows' `evidence` fields point at those paths. → pick a unique label per leg.
3. **H3 — showcase band is counted as real.** `band-freshness-final.json` declares showcase `apiMode:"real"`, so a showcase leg stamps `band=real@ed1cd82c` and `verify-real-coverage` (`/^real(@|$)/`) claims it as real coverage. 5 round-7 dirs ran on `mp-weixin-showcase`. Reading `real@…` as "the real band" without checking the sha8 produces a false green. → **deferred-to-run-time**: re-read the three bands' sha8 from the freshly built artifacts before attributing any row.
4. **H4 — `exec-ws-tap-r8` is structurally invisible.** Its 145 rows have **no `band` and no `identity` field** (produced by `r-exec-ws.mjs`, not `r-exec-cli.mjs`). This is exactly the gate's `REALCOV_BANDLESS_ROWS=31 / REALCOV_IDENTITYLESS_ROWS=31` bucket. Any re-shoot via the WS leg must stamp both or the work is wasted.
5. **H5 — DENY_TAP prose regex** (`:138/:1539`) currently denies TD03 and OT09 on the strength of the word 清空 meaning "clear an input field". Left unfixed, re-running them wastes a leg; fixing it by widening the regex in prose-space would be a second prose-derived verdict. Needs a declared irreversible-action field, not a regex tweak.
6. **H6 — custom vehicles bypass the ledger.** `exec-interact-real-sc-r10` was produced by `.zcode/tmp/lane-ui2/interact-pair.mjs` (`cli-automator.mjs 原语 + ui-lease 显式包裹`), and `exec-guest-real-guard-r10` wrote loose PNGs directly beside its `exec-results.json`. Neither path goes through the executor's conservation checks. Re-shooting on a custom vehicle will not carry the declared fields the gate needs.
7. **H7 — this lane's own output files** are `REPORT.md`, `manifests.json`, `_scan.json`, `_debts.json`, `_debt-attempts.json`, `_dirs.json`, `_gate-realcov.txt`, `build-manifests.mjs`, all under `.zcode/tmp/lane-manifest-triage/`. Nothing was written under `reports/**`, `scripts/**`, `.zcode/workflows/**`, or `apps/client/dist/build/**`.
