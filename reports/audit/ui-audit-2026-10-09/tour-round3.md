# 第 3 轮巡检 · 批次 1/1（回归批）——增量台账

- 开工时间：2026-10-10T08:00Z 前后（UTC）；通道：WS 9420（mock 档 ownerPid=33352）
- REALCOV：本批 11 路由与 9 条点名用例所在页零交集（VB03=subpackages/vip/bills 不在本批）⇒ 无 REALCOV 腿
- 方法：桥开页 + WS 取证 + CLI 出帧 + 应用内 console 包装器/生命周期重放（实证读数）

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | pages/login/index | NAV_FAIL | screenshots/r3-b0-01-pages-login-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 2 | pages/nearby/index | NAV_FAIL | screenshots/r3-b0-02-pages-nearby-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 3 | subpackages/village/village/tag-posts | NAV_FAIL | screenshots/r3-b0-03-subpackages-village-village-tag-posts.png | 268 | 落点=subpackages/village/village/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 4 | subpackages/campus/campus/index | NAV_FAIL | screenshots/r3-b0-04-subpackages-campus-campus-index.png | 31 | 落点=subpackages/campus/campus/hub（页内守卫/参数缺失重定向）；单操作无超时 |
| 5 | subpackages/discover-extra/discover/matching | NAV_FAIL | screenshots/r3-b0-05-subpackages-discover-extra-discover-matching.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 6 | subpackages/setup/campus/index | NAV_FAIL | screenshots/r3-b0-06-subpackages-setup-campus-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 7 | subpackages/setup/recommend-pref/index | NAV_FAIL | screenshots/r3-b0-07-subpackages-setup-recommend-pref-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 8 | subpackages/setup/dev/index | NAV_FAIL | screenshots/r3-b0-08-subpackages-setup-dev-index.png | 0 | 单操作无超时；帧显示 page not found（#ifdef 编译期剔除稳定复现，第 5 次同判定=预期 NOT_REGISTERED）… |
| 9 | subpackages/setup/showcase/index | NAV_FAIL | screenshots/r3-b0-09-subpackages-setup-showcase-index.png | 0 | 单操作无超时；帧显示 page not found（#ifdef 编译期剔除稳定复现，第 5 次同判定=预期 NOT_REGISTERED）… |
| 10 | subpackages/vip/index | NAV_FAIL | screenshots/r3-b0-10-subpackages-vip-index.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 11 | subpackages/vip/promo-code | NAV_FAIL | screenshots/r3-b0-11-subpackages-vip-promo-code.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |

## 批次小结

- 11 页全部采完：11 NAV_FAIL——全部为守卫/编译期剔除类预期行为，零漂移（与第 1 轮/回归批/第 2 轮回归逐条一致）：login loggedOutOnly 弹回 discover；nearby 弹回（产品缺陷候选，R2-NEARBY-09 在册）；tag-posts 参数回退；campus/index 并入 hub；matching/onboarding×2 弹回 discover；dev/showcase 编译期剔除第 5 次复现（帧 page not found）；vip/index+promo-code 旗标封存弹回 profile。
- 帧：11/11 落盘（screenshots/r3-b0-01…11）；console：11 份包装器+生命周期重放实证读数（全部零输出；方法局限=首帧原文因 AppService 随桥开页重启不可得）。
- 安全抽测：campus/index 引导 CTA 类按写守卫跳过；本批无其它写类主按钮；无守卫漏。
- REALCOV：本批与 9 条点名用例所在页零交集，无 real 腿；门禁欠账维持 5（OT05/OT06/OT09/VRN07/OC09），立案状态见 tour-ledger.json。
