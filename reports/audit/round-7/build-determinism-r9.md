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

### 5.1 改了什么（只有三处，都在构建链这一侧）

1. **`apps/client/scripts/profile-svg-to-png.mjs`** —— 输出根从被跟踪的
   `src/static/assets/profile/png/` 换成**未跟踪的生成目录**
   `apps/client/static-generated/assets/profile/png/`（目录结构照旧镜像）。
   - 默认形态（构建链用的形态）：生成 + **只读校验** src 里那一份与现算是否逐字节相同；
     不一致就打 `MISMATCH` 并 `SVGPNG_RESULT=FAIL`、退出码 1 —— 抖动的处置从"静默改写跟踪文件"
     变成"响亮地判红"。
   - `--write`：显式刷新跟踪 PNG（给人改了 SVG 之后用），**不在任何构建链里**。
   - `--check`：不写任何文件，只现算比对（CI 复量）。
   - 写盘一律"字节相同就不写"（`writeIfChanged`）：既不留无谓的 mtime 抖动，也避免对
     正被模拟器持有的文件做写盘 —— §9 那条 `Invalid argument` 就是后者。
   - **编码参数一个字节没动**（`density:192` / `resize({width:750,withoutEnlargement:false})` / `.png()`），
     这是"生成物 == 仓库里那份"的前提；改成"看起来更确定"的参数会让 48 张全部与 HEAD 不一致，
     等于把一次抖动换成一次 48 文件的二进制重基线，那不是本道的授权范围。
2. **`apps/client/scripts/prepare-static.mjs`** —— 新增 `seedProfilePngFromAuthority()`，
   在 `--dev/--h5` 的 restore 与 `--real` 的 strip 两条路上，把
   `assets/profile/png/**` 的**来源**从"未跟踪的本机备份"改为权威顺序
   `现有 src（被跟踪字节）> static-generated（构建期现算）> backup（兜底）`。
   - 为什么必须动这里：§9 的脏项**不是**编码器抖动造成的（见 §3），而是备份里那一份
     `profile-hero.png` 陈旧（28622B，等于 8-30 提交的旧 blob）被盖进跟踪的 src。
     只把生成物请出 src、却放任 `prepare-static` 继续用备份覆盖跟踪 PNG，
     脏项会**照旧发生且再也无法自愈**（原来靠生成器改写回来，现在生成器不写了）——
     那比修之前更糟。备份树里那批 profile PNG **绝大多数是未跟踪的本机副本**（实测：
     磁盘 48 张、`git ls-files` 只认 2 张 —— 只有 `avatar-ring.png` 和
     `v2/avatar/avatar-ring.png` 被 `.gitignore:91 !/**/avatar*.png` 放行入库；其余 46 张由
     `.gitignore:70 *.png` 挡在仓外，`git cat-file HEAD:…/profile-hero.png` 报
     `exists on disk, but not in 'HEAD'`），
     所以"顺手把备份刷成正确字节"这种处置不可持续（换台机器就没了），必须让构建不再以备份为准。
   - `strip()`（real 档）用 `onlyExisting: true`：只把已经因引用进包的那些对齐到权威来源，
     不借 seeding 往 real 档多塞文件 —— 包体积与 strip 的既有语义不动。
   - **写盘方式换了，因为测出了既有 `cpSingle()` 的一个真坑**：第一版 seeding 用现成的
     `cpSingle(from, to)`，同一对沙箱**第一轮是错的**（完整读数见 §5.4.1）—— `cpSync` 在这台
     Windows 上抛那条被本文件注释记录过的假错（`warn: cpSync … 假错（目标已写入，继续）`），
     而 `cpSingle` 的"目标存在就算写成功"启发式对**覆盖已有文件**不成立：目标本来就存在
     （就是要被换掉的那份陈旧字节），于是陈旧字节留在原处、seeding 却谎报"换成权威来源 1 个"，
     而沙箱的 `SBX_*_EXIT` 还是 0。现在 seeding 自己 `readFileSync` 权威字节 → `writeFileSync`
     落盘 → **写完复验**，复验不一致就抛，交给既有的回滚路径（宁可构建失败，不带着陈旧 PNG 假装成功）。
     这条不是顺手重构：不改它，本处置就是**假成功**。
3. **`.gitignore`** 新增一行 `apps/client/static-generated/`（放在 `:153 static/generated_test/` 之后）。
   必要性实测过：只靠全局 `*.png` 挡不住这棵目录 —— `.gitignore:91 !/**/avatar*.png`
   会把 `static-generated/assets/profile/png/avatar-ring.png` 重新放行成未跟踪脏项
   （加规则前 `git status --short apps/client` 里确实出现了 `?? apps/client/static-generated/`）。

### 5.2 为什么"src 里那份 PNG 还留着"不是没修干净

- **本车道不能把它从 git 里摘掉**：`git rm --cached` 会给 48 个跟踪路径留下**暂存删除**，
  `git status --short apps/client/src` 就会是 48 行 `D`，而这正是本道要求量成"空"的那一项；
  摘与不摘是编排者的提交决定，不是构建链能自己完成的事。
- 现在的性质是：**src 里那份 PNG 不再是构建的输出**（构建只读它、比对它），
  它是"入库的那一份皮肤"，与 `static-generated/`（可重生成的构建产物）分工明确。
  真正的"跟踪文件被构建改写"这一条已经消失：见 §8 的 `git status` 终量与 §7 的三次重建。
- 确定性要求因此**降级为不需要**（这正是裁定给的第二个选项）：编码器换版只会让 §5.1 的校验判红，
  不会再让工作树脏，也不会再给按 sha 的门禁喂 16 字节的抖动。

### 5.3 负例：这道新校验是承重的（会红）

沙箱 `.zcode/tmp/svgpng-r9/negtest/`（脚本副本 + 真 SVG + 那份陈旧的 28622B PNG 当作 src 里的在包字节）：

```
[profile-svg-to-png] MISMATCH profile-hero.png: src 里的 PNG 与 SVG 现算结果不一致（28622B vs 28638B）——…
[profile-svg-to-png] 共 1 张不一致 ⇒ 判红，不静默改写跟踪文件
SVGPNG_RESULT=FAIL mode=check encoded=1 … tracked_checked=1 mismatch=1 tracked_refreshed=0
NEGTEST_EXIT=1
```

同形正例（真树，`--check` 之外跑生成）：

```
SVGPNG_RESULT=PASS mode=generate encoded=48 … written=48 unchanged=0  tracked_checked=48 mismatch=0   （第 1 遍，写满）
SVGPNG_RESULT=PASS mode=generate encoded=48 … written=0  unchanged=48 tracked_checked=48 mismatch=0   （第 2、3 遍）
```

**逐字节稳定性（生成多遍、哈希多遍）**：整棵 `static-generated/assets/profile/png`（48 个文件，
按相对路径 + 内容一起算的树哈希）四遍同值 —— 第 1 遍写满 48 个，第 2/3/4 遍都是
`written=0 unchanged=48`，树哈希不变：

```
$ node -e "<treeHash>"        # 第 2 遍之后
{"n":48,"sum":"8a1e13bd70115786"}
$ node scripts/profile-svg-to-png.mjs   # 第 4 遍，三次重建之后再跑一次
SVGPNG_RESULT=PASS mode=generate encoded=48 … written=0 unchanged=48 tracked_checked=48 mismatch=0 tracked_refreshed=0
generated_tree_PASS4={"n":48,"sum":"8a1e13bd70115786"}
profile-hero_generated_sha16=1f4230626c084860
profile-hero_src_sha16      =1f4230626c084860
profile-hero_backup_copy_现在=1f4230626c084860  （§9.1 那次一次性 cp 之后；cp 之前量到的是 25fb835b9d091b4a，见 §3.3）
```

### 5.4 三条负例/恢复路径都在沙箱里量过（不碰跟踪文件）

沙箱根 `.zcode/tmp/svgpng-r9/{negtest,ps-sbx-A,ps-sbx-B}/`，各放脚本副本 + 真 SVG +
那份陈旧的 28622B PNG（`.zcode/tmp/profile-hero.build-output.png`，§9 留下的证人）当"src 里在包的字节"。

1. **生成器的校验会红**（这是"把抖动改判成响亮失败"这条处置的承重证明）：

   ```
   NEGTEST_EXIT=1
   SVGPNG_RESULT=FAIL mode=check encoded=1 … tracked_checked=1 mismatch=1 tracked_refreshed=0
   [profile-svg-to-png] MISMATCH profile-hero.png: src 里的 PNG 与 SVG 现算结果不一致（28622B vs 28638B）
   ```

2. **`--write` 恢复路径能用**（改了 SVG 之后的人工出口）：

   ```
   WRITE_EXIT=0
   [profile-svg-to-png] WRITE 已刷新跟踪 PNG profile-hero.png（记得提交这一份）
   SVGPNG_RESULT=PASS mode=write encoded=1 … mismatch=0 tracked_refreshed=1
   sandbox_src_png_now=28638 1f4230626c084860      ← 沙箱那份"在包的字节"被刷成正确字节
   RERUN_EXIT=0 → SVGPNG_RESULT=PASS … written=0 unchanged=1 mismatch=0 tracked_refreshed=0   ← 再跑一遍就干净
   ```

3. **`prepare-static` 的权威顺序真的在换字节**：

   ```
   SBX_A_EXIT=0  profile PNG 权威对齐：换成权威来源 1 个 / 字节相同跳过 0 个 / 共 1 个
                 → promoted_png=28638 1f4230626c084860
                 （场景：src/static 里**没有**这张 PNG —— 模拟新克隆或被 --real 裁过；
                   备份里那份是陈旧的 28622B ⇒ 必须由 static-generated 补上正确字节）
   SBX_B_EXIT=0  profile PNG 权威对齐：换成权威来源 1 个 / 字节相同跳过 0 个 / 共 1 个
                 → promoted_png=28638 1f4230626c084860
                 （场景：src/static 里放着**跟踪的那一份** 28638B，备份仍是陈旧 28622B
                   ⇒ 跟踪字节保住，备份盖不动它）
   ```

   注：两个沙箱里都**只**放了 1 张 PNG（不是整棵 `full-static`），所以 `共 1 个` 是沙箱规模的正确读数；
   真树上同一行读数是 `换成权威来源 0 个 / 字节相同跳过 48 个 / 共 48 个`（§7）。

### 5.4.1 上一节那两条 SBX 读数不是天生就对的：第一轮它们红的

`seedProfilePngFromAuthority()` 第一版复用了本文件里现成的 `cpSingle()`（`cpSync` +
"抛错但目标存在就算写成功"的启发式）。同一对沙箱在那一版下的读数：

```
[prepare-static] warn: cpSync …\ps-sbx-B\src\static\assets\profile\png\profile-hero.png 假错（目标已写入，继续）
[prepare-static] profile PNG 权威对齐：换成权威来源 1 个 / 字节相同跳过 0 个 / 共 1 个
SBX_A_src_png(size/sha16)=28622 25fb835b9d091b4a     ← 期望 28638：陈旧字节没被换掉，日志却在谎报"换成 1 个"
SBX_B_src_png=28622 25fb835b9d091b4a                 ← 期望 28638：跟踪字节被陈旧备份盖掉了
（两档的 SBX_*_EXIT 都是 0 —— 只看退出码会当成通过）
```

`cpSingle` 的启发式对**新建文件**是安全的，对**覆盖已有文件**不成立：目标本来就存在，
假错之后 `existsSync(dst)` 必然为真 ⇒ 旧字节被当成新字节。本处置的语义恰好是覆盖，
所以 seeding 改成自己 `readFileSync` 权威字节 → `writeFileSync` 落盘 → **写完立刻复验**，
不一致就抛给既有的回滚路径。改完才是 §5.4 里那两条 `28638 / 1f4230626c084860`。
同样的复验纪律也加进了生成器的 `--write` 分支（写完不复验就 `refreshed++` 是同一个坑）。
这条是本道唯一一个"改了自己的实现"的返工，原因和证据都在上面，不是事后修饰。

### 5.5 一处**没有**用来当凭据的本机动作

排查时我顺手把本机备份 `static-local-backup/full-static/assets/profile/png/profile-hero.png`
`cp` 成了正确字节（`BACKUP_REFRESH_EXIT=0`）—— 见 §9.1：那条动作**不在处置的依赖里**，
换一台留着陈旧备份的机器跑同样三档也不会脏（§5.4 场景 A/B 就是为这句话出的证）。

## 6. 运行期仍能解析到图：以构建产物为证，不以源码图为证

三层证据，全部量自三档的 `dist`，不是从源码图推的。

### 6.1 包里有这张图，且字节 == 生成目录 == 跟踪的那一份

三档重建之后逐档取样（每张都量 size + sha256 前 16 位）：

| 取样路径（相对各档 `static/assets/profile/png/`） | mock `mp-weixin` | real `mp-weixin-real` | showcase `mp-weixin-showcase` |
|---|---|---|---|
| `profile-hero.png` | `28638 / 1f4230626c084860` | `28638 / 1f4230626c084860` | `28638 / 1f4230626c084860` |
| `v2/hero/hero-gradient-bg.png` | `6305 / 6db7cf017b4830ff` | `6305 / 6db7cf017b4830ff` | `6305 / 6db7cf017b4830ff` |
| `v2/match/match-progress.png` | `28825 / 83b69114255583f9` | `28825 / 83b69114255583f9` | `28825 / 83b69114255583f9` |

参照：`static-generated/assets/profile/png/profile-hero.png` 与
`src/static/assets/profile/png/profile-hero.png` 同为 `28638B / 1f4230626c084860`。
⇒ **三档都带着图、字节都与生成物一致 ⇒ 没有出现"静默缺图"**（缺图会是 `MISSING_FROM_BUNDLE`，本轮 0 次）。

### 6.2 引用侧的一个诚实发现（不是本道引入的）

在**编译后的产物**里搜这些路径字面量，三档命中数都是 0：

```
mp-weixin / mp-weixin-real / mp-weixin-showcase: grep -rl --include=*.js "assets/profile/png/profile-hero" ⇒ 0
grep -rn "PROFILE_ASSET\|profileSvg\|profile-assets\|profile-svg" 全仓跟踪文件 ⇒ 除两个注册表自身外 0 个 importer
```

`apps/client/src/config/profile-assets.ts` / `profile-svg.ts` 这两个"按平台选 svg/png"的注册表
**目前没有任何页面 import**（唯一提到该路径的是 `InterestRecommendation.vue:23` 的一句注释）。
⇒ 本道的改动**不可能**让某个正在显示的图消失，因为今天没有任何运行时引用指向它；
而 6.1 证明"等它被引用时，包里的确在那个路径上有正确的字节"。
这条既有事实登记在此，不在本道修（那是产品侧的活，且会动 UI 面）。

### 6.3 构建侧的承重断言仍然生效

`build:mp-weixin:mock` 链尾的 `verify-package-size.mjs --allow-mock` 与
`verify-build-features.mjs` 都过（整条链 `exit=0`），
两个隔离载具的共享目录指纹闸也照旧给绿：

```
[g7]       outDir=…\dist\build\mp-weixin-real       sharedOutUntouched=yes   G7_RESULT=PASS
[showcase] outDir=…\dist\build\mp-weixin-showcase   sharedOutUntouched=yes   SHOWCASE_RESULT=PASS
```

## 7. 三档重建：逐步退出码 + 每档 `MODE:` 原文

顺序按裁定 **mock → real isolated → showcase isolated**；每步单独取码
（`node scripts/qa/run-npm-script.mjs` 不只看退出码，还要求 `mp-build` 成功标记，
所以"exit=0 但其实没建成"这一类会被它判 FAIL —— 本轮三步都是 exit=0 且标记=1）。

**本道一共完整跑了两轮三档**：第 1 轮在生成器改造之后、`prepare-static` 那处
`cpSingle` 假错修正之前（§5.4 第一轮的红读数就是在这两轮之间发现的）；
下面是**第 2 轮（最终态，处置完整生效的那一轮）**的读数，第 1 轮的读数与之逐行同形。
每步都单独 `cmd; echo $?` 取码，没有让任何两条命令共用 `$?`。

| 步 | sanctioned 入口 | 退出码 | 成功标记 | 该档 `config/env.js` 的 `MODE:` grep（原文） |
|---|---|---|---|---|
| 1 | `build:mp-weixin:mock` | `STEP1_MOCK_EXIT=0` | `标记=1 … 命中 1/2 个「mp-build」标记` | `MODE:"mp-weixin-mock"` / `MODE:"mock"` |
| 2 | `build:mp-weixin:real:isolated` | `STEP2_REAL_EXIT=0` | `标记=1 … 命中 1/2 个「mp-build」标记` | `MODE:"real"` / `MODE:"real"` |
| 3 | `build:mp-weixin:showcase:isolated` | `STEP3_SHOWCASE_EXIT=0` | `标记=1 … 命中 1/2 个「mp-build」标记` | `MODE:"mp-weixin-showcase"` / `MODE:"real"` / `MODE:"true"` |

第 3 步的三行依次是 `MODE`（vite mode）、`VITE_API_MODE`、`VITE_SHOWCASE_MODE`，
载具自己的自证原文（第 2 轮，取自 npm 全量日志）：

```
[showcase] 产物自证 MODE=mp-weixin-showcase VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api VITE_SHOWCASE_MODE=true
[showcase] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-showcase sharedOutUntouched=yes
SHOWCASE_RESULT=PASS
[g7] 产物自证 MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api
[g7] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real sharedOutUntouched=yes
G7_RESULT=PASS
```

**中毒闸（第 3 步之后立刻复量共享目录）**：showcase 跑完之后
`dist/build/mp-weixin/config/env.js` 仍是

```
MODE:"mp-weixin-mock"
MODE:"mock"
```

⇒ mock/共享目录报的是**它自己那一档**，§9 记的那条"showcase 把 mock 档原地换掉"的旧事故
**没有被重新引入**（real 步之后也复量过一次，同样是 `mp-weixin-mock`；
两个隔离载具也各自打了 `sharedOutUntouched=yes`）。
三步全部 exit=0；顺带把 §9 那次 `showcase:isolated exit=1` 的成因消掉了 ——
它当时死在 `profile-svg-to-png` 对跟踪文件的写盘被占用打断（`Invalid argument`），
而现在这一步**不再写跟踪文件**，两轮三份 npm 全量日志里 `Invalid argument` 命中 0 次：

```
SVGPNG_RESULT=PASS mode=generate encoded=48 … written=0 unchanged=48 tracked_checked=48 mismatch=0 tracked_refreshed=0
[prepare-static] profile PNG 权威对齐：换成权威来源 0 个 / 字节相同跳过 48 个 / 共 48 个（顺序 src(跟踪字节) > static-generated(构建现算) > backup(本机备份)）
```

（mock 与 showcase 两条链各打过一次同样两行；`换成权威来源 0 个` 就是"备份再也盖不动跟踪 PNG"的直接读数 ——
在真树上 48 张全部命中"字节相同跳过"，一次跟踪文件都没被改写。）

## 8. 终态量测：`git status --short apps/client/src` 与 `verify-band-freshness`

**先给量法自证**（避免"永远返回空的仪器"）：同一条命令对我改过的目录是能报出脏的 ——

```
$ git status --short apps/client/scripts
 M apps/client/scripts/prepare-static.mjs
 M apps/client/scripts/profile-svg-to-png.mjs
```

目标量（三次重建跑完之后）：

```
$ git status --short apps/client/src            # 输出 0 行
SRC_DIRTY_LINES=0
$ git status --porcelain -- apps/client/src | wc -l
0
```

⇒ **构建不再弄脏被跟踪的 src**：这就是本次处置的要证的东西，量到的，不是声明的。
另外三档的 `config/env.js` 在重建前后**逐字节相同**（sha256 前 8 位 `f1c7b96b / f0677920 / ed1cd82c`
与 §4 那份基线一致，size 也没变 2402/2392/2441）—— 也就是说按 sha 的门禁
（`verify-provenance-all` / `verify-evidence-corpus`）不会因为本道换了一次构建而看到新的抖动源：

```
mp-weixin          PRE=f1c7b96b CUR=f1c7b96b CURSIZE=2402
mp-weixin-real     PRE=f0677920 CUR=f0677920 CURSIZE=2392
mp-weixin-showcase PRE=ed1cd82c CUR=ed1cd82c CURSIZE=2441
```

（`static-generated` 那 48 张的树哈希在最终一轮之后仍是 `8a1e13bd70115786`，与 §5.3 一致。）
（`apps/client/static-generated/` 现为未跟踪且被 `.gitignore:157` 显式忽略：
`git status --short apps/client/static-generated` 空、
`git check-ignore -v` 指到 `.gitignore:157:apps/client/static-generated/`。）

`verify-band-freshness` 原文（node 22；`FRESH_EXIT=0`；**最终那一轮三档重建之后**量的）：

```
FRESH srcFiles=753 git脏项(0行报出/0条解析) srcDirtyFiles=0 档位=3 标记=4
  mock      产物文件=2154 最新产物=2026-09-29T16:28:05.376Z 源码脏项最新=null 脏项晚于产物=0 构建写回(仅mtime)=8
  real      产物文件=2153 最新产物=2026-09-29T16:29:11.909Z 源码脏项最新=null 脏项晚于产物=0 构建写回(仅mtime)=8
  showcase  产物文件=2154 最新产物=2026-09-29T16:30:56.630Z 源码脏项最新=null 脏项晚于产物=0 构建写回(仅mtime)=0
  标记 isAllowedMediaExt          mock=3 real=3 showcase=3
  标记 parsePrivateQuoteContext   mock=2 real=2 showcase=2
  标记 pinnedNotice               mock=2 real=2 showcase=2
  标记 --hot-badge-bg             mock=1 real=1 showcase=1
FRESH_内容级 嫌疑(按mtime)=0 真过期=0 仅mtime已洗清=0 无法定罪=0 不可观测=0 跳过(测试文件不进产物)=0 跳过(该档已定罪)=0
FRESH_RESULT=PASS bands=3 markers=4 —— 每档产物都不晚于任何未提交改动，且符号级深检全部命中
```

三档各自的 `最新产物` 时间戳就是最终那一轮三步的构建时刻（16:28 / 16:29 / 16:30 UTC，
即 mock → real → showcase 的顺序本身也在这行读数里可核），
`脏项晚于产物=0` 且 `git脏项(0行/0条)` —— 也就是说这一门的"红"来源里，
§9 登记的那条"构建抖动带来的假红候选"已经不再是候选了。
（第 1 轮三档之后同一道门也是 PASS，时间戳 16:09 / 16:12 / 16:16，读数形状一致。）

## 9. 没动的东西（not changed）

- **编码参数与图像内容**：`density:192`、`resize({width:750,withoutEnlargement:false})`、`.png()` 默认
  —— 一张图的像素都没重做（`PIXEL_diffbytes` 只在比对陈旧备份那份时非 0，本道产出与 HEAD 逐字节相同）。
- **48 个被跟踪的 `src/static/assets/profile/png/**` 与 48 个 `svg` 源**：本道一次都没写它们
  （默认形态只读；`--write` 不在任何链里，本轮也没人工跑过）。
- **`apps/client/package.json` / 根 `package.json`**：0 处改动。三档入口、脚本名、
  `:isolated` 变体、步骤顺序全照旧（包括那条我"本来想顺手调顺序"的 `build:mp-weixin:real:dev`）。
- **`build-real-isolated.mjs`**：0 处改动（BANDS 表、BAND_GUARD、自证判点、`--self-test` 全照旧）。
- **`prepare-static.mjs` 的既有机制**：原子提升、回滚、`cp -a`/单文件 copy 的取舍、`strip()` 的引用扫描
  一概没动；只在两条路上各加一次"把 profile PNG 的来源对齐到权威"的调用。
- **另一个用 sharp 的 6 个脚本**（`scripts/svg-to-png.mjs`、`split-icons.mjs`、
  `scripts/convert-icons.js`、`download-freesvglab-icons.mjs`、`export-v3-icons.mjs`、
  `process-people-assets.mjs`）：不在构建链上，本道没碰。
- **`prune-unreferenced-static.mjs`、`strip-mock-for-mp.mjs`、`inject-wx-appid.mjs`、
  `verify-build-features.mjs`、`verify-package-size.mjs`、`verify-env-release.mjs`**：没碰。
- **门禁件**：`scripts/qa/verify-guest-landing.mjs`、`emit-round-report.mjs`、`apply-ops-cellplans.mjs`、
  `verify-case-automatable.mjs`、`.zcode/workflows/**`、`reports/audit/round-7/ops/**` —— 未触碰（其他车道在改）。
- **`reports/**` 下的证据/帧**：只新增了本报告一个文件，没有删改任何既有证据；
  §9 那份 `.zcode/tmp/profile-hero.build-output.png` 证人**原样留着**。
- **没有 `rm -rf` 过任何目录**，`apps/client/dist/build/**` 三档在动手前的 `config/env.js`
  已备份到 `.zcode/tmp/svgpng-r9/pre-{mp-weixin,mp-weixin-real,mp-weixin-showcase}.env.js`
  （sha `f1c7b96b / f0677920 / ed1cd82c`，见 §4）。
- **没有做 UI 自动化、没有拿 DevTools 租约、没有占 WS 通道。**

### 9.1 一处需要编排者知道的"本机不可复现"事实（本道没有用它当凭据）

`apps/client/static-local-backup/full-static/assets/profile/png/profile-hero.png`
是**未跟踪的本机副本**：`git cat-file HEAD:…` 报 `exists on disk, but not in 'HEAD'`，
`git check-ignore` 指到 `.gitignore:70 *.png`（同目录 48 张里只有 2 张 `avatar-ring.png`
因 `.gitignore:91` 的白名单入库，见 §5.1(2)）。我在排查过程中把它 `cp` 成了正确字节
（`BACKUP_REFRESH_EXIT=0`；现在它是 `1f4230626c084860`，与 src/生成物一致；`cp` 之前量到的是
`25fb835b9d091b4a` —— 就是 §3.3 表里 `profile-hero.png` 那行 `backup=` 的读数，
也是 §3.2 那份 28622B 证人的哈希）。
但**处置不依赖这一步**：§5.1(2) 之后构建根本不再以备份为权威，
换一台留着陈旧备份的机器跑同样三档，跟踪的 src 也不会被它盖掉。

这条"备份盖不动跟踪 PNG"是**量过的**，不是推理的 —— 两个沙箱（§5.4，脚本副本 + 陈旧备份 28622B）
最终都让提升后的 `src/static/…/profile-hero.png` 落在**正确字节**上：

```
SBX_A_EXIT=0  promoted_png=28638 1f4230626c084860   （src 原本没有这张图，备份陈旧 ⇒ 由 static-generated 补上正确字节）
SBX_B_EXIT=0  promoted_png=28638 1f4230626c084860   （src 有跟踪字节、备份陈旧 ⇒ 跟踪字节保住，盖不动）
```

### 9.2 本道没做、但被这条链暴露出来的两件事（登记，不动）

1. `build:mp-weixin:real`（**非** isolated）链里 `prepare-static --real` + `prune-unreferenced-static.mjs`
   会按引用扫描裁剪 `src/static`，而 profile 这批 PNG 的引用是模板串拼出来的，扫不出字面量 ⇒ 理论上
   可能把跟踪的 PNG 从 src 里裁掉（那就是 48 行 `D` 的脏项）。本道按裁定只跑
   `real:isolated`（其 preSteps 为空，不裁剪），**没有实测**这一条，留给后续车道。
2. §6.2：两个 profile 资产注册表（`profile-assets.ts` / `profile-svg.ts`）无人引用 ——
   要么产品侧接上，要么它们是死码；两者都超出"构建确定性"的授权范围。

### 9.3 HEAD 在本道跑的过程中动了（记账，免得读数被误读）

- 本道起点 `HEAD=1788675d`（任务书给的）；终态 `HEAD=491210dd` —— 编排者在跑三档期间
  做了本地落账提交（`git log --oneline 1788675d..HEAD` 共 5 条）。
- 关键复核：**这些提交没有改过被跟踪的 src** ——
  `git diff --name-status 1788675d..HEAD -- apps/client/src` 输出为空。
  所以 §8 的 `SRC_DIRTY_LINES=0` 无论按起点 HEAD 还是按当前 HEAD 读都是同一个意思。
- 本道改动的落库状态（我没有提交，按分工由编排者提交）：
  `apps/client/scripts/prepare-static.mjs` 与 `.gitignore` 已被 491210dd 带走；
  `apps/client/scripts/profile-svg-to-png.mjs` 还剩 5 行未提交
  （`git diff HEAD --stat` 报 `1 file changed, 5 insertions(+)`），
  就是 §5.4.1 末句那条"`--write` 写完复验"的加固。
- 未跟踪且**应当**保持未跟踪：`apps/client/static-generated/`（48 张 PNG，§5.1(3) 那条规则）。
- 测量台与沙箱都留在 `.zcode/tmp/svgpng-r9/`（被 `.gitignore:112 tmp/` 忽略，不进仓也不弄脏任何计数）；
  §9 那份 28622B 证人 `.zcode/tmp/profile-hero.build-output.png` **原样未删**。

## 10. 一句话结论

抖动不是编码器"逐字节不确定"（本机 48/48 与 HEAD 逐字节相同），而是**构建在写被跟踪的 src**：
陈旧的未跟踪备份被 `prepare-static` 盖进跟踪文件，`profile-svg-to-png` 再改写回来当自愈，
自愈一旦被 Windows 占用打断（`Invalid argument`）就留下脏项 —— 本道把这两次写盘都取消了
（生成物进未跟踪目录 + 备份不再具有权威），改成"不一致就判红"，
并按 mock → real:isolated → showcase:isolated 重建三档：三步 exit=0、
三档各自报自己的 `MODE`、mock/共享目录没有被毒、`git status --short apps/client/src` = 0 行、
`verify-band-freshness` PASS。

---

## 附：r12 验收车道接手附记（2026-09-30，逐字独立复量，非背书）

本道在本报告中断后接手，全部读数自量（详见 `build-determinism-accept-r12.md`）。三条结论：

1. **本报告 §1–§9 的自报读数没有一处被复量推翻。** §3.3（`gen==HEAD 48/48`）、§5.4（两个沙箱落在
   28638）、§5.1(2)（备份 profile png 目录 48 张里只有 2 张 `avatar-ring.png` 被跟踪 —— 本道
   `git ls-files` 复量 = 2）、§8（`SRC_DIRTY_LINES=0`、`FRESH_RESULT=PASS`）全部复现。
   三档重建本道又跑了一遍：`STEP1/2/3_EXIT=0`，共享目录仍是 `MODE:"mp-weixin-mock"`。
2. **§5.4.1 那条 `cpSingle` 假错：本道补修了 helper 本体**（原来只有 seeding 绕开它）。
   `apps/client/scripts/prepare-static.mjs:101-124` 的 catch 分支从「目标存在就算写成功」改为
   「字节复验 == 源才放行，否则抛」。本机可用只读目标**确定性复现**那条 Windows 假错
   （`cpSync` 抛「操作成功完成」而目标仍是陈旧字节），改前 `NEG_EXIT=0` 且谎报、改后 `NEG_EXIT=1`，
   真·假错容错（POS）仍 `exit=0`。本报告 §1.2/§4.1 有双向读数。
   同时如实记下可达性：现有两个调用点写的都是新建 stage，目标不可能预存，
   故该谎报**在生产链路上今天是潜伏的**，本道补修是拆雷，不是救火。
3. **一处范围补正（原报告没量到，容易让后人低估这条链）**：被跟踪的构建写盘目标不是 48 张 profile PNG，
   而是 `git ls-files apps/client/src/static` = **1344** 个路径（`.gitignore` 的
   `!apps/client/src/static/**/*.png` 之类是**整棵**放行）。`prepare-static --dev` 仍以未跟踪的
   `static-local-backup` 为那其余 ~1296 个文件的来源；权威顺序只护住了 profile 那 48 张。
   今天量到 0 脏项是因为备份字节恰好与入库一致，**不是结构上盖不动**。超出本次裁定授权，登记待后道处理。
   另：本道补测了原 §5.4 未覆盖的场景 C（src 与 static-generated 同时缺位）⇒ seeding 会退回陈旧备份，
   这是权威顺序的固有局限，不是本道的回归。
