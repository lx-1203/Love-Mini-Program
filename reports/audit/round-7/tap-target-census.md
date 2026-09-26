# 交互判点点名率普查

- 判据台用例：1107；含交互动词：738；其中 action 里点名了 `.class` 的：204；**没点名的：534**
- 守恒：204 + 534 = 738 → yes
- 读法：**这 534 条不是「工具点不动」，是「判据没写要点哪儿」**。补上 --tap（真点击/真输入）之后实测整页 0 个可点目标（r-exec-cli 的 `交互没点名` 计数器）。

| 页 | 缺点名用例数 | 源码起点 |
|---|---|---|
| `subpackages/village/village/index` | 26 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/index.vue |
| `pages/login/index` | 25 | D:/6/恋爱小程序/apps/client/src/pages/login/index.vue |
| `subpackages/village/village/post` | 25 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/post.vue |
| `subpackages/village/village/publish` | 24 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/publish.vue |
| `subpackages/campus/campus/post-topic` | 23 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/post-topic.vue |
| `pages/register/index` | 22 | D:/6/恋爱小程序/apps/client/src/pages/register/index.vue |
| `subpackages/circles/circles/post-topic` | 19 | D:/6/恋爱小程序/apps/client/src/subpackages/circles/circles/post-topic.vue |
| `subpackages/campus/campus/index` | 16 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/index.vue |
| `pages/home/index` | 15 | D:/6/恋爱小程序/apps/client/src/pages/home/index.vue |
| `subpackages/chat/chat-session/index` | 15 | D:/6/恋爱小程序/apps/client/src/subpackages/chat/chat-session/index.vue |
| `pages/profile/index` | 13 | D:/6/恋爱小程序/apps/client/src/pages/profile/index.vue |
| `subpackages/circles/circles/index` | 13 | D:/6/恋爱小程序/apps/client/src/subpackages/circles/circles/index.vue |
| `subpackages/setup/schedule/index` | 12 | D:/6/恋爱小程序/apps/client/src/subpackages/setup/schedule/index.vue |
| `pages/discover/index` | 11 | D:/6/恋爱小程序/apps/client/src/pages/discover/index.vue |
| `subpackages/profile-extra/profile/other` | 11 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/other.vue |
| `pages/messages/index` | 10 | D:/6/恋爱小程序/apps/client/src/pages/messages/index.vue |
| `pages/nearby/index` | 10 | D:/6/恋爱小程序/apps/client/src/pages/nearby/index.vue |
| `subpackages/village/village/detail` | 10 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/detail.vue |
| `subpackages/tools/search/index` | 10 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/search/index.vue |
| `subpackages/profile-extra/settings/index` | 10 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/settings/index.vue |
| `subpackages/profile-extra/profile/tasks` | 10 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/tasks.vue |
| `subpackages/support/feedback/index` | 10 | D:/6/恋爱小程序/apps/client/src/subpackages/support/feedback/index.vue |
| `subpackages/profile-extra/verification/real-name` | 9 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/verification/real-name.vue |
| `subpackages/discover-extra/discover/match-success` | 8 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/discover/match-success.vue |
| `subpackages/discover-extra/discover/matching` | 8 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/discover/matching.vue |
| `subpackages/profile-extra/profile/album` | 8 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/album.vue |
| `subpackages/profile-extra/settings/dnd` | 8 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/settings/dnd.vue |
| `subpackages/setup/recommend-pref/index` | 8 | D:/6/恋爱小程序/apps/client/src/subpackages/setup/recommend-pref/index.vue |
| `subpackages/vip/promo-code` | 8 | D:/6/恋爱小程序/apps/client/src/subpackages/vip/promo-code.vue |
| `subpackages/circles/circles/circle-home` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/circles/circles/circle-home.vue |
| `subpackages/campus/campus/certification` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/certification.vue |
| `subpackages/discover-extra/likes/index` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/likes/index.vue |
| `subpackages/profile-extra/verification/index` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/verification/index.vue |
| `subpackages/profile-extra/feedback/history` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/feedback/history.vue |
| `subpackages/setup/campus/index` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue |
| `subpackages/setup/interest/index` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/setup/interest/index.vue |
| `subpackages/discover/activities/index` | 7 | D:/6/恋爱小程序/apps/client/src/subpackages/discover/activities/index.vue |
| `subpackages/campus/campus/hub` | 6 | D:/6/恋爱小程序/apps/client/src/subpackages/campus/campus/hub.vue |
| `subpackages/circles/circles/topic-detail` | 6 | D:/6/恋爱小程序/apps/client/src/subpackages/circles/circles/topic-detail.vue |
| `subpackages/tools/help/index` | 6 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/help/index.vue |
| `subpackages/village/village/tag-posts` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/tag-posts.vue |
| `subpackages/village/village/history` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/village/village/history.vue |
| `subpackages/circles/circles/topics` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/circles/circles/topics.vue |
| `subpackages/tools/love-center/nearby` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/love-center/nearby.vue |
| `subpackages/tools/love-center/mbti` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/tools/love-center/mbti.vue |
| `subpackages/chat/official-chat/index` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/chat/official-chat/index.vue |
| `subpackages/vip/bills` | 5 | D:/6/恋爱小程序/apps/client/src/subpackages/vip/bills.vue |
| `pages/register/success` | 4 | D:/6/恋爱小程序/apps/client/src/pages/register/success.vue |
| `subpackages/profile-extra/profile/favorites` | 4 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/favorites.vue |
| `subpackages/market/shop/index` | 4 | D:/6/恋爱小程序/apps/client/src/subpackages/market/shop/index.vue |
| `subpackages/discover-extra/home/segment` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/home/segment.vue |
| `subpackages/discover-extra/nearby/people` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/discover-extra/nearby/people.vue |
| `subpackages/market/detail/index` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/market/detail/index.vue |
| `subpackages/vip/index` | 3 | D:/6/恋爱小程序/apps/client/src/subpackages/vip/index.vue |
| `subpackages/profile-extra/profile/location` | 2 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/location.vue |
| `subpackages/profile-extra/profile/privacy` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/profile-extra/profile/privacy.vue |
| `subpackages/market/wallet/index` | 1 | D:/6/恋爱小程序/apps/client/src/subpackages/market/wallet/index.vue |
