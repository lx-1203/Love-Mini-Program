# Branching

## Protected Branches

- `main`: the only long-lived integration branch. It must stay releasable.
- `release/YYYY-MM-DD`: stabilization branch for a dated release window.
- `hotfix/YYYY-MM-DD-short-name`: emergency production fix branch cut from the active release branch or `main`.

## Working Branches

- `feature/<scope>-<topic>`: user-facing or product behavior changes.
- `fix/<scope>-<topic>`: defect fixes.
- `chore/<scope>-<topic>`: tooling, CI, build, or dependency work.
- `docs/<topic>`: documentation-only changes.

## Merge Rules

- Branch from `main` unless the release manager explicitly asks you to target `release/*`.
- Keep each branch scoped to one reviewable slice. Do not mix product scope changes and release-governance changes unless the governance change is required to ship the product change.
- Rebase or merge `main` before opening a pull request when the branch lives longer than one day.
- Run `npm run verify:phase01` before requesting review.
- Changes under `docs/openapi` or `database/flyway` must ship together with the matching client, API, and verification updates in the same pull request.
- Merge only after CI is green, CODEOWNERS review is satisfied, labels are complete, and the pull request template checklist is fully filled out.
- Direct pushes to `main` and `release/*` are reserved for release managers handling approved hotfixes.

## Launch Window Rules

- From `T-18` to `T-12`, merge to `main` in daily reviewable slices and keep the branch queue short.
- From `T-11` onward, non-blocking enhancements stop landing; only launch blockers and approved regressions may continue.
- Once `release/*` is cut, fixes must branch from that release branch and be cherry-picked back to `main` if still relevant.

## Labels And Decision Gates

- Every pull request must carry at least one `type:*`, `area:*`, `priority:*`, `risk:*`, and `scope:*` label. See `docs/label-dictionary.md`.
- Every release candidate must be summarized with `docs/go-no-go-template.md`.
