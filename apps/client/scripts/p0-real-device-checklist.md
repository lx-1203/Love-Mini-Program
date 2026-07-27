# P0 真机端到端登录验证清单

> Task 0.7.3 交付物。本清单用于在微信开发者工具 + 真机环境下，
> 验证 P0 阶段（Task 0.1~0.6）改造的端到端登录链路、隐私合规、
> 媒体鉴权代理、退出登录 JWT 撤销等核心功能是否正常工作。
>
> **使用方式**：
> 1. 按本清单顺序执行（前置准备 → 7 大场景 → 收尾）
> 2. 每项检查后在「结果」列勾选 ✅ / ❌
> 3. ❌ 项填写「问题描述」并截图保存
> 4. 全部完成后填写「五、验证结论」

---

## 一、前置准备

### 1.1 环境就绪检查

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 后端 API 已启动（mock 或 real profile） | http://localhost:8080/actuator/health 返回 200 | | □✅ □❌ |
| 2 | MySQL 已启动（real profile） | `mysql -u root -p -e "SELECT 1"` 返回 1 | | □✅ □❌ |
| 3 | Redis 已启动（real profile） | `redis-cli ping` 返回 PONG | | □✅ □❌ |
| 4 | RabbitMQ 已启动（real profile） | http://localhost:15672 可访问 | | □✅ □❌ |
| 5 | 微信开发者工具已安装（≥ 1.06.2407） | 启动后无版本提示 | | □✅ □❌ |
| 6 | 测试微信号已绑定小程序 | 在 mp 后台「成员管理」中已添加 | | □✅ □❌ |
| 7 | mp 后台已配置「隐私协议」 | 「用户隐私保护指引」审核通过 | | □✅ □❌ |

### 1.2 mp-weixin 构建产物检查

```bash
# 项目根目录执行
ls -la apps/client/dist/build/mp-weixin/

# 期望文件：
#   - app.js / app.json / app.wxss
#   - project.config.json
#   - pages/login/index.{js,json,wxml,wxss}
#   - pages/home/index.{js,json,wxml,wxss}
#   - custom-tab-bar/index.{js,json,wxml,wxss}
```

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | `dist/build/mp-weixin/project.config.json` 存在 | 文件存在且 appid 正确 | | □✅ □❌ |
| 2 | `dist/build/mp-weixin/app.json` 存在 | 文件存在且 pages 列表非空 | | □✅ □❌ |
| 3 | `dist/build/mp-weixin/pages/login/index.json` 存在 | 登录页编译产物存在 | | □✅ □❌ |
| 4 | `manifest.json` 中 `mp-weixin.appid` 与 mp 后台一致 | wxc67cd233d72388d0 | | □✅ □❌ |

### 1.3 后端配置检查

```bash
# 检查 .env 文件已配置关键变量
cat apps/api/.env.example | grep -E "JWT_SECRET|WECHAT_APPID|WECHAT_SECRET"

# 创建本地 .env（如未创建）
cp apps/api/.env.example apps/api/.env
# 编辑 .env，填入真实 WECHAT_APPID / WECHAT_SECRET
```

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | `JWT_SECRET` 已设置（≥ 32 字符） | openssl rand -base64 48 生成的值 | | □✅ □❌ |
| 2 | `WECHAT_APPID` 已设置 | 与 mp 后台一致 | | □✅ □❌ |
| 3 | `WECHAT_SECRET` 已设置 | 与 mp 后台一致 | | □✅ □❌ |
| 4 | `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` 已设置（real） | 本地 MySQL 连接信息 | | □✅ □❌ |
| 5 | `REDIS_HOST` / `REDIS_PORT` 已设置（real） | 127.0.0.1 / 6379 | | □✅ □❌ |

---

## 二、核心场景验证

### 场景 1：微信登录全流程

**前置**：后端已启动，开发者工具已导入 `dist/build/mp-weixin/`，编译无错误。

**步骤**：

1. 在开发者工具中点击「编译」按钮，确认无编译错误
2. 在控制台查看启动日志：
   - 应看到 `App.onLaunch` 注册 `wx.onNeedPrivacyAuthorization` 回调
   - 不应看到 `import.meta.env` 或 `catch {}` 相关错误
3. 默认进入登录页 `pages/login/index`
4. 点击「微信一键登录」按钮
5. 弹出微信授权框，点击「允许」
6. 等待跳转到首页 `pages/home/index`

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | wx.login 调用成功 | 控制台输出 `wx.login success: code=xxx` | | □✅ □❌ |
| 2 | POST /api/v1/auth/wechat 调用成功 | 网络面板看到 200 响应 | | □✅ □❌ |
| 3 | 响应包含 token 与 refreshToken | `{token: "eyJ...", refreshToken: "..."}` | | □✅ □❌ |
| 4 | token 保存到本地存储 | `wx.getStorageSync('token')` 非空 | | □✅ □❌ |
| 5 | 跳转到首页 | URL 切换到 `pages/home/index` | | □✅ □❌ |
| 6 | 首页加载用户数据 | 看到「为你推荐」列表 | | □✅ □❌ |

**异常情况验证**：

| # | 场景 | 期望 | 实际 | 结果 |
|---|------|------|------|------|
| 1 | 取消微信授权 | 提示「需同意授权后才能登录」 | | □✅ □❌ |
| 2 | 网络断开后点击登录 | 提示「网络连接失败，请检查网络」 | | □✅ □❌ |
| 3 | 后端返回 401 INVALID_CODE | 自动重新拉起 wx.login | | □✅ □❌ |
| 4 | 后端返回 403 USER_DISABLED | 提示「账号已被禁用，请联系管理员」 | | □✅ □❌ |

---

### 场景 2：隐私授权弹窗

**前置**：场景 1 已通过，且首次安装小程序（清空缓存模拟）。

**步骤**：

1. 在开发者工具中点击「清缓存」→「清除全部缓存」
2. 重新编译并启动小程序
3. 进入登录页点击「微信一键登录」
4. 进入需要调用隐私接口的页面（如「个人资料 → 头像」上传）

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 首次调用 chooseImage 弹出隐私协议弹窗 | 显示「用户隐私保护指引」 | | □✅ □❌ |
| 2 | 同意后再次调用 chooseImage 不弹窗 | 直接进入相册选择 | | □✅ □❌ |
| 3 | 拒绝隐私协议后调用 chooseImage | 提示「需同意隐私协议后才能选择图片」 | | □✅ □❌ |
| 4 | 设置页可查看完整隐私协议 | 跳转至微信托管协议页 | | □✅ □❌ |

**控制台日志**：

```
[privacy] checkPrivacySetting: status=unauthorized
[privacy] requirePrivacyAuthorize: 用户已同意
[privacy] chooseImage success
```

---

### 场景 3：图片鉴权代理（avatar 加载）

**前置**：场景 1 已通过，用户已上传头像（可通过 ProfileController.uploadPhoto）。

**步骤**：

1. 在开发者工具「Network」面板开启
2. 进入个人资料页 `pages/profile/index`
3. 等待头像加载完成
4. 在 Network 面板找到头像请求

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 头像 URL 指向 `/api/v1/media/{userId}/avatar.jpg?token=xxx` | 非直接 `/uploads/xxx` | | □✅ □❌ |
| 2 | 头像请求携带 JWT token（query 参数） | URL 含 `?token=eyJ...` | | □✅ □❌ |
| 3 | 头像加载成功（HTTP 200） | 显示用户头像图片 | | □✅ □❌ |
| 4 | 直接访问 `/uploads/xxx.jpg` 返回 403 | 浏览器粘贴 URL 返回 denyAll | | □✅ □❌ |
| 5 | 路径穿越 `/api/v1/media/123/../456/file` 返回 400 | 后端拒绝路径穿越 | | □✅ □❌ |
| 6 | 访问其他用户媒体返回 403 | 用户 A token 访问用户 B 媒体被拒 | | □✅ □❌ |
| 7 | 管理员访问任意用户媒体返回 200 | ROLE_ADMIN 通过 | | □✅ □❌ |

**关联代码**：
- 前端：`apps/client/src/services/http.ts` resolveMediaUrl
- 后端：`apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java`

---

### 场景 4：退出登录后 JWT 失效

**前置**：场景 1 已通过，用户已登录。

**步骤**：

1. 进入个人资料页 `pages/profile/index`
2. 点击「退出登录」按钮
3. 在弹出的确认框中点击「确认」
4. 等待跳转回登录页
5. 在开发者工具「Storage」面板查看 token 是否清空
6. 手动用旧 token 调用 API（通过 curl 或 Postman）

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 退出登录调用 POST /api/v1/auth/logout | 网络面板看到 200 响应 | | □✅ □❌ |
| 2 | 本地存储 token 已清空 | `wx.getStorageSync('token')` 为空 | | □✅ □❌ |
| 3 | 跳转回登录页 | URL 切换到 `pages/login/index` | | □✅ □❌ |
| 4 | 用旧 token 调用 /api/v1/users/me 返回 401 | 后端拒绝已撤销 token | | □✅ □❌ |
| 5 | 401 响应体包含 `{code:"UNAUTHORIZED"}` | 标准 JSON 错误体 | | □✅ □❌ |
| 6 | 401 响应头包含 `X-Trace-Id` | 36 字符 UUID | | □✅ □❌ |
| 7 | Redis 中存在 `jwt:blacklist:{jti}` 键 | redis-cli KEYS "jwt:blacklist:*" | | □✅ □❌ |

**curl 验证命令**：

```bash
# 用旧 token 调用受保护接口
OLD_TOKEN="eyJxxx..."
curl -i -H "Authorization: Bearer $OLD_TOKEN" http://localhost:8080/api/v1/users/me

# 期望响应：
# HTTP/1.1 401
# Content-Type: application/json
# X-Trace-Id: <uuid>
# {"code":"UNAUTHORIZED","message":"...","traceId":"...","status":401}
```

---

### 场景 5：Admin 权限校验

**前置**：场景 1 已通过，准备一个普通用户 token 与一个管理员账号。

**步骤**：

1. 用普通用户 token 调用 `/api/v1/admin/users`
2. 用管理员账号登录获取 admin token
3. 用 admin token 调用 `/api/v1/admin/users`

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 普通用户访问 /api/v1/admin/users → 403 | HTTP 403 Forbidden | | □✅ □❌ |
| 2 | 403 响应体包含 `{code:"FORBIDDEN"}` | 标准 JSON 错误体 | | □✅ □❌ |
| 3 | 403 响应头包含 `X-Trace-Id` | 36 字符 UUID | | □✅ □❌ |
| 4 | 管理员访问 /api/v1/admin/users → 200 | HTTP 200 OK | | □✅ □❌ |
| 5 | 未登录访问 /api/v1/admin/users → 401 | HTTP 401 Unauthorized | | □✅ □❌ |

**curl 验证命令**：

```bash
# 普通用户访问 admin 端点
USER_TOKEN="eyJxxx..."
curl -i -H "Authorization: Bearer $USER_TOKEN" http://localhost:8080/api/v1/admin/users
# 期望：HTTP/1.1 403 + {"code":"FORBIDDEN",...}

# 管理员访问 admin 端点
ADMIN_TOKEN="eyJyyy..."
curl -i -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/api/v1/admin/users
# 期望：HTTP/1.1 200 + [...]
```

---

### 场景 6：安全响应头校验

**前置**：后端已启动（real profile，HTTPS 暂可省略，本地 HTTP 即可验证 header）。

**步骤**：

```bash
curl -I http://localhost:8080/api/v1/auth/me
```

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | `Strict-Transport-Security` 头存在 | max-age=31536000; includeSubDomains | | □✅ □❌ |
| 2 | `X-Content-Type-Options` 头存在 | nosniff | | □✅ □❌ |
| 3 | `X-Frame-Options` 头存在 | DENY | | □✅ □❌ |
| 4 | `Referrer-Policy` 头存在 | strict-origin-when-cross-origin | | □✅ □❌ |
| 5 | `X-XSS-Protection` 头存在 | 1; mode=block | | □✅ □❌ |

---

### 场景 7：真机扫码登录

**前置**：场景 1~6 已通过，开发者工具「预览」生成二维码。

**步骤**：

1. 在开发者工具中点击「预览」按钮
2. 用真机微信扫码
3. 等待小程序在真机上启动
4. 在真机上完成登录流程

**预期**：

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 真机扫码后小程序启动 | 显示登录页 | | □✅ □❌ |
| 2 | 点击登录后微信授权框弹出 | 显示「校园恋爱 申请获取」 | | □✅ □❌ |
| 3 | 同意授权后跳转首页 | 显示推荐列表 | | □✅ □❌ |
| 4 | 头像在真机加载成功 | 头像正常显示 | | □✅ □❌ |
| 5 | 退出登录后再次登录正常 | 完整流程可重复 | | □✅ □❌ |
| 6 | 真机网络断开后提示 | 显示「网络连接失败」 | | □✅ □❌ |

**真机型号**：_______（如 iPhone 14 Pro / Xiaomi 13）

**微信版本**：_______（如 8.0.43）

---

## 三、异常路径验证

### 3.1 Token 过期处理

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | JWT 过期后调用 API 返回 401 | 后端拒绝过期 token | | □✅ □❌ |
| 2 | 客户端检测到 401 后自动跳转登录页 | 自动 reLaunch 到 `pages/login` | | □✅ □❌ |
| 3 | refreshToken 机制（如实现）| 自动刷新 token 重试请求 | | □✅ □❌ |

### 3.2 网络异常处理

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 后端宕机时点击登录 | 提示「网络连接失败」 | | □✅ □❌ |
| 2 | 后端返回 500 | 提示「服务器繁忙，请稍后重试」 | | □✅ □❌ |
| 3 | 后端返回 502/503 | 提示「服务暂时不可用」 | | □✅ □❌ |
| 4 | 网络超时（>15s） | 提示「请求超时，请重试」 | | □✅ □❌ |

### 3.3 隐私协议异常

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 用户拒绝隐私协议后调用 chooseImage | 不发起请求，提示需同意 | | □✅ □❌ |
| 2 | 微信隐私 API 不可用时降级 | 控制台输出 unsupported | | □✅ □❌ |
| 3 | 设置页可重新查看隐私协议 | 跳转至微信托管协议页 | | □✅ □❌ |

---

## 四、性能验证

### 4.1 启动性能

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 小程序冷启动时间 | < 3 秒（开发者工具） | | □✅ □❌ |
| 2 | 登录请求响应时间 | < 1 秒（本地环境） | | □✅ □❌ |
| 3 | 首页加载时间 | < 2 秒 | | □✅ □❌ |

### 4.2 内存占用

| # | 检查项 | 期望 | 实际 | 结果 |
|---|--------|------|------|------|
| 1 | 微信开发者工具内存占用 | < 500MB | | □✅ □❌ |
| 2 | 真机内存占用 | < 200MB | | □✅ □❌ |

---

## 五、验证结论

### 5.1 总体结论

- [ ] **全部场景通过**：可正式收口 P0 阶段，进入 P1
- [ ] **存在失败项**：需修复后重新验证
- [ ] **存在阻塞项**：环境不具备，待用户手动验证

### 5.2 通过统计

| 类别 | 总数 | 通过 | 失败 | 阻塞 |
|------|------|------|------|------|
| 前置准备 | 18 | | | |
| 核心场景 | 35 | | | |
| 异常路径 | 10 | | | |
| 性能验证 | 5 | | | |
| **合计** | 68 | | | |

### 5.3 失败项汇总

| 场景 | 检查项 | 问题描述 | 严重程度 | 处理方式 |
|------|--------|----------|----------|----------|
| | | | □阻塞 □严重 □一般 | |
| | | | □阻塞 □严重 □一般 | |
| | | | □阻塞 □严重 □一般 | |

### 5.4 验证人签字

- 验证人：_______
- 验证日期：_______
- 验证环境：□开发者工具 □真机 □两者均验证
- 备注：

---

## 六、附录

### 6.1 自动化脚本

如本机具备微信开发者工具 CLI（CI 环境），可执行以下自动化验证：

```bash
# 1. 构建小程序
cd apps/client
npm run build:mp-weixin

# 2. 启动微信开发者工具 CLI（macOS 示例）
/Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project ./dist/build/mp-weixin --auto-port 9420

# 3. 运行自动化测试（需先在开发者工具中开启「自动化测试」）
node scripts/auto-test.js
```

### 6.2 关键文件路径

- 客户端登录服务：`apps/client/src/services/auth.ts`
- 客户端登录页：`apps/client/src/pages/login/index.vue`
- 后端微信登录控制器：`apps/api/src/main/java/com/campuslove/api/auth/WechatAuthController.java`
- 后端 JWT 配置：`apps/api/src/main/java/com/campuslove/api/config/JwtTokenProvider.java`
- 后端 Redis 黑名单：`apps/api/src/main/java/com/campuslove/api/auth/RedisTokenBlacklistService.java`
- 媒体鉴权代理：`apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java`
- 隐私协议工具：`apps/client/src/utils/privacy.ts`

### 6.3 关联文档

- 合规自检清单：`apps/client/scripts/p0-compliance-check.md`
- 合规自检报告：`apps/client/scripts/p0-compliance-report.json`
- P0 阶段验证报告：`apps/client/scripts/P0-VERIFICATION-REPORT.md`
- 规范文档：`.trae/specs/2026-07-26-commercialize-longterm-fixall/spec.md`
- 任务清单：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md`

### 6.4 环境不具备时的处理

如本机不具备微信开发者工具或真机环境，按以下流程处理：

1. **本清单作为交付物**：交付给运营/QA 团队手动执行
2. **依赖自动化测试**：依赖 `apps/client/src/tests/services/auth.spec.ts` 等 7 个客户端测试 + 后端 `WechatAuthControllerTest` 等 8 个后端测试
3. **CI 环境验证**：待 CI 环境就绪后启用 `P0SecurityIntegrationTest.RealProfileEndToEndTests`（当前 `@Disabled`）
4. **明确遗留**：在 P0 阶段验证报告中明确列出「真机验证未执行」遗留项，转入 P1 阶段补做
