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
