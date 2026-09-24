# R1 截图矩阵（screenshot-matrix）

- 生成：2026-09-24（书记员-R1 整理落盘）。核对方式：Node 脚本（本会话实际运行）对 27 份 interact/*-judge.json 的 checks/issues evidence 引用逐一做 fs.existsSync 存在性判定（含按文件名在本轮截图目录还原），并对 `reports/screenshots/` 下本轮 4 个目录全量清点（递归）、round-1-tour 全量 MD5 实测。

## 一、本轮截图目录清点（实测）

| 目录 | 文件数 | 说明 |
|---|---:|---|
| reports/screenshots/round-1/ | 150（png 144） | 双身份全页巡检（A/、B/ 子目录 + boot 日志 + console 证据 + blank-check.tsv + manifest.json） |
| reports/screenshots/round-1-after/ | 116（png 116） | 修复后重拍（A/、B/ 子目录） |
| reports/screenshots/round-1-interact/ | 3316（png 3043） | 交互取证截图与 wxml/dom 快照、证据日志 |
| reports/screenshots/round-1-tour/ | 310（png 305） | A/B 双身份巡视多态截图（A/、B/ + boot 日志 + manifest-detail.json） |

- `round-1-interact/` 扩展名分布：json×25、png×3043、log×5、txt×1、nul×2、wxml×240；一级子目录：.mimosa/、wxml/。
- 双身份清点（实测）：round-1/A=72 张、round-1/B=72 张；round-1-after/A=114 个、round-1-after/B=2 个。

## 二、round-1 双身份全页清单（manifest.json 摘要）

- manifest generatedAt=2026-09-19T17:28:57.090Z；shots=144 条；failures=14 条；smoke=false

| identity | route | state | file |
|---|---|---|---|
| A | pages/discover/index | 默认 | A/PAGES_DISCOVER_INDEX-默认.png ✓ |
| A | pages/home/index | 滚动后 | A/PAGES_HOME_INDEX-滚动后.png ✓ |
| A | pages/home/index | 默认 | A/PAGES_HOME_INDEX-默认.png ✓ |
| A | pages/login/index | 交互后 | A/PAGES_LOGIN_INDEX-交互后.png ✓ |
| A | pages/login/index | 默认 | A/PAGES_LOGIN_INDEX-默认.png ✓ |
| A | pages/messages/index | 默认 | A/PAGES_MESSAGES_INDEX-默认.png ✓ |
| A | pages/nearby/index | 滚动后 | A/PAGES_NEARBY_INDEX-滚动后.png ✓ |
| A | pages/nearby/index | 默认 | A/PAGES_NEARBY_INDEX-默认.png ✓ |
| A | pages/profile/index | 滚动后 | A/PAGES_PROFILE_INDEX-滚动后.png ✓ |
| A | pages/profile/index | 默认 | A/PAGES_PROFILE_INDEX-默认.png ✓ |
| A | pages/register/success | 默认 | A/PAGES_REGISTER_SUCCESS-默认.png ✓ |
| A | subpackages/campus/campus/certification | 默认 | A/SUBPACKAGES_CAMPUS_CAMPUS_CERTIFICATION-默认.png ✓ |
| A | subpackages/campus/campus/hub | 滚动后 | A/SUBPACKAGES_CAMPUS_CAMPUS_HUB-滚动后.png ✓ |
| A | subpackages/campus/campus/hub | 默认 | A/SUBPACKAGES_CAMPUS_CAMPUS_HUB-默认.png ✓ |
| A | subpackages/campus/campus/post-topic | 默认 | A/SUBPACKAGES_CAMPUS_CAMPUS_POST-TOPIC-默认.png ✓ |
| A | subpackages/campus/campus/topic-detail | 默认 | A/SUBPACKAGES_CAMPUS_CAMPUS_TOPIC-DETAIL-默认.png ✓ |
| A | subpackages/chat/chat-session/index | 默认 | A/SUBPACKAGES_CHAT_CHAT-SESSION_INDEX-默认.png ✓ |
| A | subpackages/chat/official-chat/index | 默认 | A/SUBPACKAGES_CHAT_OFFICIAL-CHAT_INDEX-默认.png ✓ |
| A | subpackages/circles/circles/circle-home | 默认 | A/SUBPACKAGES_CIRCLES_CIRCLES_CIRCLE-HOME-默认.png ✓ |
| A | subpackages/circles/circles/index | 默认 | A/SUBPACKAGES_CIRCLES_CIRCLES_INDEX-默认.png ✓ |
| A | subpackages/circles/circles/post-topic | 默认 | A/SUBPACKAGES_CIRCLES_CIRCLES_POST-TOPIC-默认.png ✓ |
| A | subpackages/circles/circles/topic-detail | 默认 | A/SUBPACKAGES_CIRCLES_CIRCLES_TOPIC-DETAIL-默认.png ✓ |
| A | subpackages/circles/circles/topics | 默认 | A/SUBPACKAGES_CIRCLES_CIRCLES_TOPICS-默认.png ✓ |
| A | subpackages/discover-extra/discover/history | 默认 | A/SUBPACKAGES_DISCOVER-EXTRA_DISCOVER_HISTORY-默认.png ✓ |
| A | subpackages/discover-extra/discover/match-success | 默认 | A/SUBPACKAGES_DISCOVER-EXTRA_DISCOVER_MATCH-SUCCESS-默认.png ✓ |
| A | subpackages/discover-extra/home/segment | 默认 | A/SUBPACKAGES_DISCOVER-EXTRA_HOME_SEGMENT-默认.png ✓ |
| A | subpackages/discover-extra/likes-visitors/index | 默认 | A/SUBPACKAGES_DISCOVER-EXTRA_LIKES-VISITORS_INDEX-默认.png ✓ |
| A | subpackages/discover-extra/likes/index | 默认 | A/SUBPACKAGES_DISCOVER-EXTRA_LIKES_INDEX-默认.png ✓ |
| A | subpackages/discover-extra/nearby/people | 默认 | A/SUBPACKAGES_DISCOVER-EXTRA_NEARBY_PEOPLE-默认.png ✓ |
| A | subpackages/discover/activities/index | 默认 | A/SUBPACKAGES_DISCOVER_ACTIVITIES_INDEX-默认.png ✓ |
| A | subpackages/discover/discussions/index | 默认 | A/SUBPACKAGES_DISCOVER_DISCUSSIONS_INDEX-默认.png ✓ |
| A | subpackages/legal/agreement/index | 默认 | A/SUBPACKAGES_LEGAL_AGREEMENT_INDEX-默认.png ✓ |
| A | subpackages/legal/privacy/index | 默认 | A/SUBPACKAGES_LEGAL_PRIVACY_INDEX-默认.png ✓ |
| A | subpackages/market/detail/index | 默认 | A/SUBPACKAGES_MARKET_DETAIL_INDEX-默认.png ✓ |
| A | subpackages/market/shop/index | 默认 | A/SUBPACKAGES_MARKET_SHOP_INDEX-默认.png ✓ |
| A | subpackages/market/wallet/index | 默认 | A/SUBPACKAGES_MARKET_WALLET_INDEX-默认.png ✓ |
| A | subpackages/profile-extra/feedback/history | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_FEEDBACK_HISTORY-默认.png ✓ |
| A | subpackages/profile-extra/profile/album | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_ALBUM-默认.png ✓ |
| A | subpackages/profile-extra/profile/favorites | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_FAVORITES-默认.png ✓ |
| A | subpackages/profile-extra/profile/location | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_LOCATION-默认.png ✓ |
| A | subpackages/profile-extra/profile/other | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_OTHER-默认.png ✓ |
| A | subpackages/profile-extra/profile/privacy | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_PRIVACY-默认.png ✓ |
| A | subpackages/profile-extra/profile/tasks | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_TASKS-默认.png ✓ |
| A | subpackages/profile-extra/profile/visitors | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_PROFILE_VISITORS-默认.png ✓ |
| A | subpackages/profile-extra/settings/dnd | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_SETTINGS_DND-默认.png ✓ |
| A | subpackages/profile-extra/settings/index | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_SETTINGS_INDEX-默认.png ✓ |
| A | subpackages/profile-extra/verification/index | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_VERIFICATION_INDEX-默认.png ✓ |
| A | subpackages/profile-extra/verification/real-name | 默认 | A/SUBPACKAGES_PROFILE-EXTRA_VERIFICATION_REAL-NAME-默认.png ✓ |
| A | subpackages/setup/campus/index | 默认 | A/SUBPACKAGES_SETUP_CAMPUS_INDEX-默认.png ✓ |
| A | subpackages/setup/interest/index | 默认 | A/SUBPACKAGES_SETUP_INTEREST_INDEX-默认.png ✓ |
| A | subpackages/setup/profile/index | 默认 | A/SUBPACKAGES_SETUP_PROFILE_INDEX-默认.png ✓ |
| A | subpackages/setup/recommend-pref/index | 默认 | A/SUBPACKAGES_SETUP_RECOMMEND-PREF_INDEX-默认.png ✓ |
| A | subpackages/setup/schedule/index | 默认 | A/SUBPACKAGES_SETUP_SCHEDULE_INDEX-默认.png ✓ |
| A | subpackages/support/feedback/index | 默认 | A/SUBPACKAGES_SUPPORT_FEEDBACK_INDEX-默认.png ✓ |
| A | subpackages/tools/activities/detail | 默认 | A/SUBPACKAGES_TOOLS_ACTIVITIES_DETAIL-默认.png ✓ |
| A | subpackages/tools/daily-question/index | 默认 | A/SUBPACKAGES_TOOLS_DAILY-QUESTION_INDEX-默认.png ✓ |
| A | subpackages/tools/heart-signals/index | 默认 | A/SUBPACKAGES_TOOLS_HEART-SIGNALS_INDEX-默认.png ✓ |
| A | subpackages/tools/help/index | 默认 | A/SUBPACKAGES_TOOLS_HELP_INDEX-默认.png ✓ |
| A | subpackages/tools/love-center/consulting | 默认 | A/SUBPACKAGES_TOOLS_LOVE-CENTER_CONSULTING-默认.png ✓ |
| A | subpackages/tools/love-center/index | 默认 | A/SUBPACKAGES_TOOLS_LOVE-CENTER_INDEX-默认.png ✓ |
| A | subpackages/tools/love-center/mbti | 默认 | A/SUBPACKAGES_TOOLS_LOVE-CENTER_MBTI-默认.png ✓ |
| A | subpackages/tools/love-center/nearby | 默认 | A/SUBPACKAGES_TOOLS_LOVE-CENTER_NEARBY-默认.png ✓ |
| A | subpackages/tools/search/index | 默认 | A/SUBPACKAGES_TOOLS_SEARCH_INDEX-默认.png ✓ |
| A | subpackages/tools/security/index | 默认 | A/SUBPACKAGES_TOOLS_SECURITY_INDEX-默认.png ✓ |
| A | subpackages/village/village/detail | 默认 | A/SUBPACKAGES_VILLAGE_VILLAGE_DETAIL-默认.png ✓ |
| A | subpackages/village/village/history | 默认 | A/SUBPACKAGES_VILLAGE_VILLAGE_HISTORY-默认.png ✓ |
| A | subpackages/village/village/index | 默认 | A/SUBPACKAGES_VILLAGE_VILLAGE_INDEX-默认.png ✓ |
| A | subpackages/village/village/post | 默认 | A/SUBPACKAGES_VILLAGE_VILLAGE_POST-默认.png ✓ |
| A | subpackages/village/village/publish | 默认 | A/SUBPACKAGES_VILLAGE_VILLAGE_PUBLISH-默认.png ✓ |
| A | subpackages/village/village/tag-posts | 默认 | A/SUBPACKAGES_VILLAGE_VILLAGE_TAG-POSTS-默认.png ✓ |
| B | pages/discover/index | 默认 | B/PAGES_DISCOVER_INDEX-默认.png ✓ |
| B | pages/home/index | 滚动后 | B/PAGES_HOME_INDEX-滚动后.png ✓ |
| B | pages/home/index | 默认 | B/PAGES_HOME_INDEX-默认.png ✓ |
| B | pages/messages/index | 默认 | B/PAGES_MESSAGES_INDEX-默认.png ✓ |
| B | pages/nearby/index | 滚动后 | B/PAGES_NEARBY_INDEX-滚动后.png ✓ |
| B | pages/nearby/index | 默认 | B/PAGES_NEARBY_INDEX-默认.png ✓ |
| B | pages/profile/index | 滚动后 | B/PAGES_PROFILE_INDEX-滚动后.png ✓ |
| B | pages/profile/index | 默认 | B/PAGES_PROFILE_INDEX-默认.png ✓ |
| B | subpackages/campus/campus/certification | 默认 | B/SUBPACKAGES_CAMPUS_CAMPUS_CERTIFICATION-默认.png ✓ |
| B | subpackages/campus/campus/hub | 滚动后 | B/SUBPACKAGES_CAMPUS_CAMPUS_HUB-滚动后.png ✓ |
| B | subpackages/campus/campus/hub | 默认 | B/SUBPACKAGES_CAMPUS_CAMPUS_HUB-默认.png ✓ |
| B | subpackages/campus/campus/post-topic | 默认 | B/SUBPACKAGES_CAMPUS_CAMPUS_POST-TOPIC-默认.png ✓ |
| B | subpackages/campus/campus/topic-detail | 默认 | B/SUBPACKAGES_CAMPUS_CAMPUS_TOPIC-DETAIL-默认.png ✓ |
| B | subpackages/circles/circles/circle-home | 默认 | B/SUBPACKAGES_CIRCLES_CIRCLES_CIRCLE-HOME-默认.png ✓ |
| B | subpackages/circles/circles/index | 默认 | B/SUBPACKAGES_CIRCLES_CIRCLES_INDEX-默认.png ✓ |
| B | subpackages/circles/circles/post-topic | 默认 | B/SUBPACKAGES_CIRCLES_CIRCLES_POST-TOPIC-默认.png ✓ |
| B | subpackages/circles/circles/topic-detail | 默认 | B/SUBPACKAGES_CIRCLES_CIRCLES_TOPIC-DETAIL-默认.png ✓ |
| B | subpackages/circles/circles/topics | 默认 | B/SUBPACKAGES_CIRCLES_CIRCLES_TOPICS-默认.png ✓ |
| B | subpackages/discover-extra/discover/history | 默认 | B/SUBPACKAGES_DISCOVER-EXTRA_DISCOVER_HISTORY-默认.png ✓ |
| B | subpackages/discover-extra/discover/match-success | 默认 | B/SUBPACKAGES_DISCOVER-EXTRA_DISCOVER_MATCH-SUCCESS-默认.png ✓ |
| B | subpackages/discover-extra/home/segment | 默认 | B/SUBPACKAGES_DISCOVER-EXTRA_HOME_SEGMENT-默认.png ✓ |
| B | subpackages/discover-extra/likes-visitors/index | 默认 | B/SUBPACKAGES_DISCOVER-EXTRA_LIKES-VISITORS_INDEX-默认.png ✓ |
| B | subpackages/discover-extra/likes/index | 默认 | B/SUBPACKAGES_DISCOVER-EXTRA_LIKES_INDEX-默认.png ✓ |
| B | subpackages/discover-extra/nearby/people | 默认 | B/SUBPACKAGES_DISCOVER-EXTRA_NEARBY_PEOPLE-默认.png ✓ |
| B | subpackages/discover/discussions/index | 默认 | B/SUBPACKAGES_DISCOVER_DISCUSSIONS_INDEX-默认.png ✓ |
| B | subpackages/legal/agreement/index | 默认 | B/SUBPACKAGES_LEGAL_AGREEMENT_INDEX-默认.png ✓ |
| B | subpackages/legal/privacy/index | 默认 | B/SUBPACKAGES_LEGAL_PRIVACY_INDEX-默认.png ✓ |
| B | subpackages/market/detail/index | 默认 | B/SUBPACKAGES_MARKET_DETAIL_INDEX-默认.png ✓ |
| B | subpackages/profile-extra/feedback/history | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_FEEDBACK_HISTORY-默认.png ✓ |
| B | subpackages/profile-extra/profile/album | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_ALBUM-默认.png ✓ |
| B | subpackages/profile-extra/profile/favorites | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_FAVORITES-默认.png ✓ |
| B | subpackages/profile-extra/profile/location | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_LOCATION-默认.png ✓ |
| B | subpackages/profile-extra/profile/other | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_OTHER-默认.png ✓ |
| B | subpackages/profile-extra/profile/privacy | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_PRIVACY-默认.png ✓ |
| B | subpackages/profile-extra/profile/tasks | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_TASKS-默认.png ✓ |
| B | subpackages/profile-extra/profile/visitors | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_PROFILE_VISITORS-默认.png ✓ |
| B | subpackages/profile-extra/settings/dnd | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_SETTINGS_DND-默认.png ✓ |
| B | subpackages/profile-extra/settings/index | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_SETTINGS_INDEX-默认.png ✓ |
| B | subpackages/profile-extra/verification/index | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_VERIFICATION_INDEX-默认.png ✓ |
| B | subpackages/profile-extra/verification/real-name | 默认 | B/SUBPACKAGES_PROFILE-EXTRA_VERIFICATION_REAL-NAME-默认.png ✓ |
| B | subpackages/setup/interest/index | 默认 | B/SUBPACKAGES_SETUP_INTEREST_INDEX-默认.png ✓ |
| B | subpackages/setup/profile/index | 默认 | B/SUBPACKAGES_SETUP_PROFILE_INDEX-默认.png ✓ |
| B | subpackages/setup/recommend-pref/index | 默认 | B/SUBPACKAGES_SETUP_RECOMMEND-PREF_INDEX-默认.png ✓ |
| B | subpackages/setup/schedule/index | 默认 | B/SUBPACKAGES_SETUP_SCHEDULE_INDEX-默认.png ✓ |
| B | subpackages/support/feedback/index | 默认 | B/SUBPACKAGES_SUPPORT_FEEDBACK_INDEX-默认.png ✓ |
| B | subpackages/tools/activities/detail | 默认 | B/SUBPACKAGES_TOOLS_ACTIVITIES_DETAIL-默认.png ✓ |
| B | subpackages/tools/daily-question/index | 默认 | B/SUBPACKAGES_TOOLS_DAILY-QUESTION_INDEX-默认.png ✓ |
| B | subpackages/tools/heart-signals/index | 默认 | B/SUBPACKAGES_TOOLS_HEART-SIGNALS_INDEX-默认.png ✓ |
| B | subpackages/tools/help/index | 默认 | B/SUBPACKAGES_TOOLS_HELP_INDEX-默认.png ✓ |
| B | subpackages/tools/love-center/consulting | 默认 | B/SUBPACKAGES_TOOLS_LOVE-CENTER_CONSULTING-默认.png ✓ |
| B | subpackages/tools/love-center/index | 默认 | B/SUBPACKAGES_TOOLS_LOVE-CENTER_INDEX-默认.png ✓ |
| B | subpackages/tools/love-center/mbti | 默认 | B/SUBPACKAGES_TOOLS_LOVE-CENTER_MBTI-默认.png ✓ |
| B | subpackages/tools/love-center/nearby | 默认 | B/SUBPACKAGES_TOOLS_LOVE-CENTER_NEARBY-默认.png ✓ |
| B | subpackages/tools/search/index | 默认 | B/SUBPACKAGES_TOOLS_SEARCH_INDEX-默认.png ✓ |
| B | subpackages/tools/security/index | 默认 | B/SUBPACKAGES_TOOLS_SECURITY_INDEX-默认.png ✓ |
| B | subpackages/village/village/detail | 默认 | B/SUBPACKAGES_VILLAGE_VILLAGE_DETAIL-默认.png ✓ |
| B | subpackages/village/village/history | 默认 | B/SUBPACKAGES_VILLAGE_VILLAGE_HISTORY-默认.png ✓ |
| B | subpackages/village/village/index | 默认 | B/SUBPACKAGES_VILLAGE_VILLAGE_INDEX-默认.png ✓ |
| B | subpackages/village/village/post | 默认 | B/SUBPACKAGES_VILLAGE_VILLAGE_POST-默认.png ✓ |
| B | subpackages/village/village/publish | 默认 | B/SUBPACKAGES_VILLAGE_VILLAGE_PUBLISH-默认.png ✓ |
| B | subpackages/village/village/tag-posts | 默认 | B/SUBPACKAGES_VILLAGE_VILLAGE_TAG-POSTS-默认.png ✓ |
| A | pages/register/index | 默认 | reports\screenshots\round-1\A\PAGES_REGISTER_INDEX-默认.png ✓ |
| A | pages/register/index | 交互后 | reports\screenshots\round-1\A\PAGES_REGISTER_INDEX-交互后.png ✓ |
| B | subpackages/chat/chat-session/index | 默认 | reports\screenshots\round-1\B\SUBPACKAGES_CHAT_CHAT-SESSION_INDEX-默认.png ✓ |
| B | subpackages/chat/official-chat/index | 默认 | reports\screenshots\round-1\B\SUBPACKAGES_CHAT_OFFICIAL-CHAT_INDEX-默认.png ✓ |
| B | subpackages/setup/campus/index | 默认 | reports\screenshots\round-1\B\SUBPACKAGES_SETUP_CAMPUS_INDEX-默认.png ✓ |
| B | subpackages/discover/activities/index | 默认 | reports\screenshots\round-1\B\SUBPACKAGES_DISCOVER_ACTIVITIES_INDEX-默认.png ✓ |
| B | subpackages/market/shop/index | 默认 | reports\screenshots\round-1\B\SUBPACKAGES_MARKET_SHOP_INDEX-默认.png ✓ |
| B | subpackages/market/wallet/index | 默认 | reports\screenshots\round-1\B\SUBPACKAGES_MARKET_WALLET_INDEX-默认.png ✓ |
| B | pages/login/index | 默认 | reports\screenshots\round-1\B\PAGES_LOGIN_INDEX-默认.png ✓ |
| B | pages/login/index | 交互后 | reports\screenshots\round-1\B\PAGES_LOGIN_INDEX-交互后.png ✓ |
| B | pages/register/index | 默认 | reports\screenshots\round-1\B\PAGES_REGISTER_INDEX-默认.png ✓ |
| B | pages/register/index | 交互后 | reports\screenshots\round-1\B\PAGES_REGISTER_INDEX-交互后.png ✓ |
| B | pages/register/success | 默认 | reports\screenshots\round-1\B\PAGES_REGISTER_SUCCESS-默认.png ✓ |

> 注：「✓」为本会话 fs.existsSync 实测；manifest 内 file 路径若为别名写法导致未命中，以「（按相对名未命中）」如实标注，不强行判缺。
## 三、round-1-tour 巡检 MD5 复核（本会话实测）

| 文件 | 大小(B) | MD5（实测） |
|---|---:|---|
| A/pages_discover_index__交互后.png | 217519 | b75391513de109dac959aee0ca2fc3a2 |
| A/pages_discover_index__弹层态.png | 68952 | 89bfd19cec0021ce7e57ab802692602e |
| A/pages_discover_index__默认.png | 217519 | b75391513de109dac959aee0ca2fc3a2 |
| A/pages_home_index__交互后.png | 164050 | bf309c38c7e77130f359ef1a786942e6 |
| A/pages_home_index__弹层态.png | 164050 | bf309c38c7e77130f359ef1a786942e6 |
| A/pages_home_index__滚动-中部.png | 130718 | 19dd3be7297d6d8f8fa687c499dd49ef |
| A/pages_home_index__滚动-底部.png | 128644 | ea06afd3456ecb4e6c1a3041a93be4e0 |
| A/pages_home_index__默认.png | 164082 | c138a0b33d5cebbecabaf4f9eb289f9c |
| A/pages_login_index__交互后.png | 154069 | 0bee0cf5a0d6ff63d9e1a96859e99766 |
| A/pages_login_index__校验错误.png | 154069 | 0bee0cf5a0d6ff63d9e1a96859e99766 |
| A/pages_login_index__默认.png | 154069 | 0bee0cf5a0d6ff63d9e1a96859e99766 |
| A/pages_messages_index__交互后.png | 99027 | b2b7019ff747cc24ff116f8bcbc239cc |
| A/pages_messages_index__空态.png | 99027 | b2b7019ff747cc24ff116f8bcbc239cc |
| A/pages_messages_index__默认.png | 99027 | b2b7019ff747cc24ff116f8bcbc239cc |
| A/pages_nearby_index__交互后.png | 135240 | d13704f8f11b64e154346c1b0d4d88d2 |
| A/pages_nearby_index__滚动-中部.png | 148487 | 4dfed67f5222de1b25040c03dac92e24 |
| A/pages_nearby_index__滚动-底部.png | 235278 | a259ef47b6c1f8cab8f2fcee13a1ec9e |
| A/pages_nearby_index__默认.png | 135213 | 60cff4ec364f9396faeb2a2fe04a4bec |
| A/pages_profile_index__交互后.png | 146221 | 3b0ca8959ab06009f5c1e35a3bcb7a3e |
| A/pages_profile_index__滚动-中部.png | 157147 | 1fdfe09307d021bf82b499c9d3b42adb |
| A/pages_profile_index__滚动-底部.png | 85819 | cbfaf533ac3fc103cda3ec10c45d4201 |
| A/pages_profile_index__默认.png | 146236 | 7bc689c6b694f836ae75c82b37ef2093 |
| A/subpackages_campus_campus_certification__滚动-中部.png | 73495 | d28a86c3e610f98517fc813679b4439d |
| A/subpackages_campus_campus_certification__滚动-底部.png | 71094 | c34bc5cc721aa31f379624a745ac51e4 |
| A/subpackages_campus_campus_certification__默认.png | 67042 | 3464d3cedc4dea145fc051033d203de0 |
| A/subpackages_campus_campus_hub__交互后.png | 173156 | 1beebec9248253103547f9626fefca65 |
| A/subpackages_campus_campus_hub__弹层态.png | 173156 | 1beebec9248253103547f9626fefca65 |
| A/subpackages_campus_campus_hub__滚动-中部.png | 227558 | 1e1d740bec92110b5c37537ac7d6cdc4 |
| A/subpackages_campus_campus_hub__滚动-底部.png | 215544 | 3012356b27547111f89d6ed061aa92f7 |
| A/subpackages_campus_campus_hub__默认.png | 173140 | cbc8d68168274a2a1312d4d52e48a64b |
| A/subpackages_campus_campus_post-topic__交互后.png | 61589 | db07c2fcbb2e6080d5764a9e38952199 |
| A/subpackages_campus_campus_post-topic__校验错误.png | 61437 | 5fda8e2c91e3123ba03d0bae14d5ec59 |
| A/subpackages_campus_campus_post-topic__滚动-中部.png | 72437 | 713b1f6bfefd3ef7818f7ad763e39e3f |
| A/subpackages_campus_campus_post-topic__滚动-底部.png | 68982 | bec7434179de36a962e96dc635eaa75e |
| A/subpackages_campus_campus_post-topic__键盘弹起-输入后.png | 61256 | 4ade846bf362526797a5e52903132dff |
| A/subpackages_campus_campus_post-topic__默认.png | 61589 | db07c2fcbb2e6080d5764a9e38952199 |
| A/subpackages_campus_campus_topic-detail__默认.png | 34211 | 4e8bda1811fceedfbc274b4bd3dbd496 |
| A/subpackages_chat_chat-session_index__交互后.png | 73413 | 832595c333e020e71eab96c04abae4a2 |
| A/subpackages_chat_chat-session_index__弹层态.png | 39467 | 7a2cbb23b10535147c202bbf3b87c1a5 |
| A/subpackages_chat_chat-session_index__空态.png | 34369 | 2ff13102dac77d89704e5e718453daae |
| A/subpackages_chat_chat-session_index__默认.png | 34369 | 2ff13102dac77d89704e5e718453daae |
| A/subpackages_chat_official-chat_index__交互后.png | 199310 | 7fd0eb1ae9a72defaa65a490bc31b5bd |
| A/subpackages_chat_official-chat_index__默认.png | 154072 | 43cd008bcc7fb2518b6c7489dbf03e69 |
| A/subpackages_circles_circles_circle-home__数据态.png | 200690 | 1627ba6f01b184f50af6174462fa4e70 |
| A/subpackages_circles_circles_circle-home__滚动-中部.png | 162357 | 873907c8cfc3a82c2649ec9929e034b5 |
| A/subpackages_circles_circles_circle-home__滚动-底部.png | 193473 | 8977c7c05143698a40a0df067ac015aa |
| A/subpackages_circles_circles_circle-home__默认.png | 200690 | 1627ba6f01b184f50af6174462fa4e70 |
| A/subpackages_circles_circles_index__交互后.png | 185433 | 8ab8939c05baa77c755f96aa91f06ec4 |
| A/subpackages_circles_circles_index__数据态.png | 185414 | badeb1648aa11fdb74882e17c63b64e1 |
| A/subpackages_circles_circles_index__滚动-中部.png | 214205 | e1a5c88ea224f390bb0e3356e3bf0148 |
| A/subpackages_circles_circles_index__滚动-底部.png | 204607 | 995797617733f70dcdf933525f05dea4 |
| A/subpackages_circles_circles_index__默认.png | 185414 | badeb1648aa11fdb74882e17c63b64e1 |
| A/subpackages_circles_circles_post-topic__交互后.png | 50949 | 2e63910cc76aaf204d089cea89f0d35f |
| A/subpackages_circles_circles_post-topic__滚动-中部.png | 51668 | 5b50be12a718f26f97cb6e063cf5ca6b |
| A/subpackages_circles_circles_post-topic__滚动-底部.png | 42932 | 61f859f4655498bdec8286d0f5550722 |
| A/subpackages_circles_circles_post-topic__键盘弹起-输入后.png | 52965 | 3a680f438433f3d28b042619937c1a6a |
| A/subpackages_circles_circles_post-topic__默认.png | 50978 | 5454c980305954cdc96e07e0a946c9f3 |
| A/subpackages_circles_circles_topic-detail__默认.png | 34358 | a683c3c57efbb55af4b6820e12006257 |
| A/subpackages_circles_circles_topics__默认.png | 57966 | ed541b25ac2bffc8232c9d1c6f9bfec5 |
| A/subpackages_discover-extra_discover_history__默认.png | 33812 | 4f83c4206fa89ff8848c2570e1586c72 |
| A/subpackages_discover-extra_discover_match-success__交互后.png | 68213 | 25f0e58bff61695e4bf4dcfa05b06409 |
| A/subpackages_discover-extra_home_segment__默认.png | 80758 | 03e68c053d52aaf8d2677b132ad65576 |
| A/subpackages_discover-extra_likes-visitors_index__滚动-中部.png | 125839 | df4c36652644c20c6bd45b210a36eb26 |
| A/subpackages_discover-extra_likes-visitors_index__滚动-底部.png | 125563 | 713c440d4d3d0d495382343a67b25a2d |
| A/subpackages_discover-extra_likes-visitors_index__默认.png | 108928 | e172ebbfdb55bff2794872ba6762258f |
| A/subpackages_discover-extra_likes_index__滚动-中部.png | 126332 | d8f98cffd180434f8cede7edb32af5b5 |
| A/subpackages_discover-extra_likes_index__滚动-底部.png | 124971 | ab1944f0b025393c5704d2e14bb67196 |
| A/subpackages_discover-extra_likes_index__默认.png | 133897 | e36d1939e87a949bd81f05b429d081b1 |
| A/subpackages_discover-extra_nearby_people__默认.png | 71549 | 184e3c1915dfdcb0628e8c9bf8efa109 |
| A/subpackages_discover_activities_index__滚动-中部.png | 93768 | 552c98b0b31afa654ead3f5e556b1fae |
| A/subpackages_discover_activities_index__滚动-底部.png | 104092 | ae3d754c1e7844a59f2cf0b191d886e9 |
| A/subpackages_discover_activities_index__默认.png | 91991 | 096f5e29f8e26d13a256fc183fcb9579 |
| A/subpackages_discover_discussions_index__默认.png | 61856 | 0a0bf984b6656b7c3129dfdf198cad25 |
| A/subpackages_legal_agreement_index__滚动-底部.png | 193609 | 8fea0d3b536b657385731b77243030c0 |
| A/subpackages_legal_agreement_index__默认.png | 183820 | 49263a266a8375a495e80862ec52b796 |
| A/subpackages_legal_privacy_index__滚动-中部.png | 208777 | 4130029082f2867fc1c807e244900e4d |
| A/subpackages_legal_privacy_index__滚动-底部.png | 185141 | 12ae156f701c9db0fbca2f6c23f48356 |
| A/subpackages_legal_privacy_index__默认.png | 186030 | 9d4e733a60504cf42102e407565d8a48 |
| A/subpackages_market_detail_index__默认.png | 19463 | 00d9688f4bafeb41df52867c4a635927 |
| A/subpackages_market_shop_index__默认.png | 24520 | 6da446f08e3491b06667cf101d94a1b1 |
| A/subpackages_market_wallet_index__默认.png | 25493 | d4515b84b39ee5b01853594a11e71139 |
| A/subpackages_profile-extra_feedback_history__默认.png | 47524 | 857cf9f87164ae7a39e9ab67fe5c7886 |
| A/subpackages_profile-extra_profile_album__空态.png | 132642 | 94d80372fc702f20a4a3bbe751324550 |
| A/subpackages_profile-extra_profile_album__默认.png | 132642 | 94d80372fc702f20a4a3bbe751324550 |
| A/subpackages_profile-extra_profile_favorites__默认.png | 70782 | 1e8cc4bda34a33c659d5963e88072186 |
| A/subpackages_profile-extra_profile_location__默认.png | 100034 | 65006f9c86d609a8b20bb56efb019d22 |
| A/subpackages_profile-extra_profile_other__滚动-中部.png | 166463 | 5d8c68a8aee3fd5fef793d1032f275a0 |
| A/subpackages_profile-extra_profile_other__滚动-底部.png | 125494 | 36f2fbd6ac1279e59356a4f9be9d48bc |
| A/subpackages_profile-extra_profile_other__默认.png | 292022 | f3ae00d3a75004aa7c2cab94133e6dee |
| A/subpackages_profile-extra_profile_privacy__默认.png | 33658 | 1b99cc2b6885e9b9618b1a4f7ef80810 |
| A/subpackages_profile-extra_profile_tasks__默认.png | 62130 | d40949cba323f5690f589174b6c46afb |
| A/subpackages_profile-extra_profile_visitors__滚动-中部.png | 129126 | a0c4d32346502631da01f99ce909160c |
| A/subpackages_profile-extra_profile_visitors__滚动-底部.png | 125203 | d8918eef31024df0d9bd95bb644cc412 |
| A/subpackages_profile-extra_profile_visitors__默认.png | 111404 | 449f439f2a5580179d0a51dae6cd105d |
| A/subpackages_profile-extra_settings_dnd__数据态.png | 61426 | 0deb9a4e2a105e6840a351d43c92ec4e |
| A/subpackages_profile-extra_settings_dnd__默认.png | 61426 | 0deb9a4e2a105e6840a351d43c92ec4e |
| A/subpackages_profile-extra_settings_index__滚动-中部.png | 60918 | 0e88ab7f2687020b44e6ea1299444768 |
| A/subpackages_profile-extra_settings_index__滚动-底部.png | 61753 | 98f4b91618a84e3a3aa6634e72838ee7 |
| A/subpackages_profile-extra_settings_index__默认.png | 54495 | e4fc789824dc38dbbea8075b6e31d42e |
| A/subpackages_profile-extra_verification_index__滚动-中部.png | 78878 | 5f17932809243217f706686be788d7fe |
| A/subpackages_profile-extra_verification_index__滚动-底部.png | 89580 | f918c652e6e010efa65b64345104f429 |
| A/subpackages_profile-extra_verification_index__空态.png | 57531 | c413d4491c63624c6e4d8b46a4fe6932 |
| A/subpackages_profile-extra_verification_index__默认.png | 57531 | c413d4491c63624c6e4d8b46a4fe6932 |
| A/subpackages_profile-extra_verification_real-name__空态.png | 68222 | b277c3ace1aedcc96d3166f9479635fb |
| A/subpackages_profile-extra_verification_real-name__键盘弹起-输入后.png | 67510 | 384169eb253fd1417910067762d15e0c |
| A/subpackages_profile-extra_verification_real-name__默认.png | 68222 | b277c3ace1aedcc96d3166f9479635fb |
| A/subpackages_setup_campus_index__默认.png | 60172 | 7b914364058e16f9e96c90b8cc2a2cf1 |
| A/subpackages_setup_interest_index__默认.png | 43704 | ccc07356aeebed983f5b10c5a47db2eb |
| A/subpackages_setup_profile_index__数据态.png | 185557 | 1c1ef53d2392a7d8c470dc78e021f2df |
| A/subpackages_setup_profile_index__校验错误.png | 185768 | 3b2a09e058a7f5b1d8ce3a8c0a1dc573 |
| A/subpackages_setup_profile_index__滚动-中部.png | 116422 | dc565531c1763b6fb4fc8ba8a0cfd6cd |
| A/subpackages_setup_profile_index__滚动-底部.png | 72785 | 4bcb7e68ee38f19ec6ba368d04d07204 |
| A/subpackages_setup_profile_index__键盘弹起-输入后.png | 188087 | 490e32e5578815100c47d2b3c4f50cd2 |
| A/subpackages_setup_profile_index__默认.png | 185557 | 1c1ef53d2392a7d8c470dc78e021f2df |
| A/subpackages_setup_recommend-pref_index__默认.png | 62399 | 3c1a878129970ad13d34003bd2d69bea |
| A/subpackages_setup_schedule_index__键盘弹起-输入后.png | 39865 | 86528739e89d9324924eaca190c5d370 |
| A/subpackages_setup_schedule_index__默认.png | 39646 | c977778cc0966117ddb94deece9a6a06 |
| A/subpackages_support_feedback_index__滚动-中部.png | 71545 | f86e06a1e3d1dba12b055ced2a898326 |
| A/subpackages_support_feedback_index__滚动-底部.png | 74134 | a1fff085ab27bb47d9a0c46415c34cc9 |
| A/subpackages_support_feedback_index__键盘弹起-输入后.png | 58001 | 87d75eb816550cf4a322095152f2d1a8 |
| A/subpackages_support_feedback_index__默认.png | 54980 | 21b1fb24c04dd461e447f0506ee32974 |
| A/subpackages_tools_daily-question_index__默认.png | 37298 | 406af6f89b3ee4175223534c69a3fcff |
| A/subpackages_tools_heart-signals_index__默认.png | 98772 | 0138369edac9ab652b923ca407b67f09 |
| A/subpackages_tools_help_index__默认.png | 83686 | 9703f4f8bb2dff8e8c877de145160b2a |
| A/subpackages_tools_love-center_consulting__默认.png | 23198 | 0436a618bf248e6956d34dcabfe63980 |
| A/subpackages_tools_love-center_index__滚动-中部.png | 25269 | f4c3ade69773ea5fb0f23e435ac44bc1 |
| A/subpackages_tools_love-center_index__滚动-底部.png | 19411 | 31281451a4611e1c2081db62bc2d3029 |
| A/subpackages_tools_love-center_index__默认.png | 24240 | 27fe536665fe30b4876e66404ac0ddcd |
| A/subpackages_tools_love-center_mbti__默认.png | 94574 | 1e1d315100416100dad94f076945abfd |
| A/subpackages_tools_love-center_nearby__默认.png | 200566 | e4292937fa2eb75e3f9c57d50533ef47 |
| A/subpackages_tools_search_index__默认.png | 25601 | f46bac8d32c297e4bba734f6554c5de0 |
| A/subpackages_tools_security_index__滚动-中部.png | 86571 | e7aab14c0700302486219d3f99c7e9e5 |
| A/subpackages_tools_security_index__滚动-底部.png | 84462 | 7239d150919130d5d8d45b632f025721 |
| A/subpackages_tools_security_index__默认.png | 66016 | 60b1a1f771ad04fc3df665f6e0eb6468 |
| A/subpackages_village_village_detail__数据态.png | 179283 | 13df6d860f0a05de7f83f4b87c3e74a5 |
| A/subpackages_village_village_detail__滚动-中部.png | 185501 | d151e9696acec4ded4094762712a5a97 |
| A/subpackages_village_village_detail__滚动-底部.png | 121238 | b68f43189a5758c7234b0a4e4e4df0c6 |
| A/subpackages_village_village_detail__默认.png | 179283 | 13df6d860f0a05de7f83f4b87c3e74a5 |
| A/subpackages_village_village_history__默认.png | 170732 | d115465e84fa88924221acc4f96628f2 |
| A/subpackages_village_village_index__滚动-中部.png | 214421 | 038c09aa12bec85ec9a051a058c74849 |
| A/subpackages_village_village_index__滚动-底部.png | 154037 | c6fc9681965c5ba9c61d80f5b8b50147 |
| A/subpackages_village_village_index__默认.png | 185940 | ee12ff28cbdf59d9acc8d0ce38086ed2 |
| A/subpackages_village_village_post__交互后.png | 59942 | 02ad8e096e4f6fdab3e5ce03bad1446d |
| A/subpackages_village_village_post__弹层态.png | 70293 | 67f76e2bbe3329f05bd2efd20ef9e483 |
| A/subpackages_village_village_post__默认.png | 70276 | 674e33adb5aa8dc9fb87a175f0f5f69b |
| A/subpackages_village_village_publish__交互后.png | 52524 | accc380ac0a44a057b9f57993dc8252e |
| A/subpackages_village_village_publish__弹层态.png | 43644 | c500d8d87c2950e6b4769775e2534def |
| A/subpackages_village_village_publish__校验错误.png | 43644 | c500d8d87c2950e6b4769775e2534def |
| A/subpackages_village_village_publish__键盘弹起-输入后.png | 43534 | 9917666e86096d7ad4a89f72f8b8a96c |
| A/subpackages_village_village_publish__默认.png | 43561 | bde9ad5bd30e4282ceec461b1fa4a54f |
| A/subpackages_village_village_tag-posts__空态.png | 32468 | 3117562785868e7fd0eea4a78ed47b2f |
| A/subpackages_village_village_tag-posts__默认.png | 32468 | 3117562785868e7fd0eea4a78ed47b2f |
| B/.mimosa/hook-state/sess_dwf-dwfrun-addb38f0-ad95-49a9-b65c-ff5cf9896a6a-actor_14_24.json | 218 | dc92ee5f70ec5d2b6ffe4372ccddefca |
| B/pages_discover_index__交互后.png | 217649 | a70751eb2a5342850c90aba885ed83cc |
| B/pages_discover_index__弹层态.png | 69050 | 25aa34282f6d7f5af8be5a0b8e0ba30a |
| B/pages_discover_index__默认.png | 217649 | a70751eb2a5342850c90aba885ed83cc |
| B/pages_home_index__交互后.png | 164171 | a5a2d1aa595e00977504b0644b2b58e3 |
| B/pages_home_index__弹层态.png | 164155 | 09021982a199f4c56cf669d5eaba8f2f |
| B/pages_home_index__滚动-中部.png | 130843 | dde14432de919dd4ad76664d572bd10d |
| B/pages_home_index__滚动-底部.png | 128768 | 5b1c914f813a38bfca312cb47ae4e99a |
| B/pages_home_index__默认.png | 164171 | a5a2d1aa595e00977504b0644b2b58e3 |
| B/pages_login_index__交互后.png | 154097 | 6af01f848cb07d8af8437c414bdcd39d |
| B/pages_login_index__校验错误.png | 154097 | 6af01f848cb07d8af8437c414bdcd39d |
| B/pages_login_index__默认.png | 154097 | 6af01f848cb07d8af8437c414bdcd39d |
| B/pages_messages_index__交互后.png | 98948 | 2e42b497aae589c21df2edcc5a016b5f |
| B/pages_messages_index__空态.png | 98948 | 2e42b497aae589c21df2edcc5a016b5f |
| B/pages_messages_index__默认.png | 98948 | 2e42b497aae589c21df2edcc5a016b5f |
| B/pages_nearby_index__交互后.png | 135330 | dd772fbca8842151b38190dc880b5549 |
| B/pages_nearby_index__滚动-中部.png | 148664 | 0b391bab9e2bbaa4f881f7bdfea76cfb |
| B/pages_nearby_index__滚动-底部.png | 235340 | 738b81d259b8f225c83425765de4bd3b |
| B/pages_nearby_index__默认.png | 135301 | ae305836dc05f95c06948fad1ef86770 |
| B/pages_profile_index__交互后.png | 146204 | dc9434d53b2fc0971ae700b80e0f9b75 |
| B/pages_profile_index__滚动-中部.png | 157023 | a1627ae5adfd11201c11b3d4aa86b0b4 |
| B/pages_profile_index__滚动-底部.png | 85771 | b748cf810d9ab4d655528d25d31c9c3b |
| B/pages_profile_index__默认.png | 146108 | 6b62d472d7d0b0d1a6ce60dfe6618c13 |
| B/subpackages_campus_campus_certification__滚动-中部.png | 73627 | f4dd1abdbef7632b117ece9afd1b8cc7 |
| B/subpackages_campus_campus_certification__滚动-底部.png | 71202 | 869c7fe2739bb56e0e3e1b602fbe8864 |
| B/subpackages_campus_campus_certification__默认.png | 67130 | 4750df5db8bd3418bd86635808e71fd5 |
| B/subpackages_campus_campus_hub__交互后.png | 173223 | 6327d2186b70207e197fd843619bfa27 |
| B/subpackages_campus_campus_hub__弹层态.png | 173236 | 57943644286dc0790999e4218f3827d7 |
| B/subpackages_campus_campus_hub__滚动-中部.png | 227581 | 7b1ad0eab979fe0a1f814014d74a6fee |
| B/subpackages_campus_campus_hub__滚动-底部.png | 215563 | ff0ca8aa160ccbc45a1c70d7f1fe2a89 |
| B/subpackages_campus_campus_hub__默认.png | 173223 | 6327d2186b70207e197fd843619bfa27 |
| B/subpackages_campus_campus_post-topic__交互后.png | 61483 | e1940afc427809ea7cefe2ecdd2e21f1 |
| B/subpackages_campus_campus_post-topic__滚动-中部.png | 72496 | 48c75d5c9223eb1bef27f6b51c9c1334 |
| B/subpackages_campus_campus_post-topic__滚动-底部.png | 69085 | 214d386da72a2044191560889b23b91e |
| B/subpackages_campus_campus_post-topic__键盘弹起-输入后.png | 61334 | 91de262742beb4ba32ba2eada27c0cd6 |
| B/subpackages_campus_campus_post-topic__默认.png | 61483 | e1940afc427809ea7cefe2ecdd2e21f1 |
| B/subpackages_campus_campus_topic-detail__默认.png | 34278 | ca06565b315d5f65e0ad47ca2f6358e4 |
| B/subpackages_chat_chat-session_index__交互后.png | 73498 | f1bd4a42c0bb020823c28065e7c5e120 |
| B/subpackages_chat_chat-session_index__弹层态.png | 39546 | e7f2c01d512ea02d62de69ed69327958 |
| B/subpackages_chat_chat-session_index__空态.png | 34351 | 528bec0beeb31f8eba7a73554a2f2567 |
| B/subpackages_chat_chat-session_index__默认.png | 34351 | 528bec0beeb31f8eba7a73554a2f2567 |
| B/subpackages_chat_official-chat_index__交互后.png | 199381 | b24a39858acf79fdfcaab8df71964b65 |
| B/subpackages_chat_official-chat_index__默认.png | 154267 | eb3310655393d527af7586a07188df75 |
| B/subpackages_circles_circles_circle-home__数据态.png | 200806 | ad0f9d775b42c016df23e5b3041d6ded |
| B/subpackages_circles_circles_circle-home__滚动-中部.png | 162408 | 76f20121eea5ead4593b05fba5f862c5 |
| B/subpackages_circles_circles_circle-home__滚动-底部.png | 193506 | cfd750410cf8ca6a41b2a202842fb344 |
| B/subpackages_circles_circles_circle-home__默认.png | 200806 | ad0f9d775b42c016df23e5b3041d6ded |
| B/subpackages_circles_circles_index__交互后.png | 185562 | 92036f60914082b651fa952bf46106c9 |
| B/subpackages_circles_circles_index__数据态.png | 185556 | b4188db5349f49af6e1a419b7b1f8848 |
| B/subpackages_circles_circles_index__滚动-中部.png | 214257 | fb23ce84142cb6800da8ddc06b2d3915 |
| B/subpackages_circles_circles_index__滚动-底部.png | 204713 | 282d2b5d7412af7930d8fd391e833ec4 |
| B/subpackages_circles_circles_index__默认.png | 185556 | b4188db5349f49af6e1a419b7b1f8848 |
| B/subpackages_circles_circles_post-topic__交互后.png | 50897 | 2cded2eed36b8ab0ee15781e58d7ec37 |
| B/subpackages_circles_circles_post-topic__滚动-中部.png | 51684 | be65ecc994bb1c9a3170750ae4e4fe39 |
| B/subpackages_circles_circles_post-topic__滚动-底部.png | 43033 | a4aee4043504d29c58738f4e94289635 |
| B/subpackages_circles_circles_post-topic__键盘弹起-输入后.png | 53021 | 8f0f3810bfa3d2ee3e111dcf873839cc |
| B/subpackages_circles_circles_post-topic__默认.png | 50812 | d74baf400413626b4f19a732e67fb683 |
| B/subpackages_circles_circles_topic-detail__默认.png | 34462 | 7f34d5e24864089930147c16109be80e |
| B/subpackages_circles_circles_topics__默认.png | 58184 | 2371ce7b836eb5b60c379db34b80e081 |
| B/subpackages_discover-extra_discover_history__默认.png | 33886 | 80eaa1278b5c55159b688d654a06c783 |
| B/subpackages_discover-extra_discover_match-success__交互后.png | 73263 | 6c2a86d85746b977e820cebd510a03eb |
| B/subpackages_discover-extra_discover_match-success__默认.png | 130076 | 6d688c64a40d04adc7ada3914f99ab0a |
| B/subpackages_discover-extra_home_segment__默认.png | 80745 | d3efdea3137f3694b4b50ef3c81bd746 |
| B/subpackages_discover-extra_likes-visitors_index__滚动-中部.png | 125879 | 9d84aeb15ad3c905f53ceebc05e93264 |
| B/subpackages_discover-extra_likes-visitors_index__滚动-底部.png | 125637 | bd0c348c48d77bcd9ab9b606ed9a1741 |
| B/subpackages_discover-extra_likes-visitors_index__默认.png | 109003 | 71b1e84562af938a6402d684355101f9 |
| B/subpackages_discover-extra_likes_index__滚动-中部.png | 126449 | 52e1e881ba04553dba7b7bb12c6294f4 |
| B/subpackages_discover-extra_likes_index__滚动-底部.png | 125068 | 44ac42de6842386b2c8e323b113cc0a0 |
| B/subpackages_discover-extra_likes_index__默认.png | 133935 | 295a55a0079b040737b1c7e2ff60c443 |
| B/subpackages_discover-extra_nearby_people__默认.png | 71658 | d655f85937d98c7cf7958c28b26aa90e |
| B/subpackages_discover_activities_index__滚动-中部.png | 93844 | a8ccc968fd889037a1845169a5fc0552 |
| B/subpackages_discover_activities_index__滚动-底部.png | 104246 | 71b6aeb51c3aa79e8b373a41cebc32c8 |
| B/subpackages_discover_activities_index__默认.png | 92159 | 0f2af625157cfb100d5a2b23a6554134 |
| B/subpackages_discover_discussions_index__默认.png | 62007 | a908248301550055c443451b95823284 |
| B/subpackages_legal_agreement_index__滚动-中部.png | 226448 | 35f3e32f97726ab33b6e0c655dc2f721 |
| B/subpackages_legal_agreement_index__滚动-底部.png | 193612 | 4c90c48c4d80bb6cb332beb188c48265 |
| B/subpackages_legal_agreement_index__默认.png | 183846 | a637855a99690a432a9e2fbbbe0e34f1 |
| B/subpackages_legal_privacy_index__滚动-中部.png | 208789 | b0fdb2981df0c261973bad9e98469c3d |
| B/subpackages_legal_privacy_index__滚动-底部.png | 185291 | 3c967d87372e63d350594da987596266 |
| B/subpackages_legal_privacy_index__默认.png | 186178 | 2d9cba54af2cd41fccbb3e476f87ada8 |
| B/subpackages_market_detail_index__默认.png | 19599 | 6595170a22f26652b33aaadb20ff1688 |
| B/subpackages_market_shop_index__默认.png | 24574 | 632a5c099092eb537ad9ad460f3a017f |
| B/subpackages_market_wallet_index__默认.png | 25528 | c77859450875cf9d12fca4bda46fadb0 |
| B/subpackages_profile-extra_feedback_history__默认.png | 47623 | fe10717d56cb2efc0019b0d97908adf5 |
| B/subpackages_profile-extra_profile_album__空态.png | 132747 | ab24a53dc84081b2f489d23a2fbcf09f |
| B/subpackages_profile-extra_profile_album__默认.png | 132747 | ab24a53dc84081b2f489d23a2fbcf09f |
| B/subpackages_profile-extra_profile_favorites__默认.png | 70793 | ce48468d296adf770506d29cc1232ab9 |
| B/subpackages_profile-extra_profile_location__默认.png | 100230 | 8c8698f25b1eeb57ae32eb48e7c9fe10 |
| B/subpackages_profile-extra_profile_other__滚动-中部.png | 166512 | 433fe0c9d49b47ac3663fddf17f9dfc1 |
| B/subpackages_profile-extra_profile_other__滚动-底部.png | 125612 | 033e09f6d3dd347ec9ddefc4727143a0 |
| B/subpackages_profile-extra_profile_other__默认.png | 292066 | 1031e01642f46d6826169202bf08dc90 |
| B/subpackages_profile-extra_profile_privacy__默认.png | 33825 | c975a7da44c4d0ea30fbf1c5ac95e5af |
| B/subpackages_profile-extra_profile_tasks__默认.png | 62178 | d8e80a7e117f613aa2d68755062554c3 |
| B/subpackages_profile-extra_profile_visitors__滚动-中部.png | 129253 | 4e7ad37097a8256a08e471db49a180fc |
| B/subpackages_profile-extra_profile_visitors__滚动-底部.png | 125268 | 76e77fa279e76178bbdda1126c07ff32 |
| B/subpackages_profile-extra_profile_visitors__默认.png | 111471 | f8d7e03699cd4000e0bce40958bab84e |
| B/subpackages_profile-extra_settings_dnd__数据态.png | 61489 | c05cfe9b2677bf85b94f4acc131a8845 |
| B/subpackages_profile-extra_settings_dnd__默认.png | 61489 | c05cfe9b2677bf85b94f4acc131a8845 |
| B/subpackages_profile-extra_settings_index__滚动-中部.png | 60943 | c116afa720954a835d82249060e80b87 |
| B/subpackages_profile-extra_settings_index__滚动-底部.png | 61760 | a237b8f029527ae8946fd875cd2a9566 |
| B/subpackages_profile-extra_settings_index__默认.png | 54577 | 465432928cf0df979a3ef0e05f0248e5 |
| B/subpackages_profile-extra_verification_index__滚动-中部.png | 79020 | 4edfbed09c9aa38f0c8ee2626c9c6a62 |
| B/subpackages_profile-extra_verification_index__滚动-底部.png | 89681 | 29ae08314203bb1c2c677bc72eb07126 |
| B/subpackages_profile-extra_verification_index__空态.png | 57687 | a3b917950357b8e3c428d77fc90aaa88 |
| B/subpackages_profile-extra_verification_index__默认.png | 57687 | a3b917950357b8e3c428d77fc90aaa88 |
| B/subpackages_profile-extra_verification_real-name__空态.png | 68268 | 5e272900cee47ffcd2c4cc10bc2cd12b |
| B/subpackages_profile-extra_verification_real-name__键盘弹起-输入后.png | 67573 | 78824c29cd9a84f70c22369e93d9d3e4 |
| B/subpackages_profile-extra_verification_real-name__默认.png | 68268 | 5e272900cee47ffcd2c4cc10bc2cd12b |
| B/subpackages_setup_campus_index__默认.png | 59969 | 3231113db7cebfc1868411436ce23b72 |
| B/subpackages_setup_interest_index__默认.png | 43841 | 045def8d2f3eb3108881718ceb865963 |
| B/subpackages_setup_profile_index__数据态.png | 185900 | df46e5d79ebddda069de31682952b344 |
| B/subpackages_setup_profile_index__校验错误.png | 185809 | c196afa58975bb9df94a06aa6f2ba3e5 |
| B/subpackages_setup_profile_index__滚动-中部.png | 116449 | d8719e78afc48102ea6eb9663ad739b7 |
| B/subpackages_setup_profile_index__滚动-底部.png | 72898 | dde5a4b4632156351c8688e10552ddaf |
| B/subpackages_setup_profile_index__键盘弹起-输入后.png | 187916 | 825eb2aee60ca282355f27b5df1e6ad8 |
| B/subpackages_setup_profile_index__默认.png | 185900 | df46e5d79ebddda069de31682952b344 |
| B/subpackages_setup_recommend-pref_index__默认.png | 62501 | edcae011a3d1d68abab19520892d80f5 |
| B/subpackages_setup_schedule_index__键盘弹起-输入后.png | 39971 | e844c72729bcd29af78e07e767c700bf |
| B/subpackages_setup_schedule_index__默认.png | 39696 | 4e6edaaae988606b3e9a5de4412742e3 |
| B/subpackages_support_feedback_index__滚动-中部.png | 71629 | f5dfc468b08b01ebdb984bc6b426f556 |
| B/subpackages_support_feedback_index__滚动-底部.png | 74231 | d8601cc862c6072b37e0a9f02a05e36f |
| B/subpackages_support_feedback_index__键盘弹起-输入后.png | 58131 | 7f514952723c1387101027a18442f437 |
| B/subpackages_support_feedback_index__默认.png | 55105 | 58af836f1ea2cf5fbd3fc4472b494965 |
| B/subpackages_tools_activities_detail__默认.png | 199608 | 55aa19843548a79da449609323214bf6 |
| B/subpackages_tools_daily-question_index__默认.png | 37332 | 71101915d7fec480e59318874a1995f4 |
| B/subpackages_tools_heart-signals_index__默认.png | 98823 | 8c476543f12850ac59216eb7e520ae96 |
| B/subpackages_tools_help_index__默认.png | 83853 | d0cba223bef25223215b790d67c4c12c |
| B/subpackages_tools_love-center_consulting__默认.png | 23289 | 19a88fb99424f6c0b633ca3675e66566 |
| B/subpackages_tools_love-center_index__滚动-中部.png | 25385 | ebb07ac9d560643462f30f213eabe281 |
| B/subpackages_tools_love-center_index__滚动-底部.png | 19540 | 5a6054c23c2f2b5a1d8f6640f677d180 |
| B/subpackages_tools_love-center_index__默认.png | 24317 | e024fd482dd64ac6c5376b52bcd6fcd1 |
| B/subpackages_tools_love-center_mbti__默认.png | 94594 | ac219f68867ce94e78ea71cdfc91f322 |
| B/subpackages_tools_love-center_nearby__默认.png | 200576 | 6fc211823f16e5de861f037dec0e6ea5 |
| B/subpackages_tools_search_index__默认.png | 25693 | 894229edadecbc76068b4f2247b3b106 |
| B/subpackages_tools_security_index__滚动-中部.png | 86699 | f4fa2e3eee0c53710c4d3f424aaccc9a |
| B/subpackages_tools_security_index__滚动-底部.png | 84530 | 0b68be502d090d267d094986e5b2dbf3 |
| B/subpackages_tools_security_index__默认.png | 66144 | 33b3e970b712319b79f89905cba0a36c |
| B/subpackages_village_village_detail__数据态.png | 179346 | 2590558c86873ad4c54fc2cf138c4780 |
| B/subpackages_village_village_detail__滚动-中部.png | 185496 | e142a74014d9c7882a10f6613479448a |
| B/subpackages_village_village_detail__滚动-底部.png | 121270 | b9b4551b40b511186cfbe2c0d69294af |
| B/subpackages_village_village_detail__默认.png | 179346 | 2590558c86873ad4c54fc2cf138c4780 |
| B/subpackages_village_village_history__默认.png | 170912 | 958b8cfba2a4676275bc5eb42fc2e17e |
| B/subpackages_village_village_index__滚动-中部.png | 214368 | 4e537a471c49aa8b596d70da8a53aa85 |
| B/subpackages_village_village_index__滚动-底部.png | 154119 | 6ad60b708b39e4c4c0cafce97d1a01f9 |
| B/subpackages_village_village_index__默认.png | 185966 | 054bcdb9779da35d78551621c6cf257d |
| B/subpackages_village_village_post__交互后.png | 60048 | 434c6c8080375541933c51be490da9b0 |
| B/subpackages_village_village_post__弹层态.png | 70358 | 521d06ca0e0874f5466856bf65d1ae29 |
| B/subpackages_village_village_post__默认.png | 70337 | 05933ba53ac1ad885f4cfa11d8fb4431 |
| B/subpackages_village_village_publish__交互后.png | 53087 | 3d48990d7b41cc8999ed75c83ba35486 |
| B/subpackages_village_village_publish__弹层态.png | 43591 | 1852d32daad66f2c4015c803361204a2 |
| B/subpackages_village_village_publish__校验错误.png | 162607 | c186bb207cc4791be022564ade8a1236 |
| B/subpackages_village_village_publish__默认.png | 43591 | 1852d32daad66f2c4015c803361204a2 |
| B/subpackages_village_village_tag-posts__空态.png | 32545 | 4df0142667e582ec2d280558e05c7f1e |
| B/subpackages_village_village_tag-posts__默认.png | 32545 | 4df0142667e582ec2d280558e05c7f1e |
| blank-check.tsv | 52873 | 9355e0f11874e08369c2ce1e001852f6 |
| boot-verify-A.log | 164 | 46986b376f466299b0726f396fe9ed9d |
| boot-verify-B.log | 123 | 60dd66fbc5810287dd84e966f5efb1f3 |
| manifest-detail.json | 78794 | 6e4f4bc2b52310a1c94c364e5ed677de |

- 视觉审查员留档指纹（findings/PAGES-LOGIN-INDEX.json meta.screenshotMd5Fingerprint，任务给定材料）：tourA 三张同 MD5=默认/校验错误/交互后 三张 MD5 相同 = 0bee0cf5a0d6ff63d9e1a96859e99766（154069B）；tourB 三张同 MD5=默认/校验错误/交互后 三张 MD5 相同 = 6af01f848cb07d8af8437c414bdcd39d（154097B）；结论：两轮巡检各只拍到 1 个真实状态；「校验错误」「交互后」为默认态的逐字节复制（对应并坐实历史线索 R13『01/05/16三图相同需重拍复核』）
- **书记员实测复核结论**：tour 登录页 A 身份 3 张实测 MD5 唯一值=0bee0cf5a0d6ff63d9e1a96859e99766，与留档指纹一致 → **复核成立** ✅；B 身份 3 张唯一值=6af01f848cb07d8af8437c414bdcd39d，与留档指纹一致 → **复核成立** ✅。即「校验错误/交互后」确为默认态的逐字节复制，视觉线 101/历史 R13 线索的判定前提成立。
- 同型「三态及以上同图」实测不限于登录页（A 身份存在 ≥3 态 MD5 相同的页面）：pages_login_index（3 态同图）；pages_messages_index（3 态同图）。注：仅 2 态同图的页面（如不可滚动页「滚动-中部=滚动-底部」）未列入，避免把正常现象计为异常。此为书记员对上表 MD5 的归纳，仅陈述实测事实，定性归视觉/需求线。

## 四、判定 JSON 引用证据存在性核对

- 27 份判定 JSON 共引用截图/wxml 证据 844 处（去重 663 个文件）：盘上存在 782 处、按文件名还原命中 24 处、**缺失 38 处**。

缺失清单（去重后）：

- reports/audit/round-1/interact/_tmp_badge_crop.png
- reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-DC01-after.png
- reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-DC02-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG01-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG05-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG06-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG07-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG10-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG17-before.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG19-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG22-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG25-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG26-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG27-before.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG32-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG33-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG37-before.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG38-after.png
- reports/screenshots/round-1-interact/PAGES-MESSAGES-INDEX-MSG40-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB01-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS14-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC01-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC02-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC07-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC08-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-SEARCH-INDEX-SE09-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD05-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD08-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB07-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB03-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-LOVE-CENTER-CONSULTING-CO03-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST20-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT15-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-LEGAL-PRIVACY-INDEX-PRI04-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-LEGAL-AGREEMENT-INDEX-AGR04-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-LEGAL-AGREEMENT-INDEX-AGR06-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-MARKET-DETAIL-INDEX-MD03-after.png
- reports/screenshots/round-1-interact/SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.wxml

## 五、逐截图 → 用例/判定反查矩阵

说明：下表把每份判定 JSON 引用的截图（png/wxml）映射到引用它的用例、判定与关联发现；「盘上」=✓存在 / ✓*按名还原 / ✗缺失（详见第四节）。同一截图被多次引用时合并。

### PAGES-LOGIN-INDEX-judge.json（引用截图 33 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-LOGIN-INDEX-LG01-after.png | LG01 | ✅ | MP-R1-LOGIN-002 | ✓ |
| PAGES-LOGIN-INDEX-00-base.png | LG01、LG21 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG04-after.wxml | LG04 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG04-before.png | LG04 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-21-after-bottom.png | LG05 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-21-after-top.png | LG05 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-02-after.png | LG06 | ✅ | MP-R1-LOGIN-002 | ✓ |
| PAGES-LOGIN-INDEX-04-after.png | LG06 | ✅ | MP-R1-LOGIN-002 | ✓ |
| PAGES-LOGIN-INDEX-01-back1.png | LG07 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-19b-after.png | LG08 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-03-after.png | LG09 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-03-after2.png | LG09 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG10-after.wxml | LG10 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG13-after.wxml | LG13 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-07-after.png | LG15、LG16 | ✅ ⚠️ | MP-R1-LOGIN-001 | ✓ |
| PAGES-LOGIN-INDEX-LG17-after.wxml | LG17 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG17-after.png | LG17 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-06-after.png | LG17 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG18-after.wxml | LG18 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG19-after.wxml | LG19 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-LG20-after.wxml | LG20 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG20-after.png | LG20 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-17-after.png | LG22 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-09-after.png | LG23 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-10-after.png | LG23 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-11-after.png | LG24 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-12-after.png | LG24 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-13-after.png | LG25 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-08b-after.png | LG26 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-14b-after.png | LG29 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-LG30-after.wxml | LG30 | ⚠️ | — | ✓ |
| PAGES-LOGIN-INDEX-16b-after.png | LG31 | ✅ | — | ✓ |
| PAGES-LOGIN-INDEX-LG33-after.wxml | LG33 | ⚠️ | — | ✓ |

### PAGES-REGISTER-INDEX-judge.json（引用截图 11 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-REGISTER-INDEX-REG01-after.png | REG01 | ✅ | — | ✓ |
| PAGES-REGISTER-INDEX-REG08-after.png | REG08 | ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG09-after.png | REG09 | ✅ | — | ✓ |
| PAGES-REGISTER-INDEX-REG13-after.png | REG13 | ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG14-after.png | REG14 | ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG15-after.png | REG15 | ✅ | — | ✓ |
| PAGES-REGISTER-INDEX-REG17-after.png | REG16、REG17 | ✅ ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG22-after.png | REG21、REG22 | ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG25-before.png | REG25 | ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG28-after.wxml | REG28 | ⚠️ | — | ✓ |
| PAGES-REGISTER-INDEX-REG32-after.png | REG32 | ⚠️ | MP-R1-PAGES-REGISTER-INDEX-002 | ✓ |

### PAGES-REGISTER-SUCCESS-judge.json（引用截图 2 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-REGISTER-SUCCESS-RS05-after.png | RS01、RS05、RS12 | ⚠️ | — | ✓ |
| PAGES-REGISTER-SUCCESS-RS08-after.png | RS06、RS07、RS08 | ⚠️❌ | MP-R1-PAGES-REGISTER-SUCCESS-006、MP-R1-PAGES-REGISTER-SUCCESS-005、MP-R1-PAGES-REGISTER-SUCCESS-004 | ✓ |

### PAGES-HOME-INDEX-judge.json（引用截图 16 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-HOME-INDEX-H02-after.png | H02 | ✅ | — | ✓ |
| pages_home_index__弹层态.png | H02 | ✅ | — | ✓ |
| _tmp_badge_crop.png | H04 | ⚠️ | — | ✗ |
| PAGES-HOME-INDEX-H08-after.wxml | H07、H08、H09、H11 | ⚠️❌ ✅ | — | ✓ |
| PAGES-HOME-INDEX-H08-before.png | H08 | ❌ | — | ✓ |
| PAGES-HOME-INDEX-H09-after.wxml | H09 | ✅ | — | ✓ |
| PAGES-HOME-INDEX-H25-after.wxml | H25 | ❌ | MP-R1-HOME-102 | ✓ |
| PAGES-HOME-INDEX-H26-after.png | H26 | ⚠️ | — | ✓ |
| PAGES-HOME-INDEX-H31-after.png | H30、H31 | ✅ ⚠️ | — | ✓ |
| PAGES-HOME-INDEX-H37-after.wxml | H37 | ✅ | — | ✓ |
| PAGES-HOME-INDEX-H38-after.wxml | H38 | ✅ | — | ✓ |
| PAGES-HOME-INDEX-H38-after.png | H38 | ✅ | — | ✓ |
| PAGES-HOME-INDEX-H39-after.wxml | H39 | ⚠️ | — | ✓ |
| PAGES-HOME-INDEX-H39-before.png | H39 | ⚠️ | — | ✓ |
| PAGES-HOME-INDEX-H48-after.png | H48 | ⚠️ | — | ✓ |
| pages_home_index__默认.png | H52 | ⚠️ | — | ✓ |

### PAGES-NEARBY-INDEX-judge.json（引用截图 6 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-NEARBY-INDEX-01-after.png | N01 | ✅ | — | ✓ |
| PAGES-NEARBY-INDEX-N25-after.wxml | N01、N20、N25、N34 | ✅ ⚠️ | — | ✓ |
| PAGES-NEARBY-INDEX-N23-after.wxml | N23 | ⚠️ | — | ✓ |
| PAGES-NEARBY-INDEX-N24-after.wxml | N24 | ⚠️ | — | ✓ |
| PAGES-NEARBY-INDEX-N26-after.wxml | N26 | ⚠️ | — | ✓ |
| PAGES-NEARBY-INDEX-N27-after.wxml | N27 | ⚠️ | — | ✓ |

### PAGES-DISCOVER-INDEX-judge.json（引用截图 29 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-DISCOVER-INDEX-DC01-after.png | DC01 | ⚠️ | — | ✗ |
| PAGES-DISCOVER-INDEX-DC02-after.png | DC02 | ⚠️ | — | ✗ |
| PAGES-DISCOVER-INDEX-DC28-after.png | DC03、DC28 | ✅ ⚠️ | — | ✓ |
| pages_discover_index__交互后.png | DC03、DC42 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC05-after.png | DC05 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC06-after.png | DC06 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC07-after.png | DC07 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC10-after.png | DC10 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC12-after.wxml | DC12、DC17 | ⚠️✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC13-after.wxml | DC13 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC14-after.wxml | DC14 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC17-after.wxml | DC17 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC18-after.wxml | DC18 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC19-after.wxml | DC19 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC20-after.wxml | DC20 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC21-before.png | DC21 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC22-after.wxml | DC22 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC23-after.wxml | DC23、DC44 | ⚠️ | MP-R1-DISCOVER-INDEX-102 | ✓ |
| PAGES-DISCOVER-INDEX-DC24-after.wxml | DC24 | ⚠️ | — | ✓ |
| pages_discover_index__弹层态.png | DC27 | ✅ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC29-after.png | DC29 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC31-after.png | DC31 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC32-after.png | DC32 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC35-after.png | DC35 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC36-after.png | DC36 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC37-after.png | DC37 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC38-after.png | DC38 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC39-after.png | DC39 | ⚠️ | — | ✓ |
| PAGES-DISCOVER-INDEX-DC44-after.wxml | DC44 | ⚠️ | MP-R1-DISCOVER-INDEX-102 | ✓ |

### PAGES-MESSAGES-INDEX-judge.json（引用截图 39 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-MESSAGES-INDEX-MSG01-after.png | MSG01 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG05-after.png | MSG05 | ✅ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG28-after.wxml | MSG05、MSG21、MSG22、MSG25、MSG26、MSG28、MSG30、MSG32、MSG38 | ✅ ⚠️ | MP-R1-PAGES-MESSAGES-INDEX-002、MP-R1-PAGES-MESSAGES-INDEX-003、MP-R1-PAGES-MESSAGES-INDEX-011 | ✓ |
| PAGES-MESSAGES-INDEX-MSG12-after.png | MSG05 | ✅ | MP-R1-PAGES-MESSAGES-INDEX-001 | ✓ |
| PAGES-MESSAGES-INDEX-MSG06-after.png | MSG06 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG07-after.png | MSG07 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG08-after.png | MSG08 | ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-25-scrolled.png | MSG09 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG10-after.png | MSG10 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-03-after.png | MSG11 | ✅ | MP-R1-MSG-001 | ✓ |
| PAGES-MESSAGES-INDEX-04-after.png | MSG12 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-05-after.png | MSG13 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-08-after.png | MSG14 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-06-after.png | MSG15 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-09-after.png | MSG16 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG17-after.wxml | MSG17 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG17-before.png | MSG17 | ✅ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG27-after.wxml | MSG18、MSG27 | ✅ | MP-R1-MSG-004 | ✓ |
| PAGES-MESSAGES-INDEX-28-after.png | MSG18 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG19-after.png | MSG19 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-12-after.png | MSG20 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-17-after.png | MSG21、MSG29 | ✅ ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG22-after.png | MSG22 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG25-after.png | MSG25 | ✅ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG26-after.png | MSG26 | ✅ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG27-before.png | MSG27 | ✅ | MP-R1-MSG-004 | ✗ |
| PAGES-MESSAGES-INDEX-MSG28-after.png | MSG28 | ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG29-before.png | MSG29 | ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG30-before.png | MSG30 | ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG31-before.png | MSG31 | ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG32-after.png | MSG32 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG33-after.png | MSG33 | ⚠️ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG34-after.wxml | MSG34 | ⚠️ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG35-after.wxml | MSG35 | ⚠️ | MP-R1-MSG-004 | ✓ |
| PAGES-MESSAGES-INDEX-MSG37-after.wxml | MSG37 | ✅ | — | ✓ |
| PAGES-MESSAGES-INDEX-MSG37-before.png | MSG37 | ✅ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG38-after.png | MSG38 | ✅ | — | ✗ |
| PAGES-MESSAGES-INDEX-MSG39-after.png | MSG39 | ⚠️ | MP-R1-MSG-003 | ✓ |
| PAGES-MESSAGES-INDEX-MSG40-after.png | MSG40 | ⚠️ | — | ✗ |

### PAGES-PROFILE-INDEX-judge.json（引用截图 34 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| PAGES-PROFILE-INDEX-23-after.png | PFI01 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-25-guest-other.png | PFI01、PFI08 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI08-after.wxml | PFI08 | ✅ | — | ✓ |
| pages_profile_index__默认.png | PFI09、PFI27、PFI50 | ✅ ⚠️ | — | ✓ |
| pages_profile_index__滚动-底部.png | PFI09、PFI34、PFI57 | ✅ ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-01-after.png | PFI10 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI44-after.wxml | PFI10、PFI34、PFI38、PFI44、PFI51、PFI56 | ✅ ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-02-dest.png | PFI11、PFI33 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI16-after.wxml | PFI12、PFI13、PFI16 | ⚠️ | MP-R1-PROFILE-002 | ✓ |
| PAGES-PROFILE-INDEX-PFI17-after.wxml | PFI17 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-03-back.png | PFI19 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-05-after.png | PFI20 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-15-after.png | PFI23 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-16-empty.png | PFI24 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-11-dest.png | PFI25、PFI32 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-14-after.png | PFI26 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-07-after.png | PFI28 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-06-dest.png | PFI29 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-09-dest.png | PFI30 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-10-after.png | PFI31 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI35-after.wxml | PFI35 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI40-before.png | PFI40 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI40-after.png | PFI40 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI41-after.png | PFI41 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI42-after.wxml | PFI42 | ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI43-after.wxml | PFI43 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-17-back.png | PFI48 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-PFI49-after.wxml | PFI48、PFI49 | ✅ ⚠️ | — | ✓ |
| PAGES-PROFILE-INDEX-00-base.png | PFI50 | ✅ | — | ✓ |
| pages_profile_index__滚动-中部.png | PFI57 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-20-back.png | PFI58 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-22-after.png | PFI59、PFI62 | ✅ | — | ✓ |
| PAGES-PROFILE-INDEX-21-back2.png | PFI69 | ⚠️ | — | ✓ |
| pages_profile_index__默认.png | PFI71 | ⚠️ | — | ✓ |

### SUBPACKAGES-VILLAGE-VILLAGE-INDEX-judge.json（引用截图 28 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI01-after.png | VI01、VI07、VI36 | ⚠️ | — | ✓ |
| subpackages_village_village_index__默认.png | VI01 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI02-after.png | VI02 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI10-after.png | VI09、VI10 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI14-after.png | VI14 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI16-after.wxml | VI15、VI16 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI16-before.png | VI16 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI20-after.png | VI20 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI26-after.png | VI20、VI25、VI26 | ⚠️✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI22-before.png | VI22 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI22-after.png | VI22 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI22-after.wxml | VI22 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI23-after.png | VI23 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI24-after.png | VI24 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI30-after.wxml | VI30 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI30-after.png | VI30 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI31-after.wxml | VI31 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI31-after.png | VI31 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI32-after.png | VI32 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI32-after.wxml | VI32 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI36-after.png | VI36 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI38-after.png | VI38 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI40-after.png | VI39、VI40 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI41-after.png | VI41 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI44-after.wxml | VI42、VI43、VI44 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI45-before.png | VI45 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI45-after.wxml | VI45 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI46-after.png | VI46 | ⚠️ | — | ✓ |

### SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-judge.json（引用截图 25 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB01-after.png | PUB01 | ⚠️ | — | ✗ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB05-after.png | PUB01、PUB05、PUB15、PUB19 | ⚠️✅ | MP-R1-PUB-016 | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-27-after.png | PUB02 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB04-after.png | PUB04 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB07-after.png | PUB04、PUB07 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB06-after.png | PUB06、PUB20、PUB21 | ❌ ⚠️ | MP-R1-PUB-018 | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB08-after.png | PUB08 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-13-after.png | PUB09 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-15-after.png | PUB10 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-10-after.png | PUB15 | ⚠️ | MP-R1-PUB-016 | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-11-after.png | PUB16 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-16-after.png | PUB18 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-21-after.png | PUB20 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB22-after.png | PUB22 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB23-after.png | PUB22、PUB23、PUB25、PUB26 | ✅ ⚠️ | MP-R1-PUB-017 | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-02-after.png | PUB22 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-03-after.png | PUB24 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-05-after.png | PUB25 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB27-after.png | PUB27 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-30-after.png | PUB27 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-31-after.png | PUB28 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-32-after.png | PUB29 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-22-after.png | PUB30 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-24-after.png | PUB32 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-PUB35-before.png | PUB35 | ⚠️ | — | ✓ |

### SUBPACKAGES-VILLAGE-VILLAGE-POST-judge.json（引用截图 28 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP02-after.png | VP01、VP02 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP02-after.wxml | VP02 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP03-after.png | VP03 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP03-after.wxml | VP03 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP04-after.png | VP04 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP04-after.wxml | VP04 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP05-after.png | VP05 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP05-after.wxml | VP05 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP06-after.png | VP06 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP06-after.wxml | VP06 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP07-after.png | VP07 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP07-after.wxml | VP07 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP08-after.png | VP08 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP08-after.wxml | VP08 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP10-after.png | VP10 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP19-after.png | VP11、VP19 | ⚠️ | MP-R1-VPOST-103 | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP15-after.png | VP15 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP20-after.png | VP20 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP21-after.png | VP21 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP22-after.png | VP22 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP24-after.png | VP24 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP26-after.png | VP26 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP27-after.png | VP27 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP27-after.wxml | VP27 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP29-after.wxml | VP29 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP30-after.png | VP30 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP33-after.png | VP33 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-POST-VP33-after.wxml | VP33 | ⚠️ | — | ✓ |

### SUBPACKAGES-CIRCLES-CIRCLES-INDEX-judge.json（引用截图 15 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI06-after.png | CI01、CI05、CI06 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI09-after.wxml | CI01、CI02 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI07-after.png | CI07、CI08 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI09-before.png | CI08、CI09、CI15 | ⚠️✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI09-after.png | CI09 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI10-before.png | CI10 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI10-after.png | CI10 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI11-before.png | CI11 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI11-after.wxml | CI11 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI12-after.png | CI11、CI12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI13-after.png | CI13、CI15 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI18-after.png | CI15、CI18 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI19-after.png | CI17、CI19 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI20-after.png | CI20 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI21-after.png | CI21 | ⚠️ | — | ✓ |

### SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-judge.json（引用截图 26 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| subpackages_circles_circles_post-topic__滚动-底部.png | PT01、PT32 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT02-after.png | PT02、PT18 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT03-after.png | PT03 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT05-after.wxml | PT05 | ✅ | MP-R1-POSTTOPIC-102 | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT06-after.png | PT06 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT06-after.wxml | PT06 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT08-after.png | PT07、PT08 | ⚠️✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT09-after.png | PT09 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT10-after.wxml | PT10 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT11-before.png | PT11 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT11-after.wxml | PT11 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT12-after.png | PT12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT12-after.wxml | PT12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT13-after.wxml | PT13 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT14-after.png | PT14 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT14-after.wxml | PT14 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT15-after.png | PT15 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT19-after.png | PT19 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT27-after.png | PT20、PT27 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT23-after.png | PT20、PT23 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT22-after.png | PT22 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT25-after.png | PT25 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT26-after.wxml | PT26 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT28-after.png | PT28 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT33-after.png | PT33 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT34-after.png | PT34 | ⚠️ | — | ✓ |

### SUBPACKAGES-CAMPUS-CAMPUS-HUB-judge.json（引用截图 12 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH01-after2.png | CH01、CH23 | ✅ | — | ✓ |
| subpackages_campus_campus_hub__默认.png | CH01、CH23 | ✅ | MP-R1-CH06-01 | ✓ |
| subpackages_campus_campus_hub__滚动-底部.png | CH01、CH22、CH23 | ✅ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH04-after.png | CH04、CH05 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH05-after.png | CH05 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH06-after.png | CH06 | ❌ | MP-R1-CH06-01 | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH08-after.png | CH08 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH16-before.png | CH16 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH16-after.png | CH16 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH16-after.wxml | CH16 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH17-after.png | CH17 | ⚠️ | — | ✓ |
| subpackages_campus_campus_hub__滚动-中部.png | CH23 | ✅ | — | ✓ |

### SUBPACKAGES-CAMPUS-CAMPUS-INDEX-judge.json（引用截图 9 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX03-after.png | CX03 | ✅ | MP-R1-CAMPUSINDEX-002 | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX04-after.png | CX04、CX09 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX10-after.png | CX10 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX11-after.png | CX11 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX12-after.png | CX12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX14-after.png | CX13、CX14 | ⚠️ | MP-R1-CAMPUSINDEX-002 | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX15-after.png | CX15 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX16-after.png | CX16 | ⚠️ | — | ✓ |
| CAMPUSINDEX-04-after.png | — | — | MP-R1-CAMPUSINDEX-002 | ✓* |

### SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-judge.json（引用截图 29 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT18-after.wxml | PT01、PT04、PT16、PT18、PT30、PT37 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT07-after.png | PT01、PT07 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT09-after.png | PT01、PT09 | ✅ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT04-after.png | PT04 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT10-after.png | PT10 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT12-after.png | PT12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT14-after.png | PT14 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT16-after.png | PT16 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT17-after.png | PT17 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT18-before.png | PT18 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT19-after.wxml | PT19 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT20-after.wxml | PT20 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT21-after.wxml | PT21 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT21-after.png | PT21 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT23-after.png | PT23 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT24-before.png | PT24 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT24-after.png | PT24 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT24-after.wxml | PT24 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT26-after.png | PT26 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT27-after.png | PT27 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT32-after.png | PT32 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT33-after.png | PT33 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT34-after.png | PT34 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT35-after.png | PT35 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT36-after.png | PT36 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT37-after.png | PT37 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT38-after.wxml | PT38 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT38-before.png | PT38 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT38-after.png | PT38 | ⚠️ | — | ✓ |

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-judge.json（引用截图 13 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT01-after.png | MT01 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT02-before.png | MT02 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT02-after.png | MT02 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT03-before.png | MT03 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT04-after.png | MT04 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT05-before.png | MT05 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT10-after.png | MT10 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT11-after.png | MT11 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT12-after.png | MT12 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT13-after.png | MT13 | ⚠️ | MP-R1-MATCHING-101 | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT15-after.wxml | MT15 | ⚠️ | MP-R1-MATCHING-102 | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT16-after.png | MT16 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT24-after.png | MT24 | ⚠️ | MP-R1-MATCHING-103 | ✓ |

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-judge.json（引用截图 19 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-MS14-after.png | MS01、MS14、MS15 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP04b-after1-toast-r4.png | MS01、MS07、MS08、MS15 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP01-after.png | MS01 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-MS04-after.png | MS02、MS03 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP12b-after-r3.png | MS02 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP11b-after-r3.png | MS03、MS10、MS15 | ⚠️✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP09-mid-in.png | MS05 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP13b-round1-out-r3.png | MS05 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP08b-after-r3.png | MS06 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP03b-after2-gone-r4.png | MS07 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-MS07-after.png | MS07 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP04b-after2-gone-r4.png | MS08 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP05b-after2-gone.png | MS09 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP06b-after2.png | MS10 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-MS10-after.wxml | MS10 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP10b-after.png | MS11 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP07b-after-r3.png | MS12 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-MS11-after.wxml | MS13 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-OP15b-before.png | MS16 | ✅ | — | ✓ |

### SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-judge.json（引用截图 31 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS06-after.png | CS05、CS06 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS07-after.png | CS07 | ✅ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS08-after.png | CS08 | ❌ | MP-R1-CHAT-CHAT-SESSION-INDEX-201 | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS09-after.png | CS09 | ❌ | MP-R1-CHAT-CHAT-SESSION-INDEX-202 | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS13-after.png | CS13 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS14-after.png | CS14 | ⚠️ | — | ✗ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS15-after.png | CS15 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS16-after.png | CS16 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS17-after.png | CS17 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS18-after.png | CS18 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS19-after.png | CS19 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS20-after.png | CS20 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS21-after.png | CS21 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS22-after.png | CS22 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS23-after.png | CS23 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS24-after.png | CS24 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS25-after.png | CS25 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS26-after.png | CS26 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS27-after.png | CS27 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS28-after.png | CS28 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS29-after.png | CS29 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS31-after.png | CS31 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS33-after.png | CS33 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS34-after.png | CS34 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS35-after.png | CS35 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS37-after.png | CS37 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS38-before.png | CS38 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS39-after.png | CS39 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS40-after.png | CS40 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS44-after.png | CS44 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS45-after.png | CS45 | ⚠️ | — | ✓ |

### SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-judge.json（引用截图 20 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC01-after.png | OC01 | ✅ | — | ✗ |
| subpackages_chat_official-chat_index__默认.png | OC01、OC02 | ✅ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC12-after.wxml | OC01、OC02、OC04、OC12、OC19、OC20、OC26 | ✅ ⚠️❌ | MP-R1-OC-001 | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC02-after.png | OC02 | ✅ | — | ✗ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC07-after.png | OC07 | ✅ | — | ✗ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC08-after.png | OC08 | ✅ | — | ✗ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC09-after.png | OC09 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC10-after.png | OC10 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC11-after.png | OC11 | ✅ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC12-before.png | OC12 | ✅ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC12-after.png | OC12、OC26 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC13-after.wxml | OC13 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC13-after.png | OC13 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC15-after.png | OC15 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC16-after.png | OC16 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC17-after.png | OC17 | ⚠️ | — | ✓ |
| subpackages_chat_official-chat_index__交互后.png | OC19、OC20 | ⚠️❌ | MP-R1-OC-001 | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC22-after.png | OC22 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC24-before.png | OC24 | ⚠️ | — | ✓ |
| SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC25-after.png | OC25 | ⚠️ | — | ✓ |

### 次要20-judge.json（引用截图 14 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-VD04-after.wxml | VD03、VD04 | ⚠️ | MP-R1-J20-006 | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-VD04-after.png | VD04 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-VD05-after.png | VD05、VD12 | ⚠️✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-VD12-after.png | VD12 | ✅ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-VD27-after.png | VD27 | ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-VH03-after.wxml | VH01、VH03 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-VILLAGE-VILLAGE-HISTORY-VH06-after.png | VH06 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-TOPIC-DETAIL-CD03-after.wxml | CD03 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-TOPIC-DETAIL-CD12-after.png | CD12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-CH03-after.png | CH03 | ✅ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-CH04-after.wxml | CH04 | ⚠️ | — | ✓ |
| SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-CH12-after.wxml | CH12 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-TOPIC-DETAIL-XT05-after.wxml | XT04、XT05 | ⚠️ | — | ✓ |
| SUBPACKAGES-CAMPUS-CAMPUS-TOPIC-DETAIL-XT11-after.png | XT11 | ✅ | — | ✓ |

### 次要21-judge.json（引用截图 18 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| subpackages_discover-extra_home_segment__默认.png | SG01 | ✅ | — | ✓ |
| subpackages_discover-extra_home_segment__默认.png | SG01 | ✅ | — | ✓ |
| subpackages_discover-extra_nearby_people__默认.png | NP01 | ✅ | — | ✓ |
| subpackages_discover-extra_nearby_people__默认.png | NP01 | ✅ | — | ✓ |
| subpackages_discover-extra_discover_history__默认.png | DH01 | ✅ | — | ✓ |
| subpackages_discover-extra_discover_history__默认.png | DH01 | ✅ | — | ✓ |
| subpackages_discover-extra_likes_index__默认.png | LK02 | ✅ | — | ✓ |
| subpackages_discover-extra_likes_index__默认.png | LK02 | ✅ | — | ✓ |
| subpackages_discover-extra_likes-visitors_index__默认.png | LV02、LV06、LV11 | ✅ | — | ✓ |
| subpackages_discover-extra_likes-visitors_index__默认.png | LV02 | ✅ | — | ✓ |
| subpackages_tools_daily-question_index__默认.png | DQ01 | ✅ | — | ✓ |
| subpackages_tools_daily-question_index__默认.png | DQ01 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-DAILY-QUESTION-INDEX-DQ02-after.wxml | DQ02、DQ04 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-DAILY-QUESTION-INDEX-DQ02-after.png | DQ02 | ✅ | — | ✓ |
| subpackages_tools_love-center_index__默认.png | LC01 | ✅ | — | ✓ |
| subpackages_tools_love-center_index__默认.png | LC01 | ✅ | — | ✓ |
| subpackages_tools_help_index__默认.png | HP01、HP09 | ✅ | — | ✓ |
| subpackages_tools_help_index__默认.png | HP01 | ✅ | — | ✓ |

### 次要22-judge.json（引用截图 54 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC02-after.png | SC01、SC02 | ✅ | — | ✓ |
| subpackages_tools_security_index__滚动-底部.png | SC01、SC09、SC13 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC03-after.png | SC03 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC04-after.wxml | SC04 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC05-after.png | SC05 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC06-after.png | SC06 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC07-after.wxml | SC07 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC12-after.png | SC12 | ❌ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC12-after.wxml | SC12 | ❌ | — | ✓ |
| SUBPACKAGES-TOOLS-SECURITY-INDEX-SC13-after.png | SC13 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-SEARCH-INDEX-SE01-after.png | SE01、SE02 | ✅ ⚠️ | MP-R1-SE02-01 | ✓ |
| SUBPACKAGES-TOOLS-SEARCH-INDEX-SE05-after.png | SE05 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SEARCH-INDEX-SE07-after.png | SE07 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-SEARCH-INDEX-SE09-after.png | SE09 | ⚠️ | — | ✗ |
| SUBPACKAGES-TOOLS-HEART-SIGNALS-INDEX-HS01-after.png | HS01 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-HEART-SIGNALS-INDEX-HS02-after.png | HS02 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-HEART-SIGNALS-INDEX-HS05-after.png | HS05 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-HEART-SIGNALS-INDEX-HS06-after.png | HS06 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-HEART-SIGNALS-INDEX-HS08-after.png | HS08 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-HEART-SIGNALS-INDEX-HS10-after.png | HS10 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD03-after.png | AD03 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD04-after.wxml | AD04 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD05-after.png | AD05 | ✅ | — | ✗ |
| SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD06-after.png | AD06 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-ACTIVITIES-DETAIL-AD08-after.png | AD08 | ⚠️ | — | ✗ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB01-after.png | NB01 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB03-after.wxml | NB01、NB03 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB03-after.png | NB03 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB04-after.png | NB04 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB05-after.png | NB05 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB05-after.wxml | NB05 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB06-after.wxml | NB06 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB07-after.png | NB07 | ⚠️ | — | ✗ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-NEARBY-NB09-after.png | NB09 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB01-after.png | MB01 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB02-after.png | MB02 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB03-after.png | MB03 | ✅ | — | ✗ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB04-after.wxml | MB04 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB05-after.png | MB05 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-MBTI-MB06-after.png | MB06 | ⚠️ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-CONSULTING-CO01-after.png | CO01 | ✅ | — | ✓ |
| SUBPACKAGES-TOOLS-LOVE-CENTER-CONSULTING-CO03-after.png | CO03 | ⚠️ | — | ✗ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST01-after.png | ST01、ST25 | ✅ | — | ✓ |
| subpackages_profile-extra_settings_index__滚动-底部.png | ST01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST05-after.png | ST05 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST14-after.png | ST14 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST15-after.png | ST15 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST18-after.png | ST18 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST19-after.png | ST19 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST20-after.png | ST20 | ⚠️ | — | ✗ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST21-after.png | ST21 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST23-after.png | ST23 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST24-after.png | ST24 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-INDEX-ST25-after.png | ST25 | ✅ | — | ✓ |

### 次要23-judge.json（引用截图 65 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI01-after.png | VI01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI06-after.wxml | VI01、VI02、VI06 | ✅ ⚠️ | — | ✓ |
| subpackages_profile-extra_verification_index__默认.png | VI01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI07-after.wxml | VI03、VI07 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI05-after.png | VI05 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI06-before.png | VI06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI08-after.wxml | VI08 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI12-after.wxml | VI12 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI13-after.png | VI13 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN01-after.png | RN01 | ✅ | — | ✓ |
| subpackages_profile-extra_verification_real-name__默认.png | RN01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN04-after.png | RN04 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN05-after.png | RN05 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN06-after.png | RN06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN07-before.png | RN07 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN07-after.wxml | RN07 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN08-after.wxml | RN08 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN09-after.wxml | RN09 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN10-after.png | RN10 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN11-after.png | RN11 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN12-after.png | RN12 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS01-after.png | VS01 | ✅ | — | ✓ |
| subpackages_profile-extra_profile_visitors__默认.png | VS01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS04-after.png | VS04 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS05-after.png | VS05 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS06-after.png | VS06 | ⚠️ | — | ✓ |
| subpackages_profile-extra_profile_other__默认.png | PO01 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO02-after.png | PO02 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO05-after.wxml | PO05 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO06-after.wxml | PO06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO06-after.png | PO06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO07-after.png | PO07 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO07-after.wxml | PO07 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO09-after.png | PO09 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO10-before.png | PO10 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO10-after.wxml | PO10 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO11-before.png | PO11 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO11-after.wxml | PO11 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO12-before.png | PO12 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO13-before.png | PO13 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO20-after.png | PO20 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC03-after.png | LC01、LC03 | ✅ ⚠️ | — | ✓ |
| subpackages_profile-extra_profile_location__默认.png | LC01 | ✅ | — | ✓ |
| subpackages_profile-extra_profile_location__默认.png | LC01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC02-after.wxml | LC02 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC03-after.wxml | LC03 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-PRIVACY-PV05-after.png | PV01、PV05 | ✅ ⚠️ | — | ✓ |
| subpackages_profile-extra_profile_privacy__默认.png | PV01 | ✅ | — | ✓ |
| subpackages_profile-extra_profile_privacy__默认.png | PV01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL05-before.png | AL01、AL05 | ✅ ⚠️ | — | ✓ |
| subpackages_profile-extra_profile_album__默认.png | AL01 | ✅ | — | ✓ |
| subpackages_profile-extra_profile_album__空态.png | AL01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL02-after.wxml | AL02 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL03-after.png | AL03 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL05-after.wxml | AL05 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL06-before.png | AL06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL06-after.wxml | AL06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL08-after.png | AL08 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL12-after.png | AL12 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA01-after.png | FA01 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA03-before.png | FA01、FA03 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA03-after.wxml | FA03 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA04-after.png | FA04 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA04-after.wxml | FA04 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA07-after.png | FA07 | ⚠️ | — | ✓ |

### 次要24-judge.json（引用截图 26 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| subpackages_profile-extra_profile_tasks__默认.png | TK01、TK07、TK09 | ✅ ⚠️ | — | ✓ |
| subpackages_profile-extra_profile_tasks__默认.png | TK01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-PROFILE-TASKS-TK02-after.wxml | TK02、EP14 | ⚠️ | MP-R1-C24-003 | ✓ |
| subpackages_profile-extra_settings_dnd__默认.png | DND01 | ✅ | — | ✓ |
| subpackages_profile-extra_settings_dnd__数据态.png | DND01 | ✅ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-DND-DND03-after.png | DND03 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-DND-DND06-after.png | DND06 | ⚠️ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-DND-DND08-before.png | DND08 | ❌ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-SETTINGS-DND-DND08-after.wxml | DND08 | ❌ | — | ✓ |
| SUBPACKAGES-PROFILE-EXTRA-FEEDBACK-HISTORY-FH03-after.png | FH01、FH03、FH06、FH09 | ✅ ⚠️ | — | ✓ |
| subpackages_profile-extra_feedback_history__默认.png | FH01 | ✅ | — | ✓ |
| SUBPACKAGES-SETUP-PROFILE-INDEX-EP03-after.png | EP01、EP03、EP09 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-SETUP-PROFILE-INDEX-EP03-after.wxml | EP01 | ✅ | — | ✓ |
| subpackages_setup_profile_index__校验错误.png | EP02 | ✅ | — | ✓ |
| subpackages_setup_profile_index__滚动-中部.png | EP15 | ✅ | — | ✓ |
| subpackages_setup_profile_index__滚动-底部.png | EP15 | ✅ | — | ✓ |
| SUBPACKAGES-SETUP-CAMPUS-INDEX-CA03-after.png | CA01、CA03 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-SETUP-CAMPUS-INDEX-CA07-after.png | CA01、CA07 | ✅ | — | ✓ |
| subpackages_setup_campus_index__默认.png | CA01 | ✅ | — | ✓ |
| subpackages_setup_schedule_index__默认.png | SC01 | ✅ | — | ✓ |
| SUBPACKAGES-SETUP-SCHEDULE-INDEX-SC05-after.wxml | SC05 | ⚠️ | — | ✓ |
| subpackages_setup_recommend-pref_index__默认.png | RP01 | ✅ | — | ✓ |
| SUBPACKAGES-SETUP-RECOMMEND-PREF-INDEX-RP05-after.wxml | RP01 | ✅ | — | ✓ |
| SUBPACKAGES-SETUP-RECOMMEND-PREF-INDEX-RP03-after.png | RP03 | ⚠️ | — | ✓ |
| subpackages_setup_interest_index__默认.png | IN01 | ✅ | — | ✓ |
| subpackages_setup_interest_index__默认.png | IN01 | ✅ | — | ✓ |

### 次要25-judge.json（引用截图 52 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| SUBPACKAGES-SETUP-DEV-INDEX-DEV03-after.wxml | DEV01、DEV03 | ⚠️ | — | ✓ |
| SUBPACKAGES-SETUP-DEV-INDEX-DEV04-after.png | DEV04 | ⚠️ | — | ✓ |
| SUBPACKAGES-SETUP-DEV-INDEX-DEV05-after.png | DEV05 | ⚠️ | — | ✓ |
| SUBPACKAGES-SETUP-DEV-INDEX-DEV09-after.png | DEV09 | ⚠️ | — | ✓ |
| SUBPACKAGES-SETUP-SHOWCASE-INDEX-SC08-after.png | SC08 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB02-after.png | FB01、FB02 | ✅ ❌ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.wxml | FB02 | ❌ | — | ✓* |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB03-after.png | FB03 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-before.png | FB03、FB08 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB04-after.png | FB04 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB05-after.png | FB05 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB06-after.png | FB06 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB07-after.wxml | FB07 | ❌ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.png | FB08 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB09-before.png | FB09 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB09-after.wxml | FB09 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB10-before.png | FB10 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB11-before.png | FB11 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB11-after.png | FB11 | ⚠️ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB17-after.png | FB17 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC02-after.png | DC01、DC02、DC03、DC04 | ✅ ⚠️❌ | — | ✓ |
| subpackages_discover_discussions_index__默认.png | DC01 | ✅ | — | ✓ |
| subpackages_discover_discussions_index__默认.png | DC01 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC06-after.png | DC06 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC07-after.png | DC07 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT05-before.png | ACT01、ACT05 | ✅ ❌ | — | ✓ |
| subpackages_discover_activities_index__默认.png | ACT01 | ✅ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT03-after.png | ACT03 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT04-after.png | ACT04 | ❌ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT05-after.png | ACT05 | ❌ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT06-before.png | ACT06 | ❌ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT06-after.png | ACT06 | ❌ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT07-after.png | ACT07 | ❌ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT07-after.wxml | ACT07 | ❌ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT09-after.png | ACT09 | ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT14-after.png | ACT10、ACT14 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT15-after.png | ACT15 | ⚠️ | — | ✗ |
| subpackages_legal_privacy_index__默认.png | PRI01、PRI05 | ✅ ⚠️ | — | ✓ |
| subpackages_legal_privacy_index__滚动-底部.png | PRI01、PRI03 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-LEGAL-PRIVACY-INDEX-PRI04-after.png | PRI04 | ⚠️ | — | ✗ |
| subpackages_legal_agreement_index__默认.png | AGR01、AGR05 | ✅ ⚠️ | — | ✓ |
| subpackages_legal_agreement_index__滚动-底部.png | AGR01、AGR03 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-LEGAL-AGREEMENT-INDEX-AGR04-after.png | AGR04 | ⚠️ | — | ✗ |
| SUBPACKAGES-LEGAL-AGREEMENT-INDEX-AGR06-after.png | AGR06 | ⚠️ | — | ✗ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD01-after.png | MD01、MD02 | ✅ ⚠️ | — | ✓ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD03-after.png | MD03 | ⚠️ | — | ✗ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD04-after.png | MD04 | ⚠️ | — | ✓ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD05-after.wxml | MD05、MD07 | ⚠️ | — | ✓ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD05-before.png | MD05 | ⚠️ | — | ✓ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD06-after.png | MD06 | ⚠️ | — | ✓ |
| SUBPACKAGES-MARKET-DETAIL-INDEX-MD08-after.png | MD08 | ✅ | — | ✓ |
| SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.wxml | — | — | MP-R1-次要25-2 | ✗ |

### 次要26-judge.json（引用截图 9 个）

| 截图（文件名） | 引用用例 | 判定 | 关联 issue | 盘上 |
|---|---|---|---|---|
| subpackages_market_shop_index__默认.png | SH01、SH03 | ✅ ⚠️ | — | ✓ |
| subpackages_market_shop_index__默认.png | SH01 | ✅ | — | ✓ |
| SUBPACKAGES-MARKET-SHOP-INDEX-SH06-after.png | SH06 | ⚠️ | — | ✓ |
| subpackages_market_wallet_index__默认.png | WA01、WA04 | ✅ ⚠️ | — | ✓ |
| subpackages_market_wallet_index__默认.png | WA01 | ✅ | — | ✓ |
| SUBPACKAGES-MARKET-WALLET-INDEX-WA05-after.png | WA05 | ⚠️ | MP-R1-C26-002 | ✓ |
| SUBPACKAGES-MARKET-WALLET-INDEX-WA07-before.png | WA07 | ⚠️ | — | ✓ |
| SUBPACKAGES-VIP-INDEX-VP01-after.png | VP01 | ✅ | — | ✓ |
| SUBPACKAGES-VIP-BILLS-BI01-after.png | BI01 | ✅ | — | ✓ |

