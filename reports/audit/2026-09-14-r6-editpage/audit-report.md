# Round 6 审计报告：编辑资料页对齐注册页设计 + 编辑模式流程修复（2026-09-14）

## 0. 本轮任务（用户需求原文拆解）

1. 编辑资料页仍有问题 → 参考「注册时所见页面」（`pages/register/index`，寻觅注册页设计包落地）进行**整页替换**。
2. 保证整体流程完整（注册→完善资料向导 + 我的→编辑资料 两条链路）。
3. 构建后真实测试截图，前后端联通、数据真实有效。
4. 管理后台：图片**可见**且**可真实管理**（审核）。

## 1. 改动清单（全部有提交）

| 文件 | 改动 |
|---|---|
| `subpackages/setup/profile/index.vue` | **整页重写**（1167→约 1500 行）：AppShell+SectionCard 旧表单 → 注册页设计语言（hero 插图全出血+渐隐+返回钮 / 白卡骑压 -64rpx / 96rpx 圆角 24 图标字段 / 聚焦品牌色光环 / 行内错误+抖动 / 渐变主按钮）；新增双模式 `entry=edit` |
| `pages/profile/index.vue` | 「编辑资料」按钮 + 菜单行入口追加 `?entry=edit`（2 处） |
| `config/images.ts` | REGISTER_ICONS 补 9 个注册风格图标键（BOOK/RULER/GRADUATION/HEART/MAP_PIN/BUILDING/SPARKLES/SMILE/CHEVRON_RIGHT） |
| `static/assets/icons/register/*.svg`（9 新文件 ×2 处源） | lucide 风格 stroke #4A524E / 1.8，与注册图标同体系；**两处源**（src/static + static-local-backup/full-static）同步落盘，防 prepare-static restore 清除 |
| `i18n/locales/zh-CN.ts` `en-US.ts` | 新增 `submitSaveEdit`/`bottomNote`/`backAria` |

## 2. 关键功能修复（非纯视觉）

**MP-R6-EDITFLOW（P1 流程缺陷，本轮修复）**：原实现「我的→编辑资料」保存后一律 `redirectTo` 注册向导下一步（校园认证/时间安排）——编辑场景流程断裂。
修复：页面 `onLoad` 读 `entry` 参数区分双模式：
- `wizard`（默认，注册向导）：显示 SetupProgress，保存后仍 redirectTo 下一步（回归验证：保存后进校园认证第 2/4 步，步骤 1 打勾）；
- `edit`（?entry=edit）：隐藏进度条，按钮文案「保存并继续」→「保 存」，保存/无变更后 `navigateBack` 回「我的」（无栈兜底 switchTab PROFILE）。

## 3. 功能保持核对（重构不丢功能）

- 头像 actionSheet（相册/相机）+ 隐私授权 + 上传 → media_asset（真实链路验证）
- 照片墙 6 槽（顺序上传/确认删除/上传遮罩）→ media_asset
- 全部 11 字段（nickname/bio/grade 滚轮/pronouns/height 滚轮 140-200/educationLevel/relationshipStatus/hometownProvince/hometownCity/futureCity/expectedPartner）
- 身份选择（student→校园认证 / non_student→时间安排）即时持久化
- 提交锁、必填校验（行内错误+抖动+Toast 三通道，对齐注册页）、必填 4 字段全量 + 可选字段 diff、保存后 refreshSession
- defineExpose(SUBPACKAGE_ROUTES) vue-tsc 规避保留

## 4. 构建与类型

- `vue-tsc --noEmit`：本页 + images.ts + locales **0 错误**（仓库预存的 village/media.ts/location.vue/pages-profile 等历史错误非本轮范围，构建链不跑 vue-tsc，与 main 一致）
- `pnpm build:mp-weixin:real:dev`（real 模式，VITE_API_BASE_URL=http://127.0.0.1:8080/api）**构建通过**，产物含新页面/图标（23 个 register 图标）/entry=edit

## 5. 真实验收证据（微信开发者工具 real 模式 + 后端 8080 + MySQL/Redis）

| # | 链路/场景 | 证据 | 结果 |
|---|---|---|---|
| 1 | 真实注册新用户 13800006666/曦风（短信 mock 123456 真实调后端+倒计时） | 06/08/09/11/12 截图；users 表 id=100158 | **PASS** |
| 2 | 向导模式保存（昵称/签名/称呼 automator 输入，年级 picker change=2→大三，**身高原生滚轮真实点击选 141cm**） | 16 截图；users: grade_label=大三 pronouns=TA；user_basic_profile: height=141 | **PASS** |
| 3 | 向导保存后重定向 → 校园认证第 2/4 步（步骤 1 打勾） | 17 截图 | **PASS** |
| 4 | 编辑模式入口（真实点击「编辑资料」→ route 带 `entry=edit`；隐藏进度条；按钮=保 存；全字段回填） | 19/20 截图 | **PASS** |
| 5 | **编辑模式保存 → navigateBack 回「我的」**（修复验证，不再误投向导） | 21 截图 route=/pages/profile/index；DB bio 更新为「爱摄影，也爱深夜食堂；周末常在天台拍晚霞」 | **PASS** |
| 6 | 头像上传（actionSheet→相册→原生文件框） | media_asset 1805 avatar；users.avatar_url 回写；编辑页头像实时回显（22 截图） | **PASS** |
| 7 | 照片墙上传 ×2（1806/1807） | DB photo_gallery=[...]；重进编辑页回显 2 张+删除角标（38 截图） | **PASS** |
| 8 | 图片服务鉴权链路 | GET /api/v1/media/100158/...?token= → 200 image/png（头像/照片均验证） | **PASS** |
| 9 | Console 扫描（注册/编辑/保存/上传全程） | `grep -in error` → 空 | **PASS** |
| 10 | 管理后台（详见 §6） | r6-admin 3 张截图 + DB | **PASS** |

注：中途模拟器白屏（getApp()=null，`module 'config/home-recommended-people.js' is not defined`）为 **DevTools 陈旧编译缓存**（窗口关闭重开触发，磁盘 dist 无该引用），`debug_clear_cache cleanCompileCache + cleanProjectFileListCache` 后恢复；与审计报告已知环境问题一致，非代码缺陷。

## 6. 管理后台核查（SUPER_ADMIN local-dev-admin-openid-123456）

| 项 | 证据 | 结果 |
|---|---|---|
| 登录 | POST /v1/auth/admin/login（Idempotency-Key）→ token + role=SUPER_ADMIN | PASS |
| 图片**可见** | GET /admin/media-assets 列出 1805/1806/1807（含 url/尺寸/上传者）；UI「图片审核」页缩略图+大图预览+元信息 46.3KB 185×195 渲染（admin-media-pending.png） | PASS |
| 图片**可管理** | POST /admin/media-assets/1806/audit {decision:approved} → DB audit_status=approved、audit_remark=「R6 真实验收通过」、**auditor_id=100000**；1805 同样通过；待审列表随后为空（admin-media-assets.png 空态正确） | PASS |
| 用户数据 | GET /admin/users/100158 → 昵称/头像 URL/photoGallery/签名/完成度 30/手机号脱敏；UI「用户管理」行内头像缩略图+完成度 30%（admin-users.png） | PASS |
| 前后台同步 | 前端（曦风/签名/141cm/大三/头像/照片墙）↔ users + user_basic_profile + media_asset ↔ 后台列表/详情逐项一致 | PASS |

## 7. 已知边界（决策记录，不阻塞）

- IA-VISUAL-EDIT-01：照片墙上传后**当次**不即时回显、重进页面回显（store 在响应后同步，截图时序早于响应；API/重进均已验证）。Severity P3，决策：接受（与我的页既有行为一致），后续可在 store 内做乐观回显。
- 登录页「手机号登录」在 automator tap/trigger 下不触发的怪癖为自动化层问题（真机路径未受影响，本轮注册链路实际走通），登记为人工抽检项。
- 模拟器白屏为 DevTools 编译缓存环境问题（§5 注），已记录处理流程。

## 8. 截图清单

- 小程序：`reports/screenshots/r6-editpage/`（01–38：登录页/注册全流程/新编辑页 wizard+edit 双模式/原生滚轮/保存重定向/编辑返回/头像照片回显/缓存修复前后）
- 管理后台：`reports/screenshots/r6-admin/`（admin-media-assets 待审空态 / admin-media-pending 缩略图可见 / admin-users 用户数据）
