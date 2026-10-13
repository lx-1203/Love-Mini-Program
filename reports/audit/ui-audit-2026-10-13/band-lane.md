# Band Lane Notes — artifact rebuild @ HEAD

Running notes, appended incrementally. Repo: `D:\6\恋爱小程序`.

## Step 1 — PRE-STATE (recorded)
- HEAD = `847da07912ba53b8b465c5795f276895e443067b`
- Bands under `apps/client/dist/build/` (all three EXIST, all older than this rebuild):
  - `mp-weixin` (MOCK)      dir-mtime 2026-10-09 04:15:25 | env.js mtime 2026-10-09 04:15:23
    - `MODE:"mp-weixin-mock"`  `VITE_API_MODE:"mock"`  (no showcase)
    - env.js sha256 = `f1c7b96b0b1e3b71cf4336102b19d5c2cf87fac987e290530b83667c0cc013f5`
  - `mp-weixin-real` (REAL) dir-mtime 2026-10-07 06:50:33 | env.js mtime 2026-10-07 06:53:32
    - `MODE:"real"`  `VITE_API_MODE:"real"`
    - env.js sha256 = `f0677920198be53f230c17ab56c10af7c07b27cdd7e028d259b7f6ffb1f87eb2`
  - `mp-weixin-showcase` (SHOWCASE) dir-mtime 2026-10-08 06:04:53 | env.js mtime 2026-10-08 06:04:51
    - `MODE:"mp-weixin-showcase"`  `VITE_API_MODE:"real"`  `VITE_SHOWCASE_MODE:"true"`
    - env.js sha256 = `ed1cd82cf2f71837767c202163ac47a0d61138be53f5596926e31ad41c2a0e22`
- **MOCK band `config/env.js` BEFORE sha256** (the fingerprint the carriers must leave unchanged):
  `f1c7b96b0b1e3b71cf4336102b19d5c2cf87fac987e290530b83667c0cc013f5`
- git status (dirty, untracked dirs) — captured in step 7 split.

## Step 2 — entry points (DONE)
- **Carriers are the ONLY build entries used** (never bare pnpm scripts for showcase/real):
  - showcase: `node scripts/build-real-isolated.mjs --band showcase` (a.k.a. `build-showcase-isolated.mjs` forwarder). BANDS.showcase: out=`dist/build/mp-weixin-showcase`, stripMock=false, pre=`prepare-static --dev`+`profile-svg-to-png`, uni `-p mp-weixin-showcase --mode mp-weixin-showcase`, resolveUniBin uses absolute `node_modules/.bin/uni.CMD`.
  - real: `node scripts/build-real-isolated.mjs` (default band=real). out=`dist/build/mp-weixin-real`, stripMock=TRUE (wraps `uni build --platform mp-weixin --mode real` in strip-mock-for-mp.mjs), preSteps=[] (no full-chain).
  - mock LAST: has no carrier (mock IS the shared-dir home `dist/build/mp-weixin`); carriers REFUSE to build into it. Mock entry = `pnpm run build:mp-weixin:mock` (package.json:26 → check-mp-image-styles --strict, prepare-static --dev, profile-svg-to-png, `uni build --platform mp-weixin --mode mp-weixin-mock`, verify-package-size --allow-mock, verify-build-features). Collision gate `--mode mp-weixin-mock` = home, allowed.
- **Node toolchain**: PATH node = v16.13.1 (too old; carrier has node>=18 gate, uni build needs newer). Node 22 = `D:/codex-tools/node-v22.17.0-win-x64/node.exe`.
- **Windows PATH gotcha — PROVEN WORKAROUND**: `cmd.exe //c node.exe -v` plainly = v16.13.1; with `PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH"` prepended in the Git Bash command = v22.17.0 (`where node` in cmd confirms D:\codex-tools\node-v22... first). So every build cmd runs with node22 prepended to PATH (MSYS converts it into the cmd.exe env block; uni.CMD's `%~dp0node.exe` absent so it falls to PATH node → v22). Launch carrier itself with absolute node22 exe.
- `build-mp-weixin.bat` (Node>=20 gate + `NODE22_DIR` prepend escape) calls `pnpm run build:mp-weixin:real:isolated` (real, isolated). `start-showcase.bat` calls showcase isolated BUT also `start ... pnpm api:dev` (would fight the live 8080 backend) → NOT using it; using the carrier directly instead.
- Baseline `check-band-outdir-collision.mjs --audit` = `AUDIT_OK bands=3` (all three dirs currently hold their own band; staleness is what makes the gate red, not band identity).
- strip-mock backup dir `.strip-mock-backup/` does NOT exist pre-build (created during real build, rm'd on restore). `src/static` present (not held; DevTools closed).
- Freshness gate `verify-band-freshness.mjs` is READ-ONLY unless `--out <json>` given (only `writeFileSync` at line 358 under `if (OUT_JSON)`). Running it WITHOUT --out.
## Step 3 — build showcase -> real -> mock (DONE)
- Order followed to avoid shared-dir poisoning; all three used ONLY the isolated carriers / mock's home chain. No step was forced into the shared dir.
- SHOWCASE (`--band showcase`): `SHOWCASE_RESULT=PASS`, exit 0; self-cert `MODE=mp-weixin-showcase VITE_API_MODE=real VITE_SHOWCASE_MODE=true`; `sharedOutUntouched=yes`.
- REAL (`--band real`, stripMock path): `G7_RESULT=PASS`, exit 0; `[strip-mock] originals restored`; self-cert `MODE=real VITE_API_MODE=real`; `sharedOutUntouched=yes`.
- MOCK LAST (`pnpm run build:mp-weixin:mock`, shared dir is its home): build DONE exit 0; `PACKAGE_SIZE_RESULT=WAIVED_MOCK` (main-package over-limit waived under --allow-mock, expected for mock dev band); `verify-build-features` `[verify] PASS` 4/4.

## Step 4 — post-build MODE grep (DONE — the real proof)
Grep of each band's OWN `config/env.js` (not exit codes):
- `mp-weixin`            MODE:"mp-weixin-mock"  VITE_API_MODE:"mock"  sha256 `f1c7b96b...`  mtime 2026-10-13 19:40:29
- `mp-weixin-real`       MODE:"real"            VITE_API_MODE:"real"  sha256 `f0677920...`  mtime 2026-10-13 19:39:18
- `mp-weixin-showcase`   MODE:"mp-weixin-showcase" VITE_API_MODE:"real" VITE_SHOWCASE_MODE:"true"  sha256 `ed1cd82c...`  mtime 2026-10-13 19:38:29
- `check-band-outdir-collision.mjs --audit` = `BANDCOLLIDE_RESULT=AUDIT_OK bands=3` (each dir holds its own band). All three env.js sha256 are byte-identical to the pre-build values (MODE/line content deterministic; only mtimes advanced to today). All three mtimes are NEWER than HEAD commit (see step 5 for HEAD date).

## Step 6 — strip-mock restoration check (DONE)
- After SHOWCASE (stripMock=false): `grep "AUTO-GENERATED STUB"` in src = NO STUB MARKERS; 8 target files present with real sizes (fixtures 80133, en-US 215888, chat/mock-data 9186).
- After REAL (stripMock=true): NO STUB MARKERS; `.strip-mock-backup/` removed; `git status --porcelain` of all 8 stub-target files = EMPTY (byte-identical to HEAD ⇒ restored, not hand-edited).
- Mock band env.js fingerprint re-checked after each build: `f1c7b96b0b1e3b71cf4336102b19d5c2cf87fac987e290530b83667c0cc013f5` BEFORE == AFTER (unchanged).

## Step 5 — freshness gate (DONE — RED → GREEN)
Ran READ-ONLY (no `--out`, so it wrote no file): `node scripts/qa/verify-band-freshness.mjs`. Machine lines:
- `FRESH srcFiles=752 git脏项(0行报出/0条解析) srcDirtyFiles=0 档位=3 标记=4`
- `mock` 最新产物=2026-10-13T11:40:30Z 脏项晚于产物=0 构建写回(仅mtime)=0
- `real` 最新产物=2026-10-13T11:39:19Z 脏项晚于产物=0 构建写回(仅mtime)=8
- `showcase` 最新产物=2026-10-13T11:38:30Z 脏项晚于产物=0 构建写回(仅mtime)=8
- markers hit in all 3 bands: isAllowedMediaExt=3/3/3, parsePrivateQuoteContext=2/2/2, pinnedNotice=2/2/2, --hot-badge-bg=1/1/1
- `FRESH_内容级 嫌疑(按mtime)=0 真过期=0 仅mtime已洗清=0 无法定罪=0 不可观测=0`
- **`FRESH_RESULT=PASS bands=3 markers=4`**  (GATE_RC=0; NO `problems=` FAIL line — previously `problems=13`)
- HEAD commit-date = 2026-10-13 19:35:57 (+0800); all three band env.js mtimes (19:38:29 / 19:39:18 / 19:40:29) are AFTER HEAD. Fresh confirmed.
- The 8 "构建写回(仅mtime)" rows on real & showcase are exactly the strip-mock target files (mtime touched, bytes identical to HEAD) — build bookkeeping, correctly washed out, NOT flagged as staleness.

## Step 7 — git-clean vs git-dirty split (DONE)
- `git status --porcelain -- apps/client/src` = **EMPTY**. All 8 strip-mock targets byte-clean vs HEAD; `apps/client/src/services/config.ts` (other lane's fix) is clean too ⇒ it is IN HEAD 847da07 and was on disk before the 19:38+ builds, so the bands ingest it as-is. No un-ingested src edit exists.
- Repo-wide dirty (git-clean bookkeeping vs git-dirty real edits): remaining `M`/`??` are ALL under `scripts/qa/**` (case-recipes.json, exec-capabilities.mjs, r-exec-cli.mjs, r-exec-ws.mjs, test-cap-recipes.cjs, test-exec-verb-dispatch.cjs, probe-*.mjs, .bak files) and `reports/audit/ui-audit-2026-10-13/**`. None are `apps/client/src/**` ⇒ none feed the mp-weixin bands ⇒ nothing to flag as "real un-ingested edit" for band freshness.
- (Note: step-1 status listed `M apps/client/src/services/config.ts` and `M apps/api/.../GlobalExceptionHandler.java` — those have since been committed into HEAD during this session by other lanes; not by me. I ran no git add/commit/checkout/stash/clean.)

## Mock-fingerprint summary
BEFORE (step 1) = AFTER all builds = `f1c7b96b0b1e3b71cf4336102b19d5c2cf87fac987e290530b83667c0cc013f5` (byte-identical; mock band rebuilt last produced the same deterministic env.js; carriers' `sharedOutUntouched=yes` corroborates).

## Result
Three fresh, self-consistent bands at HEAD; collision `--audit` = AUDIT_OK bands=3; strip-mock fully restored; red gate `verify-band-freshness` cleared (13 → PASS). No DevTools opened, backend untouched, no git mutations, no rm -rf on bands.
