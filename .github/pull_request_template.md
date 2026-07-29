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

## CI 检查清单

> **强制门禁**：以下所有 status check 必须全部绿才能合并。
> 任一 check 失败即阻断合并，禁止使用 `Admin force merge` 跳过。
> 详见 `.github/workflows/ci.yml`（Task 19 FIN-00007）。

- [ ] lint-and-structure 通过（OpenAPI lint + Spectral lint + structure tests）
- [ ] client-typecheck-and-build 通过（H5 + mp-weixin 构建均通过）
- [ ] client-test 通过（vitest 单元测试全部通过）
- [ ] admin-typecheck-and-build 通过
- [ ] api-compile 通过（`mvn -B -f apps/api/pom.xml compile` BUILD SUCCESS）
- [ ] api-test 通过（`mvn -B -f apps/api/pom.xml test` BUILD SUCCESS，0 failures）
- [ ] security-scan 通过（Trivy 扫描无 HIGH/CRITICAL 漏洞）
- [ ] e2e 通过（Playwright 端到端测试全部通过）

### Job 超时配置（Task 19.4）

| Job | timeout-minutes |
|-----|-----------------|
| lint-and-structure | 30 |
| client-typecheck-and-build | 30 |
| client-test | 30 |
| admin-typecheck-and-build | 30 |
| api-compile | 30 |
| api-test | 60 |
| security-scan | 30 |
| e2e | 45 |

任一 job 超过 timeout-minutes 将自动取消并标记为失败，禁止重试跳过门禁。

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
