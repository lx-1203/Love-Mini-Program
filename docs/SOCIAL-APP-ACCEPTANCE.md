# 社交 APP 标准流程验收清单（Social App Acceptance Checklist）

> 对应规范：微信小程序官方《小程序设计指南》《小程序平台运营规范》《用户隐私保护指引填写说明》+ 通用社交 APP 功能模块基准
> 适用范围：校园恋爱小程序 C 端功能验收（微信小程序提审前）
> 维护者：产品 / QA / Release Manager
> 最近更新：2026-08-10
> 版本：v1.0
> 配套文档：`docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md`（提审材料 L01-L25）、`docs/release-checklist.md`（发布门禁）、`docs/API-CONTRACT.md`（契约权威源）

---

## 用法说明

- **验收流程**：按 §1 各模块逐项走查，每项在微信开发者工具 + 真机预览（real 模式）中执行操作步骤，对照「通过标准」判定。
- **勾选规则**：通过后在状态列填 `[x]` 并在验收记录列注明日期与证据（截图存档路径）。
- **前置条件**：real 后端已启动（MySQL/Redis）、体验账号/微信登录可用、admin 已配置基础数据（学校/敏感词/活动等）。

---

## §1 社交 APP 标准模块逐项验收

> 模块划分对齐通用社交 APP 功能基准：用户中心 / 内容发布与发现 / 关系链 / 即时通讯 / 通知系统 / 安全与治理 / 设置与帮助。

### 1.1 用户中心（注册/登录/资料）

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| U01 | 微信登录 | 登录页点微信登录 → 授权 → 进入主流程 | 成功进入 discover 页，会话持久（杀进程重进仍登录） | `POST /api/v1/auth/wechat`（WechatAuthController）、pages/login/index.vue | [ ] |
| U02 | 手机号注册/登录 | 输入手机号+验证码（mock/测试环境）+昵称+出生日期注册；已注册则登录 | 注册成功自动登录；未成年（<18）被拒（403 MINOR_NOT_ALLOWED）；登录成功进入主流程 | `POST /auth/register`、`POST /auth/phone-login` | [ ] |
| U03 | 体验账号一键登录 | 登录页点「一键体验」 | 无密码直接进入全部功能 | `POST /auth/guest-login`（开关 app.guest-login.enabled） | [ ] |
| U04 | 协议勾选绑定 | 不勾选《用户协议》《隐私政策》时点击任何登录方式 | 所有登录方式（微信/手机号/体验/Apple）均被拦截并提示「请先同意协议」 | pages/login/index.vue `agreed` 守卫（5 处提交点） | [ ] |
| U05 | 资料编辑 | 我的 → 完善资料：头像/昵称/性别/学校/签名 | 修改即时生效；资料完整度（/profile/stats）随填写提升；敏感词昵称被拦截 | `GET/PUT /profile/basic`、ProfileUpdateService（SensitiveWordFilter） | [ ] |
| U06 | 登出 | 我的 → 设置 → 退出登录 | 回到登录页；JWT 进黑名单（同 token 重放被拒） | `POST /auth/logout`、RedisTokenBlacklistService | [ ] |
| U07 | 注销账号 | 安全中心 → 注销 → 确认文字+密码 | 二次确认后注销成功；账号不可再登录 | `POST /auth/deactivate` | [ ] |

### 1.2 内容发布与发现（帖子/圈子/话题/活动/搜索）

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| C01 | 村口发帖 | 圈子 tab → 发布 → 填标题/正文/图片 → 发布 | 发布成功出现在帖子流；含敏感词被拦截；分享卡片可从详情页右上角「...」触发 | `POST /api/v1/posts`、pages/village/post.vue | [ ] |
| C02 | 帖子互动 | 详情页点赞/评论/收藏 | 计数实时更新；评论含敏感词被拦截；举报入口可用（见 S03） | `POST /posts/{id}/like`、`/comments`、`/favorite`、VillageInteractionService | [ ] |
| C03 | 帖子分享 | 详情页右上角「...」→ 分享给好友/朋友圈 | 分享卡片标题=帖子标题，接收方点开落到对应帖子 | pages/village/detail.vue onShareAppMessage/onShareTimeline | [ ] |
| C04 | 兴趣圈分类 | 圈子页顶部切换分类（学习/运动/音乐…） | 分类过滤由服务端返回（GET /api/v1/circles?category=），空分类显示诚实空态 | `GET /api/v1/circles?category=`（2026-08-10 B4）、pages/circles/index.vue | [ ] |
| C05 | 圈子话题 | 圈子内发布话题 → 列表 → 详情 → 回复 | 话题/回复发布成功；话题详情右上角分享卡片可用 | `POST /api/v1/circles/{id}/topics`、pages/circles/topic-detail.vue | [ ] |
| C06 | 校园话题 | 校园频道 → 发话题（含标签）→ 详情回复 | 标签（≤5 个）随话题保存并回显；分享卡片可用 | `POST /api/v1/campus/topics`（tags 字段，2026-08-10 B5） | [ ] |
| C07 | 活动浏览/报名 | 讨论圈/活动页 → 活动详情 → 报名/取消 | 报名成功有反馈；活动分享卡片可用 | `GET /activities`、`POST /activities/{id}/enroll`、pages/activities/detail.vue | [ ] |
| C08 | 用户搜索 | 发现页搜索框输入昵称/学校 → 结果列表 → 点击进对方主页 | 结果排除自己与拉黑双方；分页正常；点结果跳对方主页 | `GET /api/v1/search/users`（2026-08-10 B10）、subpackages/discover/user-search | [ ] |
| C09 | 恋爱认证 | 恋爱中心 → 恋爱认证 → 上传证件 → 提交 | 提交后状态 pending；30s 轮询自动刷新为 approved/rejected（rejectReason 回显） | `GET/POST /api/v1/verification`（2026-08-10 B2 轮询）、admin 审核流 | [ ] |

### 1.3 关系链（推荐/匹配/关注/心动）

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| R01 | 推荐卡片流 | 匹配 tab 左右滑卡片 | 每日限额/剩余可查；滑过的不重复出现；卡片分享可用 | `GET /api/v1/recommendations`、pages/discover/index.vue | [ ] |
| R02 | 喜欢/匹配 | 卡片右滑喜欢；互相喜欢 | 互相喜欢触发匹配成功通知；可进入聊天 | `POST /api/v1/likes/{userId}`、RealMatchService | [ ] |
| R03 | 心动信号 | 收到心动信号 → 信号列表 → 回复 | 信号列表展示/处理完整；未读角标更新 | `GET /api/v1/matches/heart-signals`、pages/heart-signals/index.vue | [ ] |
| R04 | 关注/粉丝 | 对方主页 → 关注；我的主页查看粉丝/关注 | 计数正确；互关状态正确 | `POST/DELETE /users/{id}/follow`、pages/profile/other.vue | [ ] |

### 1.4 即时通讯（私信/临时聊天）

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| M01 | 会话列表 | 消息 tab → 会话列表 | 置顶在前、未读角标正确（免打扰会话不计角标）；左滑可置顶/免打扰/标未读/删除 | `GET /api/v1/messages/conversations`、pages/messages/index.vue | [ ] |
| M02 | 发送消息 | 进入会话 → 输入 → 发送 | 消息实时送达（WS /queue/messages）；发送中/失败状态可见；含敏感词被拦截 | `POST /conversations/{id}/messages` + WS /app/chat/send、RealPrivateMessageService | [ ] |
| M03 | 已读回执 | A 发消息 → B 打开会话 → A 的会话预览未读清零 | B 打开会话后 A 侧未读清零；会话内已读状态正确 | `PUT /conversations/{id}/read` | [ ] |
| M04 | 会话免打扰 | 会话右上角「...」→ 消息免打扰 | 开关即时生效且**持久化**（刷新/重进仍保持；后端 user_a_muted/user_b_muted） | `PUT /conversations/{id}/mute`（2026-08-10 B1③）、chat-session handleToggleMute | [ ] |
| M05 | 正在输入提示 | 双账号：A 输入文字 → B 会话页 | B 显示「对方正在输入...」；A 停止输入 2.5s 后消失；A 离开页面后消失 | WS /app/chat/typing → /queue/typing（2026-08-10 B1④） | [ ] |
| M06 | 删除消息 | 长按消息 → 删除 | 仅删除者本地不可见（微信语义）；对方仍可见；重进会话不恢复 | `DELETE /api/v1/messages/{messageId}` + 本地 DELETED_MESSAGE_IDS | [ ] |
| M07 | 拉黑用户 | 会话右上角「...」→ 拉黑 → 确认 | 拉黑后：会话从列表消失、消息发送被拦、推荐/搜索排除该用户 | `POST /users/{id}/block`、RealBlockService（三处生效） | [ ] |
| M08 | 分享对方主页 | 会话右上角「...」→ 分享 | 分享卡片=对方主页，接收方点开浏览对方主页 | chat-session onShareAppMessage（2026-08-10 A3） | [ ] |
| M09 | 临时匿名聊天 | 推荐流 → 破冰话题 → 临时会话 | 匿名身份聊天；限时结束；联系方式交换流程可用 | `/api/v1/temp-chat/sessions/**`、features/chat/session-machine.ts | [ ] |

### 1.5 通知系统

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| N01 | 站内通知 | 触发互动（点赞/评论/心动/匹配）→ 消息页通知列表 | 通知实时到达（WS /queue/notifications）；未读角标正确 | `GET /api/v1/notifications`、`/notifications/interactions`、RealNotificationService | [ ] |
| N02 | 通知已读 | 打开通知 → 标记已读/全部已读 | 角标清零；已读态持久 | `PUT /notifications/{id}/read`、`/read-all` | [ ] |

### 1.6 安全与治理

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| S01 | UGC 内容安全 | 用含敏感词的昵称/帖子/评论/私信/话题/圈子名做发布测试 | 全部被本地敏感词过滤拦截（SensitiveWordFilter 已覆盖 10+ 服务）；admin 敏感词库可维护 | SensitiveWordFilter + AdminSensitiveWordController；微信 msgSecCheck 凭据就绪后自动优先（WeChatMsgSecCheckClient，C1） | [ ] |
| S02 | 举报 | 帖子详情/评论/用户主页/会话内 → 举报 → 选原因 | 举报提交成功；admin 举报处置后台可见 | `POST /reports`、`POST /posts/{id}/report`、profile/other 治理菜单（2026-08-10 C2） | [ ] |
| S03 | 拉黑 | 见 M07；用户主页「···」→ 拉黑 | 主页级拉黑入口可用（2026-08-10 C2 补齐） | profile/other.vue openGovernanceMenu | [ ] |
| S04 | 设备管理 | 安全中心 → 设备列表 → 下线 | 设备列表来自后端（GET /auth/devices）；下线调用 revoke；当前设备可识别 | `GET /auth/devices`、`POST /devices/{id}/revoke`、pages/security/index.vue | [ ] |
| S05 | 修改密码/换绑手机 | 安全中心 → 修改密码/更换手机号 | 旧密码校验；成功后生效 | `POST /auth/change-password`、`/auth/change-phone` | [ ] |

### 1.7 设置与帮助

| # | 验收项 | 验收流程（操作步骤） | 通过标准 | 代码/端点引用 | 状态 |
|---|--------|----------------------|----------|---------------|------|
| H01 | 用户协议/隐私政策 | 登录页勾选处点击协议链接 | 可完整阅读；协议页在 subpackages/legal 分包 | subpackages/legal/{privacy,agreement}/index.vue + LegalTextPage | [ ] |
| H02 | 帮助与反馈 | 我的 → 帮助与客服 → 反馈中心 | 反馈提交成功；反馈历史可查 | `/api/v1/feedback/**`、subpackages/support/feedback/index.vue | [ ] |
| H03 | 隐私设置 | 我的 → 隐私设置 | 开关持久化且与后端同步 | `PUT /profile/privacy`、STORAGE_KEYS.PRIVACY_SETTINGS | [ ] |
| H04 | 每日签到/任务 | 首页签到卡片 / 任务中心 | 签到连续天数与奖励正确；任务领取幂等 | `POST /api/v1/check-in`、`/tasks/{code}/claim` | [ ] |

---

## §2 微信审核红线合规

| # | 红线项 | 合规依据（代码/配置） | 验收方法 | 状态 |
|---|--------|----------------------|----------|------|
| W01 | UGC 内容安全机制 | SensitiveWordFilter 覆盖帖子/评论/话题/私信/临时聊天/圈子/昵称/签名（10+ 服务，JUnit ContentSecurityCoverageTest 断言）；微信 msgSecCheck 凭据就绪后自动优先（app.content-security.wechat-secret，fail-closed 降级本地） | 见 S01 | [ ] |
| W02 | 举报/拉黑可用 | 帖子详情/评论/用户主页/会话内举报入口 + 用户主页/会话拉黑；admin 处置后台（AdminReportController） | 见 S02/S03/M07 | [ ] |
| W03 | 用户协议+隐私政策主动勾选 | 登录页 5 种登录方式均绑定 agreed 守卫；协议链接可跳转完整页面（subpackages/legal） | 见 U04/H01 | [ ] |
| W04 | 隐私保护指引（后台配置） | `__usePrivacyCheck__: true` + App.vue `wx.onNeedPrivacyAuthorization` + utils/privacy.ts `ensurePrivacyAuthorized`（验证上传前调用）；manifest 已移除未使用的 scope.userLocation 声明 | 微信公众平台后台「用户隐私保护指引」与代码收集行为逐项核对（线下，见 WECHAT-MINI-PROGRAM-ACCEPTANCE.md） | [ ] |
| W05 | 内容安全红线（社交类目） | 类目=社交；校园认证（实名）机制存在（CampusCertification + admin 审核）；学号/学生证认证阻断陌生人冒充 | 提审材料 L06/L07（线下） | [ ] |
| W06 | 主包 ≤2MB / 总包 ≤20MB | dev 构建门禁（--allow-mock）+ real 构建严格门禁（scripts/verify-package-size.mjs）；2026-08-10 实测 real 主包 1.80MB | 见 §3 门禁命令 | [ ] |
| W07 | sitemap 配置 | src/sitemap.json（allow all）+ project.config.json sitemapLocation | 构建产物含 dist/sitemap.json | [ ] |
| W08 | 分享合规（无诱导） | 分享均为用户主动触发（右上角菜单/分享按钮），无「转发后可见」诱导 | 走查全部 onShareAppMessage（2026-08-10 A3 补齐 9 页） | [ ] |
| W09 | HTTPS 合法域名 | verify-env-release.mjs 强制 real 构建 VITE_API_BASE_URL 为 HTTPS 且非本机；request 合法域名白名单（线下，L18） | 构建门禁 + 提审材料 L18 | [ ] |

---

## §3 提审前自动化门禁（合并执行命令）

```bash
# 1. 前端类型检查 + 单测
cd apps/client && npx vue-tsc --noEmit && pnpm run test:unit

# 2. 后端单测（122+ 文件，含 ContentSecurityCoverageTest）
cd apps/api && ./mvnw.cmd test

# 3. mp-weixin 构建 + 包体积门禁（dev 构建）
cd apps/client && npm run build:mp-weixin          # 内部执行 verify-package-size --allow-mock

# 4. real 构建严格门禁（需真实 HTTPS 域名，verify-env-release 校验）
cd apps/client && npm run build:mp-weixin:real     # 严格主包 ≤2MB / 总包 ≤10MB / mock+en 桩化

# 5. API 契约 OpenAPI lint（Spectral）
cd apps/api && pnpm run lint:openapi
```

---

## §4 已知占位与降级说明（需额外授权，不强制实现）

| 项 | 现状 | 授权依赖 | 位置 |
|----|------|----------|------|
| 微信支付/商城购买 | 商品列表/详情已接后端真实数据（GET /products），购买按钮占位 toast | 微信支付商户号 | subpackages/market/detail/index.vue handleBuyNow |
| VIP 会员购买 | R4 决策「VIP 暂缓上线」，购买页为占位说明 | 产品决策 + 支付 | subpackages/vip/index.vue |
| 微信官方内容安全 API（msgSecCheck） | 已实现可插拔适配器（WeChatMsgSecCheckClient，@ConditionalOnProperty），配置 CONTENT_SECURITY_WECHAT_SECRET 即启用；未配置时本地敏感词兜底 | 认证小程序 + 正式 AppSecret | config/WeChatMsgSecCheckClient.java |
| 微信订阅消息推送 | WeChatPushService 保留，未新增前端引导流程 | 模板审核 + 用户逐次授权 | growth/WeChatPushService.java |

## 已知平台差异与测试说明（2026-08-10 全页面审查记录）

1. **H5 端无底部 TabBar**：pages.json 的 tabBar 为 `custom: true`，自定义 TabBar 仅 mp-weixin 端实现
   （src/custom-tab-bar/）；components/layout/TabBar.vue（H5 组件）已存在但未接线到页面。
   H5 端用户在浏览器中靠 URL/页面内入口导航。小程序端不受影响（真机/开发者工具有原生 tabBar）。
   修复方案（如需）：在 5 个 tab 页统一引入 TabBar.vue 组件（navigation.ts appTabs 配置已就绪）。
2. **e2e 核心旅程数据依赖**：tests/e2e/specs/core-journey.spec.ts 的推荐卡片/会话列表断言
   依赖 mock 播种数据；H5 + real 后端联调时新体验账号无推荐/会话数据 → 2 个用例因数据为空失败
   （页面本身渲染正常，all-pages-smoke 57 页全过）。运行条件：mock dev server + mock fixtures 数据。
3. **微信登录仅小程序端**：uni.login(provider=weixin) 在 H5 不可用，e2e 已改用体验号登录（guest-login）。
4. **全页面冒烟**：tests/e2e/specs/all-pages-smoke.spec.ts（@all-pages，57 路由断言无 JS 错误 + 有渲染内容），
   H5 dev server 就绪后运行（详见该文件头注释）。

---

## §5 验收证据存档约定

- 真机走查截图统一存档：`verification_logs/2026-08-10-social-acceptance/`（按模块分目录：user/ content/ relation/ im/ notify/ safety/ help/）
- 后端联调证据（curl 输出/WS 帧日志）：`verification_logs/2026-08-10-social-acceptance/api-calls.md`
- 每项验收完成后：状态列勾选 + 在「验收记录」附日期与截图文件名
- 全部完成后由 QA 签字确认，Release Manager 更新 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md` 提审状态
