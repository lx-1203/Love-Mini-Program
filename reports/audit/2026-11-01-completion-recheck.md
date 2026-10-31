# 完成态复核（2026-11-01）

## 为什么要这份文件

复核前一次的收尾清单时，发现 **任务 `R3-14` 标着「已完成」，盘上却没有那半件事**：
`AdminProfileConfigController.save` 的 `@RequestBody` 一直缺 `@Valid`（第三轮遗留清单原文就写着这一条）。
缓存驱逐那半确实落了（`apps/api/src/main/java/com/campuslove/api/admin/AdminProfileConfigController.java:70` 有
`@CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'all'")`），
但同一条目里的校验那半没人做。⇒ **「任务已完成」不是完成态的证据**，
每一条都得回到当前盘上看。这份文件就是回到盘上的记录。

方法：对每一条给出「我实际跑了什么/读了什么」，而不是复述当时的计划。
只有我在这一轮里亲眼读到的才写「已证实」；抽样覆盖不到的地方一律写明「未复核」。

## 本轮实际复核到的条目

| 条目 | 声称的修复 | 盘上证据（本轮亲眼读到） | 判决 |
|---|---|---|---|
| R3-14 之一 | 写路径失效 `system_config` 的 `'all'` 键 | `AdminProfileConfigController.java:70` 就是 `@CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'all'")`；类注释 :24-29 写明绕开 `RealAdminConfigService` 的 30 分钟缓存这一因果 | 已证实 |
| R3-14 之二 | `save` 的 `@RequestBody` 加 `@Valid` | **修复前盘上没有**：参数原样是 `@RequestBody ProfileConfigView view`，`ProfileConfigView` 也零校验注解 | **判红 ⇒ 本轮已修** |
| ↳ 修法 | 边界守在写入侧 | `ProfileConfigView` 加 `@Min/@Max`（maxStories 1..50、minHighQualityScore 0..100）；`GlobalExceptionHandler.java:91` 已有 `MethodArgumentNotValidException` ⇒ 400 而非 500；后台表单 `ProfileConfig.vue:70,75` 的 1..20 / 0..100 在服务端界内，不构成新拦截 | `fix(api) 203fe419` |
| ↳ 反证 | 判点必须能红 | 摘 `@Valid` ⇒ `saveParameterCarriesValid` 红；摘 `maxStories` 的 `@Max` ⇒ `outOfRangeValuesAreRejected` 读到 `0 条违例` 红；两处还原后 sha 同值、基线 2/2 绿 | 已证实 |
| S2-1 | 内容安全外呼出事务 ×4 | `chat/RealPrivateMessageService.java:86-107`、`chat/TempChatMessageService.java:80-91`、`village/VillagePostService.java:98-120` 三处都在用 `NOT_SUPPORTED`「挂起一切事务」模板，且注释自陈「只用 REQUIRED 的话内层会加入外层事务，外呼照样在事务里」——即写法是被想过的，不是碰巧 | 已证实 |
| S2-2 | 哨兵不落库 + `admin-scope-leak` 门 | `npm run test:admin-scope-leak` 实跑：`扫描 821 个 main java，setter 实参无哨兵；2 处归属写入已接 resolveCampusForWrite` | 已证实 |
| S2-3 | 时区统一 + `tz-ratchet` 门 | `npm run test:tz-ratchet` 实跑：`无时区 now() 19 处全部在基线内，基线文件 6 个；带时区写法 420 处` | 已证实 |
| S0-2 | 监控链路自证 + 接线门 | `npm run test:monitoring` 实跑（本轮改常开后）：`告警表达式数据源核对 20 条，其中 4 条靠 node-exporter（job 活跃、过期声明 0 条）`；四处 mutation 各自变红后原样还原 | 已证实 |
| A3 | Element Plus 全量移除 | `apps/*/package.json` 与 `pnpm-workspace.yaml` 里 `element-plus` **零命中** | 已证实 |
| A4 | sourcemap 不再随生产包外泄 | `apps/client/vite.config.ts:213-214`：生产默认 `false`，仅 `BUILD_SOURCEMAP=true` 时 `hidden`；:209-212 写明原先 `'hidden'` + `docker/client-nginx.conf` 不拦 `.map` 等于源码全文可下载 | 已证实 |
| A5 | 构建档位身份守卫 | 链内 `npm run test:build-band` 跑过；客户端 `package.json:26-27` 两条 mp 构建都以 `mark-build-band.mjs --band …` 收尾，且 `verify-package-size.mjs --allow-mock` 与真档分离 | 已证实 |
| A9 | H5 生产包剥离 Mock | `apps/client/package.json:22-23` 两条 real 构建命令都经 `scripts/strip-mock-for-mp.mjs` 包裹；`vite.config.ts` 里没有 mock 开关（即不是「靠 env 忘了关」那种假剥离） | 已证实 |
| S2-5 / E 轨 | 个人信息导出与注销同源单一清单 | `apps/api/src/main/java/com/campuslove/api/privacy/` 六个类 + `PersonalDataErasureAlignmentTest`；本轮又加 `ErasureSchemaAlignmentTest` 把清单钉到迁移链真实列集（当场抓出 3 个链缺列 + 1 个凭空列） | 已证实 |
| S4 备份/恢复 | 备份脚本血统探测 + 恢复有代码 | `scripts/backup-mysql.sh:72-80` 血统探测为第 0 步；`scripts/restore-mysql.sh` 默认 dry-run、影子库 `campus_love_drill`；`DATA_HYGIENE_RESULT=PASS cells=3818 dirty=0` | 已证实 |

## 这份复核**没有**覆盖什么（不许把它当全量）

- 任务表里 46 条完成态条目，本轮逐条回到盘上的只有上表 14 条（外加当天批次的推送与门禁读数）。
  其余条目仍以「门在链里跑绿」为间接证据，**没有**逐条复现其原始因果。
- 需要真库/真容器/真机才能证的项，本机仍然判不出（无 Docker、无 `gh`、
  本地 Redis 是 Windows 3.0.504 且 Redisson 握不上手）：CI `db-integration` 的第一发读数、
  从零建链、`real` profile 端到端、微信小程序真机路径。这些不是「已修」，是「等 CI/等真机」。
- 「47 条 i18n 之外的硬编码用户可见文案」本轮**未修**，已单列任务 R5-i18n 并交给第五轮 B 泳道定量。

## 结论

抽样里 1 条「已完成但没修」被抓出并当场修掉，比例不低 ⇒ 后续每一轮收尾都应保留这份
「回到盘上」的动作，而不是相信任务状态本身。
