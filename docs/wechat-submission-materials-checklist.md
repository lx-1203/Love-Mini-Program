# 微信小程序提审材料清单（WeChat Submission Materials Checklist）

> 本文由 `apps/client/src/manifest.json` 头部注释引用（AppID 状态小节），
> 于 2026-10-05 建档。用途：每次提审/更新版本前，逐项核对并签字确认。
> 标注 **[运营材料]** 的条目属于运营侧工作，不在代码库内，无法由构建流水线保证，
> 是提审前人工检查的重点。

## 1. AppID 确认与签字 [运营材料]

- [ ] 当前 AppID：`wxc67cd233d72388d0`（三个文件已统一：
  `apps/client/src/manifest.json`（构建以此为准）、
  `apps/client/project.config.json`、根目录 `project.config.json`）
- [ ] 向微信开放平台/小程序后台核对该 AppID 为**正式注册**的小程序 AppID（非测试号）
- [ ] 若为测试 AppID：先替换为正式 AppID，同步更新上述三个文件
- [ ] 确认人与签字：________________　日期：________
- [ ] 确认截图存档：`verification_logs/2026-07-28-mp-wechat/appid-confirmation.png`（补新日期档）

## 2. 服务器域名（HTTPS + ICP）[运营材料]

微信小程序要求所有 request/uploadFile/downloadFile 域名 **HTTPS 且已 ICP 备案**，
不允许 IP、端口（仅 443）与本机地址。

- [ ] 生产后端域名：`https://____________________`（替代本地 `http://127.0.0.1:8080`）
- [ ] 该域名 HTTPS 证书有效（非自签、未过期、域名匹配）
- [ ] 该域名已完成 ICP 备案（备案号：________________）
- [ ] `apps/client/.env.real` 的 `VITE_API_BASE_URL` 已指向该域名
      （发布链 `verify-env-release.mjs` 会强制校验 HTTPS 且非本机，未配置则构建失败）
- [ ] WebSocket（wss://）域名如使用，同样已配置

## 3. 微信后台「request 合法域名」配置 [运营材料]

微信公众平台 → 开发管理 → 开发设置 → 服务器域名：

- [ ] request 合法域名加入上述生产域名
- [ ] uploadFile / downloadFile 合法域名按需加入（媒体上传 `/api/v1/media/upload` 同域即可）
- [ ] 确认未依赖「不校验合法域名」开发者选项（仅限开发调试）

## 4. 《用户隐私保护指引》配置 [运营材料]

微信后台「用户隐私保护指引」必须在**平台侧配置**，代码内的授权弹窗
（`apps/client/src/App.vue` 的 `wx.onNeedPrivacyAuthorization` 处理）不能替代：

- [ ] 微信后台已填写《用户隐私保护指引》（声明收集的信息类型需与实际使用一致：
  位置（`getLocation`，见 manifest `requiredPrivateInfos`）、相册/摄像头（选图上传）、
  昵称/头像等）
- [ ] `apps/client/src/manifest.json` 已开启 `"__usePrivacyCheck__": true`（2026-10-05 已完成，
  代码内授权弹窗由 App.vue onLaunch 注册）
- [ ] 隐私指引涉及 API 与实际调用一致（未声明的敏感 API 会被拦截/问询）
- [ ] 《用户协议》《隐私政策》文本与后台配置一致（后端 `/api/v1/config/legal` 可下发，
  注册请求携带 `agreedLegalVersion` 落库留痕）

## 5. 类目与资质 [运营材料]

- [ ] 小程序服务类目已配置（社交/婚恋类目通常需要额外资质，提前与平台确认）
- [ ] 涉及用户实名（后端有实名认证模块）：确认类目资质与《非个人主体》要求满足
- [ ] 如主体为个人开发者，确认功能范围不超出个人主体可用类目

## 6. 内容安全与审核链路（代码侧已具备，提审前复核）

- [ ] UGC（帖子/评论/话题/私信/临时聊天/昵称简介）均接入
  `ContentSecurityChecker`（微信 msgSecCheck v2 + 本地敏感词兜底，fail-closed）；
  微信侧凭据 `CONTENT_SECURITY_WECHAT_SECRET` 需配置后 msgSecCheck 才生效 [运营材料/环境变量]
- [ ] 社区内容审核制：新帖/话题默认 pending，由管理后台审核通过后可见
- [ ] 体验账号入口（guest-login）与 showcase 展示包**不随提审包发出**
      （showcase 路由已用 `#ifdef SHOWCASE` 编译期剔除）

## 7. 版本与材料归档

- [ ] `versionName` / `versionCode` 已按发布节奏更新（`apps/client/src/manifest.json`）
- [ ] 主包体积 ≤ 2MB：`pnpm -C apps/client build:mp-weixin:real` 的
  `PACKAGE_SIZE_RESULT` 门禁通过（报告归档 `reports/audit/`）
- [ ] 本次提审截图与审核备注文案存档 `verification_logs/`
- [ ] 复核人签字：________________　日期：________

---

**维护说明**：结构变更（新增权限、新域名、新类目）时同步更新本清单；
代码侧开关（`__usePrivacyCheck__`、隐私授权回调）有变动时更新第 4 节描述。
