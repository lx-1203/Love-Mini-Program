# 真实环境全链路验收报告（2026-09-12）

> 本轮为「真实环境实机验收」：MySQL(3306) + Redis(6379) + real 后端(8080) + 微信开发者工具(Stable 2.02.2608040, wechatide 自动化)，
> 在真实编译、真实登录、真实网络链路下对小程序与后台做全量走查、问题修复与回归验证。

---

## 1. 环境状态（验收起点）

| 组件 | 状态 | 证据 |
|---|---|---|
| MySQL 3306 / campus_love 库 | ✅ 表结构完整（activities/users/posts/messages 等全量） | mysql SHOW TABLES |
| Redis 6379（requirepass） | ✅ PONG | redis-cli ping |
| 后端 8080（real profile） | ✅ `{"status":"UP"}`，运行最新编译产物 | /actuator/health |
| 后台 admin(5177, vite dev) | ✅ HTTP 200，/api 代理→8080 联通 | curl + 管理端登录 API |
| 小程序构建产物 | ✅ 本轮重新 `build:mp-weixin`（Node 22.17.0），verify-size 验收通过 | 构建日志 |

环境备注：构建机 PATH 首位是 DevTools 自带 Node 16.13.1，不满足 engines(>=18)；需将 Node 22.17.0 前置
（pnpm 11 依赖 node:sqlite，Node 20 不满足）。

---

## 2. 实机走查结果（截图证据链 reports/screenshots/final-verify/）

| # | 链路/页面 | 结果 | 截图 |
|---|---|---|---|
| 1 | 登录页渲染（主视觉/CTA/协议） | ✅ | 01-login.jpg |
| 2 | 微信一键登录（未配生产密钥→502 toast，预期降级） | ✅ 行为符合设计 | console: /v1/auth/wechat 502 |
| 3 | 游客登录→进入首页（游客身份自动灌体验数据） | ✅ | 03-home-discover.jpg |
| 4 | 首页 Tab（推荐卡/恋爱进度3/4/关系动态/消息角标） | ✅ | 04-home.jpg |
| 5 | 附近 Tab（宫格入口/附近的人/热门兴趣圈/校园圈） | ✅ | 05-nearby.jpg |
| 6 | 消息 Tab（状态卡/寻觅助手/正在升温/最近聊天） | ✅ | 06-messages.jpg |
| 7 | 聊天会话（历史消息/时间戳/状态头） | ✅ | 07-chat-session.jpg |
| 8 | **发送消息→后端落库** | ✅ private_messages id=3894 内容一致 delivery_status=sent | 08-chat-send.jpg + SQL |
| 9 | 我的 Tab（资料85%/统计/故事/相册） | ✅ | 09-profile.jpg |
| 10 | 发布链路（附近→发动态→填写→发布→落库） | ✅ posts id=222 status=active | 10/11/12-publish*.jpg + SQL |
| 11 | 村口信息流（新帖首位展示、占位图设计确认） | ✅ | 15-village.jpg |
| 12 | 喜欢→匹配后端契约（幂等键/HeartSignal/双向匹配落库） | ✅ likes/heart_signals 表验证 | SQL |
| 13 | **我的帖子区块（P1 修复后）** | ✅ 修复后渲染 3 篇含新帖 | 18/19-my-posts*.jpg |
| 14 | 后台数据同步（管理员登录→检索验收帖） | ✅ admin token + /admin/forum/village-posts 命中 id=222 | API 响应 |
| 15 | 终检 console / network | ✅ error=0；Tab 巡检 30 响应全部 200 | 网络日志统计 |

说明：寻觅页卡片操作按钮（跳过/打招呼/喜欢）位于自定义组件内部，wechatide 自动化无法穿透组件树点击
（工具限制，非应用缺陷）；该链路的后端契约与匹配结果呈现（我的匹配=3、卡片匹配度 80%/65%）已分别验证。

---

## 3. 本轮发现与修复

### MP-R6-PROFILE-001（P1，已修复 ✅）
- 页面：我的 → 我的帖子
- 现象：区块永远渲染空态「还没有发过帖子」，DB 中该用户实际有 3 篇帖子
- 根因：`profileStore.loadMyPosts()` 全仓无任何调用点（store 注释声明"由 loadMyPosts() 按需拉取"，但页面从未接线）
- 修复：`apps/client/src/pages/profile/index.vue` onShow 首屏 `refreshMyPostsWithRetry(3)`、重复进入 `retry(1)`，
  惯用法对齐既有 `refreshMyDailiesWithRetry`（含冷启动会话未就绪时的退避重试）
- 回归证据：`GET /posts?authorId=100151&page=1&pageSize=3` 200 → UI 渲染 3 篇（含发布后新帖即时可见）
- 提交：`a6f65e09 fix(miniprogram): final-verify — 我的帖子接线 loadMyPosts 修复永远空态`

### 事实核查后判非缺陷（记录备查）
| 项 | 结论 |
|---|---|
| 村口无图帖显示蓝天图 | 设计意图：PostCard 的 POST_PLACEHOLDER 占位（PostCard.vue:199） |
| /v1/auth/wechat 502 | 本地未配 WECHAT_APPID/SECRET 的预期降级；生产部署前置条件见 §5 |
| 后台帖子接口 `visibility:"public_"` | Java 枚举名（Visibility.public_）序列化外观；DB 正确存 "public"（183 行），后台 UI 未消费该字段（P4） |

### 既有技术债（本轮不扩面，留档）
- `pnpm typecheck`（vue-tsc）存在 20+ 既有类型错误（HomeHeader 字段访问、messages store、nearby 未定义名等）；
  构建门禁（build:mp-weixin → verify-package-size/check-mp-image-styles）不依赖 vue-tsc，历轮验收口径一致。
  本轮修复未新增任何类型错误。建议后续单列「typecheck 清零」专项。
- 微信主包 26.82MB 警告为 dev 构建豁免口径（携带 mock/装饰图），发布形态由 `build:mp-weixin:real` 严格门禁把关。

---

## 4. 后台（admin）联通与数据同步

- admin 前端 5177（vite dev，/api 同源代理→8080，代理移除 Origin 规避 CORS）✅
- 管理员账号 `local-dev-admin-openid-123456 / Admin@12345`（SUPER_ADMIN）登录 ✅ 返回 JWT
- 数据同步闭环：小程序发布帖（posts id=222）→ DB → 后台 `/api/v1/admin/forum/village-posts?keyword=验收` 命中 ✅
- DB 终态自洽：users=267，posts=184（种子 183 + 本轮验收新帖 1）

---

## 5. 遗留项 / 部署前置条件

1. **微信登录生产化**：`.env` 需配置 `WECHAT_APPID/WECHAT_SECRET`（本地联调可选用 `WECHAT_DEV_FALLBACK_ENABLED=true`）；
   未配置时微信一键登录按设计返回 502「微信服务暂时不可用」，用户可走手机号/游客路径（本轮实测路径畅通）。
2. **发布构建**：上线前使用 `pnpm build:mp-weixin:real`（严格体积门禁 + mock 剔除 + 环境校验），本验收覆盖 dev 形态实机链路。
3. vue-tsc 既有类型错误清零（建议单列专项轮次）。

## 6. 结论

在本轮真实环境验收中：小程序可完整构建、实机运行零 console error、核心用户链路（登录/首页/附近/寻觅/消息/聊天收发/
发布落库/我的帖子/村口/后台同步）全部打通；发现的唯一 P1（我的帖子永远空态）已修复、回归通过并 Git 固化。
**FINAL VERIFY ACCEPTANCE: PASS。**
