# WF-CLAIM-VERIFICATION — v32 WORKFLOW 段事实核验

核验对象：`D:\6\恋爱小程序\.zcode\workflows\miniprogram-qa-loop-v32.dwf.ts` 第 25–84 行 `const WORKFLOW` 段（build / realEnv / instrument 三块）。
方法：逐条对仓库现状（磁盘、源码、node_modules、配置）证伪/证实。判定：✅成立 / ❌不成立 / ⚠️部分成立 / ❓查证不了。

## v32 声明原文（以文件为准）

```
build:
  mockScript: "build:mp-weixin:mock"
  realScript: "build:mp-weixin:real:dev"   // 注释：本地联动用 real:dev；发布形态才用 build:mp-weixin:real
  sharedOutDir: "apps/client/dist/build/mp-weixin"
  realOutDir: "apps/client/dist/build/mp-weixin-real"
  outDirEnvKey: "UNI_OUTPUT_DIR"           // 注释：已实测 @dcloudio/vite-plugin-uni/dist/cli/utils.js:128-131 支持用它改道
realEnv:
  apiBaseUrl: "http://127.0.0.1:8080/api"
  healthPath: "/actuator/health"
  requireBackendUp: true
  wechatLogin: "dev-fallback-off-means-502"  // 注释：实测本机后端 WECHAT_DEV_FALLBACK_ENABLED=false → /auth/wechat-login 必 502
  guestLoginWorks: true       // 注释：实测 /auth/guest-login 200，是 real 模式唯一可用的自动登录入口
instrument:
  forbidPlaceholderSelector: true
  unresolvedVerdict: "UNVERIFIED-INSTRUMENT"
  requireManifestTotalReconcile: true
```

## 核验表

| # | v32 声明原文 | 仓库事实 | 判定 | 证据 file:line | 应改成的值 |
|---|---|---|---|---|---|
| 1a | `build.mockScript = "build:mp-weixin:mock"` | 精确存在于 apps/client scripts；根 package.json 无任何 mp-weixin 脚本（只有 client:dev:h5 类经 workspace 转发） | ✅成立 | apps/client/package.json:26 | 保持；执行须 `pnpm -C apps/client run` |
| 1b | `build.realScript = "build:mp-weixin:real:dev"` | 精确存在。同表 mp-weixin 脚本全集：`dev:mp-weixin`(23) / `dev:mp-weixin:debug`(24) / `build:mp-weixin`(25) / `build:mp-weixin:mock`(26) / `build:mp-weixin:showcase`(27) / `build:mp-weixin:real`(28) / `build:mp-weixin:real:dev`(29) | ✅成立 | apps/client/package.json:29 | 保持 |
| 2 | `sharedOutDir` / `realOutDir` 磁盘存在性/修改时间/产物 | 两者均存在且为完整产物（app.js / app.json / app.wxss / project.config.json / sitemap.json / pages / config … 齐全）。shared mtime **2026-09-25 00:08:35**；real mtime **2026-09-24 22:55:20**（早于 shared 约 1.2h）。dist/build 下另有 8 个历史 `mp-weixin-*` 备份目录 | ✅成立 | `D:\6\恋爱小程序\apps\client\dist\build\{mp-weixin,mp-weixin-real}` | 保持；注意 real 产物比 mock 旧，G7 断言前应重新构建 |
| 3 | `outDirEnvKey = "UNI_OUTPUT_DIR"` + utils.js:128-131 支持改道 | 变量名正确。实测逻辑：127 `const hasOutputDir = !!process.env.UNI_OUTPUT_DIR;` → 128 `if (hasOutputDir) {` → 130 `options.outDir = process.env.UNI_OUTPUT_DIR;` → 131 `}`，行号与"用它改道"完全吻合；else 分支(135)才回落 `dist/build/<platform>`。⚠️两个真实风险：(a) outDir 按 cwd 解析，构建用 `pnpm -C apps/client` 时 cwd=apps/client，而 v32:1247 传入的是仓库根相对路径 `apps/client/dist/...`，会算成 `apps/client/apps/client/dist/...`；(b) v32:548 已自认 prepare-static / prune-unreferenced-static / verify-build-features / verify-package-size **硬编码** sharedOutDir，改道轮会打到共享目录（prune 还会删文件） | ⚠️部分成立（声明本身成立，但按 v32 用法执行会失效） | node_modules/.pnpm/@dcloudio+vite-plugin-uni@3_19157bf.../node_modules/@dcloudio/vite-plugin-uni/dist/cli/utils.js:127-131 | 键名保持；v32:1247 的取值应改为相对 apps/client 的 `dist/build/mp-weixin-real`，并在改道构建时显式跳过那 4 个硬编码脚本 |
| 4 | `apiBaseUrl = "http://127.0.0.1:8080/api"` | server.port=`${APP_PORT:8080}`，**无 server.servlet.context-path**（全仓 grep 无命中）；`/api` 是控制器自身映射前缀（/api/v1/...），非 context-path。real mp-weixin 构建走 vite `--mode real` → 读 `.env.real`，其 `VITE_API_BASE_URL=http://127.0.0.1:8080/api`；已构建产物 `dist/build/mp-weixin-real/config/env.js` 内含 `MODE:"real"` + `VITE_API_BASE_URL:"http://127.0.0.1:8080/api"`（G7 断言文件确实存在且自证）。v32:1227 健康检查用 `apiBaseUrl.replace(/\/api\/?$/,'')+healthPath` 拼出 8080 根路径，与 `/api` 前缀只在业务接口一致 | ✅成立 | apps/api/src/main/resources/application.yml:58-59；apps/client/.env.real:6；apps/client/dist/build/mp-weixin-real/config/env.js | 保持 |
| 5 | `healthPath = "/actuator/health"` | spring-boot-starter-actuator 在依赖中；application.yml 暴露 `include: health,info,prometheus,metrics`；real 与 mock 两套安全配置均把 `/actuator/health`、`/actuator/health/**` 设为 `permitAll`（仅 `/actuator/**` 其余要 ADMIN）。`show-details: when_authorized` 只隐藏细节不影响 200。docker-compose API 容器 healthcheck 正是 `curl http://localhost:8080/actuator/health` | ✅成立 | apps/api/pom.xml:119；apps/api/src/main/resources/application.yml:103,117；apps/api/.../config/SecurityConfig.java:162；MockSecurityConfig.java:200；docker-compose.yml:274 | 保持 |
| 6a | `wechatLogin = "dev-fallback-off-means-502"`（注释：键名 WECHAT_DEV_FALLBACK_ENABLED=false → /auth/wechat-login 必 502） | 键名/默认值正确：`dev-fallback-enabled: ${WECHAT_DEV_FALLBACK_ENABLED:false}`，Java 字段亦默认 false。链路：off → 真调 jscode2session → appid/secret 缺失或 errcode≠0 → `WeChatAuthException` → RealAuthService 映射为 `WechatLoginException.WECHAT_API_ERROR` → HttpStatus.BAD_GATEWAY=**502**（熔断返回 null 同样 502）。⚠️两处不精确：(1) 路径应为 `/api/v1/auth/wechat-login`（旧别名）或推荐 `/api/v1/auth/wechat`，注释漏了 `/api/v1`；(2) 若上游返回 errcode=40029（code 失效）→ 401，非 502；本机 QA launcher 只配 WECHAT_APPID 不配 WECHAT_SECRET → 稳定走 502，故"必 502"在该环境成立 | ✅成立(结论)/⚠️路径与例外注记 | apps/api/.../resources/application.yml:268；WeChatConfig.java:27；RealAuthService.java:337-357；WechatLoginException.java:37；AuthController.java:161 | 值可保留为标记串；如作文档应写全路径 `/api/v1/auth/wechat-login`，并注明"仅当上游非 40029 时 502" |
| 6b | `guestLoginWorks = true`（注释：实测 /auth/guest-login 200，real 唯一自动登录入口） | 端点 `/api/v1/auth/guest-login` 存在，`loginAsGuest` 只依赖 DB+JWT、不碰微信/外部服务，开启即 200（运行产物 tmp_r2_guest.json 为证）。**但**：real profile 默认 `app.guest-login.enabled=${APP_GUEST_LOGIN_ENABLED:false}` → 默认关闭时 `loginAsGuest` 抛 OperationForbiddenException → **403 TRIAL_LOGIN_DISABLED**（RealAuthService.java:692-698）。仅当启动环境显式置 `APP_GUEST_LOGIN_ENABLED=true` 才 200：canonical QA launcher `scripts/launcher/scripts-start-backend.cmd:31` 与根 `.env:17` 已设 true（start-real.sh 会 source .env）；而 `apps/api/start-local.bat` 未设 → 该脚本下 guest 会 403 | ⚠️部分成立（依赖 env 开关，非 Spring 默认） | RealAuthService.java:691-698；application-real.yml:163；scripts/launcher/scripts-start-backend.cmd:31；.env:17 | 保留 true，但 G8/G9 前置须断言后端以 `APP_GUEST_LOGIN_ENABLED=true` 启动，否则 guest 登录 403 会被误判为产品缺陷 |
| 7 | G9 real 模式素材可达性（图片/媒体 URL 来源、本地不可达情况） | real 模式下 `IMAGE_PATHS` 基址不再是包内 `/static`，而是运行时改写为后端托管：`images.ts:22,26-30` 取 `VITE_API_BASE_URL` 去尾 `/api` + `/api/v1/media/app-assets`，即 `http://127.0.0.1:8080/api/v1/media/app-assets/{assets,generated}/...`（`/static` 仅 mock/dev 使用）。该端点 `MediaAccessController` 标 `@Profile("real")`、`/api/v1/media/app-assets/**` 在 real/mock 安全配置均 permitAll（免登录）。⚠️三个真实不可达条件：(a) 依赖后端在 8080 存活（与 G8 requireBackendUp 绑定，后端挂则全站图裂）；(b) 文件须存在于存储根 `apps/api/uploads/app-assets/{assets,generated}`（当前磁盘确有，目录 stat `2026-08-29 15:43:29`）；(c) **real profile 额外做注册表校验**：需 `media_asset` 表存在 `url+type=app_asset+audit_status=approved` 记录，缺行或后台「图片审核」驳回即返回 **404**（MediaAccessController.java:348-352）——磁盘有文件≠能访问。另 :529 记载前缀双拼 404 隐患。⚠️未发现指向真正外部对象存储/SLS 的硬编码：src 内 `cdn.example.com / images.pexels.com` 等多为注释与占位，非运行期素材源 | ⚠️部分成立（可达=后端存活 ∧ 文件在盘 ∧ 注册表 approved，三者缺一即裂图） | apps/client/src/config/images.ts:22,26-30,44-46；apps/api/.../media/MediaAccessController.java:69,88,342,348-352；config/SecurityConfig.java:175；MockSecurityConfig.java:209；`apps/api/uploads/app-assets/{assets,generated}` | 补 G9 前置断言：real 轮开工前对若干代表 URL（如 app-assets/assets/images/…jpg）HEAD/GET 200 探测，404 即判素材 BLOCKED 并提示跑素材同步/审核播种，不得把"图裂"记为产品 FAIL |

## 结论汇总

7 条声明中：完全成立 4 条（1a、1b、2、3 声明本身、4、5），部分成立/有隐性失效风险 3 类：
- **3（构建改道用法）**：键名与 utils.js:127-131 行号精确成立，但 v32:1247 把仓库根相对路径传给按 cwd(=apps/client) 解析的 `UNI_OUTPUT_DIR`，且未跳过硬编码 sharedOutDir 的 4 个脚本 → 实际执行会打错目录或被 prune 删文件。
- **6a/6b（登录）**：502 与键名成立；但 wechat 路径注释漏 `/api/v1`、errcode 40029 会 401 非 502；guest `works=true` 只在后端以 `APP_GUEST_LOGIN_ENABLED=true` 启动时成立，real profile Spring 默认 false→403。
- **7（G9 素材）**：real 素材 URL 确实来自后端 app-assets（非包内 static），但可达性=后端存活 ∧ 文件在盘 ∧ media_asset 注册 approved 三条件与门，DB 未播种/被驳回会 404，当前 v32 无此探测。

查证不了：无（每条均已定位到源码/配置/磁盘证据）。app-assets 文件 mtime 精确核验为 2026-08-29 15:41~15:43。

## 必须修正清单

1. **[高] v32:1247 改道构建路径口径错误**：`UNI_OUTPUT_DIR` 被 utils.js 按构建 cwd 解析，而脚本用 `pnpm -C apps/client run`（cwd=apps/client）。`realOutDir="apps/client/dist/build/mp-weixin-real"` 是仓库根相对路径，注入后会变成 `apps/client/apps/client/dist/...`。改为相对 apps/client 的值 `dist/build/mp-weixin-real`（或改用 `--outDir` 参数 / 绝对路径），并在改道构建时显式跳过 prepare-static / prune-unreferenced-static / verify-build-features / verify-package-size 四个硬编码 sharedOutDir 的脚本（v32:548 已自认，但需在执行步骤里落实为跳过，否则 prune 会删共享 mock 产物）。
2. **[高] G8 guest 登录前置须显式设 env**：不要假定 `guestLoginWorks=true` 恒成立。real profile 默认 `app.guest-login.enabled=false`→403。G7/G8 启动后端步骤必须带 `APP_GUEST_LOGIN_ENABLED=true`（与 scripts/launcher/scripts-start-backend.cmd:31、.env:17 一致），或在 G8 里把 guest 403 判为「环境未启用体验入口」而非产品 FAIL。
3. **[中] 修正登录端点全路径与例外码**：把注释里的 `/auth/wechat-login`、`/auth/guest-login` 写成 `/api/v1/auth/wechat-login`（推荐 `/api/v1/auth/wechat`）、`/api/v1/auth/guest-login`。`wechatLogin` 语义补注：dev-fallback off 且上游非 40029 时→502；40029→401。
4. **[中] G9 增加素材可达性探测**：real 轮开工前对代表 URL（`http://127.0.0.1:8080/api/v1/media/app-assets/assets/images/...` 等）做 GET/HEAD 200 探测；404 判为「素材未注册/被驳回」→ BLOCKED 并触发素材同步+media_asset approved 播种，禁止把图裂直接记 FAIL。明确 real 素材源=后端 app-assets（磁盘 apps/api/uploads/app-assets + DB 注册表），非包内 /static，也无外部对象存储。
5. **[低] G7 前重新构建 real 产物**：当前 `dist/build/mp-weixin-real` mtime(09-24 22:55) 早于 mock(09-25 00:08)，G7 断言 env.js 前应先执行 real 构建以免消费旧产物。声明 4/5（apiBaseUrl、healthPath）、1a/1b（脚本名）无需改动，已逐项证实。
