# round-7 轮末验收报告（全部数字运行时派生，零手写统计）

- 生成器：`scripts/qa/emit-round-report.mjs`（启动于 2026-09-28T10:26:02.922Z，node v22.17.0，`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）
- 轮次目录 `reports/audit/round-7` · 权威件 `reports/audit/round-7/interact/exec-results.json` · 冻结快照 `.zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json`

## 0. 溯源表（本报告引用的每一个输入；缺此表即不可复核）

| 文件 | mtime (UTC) | 字节 | sha256 前 8 |
|---|---|---|---|
| `.zcode/tmp/round6-LEDGER.md` | 2026-09-26T02:35:50.253Z | 327926 | `46fb9e7b` |
| `.zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json` | 2026-09-26T07:14:52.493Z | 812539 | `b89dc4a7` |
| `reports/audit/real-e2e/GATES.json` | 2026-09-26T20:07:34.837Z | 2286 | `8edec6e9` |
| `reports/audit/round-7/interact/exec-results.json` | 2026-09-26T08:49:54.068Z | 812158 | `d1e019f8` |
| `reports/audit/round-7/ops/` | (目录：登记条目数 24，无单文件语义) | 24 | `4e5c2793` |
| `reports/audit/round-7/screenshot-manifest.json` | 2026-09-27T07:34:26.293Z | 1409875 | `54f74bde` |
| `reports/screenshots/round-6-tour/manifest-detail.json` | 2026-09-25T09:24:49.927Z | 725431 | `3f132cee` |
| `scripts/qa/r-exec.cjs` | 2026-09-25T23:59:25.629Z | 128320 | `5891159b` |
| `tmp/qa/checkpoints/exec-R7.json` | 2026-09-26T11:41:02.482Z | 70117 | `037efe8b` |

| 子进程（命令行原样，cwd=仓库根） | 解释器 | 退出码 | stdout 字节 | sha256(stdout) 前 8 | 备注 |
|---|---|---|---|---|---|
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-restarted.mjs --port 8080` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 593 | `417eb0f7` |  |
| `git rev-parse --short HEAD` | git | 0 | 9 | `1773fa71` |  |
| `git status --porcelain` | git | 0 | 7501 | `9424eb78` |  |
| `git status --porcelain -- apps/` | git | 0 | 0 | `e3b0c442` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 806 | `364ace82` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r7-at-report` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 2 | 44918 | `756cc2f5` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-band-freshness.mjs --out .zcode/tmp/report-emitter/band-freshness-r7.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1084 | `0bc77939` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-disproof-anchors.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 579 | `314dca06` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/parse-check-sfc.mjs --from-git apps/client` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 127 | `6eb5a3dd` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-frame-debt-triage.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 276 | `4eae09be` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-frame-debt-coverage.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 325 | `57c72b3a` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/apply-ops-cellplans.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 3640 | `dca2f67b` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-source-shape.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 270 | `d741c788` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/probe-ws-cli-exclusion.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1865 | `be78efaf` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-rulings-landed.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 641 | `016043a5` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-criteria-frame-debt.mjs --strict` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 399 | `6c0e1349` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-tab-bar-single-source.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 409 | `362ab253` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/probe-admin-post-counts.mjs --limit 5` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 769 | `077ac1ca` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-guest-landing.mjs --mode book` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 870 | `a8d0aff0` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-holes.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 682 | `db9d0267` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs --selftest` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 31 | `c05ba6e2` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/run-npm-script.mjs --selftest` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 38 | `1ac775af` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/probe-admin-i18n-keys.mjs --all` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 59 | `f7143e5a` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-real-coverage.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 6460 | `f92992db` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-fresh.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 291 | `5deccce6` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 3417 | `9da09aa8` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-state-truth.mjs reports/audit/round-7` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1105 | `1e832789` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 6163 | `b4f33ed6` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/audit/round-7/screenshot-manifest.json --dir reports/screenshots/round-6-tour --exec reports/audit/round-7/interact/exec-results.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1999 | `a7c80c93` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 8383 | `89db1a46` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-provenance-all.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 209023 | `18a1a5fb` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs --scope reports/audit/round-7,reports/screenshots/round-7-A-mock-final,reports/screenshots/round-7-A-real,reports/screenshots/round-7-A-real-only,reports/screenshots/round-7-exec,reports/screenshots/round-7-exec-04e00747,reports/screenshots/round-7-exec-086b54f8,reports/screenshots/round-7-exec-1f8331b0,reports/screenshots/round-7-exec-271310bc,reports/screenshots/round-7-exec-6d3f71f5,reports/screenshots/round-7-exec-a1cbb0cb,reports/screenshots/round-7-exec-d77813f8,reports/screenshots/round-7-exec-fc13948f,reports/screenshots/round-7-final-A-mock,reports/screenshots/round-7-final-A-real,reports/screenshots/round-7-final-guest-mock,reports/screenshots/round-7-final-guest-real,reports/screenshots/round-7-guest-real,reports/screenshots/round-7-guest-real-final,reports/screenshots/round-7-guest-real-only,reports/screenshots/round-7-guest1,reports/screenshots/round-7-mock-tour-1a1df78b,reports/screenshots/round-7-probe-quiet,reports/screenshots/round-7-r8-A-login,reports/screenshots/round-7-r8-guest-login,reports/screenshots/round-7-r8-guest-real-login,reports/screenshots/round-7-r8e-A-showcase,reports/screenshots/round-7-r8e-framedebt,reports/screenshots/round-7-r8e-guest-real-close,reports/screenshots/round-7-r8f-reshoot,reports/screenshots/round-7-r8g-guestreshoot,reports/screenshots/round-7-r8h-lasttwo,reports/screenshots/round-7-real-exec,reports/screenshots/round-7-real-guest,reports/screenshots/round-7-real-taps,reports/screenshots/round-7-real-taps2,reports/screenshots/round-7-real-tour,reports/screenshots/round-7-real-tour-full,reports/screenshots/round-7-realguest,reports/screenshots/round-7-realtaps,reports/screenshots/round-7-showcase,reports/screenshots/round-7-stage7-A-mock,reports/screenshots/round-7-stage7-A-real,reports/screenshots/round-7-stage7-a-real-frames,reports/screenshots/round-7-stage7-guest-real,reports/screenshots/round-7-stage7-guest-real-frames,reports/screenshots/round-7-stage7-mock,reports/screenshots/round-7-stage8b-tour-B-real,reports/screenshots/round-7-states,reports/screenshots/round-7-states-fix1,reports/screenshots/round-7-states-fix2,reports/screenshots/round-7-states-pilot,reports/screenshots/round-7-states-pilot2,reports/screenshots/round-7-states-pilot3,reports/screenshots/round-7-states-pilot4,reports/screenshots/round-7-tap-final,reports/screenshots/round-7-tap-mock,reports/screenshots/round-7-tap-mock2,reports/screenshots/round-7-tap2,reports/screenshots/round-7-tap3,reports/screenshots/round-7-taps,reports/screenshots/round-7-uidebt-1a1df78b,reports/screenshots/round-7-uidebt-final,reports/screenshots/round-7-uidebt-guest-8df4de49,reports/screenshots/round-7-uidebt-guest2-8df4de49,reports/screenshots/round-7-uidebt-txt-d99f3a1f,reports/screenshots/round-7-uidebt-ws-8df4de49,reports/screenshots/round-7-uidebt-wsl2-8df4de49,reports/screenshots/round-7-uidebt-wsl3-8df4de49` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 12141 | `266691e2` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-provenance-all.mjs --scope reports/audit/round-7,reports/screenshots/round-7-A-mock-final,reports/screenshots/round-7-A-real,reports/screenshots/round-7-A-real-only,reports/screenshots/round-7-exec,reports/screenshots/round-7-exec-04e00747,reports/screenshots/round-7-exec-086b54f8,reports/screenshots/round-7-exec-1f8331b0,reports/screenshots/round-7-exec-271310bc,reports/screenshots/round-7-exec-6d3f71f5,reports/screenshots/round-7-exec-a1cbb0cb,reports/screenshots/round-7-exec-d77813f8,reports/screenshots/round-7-exec-fc13948f,reports/screenshots/round-7-final-A-mock,reports/screenshots/round-7-final-A-real,reports/screenshots/round-7-final-guest-mock,reports/screenshots/round-7-final-guest-real,reports/screenshots/round-7-guest-real,reports/screenshots/round-7-guest-real-final,reports/screenshots/round-7-guest-real-only,reports/screenshots/round-7-guest1,reports/screenshots/round-7-mock-tour-1a1df78b,reports/screenshots/round-7-probe-quiet,reports/screenshots/round-7-r8-A-login,reports/screenshots/round-7-r8-guest-login,reports/screenshots/round-7-r8-guest-real-login,reports/screenshots/round-7-r8e-A-showcase,reports/screenshots/round-7-r8e-framedebt,reports/screenshots/round-7-r8e-guest-real-close,reports/screenshots/round-7-r8f-reshoot,reports/screenshots/round-7-r8g-guestreshoot,reports/screenshots/round-7-r8h-lasttwo,reports/screenshots/round-7-real-exec,reports/screenshots/round-7-real-guest,reports/screenshots/round-7-real-taps,reports/screenshots/round-7-real-taps2,reports/screenshots/round-7-real-tour,reports/screenshots/round-7-real-tour-full,reports/screenshots/round-7-realguest,reports/screenshots/round-7-realtaps,reports/screenshots/round-7-showcase,reports/screenshots/round-7-stage7-A-mock,reports/screenshots/round-7-stage7-A-real,reports/screenshots/round-7-stage7-a-real-frames,reports/screenshots/round-7-stage7-guest-real,reports/screenshots/round-7-stage7-guest-real-frames,reports/screenshots/round-7-stage7-mock,reports/screenshots/round-7-stage8b-tour-B-real,reports/screenshots/round-7-states,reports/screenshots/round-7-states-fix1,reports/screenshots/round-7-states-fix2,reports/screenshots/round-7-states-pilot,reports/screenshots/round-7-states-pilot2,reports/screenshots/round-7-states-pilot3,reports/screenshots/round-7-states-pilot4,reports/screenshots/round-7-tap-final,reports/screenshots/round-7-tap-mock,reports/screenshots/round-7-tap-mock2,reports/screenshots/round-7-tap2,reports/screenshots/round-7-tap3,reports/screenshots/round-7-taps,reports/screenshots/round-7-uidebt-1a1df78b,reports/screenshots/round-7-uidebt-final,reports/screenshots/round-7-uidebt-guest-8df4de49,reports/screenshots/round-7-uidebt-guest2-8df4de49,reports/screenshots/round-7-uidebt-txt-d99f3a1f,reports/screenshots/round-7-uidebt-ws-8df4de49,reports/screenshots/round-7-uidebt-wsl2-8df4de49,reports/screenshots/round-7-uidebt-wsl3-8df4de49` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 210186 | `7fe76f0e` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --check --stamp reports/audit/round-7/ops-corpus-stamp.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1588 | `26fc479d` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-case-selectors-exist.mjs --band apps/client/dist/build/mp-weixin` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 3044 | `ebc7aaf8` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-case-selectors-exist.mjs --band apps/client/dist/build/mp-weixin-real` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 3044 | `ebc7aaf8` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --copy reports/audit/round-7/ops --stamp reports/audit/round-7/ops-corpus-stamp.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 952 | `61b469fa` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-carryover.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 248 | `1102c08d` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-final.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 416 | `94e3c1c9` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-final2.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 426 | `f5c05c08` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage4.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 439 | `e8b4d8ba` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage4tail.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 443 | `566ee3e2` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage4tail4.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 427 | `22aaa61b` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage5.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 2 | 1510 | `e5e98148` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage6.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 575 | `02fcf43d` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage6b.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 514 | `b3ae863a` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage7.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 536 | `a5d29692` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-tour.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 2 | 1226 | `ceb7f7eb` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7b-stage7.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 424 | `d4efd222` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-guest-real/manifest-detail.json --dir reports/screenshots/round-7-guest-real` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 2953 | `8e099cb2` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json --dir reports/screenshots/round-7-mock-tour-1a1df78b` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 677 | `df3849a7` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-real-exec/manifest-detail.json --dir reports/screenshots/round-7-real-exec` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 2648 | `3afdb1ac` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-real-tour/manifest-detail.json --dir reports/screenshots/round-7-real-tour` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 668 | `0458872e` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-real-tour-full/manifest-detail.json --dir reports/screenshots/round-7-real-tour-full` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 673 | `da30ced7` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-stage8b-tour-B-real/manifest-detail.json --dir reports/screenshots/round-7-stage8b-tour-B-real` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 672 | `d1b58fa8` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states/manifest-detail.json --dir reports/screenshots/round-7-states` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1415 | `875d0398` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-fix2/manifest-detail.json --dir reports/screenshots/round-7-states-fix2` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1098 | `19dd9237` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot/manifest-detail.json --dir reports/screenshots/round-7-states-pilot` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 824 | `53e296ab` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot2/manifest-detail.json --dir reports/screenshots/round-7-states-pilot2` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 826 | `b2fc8223` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot3/manifest-detail.json --dir reports/screenshots/round-7-states-pilot3` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 826 | `936b56b1` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot4/manifest-detail.json --dir reports/screenshots/round-7-states-pilot4` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 826 | `87404441` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-tap3/manifest-detail.json --dir reports/screenshots/round-7-tap3` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 2924 | `3a8136b9` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-uidebt-1a1df78b/manifest-detail.json --dir reports/screenshots/round-7-uidebt-1a1df78b` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 2677 | `ae78a5f7` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-i18n-orphan.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1851 | `f47e6ed8` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe apps/client/scripts/build-real-isolated.mjs --check-only` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 200 | `265f3f57` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 2457 | `303c7f08` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 402 | `96ec2406` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/probe-real-env.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1093 | `9e008813` |  |

> **并发写入声明**：权威件在执行轮结束前持续被追加。本工具对每个文件**读一次、哈希一次**，上表 sha 就是被我解析的那一份字节；被调门（分诊台/改判台/完整性门）按各自启动时刻**重读同一文件**，故它们的行数与我这份可差几条——差值在对应小节逐处标出，不取齐、不四舍五入。

## A. 轮次身份

- HEAD：`6fd15178` (源: git rev-parse --short HEAD → stdout=)
- 工作树脏项：全仓 149 项 (源: git status --porcelain → 行数=)；其中 `apps/` 下 0 项 (源: git status --porcelain -- apps/ → 行数=)
- 后端 JVM：pid=32156，起于 2026-09-26 21:32:46 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-restarted.mjs --port 8080 → RESTARTED_PID=)；该门本次判定 **PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提**（退出码 0）
  - 其自报最新源码：D:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/location/LocationController.java mtime=2026-09-26T12:55:06.927Z
- 被测物包指纹（在盘产物逐文件 sha256 前 8；brief 所说『两个 mock 包指纹』的全部可核解释一并列出）：
  - **mock 包（执行轮被测物，重建后在盘）** `apps/client/dist/build/mp-weixin`：app.json=`207f7136` (5264B, 2026-09-27T16:52:07.325Z) · config/env.js=`f1c7b96b` (2402B, 2026-09-27T16:52:07.248Z) · config/showcase.js=`59e2a9c9` (920B, 2026-09-27T16:52:07.311Z) · config/feature-flags.js=`08a7cff6` (134B, 2026-09-27T16:52:07.312Z)
    合成指纹（按 `app.json→env→showcase→feature-flags` 的 sha8 串接再 sha256）：`ff6dd482` (源: apps/client/dist/build/mp-weixin/app.json → sha256)
  - **real 包（G7 隔离产物）** `apps/client/dist/build/mp-weixin-real`：app.json=`207f7136` (5264B, 2026-09-27T16:54:49.327Z) · config/env.js=`f0677920` (2392B, 2026-09-27T16:54:49.241Z) · config/showcase.js=`3039fc25` (910B, 2026-09-27T16:54:49.307Z) · config/feature-flags.js=`08a7cff6` (134B, 2026-09-27T16:54:49.307Z)
    合成指纹（按 `app.json→env→showcase→feature-flags` 的 sha8 串接再 sha256）：`05637737` (源: apps/client/dist/build/mp-weixin-real/app.json → sha256)
  - 巡检载体**当时记下**的 buildFingerprint（记录值，非本次计算）：`{"buildMode":"build:mp-weixin:mock","mode":"mp-weixin-mock","apiMode":"mock","isShowcaseMode":false,"membershipEnabled":false,"readFrom":["apps/client/dist/build/mp-weixin/config/env.js","apps/client/dist/build/mp-weixin/config/showcase.js","apps/client/dist/build/mp-weixin/config/feature-flags.js"]}` gitSha=`874ff52f` (源: reports/screenshots/round-6-tour/manifest-detail.json → buildFingerprint)
  - 两份巡检载体是否同一 gitSha：**否：874ff52f vs e4495d67**

## B. 覆盖（计划 / 已记录 / 缺口）

- 队列对账门本次判定：**QUEUE_RESULT=PASS**（退出码 0）
- 计划：24 套 / 1107 例 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_PLANNED_CASES=)
- 已记录：1107 行（manifest 轴 24 套；唯一 id 1065；我这份快照读到 1107 行）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_RECORDED_CASES=)
- 缺口：GAP=0；从未开跑 0 套 / 0 例；未计划套件 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_GAP=)
- 键轴：`manifest` 命中 24/24；缺 manifest 字段的行 0；复合主键重复组 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_KEY_AXIS_MATCHED=)
- requiresReal 普查：true=236 false=871 未打=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_REQUIRES_REAL_TRUE=)
- 证据里带 ERROR/timeout 的行（192 那条门禁口径）：0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_ERR_TAINTED_CASES=)
- CONSERVED ✔ 计划 − 记录 vs GAP: 1107 + 0 = 1107 vs 全体 1107
- 检查点 `tmp/qa/checkpoints/exec-R7.json`：suites 24，status 分布 completed=24 (源: tmp/qa/checkpoints/exec-R7.json → suites[].status)
  - **status=running 的套件是半途中断的半成品，绝不得计入"完成"**：无 (源: tmp/qa/checkpoints/exec-R7.json → suites[running])
  - 套件轴口径说明：检查点键是**派生规划器 id**（`P-<manifest>-<seq>`），计划侧是 manifest 名，两轴不同，故下面用权威件的 `suite→manifest` 字段做映射（映射不到者进兜底桶）。
  - 计划套件（ops 轴）24 · 检查点已认领 24 · 从未进检查点 0 · 兜底桶「suite 键映射不到 manifest」= **0** (源: reports/audit/round-7/interact/exec-results.json → results[].suite → results[].manifest)
  - CONSERVED ✔ status 分布 vs 检查点 suites: 24 = 24 vs 全体 24
  - CONSERVED ✔ 已认领 + 从未开跑 vs 计划套件: 24 + 0 = 24 vs 全体 24
  - 与队列门的从未开跑一致：0 套
- 从未开跑清单（逐字取自门的输出行，非我拼装）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_NEVER_RAN=)：
  - ⚠ 门一行 `QUEUE_NEVER_RAN` 都没打印，而计数是 0 —— 两者不符即为该门的截断/字段问题，按取不到记。

## C. 结果分布（重建边界两侧分开算，合并值只作守恒核对）

- **边界怎么派生**：把在盘权威件与冻结快照按 `suite|manifest|id` 三字段复合键比对（与 `scripts/qa/r-exec.cjs` 第 478 行 的 `upsertResult` findIndex 同一把键，行号由本报告读该文件得出）(源: scripts/qa/r-exec.cjs → upsertResult findIndex 行号)。**不按行号**——行是就地 upsert 的，按号比必错位。
  - 快照 `.zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json`：1107 行，gitSha=713c1729 updatedAt=2026-09-26T07:05:22.051Z (源: .zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json → results[])
  - 在盘 `reports/audit/round-7/interact/exec-results.json`：1107 行，gitSha=086b54f8 updatedAt=2026-09-26T08:49:54.056Z (源: reports/audit/round-7/interact/exec-results.json → results[])
- **A 侧｜冻结 `713c1729` 构建 + 旧后端**（复合键见于快照的行）：1107 行 = EXECUTED 326 / FAILED 134 / SKIPPED 647 (源: reports/audit/round-7/interact/exec-results.json → status)
- **B 侧｜重建构建 + 重启后后端**（复合键未见于快照的行）：0 行 = EXECUTED 0 / FAILED 0 / SKIPPED 0 (源: reports/audit/round-7/interact/exec-results.json → status)
- ⚠ 合计（**混合两个被测物，仅作守恒核对，不得作结论、不得当通过率分母**）：1107 行 = EXECUTED 326 / FAILED 134 / SKIPPED 647 (源: reports/audit/round-7/interact/exec-results.json → status)
- CONSERVED ✔ A 侧 + B 侧 vs 在盘行数: 1107 + 0 = 1107 vs 全体 1107
- CONSERVED ✔ A 侧三态 vs A 侧行数: 326 + 134 + 647 + 0 = 1107 vs 全体 1107
- CONSERVED ✔ B 侧三态 vs B 侧行数: 0 + 0 + 0 + 0 = 0 vs 全体 0
- CONSERVED ✔ 快照中已从在盘消失的行（应为 0）: 0 = 0 vs 全体 0
- 两侧同键但状态被改写（停机后重跑同一用例、覆盖旧结论）：**205** 行 (源: .zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json → status)
  - `C-PAGES-DISCOVER-INDEX|PAGES-DISCOVER-INDEX|DC07` EXECUTED → SKIPPED
  - `C-PAGES-DISCOVER-INDEX|PAGES-DISCOVER-INDEX|DC20` EXECUTED → SKIPPED
  - `C-PAGES-DISCOVER-INDEX|PAGES-DISCOVER-INDEX|DC43` SKIPPED → EXECUTED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H02` SKIPPED → EXECUTED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H03` SKIPPED → EXECUTED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H06` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H07` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H08` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H09` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H36` EXECUTED → SKIPPED
  - 这些行按复合键归 **A 侧**（快照认领过），但其状态取自在盘权威件。把 A 侧读成"纯冻结构建的结果"时须扣这 205 行。
- BELT=REMEASURED-ALL：在盘 1107 行的复合键全部被快照认领过，且状态逐行取自在盘权威件（就地改写 205 行）⇒ 本轮是"重建后全量重测"，A/B 按键分侧退化为一侧，边界由构建戳差（快照 vs 活件 gitSha 不同）证明。

| 套件（manifest｜检查点 suite 轴） | 行数 | A侧 | B侧 | EXECUTED | FAILED | SKIPPED | 其他 |
|---|---|---|---|---|---|---|---|
| `次要21`｜`C-次要21` | 102 | 102 | 0 | 26 | 20 | 56 | 0 |
| `次要20`｜`C-次要20` | 101 | 101 | 0 | 27 | 0 | 74 | 0 |
| `次要18`｜`C-次要18` | 88 | 88 | 0 | 22 | 9 | 57 | 0 |
| `次要22`｜`C-次要22` | 78 | 78 | 0 | 13 | 25 | 40 | 0 |
| `次要19`｜`C-次要19` | 69 | 69 | 0 | 18 | 0 | 51 | 0 |
| `PAGES-HOME-INDEX`｜`C-PAGES-HOME-INDEX` | 48 | 48 | 0 | 29 | 0 | 19 | 0 |
| `PAGES-DISCOVER-INDEX`｜`C-PAGES-DISCOVER-INDEX` | 45 | 45 | 0 | 32 | 0 | 13 | 0 |
| `PAGES-PROFILE-INDEX`｜`C-PAGES-PROFILE-INDEX` | 45 | 45 | 0 | 25 | 0 | 20 | 0 |
| `PAGES-NEARBY-INDEX`｜`C-PAGES-NEARBY-INDEX` | 42 | 42 | 0 | 24 | 0 | 18 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-INDEX`｜`C-SUBPACKAGES-VILLAGE-VILLAGE-INDEX` | 42 | 42 | 0 | 7 | 0 | 35 | 0 |
| `PAGES-MESSAGES-INDEX`｜`C-PAGES-MESSAGES-INDEX` | 41 | 41 | 0 | 29 | 0 | 12 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC`｜`C-SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC` | 41 | 41 | 0 | 9 | 0 | 32 | 0 |
| `SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC`｜`C-SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC` | 40 | 40 | 0 | 12 | 0 | 28 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-POST`｜`C-SUBPACKAGES-VILLAGE-VILLAGE-POST` | 40 | 40 | 0 | 7 | 0 | 33 | 0 |
| `PAGES-LOGIN-INDEX`｜`C-PAGES-LOGIN-INDEX` | 38 | 38 | 0 | 0 | 37 | 1 | 0 |
| `PAGES-REGISTER-INDEX`｜`C-PAGES-REGISTER-INDEX` | 37 | 37 | 0 | 2 | 0 | 35 | 0 |
| `SUBPACKAGES-CHAT-CHAT-SESSION-INDEX`｜`C-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX` | 34 | 34 | 0 | 4 | 0 | 30 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH`｜`C-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH` | 34 | 34 | 0 | 6 | 0 | 28 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-INDEX`｜`C-SUBPACKAGES-CAMPUS-CAMPUS-INDEX` | 30 | 30 | 0 | 0 | 20 | 10 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-HUB`｜`C-SUBPACKAGES-CAMPUS-CAMPUS-HUB` | 27 | 27 | 0 | 7 | 0 | 20 | 0 |
| `SUBPACKAGES-CIRCLES-CIRCLES-INDEX`｜`C-SUBPACKAGES-CIRCLES-CIRCLES-INDEX` | 25 | 25 | 0 | 10 | 0 | 15 | 0 |
| `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING`｜`C-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING` | 24 | 24 | 0 | 0 | 23 | 1 | 0 |
| `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS`｜`C-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS` | 20 | 20 | 0 | 8 | 0 | 12 | 0 |
| `PAGES-REGISTER-SUCCESS`｜`C-PAGES-REGISTER-SUCCESS` | 16 | 16 | 0 | 9 | 0 | 7 | 0 |
| **合计（24 套）** | 1107 | 1107 | 0 | 326 | 134 | 647 | 0 |
- CONSERVED ✔ 套件表行数合计 vs 在盘行数: 1107 = 1107 vs 全体 1107
- CONSERVED ✔ 套件表状态格合计 vs 在盘行数: 1107 = 1107 vs 全体 1107

## D. 失败分诊

- **本轮 sidecar（判红那份）**：`.zcode/tmp/report-emitter/triage-r7-at-report.md/.json`，退出码 2 —— 未归类行逐条列在文末失败清单。
- 来源：本次 sidecar，但**分诊台判红**（退出码 2），其数字不可用于通过率；权威件 `reports/audit/round-7/interact/exec-results.json` updatedAt=2026-09-26T08:49:54.056Z 行数=1107 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r7-at-report → TRIAGE_GATE=)

| 桶 | 条数 |
|---|---|
| `EXECUTED` | 326 |
| `SKIPPED-real-band` | 236 |
| `SKIPPED-vague-action` | 275 |
| `SKIPPED-vague-criterion` | 29 |
| `SKIPPED-deny-irreversible` | 21 |
| `SKIPPED-tap-target-absent-reststate` | 71 |
| `SKIPPED-tap-target-absent-unattributed` | 14 |
| `FAILED-landing-guard` | 134 |
| `other-fail` | 1 |
| （本轮词表内没有这种口径，故为 0 —— **不代表该类问题不存在**） | SKIPPED-not-automatable, SKIPPED-not-automatable-stamped, SKIPPED-observe-only-slice, SKIPPED-interact-reststate-absent, SKIPPED-interact-channel, SKIPPED-tap-probe-no-answer, SKIPPED-conservation-filler, SKIPPED-identity-scope, SKIPPED-left-page, SKIPPED-interact-off-page, SKIPPED-interact-not-issued, FAILED-guest-gate-by-ruling, FAILED-open-page-unmeasured, FAILED-open-page-measured-defect, SKIPPED-route-probe-no-answer, SKIPPED-frame-evidence-hole, locate-label, locate-label-token-lost, locate-selector, harness-api, timeout, auth-precondition |
- CONSERVED ✔ 分诊桶合计 vs 行数: 326 + 236 + 275 + 29 + 21 + 71 + 14 + 134 + 1 = 1107 vs 全体 1107
- ⚠ **兜底/未归类合计 = 2**（other-fail 1、工具自报 unclassified 1）：这些行的判据形态没被任何规则接住，必须逐条读原文，不许并进任何通过率。

### dist/src 四格（只对能恢复出查找目标的定位失败做双载体检；n=85）(源: .zcode/tmp/report-emitter/triage-r7-at-report.json → items[].verdict)

| 结论 | 条数 |
|---|---|
| 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） | 85 |
- CONSERVED ✔ 四格合计 vs 有查找目标的定位失败: 85 = 85 vs 全体 85
- 单字标签（从用例散文里抠出的残字，几乎必是规格噪声而非产品缺陷）：**0** (源: .zcode/tmp/report-emitter/triage-r7-at-report.json → items[].suspect)
- token-lost（执行器只留哨兵 `__CAND__`、没留要找的文案，事后无法复核）：**0** (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r7-at-report → locate-label-token-lost=)
- 动作发生时不在用例声明的页面上：**160**；`top=` 与 `route[]` 都读不到因而**判不了**：**0** (源: .zcode/tmp/report-emitter/triage-r7-at-report.json → items[].onTarget)
- observed 带 `MISMATCH!`（执行器自报前置身份/状态不符）：**0** (源: .zcode/tmp/report-emitter/triage-r7-at-report.json → items[].mismatch)
- CONSERVED ✔ 在目标页三态（是/否/判不了）vs 分诊条目: 621 + 160 + 0 = 781 vs 全体 781

## E. 证据可信度（两条规则并列展示，不合并、不互相替换）

- **用的是刚启动的干跑**（无 `--apply`，未写任何权威件）：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1` 退出码 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_CLASS=)
- 它读到的行数：1107（我这份快照 1107 行）；status 分布 {"EXECUTED":326,"SKIPPED":647,"FAILED":134}

| 分类（规则：先剥 `(123B)` / `(ERROR:…)` 尾注再看盘，再按 tier 配额判定） | 用例数 | 其中 EXECUTED |
|---|---|---|
| `CLEAN_EVIDENCE` | 87 | 87 |
| `TAINTED_BUT_FILE_PRESENT` | 0 | 0 |
| `NO_EVIDENCE_MISSING_FILE` | 0 | 0 |
| `NOT_A_FILE_REF` | 781 | 0 |
| `EXECUTED_WITHOUT_TIER_EVIDENCE` | 239 | 239 |
- CONSERVED ✔ 五类合计 vs 改判台行数: 87 + 0 + 0 + 781 + 239 = 1107 vs 全体 1107
- `RJ_SET_IDENTICAL`（与 192 那条门禁口径是否同一集合）：**1（同一）** (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_SET_IDENTICAL=)
- 门禁等价集=0 / 本工具污染全宇宙=0 / 只在本工具=0、只在门禁=0、交集=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_GATE_EQUIV_CASES=)
- 改判到 NO-EVIDENCE=239 条；EXECUTED 但 tier 交不齐=239 条；只有大小注记且文件确在=0 条；整行无像素引用=781 条 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_DOWNGRADE_TO_NO_EVIDENCE=)
- ⚠ `EXECUTED_WITHOUT_TIER_EVIDENCE=239`：这些"已执行"连 tier 要求的帧都没落盘。

### 本报告内独立复算（第二条规则：不看 tier 配额，只问『有没有一张像素帧真在盘上』）

- 规则：EXECUTED 行的 `evidence[]` 里，剥掉 `(123B)` 与 `(ERROR:…)` 尾注后**至少一条 .png 在盘且 size>0** (源: reports/audit/round-7/interact/exec-results.json → evidence[])
- 结果：**326 / 326** 条达标；其余 = 纯断链 0 条 + evidence[] 里根本没有 .png 引用 0 条
- CONSERVED ✔ 有图 / 断链 / 无 .png 引用 vs EXECUTED 行数: 326 + 0 + 0 = 326 vs 全体 326
- 修复后新字段 「missingEvidence[]」：1107 行带该字段（= 由修好的执行器写出的行），其中 0 行确有捕获失败记录 (源: reports/audit/round-7/interact/exec-results.json → missingEvidence[])
- 幻象路径余量：全库仍有 0 条 evidence[] 带 「(ERROR:…)」，其中新行内 0 条 (源: reports/audit/round-7/interact/exec-results.json → evidence[])
  判读：新行内应为 **0**（不为 0 就说明存在性校验没接上）；旧行的余量由改判台在步骤① 处理，不算本轮未修。

| 口径 | 规则 | 『干净』计数 | 用的行集 |
|---|---|---|---|
| 改判台 | 先剥尾注再看盘 **且** 按 tier 交齐（critical=2 帧 / normal=1 / navigation,noop=0） | CLEAN 87 条 EXECUTED（另有 TAINTED_BUT_FILE_PRESENT 0 条文件确在） | 它自己重读的 1107 行 |
| 本报告 | 至少 1 张 .png 在盘即算有像素证据（不看 tier 配额） | 326 条 EXECUTED | 我这份快照 326 条 EXECUTED |
- 两数不等是**规则不同**（tier 要 2 帧，本口径只要 1 帧），不是有一边算错；编排层已决定终报两条并列。

## F. 截图巡检（`reports/screenshots/round-6-tour/manifest-detail.json`）

- 载体头：gitSha=874ff52f workflowVersion=3.1 buildMode=build:mp-weixin:mock generatedAt=2026-09-25T09:24:49.921Z (源: reports/screenshots/round-6-tour/manifest-detail.json → gitSha)
- 帧数 shots = **263**，按 identity：A=133 / B=130 (源: reports/screenshots/round-6-tour/manifest-detail.json → shots[])
- failures = **46**，按 identity：A=21 / B=25 (源: reports/screenshots/round-6-tour/manifest-detail.json → failures[])
- stateNotApplied = **37**，按 `aliasLabel` 拆：`true`=24（同帧别名标签：把默认帧再标一次数据态/空态）/ `false`=13（状态真没打上去，需定向重截）/ 其他=0 (源: reports/screenshots/round-6-tour/manifest-detail.json → stateNotApplied[].aliasLabel)
- routeDrifts = **11**，按 identity：A=5 / B=6 (源: reports/screenshots/round-6-tour/manifest-detail.json → routeDrifts[])
- zoomFrames = **336**，按 identity：A=174 / B=162；另一处独立取数 `shots[].zoomCrops` 合计 336 (源: reports/screenshots/round-6-tour/manifest-detail.json → zoomFrames[])
- 工作树脏项（载体当时自报，与 A 节本次实测是不同时刻）：12 (源: reports/screenshots/round-6-tour/manifest-detail.json → gitWorktreeDirtyPaths)
- 采集限制（载体字段 `captureLimitations.screenshotDprSupported=false`）：截图不支持 DPR 参数，zoom 帧是 1x 原帧整数倍最近邻上采样，不产生新细节、不计状态配额 (源: reports/screenshots/round-6-tour/manifest-detail.json → captureLimitations)
- CONSERVED ✔ aliasLabel 拆项 vs stateNotApplied: 24 + 13 + 0 = 37 vs 全体 37
- CONSERVED ✔ stateNotApplied + 其它 failure vs failures 总数: 37 + 9 = 46 vs 全体 46
- CONSERVED ✔ identity 分组 vs shots 总数: 133 + 130 = 263 vs 全体 263
- CONSERVED ✔ zoomFrames vs shots[].zoomCrops（两处独立取数）: 336 = 336 vs 全体 336

## G. 真实模式（在盘载体 + 本次复跑的当前结论）

- 在盘载体 `reports/audit/real-e2e/GATES.json`（schemaVersion=gates-2 capturedAt=2026-09-26T20:07:24.251Z gitSha=e4495d67）：
  - G7_RESULT=PASS / G8_RESULT=PASS（环 10/10）/ G9_RESULT=PASS（ok=455/455）(源: reports/audit/real-e2e/GATES.json → G7_RESULT / G8_RESULT / G9_RESULT)
  - 前置件：scripts/qa/verify-backend-restarted.mjs → PASS（JVM pid 32156 起于 2026-09-26 21:32:46）(源: reports/audit/real-e2e/GATES.json → precondition.jvmPid)
  - G9 对照表四格（载体值）：{"在盘且200":455,"在盘但失败":0,"不在盘但200":0,"不在盘且失败":0} (源: reports/audit/real-e2e/GATES.json → detail.G9.controlTable)
  - 载体记的本轮新增库内主键：posts=276 comments=1244(源: reports/audit/real-e2e/GATES.json → newDbKeysThisRound)
  - undefined：**undefined** —— undefined
  > 载体是 **capturedAt 时刻**的（早于本轮重建与后端重启）；下栏是本工具此刻复跑得到的**当前**结论。两者不一致即"证据已过期"，两条都印、不取齐、不覆盖。

### 本次复跑（退出码即数据；非零不删报告，只记进失败清单）

| 件 | 命令行 | 退出码 | 关键计数（逐字取自其 stdout） |
|---|---|---|---|
| G7 产物自证 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe apps/client/scripts/build-real-isolated.mjs --check-only` | 0 | G7_RESULT=PASS；[g7] 产物自证 MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api；[g7] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real sharedOutUntouched=yes ｜**必须 node22**：v16 上它自报假 FAIL（实测） |
| G8 十环 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs` | 0 | G8_RESULT=PASS G8_RINGS_OK=10/10（解析到环 10 条）G8_ARTIFACTS=posts.id=285 ; comments.id=1251 ; campus_topics.id=312 ; campus_replies.id=44  ← 本轮写入的真实数据，未删除，交你决定去留 |
| G9 素材探针 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs` | 0 | G9_RESULT=PASS EXTRACTED=455 PROBED=455 OK=455 SKIPPED=0 FAIL=0；G9_CONTROL 在盘且200=455 在盘但失败=0 不在盘但200=0 不在盘且失败=0 |
| probe-real-env | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/probe-real-env.mjs` | 0 | PROBE_BACKEND=UP 可达=8/8 在盘=1440 VERDICT=READY |
- CONSERVED ✔ G9 ok+skipped+fail vs PROBED: 455 + 0 + 0 = 455 vs 全体 455
- CONSERVED ✔ G9 对照表四格 vs PROBED: 455 + 0 + 0 + 0 = 455 vs 全体 455 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs → G9_CONTROL=)
- CONSERVED ✔ G8 OK 环 + MISS 环 vs 环总数: 10 + 0 = 10 vs 全体 10

## H. 台账与门禁（本次复跑 vs 轮初基线）

- 基线只作叙事：`.zcode/tmp/round6-LEDGER.md` §1（**下面引用的每一个计数都来自本次复跑的门，没有一个数抄这张表**）(源: .zcode/tmp/round6-LEDGER.md → §1 表)

| 门禁 | 本次退出码 | 本次关键计数（逐字取自其 stdout） | 轮初基线（台账 §1 原文行） |
|---|---|---|---|
| `verify-ledger` | **0** | SOURCES=3 DISTINCT_IDS=439 MATRIX_IDS=1706 ORPHAN_TRUE=0 MULTI_ID_FAMILIES=29 → LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法 | 台账 §1 无此行（不猜） |
| `verify-state-truth` | **0** | CASE_SPREAD=0 FAIL_SPREAD=0 → STATE_RESULT=PASS（全局极差比的是 2 列同范围源；检查点按 subset-window 已做逐套包含核对） | 退出码 `1`：`/ verify-state-truth（round-2） / 1 / 四源 1107/941/922/940 → 用例极差 185；FAILED 289/282/288 → 极差 7；`checkpoint.failures[]` 恒空 /` |
| `verify-evidence-integrity（权威索引=本轮全部 corpus）` | **1** | SHOTS=642 MATCHED=642 MISSING=0 HASH_MISMATCH=0 ORPHANS=599 DUP_STATE=0 SNA改判=848 盘上仅算非证据=0；exec: 0 条 WITH_ERROR=0 伪造引用=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 退出码 `1`：`/ verify-evidence-integrity（round-2 manifest） / 1 / `MATCHED=254 MISSING=0 HASH_MISMATCH=0 ORPHANS=0 DUP_STATE_GROUPS=3` /` |
| `verify-evidence-corpus（全域）` | **1** | MANIFESTS=48 SCANNED=43 EXPIRED_GITSHA=43 PROBLEMS=1 → CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA） | 退出码 `1`：`/ verify-evidence-corpus / 1 / 5/5 份 manifest gitSha ≠ HEAD；round-1 的 305+305 帧无 contentHash /` |
| `verify-provenance-all（全域）` | **1** | FRAMES_CONSISTENT=4144 PRE_STAMP=4867 STALE=0 UNDATED=0 无戳=0 约定前历史清单=1（其帧不计入时间轴判决：LEGACY_FRAMES=144） PROV_FRAME_ACCOUNTING in=9155 out=9155 OK PRODUCERS=12 LITERAL_SHA=1 → PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论） | 退出码 `1`：`/ verify-provenance-all（本轮新建） / 1 / 帧侧 0 伪造 / 0 过期戳记（1118 张时间轴相符）；生产者侧 3 处字面量 SHA /` |
| `verify-evidence-corpus（本轮 scope）` | **0** | MANIFESTS=37 SCANNED=32 PROBLEMS=0 → CORPUS_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-provenance-all（本轮 scope）` | **1** | FRAMES_CONSISTENT=2127 UNDATED=0 约定前历史清单=0 LEGACY_FRAMES=0 PROV_FRAME_ACCOUNTING in=6994 out=6994 OK → PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论） | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --check` | **1** | STAMP_OPS=reports/audit/round-6/ops files=24 cases=1107 canon=4c37cb2e56c2 戳记=dc3f93f47e56 记于=2026-09-27T11:13:56.918Z gitSha=e4495d67 当前gitSha=6fd15178 → STAMP_RESULT=FAIL 漂移文件=9（同轮内语料被改过 ⇒ 早跑的腿与晚跑的腿判的不是同一版正文，须重跑或按改动点定向复测） | 台账 §1 无此行（不猜） |
| `verify-case-selectors-exist（mock 档）` | **0** | SEL cases=1107 selectors=1392 页内精确=903 页内文本(条件类名)=282 别处 wxml=200 运行期拼名=0 只在样式=1 全无=6 守恒=yes → SEL_RESULT=PASS 执行器要点的选择器全部在被测档里有对应元素（另有 7 条只提示：文案提及或幽灵入口断言，不构成点不动） | 台账 §1 无此行（不猜） |
| `verify-case-selectors-exist（real 档）` | **0** | SEL cases=1107 selectors=1392 页内精确=903 页内文本(条件类名)=282 别处 wxml=200 运行期拼名=0 只在样式=1 全无=6 守恒=yes → SEL_RESULT=PASS 执行器要点的选择器全部在被测档里有对应元素（另有 7 条只提示：文案提及或幽灵入口断言，不构成点不动） | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --copy reports/audit/round-7/ops` | **1** | STAMP_COPY=reports/audit/round-7/ops files=24 cases=1107 canon=4c37cb2e56c2 戳=dc3f93f47e56 目录级一致=no 差异行=9 → STAMP_RESULT=FAIL 副本与戳不符（9 处）⇒ 这份副本不能当本轮语料引用 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-carryover.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-carryover.json 执行腿=1 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-final.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-final.json 执行腿=3 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-final2.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-final2.json 执行腿=3 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage4.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage4.json 执行腿=4 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage4tail.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage4tail.json 执行腿=4 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage4tail4.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage4tail4.json 执行腿=3 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage5.json` | **2** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage5.json 执行腿=0 不同语料目录=0 → STAMP_RESULT=NA reason=本波无读语料的腿（7 条腿已逐条点名，判据版本不由这一波决定 ⇒ 不记 PASS） | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage6.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage6.json 执行腿=8 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage6b.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage6b.json 执行腿=5 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-stage7.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7-stage7.json 执行腿=6 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7-tour.json` | **2** | STAMP_QUEUE=scripts/qa/ui-queue.round7-tour.json 执行腿=0 不同语料目录=0 → STAMP_RESULT=NA reason=本波无读语料的腿（6 条腿已逐条点名，判据版本不由这一波决定 ⇒ 不记 PASS） | 台账 §1 无此行（不猜） |
| `verify-ops-corpus-stamp --queue ui-queue.round7b-stage7.json` | **0** | STAMP_QUEUE=scripts/qa/ui-queue.round7b-stage7.json 执行腿=3 不同语料目录=1 → STAMP_RESULT=PASS 队列执行腿语料目录唯一 | 台账 §1 无此行（不猜） |
| `本轮队列计划选择集（scripts/qa/ui-queue.*.json 按轮号取集=否决轴）` | **0** | QUEUE_PLAN_AXIS round=7 选择式=^ui-queue\.round-?7[a-z]*-.*\.json$ 命中=12 盘上队列计划=31 本轮执行载体=30 轮号分布[(无轮次号)=3 round-7=12 round-8=16] → QUEUE_PLAN_AXIS=PASS（命中>0 ⇒ 上面那些 --queue 腿确实扫的是本轮计划） | 台账 §1 无此行（不猜） |
| `verify-status-vs-disposition` | **0** | DISPO rows=236 矛盾=11（第 6 列说已到终态、处置/证据列仍写欠款）模式=advisory（只提示） → DISPO_RESULT=ADVISORY 有 11 行自相矛盾：第 6 列会被下一轮当结案读，处置列却说还欠东西。逐条归置（把欠款挂进取景配方/登记表，或把第 6 列改成真实状态），不许反过来改措辞。 | 台账 §1 无此行（不猜） |
| `台账状态列 vs 处置列自相矛盾条数（verify-status-vs-disposition 的 矛盾= 字段=否决轴）` | **1** | DISPO_AXIS rows=236 clashes=11 门模式=advisory 门自身判决=ADVISORY(退出码 0) → DISPO_AXIS=FAIL（11 行未归置 ⇒ 计入「本次仍判红」） | 台账 §1 无此行（不猜） |
- 措辞与状态不一致：`MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-002 [已修复] 标记=本轮未动 在=处置`
- 措辞与状态不一致：`MP-R7CLIENT-UPLOAD-EXT-001 [已修复] 标记=仍欠 在=处置`
- 措辞与状态不一致：`MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001 [已修复] 标记=状态停在 在=处置`
- 措辞与状态不一致：`MP-R2-PAGES-REGISTER-INDEX-009 [已修复] 标记=需人复验 在=处置`
- 措辞与状态不一致：`MP-R2-CAMPUSPOST-010 [已修复] 标记=待复验 在=处置`
- 措辞与状态不一致：`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-001 [已修复] 标记=需人复验 在=处置`
- 措辞与状态不一致：`MP-R2-PAGES-MESSAGES-INDEX-021 [已修复] 标记=需人复验 在=处置`
- 措辞与状态不一致：`MP-R2-CAMPUS-HUB-012 [已修复] 标记=需人复验 在=处置`
- 措辞与状态不一致：`MP-R2-PAGES-NEARBY-INDEX-011 [并入-不另立案] 标记=需人复验 在=处置`
- 措辞与状态不一致：`MP-R2-PAGES-HOME-INDEX-102 [并入-不另立案] 标记=需人复验 在=处置`
- 措辞与状态不一致：`MP-R2-PAGES-HOME-INDEX-103 [并入-不另立案] 标记=待复验 在=处置`
| `verify-criteria-frame-debt（判据台每一条欠帧有没有会被拍的去处 + frame 路径是否真在盘上）` | **0** | CRITFRAME items=116 判决分布=NEEDS_UI_FRAME=68 ARTIFACT_VERIFIED=28 UNDECIDABLE=19 SOURCE_ONLY=1 CRITFRAME 欠帧=68 有去向=68 无去向=0｜frame 路径写死但不存在的=0（其中计划内 SHOOT 却没落盘=0） CRITFRAME_CONSERVATION need=68 = 有去向 68 + 无去向 0 OK → CRITFRAME_RESULT=PASS 判据台的每一条欠帧都有会被拍的去处，且写过的帧路径都在盘上 | 台账 §1 无此行（不猜） |
| `verify-tab-bar-single-source（④：面板字面量相加 == --tab-bar-total-h 的静态核对）` | **0** | TABBARSRC token=184rpx+2env（calc(184rpx + env(safe-area-inset-bottom) + env(safe-area-inset-bottom))） TABBARSRC face=184rpx+2env（height=calc(160rpx + env(safe-area-inset-bottom)) padding-bottom=calc(env(safe-area-inset-bottom) + 24rpx)） → TABBARSRC_RESULT=PASS 面板字面量相加==token ⇒ 单点化按 (b) 口径成立 | 台账 §1 无此行（不猜） |
| `probe-ws-cli-exclusion（租约层的 WS⊥CLI 探针，空白锁目录）` | **0** | EXCL_PROBE 断言=全过 scratch=C:\Users\dsghy\AppData\Local\Temp\ws-cli-excl-T8EN9v → WSX_EXCL_RESULT=PASS（机制层互斥成立；真 IDE 那一半仍未测） | 台账 §1 无此行（不猜） |
| `verify-source-shape（判点本体是否还在盘上成立）` | **0** | SRC_SHAPE total=91 成立=91 不成立=0 补丁=182（守恒：yes） SRC_SHAPE_DUP 条目=91 带id=91 无id=0 唯一id=88 重复=3（MP-R2-PROFILE-034×2 MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001×2 MP-R2VIS-PAGES-HOME-INDEX-004×2） → SRC_SHAPE_RESULT=OK | 台账 §1 无此行（不猜） |
| `apply-ops-cellplans --dry（手写计划还能不能落进判据台）` | **0** | OPSCELL 计划=4 份｜A 组=21 行｜B 组=22 行｜其中已落地=43 待改=0｜拒绝=0 (没有守恒行 ⇒ 多半是全部幂等跳过) → OPSCELL_RESULT=PASS 计划 43 行全部已在正文里，本轮无需改动（幂等复跑） | 台账 §1 无此行（不猜） |
| `verify-frame-debt-coverage` | **0** | FRAMECOV open=17 A配方SHOOT=9 B归置表=2 C显式登记=6 在配方但非SHOOT=0 裸行=0 FRAMECOV_CONSERVATION in=17 out=17 OK → FRAMECOV_RESULT=PASS 每条未收口行都有去向 | 台账 §1 无此行（不猜） |
| `probe-admin-post-counts（RING6 计数字段两侧一致）` | **0** | PROBE_ADMISIBLE=4/4 PROBE_VERDICT=COUNTS_PRESENT（后台读侧视图的计数字段：PRESENT=两侧可对照，ABSENT=运行态确实没有 ⇒ 与源码不符就是「重启未做」） → PROBE_RESULT=OK verdict=COUNTS_PRESENT | 台账 §1 无此行（不猜） |
| `verify-rulings-landed` | **0** | 四项=4 已落地=4 未落地=0（数取自门自己的统计行，不数打印行数——它的未落地标记是 ✗ 而不是 miss，数行会永远得 0） → RULINGS_RESULT=PASS ④ 四项都有可重跑判据背书 | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-guest-real，其同字节组=否决轴）` | **1** | SHOTS=434 DUP_STATE=73 DUP帧=391 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-mock-tour-1a1df78b，其同字节组=否决轴）` | **0** | SHOTS=77 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-real-exec，其同字节组=否决轴）` | **1** | SHOTS=169 DUP_STATE=36 DUP帧=105 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-real-tour，其同字节组=否决轴）` | **0** | SHOTS=18 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-real-tour-full，其同字节组=否决轴）` | **0** | SHOTS=77 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-stage8b-tour-B-real，其同字节组=否决轴）` | **0** | SHOTS=0 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states，其同字节组=否决轴）` | **1** | SHOTS=18 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=11 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-fix2，其同字节组=否决轴）` | **1** | SHOTS=4 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=4 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot，其同字节组=否决轴）` | **1** | SHOTS=2 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot2，其同字节组=否决轴）` | **1** | SHOTS=1 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot3，其同字节组=否决轴）` | **1** | SHOTS=1 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot4，其同字节组=否决轴）` | **1** | SHOTS=1 DUP_STATE=0 DUP帧=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-tap3，其同字节组=否决轴）` | **1** | SHOTS=646 DUP_STATE=113 DUP帧=558 SNA改判=0 MISSING=0 ORPHANS=4 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-uidebt-1a1df78b，其同字节组=否决轴）` | **1** | SHOTS=37 DUP_STATE=6 DUP帧=17 SNA改判=5 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）` | **1** | RAW_DUP_AXIS legs=14 legs_with_dup=4 DUP_STATE_GROUPS=228 DUP_STATE_FRAMES=1071 其它(断链+哈希+孤儿,仅打印)=24 → RAW_DUP_AXIS=FAIL（组数非零 ⇒ 这条进取决集） | 台账 §1 无此行（不猜） |
| `verify-queue-reconcile` | **0** | GAP=0 NEVER_RAN=0套/0例 ERR_TAINTED=0 → QUEUE_RESULT=PASS | 退出码 `1`：`/ verify-queue-reconcile（round-2, --allow-unlabeled） / 1 / 计划 1107/24 套 · 记录 941/21 套 · 缺口 166 · 从未开跑 3 套 116 例 · 重复 id 组 30 · 错误污染 373 例 /` |
| `verify-backend-restarted` | **0** | JVM pid=32156 startedAt=2026-09-26 21:32:46 STALE_SOURCE=none  HEAD_NEWER_THAN_JVM=no  APPS_API_CLEAN_VS_HEAD=yes → PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提 | 退出码 `0`：`/ verify-backend-restarted / 0 / JVM pid 11800 起于 11:37:11，晚于全部 java 源码与 HEAD /` |
| `probe-real-env` | **0** | BACKEND=UP REACHABLE=8/8 → READY | 退出码 `0`：`/ probe-real-env / 0 / `PROBE_BACKEND=UP`、素材 8/8 可达、`PROBE_VERDICT=READY` /` |
| `verify-i18n-orphan` | **0** | ZH=4173 EN=4173 PAIR_DIFF=0+0 ORPHANS=1257/允许1257 → I18N_RESULT=PASS | 台账 §1 无此行（不猜） |
- **本次仍判红：8 / 33** —— `verify-evidence-integrity（权威索引=本轮全部 corpus）`(1) `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`(1) `verify-provenance-all（本轮 scope）`(1) `verify-ops-corpus-stamp --check`(1) `verify-ops-corpus-stamp --copy reports/audit/round-7/ops`(1) `verify-ops-corpus-stamp --queue ui-queue.round7-stage5.json`(2) `verify-ops-corpus-stamp --queue ui-queue.round7-tour.json`(2) `台账状态列 vs 处置列自相矛盾条数（verify-status-vs-disposition 的 矛盾= 字段=否决轴）`(1)
- **同字节状态组（逐 corpus 原始记录·否决轴）：228 组 / 1071 帧，分布在 4/14 份 corpus** —— 本轴非零 ⇒ 已计入「本次仍判红」分母（面板成员 `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`，退出码 1；本轮 G6 不得记 PASS）；口径（也是这条轴的**可见边界**，别读成全域）：组键 = identity|页(page 或 route)|contentHash，只在`reports/screenshots/round-7-*` 里**有 `manifest-detail.json` 的 corpus**上量（本轮 14 份），逐 corpus 各算各的、跨 corpus 同字节不并组；同名但没有 manifest-detail.json 的 corpus、以及历史轮与权威索引之外的帧**不在本轴视野内** —— 按帧去重的全树普查口径要另跑（.zcode/tmp/gap-dupframes/dup-dedup.mjs），两个口径不可直接相减
- **本轮队列计划（ops 语料同源性轴）：命中 12 / 盘上 31 份 `scripts/qa/ui-queue.*.json`** —— 选择式 `^ui-queue\.round-?7[a-z]*-.*\.json$`，按轮号分布 (无轮次号)=3 round-7=12 round-8=16；逐份点名：`ui-queue.round7-carryover.json` `ui-queue.round7-final.json` `ui-queue.round7-final2.json` `ui-queue.round7-stage4.json` `ui-queue.round7-stage4tail.json` `ui-queue.round7-stage4tail4.json` `ui-queue.round7-stage5.json` `ui-queue.round7-stage6.json` `ui-queue.round7-stage6b.json` `ui-queue.round7-stage7.json` `ui-queue.round7-tour.json` `ui-queue.round7b-stage7.json`（每份各起一条 `verify-ops-corpus-stamp --queue` 腿，见 H 节）
- **台账状态列/处置列自相矛盾条数（否决轴）：11 行 / 台账 236 行**（第 6 列已到终态、处置/证据列仍写欠款） —— 本轴非零 ⇒ 已计入「本次仍判红」分母（面板成员 `台账状态列 vs 处置列自相矛盾条数（verify-status-vs-disposition 的 矛盾= 字段=否决轴）`，退出码 1）。归置只有两条路：把欠款挂进取景配方/登记表，或把第 6 列改成真实状态（现成载具 `scripts/qa/emit-dispo-open-cellplan.mjs` → `merge-cellplans --apply`）；**条数归零才算结案**，"给洞起了名字"不算（BOOKED≠DONE，与 verify-evidence-holes 同一条纪律）；这几行确实在等裁定，所以本轴的用途是让裁定欠账留在分母里，而不是让收尾 abort —— 它进面板、不进 ERRORS；门自身模式=advisory，其退出码 0 **不进取决集**（advisory 的 0 与 strict 的 1 表达的是它对散文列的否决意愿，不是条数）
  - 同字节组明细：`round-7-guest-real guest|pages/discover/index 的 8 个“不同状态”字节完全相同：DC01 Idle,DC02 影响范围回归,DC03 分段切换「推荐↔附近」,DC04 附近模式空结果,DC05 影响范围回归,DC06 影响范围回归,DC07 卡片点击 → 他人主页,DC09 左滑「跳过」`
  - 同字节组明细：`round-7-guest-real guest|pages/discover/index 的 9 个“不同状态”字节完全相同：DC10 快速连点「喜欢」×5,DC12 「打招呼」同目标 3 次/日频控 + 第 4 次拦截且不,DC13 每日额度用尽,DC14 未登录游客,DC15 实名认证门,DC17 Loading 与 Error 横幅,DC18 错误横幅的存活期,DC19 筛选抽屉开启,DC20 抽屉三路关闭`
  - 同字节组明细：`round-7-guest-real guest|pages/discover/index 的 5 个“不同状态”字节完全相同：DC21 抽屉基础/高级 Tab 切换与 draft 隔离,DC24 籍贯省/市联动 picker 与未来城市 picker,DC26 「确认」应用筛选与「重置」清空（表单三态,DC28 筛选钮与分段热区实测（72rpx < 88rpx 铁律）,DC30 底部登录提示胶囊与 tabBar 浮岛避让（MP-R2-`
  - 同字节组明细：`round-7-guest-real guest|pages/discover/index 的 5 个“不同状态”字节完全相同：DC32 进入匹配页的参数与返回态,DC34 打开即返回,DC35 连续滑动 5 张,DC36 无照片用户卡片兜底与头像兜底链（数据维极值）,DC39 七态齐备`
  - 同字节组明细：`round-7-guest-real guest|pages/discover/index 的 4 个“不同状态”字节完全相同：DC41 Tab 切换往返 2 步内回 Tab 与状态恢复,DC42 与「我的」页匹配次数 chip 的同源一致性（跨页数据核,DC44 影响范围改动,DC45 影响范围改动`
  - 同字节组明细：`round-7-guest-real guest|pages/home/index 的 8 个“不同状态”字节完全相同：H01 Idle,H04 影响范围回归,H05 onShow 30s 陈旧阈值,H06 顶栏「我的」头像入口 → 我的 Tab,H07 顶栏定位胶囊 → 弹出「我的位置」底部弹层并自动重取定位,H08 弹层三路关闭,H09 弹层「重新定位」在途态与终态,H10 弹层 hero「进入位置主页」→ 位置子页且弹层先关`
  - 同字节组明细：`round-7-real-exec A|pages/home/index 的 4 个“不同状态”字节完全相同：「喜欢」快速连点×5：客户端请求数与服务端落库数分开判,「换一位」成功链路 + 连点×5 单请求（MP-R2-HOME-003 防重入回归）,「加入」按钮：成功翻转 + 人数同步 + toast,「加入」连点×5：客户端 1 次请求与服务端 1 条成员记录分开判`
  - 同字节组明细：`round-7-real-exec A|pages/nearby/index 的 2 个“不同状态”字节完全相同：帖子点赞：客户端请求数与服务端落库数分开判 + 失败 toast,作者「关注」芯片：乐观更新+回滚、不冒泡、且游客不得直接 like/建会话`
  - 同字节组明细：`round-7-real-exec A|pages/profile/index 的 2 个“不同状态”字节完全相同：onShow 轻量刷新：取消喜欢/新增互赞后回页即时同步,头像上传（相册）：隐私授权 + chooseImage + 连点×5 单请求双口径`
  - 同字节组明细：`round-7-real-exec A|pages/profile/index 的 2 个“不同状态”字节完全相同：背景图编辑：两处入口同 handler + 上传中蒙层与进度终态,邀请好友弹窗三态（Loading / Error+重试 / Success）与 mock 分支差异`
  - 同字节组明细：`round-7-real-exec A|pages/register/index 的 2 个“不同状态”字节完全相同：验证码按钮快速连点×5：客户端多余请求计数与服务端发送条数分开判定（防幂等假通过）,主按钮连点×5（合法表单）：客户端守卫与服务端落库条数分开判定（防幂等假通过）`
  - 同字节组明细：`round-7-real-exec A|subpackages/campus/campus/hub 的 2 个“不同状态”字节完全相同：REAL_ONLY 已认证视角：header/引导卡变「已认证」徽章、本校卡出现且推荐列表排除本校,REAL_ONLY 本校卡「进入」→ campus/index 私域视角（分类 Tab + 发布 FAB，无公开浏览 banner）`
  - …明细另有 12 行未打印（报告侧上限 12 行）
  - 另有 204 组连门禁自己都没打出来（它每条 leg 只打前 6 组）⇒ 本报告的明细**不是全量**，组数/帧数才是全量；取全量对该 leg 加 `--json <out>` 读 `dupState[]`
- 轮初基线里退出码=1 的行数（从台账 §1 原文**数出来**的，不是记忆）：**8** (源: .zcode/tmp/round6-LEDGER.md → §1 退出码列)
- 口径注：门禁面板里的 corpus/provenance 是**本轮 scope** 版（reports/audit/round-7,reports/screenshots/round-7-A-mock-final,reports/screenshots/round-7-A-real,reports/screenshots/round-7-A-real-only,reports/screenshots/round-7-exec,reports/screenshots/round-7-exec-04e00747,reports/screenshots/round-7-exec-086b54f8,reports/screenshots/round-7-exec-1f8331b0,reports/screenshots/round-7-exec-271310bc,reports/screenshots/round-7-exec-6d3f71f5,reports/screenshots/round-7-exec-a1cbb0cb,reports/screenshots/round-7-exec-d77813f8,reports/screenshots/round-7-exec-fc13948f,reports/screenshots/round-7-final-A-mock,reports/screenshots/round-7-final-A-real,reports/screenshots/round-7-final-guest-mock,reports/screenshots/round-7-final-guest-real,reports/screenshots/round-7-guest-real,reports/screenshots/round-7-guest-real-final,reports/screenshots/round-7-guest-real-only,reports/screenshots/round-7-guest1,reports/screenshots/round-7-mock-tour-1a1df78b,reports/screenshots/round-7-probe-quiet,reports/screenshots/round-7-r8-A-login,reports/screenshots/round-7-r8-guest-login,reports/screenshots/round-7-r8-guest-real-login,reports/screenshots/round-7-r8e-A-showcase,reports/screenshots/round-7-r8e-framedebt,reports/screenshots/round-7-r8e-guest-real-close,reports/screenshots/round-7-r8f-reshoot,reports/screenshots/round-7-r8g-guestreshoot,reports/screenshots/round-7-r8h-lasttwo,reports/screenshots/round-7-real-exec,reports/screenshots/round-7-real-guest,reports/screenshots/round-7-real-taps,reports/screenshots/round-7-real-taps2,reports/screenshots/round-7-real-tour,reports/screenshots/round-7-real-tour-full,reports/screenshots/round-7-realguest,reports/screenshots/round-7-realtaps,reports/screenshots/round-7-showcase,reports/screenshots/round-7-stage7-A-mock,reports/screenshots/round-7-stage7-A-real,reports/screenshots/round-7-stage7-a-real-frames,reports/screenshots/round-7-stage7-guest-real,reports/screenshots/round-7-stage7-guest-real-frames,reports/screenshots/round-7-stage7-mock,reports/screenshots/round-7-stage8b-tour-B-real,reports/screenshots/round-7-states,reports/screenshots/round-7-states-fix1,reports/screenshots/round-7-states-fix2,reports/screenshots/round-7-states-pilot,reports/screenshots/round-7-states-pilot2,reports/screenshots/round-7-states-pilot3,reports/screenshots/round-7-states-pilot4,reports/screenshots/round-7-tap-final,reports/screenshots/round-7-tap-mock,reports/screenshots/round-7-tap-mock2,reports/screenshots/round-7-tap2,reports/screenshots/round-7-tap3,reports/screenshots/round-7-taps,reports/screenshots/round-7-uidebt-1a1df78b,reports/screenshots/round-7-uidebt-final,reports/screenshots/round-7-uidebt-guest-8df4de49,reports/screenshots/round-7-uidebt-guest2-8df4de49,reports/screenshots/round-7-uidebt-txt-d99f3a1f,reports/screenshots/round-7-uidebt-ws-8df4de49,reports/screenshots/round-7-uidebt-wsl2-8df4de49,reports/screenshots/round-7-uidebt-wsl3-8df4de49）；全域版同表打印但只作历史口径（与轮初基线可比的是全域版，能否决本轮收尾的是 scope 版）。integrity 分两类：**权威索引轴**（`reports/audit/round-7/screenshot-manifest.json`，由 scripts/qa/rebuild-frozen-manifest.mjs 从各 corpus 派生）进取决集，逐 corpus 的**原始记录轴**里只有「同字节状态组数」这一项被提到否决轴（汇总成面板成员 `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`：非零 ⇒ 「本次仍判红」+1 ⇒ 收尾不得记 G6 PASS；本轮实测它挡住的正是索引那条因 stateNotApplied[] 搬运而恒为 0 的那一类洞）；同一条 leg 的断链/哈希不符/孤儿**仍是信息轴**（权威索引轴已为这三项握着否决权，重复计同一个洞只会让面板数字失真），它们与每组明细一起进"一条不藏"那一节；原始 corpus 是采集时刻的原始记录、不改写也不删；`--exec` 分支的否决权本轮收窄为「只否决伪造」=证据里写了图片路径、既无 ERROR/timeout 注记、盘上又不存在，自报失败的注记条目不再计红（tier 交不齐由 readjudicate-evidence/verify-queue-reconcile 记账），这条改动有配对自检 scripts/qa/test-evidence-fabrication.cjs（含反向对照）；ledger/state-truth 限定 `reports/audit/round-7`；i18n 的孤儿走棘轮（配对差异一律判红，基线与理由见 scripts/qa/verify-i18n-orphan.mjs 顶部与台账 §74）。

## I. 本轮新立 / 新证缺陷（全部从门与判据的输出派生，不手写）

- G8 本次 10 环全 OK（本节未从 G8 派生出新缺陷）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs → G8_RINGS_OK=)
- **[D-LEDGER]** LEDGER_MULTI_ID_FAMILIES=29（同一缺陷多 ID 的族数，>0 就说明台账没收敛） (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6 → LEDGER_MULTI_ID_FAMILIES=)

## I-bis. 修复波逐项判据（静态侧终态，逐条来自 verdicts 件而非台账自述）

- 来源：`.zcode/tmp/fixverify/verdicts.json`（sha8=`60d70376`，items=116）；桶合计 116 ✔ 守恒
- 台账状态侧：本轮判据覆盖的条目里，仍写「待修复」**6** 条、已推「已修复待复验」**19** 条。
- 判据侧五桶：
  - **ARTIFACT_VERIFIED = 28**
  - **SOURCE_ONLY = 1**
  - **NEEDS_UI_FRAME = 68**
  - **NOT_IN_EITHER = 0**
  - **UNDECIDABLE = 19**
- 桶语义（写死在这里，避免下一轮重新解释）：
  - `ARTIFACT_VERIFIED`＝修后状态在**被测产物**里命中，且该判点在修复前的 HEAD 里不存在（工具的 `grantingPredatesFix` 对照通过）；
  - `SOURCE_ONLY`＝只在源码树命中，产物是构建早于改动的旧件；**这条分支本轮起也过 HEAD 对照**，
    因为旧实现只对授绿路径做对照，会把 HEAD 里本来就有的老代码判成「本轮改的」（实测拦下 2 条假推进，见台账 §47）；
  - `NEEDS_UI_FRAME`＝静态两载体都判不了行为/观感，必须等定向重截帧；
  - `NOT_IN_EITHER`＝两载体都查不到预期修后状态（疑似未落地，逐条附检索串）；
  - `UNDECIDABLE`＝台账判据本身含糊（抠不出可比对物件、或只抠到会被构建改名的裸标识符）。
- `NOT_IN_EITHER` 逐条点名（0 条，一条都不并拢）：
- 状态与判据相互打脸的条数：**0**（台账仍写待修复、判据却已在载体命中且非 HEAD 既存）。本轮已按 §47 批量推进并复核，无残留。
- 反向不一致：**0** 条台账已推「已修复待复验」而判据台仍判 `NOT_IN_EITHER`：

## J. 缺口 / 未判定 / 挂起（上面所有『判不了』归拢，一条不藏）

- 覆盖缺口：0 套 / 0 例从未开跑，GAP=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_NEVER_RAN_CASES=)
- 半途套件：0 个 `status=running`（其已记行数见 C 节套件表）(源: tmp/qa/checkpoints/exec-R7.json → suites[].status)
- 205 行跨边界被就地改写 —— 同一用例在两个被测物上各记一次，后写覆盖前写，A 侧该项已非冻结构建产物
- 13 个状态帧未真正应用状态（aliasLabel=false） —— 该状态没有独立像素证据，只有默认帧
- 11 条 routeDrift（落点非目标页） —— 巡检自报落点在别的页，那些帧不能证明目标页
- 真实模式：undefined —— undefined
- verify-evidence-integrity（原始 corpus：round-7-guest-real，其同字节组=否决轴） —— 同页同身份却同字节的帧仍在原始记录里：73 组 / 391 帧 —— 这 73 组的**组数已进取决集**（汇总成面板成员 `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`，非零就让「本次仍判红」+1）；这条 leg 的整条退出码仍不进取决集（它还混着断链/孤儿，那两项由权威索引轴与 corpus/provenance 两把门记账）。结案条件：该 corpus 重拍到组数归零 —— 由权威索引把同字节帧搬进 stateNotApplied[] **不算结案**（换载体≠两个状态真有了区别）
- verify-evidence-integrity（原始 corpus：round-7-guest-real，其同字节组=否决轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-real-exec，其同字节组=否决轴） —— 同页同身份却同字节的帧仍在原始记录里：36 组 / 105 帧 —— 这 36 组的**组数已进取决集**（汇总成面板成员 `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`，非零就让「本次仍判红」+1）；这条 leg 的整条退出码仍不进取决集（它还混着断链/孤儿，那两项由权威索引轴与 corpus/provenance 两把门记账）。结案条件：该 corpus 重拍到组数归零 —— 由权威索引把同字节帧搬进 stateNotApplied[] **不算结案**（换载体≠两个状态真有了区别）
- verify-evidence-integrity（原始 corpus：round-7-states，其同字节组=否决轴） —— 原始 corpus 有 11 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-fix2，其同字节组=否决轴） —— 原始 corpus 有 4 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot，其同字节组=否决轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot2，其同字节组=否决轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot3，其同字节组=否决轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot4，其同字节组=否决轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-tap3，其同字节组=否决轴） —— 同页同身份却同字节的帧仍在原始记录里：113 组 / 558 帧 —— 这 113 组的**组数已进取决集**（汇总成面板成员 `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`，非零就让「本次仍判红」+1）；这条 leg 的整条退出码仍不进取决集（它还混着断链/孤儿，那两项由权威索引轴与 corpus/provenance 两把门记账）。结案条件：该 corpus 重拍到组数归零 —— 由权威索引把同字节帧搬进 stateNotApplied[] **不算结案**（换载体≠两个状态真有了区别）
- verify-evidence-integrity（原始 corpus：round-7-tap3，其同字节组=否决轴） —— 原始 corpus 有 4 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-uidebt-1a1df78b，其同字节组=否决轴） —— 同页同身份却同字节的帧仍在原始记录里：6 组 / 17 帧 —— 这 6 组的**组数已进取决集**（汇总成面板成员 `verify-evidence-integrity（逐 corpus 同字节状态组=否决轴）`，非零就让「本次仍判红」+1）；这条 leg 的整条退出码仍不进取决集（它还混着断链/孤儿，那两项由权威索引轴与 corpus/provenance 两把门记账）。结案条件：该 corpus 重拍到组数归零 —— 由权威索引把同字节帧搬进 stateNotApplied[] **不算结案**（换载体≠两个状态真有了区别）
- 门禁 verify-evidence-integrity（权威索引=本轮全部 corpus） —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-evidence-integrity（逐 corpus 同字节状态组=否决轴） —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-provenance-all（本轮 scope） —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-ops-corpus-stamp --check —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-ops-corpus-stamp --copy reports/audit/round-7/ops —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-ops-corpus-stamp --queue ui-queue.round7-stage5.json —— 本次退出码 2（禁止静默收尾）
- 门禁 verify-ops-corpus-stamp --queue ui-queue.round7-tour.json —— 本次退出码 2（禁止静默收尾）
- 门禁 台账状态列 vs 处置列自相矛盾条数（verify-status-vs-disposition 的 矛盾= 字段=否决轴） —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-evidence-corpus（全域） —— 本次退出码 1 —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用
- 门禁 verify-provenance-all（全域） —— 本次退出码 1 —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用

## 附 1：守恒核对全表（报告里每一条桶分解）

| 分解 | 各项 | 合计 | 全体 | 结论 |
|---|---|---|---|---|
| 计划 − 记录 vs GAP | 1107 + 0 | 1107 | 1107 | CONSERVED ✔ |
| status 分布 vs 检查点 suites | 24 | 24 | 24 | CONSERVED ✔ |
| 已认领 + 从未开跑 vs 计划套件 | 24 + 0 | 24 | 24 | CONSERVED ✔ |
| A 侧 + B 侧 vs 在盘行数 | 1107 + 0 | 1107 | 1107 | CONSERVED ✔ |
| A 侧三态 vs A 侧行数 | 326 + 134 + 647 + 0 | 1107 | 1107 | CONSERVED ✔ |
| B 侧三态 vs B 侧行数 | 0 + 0 + 0 + 0 | 0 | 0 | CONSERVED ✔ |
| 快照中已从在盘消失的行（应为 0） | 0 | 0 | 0 | CONSERVED ✔ |
| 套件表行数合计 vs 在盘行数 | 1107 | 1107 | 1107 | CONSERVED ✔ |
| 套件表状态格合计 vs 在盘行数 | 1107 | 1107 | 1107 | CONSERVED ✔ |
| 分诊桶合计 vs 行数 | 326 + 236 + 275 + 29 + 21 + 71 + 14 + 134 + 1 | 1107 | 1107 | CONSERVED ✔ |
| 四格合计 vs 有查找目标的定位失败 | 85 | 85 | 85 | CONSERVED ✔ |
| 在目标页三态（是/否/判不了）vs 分诊条目 | 621 + 160 + 0 | 781 | 781 | CONSERVED ✔ |
| 五类合计 vs 改判台行数 | 87 + 0 + 0 + 781 + 239 | 1107 | 1107 | CONSERVED ✔ |
| 有图 / 断链 / 无 .png 引用 vs EXECUTED 行数 | 326 + 0 + 0 | 326 | 326 | CONSERVED ✔ |
| aliasLabel 拆项 vs stateNotApplied | 24 + 13 + 0 | 37 | 37 | CONSERVED ✔ |
| stateNotApplied + 其它 failure vs failures 总数 | 37 + 9 | 46 | 46 | CONSERVED ✔ |
| identity 分组 vs shots 总数 | 133 + 130 | 263 | 263 | CONSERVED ✔ |
| zoomFrames vs shots[].zoomCrops（两处独立取数） | 336 | 336 | 336 | CONSERVED ✔ |
| G9 ok+skipped+fail vs PROBED | 455 + 0 + 0 | 455 | 455 | CONSERVED ✔ |
| G9 对照表四格 vs PROBED | 455 + 0 + 0 + 0 | 455 | 455 | CONSERVED ✔ |
| G8 OK 环 + MISS 环 vs 环总数 | 10 + 0 | 10 | 10 | CONSERVED ✔ |
- 合计 21 条分解，判红 0 条

## 附 2：本工具自判失败清单（任一条即非零退出；报告照写，但不得当作验收通过）

1. triage-exec-failures 判红（退出码 2）：词表漂移或落地对无处置，unclassified=1

> 本文件由 `scripts/qa/emit-round-report.mjs` 生成于 2026-09-28T10:28:13.075Z；机器可读同一份数据在 `reports/audit/round-7/round-7-metrics.json`。
