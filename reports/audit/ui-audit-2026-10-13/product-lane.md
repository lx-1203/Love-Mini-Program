# 产品诊断线（Product lane）— 2026-10-13

状态：诊断与修复已定稿（源码级）；行为取证与 U-1 判据待带内补做。改动仅 `apps/client/src/services/config.ts`；typecheck + 1366 单测全绿（实跑）。

## 现象复述
- 上一轮审计（`reports/audit/ui-audit-2026-10-09/sort-round3.json`，finding `R3-NEARBY-02` / `R3-04`，severity high/medium）记录：登录态下真实 `wx.switchTab` 到「附近」tab **执行成功**（`success=switchTab-ok`），但随后当前页变成 `pages/login/index`，settling 后变成 `pages/discover/index`，即链路 `nearby → login → discover`；连续 4 轮复现同一 bounce，因此附近页内容从未被检视。
- 姊妹页匹配流程（`pages/discover-extra/discover-matching`，`R3-05`）同样 bounce 到 `pages/discover/index` 4 次，但**无缺陷 id、无 probe**，只有两条未证伪的假设（"无 deck 快照时打开 → goBack 属设计" vs "每日配额用尽"）。
- **环境基线（本次实测，2026-10-13）**：`curl -s -m 3 http://127.0.0.1:8080/actuator/health` → **无响应，curl exit code 7（connection refused）**。即在我开始诊断时本地 8080 API 是**宕机**的。审计轮次运行时同样可能宕机（另有一条 lane 正在拉起它）。

## 归因
### 结论（附近页）：**以 (1) 产品根因为主**，且 (3) 环境是它的触发条件之一；(2) 测试装置可排除。
- 产品根因（已定位）：`pages/nearby/index.vue` 在 `onLoad`(:159) 与 `onShow`(:166) 都无条件调用 `refreshSchools()` → `config/schools.ts:loadSchools()`(:120) → `services/config.ts:loadCampuses()`（修复前 :145-147，修复后 :156-161）→ `request({url:"/config/campuses"})`。
  该调用**既没有 mock 短路、也没有登录门**（`canFetchProtected()` 在 nearby:66-68 只门控 circles/posts/activities），而代码注释（nearby:176-177）自述前提是「校区列表是公开端点」——**该前提与后端配置相悖**：`SecurityConfig.java:194` 与 `MockSecurityConfig.java:225` 均为 `/api/v1/** → authenticated()`，permitAll 白名单里只有 `/api/v1/config/legal`（:145）与 `/api/v1/location/ip-city`（:137），**没有 `/api/v1/config/campuses`**（全库 grep 只在 `ConfigController.java:57 @GetMapping("/campuses")` 命中，无放行规则）。
- 机制链闭合：无 token 的 401 → `services/http.ts:688` → `handle401()`(:509) → `tryRefreshToken()`(:418) 因 `getToken()` 空直接 `return false`(:420-422) → `redirectToLogin()`(:529→:468) → `clearTokens()` + 500ms 后 `uni.reLaunch(ROUTES.LOGIN)`(:493)；登录页 `pages/login/index.vue:87-89` 的 `onShow` 见 `sessionStore.isLoggedIn` 为真 → `switchTab("/pages/discover/index")`。观测到的 `nearby → login → discover` 三段全链由此唯一闭合。
- **(2) 测试装置可排除（证据）**：探针 `tmp/qa/nearby-switchtab-probe.mjs` 只做三件事——`currentPage()` 读数、`m.evaluate` 内 `wx.switchTab("/pages/nearby/index")`、sleep 后再读数；**不清 seed/token、不用桥 open、不带 query、不重编译**（对比 ledger corrections `R2-OT-06` 记录的「带 query 的桥 open 会把页打回 .html 代理态」与 `R3-PFI25-03` 记录的「simulator_open_page 属 compiler 族会清 seed」——本探针两条已知装置副作用都不涉及）。且 BEFORE=`pages/profile/index`（第 4 个 tab）说明 AppService 已在带内运行、会话态是装置此前建立的，探针本身未复位任何状态。
- **(3) 环境的定位**：宕掉的 8080 **不能**产生 401。`doRequest` 的 `fail:` 分支(:734-737) 走 `buildNetworkError` → status 0（`http.ts:99`），不触碰 `redirectToLogin`；只有真收到 `statusCode===401`(:688) 才弹。⇒ 审计轮次里 8080 **必须是活的且以 real 语义鉴权响应**（详见「未证」U-1：real profile 后端 / 或 mock profile 但 `/config/campuses` 未落到注入 mock 用户的分支）。也就是说：**产品缺陷 (1) 是根因，环境 (3) 只是它的必要条件，二者不互斥**；而「后端宕机」这一路不能解释本 bounce。
### 结论（匹配页）：暂判 **(1)+(3) 交织、不可由源码单独定谳**，需带内测量（见「未证」U-3）。
- `subpackages/discover-extra/discover/matching.vue` 的 landing 由两个互斥分支决定，且**都真实存在**：
  - `onLoad`(:112) `guideGuestToLogin()` → `guards/guest-access.ts:76` + `isGuest():57-59` 在 **mock 构建放行**（`useMock()` 为真即不算游客）、在 **real 构建无 token** 时 `reLaunch(LOGIN)`（:82）；
  - `goBack()`(:69-83)：`!getToken()` → `replaceAppPath(ROUTES.LOGIN)`；否则 `pages.length>1` → `navigateBack`，`pages.length<=1`（桥直开单子）→ `switchTab(ROUTES.TAB.DISCOVER)`。
  ⇒ 「goBack 属设计」**只在 real 带 + 有 token + 单子栈**下成立；mock 带（`getToken()` 恒空）走的是 LOGIN 分支，与 ledger 记录的 landing=discover 不一致——见 U-3 需要的判据。

## 证据(文件:行)
> 全部行号均为本车道实读复核（不是转抄 ledger）。方法：Grep → Read 窗口。

### E-1 引用漂移（ledger/sort 的引用本身有错，属新发现）
- `sort-round3.json:12/14`（R3-NEARBY-02 evidence/what）与 `sort-round1` 同族引用把 http 层写成 **`apps/client/src/utils/http.ts:493-494`** —— 该文件**不存在**（`ls apps/client/src/utils/` 无 http.ts；`find src -iname "*http*"` 只命中 `src/services/http.ts` 与 `src/tests/services/http-normalize.spec.ts`）。真实路径是 **`apps/client/src/services/http.ts`**，且**行号是对的**：`:493` = `uni.reLaunch({ url: ROUTES.LOGIN });`、`:494` = `}, LOGIN_REDIRECT_DELAY_MS);`（`guards/guest-access.ts:6` 用的就是正确的 `services/http.ts:493` 口径）。
- `pages/login/index.vue:89` 引用**准确**：:87 `if (sessionStore.isLoggedIn && !autoForwardedToMain) {`、:89 `uni.switchTab({ url: "/pages/discover/index" });`（onShow 注册在 :75）。
- `sort-round3.json:68`（R3-05）把匹配页写作 `pages/discover-extra/discover-matching`；实际路由是分包 `subpackages/discover-extra/discover/matching`（`pages.json:143-146` root=`subpackages/discover-extra`、path=`discover/matching`；文件 `subpackages/discover-extra/discover/matching.vue` 存在）。

### E-2 弹链的三个必要环节（附近页）
1. **入口发起一个「无门、无 mock 短路」的受保护请求**
   - `apps/client/src/pages/nearby/index.vue:155-160` `onLoad` → :159 `refreshSchools()`；`:162-171` `onShow` → :166 `refreshSchools()`（**在 :167 的 `canFetchProtected()` 判断之前、且不受它约束**）；下拉刷新 :178 同样。
   - `:75-79` `refreshSchools()` → `void loadSchools().then(...)`。
   - `:66-68` `canFetchProtected(): boolean { return useMock() || getToken().length > 0; }` —— 只门控 circles/posts/activities（:148/:167/:182/:207）。
   - `:176-177` 在册前提是「**校区列表是公开端点**、不进 canFetchProtected 那一组」⇒ **该前提被后端配置证伪**（见 E-3）。
   - `apps/client/src/config/schools.ts:120-122` `loadSchools()` → `loadCampuses()`；`:129-141` catch → 回退本地静态 `SCHOOLS`（**契约本就是「失败不致命」**）。
   - `apps/client/src/services/config.ts:156-161`（修复前为 :145-147）`loadCampuses()` = 裸 `request({url:"/config/campuses", method:"GET"})`，**无 useMock 短路、无 token 门**。
   - 对照：同页其它网络入口都已有门——`utils/location.ts:204-205` `reportLocation()` `if (getToken().length === 0) return;`（注释 :191-198 明确记录：这正是为治「401 → redirectToLogin 强踢登录页，击穿首页/附近页的『未登录预览』形态」而加的，且点名 `MP-R1VIS-PAGES-NEARBY-INDEX-001 / MP-R1-N02-01` 已在 nearby 上实测复现过同一弹链）；`fetchCityFromBackend()`(`:117-124`) 打的是 permitAll 的 `/location/ip-city`。⇒ **`loadCampuses` 是同一缺陷家族里唯一漏治的那一个**。
   - nearby 的子孙组件/composable 零请求（`components/nearby/NearbySection.vue`、`components/village/PostCard.vue`、`composables/useTabBar.ts`、`useMenuButtonRect.ts`、`useStatusBarHeight.ts`、`config/circle-covers.ts` grep `request(|clientApi|getToken` 全空）⇒ 入口路径上的 HTTP 只有上面这一组。
2. **401 → 踢登录页**：`apps/client/src/services/http.ts:688`（`statusCode === 401`）→ :709 `handle401()` → :522-531 `tryRefreshToken()` 失败即 `redirectToLogin()`；`:418-422` `tryRefreshToken()` 在 `getToken()` 为空时**直接 return false**（不带 token 的人必走踢线）；`:468-495` `redirectToLogin()`：:475 `hadSession` 判定、:477 `clearTokens()`、:479-483 toast（`apiErrors.unauthorized` / `apiErrors.loginRequired`）、:491-494 延时 `LOGIN_REDIRECT_DELAY_MS` 后 `uni.reLaunch({url: ROUTES.LOGIN})`。
   - **反向排除**：`http.ts:734-737` `fail:` → `buildNetworkError` → `constants` 口径 `status === 0`（:99），**不触碰** `redirectToLogin`。⇒ 宕掉的 8080 只会产生 network 错误，**产不出 401**，(3) 单独不能解释本弹链。
3. **登录页把「已登录」的人送到 discover**：`pages/login/index.vue:75` `onShow` → :87 `sessionStore.isLoggedIn` → :89 `switchTab("/pages/discover/index")`。
   - 为何 `clearTokens()` 之后仍算「已登录」：`stores/session.ts:339` `isLoggedIn: (state) => Boolean(state.userSession?.loggedIn)` —— **只看会话、不看 token**。这既解释了 settle 落在 discover（而非停在 login），也说明「401 兜底清 token 但不清 userSession」是一处独立的语义裂口（见「需要我拍板的」N-2）。

### E-3 后端鉴权口径（证伪 nearby 的「公开端点」前提）
- `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java:194` `.requestMatchers("/api/v1/**").authenticated()`；permitAll 白名单里与 config 家族只有一条：`:145` `/api/v1/config/legal`；`:137` `/api/v1/location/ip-city`。**`/api/v1/config/campuses` 不在白名单**（`grep -rn "config/campuses|campuses" apps/api/src/main/java` 只命中 `clientconfig/ConfigController.java:57 @GetMapping("/campuses")` 与 `RealConfigService.java:180`，无任何放行规则）。
- `apps/api/.../config/MockSecurityConfig.java:225` 同样 `/api/v1/** → authenticated()`，但 `:241` `MockAuthenticationFilter`（`:252` 判定 `!isPermitPath(requestPath) || isSecuredAuthPath(requestPath)`，`:263/:267` 注入 `ROLE_USER`）对非 permitAll 路径**无条件注入 mock 用户** ⇒ **mock profile 的后端不会对这个端点返 401；real profile 的后端无 token 必返 401。**这是 (1) 与 (3) 的交界面，见 U-1 的判据。

### E-4 带/环境证据（判 (2)(3) 用）
- `reports/audit/ui-audit-2026-10-09/setup-v36.json` 全文：`{"wsUp":true,"port":"9420","routeCount":73,"head":"f9fd17b1","branch":"main","backendUp":true}` ⇒ **该轮 setup 记录后端是活的**（不是宕机态）。
- `reports/audit/ui-audit-2026-10-09/tour-round3.md:3` 「通道：WS 9420（**mock 档** ownerPid=33352）」；`tour-round1.md:30` 与 `:46` 两处把 8080 称做「**real 8080 后端**」。⇒ 现场组合 = **mock 带客户端（`getToken()` 恒空、`isLoggedIn` 本地为真）+ 8080 在跑**；这正是 E-2 链条全效的窗口。
- `apps/client/.env.mp-weixin-mock` = `VITE_API_MODE=mock` + `VITE_API_BASE_URL=http://127.0.0.1:8080/api`；其文件头声明「mock 模式下前端业务请求全部走本地 fixtures（**零网络**）」——**该声明与实现相悖**（`services/http.ts` 无 mock 传输层，见 `utils/location.ts:196-198` 的在册原文；`services/config.ts:156` 这类调用在 mock 带照样打到 8080）。这是一条应当入册的文档/口径漂移。
- `tmp/qa/nearby-switchtab-probe.mjs`（2352B，全文直读）：只做 `currentPage()` → `m.evaluate("wx.switchTab('/pages/nearby/index')")` → sleep 3500 → `currentPage()` → sleep 2500 → `currentPage()`；**无 seed 清除、无 storage 写入、无桥 open、无 query、无重编译**（对照 ledger `R2-OT-06` 记录的「带 query 的桥 open 使 currentPage 回报 .html 代理态」与 `R3-PFI25-03` 记录的「`simulator_open_page` 属 compiler 族 ⇒ open 重编译重启 AppService 清 seed」两条装置副作用，本探针均不涉及）⇒ **(2) 排除**。
- 交叉对照（同轮同法可达性差异）：`tour-ledger.json` routes 里 `subpackages/discover-extra/nearby/people` = **NAV_OK**、`subpackages/tools/love-center/nearby` = **NAV_OK**，只有 `pages/nearby/index` = NAV_FAIL；而这两个能进的页都**不调 `loadSchools()`**（`grep -rn "loadSchools" apps/client/src` 只命中 `pages/nearby/index.vue`、`config/schools.ts`、`subpackages/setup/campus/index.vue:140`，后者 onLoad:131 先过 `guideGuestToLogin()`）。另外 `pages/home/index`（同样跑 `initLocation/reportLocation`，但不跑 loadSchools）四轮可达 ⇒ **归因收敛到 `/config/campuses` 这一发，而非定位权限/开城/业务开关**。
- 业务开关假设也已双源核过：`apps/client/src/config/feature-flags.ts` 与 `apps/client/src/config/navigation.ts` 对 nearby 都**无旗标/无禁用条件**（`grep -n "nearby|city|开城|tab" config/feature-flags.ts` 零命中；`navigation.ts:43-45` nearby 为无条件第五 Tab 之一；`pages.json:404` `tabBar.custom=true`、`:418` 附近条目无条件）。⇒ R3-04 猜的「业务开关」**不成立**。

### E-5 匹配页（R3-05）
- `subpackages/discover-extra/discover/matching.vue:112` `if (guideGuestToLogin()) return;`（`guards/guest-access.ts:72` → `:74` 展示包旁路 → `:76 if (!isGuest()) return false` → `isGuest():57-59` `if (useMock()) return false; return !getToken();` ⇒ **mock 带一律放行**）。
- `:154-172` onLoad 主链：`if (!matchStore.pendingCardId || !matchStore.pendingAction)` → 有 `cardId&action&userId` 走直达分支；否则 **`:171 setTimeout(() => goBack(), 200)`**（桥直开不带 query ⇒ 命中此路径）。
- `:69-83` `goBack()`：`if (!getToken()) { replaceAppPath(ROUTES.LOGIN); return; }`（:74-77）→ 否则 `pages.length>1 ? navigateBack : switchTab(ROUTES.TAB.DISCOVER)`（:78-82）。⇒ **real 带 + 有 token + 单子栈 = 「直开无快照 → 落 discover」= ledger 里那条「goBack 属设计」假说，源码侧成立**；**mock 带（无 token）则会先落 login**，再由 login `:89` 转 discover，终态同为 discover（tour 只读终态 ⇒ 与「落点=pages/discover/index」不矛盾，但机制不同）。
- 「每日配额耗尽」假说**在入口路径上找不到任何支撑**：`grep -rn "quota|每日|dailyLimit|DAILY" matching.vue/stores/match.ts/components/discover/CardSwiper.vue` 只命中展示用的「每日剩余次数」（`CardSwiper.vue:113`）与卡组限量常量 `stores/discover/constants.ts:45 DAILY_LIMIT_TOTAL = 10`（`stores/discover/actions/storage.ts:104` 只赋值给 state）；`grep -rn "switchTab|reLaunch|redirectTo|ROUTES.LOGIN" stores/discover*.ts` **零命中** ⇒ 限量既不驱动跳转，也就不可能产生弹回。
- `stores/match.ts:43-45` `runMatchCheck()` 无快照时 `lastError = "缺少匹配卡片信息"` + status failed → `matching.vue:96-103` failed 分支 toast + 600ms `goBack()` ⇒ 同一 goBack 出口，两种触发（无 pendingCard / 状态机 failed），**必须在带内看栈才能分开**（见 U-3）。

## 修复
**改动清单（仅 1 个文件，`apps/client/src` 内）**
- `apps/client/src/services/config.ts:143-161`：给 `loadCampuses()` 的 `request()` 增加 **`skipAuthRefresh: true`**（+ 在册注释，引用 R3-NEARBY-02 与两端 SecurityConfig 行号）。

**为什么是这一处、且只有这一处**
- `skipAuthRefresh` 是 http 层既有的官方旁路：`services/http.ts:583` 声明、`:694-699` 生效——401 **直接 reject**，不 refresh、不 `redirectToLogin`；同口径在册先例 `services/auth.ts:451-454`（「必须 skipAuthRefresh 让 http 层 401 分支直接短路抛给页面 catch」）。
- 语义匹配：这次读数**是装饰性的、且契约自带兜底**（`config/schools.ts:129-141` 失败回退静态 `SCHOOLS`），它没有资格驱动认证状态机、把用户从 tabBar 上踢走。
- **可见产品行为零变化**：请求成功（200）时一切照旧（动态校区列表仍会渲染）；401 时不再踢线，改为走本来就该走的静态兜底，页面停在附近 tab。Sentry 噪音也不变（`http.ts:865` 对 401 本就不上报）。
- **刻意没做的几件事**（避免越界与伪装）：
  - 没改 `canFetchProtected()` 的覆盖面（若改成用它门控 `refreshSchools()`，mock 带里 `useMock()` 为真照样发请求，**观测到的弹链不会被关掉**，等于假修）；
  - 没改成 `skipAuth: true`（那会不再携带 token，real 带登录用户将**永久**拿不到动态校区列表 = 改了可见行为）；
  - 没动 `pages/login/index.vue:87-89`、`services/http.ts:468-495`、`stores/session.ts:339`（401 兜底与登录页转发都是其它在册判据依赖的既有行为，动它们等于越权改产品语义）；
  - 没改 `SecurityConfig.java`（不在本车道写权限内；且这是 (1) 的另一半正解，见 N-1）；
  - **没有改任何测试断言**：`grep -rn "loadCampuses|config/campuses" apps/client/src/tests/` 零命中，本改动不在任何断言的射程内；`tests/pages/guest-landing-pairs.spec.ts` 的用例表不含 `pages/nearby/index`（不要求它加 `guideGuestToLogin`）。
- 没有为「不可能发生的场景」加兜底：这条 401 是被实测过的（同一端点同一弹链在册 N02 复现记录 `utils/location.ts:197-198`），不是假想分支。

**离线检查（实跑，如实报）**
- `pnpm -C apps/client run typecheck`（vue-tsc --noEmit）→ **exit 0**。
- `pnpm -C apps/client run test:unit`（`node scripts/run-vitest.mjs run --config vitest.config.ts`）→ **exit 0，Test Files 121 passed (121) / Tests 1366 passed (1366)，耗时 476.67s**。
- 两者都用 `D:/codex-tools/node-v22.17.0-win-x64`（node v22.17.0）跑：`/d/codex-tools/node-v22.17.0-win-x64/pnpm` 在 PATH 上，但 PATH 上的 `node` 是微信开发者工具的 node（v16），故显式前置 node22 到 PATH。
- 附带确认：单测里 `[ENV] 诊断` 输出 `apiMode: 'mock', apiBaseUrl: 'http://127.0.0.1:8080/api'` —— 再次印证 mock 带指向 8080。
- `git status` 复核：本车道唯一改动 = `apps/client/src/services/config.ts`；`scripts/qa/*`、`reports/audit/ui-audit-2026-10-09/tour-ledger.json` 的 M 态属其它车道，我未触碰；未 commit。

## 未证
- **U-1（把 (1) 与 (3) 彻底分开的唯一测量，需要 8080 活着）**：我接手时 `curl -s -m 3 http://127.0.0.1:8080/actuator/health` → **无输出、exit 7（拒绝连接）**，所以现在无法给出带内读数。拉起后端后请跑这两条，把输出直接贴给我：
  1. `curl -s -o /dev/null -w "%{http_code}\n" -X GET "http://127.0.0.1:8080/api/v1/config/campuses"`（**不带** Authorization）
  2. `curl -s "http://127.0.0.1:8080/actuator/health"` + 后端启动日志里 `The following N profiles are active: ...` 那一行（判 real/mock）

  判读：`401` + `profiles are active: real` ⇒ **E-2 链条逐环坐实，产品根因 (1) 定谳**（且我的 `skipAuthRefresh` 是对症的）；`200` + `mock` ⇒ mock profile 的 `MockAuthenticationFilter` 注入了 mock 用户，这条端点在 mock profile 下**不产生 401**，则审计现场的弹回必须另有 401 源（最可能是 real 带种子 token 被拒 / 或 mock-client 连 real-profile 后端的带配错），届时本修复仍是必要但非充分项，需按新读数重立候选。**注意：`200` 也不能反证「不是 (1)」**——审计轮的 setup 只记了 `backendUp: true`、没记 profile，两带的 8080 行为差别正是这条测量要闭合的。
- **U-2（附近页行为证据缺口）**：修复是 **source-level，行为未取证**。我没有跑 executor、没有起 DevTools/浏览器（按令），也没有真机/模拟器通道。闭案判据沿用 ledger 已验证过的形态：重跑 `tmp/qa/nearby-switchtab-probe.mjs`，期望 `AFTER=pages/nearby/index` 且 `AFTER_SETTLE=pages/nearby/index`（原读数 `AFTER=pages/login/index / AFTER_SETTLE=pages/discover/index`）。**另需在 mock 带与 real 带各跑一次**（R3-NEARBY-02 自述「探针 mock 带实证、real 带未测」，此欠账不因本次修复而免除）。闭案后再补 nearby 内容面四轮零覆盖的巡检。
- **U-3（匹配页定谳缺口）**：源码只能证到「两条出口都存在」，分不开审计现场走的是哪条，需要一次带内读数。最小探针（照 nearby-switchtab-probe 的写法，勿用桥 open 带 query）：进 `subpackages/discover-extra/discover/matching` 后**立刻**连续采 3 次 `getCurrentPages()` 全栈（不只终态），并同刻采 `wx.getStorageSync` 的 token 键、`matchStore.pendingCardId/pendingAction`、`store 里的 deck 卡片数`，外加 console 里有无 `apiErrors.unauthorized/loginRequired` toast / 401 请求日志。判读：栈里出现 `pages/login/index` ⇒ 走 `goBack()` 的 `!getToken()` 分支（mock 带）或 401 兜底（看有无 401 日志区分）；栈是 `[…, matching] → discover` 且**无 login 帧** ⇒ 「直开无 deck 快照 → goBack 属设计」定谳（real 带单子栈）。顺带把种子 deck 夹具补上后即可跑 matching 内容面。
- **U-4（未纳入本次修复、但同一机制家族）**：`redirectToLogin()` 只 `clearTokens()`，不清 `userSession`；`stores/session.ts:339` 的 `isLoggedIn` 只看 session ⇒ 「token 已失效但 session 仍在」时，登录页 `onShow:87-89` 会把人**立刻送回内容 tab**（discover），用户既没登录也拿不到登录页。审计现场 `nearby→login→discover` 的第三跳就是这条。我只关掉了「附近页不该发的那发 401」，**没有动这条更深的会话/token 语义裂口**（改它会连带影响 `usePageAccess`、登出、切号提速等既有在册判据），列为 N-2 请拍板。
- **U-5**：我没有核 `/api/v1/config/*` 家族其余端点（`/config/match-preferences`、`/config/filter-options`）在各自调用页的入口门（`config/match-form.ts:40`、`stores/campus.ts:417-421`）；若那些页也在 onLoad 无条件调用，同族缺陷仍在（本轮无实测弹回记录，故未扩改）。

## 需要我拍板的
- **N-1（归属）**：`GET /api/v1/config/campuses` 到底**该不该公开**？客户端三处（`config/schools.ts:113-121` 契约注释、`pages/nearby/index.vue:176-177`、`services/config.ts:141-143`）都按「公开配置 + 本地兜底」实现，后端 real profile 却把它锁在 `SecurityConfig.java:194` 的 `authenticated()` 之后，而同族的 `/config/legal`(`:145`) 是 permitAll——**这是后端自身的口径不一致**。我的 `skipAuthRefresh` 只是客户端侧止血（不再让一次装饰性读数把人踢下线）；**正解是后端把 `/api/v1/config/**` 放行（或客户端改成有 token 才拉、并把静态 `SCHOOLS` 承认为正式形态）**。该决策属 API 车道 + 产品 owner，不属本车道，请勿把「客户端已修」当「契约已一致」。
- **N-2（归属：会话/token 语义）**：`redirectToLogin()` 清 token 不清 `userSession`，登录页 `onShow` 又因 `isLoggedIn` 仍为真而立刻 switchTab 到 discover。要不要让「登录已过期」真正把人**留在登录页**（即 `clearTokens()` 同处清/降级 session，或 login 的 onShow 转发加 `getToken()` 条件）？这是可见行为变更，影响登出/切号/`usePageAccess` 多处在册判据，我没动。
- **N-3（附近 tab 的可见性口径）**：附近页**设计上就允许游客停留**——`pages/nearby/index.vue:116` `protectedBlocked` + 模板 `:621-633` 的 `nearby-login-guide`（未登录在页内给「去登录」钮），加上 `utils/location.ts:191-194` 的在册裁定（「击穿首页/附近页的『未登录预览』产品形态」被判为缺陷并治之）。所以修复方向是「补请求门」而不是「把附近 tab 藏起来/禁掉」；`config/navigation.ts:43-45`、`pages.json:418` 的 tab 条目无需改。**如果**产品 owner 想反过来（未登录不给看附近），那要改的是 tab 渲染与页面 LockScreen 形态，是一条独立产品决策，请明示。
- **N-4（审计装置侧）**：R3-NEARBY-02 的引用需订正两处：`utils/http.ts` → `services/http.ts`（行号不变）；R3-05 的 `pages/discover-extra/discover-matching` → `subpackages/discover-extra/discover/matching`。另 `apps/client/.env.mp-weixin-mock` 的「mock 模式零网络」声明与实现不符（`utils/location.ts:196-198` 已在册反驳），建议按文档漂移入册，以免下一轮把它当成「mock 带不打 8080」的前提来推归因。
