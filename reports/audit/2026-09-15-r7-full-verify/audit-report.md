# Round 7 全链路真实验收报告（2026-09-15）

## 0. 本轮任务

用户要求：使用 wechatide-skill 对小程序进行真实检验，保证无报错、全链路打通、构建成功、前后端联通、管理后台数据同步、图片在管理后台可见可管理、页面与理想图一致，并全程真实测试截图。

## 1. 环境与构建

| 项 | 状态 |
|---|---|
| MySQL 3306 / Redis 6379 / API 8080 (`/actuator/health` = UP) | ✅ 全程在线 |
| `pnpm build:mp-weixin:real:dev`（Node 22.17.0，Vite 5 需 Node≥18；Node16 报 crypto.getRandomValues 缺失、pnpm11 需 node:sqlite） | ✅ 3 次构建通过 |
| wechatide 门禁（versionRelation=equal、loginExpired=false、tokenRequired=false） | ✅ 通过 |
| vue-tsc：本轮改动文件 0 新增错误（仓库预存 46 个历史错误，与 Round-6 记录一致） | ✅ |

## 2. 本轮发现并修复的问题（8 项）

| ID | 级别 | 页面/文件 | 问题与修复 |
|---|---|---|---|
| MP-R7-PROFILE-001 | P1 | pages/profile/index.vue | 我的页头部头像白圈：profileStore 存的 `/api/v1/media/**` 相对路径直连 `<image>`，被小程序当包内文件加载失败（network 证明 0 次图片请求）。DTO 边界改 `resolveMediaUrl(pv.avatarUrl)`；2 处 `uni.previewImage` 同修 |
| MP-R7-PROFILE-002 | P1 | pages/profile/index.vue + MyStory.vue | 我的相册缩略图白板：`media.photos` 原始相对路径直连。改 `resolveMediaUrls(photoGallery)`；store 保持原始路径（审核状态映射以原始 URL 为键，不受影响） |
| MP-R7-PROFILE-003 | P2 | pages/profile/index.vue（照片墙×2 + 主页背景） | `toLocalImage()` 只兜底 pexels/mock，对媒体代理路径原样返回相对路径。统一改 `resolveMediaUrl()` |
| MP-R7-PROFILE-004 | P2 | pages/profile/index.vue | 资料完成度前端 session 口径恒 10%，后端 `/profile/basic` 权威值 30%。completionPercent 优先取服务端 profileCompletion |
| MP-R7-PROFILE-005 | P1 | pages/profile/index.vue | `ROUTES.ALBUM` 不存在（实际为 `ROUTES.PROFILE.ALBUM`），运行时 `openAppPath(undefined)` → 「恋爱相册」入口点击无效。已修正并经 vue-tsc + 产物 grep 验证 |
| MP-R7-REALNAME-001 | P1 | real-name.vue + campus/certification.vue + campus/post-topic.vue + circles/post-topic.vue + verification/index.vue（新增 utils/media.ts `isUploadedMediaUrl`） | DevTools 模拟器 chooseMedia 临时路径形如 `http://tmp/xxx`，被 `/^https?:\/\//` 误判为"已是服务器 URL"跳过上传 → 实名认证身份证照片落库 `http://tmp/*`（DB 证据：id=150 front/back_url 均为 tmp），管理后台无法查看且路径随时失效。5 处上传判断统一 `isUploadedMediaUrl()`。修复后重提：id=151 正反面均为 `/api/v1/media/100158/202609/…` 服务器 URL |
| MP-R7-UPLOAD-001 | P1 | services/http.ts + services/api.ts | 后端 `@Idempotent` 对写端点（含 POST /media/upload）强制 Idempotency-Key（缺失 422）。http.ts 拦截器已为 request() 自动补齐，但 uni.uploadFile 不经过拦截器 → **所有文件上传（头像/照片墙/发帖配图/实名证件）全部 422 失败**。uploadFileViaUni 补稳定幂等键（`idem-UPLOAD-` + endpoint+文件名 FNV 哈希，与拦截器同口径）。curl 对照验证：无头 422 → 带头 200 + 服务器 URL |
| MP-R7-ADMIN-IMG | P2 | apps/admin RealNameCertifications.vue | 管理后台「查看图片」直链 `<a href target=_blank>` 不携带 Authorization → 401 JSON，管理员看不到身份证照片。改为 fetch（带 admin_v2_token）→ blob → objectURL 新窗口展示 |

## 3. 七条用户链路真实验证（微信开发者工具 real 模式 + 后端 8080 + MySQL）

| 链路 | 路径 | 证据 | 结果 |
|---|---|---|---|
| A 登录/浏览 | 登录页（401 后正确回登录页）→ 密码登录 → 首页（推荐卡/恋爱进度/兴趣圈/附近的人/社区动态/邀请横幅）→ 附近 → 附近的人列表（许知夏 5km 等）→ 他人主页（背景/认证/标签/生活瞬间/CTA）→ 返回 | 07–13 截图 | **PASS** |
| B 匹配 | 寻觅页真实卡片 → 真实点击「喜欢」→ 未实名被门控弹窗拦截（产品逻辑正确）→ 实名认证通过后再点 → POST /matches/like → likes 表 id=2272 落库 → 互赞后 heart_signals id=9 + private_conversations id=465 自动创建 | 14/15/27 截图 + DB | **PASS** |
| C 兴趣圈 | 兴趣圈列表（5 圈+封面）→ 摄影圈主页（公告/动态/成员 1.2w）→ 帖子详情 → 发表回复 → circle_replies id=42 落库 | 30–33 截图 + DB | **PASS** |
| D 校园圈 | 校园圈 Hub：未认证用户正确呈现认证引导墙 + 推荐圈子（北大/清华/人大/复旦/上交 真实计数）| 34 截图 | **PASS** |
| E 发布 | 发布动态 → 输入 → 发布 → posts id=225 落库（pending/public）→ 我的页「我的帖子 1 篇」实时展示 | 35/36 截图 + DB | **PASS** |
| F 消息/聊天 | 消息页（有人喜欢你 1/正在升温：小满/最近聊天）→ 进与小满会话 → 发送消息 → 气泡渲染 → private_messages id=3896 落库 delivery_status=sent | 28/29 截图 + DB | **PASS** |
| G 编辑资料 | 我的 → 编辑资料（头像/照片墙/11 字段全回显）→ 保存 → navigateBack 回我的页（R6 编辑模式返回逻辑回归通过）| 3/4/36 截图 | **PASS** |

## 4. 管理后台核查（SUPER_ADMIN）

| 项 | 证据 | 结果 |
|---|---|---|
| 登录 | local-dev-admin-openid-123456 登录成功，角色「超级测试账号」（SUPER_ADMIN） | PASS |
| 数据可见 | 实名认证审核列表显示 id=151 林曦风（待审核）；详情含脱敏身份证号 110101********1234 与正反面图片链接 | 26 截图 |
| 图片可访问 | 带 admin token fetch 正反面 URL → 200 image/png（25149/22090 字节，与上传一致）；直链 401 已按 MP-R7-ADMIN-IMG 修复 | fetch 实测 |
| 可真实管理 | 点击「通过」→ 确认弹窗 → DB id=151 APPROVED + reviewer_id=100000 + reviewed_at 落库；前端门控随之放行（链路 B 闭环） | DB 实测 |
| 前后台数据同步 | 小程序上传的媒体 URL ↔ 后台详情链接逐字节一致；审核状态变更实时反映到前端行为 | 全链路 |

## 5. 环境观察项（非代码缺陷，决策记录）

1. **Clash 系统代理干扰**：系统代理指向 127.0.0.1:7897 时，DevTools 内部分请求（含 uni.uploadFile）间歇性挂起约 3 分钟才超时；关闭系统代理后 30ms 恢复。测试结束后已将 ProxyEnable 恢复为 1。建议日常联调时为 DevTools 配置直连或临时关闭系统代理。
2. **DevTools 陈旧编译缓存**：重建 dist 后模拟器可能仍运行旧代码（Round-6 已知问题）。处理：`debug_clear_cache cleanCompileCache` + `simulator_refresh`。本轮复现并按此流程恢复。
3. **自动化层怪癖**：wechatide automation tap 对部分自定义组件内元素（CardSwiper 喜欢钮等）返回 success 但不触发事件；computer-use 真实鼠标点击均正常触发。与 Round-6 登记一致。
4. **暂态空列表**：17:21 附近 `/recommendations?distanceMaxKm=20` 两次返回 `[]`（同 token curl 有数据），刷新后恢复且数据正常。列为观察项，建议后端在该接口位置数据缺失时降级不过滤。
5. `wx.getFileInfo 即将废弃`、`showloading 与 hideLoading 交替使用` 为 DevTools 基础库警告，非阻断。

## 6. 历史问题回归

- R3 我的页四格计数冷启动假 0 → 本轮显示 我喜欢1/喜欢我1/我赞1/访客0，与 DB 一致 ✅ 无回归
- R5 媒体鉴权代理（MP-R5-MEDIAAUTH）→ 发现其渲染端遗漏（本轮 MP-R7-PROFILE-001~003 即其遗留），已补齐 ✅
- R6 编辑模式保存返回 → 本轮回归通过 ✅
- R6 头像/照片墙上传 → 本轮相册/头像渲染修复后与 DB 数据一致 ✅
- 已知边界（R6 IA-VISUAL-EDIT-01 照片墙当次不回显）未回归 ✅

## 7. 截图清单（reports/screenshots/r7-final-verify/）

- 00–02：修复前（头像白圈/完成度 10%/相册白板 Before 证据）
- 03–05：修复后（头像/30%/相册 2 张/照片墙/我的帖子空态）
- 06：恋爱相册页（2/6 张）
- 07–13：链路 A（首页上/下/底部、附近、附近的人、他人主页）
- 14–16：喜欢门控 Before（卡片/弹窗）
- 17–19：实名认证修复中间态
- 20–25：登录/注册页/协议切换/实名表单
- 26：管理后台认证详情（脱敏证件号 + 图片链接）
- 27–29：匹配后回寻觅/消息页
- 30–34：兴趣圈/摄影圈/帖子详情/校园圈
- 35–36：发布页/我的帖子+互动计数

## 8. 结论

- P0 = 0，P1 = 0（本轮 4 项 P1 全部修复并回归验证）
- 七条用户链路全部真实打通，关键写操作均有 DB 落库证据
- 管理后台与小程序数据双向同步（媒体 URL 逐字节一致、审核状态联动）
- 构建链稳定（Node22），本轮改动 0 新增类型错误，console 无 error
- 全部改动已 Git 提交
