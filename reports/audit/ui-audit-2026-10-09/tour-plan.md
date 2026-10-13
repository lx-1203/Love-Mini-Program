# UI 巡检计划（ui-audit-v36）——骨架

- 生成时间：2026-10-09T17:31:27.437Z；HEAD=f9fd17b1；closureDir=reports/audit/ui-audit-2026-10-09
- 路由来源：`apps/client/src/pages.json`（Node22 JSONC 解析：剥注释→剥尾逗号→JSON.parse）
- 路由全集：**73 条**（主包 8 + 分包 65，13 个分包）
- 条件编译页：`subpackages/setup/dev/index`（#ifdef DEV）、`subpackages/setup/showcase/index`（#ifdef SHOWCASE）按源文件字面计入全集；产物未注册时按 NOT_REGISTERED 记账。

## 通道前置（本轮实测）

- IDE 冷启：check_wechatide_status success=true loginExpired=false（auto-auth 用户 nickName=烙吢魺）
- WS 通道：`WS_UP=OK port=9420 ownerPid=18000 等待=69s connectMs=130 page=pages/discover/index hits=11000010 单条查询=14.5ms`
- 档位断言：`WS_UP_BAND=match port=9420 本腿要的档位 project=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin VITE_API_MODE=mock MODE=mp-weixin-mock envSha8=f1c7b96b / 实例自报 apiMode=mock（env 档位比对=match）`
- 后端 8080：real（本轮 ask 给定 UP）
- 判读：WS_UP=OK/ALREADY_UP 且 WS_UP_BAND=match ⇒ 巡检出帧仍走 CLI 桥（2.6s/张），WS 仅用于查询提速。

## 每页采集四件套

| 采集项 | 内容 | 产物 |
|---|---|---|
| screenshot | 模拟器整帧截图 1 张（出帧走 CLI 桥 simulator_screenshot，WS 截图实测 61s/张不可用） | closureDir/shots/batch<N>/<route>.png |
| console | 订阅 on('console') 全量收集（info/warn/error 分级标记），页面停留期统一截取 | closureDir/console/<route>.log |
| interactive | 可交互元素清单：automation_element_action 可达节点（button/input/textarea/可点击 view 的 class 与文本），tap/trigger 面抽样记录 | closureDir/elements/<route>.json |
| security | 安全动作探测：① 未登录/guest 直开该路由的准入行为 ② 页面 onLoad 期 storage 键嗅探（token/身份键明文落盘）③ 敏感入口存在性（支付/实名/位置）④ 路由参数注入容错（?id= 非法值不白屏） | closureDir/security/<route>.json |

## 批次（15 页/批，共 5 批）

| 批次 | 页数 | 路由 |
|---|---|---|
| B1 | 15 | pages/login/index、pages/register/index、pages/register/success、pages/discover/index、pages/home/index、pages/nearby/index、pages/messages/index、pages/profile/index、subpackages/village/village/index、subpackages/village/village/publish、subpackages/village/village/post、subpackages/village/village/detail、subpackages/village/village/tag-posts、subpackages/village/village/history、subpackages/circles/circles/index |
| B2 | 15 | subpackages/circles/circles/topics、subpackages/circles/circles/topic-detail、subpackages/circles/circles/post-topic、subpackages/circles/circles/circle-home、subpackages/campus/campus/hub、subpackages/campus/campus/index、subpackages/campus/campus/post-topic、subpackages/campus/campus/topic-detail、subpackages/campus/campus/certification、subpackages/discover-extra/discover/matching、subpackages/discover-extra/discover/match-success、subpackages/discover-extra/home/segment、subpackages/discover-extra/nearby/people、subpackages/discover-extra/discover/history、subpackages/discover-extra/likes/index |
| B3 | 15 | subpackages/discover-extra/likes-visitors/index、subpackages/tools/daily-question/index、subpackages/tools/love-center/index、subpackages/tools/help/index、subpackages/tools/security/index、subpackages/tools/search/index、subpackages/tools/heart-signals/index、subpackages/tools/activities/detail、subpackages/tools/love-center/nearby、subpackages/tools/love-center/mbti、subpackages/tools/love-center/consulting、subpackages/profile-extra/settings/index、subpackages/profile-extra/verification/index、subpackages/profile-extra/verification/real-name、subpackages/profile-extra/profile/visitors |
| B4 | 15 | subpackages/profile-extra/profile/other、subpackages/profile-extra/profile/location、subpackages/profile-extra/profile/privacy、subpackages/profile-extra/profile/album、subpackages/profile-extra/profile/favorites、subpackages/profile-extra/profile/tasks、subpackages/profile-extra/settings/dnd、subpackages/profile-extra/feedback/history、subpackages/chat/chat-session/index、subpackages/chat/official-chat/index、subpackages/setup/profile/index、subpackages/setup/campus/index、subpackages/setup/schedule/index、subpackages/setup/recommend-pref/index、subpackages/setup/interest/index |
| B5 | 13 | subpackages/setup/dev/index、subpackages/setup/showcase/index、subpackages/support/feedback/index、subpackages/discover/discussions/index、subpackages/discover/activities/index、subpackages/legal/privacy/index、subpackages/legal/agreement/index、subpackages/market/detail/index、subpackages/market/shop/index、subpackages/market/wallet/index、subpackages/vip/index、subpackages/vip/promo-code、subpackages/vip/bills |

## 批间纪律

- 每页采完只 disconnect 本进程 ws 客户端，**绝不 close()**（会带走整个自动化 IDE 实例，9420 随之消失）。
- 停批规则：连续 3 页 evaluate 不可达 ⇒ 本批记 NOT_SHOOTABLE，跳下一批。
- 安全命中：发现明文 token/身份证号等落盘 ⇒ 记 SECURITY_HIT 并继续，不中断批次。
- 台账：每页一行写入 closureDir/tour-ledger.json（route/batch/四项状态/异常摘要）。
