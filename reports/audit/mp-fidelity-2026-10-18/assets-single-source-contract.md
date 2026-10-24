# 素材单一真源契约（三棵树 + 一条路径规范）

日期 2026-10-24。这份文档回答一个问题：**一张图到底以谁为准**，
以及为什么 real 档下"包内已经换了、屏幕上还是旧的"这种事会静默发生。

配套门：`scripts/qa/verify-app-assets-coverage.mjs`（逐件 HTTP 探测，无抽样）
配套守卫：`scripts/sync-app-assets.mjs` 的路径泄漏守卫 + `scripts/qa/test-sync-path-guard.mjs`

---

## 一、三棵树各自的职责（谁也不是谁的备份）

| 树 | 路径 | 职责 | 权威性 |
|---|---|---|---|
| 包内 | `apps/client/src/static/**` | 随小程序包发布的素材；`<image>` 的字面量引用与 tabBar 图标从这里走 | **包内素材的唯一真源** |
| 后端 | `apps/api/uploads/app-assets/**` | real 档下大位图不打包、改由 `GET /api/v1/media/app-assets/{rel}` 提供 | 服务态，不是真源 |
| 备份 | `apps/client/static-local-backup/{full-static,assets-images,generated,mascot-bak-*}` | 发布链裁剪 `src/static` 前的具名还原源；也是 sync 的输入 | 还原源，不是真源 |

**桶 → 目标路径的唯一合法映射**（写在 `sync-app-assets.mjs` 的表里）：

```
static-local-backup/generated      →  app-assets/generated/
static-local-backup/assets-images  →  app-assets/assets/images/
```

URL 形态：包内 `static/assets/images/covers/x.png` → 服务 `/api/v1/media/app-assets/assets/images/covers/x.png`
（**去掉 `static/` 前缀**，这是门与前端共用的一条口径）。

---

## 二、路径规范：桶名不得出现在自己映射后的目标基名之下

反面例子（本次清掉的就是它）：

```
assets/images/covers/x.png                  ← 规范
assets/images/assets-images/covers/x.png    ← 泄漏：基名 assets/images 之下又套了一层桶名 assets-images
```

成因是历史上有一回把**源根写成了 `BACKUP` 本身**而不是 `BACKUP/assets-images`，
于是桶目录名被当成子目录带进了目标。它**不 404、不报错、字节还和规范路径完全相同**，
唯一后果是同一个素材在后端存在两代注册行，而被 `<image>` 命中的那条恰好是旧原图——
表现为"包内已压缩、后端还在发原图"的静默画面回退。

守卫判的是"映射基名**之后**是否还出现桶名"，不是"路径里任何一段等于桶名"。
这个区别有代价：第一版按后者判，把 18 个合法路径（`generated/images/activities/art-exhibition.jpg` 等，
`generated` 桶的目标基名本身就是 `generated`）全部误杀、当场拦停。
现由 `scripts/qa/test-sync-path-guard.mjs` 钉住 6 个用例（3 正 3 反），改判据必须同时改测试。

---

## 三、2026-10-24 这次统一做了什么（全部有盘上证据）

### 1. 先修被服务路径的字节漂移（6 张圈子封面）

裁定：**以包内压缩版为准**。落下去发现不是"两代素材选一代"——
后端一直同时存着同一次压缩的两份产物，只是 `<image>` 命中的那条路径指向原图：

```
uploads/app-assets/assets/images/covers/circle-food.png               292,002  ← 被服务的这条
uploads/app-assets/assets/images/assets-images/covers/circle-food.png  45,594  ← 压缩版在泄漏路径里
```

所以"同步"只是把压缩版放到被服务的路径上，**没有重新生成任何素材**。

### 2. 再拔掉泄漏的整棵树（110 文件 + 110 注册行）

实测：`assets-images` 下 110 个文件**全部**与规范路径字节相同、**0 个**是独有内容；
`media_asset` 里 110 条指向 `assets-images` 的行**全部**有规范孪生行、**0 条**孤儿。

动作与前置（按本仓纪律：DB 写必须先备份 + ROLLBACK 预演）：

| 步 | 证据 |
|---|---|
| 转储 110 行 | `database/backup/assets-unify-<stamp>/media_asset-110rows.sql`（25,234B） |
| 移走 110 文件 | 同目录 `files/`（110 个，未删除） |
| 写回滚件 | `ROLLBACK.sql` |
| **预演** | 实跑一轮往返：`1824 → DELETE → 1714 → ROLLBACK → 1824`，回滚后 `assets-images` 行 = 110 |
| 正式删除 | `app_asset` 总数 1824 → **1714**，`assets-images` 残留行 **0**，磁盘残留文件 **0** |

### 3. 补上防复发的两处

- `sync-app-assets.mjs`：路径泄漏守卫（命中即 `SYNC_RESULT=FAIL` 拒绝落盘）；
- `sync-app-assets.mjs`：**`--dry-run` 以前只挡写库、拷贝照样落盘**——我用 `find -newermt` 自查时得到的是
  `count_new=0` 的**假阴性**（拷贝保留了源 mtime），真凶是靠 `git status` 才现形的。
  现在 dry-run 同时跳过拷贝，实测 `uploads` 文件数 1349 → 1349 不变。

### 4. 结果读数

```
ASSETCOV_RESULT=PASS 分母=924（10 桶逐件 HTTP 探测，无抽样）
200同字节=924 404=0 DRIFT=0 其它状态=0 空集桶=0 反向命中=0
守恒证据=档位 MODE:real API:real，807 个文本件、7 处 app-assets 串中 0 处指向 localPrefixes
```

收口门不受影响：`FIDELITY_CLOSEOUT_RESULT=PASS 判据=8 全中`。

---

## 四、怎么复验（照抄即可）

```bash
cd "D:/6/恋爱小程序"
# 前置：后端 real profile 在 :8080 活着，/actuator/health 返回 UP
# 注意 PATH 上的 node 是微信工具自带 v16（无 fetch），资产门要用 Node≥22 的绝对路径
NODE=/d/codex-tools/node-v22.17.0-win-x64/node.exe
$NODE scripts/qa/test-sync-path-guard.mjs                       # 守卫 7 例（含"测试与守卫不许分家"的源码锚）
$NODE scripts/sync-app-assets.mjs --dry-run                     # 应打印"跳过拷贝"且不写盘
$NODE scripts/qa/verify-app-assets-coverage.mjs \
     --dist apps/client/dist/build/mp-weixin-real               # 期望 PASS，并打印 ASSETCOV_SOURCE 输入树行
$NODE scripts/qa/verify-asset-registry.mjs                      # 期望 ASSETREG_RESULT=PASS
$NODE scripts/qa/verify-static-refs.mjs                         # 期望 STATICREF_RESULT=PASS
$NODE scripts/qa/emit-baseline-manifest.mjs --check             # 期望 BASEMANI_RESULT=PASS 条目=19
$NODE scripts/qa/emit-ruling-menu.mjs \
     --roster reports/audit/ui-audit-2026-10-16/decisions-v38.md \
     --menu   reports/audit/ui-audit-2026-10-16/ruling-menu-v38.md   # 期望 RULINGMENU_RESULT=PASS
# 泄漏残留必须全 0：
find apps/api/uploads/app-assets -path "*assets-images*" -type f | wc -l
```

四把门的自测（判据自己能不能红）分别跑：
`--selftest` → `ASSETCOV_SELFTEST 23/23`、`BASEMANI_SELFTEST 5/5`、
`EMITLANES_SELFTEST 8/8`（派发前的基准图硬门）、`RULINGMENU_SELFTEST 14/14`。

⚠ 两个已知的"看起来对其实不对"：
1. `verify-app-assets-coverage` **不带 `--dist` 时默认读 mock 产物**，会如实报
   `ERROR 产物档位不是 real`——不会假绿，但也别误读成素材坏了。
2. 判"有没有被写脏"要看 **`git status`**，不要看 mtime（拷贝保留源 mtime）。
   本程就是靠这条抓到我自己：`--dry-run` 名义上只看不动，实际往 uploads 写了 6 个文件，
   现在 `--dry-run` 连拷贝一起挡（打印 `DRY-RUN：跳过拷贝（本应写 N 个文件）`）。

---

## 五、还没解决的一条（别把门绿读成已根治）

**2026-10-24 更新**：本节的"根治"两条路里第二条的一半已经落地——
`sync-app-assets.mjs` 现在**一律以包内为准**（同路径不同字节 ⇒ 取包内，打印 `SYNC_OVERRIDE`），
资产门新增输入树判点 `ASSETCOV_SRC`（实测比对 1479 件 = full-static 1345 + generated 18 + assets-images 116），
所以"桶里躺着未压缩原图"这件事在任何机器上都会当场红，不再依赖人肉归一。
默认 `--apply` 的落盘面仍是 134 件不变；"包内有、桶里没有"的 592 件要显式 `--with-pkg-only` 才纳入。

**仍然没根治的是这一条**：先纠正本文件初版的一处口径错：我原先写"后端 `uploads/app-assets/**` 不在版本控制里"，
这只对了一半。实测这 110 个泄漏文件里 **62 个是跟踪的（全是 `.jpg`）、48 个未跟踪（`.png`，
被 `.gitignore:80` 的 `*.png` 挡住）**——`uploads` 下总共跟踪 557 个文件。
所以：

- 那 62 个泄漏 JPG 的删除**已随 `e3425ae1` 进 git**，这一半是持久的；
- 48 个泄漏 PNG 只是从盘上消失（已备份），而**规范路径下的 PNG 本来也未跟踪**，
  所以换机器 clone 或 `uploads/` 被重置时，**PNG 这一半仍需重跑一次同步**才会对上字节。

守卫能拦住"泄漏形态"重新出现，输入树判点能拦住"桶比包内旧"，
但两者都拦不住"规范路径的 PNG 没同步进 uploads"——`ASSETCOV` 靠 HTTP 探测量这件事，
而后端没起 / 未重跑同步时它报的是 `NOT-EVIDENCED`（退 2），不是 PASS，别把"没跑"读成"过了"。


根治的两条路，都需另裁，不在本次范围：
- 给"随包发布的那一小撮 PNG"开具名例外入库——与既有裁定"证据帧不进库、仓外证据库 + manifest 内
  sha256 可核"不冲突，但会往库里塞像素，正是当初要止住的膨胀路径；
- 或把 `sync-app-assets.mjs` 固化成发布链的一步（注意它写 `media_asset` 表，属 DB 写，
  须先按本仓纪律做备份 + ROLLBACK 预演）。
