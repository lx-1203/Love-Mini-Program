# Release Checklist Template

## Scope Lock

- [ ] Release branch name is recorded
- [ ] Included pull requests are listed and carry complete labels
- [ ] Out-of-scope items are explicitly deferred

## Automated Gates

- [ ] `npm test`
- [ ] `npm run lint:openapi`
- [ ] `npm run lint:openapi:spectral`
- [ ] `npm --workspace apps/client run typecheck`
- [ ] `npm run verify:client-builds`
- [ ] `npm run api:test`
- [ ] `npm run verify:phase01`
- [ ] Flyway migrate + validate passed against a disposable database for this release candidate
- [ ] Secret scan is green

## Contract And Data

- [ ] OpenAPI file and generated client types are in sync
- [ ] Database migrations are reviewed and ordered correctly
- [ ] No breaking contract drift remains between mock and real mode
- [ ] AI plan scope still matches `GET /home/dashboard` -> `HomeDashboard.aiPlan`

## Manual Smoke

- [ ] Login and session restore
- [ ] Home dashboard shows schedule, aiPlan fallback, recommendations, and activity entry
- [ ] Match creation and status progression
- [ ] Temporary chat creation or reuse from recommendation
- [ ] Contact exchange request and response
- [ ] Session end and list refresh
- [ ] Real-mode H5 smoke test against local Spring API

## Risk Review

- [ ] Known issues are recorded in the defect log
- [ ] No new secrets or local credentials were added
- [ ] Rollback note is present in the release summary
- [ ] Go / No-Go record is attached
