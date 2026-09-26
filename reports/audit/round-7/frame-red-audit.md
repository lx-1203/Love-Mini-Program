# 判红可判性审计（帧 8df4de49 × 产物 D:\6\恋爱小程序\apps\client\dist\build\mp-weixin）

- 判红条目：16 ｜ 可落账：2 ｜ 不作判据：14 ｜ 撤销上一轮写入：0（未给 --restore-from，旧写入原样留在台账）
- 产物 class 片段全集：3162 个（扫 D:\6\恋爱小程序\apps\client\dist\build\mp-weixin）

## 可落账的判红

- `MP-R2-PUB-114` subpackages/village/village/publish 红 3/4，交互=[]，帧 reports/screenshots/round-7-uidebt-txt-d99f3a1f/C-MP-R2-PUB-114.png
- `MP-R2-PAGES-HOME-INDEX-110` pages/home/index 红 2/2，交互=[]，帧 reports/screenshots/round-7-uidebt-txt-d99f3a1f/E-MP-R2-PAGES-HOME-INDEX-110.png

## 不作判据（探针问的不是这条判据点名的物件）

- `MP-R2-PROFILE-025` pages/profile/index 红 3/3：
  - 探针没给数字答案：expected 里没有可核对的字面量
  - target 不是单一选择器：「最近访客」所在 .my-interaction__row 的 .my-interaction__value 与「访客」
- `MP-R2VIS-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001` subpackages/discover-extra/discover/matching 红 4/4：
  - 探针没给数字答案：没有尺寸
- `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-002` subpackages/village/village/detail 红 1/3：
  - 该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」
- `MP-R2VIS-PAGES-MESSAGES-INDEX-009` pages/messages/index 红 2/3：
  - target 不是单一选择器：陈默那一行的 .chat-item__time-row 内的 image 与 .chat-item__muted-ico
  - target 不是单一选择器：陈默那一行的 .chat-item__time-row
  - 探针没给数字答案：expected 里没有可核对的字面量
- `MP-R2-CAMPUSINDEX-011` subpackages/campus/campus/index 红 1/3：
  - 探针没给数字答案：expected 里没有可核对的字面量
- `MP-R2-PROFILE-024` pages/profile/index 红 1/4：
  - target 不是单一选择器：.nlp-interaction--last 底缘 到 .nlp-footer-btn 顶缘
  - 探针没给数字答案：没有尺寸
- `MP-R2-POSTTOPIC-012` subpackages/circles/circles/post-topic 红 1/2：
  - 该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」
- `MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-007` subpackages/chat/chat-session/index 红 2/4：
  - target 不是单一选择器：.chat-list.chat-list--empty
  - 该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」
- `MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-A02` subpackages/chat/chat-session/index 红 1/3：
  - target 不是单一选择器：.chat-input-area.chat-input-area--keyboard-up
  - 该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」
- `MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001` subpackages/profile-extra/profile/other 红 3/3：
  - 探针没给数字答案：expected 里没有可核对的字面量
- `MP-R2-PAGES-HOME-INDEX-102` pages/home/index 红 3/3：
  - 该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」
- `MP-R2VIS-PAGES-HOME-INDEX-004` pages/home/index 红 2/3：
  - 探针没给数字答案：没有尺寸
- `MP-R2VIS-PAGES-HOME-INDEX-005` pages/home/index 红 1/3：
  - 该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」
- `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001` subpackages/village/village/index 红 3/3：
  - 探针没给数字答案：没有尺寸
  - 产物里查无此 class：.post-card__tag--pink

## 撤销去向（每条被扣住的判红，台账那一格被写成什么）


- 合计 0 条，其中 0 条因『备份本身也是判红』改写成不可判，其余回到取景前的账值。