# round-7 还欠的渲染帧清单（判据台 NEEDS_UI_FRAME 导出）

载体：`scripts/qa/export-frame-debt.cjs`（输入 `.zcode/tmp/fixverify/verdicts.json`，
由 `verify-fixes-against-artifact.cjs --baseline 094f7239` 产出）。**这张表只回答"去哪拍、看什么"，
不代表拍了就能判——判点是否可判要看 §8 的 ⟨⟩ 壳规则；另有 10 条判据含糊的在 UNDECIDABLE 桶。

| 源文件 | 欠帧条数 | 例子 id | 要求的帧 | 取证类型（uiMarkers 存的是类别，不是画面描述） |
| --- | --- | --- | --- | --- |
| `apps/client/src/subpackages/campus/campus/hub.vue` | 6 | MP-R2-CAMPUS-HUB-009, MP-R2-CAMPUS-HUB-010, MP-R2-CAMPUS-HUB-011, MP-R2-CAMPUS-HUB-012 | true ; true | runtime ; runtime ; visual |
| `apps/client/src/pages/messages/index.vue` | 5 | MP-R2-PAGES-MESSAGES-INDEX-018, MP-R2-PAGES-MESSAGES-INDEX-019, MP-R2-PAGES-MESSAGES-INDEX-021, MP-R2VIS-PAGES-MESSAGES-INDEX-007 | true ; true | runtime ; visual ; runtime |
| `apps/client/src/pages/register/index.vue` | 5 | MP-R2-PAGES-REGISTER-INDEX-009, MP-R2-PAGES-REGISTER-INDEX-011, MP-R2-PAGES-REGISTER-INDEX-012, MP-R2-PAGES-REGISTER-INDEX-013 | true ; true | visual ; runtime ; visual |
| `apps/client/src/subpackages/circles/circles/index.vue` | 4 | MP-R2-CIRCLES-INDEX-004, MP-R2-CIRCLES-INDEX-005, MP-R2-CIRCLES-INDEX-006, MP-R2-CIRCLES-INDEX-007 | true ; true | runtime ; visual ; visual |
| `apps/client/src/subpackages/campus/campus/post-topic.vue` | 3 | MP-R2-CAMPUSPOST-013, MP-R2-CAMPUSPOST-014, MP-R2-CAMPUSPOST-016 | (判据里没写具体帧名) | visual ; visual ; visual |
| `apps/client/src/components/home/TodayRecommendationCard.vue` | 3 | MP-R2-PAGES-HOME-INDEX-102, MP-R2-PAGES-HOME-INDEX-110, MP-R2VIS-PAGES-HOME-INDEX-004 | true | runtime ; visual ; visual |
| `apps/client/src/subpackages/village/village/post.vue` | 3 | MP-R2-POST-013, MP-R2-POST-016, MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006 | true ; true | runtime ; visual |
| `apps/client/src/subpackages/circles/circles/post-topic.vue` | 3 | MP-R2-POSTTOPIC-011, MP-R2-POSTTOPIC-012, MP-R2-POSTTOPIC-013 | true | runtime ; runtime ; visual |
| `apps/client/src/subpackages/village/village/publish.vue` | 3 | MP-R2-PUB-114, MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-005, MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A01 | true | visual ; runtime ; visual |
| `apps/client/src/subpackages/campus/campus/index.vue` | 2 | MP-R2-CAMPUSINDEX-010, MP-R2-CAMPUSINDEX-011 | true | runtime ; runtime ; visual |
| `apps/client/src/stores/messages.ts` | 2 | MP-R2-PAGES-MESSAGES-INDEX-020, MP-R2VIS-PAGES-MESSAGES-INDEX-005 | true | runtime ; backend ; visual |
| `apps/client/src/pages/nearby/index.vue` | 2 | MP-R2-PAGES-NEARBY-INDEX-011, MP-R2-PAGES-NEARBY-INDEX-014 | true | visual ; runtime |
| `apps/client/src/utils/location.ts` | 2 | MP-R2-PAGES-NEARBY-INDEX-012, MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001 | (判据里没写具体帧名) | runtime ; runtime ; visual |
| `apps/client/src/pages/profile/index.vue` | 2 | MP-R2-PROFILE-025, MP-R2-PROFILE-034 | true | runtime ; visual ; runtime |
| `apps/client/src/subpackages/village/village/index.vue` | 2 | MP-R2-VILLAGE-INDEX-010, MP-R2-VILLAGE-INDEX-012 | (判据里没写具体帧名) | visual ; runtime |
| `apps/client/src/pages/login/index.vue` | 2 | MP-R2VIS-PAGES-LOGIN-INDEX-001, MP-R2VIS-PAGES-LOGIN-INDEX-007 | (判据里没写具体帧名) | runtime ; visual ; runtime |
| `apps/client/src/components/discover/NotLoggedWaiting.vue` | 2 | MP-R2VIS-PAGES-MESSAGES-INDEX-002, MP-R2VIS-PAGES-MESSAGES-INDEX-004 | true | visual ; runtime ; visual |
| `index.vue` | 2 | MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-007, MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-A02 | (判据里没写具体帧名) | runtime ; visual ; runtime |
| `publish.vue` | 2 | MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001, MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A05 | true ; true | visual ; runtime ; visual |
| `matching.vue` | 1 | MP-R2-MATCHING-016 | (判据里没写具体帧名) | visual |
| `apps/client/src/components/match/MatchInfo.vue` | 1 | MP-R2-PAGES-DISCOVER-INDEX-013 | (判据里没写具体帧名) | runtime ; backend |
| `apps/client/src/theme/design-variables.scss` | 1 | MP-R2-PAGES-DISCOVER-INDEX-014 | (判据里没写具体帧名) | visual |
| `apps/client/src/components/home/CommunityFeed.vue` | 1 | MP-R2-PAGES-HOME-INDEX-105 | true | runtime ; visual |
| `apps/client/src/pages/home/index.vue` | 1 | MP-R2-PAGES-HOME-INDEX-106 | true | runtime ; visual ; backend |
| `apps/client/src/components/home/InterestRecommendation.vue` | 1 | MP-R2-PAGES-HOME-INDEX-111 | (判据里没写具体帧名) | runtime |
| `apps/client/src/services/mocks/fixtures.ts` | 1 | MP-R2-PAGES-HOME-INDEX-112 | true | runtime |
| `apps/client/src/pages/register/success.vue` | 1 | MP-R2-PAGES-REGISTER-SUCCESS-005 | (判据里没写具体帧名) | visual |
| `apps/client/src/components/profile/NotLoggedProfile.vue` | 1 | MP-R2-PROFILE-024 | true | runtime ; visual |
| `apps/client/src/components/layout/AppShell.vue` | 1 | MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001 | true | runtime ; visual |
| `apps/client/src/components/home/NearbyPeople.vue` | 1 | MP-R2VIS-PAGES-HOME-INDEX-003 | (判据里没写具体帧名) | visual |
| `apps/client/src/components/home/HomeHeader.vue` | 1 | MP-R2VIS-PAGES-HOME-INDEX-005 | (判据里没写具体帧名) | runtime |
| `apps/client/src/components/profile/mine/MyInteraction.vue` | 1 | MP-R2VIS-PAGES-PROFILE-INDEX-002 | (判据里没写具体帧名) | runtime |
| `apps/client/src/components/profile/mine/MyStory.vue` | 1 | MP-R2VIS-PAGES-PROFILE-INDEX-003 | true | visual |
| `hub.vue` | 1 | MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-006 | true | (无 uiMarkers) |
| `apps/client/src/subpackages/chat/chat-session/index.vue` | 1 | MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001 | (判据里没写具体帧名) | runtime ; visual |
| `apps/client/src/components/chat/ChatBubble.vue` | 1 | MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-004 | (判据里没写具体帧名) | runtime ; visual |
| `apps/client/src/subpackages/chat/official-chat/index.vue` | 1 | MP-R2VIS-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-001 | (判据里没写具体帧名) | visual |
| `circle-home.vue` | 1 | MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-001 | (判据里没写具体帧名) | visual |
| `apps/client/src/subpackages/circles/circles/circle-home.vue` | 1 | MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-002 | true | visual |
| `apps/client/src/components/match/MatchLoading.vue` | 1 | MP-R2VIS-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | true | visual |
| `apps/client/src/components/profile/public/PublicIdentity.vue` | 1 | MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001 | (判据里没写具体帧名) | visual ; backend |
| `apps/client/src/subpackages/village/village/detail.vue` | 1 | MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-001 | true | visual |
| `detail.vue` | 1 | MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-002 | (判据里没写具体帧名) | runtime |
| `apps/client/src/components/village/PostCard.vue` | 1 | MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001 | (判据里没写具体帧名) | visual |
| `post.vue` | 1 | MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-004 | (判据里没写具体帧名) | visual |
| `d.ts` | 1 | MP-R2VIS-TMP-TOUR-R2-004 | true | visual |

合计 82 条，跨 46 个源文件。
