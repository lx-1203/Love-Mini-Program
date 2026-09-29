# C21 — QA executor capability matrix (`r-exec-cli.mjs` vs `r1-exec.cjs`)

Read-only research lane. Every claim below carries a `file:line` that was actually opened in this
session. Nothing was executed except read-only file inspection; no file outside this one was touched.

Scope of the two carriers compared:

- `scripts/qa/r-exec-cli.mjs` — 797 lines, the executor all QA gates currently use (CLI/`automation_*`
  bridge transport).
- `scripts/qa/r1-exec.cjs` — 1596 lines, older executor on `miniprogram-automator` WS transport.
- Supporting bridges: `scripts/qa/cli-automator.mjs` (CLI tool wrapper), `scripts/qa/r-exec.cjs`
  (2199-line WS executor, cited by the ledger as the other place unported ops live),
  `scripts/qa/r-exec-ws.mjs`.

## (a) r-exec-cli op surface

Transport: every capability is a one-shot `execFileSync` of the WeChat IDE CLI service port through
`scripts/qa/cli-automator.mjs` (`ideCall` → `automation_evaluate` / `automation_element_action` /
`simulator_open_page` / `simulator_screenshot`). Imports are fixed at `r-exec-cli.mjs:25` —
that import list is the whole reachable surface: `evaluate, openPage, shot, mintToken, bootSession,
verifyLogin, routeStack, clearSession, element, assertIdentityProducible, observedUserId`.
Anything exported by `cli-automator.mjs` but absent from that list (`nodeCount:181`,
`nodeHtml:192`, `readPageData:364`, `apiPost:203`) is unreachable from this executor.

### Channel-level ops (run once per batch / per page group)

| # | op | implementation (file:line) | evidence captured |
|---|---|---|---|
| 1 | `evaluate(fnSource)` — run JS in app context | `r-exec-cli.mjs:228`, `:231` (only ever inside `probeMany`); `cli-automator.mjs:137` | string return; **the `'started:'+N` return at `:228` is discarded** |
| 2 | `openPage(route, query)` | `r-exec-cli.mjs:389` (guest warmup), `:479` (per page group); `cli-automator.mjs:156` | nothing — return value ignored; landing is re-read by op 4 |
| 3 | `clearSession()` | `r-exec-cli.mjs:393` | stored in the `SESSION_SOURCE` string only |
| 4 | `routeStack()` — page stack joined by `\|` | `r-exec-cli.mjs:391, 485, 493, 632`; `cli-automator.mjs:166` | full stack string → `row.route`; tri-state (route / empty / `ERR`) preserved at `:496-497`, retried once at `:491-495` |
| 5 | `verifyLogin()` | `r-exec-cli.mjs:395, 410` | `row.loginVerify` (`:181`), header `loginVerify` (`:789`) |
| 6 | `mintToken(kind)` + `bootSession(token)` | `r-exec-cli.mjs:407-408` | `SESSION_SOURCE` (`:409`) + `minted.userId` cross-checked against store at `:422-427` |
| 7 | `assertIdentityProducible` | `r-exec-cli.mjs:265` | aborts the whole batch before lease/dir creation (`:266-270`) |
| 8 | `shot(path)` — screenshot | `r-exec-cli.mjs:703` | `evidence = relOf(f)+"("+sz+"B)"` at `:705` — see diff C-6 |
| 9 | `probeMany(selectors)` — folded multi-selector existence probe | `r-exec-cli.mjs:219-237` (impl), called at `:503` (lock gate), `:525` (per group), `:530` (retry), `:534` (`domFor`, post-tap re-probe) | per selector: `present(N)` / `absent` / `no-answer` / `ERR` (`:234`) → `observed` at `:539-541`. **Geometry dropped — see diff C-1** |
| 10 | `element(action, selector, opts, extra)` — element-level action | `r-exec-cli.mjs:611` — **only ever called with `"tap"` or `"input"`** | `tapNote` string `"tap[sel,…] 未成[…]"` at `:634`; `stats.tapsDone` `:617` |

### Per-case verbs actually reachable (`:555-721`)

| verb | guard / dispatch | outcome recorded |
|---|---|---|
| no-op (band skip: `requiresReal` × band, `--real-cases-only`) | `bandSkip` `:553-554`, branches `:646-650`, `:651-656` | `SKIPPED` + reason naming the measured `VITE_API_MODE` |
| identity-scope skip (`c.identities`) | `identityScopeSkip` `:81-86`, used `:557-562` | `SKIPPED`, names the carrier file |
| stamped non-automatable (`c.automatable === false`) | `notAutomatableSkip` `:90-95`, used `:563-568` | `SKIPPED` + `notAutomatableReason` + `notAutomatableFrom` |
| lock-screen gate (`.lock-screen` present) | `:63`, `:503-522` (`isLockCriterion` `:134`) | `SKIPPED` `stats.skipGate`; lock-named cases still judged |
| `tap` (click) | dispatch `:611`, `element("tap", sel, …, ["--wait","1"])` | `tap:` + sel in `done[]` `:612` |
| `input` (type) | `wantsInputLeg` `:212`, `:608`; `element("input", sel, …, ["--value","123456"])` `:611` | `input:` + sel; **value is hardcoded `123456`** |
| DENY list (irreversible account ops) | `DENY_TAP` `:60`, `:582-586` | `SKIPPED` `stats.tapDeny` |
| ambiguity guard (inferred name hits >1) | `:594-598` via `probeCount` `:208` | `stats.tapAmbiguous`, target dropped |
| post-interaction landing re-check | `:631-642` | `LEFT_PAGE` `SKIPPED` `stats.leftPage` |
| frame capture | `:700-707` | path + byte size in `evidence` |
| "criteria name nothing observable" | `:682-687` | `SKIPPED` `stats.skipNoCrit` |
| probe/route both silent | `:688-696` | `SKIPPED` `stats.skipProbe`, tri-state kept separate |

### Row shape (`row()` `:173-187`)

Written per line: `suite, manifest, id, page, tier, identity, band(mode@sha8), loginVerify,
sessionSource, requiresReal, title, status, observed, missingEvidence, failureReason, route,
toast, console, evidence, durationMs, at`.

**`toast` and `console` are literal empty strings at `:184` and are never assigned anywhere else in
the file.** Status vocabulary is exactly `EXECUTED|FAILED|SKIPPED` (`:735`). Conservation +
evidence-hole rule at `:247-249`, `:761-768`; rejected batch is diverted to `exec-results.rejected.json`
instead of being dropped (`:780-788`).

## (b) r1-exec op surface

Transport: `miniprogram-automator` over `ws://127.0.0.1:9420` (`r1-exec.cjs:50`, connect `:223-238`,
reconnect/wedge recovery `:248-263` + `refreshSimulator` `:240-247`), **plus** a CLI fallback for
element actions (`cliElement` `:801-813` → `automation_element_action`). Ops are emitted by a text
parser (`parseText` `:447-755`) from the criteria's own `pre`/`action` strings, then dispatched by
`applyOp` (`:899-1227`). Row writer `upsertResult` `:169-175`.

### Ops implemented in `applyOp`

| op | impl (file:line) | emitted from criteria text at | what it reads back |
|---|---|---|---|
| `login` / `logout` | `:901-905` / `:906-910`; `injectLogin` `:323-355`, `ensureLogin` `:368-378`, `logoutInApp` `:356-367` | `:461-464` | `{loggedIn,userId,expected,match,polls}` — userId compared against `IDENT_DEFS` `:185-189` |
| `storageSet` / `storageRemove` | `:911-949` / `:950-956` | `:470-471` (parses `wx.setStorageSync(...)` out of `pre`) | ok/`__err`; token values re-minted live (`:914-918`) + bootstrap poll `:926-947` |
| `nav` (reLaunch/navigateTo/redirectTo/switchTab/navigateBack+delta) | `:1004-1021` | `:477-496`, `:592`, `:740` | nav error kept as an *observation* (`ctx.navError` `:1018`) |
| `navParam` (per-page deep-link query) | `:978-986` via `paramMapUrl` `:406-416` | `:485` | resolved URL string |
| `repeatNav` (enter/exit N times) | `:1022-1029` | `:505-508`, `:590`, `:601-602` | per-iteration nav errors |
| `awayBack` (switch away and back) | `:987-994` | `:499` | recovery path used |
| `tap` / `tapIndex` | `:1030-1066-1067` | `:529`, `:705-706`, `:726` | action string |
| **`longpress`** | `:1033` + `:1068` (`el.longpress()`) | `:610`, `:613` | action string |
| **`rapidTap`** (N taps, 60 ms apart) | `:1032` + `:1075-1081` | `:574-585` | `done=`, `errs=` counts |
| `seqTap` (tap i-th of N matches) | `:957-965` | `:531` | `tapped=[1,2,…]` |
| `toggleTap` (alternate two elements ×N) | `:995-1003` | `:606` | `okN` |
| `ensureSel` (tap a gate to make a node exist) | `:966-977` | `:514` | `present` / `STILL-missing` — a *precondition* channel |
| `input` / `inputIndex` | `:1034-1035` + `:1069-1073` | `:587`, `:598`, `:623`, `:625`, `:631`, `:636-637`, `:662` | value actually typed (clamped) |
| **`inputSeq`** (multiple different values into the same field) | `:1041-1055` | `:622`, `:659` | per-value result list |
| **`trigger(event, detail)`** | `:1036-1037` + `:1074` | `:535`, `:541`, `:545`, `:548` | event + detail echoed |
| `refresherPull` (`scroll-view` `refresherrefresh` + `page.callMethod`) | `:1159-1174` | `:595` | which handler name worked |
| **`pullDown`** (`uni.startPullDownRefresh`) | `:1115-1120` | `:511` | `uni-ok` / `no-uni` |
| `evalStopRefresh` (`uni.stopPullDownRefresh`) | `:1121-1126` | `:512` | ditto |
| **`scroll`** (`mp.pageScrollTo` top/bottom) | `:1083-1104` | `:502`, `:668-669` | `lastScroll.pos` `:1098`, later emitted as evidence `:1415` |
| **`scrollElement`** (`el.scrollTo`) | `:1105-1114` | `:671` | `lastScroll.pos` |
| **`swipe`** (4 dirs; `el.swipeTo` else computed touch sequence) | `:1201-1222` | `:678` | dir + which API served it |
| **`touchHold`** (`touchstart` → sleep(ms) → mid-hold screenshot → `touchend`) | `:1175-1189` | `:617` | holds a **frame captured during the gesture** `:1185-1187` |
| **`measureTap`** (`el.size()` + `el.offset()` then tap) | `:1190-1200` | `:682` | **geometry persisted into the op log**: `size=${JSON.stringify(size)} offset=${JSON.stringify(off)}` `:1198` |
| `mockChooseImage` (`mp.mockWxMethod('chooseImage', payload)`, ok/cancel/huge 11 MB) | `:1127-1137` | (no parser emission; override-only) | stub mode; **this is the native-API stub primitive** |
| `restoreWx` (`mp.restoreWxMethod`) | `:1138-1140` | — | restore confirmation |
| `evalSnippet` (named in-app store mutation, e.g. flip `commerce.enabled`) | `:1141-1158` | — | returned value |
| `wait` / `observe` | `:1223` / `:1224` | `:733`, `:735` | — |

### Evidence captured per case (r1-exec)

`runCase` `:1270-1450`. Budget by tier (`:15-19` of the header). Per case:

1. **console** — windowed per case: `consoleMark()` before (`:1273`), `consoleDrain(mark)` after
   (`:1393`), filtered for error/warn/fail at `:1393`, written to `row.console` (last 8, `:1438`)
   **and** appended to `console-<suite>.log` (`:1426-1428`, file opened at `:1462`). Fed by
   `mp.on('console')` / `mp.on('exception')` in `attachListeners` `:211-222`.
2. **toast / native-modal calls** — `installToastHook` `:278-299` wraps `showToast`, `hideToast`,
   **`showModal`**, `showLoading` (`:293`) and pushes `{api, title, ts}`; `drainToasts` `:300-305` →
   `row.toast` `:1437`. Installed once per connect (`:230`).
3. **route chain with params** — `getRouteChain` `:306-314` returns `[{route, options}]`, i.e. the
   deep-link query each page actually received; settled by polling until stable `:1374-1380`;
   `row.route` `:1436`.
4. **frames** — `before` for critical `:1349-1353`, `after` for critical+normal `:1396-1399`,
   plus **second frame** when the criteria say 复拍/双拍 (`:1400-1404`), plus **WXML dump** for
   critical (`:1405-1413`, `el.wxml()` → file).
5. **existence probe that pierces custom components** — `probeElements` `:1242-1268` reads the root
   `view`'s `wxml()`, which *does* contain the component inner trees (comment `:1247`), then
   regex-tests each class name against it. So `present/absent` here covers component-scoped nodes.
6. **element tree piercing for selectors** — `getComponents` `:821-844` enumerates `<#shadow-root>`
   custom components and `deepResolve` `:846-858` / `deepResolveLabel` `:860-885` query inside each
   component subtree (and can match by visible **text** via `el.text()` `:864`, `:874`, `:880`).
7. op log lines (`pre:`/`act:` with each op's return string) folded into `observed` `:1417-1423`.
8. `noop` tier records `scrollPos=` `:1415`.
9. Resume/checkpoint `:160-165`, per-case watchdog `:1471-1474`, channel-error rethrow for reconnect `:1444`.

There is **no** per-request network channel and **no** network-condition injection in r1-exec
either (see (c)/(d)); `apiPost` `:176-184` exists but is used only for minting tokens `:195`.

## (c) The diff

### C-I — In both channels, but the result is thrown away (highest value: no new primitive needed)

| id | what is given | where it is thrown away | what it would have bought | precedent that keeps it |
|---|---|---|---|---|
| **C-1** | `probeMany` asks the renderer for **geometry**: `q.selectAll(s).fields({ size: true }, cb)` | `r-exec-cli.mjs:224` — the callback body is `bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0))`. `res` is an array of `{width,height,...}`; only `.length` survives. `:234` then reduces it to `present(N)`/`absent`. Same bug is duplicated verbatim in `r-exec-ws.mjs:430` (`cliProbe`) | every `boundingClientRect` / rpx / hot-zone criterion. 67 rows demand a geometry readout (counted over `reports/audit/round-6/ops/*.json`, `action+expected+evidence` text); VI40, DND12, CX26, CI21, MS09, FHT14, CH22, LG12, LG26 are the named ones | `r1-exec.cjs:1195-1198` (`measureTap`): `const size = await el.size(); const off = await el.offset(); … return \`measureTap … size=${JSON.stringify(size)} offset=${JSON.stringify(off)} tapped\`` — geometry kept as first-class evidence. Also `:1180-1182`, `:1211-1212` |
| **C-2** | `element()` returns the **parsed JSON payload** of the tool call (`ideCall` returns `j.result ?? j`, `cli-automator.mjs:128`) — for `--action size/offset/text/wxml/attribute/style` that payload *is* the measurement | `r-exec-cli.mjs:611` — the call is a bare statement inside `try`; only "threw / didn't throw" is used (`:612` push `"tap:"+sel`, `:613` push the error text). Nothing is assigned | element text, attributes, styles, computed geometry, per-action server-side result; would also let the tap leg prove *which* node it hit | `r-exec-ws.mjs` is the same; the pattern that does read it is `cli-automator.mjs:181-191` (`nodeCount` inspects `r.left/top/width`) and `tour-cli-states.mjs:96` (`element("text", sel, opts)`) |
| **C-3** | The criteria's own `evidence` string names **five** evidence kinds (`截图/network/Toast/console/…`) | `r-exec-cli.mjs` reads `c.evidence` only twice, both times matched against `FRAME_RE` (`:146`, used at `:682` and `:700`). `network`, `Toast`, `console` in the same string are never looked at, so `missingEvidence` (`:712`) is never filled for them and the row silently passes the evidence-hole check (`:248`) | 409 of 1107 rows ask for `network` in `evidence`; 372 ask for Toast; 864 ask for console. Today zero of them get a recorded shortfall | `r1-exec.cjs:1392-1393` + `:1437-1438` actually fill `toast`/`console`; `:1393` filters console lines for error/warn/fail |
| **C-4** | The page stack **with the query each page received** — `getCurrentPages()` items carry `options` | `cli-automator.mjs:171` projects it down to `p.route` joined by `\|` before the executor ever sees it (`r-exec-cli.mjs:485`). The row's `route` is therefore a string, while `readjudicate-evidence.mjs:240` tests `Array.isArray(r.route)` ⇒ for every CLI row `okRoute` is permanently false and `:241`'s `Array.isArray(r.console)` is permanently false (console is `""`, `r-exec-cli.mjs:184`) — two tier checks degrade to "observed non-empty" without anyone noticing | deep-link/param-consumption criteria (MT03, H47, CS31, LG37, the `ROUTE_QUERY` block at `r-exec-cli.mjs:287-350` had to hand-encode per-page queries precisely because they cannot be read back) | `r1-exec.cjs:306-314` `getRouteChain()` returns `[{route, options}]` and stores it as an array (`:1436`) |
| **C-5** | `evaluate` ignite-step returns `'started:' + sels.length` (proof the probe was accepted) | discarded at `r-exec-cli.mjs:228` (bare call, result unused). If the ignite silently produced 0 queries, the read step returns `{}` and every selector becomes `no-answer` — indistinguishable from "not on the page" | probe self-check; `:231`'s `read` result *is* used, so only the ignite half is lost | `r1-exec.cjs:271-277` `runInApp` always parses and returns the value, and callers branch on it (`:294` `'installed'` vs `'already'`) |
| **C-6** | `shot()` result + the frame's own bytes | `r-exec-cli.mjs:703-705`: the `shot()` return is discarded; the file is then `statSync`ed and a `>3000` byte test collapses the frame to a boolean. Under-threshold frames go to `missingEvidence` with the byte count (`:705`), which is honest, but the row never carries a second frame | criteria that say 双拍/复拍/连续截图 — r1-exec captures `after2` when the text says so | `r1-exec.cjs:1400-1404` (`/复拍\|双拍\|连续截图\|两次截图/` ⇒ second screenshot appended to `evidence`) |
| **C-7** | Hardcoded input payload | `r-exec-cli.mjs:611`: the input leg always sends `["--value","123456"]`. No per-case value, no multi-value sequence, and no read-back of what the field now holds | the 6 login/register rows whose stamped reason is exactly this (LG11/LG12/LG13/LG15/LG18/LG30 — e.g. `reports/audit/round-6/ops/PAGES-LOGIN-INDEX.json` LG11 reason cites "r-exec-cli.mjs:408-410 把输入腿固定成 --value 123456"; **that cite has moved, the code is now `:611`**) | `r1-exec.cjs:1041-1055` `inputSeq` (per-value results, CLI fallback at `:1046`), values parsed at `:622`, `:631`, `:659` |
| **C-8** | Toast/Modal **call** stream | `r-exec-cli.mjs:184` `toast: ""` — never assigned anywhere in the file | 372 rows whose `evidence` asks for Toast text/count, incl. DND08's "Toast 条数=1" and H03/N04/MT05/MT06 | `r1-exec.cjs:278-299` `installToastHook` wraps `showToast/hideToast/showModal/showLoading` (`:293`) and `:300-305` `drainToasts()` → `:1437` |

### C-II — Present in `r1-exec`, absent from `r-exec-cli` (verb surface)

`r-exec-cli.mjs:611` can issue exactly two element verbs (`tap`, `input`). `cli-automator.mjs:11-13`
documents that the *same* tool this line already calls accepts
`tap/longpress/trigger/input/size/offset/text/attribute/value/property/wxml/outerWxml/style/scrollTo/touchstart/touchmove/touchend`
— i.e. 15 more verbs are one argument away, not a new transport.

| missing verb/capability | r1-exec implementation | emitted from criteria text at |
|---|---|---|
| `longpress` | `r1-exec.cjs:1033` + `:1068` | `:610`, `:613` |
| `rapidTap` (N×, 60 ms apart) | `:1032` + `:1075-1081` | `:574-585` |
| `seqTap` (nth of N) | `:957-965` | `:531` |
| `toggleTap` (alternate two) | `:995-1003` | `:606` |
| `swipe` (4 directions, touch triple) | `:1201-1222` | `:678` |
| `touchHold` (+ frame captured mid-hold) | `:1175-1189` | `:617` |
| `scroll` (page-level `pageScrollTo`) | `:1083-1104` | `:502`, `:668-669` |
| `scrollElement` (`el.scrollTo`) | `:1105-1114` | `:671` |
| `pullDown` (`uni.startPullDownRefresh`) | `:1115-1120` | `:511` |
| `evalStopRefresh` | `:1121-1126` | `:512` |
| `refresherPull` (`trigger('refresherrefresh')` + `page.callMethod`) | `:1159-1174` | `:595` |
| `trigger(event, detail)` | `:1036-1037` + `:1074` | `:535`, `:541`, `:545`, `:548` |
| `measureTap` (size+offset evidence) | `:1190-1200` | `:682` |
| `inputSeq` / per-value input | `:1041-1055` | `:622`, `:659` |
| `ensureSel` (tap a gate to materialise the target = precondition channel) | `:966-977` | `:514` |
| `storageSet` / `storageRemove` from `pre` text | `:911-956` | `:470-471` |
| `nav` variants (`switchTab`/`redirectTo`/`navigateBack{delta}`), `repeatNav`, `navParam`, `awayBack` | `:1004-1029`, `:978-994` | `:477-508`, `:592`, `:740` |
| `login`/`logout` mid-batch (per-case identity switch) | `:901-910` | `:461-464` |
| `mockWxMethod` / `restoreWxMethod` (native-API stub) | `:1127-1140` | override-only, no parser emission |
| `evalSnippet` (flip an in-app store switch, e.g. `commerce.enabled`) | `:1141-1158` | override-only |
| component-subtree piercing for **both** probing and tapping (`getComponents`/`deepResolve`/`deepResolveLabel`) | `:821-885`, `probeElements` `:1242-1268` | n/a |
| console event stream + per-suite console log file | `:211-222`, `:1426-1428`, `:1462` | n/a |
| WXML dump for critical tier | `:1405-1413` | n/a |
| simulator-refresh recovery when the channel wedges | `:240-247`, used `:257-261` | n/a |

Reverse direction (r-exec-cli has it, r1-exec does not): artifact-band fingerprint per row
(`BAND` `r-exec-cli.mjs:35`, `row.band` `:176`, `RUNNER_BAND` `:745`), identity producibility gate
before any write (`:265-270`), guest-landing policy reconciliation (`:69-75`, `:447-452`),
lock-screen positive control (`:503-522`), UI lease (`:354-368`), conservation + rejected-sidecar
(`:761-788`), `identities` scoping (`:81-86`), `automatable:false` consumption (`:90-95`).
None of these are in `r1-exec.cjs` — a straight port of r1 ops into r-exec-cli must keep them.

## (d) Verdict on the three specific claims

### (a) "`:605-611` is where a named capability could be wired in" — CONFIRMED, line numbers still exact

Current contents of `scripts/qa/r-exec-cli.mjs:604-615`:

```
604  const done = [], unmet = [], inputRefused = [];
605  for (const sel of targets.slice(0, 4)) {
608    const isInput = wantsInputLeg(c.action, sel);
609    if (!isInput && inputVerbOnly(c.action)) inputRefused.push(sel);
610    try {
611      element(isInput ? "input" : "tap", sel, { project: PROJECT }, isInput ? ["--value", "123456"] : ["--wait", "1"]);
612      done.push((isInput ? "input:" : "tap:") + sel);
613    } catch (e) { unmet.push((isInput ? "input:" : "tap:") + sel + " :: " + …); }
614    sleep(700);
615  }
```

What lives there today is **the single element-action dispatch point of the whole executor**: one
action per target, at most 4 targets (`targets.slice(0, 4)`), verb chosen only between `tap` and
`input` (`:608`), input value hardcoded to `"123456"` (`:611`), a fixed 700 ms inter-target pause
(`:614`, which alone makes any "<500 ms ×5" rhythm unrepresentable), and the tool's JSON result
discarded (see C-2). Every gesture/measure/rate verb has to be threaded through this block.
`element()`'s first parameter is a free string (`cli-automator.mjs:162-164` →
`ideCall("automation_element_action", ["--action", action, …]`), so `longpress`, `trigger`,
`size`, `offset`, `text`, `scrollTo`, `touchstart/touchmove/touchend` need no new transport —
only a verb decision here (`r-exec-cli.mjs:608`) and a place to put the payload (`:612`).

### (b) "`probeMany` around `:223-224` discards `fields({size:true})` output" — CONFIRMED, line numbers exact

```
219  function probeMany(selectors) {
223    "sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); " +
224    "q.selectAll(s).fields({ size: true }, function (res) { bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0)); }); q.exec(); } " +
```

`:224` requests `{size:true}` (which makes the callback receive an array of
`{id, dataset, left, top, width, height}` nodes) and then keeps **only `res.length`**. The reduce
is then applied at `:234`: `out[s] = typeof bag[i] === "number" ? (bag[i] > 0 ? "present(" + bag[i] + ")" : "absent")`.
So width/height/left/top are requested from the renderer and dropped on the floor inside the app
context, and the only carrier shape the ledger can see is `present(N)`. The same two lines are
copy-pasted into the WS leg at `r-exec-ws.mjs:430` (`cliProbe`), so **both in-service runners drop
it identically**; the WS leg's own probe (`r-exec-ws.mjs:407-423`, `pageObj.$$(s)` → `list.length`)
also has no geometry.

Historical note: the ops ledger cites this function as `probeMany（:141-153）` — at
`reports/audit/round-6/ops/PAGES-LOGIN-INDEX.json:188` (LG11), `:212` (LG12), `:500` (LG26) — and
cites the input leg as `r-exec-cli.mjs:408-410` (same three reasons, plus LG13/LG15/LG18).
**Those line numbers have moved.** Current locations are `:219-237` (the drop is on `:224`) and
`:611`. `reports/audit/round-7/criteria36-classification-v33.json:372` already re-anchors it
correctly as `probeMany(:223-224)`; any implementation wave must use `:219-237`/`:224`/`:611`.

### (c) "no per-request network counting, no network-condition injection, no native ActionSheet/showModal stub"

Two of three confirmed outright; the third is confirmed for *stubs* but has a live precedent that
makes it far cheaper than "impossible".

1. **Per-request network counting — CONFIRMED absent in both runners.** `r-exec-cli.mjs:173-187`
   (the `row()` factory) has no `network` key at all; `r-exec-ws.mjs:122-133` likewise. No script
   under `scripts/qa/` reads a `.network` field off an exec result (searched `*.mjs`/`*.cjs` for
   `\.network\b` → only `require`-path noise, no consumer). `grep` for network/`requestTask`/
   `onHTTPRoute`/`simulateNetwork` across the five runners hits exactly one place, and it is not a
   channel: `r1-exec.cjs:817` puts the literal word `network` inside the `OBSERVE_MARKERS` regex
   that decides "this case is observation-only". So the 409 rows whose `evidence` string names
   `network` are served by nothing, and nothing records the shortfall (C-3).
2. **Network-condition injection — CONFIRMED absent everywhere.** `mockWxMethod` appears only twice
   in the repo's runners: `r1-exec.cjs:1134` and `r-exec.cjs:1551`, both for `chooseImage` only.
   There is no offline/5xx/abort/`request` mock, and no `evalSnippet`-style fault hook
   (`r1-exec.cjs:1141-1158` has one entry, `commerceOn`, which flips a store switch — the shape is
   right but nothing network-related is wired to it).
3. **Native ActionSheet/showModal stub — CONFIRMED no stub, PARTIALLY REFUTED as "nothing next door".**
   No `showActionSheet` reference exists in any runner. However `r1-exec.cjs:293`
   already monkey-patches **`showModal`** (alongside `showToast`/`hideToast`/`showLoading`) via
   `installToastHook`, recording `{api, title, ts}` into `globalThis.__qaToasts` (`:288`) and
   draining it per case (`:300-305` → `:1437`). So the *observation* half of `showModal` exists and
   runs on the WS channel; the *drive* half (choose 取消/确定, deliver the tap) does not exist in
   either runner. `mockWxMethod` (`:1134`) proves the automator can replace a `wx.*` API with a
   canned payload from inside the automation session, which is the primitive an ActionSheet/showModal
   option stub needs. The prior audit reached the same conclusion in
   `reports/audit/round-7/criteria36-classification-v33.json:372`: "可照 r1-exec.cjs:1134 的
   mockWxMethod 形态做". Note the app-level call sites that must be satisfied, as recorded in the
   ledger: `apps/client/src/subpackages/vip/index.vue:324` / `:343` (`uni.showModal`, cited in
   `scripts/qa/cellplan-round8-held4.json:30`), `apps/client/src/pages/messages/index.vue:276-282`,
   `apps/client/src/subpackages/profile-extra/profile/album.vue:231` (`showActionSheet`).

**Bonus, not in your three claims but the same class:** `console` is also hardcoded `""` in both
in-service runners (`r-exec-cli.mjs:184`, `r-exec-ws.mjs:132`) while 864 of 1107 rows ask for it in
`evidence`, and `r1-exec.cjs:211-222` has a working listener on the live WS port
(`r1-exec.cjs:50` = `ws://127.0.0.1:9420`; `cli-automator.mjs:4-7` records that the old
"WS doesn't connect here" conclusion in `r-exec-cli.mjs:4-5` **was wrong** and that 9420 does connect).

## (e) Gap ↔ blocked case-id map

Denominators read from `reports/audit/round-6/ops/*.json`: **1107** cases total, **101** carry
`automatable:false` + `notAutomatableReason`. Lists below were generated by re-running the
executor's own extraction regexes against the criteria text, not copied from a summary.
`*` = the row is stamped `automatable:false` in the ledger.

| gap | blocked rows (manifest|id) | count |
|---|---|---|
| **G-1 geometry readout dropped (`probeMany` `:224`)** | DND08-style hot zones + keyboard geometry: `PAGES-LOGIN-INDEX\|LG12*` `LG18*` `LG26*`, `PAGES-HOME-INDEX\|H48*`, `SUBPACKAGES-CAMPUS-CAMPUS-INDEX\|CX13*` `CX22*` `CX26*`, `SUBPACKAGES-CHAT-CHAT-SESSION-INDEX\|CS23*`, `SUBPACKAGES-CIRCLES-CIRCLES-INDEX\|CI06*` `CI20*` `CI21*`, `次要21\|DND12` `FHT14*`, `次要22\|VB04*` `MW09*`, plus **VI40** and **VI42**, `次要18\|VD19*` — 67 rows demand a `boundingClientRect`/width/height/rpx readout | 67 (24 stamped) |
| **G-2 per-request network counting** | 409 rows name `network` in `evidence`; those with an explicit count predicate (「请求计数/请求条数/network 计数/逐条」) = **312**, incl. `PAGES-HOME-INDEX\|H02*` `H03*`, `PAGES-NEARBY-INDEX\|N03*` `N05*` `N31*`, `PAGES-MESSAGES-INDEX\|MSG26*`, `PAGES-LOGIN-INDEX\|LG13*` `LG15*` `LG18*`, `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING\|MT14*`, `次要21\|DND08` `DND12`, `次要18\|TP04*`, `次要22\|VI09*` | 409 (44 stamped) |
| **G-3 network-condition injection (offline / 5xx / abort)** | `MSG24*` `MSG26*` `N04*` `N31*` `MT06*` `MS09*` `VB04*` `VP24*` `DND09*` `AC10*` `CS19*` `AB09*` `CI03*` — 43 stamped rows whose text contains 断网/故障注入/500/5xx/失败注入 | 43+ |
| **G-4 toast readout (`row.toast` pinned `""` at `:184`)** | 372 rows name Toast in `evidence`, incl. `DND08` (`Toast 条数=1`), `H03*`, `N04*`, `MT05*` `MT06*`, `LG13*` `LG15*` `LG38*` | 372 (23 stamped) |
| **G-5 console readout (`row.console` pinned `""` at `:184`)** | 864 rows name `console` in `evidence` — and `readjudicate-evidence.mjs:241` silently accepts it because `Array.isArray("")` is false and `observed` is always non-empty | 864 |
| **G-6 `rapidTap` / rate-limited repeat action** | 106 rows name rapidTap/连点/连击, incl. `DND08`, `H48*`, `CX22*`, `PUB11*`, `MSG24*` `MSG26*`, `LG30*`, `MS08*` `MS09*`, `TP03*` `TP04*`, `AB09*` | 106 (29 stamped) |
| **G-7 `longpress`** | `PAGES-MESSAGES-INDEX\|MSG21` `MSG22` `MSG24*` `MSG25` `MSG26*`, `PAGES-PROFILE-INDEX\|PFI23`, `SUBPACKAGES-CHAT-CHAT-SESSION-INDEX\|CS19*` `CS20` `CS22`, `次要18\|VD15` `TD06`, `次要20\|AB06` `AB08` `AB09*` `AB10*` `AB14`, `次要21\|FB11` | 17 (5 stamped) |
| **G-8 swipe / directional drag** | `PAGES-DISCOVER-INDEX\|DC01` `DC07` **DC08** `DC09` `DC11` `DC13` `DC14` `DC22*` `DC27` `DC35` `DC38`, `H48*`, `CX13*`, `MS17*`, `MT02*` `MT05*` `MT09` `MT20*` `MT22`, `次要19\|LN03-LN06` `LM08`, `次要20\|PL07` `AB08`, `FHT05*`, `MW09*`, `VB05*` | 29 (14 stamped) |
| **G-9 page pull-down (`onPullDownRefresh`)** | `DC29*` `H02*` `H03*` `H47*` `LG27` `LG38*` `MSG05*` `MSG24*` `MSG41` `N02*` `N03*` `N04*` `N05*` `N31*` `PFI25` `PFI37*` `PFI44` `REG31` `REG32*` `RS13*` `CX13*` `CS23*` `CI22` `CPT35` `MS17*` `MT21` `VI21` `VI25` `VI28*` `VI34` `PUB25*` `TP06` `HS03` `CT01` `CT08` `CH09` `SG06` `PE03*` `LK01` | 52 (25 stamped) |
| **G-10 scroll extremes + scroll-offset readout** | `DC27` `H45` `LG27` `MSG30` `N34` `PFI36` `PFI38` `REG31` `RS12` `CH22` `CX13*` `CX15*` `CX26*` `PT33` `CS23*` `CI06*` `CI18` `CPT39` `MS17*` `VI23` `VI30` `VI38` `VI42` `VP32` `PUB28` … `DND12` `FHT14*` `SCU13*` `OT14*` | 57 (23 scrolled/stamped mix) |
| **G-11 native ActionSheet stub+drive** | `MSG24*`, `次要20\|AB09*`, and naming rows `MSG12` `PFI09` `VD15` `TD06` `OT11` `AB08` `AB14` — call sites `apps/client/src/pages/messages/index.vue:190` `:262`, `subpackages/profile-extra/profile/album.vue:231` | 7 (3 stamped) |
| **G-12 native showModal stub+drive** | **MSG26**, and naming rows `CS07` `CS21` `VI26` `VP27` `VP38` `ST07` `VCI11` `OT05` `OT08` `SCU05` `VI04` `VI06` `PC09` `AB10*` `VI09*` — call sites `pages/messages/index.vue:281`, `album.vue:320`, `subpackages/vip/index.vue:217` `:250` `:324` `:343` | 16 (3 stamped) |
| **G-13 component-subtree scope (probe + tap can't enter `<#shadow-root>`)** | 42 stamped rows say so explicitly: `DC22*` `H48*` `PFI22*` `PFI42*` `CX16*` `CX17*` `CX30*` `CS08*` `CS19*` `CI03*` `CI06*` `CI20*` `CPT27*` `MS17*` `MT02*` `VI17*` `VI18*` `OT14*` `PL05*` `TK03*` `RP09*` `RP11*` `FB01*` `SCU13*` `AC04*` `VB05*` `VB07*` `FHT02*` `HP04*` `VD07*` `VD19*` `TP03*` `CH06*` `CF09*` `PE03*` `MS02*` `CS08*` `LG24*` `RS13*` `PFI42*` `DC16*` `MS05*` | 42 stamped |
| **G-14 nth / multi-instance disambiguation (4 same-name buttons)** | 25 stamped rows: `DC22*` `PFI22*` `CS23*` `CI06*` `CPT27*` `VI17*` `VI18*` `PUB11*` `PUB12*` `TP03*` `TP04*` `CH06*` `CF09*` `HP04*` `VP24*` `MS05*` … | 25 stamped |
| **G-15 parameterised input value / value read-back** | `LG11*` `LG12*` `LG13*` `LG15*` `LG18*` `LG30*` (stamped reasons all name the hardcoded `--value 123456`) | 6 |
| **G-16 per-case deep-link query (page-granular `ROUTE_QUERY` `:287-350` can't express two landings on one page)** | `MT03` (held out of the plan, `scripts/qa/cellplan-round8-held4.json:9`), `H47*`, `CS31*`, `LG37*`, `OT05/OT06/OT09`, `MD09*` — `r-exec-cli.mjs:325-349` documents the two pages it deliberately refuses | 12 |

### E-II — The four do-not-degrade rows

**Constraint, encoded: MSG26, DND08, DC08, VI40 must not be degraded to a plain `tap`.**

| id | the criteria's named action (verbatim) | read at | why a plain tap is not a substitute | capability needed to honour the verb |
|---|---|---|---|---|
| **MSG26** | `① 长按→「删除会话」→ 在 showModal 点「取消」；② 再次执行并点「确定」；③ 对同一会话在 500ms 内连点删除入口 5 次；④ 断网执行确定` — expected `① 取消不得删除…③ 两条口径：客户端 DELETE 请求计数 =1…④ 失败 toastOpError 且行不消失` | `reports/audit/round-6/ops/PAGES-MESSAGES-INDEX.json:305-306`; stamped `:310` "删除会话要走 showModal 确认，取消/确定两条都要真点；原生 Modal 不在页面 DOM 里" (`:311` carrier `cellplan-round7-taptarget.json`, cf. `scripts/qa/cellplan-round7-taptarget.json:15`) | one tap on the row only opens the ActionSheet; the judgement lives on **which modal button is pressed** and on **DELETE count = 1**. A single tap makes 「DELETE 计数=1」 true by construction — the假通过 criterion ③ explicitly names | `longpress` (G-7) + **showModal option stub + result readout** (G-12) + `rapidTap×5` (G-6) + offline injection (G-3) + per-request counting (G-2) |
| **DND08** | `500ms 内对 .save-btn rapidTap×5，逐次记录：客户端 PUT /dnd 请求条数、Toast 条数、handler 进入次数（按 isSaving 早退计数）` — expected `① 客户端层：PUT /dnd 请求条数=1…② Toast「设置已保存」条数=1；…④ 若出现 ≥2 条客户端请求或 ≥2 条 Toast，判 FAILED` | `reports/audit/round-6/ops/次要21.json:169-171` (row starts `:163`; **no `automatable:false` stamp on this row**) | the whole assertion is a *rate* assertion (`isSaving` guard `dnd.vue:244` + 800 ms cooldown `:278-280`). One tap proves nothing and makes `PUT=1` vacuously true — criterion ④ names that as the failure mode | `rapidTap×5` with sub-100 ms spacing (G-6; `r-exec-cli.mjs:614` currently sleeps 700 ms *between* targets) + per-request counting (G-2) + toast counting (G-4) |
| **DC08** | `在卡片上向右拖动 >SWIPE_THRESHOLD 后松手（SwipeGesture.ts:37-42 判定，常量见其 :4-7 导入）；另做向左、向上、向下各一次` — expected `右滑触发 handleLike…上/下与位移 <TAP_MOVE_THRESHOLD 的轻点**不得**被判为左右滑（方向语义错乱判 P1）` | `reports/audit/round-6/ops/PAGES-DISCOVER-INDEX.json:89-90` (row starts `:83`; no `automatable:false` stamp; the sibling DC07 at `:80` does carry `tapTarget: ".swipe-container"`) | the承载 node has `@touchstart/@touchend` **and** `catchtap` (recorded at `reports/audit/round-7/tapfix-unverifiable.json`: `SwipeContainer.vue:72-78`); tapping it exercises `onCatchTap`, a different semantic. The criteria also assert a **negative** ("轻点不得被判为左右滑"), so a tap is the very thing being ruled out | 4-direction parameterised `touchstart→touchmove→touchend` with over/under-threshold displacement (G-8) + mid-drag `dragStyle` sampling (G-1/C-2) |
| **VI40** | `对 .village-search、.channel-feed 内每个频道 Tab 项、PostCard 的 .action-btn（点赞/收藏/评论/分享）、.back-to-top、ChannelComposerBar 可点区逐个 boundingClientRect 量测` — expected `如实回填 rpx 数值并对照 88rpx…不可量元素记 UNVERIFIED 而不省略；执行员不得以源码结论代替实测数值` | `reports/audit/round-6/ops/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json:744-745` (row starts `:738`, `tier: noop` at `:742`; no `automatable:false` stamp) | there is **no tap verb in this criterion at all**; the deliverable is a width/height table. Tapping produces a navigation, i.e. it destroys the frame being measured. And 「不得以源码结论代替实测数值」 forbids the source-level substitute, so it cannot be discharged by `verify-source-shape.mjs` either | `fields({size:true})` read-back in `probeMany` (G-1, fix at `r-exec-cli.mjs:224`) + nth/component scope for PostCard's 4 `.action-btn` (G-13/G-14) + a scroll leg so `.back-to-top` exists at all (`scrollTop>600` precondition, `:743`; G-10) |

#### Precision corrections to the prior audit (it is right on the constraint, wrong on two details)

1. "判据末句自写『本条不许降级成点击』" for DC08 — that sentence is **not in the criteria text**.
   `grep "不许降级" reports/audit/round-6/ops/*.json` → 0 hits. It is a ruling recorded in
   `reports/audit/round-7/unverifiable-recheck-2.json:325`,
   `reports/audit/round-7/criteria36-joined-v33.json:398`,
   `reports/audit/round-7/criteria36-classification-v33.json:247` and
   `reports/audit/round-7/tapfix-briefs/06/tapfix-lane-PAGES-DISCOVER-INDEX.json.json:11`.
   Binding, but it is a lane ruling, not criteria text — quote it as such.
2. Only **MSG26** of the four is stamped `automatable:false` in the ledger; **DND08, DC08, VI40 are
   not**, so `notAutomatableSkip` (`r-exec-cli.mjs:90-95`) never fires for them.

#### What those three are recorded as *right now* (measured from the corpus, not inferred)

`reports/audit/round-7/exec-A-mock-final/exec-results.json` (runner `scripts/qa/r-exec-cli.mjs（tap 切片）`):

- `次要21|DND08` → **`status: "EXECUTED"`**, `evidence` = one screenshot, `observed` = `dom: (本条没点名类名)`,
  `toast: ""`, `console: ""`, `missingEvidence: []`.
- `SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI40` → **`status: "EXECUTED"`**, same shape.
- `PAGES-MESSAGES-INDEX|MSG26` and `PAGES-DISCOVER-INDEX|DC08` → `SKIPPED`,
  reason 「action 含交互动词但没点名可交互元素」 (`r-exec-cli.mjs:601`).

Reason DND08/VI40 slip to a green: `TAP_RE` (`r-exec-cli.mjs:145`) does **not** match either action
string — verified by running the file's own regexes: `TAP_RE.test(DND08.action) === false`
("rapidTap" is rejected by the `(?<![A-Za-z])` lookbehind, the very guard the selftest asserts at
`:117`), `TAP_RE.test(VI40.action) === false` (no verb). Both therefore skip the interaction leg
(`:581`), clear the "names nothing observable" branch (`:682`, because `classesOf` *does* find
`.save-btn` / `.village-search .channel-feed .action-btn .back-to-top` with the current widened
regex at `:197-200`), and land in the terminal `else` (`:697`) → one frame + `present(N)` counts =
`EXECUTED`. The recorded `dom: (本条没点名类名)` strings in that corpus predate the `:197-200`
widening; re-running today would show the names but still no geometry, no rate, no counts.
So DND08 and VI40 are **not** blocked on the ledger — they are **falsely recorded as executed**.
That is a higher-severity finding than "unwired", and the fix is not a new verb alone: the
anti-degradation guard exists in the older executor (`r-exec.cjs:1174-1178`,
`UNIMPLEMENTABLE_ACTION_RE = /(拖动|拖拽|滑块|滑动|swipe|drag|长按|依次点|逐个点击)/i` with
regression test `scripts/qa/test-observe-markers.cjs`) and has **no counterpart in
`r-exec-cli.mjs`** — so the moment anyone adds `tapTarget: ".swipe-container"` to DC08, the current
executor will issue a plain tap at `:611` and record `EXECUTED`.

## (f) Wiring cost per gap

Cost classes: **[PORT]** = already implemented in `r1-exec.cjs` at the cited lines, port the function;
**[NEW]** = genuinely new code; **[SURFACE]** = not reachable on the documented DevTools automation
surface (automation ports 9420/9430, `r1-exec.cjs:50`; `cli-automator.mjs:52`).

| gap | class | where the code already is / what has to be written | notes and blockers |
|---|---|---|---|
| **Anti-degradation guard (pre-condition for everything below)** | **[PORT]** | `r-exec.cjs:1174-1178` — `UNIMPLEMENTABLE_ACTION_RE = /(拖动|拖拽|滑块|滑动|swipe|drag|长按|依次点|逐个点击)/i` inside `isObserveOnly()`, regression test `scripts/qa/test-observe-markers.cjs` | `r-exec-cli.mjs` has **no** equivalent. Without it, adding a `tapTarget` to MSG26/DC08 (the sibling DC07 already has one, `PAGES-DISCOVER-INDEX.json:80`) makes `:611` fire a plain tap and `:697` record `EXECUTED`. Cheapest, highest-leverage edit in this matrix — do it first |
| **C-1 / G-1 geometry readout** | **[PORT-shaped, 1-line + carrier]** | change the probe body at `r-exec-cli.mjs:224` from `bag[i] = res.length` to keep the node objects, widen `:234` to emit `present(N) w=… h=…`, add a rect carrier to `row()` (`:173-187`). Precedent for keeping geometry as evidence: `r1-exec.cjs:1195-1198`; proof the CLI returns geometry objects: `cli-automator.mjs:184` tests `"left" in r \|\| "top" in r \|\| "width" in r` | The renderer **already sends** the sizes; nothing new is being asked of the tool surface. Same one-line fix applies to the duplicated copy at `r-exec-ws.mjs:430`. Only real risk: probe bag payload size when many selectors — trim to `{width,height,left,top}` |
| **G-6 rapidTap** | **[PORT]**, but transport-bound | loop is `r1-exec.cjs:1075-1081` (60 ms spacing); emission pattern `r1-exec.cjs:574` | **Cannot be honoured on the CLI leg**: every `element()` call is a fresh `execFileSync(electronExe(), argv)` (`cli-automator.mjs:111-114`), i.e. hundreds of ms of process spawn per tap, and `r-exec-cli.mjs:614` deliberately sleeps 700 ms. A "500 ms window ×5" is physically unsatisfiable there. Real carrier = the in-session WS `el.tap()` (`r-exec-ws.mjs:392-399`, serial ≈6.6–8.1 ms/op per the comment at `r-exec-ws.mjs:357-360`). If the timing window still can't be met, MSG26/DND08's ③-④ half stays **NOT_SHOOTABLE** and must be recorded as such |
| **G-7 longpress** | **[PORT]** | `r1-exec.cjs:1033` + `:1068` (`el.longpress()`); on the CLI leg it is one argument: `element("longpress", sel, …)` at `r-exec-cli.mjs:611`, verb list documented at `cli-automator.mjs:12` | Also unblocks CS19/AB08/AB14/MSG22/MSG25 entry half |
| **G-4 toast + showModal/`showLoading` *call* stream** | **[PORT]** | `r1-exec.cjs:278-299` `installToastHook` + `:300-305` `drainToasts` | Both halves are pure `evaluate` payloads (`wx[name] = function(o){ push({api,title,ts}); return orig.apply(...) }`) → port **verbatim onto the CLI transport** using the ignite/read pattern `r-exec-cli.mjs:221-231` already uses. Then `row.toast` (`:184`) stops being a literal `""`. Note it already wraps `showModal` (`:293`), so modal *invocation* becomes observable for free |
| **G-5 console stream** | **[PORT, WS-only]** | `r1-exec.cjs:211-222` (`mp.on('console')`, `mp.on('exception')`), windowing `:209-210` + `:1273`/`:1393`, per-suite file `:1426-1428` | Needs the WS leg (`r-exec-ws.mjs:322-340` already connects; its `row()` also pins `console: ""` at `:132`). No CLI `automation_console`-style tool is used anywhere in `scripts/qa` (only `automation_evaluate`, `automation_element_action`, `simulator_open_page`, `simulator_screenshot`, `simulator_refresh`, `project_window` are ever invoked). In-app `console.log` wrapping via `evaluate` is possible but loses framework warnings/exceptions — say so in the row rather than pretending parity |
| **G-9 page pull-down** | **[PORT]** | `r1-exec.cjs:1115-1120` (`uni.startPullDownRefresh`) and `:1121-1126` (`uni.stopPullDownRefresh`) | One `evaluate` function body each → transports-agnostic. The ledger names this exact absence twice: `scripts/qa/cellplan-round8-held4.json:7` and `:16` (H03 "既无 pullDown op … 也无 network 计数通道"), and `:22` (N05) |
| **G-10 scroll legs + scroll offsets** | **[PORT]** (page + element) | `r1-exec.cjs:1083-1104` (`mp.pageScrollTo`) / `:1105-1114` (`el.scrollTo`); CLI equivalents documented at `cli-automator.mjs:13` (`scrollTo`); offset readout = add `scrollOffset: true` next to `size: true` at `r-exec-cli.mjs:224` | `pullDown`+`scroll`+`rect` together is what unblocks DND12, CH22, FHT14, CX26, CI21, MS09, CS23 |
| **G-15 parameterised input value + value read-back** | **[PORT]** (parser) + trivial new glue | values parsed out of criteria text at `r1-exec.cjs:622`, `:631`, `:636-637`, `:659-662`; multi-value loop `:1041-1055`; read-back via `element("value"/"attribute"/"text", sel)` (documented `cli-automator.mjs:12-13`, precedent `tour-cli-states.mjs:96`) | Replaces the literal at `r-exec-cli.mjs:611`. This is what LG11/LG12/LG13/LG15/LG18 stamped reasons ask for. The stamped reasons still cite the old location `r-exec-cli.mjs:408-410` |
| **G-2 per-request network counting** | **[NEW]** | nothing to port — `grep` over the five runners finds no network channel (see (d)-c-1). Shape to copy: the wrap-and-bag pattern `r1-exec.cjs:283-293` + ignite/read `r-exec-cli.mjs:221-231`, wrapping `wx.request` (and `uni.request`) to append `{url, method, statusCode?, ts, header?}` to an app-level bag, drained per case | Also **half-unwired already**: `cli-automator.mjs:203 apiPost` (server-side readback, used by `mintToken` `:317-336`) is exported but not in `r-exec-cli.mjs:25`'s import list — the "服务端回读" leg of 30 stamped rows needs only that import plus a GET variant. Idempotency-Key readback needs the request header, so capture it in the wrapper, not the response |
| **G-3 network-condition injection (offline / 5xx / abort)** | **[NEW]**, WS precedent for the mechanism | `mockWxMethod` exists only for `chooseImage`: `r1-exec.cjs:1127-1140`, `r-exec.cjs:1544-1556`. Same call with `'request'` (or a `wx.request` wrapper that fails the callback in-app) is the two candidate carriers | In-app wrapper works on both transports and is enough for "make this request fail"; true "断网" (network-temperature simulation) has **no** documented automation tool in this repo's surface → for rows whose criterion is literally "network offline" (MSG26 ④, VI28 "后台恢复开关+断网") treat as **[SURFACE]** unless the criterion accepts a failed-request injection, which is a ruling to ask for, not to assume |
| **G-11 / G-12 native ActionSheet / showModal option stub + readout** | **[NEW] on top of a proven primitive**; the *rendering-and-coordinate* half is **[SURFACE]** | primitive: `mp.mockWxMethod(name, payload)` proven live at `r1-exec.cjs:1134` with `restoreWxMethod` at `:1139`; readout precedent: `installToastHook` already wraps `showModal` (`:293`). Stub payload for ActionSheet = `{tapIndex: n}`, for showModal = `{confirm: bool, cancel: bool}` — exactly the `errMsg`-shaped payloads at `r1-exec.cjs:1128-1132` | **Do not overclaim**: a stub answers the *API*, so the native layer is never rendered. That is sufficient for MSG26's ③ (DELETE count) and for VI09's 确认/取消 branch (`cellplan-round8-held4.json:30` names `subpackages/vip/index.vue:324`/`:343`), but MSG26's own stamp says 「取消/确定两条都要真点」 (`PAGES-MESSAGES-INDEX.json:310`) — a stub changes what is asserted. Unless the ruling is widened, those sub-legs stay **NOT_SHOOTABLE** with the reason recorded. Selectors cannot reach the modal: it is not in the page render tree, and `automation_element_action` takes only a selector (`cli-automator.mjs:162-164`) |
| **G-13 component-subtree scope** | probe half **[PORT]**, action half **[PORT, WS-only]** | probe: `r1-exec.cjs:1242-1268` reads the root `view`'s `wxml()` (which *does* contain component inner trees, comment `:1247`) — CLI equivalent is `element("outerWxml", sel)`, already wrapped as `cli-automator.mjs:192 nodeHtml`, unimported by `r-exec-cli.mjs:25`. action: `getComponents`/`deepResolve`/`deepResolveLabel` `r1-exec.cjs:821-885` are SDK-object based | The CLI probe is app-context `wx.createSelectorQuery()` (`r-exec-cli.mjs:223`) and therefore structurally cannot see inside a custom component — that is why 42 stamped rows read `COMPOSED_OR_SCOPED`. The WS leg in service today (`r-exec-ws.mjs:407-423`) uses `pageObj.$$(s)` (page scope) and so has the **same** blind spot; porting `deepResolve` there closes 42 rows' probe half. Prior measurement in the ledger: that axis "90.6% 点不动" (`reports/audit/round-6/ops` reasons for CI03/MS17/OT14/RP09/RP11) |
| **G-14 nth / same-name disambiguation** | **[NEW]** | no nth anywhere: `element()` passes a single `--selector` (`cli-automator.mjs:162-164`), `probeMany` returns counts only (`:234`), `r1-exec`'s `tapIndex` is the closest and it is emitted only with an explicit index in the text (`r1-exec.cjs:705`) and still resolves through `page.$` (single node, `deepResolve` `:846-858`) | Two honest routes: (a) `evaluate` a `querySelectorAll` + index and act by coordinates — new, and coordinate taps on the CLI leg are unproven (see G-8 swipe); (b) author-side unique classes, which is already the ruling for 7 rows (`reports/audit/round-7/criteria36-classification-v33.json` summary: the only non-degrading fix is 补作者类名/id, gated by `scripts/qa/apply-ops-cellplans.mjs:118` `/^[.#][\w-]+$/` — comment at `:116-117` says 裸词、标签链一律拒) |
| **G-16 per-case deep-link query** | **[NEW] glue**, but fixtures are the real blocker | `ROUTE_QUERY` (`r-exec-cli.mjs:287-350`) is page-granular by construction and *deliberately* refuses two pages (`:325-349`). Case-granular requires re-`openPage` per case (`:479` is once per page group) — that reorders the whole batch's cost model | MT03 was **held out** of the landing plan precisely because it needs a backend 互选 fixture plus a custom query (`scripts/qa/cellplan-round8-held4.json:9`, and `:2` explains why `dev-preview=1` at `r-exec-cli.mjs:289` kills the `redirectTo` chain). Not an executor gap; record as 需环境 |
| **G-16b cost/conservation side-effects** | n/a | re-opening a page per case multiplies `pageOpen` (3.2 units) over the 502 `interact+frame` rows — see `reports/audit/round-7/case-cost-census.json` `cost` `{assertion:0.21, tap:1, screenshot:2.6, pageOpen:3.2}` and `policy.minutesNaive 69.1` | Any wave that changes page-grouping must keep the conservation checks at `r-exec-cli.mjs:729-788` true (rows == criteria count, no evidence-free `EXECUTED`) |

### Cheapest-honest ordering for the implementation wave

1. Port the reverse guard (`r-exec.cjs:1174-1178`) → stops new fake greens.
2. `probeMany` size read-back (`r-exec-cli.mjs:224` + `:234`, mirror at `r-exec-ws.mjs:430`) → VI40-class.
3. `installToastHook`/`drainToasts` (`r1-exec.cjs:278-305`) onto the CLI `evaluate` pattern → DND08's toast leg, 372 rows.
4. `pullDown`/`stopRefresh` (`r1-exec.cjs:1115-1126`) → H02/H03/N02–N05/PE03/VB04/MW09/RS13/REG32/PFI37 class.
5. `longpress` + `rapidTap` **on the WS leg** (`r1-exec.cjs:1033/1068`, `:1075-1081`) → MSG22–MSG26, CS19–CS22, AB06–AB14.
6. Import `apiPost` (`cli-automator.mjs:203`) + write the `wx.request` counter **[NEW]** → G-2, then network-fault injection **[NEW]** → G-3.
7. Component-scope probe (`cli-automator.mjs:192` + `r1-exec.cjs:1247-1251`) then `deepResolve` on WS → G-13's 42 rows.
8. ActionSheet/showModal **stub + readout** via `mockWxMethod` (`r1-exec.cjs:1134` shape) — and explicitly keep the "真点原生弹层" legs NOT_SHOOTABLE.
