# Env lane — UI audit 2026-10-13 (backend bring-up)

Repo: `D:\6\恋爱小程序` (Windows + Git Bash). Goal: Redis 6379 + API 8080 up, then prove freshness.
Rule followed: every step quotes the raw machine line, not just an exit code.

## Pre-flight findings (before step 1)
- `netstat -ano | grep -E ':(3306|6379|8080)'` → only `TCP 0.0.0.0:3306 0.0.0.0:0 LISTENING 6192`. 6379 and 8080 not listening.
- pid 6192 = `mysqld.exe` (native Windows process, NOT a container).
- `tasklist | grep -i java` → empty (exit 1). No JVM at all.
- `docker version` → `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` (daemon not running), so docker-compose is not the live provider for redis/mysql right now.
- `D:\codex-tools\redis\` contains `redis-server.exe`, `redis-cli.exe`, `redis-check-aof.exe` (v 5.0.14.1 from prior log) + `redis.windows.conf`.
- `grep -rn "redis-server" --include=*.ps1 --include=*.bat --include=*.cmd .` → no output (no prior launch script in repo).
- `docker-compose.yml` service `redis` (lines 144-169): `--appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru --save 60 1000 --requirepass`, ports `127.0.0.1:${REDIS_PORT:-6379}:6379`, volume `redis-data:/data`.
- Repo root `appendonly.aof` = 2,138,517 bytes, mtime `Sep 4 00:00` → a previous local redis used the repo root as `dir` with appendonly ON.
- AOF integrity before launch: `AOF analyzed: size=2138517, ok_up_to=2138517, diff=0` / `AOF is valid`. Contains live app keys (`sensitive_words::all`, Redisson `hot-score:recalc`) → must be loaded, not overwritten.
- `.env` has `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`, `REDIS_PASSWORD` present (value never echoed).

## Step 1 — Redis
DONE. Provider chosen = standalone `D:\codex-tools\redis\redis-server.exe` (v `5.0.14.1`), NOT docker (daemon down; see step 5).
Config written to `D:\codex-tools\redis\qa-redis.conf` (outside repo, mirrors compose service `redis`: `appendonly yes`, `save 60 1000`, `maxmemory 256mb`, `maxmemory-policy allkeys-lru`, `bind 127.0.0.1`, `port 6379`, `requirepass` sourced from `.env`).
Password handling: read into a shell var only; never echoed. Conf file holds it in plaintext on disk (same exposure as the pre-existing `.env`), file path disclosed.

First attempt failed on the non-ASCII path:
```
[37708] 13 Oct 19:02:53.175 # Can't chdir to 'D:/6/恋爱小程序': Illegal byte sequence
```
(8.3 short-name fallback unavailable — `GetFolder(...).ShortPath` returned the same mangled name, so 8.3 generation is off on that volume.) Fix: dropped the `dir` directive and launched with cwd = repo root, which is how the original AOF was created there.

AOF protected before launch:
- `cp -p appendonly.aof /d/codex-tools/redis/qa-backups/appendonly.aof.pre-qa` → `2138517 Sep 4 00:00 appendonly.aof.pre-qa`
- pre-load integrity check: `AOF analyzed: size=2138517, ok_up_to=2138517, diff=0` / `AOF is valid`

Boot verdict lines (verbatim):
```
[36340] 13 Oct 19:03:25.661 # Redis version=5.0.14.1, bits=64, commit=ec77f72d, modified=0, pid=36340, just started
[36340] 13 Oct 19:03:25.676 * Running mode=standalone, port=6379.
[36340] 13 Oct 19:03:25.733 * DB loaded from append only file: 0.056 seconds
[36340] 13 Oct 19:03:25.734 * Ready to accept connections
```
- Listening: `TCP    127.0.0.1:6379    0.0.0.0:0    LISTENING    36340`
- Process: `Id : 36340 / ProcessName : redis-server / StartTime : 2026-10-13 19:03:25`
- Auth: `PING=PONG` with the password; without it (fresh shell, `REDISCLI_AUTH` unset) `NOAUTH Authentication required.` → requirepass is enforced.
- Dataset intact, NOT wiped: `DBSIZE=54`; `CONFIG GET appendonly` → `yes`; `CONFIG GET dir` → `D:\6\恋爱小程序` (console mojibake only, path is correct).
- AOF grew append-only: `2138693` vs backup `2138517` (+176 bytes) — no rewrite, no overwrite. `dump.rdb` absent.
- Honest caveat: `EXISTS sensitive_words::all` → `0`, although that key appears in the AOF head. That is the AOF's own final state (a later `DEL`/`PUBLISH` sequence in the file), not a loss caused by this launch. Loaded keys are Redisson rate-limit state, e.g. `ratelimit:AuthController#phoneLogin:127.0.0.1`.

## Step 2 — Compile API offline
DONE. `JAVA_HOME=D:\jdk17`, `java -version` → `openjdk version "17.0.18" 2026-01-20`, wrapper dist cached at `~/.m2/wrapper/dists/apache-maven-3.9.6-bin`; `which mvn` → `no mvn in (...)` so the wrapper `apps/api/mvnw` was used.
```
MVN_EXIT=0          # ./mvnw -o -q compile
TESTCOMPILE_EXIT=0  # ./mvnw -o -q test-compile (added, see caveat)
```
Both logs (`/d/codex-tools/qa-compile.log`, `/d/codex-tools/qa-testcompile.log`) are empty, which is what `-q` prints on success.

Freshness gate, raw lines:
```
=== newest .java in src/main/java ===
2026-10-11+13:20:26.6783327000 src/main/java/com/campuslove/api/vip/BillingController.java
2026-10-11+13:20:14.3406926000 src/main/java/com/campuslove/api/config/MockSecurityConfig.java
2026-10-11+13:16:09.2348845000 src/main/java/com/campuslove/api/config/ContentSecurityChecker.java
=== newest .class in target/classes ===
2026-10-11+13:20:58.9082775000 target/classes/com/campuslove/api/wxpay/WxPayRefundNotifyController.class
```
Newest `.class` (13:20:58) IS newer than newest `.java` (13:20:26), and the strict per-file check for the e7a6113c main files holds (class mtime > java mtime for all five): `ContentSecurityChecker java=13:16:09 class=13:20:51`, `ContentSecurityVerdict java=13:15:34 class=13:20:51`, `MockSecurityConfig java=13:20:14 class=13:20:52`, `SecurityConfig java=13:14:20 class=13:20:52`, `BillingController java=13:20:26 class=13:20:58`.

**Honest caveat — the compile was a no-op, and that is the right verdict, not a skipped one:** nothing recompiled because `target/classes` already contained a full build of these exact sources from 2026-10-11 13:20 (the edits were made Oct 11, committed later). Proof that no source was left behind:
```
count=0   # find src/main/java -name '*.java' -newer <newest .class>  → zero uncompiled sources
```
Also: `mvn compile` by design does NOT touch `src/test/java`, and 2 of the 7 e7a6113c files are tests, so I additionally ran `test-compile`. Both test classes exist and post-date their sources:
```
2026-10-11+13:25:32 target/test-classes/com/campuslove/api/config/SecurityConfigTest.class
2026-10-11+13:25:36 target/test-classes/com/campuslove/api/wxpay/WxPayPropertiesFailFastTest.class
```

## Step 3 — Start backend
DONE (after one environment fix). `target/cp.txt` existed (19315 B, 186 jars) but was older than `pom.xml` (`pom.xml Oct 8 04:57` vs `cp.txt Aug 31 01:51`), so I regenerated it offline and proved it unchanged:
```
CP_EXIT=0
entries_new=186
CP_DIFF=IDENTICAL     # then mv target/cp-new.txt target/cp.txt → cp.txt now Oct 13 19:07
```
(backup kept at `apps/api/target/cp.txt.pre-qa`; `git status --porcelain -- apps/api` stayed `count=0`, so the gate's clean-worktree condition was not broken by the build.)

First boot attempt FAILED — `restart-backend.ps1` does not load `.env`, so the real-profile WebSocket origin fail-fast tripped (`WebSocketConfig.java:116`):
```
Caused by: java.lang.IllegalStateException: WebSocket Origin 未配置（安全收口）：real 环境必须通过环境变量 WEBSOCKET_ALLOWED_ORIGIN_PATTERNS（或 app.websocket.allowed-origin-patterns）显式配置允许的来源...
```
Fix: exported the repo-root `.env` into the process env in the SAME shell that launches the canonical script (no repo file edited, launcher untouched). `.env` was audited first and is safe here — `DB_URL` is `jdbc:mysql://127.0.0.1:3306/campus_love`, `REDIS_HOST=127.0.0.1`, no docker service hostnames. The validator only requires a non-empty pattern list; `.env` supplies `http://localhost:*,http://127.0.0.1:*` (identical to the mock default).
```
APP_GUEST_LOGIN_ENABLED=true          # set by .env AND by restart-backend.ps1 line 19
GUEST_LOGIN_HTTP=200                  # not 403 TRIAL_LOGIN_DISABLED → guest login flag confirmed live
```
Boot verdict lines:
```
2026-10-13 19:15:11.357 [main] INFO c.c.api.CampusLoveApplication - The following 1 profile is active: "real"
2026-10-13 19:16:53.672 [redisson-netty-1-4] INFO o.r.connection.ConnectionsHolder - 1 connections initialized for 127.0.0.1/127.0.0.1:6379
2026-10-13 19:17:00.895 [main] INFO o.f.core.internal.command.DbValidate - Successfully validated 203 migrations (execution time 00:16.797s)
2026-10-13 19:17:17.855 [main] INFO o.f.core.internal.command.DbMigrate - Schema `campus_love` is up to date. No migration necessary.
2026-10-13 19:18:55.082 [main] INFO o.s.b.w.e.tomcat.TomcatWebServer - Tomcat started on port 8080 (http) with context path '/'
2026-10-13 19:18:55.286 [main] INFO c.c.api.CampusLoveApplication - Started CampusLoveApplication in 228.825 seconds (process running for 231.516)
```
Note for the next agent: real boot is ~3.8 min, not ~2 min; poll actuator health instead of sleeping. Backend log: `D:\codex-tools\qa-backend2.log` (failed attempt 1: `qa-backend.log`). Redisson connecting to 6379 also proves the `.env`/launcher Redis password match (`REDIS_PW_ENV_VS_PS1=MATCH`, lengths 16/16, values never printed).

## Step 4 — Prove up + fresh
DONE, all four.
1. Health: `curl -s http://127.0.0.1:8080/actuator/health` → `HEALTH={"status":"UP"}` (permitted without auth ⇒ proves boot only).
2. Freshness gate (`scripts/qa/verify-backend-fresh.mjs`, run with `D:/codex-tools/node-v22.17.0-win-x64/node.exe`):
```
BACKEND_FRESH java最新=2026-10-11T05:20:26.678Z class最新=2026-10-11T05:20:58.908Z 运行实例=pid 23608 java.exe 起于 2026-10-13T19:15:03 apps/api脏项=0 源码比class新=0
BACKEND_FRESH_RESULT=PASS（运行中的 8080 就是 HEAD 那份后端，③ 的重启不必再做一次）
```
3. Read-only MySQL data probe, `GET /api/v1/posts?page=1&pageSize=5` with the guest Bearer token:
```
POSTS_HTTP=200
top_keys=items,total,page,pageSize
total=255 items_len=5
```
   Without a token the same call is `HTTP=401 {"code":"UNAUTHORIZED",...}` ⇒ auth layer live and the 200 is real DB reads (255 posts). Payload is flat (`items/total/page/pageSize`), not `{code,message,data}`.
4. Guest login: `POST /api/v1/auth/guest-login` → `GUEST_LOGIN_HTTP=200`, flat body, **`userId=100151`** (`displayName=阿辰`, `loginMethod=guest`, `token` present, 249 chars — value not logged). TEST DATA DISCLOSURE: I invoked it twice (once while debugging a path bug); both returned the same `userId=100151`, i.e. the demo guest account is reused, not a new row per call. Treat one demo guest account (100151) as touched by this lane.

## Step 5 — Guardrails / blockers
- No mp-weixin artifact rebuilt; no DevTools/wechatide touched; no `scripts/qa/verify-*.mjs` run with `--apply/--write/--evict` (the gate was run bare).
- Kill-branch safety: `tasklist | grep -i java` before launch → `pre_launch_java_count=0`, `port8080_listeners=0`. (Also: the 1443-byte `restart-backend.ps1` I read contains NO kill branch at all — it is 25 env assignments plus a foreground `& 'D:\jdk17\bin\java.exe' -cp "target/classes;$cp"`.)
- **Docker blocker surfaced, not acted on**: `docker-compose.yml` is the intended provider for BOTH redis (`redis:7.2.5-alpine`, `campus-redis`) and mysql, but `docker version` → `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`. I did NOT `docker compose up`. Risk was moot anyway: MySQL on 3306 is native `mysqld.exe` pid 6192 (from `D:/mysql-8.0.45-winx64/bin` on PATH), not a container, and Redis's compose dataset lives in the named volume `redis-data:/data` — NOT the repo-root `appendonly.aof`. So compose would have given a *different, empty* Redis while the repo-root AOF (the real prior state, 54 keys) stayed on disk. Standalone redis-server against that AOF is the faithful choice.
- Guesses / judgment calls (flagged for review): (a) chose standalone Redis over compose; (b) dropped the `dir` directive because the Windows build cannot chdir a UTF-8 path, and relied on inherited cwd — `CONFIG GET dir` confirms it resolved to the repo root; (c) mirrored compose's `save 60 1000` (a `dump.rdb` may appear in repo root later; both `appendonly.aof` and `dump.rdb` are gitignored, `.gitignore:110-111`); (d) added `mvn -o test-compile` because 2 of the 7 committed files are tests and `compile` alone never builds them; (e) loaded `.env` via process env instead of editing the canonical launcher; (f) ran `redis-cli` with `REDISCLI_AUTH` so the password never appears in process args.
- Left running for the round: `redis-server` pid **36340** (StartTime 2026-10-13 19:03:25, 127.0.0.1:6379), `java` pid **23608** (StartTime 2026-10-13 19:15:03, 0.0.0.0:8080 + [::]:8080). MySQL untouched: pid 6192.
