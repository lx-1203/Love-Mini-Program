# round-7 判据含糊清单（判据台 UNDECIDABLE 导出）

载体：`scripts/qa/export-frame-debt.cjs`（同一份 verdicts.json）。
**这一桶不能靠拍帧解决**：要么把判据改写成可判物件（有类名/字面量/资产路径这类能落在产物里的载体），
要么显式承认它是人判项并写清由谁判——留在桶里最糟，因为它看起来像"待办"其实没有可执行的下一步。

| 判据台给的原因（截断） | 条数 | 例子 id |
| --- | --- | --- |
| 台账判据里抠不出任何可比对的具体物件（文件/选择器/值/键/文案） | 10 | MP-R2-PAGES-HOME-INDEX-112, MP-R2-POST-016, MP-R2VIS-PAGES-MESSAGES-INDEX-009 |
| 判据没点名可核验的修后物件（无 closer 差异串/源码锚点/显式「改→新值」） | 3 | MP-R2-PAGES-MESSAGES-INDEX-021, MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-006, MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-001 |
| 判据只点到两载体都不存在的名字 STILL_OPEN | 2 | MP-R2-PAGES-HOME-INDEX-102, MP-R2-PAGES-NEARBY-INDEX-011 |
| 只在共享载体（语言包/主题/别页）里命中，未证明该页消费了它：school.id | 1 | MP-R2-CAMPUS-HUB-011 |
| 唯一抠到的判点是标识符 filteredSchools，压缩构建会改名 | 1 | MP-R2-CAMPUS-HUB-012 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（campus.postTopic.chooseImageFailed, chooseImag | 1 | MP-R2-CAMPUSPOST-011 |
| 唯一抠到的判点是标识符 QUICK_TABS，压缩构建会改名 | 1 | MP-R2-CIRCLES-INDEX-004 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（matched, onUnload, matchedUser）——命中不能证明改动落地 | 1 | MP-R2-MATCHING-014 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（SCHOOLS）——命中不能证明改动落地 | 1 | MP-R2-PAGES-NEARBY-INDEX-013 |
| 唯一抠到的判点是标识符 dateStr.split, now.getDate, now.getMonth，压缩构建会改名 | 1 | MP-R2-PAGES-REGISTER-INDEX-009 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（maskPhone）——命中不能证明改动落地 | 1 | MP-R2-PAGES-REGISTER-INDEX-010 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（ActivityCard, postTopicActivityEnrollHint）——命中 | 1 | MP-R2-POSTTOPIC-010 |
| 只在共享载体（语言包/主题/别页）里命中，未证明该页消费了它：interactionItems | 1 | MP-R2-PROFILE-025 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（--c-neutral-50, F7FAF9）——命中不能证明改动落地 | 1 | MP-R2-VILLAGE-INDEX-009 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（--s-float-btn, --c-bg-surface）——命中不能证明改动落地 | 1 | MP-R2VIS-PAGES-LOGIN-INDEX-006 |
| 只在共享载体（语言包/主题/别页）里命中，未证明该页消费了它：UnlockGuideOverlay | 1 | MP-R2VIS-PAGES-MESSAGES-INDEX-004 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（--c-brand, --c-bg-container, IMAGE_PATHS.ICONS | 1 | MP-R2VIS-PAGES-PROFILE-INDEX-001 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（--c-status-disabled）——命中不能证明改动落地 | 1 | MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-002 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（CAMERA, CHECK_SVG, CHECK_WHITE_SVG）——命中不能证明改动落 | 1 | MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-006 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（FFFFFF）——命中不能证明改动落地 | 1 | MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-001 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（F3FAF6）——命中不能证明改动落地 | 1 | MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-004 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（LOCATION）——命中不能证明改动落地 | 1 | MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-002 |
| 授予绿用的判点在修复前的 HEAD 里就已存在（public-moment__stat, public-moment__stat-icon, | 1 | MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-003 |
| 判据只点到两载体都不存在的名字 __joined | 1 | MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006 |

合计 36 条，24 种原因。
