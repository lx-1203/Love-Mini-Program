# B7 — Authored naming hooks for the 9 native `<switch>` elements

Implementation lane. **Naming-only commit**: one static `class="…"` added as the first attribute
of each `<switch>` node. No new logic, no re-parenting, no attribute reordering of the existing
bindings, no `:class` computed binding (static `class` only — it survives verbatim into the
compiled `class="…"`; computed bindings drop to the weaker `pageWxmlText` axis, per the research
note §d.5). No style change: every token is brand-new and referenced by zero CSS rules.

Convention source: neighbouring sibling `class` names in the SAME file (BEM-ish). All 9 tokens pass
`apply-ops-cellplans.mjs:118` `/^[.#][\w-]+$/` (verified against the literal regex by the research
lane and re-checked here; `-` and `_` are in `[\w-]`).

## Status — COMPLETE
- [x] file 1 — subpackages/vip/index.vue (switch #1)
- [x] file 2 — subpackages/campus/campus/post-topic.vue (switch #2)
- [x] file 3 — subpackages/profile-extra/settings/index.vue (switches #3, #4)
- [x] file 4 — subpackages/profile-extra/settings/dnd.vue (switches #5, #6)
- [x] file 5 — subpackages/profile-extra/profile/privacy.vue (switches #7, #8)
- [x] file 6 — subpackages/circles/circles/post-topic.vue (switch #9)
- [x] spec added — `apps/client/src/tests/native-switch-naming.spec.ts` (8 tests)
- [x] verify-source-shape --dry → `SRC_SHAPE_RESULT=OK` (EXIT=0)
- [x] typecheck → EXIT=0
- [x] vitest → EXIT=0 (120 files / 1343 tests passed)

## Verdict lines
- `SRC_SHAPE_RESULT=OK`  · `SRC_SHAPE total=98 成立=98 不成立=0 补丁=182（守恒：yes）` (EXIT=0, `--dry`, read-only)
  - Baseline BEFORE edits was also `OK / total=98 成立=98 不成立=0` → no regression.
- `TYPECHECK_EXIT=0`  (`pnpm -C apps/client typecheck` → `vue-tsc --noEmit`)
- `VITEST_EXIT=0`  (`pnpm -C apps/client test`) — 120 passed (120), 1343 passed (1343)

## The 9 before/after hooks

| # | file : `<switch` line (post-edit) | before (author hooks) | after (added static class) |
|---|---|---|---|
| 1 | `subpackages/vip/index.vue:532` | NONE | `auto-renew__switch` |
| 2 | `subpackages/campus/campus/post-topic.vue:570` | NONE | `option-switch` |
| 3 | `subpackages/profile-extra/settings/index.vue:570` | NONE | `menu-item__switch menu-item__switch--weekly` |
| 4 | `subpackages/profile-extra/settings/index.vue:589` | NONE | `menu-item__switch menu-item__switch--theme` |
| 5 | `subpackages/profile-extra/settings/dnd.vue:369` | NONE | `switch-row__control switch-row__control--enabled` |
| 6 | `subpackages/profile-extra/settings/dnd.vue:479` | NONE | `switch-row__control switch-row__control--urgent` |
| 7 | `subpackages/profile-extra/profile/privacy.vue:86` | NONE | `privacy-item__switch privacy-item__switch--allow` |
| 8 | `subpackages/profile-extra/profile/privacy.vue:98` | NONE | `privacy-item__switch privacy-item__switch--receive` |
| 9 | `subpackages/circles/circles/post-topic.vue:664` | NONE | `favorite-section__switch` |

"before" = per the research lane's inventory (`b7-switch-inventory-r10.md` §a): all 9 carried zero
authored `class`/`id`/`name`/`data-qa`; the only class reaching the artifact was Vue's scoped
`data-v-*` hash, and in settings/dnd/privacy that hash was **shared by the two switches** → ambiguous.

## Per-file notes — how uniqueness was guaranteed

### File 1 — `apps/client/src/subpackages/vip/index.vue` (1 switch)
- Sibling classes in the block: `.auto-renew`, `.auto-renew__info`, `.auto-renew__title`,
  `.auto-renew__desc` → block element = `auto-renew`. The `<switch>` (`vip/index.vue:532`) is a
  sibling of `.auto-renew__info` inside `.auto-renew`, so `auto-renew__switch` is the natural BEM
  element token. File has a single switch → no collision risk. Grep confirms `auto-renew__switch`
  occurs exactly once.

### File 2 — `apps/client/src/subpackages/campus/campus/post-topic.vue` (1 switch)
- This file uses a **flat `option-*`** naming family (`option-info`, `option-label`, `option-desc`
  at `:564-568`; the row wrapper is `option-row` at `:563`), NOT double-underscore BEM. To match the
  file's own style I used `option-switch` (not `option-row__switch`). Single switch → unique
  (`option-switch` occurs exactly once).

### File 3 — `apps/client/src/subpackages/profile-extra/settings/index.vue` (2 switches)
- Row classes: `.menu-item`, `.menu-item__left`, `.menu-item__icon`, `.menu-item__label`,
  `.menu-item__arrow`, modifier `menu-item--no-border` → double-underscore BEM with `--modifier`.
- Two switches share the file. Solution: a shared **base** `menu-item__switch` + a per-node
  **modifier**. The base alone would be multi-hit (`r-exec-cli.mjs:594-598` drops inferred
  multi-hit selectors), so the *distinguishing* token a tapTarget should carry is the modifier:
  `menu-item__switch--weekly` (#3, `:570`, `toggleWeeklySchedule`) vs `menu-item__switch--theme`
  (#4, `:589`, `handleThemeSwitch`). Grep: each modifier occurs exactly 1×. NOTE multi-token
  `class="a b"` is fine in source; only the single modifier token would be written as `tapTarget`
  (a two-token string fails the anchored `^[.#][\w-]+$` predicate — documented in §d.3 of the brief).

### File 4 — `apps/client/src/subpackages/profile-extra/settings/dnd.vue` (2 switches)
- Row classes: `.switch-row`, `.switch-row__left`, `.switch-row__label`, `.switch-row__desc`,
  modifier `switch-row--no-border`.
- Base `switch-row__control` + modifiers `--enabled` (#5, `:369`, `handleToggleEnabled`, master
  enable) and `--urgent` (#6, `:479`, `handleToggleAllowUrgent`, urgent passthrough). Each modifier
  occurs exactly 1×.

### File 5 — `apps/client/src/subpackages/profile-extra/profile/privacy.vue` (2 switches)
- Item classes: `.privacy-item`, `.privacy-item__info`, `.privacy-item__title`, `.privacy-item__desc`.
- Base `privacy-item__switch` + modifiers `--allow` (#7, `:86`, `onAllowRecommendChange`,
  same-school recommend) and `--receive` (#8, `:98`, `onReceiveInfoChange`, same-school info).
  Each modifier occurs exactly 1×. Care taken: #7's node closes as `/>      </view>` on the same
  source line; the class was inserted after `<switch` on its own line, tag/parent-close layout
  untouched.

### File 6 — `apps/client/src/subpackages/circles/circles/post-topic.vue` (1 switch)
- Block classes: `.favorite-section`, `.favorite-section__left`, `.favorite-section__title`,
  `.favorite-section__desc`. Single switch (`:664`, `toggleFavorite`) → `favorite-section__switch`,
  occurs exactly 1×. (Band caveat from research, not addressed here: the whole block is
  `v-if="useMock()"` → renders mock-band only; naming does not change that.)

## Collision / safety checks actually run
- Pre-edit grep of the 6 files for all 9 proposed tokens: **0 existing hits** (tokens are new).
- Whole-`src` grep for `.token` CSS-selector usages of all 6 base/distinguishing families: **0 hits**
  → no stylesheet will restyle the switch (honours "no style changes").
- `search` token: **0 hits in the 6 files before AND after** (my class names contain no `search`),
  so the home-page absence assertion (case H13) is not at risk. The spec additionally asserts no
  switch class matches `/search/`.
- Post-edit: every `<switch` node count = 1 per switch (9 total across 6 files) and all 9 have a
  static, non-empty `class` with no `data-v-` (pinned by the spec).

## Spec
`apps/client/src/tests/native-switch-naming.spec.ts` — 3 `describe`/`it.each` cases, 8 tests, reads
the 6 `.vue` sources with `readFileSync`+`node:path resolve` (matches the style of
`src/tests/pages/village-index-page.spec.ts`, adjusted one level up since this spec lives directly
under `src/tests/`). It extracts each self-closing `<switch … />` node and asserts: (1) total switch
nodes across the 6 files === 9 and each carries a non-empty static class without `data-v-`;
(2) each distinguishing modifier token hits exactly one switch in its file; (3) no switch class
contains `search`. It reads source only — it does NOT touch `dist/**` or rebuild any band.

## Expected side effect (not a regression to fix here)
`verify-band-freshness` will go RED because `apps/client/src` is now newer than the three compiled
bands. The main lane rebuilds `mp-weixin` / `mp-weixin-real` / `mp-weixin-showcase` itself; this lane
was explicitly told NOT to rebuild or touch DevTools/ports 9420/9430, so no band was rebuilt here.
Consequence of the naming-only change reaching the artifact: once rebuilt, `settings`/`dnd`/`privacy`
will each expose the two distinct modifier tokens verbatim in their page wxml, resolving the
shared-hash ambiguity. Naming is necessary but NOT sufficient — none of the 7 blocked rows
(`ST05, ST06, PT25, DND02, DND03, PR05, VI09`) becomes automatable from a hook alone (executor
`r-exec-cli.mjs` only dispatches `tap`/`input`, no `change` leg); no row was booked as automatable.

## Untouched (hard constraints honoured)
No edits to `scripts/qa/**`, `reports/**`, `apps/client/dist/**`, `.zcode/workflows/**`. No commit,
no `git stash/checkout/reset/clean`, no deletes. Only the 6 `.vue` files + 1 new spec + this report.
