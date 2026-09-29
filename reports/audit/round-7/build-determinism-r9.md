# r9 构建确定性车道：把 profile SVG→PNG 产物请出被跟踪的 `src`

HEAD 起点：`1788675d`。授权来源：`reports/audit/round-7/followups-v33.md` §9 的待办 + 编排者本次裁定
（「把生成产物移出被跟踪的 src，并让输出逐字节确定」）。本道只做这一件事，不顺手重构构建链。

## 1. 脚本定位与它是谁的子步（证据，不是猜）

入口是从 `package.json` 往下跟的，不是猜路径。`git grep -n "profile-svg-to-png"` 的全部命中里，
**在构建链上的只有这一个脚本**，真实路径：

```
apps/client/scripts/profile-svg-to-png.mjs
```

调用点（`git grep` 实测，逐条列全）：

| 调用方 | 位置 | 性质 |
|---|---|---|
| `build:mp-weixin` | `apps/client/package.json:25` | 旧共享目录档 |
| `build:mp-weixin:mock` | `apps/client/package.json:26` | **mock 档（本次重建第 1 步）** |
| `build:mp-weixin:showcase` | `apps/client/package.json:27` | 非隔离展示档 |
| `build:mp-weixin:real` | `apps/client/package.json:29` | 非隔离 real 档 |
| `build:mp-weixin:real:dev` | `apps/client/package.json:30` | real 的 dev 变体 |
| `SHOWCASE_PRE` | `apps/client/scripts/build-real-isolated.mjs:78` | **showcase:isolated 每次必跑的前置步** |
| `FULL_CHAIN` | `apps/client/scripts/build-real-isolated.mjs:73` | `--full-chain` 才跑（real:isolated 默认不含） |
| 注释 | `apps/client/src/config/profile-assets.ts:5` | 文档引用，不是调用 |

隔离出口 `build:mp-weixin:real:isolated` / `build:mp-weixin:showcase:isolated`
（`apps/client/package.json:28,31`）都只是 `node scripts/build-real-isolated.mjs [--band showcase]` 的壳，
所以本次用的三个 sanctioned 入口是：`build:mp-weixin:mock` → `build:mp-weixin:real:isolated` →
`build:mp-weixin:showcase:isolated`。

**同一仓库里另有 6 个也用 `sharp` 的图片脚本**（`apps/client/scripts/svg-to-png.mjs`、
`apps/client/scripts/split-icons.mjs`、`scripts/convert-icons.js`、
`scripts/download-freesvglab-icons.mjs`、`scripts/export-v3-icons.mjs`、
`scripts/process-people-assets.mjs`）—— 实测它们**不在任何 `package.json` 脚本里**，是一次性人力工具，
本道一个字节都没动（见 §9）。

编码器：`sharp`（`package.json:41` 声明 `~0.34.5`，装的是 `0.34.5`）。
脚本自身的运行期读数：

```
libvips 组件表尾部（node 22 实测）：webp 1.6.0 / xml2 2.15.1 / zlib-ng 2.2.5 / sharp 0.34.5
```

## 2. 它写什么、哪些写盘目标是 git 跟踪的

脚本里硬写的两个根（`profile-svg-to-png.mjs:14-15`）：

```
SVG_ROOT = apps/client/src/static/assets/profile/svg     （只读输入）
PNG_ROOT = apps/client/src/static/assets/profile/png     （写盘输出，目录结构镜像）
```

- 输入侧实测 **48 个 `.svg`**（含 `v2/**` 子目录），输出侧磁盘上 **48 个对应 `.png`**，两边一一对上：
  `ORPHAN_png(no svg source)=` 空、`MISSING_png(has svg but no file)=` 空（即没有"有 SVG 无 PNG"或反过来的漏项）。
- 跟踪证据（不是"看起来像"）：

```
$ git ls-files apps/client/src/static/assets/profile/png | wc -l
48
$ git ls-files apps/client/src/static/assets/profile/svg | wc -l
48
$ find apps/client/src/static/assets/profile/png -name '*.png' | wc -l
48
```

  即 48 个生成目标**全部**是 git 跟踪文件。它们之所以能穿透 `.gitignore:68` 的 `*.png`，
  靠的是白名单 `.gitignore:78` `!apps/client/src/static/**/*.png`。
- 消费方（决定产物必须留在哪）：`apps/client/src/config/profile-assets.ts:12-13` 与
  `apps/client/src/config/profile-svg.ts:6-11` 在 `UNI_PLATFORM === "mp-weixin"` 时把扩展名换成 `png`，
  拼出 `/static/assets/profile/png/...` 与 `/static/assets/profile/png/v2/...`。
  vite/uni 只把 **`src/static/**` 整棵**拷进 `dist/build/<档>/static/`，
  ⇒ 运行期能解析到图的前提是"构建结束时该目录里有 PNG"，**而不是**"git 里有 PNG"。这一条决定了 §5 的落点。

## 3. 抖动的成因是测出来的：编码器元数据还是像素？

**先说结论：§9 把它登记成"编码器不是逐字节确定的"——这个归因是错的，实测推翻了它。
真正的机制是「备份里的一份陈旧 PNG 被 `prepare-static` 复原进被跟踪的 src」+「补写这一步在
Windows 上因占用失败」，两者叠加。编码器在本机是逐字节确定的（48/48 与 HEAD 相同）。**

### 3.1 同一 SVG 连跑三次（本机 node 22 + sharp 0.34.5，管线参数与 :44-47 逐字同形）

```
RUN1 size=28638 sha=1f4230626c084860
RUN2 size=28638 sha=1f4230626c084860
RUN3 size=28638 sha=1f4230626c084860
HEAD size=28638 sha=1f4230626c084860
RUNTORUN_identical=true
HEAD_vs_FRESH_identical=true
```

PATH 上的 node v16.13.1 跑同一段也是同样三个哈希（原生 libvips 是同一份，所以 Python/Node 版本不是变量）。

### 3.2 怎么把"元数据 vs 像素"分开来的

对 §9 留下来的那份 28622 字节产物（`.zcode/tmp/profile-hero.build-output.png`，我没有删，它就是证人）
与 HEAD 的 28638 做三层对比：

1. **chunk 清单**（只看类型与长度）：两份都只有 `IHDR:13 pHYs:9 IDAT:8192 IDAT:8192 IDAT:8192 IDAT:<n> IEND:0`，
   `IHDR` 的 13 字节逐字节相同（`000002ee 000002b4 0806 000000` = 750×692、8bit、RGBA），
   `pHYs` 两份都是 `00001d87 00001d87 01`（7557 ppm）。**没有任何 tEXt/iTXt/eXIf/iCCP 之类时间戳/ID 块**
   ⇒ 不是库偷偷写元数据。唯一差别是**最后一个 IDAT 的长度 3948 → 3932**，即 16 字节差全在压缩像素流里。
2. **解码后逐像素比**（两边都 `sharp().raw()` 解成 RGBA）：
   `PIXEL_diffbytes=2877`（共 2,076,000 字节的 raw 缓冲），首个差异在偏移 1120284（≈第 373 行）。
   ⇒ **是真实的像素/滤波差别，不是元数据**。这一点很重要：如果是元数据，加个
   `keepMetadata:false` 或固定 `png()` 选项就能修；是像素差别就修不了"确定性"本身。
3. **哈希对历史 blob**：
   ```
   oldblob(9f8e6200/19da39cc 提交的 28622B)  25fb835b9d091b4a
   sec9buildout(§9 那份"重跑产物")            25fb835b9d091b4a   ← 与旧 blob 逐字节相同
   headBlob(83dbeff7 起 HEAD 的 28638B)      1f4230626c084860
   myGenNow(本机现算)                        1f4230626c084860
   sec9==oldblob? true   sec9==myGen? false  head==myGen? true
   ```
   §9 那句"重跑得到 28622"其实是**旧 blob 的字节**，也就是说那份文件根本没有被"重跑生成"过 ——
   它是被 `prepare-static --dev` 从 `static-local-backup/full-static/` 里**复制回来的那一份**。

### 3.3 48 个输出全量对照（`measure3.mjs` 实测表尾行）

```
TOTAL svg=48 gen==HEAD:48 disk==HEAD:48 backup==HEAD:47
```

- `gen==HEAD 48/48`：当前编码器输出与仓库里的跟踪字节**全部**一致 ⇒ 不存在"逐字节不确定"。
- `backup==HEAD 47/48`：**备份里只有 `profile-hero.png` 一份是陈旧的**（还是 8-30 那版 28622B），
  而 `git ls-files` 实测被跟踪的生成目标恰好就是这 48 个（`tracked_png=48 / tracked_svg=48 / disk_png=48`，
  无孤儿：`ORPHAN_png(no svg source)=` 空、`MISSING_png=` 空）。

把 3.2 与 3.3 合起来，§9 观察到的 `tracked_dirty=1` 的完整因果链是：

1. `prepare-static --dev` 整棵替换 `src/static`，把备份里那份**陈旧**的
   `profile-hero.png`（28622B）盖进被跟踪的 src ⇒ 立刻脏 1 项；
2. 紧随其后的 `profile-svg-to-png` 把 48 张从 SVG 重编码回 src ⇒ 28638B，脏项被自己抹掉（自愈）；
3. 那次 showcase 构建里第 2 步对 `profile-hero.png` 的写盘报了
   `Invalid argument`（微信 IDE/模拟器正持有该文件），自愈没发生 ⇒ 工作树停在 28622B，
   于是看起来像"同一 SVG 重跑出不同字节"。

⇒ 需要修的不是"确定性"，而是**「被跟踪的 src 文件是构建的写盘目标」这件事本身**：
只要构建还在写跟踪文件，写失败或备份陈旧都会立刻变成脏项，而脏项计数正是本仓的门禁凭据。

## 4. 基线构建状态（动手之前先量，用来区分「我弄坏的」与「本来就坏的」）

改动前，先按 sanctioned 入口跑了 mock 一档（`scripts/qa/run-npm-script.mjs`，它同时要求构建成功标记，
不只看退出码）：

```
NPMSCRIPT cwd=D:\6\恋爱小程序\apps\client script=build:mp-weixin:mock exit=0 标记=1 输出字节=32611 判据=命中 1/2 个「mp-build」标记
  | DONE  Build complete.
NPMSCRIPT_RESULT=OK（命中 1/2 个「mp-build」标记）
BASELINE_MOCK_EXIT=0
```

⇒ **mock 档在基线就是好的**，本道之后任何一次失败都是我弄的，不是继承的。

基线三档 `config/env.js` 现场（改动前留档，副本已存 `.zcode/tmp/svgpng-r9/pre-*.env.js`）：

```
mp-weixin          size=2402 mtime=2026-09-29 20:38:23 sha=f1c7b96b  MODE:"mp-weixin-mock" MODE:"mock"
mp-weixin-real     size=2392 mtime=2026-09-29 20:39:21 sha=f0677920  MODE:"real" MODE:"real"
mp-weixin-showcase size=2441 mtime=2026-09-29 20:40:11 sha=ed1cd82c  MODE:"mp-weixin-showcase" MODE:"real" MODE:"true"
```

`f1c7b96b` 与 §9/r6 记录的那个 mock 指纹一致（不是巧合：它就是 §9 那次构建的产物，本道没有重建之前它一直在）。

基线那次成功构建之后立刻量的 `git status --short apps/client/src` 是 **0 行**（自愈链完整跑通），
并且 `dist` 里的 PNG 与 src、与现算三者同哈希：

```
1f4230626c084860…  apps/client/dist/build/mp-weixin/static/assets/profile/png/profile-hero.png
1f4230626c084860…  apps/client/src/static/assets/profile/png/profile-hero.png
1f4230626c084860…  .zcode/tmp/svgpng-r9/gen-a.png
```

## 5. 处置：产物新落点 + 为什么这个落点站得住

待填。

## 6. 运行期仍能解析到图：以构建产物为证，不以源码图为证

待填：三档 dist 里的 png 与 sha。

## 7. 三档重建：逐步退出码 + 每档 `MODE:` 原文

待填（顺序 mock → real isolated → showcase isolated）。

## 8. 终态量测：`git status --short apps/client/src` 与 `verify-band-freshness`

待填。

## 9. 没动的东西（not changed）

待填。
