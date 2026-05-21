# Label Dictionary

## Required Pull Request Labels

### `type:*`

- `type:feature`: new user-facing behavior
- `type:fix`: bug fix or regression fix
- `type:chore`: tooling, CI, dependency, or repo maintenance
- `type:docs`: documentation-only change
- `type:refactor`: structural change with no intended behavior change

### `area:*`

- `area:client`
- `area:api`
- `area:openapi`
- `area:database`
- `area:release`
- `area:qa`
- `area:docs`

### `priority:*`

- `priority:p0`: launch blocker or production outage
- `priority:p1`: must-fix before release branch cut
- `priority:p2`: can ship later if the release remains stable

### `risk:*`

- `risk:low`: isolated or easily reversible
- `risk:medium`: touches shared behavior or cross-module contracts
- `risk:high`: touches contracts, migrations, auth, or launch-critical flows

### `scope:*`

- `scope:phase0-foundation`
- `scope:phase1-launch`
- `scope:phase2-followup`
- `scope:release-governance`

## Optional Operating Labels

- `status:blocked`
- `status:ready-for-review`
- `status:release-candidate`
- `gate:launch-blocker`
- `gate:needs-go-no-go`

## Usage Rules

- Every pull request must carry one label from each required family.
- Pull requests touching both `docs/openapi` and `database/flyway` should also carry `risk:high`.
- Release managers may add `gate:*` labels to drive freeze and Go / No-Go decisions.
