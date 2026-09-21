# R1 截图矩阵（screenshot-matrix）

- 生成：2026-09-22（书记员-R1 整理落盘）；核对命令：Node 脚本对 interact 全部 checks/issues 引用的证据文件逐一 `fs.existsSync`（含页面短名前缀还原），并清点本轮两个截图目录。

## 一、总量与存在性核对结论

- `reports/screenshots/round-1-interact/`：盘上 2405 个文件（png 2397 张 + 证据日志 8 个）。
- `reports/screenshots/round-1/`（双身份全页截图，manifest generatedAt=2026-09-19T17:28:57Z）：A 身份 72 张 + B 身份 72 张；附 boot-verify-A.log / boot-verify-B.log（各 3 次 boot ok，logged-in userId=user-1001）、console-evidence-A.log / console-evidence-B.log、blank-check.tsv、manifest.json。
- interact 判定 JSON 共引用证据文件名 1922 个（含短名引用）；其中**盘上缺失 11 项**、歧义短名（多个页面同前缀，已在 interaction-matrix 以「(歧义)」标注）0 项。

缺失清单（引用了但盘上不存在）：

- reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-19b-before.png
- reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-33-before.png
- reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP11b-before.png
- reports/screenshots/round-1-interact/DQ-07-after.png
- reports/screenshots/round-1-interact/LC-03-before.png
- reports/screenshots/round-1-interact/HP-05-before.png
- reports/screenshots/round-1-interact/SEC-04-before.png
- reports/screenshots/round-1-interact/SEC-06-before.png
- reports/screenshots/round-1-interact/SEC-09-before.png
- reports/screenshots/round-1-interact/SEC-10-before.png
- reports/screenshots/round-1-interact/SEC-11-before.png

## 二、round-1（双身份全页截图）清单

manifest 首条样式：identity=A、route=pages/discover/index、state=默认、file=reports/screenshots/round-1/A/PAGES_DISCOVER_INDEX-默认.png（221KB）。A/B 目录文件名一一对应（各 72 张），覆盖主包 6 tab + 全部分包路由的「默认/滚动后/交互后」三态。boot 自检（boot-verify-A.log 全文）：`boot[A]: ok (logged-in userId=user-1001)` ×3，B 侧同式 ×3——对应 T11「双身份证据失效」防线的本轮复验留档。

## 三、round-1-interact 逐截图矩阵

说明：下表把每个被引用的截图映射到引用它的用例与判定；「✓」=盘上存在（含前缀还原），「✗」=缺失（见上文清单）。同一截图被多次引用时合并列出。

### PAGES-DISCOVER-INDEX.json（引用截图 76 个，存在 76，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-1-initial-load-before.png | PAGES-DISCOVER-INDEX#1 | 01 初载渲染（身份A 登录态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-1-initial-load-after.png | PAGES-DISCOVER-INDEX#1 | 01 初载渲染（身份A 登录态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-2-filter-open-before.png | PAGES-DISCOVER-INDEX#2 | 02 点击筛选圆钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-2-filter-open-after.png | PAGES-DISCOVER-INDEX#2 | 02 点击筛选圆钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-3-drawer-tab-advanced-before.png | PAGES-DISCOVER-INDEX#3 | 03 抽屉 基础/高级Tab 切换 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-3-drawer-tab-advanced-after.png | PAGES-DISCOVER-INDEX#3 | 03 抽屉 基础/高级Tab 切换 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-4-drawer-education-chip-before.png | PAGES-DISCOVER-INDEX#4 | 04 学历 chip 多选 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-4-drawer-education-chip-after.png | PAGES-DISCOVER-INDEX#4 | 04 学历 chip 多选 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-5-drawer-relationship-chip-before.png | PAGES-DISCOVER-INDEX#5 | 05 感情状态 chip 单选互斥 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-5-drawer-relationship-chip-after.png | PAGES-DISCOVER-INDEX#5 | 05 感情状态 chip 单选互斥 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-6-drawer-height-slider-before.png | PAGES-DISCOVER-INDEX#6 | 06 身高滑块拖动 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-6-drawer-height-slider-after.png | PAGES-DISCOVER-INDEX#6 | 06 身高滑块拖动 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-7-keyword-input-normal-before.png | PAGES-DISCOVER-INDEX#7 | 07 关键词正常输入「摄影」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-7-keyword-input-normal-after.png | PAGES-DISCOVER-INDEX#7 | 07 关键词正常输入「摄影」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-8-keyword-input-long-before.png | PAGES-DISCOVER-INDEX#8 | 08 关键词超长文本300字 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-8-keyword-input-long-after.png | PAGES-DISCOVER-INDEX#8 | 08 关键词超长文本300字 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-9-keyword-input-special-before.png | PAGES-DISCOVER-INDEX#9 | 09 关键词特殊字符 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-9-keyword-input-special-after.png | PAGES-DISCOVER-INDEX#9 | 09 关键词特殊字符 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-10-keyword-clear-before.png | PAGES-DISCOVER-INDEX#10 | 10 关键词清空按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-10-keyword-clear-after.png | PAGES-DISCOVER-INDEX#10 | 10 关键词清空按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-11-filter-reset-before.png | PAGES-DISCOVER-INDEX#11 | 11 筛选重置 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-11-filter-reset-after.png | PAGES-DISCOVER-INDEX#11 | 11 筛选重置 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-12-filter-confirm-before.png | PAGES-DISCOVER-INDEX#12 | 12 筛选确认 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-12-filter-confirm-after.png | PAGES-DISCOVER-INDEX#12 | 12 筛选确认 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-13-drawer-close-btn-before.png | PAGES-DISCOVER-INDEX#13 | 13 抽屉关闭按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-13-drawer-close-btn-after.png | PAGES-DISCOVER-INDEX#13 | 13 抽屉关闭按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-14-drawer-mask-close-before.png | PAGES-DISCOVER-INDEX#14 | 14 遮罩点击关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-14-drawer-mask-close-after.png | PAGES-DISCOVER-INDEX#14 | 14 遮罩点击关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-15-tab-nearby-before.png | PAGES-DISCOVER-INDEX#15 | 15 切「附近」分段 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-15-tab-nearby-after.png | PAGES-DISCOVER-INDEX#15 | 15 切「附近」分段 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-16-tab-recommend-back-before.png | PAGES-DISCOVER-INDEX#16 | 16 切回「推荐」分段 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-16-tab-recommend-back-after.png | PAGES-DISCOVER-INDEX#16 | 16 切回「推荐」分段 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-17-card-tap-profile-before.png | PAGES-DISCOVER-INDEX#17 | 17 点击卡片→他人主页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-17-card-tap-profile-after.png | PAGES-DISCOVER-INDEX#17 | 17 点击卡片→他人主页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-18-pass-button-before.png | PAGES-DISCOVER-INDEX#18 | 18 点「跳过」(X) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-18-pass-button-after.png | PAGES-DISCOVER-INDEX#18 | 18 点「跳过」(X) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-19-card-swipe-left-before.png | PAGES-DISCOVER-INDEX#19 | 19 卡片左滑手势（>120px） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-19-card-swipe-left-after.png | PAGES-DISCOVER-INDEX#19 | 19 卡片左滑手势（>120px） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-20-pass-rapid-x3-before.png | PAGES-DISCOVER-INDEX#20 | 20 快速连续点跳过×3（150ms间隔） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-20-pass-rapid-x3-after.png | PAGES-DISCOVER-INDEX#20 | 20 快速连续点跳过×3（150ms间隔） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-21-like-button-before.png | PAGES-DISCOVER-INDEX#21 | 21 点「喜欢」 | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-21-like-button-after.png | PAGES-DISCOVER-INDEX#21 | 21 点「喜欢」 | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-22-card-swipe-right-before.png | PAGES-DISCOVER-INDEX#22 | 22 卡片右滑手势（>120px） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-22-card-swipe-right-after.png | PAGES-DISCOVER-INDEX#22 | 22 卡片右滑手势（>120px） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-23-superlike-button-before.png | PAGES-DISCOVER-INDEX#23 | 23 点「打招呼」 | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-23-superlike-button-after.png | PAGES-DISCOVER-INDEX#23 | 23 点「打招呼」 | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-24-superlike-rate-limit-before.png | PAGES-DISCOVER-INDEX#24 | 24 打招呼频控（同卡第4次） | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-24-superlike-rate-limit-after.png | PAGES-DISCOVER-INDEX#24 | 24 打招呼频控（同卡第4次） | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-25-like-double-tap-before.png | PAGES-DISCOVER-INDEX#25 | 25 喜欢双击（重复提交，120ms） | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-25-like-double-tap-after.png | PAGES-DISCOVER-INDEX#25 | 25 喜欢双击（重复提交，120ms） | ✅ 符合 | MP-R1-PAGES-DISCOVER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-26-error-banner-retry-before.png | PAGES-DISCOVER-INDEX#26 | 26 错误横幅「重试」 | ❌ 偏差 | MP-R1-PAGES-DISCOVER-INDEX-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-26-error-banner-retry-after.png | PAGES-DISCOVER-INDEX#26 | 26 错误横幅「重试」 | ❌ 偏差 | MP-R1-PAGES-DISCOVER-INDEX-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-27-empty-cards-before.png | PAGES-DISCOVER-INDEX#27 | 27 空卡片空态 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-27-empty-cards-clean.png | PAGES-DISCOVER-INDEX#27 | 27 空卡片空态 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-28-scroll-view-before.png | PAGES-DISCOVER-INDEX#28 | 28 滚动区上滑手势 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-28-scroll-view-after.png | PAGES-DISCOVER-INDEX#28 | 28 滚动区上滑手势 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-29-open-then-quick-leave-before.png | PAGES-DISCOVER-INDEX#29 | 29 打开立即返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-29-open-then-quick-leave-after.png | PAGES-DISCOVER-INDEX#29 | 29 打开立即返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-30-reenter-x3-before.png | PAGES-DISCOVER-INDEX#30 | 30 重复进出×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-30-reenter-x3-after.png | PAGES-DISCOVER-INDEX#30 | 30 重复进出×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-31-tabbar-switch-before.png | PAGES-DISCOVER-INDEX#31 | 31 tabBar点击切换 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-31-tabbar-switch-after.png | PAGES-DISCOVER-INDEX#31 | 31 tabBar点击切换 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-32-pull-down-refresh-before.png | PAGES-DISCOVER-INDEX#32 | 32 下拉刷新手势 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-32-pull-down-refresh-after.png | PAGES-DISCOVER-INDEX#32 | 32 下拉刷新手势 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-33-guest-initial-before.png | PAGES-DISCOVER-INDEX#33 | 33 游客态初载 | ❌ 偏差 | MP-R1-PAGES-DISCOVER-INDEX-003 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-33-guest-initial-after.png | PAGES-DISCOVER-INDEX#33 | 33 游客态初载 | ❌ 偏差 | MP-R1-PAGES-DISCOVER-INDEX-003 | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-34-guest-login-hint-tap-before.png | PAGES-DISCOVER-INDEX#34 | 34 游客点登录提示条 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-34-guest-login-hint-tap-after.png | PAGES-DISCOVER-INDEX#34 | 34 游客点登录提示条 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-35-guest-like-toast-before.png | PAGES-DISCOVER-INDEX#35 | 35 游客点「喜欢」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-35-guest-like-toast-after.png | PAGES-DISCOVER-INDEX#35 | 35 游客点「喜欢」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-36-guest-superlike-toast-before.png | PAGES-DISCOVER-INDEX#36 | 36 游客点「打招呼」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-36-guest-superlike-toast-after.png | PAGES-DISCOVER-INDEX#36 | 36 游客点「打招呼」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-37-guest-pass-local-before.png | PAGES-DISCOVER-INDEX#37 | 37 游客点「跳过」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-37-guest-pass-local-after.png | PAGES-DISCOVER-INDEX#37 | 37 游客点「跳过」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-38-guest-card-tap-before.png | PAGES-DISCOVER-INDEX#38 | 38 游客点卡片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-38-guest-card-tap-after.png | PAGES-DISCOVER-INDEX#38 | 38 游客点卡片 | ✅ 符合 | — | ✓ |

### PAGES-HOME-INDEX.json（引用截图 83 个，存在 83，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A00-base.png | PAGES-HOME-INDEX#1 | A00 注入 mock 登录态并 reLaunch 首页（基线） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A00-base2.png | PAGES-HOME-INDEX#1 | A00 注入 mock 登录态并 reLaunch 首页（基线） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A01-before.png | PAGES-HOME-INDEX#2 | A01 点击头部本人头像入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A01-after.png | PAGES-HOME-INDEX#2 | A01 点击头部本人头像入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A02-before.png | PAGES-HOME-INDEX#3 | A02 点击定位胶囊 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A02-after.png | PAGES-HOME-INDEX#3 | A02 点击定位胶囊 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A03-before.png | PAGES-HOME-INDEX#4 | A03 点击「我知道了」关闭弹窗（B01 重拍：主轮选择器误写 --secondary 在 text 上未命中） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B01-after.png | PAGES-HOME-INDEX#4 | A03 点击「我知道了」关闭弹窗（B01 重拍：主轮选择器误写 --secondary 在 text 上未命中） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A04-before.png | PAGES-HOME-INDEX#5 | A04 打开弹窗点击「重新定位」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A04-after.png | PAGES-HOME-INDEX#5 | A04 打开弹窗点击「重新定位」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A05-before.png | PAGES-HOME-INDEX#6 | A05 点击弹窗 hero「进入位置主页 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A05-after.png | PAGES-HOME-INDEX#6 | A05 点击弹窗 hero「进入位置主页 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A06-before.png | PAGES-HOME-INDEX#7 | A06 点击头部铃铛 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A06-after.png | PAGES-HOME-INDEX#7 | A06 点击头部铃铛 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A07-before.png | PAGES-HOME-INDEX#8 | A07 点击今日推荐照片区（整卡） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A07-after.png | PAGES-HOME-INDEX#8 | A07 点击今日推荐照片区（整卡） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A08-before.png | PAGES-HOME-INDEX#9 | A08 点击「看看TA」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A08-after.png | PAGES-HOME-INDEX#9 | A08 点击「看看TA」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A09-before.png | PAGES-HOME-INDEX#10 | A09 点击「↻ 换一位」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A09-after.png | PAGES-HOME-INDEX#10 | A09 点击「↻ 换一位」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B02-before.png | PAGES-HOME-INDEX#11 | A10/B02 点击「♥ 喜欢」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B02-mid.png | PAGES-HOME-INDEX#11 | A10/B02 点击「♥ 喜欢」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A11-before.png | PAGES-HOME-INDEX#12 | A11 快速连点「喜欢」3 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A11-mid.png | PAGES-HOME-INDEX#12 | A11 快速连点「喜欢」3 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A12-before.png | PAGES-HOME-INDEX#13 | A12 点击恋爱进度第 1 卡「完善资料」（action=profile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A12-after.png | PAGES-HOME-INDEX#13 | A12 点击恋爱进度第 1 卡「完善资料」（action=profile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A13-before.png | PAGES-HOME-INDEX#14 | A13 点击第 2 卡「认识新人」（action=discover，nth-child 定位） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A13-after.png | PAGES-HOME-INDEX#14 | A13 点击第 2 卡「认识新人」（action=discover，nth-child 定位） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A14-before.png | PAGES-HOME-INDEX#15 | A14 点击第 3 卡「回复悄悄话」（action=messages） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A14-after.png | PAGES-HOME-INDEX#15 | A14 点击第 3 卡「回复悄悄话」（action=messages） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A15-before.png | PAGES-HOME-INDEX#16 | A15 点击第 4 卡「参与兴趣互动」（action=nearby） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A15-after.png | PAGES-HOME-INDEX#16 | A15 点击第 4 卡「参与兴趣互动」（action=nearby） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A16-before.png | PAGES-HOME-INDEX#17 | A16 点击关系动态「全部 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A16-after.png | PAGES-HOME-INDEX#17 | A16 点击关系动态「全部 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A17-before.png | PAGES-HOME-INDEX#18 | A17 点击关系动态第 1 格「3 人喜欢了你」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A17-after.png | PAGES-HOME-INDEX#18 | A17 点击关系动态第 1 格「3 人喜欢了你」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A18-before.png | PAGES-HOME-INDEX#19 | A18 点击第 2 格「2 条悄悄话」（tap 落于 icon--green icon-img 验证冒泡） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A18-after.png | PAGES-HOME-INDEX#19 | A18 点击第 2 格「2 条悄悄话」（tap 落于 icon--green icon-img 验证冒泡） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A19-before.png | PAGES-HOME-INDEX#20 | A19 点击第 3 格「5 人看过你」（icon--purple） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A19-after.png | PAGES-HOME-INDEX#20 | A19 点击第 3 格「5 人看过你」（icon--purple） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A20-before.png | PAGES-HOME-INDEX#21 | A20 点击第 4 格「1 个新匹配」（icon--orange） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A20-after.png | PAGES-HOME-INDEX#21 | A20 点击第 4 格「1 个新匹配」（icon--orange） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A21-before.png | PAGES-HOME-INDEX#22 | A21 点击兴趣推荐「查看更多 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A21-after.png | PAGES-HOME-INDEX#22 | A21 点击兴趣推荐「查看更多 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A22-before.png | PAGES-HOME-INDEX#23 | A22 点击兴趣圈卡片「摄影圈」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A22-after.png | PAGES-HOME-INDEX#23 | A22 点击兴趣圈卡片「摄影圈」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-C04-before.png | PAGES-HOME-INDEX#24 | A23/B03/C03/C04 点击圈卡「加入」按钮（摄影圈 B03 点击 + 旅行圈 C04 点击，共 3 次点击） | ❌ 偏差 | MP-R1-HOME-016 | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-C04-after.png | PAGES-HOME-INDEX#24 | A23/B03/C03/C04 点击圈卡「加入」按钮（摄影圈 B03 点击 + 旅行圈 C04 点击，共 3 次点击） | ❌ 偏差 | MP-R1-HOME-016 | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A24-before.png | PAGES-HOME-INDEX#25 | A24 点击附近的人「全部 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A24-after.png | PAGES-HOME-INDEX#25 | A24 点击附近的人「全部 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A25-before.png | PAGES-HOME-INDEX#26 | A25 点击附近的人第 1 个头像（林晓） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A25-after.png | PAGES-HOME-INDEX#26 | A25 点击附近的人第 1 个头像（林晓） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A26-before.png | PAGES-HOME-INDEX#27 | A26 点击底部 bar「附近有 9 位值得认识的人 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A26-after.png | PAGES-HOME-INDEX#27 | A26 点击底部 bar「附近有 9 位值得认识的人 ›」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A27-before.png | PAGES-HOME-INDEX#28 | A27 点击社区动态「查看更多 ›」（回归 MP-R1-HOME-010） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A27-after.png | PAGES-HOME-INDEX#28 | A27 点击社区动态「查看更多 ›」（回归 MP-R1-HOME-010） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A28-before.png | PAGES-HOME-INDEX#29 | A28 点击社区动态帖子卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A28-after.png | PAGES-HOME-INDEX#29 | A28 点击社区动态帖子卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A29-before.png | PAGES-HOME-INDEX#30 | A29 点击帖子作者头像/昵称（post-card__author-tap，role=button） | ❌ 偏差 | MP-R1-HOME-015 | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A29-after.png | PAGES-HOME-INDEX#30 | A29 点击帖子作者头像/昵称（post-card__author-tap，role=button） | ❌ 偏差 | MP-R1-HOME-015 | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A30-before.png | PAGES-HOME-INDEX#31 | A30 点击帖子卡「关注」按钮 | ❌ 偏差 | MP-R1-HOME-014 | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A30-after.png | PAGES-HOME-INDEX#31 | A30 点击帖子卡「关注」按钮 | ❌ 偏差 | MP-R1-HOME-014 | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-C01-after.png | PAGES-HOME-INDEX#32、PAGES-HOME-INDEX#34 | A31/B04 点击邀请 banner「去邀请」（滚到底部可见后点击） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B04-after.png | PAGES-HOME-INDEX#32 | A31/B04 点击邀请 banner「去邀请」（滚到底部可见后点击） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B05-before.png | PAGES-HOME-INDEX#33 | A32/B05 下拉刷新（wx.startPullDownRefresh，hook 延迟 stopPullDownRef… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-PAGES_HOME_INDEX-B05-settled.png | PAGES-HOME-INDEX#33 | A32/B05 下拉刷新（wx.startPullDownRefresh，hook 延迟 stopPullDownRef… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-C01-before.png | PAGES-HOME-INDEX#34 | A33/B06/C01 整页滚动到底（wx.pageScrollTo 99999；回归 MP-R1-HOME-013） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-C02-before.png | PAGES-HOME-INDEX#35 | A34/B07/C02 滚动至中部 400px 后回顶（回归 MP-R3-HOME-006 滚动遮罩） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-C02-after.png | PAGES-HOME-INDEX#35 | A34/B07/C02 滚动至中部 400px 后回顶（回归 MP-R3-HOME-006 滚动遮罩） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A35-before.png | PAGES-HOME-INDEX#36 | A35 打开定位弹窗后点击遮罩 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A35-after.png | PAGES-HOME-INDEX#36 | A35 打开定位弹窗后点击遮罩 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A35b-before.png | PAGES-HOME-INDEX#37 | A35b 打开弹窗后点击右上角 × | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A35b-after.png | PAGES-HOME-INDEX#37 | A35b 打开弹窗后点击右上角 × | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A36-before.png | PAGES-HOME-INDEX#38 | A36 快速连点今日推荐照片区 5 次（间隔 120ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A36-after.png | PAGES-HOME-INDEX#38 | A36 快速连点今日推荐照片区 5 次（间隔 120ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B08-before.png | PAGES-HOME-INDEX#39 | A37/B08 navigateTo 他人主页后立即 navigateBack，重复 3 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B08-after.png | PAGES-HOME-INDEX#39 | A37/B08 navigateTo 他人主页后立即 navigateBack，重复 3 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A38-before.png | PAGES-HOME-INDEX#40 | A38 重复进出首页（reLaunch → navigateTo other → back 共 2 轮） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-A38-after.png | PAGES-HOME-INDEX#40 | A38 重复进出首页（reLaunch → navigateTo other → back 共 2 轮） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B09-before.png | PAGES-HOME-INDEX#41 | A39/B09 未登录态点击「♥ 喜欢」（清空 session.userSession 后点击） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B09-mid.png | PAGES-HOME-INDEX#41 | A39/B09 未登录态点击「♥ 喜欢」（清空 session.userSession 后点击） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B10-before.png | PAGES-HOME-INDEX#42 | A40/B10 恢复登录态基线复查 + console 全量取证 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES_HOME_INDEX-B10-after.png | PAGES-HOME-INDEX#42 | A40/B10 恢复登录态基线复查 + console 全量取证 | ✅ 符合 | — | ✓ |

### PAGES-LOGIN-INDEX.json（引用截图 48 个，存在 47，缺失 1）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-00-base.png | PAGES-LOGIN-INDEX#1 | 00 未登录 reLaunch 进入登录页（基线） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-01-before.png | PAGES-LOGIN-INDEX#2 | 01 页面打开立即返回 + 重复进出（经《用户协议》页 navigateTo→navigateBack 共 3 次，第 … | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-01-enter1.png | PAGES-LOGIN-INDEX#2 | 01 页面打开立即返回 + 重复进出（经《用户协议》页 navigateTo→navigateBack 共 3 次，第 … | ✅ 符合 | — | ✓ |
| PAGES-LOGIN-INDEX-01-back1.png | PAGES-LOGIN-INDEX#2 | 01 页面打开立即返回 + 重复进出（经《用户协议》页 navigateTo→navigateBack 共 3 次，第 … | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-02-before.png | PAGES-LOGIN-INDEX#3 | 02 点击协议勾选框（默认已勾选→取消） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-02-after.png | PAGES-LOGIN-INDEX#3 | 02 点击协议勾选框（默认已勾选→取消） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-03-before.png | PAGES-LOGIN-INDEX#4 | 03 未勾选协议时点击「微信一键登录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-03-after.png | PAGES-LOGIN-INDEX#4 | 03 未勾选协议时点击「微信一键登录」 | ✅ 符合 | — | ✓ |
| PAGES-LOGIN-INDEX-03-after2.png | PAGES-LOGIN-INDEX#4 | 03 未勾选协议时点击「微信一键登录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-04-before.png | PAGES-LOGIN-INDEX#5 | 04 再次点击协议勾选框（恢复勾选） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-04-after.png | PAGES-LOGIN-INDEX#5 | 04 再次点击协议勾选框（恢复勾选） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-05b-before.png | PAGES-LOGIN-INDEX#6 | 05 1500ms 防抖窗口内快速连点「微信一键登录」5 次（含后端 502 分支） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-05b-after.png | PAGES-LOGIN-INDEX#6 | 05 1500ms 防抖窗口内快速连点「微信一键登录」5 次（含后端 502 分支） | ✅ 符合 | — | ✓ |
| PAGES-LOGIN-INDEX-05b-after2.png | PAGES-LOGIN-INDEX#6 | 05 1500ms 防抖窗口内快速连点「微信一键登录」5 次（含后端 502 分支） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-06-before.png | PAGES-LOGIN-INDEX#7 | 06 点击「稍后再看」（体验账号一键登录） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-06-after.png | PAGES-LOGIN-INDEX#7 | 06 点击「稍后再看」（体验账号一键登录） | ✅ 符合 | — | ✓ |
| PAGES-LOGIN-INDEX-06-after2.png | PAGES-LOGIN-INDEX#7 | 06 点击「稍后再看」（体验账号一键登录） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-07-before.png | PAGES-LOGIN-INDEX#8 | 07 点击「手机号登录」按钮（open-type=getPhoneNumber，回调失败路径 = MP-R1-LOGIN… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-07-after.png | PAGES-LOGIN-INDEX#8 | 07 点击「手机号登录」按钮（open-type=getPhoneNumber，回调失败路径 = MP-R1-LOGIN… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-08-before.png | PAGES-LOGIN-INDEX#9 | 08 表单视图空表单点击「登 录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-08b-after.png | PAGES-LOGIN-INDEX#9 | 08 表单视图空表单点击「登 录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-09-before.png | PAGES-LOGIN-INDEX#10 | 09 手机号输入框输入 13800138000 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-09-after.png | PAGES-LOGIN-INDEX#10 | 09 手机号输入框输入 13800138000 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-10-before.png | PAGES-LOGIN-INDEX#11 | 10 手机号输入框清空 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-10-after.png | PAGES-LOGIN-INDEX#11 | 10 手机号输入框清空 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-11-before.png | PAGES-LOGIN-INDEX#12 | 11 手机号输入超长文本（20 位数字） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-11-after.png | PAGES-LOGIN-INDEX#12 | 11 手机号输入超长文本（20 位数字） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-12-before.png | PAGES-LOGIN-INDEX#13 | 12 手机号输入特殊字符 abc!@#123 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-12-after.png | PAGES-LOGIN-INDEX#13 | 12 手机号输入特殊字符 abc!@#123 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-13-before.png | PAGES-LOGIN-INDEX#14 | 13 密码框输入 abc123 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-13-after.png | PAGES-LOGIN-INDEX#14 | 13 密码框输入 abc123 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-14b-before.png | PAGES-LOGIN-INDEX#15 | 14b 手机号 13800138000 + 密码 abc123 点击「登 录」（合法格式，后端无此账号） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-14b-after.png | PAGES-LOGIN-INDEX#15 | 14b 手机号 13800138000 + 密码 abc123 点击「登 录」（合法格式，后端无此账号） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-15b-before.png | PAGES-LOGIN-INDEX#16 | 15 2000ms 防抖窗口内快速连点「登 录」4 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-15b-after.png | PAGES-LOGIN-INDEX#16 | 15 2000ms 防抖窗口内快速连点「登 录」4 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-16-before.png | PAGES-LOGIN-INDEX#17 | 16 点击「没有账号？去注册」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-16b-after.png | PAGES-LOGIN-INDEX#17 | 16 点击「没有账号？去注册」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-17-before.png | PAGES-LOGIN-INDEX#18 | 17 点击「返回微信登录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-17-after.png | PAGES-LOGIN-INDEX#18 | 17 点击「返回微信登录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-18-before.png | PAGES-LOGIN-INDEX#19 | 18 点击《用户协议》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-01-back1.png | PAGES-LOGIN-INDEX#19 | 18 点击《用户协议》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-19b-before.png | PAGES-LOGIN-INDEX#20 | 19 点击《隐私政策》链接 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-19b-after.png | PAGES-LOGIN-INDEX#20 | 19 点击《隐私政策》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-20-before.png | PAGES-LOGIN-INDEX#21 | 20 点击 DEV「演示模式进入」入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-20-after.png | PAGES-LOGIN-INDEX#21 | 20 点击 DEV「演示模式进入」入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-21-before.png | PAGES-LOGIN-INDEX#22 | 21 页面滚动到底再回顶 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-21-after-bottom.png | PAGES-LOGIN-INDEX#22 | 21 页面滚动到底再回顶 | ✅ 符合 | — | ✓ |
| PAGES-LOGIN-INDEX-21-after-top.png | PAGES-LOGIN-INDEX#22 | 21 页面滚动到底再回顶 | ✅ 符合 | — | ✓ |

### PAGES-MESSAGES-INDEX.json（引用截图 51 个，存在 51，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-01-before.png | PAGES-MESSAGES-INDEX#1 | 01 打开页面（reLaunch ?dev-user=1，mock 登录） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-01-after.png | PAGES-MESSAGES-INDEX#1 | 01 打开页面（reLaunch ?dev-user=1，mock 登录） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-02-before.png | PAGES-MESSAGES-INDEX#2 | 02 TabBar 消息角标闭环核对（回归 MP-R2-MSG-006 遗留：custom-tab-bar 角标） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-02-after.png | PAGES-MESSAGES-INDEX#2 | 02 TabBar 消息角标闭环核对（回归 MP-R2-MSG-006 遗留：custom-tab-bar 角标） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-03-before.png | PAGES-MESSAGES-INDEX#3 | 03 点击搜索图标展开搜索栏 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-03-after.png | PAGES-MESSAGES-INDEX#3、PAGES-MESSAGES-INDEX#4 | 03 点击搜索图标展开搜索栏 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-04-after.png | PAGES-MESSAGES-INDEX#4、PAGES-MESSAGES-INDEX#5 | 04 搜索框输入「夏」过滤 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-05-after.png | PAGES-MESSAGES-INDEX#5、PAGES-MESSAGES-INDEX#6 | 05 搜索无结果关键词「不存在xyz」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-06-after.png | PAGES-MESSAGES-INDEX#6、PAGES-MESSAGES-INDEX#7 | 06 输入特殊字符 <>&"'%$# | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-07-after.png | PAGES-MESSAGES-INDEX#7、PAGES-MESSAGES-INDEX#8 | 07 输入 200 字超长文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-08-after.png | PAGES-MESSAGES-INDEX#8、PAGES-MESSAGES-INDEX#9 | 08 点击 × 清空搜索关键词 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-09-after.png | PAGES-MESSAGES-INDEX#9 | 09 再次点击搜索图标收起搜索栏 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-10-before.png | PAGES-MESSAGES-INDEX#10 | 10 点击「有人喜欢你」快捷卡（goLikes） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-10-after.png | PAGES-MESSAGES-INDEX#10 | 10 点击「有人喜欢你」快捷卡（goLikes） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-11-before.png | PAGES-MESSAGES-INDEX#11 | 11 从喜欢与访客页返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-11-after.png | PAGES-MESSAGES-INDEX#11 | 11 从喜欢与访客页返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-12-before.png | PAGES-MESSAGES-INDEX#12 | 12 点击寻觅助手卡（openAssistant） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-12-after.png | PAGES-MESSAGES-INDEX#12、PAGES-MESSAGES-INDEX#13 | 12 点击寻觅助手卡（openAssistant） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-13-after.png | PAGES-MESSAGES-INDEX#13 | 13 从官方号会话页返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-14-before.png | PAGES-MESSAGES-INDEX#14 | 14 点击最近聊天「夏言」行（openSession） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-14-after.png | PAGES-MESSAGES-INDEX#14 | 14 点击最近聊天「夏言」行（openSession） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-15-before.png | PAGES-MESSAGES-INDEX#15 | 15 从会话页返回（红点反弹回归） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-15-after.png | PAGES-MESSAGES-INDEX#15 | 15 从会话页返回（红点反弹回归） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-16-before.png | PAGES-MESSAGES-INDEX#16 | 16 长按「叶知秋」会话行（ActionSheet 弹出） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-16-after.png | PAGES-MESSAGES-INDEX#16 | 16 长按「叶知秋」会话行（ActionSheet 弹出） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-17-before.png | PAGES-MESSAGES-INDEX#17 | 17 长按菜单「标为未读」（叶知秋，tapIndex=1 注入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-17-after.png | PAGES-MESSAGES-INDEX#17 | 17 长按菜单「标为未读」（叶知秋，tapIndex=1 注入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-18-before.png | PAGES-MESSAGES-INDEX#18 | 18 长按菜单「置顶/取消置顶」（顾言，tapIndex=0 注入） | ❌ 偏差 | MP-R1-PAGES-MESSAGES-INDEX-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-18-after.png | PAGES-MESSAGES-INDEX#18 | 18 长按菜单「置顶/取消置顶」（顾言，tapIndex=0 注入） | ❌ 偏差 | MP-R1-PAGES-MESSAGES-INDEX-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-19-before.png | PAGES-MESSAGES-INDEX#19 | 19 长按菜单「免打扰」（顾言，tapIndex=2 注入） | ❌ 偏差 | MP-R1-PAGES-MESSAGES-INDEX-003 | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-19-after.png | PAGES-MESSAGES-INDEX#19 | 19 长按菜单「免打扰」（顾言，tapIndex=2 注入） | ❌ 偏差 | MP-R1-PAGES-MESSAGES-INDEX-003 | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-20-before.png | PAGES-MESSAGES-INDEX#20 | 20 长按菜单「恢复提醒」（顾言再次长按，tapIndex=2，label 应翻转为「恢复提醒」） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-20-after.png | PAGES-MESSAGES-INDEX#20 | 20 长按菜单「恢复提醒」（顾言再次长按，tapIndex=2，label 应翻转为「恢复提醒」） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-21-before.png | PAGES-MESSAGES-INDEX#21 | 21 长按菜单「删除会话」（匿名匹配·星河，tapIndex=3 + showModal 确认注入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-21-after.png | PAGES-MESSAGES-INDEX#21 | 21 长按菜单「删除会话」（匿名匹配·星河，tapIndex=3 + showModal 确认注入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-22-before.png | PAGES-MESSAGES-INDEX#22 | 22 快速连续点击寻觅助手卡 5 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-22-after.png | PAGES-MESSAGES-INDEX#22 | 22 快速连续点击寻觅助手卡 5 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-23-before.png | PAGES-MESSAGES-INDEX#23 | 23 重复进出页面 ×3（打开 1.2s 后立即切走） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-23-after.png | PAGES-MESSAGES-INDEX#23 | 23 重复进出页面 ×3（打开 1.2s 后立即切走） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-24-before.png | PAGES-MESSAGES-INDEX#24 | 24 下拉刷新（wx.startPullDownRefresh 触发 onPullDownRefresh） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-24-after.png | PAGES-MESSAGES-INDEX#24 | 24 下拉刷新（wx.startPullDownRefresh 触发 onPullDownRefresh） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-25-before.png | PAGES-MESSAGES-INDEX#25 | 25 滚动到底再回顶（滚动遮罩，回归 INDEP-004） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-25-scrolled.png | PAGES-MESSAGES-INDEX#25 | 25 滚动到底再回顶（滚动遮罩，回归 INDEP-004） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-26-before.png | PAGES-MESSAGES-INDEX#26 | 26 tabBar 切换「我的」↔「消息」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-26-after.png | PAGES-MESSAGES-INDEX#26 | 26 tabBar 切换「我的」↔「消息」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-27-before.png | PAGES-MESSAGES-INDEX#27 | 27 点击 header「+」图标 | ❌ 偏差 | MP-R1-PAGES-MESSAGES-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-27-after.png | PAGES-MESSAGES-INDEX#27 | 27 点击 header「+」图标 | ❌ 偏差 | MP-R1-PAGES-MESSAGES-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-28-before.png | PAGES-MESSAGES-INDEX#28 | 28 点击「正在等待回复」卡（goReply，首次执行被并行任务污染后紧凑重拍） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-28-after.png | PAGES-MESSAGES-INDEX#28 | 28 点击「正在等待回复」卡（goReply，首次执行被并行任务污染后紧凑重拍） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-29-before.png | PAGES-MESSAGES-INDEX#29 | 29 下拉刷新动画帧补拍（关联 OP24；含并行污染后 redo） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-29-after.png | PAGES-MESSAGES-INDEX#29 | 29 下拉刷新动画帧补拍（关联 OP24；含并行污染后 redo） | ⚠️ 无法验证 | — | ✓ |

### PAGES-NEARBY-INDEX.json（引用截图 81 个，存在 80，缺失 1）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-01-before.png | PAGES-NEARBY-INDEX#1 | A01 基线：注入身份A后 reLaunch 进入附近页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-01-after.png | PAGES-NEARBY-INDEX#1、PAGES-NEARBY-INDEX#43 | A01 基线：注入身份A后 reLaunch 进入附近页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-02-before.png | PAGES-NEARBY-INDEX#2 | A02 搜索框输入正常关键词「篮球」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-02-after.png | PAGES-NEARBY-INDEX#2 | A02 搜索框输入正常关键词「篮球」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-03-before.png | PAGES-NEARBY-INDEX#3 | A03 搜索框 confirm（键盘搜索键）提交「篮球」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-03-after.png | PAGES-NEARBY-INDEX#3 | A03 搜索框 confirm（键盘搜索键）提交「篮球」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-04-before.png | PAGES-NEARBY-INDEX#4 | A04 搜索框输入特殊字符+超长文本（177 字符，含 <script>alert(1)</script>/引号/emo… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-04-after.png | PAGES-NEARBY-INDEX#4 | A04 搜索框输入特殊字符+超长文本（177 字符，含 <script>alert(1)</script>/引号/emo… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-05-before.png | PAGES-NEARBY-INDEX#5 | A05 清空搜索框 + 空关键词 confirm | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-05-cleared.png | PAGES-NEARBY-INDEX#5 | A05 清空搜索框 + 空关键词 confirm | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-06-before.png | PAGES-NEARBY-INDEX#6 | A06 点击顶部「发动态」按钮 (.nearby-home__publish) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-06-after.png | PAGES-NEARBY-INDEX#6 | A06 点击顶部「发动态」按钮 (.nearby-home__publish) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-07-before.png | PAGES-NEARBY-INDEX#7 | A07 快速连续点击「发动态」×3（间隔约 150ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-07-after.png | PAGES-NEARBY-INDEX#7 | A07 快速连续点击「发动态」×3（间隔约 150ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-08-before.png | PAGES-NEARBY-INDEX#8 | A08 点击功能入口①「附近的人」 (.nearby-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-08-after.png | PAGES-NEARBY-INDEX#8 | A08 点击功能入口①「附近的人」 (.nearby-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-09-before.png | PAGES-NEARBY-INDEX#9 | A09 点击功能入口②「热门兴趣圈」 (.nearby-entry[1]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-09-after.png | PAGES-NEARBY-INDEX#9 | A09 点击功能入口②「热门兴趣圈」 (.nearby-entry[1]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-10-before.png | PAGES-NEARBY-INDEX#10 | A10 点击功能入口③「校园圈」 (.nearby-entry[2]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-10-after.png | PAGES-NEARBY-INDEX#10 | A10 点击功能入口③「校园圈」 (.nearby-entry[2]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-11-before.png | PAGES-NEARBY-INDEX#11 | A11 点击功能入口④「附近活动」 (.nearby-entry[3]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-11-after.png | PAGES-NEARBY-INDEX#11 | A11 点击功能入口④「附近活动」 (.nearby-entry[3]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-12-before.png | PAGES-NEARBY-INDEX#12 | A12 点击功能入口⑤「我的人脉」 (.nearby-entry[4]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-12-after.png | PAGES-NEARBY-INDEX#12 | A12 点击功能入口⑤「我的人脉」 (.nearby-entry[4]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-13b-before.png | PAGES-NEARBY-INDEX#13 | A13 点击「附近的人」分区行入口 (.people-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-13b-after.png | PAGES-NEARBY-INDEX#13 | A13 点击「附近的人」分区行入口 (.people-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-14-before.png | PAGES-NEARBY-INDEX#14 | A14 点击「同城的人」分区行入口 (.people-entry[1]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-14-after.png | PAGES-NEARBY-INDEX#14 | A14 点击「同城的人」分区行入口 (.people-entry[1]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-15-before.png | PAGES-NEARBY-INDEX#15 | A15 点击热门兴趣圈第1卡「摄影」 (.circle-mini[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-15-after.png | PAGES-NEARBY-INDEX#15 | A15 点击热门兴趣圈第1卡「摄影」 (.circle-mini[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-16-before.png | PAGES-NEARBY-INDEX#16 | A16 热门兴趣圈横向滑动到底（合成 touch 手势 swipe 8 步） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-16-after.png | PAGES-NEARBY-INDEX#16 | A16 热门兴趣圈横向滑动到底（合成 touch 手势 swipe 8 步） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-17-before.png | PAGES-NEARBY-INDEX#17 | A17 回归核对 MP-R1-NEARBY-005：热门兴趣圈第4卡是否被右缘裁切 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-17-after.png | PAGES-NEARBY-INDEX#17 | A17 回归核对 MP-R1-NEARBY-005：热门兴趣圈第4卡是否被右缘裁切 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-18-before.png | PAGES-NEARBY-INDEX#18 | A18 点击热门兴趣圈分区「全部」 (.nearby-section__more[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-18-after.png | PAGES-NEARBY-INDEX#18 | A18 点击热门兴趣圈分区「全部」 (.nearby-section__more[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-19-before.png | PAGES-NEARBY-INDEX#19 | A19 点击校园圈第1卡「北京大学」 (.campus-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-19-after.png | PAGES-NEARBY-INDEX#19 | A19 点击校园圈第1卡「北京大学」 (.campus-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-20-before.png | PAGES-NEARBY-INDEX#20 | A20 点击校园圈分区「全部」 (.nearby-section__more[1]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-20-after.png | PAGES-NEARBY-INDEX#20 | A20 点击校园圈分区「全部」 (.nearby-section__more[1]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-21-before.png | PAGES-NEARBY-INDEX#21 | A21 点击活动分区第1条 (.activity-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-21-after.png | PAGES-NEARBY-INDEX#21 | A21 点击活动分区第1条 (.activity-entry[0]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-22-before.png | PAGES-NEARBY-INDEX#22 | A22 点击活动分区「全部」 (.nearby-section__more[2]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-22-after.png | PAGES-NEARBY-INDEX#22 | A22 点击活动分区「全部」 (.nearby-section__more[2]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-23-before.png | PAGES-NEARBY-INDEX#23 | A23 点击附近动态 PostCard 整卡（open-detail） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-23-after.png | PAGES-NEARBY-INDEX#23 | A23 点击附近动态 PostCard 整卡（open-detail） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-24b-before.png | PAGES-NEARBY-INDEX#24 | A24 点击 PostCard 作者行 (.post-card__user，@catchtap open-author) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-24b-after1.png | PAGES-NEARBY-INDEX#24、PAGES-NEARBY-INDEX#41 | A24 点击 PostCard 作者行 (.post-card__user，@catchtap open-author) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-25-before.png | PAGES-NEARBY-INDEX#25 | A25 点击 PostCard 标签芯片 (.post-card__tag，@catchtap open-tag) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-25-after.png | PAGES-NEARBY-INDEX#25 | A25 点击 PostCard 标签芯片 (.post-card__tag，@catchtap open-tag) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-26-before.png | PAGES-NEARBY-INDEX#26 | A26 点击 PostCard「关注」芯片 (.follow-chip，@catchtap emit follow) | ❌ 偏差 | MP-R1-NEARBY-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-26-after.png | PAGES-NEARBY-INDEX#26 | A26 点击 PostCard「关注」芯片 (.follow-chip，@catchtap emit follow) | ❌ 偏差 | MP-R1-NEARBY-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-27b-before.png | PAGES-NEARBY-INDEX#27、PAGES-NEARBY-INDEX#42 | A27 点击 PostCard「点赞」按钮 (@catchtap handleLike) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-27b-after.png | PAGES-NEARBY-INDEX#27、PAGES-NEARBY-INDEX#42 | A27 点击 PostCard「点赞」按钮 (@catchtap handleLike) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-28-before.png | PAGES-NEARBY-INDEX#28 | A28 点击 PostCard「收藏」按钮 (@catchtap emit favorite) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-28-after.png | PAGES-NEARBY-INDEX#28 | A28 点击 PostCard「收藏」按钮 (@catchtap emit favorite) | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-29-before.png | PAGES-NEARBY-INDEX#29 | A29 点击附近动态分区「全部」 (.nearby-section__more[3]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-29-after.png | PAGES-NEARBY-INDEX#29 | A29 点击附近动态分区「全部」 (.nearby-section__more[3]) | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-30-before.png | PAGES-NEARBY-INDEX#30 | A30 页面滚动到底/回顶（合成 touch 纵向 swipe） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-30-top.png | PAGES-NEARBY-INDEX#30 | A30 页面滚动到底/回顶（合成 touch 纵向 swipe） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-31-before.png | PAGES-NEARBY-INDEX#31 | A31 下拉刷新（wx.startPullDownRefresh 原生触发） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-31-after.png | PAGES-NEARBY-INDEX#31 | A31 下拉刷新（wx.startPullDownRefresh 原生触发） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-32-before.png | PAGES-NEARBY-INDEX#32 | A32 重复进出 tab（home↔nearby switchTab ×2） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-32-after.png | PAGES-NEARBY-INDEX#32 | A32 重复进出 tab（home↔nearby switchTab ×2） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-33-before.png | PAGES-NEARBY-INDEX#33 | A33 页面打开立即离开（reLaunch nearby 后 0.8s 内 switchTab 离开） | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-33-after.png | PAGES-NEARBY-INDEX#33 | A33 页面打开立即离开（reLaunch nearby 后 0.8s 内 switchTab 离开） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-34-before.png | PAGES-NEARBY-INDEX#34 | B34 身份B（tmp_r11_guest.json 新号100159）注入后基线 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-34-after.png | PAGES-NEARBY-INDEX#34 | B34 身份B（tmp_r11_guest.json 新号100159）注入后基线 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-35-before.png | PAGES-NEARBY-INDEX#35 | B35 身份B 点击兴趣圈第2卡「旅行」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-35-after.png | PAGES-NEARBY-INDEX#35 | B35 身份B 点击兴趣圈第2卡「旅行」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-36-before.png | PAGES-NEARBY-INDEX#36 | B36 身份B 搜索 confirm「图书馆」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-36-after.png | PAGES-NEARBY-INDEX#36 | B36 身份B 搜索 confirm「图书馆」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-37-before.png | PAGES-NEARBY-INDEX#37 | C37 未登录态真实链路基线（removeStorage token + bootstrap） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-37-after.png | PAGES-NEARBY-INDEX#37 | C37 未登录态真实链路基线（removeStorage token + bootstrap） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-38b-before.png | PAGES-NEARBY-INDEX#38 | C38 未登录「去登录」按钮点击 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-38b-after.png | PAGES-NEARBY-INDEX#38、PAGES-NEARBY-INDEX#43 | C38 未登录「去登录」按钮点击 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-39-before.png | PAGES-NEARBY-INDEX#39 | C39 未登录态点击兴趣圈入口（公开内容不拦登录） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-39-after.png | PAGES-NEARBY-INDEX#39 | C39 未登录态点击兴趣圈入口（公开内容不拦登录） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-37b-before.png | PAGES-NEARBY-INDEX#40 | D-37b 未登录 UI 分支渲染（状态注入：userSession=null） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-37b-after.png | PAGES-NEARBY-INDEX#40 | D-37b 未登录 UI 分支渲染（状态注入：userSession=null） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-24b-after2.png | PAGES-NEARBY-INDEX#41 | D-24b 作者行点击受控复测×2 | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |

### PAGES-PROFILE-INDEX.json（引用截图 48 个，存在 48，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-00-base.png | PAGES-PROFILE-INDEX#1 | OP00 基线：登录态冷启动 reLaunch 直达「我的」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-01-before.png | PAGES-PROFILE-INDEX#2 | OP01 点击右上分享图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-01-after.png | PAGES-PROFILE-INDEX#2 | OP01 点击右上分享图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-02-before.png | PAGES-PROFILE-INDEX#3 | OP02 点击右上设置图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-02-dest.png | PAGES-PROFILE-INDEX#3 | OP02 点击右上设置图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-03-before.png | PAGES-PROFILE-INDEX#4 | OP03 点击「编辑资料」胶囊 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-03-back.png | PAGES-PROFILE-INDEX#4 | OP03 点击「编辑资料」胶囊 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-04-before.png | PAGES-PROFILE-INDEX#5 | OP04 点击头像（本人态 ActionSheet） | ❌ 偏差 | MP-R1-PROFILE-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-04-cli-capture.png | PAGES-PROFILE-INDEX#5 | OP04 点击头像（本人态 ActionSheet） | ❌ 偏差 | MP-R1-PROFILE-002 | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-05-before.png | PAGES-PROFILE-INDEX#6 | OP05 点击「资料完整度」卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-05-after.png | PAGES-PROFILE-INDEX#6 | OP05 点击「资料完整度」卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-06-before.png | PAGES-PROFILE-INDEX#7 | OP06 点击「我的互动」行1「喜欢我的人」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-06-dest.png | PAGES-PROFILE-INDEX#7 | OP06 点击「我的互动」行1「喜欢我的人」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-07-before.png | PAGES-PROFILE-INDEX#8 | OP07 点击「我的互动」行4「最近访客」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-07-after.png | PAGES-PROFILE-INDEX#8 | OP07 点击「我的互动」行4「最近访客」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-08-before.png | PAGES-PROFILE-INDEX#9 | OP08 点击顶部统计列4「访客」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-08-after.png | PAGES-PROFILE-INDEX#9 | OP08 点击顶部统计列4「访客」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-09-before.png | PAGES-PROFILE-INDEX#10 | OP09 点击「更多功能」格1「我的收藏」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-09-dest.png | PAGES-PROFILE-INDEX#10 | OP09 点击「更多功能」格1「我的收藏」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-10-before.png | PAGES-PROFILE-INDEX#11 | OP10 点击「更多功能」格2「谁看过我」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-10-after.png | PAGES-PROFILE-INDEX#11 | OP10 点击「更多功能」格2「谁看过我」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-11-before.png | PAGES-PROFILE-INDEX#12 | OP11 点击「更多功能」格3「恋爱相册」（MP-R7-PROFILE-005 回归） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-11-dest.png | PAGES-PROFILE-INDEX#12、PAGES-PROFILE-INDEX#14 | OP11 点击「更多功能」格3「恋爱相册」（MP-R7-PROFILE-005 回归） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-12-before.png | PAGES-PROFILE-INDEX#13 | OP12 点击「更多功能」格4「隐私设置」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-12-after.png | PAGES-PROFILE-INDEX#13 | OP12 点击「更多功能」格4「隐私设置」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-13-before.png | PAGES-PROFILE-INDEX#14 | OP13 点击「我的相册」缩略图（MP-R7-PROFILE-002/005 回归） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-14-before.png | PAGES-PROFILE-INDEX#15 | OP14 点击「我的帖子」卡片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-14-after.png | PAGES-PROFILE-INDEX#15 | OP14 点击「我的帖子」卡片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-15-before.png | PAGES-PROFILE-INDEX#16 | OP15 点击「添加日常」虚线卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-15-after.png | PAGES-PROFILE-INDEX#16 | OP15 点击「添加日常」虚线卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-16-before.png | PAGES-PROFILE-INDEX#17 | OP16 点击「我的故事」故事卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-16-empty.png | PAGES-PROFILE-INDEX#17 | OP16 点击「我的故事」故事卡 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-17-before.png | PAGES-PROFILE-INDEX#18 | OP17 点击右下角「发动态」FAB（touchstart+touchend 门控） | ✅ 符合 | MP-R1-PROFILE-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-17-back.png | PAGES-PROFILE-INDEX#18 | OP17 点击右下角「发动态」FAB（touchstart+touchend 门控） | ✅ 符合 | MP-R1-PROFILE-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-18-before.png | PAGES-PROFILE-INDEX#19 | OP18 快速连点右上「设置」图标 ×5 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-18-restored.png | PAGES-PROFILE-INDEX#19 | OP18 快速连点右上「设置」图标 ×5 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-19-before.png | PAGES-PROFILE-INDEX#20 | OP19 页面滚动到底再回顶 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-19-bottom.png | PAGES-PROFILE-INDEX#20 | OP19 页面滚动到底再回顶 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-20-before.png | PAGES-PROFILE-INDEX#21 | OP20 tabBar 切换：我的 → 消息 → 我的 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-20-back.png | PAGES-PROFILE-INDEX#21 | OP20 tabBar 切换：我的 → 消息 → 我的 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-21-enter2.png | PAGES-PROFILE-INDEX#22 | OP21 重复进出「我的收藏」×3（含进入后立即返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-21-back2.png | PAGES-PROFILE-INDEX#22 | OP21 重复进出「我的收藏」×3（含进入后立即返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-22-before.png | PAGES-PROFILE-INDEX#23 | OP22 他人主页态（userId=4001）+ 点击「打个招呼」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-22-after.png | PAGES-PROFILE-INDEX#23 | OP22 他人主页态（userId=4001）+ 点击「打个招呼」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-23-before.png | PAGES-PROFILE-INDEX#24 | OP23 游客态打开我的页 + 点击底部「登录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-23-after.png | PAGES-PROFILE-INDEX#24 | OP23 游客态打开我的页 + 点击底部「登录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-24-header.png | PAGES-PROFILE-INDEX#25 | OP24 头部视觉回归：右上图标胶囊避让 + 头像/相册图（MP-R3-PROFILE-001/R7-001/R7-00… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-25-guest-other.png | PAGES-PROFILE-INDEX#26 | OP25 游客态带 userId=4001 打开他人主页（游客门禁） | ✅ 符合 | — | ✓ |

### PAGES-REGISTER-INDEX.json（引用截图 77 个，存在 77，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-01-before.png | PAGES-REGISTER-INDEX#1 | reLaunch 进入注册页（初始加载） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-01-after.png | PAGES-REGISTER-INDEX#1 | reLaunch 进入注册页（初始加载） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-02-before.png | PAGES-REGISTER-INDEX#2 | 空表单点击「注册」（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-02-after.png | PAGES-REGISTER-INDEX#2 | 空表单点击「注册」（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-03-before.png | PAGES-REGISTER-INDEX#3 | 手机号正常输入 13812345678 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-03-after.png | PAGES-REGISTER-INDEX#3 | 手机号正常输入 13812345678 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-04-before.png | PAGES-REGISTER-INDEX#4 | 手机号超长输入 13812345678999123（17 位） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-04-after.png | PAGES-REGISTER-INDEX#4 | 手机号超长输入 13812345678999123（17 位） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-05-before.png | PAGES-REGISTER-INDEX#5 | 点击手机号清除图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-05-after.png | PAGES-REGISTER-INDEX#5 | 点击手机号清除图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-06-before.png | PAGES-REGISTER-INDEX#6 | 手机号为空时点击「获取验证码」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-06-after.png | PAGES-REGISTER-INDEX#6 | 手机号为空时点击「获取验证码」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-07-before.png | PAGES-REGISTER-INDEX#7 | 手机号输入字母/特殊字符 abc138wxy | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-07-after.png | PAGES-REGISTER-INDEX#7 | 手机号输入字母/特殊字符 abc138wxy | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-08-before.png | PAGES-REGISTER-INDEX#8 | 输入合法手机号后点击「获取验证码」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-08-after.png | PAGES-REGISTER-INDEX#8 | 输入合法手机号后点击「获取验证码」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-09-before.png | PAGES-REGISTER-INDEX#9 | 60s 倒计时内再次点击「获取验证码」（重复触发防护） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-09-after.png | PAGES-REGISTER-INDEX#9 | 60s 倒计时内再次点击「获取验证码」（重复触发防护） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-10-before.png | PAGES-REGISTER-INDEX#10 | 验证码输入含字母杂字符 12ab34cd（特殊字符） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-10-after.png | PAGES-REGISTER-INDEX#10 | 验证码输入含字母杂字符 12ab34cd（特殊字符） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-11-before.png | PAGES-REGISTER-INDEX#11 | 验证码补全输入 123456（mock 短信码回填） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-11-after.png | PAGES-REGISTER-INDEX#11 | 验证码补全输入 123456（mock 短信码回填） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-12-before.png | PAGES-REGISTER-INDEX#12 | 仅填手机号+验证码时点击「注册」（校验顺序推进） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-12-after.png | PAGES-REGISTER-INDEX#12 | 仅填手机号+验证码时点击「注册」（校验顺序推进） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-13-before.png | PAGES-REGISTER-INDEX#13 | 密码输入 abc12345（强度条出现） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-13-after.png | PAGES-REGISTER-INDEX#13 | 密码输入 abc12345（强度条出现） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-14-before.png | PAGES-REGISTER-INDEX#14 | 密码改为 Abcdef123!（强度升级） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-14-after.png | PAGES-REGISTER-INDEX#14 | 密码改为 Abcdef123!（强度升级） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-15-before.png | PAGES-REGISTER-INDEX#15 | 点击密码眼睛图标（密文⇄明文） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-15-after.png | PAGES-REGISTER-INDEX#15 | 点击密码眼睛图标（密文⇄明文） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-16-before.png | PAGES-REGISTER-INDEX#16 | 确认密码输入 Abc99999（与密码不一致） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-16-after.png | PAGES-REGISTER-INDEX#16 | 确认密码输入 Abc99999（与密码不一致） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-17-before.png | PAGES-REGISTER-INDEX#17 | 点击确认密码眼睛图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-17-after.png | PAGES-REGISTER-INDEX#17 | 点击确认密码眼睛图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-18-before.png | PAGES-REGISTER-INDEX#18 | 确认密码改回一致 Abcdef123! | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-18-after.png | PAGES-REGISTER-INDEX#18 | 确认密码改回一致 Abcdef123! | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-19-before.png | PAGES-REGISTER-INDEX#19 | 昵称输入 25 字超长文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-19-after.png | PAGES-REGISTER-INDEX#19 | 昵称输入 25 字超长文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-20-before.png | PAGES-REGISTER-INDEX#20 | 昵称输入特殊字符 <script>&"'（XSS 探测） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-20-after.png | PAGES-REGISTER-INDEX#20 | 昵称输入特殊字符 <script>&"'（XSS 探测） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-21-before.png | PAGES-REGISTER-INDEX#21 | 密码输入全角字符「１２３ａｂｃｄｅ」后点击「注册」（特殊字符校验） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-21-after.png | PAGES-REGISTER-INDEX#21 | 密码输入全角字符「１２３ａｂｃｄｅ」后点击「注册」（特殊字符校验） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-22-before.png | PAGES-REGISTER-INDEX#22 | 点击出生日期字段（打开原生日期 picker 弹层） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-22-after.png | PAGES-REGISTER-INDEX#22 | 点击出生日期字段（打开原生日期 picker 弹层） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-23-before.png | PAGES-REGISTER-INDEX#23 | 重填全部字段+picker change 回填生日+勾选协议（准备提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-23-after.png | PAGES-REGISTER-INDEX#23 | 重填全部字段+picker change 回填生日+勾选协议（准备提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-24-before.png | PAGES-REGISTER-INDEX#24 | 表单完整状态下快速连续点击「注册」×3（防重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-24-after.png | PAGES-REGISTER-INDEX#24 | 表单完整状态下快速连续点击「注册」×3（防重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-25-before.png | PAGES-REGISTER-INDEX#25 | 页面打开立即返回（navigateTo 进入后立即点左上返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-25-after.png | PAGES-REGISTER-INDEX#25 | 页面打开立即返回（navigateTo 进入后立即点左上返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-26-before.png | PAGES-REGISTER-INDEX#26 | 已注册手机号完整填表后点击「注册」（重复注册已存在账号） | ✅ 符合 | MP-R1-PAGES-REGISTER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-26-after.png | PAGES-REGISTER-INDEX#26 | 已注册手机号完整填表后点击「注册」（重复注册已存在账号） | ✅ 符合 | MP-R1-PAGES-REGISTER-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-27-before.png | PAGES-REGISTER-INDEX#27 | 点击「用这个手机号登录」次级出口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-27-after.png | PAGES-REGISTER-INDEX#27 | 点击「用这个手机号登录」次级出口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-28-before.png | PAGES-REGISTER-INDEX#28 | 点击协议勾选框（勾选） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-28-after.png | PAGES-REGISTER-INDEX#28 | 点击协议勾选框（勾选） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-29-before.png | PAGES-REGISTER-INDEX#29 | 点击《用户协议》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-29-after.png | PAGES-REGISTER-INDEX#29 | 点击《用户协议》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-30-before.png | PAGES-REGISTER-INDEX#30 | 从用户协议页返回注册页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-30-after.png | PAGES-REGISTER-INDEX#30 | 从用户协议页返回注册页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-31-before.png | PAGES-REGISTER-INDEX#31 | 点击《隐私政策》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-31-after.png | PAGES-REGISTER-INDEX#31 | 点击《隐私政策》链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-32-before.png | PAGES-REGISTER-INDEX#32 | 从隐私政策页返回注册页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-32-after.png | PAGES-REGISTER-INDEX#32 | 从隐私政策页返回注册页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-33-before.png | PAGES-REGISTER-INDEX#33 | 再次点击协议勾选框（取消勾选） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-33-after.png | PAGES-REGISTER-INDEX#33 | 再次点击协议勾选框（取消勾选） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-34-before.png | PAGES-REGISTER-INDEX#34 | 点击底部「去登录」链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-34-after.png | PAGES-REGISTER-INDEX#34 | 点击底部「去登录」链接 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-35-before.png | PAGES-REGISTER-INDEX#35 | 点击左上角返回按钮（单页栈 reLaunch 分支） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-35-after.png | PAGES-REGISTER-INDEX#35 | 点击左上角返回按钮（单页栈 reLaunch 分支） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-36-before.png | PAGES-REGISTER-INDEX#36 | 重复进出注册页 ×3（navigateTo/navigateBack 循环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-36-after.png | PAGES-REGISTER-INDEX#36 | 重复进出注册页 ×3（navigateTo/navigateBack 循环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-37-before.png | PAGES-REGISTER-INDEX#37 | 滚动到页面底部（pageScrollTo 9999） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-37-after.png | PAGES-REGISTER-INDEX#37 | 滚动到页面底部（pageScrollTo 9999） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-38-before.png | PAGES-REGISTER-INDEX#38 | 滚动回页面顶部（pageScrollTo 0） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-38-after.png | PAGES-REGISTER-INDEX#38、PAGES-REGISTER-INDEX#39 | 滚动回页面顶部（pageScrollTo 0） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-B6-closed-after.png | PAGES-REGISTER-INDEX#39 | B6 分支：后台关闭注册（register_open=false）后进入注册页 | ✅ 符合 | — | ✓ |

### PAGES-REGISTER-SUCCESS.json（引用截图 24 个，存在 24，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-01-before.png | PAGES-REGISTER-SUCCESS#1 | OP1 带参打开 reLaunch /pages/register/success?phone=13888888888 | ✅ 符合 | MP-R1-PAGES-REGISTER-SUCCESS-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-01-after.png | PAGES-REGISTER-SUCCESS#1 | OP1 带参打开 reLaunch /pages/register/success?phone=13888888888 | ✅ 符合 | MP-R1-PAGES-REGISTER-SUCCESS-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-02-before.png | PAGES-REGISTER-SUCCESS#2 | OP2 点击主按钮「完善我的资料 →」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-02-after.png | PAGES-REGISTER-SUCCESS#2 | OP2 点击主按钮「完善我的资料 →」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-03-before.png | PAGES-REGISTER-SUCCESS#3 | OP3 自资料页 navigateBack 返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-03-after.png | PAGES-REGISTER-SUCCESS#3 | OP3 自资料页 navigateBack 返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-04-before.png | PAGES-REGISTER-SUCCESS#4 | OP4 点击次级出口「稍后再说，先随便逛逛」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-A04b-repro.png | PAGES-REGISTER-SUCCESS#4 | OP4 点击次级出口「稍后再说，先随便逛逛」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-05-before.png | PAGES-REGISTER-SUCCESS#5 | OP5 无参打开 reLaunch /pages/register/success | ✅ 符合 | MP-R1-PAGES-REGISTER-SUCCESS-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-05-after.png | PAGES-REGISTER-SUCCESS#5 | OP5 无参打开 reLaunch /pages/register/success | ✅ 符合 | MP-R1-PAGES-REGISTER-SUCCESS-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-06-before.png | PAGES-REGISTER-SUCCESS#6 | OP6 快速连续点击主按钮 ×3（重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-06-after.png | PAGES-REGISTER-SUCCESS#6 | OP6 快速连续点击主按钮 ×3（重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-07-step1.png | PAGES-REGISTER-SUCCESS#7 | OP7 连点压栈后逐层 navigateBack 回退链 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-07-after-final.png | PAGES-REGISTER-SUCCESS#7 | OP7 连点压栈后逐层 navigateBack 回退链 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-08-before.png | PAGES-REGISTER-SUCCESS#8 | OP8 页面打开后立即 navigateBack | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-08-after.png | PAGES-REGISTER-SUCCESS#8 | OP8 页面打开后立即 navigateBack | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-09-before.png | PAGES-REGISTER-SUCCESS#9 | OP9 重复进出页面 ×2 轮（reLaunch→navigateTo 资料页→返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-09-after.png | PAGES-REGISTER-SUCCESS#9 | OP9 重复进出页面 ×2 轮（reLaunch→navigateTo 资料页→返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-10-before.png | PAGES-REGISTER-SUCCESS#10 | OP10 滚动到底/到顶（可滚动性检查） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-10-after.png | PAGES-REGISTER-SUCCESS#10 | OP10 滚动到底/到顶（可滚动性检查） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-11-after.png | PAGES-REGISTER-SUCCESS#11 | OP11 输入框存在性（输入类操作适用性） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-12-after.png | PAGES-REGISTER-SUCCESS#12 | OP12 弹窗/Toast/下拉刷新适用性 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-13-before.png | PAGES-REGISTER-SUCCESS#13 | OP13 身份B（游客/新号 boot）带 phone=13999999999 打开 | ✅ 符合 | MP-R1-PAGES-REGISTER-SUCCESS-001 | ✓ |
| reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-13-after.png | PAGES-REGISTER-SUCCESS#13 | OP13 身份B（游客/新号 boot）带 phone=13999999999 打开 | ✅ 符合 | MP-R1-PAGES-REGISTER-SUCCESS-001 | ✓ |

### SUBPACKAGES-CAMPUS-CAMPUS-HUB.json（引用截图 41 个，存在 41，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-00-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#1 | 打开页面（discover 为基底 navigateTo 进入，带返回栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-00-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#1 | 打开页面（discover 为基底 navigateTo 进入，带返回栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-01-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#2 | 点击左上角返回按钮 .campus-hub__back（hub.vue:132 → goBack → uni.navig… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-01-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#2 | 点击左上角返回按钮 .campus-hub__back（hub.vue:132 → goBack → uni.navig… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-02-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#3 | 回归 MP-R4-CAMPUS-001：header「去认证」按钮 vs 微信胶囊遮挡实测（getMenuButtonB… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-02-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#3 | 回归 MP-R4-CAMPUS-001：header「去认证」按钮 vs 微信胶囊遮挡实测（getMenuButtonB… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-03-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#4 | 点击 Tab「我加入的」（hub.vue:203 activeTab=joined） | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-03-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#4 | 点击 Tab「我加入的」（hub.vue:203 activeTab=joined） | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-04-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#5 | 点击 Tab「推荐圈子」切回（hub.vue:213 activeTab=recommend） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-04-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#5 | 点击 Tab「推荐圈子」切回（hub.vue:213 activeTab=recommend） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-05-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#6 | 回归 R10-P2-007：长校名完整显示 + 统计数字格式统一（提取全部卡片校名与统计文案） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-06-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#7 | 搜索框输入「大学」（v-model searchKeyword → filteredSchools 过滤 @hub.vu… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-06-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#7、SUBPACKAGES-CAMPUS-CAMPUS-HUB#8 | 搜索框输入「大学」（v-model searchKeyword → filteredSchools 过滤 @hub.vu… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-07-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#8 | 搜索框改输入「北京」（推荐 Tab 下北京大学不属于推荐列表） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-08-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#9 | 点击 × 清除按钮（hub.vue:194 searchKeyword=''） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-08-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#9 | 点击 × 清除按钮（hub.vue:194 searchKeyword=''） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-09-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#10 | 输入特殊字符+超长文本：<script>alert(1)</script>'"`&%;(){}[]！@#￥%……&*——… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-09-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#10 | 输入特殊字符+超长文本：<script>alert(1)</script>'"`&%;(){}[]！@#￥%……&*——… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-10-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#11 | 点击推荐列表第 2 张「中国人民大学」卡片（hub.vue:233 goSchool → campus/index?sc… | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-10-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#11 | 点击推荐列表第 2 张「中国人民大学」卡片（hub.vue:233 goSchool → campus/index?sc… | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-11-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#12 | 点击推荐列表第 1 张卡片「申请加入」CTA 按钮（.campus-school-card__cta，无独立 handl… | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-11-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#12 | 点击推荐列表第 1 张卡片「申请加入」CTA 按钮（.campus-school-card__cta，无独立 handl… | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-12-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#13 | 点击 header「去认证」按钮（hub.vue:146 goCertification → ROUTES.CAMPUS… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-12-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#13 | 点击 header「去认证」按钮（hub.vue:146 goCertification → ROUTES.CAMPUS… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-13-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#14 | 点击引导卡「去认证」按钮（hub.vue:171 goCertification；未认证 → 文案「去认证」而非「查看进… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-13-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#14 | 点击引导卡「去认证」按钮（hub.vue:171 goCertification；未认证 → 文案「去认证」而非「查看进… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-14-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#15 | 快速连续点击 3 次同一张卡片（间隔 150ms，防抖/重复跳转检查） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-14-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#15 | 快速连续点击 3 次同一张卡片（间隔 150ms，防抖/重复跳转检查） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-15-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#16 | 页面滚动到底部（推荐 Tab 10 张卡长列表，pageScrollTo 99999） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-15-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#16 | 页面滚动到底部（推荐 Tab 10 张卡长列表，pageScrollTo 99999） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-16-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#17 | 页面打开后立即返回（navigateTo 后 500ms 内 navigateBack，生命周期竞态检查） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-16-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#17、SUBPACKAGES-CAMPUS-CAMPUS-HUB#18 | 页面打开后立即返回（navigateTo 后 500ms 内 navigateBack，生命周期竞态检查） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-17-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#18 | 重复进出 hub ×3 次（navigateTo/navigateBack 循环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-18-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#19 | 点击底部「查看更多校园圈⌄」提示（hub.vue:280-283，代码无 @tap handler） | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-003 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-18-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#19 | 点击底部「查看更多校园圈⌄」提示（hub.vue:280-283，代码无 @tap handler） | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-003 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-20-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#20 | 身份B（游客/新号 100159 小新生）注入 token+bootstrap 后打开 hub | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-20-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#20 | 身份B（游客/新号 100159 小新生）注入 token+bootstrap 后打开 hub | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-21-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#21 | 身份B 点击「我加入的」Tab（交叉验证 issue -001 的身份无关性） | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-21-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#21 | 身份B 点击「我加入的」Tab（交叉验证 issue -001 的身份无关性） | ❌ 偏差 | MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-22-before.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#22 | 身份B 搜索「南京」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-22-after.png | SUBPACKAGES-CAMPUS-CAMPUS-HUB#22 | 身份B 搜索「南京」 | ✅ 符合 | — | ✓ |

### SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json（引用截图 95 个，存在 95，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| CHAT-CHAT-SESSION-INDEX-01-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#1 | 标准深链打开会话页 ?userId=10003（param-map 固化参数） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-01-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#1 | 标准深链打开会话页 ?userId=10003（param-map 固化参数） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-02-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#2 | 无参数深链打开会话页（回归 MP-R2-CHAT-001：深链参数区分） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-02-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#2 | 无参数深链打开会话页（回归 MP-R2-CHAT-001：深链参数区分） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-03-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#3 | 存量会话深链 ?sessionId=session-private-1（夏言） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-03-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#3 | 存量会话深链 ?sessionId=session-private-1（夏言） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-04-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#4 | conv- 业务键深链 ?sessionId=conv-a1b2c3d4-e5f6-0123456789abcdef（回… | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-04-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#4 | conv- 业务键深链 ?sessionId=conv-a1b2c3d4-e5f6-0123456789abcdef（回… | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-05-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#5 | 长按对方消息（「明天下午有空吗？」）弹出长按菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-05-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#5 | 长按对方消息（「明天下午有空吗？」）弹出长按菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-06-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#6 | 长按菜单点击「复制」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-06-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#6 | 长按菜单点击「复制」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-07-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#7 | 长按自己消息（「哈哈，我也觉得」）选择「引用」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-07-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#7 | 长按自己消息（「哈哈，我也觉得」）选择「引用」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-08-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#8 | 点击引用回复条取消引用 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-08-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#8 | 点击引用回复条取消引用 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-09-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#9 | 长按自己消息选择「转发」打开转发选择弹层 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-09-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#9 | 长按自己消息选择「转发」打开转发选择弹层 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-10-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#10 | 转发层点击第一个目标会话完成转发 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-001 | ✓ |
| CHAT-CHAT-SESSION-INDEX-10-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#10 | 转发层点击第一个目标会话完成转发 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-001 | ✓ |
| CHAT-CHAT-SESSION-INDEX-11-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#11 | 长按自己消息选择「删除」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-11-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#11 | 长按自己消息选择「删除」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-12-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#12 | 点击顶部「···」打开更多菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-12-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#12 | 点击顶部「···」打开更多菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-13-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#13 | 「···」菜单点击「消息免打扰」切换 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-13-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#13 | 「···」菜单点击「消息免打扰」切换 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-14-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#14 | 「···」菜单点击「拉黑」并在确认弹窗点确认（mockWxMethod showModal confirm=true） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-14-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#14 | 「···」菜单点击「拉黑」并在确认弹窗点确认（mockWxMethod showModal confirm=true） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-15-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#15 | 「···」菜单点击「举报」并选择第一个原因（mockWxMethod showActionSheet tapIndex=… | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-15-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#15 | 「···」菜单点击「举报」并选择第一个原因（mockWxMethod showActionSheet tapIndex=… | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-16-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#16 | 单击顶部头像（300ms 单击判定）弹出头像菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-16-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#16 | 单击顶部头像（300ms 单击判定）弹出头像菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-17-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#17 | 头像菜单点击「拍一拍」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-17-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#17 | 头像菜单点击「拍一拍」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-18-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#18 | 头像菜单点击「看主页」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-48-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#18、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#45 | 头像菜单点击「看主页」 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-19-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#19 | 草稿持久化：输入草稿→返回→重新进入同一会话 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-19-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#19 | 草稿持久化：输入草稿→返回→重新进入同一会话 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-20-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#20 | 输入框输入「你好呀，今晚一起去看展？」（session-private-2） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-20-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#20 | 输入框输入「你好呀，今晚一起去看展？」（session-private-2） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-21-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#21 | 点击发送按钮发送文本消息 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-21-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#21 | 点击发送按钮发送文本消息 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-22-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#22 | 观察 mock「对方正在输入」提示（发送成功后 1.5~3s 出现，持续 2~4s） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-45-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#22、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#46 | 观察 mock「对方正在输入」提示（发送成功后 1.5~3s 出现，持续 2~4s） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-23-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#23 | 空内容直接点发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-23-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#23 | 空内容直接点发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-24-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#24 | 输入纯空格后点发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-24-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#24 | 输入纯空格后点发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-25-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#25 | 输入超长文本（约 180 字）后发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-25-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#25 | 输入超长文本（约 180 字）后发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-26-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#26 | 输入特殊字符（HTML/引号/emoji）后发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-26-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#26 | 输入特殊字符（HTML/引号/emoji）后发送 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-27-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#27 | 快速连续点击发送按钮 ×3（重复提交压力） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-27-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#27 | 快速连续点击发送按钮 ×3（重复提交压力） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-28-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#28 | 点击表情按钮展开表情面板 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-28-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#28 | 点击表情按钮展开表情面板 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-29-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#29 | 点击表情面板第一个表情 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-29-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#29 | 点击表情面板第一个表情 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-30-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#30 | 再次点击表情按钮收起面板，并发送含表情的草稿 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-30-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#30 | 再次点击表情按钮收起面板，并发送含表情的草稿 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-31-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#31 | 点击「+」打开更多操作菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-31-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#31 | 点击「+」打开更多操作菜单 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-32-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#32 | 「+」菜单点击「图片」，mockWxMethod chooseImage 返回 1 张本地图 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-32-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#32 | 「+」菜单点击「图片」，mockWxMethod chooseImage 返回 1 张本地图 | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-33-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#33 | 消息区上拉（手指下滑）滚动到顶触发 scrolltoupper（mock 会话 messageHasMore=false… | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-33-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#33 | 消息区上拉（手指下滑）滚动到顶触发 scrolltoupper（mock 会话 messageHasMore=false… | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-34-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#34 | 浏览历史（未贴底）时注入新消息 → 「有新消息」提示条出现 | ⚠️ 无法验证 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-34-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#34 | 浏览历史（未贴底）时注入新消息 → 「有新消息」提示条出现 | ⚠️ 无法验证 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-35-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#35 | 打开临时匿名会话 ?sessionId=session-temp-1 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-35-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#35 | 打开临时匿名会话 ?sessionId=session-temp-1 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-36-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#36 | 临时会话长按自己的消息（「你好！」） | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-36-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#36 | 临时会话长按自己的消息（「你好！」） | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-37-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#37 | 点击「撤回」撤回自己的临时会话消息 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-37-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#37 | 点击「撤回」撤回自己的临时会话消息 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-38-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#38 | 点击「同意交换联系方式」 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-38-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#38 | 点击「同意交换联系方式」 | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-39-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#39 | 点击「结束会话」并在确认弹窗点「取消」（mockWxMethod showModal confirm=false） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-39-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#39 | 点击「结束会话」并在确认弹窗点「取消」（mockWxMethod showModal confirm=false） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-40-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#40 | 点击「结束会话」并在确认弹窗点「确认」（mockWxMethod showModal confirm=true） | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-40-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#40 | 点击「结束会话」并在确认弹窗点「确认」（mockWxMethod showModal confirm=true） | ❌ 偏差 | MP-R1-CHAT-CHAT-SESSION-INDEX-002 | ✓ |
| CHAT-CHAT-SESSION-INDEX-41-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#41 | 页面打开后立即返回（~250ms 内 navigateBack） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-41-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#41 | 页面打开后立即返回（~250ms 内 navigateBack） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-42-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#42 | 重复进出会话 ×3（session-private-3） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-42-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#42 | 重复进出会话 ×3（session-private-3） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-43-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#43 | 点击破冰话题 chip（BreakQuestion，fresh ?userId=10005） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-49-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#43、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#48 | 点击破冰话题 chip（BreakQuestion，fresh ?userId=10005） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-44-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#44 | 点击首条破冰提示快捷按钮（MatchGreetingTip，fresh ?userId=10006） | ✅ 符合 | — | ✓ |
| CHAT-CHAT-SESSION-INDEX-44-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#44 | 点击首条破冰提示快捷按钮（MatchGreetingTip，fresh ?userId=10006） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-48-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#45 | 头像菜单「看主页」→ 跳转对方主页（重测，跳转后 4s 轮询） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-45-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#46 | 发送后 1.2~3.5s 内紧密轮询「对方正在输入」提示（private-2） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-46-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#47 | scroll-view 滚到顶触发 onScrollToUpper（messageHasMore=false 守卫） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-46-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#47 | scroll-view 滚到顶触发 onScrollToUpper（messageHasMore=false 守卫） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-49-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#48 | 点击「推荐开场」卡片（BreakQuestion opener，fresh ?userId=10007） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-47b-before.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#49 | 47b 重试：两段式 setData 滚动制造未贴底状态后注入新消息（「有新消息」提示条） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/CHAT-CHAT-SESSION-INDEX-47b-after.png | SUBPACKAGES-CHAT-CHAT-SESSION-INDEX#49 | 47b 重试：两段式 setData 滚动制造未贴底状态后注入新消息（「有新消息」提示条） | ⚠️ 无法验证 | — | ✓ |

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json（引用截图 23 个，存在 22，缺失 1）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP01-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#1 | OP01 初次进入渲染核验（reLaunch ?dev-preview=1，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP01-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#1 | OP01 初次进入渲染核验（reLaunch ?dev-preview=1，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP02-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#2 | OP02 回归 MP-R3-MSUCCESS-001/002：nav 状态栏/胶囊避让数值核验 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP02-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#2 | OP02 回归 MP-R3-MSUCCESS-001/002：nav 状态栏/胶囊避让数值核验 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP03b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#3、SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#6、SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#7、SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#8 等5处 | OP03 点击右上相机/截图钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP03b-after1-toast-r3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#3 | OP03 点击右上相机/截图钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP04b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#4 | OP04 点击右上 ··· 钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP04b-after1-toast-r4.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#4 | OP04 点击右上 ··· 钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP05b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#5 | OP05 点击主体「分享喜悦」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP05b-after2-gone.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#5 | OP05 点击主体「分享喜悦」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP06b-after2.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#6 | OP06 点击「立即聊天」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP07b-after-r3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#7 | OP07 点击「继续探索」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP08b-after-r3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#8 | OP08 单页栈点左上返回 ‹（reLaunch 进入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP09b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#9、SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#14 | OP09 双层栈点左上返回 ‹（寻觅 navigateTo 进入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP09-mid-in.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#9 | OP09 双层栈点左上返回 ‹（寻觅 navigateTo 进入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP10b-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#10 | OP10 快速连续点击「立即聊天」×5（间隔约 150ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP11b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#11 | OP11 userId 参数直达（mock 用户 4008，先 reset match store 清 matchedU… | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP11b-after-r3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#11 | OP11 userId 参数直达（mock 用户 4008，先 reset match store 清 matchedU… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP12b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#12 | OP12 userId 参数直达（不存在的 userId=no-such-user-xyz） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP12b-after-r3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#12 | OP12 userId 参数直达（不存在的 userId=no-such-user-xyz） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP13b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#13 | OP13 重复进出页面 ×3（寻觅 navigateTo 进 → navigateBack 出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP13b-round1-out-r3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#13、SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#14 | OP13 重复进出页面 ×3（寻觅 navigateTo 进 → navigateBack 出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP15b-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS#15 | OP15 滚动核验（到底/到顶） | ✅ 符合 | — | ✓ |

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json（引用截图 32 个，存在 32，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-live1.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-live2.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-live3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-live4.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP01D-live5.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#1 | OP01 真实链路进入（beginCheck+navigateTo）→ 匹配动画自然完成 → idle 出口 | ❌ 偏差 | MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP02D-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#2 | OP02 「跳过」在动画未播完时点击（like 链路，快进动画） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP02D-live1.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#2 | OP02 「跳过」在动画未播完时点击（like 链路，快进动画） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP03-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#3 | OP03 左上返回箭头（dev-preview=1 reLaunch 进入，单页栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP03-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#3 | OP03 左上返回箭头（dev-preview=1 reLaunch 进入，单页栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP04-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#4 | OP04 「跳过」在动画已播完后点击（dev-preview=1，保留返回语义） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP04-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#4 | OP04 「跳过」在动画已播完后点击（dev-preview=1，保留返回语义） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP05-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#5 | OP05 无上下文直达（reLaunch 无参数）——回归 MP-R3-MATCHING-001 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP05-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#5 | OP05 无上下文直达（reLaunch 无参数）——回归 MP-R3-MATCHING-001 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP06-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#6 | OP06 dev-preview=1 进入（QA 预览停留） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP06-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#6 | OP06 dev-preview=1 进入（QA 预览停留） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP07-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#7 | OP07 快速连续点击「跳过」×5（间隔约 120ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP07-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#7 | OP07 快速连续点击「跳过」×5（间隔约 120ms） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP08-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#8 | OP08 preview=1 预览模式重复进出 ×3（navigateTo→停留→navigateBack） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP08-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#8 | OP08 preview=1 预览模式重复进出 ×3（navigateTo→停留→navigateBack） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP08-round1-in.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#8 | OP08 preview=1 预览模式重复进出 ×3（navigateTo→停留→navigateBack） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP08-round2-in.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#8 | OP08 preview=1 预览模式重复进出 ×3（navigateTo→停留→navigateBack） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP08-round3-in.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#8 | OP08 preview=1 预览模式重复进出 ×3（navigateTo→停留→navigateBack） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP09C-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#9 | OP09 matched 出口（monkey-patch swipeRight 使 runMatchCheck 自然返回… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP09C-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#9 | OP09 matched 出口（monkey-patch swipeRight 使 runMatchCheck 自然返回… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP10D-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#10 | OP10 failed 出口：URL 直达 cardId 不存在（reLaunch ?cardId=no-such-ca… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP10D-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#10 | OP10 failed 出口：URL 直达 cardId 不存在（reLaunch ?cardId=no-such-ca… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP10D-live1.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#10 | OP10 failed 出口：URL 直达 cardId 不存在（reLaunch ?cardId=no-such-ca… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP10D-live3.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#10 | OP10 failed 出口：URL 直达 cardId 不存在（reLaunch ?cardId=no-such-ca… | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP11-before.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#11 | OP11 页面打开后立即点左上返回（<1s，栈内 navigateBack） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-OP11-after.png | SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING#11 | OP11 页面打开后立即点左上返回（<1s，栈内 navigateBack） | ✅ 符合 | — | ✓ |

### SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json（引用截图 76 个，存在 76，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-01-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#1 | OP01 打开页面（village/index → navigateTo publish） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-01-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#1 | OP01 打开页面（village/index → navigateTo publish） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-02-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#2 | OP02 点击「发布到」卡片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-02-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#2 | OP02 点击「发布到」卡片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-03-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#3 | OP03 弹层点击「校园圈」选项 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-03-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#3 | OP03 弹层点击「校园圈」选项 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-04-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#4 | OP04 重开弹层点击「个人动态」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-04-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#4 | OP04 重开弹层点击「个人动态」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-05-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#5 | OP05 重开弹层点击第一个已加入兴趣圈子（音乐） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-05-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#5 | OP05 重开弹层点击第一个已加入兴趣圈子（音乐） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-06-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#6 | OP06 弹层打开后 tap 弹层容器 → 再点卡片 toggle | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-06-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#6 | OP06 弹层打开后 tap 弹层容器 → 再点卡片 toggle | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-07-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#7 | OP07 textarea 输入「今天天气真好」（6字） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-07-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#7 | OP07 textarea 输入「今天天气真好」（6字） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-08-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#8 | OP08 输入特殊字符（HTML 标签/引号/反斜杠/emoji/#标签） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-08-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#8 | OP08 输入特殊字符（HTML 标签/引号/反斜杠/emoji/#标签） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-09-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#9 | OP09 输入 1200 字超长文本 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-09-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#9 | OP09 输入 1200 字超长文本 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-10-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#10 | OP10 general 目标下输入 600 字（页面允许 ≤1000）后点「发布」 | ❌ 偏差 | MP-R1-PUB-016 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-10-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#10 | OP10 general 目标下输入 600 字（页面允许 ≤1000）后点「发布」 | ❌ 偏差 | MP-R1-PUB-016 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-11-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#11 | OP11 清空 textarea | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-11-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#11 | OP11 清空 textarea | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-12-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#12 | OP12 空内容点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-12-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#12 | OP12 空内容点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-13-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#13 | OP13 输入 3 字「你好呀」点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-13-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#13 | OP13 输入 3 字「你好呀」点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-14-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#14 | OP14 输入正文含 #周末去哪，等 500ms 防抖后查草稿快照（回归 INDEP-001） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-14-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#14 | OP14 输入正文含 #周末去哪，等 500ms 防抖后查草稿快照（回归 INDEP-001） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-15-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#15 | OP15 合法内容（≥5字）点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-15-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#15 | OP15 合法内容（≥5字）点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-16-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#16 | OP16 点「添加话题」行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-16-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#16 | OP16 点「添加话题」行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-17-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#17 | OP17 再点「添加话题」行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-17-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#17 | OP17 再点「添加话题」行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-18-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#18 | OP18 快速连点「添加话题」6 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-18-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#18 | OP18 快速连点「添加话题」6 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-19-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#19 | OP19 点「提及好友」行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-19-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#19 | OP19 点「提及好友」行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-20-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#20 | OP20 点「谁可以看」两次（general 目标） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-20-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#20 | OP20 点「谁可以看」两次（general 目标） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-21-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#21 | OP21 点「添加位置」行（位置固定当前城市，无 tap 处理） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-21-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#21 | OP21 点「添加位置」行（位置固定当前城市，无 tap 处理） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-22-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#22 | OP22 点发帖小贴士右上角关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-22-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#22 | OP22 点发帖小贴士右上角关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-23-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#23 | OP23 有内容（10/1000，截图 23-before 实锤）时点左上角 X | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-23-modal.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#23 | OP23 有内容（10/1000，截图 23-before 实锤）时点左上角 X | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-24-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#24 | OP24 带草稿重进页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-24-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#24 | OP24 带草稿重进页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-25-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#25 | OP25 X 弹窗选「保留」（mockWxMethod showModal confirm=true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-25-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#25 | OP25 X 弹窗选「保留」（mockWxMethod showModal confirm=true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-26-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#26 | OP26 X 弹窗选「放弃」（mockWxMethod showModal confirm=false） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-26-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#26 | OP26 X 弹窗选「放弃」（mockWxMethod showModal confirm=false） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-27-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#27 | OP27 无内容时点 X | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-27-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#27 | OP27 无内容时点 X | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-28-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#28 | OP28 页面打开后立即（500ms 内）点 X 返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-28-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#28 | OP28 页面打开后立即（500ms 内）点 X 返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-29-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#29 | OP29 重复进出页面 ×3（navigateTo → back 循环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-29-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#29 | OP29 重复进出页面 ×3（navigateTo → back 循环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-30-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#30 | OP30 点「＋」选图（mockWxMethod chooseImage 返回 1 张 static 图） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-30-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#30 | OP30 点「＋」选图（mockWxMethod chooseImage 返回 1 张 static 图） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-31-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#31 | OP31 点图片右上删除按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-31-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#31 | OP31 点图片右上删除按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-32-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#32 | OP32 mock 一次选 9 张图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-32-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#32 | OP32 mock 一次选 9 张图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-33-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#33 | OP33 快速连点「发布」2 次（createPost 包装 300ms 延迟模拟网络耗时） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-33-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#33 | OP33 快速连点「发布」2 次（createPost 包装 300ms 延迟模拟网络耗时） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-34-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#34 | OP34 scroll-view 内容区上滑（合成 touch 滚动） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-34-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#34 | OP34 scroll-view 内容区上滑（合成 touch 滚动） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-01-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#35 | B1-01 身份B（游客/新号）打开页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-01-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#35 | B1-01 身份B（游客/新号）打开页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-02-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#36 | B1-02 身份B 打开弹层并选已加入圈子 | ❌ 偏差 | MP-R1-PUB-017 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-02-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#36 | B1-02 身份B 打开弹层并选已加入圈子 | ❌ 偏差 | MP-R1-PUB-017 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-03-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#37 | B1-03 身份B 输入合法内容点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-03-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#37 | B1-03 身份B 输入合法内容点「发布」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-04-before.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#38 | B1-04 身份B X 弹窗「保留」→ 重进恢复 → 「放弃」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-B1-04-after.png | SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH#38 | B1-04 身份B X 弹窗「保留」→ 重进恢复 → 「放弃」 | ✅ 符合 | — | ✓ |

### 次要13.json（引用截图 177 个，存在 177，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-01-before.png | 次要13#1 | 页面加载（reLaunch 直进，资料完整身份） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-01-after.png | 次要13#1 | 页面加载（reLaunch 直进，资料完整身份） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-02-before.png | 次要13#2 | 点击顶部搜索框 → 帖子搜索页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-02-after.png | 次要13#2 | 点击顶部搜索框 → 帖子搜索页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-03-before.png | 次要13#3 | 频道Tab切换「兴趣圈」→ 宫格+话题 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-03-after.png | 次要13#3 | 频道Tab切换「兴趣圈」→ 宫格+话题 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-04-before.png | 次要13#4 | 兴趣宫格第1项「学习」→ circles?category=study | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-04-after.png | 次要13#4 | 兴趣宫格第1项「学习」→ circles?category=study | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-05-before.png | 次要13#5 | 兴趣频道：热门话题主位点击 → 标签聚合页（HotTopicsSection goTagPosts） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-05-after.png | 次要13#5 | 兴趣频道：热门话题主位点击 → 标签聚合页（HotTopicsSection goTagPosts） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-06-before.png | 次要13#6 | 学校圈频道（已认证）→ 无认证门+每日一问+附近的人 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-06-after.png | 次要13#6 | 学校圈频道（已认证）→ 无认证门+每日一问+附近的人 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-07-before.png | 次要13#7 | 点击「附近的人」banner → discover | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-07-after.png | 次要13#7 | 点击「附近的人」banner → discover | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-08-before.png | 次要13#8 | 活动频道 → 活动卡片列表 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-08-after.png | 次要13#8 | 活动频道 → 活动卡片列表 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-09-before.png | 次要13#9 | 活动卡片「报名」→ toast + 按钮态翻转（trigger 命中 enroll） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-09-after.png | 次要13#9 | 活动卡片「报名」→ toast + 按钮态翻转（trigger 命中 enroll） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-10-before.png | 次要13#10 | 帖子卡片点赞（catchtap）→ 心形实心/计数+1 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-10-after.png | 次要13#10 | 帖子卡片点赞（catchtap）→ 心形实心/计数+1 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-11-before.png | 次要13#11 | 帖子卡片收藏（catchtap）→ 书签高亮/计数变化 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-11-after.png | 次要13#11 | 帖子卡片收藏（catchtap）→ 书签高亮/计数变化 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-12-before.png | 次要13#12 | 帖子卡片作者行（catchtap open-author）→ 他人主页 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-12-after.png | 次要13#12 | 帖子卡片作者行（catchtap open-author）→ 他人主页 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-13-before.png | 次要13#13 | 帖子卡片标签 chip（catchtap open-tag）→ tag-posts | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-13-after.png | 次要13#13 | 帖子卡片标签 chip（catchtap open-tag）→ tag-posts | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-14-before.png | 次要13#14 | 点击帖子卡片正文 → detail（栈入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-14-after.png | 次要13#14 | 点击帖子卡片正文 → detail（栈入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-15-before.png | 次要13#15 | 底部发帖输入条 → village/post | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-15-after.png | 次要13#15 | 底部发帖输入条 → village/post | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-16-before.png | 次要13#16 | 快速连点发帖输入条 3 次（防抖验证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-16-after.png | 次要13#16 | 快速连点发帖输入条 3 次（防抖验证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-17-before.png | 次要13#17 | 滚动到底 → 触发加载更多 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-17-after.png | 次要13#17 | 滚动到底 → 触发加载更多 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-18-before.png | 次要13#18 | 滚动>600 → 回到顶部按钮出现 → 点击回顶 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-18-after.png | 次要13#18 | 滚动>600 → 回到顶部按钮出现 → 点击回顶 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-19-before.png | 次要13#19 | 下拉刷新（refresherrefresh 事件） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-19-after.png | 次要13#19 | 下拉刷新（refresherrefresh 事件） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-20-before.png | 次要13#20 | 频道Tab「热度榜」→ 热度榜数据流 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-20-after.png | 次要13#20 | 频道Tab「热度榜」→ 热度榜数据流 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-21-before.png | 次要13#21 | 打开详情后立即返回（快速进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-21-after.png | 次要13#21 | 打开详情后立即返回（快速进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-01-before.png | 次要13#22 | 发帖页打开（header 布局/胶囊避让/发布禁用态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-01-after.png | 次要13#22 | 发帖页打开（header 布局/胶囊避让/发布禁用态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-02-before.png | 次要13#23 | 空内容点「发布」→ toast 拦截不跳转 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-02-after.png | 次要13#23 | 空内容点「发布」→ toast 拦截不跳转 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-03-before.png | 次要13#24 | 输入标题 → 计数 n/20 + 发布按钮激活 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-03-after.png | 次要13#24 | 输入标题 → 计数 n/20 + 发布按钮激活 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-04-before.png | 次要13#25 | 输入正文（正常文本）→ 字数计数 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-04-after.png | 次要13#25 | 输入正文（正常文本）→ 字数计数 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-05-before.png | 次要13#26 | 超长正文 1050 字（maxlength=1000 应截断） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-05-after.png | 次要13#26 | 超长正文 1050 字（maxlength=1000 应截断） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-06-before.png | 次要13#27 | 特殊字符正文 + 快速连点发布 3 次（防重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-06-after.png | 次要13#27 | 特殊字符正文 + 快速连点发布 3 次（防重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-07-before.png | 次要13#28 | 草稿回显（上轮发布后重进应为全新表单） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-07-after.png | 次要13#28 | 草稿回显（上轮发布后重进应为全新表单） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-08-before.png | 次要13#29 | 输入草稿标题 → X 关闭 → 保留草稿弹窗（原生 showModal 取证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-08-after.png | 次要13#29 | 输入草稿标题 → X 关闭 → 保留草稿弹窗（原生 showModal 取证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-09-before.png | 次要13#30 | 重进后草稿恢复验证（若上轮保留） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-09-after.png | 次要13#30 | 重进后草稿恢复验证（若上轮保留） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-10-before.png | 次要13#31 | 「发布到」选择器 → 选校园圈（可见范围联动） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-10-after.png | 次要13#31 | 「发布到」选择器 → 选校园圈（可见范围联动） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-11-before.png | 次要13#32 | 话题弹层：热门 chip 点选「校园日常」（弹层保持开启） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-11-after.png | 次要13#32 | 话题弹层：热门 chip 点选「校园日常」（弹层保持开启） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-12-before.png | 次要13#33 | 话题弹层：再次点选同 chip → 取消选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-12-after.png | 次要13#33 | 话题弹层：再次点选同 chip → 取消选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-13-before.png | 次要13#34 | 话题弹层遮罩关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-13-after.png | 次要13#34 | 话题弹层遮罩关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-14-before.png | 次要13#35 | 自定义话题「自动化话题」+ 添加 → chips 出现且弹层关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-14-after.png | 次要13#35 | 自定义话题「自动化话题」+ 添加 → chips 出现且弹层关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-15-before.png | 次要13#36 | 重复添加同话题 → toast「该话题已添加」（数量不变） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-15-after.png | 次要13#36 | 重复添加同话题 → toast「该话题已添加」（数量不变） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-16-before.png | 次要13#37 | 话题 chip × 删除 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-16-after.png | 次要13#37 | 话题 chip × 删除 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-17-before.png | 次要13#38 | 位置弹层：chip「校园·图书馆」选择回显 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-17-after.png | 次要13#38 | 位置弹层：chip「校园·图书馆」选择回显 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-18-before.png | 次要13#39 | 位置弹层：自定义「城南咖啡馆」+ 使用 → 覆盖 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-18-after.png | 次要13#39 | 位置弹层：自定义「城南咖啡馆」+ 使用 → 覆盖 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-19-before.png | 次要13#40 | 提及好友 → 正文末尾插入 @ + toast | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-19-after.png | 次要13#40 | 提及好友 → 正文末尾插入 @ + toast | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-20-before.png | 次要13#41 | 谁可以看弹层（general → 2 选项）：选「学校圈可见」→ meta 更新（修正重测） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-20-after.png | 次要13#41 | 谁可以看弹层（general → 2 选项）：选「学校圈可见」→ meta 更新（修正重测） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-21-before.png | 次要13#42 | 关闭发帖小贴士 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-21-after.png | 次要13#42 | 关闭发帖小贴士 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-22-before.png | 次要13#43 | 图片注入（mock chooseImage）→ 预览格与删除按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-22-after.png | 次要13#43 | 图片注入（mock chooseImage）→ 预览格与删除按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-23-before.png | 次要13#44 | 删除已注入图片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-23-after.png | 次要13#44 | 删除已注入图片 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-24-before.png | 次要13#45 | X 关闭（有内容）→ 草稿确认弹窗取证 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-24-after.png | 次要13#45 | X 关闭（有内容）→ 草稿确认弹窗取证 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-25-before.png | 次要13#46 | 超限正文（1050字）点发布 → toast 拦截（isOverLimit 守卫） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-POST-25-after.png | 次要13#46 | 超限正文（1050字）点发布 → toast 拦截（isOverLimit 守卫） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-01-before.png | 次要13#47 | 详情页打开（作者行/正文/互动栏/评论区/输入栏） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-01-after.png | 次要13#47 | 详情页打开（作者行/正文/互动栏/评论区/输入栏） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-02-before.png | 次要13#48 | ···菜单 → ActionSheet(复制)（mock tapIndex=0） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-02-after.png | 次要13#48 | ···菜单 → ActionSheet(复制)（mock tapIndex=0） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-03-before.png | 次要13#49 | 长按正文 → ActionSheet(举报) → 举报弹窗开→关 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-03-after.png | 次要13#49 | 长按正文 → ActionSheet(举报) → 举报弹窗开→关 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-04-before.png | 次要13#50 | 点赞 → 实心/计数+1 | ❌ 偏差 | MP-R1-DETAIL-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-04-after.png | 次要13#50 | 点赞 → 实心/计数+1 | ❌ 偏差 | MP-R1-DETAIL-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-05-before.png | 次要13#51 | 评论 icon → 聚焦评论输入框 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-05-after.png | 次要13#51 | 评论 icon → 聚焦评论输入框 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-06-before.png | 次要13#52 | 输入评论 + 发送 → 列表+1/输入清空 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-06-after.png | 次要13#52 | 输入评论 + 发送 → 列表+1/输入清空 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-07-before.png | 次要13#53 | 空评论点发送 → 拦截 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-07-after.png | 次要13#53 | 空评论点发送 → 拦截 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-08-before.png | 次要13#54 | 评论「回复」→ 提示条 + 楼中楼提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-08-after.png | 次要13#54 | 评论「回复」→ 提示条 + 楼中楼提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-09-before.png | 次要13#55 | 评论点赞 → 爱心高亮/计数+1 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-09-after.png | 次要13#55 | 评论点赞 → 爱心高亮/计数+1 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-10-before.png | 次要13#56 | 评论排序切换 最热↔最新 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-10-after.png | 次要13#56 | 评论排序切换 最热↔最新 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-11-before.png | 次要13#57 | 帖子图片点击 → 全屏查看层 → 点击关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-11-after.png | 次要13#57 | 帖子图片点击 → 全屏查看层 → 点击关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-12-before.png | 次要13#58 | 相似作者「关注」→ 文案翻转 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-12-after.png | 次要13#58 | 相似作者「关注」→ 文案翻转 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-13-before.png | 次要13#59 | 相似作者「私信」→ chat session | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-13-after.png | 次要13#59 | 相似作者「私信」→ chat session | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-14-before.png | 次要13#60 | 转发弹窗：输入附言 + 确认 → toast + 关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-14-after.png | 次要13#60 | 转发弹窗：输入附言 + 确认 → toast + 关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-15-before.png | 次要13#61 | 转发弹窗：再开 → X 关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-15-after.png | 次要13#61 | 转发弹窗：再开 → X 关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-16-before.png | 次要13#62 | 作者头像 → 他人主页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-16-after.png | 次要13#62 | 作者头像 → 他人主页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-17-before.png | 次要13#63 | 返回键 → 回村口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-17-after.png | 次要13#63 | 返回键 → 回村口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-18-before.png | 次要13#64 | own-post 回归（MP-R8-OWNPOST-001）：本人新帖详情无「+关注」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-18-after.png | 次要13#64 | own-post 回归（MP-R8-OWNPOST-001）：本人新帖详情无「+关注」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-01-before.png | 次要13#65 | 打开 ?tagName=摄影（r11-param-map 固定参数） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-01-after.png | 次要13#65 | 打开 ?tagName=摄影（r11-param-map 固定参数） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-02-before.png | 次要13#66 | 返回键 → 村口 | ❌ 偏差 | MP-R1-TAGPOSTS-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-02-after.png | 次要13#66 | 返回键 → 村口 | ❌ 偏差 | MP-R1-TAGPOSTS-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-03-before.png | 次要13#67 | 经帖子标签链路进入（校园日常：mockTagPosts 命中 2 条） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-04-before.png | 次要13#68 | 缺参直开（无 query）→ toast + 自动返回 | ❌ 偏差 | MP-R1-TAGPOSTS-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-04-after.png | 次要13#68 | 缺参直开（无 query）→ toast + 自动返回 | ❌ 偏差 | MP-R1-TAGPOSTS-002 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-05-before.png | 次要13#69 | 下拉刷新（refresherrefresh） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-05-after.png | 次要13#69 | 下拉刷新（refresherrefresh） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-06-before.png | 次要13#70 | 返回键（栈>1，经热榜进入）→ 回村口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-06-after.png | 次要13#70 | 返回键（栈>1，经热榜进入）→ 回村口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-01-before.png | 次要13#71 | 页面加载（返回键/计数条/清空按钮/列表） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-01-after.png | 次要13#71 | 页面加载（返回键/计数条/清空按钮/列表） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-02-before.png | 次要13#72 | 点击记录卡片 → detail | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-02-after.png | 次要13#72 | 点击记录卡片 → detail | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-03-before.png | 次要13#73 | 点击头像 → 他人主页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-03-after.png | 次要13#73 | 点击头像 → 他人主页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-04-before.png | 次要13#74 | 清空 → 弹窗 → 取消（列表不变） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-04-after.png | 次要13#74 | 清空 → 弹窗 → 取消（列表不变） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-05-before.png | 次要13#75 | 清空 → 确认 → toast + 空态 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-05-after.png | 次要13#75 | 清空 → 确认 → toast + 空态 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-06-before.png | 次要13#76 | 空态 action「回到村口」→ village index（.empty-action 修正重测） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-06-after.png | 次要13#76 | 空态 action「回到村口」→ village index（.empty-action 修正重测） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-07-before.png | 次要13#77 | 返回键（栈=1）→ 兜底 switchTab 村口 | ❌ 偏差 | MP-R1-HISTORY-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-07-after.png | 次要13#77 | 返回键（栈=1）→ 兜底 switchTab 村口 | ❌ 偏差 | MP-R1-HISTORY-001 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-01-before.png | 次要13#78 | 页面加载（header/搜索/7 tabs/圈子卡片/统计行） | ❌ 偏差 | MP-R1-CIRCLE-005 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-01-after.png | 次要13#78 | 页面加载（header/搜索/7 tabs/圈子卡片/统计行） | ❌ 偏差 | MP-R1-CIRCLE-005 | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-02-before.png | 次要13#79 | 点击搜索 → toast「搜索功能即将上线」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-02-after.png | 次要13#79 | 点击搜索 → toast「搜索功能即将上线」 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-03-before.png | 次要13#80 | Tab「摄影」→ 过滤仅摄影圈 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-03-after.png | 次要13#80 | Tab「摄影」→ 过滤仅摄影圈 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-04-before.png | 次要13#81 | Tab「全部」→ 恢复全量 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-04-after.png | 次要13#81 | Tab「全部」→ 恢复全量 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-05-before.png | 次要13#82 | Tab「更多」→ 全量 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-05-after.png | 次要13#82 | Tab「更多」→ 全量 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-06-before.png | 次要13#83 | 第1圈「加入」→ 按钮变已加入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-06-after.png | 次要13#83 | 第1圈「加入」→ 按钮变已加入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-07-before.png | 次要13#84 | 第1圈「已加入」→ 退出恢复 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-07-after.png | 次要13#84 | 第1圈「已加入」→ 退出恢复 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-08-before.png | 次要13#85 | 快速连点「加入」3 次（状态一致性） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-08-after.png | 次要13#85 | 快速连点「加入」3 次（状态一致性） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-09-before.png | 次要13#86 | 点击圈子卡片主体 → circle-home | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-09-after.png | 次要13#86 | 点击圈子卡片主体 → circle-home | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-10-before.png | 次要13#87 | header 返回键（栈>1）→ navigateBack | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-10-after.png | 次要13#87 | header 返回键（栈>1）→ navigateBack | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-11-before.png | 次要13#88 | 滚动到底（列表末端） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-11-after.png | 次要13#88 | 滚动到底（列表末端） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-12-before.png | 次要13#89 | 快速进出圈子主页 ×2（重复进出） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-12-after.png | 次要13#89 | 快速进出圈子主页 ×2（重复进出） | ⚠️ 无法验证 | — | ✓ |

### 次要14.json（引用截图 164 个，存在 164，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/TOPICS-01-before.png | 次要14#1 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-01-after.png | 次要14#1 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-02-before.png | 次要14#2 | OP02 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-02-after.png | 次要14#2 | OP02 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-03-before.png | 次要14#3 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-03-after.png | 次要14#3 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-04-before.png | 次要14#4 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-04-after.png | 次要14#4 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-05-before.png | 次要14#5 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-05-after.png | 次要14#5 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-06-before.png | 次要14#6 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-06-after.png | 次要14#6 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-07-before.png | 次要14#7 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-07-after.png | 次要14#7 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-08-before.png | 次要14#8 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-08-after.png | 次要14#8 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-09-before.png | 次要14#9 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-09-after.png | 次要14#9 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-10-before.png | 次要14#10 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-10-after.png | 次要14#10 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-11-before.png | 次要14#11 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-11-after.png | 次要14#11 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-12-before.png | 次要14#12 | OP12 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-12-after.png | 次要14#12 | OP12 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-13-before.png | 次要14#13 | OP13 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-13-after.png | 次要14#13 | OP13 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-14-before.png | 次要14#14 | OP14 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-14-after.png | 次要14#14 | OP14 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-15-before.png | 次要14#15、次要14#86 | OP15 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-15-after.png | 次要14#15、次要14#86 | OP15 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-16-before.png | 次要14#16 | OP16 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-16-after.png | 次要14#16 | OP16 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-17-before.png | 次要14#17 | OP17 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-17-after.png | 次要14#17 | OP17 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-18-before.png | 次要14#18 | OP18 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICS-18-after.png | 次要14#18 | OP18 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-01-before.png | 次要14#19 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-01-after.png | 次要14#19 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-02-before.png | 次要14#20、次要14#85 | OP02 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-02-after.png | 次要14#20、次要14#85 | OP02 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-03-before.png | 次要14#21 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-03-after.png | 次要14#21 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-04-before.png | 次要14#22 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-04-after.png | 次要14#22 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-05-before.png | 次要14#23 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-05-after.png | 次要14#23 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-06-before.png | 次要14#24 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-06-after.png | 次要14#24 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-07-before.png | 次要14#25 | OP07 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-07-after.png | 次要14#25 | OP07 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-08-before.png | 次要14#26 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-08-after.png | 次要14#26 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-09-before.png | 次要14#27 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-09-after.png | 次要14#27 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-10-before.png | 次要14#28 | OP10 | ❌ 偏差 | MP-R1-TOPICDETAIL-001 | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-10-after.png | 次要14#28 | OP10 | ❌ 偏差 | MP-R1-TOPICDETAIL-001 | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-11-before.png | 次要14#29 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-11-after.png | 次要14#29 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-01-before.png | 次要14#30、次要14#84 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-01-after.png | 次要14#30 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-02-before.png | 次要14#31 | OP02 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-02-after.png | 次要14#31 | OP02 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-03-before.png | 次要14#32 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-03-after.png | 次要14#32 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-04-before.png | 次要14#33 | OP04 | ❌ 偏差 | MP-R1-POSTTOPIC-001 | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-04-after.png | 次要14#33 | OP04 | ❌ 偏差 | MP-R1-POSTTOPIC-001 | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-05-before.png | 次要14#34 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-05-after.png | 次要14#34 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-06-before.png | 次要14#35 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-06-after.png | 次要14#35 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-07-before.png | 次要14#36 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-07-after.png | 次要14#36 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-08-before.png | 次要14#37 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-08-after.png | 次要14#37 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-09-before.png | 次要14#38 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-09-after.png | 次要14#38 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-10-before.png | 次要14#39 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-10-after.png | 次要14#39 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-11-before.png | 次要14#40 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-11-after.png | 次要14#40 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-12-before.png | 次要14#41 | OP12 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-12-after.png | 次要14#41 | OP12 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-13-before.png | 次要14#42 | OP13 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-13-after.png | 次要14#42 | OP13 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-14-before.png | 次要14#43 | OP14 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-14-after.png | 次要14#43 | OP14 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-01-before.png | 次要14#44、次要14#55 | OP01 | ✅ 符合/❌ 偏差 | MP-R1-CIRCLEHOME-003 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-01-after.png | 次要14#44 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-02-before.png | 次要14#45 | OP02 | ❌ 偏差 | MP-R1-CIRCLEHOME-001 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-02-after.png | 次要14#45、次要14#55 | OP02 | ❌ 偏差 | MP-R1-CIRCLEHOME-001、MP-R1-CIRCLEHOME-003 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-03-before.png | 次要14#46 | OP03 | ❌ 偏差 | MP-R1-CIRCLEHOME-002 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-03-after.png | 次要14#46 | OP03 | ❌ 偏差 | MP-R1-CIRCLEHOME-002 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-04-before.png | 次要14#47 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-04-after.png | 次要14#47 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-05-before.png | 次要14#48 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-05-after.png | 次要14#48 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-06-before.png | 次要14#49 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-06-after.png | 次要14#49 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-07-before.png | 次要14#50 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-07-after.png | 次要14#50 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-08-before.png | 次要14#51 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-08-after.png | 次要14#51 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-09-before.png | 次要14#52 | OP09 | ❌ 偏差 | MP-R1-CIRCLEHOME-004 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-09-after.png | 次要14#52 | OP09 | ❌ 偏差 | MP-R1-CIRCLEHOME-004 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-10-before.png | 次要14#53 | OP10 | ❌ 偏差 | MP-R1-CIRCLEHOME-004 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-10-after.png | 次要14#53 | OP10 | ❌ 偏差 | MP-R1-CIRCLEHOME-004 | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-11-before.png | 次要14#54 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CIRCLEHOME-11-after.png | 次要14#54 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-01-before.png | 次要14#56 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-01-after.png | 次要14#56 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-02-before.png | 次要14#57 | OP02 | ❌ 偏差 | MP-R1-CAMPUSINDEX-001 | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-02-after.png | 次要14#57 | OP02 | ❌ 偏差 | MP-R1-CAMPUSINDEX-001 | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-03-before.png | 次要14#58 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-03-after.png | 次要14#58 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-04-before.png | 次要14#59 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-04-after.png | 次要14#59 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-05-before.png | 次要14#60 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-05-after.png | 次要14#60 | OP05 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-06-before.png | 次要14#61 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-06-after.png | 次要14#61 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-07-before.png | 次要14#62 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-07-after.png | 次要14#62 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-08-before.png | 次要14#63 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-08-after.png | 次要14#63 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-09-before.png | 次要14#64 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-09-after.png | 次要14#64 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-10-before.png | 次要14#65 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-10-after.png | 次要14#65 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-01-before.png | 次要14#66 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-01-after.png | 次要14#66 | OP01 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-02-before.png | 次要14#67 | OP02 | ❌ 偏差 | MP-R1-CAMPUSPOST-001 | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-02-after.png | 次要14#67 | OP02 | ❌ 偏差 | MP-R1-CAMPUSPOST-001 | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-03-before.png | 次要14#68 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-03-after.png | 次要14#68 | OP03 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-04-before.png | 次要14#69 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-04-after.png | 次要14#69 | OP04 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-05-before.png | 次要14#70 | OP05 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-05-after.png | 次要14#70 | OP05 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-06-before.png | 次要14#71 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-06-after.png | 次要14#71 | OP06 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-07-before.png | 次要14#72 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-07-after.png | 次要14#72 | OP07 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-08-before.png | 次要14#73 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-08-after.png | 次要14#73 | OP08 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-09-before.png | 次要14#74 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-09-after.png | 次要14#74 | OP09 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-10-before.png | 次要14#75 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-10-after.png | 次要14#75 | OP10 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-11-before.png | 次要14#76 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-11-after.png | 次要14#76 | OP11 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-12-before.png | 次要14#77 | OP12 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-12-after.png | 次要14#77 | OP12 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-13-before.png | 次要14#78 | OP13 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-13-after.png | 次要14#78 | OP13 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-04B-toast.png | 次要14#79 | fix3 复测：发布流向判定（从 topics 页「写话题」navigateTo 进入，输入标题内容后点发布） | ❌ 偏差 | MP-R1-POSTTOPIC-001 | ✓ |
| reports/screenshots/round-1-interact/POSTTOPIC-04C-after.png | 次要14#79 | fix3 复测：发布流向判定（从 topics 页「写话题」navigateTo 进入，输入标题内容后点发布） | ❌ 偏差 | MP-R1-POSTTOPIC-001 | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-12B-toast.png | 次要14#80 | fix2 G 复测：校圈发帖（标题+内容→发布） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-12B-after2.png | 次要14#80 | fix2 G 复测：校圈发帖（标题+内容→发布） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-08B-before.png | 次要14#81 | fix2 E 复测：注入本校已认证后 FAB 出现并可点击 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSINDEX-08B-after.png | 次要14#81 | fix2 E 复测：注入本校已认证后 FAB 出现并可点击 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-06B-search.png | 次要14#82 | fix2 F 复测：话题选择器热门候选/选中/搜索过滤 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-09B-modal.png | 次要14#83 | fix2 B 复测：长按举报 hook 选因→补充描述 Modal→确认提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TOPICDETAIL-09B-after-toast.png | 次要14#83 | fix2 B 复测：长按举报 hook 选因→补充描述 Modal→确认提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CAMPUSPOST-05B-switch-tap.png | 次要14#84 | fix2 D 复测：喜爱 switch 原生 tap | ✅ 符合 | — | ✓ |

### 次要15.json（引用截图 120 个，存在 120，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| BOOT-01-before.png | 次要15#1 | 会话态确认（mock 模式） | ✅ 符合 | — | ✓ |
| BOOT-01-after.png | 次要15#1 | 会话态确认（mock 模式） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-01-before.png | 次要15#2 | 打开话题详情页 topicId=campus-topic-1 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-01-after.png | 次要15#2 | 打开话题详情页 topicId=campus-topic-1 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-02-before.png | 次要15#3 | 空内容点「发送」 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-02-after.png | 次要15#3 | 空内容点「发送」 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-03-before.png | 次要15#4 | 输入回复文本 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-03-after.png | 次要15#4 | 输入回复文本 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-04-before.png | 次要15#5 | 点「发送」提交回复 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-04-after.png | 次要15#5 | 点「发送」提交回复 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-05-before.png | 次要15#6 | 输入 320 字符超长文本（maxlength 探测） | ❌ 偏差 | MP-R1-TOPIC-DETAIL-002 | ✓ |
| TOPIC-DETAIL-05-after.png | 次要15#6 | 输入 320 字符超长文本（maxlength 探测） | ❌ 偏差 | MP-R1-TOPIC-DETAIL-002 | ✓ |
| TOPIC-DETAIL-06-before.png | 次要15#7 | 输入特殊字符后清空 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-06-after.png | 次要15#7 | 输入特殊字符后清空 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-07-before.png | 次要15#8 | 点「匿名」切换（开） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-07-after.png | 次要15#8 | 点「匿名」切换（开） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-08-before.png | 次要15#9 | 点「匿名」切换（关） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-08-after.png | 次要15#9 | 点「匿名」切换（关） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-09-before.png | 次要15#10 | 回复区滚动到底（scrolltolower 触发加载下一页） | ❌ 偏差 | MP-R1-TOPIC-DETAIL-001 | ✓ |
| TOPIC-DETAIL-09-after.png | 次要15#10 | 回复区滚动到底（scrolltolower 触发加载下一页） | ❌ 偏差 | MP-R1-TOPIC-DETAIL-001 | ✓ |
| TOPIC-DETAIL-10-before.png | 次要15#11 | 打开话题页后立即返回（页面打开立即返回） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-10-after.png | 次要15#11 | 打开话题页后立即返回（页面打开立即返回） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-11-before.png | 次要15#12 | 重复进出：再次进入 campus-topic-1 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-11-after.png | 次要15#12 | 重复进出：再次进入 campus-topic-1 | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-12-before.png | 次要15#13 | 点左上「返回」（干净栈深 2） | ✅ 符合 | — | ✓ |
| TOPIC-DETAIL-12-after.png | 次要15#13 | 点左上「返回」（干净栈深 2） | ✅ 符合 | — | ✓ |
| CERTIFICATION-01-before.png | 次要15#14 | 打开校园认证页（先复位 mock 认证态） | ✅ 符合 | — | ✓ |
| CERTIFICATION-01-after.png | 次要15#14 | 打开校园认证页（先复位 mock 认证态） | ✅ 符合 | — | ✓ |
| CERTIFICATION-02-before.png | 次要15#15 | 空表单点「提交审核」 | ✅ 符合 | — | ✓ |
| CERTIFICATION-02-after.png | 次要15#15 | 空表单点「提交审核」 | ✅ 符合 | — | ✓ |
| CERTIFICATION-03-before.png | 次要15#16 | 填学校后点提交 | ✅ 符合 | — | ✓ |
| CERTIFICATION-03-after.png | 次要15#16 | 填学校后点提交 | ✅ 符合 | — | ✓ |
| CERTIFICATION-04-before.png | 次要15#17 | 填专业后点提交 | ✅ 符合 | — | ✓ |
| CERTIFICATION-04-after.png | 次要15#17 | 填专业后点提交 | ✅ 符合 | — | ✓ |
| CERTIFICATION-05-before.png | 次要15#18 | 学校输入框输入 200 字符超长文本 | ❌ 偏差 | MP-R1-TOPIC-DETAIL-002 | ✓ |
| CERTIFICATION-05-after.png | 次要15#18 | 学校输入框输入 200 字符超长文本 | ❌ 偏差 | MP-R1-TOPIC-DETAIL-002 | ✓ |
| CERTIFICATION-06-before.png | 次要15#19 | mock chooseImage 后点学生证上传区 | ✅ 符合 | — | ✓ |
| CERTIFICATION-06-after.png | 次要15#19 | mock chooseImage 后点学生证上传区 | ✅ 符合 | — | ✓ |
| CERTIFICATION-07-before.png | 次要15#20 | 点移除(x)按钮清掉已选照片 | ✅ 符合 | — | ✓ |
| CERTIFICATION-07-after.png | 次要15#20 | 点移除(x)按钮清掉已选照片 | ✅ 符合 | — | ✓ |
| CERTIFICATION-08-before.png | 次要15#21 | 再次上传学生证并填学信网验证码 | ✅ 符合 | — | ✓ |
| CERTIFICATION-08-after.png | 次要15#21 | 再次上传学生证并填学信网验证码 | ✅ 符合 | — | ✓ |
| CERTIFICATION-09-before.png | 次要15#22 | 快速连点「提交审核」×2（重复提交） | ✅ 符合 | — | ✓ |
| CERTIFICATION-09-after.png | 次要15#22 | 快速连点「提交审核」×2（重复提交） | ✅ 符合 | — | ✓ |
| CERTIFICATION-10-before.png | 次要15#23 | 点左上「返回」（干净栈深 2） | ✅ 符合 | — | ✓ |
| CERTIFICATION-10-after.png | 次要15#23 | 点左上「返回」（干净栈深 2） | ✅ 符合 | — | ✓ |
| SEGMENT-06-before.png | 次要15#24 | 打开 ?type=highMatch（空分组） | ❌ 偏差 | MP-R1-SEGMENT-001 | ✓ |
| SEGMENT-06-after.png | 次要15#24 | 打开 ?type=highMatch（空分组） | ❌ 偏差 | MP-R1-SEGMENT-001 | ✓ |
| SEGMENT-07-before.png | 次要15#25 | 点分区页返回（空态页） | ✅ 符合 | — | ✓ |
| SEGMENT-07-after.png | 次要15#25 | 点分区页返回（空态页） | ✅ 符合 | — | ✓ |
| PEOPLE-01-before.png | 次要15#26 | 打开附近的人列表 ?scope=nearby | ✅ 符合 | — | ✓ |
| PEOPLE-01-after.png | 次要15#26 | 打开附近的人列表 ?scope=nearby | ✅ 符合 | — | ✓ |
| PEOPLE-02-before.png | 次要15#27 | 切换「同城」tab | ✅ 符合 | — | ✓ |
| PEOPLE-02-after.png | 次要15#27 | 切换「同城」tab | ✅ 符合 | — | ✓ |
| PEOPLE-03-before.png | 次要15#28 | 快速连点 附近/同城 tab ×4 | ✅ 符合 | — | ✓ |
| PEOPLE-03-after.png | 次要15#28 | 快速连点 附近/同城 tab ×4 | ✅ 符合 | — | ✓ |
| PEOPLE-04-before.png | 次要15#29 | 点击列表第一行 | ✅ 符合 | — | ✓ |
| PEOPLE-04-after.png | 次要15#29 | 点击列表第一行 | ✅ 符合 | — | ✓ |
| PEOPLE-05-before.png | 次要15#30 | 从他人主页返回 | ✅ 符合 | — | ✓ |
| PEOPLE-05-after.png | 次要15#30 | 从他人主页返回 | ✅ 符合 | — | ✓ |
| PEOPLE-06-before.png | 次要15#31 | 列表滚动到底（scrolltolower 增量渲染） | ✅ 符合 | — | ✓ |
| PEOPLE-06-after.png | 次要15#31 | 列表滚动到底（scrolltolower 增量渲染） | ✅ 符合 | — | ✓ |
| PEOPLE-07-before.png | 次要15#32 | 切回「附近」tab 后点左上返回 | ✅ 符合 | — | ✓ |
| PEOPLE-07-after.png | 次要15#32 | 切回「附近」tab 后点左上返回 | ✅ 符合 | — | ✓ |
| HISTORY-00-before.png | 次要15#33 | 数据准备：store 级滑卡（左-右-左） | ✅ 符合 | — | ✓ |
| HISTORY-00-after.png | 次要15#33 | 数据准备：store 级滑卡（左-右-左） | ✅ 符合 | — | ✓ |
| HISTORY-01-before.png | 次要15#34 | 打开寻觅历史页 | ✅ 符合 | — | ✓ |
| HISTORY-01-after.png | 次要15#34 | 打开寻觅历史页 | ✅ 符合 | — | ✓ |
| HISTORY-02-before.png | 次要15#35 | 点「挽回」按钮 | ✅ 符合 | — | ✓ |
| HISTORY-02-after.png | 次要15#35 | 点「挽回」按钮 | ✅ 符合 | — | ✓ |
| HISTORY-03-before.png | 次要15#36 | 再次进入历史页验证挽回后状态 | ✅ 符合 | — | ✓ |
| HISTORY-03-after.png | 次要15#36 | 再次进入历史页验证挽回后状态 | ✅ 符合 | — | ✓ |
| HISTORY-04-before.png | 次要15#37 | 点左上返回（干净栈深 2） | ✅ 符合 | — | ✓ |
| HISTORY-04-after.png | 次要15#37 | 点左上返回（干净栈深 2） | ✅ 符合 | — | ✓ |
| LIKES-01-before.png | 次要15#38 | 打开喜欢页 | ❌ 偏差 | MP-R1-LIKES-001 | ✓ |
| LIKES-01-after.png | 次要15#38 | 打开喜欢页 | ❌ 偏差 | MP-R1-LIKES-001 | ✓ |
| LIKES-02-before.png | 次要15#39 | 点「管理」进入批量模式 | ✅ 符合 | — | ✓ |
| LIKES-02-after.png | 次要15#39 | 点「管理」进入批量模式 | ✅ 符合 | — | ✓ |
| LIKES-03-before.png | 次要15#40 | 批量模式点第一张卡 | ✅ 符合 | — | ✓ |
| LIKES-03-after.png | 次要15#40 | 批量模式点第一张卡 | ✅ 符合 | — | ✓ |
| LIKES-04-before.png | 次要15#41 | 点「全选」 | ✅ 符合 | — | ✓ |
| LIKES-04-after.png | 次要15#41 | 点「全选」 | ✅ 符合 | — | ✓ |
| LIKES-05-before.png | 次要15#42 | 再点「取消」（取消全选） | ✅ 符合 | — | ✓ |
| LIKES-05-after.png | 次要15#42 | 再点「取消」（取消全选） | ✅ 符合 | — | ✓ |
| LIKES-06-before.png | 次要15#43 | 零选中点「跳过」（空内容提交） | ✅ 符合 | — | ✓ |
| LIKES-06-after.png | 次要15#43 | 零选中点「跳过」（空内容提交） | ✅ 符合 | — | ✓ |
| LIKES-07-before.png | 次要15#44 | 选中 1 项点「跳过」（批量操作成功路径） | ✅ 符合 | — | ✓ |
| LIKES-07-after.png | 次要15#44 | 选中 1 项点「跳过」（批量操作成功路径） | ✅ 符合 | — | ✓ |
| LIKES-08-before.png | 次要15#45 | 搜索框输入「苏」 | ✅ 符合 | — | ✓ |
| LIKES-08-after.png | 次要15#45 | 搜索框输入「苏」 | ✅ 符合 | — | ✓ |
| LIKES-09-before.png | 次要15#46 | 点 × 清空搜索 | ✅ 符合 | — | ✓ |
| LIKES-09-after.png | 次要15#46 | 点 × 清空搜索 | ✅ 符合 | — | ✓ |
| LIKES-10-before.png | 次要15#47 | 搜索特殊字符/emoji（无匹配空态） | ✅ 符合 | — | ✓ |
| LIKES-10-after.png | 次要15#47 | 搜索特殊字符/emoji（无匹配空态） | ✅ 符合 | — | ✓ |
| LIKES-11-before.png | 次要15#48 | 点 × 清空特殊字符搜索 | ✅ 符合 | — | ✓ |
| LIKES-11-after.png | 次要15#48 | 点 × 清空特殊字符搜索 | ✅ 符合 | — | ✓ |
| LIKES-12-before.png | 次要15#49 | 快速连点 tab（喜欢我的↔我发出的喜欢）×4 | ✅ 符合 | — | ✓ |
| LIKES-12-after.png | 次要15#49 | 快速连点 tab（喜欢我的↔我发出的喜欢）×4 | ✅ 符合 | — | ✓ |
| LIKES-13-before.png | 次要15#50 | 切「访客」tab（懒加载） | ✅ 符合 | — | ✓ |
| LIKES-13-after.png | 次要15#50 | 切「访客」tab（懒加载） | ✅ 符合 | — | ✓ |
| LIKES-14-before.png | 次要15#51 | 切回「喜欢我的」，点第一张卡（非批量、已解锁、非匹配） | ✅ 符合 | — | ✓ |
| LIKES-14-after.png | 次要15#51 | 切回「喜欢我的」，点第一张卡（非批量、已解锁、非匹配） | ✅ 符合 | — | ✓ |
| LIKES-15-before.png | 次要15#52 | 从他人主页返回喜欢页 | ✅ 符合 | — | ✓ |
| LIKES-15-after.png | 次要15#52 | 从他人主页返回喜欢页 | ✅ 符合 | — | ✓ |
| LIKES-16-before.png | 次要15#53 | 点「心动信号」入口 | ✅ 符合 | — | ✓ |
| LIKES-16-after.png | 次要15#53 | 点「心动信号」入口 | ✅ 符合 | — | ✓ |
| LIKES-17-before.png | 次要15#54 | 从心动信号页返回，快速连点「管理」×3 | ✅ 符合 | — | ✓ |
| LIKES-17-after.png | 次要15#54 | 从心动信号页返回，快速连点「管理」×3 | ✅ 符合 | — | ✓ |
| LIKES-18-before.png | 次要15#55 | 点「完成」退出批量模式 | ✅ 符合 | — | ✓ |
| LIKES-18-after.png | 次要15#55 | 点「完成」退出批量模式 | ✅ 符合 | — | ✓ |
| LIKES-19-before.png | 次要15#56 | 点左上返回（干净栈深 2 → discover） | ✅ 符合 | — | ✓ |
| LIKES-19-after.png | 次要15#56 | 点左上返回（干净栈深 2 → discover） | ✅ 符合 | — | ✓ |
| SEGMENT-01-before.png | 次要15#57 | 从首页 navigateTo 分区页 ?type=online | ✅ 符合 | — | ✓ |
| SEGMENT-01-after.png | 次要15#57 | 从首页 navigateTo 分区页 ?type=online | ✅ 符合 | — | ✓ |
| SEGMENT-02-before.png | 次要15#58 | 点击列表第一行 | ✅ 符合 | — | ✓ |
| SEGMENT-02-after.png | 次要15#58 | 点击列表第一行 | ✅ 符合 | — | ✓ |
| SEGMENT-03-before.png | 次要15#59 | 从他人主页返回分区页 | ✅ 符合 | — | ✓ |
| SEGMENT-03-after.png | 次要15#59 | 从他人主页返回分区页 | ✅ 符合 | — | ✓ |
| SEGMENT-04-before.png | 次要15#60 | 点分区页左上返回 | ⚠️ 无法验证 | — | ✓ |
| SEGMENT-04-after.png | 次要15#60 | 点分区页左上返回 | ⚠️ 无法验证 | — | ✓ |

### 次要16.json（引用截图 103 个，存在 95，缺失 8）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/LV-00-after.png | 次要16#1、次要16#2 | 打开页面（discover→navigateTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-01-before.png | 次要16#2、次要16#3 | 初始态元素核对（曝光条/解锁全部按钮/锁图标） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-01-after.png | 次要16#3 | Tab 切换到「我的访客」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-02-before.png | 次要16#4 | Tab 切回「喜欢我的」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-02-after.png | 次要16#4 | Tab 切回「喜欢我的」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-03-before.png | 次要16#5 | 点击列表第一项（已解锁） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-06-after.png | 次要16#5 | 点击列表第一项（已解锁） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-04-before.png | 次要16#6 | 点击返回键（有上一页） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-04-after.png | 次要16#6 | 点击返回键（有上一页） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-05-before.png | 次要16#7 | 快速连点 Tab「我的访客」×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LV-05-after.png | 次要16#7 | 快速连点 Tab「我的访客」×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-00-after.png | 次要16#10 | 打开页面（未签到态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-01-before.png | 次要16#11 | 点击「去签到」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-01-after.png | 次要16#11 | 点击「去签到」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-02-before.png | 次要16#12 | 空内容点击提交按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-02-after.png | 次要16#12 | 空内容点击提交按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-03-before.png | 次要16#13 | 输入正常回答文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-03-after.png | 次要16#13、次要16#14 | 输入正常回答文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-05-before.png | 次要16#14、次要16#15 | 输入600字超长+<script>+emoji | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-05-after-off.png | 次要16#15 | 匿名勾选切换开→关 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-06-before.png | 次要16#16 | 输入并提交回答 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-06-after.png | 次要16#16、次要16#17 | 输入并提交回答 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-07-after.png | 次要16#17 | 已回答后输入区收起（重复提交保护） | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/DQ-08-before.png | 次要16#18 | 回答列表滚动到底（scrolltolower） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-08-after.png | 次要16#18 | 回答列表滚动到底（scrolltolower） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-10-before.png | 次要16#19 | 点击「加载更多」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-10-after.png | 次要16#19 | 点击「加载更多」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-09-before.png | 次要16#20 | 点击返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DQ-09-after.png | 次要16#20 | 点击返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LC-00-after.png | 次要16#21、次要16#27 | 打开页面（commerce 封存态） | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/LC-01-before.png | 次要16#22 | 点击快捷入口「附近的人」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LC-01-after.png | 次要16#22 | 点击快捷入口「附近的人」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LC-04-before.png | 次要16#23 | 附近的人页自定义返回键（.content-header__back） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LC-04-after.png | 次要16#23 | 附近的人页自定义返回键（.content-header__back） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LC-02-before.png | 次要16#24 | 点击「MBTI 人格测试」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LC-02-after.png | 次要16#24、次要16#25 | 点击「MBTI 人格测试」 | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/LC-03-before.png | 次要16#26 | 恋爱中心返回键（.shell__back） | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/LC-03-after.png | 次要16#26 | 恋爱中心返回键（.shell__back） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-00-after.png | 次要16#29 | 打开页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-01-before.png | 次要16#30 | 点击 FAQ 第 1 项展开 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-01-after.png | 次要16#30 | 点击 FAQ 第 1 项展开 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-02-before.png | 次要16#31 | 再次点击 FAQ 第 1 项折叠 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-02-after.png | 次要16#31 | 再次点击 FAQ 第 1 项折叠 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-03-mid.png | 次要16#32 | 点开第1项再点第2项（互斥） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-03-after.png | 次要16#32 | 点开第1项再点第2项（互斥） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-04-before.png | 次要16#33 | 点击「在线客服」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-04-after.png | 次要16#33、次要16#34 | 点击「在线客服」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-04b-after.png | 次要16#34 | 客服会话页返回（辅助恢复） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-05-before.png | 次要16#35 | 点击「意见反馈」 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/HP-05-after.png | 次要16#35、次要16#36 | 点击「意见反馈」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-05b-after.png | 次要16#36 | 反馈页返回（辅助恢复） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-06-before.png | 次要16#37 | 点击「客服邮箱」行「复制」 | ❌ 偏差 | MP-R1-HELP-001 | ✓ |
| reports/screenshots/round-1-interact/HP-06-after-toast.png | 次要16#37 | 点击「客服邮箱」行「复制」 | ❌ 偏差 | MP-R1-HELP-001 | ✓ |
| reports/screenshots/round-1-interact/HP-07-before.png | 次要16#38 | 帮助中心返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HP-07-after.png | 次要16#38 | 帮助中心返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-00-after.png | 次要16#39、次要16#57 | 打开页面 | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-01-before.png | 次要16#40 | 点击「绑定手机号」打开更换手机号弹层 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-01-after.png | 次要16#40 | 点击「绑定手机号」打开更换手机号弹层 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-02-before.png | 次要16#41 | 非法手机号 123 提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-02-after.png | 次要16#41 | 非法手机号 123 提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-03-before.png | 次要16#42 | 合法手机号 13800138000 提交（mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-03-after.png | 次要16#42 | 合法手机号 13800138000 提交（mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-04-before.png | 次要16#43 | 点击「修改密码」 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/SEC-04-after.png | 次要16#43 | 点击「修改密码」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-05-before.png | 次要16#44 | 新密码 123（过短）提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-05-after.png | 次要16#44 | 新密码 123（过短）提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-06-before.png | 次要16#45 | 两次密码不一致（abc123/abc999）提交 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/SEC-06-after.png | 次要16#45 | 两次密码不一致（abc123/abc999）提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-07-before.png | 次要16#46 | 合法修改密码提交+快速连点确认×3（mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-07-after.png | 次要16#46 | 合法修改密码提交+快速连点确认×3（mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-08-before.png | 次要16#47 | 点击「绑定微信」行（已绑定态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-08-after-toast.png | 次要16#47、次要16#56 | 点击「绑定微信」行（已绑定态） | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-09-before.png | 次要16#48 | 点击「隐私权限设置」 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/SEC-09-after.png | 次要16#48、次要16#49 | 点击「隐私权限设置」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-09b-after.png | 次要16#49 | 隐私设置页返回（辅助恢复） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-10-before.png | 次要16#50 | 点击「隐私政策」 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/SEC-10-after.png | 次要16#50、次要16#51 | 点击「隐私政策」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-10b-after.png | 次要16#51 | 隐私政策页返回（辅助恢复） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-11-before.png | 次要16#52 | 点击「注销账号」打开第一层弹层→点取消 | ✅ 符合 | — | ✗ 缺失 |
| reports/screenshots/round-1-interact/SEC-11-after.png | 次要16#52 | 点击「注销账号」打开第一层弹层→点取消 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-12r-first-layer.png | 次要16#53 | 第一层点「注销账号」→第二层凭据弹层 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-12r-second-layer.png | 次要16#53、次要16#54 | 第一层点「注销账号」→第二层凭据弹层 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-13rr-after.png | 次要16#54 | 第二层输入「删除」提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-14-before.png | 次要16#55 | 第二层输入「注销」提交（mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SEC-14-after-modal.png | 次要16#55、次要16#56 | 第二层输入「注销」提交（mock） | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SE-00-after.png | 次要16#60、次要16#73、次要16#74 | 打开页面（未输入） | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SE-01-before.png | 次要16#61 | 输入「晓」防抖搜索（用户 Tab） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-01-after.png | 次要16#61、次要16#62 | 输入「晓」防抖搜索（用户 Tab） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-02-after.png | 次要16#62 | 点击清空按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-03-before.png | 次要16#63 | 输入特殊字符 <script>alert(1)</script>+emoji | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-03-after.png | 次要16#63、次要16#64 | 输入特殊字符 <script>alert(1)</script>+emoji | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-04-after.png | 次要16#64 | 输入 200 字超长文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-05-before.png | 次要16#65 | 清空后切「标签」Tab（空关键词） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-05-after.png | 次要16#65、次要16#66 | 清空后切「标签」Tab（空关键词） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-06-after.png | 次要16#66、次要16#67、次要16#75 | 标签 Tab 输入「恋爱」搜索 | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SE-07-after.png | 次要16#67 | 切「学校」Tab 输入「大学」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-08-before.png | 次要16#68 | 点击第一个学校行（展开校园主页预览） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-08-after.png | 次要16#68、次要16#69、次要16#76 | 点击第一个学校行（展开校园主页预览） | ✅ 符合/⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SE-09-after.png | 次要16#69 | 再点同一学校行（收起） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-10-before.png | 次要16#70 | 点击返回键（.search-back） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-10-after.png | 次要16#70 | 点击返回键（.search-back） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-11-before.png | 次要16#71 | 点击「取消」文字入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SE-11-after.png | 次要16#71 | 点击「取消」文字入口 | ✅ 符合 | — | ✓ |

### 次要17.json（引用截图 147 个，存在 147，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/HEARTSIGNALS-01-after.png | 次要17#1、次要17#15 | 进入心动信号页（home→navigateTo 建栈） | ✅ 符合/❌ 偏差 | MP-R1-HEARTSIGNALS-001 | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-02-after.png | 次要17#1、次要17#15 | 进入心动信号页（home→navigateTo 建栈） | ✅ 符合/❌ 偏差 | MP-R1-HEARTSIGNALS-001 | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-03-before.png | 次要17#2 | 点击左上返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-03-after.png | 次要17#2、次要17#3 | 点击左上返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-04-after.png | 次要17#3 | 重复进出页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-05R-before.png | 次要17#4 | 点击「已接受」Tab | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-05R-after.png | 次要17#4 | 点击「已接受」Tab | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-06R-before.png | 次要17#5 | 点击「已拒绝」Tab | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-06R-after.png | 次要17#5 | 点击「已拒绝」Tab | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-07-before.png | 次要17#6 | 点回「待处理」Tab | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-07-after.png | 次要17#6 | 点回「待处理」Tab | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-08-before.png | 次要17#7 | 点击第一张信号卡头部（goToUserProfile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-08-after.png | 次要17#7 | 点击第一张信号卡头部（goToUserProfile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-09R-before.png | 次要17#8 | 从个人主页返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-09R-after.png | 次要17#8、次要17#9 | 从个人主页返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-10R-after.png | 次要17#9 | 点击第二张卡「拒绝」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-11R-before.png | 次要17#10 | 点击第一张卡「接受」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-11R-after.png | 次要17#10、次要17#11 | 点击第一张卡「接受」 | ✅ 符合/❌ 偏差 | MP-R1-HEARTSIGNALS-002 | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-13R-after.png | 次要17#11、次要17#13 | 接受/拒绝后再次 fetchHeartSignals（mock 固件复用性） | ❌ 偏差/✅ 符合 | MP-R1-HEARTSIGNALS-002 | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-12R-before.png | 次要17#12 | 快速连点「接受」5 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-12R-after.png | 次要17#12 | 快速连点「接受」5 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-13R-before.png | 次要17#13 | 页面打开立即返回（navigateTo 400ms 后点返回） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-14R-before.png | 次要17#14 | 已接受 Tab「开聊」按钮 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/HEARTSIGNALS-14R-after.png | 次要17#14 | 已接受 Tab「开聊」按钮 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-01-before.png | 次要17#16 | 进入活动详情 ?id=a-1 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-01-after.png | 次要17#16 | 进入活动详情 ?id=a-1 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-02X-before.png | 次要17#17 | 点击「分享」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-02X-after.png | 次要17#17 | 点击「分享」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-03-before.png | 次要17#18 | 点击「立即报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-03-after.png | 次要17#18 | 点击「立即报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-04-before.png | 次要17#19 | 点击「退出报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-04-after.png | 次要17#19 | 点击「退出报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-05-before.png | 次要17#20 | 快速连点「立即报名」3 次（重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-05-after.png | 次要17#20 | 快速连点「立即报名」3 次（重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-06-before.png | 次要17#21 | 连点「退出报名」复原 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-06-after.png | 次要17#21 | 连点「退出报名」复原 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-07-before.png | 次要17#22 | scroll-view 滚动到底（touch 上滑） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-07-after.png | 次要17#22 | scroll-view 滚动到底（touch 上滑） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-08-before.png | 次要17#23 | 点击返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-08-after.png | 次要17#23 | 点击返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-09-before.png | 次要17#24 | 未知 id 兜底（?id=unknown-xyz） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-09-after.png | 次要17#24 | 未知 id 兜底（?id=unknown-xyz） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-10-before.png | 次要17#25 | 示例活动「立即报名」（本地闭环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-10-after.png | 次要17#25 | 示例活动「立即报名」（本地闭环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-11-before.png | 次要17#26 | 示例活动「退出报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-11-after.png | 次要17#26 | 示例活动「退出报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-12-before.png | 次要17#27 | 示例活动页返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITYDETAIL-12-after.png | 次要17#27、次要17#36 | 示例活动页返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/NEARBY-01-before.png | 次要17#28 | 进入附近缘分页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/NEARBY-01-after.png | 次要17#28、次要17#29、次要17#30、次要17#32 | 进入附近缘分页 | ✅ 符合/❌ 偏差 | MP-R1-NEARBY-002、MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-02-after.png | 次要17#29、次要17#30、次要17#31 | 点击卡片本体 | ✅ 符合/❌ 偏差 | MP-R1-NEARBY-002 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-04-after.png | 次要17#32、次要17#33、次要17#34、次要17#35 等5处 | 点击「跳过」 | ❌ 偏差/✅ 符合 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-06-after.png | 次要17#33、次要17#34 | 点击「喜欢」 | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-07-after.png | 次要17#35 | 快速连点「喜欢」3 次 | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-09R-before.png | 次要17#37 | 对已被 store 移除的卡片再次「跳过」 | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-09R-after.png | 次要17#37 | 对已被 store 移除的卡片再次「跳过」 | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-12R-before.png | 次要17#38 | 重进页面后首次「喜欢」（新鲜数据复核） | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/NEARBY-12R-after.png | 次要17#38 | 重进页面后首次「喜欢」（新鲜数据复核） | ❌ 偏差 | MP-R1-NEARBY-001 | ✓ |
| reports/screenshots/round-1-interact/MBTI-01-before.png | 次要17#40 | 进入 MBTI 页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-01-after.png | 次要17#40 | 进入 MBTI 页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-02X-before.png | 次要17#41 | 未作答点「提交并查看结果」（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-02X-after.png | 次要17#41 | 未作答点「提交并查看结果」（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-03-before.png | 次要17#42 | 依次选择 4 题选项 A | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-03-after.png | 次要17#42 | 依次选择 4 题选项 A | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-04-before.png | 次要17#43 | 答案齐备点提交（全 A） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-04-after.png | 次要17#43 | 答案齐备点提交（全 A） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-05-before.png | 次要17#44 | 点弹层「关闭」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-05-after.png | 次要17#44 | 点弹层「关闭」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-06-before.png | 次要17#45 | 改第 4 题为 B 再提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-06-after.png | 次要17#45 | 改第 4 题为 B 再提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-07-before.png | 次要17#46 | 点「重新测试」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-07-after.png | 次要17#46 | 点「重新测试」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-08-before.png | 次要17#47 | 全选 B 提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-08-after.png | 次要17#47 | 全选 B 提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-09-before.png | 次要17#48 | 点击弹层遮罩关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-09-after.png | 次要17#48 | 点击弹层遮罩关闭 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-10-before.png | 次要17#49 | scroll-view 滚动到底 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-10-after.png | 次要17#49 | scroll-view 滚动到底 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-11-before.png | 次要17#50 | 点击右上返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/MBTI-11-after.png | 次要17#50 | 点击右上返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-01-before.png | 次要17#51 | 进入恋爱咨询页（mock 缺省封存） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-01-after.png | 次要17#51 | 进入恋爱咨询页（mock 缺省封存） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-02-before.png | 次要17#52 | 点 AppShell「返回」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-02-after.png | 次要17#52 | 点 AppShell「返回」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-03R-before.png | 次要17#53 | 开闸分支（合成前置：store 注入 commerce.enabled+consult） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-03R-after.png | 次要17#53 | 开闸分支（合成前置：store 注入 commerce.enabled+consult） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-04R-before.png | 次要17#54 | 点第一门课「报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-04X-after.png | 次要17#54 | 点第一门课「报名」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-05-before.png | 次要17#55 | 快速连点「报名」3 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-05-after.png | 次要17#55 | 快速连点「报名」3 次 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-06R-before.png | 次要17#56 | 还原 commerce 开关后重进 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-06R-after.png | 次要17#56 | 还原 commerce 开关后重进 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-07R-before.png | 次要17#57 | 封存态返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/CONSULTING-07R-after.png | 次要17#57 | 封存态返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-01-before.png | 次要17#59 | 进入设置页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-01-after.png | 次要17#59 | 进入设置页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-02-before.png | 次要17#60 | 点「反馈与帮助」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-02-after.png | 次要17#60 | 点「反馈与帮助」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-04-before.png | 次要17#61 | 点「推荐给好友」（uni.showShareMenu） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-04-after.png | 次要17#61 | 点「推荐给好友」（uni.showShareMenu） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-05-before.png | 次要17#62 | 点「编辑资料」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-05-after.png | 次要17#62 | 点「编辑资料」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-06-after.png | 次要17#63 | 点「恋爱认证」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-07-after.png | 次要17#63 | 点「恋爱认证」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-09X-before.png | 次要17#64 | 点「我的动态」 | ❌ 偏差 | MP-R1-SETTINGS-001 | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-09X-after.png | 次要17#64 | 点「我的动态」 | ❌ 偏差 | MP-R1-SETTINGS-001 | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-11-before.png | 次要17#65 | 点「访客记录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-11-after.png | 次要17#65 | 点「访客记录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-13X-before.png | 次要17#66 | 点「浏览记录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-13X-after.png | 次要17#66 | 点「浏览记录」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-15-before.png | 次要17#67 | 点「我的相册」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-15-after.png | 次要17#67 | 点「我的相册」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-17X-before.png | 次要17#68 | 点「时间安排」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-17X-after.png | 次要17#68 | 点「时间安排」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-19-before.png | 次要17#69 | 点「免打扰」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-19-after.png | 次要17#69 | 点「免打扰」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-21X-before.png | 次要17#70 | 拨「本周安排」switch（含快速连拨 3 次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-21X-after.png | 次要17#70 | 拨「本周安排」switch（含快速连拨 3 次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-23X-before.png | 次要17#71 | 拨「深色模式」switch（开→关） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-23X-after.png | 次要17#71 | 拨「深色模式」switch（开→关） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-25-before.png | 次要17#72 | 点「隐私权限设置」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-25-after.png | 次要17#72 | 点「隐私权限设置」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-26-after.png | 次要17#73 | 点「安全中心」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-27-after.png | 次要17#73 | 点「安全中心」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-28-after.png | 次要17#74 | 点「隐私政策」（隐私分组/关于分组两处） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-29-after.png | 次要17#74 | 点「隐私政策」（隐私分组/关于分组两处） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-31X-before.png | 次要17#75 | 页面滚动到底（mp.pageScrollTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-31X-after.png | 次要17#75、次要17#76 | 页面滚动到底（mp.pageScrollTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-32-after.png | 次要17#76 | 点「用户协议」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-36-before.png | 次要17#77 | 点「检查更新」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-36-after.png | 次要17#77 | 点「检查更新」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-37-after.png | 次要17#78 | 点「关于我们」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-38-after.png | 次要17#78 | 点「关于我们」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-40-before.png | 次要17#79 | 点「清除缓存」真实弹窗 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-40-after.png | 次要17#79 | 点「清除缓存」真实弹窗 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-42-before.png | 次要17#80 | 「清除缓存」取消分支（mockWxMethod confirm=false） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-42-after.png | 次要17#80 | 「清除缓存」取消分支（mockWxMethod confirm=false） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-44X-before.png | 次要17#81 | 「清除缓存」确认分支（mockWxMethod confirm=true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-44X-after.png | 次要17#81 | 「清除缓存」确认分支（mockWxMethod confirm=true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-45-before.png | 次要17#82 | 「退出登录」取消分支 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-45-after.png | 次要17#82 | 「退出登录」取消分支 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-46-before.png | 次要17#83 | 「退出登录」确认分支 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-46-after.png | 次要17#83 | 「退出登录」确认分支 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-47-before.png | 次要17#84 | 退出后恢复现场（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-47-after.png | 次要17#84 | 退出后恢复现场（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-48-before.png | 次要17#85 | 点导航栏返回键（reLaunch 直达、栈深=1） | ❌ 偏差 | MP-R1-SETTINGS-002 | ✓ |
| reports/screenshots/round-1-interact/SETTINGS-48-after.png | 次要17#85 | 点导航栏返回键（reLaunch 直达、栈深=1） | ❌ 偏差 | MP-R1-SETTINGS-002 | ✓ |

### 次要18.json（引用截图 101 个，存在 101，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/VERIFY-INDEX-01-before.png | 次要18#1 | reLaunch 深链打开认证中心 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-01-after-2.png | 次要18#1 | reLaunch 深链打开认证中心 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-02-before.png | 次要18#2 | 学生姓名输入「张三」（正常输入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-02-after.png | 次要18#2 | 学生姓名输入「张三」（正常输入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-03-before.png | 次要18#3 | 学号输入 25 位超长文本（maxlength=20） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-03-after.png | 次要18#3 | 学号输入 25 位超长文本（maxlength=20） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-04-before.png | 次要18#4 | 学校输入特殊字符 <script>alert(1)</script>&amp | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-04-after.png | 次要18#4 | 学校输入特殊字符 <script>alert(1)</script>&amp | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-05-before.png | 次要18#5 | 缺项点提交（姓名/学号/学校已填、缺证件照） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-05-after.png | 次要18#5 | 缺项点提交（姓名/学号/学校已填、缺证件照） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-06-before.png | 次要18#6 | 点上传学生证卡（chooseImage 经 mockWxMethod 返回包内图片） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-06-after.png | 次要18#6 | 点上传学生证卡（chooseImage 经 mockWxMethod 返回包内图片） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-07-before.png | 次要18#7 | 填全表单后快速三连点提交（重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-07-after.png | 次要18#7 | 填全表单后快速三连点提交（重复提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-08-before.png | 次要18#8 | pending 态点「模拟审核通过」（仅 mock 可见） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-08-after-2.png | 次要18#8 | pending 态点「模拟审核通过」（仅 mock 可见） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-09-before.png | 次要18#9 | verified 态点「重新认证」→ showModal 确认（mockWxMethod confirm:true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-09-after-2.png | 次要18#9 | verified 态点「重新认证」→ showModal 确认（mockWxMethod confirm:true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-10-before.png | 次要18#10 | 重新填写并再次提交→模拟审核通过（为删除认证备态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-10-after-2.png | 次要18#10 | 重新填写并再次提交→模拟审核通过（为删除认证备态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-11-before.png | 次要18#11 | verified 态点「删除认证」（危险按钮）→ showModal 确认（mock confirm:true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-11-after-2.png | 次要18#11 | verified 态点「删除认证」（危险按钮）→ showModal 确认（mock confirm:true） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-12-before.png | 次要18#12 | 深链单页栈点左上返回键（页面打开立即返回） | ❌ 偏差 | MP-R1-VERIFY-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/VERIFY-INDEX-12-after-2.png | 次要18#12 | 深链单页栈点左上返回键（页面打开立即返回） | ❌ 偏差 | MP-R1-VERIFY-INDEX-001 | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-01-before.png | 次要18#13 | reLaunch 深链打开实名认证 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-01-after-2.png | 次要18#13 | reLaunch 深链打开实名认证 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-02-before.png | 次要18#14 | 真实姓名输入「李四」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-02-after.png | 次要18#14 | 真实姓名输入「李四」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-03-before.png | 次要18#15 | 身份证号输入 20 位超长（maxlength=18） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-03-after-2.png | 次要18#15 | 身份证号输入 20 位超长（maxlength=18） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-04-before.png | 次要18#16 | 身份证改为非法值 abc123 后点提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-04-after.png | 次要18#16 | 身份证改为非法值 abc123 后点提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-05-before.png | 次要18#17 | 身份证改正 18 位合法后点提交（缺证件照） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-05-after.png | 次要18#17 | 身份证改正 18 位合法后点提交（缺证件照） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-06-before.png | 次要18#18 | 点身份证正面卡（chooseImage mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-06-after.png | 次要18#18 | 点身份证正面卡（chooseImage mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-07-before.png | 次要18#19 | 点身份证背面卡（chooseImage mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-07-after-2.png | 次要18#19 | 点身份证背面卡（chooseImage mock） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-08-before.png | 次要18#20 | 表单齐全后点提交（mock 提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-08-after-2.png | 次要18#20 | 表单齐全后点提交（mock 提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-09-before.png | 次要18#21 | 深链单页栈点左上返回键 | ❌ 偏差 | MP-R1-REAL-NAME-001 | ✓ |
| reports/screenshots/round-1-interact/REAL-NAME-09-after-2.png | 次要18#21 | 深链单页栈点左上返回键 | ❌ 偏差 | MP-R1-REAL-NAME-001 | ✓ |
| reports/screenshots/round-1-interact/VISITORS-01-before.png | 次要18#22 | reLaunch 深链打开主页访客 | ❌ 偏差 | MP-R1-VISITORS-002 | ✓ |
| reports/screenshots/round-1-interact/VISITORS-01-after-2.png | 次要18#22 | reLaunch 深链打开主页访客 | ❌ 偏差 | MP-R1-VISITORS-002 | ✓ |
| reports/screenshots/round-1-interact/VISITORS-02-before.png | 次要18#23 | 点第一个访客卡片（苏晴） | ❌ 偏差 | MP-R1-VISITORS-001 | ✓ |
| reports/screenshots/round-1-interact/VISITORS-02-after-2.png | 次要18#23 | 点第一个访客卡片（苏晴） | ❌ 偏差 | MP-R1-VISITORS-001 | ✓ |
| reports/screenshots/round-1-interact/VISITORS-03-before.png | 次要18#24 | 滚动到列表底部（wx.pageScrollTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VISITORS-03-after.png | 次要18#24 | 滚动到列表底部（wx.pageScrollTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VISITORS-04-before.png | 次要18#25 | 下拉刷新（onPullDownRefresh） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VISITORS-04-after-2.png | 次要18#25 | 下拉刷新（onPullDownRefresh） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VISITORS-05-before.png | 次要18#26 | 点返回键（无上一页场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/VISITORS-05-after.png | 次要18#26 | 点返回键（无上一页场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-01-before.png | 次要18#27 | reLaunch 打开他人主页 other?userId=4002 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-01-after-2.png | 次要18#27 | reLaunch 打开他人主页 other?userId=4002 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-02-before.png | 次要18#28 | 点左上返回键（单页栈兜底） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-02-after-2.png | 次要18#28 | 点左上返回键（单页栈兜底） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-03-before.png | 次要18#29 | 顶部「···」→ ActionSheet 选「关注」（mockWxMethod tapIndex=2） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-03-after.png | 次要18#29 | 顶部「···」→ ActionSheet 选「关注」（mockWxMethod tapIndex=2） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-04-before.png | 次要18#30 | 点底部 FAB「更多操作」打开 BottomSheet | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-04-after-2.png | 次要18#30 | 点底部 FAB「更多操作」打开 BottomSheet | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-05-before.png | 次要18#31 | BottomSheet 点「分享给好友」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-05-after.png | 次要18#31 | BottomSheet 点「分享给好友」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-06-before.png | 次要18#32 | FAB→Sheet→「举报用户」→举报理由 ActionSheet(mock tapIndex=0) 提交 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-06-after.png | 次要18#32 | FAB→Sheet→「举报用户」→举报理由 ActionSheet(mock tapIndex=0) 提交 | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-07-before.png | 次要18#33 | 点生活瞬间第 1 张照片（全屏查看层） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-07-after.png | 次要18#33 | 点生活瞬间第 1 张照片（全屏查看层） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-08-before.png | 次要18#34 | 点查看层遮罩关闭大图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-08-after-2.png | 次要18#34 | 点查看层遮罩关闭大图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-09-before.png | 次要18#35 | 重置 mock likes 后点「喜欢」（首次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-09-after.png | 次要18#35 | 重置 mock likes 后点「喜欢」（首次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-10-before.png | 次要18#36 | 再点「喜欢」（重复提交） | ❌ 偏差 | MP-R1-OTHER-001 | ✓ |
| reports/screenshots/round-1-interact/OTHER-10-after.png | 次要18#36 | 再点「喜欢」（重复提交） | ❌ 偏差 | MP-R1-OTHER-001 | ✓ |
| reports/screenshots/round-1-interact/OTHER-11-before.png | 次要18#37 | 滚动到页面底部（wx.pageScrollTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-11-after.png | 次要18#37 | 滚动到页面底部（wx.pageScrollTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-12-before.png | 次要18#38 | 点「打招呼」→跳转聊天会话 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-12-after-2.png | 次要18#38 | 点「打招呼」→跳转聊天会话 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-13-before.png | 次要18#39 | 深链缺参 reLaunch other（无 userId）——回归 R12-IND-PROFILE-OTHER-001 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-13-after-2.png | 次要18#39 | 深链缺参 reLaunch other（无 userId）——回归 R12-IND-PROFILE-OTHER-001 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-14-before.png | 次要18#40 | FAB→Sheet→点「拉黑用户」→原生 showModal 弹出 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-14-after-2.png | 次要18#40、次要18#41 | FAB→Sheet→点「拉黑用户」→原生 showModal 弹出 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OTHER-15-after-2.png | 次要18#41 | 补充：other?userId=user-2003（mockLikedBy 成员）点「喜欢」→匹配弹窗 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-01-before.png | 次要18#42 | reLaunch 深链打开位置设置（onLoad 自动定位） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-01-after-2.png | 次要18#42 | reLaunch 深链打开位置设置（onLoad 自动定位） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-02-before.png | 次要18#43 | 点「重新定位」（真实 wx.getLocation） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-02-after-2.png | 次要18#43 | 点「重新定位」（真实 wx.getLocation） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-03-before.png | 次要18#44 | 点「地图选点」（chooseLocation mockWxMethod 返回固定地址） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-03-after-2.png | 次要18#44 | 点「地图选点」（chooseLocation mockWxMethod 返回固定地址） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-04-before.png | 次要18#45 | 点返回键（无上一页兜底） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-04-after-2.png | 次要18#45 | 点返回键（无上一页兜底） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-05-before.png | 次要18#46 | reLaunch 回位置页后点「返回首页」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/LOCATION-05-after-2.png | 次要18#46 | reLaunch 回位置页后点「返回首页」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-01-before.png | 次要18#47 | reLaunch 深链打开隐私设置 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-01-after-2.png | 次要18#47 | reLaunch 深链打开隐私设置 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-02-before.png | 次要18#48 | 点开关1「推荐给本校学生」关→开 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-02-after.png | 次要18#48 | 点开关1「推荐给本校学生」关→开 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-03-before.png | 次要18#49 | 再点开关1 开→关（恢复默认） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-03-after-2.png | 次要18#49 | 再点开关1 开→关（恢复默认） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-04-before.png | 次要18#50 | 点开关2「接收同校信息」开→关→开（恢复） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-04-after-2.png | 次要18#50 | 点开关2「接收同校信息」开→关→开（恢复） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-05-before.png | 次要18#51 | 点返回键（无上一页兜底） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-05-after-2.png | 次要18#51 | 点返回键（无上一页兜底） | ✅ 符合 | — | ✓ |

### 次要19.json（引用截图 108 个，存在 108，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/ALBUM-01-after.png | 次要19#1、次要19#2 | 打开我的相册页（reLaunch 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-02-after.png | 次要19#2 | 点击返回键（栈=1 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-03-before.png | 次要19#3 | navigateTo 进入后点返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-03-after.png | 次要19#3 | navigateTo 进入后点返回键 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-04-before.png | 次要19#4 | 点击已上传照片（第 1 格） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-04-after.png | 次要19#4 | 点击已上传照片（第 1 格） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-05-before.png | 次要19#5 | 长按已上传照片（第 2 格） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-05-after.png | 次要19#5 | 长按已上传照片（第 2 格） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-06-before.png | 次要19#6 | 长按第 2 张 → 选「设为头像」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-06-after.png | 次要19#6 | 长按第 2 张 → 选「设为头像」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-07-before.png | 次要19#7 | 长按照片 → 「删除」→ showModal 确认 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-07-after.png | 次要19#7 | 长按照片 → 「删除」→ showModal 确认 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-08-before.png | 次要19#8 | 长按照片 → 「删除」→ showModal 取消 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-08-after.png | 次要19#8 | 长按照片 → 「删除」→ showModal 取消 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-09-before.png | 次要19#9 | 点击空位「+」格子 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-09-after.png | 次要19#9 | 点击空位「+」格子 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-10-before.png | 次要19#10 | 快速连点「添加照片」按钮 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-10-after.png | 次要19#10 | 快速连点「添加照片」按钮 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-11-after.png | 次要19#11 | 页面打开 300ms 内立即点返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ALBUM-12-after.png | 次要19#12 | 重复进出页面 ×2（reLaunch→back 循环） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-01-after.png | 次要19#13 | 打开我的收藏页（reLaunch 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-02-before.png | 次要19#14 | 点击收藏卡片主体 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-02-after.png | 次要19#14 | 点击收藏卡片主体 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-03-before.png | 次要19#15 | 点击「取消收藏」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-03-after.png | 次要19#15 | 点击「取消收藏」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-04-after.png | 次要19#16 | 取消收藏后重复进入页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-05-before.png | 次要19#17 | 返回键（reLaunch 直达，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FAVORITES-05-after.png | 次要19#17 | 返回键（reLaunch 直达，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-01-after.png | 次要19#18 | 打开任务中心（reLaunch 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-02-before.png | 次要19#19 | 点击「每日签到」任务（未完成态） | ❌ 偏差 | MP-R1-TASKS-001 | ✓ |
| reports/screenshots/round-1-interact/TASKS-02-after.png | 次要19#19 | 点击「每日签到」任务（未完成态） | ❌ 偏差 | MP-R1-TASKS-001 | ✓ |
| reports/screenshots/round-1-interact/TASKS-03-before.png | 次要19#20 | 再次点击「每日签到」（点击后状态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-03-after.png | 次要19#20 | 再次点击「每日签到」（点击后状态） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-04-before.png | 次要19#21 | 快速连点签到任务 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-04-after.png | 次要19#21 | 快速连点签到任务 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-05-before.png | 次要19#22 | 点击「发布首条动态」任务 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-05-after.png | 次要19#22 | 点击「发布首条动态」任务 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-06-before.png | 次要19#23 | 点击「完成校园认证」任务 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-06-after.png | 次要19#23 | 点击「完成校园认证」任务 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-07-before.png | 次要19#24 | 点击「完善个人资料」任务（去完成态） | ❌ 偏差 | MP-R1-TASKS-003 | ✓ |
| reports/screenshots/round-1-interact/TASKS-07-after.png | 次要19#24 | 点击「完善个人资料」任务（去完成态） | ❌ 偏差 | MP-R1-TASKS-003 | ✓ |
| reports/screenshots/round-1-interact/TASKS-08-before.png | 次要19#25 | 返回键（reLaunch 直达，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/TASKS-08-after.png | 次要19#25 | 返回键（reLaunch 直达，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-01-after.png | 次要19#26 | 打开勿扰模式页（reLaunch 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-02-before.png | 次要19#27 | 切换总开关 switch | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-02-after.png | 次要19#27 | 切换总开关 switch | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-03-before.png | 次要19#28 | 点击重复方式「工作日」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-03-after.png | 次要19#28 | 点击重复方式「工作日」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-04-before.png | 次要19#29 | 点击「自定义」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-04-after.png | 次要19#29 | 点击「自定义」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-05-before.png | 次要19#30 | 点选「周一」「周三」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-05-after-redo.png | 次要19#30 | 点选「周一」「周三」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-06-before.png | 次要19#31 | 再点「周三」取消选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-06-after-redo.png | 次要19#31 | 再点「周三」取消选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-07-before.png | 次要19#32 | 切回「每天」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-07-after.png | 次要19#32 | 切回「每天」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-08-before.png | 次要19#33 | 自定义模式未选星期点「保存」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-08-after.png | 次要19#33 | 自定义模式未选星期点「保存」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-09-before.png | 次要19#34 | 正常配置点「保存」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-09-after.png | 次要19#34 | 正常配置点「保存」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-10-before.png | 次要19#35 | 快速连点「保存」×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-10-after.png | 次要19#35 | 快速连点「保存」×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-11-before.png | 次要19#36 | 切换「紧急消息穿透」switch | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-11-after.png | 次要19#36 | 切换「紧急消息穿透」switch | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-12-before.png | 次要19#37 | 点击「开始时间」picker 行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-12-after.png | 次要19#37 | 点击「开始时间」picker 行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DND-13-before.png | 次要19#38 | 返回键（reLaunch 直达，栈=1） | ❌ 偏差 | MP-R1-DND-001 | ✓ |
| reports/screenshots/round-1-interact/DND-13-after.png | 次要19#38 | 返回键（reLaunch 直达，栈=1） | ❌ 偏差 | MP-R1-DND-001 | ✓ |
| reports/screenshots/round-1-interact/HISTORY-01-after.png | 次要19#39 | 打开反馈历史页（reLaunch 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-02-before.png | 次要19#40 | 点击筛选「建议」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-02-after.png | 次要19#40 | 点击筛选「建议」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-03-before.png | 次要19#41 | 点击筛选「活动提案」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-03-after.png | 次要19#41 | 点击筛选「活动提案」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-04-after.png | 次要19#42 | 点击筛选「全部」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-05-before.png | 次要19#43 | 点击第 1 条记录展开详情 | ❌ 偏差 | MP-R1-HISTORY-001 | ✓ |
| reports/screenshots/round-1-interact/HISTORY-05-after.png | 次要19#43 | 点击第 1 条记录展开详情 | ❌ 偏差 | MP-R1-HISTORY-001 | ✓ |
| reports/screenshots/round-1-interact/HISTORY-06-after.png | 次要19#44 | 快速连点记录（展开→收起 toggle） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-07-before.png | 次要19#45 | 点击 AppShell 返回键（reLaunch 直达，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-07-after.png | 次要19#45 | 点击 AppShell 返回键（reLaunch 直达，栈=1） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/HISTORY-08-after.png | 次要19#46 | 带参 ?id=2 打开（反馈中心跳转入口） | ❌ 偏差 | MP-R1-HISTORY-001 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-01-after.png | 次要19#47 | 打开寻觅助手会话页（reLaunch 直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-02-after.png | 次要19#48 | 回归 MP-R1-OFFICIAL-003：加载后最后一条消息是否被输入栏截断 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-03-before.png | 次要19#49 | 输入框输入文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-03-after.png | 次要19#49、次要19#50 | 输入框输入文本 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-04-after.png | 次要19#50、次要19#51 | 点击「发送」按钮 | ✅ 符合/❌ 偏差 | MP-R1-OFFICIALCHAT-001 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-05-after.png | 次要19#51 | 发送后滚底回归测量（MP-R1-OFFICIAL-003 残留检查） | ❌ 偏差 | MP-R1-OFFICIALCHAT-001 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-06-before.png | 次要19#52 | 清空输入后点「发送」（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-06-after.png | 次要19#52 | 清空输入后点「发送」（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-07-before.png | 次要19#53 | 输入纯空格后点「发送」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-07-after.png | 次要19#53 | 输入纯空格后点「发送」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-08-before.png | 次要19#54 | 发送超长文本（约 300 字） | ❌ 偏差 | MP-R1-OFFICIALCHAT-001 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-08-after.png | 次要19#54 | 发送超长文本（约 300 字） | ❌ 偏差 | MP-R1-OFFICIALCHAT-001 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-09-before.png | 次要19#55 | 发送特殊字符（script/引号/emoji/模板串） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-09-after.png | 次要19#55 | 发送特殊字符（script/引号/emoji/模板串） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-10-before.png | 次要19#56 | 快速连点「发送」×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-10-after.png | 次要19#56 | 快速连点「发送」×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-11-before.png | 次要19#57 | 点击活动卡片「查看详情」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-11-after.png | 次要19#57 | 点击活动卡片「查看详情」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-12-before.png | 次要19#58 | 点击导航栏右侧「···」图标 | ❌ 偏差 | MP-R1-OFFICIALCHAT-002 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-12-after.png | 次要19#58 | 点击导航栏右侧「···」图标 | ❌ 偏差 | MP-R1-OFFICIALCHAT-002 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-13-before.png | 次要19#59 | 点击输入栏「+」按钮 | ❌ 偏差 | MP-R1-OFFICIALCHAT-002 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-13-after.png | 次要19#59 | 点击输入栏「+」按钮 | ❌ 偏差 | MP-R1-OFFICIALCHAT-002 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-14-before.png | 次要19#60 | 点击输入栏表情图标 | ❌ 偏差 | MP-R1-OFFICIALCHAT-002 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-14-after.png | 次要19#60 | 点击输入栏表情图标 | ❌ 偏差 | MP-R1-OFFICIALCHAT-002 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-15-before.png | 次要19#61 | 点击导航栏返回键（reLaunch 直达，栈=1） | ❌ 偏差 | MP-R1-OFFICIALCHAT-003 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-15-after.png | 次要19#61 | 点击导航栏返回键（reLaunch 直达，栈=1） | ❌ 偏差 | MP-R1-OFFICIALCHAT-003 | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-16-after.png | 次要19#62 | 页面打开 400ms 内（骨架期）立即点返回 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/OFFICIAL-CHAT-17-after.png | 次要19#63 | 重复进出页面 ×2 | ✅ 符合 | — | ✓ |

### 次要20.json（引用截图 165 个，存在 165，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SETUPPROFILE-01-before.png | 次要20#1 | 页面加载（向导模式默认进入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-01-after.png | 次要20#1 | 页面加载（向导模式默认进入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-01-after2.png | 次要20#1 | 页面加载（向导模式默认进入） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-02-before.png | 次要20#2 | 昵称输入（正常文本） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-02-after.png | 次要20#2 | 昵称输入（正常文本） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-02-after2.png | 次要20#2 | 昵称输入（正常文本） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-03-before.png | 次要20#3 | 清空昵称后点保存（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-03-after.png | 次要20#3 | 清空昵称后点保存（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-03-after2.png | 次要20#3 | 清空昵称后点保存（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-04-before.png | 次要20#4 | 超长昵称（34字符 > 上限30）后点保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-04-after.png | 次要20#4 | 超长昵称（34字符 > 上限30）后点保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-04-after2.png | 次要20#4 | 超长昵称（34字符 > 上限30）后点保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-05-before.png | 次要20#5 | 个性签名输入特殊字符/emoji/HTML | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-05-after.png | 次要20#5 | 个性签名输入特殊字符/emoji/HTML | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-05-after2.png | 次要20#5 | 个性签名输入特殊字符/emoji/HTML | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-06-before.png | 次要20#6 | 年级选择器变更（picker change value=4 → 研一） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-06-after.png | 次要20#6 | 年级选择器变更（picker change value=4 → 研一） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-06-after2.png | 次要20#6 | 年级选择器变更（picker change value=4 → 研一） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-07-before.png | 次要20#7 | 身高选择器变更（picker change value=25 → 165cm） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-07-after.png | 次要20#7 | 身高选择器变更（picker change value=25 → 165cm） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-07-after2.png | 次要20#7 | 身高选择器变更（picker change value=25 → 165cm） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-08-before.png | 次要20#8 | 学历/感情状态选择器变更（本科 / 从未恋爱） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-08-after.png | 次要20#8 | 学历/感情状态选择器变更（本科 / 从未恋爱） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-08-after2.png | 次要20#8 | 学历/感情状态选择器变更（本科 / 从未恋爱） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-09-before.png | 次要20#9 | 籍贯省/市、未来城市输入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-09-after.png | 次要20#9 | 籍贯省/市、未来城市输入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-09-after2.png | 次要20#9 | 籍贯省/市、未来城市输入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-10-before.png | 次要20#10 | 理想型画像 textarea 输入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-10-after.png | 次要20#10 | 理想型画像 textarea 输入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-10-after2.png | 次要20#10 | 理想型画像 textarea 输入 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-11-before.png | 次要20#11 | 身份单选切换：学生→非学生→学生 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-11-after.png | 次要20#11 | 身份单选切换：学生→非学生→学生 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-11-after2.png | 次要20#11 | 身份单选切换：学生→非学生→学生 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-12-before.png | 次要20#12 | 滚动到底部再回顶部 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-12-after.png | 次要20#12 | 滚动到底部再回顶部 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-12-after2.png | 次要20#12 | 滚动到底部再回顶部 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-13-before.png | 次要20#13 | 快速连续点击保存 ×3（提交锁） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-13-after.png | 次要20#13 | 快速连续点击保存 ×3（提交锁） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-13-after2.png | 次要20#13 | 快速连续点击保存 ×3（提交锁） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-14-before.png | 次要20#14 | 编辑模式进入（?entry=edit） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-14-after.png | 次要20#14 | 编辑模式进入（?entry=edit） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-14-after2.png | 次要20#14 | 编辑模式进入（?entry=edit） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-15-before.png | 次要20#15 | 编辑模式保存后应返回（回归 MP-R6-EDITFLOW） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-15-after.png | 次要20#15 | 编辑模式保存后应返回（回归 MP-R6-EDITFLOW） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-15-after2.png | 次要20#15 | 编辑模式保存后应返回（回归 MP-R6-EDITFLOW） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-16-before.png | 次要20#16 | 点击头像 → ActionSheet（相册/相机） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-16-after.png | 次要20#16 | 点击头像 → ActionSheet（相册/相机） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-16-after2.png | 次要20#16 | 点击头像 → ActionSheet（相册/相机） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-17-before.png | 次要20#17 | 照片墙空槽上传（mock chooseImage + mock ActionSheet 选相册） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-17-after.png | 次要20#17 | 照片墙空槽上传（mock chooseImage + mock ActionSheet 选相册） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-17-after2.png | 次要20#17 | 照片墙空槽上传（mock chooseImage + mock ActionSheet 选相册） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-18-before.png | 次要20#18 | 点击已占用照片槽 → 删除确认弹窗（mock 确认） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-18-after.png | 次要20#18 | 点击已占用照片槽 → 删除确认弹窗（mock 确认） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-18-after2.png | 次要20#18 | 点击已占用照片槽 → 删除确认弹窗（mock 确认） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-19-before.png | 次要20#19 | 点击 hero 返回按钮（无栈场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-19-after.png | 次要20#19 | 点击 hero 返回按钮（无栈场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-19-after2.png | 次要20#19 | 点击 hero 返回按钮（无栈场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-20-before.png | 次要20#20 | 页面打开立即返回 ×3（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-20-after.png | 次要20#20 | 页面打开立即返回 ×3（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPPROFILE-20-after2.png | 次要20#20 | 页面打开立即返回 ×3（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-01-before.png | 次要20#21 | 页面加载（mock 资料回显） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-01-after.png | 次要20#21 | 页面加载（mock 资料回显） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-01-after2.png | 次要20#21 | 页面加载（mock 资料回显） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-02-before.png | 次要20#22 | 点击「?」隐私说明图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-02-after.png | 次要20#22、次要20#47 | 点击「?」隐私说明图标 | ✅ 符合/❌ 偏差 | MP-R1-SETUPCAMPUS-001 | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-02-after2.png | 次要20#22 | 点击「?」隐私说明图标 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-03-before.png | 次要20#23、次要20#47 | 城市选择变更（联动重置） | ✅ 符合/❌ 偏差 | MP-R1-SETUPCAMPUS-001 | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-03-after.png | 次要20#23 | 城市选择变更（联动重置） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-03-after2.png | 次要20#23 | 城市选择变更（联动重置） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-04-before.png | 次要20#24 | 学校选择（随城市联动）+ 专业选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-04-after.png | 次要20#24 | 学校选择（随城市联动）+ 专业选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-04-after2.png | 次要20#24 | 学校选择（随城市联动）+ 专业选择 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-05-before.png | 次要20#25 | 保存校园资料（补认证场景：已有 campusProfile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-05-after.png | 次要20#25 | 保存校园资料（补认证场景：已有 campusProfile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-05-after2.png | 次要20#25 | 保存校园资料（补认证场景：已有 campusProfile） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-06-before.png | 次要20#26 | 点击「跳过」入口（补认证场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-06-after.png | 次要20#26 | 点击「跳过」入口（补认证场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-06-after2.png | 次要20#26 | 点击「跳过」入口（补认证场景） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-07-before.png | 次要20#27 | AppShell 返回按钮（无栈兜底）+ 打开立即返回 ×2 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-07-after.png | 次要20#27 | AppShell 返回按钮（无栈兜底）+ 打开立即返回 ×2 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPCAMPUS-07-after2.png | 次要20#27 | AppShell 返回按钮（无栈兜底）+ 打开立即返回 ×2 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-01-before.png | 次要20#28 | 页面加载（mock 回显） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-01-after.png | 次要20#28 | 页面加载（mock 回显） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-01-after2.png | 次要20#28 | 页面加载（mock 回显） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-02-before.png | 次要20#29 | 清空常用区域后保存（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-02-after.png | 次要20#29 | 清空常用区域后保存（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-02-after2.png | 次要20#29 | 清空常用区域后保存（空内容提交） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-03-before.png | 次要20#30 | 区域已填、时段全空时保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-03-after.png | 次要20#30 | 区域已填、时段全空时保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-03-after2.png | 次要20#30 | 区域已填、时段全空时保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-04-before.png | 次要20#31 | 点击「＋ 添加时段」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-04-after.png | 次要20#31 | 点击「＋ 添加时段」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-04-after2.png | 次要20#31 | 点击「＋ 添加时段」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-05-before.png | 次要20#32 | 新时段行输入 + 删除第一行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-05-after.png | 次要20#32 | 新时段行输入 + 删除第一行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-05-after2.png | 次要20#32 | 新时段行输入 + 删除第一行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-06-before.png | 次要20#33 | 有效数据保存 → 进入推荐偏好 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-06-after.png | 次要20#33 | 有效数据保存 → 进入推荐偏好 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-06-after2.png | 次要20#33 | 有效数据保存 → 进入推荐偏好 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-07-before.png | 次要20#34 | 空表单快速连点保存 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-07-after.png | 次要20#34 | 空表单快速连点保存 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPSCHEDULE-07-after2.png | 次要20#34 | 空表单快速连点保存 ×3 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-01-before.png | 次要20#35 | 页面加载 → 错误态（GET preferences 失败） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-01-after.png | 次要20#35 | 页面加载 → 错误态（GET preferences 失败） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-01-after2.png | 次要20#35 | 页面加载 → 错误态（GET preferences 失败） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-02-before.png | 次要20#36 | 点击「重试」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-02-after.png | 次要20#36 | 点击「重试」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-02-after2.png | 次要20#36 | 点击「重试」按钮 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-08-before.png | 次要20#37 | AppShell 返回按钮 + 重复进出 ×2 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-08-after.png | 次要20#37 | AppShell 返回按钮 + 重复进出 ×2 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPRECOMMENDPREF-08-after2.png | 次要20#37 | AppShell 返回按钮 + 重复进出 ×2 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-01-before.png | 次要20#38 | 页面加载与标题（回归 MP-R9-STATUS-005） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-01-after.png | 次要20#38 | 页面加载与标题（回归 MP-R9-STATUS-005） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-01-after2.png | 次要20#38 | 页面加载与标题（回归 MP-R9-STATUS-005） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-02-before.png | 次要20#39 | 滚动到底部再回顶部 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-02-after.png | 次要20#39 | 滚动到底部再回顶部 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-02-after2.png | 次要20#39 | 滚动到底部再回顶部 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-03-before.png | 次要20#40 | 选中 2 个兴趣后点保存（<3 校验） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-03-after.png | 次要20#40 | 选中 2 个兴趣后点保存（<3 校验） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-03-after2.png | 次要20#40 | 选中 2 个兴趣后点保存（<3 校验） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-04-before.png | 次要20#41 | 选满 3 个后保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-04-after.png | 次要20#41 | 选满 3 个后保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-04-after2.png | 次要20#41 | 选满 3 个后保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-05-before.png | 次要20#42 | 重复进入回显已选兴趣 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-05-after.png | 次要20#42 | 重复进入回显已选兴趣 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-05-after2.png | 次要20#42 | 重复进入回显已选兴趣 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-06-before.png | 次要20#43 | 取消选中已选标签 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-06-after.png | 次要20#43 | 取消选中已选标签 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-06-after2.png | 次要20#43 | 取消选中已选标签 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-07-before.png | 次要20#44 | 兴趣组上限（max=5）超限提示 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-07-after.png | 次要20#44 | 兴趣组上限（max=5）超限提示 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-07-after2.png | 次要20#44 | 兴趣组上限（max=5）超限提示 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-08-before.png | 次要20#45 | 返回 + 打开立即返回（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-08-after.png | 次要20#45 | 返回 + 打开立即返回（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPINTEREST-08-after2.png | 次要20#45 | 返回 + 打开立即返回（重复进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPDEV-01-before.png | 次要20#46 | DEV 调试页可达性（#ifdef DEV 仅开发构建注册） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPDEV-01-after.png | 次要20#46 | DEV 调试页可达性（#ifdef DEV 仅开发构建注册） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/SETUPDEV-01-after2.png | 次要20#46 | DEV 调试页可达性（#ifdef DEV 仅开发构建注册） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-01-before.png | 次要20#48 | 超长昵称（40字符 > 上限30）后保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-01-after.png | 次要20#48 | 超长昵称（40字符 > 上限30）后保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-01-after2.png | 次要20#48 | 超长昵称（40字符 > 上限30）后保存 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-02-before.png | 次要20#49 | 身份切换持久化（storage key=campus-love:user-identity） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-02-after.png | 次要20#49 | 身份切换持久化（storage key=campus-love:user-identity） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-02-after2.png | 次要20#49 | 身份切换持久化（storage key=campus-love:user-identity） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-03-before.png | 次要20#50 | 向导模式保存成功后的跳转（单次点击 + 6s 轮询） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-03-after.png | 次要20#50 | 向导模式保存成功后的跳转（单次点击 + 6s 轮询） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-03-after2.png | 次要20#50 | 向导模式保存成功后的跳转（单次点击 + 6s 轮询） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-04-before.png | 次要20#51 | 直接 uni.redirectTo 校园认证页（导航能力隔离验证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-04-after.png | 次要20#51 | 直接 uni.redirectTo 校园认证页（导航能力隔离验证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-04-after2.png | 次要20#51 | 直接 uni.redirectTo 校园认证页（导航能力隔离验证） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-05-before.png | 次要20#52 | 编辑模式（?entry=edit）填齐保存 → 应返回「我的」页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-05-after.png | 次要20#52 | 编辑模式（?entry=edit）填齐保存 → 应返回「我的」页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-05-after2.png | 次要20#52 | 编辑模式（?entry=edit）填齐保存 → 应返回「我的」页 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-06-before.png | 次要20#53 | 照片墙空槽上传（mock 选图）→ gallery 4→5 且第5槽出图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-06-after.png | 次要20#53 | 照片墙空槽上传（mock 选图）→ gallery 4→5 且第5槽出图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-06-after2.png | 次要20#53 | 照片墙空槽上传（mock 选图）→ gallery 4→5 且第5槽出图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-07-before.png | 次要20#54 | 点击已占用槽 → 删除确认（mock confirm）→ gallery 5→4 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-07-after.png | 次要20#54 | 点击已占用槽 → 删除确认（mock confirm）→ gallery 5→4 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-PROFILE-07-after2.png | 次要20#54 | 点击已占用槽 → 删除确认（mock confirm）→ gallery 5→4 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-INTEREST-01-before.png | 次要20#55 | 兴趣组选择至上限（max=5）+ 第6个超限 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-INTEREST-01-after.png | 次要20#55 | 兴趣组选择至上限（max=5）+ 第6个超限 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-INTEREST-01-after2.png | 次要20#55 | 兴趣组选择至上限（max=5）+ 第6个超限 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/RE-INTEREST-02-before.png | 次要20#56 | 兴趣保存（5个已选）→ 再进入回显 | ❌ 偏差 | MP-R1-SETUPINTEREST-001 | ✓ |
| reports/screenshots/round-1-interact/RE-INTEREST-02-after.png | 次要20#56 | 兴趣保存（5个已选）→ 再进入回显 | ❌ 偏差 | MP-R1-SETUPINTEREST-001 | ✓ |
| reports/screenshots/round-1-interact/RE-INTEREST-02-after2.png | 次要20#56 | 兴趣保存（5个已选）→ 再进入回显 | ❌ 偏差 | MP-R1-SETUPINTEREST-001 | ✓ |

### 次要21.json（引用截图 82 个，存在 82，缺失 0）

| 截图 | 引用用例 | 操作（摘要） | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|---|
| reports/screenshots/round-1-interact/SHOWCASE-01-before.png | 次要21#1 | 直达打开页面（reLaunch 模拟冷直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SHOWCASE-01-after.png | 次要21#1 | 直达打开页面（reLaunch 模拟冷直达） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SHOWCASE-02-before.png | 次要21#2 | 重复直达（第二次 reLaunch 进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/SHOWCASE-02-after.png | 次要21#2 | 重复直达（第二次 reLaunch 进出） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-01-before.png | 次要21#3 | 打开页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-01-after.png | 次要21#3 | 打开页面 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-02-before.png | 次要21#4 | 点击「建议」类型 chip 切换 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-02-after.png | 次要21#4 | 点击「建议」类型 chip 切换 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-03-before.png | 次要21#5 | 标题输入框正常输入+清空 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-03-after.png | 次要21#5 | 标题输入框正常输入+清空 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-04-before.png | 次要21#6 | 内容输入超长文本 6000 字 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-04-after.png | 次要21#6 | 内容输入超长文本 6000 字 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-05-before.png | 次要21#7 | 内容输入特殊字符（script 标签/引号/反引号/emoji/零宽字符/换行制表） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-05-after.png | 次要21#7 | 内容输入特殊字符（script 标签/引号/反引号/emoji/零宽字符/换行制表） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-06-before.png | 次要21#8 | 空内容点击提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-06-after.png | 次要21#8 | 空内容点击提交 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-07-before.png | 次要21#9 | 填写标题/内容/微信号后正常提交 | ✅ 符合 | MP-R1-FEEDBACK-001 | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-07-after.png | 次要21#9 | 填写标题/内容/微信号后正常提交 | ✅ 符合 | MP-R1-FEEDBACK-001 | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-08-before.png | 次要21#10 | 快速连续点击提交按钮（两次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-08-after.png | 次要21#10 | 快速连续点击提交按钮（两次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-09-before.png | 次要21#11 | 点击「历史记录」入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-09-after.png | 次要21#11 | 点击「历史记录」入口 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-10-before.png | 次要21#12 | 点击提交记录行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-10-after.png | 次要21#12 | 点击提交记录行 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-11-before.png | 次要21#13 | 点击 AppShell 顶部返回（页面栈仅 1 页） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/FEEDBACK-11-after.png | 次要21#13 | 点击 AppShell 顶部返回（页面栈仅 1 页） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-01-before.png | 次要21#14 | 打开页面（R10-P3-018 回归点） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-01-after.png | 次要21#14 | 打开页面（R10-P3-018 回归点） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-02-before.png | 次要21#15 | 点击推荐条目（真实弹窗） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-02-after.png | 次要21#15 | 点击推荐条目（真实弹窗） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-03-before.png | 次要21#16 | 弹窗点击「去寻觅」（确认分支） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-03-after.png | 次要21#16 | 弹窗点击「去寻觅」（确认分支） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-04-before.png | 次要21#17 | 弹窗点击「取消」（取消分支） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-04-after.png | 次要21#17 | 弹窗点击「取消」（取消分支） | ⚠️ 无法验证 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-05-before.png | 次要21#18 | 点击底部主按钮「去寻觅」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-05-after.png | 次要21#18 | 点击底部主按钮「去寻觅」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-06-before.png | 次要21#19 | 点击底部次按钮「反馈讨论建议」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/DISCUSSIONS-06-after.png | 次要21#19 | 点击底部次按钮「反馈讨论建议」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-01-before.png | 次要21#20 | 打开页面（默认列表视图） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-01-after.png | 次要21#20 | 打开页面（默认列表视图） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-02-before.png | 次要21#21 | 快捷筛选「今天」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-02-after.png | 次要21#21 | 快捷筛选「今天」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-03-before.png | 次要21#22 | 快捷筛选「周末」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-03-after.png | 次要21#22 | 快捷筛选「周末」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-04-before.png | 次要21#23 | 快捷筛选回「全部」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-04-after.png | 次要21#23 | 快捷筛选回「全部」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-05-before.png | 次要21#24 | 切换「日历」视图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-05-after.png | 次要21#24 | 切换「日历」视图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-06-before.png | 次要21#25 | 点击今日（有活动）日期格 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-06-after.png | 次要21#25 | 点击今日（有活动）日期格 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-07-before.png | 次要21#26 | 点击当月无活动日期格 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-07-after.png | 次要21#26 | 点击当月无活动日期格 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-08-before.png | 次要21#27 | 月份切换 ›（下月） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-08-after.png | 次要21#27 | 月份切换 ›（下月） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-09-before.png | 次要21#28 | 月份切换 ‹‹（上月×2）再 › 回当月 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-09-after.png | 次要21#28 | 月份切换 ‹‹（上月×2）再 › 回当月 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-10-before.png | 次要21#29 | 切回「列表」视图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-10-after.png | 次要21#29 | 切回「列表」视图 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-11-before.png | 次要21#30 | 点击 a-1 报名按钮（感兴趣） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-11-after.png | 次要21#30 | 点击 a-1 报名按钮（感兴趣） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-12-before.png | 次要21#31 | 再次点击报名按钮（取消报名） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-12-after.png | 次要21#31 | 再次点击报名按钮（取消报名） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-13-before.png | 次要21#32 | 快速连点 a-2 报名按钮（两次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-13-after.png | 次要21#32 | 快速连点 a-2 报名按钮（两次） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-14-before.png | 次要21#33 | 点击活动卡片主体 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-14-after.png | 次要21#33 | 点击活动卡片主体 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-15-before.png | 次要21#34 | 列表滚动到底 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-15-after.png | 次要21#34 | 列表滚动到底 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-16-before.png | 次要21#35 | 点击 AppShell 顶部返回（页面栈仅 1 页） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/ACTIVITIES-16-after.png | 次要21#35 | 点击 AppShell 顶部返回（页面栈仅 1 页） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-01-before.png | 次要21#36 | 带页面栈打开（讨论圈 → navigateTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-01-after.png | 次要21#36 | 带页面栈打开（讨论圈 → navigateTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-02-before.png | 次要21#37 | 正文 scroll-view 滚动到底 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-02-after.png | 次要21#37 | 正文 scroll-view 滚动到底 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-03-before.png | 次要21#38 | 点击「我已阅读并同意」（有页面栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-03-after.png | 次要21#38 | 点击「我已阅读并同意」（有页面栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-04-before.png | 次要21#39 | 冷启动直达后点击「我已阅读并同意」（无页面栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/PRIVACY-legal-04-after.png | 次要21#39 | 冷启动直达后点击「我已阅读并同意」（无页面栈） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/AGREEMENT-01-before.png | 次要21#40 | 带页面栈打开（发现 tab → navigateTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/AGREEMENT-01-after.png | 次要21#40 | 带页面栈打开（发现 tab → navigateTo） | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/AGREEMENT-02-before.png | 次要21#41 | 点击「我已阅读并同意」 | ✅ 符合 | — | ✓ |
| reports/screenshots/round-1-interact/AGREEMENT-02-after.png | 次要21#41 | 点击「我已阅读并同意」 | ✅ 符合 | — | ✓ |

## 四、控制台与过程证据文件

- `.mimosa`（0 字节）
- `console-PAGES-DISCOVER-INDEX.log`（91 字节） — 首行：2026-09-20T03:00:50.977Z [error] routeDone with a webviewId 13 that is not the current page
- `console-evidence-PAGES-LOGIN-INDEX.log`（27602 字节） — 首行：[2026-09-19T18:36:59.411Z][client] connected
- `console-evidence-PAGES-PROFILE-INDEX.log`（564 字节） — 首行：[2026-09-20T05:23:43.619Z][client] connected
- `console-evidence-c18.log`（2399 字节） — 首行：[2026-09-21T04:46:32.207Z][error] [Global Error][uni.onUnhandledRejection] {"errMsg":"navigateBack:fail cannot navigate …
- `console-fixup-PAGES-DISCOVER-INDEX.log`（1445 字节） — 首行：2026-09-20T03:06:20.176Z [error] swipeRight error: [object Object]
- `interact-log.txt`（2372 字节）
- `interact-observations.json`（113 字节）

各判定文件 consoleSummary 摘录：

  - PAGES-LOGIN-INDEX.json：全部交互过程 console 无 TypeError / is not defined / ReferenceError / EXCEPTION / NAV_FAIL；error 级日志均为登录失败时 Sentry captureException 按设计上报（source=http, /v1/auth/wechat 502、/v1/auth/phone-l…

## 五、blank-check.tsv（145 行）首 6 行

```
identity	file	bytes	dim	gray_std	entropy	colors	status
A	PAGES_DISCOVER_INDEX-默认.png	220871	377x814	98.11	6.05	63381	ok
A	PAGES_HOME_INDEX-滚动后.png	115841	377x814	49.1	3.59	17522	ok
A	PAGES_HOME_INDEX-默认.png	158478	377x814	67.38	4.87	29048	ok
A	PAGES_LOGIN_INDEX-交互后.png	105428	377x814	70.87	4.06	15262	ok
A	PAGES_LOGIN_INDEX-默认.png	166791	377x814	55.78	4.61	49885	ok
```
