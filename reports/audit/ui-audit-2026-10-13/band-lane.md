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

## Step 2 — entry points (pending)
## Step 3 — build showcase -> real -> mock (pending)
## Step 4 — post-build MODE grep (pending)
## Step 5 — verify-band-freshness gate (pending)
## Step 6 — strip-mock restoration check (pending)
## Step 7 — git-clean vs git-dirty split (pending)
