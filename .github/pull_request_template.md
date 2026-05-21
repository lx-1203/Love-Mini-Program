## Phase

- Phase: `Phase 0` / `Phase 1` / `Launch governance` / `Hotfix`
- Module: `auth` / `profile` / `campus` / `schedule` / `home` / `match` / `chat` / `contact-exchange` / `feedback` / `admin` / `database` / `ci`

## Summary

-

## User Impact

-

## DB / Flyway Impact

- Flyway migration changed: Yes / No
- If yes, describe:

## Privacy / Security Impact

- Does this PR change how user data is stored, transmitted, or displayed? Yes / No
- If yes, describe:

## Scope Check

- [ ] This PR does NOT touch out-of-launch-scope features (discussion community / activity system / long-term IM / RTC)
- [ ] Discussion/activity features remain preview/read-only only

## Labels

- [ ] Added `type:*` (feature/fix/chore/docs/refactor)
- [ ] Added `area:*` (client/api/openapi/database/release/qa/docs)
- [ ] Added `priority:*` (p0/p1/p2)
- [ ] Added `risk:*` (low/medium/high)
- [ ] Added `scope:*` (phase0-foundation/phase1-launch)

## Checks

- [ ] `npm test`
- [ ] `npm run lint:openapi`
- [ ] `npm run lint:openapi:spectral`
- [ ] `npm --workspace apps/client run typecheck`
- [ ] `npm run verify:client-builds`
- [ ] `npm run api:test`
- [ ] `npm run verify:phase01`
- [ ] Flyway migrate + validate executed when `database/flyway` changed

## Contracts And Data

- OpenAPI changed: Yes / No
- Generated client updated: Yes / No / N/A
- Flyway migration changed: Yes / No
- Backward-compatibility note:
  -

## Rollback Plan

-

## Evidence

- Screenshots / logs / recordings:
  -

## Release Notes

-

---

> **PR Rules**: Title format `<type>(<scope>): <summary>`. Max 500 lines of effective change. 
> `auth`, `matches`, `temp-chat`, `database/flyway` changes require **2 approvals** with at least 1 non-author.
> API changes MUST update OpenAPI first, then implementation, then callers.