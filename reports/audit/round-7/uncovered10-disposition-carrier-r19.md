# 10 条 real-coverage 欠账的「去向册」机器件 + 核对门（L19 车道，2026-09-30）

车道性质：新建具名载具 + 新建核对门 + 新建双向负例 + 本报告。**不接线**（`run-final-verify-v33.sh` 与
`miniprogram-qa-finish-v33.dwf.ts` 归 L18，本车道一个字没碰，只交接线三件套见 §7）。
**不改判据**：`scripts/qa/verify-real-coverage.mjs` 零改动（`git diff --numstat` 对它返回空、`git status --porcelain` 无行）。
HEAD 起点与取数时刻：`da996f3a9a2732f019210856f86f907536ba1f83`（短式 `da996f3a`，实测 `git rev-parse HEAD`）。
全程 Node22：`D:/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH 上的 node 是 v16.13.1，本车道一次都没用它跑 `scripts/**`）。
命令一律重定向到文件后读，**没有把门输出接 `| tail` / `| grep` 再读退出码**（管道偷退出码，本仓踩过）。

## 0. 复跑那条门：读数逐字节未变（先复核再写，不复核就是抄）

跑法：`node scripts/qa/verify-real-coverage.mjs > tmp/l19_realcov_gate.txt 2> tmp/l19_realcov_gate.err`（默认参数）

- `EXITCODE=1`（未接管道，直接取 `$?`）；stderr 0 字节。
- 连跑两次做确定性对照：`diff -q` → `STDOUT_IDENTICAL=yes`；墙钟 `WALL_MS=492`。
- 逐字机器行（本轮实测，共 92 行，这里印判据与欠账那几行；行号 = 该文件在 stdout 里的行位）：

```
 1  REALCOV_CASES=236 EXEC_ROWS=15363 结果目录=D:\6\恋爱小程序\reports\audit\round-7
 2  REALCOV_NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=10 JUDGED_MISSING_A=10 JUDGED_MISSING_GUEST=2
 4  REALCOV_AUTOMATABLE_EXEMPT=28（其中 real 档有行但全被 SKIPPED=13）来源=ops 用例声明字段 c.automatable===false…
76  REALCOV_COVERED=198
77  REALCOV_UNCOVERED=10／236（阈值同旧：非免检欠账 =0 才绿）
78  REALCOV_UNCOVERED_LIST=10（逐条点名，排序=suite→id；轴词表 never-on-real|login|guest，两轴同缺写 login+guest；本数必须等于 REALCOV_UNCOVERED）
80    UNCOVERED PAGES-PROFILE-INDEX|PFI25 缺=login
81    UNCOVERED SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25 缺=login
82    UNCOVERED SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI34 缺=login
83    UNCOVERED 次要18|TD03 缺=login
84    UNCOVERED 次要20|OT05 缺=login
85    UNCOVERED 次要20|OT06 缺=login+guest
86    UNCOVERED 次要20|OT09 缺=login
87    UNCOVERED 次要20|VRN07 缺=login
88    UNCOVERED 次要21|OC09 缺=login+guest
89    UNCOVERED 次要22|VB03 缺=login
90  REALCOV_CONSERVATION=OK 免检=28 + 覆盖=198 + 欠账=10 = 236／236
91  REALCOV_UNCOVERED_LEDGER=OK 点名=10 欠账=10 判据外=0（台账守恒断言：点名逐行摊开后必须等于 REALCOV_UNCOVERED，且每条都在判据集里）
92  REALCOV_RESULT=FAIL（真实模式覆盖守恒：跳过不算量到，单身份不算双身份；免检只免"本门不追"，不降阈值）
```

与 `decisions-v33.md` §33 编排方亲跑那一发的对照：编排印的是简写形态
`CASES=236 UNCOVERED=10 COVERED=198 EXEMPT=28 NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=10`，
本车道实测的六个数**逐项相同**（236/10/198/28/0/10），且守恒 `28+198+10=236 OK`、台账 `LEDGER=OK 点名=10`、
`REALCOV_RESULT=FAIL` 未变 ⇒ **L14 的分流没有关掉任何红**这条性质在当前盘上仍然成立，本轮也不因我的件而变。

**10 条 id 的取数字段（这是本车道唯一的取数面）**：头行 `REALCOV_UNCOVERED_LIST=n`（门 :609）
+ 逐条 `  UNCOVERED <suite>|<id> 缺=<轴>`（门 :612）。该门对这一类点名**没有条数上限**
（对比 `EXEMPT` 有 `EXEMPT_PRINT=40` 的上限），所以欠账能整本摊开；键形如 `次要18|TD03`，**逐字保留、不拆**。

## 1. 缺口实测证据（先证明「真的没有机器件」，再决定建什么）

| 实测项 | 命令/口径 | 结果 |
|---|---|---|
| 去向四个词有没有消费者 | Grep `NEEDS_CAPABILITY\|NEEDS_BAND_CHANGE\|NEEDS_IDENTITY_IMPOSSIBLE\|DISPATCHABLE_NOW` 于 `scripts/` | **0 个文件** |
| 同一组词写在哪儿 | 同口径 Grep 于 `reports/audit` | 仅 2 份散文：`uncovered10-disposition-r14.md`、`decisions-v33.md` |
| `NOT_SHOOTABLE` 是不是同一件事 | Grep 于 `scripts/` | 24 个文件命中（含 `r-exec-cli.mjs`、`r-exec-ws.mjs`、`verdict-from-frames.mjs`、`reconcile-frameplan.mjs`、`emit-frameplan-additions.mjs`）——那是**取景/执行侧**的词，不是可采性分流那一层 |
| 这条门读不读去向 | `grep -o` 五个词于 `verify-real-coverage.mjs` | **0 次命中**（五个词一个都不出现） |
| 有没有门在核「10 条欠账条条有去向」 | 上述三条合起来 + 全 `scripts/` 里无按 case id 键去的去向件 | **没有**（⇒ 后果就是任务书写的那句：丢一条去向不会有任何东西变红） |
| 该门有没有现成机器输出面 | `grep -n "writeFileSync\|--json\|JSON.stringify" scripts/qa/verify-real-coverage.mjs` | **0 命中**；它的 fs 只有 `readFileSync, readdirSync, existsSync`（:69），参数只有 `--round/--ops/--dir/--selftest`（:76-78）⇒ **没有 `--json`，也没有任何写盘路径** |
| 盘上按 case id 键的去向 JSON | `ls reports/audit/round-7` 里 `*disposition*`/`*real-cov*` | 收口前只有 `open-row-dispositions.json`（键是 `MP-*`），**没有**按这批 case id 键的件 |

⇒ 任务书那句「只有散文、没有机器件」在当前盘上成立。我据此刻下的事实比任务书更窄也更硬：
**四个 `NEEDS_*`/`DISPATCHABLE_NOW` 词在整个 `scripts/` 里零命中**（任务书说它们命中执行侧脚本，那是
`NOT_SHOOTABLE` 那一层词的命中，两者不同层）；而这条门对五个词全零命中。

## 2. 两条路我为什么选「新建具名载具」

编排方给的二选一：① 扩 `emit-openrow-register.mjs` 那张 register 的键并给这条门加读者；② 新建具名载具。我走 ②。

1. **键域交集实测为 0**。`open-row-dispositions.json` 的 `id` 全是 `MP-R2-*` / `MP-R2VIS-*`（台账行），
   而这 10 个键是判据台的 `<suite>|<caseId>`（`PAGES-PROFILE-INDEX|PFI25`、`次要20|OT06`…）。
   实测：把 10 个 case id 逐个 `grep -c` 进那张表，**十个全 = 0**。扩键不是"多塞几条"，是给一张表引入第二种键法。
2. **读者不同、词表也不同**。那张表的读者是 `verify-frame-debt-coverage`，认的 `kind` 词是
   `carrier_missing` / `not_frame_observable_declared` / `judged_elsewhere` / `becomes_deferred` 那一套；
   这条门的分流词是**可采性五桶**。两套词混进一张册，任何一边改口径都可能把另一边的红读小——
   而"分流不许关掉红"正是这条账唯一要紧的性质（`decisions-v33.md` §33 把它列为本节最要紧的一句）。
3. **路 ① 的另一半是禁区**。"给这条门加读者"必须改 `verify-real-coverage.mjs`，而它今天的读数
   （`UNCOVERED=10`、`RESULT=FAIL`）是本轮被逐字节钉过、要如实保留的账；任务书也把它列在禁改项里。
   我若为了让去向有读者而去动它，就是"改了一个已被钉过的读数"——本车道宁可新增两个脚本也不碰它一个字节。
4. **成本对照**：路 ② = 2 个新脚本 + 1 个具名 JSON，既有门与既有表**零改动**；
   路 ① = 改一张权威表的键法 + 改它的读者的判据 + 再给这条门加一条判点（三处都是别人的判域）。

## 3. 载具 `scripts/qa/emit-real-coverage-disposition.mjs`

- **取数**：欠账一侧只 spawn `verify-real-coverage.mjs`（默认参数）并解析它自己的 stdout 机器行（§0 那两组）；
  去向一侧只解析 `reports/audit/round-7/uncovered10-disposition-r14.md` §3 汇总表的**那一行自己写下的话**
  （去向词、条件限定语、门的轴、挡路物、闭合成本），逐字带出，不写第二份名单。
  这与 `emit-dispo-open-cellplan.mjs`（从门的现场输出派生、"不手抄 id"）同源。
- **落盘位置**：`reports/audit/round-7/real-coverage-disposition.json`，键 = 门印的复合 case id 逐字保留。
- **默认干跑**：不带 `--apply` 只印 `RCDEMIT_RESULT=DRY 拟写 N 条` + 逐条 `RCDEMIT_DRY <键> 去向=… 轴=…`，一个字节都不写
  （实测：`文件存在=false`，见 §5 负例）。写权威件必须显式 `--apply`；同内容复跑只印 `RCDEMIT_NOCHANGE`、不覆写、不留备份
  （不刷时间戳假装有新账）。
- **备份纪律**：照 `verify-ops-corpus-stamp.mjs:427-435`——备份**先于**覆写、`RCDEMIT_BACKUP=<路径>` 先于覆写打印、
  同秒撞名顺延 `.2/.3`；首次落盘如实报 `RCDEMIT_BACKUP=none（首次落盘）`。
- **不合规则一条不改**：照 `emit-openrow-register.mjs:96`（`有不合登记的行 ⇒ 表一条都不改`）：去向词不在册内、
  没有挡路物/成本列、键重复、去向格是散文 ⇒ `REFUSE …` + `RCDEMIT_RESULT=FAIL` + exit 1，且盘上件字节不变。
- **守恒**：`门 UNCOVERED = 在册欠账 + 无去向欠账`，不成立 ⇒ exit 2 且不写（写出去就对不上账）。
- **provenance 字段口径出处**（不自创语义）：
  `gitSha` = `git rev-parse --short HEAD` 运行时派生，与 `verify-ops-corpus-stamp.mjs:99-102 / :443` 同一个字段同一个算法；
  顶层 `gitSha` + `generatedAt` 是 `verify-provenance-all.mjs:162-176` 读取的那两个名字（生产者必须运行时派生，不许字面量）；
  来源门命令行 = `provenance.gateCmd`（本件是"哪一次门的哪一条命令"），另有 `gateExit` / `gateStdoutSha256`
  （把取数那发 stdout 的字节指纹钉住，呼应本仓"读数被逐字节钉过"的口径）、`rulingsFile` / `rulingsSha256`
  （把散文判决表那份原件钉住）、`emittedBy`。实测首次落盘：
  `gitSha=da996f3a generatedAt=2026-09-30T04:40:46.627Z gate=scripts/qa/verify-real-coverage.mjs --round round-7 gateStdout=52b46fe54f8d rulings=…@ef06a5723cf8`。
  一处自纠（写完后复查发现的，已改并复跑）：`--ops/--dir` 若给了必须**转给被 spawn 的那条门**，
  否则 `provenance.opsDir/execDir` 记的是我给的目录、门实际读的是它的默认值，那份戳就成了一句假话。
  复跑口径（实测）：不带这两个旗标 ⇒ `gateCmd="scripts/qa/verify-real-coverage.mjs --round round-7"` 与 `RCDEMIT_NOCHANGE`（
  核心内容未变，不覆写、不造备份）；带上 ⇒ 同一发干跑仍 `RCDEMIT_RESULT=DRY 拟写 10 条去向`、exit 0。

首次真跑（显式 `--apply`，exit=0）：

```
RCDEMIT_GATE CASES=236 UNCOVERED=10 COVERED=198 EXEMPT=28 NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=10 RESULT=FAIL exit=1
RCDEMIT_RULINGS reports/audit/round-7/uncovered10-disposition-r14.md 解析=10 行（跳过非数据行=0）sha256=ef06a5723cf8
RCDEMIT_TALLY NEEDS_CAPABILITY=7 NEEDS_BAND_CHANGE=1 NEEDS_IDENTITY_IMPOSSIBLE=1 DISPATCHABLE_NOW=1 NOT_SHOOTABLE=0｜去向合计=10
RCDEMIT_BACKUP=none（首次落盘）
RCDEMIT_WRITTEN=reports/audit/round-7/real-coverage-disposition.json 条目=10 无去向欠账=0 陈旧去向=0 轴漂移=0 守恒=OK
RCDEMIT_RESULT=OK 登记 10 条去向（含陈旧 0）｜REALCOV_UNCOVERED 仍=10（本载具一条都不减；无去向=0）
```

`RCDEMIT_TALLY` 与 `decisions-v33.md` §33 的逐桶计数**五桶全等**（7/1/1/1/0）⇒ 机器件与裁定册没跑偏。

**落盘之后复跑上游门（这条是本车道自己的件不许动那本账的直接自证）**：
`node scripts/qa/verify-real-coverage.mjs` 在 `real-coverage-disposition.json` 写完之后重跑 →
`EXIT=1`、`diff -q` 与落盘前那份 stdout → `IDENTICAL_AFTER_WRITE=yes`（逐字节相同）。
机理：那条门只扫 `reports/audit/round-7/exec-*/exec-results.json`（:114-116 `d.startsWith("exec-")`），
我新增的是一个**文件**、不在 `exec-*` 目录里 ⇒ 门的扫描集没变，落盘没有把任何红搬走。

## 4. 核对门 `scripts/qa/verify-real-coverage-disposition.mjs`：极性与词表决定

三条 blocking + 一条显式非 blocking，全部印进机器行：

| 不一致 | 极性 | 理由 |
|---|---|---|
| 欠账**无去向**（`UNDISPOSED`） | **blocking** | 主案。这本门存在的唯一理由就是"账丢了必须响"。 |
| 去向词**不在册内词表**（`BAD_WORD`） | **blocking** | 词表权威**在本门里，不取自册子**——否则册子自己声明一套词就能把自己判绿（那是把红改名）。实测连"册子自带 vocab 覆盖"这条路也被钉住（§5 阳性 B′）。 |
| 条目**空心**（缺 `disposition` / 缺 `basis` / 重复键 / `provenance` 缺项 / 对账不守恒） | **blocking** | 只有键没有内容的条目不叫有账；不知道哪来的册子不能当账。堵住"写个空条目冒充有账"和"手抄一份没出处的名单"两条后门。 |
| 册里有去向但该 case **已不在 UNCOVERED 集**（陈旧） | **advisory**（显式二选一，印成 `RCD_STALE_POLICY=advisory`） | 见下。 |

**陈旧轴为什么是 advisory（论证，不是态度）**：一条 case 离开 `UNCOVERED` 只有一条合法路径——那条腿真的判过了
（`REALCOV_COVERED` 变大），那是**收账**，不是出事。把"账收完了却忘了划掉旧去向"做成常红判点，
最快变绿的办法就是**删册子**，而删册子恰好销毁这本门要守的那份账。本仓对同族形状早有既定口径：
`verify-real-coverage.mjs` 自己的 `BANDLESS` / `IDENTITYLESS` / `SESSION_UNPROVEN` 三格都是
"数出来 + 逐条点名 + **不进 ok 的判据**"，注释里写得明明白白（:31-32「今天已有 4586 条合法 mock 行……
把它做成新的常红判点，正撞上面那句永久红的门最后会被绕过去」）。我照同一口径做，且**不两可**：
`RCD_STALE=n` 与逐条 `STALE` 行就是它的可见性来源；测试里还钉了"册子把 stale 自己写成 blocking 也改不动本门极性"。

**为什么这道门永远不能替 `verify-real-coverage` 减红（任务书要求明写）**：
本轮最要紧的一句落账是「分流没有关掉任何红——免检 0 条、identities 与 ops 字节 0 改动」（§33 原话"本节最要紧的一句"）。
如果"给欠账配去向"这件事本身能让任何一格变绿，那么写散文的人只需多写几行字就买到了绿，
这正是 `decisions #13` 立这条裁定要防的事，也是本仓记录过的"覆盖率纸面变好"事故。所以本车道把它做成**结构约束**而不是承诺：

1. 词表里**没有** `DONE` / `CLOSED` / `RESOLVED` / `EXEMPT` / `COVERED` 任何一个 ⇒ 没有任何一条去向能把红关掉
   （测试 §13 逐个试这五个词，全部判红）。
2. 载具与核对门都**不写**、不改那条门的任何输入：`verify-real-coverage.mjs` 今天连 `writeFileSync` 都没有，
   我没有给它加任何写盘路径；两件的 `git status` 都是空。
3. 本门判绿时机器行明印 `RCD_NO_REDUCTION … REALCOV_UNCOVERED 仍=10`，并把上游的 `RESULT=FAIL exit=1` 原样带出 ⇒
   **两本账不合并不折抵**；本门只准**新增红**（账缺失），不准**转移红**。

首次真跑（现跑上游门，未接管道；`GATE_EXIT=0`、stderr 0 字节）：

```
RCD_GATE SOURCE=live CMD="scripts/qa/verify-real-coverage.mjs --round round-7" CASES=236 UNCOVERED=10 COVERED=198 EXEMPT=28 NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=10 RESULT=FAIL exit=1
RCD_REGISTER=reports/audit/round-7/real-coverage-disposition.json 条目=10 kind=real-coverage-disposition gitSha=da996f3a generatedAt=2026-09-30T04:40:46.627Z 册记时门 UNCOVERED=10 现量=10 门stdout指纹=52b46fe54f8d
RCD_VOCAB NEEDS_CAPABILITY|NEEDS_BAND_CHANGE|NEEDS_IDENTITY_IMPOSSIBLE|DISPATCHABLE_NOW|NOT_SHOOTABLE（词表权威在本门，不取自册子；五个词里没有任何 DONE/CLOSED/EXEMPT ⇒ 这本册结构上销不掉红）
RCD_CHECK 门欠账=10 有去向=10 无去向=0 册外词=0 空条目=0 重复键=0 陈旧=0 轴漂移=0 守恒=OK
RCD_STALE_POLICY=advisory（陈旧去向点名+计数、不判红；理由：一条 case 离开 UNCOVERED 只可能是收账，把"忘划旧去向"做成常红的唯一绿路就是删册子，而删册子正好销毁本门要守的账。同族口径见 verify-real-coverage.mjs 的 BANDLESS/IDENTITYLESS/SESSION_UNPROVEN：只数只点名、不进 ok）
RCD_NO_REDUCTION 本门不替 verify-real-coverage 减红：REALCOV_UNCOVERED 仍=10（那 10 条的红归那条门自己判，本门只审"条条有没有去向"，一条都不许在这里被读成已解决）
RCD_RESULT=PASS（10 条欠账条条有在册去向；陈旧 0 条按 advisory 点名不判红；上游门照旧 RESULT=FAIL UNCOVERED=10）
```

退出码口径：0=账完整；1=判红（无去向/册外词/空心/无 provenance/不守恒）；2=前置件缺失
（册子不存在或读不出、上游门跑不出来、门的机器行少字段）——`2` 一律**不算绿**，
"册子还没落盘"不许被读成"没有欠账"（照 `verify-ops-corpus-stamp.mjs --check` 那句"别把没记过读成没改过"）。
取数旋钮 `--gate-out <file>` 只供离线自测/复现，用了就在 `RCD_GATE SOURCE=captured-file` 里说出来；终验不得带。

实测墙钟（同机三连跑，含它 spawn 的那条上游门）：`3891ms / 3329ms / 4662ms`；上游门单独实测 `492ms`。

## 5. 双向负例 `scripts/qa/test-real-coverage-disposition.cjs`（61 条断言）

文件名匹配离线聚合器 `run-qa-selftests.mjs:25` 的 `^test-.+\.(cjs|mjs)$` ⇒ 自动收件（见 §6 的 `发现=` 差值）。
全程离线：门的读数用一份固定 stdout 样本经 `--gate-out` 喂（不读盘上 `exec-*` 目录，避开并发车道的 torn read）；
夹具写在 `os.tmpdir()`，变异体写在仓内 `tmp/` 且跑完即删并复核不存在。

- 阴性对照（补齐去向）⇒ **绿**，且绿里仍带上游 `RESULT=FAIL`/`UNCOVERED=2` 与 `RCD_NO_REDUCTION`。
- 阳性对照（四类破损各一条以上）⇒ **红**：少一条去向 / 册外词（含"册子自带词表覆盖"那条）/ 空 `disposition` /
  缺 `basis` / 缺 provenance（缺几项点几条，实测恰 3 条）/ 五个销账词逐个试。
- 前置件失败 ⇒ **exit 2**（册子不存在 / 读不出 JSON / 上游少字段 / `--gate-out` 指空 / 旗标拼错）。
- 载具侧同文件内一并钉住：默认干跑不写盘、`--apply` 才写、幂等复跑不覆写不造备份、
  内容变更时**恰好 1 个备份且逐字节等于旧件**、打印路径与盘上一致、册外词 ⇒ exit 1 且旧件不变、
  解析 0 行 ⇒ exit 2 且不写任何件、复合 id 逐字保留、provenance 三件套与门 stdout 指纹在件里。
- 端到端：载具产的册子喂核对门 ⇒ 判绿；被载具拒绝写的件不会被凭空补上。

本文件自报（实测，未接管道）：

```
RCDTEST_NEGATIVE_PROOF live_bad=0 mutant_bad=1（放宽「无去向判红」那一项后，变异体必须至少放走一条）
RCDTEST_COVERAGE 断言=61 失败=0 被测体=仓里那份核对门（默认） 夹具=C:\Users\dsghy\AppData\Local\Temp\qoder-l19-real-cov-disposition
assertion failures = 0
RCDTEST_TEST=PASS
```

**变异证明（两轨都做了）**

轨道 A（文件内自动轨，每次聚合器跑都会重做）：把核对门的 `const blocking = undisposed.length ||` 拆成
`0 && undisposed.length ||` 写到 `tmp/l19-rcd-mutant/` 的副本，同一套 battery 跑两遍：
活体四类破损全判红（`live_bad=0`），变异体放走了"少一条去向"那一条（`mutant_bad=1`）⇒ 断言真在受力。
收尾 `rmSync` + 复核：`t("收尾：变异体不留盘")`、`t("收尾：仓里那份核对门字节未变")` 均通过。

轨道 B（人工轨：临时放宽判定 ⇒ **测试本体**红，改回 ⇒ PASS）——探针 `tmp/l19-mutate-proof.mjs`，逐字输出：

```
MUTATED_APPLIED needle=const blocking = undisposed.length || -> 0 && ... (undisposed debt no longer blocks)
MUTATE_RED rc=1 RCDTEST_TEST=FAIL RCDTEST_COVERAGE 断言=61 失败=5 被测体=仓里那份核对门（默认）
MUTATE_FIRST_FAIL   FAIL 阳性A 少一条去向 ⇒ exit 1  <<rc=0>>
RESTORED_BYTES_IDENTICAL=yes sha=811e0950a5f913a4
MUTATE_RESTORED rc=0 RCDTEST_TEST=PASS RCDTEST_COVERAGE 断言=61 失败=0
LS_TMP_L19 l19-mutate-proof.mjs,l19-verifier.orig.txt,l19_check.txt,l19_emit_apply.txt,l19_emit_dry.txt,l19_gate_run1.err,
           l19_gate_run1.txt,l19_mutate_proof.txt,l19_realcov_gate.err,l19_realcov_gate.txt,l19_realcov_gate2.txt,
           l19_selftest_before.txt,l19_selftest_after.txt,l19_selftest_check…,l19_test_check.txt,l19_test_run1.txt,
           l19_test_run2.txt,l19_verify_noregister.txt
MUTATE_DIR_EXISTS=false
MUTATE_PROOF=OK
```

`ls` 复核口径（那一发探针打印的 `LS_TMP_L19` 原文，见上面代码块）：`tmp/` 里只剩 `.txt`/`.mjs` 探针，
变异目录 `tmp/l19-rcd-mutant` **不存在**（`MUTATE_DIR_EXISTS=false`），核对门字节还原逐字节相同
（`RESTORED_BYTES_IDENTICAL=yes sha=811e0950a5f913a4`）。
**本车道收工后这些 `tmp/l19-*` 探针已全部删除**（`tmp/` 归 `.gitignore`，但留着会让下一轮把
`tmp/l19-verifier.orig.txt` 那份核对门副本读成活件）；复现只要三条命令，不需要那份探针：

```sh
# 1) 放宽判定（needle 是核对门里那一行 blocking）
node -e '…readFileSync→replace("const blocking = undisposed.length ||","const blocking = 0 && undisposed.length ||")→writeFileSync…'
# 2) 跑负例：必须红（实测 断言=61 失败=5，第一条红是「阳性A 少一条去向 ⇒ exit 1 <<rc=0>>」）
"D:/codex-tools/node-v22.17.0-win-x64/node.exe" scripts/qa/test-real-coverage-disposition.cjs
# 3) 按原字节还原后再跑：必须 PASS（实测 断言=61 失败=0）；还原前后各取一次 sha256 对比
```
注意"红那一发失败=5 而不是 1"：放宽一项同时让 §2、§12、§13 三处依赖该项的断言一起塌，这正是"这一项在受力"的另一面。

## 6. 聚合器 `发现=` before/after（含取数时刻与外来件排除）

两次都是 `node scripts/qa/run-qa-selftests.mjs` 真跑，输出重定向到文件后再读（没有接管道）。

| | 取数时刻（本地 +0800） | 首行 | 汇总行 |
|---|---|---|---|
| before（我的测试件还没落盘） | **12:24** 启动、12:39 收 | `SELFTEST_DIR=qa/test-*  发现=37  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe` | `SELFTEST_RAN=36 SKIPPED=1 FAILED=3 NO_SUMMARY_LINE=1 覆盖文件=37/37` → `SELFTEST_RESULT=FAIL（3/38 …）` |
| after（我的测试件已落盘） | **12:49** 启动、13:11 收 | `SELFTEST_DIR=qa/test-*  发现=42  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe` | `SELFTEST_RAN=41 SKIPPED=1 FAILED=4 NO_SUMMARY_LINE=1 覆盖文件=42/42` → `SELFTEST_RESULT=FAIL（4/43 …）` |

- **原始差值 `发现=` = 42 − 37 = +5，不是 +1。** 这正是任务书预告的污染：并发车道在途时聚合器会把别人的临时件一起收进去。
- **本车道贡献恰好 +1**，按"件名集合做差"核，不按计数推：
  `comm -13 <before 跑到的 37 个件名> <当前盘上匹配件名>` 得 6 个新增名，其中**只有 1 个是我的**：

  ```
  test-carrier-wiring.cjs              ← L18 在途（after 里 FAILED 那 +1 就是它：断言失败数=3）
  test-corpus-denominator.cjs          ← L16 在途（断言失败数=2）
  test-guest-landing-writeguard.mjs    ← L17 在途
  test-lane-report-complete.cjs        ← 非本车道（归属我没有证据，只点名不定论）
  test-real-coverage-disposition.cjs   ← 本车道 L19（**+1**）
  test-report-decision-buckets.cjs     ← 非本车道，且它在 12:49 扫描之后才出现 ⇒ 没进 after 那发的 42
  ```
- 我的那一件被收进自动收件并被跑到、判绿，逐字行：

  ```
  PASS  test-real-coverage-disposition.cjs  exit=0  断言失败数=0  RCDTEST_TEST=PASS  15s
  ```
- 两条必须一起读的外来漂移（免得有人拿 FAILED 差值当我的账）：
  after 的 `FAILED=4` 比 before 的 3 多 1，**多的那条是 `test-carrier-wiring.cjs`（L18）**；
  而 before 红的 `test-panel-sha-class-axis.cjs`（`PNSHA_TEST=FAIL 断言失败数=2`）在 after 那发**变绿了**——
  同一台机器上并发车道在改被测物，这两格漂移都与本车道无关，本车道的件两次都是绿。
- 结论口径：**接线后编排方在全部车道收工时复取一发 `发现=`，那时 +1 才是干净可归因的**。
  我这发的数字是"我的件被收进去了"的证据（`PASS … RCDTEST_TEST=PASS`），不是"仓里测试总数"的证据。

## 7. 给编排方的接线三件套（本车道**没有**接线，按纪律留给 L18 收工后追加）

我不改 `scripts/qa/run-final-verify-v33.sh`，也不改 `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`（L18 在途）。
以下是逐字参数：

**bash（`run-final-verify-v33.sh`，建议紧跟第 4 步 `verify-real-coverage` 之后——它 spawn 的就是那条门）**

```
g verify-real-coverage-disposition 180 scripts/qa/verify-real-coverage-disposition.mjs
```

- 门名：`verify-real-coverage-disposition`
- 实参：无（默认已是 `--round round-7` + 读 `reports/audit/round-7/real-coverage-disposition.json` + 现跑上游门）
- 秒数：**180**（实测墙钟 3.3–4.7 s；给 180 s 与它包裹的上游门 #4 同一预算，约 38 倍余量，并发负载下不吃 timeout 假红）
- 终验**不得**带 `--gate-out`（那是自测/复现旋钮，带上就在 `RCD_GATE SOURCE=` 里显形）。

**DSL（`.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts` 的 `GATE_SUITE`）**

```ts
{ name: "真实档覆盖去向册 verify-real-coverage-disposition", args: [], timeoutMs: 180000 },
```

dsl-gate-sync 三条自查：① name 以 bash 门名结尾（`…去向册 verify-real-coverage-disposition`）✅；
② 实参逐字一致（两侧都是空）✅；③ `timeoutMs 180000 ≥ 180×1000`（等值，方向安全，未往小调）✅。

**接线时必须点明的三件事（本车道实测/记载，逐条给出处）**

1. ⚠ **门名含 `real-coverage`，可能被"提交后 sha 敏感复量子集"自动捞进去。** 依据是**记载而非我实测**：
   `decisions-v33.md` §33「已验收」里 `verify-ops-corpus-stamp --check` 那一段写着"标签因此刻意不含 corpus，
   避开 :561 那条复量子集"（我给的是**文本锚**不是行号——一程之内行号会漂），项目记忆把该子集口径记为
   按**门名正则** `corpus|provenance|band-freshness|real-coverage` 挑选。**我没有读 `run-final-verify-v33.sh` 的当前内容**
   （L18 在途件，任务书禁止我把它的半截内容当依据），所以：① 这里不引用它的行号；
   ② 请 L18/编排按现在盘上那份**自己确认这条门会不会被多捞一遍**——真被捞进去也不算错
   （它语义上就是跟着那条门的读数走），代价只是每发多 ~4 s；若要避开就得改门名，
   **改名要走编排方裁定，不由我顺手定**。
2. 这条门默认 **blocking**（我刻意没做 `--advisory` 旋钮）：它不会替上游减红，所以它红了就是"账缺失"，该拦。
   但它有一个 `exit 2` 分支 = **去向册不存在** ⇒ 接线顺序上必须保证 `reports/audit/round-7/real-coverage-disposition.json`
   在盘上（本轮已由载具 `--apply` 落盘，实测 7970 字节 / 条目=10）。若下一轮换了 round，重跑载具
   `emit-real-coverage-disposition.mjs --apply` 即可，不要手抄。
3. **它现在的消费者只有它自己**：实测 Grep `real-coverage-disposition` 在 `scripts/` 只命中我这三个新文件
   （载具产它、门读它、测试钉它），**没有任何终验入口在跑这条门** ⇒ 在 L18/编排接线之前，这条门就是本仓反复批评过
   的"建了没人跑"那一格。请按 §6 的方式在 bash 与 DSL 两处都接上，只接一处等于没接。

## 8. 我没有改什么 / 没做成的

**没改**：`scripts/qa/verify-real-coverage.mjs`（判据、阈值、退出码语义、输出面、写盘路径全零改动；
`git diff --numstat` 与 `git status --porcelain` 对它均空）、`run-final-verify-v33.sh`、`miniprogram-qa-finish-v33.dwf.ts`、
`reports/audit/round-7/decisions-v33.md`、`reports/screenshots/**`、`scripts/qa/ops/**`、canon、
`open-row-dispositions.json`（那张 `MP-*` 表一字节未动）、判据台 ops 语料、任何 `identities`/`automatable` 字段
（⇒ 免检仍 28 条、`REALCOV_RESULT` 仍 FAIL、`UNCOVERED` 仍 10，见 §0）。
L16/L17/L18 在途的五处我没有读、没有改、没有当依据。没有 `git add`/`commit`/`checkout -- .`/`restore`/`stash`。

**盘上时间戳旁证（收工时取，免得 `M` 被误记到我头上）**：`stat -c "%y %n"` 实测
`scripts/qa/verify-real-coverage.mjs` = **2026-09-29 14:46**（本程开始前，未动）、
而两个接线件 `scripts/qa/run-final-verify-v33.sh` 与 `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`
= **2026-09-30 12:58**（L18 在本车道在途期间写的；`git status` 给它们 `M`，与本车道无关——
我对这两个文件没有过一次 Edit/Write，也按纪律没有读它们的内容，所以**我不能断言 §7 那三件套已被接上还是没被接上**，
这一格需要编排方/L18 自己回报）。

**没做成 / 留给别人**：
- 没有接线（按任务书归编排方在 L18 之后追加，§7 已给逐字三件套）。
- 没有重跑任何设备腿、没有收任何一条欠账（本车道只把去向落成机器件并让"丢账"能红）。
- §7-① 那条 sha 敏感子集的告警**不是我实测的**，是按记载转述，需要 L18/编排按现在盘上那份确认。
- 去向册的**内容**仍只是 L14 那份裁定的搬运：我没有重新判定任何一条的可采性，
  也没有为 `NOT_SHOOTABLE` 提供任何用例（今天 0 条）；若下一轮要新增去向词，必须先经编排方裁定再改本门的 `VOCAB` 常量。

**本车道产出（4 件 + 1 份由载具写的权威件）**
- `scripts/qa/emit-real-coverage-disposition.mjs`（载具，默认干跑）
- `scripts/qa/verify-real-coverage-disposition.mjs`（核对门，三条 blocking + 陈旧 advisory）
- `scripts/qa/test-real-coverage-disposition.cjs`（双向负例，61 断言）
- `reports/audit/round-7/uncovered10-disposition-carrier-r19.md`（本报告）
- `reports/audit/round-7/real-coverage-disposition.json`（只经我的载具写过；首次落盘无前件 ⇒ `RCDEMIT_BACKUP=none（首次落盘）`）

**收工态实测（最后一次连贯复跑，全部未接管道、退出码直接取；Node22）**

```
UPSTREAM_EXIT=1        REALCOV_UNCOVERED=10／236 … REALCOV_UNCOVERED_LIST=10 … REALCOV_RESULT=FAIL（stdout 92 行，与 §0 同）
NEWGATE_EXIT=0         RCD_CHECK 门欠账=10 有去向=10 无去向=0 册外词=0 空条目=0 重复键=0 陈旧=0 轴漂移=0 守恒=OK
                       RCD_RESULT=PASS（…上游门照旧 RESULT=FAIL UNCOVERED=10）
TEST_EXIT=0            RCDTEST_COVERAGE 断言=61 失败=0 … assertion failures = 0 … RCDTEST_TEST=PASS
DRY_EXIT=0             RCDEMIT_RESULT=DRY 拟写 10 条去向 …（落盘之后不带 --apply 仍然只干跑）
APPLY_RERUN_EXIT=0     RCDEMIT_NOCHANGE=… 去向内容与盘上逐字节相同 ⇒ 不覆写（盘上没有 *.pre-real-cov-disposition.*.bak）
```

`git status --porcelain` 对我这五处全部是 `??`（新增、未跟踪、未提交）；仓根没有留任何新文件；
`tmp/l19-*` 探针与变异目录已清空（`ls tmp/ | grep -i l19` 无匹配）。
