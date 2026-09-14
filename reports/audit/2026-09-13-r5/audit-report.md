# 2026-09-13 Round 5：编辑资料页改造 + 管理后台图片管理验收报告

## 一、任务与结论

| 需求 | 结论 |
|---|---|
| 编辑资料页替换/对齐注册完善资料流程 | ✅ 编辑入口本就唯一指向 `subpackages/setup/profile`（无旧编辑页残留）；该页为编辑+注册双语义复用页。补齐其缺失的「头像与照片墙」区块 |
| 整体流程完整（注册→完善→编辑） | ✅ 全链 UI 实测：新用户 UI 注册（100157）→ 成功页「完善我的资料」→ 编辑页（含新媒体区块）→ 保存 |
| 图片能在管理后台看到 | ✅ 修复两处致命 Bug 后，`media_asset` 落库、后台「图片审核」页缩略图/大图/审核人全部可见 |
| 可以真实管理 | ✅ 后台 UI 实际点击「审核」→ 通过 → DB `audit_status=approved`、待审列表清空 |
| 数据真实且有效、前端可见 | ✅ 编辑字段（昵称/简介/年级/称谓/身高/学历/感情状态/籍贯/未来城市）与 DB 逐字段一致；头像经鉴权代理 URL 前端可见 |

## 二、修复的缺陷（4 个，其中 2 个为「从未通过」级）

| ID | 级别 | 缺陷 | 修复 |
|---|---|---|---|
| MP-R5-AVATAR-500 | **P1** | 头像上传 100% 失败：`ProfileUpdateService` 传 type=`avatar`，`LocalMediaStorageService.normalizeType` 白名单只有 image/background/video/audio → 主链+降级链双异常 → 500。该功能自上线即不可用 | 白名单补 `avatar` |
| MP-R5-MEDIA404 | **P1** | 所有用户上传图片读取 404：`MediaAccessController.extractSubPath` 依赖的 `PATH_WITHIN` 属性实际返回完整 URI，旧兜底把整串当子路径 → 磁盘路径多出 `api/v1/media/` 层级 | 统一 marker 切割 `/api/v1/media/{userId}/` |
| MP-R5-MEDIAAUTH | **P1(前端)** | `resolveMediaUrl` 只给旧 `/uploads/` 前缀拼 `?token=`，后端实际返回的新前缀 `/api/v1/media/{userId}/` 不拼 → 小程序 `<image>` 无法带 header → 头像/照片墙全体回落默认图 | 补分支：代理前缀 URL 一律 `appendTokenIfMissing` |
| MP-R5-ADMINTHUMB | **P1(后台)** | 管理后台所有 `<img>` 用裸媒体 URL → 401 → 缩略图/大图/用户头像全部裂图，后台「看不到」图片 | `withMediaToken()` 助手（api/media.ts）+ MediaAssets/Users/Enrollments 共 7 处包裹 |

## 三、功能增强（编辑页补齐媒体区块）

- `subpackages/setup/profile/index.vue` 新增「头像与照片墙」SectionCard：
  - 头像：actionSheet（相册/相机）→ 隐私授权 → `profileStore.uploadAvatar`；
  - 照片墙：6 槽宫格，空位添加 / 已占用点击确认删除（`uploadPhotoAtIndex` / `removePhotoAtIndex`）；
  - 上传中遮罩、提交锁独立于表单保存锁；i18n zh/en 全量新增 15 键。
- 后端无需新端点：复用 `POST /profile/avatar`、`POST /profile/photos?index=`、`DELETE /profile/photos/{index}`，上传自动 `recordUpload` 进 `media_asset`（pending）→ 进入后台审核流。

## 四、验证证据

| 项 | 证据 |
|---|---|
| UI 注册→成功页→编辑页 | `register-retry.png`（验证码错误行内提示）、`editpage-top.png`（新媒体区块）、`editpage-grade.png`（picker 回显大三） |
| 编辑保存 | curl PUT `/profile/basic` 200；DB `user_basic_profile` 10 字段逐项一致（含中文籍贯） |
| 头像上传 | 修复后 POST `/profile/avatar` 200；`users.avatar_url` 更新；`media_asset#1803` type=avatar |
| 照片墙上传 | POST `/profile/photos?index=0/1` 200；`media_asset#1802/1804` |
| 后台可见 | IAB 真实登录后台：图片审核页列表呈现 EditFlowUser 资产；缩略图 DOM `naturalWidth=750`（修复前 0） |
| 后台管理 | UI 点击「审核」→ 默认通过 → 提交 → 待审列表清空；DB `audit_status=approved, auditor_id=100000` |
| 图片读回 | GET `/api/v1/media/100157/...jpg?token=` 200（image/jpeg, 32088B） |
| 前端可见 | 编辑页头像/照片墙回显截图；我的页昵称+简介回显截图（头像经 media auth 修复后可见，见回归） |
| 构建回归 | mock 门禁 `MOCK_EXIT=0`、real `REAL_EXIT=0`、admin `vue-tsc TSC_EXIT=0` |

## 五、环境事件记录

- 验收中途 Redis 进程退出导致后端 Redisson 启动失败、注册验证码失效——按用户提供的命令重启 Redis 后恢复；顺带完成「验证码错误」行内错误 UI 路径的验证。
- 宿主桌面自动化与用户窗口抢焦点，管理后台 UI 取证切换为受管浏览器（IAB）完成。

## 六、遗留

- 无 P0/P1 遗留。生产化建议（不阻塞）：`media-query-token-strict` 上线时置 true 并让客户端改用 5 分钟媒体令牌（后端端点已就绪）。
