# 第 2 轮巡检 · 批次 1/1（回归批）——增量台账

- 开工时间：2026-10-10T07:00Z 前后（UTC）；通道：WS 9420（mock 档）
- REALCOV：本批 11 路由与 9 条点名用例所在页零交集（VB03=subpackages/vip/bills 不在本批，vip/index/promo-code 为旗标弹回页）⇒ 本批无 REALCOV 腿
- 护栏：同第 1 轮（删除/解绑/同意/写操作 SKIP(guard)；支付/VIP 封存验态）
- 方法：桥开页 + WS 取证 + CLI 出帧 + 应用内 console 包装器/生命周期重放（实证读数）

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | pages/login/index | NAV_FAIL | screenshots/r2-b0-01-pages-login-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 2 | pages/nearby/index | NAV_FAIL | screenshots/r2-b0-02-pages-nearby-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 3 | subpackages/village/village/tag-posts | NAV_FAIL | screenshots/r2-b0-03-subpackages-village-village-tag-posts.png | 268 | 落点=subpackages/village/village/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 4 | subpackages/campus/campus/index | NAV_FAIL | screenshots/r2-b0-04-subpackages-campus-campus-index.png | 31 | 落点=subpackages/campus/campus/hub（页内守卫/参数缺失重定向）；单操作无超时 |
| 5 | subpackages/discover-extra/discover/matching | NAV_FAIL | screenshots/r2-b0-05-subpackages-discover-extra-discover-matching.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 6 | subpackages/setup/campus/index | NAV_FAIL | screenshots/r2-b0-06-subpackages-setup-campus-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 7 | subpackages/setup/recommend-pref/index | NAV_FAIL | screenshots/r2-b0-07-subpackages-setup-recommend-pref-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 8 | subpackages/setup/dev/index | NAV_OK | screenshots/r2-b0-08-subpackages-setup-dev-index.png | 0 | 单操作无超时 |
| 9 | subpackages/setup/showcase/index | NAV_OK | screenshots/r2-b0-09-subpackages-setup-showcase-index.png | 0 | 单操作无超时 |
| 10 | subpackages/vip/index | NAV_FAIL | screenshots/r2-b0-10-subpackages-vip-index.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 11 | subpackages/vip/promo-code | NAV_FAIL | screenshots/r2-b0-11-subpackages-vip-promo-code.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |

## 批次小结

- 11 页全部采完：11 NAV_FAIL——全部为守卫/编译期剔除类预期行为，零漂移：login 登录态 loggedOutOnly 弹回 discover；nearby 弹回 discover（归因待人工，第 3 次同向）；tag-posts 缺 tag 参数回退 village/index；campus/index 并入 hub；matching 弹回 discover（待人工归因）；setup/campus+recommend-pref onboarding 弹回；setup/dev+showcase 编译期剔除（帧 page not found 第 3 次复现=NOT_REGISTERED，机读 OK 假象已按帧改判）；vip/index+promo-code 旗标封存弹回 profile（membershipEnabled=false）。
- 帧：11/11 落盘（screenshots/r2-b0-01…11）；console：11 份包装器+生命周期重放实证读数（全部零输出，与第 1 轮 73 路由重采一致；方法局限=首帧原文因 AppService 随桥开页重启不可得）。
- 安全抽测：campus/index 的 school-card__cta 按 SKIP(guard) 跳过；本批无其它写类主按钮被 tap；无守卫漏。
- REALCOV：本批与 9 条点名用例所在页零交集，无 real 腿；门禁欠账维持 5（OT05/OT06/OT09/VRN07/OC09），阻塞与立案状态见 tour-ledger.json fixlane 节。
- 对照：与回归批（tour-round1-regression.json，10 同名页）判定完全一致——第 2 轮零漂移。
