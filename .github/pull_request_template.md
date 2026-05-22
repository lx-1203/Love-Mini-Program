## Summary

- 

## Scope

- Current lane: `Phase 0 / Phase 1` / `Launch governance` / `Hotfix`
- In scope:
  - 
- Explicitly left out:
  - 

## Labels

- [ ] Added `type:*`
- [ ] Added `area:*`
- [ ] Added `priority:*`
- [ ] Added `risk:*`
- [ ] Added `scope:*`

## Checks

- [ ] `npm test`
- [ ] `npm run lint:openapi`
- [ ] `npm run lint:openapi:spectral`
- [ ] `npm --workspace apps/client run typecheck`
- [ ] `npm run verify:client-builds`
- [ ] `npm run api:test`
- [ ] `npm run verify:phase01`
- [ ] Flyway migrate + validate executed against a disposable database when `database/flyway` changed

## Contracts And Data

- OpenAPI changed: Yes / No
- Generated client updated: Yes / No / N/A
- Flyway migration changed: Yes / No
- Backward-compatibility note:
  - 

## AI Plan Scope Check

- [ ] No AI plan behavior changed
- [ ] AI plan still ships through `GET /home/dashboard` -> `HomeDashboard.aiPlan`
- [ ] `chat_ai_enabled = false` fallback behavior remains valid or was updated intentionally

## Risk And Rollback

- 
- Rollback plan:
  - 

## Evidence

- Screenshots / logs / recordings:
  - 

## Release Notes

- 
