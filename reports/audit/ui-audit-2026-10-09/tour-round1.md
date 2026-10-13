# 第 1 轮巡检 · 批次 1/5（全量批）——增量台账

- 开工时间：2026-10-09T17:40Z（UTC）；HEAD=f9fd17b1
- 通道：WS 9420（mock 档，WS_UP=OK + WS_UP_BAND=match，envSha8=f1c7b96b）；出帧走 CLI 桥 simulator_screenshot
- 护栏：支付/VIP 拉起只验封存态；删除/解绑/同意类一律 SKIP(guard)；真实档写操作除 REALCOV 点名页外不做
- 本文件由 tmp/qa/gen-tour-round1-md.mjs 从 rows-batch1/2.json 全量重建（批次 2 期间发现正则逐行补丁把批次 1 表压成单行，弃用该方式）

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | pages/login/index | NAV_FAIL | screenshots/r1-b0-01-pages-login-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 2 | pages/register/index | NAV_OK | screenshots/r1-b0-02-pages-register-index.png | 12 | 单操作无超时 |
| 3 | pages/register/success | NAV_OK | screenshots/r1-b0-03-pages-register-success.png | 2 | 单操作无超时 |
| 4 | pages/discover/index | NAV_OK | screenshots/r1-b0-04-pages-discover-index.png | 22 | 单操作无超时 |
| 5 | pages/home/index | NAV_OK | screenshots/r1-b0-05-pages-home-index.png | 30 | 单操作无超时 |
| 6 | pages/nearby/index | NAV_FAIL | screenshots/r1-b0-06-pages-nearby-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 7 | pages/messages/index | NAV_OK | screenshots/r1-b0-07-pages-messages-index.png | 8 | 单操作无超时 |
| 8 | pages/profile/index | NAV_OK | screenshots/r1-b0-08-pages-profile-index.png | 50 | 单操作无超时 |
| 9 | subpackages/village/village/index | NAV_OK | screenshots/r1-b0-09-subpackages-village-village-index.png | 268 | 单操作无超时 |
| 10 | subpackages/village/village/publish | NAV_OK | screenshots/r1-b0-10-subpackages-village-village-publish.png | 1 | 单操作无超时 |
| 11 | subpackages/village/village/post | NAV_OK | screenshots/r1-b0-11-subpackages-village-village-post.png | 2 | 单操作无超时 |
| 12 | subpackages/village/village/detail | NAV_OK | screenshots/r1-b0-12-subpackages-village-village-detail.png | 2 | 单操作无超时 |
| 13 | subpackages/village/village/tag-posts | NAV_FAIL | screenshots/r1-b0-13-subpackages-village-village-tag-posts.png | 268 | 落点=subpackages/village/village/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 14 | subpackages/village/village/history | NAV_OK | screenshots/r1-b0-14-subpackages-village-village-history.png | 9 | 单操作无超时；重探补读WXML(first-view@r1 open=OK)；元素经源码类名定点补测(open=OK) |
| 15 | subpackages/circles/circles/index | NAV_OK | screenshots/r1-b0-15-subpackages-circles-circles-index.png | 31 | 单操作无超时；重探补读WXML(first-view@r0 open=OK)；元素经源码类名定点补测(open=OK) |

## REALCOV 真实腿证据（批次 1 落，3 例）

通道切换记录：mock 实例上 open_project_window(real) 后 WS 9420 仍自报 apiMode=mock（并行窗，非切换）⇒ 按 round-8b 口径整链切载具：杀本会话 IDE 树 → ws-channel-up --project mp-weixin-real → WS_UP=OK + WS_UP_BAND=match（apiMode=real，envSha8=f0677920，落点 pages/login/index 未登录）→ 跑腿 → 跑完恢复 mock 通道（收口读数 WS_UP=OK band=match ownerPid=4236）。

铸票（既有 r-exec login op，未编造）：identity=A mint=phone-login 铸到 userId=100158 verify=logged-in（real 8080 后端）；行上证据 loginVerify/sessionSource 齐全，门禁 SESSION_CONTRADICT=0。

| 用例 | 状态（配方路径） | 状态（通用路径） | 通道读数 | 说明 |
|---|---|---|---|---|
| PAGES-PROFILE-INDEX\|PFI25 | FAILED（steps=4，seed-voice 夹具 ok 后步骤失败） | - | band=real@f0677920 identity=A | FAILED 行计为已判过 ⇒ 出 UNCOVERED；失败详情见 exec-realcov-b1 stepsNote |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI34 | EXECUTED（22 步，net-fault 注入并恢复） | - | band=real@f0677920 identity=A | 最硬的一条 |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI25 | SKIPPED（夹具 create-pending-post FAIL：Cannot read properties of undefined (reading 'content')） | EXECUTED（probe .post-card__audit:absent——夹具缺失下徽标不存在，判过≠判赢） | band=real@f0677920 identity=A | 夹具在 real 档确定性失败=已立案缺陷；通用路径行提供登录轴覆盖 |

门禁读数（--dir reports/audit/ui-audit-2026-10-09，只含本批行）：REALCOV_COVERED=3，SESSION_PROVEN=5，SESSION_CONTRADICT=0，CONSERVATION OK（28 豁免+3 覆盖+205 欠=236；欠账大因本目录只见本批行）。全仓口径的 9 条欠账中本批 3 条已出列，余 OT05/OT06/OT09/VRN07/OC09/VB03 留后续批次（OT06/OC09 另缺 guest 轴）。

发现（立案不改行）：r-exec-ws 通用路径（无 --recipes）产行的 band 字段落成 "[object Object]"（exec-realcov-b1c 的 VI34 行），配方路径正常——通用路径的 band 盖章处有缺陷，后续批次若走通用路径需先修。

## 批次 1 小结

- 15 页全部采完：12 NAV_OK / 3 NAV_FAIL（pages/login/index 登录态 loggedOutOnly 守卫弹回 discover 属正确方向；pages/nearby/index 弹回 discover 待人判；tag-posts 缺 tag 参数回退 village/index 属参数守卫）。
- 帧：15/15 落盘；console：15 份全量日志，批内 error=0 warn=0。
- 安全抽测：3 次 TAP（.sms-btn[获取验证码]——向 real 8080 后端发测试验证码，ops 用例同款动作；.reg-success__btn[完善我的资料]；.quick-card__btn[去看看]），其余按护栏 SKIP(guard)；单操作 30s 超时护栏全程未触发致命失败。
- history/circles 两页首轮 outerWxml 空返回（首 view 为局部组件），以源码类名定点计数补齐（history=9、circles=31），帧与探针双证。
- 通道事故如实记录：本轮共 2 次 IDE 整链重启（杀进程后 automator 层楔死数分钟），均为本会话自有进程；教训=不要在 WS 持有连接时杀进程。

---

# 第 1 轮巡检 · 批次 2/5（全量批）——增量台账

- 开工时间：2026-10-10T04:20Z 前后（UTC）；通道：WS 9420（ownerPid=4236，WS_ALIVE page=pages/discover/index，LIVE_BAND=mock）
- REALCOV：本批 15 页与 9 条点名用例所在页（pages/profile/index、subpackages/village/village/index、subpackages/profile-extra/profile/other、subpackages/chat/official-chat/index、subpackages/vip/bills、subpackages/profile-extra/verification/real-name）零交集 ⇒ 本批无 REALCOV 腿，OT05/OT06/OT09/VRN07/OC09/VB03 留后续批次
- 护栏延续批次 1：删除/解绑/同意类 SKIP(guard)；点赞/加入/关注/发布/提交等真实后端写操作一律不 tap（mock×real 档位错配）；筛选类 chip/tab 属只读可 tap

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | subpackages/circles/circles/topics | NAV_OK | screenshots/r1-b1-01-subpackages-circles-circles-topics.png | 15 | 单操作无超时 |
| 2 | subpackages/circles/circles/topic-detail | NAV_OK | screenshots/r1-b1-02-subpackages-circles-circles-topic-detail.png | 2 | 单操作无超时 |
| 3 | subpackages/circles/circles/post-topic | NAV_OK | screenshots/r1-b1-03-subpackages-circles-circles-post-topic.png | 4 | 单操作无超时 |
| 4 | subpackages/circles/circles/circle-home | NAV_OK | screenshots/r1-b1-04-subpackages-circles-circles-circle-home.png | 45 | 疑似点赞写：容器 tap 是否真触发 toggleLike 无法证实（帧摄于 tap 前），已标记待核；单操作无超时 |
| 5 | subpackages/campus/campus/hub | NAV_OK | screenshots/r1-b1-05-subpackages-campus-campus-hub.png | 31 | 单操作无超时 |
| 6 | subpackages/campus/campus/index | NAV_FAIL | screenshots/r1-b1-06-subpackages-campus-campus-index.png | 31 | 落点=subpackages/campus/campus/hub（页内守卫/参数缺失重定向）；单操作无超时 |
| 7 | subpackages/campus/campus/post-topic | NAV_OK | screenshots/r1-b1-07-subpackages-campus-campus-post-topic.png | 9 | 单操作无超时 |
| 8 | subpackages/campus/campus/topic-detail | NAV_OK | screenshots/r1-b1-08-subpackages-campus-campus-topic-detail.png | 2 | 单操作无超时 |
| 9 | subpackages/campus/campus/certification | NAV_OK | screenshots/r1-b1-09-subpackages-campus-campus-certification.png | 5 | 单操作无超时 |
| 10 | subpackages/discover-extra/discover/matching | NAV_FAIL | screenshots/r1-b1-10-subpackages-discover-extra-discover-matching.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 11 | subpackages/discover-extra/discover/match-success | NAV_OK | screenshots/r1-b1-11-subpackages-discover-extra-discover-match-success.png | 4 | 单操作无超时 |
| 12 | subpackages/discover-extra/home/segment | NAV_OK | screenshots/r1-b1-12-subpackages-discover-extra-home-segment.png | 12 | 单操作无超时；元素经源码类名定点补测(重试0) |
| 13 | subpackages/discover-extra/nearby/people | NAV_OK | screenshots/r1-b1-13-subpackages-discover-extra-nearby-people.png | 5 | 单操作无超时 |
| 14 | subpackages/discover-extra/discover/history | NAV_OK | screenshots/r1-b1-14-subpackages-discover-extra-discover-history.png | 1 | 单操作无超时 |
| 15 | subpackages/discover-extra/likes/index | NAV_OK | screenshots/r1-b1-15-subpackages-discover-extra-likes-index.png | 16 | 单操作无超时 |

## 批次 2 小结

- 15 页全部采完：13 NAV_OK / 2 NAV_FAIL（campus/index 落点被并入 campus/hub——校区未注册时的引导归并；matching 落点弹回 pages/discover/index——登录态下仍弹回，待人工归因）。
- 帧：15/15 落盘（screenshots/r1-b1-01…15）；console：15 份全量日志，批内 error=0 warn=0。
- 安全抽测：TAP 2 次（circle-home 的 .hero-actions[‹] 返回钮无副作用；.feed-actions[256] 为容器元素、子元素绑定 toggleLike——**疑似点赞写，无法证实是否真触发，已标记待核**，教训：候选元素应排除含绑定子按钮的容器）；SKIP(guard)（campus-school-card__cta 加入校区=写、各发布/提交类）。
- 元素补测：home/segment 首轮 outerWxml 空（同批次 1 的首-view 局部组件问题），以源码类名定点计数补齐（segment-row=9，帧证实在线用户列表）。
- REALCOV：本批页集与 9 条点名用例所在页零交集，无 real 腿可跑（OT05/OT06/OT09/VRN07/OC09/VB03 留后续批次）。

---

# 第 1 轮巡检 · 批次 3/5（全量批）——增量台账

- 开工时间：2026-10-10T05:00Z 前后（UTC）；通道：WS 9420（mock 档，ownerPid=4236）
- REALCOV：本批含 1 条点名用例所在页——subpackages/profile-extra/verification/real-name（次要20|VRN07，requiresReal=true，门禁缺=login）；VRN07 无配方 ⇒ 通用路径

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | subpackages/discover-extra/likes-visitors/index | NAV_OK | screenshots/r1-b2-01-subpackages-discover-extra-likes-visitors-index.png | 9 | 单操作无超时 |
| 2 | subpackages/tools/daily-question/index | NAV_OK | screenshots/r1-b2-02-subpackages-tools-daily-question-index.png | 2 | 单操作无超时 |
| 3 | subpackages/tools/love-center/index | NAV_OK | screenshots/r1-b2-03-subpackages-tools-love-center-index.png | 3 | 单操作无超时；元素经源码类名定点补测 |
| 4 | subpackages/tools/help/index | NAV_OK | screenshots/r1-b2-04-subpackages-tools-help-index.png | 9 | 单操作无超时；元素经源码类名定点补测 |
| 5 | subpackages/tools/security/index | NAV_OK | screenshots/r1-b2-05-subpackages-tools-security-index.png | 16 | 单操作无超时；元素经源码类名定点补测 |
| 6 | subpackages/tools/search/index | NAV_OK | screenshots/r1-b2-06-subpackages-tools-search-index.png | 8 | 单操作无超时 |
| 7 | subpackages/tools/heart-signals/index | NAV_OK | screenshots/r1-b2-07-subpackages-tools-heart-signals-index.png | 19 | 守卫漏事故：拒绝/接受按钮被 tap（源码 index.vue:329-333 绑 handleDecline/handleAccept=关… |
| 8 | subpackages/tools/activities/detail | NAV_OK | screenshots/r1-b2-08-subpackages-tools-activities-detail.png | 6 | 单操作无超时 |
| 9 | subpackages/tools/love-center/nearby | NAV_OK | screenshots/r1-b2-09-subpackages-tools-love-center-nearby.png | 13 | 单操作无超时 |
| 10 | subpackages/tools/love-center/mbti | NAV_OK | screenshots/r1-b2-10-subpackages-tools-love-center-mbti.png | 48 | 单操作无超时 |
| 11 | subpackages/tools/love-center/consulting | NAV_OK | screenshots/r1-b2-11-subpackages-tools-love-center-consulting.png | 2 | 单操作无超时 |
| 12 | subpackages/profile-extra/settings/index | NAV_OK | screenshots/r1-b2-12-subpackages-profile-extra-settings-index.png | 5 | 单操作无超时 |
| 13 | subpackages/profile-extra/verification/index | NAV_OK | screenshots/r1-b2-13-subpackages-profile-extra-verification-index.png | 6 | 单操作无超时 |
| 14 | subpackages/profile-extra/verification/real-name | NAV_OK | screenshots/r1-b2-14-subpackages-profile-extra-verification-real-name.png | 5 | 单操作无超时 |
| 15 | subpackages/profile-extra/profile/visitors | NAV_OK | screenshots/r1-b2-15-subpackages-profile-extra-profile-visitors.png | 44 | 单操作无超时；元素经源码类名定点补测 |

## REALCOV 真实腿证据（批次 3 落，1 例：VRN07）

整链切 real（同批次 1 口径）：ws-channel-up --project mp-weixin-real → WS_UP=OK + WS_UP_BAND=match（apiMode=real envSha8=f0677920）；铸票 identity=A mint=phone-login userId=100158 verify=logged-in。

| 用例 | 状态（通用路径 --tap） | 通道读数 | 说明 |
|---|---|---|---|
| 次要20\|VRN07 | SKIPPED（observed: pre: .form-item__input:absent \| tap-skipped——实名表单对 identity A 不渲染，未成年认证前置缺失，tap 无目标） | band=real@f0677920（行上盖章缺陷见下） identity=A（铸票证据在 boot 日志） | **如实留红**：门禁 VRN07 仍 缺=login。要出非 SKIPPED 行需「未成年身份」夹具（现 identity 词表 A/B/guest 无此形态）——已立案待编排层决策，不硬凑 |

行产物：exec-realcov-b3/exec-results.json（1 行）；该行同时暴露 r-exec-ws 通用路径 SKIPPED 分支的参数错位缺陷：band 落成 "[object Object]"、identity 空（门禁 IDENTITYLESS 点名 exec-realcov-b3=1）——与批次 1 b1c 的 VI34 行同缺陷，配方路径不受影响。

门禁收口读数（全仓默认扫 reports/audit/round-7，exec-realcov-b1/b1b/b1c/b3 已按 exec-ws-tap-r8 先例落一份到该扫描根）：**REALCOV_UNCOVERED=6／236**（批次 1 的 PFI25/VI25/VI34 已出列），余 OT05/OT06/OT09/VRN07/OC09/VB03（OT06/OC09 另缺 guest 轴）。SESSION_CONTRADICT=0。

## 批次 3 小结

- 15 页全部采完：15 NAV_OK / 0 NAV_FAIL（本批无守卫弹回；activities/detail、verification/real-name 等参数页直开均容错）。
- 帧：15/15 落盘（screenshots/r1-b2-01…15）；console：15 份全量日志，批内 error=0 warn=0。
- 元素补测：love-center=3、help=9、security=16（含 .sec-item--danger 注销类×1）、visitors=44（首轮 outerWxml 空返回同前两批，源码类名定点计数补齐）。
- 安全抽测：设置/认证/实名三页主按钮全部 SKIP(guard)（退出登录/删除账号/提交认证类）；**事故一起**：heart-signals 页 .signal-card__actions[拒绝] 与 .signal-card__btn[接受] 被 tap（源码 circle-home…heart-signals/index.vue:329-333 绑 handleDecline/handleAccept=关系写）——GUARD_RE 漏了「接受/拒绝」两词，属守卫漏，已入册：是否真触发取决于当时是否存在待处理信号（帧摄于 tap 前），已标记待核；GUARD_RE 已补「接受|拒绝」供后续批次。
- REALCOV VRN07：见上节，如实留红 + 通用路径 SKIPPED 分支 band/identity 盖章缺陷二次确认。

---

# 第 1 轮巡检 · 批次 4/5（全量批）——增量台账

- 开工时间：2026-10-10T05:40Z 前后（UTC）；通道：WS 9420（mock 档 ownerPid=44524）
- REALCOV：本批含 4 条点名用例所在页——profile/other（OT05/06/09）与 chat/official-chat（OC09），均有配方

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | subpackages/profile-extra/profile/other | NAV_OK | screenshots/r1-b3-01-subpackages-profile-extra-profile-other.png | 5 | 单操作无超时；元素经源码类名定点补测 |
| 2 | subpackages/profile-extra/profile/location | NAV_OK | screenshots/r1-b3-02-subpackages-profile-extra-profile-location.png | 5 | 单操作无超时 |
| 3 | subpackages/profile-extra/profile/privacy | NAV_OK | screenshots/r1-b3-03-subpackages-profile-extra-profile-privacy.png | 2 | 单操作无超时 |
| 4 | subpackages/profile-extra/profile/album | NAV_OK | screenshots/r1-b3-04-subpackages-profile-extra-profile-album.png | 16 | 单操作无超时 |
| 5 | subpackages/profile-extra/profile/favorites | NAV_OK | screenshots/r1-b3-05-subpackages-profile-extra-profile-favorites.png | 4 | 单操作无超时；元素经源码类名定点补测 |
| 6 | subpackages/profile-extra/profile/tasks | NAV_OK | screenshots/r1-b3-06-subpackages-profile-extra-profile-tasks.png | 4 | 单操作无超时；元素经源码类名定点补测 |
| 7 | subpackages/profile-extra/settings/dnd | NAV_OK | screenshots/r1-b3-07-subpackages-profile-extra-settings-dnd.png | 27 | 单操作无超时 |
| 8 | subpackages/profile-extra/feedback/history | NAV_OK | screenshots/r1-b3-08-subpackages-profile-extra-feedback-history.png | 6 | 单操作无超时；元素经源码类名定点补测(二次) |
| 9 | subpackages/chat/chat-session/index | NAV_OK | screenshots/r1-b3-09-subpackages-chat-chat-session-index.png | 1 | 单操作无超时 |
| 10 | subpackages/chat/official-chat/index | NAV_OK | screenshots/r1-b3-10-subpackages-chat-official-chat-index.png | 13 | 单操作无超时 |
| 11 | subpackages/setup/profile/index | NAV_OK | screenshots/r1-b3-11-subpackages-setup-profile-index.png | 9 | 单操作无超时 |
| 12 | subpackages/setup/campus/index | NAV_FAIL | screenshots/r1-b3-12-subpackages-setup-campus-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 13 | subpackages/setup/schedule/index | NAV_OK | screenshots/r1-b3-13-subpackages-setup-schedule-index.png | 1 | 单操作无超时 |
| 14 | subpackages/setup/recommend-pref/index | NAV_FAIL | screenshots/r1-b3-14-subpackages-setup-recommend-pref-index.png | 22 | 落点=pages/discover/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 15 | subpackages/setup/interest/index | NAV_OK | screenshots/r1-b3-15-subpackages-setup-interest-index.png | 3 | 单操作无超时；元素经源码类名定点补测 |

## REALCOV 真实腿证据（批次 4 落，4 例：OT05/OT06/OT09/OC09）

整链切 real（WS_UP=OK + WS_UP_BAND=match，apiMode=real envSha8=f0677920）；铸票 identity=A mint=phone-login userId=100158 verify=logged-in。

| 用例 | 配方腿（identity=A） | 游客腿（identity=guest，r-exec-cli） | 说明 |
|---|---|---|---|
| 次要20\|OT05 | SKIPPED（probe .relationship-cta__btn--like absent；armModal 抛错 Uncaught Unexpected identifier 'showModal'——C1 modal 驱动缺陷） | SKIPPED（身份适用范围外） | b4/b4b 两次复现一致=确定性 |
| 次要20\|OT06 | SKIPPED（rapidTap 目标 absent；net-fault record 模式 intercepted=0） | SKIPPED（动词拒发 strict-verbs） | 同上 |
| 次要20\|OT09 | SKIPPED（tap 目标 .relationship-cta__btn--whisper 不在页上） | SKIPPED（身份适用范围外） | 行内已注明「组件未挂载或前置缺失，通道欠款不是产品判决」 |
| 次要21\|OC09 | SKIPPED（net-fault fail-all armed 但 drainNet=0、.retry-btn absent；cleanup 报 net-was-not-armed——钩子未随窗生效） | SKIPPED（动词拒发） | 官方助手会话未建立 |

**如实结论**：四例配方腿与游客腿全部 SKIPPED，门禁不认（UNCOVERED 维持 6：OT05/06/09/VRN07/OC09/VB03）。根因指向能力车道前置在本环境不成立——①种子用户 10001/100155 疑似不在当前 real 库（CTA 渲染条件不满足）；②C1 nativeModal 驱动抛错；③net-fault 钩子切窗后不生效（net-was-not-armed）。另有一次**防假绿闸立功**：r-exec-ws --identity guest 首跑时 store 仍是 A 会话（100158），guest-login 铸票 100151 与 store 不符 ⇒ 拒跑；clearSession 后 store=not-logged-in，r-exec-ws 二次拒跑（它要的是游客登录态），按其指路改走 r-exec-cli（assertGuestCapable+clearSession 前置）才落了游客行。已立案待编排层：补种子数据/修 modal 驱动/修 net-fault 钩子随窗生效，再补这四条腿。

门禁收口读数（全仓，exec-realcov-b4/b4b/b4g 已同步落 reports/audit/round-7）：REALCOV_UNCOVERED=6／236（OT05/OT06/OT09/VRN07/OC09/VB03），SESSION_CONTRADICT=0。

## 批次 4 小结

- 15 页全部采完：12 NAV_OK / 3 NAV_FAIL（setup/campus 与 setup/recommend-pref 登录态（已完成引导）直开被弹回 pages/discover/index——onboarding-only 页守卫，方向正确）。
- 帧：15/15 落盘（screenshots/r1-b3-01…15）；console：15 份全量日志，批内 error=0 warn=0。
- 元素补测：profile/other=5（other-more-item×3 含 danger×1）、favorites=4、tasks=4、interest=3、feedback/history=6（filter-chip=4+record=2，与帧一致）——首轮 outerWxml 空返回 5 页全部以源码类名定点计数补齐。
- 安全抽测：TAP 1 次（location 页 .location-actions[重新定位]——定位重试，无写）；profile/other 的 danger 项（拉黑/举报类）、chat-session 发送、dnd 开关、各提交类全部按护栏 SKIP(guard)/未 tap。

---

# 第 1 轮巡检 · 批次 5/5（全量批）——增量台账

- 开工时间：2026-10-10T06:20Z 前后（UTC）；通道：WS 9420（mock 档 ownerPid=36996）
- REALCOV：本批含 1 条点名用例所在页——subpackages/vip/bills（次要22|VB03 缺=login，有配方）
- 护栏：VIP/支付页按 ask 只验封存态；提交/删除类一律 SKIP(guard)

| # | 路由 | 状态 | 帧证据 | 元素 | 备注 |
|---|---|---|---|---|---|
| 1 | subpackages/setup/dev/index | NAV_FAIL | screenshots/r1-b4-01-subpackages-setup-dev-index.png | 0 | 帧显示 page not found（#ifdef 编译期剔除生效，mock 产物未注册该路由=预期 NOT_REGISTERED）；aut… |
| 2 | subpackages/setup/showcase/index | NAV_FAIL | screenshots/r1-b4-02-subpackages-setup-showcase-index.png | 0 | 帧显示 page not found（#ifdef 编译期剔除生效，mock 产物未注册该路由=预期 NOT_REGISTERED）；aut… |
| 3 | subpackages/support/feedback/index | NAV_OK | screenshots/r1-b4-03-subpackages-support-feedback-index.png | 7 | 单操作无超时；源码定点补测 |
| 4 | subpackages/discover/discussions/index | NAV_OK | screenshots/r1-b4-04-subpackages-discover-discussions-index.png | 2 | 单操作无超时；源码定点补测 |
| 5 | subpackages/discover/activities/index | NAV_OK | screenshots/r1-b4-05-subpackages-discover-activities-index.png | 2 | 单操作无超时 |
| 6 | subpackages/legal/privacy/index | NAV_OK | screenshots/r1-b4-06-subpackages-legal-privacy-index.png | 0 | 帧证实隐私政策全文渲染；纯静态页无可交互元素属预期（非空页误报） |
| 7 | subpackages/legal/agreement/index | NAV_OK | screenshots/r1-b4-07-subpackages-legal-agreement-index.png | 0 | 帧证实协议全文渲染；纯静态页无可交互元素属预期（非空页误报） |
| 8 | subpackages/market/detail/index | NAV_OK | screenshots/r1-b4-08-subpackages-market-detail-index.png | 1 | 单操作无超时；源码定点补测 |
| 9 | subpackages/market/shop/index | NAV_OK | screenshots/r1-b4-09-subpackages-market-shop-index.png | 0 | 帧显示「功能封存中——该功能暂未开放」封存态（shop-card/category-item=0 与封存渲染一致） |
| 10 | subpackages/market/wallet/index | NAV_OK | screenshots/r1-b4-10-subpackages-market-wallet-index.png | 1 | 单操作无超时；源码定点补测 |
| 11 | subpackages/vip/index | NAV_FAIL | screenshots/r1-b4-11-subpackages-vip-index.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 12 | subpackages/vip/promo-code | NAV_FAIL | screenshots/r1-b4-12-subpackages-vip-promo-code.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |
| 13 | subpackages/vip/bills | NAV_FAIL | screenshots/r1-b4-13-subpackages-vip-bills.png | 50 | 落点=pages/profile/index（页内守卫/参数缺失重定向）；单操作无超时 |

## REALCOV 真实腿证据（批次 5 落，1 例：VB03）

整链切 real（WS_UP=OK + WS_UP_BAND=match，apiMode=real envSha8=f0677920）；铸票 identity=A mint=phone-login userId=100158 verify=logged-in。

| 用例 | 配方腿（identity=A） | 说明 |
|---|---|---|
| 次要22\|VB03 | **FAILED（10 步跑完，计为已判过）**：armNetFault(record) → open subpackages/vip/vip → assertRoute 命中 → shot → open bills… | 行上 band=real@f0677920 identity=A loginVerify=logged-in userId=100158 sessionSource=phone-login 齐全；FAILED=vip/bills 断言未满足的产品向判决，覆盖账认「已判过」 |

门禁收口读数（全仓）：**REALCOV_UNCOVERED=5／236**（本轮点名 9 条 → 5 条：PFI25/VI25/VI34/VB03 四条已出列；余 OT05/OT06/OT09/VRN07/OC09，阻塞原因见批次 3/4 节：未成年身份夹具缺失 + 能力车道种子前置不成立 + modal/net-fault 驱动缺陷）。SESSION_CONTRADICT=0。

## 批次 5 小结

- 13 页全部采完：9 NAV_OK / 4 NAV_FAIL。
  - setup/dev 与 setup/showcase：帧显示 page not found——#ifdef DEV/SHOWCASE 编译期剔除在 mock 产物生效（预期 NOT_REGISTERED）；automator 回报请求路径故机读曾为「落点吻合」，以帧为准改判 NAV_FAIL。
  - vip/index、vip/promo-code、vip/bills：登录态直开被弹回 pages/profile/index（VIP 功能旗标封存方向的守卫；guest-landing-policy 对游客为 flag-bounce，登录态实测同向弹回）。
- 封存态验证（ask 明示口径）：market/shop 与 market/wallet 帧均显示「功能封存中——该功能暂未开放」（wallet__sealed=1 定点证实）；market/detail 的 .product-state--sealed=1 且购买钮 .product-buybar__btn 不渲染（封存商品无购买钮，比 toast 更强的封存证据，sealed-verify MISS 即预期通过）。
- 元素补测：support/feedback=7（chip=3+field=3+history-header__btn=1）、discussions=2（feed-row=2）、wallet=1、shop=0（封存态无卡片类，帧证实）——首轮 outerWxml 空返回页全部以源码类名定点计数补齐；legal/privacy 与 legal/agreement 为纯静态富文本页（无可交互类名属预期，帧证实全文渲染）。
- 安全抽测：market/detail 购买钮 sealed-verify MISS（封存即预期通过）；本批无其它写类主按钮被 tap。
