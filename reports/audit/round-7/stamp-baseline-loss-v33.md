# 语料戳覆写没有留底 —— 损失登记与补救边界（v33 / lane stampguard）

登记时间：本轮（车道 stampguard）。
触发事件：处理 86 行欠账时改了 20 份 ops manifest 的自动化元数据字段，`verify-ops-corpus-stamp.mjs --check` 报 22 个文件漂移，
随后按工具自己写的 sanctioned 路径跑了 `--selftest` → `--write` → `--check`。
**缺陷**：`--write` 覆写 `reports/audit/round-7/ops-corpus-stamp.json` 时不生成任何备份，旧戳携带的 24 份 manifest 逐文件基线随覆写消失。

> 本文件只登记已核实的事实。凡"推断"都写清依据与前提；基线不许编造——见 §4 的双路验证与 §5 的不可补救边界。

---

## 1. 丢了什么（事实清单）

| 项 | 状态 | 依据 |
| --- | --- | --- |
| 旧戳文件本体 `reports/audit/round-7/ops-corpus-stamp.json`（记于 2026-09-27T11:13:56.918Z，gitSha=e4495d67，canon 前缀 dc3f93f47e56） | **物理文件已被覆写，无 `.bak`** | `scripts/qa/verify-ops-corpus-stamp.mjs:375` 单行 `writeFileSync(out, …)`，无备份/无原子写；`--write` 分支（:360-381）里没有任何 `existsSync(out)` 或复制调用 |
| 旧戳里的 perFile 数组（24 条 file/n/canon/bytes/ids） | 覆写当时丢失；**现已按 §4 找回并验证** | §4 |
| 旧戳的 `at` / `gitSha` 字段 | 未丢（报告里逐字记着） | `reports/audit/round-7/round-7-report.md:298` 等多处 |
| 旧戳的目录级 `canonSha` | 未丢（12 位前缀 dc3f93f47e56 被多处报告记下） | 同上 |
| 旧戳的目录级 `byteSha` | **丢了**：`--check` 从不打印 byteSha，盘上无残留 | 门自己只印 `canon=`（:400） |
| "哪些文件在我动手之前就已经漂移"这个问题的答案 | 覆写当时无法回答；**现已按 §4 恢复并逐文件归因** | §4 |

git 底不存在（不是"没查"）：`git log --oneline --all -- reports/audit/round-7/ops-corpus-stamp.json` 只有一条
`2cd578ae`，也就是**本轮 `--write` 产物自己的首次入库**；旧戳当时是未跟踪文件，因此从未有过 git 版本。

## 2. 还剩的两条旧→新对照（终端残留，非盘上记录）

只有这两条活在了当时的终端输出里，是全仓仅有的"旧→新"配对文本：

- `次要21.json  b49b2deea2 → 98865e9865`
- `次要22.json  f71560feeb → 780d7b71af`

盘上核查（本车道 grep 全仓 `[0-9a-f]{10}→[0-9a-f]{10}`）：没有任何别的 `DRIFT` 行被报告或日志收下；
唯一命中的两处是 round-1 的无关数字（`reports/audit/round-1/interact/PAGES-HOME-INDEX-judge.json:487`、
`reports/audit/round-1/issue-matrix.md:1605`）。也就是说这两条终端残留**没被任何文件复制过**，一旦终端关掉就只剩本文件。
§4 的验证顺带把它们升级为"已对上了重建基线"的证据。

> 补充（§6.4 实测后）：这两条曾是**全部**残留；现在 22 条旧→新已可从 v2 基线整表复现，
> 所以"只剩两条"描述的是丢失时刻的状态，不再是现状。现状见 §6.4 的 22 行原文。

## 3. "另 6 份先于本轮漂移"的出处（逐字段抄录）

来源：上一条车道报告 `.zcode/tmp/lane-ops/result.json`（**未被 git 跟踪**，`git status` 里属 `.zcode/` 忽略区，随时可被清掉）。
JSON 路径：`$.cellplan.gatesFinal.4`。

- `.name`：
  `verify-ops-corpus-stamp.mjs --check（额外，非任务要求的三条门）`
- `.readout`（原文照抄）：
  > STAMP_RESULT=FAIL 漂移文件=10 —— 归因清楚：戳记于 2026-09-27T11:13:56Z@e4495d67，当前 HEAD=891fed79；10 个漂移文件里只有 4 个是本车道改的（SUBPACKAGES-CAMPUS-CAMPUS-HUB / 次要18 / 次要19 / 次要21，git 工作区状态为 M），另外 6 个（PAGES-LOGIN-INDEX / PAGES-PROFILE-INDEX / SUBPACKAGES-CHAT-CHAT-SESSION-INDEX / SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH / 次要20 / 次要22）工作区与 HEAD 一致 ⇒ 它们在我动手之前就与戳不符（上一批收口波落盘后没重打戳）。本车道没有 --write 重打戳：那是 #69/收口队列的步骤，不在授权范围内。
- 同文件相关上下文 `.actionNeeded`：
  > 重打语料戳（verify-ops-corpus-stamp --write）→ 重建三档产物 → 按改动页定向复测；否则这 10 行新 tapTarget 领先于产物快照一个改动集。

另有一处独立旁证，同一个旧戳 `dc3f93f47e56` 在不同时刻的读数（说明旧戳确实被反复 `--check` 过、Aggregate canon 一直可查）：
`reports/audit/round-7/round-7-report.md:298`（canon=4c37cb2e56c2 戳记=dc3f93f47e56 漂移文件=9）、
`.zcode/tmp/lane-panelword/probe-panel/report-side-l2.md:292`（canon=d93579f76400 戳记=dc3f93f47e56 漂移文件=10）、
`.zcode/tmp/lane-ops/result.json:89`。

## 4. 补救：旧基线已经找回来（不是"复原一份看起来像的"）

本节两条路径互相独立，且都对上了 §3 的旧戳 canon 前缀 `dc3f93f47e56`。

### 4.1 路径 A：仓里本来就有同一内容的兄弟戳文件

`reports/audit/round-7/ops-corpus-stamp-v2.json`（未跟踪，`git status` 显示 `??`，盘上仍在）：

```
at=2026-09-27T11:50:21.790Z  gitSha=e4495d67  canonSha=dc3f93f47e56…  files=24  cases=1107  perFile=24
```

- 它自己的 perFile 重算聚合 == 它自己的 canonSha（自洽，canon 与 bytes 两根轴都验过）。
- 它的 canonSha 前缀 == 报告里记录的**被覆写那一份**的 `戳记=dc3f93f47e56`。
- 两份戳写于同一天相隔 36 分钟、同一 gitSha=e4495d67、canon 聚合完全相同 ⇒ 二者所载**判据内容基线同版**。

### 4.2 路径 B：从 git 树重算，并与路径 A 逐文件对上

被覆写戳的 canon 聚合等于提交 `34b6fb3d`（2026-09-27T19:56:45+08:00，"收口波第 3-8 步落盘"）的 `reports/audit/round-6/ops/` 树：

```
f9a60925 → 4613e48afc46     283b6d4f → 0d0e0167d452     e4495d67 → 9ce8f05b98f4
34b6fb3d → dc3f93f47e56  <== 与被覆写戳的 戳记 前缀相符
4bf00a76 → 4c37cb2e56c2  <== 与"漂移文件=9"那次读数相符
72600e18 → d93579f76400  <== 与 lane-ops 那次"漂移文件=10"读数相符
2cd578ae → 46812907c1b8  <== 与本轮 --write 后的现戳相符
```

按本工具的 `stableStringify`+sha256 逐文件重建 `34b6fb3d` 树的 24 条 canon，与路径 A 比对：
**canon 相符 24/24、bytes 相符 24/24、n 相符 24/24**（bytes 用 git blob 原始字节直接 sha256，不做字符串再编码）。

### 4.3 于是这条基线可用于什么

- 逐文件旧→新对照全部可复原（24 条，不再只有 2 条）。旧基线（`34b6fb3d`／v2）与本轮 `--write` 后的现戳比对：**22 个文件 canon 变了、名册(ids)全部未变** ⇒ 与"终端报 22 个漂移"相符；
- 归因（"先于本轮漂移"的到底是哪几份、谁改的）：**见下表**。

| 分类 | 文件数 | 清单 |
| --- | --- | --- |
| 先于本轮（`--write` 之前，即 0294395d 时点）就与旧基线不符 | 10 | PAGES-LOGIN-INDEX、PAGES-PROFILE-INDEX、SUBPACKAGES-CAMPUS-CAMPUS-HUB、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX、SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH、次要18、次要19、次要20、次要21、次要22 |
| ├ 首次偏离发生在 `4bf00a76`（2026-09-28 身份轴 12 行） | 9 | 上表 10 个里除 SUBPACKAGES-CAMPUS-CAMPUS-HUB 之外的 9 份 |
| └ 首次偏离发生在 `72600e18`（2026-09-29 CH12，lane-ops 自己的提交） | 1 | SUBPACKAGES-CAMPUS-CAMPUS-HUB |
| 本轮 20 份 manifest 改动 | 20 | 见 `git diff --name-only 0294395d 2cd578ae -- reports/audit/round-6/ops/` |
| 两个集合的交集（先漂移、本轮又改） | 8 | PAGES-PROFILE-INDEX、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX、SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH、次要18、次要19、次要20、次要21、次要22 |
| 只在"先漂移"集合（本轮没碰，纯他人改动） | 2 | PAGES-LOGIN-INDEX、SUBPACKAGES-CAMPUS-CAMPUS-HUB |
| 全程未漂移 | 2 | SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC、SUBPACKAGES-VILLAGE-VILLAGE-POST |
| 并集 = 本轮 `--check` 报出的漂移数 | **22** | 与终端读数相符 |

对 lane-ops 那句"10 个漂移里只有 4 个是我改的，另 6 个在我动手前就不符"的核对：**总数 10 相符**；
那 10 份中真正"本轮/本车道都没再碰"的是 2 份（PAGES-LOGIN-INDEX、SUBPACKAGES-CAMPUS-CAMPUS-HUB），
次要18/19/21 属于"先已漂移、随后又被 lane-ops 改"（`4bf00a76` 时点就已不符），lane-ops 把它们记成"我改的"并没有错，
但"另 6 个"这个分组口径不能读成"这 6 个的内容我没动"。

## 5. 不能补救的边界（如实）

**先给结论**：`--check` 实际据以判漂移的那根轴（逐文件 canon，连带 n 与 ids）**已完整补救**——24 条基线全部可复现，
并已用 4 条互相独立的证据对死（v2 自洽、v2 canon 前缀==报告里的旧戳`戳记`、git@34b6fb3d 逐文件重算 24/24 相符、
`--check --stamp v2` 复现出与终端一致的 22 条旧→新）。
所以下面这些是**真补不回来的**，不要对外说成"什么都没丢"，也不要对外说成"基线无法复原"：

1. **旧戳的目录级 `byteSha`（以及任何一份戳的字节轴聚合值）不可复原**：`--check` 从不打印它，盘上/报告里都没有第二个来源。
   能复原的是**逐文件 bytes**（路径 B 从 git blob 原字节算，与路径 A 24/24 相符）；缺的只是"被覆写那一次写入自己记的聚合字节哈希"。
2. **被覆写那一份戳自己的 `at`（11:13:56.918Z）与它当时的 `gitSha`（e4495d67）只能靠报告转录**，不是从戳文件读出来的；
   路径 A 的兄弟文件记的是 11:50:21.790Z 那次写入。两者相差 36 分钟，这 36 分钟内若发生过**纯格式化**改动（canon 不变、bytes 变），
   没有任何现存记录能排除，因此"被覆写戳的 bytes 轴 == v2 的 bytes 轴"这件事**只能推定、不能证明**。canon 轴不受这个限制（48 位前缀已对死）。
3. **戳之外的一切仍然丢失**：本轮 `--write` 覆掉的只是戳，而"戳是谁、在哪条队列腿上被使用"的绑定关系（哪一腿绑哪一版判据）
   并不在戳文件里，戳从来没有自证用途；这部分不是本轮丢的，也不在本次补救范围内。
4. **他人未登记改动的"人"还是查不出来**：§4.3 能定位到**哪一次提交**让某文件首次偏离基线，但提交作者≠改动动因，
   而且 `4bf00a76` 那次是"12 行身份轴"批量落盘，里面混着别的车道改动。要追责仍需逐提交读 diff，本次不做（会越出车道边界）。
5. **不做的事**：本车道没有跑 `--write`（等其它车道一起收尾，再改戳会互相覆盖）；没有改 `reports/audit/round-6/ops/**` 任何 manifest；
   没有把 §4 的重建结果写成新的戳文件——那需要一次 `--write`，属于收口队列的步。重建配方以命令形式记在 §6 供收口时复现。

## 6. 工具侧改动与复现配方

### 6.1 缺陷定位（改动前的原文）

- 落盘那一行：`scripts/qa/verify-ops-corpus-stamp.mjs:375`（改动前的 449 行版）**原文**：

  ```js
    writeFileSync(out, JSON.stringify(rec, null, 1));
  ```

- 有没有备份/原子写：**没有，一样都没有**。`--write` 分支（改动前 :360-381）从 `mkdirSync(dirname(out))` 直接进这一行，
  既没有 `existsSync(out)` 判定、没有复制/改名、也没有"写临时文件再 rename"的原子替换；
  改动前全文里连 `copyFileSync`/`renameSync` 都没被 import（`node:fs` 只取了 read/write/readdir/exists/mkdir/rm/stat）。
  所以"旧戳被裸覆写"不是配置问题，是这条路径上根本没有底。
- 旗标白名单（内容改动前后一字未变；因我在文件头补了 2 行说明，行号从 HEAD 的 :46 移到现版 :48）：
  `const KNOWN_FLAGS = ["write", "check", "copy", "queue", "selftest", "ops", "out", "stamp"];`
  —— 本次新增逻辑不引入新旗标，自测 spawn 自己也只用 `--write/--ops/--out` 三个已白名单旗标。

### 6.2 加了什么（最小防护，别的一律没动）

1. `node:fs` import 追加 `copyFileSync`。
2. 写分支前新增两个小函数（现 :415-435）：`stampTs(d)` 出 `yyyymmdd-hhmmss`；`backupStamp(target)` 在目标存在时复制成
   `<target>.pre-stamp-write.<yyyymmdd-hhmmss>.bak` 并返回路径，目标不存在返回 `null`。
   其中一条附带防护：**同一秒内二次 `--write` 会撞名**，撞了就顺延 `.2/.3`——否则"留了底"会在第二个 `.bak` 上把第一个底覆掉，
   正是本轮丢基线成因的重演（排队器里两条 `--write` 腿落在同一秒是现实形状）。
3. 写分支里在 `writeFileSync` **之前**调用并把路径打出来（现 :451-456）：

   ```js
     const bak = backupStamp(out);
     console.log(`STAMP_BACKUP=${bak ? rel(bak) : "none（首次盖章）"}`);
     writeFileSync(out, JSON.stringify(rec, null, 1));
   ```

   顺序要点：备份先于覆写（事后复制到的是新戳），打印也先于覆写（`writeFileSync` 万一中途抛了，终端仍看得见底在哪）。
4. 自测新增一组断言（`写戳保护=3`，素材仍全在 `os.tmpdir()`，`--out` 指到临时目录，绝不碰仓里的戳）。
   **端到端 spawn 真实 CLI**（`execFileSync(process.execPath, [本文件, "--write", …])`）而不是直接调 `backupStamp`——
   只测 helper 的话，把写分支里那一次调用删掉断言照样绿，这正是本仓反复吃过的"负例永远不变红"。
   三条断言分别是：首次盖章不许产生 `.bak` 且要报 `none（首次盖章）`；覆写必须留下**恰好 1 个**备份且内容**逐字节等于旧戳**
   且现戳已不是旧戳且 `STAMP_BACKUP=` 报的路径就是盘上那个文件；连续三次盖章后两个旧戳底都在（撞名不覆底）。
5. 汇总行加一列：`STAMP_SELFTEST … 写戳保护=${wc} …`（原有 `负例=3 队列口径=9` 口径未动）。

### 6.3 复原这条基线的命令（本车道**没有**执行任何写戳动作，配方留给收口）

```sh
# 逐文件旧基线（被覆写那一份戳所载内容）＝ v2 兄弟戳文件，或与 git 树重算互验
node22 -e '…'   # 见本文件 §4.2 的 canon 链；对 34b6fb3d 的 ops 树按 stableStringify+sha256 重算即可
git show 34b6fb3d:reports/audit/round-6/ops/PAGES-LOGIN-INDEX.json   # 任一份 manifest 的旧内容
node22 scripts/qa/verify-ops-corpus-stamp.mjs --check --stamp reports/audit/round-7/ops-corpus-stamp-v2.json
```

最后一条是**只读**的（本车道跑了，见 §6.4）：拿仓里就在的 v2 兄弟戳当基线跑 `--check`。
**先记一条我自己的错**：写这里时我预判它会得"漂移文件=20"（以为基线只等距于本轮改的 20 份），实测是 **22**——
因为基线还额外背着那 2 份"先于本轮漂移、本轮又没碰"的文件（PAGES-LOGIN-INDEX、SUBPACKAGES-CAMPUS-CAMPUS-HUB）。
预判与读数不一致时以读数为准，这正是本门"宁可红也不空过"的用法。
本车道没有跑 `--write`，也没有把重建结果写成新戳文件。

### 6.4 复原效果实测：`--check` 拿旧基线重跑，22 条旧→新逐条复现

`node22 scripts/qa/verify-ops-corpus-stamp.mjs --check --stamp reports/audit/round-7/ops-corpus-stamp-v2.json`，exit=1：

```
STAMP_OPS=reports/audit/round-6/ops files=24 cases=1107 canon=46812907c1b8 戳记=dc3f93f47e56 记于=2026-09-27T11:50:21.790Z gitSha=e4495d67 当前gitSha=9bab27c2
  DRIFT PAGES-DISCOVER-INDEX.json 判据内容变了：canon 6b3c8d5741→c41cf14443 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-HOME-INDEX.json 判据内容变了：canon 2a533630f1→924c5bd71b 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-LOGIN-INDEX.json 判据内容变了：canon 42fccad9f2→186dc36123 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-MESSAGES-INDEX.json 判据内容变了：canon 76a917d2c3→3d48b05f26 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-NEARBY-INDEX.json 判据内容变了：canon 0c57cb864c→ae87a3bb44 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-PROFILE-INDEX.json 判据内容变了：canon 1c97fa5d0b→57e267178a 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-REGISTER-INDEX.json 判据内容变了：canon 37bfce86db→468d231b6c 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT PAGES-REGISTER-SUCCESS.json 判据内容变了：canon d8b53b4d7a→f825272c67 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-CAMPUS-CAMPUS-HUB.json 判据内容变了：canon 21156c8463→de427444b3 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json 判据内容变了：canon 91c257c602→4ddbd1677d 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json 判据内容变了：canon 33ae338b6f→771d0ab82f 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json 判据内容变了：canon d3429b1ad9→c7c953c96d 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json 判据内容变了：canon 2a88ca1947→0c1344f9f6 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json 判据内容变了：canon 6e05b5b2a4→71bfaa2838 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json 判据内容变了：canon 4bfc57213b→0c4e062a4c 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json 判据内容变了：canon d2727176c0→a31f5b3d1d 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json 判据内容变了：canon cc71aa850f→e5e078e1b1 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT 次要18.json 判据内容变了：canon 432c90430a→5612711b73 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT 次要19.json 判据内容变了：canon 3842b6e87f→f03f77153f 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT 次要20.json 判据内容变了：canon 03f36ba779→1b93a10e05 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT 次要21.json 判据内容变了：canon b49b2deea2→98865e9865 名册未变⇒是正文/字段值被改（改判风险）
  DRIFT 次要22.json 判据内容变了：canon f71560feeb→780d7b71af 名册未变⇒是正文/字段值被改（改判风险）
STAMP_RESULT=FAIL 漂移文件=22（同轮内语料被改过 ⇒ 早跑的腿与晚跑的腿判的不是同一版正文，须重跑或按改动点定向复测）
EXIT_V2CHECK=1
```

要点：
- 条数 = 22，与用户 `--write` 前那次终端读数的"22 个文件漂移"完全对上；
- `次要21.json b49b2deea2→98865e9865`、`次要22.json f71560feeb→780d7b71af` 两条与终端残留**逐字符相同**——
  这是"v2 就是被覆写那一份所载基线"的第 4 条独立证据（前三条见 §4）；
- 22 条全是"名册未变⇒是正文/字段值被改"，没有一条是"用例增删或改名"，与"只加 `automatable`/`notAutomatable*` 元数据字段"的说法在**这一根轴上**不矛盾；
  但要注意 canon 轴把"任何字段值"都算作改判风险，它**不能**证明"判据正文没被动"，只能证明"名册没动"——
  正文级别的证明还得逐字段 diff，那是 §5 第 4 条留给收口的活。


## 7. 复跑读数（原文与退出码）

统一用 `/d/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH 的 `node` 是 v16.13.1，会崩）。

**改动前基线**（把 HEAD 版原文取到 `.zcode/tmp/before-head-copy-v33stampguard.mjs` 跑；
必须放在这个深度，`../..` 才等于仓根——放到 `.zcode/tmp/lane-stampguard/` 里跑会得到一次假红"脚本文件读不到"，那是路径口径造成的，不是门红）：

```
STAMP_SELFTEST_DIR=C:\Users\dsghy\AppData\Local\Temp\qoder-ops-stamp-selftest（仓外临时目录，rmSync 收尾）
STAMP_SELFTEST 负例=3 队列口径=9 表内语料腿=8 表内非语料腿=4 结果=PASS
EXIT_BEFORE=0
```

**改动后**（`scripts/qa/verify-ops-corpus-stamp.mjs --selftest`）：

```
STAMP_SELFTEST_DIR=C:\Users\dsghy\AppData\Local\Temp\qoder-ops-stamp-selftest（仓外临时目录，rmSync 收尾）
STAMP_SELFTEST 负例=3 队列口径=9 写戳保护=3 表内语料腿=8 表内非语料腿=4 结果=PASS
EXIT_AFTER=0
```

**变异检验**（三次都把保护拆坏，逐次确认变红；改回用精确 Edit，未用 git checkout）：

| 破法 | 命令 | 结果 |
| --- | --- | --- |
| ① 摘掉 `backupStamp` 调用（`const bak = null;`） | `node22 scripts/qa/verify-ops-corpus-stamp.mjs --selftest` | 结果=FAIL，exit 1 |
| ② 把备份**挪到覆写之后** | 同上 | 结果=FAIL，exit 1 |
| ③ 备份文件建了但内容不是旧戳（`writeFileSync(bak, "")`） | 同上 | 结果=FAIL，exit 1 |

①原文：

```
STAMP_SELFTEST 负例=3 队列口径=9 写戳保护=3 表内语料腿=8 表内非语料腿=4 结果=FAIL
  BAD 写戳保护：旧戳存在却没有恰好 1 个备份（实得 0 个：无）⇒ --write 又在裸覆写，本轮丢基线走的正是这条路；打印行=STAMP_BACKUP=none（首次盖章）
  BAD 写戳保护：连续两次覆写只留下 0 个备份（应为 2）⇒ 撞名时把上一次的底覆掉了：
EXIT_BROKEN=1
```

②原文（备份复制的是新戳，计数与"首次不许有底"两条同时红）：

```
STAMP_SELFTEST 负例=3 队列口径=9 写戳保护=3 表内语料腿=8 表内非语料腿=4 结果=FAIL
  BAD 写戳保护：首次盖章应报「STAMP_BACKUP=none（首次盖章）」，现=STAMP_BACKUP=C:/Users/dsghy/AppData/Local/Temp/qoder-ops-stamp-selftest/write/stamp.json.pre-stamp-write.20260929-122403.bak
  BAD 写戳保护：旧戳存在却没有恰好 1 个备份（实得 2 个：stamp.json.pre-stamp-write.20260929-122403.bak,stamp.json.pre-stamp-write.20260929-122405.bak）⇒ --write 又在裸覆写，本轮丢基线走的正是这条路；打印行=STAMP_BACKUP=C:/Users/dsghy/AppData/Local/Temp/qoder-ops-stamp-selftest/write/stamp.json.pre-stamp-write.20260929-122405.bak
  BAD 写戳保护：连续两次覆写只留下 3 个备份（应为 2）⇒ 撞名时把上一次的底覆掉了：stamp.json.pre-stamp-write.20260929-122403.bak,stamp.json.pre-stamp-write.20260929-122405.bak,stamp.json.pre-stamp-write.20260929-122406.bak
EXIT_BROKEN2=1
```

③原文（**这条是专门给"内容等于旧戳"那句断言做的**：备份个数与文件名都合规，只有内容不对，
说明那条断言不是被前一条短路的、自己会红）：

```
STAMP_SELFTEST 负例=3 队列口径=9 写戳保护=3 表内语料腿=8 表内非语料腿=4 结果=FAIL
  BAD 写戳保护：备份内容不等于旧戳 ⇒ 备的不是那一份：bak=e3b0c44298fc ≠ 旧戳=741e17ea5c6a
  BAD 写戳保护：第一份旧戳底在第三次盖章后已不在盘上（被后续备份顶掉）
  BAD 写戳保护：第二次覆写的旧戳底没留下（三次盖章后只剩别的）
EXIT_BROKEN3=1
```

改回后（无残留核对 + 读数）：

```
$ grep -n "MUTATION\|if (false)\|const bak = null" scripts/qa/verify-ops-corpus-stamp.mjs
grep exit=1 (1=无残留)
$ node22 scripts/qa/verify-ops-corpus-stamp.mjs --selftest
STAMP_SELFTEST_DIR=C:\Users\dsghy\AppData\Local\Temp\qoder-ops-stamp-selftest（仓外临时目录，rmSync 收尾）
STAMP_SELFTEST 负例=3 队列口径=9 写戳保护=3 表内语料腿=8 表内非语料腿=4 结果=PASS
EXIT_SELFTEST=0
```

**`--check` 复跑**（本车道没有跑 `--write`）：

```
$ node22 scripts/qa/verify-ops-corpus-stamp.mjs --check
STAMP_OPS=reports/audit/round-6/ops files=24 cases=1107 canon=46812907c1b8 戳记=46812907c1b8 记于=2026-09-29T03:57:20.015Z gitSha=0294395d 当前gitSha=9bab27c2
STAMP_RESULT=PASS 语料与戳一致（cases=1107 与记录相同，判据内容零漂移）
EXIT_CHECK=0
```

旁证本车道确实没重打戳：`git status --porcelain -- reports/audit/round-7/ops-corpus-stamp.json` 为空（与 HEAD 逐字节相同），
`ls --time-style=full-iso` 仍是 `2026-09-29 11:57:20.044`（用户那一次 `--write` 的时间），
`ls reports/audit/round-7/ | grep -c "pre-stamp-write"` = 0（新逻辑一个 `.bak` 都没在仓里生成）。

### 7.1 一处诚实的自测副作用记录

`--selftest` 现在会 spawn 三个子进程跑 `--write`，但 `--ops/--out` 都指向 `os.tmpdir()/qoder-ops-stamp-selftest/write/`，
收尾仍由原有 `rmSync(T)` 负责；仓内语料与仓内戳不参与。行尾口径未变：HEAD 版就是全 LF（449 个 LF、0 个 CRLF），
改动后 530 个 LF、0 个 CRLF（`git` 那句 "LF will be replaced by CRLF" 是本仓既有状态，不是本次引入）。

