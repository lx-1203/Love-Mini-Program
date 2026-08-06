# P0 微信小程序提审前合规自检清单

> Task 0.7.2 交付物。本清单依据《微信小程序平台运营规范》《微信小程序用户隐私保护指引》
> 与 P0 阶段（Task 0.1~0.6）改造内容制定，覆盖提审前必须落实的 10 类合规项。
>
> **使用方式**：
> 1. 自动检查：执行 `node scripts/p0-compliance-check.mjs`（见同目录脚本）输出 JSON 报告
> 2. 手动检查：依据本清单逐项核对，将结果填入「自检结果」列
> 3. 通过全部 P0 必选项后，方可提交审核

## 一、自检项总览

| # | 类别 | 检查项 | 级别 | 自检结果 | 证据/位置 |
|---|------|--------|------|----------|-----------|
| 1 | 隐私协议 | 隐私协议页面已配置 | P0-必选 | □通过 □不通过 | mp 后台「用户隐私保护指引」 |
| 2 | 隐私协议 | `__usePrivacyCheck__: true` | P0-必选 | □通过 □不通过 | `manifest.json` |
| 3 | 隐私协议 | `wx.onNeedPrivacyAuthorization` 已注册 | P0-必选 | □通过 □不通过 | `App.vue` onLaunch |
| 4 | 隐私协议 | 调用隐私接口前 `ensurePrivacyAuthorized()` | P0-必选 | □通过 □不通过 | 7 个组件 9 处调用 |
| 5 | 隐私协议 | `requiredPrivateInfos` 与实际使用一致 | P0-必选 | □通过 □不通过 | `manifest.json` |
| 6 | 类目合规 | 已选择「社交 > 婚恋」类目 | P0-必选 | □通过 □不通过 | mp 后台「基本设置」 |
| 7 | UGC 审核 | 敏感词过滤机制 | P0-必选 | □通过 □不通过 | `SensitiveWordFilter` |
| 8 | UGC 审核 | 举报入口与处理流程 | P0-必选 | □通过 □不通过 | `ReportController` + 管理端 |
| 9 | UGC 审核 | 7×24 举报处理时效承诺 | P0-推荐 | □通过 □不通过 | 运营 SOP |
| 10 | 实名认证 | 校园实名认证流程 | P0-必选 | □通过 □不通过 | `RealCampusCertificationService` |
| 11 | 年龄限制 | 用户年龄限制（≥18 周岁） | P0-必选 | □通过 □不通过 | 注册协议 + 注册流程 |
| 12 | 内容安全 | 文本审核（接入微信 `security.msgSecCheck`） | P0-必选 | □通过 □不通过 | 待接入 |
| 13 | 内容安全 | 图片审核（接入微信 `security.imgSecCheck`） | P0-必选 | □通过 □不通过 | 待接入 |
| 14 | 内容安全 | 视频审核（接入微信 `security.mediaCheckAsync`） | P0-必选 | □通过 □不通过 | 待接入 |
| 15 | 数据传输 | 全站 HTTPS（生产环境） | P0-必选 | □通过 □不通过 | Nginx + `WebConfig` |
| 16 | 数据加密 | 凭据脱敏（`@JsonIgnore` on `password/openid`） | P0-必选 | □通过 □不通过 | `User` 实体 |
| 17 | 数据加密 | JWT 密钥环境变量化（≥32 字符） | P0-必选 | □通过 □不通过 | `application-real.yml` |
| 18 | 用户注销 | 账号注销机制（前端入口 + 后端清理） | P0-必选 | □通过 □不通过 | **待补**（P1 实施） |
| 19 | 权限隔离 | Admin 权限注解（`@PreAuthorize`） | P0-必选 | □通过 □不通过 | 11 个 Controller |
| 20 | 媒体鉴权 | 上传目录 `denyAll` + 鉴权代理 | P0-必选 | □通过 □不通过 | `SecurityConfig` + `MediaAccessController` |
| 21 | Token 撤销 | logout 后 JWT 黑名单生效 | P0-必选 | □通过 □不通过 | `RedisTokenBlacklistService` |
| 22 | 凭据保护 | `.env.example` + `.gitleaks.toml` 已配置 | P0-必选 | □通过 □不通过 | 项目根目录 |
| 23 | 安全响应头 | HSTS / X-Frame-Options / nosniff 已配置 | P0-必选 | □通过 □不通过 | `SecurityConfig.headers()` |
| 24 | 错误响应 | 401/403 标准 JSON 错误体 + `X-Trace-Id` | P0-必选 | □通过 □不通过 | `JwtAuthenticationEntryPoint` + `JwtAccessDeniedHandler` |

---

## 二、详细自检项

### 1. 隐私协议页面已配置

**检查方法**：
1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com)
2. 「设置」→「服务内容声明」→「用户隐私保护指引」
3. 确认已填写并提交审核，且审核通过

**通过标准**：
- 隐私协议覆盖所有 `requiredPrivateInfos` 声明的接口
- 协议中明确告知数据收集目的、范围、保存时长、第三方共享情况

**关联代码**：无（mp 后台配置）

---

### 2. `__usePrivacyCheck__: true`

**检查方法**：
```bash
# 项目根目录执行
node -e "const m=require('./apps/client/src/manifest.json'); console.log('mp-weixin.__usePrivacyCheck__:', m['mp-weixin']?.__usePrivacyCheck__)"
```

**通过标准**：输出 `true`

**关联代码**：`apps/client/src/manifest.json` line 18

---

### 3. `wx.onNeedPrivacyAuthorization` 已注册

**检查方法**：
```bash
grep -n "onNeedPrivacyAuthorization" apps/client/src/App.vue
```

**通过标准**：在 `onLaunch` 内注册回调，回调内弹出协议确认 UI 或引导用户前往协议页

**关联代码**：`apps/client/src/App.vue` line 69

---

### 4. 调用隐私接口前 `ensurePrivacyAuthorized()`

**检查方法**：
```bash
grep -rn "ensurePrivacyAuthorized" apps/client/src --include="*.vue" --include="*.ts"
```

**通过标准**：调用 `chooseImage / chooseMedia / getLocation / getUserProfile / chooseAddress / chooseLocation / startRecord` 等隐私接口前，必须先调用 `ensurePrivacyAuthorized()` 守卫

**关联代码**：9 个文件
- `pages/profile/album.vue`
- `pages/profile/index.vue`
- `pages/campus/certification.vue`
- `pages/circles/post-topic.vue`
- `pages/village/post.vue`
- `pages/verification/index.vue`
- `subpackages/support/feedback/index.vue`

---

### 5. `requiredPrivateInfos` 与实际使用一致

**检查方法**：
1. `apps/client/src/manifest.json` 中 `mp-weixin.requiredPrivateInfos`
2. 全局搜索 `uni.chooseImage / uni.chooseMedia / uni.getLocation / uni.chooseLocation / uni.chooseAddress / uni.startRecord / uni.getUserProfile`
3. 比对两者，确保 manifest 声明的接口与实际调用的接口一致

**通过标准**：
- 实际调用的接口 ⊆ manifest 声明的接口（不允许「未声明而使用」）
- manifest 不应包含「声明但未使用」的接口（避免冗余审核）

**当前声明**：
```json
"requiredPrivateInfos": [
  "chooseAddress",
  "chooseLocation",
  "getLocation"
]
```

**关联代码**：`apps/client/src/manifest.json` line 36-40

---

### 6. 已选择「社交 > 婚恋」类目

**检查方法**：
1. 登录 mp 后台
2. 「设置」→「基本设置」→「服务类目」
3. 确认已添加「社交 > 婚恋」类目并审核通过

**通过标准**：类目状态为「已通过」

**特别说明**：婚恋类目需提供「婚介服务」资质证明；校园场景若定位为「校园社交」可改选「社交 > 社交」类目（无需婚介资质）

---

### 7. 敏感词过滤机制

**检查方法**：
1. 后端 `SensitiveWordFilter` 在所有 UGC 写入路径生效
2. 命中敏感词时返回 `400 Bad Request` + 错误码 `SENSITIVE_WORD_DETECTED`
3. 管理端 `AdminSensitiveWordController` 支持动态增删敏感词

**通过标准**：
- 帖子（`PostController`）、评论（`CommentController`）、私信（`PrivateMessageController`）、个人简介（`ProfileController`）均接入敏感词过滤
- 单测覆盖：`SensitiveWordFilterTest` 验证至少 5 类敏感词

**关联代码**：`apps/api/src/main/java/com/campuslove/api/config/SensitiveWordFilter.java`

---

### 8. 举报入口与处理流程

**检查方法**：
1. 前端在帖子、评论、用户主页、私信会话 4 处提供举报入口
2. 后端 `ReportController` 接收举报并落库
3. 管理端 `AdminReportController` 提供处理入口（标记已读/处理/封禁）
4. 举报处理完成后通过站内信通知举报人

**通过标准**：
- 举报入口覆盖率 100%（4 类 UGC 内容均提供入口）
- 举报后 24 小时内有响应（运营 SOP）
- 处理结果通知举报人

**关联代码**：
- 后端：`apps/api/src/main/java/com/campuslove/api/report/ReportController.java`
- 管理端：`apps/api/src/main/java/com/campuslove/api/admin/AdminReportController.java`

---

### 9. 7×24 举报处理时效承诺

**检查方法**：
1. 团队配置至少 2 名审核员轮值
2. mp 后台「客服消息」配置自动回复（24h 内人工跟进）
3. 举报 SLA：24h 内首次响应，72h 内处理完成

**通过标准**：运营文档明确 SLA + 审核员排班表

---

### 10. 校园实名认证流程

**检查方法**：
1. 前端 `pages/campus/certification.vue` 提供学籍认证入口
2. 后端 `RealCampusCertificationService` 接入学信网/学校邮箱验证
3. 认证状态：未认证 / 待审核 / 已认证 / 已拒绝
4. 已认证用户获得「校园认证」徽章

**通过标准**：
- 学籍认证至少一种方式（学信网 API / 教务邮箱 / 校园卡 OCR）
- 认证状态变更通过站内信通知用户
- 已认证状态在用户主页可见

**关联代码**：
- 前端：`apps/client/src/pages/campus/certification.vue`
- 后端：`apps/api/src/main/java/com/campuslove/api/campus/RealCampusCertificationService.java`

---

### 11. 用户年龄限制（≥18 周岁）

**检查方法**：
1. 注册协议明确「仅限 18 周岁及以上用户使用」
2. 微信登录时获取的 `userInfo` 含生日信息，前端校验年龄
3. 个人资料页支持手动填写生日，年龄 < 18 时禁止使用核心功能（匹配、私信）

**通过标准**：
- 注册协议含年龄限制条款
- 后端在用户创建时校验年龄，<18 岁拒绝创建

**当前状态**：⚠️ 待补（P1 实施）
- 当前未在 `WechatAuthController` 校验年龄
- 建议在 Task P1.3 增加年龄校验逻辑

---

### 12. 文本审核（微信 `security.msgSecCheck`）

**检查方法**：
1. 后端 `ContentFilterController` 已暴露 `/content-filter/check` 接口
2. 接口内部调用微信 `security.msgSecCheck`（接入 access_token）
3. 所有 UGC 文本（帖子标题/正文、评论、私信、个人简介）写入前调用

**通过标准**：
- `msgSecCheck` 调用成功率 ≥ 99%
- 命中违规内容返回 `400 + CONTENT_VIOLATION` 错误码
- 单测 `ContentFilterControllerTest` 覆盖正常/违规/接口异常三类场景

**当前状态**：⚠️ 待补（P1 实施）
- 当前 `ContentFilterController` 仅做本地敏感词过滤
- 微信 `msgSecCheck` API 接入待 Task P1.4

---

### 13. 图片审核（微信 `security.imgSecCheck`）

**检查方法**：
1. 媒体上传端点（`/api/media/upload`、`/api/profile/photos`、`/api/profile/background`）调用微信 `security.imgSecCheck`
2. 同步接口，返回 `errcode != 0` 时拒绝上传

**通过标准**：所有用户上传图片均经过 `imgSecCheck`

**当前状态**：⚠️ 待补（P1 实施）

---

### 14. 视频审核（微信 `security.mediaCheckAsync`）

**检查方法**：
1. 视频上传后调用 `security.mediaCheckAsync` 异步审核
2. 通过 webhook 接收审核结果回调
3. 审核通过前视频不可见（标记 `pending`），通过后标记 `approved`，未通过标记 `rejected`

**通过标准**：
- 所有视频上传后 5 分钟内触发审核
- 审核未通过的视频自动下架
- 管理端可查看审核状态

**当前状态**：⚠️ 待补（P1 实施）

---

### 15. 全站 HTTPS

**检查方法**：
1. 生产环境 Nginx 配置 HTTPS（TLS 1.2+）
2. `WebConfig.allowedOriginPatterns` 仅允许 `https://` 前缀（生产）
3. 后端配置 `server.ssl.enabled=true`（生产）或 Nginx 反向代理终结 HTTPS
4. HSTS 响应头已发送（`Strict-Transport-Security: max-age=31536000; includeSubDomains`）

**通过标准**：
- 全站 HTTPS，无混合内容
- HSTS 已配置（已由 `SecurityConfig.headers()` 自动添加）

**关联代码**：`apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` line 110-113

---

### 16. 凭据脱敏（`@JsonIgnore`）

**检查方法**：
```bash
grep -n "@JsonIgnore" apps/api/src/main/java/com/campuslove/api/entity/User.java
```

**通过标准**：`password`、`openid`、`sessionKey`、`phoneNumber` 等敏感字段均标注 `@JsonIgnore`

**关联代码**：`apps/api/src/main/java/com/campuslove/api/entity/User.java`

---

### 17. JWT 密钥环境变量化（≥32 字符）

**检查方法**：
1. `application-real.yml` 中 `app.jwt.secret: ${JWT_SECRET:}`（无默认值）
2. 启动时 `JwtConfigValidator` 校验 `JWT_SECRET` 非空且 ≥ 32 字符
3. `.env.example` 含 `JWT_SECRET=changeme-to-strong-secret-32chars-min`

**通过标准**：
- 默认值为空（强制生产环境配置）
- 启动校验通过

**关联代码**：`apps/api/src/main/resources/application-mock.yml` line 12-17

---

### 18. 用户注销机制

**检查方法**：
1. 前端「设置」页提供「注销账号」入口（区别于「退出登录」）
2. 后端 `DELETE /api/auth/account` 端点：
   - 软删除用户记录（标记 `deleted=true`）
   - 清除所有 session/token
   - 异步清理用户产生的内容（帖子、评论、私信标记为「已注销用户」）
3. 注销前要求二次确认 + 验证码

**通过标准**：
- 注销入口在「设置」页可见
- 注销后 7 日内可恢复（运营审核）
- 注销后用户数据不可被其他用户检索

**当前状态**：⚠️ **待补**（P1 实施）
- 当前仅有「退出登录」（清除本地 token）
- 「注销账号」（后端清理数据）待 Task P1.5

---

### 19. Admin 权限注解

**检查方法**：
```bash
grep -rn "@PreAuthorize.*ADMIN" apps/api/src/main/java/com/campuslove/api/admin/
```

**通过标准**：11 个 Admin Controller 类级均标注 `@PreAuthorize("hasRole('ADMIN')")`

**关联代码**：
- `AdminUserController` / `AdminReportController` / `AdminPostController` / `AdminCommentController` / `AdminSensitiveWordController` / `AdminStatsController` / `AdminConfigController` / `AdminCertificationController` / `AdminNotifyConfigController` / `AdminAuditLogController` / `AdminMatchConfigController`

---

### 20. 上传目录 `denyAll` + 鉴权代理

**检查方法**：
1. `SecurityConfig` 中 `.requestMatchers("/uploads/**").denyAll()`
2. 媒体访问通过 `/api/v1/media/{userId}/{path}` 鉴权代理
3. `MediaAccessController` 校验 JWT 中的 userId 与路径中的 userId 一致（管理员除外）

**通过标准**：
- 直接访问 `/uploads/xxx.jpg` → 403/404
- 通过 `/api/v1/media/{userId}/avatar.jpg` 携带 JWT → 200（仅本人或管理员）
- 路径穿越 `/api/v1/media/123/../456/file` → 400

**关联代码**：
- `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` line 127
- `apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java`

---

### 21. logout 后 JWT 黑名单生效

**检查方法**：
1. 用户调用 `POST /api/auth/logout` 携带 JWT
2. 后端 `RealAuthService.doLogout` 提取 `jti`，写入 Redis `jwt:blacklist:{jti}`（TTL=剩余有效期）
3. 后续请求携带同一 JWT 时，`JwtAuthenticationFilter` 检测黑名单命中，清空 `SecurityContext`
4. `JwtAuthenticationEntryPoint` 返回 401 + 标准 JSON 错误体

**通过标准**：
- logout 后同一 token 5 秒内失效
- 黑名单条目 TTL 与 JWT 剩余有效期一致（自动清理）
- Redis 不可用时降级到本地内存黑名单（不阻塞登出）

**关联代码**：
- `apps/api/src/main/java/com/campuslove/api/auth/RedisTokenBlacklistService.java`
- `apps/api/src/main/java/com/campuslove/api/config/JwtAuthenticationFilter.java` line 121-128

---

### 22. `.env.example` + `.gitleaks.toml` 已配置

**检查方法**：
```bash
ls -la .env.example .gitleaks.toml
```

**通过标准**：
- `.env.example` 列出所有必需环境变量（DB_URL / DB_USERNAME / DB_PASSWORD / REDIS_HOST / JWT_SECRET / WECHAT_APPID / WECHAT_SECRET / ADMIN_OPENID 等）
- `.gitleaks.toml` 配置自定义扫描规则（JWT / 微信 secret / 数据库密码）
- `.gitignore` 含 `.env`、`*.key`、`application-local.yml`

---

### 23. 安全响应头

**检查方法**：
```bash
curl -I https://api.example.com/api/auth/me
# 检查响应头
```

**通过标准**：
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

**关联代码**：`apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` line 99-114

---

### 24. 401/403 标准 JSON 错误体 + `X-Trace-Id`

**检查方法**：
```bash
# 401 未认证
curl -i https://api.example.com/api/users/123/follow
# 期望：HTTP/1.1 401 + {"code":"UNAUTHORIZED","message":"...","traceId":"...","status":401} + X-Trace-Id 头

# 403 已认证但无权限
curl -i -H "Authorization: Bearer <user-jwt>" https://api.example.com/api/admin/users
# 期望：HTTP/1.1 403 + {"code":"FORBIDDEN","message":"...","traceId":"...","status":403} + X-Trace-Id 头
```

**通过标准**：
- 401 响应体 `code=UNAUTHORIZED`、`status=401`、`traceId`、`X-Trace-Id` 头
- 403 响应体 `code=FORBIDDEN`、`status=403`、`traceId`、`X-Trace-Id` 头

**关联代码**：
- `apps/api/src/main/java/com/campuslove/api/auth/JwtAuthenticationEntryPoint.java`
- `apps/api/src/main/java/com/campuslove/api/auth/JwtAccessDeniedHandler.java`

**已知限制**：mock profile 下 `MockSecurityConfig` 未注册上述 handler，403 响应体为空。real profile 集成测试待 CI 环境启用 `P0SecurityIntegrationTest.RealProfileEndToEndTests`。

---

## 三、自检执行流程

### 3.1 自动检查（脚本）

```bash
# 项目根目录
node apps/client/scripts/p0-compliance-check.mjs
```

输出 JSON 报告至 `apps/client/scripts/p0-compliance-report.json`，并打印汇总。

### 3.2 手动检查

1. 依据本清单逐项核对
2. 将「自检结果」勾选为「通过」或「不通过」
3. 不通过项填写「证据/位置」列，并在「四、遗留问题」中登记

### 3.3 提审前最终确认

- [ ] 全部 24 项均通过（或遗留问题已确认延期至 P1）
- [ ] 自动检查脚本输出 `overall: PASS`
- [ ] 真机验证清单（`p0-real-device-checklist.md`）已执行
- [ ] P0 阶段验证报告已生成

---

## 四、遗留问题登记

| # | 问题描述 | 影响范围 | 建议处理方式 | 计划完成时间 |
|---|----------|----------|--------------|--------------|
| 1 | 微信 `security.msgSecCheck` 未接入 | UGC 文本审核 | P1 接入 | P1.4 |
| 2 | 微信 `security.imgSecCheck` 未接入 | UGC 图片审核 | P1 接入 | P1.4 |
| 3 | 微信 `security.mediaCheckAsync` 未接入 | UGC 视频审核 | P1 接入 | P1.4 |
| 4 | 用户年龄限制未实现 | 合规风险 | P1 在 `WechatAuthController` 增加校验 | P1.3 |
| 5 | 用户注销机制未实现 | 合规风险 | P1 实现 `DELETE /api/auth/account` | P1.5 |
| 6 | mock profile 下 `MockSecurityConfig` 未注册 `JwtAccessDeniedHandler` | 测试覆盖 | real profile 集成测试 CI 环境启用 | P1.6 |
| 7 | 实名认证仅支持校园邮箱（无学信网） | 实名真实性 | P2 接入学信网 | P2.x |

---

## 五、关联文档

- 规范文档：`.trae/specs/2026-07-26-commercialize-longterm-fixall/spec.md`
- 任务清单：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md`
- 真机验证清单：`apps/client/scripts/p0-real-device-checklist.md`
- 自动检查脚本：`apps/client/scripts/p0-compliance-check.mjs`
- P0 阶段验证报告：`apps/client/scripts/P0-VERIFICATION-REPORT.md`
