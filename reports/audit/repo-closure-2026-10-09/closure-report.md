# 仓库收口总报告（repo-closure v3.5 · 2026-10-09）

- 分支/HEAD：main @ 78c406d1，ahead=0（材料①）
- 汇编人：收口记录员。本报告只汇编本轮 workflow ask 给定的机器输出（材料①–⑦ 与 blockers 清单），记录员自身未修改任何代码、未执行任何 git 命令；除 §9 明确点名的只读复核外，全部读数均转引自材料，未手填、未复跑。
- 出处标记：`（材料①）`…`（材料⑦）` 对应 ask 给定的七段材料；`（blockers）` 对应 blockers 清单；`（记录员复核 §9.n）` 对应本会话实际执行的只读检查。

## 0. 结论速览

| 域 | 结论 | 出处 |
|---|---|---|
| 提交编排 | 三车道均未执行 git（硬纪律）；HEAD 仍 78c406d1、ahead=0；落地件为 commitPlan（功能体入库 12 条 104 路径 + 证据删留 deletePaths）交编排层 | 材料①③ + 车道落盘报告 |
| 后端测试门 | GREEN：Tests run: 8, Failures: 0, Errors: 0, Skipped: 0（ask 给定前提，车道与本记录员均未复跑） | 材料②③ |
| 档位重建 | GREEN：FRESH_RESULT=PASS bands=3 markers=4，problems=0（门禁复量时点该门曾 FAIL problems=13，重建后转绿，时序见 §4） | 材料④ + gate-recheck-v35.json |
| 终验三件 | 构建(bat)=PASS、typecheck=PASS、单测=PASS | 材料⑤ |
| 门禁复量 | 新转绿 0、仍红 6、新转红 0；18 门逐条读数见 §5.1 | 材料⑤ + gate-recheck-v35.json |
| 探针 | 根目录 FAIL（file=[nul] / dir=[.qoder]）、绝对路径 HIT 1/3767、bat 静态 PASS；可变红自检 PASS exit=0 | 材料⑤ + probe-*-final.json |
| 报告口径 | 全部结论只锚 CONSISTENT=4154；4881 帧历史回填戳按 manifest 点名降级留档 | 材料⑥（§6） |
| 需拍板 | 5 项 | 材料⑦（§7） |
| Blockers | 9 条留档 | 材料⑦ blockers（§8） |

## 1. 账单（材料①）

| 字段 | 值 |
|---|---|
| redGates（仍红 6 门） | 真实档覆盖 verify-real-coverage、证据语料 verify-evidence-corpus、溯源全量 verify-provenance-all、档位新鲜度 verify-band-freshness、后端新鲜度 verify-backend-fresh、离线负例聚合 run-qa-selftests |
| deletions / featureModified / featureUntracked / qaScriptsModified | 0 / 0 / 0 / 0 |
| backendUp | true（pid 32156） |
| ahead / head / branch | 0 / 78c406d1 / main |

- 交叉比对：redGates 六条与 gate-recheck-v35.json 的 `stillRed` 六条逐项一致（记录员比对，见 §9）。
- 口径注记：账单 deletions=0 指本轮车道执行侧（三车道均未执行 git）；盘面另有 reports/screenshots 3851 个在册删除停在工作树未暂存（材料③ skipped；evidence-deletion-disposition.md §1 实测 `3851 D + 26 M`），其入库走证据删留车道 commitPlan 的 deletePaths 交编排层。账单字段的生产方口径定义未在本 ask 材料内，照录不衍释。

## 2. 后端测试门（材料②）

- 结论：**GREEN** —— Tests run: 8, Failures: 0, Errors: 0, Skipped: 0。
- 与 gate-recheck-v35.json 的 `backendTestOk=true` / `backendTestSummary` 同值（记录员比对，见 §9）。
- 性质：ask 给定前提。材料③ notes 原文「后端测试门 GREEN 为 ask 给定前提，本车道未复跑测试」；本记录员亦未复跑（见 §9 职责声明）。

## 3. 三车道结论

车道名册：lane-results-v35.json 实含三条车道 —— 功能体入库、证据删留、自检定位（记录员 grep `"lane"` 实测，见 §9）。ask 材料③ 的 JSON 数组只给了「功能体入库」一条的完整结论；另两条按其落盘报告补足（§3.2 / §3.3，记录员本会话读取）。三条车道共同纪律：均不执行任何 git add/commit，落地件以 commitPlan 形态交编排层。

### 3.1 车道一：功能体入库（FEATURE-BODY-COMMIT）—— DONE

- fixedIds：FEATURE-BODY-COMMIT；filesChanged：reports/audit/repo-closure-2026-10-09/lane-FEATURE-BODY-COMMIT.md（记录员已读全文，与材料③一致）。
- 状态：commitPlan 已产出并三重校验，**未执行任何 git add/commit**（车道报告 §1 硬纪律、§5 校验；材料③ evidence「`git log -1` HEAD 仍为 78c406d1（与会话起点一致）、`git diff --cached --stat` 空（0 暂存）」）。

#### 3.1.1 skipped（5 条，转录自材料③）

| 标的 | 原因 |
|---|---|
| docker/prometheus/rules/alert-rules.yml | 不在本车道判域（docker/** 未列入 apps、database、docs/wechat-*、.github、application*.yml、.gitignore、根 package.json/pnpm-lock）；PaymentMetrics 注释提到的 PaymentCallbackFailure 告警规则属该文件，留另册 |
| scripts/verify-env-release.mjs | 不在本车道判域（scripts/ 根非 scripts/qa 亦非判域清单）；apps/client release-chain.mjs 引用它，但该文件已在 HEAD，不阻断构建链提交 |
| scripts/qa/**（M 9 + ?? 16） | QA 台账体另册，车道纪律一律不碰 |
| reports/**（M 29 + D 3851 + ?? 若干） | reports/** 不碰；3851 个 D 为历史截图删留，属 rootorg 车道已裁决项 |
| 根 package.json / pnpm-lock.yaml | 盘上存在但未修改（不在 git status M 清单），无对应提交 |

#### 3.1.2 校验与证据（材料③ evidence 九条，转录）

1. **域集枚举**：`git status --porcelain=v1 -uall` 实测 4052 行（3851 D + 111 M + 90 ??），按判域过滤（apps/、database/、docs/wechat-、.github/、.gitignore、根 application*.yml）得 104 条（65 M + 39 ??），与 commitPlan 条数声称规模一致（12 组 8+3+15+13+12+14+7+5+11+3+8+5=104）；清单存 .zcode/tmp/reverify-fbc-20261009/domain.txt。
2. **路径存在性**：对 104 条逐一 fs.existsSync 实测 → missing=0（104/104 全部存在于盘上）；域内 D=0。
3. **判域符合性**：104 条中含 scripts/qa 的 0 条、reports/ 前缀 0 条、scripts/ 任意前缀 0 条；落在判域之外的 0 条。
4. **无重复与覆盖闭合**：paths 内 indexOf 自比 dup=0；重建组划分 assigned=104、uncovered=0、duplicates=0（域集与组划分双向 comm 相等）。
5. **分组合理性**：按车道报告 §4 的 12 组名义计数做约束求解，全部 12 组计数精确闭合（8/3/15/13/12/14/7/5/11/3/8/5），且每组同域；边界文件归属经 diff 实证：pages.json diff=lazyCodeLoading+SHOWCASE 编译期剔除→构建链组；check-tabbar-consistency.mjs diff=容忍 SHOWCASE 剔除留下的尾逗号→构建链组；api.ts diff=uploadPostImage 增加 category(ID_CARD)→实名照片保留组；settings/index.vue diff=MP-R7-EDITPAGE entry=edit→编辑页组；RealAccountSecurityService diff=注销时 realNameMediaPurgeService.purgeByUserId→实名照片保留组；AdminPermissionTest+P0SecurityIntegrationTest 两处同款 diff=删 RealAuthService 构造器实参 ""（ADMIN_PASSWORD 明文兜底移除）→登录安全组。
6. **编译序抽查**：apps/api/src/main/java/com/campuslove/api/vip/VipOrderService.java:11-15 精确 import wxpay 5 类；wxpay/WxPayRefundNotifyController.java:5 `import com.campuslove.api.vip.VipOrderService`（双向依赖成立，wxpay 主体先落、RefundNotifyController 随 vip 组落）；wxpay 两测试 grep campuslove.api.vip 无命中；config/SecurityConfig.java:153 `.requestMatchers("/api/v1/refund/notify").permitAll()`；RealAuthService 中 AgreementConsentService/LoginAttemptService 引用 5 处；`grep -rn implements AuthService` 全仓仅 MockAuthService.java:18 与 RealAuthService.java:65 两实现，均在提交 6 文件集内。
7. **硬纪律**：`git log -1` HEAD 仍为 78c406d1（与会话起点一致）、`git diff --cached --stat` 空（0 暂存）——车道确未执行任何 git add/commit。
8. **6 个 svg 假差异核实**：`git diff --stat` 对 6 支 svg 输出为空（仅 LF/CRLF 警告），与车道 §6「M 但 diff 空」一致，随组入库无害。
9. **非阻塞记账偏差（不影响 plan）**：车道 §1 称判域内 M=71/??=33，实测 65/39——车道 ?? 枚举（10 新文件+11 wxpay+2 sanitize+6 flyway+3 client scripts+1 docs）漏数了 6 支新测试文件（VipOrderRefundInitiationTest/VipOrderServiceTest/RealWalletUnlockServiceTest/WhisperRefundLedgerTest/WxPayCallbackVerifierTest/WxPayPropertiesFailFastTest）；另册计数亦有漂移（reports M 实 36 vs 称 29、scripts/qa M 实 8 vs 称 9）——总数 104 与覆盖声称按当前 status 实测仍成立，且这些文件均未入 plan。

行数口径注记：车道报告 §1 用 `git status --porcelain=v1`（不带 -uall）记 4033 行，复量 evidence 用带 `-uall` 记 4052 行（gs-all.txt 实测 4052 行，§9）——两数并存源于命令旗标差异，两原文各自在案。

#### 3.1.3 commitPlan（12 条 104 路径，依赖序；deletePaths 全部为空）

**1. feat(db): Flyway V2026.10.05.* 六支迁移（媒体分类/协议留痕建表回填/VIP订单/账单唯一约束/回调日志扩展）与 database/sanitize 生产清库脚本**（8）
```text
database/flyway/sql/V2026.10.05.0001__add_media_asset_category.sql
database/flyway/sql/V2026.10.05.0002__create_user_agreement_consent.sql
database/flyway/sql/V2026.10.05.0003__backfill_user_agreement_consent.sql
database/flyway/sql/V2026.10.05.0010__create_vip_order.sql
database/flyway/sql/V2026.10.05.0011__vip_bills_unique_transaction.sql
database/flyway/sql/V2026.10.05.0012__extend_payment_callback_log.sql
database/sanitize/README.md
database/sanitize/prod-sanitize.sql
```

**2. feat(consent): 注册协议同意留痕域模型（user_agreement_consent 实体/仓库/服务，source=REGISTER 服务端半边留痕）**（3）
```text
apps/api/src/main/java/com/campuslove/api/entity/UserAgreementConsent.java
apps/api/src/main/java/com/campuslove/api/repository/UserAgreementConsentRepository.java
apps/api/src/main/java/com/campuslove/api/auth/AgreementConsentService.java
```

**3. feat(wxpay): 微信支付 APIv3 管道（JSAPI 下单/回调 RSA-SHA256 验签+AES-GCM 解密/IP 白名单+时间戳防重放/enabled=false 封存态 404 与缺配 fail-fast；回调日志扩展与失败计数指标；SecurityConfig 回调 permitAll）**（15）
```text
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayProperties.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayConfig.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayBootstrapChecker.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayApiException.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayDisabledException.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayModels.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayRequestSigner.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayCallbackVerifier.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayCallbackGuard.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayJsapiService.java
apps/api/src/main/java/com/campuslove/api/entity/PaymentCallbackLog.java
apps/api/src/main/java/com/campuslove/api/monitor/PaymentMetrics.java
apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java
apps/api/src/test/java/com/campuslove/api/wxpay/WxPayCallbackVerifierTest.java
apps/api/src/test/java/com/campuslove/api/wxpay/WxPayPropertiesFailFastTest.java
```

**4. feat(vip): VIP 订单域（下单/支付/退款状态机+管理员退款端点仅 SUPER_ADMIN+退款回调确认端点随订单域入库+账单唯一约束改造；客户端 VIP 页真实拉起支付，404/403 维持「支付未开通」）**（13）
```text
apps/api/src/main/java/com/campuslove/api/entity/VipOrder.java
apps/api/src/main/java/com/campuslove/api/repository/VipOrderRepository.java
apps/api/src/main/java/com/campuslove/api/vip/VipOrderService.java
apps/api/src/main/java/com/campuslove/api/vip/VipOrderController.java
apps/api/src/main/java/com/campuslove/api/wxpay/WxPayRefundNotifyController.java
apps/api/src/main/java/com/campuslove/api/vip/BillingController.java
apps/api/src/main/java/com/campuslove/api/vip/BillingService.java
apps/api/src/main/java/com/campuslove/api/entity/VipBill.java
apps/api/src/main/java/com/campuslove/api/admin/AdminVipController.java
apps/api/src/test/java/com/campuslove/api/vip/VipOrderServiceTest.java
apps/api/src/test/java/com/campuslove/api/vip/VipOrderRefundInitiationTest.java
apps/api/src/test/java/com/campuslove/api/vip/Task12ConcurrencyTest.java
apps/client/src/subpackages/vip/index.vue
```

**5. feat(verification): 实名照片保留策略（media_asset.category ID_CARD 高敏分类+按 DB 分类授权+审核通过 30 天定时清除+注销同步删除照片；客户端上传透传 category）**（12）
```text
apps/api/src/main/java/com/campuslove/api/media/MediaUploadCategory.java
apps/api/src/main/java/com/campuslove/api/verification/RealNameMediaPurgeService.java
apps/api/src/main/java/com/campuslove/api/entity/MediaAsset.java
apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java
apps/api/src/main/java/com/campuslove/api/media/MediaAccessService.java
apps/api/src/main/java/com/campuslove/api/media/MediaAssetService.java
apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java
apps/api/src/main/java/com/campuslove/api/verification/RealNameCertificationRepository.java
apps/api/src/main/java/com/campuslove/api/verification/RealRealNameCertificationService.java
apps/api/src/main/java/com/campuslove/api/auth/RealAccountSecurityService.java
apps/client/src/services/api.ts
apps/client/src/subpackages/profile-extra/verification/real-name.vue
```

**6. feat(auth): 注册协议同意落库接线（agreedLegalVersion 服务端兜底 v1.0.0）+账号级防爆破（连续失败 5 次锁 15 分钟，Redis 故障 fail-open）+短信验证码服务化与 1 次/分钟限流+移除 ADMIN_PASSWORD 明文兜底**（14）
```text
apps/api/src/main/java/com/campuslove/api/auth/LoginAttemptService.java
apps/api/src/main/java/com/campuslove/api/auth/AuthService.java
apps/api/src/main/java/com/campuslove/api/auth/AuthController.java
apps/api/src/main/java/com/campuslove/api/auth/MockAuthService.java
apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java
apps/api/src/main/java/com/campuslove/api/auth/SmsCodeController.java
apps/api/src/main/java/com/campuslove/api/auth/SmsCodeService.java
apps/api/src/test/java/com/campuslove/api/auth/RealAuthServiceTest.java
apps/api/src/test/java/com/campuslove/api/auth/RealAuthServiceMinorRegistrationTest.java
apps/api/src/test/java/com/campuslove/api/admin/AdminPermissionTest.java
apps/api/src/test/java/com/campuslove/api/security/P0SecurityIntegrationTest.java
apps/client/src/pages/register/index.vue
apps/client/src/services/auth.ts
apps/client/src/services/config.ts
```

**7. feat(wallet): 资金端点加固（/wallet 扣减服务端价格目录去信任化+演示充值每用户累计隔离+幂等拦截器 strict 模式资金端点 Redis 不可用 503 fail-closed+whisper 扣费/退款 REQUIRES_NEW 独立事务可对账）**（7）
```text
apps/api/src/main/java/com/campuslove/api/wallet/WalletController.java
apps/api/src/main/java/com/campuslove/api/wallet/RealWalletUnlockService.java
apps/api/src/main/java/com/campuslove/api/common/IdempotentInterceptor.java
apps/api/src/main/java/com/campuslove/api/whisper/RealWhisperService.java
apps/api/src/test/java/com/campuslove/api/wallet/WalletControllerTest.java
apps/api/src/test/java/com/campuslove/api/wallet/RealWalletUnlockServiceTest.java
apps/api/src/test/java/com/campuslove/api/whisper/WhisperRefundLedgerTest.java
```

**8. feat(content): 私信/临时聊天/圈子话题与回复/村口帖子/资料昵称简介五链路统一内容安全检查接线（msgSecCheck v2 risky 拒绝、review 放行留痕，checker 异常降级本地敏感词 fail-closed）**（5）
```text
apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java
apps/api/src/main/java/com/campuslove/api/chat/TempChatMessageService.java
apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java
apps/api/src/main/java/com/campuslove/api/village/VillagePostService.java
apps/api/src/main/java/com/campuslove/api/profile/ProfileUpdateService.java
```

**9. feat(client): 编辑资料页双模式收敛（MP-R7-EDITPAGE ?entry=edit 回显/保存与导航）+头像/照片墙 store 同步回写+匹配图标资产更新**（11）
```text
apps/client/src/stores/profile.ts
apps/client/src/subpackages/setup/profile/index.vue
apps/client/src/subpackages/profile-extra/settings/index.vue
apps/client/src/tests/profile-store.spec.ts
apps/client/src/tests/components/register-index.spec.ts
apps/client/src/static/assets/icons/common/cat.svg
apps/client/src/static/assets/icons/common/heart-filled-white.svg
apps/client/src/static/assets/icons/common/heart-filled.svg
apps/client/src/static/assets/icons/common/paw.svg
apps/client/src/static/assets/icons/common/planet.svg
apps/client/src/static/assets/svg-spec/03-icons/heart-filled.svg
```

**10. feat(client): 微信隐私授权接线（manifest __usePrivacyCheck__ + onNeedPrivacyAuthorization 自有弹窗）与提审材料清单建档**（3）
```text
apps/client/src/App.vue
apps/client/src/manifest.json
docs/wechat-submission-materials-checklist.md
```

**11. chore(client): 发布构建链收敛（build:mp-weixin:real 收敛为 release-chain.mjs、vitest 经 run-vitest.mjs 载具、lazyCodeLoading=requiredComponents、SHOWCASE 条件编译编译期剔除展示页）**（8）
```text
apps/client/package.json
apps/client/vitest.config.ts
apps/client/scripts/build-real-isolated.mjs
apps/client/scripts/check-tabbar-consistency.mjs
apps/client/src/pages.json
apps/client/scripts/add-lazy-code-loading.mjs
apps/client/scripts/release-chain.mjs
apps/client/scripts/run-vitest.mjs
```

**12. chore(infra): CI 供应链推送闸（未配 COSIGN_PRIVATE_KEY 默认拒绝未签名镜像出仓）+泄露面 gitignore（tmp_*_token.txt/*.aof）+wxpay/实名照片保留配置项+WebSocket Origin 未配置 fail-fast**（5）
```text
.github/workflows/ci.yml
.gitignore
apps/api/src/main/resources/application.yml
apps/api/src/main/resources/application-real.yml
apps/api/src/main/java/com/campuslove/api/config/WebSocketConfig.java
```

#### 3.1.4 notes（材料③原文，末句在 ask 中截断）

「后端测试门 GREEN 为 ask 给定前提，本车道未复跑测试（本车道任务为提交编排）。commitPlan 共 12 条、104 条路径，按依赖序编排：wxpay 主体(3)先于 VIP 订单域(4)，因 VipOrderService→wxpay 与 WxPayRefundNotifyController→VipOrderService 双向依赖，RefundNotifyController 随提交 4 入库以保证两个中间提交均可编译；协议域模型(2)先于 auth 接线(6)。判域内 M/?? 清单 104 条全覆盖、一条不多；每条路径均经存在性/判域/去重/覆盖四【ask 材料原文至此截断】」

### 3.2 车道二：证据删留（EVID-DELETION-LAND）—— 定稿

出处：evidence-deletion-disposition.md（记录员读 §0–§3；本小节为补读，非 ask 材料③原文）。

- 处置结论（§0）：执行 v3.4 EVID-DELETION-DEADLOCK 选项 (a) —— **3851 张 reports/screenshots 在册删除按「附红因记录+提交删除」落地**；判据侧零改动（corpus/provenance 两门判据一字未碰）；本车道不执行任何 git add/commit，删除经其 §6 commitPlan 的 deletePaths 交编排层。
- 现状实测（§1）：`git status --short -- reports/screenshots` → 3851 D + 26 M；在册 11333、盘上现存 12380（.gitignore:61 掩 reports/screenshots/）；语料门分母轴 `CORPUS_DENOM_ABSENT trackedAbsentFiles=3851 trackedAbsentFrames=3841 trackedAbsentNonImage=10`。
- 死因一（§2）：round-1 的 144 帧本体 0 tracked / 0 on-disk / 不在 HEAD（仅剩 manifest.json + blank-check.tsv 两个非帧件），`git restore` 无物可还；corpus 门 advisory 轴只认「未提交删除」（`git ls-files --deleted`，判据 verify-evidence-corpus.mjs:201-215 的 DENOM 凭据、:279-282 的 advisory 分支、:323 的 blockingMissing）⇒ 已提交删除永远不在凭据集 ⇒ blockingFrames=144 恒红（CORPUS_RESULT=FAIL）。
- 死因二（§3）：4881 帧 PRE_STAMP 全在盘且在册干净，restore 对在盘干净帧不重写不翻戳（实测一，样本逐字节不变）；对删除集内 UNRESOLVABLE 帧执行 restore 反而翻 STALE_STAMP（实测二复现，mtime 翻成恢复时刻 2026-10-08T17:43:03.101Z 并出具新样本行）。
- 复跑读数（§3，与材料⑥同值）：`PROV_FRAMES_CONSISTENT=4154 PROV_FRAMES_STALE=0 PROV_FRAMES_PRE_STAMP=4881 PROV_FRAMES_UNRESOLVABLE=5 PROV_FRAMES_UNDATED=0 PROV_FRAMES_UNKNOWN_BAND=0 PROV_FRAMES_LEGACY=0 PROV_FRAMES_LEGACY_EXEMPT=144`；生产者侧 `PROV_PRODUCERS=11 DERIVED_OK=11 LITERAL_SHA=0`。
- 可预见的提交后读数（§2 末，判据代码推导、非实测）：删除提交落地后 `git ls-files --deleted` 清空 ⇒ 本轮唯一拿到 advisory 的 5 帧（reports/audit/round-7/exec-A-mock-final/manifest-detail.json）凭据同时失效 ⇒ blockingFrames 144→149、CORPUS_PROBLEMS 预计 1→2；归 CORPUS-LEGACY-144 拍板项同一篮子。

### 3.3 车道三：自检定位（SELFTEST-LOCATE）—— 定性不修

出处：selftest-locate.md（记录员读全文；本小节为补读，非 ask 材料③原文）。

- 失败者定位：`node scripts/qa/run-qa-selftests.mjs`（Node22 前置）→ SELFTEST_RAN=48 SKIPPED=1 FAILED=1，唯一失败 = scripts/qa/test-guest-landing.mjs（1 个断言失败）；单跑 SUMMARY: checks=45 assertion failures = 1，唯一失败断言为文件顶部预检步（test-guest-landing.mjs:29-36）——调 scripts/qa/triage-exec-failures.mjs 从守卫语料派生第二条游客腿夹具，子步 exit=2（TRIAGE_RESULT=FAIL：复测腿与债不同源，判据本体 triage-exec-failures.mjs:1141-1143）。
- 定性：**裁定内真红 + 环境缺件**，非测试/门的 bug——round-7/followups-v33.md:618-648（§19(c)，2026-10-01）已明文「这条红是真的，按原样留着……修法是同源重跑、要设备」；本轮实测在盘全部游客语料均早于 09-30 名册改版，离线无绕行 ⇒ 按车道纪律不修，commitPlan 为空。
- 聚合器读数维持 1/51：50 绿（47 test-* + 3 门自检）+ 1 红（test-guest-landing.mjs，本报告定性）+ 1 UI 跳过（test-stop-flag.cjs，策略内）。
- 51/51 达成条件不在本车道：按 §19(c) 完成守卫腿同源重跑（要设备 + 授权）后自然转绿，挂账名沿用「SELFTEST-1OF51 → 同源重跑守卫腿（设备腿）」。

## 4. 档位重建（材料④）

- 结论：**GREEN** —— FRESH_RESULT=PASS bands=3 markers=4；每档产物都不晚于任何未提交改动，且符号级深检全部命中；剩余 problems=0。
- 完整句（材料④末句在 ask 中截断于「经 pnpm -C apps/client run build:m」；gate-recheck-v35.json `bandFinalLine` 载有全文，补齐如下）：「上轮唯一残留红点为 mock 档目录被 real 构建覆盖：VITE_API_MODE=real/MODE=mp-weixin 应为 mock/mp-weixin-mock，经 pnpm -C apps/client run build:mp-weixin:mock 重建后清除；三档 mtime 均晚于全部 20 行脏项、4 个标记符号三档全命中，EXIT=0」。
- 时序注记：gate-recheck-v35.json 同一产物内，档位新鲜度在 gates[] 复量行为 FAIL problems=13（exitCode 2），而 `bandsRebuilt=true` + `bandFinalLine` 为 PASS problems=0——即先复量（红）后重建（绿）。材料① redGates 与材料⑤「仍红 6」沿用复量清单把该门计入仍红；其重建后实测态以 bandFinalLine 为准。两读数并存于同一机器产物，如实并录，不取一舍一。

## 5. 终验（材料⑤）

三绿与新红：构建(bat)=PASS、typecheck=PASS、单测=PASS；新转绿 0；新转红 0；可变红自检 exit=0（gate-recheck-v35.json `redProbe`：PROVE_GATES_CAN_FAIL_RESULT=PASS，exitCode 0）。

### 5.1 门禁复量（18 门，转录自 gate-recheck-v35.json `gates[]`，读数以 resultLine 为准）

| # | 门 | exit | resultLine（要点） |
|---|---|---|---|
| 1 | 台账词表/形状 verify-ledger | 0 | LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法；另有 71 条已登记退役（凭证被 70472d92 有意删除，见 LEDGER_RETIRED：退役 ≠ 通过） |
| 2 | 状态真值 verify-state-truth | 0 | STATE_RESULT=PASS（全局极差比的是 2 列同范围源；检查点按 subset-window 已做逐套包含核对） |
| 3 | 队列守恒 verify-queue-reconcile | 0 | QUEUE_RESULT=PASS |
| 4 | 真实档覆盖 verify-real-coverage | 1 | REALCOV_RESULT=FAIL（真实模式覆盖守恒：跳过不算量到，单身份不算双身份；免检只免「本门不追」，不降阈值） |
| 5 | 判据台 verify-source-shape | 0 | SRC_SHAPE_RESULT=OK |
| 6 | 证据语料 verify-evidence-corpus | 1 | CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA） |
| 7 | 溯源全量 verify-provenance-all | 1 | PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论） |
| 8 | 档位新鲜度 verify-band-freshness | 2 | FRESH_RESULT=FAIL problems=13（复量时点读数；其后 bandsRebuilt=true → bandFinalLine=PASS problems=0，见 §4 时序注记） |
| 9 | 后端新鲜度 verify-backend-fresh | 1 | BACKEND_FRESH_RESULT=FAIL（apps/api 有 56 项未提交改动 ⇒ 运行实例不可能代表 HEAD / 运行实例起于 2026-09-26T21:32:46，早于最新 class 2026-10-05T17:26:06.245Z ⇒ 跑的是旧代码，需要重启） |
| 10 | 证据洞 verify-evidence-holes | 0 | EVIDENCE_HOLES_RESULT=PASS 每个洞都有可重跑判据，无一靠重判结案 |
| 11 | 离线负例聚合 run-qa-selftests | 1 | SELFTEST_RESULT=FAIL（1/51 个离线测试与门自检未过） |
| 12 | dry 不抢租约静态门 verify-dry-no-lease | 0 | DRYLEASE_RESULT=OK —— 没有 dry 抢设备的路径 |
| 13 | 载体接线零消费者门 verify-carrier-wiring | 0 | WIRING_RESULT=PASS（判域 25 个导出件全部有消费者；死件=0 过期豁免=0；口径=消费者含 import/require/动态 import/spawn 字面量/sh/dsl/package.json/queue/ci 七类入口加已登记的按名自动收件，不含 .md 与 reports/** 的提及） |
| 14 | 车道报告骨架完成度 verify-lane-report-complete | 0 | LANEREPORT_RESULT=PASS 退出码=0 口径=本发判决（红项见上 PROBLEMS=0） |
| 15 | 真实档覆盖去向册 verify-real-coverage-disposition | 0 | RCD_RESULT=PASS（9 条欠账条条有在册去向；陈旧 1 条按 advisory 点名不判红；上游门照旧 RESULT=FAIL UNCOVERED=9） |
| 16 | 用例可自动化预检 verify-case-automatable | 0 | CA_RESULT=ADVISORY（静态命中 102/1107，占 9.2%；假阳性率已量 83.3%（85/102，其中「跑完且通过」硬口径 47.1%），召回率 12.1%；判红权在 --strict，默认不判红）；分派口径：「真能力缺口」归 harness（要加 op），「逐态标注/亚秒连拍/全文本扫描/主观审美」归用例设计（要换等价可断言【ask 与产物原文至此截断】） |
| 17 | 工作流干跑预检 dryrun-workflow | 0 | DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告） |
| 18 | 判据台戳 verify-ops-stamp | 0 | STAMP_RESULT=PASS 语料与戳一致（cases=1107 与记录相同，判据内容零漂移） |

汇总行（gate-recheck-v35.json `improved`/`stillRed`/`flipped`）：improved=[]、flipped=[]，stillRed 即材料① redGates 同款 6 条（真实档覆盖、证据语料、溯源全量、档位新鲜度、后端新鲜度、离线负例聚合）。

### 5.2 探针（转录自材料⑤ + probe-*-final.json）

| 探针 | 判定 | 机器产物原文 |
|---|---|---|
| 根目录清点 | **FAIL** | ROOT_INV_RESULT=FAIL；ROOT_INV_FILE_VIOL=["nul"]；ROOT_INV_DIR_VIOL=[".qoder"]（probe-root-inventory-final.json） |
| 绝对路径扫描 | **HIT** | ABS_SCAN_RESULT=HIT scanned=3767 hits=1；唯一命中 scripts/qa/cellplan-round7-criteria-c.json:2（probe-abs-paths-final.json，`stopped:false`） |
| bat 静态 | **PASS** | BAT_STATIC_RESULT=PASS；problems=[]（probe-bat-static-final.json） |
| 可变红自检 prove-gates-can-fail | **PASS** | PROVE_GATES_CAN_FAIL_RESULT=PASS，exitCode 0 |

- blocker 接线依据：workflow 脚本 .zcode/workflow-drafts/repo-closure-v35.dwf.ts:617-618 将根目录探针 ≠PASS 与绝对路径探针 ≠PASS 无条件 push 进 blockers（记录员读原文在案）⇒ 材料⑦ blockers 中「终验探针」两条由此而来。
- "nul" 条目注记：FILE_VIOL=["nul"] 为 Windows 保留设备名残留件，材料⑦ 需拍板清单中无对应拍板项，仅以 blocker 留档（本报告不代裁）。

## 6. 报告口径（材料⑥，PROV-PRESTAMP 采纳项）

本轮全部结论只锚 **CONSISTENT=4154**；4881 帧历史回填戳（PRE_STAMP，门禁原话「禁止据此下结论」）按 manifest 点名降级留档，不为任何本轮结论背书。

旁证（证据删留车道复跑原文，evidence-deletion-disposition.md §3）：`PROV_FRAMES_CONSISTENT=4154 PROV_FRAMES_STALE=0 PROV_FRAMES_PRE_STAMP=4881 PROV_FRAMES_UNRESOLVABLE=5 PROV_FRAMES_UNDATED=0 PROV_FRAMES_UNKNOWN_BAND=0 PROV_FRAMES_LEGACY=0 PROV_FRAMES_LEGACY_EXEMPT=144`，生产者侧干净 `PROV_PRODUCERS=11 DERIVED_OK=11 LITERAL_SHA=0`。

## 7. 需拍板事项（材料⑦）

材料⑦ 列表 9 条中 5 个 id 各两见（详版/略版），去重后为 5 项，以下取详版转录，并附记录员对判据/产物原文的只读复核结果（复核明细见 §9）。改判据、数据去留、授权扩面均属政策与拍板域，不归车道与本记录员自裁。

### 7.1 CORPUS-LEGACY-144（证据语料门 legacy 豁免口径）

- why：同一批 144 帧两把尺子结论相反——provenance 按已采纳裁定 #12-A 豁免（判据在 scripts/qa/verify-provenance-all.mjs:195-206，v3.4 终报 §4.3 实测 PROV_FRAMES_LEGACY_EXEMPT=144），corpus 缺席轴仍判 blocking 且认不出已提交删除（v3.4 终报转录 scripts/qa/verify-evidence-corpus.mjs:279-282,323）⇒ CORPUS_PROBLEMS=1 恒红。本轮账单仍红（CORPUS_RESULT=FAIL）。
- 记录员复核：#12-A 豁免注释确在 verify-provenance-all.mjs:195-206（三条件收窄口径原文在案），执行分支 :207-209（`legacy && !s.bandSha` → legacyExempt）；corpus 侧 :282 advisory 分支确以 `DENOM.ok && DENOM.absentSet.has(...)` 为前提、:281 注释明言「分母不可得时一律走后者（红）」、:323 `blockingMissing = STRICT ? missing : missing - advisory`——豁免分支存在但凭据只认「在册却已不在盘」清单；证据删留车道实测（evidence-deletion-disposition.md §2）round-1 144 帧已提交删除、restore 无物可还，且其 §2 末推导：删除提交落地后 blockingFrames 144→149。本轮运行读数以 gate-recheck-v35.json 为准（CORPUS_RESULT=FAIL），记录员未复跑该门。
- options：a) 给 corpus 缺席轴加与 #12-A 同口径的 legacy 豁免（对齐两把尺子）；b) 处置 reports/screenshots/round-1/manifest.json 本体（移出扫描域或归档——数据去留）；c) 接受该门长期红，仿 RCD 立去向册逐条点名。

### 7.2 PROV-PRESTAMP-4881-RESCAN（4881 帧历史回填戳是否重采）

- why：4881 帧历史回填戳（在盘帧 mtime 早于所记提交，如 mtime 2026-09-27 vs 所记 6fd15178@2026-09-28），门禁原话「禁止据此下结论」；生产者侧干净（11/11 派生、0 字面量），债在历史证据本体，改戳/倒填 mtime 属造假不设为选项。本轮账单 PROVENANCE_RESULT=FAIL 照旧。v3.5 已采纳 v3.4 选项 (a) 的报告口径（本轮 workflow 头部⑥：结论只锚 CONSISTENT=4154，4881 帧按 manifest 点名降级留档）——剩下唯一待裁的是是否另立重采轮。
- options：a) 维持现状（本轮已采纳口径 a）；b) 另立真实模式重采轮消化（DevTools/UI 域，不归收口轮）。

### 7.3 REALCOV-9-SCHED（9/236 真实档覆盖缺口）

- why：真实档覆盖门本轮账单仍红（REALCOV_RESULT=FAIL）。v3.4 终报 §4.9 复量点名 REALCOV_UNCOVERED=9/236（PFI25/VI25/VI34/OT05/OT06/OT09/VRN07/OC09/VB03，全部缺 login 或 login+guest 真实腿），去向册门 RCD 已 PASS（gate-recheck-v35.json #15：9 条条条有在册去向）。补腿属真实模式 DevTools/UI 轮，本轮纪律明令不归。
- options：a) 下一真实模式 QA 轮按点名补腿；b) 终验/终报按去向册口径将该门记「已处置欠账」并接受红；c) 判据侧收缩（须拍板，不默认）。

### 7.4 QODER-DISPOSITION（根目录 .qoder/ 去留）

- why：根目录 .qoder/ 仍在：本轮 ROOT_INV_DIR_VIOL=[".qoder"]（FILE_VIOL 已清空——按 blockers 原文；probe-root-inventory-final.json 实测 FILE_VIOL=["nul"]，见 §5.2 注记），v3.5 白名单故意不录（workflow 注释「.qoder 裁处待拍板，故意不录」，.zcode/workflow-drafts/repo-closure-v35.dwf.ts:44）⇒ 终验探针复量必再点名并记 blocker。实测目录内容仅 repowiki/ 一个子目录（2026-10-06/07 生成，Qoder IDE 的仓库百科产物），数据去留无授权依据。
- 记录员复核：workflow :44 注释原文在案；记录员 `ls` 实测 .qoder/ 下仅 repowiki/，repowiki/ 下为 knowledge、zh 两个子目录。
- options：a) 确认属废弃工具产物→删除或归档；b) 在用→补录 ROOT_DIRS_ALLOWED 并修订 目录整理说明.md；c) 维持待裁点名（终验 blocker 按已裁留档解释）。

### 7.5 ABS-QA-CELLPLAN-NOTE（cellplan note 字段历史叙述常红）

- why：本轮 ABS_SCAN=HIT scanned=3767 hits=1，唯一命中 scripts/qa/cellplan-round7-criteria-c.json:2——「note」字段里的历史记账叙述「…git show 094f7239 基线源码，node 走 D:/codex-tools 的 v22」。v3.4 绝对路径车道已裁：QA 记账叙述且该件是 QA 契约件（sha 敏感，改字即破契约），按纪律不改、留档待拍板（v3.4 终报 §五 blocker 6）。但本轮 workflow 终验把 ABS_SCAN≠PASS 无条件记 blocker（repo-closure-v35.dwf.ts:618）⇒ 这条常红会每轮顶成 blocker，长期口径需要拍板。
- 记录员复核：probe-abs-paths-final.json 命中原文与 workflow :618 blocker 逻辑均在案；cellplan-round7-criteria-c.json:2 note 字段原文确含上述叙述（含「git show 094f7239 基线源码，node 走 D:/codex-tools 的 v22」字样）。
- options：a) 接受为历史叙述常红（v3.4 先例），终验 blocker 按已裁留档解释销账；b) 改写 note 去盘符（等于改 QA 历史记录/破 sha 敏感契约件，不建议）；c) 给探针加叙述性豁免判据（判据修订，须拍板）。

## 8. Blockers 清单（材料⑦ 给定，9 条转录；【】为记录员标注）

1. 车道 功能体入库：docker/prometheus/rules/alert-rules.yml 未收口（不在本车道判域（docker/** 未列入 apps|database|docs/wechat-*|.github|application*.yml|.giti【ask 原文此处截断】）
2. 车道 功能体入库：scripts/verify-env-release.mjs 未收口（不在本车道判域（scripts/ 根非 scripts/qa 亦非判域清单）；apps/client release-chain.mjs 引用它，但该文件已在 【ask 原文此处截断】）
3. 车道 功能体入库：scripts/qa/**（M 9 + ?? 16） 未收口（QA 台账体另册，车道纪律一律不碰）
4. 车道 功能体入库：reports/**（M 29 + D 3851 + ?? 若干） 未收口（reports/** 不碰；3851 个 D 为历史截图删留，属 rootorg 车道已裁决项）
5. 车道 功能体入库：根 package.json / pnpm-lock.yaml 未收口（盘上存在但未修改（不在 git status M 清单），无对应提交）
6. 车道 自检定位：SELFTEST-LOCATE/最小修复到51-51 未收口（失败者已定位为 test-guest-landing.mjs 预检夹具派生步，但定性为裁定内真红 + 环境缺件，按车道纪律不修：①不是测试 bug——45 ch【ask 原文此处截断】；全文见 selftest-locate.md，§3.3 已转录要点）
7. 终验探针：根目录仍有违例 ROOT_INV_RESULT=FAIL / ROOT_INV_FILE_VIOL=["nul"] / ROOT_INV_DIR_VIOL=[".qoder"]（probe-root-inventory-final.json 同值）
8. 终验探针：绝对路径仍有命中 ABS_SCAN_RESULT=HIT scanned=3767 hits=1 / ABS_HIT scripts/qa/cellplan-round7-criteria-c.json:2（probe-abs-paths-final.json 同值；拍板项 §7.5）
9. 面板腿红：全量面板 emit-round-report（EMIT_RESULT=FAIL 自判失败 1 条：）【ask 原文至此，失败条目详情未随材料给出，本报告不补】

注：blockers 1–6 均为「车道纪律内不碰/不修」的声明式未收口（另册留档），7–8 对应 §5.2 探针 FAIL/HIT（拍板项 §7.4/§7.5），9 面板腿失败详情材料未给。

## 9. 记录员复核记录（本会话实际执行的检查）

职责声明：本记录员只汇编，未修改任何代码，未执行任何 git 命令，未复跑任何 QA 门/测试/构建（材料③ notes 明示后端测试门 GREEN 为 ask 前提；各门读数以 gate-recheck-v35.json 与 ask 材料为准）。以下为本会话实际执行的只读检查，全部在本 ask 期间完成：

1. `ls reports/audit/repo-closure-2026-10-09/`：closureDir 在盘 14 件——evidence-deletion-disposition.md、gapbill-v35.json、gate-recheck-v35.json、lane-FEATURE-BODY-COMMIT.md、lane-results-v35.json、probe-abs-paths.json 与 -final.json、probe-bat-static.json 与 -final.json、probe-root-inventory.json 与 -final.json、selftest-locate.md、sort-v35.json、closure-report.md（本件）。
2. `wc -l .zcode/tmp/reverify-fbc-20261009/gs-all.txt` → **4052**：与材料③ evidence「`git status --porcelain=v1 -uall` 实测 4052 行（3851 D + 111 M + 90 ??）」的行数一致。
3. `wc -l .zcode/tmp/reverify-fbc-20261009/domain.txt` → **104**：与材料③ evidence 判域过滤 104 条及 commitPlan 104 路径一致。
4. `grep -o '"lane"[^,]*' lane-results-v35.json` → 三条车道：功能体入库、证据删留、自检定位（控制台 GBK 显示为乱码字形，按 lane-results-v35.json 首条上下文与两条落盘报告题名对应确认）。
5. `ls .qoder/` 与 `ls .qoder/repowiki/`：.qoder/ 下仅 repowiki/；repowiki/ 下为 knowledge、zh 两子目录——与 §7.4「仅 repowiki/ 一个子目录」相符。
6. Read scripts/qa/verify-provenance-all.mjs:190-209：#12-A LEGACY 豁免注释确在 :195-206（三条件收窄：整份 manifest 无 gitSha 且 generatedAt 早于打戳约定 / 只豁免盘上不存在的帧 / 行内自带 bandSha 不豁免；结论钉死「历史证据，不可引用」），执行分支 :207-209。
7. Read scripts/qa/verify-evidence-corpus.mjs:272-326：advisory 分支 :282 以 `DENOM.ok && DENOM.absentSet` 为前提（:281 注释「分母不可得时一律走后者」）；legacy 顶层豁免 :298-307；`blockingMissing = STRICT ? missing : missing - advisory` 在 :323。与 §7.1 转录相符。
8. Read .zcode/workflow-drafts/repo-closure-v35.dwf.ts:40-49 与 :612-621：:44 注释「.qoder 裁处待拍板，故意不录」；:614 新转绿/仍红/新转红日志；:617-618 根目录与绝对路径探针 ≠PASS 无条件 push blockers。
9. Read scripts/qa/cellplan-round7-criteria-c.json:1-4：:2 note 字段确含「git show 094f7239 基线源码，node 走 D:/codex-tools 的 v22」等历史叙述，为 ABS 扫描唯一命中源。
10. Read reports/audit/repo-closure-2026-10-09/lane-FEATURE-BODY-COMMIT.md 全文（73 行）：与材料③ 一致——§1 判域内 M=71/??=33 与 evidence 第 9 条记账偏差对应；§4 十二组名义计数；§5 校验五项（104/104 存在、判域合规、无重复、comm 全覆盖、未执行 git）；§6 保留与遗留五条。
11. Read reports/audit/repo-closure-2026-10-09/gate-recheck-v35.json 全文：18 门复量表、improved=[]/stillRed(6)/flipped=[]、probes 三条、redProbe PASS、bandsRebuilt=true、bandFinalLine 全文、backendTestOk=true、backendTestSummary 与材料②同值。
12. Read probe-root-inventory-final.json / probe-abs-paths-final.json / probe-bat-static-final.json：与材料⑤及 blockers 7/8 的探针读数逐项同值。
13. Read reports/audit/repo-closure-2026-10-09/selftest-locate.md 全文：失败者身份、根因链、裁定内真红+环境缺件定性、commitPlan 为空——与 blockers 6 对应。
14. Read reports/audit/repo-closure-2026-10-09/evidence-deletion-disposition.md:1-45：§0 处置结论、§1 盘面实测（3851 D + 26 M）、§2/§3 两门死因与复跑读数（CONSISTENT=4154 / PRE_STAMP=4881 / LEGACY_EXEMPT=144）。

交叉比对小结：材料① redGates = 材料⑤ 仍红 6 = gate-recheck-v35.json stillRed（三方一致）；材料② = gate-recheck-v35.json backendTestSummary（一致）；材料④ = bandFinalLine（一致，且后者补齐截断）；材料⑤ 探针 = probe-*-final.json（一致）；材料③ 104 条 = domain.txt 104 行 = 12 组计数和（一致）。材料中的截断句（③ notes 末句、④ 末句、blockers 1/2/6、CA_RESULT 行）均已如实标注，其中 ④ 末句经 bandFinalLine 补全。

---

*汇编完毕：2026-10-09，收口记录员。本报告为纯汇编件：除 §9 所列只读复核外不含任何本会话新产读数；各门/车道结论的效力归其生产机器产物与 ask 材料。*
