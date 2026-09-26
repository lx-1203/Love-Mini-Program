# R13 前后端 + 后台数据同步实测证据（2026-09-22）

环境：MySQL 3306（campus_love，真实数据）、Redis 6379、real profile 后端 8080（`/actuator/health` → `{"status":"UP"}`）。
小程序构建产物：`apps/client/dist/build/mp-weixin`（`--mode real`，`VITE_API_BASE_URL=http://127.0.0.1:8080/api`，mock 已剥离）。

## 1. 登录链路
- `POST /api/v1/auth/guest-login` → HTTP 200，返回真实 JWT + userId（例：100151「阿辰」）。
- `POST /api/v1/auth/admin/login`（需 `Idempotency-Key` 头）→ HTTP 200：
  `{"id":100000,"username":"local-dev-admin-openid-123456","role":"SUPER_ADMIN"}` + token。

## 2. 图片资源由后端托管且可访问
- `media_asset` 中 `type='app_asset'` 共 **1801** 条，全部 `status=ready` + `audit_status=approved`。
- 实测 `GET /api/v1/media/app-assets/generated/images/activities/music-festival.jpg`
  → HTTP 200，`image/jpeg`，321680 B，`file` 判定 `JPEG image data, 1368x768`。

## 3. 后台真实写操作（可逆）
### 3.1 图片审核
目标 `media_asset.id=1804`：

| 步骤 | audit_status | auditor_id | audit_remark | audited_at |
|---|---|---|---|---|
| BEFORE | approved | 100000 | - | 2026-09-13 20:36:08 |
| POST `/admin/media-assets/1804/audit` decision=rejected | rejected | 100000 | R13 link check - temporary reject | 2026-09-22 16:36:02 |
| POST `/admin/media-assets/1804/audit` decision=approved | approved | 100000 | R13 link check - restored | 2026-09-22 16:36:02 |

### 3.2 帖子置顶 → 小程序侧列表实时反映（关键同步证据）
目标 `posts.id=43`（`status=active`, `audit_status=approved`）。
小程序侧读取 `GET /api/v1/posts?page=1&size=6`（guest token）：

```
BEFORE     : 146*,167*,133*,159*,127*,196*,197*,43,163,103,...
AFTER PIN  : 43*,146*,167*,133*,159*,127*,196*,197*,163,103,...
AFTER UNPIN: 146*,167*,133*,159*,127*,196*,197*,43,163,103,...
```

- 置顶前 43 在第 8 位；`POST /api/v1/admin/forum/village-posts/43/pin` 后 43 **跃至首位且 isPinned=true**；
- `.../43/unpin` 后列表顺序与 BEFORE **逐位一致**，DB `is_pinned` 回到 0。
- 结论：后台写 → MySQL → 小程序读，链路即时生效且可完整还原。

### 3.3 审核态可见性隔离正确
`posts.id=221` 为 `status=active` 但 `audit_status=pending`，在小程序公开流第 1–5 页（100 条）中
**均不出现** —— 未过审内容不对 C 端暴露，符合预期。

### 3.4 通过后台 UI 真实操作（非 curl）→ DB → 小程序读，全链路
脚本：`scripts/r13-admin-ui-manage.mjs`；证据：`admin-ui-management-evidence.json`、
`shots-admin/910-ui-pinned.png`、`911-ui-unpinned.png`。
在真实浏览器中登录后台 → `/forum/village-posts` → 定位 id=43 行 → **点击「置顶」按钮** → 校验 → **点击「取消置顶」** 还原。

小程序侧 `GET /api/v1/posts?page=1&size=8`（guest token）读回：

```
feedBefore    : 146*,167*,133*,159*,127*,196*,197*,43,163,103,...
feedAfterPin  : 43*,146*,167*,133*,159*,127*,196*,197*,163,103,...
feedAfterUnpin: 146*,167*,133*,159*,127*,196*,197*,43,163,103,...
before == afterUnpin : true   （逐位一致）
```

- UI 点击触发 `POST /api/v1/admin/forum/village-posts/43/pin` → **200** `{"isPinned":true,"success":true,"id":43}`
- 随后 `.../43/unpin` → **200** `{"isPinned":false,"success":true,"id":43}`
- 行内状态由「置顶」变为「取消置顶」并出现「置顶」标签（`rowStateAfterPin` 已捕获文本）
- 收尾 DB：`posts.43.is_pinned=0`，全库 `is_pinned=1` 计数回到基线 **7**
- 结论：后台**界面层**的真实管理动作可写入、可被 C 端立即感知、且可完整还原


## 4. 后台 35 个页面全量巡检
见 `admin-audit.json` 与 `shots-admin/`。
- 登录成功，落地 `/dashboard`，`localStorage.admin_v2_user` = SUPER_ADMIN。
- 菜单由后端 `GET /api/v1/admin/menus/current` 真实下发（42 项 / 35 个可访问叶子路由）。
- **0 个 HTTP≥400 的 /api 请求，0 条 pageerror**。
- 各页均有真实数据行（菜单 42、用户 20、村落动态 20、校园圈话题 20、评论 20、热度榜 20、高校 17、官方号 12、活动 11、积分商城 10…）。

## 5. 后台图片渲染（修复前 → 修复后）
`withMediaToken` 未改写遗留 `/static/...` 路径，而 Vite 只代理 `/api`，导致按 5179 源解析 → 404 裂图。
修复见 `apps/admin/src/api/media.ts`（`/static/{rel}` → `/api/v1/media/app-assets/{rel}`）。

| 页面 | 修复前 | 修复后 |
|---|---|---|
| `/content/users` | 2/9 加载，7 裂图 | **9/9 加载，0 裂图** |
| `/content/media-assets`（切「已通过」） | — | 25 图 **0 裂图** |
| 详情大图预览 | — | 26 图 **0 裂图** |

截图：`shots-admin/900-users-after-fix.png`、`902-media-approved.png`、`903-media-detail.png`。
`902` 已肉眼确认真实照片渲染（ID 1806/1805、上传者「曦风」，与 DB 一致）。

## 6. 已知非缺陷说明
- `/content/media-assets` 默认筛选 `pending`，而当前 `media_asset` 无 pending（1806 全 approved），
  故默认进入为空属数据现状而非 bug；需切「已通过」方可见图 —— 建议产品确认默认筛选口径。
- 一次 `POST /admin/media-assets/{id}/audit` 返回 500，根因是**测试脚本**用 Git Bash 以 GBK 发出中文
  `remark`，后端 Jackson 报 `Invalid UTF-8 middle byte`。属测试侧编码问题；
  但顺带暴露：请求体 JSON 解析失败应返回 400 而非 500（`GlobalExceptionHandler` 未处理
  `HttpMessageNotReadableException`），列为后续改进项。
