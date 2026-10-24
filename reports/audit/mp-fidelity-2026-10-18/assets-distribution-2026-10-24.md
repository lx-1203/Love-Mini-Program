# 素材分布地图与引用正确性对账（2026-10-24）

回答两个问题：**素材现在都分布在哪里**，以及**引用是不是真的对得上**。
配套门：`scripts/qa/verify-static-refs.mjs`（本次新增，两个载具已接线）
　　　　`scripts/qa/verify-app-assets-coverage.mjs`（既有，cdn 桶逐件 HTTP 探测）
契约与统一过程见同目录 `assets-single-source-contract.md`。

---

## 一、分布：六棵树各自的账

| 树 | 盘上文件 | git 跟踪 | 体积 | 角色 |
|---|---|---|---|---|
| `apps/client/src/static/` | 1345 | **1344** | 29 MB | **包内素材唯一真源**（随小程序包发布） |
| `apps/api/uploads/app-assets/` | 1349 | 495 | 29 MB | real 档大位图的服务态（`<image>` 走 HTTP） |
| `static-local-backup/full-static/` | 1345 | 490 | 29 MB | 发布链裁剪 `src/static` 前的具名还原源 |
| `static-local-backup/assets-images/` | 116 | 97 | 9.8 MB | sync 输入桶（→ `app-assets/assets/images/`） |
| `static-local-backup/generated/` | 18 | 18 | 4.9 MB | sync 输入桶（→ `app-assets/generated/`） |
| `素材/`（设计参考与基准图） | — | 2902 | — | 审查的视觉真值；**但 `理想效果图/*.png` 未入库**，见第四节 |

后端服务态的桶内分布（前两段归并）：

```
709  assets/images      351  assets/icons     132  assets/svg-spec
 96  assets/profile      26  assets/message    21  generated/images
  9  assets/home          1  default-avatar.png
```

`apps/admin/public/` 不存在（后台不自带 public 静态目录，图全部走后端 media 接口）。

**路径规范（一条，别破）**：包内 `static/<rel>` ↔ 服务 `/api/v1/media/app-assets/<rel>`，
即 **URL 去掉 `static/` 前缀**。`assets-index.ts:22-27` 记着这条口径的历史事故：
曾经双层 `static/` 拼出 `app-assets/static//generated/…`，Spring 严格匹配直接 400。

---

## 二、引用正确性：三条独立对账，各查一个方向

| 查什么 | 用哪把尺 | 读数 |
|---|---|---|
| 包内字面量引用 → 包内有没有件 | `verify-static-refs.mjs`（新） | 544 个唯一引用，命中 542，动态判不了 2，**缺失 0 ⇒ PASS** |
| cdn 桶引用 → 后端取不取得到、字节对不对 | `verify-app-assets-coverage.mjs --dist .../mp-weixin-real` | 924 件逐件 HTTP 无抽样，200同字节=924，404=0，DRIFT=0 ⇒ **PASS** |
| 注册表 ↔ 磁盘 双向 | 本次对账（结论见第三节，未固化成门） | 注册行 1714 / 磁盘件 1349；行在件不在 **370**，件在行不在 **5** |

新门带 4 例自测（`--self-test`，4/4 PASS），其中一条是**采集侧阳性对照**：
排除注释与测试之后，`api/profile.ts:19` 那个真运行时引用必须仍被采集到。
只验"假路径判得出缺失"不验"真路径被采到"的话，把采集器整个写坏成 0 条也照样绿。

---

## 三、那两个非零数字，都不是断链（逐条查过，别当缺陷修）

### 370 条"行在件不在"= 六族 `*-split` 的**多余注册**，不是坏引用

`messages-split` 114 / `match-split` 71 / `profile-other1-split` 65 / `login-split` 52 /
`profile-other2-split` 39 / `profile-self-split` 29 = 370。

这些切片**按契约就该留包内**：`images.ts:881-883` 明写 `home-split` 不在 `cdnPrefixes` 里、
"否则留包内"，源码里 826 处引用一律是 `/static/assets/images/login-split/登录页_r01_c01.png`
这种**包内路径**。所以它们是死行不是断链——门量 404 时走的是包内引用，自然 404=0。
**清理它们要写库**（`DELETE` 370 行），属 DB 写，未动；要清就先按本仓纪律做备份 + ROLLBACK 预演。

### 5 个"件在行不在"= 4 个刻意备份 + 1 个已弃用残留

`assets/images/mascot/*.png.bak-20260904` × 4（备份件，本就不该注册，也不该删）
＋ `assets/icons/common/heart-filled-white.svg` × 1（`images.ts:807` 与 `MatchSuccess.vue:101`
都注明它已被去掉/从未迁移，是残留，无引用）。

### 路径泄漏残留 = 0（上一发统一掉的 110 文件/110 行没有复发）

---

## 四、这次查出来的、真正该你拍的一条

**审查的视觉真值没进版本库。** `素材/` 下 2902 个文件是跟踪的，
但 `素材/理想效果图/*.png` 这 19 张被 `.gitignore:80` 的** blanket `*.png`** 挡住了，
而 R16 的 14 张找茬任务书里点名引用了其中 **16 张**当整页基准
（`pixel-perfect` 口径下这是唯一视觉来源）。

后果：换一台机器 clone，任务书里的基准图全都不在，找茬泳道只能退化成
"按规范文档 §3 + 组件规范比"——**这正是本轮那些"无基准页"泳道写的判据**，
也就是说这套审计的可复现性目前绑在这台机器上。

这不是能顺手修的：往库里加 23 MB 设计 PNG，与 `.gitattributes` 头注释里那条
"故意不放宽、宁可红着也不静默把像素当普通 blob 塞进 .git"的裁定直接冲突
（那条针对的是 `reports/` 证据帧，`素材/` 是**输入**不是证据，两者其实可以分开对待）。
可选的窄口径解法，都要你点头：
- 只给 `素材/理想效果图/**` 开 `*.png` 例外（23 MB，换审计可复现）；
- 或把这 19 张按既有"仓外证据库 + manifest 内 sha256 可核"的路子纳管（不加体积，但要多一步取件）。

---

## 五、复验命令

```bash
cd "D:/6/恋爱小程序"
node scripts/qa/verify-static-refs.mjs --self-test          # 期望 STATICREF_SELFTEST=PASS 4/4
node scripts/qa/verify-static-refs.mjs                      # 期望 STATICREF_RESULT=PASS 缺失=0（实测约 1.3 s）
node scripts/qa/verify-app-assets-coverage.mjs \
     --dist apps/client/dist/build/mp-weixin-real           # 需后端 :8080 UP；期望 ASSETCOV_RESULT=PASS
node scripts/qa/verify-gate-list-sync.cjs                   # 期望 GATESYNC_RESULT=PASS 孤儿=3/基线 3
# 注册表↔磁盘 双向（临时量具，未固化）：先 dump url 再比盘
```

⚠ 两条已知的"看起来对其实不对"：
1. 资产门**不带 `--dist` 时默认读 mock 产物**，会如实报 `ERROR 产物档位不是 real`——不假绿，但别误读。
2. 判"有没有被写脏"要看 **`git status`**，不要看 mtime（`cp` 会保留源 mtime，实测骗过一次）。
