# R10 数据侧处置登记（不是代码缺陷，修车道不要再动这两条）

登记时间：2026-10-22（R10 落判后、修车波派发前）

## 涉及缺陷卡
- `R10-L10-D15`（P0 · 素材缺失 · subpackages/profile-extra/profile/album）
- `R10-L12-D01`（P1 · 素材缺失 · subpackages/setup/profile/index）

## 现象复核（真缺陷，级别成立）
两页照片墙的第 2、3 槽渲染的是整枚绿色定位针功能图标，页头仍报「3 / 6」「已上传 3 张」。
逐帧眼检：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__album__top.png`
第 1 格是真人像，第 2、3 格是针形图标 ⇒ 缺陷成立，不是判据误报。

## 根因（查库+查盘取证，不是客户端判据漏网）
`media_asset` 实测（只读 SELECT，库 campus_love）：

| id | user_id | type | original_name | size | w×h | url |
|----|---------|------|---------------|------|-----|-----|
| 1806 | 100158 | image | OxWdHLW…png | 47398 | 185×195 | `/api/v1/media/100158/202609/02334af1-…png` |
| 1831 | 100158 | image | **qa-upload.png** | 2150 | 81×81 | `/api/v1/media/100158/202610/019a7479-…png` |
| 1832 | 100158 | image | **qa-upload.png** | 2150 | 81×81 | `/api/v1/media/100158/202610/533e765e-…png` |

两枚针形图是**本工作流早先的上传腿自己上传的 81×81 测试占位图**（`original_name=qa-upload.png`），
落盘在 `apps/api/uploads/100158/202610/`，并被写进 `user_basic_profile.photo_gallery`。
逐张开图确认：`019a7479-…png`、`533e765e-…png` 就是绿色定位针；`02334af1-…png` 才是真人像。

⇒ 这是**测试残留脏数据**，不是 `isPhotoAssetPath` 的正则形态没覆盖到。

## 为什么两条卡给的「建议改法」都不能照做
两卡都建议把判据从黑名单改成白名单（album 卡：仅放行 `.jpg/.jpeg/.png/.heic/.webp`；
setup/profile 卡：仅放行 `assets/images/portraits` 等照片子树）。对着真实数据两条都不成立：

1. 脏条目的真实路径是 `/api/v1/media/100158/202610/019a7479-….png` —— **它就是 `.png` 结尾**，
   扩展名白名单当场放行，改了等于没改。
2. 若按「仅放行照片子树」实现，会把**用户唯一那张真照片一起判成非照片**
   （它也住在 `/api/v1/media/…`，不在 `assets/images/portraits` 下）⇒ 照片墙从「2 张假」变成「0 张可见」，
   把这条 P0 改得更糟。

## 实际处置（数据侧，已提交）
备份：`database/backup/qafid-R10/album-junk-20261021T182001Z.sql`（504,227B，含 `user_basic_profile` + `media_asset` 全表 INSERT）。
先 `START TRANSACTION … ROLLBACK` 预演（`rows_changed=1`，结果符合预期）后才 COMMIT：

```sql
UPDATE user_basic_profile
   SET photo_gallery = JSON_REMOVE(photo_gallery, '$[2]', '$[1]')
 WHERE user_id = 100158
   AND JSON_LENGTH(photo_gallery) = 3
   AND JSON_UNQUOTE(JSON_EXTRACT(photo_gallery,'$[1]')) LIKE '%202610/019a7479%'
   AND JSON_UNQUOTE(JSON_EXTRACT(photo_gallery,'$[2]')) LIKE '%202610/533e765e%';
```
（回读值：`["/api/v1/media/100158/202609/02334af1-…png"]`）

`JSON_REMOVE` 的实参顺序按「先 `$[2]` 后 `$[1]`」——MySQL 逐路径求值并对数组重排索引，
反过来写第二次删除会越界落空，只销掉一枚针。

处置后：相册页 1 张真照片 + 5 个「+」空槽，页头「1 / 6」、「已上传 1 张，剩余 5 个空位」——三处同口径，无假计数。

## 影响面（全库测过，不是只看了这一行）
`SELECT … FROM user_basic_profile WHERE photo_gallery LIKE '%202610%'` 命中 1 行（就是 100158）；
`media_asset` 里 `original_name LIKE 'qa-%'` 只有 1831/1832 两行。⇒ 污染范围恰为一行，无残留同类。

## 留给修车道的边界
- 这两条卡**不在 R10 修车波的派发集内**（已按上面的数据处置销账）。
- 不要改 `apps/client/src/subpackages/profile-extra/profile/album.vue` 的 `NON_PHOTO_ASSET_RE`，
  也不要改 `apps/client/src/subpackages/setup/profile/index.vue` 的同族判据——
  判据本身对真数据没有可修之处，动它只会误伤真照片。
- 未做的两件事，如实登记为欠账：
  ① `media_asset` 1831/1832 两行与其落盘文件仍在（管理端素材列表里会看到 `qa-upload.png`）——
     删它属破坏性操作，且上传腿可能依赖该号段，本轮只清引用不删实体；
  ② 上传腿自身没有「跑完自清」的收尾，下一轮 roundtrip 仍可能再塞一次 ⇒ 属载具欠账，登记不闭。
