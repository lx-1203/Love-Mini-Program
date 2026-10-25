# Full-audit remediation closeout — P0-4 访客身份隔离（guest-login）

分支：`codex/full-audit-closeout`
基准实现提交：`bd765cfa`（fix(auth): 体验账号按会话创建独立访客身份，不在本收口 amend）
收口日期：2026-10-25
范围：仅 P0-4 规格评审后的四项可执行缺口（写放大限流、行增长/陈旧文档、产品裁定与清理留痕、反复用源码守卫加强）。无破坏性数据库清理、无新增 schema、无无关改动。

## 1. 产品裁定反转（可审计留痕）

- **反转前次裁定**：2026-09-06/09-07 曾以「稳定体验账号」名义引入「优先复用库中最近体验号」分支（`UserRepository.findFirstByOpenidStartingWithAndRoleAndStatusOrderByIdDesc` 命中即返回同一 `userId`/同一枚 JWT，固定体验号 `100151`「阿辰」）。P0-4 判定其为账号隔离缺陷：真实库只要存在任意一条 `guest:` 记录，所有访客就会共用同一账号，资料/帖子/点赞/私信/钱包跨访客互串。**该裁定被推翻**，派生查询随复用分支一并摘除，改为每次调用按 `guest:{UUID}` 新建独立身份，`deviceId` 不构成复用键。
- 相关文档/文案同步纠偏：`RealAuthService#loginAsGuest` 与 `GuestDemoDataProvisioner` 类 Javadoc、`apps/client/src/services/auth.ts`（guest-login JSDoc 原误挂在 `sendSmsCode` 上，已移回 `loginAsGuest` 并补 `sendSmsCode` 自身 JSDoc）、`apps/client/src/App.vue` 展示模式注释（删除「mock 幂等」表述）、`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts:80` REAL_ENV 文案（删除 `100151`/幂等签发，说明 A/B 双身份现可各签独立访客）。

## 2. 写放大成本与当前缓解

- **成本为 O(logins)**：每次体验登录落库约 **70 行**（`users` 1 + 基本/校园/日程资料 + 实名认证 4 + `GuestDemoDataProvisioner` 演示数据 ≈ 66：3 会话 + 25 私信 + 15 喜欢 + 10 访客 + 7 通知 + 2 互关注 + 2 活动报名 + 2 悄悄话）。随登录次数增长，而非随账号数收敛。
- **当前缓解**（本次收口内）：
  1. `app.guest-login.enabled` 默认 **false**（P0-14），商业化默认关闭该公开入口；
  2. `AuthController#guestLogin` 新增 IP 限流 `@RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")`，与兄弟公开认证写入口（register / phone-login / wechat-login / admin-login）同口径——支持正常冷启动，触发限流返回 429，不引入全局限流。测试见 `apps/api/src/test/java/com/campuslove/api/auth/AuthControllerGuestLoginRateLimitTest.java`（注解 + 端到端拒绝 + 兄弟端点负向对照）。

## 3. 既有 prod-sanitize 不清理 guest 本体

- `database/sanitize/prod-sanitize.sql` 只按 `openid LIKE 'seed-user-%'` 清种子用户、按 `conversation_uid/client_request_id LIKE 'guest-demo-%'` 清 `GuestDemoDataProvisioner` 播种的会话/悄悄话、清历史走查号；**不涉及 `guest:%` 前缀的 `users` 记录及其 profile 行**（`user_basic_profile` / `user_campus_profile` / `user_schedule_profile` / `real_name_certification`）。因此 prod-sanitize **不能**回收体验登录写放大的主体行。

## 4. 清理不在本提交实现（需独立裁定）

- 任何针对 `guest:%` 用户/资料行的定时清理都需要**单独的产品/DB 策略裁定** + **备份与 ROLLBACK 干跑**（对齐 `database/backup` 既有协议），不得由本收口臆造破坏性清理。**本提交未实现任何清理逻辑。**

## 5. RepoWiki 生成快照：待重新生成（未手改）

- `.qoder/repowiki/**` 为工具生成的知识快照，其中「体验账号/注册登录/认证 API」等页仍可能保留旧的「幂等/固定体验号」表述。**本次不手改生成快照**；待下一轮 RepoWiki 重新生成覆盖。此为已知待办，非源码事实来源。

## 验证证据（本次收口）

- `AuthControllerGuestLoginRateLimitTest` 3/3 通过；`RealAuthServiceTest` 27/27（新增 3 条结构级反复用守卫，含正锚防空转）。
- 反复用守卫从「仅字面量 `userRepository.find`」升级为：方法体调用图扫描（禁止 guest+取数动词的 helper 调用）、`RealAuthService` 反射枚举（禁止返回 User 且名字含 findGuest/latestGuest 的方法）、`UserRepository` 反射枚举（禁止 openid 前缀派生查询），各配正锚。

## 6. 测试门禁真实接线（P2-4）

- 根 `test` 现实际串行执行：结构/部署/CI/终验汇总契约、Admin 单测、Client 覆盖率、`api:verify`、Client 单测；不再只声明脚本而无人调用。
- CI 对应步骤：Admin job 执行 `pnpm --filter @campus-love/admin run test:unit`；Client job 执行 `test:coverage`；API job 执行 `mvn verify`（JaCoCo `check` 绑定 verify）。
- 首次执行 Client 覆盖率（124 files / 1403 tests 全绿）实测：lines/statements **23.9%**、functions **38.81%**、branches **63.47%**；旧阈值 80/75 从未被任何 CI/根命令执行。现按实测基线安装棘轮阈值 23/38/63（只允许后续上调），不通过扩大 exclude 伪造达标。
- 本地 Windows 因仓库路径含非 ASCII，Spring Boot `repackage` 重命名 `target/*.jar` 会失败；根 `api:verify` 仅跳过 repackage 以执行测试 + JaCoCo check，CI 的 `mvn verify` 不跳过打包。该边界不改变 Linux CI 的打包验证。

## 7. R16 历史欠账与视觉基准（P3-1）

- 生成 `reports/audit/2026-10-25-r16-disposition-ledger.json`：214 条逐条入账（P2=150 / P3=64），每条保留 id、严重度、轴、批次、页面、文件、源码锚点与当前 HEAD 处置。
- **默认状态全部为 `UNVERIFIED_AT_CURRENT_HEAD`**：本轮没有重跑 UI 帧、像素对照与逐条复判，不承接 R16 的 8/8 收口门为全产品验收，也不关闭任何历史行。
- 源码锚点：214/214 在生成时路径可读且行号未越界（`ANCHOR_PRESENT_UNVERIFIED`）；这只证明引用可读，不证明缺陷仍可复现。
- 视觉基准：`素材/理想效果图` 的 19 张基准图已入库；按 `baseline-manifest.json` 逐文件重算 SHA-256，19/19 **MATCH**、0 drift。字节一致只证明比对输入未变，不证明 UI 与基准一致。
- 复算命令：`node scripts/qa/build-r16-disposition-ledger.mjs`；契约测试：`node tests/r16-disposition-ledger.spec.mjs`。
- 未验证项：当前 HEAD 的微信开发者工具/真机帧、R16 P2/P3 逐条视觉复判、`wx.login` 真机链路、生产包上传与审核。没有这些证据前，P3 不得批量销账。

## 8. P1-5 发布实机：外部阻断（未执行，不冒充上线）

本仓当前环境值明确不是可发布配置：

- `apps/client/.env.production`：`https://api.campuslove.example.com/api`（example.com，发布守卫拒绝）。
- `apps/client/.env.real` 与 `.env.mp-weixin`：`http://127.0.0.1:8080/api`（loopback + HTTP，微信合法域名不通过）。
- `node scripts/verify-env-release.mjs` 自测 7/7 通过，但其对当前真实配置的拒绝是**正确行为**，不得通过放宽守卫“修复”。

解除阻断所需外部输入（Secret 不进聊天/不进仓库，由部署方在本地或密钥系统注入）：

1. 真实 HTTPS API 域名（例如 `https://api.<domain>/api`），写入 `.env.production` / `.env.real` / `.env.mp-weixin` 的 `VITE_API_BASE_URL`。
2. 微信小程序 AppID（`WX_APPID`），以及服务端 `WECHAT_APPID` / `WECHAT_SECRET`。
3. 部署级 `APP_AES_SECRET`、`WEBSOCKET_ALLOWED_ORIGIN_PATTERNS`、CORS/域名白名单与其余 Compose 必填项。

具备输入后的执行顺序（尚未运行）：

```bash
node scripts/verify-env-release.mjs
WX_APPID=wx... pnpm --filter @campus-love/client run build:mp-weixin:real
# 微信开发者工具导入 dist/build/mp-weixin-real；真机 wx.login → /auth/wechat → 会话
# 然后在 staging 记录当前 HEAD、域名、AppID、构建 band 与截图/请求证据
```

在以上证据齐全前：P1-5 保持“外部阻断”，不得声称可发布、已上传或真机登录已验。

## 9. 第二轮复量与补齐（2026-10-25 下午，HEAD 起点 `4b2bb72e`）

本节只记本轮**实测**结果。上文 §1–§8 原文一字不动。

### 9.1 复量方法与结论

对 P0–P3 十五项逐条回源码复核（不采信提交信息），并给每条找阳性对照。结论：
P0-1…P0-4、P1-5…P1-8、P2-10…P2-13 的**主修法成立**；但复量暴露出 8 处真残口，
其中 5 处是「上一轮声称已收口、实测只覆盖一部分」，另有 3 处 HEAD 级基础设施红。

| 残口 | 实测事实 | 本轮处置 |
| --- | --- | --- |
| AUDITOR 写按钮（计划 14d） | 上轮只接了 4 个视图；按「api 模块真发写请求的导出函数 ∩ 各视图 import 的符号」重取，写页面共 **32 个**，**28 个**零 `canWrite` | `1c566852` |
| 上传幂等键（计划 5 的另案） | `idem-UPLOAD-<hash(endpoint\|文件名)>` 让同一文件 4h 内二次上传必撞 409，注释自认「另案处理」 | `6501e2bd` |
| 反馈图上传（计划 7 同类） | `uploadFeedbackImage` 未解 `ApiResponse` 信封，真机上传成功后调用方必然报错 | `6501e2bd` |
| 活动分页读取（计划 6） | `data.content.map` 无形态守卫；首屏失败后 `hasMore` 留在 true | `e42935eb` |
| 幂等 TTL 断言（计划 5） | 断言两端同源（都取 `DEFAULT_TTL_SECONDS`），常量改任何值都绿；文案仍写 24h | `0f23f116` |
| Compose 判据（计划 8） | 全文正则，挂到 admin 服务上也算过 | `fc55ddd4` |
| CI 扫描判据（计划 10） | 只查全文出现过 metadata tag，build 步骤自己的 `with.tags` 就满足它 | `f062b291` |
| 全页冒烟落点（计划 11） | `redirectFallbacks` 把首页/寻觅/我的列为合法落点 ⇒ 整站弹回首页可 73 绿 | `eb7f268c` |

### 9.2 本轮新发现的 HEAD 级基础设施红（此前不在任何册子里）

1. **H5 根本构建不过**：`npm run build:h5` 在 `4b2bb72e` 上 REAL_EXIT=1，
   报 `[vite:css] [sass] expected "{".` 指向 App.vue 的 @import 行；真因是
   `apps/client/src/styles/tokens.scss` 首字节是 UTF-8 BOM（`EF BB BF`）。
   uni/vite 走 sass legacy API，把 @import 目标当字符串再解析 ⇒ BOM 不在 0 位即语法错。
   误导性在于：同一份内容用 `sass.compile` 当独立文件编译是**成功**的（101KB CSS）。
   摘 BOM 后 `DONE Build complete.` / REAL_EXIT=0。判点与因果写进 `1b2d366b`。
   先量再改：`apps/client/src` 下 14 个 .scss/.css 只有这 1 个带 BOM；
   另有 58 个 .vue 带 BOM 但构建不受影响，故不顺手清理。
2. **CI 的 lint 步骤在 HEAD 是红的**：`npm run lint` 2 errors（`env.d.ts:42/:49` 的 any）。
   按既有裁定根级 lint 不属预期红名单 ⇒ 红了就是真红。两处 any 都有承重
   （IntrinsicElements 兜底索引签名、`<switch @change>` 载荷），
   收窄载荷会让 11 处按 DOM `Event` 标注的处理函数在 vue-tsc 下全线不兼容（实测撞过），
   故处置只到行级 disable + 原因注释，不动规则、不放宽 exclude（`b4d37dcb`）。
3. **根级 10 条契约门 CI 只跑 1 条**：ci.yml 仅执行 `test:structure`，其余 9 条只在本地。
   现并成 `test:contracts` 单入口接进 CI，并把接线判据升级为**磁盘枚举对账**
   （新增一条 spec 忘记接线即红，阳性对照已验）（`44dd0f69`）。

### 9.3 判据活性（本轮每条新门都做了变异对照）

| 门 | 变异 | 读数 |
| --- | --- | --- |
| `tests/admin-write-gate.spec.mjs` | 关掉 http 层守卫 | 4 拦截用例红 / 4 放行用例仍绿 |
| `tests/third-party-binding-audit.spec.mjs` | SQL 追加 `DELETE FROM` | 红并点名被禁语句，还原即绿 |
| `tests/gate-wiring.spec.mjs` | 放一条未接线的 spec | 红「存在于磁盘但没有任何根脚本执行它」 |
| `tests/ci-contract.spec.mjs` | 把本地扫描 `if` 翻成 push 档 | 红「必须与 build-api.with.load 同文」 |
| `tests/deployment-config.spec.mjs` | 把必填项从 api 挪到 admin | MUTATED_SPEC_EXIT=1；旧全文正则同情形**照样绿**（实测命中 true） |
| `IdempotentInterceptorTest` 场景 14 | `DEFAULT_TTL_SECONDS` 改回 24h | 15 run / 1 failure，红的正是本用例 |
| `tests/project-structure.spec.mjs` BOM 判点 | BOM 加回 | 红并点名文件 |

### 9.4 本轮实测读数汇总

- 根级契约链 `npm run test:contracts`：CHAIN_EXIT=0（10 条，其中 prototype 为设计内 skipped）。
- 客户端：`vitest run` 127 files / **1414** tests 绿；`vue-tsc --noEmit` REAL_EXIT=0。
- 管理端：`vitest run` 5 files / **38** tests 绿；`vue-tsc --noEmit` REAL_EXIT=0。
- 后端定向：`IdempotentInterceptorTest` 15/15 绿（REAL_EXIT=0）。
- E2E（chromium-mobile，本机 dev server，`E2E_API_MODE` 缺省 mock）：
  判据收紧后全量首跑 **69 passed / 4 failed**；三条误红经源码派生转绿、
  `setup/dev` 经 devOnly 派生转绿；**定版全量复跑 73 passed / 1 failed（REAL_EXIT=1）**。
  那 1 条真红保持不掰：`/subpackages/setup/showcase/index` 游客态渲染空白
  （截图只有底色、零内容、无 JS 错误、模板根无条件），属产品侧待查缺陷，
  不是测试该容忍的东西。
  ⚠ 同一次全量跑里另有 a11y 与 core-journey 两个 spec 的红（收紧前整批 26 failed），
  本轮未动它们的判据，也未逐条归因——它们与 §9.1 那 8 条不同源，另册处理。

### 9.5 仍开放（不冒充已闭）

1. ~~**P0-2 的最后一寸**~~ —— **已闭**（2026-10-25 用户裁定「直接走 C，不要过度」后实现）。
   落地形态是**能力型签名 URL**，不是短期媒体令牌：
   - `MediaUrlSigner`：HMAC-SHA256 覆盖 `path|exp`、截断 16 字节、15 分钟过期、常量时间比较；
     密钥从 `app.jwt.secret` 加域分隔标签派生（不新增必须部署的密钥项），
     显式配 `app.media.url-secret` 可与之分家。
   - `POST /api/v1/media/sign`：**签发即授权**——逐条走与 `GET` 同一套
     `resolveAccessProfile` + `MediaTierPolicy.canRead`，判不过的**静默省略**
     （响应不带拒绝原因，避免本端点沦为「这条路径存在吗」的探测预言机）；
     媒体作用域令牌不得调用（否则短期凭据自我扩权成一批可读 URL）。
   - 过滤器 `authenticateSignedMediaUrl`：有效签名走与媒体令牌**同一条**降权通道
     （`MediaTokenPolicy.mediaAuthorities()`），于是「只有 ROLE_MEDIA、进不了业务接口/
     上传/刷新/WebSocket」这套既有规则与既有测试原样适用，不留第二份授权口径。
   - `media-query-token-strict` 默认 **false → true**：完整 24h 会话 JWT 不再允许进 URL。
     回退开关保留（线上真有旧客户端时显式置 false 并写明版本与期限），不靠默认值兜底。
   - 客户端 `utils/media-sign-cache.ts`：同帧多路径合并一次签发、到期前 60s 重签、
     被省略/失败路径 15s 退避、用 Vue `ref` 版本号让签名到达时模板重算。
     依赖方向保持单向（media → sign-cache → services/http），失效靠 JWT 末段指纹自愈——
     **刻意不**在 http.ts 的登出分支调清理函数，那会重建当年那条 http ↔ media 循环
     （`utils/media-token-cache.ts` 头部记着它的运行时后果）。
   - 那条「翻默认会让每张图重下」的代价实测过并在两处消掉：
     `SafeImage.localCacheKey()` 剥 query 再算键（六处调用点同源），
     且 `resolveOnce` **不再缓存未签出的私有媒体 URL**——否则签名到达后 computed 重算
     仍命中无凭据旧值，图片会永久停在 401 占位（本轮自查出的真隐患，非计划原条目）。
   - 测试：后端 `MediaSignedUrlTest` 12/12（他人认证材料不签、他人语音不签、本人材料可签、
     媒体令牌调用被拒、穿越/非媒体形态跳过、签名逐路径绑定）+
     `JwtAuthenticationFilterSignedUrlTest` 8/8（篡改/过期/跨路径/业务路径/POST 全部不建认证，
     另含「默认值必须为 true」读 application.yml 的判点——@Value 默认只在 Spring 装配时生效，
     纯 new 出来的过滤器字段恒为 false，断字段会得到与实现无关的假绿）；
     客户端 `media-signed-url.spec.ts` 7/7（real 档输出永不含 `token=`）、
     `media-sign-cache.spec.ts` 7/7、`safe-image-cache-key.spec.ts` 3/3。
     变异对照：把 `httpInFlight.delete(cacheKey)` 改回 `resolved` → 判点红并点名该调用点。
   - 读数：后端定向 20+19+8+12+9+11 全绿；客户端 130 files / **1431** tests 绿、
     `vue-tsc` REAL_EXIT=0、`npm run build:h5` DONE Build complete. / REAL_EXIT=0。
   - **未验证项（不冒充）**：mp-weixin 真机上「签名到达 → 图片补上」的完整时序未跑
     （设备腿仍是 §8 外部阻断）。现有证据是单元级 + 结构级 + H5 构建。
     另 `prefetchMediaSignatures` 已实现且单测覆盖，但**尚未接进任何列表 store**：
     当前首帧行为是无签名 URL 先 401、签名到达后重算补图（沿用历史「无 token 时返回原 URL
     由 401 触发 SafeImage fallback」的既有约定）。接进高频列表属纯优化，需逐 store 验证，另案。
2. **P0-1 的处置半句** —— **已闭**（2026-10-25 用户裁定：带漏洞的 `/bind` **从未对真实用户上线过**）。
   核查件留在盘上作为工具与证据（`database/audit/third-party-binding-provenance.sql` +
   `tests/third-party-binding-audit.spec.mjs`），但不再有 SUSPECT 行待处置。
   本机实测与裁定一致：`SET @cutoff='2026-10-24 22:44:29'` 整份脚本 SQL_EXIT=0，
   `third_party_account` 共 **0 行**（cutoff 前后皆 0）。
   这一跑还抓出一个静态检查看不见的缺陷：别名 `natural` 是 MySQL 8 保留字，
   原稿在真库直接 ERROR 1064（此前只过静态契约、从未执行）；已改 `natural_owner`
   并补「别名不许退回保留字」反向判据（变异对照：改回即红）。见 `9cbaadee`。
   ⚠ 本条关闭**依赖「未上线」这个部署史事实**：若将来发现该端点曾对真实用户服务过
   （灰度、历史部署或他人接手上线），本裁定作废——重跑核查件并回到
   「SUSPECT 处置需产品裁定 + 先按 `database/backup` 协议备份与 ROLLBACK 干跑」。
3. **P1-9 发布实机**：仍为外部阻断（真实 HTTPS 域名、`WX_APPID`、`WECHAT_APPID/SECRET`、
   部署级密钥），见 §8。真机 `wx.login` 链路、生产包上传与审核未验。
4. **P3 历史欠账**：R16 的 214 条仍全部是 `UNVERIFIED_AT_CURRENT_HEAD`
   （`reports/audit/2026-10-25-r16-disposition-ledger.json`），本轮没有重跑 UI 帧与逐条复判，
   不承接为全产品验收，也不关闭任何历史行。
5. **游客内容页空白态**：`subpackages/setup/showcase/index`（本轮实测真红）
   与全量首跑里偶发的 `circles/circles/index`、`chat/chat-session/index`、
   `tools/love-center/nearby` 空白读数，需按「游客不得浏览内容流」的既有裁定
   逐页定处置（补弹走闸、补 mock 夹具，还是判为不应进游客巡检），不在测试侧掰绿。


