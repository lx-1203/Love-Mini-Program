# R13 — DevTools run notes (mini-program running against the real local backend)

Date: 2026-09-22, ~16:32–17:35 (+08:00)
Backend under test: `http://127.0.0.1:8080` (Spring Boot, MySQL `campus_love`, Redis)
Build under test: `apps/client/dist/build/mp-weixin/` (`--mode real`, `VITE_API_BASE_URL=http://127.0.0.1:8080/api`)

---

## 1. Freeze root cause

**The simulator was never showing the DevTools default placeholder — it was showing its own
"模拟器启动失败 / Error: Timeout" screen** (captured before the restart:
`shots/00-before-restart.png`).

The automator timeouts (`automation_runtime_info`, `automation_evaluate` →
`timeout waiting for automator response`) and the empty `get_simulator_console` were downstream
symptoms of the appservice never finishing its first launch.

Hard evidence, from the DevTools log
`%LOCALAPPDATA%/微信开发者工具/User Data/4312ba16bbd8fcbb1973d9340cb64afd/WeappLog/logs/2026-09-22-16-07-33-880.log`:

```
16:19:01  open_project_window  project = D:\6\恋爱小程序
16:25:10  [Fileutils] projectFileNum duration 470015        <-- 470 s scanning the project tree
16:25:10  [Fileutils] getFile duration 165127
16:25:10  [Fileutils] initAll-getFileByGlobSync-initNewWatcher duration 367865
16:25:11  [PreCompileProject] updateFileAndDirs ... files=465178 dirs=4835
16:26:23  [WorkbenchSimulator] flushContextPatch failed timeout
16:26:23  [SimulatorService] genCreateSimulatorOptions error timeout
16:27:23  [appservice] simulator launch catch error timeout
16:32:23  [appservice] simulator launch catch error Error: Timeout
```

**Root cause: opening the repo ROOT (`D:/6/恋爱小程序`) as the DevTools project.** The root project
config sets `miniprogramRoot` to the dist folder, but DevTools' FileUtils still walks the *whole
project directory* — the monorepo contains **577,626 files** (`node_modules` for 4 apps plus the
pnpm store). That walk alone takes 6–8 minutes, which exceeds the simulator launch timeout, so the
appservice is killed before it can boot. Nothing in the app code is at fault, and the timeout is
reproducible on every cold start.

Ruled out (all were red herrings):

| Suspect | Verdict |
|---|---|
| Missing `sitemap.json` at repo root while root `project.config.json` declares `"sitemapLocation": "sitemap.json"` | **Not the cause.** `sitemapLocation` is an `app.json` field; the built `app.json` does not declare it, so it defaults to `sitemap.json` *relative to `miniprogramRoot`*, and `apps/client/dist/build/mp-weixin/sitemap.json` exists. The root-level key is inert. I did **not** change it. |
| Pinned `libVersion` | **Not the cause.** Root config pins `3.17.1`, `project.private.config.json` pins `3.7.12`; the runtime console banner shows **`WeChatLib: 3.17.2`** was actually used. Neither pin is honoured, neither blocks compilation. |
| `urlCheck` / appid | Fine (`urlCheck:false`, appid `wxc67cd233d72388d0`). Untouched. |
| DevTools "automation 长跑假死" (R12's diagnosis) | Only partly true. A restart alone did **not** help — the freeze returned immediately on the root project. It is a project-path/file-count problem, not a flaky automator. |

## 2. Recovery (what actually worked)

Open the **build output directory** as the project instead of the repo root:
`D:/6/恋爱小程序/apps/client/dist/build/mp-weixin` — **860 files**, compiles in seconds.
The dist folder carries its own valid `project.config.json` (same appid, `urlCheck:false`), so this
is the standard uni-app workflow and needs no config edits.

Exact commands (all from `D:/微信开发者/微信web开发者工具`):

```bat
:: 1. quit the IDE
wechatide.cmd -c Qoder quit

:: 2. relaunch (the real Electron binary is 微信开发者工具.exe, NOT wechatdevtools.exe,
::    which is only a 2.2 MB stub that exits immediately)
powershell -NoProfile -Command "Start-Process -FilePath 'D:\微信开发者\微信web开发者工具\微信开发者工具.exe' -WorkingDirectory 'D:\微信开发者\微信web开发者工具'"
:: wait ~30 s for the MCP server

:: 3. open the DIST directory (fullMode so the debugger panel is live)
wechatide.cmd -c Qoder open_project_window --project "D:/6/恋爱小程序/apps/client/dist/build/mp-weixin" --window-mode fullMode
:: -> {"success": true, "type": "newopen", "winId": "s1"}

:: 4. first probe answered after ~90 s total; from then on everything is responsive
wechatide.cmd -c Qoder automation_runtime_info --project "..." --action currentPage
:: -> {"path": "pages/login/index"}
```

**Which of the two works: only the dist directory.** The repo root is unusable in DevTools while
`node_modules` is inside the project folder; fixing that properly would need either a
`packOptions.ignore` / separate workspace root (build-level change, not attempted — the dist route
is non-invasive and reversible) or moving the build out of the monorepo.

### Session seeding

No token injection was needed. The app's own guest-login path was driven through the UI:

```bat
wechatide.cmd -c Qoder automation_element_action --project <dist> --selector ".btn-guest" --action tap
```

That fires `loginAsGuest()` → `POST /api/v1/auth/guest-login` → real JWT stored under
`uni.setStorageSync("token", …)` (key confirmed in `apps/client/src/constants/storage-keys.ts:32`
`AUTH_TOKEN: "token"`, read back by `services/http.ts:152 getToken()`), then the app navigated to
`pages/discover/index` on its own. `/api/v1/auth/me` subsequently returns
`{"userId":"100151","loggedIn":true,"loginMethod":"guest","displayName":"阿辰",...}` with HTTP 200.

`wx.clearStorageSync()` + relaunch was used later to re-shoot the logged-out login page; the session
was then re-established the same way (verified: `tokenLen=249` in storage).

## 3. Is it genuinely running against the real backend? — Yes

* Boot requests observed in the DevTools network panel, all HTTP 200:
  `GET /api/v1/app-config/login-hero`, `GET /api/v1/app-config`, `GET /api/v1/auth/me`.
* `/api/v1/app-config` response body carries real feature switches (`login_open:true`,
  `register_open:true`, `daily_recommend_limit:10`, `siteTitle:"校园恋爱"`).
* Pages render live DB content, not fixtures: home shows a recommendation card (远山, 25岁·
  北京师范大学·大二, 65% 合度); 圈子 feed shows 柳下惠/闻人雅 posts with real comment counts;
  post detail `id=146` shows 唐绾绾「汉服出行日，路上好多同袍」with 8 real comments; circles
  `circleId=8` shows 摄影 · 1.2w 人加入 · 5 条动态; 消息 shows 14 人喜欢你 and real conversations
  (叶清欢「全链路验收测试消息 2026-09-12」).
* Base library banner: `WeChatLib: 3.17.2`, `No. of subpackages: 13`. `App.onLaunch took 50–60 ms`.

## 4. Image rendering — backend-served images DO render, but some do not

**Proof of backend-served rendering** (`shots/15-campus-index.png`, `11-circles-circle-home.png`,
`05-pages-discover-index.png`, `09-village-post-detail.png`): the page data of
`subpackages/campus/campus/hub` read out of the live runtime contains

```
http://127.0.0.1:8080/api/v1/media/app-assets/assets/icons/common/graduation-cap.svg
```

In the `real` build `config/images.js` compiles the `IMAGE_PATHS` constants to
`http://127.0.0.1:8080` + `/api/v1/media/app-assets` + `/assets|/generated` (verified in the
minified bundle), so decorative imagery is fetched from the backend and **visibly renders** —
5 distinct campus photographs on 校园圈, the 摄影 circle hero shot, full-bleed discover card photos,
the post-detail sky image. `curl` on the same endpoint family returns real JPEGs
(`…/generated/images/campus/campus-gate.jpg` → 200 `image/jpeg` 342 KB;
`…/assets/images/posts/post-5.jpg` → 200 `image/jpeg` 90 KB).

**Counter-evidence / caveat:** `apps/client/src/utils/media.ts:180-191` rewrites
`/api/v1/media/app-assets/{rel}` back to `/static/{rel}`, and the `real` bundle ships only
**62** of the **164** files in `apps/client/src/static` (no `avatars/`, no `campus/`, only
`posts/post-2.jpg`, `post-8.jpg`, `post-placeholder.jpg`). So any URL that arrives as a *relative*
`/static/...` path from the API (rather than as an `IMAGE_PATHS` constant) resolves to a file that
is not in the package and renders as a blank box. Concretely broken in this run:

* `shots/08-village-index.png` — the post image area of 柳下惠's post is an empty grey rectangle.
* `shots/07-pages-profile-index.png` — the 我的故事 cover and the 我的相册 thumbnail are blank.
* `shots/14-profile-album.png` — album slot 1/6 (the one existing photo) is a blank grey tile.
* `shots/12-circles-topic-detail.png` — the author avatar renders as a plain grey circle.

## 5. Errors and failing pages (honest list)

| # | Page | Status | Evidence |
|---|---|---|---|
| 13 | `subpackages/chat/chat-session/index?userId=10011` | **FAILS — no messages, error text rendered as page body** | The page shows 「重复请求已被拦截，请勿使用相同的 Idempotency-Key」 twice (top + bottom) and the header reads 对话中 / 离线. Console: `[error] [captureException] EnhancedApiError: 重复请求已被拦截… {"source":"http","http_url":"/messages/conversations","http_status":409}`. **The only non-2xx seen in the whole run: `GET /api/v1/messages/conversations` → 409.** Same 409 also appears on a plain cold start. |
| 09 | `subpackages/village/village/detail?id=146` | **Renders correctly, then auto-navigates away within 1–5 s** | Reproduced with `id=146`, `148`, `167`: lands on `subpackages/profile-extra/profile/other?userId=10005/10006/10007/10008/10025/10027/10028` — a *runaway loop of `wx.navigateTo` calls with cycling userIds*, not a one-off redirect. Captured by instrumenting `wx.navigateTo` in the runtime: `BLOCKED_NAV navigateTo /subpackages/profile-extra/profile/other?userId=10028` ×7 in ~4 s. `shots/09-village-post-detail.png` was only obtainable with that navigation blocked. No console error accompanies it. |
| 03 | `pages/home/index` | **Vue runtime error on every load** | `[error] [Global Error][Vue Error] TypeError: Cannot read properties of undefined (reading 'item')` + `vuejs.org/error-reference/#runtime-2` (render-function access to `.item` on `undefined`). The page still paints, so it is non-fatal but it throws on every home render. |
| 08 | `subpackages/village/village/index` | Partial: post images blank | See §4. Console clean. |
| 07 / 14 | `pages/profile/index`, `profile-extra/profile/album` | Partial: story cover / album photo blank | See §4. Console clean. |
| 12 | `subpackages/circles/circles/topic-detail?id=3` | Partial: author avatar blank grey circle | See §4. Console clean. Content (title, body, 回复 0) loads fine. |
| 15 | `subpackages/campus/campus/index` | Redirects to `subpackages/campus/campus/hub` | In-app route guard; `currentPage` reported `campus/hub`. Renders fully. Not counted as a failure. |
| 16 | `subpackages/discover-extra/discover/matching` (no `target` param) | Bounces to `pages/discover/index` | Needs `?target=<userId>`; opened bare it redirects. Renders fine after the bounce. |
| 01 | `pages/login/index` | OK when logged out; auto-redirects to `pages/discover/index` when a session exists | Documented behaviour (`pages/login/index.vue:91`). `shots/01-pages-login-index.png` is the logged-out page. |

Pages with **no** console error and no visible defect: 02 register, 04 nearby, 05 discover,
06 messages, 10 circles index, 11 circle-home, 15 campus hub, 16 discover.

## 6. Console/network capture caveats (read before trusting "empty")

* `get_simulator_console` / `get_simulator_network` accept **only a single-pattern grep**. The
  requested `grep -iE 'error|TypeError|undefined|fail|401|500' | tail -20` returns `""` through
  `wechatide.cmd` — cmd.exe does not treat `'...'` as quoting, so the `|` inside the pattern breaks
  the command line. Verified: `grep -iE 'system|subpackages'` → `""` while `grep -i system` →
  matches. `grep -e a -e b` also returns `""`. `grep -c` / `wc -l` are ignored.
  In `console-evidence.log` this is emulated with **one `grep -i <term>` per term** (`error`,
  `fail`, `401`, `500`) plus a `grep -n . | tail -25` full tail. `<<EMPTY>>` means "no line matched
  that term", not "the console is empty".
* `simulator_open_page` **relaunches the appservice**, which resets the console/network buffers.
  That is why each page section in the logs is attributable to that page — but it also means the
  panel only holds the requests made since that relaunch (mostly the three boot calls).
* The DevTools network panel records `wx.request` traffic only; `<image>` loads never appear there.
  That is why backend image serving is proven from page data + `curl` instead.
* The automator still wedges occasionally during long runs (`timeout waiting for automator response`
  seen ~3 times, e.g. on the `wx.clearStorageSync()` call and once on page 15). It recovered by
  itself within 10–30 s each time; no further IDE restart was needed. Screenshots kept working
  throughout.

## 7. Files touched

No file under `apps/client/src/` was modified. No git command run. `urlCheck` and `appid` untouched.
`project.config.json` / `project.private.config.json` **not** modified (the `sitemapLocation`
mismatch was investigated and found inert — see §1).

Created (all evidence / scratch, all deletable):

* `reports/audit/2026-09-22-r13-goal/console-evidence.log`
* `reports/audit/2026-09-22-r13-goal/network-evidence.log`
* `reports/audit/2026-09-22-r13-goal/devtools-run-notes.md` (this file)
* `reports/audit/2026-09-22-r13-goal/shots/*.png` — 20 files (16 numbered page shots +
  `00-before-restart.png` (the 模拟器启动失败 screen), `01-dist-project-start.png` (first successful
  render), and two pre-existing files from before this session: `01-login.png`,
  `02-after-refresh.png`)
* `tmp/r13-tour.sh` — the tour/evidence driver used for the batches
* `tmp_r13_token.txt` — held a guest JWT; **deleted** at the end of the run

Runtime-only, non-persistent side effects (gone on the next appservice relaunch, no file changed):

* `wx.navigateTo` / `wx.redirectTo` / `wx.reLaunch` were temporarily wrapped inside the running
  appservice to block the page-09 auto-navigation loop and log `BLOCKED_NAV <url>` to the console.
* `wx.clearStorageSync()` was called twice while re-shooting the logged-out login page; the session
  was re-established afterwards via the in-app 稍后再看 / guest-login button.

## 8. Recommended next steps for the main agent

1. **Do not open `D:/6/恋爱小程序` in DevTools.** Either keep the dist directory as the project, or
   add `packOptions.ignore` for `node_modules` / `apps/admin*` / `archive` / `素材` / `截图存档` to the
   root `project.config.json`. The 577k-file walk is what kills the launch.
2. Fix the **409 Idempotency-Key collision** on `POST/GET /api/v1/messages/conversations` — it
   bricks the chat session page.
3. Fix the **runaway `navigateTo('/subpackages/profile-extra/profile/other?userId=…')` loop** that
   starts from `subpackages/village/village/detail`.
4. Fix the **`TypeError: Cannot read properties of undefined (reading 'item')`** render error on
   `pages/home/index`.
5. Reconcile the `real` build's asset pruning with `utils/media.ts`'s `/static/` localization: either
   ship the full `src/static` set or stop localizing API-returned `/static/...` media URLs.
