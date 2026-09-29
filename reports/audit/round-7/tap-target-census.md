# 交互判点点名率普查

- 判据台用例：1107；含交互动词：705；其中 action/tapTarget 点名了的：626；**没点名的：62**；已盖章「不可自动化」的：17
- 守恒：626 + 62 + 17 = 705 → yes
- 读法：**这 62 条不是「工具点不动」，是「判据没写要点哪儿」**。补上 --tap（真点击/真输入）之后实测整页 0 个可点目标（r-exec-cli 的 `交互没点名` 计数器）。

| 页 | 缺点名用例数 | 源码起点 |
|---|---|---|
| `pages/nearby/index` | 7 | D:/6/恋爱小程序/apps/client/src/pages/nearby/index.vue |
| `pages/discover/index` | 4 | D:/6/恋爱小程序/apps/client/src/pages/discover/index.vue |
| `pages/home/index` | 4 | D:/6/恋爱小程序/apps/client/src/pages/home/index.vue |
| `pages/profile/index` | 4 | D:/6/恋爱小程序/apps/client/src/pages/profile/index.vue |
| `pages/messages/index` | 3 | D:/6/恋爱小程序/apps/client/src/pages/messages/index.vue |
| `subpackages/chat/chat-session/index` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/chat/chat-session/index.vue |
| `subpackages/circles/circles/index` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/circles/circles/index.vue |
| `subpackages/discover-extra/discover/matching` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/discover/matching.vue |
| `subpackages/vip/bills` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/vip/bills.vue |
| `subpackages/profile-extra/settings/index` | 2 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/settings/index.vue |
| `subpackages/profile-extra/profile/album` | 2 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/album.vue |
| `subpackages/profile-extra/settings/dnd` | 2 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/settings/dnd.vue |
| `subpackages/setup/recommend-pref/index` | 2 | D:/6/恋爱小程序/apps/client/src/subpackages/setup/recommend-pref/index.vue |
| `pages/register/index` | 1 | D:/6/恋爱小程序/apps/client/src/pages/register/index.vue |
| `pages/register/success` | 1 | D:/6/恋爱小程序/apps/client/src/pages/register/success.vue |
| `subpackages/campus/campus/hub` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/hub.vue |
| `subpackages/campus/campus/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/index.vue |
| `subpackages/campus/campus/post-topic` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/post-topic.vue |
| `subpackages/discover-extra/discover/match-success` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/discover/match-success.vue |
| `subpackages/village/village/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/index.vue |
| `subpackages/village/village/post` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/post.vue |
| `subpackages/village/village/publish` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/publish.vue |
| `subpackages/village/village/history` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/history.vue |
| `subpackages/discover-extra/nearby/people` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/nearby/people.vue |
| `subpackages/tools/help/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/help/index.vue |
| `subpackages/tools/search/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/search/index.vue |
| `subpackages/tools/love-center/nearby` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/love-center/nearby.vue |
| `subpackages/profile-extra/profile/privacy` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/privacy.vue |
| `subpackages/profile-extra/profile/tasks` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/tasks.vue |
| `subpackages/discover/activities/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/discover/activities/index.vue |
| `subpackages/market/shop/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/market/shop/index.vue |
| `subpackages/market/wallet/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/market/wallet/index.vue |
| `subpackages/vip/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/vip/index.vue |
