# Campus Love Monorepo

This repository now carries the Phase 0 and Phase 1 foundation for a temporary anonymous chat app: a uni-app client, a Spring Boot mock-runtime API, OpenAPI contracts, and the earlier prototype artifacts.

## Structure

- `apps/api`: Spring Boot API for auth, profile setup, home feed, matching, temporary anonymous chat, and feedback.
- `apps/client`: uni-app client with mock mode by default and real mode for local API integration.
- `apps/admin`: reserved admin console workspace.
- `database/flyway`: database migrations and local Flyway config for the optional `db` backend profile.
- `docs/openapi`: API contracts shared with the client.
- `docs/*.md`: current foundation, branching, and release process notes.
- root `index.html` / `styles.css` / `script.js`: legacy prototype and interaction demo.

## Runtime Modes

- `mock mode`: default for both client and API development. The client uses local fixtures. The API starts under the Spring `mock` profile without MySQL or Flyway.
- `real mode`: the client reads `apps/client/.env.real` and calls `http://127.0.0.1:8080/api`.
- `db profile`: run the API with `db` only when you need MySQL plus Flyway.

## Local Commands

```bash
npm run api:dev
npm run client:dev:h5
npm run client:dev:h5:real
npm test
npm run verify:phase01
```

## Notes

- Mainline chat remains temporary anonymous chat only.
- The launch-scope AI plan stays inside `GET /home/dashboard` as the `aiPlan` module with fallback copy when `chat_ai_enabled = false`; Phase 0/1 does not require a standalone AI plan service.
- Persistent IM, social graph features, and AI reply UI stay out of scope in this slice.
