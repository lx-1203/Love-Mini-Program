# r12 验收车道：r9「把 profile SVG→PNG 产物请出被跟踪 src」的接手与终量（ACCEPTANCE lane）

> 本道是验收道，不是原作者。上一道（r9，`build-determinism-r9.md`）在 150 轮上限处中断，
> 最后遗言：「Real bug found by the sandbox: `cpSingle` swallowed a Windows false-error and my
> seed function lied about it. Fixing:」。本道的所有读数都是自己量的，r9 自述凡与实测冲突处一律在
> 文末「对 r9 自报的更正」一节标注，不替死道背书。

## 0. 接手现场（state taken over）

**任务书给的前提与实际 git 状态不符，先纠一处：三处改动里有两处已经不在工作树里，因为它们已被提交。**

```
$ git status --short | grep -v '^ D reports/screenshots/'
 M apps/client/scripts/profile-svg-to-png.mjs
 M reports/audit/round-7/build-determinism-r9.md
 M reports/audit/round-7/decisions-v33.md
$ git diff --cached --stat          # 空（无暂存）
$ git show --stat 491210dd | grep ...
 .gitignore                                    |   4 +
 apps/client/scripts/prepare-static.mjs        |  76 ++++++-
 apps/client/scripts/profile-svg-to-png.mjs    | 103 ++++++++-
```

⇒ r9 的 `prepare-static.mjs`（+76 行）与 `.gitignore`（+4 行）已由编排者本地提交 `491210dd` 带走，
`git diff` 对它们**无输出**不是因为改动丢了，而是因为已入库。逐条复核入库内容：

- `git show HEAD:.gitignore | sed -n 157p` ⇒ `apps/client/static-generated/`（规则在）
- `git check-ignore -v apps/client/static-generated/assets/profile/png/avatar-ring.png`
  ⇒ `.gitignore:157:apps/client/static-generated/`（**正是 r9 声称的那条必要性的直接读数**：
  没有这条规则时 `!**/avatar*.png` 会把它放行成未跟踪脏项，现在它被显式忽略，且忽略生效）
- `git show HEAD:apps/client/scripts/prepare-static.mjs | grep -c seedProfilePngFromAuthority` ⇒ 3（函数在库里）
- 唯一未提交的：`profile-svg-to-png.mjs` 的 5 行 `--write` 写完复验（r9 §5.4.1 末句那条加固），
  本道**原样保留**（见 §2 判定）。

三档产物在本道动手前的现场（未重建，就是 r9 终态）：

```
mp-weixin          MODE:"mp-weixin-mock" MODE:"mock"          sha8=f1c7b96b size=2402 mtime=2026-09-30 00:28:02
mp-weixin-real     MODE:"real" MODE:"real"                     sha8=f0677920 size=2392 mtime=2026-09-30 00:29:10
mp-weixin-showcase MODE:"mp-weixin-showcase" MODE:"real" MODE:"true" sha8=ed1cd82c size=2441 mtime=00:30:54
$ git status --short apps/client/src | wc -l
0
```

三个 sha 与 r9 §8 自报的一致 ⇒ r9 的终量读数与磁盘对得上，不是凭空写的。

## 1. 死道自己发现的两个 bug（本道首要目标）

- **BUG-2「seed function lied」= 已修，且本道独立复测复现了修复后的正确字节**（见 §4 的沙箱复测）。
  现状 `prepare-static.mjs:188-191` 是 `writeFileSync(to, bytes)` + 写完 `readFileSync(to).equals(bytes)`
  复验、不一致直接抛，不再走 `cpSingle`；注释 `:182-186` 将原因留在原地。
- **BUG-1「`cpSingle` swallowed a Windows false-error」= 仍然原样存在**，
  `apps/client/scripts/prepare-static.mjs:104-114` 的「抛错但 `existsSync(dst)` 就当写成功」启发式一个字没改。
  r9 的处置是**绕开**它（新的 seeding 不用它），不是**修**它。它今天仍有 2 个调用点在往
  `atomicPromote` 提升的 stage 里写文件：`:124`（tabbar）、`:262`（`--real` 的字面量引用扫描 copy）。
  ⇒ 本道要判的是：这两个调用点是否构成"会弄脏被跟踪 src 的活风险"（判定见 §2 的 `--real` 面）。

### 1.1 一个 r9 没说、但比它说的更要紧的量（影响"修到什么程度"的判断）

`git ls-files apps/client/src/static | wc -l` = **1344**，磁盘 `find … -type f` = 1345。
即"被跟踪的 src 是构建的写盘目标"这件事的范围**不是 48 张 profile PNG，而是 1344 个跟踪路径** ——
`.gitignore:78` 是 `!apps/client/src/static/**/*.png` 这种整棵放行，r9 §5.1 里写成"靠白名单穿透"时
只量了 profile 那一小块。`prepare-static --dev` 的 `sysCpContents(full-static → stage)` 仍在把
**整棵未跟踪备份**盖成这 1344 个跟踪文件的来源。今天没脏（§3 基线量到 0 行）是因为
备份字节恰好 == 入库字节，而不是因为结构上盖不动 —— r9 的权威顺序只加固了 `assets/profile/png/**` 这 48 个。
这条**超出裁定授权范围**（裁定只要求把 SVG→PNG 产物请出跟踪 src），本道登记不动，见 §9。

### 1.2 BUG-1 的现场复现（本道自己量的，不是继承 r9 的读数）

仪器：把**生产文件 `prepare-static.mjs` 的 `cpSingle()` 函数体逐字节原样**抽进沙箱 harness
（`.zcode/tmp/r12/ps-harness.mjs`，`cpSingle_verbatim=true`，只把文件末尾的模式分派换成探针，
helper 本体一个字节没改），用 `chmod 444` 把**已存在且字节陈旧**的目标做成只读，
逼出与代码注释描述同形的那条 Windows 假错。

```
$ node -e "cpSync(src.png, dst.png, {force:true})"      # dst 预存且只读
CPCALL=THREW code= msg=, ²Ù×÷³É¹¦Íê³É¡£ '\\?\D:\6\恋爱小程序\.zcode\tmp\r12\probe\dst.pn
DST_SIZE=10 DST_SHA16=42424242424242424242  EXISTS=true
```
（那句乱码是 GBK 的「操作成功完成」—— **正是 `:38-39` 与 `:102-103` 注释记录的同一族假错**，
本机可用只读目标确定性地复现，不需要等微信 IDE 正好占用文件。）

跑生产 helper：

```
=== NEG（dst 预存陈旧字节 4242…，权威字节 4141…）===
[prepare-static] warn: cpSync .zcode\tmp\r12\neg\src.png 假错（目标已写入，继续）
PROBE_RESULT=RETURNED dst_size=10 dst_sha16=42424242424242424242 authority_sha16=41414141414141414141
NEG_EXIT=0
=== POS（dst 字节本来 == 源）===
[prepare-static] warn: cpSync .zcode\tmp\r12\pos\src.png 假错（目标已写入，继续）
PROBE_RESULT=RETURNED dst_size=10 dst_sha16=41414141414141414141 authority_sha16=41414141414141414141
POS_EXIT=0
```

⇒ **BUG-1 判定：仍在，且能谎报。** NEG 那行是铁证：目标里留的是陈旧 `4242…`，
helper 却打「目标已写入，继续」并以 `exit=0` 返回。r9 §5.4.1 描述的形状在本机可复现，不是历史偶然。

**但要说清它今天的可达性（这一点 r9 没量）**：现有两个调用点 `:124`（tabbar）与 `:262`（`--real` 引用扫描）
写的都是 `mkdirSync(stage)` 新建的 `static_prepare_<pid>_<ts>` 目录，
⇒ 目标**不可能预存** ⇒ 「目标存在=写成功」在这两处今天是成立的。
即 **BUG-1 在生产链路上目前是潜伏的（latent），不是活的**；r9 绕开它的 seeding 处置对本裁定是够的。
本道仍然补修它，理由是：这条启发式的正确性完全依赖"调用点恰好从不覆盖"这个不成文的前提，
而 `--real` 面（`:262`）写的正是要被 `atomicPromote` 提升成 `src/static` 那 1344 个跟踪路径之一的文件，
前提一旦被人不知情地打破，症状就是本裁定要根治的那个"构建带着错字节假装成功"。
补修只动 `catch` 分支，正常路径的字节与"假错容错"语义都不变（POS 那条必须照旧放行，见 §4）。

## 2. 处置判定：保留 / 重写 / 回退（kept / rewritten / reverted）

判据是"裁定要的两件事（产物移出跟踪 src、输出确定）是否成立"，不是"改了几个文件"。

### 2.1 保留（kept，且本道独立复核过，不是引用 r9 的自述）

1. **`profile-svg-to-png.mjs` 的落点搬迁成立**。`OUT_PNG_ROOT = CLIENT/static-generated/assets/profile/png`
   （`:38`），`TRACKED_PNG_ROOT` 只在 `:101-105` 被 `existsSync`/`readFileSync` 读、
   写它的路径唯一入口是 `:107` 的 `if (WRITE && !CHECK_ONLY)` ⇒ **默认构建形态对跟踪 src 是纯只读**，
   漂移从"静默改写"变成 `:130-133` 的 `MISMATCH` + `exitCode=1`。裁定第 1 条达成。
2. **`.gitignore:157` 必要且有效**（check-ignore 读数在 §0），未跟踪目录已实存 48 张。
3. **`seedProfilePngFromAuthority()` 的权威顺序成立且路径不是死路径**。
   本道专门核了一个 r9 没写的隐患：authority #2 写的是 `join(STAGE_ROOT, "static-generated", REL_DIR)`，
   而 `STAGE_ROOT = resolve(__dirname, "..")`（`:40`）= `apps/client`，
   ⇒ 解析到 `apps/client/static-generated/assets/profile/png`，`ls -d` 实存 ⇒ **不是指向不存在目录的假权威**。
   （若它当初写成 stage 内相对路径，这条权威会永远 miss、退化成"备份说了算"，即 BUG 未修。）
4. **未提交的那 5 行 `--write` 写完复验保留** —— 它就是 BUG-2 那类"不复验就谎报成功"的同类加固，
   与 r9 §5.4.1 末句自述一致，代码在盘上，不是空话。

### 2.2 重写 / 补完（本道动手的部分）

- **BUG-1 的 `cpSingle` 假错启发式本道补修**：`:104-114` 的"抛错但目标存在就算写成功"
  对**覆盖已有文件**不成立（r9 §5.4.1 正是被这条骗出假成功的）。r9 只让新的 seeding 绕开它，
  helper 本身仍带着 2 个调用点（`:124` tabbar、`:262` `--real` 引用扫描）在往会被
  `atomicPromote` 提升成 `src/static` 的 stage 里写。本道把假错分支从 `existsSync(dst)`
  改成**字节相等复验**：真的假错（文件已写）照旧放行，谎报（字节不对）直接抛给既有回滚路径。
  这条是裁定精神内的（"构建不得带着错字节假装成功"），且只动错误分支，不改正常路径的字节。
  双向证明（正例=假错仍放行；负例=谎报判红）见 §4。

### 2.3 回退（reverted）

- **无**。r9 的三处改动没有一处本道判为"要退回去"：落点搬迁是裁定本身，
  seeding 权威顺序是搬迁的必要配套（否则备份陈旧字节会盖进来且**再也无法自愈**，比修之前更糟），
  `.gitignore` 那条是落点引入的副作用的必要封堵。

### 2.4 确定性：裁定给的两个出口，实际落在哪一个

r9 §3 用三层对比（chunk 清单 / 解码逐像素 / 对历史 blob 哈希）把"编码器不确定"这个归因推翻了，
本道复核其结论成立并另出独立读数（§6）。⇒ **裁定第 2 条"让输出确定"在这里是靠"src 不再被写"达成的，
属于裁定预设的第二个出口**（"if src is simply no longer written, show that no tracked path is touched at all"），
不是靠改编码参数达成的。这个区别要说清：**本道没有把编码器变确定，编码器在本机本来就确定**；
换了 libvips 版本的机器上它会漂，但那时的行为是 `MISMATCH` 判红而非弄脏工作树（§6 负例）。

## 3. 基线构建（动手之前先量）

本道**第一件事**就是跑基线，跑的是 sanctioned 入口 + 载具 `scripts/qa/run-npm-script.mjs`
（它除了退出码还要求 `mp-build` 成功标记，所以"exit=0 但没建成"这类会被它判 FAIL）。
基线跑在 r9 的既有改动之上、本道一个字未改之时：

```
$ node scripts/qa/run-npm-script.mjs --cwd apps/client --script build:mp-weixin:mock
BASELINE_MOCK_EXIT=0
NPMSCRIPT cwd=D:\6\恋爱小程序\apps\client script=build:mp-weixin:mock exit=0 标记=1 输出字节=32997 判据=命中 1/2 个「mp-build」标记
  | DONE  Build complete.
NPMSCRIPT_RESULT=OK（命中 1/2 个「mp-build」标记）
BASELINE_SRC_DIRTY_LINES=0
$ cat .zcode/tmp/r12/baseline-src-dirty.txt        # 空文件
$ grep -o 'MODE:[^,}]*' apps/client/dist/build/mp-weixin/config/env.js
MODE:"mp-weixin-mock"
MODE:"mock"
```

⇒ **继承状态是好的**：mock 基线 exit=0、标记命中、构建后 `git status --short apps/client/src` = 0 行。
本道之后任何一次非零退出或脏项都是本道弄的，不能推给 r9。

同时记下 `src` 脏项的**度量面**（r9 没量这个，只量了 profile 那 48 张）：

```
$ git ls-files apps/client/src/static | wc -l   →  1344（跟踪）
$ find apps/client/src/static -type f | wc -l    →  1345（磁盘）
```
即"构建后 src 干净"这句话今天确实覆盖 1344 个跟踪路径（读数 0 行），
但**结构上**只有 `assets/profile/png/**` 那 48 个受权威顺序保护，其余 1296 个仍以
未跟踪备份为来源（§1.1）。

## 4. 补完 / 修正（本道动手的部分，双向都有证明）

### 4.1 BUG-1：`cpSingle` 吞假错 —— 从"目标存在"改成"字节复验"

改动只在 `catch` 分支（`apps/client/scripts/prepare-static.mjs:101-124`）：
假错发生时先 `existsSync(dst) && readFileSync(dst).equals(readFileSync(src))`，
不等就抛给既有回滚路径。探针 harness 是**生产文件本体的逐字节副本**（只把末尾模式分派换成调用 `cpSingle`），
同一对夹具在改前/改后各跑一次：

```
改前（生产字节）  NEG: warn「假错（目标已写入，继续）」→ RETURNED dst_sha16=42424242424242424242
                     authority_sha16=41414141414141414141  NEG_EXIT=0     ← 谎报成功，陈旧字节留在原处
             POS: warn 同上 → RETURNED dst_sha16=4141…（本来就对）        POS_EXIT=0

改后（本道）      NEG: PROBE_RESULT=THREW msg=cpSync … 失败且目标字  NEG_EXIT=1  ← 谎报被判红
             POS: warn「假错（已复验目标字节==源，继续）」→ RETURNED   POS_EXIT=0  ← 容错语义保住
```

⇒ 承重方向两个都成立：**谎报判红**（NEG 由 exit=0 变 exit=1），**真·假错照旧放行**（POS 仍 exit=0）。
`node --check apps/client/scripts/prepare-static.mjs` ⇒ `SYNTAX_CHECK_EXIT=0`。

### 4.2 BUG-2：seeding 谎报 —— 本道用 3 个沙箱独立复测，不是引用 r9 的读数

夹具：生产 `prepare-static.mjs` 副本 + 真·陈旧证人 `.zcode/tmp/profile-hero.build-output.png`
（28622B / `25fb835b9d091b4a`，r9 留下的那份，本道原样使用）+ 正确字节 28638 / `1f4230626c084860`。

| 沙箱 | src(跟踪) | static-generated | backup | 期望 | 实测 |
|---|---|---|---|---|---|
| A | 缺该 PNG | 28638 | 陈旧 28622 | 由 generated 补对 | `SBX_A_EXIT=0`，`dst=28638 1f4230626c084860`，日志「换成权威来源 1 个」 |
| B | 28638 | 缺 | 陈旧 28622 | 跟踪字节保住，备份盖不动 | `SBX_B_EXIT=0`，`dst=28638 1f4230626c084860` |
| C | 缺 | 缺 | 陈旧 28622 | 兜底用备份（本道如实记为局限） | `SBX_C_EXIT=0`，`dst=28622 25fb835b9d091b4a` |

⇒ **BUG-2 判定：已修且诚实**——A/B 两句「换成权威来源 1 个」都被磁盘字节证实（改前 r9 量到的是
"日志报 1 个、盘上仍是 28622"）。A 还顺带证了 §2.1(3) 那条：`static-generated` 权威路径不是死路径。
C 是**诚实局限**：当 src 与 generated 都缺位时，构建只能退回陈旧备份——
这条不是本道引入的（`--real`/裁剪 + 新克隆才会遇到），登记在 §9 供后续车道。

4.1 修完之后 A/B 复跑一遍照旧绿（`SBX_A_EXIT=0 / SBX_B_EXIT=0`，`dst=28638 1f4230626c084860`），
即 helper 的改动没有破坏 seeding 的权威顺序。

## 5. 三档重建 mock → real:isolated → showcase:isolated（逐步退出码 + 每档 MODE 原文）

顺序按裁定；每步单独取码（驱动 `.zcode/tmp/r12/bands.sh`，每步 `echo STEPn_EXIT=$?` 紧跟命令，
不与任何管道共用 `$?`）。**本道一共完整构建了 4 次**（基线 mock 1 次 + 三档 3 次），
每次之后立刻量 `git status --short apps/client/src`：

| 步 | sanctioned 入口 | 退出码 | 成功标记 | `git status --short apps/client/src` |
|---|---|---|---|---|
| 0 基线（改动前） | `build:mp-weixin:mock` | `BASELINE_MOCK_EXIT=0` | `标记=1 输出字节=32997` | **0 行** |
| 1 | `build:mp-weixin:mock` | `STEP1_EXIT=0` | `exit=0 标记=1` | `STEP1_SRC_DIRTY_LINES=0` |
| 2 | `build:mp-weixin:real:isolated` | `STEP2_EXIT=0` | `exit=0 标记=1` | `STEP2_SRC_DIRTY_LINES=0` |
| 3 | `build:mp-weixin:showcase:isolated` | `STEP3_EXIT=0` | `exit=0 标记=1` | `STEP3_SRC_DIRTY_LINES=0` |

⇒ "构建两次仍为空"这条是**四次**为空（含改动前的基线）；表里的 `SRC_DIRTY_BODY<<< >>>` 之间都是空的
（不是没打印，是真 0 行——同一条命令对本道改过的 `apps/client/scripts` 能报出 2 行，见 §8 仪器自证）。

最终态（三档全跑完）每档 `config/env.js` 的 `MODE:` grep 原文：

```
STEP3_MODE_mp-weixin         = MODE:"mp-weixin-mock" MODE:"mock"
STEP3_MODE_mp-weixin-real    = MODE:"real" MODE:"real"
STEP3_MODE_mp-weixin-showcase= MODE:"mp-weixin-showcase" MODE:"real" MODE:"true"
```

逐步增量（每步之后立刻复量三个目录）：

```
STEP1_MODE_mp-weixin=MODE:"mp-weixin-mock" MODE:"mock"            ← mock 步之后
STEP2_MODE_mp-weixin=MODE:"mp-weixin-mock" MODE:"mock"            ← real 步之后共享目录未被毒
STEP2_MODE_mp-weixin-real=MODE:"real" MODE:"real"                 ← real 步报自己那一档
STEP3_MODE_mp-weixin=MODE:"mp-weixin-mock" MODE:"mock"            ← showcase 步之后共享目录仍报 mock
```

**中毒闸：没有重新引入。** showcase 跑完后共享目录 `dist/build/mp-weixin/config/env.js`
仍是 `MODE:"mp-weixin-mock"` / `MODE:"mock"`，三个目录各报自己那一档。
两个隔离载具自己的自证原文（取自各自 npm 全量日志）：

```
[g7] 产物自证 MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api
[g7] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real sharedOutUntouched=yes
G7_RESULT=PASS

[showcase] 产物自证 MODE=mp-weixin-showcase VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api VITE_SHOWCASE_MODE=true
[showcase] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-showcase sharedOutUntouched=yes
SHOWCASE_RESULT=PASS
```

三档链内本次处置的关键两行（mock 步与 showcase 步各打一次；`real:isolated` 的 `preSteps` 为空故不打，
这正好解释了为什么 real 步不产生任何 src 写盘）：

```
[prepare-static] profile PNG 权威对齐：换成权威来源 0 个 / 字节相同跳过 48 个 / 共 48 个（顺序 src(跟踪字节) > static-generated(构建现算) > backup(本机备份)）
SVGPNG_RESULT=PASS mode=generate encoded=48 out=D:\6\恋爱小程序\apps\client\static-generated\assets\profile\png written=0 unchanged=48 tracked_checked=48 mismatch=0 tracked_refreshed=0
```
⇒ 「换成权威来源 **0** 个」= 备份一个跟踪 PNG 都没盖动；`out=` 明确落在被跟踪 src 之外。
四轮 npm 全量日志里 `Invalid argument` 命中 **0** 次，`假错` 命中 **0** 次
（本道的 `cpSingle` 加固没被真实触发过——它只在 Windows 假错发生时才生效，见 §4.1 的沙箱双向证明）。

## 6. 确定性证明（量测，不是声明）

三种量法，从弱到强都做了（node 22）：

**(a) 原地连跑两遍**——`written=0 unchanged=48` 本身就是"本次现算字节 == 上一遍落盘字节"的断言
（`writeIfChanged` 是读旧文件与新算 `png` 比字节），两遍之后对整棵生成目录做树哈希（相对路径 + 内容）：

```
SVGPNG_RESULT=PASS mode=generate encoded=48 out=D:\6\恋爱小程序\apps\client\static-generated\assets\profile\png written=0 unchanged=48 tracked_checked=48 mismatch=0 tracked_refreshed=0
GEN1_EXIT=0   TREEHASH=3a9756703cc99af7
SVGPNG_RESULT=PASS … written=0 unchanged=48 tracked_checked=48 mismatch=0 tracked_refreshed=0
GEN2_EXIT=0   TREEHASH=3a9756703cc99af7
```

**(b) 从零重算两遍**——把生成目录整个 `mv` 走（留 rollback，绝不 `rm -rf`）让它写满 48 张，
再清空文件让它再写满 48 张：

```
MV_EXIT=0                       REGEN_RUN1_EXIT=0  written=48 unchanged=0  REGEN1_TREEHASH=3a9756703cc99af7 n=48
REGEN_RUN2_EXIT=0               written=48 unchanged=0  REGEN2_TREEHASH=3a9756703cc99af7
diff -rq 新生成目录  vs  改动前那份  →  DIFF_REGEN_VS_PRIOR_EXIT=0（逐字节相同）
```
⇒ 同机、同 sharp/libvips 下 48 张**逐字节可重放**；且"重放出来的树"与"本道接手时那棵树"也一致。
（树哈希值与本道 §5 用的是同一配方；r9 §5.3 报的 `8a1e13bd70115786` 是**另一种配方**
（它按"相对路径+内容"但目录遍历排序/拼接方式不同），两个数不可直接比，本道不据此说 r9 造假，见 §10。）

**(c) 最关键的那条：没有任何被跟踪路径被触碰**

```
$ git status --short apps/client/src | wc -l
0
$ git diff --name-only HEAD -- apps/client/src/static | wc -l
0
```
生成物落在 `out=D:\6\恋爱小程序\apps\client\static-generated\assets\profile\png`（被跟踪的 src 之外）。
⇒ 裁定第 2 条走的是"**src 根本不再被写**"这个出口：确定性不再需要靠编码器参数保证；
换 libvips 版本时它变成 §6 之外的 `MISMATCH` 判红，而不是工作树脏（负例读数见 §4 与 r9 §5.3 同形）。

## 7. 运行期解析证明（以构建产物为证）

仪器 `.zcode/tmp/r12/resolve-check.mjs`：**从两个注册表的模板字面量里抽出每一个会被拼出的路径**，
按 `EXT=png`（`IS_MP_WEIXIN` 为真）落到各档 `dist/build/<档>/static/` 下逐个查存在，并与生成目录比字节。
自带正对照（额外手写一条已知应当存在的路径），防"仪器永远报缺"这种假绿/假红。

```
BAND=mp-weixin          referenced=20 present_in_bundle=20 byte_match_gen=20 byte_diff=0 MISSING=0 gen_absent=0
BAND=mp-weixin-real     referenced=20 present_in_bundle=20 byte_match_gen=20 byte_diff=0 MISSING=0 gen_absent=0
BAND=mp-weixin-showcase referenced=20 present_in_bundle=20 byte_match_gen=20 byte_diff=0 MISSING=0 gen_absent=0
BUNDLE_PNG_COUNT mp-weixin=48 (生成目录有 48 张)
BUNDLE_PNG_COUNT mp-weixin-real=48 (生成目录有 48 张)
BUNDLE_PNG_COUNT mp-weixin-showcase=48 (生成目录有 48 张)
```
⇒ **三档都带着图、且每张字节与 `static-generated` 一致，`MISSING_FROM_BUNDLE` 0 次**：
没有出现"静默缺图"这种比脏树更糟的 bug。（第一次跑这台仪器时它是全红 `MISSING=19`，
原因是本道自己的路径拼接写错了——已修并加正对照，读数如上；记在这里免得后人以为天生是绿的。）

**诚实的一半（r9 §6.2 的自述本道复核为真）**：

```
$ grep -rn "profile-assets\|profile-svg\|PROFILE_ASSET\|profileSvg\|profileAsset" apps/client/src --include=*.ts --include=*.vue --include=*.js
  → 只命中这两个注册表自身的定义行与一句注释，importer 0 个
$ grep -rl --include=*.js "assets/profile/png/profile-hero" apps/client/dist/build/<三档> | wc -l
  → 0 / 0 / 0
```
⇒ 今天**没有任何运行时引用**指向这批图，所以"改构建会不会让某张正在显示的图消失"
在当前代码形态下不成立。本道给的因此是**路径级**证明（若被引用，三档包里的确在那个路径上有正确字节），
不是"某页面正在显示它"。这条既有事实非本道引入，登记给产品侧（同 r9 §9.2-2）。

## 8. `verify-band-freshness` 原文

**仪器自证**（先证明它不是永远报绿）：同一条 `git status --short` 对本道改过的目录能报出脏——

```
$ git status --short apps/client/scripts
 M apps/client/scripts/prepare-static.mjs
 M apps/client/scripts/profile-svg-to-png.mjs
$ git status --short apps/client/src            # 同一命令，目标目录
（空）
```

`"$N" scripts/qa/verify-band-freshness.mjs` 在**三档全部重建完成之后**跑，`FRESH_EXIT=0`，原文：

```
FRESH srcFiles=753 git脏项(0行报出/0条解析) srcDirtyFiles=0 档位=3 标记=4
  mock      产物文件=2154 最新产物=2026-09-29T17:04:35.862Z 源码脏项最新=null 脏项晚于产物=0 构建写回(仅mtime)=8
  real      产物文件=2153 最新产物=2026-09-29T17:07:22.226Z 源码脏项最新=null 脏项晚于产物=0 构建写回(仅mtime)=8
  showcase  产物文件=2154 最新产物=2026-09-29T17:13:50.555Z 源码脏项最新=null 脏项晚于产物=0 构建写回(仅mtime)=0
  标记 isAllowedMediaExt          mock=3 real=3 showcase=3
  标记 parsePrivateQuoteContext   mock=2 real=2 showcase=2
  标记 pinnedNotice               mock=2 real=2 showcase=2
  标记 --hot-badge-bg             mock=1 real=1 showcase=1
FRESH_内容级 嫌疑(按mtime)=0 真过期=0 仅mtime已洗清=0 无法定罪=0 不可观测=0 跳过(测试文件不进产物)=0 跳过(该档已定罪)=0
FRESH_RESULT=PASS bands=3 markers=4 —— 每档产物都不晚于任何未提交改动，且符号级深检全部命中
```

三档的 `最新产物` 17:04 / 17:07 / 17:14 就是 §5 那三步的构建时刻（顺序本身可核），
`git脏项(0行/0条)` + `脏项晚于产物=0` + `真过期=0` ⇒ **没有"src 比产物新"的漏构建**，无需解释掉任何东西。
（`构建写回(仅mtime)=8` 与 r9 的读数同形：那是 `atomicPromote` 整棵换目录带来的 **mtime** 抖动，
内容级深检已把它洗清；本道没有声称消除了它，那是另一条授权外的事。）

## 9. 没动的东西（not changed）

- **编码参数一个字节没动**：`density:192` / `resize({width:750,withoutEnlargement:false})` / `.png()` 默认，
  图像内容零改动（本道产出的 48 张与接手前那棵目录 `diff -rq` 完全相同，见 §6(b)）。
- **48 个被跟踪的 `src/static/assets/profile/png/**` 与 48 个 SVG 源**：本道一次都没写
  （`--write` 从未运行；`git diff --name-only HEAD -- apps/client/src/static` = 0 行）。
- **`prepare-static.mjs` 除 `cpSingle()` 的 catch 分支外零改动**：`restore()`/`strip()` 的流程、
  `atomicPromote` 的 mv/回滚、`sysCpContents` 的 `cp -a`、引用扫描正则、`seedProfilePngFromAuthority`
  的权威顺序与返回结构全部照旧。本道没往生产码里加测试钩子、没导出内部函数、没改 `mode` 分派。
- **`apps/client/package.json` / 根 `package.json`**：0 改动。三档入口仍用 sanctioned 的
  `build:mp-weixin:mock` → `build:mp-weixin:real:isolated` → `build:mp-weixin:showcase:isolated`，
  没有"构建完再手工拷目录"。
- **`build-real-isolated.mjs`**：0 改动（只在只读前提下 grep 了 BANDS/preSteps）。
- **`scripts/qa/**`**：0 改动（只**运行**了 `run-npm-script.mjs` 与 `verify-band-freshness.mjs`）。
- **`.zcode/workflows/**`、`reports/screenshots/**`、`reports/audit/**` 的 ledger JSON**：未触碰
  （那 3848 条用户选择的删除原样留在工作树，本道**没有**做任何 `git checkout -- .` / `restore .` /
  `reset --hard` / `git clean`，全程只有逐路径操作）。
- **`apps/client/dist/build/**`**：只由 sanctioned 构建脚本写入，本道没有手改一个字节。
  三档在本道动手前的 `config/env.js` 读数已在 §0 留档（`f1c7b96b / f0677920 / ed1cd82c`）。
- **没有 `rm -rf` 过任何可能被持有的目录**：唯一一次整目录搬移是把自己的产物
  `apps/client/static-generated` → `static-generated.r12-rollback`（`MV_EXIT=0`，留了回滚路径），
  重建后 `diff -rq` 判等（exit 0）才删这份**本道自造的**回滚副本。
- **没有 DevTools、没有 UI 租约、没有跑任何自动化会话。**

## 10. 对 r9 自报的更正

先说结论：**r9 的自我申报没有虚报**——本道把它的关键读数全部重跑了一遍，包括它自己承认的返工
（§5.4.1 第一轮 seeding 谎报）。逐条独立复核：

| r9 的自述 | 本道独立复核 | 判定 |
|---|---|---|
| §9.3「prepare-static 与 .gitignore 已被 491210dd 带走，profile-svg-to-png 还剩 5 行未提交」 | `git show --stat 491210dd`、`git status --short` | **成立**（任务书"三个文件都还没提交"的前提与此不符，见 §0） |
| §3.3「gen==HEAD 48/48，编码器不是逐字节不确定」 | 本道 `tracked_checked=48 mismatch=0` + `git src` 干净 ⇒ 现算 == src == HEAD；另 §6(b) 从零重算两遍树哈希相同 | **成立**，裁定的"确定性"要求因此走"src 不再被写"这个出口 |
| §5.4「SBX_A/SBX_B 都落在 28638」 | 本道自建 3 个沙箱（含 C）跑出 `SBX_A/B_dst=28638 1f4230626c084860` | **成立**（且本道补了 r9 没测的场景 C：src 与 generated 同时缺位时会退回陈旧备份） |
| §5.4.1「cpSingle 的假错启发式对覆盖已有文件不成立」 | 本道用只读目标在**本机确定性复现**该假错并量到谎报（§1.2） | **成立，且比 r9 写得更硬**：不需要"IDE 正好占用"这个运气条件 |
| §5.1(3)/§8「`.gitignore:157` 挡住了 `static-generated`」 | `git check-ignore -v` 指到 `157:apps/client/static-generated/` | **成立** |
| §8「`git status --short apps/client/src` = 0 行」 | §3 基线 + §5 三档重建后各量一次 | **成立** |
| §2/§5.1 的行文给人的范围印象：被跟踪的构建写盘目标 ≈ profile 那 48 张 | 实测 `git ls-files apps/client/src/static` = **1344** | **需更正/补测**：脏项面是 1344 个跟踪路径，权威顺序只护住其中 48 个（§1.1）。r9 没有说错它量过的那部分，但它没量其余 1296 个的来源仍是未跟踪备份这件事 |
| §5.3 树哈希 `8a1e13bd70115786` | 本道配方不同，得 `3a9756703cc99af7` | **不构成矛盾**：两个数不可比（遍历/拼接配方不同），本道只声明"同配方跨运行相等"，不据此判 r9 造假 |

**本道唯一的一处生产码增改**（`cpSingle` 的 catch 分支）不推翻 r9 的任何读数：
r9 的 seeding 根本不走 `cpSingle`，所以改完 A/B 沙箱照旧绿（§4.2 末段）。

## 11. 结论

**死道实际完成的东西**（本道复量确认，不是据其自述）：落点搬迁、`--check` 判红、seeding 权威顺序、
`.gitignore` 封堵全部**已落库**（`prepare-static.mjs` + `.gitignore` 由 `491210dd` 带走），
唯一悬着的是生成器 `--write` 的写完复验那 5 行未提交。它中断前那句"Fixing:"实际上**已经修完了**——
§5.4.1 的返工在盘上、注释在位、沙箱读数可复现。

**坏在哪 / 本道补了什么**：`cpSingle` 那条吞假错的启发式**原封不动还在**（r9 只是绕开它，没修它）。
本道用只读目标在本机确定性复现了同族 Windows 假错，量到它"陈旧字节留在原处 + `exit=0` + 日志称已写入"，
然后把 catch 分支改成字节复验；负例判红（`NEG_EXIT=1`）、真·假错容错照旧（`POS_EXIT=0`）双向出证。
另补两处 r9 没量的面：脏项范围是 1344 个跟踪路径而非 48；场景 C（src 与 generated 同时缺位）会退回陈旧备份。

**终态**：4 次完整构建（含改动前基线）后 `git status --short apps/client/src` 恒为 0 行；
生成目录从零重算两遍树哈希相同且与接手前逐字节一致；三档各自报自己那一档、共享目录未被毒；
20 条会被拼出的资源路径在三档包内全部存在且字节与生成物一致（`MISSING=0`）；
`verify-band-freshness` `FRESH_EXIT=0 / FRESH_RESULT=PASS bands=3 markers=4`。

**待编排者提交**：`apps/client/scripts/prepare-static.mjs`（本道 `cpSingle` 加固，+20/-8 行区间）
与 `apps/client/scripts/profile-svg-to-png.mjs`（r9 遗留 5 行复验加固）。本道未提交任何东西。
