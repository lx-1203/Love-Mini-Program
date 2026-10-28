# 全量回归报告（2026-10-29）

> 环境：本地真实栈（MySQL 3306 / Redis 6379 / API real 8080 / Admin 5177 / 微信开发者工具模拟器）。
> 冻结基线：`400c5a70`，tracked 干净，API 200，`src/static` 1354。
> 证据根：`tmp/verify-20261028/regression/`。

## 0. 结论

- **全量回归通过**，但过程中发现并修复了一个真实缺陷：临时会话深链冷启动时 `sessionId` 赋值晚于登录门，导致登录态恢复后补载 watcher 无会话可载。修复提交 `8f126c19`。
- 最终读数：后端 1433/0/0/7；客户端 132 files / 1451 tests；后台 39 tests；根契约链 exit 0；MP 构建 PASS；API 冒烟 21/21；真实清理 7/7；关键页 console 0。
- 未闭合项只剩外部发布凭证与仪器物理点击边界（详见 §6）。

## 1. 静态门

| 门 | 结果 | 证据 |
|---|---|---|
| 后端 `mvn test` | `Tests=1433 Failures=0 Errors=0 Skipped=7` | `backend-test.log`、`backend-totals.txt` |
| 客户端 typecheck | exit 0 | `client-typecheck.log` |
| 客户端覆盖率测试 | `132 files / 1449 tests` 全绿；lines 23.81% / branches 64.15% / functions 39.69% / statements 23.81%（阈值内） | `client-coverage.log` |
| 客户端最终单测 | `132 files / 1451 tests` 全绿（含新增冷启动 2 例） | `client-unit-r2.log` |
| 后台 typecheck / 单测 / 构建 | exit 0 / `39 tests` / built 33.84s | `admin-typecheck.log`、`admin-test.log`、`admin-build.log` |
| ESLint | exit 0，14820 problems（**0 errors**，均为 warning） | `lint.log` |
| OpenAPI lint | `openapi lint ok (125 operations)` | `openapi-lint.log` |
| Spectral | exit 0，92 warnings / **0 errors** | `openapi-spectral.log` |
| 根契约链 | exit 0（含 E2E 路由 74、admin write gate、fallback 棘轮、tracked refs、gate wiring） | `contracts.log`、`contracts-r2.log` |
| tracked refs | 引用 546 / 缺件 0 / 未入库 0 | `contracts-r2.log` |

## 2. 构建

| 项 | 结果 |
|---|---|
| 后端打包 | `mvn package -DskipTests` exit 0 |
| MP 发布链 | `RELEASECHAIN_RESULT=PASS steps=15`；主包 1.64MB / 总包 2.75MB；CDN 294；`shippable=no`（loopback 豁免） |
| 后台构建 | exit 0，33.84s |
| `src/static` | 构建后已 `prepare-static --dev` 还原 1354 文件 |

证据：`backend-package.log`、`mp-release.log`、`mp-release-r2.log`、`static-restore*.log`。

## 3. API 运行时

- `verify-wave2.mjs`：**21 PASS / 0 FAIL**（公告 8、提及/点赞 9、临时图片 4），脚本自清理。
- `verify-cleanup.mjs`：**7 PASS**：
  - `assets=1 messages=1 lock=true`
  - 图片文件已从磁盘删除
  - `media_asset.deleted_at` 已写、消息数 0
  - hold 资产文件保留、`deleted_at` 为空

证据：`api-smoke.log`、`cleanup.log`。

## 4. 页面取帧

| 页面 | 结果 |
|---|---|
| 通知中心 | 取帧 `notifications.png`；点击首条后页面栈落到 `topic-detail?topicId=53`，`notification-detail.png` |
| circle-home / post-topic / topic-detail | 3/3 落点正确，console 0，帧 60KB/16KB/21KB（`ui/results_regression2.tsv`） |
| 临时会话冷启动 | 清编译缓存 + 注入会话 + 直接深链，匿名横幅与消息正常（`chat-cold-r2.png`） |

**本轮发现的缺陷**：第一次冷启动取帧（`chat-cold.png`）落到私信默认壳，页面栈无 temp API 请求。根因是 `onLoad` 先 `if (!isUnlocked) return`，深链 `sessionId` 赋值在其后；登录态异步恢复后 watcher 拿不到 sessionId。修复：把 sessionId 赋值提前到登录门之前（`8f126c19`），补 2 条页面契约测试；复测 `chat-cold-r2.png` 通过。

**仪器备注**：第一次 3 页巡检截图 0 字节，原因是 `SHOTS_WIN` 未绝对化，工具把相对路径落到工作目录；显式传 Windows 绝对路径后复跑正常。这不是页面缺陷。

## 5. 数据清理

回归产生的 QA 数据已清理：QA 话题 0、QA 通知 0、QA 临时会话 0、QA 临时媒体 0、topic/reply mentions 0、话题点赞去重 0、圈 8 QA 成员 0。

最终库态：posts=206、topics=39、announcements=0、temp_sessions=1（既有非 QA）、TEMP_CHAT 资产=0。

## 6. 仍未闭合

- **发布外部输入**：HTTPS 域名、真实 AppID、`WECHAT_SECRET`、CORS 域名未提供；`verify-env-release` 为 FAIL 2 条，`shippable=no`。见 `reports/verify/2026-10-28/30-close/release-external-inputs.md`。
- **真实 48h 墙钟**：清理已真实触发并验证文件删除/墓碑/消息删除/hold 跳过，但未等待 48 小时。
- **组件内部按钮物理点击**：@提及确认通过页面 VM 调用组件 confirm 同一处理器验证，物理点击仍受 DevTools 组件边界限制。
