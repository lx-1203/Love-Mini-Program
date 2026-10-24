# 后端 app-assets 与包内字节漂移 12 个：两种成因，别一起修

日期 2026-10-24。触发点：为了验计划验收第 5 条（"图片在后台真实可见，验 content-type 与字节"），
把 Redis + real 后端拉起来跑 `verify-app-assets-coverage.mjs`。

## 一、先说这次量到了什么

| 读数 | 值 |
|---|---|
| 分母 | 924 个 app-assets 引用 |
| **404** | **0** ⇒ 后台侧图片确实全部取得到，验收第 5 条的"可见"这半是成立的 |
| DRIFT | 12（包内字节 ≠ 后端字节） |
| 其它状态 / 空集桶 / 反向命中 | 0 |
| 量不到 | 0（后端可达；`/actuator/health` = `{"status":"UP"}`，Started in 49.3s） |

`ASSETCOV_RESULT=FAIL 分母=924 404=0 DRIFT=6` 是第一发；第二发同一把尺量出 12。
**这个 6→12 的差本身是这条记录里最该记住的事**，见第三节。

## 二、12 个漂移是两类问题，修法相反

### A 类：6 张圈子封面 PNG——真·两代素材不同（要用户裁定方向）

| rel | 包内 | 后端 |
|---|---|---|
| covers/circle-food.png | 45,594 | 292,002 |
| covers/circle-music.png | 41,965 | 348,242 |
| covers/circle-photo.png | 47,398 | 379,897 |
| covers/circle-sky.png | 36,383 | 186,949 |
| covers/circle-sports.png | 42,631 | 313,326 |
| covers/circle-travel.png | 43,254 | 324,340 |

包内是压过的（~40KB），后端是原图（~190–380KB）。备份树里**两代都在**
（`static-local-backup/assets-images/heart-gradient.svg`=501 与
`full-static/assets/icons/common/heart-gradient.svg`=443 同例），所以"从备份同步"这句话
本身不指明取哪一代。

**这一类我没有动**，两个理由：
1. 方向要人裁——是"包内压缩版为准、把后端换成压缩版"，还是"后端原图为准、把包内换回原图"，
   两者对 2MB 包体积门的后果相反；
2. `sync-app-assets.mjs --apply` 要写库（`media_asset` 先 DELETE 再 INSERT），
   而本仓长期约束是"DB 写必须先备份 + ROLLBACK 预演"。我没有拿这个授权。

顺带量到一条该修的仪器语义：`sync-app-assets.mjs --dry-run` 只 gate 住了写库那一步，
**它仍然会执行第 1 步的整目录拷贝**。我用 `find uploads/app-assets -newermt 16:05` 数过
`count_new=0` 才确认这次没落盘——但"dry-run 会动盘"这件事本身是坑，
下一程别信名字。

### B 类：6 个 SVG——纯换行符，不是素材（该修 git 配置，不该同步）

| rel | 包内 | 后端 | 差 |
|---|---|---|---|
| diamond-filter.svg | 336 | 331 | +5 |
| heart-gradient.svg | 508 | 501 | +7 个 CR |
| profile-album.svg | 439 | 433 | +6 |
| profile-favorite.svg | 384 | 379 | +5 |
| profile-privacy.svg | 453 | 447 | +6 |
| profile-visitors.svg | 322 | 317 | +5 |

实测：`heart-gradient.svg` 工作树 508B / **7 行带 `\r`**，而
`git show HEAD:` 出来的 blob 是 **501B（LF）**，备份树那份也是 501B。
⇒ 仓库里存的是 LF，**工作树被 autocrlf 换成了 CRLF**，于是包内字节与后端字节差几个 CR。

这一类修法完全不同。实测六个全部同形：**盘上带 5–7 个 `\r`，`git show HEAD:` 出来的 blob 是 LF**
（heart-gradient 盘上 508 / HEAD 501，其余 -5~-7 字节）。成因是 `core.autocrlf=true`
在 checkout/add 时把文本转成 CRLF，而仓库里存的仍是 LF。

**但"加 `.gitattributes` 写 `* text=auto`"这个顺手修法，本仓已经明确否过。**
现有 `.gitattributes` 的头注释写着：这里**故意不写** `* text=auto`，
因为"仓库已有数千文件的行尾是既有状态，加这一行会让下一次触碰把全仓 CRLF/LF 重归一化，
产出一个吞掉真实改动的巨型 diff"，行尾策略维持现状交给 .editorconfig/.prettierrc。
它还同时声明 `apps/client/src/static/** -filter -lfs`（业务静态资源随构建走，不进 LFS）。
⇒ 所以这一类要么把门的比对口径改成"文本先去 CR 再比"（只动量具，不动盘），
要么加**窄口径**规则 `*.svg text eol=lf`（只圈 svg，不触发全仓重归一化）。
两个都比"同步素材"便宜，且都不会把 CRLF 当正版写进后端。

## 三、6→12 结案：**是我自己污染的，B 类不是真缺陷**（本节上一版的归因错了，在此更正）

上一版写的是"我那一发 `git add` 在 autocrlf 下改写了工作树"。**这个因果是错的**，追下去是另一回事：

两次门之间我只多做了一件事——跑 `sync-app-assets.mjs --dry-run`。
`git status` 随后指出被改的是**后端 uploads 那一侧**的 6 个 SVG（不是包内那侧）；
`git checkout --` 还原那 6 个之后，门立刻回到 **DRIFT=6 且稳定复现**。
再逐字节对：包内 `heart-gradient.svg` 508/CR=7，还原后的 uploads 同一份 508/CR=7 —— **两边一致**，
所以那 6 个根本不叫漂移。

⇒ 更正后的结论：**真漂移只有 A 类 6 张圈子封面**（45KB vs 292KB 这种量级差，行尾解释不了）。
B 类那 6 个是我拿"dry-run"写进 uploads 的另一代副本造成的假警。
第二节里"盘上 CRLF / `git show HEAD:` 是 LF"那个差异本身是真的（508 vs 501），
但它不是门报出那 6 个的原因——我把两件同时观察到的事写成了因果，这是这条记录里的一处错。

两条要记住的教训：
1. `--dry-run` 会动盘这件事这次**不只是风险，是真动了** uploads。
   我先前用 `find -newermt` 数出 `count_new=0` 是**假阴性**（拷贝保留了源 mtime）
   ⇒ "mtime 没变"不能当"没写盘"的证据。判"有没有被我写脏"要看 **`git status`**，
   不要看 mtime——uploads 那 6 个是跟踪文件，被改立刻现形。
2. 两代 SVG 的字节差是行尾不是内容；仓库存 LF、工作树两侧都是 CRLF，
   实际服务的是同一份字节，因此不需要新增 `* text=auto`（理由见第二节，本仓已逐字否过）。

## 四、这次为量它而拉起的东西（环境状态，供接手判断）

- Redis 3.0.504：`--port 6379`，数据目录指到 `tmp/qa/redis-fresh`。
  原因：仓库根那份 `dump.rdb` 是 **RDB format 9**（新版 Redis 写的），
  这个 3.0.504 读不动，直接 `Fatal error loading the DB` 退出。
  我**没有**改或删那个 rdb，只是让它别去读。
- 后端 real profile：`java -jar apps/api/target/campus-love-api-0.1.0.jar
  --spring.profiles.active=real`，health UP，日志 `apps/api/api-R16verify.log`。
  踩过的坑：`.env` 不是 shell 文件，`set -a; . ../.env` 会非零返回并把 `&&` 链整条掐断；
  而用双引号导出会要命——`ADMIN_PASSWORD_HASH` 是 `$2a$10$…`，
  双引号里 `$2a` 被 shell 展开，后端自己的守卫直接拒启
  （"ADMIN_PASSWORD_HASH 不是合法的 BCrypt 哈希格式"）。**守卫是对的，错的是我的引号**；
  改单引号导出后即通。凭据值全程未落日志，只回显过长度与前缀。
