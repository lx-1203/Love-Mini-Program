# 车道报告：功能体入库（FEATURE-BODY-COMMIT）

- closureDir: reports/audit/repo-closure-2026-10-09
- 车道判域: apps/**、database/**、docs/wechat-*、.github/**、application*.yml、.gitignore、根 package.json/pnpm-lock
- 状态: DONE（commitPlan 已产出并三重校验；未执行任何 git add/commit）
- 前提（来自 ask，本车道未复跑）: 后端测试门已 GREEN（v3.4 终报 OCT5-FEATURE-BODY 选项 (a) + 本轮后端测试门实测）
- 硬纪律: 只产出 commitPlan（{message, paths, deletePaths}），绝不执行 git add/commit；scripts/qa/**、reports/** 一律不碰；路径必须存在且属于判域，禁止 `.` / `-A` 全量。

## 1. git status 盘点（命令: `git status --porcelain=v1`，输出 4033 行 → /tmp/gs-full.txt）

- 全仓 M=111，D=3851（D 几乎全为 reports/screenshots 历史截图删留，不在本判域）
- 判域内 M：71 个；判域内 ??：10 个新文件 + wxpay/ 目录（11 文件）+ database/sanitize/ 目录（2 文件）+ 6 支 flyway + 3 个 client scripts + 1 个 docs = 33 个
- 判域内 M+?? 展开（含目录展开）合计 **104 条**，全部进 commitPlan，一条不漏
- 判域外（不碰，另册）：docker/prometheus/rules/alert-rules.yml(M)、scripts/verify-env-release.mjs(M)、scripts/qa/**(M 9 + ?? 16)、reports/**(M 29 + D 3851 + ?? 若干)
- 根 application*.yml 不存在（ls 报 No such file）；根 package.json / pnpm-lock.yaml 存在但**未修改**（不在 M 清单，故无对应提交）

## 2. 未追踪目录枚举（find 实测）

- `apps/api/src/main/java/com/campuslove/api/wxpay/`：11 文件（WxPayApiException/BootstrapChecker/CallbackGuard/CallbackVerifier/Config/DisabledException/JsapiService/Models/Properties/RefundNotifyController/RequestSigner）
- `database/sanitize/`：README.md + prod-sanitize.sql（生产建库后 QA 种子数据清理，事务内先 ROLLBACK 后手工 COMMIT）

## 3. 功能域判读依据（git diff 逐文件抽查）

- 协议留痕：AuthController/RegisterRequest 增加 agreedLegalVersion；AuthService 接口新重载；RealAuthService 注入 AgreementConsentService 落库（source=REGISTER）；客户端 register/index.vue + services/auth.ts + services/config.ts（fetchAgreedLegalVersion 兜底 '1.0.0'）
- 实名照片保留策略：MediaAsset 加 category 列（V…0001）、RealNameMediaPurgeService（30 天定时清除）、RealAccountSecurityService 注销时 purgeByUserId、MediaAccessController 按 DB 分类授权、application.yml 加 verification.photo-retention-days
- 微信支付：wxpay/ 11 文件（APIv3 验签/AES-GCM 解密/IP 白名单/时间戳防重放/enabled=false 封存态 404 + fail-fast）、PaymentCallbackLog 扩展、PaymentMetrics 失败计数器、SecurityConfig 回调 permitAll、application*.yml wechat-pay 段
- VIP 订单：VipOrder/VipOrderRepository/VipOrderController/VipOrderService（下单/退款状态机）、BillingController/Service 重构、AdminVipController 管理员退款端点（仅 SUPER_ADMIN）、client subpackages/vip/index.vue 真实拉起支付
- 登录安全：LoginAttemptService（账号级防爆破，5 次锁 15 分钟，Redis 故障 fail-open）、SmsCode 服务化+1 次/分钟限流、ADMIN_PASSWORD 明文兜底移除
- 资金端点加固：IdempotentInterceptor strict 模式（Redis 不可用时 /wallet/**、/vip/** 503 fail-closed）、WalletController 服务端价格目录+演示充值隔离、RealWhisperService 退款 REQUIRES_NEW 独立事务可对账（WHISPER-REFUND-{orderId}）
- 内容安全接线：chat 2 + discover + village + profile 五链路 rejectIfRisky（msgSecCheck v2，checker 在 HEAD 已存在未改）
- client 编辑页：MP-R7-EDITPAGE（setup/profile 双模式 + stores/profile.ts avatarUrl/photoGallery + saveBasicUpdate）
- client 构建链：release-chain.mjs 收敛 build:mp-weixin:real、run-vitest.mjs、lazyCodeLoading、SHOWCASE 编译期剔除（package.json uni-app.scripts define）
- client 隐私合规：manifest __usePrivacyCheck__ + App.vue onNeedPrivacyAuthorization + docs/wechat-submission-materials-checklist.md 提审清单
- 基础设施：ci.yml 供应链推送闸（cosign 未配密钥默认拒绝未签名镜像出仓）、.gitignore 泄露面（tmp_*_token.txt/*.aof）、WebSocketConfig Origin fail-fast

## 4. 依赖序与提交编排（12 条，编排层单点顺序执行）

1. feat(db) 迁移+sanitize（8）
2. feat(consent) 协议域模型（3）
3. feat(wxpay) 支付管道（15）
4. feat(vip) 订单域（13，**含 wxpay/WxPayRefundNotifyController**）
5. feat(verification) 实名照片保留（12）
6. feat(auth) 登录安全+协议接线（14）
7. feat(wallet) 资金端点加固（7）
8. feat(content) 内容安全接线（5）
9. feat(client) 编辑资料页+图标（11）
10. feat(client) 隐私授权+提审清单（3）
11. chore(client) 构建链（8）
12. chore(infra) CI 闸+配置+WS Origin（5）

编译序关键证据：
- VipOrderService.java:11-15 import wxpay 5 类；WxPayRefundNotifyController.java:5 `import com.campuslove.api.vip.VipOrderService` —— **wxpay↔vip 双向依赖**，故 wxpay 主体先落（提交 3）、RefundNotifyController 随订单域落（提交 4），两个中间提交均可编译
- wxpay 两个测试不 import vip（grep 实测 none）；SecurityConfig 仅字符串放行 "/api/v1/refund/notify"，无类依赖
- RealAuthService 引用 AgreementConsentService（提交 2 先落）与 LoginAttemptService（同提交）；`grep "implements AuthService"` 仅 Mock/Real 两处实现且都在提交 6
- RealAccountSecurityService 引用 RealNameMediaPurgeService（提交 5 同提交）

## 5. 校验（本轮实际执行）

- 路径存在性：104/104 全部存在（while read -e 循环，0 MISSING）
- 判域合规：plan 中 apps/|database/|docs/wechat-|.github/|.gitignore 之外 0 条；scripts/qa/ 与 reports/ 0 条
- 无重复：sort|uniq -d 空
- 全覆盖：`comm` 比对 status 域内清单（104）与 plan（104）——未覆盖 0、多规划 0
- git add/commit：未执行（硬纪律）

## 6. 保留与遗留（skipped/notes 对应）

- docker/prometheus/rules/alert-rules.yml(M)：不在判域，未入 plan（PaymentMetrics 注释提到该告警规则，属 docker/** 另册）
- scripts/verify-env-release.mjs(M)：不在判域（scripts/ 根），未入 plan；注意 apps/client package.json 的 release-chain 引用它——若编排层最终不提交该文件，release-chain 仍可运行（文件已在 HEAD），无阻断
- scripts/qa/** M 9 + ?? 16：QA 台账体另册，本车道一律不碰
- reports/** 全部 M/D/??: 不碰（历史截图删留 3851 D 属 rootorg 车道已裁决项）
- 6 个 svg 图标：`git status` 为 M 但 `git diff` 内容为空（疑似 EOL 归一化假差异），已随提交 9 入 plan，编排层 stage 之属无害操作
- 根 package.json / pnpm-lock.yaml 未修改，无对应提交
