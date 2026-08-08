# 第三方 SDK 列表

> 版本：v1.2.0
> 生效日期：2026-08-09
> 维护者：法务 + Release Manager
> 适用范围：校园恋爱微信小程序（mp-weixin 主目标，H5 同步发布）
> 关联文件：[隐私政策](./privacy-policy.md)、[用户协议](./user-agreement.md)
>
> Task 23（FIN-00274）复核（2026-07-28）：
> - Sub-Agent 通读 `apps/client/src/services/sentry.ts` 与 `apps/client/src/main.ts`，
>   核实 Sentry SDK 的实际启用状态、平台分发逻辑与版本号。
> - 结论：Sentry SDK 仅在 H5 环境且配置 `VITE_SENTRY_DSN` 时启用；
>   微信小程序（mp-weixin）环境**不加载** Sentry SDK，错误经自有后端接口
>   `/api/error-reports` 上报，属第一方数据收集，不涉及第三方 SDK。
> - 本次更新（v1.1.0）：明确披露平台差异、补充 SDK 版本号、新增第一方
>   错误上报通道说明、修正 Sentry 数据收集范围表述。
>
> P1.20（2026-07-28）再次复核：
> - 已读取 `apps/client/package.json:46-52`，确认 Sentry 依赖仍存在：
>   `@sentry/vue@^8.42.0`、`@sentry/browser@8.55.2`、`@sentry/core@8.55.2`、
>   `@sentry-internal/browser-utils@8.55.2`、`@sentry-internal/feedback@8.55.2`、
>   `@sentry-internal/replay@8.55.2`、`@sentry-internal/replay-canvas@8.55.2`。
> - **Sentry SDK 状态结论：已启用（仅 H5 环境，mp-weixin 不加载）**。
>   - H5：当 `VITE_SENTRY_DSN` 环境变量已配置时启用，采集设备信息、IP（可脱敏）、
>     崩溃堆栈、用户操作路径（面包屑）、性能指标（LCP/FCP/INP）；上报前进行 PII 脱敏。
>   - mp-weixin：不加载 Sentry SDK（通过 `// #ifdef H5` 条件编译隔离），
>     错误数据通过本服务自有后端接口 `/api/error-reports` 上报（第一方数据收集）。
> - 数据收集范围已在第 1.3 节「Sentry SDK」表格中完整披露，本次复核无新增内容。
> - 关闭方式：移除 `.env.production` 中的 `VITE_SENTRY_DSN` 即可完全禁用 Sentry SDK。

---

## 引言

校园恋爱微信小程序（以下简称"本服务"）集成了以下第三方 SDK。本文档根据《个人信息保护法》《App 违法违规收集使用个人信息行为认定方法》要求，向用户披露各 SDK 的提供方、用途、收集数据类型与隐私政策链接。

本服务在用户首次使用涉及 SDK 数据收集的功能前，会通过微信平台的隐私授权机制（`wx.onNeedPrivacyAuthorization`）征得您的同意。

> **平台差异提示**：本服务同时在微信小程序（mp-weixin）与 H5 两个平台发布。
> 不同平台集成的第三方 SDK 存在差异，详见各 SDK 条目的"适用平台"字段。

---

## 1. SDK 列表

### 1.1 微信开放平台 SDK

| 项 | 内容 |
|----|------|
| **SDK 名称** | 微信开放平台 SDK（微信小程序原生） |
| **适用平台** | mp-weixin（小程序运行时内置，无需额外引入） |
| **提供方** | 深圳市腾讯计算机系统有限公司 |
| **用途** | 微信登录（`wx.login`）、微信支付（`wx.requestPayment`）、分享（`wx.shareAppMessage`）、用户信息授权（`wx.getUserProfile`） |
| **收集数据类型** | OpenID、UnionID、微信昵称、微信头像、设备标识（IDFA/OAID，仅 iOS/Android）、网络类型、IP 地址 |
| **数据用途** | 身份识别、登录鉴权、支付下单、内容分享 |
| **隐私政策链接** | https://privacy.weixin.qq.com/ |
| **数据传输** | 数据直接传输至腾讯服务器，本服务不中转 |
| **使用场景** | 用户主动点击"微信登录"、用户主动发起支付、用户主动点击分享 |
| **合规说明** | 仅在用户主动操作时调用，不进行后台静默收集；登录态通过 JWT + Redis 黑名单管理，不存储微信账号密码 |

### 1.2 高德地图 SDK

| 项 | 内容 |
|----|------|
| **SDK 名称** | 高德地图微信小程序 SDK |
| **适用平台** | mp-weixin（通过 `wx.chooseLocation` 调用，运行时内置） |
| **提供方** | 北京高德云图科技有限公司 |
| **用途** | 位置选择（`wx.chooseLocation`）、地理编码（地址转坐标）、附近活动距离计算 |
| **收集数据类型** | 设备标识（IDFA/OAID/IMEI）、当前位置（经纬度，仅在用户主动选择地点时）、IP 地址、网络类型 |
| **数据用途** | 显示用户选择的地点名称与坐标，计算附近活动的距离 |
| **隐私政策链接** | https://lbs.amap.com/pages/privacy/ |
| **数据传输** | 数据直接传输至高德服务器，本服务仅存储用户最终选择的地点名称与坐标 |
| **使用场景** | 用户在发布活动时主动选择地点、用户在查看附近活动时主动选择"附近"功能 |
| **合规说明** | 仅在用户主动操作时调用，不进行后台持续定位；用户可在系统设置中随时撤回位置授权 |

### 1.3 Sentry SDK（仅 H5 启用）

> **重要说明**：Sentry SDK 仅在 H5 环境且配置了 `VITE_SENTRY_DSN` 环境变量时才会启用。
> 微信小程序（mp-weixin）环境**不会加载** Sentry SDK，错误数据通过本服务自有的
> 后端接口 `/api/error-reports` 上报（详见第 1.4 节"第一方错误上报通道"）。
>
> 代码引用：
> - `apps/client/src/services/sentry.ts:67-69,82-113`：通过 `// #ifdef H5` 条件编译
>   仅在 H5 端 import `@sentry/vue`；`initSentry(app)` 在 mp-weixin 环境直接 return。
> - `apps/client/src/main.ts:6,119`：在 `initMonitoringAndI18n` 中调用 `initSentry(app)`。
> - `apps/client/package.json:46-52`：依赖 `@sentry/vue@^8.42.0` 与
>   `@sentry-internal/*` / `@sentry/browser@8.55.2` 等。

| 项 | 内容 |
|----|------|
| **SDK 名称** | Sentry Browser SDK（@sentry/vue） |
| **适用平台** | 仅 H5（mp-weixin 不加载） |
| **版本** | `@sentry/vue@^8.42.0`（实际锁定 `@sentry-internal/*`、`@sentry/browser`、`@sentry/core` 等到 `8.55.2`） |
| **提供方** | Functional Software, Inc.（Sentry） |
| **用途** | 错误监控、崩溃日志收集、性能指标采集、用户行为面包屑记录 |
| **启用条件** | ① 运行环境为 H5（`typeof window !== "undefined"`）；② 已配置 `VITE_SENTRY_DSN` 环境变量。两个条件均不满足时跳过初始化，不进行任何数据上报。 |
| **收集数据类型** | 设备信息（型号、操作系统、浏览器）、IP 地址（可配置脱敏）、崩溃堆栈、用户操作路径（面包屑，含页面 URL、按钮 ID，不含业务数据）、性能指标（LCP/FCP/INP 等） |
| **数据用途** | 排查客户端 bug、监控性能瓶颈、追踪异常发生时的用户操作路径 |
| **隐私政策链接** | https://sentry.io/privacy/ |
| **数据传输** | 数据传输至 Sentry 云服务器（中国大陆区域服务通过阿里云香港中转，可配置为本地化部署） |
| **使用场景** | 应用启动时自动初始化，在发生未捕获异常或性能指标达标时自动上报；关键按钮点击（如登录、支付）记录面包屑，但不上报业务数据（如手机号、密码、token） |
| **合规说明** | 上报数据前进行 PII 脱敏（手机号、邮箱、token 替换为 `[REDACTED]`）；用户可在"设置 → 隐私管理"中关闭错误上报；不上报用户原创内容（帖子正文、聊天消息等） |
| **关闭方式** | 移除 `.env.production` 中的 `VITE_SENTRY_DSN` 配置即可完全禁用 Sentry SDK，不影响 H5 应用正常运行 |

### 1.4 第三方 AI 服务（Agnes AI，非客户端 SDK）

> **重要说明**：Agnes AI 是**后端代理的第三方 AI 生成服务**，非客户端集成的 SDK。客户端不直接
> 与 Agnes AI 通信，生成请求经由本服务后端代理（`POST /api/v1/ai/video/generate`、
> `POST /api/v1/ai/image/generate`、`GET /api/v1/ai/health`）转发，API Key 仅保存在后端。
> 该功能当前**规划中（未实现）**——接口与前端服务已实现，但尚未向用户开放入口；
> 隐私政策 3.5 节已对该服务进行完整披露。
>
> 代码引用：
> - `apps/api/src/main/java/com/campuslove/api/ai/AiVideoController.java`（代理控制器）
> - `apps/api/src/main/java/com/campuslove/api/ai/RealAiVideoService.java`（上游调用，real profile）
> - `apps/client/src/services/agnes-video.ts`（客户端服务封装，当前无页面接入）
> - `compose/.env.example`（AGNES_API_KEY / AGNES_API_BASE 配置）

| 项 | 内容 |
|----|------|
| **服务名称** | Agnes AI（AI 视频/图片生成服务） |
| **类型** | 第三方 AI 服务（后端代理调用，非客户端 SDK） |
| **适用平台** | 全部（经后端代理，与客户端平台无关） |
| **提供方** | Agnes AI 运营方 |
| **用途** | AI 视频/图片生成：根据用户输入的生成提示词（prompt）与生成参数生成视频/图片 |
| **收集数据类型** | 用户主动输入的生成提示词、生成参数（风格/时长/分辨率等） |
| **不收集** | 手机号、OpenID、昵称等身份标识不随生成请求传输 |
| **数据用途** | 生成视频/图片并返回给用户下载或发布 |
| **隐私政策链接** | https://agnes-ai.com（Agnes AI 官方政策） |
| **数据传输** | 生成请求经本服务后端 HTTPS 转发至 Agnes AI 服务器；API Key 仅存后端 |
| **使用场景** | 用户使用 AI 视频/图片生成功能时（功能规划中，启用前将另行征得同意） |
| **合规说明** | 功能正式上线启用前将通过弹窗征得用户同意；用户可选择不使用该功能 |

### 1.5 第一方错误上报通道（mp-weixin 主通道、H5 兜底通道）

> **本节为第一方数据收集机制，不涉及第三方 SDK，但根据《个人信息保护法》精神
> 一并向用户披露。**

| 项 | 内容 |
|----|------|
| **通道名称** | 校园恋爱自有错误上报接口（`/api/error-reports`） |
| **适用平台** | mp-weixin（主通道）、H5（Sentry 未初始化时兜底通道） |
| **提供方** | 校园恋爱后端服务（本服务自有） |
| **用途** | 收集客户端未捕获异常与崩溃堆栈，用于问题排查与稳定性监控 |
| **收集数据类型** | 错误消息（message）、错误堆栈（stack）、错误名称（name）、上下文信息（context，如来源标识 source、HTTP URL/status）、时间戳（timestamp）、平台标识（platform：h5 / mp-weixin） |
| **数据用途** | 排查客户端 bug、聚合异常频率、监控应用稳定性 |
| **数据传输** | 数据通过 HTTPS 传输至本服务自有后端服务器，存储于本服务自有数据库；不传输至任何第三方 |
| **使用场景** | ① mp-weixin 环境发生未捕获异常时（`uni.onError` / `uni.onUnhandledRejection` / Vue `errorHandler`）；② H5 环境未配置 `VITE_SENTRY_DSN` 或 Sentry 初始化失败时的兜底通道 |
| **合规说明** | 不上报用户原创内容（帖子正文、聊天消息）；不上报敏感字段（手机号、邮箱、token、密码）；上报 payload 仅包含技术诊断信息；用户可在"设置 → 隐私管理"中关闭错误上报 |
| **代码引用** | `apps/client/src/services/sentry.ts:381-411`（`reportErrorToBackend`）；`apps/client/src/main.ts:42-46`（`reportGlobalError` 调用 `captureException`） |

---

## 2. SDK 数据收集范围对照

| SDK / 通道 | 平台 | 设备标识 | 位置信息 | IP 地址 | 用户内容 | 行为日志 |
|-----|------|---------|---------|---------|---------|---------|
| 微信开放平台 | mp-weixin | ✅ | ❌ | ✅ | ❌ | ❌ |
| 高德地图 | mp-weixin | ✅ | ✅（用户主动选择时） | ✅ | ❌ | ❌ |
| Sentry SDK | 仅 H5 | ✅ | ❌ | ✅（可脱敏） | ❌（PII 脱敏） | ✅（操作路径，不含业务数据） |
| Agnes AI 服务 | 全部（经后端代理，规划中） | ❌ | ❌ | ❌（后端日志保留） | ✅（用户主动输入的生成提示词/参数） | ❌ |
| 第一方错误上报通道 | mp-weixin（主）+ H5（兜底） | ❌ | ❌ | ❌（后端日志保留） | ❌ | ❌（仅错误堆栈与来源标识） |

---

## 3. 合规说明

### 3.1 授权机制
- 本服务在 `manifest.json` 中配置 `__usePrivacyCheck__: true`，启用微信平台的隐私授权机制
- 用户首次使用涉及隐私接口（如 `wx.login`、`wx.chooseLocation`、`wx.getUserProfile`）前，会弹出隐私协议确认框
- 用户可选择"同意并继续"、"查看协议"或"不同意"
- 用户拒绝同意时，相关功能不可用，但不影响其他功能的使用

### 3.2 权限声明
本服务在 `manifest.json` 中声明的权限与使用场景：

| 权限 | 使用场景 | 用户授权时机 |
|------|----------|--------------|
| `scope.userLocation` | 显示附近活动距离、发布活动选择地点 | 用户点击"附近"或选择地点时 |
| `scope.userInfo` | 获取头像昵称 | 首次登录时 |
| `scope.camera` | 视频通话、头像拍摄 | 用户主动使用相机功能时 |
| `scope.record` | 语音消息、语音通话 | 用户按住录音按钮时 |
| `scope.writePhotosAlbum` | 保存图片到相册 | 用户主动点击保存时 |

### 3.3 数据最小化原则
- 本服务仅收集实现功能所必需的数据
- 各 SDK 调用均由用户主动触发，不进行后台静默收集
- 用户可在系统设置中随时撤回授权，撤回后相关功能不可用
- Sentry SDK 与第一方错误上报通道仅收集技术诊断信息，不上报用户原创内容与敏感业务字段

### 3.4 数据安全
- 所有 SDK 与服务端的通信均使用 HTTPS（TLS 1.2+）
- 微信开放平台与高德地图 SDK 由微信小程序运行时管控，符合微信安全标准
- Sentry SDK 在上报前进行 PII 脱敏，避免泄露用户隐私
- 第一方错误上报通道不上报敏感字段（手机号、邮箱、token、密码），仅保留技术诊断信息

### 3.5 第三方 SDK 变更
- 本服务如新增、变更或移除第三方 SDK，将通过小程序内公告通知用户
- 重大变更（如新增 SDK 收集新类型数据）将通过弹窗形式再次征得您的同意
- 您可在本页面查看历史版本（如需，请联系 privacy@campuslove.example.com）

### 3.6 平台差异说明（Task 23 新增）
- **mp-weixin 环境**：仅集成微信开放平台 SDK 与高德地图 SDK 两个第三方 SDK；错误数据通过第一方后端接口 `/api/error-reports` 上报
- **H5 环境**：在上述两个 SDK 之外，额外集成 Sentry SDK（仅在配置 `VITE_SENTRY_DSN` 时启用）；未配置 DSN 时降级使用第一方后端接口
- **Agnes AI 服务**：经后端代理调用，不属于客户端 SDK，与平台无关；功能规划中（未实现用户入口），隐私政策 3.5 节已完整披露
- 用户在不同平台使用本服务时，第三方 SDK 的实际加载情况以本节披露为准

---

## 4. 联系方式

如您对第三方 SDK 的使用有任何疑问，可通过以下方式联系我们：

- **隐私事务邮箱**：privacy@campuslove.example.com
- **反馈中心**：小程序内"我的 → 设置 → 反馈中心"
- **客服热线**：400-xxx-xxxx（09:00-22:00）

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-07-26 | v1.0.0 | 首次发布，列出微信开放平台、高德地图、Sentry 三个 SDK | 法务 |
| 2026-07-28 | v1.1.0 | Task 23（FIN-00274）复核：① 明确 Sentry SDK 仅在 H5 启用，mp-weixin 不加载；② 新增第 1.4 节"第一方错误上报通道"披露 mp-weixin 错误上报路径；③ 补充 Sentry SDK 版本号（@sentry/vue@^8.42.0 / @sentry-internal/*@8.55.2）；④ 各 SDK 条目新增"适用平台"字段；⑤ 第 2 节对照表新增"第一方错误上报通道"行与"平台"列；⑥ 第 3.6 节新增"平台差异说明"；⑦ 补充代码引用（services/sentry.ts、main.ts、package.json） | Sub-Agent |
| 2026-07-28 | v1.1.1 | P1.20 复核：再次读取 `apps/client/package.json:46-52` 确认 Sentry 依赖仍存在（@sentry/vue@^8.42.0 / @sentry/browser@8.55.2 等 7 个 Sentry 包）；补充 P1.20 复核结论——Sentry SDK 已启用（仅 H5 环境，mp-weixin 不加载），数据收集范围已在第 1.3 节完整披露，无需新增内容 | Sub-Agent |
| 2026-08-09 | v1.2.0 | R4-00521 修复：新增第 1.4 节"第三方 AI 服务（Agnes AI，非客户端 SDK）"披露 AI 视频/图片生成对用户输入内容的第三方处理（后端代理方式、传输内容、不收集身份标识、功能规划中）；第 2 节对照表与第 3.6 节同步补充 Agnes AI 条目；与隐私政策 3.5 节保持一致 | Sub-Agent |
